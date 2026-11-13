# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 314eb699a6ea2f15bf2e8beaf6d9d8e857846b96a290aaabf4098daa9a82e551
"""Statistiken zu Zigbee2MQTT (experimentell, seit 1.5.0).

Reine Funktionen ohne Home-Assistant-Bezug: Aus der Geräteliste (wie ``manager._serialize`` sie
liefert), der Topologie der Netzwerkkarte und den Nachrichtenzählern entsteht ein kompaktes
Wörterbuch für den Reiter "Statistik". Es werden nur Werte gezählt, die wirklich vorliegen;
fehlende Angaben landen in der Gruppe "unbekannt" statt geschätzt zu werden.
"""

from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
from typing import Any

TOP_N = 8

# Grenzen (Signalqualität LQI 0–255, Batterie in %)
LQI_GOOD = 100
LQI_MEDIUM = 50
BATTERY_FULL = 60


def _top(counter: Counter[str], limit: int = TOP_N) -> list[dict[str, Any]]:
    items = sorted(counter.items(), key=lambda kv: (-kv[1], kv[0].lower()))
    return [{"key": k, "count": v} for k, v in items[:limit]]


def _parse(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def _is_mains(source: Any) -> bool | None:
    text = str(source or "").lower()
    if not text:
        return None
    if "battery" in text:
        return False
    if "mains" in text or "dc" in text or "main" in text:
        return True
    return None


def compute_statistics(
    devices: list[dict[str, Any]],
    topology: dict[str, Any] | None,
    msg_counts: dict[str, int],
    counting_since: str | None,
    low_threshold: int = 20,
    critical_threshold: int = 10,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Statistik aus den Geräten (ohne Koordinator und ohne "fehlt"-Einträge) berechnen."""
    now = now or datetime.now(UTC)
    items = [d for d in devices if not d.get("missing")]

    kinds: Counter[str] = Counter()
    power = Counter({"mains": 0, "battery": 0, "unknown": 0})
    vendors: Counter[str] = Counter()
    models: Counter[str] = Counter()
    classes: Counter[str] = Counter()
    for d in items:
        kinds[str(d.get("type") or "unknown")] += 1
        mains = _is_mains(d.get("power_source"))
        power["unknown" if mains is None else "mains" if mains else "battery"] += 1
        vendors[str(d.get("vendor") or "unknown")] += 1
        if d.get("model"):
            models[str(d["model"])] += 1
        classes[str(d.get("device_class") or "other")] += 1

    lqi = Counter({"good": 0, "medium": 0, "weak": 0, "unknown": 0})
    lqi_values: list[float] = []
    weakest: list[tuple[float, str]] = []
    for d in items:
        value = d.get("linkquality")
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            lqi_values.append(float(value))
            weakest.append((float(value), str(d.get("name") or d.get("ieee"))))
            lqi["good" if value >= LQI_GOOD else "medium" if value >= LQI_MEDIUM else "weak"] += 1
        else:
            lqi["unknown"] += 1
    weakest.sort()

    battery = Counter({"full": 0, "ok": 0, "low": 0, "critical": 0})
    battery_devices = [
        d for d in items if isinstance(d.get("battery"), (int, float)) and not isinstance(d.get("battery"), bool)
    ]
    battery_values = [float(d["battery"]) for d in battery_devices]
    for value in battery_values:
        battery[
            "full" if value >= BATTERY_FULL else "ok" if value >= low_threshold else "low" if value >= critical_threshold else "critical"
        ] += 1
    lowest = sorted(
        ((float(d["battery"]), str(d.get("name") or d.get("ieee"))) for d in battery_devices)
    )[:5]

    seen = Counter({"hour": 0, "day": 0, "older": 0, "never": 0})
    for d in items:
        when = _parse(d.get("last_seen"))
        if when is None:
            seen["never"] += 1
            continue
        age = (now - when).total_seconds()
        seen["hour" if age <= 3600 else "day" if age <= 86400 else "older"] += 1

    ota = Counter()
    for d in items:
        state = (d.get("ota") or {}).get("state")
        if (d.get("ota") or {}).get("capable"):
            ota[str(state or "idle")] += 1
        else:
            ota["none"] += 1

    state_counts = {
        "online": sum(1 for d in items if d.get("available") is True),
        "offline": sum(1 for d in items if d.get("available") is False),
        "unknown": sum(1 for d in items if d.get("available") is None),
        "disabled": sum(1 for d in items if d.get("disabled")),
        "unsupported": sum(1 for d in items if d.get("supported") is False),
        "interviewing": sum(1 for d in items if d.get("interviewing")),
    }

    network: dict[str, Any] | None = None
    if topology:
        hubs = topology.get("hubs") or []
        routers = [h for h in hubs if h.get("type") == "Router"]
        depth = Counter(str(h.get("depth", 0)) for h in routers)
        load = sorted(
            ((len(h.get("clients") or []), h.get("name") or h.get("ieee")) for h in hubs),
            key=lambda kv: (-kv[0], str(kv[1]).lower()),
        )
        link_lqi = [
            n["lqi"]
            for h in hubs
            for n in (h.get("neighbors") or [])
            if isinstance(n.get("lqi"), (int, float))
        ]
        network = {
            "routers": len(routers),
            "end_devices_assigned": int(topology.get("clients") or 0),
            "unassigned": len(topology.get("unassigned") or []),
            "orphans": sum(1 for h in routers if h.get("orphan")),
            "links": int(topology.get("links") or 0),
            "avg_link_lqi": round(sum(link_lqi) / len(link_lqi)) if link_lqi else None,
            "max_depth": max((int(h.get("depth") or 0) for h in routers), default=0),
            "depth": [{"key": k, "count": v} for k, v in sorted(depth.items(), key=lambda kv: int(kv[0]))],
            "busiest": [{"key": str(n), "count": c} for c, n in load[:5] if c > 0],
        }

    names = {str(d.get("name")): d for d in items}
    chatty = sorted(
        ((count, name) for name, count in msg_counts.items() if name in names and count > 0),
        key=lambda kv: (-kv[0], kv[1].lower()),
    )

    return {
        "total": len(items),
        "kinds": _top(kinds, 6),
        "power": dict(power),
        "classes": _top(classes, 9),
        "vendors": _top(vendors),
        "models": _top(models),
        "vendor_count": len([k for k in vendors if k != "unknown"]),
        "lqi": dict(lqi),
        "lqi_avg": round(sum(lqi_values) / len(lqi_values)) if lqi_values else None,
        "lqi_weakest": [{"key": n, "count": int(v)} for v, n in weakest[:5]],
        "battery": dict(battery),
        "battery_avg": round(sum(battery_values) / len(battery_values)) if battery_values else None,
        "battery_lowest": [{"key": n, "count": int(v)} for v, n in lowest],
        "seen": dict(seen),
        "ota": dict(ota),
        "state": state_counts,
        "network": network,
        "messages": {
            "since": counting_since,
            "total": sum(c for c, _n in chatty),
            "top": [{"key": n, "count": c} for c, n in chatty[:5]],
        },
    }
