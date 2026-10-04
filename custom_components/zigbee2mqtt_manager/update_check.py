# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 983ee799bb58ebf999232585a01fe02a711e9fc2157feac832093c27bb6e5db7
"""Prüft auf GitHub, ob eine neuere Version der Integration veröffentlicht wurde."""

from __future__ import annotations

import logging
import re
from typing import Any

import aiohttp

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import (
    GITHUB_API_LATEST,
    GITHUB_API_TAGS,
    GITHUB_RELEASES_URL,
    GITHUB_REPO,
)

_LOGGER = logging.getLogger(__name__)

_VERSION_RE = re.compile(r"^[vV]?(\d+(?:\.\d+)*)")
_TIMEOUT = aiohttp.ClientTimeout(total=15)
_HEADERS = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "zigbee2mqtt_manager",
}


def parse_version(text: Any) -> tuple[int, ...] | None:
    """\"v1.2.3\" -> (1, 2, 3); auf drei Stellen aufgefüllt, damit 1.0 == 1.0.0."""
    if not isinstance(text, str):
        return None
    match = _VERSION_RE.match(text.strip())
    if not match:
        return None
    parts = tuple(int(p) for p in match.group(1).split("."))
    return parts + (0,) * max(0, 3 - len(parts))


def is_newer(latest: str | None, current: str | None) -> bool:
    new, cur = parse_version(latest), parse_version(current)
    return new is not None and cur is not None and new > cur


async def async_fetch_latest(hass: HomeAssistant) -> dict[str, str] | None:
    """Neueste veröffentlichte Version holen: {\"version\", \"url\"} oder None bei Fehler."""
    session = async_get_clientsession(hass)
    try:
        async with session.get(
            GITHUB_API_LATEST, headers=_HEADERS, timeout=_TIMEOUT
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                tag = data.get("tag_name") if isinstance(data, dict) else None
                if parse_version(tag):
                    return {
                        "version": str(tag).lstrip("vV"),
                        "url": data.get("html_url") or GITHUB_RELEASES_URL,
                    }
            elif resp.status != 404:
                _LOGGER.debug("GitHub-Release-Abfrage: HTTP %s", resp.status)
                return None

        # Noch kein Release veröffentlicht: höchstes Versions-Tag verwenden
        async with session.get(
            GITHUB_API_TAGS, headers=_HEADERS, timeout=_TIMEOUT
        ) as resp:
            if resp.status != 200:
                return None
            tags = await resp.json()
    except (aiohttp.ClientError, TimeoutError, ValueError) as err:
        _LOGGER.debug("Prüfung auf neue App-Version fehlgeschlagen: %s", err)
        return None

    candidates = [
        t["name"]
        for t in (tags if isinstance(tags, list) else [])
        if isinstance(t, dict) and parse_version(t.get("name"))
    ]
    if not candidates:
        return None
    best = max(candidates, key=lambda n: parse_version(n) or ())
    return {
        "version": best.lstrip("vV"),
        "url": f"https://github.com/{GITHUB_REPO}/releases/tag/{best}",
    }
