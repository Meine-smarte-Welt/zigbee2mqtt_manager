# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 80d167fe77747c5c97f166e3a21465255642c4980acdfd343ec53489302e72e1
"""Config Flow für Zigbee2MQTT Manager."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import mqtt
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.selector import (
    TextSelector,
    TextSelectorConfig,
    TextSelectorType,
)

from .const import (
    CONF_BASE_TOPIC,
    CONF_BROKER_HOST,
    CONF_BROKER_PASSWORD,
    CONF_BROKER_PORT,
    CONF_BROKER_TLS,
    CONF_BROKER_USERNAME,
    CONF_CRITICAL_BATTERY,
    CONF_FIRE_EVENTS,
    CONF_LOW_BATTERY,
    CONF_NETWORK_URL,
    CONF_PROBLEM_STALE,
    CONF_PROBLEM_UPDATES,
    CONF_SIDEBAR_PANEL,
    CONF_SIDEBAR_TITLE,
    CONF_STALE_HOURS,
    DEFAULT_BASE_TOPIC,
    DEFAULT_BROKER_PORT,
    DEFAULT_CRITICAL_BATTERY,
    DEFAULT_FIRE_EVENTS,
    DEFAULT_LOW_BATTERY,
    DEFAULT_PROBLEM_STALE,
    DEFAULT_PROBLEM_UPDATES,
    DEFAULT_SIDEBAR_PANEL,
    DEFAULT_SIDEBAR_TITLE,
    DEFAULT_STALE_HOURS,
    DOMAIN,
    MAX_SIDEBAR_TITLE,
    VERSION,
    clean_title,
    valid_link,
)
from .mqtt_transport import async_test_broker, broker_key
from .nc_catalog import NC_TYPE_IDS, nc_type_labels
from .notification_bridge import OPT_ENABLED as NC_OPT_ENABLED
from .notification_bridge import OPT_TYPES as NC_OPT_TYPES

_BATTERY_VALIDATOR = vol.All(vol.Coerce(int), vol.Range(min=1, max=99))
_STALE_VALIDATOR = vol.All(vol.Coerce(int), vol.Range(min=0, max=720))


def _valid_topic(base: str) -> bool:
    return bool(base) and "#" not in base and "+" not in base


_PORT_VALIDATOR = vol.All(vol.Coerce(int), vol.Range(min=1, max=65535))


def _broker_data(user_input: dict[str, Any]) -> dict[str, Any]:
    """Angaben zum externen MQTT-Broker (leer = MQTT-Integration von Home Assistant)."""
    host = str(user_input.get(CONF_BROKER_HOST) or "").strip()
    if not host:
        return {}
    return {
        CONF_BROKER_HOST: host,
        CONF_BROKER_PORT: int(user_input.get(CONF_BROKER_PORT) or DEFAULT_BROKER_PORT),
        CONF_BROKER_USERNAME: str(user_input.get(CONF_BROKER_USERNAME) or ""),
        CONF_BROKER_PASSWORD: str(user_input.get(CONF_BROKER_PASSWORD) or ""),
        CONF_BROKER_TLS: bool(user_input.get(CONF_BROKER_TLS)),
    }


def _unique_id(base: str, broker: dict[str, Any]) -> str:
    """Kennung des Eintrags: gleiches Base-Topic an verschiedenen Brokern ist erlaubt."""
    key = broker_key(broker)
    return f"{key}/{base}" if key else base


def _broker_schema(defaults: dict[str, Any]) -> dict[Any, Any]:
    """Formularfelder für den optionalen externen Broker."""
    return {
        vol.Optional(
            CONF_BROKER_HOST,
            description={"suggested_value": defaults.get(CONF_BROKER_HOST, "")},
        ): str,
        vol.Optional(
            CONF_BROKER_PORT,
            default=defaults.get(CONF_BROKER_PORT, DEFAULT_BROKER_PORT),
        ): _PORT_VALIDATOR,
        vol.Optional(
            CONF_BROKER_USERNAME,
            description={"suggested_value": defaults.get(CONF_BROKER_USERNAME, "")},
        ): str,
        vol.Optional(
            CONF_BROKER_PASSWORD,
            description={"suggested_value": defaults.get(CONF_BROKER_PASSWORD, "")},
        ): TextSelector(TextSelectorConfig(type=TextSelectorType.PASSWORD)),
        vol.Optional(
            CONF_BROKER_TLS, default=bool(defaults.get(CONF_BROKER_TLS, False))
        ): bool,
    }


def _overlaps_other_entry(
    flow: ConfigFlow,
    base: str,
    exclude_entry_id: str | None = None,
    broker: str = "",
) -> bool:
    """True, wenn ein Base-Topic in einem anderen verschachtelt ist.

    Mehrere Sticks brauchen getrennte Base-Topics. Liegt eines unter dem anderen
    (z. B. "zigbee2mqtt" und "zigbee2mqtt/stick2"), würde die erste Instanz die
    Nachrichten der zweiten mitlesen. Das gilt nur am selben Broker.
    """
    for entry in flow.hass.config_entries.async_entries(DOMAIN):
        if entry.entry_id == exclude_entry_id:
            continue
        if broker_key(entry.data) != broker:
            continue
        other = str(entry.data.get(CONF_BASE_TOPIC, "")).strip("/")
        if other and (
            base.startswith(f"{other}/") or other.startswith(f"{base}/")
        ):
            return True
    return False


class Z2MManagerConfigFlow(ConfigFlow, domain=DOMAIN):
    """Einrichtung: Base-Topic der Zigbee2MQTT-Instanz."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return Z2MManagerOptionsFlow()

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}

        if user_input is not None:
            base = user_input[CONF_BASE_TOPIC].strip().strip("/")
            broker = _broker_data(user_input)
            if not _valid_topic(base):
                errors[CONF_BASE_TOPIC] = "invalid_topic"
            elif _overlaps_other_entry(self, base, broker=broker_key(broker)):
                errors[CONF_BASE_TOPIC] = "topic_overlap"
            else:
                await self.async_set_unique_id(_unique_id(base, broker))
                self._abort_if_unique_id_configured()
                if broker:
                    error = await async_test_broker(self.hass, broker)
                    if error:
                        errors[CONF_BROKER_HOST] = error
                elif not await mqtt.async_wait_for_mqtt_client(self.hass):
                    return self.async_abort(reason="mqtt_unavailable")
            if not errors:
                return self.async_create_entry(
                    title=f"Zigbee2MQTT Manager ({base})"
                    + (f" @ {broker[CONF_BROKER_HOST]}" if broker else ""),
                    data={CONF_BASE_TOPIC: base, **broker},
                    options={
                        CONF_LOW_BATTERY: user_input[CONF_LOW_BATTERY],
                        CONF_CRITICAL_BATTERY: min(
                            DEFAULT_CRITICAL_BATTERY, user_input[CONF_LOW_BATTERY]
                        ),
                        CONF_FIRE_EVENTS: DEFAULT_FIRE_EVENTS,
                    },
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_BASE_TOPIC, default=DEFAULT_BASE_TOPIC): str,
                    vol.Required(
                        CONF_LOW_BATTERY, default=DEFAULT_LOW_BATTERY
                    ): _BATTERY_VALIDATOR,
                    **_broker_schema(user_input or {}),
                }
            ),
            errors=errors,
        )

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Base-Topic nachträglich ändern."""
        entry = self._get_reconfigure_entry()
        errors: dict[str, str] = {}

        if user_input is not None:
            base = user_input[CONF_BASE_TOPIC].strip().strip("/")
            broker = _broker_data(user_input)
            if not _valid_topic(base):
                errors[CONF_BASE_TOPIC] = "invalid_topic"
            elif _overlaps_other_entry(
                self, base, entry.entry_id, broker=broker_key(broker)
            ):
                errors[CONF_BASE_TOPIC] = "topic_overlap"
            else:
                existing = await self.async_set_unique_id(_unique_id(base, broker))
                if existing is not None and existing.entry_id != entry.entry_id:
                    return self.async_abort(reason="already_configured")
                if broker:
                    error = await async_test_broker(self.hass, broker)
                    if error:
                        errors[CONF_BROKER_HOST] = error
            if not errors:
                # Broker-Angaben ersetzen (nicht ergänzen): leer = zurück zur MQTT-Integration
                data = {
                    k: v
                    for k, v in entry.data.items()
                    if not k.startswith("broker_")
                }
                return self.async_update_reload_and_abort(
                    entry,
                    unique_id=_unique_id(base, broker),
                    title=f"Zigbee2MQTT Manager ({base})"
                    + (f" @ {broker[CONF_BROKER_HOST]}" if broker else ""),
                    data={**data, CONF_BASE_TOPIC: base, **broker},
                )

        return self.async_show_form(
            step_id="reconfigure",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_BASE_TOPIC,
                        default=(user_input or entry.data)[CONF_BASE_TOPIC],
                    ): str,
                    **_broker_schema(user_input or dict(entry.data)),
                }
            ),
            errors=errors,
        )


class Z2MManagerOptionsFlow(OptionsFlow):
    """Nachträglich änderbar: Batterie-Schwellen, Ereignisse und Notification Center."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            network_url = str(user_input.get(CONF_NETWORK_URL) or "").strip()
            if user_input[CONF_CRITICAL_BATTERY] > user_input[CONF_LOW_BATTERY]:
                errors[CONF_CRITICAL_BATTERY] = "critical_above_low"
            elif network_url and not valid_link(network_url):
                errors[CONF_NETWORK_URL] = "invalid_url"
            else:
                chosen = set(user_input.get(NC_OPT_TYPES, []))
                # Bestehende Optionen bleiben erhalten; die Meldungsarten werden als {Art: an/aus} gespeichert
                data = {
                    **self.config_entry.options,
                    **user_input,
                    # Leere Felder werden vom Formular weggelassen: bewusst leer = Standard
                    CONF_SIDEBAR_TITLE: clean_title(
                        user_input.get(CONF_SIDEBAR_TITLE), DEFAULT_SIDEBAR_TITLE, MAX_SIDEBAR_TITLE
                    ),
                    CONF_NETWORK_URL: network_url,
                    NC_OPT_TYPES: {t: t in chosen for t in NC_TYPE_IDS},
                }
                return self.async_create_entry(data=data)

        opts = self.config_entry.options
        manager = getattr(self.config_entry, "runtime_data", None)
        app = getattr(manager, "app", None) or {}
        raw_lang = str(self.hass.config.language)
        lang = "sr-Latn" if raw_lang.lower().replace("_", "-").startswith("sr-latn") else raw_lang[:2]
        latest = app.get("latest_version")
        link = app.get("release_url")
        if app.get("update_available"):
            update_info = {
                "de": f"⚠️ Neue Version verfügbar: **{latest}** – {link}",
                "nl": f"⚠️ Nieuwe versie beschikbaar: **{latest}** – {link}",
                "fr": f"⚠️ Nouvelle version disponible : **{latest}** – {link}",
                "es": f"⚠️ Nueva versión disponible: **{latest}** – {link}",
                "sr": f"⚠️ Доступна је нова верзија: **{latest}** – {link}",
                "sr-Latn": f"⚠️ Dostupna je nova verzija: **{latest}** – {link}",
            }.get(lang, f"⚠️ New version available: **{latest}** – {link}")
        elif latest:
            update_info = {
                "de": "✅ Aktuell",
                "nl": "✅ Actueel",
                "fr": "✅ À jour",
                "es": "✅ Actualizado",
                "sr": "✅ Ажурно",
                "sr-Latn": "✅ Ažurno",
            }.get(lang, "✅ Up to date")
        else:
            update_info = ""
        nc_chosen = opts.get(NC_OPT_TYPES, {})
        nc_chosen = nc_chosen if isinstance(nc_chosen, dict) else {}
        return self.async_show_form(
            step_id="init",
            description_placeholders={
                "version": app.get("version") or VERSION,
                "base_topic": getattr(manager, "base_topic", None)
                or self.config_entry.data.get(CONF_BASE_TOPIC, ""),
                "update_info": update_info,
            },
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_LOW_BATTERY,
                        default=opts.get(CONF_LOW_BATTERY, DEFAULT_LOW_BATTERY),
                    ): _BATTERY_VALIDATOR,
                    vol.Required(
                        CONF_CRITICAL_BATTERY,
                        default=opts.get(
                            CONF_CRITICAL_BATTERY, DEFAULT_CRITICAL_BATTERY
                        ),
                    ): _BATTERY_VALIDATOR,
                    vol.Required(
                        CONF_FIRE_EVENTS,
                        default=opts.get(CONF_FIRE_EVENTS, DEFAULT_FIRE_EVENTS),
                    ): bool,
                    vol.Required(
                        CONF_STALE_HOURS,
                        default=opts.get(CONF_STALE_HOURS, DEFAULT_STALE_HOURS),
                    ): _STALE_VALIDATOR,
                    vol.Required(
                        CONF_PROBLEM_UPDATES,
                        default=opts.get(CONF_PROBLEM_UPDATES, DEFAULT_PROBLEM_UPDATES),
                    ): bool,
                    vol.Required(
                        CONF_PROBLEM_STALE,
                        default=opts.get(CONF_PROBLEM_STALE, DEFAULT_PROBLEM_STALE),
                    ): bool,
                    vol.Required(
                        CONF_SIDEBAR_PANEL,
                        default=opts.get(CONF_SIDEBAR_PANEL, DEFAULT_SIDEBAR_PANEL),
                    ): bool,
                    # suggested_value statt default: so lässt sich das Feld auch leeren
                    vol.Optional(
                        CONF_SIDEBAR_TITLE,
                        description={
                            "suggested_value": opts.get(CONF_SIDEBAR_TITLE, DEFAULT_SIDEBAR_TITLE)
                        },
                    ): str,
                    vol.Optional(
                        CONF_NETWORK_URL,
                        description={"suggested_value": opts.get(CONF_NETWORK_URL, "")},
                    ): str,
                    vol.Required(
                        NC_OPT_ENABLED, default=opts.get(NC_OPT_ENABLED, True)
                    ): bool,
                    # Reihenfolge der Auswahl: nach Dringlichkeit (kritisch zuerst)
                    vol.Required(
                        NC_OPT_TYPES,
                        default=[t for t in NC_TYPE_IDS if nc_chosen.get(t, True)],
                    ): cv.multi_select(nc_type_labels(str(self.hass.config.language))),
                }
            ),
            errors=errors,
        )
