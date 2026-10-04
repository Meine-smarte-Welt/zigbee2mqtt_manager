# Zigbee2MQTT Manager für Home Assistant

Zigbee2MQTT verwalten, ohne Home Assistant zu verlassen: Geräte, Batterien, Firmware-Updates, Gruppen, Bindings und Bridge in einer Dashboard-Karte – als HACS-Integration. Aufbau und Design orientieren sich an der Karte von [FRITZ!Box Anrufe](https://github.com/Meine-smarte-Welt/fritzbox_anrufe): Symbol-Kategorien, Zeilenlisten, Detail-Popup, Akkordeon-Abschnitte, grafischer Editor und frei einstellbare Farben.

## Inhalt

- [Funktionsumfang](#funktionsumfang)
- [Voraussetzungen](#voraussetzungen)
- [Installation](#installation)
- [Die Karte](#die-karte)
- [Farben](#farben)
- [Services](#services)
- [Ereignisse für Automationen](#ereignisse-für-automationen)
- [Sensoren](#sensoren)
- [Einstellungen der Integration](#einstellungen-der-integration)
- [Sicherheit](#sicherheit)
- [Bekannte Einschränkungen](#bekannte-einschränkungen)
- [Fehlerbehebung](#fehlerbehebung)
- [Datei-Integrität](#datei-integrität-hash-kommentare)

## Funktionsumfang

Die Karte hat sechs Kategorien in einer Symbolleiste (unter ca. 480 px Kartenbreite nur Symbole). Jede Kategorie ist einzeln ein- und ausblendbar.

| Kategorie | Was es kann |
|---|---|
| **Geräte** | Liste mit Erreichbarkeit, Modell, Signal, Batterie, „zuletzt gesehen“; Statistik-Chips als Filter (Offline / Batterie niedrig / Updates); Suche; Sortierung |
| **Batterie** | Batteriegeräte, niedrigster Stand zuerst; Farben nach niedriger und kritischer Schwelle |
| **Updates** | Installierte vs. verfügbare Firmware; „Alle prüfen“ und „Alle nacheinander installieren“ als Hintergrundauftrag mit Fortschritt und Abbruch |
| **Gruppen** | Anlegen, umbenennen, löschen; Mitglieder hinzufügen und entfernen |
| **Bindings** | Übersicht aller Geräte-Verknüpfungen; Lösen; Neu verknüpfen im Geräte-Popup |
| **Bridge** (Zahnrad) | **App-Version** (Integration und Karte, mit farbigem Hinweis bei einer neuen Version), Status, Koordinator, Pairing, Bridge-Optionen, Neustart, Ereignisprotokoll |

**Geräte-Popup** (Tipp auf eine Zeile) mit Akkordeon-Abschnitten: Informationen · Umbenennen (mit Liste der betroffenen HA-Entitäten) · Geräteoptionen (Formular aus dem Z2M-Optionsschema) · Firmware · Bindings · Gruppen · Entfernen.

Weitere Punkte:

- **Zwischenspeicher:** Batterie, Signal, OTA-Status und „zuletzt gesehen“ überleben einen Home-Assistant-Neustart (Z2M sendet Gerätezustände nicht retained).
- **Gruppen sind keine Geräte mehr:** Gruppen-Topics tauchen nicht als Phantomgerät in der Liste auf.
- **Zwei-Klick-Bestätigung** statt Browser-Dialog bei riskanten Aktionen (Entfernen, Update, Neustart, Lösen, Löschen).
- **Nur lesen:** `read_only: true` blendet alle Bedienelemente zum Ändern aus (Wandtablets).
- **Zoom:** `zoom` skaliert die ganze Karte.
- **Sprachen:** Deutsch und Englisch (nach Home-Assistant-Sprache).
- **Diagnose-Download** mit anonymisierten Namen und IEEE-Adressen.

## Voraussetzungen

- Home Assistant **2025.6** oder neuer
- Eingerichtete **MQTT-Integration**
- **Zigbee2MQTT 2.x** (Version 1.x wird erkannt und in der Karte als nicht unterstützt gemeldet)
- Empfohlen: in Zigbee2MQTT `availability: true` setzen, sonst gibt es keinen Online/Offline-Status. Für „zuletzt gesehen“ zusätzlich `advanced.last_seen: ISO_8601`.

## Installation

1. HACS → ⋮ → **Benutzerdefinierte Repositories** → URL dieses Repos, Kategorie **Integration**
2. „Zigbee2MQTT Manager“ installieren, Home Assistant neu starten
3. **Einstellungen → Geräte & Dienste → Integration hinzufügen → Zigbee2MQTT Manager**
4. Base-Topic eintragen (Standard `zigbee2mqtt`) und Schwelle für „Batterie niedrig“ wählen

Manuell: Ordner `custom_components/zigbee2mqtt_manager` nach `<config>/custom_components/` kopieren.

## Die Karte

Die Integration liefert die Karte aus und trägt sie als Lovelace-Ressource ein (persistiert, mit `?v=<Version>` gegen veraltete Browser-Caches). Du musst nichts manuell hinzufügen. Läuft Lovelace im YAML-Modus, trage `/zigbee2mqtt_manager_files/zigbee2mqtt-manager-card.js` als Ressource vom Typ `module` ein.

Karte hinzufügen: **Dashboard bearbeiten → Karte hinzufügen → „Zigbee2MQTT Manager“**. Der grafische Editor gruppiert alle Einstellungen in auf-/zuklappbare Abschnitte (Kategorien, Darstellung mit Spalten, Bearbeiten, Netzwerk, Farben). Es ist kein YAML nötig, aber möglich:

```yaml
type: custom:zigbee2mqtt-manager-card
title: Zigbee2MQTT Manager   # leer ("") = keine Überschrift
# entry_id: abc123            # nur bei mehreren Z2M-Instanzen
show_devices: true
show_battery: true
show_updates: true
show_groups: true
show_bindings: true
show_bridge: true
default_tab: devices
max_rows: 0                   # 0 = alle, sonst „weitere anzeigen“
zoom: 1
show_stats: true
show_images: true             # Gerätebilder von zigbee2mqtt.io
show_search: true
show_filter_bar: true         # Sortierauswahl
default_sort: name_asc        # name_asc | name_desc | battery_asc | lqi_asc | last_seen_desc | last_seen_asc | ota
show_model: true
show_vendor: true
show_ieee: false
show_lqi: true
show_battery_value: true
show_last_seen: true
read_only: false
show_pairing: true
```

Weitere Beispiele: [`examples/`](examples/).

## Farben

Im Editor unter **Farben** (oder per `color_*`-Schlüssel). Jeder Wert darf Hex (`#ff9800`), `rgb()`, `hsl()` oder `var(--...)` sein. Leer bedeutet Theme-Standard. Ungültige Werte werden verworfen. Das Swatch öffnet den Farbwähler, das Textfeld nimmt beliebige CSS-Werte, „Alle Farben zurücksetzen“ leert alles.

| Schlüssel | Wirkung |
|---|---|
| `color_tab_active` | Aktiver Tab, Primär-Schaltflächen |
| `color_success` | Gut: online, Signal gut, Batterie voll, aktuell |
| `color_warning` | Warnung: Batterie niedrig, Signal mittel, Update läuft |
| `color_error` | Fehler: offline, Batterie kritisch, Signal schwach |
| `color_info` | Update verfügbar (Firmware, neue App-Version) |
| `color_row_icon` | Alle Listen-Symbole (überschreibt die Kategorie-Farben) |
| `color_live_banner` | Banner-Hintergrund (Pairing, Firmware-Auftrag) |
| `color_icon_devices`, `_battery`, `_updates`, `_groups`, `_bindings`, `_bridge` | Symbol der Kategorie – färbt Tab-Symbol und Zeilen-Symbole |

Ist `color_row_icon` gesetzt, gewinnt diese einheitliche Farbe.

## Services

Beide Services sind für Automationen gedacht. `entry_id` ist nur bei mehreren Instanzen nötig.

```yaml
action: zigbee2mqtt_manager.permit_join
data:
  enabled: true
  duration: 120      # Sekunden, 10–254, optional
```

```yaml
action: zigbee2mqtt_manager.check_updates
```

`check_updates` prüft alle OTA-fähigen Geräte im Hintergrund, nacheinander mit Abstand.

## Ereignisse für Automationen

Abschaltbar in den Integrations-Optionen („Home-Assistant-Ereignisse auslösen“). Beim Start wird nur der Ausgangszustand erfasst, es gibt dann keine Ereignisflut.

| Ereignis | Daten |
|---|---|
| `zigbee2mqtt_manager_device_offline` / `_device_online` | `name`, `ieee`, `base_topic` |
| `zigbee2mqtt_manager_battery_low` | `name`, `ieee`, `battery` – beim Unterschreiten der Schwelle |
| `zigbee2mqtt_manager_update_available` | `name`, `ieee`, `installed`, `latest` |
| `zigbee2mqtt_manager_device_joined` / `_device_left` | `name`, `ieee` |

```yaml
triggers:
  - trigger: event
    event_type: zigbee2mqtt_manager_battery_low
actions:
  - action: notify.mobile_app_handy
    data:
      message: "{{ trigger.event.data.name }}: Batterie {{ trigger.event.data.battery }} %"
```

## Sensoren

`Geräte`, `Offline-Geräte`, `Geräte mit niedriger Batterie`, `Geräte mit kritischer Batterie`, `Verfügbare Firmware-Updates` und `Gruppen`. Die Sensoren für Offline, Batterie und Updates tragen die Geräteliste als Attribut.

## Versionsanzeige und Update-Hinweis

Die installierte Version steht an drei Stellen: in der Karte unter **Bridge (Zahnrad) → App-Version**, oben im grafischen Karten-Editor und im Dialog **Konfigurieren** der Integration. Die Integration fragt beim Start und danach alle 12 Stunden bei GitHub ab (`api.github.com`, neuestes Release, ersatzweise das höchste Versions-Tag), ob eine neuere Version veröffentlicht wurde. Gibt es eine, wird das farbig hervorgehoben: orangefarbener Rahmen und Hinweis im Abschnitt, ein orangefarbenes „↑“ am Zahnrad-Symbol, eine Warnbox im Editor und ein Hinweis im Konfigurieren-Dialog. Die Aktualisierung selbst erfolgt wie gewohnt über HACS. Mit **Jetzt prüfen** lässt sich die Abfrage sofort auslösen. Ist GitHub nicht erreichbar, erscheint „Prüfung nicht möglich“; die Karte funktioniert unverändert weiter.

Weichen Karten- und Integrationsversion voneinander ab (veralteter Browser-Cache), wird auch das orange markiert.

## Einstellungen der Integration

Unter **Konfigurieren** (mit Anzeige der installierten Version): Schwelle „Batterie niedrig“, Schwelle „Batterie kritisch“ (muss kleiner oder gleich sein) und Ereignisse an/aus. Über **Neu konfigurieren** lässt sich das Base-Topic ändern.

## Sicherheit

Alle schreibenden Aktionen (Umbenennen, Optionen, Entfernen, Firmware, Gruppen, Bindings, Pairing, Neustart, Versionsprüfung) und das Laden der Geräte-Details sind per WebSocket auf **Administratoren** beschränkt. Eingaben werden vom Backend geprüft (doppelte Namen, unbekannte Optionen, erlaubte Bridge-Werte). Die Karte maskiert alle Texte; Farbwerte laufen durch eine Allowlist.

## Bekannte Einschränkungen

- **Z2M-Payloads ungeprüft:** `device/options`, die Bindings-Struktur in `bridge/devices` und die Bridge-Optionen (`log_level`, `last_seen`). Weicht deine Z2M-Version ab, bleibt die betroffene Funktion wirkungslos oder meldet einen Fehler.
- Geräteoptionen unterstützen einfache Typen (Zahl, Schalter, Auswahl, Text), keine verschachtelten Optionen.
- Die Entitäten-Vorschau beim Umbenennen findet Geräte über die MQTT-Identifier und kann bei ungewöhnlicher Discovery-Konfiguration leer bleiben.
- „Alle installieren“ wartet pro Gerät bis zu zwei Stunden auf das Ende des Updates.
- Batterie, Signal und OTA-Status erscheinen nach einem Neustart zunächst aus dem Zwischenspeicher und werden mit der nächsten Gerätenachricht aktualisiert.

## Fehlerbehebung

- **Karte nicht gefunden:** Browser-Cache leeren; unter Einstellungen → Dashboards → Ressourcen prüfen, ob `/zigbee2mqtt_manager_files/…` vorhanden ist (im YAML-Modus manuell eintragen).
- **Kein Online/Offline-Status:** in Zigbee2MQTT `availability: true` aktivieren. Ohne Verfügbarkeit zeigt der Punkt am Symbol den Zustand aus „zuletzt gesehen“: halbtransparentes Grün = innerhalb von 25 Stunden gehört, Orange = länger nichts gehört, Grau = noch keine Nachricht. Ein Tooltip am Punkt erklärt die Herkunft. Rot („offline“) gibt es nur mit aktivierter Z2M-Verfügbarkeit.
- **Gerätebilder:** Die Karte lädt die Bilder direkt im Browser von `www.zigbee2mqtt.io` (dieselbe Quelle wie das Z2M-Frontend, Datei nach Modellname). Ein in Z2M beim Gerät gesetztes `icon` hat Vorrang. Gibt es kein Bild oder ist die Seite nicht erreichbar (z. B. ohne Internet), erscheint das Symbol. Mit `show_images: false` werden keine externen Anfragen gestellt.
- **„Zuletzt gesehen“ fehlt:** `advanced.last_seen: ISO_8601` setzen oder die Bridge-Option in der Bridge-Kategorie ändern.
- **„Keine Verbindung zur Integration“:** Ist die Integration geladen? Stimmt `entry_id`?
- **Bridge-Banner „Version nicht unterstützt“:** Zigbee2MQTT 1.x wird nicht unterstützt.
- Logs: `custom_components.zigbee2mqtt_manager` auf `debug` stellen.

## Lizenz

MIT
