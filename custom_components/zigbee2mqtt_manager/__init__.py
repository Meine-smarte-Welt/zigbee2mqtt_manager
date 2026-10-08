# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 9f5ac894c5ff2f6534159c0e6e691d24798baa1324f48b740343233cc96a5124
"""Zigbee2MQTT Manager – Verwaltung von Zigbee2MQTT direkt in Home Assistant."""

from __future__ import annotations

import logging
from pathlib import Path

import voluptuous as vol

from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from .const import (
    CARD_FILENAME,
    CARD_URL_BASE,
    DOMAIN,
    SERVICE_CHECK_UPDATES,
    SERVICE_PERMIT_JOIN,
)
from .manager import Z2MConfigEntry, Z2MManager
from .websocket_api import async_register_websocket_api

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.SENSOR]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

_CARD_DIR = Path(__file__).parent / "www"
_CARD_STATIC_URL = f"{CARD_URL_BASE}/{CARD_FILENAME}"
_FRONTEND_KEY = f"{DOMAIN}_frontend_registered"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Karte ausliefern, WebSocket-Befehle und Services registrieren (einmalig)."""
    async_register_websocket_api(hass)
    _async_register_services(hass)
    await _async_register_frontend_card(hass)
    return True


# --- Mitgelieferte Lovelace-Karte -------------------------------------------
#
# Wie bei fritzbox_anrufe wird die Karte aus dem Ordner "www" ausgeliefert und
# ausschließlich über einen persistierten Lovelace-Ressourceneintrag geladen
# (kein add_extra_js_url: ein zweiter Ladeweg markiert die Modul-URL im Browser
# als "bereits behandelt", selbst wenn der Ladevorgang scheiterte).
async def _async_register_frontend_card(hass: HomeAssistant) -> None:
    if hass.data.get(_FRONTEND_KEY):
        return
    try:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(CARD_URL_BASE, str(_CARD_DIR), False)]
        )
    except RuntimeError:
        _LOGGER.debug("Statischer Pfad %s ist bereits registriert", CARD_URL_BASE)
    except Exception as err:  # noqa: BLE001
        _LOGGER.warning(
            "Statischer Pfad für die Dashboard-Karte (%s) nicht registrierbar: %s",
            CARD_URL_BASE,
            err,
        )
        return
    await _async_ensure_lovelace_resource(hass)
    hass.data[_FRONTEND_KEY] = True


async def _async_ensure_lovelace_resource(hass: HomeAssistant) -> None:
    """Lovelace-Ressource anlegen bzw. auf die aktuelle Version aktualisieren."""
    try:
        from homeassistant.components.lovelace.const import LOVELACE_DATA
    except ImportError:  # pragma: no cover - ältere HA-Versionen
        return

    lovelace_data = hass.data.get(LOVELACE_DATA)
    if lovelace_data is None:
        _LOGGER.debug(
            "Lovelace nicht gefunden – bitte %s bei Bedarf manuell als Ressource eintragen",
            _CARD_STATIC_URL,
        )
        return

    resources = lovelace_data.resources
    if not hasattr(resources, "async_create_item"):
        _LOGGER.debug(
            "Lovelace im YAML-Modus – bitte %s manuell als Ressource (Typ 'module') eintragen",
            _CARD_STATIC_URL,
        )
        return

    try:
        if not getattr(resources, "loaded", True):
            await resources.async_load()

        integration = await async_get_integration(hass, DOMAIN)
        target_url = f"{_CARD_STATIC_URL}?v={integration.version}"
        existing = next(
            (
                item
                for item in resources.async_items()
                if item.get("url", "").split("?", 1)[0] == _CARD_STATIC_URL
            ),
            None,
        )
        if existing is None:
            await resources.async_create_item({"res_type": "module", "url": target_url})
        elif existing.get("url") != target_url:
            await resources.async_update_item(
                existing["id"], {"res_type": "module", "url": target_url}
            )
    except Exception as err:  # noqa: BLE001 - darf das Setup nie verhindern
        _LOGGER.warning(
            "Konnte %s nicht automatisch als Lovelace-Ressource eintragen (%s) – "
            "bitte unter Einstellungen -> Dashboards -> Ressourcen manuell hinzufügen",
            _CARD_STATIC_URL,
            err,
        )


# --- Services ---------------------------------------------------------------
def _managers_for(hass: HomeAssistant, call: ServiceCall) -> list[Z2MManager]:
    """Geladene Instanzen, auf die sich der Aufruf bezieht (Eintrags-ID oder Base-Topic)."""
    entry_id = call.data.get("entry_id")
    base_topic = str(call.data.get("base_topic") or "").strip().strip("/")
    managers: list[Z2MManager] = []
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry_id and entry.entry_id != entry_id:
            continue
        if entry.state is not ConfigEntryState.LOADED:
            continue
        if base_topic and entry.runtime_data.base_topic != base_topic:
            continue
        managers.append(entry.runtime_data)
    if not managers:
        raise ServiceValidationError("Keine aktive Zigbee2MQTT-Manager-Instanz gefunden")
    return managers


_TARGET_SCHEMA = {
    vol.Optional("entry_id"): cv.string,
    vol.Optional("base_topic"): cv.string,
}


def _async_register_services(hass: HomeAssistant) -> None:
    async def permit_join(call: ServiceCall) -> None:
        managers = _managers_for(hass, call)
        if len(managers) > 1:
            # Pairing nie versehentlich an allen Sticks gleichzeitig öffnen
            raise ServiceValidationError(
                "Mehrere Zigbee2MQTT-Instanzen gefunden – bitte base_topic oder "
                "entry_id angeben"
            )
        seconds = call.data.get("duration")
        await managers[0].async_permit_join(call.data["enabled"], seconds)

    async def check_updates(call: ServiceCall) -> None:
        # Ohne Angabe werden alle Instanzen geprüft
        errors: list[str] = []
        for manager in _managers_for(hass, call):
            try:
                await manager.async_ota_check_all()
            except ValueError as err:
                errors.append(f"{manager.base_topic}: {err}")
        if errors:
            raise HomeAssistantError("; ".join(errors))

    hass.services.async_register(
        DOMAIN,
        SERVICE_PERMIT_JOIN,
        permit_join,
        schema=vol.Schema(
            {
                **_TARGET_SCHEMA,
                vol.Optional("enabled", default=True): cv.boolean,
                vol.Optional("duration"): vol.All(
                    vol.Coerce(int), vol.Range(min=10, max=254)
                ),
            }
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_CHECK_UPDATES,
        check_updates,
        schema=vol.Schema({**_TARGET_SCHEMA}),
    )


# --- Config Entry -----------------------------------------------------------
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
