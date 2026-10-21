# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): da60db0ffa5e1849b8d9d220558869d1e111dfcc163abcf49ccbec3541e9e969
"""Katalog der Meldungsarten für das optionale Notification Center (Schema 1).

Nur Meldungsarten, die der Zigbee2MQTT Manager aus seinen vorhandenen Zuständen
und Schwellen ableitet. Texte in allen fünf Sprachen; Platzhalter in {geschweiften Klammern}.
"""

from __future__ import annotations

from typing import Any

NC_SOURCE_ICON = "mdi:zigbee"

# Auflösbare Arten haben ein Gegenstück (z. B. offline -> online) und werden über den
# Zustand des Managers erkannt. Einmalige Arten kommen direkt aus den Bridge-Ereignissen.
NC_STATE_TYPES = (
    "bridge_offline",
    "device_offline",
    "device_missing",
    "battery_critical",
    "battery_low",
    "update_available",
)
NC_EVENT_TYPES = ("device_joined", "device_left")

NC_CATALOG: list[dict[str, Any]] = [
    {
        "type": "bridge_offline",
        "severity": "critical",
        "resolvable": True,
        "enabled_default": True,
        "icon": "mdi:server-network-off",
        "texts": {
            "de": {
                "label": "Bridge offline",
                "title": "Zigbee2MQTT ({bridge}) ist offline",
                "message": "Zigbee2MQTT ({bridge}) ist nicht erreichbar.",
            },
            "en": {
                "label": "Bridge offline",
                "title": "Zigbee2MQTT ({bridge}) is offline",
                "message": "Zigbee2MQTT ({bridge}) is not reachable.",
            },
            "nl": {
                "label": "Bridge offline",
                "title": "Zigbee2MQTT ({bridge}) is offline",
                "message": "Zigbee2MQTT ({bridge}) is niet bereikbaar.",
            },
            "fr": {
                "label": "Bridge hors ligne",
                "title": "Zigbee2MQTT ({bridge}) est hors ligne",
                "message": "Zigbee2MQTT ({bridge}) est injoignable.",
            },
            "es": {
                "label": "Bridge sin conexión",
                "title": "Zigbee2MQTT ({bridge}) está sin conexión",
                "message": "Zigbee2MQTT ({bridge}) no está accesible.",
            },
        },
    },
    {
        "type": "battery_critical",
        "severity": "critical",
        "resolvable": True,
        "enabled_default": True,
        "icon": "mdi:battery-alert",
        "texts": {
            "de": {
                "label": "Batterie kritisch",
                "title": "{name}: Batterie kritisch",
                "message": "{name} hat nur noch {battery} % Batterie. Bitte bald tauschen.",
            },
            "en": {
                "label": "Battery critical",
                "title": "{name}: battery critical",
                "message": "{name} is down to {battery} % battery. Please replace it soon.",
            },
            "nl": {
                "label": "Batterij kritiek",
                "title": "{name}: batterij kritiek",
                "message": "{name} heeft nog maar {battery} % batterij. Vervang hem binnenkort.",
            },
            "fr": {
                "label": "Batterie critique",
                "title": "{name} : batterie critique",
                "message": "{name} n'a plus que {battery} % de batterie. Pensez à la remplacer bientôt.",
            },
            "es": {
                "label": "Batería crítica",
                "title": "{name}: batería crítica",
                "message": "{name} solo tiene {battery} % de batería. Cámbiala pronto.",
            },
        },
    },
    {
        "type": "device_offline",
        "severity": "warning",
        "resolvable": True,
        "enabled_default": True,
        "icon": "mdi:lan-disconnect",
        "texts": {
            "de": {
                "label": "Gerät offline",
                "title": "{name} ist offline",
                "message": "{name} ist nicht erreichbar.",
            },
            "en": {
                "label": "Device offline",
                "title": "{name} is offline",
                "message": "{name} is not reachable.",
            },
            "nl": {
                "label": "Apparaat offline",
                "title": "{name} is offline",
                "message": "{name} is niet bereikbaar.",
            },
            "fr": {
                "label": "Appareil hors ligne",
                "title": "{name} est hors ligne",
                "message": "{name} est injoignable.",
            },
            "es": {
                "label": "Dispositivo sin conexión",
                "title": "{name} está sin conexión",
                "message": "{name} no está accesible.",
            },
        },
    },
    {
        "type": "device_missing",
        "severity": "warning",
        "resolvable": True,
        "enabled_default": True,
        "icon": "mdi:help-network-outline",
        "texts": {
            "de": {
                "label": "Gerät fehlt in Zigbee2MQTT",
                "title": "{name} fehlt in Zigbee2MQTT",
                "message": "{name} ist aus der Geräteliste von Zigbee2MQTT verschwunden.",
            },
            "en": {
                "label": "Device missing in Zigbee2MQTT",
                "title": "{name} is missing in Zigbee2MQTT",
                "message": "{name} has disappeared from the Zigbee2MQTT device list.",
            },
            "nl": {
                "label": "Apparaat ontbreekt in Zigbee2MQTT",
                "title": "{name} ontbreekt in Zigbee2MQTT",
                "message": "{name} is verdwenen uit de apparatenlijst van Zigbee2MQTT.",
            },
            "fr": {
                "label": "Appareil absent de Zigbee2MQTT",
                "title": "{name} est absent de Zigbee2MQTT",
                "message": "{name} a disparu de la liste des appareils de Zigbee2MQTT.",
            },
            "es": {
                "label": "Dispositivo ausente en Zigbee2MQTT",
                "title": "{name} falta en Zigbee2MQTT",
                "message": "{name} ha desaparecido de la lista de dispositivos de Zigbee2MQTT.",
            },
        },
    },
    {
        "type": "battery_low",
        "severity": "warning",
        "resolvable": True,
        "enabled_default": True,
        "icon": "mdi:battery-20",
        "texts": {
            "de": {
                "label": "Batterie niedrig",
                "title": "{name}: Batterie niedrig",
                "message": "{name} hat noch {battery} % Batterie.",
            },
            "en": {
                "label": "Battery low",
                "title": "{name}: battery low",
                "message": "{name} has {battery} % battery left.",
            },
            "nl": {
                "label": "Batterij laag",
                "title": "{name}: batterij laag",
                "message": "{name} heeft nog {battery} % batterij.",
            },
            "fr": {
                "label": "Batterie faible",
                "title": "{name} : batterie faible",
                "message": "{name} a encore {battery} % de batterie.",
            },
            "es": {
                "label": "Batería baja",
                "title": "{name}: batería baja",
                "message": "A {name} le queda {battery} % de batería.",
            },
        },
    },
    {
        "type": "update_available",
        "severity": "info",
        "resolvable": True,
        "enabled_default": True,
        "icon": "mdi:update",
        "texts": {
            "de": {
                "label": "Firmware-Update verfügbar",
                "title": "{name}: Firmware-Update verfügbar",
                "message": "Für {name} gibt es ein Firmware-Update.",
            },
            "en": {
                "label": "Firmware update available",
                "title": "{name}: firmware update available",
                "message": "A firmware update is available for {name}.",
            },
            "nl": {
                "label": "Firmware-update beschikbaar",
                "title": "{name}: firmware-update beschikbaar",
                "message": "Voor {name} is een firmware-update beschikbaar.",
            },
            "fr": {
                "label": "Mise à jour du firmware disponible",
                "title": "{name} : mise à jour du firmware disponible",
                "message": "Une mise à jour du firmware est disponible pour {name}.",
            },
            "es": {
                "label": "Actualización de firmware disponible",
                "title": "{name}: actualización de firmware disponible",
                "message": "Hay una actualización de firmware disponible para {name}.",
            },
        },
    },
    {
        "type": "device_joined",
        "severity": "info",
        "resolvable": False,
        "enabled_default": True,
        "icon": "mdi:plus-circle-outline",
        "texts": {
            "de": {
                "label": "Neues Gerät",
                "title": "Neues Gerät: {name}",
                "message": "{name} ist dem Zigbee-Netz beigetreten.",
            },
            "en": {
                "label": "New device",
                "title": "New device: {name}",
                "message": "{name} joined the Zigbee network.",
            },
            "nl": {
                "label": "Nieuw apparaat",
                "title": "Nieuw apparaat: {name}",
                "message": "{name} is toegetreden tot het Zigbee-netwerk.",
            },
            "fr": {
                "label": "Nouvel appareil",
                "title": "Nouvel appareil : {name}",
                "message": "{name} a rejoint le réseau Zigbee.",
            },
            "es": {
                "label": "Dispositivo nuevo",
                "title": "Dispositivo nuevo: {name}",
                "message": "{name} se ha unido a la red Zigbee.",
            },
        },
    },
    {
        "type": "device_left",
        "severity": "info",
        "resolvable": False,
        "enabled_default": True,
        "icon": "mdi:minus-circle-outline",
        "texts": {
            "de": {
                "label": "Gerät hat das Netz verlassen",
                "title": "{name} hat das Netz verlassen",
                "message": "{name} hat das Zigbee-Netz verlassen.",
            },
            "en": {
                "label": "Device left the network",
                "title": "{name} left the network",
                "message": "{name} left the Zigbee network.",
            },
            "nl": {
                "label": "Apparaat heeft het netwerk verlaten",
                "title": "{name} heeft het netwerk verlaten",
                "message": "{name} heeft het Zigbee-netwerk verlaten.",
            },
            "fr": {
                "label": "Appareil sorti du réseau",
                "title": "{name} a quitté le réseau",
                "message": "{name} a quitté le réseau Zigbee.",
            },
            "es": {
                "label": "Dispositivo salió de la red",
                "title": "{name} ha salido de la red",
                "message": "{name} ha salido de la red Zigbee.",
            },
        },
    },
]

NC_TYPE_IDS = [item["type"] for item in NC_CATALOG]


def nc_type_labels(language: str) -> dict[str, str]:
    """Beschriftungen der Meldungsarten (nach Dringlichkeit sortiert) für den Optionen-Dialog."""
    lang = language[:2] if language[:2] in ("de", "en", "nl", "fr", "es") else "en"
    return {item["type"]: item["texts"][lang]["label"] for item in NC_CATALOG}
