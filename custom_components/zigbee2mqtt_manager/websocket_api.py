"""WebSocket-API zwischen Lovelace-Karte und Integration."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, WS_ACTION, WS_SUBSCRIBE
from .manager import Z2MManager

ACTIONS = [
    "rename",
    "ota_check",
    "ota_update",
    "ota_check_all",
    "permit_join",
    "remove",
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
        vol.Required("type"): WS_ACTION,
        vol.Optional("entry_id"): str,
        vol.Required("action"): vol.In(ACTIONS),
        vol.Optional("ieee"): str,
        vol.Optional("value"): vol.Any(str, bool, int),
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

    try:
        if action == "rename":
            await manager.async_rename(ieee, str(value or ""))
        elif action == "ota_check":
            await manager.async_ota_check(ieee)
        elif action == "ota_update":
            await manager.async_ota_update(ieee)
        elif action == "ota_check_all":
            await manager.async_ota_check_all()
        elif action == "permit_join":
            await manager.async_permit_join(bool(value))
        elif action == "remove":
            await manager.async_remove(ieee, bool(value))
    except ValueError as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return

    connection.send_result(msg["id"])
