// SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 01327da6ec6384440a25a41950f799f8c1706285d70b15ba14f7e29ac895a59b
// Seitenleisten-Eintrag „Zigbee2MQTT“: zeigt die Karte als eigene Seite (Home-Assistant-Panel).
// Die Karte wird über die von der Integration übergebene URL nachgeladen, damit sie auch ohne
// vorher geöffnetes Dashboard (Lovelace-Ressource) verfügbar ist.
class Zigbee2MqttManagerPanel extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._narrow = false;
    this._panel = null;
    this._card = null;
    this._menu = null;
    this._starting = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._card) this._card.hass = hass;
    if (this._menu) this._menu.hass = hass;
    this._start();
  }

  set narrow(narrow) {
    this._narrow = !!narrow;
    if (this._menu) this._menu.narrow = this._narrow;
  }

  set panel(panel) {
    this._panel = panel;
    this._start();
  }

  async _start() {
    if (this._card || this._starting || !this._hass || !this._panel) return;
    this._starting = true;
    const cfg = this._panel.config || {};
    try {
      if (typeof cfg.card_url === "string" && cfg.card_url.startsWith("/")) {
        await import(cfg.card_url);
      }
      await customElements.whenDefined("zigbee2mqtt-manager-card");
    } catch (err) {
      console.error("zigbee2mqtt-manager-panel: Karte konnte nicht geladen werden", err);
    }
    if (!customElements.get("zigbee2mqtt-manager-card")) {
      this._starting = false;
      return;
    }
    this.style.display = "block";
    this.style.minHeight = "100%";
    this.style.background = "var(--primary-background-color, #fafafa)";
    this.style.boxSizing = "border-box";

    const bar = document.createElement("div");
    bar.style.cssText =
      "display:flex;align-items:center;gap:8px;height:56px;padding:0 12px;box-sizing:border-box;" +
      "background:var(--app-header-background-color, var(--primary-color, #03a9f4));" +
      "color:var(--app-header-text-color, var(--text-primary-color, #fff));font-size:1.2em;";
    const menu = document.createElement("ha-menu-button");
    menu.hass = this._hass;
    menu.narrow = this._narrow;
    this._menu = menu;
    const title = document.createElement("span");
    title.textContent = "Zigbee2MQTT";
    bar.append(menu, title);

    const wrap = document.createElement("div");
    wrap.style.cssText = "max-width:1200px;margin:0 auto;padding:16px;box-sizing:border-box;";
    const card = document.createElement("zigbee2mqtt-manager-card");
    card.setConfig({ type: "custom:zigbee2mqtt-manager-card", title: "", show_title: false });
    card.hass = this._hass;
    this._card = card;
    wrap.append(card);

    this.append(bar, wrap);
    this._starting = false;
  }
}

if (!customElements.get("zigbee2mqtt-manager-panel")) {
  customElements.define("zigbee2mqtt-manager-panel", Zigbee2MqttManagerPanel);
}
