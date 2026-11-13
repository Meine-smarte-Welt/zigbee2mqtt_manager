# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 82cc2fc0065e21b5630189589b23c80c1d9e99c02811f9b419d24a9648f90fe3
"""Eigene Gerätebilder (experimentell, seit 1.5.0): Prüfung der vom Browser gesendeten Bilder.

Die Karte skaliert das Foto vor dem Hochladen (Bild und Vorschaubild) und sendet es als
``data:``-Adresse. Das Backend vertraut dem nicht: Typ, Größe und die ersten Bytes der Datei
werden geprüft, bevor etwas gespeichert wird. Reine Funktionen ohne Home-Assistant-Bezug.
"""

from __future__ import annotations

import base64
import binascii
import re

MAX_IMAGE_BYTES = 300_000  # Bild im Popup (Karte skaliert auf höchstens 640 px)
MAX_THUMB_BYTES = 40_000  # Vorschaubild in der Liste (höchstens 160 px)
MAX_IMAGES = 250  # Anzahl Geräte mit eigenem Bild
MAX_TOTAL_BYTES = 30_000_000  # Gesamtgröße aller gespeicherten Bilder

_DATA_URL = re.compile(r"^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$")


def _magic_ok(kind: str, raw: bytes) -> bool:
    if kind == "jpeg":
        return raw[:3] == b"\xff\xd8\xff"
    if kind == "png":
        return raw[:8] == b"\x89PNG\r\n\x1a\n"
    return raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"


def check_image(value: object, limit: int) -> str:
    """Gibt die geprüfte data-Adresse zurück oder wirft ValueError (Text für den Nutzer)."""
    if not isinstance(value, str) or len(value) > limit * 4 // 3 + 64:
        raise ValueError("Das Bild ist zu groß oder ungültig")
    match = _DATA_URL.match(value)
    if not match:
        raise ValueError("Nur JPEG-, PNG- und WebP-Bilder sind erlaubt")
    kind, payload = match.groups()
    try:
        raw = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as err:
        raise ValueError("Das Bild ist beschädigt") from err
    if not raw or len(raw) > limit:
        raise ValueError(f"Das Bild ist zu groß (höchstens {limit // 1000} KB)")
    if not _magic_ok(kind, raw):
        raise ValueError("Der Inhalt passt nicht zum Bildtyp")
    return value


def total_bytes(images: dict[str, dict[str, object]]) -> int:
    return sum(len(str(v.get("img", ""))) + len(str(v.get("thumb", ""))) for v in images.values())
