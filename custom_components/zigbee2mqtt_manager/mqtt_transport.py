# SHA256 (Inhalt ab Zeile 2, d.h. dieser Datei ohne diese erste Zeile): 3a95ca08e3f851bf010b6b0a4331971c2c0f1f82d0923c1e255e647ab003b310
"""MQTT-Transport: MQTT-Integration von Home Assistant oder ein eigener (externer) Broker.

Standard ist die MQTT-Integration von Home Assistant. Wer Zigbee2MQTT an einem anderen Broker
betreibt (z. B. an einem zweiten Standort im VPN), trägt den Broker in der Einrichtung ein; die
Integration verbindet sich dann selbst mit ihm. Zugangsdaten werden nie geloggt.
"""

from __future__ import annotations

import asyncio
import logging
import ssl
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from homeassistant.components import mqtt
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryNotReady

from .const import (
    CONF_BROKER_HOST,
    CONF_BROKER_PASSWORD,
    CONF_BROKER_PORT,
    CONF_BROKER_TLS,
    CONF_BROKER_USERNAME,
    DEFAULT_BROKER_PORT,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)

MessageCallback = Callable[[Any], None]
CONNECT_TIMEOUT = 15


@dataclass(slots=True)
class ExternalMessage:
    """Nachricht eines externen Brokers (gleiche Felder wie die der MQTT-Integration)."""

    topic: str
    payload: bytes
    retain: bool


def broker_key(data: Any) -> str:
    """Kennung des Brokers ("" = MQTT-Integration von Home Assistant, sonst "host:port")."""
    host = str(data.get(CONF_BROKER_HOST) or "").strip()
    if not host:
        return ""
    return f"{host.lower()}:{int(data.get(CONF_BROKER_PORT) or DEFAULT_BROKER_PORT)}"


class HomeAssistantTransport:
    """Nutzt die MQTT-Integration von Home Assistant."""

    external = False

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def async_wait_ready(self) -> None:
        if not await mqtt.async_wait_for_mqtt_client(self.hass):
            raise ConfigEntryNotReady("MQTT ist nicht verfügbar")

    async def async_subscribe(self, topic: str, callback_: MessageCallback) -> CALLBACK_TYPE:
        return await mqtt.async_subscribe(self.hass, topic, callback_)

    async def async_publish(self, topic: str, payload: str) -> None:
        await mqtt.async_publish(self.hass, topic, payload, qos=0, retain=False)


class ExternalTransport:
    """Eigene Verbindung zu einem anderen MQTT-Broker (paho-mqtt, Hintergrund-Thread)."""

    external = True

    def __init__(self, hass: HomeAssistant, entry_id: str, data: Any) -> None:
        self.hass = hass
        self._host = str(data.get(CONF_BROKER_HOST) or "").strip()
        self._port = int(data.get(CONF_BROKER_PORT) or DEFAULT_BROKER_PORT)
        self._username = str(data.get(CONF_BROKER_USERNAME) or "")
        self._password = str(data.get(CONF_BROKER_PASSWORD) or "")
        self._tls = bool(data.get(CONF_BROKER_TLS))
        self._client_id = f"{DOMAIN}_{entry_id[:12]}"
        self._client: Any = None
        self._subs: list[tuple[str, MessageCallback]] = []
        self._connected = asyncio.Event()

    # --- Aufbau ---------------------------------------------------------
    def _new_client(self) -> Any:
        import paho.mqtt.client as paho  # noqa: PLC0415 (nur bei externem Broker nötig)

        try:  # paho-mqtt 2.x
            client = paho.Client(
                paho.CallbackAPIVersion.VERSION2,
                client_id=self._client_id,
                protocol=paho.MQTTv311,
            )
        except AttributeError:  # paho-mqtt 1.x
            client = paho.Client(client_id=self._client_id, protocol=paho.MQTTv311)
        if self._username:
            client.username_pw_set(self._username, self._password)
        client.reconnect_delay_set(min_delay=1, max_delay=60)

        loop = self.hass.loop

        def on_connect(*args: Any) -> None:
            # v2: (client, userdata, flags, reason_code, properties); v1: (client, userdata, flags, rc)
            code = args[3] if len(args) > 3 else 0
            failed = bool(code.is_failure) if hasattr(code, "is_failure") else code != 0
            if failed:
                _LOGGER.warning("Externer MQTT-Broker %s:%s lehnt die Verbindung ab", self._host, self._port)
                return
            for topic, _cb in self._subs:
                client.subscribe(topic, 0)
            loop.call_soon_threadsafe(self._connected.set)

        def on_disconnect(*_args: Any) -> None:
            loop.call_soon_threadsafe(self._connected.clear)

        def on_message(_client: Any, _userdata: Any, msg: Any) -> None:
            message = ExternalMessage(msg.topic, bytes(msg.payload), bool(msg.retain))
            loop.call_soon_threadsafe(self._dispatch, message)

        client.on_connect = on_connect
        client.on_disconnect = on_disconnect
        client.on_message = on_message
        return client

    @callback
    def _dispatch(self, message: ExternalMessage) -> None:
        for topic, cb in list(self._subs):
            if _topic_matches(topic, message.topic):
                try:
                    cb(message)
                except Exception:  # noqa: BLE001
                    _LOGGER.exception("Fehler beim Verarbeiten einer MQTT-Nachricht")

    async def async_wait_ready(self) -> None:
        if self._client is None:
            self._client = await self.hass.async_add_executor_job(self._new_client)
            if self._tls:
                context = await self.hass.async_add_executor_job(ssl.create_default_context)
                self._client.tls_set_context(context)
            self._client.connect_async(self._host, self._port, keepalive=60)
            self._client.loop_start()
        try:
            await asyncio.wait_for(self._connected.wait(), CONNECT_TIMEOUT)
        except TimeoutError as err:
            await self.async_close()
            raise ConfigEntryNotReady(
                f"Externer MQTT-Broker {self._host}:{self._port} nicht erreichbar"
            ) from err

    async def async_subscribe(self, topic: str, callback_: MessageCallback) -> CALLBACK_TYPE:
        entry = (topic, callback_)
        self._subs.append(entry)
        if self._client is not None and self._connected.is_set():
            self._client.subscribe(topic, 0)

        @callback
        def _unsub() -> None:
            if entry in self._subs:
                self._subs.remove(entry)
            if self._client is not None and not any(t == topic for t, _ in self._subs):
                self._client.unsubscribe(topic)
            self.hass.async_create_task(self.async_close())

        return _unsub

    async def async_publish(self, topic: str, payload: str) -> None:
        if self._client is None or not self._connected.is_set():
            raise ValueError("Keine Verbindung zum externen MQTT-Broker")
        self._client.publish(topic, payload, qos=0, retain=False)

    async def async_close(self) -> None:
        client, self._client = self._client, None
        self._connected.clear()
        if client is not None:
            await self.hass.async_add_executor_job(_stop_client, client)


def _stop_client(client: Any) -> None:
    try:
        client.disconnect()
    finally:
        client.loop_stop()


def _topic_matches(pattern: str, topic: str) -> bool:
    """MQTT-Filter ('#' und '+') gegen ein Topic prüfen."""
    p_parts = pattern.split("/")
    t_parts = topic.split("/")
    for i, part in enumerate(p_parts):
        if part == "#":
            return True
        if i >= len(t_parts):
            return False
        if part != "+" and part != t_parts[i]:
            return False
    return len(p_parts) == len(t_parts)


def create_transport(hass: HomeAssistant, entry_id: str, data: Any) -> Any:
    """Passenden Transport wählen: externer Broker, wenn ein Host eingetragen ist."""
    if broker_key(data):
        return ExternalTransport(hass, entry_id, data)
    return HomeAssistantTransport(hass)


async def async_test_broker(hass: HomeAssistant, data: Any) -> str | None:
    """Verbindung zu einem Broker prüfen. None = in Ordnung, sonst Fehlerschlüssel für die Einrichtung."""
    transport = ExternalTransport(hass, "test", data)
    try:
        await transport.async_wait_ready()
    except ConfigEntryNotReady:
        return "broker_unreachable"
    except Exception:  # noqa: BLE001
        _LOGGER.debug("Broker-Test fehlgeschlagen", exc_info=True)
        return "broker_unreachable"
    finally:
        await transport.async_close()
    return None
