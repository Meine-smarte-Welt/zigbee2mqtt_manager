| [🇩🇪<br>**Deutsch**](README.md) | [🇬🇧<br>**English**](README.en.md) | [🇳🇱<br>**Nederlands**](README.nl.md) | [🇫🇷<br>**Français**](README.fr.md) | 🇪🇸<br>**Español** | [🇷🇸<br>**Српски**](README.sr.md) |
|:-:|:-:|:-:|:-:|:-:|:-:|

![Zigbee2MQTT Manager – banner](docs/images/zigbee2mqtt_manager.webp)

# Zigbee2MQTT Manager para Home Assistant

📖 **Guía detallada con contexto (en alemán):** [Zigbee2MQTT Manager para Home Assistant en meinesmartewelt.de](https://meinesmartewelt.de/zigbee2mqtt-manager-home-assistant/)

Gestiona Zigbee2MQTT sin salir de Home Assistant: dispositivos, baterías, actualizaciones de firmware, grupos, bindings y bridge en una sola tarjeta del panel, como integración de HACS. La estructura y el diseño se inspiran en la tarjeta de [FRITZ!Box Anrufe](https://github.com/Meine-smarte-Welt/fritzbox_anrufe): categorías con iconos, listas de filas, ventana de detalles, secciones en acordeón, editor gráfico y colores ajustables libremente.

## Contenido

- [Funciones](#funciones)
- [Novedades de la 1.2.1](#novedades-de-la-121)
- [Capturas](#capturas)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [La tarjeta](#la-tarjeta)
- [Colores](#colores)
- [Varias instancias (varios sticks)](#varias-instancias-varios-sticks)
- [Servicios](#servicios)
- [Eventos para automatizaciones](#eventos-para-automatizaciones)
- [Sensores](#sensores)
- [Visualización de la versión y aviso de actualización](#visualización-de-la-versión-y-aviso-de-actualización)
- [Notification Center (opcional)](#notification-center-opcional)
- [Ajustes de la integración](#ajustes-de-la-integración)
- [Seguridad](#seguridad)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Solución de problemas](#solución-de-problemas)
- [Historial de versiones](#historial-de-versiones)
- [Integridad de los archivos](#integridad-de-los-archivos)

## Funciones

La tarjeta tiene seis categorías en una barra de iconos (por debajo de unos 480 px de ancho solo se muestran los iconos). Cada categoría se puede mostrar u ocultar por separado.

| Categoría | Qué hace |
|---|---|
| **Dispositivos** | Lista con accesibilidad, modelo, señal, batería, «última actividad»; chips de estadísticas como filtros (sin conexión / batería baja / actualizaciones); búsqueda; orden; **agrupar** por fabricante o clase de dispositivo; **filtros** (estado, alimentación, señal, …) |
| **Batería** | Dispositivos con batería, primero el nivel más bajo; colores según los umbrales de baja y crítica |
| **Actualizaciones** | Firmware instalado frente a disponible; «Comprobar todos» e «Instalar todos uno tras otro» como tarea en segundo plano con progreso y cancelación |
| **Grupos** | Crear, renombrar, eliminar; añadir y quitar miembros |
| **Bindings** | Resumen de todos los vínculos entre dispositivos; desvincular; vincular de nuevo en la ventana del dispositivo |
| **Bridge** (rueda dentada) | **Versión de la aplicación** (integración y tarjeta, con aviso en color si hay una versión nueva), estado, coordinador, emparejamiento, opciones del bridge, reinicio, registro de eventos, **Notification Center** |

**Ventana del dispositivo** (tocar una fila) con secciones en acordeón: Información · **Funciones (expose)** · **Entidades (para automatizaciones)** · Renombrar (con la lista de entidades de HA afectadas) · Opciones del dispositivo (formulario del esquema de opciones de Z2M) · Firmware · Bindings · Grupos · Eliminar.

La sección **Funciones (expose)** muestra todas las funciones que Zigbee2MQTT ofrece para el dispositivo (p. ej. interruptor, brillo, color, temperatura, calidad del enlace): con nombre, propiedad, **valor actual** con su unidad, acceso (lectura / escritura / consulta), rango de valores o valores a elegir, descripción e indicación de configuración o diagnóstico. Las funciones compuestas (p. ej. color x/y) y los grupos como luz o interruptor se desglosan y agrupan; a partir de nueve funciones hay un campo de filtro. Mientras la sección está abierta, los valores se actualizan en cuanto el dispositivo envía algo (como máximo cada 3 segundos). Los **interruptores editables** (funciones sí/no, p. ej. el estado de un enchufe o una luz) se pueden conmutar directamente: el nuevo valor se muestra al instante y el dispositivo lo confirma poco después. Si el valor aún es desconocido, aparecen en su lugar los botones «Encender» y «Apagar». Las demás funciones solo se muestran; el dispositivo se controla como siempre mediante sus entidades de Home Assistant. Con `read_only: true` desaparecen los interruptores.

**Agrupar y filtrar** (Dispositivos, Batería y Actualizaciones): la selección **Agrupar** resume la lista como acordeón por **fabricante** o **clase de dispositivo** (lámparas, enchufes e interruptores, calefacción y clima, persianas y toldos, cerraduras, ventiladores, botones y mandos, sensores, otros). Cada grupo muestra el número y, si los hay, los dispositivos sin conexión; los dos iconos junto a la selección despliegan o pliegan todos los grupos. La zona plegable **Filtros** acota la lista: estado (en línea / sin conexión), alimentación (solo batería / solo red / batería baja), señal (buena / media / débil), rol de red (router / dispositivo final), firmware (actualización disponible), última actividad (hace más de 24 horas / 7 días), sin grupo Zigbee, fabricante y clase de dispositivo. Varios filtros se aplican a la vez; los filtros activos aparecen como pequeños chips que se quitan con un toque. La integración deduce la clase de dispositivo de las funciones del dispositivo (Zigbee2MQTT no proporciona una clase fija); los dispositivos sin funciones conocidas quedan en «Otros». Sin la disponibilidad de Z2M activada, «en línea/sin conexión» se deduce de «última actividad», igual que el punto de estado. Con la agrupación activa no se aplica `max_rows`.

**Área, dispositivo HA y comentario (desde 1.2.0):** la lista de dispositivos muestra, tras el modelo, el **área** de Home Assistant (determinada a través del dispositivo MQTT correspondiente; opción `show_area`). La ventana emergente muestra además el nombre del **dispositivo de Home Assistant** y, si está definido en Zigbee2MQTT, el **comentario** del dispositivo (ajuste de Z2M `description`). Con `show_comment: true` el comentario aparece como segunda línea en la lista. La búsqueda abarca área, dispositivo HA y comentario, y en **Agrupar** se añade **Área**. Si un área o el nombre de un dispositivo cambia en Home Assistant, la tarjeta lo sigue. El comentario se puede editar en la ventana, en **Comentario** (campo de texto, máximo 500 caracteres; **Guardar** lo escribe a través de Zigbee2MQTT en el ajuste del dispositivo `description`, un campo vacío lo elimina; no en modo de solo lectura).

**Dispositivos desactivados (desde 1.2.0, issue #7):** los dispositivos desactivados en Zigbee2MQTT (`disabled: true`) ya no cuentan como sin conexión. Quedan fuera de «Sin conexión», de los sensores, del sensor de problema y de los mensajes al Notification Center, y tienen su propio estado «Desactivado» (insignia, filtro **Estado → Desactivado**, contador `disabled`). El chip **Desactivados** (solo visible si existen tales dispositivos) filtra la lista, y el sensor **Dispositivos desactivados** los cuenta y lleva los nombres como atributo.

**Sin noticias desde hace tiempo (desde 1.2.0):** si Zigbee2MQTT informa de un dispositivo como en línea pero no envía nada desde hace más de N horas (24 por defecto, ajustable en **Configurar**, 0 = desactivado), recibe la insignia naranja «silencioso», un punto de estado naranja y el tiempo desde su último mensaje en naranja. También hay el chip **Silencioso** (solo visible si existen tales dispositivos) y el filtro **Estado → Sin noticias desde hace tiempo**. El tiempo desde el último mensaje («hace 5 segundos», «hace 3 minutos») aparece en cada fila; con la ordenación **Última actividad (la más antigua primero)** los dispositivos más callados quedan arriba. Requiere `advanced.last_seen: ISO_8601` en Zigbee2MQTT. La visualización es informativa; solo activa el sensor de problema si lo habilitas.

**Copiar entidades:** la sección de la ventana **Entidades (para automatizaciones)** lista las entidades de Home Assistant del dispositivo con un icono de copiar por fila. El icono de copiar en la cabecera de la ventana escribe todos los nombres de entidades (uno por línea) en el portapapeles, por ejemplo para pegarlos en automatizaciones y scripts. Si el navegador no permite el portapapeles (requiere HTTPS), el texto aparece seleccionado en un campo para copiarlo con Ctrl+C.

Otros puntos:

- **Caché:** batería, señal, estado OTA y «última actividad» sobreviven a un reinicio de Home Assistant (Z2M no envía los estados de los dispositivos como retained).
- **Los grupos ya no son dispositivos:** los topics de grupo no aparecen como dispositivo fantasma en la lista.
- **Confirmación con dos clics** en lugar de un cuadro de diálogo del navegador en acciones arriesgadas (eliminar, actualizar, reiniciar, desvincular, borrar).
- **Solo lectura:** `read_only: true` oculta todos los elementos de edición (tabletas de pared).
- **Zoom:** `zoom` escala toda la tarjeta.
- **Idiomas:** alemán, inglés, neerlandés, francés y español (según el idioma de Home Assistant).
- **Descarga de diagnóstico** con nombres y direcciones IEEE anonimizados.

## Novedades de la 1.2.1

- **Red desde la vista principal:** La tarjeta tiene su propia categoría **Red** (icono en la barra, se desactiva con `show_network`); sin dirección conocida, explica cómo indicarla. la lista de dispositivos y **Bridge → Estado** tienen un botón **Red** que abre el mapa de red de Zigbee2MQTT. La dirección sale de (1) la clave de tarjeta `network_url`, (2) la opción de la integración **Dirección del mapa de red**, (3) el ajuste de Z2M `frontend.url` (añadiendo `/#/network`) o (4) la app Zigbee2MQTT en la barra lateral (add-on con ingress). Si no se encuentra dirección, el botón no aparece; `show_network_link: false` también lo oculta. *Sin verificar:* que la ruta `/#/network` valga para cada versión de Z2M y que la detección del add-on en la barra lateral funcione en todas las instalaciones – si no, indica `network_url` (p. ej. `/a0d7b954_zigbee2mqtt`).
- **Enlaces a la entidad y al dispositivo:** en la ventana, tocar el nombre de una entidad (sección **Entidades**) abre directamente el cuadro de esa entidad en Home Assistant; el icono de copiar se mantiene. **Abrir dispositivo** (icono en la cabecera y botón en la sección) lleva a la página del dispositivo en Home Assistant con todas sus entidades. Requiere que Home Assistant conozca el dispositivo MQTT.
- **Nombre en la barra lateral:** en **Configurar** puedes fijar el **nombre en la barra lateral** (por defecto «Zigbee2MQTT Manager», máximo 40 caracteres). Es también el título del panel, así se distingue de la app Zigbee2MQTT. El icono no cambia. El cambio se aplica al instante, sin reinicio.
- **Dispositivos ausentes:** la integración recuerda cada dispositivo que Zigbee2MQTT haya informado alguna vez (nombre, fabricante, modelo, imagen, últimos valores; sobrevive a los reinicios). Si un dispositivo desaparece de la lista de Z2M, sigue visible **en gris** con la insignia **ausente**. Hay además la ficha **Ausentes**, el filtro **Estado → Falta en Zigbee2MQTT**, el sensor **Dispositivos ausentes** (nombres como atributo), el evento `zigbee2mqtt_manager_device_missing`, una entrada en el registro y – si está activado – el tipo `device_missing` del Notification Center. Cuando el dispositivo vuelve, la marca desaparece sola. **Olvidar** (en la ventana, o **Olvidar todos los ausentes** en el filtro «Ausentes») lo quita de la memoria para siempre; solo administradores. No cuentan como ausentes: los dispositivos que quitas desde la tarjeta o que Zigbee2MQTT informa como salidos (10 minutos de gracia) y una lista vacía (p. ej. al arrancar el bridge). Los ausentes no cuentan en «Dispositivos» ni activan la avería.
- **Enchufes innr sin imagen (corregido):** en modelos con un espacio en el nombre (p. ej. `SP 120`) faltaba la imagen porque la tarjeta formaba la dirección de otro modo que el frontend de Z2M. Ahora sustituye `:`, espacios y `/` por `-` como Z2M y usa además una imagen informada por Zigbee2MQTT (`definition.icon`). *Sin verificar* en los enchufes afectados; si zigbee2mqtt.io no tiene imagen del modelo, queda el icono.
- **Base topic:** la opción muestra ahora el base topic en uso en su descripción. No se pudo rastrear en el código por qué tras una actualización pudo aplicarse el topic por defecto `zigbee2mqtt`; la integración no cambia el base topic por sí misma. Compruébalo en **Configurar** si tras una actualización no aparecen dispositivos.
- **Idiomas:** nuevo **Српски (cirílico)** – README y tarjeta. La tarjeta tiene traducidos los términos principales al serbio; el resto de textos aparece en inglés.

## Capturas

Las capturas muestran la versión 1.1.0; las novedades de 1.2.x (botón de red, enlaces, dispositivos ausentes) aún no aparecen.

![Lista de dispositivos en la tarjeta](docs/images/zigbee2mqtt_manager_karte.webp)

![Funciones (expose) en la ventana del dispositivo](docs/images/zigbee2mqtt_manager_expose.webp)

![Agrupar y filtrar](docs/images/zigbee2mqtt_manager_gruppierung.webp)

![Editor gráfico de la tarjeta](docs/images/zigbee2mqtt_manager_ui.webp)

## Requisitos

- Home Assistant **2025.6** o posterior
- **Integración MQTT** configurada
- **Zigbee2MQTT 2.x** (la versión 1.x se detecta y la tarjeta la señala como no compatible)
- Recomendado: poner `availability: true` en Zigbee2MQTT; si no, no hay estado en línea/sin conexión. Para «última actividad», añade además `advanced.last_seen: ISO_8601`.

## Instalación

1. HACS → ⋮ → **Repositorios personalizados** → URL de este repositorio, categoría **Integración**
2. Instalar «Zigbee2MQTT Manager» y reiniciar Home Assistant
3. **Ajustes → Dispositivos y servicios → Añadir integración → Zigbee2MQTT Manager**
4. Introducir el base topic (por defecto `zigbee2mqtt`) y elegir el umbral de «batería baja»

De forma manual: copiar la carpeta `custom_components/zigbee2mqtt_manager` a `<config>/custom_components/`.

**Enlaces rápidos (desde 1.2.0):** [Añadir el repositorio en HACS](https://my.home-assistant.io/redirect/hacs_repository/?owner=Meine-smarte-Welt&repository=zigbee2mqtt_manager&category=integration) · [Configurar la integración](https://my.home-assistant.io/redirect/config_flow_start/?domain=zigbee2mqtt_manager). Tras la configuración, Home Assistant muestra un aviso único, y la integración añade en la barra lateral la entrada **Zigbee2MQTT** (un panel de Home Assistant, solo para administradores) que muestra la tarjeta como página completa, sin tener que construir un panel de control. Se puede desactivar en **Configurar → Entrada en la barra lateral**. Una integración no puede crear por sí misma un panel Lovelace real (Home Assistant no ofrece una interfaz pública para ello); una plantilla lista para usar está en `examples/dashboard-zigbee.yaml`.

## La tarjeta

La integración sirve la tarjeta y la registra como recurso de Lovelace (persistente, con `?v=<versión>` contra cachés de navegador obsoletas). No hay que añadir nada manualmente. Si Lovelace funciona en modo YAML, añade `/zigbee2mqtt_manager_files/zigbee2mqtt-manager-card.js` como recurso de tipo `module`.

Añadir la tarjeta: **Editar panel → Añadir tarjeta → «Zigbee2MQTT Manager»**. El editor gráfico agrupa todos los ajustes en secciones plegables (categorías, visualización con columnas, edición, red, colores). No hace falta YAML, pero es posible:

```yaml
type: custom:zigbee2mqtt-manager-card
title: Zigbee2MQTT Manager   # vacío ("") = sin título
# entry_id: abc123            # solo con varias instancias de Z2M
show_devices: true
show_battery: true
show_updates: true
show_groups: true
show_bindings: true
show_bridge: true
default_tab: devices
max_rows: 0                   # 0 = todo, si no «mostrar más»
zoom: 1
show_stats: true
show_images: true             # imágenes de dispositivos de zigbee2mqtt.io
show_search: true
show_filter_bar: true         # selección de orden
default_sort: name_asc        # name_asc | name_desc | battery_asc | lqi_asc | last_seen_desc | last_seen_asc | ota
show_group_by: true           # selección «Agrupar»
default_group_by: none        # none | vendor | class
show_filters: true            # zona de filtros
show_model: true
show_vendor: true
show_ieee: false
show_lqi: true
show_battery_value: true
show_last_seen: true
read_only: false
show_pairing: true
```

Más ejemplos: [`examples/`](examples/).

## Colores

En el editor, en **Colores** (o mediante las claves `color_*`). Cada valor puede ser hexadecimal (`#ff9800`), `rgb()`, `hsl()` o `var(--...)`. Vacío significa el valor predeterminado del tema. Los valores no válidos se descartan. La muestra abre el selector de color, el campo de texto admite cualquier valor CSS y «Restablecer todos los colores» lo vacía todo.

| Clave | Efecto |
|---|---|
| `color_tab_active` | Pestaña activa, botones principales |
| `color_success` | Bien: en línea, buena señal, batería llena, al día |
| `color_warning` | Aviso: batería baja, señal media, actualización en curso |
| `color_error` | Error: sin conexión, batería crítica, señal débil |
| `color_info` | Actualización disponible (firmware, nueva versión de la aplicación) |
| `color_row_icon` | Todos los iconos de lista (sustituye los colores de categoría) |
| `color_live_banner` | Fondo del banner (emparejamiento, tarea de firmware) |
| `color_icon_devices`, `_battery`, `_updates`, `_groups`, `_bindings`, `_bridge` | Icono de la categoría: colorea el icono de la pestaña y los iconos de fila |

Si `color_row_icon` está definido, gana ese color uniforme.

## Varias instancias (varios sticks)

Si hay más de una instancia de Zigbee2MQTT (p. ej. tres sticks coordinadores, cada uno con su propio Z2M), cada una se configura como entrada propia: **Ajustes → Dispositivos y servicios → Añadir integración → Zigbee2MQTT Manager**, siempre con el **base topic** correspondiente (`mqtt.base_topic` de la instancia de Z2M, p. ej. `zigbee2mqtt`, `zigbee2mqtt2`, `zigbee2mqtt3`). Los base topics deben ser distintos y no estar anidados (no `zigbee2mqtt` y `zigbee2mqtt/stick2`), o la configuración los rechaza. Cada instancia tiene sus propios sensores, eventos (con `base_topic` en los datos) y su propia caché.

En la tarjeta hay dos vías:

- **Selector (por defecto):** si hay más de una instancia y no se ha fijado ninguna, arriba en la tarjeta aparece una selección de sticks. La elección se recuerda en el navegador.
- **Una tarjeta por stick:** en el editor de la tarjeta, elige la instancia en **Instancia (clave)**, o en YAML:

```yaml
type: custom:zigbee2mqtt-manager-card
base_topic: zigbee2mqtt2     # o: entry_id: abc123
```

`base_topic` es la variante más sencilla, porque el `entry_id` no se ve en ningún otro sitio. Si se definen ambos, vale `entry_id`.

## Servicios

Ambos servicios están pensados para automatizaciones. Con varias instancias, `base_topic` (o `entry_id`) elige la instancia. Sin indicación, `check_updates` comprueba **todas** las instancias; `permit_join` exige una indicación con varias instancias, para que el emparejamiento nunca se abra por error en todos los sticks a la vez.

```yaml
action: zigbee2mqtt_manager.permit_join
data:
  base_topic: zigbee2mqtt2   # solo con varias instancias
  enabled: true
  duration: 120      # segundos, 10–254, opcional
```

```yaml
action: zigbee2mqtt_manager.check_updates
```

`check_updates` comprueba en segundo plano todos los dispositivos compatibles con OTA, uno tras otro con una pausa.

## Eventos para automatizaciones

Se pueden desactivar en las opciones de la integración («Disparar eventos de Home Assistant»). Al arrancar solo se registra el estado inicial, así que no hay avalancha de eventos.

| Evento | Datos |
|---|---|
| `zigbee2mqtt_manager_device_offline` / `_device_online` | `name`, `ieee`, `base_topic` |
| `zigbee2mqtt_manager_battery_low` | `name`, `ieee`, `battery` – al bajar del umbral |
| `zigbee2mqtt_manager_update_available` | `name`, `ieee`, `installed`, `latest` |
| `zigbee2mqtt_manager_device_joined` / `_device_left` | `name`, `ieee` |
| `zigbee2mqtt_manager_device_missing` | `name`, `ieee` – un dispositivo conocido falta en la lista de Z2M (desde la 1.2.1) |

```yaml
triggers:
  - trigger: event
    event_type: zigbee2mqtt_manager_battery_low
actions:
  - action: notify.mobile_app_handy
    data:
      message: "{{ trigger.event.data.name }}: batería {{ trigger.event.data.battery }} %"
```

## Sensores

`Dispositivos`, `Dispositivos sin conexión`, `Dispositivos con batería baja`, `Dispositivos con batería crítica`, `Actualizaciones de firmware disponibles`, `Dispositivos desactivados` y `Grupos`. Los sensores de sin conexión, batería, actualizaciones y dispositivos desactivados llevan la lista de dispositivos como atributo. Desde la 1.2.1 existe también el sensor `Dispositivos ausentes` (nombres como atributo).

### Problema global (sensor binario «Problema», desde 1.2.0)

Un sensor binario (clase de dispositivo `problem`) resume la red en un solo estado. Está **activado** en cuanto el bridge está sin conexión, un dispositivo activo está sin conexión, una batería está baja o crítica o (se puede desactivar) hay una actualización de firmware pendiente o, resp. (se puede activar), un dispositivo lleva tiempo sin dar señales. Los dispositivos desactivados no cuentan. Está pensado para una pequeña tarjeta en tu página de inicio que se pone roja y abre el panel de Zigbee al tocarla (`examples/kachel-leitseite.yaml`).

Atributos: `reasons` (`bridge_offline`, `offline`, `battery_low`, `battery_critical`, `update_available`, `stale`), `bridge_online`, `devices`, `offline`, `low_battery`, `critical_battery`, `updates_available`, `stale`, `disabled`, `stale_hours` y las listas de nombres `offline_devices`, `low_battery_devices`, `critical_battery_devices`, `update_devices`, `stale_devices`, `disabled_devices`.

En **Configurar** eliges si las actualizaciones de firmware (por defecto: sí) y «sin noticias desde hace tiempo» (por defecto: no) activan el problema. El ID de la entidad depende del idioma (con interfaz en inglés, p. ej. `binary_sensor.zigbee2mqtt_manager_zigbee2mqtt_problem`); aparece en Ajustes → Dispositivos y servicios. Una automatización con la lista de dispositivos está en `examples/sensor-stoerung-automation.yaml`. Los sensores contadores de arriba también excluyen los dispositivos desactivados.

## Visualización de la versión y aviso de actualización

La versión instalada aparece en tres sitios: en la tarjeta, en **Bridge (rueda dentada) → Versión de la aplicación**, arriba en el editor gráfico de la tarjeta y en el diálogo **Configurar** de la integración. Al arrancar y después cada 12 horas, la integración consulta GitHub (`api.github.com`, última release, o en su defecto la etiqueta de versión más alta) para saber si se ha publicado una versión más reciente. Si la hay, se resalta en color: marco naranja y aviso en la sección, una «↑» naranja en el icono de la rueda dentada, un recuadro de advertencia en el editor y un aviso en el diálogo Configurar. La actualización en sí se hace como siempre mediante HACS. **Comprobar ahora** lanza la consulta de inmediato. Si GitHub no está accesible, aparece «No se pudo comprobar»; la tarjeta sigue funcionando sin cambios.

Si las versiones de la tarjeta y de la integración difieren (caché del navegador obsoleta), también se marca en naranja.

## Notification Center (opcional)

**Novedad en 1.2.0.** Si la integración **Notification Center** está instalada, Zigbee2MQTT Manager puede enviarle sus notificaciones. El Notification Center recoge las notificaciones de todas las integraciones conectadas y las distribuye (push, voz, etc.). Sin Notification Center no cambia nada: el gestor funciona como antes, no se envía nada y los interruptores no tienen efecto.

La conexión sigue la interfaz común (esquema 1) a través del bus de eventos de Home Assistant. El gestor se registra solo al arrancar y a petición, y sincroniza su estado inicial. Está **activada** por defecto y se controla en dos sitios:

- **Tarjeta:** Bridge (rueda dentada) → sección **Notification Center** con un interruptor principal y uno por tipo de notificación (solo administradores, no en modo de solo lectura). El cambio surte efecto al instante, sin recargar la integración.
- **Configurar** la integración: «Enviar notificaciones al Notification Center» y la selección de los tipos de notificación.

| Tipo de notificación | Urgencia | Cuándo |
|---|---|---|
| Bridge sin conexión | crítica | Zigbee2MQTT informa de que el bridge está sin conexión; se cierra en cuanto vuelve a estar en línea |
| Batería crítica | crítica | Nivel de batería por debajo del umbral de «batería crítica» |
| Dispositivo sin conexión | aviso | Zigbee2MQTT informa de que el dispositivo está sin conexión |
| Batería baja | aviso | Nivel de batería por debajo del umbral de «batería baja», pero no de «crítica» |
| Actualización de firmware disponible | info | Hay una actualización de firmware para el dispositivo |
| Dispositivo nuevo | info | Un dispositivo se ha unido a la red (una sola vez) |
| Dispositivo salió de la red | info | Un dispositivo ha salido de la red (una sola vez) |

Se aplican los umbrales ya existentes de las opciones de la integración; no hay umbrales nuevos. Un dispositivo por debajo del umbral crítico aparece solo como «batería crítica», no además como «baja». Se crea exactamente una notificación por cambio; cuando la situación desaparece (el dispositivo vuelve a estar en línea, se cambia la batería), la notificación se cierra automáticamente. Tras el arranque, el gestor espera unos 20 segundos después de la lista de dispositivos antes de comunicar el estado inicial; este llega al Notification Center como «initial» y no provoca una avalancha de notificaciones push. Los textos están disponibles en alemán, inglés, neerlandés, francés y español.

Privacidad: las notificaciones contienen nombres de dispositivos y niveles de batería y permanecen dentro de Home Assistant. El diagnóstico y los registros solo contienen contadores por tipo de notificación, ningún contenido.

## Ajustes de la integración

En **Configurar** (con la versión instalada): umbral de «batería baja», umbral de «batería crítica» (debe ser menor o igual), eventos activados/desactivados, notificaciones al Notification Center activadas/desactivadas y selección de los tipos de notificación. **Reconfigurar** permite cambiar el base topic. Desde 1.2.0 también: «Sin noticias desde hace … horas» (0 = desactivado), «Las actualizaciones de firmware activan el problema» y «Sin noticias desde hace tiempo activa el problema». Además: «Entrada en la barra lateral» (por defecto: activada).

## Seguridad

Todas las acciones de escritura (renombrar, opciones, conmutar funciones, eliminar, firmware, grupos, bindings, emparejamiento, reinicio, comprobación de versión, ajustes del Notification Center) y la carga de los detalles del dispositivo están limitadas por WebSocket a los **administradores**. El backend valida las entradas (nombres duplicados, opciones desconocidas, valores de bridge permitidos). Al conmutar una función, el backend comprueba además que existe, que es escribible y que el valor es exactamente su valor de encendido o apagado. La tarjeta escapa todos los textos; los valores de color pasan por una lista de permitidos.

## Limitaciones conocidas

- **Payloads de Z2M sin validar:** `device/options`, la estructura de bindings en `bridge/devices` y las opciones del bridge (`log_level`, `last_seen`). Si tu versión de Z2M difiere, la función afectada queda sin efecto o notifica un error.
- Las opciones de dispositivo admiten tipos simples (número, interruptor, selección, texto), no opciones anidadas.
- La vista previa de entidades al renombrar encuentra los dispositivos mediante los identificadores MQTT y puede quedar vacía con una configuración de descubrimiento poco habitual.
- «Instalar todos» espera hasta dos horas por dispositivo a que termine la actualización.
- Tras un reinicio, batería, señal y estado OTA aparecen primero desde la caché y se actualizan con el siguiente mensaje del dispositivo.
- **Visualización sin conexión (desde 1.0.5) y estado de las pruebas:** la tarjeta toma la disponibilidad de Zigbee2MQTT. Si un dispositivo ha emitido en directo tras un mensaje de sin conexión, la tarjeta lo muestra como accesible. Se ha comprobado con datos simulados, **no con hardware real**. Está por ver si así desaparecen las falsas indicaciones de sin conexión notificadas en 1.0.4 (sensores, enchufe): se agradecen expresamente los comentarios.
- La ventana y la sección «Funciones (expose)» se corrigieron en 1.0.5 (bucle infinito al redibujar), pero tampoco se probaron con hardware real ni en la aplicación complementaria de iOS/Android.
- **Novedad en 1.1.0, estado de las pruebas:** agrupar, filtros, interruptores en las funciones y copiar se comprobaron con datos simulados y en un navegador sin interfaz, **no con hardware real** ni en la aplicación complementaria de iOS/Android. Está por ver si Zigbee2MQTT acepta cada interruptor como se espera (p. ej. en dispositivos con varios endpoints).
- La clase de dispositivo es una aproximación a partir de las funciones del dispositivo; los casos especiales pueden acabar en «Otros» o «Sensores».
- Los interruptores actúan al instante y sin confirmación (también los de configuración, como el bloqueo infantil). El portapapeles requiere HTTPS.
- **Novedad en 1.2.0, estado de las pruebas:** la conexión con el Notification Center, el sensor de problema, el sensor «Dispositivos desactivados», la asignación de área/dispositivo HA, el comentario (visualización y edición), los dispositivos desactivados con su chip, «sin noticias desde hace tiempo» y la entrada de la barra lateral se comprobaron con mensajes MQTT y registros simulados (pytest con el entorno de pruebas de Home Assistant) y en un navegador simulado (jsdom), **no en hardware real, no con un Notification Center real, no en Safari, Chrome, Firefox ni en la aplicación companion, y no con 75 dispositivos reales**. Lo mismo vale para las correcciones del parpadeo y del salto de desplazamiento (issue #5); por eso valores como «visto por última vez» y la señal se actualizan como mucho cada 2 segundos. Si el bridge se reinicia, según el ajuste de disponibilidad de Zigbee2MQTT los dispositivos pueden notificarse brevemente como sin conexión y cerrarse después. La asignación al dispositivo HA reconoce la dirección IEEE en los identificadores MQTT; con un descubrimiento inusual, área y dispositivo HA quedan vacíos. El comentario procede de la configuración del dispositivo en Z2M (`description`) y se establece al guardar mediante `bridge/request/device/options`; no está comprobado si tu versión de Z2M lo incluye en `bridge/info` y acepta el guardado como se espera. «Sin noticias desde hace tiempo» es informativo y no es un tipo de notificación propio del Notification Center. La entrada de la barra lateral es un panel de Home Assistant y no un panel Lovelace (issue #6); solo se comprobó frente al registro de paneles del entorno de pruebas, no en una barra lateral real.
- **Novedad en 1.2.1, estado de pruebas:** botón de red, enlaces de entidad y dispositivo, ausentes en gris y el cuadro del nombre se han comprobado con datos simulados, **no en hardware real ni en una instalación real de Home Assistant**. La tarjeta serbia está traducida solo en parte.

## Solución de problemas

- **No se encuentra la tarjeta:** vacía la caché del navegador; en Ajustes → Paneles → Recursos comprueba que exista `/zigbee2mqtt_manager_files/…` (en modo YAML, añádelo manualmente).
- **Un dispositivo aparece sin conexión pero es accesible:** el estado lo notifica el propio Zigbee2MQTT (`<base_topic>/<dispositivo>/availability`). Comprueba ahí el valor, p. ej. con MQTT Explorer (Ajustes → Dispositivos y servicios → MQTT → Configurar). Si hay problemas, envía la descarga de diagnóstico e indica el ajuste de Z2M `availability` (p. ej. `timeout`) y el modelo del dispositivo. En dispositivos con batería, Z2M marca «offline» solo tras horas sin mensajes.
- **Sin estado en línea/sin conexión:** activa `availability: true` en Zigbee2MQTT. Sin disponibilidad, el punto del icono muestra el estado deducido de «última actividad»: verde semitransparente = oído en las últimas 25 horas, naranja = nada oído desde hace más tiempo, gris = aún ningún mensaje. Una información emergente en el punto explica el origen. El rojo («sin conexión») solo existe con la disponibilidad de Z2M activada.
- **Imágenes de dispositivos:** la tarjeta carga las imágenes directamente en el navegador desde `www.zigbee2mqtt.io` (la misma fuente que la interfaz de Z2M, archivo según el nombre del modelo). Un `icon` definido en Z2M para el dispositivo tiene prioridad. Si no hay imagen o el sitio no es accesible (p. ej. sin internet), aparece el icono. Con `show_images: false` no se hacen peticiones externas.
- **Falta «última actividad»:** define `advanced.last_seen: ISO_8601` o cambia la opción del bridge en la categoría Bridge.
- **«Sin conexión con la integración»:** ¿está cargada la integración? ¿Son correctos `base_topic` o `entry_id`?
- **Las funciones (expose) faltan o muestran «aún sin valor»:** el valor aparece en cuanto el dispositivo envía por primera vez (Zigbee2MQTT no conserva los estados de los dispositivos). La sección solo se muestra para dispositivos con definición de Zigbee2MQTT. La carga de los detalles está reservada a los administradores.
- **La ventana o las funciones (expose) no responden (solo versión 1.0.4):** actualiza a 1.0.5, reinicia Home Assistant, vacía la caché del navegador (Ctrl+F5) o recarga la aplicación complementaria.
- **Banner del bridge «Versión no compatible»:** Zigbee2MQTT 1.x no es compatible.
- **Copiar no funciona:** el navegador solo permite el portapapeles mediante HTTPS (o `localhost`). Si no, el texto aparece seleccionado en un campo de la ventana: copia con Ctrl+C.
- **Un interruptor en las funciones no hace nada:** el comando va a `<base_topic>/<dispositivo>/set`. Comprueba en Zigbee2MQTT que el dispositivo es accesible; la tarjeta muestra el valor que devuelve el dispositivo.
- **No llega nada al Notification Center:** ¿está instalada y cargada la integración Notification Center? ¿Están activados el interruptor principal y el tipo correspondiente (tarjeta: Bridge → Notification Center)? Tras el arranque, el gestor espera unos 20 segundos antes de enviar el estado inicial.
- Registros: pon `custom_components.zigbee2mqtt_manager` en `debug`.

## Historial de versiones

| Versión | Cambios |
|---|---|
| **1.2.2** | Novedad: categoría propia **Red** en la barra de la tarjeta (explica cómo indicar la dirección del mapa de red, `show_network`). Corregido: con el idioma de Home Assistant **serbio (latino, `sr-Latn`)**, la tarjeta, el mensaje de bienvenida y el aviso de versión salían en cirílico porque solo se evaluaba la parte «sr»; ahora hay un bloque de textos en latino. |
| **1.2.1** | Novedad: botón **Red** (mapa de red de Zigbee2MQTT), enlaces de entidades y dispositivo a Home Assistant, **nombre en la barra lateral** configurable, **dispositivos ausentes** visibles en gris (ficha, filtro, sensor, evento, Notification Center, «Olvidar»), idioma **Српски**, README con barra de idiomas con banderas, enlace al blog e imágenes. Corregido: imágenes que faltaban en modelos con espacios (p. ej. enchufes innr). |
| **1.2.0** | Novedad: el **comentario** de un dispositivo se puede **editar** en la ventana (sección «Comentario», guardado a través de Zigbee2MQTT en `description`, no en modo de solo lectura). Novedad: chip **Desactivados** y sensor **Dispositivos desactivados** (contador y lista de nombres). Novedad: **entrada en la barra lateral** (panel de Home Assistant, solo administradores, desactivable en Configurar) que muestra la tarjeta como página completa (issue #6). Novedad: **conexión con el Notification Center** (opcional, interfaz esquema 1) con siete tipos de notificación (bridge sin conexión, batería crítica, dispositivo sin conexión, batería baja, actualización de firmware, dispositivo nuevo, dispositivo que ha dejado la red), interruptor principal e interruptor por tipo en la tarjeta y en el diálogo Configurar. Novedad: **problema global** como sensor binario (clase de dispositivo `problem`) con todos los contadores y listas de dispositivos como atributos; **área**, **dispositivo HA** y **comentario** en lista, ventana y búsqueda, agrupar por **área**; **«sin noticias desde hace tiempo»** (chip, filtro, insignia, horas ajustables); ayudas de configuración (enlaces my.home-assistant.io, aviso único tras la configuración, plantilla de panel en `examples`). Corregido (issue #7): los dispositivos **desactivados** en Zigbee2MQTT ya no cuentan como sin conexión (estado propio «Desactivado», excluidos de contadores, sensores y Notification Center). Corregido (issue #5): la tarjeta **parpadeaba y saltaba arriba al desplazarse**, porque se redibujaba por completo en cada actualización de datos; ahora solo se actualizan las partes modificadas (imágenes, filas, acordeones y foco de entrada permanecen, redibujado por datos como mucho cada 2 segundos). Corregido: **escribir en la búsqueda y los campos en el escritorio** activaba atajos de teclado de Home Assistant (p. ej. «e» abría la búsqueda de entidades). Corregido (issue #4): asignación de dispositivos HA sin la correspondencia obsoleta `device_registry.devices`. Los cambios en los interruptores del Notification Center ya no recargan la integración. Restos de inglés en los textos alemanes (`strings.json`) corregidos. **Francés** (gracias a @Locodice67, PR #3; adoptado y adaptado: tuteo, textos nuevos) y **español** añadidos. |
| **1.1.0** | Novedad: **agrupar** las listas por fabricante o clase de dispositivo (acordeón) y **filtrarlas** (estado en línea/sin conexión, alimentación, señal, rol de red, firmware, última actividad, sin grupo Zigbee, fabricante, clase de dispositivo; filtros activos como chips). Los **interruptores** editables en «Funciones (expose)» se pueden conmutar directamente. Nueva sección de la ventana **Entidades (para automatizaciones)** y botones de copiar para los nombres de entidades. Editor: `show_group_by`, `default_group_by`, `show_filters`. Backend: nueva acción `set_expose` (solo administradores, valores validados) y clase de dispositivo por dispositivo. |
| 1.0.5 | Corregido: la ventana y la sección «Funciones (expose)» no respondían (bucle infinito al redibujar, la imagen del dispositivo parpadeaba). Visualización sin conexión protegida frente a mensajes obsoletos. Neerlandés añadido (tarjeta, integración, README), LICENSE y `examples/` añadidos. Gracias a @pr0xyzer (PR #2): asignación de entidades de HA mediante identificadores MQTT con más de dos valores (lista al renombrar). |
| 1.0.4 | Todas las funciones expose en la ventana del dispositivo, varios sticks (varias instancias), corrección en las opciones de dispositivo. |
| 1.0.3 | Primera versión oficial. |

## Integridad de los archivos

Cada archivo `.py`, `.js` y `.yaml` lleva en la primera línea un hash SHA-256 del contenido a partir de la línea 2. Comprobación: `tail -n +2 archivo.py | sha256sum`. Los archivos JSON no pueden llevar comentarios; sus hashes (SHA-256 del archivo completo) están aquí:

| Archivo | SHA-256 |
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

## Licencia

MIT
