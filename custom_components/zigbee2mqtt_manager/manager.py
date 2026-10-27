# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): a0e351056aac5e51affe4161e93dffe180066163bb9867e6a04fba9c1390f609
"""Hält den Zustand der Zigbee2MQTT-Bridge und sendet Befehle per MQTT."""

from __future__ import annotations

import asyncio
import json
import logging
import re
from collections import deque
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from homeassistant.components import mqtt, persistent_notification
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_call_later, async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    APP_UPDATE_CHECK_INTERVAL,
    CONF_BASE_TOPIC,
    CONF_CRITICAL_BATTERY,
    CONF_FIRE_EVENTS,
    CONF_LOW_BATTERY,
    CONF_NETWORK_URL,
    CONF_PROBLEM_STALE,
    CONF_PROBLEM_UPDATES,
    CONF_SIDEBAR_PANEL,
    CONF_SIDEBAR_TITLE,
    CONF_STALE_HOURS,
    DEFAULT_CRITICAL_BATTERY,
    DEFAULT_FIRE_EVENTS,
    DEFAULT_LOW_BATTERY,
    MAX_COMMENT_LENGTH,
    DEFAULT_PROBLEM_STALE,
    DEFAULT_PROBLEM_UPDATES,
    DEFAULT_STALE_HOURS,
    DOMAIN,
    EVENT_BATTERY_LOW,
    EVENT_DEVICE_JOINED,
    EVENT_DEVICE_LEFT,
    EVENT_DEVICE_MISSING,
    EVENT_DEVICE_OFFLINE,
    EVENT_DEVICE_ONLINE,
    EVENT_UPDATE_AVAILABLE,
    EXPECTED_GONE_SECONDS,
    FLUSH_DELAY,
    GITHUB_RELEASES_URL,
    Z2M_GITHUB_RELEASES_URL,
    MAX_EVENT_LOG,
    MIN_Z2M_MAJOR,
    NETWORK_REQUEST_TIMEOUT,
    OTA_CHECK_SPACING,
    PERMIT_JOIN_SECONDS,
    STORAGE_SAVE_DELAY,
    STALE_TICK,
    STORAGE_VERSION,
    VERSION,
    valid_link,
)
from .mqtt_transport import create_transport
from .nc_catalog import (
    NC_CATALOG,
    NC_SOURCE_ICON,
    NC_STATE_TYPES,
    NC_TYPE_IDS,
)
from .notification_bridge import (
    EVENT_REPORT as NC_EVENT_REPORT,
    OPT_ENABLED as NC_OPT_ENABLED,
    OPT_TYPES as NC_OPT_TYPES,
    NotificationBridge,
)
from .network_map import build_topology, parse_networkmap
from .update_check import async_fetch_latest, async_fetch_latest_z2m, is_newer

_LOGGER = logging.getLogger(__name__)

Listener = Callable[[str, Any], None]

# Antworten der Bridge, die an die Karte weitergereicht werden (Toasts)
_FORWARDED_RESPONSES = ("device/", "group/", "permit_join", "options", "restart", "networkmap")

# Nur diese Schlüssel eines Geräte-Payloads werden persistent zwischengespeichert
_CACHED_KEYS = (
    "battery",
    "voltage",
    "linkquality",
    "update",
    "update_available",
    "last_seen",
)

# Optionstypen, die die Karte als Formularfeld darstellen kann
_SIMPLE_OPTION_TYPES = ("numeric", "binary", "enum", "text")

# Bridge-Optionen, die die Karte ändern darf (Schlüssel -> Pfad in den Z2M-Optionen)
BRIDGE_OPTION_PATHS: dict[str, tuple[str, ...]] = {
    "log_level": ("advanced", "log_level"),
    "last_seen": ("advanced", "last_seen"),
}
_BRIDGE_OPTION_VALUES: dict[str, tuple[str, ...]] = {
    "log_level": ("error", "warning", "info", "debug"),
    "last_seen": ("disable", "ISO_8601", "ISO_8601_local", "epoch"),
}


def _parse(payload: Any) -> Any:
    """Payload als JSON parsen, sonst unverändert zurückgeben."""
    if isinstance(payload, (bytes, bytearray)):
        payload = payload.decode(errors="ignore")
    try:
        return json.loads(payload)
    except (ValueError, TypeError):
        return payload


def _num(value: Any) -> int | float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return value


def _normalize_ts(value: Any) -> str | None:
    """last_seen kann ISO-String oder Epoch (s/ms) sein -> ISO-String (UTC)."""
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        seconds = value / 1000 if value > 1e11 else value
        try:
            return datetime.fromtimestamp(seconds, tz=UTC).isoformat(
                timespec="seconds"
            )
        except (OverflowError, OSError, ValueError):
            return None
    if isinstance(value, str):
        return value
    return None


def _major(version: Any) -> int | None:
    """Hauptversion aus Strings wie "2.1.3" bestimmen."""
    if not isinstance(version, str):
        return None
    head = version.strip().lstrip("v").split(".", 1)[0]
    return int(head) if head.isdigit() else None


# Expose-Typen, die nur Gruppen von Funktionen bündeln (Eigenschaften liegen auf
# oberster Ebene des Gerätezustands, z. B. "state", "brightness")
_EXPOSE_GROUP_TYPES = ("light", "switch", "fan", "cover", "lock", "climate")
# Schutz vor unerwartet großen oder tief verschachtelten Expose-Bäumen
_EXPOSE_MAX_DEPTH = 4
_EXPOSE_MAX_ROWS = 200


def _state_value(state: dict[str, Any], path: tuple[str, ...]) -> tuple[bool, Any]:
    """Wert entlang eines Pfads aus dem Gerätezustand holen: (vorhanden, Wert)."""
    node: Any = state
    for part in path:
        if not isinstance(node, dict) or part not in node:
            return False, None
        node = node[part]
    return True, node


def _flatten_exposes(
    exposes: Any,
    state: dict[str, Any],
    path: tuple[str, ...] = (),
    group: str | None = None,
    endpoint: str | None = None,
    out: list[dict[str, Any]] | None = None,
    depth: int = 0,
) -> list[dict[str, Any]]:
    """Expose-Baum eines Geräts als flache Liste inkl. aktueller Werte."""
    rows: list[dict[str, Any]] = out if out is not None else []
    if not isinstance(exposes, list) or depth > _EXPOSE_MAX_DEPTH:
        return rows
    for expose in exposes:
        if len(rows) >= _EXPOSE_MAX_ROWS:
            break
        if not isinstance(expose, dict):
            continue
        kind = expose.get("type")
        features = expose.get("features")
        own_endpoint = expose.get("endpoint") or endpoint

        if kind in _EXPOSE_GROUP_TYPES and isinstance(features, list):
            _flatten_exposes(
                features, state, path, kind, own_endpoint, rows, depth + 1
            )
            continue
        if kind == "composite" and isinstance(features, list):
            prop = expose.get("property")
            sub_path = path + (prop,) if prop else path
            label = expose.get("label") or expose.get("name") or prop or group
            _flatten_exposes(
                features, state, sub_path, label, own_endpoint, rows, depth + 1
            )
            continue

        prop = expose.get("property") or expose.get("name")
        if not prop:
            continue
        access = expose.get("access")
        access = access if isinstance(access, int) and not isinstance(access, bool) else 1
        row: dict[str, Any] = {
            "property": prop,
            "label": expose.get("label") or expose.get("name") or prop,
            "type": kind,
            "group": group,
            "endpoint": own_endpoint,
            "access": access,
            # Schalter: Ja/Nein-Funktion mit Schreibzugriff auf oberster Ebene (nicht in einem
            # zusammengesetzten Objekt). Nur diese lassen sich in der Karte direkt umlegen.
            "switchable": kind == "binary" and bool(access & 2) and not path,
            "unit": expose.get("unit"),
            "description": expose.get("description"),
            "category": expose.get("category"),
            "min": expose.get("value_min"),
            "max": expose.get("value_max"),
            "step": expose.get("value_step"),
            "values": expose.get("values") if isinstance(expose.get("values"), list) else None,
            "value_on": expose.get("value_on"),
            "value_off": expose.get("value_off"),
        }
        found, value = _state_value(state, path + (prop,))
        if found:
            row["value"] = value
        rows.append(row)
    return rows


# Geräteklassen für die Gruppierung/Filterung in der Karte (Reihenfolge = Priorität)
_CLASS_BY_EXPOSE_TYPE = (
    ("light", "light"),
    ("switch", "switch"),
    ("climate", "climate"),
    ("cover", "cover"),
    ("lock", "lock"),
    ("fan", "fan"),
)


def _device_class(definition: dict[str, Any]) -> str:
    """Geräteklasse aus den Expose-Typen ableiten (Zigbee2MQTT liefert keine feste Klasse).

    Ergebnis: light, switch, climate, cover, lock, fan, remote (hat die Funktion
    "action", also Taster/Fernbedienung), sensor oder other (keine Funktionen bekannt).
    """
    exposes = definition.get("exposes")
    if not isinstance(exposes, list) or not exposes:
        return "other"
    types = {e.get("type") for e in exposes if isinstance(e, dict)}
    for expose_type, device_class in _CLASS_BY_EXPOSE_TYPE:
        if expose_type in types:
            return device_class
    props = {
        e.get("property") or e.get("name") for e in exposes if isinstance(e, dict)
    }
    if "action" in props:
        return "remote"
    return "sensor"


def _definition_icon(definition: dict[str, Any]) -> str | None:
    """Bild-Adresse, die Zigbee2MQTT selbst mitliefert (definition.icon), nur https."""
    icon = definition.get("icon")
    if isinstance(icon, str) and icon.lower().startswith("https://") and valid_link(icon):
        return icon
    return None


def _same_value(a: Any, b: Any) -> bool:
    """Gleicher Wert UND gleicher Typ (True ist hier nicht dasselbe wie 1)."""
    return type(a) is type(b) and a == b


_IEEE_RE = re.compile(r"0x[0-9a-f]{16}")

# Wartezeit nach der ersten Geräteliste, bevor der Ausgangszustand ans Notification Center geht
NC_SETTLE_SECONDS = 20.0


class Z2MManager:
    """Zustand + Befehle für eine Zigbee2MQTT-Instanz."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.base_topic: str = entry.data[CONF_BASE_TOPIC].strip("/")
        self._prefix = f"{self.base_topic}/"

        # MQTT: Integration von Home Assistant oder ein eigener (externer) Broker
        self._transport = create_transport(hass, entry.entry_id, entry.data)

        self.bridge_online: bool | None = None
        self.bridge_info: dict[str, Any] = {}

        # Netzwerkkarte: zuletzt gelesene Topologie (bleibt über Neustarts erhalten) und Abfragestatus
        self._network: dict[str, Any] | None = None
        self._network_at: str | None = None
        self._network_loading_since: str | None = None
        self._network_error: str | None = None
        self._network_timeout: CALLBACK_TYPE | None = None
        # Geräte, deren Offline-Status ignoriert wird (z. B. Lampe hinter einem Wandschalter)
        self._ignore_offline: set[str] = set()

        # Metadaten nach IEEE-Adresse, Zustände nach friendly_name
        self._meta: dict[str, dict[str, Any]] = {}
        self._groups: dict[int, dict[str, Any]] = {}
        self._states: dict[str, dict[str, Any]] = {}
        self._availability: dict[str, bool] = {}
        # Zeitpunkt der letzten Verfügbarkeits-Meldung und der letzten LIVE-Nachricht
        # (nicht retained) je Gerät – zum Abgleich, siehe _effective_availability()
        self._availability_ts: dict[str, datetime] = {}
        self._live_msg: dict[str, datetime] = {}
        self._last_msg: dict[str, str] = {}
        # Gerade gespeicherte Kommentare (ieee -> Text), bis Z2M die Konfiguration neu meldet
        self._comment_pending: dict[str, str] = {}

        # Persistenter Cache (nach IEEE), siehe async_start()
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}_{entry.entry_id}"
        )
        self._cache: dict[str, dict[str, Any]] = {}
        # Zuletzt bekannte Geräte (nach IEEE) und Geräte, die aus der Z2M-Liste verschwunden sind
        self._known: dict[str, dict[str, Any]] = {}
        self._missing: dict[str, dict[str, Any]] = {}
        # Gewollte Entfernungen (über die Karte oder "device_leave"): gelten nicht als "fehlt"
        self._expected_gone: dict[str, datetime] = {}

        self._events: deque[dict[str, Any]] = deque(maxlen=MAX_EVENT_LOG)
        # Version der App (Integration) und Ergebnis der Prüfung auf neue Versionen
        self.app: dict[str, Any] = {
            "version": VERSION,
            "latest_version": None,
            "update_available": False,
            "release_url": GITHUB_RELEASES_URL,
            "checked_at": None,
            "check_failed": False,
        }
        self.z2m: dict[str, Any] = {
            "latest_version": None,
            "update_available": False,
            "release_url": Z2M_GITHUB_RELEASES_URL,
            "checked_at": None,
            "check_failed": False,
        }
        self.jobs: dict[str, Any] = {"ota": None}
        self._tasks: set[asyncio.Task[Any]] = set()

        self._listeners: list[Listener] = []
        self._unsubs: list[CALLBACK_TYPE] = []
        self._flush_unsub: CALLBACK_TYPE | None = None

        # Für Ereignis-Erkennung (erster Durchlauf setzt nur die Basislinie)
        self._baseline: dict[str, set[str]] | None = None

        # Optionale Anbindung an das Notification Center (Schnittstelle Schema 1)
        self.nc = NotificationBridge(
            hass,
            entry,
            source=DOMAIN,
            name=entry.title,
            version=VERSION,
            icon=NC_SOURCE_ICON,
            catalog=NC_CATALOG,
        )
        self.nc.set_state_provider(self._nc_active_state)
        # Zuordnung Z2M-Gerät -> Home-Assistant-Gerät und Raum (wird bei Registry-Änderungen verworfen)
        self._ha_cache: dict[str, tuple[str, str, str | None]] | None = None
        self.problem: dict[str, Any] = {"on": False, "reasons": []}
        self._nc_started = False
        self.nc_settle_seconds: float = NC_SETTLE_SECONDS
        self._nc_ready_at: float | None = None
        self._nc_timer_set = False
        # Zuletzt gemeldete aktive Zustände je auflösbarer Art: {type: {key: Eintrag}}
        self._nc_prev: dict[str, dict[str, dict[str, Any]]] = {}
        # Anzahl gesendeter Meldungen je Art (nur Zahlen, für die Diagnose)
        self.nc_sent: dict[str, int] = {}
        # Optionen ohne die Notification-Center-Schalter: nur deren Änderung lädt neu
        self._core_options = self._core_of(entry.options)

        self.data: dict[str, Any] = {}
        self.details: dict[str, list[str]] = {}
        self._rebuild()

    # ------------------------------------------------------------------
    # Lebenszyklus
    # ------------------------------------------------------------------
    @property
    def low_battery_threshold(self) -> int:
        return int(self.entry.options.get(CONF_LOW_BATTERY, DEFAULT_LOW_BATTERY))

    @property
    def critical_battery_threshold(self) -> int:
        return int(
            self.entry.options.get(CONF_CRITICAL_BATTERY, DEFAULT_CRITICAL_BATTERY)
        )

    @property
    def stale_hours(self) -> int:
        return int(self.entry.options.get(CONF_STALE_HOURS, DEFAULT_STALE_HOURS))

    @property
    def problem_includes_updates(self) -> bool:
        return bool(self.entry.options.get(CONF_PROBLEM_UPDATES, DEFAULT_PROBLEM_UPDATES))

    @property
    def problem_includes_stale(self) -> bool:
        return bool(self.entry.options.get(CONF_PROBLEM_STALE, DEFAULT_PROBLEM_STALE))

    @property
    def fire_events(self) -> bool:
        return bool(self.entry.options.get(CONF_FIRE_EVENTS, DEFAULT_FIRE_EVENTS))

    async def async_start(self) -> None:
        await self._transport.async_wait_ready()

        stored = await self._store.async_load()
        if isinstance(stored, dict):
            cache = stored.get("devices")
            if isinstance(cache, dict):
                self._cache = {k: v for k, v in cache.items() if isinstance(v, dict)}
            ignored = stored.get("ignore_offline")
            if isinstance(ignored, list):
                self._ignore_offline = {str(i).lower() for i in ignored if isinstance(i, str)}
            # Geräteliste nur übernehmen, wenn sie zum selben Base-Topic gehört (sonst anderer Stick)
            if stored.get("known_topic") == self.base_topic:
                network = stored.get("network")
                if isinstance(network, dict) and isinstance(network.get("raw"), dict):
                    self._network = network["raw"]
                    self._network_at = network.get("at")
                known = stored.get("known")
                if isinstance(known, dict):
                    self._known = {k: v for k, v in known.items() if isinstance(v, dict)}
                missing = stored.get("missing")
                if isinstance(missing, dict):
                    self._missing = {k: v for k, v in missing.items() if isinstance(v, dict)}

        self._unsubs.append(
            await self._transport.async_subscribe(
                f"{self.base_topic}/#", self._handle_message
            )
        )

        # Änderungen an Geräten und Räumen in Home Assistant: Zuordnung neu aufbauen
        for event in (dr.EVENT_DEVICE_REGISTRY_UPDATED, ar.EVENT_AREA_REGISTRY_UPDATED):
            self._unsubs.append(self.hass.bus.async_listen(event, self._ha_registry_changed))
        # "Lange nichts gehört" ändert sich auch ohne neue Nachricht
        self._unsubs.append(async_track_time_interval(self.hass, self._stale_tick, STALE_TICK))

        # Zählt die gesendeten Meldungen je Art (Diagnose); speichert keine Inhalte
        self._unsubs.append(self.hass.bus.async_listen(NC_EVENT_REPORT, self._nc_count))

        # Beim Start und danach regelmäßig auf neue App- und Zigbee2MQTT-Versionen prüfen
        self._unsubs.append(
            async_track_time_interval(
                self.hass, self._app_update_tick, APP_UPDATE_CHECK_INTERVAL
            )
        )
        self._spawn(self.async_check_app_update(), "app_update_check")
        self._spawn(self.async_check_z2m_update(), "z2m_update_check")

    @callback
    def async_stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        if self._flush_unsub:
            self._flush_unsub()
            self._flush_unsub = None
        for task in list(self._tasks):
            task.cancel()
        self._tasks.clear()
        if self._network_timeout:
            self._network_timeout()
            self._network_timeout = None
        self._store.async_delay_save(self._cache_data, 0)
        self._listeners.clear()

    @callback
    def async_add_listener(self, listener: Listener) -> CALLBACK_TYPE:
        self._listeners.append(listener)

        @callback
        def _remove() -> None:
            if listener in self._listeners:
                self._listeners.remove(listener)

        return _remove

    @callback
    def _notify(self, kind: str, payload: Any) -> None:
        for listener in list(self._listeners):
            try:
                listener(kind, payload)
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Fehler in Listener")

    @callback
    def _schedule_update(self) -> None:
        if self._flush_unsub is not None:
            return
        self._flush_unsub = async_call_later(self.hass, FLUSH_DELAY, self._flush)

    @callback
    def _flush(self, _now: Any = None) -> None:
        self._flush_unsub = None
        self._rebuild()
        self._detect_changes()
        self._nc_detect()
        self._notify("update", self.data)
        self._store.async_delay_save(self._cache_data, STORAGE_SAVE_DELAY)

    def _cache_data(self) -> dict[str, Any]:
        """Daten für den Storage (nur ausgewählte Werte je Gerät)."""
        devices: dict[str, dict[str, Any]] = dict(self._cache)
        for ieee, meta in self._meta.items():
            name = meta.get("friendly_name")
            state = self._states.get(name or "", {})
            entry = {k: state[k] for k in _CACHED_KEYS if k in state}
            if name in self._last_msg:
                entry["_last_msg"] = self._last_msg[name]
            if entry:
                devices[ieee] = entry
        # Nur Geräte behalten, die es noch gibt
        if self._meta:
            devices = {k: v for k, v in devices.items() if k in self._meta}
        return {
            "devices": devices,
            "known_topic": self.base_topic,
            "known": self._known,
            "missing": self._missing,
            "ignore_offline": sorted(self._ignore_offline),
            "network": (
                {"raw": self._network, "at": self._network_at} if self._network else None
            ),
        }

    # ------------------------------------------------------------------
    # MQTT-Eingang
    # ------------------------------------------------------------------
    @callback
    def _handle_message(self, msg: Any) -> None:
        topic: str = msg.topic
        if not topic.startswith(self._prefix):
            return
        rel = topic[len(self._prefix) :]
        payload = _parse(msg.payload)

        if rel.startswith("bridge/"):
            self._handle_bridge(rel[len("bridge/") :], payload)
            return
        if rel.endswith(("/set", "/get")):
            return
        if rel.endswith("/availability"):
            self._handle_availability(rel[: -len("/availability")], payload)
            return
        self._handle_device_state(rel, payload, bool(getattr(msg, "retain", False)))

    def _handle_bridge(self, sub: str, payload: Any) -> None:
        if sub == "state":
            state = payload.get("state") if isinstance(payload, dict) else payload
            self.bridge_online = state == "online"
            self._schedule_update()
        elif sub == "info" and isinstance(payload, dict):
            version_changed = self.bridge_info.get("version") != payload.get("version")
            self.bridge_info = payload
            latest_version = self.z2m.get("latest_version")
            if latest_version:
                self.z2m = {
                    **self.z2m,
                    "update_available": is_newer(latest_version, payload.get("version")),
                }
            if version_changed:
                self._spawn(self.async_check_z2m_update(), "z2m_update_check")
            self._comment_pending.clear()
            self._schedule_update()
        elif sub == "devices" and isinstance(payload, list):
            self._apply_devices(payload)
            self._schedule_update()
        elif sub == "groups" and isinstance(payload, list):
            self._apply_groups(payload)
            self._schedule_update()
        elif sub == "event" and isinstance(payload, dict):
            self._handle_bridge_event(payload)
        elif sub.startswith("response/"):
            self._handle_response(sub[len("response/") :], payload)

    def _handle_response(self, topic: str, payload: Any) -> None:
        if not isinstance(payload, dict):
            return
        if topic == "networkmap":
            self._handle_networkmap(payload)
        if topic == "device/options" and payload.get("status") == "error":
            if self._comment_pending:
                self._comment_pending.clear()
                self._schedule_update()
        if topic.startswith(_FORWARDED_RESPONSES):
            self._notify(
                "response",
                {
                    "topic": topic,
                    "status": payload.get("status"),
                    "error": payload.get("error"),
                    # Die Netzwerkkarte ist groß und läuft über die Daten der Karte, nicht über die Antwort
                    "data": None if topic == "networkmap" else payload.get("data"),
                },
            )

    def _handle_networkmap(self, payload: dict[str, Any]) -> None:
        """Antwort auf die Abfrage der Netzwerkkarte übernehmen."""
        if self._network_loading_since is None:
            return  # nicht von uns angefordert (z. B. Z2M-Oberfläche): ignorieren
        self._network_clear_loading()
        data = payload.get("data")
        value = data.get("value") if isinstance(data, dict) else None
        parsed = parse_networkmap(value) if payload.get("status") == "ok" else None
        if parsed is None:
            self._network_error = "failed"
            _LOGGER.warning("Zigbee2MQTT hat die Netzwerkkarte nicht geliefert")
        else:
            self._network = parsed
            self._network_at = dt_util.utcnow().isoformat(timespec="seconds")
            self._network_error = None
            self._log("network_map", "", f"{len(parsed['nodes'])}")
        self._schedule_update()

    def _network_clear_loading(self) -> None:
        self._network_loading_since = None
        if self._network_timeout:
            self._network_timeout()
            self._network_timeout = None

    @callback
    def _network_timed_out(self, _now: Any = None) -> None:
        self._network_timeout = None
        if self._network_loading_since is not None:
            self._network_loading_since = None
            self._network_error = "timeout"
            self._schedule_update()

    def _handle_bridge_event(self, payload: dict[str, Any]) -> None:
        kind = payload.get("type")
        data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
        name = data.get("friendly_name") or data.get("ieee_address") or ""
        if kind not in (
            "device_joined",
            "device_leave",
            "device_interview",
            "device_announce",
        ):
            return
        detail = data.get("status") if kind == "device_interview" else None
        self._log(kind, name, detail)
        if kind == "device_joined":
            self._fire(EVENT_DEVICE_JOINED, {"name": name, "ieee": data.get("ieee_address")})
            self._nc_once("device_joined", data.get("ieee_address"), name)
        elif kind == "device_leave":
            if data.get("ieee_address"):
                self._expected_gone[str(data["ieee_address"])] = dt_util.utcnow()
            self._fire(EVENT_DEVICE_LEFT, {"name": name, "ieee": data.get("ieee_address")})
            self._nc_once("device_left", data.get("ieee_address"), name)
        self._schedule_update()

    def _log(self, kind: str, name: str, detail: str | None = None) -> None:
        self._events.appendleft(
            {
                "ts": dt_util.utcnow().isoformat(timespec="seconds"),
                "type": kind,
                "name": name,
                "detail": detail,
            }
        )

    def _apply_devices(self, devices: list[dict[str, Any]]) -> None:
        new_meta = {
            d["ieee_address"]: d
            for d in devices
            if isinstance(d, dict) and d.get("ieee_address")
        }
        # Umbenennungen: gespeicherte Werte auf den neuen Namen übertragen
        for ieee, meta in new_meta.items():
            old = self._meta.get(ieee)
            if old and old.get("friendly_name") != meta.get("friendly_name"):
                old_name, new_name = old["friendly_name"], meta["friendly_name"]
                for store in (
                    self._states,
                    self._availability,
                    self._availability_ts,
                    self._live_msg,
                    self._last_msg,
                ):
                    if old_name in store and new_name not in store:
                        store[new_name] = store.pop(old_name)
        self._meta = new_meta

        # Persistenter Cache: nur auffüllen, was noch keinen Live-Wert hat
        for ieee, meta in new_meta.items():
            cached = self._cache.get(ieee)
            name = meta.get("friendly_name")
            if not cached or not name:
                continue
            state = self._states.setdefault(name, {})
            for key in _CACHED_KEYS:
                if key in cached and key not in state:
                    state[key] = cached[key]
            if "_last_msg" in cached and name not in self._last_msg:
                self._last_msg[name] = cached["_last_msg"]

        self._track_known(new_meta)

    # ------------------------------------------------------------------
    # Fehlende Geräte (aus der Z2M-Liste verschwunden)
    # ------------------------------------------------------------------
    def _known_snapshot(self, meta: dict[str, Any]) -> dict[str, Any]:
        """Was von einem Gerät gemerkt wird, falls es aus der Z2M-Liste verschwindet."""
        name = meta.get("friendly_name") or ""
        state = self._states.get(name, {})
        definition = meta.get("definition") or {}
        dev_icon = self._device_config(meta).get("icon")
        return {
            "name": name,
            "type": meta.get("type"),
            "vendor": definition.get("vendor"),
            "model": definition.get("model") or meta.get("model_id"),
            "image_model": definition.get("model"),
            "icon": dev_icon if isinstance(dev_icon, str) else None,
            "icon_url": _definition_icon(definition),
            "device_class": _device_class(definition),
            "description": definition.get("description"),
            "power_source": meta.get("power_source"),
            "battery": _num(state.get("battery")),
            "linkquality": _num(state.get("linkquality")),
            "last_seen": _normalize_ts(state.get("last_seen")) or self._last_msg.get(name),
        }

    def _refresh_known(self) -> None:
        """Gemerkte Geräteliste auf den aktuellen Stand bringen (nur mit bekannter Geräteliste)."""
        if not self._meta:
            return
        self._known = {
            ieee: self._known_snapshot(meta)
            for ieee, meta in self._meta.items()
            if meta.get("type") != "Coordinator"
        }

    def _track_known(self, new_meta: dict[str, dict[str, Any]]) -> None:
        """Mit der letzten bekannten Liste vergleichen: verschwundene Geräte als "fehlt" merken."""
        if not new_meta:
            return  # leere Liste (z. B. Neustart von Z2M): nichts ableiten
        now = dt_util.utcnow()
        self._expected_gone = {
            k: v
            for k, v in self._expected_gone.items()
            if (now - v).total_seconds() < EXPECTED_GONE_SECONDS
        }
        current = {i for i, m in new_meta.items() if m.get("type") != "Coordinator"}
        for ieee in [i for i in self._missing if i in current]:
            snap = self._missing.pop(ieee)
            self._log("device_back", snap.get("name") or ieee)
        for ieee, snap in self._known.items():
            if ieee in current or ieee in self._missing or ieee in self._expected_gone:
                continue
            name = snap.get("name") or ieee
            self._missing[ieee] = {**snap, "missing_since": now.isoformat(timespec="seconds")}
            self._log("device_missing", name)
            self._fire(EVENT_DEVICE_MISSING, {"name": name, "ieee": ieee})

    def _serialize_missing(self, ieee: str, snap: dict[str, Any]) -> dict[str, Any]:
        ha = self._ha_devices().get(ieee.lower())
        return {
            "ieee": ieee,
            "name": snap.get("name") or ieee,
            "comment": None,
            "ha_device": ha[1] if ha else None,
            "ha_device_id": ha[0] if ha else None,
            "area": ha[2] if ha else None,
            "stale": False,
            "ignore_offline": False,
            "type": snap.get("type"),
            "vendor": snap.get("vendor"),
            "model": snap.get("model"),
            "image_model": snap.get("image_model"),
            "device_class": snap.get("device_class") or "other",
            "icon": snap.get("icon"),
            "icon_url": snap.get("icon_url"),
            "description": snap.get("description"),
            "power_source": snap.get("power_source"),
            "network_address": None,
            "supported": True,
            "disabled": False,
            "interviewing": False,
            "sw_build_id": None,
            "battery": snap.get("battery"),
            "voltage": None,
            "linkquality": snap.get("linkquality"),
            "available": None,
            "available_source": None,
            "last_seen": snap.get("last_seen"),
            "bindings": [],
            "out_clusters": [],
            "has_options": False,
            "has_exposes": False,
            "ota": {
                "capable": False,
                "state": None,
                "installed": None,
                "latest": None,
                "progress": None,
                "remaining": None,
            },
            "missing": True,
            "missing_since": snap.get("missing_since"),
        }

    async def async_forget_missing(self, ieee: str | None = None) -> None:
        """Ein fehlendes Gerät (oder alle) aus der Merkliste entfernen."""
        if ieee is None:
            self._missing.clear()
        elif ieee in self._missing:
            del self._missing[ieee]
        else:
            raise ValueError(f"Kein fehlendes Gerät: {ieee}")
        self._schedule_update()

    def _apply_groups(self, groups: list[dict[str, Any]]) -> None:
        self._groups = {
            g["id"]: g for g in groups if isinstance(g, dict) and "id" in g
        }

    def _handle_availability(self, name: str, payload: Any) -> None:
        state = payload.get("state") if isinstance(payload, dict) else payload
        if state in ("online", "offline"):
            self._availability[name] = state == "online"
            self._availability_ts[name] = dt_util.utcnow()
            self._schedule_update()

    def _is_group(self, name: str) -> bool:
        return any(g.get("friendly_name") == name for g in self._groups.values())

    def _handle_device_state(
        self, name: str, payload: Any, retained: bool = False
    ) -> None:
        if not isinstance(payload, dict):
            return
        # Gruppen-Topics sind keine Geräte (sonst tauchen sie als Phantom auf)
        if self._is_group(name):
            return
        self._states.setdefault(name, {}).update(payload)
        self._last_msg[name] = dt_util.utcnow().isoformat(timespec="seconds")
        if not retained:
            self._live_msg[name] = dt_util.utcnow()
        self._schedule_update()

    # ------------------------------------------------------------------
    # Datenmodell für Karte + Sensoren
    # ------------------------------------------------------------------
    def _name_for_ieee(self, ieee: Any) -> str | None:
        meta = self._meta.get(ieee or "")
        return meta.get("friendly_name") if meta else None

    def _bindings_of(self, meta: dict[str, Any]) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        endpoints = meta.get("endpoints")
        if not isinstance(endpoints, dict):
            return result
        for ep_id, ep in endpoints.items():
            if not isinstance(ep, dict):
                continue
            for binding in ep.get("bindings") or []:
                if not isinstance(binding, dict):
                    continue
                target = binding.get("target") or {}
                if target.get("type") == "group":
                    group = self._groups.get(target.get("id"), {})
                    target_name = group.get("friendly_name") or f"Gruppe {target.get('id')}"
                    kind = "group"
                    target_ref = f"group:{target.get('id')}"
                else:
                    target_name = (
                        self._name_for_ieee(target.get("ieee_address"))
                        or target.get("ieee_address")
                        or "?"
                    )
                    kind = "device"
                    target_ref = target.get("ieee_address")
                result.append(
                    {
                        "endpoint": ep_id,
                        "cluster": binding.get("cluster"),
                        "target": target_name,
                        "target_ref": target_ref,
                        "target_type": kind,
                    }
                )
        return result

    @staticmethod
    def _output_clusters(meta: dict[str, Any]) -> list[str]:
        clusters: list[str] = []
        endpoints = meta.get("endpoints")
        if isinstance(endpoints, dict):
            for ep in endpoints.values():
                cl = ep.get("clusters") if isinstance(ep, dict) else None
                if not isinstance(cl, dict):
                    continue
                for name in cl.get("output") or []:
                    if isinstance(name, str) and name not in clusters:
                        clusters.append(name)
        return clusters

    def _device_config(self, meta: dict[str, Any]) -> dict[str, Any]:
        """In Z2M gespeicherte Einstellungen eines Geräts (Optionen, Icon …)."""
        config = self.bridge_info.get("config")
        devices_cfg = config.get("devices") if isinstance(config, dict) else None
        ieee = str(meta.get("ieee_address") or "")
        name = meta.get("friendly_name")

        def matches(key: Any, value: dict[str, Any]) -> bool:
            return (
                str(key).lower() == ieee.lower()
                or str(value.get("ieee_address", "")).lower() == ieee.lower()
                or (bool(name) and value.get("friendly_name") == name)
            )

        if isinstance(devices_cfg, dict):
            direct = devices_cfg.get(ieee)
            if isinstance(direct, dict):
                return direct
            for key, value in devices_cfg.items():
                if isinstance(value, dict) and matches(key, value):
                    return value
        elif isinstance(devices_cfg, list):
            for value in devices_cfg:
                if isinstance(value, dict) and matches(value.get("id"), value):
                    return value
        return {}

    def _effective_availability(self, name: str) -> tuple[bool | None, str | None]:
        """Verfügbarkeit eines Geräts: (Wert, Quelle).

        Zigbee2MQTT meldet Geräte, die sich lange nicht gemeldet haben, als offline
        (bei Batteriegeräten erst nach Stunden). Eine gespeicherte (retained)
        Offline-Meldung kann veraltet sein. Hat das Gerät NACH dieser Meldung live
        gesendet, ist es erreichbar – dann gilt es als online (Quelle "activity").
        """
        raw = self._availability.get(name)
        if raw is None:
            return None, None
        if raw is False:
            live = self._live_msg.get(name)
            seen = self._availability_ts.get(name)
            if live is not None and seen is not None and live > seen:
                return True, "activity"
        return raw, "z2m"

    def _serialize(self, meta: dict[str, Any]) -> dict[str, Any]:
        name = meta.get("friendly_name", "")
        state = self._states.get(name, {})
        definition = meta.get("definition") or {}

        upd = state.get("update")
        upd = upd if isinstance(upd, dict) else None
        ota_state = upd.get("state") if upd else None
        if ota_state is None and state.get("update_available") is True:
            ota_state = "available"

        last_seen = _normalize_ts(state.get("last_seen")) or self._last_msg.get(name)

        # Eigenes Bild aus der Z2M-Gerätekonfiguration (Einstellung "icon"), falls gesetzt
        icon = None
        dev_icon = self._device_config(meta).get("icon")
        if isinstance(dev_icon, str):
            icon = dev_icon

        config = self._device_config(meta)
        comment = self._comment_pending.get(
            str(meta.get("ieee_address") or "").lower(), config.get("description")
        )
        comment = comment.strip() if isinstance(comment, str) and comment.strip() else None
        ha = self._ha_devices().get(str(meta.get("ieee_address") or "").lower())
        availability = self._effective_availability(name)

        return {
            "ieee": meta.get("ieee_address"),
            "name": name,
            "comment": comment,
            "ha_device": ha[1] if ha else None,
            "ha_device_id": ha[0] if ha else None,
            "area": ha[2] if ha else None,
            "stale": self._is_stale(last_seen, availability[0]),
            "ignore_offline": str(meta.get("ieee_address") or "").lower() in self._ignore_offline,
            "type": meta.get("type"),
            "vendor": definition.get("vendor"),
            "model": definition.get("model") or meta.get("model_id"),
            "image_model": definition.get("model"),
            "device_class": _device_class(definition),
            "icon": icon,
            "icon_url": _definition_icon(definition),
            "missing": False,
            "description": definition.get("description"),
            "power_source": meta.get("power_source"),
            "network_address": meta.get("network_address"),
            "supported": meta.get("supported", True),
            "disabled": meta.get("disabled", False),
            "interviewing": bool(meta.get("interviewing")),
            "sw_build_id": meta.get("software_build_id"),
            "battery": _num(state.get("battery")),
            "voltage": _num(state.get("voltage")),
            "linkquality": _num(state.get("linkquality")),
            "available": availability[0],
            "available_source": availability[1],
            "last_seen": last_seen,
            "bindings": self._bindings_of(meta),
            "out_clusters": self._output_clusters(meta),
            "has_options": bool(definition.get("options")),
            "has_exposes": bool(definition.get("exposes")),
            "ota": {
                "capable": bool(definition.get("supports_ota")) or upd is not None,
                "state": ota_state,
                "installed": upd.get("installed_version") if upd else None,
                "latest": upd.get("latest_version") if upd else None,
                "progress": _num(upd.get("progress")) if upd else None,
                "remaining": _num(upd.get("remaining")) if upd else None,
            },
        }

    def _serialize_group(self, group: dict[str, Any]) -> dict[str, Any]:
        members = []
        for member in group.get("members") or []:
            if not isinstance(member, dict):
                continue
            ieee = member.get("ieee_address")
            members.append(
                {
                    "ieee": ieee,
                    "name": self._name_for_ieee(ieee) or ieee,
                    "endpoint": member.get("endpoint"),
                }
            )
        return {
            "id": group.get("id"),
            "name": group.get("friendly_name"),
            "members": members,
            "scenes": len(group.get("scenes") or []),
        }

    def _network_view(self) -> dict[str, Any]:
        """Daten für den Reiter "Netzwerk": Baumansicht der zuletzt gelesenen Topologie."""
        view: dict[str, Any] = {
            "loading": self._network_loading_since is not None,
            "loading_since": self._network_loading_since,
            "error": self._network_error,
            "updated_at": self._network_at,
            "topology": None,
        }
        if self._network:
            names = {
                str(ieee).lower(): meta.get("friendly_name")
                for ieee, meta in self._meta.items()
                if meta.get("friendly_name")
            }
            view["topology"] = build_topology(self._network, names)
        return view

    async def async_network_refresh(self) -> None:
        """Netzwerkkarte neu von Zigbee2MQTT abfragen (dauert, belastet das Zigbee-Netz)."""
        if self._network_loading_since is not None:
            raise ValueError("Die Abfrage läuft bereits")
        if self.bridge_online is False:
            raise ValueError("Zigbee2MQTT ist nicht erreichbar")
        self._network_loading_since = dt_util.utcnow().isoformat(timespec="seconds")
        self._network_error = None
        self._network_timeout = async_call_later(
            self.hass, NETWORK_REQUEST_TIMEOUT, self._network_timed_out
        )
        self._schedule_update()
        try:
            await self._request("networkmap", {"type": "raw", "routes": False})
        except Exception:
            self._network_clear_loading()
            self._network_error = "failed"
            self._schedule_update()
            raise

    async def async_set_ignore_offline(self, ieee: str | None, enabled: Any) -> None:
        """Offline-Status eines Geräts ignorieren (keine Störung, keine Ereignisse, keine Meldung)."""
        key = str(ieee or "").lower()
        if key not in {str(i).lower() for i in self._meta}:
            raise ValueError("Unbekanntes Gerät")
        if bool(enabled):
            self._ignore_offline.add(key)
        else:
            self._ignore_offline.discard(key)
        self._schedule_update()

    def _network_url(self) -> tuple[str | None, str | None]:
        """Adresse der Zigbee2MQTT-Netzwerkkarte: eigene Angabe, sonst die URL aus der Z2M-Konfiguration."""
        custom = str(self.entry.options.get(CONF_NETWORK_URL) or "").strip()
        if custom and valid_link(custom):
            return custom, "option"
        config = self.bridge_info.get("config")
        frontend = config.get("frontend") if isinstance(config, dict) else None
        url = frontend.get("url") if isinstance(frontend, dict) else None
        if isinstance(url, str) and url.lower().startswith(("http://", "https://")) and valid_link(url):
            return f"{url.rstrip('/')}/#/network", "z2m"
        return None, None

    def _bridge_options(self) -> dict[str, Any]:
        config = self.bridge_info.get("config")
        config = config if isinstance(config, dict) else {}
        values: dict[str, Any] = {}
        for key, path in BRIDGE_OPTION_PATHS.items():
            node: Any = config
            for part in path:
                node = node.get(part) if isinstance(node, dict) else None
            values[key] = node
        return values

    def _rebuild(self) -> None:
        self._refresh_known()
        devices = [
            self._serialize(meta)
            for meta in self._meta.values()
            if meta.get("type") != "Coordinator"
        ]
        devices.sort(key=lambda d: (d["name"] or "").lower())

        low_t = self.low_battery_threshold
        crit_t = self.critical_battery_threshold
        # In Zigbee2MQTT deaktivierte Geräte sind gewollt still: sie zählen nicht als Störung
        active = [d for d in devices if not d["disabled"]]
        disabled = [d for d in devices if d["disabled"]]
        offline = [
            d for d in active if d["available"] is False and not d["ignore_offline"]
        ]
        ignored = [d for d in active if d["ignore_offline"]]
        low = [d for d in active if d["battery"] is not None and d["battery"] < low_t]
        critical = [
            d for d in active if d["battery"] is not None and d["battery"] < crit_t
        ]
        available = [d for d in active if d["ota"]["state"] == "available"]
        updating = [d for d in active if d["ota"]["state"] == "updating"]
        stale = [d for d in active if d["stale"]]
        groups = sorted(
            (self._serialize_group(g) for g in self._groups.values()),
            key=lambda g: (g["name"] or "").lower(),
        )
        missing = sorted(
            (self._serialize_missing(i, snap) for i, snap in self._missing.items()),
            key=lambda d: (d["name"] or "").lower(),
        )

        info = self.bridge_info
        version = info.get("version")
        major = _major(version)
        coordinator = info.get("coordinator")
        coordinator = coordinator if isinstance(coordinator, dict) else {}
        meta_c = coordinator.get("meta")
        meta_c = meta_c if isinstance(meta_c, dict) else {}

        self.details = {
            "offline": [d["name"] for d in offline],
            "low_battery": [d["name"] for d in low],
            "updates_available": [d["name"] for d in available],
            "critical_battery": [d["name"] for d in critical],
            "stale": [d["name"] for d in stale],
            "disabled": [d["name"] for d in disabled],
            "missing": [d["name"] for d in missing],
        }
        reasons: list[str] = []
        if self.bridge_online is False:
            reasons.append("bridge_offline")
        if offline:
            reasons.append("offline")
        if low:
            reasons.append("battery_critical" if critical else "battery_low")
        if available and self.problem_includes_updates:
            reasons.append("update_available")
        if stale and self.problem_includes_stale:
            reasons.append("stale")
        self.problem = {"on": bool(reasons), "reasons": reasons}
        network_url, network_source = self._network_url()
        self.data = {
            "bridge": {
                "online": self.bridge_online,
                "version": version,
                "latest_version": self.z2m["latest_version"],
                "update_available": self.z2m["update_available"],
                "release_url": self.z2m["release_url"],
                "check_failed": self.z2m["check_failed"],
                "compatible": major is None or major >= MIN_Z2M_MAJOR,
                "permit_join": bool(info.get("permit_join")),
                "permit_join_end": info.get("permit_join_end"),
                "restart_required": bool(info.get("restart_required")),
                "base_topic": self.base_topic,
                "coordinator_type": coordinator.get("type"),
                "coordinator_revision": meta_c.get("revision"),
                "network_url": network_url,
                "network_url_source": network_source,
                "options": self._bridge_options(),
                "option_values": {k: list(v) for k, v in _BRIDGE_OPTION_VALUES.items()},
            },
            "stats": {
                "total": len(devices),
                "offline": len(offline),
                "low_battery": len(low),
                "critical_battery": len(critical),
                "updates_available": len(available),
                "updating": len(updating),
                "stale": len(stale),
                "stale_hours": self.stale_hours,
                "disabled": len(disabled),
                "ignored_offline": len(ignored),
                "missing": len(missing),
                "groups": len(groups),
                "low_battery_threshold": low_t,
                "critical_battery_threshold": crit_t,
            },
            "jobs": dict(self.jobs),
            "app": dict(self.app),
            "z2m": dict(self.z2m),
            "nc": self.nc.snapshot(),
            "events": list(self._events),
            "groups": groups,
            "devices": devices,
            "missing": missing,
            "network": self._network_view(),
        }

    # ------------------------------------------------------------------
    # Ereignisse (offline / Batterie / Update / beigetreten)
    # ------------------------------------------------------------------
    def _snapshot_sets(self) -> dict[str, set[str]]:
        devices = [d for d in self.data["devices"] if not d["disabled"]]
        low_t = self.low_battery_threshold
        return {
            "offline": {
                d["name"]
                for d in devices
                if d["available"] is False and not d["ignore_offline"]
            },
            "low": {
                d["name"]
                for d in devices
                if d["battery"] is not None and d["battery"] < low_t
            },
            "update": {d["name"] for d in devices if d["ota"]["state"] == "available"},
        }

    @callback
    def _fire(self, event: str, data: dict[str, Any]) -> None:
        if self.fire_events:
            self.hass.bus.async_fire(event, {"base_topic": self.base_topic, **data})

    def _detect_changes(self) -> None:
        current = self._snapshot_sets()
        previous = self._baseline
        self._baseline = current
        if previous is None or not self._meta:
            return  # erster Durchlauf: nur Basislinie, keine Ereignisse

        by_name = {d["name"]: d for d in self.data["devices"]}
        for name in current["offline"] - previous["offline"]:
            self._log("offline", name)
            self._fire(EVENT_DEVICE_OFFLINE, {"name": name, "ieee": by_name[name]["ieee"]})
        for name in previous["offline"] - current["offline"]:
            if name in by_name:
                self._log("online", name)
                self._fire(EVENT_DEVICE_ONLINE, {"name": name, "ieee": by_name[name]["ieee"]})
        for name in current["low"] - previous["low"]:
            self._log("battery_low", name, f"{by_name[name]['battery']} %")
            self._fire(
                EVENT_BATTERY_LOW,
                {
                    "name": name,
                    "ieee": by_name[name]["ieee"],
                    "battery": by_name[name]["battery"],
                },
            )
        for name in current["update"] - previous["update"]:
            ota = by_name[name]["ota"]
            self._log("update_available", name, ota.get("latest"))
            self._fire(
                EVENT_UPDATE_AVAILABLE,
                {
                    "name": name,
                    "ieee": by_name[name]["ieee"],
                    "installed": ota.get("installed"),
                    "latest": ota.get("latest"),
                },
            )

    # ------------------------------------------------------------------
    # Notification Center (optional, Schnittstelle Schema 1)
    # ------------------------------------------------------------------
    @staticmethod
    def _core_of(options: Any) -> dict[str, Any]:
        return {
            k: v for k, v in dict(options).items() if k not in (NC_OPT_ENABLED, NC_OPT_TYPES, CONF_SIDEBAR_PANEL, CONF_SIDEBAR_TITLE)
        }

    def core_options_changed(self) -> bool:
        """True, wenn sich andere Optionen als die Notification-Center-Schalter geändert haben."""
        return self._core_of(self.entry.options) != self._core_options

    def _nc_active_state(self) -> dict[str, list[dict[str, Any]]]:
        """Aktive Zustände je auflösbarer Meldungsart, abgeleitet aus dem Datenmodell.

        Es gelten die vorhandenen Schwellen aus den Optionen (keine neuen). Ein Gerät unter der
        kritischen Schwelle erscheint nur als "Batterie kritisch", nicht zusätzlich als "niedrig".
        """
        state: dict[str, list[dict[str, Any]]] = {t: [] for t in NC_STATE_TYPES}
        if self.bridge_online is False:
            state["bridge_offline"].append(
                {
                    "key": self.base_topic,
                    "subject": {"id": self.base_topic, "name": self.base_topic, "kind": "system"},
                    "placeholders": {"bridge": self.base_topic},
                }
            )
        low_t = self.low_battery_threshold
        crit_t = self.critical_battery_threshold
        for device in self.data.get("devices", []):
            ieee = device.get("ieee")
            if not ieee:
                continue
            if device.get("disabled"):
                continue
            name = device.get("name") or ieee
            subject = {"id": ieee, "name": name, "kind": "device"}
            if device["available"] is False and not device.get("ignore_offline"):
                state["device_offline"].append(
                    {"key": ieee, "subject": subject, "placeholders": {"name": name}}
                )
            battery = device["battery"]
            if battery is not None:
                entry = {
                    "key": ieee,
                    "subject": subject,
                    "placeholders": {"name": name, "battery": battery},
                }
                if battery < crit_t:
                    state["battery_critical"].append(entry)
                elif battery < low_t:
                    state["battery_low"].append(entry)
            if device["ota"]["state"] == "available":
                state["update_available"].append(
                    {"key": ieee, "subject": subject, "placeholders": {"name": name}}
                )
        for device in self.data.get("missing", []):
            ieee = device.get("ieee")
            if not ieee:
                continue
            name = device.get("name") or ieee
            state["device_missing"].append(
                {
                    "key": ieee,
                    "subject": {"id": ieee, "name": name, "kind": "device"},
                    "placeholders": {"name": name},
                }
            )
        return state

    @callback
    def _nc_detect(self) -> None:
        """Zustandswechsel ans Notification Center melden (genau eine Meldung je Wechsel).

        Gestartet wird erst, wenn die Geräteliste bekannt ist: Register, Ausgangszustand
        (initial, ohne Push) und Sync. Danach folgt je Eintritt ein "active" und je Ende ein
        "resolved". Wiederholungen werden nicht gesendet.
        """
        if not self._meta:
            return
        if not self._nc_started:
            # Kurz warten: nach dem Start treffen Zustände und Verfügbarkeit noch nach der
            # Geräteliste ein. Was dabei auftaucht, gehört zum Ausgangszustand (initial),
            # nicht zu Meldungen, die das Notification Center als neu ausliefern würde.
            loop_time = self.hass.loop.time()
            if self._nc_ready_at is None:
                self._nc_ready_at = loop_time + self.nc_settle_seconds
            if loop_time < self._nc_ready_at:
                if not self._nc_timer_set:
                    self._nc_timer_set = True
                    self._unsubs.append(
                        async_call_later(
                            self.hass, self._nc_ready_at - loop_time + 0.1, self._nc_settled
                        )
                    )
                return
        current = self._nc_active_state()
        if not self._nc_started:
            self._nc_started = True
            self._nc_prev = {t: {e["key"]: e for e in items} for t, items in current.items()}
            self.nc.async_start()
            return
        for type_ in NC_STATE_TYPES:
            now = {e["key"]: e for e in current.get(type_, [])}
            before = self._nc_prev.get(type_, {})
            for key, entry in now.items():
                if key not in before:
                    self.nc.report(
                        type_,
                        key,
                        "active",
                        subject=entry["subject"],
                        placeholders=entry["placeholders"],
                    )
            for key, entry in before.items():
                if key not in now:
                    self.nc.report(
                        type_,
                        key,
                        "resolved",
                        subject=entry["subject"],
                        placeholders=entry["placeholders"],
                    )
            self._nc_prev[type_] = now

    @callback
    def _nc_settled(self, _now: Any = None) -> None:
        self._schedule_update()

    @callback
    def _nc_once(self, type_: str, ieee: Any, name: str) -> None:
        """Einmalige Meldung (Gerät beigetreten / hat das Netz verlassen), bleibt bis zum Quittieren."""
        key = str(ieee or name or "")
        if not key:
            return
        label = name or key
        self.nc.report(
            type_,
            key,
            "active",
            subject={"id": key, "name": label, "kind": "device"},
            placeholders={"name": label},
        )

    @callback
    def _nc_count(self, event: Any) -> None:
        """Zählt eigene Meldungen je Art. Nur Zahlen, keine Inhalte."""
        data = event.data
        if data.get("source") != DOMAIN or data.get("entry_id") != self.entry.entry_id:
            return
        type_ = str(data.get("type"))
        self.nc_sent[type_] = self.nc_sent.get(type_, 0) + 1

    @callback
    def async_nc_options_changed(self) -> None:
        """Schalter geändert: Katalog und Zustand neu anmelden, Karte sofort aktualisieren."""
        if self._nc_started:
            self.nc.async_options_changed()
        self._rebuild()
        self._notify("update", self.data)

    def _nc_write_options(self, master: bool | None, types: dict[str, bool] | None) -> None:
        options = dict(self.entry.options)
        if master is not None:
            options[NC_OPT_ENABLED] = master
        if types is not None:
            current = options.get(NC_OPT_TYPES)
            merged = dict(current) if isinstance(current, dict) else {}
            merged.update(types)
            options[NC_OPT_TYPES] = merged
        self.hass.config_entries.async_update_entry(self.entry, options=options)

    async def async_nc_set_master(self, enabled: Any) -> None:
        if not isinstance(enabled, bool):
            raise ValueError("Ungültiger Wert für den Hauptschalter")
        self._nc_write_options(enabled, None)

    async def async_nc_set_type(self, nc_type: Any, enabled: Any) -> None:
        if nc_type not in NC_TYPE_IDS:
            raise ValueError(f"Unbekannte Meldungsart: {nc_type}")
        if not isinstance(enabled, bool):
            raise ValueError("Ungültiger Wert für die Meldungsart")
        self._nc_write_options(None, {nc_type: enabled})

    # ------------------------------------------------------------------
    # Details auf Anforderung (Optionen-Schema, Entitäten)
    # ------------------------------------------------------------------
    def _options_schema(self, ieee: str | None) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        """Formular-Schema der Geräteoptionen + aktuell gesetzte Werte."""
        meta = self._meta.get(ieee or "")
        if not meta:
            raise ValueError(f"Unbekanntes Gerät: {ieee}")
        definition = meta.get("definition") or {}

        schema: list[dict[str, Any]] = []
        for option in definition.get("options") or []:
            if not isinstance(option, dict):
                continue
            if option.get("type") not in _SIMPLE_OPTION_TYPES:
                continue
            prop = option.get("property") or option.get("name")
            if not prop:
                continue
            schema.append(
                {
                    "type": option["type"],
                    "property": prop,
                    "label": option.get("label") or option.get("name") or prop,
                    "description": option.get("description"),
                    "unit": option.get("unit"),
                    "min": option.get("value_min"),
                    "max": option.get("value_max"),
                    "step": option.get("value_step"),
                    "values": option.get("values"),
                    "value_on": option.get("value_on", True),
                    "value_off": option.get("value_off", False),
                }
            )

        current = self._device_config(meta)
        values = {
            s["property"]: current[s["property"]]
            for s in schema
            if s["property"] in current
        }
        return schema, values

    def _exposes_of(self, ieee: str | None) -> list[dict[str, Any]]:
        """Alle Expose-Funktionen eines Geräts mit den zuletzt bekannten Werten."""
        meta = self._meta.get(ieee or "")
        if not meta:
            raise ValueError(f"Unbekanntes Gerät: {ieee}")
        definition = meta.get("definition") or {}
        state = self._states.get(meta.get("friendly_name") or "", {})
        return _flatten_exposes(definition.get("exposes"), state)

    def device_details(self, ieee: str | None) -> dict[str, Any]:
        """Optionen-Schema + Expose-Funktionen + aktuelle Werte + HA-Entitäten."""
        schema, values = self._options_schema(ieee)
        return {
            "ieee": ieee,
            "options_schema": schema,
            "options": values,
            "exposes": self._exposes_of(ieee),
            "entities": self._entities_of(ieee),
        }

    @callback
    def _ha_registry_changed(self, _event: Any) -> None:
        self._ha_cache = None
        self._schedule_update()

    @callback
    def _stale_tick(self, _now: Any = None) -> None:
        if self.stale_hours > 0:
            self._schedule_update()

    def _is_stale(self, last_seen: str | None, available: bool | None) -> bool:
        """Länger als die eingestellte Zeit keine Nachricht, Z2M meldet das Gerät aber nicht als offline."""
        hours = self.stale_hours
        if hours <= 0 or not last_seen or available is False:
            return False
        seen = dt_util.parse_datetime(last_seen)
        if seen is None:
            return False
        if seen.tzinfo is None:
            seen = seen.replace(tzinfo=UTC)
        return (dt_util.utcnow() - seen).total_seconds() > hours * 3600

    def _ha_devices(self) -> dict[str, tuple[str, str, str | None]]:
        """IEEE-Adresse -> (Geräte-ID, Name, Raum) der zugehörigen Home-Assistant-Geräte.

        Die Zuordnung läuft über die MQTT-Identifier; die IEEE-Adresse steckt je nach
        Discovery in unterschiedlich aufgebauten Identifier-Teilen.
        """
        if self._ha_cache is not None:
            return self._ha_cache
        dev_reg = dr.async_get(self.hass)
        area_reg = ar.async_get(self.hass)
        result: dict[str, tuple[str, str, str | None]] = {}
        for cfg in self.hass.config_entries.async_entries("mqtt"):
            for device in dr.async_entries_for_config_entry(dev_reg, cfg.entry_id):
                area = area_reg.async_get_area(device.area_id) if device.area_id else None
                info = (
                    device.id,
                    device.name_by_user or device.name or "",
                    area.name if area else None,
                )
                for ident in device.identifiers:
                    if len(ident) < 2 or ident[0] != "mqtt":
                        continue
                    for part in ident[1:]:
                        for found in _IEEE_RE.findall(str(part).lower()):
                            result.setdefault(found, info)
        self._ha_cache = result
        return result

    def _entities_of(self, ieee: str | None) -> list[dict[str, str]]:
        if not ieee:
            return []
        ha = self._ha_devices().get(ieee.lower())
        if not ha:
            return []
        ent_reg = er.async_get(self.hass)
        result = [
            {
                "entity_id": ent.entity_id,
                "name": ent.name or ent.original_name or "",
            }
            for ent in er.async_entries_for_device(ent_reg, ha[0])
        ]
        return sorted(result, key=lambda e: e["entity_id"])

    # ------------------------------------------------------------------
    # Befehle
    # ------------------------------------------------------------------
    def _name_of(self, ieee: str | None) -> str:
        name = self._name_for_ieee(ieee)
        if not name:
            raise ValueError(f"Unbekanntes Gerät: {ieee}")
        return name

    def _group_name(self, group_id: Any) -> str:
        try:
            group = self._groups[int(group_id)]
        except (KeyError, TypeError, ValueError) as err:
            raise ValueError(f"Unbekannte Gruppe: {group_id}") from err
        return group["friendly_name"]

    async def _request(self, sub: str, payload: Any) -> None:
        body = payload if isinstance(payload, str) else json.dumps(payload)
        await self._transport.async_publish(
            f"{self.base_topic}/bridge/request/{sub}", body
        )

    def _valid_new_name(self, new_name: str, current: str | None) -> str:
        new_name = (new_name or "").strip()
        if not new_name:
            raise ValueError("Der neue Name darf nicht leer sein")
        if new_name == current:
            return new_name
        taken = {m.get("friendly_name") for m in self._meta.values()}
        taken |= {g.get("friendly_name") for g in self._groups.values()}
        if new_name in taken:
            raise ValueError(f"Name bereits vergeben: {new_name}")
        return new_name

    # --- Geräte -------------------------------------------------------
    async def async_rename(self, ieee: str | None, new_name: str) -> None:
        old_name = self._name_of(ieee)
        new_name = self._valid_new_name(new_name, old_name)
        await self._request(
            "device/rename",
            {"from": old_name, "to": new_name, "homeassistant_rename": True},
        )

    async def async_set_comment(self, ieee: str | None, comment: Any) -> None:
        """Kommentar des Geräts ändern (Z2M-Geräteeinstellung "description")."""
        if comment is not None and not isinstance(comment, str):
            raise ValueError("Der Kommentar muss ein Text sein")
        text = "".join(
            ch for ch in (comment or "") if ch in "\n" or ch.isprintable()
        ).strip()
        if len(text) > MAX_COMMENT_LENGTH:
            raise ValueError(
                f"Der Kommentar ist zu lang (höchstens {MAX_COMMENT_LENGTH} Zeichen)"
            )
        await self._request(
            "device/options",
            {"id": self._name_of(ieee), "options": {"description": text}},
        )
        # Sofort anzeigen; Z2M bestätigt per Antwort, Fehler setzen den Wert zurück
        self._comment_pending[str(ieee or "").lower()] = text
        self._schedule_update()

    async def async_set_options(self, ieee: str | None, options: Any) -> None:
        if not isinstance(options, dict) or not options:
            raise ValueError("Keine Optionen übergeben")
        schema, _values = self._options_schema(ieee)
        allowed = {s["property"] for s in schema}
        unknown = set(options) - allowed
        if unknown:
            raise ValueError(f"Unbekannte Optionen: {', '.join(sorted(unknown))}")
        await self._request(
            "device/options", {"id": self._name_of(ieee), "options": options}
        )

    async def async_set_expose(self, ieee: str | None, prop: Any, value: Any) -> None:
        """Einen Schalter (binäre Funktion mit Schreibzugriff) eines Geräts umlegen.

        Geprüft wird alles im Backend: Das Gerät muss bekannt sein, die Funktion muss
        in seinen Expose-Funktionen stehen, ein schreibbarer Schalter auf oberster
        Ebene sein, und der Wert muss genau der Ein- oder Aus-Wert dieser Funktion sein.
        """
        name = self._name_of(ieee)
        if not isinstance(prop, str) or not prop:
            raise ValueError("Keine Funktion angegeben")
        row = next((r for r in self._exposes_of(ieee) if r["property"] == prop), None)
        if row is None:
            raise ValueError(f"Unbekannte Funktion: {prop}")
        if not row.get("switchable"):
            raise ValueError(f"Die Funktion '{prop}' lässt sich nicht schalten")
        value_on = True if row.get("value_on") is None else row["value_on"]
        value_off = False if row.get("value_off") is None else row["value_off"]
        if not (_same_value(value, value_on) or _same_value(value, value_off)):
            raise ValueError(f"Ungültiger Wert für '{prop}'")
        await self._transport.async_publish(
            f"{self.base_topic}/{name}/set", json.dumps({prop: value})
        )

    async def async_remove(self, ieee: str | None, force: bool = False) -> None:
        # Gewollte Entfernung: das Gerät soll danach nicht als "fehlt" erscheinen
        name = self._name_of(ieee)
        if ieee:
            self._expected_gone[ieee] = dt_util.utcnow()
            self._known.pop(ieee, None)
            self._missing.pop(ieee, None)
        await self._request(
            "device/remove", {"id": name, "force": bool(force)}
        )

    # --- OTA ----------------------------------------------------------
    async def async_ota_check(self, ieee: str | None) -> None:
        await self._request("device/ota_update/check", {"id": self._name_of(ieee)})

    async def async_ota_update(self, ieee: str | None) -> None:
        await self._request("device/ota_update/update", {"id": self._name_of(ieee)})

    def _start_job(self, name: str, coro: Any) -> None:
        running = self.jobs.get(name)
        if running and running.get("running"):
            coro.close()
            raise ValueError("Der Vorgang läuft bereits")
        task = self.entry.async_create_background_task(
            self.hass, coro, f"{DOMAIN}_{name}"
        )
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    def _set_job(self, **values: Any) -> None:
        self.jobs["ota"] = values or None
        self._rebuild()
        self._notify("update", self.data)

    async def async_ota_check_all(self) -> None:
        """Startet die Prüfung im Hintergrund (blockiert die Karte nicht)."""
        self._start_job("ota", self._run_check_all())

    async def _run_check_all(self) -> None:
        targets = [d["name"] for d in self.data["devices"] if d["ota"]["capable"]]
        total = len(targets)
        try:
            for done, name in enumerate(targets, start=1):
                self._set_job(kind="check", running=True, done=done - 1, total=total)
                await self._request("device/ota_update/check", {"id": name})
                await asyncio.sleep(OTA_CHECK_SPACING)
        finally:
            self._set_job(kind="check", running=False, done=total, total=total)

    async def async_ota_update_all(self) -> None:
        """Installiert verfügbare Updates nacheinander (nie parallel)."""
        self._start_job("ota", self._run_update_all())

    async def _run_update_all(self) -> None:
        targets = [
            d["name"] for d in self.data["devices"] if d["ota"]["state"] == "available"
        ]
        total = len(targets)
        try:
            for done, name in enumerate(targets, start=1):
                self._set_job(
                    kind="update", running=True, done=done - 1, total=total, current=name
                )
                await self._request("device/ota_update/update", {"id": name})
                await self._wait_until_finished(name)
        finally:
            self._set_job(kind="update", running=False, done=total, total=total)

    async def _wait_until_finished(self, name: str) -> None:
        """Wartet, bis das Gerät nicht mehr 'updating' meldet (max. 2 h)."""

        def state() -> str | None:
            for device in self.data["devices"]:
                if device["name"] == name:
                    return device["ota"]["state"]
            return None

        # Auf den Start warten (max. 90 s), dann auf das Ende (max. 2 h)
        for _ in range(18):
            await asyncio.sleep(5)
            if state() == "updating":
                break
        else:
            return
        for _ in range(1440):
            await asyncio.sleep(5)
            if state() != "updating":
                return

    async def async_ota_cancel(self) -> None:
        for task in list(self._tasks):
            task.cancel()

    # --- Pairing / Bridge --------------------------------------------
    async def async_permit_join(self, enabled: bool, seconds: int | None = None) -> None:
        time = (seconds or PERMIT_JOIN_SECONDS) if enabled else 0
        await self._request("permit_join", {"time": time})

    async def async_restart(self) -> None:
        await self._request("restart", "")

    async def async_set_bridge_option(self, key: str, value: Any) -> None:
        if key not in BRIDGE_OPTION_PATHS:
            raise ValueError(f"Option nicht änderbar: {key}")
        if value not in _BRIDGE_OPTION_VALUES[key]:
            raise ValueError(f"Ungültiger Wert für {key}: {value}")
        options: dict[str, Any] = {}
        node = options
        *parents, leaf = BRIDGE_OPTION_PATHS[key]
        for part in parents:
            node = node.setdefault(part, {})
        node[leaf] = value
        await self._request("options", {"options": options})

    # --- App-Version --------------------------------------------------
    @callback
    def _app_update_tick(self, _now: datetime) -> None:
        self._spawn(self.async_check_app_update(), "app_update_check")
        self._spawn(self.async_check_z2m_update(), "z2m_update_check")

    def _spawn(self, coro: Any, name: str) -> None:
        task = self.entry.async_create_background_task(
            self.hass, coro, f"{DOMAIN}_{name}"
        )
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def async_check_app_update(self, force: bool = False) -> None:
        """Auf GitHub nach einer neueren Version der App suchen."""
        latest = await async_fetch_latest(self.hass, force)
        checked = dt_util.utcnow().isoformat(timespec="seconds")
        if latest is None:
            self.app = {**self.app, "checked_at": checked, "check_failed": True}
        else:
            self.app = {
                **self.app,
                "latest_version": latest["version"],
                "release_url": latest["url"],
                "update_available": is_newer(latest["version"], VERSION),
                "checked_at": checked,
                "check_failed": False,
            }
        self._schedule_update()

    async def async_check_z2m_update(self, force: bool = False) -> None:
        """Auf GitHub nach einer neueren Zigbee2MQTT-Version suchen."""
        current = (
            self.bridge_info.get("version")
            if isinstance(self.bridge_info, dict)
            else None
        )
        latest = await async_fetch_latest_z2m(self.hass, current, force)
        checked = dt_util.utcnow().isoformat(timespec="seconds")
        if latest is None:
            self.z2m = {**self.z2m, "checked_at": checked, "check_failed": True}
        else:
            current = (
                self.bridge_info.get("version")
                if isinstance(self.bridge_info, dict)
                else None
            )
            self.z2m = {
                **self.z2m,
                "latest_version": latest["version"],
                "release_url": latest["url"],
                "update_available": is_newer(latest["version"], current),
                "checked_at": checked,
                "check_failed": False,
            }
            self._sync_z2m_update_notification(current)
        self._schedule_update()

    def _sync_z2m_update_notification(self, current_version: str | None) -> None:
        """Persistente HA-Meldung bei einem verfügbaren Z2M-Update synchronisieren."""
        if not current_version:
            return

        notification_id = f"{DOMAIN}_z2m_update_{self.entry.entry_id}"
        if not self.z2m["update_available"]:
            persistent_notification.async_dismiss(self.hass, notification_id)
            return

        latest_version = str(self.z2m["latest_version"])
        release_url = self.z2m.get("release_url")
        if not isinstance(release_url, str) or not release_url.startswith(
            "https://github.com/Koenkk/zigbee2mqtt/"
        ):
            release_url = Z2M_GITHUB_RELEASES_URL

        language = str(getattr(self.hass.config, "language", "en")).lower()
        if language.startswith("de"):
            title = "Zigbee2MQTT-Update verfügbar"
            message = (
                f"Installierte Version: `{current_version}`\n\n"
                f"Neueste Version: **{latest_version}** ([Release ansehen]({release_url}))\n\n"
                "Aktualisiere Zigbee2MQTT manuell auf dem Server bzw. im Docker-Container. "
                "Das Update erfolgt nicht über HACS."
            )
        else:
            title = "Zigbee2MQTT update available"
            message = (
                f"Installed version: `{current_version}`\n\n"
                f"Latest version: **{latest_version}** ([View release]({release_url}))\n\n"
                "Update Zigbee2MQTT manually on its server or in the Docker container, "
                "not via HACS."
            )
        persistent_notification.async_create(
            self.hass,
            message,
            title=title,
            notification_id=notification_id,
        )

    # --- Gruppen ------------------------------------------------------
    async def async_group_add(self, name: str) -> None:
        name = self._valid_new_name(name, None)
        await self._request("group/add", {"friendly_name": name})

    async def async_group_rename(self, group_id: Any, new_name: str) -> None:
        old = self._group_name(group_id)
        new = self._valid_new_name(new_name, old)
        await self._request(
            "group/rename", {"from": old, "to": new, "homeassistant_rename": True}
        )

    async def async_group_remove(self, group_id: Any) -> None:
        await self._request("group/remove", {"id": self._group_name(group_id)})

    async def async_group_member(self, group_id: Any, ieee: str | None, add: bool) -> None:
        await self._request(
            "group/members/add" if add else "group/members/remove",
            {"group": self._group_name(group_id), "device": self._name_of(ieee)},
        )

    # --- Bindings -----------------------------------------------------
    def _target_name(self, target: str | None) -> str:
        """Ziel kann eine IEEE-Adresse oder 'group:<id>' sein."""
        if target and target.startswith("group:"):
            return self._group_name(target.split(":", 1)[1])
        return self._name_of(target)

    async def async_bind(
        self, ieee: str | None, target: str | None, clusters: Any, bind: bool
    ) -> None:
        payload: dict[str, Any] = {
            "from": self._name_of(ieee),
            "to": self._target_name(target),
        }
        if isinstance(clusters, list) and clusters:
            payload["clusters"] = [str(c) for c in clusters]
        await self._request("device/bind" if bind else "device/unbind", payload)


type Z2MConfigEntry = ConfigEntry[Z2MManager]
