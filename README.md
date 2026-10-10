🇩🇪 Deutsch · [🇬🇧 English](README.en.md) · [🇳🇱 Nederlands](README.nl.md)

# Zigbee2MQTT Manager für Home Assistant

Zigbee2MQTT verwalten, ohne Home Assistant zu verlassen: Geräte, Batterien, Firmware-Updates, Gruppen, Bindings und Bridge in einer Dashboard-Karte – als HACS-Integration. Aufbau und Design orientieren sich an der Karte von [FRITZ!Box Anrufe](https://github.com/Meine-smarte-Welt/fritzbox_anrufe): Symbol-Kategorien, Zeilenlisten, Detail-Popup, Akkordeon-Abschnitte, grafischer Editor und frei einstellbare Farben.

## Inhalt

- [Funktionsumfang](#funktionsumfang)
- [Voraussetzungen](#voraussetzungen)
- [Installation](#installation)
- [Die Karte](#die-karte)
- [Farben](#farben)
- [Mehrere Instanzen (mehrere Sticks)](#mehrere-instanzen-mehrere-sticks)
- [Services](#services)
- [Ereignisse für Automationen](#ereignisse-für-automationen)
- [Sensoren](#sensoren)
- [Versionsanzeige und Update-Hinweis](#versionsanzeige-und-update-hinweis)
- [Einstellungen der Integration](#einstellungen-der-integration)
- [Sicherheit](#sicherheit)
- [Bekannte Einschränkungen](#bekannte-einschränkungen)
- [Fehlerbehebung](#fehlerbehebung)
- [Versionshistorie](#versionshistorie)
- [Datei-Integrität](#datei-integrität)

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

**Geräte-Popup** (Tipp auf eine Zeile) mit Akkordeon-Abschnitten: Informationen · **Funktionen (Expose)** · Umbenennen (mit Liste der betroffenen HA-Entitäten) · Geräteoptionen (Formular aus dem Z2M-Optionsschema) · Firmware · Bindings · Gruppen · Entfernen.

Der Abschnitt **Funktionen (Expose)** zeigt alle Funktionen, die Zigbee2MQTT für das Gerät bereitstellt (z. B. Schalter, Helligkeit, Farbe, Temperatur, Linkqualität): mit Namen, Eigenschaft, **aktuellem Wert** samt Einheit, Zugriff (Lesen / Schreiben / Abfragen), Wertebereich bzw. Auswahlwerten, Beschreibung und Kennzeichnung als Konfiguration oder Diagnose. Zusammengesetzte Funktionen (z. B. Farbe x/y) und Gruppen wie Licht oder Schalter werden aufgelöst und gruppiert; ab neun Funktionen gibt es ein Filterfeld. Solange der Abschnitt offen ist, aktualisieren sich die Werte, sobald das Gerät etwas sendet (höchstens alle 3 Sekunden). Die Anzeige ist rein lesend; steuern lässt sich das Gerät wie bisher über seine Home-Assistant-Entitäten.

Weitere Punkte:

- **Zwischenspeicher:** Batterie, Signal, OTA-Status und „zuletzt gesehen“ überleben einen Home-Assistant-Neustart (Z2M sendet Gerätezustände nicht retained).
- **Gruppen sind keine Geräte mehr:** Gruppen-Topics tauchen nicht als Phantomgerät in der Liste auf.
- **Zwei-Klick-Bestätigung** statt Browser-Dialog bei riskanten Aktionen (Entfernen, Update, Neustart, Lösen, Löschen).
- **Nur lesen:** `read_only: true` blendet alle Bedienelemente zum Ändern aus (Wandtablets).
- **Zoom:** `zoom` skaliert die ganze Karte.
- **Sprachen:** Deutsch, Englisch und Niederländisch (nach Home-Assistant-Sprache).
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

## Mehrere Instanzen (mehrere Sticks)

Läuft mehr als eine Zigbee2MQTT-Instanz (z. B. drei Koordinator-Sticks mit je eigenem Z2M), wird jede als eigener Eintrag eingerichtet: **Einstellungen → Geräte & Dienste → Integration hinzufügen → Zigbee2MQTT Manager**, jeweils mit dem passenden **Base-Topic** (`mqtt.base_topic` der jeweiligen Z2M-Instanz, z. B. `zigbee2mqtt`, `zigbee2mqtt2`, `zigbee2mqtt3`). Die Base-Topics müssen sich unterscheiden und dürfen nicht ineinander liegen (nicht `zigbee2mqtt` und `zigbee2mqtt/stick2`), sonst lehnt die Einrichtung sie ab. Jede Instanz bekommt eigene Sensoren, Ereignisse (mit `base_topic` in den Daten) und einen eigenen Zwischenspeicher.

In der Karte gibt es zwei Wege:

- **Umschalter (Standard):** Gibt es mehr als eine Instanz und ist keine festgelegt, erscheint oben in der Karte eine Auswahl der Sticks. Die Wahl wird im Browser gemerkt.
- **Eine Karte je Stick:** Im Karten-Editor unter **Instanz (Stick)** die Instanz wählen, oder in YAML:

```yaml
type: custom:zigbee2mqtt-manager-card
base_topic: zigbee2mqtt2     # oder: entry_id: abc123
```

`base_topic` ist die einfachere Variante, weil man die `entry_id` sonst nirgends sieht. Sind beide gesetzt, gilt `entry_id`.

## Services

Beide Services sind für Automationen gedacht. Bei mehreren Instanzen wählt `base_topic` (oder `entry_id`) die Instanz. `check_updates` prüft ohne Angabe **alle** Instanzen; `permit_join` verlangt bei mehreren Instanzen eine Angabe, damit das Pairing nie versehentlich an allen Sticks gleichzeitig öffnet.

```yaml
action: zigbee2mqtt_manager.permit_join
data:
  base_topic: zigbee2mqtt2   # nur bei mehreren Instanzen
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
- **Offline-Anzeige (seit 1.0.5) und Teststand:** Die Karte übernimmt die Verfügbarkeit von Zigbee2MQTT. Hat ein Gerät nach einer Offline-Meldung live gesendet, zeigt die Karte es als erreichbar. Das wurde gegen simulierte Daten geprüft, **nicht an echter Hardware**. Ob damit die in 1.0.4 gemeldeten falschen Offline-Anzeigen (Sensoren, Steckdose) verschwinden, ist offen: Rückmeldung ausdrücklich erwünscht.
- Das Popup und der Abschnitt „Funktionen (Expose)“ wurden in 1.0.5 korrigiert (Endlosschleife beim Neuzeichnen), aber ebenfalls nicht an echter Hardware und nicht in der iOS-/Android-Companion-App geprüft.

## Fehlerbehebung

- **Karte nicht gefunden:** Browser-Cache leeren; unter Einstellungen → Dashboards → Ressourcen prüfen, ob `/zigbee2mqtt_manager_files/…` vorhanden ist (im YAML-Modus manuell eintragen).
- **Gerät wird offline angezeigt, ist aber erreichbar:** Zigbee2MQTT selbst meldet den Status (`<base_topic>/<Gerät>/availability`). Prüfe dort den Wert, z. B. mit dem MQTT-Explorer (Einstellungen → Geräte & Dienste → MQTT → Konfigurieren). Sende bitte bei Problemen den Diagnose-Download und nenne die Z2M-Einstellung `availability` (z. B. `timeout`) und das Gerätemodell. Bei Batteriegeräten setzt Z2M „offline“ erst nach Stunden ohne Nachricht.
- **Kein Online/Offline-Status:** in Zigbee2MQTT `availability: true` aktivieren. Ohne Verfügbarkeit zeigt der Punkt am Symbol den Zustand aus „zuletzt gesehen“: halbtransparentes Grün = innerhalb von 25 Stunden gehört, Orange = länger nichts gehört, Grau = noch keine Nachricht. Ein Tooltip am Punkt erklärt die Herkunft. Rot („offline“) gibt es nur mit aktivierter Z2M-Verfügbarkeit.
- **Gerätebilder:** Die Karte lädt die Bilder direkt im Browser von `www.zigbee2mqtt.io` (dieselbe Quelle wie das Z2M-Frontend, Datei nach Modellname). Ein in Z2M beim Gerät gesetztes `icon` hat Vorrang. Gibt es kein Bild oder ist die Seite nicht erreichbar (z. B. ohne Internet), erscheint das Symbol. Mit `show_images: false` werden keine externen Anfragen gestellt.
- **„Zuletzt gesehen“ fehlt:** `advanced.last_seen: ISO_8601` setzen oder die Bridge-Option in der Bridge-Kategorie ändern.
- **„Keine Verbindung zur Integration“:** Ist die Integration geladen? Stimmen `base_topic` bzw. `entry_id`?
- **Funktionen (Expose) fehlen oder zeigen „noch kein Wert“:** Der Wert erscheint, sobald das Gerät das erste Mal gesendet hat (Zigbee2MQTT hält Gerätezustände nicht vor). Der Abschnitt wird nur für Geräte mit Zigbee2MQTT-Definition angezeigt. Das Laden der Details ist Administratoren vorbehalten.
- **Popup oder Funktionen (Expose) lassen sich nicht bedienen (nur Version 1.0.4):** Auf 1.0.5 aktualisieren, Home Assistant neu starten, Browser-Cache leeren (Strg+F5) bzw. die Companion-App neu laden.
- **Bridge-Banner „Version nicht unterstützt“:** Zigbee2MQTT 1.x wird nicht unterstützt.
- Logs: `custom_components.zigbee2mqtt_manager` auf `debug` stellen.

## Versionshistorie

| Version | Änderungen |
|---|---|
| **1.0.5** | Behoben: Popup und Abschnitt „Funktionen (Expose)“ ließen sich nicht bedienen (Endlosschleife beim Neuzeichnen, Gerätebild flackerte). Offline-Anzeige gegen veraltete Meldungen abgesichert. Niederländisch ergänzt (Karte, Integration, README), LICENSE und `examples/` hinzugefügt. Dank an @pr0xyzer (PR #2): Zuordnung der HA-Entitäten über MQTT-Identifier mit mehr als zwei Werten (Liste beim Umbenennen). |
| 1.0.4 | Alle Expose-Funktionen im Geräte-Popup, mehrere Sticks (mehrere Instanzen), Korrektur bei den Geräteoptionen. |
| 1.0.3 | Erste offizielle Version. |

## Datei-Integrität

Jede `.py`-, `.js`- und `.yaml`-Datei trägt in der ersten Zeile einen SHA-256-Hash über den Inhalt ab Zeile 2. Prüfen: `tail -n +2 datei.py | sha256sum`. JSON-Dateien können keine Kommentare enthalten, ihre Hashes (SHA-256 über die komplette Datei) stehen hier:

| Datei | SHA-256 |
|---|---|
| `custom_components/zigbee2mqtt_manager/manifest.json` | `3796bdfe99c612311c6697342de3d3e8c1aa9827efc33059c1916c89172c52c7` |
| `custom_components/zigbee2mqtt_manager/strings.json` | `714ca6bdd304f051e93e8960410630c361f942eed7ddd89c81969fe13aff9c4d` |
| `custom_components/zigbee2mqtt_manager/icons.json` | `2e739f9952d7c56a3062cef2b0a70f58441fb1bb651ca58713cb77fac72f9762` |
| `custom_components/zigbee2mqtt_manager/translations/de.json` | `a4cc4400d01de88795a97c7644a9a4c89495c99d440eec4b9b476e7784a3c0b4` |
| `custom_components/zigbee2mqtt_manager/translations/en.json` | `9072d9f52b3f1be151b46c49dc22eb16df2cec81f295841a7c1ca1c2891e634a` |
| `custom_components/zigbee2mqtt_manager/translations/nl.json` | `20ec6ad0e627be9f5ba84d6fa2520550d64d5256ca97e4cfc51f6ed1149b9467` |
| `hacs.json` | `8939982e245783f7a41fb7f76e3da661b7250b5cec9385085ab68f19cea5cfda` |

## Lizenz

MIT
