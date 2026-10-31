| [🇩🇪<br>**Deutsch**](README.md) | [🇬🇧<br>**English**](README.en.md) | 🇳🇱<br>**Nederlands** | [🇫🇷<br>**Français**](README.fr.md) | [🇪🇸<br>**Español**](README.es.md) | [🇷🇸<br>**Српски**](README.sr.md) |
|:-:|:-:|:-:|:-:|:-:|:-:|

![Zigbee2MQTT Manager – banner](docs/images/zigbee2mqtt_manager.webp)

# Zigbee2MQTT Manager voor Home Assistant

📖 **Uitgebreide handleiding met achtergrond (Duits):** [Zigbee2MQTT Manager voor Home Assistant op meinesmartewelt.de](https://meinesmartewelt.de/zigbee2mqtt-manager-home-assistant/)

Beheer Zigbee2MQTT zonder Home Assistant te verlaten: apparaten, batterijen, firmware-updates, groepen, bindings en bridge in één dashboardkaart – als HACS-integratie. Opzet en ontwerp volgen de kaart van [FRITZ!Box Anrufe](https://github.com/Meine-smarte-Welt/fritzbox_anrufe): categorieën met pictogrammen, rijlijsten, detailpopup, accordeonsecties, grafische editor en vrij instelbare kleuren.

## Inhoud

- [Functies](#functies)
- [Nieuw in 1.3.0](#nieuw-in-130)
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

De kaart heeft zeven categorieën in een pictogrambalk (onder ca. 480 px kaartbreedte alleen pictogrammen). Elke categorie is afzonderlijk te tonen of te verbergen.

| Categorie | Wat het kan |
|---|---|
| **Apparaten** | Lijst met bereikbaarheid, model, signaal, batterij, „laatst gezien”; statistiekchips als filter (offline / batterij laag / updates); zoeken; sorteren; **groeperen** per fabrikant of apparaatklasse; **filters** (status, voeding, signaal, …) |
| **Batterij** | Batterijapparaten, laagste stand eerst; kleuren volgens lage en kritieke drempel |
| **Updates** | Geïnstalleerde vs. beschikbare firmware; „alles controleren” en „alles na elkaar installeren” als achtergrondtaak met voortgang en annuleren |
| **Groepen** | Aanmaken, hernoemen, verwijderen; leden toevoegen en verwijderen |
| **Bindings** | Overzicht van alle apparaatkoppelingen; loskoppelen; opnieuw koppelen in de apparaatpopup |
| **Netwerk** | **Netwerkkaart** uit de buurtabellen van de routers: bovenaan coördinator, routers en eindapparaat-wolken, daaronder per router een accordeon met zijn verbindingen; knop naar de Zigbee2MQTT-interface |
| **Bridge** (tandwiel) | **App- en Zigbee2MQTT-versie** (automatische controle, gekleurde releaselink en blijvende HA-melding), status, coördinator, koppelen, bridge-opties, herstart, gebeurtenissenlogboek, **Notification Center** |

**Apparaatpopup** (tik op een rij) met accordeonsecties: Informatie · **Functies (expose)** · **Entiteiten (voor automatiseringen)** · Hernoemen (met lijst van de betrokken HA-entiteiten) · Apparaatopties (formulier uit het Z2M-optieschema) · Firmware · Bindings · Groepen · Verwijderen.

De sectie **Functies (expose)** toont alles wat Zigbee2MQTT voor het apparaat beschikbaar stelt (schakelaar, helderheid, kleur, temperatuur, linkkwaliteit …): naam, eigenschap, **actuele waarde** met eenheid, toegang (lezen / schrijven / opvragen), waardebereik of keuzewaarden, beschrijving en een markering als configuratie of diagnose. Samengestelde functies (bijv. kleur x/y) en groepen zoals licht of schakelaar worden opgelost en gegroepeerd; vanaf negen functies is er een filterveld. Zolang de sectie openstaat, worden de waarden vernieuwd zodra het apparaat iets verstuurt (hoogstens elke 3 seconden). **Schrijfbare schakelaars** (ja/nee-functies, bijv. de status van een stekker of lamp) kun je direct omzetten: de nieuwe waarde verschijnt meteen en wordt kort daarna door het apparaat bevestigd. Is de waarde nog onbekend, dan verschijnen in plaats daarvan de knoppen „Aan” en „Uit”. Alle andere functies worden alleen getoond; bedien het apparaat daarvoor zoals voorheen via de Home Assistant-entiteiten. Met `read_only: true` verdwijnen de schakelaars.

**Groeperen en filteren** (Apparaten, Batterij en Updates): de keuze **Groeperen** toont de lijst als accordeon per **fabrikant** of **apparaatklasse** (lampen, stekkers & schakelaars, verwarming & klimaat, rolluiken & zonwering, sloten, ventilatoren, knoppen & afstandsbedieningen, sensoren, overig). Elke groep toont het aantal en, indien aanwezig, de offline-apparaten; met de twee pictogrammen naast de keuze klap je alle groepen uit of in. Het inklapbare gedeelte **Filters** beperkt de lijst: status (online / offline), voeding (alleen batterij / alleen netvoeding / batterij laag), signaal (goed / matig / zwak), netwerkrol (router / eindapparaat), firmware (update beschikbaar), laatst gezien (langer dan 24 uur / 7 dagen geleden), in geen enkele Zigbee-groep, fabrikant en apparaatklasse. Meerdere filters gelden tegelijk; actieve filters verschijnen als kleine chips die je met een tik verwijdert. De apparaatklasse leidt de integratie af uit de functies van het apparaat (Zigbee2MQTT levert geen vaste klasse); apparaten zonder bekende functies komen onder „Overig”. Zonder actieve Z2M-beschikbaarheid wordt online/offline net als bij het statusbolletje afgeleid uit „laatst gezien”. Bij actieve groepering geldt `max_rows` niet.

**Ruimte, HA-apparaat en beschrijving (sinds 1.2.0):** de apparatenlijst toont achter het model de **ruimte** uit Home Assistant (bepaald via het bijbehorende MQTT-apparaat; optie `show_area`). In de popup staan ook de naam van het **Home Assistant-apparaat** en, indien in Zigbee2MQTT ingesteld, de **beschrijving** van het apparaat (Z2M-instelling `description`). Met `show_description: true` (standaard) verschijnt ze als tweede regel in de lijst en gemarkeerd bovenaan de popup. Zoeken omvat ruimte, HA-apparaat en beschrijving, en bij **Groeperen** komt **Ruimte** erbij. Verandert een ruimte of apparaatnaam in Home Assistant, dan volgt de kaart. De beschrijving is in de popup te bewerken onder **Beschrijving** (tekstveld, maximaal 500 tekens; **Opslaan** schrijft haar via Zigbee2MQTT naar de apparaatinstelling `description`, een leeg veld verwijdert haar; niet in de modus alleen-lezen).

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

## Nieuw in 1.3.0

> **Teststand:** Alles wat hier staat is met gesimuleerde gegevens getest, **niet op echte hardware** (details onder [Bekende beperkingen](#bekende-beperkingen)).

- **Pictogram van de integratie naast de titel (verzoek):** Links van de kaarttitel verschijnt het pictogram van de integratie. In de kaarteditor onder **Weergave** zet je het met de schakelaar **Pictogram van de integratie naast de titel tonen** (`show_title_icon`, standaard: aan) aan of uit; in YAML: `show_title_icon: false`. Het werkt alleen als de titel wordt getoond. Het bestand (`zigbee2mqtt-manager-icon.png`) staat in de map `www` van de integratie; kan het niet worden geladen, dan verschijnt de titel gewoon zonder pictogram.
- **Kaarteditor in meerdere talen (issue #22, dank aan @robex2005):** labels, hulpteksten, sectietitels, kleurvelden en de versieweergave in de editor volgen de taal van Home Assistant: Duits (ongewijzigd), Engels, Nederlands, Frans, Spaans en Roemeens. Servisch (`sr`, `sr-Latn`) en andere talen vallen in de editor terug op Engels. De Nederlandse, Franse, Spaanse en Roemeense editorteksten zijn door mij geschreven en **niet door moedertaalsprekers gecontroleerd**.
- **Roemeens (dank aan @robex2005, PR #21):** nieuwe taal `ro` voor de integratie (installatie, opties, entiteitsnamen, services), de kaart, het welkomstbericht en de Notification-Center-teksten. De teksten komen uit de pull request; de tien teksten van de nieuwe functies (zoom, verloren apparaten), de teksten voor de beschrijving, de tip over het verschuiven van de kaart en de twee optieteksten heb ik zonder moedertaalspreker aangevuld. Er is nog geen Roemeense README. De nieuwe teksten van deze versie zijn eveneens zonder moedertaalspreker aangevuld.
- **Issues #19 en #20:** betreffen volgens de reacties de integratie *FRITZ!Box Netzwerk*, niet deze; hier is niets gewijzigd.
- **Netwerkkaart in de kaart (categorie Netwerk):** Bovenaan staat een tekening naar het voorbeeld van [FRITZ!Box Netwerk](https://github.com/Meine-smarte-Welt/fritzbox_netzwerk): links de **coördinator**, naar rechts de **routers** (een kolom per hop), en bij elke router een gestippelde **wolk** met het aantal eindapparaten. Het getal bij een lijn is de verbindingskwaliteit (LQI). Een tik op een router opent het apparaat-popup, een tik op een wolk klapt het bijbehorende accordeon open. Daaronder staat **per coördinator en router een accordeon** met **verbindingen met routers** (naam, relatie ouder / kind / buur, signaal) en **eindapparaten** (naam, signaal); eindapparaten zonder bekende verbinding krijgen een eigen accordeon. De knop **Netwerk opnieuw inlezen** (bevestiging met twee klikken, alleen beheerders, niet in alleen-lezen-modus) vraagt Zigbee2MQTT om de netwerkkaart. Zigbee2MQTT leest daarvoor **elk apparaat afzonderlijk** uit; dat duurt afhankelijk van het netwerk enkele minuten en belast het Zigbee-netwerk (na 10 minuten stopt de integratie). Het resultaat wordt opgeslagen en blijft na herstarts bewaard; „Stand: … geleden” toont de leeftijd. De knop **Zigbee2MQTT-interface openen** blijft (adres zoals in 1.2.1). *Niet getest op echte hardware:* opbouw en duur van het antwoord van Zigbee2MQTT. **Let op de nauwkeurigheid:** Zigbee2MQTT levert buurtabellen, geen vaste routes. De kaart hangt elke router aan de weg naar de coördinator met de laagste kosten (sterke verbindingen, weinig hops) en elk eindapparaat aan de router die het als kind vermeldt (anders aan de beste verbinding). Dat is een **benadering**; de echte routes kunnen afwijken. De tekening wordt op ware grootte getoond en scrolt in smalle kaarten horizontaal. **Zoom:** Boven de tekening staat een **zoombalk** met knoppen voor uitzoomen, inzoomen, **Passend maken** en 100 %; op een smartphone zoom je met **twee vingers** (uit elkaar / naar elkaar toe), op desktop ook met **Ctrl + muiswiel**. De zoom loopt van 15 tot 300 % en wordt in de browser onthouden. **Verschuiven:** houd de linkermuisknop ingedrukt en sleep om de tekening naar links, rechts, boven en onder te verschuiven (alleen muis; op een smartphone veeg je zoals gewoonlijk). Op de desktop heeft de tekening een vaste maximale hoogte (78 % van de vensterhoogte, hoogstens 760 px) en scrolt dan ook verticaal, wat bij sterke zoom nodig is. Een gewone klik op een router opent nog steeds de popup; na het slepen wordt de klik onderdrukt. *Het slepen is alleen met gesimuleerde muisgebeurtenissen in een headless browser (Chromium) getest, niet in een echte Home Assistant-installatie.* *Het twee-vingergebaar is alleen met gesimuleerde aanraakgebeurtenissen in een headless browser getest, niet op een echte smartphone en niet in de companion-app.* Routers zonder bekende weg staan oranje en gestippeld onder de coördinator.
- **Offline-status negeren (issue #15):** Het apparaat-popup heeft een sectie **Bewaking** met de schakelaar **Offline-status negeren** (alleen beheerders). Zo gemarkeerde apparaten tellen niet als offline: geen storing, geen gebeurtenis, geen melding aan het Notification Center, geen vermelding bij „Offline”. De status is **Offline, wordt genegeerd** (badge en filter **Status → Offline genegeerd**). Bedoeld voor bijv. lampen achter een wandschakelaar. De keuze geldt per apparaat en blijft na herstarts bewaard.
- **Beschrijving tonen (issue #16):** het veld **Beschrijving** uit Zigbee2MQTT (Z2M-instelling `description`, bijvoorbeeld voor de locatie en de datum van de batterijwissel) staat nu op drie plaatsen: als **cursieve regel in de apparatenlijst**, **gemarkeerd bovenaan de apparaat-popup** en om te bewerken in het popupgedeelte **Beschrijving** (alleen beheerders). Tot nu toe heette je eigen tekst in de kaart *Opmerking*, terwijl *Beschrijving* de fabrikanttekst van het product was; dat is nu omgekeerd: jouw tekst heet **Beschrijving**, de fabrikanttekst **Productbeschrijving**. De kaartoptie heet nu `show_description` (standaard: aan; in de editor **Beschrijving uit Zigbee2MQTT in de lijst tonen**). De oude sleutel `show_comment` wordt genegeerd: hij stond tot 1.2.2 standaard uit en de kaarteditor schreef hem in veel kaarten als `false`, waardoor de beschrijving ondanks de nieuwe standaard onzichtbaar bleef. Wil je de regel verbergen, zet dan `show_description: false`. De integratie leest de tekst uit de instellingen van Zigbee2MQTT (`bridge/info`); ontbreekt het apparaat daar, dan gebruikt ze het veld `description` uit de apparatenlijst (`bridge/devices`).
- **Getallen intypen in plaats van alleen schuiven (issue #17):** onder **Instellingen → Apparaten en services → Zigbee2MQTT Manager → Configureren** hebben de schuifregelaars (batterij laag en kritiek in %, „Lang niets gehoord” in uren, „Verloren” in dagen, de batterijdrempel bij het instellen) nu **een invoerveld ernaast**: typ de exacte waarde of blijf schuiven. In de grafische kaarteditor zijn `max_rows` en `zoom` ook **invoervelden**. *Niet getest:* het optiesvenster is niet in een draaiende Home Assistant-installatie geopend. *Let op:* het deel van het issue over de *Matter Manager* hoort bij een ander project en is hier niet gewijzigd.
- **Externe MQTT-broker (issue #14, experimenteel):** Bij de installatie en bij **Opnieuw configureren** kun je optioneel adres, poort, gebruikersnaam, wachtwoord en TLS van een **eigen MQTT-broker** invullen. Is het adres leeg (standaard), dan gebruikt de integratie zoals voorheen de MQTT-integratie van Home Assistant. Met adres verbindt ze zelf (paho-mqtt) met die broker, bijv. voor Zigbee2MQTT op een tweede locatie via VPN; de installatie test de verbinding. Zonder de MQTT-integratie van Home Assistant voor deze broker kent Home Assistant deze apparaten niet: **ruimte, HA-apparaat en de entiteitenlijst blijven leeg**, alleen de Zigbee2MQTT-gegevens verschijnen. Per broker en base topic is maar één vermelding mogelijk. Het wachtwoord staat in de configuratie-vermelding van Home Assistant (niet in de diagnose-download). *Niet getest* met een echte externe broker.
- **Zigbee2MQTT-updatecontrole (dank aan @seebaer1976, PR #18):** Bij het starten en daarna elke 12 uur vraagt de integratie GitHub (Koenkk/zigbee2mqtt) of er een nieuwere Zigbee2MQTT-versie is. Onder **Bridge → Status** staat achter de Z2M-versie groen **Actueel** of oranje **Update beschikbaar: {versie}** met een link naar de release-notities; **Nu controleren** start de aanvraag direct (niet in alleen-lezen-modus). Is er een update, dan verschijnt ook een persistente Home Assistant-melding per instantie, die verdwijnt zodra een controle geen update meer toont. Zigbee2MQTT wordt niet automatisch geïnstalleerd; werk het handmatig bij op de Z2M-server of in de Docker-container. Is GitHub onbereikbaar, dan staat er „Controle niet mogelijk”. Teksten in alle talen toegevoegd. *Niet getest:* de aanvraag bij GitHub en de melding in een echte Home Assistant-installatie.
- **Verloren apparaten herkennen:** Zigbee2MQTT meldt een verdwenen apparaat alleen als de beschikbaarheid (`availability`) actief is, bij batterijapparaten pas na uren; anders blijft het met zijn laatste waarden staan. Nieuw onder **Configureren**: **„Verloren” na (dagen)** (standaard 7, 0 = uit). Een apparaat waarvan al langer geen bericht kwam, geldt als **offline**: rode stip, badge **verloren**, melding „laatste bericht …”. Het telt mee bij „Offline”, in de storingssensor, in gebeurtenissen en in het Notification Center en is te filteren met **Status → Verloren**. De schakelaar **Offline-status negeren** (per apparaat) zet dit uit, handig voor knoppen of contacten die weken niets sturen. Opgeslagen (retained) waarden van de broker tellen niet meer als nieuw bericht. De tijd komt uit `last_seen` van Zigbee2MQTT (`advanced.last_seen: ISO_8601`), anders uit het laatst ontvangen bericht. *Niet getest in Home Assistant en op echte hardware; alleen de tijdsberekening en de weergave zijn met gesimuleerde gegevens gecontroleerd. Apparaten die van nature zelden sturen, kunnen ten onrechte als verloren gelden: verhoog de termijn of negeer de offline-status.*
- **Al opgelost in 1.2.2:** de issues #12 en #13 waren met 1.2.2 afgehandeld (zie versiegeschiedenis).

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
show_title_icon: true        # pictogram van de integratie naast de titel
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
show_description: true      # beschrijving uit Zigbee2MQTT in de lijst
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
| `color_info` | Update beschikbaar (firmware, app- of Zigbee2MQTT-versie) |
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

De app-versie staat in de kaart, de editor en het dialoogvenster **Configureren**. Bij het starten en daarna elke 12 uur controleert de integratie GitHub op nieuwe app- en Zigbee2MQTT-versies. Onder **Bridge → Status** staat achter de geïnstalleerde Z2M-versie groen **Actueel** of oranje **Update beschikbaar: {versie}**. De oranje melding linkt rechtstreeks naar de releasenotities. Per instantie wordt ook een blijvende Home Assistant-melding aangemaakt; die verdwijnt na een geslaagde controle zodra de geïnstalleerde versie actueel is. **Nu controleren** start direct een controle. Zigbee2MQTT werk je handmatig bij op de server of in de Docker-container, niet via HACS. Is GitHub niet bereikbaar, dan verschijnt „Controle niet mogelijk” en blijft de kaart werken.

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

Onder **Configureren** (met weergave van de geïnstalleerde versie): drempel „batterij laag”, drempel „batterij kritiek” (moet kleiner of gelijk zijn) gebeurtenissen aan/uit, meldingen naar het Notification Center aan/uit en de keuze van de soorten meldingen. Via **Opnieuw configureren** wijzig je het base-topic. Sinds 1.2.0 ook: „Lang niets gehoord na … uur” (0 = uit), „Firmware-updates activeren de storing” en „Lang niets gehoord activeert de storing”. Daarnaast: „Item in de zijbalk” (standaard: aan). Nieuw in 1.3.0: optioneel **externe MQTT-broker** (adres, poort, gebruikersnaam, wachtwoord, TLS; experimenteel). Nieuw in 1.3.0: **„Verloren” na (dagen)** (standaard 7, 0 = uit). De getalvelden (batterij, uren, dagen) hebben een schuifregelaar met invoerveld.

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
- **Teststand 1.3.0:** Getest zijn de verwerking van de netwerkkaart (knopen en verbindingen inlezen, boom opbouwen, defecte antwoorden) met een testprogramma en de kaart in een headless browser (Chromium) met gesimuleerde gegevens (10 routers, 40 eindapparaten, een router zonder verbinding): alle tabbladen, het apparaat-popup met de schakelaar, accordeons, bevestiging met twee klikken, laadtoestand en alleen-lezen-modus in alle zeven talen. **Niet getest:** op echte hardware en met het echte antwoord van Zigbee2MQTT (formaat, duur, belasting van het netwerk), met zeer grote netwerken, in de iOS-/Android-companion-app. Het Python-deel (opvragen van de netwerkkaart, opslag, offline negeren, installatie, **externe broker**, **Z2M-updatecontrole**) is alleen met `py_compile` en `pyflakes` op syntaxisfouten en onbekende namen gecontroleerd en **niet in Home Assistant uitgevoerd**; hetzelfde geldt voor het Notification-Center-deel van de schakelaar. De netwerktekening is een benadering van de echte routes. De Servische kaart is maar gedeeltelijk vertaald. Ook getest: het titelpictogram (aan/uit, kapot beeldbestand, lege of verborgen titel, titel met speciale tekens) en de kaarteditor in alle talen zijn in een headless browser getest; de editor in een echte Home Assistant-installatie (echt `ha-form`) is **niet** getest. Ook getest in een headless browser met gesimuleerde gegevens: het slepen van de netwerkkaart met de muis (horizontaal en verticaal, klik na het slepen onderdrukt, een gewone klik opent de popup), de beschrijving in lijst en popup (ook met een oude `show_comment: false` in de configuratie), de kaarteditor en alle tabbladen in alle acht taalvarianten. **Niet getest:** het optiesvenster met schuifregelaar en invoerveld in Home Assistant, slepen op echte apparaten en met touch, en het lezen van de beschrijving uit `bridge/devices` bij een echte Zigbee2MQTT.
- **Teststand 1.3.1:** Het springen van de lijst kon in Chromium alleen worden nagebootst door `focus()` te laten scrollen zoals in Firefox/Safari (1.3.0 sprong, 1.3.1 niet). In Firefox, Safari, de companion-app en op een echte Home Assistant-installatie met 97 apparaten is het **niet getest**. Feedback is uitdrukkelijk welkom (vermeld de browser of app).

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
| **1.3.1** | Opgelost: de **apparatenlijst sprong tijdens het scrollen steeds terug naar boven** (met 97 apparaten nauwelijks bruikbaar). Vermoedelijke oorzaak: bij elke hertekening gaf de kaart het laatst gebruikte veld (zoeken, sortering, groeperen, filter) met `focus()` weer de focus; Firefox, Safari en de companion-app scrollen dat veld dan in beeld, dus naar boven. Een veld dat nog focus heeft blijft nu ongemoeid, een vervangen veld krijgt de focus terug zonder te scrollen, en de kaart herstelt na elke hertekening de scrollpositie. |
| **1.3.0** | Nieuw: **netwerkkaart** in de categorie Netwerk (coördinator, routers en eindapparaat-wolken als tekening, daaronder per router een accordeon met de verbindingen; inlezen met „Netwerk opnieuw inlezen”), met **zoom** (zoombalk, twee-vingergebaar, Ctrl + muiswiel) en **slepen met ingedrukte muisknop** in alle richtingen. Nieuw: de **beschrijving** uit Zigbee2MQTT in de apparatenlijst en bovenaan de apparaat-popup (issue #16; kaartoptie nu `show_description`, de fabrikanttekst heet nu **Productbeschrijving**). Nieuw: **getalvelden in het optiesvenster met invoerveld naast de schuifregelaar** (issue #17); `max_rows` en `zoom` zijn invoervelden in de kaarteditor. Nieuw: **verloren apparaten** (al dagen geen bericht) gelden als offline, instelling „Verloren” na (dagen). Nieuw: **offline-status negeren** per apparaat (issue #15). Nieuw: optionele **externe MQTT-broker** (issue #14, experimenteel). Nieuw: **Zigbee2MQTT-updatecontrole met melding en notificatie** (PR #18, @seebaer1976). Nieuw: **pictogram van de integratie naast de kaarttitel** (`show_title_icon`). Nieuw: **kaarteditor in meerdere talen** (issue #22). Nieuw: taal **Roemeens** (PR #21, dank aan @robex2005). De issues #12 en #13 waren al met 1.2.2 opgelost. |
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
| `custom_components/zigbee2mqtt_manager/manifest.json` | `c8d664a526850e818abf38b028d155e9022e261b0cee9d05145dab6f8020cf14` |
| `custom_components/zigbee2mqtt_manager/strings.json` | `3921c4b01e2e3fca583882d3a883c2019214047581868faee897b7e3307a3825` |
| `custom_components/zigbee2mqtt_manager/icons.json` | `7edb380606df1bfbae5954235fcab84bed87d0b0d5a1c40834653dbd1a7c3d7e` |
| `custom_components/zigbee2mqtt_manager/translations/de.json` | `3921c4b01e2e3fca583882d3a883c2019214047581868faee897b7e3307a3825` |
| `custom_components/zigbee2mqtt_manager/translations/en.json` | `8dcea0ab3f34b5a2226f25a3e1d91a44423dc5f0f35e1ab0565e96abcbba7312` |
| `custom_components/zigbee2mqtt_manager/translations/nl.json` | `8db26c0986d9d9e9a5065333ef30df75ba9118f344888ec45d11a505841fd4a3` |
| `custom_components/zigbee2mqtt_manager/translations/fr.json` | `3986ca1dc4a18b2a0d0b8a00c64b6db82c287d1065a5c772030fc92b3db4ce97` |
| `custom_components/zigbee2mqtt_manager/translations/es.json` | `29a6c7348566e15615e4255967b2b2997996c456cd933311f22c6d63faf9454e` |
| `custom_components/zigbee2mqtt_manager/translations/sr.json` | `f61a2804048df76e6b02959a4e4ffa055873c873f7619d71fd442cb856ef49ef` |
| `custom_components/zigbee2mqtt_manager/translations/ro.json` | `c784629c98cdd1be67b9d9385c5d8a059bd7a78aaacba28ab728784930c4add2` |
| `custom_components/zigbee2mqtt_manager/translations/it.json` | `2fad970b82ac3d435b745cdd627e68cfa87fe3fd4304f8e3fc067cfe37264cb7` |
| `custom_components/zigbee2mqtt_manager/translations/sr-Latn.json` | `3f9409ca40f49be3f353d8eac7c2945cf3b6c42994557ef85e06d14a337934a1` |
| `hacs.json` | `8939982e245783f7a41fb7f76e3da661b7250b5cec9385085ab68f19cea5cfda` |

## Licentie

MIT
