[🇩🇪 Deutsch](README.md) · [🇬🇧 English](README.en.md) · [🇳🇱 Nederlands](README.nl.md) · 🇫🇷 Français

# Zigbee2MQTT Manager pour Home Assistant

Gérer Zigbee2MQTT sans quitter Home Assistant : appareils, batteries, mises à jour du firmware, groupes, bindings et bridge dans une carte de tableau de bord – en tant qu'intégration HACS. La structure et le design s'inspirent de la carte de [FRITZ!Box Anrufe](https://github.com/Meine-smarte-Welt/fritzbox_anrufe) : catégories d'icônes, listes de lignes, fenêtre de détail, sections en accordéon, éditeur graphique et couleurs librement configurables.

## Contenu

- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [La carte](#la-carte)
- [Couleurs](#couleurs)
- [Plusieurs instances (plusieurs clés)](#plusieurs-instances-plusieurs-clés)
- [Services](#services)
- [Événements pour les automatisations](#événements-pour-les-automatisations)
- [Capteurs](#capteurs)
- [Affichage de version et notification de mise à jour](#affichage-de-version-et-notification-de-mise-à-jour)
- [Paramètres de l'intégration](#paramètres-de-lintégration)
- [Sécurité](#sécurité)
- [Limitations connues](#limitations-connues)
- [Dépannage](#dépannage)
- [Historique des versions](#historique-des-versions)
- [Intégrité des fichiers](#intégrité-des-fichiers)

## Fonctionnalités

La carte comporte six catégories dans une barre d'icônes (en dessous d'environ 480 px de largeur de carte, uniquement les icônes). Chaque catégorie peut être affichée ou masquée individuellement.

| Catégorie | Ce qu'elle permet |
|---|---|
| **Appareils** | Liste avec joignabilité, modèle, signal, batterie, « vu pour la dernière fois » ; puces statistiques comme filtres (hors ligne / batterie faible / mises à jour) ; recherche ; tri ; **regroupement** par fabricant ou classe d'appareil ; **filtres** (état, alimentation, signal, …) |
| **Batterie** | Appareils sur batterie, niveau le plus faible en premier ; couleurs selon les seuils faible et critique |
| **Mises à jour** | Firmware installé vs. disponible ; « tout vérifier » et « tout installer l'une après l'autre » comme tâche d'arrière-plan avec progression et annulation |
| **Groupes** | Créer, renommer, supprimer ; ajouter et retirer des membres |
| **Bindings** | Aperçu de toutes les liaisons d'appareils ; délier ; relier à nouveau dans la fenêtre de l'appareil |
| **Bridge** (engrenage) | **Version de l'application** (intégration et carte, avec indication colorée en cas de nouvelle version), état, Coordinator, appairage, options du bridge, redémarrage, journal des événements |

**Fenêtre de l'appareil** (appui sur une ligne) avec sections en accordéon : Informations · **Fonctions (expose)** · **Entités (pour les automatisations)** · Renommage (avec la liste des entités HA concernées) · Options de l'appareil (formulaire issu du schéma d'options Z2M) · Firmware · Bindings · Groupes · Suppression.

La section **Fonctions (expose)** affiche toutes les fonctions que Zigbee2MQTT expose pour l'appareil (p. ex. interrupteur, luminosité, couleur, température, qualité du signal) : avec le nom, la propriété, la **valeur actuelle** et son unité, l'accès (lire / écrire / interroger), la plage de valeurs ou les valeurs de sélection, la description et une indication configuration ou diagnostic. Les fonctions composées (p. ex. couleur x/y) et les groupes comme éclairage ou interrupteur sont résolus et regroupés ; à partir de neuf fonctions, un champ de filtre apparaît. Tant que la section reste ouverte, les valeurs se mettent à jour dès que l'appareil envoie quelque chose (au maximum toutes les 3 secondes). Les **interrupteurs inscriptibles** (fonctions oui/non, p. ex. l'état d'une prise ou d'une lampe) peuvent être basculés directement : la nouvelle valeur s'affiche immédiatement et est confirmée peu après par l'appareil. Si la valeur est encore inconnue, les boutons « Activé » et « Désactivé » apparaissent à la place. Toutes les autres fonctions sont uniquement affichées ; pour les piloter, l'appareil reste commandé comme auparavant via ses entités Home Assistant. Avec `read_only: true`, les interrupteurs disparaissent.

**Regrouper et filtrer** (Appareils, Batterie et Mises à jour) : la sélection **Regrouper** présente la liste sous forme d'accordéon par **fabricant** ou **classe d'appareil** (lampes, prises et interrupteurs, chauffage et climat, volets et stores, serrures, ventilateurs, boutons et télécommandes, capteurs, autres). Chaque groupe affiche le nombre et, le cas échéant, les appareils hors ligne ; les deux icônes à côté de la sélection développent ou réduisent tous les groupes. La zone repliable **Filtres** restreint la liste : état (en ligne / hors ligne), alimentation (batterie uniquement / secteur uniquement / batterie faible), signal (bon / moyen / faible), rôle réseau (router / appareil terminal), firmware (mise à jour disponible), vu pour la dernière fois (il y a plus de 24 heures / 7 jours), dans aucun groupe Zigbee, fabricant et classe d'appareil. Plusieurs filtres s'appliquent simultanément ; les filtres actifs apparaissent sous forme de petites puces que l'on retire d'un appui. La classe d'appareil est déduite par l'intégration des fonctions de l'appareil (Zigbee2MQTT ne fournit pas de classe fixe) ; les appareils sans fonctions connues se retrouvent sous « Autres ». Sans disponibilité Z2M active, « en ligne/hors ligne » est déduit de « vu pour la dernière fois », comme pour le point d'état. En cas de regroupement actif, `max_rows` ne s'applique pas.

**Copier les entités :** la section **Entités (pour les automatisations)** de la fenêtre liste les entités Home Assistant de l'appareil avec une icône de copie par ligne. L'icône de copie dans l'en-tête de la fenêtre écrit tous les noms d'entités (un par ligne) dans le presse-papiers, par exemple pour les coller dans des automatisations et des scripts. Si le navigateur n'autorise pas le presse-papiers (HTTPS requis), le texte apparaît sélectionné dans un champ à copier avec Ctrl+C.

Autres points :

- **Cache :** la batterie, le signal, l'état OTA et « vu pour la dernière fois » survivent à un redémarrage de Home Assistant (Z2M ne publie pas les états des appareils en retained).
- **Les groupes ne sont plus des appareils :** les topics de groupe n'apparaissent pas comme appareils fantômes dans la liste.
- **Confirmation en deux clics** au lieu d'une boîte de dialogue du navigateur pour les actions risquées (suppression, mise à jour, redémarrage, déliaison, effacement).
- **Lecture seule :** `read_only: true` masque tous les éléments de commande permettant de modifier (tablettes murales).
- **Zoom :** `zoom` met à l'échelle toute la carte.
- **Langues :** allemand, anglais, néerlandais et français (selon la langue de Home Assistant).
- **Téléchargement de diagnostic** avec noms et adresses IEEE anonymisés.

## Prérequis

- Home Assistant **2025.6** ou version ultérieure
- Intégration **MQTT** configurée
- **Zigbee2MQTT 2.x** (la version 1.x est détectée et signalée comme non prise en charge dans la carte)
- Recommandé : définir `availability: true` dans Zigbee2MQTT, sinon il n'y a pas d'état en ligne/hors ligne. Pour « vu pour la dernière fois », définir en plus `advanced.last_seen: ISO_8601`.

## Installation

1. HACS → ⋮ → **Dépôts personnalisés** → URL de ce dépôt, catégorie **Intégration**
2. Installer « Zigbee2MQTT Manager », redémarrer Home Assistant
3. **Paramètres → Appareils et services → Ajouter une intégration → Zigbee2MQTT Manager**
4. Saisir le base topic (par défaut `zigbee2mqtt`) et choisir le seuil pour « batterie faible »

Manuellement : copier le dossier `custom_components/zigbee2mqtt_manager` vers `<config>/custom_components/`.

## La carte

L'intégration fournit la carte et l'enregistre comme ressource Lovelace (persistée, avec `?v=<version>` contre les caches de navigateur obsolètes). Vous n'avez rien à ajouter manuellement. Si Lovelace fonctionne en mode YAML, enregistrez `/zigbee2mqtt_manager_files/zigbee2mqtt-manager-card.js` comme ressource de type `module`.

Ajouter la carte : **Modifier le tableau de bord → Ajouter une carte → « Zigbee2MQTT Manager »**. L'éditeur graphique regroupe tous les réglages dans des sections repliables (catégories, affichage avec colonnes, édition, réseau, couleurs). Aucun YAML n'est nécessaire, mais c'est possible :

```yaml
type: custom:zigbee2mqtt-manager-card
title: Zigbee2MQTT Manager   # vide ("") = aucun titre
# entry_id: abc123            # uniquement avec plusieurs instances Z2M
show_devices: true
show_battery: true
show_updates: true
show_groups: true
show_bindings: true
show_bridge: true
default_tab: devices
max_rows: 0                   # 0 = tout, sinon « afficher plus »
zoom: 1
show_stats: true
show_images: true             # images des appareils depuis zigbee2mqtt.io
show_search: true
show_filter_bar: true         # sélection du tri
default_sort: name_asc        # name_asc | name_desc | battery_asc | lqi_asc | last_seen_desc | last_seen_asc | ota
show_group_by: true           # sélection « Regrouper »
default_group_by: none        # none | vendor | class
show_filters: true            # zone de filtres
show_model: true
show_vendor: true
show_ieee: false
show_lqi: true
show_battery_value: true
show_last_seen: true
read_only: false
show_pairing: true
```

Autres exemples : [`examples/`](examples/).

## Couleurs

Dans l'éditeur, sous **Couleurs** (ou via les clés `color_*`). Chaque valeur peut être un hex (`#ff9800`), `rgb()`, `hsl()` ou `var(--...)`. Vide signifie la valeur par défaut du thème. Les valeurs invalides sont ignorées. L'échantillon ouvre le sélecteur de couleur, le champ de texte accepte n'importe quelle valeur CSS, « Réinitialiser toutes les couleurs » vide tout.

| Clé | Effet |
|---|---|
| `color_tab_active` | Onglet actif, boutons principaux |
| `color_success` | Bon : en ligne, signal bon, batterie pleine, à jour |
| `color_warning` | Avertissement : batterie faible, signal moyen, mise à jour en cours |
| `color_error` | Erreur : hors ligne, batterie critique, signal faible |
| `color_info` | Mise à jour disponible (firmware, nouvelle version de l'application) |
| `color_row_icon` | Toutes les icônes de liste (remplace les couleurs de catégorie) |
| `color_live_banner` | Arrière-plan de la bannière (appairage, tâche de firmware) |
| `color_icon_devices`, `_battery`, `_updates`, `_groups`, `_bindings`, `_bridge` | Icône de la catégorie – colore l'icône d'onglet et les icônes de ligne |

Si `color_row_icon` est défini, cette couleur uniforme l'emporte.

## Plusieurs instances (plusieurs clés)

Si plus d'une instance Zigbee2MQTT fonctionne (p. ex. trois clés de coordinateur avec chacune leur propre Z2M), chacune est configurée comme une entrée distincte : **Paramètres → Appareils et services → Ajouter une intégration → Zigbee2MQTT Manager**, à chaque fois avec le **base topic** correspondant (`mqtt.base_topic` de l'instance Z2M concernée, p. ex. `zigbee2mqtt`, `zigbee2mqtt2`, `zigbee2mqtt3`). Les base topics doivent être différents et ne pas être imbriqués (pas `zigbee2mqtt` et `zigbee2mqtt/stick2`), sinon la configuration les refuse. Chaque instance reçoit ses propres capteurs, événements (avec `base_topic` dans les données) et son propre cache.

La carte offre deux possibilités :

- **Sélecteur (par défaut) :** s'il y a plus d'une instance et qu'aucune n'est fixée, une sélection des clés apparaît en haut de la carte. Le choix est mémorisé dans le navigateur.
- **Une carte par clé :** dans l'éditeur de carte, sous **Instance (clé)**, choisir l'instance, ou en YAML :

```yaml
type: custom:zigbee2mqtt-manager-card
base_topic: zigbee2mqtt2     # ou : entry_id: abc123
```

`base_topic` est la variante la plus simple, car l'`entry_id` n'est visible nulle part ailleurs. Si les deux sont définis, c'est `entry_id` qui s'applique.

## Services

Les deux services sont destinés aux automatisations. En cas de plusieurs instances, `base_topic` (ou `entry_id`) sélectionne l'instance. Sans indication, `check_updates` vérifie **toutes** les instances ; `permit_join` exige une indication en cas de plusieurs instances, afin que l'appairage ne s'ouvre jamais par erreur sur toutes les clés à la fois.

```yaml
action: zigbee2mqtt_manager.permit_join
data:
  base_topic: zigbee2mqtt2   # uniquement avec plusieurs instances
  enabled: true
  duration: 120      # secondes, 10–254, facultatif
```

```yaml
action: zigbee2mqtt_manager.check_updates
```

`check_updates` vérifie en arrière-plan tous les appareils compatibles OTA, l'un après l'autre avec un intervalle.

## Événements pour les automatisations

Désactivable dans les options de l'intégration (« Déclencher des événements Home Assistant »). Au démarrage, seul l'état initial est enregistré, il n'y a donc pas de flot d'événements.

| Événement | Données |
|---|---|
| `zigbee2mqtt_manager_device_offline` / `_device_online` | `name`, `ieee`, `base_topic` |
| `zigbee2mqtt_manager_battery_low` | `name`, `ieee`, `battery` – en cas de passage sous le seuil |
| `zigbee2mqtt_manager_update_available` | `name`, `ieee`, `installed`, `latest` |
| `zigbee2mqtt_manager_device_joined` / `_device_left` | `name`, `ieee` |

```yaml
triggers:
  - trigger: event
    event_type: zigbee2mqtt_manager_battery_low
actions:
  - action: notify.mobile_app_handy
    data:
      message: "{{ trigger.event.data.name }}: batterie {{ trigger.event.data.battery }} %"
```

## Capteurs

`Appareils`, `Appareils hors ligne`, `Appareils avec batterie faible`, `Appareils avec batterie critique`, `Mises à jour du firmware disponibles` et `Groupes`. Les capteurs pour hors ligne, batterie et mises à jour contiennent la liste des appareils comme attribut.

## Affichage de version et notification de mise à jour

La version installée figure à trois endroits : dans la carte sous **Bridge (engrenage) → Version de l'application**, en haut de l'éditeur graphique de la carte et dans la boîte de dialogue **Configurer** de l'intégration. Au démarrage, puis toutes les 12 heures, l'intégration interroge GitHub (`api.github.com`, dernière release, ou à défaut le tag de version le plus élevé) pour savoir si une version plus récente a été publiée. Le cas échéant, cela est mis en évidence par une couleur : bordure orange et indication dans la section, un « ↑ » orange sur l'icône d'engrenage, un encadré d'avertissement dans l'éditeur et une indication dans la boîte de dialogue de configuration. La mise à jour elle-même se fait comme d'habitude via HACS. Avec **Vérifier maintenant**, l'interrogation peut être déclenchée immédiatement. Si GitHub est inaccessible, « Vérification impossible » apparaît ; la carte continue de fonctionner normalement.

Si les versions de la carte et de l'intégration divergent (cache de navigateur obsolète), cela est également signalé en orange.

## Paramètres de l'intégration

Sous **Configurer** (avec affichage de la version installée) : seuil « batterie faible », seuil « batterie critique » (doit être inférieur ou égal) et activation/désactivation des événements. Via **Reconfigurer**, le base topic peut être modifié.

## Sécurité

Toutes les actions d'écriture (renommage, options, basculement de fonctions, suppression, firmware, groupes, bindings, appairage, redémarrage, vérification de version) et le chargement des détails des appareils sont réservés aux **administrateurs** via WebSocket. Les saisies sont vérifiées par le backend (noms en double, options inconnues, valeurs de bridge autorisées). Lors du basculement d'une fonction, le backend vérifie en plus qu'elle existe, qu'elle est inscriptible et que la valeur correspond exactement à sa valeur activée ou désactivée. La carte masque tous les textes ; les valeurs de couleur passent par une liste blanche.

## Limitations connues

- **Charges utiles Z2M non vérifiées :** `device/options`, la structure des bindings dans `bridge/devices` et les options du bridge (`log_level`, `last_seen`). Si votre version de Z2M diffère, la fonction concernée reste sans effet ou renvoie une erreur.
- Les options d'appareil prennent en charge les types simples (nombre, interrupteur, sélection, texte), pas les options imbriquées.
- L'aperçu des entités lors du renommage trouve les appareils via les identifiants MQTT et peut rester vide en cas de configuration de découverte inhabituelle.
- « Tout installer » attend jusqu'à deux heures par appareil la fin de la mise à jour.
- Après un redémarrage, la batterie, le signal et l'état OTA proviennent d'abord du cache et sont actualisés avec le prochain message de l'appareil.
- **Affichage hors ligne (depuis 1.0.5) et état de test :** la carte reprend la disponibilité de Zigbee2MQTT. Si un appareil a émis en direct après un signalement hors ligne, la carte le montre comme joignable. Cela a été vérifié sur des données simulées, **pas sur du matériel réel**. Savoir si cela fait disparaître les affichages hors ligne erronés signalés en 1.0.4 (capteurs, prise) reste ouvert : les retours sont explicitement bienvenus.
- La fenêtre et la section « Fonctions (expose) » ont été corrigées en 1.0.5 (boucle infinie lors du redessin), mais elles n'ont pas non plus été vérifiées sur du matériel réel ni dans l'application compagnon iOS/Android.
- **Nouveau en 1.1.0, état de test :** le regroupement, les filtres, les interrupteurs dans les fonctions et la copie ont été vérifiés avec des données simulées et dans un navigateur headless, **pas sur du matériel réel** ni dans l'application compagnon iOS/Android. Savoir si Zigbee2MQTT accepte chaque interrupteur comme prévu (p. ex. pour les appareils à plusieurs points de terminaison) reste ouvert.
- La classe d'appareil est une approximation issue des fonctions de l'appareil ; des cas particuliers peuvent se retrouver sous « Autres » ou « Capteurs ».
- Les interrupteurs agissent immédiatement et sans confirmation (y compris les interrupteurs de configuration comme le verrouillage enfant). Le presse-papiers nécessite HTTPS.

## Dépannage

- **Carte introuvable :** vider le cache du navigateur ; sous Paramètres → Tableaux de bord → Ressources, vérifier la présence de `/zigbee2mqtt_manager_files/…` (en mode YAML, à ajouter manuellement).
- **L'appareil est affiché hors ligne alors qu'il est joignable :** Zigbee2MQTT signale lui-même l'état (`<base_topic>/<appareil>/availability`). Vérifiez-y la valeur, p. ex. avec MQTT Explorer (Paramètres → Appareils et services → MQTT → Configurer). En cas de problème, veuillez envoyer le téléchargement de diagnostic et indiquer le réglage Z2M `availability` (p. ex. `timeout`) ainsi que le modèle de l'appareil. Pour les appareils sur batterie, Z2M ne passe à « hors ligne » qu'après des heures sans message.
- **Aucun état en ligne/hors ligne :** activer `availability: true` dans Zigbee2MQTT. Sans disponibilité, le point sur l'icône indique l'état déduit de « vu pour la dernière fois » : vert semi-transparent = entendu dans les 25 heures, orange = rien depuis plus longtemps, gris = aucun message encore. Une infobulle sur le point explique l'origine. Le rouge (« hors ligne ») n'existe qu'avec la disponibilité Z2M activée.
- **Images des appareils :** la carte charge les images directement dans le navigateur depuis `www.zigbee2mqtt.io` (même source que le frontend Z2M, fichier selon le nom du modèle). Un `icon` défini dans Z2M pour l'appareil est prioritaire. S'il n'y a pas d'image ou si le site est inaccessible (p. ex. sans internet), l'icône apparaît. Avec `show_images: false`, aucune requête externe n'est effectuée.
- **« Vu pour la dernière fois » manquant :** définir `advanced.last_seen: ISO_8601` ou modifier l'option du bridge dans la catégorie Bridge.
- **« Aucune connexion à l'intégration » :** l'intégration est-elle chargée ? `base_topic` ou `entry_id` sont-ils corrects ?
- **Les fonctions (expose) manquent ou affichent « aucune valeur pour l'instant » :** la valeur apparaît dès que l'appareil a émis pour la première fois (Zigbee2MQTT ne conserve pas les états des appareils). La section n'est affichée que pour les appareils disposant d'une définition Zigbee2MQTT. Le chargement des détails est réservé aux administrateurs.
- **La fenêtre ou les fonctions (expose) ne sont pas utilisables (version 1.0.4 uniquement) :** passer à 1.0.5, redémarrer Home Assistant, vider le cache du navigateur (Ctrl+F5) ou recharger l'application compagnon.
- **Bannière de bridge « version non prise en charge » :** Zigbee2MQTT 1.x n'est pas pris en charge.
- **La copie ne fonctionne pas :** le navigateur n'autorise le presse-papiers qu'en HTTPS (ou `localhost`). Sinon, le texte apparaît sélectionné dans un champ de la fenêtre : copier avec Ctrl+C.
- **Un interrupteur dans les fonctions ne fait rien :** la commande est envoyée à `<base_topic>/<appareil>/set`. Vérifiez dans Zigbee2MQTT que l'appareil est joignable ; la carte affiche la valeur que l'appareil renvoie.
- Journaux : mettre `custom_components.zigbee2mqtt_manager` sur `debug`.

## Historique des versions

| Version | Modifications |
|---|---|
| **1.1.0** | Nouveau : **regrouper** les listes par fabricant ou classe d'appareil (accordéon) et les **filtrer** (état en ligne/hors ligne, alimentation, signal, rôle réseau, firmware, vu pour la dernière fois, sans groupe Zigbee, fabricant, classe d'appareil ; filtres actifs sous forme de puces). Des **interrupteurs** inscriptibles sous « Fonctions (expose) » peuvent être basculés directement. Nouvelle section de fenêtre **Entités (pour les automatisations)** et boutons de copie pour les noms d'entités. Éditeur : `show_group_by`, `default_group_by`, `show_filters`. Backend : nouvelle action `set_expose` (administrateurs uniquement, valeurs vérifiées) et classe d'appareil par appareil. |
| 1.0.5 | Corrigé : la fenêtre et la section « Fonctions (expose) » n'étaient pas utilisables (boucle infinie lors du redessin, l'image de l'appareil clignotait). Affichage hors ligne sécurisé contre les messages obsolètes. Néerlandais ajouté (carte, intégration, README), LICENSE et `examples/` ajoutés. Merci à @pr0xyzer (PR #2) : association des entités HA via des identifiants MQTT comportant plus de deux valeurs (liste lors du renommage). |
| 1.0.4 | Toutes les fonctions expose dans la fenêtre de l'appareil, plusieurs clés (plusieurs instances), correction des options d'appareil. |
| 1.0.3 | Première version officielle. |

## Intégrité des fichiers

Chaque fichier `.py`, `.js` et `.yaml` porte sur sa première ligne un hash SHA-256 du contenu à partir de la ligne 2. Vérifier : `tail -n +2 fichier.py | sha256sum`. Les fichiers JSON ne peuvent pas contenir de commentaires ; leurs hashes (SHA-256 sur le fichier complet) figurent ici :

| Fichier | SHA-256 |
|---|---|
| `custom_components/zigbee2mqtt_manager/manifest.json` | `fcc2361d67b5c819026cd0f07fbf5e438b1db6c895875730a97e295c08447c8b` |
| `custom_components/zigbee2mqtt_manager/strings.json` | `714ca6bdd304f051e93e8960410630c361f942eed7ddd89c81969fe13aff9c4d` |
| `custom_components/zigbee2mqtt_manager/icons.json` | `2e739f9952d7c56a3062cef2b0a70f58441fb1bb651ca58713cb77fac72f9762` |
| `custom_components/zigbee2mqtt_manager/translations/de.json` | `a4cc4400d01de88795a97c7644a9a4c89495c99d440eec4b9b476e7784a3c0b4` |
| `custom_components/zigbee2mqtt_manager/translations/en.json` | `9072d9f52b3f1be151b46c49dc22eb16df2cec81f295841a7c1ca1c2891e634a` |
| `custom_components/zigbee2mqtt_manager/translations/fr.json` | `b9ff60abca3a4b610d5213e80046ebb7547ab8d23b5fabb5c9407c2083b9eda9` |
| `custom_components/zigbee2mqtt_manager/translations/nl.json` | `20ec6ad0e627be9f5ba84d6fa2520550d64d5256ca97e4cfc51f6ed1149b9467` |
| `hacs.json` | `8939982e245783f7a41fb7f76e3da661b7250b5cec9385085ab68f19cea5cfda` |

## Licence

MIT
