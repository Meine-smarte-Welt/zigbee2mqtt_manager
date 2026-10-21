# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 9ea1a13d2dd3e7120569ceded2d1dc9e3b452c31af8d118f3073dfe634a08ae6
"""Konstanten für Zigbee2MQTT Manager."""

from datetime import timedelta

DOMAIN = "zigbee2mqtt_manager"
VERSION = "1.2.2"

CONF_BASE_TOPIC = "base_topic"
CONF_LOW_BATTERY = "low_battery_threshold"
CONF_CRITICAL_BATTERY = "critical_battery_threshold"
CONF_FIRE_EVENTS = "fire_events"
CONF_STALE_HOURS = "stale_hours"
CONF_PROBLEM_UPDATES = "problem_include_updates"
CONF_PROBLEM_STALE = "problem_include_stale"
CONF_WELCOME_SHOWN = "welcome_shown"
CONF_SIDEBAR_PANEL = "sidebar_panel"
CONF_SIDEBAR_TITLE = "sidebar_title"
CONF_NETWORK_URL = "network_url"

DEFAULT_BASE_TOPIC = "zigbee2mqtt"
DEFAULT_LOW_BATTERY = 20
DEFAULT_CRITICAL_BATTERY = 10
DEFAULT_FIRE_EVENTS = True
# Stunden ohne Nachricht, ab denen ein Gerät als "lange nichts gehört" gilt (0 = aus)
DEFAULT_STALE_HOURS = 24
DEFAULT_PROBLEM_UPDATES = True
DEFAULT_PROBLEM_STALE = False
# Eigener Eintrag in der Seitenleiste (Panel), der die Karte als Seite zeigt
DEFAULT_SIDEBAR_PANEL = True
# Beschriftung des Seitenleisten-Eintrags (änderbar, damit er sich von der Z2M-App unterscheidet)
DEFAULT_SIDEBAR_TITLE = "Zigbee2MQTT Manager"
MAX_SIDEBAR_TITLE = 40

# Statische Auslieferung der Lovelace-Karte (Ordner "www")
CARD_URL_BASE = "/zigbee2mqtt_manager_files"
CARD_FILENAME = "zigbee2mqtt-manager-card.js"
PANEL_FILENAME = "zigbee2mqtt-manager-panel.js"
PANEL_ELEMENT = "zigbee2mqtt-manager-panel"
PANEL_URL_PATH = "zigbee2mqtt-manager"

# Zusammenfassung mehrerer schneller MQTT-Nachrichten zu einem Push
FLUSH_DELAY = 1.0

# Zeitgesteuerte Neuberechnung ("lange nichts gehört" ändert sich ohne neue Nachricht)
STALE_TICK = timedelta(minutes=5)

# Abstand zwischen OTA-Prüfungen bei "Alle prüfen" (Sekunden)
OTA_CHECK_SPACING = 1.0

# Zeit für Pairing-Modus in Sekunden
PERMIT_JOIN_SECONDS = 254

# Persistenter Cache der letzten Gerätewerte und der zuletzt bekannten Geräteliste
STORAGE_VERSION = 1
# Eine Entfernung über die Karte (oder ein Z2M-"device_leave") gilt so lange als gewollt (Sekunden)
EXPECTED_GONE_SECONDS = 600
STORAGE_SAVE_DELAY = 30
MAX_EVENT_LOG = 50
# Höchstlänge des Gerätekommentars (Z2M-Einstellung "description")
MAX_COMMENT_LENGTH = 500

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
EVENT_DEVICE_MISSING = f"{DOMAIN}_device_missing"

SERVICE_PERMIT_JOIN = "permit_join"
SERVICE_CHECK_UPDATES = "check_updates"

# Prüfung auf neue Versionen der App (GitHub-Releases)
GITHUB_REPO = "Meine-smarte-Welt/zigbee2mqtt_manager"
GITHUB_API_LATEST = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
GITHUB_API_RELEASES = f"https://api.github.com/repos/{GITHUB_REPO}/releases?per_page=5"
GITHUB_API_TAGS = f"https://api.github.com/repos/{GITHUB_REPO}/tags?per_page=30"
GITHUB_RELEASES_URL = f"https://github.com/{GITHUB_REPO}/releases"
APP_UPDATE_CHECK_INTERVAL = timedelta(hours=12)


def valid_link(value: str) -> bool:
    """Nur http(s)-Adressen oder Pfade innerhalb von Home Assistant ("/…"), ohne Sonderzeichen."""
    text = str(value or "")
    if not text or len(text) > 500 or any(c.isspace() or c in "\"'<>`\\" for c in text):
        return False
    return text.lower().startswith(("http://", "https://")) or (
        text.startswith("/") and not text.startswith("//")
    )


def clean_title(value: object, default: str, limit: int) -> str:
    """Beschriftung bereinigen: ohne Steuerzeichen und spitze Klammern, begrenzt, sonst Standard."""
    text = "".join(c for c in str(value or "") if c.isprintable() and c not in "<>").strip()
    return text[:limit] if text else default
