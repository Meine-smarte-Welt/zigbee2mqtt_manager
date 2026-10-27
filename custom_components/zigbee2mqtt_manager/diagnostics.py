# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 6fd16e169d2157164b6b83e7bd39648fdd701c151f1b4cb345e98568ee1c074d
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
            "disabled": d["disabled"],
            "stale": d["stale"],
            "lost": d["lost"],
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
        "problem": manager.problem,
        "groups": len(data["groups"]),
        # Nur Anzahlen, keine Namen oder Adressen
        "network": {
            "loading": data["network"]["loading"],
            "error": data["network"]["error"],
            "updated_at": data["network"]["updated_at"],
            "routers": (data["network"]["topology"] or {}).get("routers"),
            "clients": (data["network"]["topology"] or {}).get("clients"),
            "links": (data["network"]["topology"] or {}).get("links"),
        },
        "external_broker": bool(getattr(manager._transport, "external", False)),
        "app": data["app"],
        # Nur Schalterstand und Anzahl gesendeter Meldungen je Art, keine Namen oder Texte
        "notification_center": {
            "available": data["nc"]["available"],
            "enabled": data["nc"]["enabled"],
            "types": {
                t["type"]: {
                    "severity": t["severity"],
                    "enabled": t["enabled"],
                    "sent": manager.nc_sent.get(t["type"], 0),
                }
                for t in data["nc"]["types"]
            },
        },
        "devices": devices,
    }
