# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 0c1cd590e0bfd976d432a2e8a1d909a2a320e0fe9c2b94e2a2dc465cf887d6ce
"""Konstanten für Zigbee2MQTT Manager."""

from datetime import timedelta

DOMAIN = "zigbee2mqtt_manager"
VERSION = "1.1.1b3"

CONF_BASE_TOPIC = "base_topic"
CONF_LOW_BATTERY = "low_battery_threshold"
CONF_CRITICAL_BATTERY = "critical_battery_threshold"
CONF_FIRE_EVENTS = "fire_events"
CONF_STALE_HOURS = "stale_hours"
CONF_PROBLEM_UPDATES = "problem_include_updates"
CONF_PROBLEM_STALE = "problem_include_stale"
CONF_WELCOME_SHOWN = "welcome_shown"

DEFAULT_BASE_TOPIC = "zigbee2mqtt"
DEFAULT_LOW_BATTERY = 20
DEFAULT_CRITICAL_BATTERY = 10
DEFAULT_FIRE_EVENTS = True
# Stunden ohne Nachricht, ab denen ein Gerät als "lange nichts gehört" gilt (0 = aus)
DEFAULT_STALE_HOURS = 24
DEFAULT_PROBLEM_UPDATES = True
DEFAULT_PROBLEM_STALE = False

# Statische Auslieferung der Lovelace-Karte (Ordner "www")
CARD_URL_BASE = "/zigbee2mqtt_manager_files"
CARD_FILENAME = "zigbee2mqtt-manager-card.js"

# Zusammenfassung mehrerer schneller MQTT-Nachrichten zu einem Push
FLUSH_DELAY = 1.0

# Zeitgesteuerte Neuberechnung ("lange nichts gehört" ändert sich ohne neue Nachricht)
STALE_TICK = timedelta(minutes=5)

# Abstand zwischen OTA-Prüfungen bei "Alle prüfen" (Sekunden)
OTA_CHECK_SPACING = 1.0

# Zeit für Pairing-Modus in Sekunden
PERMIT_JOIN_SECONDS = 254

# Persistenter Cache der letzten Gerätewerte
STORAGE_VERSION = 1
STORAGE_SAVE_DELAY = 30
MAX_EVENT_LOG = 50

# Mindestversion der Zigbee2MQTT-Bridge (2.x)
MIN_Z2M_MAJOR = 2

WS_SUBSCRIBE = f"{DOMAIN}/subscribe"
WS_ACTION = f"{DOMAIN}/action"

# Eigene Home-Assistant-Events (siehe README)
EVENT_DEVICE_OFFLINE = f"{DOMAIN}_device_offline"
EVENT_DEVICE_ONLINE = f"{DOMAIN}_device_online"
EVENT_BATTERY_LOW = f"{DOMAIN}_battery_low"
EVENT_UPDATE_AVAILABLE = f"{DOMAIN}_update_available"
EVENT_DEVICE_JOINED = f"{DOMAIN}_device_joined"
EVENT_DEVICE_LEFT = f"{DOMAIN}_device_left"

SERVICE_PERMIT_JOIN = "permit_join"
SERVICE_CHECK_UPDATES = "check_updates"

# Prüfung auf neue Versionen der App (GitHub-Releases)
GITHUB_REPO = "Meine-smarte-Welt/zigbee2mqtt_manager"
GITHUB_API_LATEST = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
GITHUB_API_RELEASES = f"https://api.github.com/repos/{GITHUB_REPO}/releases?per_page=5"
GITHUB_API_TAGS = f"https://api.github.com/repos/{GITHUB_REPO}/tags?per_page=30"
GITHUB_RELEASES_URL = f"https://github.com/{GITHUB_REPO}/releases"
APP_UPDATE_CHECK_INTERVAL = timedelta(hours=12)
