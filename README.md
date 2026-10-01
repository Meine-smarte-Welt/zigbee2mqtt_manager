# Zigbee2MQTT Manager für Home Assistant

Zigbee2MQTT verwalten, ohne Home Assistant zu verlassen: Geräte übersichtlich anzeigen, umbenennen, Pairing starten, Batteriestände im Blick behalten und OTA-Updates gesammelt prüfen und anstoßen – als HACS-Integration mit eigener Lovelace-Karte.

> **Status: 0.0.1 – Entwurf.** Noch nicht gegen eine laufende Home-Assistant-Instanz getestet. Bitte zuerst auf einer Testinstanz ausprobieren.

## Funktionen

| Bereich | Was es kann |
|---|---|
| **Geräte** | Tabelle mit Name, Modell, Typ, Signalqualität, Batterie, „zuletzt gesehen“; Suche und Sortierung; Erreichbarkeit als Farbpunkt |
| **Batterie** | Alle batteriebetriebenen Geräte, aufsteigend nach Ladestand; Farben rot / orange / grün |
| **OTA-Updates** | Installierte vs. verfügbare Firmware aller Geräte auf einen Blick; „Alle prüfen“; Update pro Gerät starten; Fortschritt |
| **Detail-Popup** | Umbenennen (inkl. HA-Entity-Umbenennung), Geräteinfos, OTA prüfen/installieren, Gerät entfernen |
| **Bridge** | Status, Version, Pairing starten/beenden |
| **Sensoren** | `Geräte`, `Offline-Geräte`, `Geräte mit niedriger Batterie`, `Verfügbare Firmware-Updates` (mit Geräteliste als Attribut) |

Schreibende Aktionen sind auf **Administratoren** beschränkt.

## Voraussetzungen

- Home Assistant 2025.1 oder neuer
- Eingerichtete **MQTT-Integration**
- Zigbee2MQTT (entwickelt gegen die 2.x-Bridge-API, nicht mit allen Versionen geprüft)
- Empfohlen: in Zigbee2MQTT `availability: true` aktivieren, sonst gibt es keinen Online/Offline-Status. Optional `advanced.last_seen: ISO_8601` für „zuletzt gesehen“.

## Installation (HACS)

1. HACS → ⋮ → **Benutzerdefinierte Repositories** → URL dieses Repos, Kategorie **Integration**
2. „Zigbee2MQTT Manager“ installieren, Home Assistant neu starten
3. **Einstellungen → Geräte & Dienste → Integration hinzufügen → Zigbee2MQTT Manager**
4. Base-Topic eintragen (Standard `zigbee2mqtt`)

Manuell: Ordner `custom_components/zigbee2mqtt_manager` nach `<config>/custom_components/` kopieren.

## Karte einbinden

Die Karte wird von der Integration automatisch geladen (keine Ressource nötig). Nach dem ersten Start einmal den Browser-Cache leeren.

```yaml
type: custom:zigbee2mqtt-manager-card
title: Zigbee2MQTT Manager   # optional
entry_id: abc123             # optional, nur bei mehreren Instanzen
```

## Wie es funktioniert

Die Integration abonniert `<base_topic>/#` über die MQTT-Integration und baut daraus den Zustand auf (`bridge/devices`, `bridge/info`, `bridge/state`, Geräte-Payloads, `<gerät>/availability`). Die Karte bekommt per WebSocket einen Snapshot und danach gebündelte Updates (max. 1 Push pro Sekunde). Befehle gehen als Requests an `<base_topic>/bridge/request/…`.

## Bekannte Einschränkungen in 0.0.1

- Batterie, Signal und OTA-Status erscheinen erst, wenn ein Gerät eine Nachricht gesendet hat (Z2M speichert Gerätezustände nicht retained, sofern nicht per Gerät `retain: true` gesetzt ist).
- OTA-Fähigkeit wird aus `definition.supports_ota` bzw. dem `update`-Block im Gerätezustand abgeleitet.
- Kein Netzwerk-/Mesh-Graph, keine Gruppen, keine Geräte-Konfiguration (Options).
- Der Snapshot wird bei jedem Update komplett gesendet – bei sehr großen Netzen (>300 Geräte) später auf Diffs umstellen.
- Keine Tests, kein Screenshot-Set.

## Roadmap

- 0.1: Gruppen, Geräte-Optionen, Zigbee-Netzwerkkarte (Mesh)
- Services für Automationen (`check_updates`, `permit_join`)
- Benachrichtigung bei neuen Updates / leeren Batterien
- Bulk-Aktionen (mehrere Geräte umbenennen/aktualisieren)

## Lizenz

MIT
