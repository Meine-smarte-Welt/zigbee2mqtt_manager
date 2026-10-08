// SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 6370c89fc4a3a38f0a290532da0d67b43a77d12f2f8f5f5508053965aa8cf6c0
/**
 * zigbee2mqtt-manager-card
 * -------------------------
 * Custom Lovelace card for the zigbee2mqtt_manager Home Assistant integration.
 *
 * Verwaltet Zigbee2MQTT direkt im Dashboard, ohne die Z2M-Weboberfläche. Aufbau
 * und Design folgen bewusst der fritzbox-anrufe-card (gleiche Kopfzeile mit
 * Icon-Kategorien, Zeilenliste, Detail-Popup, Akkordeon-Abschnitte, grafischer
 * Karten-Editor mit auf-/zuklappbaren Gruppen und frei einstellbaren Farben):
 *
 *   Geräte      - Liste aller Geräte mit Erreichbarkeit, Signal, Batterie
 *   Batterie    - batteriebetriebene Geräte, niedrigster Ladestand zuerst
 *   Updates     - OTA-Firmware: prüfen, einzeln oder nacheinander installieren
 *   Gruppen     - anlegen, umbenennen, Mitglieder verwalten
 *   Bindings    - Übersicht und Lösen von Gerät-zu-Gerät-Verknüpfungen
 *   Bridge      - Status, App-Version (mit Update-Hinweis), Pairing, Optionen, Neustart, Ereignisprotokoll
 *
 * Jede Kategorie ist einzeln ein-/ausblendbar (show_* im Editor bzw. YAML).
 * Tippt man auf ein Gerät, öffnet sich ein Popup mit Akkordeon-Abschnitten:
 * Info, Funktionen (alle Expose-Funktionen mit aktuellem Wert), Umbenennen
 * (inkl. betroffener Entitäten), Geräteoptionen (Formular aus dem Z2M-Schema),
 * Firmware, Bindings, Gruppen und Entfernen.
 *
 * Mehrere Zigbee2MQTT-Instanzen (z. B. drei Sticks): Gibt es mehr als eine und
 * ist weder `entry_id` noch `base_topic` gesetzt, erscheint oben in der Karte
 * ein Umschalter. Mit `entry_id`/`base_topic` lässt sich eine Karte fest an eine
 * Instanz binden (z. B. eine Karte je Stick).
 *
 * Alle schreibenden Aktionen laufen über die Integration und sind dort auf
 * Administratoren beschränkt. Mit `read_only: true` blendet die Karte alle
 * Bedienelemente zum Ändern aus (z. B. für Wandtablets).
 *
 * Farben (Editor-Gruppe "Farben", color_* Schlüssel) akzeptieren Hex, rgb(),
 * hsl() oder var(--...) und fallen bei leerem Wert auf die Theme-Farben zurück.
 * Die Symbolfarbe jeder Kategorie (color_icon_*) färbt Tab-Symbol und die
 * Zeilen-Symbole der Kategorie; ist `color_row_icon` gesetzt, gewinnt diese.
 *
 * Kartentyp: custom:zigbee2mqtt-manager-card
 */

const CARD_VERSION = "1.0.4";
const RELEASES_URL = "https://github.com/Meine-smarte-Welt/zigbee2mqtt_manager/releases";

const TAB_ORDER = ["devices", "battery", "updates", "groups", "bindings", "bridge"];

const TAB_META = {
  devices: { icon: "mdi:zigbee", label: "tab_devices" },
  battery: { icon: "mdi:battery-70", label: "tab_battery" },
  updates: { icon: "mdi:update", label: "tab_updates" },
  groups: { icon: "mdi:group", label: "tab_groups" },
  bindings: { icon: "mdi:link-variant", label: "tab_bindings" },
  bridge: { icon: "mdi:cog", label: "tab_bridge" },
};

const CATEGORY_ICON_COLOR_KEYS = Object.fromEntries(TAB_ORDER.map((k) => [k, `color_icon_${k}`]));

const SORT_OPTIONS = [
  { value: "name_asc", label: "sort_name_asc" },
  { value: "name_desc", label: "sort_name_desc" },
  { value: "battery_asc", label: "sort_battery_asc" },
  { value: "lqi_asc", label: "sort_lqi_asc" },
  { value: "last_seen_desc", label: "sort_last_seen_desc" },
  { value: "last_seen_asc", label: "sort_last_seen_asc" },
  { value: "ota", label: "sort_ota" },
];
const DEFAULT_SORT = "name_asc";
const TAB_DEFAULT_SORT = { battery: "battery_asc", updates: "ota" };

const OTA_ORDER = { updating: 0, available: 1, scheduled: 2, idle: 3 };

const DEVICE_ICON = {
  Router: "mdi:router-wireless",
  EndDevice: "mdi:chip",
  Coordinator: "mdi:access-point-network",
};

// Geräte-Bilder aus der Zigbee2MQTT-Dokumentation (dieselbe Quelle wie das Z2M-Frontend).
const IMAGE_BASE = "https://www.zigbee2mqtt.io/images/devices/";
// Ab dieser Zeit ohne Nachricht gilt ein Gerät ohne Z2M-Verfügbarkeit als "lange nicht gehört"
// (entspricht dem Standard-Timeout von Z2M für Batteriegeräte: 25 Stunden).
const STALE_AFTER_MS = 25 * 3600 * 1000;

function deviceImageUrl(d) {
  const custom = typeof d.icon === "string" ? d.icon.trim() : "";
  if (/^https?:\/\//i.test(custom)) return custom;
  if (!d.image_model) return "";
  return `${IMAGE_BASE}${encodeURIComponent(String(d.image_model).replace(/\//g, "-"))}.png`;
}

// --- Konfigurierbare Farben ---------------------------------------------
//
// Jede Farbgruppe entspricht einer CSS-Custom-Property, die _colorVars() pro
// Karteninstanz setzt. Leer/ungültig = fester Theme-Farbwert (fallback).
const COLOR_CONFIG_KEYS = {
  tab_active: { cssVar: "--zmm-color-tab-active", fallback: "var(--primary-color, #03a9f4)" },
  success: { cssVar: "--zmm-color-success", fallback: "var(--success-color, #43a047)" },
  warning: { cssVar: "--zmm-color-warning", fallback: "var(--warning-color, #ff9800)" },
  error: { cssVar: "--zmm-color-error", fallback: "var(--error-color, #db4437)" },
  info: { cssVar: "--zmm-color-info", fallback: "var(--info-color, #039be5)" },
  row_icon: { cssVar: "--zmm-color-row-icon", fallback: "var(--secondary-text-color, #727272)" },
  live_banner: {
    cssVar: "--zmm-color-live-banner",
    fallback: "var(--state-icon-active-color, #03a9f4)",
  },
};

// Erlaubte Zeichen für benutzerdefinierte Farbwerte, bevor sie in einen
// <style>-Block gelangen: Hex, rgb()/hsl(), var(--x, fallback), Farbwörter.
// Alles, was eine Deklaration oder das <style>-Tag verlassen könnte (; { } < >
// Anführungszeichen), wird verworfen und wie "nicht gesetzt" behandelt.
const SAFE_COLOR_RE = /^[a-zA-Z0-9#(),.%\-\s]+$/;

function sanitizeColor(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (!SAFE_COLOR_RE.test(trimmed)) {
    // eslint-disable-next-line no-console
    console.warn("zigbee2mqtt_manager: ungültiger Farbwert ignoriert:", value);
    return "";
  }
  return trimmed;
}

const CONFIG_DEFAULTS = {
  title: "Zigbee2MQTT Manager",
  // Nur bei mehreren Z2M-Instanzen: Karte fest an eine Instanz binden (Config-Entry-ID
  // oder Base-Topic). Leer = Umschalter in der Karte, sobald es mehrere Instanzen gibt.
  entry_id: "",
  base_topic: "",
  show_title: true,
  // Kategorien (Tabs) einzeln ein-/ausblendbar.
  show_devices: true,
  show_battery: true,
  show_updates: true,
  show_groups: true,
  show_bindings: true,
  show_bridge: true,
  default_tab: "devices",
  // Darstellung
  max_rows: 0, // 0 = alle Zeilen
  zoom: 1,
  show_stats: true,
  show_images: true,
  show_search: true,
  show_filter_bar: true,
  default_sort: DEFAULT_SORT,
  // Spalten der Geräteliste
  show_model: true,
  show_vendor: true,
  show_ieee: false,
  show_lqi: true,
  show_battery_value: true,
  show_last_seen: true,
  // Bearbeiten
  read_only: false,
  show_pairing: true,
  // Farben (leer = Theme-Standard)
  color_tab_active: "",
  color_success: "",
  color_warning: "",
  color_error: "",
  color_info: "",
  color_row_icon: "",
  color_live_banner: "",
  color_icon_devices: "",
  color_icon_battery: "",
  color_icon_updates: "",
  color_icon_groups: "",
  color_icon_bindings: "",
  color_icon_bridge: "",
};

function withDefaults(config) {
  return { ...CONFIG_DEFAULTS, ...(config || {}) };
}

function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

const esc = escapeHtml;

// --- Texte (Deutsch/Englisch, nach Home-Assistant-Sprache) -------------------

const I18N = {
  de: {
    connecting: "Verbinde …",
    error_generic: "Aktion fehlgeschlagen.",
    tab_devices: "Geräte", tab_battery: "Batterie", tab_updates: "Updates",
    tab_groups: "Gruppen", tab_bindings: "Bindings", tab_bridge: "Bridge",
    chip_devices: "Geräte", chip_offline: "Offline", chip_low_battery: "Batterie niedrig", chip_updates: "Updates",
    search: "Name, Modell oder IEEE suchen", sort: "Sortierung",
    sort_name_asc: "Name A–Z", sort_name_desc: "Name Z–A", sort_battery_asc: "Batterie (niedrig zuerst)",
    sort_lqi_asc: "Signal (schwach zuerst)", sort_last_seen_desc: "Zuletzt gesehen (neu zuerst)",
    sort_last_seen_asc: "Zuletzt gesehen (alt zuerst)", sort_ota: "Update-Status",
    no_data: "Noch keine Daten von Zigbee2MQTT. Läuft die Bridge?", no_results: "Keine Treffer.",
    show_more: "{n} weitere anzeigen",
    status_online: "Online (laut Zigbee2MQTT)", status_offline: "Offline (laut Zigbee2MQTT)", status_seen: "Vermutlich online – zuletzt gesehen {t}. Die Z2M-Verfügbarkeit ist nicht aktiv.", status_stale: "Lange nichts gehört – zuletzt gesehen {t}. Die Z2M-Verfügbarkeit ist nicht aktiv.", status_unknown: "Status unbekannt – noch keine Nachricht empfangen.",
    offline: "offline", online: "online", unknown: "unbekannt", inactive: "inaktiv", interviewing: "Interview", disabled: "deaktiviert",
    never: "noch nie", yes: "ja", no: "nein", close: "Schließen", save: "Speichern", add: "Hinzufügen", cancel: "Abbrechen",
    confirm: "Wirklich?", loading: "Lade …", details: "Details", remove: "Gerät entfernen", rename: "Umbenennen",
    group: "Gruppe",
    // Banner
    bridge_error: "Keine Verbindung zur Integration", bridge_offline: "Zigbee2MQTT-Bridge offline",
    bridge_offline_hint: "Die Bridge meldet sich nicht. Angezeigte Werte stammen aus dem Zwischenspeicher.",
    bridge_incompatible: "Zigbee2MQTT-Version nicht unterstützt",
    bridge_incompatible_hint: "Version {v} erkannt – benötigt wird Zigbee2MQTT 2.x.",
    pairing_active: "Pairing aktiv", pairing_start: "Pairing starten", pairing_stop: "Pairing beenden", until: "bis {time}",
    restart_required: "Neustart erforderlich", restart_required_hint: "Zigbee2MQTT meldet geänderte Optionen, die einen Neustart brauchen.",
    job_check: "Firmware-Prüfung läuft", job_update: "Firmware-Updates werden installiert",
    // Updates
    check_all: "Alle auf Updates prüfen", checking: "Prüfung gestartet …", update_all: "{n} Updates nacheinander installieren",
    update_all_hint: "Updates werden nacheinander installiert, nie parallel. Geräte sollten Strom haben und in Reichweite bleiben.",
    install: "Installieren", check: "Nach Update suchen", update_now: "Update installieren",
    ota_available: "Update verfügbar", ota_updating: "Wird aktualisiert", ota_scheduled: "Geplant", ota_idle: "Aktuell",
    ota_unknown: "Nicht geprüft", ota_unsupported: "Dieses Gerät unterstützt keine OTA-Updates.",
    update_confirm: "Während des Updates muss das Gerät Strom haben und in Reichweite bleiben.",
    update_found: "Update verfügbar", no_update: "Kein Update verfügbar", done_update: "Update abgeschlossen",
    // Gruppen
    group_name: "Name der neuen Gruppe", group_create: "Gruppe anlegen", group_delete: "Gruppe löschen", group_empty: "Diese Gruppe hat noch keine Mitglieder.",
    group_add_member: "Gerät hinzufügen", remove_member: "Aus Gruppe entfernen", no_groups: "Keine Gruppen vorhanden.",
    group_broadcast_hint: "Gruppen senden Befehle als Broadcast an alle Mitglieder gleichzeitig.", done_group: "Gruppe aktualisiert",
    no_groups_device: "Kein Mitglied einer Gruppe.",
    // Bindings
    no_bindings: "Keine Bindings vorhanden.", no_bindings_device: "Keine Bindings eingerichtet.",
    bindings_hint: "Bindings verknüpfen Geräte direkt (z. B. Schalter → Lampe) und funktionieren auch ohne Home Assistant.",
    bind: "Verknüpfen", unbind: "Lösen", bind_target: "Ziel (Gerät oder Gruppe)", pick_target: "Bitte ein Ziel wählen.",
    bind_hint: "Ohne Auswahl werden alle passenden Cluster verknüpft. Batteriegeräte vorher durch einen Tastendruck aufwecken.",
    done_bound: "Verknüpft", done_unbound: "Verknüpfung gelöst",
    // Bridge
    sec_app: "App-Version", f_integration_version: "Integration", f_card_version: "Karte", f_latest_version: "Neueste Version",
    app_up_to_date: "Aktuell", app_update_available: "Update verfügbar: {v}", app_check_failed: "Prüfung nicht möglich (GitHub nicht erreichbar)", app_not_checked: "noch nicht geprüft",
    f_checked: "Zuletzt geprüft", app_check_now: "Jetzt prüfen", app_checking: "Prüfe auf neue Version …", app_release: "Release ansehen",
    app_update_hint: "Aktualisiere über HACS (Integration) und starte Home Assistant neu. Danach den Browser neu laden (Strg+F5).",
    app_mismatch: "Karte ({card}) und Integration ({integration}) haben unterschiedliche Versionen. Browser-Cache leeren (Strg+F5) bzw. die App neu laden.",
    sec_status: "Status", sec_pairing: "Pairing", sec_options: "Bridge-Optionen", sec_maintenance: "Wartung", sec_events: "Ereignisse",
    f_status: "Status", f_version: "Zigbee2MQTT-Version", f_coordinator: "Koordinator", f_base_topic: "Base-Topic", f_pairing: "Pairing",
    pairing_hint: "Der Pairing-Modus bleibt höchstens 254 Sekunden aktiv.",
    opt_log_level: "Log-Level", opt_last_seen: "„Zuletzt gesehen“-Format",
    options_hint: "Änderungen werden sofort an Zigbee2MQTT gesendet. Manche Optionen brauchen einen Neustart.",
    done_bridge_option: "Option gespeichert", restart: "Bridge neu starten",
    restart_hint: "Startet nur Zigbee2MQTT neu. Das Zigbee-Netz ist währenddessen kurz nicht erreichbar.", done_restart: "Neustart angefordert",
    read_only_hint: "Die Karte ist schreibgeschützt.", no_events: "Noch keine Ereignisse seit dem Start.",
    ev_device_joined: "Beigetreten", ev_device_leave: "Hat das Netz verlassen", ev_device_interview: "Interview", ev_device_announce: "Meldet sich",
    ev_offline: "Offline", ev_online: "Wieder online", ev_battery_low: "Batterie niedrig", ev_update_available: "Update verfügbar",
    // Popup
    sec_info: "Informationen", sec_device_options: "Geräteoptionen", sec_firmware: "Firmware", sec_remove: "Gerät entfernen",
    new_name: "Neuer Name", rename_entities_hint: "Beim Umbenennen werden {n} Entitäten in Home Assistant mit angepasst:",
    done_renamed: "Umbenannt", done_options: "Optionen gespeichert", no_options: "Dieses Gerät hat keine einstellbaren Optionen.",
    options_device_hint: "Zigbee2MQTT speichert die Optionen in seiner Konfiguration.", no_changes: "Keine Änderungen.",
    remove_hint: "Entfernt das Gerät aus dem Zigbee-Netz. Es muss danach neu angelernt werden.",
    force_remove: "Erzwingen (auch wenn das Gerät nicht antwortet)", done_removed: "Gerät entfernt",
    f_vendor: "Hersteller", f_model: "Modell", f_description: "Beschreibung", f_type: "Typ", f_ieee: "IEEE-Adresse", f_nwk: "Netzwerkadresse",
    f_power: "Stromversorgung", f_firmware: "Firmware-Build", f_lqi: "Signalqualität", f_battery: "Batterie", f_voltage: "Spannung",
    f_available: "Erreichbar", f_last_seen: "Zuletzt gesehen",
    type_Router: "Router", type_EndDevice: "Endgerät",
    // Expose-Funktionen (Popup)
    sec_exposes: "Funktionen (Expose)", no_exposes: "Dieses Gerät meldet keine Funktionen.",
    exposes_hint: "Alle Funktionen, die Zigbee2MQTT für dieses Gerät bereitstellt, mit dem zuletzt bekannten Wert. Nur Anzeige.",
    exposes_filter: "Funktionen filtern …", exposes_none_match: "Keine Treffer.",
    ex_no_value: "noch kein Wert", ex_read: "Lesen", ex_write: "Schreiben", ex_get: "Abfragen",
    ex_config: "Konfiguration", ex_diagnostic: "Diagnose", ex_on: "an", ex_off: "aus",
    ex_range: "Bereich", ex_values: "Werte", ex_endpoint: "Endpunkt",
    ex_g_light: "Licht", ex_g_switch: "Schalter", ex_g_fan: "Lüfter", ex_g_cover: "Rollo", ex_g_lock: "Schloss", ex_g_climate: "Klima",
    // Mehrere Instanzen
    instance: "Instanz (Stick)",
  },
  en: {
    connecting: "Connecting …",
    error_generic: "Action failed.",
    tab_devices: "Devices", tab_battery: "Battery", tab_updates: "Updates",
    tab_groups: "Groups", tab_bindings: "Bindings", tab_bridge: "Bridge",
    chip_devices: "Devices", chip_offline: "Offline", chip_low_battery: "Low battery", chip_updates: "Updates",
    search: "Search name, model or IEEE", sort: "Sort",
    sort_name_asc: "Name A–Z", sort_name_desc: "Name Z–A", sort_battery_asc: "Battery (lowest first)",
    sort_lqi_asc: "Signal (weakest first)", sort_last_seen_desc: "Last seen (newest first)",
    sort_last_seen_asc: "Last seen (oldest first)", sort_ota: "Update status",
    no_data: "No data from Zigbee2MQTT yet. Is the bridge running?", no_results: "No matches.",
    show_more: "Show {n} more",
    status_online: "Online (per Zigbee2MQTT)", status_offline: "Offline (per Zigbee2MQTT)", status_seen: "Probably online – last seen {t}. Z2M availability is not enabled.", status_stale: "Not heard from in a long time – last seen {t}. Z2M availability is not enabled.", status_unknown: "Status unknown – no message received yet.",
    offline: "offline", online: "online", unknown: "unknown", inactive: "inactive", interviewing: "Interviewing", disabled: "disabled",
    never: "never", yes: "yes", no: "no", close: "Close", save: "Save", add: "Add", cancel: "Cancel",
    confirm: "Sure?", loading: "Loading …", details: "Details", remove: "Remove device", rename: "Rename",
    group: "Group",
    bridge_error: "No connection to the integration", bridge_offline: "Zigbee2MQTT bridge offline",
    bridge_offline_hint: "The bridge is not responding. Values shown come from the cache.",
    bridge_incompatible: "Zigbee2MQTT version not supported",
    bridge_incompatible_hint: "Detected version {v} – Zigbee2MQTT 2.x is required.",
    pairing_active: "Pairing active", pairing_start: "Start pairing", pairing_stop: "Stop pairing", until: "until {time}",
    restart_required: "Restart required", restart_required_hint: "Zigbee2MQTT reports changed options that need a restart.",
    job_check: "Firmware check running", job_update: "Installing firmware updates",
    check_all: "Check all for updates", checking: "Check started …", update_all: "Install {n} updates one by one",
    update_all_hint: "Updates are installed one after another, never in parallel. Devices should stay powered and in range.",
    install: "Install", check: "Check for update", update_now: "Install update",
    ota_available: "Update available", ota_updating: "Updating", ota_scheduled: "Scheduled", ota_idle: "Up to date",
    ota_unknown: "Not checked", ota_unsupported: "This device does not support OTA updates.",
    update_confirm: "While updating, the device must stay powered and within range.",
    update_found: "Update available", no_update: "No update available", done_update: "Update finished",
    group_name: "Name of the new group", group_create: "Create group", group_delete: "Delete group", group_empty: "This group has no members yet.",
    group_add_member: "Add device", remove_member: "Remove from group", no_groups: "No groups yet.",
    group_broadcast_hint: "Groups send commands as a broadcast to all members at once.", done_group: "Group updated",
    no_groups_device: "Not a member of any group.",
    no_bindings: "No bindings.", no_bindings_device: "No bindings set up.",
    bindings_hint: "Bindings link devices directly (e.g. switch → light) and work even without Home Assistant.",
    bind: "Bind", unbind: "Unbind", bind_target: "Target (device or group)", pick_target: "Please pick a target.",
    bind_hint: "Without a selection all matching clusters are bound. Wake battery devices first by pressing a button.",
    done_bound: "Bound", done_unbound: "Binding removed",
    sec_app: "App version", f_integration_version: "Integration", f_card_version: "Card", f_latest_version: "Latest version",
    app_up_to_date: "Up to date", app_update_available: "Update available: {v}", app_check_failed: "Check failed (GitHub not reachable)", app_not_checked: "not checked yet",
    f_checked: "Last checked", app_check_now: "Check now", app_checking: "Checking for a new version …", app_release: "View release",
    app_update_hint: "Update via HACS (integration) and restart Home Assistant. Then reload the browser (Ctrl+F5).",
    app_mismatch: "Card ({card}) and integration ({integration}) have different versions. Clear the browser cache (Ctrl+F5) or reload the app.",
    sec_status: "Status", sec_pairing: "Pairing", sec_options: "Bridge options", sec_maintenance: "Maintenance", sec_events: "Events",
    f_status: "Status", f_version: "Zigbee2MQTT version", f_coordinator: "Coordinator", f_base_topic: "Base topic", f_pairing: "Pairing",
    pairing_hint: "Pairing mode stays active for 254 seconds at most.",
    opt_log_level: "Log level", opt_last_seen: "“Last seen” format",
    options_hint: "Changes are sent to Zigbee2MQTT right away. Some options need a restart.",
    done_bridge_option: "Option saved", restart: "Restart bridge",
    restart_hint: "Restarts Zigbee2MQTT only. The Zigbee network is briefly unreachable.", done_restart: "Restart requested",
    read_only_hint: "This card is read-only.", no_events: "No events since startup.",
    ev_device_joined: "Joined", ev_device_leave: "Left the network", ev_device_interview: "Interview", ev_device_announce: "Announced",
    ev_offline: "Offline", ev_online: "Back online", ev_battery_low: "Battery low", ev_update_available: "Update available",
    sec_info: "Information", sec_device_options: "Device options", sec_firmware: "Firmware", sec_remove: "Remove device",
    new_name: "New name", rename_entities_hint: "Renaming also updates {n} entities in Home Assistant:",
    done_renamed: "Renamed", done_options: "Options saved", no_options: "This device has no configurable options.",
    options_device_hint: "Zigbee2MQTT stores these options in its configuration.", no_changes: "No changes.",
    remove_hint: "Removes the device from the Zigbee network. It has to be paired again afterwards.",
    force_remove: "Force (even if the device does not respond)", done_removed: "Device removed",
    f_vendor: "Vendor", f_model: "Model", f_description: "Description", f_type: "Type", f_ieee: "IEEE address", f_nwk: "Network address",
    f_power: "Power source", f_firmware: "Firmware build", f_lqi: "Link quality", f_battery: "Battery", f_voltage: "Voltage",
    f_available: "Reachable", f_last_seen: "Last seen",
    type_Router: "Router", type_EndDevice: "End device",
    sec_exposes: "Features (exposes)", no_exposes: "This device reports no features.",
    exposes_hint: "All features Zigbee2MQTT exposes for this device, with the last known value. Display only.",
    exposes_filter: "Filter features …", exposes_none_match: "No matches.",
    ex_no_value: "no value yet", ex_read: "Read", ex_write: "Write", ex_get: "Query",
    ex_config: "Configuration", ex_diagnostic: "Diagnostic", ex_on: "on", ex_off: "off",
    ex_range: "Range", ex_values: "Values", ex_endpoint: "Endpoint",
    ex_g_light: "Light", ex_g_switch: "Switch", ex_g_fan: "Fan", ex_g_cover: "Cover", ex_g_lock: "Lock", ex_g_climate: "Climate",
    instance: "Instance (stick)",
  },
};

// --- Styles -----------------------------------------------------------------

const BASE_CARD_STYLES = `
  ha-card { overflow: hidden; }
  /* container-type: die Tab-Leiste reagiert auf die Breite DIESER Karte statt
     auf das Browserfenster (siehe TABS_CONTAINER_QUERY_STYLES). */
  .card-content { padding: 8px 16px 16px; container-type: inline-size; container-name: zmm; }
  .empty { padding: 24px 0; text-align: center; color: var(--secondary-text-color, #727272); }
  .hint { font-size: 0.82em; color: var(--secondary-text-color, #727272); margin: 4px 0; }
  .hint.warn { color: var(--zmm-color-warning); }
  .hint.err { color: var(--zmm-color-error); }
  .muted { color: var(--secondary-text-color, #727272); }
  button { font: inherit; color: inherit; cursor: pointer; }
  button:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible,
  .row.clickable:focus-visible { outline: 2px solid var(--zmm-color-tab-active); outline-offset: 1px; }

  /* Schaltflächen */
  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    border: 1px solid var(--divider-color, #e0e0e0); border-radius: 6px;
    padding: 6px 10px; background: none; color: var(--primary-text-color, #212121);
    font: inherit; font-size: 0.85em; cursor: pointer; --mdc-icon-size: 18px;
  }
  .btn:hover:not([disabled]) { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }
  .btn[disabled] { opacity: 0.45; cursor: default; }
  .btn.primary { background: var(--zmm-color-tab-active); border-color: var(--zmm-color-tab-active); color: var(--text-primary-color, #fff); }
  .btn.primary:hover:not([disabled]) { filter: brightness(1.08); background: var(--zmm-color-tab-active); }
  .btn.danger { color: var(--zmm-color-error); border-color: var(--zmm-color-error); }
  .btn.small { padding: 3px 8px; font-size: 0.78em; --mdc-icon-size: 16px; }
  .btn.icon { padding: 4px; border: none; --mdc-icon-size: 20px; color: var(--secondary-text-color, #727272); }
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 4px 0 8px; }
  .toolbar .spacer { flex: 1 1 auto; }

  /* Live-Banner (Pairing, Firmware-Auftrag, Bridge offline) */
  .live-banner {
    display: flex; align-items: center; gap: 12px; padding: 10px 12px; margin-bottom: 12px;
    border-radius: 8px; background: var(--zmm-color-live-banner); color: var(--text-primary-color, #fff);
  }
  .live-banner.error { background: var(--zmm-color-error); }
  .live-banner.warn { background: var(--zmm-color-warning); }
  .live-banner ha-icon { --mdc-icon-size: 28px; flex-shrink: 0; }
  .live-banner-text { display: flex; flex-direction: column; min-width: 0; flex: 1 1 auto; }
  .live-state { font-weight: 600; }
  .live-detail { font-size: 0.9em; opacity: 0.9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .live-banner .btn { color: inherit; border-color: rgba(255,255,255,0.6); }
  .live-banner .btn:hover:not([disabled]) { background: rgba(255,255,255,0.18); }

  /* Kategorie-Leiste */
  .tabs { display: flex; gap: 4px; margin-bottom: 8px; border-bottom: 1px solid var(--divider-color, #e0e0e0); overflow-x: auto; }
  .tab {
    display: flex; align-items: center; gap: 6px; flex: 1 1 auto; min-width: 0; justify-content: center;
    background: none; border: none; border-bottom: 2px solid transparent; padding: 8px 6px;
    cursor: pointer; color: var(--secondary-text-color, #727272); font: inherit; white-space: nowrap;
  }
  .tab ha-icon { --mdc-icon-size: 20px; flex-shrink: 0; }
  .tab.active { color: var(--zmm-color-tab-active); border-bottom-color: var(--zmm-color-tab-active); font-weight: 600; }
  .tab span { font-size: 0.8em; overflow: hidden; text-overflow: ellipsis; }
  .tab .count {
    font-size: 0.7em; min-width: 16px; padding: 0 5px; border-radius: 8px; text-align: center;
    background: var(--zmm-color-error); color: var(--text-primary-color, #fff); font-weight: 600;
  }
  .tab .count.info { background: var(--zmm-color-info); }
  .tab .count.warn { background: var(--zmm-color-warning); }

  /* Statistik-Chips + Filter-/Sortierleiste */
  .chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 0 8px; }
  .chip {
    display: inline-flex; align-items: baseline; gap: 6px; border: 1px solid var(--divider-color, #e0e0e0);
    background: none; border-radius: 12px; padding: 3px 10px; font-size: 0.8em; color: var(--secondary-text-color, #727272);
  }
  .chip b { font-size: 1.15em; font-weight: 600; color: var(--c, var(--primary-text-color, #212121)); }
  .chip.on { background: var(--secondary-background-color, rgba(0,0,0,0.04)); border-color: var(--c, var(--zmm-color-tab-active)); }
  .filter-bar {
    display: flex; flex-wrap: wrap; column-gap: 16px; row-gap: 6px; align-items: center;
    padding: 4px 0 10px; margin-bottom: 4px; border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }
  .filter-bar-field { display: flex; align-items: center; gap: 6px; font-size: 0.8em; color: var(--secondary-text-color, #727272); }
  .filter-bar-field select, .filter-bar-field input[type="search"], .field input, .field select {
    font: inherit; font-size: 1em; color: var(--primary-text-color, #212121);
    background: var(--card-background-color, #fff); border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px; padding: 5px 8px; box-sizing: border-box;
  }
  .filter-bar-field select { max-width: 170px; }
  .filter-bar-field.grow { flex: 1 1 160px; }
  .filter-bar-field.grow input { flex: 1 1 auto; min-width: 0; }

  /* Zeilenliste */
  .rows { display: flex; flex-direction: column; }
  .row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--divider-color, #e0e0e0); }
  .row:last-child { border-bottom: none; }
  .row.clickable { cursor: pointer; }
  .row.clickable:hover { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }
  .row-icon { flex-shrink: 0; color: var(--zmm-color-row-icon); --mdc-icon-size: 22px; position: relative; display: inline-flex; }
  .row-icon .dot {
    position: absolute; right: -3px; bottom: -3px; width: 10px; height: 10px; border-radius: 50%;
    border: 2px solid var(--card-background-color, #fff); background: var(--disabled-text-color, #9e9e9e);
    box-sizing: content-box;
  }
  .row-icon .dot.on { background: var(--zmm-color-success); }
  .row-icon .dot.off { background: var(--zmm-color-error); }
  /* Ohne Z2M-Verfügbarkeit: aus "zuletzt gesehen" abgeleitet (Tooltip erklärt es) */
  .row-icon .dot.seen { background: var(--zmm-color-success); opacity: 0.6; }
  .row-icon .dot.stale { background: var(--zmm-color-warning); }
  .row-icon.has-image { width: 40px; height: 40px; align-items: center; justify-content: center; }
  ha-icon[hidden] { display: none; }
  .row-icon .dev-img { width: 40px; height: 40px; object-fit: contain; border-radius: 6px; }
  .popup-head .dev-img { width: 32px; height: 32px; object-fit: contain; border-radius: 6px; flex-shrink: 0; }
  .row-main { flex: 1 1 auto; min-width: 0; }
  .row-primary { display: flex; align-items: center; gap: 6px; }
  .row-name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row-secondary { display: flex; gap: 8px; font-size: 0.85em; color: var(--secondary-text-color, #727272); overflow: hidden; white-space: nowrap; }
  .row-secondary span { overflow: hidden; text-overflow: ellipsis; }
  .row-extra { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 0.8em; color: var(--secondary-text-color, #727272); text-align: right; }
  .badge {
    font-size: 0.7em; padding: 0 6px; border-radius: 8px; white-space: nowrap;
    border: 1px solid var(--c, var(--divider-color, #e0e0e0)); color: var(--c, var(--secondary-text-color, #727272));
  }
  .pill {
    display: inline-block; padding: 1px 9px; border-radius: 10px; font-size: 0.85em; white-space: nowrap;
    border: 1px solid var(--c, var(--divider-color, #e0e0e0)); color: var(--c, var(--secondary-text-color, #727272));
  }
  .bar { display: inline-block; width: 56px; height: 8px; border-radius: 4px; background: var(--divider-color, #e0e0e0); vertical-align: middle; margin-right: 6px; overflow: hidden; }
  .bar > span { display: block; height: 100%; border-radius: 4px; }
  .more { display: flex; justify-content: center; padding: 8px 0 0; }

  /* Einstellungen-/Bridge-Ansicht und Akkordeons (wie bei fritzbox-anrufe) */
  .settings-view { display: flex; flex-direction: column; gap: 10px; }
  .settings-accordion { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 8px; overflow: hidden; }
  .settings-accordion-summary {
    display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer;
    font-weight: 600; list-style: none; user-select: none; --mdc-icon-size: 20px;
  }
  .settings-accordion-summary > ha-icon:first-child { color: var(--secondary-text-color, #727272); }
  .settings-accordion-summary::-webkit-details-marker { display: none; }
  .settings-accordion-summary::marker { display: none; }
  .settings-accordion-summary .grow { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .settings-accordion-summary .meta { font-weight: 400; font-size: 0.85em; color: var(--secondary-text-color, #727272); }
  .settings-accordion-summary::after {
    content: ""; margin-left: auto; width: 8px; height: 8px; flex-shrink: 0;
    border-right: 2px solid var(--secondary-text-color, #727272); border-bottom: 2px solid var(--secondary-text-color, #727272);
    transform: rotate(45deg); transition: transform 0.15s ease;
  }
  .settings-accordion-summary:has(.meta)::after { margin-left: 4px; }
  .settings-accordion[open] > .settings-accordion-summary::after { transform: rotate(-135deg); }
  .settings-accordion-body { padding: 0 12px 10px; }
  .settings-accordion.update { border-color: var(--zmm-color-warning); }
  .settings-accordion.update > .settings-accordion-summary { color: var(--zmm-color-warning); }
  a.btn { text-decoration: none; display: inline-flex; align-items: center; }
  .settings-accordion.danger { border-color: var(--zmm-color-error); }
  .settings-accordion.danger > .settings-accordion-summary { color: var(--zmm-color-error); }

  .settings-line {
    display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 7px 0;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }
  .settings-line:last-child { border-bottom: none; }
  .settings-label { color: var(--secondary-text-color, #727272); }
  /* Expose-Funktionen im Geräte-Popup */
  .ex-list { display: flex; flex-direction: column; max-height: 380px; overflow-y: auto; }
  .ex-group { font-size: 0.8em; font-weight: 600; color: var(--secondary-text-color, #727272); padding: 10px 0 2px; }
  .ex-group:first-child { padding-top: 2px; }
  .ex-row { padding: 6px 0; border-bottom: 1px solid var(--divider-color, #e0e0e0); }
  .ex-row[hidden], .ex-group[hidden] { display: none; }
  .ex-top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .ex-label { font-weight: 500; }
  .ex-prop { font-size: 0.78em; margin-left: 6px; color: var(--secondary-text-color, #727272); word-break: break-all; }
  .ex-value { font-weight: 500; text-align: right; word-break: break-word; }
  .ex-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 3px 6px; margin-top: 3px; font-size: 0.75em; color: var(--secondary-text-color, #727272); }
  .ex-meta .pill { font-size: 0.95em; padding: 0 7px; }
  .ex-desc { font-size: 0.75em; color: var(--secondary-text-color, #727272); margin-top: 2px; }
  /* Umschalter bei mehreren Zigbee2MQTT-Instanzen */
  .instance-bar { display: flex; align-items: center; gap: 8px; padding: 0 0 8px; font-size: 0.85em; color: var(--secondary-text-color, #727272); }
  .instance-bar ha-icon { --mdc-icon-size: 20px; }
  .instance-bar select {
    flex: 1 1 auto; min-width: 0; font: inherit; font-size: 1em; color: var(--primary-text-color, #212121);
    background: var(--card-background-color, #fff); border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px; padding: 5px 8px; box-sizing: border-box;
  }
  .settings-value { font-weight: 500; text-align: right; word-break: break-word; }
  .field { display: flex; flex-direction: column; gap: 4px; padding: 6px 0; }
  .field label { font-size: 0.85em; color: var(--primary-text-color, #212121); }
  .field .help { font-size: 0.75em; color: var(--secondary-text-color, #727272); }
  .field.inline { flex-direction: row; align-items: center; gap: 8px; }
  .field-row { display: flex; gap: 8px; align-items: center; }
  .field-row input { flex: 1 1 auto; min-width: 0; }
  .clusters { display: flex; flex-wrap: wrap; gap: 4px 12px; padding: 4px 0; font-size: 0.85em; }
  .clusters label { display: inline-flex; align-items: center; gap: 4px; }
  .timeline { display: flex; flex-direction: column; max-height: 320px; overflow-y: auto; }
  .timeline-item { display: flex; gap: 10px; padding: 5px 0; border-bottom: 1px solid var(--divider-color, #e0e0e0); font-size: 0.9em; align-items: center; --mdc-icon-size: 18px; }
  .timeline-item:last-child { border-bottom: none; }
  .timeline-item .when { margin-left: auto; color: var(--secondary-text-color, #727272); font-size: 0.85em; white-space: nowrap; }

  /* Detail-Popup */
  .popup-backdrop {
    position: fixed; inset: 0; z-index: 20; display: flex; align-items: center; justify-content: center;
    padding: 16px; background: rgba(0, 0, 0, 0.45);
  }
  .popup-backdrop[hidden] { display: none; }
  .popup {
    background: var(--card-background-color, var(--ha-card-background, #fff)); color: var(--primary-text-color, #212121);
    border-radius: var(--ha-card-border-radius, 12px); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    width: min(440px, 100%); max-height: 86vh; overflow-y: auto;
  }
  .popup-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--divider-color, #e0e0e0); position: sticky; top: 0; background: inherit; z-index: 1; }
  .popup-title { flex: 1; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .popup-close { border: none; background: transparent; cursor: pointer; color: var(--secondary-text-color, #727272); padding: 2px; display: inline-flex; }
  .popup-body { padding: 10px 14px 14px; display: flex; flex-direction: column; gap: 8px; }

  /* Hinweis-Toast */
  .toast {
    position: fixed; left: 50%; bottom: 24px; transform: translate(-50%, 16px); opacity: 0; pointer-events: none; z-index: 30;
    padding: 10px 18px; border-radius: 8px; background: var(--primary-text-color, #212121); color: var(--card-background-color, #fff);
    font-size: 0.88em; max-width: 90vw; transition: opacity 0.2s, transform 0.2s;
  }
  .toast.show { opacity: 1; transform: translate(-50%, 0); }
  .toast.error { background: var(--zmm-color-error); color: #fff; }
  @media (prefers-reduced-motion: reduce) { .toast, .settings-accordion-summary::after { transition: none; } }
`;

// Unterhalb ~480 px Kartenbreite wird auf reine Icons umgeschaltet (Tooltip via
// title="..."), statt Beschriftungen mitten im Wort abzuschneiden.
const TABS_CONTAINER_QUERY_STYLES = `
  @container zmm (max-width: 480px) {
    .tab span.lbl { display: none; }
    .tab ha-icon { --mdc-icon-size: 22px; }
    .row-extra .optional { display: none; }
  }
`;

// --- Hilfsfunktionen --------------------------------------------------------

function batteryIcon(b) {
  if (b === null || b === undefined) return "mdi:battery-unknown";
  if (b >= 95) return "mdi:battery";
  if (b < 5) return "mdi:battery-alert-variant-outline";
  return `mdi:battery-${Math.max(10, Math.round(b / 10) * 10)}`;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// --- Karte ------------------------------------------------------------------

class Zigbee2MqttManagerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = null;
    this._data = null;
    this._error = null;
    this._unsub = null;
    this._subscribing = false;
    // Reiner UI-Laufzeitstatus (geht bei Config-Änderung/Reload verloren)
    this._tab = "devices";
    this._filter = "all";
    this._sort = {};
    this._expanded = false;
    this._selected = null;
    this._drafts = {};
    this._open = {};
    this._details = {};
    this._confirming = null;
    this._lastSig = null;
    this._popupSig = null;
    this._built = false;
  }

  // ----------------------------------------------------------------- Lebenszyklus
  setConfig(config) {
    if (!config) throw new Error("zigbee2mqtt-manager-card: Konfiguration fehlt.");
    this._config = withDefaults(config);
    const visible = this._visibleTabs();
    this._tab = visible.includes(this._config.default_tab) ? this._config.default_tab : visible[0] || "devices";
    this._filter = "all";
    this._sort = {};
    this._expanded = false;
    if (!this._built) this._build();
    // Wurde die Karte (z. B. im Editor) an eine andere Instanz gebunden: neu verbinden
    if (this._unsub && this._subKey !== JSON.stringify(this._targetParams())) this._resubscribe();
    this._lastSig = null;
    this._render();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) {
      this._subscribe();
      this._lastSig = null;
      this._render();
    }
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    if (this._hass && !this._unsub) this._subscribe();
  }

  disconnectedCallback() {
    if (this._unsub) {
      this._unsub();
      this._unsub = null;
    }
    clearTimeout(this._toastTimer);
    clearTimeout(this._confirmTimer);
    clearTimeout(this._exTimer);
    this._exTimer = null;
  }

  getCardSize() {
    return 8;
  }

  static getConfigElement() {
    return document.createElement("zigbee2mqtt-manager-card-editor");
  }

  static getStubConfig() {
    return { ...CONFIG_DEFAULTS };
  }

  // ----------------------------------------------------------------- Texte
  get _lang() {
    return (this._hass?.language || "en").slice(0, 2);
  }

  _t(key, vars) {
    const table = I18N[this._lang] || I18N.en;
    let text = table[key] ?? I18N.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
    return text;
  }

  // ----------------------------------------------------------------- Verbindung
  // Instanz, auf die sich alle Befehle der Karte beziehen
  _targetParams() {
    const c = this._config || {};
    if (c.entry_id) return { entry_id: c.entry_id };
    if (c.base_topic) return { base_topic: c.base_topic };
    if (this._instance) return { entry_id: this._instance };
    return {};
  }

  _fixedInstance() {
    return Boolean(this._config?.entry_id || this._config?.base_topic);
  }

  // Bei mehreren Instanzen ohne feste Bindung: Liste holen und eine vorauswählen
  async _ensureInstances() {
    if (this._instancesLoaded || this._fixedInstance() || !this._hass) return;
    this._instancesLoaded = true;
    try {
      const list = await this._hass.callWS({ type: "zigbee2mqtt_manager/instances" });
      const loaded = (Array.isArray(list) ? list : []).filter((i) => i.loaded);
      this._instances = loaded;
      if (loaded.length > 1) {
        let stored = null;
        try {
          stored = window.localStorage.getItem("zigbee2mqtt_manager_instance");
        } catch (_e) {
          /* Speicher nicht verfügbar */
        }
        this._instance = loaded.some((i) => i.entry_id === stored) ? stored : loaded[0].entry_id;
      }
    } catch (_e) {
      /* ohne Liste verhält sich die Karte wie bisher (erste Instanz) */
    }
  }

  _resubscribe() {
    this._gen = (this._gen || 0) + 1;
    if (this._unsub) {
      this._unsub();
      this._unsub = null;
    }
    this._subscribe();
  }

  _switchInstance(entryId) {
    if (!entryId || entryId === this._instance) return;
    this._instance = entryId;
    try {
      window.localStorage.setItem("zigbee2mqtt_manager_instance", entryId);
    } catch (_e) {
      /* Speicher nicht verfügbar */
    }
    this._data = null;
    this._error = null;
    this._details = {};
    this._drafts = {};
    this._selected = null;
    this._confirming = null;
    this._expanded = false;
    this._filter = "all";
    this._popupSig = null;
    const backdrop = this.shadowRoot?.getElementById("backdrop");
    if (backdrop) backdrop.hidden = true;
    this._resubscribe();
    this._refresh();
  }

  async _subscribe() {
    if (this._subscribing || this._unsub || !this._hass) return;
    this._subscribing = true;
    const gen = (this._gen = this._gen || 0);
    try {
      await this._ensureInstances();
      const params = this._targetParams();
      const unsub = await this._hass.connection.subscribeMessage(
        (ev) => {
          if (gen === this._gen) this._onEvent(ev);
        },
        { type: "zigbee2mqtt_manager/subscribe", ...params }
      );
      if (!this.isConnected || gen !== this._gen) {
        unsub();
      } else {
        this._unsub = unsub;
        this._subKey = JSON.stringify(params);
        this._error = null;
      }
    } catch (err) {
      if (gen === this._gen) {
        this._error = err?.message || String(err);
        this._lastSig = null;
        this._render();
      }
    } finally {
      this._subscribing = false;
      // Während des Verbindens wurde die Instanz gewechselt: mit dem neuen Ziel nachholen
      if (gen !== this._gen && this.isConnected && !this._unsub) this._subscribe();
    }
  }

  _onEvent(ev) {
    if (ev.kind === "update") {
      this._data = ev.data;
      this._renderIfChanged();
      this._maybeRefreshExposes();
    } else if (ev.kind === "response") {
      this._onResponse(ev.data);
    }
  }

  _onResponse(r) {
    if (r.status === "error") {
      this._toast(r.error || this._t("error_generic"), true);
      return;
    }
    const topic = r.topic || "";
    let msg = null;
    if (topic === "device/rename") msg = this._t("done_renamed");
    else if (topic === "device/options") {
      msg = this._t("done_options");
      this._reloadDetails();
    } else if (topic === "device/ota_update/update") msg = this._t("done_update");
    else if (topic === "device/ota_update/check")
      msg = r.data?.updateAvailable ? this._t("update_found") : this._t("no_update");
    else if (topic === "device/remove") msg = this._t("done_removed");
    else if (topic === "device/bind") msg = this._t("done_bound");
    else if (topic === "device/unbind") msg = this._t("done_unbound");
    else if (topic.startsWith("group/")) msg = this._t("done_group");
    else if (topic === "options") msg = this._t("done_bridge_option");
    else if (topic === "restart") msg = this._t("done_restart");
    if (msg) this._toast(msg);
    if (topic === "device/rename") this._reloadDetails();
  }

  _toast(message, error = false) {
    const el = this.shadowRoot.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.className = "toast show" + (error ? " error" : "");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.className = "toast";
    }, 5000);
  }

  async _call(action, params = {}) {
    if (!this._hass) return false;
    const msg = { type: "zigbee2mqtt_manager/action", action, ...params, ...this._targetParams() };
    try {
      await this._hass.callWS(msg);
      return true;
    } catch (err) {
      this._toast(err?.message || String(err), true);
      return false;
    }
  }

  // silent: vorhandene Details bleiben sichtbar, während neue geladen werden
  async _loadDetails(ieee, force = false, silent = false) {
    if (!ieee || (!force && this._details[ieee])) return;
    const gen = this._gen;
    if (!(silent && this._details[ieee] && !this._details[ieee].loading)) this._details[ieee] = { loading: true };
    this._exSeen = { ...(this._exSeen || {}), [ieee]: this._lastSeenOf(ieee) };
    try {
      const result = await this._hass.callWS({ type: "zigbee2mqtt_manager/details", ieee, ...this._targetParams() });
      if (gen === this._gen) this._details[ieee] = result;
    } catch (err) {
      if (gen === this._gen) this._details[ieee] = { error: err?.message || String(err) };
    }
    this._renderPopup(true);
  }

  _lastSeenOf(ieee) {
    return this._data?.devices?.find((x) => x.ieee === ieee)?.last_seen ?? null;
  }

  // Offenes Popup mit geöffnetem Funktionen-Abschnitt: Werte nachladen, sobald das
  // Gerät etwas gesendet hat (höchstens alle 3 Sekunden)
  _maybeRefreshExposes() {
    const ieee = this._selected;
    if (!ieee || !this._open["p:exposes"] || this._exTimer) return;
    const d = this._data?.devices?.find((x) => x.ieee === ieee);
    if (!d?.has_exposes || d.last_seen === this._exSeen?.[ieee]) return;
    this._exTimer = setTimeout(() => {
      this._exTimer = null;
      if (this._selected === ieee) this._loadDetails(ieee, true, true);
    }, 3000);
  }

  _reloadDetails() {
    if (this._selected) this._loadDetails(this._selected, true);
  }

  // ----------------------------------------------------------------- Konfiguration
  _visibleTabs() {
    const cfg = this._config || CONFIG_DEFAULTS;
    const tabs = TAB_ORDER.filter((tab) => cfg[`show_${tab}`] !== false);
    return tabs.length ? tabs : ["devices"];
  }

  get _readOnly() {
    return !!this._config?.read_only;
  }

  _colorVars() {
    const cfg = this._config || {};
    return Object.entries(COLOR_CONFIG_KEYS)
      .map(([key, { cssVar, fallback }]) => `${cssVar}: ${sanitizeColor(cfg[`color_${key}`]) || fallback};`)
      .join("\n        ");
  }

  _styles() {
    return `
      :host { ${this._colorVars()} display: block; }
      ${BASE_CARD_STYLES}
      ${TABS_CONTAINER_QUERY_STYLES}
      @media (max-width: 500px) {
        .card-content { padding: 4px 10px 10px; }
        .tab span.lbl { display: none; }
        .tab ha-icon { --mdc-icon-size: 24px; }
      }
    `;
  }

  _cardZoom() {
    const z = Number(this._config?.zoom);
    return Number.isFinite(z) && z >= 0.5 && z <= 3 ? z : 1;
  }

  // Symbolfarbe einer Zeile: color_row_icon > Kategorie-Farbe > Standard
  _rowIconColor(tab) {
    const cfg = this._config || {};
    const own = sanitizeColor(cfg.color_row_icon);
    if (own) return own;
    return sanitizeColor(cfg[CATEGORY_ICON_COLOR_KEYS[tab]]) || "";
  }

  // ----------------------------------------------------------------- Aufbau
  _build() {
    this._built = true;
    const root = this.shadowRoot;
    root.innerHTML = `
      <style id="base"></style>
      <div id="content"></div>
      <div class="popup-backdrop" id="backdrop" hidden><div class="popup" id="popup" role="dialog" aria-modal="true"></div></div>
      <div class="toast" id="toast" role="status"></div>`;
    this._styleEl = root.getElementById("base");
    this._contentEl = root.getElementById("content");

    // Ladefehler von Gerätebildern (error bubbelt nicht -> Capture): Bild entfernen, Symbol zeigen
    this._imgFailed = this._imgFailed || new Set();
    root.addEventListener(
      "error",
      (e) => {
        const img = e.target;
        if (!img || img.tagName !== "IMG" || !img.classList.contains("dev-img")) return;
        this._imgFailed.add(img.getAttribute("src"));
        const holder = img.closest(".row-icon, .popup-head");
        img.remove();
        if (holder) {
          holder.classList.remove("has-image");
          const icon = holder.querySelector("ha-icon");
          if (icon) icon.hidden = false;
        }
      },
      true
    );

    root.addEventListener("click", (e) => this._onClick(e));
    root.addEventListener("input", (e) => this._onInput(e));
    root.addEventListener("change", (e) => this._onChange(e));
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._selected) this._closePopup();
      if ((e.key === "Enter" || e.key === " ") && e.target.matches?.(".row.clickable")) {
        e.preventDefault();
        e.target.click();
      }
    });
  }

  // ----------------------------------------------------------------- Rendern
  _signature() {
    return JSON.stringify([this._data, this._error, this._confirming, this._selected]);
  }

  _renderIfChanged() {
    const sig = this._signature();
    if (sig === this._lastSig) return;
    this._lastSig = sig;
    this._render();
  }

  // Erzwingt Neuzeichnen (nach reinen UI-Zustandsänderungen)
  _refresh() {
    this._lastSig = null;
    this._render();
  }

  _captureFocus() {
    const el = this.shadowRoot.activeElement;
    if (!el || !el.dataset || !el.dataset.fk) return null;
    return { fk: el.dataset.fk, start: el.selectionStart, end: el.selectionEnd };
  }

  _restoreFocus(f) {
    if (!f) return;
    const el = this.shadowRoot.querySelector(`[data-fk="${CSS.escape(f.fk)}"]`);
    if (!el) return;
    el.focus();
    try {
      if (f.start !== null && f.start !== undefined) el.setSelectionRange(f.start, f.end);
    } catch (_e) {
      /* nicht jedes Eingabefeld unterstützt Selektion */
    }
  }

  _render() {
    if (!this._config || !this._built) return;
    const focus = this._captureFocus();
    const visible = this._visibleTabs();
    if (!visible.includes(this._tab)) this._tab = visible[0];

    this._styleEl.textContent = this._styles();
    this._contentEl.style.zoom = this._cardZoom();

    const title = String(this._config.title ?? "").trim();
    const headerAttr = this._config.show_title === false || !title ? "" : ` header="${esc(title)}"`;
    this._contentEl.innerHTML = `
      <ha-card${headerAttr}>
        <div class="card-content">
          ${this._renderInstanceBar()}
          ${this._renderBanners()}
          ${this._renderTabs(visible)}
          ${this._renderMain()}
        </div>
      </ha-card>`;

    // <details> merkt sich seinen Zustand selbst; wir speichern ihn nur, damit
    // er ein Neuzeichnen überlebt (kein _render() hier, sonst Endlosschleife).
    this.shadowRoot.querySelectorAll("details[data-k]").forEach((d) => {
      d.addEventListener("toggle", () => {
        this._open[d.dataset.k] = d.open;
      });
    });

    this._restoreFocus(focus);
    this._renderPopup();
  }

  _isOpen(key, dflt = false) {
    return key in this._open ? this._open[key] : dflt;
  }

  // ----------------------------------------------------------------- Instanz-Umschalter
  _renderInstanceBar() {
    if (this._fixedInstance() || !this._instance || (this._instances || []).length < 2) return "";
    return `<div class="instance-bar"><ha-icon icon="mdi:usb-port"></ha-icon>
      <select data-change="instance" data-fk="instance" aria-label="${esc(this._t("instance"))}" title="${esc(this._t("instance"))}">${this._instances
        .map(
          (i) =>
            `<option value="${esc(i.entry_id)}" ${i.entry_id === this._instance ? "selected" : ""}>${esc(i.base_topic || i.title)}</option>`
        )
        .join("")}</select></div>`;
  }

  // ----------------------------------------------------------------- Banner & Tabs
  _renderBanners() {
    const b = this._data?.bridge;
    const jobs = this._data?.jobs?.ota;
    const out = [];
    const banner = (cls, icon, title, detail, action = "") =>
      `<div class="live-banner ${cls}"><ha-icon icon="${icon}"></ha-icon>
         <div class="live-banner-text"><span class="live-state">${esc(title)}</span>${
           detail ? `<span class="live-detail">${esc(detail)}</span>` : ""
         }</div>${action}</div>`;

    if (this._error) {
      out.push(banner("error", "mdi:alert-circle", this._t("bridge_error"), this._error));
    } else if (b?.online === false) {
      out.push(banner("error", "mdi:lan-disconnect", this._t("bridge_offline"), this._t("bridge_offline_hint")));
    }
    if (b && b.compatible === false) {
      out.push(banner("warn", "mdi:alert", this._t("bridge_incompatible"), this._t("bridge_incompatible_hint", { v: b.version })));
    }
    if (jobs?.running) {
      const label = jobs.kind === "update" ? this._t("job_update") : this._t("job_check");
      const detail = `${jobs.done + 1}/${jobs.total}${jobs.current ? ` · ${jobs.current}` : ""}`;
      const cancel = this._readOnly
        ? ""
        : `<button class="btn small" data-act="cancel_job">${esc(this._t("cancel"))}</button>`;
      out.push(banner("", "mdi:progress-clock", label, detail, cancel));
    }
    if (b?.permit_join) {
      const until = this._permitUntil(b.permit_join_end);
      const stop = this._readOnly
        ? ""
        : `<button class="btn small" data-act="pair" data-value="0">${esc(this._t("pairing_stop"))}</button>`;
      out.push(banner("", "mdi:link-plus", this._t("pairing_active"), until, stop));
    }
    if (b?.restart_required) {
      out.push(banner("warn", "mdi:restart-alert", this._t("restart_required"), this._t("restart_required_hint")));
    }
    return out.join("");
  }

  _permitUntil(end) {
    if (!end) return "";
    const ts = end > 1e11 ? end : end * 1000;
    return this._t("until", { time: new Date(ts).toLocaleTimeString(this._lang, { hour: "2-digit", minute: "2-digit" }) });
  }

  _tabCount(tab) {
    const s = this._data?.stats;
    if (!s) return null;
    if (tab === "devices" && s.offline > 0) return { n: s.offline, cls: "" };
    if (tab === "battery" && s.low_battery > 0) return { n: s.low_battery, cls: "warn" };
    if (tab === "updates" && s.updates_available > 0) return { n: s.updates_available, cls: "info" };
    if (tab === "bridge" && this._data?.app?.update_available) return { n: "↑", cls: "warn" };
    return null;
  }

  _renderTabs(visible) {
    if (visible.length <= 1) return "";
    const cfg = this._config;
    return `<div class="tabs" role="tablist">${visible
      .map((tab) => {
        const meta = TAB_META[tab];
        const label = this._t(meta.label);
        const color = sanitizeColor(cfg[CATEGORY_ICON_COLOR_KEYS[tab]]);
        const iconStyle = color ? ` style="color: ${color};"` : "";
        const count = this._tabCount(tab);
        return `<button class="tab ${tab === this._tab ? "active" : ""}" role="tab" aria-selected="${tab === this._tab}"
            data-act="tab" data-tab="${tab}" title="${esc(label)}">
          <ha-icon icon="${meta.icon}"${iconStyle}></ha-icon>
          <span class="lbl">${esc(label)}</span>
          ${count ? `<span class="count ${count.cls}">${count.n}</span>` : ""}
        </button>`;
      })
      .join("")}</div>`;
  }

  _renderMain() {
    if (!this._data && !this._error) return `<div class="empty">${esc(this._t("connecting"))}</div>`;
    if (!this._data) return "";
    switch (this._tab) {
      case "groups":
        return this._renderGroups();
      case "bindings":
        return this._renderBindings();
      case "bridge":
        return this._renderBridge();
      default:
        return this._renderDeviceTab(this._tab);
    }
  }

  // ----------------------------------------------------------------- Geräte-Tabs
  get _search() {
    return (this._drafts.search || "").trim().toLowerCase();
  }

  _sortKey(tab) {
    if (this._sort[tab]) return this._sort[tab];
    if (tab === "devices") {
      const d = this._config.default_sort;
      return SORT_OPTIONS.some((o) => o.value === d) ? d : DEFAULT_SORT;
    }
    return TAB_DEFAULT_SORT[tab] || DEFAULT_SORT;
  }

  _sortValue(d, key) {
    switch (key) {
      case "name_asc":
      case "name_desc":
        return (d.name || "").toLowerCase();
      case "battery_asc":
        return d.battery;
      case "lqi_asc":
        return d.linkquality;
      case "last_seen_asc":
      case "last_seen_desc":
        return d.last_seen ? Date.parse(d.last_seen) || null : null;
      case "ota":
        return OTA_ORDER[d.ota.state] ?? 9;
      default:
        return null;
    }
  }

  _devices(tab) {
    let list = [...(this._data?.devices ?? [])];
    if (tab === "battery") list = list.filter((d) => d.battery !== null && d.battery !== undefined);
    else if (tab === "updates") list = list.filter((d) => d.ota.capable);
    else if (tab === "bindings") list = list.filter((d) => d.bindings.length);

    if (tab === "devices") {
      if (this._filter === "offline") list = list.filter((d) => d.available === false);
      else if (this._filter === "low") {
        const t = this._data.stats.low_battery_threshold;
        list = list.filter((d) => d.battery !== null && d.battery !== undefined && d.battery < t);
      } else if (this._filter === "updates") list = list.filter((d) => d.ota.state === "available");
    }

    const q = this._search;
    if (q) {
      list = list.filter((d) =>
        [d.name, d.vendor, d.model, d.ieee, d.description].some((v) => String(v || "").toLowerCase().includes(q))
      );
    }

    const key = this._sortKey(tab);
    const dir = key.endsWith("_desc") ? -1 : 1;
    return list.sort((a, b) => {
      const x = this._sortValue(a, key);
      const y = this._sortValue(b, key);
      if ((x === null || x === undefined) && (y === null || y === undefined)) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }

  _renderStats() {
    const s = this._data.stats;
    if (!this._config.show_stats) return "";
    const chip = (id, n, label, color) =>
      `<button class="chip ${this._filter === id ? "on" : ""}" data-act="chip" data-chip="${id}"
         style="--c:${n > 0 && color ? color : "var(--primary-text-color, #212121)"}"><b>${n}</b>${esc(label)}</button>`;
    return `<div class="chips">
      ${chip("all", s.total, this._t("chip_devices"), "")}
      ${chip("offline", s.offline, this._t("chip_offline"), "var(--zmm-color-error)")}
      ${chip("low", s.low_battery, this._t("chip_low_battery"), "var(--zmm-color-warning)")}
      ${chip("updates", s.updates_available, this._t("chip_updates"), "var(--zmm-color-info)")}
    </div>`;
  }

  _renderFilterBar(tab, withSort = true) {
    const cfg = this._config;
    if (!cfg.show_search && !(cfg.show_filter_bar && withSort)) return "";
    const search = cfg.show_search
      ? `<label class="filter-bar-field grow"><ha-icon icon="mdi:magnify" style="--mdc-icon-size:18px"></ha-icon>
           <input type="search" data-draft="search" data-fk="search" data-rerender="1"
             placeholder="${esc(this._t("search"))}" value="${esc(this._drafts.search || "")}" /></label>`
      : "";
    const sort = cfg.show_filter_bar && withSort
      ? `<label class="filter-bar-field">${esc(this._t("sort"))}
           <select data-change="sort" data-tab="${tab}" data-fk="sort">${SORT_OPTIONS.map(
             (o) => `<option value="${o.value}" ${o.value === this._sortKey(tab) ? "selected" : ""}>${esc(this._t(o.label))}</option>`
           ).join("")}</select></label>`
      : "";
    return `<div class="filter-bar">${search}${sort}</div>`;
  }

  _relTime(iso) {
    if (!iso) return this._t("never");
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) return esc(iso);
    const diff = (ts - Date.now()) / 1000;
    const abs = Math.abs(diff);
    const rtf = new Intl.RelativeTimeFormat(this._lang, { numeric: "auto" });
    if (abs < 60) return rtf.format(Math.round(diff), "second");
    if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
    return rtf.format(Math.round(diff / 86400), "day");
  }

  _batteryColor(b) {
    const s = this._data?.stats;
    if (b < (s?.critical_battery_threshold ?? 10)) return "var(--zmm-color-error)";
    if (b < (s?.low_battery_threshold ?? 20)) return "var(--zmm-color-warning)";
    return "var(--zmm-color-success)";
  }

  _lqiColor(q) {
    if (q < 50) return "var(--zmm-color-error)";
    if (q < 100) return "var(--zmm-color-warning)";
    return "var(--zmm-color-success)";
  }

  _batteryBar(b) {
    const v = clamp(b, 0, 100);
    return `<span class="bar"><span style="width:${v}%;background:${this._batteryColor(v)}"></span></span>${Math.round(v)} %`;
  }

  _otaPill(ota) {
    const label =
      { available: "ota_available", updating: "ota_updating", scheduled: "ota_scheduled", idle: "ota_idle" }[ota.state] ||
      "ota_unknown";
    const color = {
      available: "var(--zmm-color-info)",
      updating: "var(--zmm-color-warning)",
      scheduled: "var(--zmm-color-warning)",
      idle: "var(--zmm-color-success)",
    }[ota.state];
    const extra = ota.state === "updating" && ota.progress !== null && ota.progress !== undefined ? ` ${Math.round(ota.progress)} %` : "";
    return `<span class="pill" ${color ? `style="--c:${color}"` : ""}>${esc(this._t(label))}${extra}</span>`;
  }

  _deviceIcon(d, tab) {
    if (tab === "battery") return batteryIcon(d.battery);
    if (tab === "updates") {
      return { available: "mdi:update", updating: "mdi:progress-upload", scheduled: "mdi:clock-outline" }[d.ota.state] || "mdi:check-circle-outline";
    }
    return DEVICE_ICON[d.type] || "mdi:zigbee";
  }

  _deviceImage(d, cls = "dev-img") {
    if (this._config.show_images === false) return "";
    const url = deviceImageUrl(d);
    if (!url || this._imgFailed?.has(url)) return "";
    return `<img class="${cls}" src="${esc(url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`;
  }

  // Statuspunkt: Z2M-Verfügbarkeit hat Vorrang; sonst aus "zuletzt gesehen" abgeleitet.
  _statusDot(d) {
    const t = (k, v) => this._t(k, v);
    let cls = "";
    let tip = t("status_unknown");
    if (d.available === true) {
      cls = "on";
      tip = t("status_online");
    } else if (d.available === false) {
      cls = "off";
      tip = t("status_offline");
    } else if (d.last_seen) {
      const ts = Date.parse(d.last_seen);
      if (!Number.isNaN(ts)) {
        const rel = this._relTime(d.last_seen);
        cls = Date.now() - ts <= STALE_AFTER_MS ? "seen" : "stale";
        tip = t(cls === "seen" ? "status_seen" : "status_stale", { t: rel });
      }
    }
    return `<span class="dot ${cls}" title="${esc(tip)}"></span>`;
  }

  _deviceRow(d, tab) {
    const cfg = this._config;
    const color = this._rowIconColor(tab);
    const iconStyle = color ? ` style="color: ${color};"` : "";
    const dot = tab === "devices" || tab === "bindings" ? this._statusDot(d) : "";
    const img = this._deviceImage(d);

    let secondary = "";
    let extra = "";
    if (tab === "battery") {
      secondary = [d.voltage !== null && d.voltage !== undefined ? `${d.voltage} mV` : "", d.model || ""].filter(Boolean).map((v) => `<span>${esc(v)}</span>`).join("");
      extra = `<span>${this._batteryBar(d.battery)}</span><span class="optional">${esc(this._relTime(d.last_seen))}</span>`;
    } else if (tab === "updates") {
      secondary = `<span>${esc(d.ota.installed ?? "–")} → ${esc(d.ota.latest ?? "–")}</span>`;
      const install =
        d.ota.state === "available" && !this._readOnly
          ? `<button class="btn small" data-act="ota_update" data-confirm="ota_update:${esc(d.ieee)}" data-ieee="${esc(d.ieee)}">${esc(this._confirmLabel(`ota_update:${d.ieee}`, this._t("install")))}</button>`
          : "";
      extra = `<span>${this._otaPill(d.ota)}</span>${install}`;
    } else {
      secondary = [
        cfg.show_model ? d.model : "",
        cfg.show_vendor ? d.vendor : "",
        cfg.show_ieee ? d.ieee : "",
      ].filter(Boolean).map((v) => `<span>${esc(v)}</span>`).join("");
      const lqi =
        cfg.show_lqi && d.linkquality !== null && d.linkquality !== undefined
          ? `<span class="pill" style="--c:${this._lqiColor(d.linkquality)}">${esc(d.linkquality)}</span>`
          : "";
      const bat = cfg.show_battery_value && d.battery !== null && d.battery !== undefined ? `<span>${this._batteryBar(d.battery)}</span>` : "";
      const seen = cfg.show_last_seen ? `<span class="optional">${esc(this._relTime(d.last_seen))}</span>` : "";
      extra = `${lqi}${bat}${seen}`;
    }

    const badges = [
      d.available === false ? `<span class="badge" style="--c:var(--zmm-color-error)">${esc(this._t("offline"))}</span>` : "",
      d.interviewing ? `<span class="badge" style="--c:var(--zmm-color-warning)">${esc(this._t("interviewing"))}</span>` : "",
      d.disabled ? `<span class="badge">${esc(this._t("disabled"))}</span>` : "",
    ].join("");

    return `<div class="row clickable" tabindex="0" role="button" data-act="open" data-ieee="${esc(d.ieee)}">
      <span class="row-icon${img ? " has-image" : ""}"${iconStyle}>${img}<ha-icon icon="${this._deviceIcon(d, tab)}"${img ? " hidden" : ""}></ha-icon>${dot}</span>
      <div class="row-main">
        <div class="row-primary"><span class="row-name">${esc(d.name)}</span>${badges}</div>
        <div class="row-secondary">${secondary}</div>
      </div>
      <div class="row-extra">${extra}</div>
    </div>`;
  }

  _limited(list) {
    const max = Number(this._config.max_rows) || 0;
    if (!max || this._expanded || list.length <= max) return { shown: list, hidden: 0 };
    return { shown: list.slice(0, max), hidden: list.length - max };
  }

  _renderRowList(tab, list) {
    if (!list.length) {
      return `<div class="empty">${esc(this._data.devices.length ? this._t("no_results") : this._t("no_data"))}</div>`;
    }
    const { shown, hidden } = this._limited(list);
    return `<div class="rows">${shown.map((d) => this._deviceRow(d, tab)).join("")}</div>${
      hidden
        ? `<div class="more"><button class="btn" data-act="more">${esc(this._t("show_more", { n: hidden }))}</button></div>`
        : ""
    }`;
  }

  _renderDeviceTab(tab) {
    let toolbar = "";
    if (tab === "devices" && !this._readOnly && this._config.show_pairing) {
      const pj = this._data.bridge.permit_join;
      toolbar = `<div class="toolbar"><span class="spacer"></span>
        <button class="btn" data-act="pair" data-value="${pj ? 0 : 1}"><ha-icon icon="mdi:link-plus"></ha-icon>${esc(this._t(pj ? "pairing_stop" : "pairing_start"))}</button></div>`;
    }
    if (tab === "updates") {
      const s = this._data.stats;
      const running = !!this._data.jobs?.ota?.running;
      toolbar = this._readOnly
        ? ""
        : `<div class="toolbar">
            <button class="btn" data-act="check_all" ${running ? "disabled" : ""}><ha-icon icon="mdi:magnify-scan"></ha-icon>${esc(this._t("check_all"))}</button>
            <button class="btn primary" data-act="update_all" data-confirm="update_all" ${running || !s.updates_available ? "disabled" : ""}><ha-icon icon="mdi:cloud-download"></ha-icon>${esc(this._confirmLabel("update_all", this._t("update_all", { n: s.updates_available })))}</button>
          </div>
          <div class="hint">${esc(this._t("update_all_hint"))}</div>`;
    }
    return `${tab === "devices" ? this._renderStats() : ""}${toolbar}${this._renderFilterBar(tab)}${this._renderRowList(tab, this._devices(tab))}`;
  }

  // ----------------------------------------------------------------- Gruppen
  _accordion(key, icon, title, body, { meta = "", open = false, cls = "" } = {}) {
    return `<details class="settings-accordion ${cls}" data-k="${esc(key)}" ${this._isOpen(key, open) ? "open" : ""}>
      <summary class="settings-accordion-summary"><ha-icon icon="${icon}"></ha-icon><span class="grow">${esc(title)}</span>${
        meta ? `<span class="meta">${esc(meta)}</span>` : ""
      }</summary><div class="settings-accordion-body">${body}</div></details>`;
  }

  _confirmLabel(key, label) {
    return this._confirming === key ? this._t("confirm") : label;
  }

  _confirmButton(key, act, attrs, label, cls = "btn danger small") {
    return `<button class="${cls}" data-act="${act}" data-confirm="${esc(key)}" ${attrs}>${esc(this._confirmLabel(key, label))}</button>`;
  }

  _draft(key, dflt = "") {
    return key in this._drafts ? this._drafts[key] : dflt;
  }

  _renderGroups() {
    const groups = this._data.groups;
    const devices = this._data.devices;
    const ro = this._readOnly;
    const create = ro
      ? ""
      : `<div class="field-row" style="margin-bottom:8px">
          <input type="text" data-draft="group_new" data-fk="group_new" placeholder="${esc(this._t("group_name"))}" value="${esc(this._draft("group_new"))}" />
          <button class="btn primary" data-act="group_add"><ha-icon icon="mdi:plus"></ha-icon>${esc(this._t("group_create"))}</button>
        </div>`;
    if (!groups.length) return `${create}<div class="empty">${esc(this._t("no_groups"))}</div>`;

    const cards = groups.map((g) => {
      const memberIds = new Set(g.members.map((m) => m.ieee));
      const members = g.members.length
        ? g.members.map((m) => `<div class="settings-line"><span>${esc(m.name)}${m.endpoint ? ` <span class="muted">· EP ${esc(m.endpoint)}</span>` : ""}</span>${
            ro ? "" : `<button class="btn icon" title="${esc(this._t("remove_member"))}" data-act="group_member_remove" data-gid="${g.id}" data-ieee="${esc(m.ieee)}"><ha-icon icon="mdi:close"></ha-icon></button>`
          }</div>`).join("")
        : `<div class="hint">${esc(this._t("group_empty"))}</div>`;
      const candidates = devices.filter((d) => !memberIds.has(d.ieee));
      const edit = ro
        ? ""
        : `<div class="field"><label>${esc(this._t("group_add_member"))}</label>
             <div class="field-row"><select data-draft="gm:${g.id}" data-fk="gm:${g.id}">
               <option value="">–</option>${candidates.map((d) => `<option value="${esc(d.ieee)}" ${this._draft(`gm:${g.id}`) === d.ieee ? "selected" : ""}>${esc(d.name)}</option>`).join("")}
             </select><button class="btn small" data-act="group_member_add" data-gid="${g.id}">${esc(this._t("add"))}</button></div></div>
           <div class="field"><label>${esc(this._t("rename"))}</label>
             <div class="field-row"><input type="text" data-draft="gr:${g.id}" data-fk="gr:${g.id}" value="${esc(this._draft(`gr:${g.id}`, g.name))}" />
             <button class="btn small" data-act="group_rename" data-gid="${g.id}">${esc(this._t("save"))}</button></div></div>
           <div class="toolbar">${this._confirmButton(`group_remove:${g.id}`, "group_remove", `data-gid="${g.id}"`, this._t("group_delete"))}</div>
           <div class="hint">${esc(this._t("group_broadcast_hint"))}</div>`;
      return this._accordion(`grp:${g.id}`, "mdi:group", g.name, members + edit, { meta: String(g.members.length) });
    });
    return `${create}<div class="settings-view">${cards.join("")}</div>`;
  }

  // ----------------------------------------------------------------- Bindings
  _renderBindings() {
    const list = this._devices("bindings");
    const search = this._renderFilterBar("bindings", false);
    if (!list.length) return `${search}<div class="empty">${esc(this._t("no_bindings"))}</div><div class="hint">${esc(this._t("bindings_hint"))}</div>`;
    const ro = this._readOnly;
    const items = list.map((d) => {
      const lines = d.bindings
        .map((b) => {
          const badge = b.target_type === "group" ? ` <span class="badge">${esc(this._t("group"))}</span>` : "";
          const unbind = ro
            ? ""
            : this._confirmButton(
                `unbind:${d.ieee}:${b.cluster}:${b.target_ref}`,
                "unbind",
                `data-ieee="${esc(d.ieee)}" data-target="${esc(b.target_ref)}" data-cluster="${esc(b.cluster)}"`,
                this._t("unbind"),
                "btn small danger"
              );
          return `<div class="settings-line"><span>${esc(b.cluster)} <span class="muted">→</span> ${esc(b.target)}${badge}</span>${unbind}</div>`;
        })
        .join("");
      return this._accordion(`bind:${d.ieee}`, "mdi:link-variant", d.name, `${lines}<div class="toolbar"><button class="btn small" data-act="open" data-ieee="${esc(d.ieee)}">${esc(this._t("details"))}</button></div>`, { meta: String(d.bindings.length) });
    });
    return `<div class="hint">${esc(this._t("bindings_hint"))}</div>${search}<div class="settings-view">${items.join("")}</div>`;
  }

  // ----------------------------------------------------------------- Bridge
  _line(label, value) {
    if (value === null || value === undefined || value === "") return "";
    return `<div class="settings-line"><span class="settings-label">${esc(label)}</span><span class="settings-value">${value}</span></div>`;
  }

  _renderBridge() {
    const b = this._data.bridge;
    const s = this._data.stats;
    const ro = this._readOnly;
    const status = b.online === true ? `<span class="pill" style="--c:var(--zmm-color-success)">${esc(this._t("online"))}</span>` : b.online === false ? `<span class="pill" style="--c:var(--zmm-color-error)">${esc(this._t("offline"))}</span>` : esc(this._t("unknown"));
    const coordinator = [b.coordinator_type, b.coordinator_revision].filter(Boolean).join(" · ");
    const info = [
      this._line(this._t("f_status"), status),
      this._line(this._t("f_version"), esc(b.version)),
      this._line(this._t("f_coordinator"), esc(coordinator)),
      this._line(this._t("f_base_topic"), esc(b.base_topic)),
      this._line(this._t("chip_devices"), esc(s.total)),
      this._line(this._t("tab_groups"), esc(s.groups)),
    ].join("");

    const pj = b.permit_join;
    const pairing = `${this._line(this._t("f_pairing"), esc(pj ? `${this._t("pairing_active")} ${this._permitUntil(b.permit_join_end)}` : this._t("inactive")))}${
      ro ? "" : `<div class="toolbar"><button class="btn ${pj ? "" : "primary"}" data-act="pair" data-value="${pj ? 0 : 1}"><ha-icon icon="mdi:link-plus"></ha-icon>${esc(this._t(pj ? "pairing_stop" : "pairing_start"))}</button></div>`
    }<div class="hint">${esc(this._t("pairing_hint"))}</div>`;

    const optLabels = { log_level: this._t("opt_log_level"), last_seen: this._t("opt_last_seen") };
    const options = Object.keys(b.option_values || {})
      .map((key) => {
        const cur = b.options?.[key];
        const sel = `<select data-change="bridge_option" data-key="${key}" data-fk="bo:${key}" ${ro ? "disabled" : ""}>${
          cur ? "" : '<option value="" selected>–</option>'
        }${b.option_values[key].map((v) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>`;
        return `<div class="field"><label>${esc(optLabels[key] || key)}</label>${sel}</div>`;
      })
      .join("");

    const maintenance = ro
      ? `<div class="hint">${esc(this._t("read_only_hint"))}</div>`
      : `<div class="toolbar">${this._confirmButton("restart", "restart", "", this._t("restart"), "btn danger")}</div><div class="hint">${esc(this._t("restart_hint"))}</div>`;

    const events = this._data.events.length
      ? `<div class="timeline">${this._data.events
          .map((e) => `<div class="timeline-item"><ha-icon icon="${this._eventIcon(e.type)}"></ha-icon><span>${esc(this._eventText(e))}</span><span class="when">${esc(this._relTime(e.ts))}</span></div>`)
          .join("")}</div>`
      : `<div class="hint">${esc(this._t("no_events"))}</div>`;

    const app = this._appSection();
    return `<div class="settings-view">
      ${app}
      ${this._accordion("bridge:status", "mdi:information-outline", this._t("sec_status"), info, { open: true })}
      ${this._accordion("bridge:pairing", "mdi:link-plus", this._t("sec_pairing"), pairing)}
      ${this._accordion("bridge:options", "mdi:tune", this._t("sec_options"), `${options}<div class="hint">${esc(this._t("options_hint"))}</div>`)}
      ${this._accordion("bridge:maintenance", "mdi:wrench-outline", this._t("sec_maintenance"), maintenance)}
      ${this._accordion("bridge:events", "mdi:history", this._t("sec_events"), events, { meta: String(this._data.events.length) })}
    </div>`;
  }

  // App-Version: installierte Version + Hinweis, wenn eine neuere Version existiert
  _appSection() {
    const app = this._data?.app;
    if (!app) return "";
    const t = (k, v) => this._t(k, v);
    const update = app.update_available === true;
    const ok = !update && app.latest_version && !app.check_failed;
    let latest;
    if (update) latest = `<span class="pill" style="--c:var(--zmm-color-warning)">${esc(t("app_update_available", { v: app.latest_version }))}</span>`;
    else if (ok) latest = `<span class="pill" style="--c:var(--zmm-color-success)">${esc(t("app_up_to_date"))}</span>`;
    else if (app.check_failed) latest = `<span class="pill" style="--c:var(--zmm-color-error)">${esc(t("app_check_failed"))}</span>`;
    else latest = esc(t("app_not_checked"));
    const mismatch = Boolean(app.version) && app.version !== CARD_VERSION;
    const url = /^https:\/\/github\.com\//.test(app.release_url || "") ? app.release_url : RELEASES_URL;
    const lines = [
      this._line(t("f_integration_version"), esc(app.version)),
      this._line(t("f_card_version"), mismatch ? `<span class="pill" style="--c:var(--zmm-color-warning)">${esc(CARD_VERSION)}</span>` : esc(CARD_VERSION)),
      this._line(t("f_latest_version"), `${app.latest_version && !update ? `${esc(app.latest_version)} ` : ""}${latest}`),
      app.checked_at ? this._line(t("f_checked"), esc(this._relTime(app.checked_at))) : "",
    ].join("");
    const hints = [
      update ? `<div class="hint warn">${esc(t("app_update_hint"))}</div>` : "",
      mismatch ? `<div class="hint warn">${esc(t("app_mismatch", { card: CARD_VERSION, integration: app.version }))}</div>` : "",
    ].join("");
    const buttons = `<div class="toolbar">${
      this._readOnly ? "" : `<button class="btn" data-act="app_update_check"><ha-icon icon="mdi:refresh"></ha-icon>${esc(t("app_check_now"))}</button>`
    }<a class="btn ${update ? "primary" : ""}" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><ha-icon icon="mdi:open-in-new"></ha-icon>${esc(t("app_release"))}</a></div>`;
    return this._accordion("bridge:app", update ? "mdi:update" : "mdi:information-variant-circle-outline", t("sec_app"), `${lines}${hints}${buttons}`, {
      open: true,
      meta: `v${app.version}`,
      cls: update || mismatch ? "update" : "",
    });
  }

  _eventIcon(type) {
    return (
      {
        device_joined: "mdi:plus-circle-outline",
        device_leave: "mdi:minus-circle-outline",
        device_interview: "mdi:account-search-outline",
        device_announce: "mdi:broadcast",
        offline: "mdi:lan-disconnect",
        online: "mdi:lan-connect",
        battery_low: "mdi:battery-alert",
        update_available: "mdi:update",
      }[type] || "mdi:circle-small"
    );
  }

  _eventText(e) {
    const base = this._t(`ev_${e.type}`);
    return [base, e.name, e.detail].filter(Boolean).join(" · ");
  }

  // ----------------------------------------------------------------- Eingaben
  _confirmed(key) {
    if (this._confirming === key) {
      this._confirming = null;
      clearTimeout(this._confirmTimer);
      return true;
    }
    this._confirming = key;
    clearTimeout(this._confirmTimer);
    this._confirmTimer = setTimeout(() => {
      if (this._confirming === key) {
        this._confirming = null;
        this._refresh();
      }
    }, 6000);
    this._refresh();
    return false;
  }

  _onInput(e) {
    const t = e.target;
    const key = t?.dataset?.draft;
    if (!key) return;
    this._drafts[key] = t.type === "checkbox" ? t.checked : t.value;
    if (t.dataset.exfilter !== undefined) this._applyExposeFilter();
    if (t.dataset.rerender) this._refresh();
  }

  // Filter der Funktionsliste ohne Neuzeichnen (der Eingabefokus bleibt erhalten)
  _applyExposeFilter() {
    const root = this.shadowRoot.getElementById("popup");
    if (!root || !this._selected) return;
    const q = String(this._draft(`exf:${this._selected}`, "") || "").trim().toLowerCase();
    let shown = 0;
    root.querySelectorAll(".ex-row").forEach((row) => {
      const hit = !q || (row.dataset.s || "").includes(q);
      row.hidden = !hit;
      if (hit) shown += 1;
    });
    root.querySelectorAll(".ex-group").forEach((g) => {
      const rows = [];
      for (let n = g.nextElementSibling; n && n.classList.contains("ex-row"); n = n.nextElementSibling) rows.push(n);
      g.hidden = !rows.some((r) => !r.hidden);
    });
    const none = root.querySelector(".ex-none");
    if (none) none.hidden = shown > 0;
  }

  _onChange(e) {
    const t = e.target;
    if (!t?.dataset) return;
    if (t.dataset.draft) this._drafts[t.dataset.draft] = t.type === "checkbox" ? t.checked : t.value;
    if (t.dataset.change === "sort") {
      this._sort[t.dataset.tab] = t.value;
      this._refresh();
    } else if (t.dataset.change === "instance") {
      this._switchInstance(t.value);
    } else if (t.dataset.change === "bridge_option" && t.value) {
      this._call("bridge_option", { key: t.dataset.key, value: t.value });
    }
  }

  async _onClick(e) {
    if (e.target.id === "backdrop") return this._closePopup();
    const el = e.target.closest?.("[data-act]");
    if (!el) return;
    const d = el.dataset;
    if (d.confirm && !this._confirmed(d.confirm)) return;

    switch (d.act) {
      case "tab":
        this._tab = d.tab;
        this._filter = "all";
        this._expanded = false;
        return this._refresh();
      case "chip":
        this._filter = this._filter === d.chip && d.chip !== "all" ? "all" : d.chip;
        return this._refresh();
      case "more":
        this._expanded = true;
        return this._refresh();
      case "open":
        return this._openPopup(d.ieee);
      case "close":
        return this._closePopup();
      case "pair":
        return void (await this._call("permit_join", { value: d.value === "1" }));
      case "check_all":
        this._toast(this._t("checking"));
        return void (await this._call("ota_check_all"));
      case "update_all":
        return void (await this._call("ota_update_all"));
      case "cancel_job":
        return void (await this._call("ota_cancel"));
      case "ota_check":
        return void (await this._call("ota_check", { ieee: d.ieee || this._selected }));
      case "ota_update":
        return void (await this._call("ota_update", { ieee: d.ieee || this._selected }));
      case "app_update_check":
        this._toast(this._t("app_checking"));
        return void (await this._call("app_update_check"));
      case "restart":
        return void (await this._call("restart"));
      case "group_add": {
        const name = String(this._draft("group_new")).trim();
        if (!name) return;
        if (await this._call("group_add", { value: name })) delete this._drafts.group_new;
        return this._refresh();
      }
      case "group_rename": {
        const name = String(this._draft(`gr:${d.gid}`)).trim();
        if (name) await this._call("group_rename", { group_id: d.gid, value: name });
        return;
      }
      case "group_remove":
        return void (await this._call("group_remove", { group_id: d.gid }));
      case "group_member_add": {
        const ieee = d.ieee || this._draft(`gm:${d.gid}`);
        if (!ieee) return;
        if (await this._call("group_member_add", { group_id: d.gid, ieee })) delete this._drafts[`gm:${d.gid}`];
        return;
      }
      case "group_member_remove":
        return void (await this._call("group_member_remove", { group_id: d.gid, ieee: d.ieee }));
      case "popup_group_add": {
        const gid = this._draft(`pg:${this._selected}`);
        if (!gid) return;
        if (await this._call("group_member_add", { group_id: gid, ieee: this._selected })) delete this._drafts[`pg:${this._selected}`];
        return;
      }
      case "rename": {
        const ieee = this._selected;
        const value = String(this._draft(`rename:${ieee}`, "")).trim();
        if (!value) return;
        if (await this._call("rename", { ieee, value })) delete this._drafts[`rename:${ieee}`];
        return;
      }
      case "options_save":
        return this._saveOptions();
      case "bind": {
        const ieee = this._selected;
        const target = this._draft(`bt:${ieee}`);
        if (!target) return this._toast(this._t("pick_target"), true);
        const clusters = Object.keys(this._drafts)
          .filter((k) => k.startsWith(`bc:${ieee}:`) && this._drafts[k])
          .map((k) => k.slice(`bc:${ieee}:`.length));
        await this._call("bind", { ieee, target, clusters });
        return;
      }
      case "unbind":
        return void (await this._call("unbind", { ieee: d.ieee || this._selected, target: d.target, clusters: [d.cluster] }));
      case "remove": {
        const ieee = this._selected;
        const ok = await this._call("remove", { ieee, value: !!this._draft(`force:${ieee}`, false) });
        if (ok) this._closePopup();
        return;
      }
      default:
    }
  }

  _saveOptions() {
    const ieee = this._selected;
    const det = this._details[ieee];
    if (!det?.options_schema) return;
    const changes = {};
    for (const opt of det.options_schema) {
      const key = `opt:${ieee}:${opt.property}`;
      if (!(key in this._drafts)) continue;
      const raw = this._drafts[key];
      const current = det.options?.[opt.property];
      let value;
      if (opt.type === "numeric") {
        if (raw === "" || Number.isNaN(Number(raw))) continue;
        value = Number(raw);
      } else if (opt.type === "binary") {
        value = raw ? opt.value_on : opt.value_off;
      } else {
        value = raw;
      }
      if (value !== current) changes[opt.property] = value;
    }
    if (!Object.keys(changes).length) return this._toast(this._t("no_changes"));
    this._call("set_options", { ieee, value: changes }).then((ok) => {
      if (!ok) return;
      for (const k of Object.keys(this._drafts)) if (k.startsWith(`opt:${ieee}:`)) delete this._drafts[k];
    });
  }

  // ----------------------------------------------------------------- Popup
  _openPopup(ieee) {
    if (!ieee) return;
    this._selected = ieee;
    this._popupSig = null;
    this._loadDetails(ieee, Boolean(this._details[ieee]), true);
    this._renderPopup(true);
  }

  _closePopup() {
    this._selected = null;
    this._popupSig = null;
    this._confirming = null;
    const backdrop = this.shadowRoot.getElementById("backdrop");
    if (backdrop) backdrop.hidden = true;
  }

  _infoLines(d) {
    const t = (k) => this._t(k);
    const lines = [
      [t("f_vendor"), d.vendor],
      [t("f_model"), d.model],
      [t("f_description"), d.description],
      [t("f_type"), d.type ? (I18N[this._lang]?.[`type_${d.type}`] ?? d.type) : null],
      [t("f_ieee"), d.ieee],
      [t("f_nwk"), d.network_address],
      [t("f_power"), d.power_source],
      [t("f_firmware"), d.sw_build_id],
      [t("f_lqi"), d.linkquality],
      [t("f_battery"), d.battery !== null && d.battery !== undefined ? `${d.battery} %` : null],
      [t("f_voltage"), d.voltage !== null && d.voltage !== undefined ? `${d.voltage} mV` : null],
      [t("f_available"), d.available === null || d.available === undefined ? null : d.available ? t("yes") : t("no")],
      [t("f_last_seen"), this._relTime(d.last_seen)],
    ];
    return lines.map(([k, v]) => this._line(k, esc(v))).join("");
  }

  // Text für den Wert einer Funktion (Zahl mit Einheit, Schalter, Auswahl, Objekte als JSON)
  _exposeValue(row) {
    const t = (k) => this._t(k);
    if (!("value" in row)) return `<span class="muted">${esc(t("ex_no_value"))}</span>`;
    const v = row.value;
    if (v === null || v === undefined || v === "") return `<span class="muted">–</span>`;
    if (row.type === "binary") {
      if (v === true) return esc(row.value_on === "ON" ? t("ex_on") : t("yes"));
      if (v === false) return esc(row.value_off === "OFF" ? t("ex_off") : t("no"));
      if (v === "ON") return esc(t("ex_on"));
      if (v === "OFF") return esc(t("ex_off"));
      return esc(v);
    }
    if (typeof v === "object") {
      let text;
      try {
        text = JSON.stringify(v);
      } catch (_e) {
        text = String(v);
      }
      const short = text.length > 90 ? `${text.slice(0, 90)} …` : text;
      return `<span title="${esc(text)}">${esc(short)}</span>`;
    }
    return esc(row.unit ? `${v} ${row.unit}` : v);
  }

  _exposeGroupLabel(group) {
    if (!group) return "";
    const key = `ex_g_${group}`;
    const text = I18N[this._lang]?.[key] ?? I18N.en[key];
    return text || group;
  }

  _exposesBody(det, ieee) {
    const t = (k) => this._t(k);
    if (!det || det.loading) return `<div class="hint">${esc(t("loading"))}</div>`;
    if (det.error) return `<div class="hint err">${esc(det.error)}</div>`;
    const rows = det.exposes || [];
    if (!rows.length) return `<div class="hint">${esc(t("no_exposes"))}</div>`;

    const filter = String(this._draft(`exf:${ieee}`, "") || "").trim().toLowerCase();
    const accessPills = (access) => {
      const pills = [];
      if (access & 1) pills.push(["ex_read", "var(--zmm-color-success)"]);
      if (access & 2) pills.push(["ex_write", "var(--zmm-color-info)"]);
      if (access & 4) pills.push(["ex_get", ""]);
      return pills.map(([k, c]) => `<span class="pill"${c ? ` style="--c:${c}"` : ""}>${esc(t(k))}</span>`).join("");
    };

    let lastGroup;
    let html = "";
    for (const r of rows) {
      if (r.group && r.group !== lastGroup) html += `<div class="ex-group">${esc(this._exposeGroupLabel(r.group))}</div>`;
      lastGroup = r.group;

      const meta = [accessPills(r.access)];
      if (r.category === "config") meta.push(`<span class="pill">${esc(t("ex_config"))}</span>`);
      else if (r.category === "diagnostic") meta.push(`<span class="pill">${esc(t("ex_diagnostic"))}</span>`);
      if (r.endpoint) meta.push(`<span>${esc(t("ex_endpoint"))}: ${esc(r.endpoint)}</span>`);
      if (r.min !== null && r.min !== undefined && r.max !== null && r.max !== undefined) {
        meta.push(`<span>${esc(t("ex_range"))}: ${esc(r.min)} – ${esc(r.max)}${r.unit ? ` ${esc(r.unit)}` : ""}</span>`);
      }
      if (Array.isArray(r.values) && r.values.length) {
        const shown = r.values.slice(0, 12).map((x) => String(x)).join(" · ");
        meta.push(`<span>${esc(t("ex_values"))}: ${esc(shown)}${r.values.length > 12 ? " …" : ""}</span>`);
      }
      const search = `${r.label} ${r.property} ${r.group || ""}`.toLowerCase();
      const hidden = filter && !search.includes(filter) ? " hidden" : "";
      html += `<div class="ex-row" data-s="${esc(search)}"${hidden}>
          <div class="ex-top"><span><span class="ex-label">${esc(r.label)}</span>${
            r.label !== r.property ? `<span class="ex-prop">${esc(r.property)}</span>` : ""
          }</span><span class="ex-value">${this._exposeValue(r)}</span></div>
          <div class="ex-meta">${meta.join("")}</div>${r.description ? `<div class="ex-desc">${esc(r.description)}</div>` : ""}
        </div>`;
    }
    const searchField =
      rows.length > 8
        ? `<div class="field"><input type="search" data-exfilter data-draft="exf:${esc(ieee)}" data-fk="exf" placeholder="${esc(t("exposes_filter"))}" value="${esc(this._draft(`exf:${ieee}`, ""))}" /></div>`
        : "";
    return `${searchField}<div class="ex-list">${html}<div class="hint ex-none" hidden>${esc(t("exposes_none_match"))}</div></div>
      <div class="hint">${esc(t("exposes_hint"))}</div>`;
  }

  _optionField(ieee, opt, current) {
    const key = `opt:${ieee}:${opt.property}`;
    const val = key in this._drafts ? this._drafts[key] : current;
    const label = `${opt.label}${opt.unit ? ` (${opt.unit})` : ""}`;
    const help = opt.description ? `<span class="help">${esc(opt.description)}</span>` : "";
    const attrs = `data-draft="${esc(key)}" data-fk="${esc(key)}"`;
    if (opt.type === "binary") {
      const checked = val === opt.value_on || val === true;
      return `<div class="field"><label class="field inline" style="padding:0"><input type="checkbox" ${attrs} ${checked ? "checked" : ""} />${esc(label)}</label>${help}</div>`;
    }
    if (opt.type === "enum" && Array.isArray(opt.values)) {
      return `<div class="field"><label>${esc(label)}</label><select ${attrs}>${
        val === undefined || val === null || val === "" ? '<option value="" selected>–</option>' : ""
      }${opt.values.map((v) => `<option value="${esc(v)}" ${String(v) === String(val) ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>${help}</div>`;
    }
    if (opt.type === "numeric") {
      const bounds = `${opt.min !== null && opt.min !== undefined ? ` min="${esc(opt.min)}"` : ""}${opt.max !== null && opt.max !== undefined ? ` max="${esc(opt.max)}"` : ""}${opt.step ? ` step="${esc(opt.step)}"` : ' step="any"'}`;
      return `<div class="field"><label>${esc(label)}</label><input type="number" ${attrs}${bounds} value="${esc(val ?? "")}" />${help}</div>`;
    }
    return `<div class="field"><label>${esc(label)}</label><input type="text" ${attrs} value="${esc(val ?? "")}" />${help}</div>`;
  }

  _renderPopup(force = false) {
    const backdrop = this.shadowRoot.getElementById("backdrop");
    const popup = this.shadowRoot.getElementById("popup");
    if (!backdrop || !popup) return;
    if (!this._selected || !this._data) {
      backdrop.hidden = true;
      return;
    }
    const d = this._data.devices.find((x) => x.ieee === this._selected);
    if (!d) {
      this._closePopup();
      return;
    }
    const det = this._details[d.ieee];
    const sig = JSON.stringify([d, det, this._confirming, this._readOnly, this._data.groups]);
    if (!force && sig === this._popupSig && !backdrop.hidden) return;
    this._popupSig = sig;

    const focus = this._captureFocus();
    const scroll = popup.scrollTop;
    const exScroll = popup.querySelector(".ex-list")?.scrollTop ?? 0;
    const ro = this._readOnly;
    const t = (k, v) => this._t(k, v);
    const sections = [];

    sections.push(this._accordion("p:info", "mdi:information-outline", t("sec_info"), this._infoLines(d), { open: true }));

    if (d.has_exposes) {
      sections.push(
        this._accordion("p:exposes", "mdi:format-list-bulleted", t("sec_exposes"), this._exposesBody(det, d.ieee), {
          meta: det?.exposes ? String(det.exposes.length) : "",
        })
      );
    }

    if (!ro) {
      const entities = det?.entities?.length
        ? `<div class="hint">${esc(t("rename_entities_hint", { n: det.entities.length }))}</div><div class="timeline" style="max-height:140px">${det.entities
            .map((en) => `<div class="timeline-item"><span>${esc(en.entity_id)}</span></div>`)
            .join("")}</div>`
        : det?.loading
          ? `<div class="hint">${esc(t("loading"))}</div>`
          : "";
      sections.push(
        this._accordion(
          "p:rename",
          "mdi:rename-box",
          t("rename"),
          `<div class="field"><label>${esc(t("new_name"))}</label><div class="field-row">
             <input type="text" data-draft="rename:${esc(d.ieee)}" data-fk="rename" value="${esc(this._draft(`rename:${d.ieee}`, d.name))}" />
             <button class="btn primary small" data-act="rename">${esc(t("save"))}</button></div></div>${entities}`
        )
      );
    }

    if (!ro && d.has_options) {
      let body;
      if (!det || det.loading) body = `<div class="hint">${esc(t("loading"))}</div>`;
      else if (det.error) body = `<div class="hint err">${esc(det.error)}</div>`;
      else if (!det.options_schema.length) body = `<div class="hint">${esc(t("no_options"))}</div>`;
      else
        body = `${det.options_schema.map((o) => this._optionField(d.ieee, o, det.options?.[o.property])).join("")}
          <div class="toolbar"><button class="btn primary" data-act="options_save">${esc(t("save"))}</button></div>
          <div class="hint">${esc(t("options_device_hint"))}</div>`;
      sections.push(this._accordion("p:options", "mdi:tune-variant", t("sec_device_options"), body));
    }

    const ota = d.ota;
    const otaBody = ota.capable
      ? `<div class="settings-line"><span>${this._otaPill(ota)}</span><span class="settings-value">${esc(ota.installed ?? "–")} → ${esc(ota.latest ?? "–")}</span></div>${
          ro
            ? ""
            : `<div class="toolbar"><button class="btn" data-act="ota_check">${esc(t("check"))}</button>
               <button class="btn primary" data-act="ota_update" data-confirm="ota_update:${esc(d.ieee)}" ${ota.state === "available" ? "" : "disabled"}>${esc(this._confirmLabel(`ota_update:${d.ieee}`, t("update_now")))}</button></div>
               <div class="hint">${esc(t("update_confirm"))}</div>`
        }`
      : `<div class="hint">${esc(t("ota_unsupported"))}</div>`;
    sections.push(this._accordion("p:ota", "mdi:update", t("sec_firmware"), otaBody, { meta: ota.capable ? t(`ota_${ota.state || "unknown"}`) : "" }));

    // Bindings
    const bindLines = d.bindings.length
      ? d.bindings
          .map((b) => `<div class="settings-line"><span>${esc(b.cluster)} <span class="muted">→</span> ${esc(b.target)}</span>${
            ro ? "" : this._confirmButton(`unbind:${d.ieee}:${b.cluster}:${b.target_ref}`, "unbind", `data-ieee="${esc(d.ieee)}" data-target="${esc(b.target_ref)}" data-cluster="${esc(b.cluster)}"`, t("unbind"), "btn small danger")
          }</div>`)
          .join("")
      : `<div class="hint">${esc(t("no_bindings_device"))}</div>`;
    let bindForm = "";
    if (!ro) {
      const others = this._data.devices.filter((x) => x.ieee !== d.ieee);
      const clusters = d.out_clusters.length ? d.out_clusters : ["genOnOff", "genLevelCtrl", "lightingColorCtrl"];
      bindForm = `<div class="field"><label>${esc(t("bind_target"))}</label>
          <select data-draft="bt:${esc(d.ieee)}" data-fk="bt">
            <option value="">–</option>
            ${others.map((x) => `<option value="${esc(x.ieee)}" ${this._draft(`bt:${d.ieee}`) === x.ieee ? "selected" : ""}>${esc(x.name)}</option>`).join("")}
            ${this._data.groups.map((g) => `<option value="group:${g.id}" ${this._draft(`bt:${d.ieee}`) === `group:${g.id}` ? "selected" : ""}>${esc(t("group"))}: ${esc(g.name)}</option>`).join("")}
          </select></div>
        <div class="clusters">${clusters.map((c) => `<label><input type="checkbox" data-draft="bc:${esc(d.ieee)}:${esc(c)}" ${this._draft(`bc:${d.ieee}:${c}`, false) ? "checked" : ""} />${esc(c)}</label>`).join("")}</div>
        <div class="toolbar"><button class="btn" data-act="bind"><ha-icon icon="mdi:link-variant-plus"></ha-icon>${esc(t("bind"))}</button></div>
        <div class="hint">${esc(t("bind_hint"))}</div>`;
    }
    sections.push(this._accordion("p:bindings", "mdi:link-variant", t("tab_bindings"), bindLines + bindForm, { meta: String(d.bindings.length) }));

    // Gruppen
    const mine = this._data.groups.filter((g) => g.members.some((m) => m.ieee === d.ieee));
    const rest = this._data.groups.filter((g) => !mine.includes(g));
    const groupLines = mine.length
      ? mine.map((g) => `<div class="settings-line"><span>${esc(g.name)}</span>${ro ? "" : `<button class="btn icon" title="${esc(t("remove_member"))}" data-act="group_member_remove" data-gid="${g.id}" data-ieee="${esc(d.ieee)}"><ha-icon icon="mdi:close"></ha-icon></button>`}</div>`).join("")
      : `<div class="hint">${esc(t("no_groups_device"))}</div>`;
    const groupAdd = ro || !rest.length
      ? ""
      : `<div class="field-row"><select data-draft="pg:${esc(d.ieee)}" data-fk="pg"><option value="">–</option>${rest.map((g) => `<option value="${g.id}" ${String(this._draft(`pg:${d.ieee}`)) === String(g.id) ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select>
         <button class="btn small" data-act="popup_group_add">${esc(t("add"))}</button></div>`;
    sections.push(this._accordion("p:groups", "mdi:group", t("tab_groups"), groupLines + groupAdd, { meta: String(mine.length) }));

    if (!ro) {
      sections.push(
        this._accordion(
          "p:remove",
          "mdi:delete-outline",
          t("sec_remove"),
          `<div class="hint">${esc(t("remove_hint"))}</div>
           <div class="field inline"><input type="checkbox" id="force" data-draft="force:${esc(d.ieee)}" ${this._draft(`force:${d.ieee}`, false) ? "checked" : ""} /><label for="force">${esc(t("force_remove"))}</label></div>
           <div class="toolbar">${this._confirmButton(`remove:${d.ieee}`, "remove", "", t("remove"), "btn danger")}</div>`,
          { cls: "danger" }
        )
      );
    }

    const headImg = this._deviceImage(d);
    popup.innerHTML = `<div class="popup-head">${headImg}<ha-icon icon="${DEVICE_ICON[d.type] || "mdi:zigbee"}"${headImg ? " hidden" : ""}></ha-icon>
        <span class="popup-title">${esc(d.name)}</span>
        <button class="popup-close" data-act="close" aria-label="${esc(t("close"))}"><ha-icon icon="mdi:close"></ha-icon></button></div>
      <div class="popup-body">${sections.join("")}</div>`;
    backdrop.hidden = false;
    popup.querySelectorAll("details[data-k]").forEach((el) => {
      el.addEventListener("toggle", () => {
        this._open[el.dataset.k] = el.open;
        // Beim Aufklappen der Funktionen sofort frische Werte holen
        if (el.dataset.k === "p:exposes" && el.open && this._selected) this._loadDetails(this._selected, true, true);
      });
    });
    popup.scrollTop = scroll;
    const exList = popup.querySelector(".ex-list");
    if (exList) exList.scrollTop = exScroll;
    this._restoreFocus(focus);
  }
}

if (!customElements.get("zigbee2mqtt-manager-card")) {
  customElements.define("zigbee2mqtt-manager-card", Zigbee2MqttManagerCard);
}

/**
 * zigbee2mqtt-manager-card-editor
 * --------------------------------
 * Grafischer Karten-Editor auf Basis von <ha-form> (wie bei fritzbox-anrufe):
 * die vielen Einstellungen sind in auf-/zuklappbare Gruppen (Akkordeon) sortiert,
 * `flatten: true` hält die gespeicherte Konfiguration flach (identische
 * YAML-Schlüssel). "Farben" ist ein natives <details> mit grafischer
 * Farbauswahl, Textfeld für beliebige CSS-Werte und "Alle zurücksetzen".
 */

const EDITOR_LABELS = {
  title: "Titel",
  entry_id: "Instanz (Stick)",
  show_title: "Überschrift (Titel) anzeigen",
  show_devices: "Kategorie 'Geräte' anzeigen",
  show_battery: "Kategorie 'Batterie' anzeigen",
  show_updates: "Kategorie 'Updates' anzeigen",
  show_groups: "Kategorie 'Gruppen' anzeigen",
  show_bindings: "Kategorie 'Bindings' anzeigen",
  show_bridge: "Kategorie 'Bridge' anzeigen",
  default_tab: "Beim Öffnen anzeigen",
  max_rows: "Max. Zeilen je Liste (0 = alle)",
  zoom: "Zoomfaktor der Karte (z. B. für Wandtablets)",
  show_stats: "Statistik-Chips (Geräte/Offline/Batterie/Updates) anzeigen",
  show_images: "Gerätebilder von zigbee2mqtt.io anzeigen",
  show_search: "Suchfeld anzeigen",
  show_filter_bar: "Sortierung auf der Karte anzeigen",
  default_sort: "Standard-Sortierung der Geräteliste",
  show_model: "Modell anzeigen",
  show_vendor: "Hersteller anzeigen",
  show_ieee: "IEEE-Adresse anzeigen",
  show_lqi: "Signalqualität anzeigen",
  show_battery_value: "Batteriestand anzeigen",
  show_last_seen: "'Zuletzt gesehen' anzeigen",
  read_only: "Nur lesen (alle Bedienelemente zum Ändern ausblenden)",
  show_pairing: "Pairing-Schaltfläche in der Geräteliste anzeigen",
};

const EDITOR_HELPERS = {
  entry_id: "Welche Zigbee2MQTT-Instanz diese Karte anzeigt. „Automatisch“: Gibt es mehrere Instanzen, erscheint oben in der Karte ein Umschalter. Für eine Karte je Stick hier die Instanz festlegen.",
  title: "Leer lassen, um keine Überschrift anzuzeigen.",
  show_images: "Die Bilder werden direkt im Browser von www.zigbee2mqtt.io geladen. Ausschalten, wenn keine externen Anfragen gewünscht sind – es erscheinen dann die Symbole.",
  max_rows: "Bei gesetztem Wert erscheint unter der Liste 'Weitere anzeigen'.",
  read_only: "Blendet Umbenennen, Optionen, Firmware-Installation, Gruppen-/Binding-Änderungen, Pairing und Neustart aus. Zusätzlich sind Aktionen ohnehin Administratoren vorbehalten.",
};

function computeEditorLabel(item) {
  return EDITOR_LABELS[item.name] || item.name;
}

function computeEditorHelper(item) {
  return EDITOR_HELPERS[item.name] || "";
}

const bool = (name) => ({ name, selector: { boolean: {} } });

const AUTO_INSTANCE = "__auto__";

// Auswahl der Instanz: Dropdown, sobald die Instanzen bekannt sind (sonst Textfeld)
function entryIdField(instances) {
  if (!Array.isArray(instances) || !instances.length) return { name: "entry_id", selector: { text: {} } };
  return {
    name: "entry_id",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: AUTO_INSTANCE, label: "Automatisch (Umschalter in der Karte)" },
          ...instances.map((i) => ({
            value: i.entry_id,
            label: `${i.base_topic || i.title}${i.loaded ? "" : " (nicht geladen)"}`,
          })),
        ],
      },
    },
  };
}

const EDITOR_SCHEMA = [
  { name: "title", selector: { text: {} } },
  entryIdField(null),
  {
    name: "",
    type: "expandable",
    title: "Kategorien",
    icon: "mdi:filter-variant",
    flatten: true,
    expanded: true,
    schema: [
      bool("show_devices"),
      bool("show_battery"),
      bool("show_updates"),
      bool("show_groups"),
      bool("show_bindings"),
      bool("show_bridge"),
      {
        name: "default_tab",
        selector: {
          select: {
            mode: "dropdown",
            options: TAB_ORDER.map((tab) => ({ value: tab, label: I18N.de[TAB_META[tab].label] })),
          },
        },
      },
    ],
  },
  {
    name: "",
    type: "expandable",
    title: "Darstellung",
    icon: "mdi:table-column",
    flatten: true,
    expanded: false,
    schema: [
      bool("show_title"),
      { name: "max_rows", selector: { number: { min: 0, max: 50, step: 1, mode: "slider" } } },
      { name: "zoom", selector: { number: { min: 0.5, max: 3, step: 0.1, mode: "slider" } } },
      bool("show_stats"),
      bool("show_images"),
      bool("show_search"),
      bool("show_filter_bar"),
      {
        name: "default_sort",
        selector: {
          select: {
            mode: "dropdown",
            options: SORT_OPTIONS.map((o) => ({ value: o.value, label: I18N.de[o.label] })),
          },
        },
      },
      {
        name: "",
        type: "expandable",
        title: "Spalten der Geräteliste",
        icon: "mdi:view-column",
        flatten: true,
        expanded: false,
        schema: [
          bool("show_model"),
          bool("show_vendor"),
          bool("show_ieee"),
          bool("show_lqi"),
          bool("show_battery_value"),
          bool("show_last_seen"),
        ],
      },
    ],
  },
  {
    name: "",
    type: "expandable",
    title: "Bearbeiten",
    icon: "mdi:pencil-lock",
    flatten: true,
    expanded: false,
    schema: [bool("read_only"), bool("show_pairing")],
  },
  // "Farben" wird nativ von ZigbeeManagerCardEditor._buildColorSection() gerendert.
];

// --- Farben-Editor ----------------------------------------------------------
//
// fallbackHex ist nur eine Näherung fürs Editor-Swatch; der echte CSS-Fallback
// (inkl. Theme-Variable) steckt in COLOR_CONFIG_KEYS.
const CATEGORY_ICON_COLOR_NOTE =
  "Standard: folgt der Tab-Farbe (aktiv/inaktiv) – hier unabhängig vom Tab-Status fest einstellbar. Färbt auch die Zeilen-Symbole der Kategorie.";

const COLOR_EDITOR_FIELDS = [
  { key: "color_tab_active", label: "Aktiver Tab / Primäraktionen", fallbackHex: "#03a9f4" },
  { key: "color_success", label: "Gut (online, Signal gut, Batterie voll, aktuell)", fallbackHex: "#43a047" },
  { key: "color_warning", label: "Warnung (Batterie niedrig, Signal mittel, Update läuft)", fallbackHex: "#ff9800" },
  { key: "color_error", label: "Fehler (offline, Batterie kritisch, Signal schwach)", fallbackHex: "#db4437" },
  { key: "color_info", label: "Update verfügbar (Firmware, App-Version)", fallbackHex: "#039be5" },
  { key: "color_row_icon", label: "Symbole in allen Listen (überschreibt Kategorie-Symbolfarben)", fallbackHex: "#727272" },
  { key: "color_live_banner", label: "Banner-Hintergrund (Pairing, Firmware-Auftrag)", fallbackHex: "#03a9f4" },
  ...TAB_ORDER.map((tab) => ({
    key: `color_icon_${tab}`,
    label: `Symbol Kategorie '${I18N.de[TAB_META[tab].label]}'`,
    fallbackHex: "#727272",
    note: CATEGORY_ICON_COLOR_NOTE,
  })),
];

// <input type="color"> verlangt zwingend die 6-stellige #rrggbb-Form.
function normalizeHex(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length === 3) return "#" + h.split("").map((c) => c + c).join("");
  return "#" + h;
}

const HEX_COLOR_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

const COLOR_EDITOR_STYLES = `
  .zmm-color-editor { margin-top: 12px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 8px; padding: 0 12px; }
  .zmm-color-editor summary {
    display: flex; align-items: center; gap: 8px; padding: 12px 0; cursor: pointer;
    font-size: 16px; font-weight: 500; color: var(--primary-text-color, #212121); list-style: none;
  }
  .zmm-color-editor summary::-webkit-details-marker { display: none; }
  .zmm-color-editor summary::marker { display: none; }
  .zmm-color-editor summary > ha-icon:first-child { --mdc-icon-size: 24px; color: var(--secondary-text-color, #727272); }
  .zmm-color-editor-chevron { margin-left: auto; --mdc-icon-size: 24px; color: var(--secondary-text-color, #727272); transition: transform 0.2s ease; }
  .zmm-color-editor[open] > summary .zmm-color-editor-chevron { transform: rotate(180deg); }
  .zmm-color-editor-body { padding: 4px 0 12px; display: flex; flex-direction: column; gap: 12px; }
  .zmm-color-reset-row { display: flex; justify-content: flex-end; }
  .zmm-color-reset-button {
    display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 6px;
    padding: 6px 10px; background: none; color: var(--primary-text-color, #212121); font: inherit; font-size: 0.85em; cursor: pointer;
  }
  .zmm-color-reset-button:hover { background: var(--secondary-background-color, rgba(0, 0, 0, 0.04)); }
  .zmm-color-reset-button ha-icon { --mdc-icon-size: 16px; }
  .zmm-color-row { display: flex; flex-direction: column; gap: 4px; }
  .zmm-color-row-label { font-size: 0.9em; color: var(--primary-text-color, #212121); }
  .zmm-color-row-controls { display: flex; align-items: center; gap: 8px; }
  .zmm-color-row-controls input[type="color"] { width: 36px; height: 36px; padding: 0; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 6px; cursor: pointer; background: none; }
  .zmm-color-row-controls input[type="text"] {
    flex: 1 1 auto; min-width: 0; padding: 8px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 6px;
    font: inherit; color: var(--primary-text-color, #212121); background: var(--card-background-color, #fff); box-sizing: border-box;
  }
  .zmm-color-row-helper { font-size: 0.75em; color: var(--secondary-text-color, #727272); }
`;

class Zigbee2MqttManagerCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = withDefaults(config);
    this._renderConfig();
  }

  // Versionsanzeige oben im Editor (Karte + Integration, Hinweis bei neuer Version)
  _updateVersionBlock() {
    if (!this._versionEl) return;
    const app = this._app;
    const warn = "var(--warning-color, #ff9800)";
    const good = "var(--success-color, #43a047)";
    const parts = [`Karte <b>${escapeHtml(CARD_VERSION)}</b>`];
    if (app) parts.push(`Integration <b>${escapeHtml(app.version)}</b>`);
    let status = "";
    let color = "var(--secondary-text-color, #727272)";
    if (app?.update_available) {
      status = `Neue Version verfügbar: <b>${escapeHtml(app.latest_version)}</b> – Update über HACS`;
      color = warn;
    } else if (app && app.version !== CARD_VERSION) {
      status = "Karte und Integration haben unterschiedliche Versionen – Browser neu laden (Strg+F5)";
      color = warn;
    } else if (app?.latest_version && !app.check_failed) {
      status = "Aktuell";
      color = good;
    }
    this._versionEl.style.cssText = `display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;margin:0 0 12px;padding:8px 12px;border-radius:8px;border:1px solid ${color};color:${color};font-size:0.9em;`;
    this._versionEl.innerHTML = `<span style="color:var(--primary-text-color,#212121)">${parts.join(" · ")}</span>${status ? `<span>${status}</span>` : ""}`;
  }

  async _loadAppInfo() {
    if (this._appInfoRequested || !this._hass?.connection) return;
    this._appInfoRequested = true;
    try {
      const msg = { type: "zigbee2mqtt_manager/subscribe" };
      if (this._config?.entry_id) msg.entry_id = this._config.entry_id;
      else if (this._config?.base_topic) msg.base_topic = this._config.base_topic;
      let unsub = null;
      let finished = false;
      unsub = await this._hass.connection.subscribeMessage((ev) => {
        if (ev?.kind !== "update" || finished) return;
        finished = true;
        this._app = ev.data?.app || null;
        this._updateVersionBlock();
        if (unsub) unsub();
      }, msg);
      if (finished) unsub();
    } catch (_e) {
      /* ohne laufende Integration bleibt nur die Kartenversion sichtbar */
    }
  }

  set hass(hass) {
    this._hass = hass;
    // Nur die hass-Referenz auffrischen – `.data` NICHT bei jedem hass-Tick
    // zurücksetzen, sonst werden Eingaben mitten im Tippen überschrieben.
    if (this._form) this._form.hass = hass;
    else this._renderConfig();
  }

  _fire() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  _valueChanged(ev) {
    ev.stopPropagation();
    const value = { ...ev.detail.value };
    // ha-form entfernt ein geleertes Textfeld aus der Konfiguration; dann würde der
    // Standardtitel wieder greifen. Ein bewusst leerer Titel wird daher als "" gespeichert.
    if (value.title === undefined || value.title === null) value.title = "";
    // "Automatisch" ist im Dropdown ein Platzhalter und wird als leerer Wert gespeichert
    if (value.entry_id === AUTO_INSTANCE || value.entry_id === undefined || value.entry_id === null) value.entry_id = "";
    this._config = value;
    this._fire();
  }

  // Formulardaten: leere Instanz als "Automatisch" anzeigen, sobald das Dropdown aktiv ist
  _formData() {
    const data = { ...this._config };
    if (this._instances?.length && !data.entry_id) data.entry_id = AUTO_INSTANCE;
    return data;
  }

  async _loadInstances() {
    if (this._instancesRequested || !this._hass?.connection) return;
    this._instancesRequested = true;
    try {
      const list = await this._hass.callWS({ type: "zigbee2mqtt_manager/instances" });
      this._instances = Array.isArray(list) ? list : [];
      if (this._form && this._instances.length) {
        this._form.schema = EDITOR_SCHEMA.map((item) => (item.name === "entry_id" ? entryIdField(this._instances) : item));
        this._form.data = this._formData();
      }
    } catch (_e) {
      /* ohne laufende Integration bleibt das Textfeld */
    }
  }

  _renderConfig() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (ev) => this._valueChanged(ev));
      this._form.schema = EDITOR_SCHEMA;
      this._form.computeLabel = computeEditorLabel;
      this._form.computeHelper = computeEditorHelper;
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = this._formData();
    this._loadInstances();

    if (!this._versionEl) {
      this._versionEl = document.createElement("div");
      this.insertBefore(this._versionEl, this._form);
      this._updateVersionBlock();
      this._loadAppInfo();
    }

    if (!this._colorSection) {
      this._colorSection = this._buildColorSection();
      this.appendChild(this._colorSection);
    }
    this._updateColorSection();
  }

  _buildColorSection() {
    const details = document.createElement("details");
    details.className = "zmm-color-editor";

    const style = document.createElement("style");
    style.textContent = COLOR_EDITOR_STYLES;
    details.appendChild(style);

    const summary = document.createElement("summary");
    summary.innerHTML =
      `<ha-icon icon="mdi:palette-outline"></ha-icon><span>Farben</span>` +
      `<ha-icon class="zmm-color-editor-chevron" icon="mdi:chevron-down"></ha-icon>`;
    details.appendChild(summary);

    const body = document.createElement("div");
    body.className = "zmm-color-editor-body";
    details.appendChild(body);

    const resetRow = document.createElement("div");
    resetRow.className = "zmm-color-reset-row";
    resetRow.innerHTML =
      `<button type="button" class="zmm-color-reset-button"><ha-icon icon="mdi:restore"></ha-icon><span>Alle Farben zurücksetzen</span></button>`;
    resetRow.querySelector("button").addEventListener("click", () => this._resetAllColors());
    body.appendChild(resetRow);

    this._colorInputs = {};
    this._focusedColorKey = null;

    COLOR_EDITOR_FIELDS.forEach((field) => {
      const row = document.createElement("div");
      row.className = "zmm-color-row";
      row.innerHTML = `
        <div class="zmm-color-row-label">${escapeHtml(field.label)}</div>
        <div class="zmm-color-row-controls">
          <input type="color" class="zmm-color-swatch" aria-label="${escapeHtml(field.label)} (grafische Auswahl)" />
          <input type="text" class="zmm-color-text" placeholder="${escapeHtml(field.fallbackHex)}" />
        </div>
        <div class="zmm-color-row-helper"></div>`;
      const swatch = row.querySelector(".zmm-color-swatch");
      const text = row.querySelector(".zmm-color-text");

      swatch.addEventListener("input", () => {
        text.value = swatch.value;
        this._onColorFieldChange(field.key, swatch.value);
      });
      // Textfeld erst bei "change" (Verlassen/Enter) übernehmen, nicht pro Tastendruck
      text.addEventListener("change", () => this._onColorFieldChange(field.key, text.value));
      text.addEventListener("focus", () => {
        this._focusedColorKey = field.key;
      });
      text.addEventListener("blur", () => {
        if (this._focusedColorKey === field.key) this._focusedColorKey = null;
      });

      body.appendChild(row);
      this._colorInputs[field.key] = { row, swatch, text };
    });
    return details;
  }

  _onColorFieldChange(key, rawValue) {
    this._config = { ...this._config, [key]: rawValue };
    this._updateColorSection();
    this._fire();
  }

  _resetAllColors() {
    const cleared = {};
    COLOR_EDITOR_FIELDS.forEach((f) => {
      cleared[f.key] = "";
    });
    this._config = { ...this._config, ...cleared };
    this._focusedColorKey = null;
    this._updateColorSection();
    this._fire();
  }

  _updateColorSection() {
    if (!this._colorInputs) return;
    const cfg = this._config || {};
    COLOR_EDITOR_FIELDS.forEach((field) => {
      const inputs = this._colorInputs[field.key];
      if (!inputs) return;
      const raw = String(cfg[field.key] || "").trim();
      inputs.swatch.value = HEX_COLOR_RE.test(raw) ? normalizeHex(raw) : field.fallbackHex;
      if (this._focusedColorKey !== field.key) inputs.text.value = raw;
      const parts = [raw ? `Aktuell verwendet: ${raw}` : `Aktuell verwendet (Standard): ${field.fallbackHex}`];
      if (field.note) parts.push(field.note);
      inputs.row.querySelector(".zmm-color-row-helper").textContent = parts.join(" – ");
    });
  }
}

if (!customElements.get("zigbee2mqtt-manager-card-editor")) {
  customElements.define("zigbee2mqtt-manager-card-editor", Zigbee2MqttManagerCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "zigbee2mqtt-manager-card")) {
  window.customCards.push({
    type: "zigbee2mqtt-manager-card",
    name: "Zigbee2MQTT Manager",
    description:
      "Zigbee2MQTT im Dashboard verwalten: Geräte, Batterie, Firmware-Updates, Gruppen, Bindings und Bridge – jede Kategorie einzeln ein-/ausblendbar.",
    preview: false,
  });
}
// eslint-disable-next-line no-console
console.info(`%c ZIGBEE2MQTT-MANAGER-CARD %c v${CARD_VERSION} `, "background:#03a9f4;color:#fff", "background:#333;color:#fff");
