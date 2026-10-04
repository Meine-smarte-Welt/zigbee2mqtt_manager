# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 3b458118a4d57b80dcc6511cc2fd0971a8f5e26812b8f6063a3cfde9b8e82c8b
"""Diagnose-Download (IEEE-Adressen und Namen werden geschwärzt)."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant

from .manager import Z2MConfigEntry


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: Z2MConfigEntry
) -> dict[str, Any]:
    manager = entry.runtime_data
    data = manager.data
    mapping: dict[str, str] = {}

    def alias(kind: str, value: str | None) -> str | None:
        if not value:
            return value
        return mapping.setdefault(value, f"{kind}_{len(mapping) + 1}")

    devices = [
        {
            "name": alias("geraet", d["name"]),
            "ieee": alias("ieee", d["ieee"]),
            "type": d["type"],
            "vendor": d["vendor"],
            "model": d["model"],
            "power_source": d["power_source"],
            "supported": d["supported"],
            "available": d["available"],
            "has_battery": d["battery"] is not None,
            "ota": {"capable": d["ota"]["capable"], "state": d["ota"]["state"]},
            "bindings": len(d["bindings"]),
        }
        for d in data["devices"]
    ]
    return {
        "entry": {"options": dict(entry.options)},
        "bridge": {
            k: v for k, v in data["bridge"].items() if k not in ("base_topic",)
        },
        "stats": data["stats"],
        "groups": len(data["groups"]),
        "app": data["app"],
        "devices": devices,
    }
