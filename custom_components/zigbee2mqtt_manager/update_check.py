# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 0e0a1d1891f5e1336eedfea8cd9cb66fc3933ad1c0072a284da0150a96d43b31
"""Prüft auf GitHub, ob eine neuere Version der Integration veröffentlicht wurde."""

from __future__ import annotations

import logging
import re
import time
from typing import Any

import aiohttp

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import (
    DOMAIN,
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


# Mehrere Instanzen teilen sich eine Abfrage (GitHub begrenzt unangemeldete Anfragen)
_CACHE_KEY = f"{DOMAIN}_latest_version"
_CACHE_SECONDS = 300


async def async_fetch_latest(
    hass: HomeAssistant, force: bool = False
) -> dict[str, str] | None:
    """Neueste Version holen (mit kurzem gemeinsamem Zwischenspeicher)."""
    cached = hass.data.get(_CACHE_KEY)
    if not force and cached and time.monotonic() - cached[0] < _CACHE_SECONDS:
        return cached[1]
    result = await _fetch_latest(hass)
    if result is not None:
        hass.data[_CACHE_KEY] = (time.monotonic(), result)
    return result


async def _fetch_latest(hass: HomeAssistant) -> dict[str, str] | None:
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
