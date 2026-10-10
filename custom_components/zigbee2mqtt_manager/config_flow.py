# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): fa8712fdb6a02b741eabe066a16acbdff8388ba339dd29c6f658c790363dc044
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

from .const import (
    CONF_BASE_TOPIC,
    CONF_CRITICAL_BATTERY,
    CONF_FIRE_EVENTS,
    CONF_LOW_BATTERY,
    DEFAULT_BASE_TOPIC,
    DEFAULT_CRITICAL_BATTERY,
    DEFAULT_FIRE_EVENTS,
    DEFAULT_LOW_BATTERY,
    DOMAIN,
    VERSION,
)

_BATTERY_VALIDATOR = vol.All(vol.Coerce(int), vol.Range(min=1, max=99))


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
    """Nachträglich änderbar: Batterie-Schwellen und Ereignisse."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            if user_input[CONF_CRITICAL_BATTERY] > user_input[CONF_LOW_BATTERY]:
                errors[CONF_CRITICAL_BATTERY] = "critical_above_low"
            else:
                return self.async_create_entry(data=user_input)

        opts = self.config_entry.options
        manager = getattr(self.config_entry, "runtime_data", None)
        app = getattr(manager, "app", None) or {}
        lang = str(self.hass.config.language)[:2]
        latest = app.get("latest_version")
        link = app.get("release_url")
        if app.get("update_available"):
            update_info = {
                "de": f"⚠️ Neue Version verfügbar: **{latest}** – {link}",
                "nl": f"⚠️ Nieuwe versie beschikbaar: **{latest}** – {link}",
            }.get(lang, f"⚠️ New version available: **{latest}** – {link}")
        elif latest:
            update_info = {"de": "✅ Aktuell", "nl": "✅ Actueel"}.get(lang, "✅ Up to date")
        else:
            update_info = ""
        return self.async_show_form(
            step_id="init",
            description_placeholders={
                "version": app.get("version") or VERSION,
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
                }
            ),
            errors=errors,
        )
