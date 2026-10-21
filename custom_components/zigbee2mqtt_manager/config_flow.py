# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 72b225b512eb3607a366ff7cda4c1e36a9238835089ca0b7b7c172ccc3cfd8c3
"""Config Flow für Zigbee2MQTT Manager."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import mqtt
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers import config_validation as cv

from .const import (
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
    DEFAULT_BASE_TOPIC,
    DEFAULT_CRITICAL_BATTERY,
    DEFAULT_FIRE_EVENTS,
    DEFAULT_LOW_BATTERY,
    DEFAULT_PROBLEM_STALE,
    DEFAULT_PROBLEM_UPDATES,
    DEFAULT_SIDEBAR_PANEL,
    DEFAULT_SIDEBAR_TITLE,
    DEFAULT_STALE_HOURS,
    DOMAIN,
    MAX_SIDEBAR_TITLE,
    VERSION,
    clean_title,
    valid_link,
)
from .nc_catalog import NC_TYPE_IDS, nc_type_labels
from .notification_bridge import OPT_ENABLED as NC_OPT_ENABLED
from .notification_bridge import OPT_TYPES as NC_OPT_TYPES

_BATTERY_VALIDATOR = vol.All(vol.Coerce(int), vol.Range(min=1, max=99))
_STALE_VALIDATOR = vol.All(vol.Coerce(int), vol.Range(min=0, max=720))


def _valid_topic(base: str) -> bool:
    return bool(base) and "#" not in base and "+" not in base


def _overlaps_other_entry(
    flow: ConfigFlow, base: str, exclude_entry_id: str | None = None
) -> bool:
    """True, wenn ein Base-Topic in einem anderen verschachtelt ist.

    Mehrere Sticks brauchen getrennte Base-Topics. Liegt eines unter dem anderen
    (z. B. "zigbee2mqtt" und "zigbee2mqtt/stick2"), würde die erste Instanz die
    Nachrichten der zweiten mitlesen.
    """
    for entry in flow.hass.config_entries.async_entries(DOMAIN):
        if entry.entry_id == exclude_entry_id:
            continue
        other = str(entry.data.get(CONF_BASE_TOPIC, "")).strip("/")
        if other and (
            base.startswith(f"{other}/") or other.startswith(f"{base}/")
        ):
            return True
    return False


class Z2MManagerConfigFlow(ConfigFlow, domain=DOMAIN):
    """Einrichtung: Base-Topic der Zigbee2MQTT-Instanz."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return Z2MManagerOptionsFlow()

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}

        if user_input is not None:
            base = user_input[CONF_BASE_TOPIC].strip().strip("/")
            if not _valid_topic(base):
                errors[CONF_BASE_TOPIC] = "invalid_topic"
            elif _overlaps_other_entry(self, base):
                errors[CONF_BASE_TOPIC] = "topic_overlap"
            else:
                await self.async_set_unique_id(base)
                self._abort_if_unique_id_configured()
                if not await mqtt.async_wait_for_mqtt_client(self.hass):
                    return self.async_abort(reason="mqtt_unavailable")
                return self.async_create_entry(
                    title=f"Zigbee2MQTT Manager ({base})",
                    data={CONF_BASE_TOPIC: base},
                    options={
                        CONF_LOW_BATTERY: user_input[CONF_LOW_BATTERY],
                        CONF_CRITICAL_BATTERY: min(
                            DEFAULT_CRITICAL_BATTERY, user_input[CONF_LOW_BATTERY]
                        ),
                        CONF_FIRE_EVENTS: DEFAULT_FIRE_EVENTS,
                    },
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_BASE_TOPIC, default=DEFAULT_BASE_TOPIC): str,
                    vol.Required(
                        CONF_LOW_BATTERY, default=DEFAULT_LOW_BATTERY
                    ): _BATTERY_VALIDATOR,
                }
            ),
            errors=errors,
        )

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Base-Topic nachträglich ändern."""
        entry = self._get_reconfigure_entry()
        errors: dict[str, str] = {}

        if user_input is not None:
            base = user_input[CONF_BASE_TOPIC].strip().strip("/")
            if not _valid_topic(base):
                errors[CONF_BASE_TOPIC] = "invalid_topic"
            elif _overlaps_other_entry(self, base, entry.entry_id):
                errors[CONF_BASE_TOPIC] = "topic_overlap"
            else:
                await self.async_set_unique_id(base)
                self._abort_if_unique_id_mismatch(reason="already_configured")
                return self.async_update_reload_and_abort(
                    entry,
                    unique_id=base,
                    title=f"Zigbee2MQTT Manager ({base})",
                    data_updates={CONF_BASE_TOPIC: base},
                )

        return self.async_show_form(
            step_id="reconfigure",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_BASE_TOPIC, default=entry.data[CONF_BASE_TOPIC]
                    ): str
                }
            ),
            errors=errors,
        )


class Z2MManagerOptionsFlow(OptionsFlow):
    """Nachträglich änderbar: Batterie-Schwellen, Ereignisse und Notification Center."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            network_url = str(user_input.get(CONF_NETWORK_URL) or "").strip()
            if user_input[CONF_CRITICAL_BATTERY] > user_input[CONF_LOW_BATTERY]:
                errors[CONF_CRITICAL_BATTERY] = "critical_above_low"
            elif network_url and not valid_link(network_url):
                errors[CONF_NETWORK_URL] = "invalid_url"
            else:
                chosen = set(user_input.get(NC_OPT_TYPES, []))
                # Bestehende Optionen bleiben erhalten; die Meldungsarten werden als {Art: an/aus} gespeichert
                data = {
                    **self.config_entry.options,
                    **user_input,
                    # Leere Felder werden vom Formular weggelassen: bewusst leer = Standard
                    CONF_SIDEBAR_TITLE: clean_title(
                        user_input.get(CONF_SIDEBAR_TITLE), DEFAULT_SIDEBAR_TITLE, MAX_SIDEBAR_TITLE
                    ),
                    CONF_NETWORK_URL: network_url,
                    NC_OPT_TYPES: {t: t in chosen for t in NC_TYPE_IDS},
                }
                return self.async_create_entry(data=data)

        opts = self.config_entry.options
        manager = getattr(self.config_entry, "runtime_data", None)
        app = getattr(manager, "app", None) or {}
        raw_lang = str(self.hass.config.language)
        lang = "sr-Latn" if raw_lang.lower().replace("_", "-").startswith("sr-latn") else raw_lang[:2]
        latest = app.get("latest_version")
        link = app.get("release_url")
        if app.get("update_available"):
            update_info = {
                "de": f"⚠️ Neue Version verfügbar: **{latest}** – {link}",
                "nl": f"⚠️ Nieuwe versie beschikbaar: **{latest}** – {link}",
                "fr": f"⚠️ Nouvelle version disponible : **{latest}** – {link}",
                "es": f"⚠️ Nueva versión disponible: **{latest}** – {link}",
                "sr": f"⚠️ Доступна је нова верзија: **{latest}** – {link}",
                "sr-Latn": f"⚠️ Dostupna je nova verzija: **{latest}** – {link}",
            }.get(lang, f"⚠️ New version available: **{latest}** – {link}")
        elif latest:
            update_info = {
                "de": "✅ Aktuell",
                "nl": "✅ Actueel",
                "fr": "✅ À jour",
                "es": "✅ Actualizado",
                "sr": "✅ Ажурно",
                "sr-Latn": "✅ Ažurno",
            }.get(lang, "✅ Up to date")
        else:
            update_info = ""
        nc_chosen = opts.get(NC_OPT_TYPES, {})
        nc_chosen = nc_chosen if isinstance(nc_chosen, dict) else {}
        return self.async_show_form(
            step_id="init",
            description_placeholders={
                "version": app.get("version") or VERSION,
                "base_topic": getattr(manager, "base_topic", None)
                or self.config_entry.data.get(CONF_BASE_TOPIC, ""),
                "update_info": update_info,
            },
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_LOW_BATTERY,
                        default=opts.get(CONF_LOW_BATTERY, DEFAULT_LOW_BATTERY),
                    ): _BATTERY_VALIDATOR,
                    vol.Required(
                        CONF_CRITICAL_BATTERY,
                        default=opts.get(
                            CONF_CRITICAL_BATTERY, DEFAULT_CRITICAL_BATTERY
                        ),
                    ): _BATTERY_VALIDATOR,
                    vol.Required(
                        CONF_FIRE_EVENTS,
                        default=opts.get(CONF_FIRE_EVENTS, DEFAULT_FIRE_EVENTS),
                    ): bool,
                    vol.Required(
                        CONF_STALE_HOURS,
                        default=opts.get(CONF_STALE_HOURS, DEFAULT_STALE_HOURS),
                    ): _STALE_VALIDATOR,
                    vol.Required(
                        CONF_PROBLEM_UPDATES,
                        default=opts.get(CONF_PROBLEM_UPDATES, DEFAULT_PROBLEM_UPDATES),
                    ): bool,
                    vol.Required(
                        CONF_PROBLEM_STALE,
                        default=opts.get(CONF_PROBLEM_STALE, DEFAULT_PROBLEM_STALE),
                    ): bool,
                    vol.Required(
                        CONF_SIDEBAR_PANEL,
                        default=opts.get(CONF_SIDEBAR_PANEL, DEFAULT_SIDEBAR_PANEL),
                    ): bool,
                    # suggested_value statt default: so lässt sich das Feld auch leeren
                    vol.Optional(
                        CONF_SIDEBAR_TITLE,
                        description={
                            "suggested_value": opts.get(CONF_SIDEBAR_TITLE, DEFAULT_SIDEBAR_TITLE)
                        },
                    ): str,
                    vol.Optional(
                        CONF_NETWORK_URL,
                        description={"suggested_value": opts.get(CONF_NETWORK_URL, "")},
                    ): str,
                    vol.Required(
                        NC_OPT_ENABLED, default=opts.get(NC_OPT_ENABLED, True)
                    ): bool,
                    # Reihenfolge der Auswahl: nach Dringlichkeit (kritisch zuerst)
                    vol.Required(
                        NC_OPT_TYPES,
                        default=[t for t in NC_TYPE_IDS if nc_chosen.get(t, True)],
                    ): cv.multi_select(nc_type_labels(str(self.hass.config.language))),
                }
            ),
            errors=errors,
        )
