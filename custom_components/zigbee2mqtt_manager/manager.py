"""Hält den Zustand der Zigbee2MQTT-Bridge und sendet Befehle per MQTT."""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from homeassistant.components import mqtt
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers.event import async_call_later
from homeassistant.util import dt as dt_util

from .const import (
    CONF_BASE_TOPIC,
    CONF_LOW_BATTERY,
    DEFAULT_LOW_BATTERY,
    FLUSH_DELAY,
    OTA_CHECK_SPACING,
    PERMIT_JOIN_SECONDS,
)

_LOGGER = logging.getLogger(__name__)

Listener = Callable[[str, Any], None]

# Antworten der Bridge, die an die Karte weitergereicht werden (Toasts)
_FORWARDED_RESPONSES = ("device/", "permit_join")


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


class Z2MManager:
    """Zustand + Befehle für eine Zigbee2MQTT-Instanz."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.base_topic: str = entry.data[CONF_BASE_TOPIC].strip("/")
        self._prefix = f"{self.base_topic}/"

        self.bridge_online: bool | None = None
        self.bridge_info: dict[str, Any] = {}

        # Alles nach friendly_name, außer Metadaten (nach IEEE-Adresse)
        self._meta: dict[str, dict[str, Any]] = {}
        self._states: dict[str, dict[str, Any]] = {}
        self._availability: dict[str, bool] = {}
        self._last_msg: dict[str, str] = {}

        self._listeners: list[Listener] = []
        self._unsubs: list[CALLBACK_TYPE] = []
        self._flush_unsub: CALLBACK_TYPE | None = None

        self.data: dict[str, Any] = {}
        self.details: dict[str, list[str]] = {}
        self._rebuild()

    # ------------------------------------------------------------------
    # Lebenszyklus
    # ------------------------------------------------------------------
    @property
    def low_battery_threshold(self) -> int:
        return int(self.entry.options.get(CONF_LOW_BATTERY, DEFAULT_LOW_BATTERY))

    async def async_start(self) -> None:
        if not await mqtt.async_wait_for_mqtt_client(self.hass):
            raise ConfigEntryNotReady("MQTT ist nicht verfügbar")
        self._unsubs.append(
            await mqtt.async_subscribe(
                self.hass, f"{self.base_topic}/#", self._handle_message
            )
        )

    @callback
    def async_stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        if self._flush_unsub:
            self._flush_unsub()
            self._flush_unsub = None
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
        self._notify("update", self.data)

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
        elif sub.startswith("response/"):
            topic = sub[len("response/") :]
            if topic.startswith(_FORWARDED_RESPONSES) and isinstance(payload, dict):
                self._notify(
                    "response",
                    {
                        "topic": topic,
                        "status": payload.get("status"),
                        "error": payload.get("error"),
                        "data": payload.get("data"),
                    },
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

    def _handle_availability(self, name: str, payload: Any) -> None:
        state = payload.get("state") if isinstance(payload, dict) else payload
        if state in ("online", "offline"):
            self._availability[name] = state == "online"
            self._schedule_update()

    def _handle_device_state(self, name: str, payload: Any) -> None:
        if not isinstance(payload, dict):
            return
        self._states.setdefault(name, {}).update(payload)
        self._last_msg[name] = dt_util.utcnow().isoformat(timespec="seconds")
        self._schedule_update()

    # ------------------------------------------------------------------
    # Datenmodell für Karte + Sensoren
    # ------------------------------------------------------------------
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

        return {
            "ieee": meta.get("ieee_address"),
            "name": name,
            "type": meta.get("type"),
            "vendor": definition.get("vendor"),
            "model": definition.get("model") or meta.get("model_id"),
            "description": definition.get("description"),
            "power_source": meta.get("power_source"),
            "network_address": meta.get("network_address"),
            "supported": meta.get("supported", True),
            "disabled": meta.get("disabled", False),
            "sw_build_id": meta.get("software_build_id"),
            "battery": _num(state.get("battery")),
            "voltage": _num(state.get("voltage")),
            "linkquality": _num(state.get("linkquality")),
            "available": self._availability.get(name),
            "last_seen": last_seen,
            "ota": {
                "capable": bool(definition.get("supports_ota")) or upd is not None,
                "state": ota_state,
                "installed": upd.get("installed_version") if upd else None,
                "latest": upd.get("latest_version") if upd else None,
                "progress": _num(upd.get("progress")) if upd else None,
                "remaining": _num(upd.get("remaining")) if upd else None,
            },
        }

    def _rebuild(self) -> None:
        devices = [
            self._serialize(meta)
            for meta in self._meta.values()
            if meta.get("type") != "Coordinator"
        ]
        devices.sort(key=lambda d: (d["name"] or "").lower())

        threshold = self.low_battery_threshold
        offline = [d for d in devices if d["available"] is False]
        low = [
            d for d in devices if d["battery"] is not None and d["battery"] < threshold
        ]
        available = [d for d in devices if d["ota"]["state"] == "available"]
        updating = [d for d in devices if d["ota"]["state"] == "updating"]

        info = self.bridge_info
        self.details = {
            "offline": [d["name"] for d in offline],
            "low_battery": [d["name"] for d in low],
            "updates_available": [d["name"] for d in available],
        }
        self.data = {
            "bridge": {
                "online": self.bridge_online,
                "version": info.get("version"),
                "permit_join": bool(info.get("permit_join")),
                "permit_join_end": info.get("permit_join_end"),
                "base_topic": self.base_topic,
            },
            "stats": {
                "total": len(devices),
                "offline": len(offline),
                "low_battery": len(low),
                "updates_available": len(available),
                "updating": len(updating),
                "low_battery_threshold": threshold,
            },
            "devices": devices,
        }

    # ------------------------------------------------------------------
    # Befehle
    # ------------------------------------------------------------------
    def _name_of(self, ieee: str | None) -> str:
        meta = self._meta.get(ieee or "")
        if not meta:
            raise ValueError(f"Unbekanntes Gerät: {ieee}")
        return meta["friendly_name"]

    async def _request(self, sub: str, payload: dict[str, Any]) -> None:
        await mqtt.async_publish(
            self.hass,
            f"{self.base_topic}/bridge/request/{sub}",
            json.dumps(payload),
            qos=0,
            retain=False,
        )

    async def async_rename(self, ieee: str | None, new_name: str) -> None:
        old_name = self._name_of(ieee)
        new_name = new_name.strip()
        if not new_name:
            raise ValueError("Der neue Name darf nicht leer sein")
        if new_name != old_name and any(
            m.get("friendly_name") == new_name for m in self._meta.values()
        ):
            raise ValueError(f"Name bereits vergeben: {new_name}")
        await self._request(
            "device/rename",
            {"from": old_name, "to": new_name, "homeassistant_rename": True},
        )

    async def async_ota_check(self, ieee: str | None) -> None:
        await self._request("device/ota_update/check", {"id": self._name_of(ieee)})

    async def async_ota_update(self, ieee: str | None) -> None:
        await self._request("device/ota_update/update", {"id": self._name_of(ieee)})

    async def async_ota_check_all(self) -> None:
        for device in list(self.data["devices"]):
            if not device["ota"]["capable"]:
                continue
            await self._request("device/ota_update/check", {"id": device["name"]})
            await asyncio.sleep(OTA_CHECK_SPACING)

    async def async_permit_join(self, enabled: bool) -> None:
        await self._request(
            "permit_join", {"time": PERMIT_JOIN_SECONDS if enabled else 0}
        )

    async def async_remove(self, ieee: str | None, force: bool = False) -> None:
        await self._request(
            "device/remove", {"id": self._name_of(ieee), "force": bool(force)}
        )


type Z2MConfigEntry = ConfigEntry[Z2MManager]
