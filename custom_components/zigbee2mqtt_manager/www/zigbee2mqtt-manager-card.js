// SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): df9b6cd07f2140b743cc65698794fb5a8aeabaf40d74b1e92980a4a94143bbd1
// SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 4a345f2ac6232826d876052447cdf2dde2292a0ec25c0b34d7ac9899bc54ede6
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
 * Geräte, Batterie und Updates lassen sich nach Hersteller oder Geräteklasse gruppieren
 * (Akkordeon) und über einen einklappbaren Filter-Bereich eingrenzen (seit 1.1.0).
 * Tippt man auf ein Gerät, öffnet sich ein Popup mit Akkordeon-Abschnitten:
 * Info, Funktionen (alle Expose-Funktionen mit aktuellem Wert), Umbenennen
 * (inkl. betroffener Entitäten), Geräteoptionen (Formular aus dem Z2M-Schema),
 * Firmware, Bindings, Gruppen und Entfernen. Schreibbare Schalter unter "Funktionen"
 * lassen sich direkt umlegen; die Entitäts-Namen lassen sich in die Zwischenablage kopieren.
 *
 * Mehrere Zigbee2MQTT-Instanzen (z. B. drei Sticks): Gibt es mehr als eine und
 * ist weder `entry_id` noch `base_topic` gesetzt, erscheint oben in der Karte
 * ein Umschalter. Mit `entry_id`/`base_topic` lässt sich eine Karte fest an eine
 * Instanz binden (z. B. eine Karte je Stick).
 *
 * Seit 1.2.1: Entitäten und das Gerät lassen sich per Link in Home Assistant öffnen, ein Knopf
 * "Netzwerk" führt zur Zigbee2MQTT-Netzwerkkarte, und Geräte, die aus der Z2M-Liste verschwinden,
 * bleiben ausgegraut als "fehlt" sichtbar (bis sie zurückkommen oder vergessen werden).
 *
 * Seit 1.3.0: Der Reiter "Netzwerk" zeigt die Zigbee-Topologie selbst (Coordinator, Router,
 * Endgeräte als Wolken) und darunter je Router ein Akkordeon mit seinen Verbindungen. Geräte lassen
 * sich im Popup auf "Offline ignorieren" setzen (z. B. Lampen hinter einem Wandschalter).
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

const CARD_VERSION = "1.3.0b2";
// Datengetriebenes Neuzeichnen höchstens alle 2 s (Bedienaktionen zeichnen sofort)
const RENDER_MIN_MS = 2000;
const RELEASES_URL = "https://github.com/Meine-smarte-Welt/zigbee2mqtt_manager/releases";

const TAB_ORDER = ["devices", "battery", "updates", "groups", "bindings", "network", "bridge"];

const TAB_META = {
  devices: { icon: "mdi:zigbee", label: "tab_devices" },
  battery: { icon: "mdi:battery-70", label: "tab_battery" },
  updates: { icon: "mdi:update", label: "tab_updates" },
  groups: { icon: "mdi:group", label: "tab_groups" },
  bindings: { icon: "mdi:link-variant", label: "tab_bindings" },
  network: { icon: "mdi:graph-outline", label: "network" },
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

// --- Gruppieren und Filtern (seit 1.1.0) ---------------------------------------
// Tabs mit Geräteliste, auf die Gruppierung und Filter wirken.
const FILTER_TABS = ["devices", "battery", "updates"];
const GROUP_BY_OPTIONS = [
  { value: "none", label: "group_none" },
  { value: "vendor", label: "group_vendor" },
  { value: "class", label: "group_class" },
  { value: "area", label: "group_area" },
];
// Die Klasse leitet das Backend aus den Expose-Funktionen ab (Reihenfolge = Anzeige).
const DEVICE_CLASSES = ["light", "switch", "climate", "cover", "lock", "fan", "remote", "sensor", "other"];
const CLASS_ICON = {
  light: "mdi:lightbulb-outline",
  switch: "mdi:power-socket-eu",
  climate: "mdi:thermostat",
  cover: "mdi:window-shutter",
  lock: "mdi:lock-outline",
  fan: "mdi:fan",
  remote: "mdi:remote",
  sensor: "mdi:eye-outline",
  other: "mdi:help-circle-outline",
};
const UNKNOWN_VENDOR = "__unknown__";
// Feste Filter (Auswahl: Wert -> Textschlüssel). Hersteller und Klasse werden aus den Daten gebildet.
const FILTER_FIELDS = [
  { key: "status", label: "flt_status", options: [["online", "flt_online"], ["offline", "flt_offline"], ["stale", "flt_stale"], ["disabled", "flt_disabled"], ["ignored", "flt_ignored"], ["missing", "flt_missing"]] },
  {
    key: "power",
    label: "flt_power",
    options: [["battery", "flt_battery_only"], ["mains", "flt_mains_only"], ["low", "flt_battery_low"]],
  },
  {
    key: "signal",
    label: "flt_signal",
    options: [["good", "flt_sig_good"], ["mid", "flt_sig_mid"], ["weak", "flt_sig_weak"]],
  },
  { key: "role", label: "flt_role", options: [["Router", "type_Router"], ["EndDevice", "type_EndDevice"]] },
  { key: "firmware", label: "flt_firmware", options: [["available", "flt_fw_available"]] },
  { key: "seen", label: "flt_seen", options: [["24h", "flt_seen_24h"], ["7d", "flt_seen_7d"]] },
  { key: "membership", label: "flt_membership", options: [["none", "flt_no_group"]] },
];
const FILTER_KEYS = [...FILTER_FIELDS.map((f) => f.key), "vendor", "class"];

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

// Dateiname des Bildes: genau wie im Z2M-Frontend werden ":", Leerzeichen und "/" zu "-"
// (Modell "SP 120" -> "SP-120.png"; ohne diese Ersetzung fehlten z. B. Bilder von innr-Steckdosen).
function imageSlug(model) {
  return String(model).replace(/:|\s|\//g, "-");
}

function deviceImageUrl(d) {
  const custom = typeof d.icon === "string" ? d.icon.trim() : "";
  if (/^https?:\/\//i.test(custom)) return custom;
  // Bild, das Zigbee2MQTT selbst für das Gerät meldet (definition.icon)
  const fromZ2m = typeof d.icon_url === "string" ? d.icon_url.trim() : "";
  if (/^https:\/\//i.test(fromZ2m)) return fromZ2m;
  if (!d.image_model) return "";
  return `${IMAGE_BASE}${encodeURIComponent(imageSlug(d.image_model))}.png`;
}

// Nur http(s)-Adressen oder Pfade in Home Assistant ("/…") dürfen Ziel eines Knopfes sein
function safeLink(value) {
  const text = String(value || "").trim();
  if (!text || text.length > 500 || /[\s"'<>`\\]/.test(text)) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return text.startsWith("/") && !text.startsWith("//") ? text : "";
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
  show_network: true,
  default_tab: "devices",
  // Darstellung
  max_rows: 0, // 0 = alle Zeilen
  zoom: 1,
  show_stats: true,
  show_images: true,
  show_search: true,
  show_filter_bar: true,
  default_sort: DEFAULT_SORT,
  // Gruppieren (Akkordeon nach Hersteller/Geräteklasse) und Filter-Bereich
  show_group_by: true,
  default_group_by: "none",
  show_filters: true,
  // Spalten der Geräteliste
  show_model: true,
  show_vendor: true,
  show_ieee: false,
  show_lqi: true,
  show_area: true,
  show_comment: true,
  show_battery_value: true,
  show_last_seen: true,
  // Bearbeiten
  read_only: false,
  show_pairing: true,
  // Knopf "Netzwerk" (Zigbee2MQTT-Netzwerkkarte); network_url überschreibt die Adresse der Integration
  show_network_link: true,
  network_url: "",
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
  color_icon_network: "",
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
    z2m_update_available: "Update verfügbar: {v}", z2m_update_hint: "Das Update erfolgt manuell auf dem Zigbee2MQTT-Server bzw. im Docker-Container, nicht über HACS.",
    z2m_check_now: "Jetzt prüfen", z2m_check_failed: "Prüfung nicht möglich", z2m_release: "Release ansehen",
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
    flt_missing: "Fehlt in Zigbee2MQTT", chip_missing: "Fehlt", status_missing: "Fehlt in Zigbee2MQTT (zuletzt bekanntes Gerät)", missing_badge: "fehlt", missing_hint: "Diese Geräte waren bekannt, fehlen aber aktuell in der Zigbee2MQTT-Geräteliste. Sie verschwinden von selbst, sobald sie zurückkehren.", missing_popup_hint: "Dieses Gerät steht nicht mehr in der Geräteliste von Zigbee2MQTT. Angezeigt werden die zuletzt bekannten Daten. Kommt es zurück, verschwindet die Markierung von selbst; mit „Vergessen“ entfernst du es aus dieser Liste.", forget: "Vergessen", forget_all: "Alle fehlenden vergessen", f_missing_since: "Fehlt seit", network: "Netzwerk", network_open: "Zigbee2MQTT-Netzwerkkarte öffnen", open_entity: "Entität in Home Assistant öffnen", open_device: "Gerät in Home Assistant öffnen", ev_device_missing: "Fehlt in Zigbee2MQTT", ev_device_back: "Wieder in der Geräteliste",
    network_tab_hint: "Öffnet die Zigbee2MQTT-Netzwerkkarte (Topologie) in Home Assistant bzw. in einem neuen Tab.", network_no_url: "Noch keine Adresse der Netzwerkkarte bekannt. Trage sie unter Einstellungen → Geräte & Dienste → Zigbee2MQTT Manager → Konfigurieren als „Adresse der Netzwerkkarte“ ein (z. B. http://192.168.1.10:8080/#/network oder /a0d7b954_zigbee2mqtt), oder setze in der Karte `network_url`.",
    net_intro: "Aufbau des Zigbee-Netzes aus den Nachbartabellen der Router. Jeder Router hängt an seiner besten Verbindung zum Coordinator (stark, wenige Sprünge) – eine Näherung der echten Routen.", net_refresh: "Netz neu einlesen", net_refresh_hint: "Zigbee2MQTT fragt dafür jedes Gerät einzeln ab. Das dauert je nach Netz mehrere Minuten und belastet das Zigbee-Netz. Lies es nur ein, wenn du es brauchst.", net_loading: "Netz wird eingelesen (gestartet {t}) …",
    net_updated: "Stand: {t}", net_none: "Das Netz wurde noch nicht eingelesen. Starte die Abfrage mit „Netz neu einlesen“.", net_error_failed: "Zigbee2MQTT hat die Netzwerkkarte nicht geliefert.", net_error_timeout: "Zigbee2MQTT hat nicht rechtzeitig geantwortet (nach 10 Minuten abgebrochen).",
    net_summary: "{routers} Router · {clients} Endgeräte · {links} Verbindungen", net_coordinator: "Coordinator", net_router: "Router", net_cloud: "{n} Endgeräte",
    net_links_routers: "Verbindungen zu Routern", net_end_devices: "Endgeräte", net_rel_parent: "Elternknoten", net_rel_child: "Kind",
    net_rel_sibling: "Nachbar", net_orphan: "Keine Verbindung zum Coordinator bekannt", net_unassigned: "Ohne bekannte Verbindung", net_unassigned_hint: "Diese Endgeräte stehen in keiner Nachbartabelle (z. B. gerade außer Reichweite, neu oder nur kurz aktiv).",
    net_open_tip: "{name} öffnen", net_show_tip: "Endgeräte von {name} anzeigen", net_no_links: "Keine Verbindungen bekannt", net_refresh_done: "Netzwerkkarte aktualisiert",
    net_lqi: "Signal", ev_network_map: "Netzwerkkarte eingelesen", sec_monitor: "Überwachung", ignore_offline: "Offline-Status ignorieren",
    ignore_offline_hint: "Das Gerät gilt nicht als offline: keine Störung, keine Ereignisse, keine Meldung ans Notification Center. Sinnvoll z. B. für Lampen hinter einem Wandschalter.", ignored_badge: "Offline ignoriert", status_ignored: "Offline, wird ignoriert", flt_ignored: "Offline ignoriert",
    net_map_label: "Zigbee-Netzwerkkarte", net_native: "Zigbee2MQTT-Oberfläche öffnen",
    avail_activity: "ja (kürzlich Nachricht empfangen, trotz Offline-Meldung)",
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
    // Gruppieren und Filtern (seit 1.1.0)
    group_by: "Gruppieren", group_none: "Keine Gruppierung", group_vendor: "Hersteller", group_class: "Geräteklasse", group_unknown: "Unbekannt",
    chip_disabled: "Deaktiviert", sec_comment: "Kommentar", comment_ph: "Kommentar zum Gerät (z. B. Standort, Zweck)", comment_hint: "Zigbee2MQTT speichert den Kommentar in der Geräteeinstellung „description“ (höchstens 500 Zeichen). Leer lassen entfernt ihn.", done_comment: "Kommentar gespeichert",
    flt_disabled: "Deaktiviert", flt_stale: "Lange nichts gehört", chip_stale: "Lange still", stale_badge: "lange still", status_disabled: "In Zigbee2MQTT deaktiviert", group_area: "Raum", group_no_area: "Ohne Raum", f_area: "Raum", f_ha_device: "HA-Gerät", f_comment: "Kommentar", status_silent: "Online laut Zigbee2MQTT, aber lange nichts gehört – zuletzt gesehen {t}.",
    expand_all: "Alle aufklappen", collapse_all: "Alle zuklappen",
    filters: "Filter", filter_active: "{n} aktiv", filter_reset: "Alle Filter zurücksetzen", filter_remove: "Filter entfernen",
    flt_all: "Alle", flt_status: "Status", flt_online: "Online", flt_offline: "Offline",
    flt_power: "Stromversorgung", flt_battery_only: "Nur Batteriegeräte", flt_mains_only: "Nur Netzbetrieb", flt_battery_low: "Batterie niedrig",
    flt_signal: "Signal", flt_sig_good: "Gut (ab 100)", flt_sig_mid: "Mittel (50–99)", flt_sig_weak: "Schwach (unter 50)",
    flt_role: "Netzwerk-Rolle", flt_firmware: "Firmware", flt_fw_available: "Update verfügbar",
    flt_seen: "Zuletzt gesehen", flt_seen_24h: "Vor mehr als 24 Stunden", flt_seen_7d: "Vor mehr als 7 Tagen",
    flt_membership: "Zigbee-Gruppen", flt_no_group: "In keiner Gruppe", flt_vendor: "Hersteller", flt_class: "Geräteklasse",
    flt_hint: "Mehrere Filter gelten gleichzeitig (UND). Ohne aktive Z2M-Verfügbarkeit wird „Online/Offline“ aus „zuletzt gesehen“ abgeleitet, wie beim Statuspunkt. Die Filter gelten für Geräte, Batterie und Updates.",
    cls_light: "Lampen", cls_switch: "Steckdosen & Schalter", cls_climate: "Heizung & Klima", cls_cover: "Rollos & Jalousien", cls_lock: "Schlösser",
    cls_fan: "Lüfter", cls_remote: "Taster & Fernbedienungen", cls_sensor: "Sensoren", cls_other: "Sonstige",
    // Schalter in den Funktionen, Entitäten kopieren (seit 1.1.0)
    ex_set_on: "An", ex_set_off: "Aus",
    exposes_hint_switch: "Alle Funktionen, die Zigbee2MQTT für dieses Gerät bereitstellt, mit dem zuletzt bekannten Wert. Schalter lassen sich direkt umlegen und wirken sofort am Gerät.",
    sec_entities: "Entitäten (für Automationen)", entities_hint: "Entitäts-Namen aus Home Assistant. Mit dem Symbol kopierst du einen Namen in die Zwischenablage, zum Beispiel für Automationen oder Skripte.",
    no_entities: "Keine Home-Assistant-Entitäten gefunden (ist die MQTT-Erkennung aktiv?).",
    copy: "In die Zwischenablage kopieren", copy_all: "Alle kopieren", copy_entities: "Entitäts-Namen kopieren",
    copied: "Kopiert: {v}", copied_n: "{n} Entitäten kopiert",
    copy_failed: "Kopieren nicht möglich. Der Browser erlaubt die Zwischenablage nur über HTTPS.", copy_manual: "Zum Kopieren markieren (Strg+C):",
    // Notification Center (seit 1.2.0)
    nc_title: "Notification Center", nc_detected: "erkannt", nc_not_installed: "nicht installiert",
    nc_master: "Meldungen senden", nc_types: "Meldungsarten",
    nc_hint: "Das Notification Center sammelt Meldungen und verteilt sie weiter. Hier legst du fest, was dieser Manager meldet. Die Liste ist nach Dringlichkeit sortiert, Kritisches steht oben.",
    nc_missing_hint: "Das Notification Center ist nicht installiert. Die Schalter wirken, sobald es installiert ist; ohne passiert nichts.",
    nc_saved: "Gespeichert",
    nc_sev_critical: "Kritisch", nc_sev_warning: "Warnung", nc_sev_info: "Info", nc_sev_ok: "OK",
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
    z2m_update_available: "Update available: {v}", z2m_update_hint: "Update Zigbee2MQTT manually on its server or in the Docker container, not via HACS.",
    z2m_check_now: "Check now", z2m_check_failed: "Check not possible", z2m_release: "View release",
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
    flt_missing: "Missing in Zigbee2MQTT", chip_missing: "Missing", status_missing: "Missing in Zigbee2MQTT (last known device)", missing_badge: "missing", missing_hint: "These devices were known but are currently missing from the Zigbee2MQTT device list. They disappear from here by themselves once they return.", missing_popup_hint: "This device is no longer in the Zigbee2MQTT device list. The last known data is shown. If it comes back, the marker disappears by itself; use \"Forget\" to remove it from this list.", forget: "Forget", forget_all: "Forget all missing", f_missing_since: "Missing since", network: "Network", network_open: "Open the Zigbee2MQTT network map", open_entity: "Open entity in Home Assistant", open_device: "Open device in Home Assistant", ev_device_missing: "Missing in Zigbee2MQTT", ev_device_back: "Back in the device list",
    network_tab_hint: "Opens the Zigbee2MQTT network map (topology) in Home Assistant or in a new tab.", network_no_url: "No network map address known yet. Enter it under Settings → Devices & services → Zigbee2MQTT Manager → Configure as \"Network map address\" (e.g. http://192.168.1.10:8080/#/network or /a0d7b954_zigbee2mqtt), or set `network_url` in the card.",
    net_intro: "Structure of the Zigbee network, read from the routers' neighbour tables. Each router hangs off its best path to the coordinator (strong link, few hops) – an approximation of the real routes.", net_refresh: "Re-read network", net_refresh_hint: "Zigbee2MQTT queries every device one by one for this. Depending on the network it takes several minutes and puts load on the Zigbee network. Only read it when you need it.", net_loading: "Reading the network (started {t}) …",
    net_updated: "As of {t}", net_none: "The network has not been read yet. Start the query with “Re-read network”.", net_error_failed: "Zigbee2MQTT did not deliver the network map.", net_error_timeout: "Zigbee2MQTT did not answer in time (aborted after 10 minutes).",
    net_summary: "{routers} routers · {clients} end devices · {links} links", net_coordinator: "Coordinator", net_router: "Router", net_cloud: "{n} end devices",
    net_links_routers: "Links to routers", net_end_devices: "End devices", net_rel_parent: "Parent", net_rel_child: "Child",
    net_rel_sibling: "Neighbour", net_orphan: "No connection to the coordinator known", net_unassigned: "No known connection", net_unassigned_hint: "These end devices appear in no neighbour table (e.g. out of range right now, new or only briefly active).",
    net_open_tip: "Open {name}", net_show_tip: "Show end devices of {name}", net_no_links: "No links known", net_refresh_done: "Network map updated",
    net_lqi: "Signal", ev_network_map: "Network map read", sec_monitor: "Monitoring", ignore_offline: "Ignore offline status",
    ignore_offline_hint: "The device does not count as offline: no problem state, no events, no Notification Center message. Useful e.g. for lamps behind a wall switch.", ignored_badge: "Offline ignored", status_ignored: "Offline, ignored", flt_ignored: "Offline ignored",
    net_map_label: "Zigbee network map", net_native: "Open the Zigbee2MQTT interface",
    avail_activity: "yes (message received recently, despite offline report)",
    type_Router: "Router", type_EndDevice: "End device",
    sec_exposes: "Features (exposes)", no_exposes: "This device reports no features.",
    exposes_hint: "All features Zigbee2MQTT exposes for this device, with the last known value. Display only.",
    exposes_filter: "Filter features …", exposes_none_match: "No matches.",
    ex_no_value: "no value yet", ex_read: "Read", ex_write: "Write", ex_get: "Query",
    ex_config: "Configuration", ex_diagnostic: "Diagnostic", ex_on: "on", ex_off: "off",
    ex_range: "Range", ex_values: "Values", ex_endpoint: "Endpoint",
    ex_g_light: "Light", ex_g_switch: "Switch", ex_g_fan: "Fan", ex_g_cover: "Cover", ex_g_lock: "Lock", ex_g_climate: "Climate",
    instance: "Instance (stick)",
    // Grouping and filters (since 1.1.0)
    group_by: "Group by", group_none: "No grouping", group_vendor: "Manufacturer", group_class: "Device class", group_unknown: "Unknown",
    chip_disabled: "Disabled", sec_comment: "Comment", comment_ph: "Comment for this device (e.g. location, purpose)", comment_hint: "Zigbee2MQTT stores the comment in the device setting \"description\" (up to 500 characters). Leave it empty to remove it.", done_comment: "Comment saved",
    flt_disabled: "Disabled", flt_stale: "Not heard for long", chip_stale: "Silent", stale_badge: "silent", status_disabled: "Disabled in Zigbee2MQTT", group_area: "Area", group_no_area: "No area", f_area: "Area", f_ha_device: "HA device", f_comment: "Comment", status_silent: "Online according to Zigbee2MQTT, but not heard from in a long time – last seen {t}.",
    expand_all: "Expand all", collapse_all: "Collapse all",
    filters: "Filters", filter_active: "{n} active", filter_reset: "Reset all filters", filter_remove: "Remove filter",
    flt_all: "All", flt_status: "Status", flt_online: "Online", flt_offline: "Offline",
    flt_power: "Power source", flt_battery_only: "Battery devices only", flt_mains_only: "Mains-powered only", flt_battery_low: "Low battery",
    flt_signal: "Signal", flt_sig_good: "Good (100+)", flt_sig_mid: "Medium (50–99)", flt_sig_weak: "Weak (below 50)",
    flt_role: "Network role", flt_firmware: "Firmware", flt_fw_available: "Update available",
    flt_seen: "Last seen", flt_seen_24h: "More than 24 hours ago", flt_seen_7d: "More than 7 days ago",
    flt_membership: "Zigbee groups", flt_no_group: "Not in any group", flt_vendor: "Manufacturer", flt_class: "Device class",
    flt_hint: "Several filters apply together (AND). Without Z2M availability enabled, online/offline is derived from “last seen”, like the status dot. Filters apply to Devices, Battery and Updates.",
    cls_light: "Lights", cls_switch: "Plugs & switches", cls_climate: "Heating & climate", cls_cover: "Blinds & covers", cls_lock: "Locks",
    cls_fan: "Fans", cls_remote: "Buttons & remotes", cls_sensor: "Sensors", cls_other: "Other",
    // Switches in the features, copy entities (since 1.1.0)
    ex_set_on: "On", ex_set_off: "Off",
    exposes_hint_switch: "All features Zigbee2MQTT exposes for this device, with the last known value. Switches can be toggled directly and take effect on the device immediately.",
    sec_entities: "Entities (for automations)", entities_hint: "Entity names from Home Assistant. Use the icon to copy a name to the clipboard, for example for automations or scripts.",
    no_entities: "No Home Assistant entities found (is MQTT discovery enabled?).",
    copy: "Copy to clipboard", copy_all: "Copy all", copy_entities: "Copy entity names",
    copied: "Copied: {v}", copied_n: "{n} entities copied",
    copy_failed: "Copying failed. The browser only allows clipboard access over HTTPS.", copy_manual: "Select to copy (Ctrl+C):",
    // Notification Center (since 1.2.0)
    nc_title: "Notification Center", nc_detected: "detected", nc_not_installed: "not installed",
    nc_master: "Send notifications", nc_types: "Notification types",
    nc_hint: "The Notification Center collects notifications and passes them on. Here you decide what this manager reports. The list is sorted by urgency, critical items first.",
    nc_missing_hint: "The Notification Center is not installed. The switches take effect once it is installed; without it nothing happens.",
    nc_saved: "Saved",
    nc_sev_critical: "Critical", nc_sev_warning: "Warning", nc_sev_info: "Info", nc_sev_ok: "OK",
  },
  nl: {
    connecting: "Verbinden …",
    error_generic: "Actie mislukt.",
    tab_devices: "Apparaten", tab_battery: "Batterij", tab_updates: "Updates",
    tab_groups: "Groepen", tab_bindings: "Bindings", tab_bridge: "Bridge",
    chip_devices: "Apparaten", chip_offline: "Offline", chip_low_battery: "Batterij laag", chip_updates: "Updates",
    search: "Zoek op naam, model of IEEE", sort: "Sortering",
    sort_name_asc: "Naam A–Z", sort_name_desc: "Naam Z–A", sort_battery_asc: "Batterij (laagste eerst)",
    sort_lqi_asc: "Signaal (zwakste eerst)", sort_last_seen_desc: "Laatst gezien (nieuwste eerst)",
    sort_last_seen_asc: "Laatst gezien (oudste eerst)", sort_ota: "Updatestatus",
    no_data: "Nog geen gegevens van Zigbee2MQTT. Draait de bridge?", no_results: "Geen resultaten.",
    show_more: "{n} meer tonen",
    status_online: "Online (volgens Zigbee2MQTT)", status_offline: "Offline (volgens Zigbee2MQTT)", status_seen: "Waarschijnlijk online – laatst gezien {t}. De Z2M-beschikbaarheid is niet actief.", status_stale: "Lang niets gehoord – laatst gezien {t}. De Z2M-beschikbaarheid is niet actief.", status_unknown: "Status onbekend – nog geen bericht ontvangen.",
    offline: "offline", online: "online", unknown: "onbekend", inactive: "inactief", interviewing: "Interview", disabled: "uitgeschakeld",
    never: "nog nooit", yes: "ja", no: "nee", close: "Sluiten", save: "Opslaan", add: "Toevoegen", cancel: "Annuleren",
    confirm: "Zeker weten?", loading: "Laden …", details: "Details", remove: "Apparaat verwijderen", rename: "Hernoemen",
    group: "Groep",
    // Banner
    bridge_error: "Geen verbinding met de integratie", bridge_offline: "Zigbee2MQTT-bridge offline",
    bridge_offline_hint: "De bridge meldt zich niet. Getoonde waarden komen uit de cache.",
    bridge_incompatible: "Zigbee2MQTT-versie wordt niet ondersteund",
    bridge_incompatible_hint: "Versie {v} gevonden – Zigbee2MQTT 2.x is vereist.",
    pairing_active: "Koppelen actief", pairing_start: "Koppelen starten", pairing_stop: "Koppelen stoppen", until: "tot {time}",
    restart_required: "Herstart vereist", restart_required_hint: "Zigbee2MQTT meldt gewijzigde opties die een herstart nodig hebben.",
    job_check: "Firmwarecontrole bezig", job_update: "Firmware-updates worden geïnstalleerd",
    // Updates
    check_all: "Alles op updates controleren", checking: "Controle gestart …", update_all: "{n} updates na elkaar installeren",
    update_all_hint: "Updates worden na elkaar geïnstalleerd, nooit tegelijk. Apparaten moeten stroom hebben en binnen bereik blijven.",
    install: "Installeren", check: "Op update controleren", update_now: "Update installeren",
    ota_available: "Update beschikbaar", ota_updating: "Wordt bijgewerkt", ota_scheduled: "Gepland", ota_idle: "Actueel",
    ota_unknown: "Niet gecontroleerd", ota_unsupported: "Dit apparaat ondersteunt geen OTA-updates.",
    update_confirm: "Tijdens de update moet het apparaat stroom hebben en binnen bereik blijven.",
    update_found: "Update beschikbaar", no_update: "Geen update beschikbaar", done_update: "Update voltooid",
    // Groepen
    group_name: "Naam van de nieuwe groep", group_create: "Groep aanmaken", group_delete: "Groep verwijderen", group_empty: "Deze groep heeft nog geen leden.",
    group_add_member: "Apparaat toevoegen", remove_member: "Uit groep verwijderen", no_groups: "Geen groepen aanwezig.",
    group_broadcast_hint: "Groepen sturen opdrachten als broadcast tegelijk naar alle leden.", done_group: "Groep bijgewerkt",
    no_groups_device: "Geen lid van een groep.",
    // Bindings
    no_bindings: "Geen bindings aanwezig.", no_bindings_device: "Geen bindings ingesteld.",
    bindings_hint: "Bindings koppelen apparaten rechtstreeks (bijv. schakelaar → lamp) en werken ook zonder Home Assistant.",
    bind: "Koppelen", unbind: "Loskoppelen", bind_target: "Doel (apparaat of groep)", pick_target: "Kies een doel.",
    bind_hint: "Zonder keuze worden alle passende clusters gekoppeld. Maak batterijapparaten eerst wakker met een druk op de knop.",
    done_bound: "Gekoppeld", done_unbound: "Koppeling verbroken",
    // Bridge
    sec_app: "App-versie", f_integration_version: "Integratie", f_card_version: "Kaart", f_latest_version: "Nieuwste versie",
    app_up_to_date: "Actueel", app_update_available: "Update beschikbaar: {v}", app_check_failed: "Controle niet mogelijk (GitHub niet bereikbaar)", app_not_checked: "nog niet gecontroleerd",
    f_checked: "Laatst gecontroleerd", app_check_now: "Nu controleren", app_checking: "Controleren op nieuwe versie …", app_release: "Release bekijken",
    app_update_hint: "Werk bij via HACS (integratie) en start Home Assistant opnieuw op. Laad daarna de browser opnieuw (Ctrl+F5).",
    app_mismatch: "Kaart ({card}) en integratie ({integration}) hebben verschillende versies. Leeg de browsercache (Ctrl+F5) of laad de app opnieuw.",
    sec_status: "Status", sec_pairing: "Koppelen", sec_options: "Bridge-opties", sec_maintenance: "Onderhoud", sec_events: "Gebeurtenissen",
    f_status: "Status", f_version: "Zigbee2MQTT-versie", f_coordinator: "Coördinator", f_base_topic: "Base-topic", f_pairing: "Koppelen",
    pairing_hint: "De koppelmodus blijft maximaal 254 seconden actief.",
    opt_log_level: "Logniveau", opt_last_seen: "Formaat „laatst gezien“",
    options_hint: "Wijzigingen worden direct naar Zigbee2MQTT gestuurd. Sommige opties vereisen een herstart.",
    done_bridge_option: "Optie opgeslagen", restart: "Bridge herstarten",
    restart_hint: "Herstart alleen Zigbee2MQTT. Het Zigbee-netwerk is daarbij kort niet bereikbaar.", done_restart: "Herstart aangevraagd",
    read_only_hint: "De kaart is alleen-lezen.", no_events: "Nog geen gebeurtenissen sinds de start.",
    ev_device_joined: "Toegetreden", ev_device_leave: "Heeft het netwerk verlaten", ev_device_interview: "Interview", ev_device_announce: "Meldt zich",
    ev_offline: "Offline", ev_online: "Weer online", ev_battery_low: "Batterij laag", ev_update_available: "Update beschikbaar",
    // Popup
    sec_info: "Informatie", sec_device_options: "Apparaatopties", sec_firmware: "Firmware", sec_remove: "Apparaat verwijderen",
    new_name: "Nieuwe naam", rename_entities_hint: "Bij het hernoemen worden {n} entiteiten in Home Assistant mee aangepast:",
    done_renamed: "Hernoemd", done_options: "Opties opgeslagen", no_options: "Dit apparaat heeft geen instelbare opties.",
    options_device_hint: "Zigbee2MQTT slaat de opties op in zijn configuratie.", no_changes: "Geen wijzigingen.",
    remove_hint: "Verwijdert het apparaat uit het Zigbee-netwerk. Daarna moet het opnieuw worden aangemeld.",
    force_remove: "Forceren (ook als het apparaat niet reageert)", done_removed: "Apparaat verwijderd",
    f_vendor: "Fabrikant", f_model: "Model", f_description: "Beschrijving", f_type: "Type", f_ieee: "IEEE-adres", f_nwk: "Netwerkadres",
    f_power: "Voeding", f_firmware: "Firmware-build", f_lqi: "Signaalkwaliteit", f_battery: "Batterij", f_voltage: "Spanning",
    f_available: "Bereikbaar", f_last_seen: "Laatst gezien",
    flt_missing: "Ontbreekt in Zigbee2MQTT", chip_missing: "Ontbreekt", status_missing: "Ontbreekt in Zigbee2MQTT (laatst bekend apparaat)", missing_badge: "ontbreekt", missing_hint: "Deze apparaten waren bekend, maar ontbreken nu in de apparatenlijst van Zigbee2MQTT. Ze verdwijnen vanzelf zodra ze terugkomen.", missing_popup_hint: "Dit apparaat staat niet meer in de apparatenlijst van Zigbee2MQTT. De laatst bekende gegevens worden getoond. Komt het terug, dan verdwijnt de markering vanzelf; met „Vergeten” haal je het uit deze lijst.", forget: "Vergeten", forget_all: "Alle ontbrekende vergeten", f_missing_since: "Ontbreekt sinds", network: "Netwerk", network_open: "Zigbee2MQTT-netwerkkaart openen", open_entity: "Entiteit openen in Home Assistant", open_device: "Apparaat openen in Home Assistant", ev_device_missing: "Ontbreekt in Zigbee2MQTT", ev_device_back: "Weer in de apparatenlijst",
    network_tab_hint: "Opent de Zigbee2MQTT-netwerkkaart (topologie) in Home Assistant of in een nieuw tabblad.", network_no_url: "Nog geen adres van de netwerkkaart bekend. Vul het in onder Instellingen → Apparaten & services → Zigbee2MQTT Manager → Configureren als „Adres van de netwerkkaart” (bijv. http://192.168.1.10:8080/#/network of /a0d7b954_zigbee2mqtt), of stel `network_url` in de kaart in.",
    net_intro: "Opbouw van het Zigbee-netwerk uit de buurtabellen van de routers. Elke router hangt aan zijn beste verbinding met de coordinator (sterk, weinig sprongen) – een benadering van de echte routes.", net_refresh: "Netwerk opnieuw inlezen", net_refresh_hint: "Zigbee2MQTT bevraagt hiervoor elk apparaat afzonderlijk. Dat duurt afhankelijk van het netwerk enkele minuten en belast het Zigbee-netwerk. Lees het alleen in als je het nodig hebt.", net_loading: "Netwerk wordt ingelezen (gestart {t}) …",
    net_updated: "Stand: {t}", net_none: "Het netwerk is nog niet ingelezen. Start de opdracht met „Netwerk opnieuw inlezen”.", net_error_failed: "Zigbee2MQTT heeft de netwerkkaart niet geleverd.", net_error_timeout: "Zigbee2MQTT antwoordde niet op tijd (afgebroken na 10 minuten).",
    net_summary: "{routers} routers · {clients} eindapparaten · {links} verbindingen", net_coordinator: "Coordinator", net_router: "Router", net_cloud: "{n} eindapparaten",
    net_links_routers: "Verbindingen met routers", net_end_devices: "Eindapparaten", net_rel_parent: "Ouder", net_rel_child: "Kind",
    net_rel_sibling: "Buur", net_orphan: "Geen verbinding met de coordinator bekend", net_unassigned: "Zonder bekende verbinding", net_unassigned_hint: "Deze eindapparaten staan in geen enkele buurtabel (bijv. nu buiten bereik, nieuw of maar kort actief).",
    net_open_tip: "{name} openen", net_show_tip: "Eindapparaten van {name} tonen", net_no_links: "Geen verbindingen bekend", net_refresh_done: "Netwerkkaart bijgewerkt",
    net_lqi: "Signaal", ev_network_map: "Netwerkkaart ingelezen", sec_monitor: "Bewaking", ignore_offline: "Offline-status negeren",
    ignore_offline_hint: "Het apparaat geldt niet als offline: geen storing, geen gebeurtenissen, geen melding aan het Notification Center. Handig bijv. voor lampen achter een wandschakelaar.", ignored_badge: "Offline genegeerd", status_ignored: "Offline, wordt genegeerd", flt_ignored: "Offline genegeerd",
    net_map_label: "Zigbee-netwerkkaart", net_native: "Zigbee2MQTT-interface openen",
    avail_activity: "ja (recent bericht ontvangen, ondanks offline-melding)",
    type_Router: "Router", type_EndDevice: "Eindapparaat",
    // Expose-functies (popup)
    sec_exposes: "Functies (expose)", no_exposes: "Dit apparaat meldt geen functies.",
    exposes_hint: "Alle functies die Zigbee2MQTT voor dit apparaat beschikbaar stelt, met de laatst bekende waarde. Alleen weergave.",
    exposes_filter: "Functies filteren …", exposes_none_match: "Geen resultaten.",
    ex_no_value: "nog geen waarde", ex_read: "Lezen", ex_write: "Schrijven", ex_get: "Opvragen",
    ex_config: "Configuratie", ex_diagnostic: "Diagnose", ex_on: "aan", ex_off: "uit",
    ex_range: "Bereik", ex_values: "Waarden", ex_endpoint: "Endpoint",
    ex_g_light: "Licht", ex_g_switch: "Schakelaar", ex_g_fan: "Ventilator", ex_g_cover: "Rolluik", ex_g_lock: "Slot", ex_g_climate: "Klimaat",
    // Meerdere instanties
    instance: "Instantie (stick)",
    // Groeperen en filteren (sinds 1.1.0)
    group_by: "Groeperen", group_none: "Geen groepering", group_vendor: "Fabrikant", group_class: "Apparaatklasse", group_unknown: "Onbekend",
    chip_disabled: "Uitgeschakeld", sec_comment: "Opmerking", comment_ph: "Opmerking bij het apparaat (bijv. locatie, doel)", comment_hint: "Zigbee2MQTT slaat de opmerking op in de apparaatinstelling „description” (maximaal 500 tekens). Leeg laten verwijdert haar.", done_comment: "Opmerking opgeslagen",
    flt_disabled: "Uitgeschakeld", flt_stale: "Lang niets gehoord", chip_stale: "Stil", stale_badge: "stil", status_disabled: "Uitgeschakeld in Zigbee2MQTT", group_area: "Ruimte", group_no_area: "Zonder ruimte", f_area: "Ruimte", f_ha_device: "HA-apparaat", f_comment: "Opmerking", status_silent: "Online volgens Zigbee2MQTT, maar lang niets gehoord – laatst gezien {t}.",
    expand_all: "Alles uitklappen", collapse_all: "Alles inklappen",
    filters: "Filters", filter_active: "{n} actief", filter_reset: "Alle filters wissen", filter_remove: "Filter verwijderen",
    flt_all: "Alle", flt_status: "Status", flt_online: "Online", flt_offline: "Offline",
    flt_power: "Voeding", flt_battery_only: "Alleen batterijapparaten", flt_mains_only: "Alleen netvoeding", flt_battery_low: "Batterij laag",
    flt_signal: "Signaal", flt_sig_good: "Goed (vanaf 100)", flt_sig_mid: "Matig (50–99)", flt_sig_weak: "Zwak (onder 50)",
    flt_role: "Netwerkrol", flt_firmware: "Firmware", flt_fw_available: "Update beschikbaar",
    flt_seen: "Laatst gezien", flt_seen_24h: "Langer dan 24 uur geleden", flt_seen_7d: "Langer dan 7 dagen geleden",
    flt_membership: "Zigbee-groepen", flt_no_group: "In geen enkele groep", flt_vendor: "Fabrikant", flt_class: "Apparaatklasse",
    flt_hint: "Meerdere filters gelden tegelijk (EN). Zonder actieve Z2M-beschikbaarheid wordt online/offline afgeleid uit “laatst gezien”, net als bij het statusbolletje. De filters gelden voor Apparaten, Batterij en Updates.",
    cls_light: "Lampen", cls_switch: "Stekkers & schakelaars", cls_climate: "Verwarming & klimaat", cls_cover: "Rolluiken & zonwering", cls_lock: "Sloten",
    cls_fan: "Ventilatoren", cls_remote: "Knoppen & afstandsbedieningen", cls_sensor: "Sensoren", cls_other: "Overig",
    // Schakelaars in de functies, entiteiten kopiëren (sinds 1.1.0)
    ex_set_on: "Aan", ex_set_off: "Uit",
    exposes_hint_switch: "Alle functies die Zigbee2MQTT voor dit apparaat beschikbaar stelt, met de laatst bekende waarde. Schakelaars kun je direct omzetten; het werkt meteen op het apparaat.",
    sec_entities: "Entiteiten (voor automatiseringen)", entities_hint: "Entiteitsnamen uit Home Assistant. Met het pictogram kopieer je een naam naar het klembord, bijvoorbeeld voor automatiseringen of scripts.",
    no_entities: "Geen Home Assistant-entiteiten gevonden (is MQTT-discovery actief?).",
    copy: "Naar klembord kopiëren", copy_all: "Alles kopiëren", copy_entities: "Entiteitsnamen kopiëren",
    copied: "Gekopieerd: {v}", copied_n: "{n} entiteiten gekopieerd",
    copy_failed: "Kopiëren mislukt. De browser staat het klembord alleen toe via HTTPS.", copy_manual: "Selecteer om te kopiëren (Ctrl+C):",
    // Notification Center (sinds 1.2.0)
    nc_title: "Notification Center", nc_detected: "gevonden", nc_not_installed: "niet geïnstalleerd",
    nc_master: "Meldingen verzenden", nc_types: "Soorten meldingen",
    nc_hint: "Het Notification Center verzamelt meldingen en geeft ze door. Hier bepaal je wat deze manager meldt. De lijst is op urgentie gesorteerd, kritieke meldingen staan bovenaan.",
    nc_missing_hint: "Het Notification Center is niet geïnstalleerd. De schakelaars werken zodra het is geïnstalleerd; zonder gebeurt er niets.",
    nc_saved: "Opgeslagen",
    nc_sev_critical: "Kritiek", nc_sev_warning: "Waarschuwing", nc_sev_info: "Info", nc_sev_ok: "OK",
    z2m_update_available: "Update beschikbaar: {v}", z2m_update_hint: "Werk Zigbee2MQTT handmatig bij op de server of in de Docker-container, niet via HACS.", z2m_check_now: "Nu controleren", z2m_check_failed: "Controle niet mogelijk", z2m_release: "Release bekijken",
  },
  fr: {
    connecting: "Connexion …",
    error_generic: "L'action a échoué.",
    tab_devices: "Appareils", tab_battery: "Batterie", tab_updates: "Mises à jour",
    tab_groups: "Groupes", tab_bindings: "Bindings", tab_bridge: "Bridge",
    chip_devices: "Appareils", chip_offline: "Hors ligne", chip_low_battery: "Batterie faible", chip_updates: "Mises à jour",
    search: "Rechercher un nom, un modèle ou une adresse IEEE", sort: "Tri",
    sort_name_asc: "Nom A–Z", sort_name_desc: "Nom Z–A", sort_battery_asc: "Batterie (la plus faible d'abord)",
    sort_lqi_asc: "Signal (le plus faible d'abord)", sort_last_seen_desc: "Dernière activité (la plus récente d'abord)",
    sort_last_seen_asc: "Dernière activité (la plus ancienne d'abord)", sort_ota: "État des mises à jour",
    no_data: "Pas encore de données de Zigbee2MQTT. Le bridge fonctionne-t-il ?", no_results: "Aucun résultat.",
    show_more: "Afficher {n} de plus",
    status_online: "En ligne (selon Zigbee2MQTT)", status_offline: "Hors ligne (selon Zigbee2MQTT)", status_seen: "Probablement en ligne – dernière activité {t}. La disponibilité Z2M n'est pas activée.", status_stale: "Sans nouvelles depuis longtemps – dernière activité {t}. La disponibilité Z2M n'est pas activée.", status_unknown: "État inconnu – aucun message reçu pour l'instant.",
    offline: "hors ligne", online: "en ligne", unknown: "inconnu", inactive: "inactif", interviewing: "Interview", disabled: "désactivé",
    never: "jamais", yes: "oui", no: "non", close: "Fermer", save: "Enregistrer", add: "Ajouter", cancel: "Annuler",
    confirm: "Sûr ?", loading: "Chargement …", details: "Détails", remove: "Supprimer l'appareil", rename: "Renommer",
    group: "Groupe",
    // Bannière
    bridge_error: "Pas de connexion à l'intégration", bridge_offline: "Bridge Zigbee2MQTT hors ligne",
    bridge_offline_hint: "Le bridge ne répond pas. Les valeurs affichées proviennent du cache.",
    bridge_incompatible: "Version de Zigbee2MQTT non prise en charge",
    bridge_incompatible_hint: "Version {v} détectée – Zigbee2MQTT 2.x est requis.",
    pairing_active: "Appairage actif", pairing_start: "Démarrer l'appairage", pairing_stop: "Arrêter l'appairage", until: "jusqu'à {time}",
    restart_required: "Redémarrage requis", restart_required_hint: "Zigbee2MQTT signale des options modifiées qui nécessitent un redémarrage.",
    job_check: "Vérification du firmware en cours", job_update: "Installation des mises à jour du firmware",
    // Mises à jour
    check_all: "Rechercher des mises à jour pour tous", checking: "Vérification lancée …", update_all: "Installer {n} mises à jour l'une après l'autre",
    update_all_hint: "Les mises à jour sont installées l'une après l'autre, jamais en parallèle. Les appareils doivent rester alimentés et à portée.",
    install: "Installer", check: "Rechercher une mise à jour", update_now: "Installer la mise à jour",
    ota_available: "Mise à jour disponible", ota_updating: "Mise à jour en cours", ota_scheduled: "Planifiée", ota_idle: "À jour",
    ota_unknown: "Non vérifié", ota_unsupported: "Cet appareil ne prend pas en charge les mises à jour OTA.",
    update_confirm: "Pendant la mise à jour, l'appareil doit rester alimenté et à portée.",
    update_found: "Mise à jour disponible", no_update: "Aucune mise à jour disponible", done_update: "Mise à jour terminée",
    // Groupes
    group_name: "Nom du nouveau groupe", group_create: "Créer le groupe", group_delete: "Supprimer le groupe", group_empty: "Ce groupe n'a encore aucun membre.",
    group_add_member: "Ajouter un appareil", remove_member: "Retirer du groupe", no_groups: "Aucun groupe.",
    group_broadcast_hint: "Les groupes envoient les commandes en diffusion à tous les membres en même temps.", done_group: "Groupe mis à jour",
    no_groups_device: "N'appartient à aucun groupe.",
    // Bindings
    no_bindings: "Aucun binding.", no_bindings_device: "Aucun binding configuré.",
    bindings_hint: "Les bindings relient directement des appareils (p. ex. interrupteur → lampe) et fonctionnent aussi sans Home Assistant.",
    bind: "Lier", unbind: "Délier", bind_target: "Cible (appareil ou groupe)", pick_target: "Veuillez choisir une cible.",
    bind_hint: "Sans sélection, tous les clusters compatibles sont liés. Réveillez d'abord les appareils sur pile en appuyant sur un bouton.",
    done_bound: "Lié", done_unbound: "Liaison supprimée",
    // Bridge
    sec_app: "Version de l'application", f_integration_version: "Intégration", f_card_version: "Carte", f_latest_version: "Dernière version",
    app_up_to_date: "À jour", app_update_available: "Mise à jour disponible : {v}", app_check_failed: "Vérification impossible (GitHub injoignable)", app_not_checked: "pas encore vérifié",
    f_checked: "Dernière vérification", app_check_now: "Vérifier maintenant", app_checking: "Recherche d'une nouvelle version …", app_release: "Voir la version",
    app_update_hint: "Mettez à jour via HACS (intégration) et redémarrez Home Assistant. Rechargez ensuite le navigateur (Ctrl+F5).",
    app_mismatch: "La carte ({card}) et l'intégration ({integration}) ont des versions différentes. Videz le cache du navigateur (Ctrl+F5) ou rechargez l'application.",
    sec_status: "État", sec_pairing: "Appairage", sec_options: "Options du bridge", sec_maintenance: "Maintenance", sec_events: "Événements",
    f_status: "État", f_version: "Version de Zigbee2MQTT", f_coordinator: "Coordinateur", f_base_topic: "Base topic", f_pairing: "Appairage",
    pairing_hint: "Le mode d'appairage reste actif 254 secondes au maximum.",
    opt_log_level: "Niveau de journal", opt_last_seen: "Format « dernière activité »",
    options_hint: "Les modifications sont envoyées immédiatement à Zigbee2MQTT. Certaines options nécessitent un redémarrage.",
    done_bridge_option: "Option enregistrée", restart: "Redémarrer le bridge",
    restart_hint: "Redémarre uniquement Zigbee2MQTT. Le réseau Zigbee est brièvement injoignable pendant ce temps.", done_restart: "Redémarrage demandé",
    read_only_hint: "La carte est en lecture seule.", no_events: "Aucun événement depuis le démarrage.",
    ev_device_joined: "A rejoint le réseau", ev_device_leave: "A quitté le réseau", ev_device_interview: "Interview", ev_device_announce: "Se signale",
    ev_offline: "Hors ligne", ev_online: "De nouveau en ligne", ev_battery_low: "Batterie faible", ev_update_available: "Mise à jour disponible",
    // Popup
    sec_info: "Informations", sec_device_options: "Options de l'appareil", sec_firmware: "Firmware", sec_remove: "Supprimer l'appareil",
    new_name: "Nouveau nom", rename_entities_hint: "Le renommage met aussi à jour {n} entités dans Home Assistant :",
    done_renamed: "Renommé", done_options: "Options enregistrées", no_options: "Cet appareil n'a aucune option configurable.",
    options_device_hint: "Zigbee2MQTT enregistre ces options dans sa configuration.", no_changes: "Aucune modification.",
    remove_hint: "Retire l'appareil du réseau Zigbee. Il devra ensuite être appairé de nouveau.",
    force_remove: "Forcer (même si l'appareil ne répond pas)", done_removed: "Appareil supprimé",
    f_vendor: "Fabricant", f_model: "Modèle", f_description: "Description", f_type: "Type", f_ieee: "Adresse IEEE", f_nwk: "Adresse réseau",
    f_power: "Alimentation", f_firmware: "Build du firmware", f_lqi: "Qualité du signal", f_battery: "Batterie", f_voltage: "Tension",
    f_available: "Joignable", f_last_seen: "Dernière activité",
    flt_missing: "Absent de Zigbee2MQTT", chip_missing: "Absents", status_missing: "Absent de Zigbee2MQTT (dernier appareil connu)", missing_badge: "absent", missing_hint: "Ces appareils étaient connus mais manquent actuellement dans la liste d'appareils de Zigbee2MQTT. Ils disparaissent d'ici dès qu'ils reviennent.", missing_popup_hint: "Cet appareil ne figure plus dans la liste d'appareils de Zigbee2MQTT. Les dernières données connues sont affichées. S'il revient, le repère disparaît de lui-même ; avec « Oublier », tu le retires de cette liste.", forget: "Oublier", forget_all: "Oublier tous les absents", f_missing_since: "Absent depuis", network: "Réseau", network_open: "Ouvrir la carte du réseau Zigbee2MQTT", open_entity: "Ouvrir l'entité dans Home Assistant", open_device: "Ouvrir l'appareil dans Home Assistant", ev_device_missing: "Absent de Zigbee2MQTT", ev_device_back: "De retour dans la liste",
    network_tab_hint: "Ouvre la carte du réseau Zigbee2MQTT (topologie) dans Home Assistant ou dans un nouvel onglet.", network_no_url: "Aucune adresse de la carte du réseau connue. Saisis-la sous Paramètres → Appareils et services → Zigbee2MQTT Manager → Configurer comme « Adresse de la carte du réseau » (p. ex. http://192.168.1.10:8080/#/network ou /a0d7b954_zigbee2mqtt), ou définis `network_url` dans la carte.",
    net_intro: "Structure du réseau Zigbee, lue dans les tables de voisinage des routeurs. Chaque routeur est rattaché à sa meilleure liaison vers le coordinateur (forte, peu de sauts) – une approximation des routes réelles.", net_refresh: "Relire le réseau", net_refresh_hint: "Zigbee2MQTT interroge chaque appareil un par un. Selon le réseau, cela prend plusieurs minutes et charge le réseau Zigbee. Ne le relis que si nécessaire.", net_loading: "Lecture du réseau (démarrée {t}) …",
    net_updated: "État : {t}", net_none: "Le réseau n'a pas encore été lu. Lance la requête avec « Relire le réseau ».", net_error_failed: "Zigbee2MQTT n'a pas fourni la carte du réseau.", net_error_timeout: "Zigbee2MQTT n'a pas répondu à temps (abandon après 10 minutes).",
    net_summary: "{routers} routeurs · {clients} terminaux · {links} liaisons", net_coordinator: "Coordinateur", net_router: "Routeur", net_cloud: "{n} terminaux",
    net_links_routers: "Liaisons avec les routeurs", net_end_devices: "Terminaux", net_rel_parent: "Parent", net_rel_child: "Enfant",
    net_rel_sibling: "Voisin", net_orphan: "Aucune liaison connue avec le coordinateur", net_unassigned: "Sans liaison connue", net_unassigned_hint: "Ces terminaux figurent dans aucune table de voisinage (p. ex. hors de portée, nouveaux ou brièvement actifs).",
    net_open_tip: "Ouvrir {name}", net_show_tip: "Afficher les terminaux de {name}", net_no_links: "Aucune liaison connue", net_refresh_done: "Carte du réseau mise à jour",
    net_lqi: "Signal", ev_network_map: "Carte du réseau lue", sec_monitor: "Surveillance", ignore_offline: "Ignorer l'état hors ligne",
    ignore_offline_hint: "L'appareil n'est pas considéré hors ligne : pas de défaut, pas d'événements, pas de message au Notification Center. Utile p. ex. pour des lampes derrière un interrupteur mural.", ignored_badge: "Hors ligne ignoré", status_ignored: "Hors ligne, ignoré", flt_ignored: "Hors ligne ignoré",
    net_map_label: "Carte du réseau Zigbee", net_native: "Ouvrir l'interface Zigbee2MQTT",
    avail_activity: "oui (message reçu récemment, malgré le signalement hors ligne)",
    type_Router: "Routeur", type_EndDevice: "Appareil terminal",
    // Fonctions expose (popup)
    sec_exposes: "Fonctions (expose)", no_exposes: "Cet appareil ne signale aucune fonction.",
    exposes_hint: "Toutes les fonctions que Zigbee2MQTT expose pour cet appareil, avec la dernière valeur connue. Affichage uniquement.",
    exposes_filter: "Filtrer les fonctions …", exposes_none_match: "Aucun résultat.",
    ex_no_value: "pas encore de valeur", ex_read: "Lecture", ex_write: "Écriture", ex_get: "Interrogation",
    ex_config: "Configuration", ex_diagnostic: "Diagnostic", ex_on: "activé", ex_off: "désactivé",
    ex_range: "Plage", ex_values: "Valeurs", ex_endpoint: "Endpoint",
    ex_g_light: "Lumière", ex_g_switch: "Interrupteur", ex_g_fan: "Ventilateur", ex_g_cover: "Volet", ex_g_lock: "Serrure", ex_g_climate: "Climat",
    // Plusieurs instances
    instance: "Instance (clé)",
    // Regrouper et filtrer (depuis 1.1.0)
    group_by: "Regrouper", group_none: "Aucun regroupement", group_vendor: "Fabricant", group_class: "Classe d'appareil", group_unknown: "Inconnu",
    chip_disabled: "Désactivés", sec_comment: "Commentaire", comment_ph: "Commentaire sur l'appareil (p. ex. emplacement, usage)", comment_hint: "Zigbee2MQTT enregistre le commentaire dans le paramètre d'appareil « description » (500 caractères maximum). Laisse le champ vide pour le supprimer.", done_comment: "Commentaire enregistré",
    flt_disabled: "Désactivé", flt_stale: "Silencieux depuis longtemps", chip_stale: "Silencieux", stale_badge: "silencieux", status_disabled: "Désactivé dans Zigbee2MQTT", group_area: "Pièce", group_no_area: "Sans pièce", f_area: "Pièce", f_ha_device: "Appareil HA", f_comment: "Commentaire", status_silent: "En ligne selon Zigbee2MQTT, mais sans nouvelles depuis longtemps – dernière activité {t}.",
    expand_all: "Tout déplier", collapse_all: "Tout replier",
    filters: "Filtres", filter_active: "{n} actifs", filter_reset: "Réinitialiser tous les filtres", filter_remove: "Retirer le filtre",
    flt_all: "Tous", flt_status: "État", flt_online: "En ligne", flt_offline: "Hors ligne",
    flt_power: "Alimentation", flt_battery_only: "Appareils sur pile uniquement", flt_mains_only: "Alimentés par le secteur uniquement", flt_battery_low: "Batterie faible",
    flt_signal: "Signal", flt_sig_good: "Bon (à partir de 100)", flt_sig_mid: "Moyen (50–99)", flt_sig_weak: "Faible (moins de 50)",
    flt_role: "Rôle réseau", flt_firmware: "Firmware", flt_fw_available: "Mise à jour disponible",
    flt_seen: "Dernière activité", flt_seen_24h: "Il y a plus de 24 heures", flt_seen_7d: "Il y a plus de 7 jours",
    flt_membership: "Groupes Zigbee", flt_no_group: "Dans aucun groupe", flt_vendor: "Fabricant", flt_class: "Classe d'appareil",
    flt_hint: "Plusieurs filtres s'appliquent ensemble (ET). Sans disponibilité Z2M activée, « en ligne/hors ligne » est déduit de « dernière activité », comme pour le point d'état. Les filtres s'appliquent à Appareils, Batterie et Mises à jour.",
    cls_light: "Lampes", cls_switch: "Prises et interrupteurs", cls_climate: "Chauffage et climat", cls_cover: "Volets et stores", cls_lock: "Serrures",
    cls_fan: "Ventilateurs", cls_remote: "Boutons et télécommandes", cls_sensor: "Capteurs", cls_other: "Autres",
    // Interrupteurs dans les fonctions, copier les entités (depuis 1.1.0)
    ex_set_on: "Marche", ex_set_off: "Arrêt",
    exposes_hint_switch: "Toutes les fonctions que Zigbee2MQTT expose pour cet appareil, avec la dernière valeur connue. Les interrupteurs se basculent directement et agissent immédiatement sur l'appareil.",
    sec_entities: "Entités (pour les automatisations)", entities_hint: "Noms d'entités de Home Assistant. Avec l'icône, tu copies un nom dans le presse-papiers, par exemple pour des automatisations ou des scripts.",
    no_entities: "Aucune entité Home Assistant trouvée (la découverte MQTT est-elle active ?).",
    copy: "Copier dans le presse-papiers", copy_all: "Tout copier", copy_entities: "Copier les noms d'entités",
    copied: "Copié : {v}", copied_n: "{n} entités copiées",
    copy_failed: "Copie impossible. Le navigateur n'autorise le presse-papiers que via HTTPS.", copy_manual: "Sélectionne pour copier (Ctrl+C) :",
    // Notification Center (depuis 1.2.0)
    nc_title: "Notification Center", nc_detected: "détecté", nc_not_installed: "non installé",
    nc_master: "Envoyer les notifications", nc_types: "Types de notifications",
    nc_hint: "Le Notification Center collecte les notifications et les distribue. Ici, tu choisis ce que ce gestionnaire signale. La liste est triée par urgence, les notifications critiques en premier.",
    nc_missing_hint: "Le Notification Center n'est pas installé. Les interrupteurs agissent dès son installation ; sans lui, rien ne se passe.",
    nc_saved: "Enregistré",
    nc_sev_critical: "Critique", nc_sev_warning: "Avertissement", nc_sev_info: "Info", nc_sev_ok: "OK",
    z2m_update_available: "Mise à jour disponible : {v}", z2m_update_hint: "Mets Zigbee2MQTT à jour manuellement sur son serveur ou dans le conteneur Docker, pas via HACS.", z2m_check_now: "Vérifier maintenant", z2m_check_failed: "Vérification impossible", z2m_release: "Voir la version",
  },
  es: {
    connecting: "Conectando …",
    error_generic: "La acción ha fallado.",
    tab_devices: "Dispositivos", tab_battery: "Batería", tab_updates: "Actualizaciones",
    tab_groups: "Grupos", tab_bindings: "Bindings", tab_bridge: "Bridge",
    chip_devices: "Dispositivos", chip_offline: "Sin conexión", chip_low_battery: "Batería baja", chip_updates: "Actualizaciones",
    search: "Buscar nombre, modelo o dirección IEEE", sort: "Orden",
    sort_name_asc: "Nombre A–Z", sort_name_desc: "Nombre Z–A", sort_battery_asc: "Batería (la más baja primero)",
    sort_lqi_asc: "Señal (la más débil primero)", sort_last_seen_desc: "Última actividad (la más reciente primero)",
    sort_last_seen_asc: "Última actividad (la más antigua primero)", sort_ota: "Estado de actualización",
    no_data: "Todavía no hay datos de Zigbee2MQTT. ¿Está en marcha el bridge?", no_results: "Sin resultados.",
    show_more: "Mostrar {n} más",
    status_online: "En línea (según Zigbee2MQTT)", status_offline: "Sin conexión (según Zigbee2MQTT)", status_seen: "Probablemente en línea – última actividad {t}. La disponibilidad de Z2M no está activada.", status_stale: "Sin noticias desde hace tiempo – última actividad {t}. La disponibilidad de Z2M no está activada.", status_unknown: "Estado desconocido – aún no se ha recibido ningún mensaje.",
    offline: "sin conexión", online: "en línea", unknown: "desconocido", inactive: "inactivo", interviewing: "Interview", disabled: "desactivado",
    never: "nunca", yes: "sí", no: "no", close: "Cerrar", save: "Guardar", add: "Añadir", cancel: "Cancelar",
    confirm: "¿Seguro?", loading: "Cargando …", details: "Detalles", remove: "Eliminar dispositivo", rename: "Renombrar",
    group: "Grupo",
    // Banner
    bridge_error: "Sin conexión con la integración", bridge_offline: "Bridge de Zigbee2MQTT sin conexión",
    bridge_offline_hint: "El bridge no responde. Los valores mostrados proceden de la caché.",
    bridge_incompatible: "Versión de Zigbee2MQTT no compatible",
    bridge_incompatible_hint: "Se ha detectado la versión {v}; se necesita Zigbee2MQTT 2.x.",
    pairing_active: "Emparejamiento activo", pairing_start: "Iniciar emparejamiento", pairing_stop: "Detener emparejamiento", until: "hasta las {time}",
    restart_required: "Reinicio necesario", restart_required_hint: "Zigbee2MQTT indica opciones modificadas que requieren un reinicio.",
    job_check: "Comprobando firmware", job_update: "Instalando actualizaciones de firmware",
    // Actualizaciones
    check_all: "Buscar actualizaciones de todos", checking: "Comprobación iniciada …", update_all: "Instalar {n} actualizaciones una tras otra",
    update_all_hint: "Las actualizaciones se instalan una tras otra, nunca en paralelo. Los dispositivos deben seguir alimentados y al alcance.",
    install: "Instalar", check: "Buscar actualización", update_now: "Instalar actualización",
    ota_available: "Actualización disponible", ota_updating: "Actualizando", ota_scheduled: "Programada", ota_idle: "Al día",
    ota_unknown: "Sin comprobar", ota_unsupported: "Este dispositivo no admite actualizaciones OTA.",
    update_confirm: "Durante la actualización, el dispositivo debe seguir alimentado y al alcance.",
    update_found: "Actualización disponible", no_update: "No hay actualización disponible", done_update: "Actualización completada",
    // Grupos
    group_name: "Nombre del grupo nuevo", group_create: "Crear grupo", group_delete: "Eliminar grupo", group_empty: "Este grupo aún no tiene miembros.",
    group_add_member: "Añadir dispositivo", remove_member: "Quitar del grupo", no_groups: "No hay grupos.",
    group_broadcast_hint: "Los grupos envían los comandos como difusión a todos los miembros a la vez.", done_group: "Grupo actualizado",
    no_groups_device: "No pertenece a ningún grupo.",
    // Bindings
    no_bindings: "No hay bindings.", no_bindings_device: "No hay bindings configurados.",
    bindings_hint: "Los bindings conectan dispositivos directamente (p. ej. interruptor → lámpara) y funcionan también sin Home Assistant.",
    bind: "Vincular", unbind: "Desvincular", bind_target: "Destino (dispositivo o grupo)", pick_target: "Elige un destino.",
    bind_hint: "Sin selección se vinculan todos los clusters compatibles. Despierta antes los dispositivos de batería pulsando un botón.",
    done_bound: "Vinculado", done_unbound: "Vínculo eliminado",
    // Bridge
    sec_app: "Versión de la aplicación", f_integration_version: "Integración", f_card_version: "Tarjeta", f_latest_version: "Última versión",
    app_up_to_date: "Al día", app_update_available: "Actualización disponible: {v}", app_check_failed: "No se pudo comprobar (GitHub no accesible)", app_not_checked: "aún sin comprobar",
    f_checked: "Última comprobación", app_check_now: "Comprobar ahora", app_checking: "Buscando una versión nueva …", app_release: "Ver versión",
    app_update_hint: "Actualiza mediante HACS (integración) y reinicia Home Assistant. Después recarga el navegador (Ctrl+F5).",
    app_mismatch: "La tarjeta ({card}) y la integración ({integration}) tienen versiones distintas. Vacía la caché del navegador (Ctrl+F5) o recarga la aplicación.",
    sec_status: "Estado", sec_pairing: "Emparejamiento", sec_options: "Opciones del bridge", sec_maintenance: "Mantenimiento", sec_events: "Eventos",
    f_status: "Estado", f_version: "Versión de Zigbee2MQTT", f_coordinator: "Coordinador", f_base_topic: "Base topic", f_pairing: "Emparejamiento",
    pairing_hint: "El modo de emparejamiento permanece activo 254 segundos como máximo.",
    opt_log_level: "Nivel de registro", opt_last_seen: "Formato de «última actividad»",
    options_hint: "Los cambios se envían de inmediato a Zigbee2MQTT. Algunas opciones requieren un reinicio.",
    done_bridge_option: "Opción guardada", restart: "Reiniciar bridge",
    restart_hint: "Reinicia solo Zigbee2MQTT. Durante ese tiempo la red Zigbee no está accesible brevemente.", done_restart: "Reinicio solicitado",
    read_only_hint: "La tarjeta es de solo lectura.", no_events: "No hay eventos desde el inicio.",
    ev_device_joined: "Se ha unido a la red", ev_device_leave: "Ha salido de la red", ev_device_interview: "Interview", ev_device_announce: "Se anuncia",
    ev_offline: "Sin conexión", ev_online: "De nuevo en línea", ev_battery_low: "Batería baja", ev_update_available: "Actualización disponible",
    // Ventana emergente
    sec_info: "Información", sec_device_options: "Opciones del dispositivo", sec_firmware: "Firmware", sec_remove: "Eliminar dispositivo",
    new_name: "Nombre nuevo", rename_entities_hint: "Al renombrar también se actualizan {n} entidades en Home Assistant:",
    done_renamed: "Renombrado", done_options: "Opciones guardadas", no_options: "Este dispositivo no tiene opciones configurables.",
    options_device_hint: "Zigbee2MQTT guarda estas opciones en su configuración.", no_changes: "Sin cambios.",
    remove_hint: "Quita el dispositivo de la red Zigbee. Después hay que emparejarlo de nuevo.",
    force_remove: "Forzar (aunque el dispositivo no responda)", done_removed: "Dispositivo eliminado",
    f_vendor: "Fabricante", f_model: "Modelo", f_description: "Descripción", f_type: "Tipo", f_ieee: "Dirección IEEE", f_nwk: "Dirección de red",
    f_power: "Alimentación", f_firmware: "Build del firmware", f_lqi: "Calidad de señal", f_battery: "Batería", f_voltage: "Tensión",
    f_available: "Accesible", f_last_seen: "Última actividad",
    flt_missing: "Falta en Zigbee2MQTT", chip_missing: "Ausentes", status_missing: "Falta en Zigbee2MQTT (último dispositivo conocido)", missing_badge: "ausente", missing_hint: "Estos dispositivos eran conocidos, pero ahora faltan en la lista de dispositivos de Zigbee2MQTT. Desaparecen de aquí solos en cuanto vuelven.", missing_popup_hint: "Este dispositivo ya no está en la lista de dispositivos de Zigbee2MQTT. Se muestran los últimos datos conocidos. Si vuelve, la marca desaparece sola; con «Olvidar» lo quitas de esta lista.", forget: "Olvidar", forget_all: "Olvidar todos los ausentes", f_missing_since: "Ausente desde", network: "Red", network_open: "Abrir el mapa de red de Zigbee2MQTT", open_entity: "Abrir la entidad en Home Assistant", open_device: "Abrir el dispositivo en Home Assistant", ev_device_missing: "Falta en Zigbee2MQTT", ev_device_back: "De nuevo en la lista",
    network_tab_hint: "Abre el mapa de red de Zigbee2MQTT (topología) en Home Assistant o en una pestaña nueva.", network_no_url: "Aún no se conoce la dirección del mapa de red. Indícala en Ajustes → Dispositivos y servicios → Zigbee2MQTT Manager → Configurar como «Dirección del mapa de red» (p. ej. http://192.168.1.10:8080/#/network o /a0d7b954_zigbee2mqtt), o define `network_url` en la tarjeta.",
    net_intro: "Estructura de la red Zigbee, leída de las tablas de vecinos de los routers. Cada router cuelga de su mejor enlace con el coordinador (fuerte, pocos saltos): una aproximación de las rutas reales.", net_refresh: "Releer la red", net_refresh_hint: "Zigbee2MQTT consulta cada dispositivo uno por uno. Según la red tarda varios minutos y carga la red Zigbee. Léela solo cuando la necesites.", net_loading: "Leyendo la red (iniciado {t}) …",
    net_updated: "Estado: {t}", net_none: "La red aún no se ha leído. Inicia la consulta con «Releer la red».", net_error_failed: "Zigbee2MQTT no entregó el mapa de red.", net_error_timeout: "Zigbee2MQTT no respondió a tiempo (cancelado tras 10 minutos).",
    net_summary: "{routers} routers · {clients} dispositivos finales · {links} enlaces", net_coordinator: "Coordinador", net_router: "Router", net_cloud: "{n} dispositivos finales",
    net_links_routers: "Enlaces con routers", net_end_devices: "Dispositivos finales", net_rel_parent: "Padre", net_rel_child: "Hijo",
    net_rel_sibling: "Vecino", net_orphan: "No se conoce enlace con el coordinador", net_unassigned: "Sin enlace conocido", net_unassigned_hint: "Estos dispositivos finales no aparecen en ninguna tabla de vecinos (p. ej. fuera de alcance, nuevos o activos solo un momento).",
    net_open_tip: "Abrir {name}", net_show_tip: "Mostrar dispositivos finales de {name}", net_no_links: "Sin enlaces conocidos", net_refresh_done: "Mapa de red actualizado",
    net_lqi: "Señal", ev_network_map: "Mapa de red leído", sec_monitor: "Supervisión", ignore_offline: "Ignorar estado sin conexión",
    ignore_offline_hint: "El dispositivo no cuenta como sin conexión: sin avería, sin eventos, sin aviso al Notification Center. Útil p. ej. para lámparas tras un interruptor de pared.", ignored_badge: "Sin conexión ignorado", status_ignored: "Sin conexión, ignorado", flt_ignored: "Sin conexión ignorado",
    net_map_label: "Mapa de red Zigbee", net_native: "Abrir la interfaz de Zigbee2MQTT",
    avail_activity: "sí (mensaje reciente, a pesar de figurar sin conexión)",
    type_Router: "Router", type_EndDevice: "Dispositivo final",
    // Funciones expose (ventana)
    sec_exposes: "Funciones (expose)", no_exposes: "Este dispositivo no informa de ninguna función.",
    exposes_hint: "Todas las funciones que Zigbee2MQTT expone para este dispositivo, con el último valor conocido. Solo visualización.",
    exposes_filter: "Filtrar funciones …", exposes_none_match: "Sin resultados.",
    ex_no_value: "aún sin valor", ex_read: "Lectura", ex_write: "Escritura", ex_get: "Consulta",
    ex_config: "Configuración", ex_diagnostic: "Diagnóstico", ex_on: "activado", ex_off: "desactivado",
    ex_range: "Rango", ex_values: "Valores", ex_endpoint: "Endpoint",
    ex_g_light: "Luz", ex_g_switch: "Interruptor", ex_g_fan: "Ventilador", ex_g_cover: "Persiana", ex_g_lock: "Cerradura", ex_g_climate: "Clima",
    // Varias instancias
    instance: "Instancia (clave)",
    // Agrupar y filtrar (desde 1.1.0)
    group_by: "Agrupar", group_none: "Sin agrupar", group_vendor: "Fabricante", group_class: "Clase de dispositivo", group_unknown: "Desconocido",
    chip_disabled: "Desactivados", sec_comment: "Comentario", comment_ph: "Comentario sobre el dispositivo (p. ej. ubicación, uso)", comment_hint: "Zigbee2MQTT guarda el comentario en el ajuste del dispositivo «description» (máximo 500 caracteres). Déjalo vacío para quitarlo.", done_comment: "Comentario guardado",
    flt_disabled: "Desactivado", flt_stale: "Sin noticias desde hace tiempo", chip_stale: "Silencioso", stale_badge: "silencioso", status_disabled: "Desactivado en Zigbee2MQTT", group_area: "Área", group_no_area: "Sin área", f_area: "Área", f_ha_device: "Dispositivo HA", f_comment: "Comentario", status_silent: "En línea según Zigbee2MQTT, pero sin noticias desde hace tiempo – última actividad {t}.",
    expand_all: "Desplegar todo", collapse_all: "Plegar todo",
    filters: "Filtros", filter_active: "{n} activos", filter_reset: "Restablecer todos los filtros", filter_remove: "Quitar filtro",
    flt_all: "Todos", flt_status: "Estado", flt_online: "En línea", flt_offline: "Sin conexión",
    flt_power: "Alimentación", flt_battery_only: "Solo dispositivos de batería", flt_mains_only: "Solo alimentados por red", flt_battery_low: "Batería baja",
    flt_signal: "Señal", flt_sig_good: "Buena (desde 100)", flt_sig_mid: "Media (50–99)", flt_sig_weak: "Débil (menos de 50)",
    flt_role: "Rol de red", flt_firmware: "Firmware", flt_fw_available: "Actualización disponible",
    flt_seen: "Última actividad", flt_seen_24h: "Hace más de 24 horas", flt_seen_7d: "Hace más de 7 días",
    flt_membership: "Grupos Zigbee", flt_no_group: "En ningún grupo", flt_vendor: "Fabricante", flt_class: "Clase de dispositivo",
    flt_hint: "Varios filtros se aplican a la vez (Y). Sin la disponibilidad de Z2M activada, «en línea/sin conexión» se deduce de «última actividad», igual que el punto de estado. Los filtros se aplican a Dispositivos, Batería y Actualizaciones.",
    cls_light: "Lámparas", cls_switch: "Enchufes e interruptores", cls_climate: "Calefacción y clima", cls_cover: "Persianas y toldos", cls_lock: "Cerraduras",
    cls_fan: "Ventiladores", cls_remote: "Botones y mandos", cls_sensor: "Sensores", cls_other: "Otros",
    // Interruptores en las funciones, copiar entidades (desde 1.1.0)
    ex_set_on: "Encender", ex_set_off: "Apagar",
    exposes_hint_switch: "Todas las funciones que Zigbee2MQTT expone para este dispositivo, con el último valor conocido. Los interruptores se pueden conmutar directamente y actúan al instante sobre el dispositivo.",
    sec_entities: "Entidades (para automatizaciones)", entities_hint: "Nombres de entidades de Home Assistant. Con el icono copias un nombre al portapapeles, por ejemplo para automatizaciones o scripts.",
    no_entities: "No se han encontrado entidades de Home Assistant (¿está activo el descubrimiento MQTT?).",
    copy: "Copiar al portapapeles", copy_all: "Copiar todo", copy_entities: "Copiar nombres de entidades",
    copied: "Copiado: {v}", copied_n: "{n} entidades copiadas",
    copy_failed: "No se pudo copiar. El navegador solo permite el portapapeles mediante HTTPS.", copy_manual: "Selecciona para copiar (Ctrl+C):",
    // Notification Center (desde 1.2.0)
    nc_title: "Notification Center", nc_detected: "detectado", nc_not_installed: "no instalado",
    nc_master: "Enviar notificaciones", nc_types: "Tipos de notificación",
    nc_hint: "El Notification Center recoge las notificaciones y las distribuye. Aquí eliges qué comunica este gestor. La lista está ordenada por urgencia, primero las críticas.",
    nc_missing_hint: "El Notification Center no está instalado. Los interruptores surten efecto en cuanto se instale; sin él no ocurre nada.",
    nc_saved: "Guardado",
    nc_sev_critical: "Crítica", nc_sev_warning: "Aviso", nc_sev_info: "Info", nc_sev_ok: "OK",
    z2m_update_available: "Actualización disponible: {v}", z2m_update_hint: "Actualiza Zigbee2MQTT manualmente en su servidor o en el contenedor Docker, no a través de HACS.", z2m_check_now: "Comprobar ahora", z2m_check_failed: "Comprobación no posible", z2m_release: "Ver versión",
  },
  // Српски (ћирилица): Kernbegriffe übersetzt, übrige Texte fallen auf Englisch zurück (siehe _t)
  sr: {
    connecting: "Повезивање …",
    error_generic: "Радња није успела.",
    tab_devices: "Уређаји", tab_battery: "Батерија", tab_updates: "Ажурирања",
    tab_groups: "Групе", tab_bindings: "Повезивања", tab_bridge: "Мост",
    chip_devices: "Уређаји", chip_offline: "Ван мреже", chip_low_battery: "Слаба батерија", chip_updates: "Ажурирања",
    search: "Претражи по имену, моделу или IEEE", sort: "Сортирање",
    sort_name_asc: "Име А–Ш", sort_name_desc: "Име Ш–А",
    no_data: "Још нема података из Zigbee2MQTT. Да ли мост ради?", no_results: "Нема резултата.",
    show_more: "Прикажи још {n}",
    offline: "ван мреже", online: "на мрежи", unknown: "непознато", inactive: "неактивно", disabled: "искључен",
    never: "никад", yes: "да", no: "не", close: "Затвори", save: "Сачувај", add: "Додај", cancel: "Откажи",
    confirm: "Сигурно?", loading: "Учитавање …", details: "Детаљи", remove: "Уклони уређај", rename: "Преименуј",
    group: "Група",
    pairing_active: "Упаривање активно", pairing_start: "Покрени упаривање", pairing_stop: "Заврши упаривање",
    check_all: "Провери сва ажурирања", install: "Инсталирај",
    ota_available: "Ажурирање доступно", ota_idle: "Ажурно",
    sec_info: "Инфо", sec_status: "Стање", sec_entities: "Ентитети (за аутоматизације)",
    f_vendor: "Произвођач", f_model: "Модел", f_area: "Просторија", f_ieee: "IEEE", f_lqi: "Квалитет сигнала",
    f_battery: "Батерија", f_last_seen: "Последњи пут виђен", f_version: "Верзија", f_base_topic: "Основна тема (base topic)",
    copy: "Копирај у привремену меморију", copy_all: "Копирај све",
    flt_missing: "Недостаје у Zigbee2MQTT", chip_missing: "Недостаје", status_missing: "Недостаје у Zigbee2MQTT (последњи познати уређај)",
    missing_badge: "недостаје",
    missing_hint: "Ови уређаји су били познати, али тренутно недостају на листи уређаја Zigbee2MQTT. Нестају одавде сами чим се врате.",
    missing_popup_hint: "Овог уређаја више нема на листи уређаја Zigbee2MQTT. Приказани су последњи познати подаци. Ако се врати, ознака нестаје сама; помоћу „Заборави“ га уклањаш са ове листе.",
    forget: "Заборави", forget_all: "Заборави све који недостају", f_missing_since: "Недостаје од",
    network: "Мрежа", network_open: "Отвори мрежну мапу Zigbee2MQTT",
    open_entity: "Отвори ентитет у Home Assistant-у", open_device: "Отвори уређај у Home Assistant-у",
    ev_device_missing: "Недостаје у Zigbee2MQTT", ev_device_back: "Поново на листи уређаја",
    network_tab_hint: "Отвара мрежну мапу Zigbee2MQTT (топологију) у Home Assistant-у или у новој картици.", network_no_url: "Адреса мапе мреже још није позната. Унеси је у Подешавања → Уређаји и услуге → Zigbee2MQTT Manager → Конфигуриши као „Адреса мапе мреже“ (нпр. http://192.168.1.10:8080/#/network) или постави `network_url` у картици.",
    net_intro: "Структура Zigbee мреже, прочитана из табела суседа рутера. Сваки рутер је везан за своју најбољу везу ка координатору (јака, мало скокова) – апроксимација стварних рута.", net_refresh: "Поново учитај мрежу", net_refresh_hint: "Zigbee2MQTT за ово пита сваки уређај појединачно. Зависно од мреже траје неколико минута и оптерећује Zigbee мрежу. Учитај је само када је треба.", net_loading: "Мрежа се учитава (почело {t}) …",
    net_updated: "Стање: {t}", net_none: "Мрежа још није учитана. Покрени упит са „Поново учитај мрежу“.", net_error_failed: "Zigbee2MQTT није испоручио мапу мреже.", net_error_timeout: "Zigbee2MQTT није одговорио на време (прекинуто након 10 минута).",
    net_summary: "{routers} рутера · {clients} крајњих уређаја · {links} веза", net_coordinator: "Координатор", net_router: "Рутер", net_cloud: "{n} крајњих уређаја",
    net_links_routers: "Везе ка рутерима", net_end_devices: "Крајњи уређаји", net_rel_parent: "Родитељ", net_rel_child: "Дете",
    net_rel_sibling: "Сусед", net_orphan: "Веза са координатором није позната", net_unassigned: "Без познате везе", net_unassigned_hint: "Ови крајњи уређаји нису ни у једној табели суседа (нпр. ван домета, нови или кратко активни).",
    net_open_tip: "Отвори {name}", net_show_tip: "Прикажи крајње уређаје од {name}", net_no_links: "Нема познатих веза", net_refresh_done: "Мапа мреже ажурирана",
    net_lqi: "Сигнал", ev_network_map: "Мапа мреже учитана", sec_monitor: "Надзор", ignore_offline: "Игнориши статус ван мреже",
    ignore_offline_hint: "Уређај се не рачуна као ван мреже: без сметње, без догађаја, без поруке за Notification Center. Корисно нпр. за лампе иза зидног прекидача.", ignored_badge: "Ван мреже игнорисано", status_ignored: "Ван мреже, игнорише се", flt_ignored: "Ван мреже игнорисано",
    net_map_label: "Zigbee мапа мреже", net_native: "Отвори Zigbee2MQTT интерфејс",
    z2m_update_available: "Ажурирање доступно: {v}", z2m_update_hint: "Ажурирај Zigbee2MQTT ручно на његовом серверу или у Docker контејнеру, не преко HACS-а.", z2m_check_now: "Провери сада", z2m_check_failed: "Провера није могућа", z2m_release: "Погледај издање",
  },
  // Srpski (latinica): automatski iz ćiriličnog bloka prevedena slova, isti ključevi
  "sr-Latn": {
    connecting: "Povezivanje …",
    error_generic: "Radnja nije uspela.",
    tab_devices: "Uređaji", tab_battery: "Baterija", tab_updates: "Ažuriranja",
    tab_groups: "Grupe", tab_bindings: "Povezivanja", tab_bridge: "Most",
    chip_devices: "Uređaji", chip_offline: "Van mreže", chip_low_battery: "Slaba baterija", chip_updates: "Ažuriranja",
    search: "Pretraži po imenu, modelu ili IEEE", sort: "Sortiranje",
    sort_name_asc: "Ime A–Š", sort_name_desc: "Ime Š–A",
    no_data: "Još nema podataka iz Zigbee2MQTT. Da li most radi?", no_results: "Nema rezultata.",
    show_more: "Prikaži još {n}",
    offline: "van mreže", online: "na mreži", unknown: "nepoznato", inactive: "neaktivno", disabled: "isključen",
    never: "nikad", yes: "da", no: "ne", close: "Zatvori", save: "Sačuvaj", add: "Dodaj", cancel: "Otkaži",
    confirm: "Sigurno?", loading: "Učitavanje …", details: "Detalji", remove: "Ukloni uređaj", rename: "Preimenuj",
    group: "Grupa",
    pairing_active: "Uparivanje aktivno", pairing_start: "Pokreni uparivanje", pairing_stop: "Završi uparivanje",
    check_all: "Proveri sva ažuriranja", install: "Instaliraj",
    ota_available: "Ažuriranje dostupno", ota_idle: "Ažurno",
    sec_info: "Info", sec_status: "Stanje", sec_entities: "Entiteti (za automatizacije)",
    f_vendor: "Proizvođač", f_model: "Model", f_area: "Prostorija", f_ieee: "IEEE", f_lqi: "Kvalitet signala",
    f_battery: "Baterija", f_last_seen: "Poslednji put viđen", f_version: "Verzija", f_base_topic: "Osnovna tema (base topic)",
    copy: "Kopiraj u privremenu memoriju", copy_all: "Kopiraj sve",
    flt_missing: "Nedostaje u Zigbee2MQTT", chip_missing: "Nedostaje", status_missing: "Nedostaje u Zigbee2MQTT (poslednji poznati uređaj)",
    missing_badge: "nedostaje",
    missing_hint: "Ovi uređaji su bili poznati, ali trenutno nedostaju na listi uređaja Zigbee2MQTT. Nestaju odavde sami čim se vrate.",
    missing_popup_hint: "Ovog uređaja više nema na listi uređaja Zigbee2MQTT. Prikazani su poslednji poznati podaci. Ako se vrati, oznaka nestaje sama; pomoću „Zaboravi“ ga uklanjaš sa ove liste.",
    forget: "Zaboravi", forget_all: "Zaboravi sve koji nedostaju", f_missing_since: "Nedostaje od",
    network: "Mreža", network_open: "Otvori mrežnu mapu Zigbee2MQTT",
    open_entity: "Otvori entitet u Home Assistant-u", open_device: "Otvori uređaj u Home Assistant-u",
    ev_device_missing: "Nedostaje u Zigbee2MQTT", ev_device_back: "Ponovo na listi uređaja",
    network_tab_hint: "Otvara mrežnu mapu Zigbee2MQTT (topologiju) u Home Assistant-u ili u novoj kartici.", network_no_url: "Adresa mape mreže još nije poznata. Unesi je u Podešavanja → Uređaji i usluge → Zigbee2MQTT Manager → Konfiguriši kao „Adresa mape mreže“ (npr. http://192.168.1.10:8080/#/network) ili postavi `network_url` u kartici.",
    net_intro: "Struktura Zigbee mreže, pročitana iz tabela suseda rutera. Svaki ruter je vezan za svoju najbolju vezu ka koordinatoru (jaka, malo skokova) – aproksimacija stvarnih ruta.", net_refresh: "Ponovo učitaj mrežu", net_refresh_hint: "Zigbee2MQTT za ovo pita svaki uređaj pojedinačno. Zavisno od mreže traje nekoliko minuta i opterećuje Zigbee mrežu. Učitaj je samo kada je treba.", net_loading: "Mreža se učitava (počelo {t}) …",
    net_updated: "Stanje: {t}", net_none: "Mreža još nije učitana. Pokreni upit sa „Ponovo učitaj mrežu“.", net_error_failed: "Zigbee2MQTT nije isporučio mapu mreže.", net_error_timeout: "Zigbee2MQTT nije odgovorio na vreme (prekinuto nakon 10 minuta).",
    net_summary: "{routers} rutera · {clients} krajnjih uređaja · {links} veza", net_coordinator: "Koordinator", net_router: "Ruter", net_cloud: "{n} krajnjih uređaja",
    net_links_routers: "Veze ka ruterima", net_end_devices: "Krajnji uređaji", net_rel_parent: "Roditelj", net_rel_child: "Dete",
    net_rel_sibling: "Sused", net_orphan: "Veza sa koordinatorom nije poznata", net_unassigned: "Bez poznate veze", net_unassigned_hint: "Ovi krajnji uređaji nisu ni u jednoj tabeli suseda (npr. van dometa, novi ili kratko aktivni).",
    net_open_tip: "Otvori {name}", net_show_tip: "Prikaži krajnje uređaje od {name}", net_no_links: "Nema poznatih veza", net_refresh_done: "Mapa mreže ažurirana",
    net_lqi: "Signal", ev_network_map: "Mapa mreže učitana", sec_monitor: "Nadzor", ignore_offline: "Ignoriši status van mreže",
    ignore_offline_hint: "Uređaj se ne računa kao van mreže: bez smetnje, bez događaja, bez poruke za Notification Center. Korisno npr. za lampe iza zidnog prekidača.", ignored_badge: "Van mreže ignorisano", status_ignored: "Van mreže, ignoriše se", flt_ignored: "Van mreže ignorisano",
    net_map_label: "Zigbee mapa mreže", net_native: "Otvori Zigbee2MQTT interfejs",
    z2m_update_available: "Ažuriranje dostupno: {v}", z2m_update_hint: "Ažuriraj Zigbee2MQTT ručno na njegovom serveru ili u Docker kontejneru, ne preko HACS-a.", z2m_check_now: "Proveri sada", z2m_check_failed: "Provera nije moguća", z2m_release: "Pogledaj izdanje",
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
  .filter-bar-field select, .filter-bar-field input[type="search"], .field input, .field select, .field textarea.comment-edit {
    font: inherit; font-size: 1em; color: var(--primary-text-color, #212121);
    background: var(--card-background-color, #fff); border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px; padding: 5px 8px; box-sizing: border-box;
  }
  .filter-bar-field select { max-width: 170px; }
  .filter-bar-field.grow { flex: 1 1 160px; }
  .filter-bar-field.grow input { flex: 1 1 auto; min-width: 0; }

  /* Filter-Bereich, aktive Filter und Gruppen (seit 1.1.0) */
  .flt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px 12px; padding-top: 4px; }
  .flt-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8em; color: var(--secondary-text-color, #727272); }
  .flt-field select {
    font: inherit; font-size: 1em; color: var(--primary-text-color, #212121); width: 100%;
    background: var(--card-background-color, #fff); border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px; padding: 5px 8px; box-sizing: border-box;
  }
  .group-list { display: flex; flex-direction: column; gap: 8px; }
  .group-list .settings-accordion-body { padding-top: 0; }
  .filters-wrap { margin-bottom: 8px; }
  .fchips { padding: 0 0 8px; }
  .fchips .chip { cursor: pointer; align-items: center; gap: 4px; --mdc-icon-size: 14px; }

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
  .row-icon .dot.missing { background: var(--zmm-color-warning); }
  .row-icon .dot.ignored { background: transparent; border: 2px solid var(--secondary-text-color, #727272); box-sizing: border-box; }
  /* Aus Zigbee2MQTT verschwundene Geräte: ausgegraut, aber weiter anklickbar */
  .row.missing .row-icon, .row.missing .row-main, .row.missing .row-extra { opacity: 0.55; }
  .row.missing .row-icon .dev-img { filter: grayscale(1); }
  .row.missing .row-name { font-style: italic; }
  .ent-link { display: inline-flex; align-items: center; gap: 4px; color: var(--primary-color, #03a9f4); text-decoration: none; cursor: pointer; }
  .ent-link:hover code { text-decoration: underline; }
  .ent-link ha-icon { --mdc-icon-size: 14px; flex-shrink: 0; }
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
  /* Netzwerk: Zeichnung (SVG) und Verbindungslisten */
  .nm-wrap { overflow-x: auto; padding: 0 2px; margin: 4px 0; }
  .nm-svg { width: 100%; height: auto; display: block; margin: 0; }
  .nm-node rect { fill: var(--card-background-color, #fff); stroke: var(--zmm-color-tab-active); stroke-width: 1.5; }
  .nm-node.coord rect { stroke-width: 2.5; }
  .nm-node.cl rect { stroke: var(--divider-color, #999); stroke-dasharray: 4 3; }
  .nm-node.off rect { stroke: var(--zmm-color-error); }
  .nm-node.link { cursor: pointer; }
  .nm-node.link:hover rect, .nm-node.link:focus-visible rect { stroke-width: 3; }
  .nm-node.link:focus-visible { outline: none; }
  .nm-node ha-icon { --mdc-icon-size: 24px; width: 24px; height: 24px; color: var(--zmm-color-tab-active); }
  .nm-node.cl ha-icon { --mdc-icon-size: 18px; width: 18px; height: 18px; color: var(--secondary-text-color, #727272); }
  .nm-node.off ha-icon { color: var(--zmm-color-error); }
  .nm-t { font-size: 13px; font-weight: 600; fill: var(--primary-text-color, #222); }
  .nm-s { font-size: 11px; fill: var(--secondary-text-color, #727272); }
  .nm-lbl { font-size: 10px; fill: var(--secondary-text-color, #727272); }
  .nm-edge { fill: none; stroke: var(--zmm-color-tab-active); stroke-width: 2; }
  .nm-edge.nm-dash { stroke: var(--divider-color, #999); stroke-dasharray: 4 3; stroke-width: 1.5; }
  .nm-edge.nm-orphan { stroke: var(--zmm-color-warning); stroke-dasharray: 6 4; }
  .nm-sub { font-weight: 600; font-size: 0.9em; margin: 8px 0 2px; }
  .nm-row { display: flex; align-items: center; gap: 8px; padding: 6px 2px; border-bottom: 1px solid var(--divider-color, #e0e0e0); cursor: pointer; }
  .nm-row.plain { cursor: default; }
  .nm-row:last-child { border-bottom: none; }
  .nm-row .nm-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nm-row .nm-dot { position: relative; width: 14px; height: 14px; flex: none; }
  .nm-row .nm-dot .dot { position: static; }
  .nm-row ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color, #727272); }
  .nm-rel { white-space: nowrap; }
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
  /* Schalter in den Funktionen (seit 1.1.0) */
  .ex-sw { display: inline-flex; align-items: center; gap: 8px; }
  .ex-set { display: inline-flex; gap: 6px; }
  .sw {
    position: relative; width: 38px; height: 20px; border-radius: 10px; border: none; padding: 0; cursor: pointer;
    background: var(--disabled-text-color, #9e9e9e); transition: background 0.15s ease; flex-shrink: 0;
  }
  .sw .knob {
    position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%;
    background: var(--card-background-color, #fff); transition: transform 0.15s ease; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
  .sw.on { background: var(--zmm-color-success); }
  .sw.on .knob { transform: translateX(18px); }
  .sw[disabled] { opacity: 0.5; cursor: default; }
  .sw:focus-visible { outline: 2px solid var(--zmm-color-tab-active); outline-offset: 2px; }
  .nc-types { margin-top: 10px; }
  .nc-types.dim { opacity: 0.55; }
  .nc-label { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .nc-label ha-icon { --mdc-icon-size: 18px; }
  .sw-label { min-width: 2.2em; text-align: left; font-weight: 500; }
  /* Entitäten kopieren */
  .ent-list { max-height: 260px; overflow-y: auto; }
  .ent { display: flex; flex-direction: column; min-width: 0; }
  .ent code { font-size: 0.9em; word-break: break-all; }
  .ent .muted { font-size: 0.78em; }
  .manual-copy {
    width: 100%; box-sizing: border-box; font: inherit; font-size: 0.85em; color: var(--primary-text-color, #212121);
    background: var(--card-background-color, #fff); border: 1px solid var(--divider-color, #e0e0e0); border-radius: 6px; padding: 6px 8px;
  }
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
  .field textarea.comment-edit { width: 100%; resize: vertical; min-height: 3.2em; }
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
  .popup-close:hover { color: var(--primary-text-color, #212121); }
  .popup-body { padding: 10px 14px 14px; display: flex; flex-direction: column; gap: 8px; }

  /* Hinweis-Toast */
  .toast {
    position: fixed; left: 50%; bottom: 24px; transform: translate(-50%, 16px); opacity: 0; pointer-events: none; z-index: 30;
    padding: 10px 18px; border-radius: 8px; background: var(--primary-text-color, #212121); color: var(--card-background-color, #fff);
    font-size: 0.88em; max-width: 90vw; transition: opacity 0.2s, transform 0.2s;
  }
  .toast.show { opacity: 1; transform: translate(-50%, 0); }
  .toast.error { background: var(--zmm-color-error); color: #fff; }
  @media (prefers-reduced-motion: reduce) { .toast, .settings-accordion-summary::after, .sw, .sw .knob { transition: none; } }
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

// ------------------------------------------------------------------ DOM-Abgleich
// Tastatur-Eingabefelder (Home-Assistant-Kurzbefehle dürfen dort nicht ausgelöst werden)
function isTypingTarget(el) {
  if (!el || el.nodeType !== 1) return false;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  if (tag === "INPUT") {
    const type = (el.getAttribute("type") || "text").toLowerCase();
    return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "image", "file"].includes(type);
  }
  return false;
}

// Schlüssel für Elemente, die beim Abgleich ihren Platz wechseln dürfen (Zeilen, Akkordeons)
function morphKey(node) {
  if (node.nodeType !== 1) return null;
  const d = node.dataset;
  if (!d) return null;
  if (node.tagName === "DETAILS" && d.k) return `d:${d.k}`;
  if (d.act === "open" && d.ieee) return `r:${d.ieee}`;
  return null;
}

function morphAttrs(oldEl, newEl) {
  for (const a of Array.from(oldEl.attributes)) {
    if (!newEl.hasAttribute(a.name)) oldEl.removeAttribute(a.name);
  }
  for (const a of Array.from(newEl.attributes)) {
    if (oldEl.getAttribute(a.name) !== a.value) oldEl.setAttribute(a.name, a.value);
  }
}

function morphNode(oldN, newN, active) {
  if (oldN.nodeType !== 1) {
    if (oldN.nodeValue !== newN.nodeValue) oldN.nodeValue = newN.nodeValue;
    return;
  }
  morphAttrs(oldN, newN);
  const tag = oldN.tagName;
  if (tag === "TEXTAREA") {
    if (oldN !== active && oldN.value !== newN.value) oldN.value = newN.value;
    return;
  }
  morphChildren(oldN, newN, active);
  if (tag === "INPUT") {
    if (oldN !== active) {
      if (oldN.type === "checkbox" || oldN.type === "radio") {
        if (oldN.checked !== newN.checked) oldN.checked = newN.checked;
      } else if (oldN.value !== newN.value) {
        oldN.value = newN.value;
      }
    }
  } else if (tag === "SELECT" && oldN !== active) {
    if (oldN.value !== newN.value) oldN.value = newN.value;
  }
}

function morphChildren(oldP, newP, active) {
  const keyed = new Map();
  for (const k of Array.from(oldP.childNodes)) {
    const key = morphKey(k);
    if (key) keyed.set(key, keyed.has(key) ? null : k);
  }
  const kept = new Set();
  let ref = oldP.firstChild;
  for (const w of Array.from(newP.childNodes)) {
    const key = morphKey(w);
    let o = null;
    if (key) {
      o = keyed.get(key) || null;
      if (o) keyed.set(key, null);
    } else {
      let c = ref;
      while (c && (kept.has(c) || morphKey(c))) c = c.nextSibling;
      if (c && c.nodeType === w.nodeType && c.nodeName === w.nodeName) o = c;
    }
    if (o) {
      kept.add(o);
      if (o === ref) ref = ref.nextSibling;
      else oldP.insertBefore(o, ref);
      morphNode(o, w, active);
    } else {
      kept.add(w);
      oldP.insertBefore(w, ref);
    }
  }
  for (const k of Array.from(oldP.childNodes)) {
    if (!kept.has(k)) oldP.removeChild(k);
  }
}

// Setzt `html` als Inhalt von `target`, ändert aber nur, was sich unterscheidet.
function morphInto(target, html, active) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  morphChildren(target, tpl.content, active);
}

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
    this._flt = {};
    this._groupBy = null;
    this._groupKeys = [];
    this._pending = new Set();
    this._manualCopy = null;
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
    this._flt = {};
    this._groupBy = null;
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
    clearTimeout(this._renderTimer);
    this._renderTimer = null;
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
    const raw = String(this._hass?.language || "en");
    // Serbisch (lateinisch): Home Assistant meldet "sr-Latn"; eigener Textblock statt Rückfall auf Kyrillisch
    if (/^sr[-_]latn/i.test(raw)) return "sr-Latn";
    return raw.slice(0, 2);
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
      const fromComment = Date.now() - (this._commentSavedAt || 0) < 15000;
      this._commentSavedAt = 0;
      msg = this._t(fromComment ? "done_comment" : "done_options");
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
    else if (topic === "networkmap") msg = this._t("net_refresh_done");
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
    const before = silent && this._details[ieee] && !this._details[ieee].loading ? JSON.stringify(this._details[ieee]) : undefined;
    if (!(silent && this._details[ieee] && !this._details[ieee].loading)) this._details[ieee] = { loading: true };
    this._exSeen = { ...(this._exSeen || {}), [ieee]: this._lastSeenOf(ieee) };
    try {
      const result = await this._hass.callWS({ type: "zigbee2mqtt_manager/details", ieee, ...this._targetParams() });
      if (gen === this._gen) this._details[ieee] = result;
    } catch (err) {
      if (gen === this._gen) this._details[ieee] = { error: err?.message || String(err) };
    }
    // Stiller Nachladevorgang ohne neue Werte: nicht neu zeichnen (Fokus, Klicks bleiben ungestört)
    if (silent && before !== undefined && JSON.stringify(this._details[ieee]) === before) return;
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
      if ((e.key === "Enter" || e.key === " ") && e.target.matches?.(".row.clickable, .nm-node.link, .nm-row[role=button]")) {
        e.preventDefault();
        e.target.click();
      }
    });
    // Eingaben im Shadow-DOM erscheinen für Home Assistant als Ereignisse der Karte selbst
    // (Retargeting) und lösen dessen Kurzbefehle aus (z. B. „e“ öffnet die Entitätssuche).
    // Tastenereignisse aus Eingabefeldern deshalb nicht weiterreichen.
    for (const type of ["keydown", "keyup", "keypress"]) {
      root.addEventListener(type, (e) => {
        if (isTypingTarget(e.composedPath?.()[0] ?? e.target)) e.stopPropagation();
      });
    }
    // <details> merkt sich seinen Zustand selbst; wir speichern ihn nur, damit er ein
    // Neuzeichnen überlebt (kein Neuzeichnen hier, sonst Endlosschleife). "toggle" bubbelt nicht.
    root.addEventListener(
      "toggle",
      (e) => {
        const el = e.target;
        if (!el || el.tagName !== "DETAILS" || !el.dataset?.k) return;
        const k = el.dataset.k;
        if (this._open[k] === el.open) return;
        this._open[k] = el.open;
        // Beim Aufklappen der Funktionen im Popup sofort frische Werte holen
        if (k === "p:exposes" && el.open && this._selected && el.closest("#popup")) {
          this._loadDetails(this._selected, true, true);
        }
      },
      true
    );
  }

  // ----------------------------------------------------------------- Rendern
  _signature() {
    return JSON.stringify([this._data, this._error, this._confirming, this._selected]);
  }

  _renderIfChanged() {
    const sig = this._signature();
    if (sig === this._lastSig) return;
    // Z2M meldet ständig neue Werte (last_seen, Signal): höchstens alle RENDER_MIN_MS zeichnen
    // (erstes Ereignis sofort, das letzte folgt verzögert).
    const wait = RENDER_MIN_MS - (Date.now() - (this._lastRenderAt || 0));
    if (wait > 0 && this._renderedWithData) {
      if (!this._renderTimer) {
        this._renderTimer = setTimeout(() => {
          this._renderTimer = null;
          this._renderIfChanged();
        }, wait);
      }
      return;
    }
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

    // Stylesheet und Zoom nur bei Änderung setzen (sonst wird das CSS jedes Mal neu geparst)
    const css = this._styles();
    if (css !== this._lastCss) {
      this._styleEl.textContent = css;
      this._lastCss = css;
    }
    const zoom = this._cardZoom();
    if (zoom !== this._lastZoom) {
      this._contentEl.style.zoom = zoom;
      this._lastZoom = zoom;
    }

    const title = String(this._config.title ?? "").trim();
    const headerAttr = this._config.show_title === false || !title ? "" : ` header="${esc(title)}"`;
    const html = `
      <ha-card${headerAttr}>
        <div class="card-content">
          ${this._renderInstanceBar()}
          ${this._renderBanners()}
          ${this._renderTabs(visible)}
          ${this._renderMain()}
        </div>
      </ha-card>`;

    this._lastRenderAt = Date.now();
    this._renderedWithData = Boolean(this._data);
    // Unverändertes HTML: DOM nicht anfassen. Sonst nur die Unterschiede einarbeiten, damit
    // Gerätebilder nicht neu geladen werden, nichts flackert und die Scroll-Position bleibt.
    if (html !== this._lastHtml || !this._contentEl.firstElementChild) {
      this._lastHtml = html;
      morphInto(this._contentEl, html, this.shadowRoot.activeElement);
    }

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
      case "network":
        return this._renderNetworkTab();
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

  // Alle Geräte inkl. der aus Zigbee2MQTT verschwundenen ("fehlt")
  _allDevices() {
    return [...(this._data?.devices ?? []), ...(this._data?.missing ?? [])];
  }

  _devices(tab) {
    let list = tab === "devices" ? this._allDevices() : [...(this._data?.devices ?? [])];
    if (tab === "battery") list = list.filter((d) => d.battery !== null && d.battery !== undefined);
    else if (tab === "updates") list = list.filter((d) => d.ota.capable);
    else if (tab === "bindings") list = list.filter((d) => d.bindings.length);

    if (tab === "devices") {
      if (this._filter === "missing") list = list.filter((d) => d.missing === true);
      else if (this._filter === "all" && !this._flt?.status) list = list.filter((d) => !d.missing || this._showMissingInAll());
      else if (this._filter !== "all") list = list.filter((d) => !d.missing);
      if (this._filter === "offline") list = list.filter((d) => this._isOffline(d));
      else if (this._filter === "stale") list = list.filter((d) => d.stale === true && !d.disabled);
      else if (this._filter === "disabled") list = list.filter((d) => d.disabled === true);
      else if (this._filter === "low") {
        const t = this._data.stats.low_battery_threshold;
        list = list.filter((d) => d.battery !== null && d.battery !== undefined && d.battery < t);
      } else if (this._filter === "updates") list = list.filter((d) => d.ota.state === "available");
    }

    if (FILTER_TABS.includes(tab)) list = this._applyFilters(list);

    const q = this._search;
    if (q) {
      list = list.filter((d) =>
        [d.name, d.vendor, d.model, d.ieee, d.description, d.comment, d.area, d.ha_device].some((v) => String(v || "").toLowerCase().includes(q))
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

  // Status wie der Statuspunkt: Z2M-Verfügbarkeit hat Vorrang, sonst aus "zuletzt gesehen" abgeleitet.
  // Deaktivierte Geräte (in Z2M abgeschaltet) sind nicht "offline" – sie werden getrennt geführt.
  _isOffline(d) {
    return !d.disabled && d.available === false && !d.ignore_offline;
  }

  // Fehlende Geräte erscheinen in der Liste "Alle" (ausgegraut), damit sie nicht untergehen
  _showMissingInAll() {
    return true;
  }

  _statusOf(d) {
    if (d.missing) return "missing";
    if (d.disabled) return "disabled";
    if (d.available === true) return "online";
    if (d.available === false) return d.ignore_offline ? "ignored" : "offline";
    const ts = d.last_seen ? Date.parse(d.last_seen) : NaN;
    if (Number.isNaN(ts)) return "unknown";
    return Date.now() - ts <= STALE_AFTER_MS ? "online" : "offline";
  }

  _applyFilters(list) {
    const flt = this._flt || {};
    const active = FILTER_KEYS.filter((k) => flt[k]);
    if (!active.length) return list;
    const low = this._data?.stats?.low_battery_threshold ?? 20;
    const inGroup = new Set();
    for (const g of this._data?.groups || []) for (const m of g.members || []) inGroup.add(m.ieee);
    const now = Date.now();
    return list.filter((d) =>
      active.every((k) => {
        const v = flt[k];
        switch (k) {
          case "status":
            if (v === "stale") return d.stale === true && !d.disabled;
            return this._statusOf(d) === v;
          case "power": {
            const bat = (d.battery !== null && d.battery !== undefined) || /battery/i.test(String(d.power_source || ""));
            if (v === "battery") return bat;
            if (v === "mains") return !bat;
            return d.battery !== null && d.battery !== undefined && d.battery < low;
          }
          case "signal": {
            const q = d.linkquality;
            if (q === null || q === undefined) return false;
            return v === "good" ? q >= 100 : v === "mid" ? q >= 50 && q < 100 : q < 50;
          }
          case "role":
            return d.type === v;
          case "firmware":
            return d.ota?.state === "available";
          case "seen": {
            const ts = d.last_seen ? Date.parse(d.last_seen) : NaN;
            const limit = (v === "24h" ? 24 : 24 * 7) * 3600 * 1000;
            return Number.isNaN(ts) || now - ts > limit;
          }
          case "membership":
            return !inGroup.has(d.ieee);
          case "vendor":
            return v === UNKNOWN_VENDOR ? !d.vendor : d.vendor === v;
          case "class":
            return (d.device_class || "other") === v;
          default:
            return true;
        }
      })
    );
  }

  _groupMode() {
    const g = this._groupBy ?? this._config.default_group_by;
    return GROUP_BY_OPTIONS.some((o) => o.value === g) ? g : "none";
  }

  _fltOptionLabel(key, value) {
    if (key === "vendor") return value === UNKNOWN_VENDOR ? this._t("group_unknown") : value;
    if (key === "class") return this._t(`cls_${value}`);
    const field = FILTER_FIELDS.find((f) => f.key === key);
    const opt = field?.options.find(([v]) => v === value);
    return opt ? this._t(opt[1]) : value;
  }

  _renderFilterPanel(tab) {
    if (!this._config.show_filters || !FILTER_TABS.includes(tab)) return "";
    const t = (k, v) => this._t(k, v);
    const active = FILTER_KEYS.filter((k) => this._flt[k]);
    const devices = this._allDevices();
    const select = (key, label, options) => `<label class="flt-field"><span>${esc(label)}</span>
        <select data-change="flt" data-flt="${key}" data-fk="flt:${key}"><option value="">${esc(t("flt_all"))}</option>${options
          .map(([v, l]) => `<option value="${esc(v)}" ${this._flt[key] === v ? "selected" : ""}>${esc(l)}</option>`)
          .join("")}</select></label>`;

    const vendors = [...new Set(devices.map((d) => d.vendor).filter(Boolean))].sort((a, b) => a.localeCompare(b, this._lang));
    const vendorOptions = vendors.map((v) => [v, v]);
    if (devices.some((d) => !d.vendor)) vendorOptions.push([UNKNOWN_VENDOR, t("group_unknown")]);
    const classOptions = DEVICE_CLASSES.filter((c) => devices.some((d) => (d.device_class || "other") === c)).map((c) => [c, t(`cls_${c}`)]);

    const fields = [
      ...FILTER_FIELDS.map((f) => select(f.key, t(f.label), f.options.map(([v, l]) => [v, t(l)]))),
      select("vendor", t("flt_vendor"), vendorOptions),
      select("class", t("flt_class"), classOptions),
    ].join("");
    const body = `<div class="flt-grid">${fields}</div>
      <div class="hint">${esc(t("flt_hint"))}</div>
      <div class="toolbar"><button class="btn small" data-act="flt_reset" ${active.length ? "" : "disabled"}>${esc(t("filter_reset"))}</button></div>`;
    return `<div class="filters-wrap">${this._accordion("f:filters", "mdi:filter-variant", t("filters"), body, {
      meta: active.length ? t("filter_active", { n: active.length }) : "",
    })}</div>`;
  }

  // Aktive Filter als kleine Chips (Tippen entfernt den Filter), auch bei eingeklapptem Filter-Bereich
  _renderActiveFilters(tab) {
    if (!FILTER_TABS.includes(tab)) return "";
    const active = FILTER_KEYS.filter((k) => this._flt[k]);
    if (!active.length) return "";
    const t = (k) => this._t(k);
    const labelKey = (k) => (k === "vendor" ? "flt_vendor" : k === "class" ? "flt_class" : FILTER_FIELDS.find((f) => f.key === k).label);
    return `<div class="chips fchips">${active
      .map(
        (k) =>
          `<button class="chip on" data-act="flt_clear" data-flt="${k}" title="${esc(t("filter_remove"))}">${esc(t(labelKey(k)))}: ${esc(
            this._fltOptionLabel(k, this._flt[k])
          )}<ha-icon icon="mdi:close"></ha-icon></button>`
      )
      .join("")}</div>`;
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
      ${(s.stale || this._filter === "stale") ? chip("stale", s.stale || 0, this._t("chip_stale"), "var(--zmm-color-warning)") : ""}
      ${chip("low", s.low_battery, this._t("chip_low_battery"), "var(--zmm-color-warning)")}
      ${chip("updates", s.updates_available, this._t("chip_updates"), "var(--zmm-color-info)")}
      ${(s.missing || this._filter === "missing") ? chip("missing", s.missing || 0, this._t("chip_missing"), "var(--zmm-color-warning)") : ""}
      ${(s.disabled || this._filter === "disabled") ? chip("disabled", s.disabled || 0, this._t("chip_disabled"), "") : ""}
    </div>`;
  }

  _renderFilterBar(tab, withSort = true) {
    const cfg = this._config;
    const canGroup = Boolean(cfg.show_group_by) && withSort && FILTER_TABS.includes(tab);
    if (!cfg.show_search && !(cfg.show_filter_bar && withSort) && !canGroup) return "";
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
    const mode = this._groupMode();
    const group = canGroup
      ? `<label class="filter-bar-field">${esc(this._t("group_by"))}
           <select data-change="group_by" data-fk="group_by">${GROUP_BY_OPTIONS.map(
             (o) => `<option value="${o.value}" ${o.value === mode ? "selected" : ""}>${esc(this._t(o.label))}</option>`
           ).join("")}</select></label>`
      : "";
    const expand =
      canGroup && mode !== "none"
        ? `<span class="filter-bar-field"><button class="btn icon" data-act="grp_all" data-value="1" title="${esc(this._t("expand_all"))}" aria-label="${esc(this._t("expand_all"))}"><ha-icon icon="mdi:unfold-more-horizontal"></ha-icon></button>
             <button class="btn icon" data-act="grp_all" data-value="0" title="${esc(this._t("collapse_all"))}" aria-label="${esc(this._t("collapse_all"))}"><ha-icon icon="mdi:unfold-less-horizontal"></ha-icon></button></span>`
        : "";
    return `<div class="filter-bar">${search}${sort}${group}${expand}</div>`;
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
    if (d.missing) {
      cls = "missing";
      tip = t("status_missing");
    } else if (d.disabled) {
      cls = "";
      tip = t("status_disabled");
    } else if (d.available === true) {
      cls = d.stale ? "stale" : "on";
      tip = d.stale ? t("status_silent", { t: this._relTime(d.last_seen) }) : t("status_online");
    } else if (d.available === false) {
      cls = d.ignore_offline ? "ignored" : "off";
      tip = t(d.ignore_offline ? "status_ignored" : "status_offline");
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
        cfg.show_area ? d.area : "",
      ].filter(Boolean).map((v) => `<span>${esc(v)}</span>`).join("");
      const lqi =
        cfg.show_lqi && d.linkquality !== null && d.linkquality !== undefined
          ? `<span class="pill" style="--c:${this._lqiColor(d.linkquality)}">${esc(d.linkquality)}</span>`
          : "";
      const bat = cfg.show_battery_value && d.battery !== null && d.battery !== undefined ? `<span>${this._batteryBar(d.battery)}</span>` : "";
      const seen = cfg.show_last_seen
        ? `<span class="optional"${d.stale ? ' style="color:var(--zmm-color-warning)"' : ""}>${esc(this._relTime(d.last_seen))}</span>`
        : "";
      extra = `${lqi}${bat}${seen}`;
    }

    const badges = [
      d.missing ? `<span class="badge" style="--c:var(--zmm-color-warning)">${esc(this._t("missing_badge"))}</span>` : "",
      this._isOffline(d) ? `<span class="badge" style="--c:var(--zmm-color-error)">${esc(this._t("offline"))}</span>` : "",
      d.stale && !d.disabled ? `<span class="badge" style="--c:var(--zmm-color-warning)">${esc(this._t("stale_badge"))}</span>` : "",
      d.interviewing ? `<span class="badge" style="--c:var(--zmm-color-warning)">${esc(this._t("interviewing"))}</span>` : "",
      d.disabled ? `<span class="badge">${esc(this._t("disabled"))}</span>` : "",
      d.ignore_offline && d.available === false ? `<span class="badge">${esc(this._t("ignored_badge"))}</span>` : "",
    ].join("");

    return `<div class="row clickable${d.missing ? " missing" : ""}" tabindex="0" role="button" data-act="open" data-ieee="${esc(d.ieee)}">
      <span class="row-icon${img ? " has-image" : ""}"${iconStyle}>${img}<ha-icon icon="${this._deviceIcon(d, tab)}"${img ? " hidden" : ""}></ha-icon>${dot}</span>
      <div class="row-main">
        <div class="row-primary"><span class="row-name">${esc(d.name)}</span>${badges}</div>
        <div class="row-secondary">${secondary}</div>
        ${cfg.show_comment && d.comment ? `<div class="row-secondary row-comment"><span>${esc(d.comment)}</span></div>` : ""}
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
      return `<div class="empty">${esc(this._allDevices().length ? this._t("no_results") : this._t("no_data"))}</div>`;
    }
    const mode = FILTER_TABS.includes(tab) ? this._groupMode() : "none";
    if (mode !== "none") return this._renderGrouped(tab, list, mode);
    const { shown, hidden } = this._limited(list);
    return `<div class="rows">${shown.map((d) => this._deviceRow(d, tab)).join("")}</div>${
      hidden
        ? `<div class="more"><button class="btn" data-act="more">${esc(this._t("show_more", { n: hidden }))}</button></div>`
        : ""
    }`;
  }

  // Gruppierte Liste: je Hersteller bzw. Geräteklasse ein Akkordeon (max_rows gilt hier nicht)
  _renderGrouped(tab, list, mode) {
    const buckets = new Map();
    for (const d of list) {
      const k = mode === "vendor" ? d.vendor || "" : mode === "area" ? d.area || "" : d.device_class || "other";
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(d);
    }
    const keys = [...buckets.keys()];
    if (mode === "class") {
      const rank = (c) => (DEVICE_CLASSES.includes(c) ? DEVICE_CLASSES.indexOf(c) : DEVICE_CLASSES.length);
      keys.sort((a, b) => rank(a) - rank(b));
    } else {
      keys.sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, this._lang)));
    }
    const openByDefault = keys.length <= 3 || this._search !== "";
    this._groupKeys = [];
    const html = keys
      .map((k) => {
        const items = buckets.get(k);
        const off = items.filter((d) => this._isOffline(d)).length;
        const meta = off ? `${items.length} · ${off} ${this._t("offline")}` : String(items.length);
        const label = mode === "vendor" ? k || this._t("group_unknown") : mode === "area" ? k || this._t("group_no_area") : this._t(`cls_${k}`);
        const icon = mode === "vendor" ? "mdi:factory" : mode === "area" ? "mdi:floor-plan" : CLASS_ICON[k] || CLASS_ICON.other;
        const key = `g:${tab}:${mode}:${k}`;
        this._groupKeys.push(key);
        return this._accordion(key, icon, label, `<div class="rows">${items.map((d) => this._deviceRow(d, tab)).join("")}</div>`, {
          meta,
          open: openByDefault,
        });
      })
      .join("");
    return `<div class="group-list">${html}</div>`;
  }

  // ----------------------------------------------------------------- Netzwerk und Links
  // Ziel des Knopfes "Netzwerk": 1. network_url der Karte, 2. Adresse der Integration (Option oder
  // Z2M-Konfiguration), 3. die Zigbee2MQTT-App in der Seitenleiste (Supervisor-Ingress-Panel).
  _networkTarget() {
    const own = safeLink(this._config.network_url);
    if (own) return own;
    const fromBackend = safeLink(this._data?.bridge?.network_url);
    if (fromBackend) return fromBackend;
    const panels = this._hass?.panels || {};
    for (const [path, panel] of Object.entries(panels)) {
      if (path === "zigbee2mqtt-manager" || !panel?.config?.ingress) continue;
      if (`${path} ${panel.title || ""}`.toLowerCase().includes("zigbee2mqtt")) return safeLink(`/${path}`);
    }
    return "";
  }

  _networkButton(cls = "btn") {
    if (this._config.show_network_link === false || !this._networkTarget()) return "";
    return `<button class="${cls}" data-act="open_network" title="${esc(this._t("network_open"))}"><ha-icon icon="mdi:graph-outline"></ha-icon>${esc(this._t("network"))}</button>`;
  }

  // Kategorie "Netzwerk": oben die Karte (Coordinator, Router, Endgeräte als Wolken), darunter je
  // Router ein Akkordeon mit seinen Verbindungen. Daten: topology aus der Integration (networkmap).
  _renderNetworkTab() {
    const t = (k, v) => this._t(k, v);
    const net = this._data?.network || {};
    const topo = net.topology;
    const ro = this._readOnly;
    const target = this._networkTarget();
    let status = "";
    if (net.loading) {
      status = `<span class="pill" style="--c:var(--zmm-color-warning)">${esc(t("net_loading", { t: this._relTime(net.loading_since) }))}</span>`;
    } else if (net.error) {
      status = `<span class="pill" style="--c:var(--zmm-color-error)">${esc(t(net.error === "timeout" ? "net_error_timeout" : "net_error_failed"))}</span>`;
    } else if (net.updated_at) {
      status = `<span class="hint">${esc(t("net_updated", { t: this._relTime(net.updated_at) }))}</span>`;
    }
    let refresh = "";
    if (!ro) {
      refresh = net.loading
        ? `<button class="btn" disabled><ha-icon icon="mdi:timer-sand"></ha-icon>${esc(t("net_refresh"))}</button>`
        : this._confirmButton("net_refresh", "network_refresh", "", t("net_refresh"), "btn primary");
    }
    const nativeBtn = target
      ? `<button class="btn" data-act="open_network" title="${esc(t("network_open"))}"><ha-icon icon="mdi:open-in-new"></ha-icon>${esc(t("net_native"))}</button>`
      : "";
    const toolbar = `<div class="toolbar">${refresh}${nativeBtn}<span class="spacer"></span>${status}</div>`;
    if (!topo || !topo.hubs?.length) {
      return `<div class="settings-view nm-view">${toolbar}<div class="hint">${esc(t("net_none"))}</div><div class="hint">${esc(t("net_refresh_hint"))}</div></div>`;
    }
    const summary = t("net_summary", { routers: topo.routers, clients: topo.clients, links: topo.links });
    return `<div class="settings-view nm-view">${toolbar}
      ${this._networkSvg(topo)}
      <div class="hint">${esc(summary)}</div>
      <div class="hint">${esc(t("net_intro"))}</div>
      ${!ro ? `<div class="hint">${esc(t("net_refresh_hint"))}</div>` : ""}
      ${this._networkLists(topo)}</div>`;
  }

  _networkDevice(ieee) {
    return this._allDevices().find((x) => String(x.ieee || "").toLowerCase() === String(ieee || "").toLowerCase()) || null;
  }

  // Zeichnung: eine Spalte je Ebene (Coordinator links), Unterbäume untereinander, Endgeräte als Wolke
  _networkSvg(topo) {
    const t = (k, v) => this._t(k, v);
    const hubs = topo.hubs;
    const byId = new Map(hubs.map((h) => [h.ieee, h]));
    const children = new Map(hubs.map((h) => [h.ieee, []]));
    const roots = [];
    for (const h of hubs) {
      if (h.parent && h.parent !== h.ieee && byId.has(h.parent)) children.get(h.parent).push(h);
      else roots.push(h);
    }
    const HUB_W = 196, HUB_H = 52, CL_W = 128, CL_H = 34, GAP = 14, COL = 276, SIDE = 16, LEAF = 16;
    const hasKids = (h) => children.get(h.ieee).length > 0;
    const cloudBelow = (h) => h.clients.length > 0 && hasKids(h);
    const blockH = (h) => HUB_H + (cloudBelow(h) ? 10 + CL_H : 0) + GAP;
    const sub = new Map();
    const seen = new Set();
    const measure = (h) => {
      seen.add(h.ieee);
      let kids = 0;
      for (const k of children.get(h.ieee)) kids += measure(k);
      const v = Math.max(blockH(h), kids);
      sub.set(h.ieee, v);
      return v;
    };
    let total = 0;
    for (const r of roots) total += measure(r);
    const pos = new Map();
    let maxDepth = 0;
    let leafCloud = false;
    const place = (h, top, depth) => {
      pos.set(h.ieee, { x: SIDE + HUB_W / 2 + depth * COL, top });
      maxDepth = Math.max(maxDepth, depth);
      if (h.clients.length && !hasKids(h)) leafCloud = true;
      let y = top;
      for (const k of children.get(h.ieee)) {
        place(k, y, depth + 1);
        y += sub.get(k.ieee);
      }
    };
    let y0 = 8;
    for (const r of roots) {
      place(r, y0, 0);
      y0 += sub.get(r.ieee);
    }
    const width = SIDE * 2 + HUB_W + maxDepth * COL + (leafCloud ? LEAF + CL_W : 0);
    const height = Math.max(total, 60) + 16;

    const lqiText = (v) => (v == null ? "" : String(v));
    const node = (cx, top, w, h, icon, lines, cls, attrs = "", label = "") => {
      const textX = w > 130 ? 38 : 28;
      const avail = w - textX - 6;
      const ys = lines.length > 1 && lines[1] ? [h / 2 - 3, h / 2 + 13] : [h / 2 + 5];
      const text = lines
        .filter((l) => l)
        .map((line, i) => `<text x="${textX}" y="${ys[i]}" class="${i === 0 ? "nm-t" : "nm-s"}">${esc(String(line).slice(0, Math.floor(avail / (i === 0 ? 7.2 : 5.9))))}</text>`)
        .join("");
      const ico = w > 130 ? 24 : 18;
      return `<g class="nm-node ${cls}${attrs ? " link" : ""}" transform="translate(${cx - w / 2} ${top})"${
        attrs ? ` role="button" tabindex="0" ${attrs} aria-label="${esc(label)}"` : ""
      }><title>${esc(label || lines[0] || "")}</title>
        <rect width="${w}" height="${h}" rx="12"/>
        <foreignObject x="${w > 130 ? 8 : 6}" y="${(h - ico) / 2}" width="${ico}" height="${ico}"><ha-icon icon="${icon}" xmlns="http://www.w3.org/1999/xhtml"></ha-icon></foreignObject>
        ${text}</g>`;
    };

    let edges = "";
    let nodes = "";
    for (const h of hubs) {
      const p = pos.get(h.ieee);
      if (!p) continue;
      const cy = p.top + HUB_H / 2;
      const dev = this._networkDevice(h.ieee);
      const offline = dev ? this._isOffline(dev) : false;
      for (const k of children.get(h.ieee)) {
        const kp = pos.get(k.ieee);
        if (!kp) continue;
        const ky = kp.top + HUB_H / 2;
        const x1 = p.x + HUB_W / 2;
        const x2 = kp.x - HUB_W / 2;
        const mid = (x1 + x2) / 2;
        edges += `<path class="nm-edge${k.orphan ? " nm-orphan" : ""}" d="M${x1} ${cy} H ${mid} V ${ky} H ${x2}"/>`;
        if (k.lqi != null) edges += `<text class="nm-lbl" x="${x2 - 4}" y="${ky - 5}" text-anchor="end">${esc(lqiText(k.lqi))}</text>`;
      }
      if (h.clients.length) {
        const label = t("net_show_tip", { name: h.name });
        const title = t("net_cloud", { n: h.clients.length });
        if (cloudBelow(h)) {
          const cTop = p.top + HUB_H + 10;
          edges += `<path class="nm-edge nm-dash" d="M${p.x} ${p.top + HUB_H} V ${cTop}"/>`;
          nodes += node(p.x, cTop, CL_W, CL_H, "mdi:devices", [title], "cl", `data-act="net_open" data-net="${esc(h.ieee)}"`, label);
        } else {
          const cx = p.x + HUB_W / 2 + LEAF + CL_W / 2;
          edges += `<path class="nm-edge nm-dash" d="M${p.x + HUB_W / 2} ${cy} H ${cx - CL_W / 2}"/>`;
          nodes += node(cx, cy - CL_H / 2, CL_W, CL_H, "mdi:devices", [title], "cl", `data-act="net_open" data-net="${esc(h.ieee)}"`, label);
        }
      }
      const isCoord = h.type === "Coordinator";
      const typeLabel = isCoord ? t("net_coordinator") : t("net_router");
      const attrs = dev && !dev.missing ? `data-act="open" data-ieee="${esc(h.ieee)}"` : `data-act="net_open" data-net="${esc(h.ieee)}"`;
      nodes += node(
        p.x,
        p.top,
        HUB_W,
        HUB_H,
        isCoord ? "mdi:access-point-network" : offline ? "mdi:router-network-wireless" : "mdi:router-wireless",
        [h.name, `${typeLabel} · ${h.clients.length}`],
        `${isCoord ? "coord" : "rt"}${offline ? " off" : ""}`,
        attrs,
        t("net_open_tip", { name: h.name })
      );
    }
    return `<div class="nm-wrap"><svg class="nm-svg" style="min-width:${width}px;max-width:${Math.round(width * 1.4)}px" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(t("net_map_label"))}">${edges}${nodes}</svg></div>`;
  }

  // Tabellen unter der Zeichnung: je Coordinator/Router ein Akkordeon mit seinen Verbindungen
  _networkLists(topo) {
    const t = (k, v) => this._t(k, v);
    const lqi = (v) => (v == null ? "" : `<span class="pill" style="--c:${this._lqiColor(v)}" title="${esc(t("net_lqi"))}">${esc(v)}</span>`);
    const row = (ieee, name, right) => {
      const dev = this._networkDevice(ieee);
      const open = dev && !dev.missing;
      const dot = dev ? this._statusDot(dev) : "";
      return `<div class="nm-row${open ? "" : " plain"}"${open ? ` role="button" tabindex="0" data-act="open" data-ieee="${esc(ieee)}"` : ""}>
        <span class="row-icon nm-dot">${dot}</span><span class="nm-name">${esc(name)}</span>${right}${open ? '<ha-icon icon="mdi:chevron-right"></ha-icon>' : ""}</div>`;
    };
    const relLabel = (r) => (r ? t(`net_rel_${r}`) : "");
    const parts = topo.hubs.map((h, idx) => {
      const isCoord = h.type === "Coordinator";
      let body = "";
      if (h.orphan) body += `<div class="hint warn">${esc(t("net_orphan"))}</div>`;
      if (h.neighbors.length) {
        body += `<div class="nm-sub">${esc(t("net_links_routers"))}</div>${h.neighbors
          .map((n) => row(n.ieee, n.name, `${n.rel ? `<span class="hint nm-rel">${esc(relLabel(n.rel))}</span>` : ""}${lqi(n.lqi)}`))
          .join("")}`;
      }
      if (h.clients.length) {
        body += `<div class="nm-sub">${esc(t("net_end_devices"))} (${h.clients.length})</div>${h.clients
          .map((c) => row(c.ieee, c.name, lqi(c.lqi)))
          .join("")}`;
      }
      if (!body) body = `<div class="hint">${esc(t("net_no_links"))}</div>`;
      const meta = `${h.clients.length ? t("net_cloud", { n: h.clients.length }) : ""}`;
      return this._accordion(`net:${h.ieee}`, isCoord ? "mdi:access-point-network" : "mdi:router-wireless", h.name, body, { meta, open: idx === 0 });
    });
    if (topo.unassigned?.length) {
      const body = `<div class="hint">${esc(t("net_unassigned_hint"))}</div>${topo.unassigned.map((c) => row(c.ieee, c.name, "")).join("")}`;
      parts.push(this._accordion("net:_unassigned", "mdi:help-network-outline", t("net_unassigned"), body, { meta: String(topo.unassigned.length) }));
    }
    return parts.join("");
  }

  _navigate(path) {
    const target = safeLink(path);
    if (!target) return;
    this._closePopup();
    if (/^https?:\/\//i.test(target)) {
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }
    history.pushState(null, "", target);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
  }

  _openEntity(entityId) {
    if (!/^[a-z0-9_]+\.[a-z0-9_]+$/i.test(String(entityId || ""))) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId } }));
  }

  _renderDeviceTab(tab) {
    let toolbar = "";
    if (tab === "devices") {
      const network = this._networkButton();
      let pairing = "";
      if (!this._readOnly && this._config.show_pairing) {
        const pj = this._data.bridge.permit_join;
        pairing = `<button class="btn" data-act="pair" data-value="${pj ? 0 : 1}"><ha-icon icon="mdi:link-plus"></ha-icon>${esc(this._t(pj ? "pairing_stop" : "pairing_start"))}</button>`;
      }
      if (network || pairing) toolbar = `<div class="toolbar">${network}<span class="spacer"></span>${pairing}</div>`;
      if (this._filter === "missing" && (this._data.missing || []).length) {
        toolbar += `<div class="hint">${esc(this._t("missing_hint"))}</div>`;
        if (!this._readOnly) {
          toolbar += `<div class="toolbar">${this._confirmButton("forget_all", "forget_missing_all", "", this._t("forget_all"), "btn danger small")}</div>`;
        }
      }
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
    return `${tab === "devices" ? this._renderStats() : ""}${toolbar}${this._renderFilterBar(tab)}${this._renderFilterPanel(tab)}${this._renderActiveFilters(tab)}${this._renderRowList(tab, this._devices(tab))}`;
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

  // Notification Center: Hauptschalter + Meldungsarten (nach Dringlichkeit sortiert, Daten vom Server)
  _renderNotificationCenter() {
    const nc = this._data?.nc;
    if (!nc || !Array.isArray(nc.types)) return "";
    const t = (k, v) => this._t(k, v);
    const ro = this._readOnly;
    const lang = ["de", "en", "nl", "fr", "es"].includes(this._lang) ? this._lang : "en";
    const sevColor = { critical: "var(--zmm-color-error)", warning: "var(--zmm-color-warning)", info: "var(--zmm-color-tab-active)", ok: "var(--zmm-color-success)" };
    const sw = (on, attrs, label) =>
      `<button class="sw ${on ? "on" : ""}" role="switch" aria-checked="${on}" aria-label="${esc(label)}" ${attrs}${ro ? " disabled" : ""}><span class="knob"></span></button>`;
    const status = nc.available
      ? `<span class="pill" style="--c:var(--zmm-color-success)">${esc(t("nc_detected"))}</span>`
      : `<span class="pill" style="--c:var(--zmm-color-warning)">${esc(t("nc_not_installed"))}</span>`;
    const master = `<div class="settings-line"><span>${esc(t("nc_master"))}</span>${sw(nc.enabled, 'data-act="nc_master"', t("nc_master"))}</div>`;
    const rows = nc.types
      .map((ty) => {
        const label = ty.labels?.[lang] || ty.labels?.en || ty.type;
        const sev = t(`nc_sev_${ty.severity}`);
        return `<div class="settings-line nc-type"><span class="nc-label"><ha-icon icon="${esc(ty.icon || "mdi:bell-outline")}"></ha-icon>${esc(label)}
          <span class="pill" style="--c:${sevColor[ty.severity] || "var(--zmm-color-tab-active)"}">${esc(sev)}</span></span>
          ${sw(ty.enabled, `data-act="nc_type" data-nctype="${esc(ty.type)}"`, label)}</div>`;
      })
      .join("");
    const body = `${nc.available ? "" : `<div class="hint warn">${esc(t("nc_missing_hint"))}</div>`}${master}
      <div class="hint">${esc(t("nc_hint"))}</div>
      <div class="nc-types${nc.enabled ? "" : " dim"}"><strong>${esc(t("nc_types"))}</strong>${rows}</div>`;
    return this._accordion("bridge:nc", "mdi:bell-ring-outline", t("nc_title"), body, { meta: nc.available ? "" : "–" });
  }

  _renderBridge() {
    const b = this._data.bridge;
    const z2m = this._data.z2m || b;
    const s = this._data.stats;
    const ro = this._readOnly;
    const networkBtn = this._networkButton();
    const status = b.online === true ? `<span class="pill" style="--c:var(--zmm-color-success)">${esc(this._t("online"))}</span>` : b.online === false ? `<span class="pill" style="--c:var(--zmm-color-error)">${esc(this._t("offline"))}</span>` : esc(this._t("unknown"));
    const coordinator = [b.coordinator_type, b.coordinator_revision].filter(Boolean).join(" · ");
    const z2mUpdate = z2m.update_available === true;
    const z2mCurrent = !z2mUpdate && Boolean(z2m.latest_version) && !z2m.check_failed;
    const z2mUrl = /^https:\/\/github\.com\/Koenkk\/zigbee2mqtt(?:\/|$)/.test(z2m.release_url || "")
      ? z2m.release_url
      : "https://github.com/Koenkk/zigbee2mqtt/releases";
    const z2mVersion = `${esc(b.version)}${z2mUpdate
      ? ` <a class="pill" style="--c:var(--zmm-color-warning)" href="${esc(z2mUrl)}" target="_blank" rel="noopener noreferrer">${esc(this._t("z2m_update_available", { v: z2m.latest_version }))}</a>`
      : z2mCurrent
        ? ` <span class="pill" style="--c:var(--zmm-color-success)">${esc(this._t("app_up_to_date"))}</span>`
        : ""}`;
    const z2mNotice = z2mUpdate
      ? `<div class="hint">${esc(this._t("z2m_update_hint"))}</div>`
      : z2m.check_failed
        ? `<div class="hint">${esc(this._t("z2m_check_failed"))}</div>`
        : "";
    const z2mCheck = ro ? "" : `<div class="toolbar"><button class="btn" data-act="z2m_update_check"><ha-icon icon="mdi:refresh"></ha-icon>${esc(this._t("z2m_check_now"))}</button></div>`;
    const info = [
      this._line(this._t("f_status"), status),
      this._line(this._t("f_version"), z2mVersion),
      z2mNotice,
      z2mCheck,
      this._line(this._t("f_coordinator"), esc(coordinator)),
      this._line(this._t("f_base_topic"), esc(b.base_topic)),
      this._line(this._t("chip_devices"), esc(s.total)),
      this._line(this._t("tab_groups"), esc(s.groups)),
      s.missing ? this._line(this._t("chip_missing"), esc(s.missing)) : "",
    ].join("") + (networkBtn ? `<div class="toolbar">${networkBtn}</div>` : "");

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
      ${this._renderNotificationCenter()}
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
        device_missing: "mdi:help-network-outline",
        device_back: "mdi:lan-connect",
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
    } else if (t.dataset.change === "group_by") {
      this._groupBy = t.value;
      this._expanded = false;
      this._refresh();
    } else if (t.dataset.change === "flt") {
      if (t.value) this._flt[t.dataset.flt] = t.value;
      else delete this._flt[t.dataset.flt];
      this._expanded = false;
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
      case "flt_reset":
        this._flt = {};
        this._expanded = false;
        return this._refresh();
      case "flt_clear":
        delete this._flt[d.flt];
        this._expanded = false;
        return this._refresh();
      case "grp_all":
        for (const k of this._groupKeys || []) this._open[k] = d.value === "1";
        return this._refresh();
      case "ex_toggle": {
        let next;
        try {
          next = JSON.parse(d.next);
        } catch (_e) {
          return;
        }
        return void (await this._toggleExpose(d.ieee || this._selected, d.prop, next));
      }
      case "open_entity":
        return this._openEntity(d.entity);
      case "open_ha_device":
        return this._navigate(`/config/devices/device/${encodeURIComponent(d.device || "")}`);
      case "open_network":
        return this._navigate(this._networkTarget());
      case "network_refresh":
        return void (await this._call("network_refresh"));
      case "net_open": {
        // Wolke oder Router in der Zeichnung: das zugehörige Akkordeon aufklappen und anzeigen
        const key = `net:${d.net}`;
        this._open[key] = true;
        this._refresh();
        requestAnimationFrame(() => {
          const el = [...this.shadowRoot.querySelectorAll("details[data-k]")].find((x) => x.dataset.k === key);
          el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
        return;
      }
      case "ignore_offline": {
        const dev = this._networkDevice(d.ieee || this._selected);
        if (dev) await this._call("set_ignore_offline", { ieee: dev.ieee, enabled: !dev.ignore_offline });
        return;
      }
      case "forget_missing": {
        if (await this._call("forget_missing", { ieee: d.ieee || this._selected })) this._closePopup();
        return;
      }
      case "forget_missing_all":
        await this._call("forget_missing_all");
        this._filter = "all";
        return this._refresh();
      case "copy":
        return void (await this._copyText(d.text));
      case "copy_all":
        return void (await this._copyEntities(this._selected));
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
      case "z2m_update_check":
        this._toast(this._t("app_checking"));
        return void (await this._call("z2m_update_check"));
      case "restart":
        return void (await this._call("restart"));
      case "nc_master": {
        return void (await this._call("nc_set_master", { enabled: !this._data?.nc?.enabled }));
      }
      case "nc_type": {
        const cur = (this._data?.nc?.types || []).find((x) => x.type === d.nctype);
        return void (await this._call("nc_set_type", { nc_type: d.nctype, enabled: !(cur && cur.enabled) }));
      }
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
      case "comment_save": {
        const ieee = this._selected;
        if (!ieee) return;
        const value = String(this._draft(`comment:${ieee}`, "")).trim();
        this._commentSavedAt = Date.now();
        if (await this._call("set_comment", { ieee, value })) delete this._drafts[`comment:${ieee}`];
        else this._commentSavedAt = 0;
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

  // Schalter (binäre Funktion mit Schreibzugriff) umlegen. Der neue Wert wird sofort angezeigt;
  // nach kurzer Zeit holt die Karte den echten Wert vom Gerät nach.
  async _toggleExpose(ieee, prop, next) {
    if (!ieee || !prop) return;
    const key = `${ieee}:${prop}`;
    if (this._pending.has(key)) return;
    this._pending.add(key);
    this._renderPopup(true);
    const ok = await this._call("set_expose", { ieee, key: prop, value: next });
    if (ok) {
      const row = this._details[ieee]?.exposes?.find((r) => r.property === prop);
      if (row) row.value = next;
    }
    this._renderPopup(true);
    setTimeout(async () => {
      this._pending.delete(key);
      if (this._selected === ieee) await this._loadDetails(ieee, true, true);
      this._renderPopup(true);
    }, 1500);
  }

  _legacyCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
      this.shadowRoot.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (_e) {
      return false;
    }
  }

  // In die Zwischenablage kopieren. Ohne HTTPS verweigert der Browser den Zugriff: dann
  // erscheint der Text markiert in einem Feld zum manuellen Kopieren (Strg+C).
  async _copyText(text, doneMessage) {
    const value = String(text ?? "");
    if (!value) return false;
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch (_e) {
      ok = this._legacyCopy(value);
    }
    if (!ok) {
      this._manualCopy = value;
      this._manualFocus = true;
      this._open["p:entities"] = true;
      this._toast(this._t("copy_failed"), true);
      this._renderPopup(true);
      return false;
    }
    this._manualCopy = null;
    this._toast(doneMessage || this._t("copied", { v: value }));
    return true;
  }

  async _copyEntities(ieee) {
    const det = this._details[ieee];
    const ids = (det?.entities || []).map((e) => e.entity_id).filter(Boolean);
    if (!ids.length) return this._toast(this._t(det?.loading ? "loading" : "no_entities"), true);
    return this._copyText(ids.join("\n"), ids.length > 1 ? this._t("copied_n", { n: ids.length }) : undefined);
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
    const dev = this._allDevices().find((x) => x.ieee === ieee);
    if (!dev?.missing) this._loadDetails(ieee, Boolean(this._details[ieee]), true);
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
      [t("f_comment"), d.comment],
      [t("f_area"), d.area],
      [t("f_ha_device"), d.ha_device],
      [t("f_type"), d.type ? (I18N[this._lang]?.[`type_${d.type}`] ?? d.type) : null],
      [t("f_ieee"), d.ieee],
      [t("f_nwk"), d.network_address],
      [t("f_power"), d.power_source],
      [t("f_firmware"), d.sw_build_id],
      [t("f_lqi"), d.linkquality],
      [t("f_battery"), d.battery !== null && d.battery !== undefined ? `${d.battery} %` : null],
      [t("f_voltage"), d.voltage !== null && d.voltage !== undefined ? `${d.voltage} mV` : null],
      [t("f_available"), d.available === null || d.available === undefined ? null : d.available ? (d.available_source === "activity" ? t("avail_activity") : t("yes")) : t("no")],
      [t("f_last_seen"), this._relTime(d.last_seen)],
      [t("f_missing_since"), d.missing ? this._relTime(d.missing_since) : null],
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

  // Schalter bzw. An/Aus-Knöpfe (wenn der Wert noch unbekannt ist) für eine schreibbare binäre Funktion
  _exposeSwitch(ieee, r) {
    const t = (k) => this._t(k);
    const on = r.value_on === undefined || r.value_on === null ? true : r.value_on;
    const off = r.value_off === undefined || r.value_off === null ? false : r.value_off;
    const busy = this._pending.has(`${ieee}:${r.property}`);
    const attrs = (next) =>
      `data-act="ex_toggle" data-ieee="${esc(ieee)}" data-prop="${esc(r.property)}" data-next="${esc(JSON.stringify(next))}"${busy ? " disabled" : ""}`;
    if (!("value" in r) || r.value === null || r.value === undefined) {
      return `<span class="ex-set"><button class="btn small" ${attrs(on)}>${esc(t("ex_set_on"))}</button><button class="btn small" ${attrs(off)}>${esc(t("ex_set_off"))}</button></span>`;
    }
    const isOn =
      r.value === on || (typeof r.value === "string" && typeof on === "string" && r.value.toUpperCase() === on.toUpperCase());
    return `<span class="ex-sw"><button class="sw ${isOn ? "on" : ""}" role="switch" aria-checked="${isOn}" aria-label="${esc(r.label)}" ${attrs(isOn ? off : on)}><span class="knob"></span></button><span class="sw-label">${esc(isOn ? t("ex_on") : t("ex_off"))}</span></span>`;
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
    const ro = this._readOnly;
    const hasSwitch = !ro && rows.some((r) => r.switchable);

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
          }</span><span class="ex-value">${r.switchable && !ro ? this._exposeSwitch(ieee, r) : this._exposeValue(r)}</span></div>
          <div class="ex-meta">${meta.join("")}</div>${r.description ? `<div class="ex-desc">${esc(r.description)}</div>` : ""}
        </div>`;
    }
    const searchField =
      rows.length > 8
        ? `<div class="field"><input type="search" data-exfilter data-draft="exf:${esc(ieee)}" data-fk="exf" placeholder="${esc(t("exposes_filter"))}" value="${esc(this._draft(`exf:${ieee}`, ""))}" /></div>`
        : "";
    return `${searchField}<div class="ex-list">${html}<div class="hint ex-none" hidden>${esc(t("exposes_none_match"))}</div></div>
      <div class="hint">${esc(t(hasSwitch ? "exposes_hint_switch" : "exposes_hint"))}</div>`;
  }

  // Entitäten des Geräts in Home Assistant (zum Kopieren für Automationen und Skripte)
  _entitiesBody(det) {
    const t = (k) => this._t(k);
    if (!det || det.loading) return `<div class="hint">${esc(t("loading"))}</div>`;
    if (det.error) return `<div class="hint err">${esc(det.error)}</div>`;
    const ents = det.entities || [];
    const manual = this._manualCopy
      ? `<div class="field"><label>${esc(t("copy_manual"))}</label><textarea class="manual-copy" readonly rows="${Math.min(
          6,
          String(this._manualCopy).split("\n").length
        )}">${esc(this._manualCopy)}</textarea></div>`
      : "";
    if (!ents.length) return `${manual}<div class="hint">${esc(t("no_entities"))}</div>`;
    const lines = ents
      .map(
        (en) => `<div class="settings-line"><span class="ent"><a class="ent-link" href="#" data-act="open_entity" data-entity="${esc(en.entity_id)}" title="${esc(t("open_entity"))}"><code>${esc(en.entity_id)}</code><ha-icon icon="mdi:open-in-new"></ha-icon></a>${
          en.name ? `<span class="muted">${esc(en.name)}</span>` : ""
        }</span><button class="btn icon" data-act="copy" data-text="${esc(en.entity_id)}" title="${esc(t("copy"))}" aria-label="${esc(t("copy"))}"><ha-icon icon="mdi:content-copy"></ha-icon></button></div>`
      )
      .join("");
    return `${manual}<div class="ent-list">${lines}</div>
      <div class="toolbar"><button class="btn small" data-act="copy_all"><ha-icon icon="mdi:content-copy"></ha-icon>${esc(t("copy_all"))}</button>${
        this._haDeviceId
          ? `<button class="btn small" data-act="open_ha_device" data-device="${esc(this._haDeviceId)}"><ha-icon icon="mdi:open-in-new"></ha-icon>${esc(t("open_device"))}</button>`
          : ""
      }</div>
      <div class="hint">${esc(t("entities_hint"))}</div>`;
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
    const d = this._allDevices().find((x) => x.ieee === this._selected);
    if (!d) {
      this._closePopup();
      return;
    }
    this._haDeviceId = d.ha_device_id || "";
    const det = d.missing ? undefined : this._details[d.ieee];
    const sig = JSON.stringify([d, det, this._confirming, this._readOnly, this._data.groups, [...this._pending], this._manualCopy]);
    if (!force && sig === this._popupSig && !backdrop.hidden) return;
    this._popupSig = sig;

    const focus = this._captureFocus();
    const scroll = popup.scrollTop;
    const exScroll = popup.querySelector(".ex-list")?.scrollTop ?? 0;
    const ro = this._readOnly;
    const t = (k, v) => this._t(k, v);
    const sections = [];

    sections.push(this._accordion("p:info", "mdi:information-outline", t("sec_info"), this._infoLines(d), { open: true }));

    if (d.missing) {
      const forget = ro
        ? ""
        : `<div class="toolbar">${this._confirmButton(`forget:${d.ieee}`, "forget_missing", `data-ieee="${esc(d.ieee)}"`, t("forget"), "btn danger small")}</div>`;
      const haLink = d.ha_device_id
        ? `<div class="toolbar"><button class="btn small" data-act="open_ha_device" data-device="${esc(d.ha_device_id)}"><ha-icon icon="mdi:open-in-new"></ha-icon>${esc(t("open_device"))}</button></div>`
        : "";
      sections.push(
        this._accordion("p:missing", "mdi:help-network-outline", t("missing_badge"), `<div class="hint">${esc(t("missing_popup_hint"))}</div>${haLink}${forget}`, { open: true })
      );
    }

    if (!d.missing && d.has_exposes) {
      sections.push(
        this._accordion("p:exposes", "mdi:format-list-bulleted", t("sec_exposes"), this._exposesBody(det, d.ieee), {
          meta: det?.exposes ? String(det.exposes.length) : "",
        })
      );
    }

    sections.push(
      this._accordion("p:entities", "mdi:code-braces", t("sec_entities"), this._entitiesBody(det), {
        meta: det?.entities?.length ? String(det.entities.length) : "",
      })
    );

    if (!d.missing && !d.disabled) {
      const sw = `<button class="sw ${d.ignore_offline ? "on" : ""}" role="switch" aria-checked="${!!d.ignore_offline}" aria-label="${esc(t("ignore_offline"))}" data-act="ignore_offline" data-ieee="${esc(d.ieee)}"${ro ? " disabled" : ""}><span class="knob"></span></button>`;
      sections.push(
        this._accordion(
          "p:monitor",
          "mdi:eye-off-outline",
          t("sec_monitor"),
          `<div class="settings-line"><span>${esc(t("ignore_offline"))}</span>${sw}</div><div class="hint">${esc(t("ignore_offline_hint"))}</div>`,
          { meta: d.ignore_offline ? "✓" : "" }
        )
      );
    }

    if (!ro) {
      const commentDraft = String(this._draft(`comment:${d.ieee}`, d.comment || ""));
      sections.push(
        this._accordion(
          "p:comment",
          "mdi:comment-text-outline",
          t("sec_comment"),
          `<div class="field"><label>${esc(t("f_comment"))}</label>
             <textarea class="comment-edit" rows="3" maxlength="500" data-draft="comment:${esc(d.ieee)}" data-fk="comment" placeholder="${esc(t("comment_ph"))}">${esc(commentDraft)}</textarea>
             <div class="help">${esc(t("comment_hint"))}</div></div>
           <div class="toolbar"><button class="btn primary small" data-act="comment_save">${esc(t("save"))}</button></div>`
        )
      );
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

    if (d.missing) sections.splice(2);
    const headImg = this._deviceImage(d);
    const popupHtml = `<div class="popup-head">${headImg}<ha-icon icon="${DEVICE_ICON[d.type] || "mdi:zigbee"}"${headImg ? " hidden" : ""}></ha-icon>
        <span class="popup-title">${esc(d.name)}</span>${
          d.ha_device_id
            ? `<button class="popup-close" data-act="open_ha_device" data-device="${esc(d.ha_device_id)}" title="${esc(t("open_device"))}" aria-label="${esc(t("open_device"))}"><ha-icon icon="mdi:open-in-new"></ha-icon></button>`
            : ""
        }${
          det?.entities?.length
            ? `<button class="popup-close" data-act="copy_all" title="${esc(t("copy_entities"))}" aria-label="${esc(t("copy_entities"))}"><ha-icon icon="mdi:content-copy"></ha-icon></button>`
            : ""
        }
        <button class="popup-close" data-act="close" aria-label="${esc(t("close"))}"><ha-icon icon="mdi:close"></ha-icon></button></div>
      <div class="popup-body">${sections.join("")}</div>`;
    backdrop.hidden = false;
    // Ein frisch gezeichnetes <details open> löst selbst ein "toggle" aus; der zentrale Handler
    // in _build() wertet nur echte Änderungen aus (sonst Endlosschleife beim Neuzeichnen).
    morphInto(popup, popupHtml, this.shadowRoot.activeElement);
    popup.scrollTop = scroll;
    if (this._manualFocus) {
      this._manualFocus = false;
      const manual = popup.querySelector(".manual-copy");
      if (manual) {
        manual.focus();
        manual.select();
      }
    }
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
  show_network: "Kategorie 'Netzwerk' anzeigen",
  default_tab: "Beim Öffnen anzeigen",
  max_rows: "Max. Zeilen je Liste (0 = alle)",
  zoom: "Zoomfaktor der Karte (z. B. für Wandtablets)",
  show_stats: "Statistik-Chips (Geräte/Offline/Batterie/Updates) anzeigen",
  show_images: "Gerätebilder von zigbee2mqtt.io anzeigen",
  show_search: "Suchfeld anzeigen",
  show_filter_bar: "Sortierung auf der Karte anzeigen",
  default_sort: "Standard-Sortierung der Geräteliste",
  show_group_by: "Auswahl 'Gruppieren' anzeigen (Hersteller / Geräteklasse)",
  default_group_by: "Standard-Gruppierung der Listen",
  show_filters: "Filter-Bereich anzeigen (Status, Batterie, Signal, …)",
  show_model: "Modell anzeigen",
  show_vendor: "Hersteller anzeigen",
  show_ieee: "IEEE-Adresse anzeigen",
  show_lqi: "Signalqualität anzeigen",
  show_area: "Raum (aus Home Assistant) anzeigen",
  show_comment: "Kommentar aus Zigbee2MQTT anzeigen",
  show_battery_value: "Batteriestand anzeigen",
  show_last_seen: "'Zuletzt gesehen' anzeigen",
  read_only: "Nur lesen (alle Bedienelemente zum Ändern ausblenden)",
  show_pairing: "Pairing-Schaltfläche in der Geräteliste anzeigen",
  show_network_link: "Knopf 'Netzwerk' (Zigbee2MQTT-Netzwerkkarte) anzeigen",
  network_url: "Adresse der Netzwerkkarte (optional)",
};

const EDITOR_HELPERS = {
  entry_id: "Welche Zigbee2MQTT-Instanz diese Karte anzeigt. „Automatisch“: Gibt es mehrere Instanzen, erscheint oben in der Karte ein Umschalter. Für eine Karte je Stick hier die Instanz festlegen.",
  title: "Leer lassen, um keine Überschrift anzuzeigen.",
  show_images: "Die Bilder werden direkt im Browser von www.zigbee2mqtt.io geladen. Ausschalten, wenn keine externen Anfragen gewünscht sind – es erscheinen dann die Symbole.",
  max_rows: "Bei gesetztem Wert erscheint unter der Liste 'Weitere anzeigen'. Bei aktiver Gruppierung gilt die Begrenzung nicht.",
  default_group_by: "Gilt für Geräte, Batterie und Updates. In der Karte lässt sich die Gruppierung jederzeit umstellen.",
  network_url: "Leer = Adresse aus den Integrations-Optionen bzw. die Zigbee2MQTT-App in der Seitenleiste. Erlaubt sind https://… oder ein Pfad in Home Assistant wie /a0d7b954_zigbee2mqtt.",
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
      bool("show_network"),
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
      { name: "max_rows", selector: { number: { min: 0, max: 50, step: 1, mode: "box" } } },
      { name: "zoom", selector: { number: { min: 0.5, max: 3, step: 0.1, mode: "box" } } },
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
      bool("show_group_by"),
      {
        name: "default_group_by",
        selector: {
          select: {
            mode: "dropdown",
            options: GROUP_BY_OPTIONS.map((o) => ({ value: o.value, label: I18N.de[o.label] })),
          },
        },
      },
      bool("show_filters"),
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
          bool("show_area"),
          bool("show_comment"),
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
  {
    name: "",
    type: "expandable",
    title: "Netzwerk",
    icon: "mdi:graph-outline",
    flatten: true,
    expanded: false,
    schema: [bool("show_network_link"), { name: "network_url", selector: { text: {} } }],
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
