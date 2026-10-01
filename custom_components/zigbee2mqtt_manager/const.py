"""Konstanten für Zigbee2MQTT Manager."""

DOMAIN = "zigbee2mqtt_manager"
VERSION = "0.0.1"

CONF_BASE_TOPIC = "base_topic"
CONF_LOW_BATTERY = "low_battery_threshold"

DEFAULT_BASE_TOPIC = "zigbee2mqtt"
DEFAULT_LOW_BATTERY = 20

# Statische Auslieferung der Lovelace-Karte
URL_BASE = "/zigbee2mqtt_manager_static"
CARD_FILENAME = "zigbee2mqtt-manager-card.js"

# Zusammenfassung mehrerer schneller MQTT-Nachrichten zu einem Push
FLUSH_DELAY = 1.0

# Abstand zwischen OTA-Prüfungen bei "Alle prüfen" (Sekunden)
OTA_CHECK_SPACING = 1.0

# Zeit für Pairing-Modus in Sekunden
PERMIT_JOIN_SECONDS = 254

WS_SUBSCRIBE = f"{DOMAIN}/subscribe"
WS_ACTION = f"{DOMAIN}/action"
