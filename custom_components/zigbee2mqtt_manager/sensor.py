# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): d0b0928733a42f23ba55ba7ed3a0b98d343a816eacd1ae71841d7264428c3fba
"""Übersichts-Sensoren (Geräte, Offline, Batterie niedrig, Updates)."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .manager import Z2MConfigEntry, Z2MManager

# key -> (Schlüssel in stats, Icon, Schlüssel in details oder None)
SENSORS: dict[str, tuple[str, str, str | None]] = {
    "devices": ("total", "mdi:zigbee", None),
    "offline": ("offline", "mdi:lan-disconnect", "offline"),
    "low_battery": ("low_battery", "mdi:battery-alert", "low_battery"),
    "updates_available": ("updates_available", "mdi:update", "updates_available"),
    "critical_battery": ("critical_battery", "mdi:battery-alert-variant-outline", None),
    "disabled": ("disabled", "mdi:cancel", "disabled"),
    "groups": ("groups", "mdi:group", None),
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: Z2MConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    manager = entry.runtime_data
    async_add_entities(
        Z2MSummarySensor(manager, entry, key) for key in SENSORS
    )


class Z2MSummarySensor(SensorEntity):
    _attr_should_poll = False
    _attr_has_entity_name = True
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, manager: Z2MManager, entry: Z2MConfigEntry, key: str) -> None:
        self._manager = manager
        self._key = key
        stats_key, icon, self._details_key = SENSORS[key]
        self._stats_key = stats_key
        self._attr_icon = icon
        self._attr_translation_key = key
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=f"Zigbee2MQTT Manager ({manager.base_topic})",
            manufacturer="Zigbee2MQTT",
            model="Bridge",
        )

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self._manager.async_add_listener(self._handle_update))

    def _handle_update(self, kind: str, _payload: Any) -> None:
        if kind == "update":
            self.async_write_ha_state()

    @property
    def native_value(self) -> int:
        return self._manager.data["stats"][self._stats_key]

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        if self._details_key is None:
            return None
        attrs: dict[str, Any] = {"devices": self._manager.details[self._details_key]}
        if self._key == "low_battery":
            attrs["threshold"] = self._manager.data["stats"]["low_battery_threshold"]
        return attrs
