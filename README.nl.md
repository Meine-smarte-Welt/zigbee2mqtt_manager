🇩🇪 [Deutsch](README.md) · [🇬🇧 English](README.en.md) · 🇳🇱 Nederlands

# Zigbee2MQTT Manager voor Home Assistant

Beheer Zigbee2MQTT zonder Home Assistant te verlaten: apparaten, batterijen, firmware-updates, groepen, bindings en bridge in één dashboardkaart – als HACS-integratie. Opzet en ontwerp volgen de kaart van [FRITZ!Box Anrufe](https://github.com/Meine-smarte-Welt/fritzbox_anrufe): categorieën met pictogrammen, rijlijsten, detailpopup, accordeonsecties, grafische editor en vrij instelbare kleuren.

## Inhoud

- [Functies](#functies)
- [Vereisten](#vereisten)
- [Installatie](#installatie)
- [De kaart](#de-kaart)
- [Kleuren](#kleuren)
- [Meerdere instanties (meerdere sticks)](#meerdere-instanties-meerdere-sticks)
- [Services](#services)
- [Gebeurtenissen voor automatiseringen](#gebeurtenissen-voor-automatiseringen)
- [Sensoren](#sensoren)
- [Versieweergave en updatemelding](#versieweergave-en-updatemelding)
- [Instellingen van de integratie](#instellingen-van-de-integratie)
- [Beveiliging](#beveiliging)
- [Bekende beperkingen](#bekende-beperkingen)
- [Probleemoplossing](#probleemoplossing)
- [Versiegeschiedenis](#versiegeschiedenis)
- [Bestandsintegriteit](#bestandsintegriteit)

## Functies

De kaart heeft zes categorieën in een pictogrambalk (onder ca. 480 px kaartbreedte alleen pictogrammen). Elke categorie is afzonderlijk te tonen of te verbergen.

| Categorie | Wat het kan |
|---|---|
| **Apparaten** | Lijst met bereikbaarheid, model, signaal, batterij, „laatst gezien”; statistiekchips als filter (offline / batterij laag / updates); zoeken; sorteren |
| **Batterij** | Batterijapparaten, laagste stand eerst; kleuren volgens lage en kritieke drempel |
| **Updates** | Geïnstalleerde vs. beschikbare firmware; „alles controleren” en „alles na elkaar installeren” als achtergrondtaak met voortgang en annuleren |
| **Groepen** | Aanmaken, hernoemen, verwijderen; leden toevoegen en verwijderen |
| **Bindings** | Overzicht van alle apparaatkoppelingen; loskoppelen; opnieuw koppelen in de apparaatpopup |
| **Bridge** (tandwiel) | **App-versie** (integratie en kaart, gekleurde melding bij een nieuwe versie), status, coördinator, koppelen, bridge-opties, herstart, gebeurtenissenlogboek |

**Apparaatpopup** (tik op een rij) met accordeonsecties: Informatie · **Functies (expose)** · Hernoemen (met lijst van de betrokken HA-entiteiten) · Apparaatopties (formulier uit het Z2M-optieschema) · Firmware · Bindings · Groepen · Verwijderen.

De sectie **Functies (expose)** toont alles wat Zigbee2MQTT voor het apparaat beschikbaar stelt (schakelaar, helderheid, kleur, temperatuur, linkkwaliteit …): naam, eigenschap, **actuele waarde** met eenheid, toegang (lezen / schrijven / opvragen), waardebereik of keuzewaarden, beschrijving en een markering als configuratie of diagnose. Samengestelde functies (bijv. kleur x/y) en groepen zoals licht of schakelaar worden opgelost en gegroepeerd; vanaf negen functies is er een filterveld. Zolang de sectie openstaat, worden de waarden vernieuwd zodra het apparaat iets verstuurt (hoogstens elke 3 seconden). De weergave is alleen-lezen; bedien het apparaat zoals voorheen via de Home Assistant-entiteiten.

Verdere punten:

- **Cache:** batterij, signaal, OTA-status en „laatst gezien” blijven na een herstart van Home Assistant behouden (Z2M verstuurt apparaatstatussen niet retained).
- **Groepen zijn geen apparaten meer:** groepstopics verschijnen niet als schijnapparaat.
- **Bevestigen met twee klikken** in plaats van een browserdialoog bij riskante acties (verwijderen, update, herstart, loskoppelen, wissen).
- **Alleen-lezen:** `read_only: true` verbergt alle bedieningselementen die iets wijzigen (wandtablets).
- **Zoom:** `zoom` schaalt de hele kaart.
- **Talen:** Duits, Engels en Nederlands (volgens de taal van Home Assistant).
- **Diagnose-download** met geanonimiseerde namen en IEEE-adressen.

## Vereisten

- Home Assistant **2025.6** of nieuwer
- Ingestelde **MQTT-integratie**
- **Zigbee2MQTT 2.x** (versie 1.x wordt herkend en in de kaart als niet ondersteund gemeld)
- Aanbevolen: stel in Zigbee2MQTT `availability: true` in, anders is er geen online/offline-status. Voor „laatst gezien” ook `advanced.last_seen: ISO_8601`.

## Installatie

1. HACS → ⋮ → **Aangepaste repositories** → URL van deze repository, categorie **Integratie**
2. „Zigbee2MQTT Manager” installeren, Home Assistant herstarten
3. **Instellingen → Apparaten & services → Integratie toevoegen → Zigbee2MQTT Manager**
4. Base-topic invoeren (standaard `zigbee2mqtt`) en de drempel voor „batterij laag” kiezen

Handmatig: kopieer de map `custom_components/zigbee2mqtt_manager` naar `<config>/custom_components/`.

## De kaart

De integratie levert de kaart uit en registreert hem als Lovelace-resource (blijvend, met `?v=<versie>` tegen verouderde browsercaches). Je hoeft niets handmatig toe te voegen. Draait Lovelace in YAML-modus, voeg dan `/zigbee2mqtt_manager_files/zigbee2mqtt-manager-card.js` toe als resource van het type `module`.

Kaart toevoegen: **Dashboard bewerken → Kaart toevoegen → „Zigbee2MQTT Manager”**. De grafische editor groepeert alle instellingen in in- en uitklapbare secties (categorieën, weergave met kolommen, bewerken, netwerk, kleuren). YAML is niet nodig, maar mogelijk:

```yaml
type: custom:zigbee2mqtt-manager-card
title: Zigbee2MQTT Manager   # leeg ("") = geen kop
# entry_id: abc123            # alleen bij meerdere Z2M-instanties
show_devices: true
show_battery: true
show_updates: true
show_groups: true
show_bindings: true
show_bridge: true
default_tab: devices
max_rows: 0                   # 0 = alles, anders „meer tonen”
zoom: 1
show_stats: true
show_images: true             # apparaatafbeeldingen van zigbee2mqtt.io
show_search: true
show_filter_bar: true         # sorteerkeuze
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

Meer voorbeelden: [`examples/`](examples/).

## Kleuren

In de editor onder **Kleuren** (of via `color_*`-sleutels). Elke waarde mag hex (`#ff9800`), `rgb()`, `hsl()` of `var(--...)` zijn. Leeg betekent themastandaard. Ongeldige waarden worden genegeerd. Het kleurvlak opent de kleurkiezer, het tekstveld accepteert elke CSS-waarde, „Alle kleuren resetten” maakt alles leeg.

| Sleutel | Werking |
|---|---|
| `color_tab_active` | Actieve tab, primaire knoppen |
| `color_success` | Goed: online, signaal goed, batterij vol, actueel |
| `color_warning` | Waarschuwing: batterij laag, signaal matig, update loopt |
| `color_error` | Fout: offline, batterij kritiek, signaal zwak |
| `color_info` | Update beschikbaar (firmware, nieuwe app-versie) |
| `color_row_icon` | Alle lijstpictogrammen (overschrijft de categoriekleuren) |
| `color_live_banner` | Achtergrond van de banner (koppelen, firmwaretaak) |
| `color_icon_devices`, `_battery`, `_updates`, `_groups`, `_bindings`, `_bridge` | Pictogram van de categorie – kleurt tabpictogram en rijpictogrammen |

Is `color_row_icon` ingesteld, dan wint deze ene kleur.

## Meerdere instanties (meerdere sticks)

Draait er meer dan één Zigbee2MQTT-instantie (bijv. drie coördinator-sticks met elk een eigen Z2M), stel dan elke in als eigen item: **Instellingen → Apparaten & services → Integratie toevoegen → Zigbee2MQTT Manager**, telkens met het passende **base-topic** (`mqtt.base_topic` van die Z2M-instantie, bijv. `zigbee2mqtt`, `zigbee2mqtt2`, `zigbee2mqtt3`). Base-topics moeten verschillen en mogen niet in elkaar liggen (niet `zigbee2mqtt` en `zigbee2mqtt/stick2`), anders weigert de installatie ze. Elke instantie krijgt eigen sensoren, gebeurtenissen (met `base_topic` in de gegevens) en een eigen cache.

De kaart biedt twee manieren:

- **Omschakelaar (standaard):** bij meer dan één instantie en zonder vaste keuze verschijnt bovenaan de kaart een keuze van de sticks. De keuze wordt in de browser onthouden.
- **Eén kaart per stick:** kies de instantie in de kaarteditor onder **Instantie (stick)**, of in YAML:

```yaml
type: custom:zigbee2mqtt-manager-card
base_topic: zigbee2mqtt2     # of: entry_id: abc123
```

`base_topic` is de eenvoudigere variant, omdat de `entry_id` nergens zichtbaar is. Zijn beide ingesteld, dan geldt `entry_id`.

## Services

Beide services zijn bedoeld voor automatiseringen. Bij meerdere instanties kiest `base_topic` (of `entry_id`) de instantie. `check_updates` controleert zonder opgave **alle** instanties; `permit_join` vraagt bij meerdere instanties om een keuze, zodat het koppelen nooit per ongeluk op alle sticks tegelijk opengaat.

```yaml
action: zigbee2mqtt_manager.permit_join
data:
  base_topic: zigbee2mqtt2   # alleen bij meerdere instanties
  enabled: true
  duration: 120      # seconden, 10–254, optioneel
```

```yaml
action: zigbee2mqtt_manager.check_updates
```

`check_updates` controleert alle OTA-geschikte apparaten op de achtergrond, na elkaar met tussenpozen.

## Gebeurtenissen voor automatiseringen

Uit te schakelen in de integratieopties („Home Assistant-gebeurtenissen activeren”). Bij het starten wordt alleen de uitgangstoestand vastgelegd, dus er is geen stroom van gebeurtenissen.

| Gebeurtenis | Gegevens |
|---|---|
| `zigbee2mqtt_manager_device_offline` / `_device_online` | `name`, `ieee`, `base_topic` |
| `zigbee2mqtt_manager_battery_low` | `name`, `ieee`, `battery` – bij het onderschrijden van de drempel |
| `zigbee2mqtt_manager_update_available` | `name`, `ieee`, `installed`, `latest` |
| `zigbee2mqtt_manager_device_joined` / `_device_left` | `name`, `ieee` |

```yaml
triggers:
  - trigger: event
    event_type: zigbee2mqtt_manager_battery_low
actions:
  - action: notify.mobile_app_telefoon
    data:
      message: "{{ trigger.event.data.name }}: batterij {{ trigger.event.data.battery }} %"
```

## Sensoren

`Apparaten`, `Offline apparaten`, `Apparaten met lage batterij`, `Apparaten met kritieke batterij`, `Beschikbare firmware-updates` en `Groepen`. De sensoren voor offline, batterij en updates bevatten de apparatenlijst als attribuut.

## Versieweergave en updatemelding

De geïnstalleerde versie staat op drie plaatsen: in de kaart onder **Bridge (tandwiel) → App-versie**, bovenaan in de grafische kaarteditor en in het dialoogvenster **Configureren** van de integratie. Bij het starten en daarna elke 12 uur vraagt de integratie bij GitHub (`api.github.com`, nieuwste release, anders de hoogste versietag) of er een nieuwere versie is gepubliceerd. Is dat zo, dan wordt het gekleurd weergegeven: oranje rand en melding in de sectie, een oranje „↑” bij het tandwielpictogram, een waarschuwingsvak in de editor en een melding in het configuratiedialoogvenster. Het bijwerken zelf gaat zoals gewoonlijk via HACS. Met **Nu controleren** start je de controle direct. Is GitHub niet bereikbaar, dan verschijnt „Controle niet mogelijk”; de kaart werkt gewoon door.

Verschillen kaart- en integratieversie (verouderde browsercache), dan wordt dit ook oranje gemarkeerd.

## Instellingen van de integratie

Onder **Configureren** (met weergave van de geïnstalleerde versie): drempel „batterij laag”, drempel „batterij kritiek” (moet kleiner of gelijk zijn) en gebeurtenissen aan/uit. Via **Opnieuw configureren** wijzig je het base-topic.

## Beveiliging

Alle schrijfacties (hernoemen, opties, verwijderen, firmware, groepen, bindings, koppelen, herstart, versiecontrole) en het laden van apparaatdetails zijn via WebSocket beperkt tot **beheerders**. Invoer wordt door de backend gecontroleerd (dubbele namen, onbekende opties, toegestane bridgewaarden). De kaart maskeert alle teksten; kleurwaarden lopen via een allowlist.

## Bekende beperkingen

- **Z2M-payloads niet getest:** `device/options`, de bindingstructuur in `bridge/devices` en de bridge-opties (`log_level`, `last_seen`). Wijkt je Z2M-versie af, dan blijft de betreffende functie zonder werking of meldt een fout.
- Apparaatopties ondersteunen eenvoudige typen (getal, schakelaar, keuze, tekst), geen geneste opties.
- De entiteitenvoorbeeldweergave bij het hernoemen vindt apparaten via de MQTT-identifiers en kan bij ongebruikelijke discovery-configuratie leeg blijven.
- „Alles installeren” wacht per apparaat maximaal twee uur op het einde van de update.
- Na een herstart komen batterij, signaal en OTA-status eerst uit de cache en worden met het volgende apparaatbericht vernieuwd.
- **Offline-weergave (sinds 1.0.5) en teststatus:** de kaart neemt de beschikbaarheid over van Zigbee2MQTT. Heeft een apparaat na een offline-melding live gestuurd, dan toont de kaart het als bereikbaar. Dit is getest met gesimuleerde gegevens, **niet op echte hardware**. Of hiermee de in 1.0.4 gemelde onjuiste offline-weergaven (sensoren, een stekker) verdwijnen, is open: feedback is nadrukkelijk welkom.
- De popup en de sectie „Functies (expose)” zijn in 1.0.5 gecorrigeerd (eindeloze hertekenlus), maar ook niet op echte hardware en niet in de iOS-/Android-companion-app getest.

## Probleemoplossing

- **Kaart niet gevonden:** browsercache legen; controleer onder Instellingen → Dashboards → Resources of `/zigbee2mqtt_manager_files/…` bestaat (in YAML-modus handmatig toevoegen).
- **Apparaat staat offline, maar is bereikbaar:** Zigbee2MQTT meldt zelf de status (`<base_topic>/<apparaat>/availability`). Controleer de waarde daar, bijv. met MQTT Explorer (Instellingen → Apparaten & services → MQTT → Configureren). Stuur bij problemen de diagnose-download en noem je Z2M-instelling `availability` (bijv. `timeout`) en het apparaatmodel. Bij batterijapparaten zet Z2M pas na uren zonder bericht „offline”.
- **Geen online/offline-status:** schakel in Zigbee2MQTT `availability: true` in. Zonder beschikbaarheid toont de stip bij het pictogram de toestand afgeleid van „laatst gezien”: halfdoorzichtig groen = binnen 25 uur gehoord, oranje = langer niets gehoord, grijs = nog geen bericht. Een tooltip bij de stip legt de herkomst uit. Rood („offline”) bestaat alleen met ingeschakelde Z2M-beschikbaarheid.
- **Apparaatafbeeldingen:** de kaart laadt de afbeeldingen rechtstreeks in de browser van `www.zigbee2mqtt.io` (dezelfde bron als de Z2M-frontend, bestand op modelnaam). Een in Z2M bij het apparaat ingesteld `icon` heeft voorrang. Is er geen afbeelding of is de site niet bereikbaar (bijv. zonder internet), dan verschijnt het pictogram. Met `show_images: false` worden geen externe verzoeken gedaan.
- **„Laatst gezien” ontbreekt:** stel `advanced.last_seen: ISO_8601` in of wijzig de bridge-optie in de bridgecategorie.
- **„Geen verbinding met de integratie”:** is de integratie geladen? Kloppen `base_topic` of `entry_id`?
- **Functies (expose) ontbreken of tonen „nog geen waarde”:** de waarde verschijnt zodra het apparaat voor het eerst heeft verstuurd (Zigbee2MQTT bewaart geen apparaatstatussen). De sectie wordt alleen getoond voor apparaten met een Zigbee2MQTT-definitie. Het laden van de details is voorbehouden aan beheerders.
- **Popup of functies (expose) zijn niet te bedienen (alleen versie 1.0.4):** werk bij naar 1.0.5, herstart Home Assistant, leeg de browsercache (Ctrl+F5) of laad de companion-app opnieuw.
- **Bridgebanner „versie niet ondersteund”:** Zigbee2MQTT 1.x wordt niet ondersteund.
- Logs: zet `custom_components.zigbee2mqtt_manager` op `debug`.

## Versiegeschiedenis

| Versie | Wijzigingen |
|---|---|
| **1.0.5** | Opgelost: popup en de sectie „Functies (expose)” waren niet te bedienen (eindeloze hertekenlus, apparaatafbeelding flikkerde). Offline-weergave beveiligd tegen verouderde meldingen. Nederlands toegevoegd (kaart, integratie, README), LICENSE en `examples/` toegevoegd. Dank aan @pr0xyzer (PR #2): koppeling van HA-entiteiten via MQTT-identifiers met meer dan twee waarden (lijst bij hernoemen). |
| 1.0.4 | Alle expose-functies in de apparaatpopup, meerdere sticks (meerdere instanties), correctie bij de apparaatopties. |
| 1.0.3 | Eerste officiële versie. |

## Bestandsintegriteit

Elk `.py`-, `.js`- en `.yaml`-bestand heeft op de eerste regel een SHA-256-hash over de inhoud vanaf regel 2. Controleren: `tail -n +2 bestand.py | sha256sum`. JSON-bestanden kunnen geen opmerkingen bevatten; hun hashes (SHA-256 over het complete bestand) staan hier:

| Bestand | SHA-256 |
|---|---|
| `custom_components/zigbee2mqtt_manager/manifest.json` | `3796bdfe99c612311c6697342de3d3e8c1aa9827efc33059c1916c89172c52c7` |
| `custom_components/zigbee2mqtt_manager/strings.json` | `714ca6bdd304f051e93e8960410630c361f942eed7ddd89c81969fe13aff9c4d` |
| `custom_components/zigbee2mqtt_manager/icons.json` | `2e739f9952d7c56a3062cef2b0a70f58441fb1bb651ca58713cb77fac72f9762` |
| `custom_components/zigbee2mqtt_manager/translations/de.json` | `a4cc4400d01de88795a97c7644a9a4c89495c99d440eec4b9b476e7784a3c0b4` |
| `custom_components/zigbee2mqtt_manager/translations/en.json` | `9072d9f52b3f1be151b46c49dc22eb16df2cec81f295841a7c1ca1c2891e634a` |
| `custom_components/zigbee2mqtt_manager/translations/nl.json` | `20ec6ad0e627be9f5ba84d6fa2520550d64d5256ca97e4cfc51f6ed1149b9467` |
| `hacs.json` | `8939982e245783f7a41fb7f76e3da661b7250b5cec9385085ab68f19cea5cfda` |

## Licentie

MIT
