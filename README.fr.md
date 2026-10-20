🇩🇪 [Deutsch](README.md) · [🇬🇧 English](README.en.md) · [🇳🇱 Nederlands](README.nl.md) · 🇫🇷 Français · [🇪🇸 Español](README.es.md)

# Zigbee2MQTT Manager pour Home Assistant

Gérer Zigbee2MQTT sans quitter Home Assistant : appareils, batteries, mises à jour du firmware, groupes, bindings et bridge dans une seule carte de tableau de bord – en tant qu'intégration HACS. La structure et le design s'inspirent de la carte de [FRITZ!Box Anrufe](https://github.com/Meine-smarte-Welt/fritzbox_anrufe) : catégories à icônes, listes de lignes, fenêtre de détails, sections en accordéon, éditeur graphique et couleurs librement réglables.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [La carte](#la-carte)
- [Couleurs](#couleurs)
- [Plusieurs instances (plusieurs clés)](#plusieurs-instances-plusieurs-clés)
- [Services](#services)
- [Événements pour les automatisations](#événements-pour-les-automatisations)
- [Capteurs](#capteurs)
- [Affichage de la version et avis de mise à jour](#affichage-de-la-version-et-avis-de-mise-à-jour)
- [Notification Center (optionnel)](#notification-center-optionnel)
- [Paramètres de l'intégration](#paramètres-de-lintégration)
- [Sécurité](#sécurité)
- [Limitations connues](#limitations-connues)
- [Dépannage](#dépannage)
- [Historique des versions](#historique-des-versions)
- [Intégrité des fichiers](#intégrité-des-fichiers)

## Fonctionnalités

La carte comporte six catégories dans une barre d'icônes (en dessous d'environ 480 px de largeur, seules les icônes sont affichées). Chaque catégorie peut être affichée ou masquée séparément.

| Catégorie | Fonctions |
|---|---|
| **Appareils** | Liste avec joignabilité, modèle, signal, batterie, « dernière activité » ; puces de statistiques servant de filtres (hors ligne / batterie faible / mises à jour) ; recherche ; tri ; **regroupement** par fabricant ou classe d'appareil ; **filtres** (état, alimentation, signal, …) |
| **Batterie** | Appareils sur pile, niveau le plus bas en premier ; couleurs selon les seuils faible et critique |
| **Mises à jour** | Firmware installé et disponible ; « Tout vérifier » et « Tout installer l'un après l'autre » comme tâche de fond avec progression et annulation |
| **Groupes** | Créer, renommer, supprimer ; ajouter et retirer des membres |
| **Bindings** | Vue d'ensemble de tous les liens entre appareils ; suppression ; nouveau lien dans la fenêtre de l'appareil |
| **Bridge** (roue dentée) | **Version de l'application** (intégration et carte, avec avis coloré en cas de nouvelle version), état, coordinateur, appairage, options du bridge, redémarrage, journal des événements, **Notification Center** |

**Fenêtre de l'appareil** (toucher une ligne) avec sections en accordéon : Informations · **Fonctions (expose)** · **Entités (pour les automatisations)** · Renommer (avec la liste des entités HA concernées) · Options de l'appareil (formulaire issu du schéma d'options Z2M) · Firmware · Bindings · Groupes · Supprimer.

La section **Fonctions (expose)** affiche toutes les fonctions que Zigbee2MQTT fournit pour l'appareil (p. ex. interrupteur, luminosité, couleur, température, qualité de liaison) : avec nom, propriété, **valeur actuelle** et unité, accès (lecture / écriture / interrogation), plage de valeurs ou valeurs au choix, description et indication de configuration ou de diagnostic. Les fonctions composées (p. ex. couleur x/y) et les groupes comme lumière ou interrupteur sont décomposés et regroupés ; à partir de neuf fonctions, un champ de filtre est proposé. Tant que la section est ouverte, les valeurs se mettent à jour dès que l'appareil envoie quelque chose (au plus toutes les 3 secondes). Les **interrupteurs modifiables** (fonctions oui/non, p. ex. l'état d'une prise ou d'une lumière) se basculent directement : la nouvelle valeur s'affiche aussitôt et est confirmée peu après par l'appareil. Si la valeur est encore inconnue, les boutons « Marche » et « Arrêt » s'affichent à la place. Toutes les autres fonctions sont uniquement affichées ; l'appareil se commande comme avant via ses entités Home Assistant. Avec `read_only: true`, les interrupteurs disparaissent.

**Regrouper et filtrer** (Appareils, Batterie et Mises à jour) : la sélection **Regrouper** présente la liste en accordéon par **fabricant** ou **classe d'appareil** (lampes, prises et interrupteurs, chauffage et climat, volets et stores, serrures, ventilateurs, boutons et télécommandes, capteurs, autres). Chaque groupe indique le nombre d'appareils et, le cas échéant, ceux hors ligne ; les deux icônes à côté de la sélection déplient ou replient tous les groupes. La zone repliable **Filtres** restreint la liste : état (en ligne / hors ligne), alimentation (pile uniquement / secteur uniquement / batterie faible), signal (bon / moyen / faible), rôle réseau (routeur / appareil terminal), firmware (mise à jour disponible), dernière activité (il y a plus de 24 heures / 7 jours), dans aucun groupe Zigbee, fabricant et classe d'appareil. Plusieurs filtres s'appliquent en même temps ; les filtres actifs apparaissent sous forme de petites puces que l'on retire d'un toucher. L'intégration déduit la classe d'appareil des fonctions de l'appareil (Zigbee2MQTT ne fournit pas de classe fixe) ; les appareils sans fonctions connues vont dans « Autres ». Sans disponibilité Z2M active, « en ligne/hors ligne » est déduit de « dernière activité », comme pour le point d'état. `max_rows` ne s'applique pas lorsque le regroupement est actif.

**Pièce, appareil HA et commentaire (depuis 1.1.1b3) :** la liste des appareils affiche après le modèle la **pièce** de Home Assistant (déterminée via l'appareil MQTT correspondant ; option `show_area`). La fenêtre contextuelle indique aussi le nom de l'**appareil Home Assistant** et, s'il est défini dans Zigbee2MQTT, le **commentaire** de l'appareil (réglage Z2M `description`). Avec `show_comment: true`, le commentaire apparaît sur une deuxième ligne dans la liste. La recherche couvre la pièce, l'appareil HA et le commentaire, et **Regrouper** propose en plus **Pièce**. Si une pièce ou un nom d'appareil change dans Home Assistant, la carte suit.

**Appareils désactivés (depuis 1.1.1b3, issue #7) :** les appareils désactivés dans Zigbee2MQTT (`disabled: true`) ne comptent plus comme hors ligne. Ils sont exclus de « Hors ligne », des capteurs, du capteur de problème et des messages vers le Notification Center, et ont leur propre état « Désactivé » (badge, filtre **État → Désactivé**, compteur `disabled`).

**Silencieux depuis longtemps (depuis 1.1.1b3) :** si Zigbee2MQTT signale un appareil en ligne mais qu'il n'envoie plus rien depuis plus de N heures (24 par défaut, réglable sous **Configurer**, 0 = désactivé), il reçoit le badge orange « silencieux », un point d'état orange et le temps écoulé depuis son dernier message en orange. Il y a aussi la puce **Silencieux** (visible seulement si de tels appareils existent) et le filtre **État → Silencieux depuis longtemps**. Le temps écoulé depuis le dernier message (« il y a 5 secondes », « il y a 3 minutes ») figure dans chaque ligne ; le tri **Dernière activité (la plus ancienne d'abord)** place les appareils les plus muets en haut. Nécessite `advanced.last_seen: ISO_8601` dans Zigbee2MQTT. L'affichage est informatif ; il ne déclenche le capteur de problème que si tu l'actives.

**Copier des entités :** la section de la fenêtre **Entités (pour les automatisations)** liste les entités Home Assistant de l'appareil, avec une icône de copie par ligne. L'icône de copie dans l'en-tête de la fenêtre écrit tous les noms d'entités (un par ligne) dans le presse-papiers, par exemple pour les coller dans des automatisations et des scripts. Si le navigateur n'autorise pas le presse-papiers (il exige HTTPS), le texte s'affiche sélectionné dans un champ pour le copier avec Ctrl+C.

Autres points :

- **Cache :** batterie, signal, état OTA et « dernière activité » survivent à un redémarrage de Home Assistant (Z2M n'envoie pas les états des appareils en retained).
- **Les groupes ne sont plus des appareils :** les topics de groupe n'apparaissent plus comme appareil fantôme dans la liste.
- **Confirmation en deux clics** au lieu d'une boîte de dialogue du navigateur pour les actions risquées (supprimer, mettre à jour, redémarrer, délier, effacer).
- **Lecture seule :** `read_only: true` masque tous les éléments de commande de modification (tablettes murales).
- **Zoom :** `zoom` met toute la carte à l'échelle.
- **Langues :** allemand, anglais, néerlandais, français et espagnol (selon la langue de Home Assistant).
- **Téléchargement de diagnostic** avec noms et adresses IEEE anonymisés.

## Prérequis

- Home Assistant **2025.6** ou plus récent
- **Intégration MQTT** configurée
- **Zigbee2MQTT 2.x** (la version 1.x est détectée et signalée comme non prise en charge dans la carte)
- Recommandé : définir `availability: true` dans Zigbee2MQTT, sinon il n'y a pas d'état en ligne/hors ligne. Pour « dernière activité », ajouter `advanced.last_seen: ISO_8601`.

## Installation

1. HACS → ⋮ → **Dépôts personnalisés** → URL de ce dépôt, catégorie **Intégration**
2. Installer « Zigbee2MQTT Manager », redémarrer Home Assistant
3. **Paramètres → Appareils et services → Ajouter une intégration → Zigbee2MQTT Manager**
4. Saisir le base topic (par défaut `zigbee2mqtt`) et choisir le seuil « batterie faible »

Manuellement : copier le dossier `custom_components/zigbee2mqtt_manager` dans `<config>/custom_components/`.

Les préversions (par ex. `1.1.1b1`) n'apparaissent dans HACS qu'avec l'option « Afficher les versions bêta ».

**Liens rapides (depuis 1.1.1b3) :** [Ajouter le dépôt dans HACS](https://my.home-assistant.io/redirect/hacs_repository/?owner=Meine-smarte-Welt&repository=zigbee2mqtt_manager&category=integration) · [Configurer l'intégration](https://my.home-assistant.io/redirect/config_flow_start/?domain=zigbee2mqtt_manager). Après la configuration, Home Assistant affiche une seule fois un message expliquant comment ajouter la carte à un tableau de bord ; un modèle de tableau de bord prêt à l'emploi se trouve dans `examples/dashboard-zigbee.yaml`. Le tableau de bord n'est volontairement **pas créé automatiquement** : Home Assistant n'offre aux intégrations aucune interface publique pour cela.

## La carte

L'intégration fournit la carte et l'enregistre comme ressource Lovelace (persistante, avec `?v=<version>` contre les caches de navigateur obsolètes). Il n'y a rien à ajouter manuellement. Si Lovelace fonctionne en mode YAML, ajoute `/zigbee2mqtt_manager_files/zigbee2mqtt-manager-card.js` comme ressource de type `module`.

Ajouter la carte : **Modifier le tableau de bord → Ajouter une carte → « Zigbee2MQTT Manager »**. L'éditeur graphique regroupe tous les réglages en sections repliables (catégories, affichage avec colonnes, édition, réseau, couleurs). Le YAML n'est pas nécessaire, mais possible :

```yaml
type: custom:zigbee2mqtt-manager-card
title: Zigbee2MQTT Manager   # vide ("") = pas de titre
# entry_id: abc123            # seulement avec plusieurs instances Z2M
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

D'autres exemples : [`examples/`](examples/).

## Couleurs

Dans l'éditeur sous **Couleurs** (ou via les clés `color_*`). Chaque valeur peut être en hexadécimal (`#ff9800`), `rgb()`, `hsl()` ou `var(--...)`. Vide signifie la valeur par défaut du thème. Les valeurs invalides sont ignorées. L'échantillon ouvre le sélecteur de couleur, le champ de texte accepte n'importe quelle valeur CSS, « Réinitialiser toutes les couleurs » efface tout.

| Clé | Effet |
|---|---|
| `color_tab_active` | Onglet actif, boutons principaux |
| `color_success` | Bon : en ligne, bon signal, batterie pleine, à jour |
| `color_warning` | Avertissement : batterie faible, signal moyen, mise à jour en cours |
| `color_error` | Erreur : hors ligne, batterie critique, signal faible |
| `color_info` | Mise à jour disponible (firmware, nouvelle version de l'application) |
| `color_row_icon` | Toutes les icônes de liste (remplace les couleurs des catégories) |
| `color_live_banner` | Fond de la bannière (appairage, tâche de firmware) |
| `color_icon_devices`, `_battery`, `_updates`, `_groups`, `_bindings`, `_bridge` | Icône de la catégorie – colore l'icône de l'onglet et les icônes de ligne |

Si `color_row_icon` est défini, cette couleur uniforme l'emporte.

## Plusieurs instances (plusieurs clés)

Si plus d'une instance Zigbee2MQTT fonctionne (p. ex. trois clés coordinateur avec chacune son propre Z2M), chacune est configurée comme entrée distincte : **Paramètres → Appareils et services → Ajouter une intégration → Zigbee2MQTT Manager**, à chaque fois avec le **base topic** correspondant (`mqtt.base_topic` de l'instance Z2M concernée, p. ex. `zigbee2mqtt`, `zigbee2mqtt2`, `zigbee2mqtt3`). Les base topics doivent être différents et ne pas être imbriqués (pas `zigbee2mqtt` et `zigbee2mqtt/stick2`), sinon la configuration les refuse. Chaque instance obtient ses propres capteurs, événements (avec `base_topic` dans les données) et son propre cache.

Dans la carte, deux possibilités :

- **Sélecteur (par défaut) :** s'il y a plus d'une instance et qu'aucune n'est définie, une sélection des clés apparaît en haut de la carte. Le choix est mémorisé dans le navigateur.
- **Une carte par clé :** dans l'éditeur de carte, choisir l'instance sous **Instance (clé)**, ou en YAML :

```yaml
type: custom:zigbee2mqtt-manager-card
base_topic: zigbee2mqtt2     # ou : entry_id: abc123
```

`base_topic` est la variante la plus simple, car l'`entry_id` n'est visible nulle part ailleurs. Si les deux sont définis, `entry_id` l'emporte.

## Services

Les deux services sont destinés aux automatisations. Avec plusieurs instances, `base_topic` (ou `entry_id`) choisit l'instance. Sans précision, `check_updates` vérifie **toutes** les instances ; `permit_join` exige une précision avec plusieurs instances, afin que l'appairage ne s'ouvre jamais par erreur sur toutes les clés à la fois.

```yaml
action: zigbee2mqtt_manager.permit_join
data:
  base_topic: zigbee2mqtt2   # seulement avec plusieurs instances
  enabled: true
  duration: 120      # secondes, 10–254, facultatif
```

```yaml
action: zigbee2mqtt_manager.check_updates
```

`check_updates` vérifie en arrière-plan tous les appareils compatibles OTA, l'un après l'autre avec un intervalle.

## Événements pour les automatisations

Désactivables dans les options de l'intégration (« Déclencher des événements Home Assistant »). Au démarrage, seul l'état initial est relevé ; il n'y a donc pas de déluge d'événements.

| Événement | Données |
|---|---|
| `zigbee2mqtt_manager_device_offline` / `_device_online` | `name`, `ieee`, `base_topic` |
| `zigbee2mqtt_manager_battery_low` | `name`, `ieee`, `battery` – au passage sous le seuil |
| `zigbee2mqtt_manager_update_available` | `name`, `ieee`, `installed`, `latest` |
| `zigbee2mqtt_manager_device_joined` / `_device_left` | `name`, `ieee` |

```yaml
triggers:
  - trigger: event
    event_type: zigbee2mqtt_manager_battery_low
actions:
  - action: notify.mobile_app_handy
    data:
      message: "{{ trigger.event.data.name }} : batterie {{ trigger.event.data.battery }} %"
```

## Capteurs

`Appareils`, `Appareils hors ligne`, `Appareils à batterie faible`, `Appareils à batterie critique`, `Mises à jour du firmware disponibles` et `Groupes`. Les capteurs pour hors ligne, batterie et mises à jour portent la liste des appareils comme attribut.

### Problème global (capteur binaire « Problème », depuis 1.1.1b3)

Un capteur binaire (classe d'appareil `problem`) résume le réseau en un seul état. Il est **actif** dès que le bridge est hors ligne, qu'un appareil actif est hors ligne, qu'une batterie est faible ou critique, ou (désactivable) qu'une mise à jour du firmware est disponible, resp. (activable) qu'un appareil est silencieux depuis longtemps. Les appareils désactivés ne comptent pas. Il est prévu pour une petite tuile sur ta page d'accueil qui devient rouge et ouvre le tableau de bord Zigbee d'un appui (`examples/kachel-leitseite.yaml`).

Attributs : `reasons` (`bridge_offline`, `offline`, `battery_low`, `battery_critical`, `update_available`, `stale`), `bridge_online`, `devices`, `offline`, `low_battery`, `critical_battery`, `updates_available`, `stale`, `disabled`, `stale_hours` ainsi que les listes de noms `offline_devices`, `low_battery_devices`, `critical_battery_devices`, `update_devices`, `stale_devices`, `disabled_devices`.

Sous **Configurer**, tu choisis si les mises à jour du firmware (par défaut : oui) et « silencieux depuis longtemps » (par défaut : non) déclenchent le problème. L'ID d'entité dépend de la langue (avec une interface anglaise, par ex. `binary_sensor.zigbee2mqtt_manager_zigbee2mqtt_problem`) ; elle figure sous Paramètres → Appareils et services. Une automatisation avec la liste des appareils se trouve dans `examples/sensor-stoerung-automation.yaml`. Les capteurs-compteurs ci-dessus excluent aussi les appareils désactivés.

## Affichage de la version et avis de mise à jour

La version installée figure à trois endroits : dans la carte sous **Bridge (roue dentée) → Version de l'application**, en haut de l'éditeur graphique de la carte et dans la boîte de dialogue **Configurer** de l'intégration. Au démarrage, puis toutes les 12 heures, l'intégration interroge GitHub (`api.github.com`, dernière version, à défaut le tag de version le plus élevé) pour savoir si une version plus récente a été publiée. S'il y en a une, elle est mise en évidence en couleur : cadre orange et avis dans la section, un « ↑ » orange sur l'icône de la roue dentée, un encadré d'avertissement dans l'éditeur et un avis dans la boîte de dialogue Configurer. La mise à jour elle-même se fait comme d'habitude via HACS. **Vérifier maintenant** déclenche la requête immédiatement. Si GitHub est injoignable, « Vérification impossible » s'affiche ; la carte continue de fonctionner normalement.

**Préversions :** `releases/latest` de GitHub ne renvoie jamais de préversion. Si tu utilises toi-même une préversion (`b`/`rc`), l'intégration consulte donc aussi la liste des dernières versions et te signale la prochaine bêta (`1.1.1b1` < `1.1.1rc1` < `1.1.1`). Avec une version finale installée, aucune préversion n'est proposée.

Si les versions de la carte et de l'intégration diffèrent (cache de navigateur obsolète), c'est aussi signalé en orange.

## Notification Center (optionnel)

**Nouveau dans 1.1.1b1 (préversion).** Si l'intégration **Notification Center** est installée, Zigbee2MQTT Manager peut y envoyer ses notifications. Le Notification Center rassemble les notifications de toutes les intégrations connectées et les redistribue (push, voix, etc.). Sans Notification Center, rien ne change : le gestionnaire fonctionne comme avant, rien n'est envoyé et les interrupteurs restent sans effet.

La liaison suit l'interface commune (schéma 1) via le bus d'événements de Home Assistant. Le gestionnaire s'enregistre lui-même au démarrage et sur demande, et synchronise son état initial. Elle est **activée** par défaut et se commande à deux endroits :

- **Carte :** Bridge (roue dentée) → section **Notification Center** avec un interrupteur principal et un interrupteur par type de notification (administrateurs uniquement, pas en mode lecture seule). La modification est immédiate, sans recharger l'intégration.
- **Configurer** l'intégration : « Envoyer les notifications au Notification Center » et le choix des types de notification.

| Type de notification | Urgence | Quand |
|---|---|---|
| Bridge hors ligne | critique | Zigbee2MQTT signale le bridge hors ligne ; fermée dès qu'il est de nouveau en ligne |
| Batterie critique | critique | Niveau de batterie sous le seuil « batterie critique » |
| Appareil hors ligne | avertissement | Zigbee2MQTT signale l'appareil hors ligne |
| Batterie faible | avertissement | Niveau de batterie sous le seuil « batterie faible », mais pas sous « critique » |
| Mise à jour du firmware disponible | info | Une mise à jour du firmware est disponible pour l'appareil |
| Nouvel appareil | info | Un appareil a rejoint le réseau (une seule fois) |
| Appareil sorti du réseau | info | Un appareil a quitté le réseau (une seule fois) |

Les seuils existants des options de l'intégration s'appliquent ; il n'y a pas de nouveaux seuils. Un appareil sous le seuil critique apparaît uniquement comme « batterie critique », pas en plus comme « faible ». Une notification est créée exactement une fois par changement ; lorsque l'état disparaît (appareil de nouveau en ligne, batterie remplacée), la notification est fermée automatiquement. Après le démarrage, le gestionnaire attend environ 20 secondes après la liste des appareils avant de signaler l'état initial ; celui-ci est envoyé au Notification Center comme « initial » et ne provoque pas de déluge de notifications push. Les textes existent en allemand, anglais, néerlandais, français et espagnol.

Confidentialité : les notifications contiennent des noms d'appareils et des niveaux de batterie et restent dans Home Assistant. Le diagnostic et les journaux ne contiennent que des compteurs par type de notification, aucun contenu.

## Paramètres de l'intégration

Sous **Configurer** (avec affichage de la version installée) : seuil « batterie faible », seuil « batterie critique » (doit être inférieur ou égal), événements activés/désactivés, notifications vers le Notification Center activées/désactivées et choix des types de notification. **Reconfigurer** permet de modifier le base topic. Depuis 1.1.1b3 aussi : « Silencieux depuis … heures » (0 = désactivé), « Les mises à jour du firmware déclenchent le problème » et « Silencieux depuis longtemps déclenche le problème ».

## Sécurité

Toutes les actions en écriture (renommer, options, commuter des fonctions, supprimer, firmware, groupes, bindings, appairage, redémarrage, vérification de version, réglages du Notification Center) et le chargement des détails des appareils sont réservés aux **administrateurs** via WebSocket. Le backend vérifie les saisies (noms en double, options inconnues, valeurs de bridge autorisées). Lors de la commutation d'une fonction, le backend vérifie en outre qu'elle existe, qu'elle est modifiable et que la valeur correspond exactement à sa valeur d'activation ou de désactivation. La carte échappe tous les textes ; les valeurs de couleur passent par une liste d'autorisation.

## Limitations connues

- **Payloads Z2M non vérifiés :** `device/options`, la structure des bindings dans `bridge/devices` et les options du bridge (`log_level`, `last_seen`). Si ta version de Z2M diffère, la fonction concernée reste sans effet ou signale une erreur.
- Les options d'appareil prennent en charge des types simples (nombre, interrupteur, choix, texte), pas d'options imbriquées.
- L'aperçu des entités lors du renommage trouve les appareils via les identifiants MQTT et peut rester vide avec une configuration de découverte inhabituelle.
- « Tout installer » attend jusqu'à deux heures par appareil la fin de la mise à jour.
- Batterie, signal et état OTA apparaissent d'abord depuis le cache après un redémarrage et sont actualisés au prochain message de l'appareil.
- **Affichage hors ligne (depuis 1.0.5) et état des tests :** la carte reprend la disponibilité de Zigbee2MQTT. Si un appareil a émis en direct après un message hors ligne, la carte l'affiche comme joignable. Cela a été vérifié avec des données simulées, **pas sur du matériel réel**. On ne sait pas encore si les faux affichages hors ligne signalés dans 1.0.4 (capteurs, prise) disparaissent : les retours sont expressément bienvenus.
- La fenêtre et la section « Fonctions (expose) » ont été corrigées dans 1.0.5 (boucle infinie lors du redessin), mais pas non plus testées sur du matériel réel ni dans l'application compagnon iOS/Android.
- **Nouveau dans 1.1.0, état des tests :** le regroupement, les filtres, les interrupteurs dans les fonctions et la copie ont été vérifiés avec des données simulées et dans un navigateur sans interface, **pas sur du matériel réel** ni dans l'application compagnon iOS/Android. On ne sait pas encore si Zigbee2MQTT accepte chaque interrupteur comme prévu (p. ex. pour les appareils à plusieurs endpoints).
- La classe d'appareil est une approximation à partir des fonctions de l'appareil ; des cas particuliers peuvent atterrir dans « Autres » ou « Capteurs ».
- Les interrupteurs agissent immédiatement et sans confirmation (y compris les interrupteurs de configuration comme la sécurité enfants). Le presse-papiers exige HTTPS.
- **Nouveau dans 1.1.1b3, état des tests :** le capteur de problème, l'association pièce/appareil HA, le commentaire, les appareils désactivés et « silencieux depuis longtemps » ont été vérifiés avec des données et des registres simulés (pytest) et dans un navigateur simulé (jsdom), **pas sur du matériel réel, pas avec un vrai Notification Center et pas dans des navigateurs ni dans l'application Companion**. L'appareil HA est trouvé grâce à l'adresse IEEE dans les identifiants MQTT ; avec une discovery inhabituelle, la pièce et l'appareil HA restent vides. Le commentaire provient de la configuration Z2M de l'appareil (`description`) ; il n'est pas vérifié que ta version de Z2M le transmette dans `bridge/info`. « Silencieux depuis longtemps » est informatif et n'est pas un type de message du Notification Center. Un tableau de bord ne peut pas être créé automatiquement (issue #6), seulement via le modèle.
- **Nouveau dans 1.1.1b2, état des tests :** les corrections du clignotement, du saut de défilement et des raccourcis clavier ont été vérifiées dans un navigateur simulé (jsdom), **pas dans Safari, Chrome, Firefox ou l'application compagnon, ni avec 75 vrais appareils**. Des valeurs comme « dernière activité » et le signal ne sont donc actualisées qu'au plus toutes les 2 secondes.
- **Nouveau dans 1.1.1b1, état des tests :** la liaison avec le Notification Center a été vérifiée avec des événements et des données simulés, **pas avec un vrai Notification Center ni sur du matériel réel**. Lorsque le bridge redémarre, des appareils peuvent être brièvement signalés hors ligne puis fermés de nouveau, selon le réglage de disponibilité de Zigbee2MQTT. HACS n'affiche les préversions qu'avec l'option « Afficher les versions bêta ».

## Dépannage

- **Carte introuvable :** vider le cache du navigateur ; sous Paramètres → Tableaux de bord → Ressources, vérifier que `/zigbee2mqtt_manager_files/…` existe (en mode YAML, l'ajouter manuellement).
- **Un appareil est affiché hors ligne alors qu'il est joignable :** c'est Zigbee2MQTT lui-même qui signale l'état (`<base_topic>/<appareil>/availability`). Vérifie la valeur à cet endroit, p. ex. avec MQTT Explorer (Paramètres → Appareils et services → MQTT → Configurer). En cas de problème, envoie le téléchargement de diagnostic et indique le réglage Z2M `availability` (p. ex. `timeout`) et le modèle de l'appareil. Pour les appareils sur pile, Z2M ne passe à « offline » qu'après des heures sans message.
- **Pas d'état en ligne/hors ligne :** activer `availability: true` dans Zigbee2MQTT. Sans disponibilité, le point sur l'icône indique l'état déduit de « dernière activité » : vert semi-transparent = entendu dans les 25 dernières heures, orange = rien entendu depuis plus longtemps, gris = aucun message pour l'instant. Une infobulle sur le point explique l'origine. Le rouge (« hors ligne ») n'existe qu'avec la disponibilité Z2M activée.
- **Images des appareils :** la carte charge les images directement dans le navigateur depuis `www.zigbee2mqtt.io` (même source que l'interface Z2M, fichier selon le nom du modèle). Un `icon` défini dans Z2M pour l'appareil est prioritaire. S'il n'y a pas d'image ou si le site est injoignable (p. ex. sans internet), l'icône s'affiche. Avec `show_images: false`, aucune requête externe n'est émise.
- **« Dernière activité » manque :** définir `advanced.last_seen: ISO_8601` ou modifier l'option du bridge dans la catégorie Bridge.
- **« Pas de connexion à l'intégration » :** l'intégration est-elle chargée ? `base_topic` ou `entry_id` sont-ils corrects ?
- **Les fonctions (expose) manquent ou affichent « pas encore de valeur » :** la valeur apparaît dès que l'appareil a envoyé pour la première fois (Zigbee2MQTT ne conserve pas les états des appareils). La section n'est affichée que pour les appareils ayant une définition Zigbee2MQTT. Le chargement des détails est réservé aux administrateurs.
- **La fenêtre ou les fonctions (expose) ne répondent pas (version 1.0.4 uniquement) :** passer à 1.0.5, redémarrer Home Assistant, vider le cache du navigateur (Ctrl+F5) ou recharger l'application compagnon.
- **Bannière du bridge « Version non prise en charge » :** Zigbee2MQTT 1.x n'est pas pris en charge.
- **La copie ne fonctionne pas :** le navigateur n'autorise le presse-papiers que via HTTPS (ou `localhost`). Sinon le texte s'affiche sélectionné dans un champ de la fenêtre : copier avec Ctrl+C.
- **Un interrupteur dans les fonctions ne fait rien :** la commande part vers `<base_topic>/<appareil>/set`. Vérifie dans Zigbee2MQTT que l'appareil est joignable ; la carte affiche la valeur que l'appareil renvoie.
- **Rien n'arrive dans le Notification Center :** l'intégration Notification Center est-elle installée et chargée ? L'interrupteur principal et le type concerné sont-ils activés (carte : Bridge → Notification Center) ? Après le démarrage, le gestionnaire attend environ 20 secondes avant d'envoyer l'état initial.
- Journaux : régler `custom_components.zigbee2mqtt_manager` sur `debug`.

## Historique des versions

| Version | Modifications |
|---|---|
| **1.1.1b3** (préversion) | Corrigé (issue #7) : les **appareils désactivés** dans Zigbee2MQTT ne comptent plus comme hors ligne (état propre « Désactivé », exclus des compteurs, capteurs et du Notification Center). Corrigé (issue #4) : association des appareils HA sans l'ancien mappage `device_registry.devices`. Nouveau : **problème global** sous forme de capteur binaire (classe `problem`) avec tous les compteurs et listes d'appareils en attributs ; **pièce**, **appareil HA** et **commentaire** dans la liste, la fenêtre contextuelle et la recherche, regroupement par **pièce** ; **« silencieux depuis longtemps »** (puce, filtre, badge, heures réglables) ; aides à la configuration (liens my.home-assistant.io, message unique après la configuration, modèle de tableau de bord dans `examples`). Issue #6 : un tableau de bord créé automatiquement n'est pas inclus. |
| **1.1.1b2** (préversion) | Corrigé (issue #5) : la carte **clignotait et remontait en haut pendant le défilement**, car elle était entièrement redessinée à chaque mise à jour de données (les images se rechargeaient, la page raccourcissait brièvement). Seules les parties modifiées sont désormais mises à jour : images, lignes, accordéons et focus de saisie restent en place, rien n'est dessiné si le contenu est inchangé, et le redessin piloté par les données a lieu au plus toutes les 2 secondes. Corrigé : **la saisie dans la recherche et les autres champs sur ordinateur** déclenchait les raccourcis clavier de Home Assistant (p. ex. « e » ouvrait la recherche d'entités) ; les événements clavier des champs de saisie n'atteignent plus Home Assistant. |
| **1.1.1b1** (préversion) | Nouveau : **liaison avec le Notification Center** (optionnelle, interface schéma 1) avec sept types de notification (bridge hors ligne, batterie critique, appareil hors ligne, batterie faible, mise à jour du firmware, nouvel appareil, appareil sorti du réseau), un interrupteur principal et un interrupteur par type dans la carte et dans la boîte de dialogue Configurer. La vérification des mises à jour reconnaît les **préversions** (`1.1.1b1` < `1.1.1rc1` < `1.1.1`) : avec une bêta, tu es informé de la bêta suivante ; avec une version finale, tu ne vois pas de préversions. **Français et espagnol** ajoutés (carte, intégration, README). Modifier les interrupteurs du Notification Center ne recharge plus l'intégration. Corrigé : restes d'anglais dans les textes allemands (`strings.json`). |
| **1.1.0** | Nouveau : **regrouper** les listes par fabricant ou classe d'appareil (accordéon) et les **filtrer** (état en ligne/hors ligne, alimentation, signal, rôle réseau, firmware, dernière activité, sans groupe Zigbee, fabricant, classe d'appareil ; filtres actifs sous forme de puces). Les **interrupteurs** modifiables sous « Fonctions (expose) » se basculent directement. Nouvelle section de fenêtre **Entités (pour les automatisations)** et boutons de copie pour les noms d'entités. Éditeur : `show_group_by`, `default_group_by`, `show_filters`. Backend : nouvelle action `set_expose` (administrateurs uniquement, valeurs vérifiées) et classe d'appareil par appareil. |
| 1.0.5 | Corrigé : la fenêtre et la section « Fonctions (expose) » ne répondaient pas (boucle infinie lors du redessin, l'image de l'appareil clignotait). Affichage hors ligne protégé contre les messages périmés. Néerlandais ajouté (carte, intégration, README), LICENSE et `examples/` ajoutés. Merci à @pr0xyzer (PR #2) : association des entités HA via des identifiants MQTT à plus de deux valeurs (liste lors du renommage). |
| 1.0.4 | Toutes les fonctions expose dans la fenêtre de l'appareil, plusieurs clés (plusieurs instances), correction des options d'appareil. |
| 1.0.3 | Première version officielle. |

## Intégrité des fichiers

Chaque fichier `.py`, `.js` et `.yaml` porte en première ligne un hash SHA-256 du contenu à partir de la ligne 2. Vérification : `tail -n +2 fichier.py | sha256sum`. Les fichiers JSON ne peuvent pas contenir de commentaires ; leurs hashes (SHA-256 du fichier complet) figurent ici :

| Fichier | SHA-256 |
|---|---|
| `custom_components/zigbee2mqtt_manager/manifest.json` | `de86d629e203290c8c213a85f8d8f3094c51be023d06623a0bb5a82b503b6f5f` |
| `custom_components/zigbee2mqtt_manager/strings.json` | `1e8f4f5937dbb64352973c67dd872610781a9540f7f1db4ff10b8ef734682d69` |
| `custom_components/zigbee2mqtt_manager/icons.json` | `2e739f9952d7c56a3062cef2b0a70f58441fb1bb651ca58713cb77fac72f9762` |
| `custom_components/zigbee2mqtt_manager/translations/de.json` | `1e8f4f5937dbb64352973c67dd872610781a9540f7f1db4ff10b8ef734682d69` |
| `custom_components/zigbee2mqtt_manager/translations/en.json` | `7c54b7a85802122d88bc3bf80c38e95c0b408fb1892bccc00be92eddaca3586e` |
| `custom_components/zigbee2mqtt_manager/translations/nl.json` | `090cbad22976fa99c197324ca0bb41264b390f192474fb4ed607212f13a6fa0c` |
| `custom_components/zigbee2mqtt_manager/translations/fr.json` | `646089cc42728dfa6bbebb34f8f29ee6903d9ff0879c8836190bc5fbdb59495a` |
| `custom_components/zigbee2mqtt_manager/translations/es.json` | `015ab2724073bef7a708828cf883e87d020049ba9327b40ee8aaa6af88b86ece` |
| `hacs.json` | `8939982e245783f7a41fb7f76e3da661b7250b5cec9385085ab68f19cea5cfda` |

## Licence

MIT
