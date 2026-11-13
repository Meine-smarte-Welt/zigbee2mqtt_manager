# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 2d885c45cbc2d3839a02d23e667e8f653719a4c0a90f3d0c37bf7e09853a18ee
"""Netzwerkkarte: Antwort von Zigbee2MQTT ("networkmap", Typ "raw") auswerten.

Reine Funktionen ohne Home-Assistant-Bezug. Z2M liefert Knoten und Verbindungen aus den
Nachbartabellen der Router. Eine Verbindung kommt als {source, target, lqi, relationship}:
``target`` ist das Gerät, dessen Nachbartabelle gelesen wurde, ``source`` der dort genannte
Nachbar; ``relationship`` beschreibt den Nachbarn aus Sicht des Zielgeräts
(0 = Elternknoten, 1 = Kind, 2 = Geschwister, 3 = keine, 4 = früheres Kind).
Endgeräte beantworten keine Anfrage, sie erscheinen nur als Nachbar ihres Routers.
"""

from __future__ import annotations

import heapq
from typing import Any

from .const import MAX_NETWORK_LINKS

HUB_TYPES = ("Coordinator", "Router")

REL_PARENT = 0
REL_CHILD = 1
REL_SIBLING = 2


def _ieee(value: Any) -> str | None:
    text = str(value or "").strip().lower()
    return text or None


def _int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return int(value)
    return None


def parse_networkmap(value: Any) -> dict[str, Any] | None:
    """Antwort in eine kompakte, speicherbare Form bringen; None, wenn sie unbrauchbar ist."""
    if not isinstance(value, dict):
        return None
    raw_nodes = value.get("nodes")
    raw_links = value.get("links")
    if not isinstance(raw_nodes, list) or not isinstance(raw_links, list):
        return None

    nodes: dict[str, dict[str, Any]] = {}
    for item in raw_nodes:
        if not isinstance(item, dict):
            continue
        ieee = _ieee(item.get("ieeeAddr") or item.get("ieee_address"))
        if not ieee:
            continue
        kind = item.get("type")
        nodes[ieee] = {
            "ieee": ieee,
            "type": kind if kind in ("Coordinator", "Router", "EndDevice") else "EndDevice",
            "name": str(item.get("friendlyName") or item.get("friendly_name") or ieee),
            "nwk": _int(item.get("networkAddress") or item.get("network_address")),
        }

    links: list[dict[str, Any]] = []
    for item in raw_links[:MAX_NETWORK_LINKS]:
        if not isinstance(item, dict):
            continue
        source = item.get("source") if isinstance(item.get("source"), dict) else {}
        target = item.get("target") if isinstance(item.get("target"), dict) else {}
        src = _ieee(item.get("sourceIeeeAddr") or source.get("ieeeAddr"))
        dst = _ieee(item.get("targetIeeeAddr") or target.get("ieeeAddr"))
        if not src or not dst or src == dst:
            continue
        lqi = _int(item.get("lqi"))
        if lqi is None:
            lqi = _int(item.get("linkquality"))
        links.append(
            {
                "s": src,
                "t": dst,
                "lqi": max(0, min(255, lqi)) if lqi is not None else None,
                "rel": _int(item.get("relationship")),
                "depth": _int(item.get("depth")),
            }
        )
    if not nodes:
        return None
    return {"nodes": list(nodes.values()), "links": links}


def _view_of(link: dict[str, Any], hub: str) -> int | None:
    """Beziehung des Nachbarn aus Sicht von ``hub`` (0 Elternknoten, 1 Kind, 2 Geschwister)."""
    rel = link.get("rel")
    if rel is None:
        return None
    if link["t"] == hub:
        return rel if rel in (REL_PARENT, REL_CHILD, REL_SIBLING) else None
    # hub ist die Quelle: die Beziehung gilt aus Sicht des Ziels, also umgekehrt
    return {REL_PARENT: REL_CHILD, REL_CHILD: REL_PARENT, REL_SIBLING: REL_SIBLING}.get(rel)


def _cost(lqi: int | None) -> float:
    """Kosten eines Sprungs (Erwartungswert der Sendeversuche): schwach = teuer."""
    return 255.0 / max(1, lqi or 1)


def build_topology(
    raw: dict[str, Any], names: dict[str, str] | None = None
) -> dict[str, Any]:
    """Aus Knoten und Verbindungen eine Baumansicht machen.

    Jeder Router hängt an genau einem Elternknoten. Vorrang hat der **gemeldete** Elternknoten
    (``relationship`` 0 = Elternknoten, 1 = Kind, wie in der Netzwerkkarte von Zigbee2MQTT).
    Meldet ein Router keinen (oder würde der gemeldete einen Kreis bilden), gilt der Weg zum
    Koordinator mit den geringsten Kosten (wenige Sprünge, gute Verbindung) als Näherung.
    Beides steht im Ergebnis: ``parent`` (gezeichnet), ``parent_source`` ("reported" oder
    "lqi") und ``path_parent`` (günstigster Weg). Endgeräte hängen an dem Router, der sie als
    Kind führt (sonst an der besten Verbindung); ohne bekannte Verbindung stehen sie unter
    "ohne Verbindung".
    """
    names = names or {}
    nodes = {n["ieee"]: n for n in raw.get("nodes", [])}
    links = raw.get("links", [])

    def name_of(ieee: str) -> str:
        return names.get(ieee) or nodes.get(ieee, {}).get("name") or ieee

    hubs = {i for i, n in nodes.items() if n["type"] in HUB_TYPES}
    roots = sorted(i for i in hubs if nodes[i]["type"] == "Coordinator")

    # Beste Verbindung je Paar von Knoten (beide Richtungen zusammengefasst)
    best: dict[frozenset[str], int] = {}
    for link in links:
        a, b = link["s"], link["t"]
        if a not in nodes or b not in nodes:
            continue
        key = frozenset((a, b))
        lqi = link["lqi"] or 0
        if lqi >= best.get(key, -1):
            best[key] = lqi

    adjacency: dict[str, list[tuple[str, int]]] = {h: [] for h in hubs}
    for key, lqi in best.items():
        pair = tuple(key)
        if len(pair) == 2 and pair[0] in hubs and pair[1] in hubs:
            adjacency[pair[0]].append((pair[1], lqi))
            adjacency[pair[1]].append((pair[0], lqi))

    # Kürzester Weg (Dijkstra) von allen Koordinatoren aus
    dist: dict[str, float] = {r: 0.0 for r in roots}
    parent: dict[str, str | None] = {r: None for r in roots}
    hops: dict[str, int] = {r: 0 for r in roots}
    queue: list[tuple[float, str]] = [(0.0, r) for r in roots]
    heapq.heapify(queue)
    while queue:
        d, node = heapq.heappop(queue)
        if d > dist.get(node, float("inf")):
            continue
        for other, lqi in sorted(adjacency.get(node, [])):
            nd = d + _cost(lqi)
            if nd < dist.get(other, float("inf")):
                dist[other] = nd
                parent[other] = node
                hops[other] = hops[node] + 1
                heapq.heappush(queue, (nd, other))

    # Gemeldeter Elternknoten (relationship) je Router; bei mehreren gewinnt die beste Verbindung
    reported: dict[str, str] = {}
    reported_lqi: dict[str, int] = {}
    for link in links:
        for hub, other in ((link["t"], link["s"]), (link["s"], link["t"])):
            if hub not in hubs or other not in hubs or nodes[hub]["type"] == "Coordinator":
                continue
            if _view_of(link, hub) != REL_PARENT:
                continue
            lqi = link["lqi"] or 0
            if hub not in reported or lqi > reported_lqi[hub]:
                reported[hub] = other
                reported_lqi[hub] = lqi

    # Endgültiger Elternknoten: gemeldet, sonst günstigster Weg
    final: dict[str, str | None] = {}
    source: dict[str, str] = {}
    for hub in hubs:
        if nodes[hub]["type"] == "Coordinator":
            final[hub], source[hub] = None, "root"
        elif hub in reported:
            final[hub], source[hub] = reported[hub], "reported"
        else:
            final[hub], source[hub] = parent.get(hub), "lqi"

    def _cycle_members() -> set[str]:
        """Router, deren Elternkette in einem Kreis endet (statt am Koordinator)."""
        bad: set[str] = set()
        for start in hubs:
            seen: list[str] = []
            node: str | None = start
            while node is not None and node not in seen:
                seen.append(node)
                node = final.get(node)
            if node is not None:
                bad.update(seen[seen.index(node):])
        return bad

    # Kreise auflösen: betroffene gemeldete Eltern durch den günstigsten Weg ersetzen
    while True:
        bad = _cycle_members()
        fixable = [h for h in bad if source.get(h) == "reported"]
        if not fixable:
            break
        for hub in fixable:
            final[hub], source[hub] = parent.get(hub), "lqi"

    # Tiefe aus der endgültigen Elternkette; Router ohne Weg zum Koordinator sind verwaist
    depth_of: dict[str, int] = {}
    orphans_set: set[str] = set()
    for hub in hubs:
        steps, node = 0, hub
        seen_nodes: set[str] = set()
        while final.get(node) is not None and node not in seen_nodes:
            seen_nodes.add(node)
            node = final[node]  # type: ignore[assignment]
            steps += 1
        if nodes[node]["type"] == "Coordinator" and node not in seen_nodes or nodes[hub]["type"] == "Coordinator":
            depth_of[hub] = steps
        else:
            depth_of[hub] = 0
            if nodes[hub]["type"] != "Coordinator":
                orphans_set.add(hub)
    orphans = sorted(orphans_set)

    # Endgeräte einem Router zuordnen
    clients_of: dict[str, list[dict[str, Any]]] = {h: [] for h in hubs}
    unassigned: list[dict[str, Any]] = []
    for ieee, node in sorted(nodes.items()):
        if node["type"] in HUB_TYPES:
            continue
        candidates: list[tuple[int, int, str]] = []
        for link in links:
            if ieee not in (link["s"], link["t"]):
                continue
            other = link["t"] if link["s"] == ieee else link["s"]
            if other not in hubs:
                continue
            view = _view_of(link, other)  # Beziehung dieses Endgeräts aus Sicht des Routers
            is_child = 1 if view == REL_CHILD else 0
            candidates.append((is_child, link["lqi"] or 0, other))
        if not candidates:
            unassigned.append({"ieee": ieee, "name": name_of(ieee)})
            continue
        candidates.sort(reverse=True)
        _, lqi, hub = candidates[0]
        clients_of[hub].append({"ieee": ieee, "name": name_of(ieee), "lqi": lqi or None})

    items: dict[str, dict[str, Any]] = {}
    for hub in sorted(hubs):
        neighbors: dict[str, dict[str, Any]] = {}
        for link in links:
            if hub not in (link["s"], link["t"]):
                continue
            other = link["t"] if link["s"] == hub else link["s"]
            if other not in hubs or other == hub:
                continue
            entry = neighbors.setdefault(
                other,
                {
                    "ieee": other,
                    "name": name_of(other),
                    "type": nodes[other]["type"],
                    "lqi": None,
                    "rel": None,
                },
            )
            lqi = link["lqi"]
            if lqi is not None and (entry["lqi"] is None or lqi > entry["lqi"]):
                entry["lqi"] = lqi
            view = _view_of(link, hub)
            if view is not None and entry["rel"] is None:
                entry["rel"] = {REL_PARENT: "parent", REL_CHILD: "child", REL_SIBLING: "sibling"}[view]
        par = final.get(hub)
        orphan = hub in orphans_set
        items[hub] = {
            "ieee": hub,
            "name": name_of(hub),
            "type": nodes[hub]["type"],
            "parent": par,
            "parent_source": source.get(hub, "lqi"),
            "path_parent": parent.get(hub),
            "orphan": orphan,
            "lqi": best.get(frozenset((hub, par))) if par else None,
            "depth": depth_of.get(hub, 0),
            "clients": sorted(clients_of[hub], key=lambda c: c["name"].lower()),
            "neighbors": sorted(
                neighbors.values(), key=lambda n: (-(n["lqi"] or 0), n["name"].lower())
            ),
        }

    # Verwaiste Router unter dem ersten Koordinator einsortieren (für die Zeichnung)
    if roots:
        for hub in orphans:
            items[hub]["parent"] = roots[0]

    ordered = sorted(
        items.values(),
        key=lambda h: (h["type"] != "Coordinator", h["depth"], h["name"].lower()),
    )
    return {
        "hubs": ordered,
        "unassigned": unassigned,
        "clients": sum(len(h["clients"]) for h in ordered),
        "routers": sum(1 for h in ordered if h["type"] == "Router"),
        "links": len(best),
    }
