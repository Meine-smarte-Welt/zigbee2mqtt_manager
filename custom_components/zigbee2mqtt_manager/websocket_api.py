# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): a545f1cd06deb95f2f207d4bedcd90336e51a2978b04649b2cd7884cdfc15cc1
"""WebSocket-API zwischen Lovelace-Karte und Integration."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, WS_ACTION, WS_SUBSCRIBE
from .manager import Z2MManager

WS_DETAILS = f"{DOMAIN}/details"

ACTIONS = [
    # Geräte
    "rename",
    "set_options",
    "remove",
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


def _get_manager(hass: HomeAssistant, entry_id: str | None) -> Z2MManager | None:
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry_id and entry.entry_id != entry_id:
            continue
        if entry.state is ConfigEntryState.LOADED:
            return entry.runtime_data
    return None


@callback
def async_register_websocket_api(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_subscribe)
    websocket_api.async_register_command(hass, ws_action)
    websocket_api.async_register_command(hass, ws_details)


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_SUBSCRIBE,
        vol.Optional("entry_id"): str,
    }
)
@websocket_api.async_response
async def ws_subscribe(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Live-Daten abonnieren (Snapshot + Updates + Bridge-Antworten)."""
    manager = _get_manager(hass, msg.get("entry_id"))
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
        vol.Required("ieee"): str,
    }
)
@websocket_api.async_response
async def ws_details(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Optionen-Schema, aktuelle Werte und HA-Entitäten eines Geräts."""
    manager = _get_manager(hass, msg.get("entry_id"))
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
        vol.Required("action"): vol.In(ACTIONS),
        vol.Optional("ieee"): str,
        vol.Optional("group_id"): vol.Any(int, str),
        vol.Optional("target"): str,
        vol.Optional("clusters"): [str],
        vol.Optional("key"): str,
        vol.Optional("value"): vol.Any(str, bool, int, float, dict),
    }
)
@websocket_api.async_response
async def ws_action(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Schreibende Aktionen (nur Administratoren)."""
    manager = _get_manager(hass, msg.get("entry_id"))
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
        elif action == "set_options":
            await manager.async_set_options(ieee, value)
        elif action == "remove":
            await manager.async_remove(ieee, bool(value))
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
            await manager.async_check_app_update()
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
