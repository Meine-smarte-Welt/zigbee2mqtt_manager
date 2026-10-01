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
    CONF_LOW_BATTERY,
    DEFAULT_BASE_TOPIC,
    DEFAULT_LOW_BATTERY,
    DOMAIN,
)

_BATTERY_VALIDATOR = vol.All(vol.Coerce(int), vol.Range(min=1, max=99))


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
            if not base or "#" in base or "+" in base:
                errors[CONF_BASE_TOPIC] = "invalid_topic"
            else:
                await self.async_set_unique_id(base)
                self._abort_if_unique_id_configured()
                if not await mqtt.async_wait_for_mqtt_client(self.hass):
                    return self.async_abort(reason="mqtt_unavailable")
                return self.async_create_entry(
                    title=f"Zigbee2MQTT Manager ({base})",
                    data={CONF_BASE_TOPIC: base},
                    options={CONF_LOW_BATTERY: user_input[CONF_LOW_BATTERY]},
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_BASE_TOPIC, default=DEFAULT_BASE_TOPIC
                    ): str,
                    vol.Required(
                        CONF_LOW_BATTERY, default=DEFAULT_LOW_BATTERY
                    ): _BATTERY_VALIDATOR,
                }
            ),
            errors=errors,
        )


class Z2MManagerOptionsFlow(OptionsFlow):
    """Nachträglich änderbar: Schwelle für "Batterie niedrig"."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=user_input)

        current = self.config_entry.options.get(CONF_LOW_BATTERY, DEFAULT_LOW_BATTERY)
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {vol.Required(CONF_LOW_BATTERY, default=current): _BATTERY_VALIDATOR}
            ),
        )
