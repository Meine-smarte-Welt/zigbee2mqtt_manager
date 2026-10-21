# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): e12809a5f29cb9858bbf1395f397f02cfb79e2e3b04f81e56663c39d1e99f752
"""Zigbee2MQTT Manager – Verwaltung von Zigbee2MQTT direkt in Home Assistant."""

from __future__ import annotations

import logging
from pathlib import Path

import voluptuous as vol

from homeassistant.components import frontend, persistent_notification
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from .const import (
    CONF_SIDEBAR_PANEL,
    CONF_SIDEBAR_TITLE,
    CONF_WELCOME_SHOWN,
    CARD_FILENAME,
    CARD_URL_BASE,
    DEFAULT_SIDEBAR_PANEL,
    DEFAULT_SIDEBAR_TITLE,
    DOMAIN,
    MAX_SIDEBAR_TITLE,
    PANEL_ELEMENT,
    PANEL_FILENAME,
    PANEL_URL_PATH,
    SERVICE_CHECK_UPDATES,
    SERVICE_PERMIT_JOIN,
    clean_title,
)
from .manager import Z2MConfigEntry, Z2MManager
from .websocket_api import async_register_websocket_api

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.SENSOR, Platform.BINARY_SENSOR]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

_DASHBOARDS = "https://my.home-assistant.io/redirect/lovelace_dashboards/"
_WELCOME = {
    "de": (
        "Zigbee2MQTT Manager ist eingerichtet",
        "Die Karte ist sofort in der Seitenleiste unter **{title}** erreichbar (Name und Anzeige änderbar unter *Konfigurieren*). Für ein eigenes Dashboard: **Dashboard bearbeiten → Karte hinzufügen → „Zigbee2MQTT Manager“**.\n\n"
        f"[Dashboards öffnen]({_DASHBOARDS}) · Eine fertige Dashboard-Vorlage steht in der README (Ordner `examples`).\n\n"
        "Für die Leitseite gibt es den Sensor „Störung“ (Binärsensor) mit allen Zählern als Attribute.",
    ),
    "en": (
        "Zigbee2MQTT Manager is set up",
        "The card is available right away in the sidebar under **{title}** (name and visibility can be changed under *Configure*). For your own dashboard: **Edit dashboard → Add card → “Zigbee2MQTT Manager”**.\n\n"
        f"[Open dashboards]({_DASHBOARDS}) · A ready-made dashboard template is in the README (folder `examples`).\n\n"
        "For your home page there is the “Problem” binary sensor with all counters as attributes.",
    ),
    "nl": (
        "Zigbee2MQTT Manager is ingesteld",
        "De kaart is meteen beschikbaar in de zijbalk onder **{title}** (naam en weergave aan te passen onder *Configureren*). Voor een eigen dashboard: **Dashboard bewerken → Kaart toevoegen → „Zigbee2MQTT Manager”**.\n\n"
        f"[Dashboards openen]({_DASHBOARDS}) · Een kant-en-klare dashboardsjabloon staat in de README (map `examples`).\n\n"
        "Voor je startpagina is er de binaire sensor „Storing” met alle tellers als attributen.",
    ),
    "fr": (
        "Zigbee2MQTT Manager est configuré",
        "La carte est disponible tout de suite dans la barre latérale sous **{title}** (nom et affichage modifiables sous *Configurer*). Pour ton propre tableau de bord : **Modifier le tableau de bord → Ajouter une carte → « Zigbee2MQTT Manager »**.\n\n"
        f"[Ouvrir les tableaux de bord]({_DASHBOARDS}) · Un modèle de tableau de bord prêt à l'emploi se trouve dans le README (dossier `examples`).\n\n"
        "Pour ta page d'accueil, il y a le capteur binaire « Problème » avec tous les compteurs en attributs.",
    ),
    "es": (
        "Zigbee2MQTT Manager está configurado",
        "La tarjeta está disponible enseguida en la barra lateral bajo **{title}** (nombre y visibilidad modificables en *Configurar*). Para tu propio panel: **Editar panel → Añadir tarjeta → «Zigbee2MQTT Manager»**.\n\n"
        f"[Abrir paneles]({_DASHBOARDS}) · Una plantilla de panel lista para usar está en el README (carpeta `examples`).\n\n"
        "Para tu página de inicio existe el sensor binario «Problema» con todos los contadores como atributos.",
    ),
    "sr": (
        "Zigbee2MQTT Manager је подешен",
        "Картица је одмах доступна у бочној траци под називом **{title}** (назив и приказ се мењају у *Подешавања*). За сопствену контролну таблу: **Уреди таблу → Додај картицу → „Zigbee2MQTT Manager“**.\n\n"
        f"[Отвори контролне табле]({_DASHBOARDS}) · Готов шаблон табле налази се у README (фолдер `examples`).\n\n"
        "За почетну страницу постоји бинарни сензор „Сметња“ са свим бројачима као атрибутима.",
    ),
    "sr-Latn": (
        "Zigbee2MQTT Manager je podešen",
        "Kartica je odmah dostupna u bočnoj traci pod nazivom **{title}** (naziv i prikaz se menjaju u *Podešavanja*). Za sopstvenu kontrolnu tablu: **Uredi tablu → Dodaj karticu → „Zigbee2MQTT Manager“**.\n\n"
        f"[Otvori kontrolne table]({_DASHBOARDS}) · Gotov šablon table nalazi se u README (folder `examples`).\n\n"
        "Za početnu stranicu postoji binarni senzor „Smetnja“ sa svim brojačima kao atributima.",
    ),
}

_CARD_DIR = Path(__file__).parent / "www"
_CARD_STATIC_URL = f"{CARD_URL_BASE}/{CARD_FILENAME}"
_FRONTEND_KEY = f"{DOMAIN}_frontend_registered"
_PANEL_KEY = f"{DOMAIN}_panel_registered"
_PANEL_TITLE_KEY = f"{DOMAIN}_panel_title"


def _language_key(hass: HomeAssistant) -> str:
    """Sprachschlüssel der eigenen Texte: "sr-Latn" bleibt erhalten, sonst nur der Sprachteil."""
    raw = str(hass.config.language)
    return "sr-Latn" if raw.lower().replace("_", "-").startswith("sr-latn") else raw[:2]


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
    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    _async_welcome(hass, entry)
    await _async_sync_panel(hass)
    return True


# --- Seitenleisten-Eintrag (eigene Seite mit der Karte) -----------------------
#
# Home Assistant bietet Integrationen keine öffentliche Schnittstelle, um ein
# Lovelace-Dashboard anzulegen. Öffentlich und stabil ist dagegen ein eigenes Panel:
# Es erscheint in der Seitenleiste und zeigt die Karte als ganze Seite, ohne dass ein
# Dashboard gebaut werden muss. Abschaltbar unter "Konfigurieren".
def _panel_wanted(hass: HomeAssistant) -> bool:
    active = (ConfigEntryState.LOADED, ConfigEntryState.SETUP_IN_PROGRESS)
    return any(
        entry.options.get(CONF_SIDEBAR_PANEL, DEFAULT_SIDEBAR_PANEL)
        for entry in hass.config_entries.async_entries(DOMAIN)
        if entry.state in active
    )


def _panel_title(hass: HomeAssistant) -> str:
    """Beschriftung des Seitenleisten-Eintrags: die erste eigene Angabe, sonst der Standard."""
    active = (ConfigEntryState.LOADED, ConfigEntryState.SETUP_IN_PROGRESS)
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state in active and entry.options.get(CONF_SIDEBAR_PANEL, DEFAULT_SIDEBAR_PANEL):
            return clean_title(
                entry.options.get(CONF_SIDEBAR_TITLE), DEFAULT_SIDEBAR_TITLE, MAX_SIDEBAR_TITLE
            )
    return DEFAULT_SIDEBAR_TITLE


async def _async_sync_panel(hass: HomeAssistant) -> None:
    """Seitenleisten-Eintrag anlegen oder entfernen, je nach Optionen der geladenen Einträge."""
    registered = bool(hass.data.get(_PANEL_KEY))
    wanted = _panel_wanted(hass) and bool(hass.data.get(_FRONTEND_KEY))
    title = _panel_title(hass)
    try:
        # Neu anlegen, wenn noch nicht vorhanden oder sich der Name geändert hat
        if wanted and (not registered or hass.data.get(_PANEL_TITLE_KEY) != title):
            integration = await async_get_integration(hass, DOMAIN)
            version = integration.version
            frontend.async_register_built_in_panel(
                hass,
                component_name="custom",
                sidebar_title=title,
                sidebar_icon="mdi:zigbee",
                frontend_url_path=PANEL_URL_PATH,
                config={
                    "title": title,
                    "card_url": f"{_CARD_STATIC_URL}?v={version}",
                    "_panel_custom": {
                        "name": PANEL_ELEMENT,
                        "embed_iframe": False,
                        "trust_external": False,
                        "module_url": f"{CARD_URL_BASE}/{PANEL_FILENAME}?v={version}",
                    },
                },
                require_admin=True,
                update=True,
            )
            hass.data[_PANEL_KEY] = True
            hass.data[_PANEL_TITLE_KEY] = title
        elif registered and not wanted:
            frontend.async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)
            hass.data[_PANEL_KEY] = False
    except Exception as err:  # noqa: BLE001 - darf das Setup nie verhindern
        _LOGGER.warning("Seitenleisten-Eintrag nicht anlegbar oder entfernbar: %s", err)


def _async_welcome(hass: HomeAssistant, entry: Z2MConfigEntry) -> None:
    """Einmalig nach der Einrichtung: Hinweis, wie die Karte ins Dashboard kommt."""
    if entry.data.get(CONF_WELCOME_SHOWN):
        return
    lang = _language_key(hass)
    title, message = _WELCOME.get(lang, _WELCOME["en"])
    panel_title = clean_title(
        entry.options.get(CONF_SIDEBAR_TITLE), DEFAULT_SIDEBAR_TITLE, MAX_SIDEBAR_TITLE
    )
    persistent_notification.async_create(
        hass, message.replace("{title}", panel_title), title=title, notification_id=f"{DOMAIN}_welcome_{entry.entry_id}"
    )
    # Reine Datenänderung: lädt die Integration nicht neu (nur Optionen tun das)
    hass.config_entries.async_update_entry(entry, data={**entry.data, CONF_WELCOME_SHOWN: True})


async def async_unload_entry(hass: HomeAssistant, entry: Z2MConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        entry.runtime_data.async_stop()
        await _async_sync_panel(hass)
    return unloaded


async def _async_options_updated(hass: HomeAssistant, entry: Z2MConfigEntry) -> None:
    """Optionen geändert: bei Schaltern des Notification Centers nur neu anmelden, sonst neu laden."""
    manager = entry.runtime_data
    await _async_sync_panel(hass)
    if manager.core_options_changed():
        await hass.config_entries.async_reload(entry.entry_id)
    else:
        manager.async_nc_options_changed()
