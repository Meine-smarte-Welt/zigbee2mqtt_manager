🇩🇪 [Deutsch](README.md) · 🇬🇧 English · [🇳🇱 Nederlands](README.nl.md) · [🇫🇷 Français](README.fr.md)

# Zigbee2MQTT Manager for Home Assistant

Manage Zigbee2MQTT without leaving Home Assistant: devices, batteries, firmware updates, groups, bindings and the bridge in one dashboard card – as a HACS integration. Layout and design follow the card of [FRITZ!Box Anrufe](https://github.com/Meine-smarte-Welt/fritzbox_anrufe): icon categories, row lists, detail popup, accordion sections, graphical editor and freely adjustable colors.

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [The card](#the-card)
- [Colors](#colors)
- [Multiple instances (several sticks)](#multiple-instances-several-sticks)
- [Services](#services)
- [Events for automations](#events-for-automations)
- [Sensors](#sensors)
- [Version display and update notice](#version-display-and-update-notice)
- [Integration settings](#integration-settings)
- [Security](#security)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)
- [Version history](#version-history)
- [File integrity](#file-integrity)

## Features

The card has six categories in an icon bar (icons only below roughly 480 px card width). Each category can be shown or hidden on its own.

| Category | What it does |
|---|---|
| **Devices** | List with reachability, model, signal, battery, "last seen"; statistic chips as filters (offline / low battery / updates); search; sorting; **grouping** by manufacturer or device class; **filters** (status, power, signal, …) |
| **Battery** | Battery devices, lowest first; colors by low and critical threshold |
| **Updates** | Installed vs. available firmware; "check all" and "install all one after another" as a background job with progress and cancel |
| **Groups** | Create, rename, delete; add and remove members |
| **Bindings** | Overview of all device bindings; unbind; bind again in the device popup |
| **Bridge** (cog) | **App version** (integration and card, colored notice when a new version exists), status, coordinator, pairing, bridge options, restart, event log |

**Device popup** (tap a row) with accordion sections: Information · **Features (expose)** · **Entities (for automations)** · Rename (with the list of affected HA entities) · Device options (form from the Z2M option schema) · Firmware · Bindings · Groups · Remove.

The **Features (expose)** section lists everything Zigbee2MQTT exposes for the device (switch, brightness, color, temperature, link quality …): name, property, **current value** with unit, access (read / write / get), value range or choices, description, and a configuration/diagnostic mark. Composite features (e.g. color x/y) and groups such as light or switch are resolved and grouped; from nine features on there is a filter field. While the section is open, values refresh when the device sends something (at most every 3 seconds). **Writable switches** (yes/no features, e.g. the state of a plug or light) can be toggled directly: the new value shows immediately and is confirmed by the device shortly after. If the value is still unknown, "On" and "Off" buttons appear instead. All other features are display only; control the device through its Home Assistant entities as before. With `read_only: true` the switches are hidden.

**Grouping and filters** (Devices, Battery and Updates): the **Group by** selector arranges the list as an accordion by **manufacturer** or **device class** (lights, plugs & switches, heating & climate, blinds & covers, locks, fans, buttons & remotes, sensors, other). Each group shows its count and, if any, its offline devices; the two icons beside the selector expand or collapse all groups. The collapsible **Filters** section narrows the list: status (online / offline), power source (battery only / mains only / low battery), signal (good / medium / weak), network role (router / end device), firmware (update available), last seen (more than 24 hours / 7 days ago), not in any Zigbee group, manufacturer and device class. Several filters apply together; active filters appear as small chips that a tap removes. The integration derives the device class from the device's features (Zigbee2MQTT provides no fixed class); devices without known features end up under "Other". Without Z2M availability enabled, online/offline is derived from "last seen", like the status dot. While grouping is active, `max_rows` does not apply.

**Copying entities:** the popup section **Entities (for automations)** lists the device's Home Assistant entities with a copy icon per row. The copy icon in the popup header writes all entity names (one per line) to the clipboard, for example to paste into automations and scripts. If the browser denies clipboard access (it requires HTTPS), the text appears selected in a field so you can copy it with Ctrl+C.

Further points:

- **Cache:** Battery, signal, OTA state and "last seen" survive a Home Assistant restart (Z2M does not send device states retained).
- **Groups are no longer devices:** group topics do not show up as phantom devices.
- **Two-click confirmation** instead of a browser dialog for risky actions (remove, update, restart, unbind, delete).
- **Read only:** `read_only: true` hides all controls that change something (wall tablets).
- **Zoom:** `zoom` scales the whole card.
- **Languages:** German, English, Dutch and French (following the Home Assistant language).
- **Diagnostics download** with anonymized names and IEEE addresses.

## Requirements

- Home Assistant **2025.6** or newer
- Set-up **MQTT integration**
- **Zigbee2MQTT 2.x** (version 1.x is detected and reported in the card as unsupported)
- Recommended: set `availability: true` in Zigbee2MQTT, otherwise there is no online/offline status. For "last seen" also set `advanced.last_seen: ISO_8601`.

## Installation

1. HACS → ⋮ → **Custom repositories** → URL of this repository, category **Integration**
2. Install "Zigbee2MQTT Manager", restart Home Assistant
3. **Settings → Devices & services → Add integration → Zigbee2MQTT Manager**
4. Enter the base topic (default `zigbee2mqtt`) and choose the threshold for "low battery"

Manual: copy the folder `custom_components/zigbee2mqtt_manager` to `<config>/custom_components/`.

## The card

The integration serves the card and registers it as a Lovelace resource (persisted, with `?v=<version>` against stale browser caches). You do not have to add anything manually. If Lovelace runs in YAML mode, add `/zigbee2mqtt_manager_files/zigbee2mqtt-manager-card.js` as a resource of type `module`.

Add the card: **Edit dashboard → Add card → "Zigbee2MQTT Manager"**. The graphical editor groups all settings into collapsible sections (categories, appearance with columns, editing, network, colors). No YAML is needed, but possible:

```yaml
type: custom:zigbee2mqtt-manager-card
title: Zigbee2MQTT Manager   # empty ("") = no heading
# entry_id: abc123            # only with several Z2M instances
show_devices: true
show_battery: true
show_updates: true
show_groups: true
show_bindings: true
show_bridge: true
default_tab: devices
max_rows: 0                   # 0 = all, otherwise "show more"
zoom: 1
show_stats: true
show_images: true             # device images from zigbee2mqtt.io
show_search: true
show_filter_bar: true         # sort selection
default_sort: name_asc        # name_asc | name_desc | battery_asc | lqi_asc | last_seen_desc | last_seen_asc | ota
show_group_by: true           # "Group by" selector
default_group_by: none        # none | vendor | class
show_filters: true            # filters section
show_model: true
show_vendor: true
show_ieee: false
show_lqi: true
show_battery_value: true
show_last_seen: true
read_only: false
show_pairing: true
```

More examples: [`examples/`](examples/).

## Colors

In the editor under **Colors** (or via `color_*` keys). Each value may be hex (`#ff9800`), `rgb()`, `hsl()` or `var(--...)`. Empty means theme default. Invalid values are discarded. The swatch opens the color picker, the text field accepts any CSS value, "Reset all colors" clears everything.

| Key | Effect |
|---|---|
| `color_tab_active` | Active tab, primary buttons |
| `color_success` | Good: online, signal good, battery full, up to date |
| `color_warning` | Warning: battery low, signal medium, update running |
| `color_error` | Error: offline, battery critical, signal weak |
| `color_info` | Update available (firmware, new app version) |
| `color_row_icon` | All list icons (overrides the category colors) |
| `color_live_banner` | Banner background (pairing, firmware job) |
| `color_icon_devices`, `_battery`, `_updates`, `_groups`, `_bindings`, `_bridge` | Category icon – colors tab icon and row icons |

If `color_row_icon` is set, this single color wins.

## Multiple instances (several sticks)

If more than one Zigbee2MQTT instance runs (e.g. three coordinator sticks, each with its own Z2M), set up each as its own entry: **Settings → Devices & services → Add integration → Zigbee2MQTT Manager**, each with the matching **base topic** (`mqtt.base_topic` of that Z2M instance, e.g. `zigbee2mqtt`, `zigbee2mqtt2`, `zigbee2mqtt3`). Base topics must differ and must not be nested (not `zigbee2mqtt` and `zigbee2mqtt/stick2`), otherwise setup rejects them. Each instance gets its own sensors, events (with `base_topic` in the data) and its own cache.

The card offers two ways:

- **Switcher (default):** with more than one instance and none fixed, a stick selector appears at the top of the card. The choice is remembered in the browser.
- **One card per stick:** choose the instance under **Instance (stick)** in the card editor, or in YAML:

```yaml
type: custom:zigbee2mqtt-manager-card
base_topic: zigbee2mqtt2     # or: entry_id: abc123
```

`base_topic` is the simpler variant because the `entry_id` is not visible anywhere. If both are set, `entry_id` wins.

## Services

Both services are meant for automations. With several instances, `base_topic` (or `entry_id`) selects the instance. `check_updates` checks **all** instances if none is given; `permit_join` requires a choice with several instances so pairing never opens on all sticks at once by accident.

```yaml
action: zigbee2mqtt_manager.permit_join
data:
  base_topic: zigbee2mqtt2   # only with several instances
  enabled: true
  duration: 120      # seconds, 10–254, optional
```

```yaml
action: zigbee2mqtt_manager.check_updates
```

`check_updates` checks all OTA-capable devices in the background, one after another with a pause.

## Events for automations

Can be switched off in the integration options ("Fire Home Assistant events"). At startup only the initial state is recorded, so there is no flood of events.

| Event | Data |
|---|---|
| `zigbee2mqtt_manager_device_offline` / `_device_online` | `name`, `ieee`, `base_topic` |
| `zigbee2mqtt_manager_battery_low` | `name`, `ieee`, `battery` – when the threshold is crossed |
| `zigbee2mqtt_manager_update_available` | `name`, `ieee`, `installed`, `latest` |
| `zigbee2mqtt_manager_device_joined` / `_device_left` | `name`, `ieee` |

```yaml
triggers:
  - trigger: event
    event_type: zigbee2mqtt_manager_battery_low
actions:
  - action: notify.mobile_app_phone
    data:
      message: "{{ trigger.event.data.name }}: battery {{ trigger.event.data.battery }} %"
```

## Sensors

`Devices`, `Offline devices`, `Devices with low battery`, `Devices with critical battery`, `Available firmware updates` and `Groups`. The sensors for offline, battery and updates carry the device list as an attribute.

## Version display and update notice

The installed version is shown in three places: in the card under **Bridge (cog) → App version**, at the top of the graphical card editor, and in the integration's **Configure** dialog. At startup and every 12 hours the integration asks GitHub (`api.github.com`, latest release, falling back to the highest version tag) whether a newer version was published. If so, it is highlighted: orange frame and notice in the section, an orange "↑" on the cog icon, a warning box in the editor and a note in the Configure dialog. Updating itself works as usual through HACS. **Check now** triggers the query immediately. If GitHub is not reachable, "Check not possible" appears; the card keeps working.

If card and integration versions differ (stale browser cache), this is marked orange as well.

## Integration settings

Under **Configure** (showing the installed version): threshold "low battery", threshold "critical battery" (must be smaller or equal) and events on/off. **Reconfigure** changes the base topic.

## Security

All write actions (rename, options, toggling features, remove, firmware, groups, bindings, pairing, restart, version check) and loading device details are restricted to **administrators** over WebSocket. Input is validated by the backend (duplicate names, unknown options, allowed bridge values). When toggling a feature, the backend also checks that it exists, is writable and that the value is exactly its on or off value. The card escapes all text; color values pass through an allowlist.

## Known limitations

- **Z2M payloads untested:** `device/options`, the bindings structure in `bridge/devices` and the bridge options (`log_level`, `last_seen`). If your Z2M version differs, the affected function stays without effect or reports an error.
- Device options support simple types (number, switch, choice, text), no nested options.
- The entity preview when renaming finds devices via MQTT identifiers and can stay empty with unusual discovery configurations.
- "Install all" waits up to two hours per device for the update to finish.
- After a restart, battery, signal and OTA state first come from the cache and are refreshed with the next device message.
- **Offline display (since 1.0.5) and test status:** the card takes availability from Zigbee2MQTT. If a device sent live after an offline report, the card shows it as reachable. This was checked against simulated data, **not on real hardware**. Whether this removes the false offline displays reported in 1.0.4 (sensors, a plug) is open: feedback is explicitly welcome.
- The popup and the "Features (expose)" section were fixed in 1.0.5 (endless redraw loop), but also not tested on real hardware or in the iOS/Android companion app.
- **New in 1.1.0, test status:** grouping, filters, switches in the features and copying were checked against simulated data and in a headless browser, **not on real hardware** and not in the iOS/Android companion app. Whether Zigbee2MQTT accepts every switch as expected (e.g. on devices with several endpoints) is open.
- The device class is an approximation derived from the device's features; special cases may end up under "Other" or "Sensors".
- Switches act immediately without confirmation (including configuration switches such as child lock). The clipboard requires HTTPS.

## Troubleshooting

- **Card not found:** clear the browser cache; check under Settings → Dashboards → Resources that `/zigbee2mqtt_manager_files/…` exists (add manually in YAML mode).
- **Device shown offline but reachable:** Zigbee2MQTT itself reports the status (`<base_topic>/<device>/availability`). Check the value there, e.g. with MQTT Explorer (Settings → Devices & services → MQTT → Configure). In case of problems, please send the diagnostics download and name your Z2M `availability` setting (e.g. `timeout`) and the device model. For battery devices Z2M only sets "offline" after hours without a message.
- **No online/offline status:** enable `availability: true` in Zigbee2MQTT. Without availability, the dot at the icon shows the state derived from "last seen": translucent green = heard within 25 hours, orange = nothing heard for longer, gray = no message yet. A tooltip on the dot explains the origin. Red ("offline") only exists with Z2M availability enabled.
- **Device images:** the card loads the images directly in the browser from `www.zigbee2mqtt.io` (same source as the Z2M frontend, file by model name). An `icon` set for the device in Z2M takes precedence. If there is no image or the site is not reachable (e.g. no internet), the icon is shown. With `show_images: false` no external requests are made.
- **"Last seen" missing:** set `advanced.last_seen: ISO_8601` or change the bridge option in the bridge category.
- **"No connection to the integration":** is the integration loaded? Do `base_topic` or `entry_id` match?
- **Features (expose) missing or showing "no value yet":** the value appears once the device has sent for the first time (Zigbee2MQTT does not keep device states). The section only appears for devices with a Zigbee2MQTT definition. Loading the details is reserved for administrators.
- **Popup or features (expose) cannot be operated (version 1.0.4 only):** update to 1.0.5, restart Home Assistant, clear the browser cache (Ctrl+F5) or reload the companion app.
- **Bridge banner "version not supported":** Zigbee2MQTT 1.x is not supported.
- **Copying does not work:** the browser only allows clipboard access over HTTPS (or `localhost`). Otherwise the text appears selected in a field in the popup: copy it with Ctrl+C.
- **A switch in the features does nothing:** the command goes to `<base_topic>/<device>/set`. Check in Zigbee2MQTT whether the device is reachable; the card shows the value the device reports back.
- Logs: set `custom_components.zigbee2mqtt_manager` to `debug`.

## Version history

| Version | Changes |
|---|---|
| **1.1.0** | New: **group** lists by manufacturer or device class (accordion) and **filter** them (status online/offline, power source, signal, network role, firmware, last seen, not in a Zigbee group, manufacturer, device class; active filters as chips). Writable **switches** under "Features (expose)" can be toggled directly. New popup section **Entities (for automations)** and copy buttons for the entity names. Editor: `show_group_by`, `default_group_by`, `show_filters`. Backend: new `set_expose` action (administrators only, values are validated) and a device class per device. |
| 1.0.5 | Fixed: popup and the "Features (expose)" section could not be operated (endless redraw loop, device image flickered). Offline display protected against stale reports. Dutch added (card, integration, README), LICENSE and `examples/` added. Thanks to @pr0xyzer (PR #2): matching HA entities via MQTT identifiers with more than two values (list when renaming). |
| 1.0.4 | All expose features in the device popup, several sticks (multiple instances), fix for the device options. |
| 1.0.3 | First official version. |

## File integrity

Every `.py`, `.js` and `.yaml` file carries a SHA-256 hash of its content from line 2 onward in its first line. Check: `tail -n +2 file.py | sha256sum`. JSON files cannot hold comments; their hashes (SHA-256 over the complete file) are listed here:

| File | SHA-256 |
|---|---|
| `custom_components/zigbee2mqtt_manager/manifest.json` | `fcc2361d67b5c819026cd0f07fbf5e438b1db6c895875730a97e295c08447c8b` |
| `custom_components/zigbee2mqtt_manager/strings.json` | `714ca6bdd304f051e93e8960410630c361f942eed7ddd89c81969fe13aff9c4d` |
| `custom_components/zigbee2mqtt_manager/icons.json` | `2e739f9952d7c56a3062cef2b0a70f58441fb1bb651ca58713cb77fac72f9762` |
| `custom_components/zigbee2mqtt_manager/translations/de.json` | `a4cc4400d01de88795a97c7644a9a4c89495c99d440eec4b9b476e7784a3c0b4` |
| `custom_components/zigbee2mqtt_manager/translations/en.json` | `9072d9f52b3f1be151b46c49dc22eb16df2cec81f295841a7c1ca1c2891e634a` |
| `custom_components/zigbee2mqtt_manager/translations/fr.json` | `b9ff60abca3a4b610d5213e80046ebb7547ab8d23b5fabb5c9407c2083b9eda9` |
| `custom_components/zigbee2mqtt_manager/translations/nl.json` | `20ec6ad0e627be9f5ba84d6fa2520550d64d5256ca97e4cfc51f6ed1149b9467` |
| `hacs.json` | `8939982e245783f7a41fb7f76e3da661b7250b5cec9385085ab68f19cea5cfda` |

## License

MIT
