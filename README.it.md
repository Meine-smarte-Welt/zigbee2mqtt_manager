| [🇩🇪<br>**Deutsch**](README.md) | [🇬🇧<br>**English**](README.en.md) | [🇳🇱<br>**Nederlands**](README.nl.md) | [🇫🇷<br>**Français**](README.fr.md) | [🇪🇸<br>**Español**](README.es.md) | 🇮🇹<br>**Italiano** | [🇷🇸<br>**Српски**](README.sr.md) |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|

![Zigbee2MQTT Manager – Banner](docs/images/zigbee2mqtt_manager.webp)

# Zigbee2MQTT Manager per Home Assistant

> **Nota:** questo README è **abbreviato** e il testo non è stato controllato da un madrelingua. La documentazione completa è in [tedesco](README.md) e [inglese](README.en.md).

Gestisci Zigbee2MQTT senza lasciare Home Assistant: dispositivi, batterie, aggiornamenti firmware, gruppi, binding e bridge in un'unica scheda della dashboard, come integrazione HACS.

[![Apri il repository in Home Assistant](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Meine-smarte-Welt&repository=zigbee2mqtt_manager&category=integration)

## Novità della 1.4.0

- **Funzioni sperimentali:** le nuove funzioni sono **nascoste per impostazione predefinita**. Interruttore principale in **Configura** (spento), chiave della scheda `show_experimental` (spenta) e un interruttore per funzione in **Bridge → Sperimentale** (spento). Se uno è spento, non cambia nulla rispetto alla 1.3.1 (vedi `EXPERIMENTELL.md`).
- **Impostare direttamente i valori numerici** (issue #26, `expose_numeric_edit`) e **elenco dei dispositivi su più colonne** (issue #24, `list_columns`), entrambi sperimentali.
- **Italiano** (PR #25, Salvatore Scalzi): scheda, integrazione e Notification Center. I testi delle nuove funzioni sono stati aggiunti senza madrelingua.
- Completamente compatibile con la 1.3.1; nulla è stato rimosso.

## Installazione

1. Installa **Zigbee2MQTT Manager** tramite HACS (repository personalizzato, categoria *Integrazione*) e riavvia Home Assistant.
2. **Impostazioni → Dispositivi e servizi → Aggiungi integrazione → Zigbee2MQTT Manager.**
3. Aggiungi la scheda alla dashboard (`type: custom:zigbee2mqtt-manager-card`).

## Limitazioni note

- **Stato dei test 1.4.0:** backend (50 casi di test in un vero ambiente di test di Home Assistant) e scheda in Chrome (headless) con dati generati dal backend. **Non verificato:** hardware reale, un'installazione di Home Assistant in funzione, Firefox, Safari, app companion. L'italiano **non è stato controllato da madrelingua**.

## Cronologia delle versioni

| Versione | Modifiche |
|---|---|
| **1.4.0** | Nuovo (sperimentale, spento di default): valori numerici nella finestra (#26), elenco su più colonne (#24); lingua italiana (PR #25). |

## Licenza

Vedi [LICENSE](LICENSE).
