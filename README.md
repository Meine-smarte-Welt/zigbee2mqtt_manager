| 🇩🇪<br>**Deutsch** | [🇬🇧<br>**English**](README.en.md) | [🇳🇱<br>**Nederlands**](README.nl.md) | [🇫🇷<br>**Français**](README.fr.md) | [🇪🇸<br>**Español**](README.es.md) | [🇷🇸<br>**Српски**](README.sr.md) |
|:-:|:-:|:-:|:-:|:-:|:-:|

![Zigbee2MQTT Manager – Banner](docs/images/zigbee2mqtt_manager.webp)

# Zigbee2MQTT Manager für Home Assistant

📖 **Ausführliche Anleitung mit Hintergründen:** [Zigbee2MQTT Manager für Home Assistant auf meinesmartewelt.de](https://meinesmartewelt.de/zigbee2mqtt-manager-home-assistant/)

Zigbee2MQTT verwalten, ohne Home Assistant zu verlassen: Geräte, Batterien, Firmware-Updates, Gruppen, Bindings und Bridge in einer Dashboard-Karte – als HACS-Integration. Aufbau und Design orientieren sich an der Karte von [FRITZ!Box Anrufe](https://github.com/Meine-smarte-Welt/fritzbox_anrufe): Symbol-Kategorien, Zeilenlisten, Detail-Popup, Akkordeon-Abschnitte, grafischer Editor und frei einstellbare Farben.

## Inhalt

- [Funktionsumfang](#funktionsumfang)
- [Neu in 1.3.0b2 (Beta)](#neu-in-130b2-beta)
- [Neu in 1.2.1](#neu-in-121)
- [Bilder](#bilder)
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

Die Karte hat sieben Kategorien in einer Symbolleiste (unter ca. 480 px Kartenbreite nur Symbole). Jede Kategorie ist einzeln ein- und ausblendbar.

| Kategorie | Was es kann |
|---|---|
| **Geräte** | Liste mit Erreichbarkeit, Modell, Signal, Batterie, „zuletzt gesehen“; Statistik-Chips als Filter (Offline / Batterie niedrig / Updates); Suche; Sortierung; **Gruppieren** nach Hersteller oder Geräteklasse; **Filter** (Status, Strom, Signal, …) |
| **Batterie** | Batteriegeräte, niedrigster Stand zuerst; Farben nach niedriger und kritischer Schwelle |
| **Updates** | Installierte vs. verfügbare Firmware; „Alle prüfen“ und „Alle nacheinander installieren“ als Hintergrundauftrag mit Fortschritt und Abbruch |
| **Gruppen** | Anlegen, umbenennen, löschen; Mitglieder hinzufügen und entfernen |
| **Bindings** | Übersicht aller Geräte-Verknüpfungen; Lösen; Neu verknüpfen im Geräte-Popup |
| **Netzwerk** | **Netzwerkkarte** aus den Nachbartabellen der Router: oben Coordinator, Router und Endgeräte als Wolken, darunter je Router ein Akkordeon mit seinen Verbindungen (seit 1.3.0b2); Knopf zur Zigbee2MQTT-Oberfläche |
| **Bridge** (Zahnrad) | **App- und Zigbee2MQTT-Version** (automatischer Update-Check, farbiger Release-Link und persistente HA-Benachrichtigung), Status, Koordinator, Pairing, Bridge-Optionen, Neustart, Ereignisprotokoll, **Notification Center** |

**Geräte-Popup** (Tipp auf eine Zeile) mit Akkordeon-Abschnitten: Informationen · **Funktionen (Expose)** · **Entitäten (für Automationen)** · Umbenennen (mit Liste der betroffenen HA-Entitäten) · Geräteoptionen (Formular aus dem Z2M-Optionsschema) · Firmware · Bindings · Gruppen · Entfernen.

Der Abschnitt **Funktionen (Expose)** zeigt alle Funktionen, die Zigbee2MQTT für das Gerät bereitstellt (z. B. Schalter, Helligkeit, Farbe, Temperatur, Linkqualität): mit Namen, Eigenschaft, **aktuellem Wert** samt Einheit, Zugriff (Lesen / Schreiben / Abfragen), Wertebereich bzw. Auswahlwerten, Beschreibung und Kennzeichnung als Konfiguration oder Diagnose. Zusammengesetzte Funktionen (z. B. Farbe x/y) und Gruppen wie Licht oder Schalter werden aufgelöst und gruppiert; ab neun Funktionen gibt es ein Filterfeld. Solange der Abschnitt offen ist, aktualisieren sich die Werte, sobald das Gerät etwas sendet (höchstens alle 3 Sekunden). **Schreibbare Schalter** (Ja/Nein-Funktionen, z. B. der Status einer Steckdose oder eines Lichts) lassen sich direkt umlegen: Der neue Wert wird sofort angezeigt und kurz danach vom Gerät bestätigt. Ist der Wert noch unbekannt, erscheinen stattdessen die Knöpfe „An“ und „Aus“. Alle anderen Funktionen werden nur angezeigt; steuern lässt sich das Gerät dafür wie bisher über seine Home-Assistant-Entitäten. Mit `read_only: true` entfallen die Schalter.

**Gruppieren und Filtern** (Geräte, Batterie und Updates): Die Auswahl **Gruppieren** fasst die Liste als Akkordeon nach **Hersteller** oder **Geräteklasse** zusammen (Lampen, Steckdosen & Schalter, Heizung & Klima, Rollos & Jalousien, Schlösser, Lüfter, Taster & Fernbedienungen, Sensoren, Sonstige). Jede Gruppe zeigt die Anzahl und, falls vorhanden, die Offline-Geräte; die zwei Symbole neben der Auswahl klappen alle Gruppen auf oder zu. Der einklappbare Bereich **Filter** grenzt die Liste ein: Status (online / offline), Stromversorgung (nur Batterie / nur Netzbetrieb / Batterie niedrig), Signal (gut / mittel / schwach), Netzwerk-Rolle (Router / Endgerät), Firmware (Update verfügbar), zuletzt gesehen (vor mehr als 24 Stunden / 7 Tagen), in keiner Zigbee-Gruppe, Hersteller und Geräteklasse. Mehrere Filter gelten gleichzeitig; aktive Filter erscheinen als kleine Chips, die sich mit einem Tipp entfernen lassen. Die Geräteklasse leitet die Integration aus den Funktionen des Geräts ab (Zigbee2MQTT liefert keine feste Klasse); Geräte ohne bekannte Funktionen landen unter „Sonstige“. Ohne aktive Z2M-Verfügbarkeit wird „online/offline“ wie beim Statuspunkt aus „zuletzt gesehen“ abgeleitet. Bei aktiver Gruppierung gilt `max_rows` nicht.

**Raum, HA-Gerät und Kommentar (seit 1.2.0):** Die Geräteliste zeigt hinter dem Modell den **Raum** aus Home Assistant (über das zugehörige MQTT-Gerät ermittelt; Option `show_area`). Im Popup stehen zusätzlich der Name des **Home-Assistant-Geräts** und, falls in Zigbee2MQTT hinterlegt, der **Kommentar** des Geräts (Z2M-Einstellung `description`). Mit `show_comment: true` erscheint der Kommentar als zweite Zeile in der Liste. Die Suche berücksichtigt Raum, HA-Gerät und Kommentar, und unter **Gruppieren** gibt es zusätzlich **Raum**. Ändern sich Raum oder Gerätename in Home Assistant, zieht die Karte nach. Der Kommentar lässt sich im Popup im Abschnitt **Kommentar** bearbeiten (Textfeld, höchstens 500 Zeichen; **Speichern** schreibt ihn über Zigbee2MQTT in die Geräteeinstellung `description`, ein leeres Feld entfernt ihn; nicht im Nur-lesen-Modus).

**Deaktivierte Geräte (seit 1.2.0, Issue #7):** In Zigbee2MQTT deaktivierte Geräte (`disabled: true`) gelten nicht mehr als offline. Sie zählen nicht bei „Offline“, in den Sensoren, im Störungs-Sensor und in den Meldungen ans Notification Center, sondern haben den eigenen Status „Deaktiviert“ (Abzeichen, Filter **Status → Deaktiviert**, Zähler `disabled`). Der Chip **Deaktiviert** (nur sichtbar, wenn es solche Geräte gibt) filtert die Liste, und der Sensor **Deaktivierte Geräte** zählt sie und führt die Namen als Attribut.

**Lange nichts gehört (seit 1.2.0):** Meldet Zigbee2MQTT ein Gerät als online, es sendet aber seit mehr als N Stunden nichts mehr (Standard 24, unter **Konfigurieren** einstellbar, 0 = aus), bekommt es das orange Abzeichen „lange still“, einen orangen Statuspunkt und die Zeit seit der letzten Nachricht in Orange. Dazu gibt es den Chip **Lange still** (nur sichtbar, wenn es solche Geräte gibt) und den Filter **Status → Lange nichts gehört**. Die Zeit seit der letzten Nachricht („vor 5 Sekunden“, „vor 3 Minuten“) steht in jeder Zeile; mit der Sortierung **Zuletzt gesehen (alt zuerst)** stehen die stillsten Geräte oben. Voraussetzung ist `advanced.last_seen: ISO_8601` in Zigbee2MQTT. Die Anzeige ist informativ; den Störungs-Sensor löst sie nur aus, wenn du das einschaltest.

**Entitäten kopieren:** Der Popup-Abschnitt **Entitäten (für Automationen)** listet die Home-Assistant-Entitäten des Geräts mit einem Kopieren-Symbol je Zeile. Das Kopieren-Symbol in der Popup-Kopfzeile schreibt alle Entitäts-Namen (einer pro Zeile) in die Zwischenablage, zum Beispiel zum Einfügen in Automationen und Skripte. Erlaubt der Browser die Zwischenablage nicht (sie braucht HTTPS), erscheint der Text markiert in einem Feld zum Kopieren mit Strg+C.

Weitere Punkte:

- **Zwischenspeicher:** Batterie, Signal, OTA-Status und „zuletzt gesehen“ überleben einen Home-Assistant-Neustart (Z2M sendet Gerätezustände nicht retained).
- **Gruppen sind keine Geräte mehr:** Gruppen-Topics tauchen nicht als Phantomgerät in der Liste auf.
- **Zwei-Klick-Bestätigung** statt Browser-Dialog bei riskanten Aktionen (Entfernen, Update, Neustart, Lösen, Löschen).
- **Nur lesen:** `read_only: true` blendet alle Bedienelemente zum Ändern aus (Wandtablets).
- **Zoom:** `zoom` skaliert die ganze Karte.
- **Sprachen:** Deutsch, Englisch, Niederländisch, Französisch und Spanisch (nach Home-Assistant-Sprache).
- **Diagnose-Download** mit anonymisierten Namen und IEEE-Adressen.

## Neu in 1.3.0b2 (Beta)

> **Beta-Version:** Sie ist in GitHub als *Pre-release* markiert. In HACS erscheint sie nur, wenn du bei der Integration **Beta-Versionen anzeigen** einschaltest. Alles hier Beschriebene ist gegen simulierte Daten geprüft, **nicht an echter Hardware** (Details unter [Bekannte Einschränkungen](#bekannte-einschränkungen)).

- **Netzwerkkarte in der Karte (Kategorie Netzwerk):** Oben steht die Zeichnung nach dem Vorbild von [FRITZ!Box Netzwerk](https://github.com/Meine-smarte-Welt/fritzbox_netzwerk): links der **Coordinator**, nach rechts die **Router** (eine Spalte je Sprung), daran je Router eine gestrichelte **Wolke** mit der Zahl seiner Endgeräte. Die Zahl an der Linie ist die Verbindungsqualität (LQI). Ein Tipp auf einen Router öffnet das Geräte-Popup, ein Tipp auf eine Wolke klappt das passende Akkordeon auf. Darunter gibt es **je Coordinator und Router ein Akkordeon** mit **Verbindungen zu Routern** (Name, Beziehung Elternknoten / Kind / Nachbar, Signal) und **Endgeräten** (Name, Signal); Endgeräte ohne bekannte Verbindung stehen in einem eigenen Akkordeon. Der Knopf **Netz neu einlesen** (Zwei-Klick-Bestätigung, nur Administratoren, nicht im Nur-lesen-Modus) fragt bei Zigbee2MQTT die Netzwerkkarte ab. Zigbee2MQTT liest dafür **jedes Gerät einzeln** aus; das dauert je nach Netz mehrere Minuten und belastet das Zigbee-Netz (nach 10 Minuten bricht die Integration ab). Das Ergebnis wird gespeichert und übersteht Neustarts; „Stand: vor …“ zeigt das Alter. Der Knopf **Zigbee2MQTT-Oberfläche öffnen** bleibt (Adresse wie bei 1.2.1). *Ungeprüft an echter Hardware:* Aufbau und Dauer der Antwort von Zigbee2MQTT. **Wichtig zur Genauigkeit:** Zigbee2MQTT liefert Nachbartabellen, keine festen Routen. Die Karte hängt jeden Router an den Weg zum Coordinator mit den geringsten Kosten (starke Verbindungen, wenige Sprünge) und jedes Endgerät an den Router, der es als Kind führt (sonst an die beste Verbindung). Das ist eine **Näherung**; die echten Routen können abweichen. Die Zeichnung wird in Originalgröße angezeigt und scrollt in schmalen Karten waagerecht (ab 1.3.0b2 größere Kacheln und Schrift). Router ohne bekannten Weg erscheinen orange gestrichelt unter dem Coordinator.
- **Offline-Status ignorieren (Issue #15):** Im Geräte-Popup gibt es den Abschnitt **Überwachung** mit dem Schalter **Offline-Status ignorieren** (nur Administratoren). Ein so markiertes Gerät zählt nicht als offline: keine Störung, kein Ereignis, keine Meldung ans Notification Center, kein Eintrag bei „Offline“. Es hat den Status **Offline, wird ignoriert** (Abzeichen und Filter **Status → Offline ignoriert**). Gedacht für z. B. Lampen hinter einem Wandschalter. Die Auswahl gilt je Gerät und übersteht Neustarts; ob das Gerät erreichbar ist, siehst du weiterhin im Popup.
- **Kommentar standardmäßig sichtbar (Issue #16):** `show_comment` ist jetzt standardmäßig `true`. Wer ihn bewusst ausgeschaltet hatte, behält `false`; neue und bisher nicht gesetzte Karten zeigen den Kommentar als zweite Zeile.
- **Editor ohne Schieberegler (Issue #17):** `max_rows` und `zoom` lassen sich im grafischen Editor als **Eingabefeld** eintragen statt per Schieberegler. *Hinweis:* Der Teil des Issues zum *Matter Manager* ist ein anderes Projekt und wurde hier nicht geändert.
- **Externer MQTT-Broker (Issue #14, experimentell):** Bei der Einrichtung und unter **Neu konfigurieren** gibt es optional Adresse, Port, Benutzername, Passwort und TLS eines **eigenen MQTT-Brokers**. Ist die Adresse leer (Standard), nutzt die Integration wie bisher die MQTT-Integration von Home Assistant. Mit Adresse verbindet sie sich selbst (paho-mqtt) mit diesem Broker, etwa für Zigbee2MQTT an einem zweiten Standort im VPN; die Einrichtung testet die Verbindung. Ohne die MQTT-Integration von Home Assistant für diesen Broker kennt Home Assistant diese Geräte nicht: **Raum, HA-Gerät und die Entitäten-Liste bleiben leer**, nur die Zigbee2MQTT-Daten erscheinen. Pro Broker und Base-Topic ist nur ein Eintrag möglich. Das Passwort steht im Konfigurationseintrag von Home Assistant (nicht im Diagnose-Download). *Ungeprüft* gegen einen echten externen Broker.
- **Zigbee2MQTT-Update-Prüfung (Dank an @seebaer1976, PR #18):** Die Integration prüft beim Start und alle 12 Stunden bei GitHub (Koenkk/zigbee2mqtt), ob es eine neuere Zigbee2MQTT-Version gibt. Unter **Bridge → Status** steht hinter der Z2M-Version grün **Aktuell** oder orange **Update verfügbar: {Version}** mit Link zu den Release-Notizen; **Jetzt prüfen** startet die Abfrage sofort (nicht im Nur-lesen-Modus). Gibt es ein Update, erscheint zusätzlich eine persistente Home-Assistant-Benachrichtigung je Instanz, die nach einem Abgleich ohne Update wieder verschwindet. Zigbee2MQTT wird nicht automatisch installiert, du aktualisierst manuell auf dem Z2M-Server bzw. im Docker-Container. Ist GitHub nicht erreichbar, steht „Prüfung nicht möglich“. Texte in allen Sprachen ergänzt. *Ungeprüft:* die Abfrage gegen GitHub und die Benachrichtigung in einer echten Home-Assistant-Installation.
- **Schon in 1.2.2 behoben:** Die Issues #12 und #13 wurden mit 1.2.2 erledigt (siehe Versionshistorie).

## Neu in 1.2.1

- **Netzwerk aus der Hauptansicht:** Die Karte hat die eigene Kategorie **Netzwerk** (Symbol in der Leiste, abschaltbar mit `show_network`); ohne bekannte Adresse erklärt sie, wie du sie einträgst. In der Geräteliste und unter **Bridge → Status** gibt es den Knopf **Netzwerk**. Er öffnet die Zigbee2MQTT-Netzwerkkarte. Die Adresse kommt aus (1) dem Kartenschlüssel `network_url`, (2) der Integrations-Option **Adresse der Netzwerkkarte**, (3) der Z2M-Einstellung `frontend.url` (angehängt wird `/#/network`) oder (4) der Zigbee2MQTT-App in der Seitenleiste (Add-on mit Ingress). Findet sich keine Adresse, erscheint der Knopf nicht. Mit `show_network_link: false` blendest du ihn aus. *Ungeprüft:* ob der Pfad `/#/network` bei jeder Z2M-Version stimmt und ob die Erkennung der Add-on-Seitenleiste bei jeder Installation greift – trage sonst `network_url` ein (z. B. `/a0d7b954_zigbee2mqtt`).
- **Links zur Entität und zum Gerät:** Im Popup öffnet ein Tipp auf einen Entitäts-Namen (Abschnitt **Entitäten**) direkt den Dialog dieser Entität in Home Assistant; das Kopieren-Symbol bleibt. **Gerät öffnen** (Symbol in der Popup-Kopfzeile und Knopf im Abschnitt) führt zur Geräteseite in Home Assistant mit allen Entitäten. Voraussetzung ist, dass Home Assistant das MQTT-Gerät kennt.
- **Name in der Seitenleiste:** Unter **Konfigurieren** lässt sich der **Name in der Seitenleiste** festlegen (Standard „Zigbee2MQTT Manager“, höchstens 40 Zeichen). Er gilt auch als Titel des Panels – damit ist das Panel von der Zigbee2MQTT-App unterscheidbar. Das Symbol bleibt gleich. Die Änderung wirkt sofort, ohne Neustart.
- **Fehlende Geräte (Issue-Wunsch „Geräte verschwinden aus der Liste“):** Die Integration merkt sich jedes Gerät, das Zigbee2MQTT je gemeldet hat (Name, Hersteller, Modell, Bild, letzte Werte; überlebt Neustarts). Verschwindet ein Gerät aus der Z2M-Geräteliste, bleibt es **ausgegraut** mit dem Abzeichen **fehlt** sichtbar. Dazu gibt es den Chip **Fehlt**, den Filter **Status → Fehlt in Zigbee2MQTT**, den Sensor **Fehlende Geräte** (Namen als Attribut), das Ereignis `zigbee2mqtt_manager_device_missing`, einen Eintrag im Ereignisprotokoll und – falls aktiviert – die Meldungsart `device_missing` im Notification Center. Kommt das Gerät zurück, verschwindet die Markierung von selbst. **Vergessen** (im Popup bzw. **Alle fehlenden vergessen** im Filter „Fehlt“) entfernt es dauerhaft aus der Merkliste, nur für Administratoren. Nicht als fehlend zählen: Geräte, die du selbst über die Karte entfernst oder die Zigbee2MQTT als ausgetreten meldet (10 Minuten Schonfrist), und eine leere Geräteliste (z. B. beim Start der Bridge). Fehlende Geräte zählen nicht bei „Geräte“ und lösen keine Störung aus.
- **innr-Steckdosen ohne Bild (Behoben):** Bei Modellen mit Leerzeichen im Namen (z. B. `SP 120`) fehlte das Bild, weil die Karte die Adresse anders bildete als das Z2M-Frontend. Sie ersetzt jetzt wie Z2M `:`, Leerzeichen und `/` durch `-` und nutzt zusätzlich ein von Zigbee2MQTT gemeldetes Bild (`definition.icon`). *Ungeprüft* an den betroffenen Steckdosen; gibt es für ein Modell auf zigbee2mqtt.io kein Bild, bleibt das Symbol.
- **Base-Topic:** Die Option zeigt jetzt das aktuell verwendete Base-Topic im Beschreibungstext. Warum bei einem Update das Standard-Topic `zigbee2mqtt` gelten konnte, ließ sich im Code nicht nachvollziehen; die Integration ändert das Base-Topic nicht selbst. Prüfe es unter **Konfigurieren**, wenn nach einem Update keine Geräte erscheinen.
- **Sprachen:** Neu ist **Српски (Kyrillisch)** – README und Karte. Die Karte hat die wichtigsten Begriffe auf Serbisch übersetzt, übrige Texte erscheinen auf Englisch.

## Bilder

Die Screenshots zeigen den Stand 1.1.0; die Neuerungen aus 1.2.x (Netzwerk-Knopf, Links, fehlende Geräte) sind darauf noch nicht zu sehen.

![Geräteliste in der Karte](docs/images/zigbee2mqtt_manager_karte.webp)

![Funktionen (Expose) im Geräte-Popup](docs/images/zigbee2mqtt_manager_expose.webp)

![Gruppieren und Filtern](docs/images/zigbee2mqtt_manager_gruppierung.webp)

![Grafischer Karten-Editor](docs/images/zigbee2mqtt_manager_ui.webp)

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

**Schnellzugriff (seit 1.2.0):** [Repository in HACS hinzufügen](https://my.home-assistant.io/redirect/hacs_repository/?owner=Meine-smarte-Welt&repository=zigbee2mqtt_manager&category=integration) · [Integration einrichten](https://my.home-assistant.io/redirect/config_flow_start/?domain=zigbee2mqtt_manager). Nach der Einrichtung erscheint in Home Assistant einmalig ein Hinweis, und die Integration legt in der Seitenleiste den Eintrag **Zigbee2MQTT** an (Home-Assistant-Panel, nur für Administratoren), der die Karte als ganze Seite zeigt – ohne dass du ein Dashboard bauen musst. Abschaltbar unter **Konfigurieren → Eintrag in der Seitenleiste**. Ein echtes Lovelace-Dashboard kann eine Integration nicht selbst anlegen (Home Assistant bietet dafür keine öffentliche Schnittstelle); eine fertige Vorlage liegt in `examples/dashboard-zigbee.yaml`.

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
| `color_info` | Update verfügbar (Firmware, neue App- oder Zigbee2MQTT-Version) |
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
| `zigbee2mqtt_manager_device_missing` | `name`, `ieee` – ein bekanntes Gerät fehlt in der Z2M-Geräteliste (seit 1.2.1) |

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

`Geräte`, `Offline-Geräte`, `Geräte mit niedriger Batterie`, `Geräte mit kritischer Batterie`, `Verfügbare Firmware-Updates`, `Deaktivierte Geräte` und `Gruppen`. Die Sensoren für Offline, Batterie, Updates und deaktivierte Geräte tragen die Geräteliste als Attribut. Dazu kommt seit 1.2.1 der Sensor `Fehlende Geräte` (Namen als Attribut).

### Sammelstörung (Binärsensor „Störung“, seit 1.2.0)

Ein Binärsensor (Geräteklasse `problem`) fasst das Netz in einem Zustand zusammen. Er ist **an**, sobald die Bridge offline ist, ein aktives Gerät offline ist, eine Batterie niedrig oder kritisch ist oder (abschaltbar) ein Firmware-Update ansteht bzw. (zuschaltbar) ein Gerät lange nichts gehört hat. Deaktivierte Geräte zählen nicht. Gedacht ist er für eine kleine Kachel auf der Leitseite, die rot wird und per Tipp zum Zigbee-Dashboard führt (`examples/kachel-leitseite.yaml`).

Attribute: `reasons` (Gründe: `bridge_offline`, `offline`, `battery_low`, `battery_critical`, `update_available`, `stale`), `bridge_online`, `devices`, `offline`, `low_battery`, `critical_battery`, `updates_available`, `stale`, `disabled`, `stale_hours` sowie die Namenslisten `offline_devices`, `low_battery_devices`, `critical_battery_devices`, `update_devices`, `stale_devices`, `disabled_devices`.

Unter **Konfigurieren** wählst du, ob Firmware-Updates (Standard: ja) und „lange nichts gehört“ (Standard: nein) die Störung auslösen. Die Entitäts-ID hängt von der Sprache ab (bei englischer Oberfläche z. B. `binary_sensor.zigbee2mqtt_manager_zigbee2mqtt_problem`); sie steht unter Einstellungen → Geräte & Dienste. Eine Automation mit Geräteliste liegt in `examples/sensor-stoerung-automation.yaml`. Die Zähler-Sensoren oben zählen ebenfalls ohne deaktivierte Geräte.

## Versionsanzeige und Update-Hinweis

Die App-Version steht in der Karte unter **Bridge → App-Version**, im Karten-Editor und im Dialog **Konfigurieren**. Beim Start und danach alle 12 Stunden prüft die Integration GitHub auf eine neuere App- und Zigbee2MQTT-Version. Unter **Bridge → Status** steht hinter der installierten Z2M-Version grün **Aktuell** oder orange **Update verfügbar: {Version}**. Der orange Hinweis führt direkt zu den Release-Notizen. Ein Update erzeugt zusätzlich eine persistente Home-Assistant-Benachrichtigung je Instanz, die nach einem erfolgreichen Abgleich ohne Update wieder entfernt wird. **Jetzt prüfen** startet die Abfrage sofort. Zigbee2MQTT aktualisierst du manuell auf dem Z2M-Server bzw. im Docker-Container, nicht über HACS. Ist GitHub nicht erreichbar, erscheint „Prüfung nicht möglich“; die Karte funktioniert weiter.

Weichen Karten- und Integrationsversion voneinander ab (veralteter Browser-Cache), wird auch das orange markiert.

## Notification Center (optional)

**Neu in 1.2.0.** Ist die Integration **Notification Center** installiert, kann der Zigbee2MQTT Manager seine Meldungen dorthin senden. Das Notification Center sammelt die Meldungen aller verbundenen Integrationen und verteilt sie weiter (Push, Sprache usw.). Ohne Notification Center ändert sich nichts: Der Manager läuft wie bisher, es wird nichts gesendet, die Schalter bleiben wirkungslos.

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

Unter **Konfigurieren** (mit Anzeige der installierten Version): Schwelle „Batterie niedrig“, Schwelle „Batterie kritisch“ (muss kleiner oder gleich sein) Ereignisse an/aus, Meldungen ans Notification Center an/aus und die Auswahl der Meldungsarten. Über **Neu konfigurieren** lässt sich das Base-Topic ändern. Seit 1.2.0 zusätzlich: „Lange nichts gehört nach … Stunden“ (0 = aus), „Firmware-Updates lösen die Störung aus“ und „Lange nichts gehört löst die Störung aus“. Außerdem: „Eintrag in der Seitenleiste“ (Standard: an). Neu in 1.3.0b2: optional **Externer MQTT-Broker** (Adresse, Port, Benutzername, Passwort, TLS; experimentell).

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
- **Neu in 1.2.0, Teststand:** Die Anbindung an das Notification Center, Störungs-Sensor, Sensor „Deaktivierte Geräte“, Raum-/HA-Geräte-Zuordnung, Kommentar (Anzeige und Bearbeiten), deaktivierte Geräte samt Chip, „lange nichts gehört“ und der Seitenleisten-Eintrag wurden mit simulierten MQTT-Nachrichten und Registern (pytest mit der Home-Assistant-Testumgebung) und in einem simulierten Browser (jsdom) geprüft, **nicht an echter Hardware, nicht gegen ein echtes Notification Center, nicht in Safari, Chrome, Firefox oder der Companion-App und nicht mit 75 echten Geräten**. Das gilt auch für die Korrekturen zu Flackern und Scroll-Sprung (Issue #5); Anzeigewerte wie „zuletzt gesehen“ und Signal aktualisieren sich dadurch höchstens alle 2 Sekunden. Startet die Bridge neu, können Geräte je nach Verfügbarkeits-Einstellung von Zigbee2MQTT kurz als offline gemeldet und danach wieder geschlossen werden. Die Zuordnung zum HA-Gerät erkennt die IEEE-Adresse in den MQTT-Identifiern; bei ungewöhnlicher Discovery bleiben Raum und HA-Gerät leer. Der Kommentar stammt aus der Z2M-Gerätekonfiguration (`description`) und wird beim Speichern über `bridge/request/device/options` gesetzt; ob deine Z2M-Version ihn in `bridge/info` mitliefert und das Speichern wie erwartet annimmt, ist ungeprüft. „Lange nichts gehört“ ist informativ und kein eigener Meldungstyp im Notification Center. Der Seitenleisten-Eintrag ist ein Home-Assistant-Panel und kein Lovelace-Dashboard (Issue #6); er wurde nur gegen die Panel-Registrierung der Testumgebung geprüft, nicht in einer echten Seitenleiste.
- **Neu in 1.2.1, Teststand:** Netzwerk-Knopf, Entitäts- und Geräte-Links, ausgegraute fehlende Geräte und der Namens-Optionsdialog sind gegen simulierte Daten geprüft, **nicht an echter Hardware oder einer echten Home-Assistant-Installation**. Die serbische Karte ist nur teilweise übersetzt.
- **Neu in 1.3.0b2, Teststand:** Geprüft wurden die Aufbereitung der Netzwerkkarte (Auswertung von Knoten und Verbindungen, Baumaufbau, defekte Antworten) mit einem Testprogramm und die Karte in einem Headless-Browser (Chromium) mit simulierten Daten (10 Router, 40 Endgeräte, Router ohne Verbindung): alle Reiter, das Geräte-Popup mit dem Schalter, Akkordeons, Zwei-Klick-Bestätigung, Ladezustand und Nur-lesen-Modus in allen sieben Sprachen. **Nicht geprüft:** an echter Hardware und mit der echten Antwort von Zigbee2MQTT (Format, Dauer, Belastung des Netzes), mit sehr großen Netzen, in der iOS-/Android-Companion-App. Der Python-Teil (Abfrage der Netzwerkkarte, Speicherung, Offline ignorieren, Einrichtung, **externer Broker**, **Z2M-Update-Prüfung**) wurde nur mit `py_compile` und `pyflakes` auf Syntaxfehler und unbekannte Namen geprüft und **nicht in Home Assistant ausgeführt**; ebenso der Notification-Center-Teil des Schalters. Die Netzwerkzeichnung ist eine Näherung der echten Routen. Die serbische Karte ist nur teilweise übersetzt.

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
| **1.3.0b2** (Beta) | Neu: **Netzwerkkarte** in der Kategorie Netzwerk (Coordinator, Router und Endgeräte-Wolken als Zeichnung, darunter je Router ein Akkordeon mit den Verbindungen; Abfrage per „Netz neu einlesen“). Neu: **Offline-Status ignorieren** je Gerät (Issue #15). Neu: optionaler **externer MQTT-Broker** (Issue #14, experimentell). Geändert: `show_comment` ist standardmäßig an (Issue #16); `max_rows` und `zoom` im Editor als Eingabefeld statt Schieberegler (Issue #17). **Neu: Zigbee2MQTT-Update-Prüfung mit Hinweis und Benachrichtigung** (PR #18, @seebaer1976). Die Issues #12 und #13 waren schon mit 1.2.2 behoben. **Beta, nur gegen simulierte Daten geprüft.** |
| **1.2.2** | Neu: eigene Kategorie **Netzwerk** in der Kartenleiste (mit Hinweis, wie die Adresse der Netzwerkkarte einzutragen ist, `show_network`). Behoben: Bei Home-Assistant-Sprache **Serbisch (lateinisch, `sr-Latn`)** zeigten Karte, Willkommensmeldung und Versionshinweis Kyrillisch, weil nur der Sprachteil „sr“ ausgewertet wurde; es gibt jetzt einen lateinischen Textblock. |
| **1.2.1** | Neu: Knopf **Netzwerk** (Zigbee2MQTT-Netzwerkkarte), Links von Entitäten und Gerät zu Home Assistant, einstellbarer **Name in der Seitenleiste**, **fehlende Geräte** bleiben ausgegraut sichtbar (Chip, Filter, Sensor, Ereignis, Notification Center, „Vergessen“), Sprache **Српски**, README mit Flaggen-Sprachleiste, Blog-Link und Bildern. Behoben: fehlende Bilder bei Modellen mit Leerzeichen (z. B. innr-Steckdosen). |
| **1.2.0** | Neu: Der **Kommentar** eines Geräts lässt sich im Popup **bearbeiten** (Abschnitt „Kommentar“, wird über Zigbee2MQTT in `description` gespeichert, nicht im Nur-lesen-Modus). Neu: Chip **Deaktiviert** und Sensor **Deaktivierte Geräte** (Zähler und Namensliste). Neu: **Eintrag in der Seitenleiste** (Home-Assistant-Panel, nur Administratoren, abschaltbar unter Konfigurieren), der die Karte als ganze Seite zeigt (Issue #6). Neu: **Anbindung an das Notification Center** (optional, Schnittstelle Schema 1) mit sieben Meldungsarten (Bridge offline, Batterie kritisch, Gerät offline, Batterie niedrig, Firmware-Update, neues Gerät, Gerät hat das Netz verlassen), Hauptschalter und Schalter je Art in der Karte und im Konfigurieren-Dialog. Neu: **Sammelstörung** als Binärsensor (Geräteklasse `problem`) mit allen Zählern und Gerätelisten als Attribute; **Raum**, **HA-Gerät** und **Kommentar** in Liste, Popup und Suche, Gruppieren nach **Raum**; **„Lange nichts gehört“** (Chip, Filter, Abzeichen, einstellbare Stunden); Einrichtungshilfen (my.home-assistant.io-Links, einmaliger Hinweis nach der Einrichtung, Dashboard-Vorlage in `examples`). Behoben (Issue #7): in Zigbee2MQTT **deaktivierte Geräte** gelten nicht mehr als offline (eigener Status „Deaktiviert“, nicht in Zählern, Sensoren und Notification Center). Behoben (Issue #5): Die Karte **flackerte und sprang beim Scrollen nach oben**, weil sie bei jedem Datenupdate komplett neu gezeichnet wurde; jetzt werden nur geänderte Teile aktualisiert (Bilder, Zeilen, Akkordeons und Eingabefokus bleiben stehen, datengetriebenes Neuzeichnen höchstens alle 2 Sekunden). Behoben: Beim **Tippen in Suche und Feldern am Desktop** lösten Home-Assistant-Kurzbefehle aus (z. B. öffnete „e“ die Entitätssuche). Behoben (Issue #4): Zuordnung der HA-Geräte ohne die veraltete `device_registry.devices`-Abbildung. Änderungen an den Notification-Center-Schaltern laden die Integration nicht mehr neu. Englische Reste in den deutschen Texten (`strings.json`) korrigiert. **Französisch** (Dank an @Locodice67, PR #3; übernommen und angepasst: Du-Form, neue Texte) und **Spanisch** ergänzt. |
| **1.1.0** | Neu: Listen nach Hersteller oder Geräteklasse **gruppieren** (Akkordeon) und **filtern** (Status online/offline, Stromversorgung, Signal, Netzwerk-Rolle, Firmware, zuletzt gesehen, ohne Zigbee-Gruppe, Hersteller, Geräteklasse; aktive Filter als Chips). Schreibbare **Schalter** unter „Funktionen (Expose)“ lassen sich direkt umlegen. Neuer Popup-Abschnitt **Entitäten (für Automationen)** und Kopieren-Knöpfe für die Entitäts-Namen. Editor: `show_group_by`, `default_group_by`, `show_filters`. Backend: neue Aktion `set_expose` (nur Administratoren, Werte werden geprüft) und Geräteklasse je Gerät. |
| 1.0.5 | Behoben: Popup und Abschnitt „Funktionen (Expose)“ ließen sich nicht bedienen (Endlosschleife beim Neuzeichnen, Gerätebild flackerte). Offline-Anzeige gegen veraltete Meldungen abgesichert. Niederländisch ergänzt (Karte, Integration, README), LICENSE und `examples/` hinzugefügt. Dank an @pr0xyzer (PR #2): Zuordnung der HA-Entitäten über MQTT-Identifier mit mehr als zwei Werten (Liste beim Umbenennen). |
| 1.0.4 | Alle Expose-Funktionen im Geräte-Popup, mehrere Sticks (mehrere Instanzen), Korrektur bei den Geräteoptionen. |
| 1.0.3 | Erste offizielle Version. |

## Datei-Integrität

Jede `.py`-, `.js`- und `.yaml`-Datei trägt in der ersten Zeile einen SHA-256-Hash über den Inhalt ab Zeile 2. Prüfen: `tail -n +2 datei.py | sha256sum`. JSON-Dateien können keine Kommentare enthalten, ihre Hashes (SHA-256 über die komplette Datei) stehen hier:

| Datei | SHA-256 |
|---|---|
| `custom_components/zigbee2mqtt_manager/manifest.json` | `0cc9570702884235465c2166edfa75ea6e6ff56de2427b90f5765f04a5c35bc7` |
| `custom_components/zigbee2mqtt_manager/strings.json` | `6de799ec33723aea7c3e8712040c6346e4e040250821a446a275d924200741e7` |
| `custom_components/zigbee2mqtt_manager/icons.json` | `7edb380606df1bfbae5954235fcab84bed87d0b0d5a1c40834653dbd1a7c3d7e` |
| `custom_components/zigbee2mqtt_manager/translations/de.json` | `6de799ec33723aea7c3e8712040c6346e4e040250821a446a275d924200741e7` |
| `custom_components/zigbee2mqtt_manager/translations/en.json` | `da553753a4d279502fffae4c64f9a38b91917e249df8c7edb4d9dffe220169c2` |
| `custom_components/zigbee2mqtt_manager/translations/nl.json` | `da8ee025b20022837a5143210079225f08e8c13a6d2ee190804985e66bb017ec` |
| `custom_components/zigbee2mqtt_manager/translations/fr.json` | `6ab0460955e883883e3da224c644e593e8ba993b899485a38ca0dd825bc5c147` |
| `custom_components/zigbee2mqtt_manager/translations/es.json` | `32ed1f7a0567b3a859ae74b6fcbb129aaae81bb8117b047ff468753ce6be86f8` |
| `custom_components/zigbee2mqtt_manager/translations/sr.json` | `c101a5d913202a6a34b2351b2f628196ecabc6e24f26040d6262ed0541139769` |
| `custom_components/zigbee2mqtt_manager/translations/sr-Latn.json` | `e04494d6d680f513f8d03973e4c89ba731e4b8ce23818d05bebb852ae2bf7776` |
| `hacs.json` | `8939982e245783f7a41fb7f76e3da661b7250b5cec9385085ab68f19cea5cfda` |

## Lizenz

MIT
