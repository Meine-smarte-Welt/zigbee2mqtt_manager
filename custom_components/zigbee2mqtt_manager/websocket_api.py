# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 98db3e4da4c7b391bb4ad84794085e80ed790815d309e7822132c3b6c96416d0
"""WebSocket-API zwischen Lovelace-Karte und Integration."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, WS_ACTION, WS_SUBSCRIBE
from .manager import Z2MManager
from .nc_catalog import NC_TYPE_IDS

WS_DETAILS = f"{DOMAIN}/details"
WS_INSTANCES = f"{DOMAIN}/instances"

ACTIONS = [
    # Geräte
    "rename",
    "set_options",
    "set_comment",
    "set_expose",
    "remove",
    "forget_missing",
    "forget_missing_all",
    # Firmware
    "ota_check",
    "ota_update",
    "ota_check_all",
    "ota_update_all",
    "ota_cancel",
    # Bridge
    "permit_join",
    "restart",
    "bridge_option",
    "app_update_check",
    # Notification Center (optional)
    "nc_set_master",
    "nc_set_type",
    # Gruppen
    "group_add",
    "group_rename",
    "group_remove",
    "group_member_add",
    "group_member_remove",
    # Bindings
    "bind",
    "unbind",
]


def _get_manager(
    hass: HomeAssistant, entry_id: str | None, base_topic: str | None = None
) -> Z2MManager | None:
    """Instanz nach Eintrags-ID oder Base-Topic wählen (ohne Angabe: die erste geladene)."""
    wanted_topic = (base_topic or "").strip().strip("/")
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry_id and entry.entry_id != entry_id:
            continue
        if entry.state is not ConfigEntryState.LOADED:
            continue
        if wanted_topic and entry.runtime_data.base_topic != wanted_topic:
            continue
        return entry.runtime_data
    return None


@callback
def async_register_websocket_api(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_subscribe)
    websocket_api.async_register_command(hass, ws_action)
    websocket_api.async_register_command(hass, ws_details)
    websocket_api.async_register_command(hass, ws_instances)


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_SUBSCRIBE,
        vol.Optional("entry_id"): str,
        vol.Optional("base_topic"): str,
    }
)
@websocket_api.async_response
async def ws_subscribe(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Live-Daten abonnieren (Snapshot + Updates + Bridge-Antworten)."""
    manager = _get_manager(hass, msg.get("entry_id"), msg.get("base_topic"))
    if manager is None:
        connection.send_error(
            msg["id"], "not_found", "Keine aktive Zigbee2MQTT-Manager-Instanz"
        )
        return

    @callback
    def forward(kind: str, payload: Any) -> None:
        connection.send_message(
            websocket_api.event_message(msg["id"], {"kind": kind, "data": payload})
        )

    connection.subscriptions[msg["id"]] = manager.async_add_listener(forward)
    connection.send_result(msg["id"])
    forward("update", manager.data)


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_DETAILS,
        vol.Optional("entry_id"): str,
        vol.Optional("base_topic"): str,
        vol.Required("ieee"): str,
    }
)
@websocket_api.async_response
async def ws_details(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Optionen-Schema, aktuelle Werte und HA-Entitäten eines Geräts."""
    manager = _get_manager(hass, msg.get("entry_id"), msg.get("base_topic"))
    if manager is None:
        connection.send_error(
            msg["id"], "not_found", "Keine aktive Zigbee2MQTT-Manager-Instanz"
        )
        return
    try:
        connection.send_result(msg["id"], manager.device_details(msg["ieee"]))
    except ValueError as err:
        connection.send_error(msg["id"], "invalid", str(err))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_ACTION,
        vol.Optional("entry_id"): str,
        vol.Optional("base_topic"): str,
        vol.Required("action"): vol.In(ACTIONS),
        vol.Optional("ieee"): str,
        vol.Optional("group_id"): vol.Any(int, str),
        vol.Optional("target"): str,
        vol.Optional("clusters"): [str],
        vol.Optional("key"): str,
        vol.Optional("value"): vol.Any(str, bool, int, float, dict),
        vol.Optional("enabled"): bool,
        vol.Optional("nc_type"): vol.In(NC_TYPE_IDS),
    }
)
@websocket_api.async_response
async def ws_action(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Schreibende Aktionen (nur Administratoren)."""
    manager = _get_manager(hass, msg.get("entry_id"), msg.get("base_topic"))
    if manager is None:
        connection.send_error(
            msg["id"], "not_found", "Keine aktive Zigbee2MQTT-Manager-Instanz"
        )
        return

    action = msg["action"]
    ieee = msg.get("ieee")
    value = msg.get("value")
    group_id = msg.get("group_id")

    try:
        if action == "rename":
            await manager.async_rename(ieee, str(value or ""))
        elif action == "set_comment":
            await manager.async_set_comment(ieee, value)
        elif action == "set_options":
            await manager.async_set_options(ieee, value)
        elif action == "set_expose":
            await manager.async_set_expose(ieee, msg.get("key"), value)
        elif action == "remove":
            await manager.async_remove(ieee, bool(value))
        elif action == "forget_missing":
            await manager.async_forget_missing(ieee)
        elif action == "forget_missing_all":
            await manager.async_forget_missing()
        elif action == "ota_check":
            await manager.async_ota_check(ieee)
        elif action == "ota_update":
            await manager.async_ota_update(ieee)
        elif action == "ota_check_all":
            await manager.async_ota_check_all()
        elif action == "ota_update_all":
            await manager.async_ota_update_all()
        elif action == "ota_cancel":
            await manager.async_ota_cancel()
        elif action == "permit_join":
            await manager.async_permit_join(bool(value))
        elif action == "restart":
            await manager.async_restart()
        elif action == "bridge_option":
            await manager.async_set_bridge_option(msg.get("key", ""), value)
        elif action == "app_update_check":
            await manager.async_check_app_update(force=True)
        elif action == "nc_set_master":
            await manager.async_nc_set_master(msg.get("enabled"))
        elif action == "nc_set_type":
            await manager.async_nc_set_type(msg.get("nc_type"), msg.get("enabled"))
        elif action == "group_add":
            await manager.async_group_add(str(value or ""))
        elif action == "group_rename":
            await manager.async_group_rename(group_id, str(value or ""))
        elif action == "group_remove":
            await manager.async_group_remove(group_id)
        elif action in ("group_member_add", "group_member_remove"):
            await manager.async_group_member(
                group_id, ieee, action == "group_member_add"
            )
        elif action in ("bind", "unbind"):
            await manager.async_bind(
                ieee, msg.get("target"), msg.get("clusters"), action == "bind"
            )
    except ValueError as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return

    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): WS_INSTANCES})
@callback
def ws_instances(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Alle eingerichteten Zigbee2MQTT-Instanzen (für die Auswahl in Karte und Editor)."""
    instances: list[dict[str, Any]] = []
    for entry in hass.config_entries.async_entries(DOMAIN):
        loaded = entry.state is ConfigEntryState.LOADED
        manager = entry.runtime_data if loaded else None
        instances.append(
            {
                "entry_id": entry.entry_id,
                "title": entry.title,
                "base_topic": entry.data.get("base_topic"),
                "loaded": loaded,
                "online": manager.bridge_online if manager else None,
                "devices": manager.data["stats"]["total"] if manager else None,
            }
        )
    instances.sort(key=lambda i: (i["base_topic"] or "").lower())
    connection.send_result(msg["id"], instances)
