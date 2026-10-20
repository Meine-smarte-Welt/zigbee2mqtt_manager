# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 50855cd2e8bb0bd165987060c68bc2b8c49b1e24e79155e3744f467e90b94eda
"""Sammelmeldung: ein Binärsensor, der "an" geht, sobald im Zigbee-Netz etwas auffällig ist."""

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .manager import Z2MConfigEntry, Z2MManager


async def async_setup_entry(
    hass: HomeAssistant,
    entry: Z2MConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    async_add_entities([Z2MProblemSensor(entry.runtime_data, entry)])


class Z2MProblemSensor(BinarySensorEntity):
    """An, wenn die Bridge offline ist, Geräte offline sind, Batterien schwach sind oder Updates anstehen.

    Welche Gründe zählen, steht in den Optionen (Updates und "lange nichts gehört" sind
    abschaltbar). Die Zähler und Gerätelisten stehen als Attribute zur Verfügung.
    """

    _attr_should_poll = False
    _attr_has_entity_name = True
    _attr_translation_key = "problem"
    _attr_device_class = BinarySensorDeviceClass.PROBLEM

    def __init__(self, manager: Z2MManager, entry: Z2MConfigEntry) -> None:
        self._manager = manager
        self._attr_unique_id = f"{entry.entry_id}_problem"
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
    def is_on(self) -> bool:
        return bool(self._manager.problem["on"])

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        stats = self._manager.data["stats"]
        details = self._manager.details
        return {
            "reasons": list(self._manager.problem["reasons"]),
            "bridge_online": self._manager.bridge_online,
            "devices": stats["total"],
            "offline": stats["offline"],
            "low_battery": stats["low_battery"],
            "critical_battery": stats["critical_battery"],
            "updates_available": stats["updates_available"],
            "stale": stats["stale"],
            "disabled": stats["disabled"],
            "stale_hours": stats["stale_hours"],
            "offline_devices": details["offline"],
            "low_battery_devices": details["low_battery"],
            "critical_battery_devices": details["critical_battery"],
            "update_devices": details["updates_available"],
            "stale_devices": details["stale"],
            "disabled_devices": details["disabled"],
        }
