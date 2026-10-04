# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): afc946ad6551ab57f846ea5bf2ee022339f4ba147a4f06395681a06f1d17dc95
"""Hält den Zustand der Zigbee2MQTT-Bridge und sendet Befehle per MQTT."""

from __future__ import annotations

import asyncio
import json
import logging
from collections import deque
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from homeassistant.components import mqtt
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryNotReady
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
    DEFAULT_CRITICAL_BATTERY,
    DEFAULT_FIRE_EVENTS,
    DEFAULT_LOW_BATTERY,
    DOMAIN,
    EVENT_BATTERY_LOW,
    EVENT_DEVICE_JOINED,
    EVENT_DEVICE_LEFT,
    EVENT_DEVICE_OFFLINE,
    EVENT_DEVICE_ONLINE,
    EVENT_UPDATE_AVAILABLE,
    FLUSH_DELAY,
    GITHUB_RELEASES_URL,
    MAX_EVENT_LOG,
    MIN_Z2M_MAJOR,
    OTA_CHECK_SPACING,
    PERMIT_JOIN_SECONDS,
    STORAGE_SAVE_DELAY,
    STORAGE_VERSION,
    VERSION,
)
from .update_check import async_fetch_latest, is_newer

_LOGGER = logging.getLogger(__name__)

Listener = Callable[[str, Any], None]

# Antworten der Bridge, die an die Karte weitergereicht werden (Toasts)
_FORWARDED_RESPONSES = ("device/", "group/", "permit_join", "options", "restart")

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


class Z2MManager:
    """Zustand + Befehle für eine Zigbee2MQTT-Instanz."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.base_topic: str = entry.data[CONF_BASE_TOPIC].strip("/")
        self._prefix = f"{self.base_topic}/"

        self.bridge_online: bool | None = None
        self.bridge_info: dict[str, Any] = {}

        # Metadaten nach IEEE-Adresse, Zustände nach friendly_name
        self._meta: dict[str, dict[str, Any]] = {}
        self._groups: dict[int, dict[str, Any]] = {}
        self._states: dict[str, dict[str, Any]] = {}
        self._availability: dict[str, bool] = {}
        self._last_msg: dict[str, str] = {}

        # Persistenter Cache (nach IEEE), siehe async_start()
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}_{entry.entry_id}"
        )
        self._cache: dict[str, dict[str, Any]] = {}

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
        self.jobs: dict[str, Any] = {"ota": None}
        self._tasks: set[asyncio.Task[Any]] = set()

        self._listeners: list[Listener] = []
        self._unsubs: list[CALLBACK_TYPE] = []
        self._flush_unsub: CALLBACK_TYPE | None = None

        # Für Ereignis-Erkennung (erster Durchlauf setzt nur die Basislinie)
        self._baseline: dict[str, set[str]] | None = None

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
    def fire_events(self) -> bool:
        return bool(self.entry.options.get(CONF_FIRE_EVENTS, DEFAULT_FIRE_EVENTS))

    async def async_start(self) -> None:
        if not await mqtt.async_wait_for_mqtt_client(self.hass):
            raise ConfigEntryNotReady("MQTT ist nicht verfügbar")

        stored = await self._store.async_load()
        if isinstance(stored, dict):
            cache = stored.get("devices")
            if isinstance(cache, dict):
                self._cache = {k: v for k, v in cache.items() if isinstance(v, dict)}

        self._unsubs.append(
            await mqtt.async_subscribe(
                self.hass, f"{self.base_topic}/#", self._handle_message
            )
        )

        # Beim Start und danach regelmäßig auf eine neue App-Version prüfen
        self._unsubs.append(
            async_track_time_interval(
                self.hass, self._app_update_tick, APP_UPDATE_CHECK_INTERVAL
            )
        )
        self._spawn(self.async_check_app_update(), "app_update_check")

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
        return {"devices": devices}

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
        self._handle_device_state(rel, payload)

    def _handle_bridge(self, sub: str, payload: Any) -> None:
        if sub == "state":
            state = payload.get("state") if isinstance(payload, dict) else payload
            self.bridge_online = state == "online"
            self._schedule_update()
        elif sub == "info" and isinstance(payload, dict):
            self.bridge_info = payload
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
        if topic.startswith(_FORWARDED_RESPONSES):
            self._notify(
                "response",
                {
                    "topic": topic,
                    "status": payload.get("status"),
                    "error": payload.get("error"),
                    "data": payload.get("data"),
                },
            )

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
        elif kind == "device_leave":
            self._fire(EVENT_DEVICE_LEFT, {"name": name, "ieee": data.get("ieee_address")})
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
                for store in (self._states, self._availability, self._last_msg):
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

    def _apply_groups(self, groups: list[dict[str, Any]]) -> None:
        self._groups = {
            g["id"]: g for g in groups if isinstance(g, dict) and "id" in g
        }

    def _handle_availability(self, name: str, payload: Any) -> None:
        state = payload.get("state") if isinstance(payload, dict) else payload
        if state in ("online", "offline"):
            self._availability[name] = state == "online"
            self._schedule_update()

    def _is_group(self, name: str) -> bool:
        return any(g.get("friendly_name") == name for g in self._groups.values())

    def _handle_device_state(self, name: str, payload: Any) -> None:
        if not isinstance(payload, dict):
            return
        # Gruppen-Topics sind keine Geräte (sonst tauchen sie als Phantom auf)
        if self._is_group(name):
            return
        self._states.setdefault(name, {}).update(payload)
        self._last_msg[name] = dt_util.utcnow().isoformat(timespec="seconds")
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
        config = self.bridge_info.get("config")
        devices_cfg = config.get("devices") if isinstance(config, dict) else None
        if isinstance(devices_cfg, dict):
            dev_cfg = devices_cfg.get(meta.get("ieee_address"))
            if isinstance(dev_cfg, dict) and isinstance(dev_cfg.get("icon"), str):
                icon = dev_cfg["icon"]

        return {
            "ieee": meta.get("ieee_address"),
            "name": name,
            "type": meta.get("type"),
            "vendor": definition.get("vendor"),
            "model": definition.get("model") or meta.get("model_id"),
            "image_model": definition.get("model"),
            "icon": icon,
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
            "available": self._availability.get(name),
            "last_seen": last_seen,
            "bindings": self._bindings_of(meta),
            "out_clusters": self._output_clusters(meta),
            "has_options": bool(definition.get("options")),
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
        devices = [
            self._serialize(meta)
            for meta in self._meta.values()
            if meta.get("type") != "Coordinator"
        ]
        devices.sort(key=lambda d: (d["name"] or "").lower())

        low_t = self.low_battery_threshold
        crit_t = self.critical_battery_threshold
        offline = [d for d in devices if d["available"] is False]
        low = [d for d in devices if d["battery"] is not None and d["battery"] < low_t]
        critical = [
            d for d in devices if d["battery"] is not None and d["battery"] < crit_t
        ]
        available = [d for d in devices if d["ota"]["state"] == "available"]
        updating = [d for d in devices if d["ota"]["state"] == "updating"]
        groups = sorted(
            (self._serialize_group(g) for g in self._groups.values()),
            key=lambda g: (g["name"] or "").lower(),
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
        }
        self.data = {
            "bridge": {
                "online": self.bridge_online,
                "version": version,
                "compatible": major is None or major >= MIN_Z2M_MAJOR,
                "permit_join": bool(info.get("permit_join")),
                "permit_join_end": info.get("permit_join_end"),
                "restart_required": bool(info.get("restart_required")),
                "base_topic": self.base_topic,
                "coordinator_type": coordinator.get("type"),
                "coordinator_revision": meta_c.get("revision"),
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
                "groups": len(groups),
                "low_battery_threshold": low_t,
                "critical_battery_threshold": crit_t,
            },
            "jobs": dict(self.jobs),
            "app": dict(self.app),
            "events": list(self._events),
            "groups": groups,
            "devices": devices,
        }

    # ------------------------------------------------------------------
    # Ereignisse (offline / Batterie / Update / beigetreten)
    # ------------------------------------------------------------------
    def _snapshot_sets(self) -> dict[str, set[str]]:
        devices = self.data["devices"]
        low_t = self.low_battery_threshold
        return {
            "offline": {d["name"] for d in devices if d["available"] is False},
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

        config = self.bridge_info.get("config")
        devices_cfg = config.get("devices") if isinstance(config, dict) else None
        current = devices_cfg.get(ieee) if isinstance(devices_cfg, dict) else None
        current = current if isinstance(current, dict) else {}
        values = {
            s["property"]: current[s["property"]]
            for s in schema
            if s["property"] in current
        }
        return schema, values

    def device_details(self, ieee: str | None) -> dict[str, Any]:
        """Optionen-Schema + aktuelle Werte + zugehörige HA-Entitäten."""
        schema, values = self._options_schema(ieee)
        return {
            "ieee": ieee,
            "options_schema": schema,
            "options": values,
            "entities": self._entities_of(ieee),
        }

    def _entities_of(self, ieee: str | None) -> list[dict[str, str]]:
        if not ieee:
            return []
        dev_reg = dr.async_get(self.hass)
        ent_reg = er.async_get(self.hass)
        result: list[dict[str, str]] = []
        for device in dev_reg.devices.values():
            matches = any(
                domain == "mqtt" and str(ident).endswith(ieee)
                for domain, ident in device.identifiers
            )
            if not matches:
                continue
            for ent in er.async_entries_for_device(ent_reg, device.id):
                result.append(
                    {
                        "entity_id": ent.entity_id,
                        "name": ent.name or ent.original_name or "",
                    }
                )
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
        await mqtt.async_publish(
            self.hass,
            f"{self.base_topic}/bridge/request/{sub}",
            body,
            qos=0,
            retain=False,
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

    async def async_remove(self, ieee: str | None, force: bool = False) -> None:
        await self._request(
            "device/remove", {"id": self._name_of(ieee), "force": bool(force)}
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

    def _spawn(self, coro: Any, name: str) -> None:
        task = self.entry.async_create_background_task(
            self.hass, coro, f"{DOMAIN}_{name}"
        )
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def async_check_app_update(self) -> None:
        """Auf GitHub nach einer neueren Version der App suchen."""
        latest = await async_fetch_latest(self.hass)
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
