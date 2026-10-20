# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 213eafcf036a89e690fca3bc26050720dbc310a5c0490769c3f38d7de4129c4f
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
    GITHUB_API_RELEASES,
    GITHUB_API_TAGS,
    GITHUB_RELEASES_URL,
    GITHUB_REPO,
    VERSION,
)

_LOGGER = logging.getLogger(__name__)

# 1.2.3, optional mit Vorabversion: 1.2.3b1, 1.2.3rc2 (auch a/alpha/beta, mit . - _ als Trenner)
_VERSION_RE = re.compile(
    r"^[vV]?(\d+(?:\.\d+)*)(?:[.\-_]?(alpha|beta|rc|a|b|c)[.\-_]?(\d*))?",
    re.IGNORECASE,
)
# Rang der Vorabstufen; eine fertige Version steht über allen (z. B. 1.2.0b1 < 1.2.0rc1 < 1.2.0)
_STAGE_RANK = {"a": 0, "alpha": 0, "b": 1, "beta": 1, "rc": 2, "c": 2}
_FINAL_RANK = 3
_TIMEOUT = aiohttp.ClientTimeout(total=15)
_HEADERS = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "zigbee2mqtt_manager",
}


def parse_version(text: Any) -> tuple[int, ...] | None:
    """\"v1.2.3\" -> (1, 2, 3, 3, 0); \"1.2.3b1\" -> (1, 2, 3, 1, 1).

    Auf drei Stellen aufgefüllt (1.0 == 1.0.0), danach Rang der Vorabstufe und deren Nummer.
    Eine fertige Version ist größer als jede Vorabversion derselben Nummer.
    """
    if not isinstance(text, str):
        return None
    match = _VERSION_RE.match(text.strip())
    if not match:
        return None
    parts = tuple(int(p) for p in match.group(1).split("."))
    parts = parts + (0,) * max(0, 3 - len(parts))
    stage = match.group(2)
    if stage is None:
        return parts + (_FINAL_RANK, 0)
    return parts + (_STAGE_RANK[stage.lower()], int(match.group(3) or 0))


def is_prerelease(text: Any) -> bool:
    """True bei Vorabversionen wie 1.2.0b1 oder 1.2.0rc1."""
    parsed = parse_version(text)
    return parsed is not None and parsed[3] != _FINAL_RANK


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


def _best(candidates: list[dict[str, str]]) -> dict[str, str] | None:
    """Höchste Version aus {\"version\", \"url\"}-Einträgen."""
    if not candidates:
        return None
    return max(candidates, key=lambda c: parse_version(c["version"]) or ())


async def _fetch_latest(hass: HomeAssistant) -> dict[str, str] | None:
    """Neueste veröffentlichte Version holen: {\"version\", \"url\"} oder None bei Fehler.

    `releases/latest` liefert nie Vorabversionen (Pre-releases). Ist die installierte Version
    selbst eine Vorabversion (b/rc), wird deshalb zusätzlich die Liste der letzten Releases
    geprüft, sonst erführe ein Beta-Nutzer nie von der nächsten Beta. Nutzer einer fertigen
    Version sehen Vorabversionen nicht.
    """
    session = async_get_clientsession(hass)
    include_pre = is_prerelease(VERSION)
    candidates: list[dict[str, str]] = []
    reachable = False

    try:
        async with session.get(
            GITHUB_API_LATEST, headers=_HEADERS, timeout=_TIMEOUT
        ) as resp:
            if resp.status == 200:
                reachable = True
                data = await resp.json()
                tag = data.get("tag_name") if isinstance(data, dict) else None
                if parse_version(tag):
                    candidates.append(
                        {
                            "version": str(tag).lstrip("vV"),
                            "url": data.get("html_url") or GITHUB_RELEASES_URL,
                        }
                    )
            elif resp.status == 404:
                reachable = True
            else:
                _LOGGER.debug("GitHub-Release-Abfrage: HTTP %s", resp.status)
                if not include_pre:
                    return None

        if include_pre:
            async with session.get(
                GITHUB_API_RELEASES, headers=_HEADERS, timeout=_TIMEOUT
            ) as resp:
                if resp.status == 200:
                    reachable = True
                    releases = await resp.json()
                    for rel in releases if isinstance(releases, list) else []:
                        if not isinstance(rel, dict) or rel.get("draft"):
                            continue
                        tag = rel.get("tag_name")
                        if parse_version(tag):
                            candidates.append(
                                {
                                    "version": str(tag).lstrip("vV"),
                                    "url": rel.get("html_url") or GITHUB_RELEASES_URL,
                                }
                            )
                else:
                    _LOGGER.debug("GitHub-Release-Liste: HTTP %s", resp.status)

        best = _best(candidates)
        if best is not None:
            return best
        if not reachable:
            return None

        # Noch kein passendes Release veröffentlicht: höchstes Versions-Tag verwenden
        async with session.get(
            GITHUB_API_TAGS, headers=_HEADERS, timeout=_TIMEOUT
        ) as resp:
            if resp.status != 200:
                return None
            tags = await resp.json()
    except (aiohttp.ClientError, TimeoutError, ValueError) as err:
        _LOGGER.debug("Prüfung auf neue App-Version fehlgeschlagen: %s", err)
        return None

    names = [
        t["name"]
        for t in (tags if isinstance(tags, list) else [])
        if isinstance(t, dict)
        and parse_version(t.get("name"))
        and (include_pre or not is_prerelease(t.get("name")))
    ]
    if not names:
        return None
    best_name = max(names, key=lambda n: parse_version(n) or ())
    return {
        "version": best_name.lstrip("vV"),
        "url": f"https://github.com/{GITHUB_REPO}/releases/tag/{best_name}",
    }
