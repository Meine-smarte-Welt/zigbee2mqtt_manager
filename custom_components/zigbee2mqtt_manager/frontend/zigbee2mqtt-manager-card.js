// SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 14dd8ee99e5eafc4f2608e8f909c202960ac19c9d11bb197b13f59931caf3b04
/* Zigbee2MQTT Manager Card – v0.0.1
 * Wird von der Integration automatisch geladen. Kartentyp: custom:zigbee2mqtt-manager-card
 */
const CARD_VERSION = "0.0.1";

const I18N = {
  de: {
    connecting: "Verbinde …", bridge_online: "Bridge online", bridge_offline: "Bridge offline", bridge_unknown: "Bridge-Status unbekannt",
    pairing_start: "Pairing starten", pairing_stop: "Pairing beenden", check_all: "Alle auf Updates prüfen", checking: "Prüfung gestartet …",
    tab_devices: "Geräte", tab_battery: "Batterie", tab_ota: "OTA-Updates",
    chip_devices: "Geräte", chip_offline: "Offline", chip_low_battery: "Batterie niedrig", chip_updates: "Updates",
    search: "Name, Modell oder IEEE suchen", no_data: "Noch keine Daten von Zigbee2MQTT. Läuft die Bridge?", no_results: "Keine Treffer.",
    col_name: "Name", col_model: "Modell", col_type: "Typ", col_linkquality: "Signal", col_battery: "Batterie",
    col_last_seen: "Zuletzt gesehen", col_voltage: "Spannung", col_installed: "Installiert", col_latest: "Verfügbar", col_ota: "Status",
    type_Router: "Router", type_EndDevice: "Endgerät",
    ota_available: "Update verfügbar", ota_updating: "Wird aktualisiert", ota_scheduled: "Geplant", ota_idle: "Aktuell", ota_unknown: "Nicht geprüft",
    install: "Installieren", details: "Details", close: "Schließen", never: "noch nie",
    rename: "Umbenennen", save: "Speichern", remove: "Gerät entfernen",
    check: "Nach Update suchen", update_now: "Update installieren", ota_unsupported: "Dieses Gerät unterstützt keine OTA-Updates.",
    update_confirm: "Firmware-Update installieren? Das Gerät sollte dabei Strom haben und in Reichweite bleiben.",
    remove_confirm: "Gerät wirklich aus dem Zigbee-Netz entfernen?",
    update_found: "Update verfügbar", no_update: "Kein Update verfügbar", renamed: "Umbenannt", update_done: "Update abgeschlossen",
    f_vendor: "Hersteller", f_model: "Modell", f_description: "Beschreibung", f_ieee: "IEEE-Adresse", f_nwk: "Netzwerkadresse",
    f_power: "Stromversorgung", f_firmware: "Firmware-Build", f_lqi: "Signalqualität", f_battery: "Batterie", f_voltage: "Spannung",
    f_last_seen: "Zuletzt gesehen", f_available: "Erreichbar", yes: "ja", no: "nein",
  },
  en: {
    connecting: "Connecting …", bridge_online: "Bridge online", bridge_offline: "Bridge offline", bridge_unknown: "Bridge status unknown",
    pairing_start: "Start pairing", pairing_stop: "Stop pairing", check_all: "Check all for updates", checking: "Check started …",
    tab_devices: "Devices", tab_battery: "Battery", tab_ota: "OTA updates",
    chip_devices: "Devices", chip_offline: "Offline", chip_low_battery: "Low battery", chip_updates: "Updates",
    search: "Search name, model or IEEE", no_data: "No data from Zigbee2MQTT yet. Is the bridge running?", no_results: "No matches.",
    col_name: "Name", col_model: "Model", col_type: "Type", col_linkquality: "Signal", col_battery: "Battery",
    col_last_seen: "Last seen", col_voltage: "Voltage", col_installed: "Installed", col_latest: "Available", col_ota: "Status",
    type_Router: "Router", type_EndDevice: "End device",
    ota_available: "Update available", ota_updating: "Updating", ota_scheduled: "Scheduled", ota_idle: "Up to date", ota_unknown: "Not checked",
    install: "Install", details: "Details", close: "Close", never: "never",
    rename: "Rename", save: "Save", remove: "Remove device",
    check: "Check for update", update_now: "Install update", ota_unsupported: "This device does not support OTA updates.",
    update_confirm: "Install firmware update? The device should stay powered and within range.",
    remove_confirm: "Really remove this device from the Zigbee network?",
    update_found: "Update available", no_update: "No update available", renamed: "Renamed", update_done: "Update finished",
    f_vendor: "Vendor", f_model: "Model", f_description: "Description", f_ieee: "IEEE address", f_nwk: "Network address",
    f_power: "Power source", f_firmware: "Firmware build", f_lqi: "Link quality", f_battery: "Battery", f_voltage: "Voltage",
    f_last_seen: "Last seen", f_available: "Reachable", yes: "yes", no: "no",
  },
  "sr-Latn": {
    connecting: "Povezivanje …",
    bridge_online: "Most je na mreži",
    bridge_offline: "Most je van mreže",
    bridge_unknown: "Status mosta je nepoznat",
    pairing_start: "Pokreni uparivanje",
    pairing_stop: "Zaustavi uparivanje",
    check_all: "Proveri ažuriranja za sve",
    checking: "Provera je pokrenuta …",
    tab_devices: "Uređaji",
    tab_battery: "Baterija",
    tab_ota: "OTA ažuriranja",
    chip_devices: "Uređaji",
    chip_offline: "Van mreže",
    chip_low_battery: "Slaba baterija",
    chip_updates: "Ažuriranja",
    search: "Pretraži po nazivu, modelu ili IEEE",
    no_data: "Još uvek nema podataka sa Zigbee2MQTT. Da li most radi?",
    no_results: "Nema poklapanja.",
    col_name: "Naziv",
    col_model: "Model",
    col_type: "Tip",
    col_linkquality: "Signal",
    col_battery: "Baterija",
    col_last_seen: "Poslednji put viđen",
    col_voltage: "Napon",
    col_installed: "Instalirano",
    col_latest: "Dostupno",
    col_ota: "Status",
    type_Router: "Ruter",
    type_EndDevice: "Krajnji uređaj",
    ota_available: "Ažuriranje je dostupno",
    ota_updating: "Ažuriranje je u toku",
    ota_scheduled: "Zakazano",
    ota_idle: "Ažurirano",
    ota_unknown: "Nije provereno",
    install: "Instaliraj",
    details: "Detalji",
    close: "Zatvori",
    never: "nikada",
    rename: "Preimenuj",
    save: "Sačuvaj",
    remove: "Ukloni uređaj",
    check: "Proveri ažuriranje",
    update_now: "Instaliraj ažuriranje",
    ota_unsupported: "Ovaj uređaj ne podržava OTA ažuriranja.",
    update_confirm:
      "Instalirati ažuriranje firmvera? Uređaj treba da ostane uključen i u dometu.",
    remove_confirm: "Zaista želite da uklonite ovaj uređaj sa Zigbee mreže?",
    update_found: "Ažuriranje je dostupno",
    no_update: "Nema dostupnih ažuriranja",
    renamed: "Preimenovano",
    update_done: "Ažuriranje je završeno",
    f_vendor: "Proizvođač",
    f_model: "Model",
    f_description: "Opis",
    f_ieee: "IEEE adresa",
    f_nwk: "Mrežna adresa",
    f_power: "Izvor napajanja",
    f_firmware: "Verzija firmvera",
    f_lqi: "Kvalitet veze",
    f_battery: "Baterija",
    f_voltage: "Napon",
    f_last_seen: "Poslednji put viđen",
    f_available: "Dostupan",
    yes: "da",
    no: "ne",
  },
  sr: {
    connecting: "Повезивање …",
    bridge_online: "Мост је на мрежи",
    bridge_offline: "Мост је ван мреже",
    bridge_unknown: "Статус моста је непознат",
    pairing_start: "Покрени упаривање",
    pairing_stop: "Заустави упаривање",
    check_all: "Провери ажурирања за све",
    checking: "Провера је покренута …",
    tab_devices: "Уређаји",
    tab_battery: "Батерија",
    tab_ota: "OTA ажурирања",
    chip_devices: "Уређаји",
    chip_offline: "Ван мреже",
    chip_low_battery: "Слаба батерија",
    chip_updates: "Ажурирања",
    search: "Претражи по називу, моделу или IEEE",
    no_data: "Још увек нема података са Zigbee2MQTT. Да ли мост ради?",
    no_results: "Нема поклапања.",
    col_name: "Назив",
    col_model: "Модел",
    col_type: "Тип",
    col_linkquality: "Сигнал",
    col_battery: "Батерија",
    col_last_seen: "Последњи пут виђен",
    col_voltage: "Напон",
    col_installed: "Инсталирано",
    col_latest: "Доступно",
    col_ota: "Статус",
    type_Router: "Рутер",
    type_EndDevice: "Крајњи уређај",
    ota_available: "Ажурирање је доступно",
    ota_updating: "Ажурирање је у току",
    ota_scheduled: "Заказано",
    ota_idle: "Ажурирано",
    ota_unknown: "Није проверено",
    install: "Инсталирај",
    details: "Детаљи",
    close: "Затвори",
    never: "никада",
    rename: "Преименуј",
    save: "Сачувај",
    remove: "Уклони уређај",
    check: "Провери ажурирање",
    update_now: "Инсталирај ажурирање",
    ota_unsupported: "Овај уређај не подржава OTA ажурирања.",
    update_confirm:
      "Инсталирати ажурирање фирмвера? Уређај треба да остане укључен и у домету.",
    remove_confirm: "Заиста желите да уклоните овај уређај са Zigbee мреже?",
    update_found: "Ажурирање је доступно",
    no_update: "Нема доступних ажурирања",
    renamed: "Преименовано",
    update_done: "Ажурирање је завршено",
    f_vendor: "Произвођач",
    f_model: "Модел",
    f_description: "Опис",
    f_ieee: "IEEE адреса",
    f_nwk: "Мрежна адреса",
    f_power: "Извор напајања",
    f_firmware: "Верзија фирмвера",
    f_lqi: "Квалитет везе",
    f_battery: "Батерија",
    f_voltage: "Напон",
    f_last_seen: "Последњи put виђен",
    f_available: "Доступан",
    yes: "да",
    no: "не",
  },
};

const COLS = {
  devices: ["name", "model", "type", "linkquality", "battery", "last_seen"],
  battery: ["name", "battery", "voltage", "linkquality", "last_seen"],
  ota: ["name", "model", "installed", "latest", "ota"],
};
const OTA_ORDER = { updating: 0, available: 1, scheduled: 2, idle: 3 };

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const STYLE = `
:host { display: block; }
ha-card { padding: 0; overflow: hidden; }
.header { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 16px 16px 8px; }
.title { font-size: 1.25rem; font-weight: 500; flex: 1 1 auto; color: var(--primary-text-color); }
.status { font-size: .8rem; padding: 2px 10px; border-radius: 12px; background: var(--secondary-background-color); color: var(--secondary-text-color); }
.status.online { color: var(--success-color, #43a047); }
.status.offline { color: var(--error-color, #db4437); }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
button { font: inherit; color: inherit; cursor: pointer; }
button:focus-visible, input:focus-visible, th[data-sort]:focus-visible, tr:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 1px; }
.btn { border: 1px solid var(--divider-color); background: transparent; border-radius: 8px; padding: 6px 12px; font-size: .85rem; color: var(--primary-text-color); }
.btn:hover:not(:disabled) { background: var(--secondary-background-color); }
.btn:disabled { opacity: .5; cursor: default; }
.btn.active { border-color: var(--warning-color, #ffa600); color: var(--warning-color, #ffa600); }
.btn.primary { background: var(--primary-color); border-color: var(--primary-color); color: var(--text-primary-color, #fff); }
.btn.primary:hover:not(:disabled) { background: var(--primary-color); filter: brightness(1.1); }
.btn.danger { border-color: var(--error-color, #db4437); color: var(--error-color, #db4437); }
.btn.small { padding: 2px 8px; font-size: .78rem; }
.stats { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 16px 8px; }
.chip { border: 1px solid var(--divider-color); background: transparent; border-radius: 10px; padding: 4px 12px; display: flex; gap: 8px; align-items: baseline; font-size: .82rem; color: var(--secondary-text-color); }
.chip b { font-size: 1.1rem; font-weight: 600; color: var(--c, var(--primary-text-color)); }
.chip.on { background: var(--secondary-background-color); border-color: var(--c, var(--primary-color)); }
.toolbar { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; justify-content: space-between; padding: 4px 16px 0; border-bottom: 1px solid var(--divider-color); }
.tabs { display: flex; gap: 4px; }
.tab { border: 0; background: transparent; padding: 10px 12px; font-size: .92rem; color: var(--secondary-text-color); border-bottom: 3px solid transparent; }
.tab.on { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 500; }
#search { flex: 1 1 180px; max-width: 320px; min-width: 140px; margin-bottom: 4px; padding: 6px 10px; font: inherit; border: 1px solid var(--divider-color); border-radius: 8px; background: var(--card-background-color); color: var(--primary-text-color); }
.tablewrap { overflow: auto; max-height: 70vh; }
table { width: 100%; border-collapse: collapse; font-size: .88rem; }
th { position: sticky; top: 0; background: var(--card-background-color); text-align: left; font-weight: 500; font-size: .78rem; color: var(--secondary-text-color); padding: 8px 12px; border-bottom: 1px solid var(--divider-color); white-space: nowrap; user-select: none; }
th[data-sort] { cursor: pointer; }
th.sorted { color: var(--primary-text-color); }
td { padding: 8px 12px; border-bottom: 1px solid var(--divider-color); vertical-align: middle; }
tbody tr { cursor: pointer; }
tbody tr:hover { background: var(--secondary-background-color); }
.name { display: flex; align-items: center; gap: 8px; font-weight: 500; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--disabled-text-color, #9e9e9e); flex: none; }
.dot.on { background: var(--success-color, #43a047); }
.dot.off { background: var(--error-color, #db4437); }
.sub { font-size: .75rem; color: var(--secondary-text-color); font-weight: 400; }
.muted { color: var(--secondary-text-color); }
.bar { display: inline-block; width: 64px; height: 8px; border-radius: 4px; background: var(--divider-color); vertical-align: middle; margin-right: 8px; overflow: hidden; }
.bar > span { display: block; height: 100%; border-radius: 4px; }
.pill { display: inline-block; padding: 1px 9px; border-radius: 10px; font-size: .78rem; border: 1px solid var(--c, var(--divider-color)); color: var(--c, var(--secondary-text-color)); white-space: nowrap; }
.empty { padding: 28px 16px; text-align: center; color: var(--secondary-text-color); }
.toast { position: fixed; left: 50%; bottom: 24px; transform: translate(-50%, 16px); opacity: 0; pointer-events: none; z-index: 20; padding: 10px 18px; border-radius: 8px; background: var(--primary-text-color); color: var(--card-background-color); font-size: .88rem; max-width: 90vw; transition: opacity .2s, transform .2s; }
.toast.show { opacity: 1; transform: translate(-50%, 0); }
.toast.error { background: var(--error-color, #db4437); color: #fff; }
.overlay { position: fixed; inset: 0; z-index: 10; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; padding: 16px; }
.overlay[hidden] { display: none; }
.dialog { width: min(560px, 100%); max-height: 90vh; overflow: auto; background: var(--card-background-color); color: var(--primary-text-color); border-radius: 14px; padding: 16px 20px 20px; box-shadow: 0 8px 32px rgba(0,0,0,.35); animation: pop .15s ease-out; }
@keyframes pop { from { opacity: 0; transform: scale(.97); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .dialog, .toast { animation: none; transition: none; } }
.dlg-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.dlg-head h2 { margin: 0; font-size: 1.1rem; font-weight: 500; word-break: break-word; }
.x { border: 0; background: transparent; font-size: 1.2rem; padding: 4px 8px; color: var(--secondary-text-color); }
.rename { display: flex; gap: 8px; margin-bottom: 16px; }
.rename input { flex: 1; min-width: 0; padding: 6px 10px; font: inherit; border: 1px solid var(--divider-color); border-radius: 8px; background: var(--card-background-color); color: var(--primary-text-color); }
dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 0 0 16px; font-size: .88rem; }
dt { color: var(--secondary-text-color); }
dd { margin: 0; word-break: break-word; }
.ota-box { border: 1px solid var(--divider-color); border-radius: 10px; padding: 12px; margin-bottom: 16px; }
.ota-box .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 8px; }
.dlg-foot { display: flex; justify-content: flex-end; }
`;

class Zigbee2MqttManagerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._data = null;
    this._tab = "devices";
    this._filter = null;
    this._search = "";
    this._sort = { devices: { key: "name", dir: 1 }, battery: { key: "battery", dir: 1 }, ota: { key: "ota", dir: 1 } };
    this._selected = null;
    this._unsub = null;
    this._subscribing = false;
    this._error = null;
    this._built = false;
  }

  setConfig(config) {
    this._config = { title: "Zigbee2MQTT Manager", ...config };
    if (!this._built) this._build();
    this._render();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this._subscribe();
  }

  connectedCallback() {
    if (this._hass && !this._unsub) this._subscribe();
  }

  disconnectedCallback() {
    if (this._unsub) {
      this._unsub();
      this._unsub = null;
    }
  }

  getCardSize() { return 8; }
  static getStubConfig() { return {}; }

  _t(key) {
    const lang = (this._hass?.language || "en").slice(0, 2);
    return (I18N[lang] || I18N.en)[key] ?? I18N.en[key] ?? key;
  }

  get _lang() { return (this._hass?.language || "en").slice(0, 2); }

  async _subscribe() {
    if (this._subscribing || this._unsub || !this._hass) return;
    this._subscribing = true;
    try {
      const msg = { type: "zigbee2mqtt_manager/subscribe" };
      if (this._config?.entry_id) msg.entry_id = this._config.entry_id;
      const unsub = await this._hass.connection.subscribeMessage((ev) => this._onEvent(ev), msg);
      if (!this.isConnected) { unsub(); } else { this._unsub = unsub; }
      this._error = null;
    } catch (err) {
      this._error = err?.message || String(err);
      this._render();
    } finally {
      this._subscribing = false;
    }
  }

  _onEvent(ev) {
    if (ev.kind === "update") {
      this._data = ev.data;
      this._render();
    } else if (ev.kind === "response") {
      this._onResponse(ev.data);
    }
  }

  _onResponse(r) {
    if (r.status === "error") return this._toast(r.error || "Error", true);
    const map = {
      "device/rename": this._t("renamed"),
      "device/ota_update/update": this._t("update_done"),
      "device/ota_update/check": r.data?.updateAvailable ? this._t("update_found") : this._t("no_update"),
    };
    if (map[r.topic]) this._toast(map[r.topic]);
  }

  _toast(msg, error = false) {
    const el = this.shadowRoot.getElementById("toast");
    el.textContent = msg;
    el.className = "toast show" + (error ? " error" : "");
    clearTimeout(this._tt);
    this._tt = setTimeout(() => { el.className = "toast"; }, 5000);
  }

  async _call(action, ieee, value) {
    const msg = { type: "zigbee2mqtt_manager/action", action };
    if (ieee) msg.ieee = ieee;
    if (value !== undefined && value !== null) msg.value = value;
    if (this._config?.entry_id) msg.entry_id = this._config.entry_id;
    try {
      await this._hass.callWS(msg);
      return true;
    } catch (err) {
      this._toast(err?.message || String(err), true);
      return false;
    }
  }

  // ---------------------------------------------------------------- Aufbau
  _build() {
    this._built = true;
    this.shadowRoot.innerHTML = `
      <style>${STYLE}</style>
      <ha-card>
        <div class="header">
          <div class="title" id="title"></div>
          <span class="status" id="status"></span>
          <div class="actions">
            <button class="btn" id="checkall" data-act="ota_check_all"></button>
            <button class="btn" id="pair" data-act="pair"></button>
          </div>
        </div>
        <div class="stats" id="stats"></div>
        <div class="toolbar">
          <div class="tabs" id="tabs"></div>
          <input id="search" type="search" />
        </div>
        <div class="tablewrap">
          <table><thead id="thead"></thead><tbody id="tbody"></tbody></table>
          <div class="empty" id="empty" hidden></div>
        </div>
      </ha-card>
      <div class="toast" id="toast" role="status"></div>
      <div class="overlay" id="overlay" hidden><div class="dialog" id="dialog" role="dialog" aria-modal="true"></div></div>`;

    const root = this.shadowRoot;
    root.getElementById("search").addEventListener("input", (e) => {
      this._search = e.target.value;
      this._render();
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._selected) this._closeDialog();
      if ((e.key === "Enter" || e.key === " ") && e.target.matches("tr[data-ieee], th[data-sort]")) {
        e.preventDefault();
        e.target.click();
      }
    });
    root.addEventListener("click", (e) => {
      if (e.target.id === "overlay") return this._closeDialog();
      const el = e.target.closest("[data-act],[data-tab],[data-sort],[data-chip],tr[data-ieee]");
      if (!el) return;
      const d = el.dataset;
      if (d.act) return this._doAction(el);
      if (d.tab) { this._tab = d.tab; this._filter = null; }
      else if (d.chip) {
        if (d.chip === "offline") { this._tab = "devices"; this._filter = this._filter === "offline" ? null : "offline"; }
        else { this._tab = d.chip; this._filter = null; }
      } else if (d.sort) {
        const s = this._sort[this._tab];
        if (s.key === d.sort) s.dir *= -1; else { s.key = d.sort; s.dir = 1; }
      } else if (d.ieee) return this._openDialog(d.ieee);
      this._render();
    });
  }

  _doAction(el) {
    const act = el.dataset.act;
    const ieee = el.dataset.ieee || this._selected;
    switch (act) {
      case "close": this._closeDialog(); break;
      case "pair": this._call("permit_join", null, el.dataset.value === "1"); break;
      case "ota_check_all": this._toast(this._t("checking")); this._call("ota_check_all"); break;
      case "ota_check": this._call("ota_check", ieee); break;
      case "ota_update": if (confirm(this._t("update_confirm"))) this._call("ota_update", ieee); break;
      case "rename": {
        const v = this.shadowRoot.getElementById("rename").value.trim();
        if (v) this._call("rename", ieee, v);
        break;
      }
      case "remove":
        if (confirm(this._t("remove_confirm"))) this._call("remove", ieee, false).then((ok) => ok && this._closeDialog());
        break;
    }
  }

  // ---------------------------------------------------------------- Darstellung
  _batteryColor(b) {
    const low = this._data?.stats?.low_battery_threshold ?? 20;
    if (b < low) return "var(--error-color, #db4437)";
    if (b < 50) return "var(--warning-color, #ffa600)";
    return "var(--success-color, #43a047)";
  }

  _lqiColor(q) {
    if (q < 50) return "var(--error-color, #db4437)";
    if (q < 100) return "var(--warning-color, #ffa600)";
    return "var(--success-color, #43a047)";
  }

  _rel(iso) {
    if (!iso) return `<span class="muted">${esc(this._t("never"))}</span>`;
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) return esc(iso);
    const diff = (ts - Date.now()) / 1000;
    const abs = Math.abs(diff);
    const rtf = new Intl.RelativeTimeFormat(this._lang, { numeric: "auto" });
    let out;
    if (abs < 60) out = rtf.format(Math.round(diff), "second");
    else if (abs < 3600) out = rtf.format(Math.round(diff / 60), "minute");
    else if (abs < 86400) out = rtf.format(Math.round(diff / 3600), "hour");
    else out = rtf.format(Math.round(diff / 86400), "day");
    return esc(out);
  }

  _batteryCell(d) {
    if (d.battery === null || d.battery === undefined) return `<span class="muted">–</span>`;
    const b = Math.max(0, Math.min(100, d.battery));
    return `<span class="bar"><span style="width:${b}%;background:${this._batteryColor(b)}"></span></span>${esc(b)} %`;
  }

  _lqiCell(d) {
    if (d.linkquality === null || d.linkquality === undefined) return `<span class="muted">–</span>`;
    return `<span class="pill" style="--c:${this._lqiColor(d.linkquality)}">${esc(d.linkquality)}</span>`;
  }

  _otaPill(o) {
    const label = { available: "ota_available", updating: "ota_updating", scheduled: "ota_scheduled", idle: "ota_idle" }[o.state] || "ota_unknown";
    const color = { available: "var(--info-color, var(--primary-color))", updating: "var(--warning-color, #ffa600)", scheduled: "var(--warning-color, #ffa600)", idle: "var(--success-color, #43a047)" }[o.state];
    const extra = o.state === "updating" && o.progress != null ? ` ${Math.round(o.progress)} %` : "";
    return `<span class="pill" ${color ? `style="--c:${color}"` : ""}>${esc(this._t(label))}${extra}</span>`;
  }

  _otaCell(d) {
    const btn = d.ota.state === "available"
      ? ` <button class="btn small" data-act="ota_update" data-ieee="${esc(d.ieee)}">${esc(this._t("install"))}</button>`
      : "";
    return this._otaPill(d.ota) + btn;
  }

  _cell(d, key) {
    switch (key) {
      case "name": {
        const cls = d.available === true ? "on" : d.available === false ? "off" : "";
        return `<div class="name"><span class="dot ${cls}"></span><div>${esc(d.name)}<div class="sub">${esc(d.ieee)}</div></div></div>`;
      }
      case "model": return `${esc(d.model || "–")}<div class="sub">${esc(d.vendor || "")}</div>`;
      case "type": return esc(this._t("type_" + d.type) === "type_" + d.type ? d.type || "–" : this._t("type_" + d.type));
      case "linkquality": return this._lqiCell(d);
      case "battery": return this._batteryCell(d);
      case "voltage": return d.voltage != null ? `${esc(d.voltage)} mV` : `<span class="muted">–</span>`;
      case "last_seen": return this._rel(d.last_seen);
      case "installed": return esc(d.ota.installed ?? "–");
      case "latest": return esc(d.ota.latest ?? "–");
      case "ota": return this._otaCell(d);
      default: return "";
    }
  }

  _sortValue(d, key) {
    switch (key) {
      case "name": return (d.name || "").toLowerCase();
      case "model": return `${d.vendor || ""} ${d.model || ""}`.toLowerCase();
      case "type": return d.type || null;
      case "installed": return d.ota.installed ?? null;
      case "latest": return d.ota.latest ?? null;
      case "ota": return OTA_ORDER[d.ota.state] ?? null;
      case "last_seen": return d.last_seen ? Date.parse(d.last_seen) || null : null;
      default: return d[key] ?? null;
    }
  }

  _rows() {
    let list = this._data?.devices ?? [];
    if (this._tab === "battery") list = list.filter((d) => d.battery != null);
    if (this._tab === "ota") list = list.filter((d) => d.ota.capable);
    if (this._filter === "offline") list = list.filter((d) => d.available === false);
    const q = this._search.trim().toLowerCase();
    if (q) list = list.filter((d) => [d.name, d.vendor, d.model, d.ieee, d.description].some((v) => (v || "").toString().toLowerCase().includes(q)));
    const { key, dir } = this._sort[this._tab];
    return [...list].sort((a, b) => {
      const x = this._sortValue(a, key), y = this._sortValue(b, key);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }

  _render() {
    if (!this._built || !this._config) return;
    const $ = (id) => this.shadowRoot.getElementById(id);
    const t = (k) => this._t(k);
    const data = this._data;
    const b = data?.bridge;

    $("title").textContent = this._config.title;
    $("search").placeholder = t("search");
    $("checkall").textContent = t("check_all");
    $("checkall").disabled = !b;

    let st = "", label = t("connecting");
    if (this._error) { st = "offline"; label = this._error; }
    else if (b?.online === true) { st = "online"; label = t("bridge_online") + (b.version ? ` · ${b.version}` : ""); }
    else if (b?.online === false) { st = "offline"; label = t("bridge_offline"); }
    else if (b) label = t("bridge_unknown");
    $("status").className = "status " + st;
    $("status").textContent = label;

    const pj = !!b?.permit_join;
    let until = "";
    if (pj && b.permit_join_end) {
      const ts = b.permit_join_end > 1e11 ? b.permit_join_end : b.permit_join_end * 1000;
      until = ` (${new Date(ts).toLocaleTimeString(this._lang)})`;
    }
    const pair = $("pair");
    pair.className = "btn" + (pj ? " active" : "");
    pair.textContent = (pj ? t("pairing_stop") : t("pairing_start")) + until;
    pair.dataset.value = pj ? "0" : "1";
    pair.disabled = !b;

    const s = data?.stats;
    const chip = (id, n, lbl, color, on) =>
      `<button class="chip ${on ? "on" : ""}" data-chip="${id}" style="--c:${n > 0 && color ? color : "var(--primary-text-color)"}"><b>${esc(n)}</b>${esc(lbl)}</button>`;
    $("stats").innerHTML = s
      ? chip("devices", s.total, t("chip_devices"), "", false) +
        chip("offline", s.offline, t("chip_offline"), "var(--error-color, #db4437)", this._filter === "offline") +
        chip("battery", s.low_battery, t("chip_low_battery"), "var(--warning-color, #ffa600)", false) +
        chip("ota", s.updates_available, t("chip_updates"), "var(--info-color, var(--primary-color))", false)
      : "";

    $("tabs").innerHTML = ["devices", "battery", "ota"]
      .map((k) => `<button class="tab ${this._tab === k ? "on" : ""}" data-tab="${k}">${esc(t("tab_" + k))}</button>`)
      .join("");

    const cols = COLS[this._tab];
    const sort = this._sort[this._tab];
    $("thead").innerHTML =
      "<tr>" +
      cols
        .map((k) => `<th tabindex="0" data-sort="${k}" class="${sort.key === k ? "sorted" : ""}">${esc(t("col_" + k))}${sort.key === k ? (sort.dir > 0 ? " ▲" : " ▼") : ""}</th>`)
        .join("") +
      "</tr>";

    const rows = this._rows();
    $("tbody").innerHTML = rows
      .map((d) => `<tr tabindex="0" data-ieee="${esc(d.ieee)}">${cols.map((k) => `<td>${this._cell(d, k)}</td>`).join("")}</tr>`)
      .join("");
    const empty = $("empty");
    empty.hidden = rows.length > 0;
    empty.textContent = data && data.devices.length ? t("no_results") : t("no_data");

    if (this._selected) this._renderDialog(false);
  }

  // ---------------------------------------------------------------- Detail-Popup
  _openDialog(ieee) {
    this._selected = ieee;
    this.shadowRoot.getElementById("overlay").hidden = false;
    this._renderDialog(true);
    this.shadowRoot.getElementById("rename")?.focus();
  }

  _closeDialog() {
    this._selected = null;
    this.shadowRoot.getElementById("overlay").hidden = true;
  }

  _renderDialog(full) {
    const d = (this._data?.devices ?? []).find((x) => x.ieee === this._selected);
    if (!d) return this._closeDialog();
    const t = (k) => this._t(k);
    const dlg = this.shadowRoot.getElementById("dialog");
    if (full || !dlg.querySelector("#live")) {
      dlg.innerHTML = `
        <div class="dlg-head"><h2>${esc(d.name)}</h2><button class="x" data-act="close" aria-label="${esc(t("close"))}">✕</button></div>
        <div class="rename"><input id="rename" value="${esc(d.name)}" aria-label="${esc(t("rename"))}"><button class="btn primary" data-act="rename">${esc(t("save"))}</button></div>
        <div id="live"></div>
        <div class="dlg-foot"><button class="btn danger" data-act="remove">${esc(t("remove"))}</button></div>`;
    }
    const rows = [
      ["f_vendor", d.vendor], ["f_model", d.model], ["f_description", d.description], ["f_ieee", d.ieee],
      ["f_nwk", d.network_address], ["f_power", d.power_source], ["f_firmware", d.sw_build_id],
      ["f_lqi", d.linkquality], ["f_battery", d.battery != null ? `${d.battery} %` : null],
      ["f_voltage", d.voltage != null ? `${d.voltage} mV` : null],
      ["f_available", d.available == null ? null : d.available ? t("yes") : t("no")],
    ].filter(([, v]) => v !== null && v !== undefined && v !== "");
    let html = "<dl>" + rows.map(([k, v]) => `<dt>${esc(t(k))}</dt><dd>${esc(v)}</dd>`).join("") +
      `<dt>${esc(t("f_last_seen"))}</dt><dd>${this._rel(d.last_seen)}</dd></dl>`;
    if (d.ota.capable) {
      html += `<div class="ota-box">${this._otaPill(d.ota)}
        <div class="sub" style="margin-top:6px">${esc(d.ota.installed ?? "–")} → ${esc(d.ota.latest ?? "–")}</div>
        <div class="row">
          <button class="btn" data-act="ota_check">${esc(t("check"))}</button>
          <button class="btn primary" data-act="ota_update" ${d.ota.state === "available" ? "" : "disabled"}>${esc(t("update_now"))}</button>
        </div></div>`;
    } else {
      html += `<div class="ota-box muted">${esc(t("ota_unsupported"))}</div>`;
    }
    dlg.querySelector("#live").innerHTML = html;
  }
}

if (!customElements.get("zigbee2mqtt-manager-card")) {
  customElements.define("zigbee2mqtt-manager-card", Zigbee2MqttManagerCard);
}
window.customCards = window.customCards || [];
window.customCards.push({
  type: "zigbee2mqtt-manager-card",
  name: "Zigbee2MQTT Manager",
  description: "Geräte, Batterie und OTA-Updates von Zigbee2MQTT verwalten",
  preview: false,
});
console.info(`%c ZIGBEE2MQTT-MANAGER-CARD %c v${CARD_VERSION} `, "background:#03a9f4;color:#fff", "background:#333;color:#fff");
