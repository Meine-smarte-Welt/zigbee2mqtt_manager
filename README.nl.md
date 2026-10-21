| [🇩🇪<br>**Deutsch**](README.md) | [🇬🇧<br>**English**](README.en.md) | 🇳🇱<br>**Nederlands** | [🇫🇷<br>**Français**](README.fr.md) | [🇪🇸<br>**Español**](README.es.md) | [🇷🇸<br>**Српски**](README.sr.md) |
|:-:|:-:|:-:|:-:|:-:|:-:|

![Zigbee2MQTT Manager – banner](docs/images/zigbee2mqtt_manager.webp)

# Zigbee2MQTT Manager voor Home Assistant

📖 **Uitgebreide handleiding met achtergrond (Duits):** [Zigbee2MQTT Manager voor Home Assistant op meinesmartewelt.de](https://meinesmartewelt.de/zigbee2mqtt-manager-home-assistant/)

Beheer Zigbee2MQTT zonder Home Assistant te verlaten: apparaten, batterijen, firmware-updates, groepen, bindings en bridge in één dashboardkaart – als HACS-integratie. Opzet en ontwerp volgen de kaart van [FRITZ!Box Anrufe](https://github.com/Meine-smarte-Welt/fritzbox_anrufe): categorieën met pictogrammen, rijlijsten, detailpopup, accordeonsecties, grafische editor en vrij instelbare kleuren.

## Inhoud

- [Functies](#functies)
- [Nieuw in 1.2.1](#nieuw-in-121)
- [Afbeeldingen](#afbeeldingen)
- [Vereisten](#vereisten)
- [Installatie](#installatie)
- [De kaart](#de-kaart)
- [Kleuren](#kleuren)
- [Meerdere instanties (meerdere sticks)](#meerdere-instanties-meerdere-sticks)
- [Services](#services)
- [Gebeurtenissen voor automatiseringen](#gebeurtenissen-voor-automatiseringen)
- [Sensoren](#sensoren)
- [Versieweergave en updatemelding](#versieweergave-en-updatemelding)
- [Notification Center (optioneel)](#notification-center-optioneel)
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
| **Apparaten** | Lijst met bereikbaarheid, model, signaal, batterij, „laatst gezien”; statistiekchips als filter (offline / batterij laag / updates); zoeken; sorteren; **groeperen** per fabrikant of apparaatklasse; **filters** (status, voeding, signaal, …) |
| **Batterij** | Batterijapparaten, laagste stand eerst; kleuren volgens lage en kritieke drempel |
| **Updates** | Geïnstalleerde vs. beschikbare firmware; „alles controleren” en „alles na elkaar installeren” als achtergrondtaak met voortgang en annuleren |
| **Groepen** | Aanmaken, hernoemen, verwijderen; leden toevoegen en verwijderen |
| **Bindings** | Overzicht van alle apparaatkoppelingen; loskoppelen; opnieuw koppelen in de apparaatpopup |
| **Bridge** (tandwiel) | **App-versie** (integratie en kaart, gekleurde melding bij een nieuwe versie), status, coördinator, koppelen, bridge-opties, herstart, gebeurtenissenlogboek, **Notification Center** |

**Apparaatpopup** (tik op een rij) met accordeonsecties: Informatie · **Functies (expose)** · **Entiteiten (voor automatiseringen)** · Hernoemen (met lijst van de betrokken HA-entiteiten) · Apparaatopties (formulier uit het Z2M-optieschema) · Firmware · Bindings · Groepen · Verwijderen.

De sectie **Functies (expose)** toont alles wat Zigbee2MQTT voor het apparaat beschikbaar stelt (schakelaar, helderheid, kleur, temperatuur, linkkwaliteit …): naam, eigenschap, **actuele waarde** met eenheid, toegang (lezen / schrijven / opvragen), waardebereik of keuzewaarden, beschrijving en een markering als configuratie of diagnose. Samengestelde functies (bijv. kleur x/y) en groepen zoals licht of schakelaar worden opgelost en gegroepeerd; vanaf negen functies is er een filterveld. Zolang de sectie openstaat, worden de waarden vernieuwd zodra het apparaat iets verstuurt (hoogstens elke 3 seconden). **Schrijfbare schakelaars** (ja/nee-functies, bijv. de status van een stekker of lamp) kun je direct omzetten: de nieuwe waarde verschijnt meteen en wordt kort daarna door het apparaat bevestigd. Is de waarde nog onbekend, dan verschijnen in plaats daarvan de knoppen „Aan” en „Uit”. Alle andere functies worden alleen getoond; bedien het apparaat daarvoor zoals voorheen via de Home Assistant-entiteiten. Met `read_only: true` verdwijnen de schakelaars.

**Groeperen en filteren** (Apparaten, Batterij en Updates): de keuze **Groeperen** toont de lijst als accordeon per **fabrikant** of **apparaatklasse** (lampen, stekkers & schakelaars, verwarming & klimaat, rolluiken & zonwering, sloten, ventilatoren, knoppen & afstandsbedieningen, sensoren, overig). Elke groep toont het aantal en, indien aanwezig, de offline-apparaten; met de twee pictogrammen naast de keuze klap je alle groepen uit of in. Het inklapbare gedeelte **Filters** beperkt de lijst: status (online / offline), voeding (alleen batterij / alleen netvoeding / batterij laag), signaal (goed / matig / zwak), netwerkrol (router / eindapparaat), firmware (update beschikbaar), laatst gezien (langer dan 24 uur / 7 dagen geleden), in geen enkele Zigbee-groep, fabrikant en apparaatklasse. Meerdere filters gelden tegelijk; actieve filters verschijnen als kleine chips die je met een tik verwijdert. De apparaatklasse leidt de integratie af uit de functies van het apparaat (Zigbee2MQTT levert geen vaste klasse); apparaten zonder bekende functies komen onder „Overig”. Zonder actieve Z2M-beschikbaarheid wordt online/offline net als bij het statusbolletje afgeleid uit „laatst gezien”. Bij actieve groepering geldt `max_rows` niet.

**Ruimte, HA-apparaat en opmerking (sinds 1.2.0):** de apparatenlijst toont achter het model de **ruimte** uit Home Assistant (bepaald via het bijbehorende MQTT-apparaat; optie `show_area`). In de popup staan ook de naam van het **Home Assistant-apparaat** en, indien in Zigbee2MQTT ingesteld, de **opmerking** van het apparaat (Z2M-instelling `description`). Met `show_comment: true` verschijnt de opmerking als tweede regel in de lijst. Zoeken omvat ruimte, HA-apparaat en opmerking, en bij **Groeperen** komt **Ruimte** erbij. Verandert een ruimte of apparaatnaam in Home Assistant, dan volgt de kaart. De opmerking is in de popup te bewerken onder **Opmerking** (tekstveld, maximaal 500 tekens; **Opslaan** schrijft haar via Zigbee2MQTT naar de apparaatinstelling `description`, een leeg veld verwijdert haar; niet in de modus alleen-lezen).

**Uitgeschakelde apparaten (sinds 1.2.0, issue #7):** in Zigbee2MQTT uitgeschakelde apparaten (`disabled: true`) tellen niet meer als offline. Ze ontbreken bij „Offline”, in de sensoren, in de storingssensor en in de meldingen naar het Notification Center en hebben een eigen status „Uitgeschakeld” (badge, filter **Status → Uitgeschakeld**, teller `disabled`). De chip **Uitgeschakeld** (alleen zichtbaar als zulke apparaten bestaan) filtert de lijst, en de sensor **Uitgeschakelde apparaten** telt ze en bevat de namen als attribuut.

**Lang niets gehoord (sinds 1.2.0):** meldt Zigbee2MQTT een apparaat als online, maar stuurt het al langer dan N uur niets (standaard 24, instelbaar onder **Configureren**, 0 = uit), dan krijgt het de oranje badge „stil”, een oranje statuspunt en de tijd sinds het laatste bericht in oranje. Er is ook de chip **Stil** (alleen zichtbaar als zulke apparaten bestaan) en het filter **Status → Lang niets gehoord**. De tijd sinds het laatste bericht („5 seconden geleden”, „3 minuten geleden”) staat in elke rij; met de sortering **Laatst gezien (oudste eerst)** staan de stilste apparaten bovenaan. Vereist `advanced.last_seen: ISO_8601` in Zigbee2MQTT. De weergave is informatief; ze activeert de storingssensor alleen als je dat inschakelt.

**Entiteiten kopiëren:** de popupsectie **Entiteiten (voor automatiseringen)** toont de Home Assistant-entiteiten van het apparaat met per rij een kopieerpictogram. Het kopieerpictogram in de popupkop zet alle entiteitsnamen (één per regel) op het klembord, bijvoorbeeld om in automatiseringen en scripts te plakken. Staat de browser het klembord niet toe (dat vereist HTTPS), dan verschijnt de tekst geselecteerd in een veld om met Ctrl+C te kopiëren.

Verdere punten:

- **Cache:** batterij, signaal, OTA-status en „laatst gezien” blijven na een herstart van Home Assistant behouden (Z2M verstuurt apparaatstatussen niet retained).
- **Groepen zijn geen apparaten meer:** groepstopics verschijnen niet als schijnapparaat.
- **Bevestigen met twee klikken** in plaats van een browserdialoog bij riskante acties (verwijderen, update, herstart, loskoppelen, wissen).
- **Alleen-lezen:** `read_only: true` verbergt alle bedieningselementen die iets wijzigen (wandtablets).
- **Zoom:** `zoom` schaalt de hele kaart.
- **Talen:** Duits, Engels, Nederlands, Frans en Spaans (volgens de taal van Home Assistant).
- **Diagnose-download** met geanonimiseerde namen en IEEE-adressen.

## Nieuw in 1.2.1

- **Netwerk vanuit het hoofdscherm:** De kaart heeft een eigen categorie **Netwerk** (icoon in de balk, uit te zetten met `show_network`); zonder bekend adres legt ze uit hoe je het invult. In de apparatenlijst en onder **Bridge → Status** staat de knop **Netwerk**, die de Zigbee2MQTT-netwerkkaart opent. Het adres komt uit (1) de kaartsleutel `network_url`, (2) de integratie-optie **Adres van de netwerkkaart**, (3) de Z2M-instelling `frontend.url` (met `/#/network` erachter) of (4) de Zigbee2MQTT-app in de zijbalk (add-on met ingress). Wordt geen adres gevonden, dan ontbreekt de knop; met `show_network_link: false` verberg je hem. *Niet gecontroleerd:* of het pad `/#/network` bij elke Z2M-versie klopt en of de herkenning van de add-on in de zijbalk overal werkt – vul anders `network_url` in (bijv. `/a0d7b954_zigbee2mqtt`).
- **Links naar entiteit en apparaat:** In de popup opent een tik op een entiteitsnaam (sectie **Entiteiten**) direct het dialoogvenster van die entiteit in Home Assistant; het kopieer-icoon blijft. **Apparaat openen** (icoon in de popup-kop en knop in de sectie) leidt naar de apparaatpagina in Home Assistant met alle entiteiten. Dit vereist dat Home Assistant het MQTT-apparaat kent.
- **Naam in de zijbalk:** Onder **Configureren** stel je de **naam in de zijbalk** in (standaard „Zigbee2MQTT Manager”, maximaal 40 tekens). Dit is ook de paneeltitel, zodat het paneel te onderscheiden is van de Zigbee2MQTT-app. Het icoon blijft gelijk. De wijziging werkt direct, zonder herstart.
- **Ontbrekende apparaten:** De integratie onthoudt elk apparaat dat Zigbee2MQTT ooit heeft gemeld (naam, fabrikant, model, afbeelding, laatste waarden; overleeft herstarts). Verdwijnt een apparaat uit de Z2M-lijst, dan blijft het **grijs** zichtbaar met het label **ontbreekt**. Daarbij horen de chip **Ontbreekt**, het filter **Status → Ontbreekt in Zigbee2MQTT**, de sensor **Ontbrekende apparaten** (namen als attribuut), de gebeurtenis `zigbee2mqtt_manager_device_missing`, een regel in het gebeurtenissenlogboek en – indien ingeschakeld – het meldingstype `device_missing` in het Notification Center. Komt het apparaat terug, dan verdwijnt de markering vanzelf. **Vergeten** (in de popup, of **Alle ontbrekende vergeten** in het filter „Ontbreekt”) verwijdert het definitief uit het geheugen; alleen voor beheerders. Telt niet als ontbrekend: apparaten die je zelf via de kaart verwijdert of die Zigbee2MQTT als vertrokken meldt (10 minuten respijt) en een lege apparatenlijst (bijv. bij het starten van de bridge). Ontbrekende apparaten tellen niet mee bij „Apparaten” en veroorzaken geen storing.
- **innr-stekkers zonder afbeelding (opgelost):** Bij modellen met een spatie in de naam (bijv. `SP 120`) ontbrak de afbeelding, omdat de kaart het adres anders opbouwde dan de Z2M-frontend. Nu vervangt de kaart net als Z2M `:`, spaties en `/` door `-` en gebruikt ze ook een door Zigbee2MQTT gemelde afbeelding (`definition.icon`). *Niet gecontroleerd* op de betrokken stekkers; heeft zigbee2mqtt.io geen afbeelding voor een model, dan blijft het icoon staan.
- **Base-topic:** De optie toont nu het gebruikte base-topic in de beschrijving. Waarom na een update het standaardtopic `zigbee2mqtt` kon gelden, was in de code niet na te gaan; de integratie wijzigt het base-topic zelf niet. Controleer het onder **Configureren** als er na een update geen apparaten verschijnen.
- **Talen:** Nieuw is **Српски (Cyrillisch)** – README en kaart. De kaart heeft de belangrijkste termen in het Servisch vertaald; overige teksten verschijnen in het Engels.

## Afbeeldingen

De screenshots tonen versie 1.1.0; de nieuwe dingen uit 1.2.x (netwerkknop, links, ontbrekende apparaten) zijn er nog niet op te zien.

![Apparatenlijst in de kaart](docs/images/zigbee2mqtt_manager_karte.webp)

![Functies (expose) in de apparaat-popup](docs/images/zigbee2mqtt_manager_expose.webp)

![Groeperen en filteren](docs/images/zigbee2mqtt_manager_gruppierung.webp)

![Grafische kaarteditor](docs/images/zigbee2mqtt_manager_ui.webp)

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

**Snelle links (sinds 1.2.0):** [Repository toevoegen in HACS](https://my.home-assistant.io/redirect/hacs_repository/?owner=Meine-smarte-Welt&repository=zigbee2mqtt_manager&category=integration) · [Integratie instellen](https://my.home-assistant.io/redirect/config_flow_start/?domain=zigbee2mqtt_manager). Na het instellen toont Home Assistant eenmalig een melding, en de integratie voegt in de zijbalk het item **Zigbee2MQTT** toe (een Home Assistant-paneel, alleen voor beheerders) dat de kaart als volledige pagina toont – zonder dat je een dashboard hoeft te bouwen. Uit te schakelen onder **Configureren → Item in de zijbalk**. Een echt Lovelace-dashboard kan een integratie niet zelf aanmaken (Home Assistant biedt daarvoor geen openbare interface); een kant-en-klare sjabloon staat in `examples/dashboard-zigbee.yaml`.

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
show_group_by: true           # keuze „Groeperen”
default_group_by: none        # none | vendor | class
show_filters: true            # filtergedeelte
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
| `zigbee2mqtt_manager_device_missing` | `name`, `ieee` – een bekend apparaat ontbreekt in de Z2M-apparatenlijst (sinds 1.2.1) |

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

`Apparaten`, `Offline apparaten`, `Apparaten met lage batterij`, `Apparaten met kritieke batterij`, `Beschikbare firmware-updates`, `Uitgeschakelde apparaten` en `Groepen`. De sensoren voor offline, batterij, updates en uitgeschakelde apparaten bevatten de apparatenlijst als attribuut. Sinds 1.2.1 is er ook de sensor `Ontbrekende apparaten` (namen als attribuut).

### Verzamelstoring (binaire sensor „Storing”, sinds 1.2.0)

Een binaire sensor (apparaatklasse `problem`) vat het netwerk samen in één status. Hij staat **aan** zodra de bridge offline is, een actief apparaat offline is, een batterij laag of kritiek is of (uit te schakelen) een firmware-update openstaat resp. (in te schakelen) een apparaat lang niets liet horen. Uitgeschakelde apparaten tellen niet mee. Bedoeld voor een kleine tegel op je startpagina die rood wordt en met een tik het Zigbee-dashboard opent (`examples/kachel-leitseite.yaml`).

Attributen: `reasons` (`bridge_offline`, `offline`, `battery_low`, `battery_critical`, `update_available`, `stale`), `bridge_online`, `devices`, `offline`, `low_battery`, `critical_battery`, `updates_available`, `stale`, `disabled`, `stale_hours` en de namenlijsten `offline_devices`, `low_battery_devices`, `critical_battery_devices`, `update_devices`, `stale_devices`, `disabled_devices`.

Onder **Configureren** kies je of firmware-updates (standaard: ja) en „lang niets gehoord” (standaard: nee) de storing activeren. De entiteits-ID hangt van de taal af (bij Engelse interface bijv. `binary_sensor.zigbee2mqtt_manager_zigbee2mqtt_problem`); zie Instellingen → Apparaten & services. Een automatisering met apparatenlijst staat in `examples/sensor-stoerung-automation.yaml`. De tellersensoren hierboven tellen ook zonder uitgeschakelde apparaten.

## Versieweergave en updatemelding

De geïnstalleerde versie staat op drie plaatsen: in de kaart onder **Bridge (tandwiel) → App-versie**, bovenaan in de grafische kaarteditor en in het dialoogvenster **Configureren** van de integratie. Bij het starten en daarna elke 12 uur vraagt de integratie bij GitHub (`api.github.com`, nieuwste release, anders de hoogste versietag) of er een nieuwere versie is gepubliceerd. Is dat zo, dan wordt het gekleurd weergegeven: oranje rand en melding in de sectie, een oranje „↑” bij het tandwielpictogram, een waarschuwingsvak in de editor en een melding in het configuratiedialoogvenster. Het bijwerken zelf gaat zoals gewoonlijk via HACS. Met **Nu controleren** start je de controle direct. Is GitHub niet bereikbaar, dan verschijnt „Controle niet mogelijk”; de kaart werkt gewoon door.

Verschillen kaart- en integratieversie (verouderde browsercache), dan wordt dit ook oranje gemarkeerd.

## Notification Center (optioneel)

**Nieuw in 1.2.0.** Is de integratie **Notification Center** geïnstalleerd, dan kan Zigbee2MQTT Manager zijn meldingen daarheen sturen. Het Notification Center verzamelt de meldingen van alle gekoppelde integraties en geeft ze door (push, spraak enz.). Zonder Notification Center verandert er niets: de manager werkt als voorheen, er wordt niets verzonden en de schakelaars hebben geen effect.

De koppeling volgt de gedeelde interface (schema 1) via de gebeurtenisbus van Home Assistant. De manager meldt zich bij het starten en op verzoek zelf aan en stemt zijn beginstand af. Ze staat standaard **aan** en is op twee plekken te bedienen:

- **Kaart:** Bridge (tandwiel) → sectie **Notification Center** met een hoofdschakelaar en een schakelaar per soort melding (alleen beheerders, niet in de modus alleen-lezen). De wijziging werkt direct, zonder de integratie opnieuw te laden.
- **Configureren** van de integratie: „Meldingen naar het Notification Center sturen” en de keuze van de soorten meldingen.

| Soort melding | Urgentie | Wanneer |
|---|---|---|
| Bridge offline | kritiek | Zigbee2MQTT meldt de bridge als offline; wordt gesloten zodra hij weer online is |
| Batterij kritiek | kritiek | Batterijniveau onder de drempel „batterij kritiek” |
| Apparaat offline | waarschuwing | Zigbee2MQTT meldt het apparaat als offline |
| Batterij laag | waarschuwing | Batterijniveau onder de drempel „batterij laag”, maar niet onder „kritiek” |
| Firmware-update beschikbaar | info | Voor het apparaat is een firmware-update beschikbaar |
| Nieuw apparaat | info | Een apparaat is toegetreden tot het netwerk (eenmalig) |
| Apparaat heeft het netwerk verlaten | info | Een apparaat heeft het netwerk verlaten (eenmalig) |

De bestaande drempels uit de integratieopties gelden; er zijn geen nieuwe drempels. Een apparaat onder de kritieke drempel verschijnt alleen als „batterij kritiek”, niet extra als „laag”. Per wijziging ontstaat precies één melding; vervalt de toestand (apparaat weer online, batterij vervangen), dan wordt de melding automatisch gesloten. Na het starten wacht de manager ongeveer 20 seconden na de apparatenlijst voordat hij de beginstand meldt; die gaat als „initial” naar het Notification Center en veroorzaakt geen stortvloed aan pushmeldingen. De teksten zijn beschikbaar in het Duits, Engels, Nederlands, Frans en Spaans.

Privacy: de meldingen bevatten apparaatnamen en batterijniveaus en blijven binnen Home Assistant. Diagnose en logs bevatten alleen tellers per soort melding, geen inhoud.

## Instellingen van de integratie

Onder **Configureren** (met weergave van de geïnstalleerde versie): drempel „batterij laag”, drempel „batterij kritiek” (moet kleiner of gelijk zijn) gebeurtenissen aan/uit, meldingen naar het Notification Center aan/uit en de keuze van de soorten meldingen. Via **Opnieuw configureren** wijzig je het base-topic. Sinds 1.2.0 ook: „Lang niets gehoord na … uur” (0 = uit), „Firmware-updates activeren de storing” en „Lang niets gehoord activeert de storing”. Daarnaast: „Item in de zijbalk” (standaard: aan).

## Beveiliging

Alle schrijfacties (hernoemen, opties, functies omzetten, verwijderen, firmware, groepen, bindings, koppelen, herstart, versiecontrole, instellingen van het Notification Center) en het laden van apparaatdetails zijn via WebSocket beperkt tot **beheerders**. Invoer wordt door de backend gecontroleerd (dubbele namen, onbekende opties, toegestane bridgewaarden). Bij het omzetten van een functie controleert de backend bovendien of die bestaat, schrijfbaar is en de waarde exact de aan- of uitwaarde is. De kaart maskeert alle teksten; kleurwaarden lopen via een allowlist.

## Bekende beperkingen

- **Z2M-payloads niet getest:** `device/options`, de bindingstructuur in `bridge/devices` en de bridge-opties (`log_level`, `last_seen`). Wijkt je Z2M-versie af, dan blijft de betreffende functie zonder werking of meldt een fout.
- Apparaatopties ondersteunen eenvoudige typen (getal, schakelaar, keuze, tekst), geen geneste opties.
- De entiteitenvoorbeeldweergave bij het hernoemen vindt apparaten via de MQTT-identifiers en kan bij ongebruikelijke discovery-configuratie leeg blijven.
- „Alles installeren” wacht per apparaat maximaal twee uur op het einde van de update.
- Na een herstart komen batterij, signaal en OTA-status eerst uit de cache en worden met het volgende apparaatbericht vernieuwd.
- **Offline-weergave (sinds 1.0.5) en teststatus:** de kaart neemt de beschikbaarheid over van Zigbee2MQTT. Heeft een apparaat na een offline-melding live gestuurd, dan toont de kaart het als bereikbaar. Dit is getest met gesimuleerde gegevens, **niet op echte hardware**. Of hiermee de in 1.0.4 gemelde onjuiste offline-weergaven (sensoren, een stekker) verdwijnen, is open: feedback is nadrukkelijk welkom.
- De popup en de sectie „Functies (expose)” zijn in 1.0.5 gecorrigeerd (eindeloze hertekenlus), maar ook niet op echte hardware en niet in de iOS-/Android-companion-app getest.
- **Nieuw in 1.1.0, teststatus:** groeperen, filters, schakelaars in de functies en kopiëren zijn getest met gesimuleerde gegevens en in een headless browser, **niet op echte hardware** en niet in de iOS-/Android-companion-app. Of Zigbee2MQTT elke schakelaar zoals verwacht accepteert (bijv. bij apparaten met meerdere endpoints), is open.
- De apparaatklasse is een benadering uit de functies van het apparaat; bijzondere gevallen kunnen onder „Overig” of „Sensoren” terechtkomen.
- Schakelaars werken direct en zonder bevestiging (ook configuratieschakelaars zoals het kinderslot). Het klembord vereist HTTPS.
- **Nieuw in 1.2.0, teststatus:** de koppeling met het Notification Center, storingssensor, sensor „Uitgeschakelde apparaten”, koppeling van ruimte/HA-apparaat, opmerking (weergave en bewerken), uitgeschakelde apparaten met hun chip, „lang niets gehoord” en het zijbalkitem zijn getest met gesimuleerde MQTT-berichten en registers (pytest met de Home Assistant-testomgeving) en in een gesimuleerde browser (jsdom), **niet op echte hardware, niet tegen een echt Notification Center, niet in Safari, Chrome, Firefox of de companion-app en niet met 75 echte apparaten**. Dat geldt ook voor de oplossingen voor flikkeren en scrollsprong (issue #5); weergavewaarden zoals „laatst gezien” en signaal worden daardoor hooguit elke 2 seconden bijgewerkt. Herstart de bridge, dan kunnen apparaten afhankelijk van de beschikbaarheidsinstelling van Zigbee2MQTT kort als offline worden gemeld en daarna weer worden gesloten. De koppeling aan het HA-apparaat herkent het IEEE-adres in de MQTT-identifiers; bij ongebruikelijke discovery blijven ruimte en HA-apparaat leeg. De opmerking komt uit de Z2M-apparaatconfiguratie (`description`) en wordt bij opslaan via `bridge/request/device/options` ingesteld; of jouw Z2M-versie haar in `bridge/info` meelevert en het opslaan zoals verwacht accepteert, is niet getest. „Lang niets gehoord” is informatief en geen eigen meldingstype in het Notification Center. Het zijbalkitem is een Home Assistant-paneel en geen Lovelace-dashboard (issue #6); het is alleen getest tegen de paneelregistratie van de testomgeving, niet in een echte zijbalk.
- **Nieuw in 1.2.1, teststatus:** netwerkknop, entiteits- en apparaatlinks, grijze ontbrekende apparaten en het naamdialoogvenster zijn getest met gesimuleerde gegevens, **niet op echte hardware of een echte Home Assistant-installatie**. De Servische kaart is maar gedeeltelijk vertaald.

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
- **Kopiëren werkt niet:** de browser staat het klembord alleen toe via HTTPS (of `localhost`). Anders verschijnt de tekst geselecteerd in een veld in de popup: kopieer met Ctrl+C.
- **Een schakelaar in de functies doet niets:** het commando gaat naar `<base_topic>/<apparaat>/set`. Controleer in Zigbee2MQTT of het apparaat bereikbaar is; de kaart toont de waarde die het apparaat terugmeldt.
- **Er komt niets aan in het Notification Center:** is de integratie Notification Center geïnstalleerd en geladen? Staan de hoofdschakelaar en de soort melding aan (kaart: Bridge → Notification Center)? Na het starten wacht de manager ongeveer 20 seconden voordat hij de beginstand verzendt.
- Logs: zet `custom_components.zigbee2mqtt_manager` op `debug`.

## Versiegeschiedenis

| Versie | Wijzigingen |
|---|---|
| **1.2.2** | Nieuw: eigen categorie **Netwerk** in de kaartbalk (legt uit hoe je het adres van de netwerkkaart invult, `show_network`). Opgelost: bij Home Assistant-taal **Servisch (Latijns, `sr-Latn`)** toonden kaart, welkomstmelding en versiemelding Cyrillisch omdat alleen het taaldeel „sr” werd gebruikt; er is nu een Latijns tekstblok. |
| **1.2.1** | Nieuw: knop **Netwerk** (Zigbee2MQTT-netwerkkaart), links van entiteiten en apparaat naar Home Assistant, instelbare **naam in de zijbalk**, **ontbrekende apparaten** blijven grijs zichtbaar (chip, filter, sensor, gebeurtenis, Notification Center, „Vergeten”), taal **Српски**, README met vlaggen-taalbalk, bloglink en afbeeldingen. Opgelost: ontbrekende afbeeldingen bij modellen met spaties (bijv. innr-stekkers). |
| **1.2.0** | Nieuw: de **opmerking** van een apparaat is in de popup te **bewerken** (sectie „Opmerking”, via Zigbee2MQTT opgeslagen in `description`, niet in de modus alleen-lezen). Nieuw: chip **Uitgeschakeld** en sensor **Uitgeschakelde apparaten** (teller en namenlijst). Nieuw: **item in de zijbalk** (Home Assistant-paneel, alleen beheerders, uit te schakelen onder Configureren) dat de kaart als volledige pagina toont (issue #6). Nieuw: **koppeling met het Notification Center** (optioneel, interface schema 1) met zeven soorten meldingen (bridge offline, batterij kritiek, apparaat offline, batterij laag, firmware-update, nieuw apparaat, apparaat heeft het netwerk verlaten), hoofdschakelaar en schakelaar per soort in de kaart en in het Configureren-dialoogvenster. Nieuw: **verzamelstoring** als binaire sensor (apparaatklasse `problem`) met alle tellers en apparatenlijsten als attributen; **ruimte**, **HA-apparaat** en **opmerking** in lijst, popup en zoeken, groeperen op **ruimte**; **„lang niets gehoord”** (chip, filter, badge, instelbare uren); installatiehulpen (my.home-assistant.io-links, eenmalige melding na het instellen, dashboardsjabloon in `examples`). Opgelost (issue #7): in Zigbee2MQTT **uitgeschakelde apparaten** tellen niet meer als offline (eigen status „Uitgeschakeld”, niet in tellers, sensoren en Notification Center). Opgelost (issue #5): de kaart **flikkerde en sprong tijdens het scrollen naar boven**, omdat hij bij elke gegevensupdate volledig opnieuw werd getekend; nu worden alleen gewijzigde delen bijgewerkt (afbeeldingen, rijen, accordeons en invoerfocus blijven staan, gegevensgestuurd hertekenen hooguit elke 2 seconden). Opgelost: **typen in zoeken en velden op de desktop** activeerde Home Assistant-sneltoetsen (bijv. „e” opende de entiteitenzoeker). Opgelost (issue #4): koppeling van HA-apparaten zonder de verouderde `device_registry.devices`-toewijzing. Wijzigingen aan de Notification Center-schakelaars laden de integratie niet meer opnieuw. Engelse resten in de Duitse teksten (`strings.json`) gecorrigeerd. **Frans** (dank aan @Locodice67, PR #3; overgenomen en aangepast: je-vorm, nieuwe teksten) en **Spaans** toegevoegd. |
| **1.1.0** | Nieuw: lijsten **groeperen** per fabrikant of apparaatklasse (accordeon) en **filteren** (status online/offline, voeding, signaal, netwerkrol, firmware, laatst gezien, zonder Zigbee-groep, fabrikant, apparaatklasse; actieve filters als chips). Schrijfbare **schakelaars** onder „Functies (expose)” kun je direct omzetten. Nieuwe popupsectie **Entiteiten (voor automatiseringen)** en kopieerknoppen voor de entiteitsnamen. Editor: `show_group_by`, `default_group_by`, `show_filters`. Backend: nieuwe actie `set_expose` (alleen beheerders, waarden worden gecontroleerd) en een apparaatklasse per apparaat. |
| 1.0.5 | Opgelost: popup en de sectie „Functies (expose)” waren niet te bedienen (eindeloze hertekenlus, apparaatafbeelding flikkerde). Offline-weergave beveiligd tegen verouderde meldingen. Nederlands toegevoegd (kaart, integratie, README), LICENSE en `examples/` toegevoegd. Dank aan @pr0xyzer (PR #2): koppeling van HA-entiteiten via MQTT-identifiers met meer dan twee waarden (lijst bij hernoemen). |
| 1.0.4 | Alle expose-functies in de apparaatpopup, meerdere sticks (meerdere instanties), correctie bij de apparaatopties. |
| 1.0.3 | Eerste officiële versie. |

## Bestandsintegriteit

Elk `.py`-, `.js`- en `.yaml`-bestand heeft op de eerste regel een SHA-256-hash over de inhoud vanaf regel 2. Controleren: `tail -n +2 bestand.py | sha256sum`. JSON-bestanden kunnen geen opmerkingen bevatten; hun hashes (SHA-256 over het complete bestand) staan hier:

| Bestand | SHA-256 |
|---|---|
| `custom_components/zigbee2mqtt_manager/manifest.json` | `a6bd75c07b2f675b24a20ce819643b5aacd3230cb302321011bd6e4672153c6b` |
| `custom_components/zigbee2mqtt_manager/strings.json` | `ac757e176af1b5886ac8d0ecc016c283790f18b58e86f8be1862ec9be65fa88e` |
| `custom_components/zigbee2mqtt_manager/icons.json` | `7edb380606df1bfbae5954235fcab84bed87d0b0d5a1c40834653dbd1a7c3d7e` |
| `custom_components/zigbee2mqtt_manager/translations/de.json` | `ac757e176af1b5886ac8d0ecc016c283790f18b58e86f8be1862ec9be65fa88e` |
| `custom_components/zigbee2mqtt_manager/translations/en.json` | `474b4d4620631da7055006761799ffa86fa263b000d7ea11d44174833442aadb` |
| `custom_components/zigbee2mqtt_manager/translations/nl.json` | `e020bfd76f0218abe3fccac54311a0ce2ee164c7079c570e7e7d6c9421e4a651` |
| `custom_components/zigbee2mqtt_manager/translations/fr.json` | `3767828e16a133f260a8fc22ef997c9ccd30872f9ca18ac6fd0144594bc83f56` |
| `custom_components/zigbee2mqtt_manager/translations/es.json` | `db841a7909805d8675421a109093bea1f088bab81b50a0520927271e29a82428` |
| `custom_components/zigbee2mqtt_manager/translations/sr.json` | `cadd7f345e66f41eca696a475a3f7d4f390eaf416b9729911753e7faeddfc302` |
| `custom_components/zigbee2mqtt_manager/translations/sr-Latn.json` | `6241a89313bcacdf37a9e3d3bb78c90cc379736806ea7330ac058db7b529d528` |
| `hacs.json` | `8939982e245783f7a41fb7f76e3da661b7250b5cec9385085ab68f19cea5cfda` |

## Licentie

MIT
