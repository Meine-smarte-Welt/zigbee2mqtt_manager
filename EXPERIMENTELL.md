# Experimentelle Funktionen (Stand 1.5.0)

Neue Funktionen sind zunächst **experimentell** und **standardmäßig unsichtbar**. Sie sind **nicht von Thorsten als „geprüft“ freigegeben** und nicht an echter Hardware getestet.

## So schaltest du sie ein

1. **Hauptschalter:** Einstellungen → Geräte & Dienste → Zigbee2MQTT Manager → Konfigurieren → **Experimentelle Funktionen** (Option `experimental_enabled`, Standard: aus).
2. **Karte:** Kartenschlüssel `show_experimental: true` (Karteneditor: Gruppe **Experimentell**; die Seitenleiste zeigt sie immer). Standard: aus.
3. **Je Funktion:** in der Karte **Bridge → Experimentell** den Schalter der Funktion einschalten. Standard: aus.

Ist eine der drei Stufen aus, verhält sich die Integration wie 1.3.1; das Backend nimmt die Aktionen der Funktion dann nicht an.

## Liste

| Funktion | Schlüssel | Seit | Anlass | Zustand |
|---|---|---|---|---|
| Zahlenwerte direkt setzen (ab 1.5.0 mit Regler, Direkteingabe, negativen Werten, auch in den Geräteoptionen) | `expose_numeric_edit` | 1.4.0 | Issue #26 | experimentell, nicht an Hardware geprüft |
| Geräteliste in mehreren Spalten | `list_columns` (Kartenschlüssel `list_columns`: `auto`, `1`–`4`) | 1.4.0 | Issue #24 | experimentell |
| Statistik-Reiter | `statistics_tab` | 1.5.0 | Wunsch von Thorsten | experimentell, nur mit simulierten Daten geprüft |
| Eigene Gerätebilder (Upload oder Kamera) | `device_images` | 1.5.0 | Wunsch von Thorsten | experimentell, nur mit simulierten Daten und simulierter Kamera geprüft |

### Zahlenwerte direkt setzen (`expose_numeric_edit`)
- **Was:** Im Popup unter „Funktionen (Expose)“ erscheint für schreibbare Zahlen ein Eingabefeld mit **Setzen** (Enter geht auch).
- **Testschritte:** (1) Schalter einschalten. (2) Popup einer Lampe öffnen, Helligkeit eintippen, Setzen. (3) Wert außerhalb des Bereichs eintippen: es muss eine Fehlermeldung kommen und nichts gesendet werden. (4) Prüfen, ob die Lampe den Wert annimmt und die Karte ihn danach anzeigt. (5) Eine nur lesbare Zahl (zum Beispiel Signalstärke) darf kein Feld haben.
- **Neu in 1.5.0:** Neben dem Feld steht ein **Regler**; beide führen sich gegenseitig nach. **Negative Werte** sind erlaubt (zum Beispiel Offset), auch in den **Geräteoptionen** (Popup → Optionen). Ohne Grenzen von Zigbee2MQTT bleibt das Feld frei, der Regler hat einen weichen Bereich.
- **Zusätzliche Testschritte 1.5.0:** (6) Regler ziehen: das Feld folgt, gesendet wird erst mit **Setzen**. (7) Einen negativen Wert tippen (zum Beispiel `-3.5`): er muss ankommen. (8) In den Optionen eine Kalibrierung auf einen negativen Wert stellen und speichern. (9) Ein Wert außerhalb von Min/Max muss abgelehnt werden.
- **Grenzen:** nur Administratoren, nicht im Nur-lesen-Modus, keine verschachtelten Funktionen (Farbe), keine Auswahlfelder oder Texte.

### Geräteliste in mehreren Spalten (`list_columns`)
- **Was:** Die Zeilen der Liste (auch gruppiert) stehen nebeneinander; die Spaltenzahl richtet sich nach der **Breite der Karte**.
- **Testschritte:** (1) Schalter einschalten, Kartenschlüssel `list_columns: auto`. (2) Karte breit und schmal ziehen (Fenster, Wandtablet, Smartphone): ab 640 px zwei, ab 960 px drei Spalten. (3) `list_columns: 4` bei schmaler Karte: es werden weniger Spalten gezeigt.

### Statistik-Reiter (`statistics_tab`)
- **Was:** Eigener Reiter **Statistik** mit Kacheln und Balken: Gerätearten, Stromversorgung, Hersteller und Modelle, Signalqualität (gut ab 100, mittel ab 50, darunter schwach), Batterie, zuletzt gesehen, Firmware-Stand und Netzdaten (Meldungen). Die Auswertung läuft im Backend.
- **Testschritte:** (1) Schalter einschalten, Karte neu laden. (2) Reiter öffnen: Summen und Balken mit der eigenen Geräteliste vergleichen (Anzahl Router, Endgeräte, Batteriegeräte). (3) Ein Gerät ohne Signalwert oder ohne Batterie darf die Zahlen nicht verfälschen. (4) Schalter aus: Reiter verschwindet, das Backend liefert keine Statistik.
- **Grenzen:** reine Anzeige; die Werte stammen aus dem Zwischenspeicher der Karte, nicht aus einer Langzeitaufzeichnung.

### Eigene Gerätebilder (`device_images`)
- **Was:** Im Popup eines Geräts unter **Bild**: **Hochladen** oder **Foto aufnehmen**. Das Bild wird im Browser verkleinert (höchstens 640 Pixel, Vorschau 160 Pixel, JPEG), das Backend prüft Format, Größe und Dateikopf und speichert es getrennt von den Einstellungen. Es ersetzt in Liste und Popup das Standardbild. **Bild entfernen** (mit Zwei-Klick-Bestätigung) stellt das Standardbild wieder her.
- **Testschritte:** (1) Schalter einschalten, Popup öffnen, **Bild** aufklappen. (2) Ein großes Foto hochladen: Vorschau im Popup und Miniatur in der Liste müssen erscheinen. (3) Smartphone: **Foto aufnehmen** muss die Kamera-App öffnen. Desktop mit HTTPS: Kameraansicht mit **Aufnehmen**; ohne HTTPS oder ohne Erlaubnis kommt ein Hinweis. (4) Home Assistant neu starten: das Bild muss bleiben. (5) Bild entfernen. (6) Eine Datei, die kein Bild ist (umbenannte Textdatei), muss abgelehnt werden.
- **Grenzen:** nur Administratoren, nicht im Nur-lesen-Modus; begrenzte Gesamtgröße aller Bilder. Das Bild bleibt in Home Assistant und wird nicht an Zigbee2MQTT oder Dritte gesendet. **Nicht geprüft:** echte Kamera, Hoch-/Querformat auf dem Smartphone, Firefox, Safari, Companion-App.

## Keine Funktion mit Schalter, aber neu in 1.5.0
- **Netzwerkkarte folgt den gemeldeten Eltern-Knoten (Issue #31):** Dies ist **keine** experimentelle Funktion mit Schalter, sondern **ersetzt** das bisherige Verhalten (LQI-Näherung per Dijkstra) als Standard. Die Näherung bleibt Ausweichlösung. Wenn das bei dir schlechter aussieht als vorher, bitte als Issue melden.
- **Symbol `zmm:logo`:** das Logo als Symbol für Home Assistant, ohne Schalter. Ein `mdi:`-Symbol kann eine Integration nicht ergänzen.

## Nicht experimentell, aber nicht von Muttersprachlern geprüft
- Italienisch (PR #25) und Serbisch im Notification Center (PR #28): Texte aus den Pull Requests, Texte der neuen Funktionen von mir ergänzt.
- Serbisch in der Karte (PR #29) und rumänische README (PR #30): aus den Pull Requests übernommen, nicht von Muttersprachlern geprüft. `sr-Latn` entsteht automatisch aus `sr`; die neuen Texte (Statistik, Bilder) sind von mir ergänzt.

## Rückmeldung
Bitte Fehler und Wünsche als Issue melden (Home-Assistant-Version, Browser bzw. App angeben).
