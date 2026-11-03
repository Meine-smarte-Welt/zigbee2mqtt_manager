# Experimentelle Funktionen (Stand 1.4.0)

Neue Funktionen sind zunächst **experimentell** und **standardmäßig unsichtbar**. Sie sind **nicht von Thorsten als „geprüft“ freigegeben** und nicht an echter Hardware getestet.

## So schaltest du sie ein

1. **Hauptschalter:** Einstellungen → Geräte & Dienste → Zigbee2MQTT Manager → Konfigurieren → **Experimentelle Funktionen** (Option `experimental_enabled`, Standard: aus).
2. **Karte:** Kartenschlüssel `show_experimental: true` (Karteneditor: Gruppe **Experimentell**; die Seitenleiste zeigt sie immer). Standard: aus.
3. **Je Funktion:** in der Karte **Bridge → Experimentell** den Schalter der Funktion einschalten. Standard: aus.

Ist eine der drei Stufen aus, verhält sich die Integration wie 1.3.1; das Backend nimmt die Aktionen der Funktion dann nicht an.

## Liste

| Funktion | Schlüssel | Seit | Anlass | Zustand |
|---|---|---|---|---|
| Zahlenwerte direkt setzen | `expose_numeric_edit` | 1.4.0 | Issue #26 | experimentell, nicht an Hardware geprüft |
| Geräteliste in mehreren Spalten | `list_columns` (Kartenschlüssel `list_columns`: `auto`, `1`–`4`) | 1.4.0 | Issue #24 | experimentell |

### Zahlenwerte direkt setzen (`expose_numeric_edit`)
- **Was:** Im Popup unter „Funktionen (Expose)“ erscheint für schreibbare Zahlen ein Eingabefeld mit **Setzen** (Enter geht auch).
- **Testschritte:** (1) Schalter einschalten. (2) Popup einer Lampe öffnen, Helligkeit eintippen, Setzen. (3) Wert außerhalb des Bereichs eintippen: es muss eine Fehlermeldung kommen und nichts gesendet werden. (4) Prüfen, ob die Lampe den Wert annimmt und die Karte ihn danach anzeigt. (5) Eine nur lesbare Zahl (zum Beispiel Signalstärke) darf kein Feld haben.
- **Grenzen:** nur Administratoren, nicht im Nur-lesen-Modus, keine verschachtelten Funktionen (Farbe), keine Auswahlfelder oder Texte.

### Geräteliste in mehreren Spalten (`list_columns`)
- **Was:** Die Zeilen der Liste (auch gruppiert) stehen nebeneinander; die Spaltenzahl richtet sich nach der **Breite der Karte**.
- **Testschritte:** (1) Schalter einschalten, Kartenschlüssel `list_columns: auto`. (2) Karte breit und schmal ziehen (Fenster, Wandtablet, Smartphone): ab 640 px zwei, ab 960 px drei Spalten. (3) `list_columns: 4` bei schmaler Karte: es werden weniger Spalten gezeigt.

## Nicht experimentell, aber nicht von Muttersprachlern geprüft
- Italienisch (PR #25) und Serbisch im Notification Center (PR #28): Texte aus den Pull Requests, Texte der neuen Funktionen von mir ergänzt.

## Rückmeldung
Bitte Fehler und Wünsche als Issue melden (Home-Assistant-Version, Browser bzw. App angeben).
