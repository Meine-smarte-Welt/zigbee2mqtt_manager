| [🇩🇪<br>**Deutsch**](README.md) | [🇬🇧<br>**English**](README.en.md) | [🇳🇱<br>**Nederlands**](README.nl.md) | [🇫🇷<br>**Français**](README.fr.md) | [🇪🇸<br>**Español**](README.es.md) | 🇮🇹<br>**Italiano** | [🇷🇸<br>**Српски**](README.sr.md) | [🇷🇴<br>**Română**](README.ro.md) |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|

![Zigbee2MQTT Manager – Banner](docs/images/zigbee2mqtt_manager.webp)

# Zigbee2MQTT Manager per Home Assistant

> **Nota:** questo README è **abbreviato** e il testo non è stato controllato da un madrelingua. La documentazione completa è in [tedesco](README.md) e [inglese](README.en.md).

Gestisci Zigbee2MQTT senza lasciare Home Assistant: dispositivi, batterie, aggiornamenti firmware, gruppi, binding e bridge in un'unica scheda della dashboard, come integrazione HACS.

[![Apri il repository in Home Assistant](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Meine-smarte-Welt&repository=zigbee2mqtt_manager&category=integration)

## Novità della 1.5.1

- **Statistiche, online/offline:** se Zigbee2MQTT non segnala la disponibilità, ora compare una tessera **Sconosciuto** e un'indicazione per attivare `availability: true` in Zigbee2MQTT.
- **Scattare una foto su Android:** si apre prima la vista fotocamera della scheda (solo con HTTPS); senza HTTPS o accesso alla fotocamera si usa l'app fotocamera del dispositivo.
- **Funzioni (Expose) nella finestra:** niente più seconda barra di scorrimento; nei campi numerici l'etichetta sta sopra il cursore.
- Completamente compatibile; nuova solo una chiave di traduzione della scheda. Le nuove traduzioni non sono state verificate da madrelingua.

## Novità della 1.5.0

- **La mappa di rete segue i genitori segnalati** (issue #31): l'albero dei router è costruito dal campo `relationship` delle tabelle dei vicini; la stima LQI resta solo come ripiego. Sostituisce il comportamento precedente, senza interruttore.
- **Valori numerici con cursore e immissione diretta, anche negativi** (issue #26, ancora sperimentale `expose_numeric_edit`), anche nelle opzioni del dispositivo.
- **Statistiche** (nuovo, sperimentale `statistics_tab`): scheda con tessere e barre (tipi di dispositivo, alimentazione, produttori, qualità del segnale, batteria, ultimo contatto, firmware).
- **Immagini personalizzate dei dispositivi** (nuovo, sperimentale `device_images`): nella finestra, sotto «Immagine», caricare un'immagine o scattare una foto; viene ridotta nel browser prima del caricamento (al massimo 640 pixel).
- **Logo come icona** `zmm:logo` in Home Assistant (il prefisso `mdi:` non può essere esteso da un'integrazione).
- Ripresi: serbo nella scheda (PR #29) e README in rumeno (PR #30). Completamente compatibile con la 1.4.0; nulla è stato rimosso.
- **Stato dei test 1.5.0:** backend con programmi di test, scheda in Chrome (headless) con dati simulati. **Non provato:** hardware reale, fotocamera reale, Firefox, Safari, app companion. Le nuove traduzioni non sono state verificate da madrelingua.

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
| **1.5.1** | Corretto: statistiche con **Sconosciuto** e indicazione sulla disponibilità; **Scattare una foto** apre la fotocamera su Android; **Funzioni (Expose)** senza seconda barra di scorrimento. |
| **1.5.0** | Corretto: mappa di rete con i genitori segnalati (#31). Valori numerici con cursore e immissione diretta, anche negativi (#26). Nuovo (sperimentale): **Statistiche**, **immagini dei dispositivi** (caricamento o fotocamera). Nuovo: icona `zmm:logo`. Ripresi: serbo nella scheda (#29), README rumeno (#30). |
| **1.4.0** | Nuovo (sperimentale, spento di default): valori numerici nella finestra (#26), elenco su più colonne (#24); lingua italiana (PR #25). |

## Licenza

Vedi [LICENSE](LICENSE).
