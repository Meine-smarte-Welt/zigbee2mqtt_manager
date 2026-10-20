🇩🇪 Deutsch · [🇬🇧 English](README.en.md) · [🇳🇱 Nederlands](README.nl.md) · [🇫🇷 Français](README.fr.md) · [🇪🇸 Español](README.es.md)

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
- [Notification Center (optional)](#notification-center-optional)
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
| **Geräte** | Liste mit Erreichbarkeit, Modell, Signal, Batterie, „zuletzt gesehen“; Statistik-Chips als Filter (Offline / Batterie niedrig / Updates); Suche; Sortierung; **Gruppieren** nach Hersteller oder Geräteklasse; **Filter** (Status, Strom, Signal, …) |
| **Batterie** | Batteriegeräte, niedrigster Stand zuerst; Farben nach niedriger und kritischer Schwelle |
| **Updates** | Installierte vs. verfügbare Firmware; „Alle prüfen“ und „Alle nacheinander installieren“ als Hintergrundauftrag mit Fortschritt und Abbruch |
| **Gruppen** | Anlegen, umbenennen, löschen; Mitglieder hinzufügen und entfernen |
| **Bindings** | Übersicht aller Geräte-Verknüpfungen; Lösen; Neu verknüpfen im Geräte-Popup |
| **Bridge** (Zahnrad) | **App-Version** (Integration und Karte, mit farbigem Hinweis bei einer neuen Version), Status, Koordinator, Pairing, Bridge-Optionen, Neustart, Ereignisprotokoll, **Notification Center** |

**Geräte-Popup** (Tipp auf eine Zeile) mit Akkordeon-Abschnitten: Informationen · **Funktionen (Expose)** · **Entitäten (für Automationen)** · Umbenennen (mit Liste der betroffenen HA-Entitäten) · Geräteoptionen (Formular aus dem Z2M-Optionsschema) · Firmware · Bindings · Gruppen · Entfernen.

Der Abschnitt **Funktionen (Expose)** zeigt alle Funktionen, die Zigbee2MQTT für das Gerät bereitstellt (z. B. Schalter, Helligkeit, Farbe, Temperatur, Linkqualität): mit Namen, Eigenschaft, **aktuellem Wert** samt Einheit, Zugriff (Lesen / Schreiben / Abfragen), Wertebereich bzw. Auswahlwerten, Beschreibung und Kennzeichnung als Konfiguration oder Diagnose. Zusammengesetzte Funktionen (z. B. Farbe x/y) und Gruppen wie Licht oder Schalter werden aufgelöst und gruppiert; ab neun Funktionen gibt es ein Filterfeld. Solange der Abschnitt offen ist, aktualisieren sich die Werte, sobald das Gerät etwas sendet (höchstens alle 3 Sekunden). **Schreibbare Schalter** (Ja/Nein-Funktionen, z. B. der Status einer Steckdose oder eines Lichts) lassen sich direkt umlegen: Der neue Wert wird sofort angezeigt und kurz danach vom Gerät bestätigt. Ist der Wert noch unbekannt, erscheinen stattdessen die Knöpfe „An“ und „Aus“. Alle anderen Funktionen werden nur angezeigt; steuern lässt sich das Gerät dafür wie bisher über seine Home-Assistant-Entitäten. Mit `read_only: true` entfallen die Schalter.

**Gruppieren und Filtern** (Geräte, Batterie und Updates): Die Auswahl **Gruppieren** fasst die Liste als Akkordeon nach **Hersteller** oder **Geräteklasse** zusammen (Lampen, Steckdosen & Schalter, Heizung & Klima, Rollos & Jalousien, Schlösser, Lüfter, Taster & Fernbedienungen, Sensoren, Sonstige). Jede Gruppe zeigt die Anzahl und, falls vorhanden, die Offline-Geräte; die zwei Symbole neben der Auswahl klappen alle Gruppen auf oder zu. Der einklappbare Bereich **Filter** grenzt die Liste ein: Status (online / offline), Stromversorgung (nur Batterie / nur Netzbetrieb / Batterie niedrig), Signal (gut / mittel / schwach), Netzwerk-Rolle (Router / Endgerät), Firmware (Update verfügbar), zuletzt gesehen (vor mehr als 24 Stunden / 7 Tagen), in keiner Zigbee-Gruppe, Hersteller und Geräteklasse. Mehrere Filter gelten gleichzeitig; aktive Filter erscheinen als kleine Chips, die sich mit einem Tipp entfernen lassen. Die Geräteklasse leitet die Integration aus den Funktionen des Geräts ab (Zigbee2MQTT liefert keine feste Klasse); Geräte ohne bekannte Funktionen landen unter „Sonstige“. Ohne aktive Z2M-Verfügbarkeit wird „online/offline“ wie beim Statuspunkt aus „zuletzt gesehen“ abgeleitet. Bei aktiver Gruppierung gilt `max_rows` nicht.

**Entitäten kopieren:** Der Popup-Abschnitt **Entitäten (für Automationen)** listet die Home-Assistant-Entitäten des Geräts mit einem Kopieren-Symbol je Zeile. Das Kopieren-Symbol in der Popup-Kopfzeile schreibt alle Entitäts-Namen (einer pro Zeile) in die Zwischenablage, zum Beispiel zum Einfügen in Automationen und Skripte. Erlaubt der Browser die Zwischenablage nicht (sie braucht HTTPS), erscheint der Text markiert in einem Feld zum Kopieren mit Strg+C.

Weitere Punkte:

- **Zwischenspeicher:** Batterie, Signal, OTA-Status und „zuletzt gesehen“ überleben einen Home-Assistant-Neustart (Z2M sendet Gerätezustände nicht retained).
- **Gruppen sind keine Geräte mehr:** Gruppen-Topics tauchen nicht als Phantomgerät in der Liste auf.
- **Zwei-Klick-Bestätigung** statt Browser-Dialog bei riskanten Aktionen (Entfernen, Update, Neustart, Lösen, Löschen).
- **Nur lesen:** `read_only: true` blendet alle Bedienelemente zum Ändern aus (Wandtablets).
- **Zoom:** `zoom` skaliert die ganze Karte.
- **Sprachen:** Deutsch, Englisch, Niederländisch, Französisch und Spanisch (nach Home-Assistant-Sprache).
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

Vorabversionen (z. B. `1.1.1b1`) zeigt HACS nur mit der Option „Beta-Versionen anzeigen“.

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
show_group_by: true           # Auswahl „Gruppieren“
default_group_by: none        # none | vendor | class
show_filters: true            # Filter-Bereich
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

**Vorabversionen:** `releases/latest` von GitHub liefert nie Vorabversionen. Nutzt du selbst eine Vorabversion (`b`/`rc`), prüft die Integration deshalb zusätzlich die Liste der letzten Releases und weist dich auf die nächste Beta hin (`1.1.1b1` < `1.1.1rc1` < `1.1.1`). Mit einer fertigen Version werden keine Vorabversionen angezeigt.

Weichen Karten- und Integrationsversion voneinander ab (veralteter Browser-Cache), wird auch das orange markiert.

## Notification Center (optional)

**Neu in 1.1.1b1 (Vorabversion).** Ist die Integration **Notification Center** installiert, kann der Zigbee2MQTT Manager seine Meldungen dorthin senden. Das Notification Center sammelt die Meldungen aller verbundenen Integrationen und verteilt sie weiter (Push, Sprache usw.). Ohne Notification Center ändert sich nichts: Der Manager läuft wie bisher, es wird nichts gesendet, die Schalter bleiben wirkungslos.

Die Anbindung folgt der gemeinsamen Schnittstelle (Schema 1) über den Home-Assistant-Ereignisbus. Der Manager meldet sich beim Start und auf Nachfrage selbst an und gleicht seinen Ausgangszustand ab. Sie ist standardmäßig **eingeschaltet** und lässt sich an zwei Stellen steuern:

- **Karte:** Bridge (Zahnrad) → Abschnitt **Notification Center** mit Hauptschalter und einem Schalter je Meldungsart (nur Administratoren, nicht im Nur-lesen-Modus). Die Änderung gilt sofort, ohne die Integration neu zu laden.
- **Konfigurieren** der Integration: „Meldungen ans Notification Center senden“ und die Auswahl der Meldungsarten.

| Meldungsart | Dringlichkeit | Wann |
|---|---|---|
| Bridge offline | kritisch | Zigbee2MQTT meldet die Bridge als offline; wird geschlossen, sobald sie wieder online ist |
| Batterie kritisch | kritisch | Batteriestand unter der Schwelle „Batterie kritisch“ |
| Gerät offline | Warnung | Zigbee2MQTT meldet das Gerät als offline |
| Batterie niedrig | Warnung | Batteriestand unter der Schwelle „Batterie niedrig“, aber nicht unter „kritisch“ |
| Firmware-Update verfügbar | Info | Für das Gerät steht ein Firmware-Update bereit |
| Neues Gerät | Info | Ein Gerät ist dem Netz beigetreten (einmalig) |
| Gerät hat das Netz verlassen | Info | Ein Gerät hat das Netz verlassen (einmalig) |

Es gelten die vorhandenen Schwellen aus den Integrations-Optionen; neue Schwellen gibt es nicht. Ein Gerät unter der kritischen Schwelle erscheint nur als „Batterie kritisch“, nicht zusätzlich als „niedrig“. Eine Meldung entsteht je Wechsel genau einmal; fällt der Zustand weg (Gerät wieder online, Batterie getauscht), wird die Meldung automatisch geschlossen. Nach dem Start wartet der Manager etwa 20 Sekunden nach der Geräteliste, bevor er den Ausgangszustand meldet; dieser geht als „initial“ an das Notification Center und löst keine Flut von Push-Meldungen aus. Die Texte liegen in Deutsch, Englisch, Niederländisch, Französisch und Spanisch vor.

Datenschutz: Die Meldungen enthalten Gerätenamen und Batteriestand und bleiben innerhalb von Home Assistant. In der Diagnose und in den Logs stehen nur Zähler je Meldungsart, keine Inhalte.

## Einstellungen der Integration

Unter **Konfigurieren** (mit Anzeige der installierten Version): Schwelle „Batterie niedrig“, Schwelle „Batterie kritisch“ (muss kleiner oder gleich sein) Ereignisse an/aus, Meldungen ans Notification Center an/aus und die Auswahl der Meldungsarten. Über **Neu konfigurieren** lässt sich das Base-Topic ändern.

## Sicherheit

Alle schreibenden Aktionen (Umbenennen, Optionen, Schalten von Funktionen, Entfernen, Firmware, Gruppen, Bindings, Pairing, Neustart, Versionsprüfung, Einstellungen des Notification Centers) und das Laden der Geräte-Details sind per WebSocket auf **Administratoren** beschränkt. Eingaben werden vom Backend geprüft (doppelte Namen, unbekannte Optionen, erlaubte Bridge-Werte). Beim Schalten einer Funktion prüft das Backend zusätzlich, dass sie existiert, schreibbar ist und der Wert genau ihr Ein- oder Aus-Wert ist. Die Karte maskiert alle Texte; Farbwerte laufen durch eine Allowlist.

## Bekannte Einschränkungen

- **Z2M-Payloads ungeprüft:** `device/options`, die Bindings-Struktur in `bridge/devices` und die Bridge-Optionen (`log_level`, `last_seen`). Weicht deine Z2M-Version ab, bleibt die betroffene Funktion wirkungslos oder meldet einen Fehler.
- Geräteoptionen unterstützen einfache Typen (Zahl, Schalter, Auswahl, Text), keine verschachtelten Optionen.
- Die Entitäten-Vorschau beim Umbenennen findet Geräte über die MQTT-Identifier und kann bei ungewöhnlicher Discovery-Konfiguration leer bleiben.
- „Alle installieren“ wartet pro Gerät bis zu zwei Stunden auf das Ende des Updates.
- Batterie, Signal und OTA-Status erscheinen nach einem Neustart zunächst aus dem Zwischenspeicher und werden mit der nächsten Gerätenachricht aktualisiert.
- **Offline-Anzeige (seit 1.0.5) und Teststand:** Die Karte übernimmt die Verfügbarkeit von Zigbee2MQTT. Hat ein Gerät nach einer Offline-Meldung live gesendet, zeigt die Karte es als erreichbar. Das wurde gegen simulierte Daten geprüft, **nicht an echter Hardware**. Ob damit die in 1.0.4 gemeldeten falschen Offline-Anzeigen (Sensoren, Steckdose) verschwinden, ist offen: Rückmeldung ausdrücklich erwünscht.
- Das Popup und der Abschnitt „Funktionen (Expose)“ wurden in 1.0.5 korrigiert (Endlosschleife beim Neuzeichnen), aber ebenfalls nicht an echter Hardware und nicht in der iOS-/Android-Companion-App geprüft.
- **Neu in 1.1.0, Teststand:** Gruppieren, Filter, Schalter in den Funktionen und das Kopieren wurden mit simulierten Daten und in einem Headless-Browser geprüft, **nicht an echter Hardware** und nicht in der iOS-/Android-Companion-App. Ob Zigbee2MQTT jeden Schalter wie erwartet annimmt (z. B. bei Geräten mit mehreren Endpunkten), ist offen.
- Die Geräteklasse ist eine Näherung aus den Funktionen des Geräts; Sonderfälle können unter „Sonstige“ oder „Sensoren“ landen.
- Schalter wirken sofort und ohne Rückfrage (auch Konfigurationsschalter wie die Kindersicherung). Die Zwischenablage braucht HTTPS.
- **Neu in 1.1.1b2, Teststand:** Die Korrekturen zu Flackern, Scroll-Sprung und Tastaturkürzeln wurden in einem simulierten Browser (jsdom) geprüft, **nicht in Safari, Chrome, Firefox oder der Companion-App und nicht mit 75 echten Geräten**. Anzeigewerte wie „zuletzt gesehen“ und Signal aktualisieren sich dadurch höchstens alle 2 Sekunden.
- **Neu in 1.1.1b1, Teststand:** Die Anbindung an das Notification Center wurde mit simulierten Ereignissen und Daten geprüft, **nicht gegen ein echtes Notification Center und nicht an echter Hardware**. Startet die Bridge neu, können Geräte je nach Verfügbarkeits-Einstellung von Zigbee2MQTT kurz als offline gemeldet und danach wieder geschlossen werden. Vorabversionen zeigt HACS nur mit der Option „Beta-Versionen anzeigen“.

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
- **Kopieren funktioniert nicht:** Der Browser erlaubt die Zwischenablage nur über HTTPS (oder `localhost`). Sonst erscheint der Text markiert in einem Feld im Popup: mit Strg+C kopieren.
- **Ein Schalter in den Funktionen bewirkt nichts:** Der Befehl geht an `<base_topic>/<Gerät>/set`. Prüfe in Zigbee2MQTT, ob das Gerät erreichbar ist; die Karte zeigt den Wert, den das Gerät zurückmeldet.
- **Nichts kommt im Notification Center an:** Ist die Integration Notification Center installiert und geladen? Sind Hauptschalter und die Meldungsart eingeschaltet (Karte: Bridge → Notification Center)? Nach dem Start wartet der Manager etwa 20 Sekunden, bevor er den Ausgangszustand sendet.
- Logs: `custom_components.zigbee2mqtt_manager` auf `debug` stellen.

## Versionshistorie

| Version | Änderungen |
|---|---|
| **1.1.1b2** (Vorabversion) | Behoben (Issue #5): Die Karte **flackerte und sprang beim Scrollen nach oben**, weil sie bei jedem Datenupdate komplett neu gezeichnet wurde (Bilder luden neu, die Seite wurde kurz niedriger). Jetzt werden nur geänderte Teile aktualisiert: Bilder, Zeilen, Akkordeons und Eingabefokus bleiben stehen, bei unverändertem Inhalt wird gar nicht gezeichnet, datengetriebenes Neuzeichnen höchstens alle 2 Sekunden. Behoben: Beim **Tippen in Suche und Feldern am Desktop** lösten Home-Assistant-Kurzbefehle aus (z. B. öffnete „e“ die Entitätssuche); Tastenereignisse aus Eingabefeldern erreichen Home Assistant nicht mehr. |
| **1.1.1b1** (Vorabversion) | Neu: **Anbindung an das Notification Center** (optional, Schnittstelle Schema 1) mit sieben Meldungsarten (Bridge offline, Batterie kritisch, Gerät offline, Batterie niedrig, Firmware-Update, neues Gerät, Gerät hat das Netz verlassen), Hauptschalter und Schalter je Art in der Karte und im Konfigurieren-Dialog. Die Update-Prüfung erkennt **Vorabversionen** (`1.1.1b1` < `1.1.1rc1` < `1.1.1`): Wer eine Beta nutzt, erfährt von der nächsten Beta; wer eine fertige Version nutzt, sieht keine Vorabversionen. **Französisch und Spanisch** ergänzt (Karte, Integration, README). Änderungen an den Notification-Center-Schaltern laden die Integration nicht mehr neu. Behoben: englische Reste in den deutschen Texten (`strings.json`). |
| **1.1.0** | Neu: Listen nach Hersteller oder Geräteklasse **gruppieren** (Akkordeon) und **filtern** (Status online/offline, Stromversorgung, Signal, Netzwerk-Rolle, Firmware, zuletzt gesehen, ohne Zigbee-Gruppe, Hersteller, Geräteklasse; aktive Filter als Chips). Schreibbare **Schalter** unter „Funktionen (Expose)“ lassen sich direkt umlegen. Neuer Popup-Abschnitt **Entitäten (für Automationen)** und Kopieren-Knöpfe für die Entitäts-Namen. Editor: `show_group_by`, `default_group_by`, `show_filters`. Backend: neue Aktion `set_expose` (nur Administratoren, Werte werden geprüft) und Geräteklasse je Gerät. |
| 1.0.5 | Behoben: Popup und Abschnitt „Funktionen (Expose)“ ließen sich nicht bedienen (Endlosschleife beim Neuzeichnen, Gerätebild flackerte). Offline-Anzeige gegen veraltete Meldungen abgesichert. Niederländisch ergänzt (Karte, Integration, README), LICENSE und `examples/` hinzugefügt. Dank an @pr0xyzer (PR #2): Zuordnung der HA-Entitäten über MQTT-Identifier mit mehr als zwei Werten (Liste beim Umbenennen). |
| 1.0.4 | Alle Expose-Funktionen im Geräte-Popup, mehrere Sticks (mehrere Instanzen), Korrektur bei den Geräteoptionen. |
| 1.0.3 | Erste offizielle Version. |

## Datei-Integrität

Jede `.py`-, `.js`- und `.yaml`-Datei trägt in der ersten Zeile einen SHA-256-Hash über den Inhalt ab Zeile 2. Prüfen: `tail -n +2 datei.py | sha256sum`. JSON-Dateien können keine Kommentare enthalten, ihre Hashes (SHA-256 über die komplette Datei) stehen hier:

| Datei | SHA-256 |
|---|---|
| `custom_components/zigbee2mqtt_manager/manifest.json` | `030826f739709dc575398ab4142fb7bc81262b419fab3176d6f07e69db352617` |
| `custom_components/zigbee2mqtt_manager/strings.json` | `b95be5163fc86774997d79f2907b0041723ca96962760bdbeae9e3587eda29a3` |
| `custom_components/zigbee2mqtt_manager/icons.json` | `2e739f9952d7c56a3062cef2b0a70f58441fb1bb651ca58713cb77fac72f9762` |
| `custom_components/zigbee2mqtt_manager/translations/de.json` | `b95be5163fc86774997d79f2907b0041723ca96962760bdbeae9e3587eda29a3` |
| `custom_components/zigbee2mqtt_manager/translations/en.json` | `6c434b2e5ed8025cc766c7f3afff3fd775c0caf5defb76195c2db67f3a62ffef` |
| `custom_components/zigbee2mqtt_manager/translations/nl.json` | `e8ef9b7f09651b6bdd096855de98c6a439c36ab48830bc785c351dd2efb5f5d0` |
| `custom_components/zigbee2mqtt_manager/translations/fr.json` | `12ab5093a5780719fd93b05b7bd645e734e91ce49ca5b1e75d03817029f27226` |
| `custom_components/zigbee2mqtt_manager/translations/es.json` | `9f0e55a3edbaf1ac86d48750d5f0705b7bbdf57768b37f38bc682801bf1ca9a2` |
| `hacs.json` | `8939982e245783f7a41fb7f76e3da661b7250b5cec9385085ab68f19cea5cfda` |

## Lizenz

MIT
