"""Zigbee2MQTT Manager – Verwaltung von Zigbee2MQTT direkt in Home Assistant."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import CARD_FILENAME, DOMAIN, URL_BASE, VERSION
from .manager import Z2MConfigEntry, Z2MManager
from .websocket_api import async_register_websocket_api

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.SENSOR]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Karte ausliefern und WebSocket-Befehle registrieren (einmalig)."""
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                URL_BASE, str(Path(__file__).parent / "frontend"), cache_headers=False
            )
        ]
    )
    # Karte wird automatisch geladen – keine manuelle Ressource nötig
    add_extra_js_url(hass, f"{URL_BASE}/{CARD_FILENAME}?v={VERSION}")
    async_register_websocket_api(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: Z2MConfigEntry) -> bool:
    manager = Z2MManager(hass, entry)
    await manager.async_start()
    entry.runtime_data = manager

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload_on_options))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: Z2MConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        entry.runtime_data.async_stop()
    return unloaded


async def _async_reload_on_options(hass: HomeAssistant, entry: Z2MConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)
