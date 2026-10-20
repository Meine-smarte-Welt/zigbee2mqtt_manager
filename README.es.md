🇩🇪 [Deutsch](README.md) · [🇬🇧 English](README.en.md) · [🇳🇱 Nederlands](README.nl.md) · [🇫🇷 Français](README.fr.md) · 🇪🇸 Español

# Zigbee2MQTT Manager para Home Assistant

Gestiona Zigbee2MQTT sin salir de Home Assistant: dispositivos, baterías, actualizaciones de firmware, grupos, bindings y bridge en una sola tarjeta del panel, como integración de HACS. La estructura y el diseño se inspiran en la tarjeta de [FRITZ!Box Anrufe](https://github.com/Meine-smarte-Welt/fritzbox_anrufe): categorías con iconos, listas de filas, ventana de detalles, secciones en acordeón, editor gráfico y colores ajustables libremente.

## Contenido

- [Funciones](#funciones)
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

**Copiar entidades:** la sección de la ventana **Entidades (para automatizaciones)** lista las entidades de Home Assistant del dispositivo con un icono de copiar por fila. El icono de copiar en la cabecera de la ventana escribe todos los nombres de entidades (uno por línea) en el portapapeles, por ejemplo para pegarlos en automatizaciones y scripts. Si el navegador no permite el portapapeles (requiere HTTPS), el texto aparece seleccionado en un campo para copiarlo con Ctrl+C.

Otros puntos:

- **Caché:** batería, señal, estado OTA y «última actividad» sobreviven a un reinicio de Home Assistant (Z2M no envía los estados de los dispositivos como retained).
- **Los grupos ya no son dispositivos:** los topics de grupo no aparecen como dispositivo fantasma en la lista.
- **Confirmación con dos clics** en lugar de un cuadro de diálogo del navegador en acciones arriesgadas (eliminar, actualizar, reiniciar, desvincular, borrar).
- **Solo lectura:** `read_only: true` oculta todos los elementos de edición (tabletas de pared).
- **Zoom:** `zoom` escala toda la tarjeta.
- **Idiomas:** alemán, inglés, neerlandés, francés y español (según el idioma de Home Assistant).
- **Descarga de diagnóstico** con nombres y direcciones IEEE anonimizados.

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

HACS solo muestra las versiones preliminares (p. ej. `1.1.1b1`) con la opción «Mostrar versiones beta».

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

`Dispositivos`, `Dispositivos sin conexión`, `Dispositivos con batería baja`, `Dispositivos con batería crítica`, `Actualizaciones de firmware disponibles` y `Grupos`. Los sensores de sin conexión, batería y actualizaciones llevan la lista de dispositivos como atributo.

## Visualización de la versión y aviso de actualización

La versión instalada aparece en tres sitios: en la tarjeta, en **Bridge (rueda dentada) → Versión de la aplicación**, arriba en el editor gráfico de la tarjeta y en el diálogo **Configurar** de la integración. Al arrancar y después cada 12 horas, la integración consulta GitHub (`api.github.com`, última release, o en su defecto la etiqueta de versión más alta) para saber si se ha publicado una versión más reciente. Si la hay, se resalta en color: marco naranja y aviso en la sección, una «↑» naranja en el icono de la rueda dentada, un recuadro de advertencia en el editor y un aviso en el diálogo Configurar. La actualización en sí se hace como siempre mediante HACS. **Comprobar ahora** lanza la consulta de inmediato. Si GitHub no está accesible, aparece «No se pudo comprobar»; la tarjeta sigue funcionando sin cambios.

**Versiones preliminares:** `releases/latest` de GitHub nunca devuelve versiones preliminares. Si usas una (`b`/`rc`), la integración consulta además la lista de las últimas releases y te avisa de la siguiente beta (`1.1.1b1` < `1.1.1rc1` < `1.1.1`). Con una versión final instalada no se muestran versiones preliminares.

Si las versiones de la tarjeta y de la integración difieren (caché del navegador obsoleta), también se marca en naranja.

## Notification Center (opcional)

**Novedad en 1.1.1b1 (versión preliminar).** Si la integración **Notification Center** está instalada, Zigbee2MQTT Manager puede enviarle sus notificaciones. El Notification Center recoge las notificaciones de todas las integraciones conectadas y las distribuye (push, voz, etc.). Sin Notification Center no cambia nada: el gestor funciona como antes, no se envía nada y los interruptores no tienen efecto.

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

En **Configurar** (con la versión instalada): umbral de «batería baja», umbral de «batería crítica» (debe ser menor o igual), eventos activados/desactivados, notificaciones al Notification Center activadas/desactivadas y selección de los tipos de notificación. **Reconfigurar** permite cambiar el base topic.

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
- **Novedad en 1.1.1b2, estado de las pruebas:** las correcciones del parpadeo, el salto de desplazamiento y los atajos de teclado se comprobaron en un navegador simulado (jsdom), **no en Safari, Chrome, Firefox ni en la aplicación complementaria, ni con 75 dispositivos reales**. Por ello, valores como «última actividad» y la señal se actualizan como máximo cada 2 segundos.
- **Novedad en 1.1.1b1, estado de las pruebas:** la conexión con el Notification Center se comprobó con eventos y datos simulados, **no con un Notification Center real ni con hardware real**. Cuando el bridge se reinicia, los dispositivos pueden notificarse brevemente como sin conexión y cerrarse de nuevo, según el ajuste de disponibilidad de Zigbee2MQTT. HACS solo muestra las versiones preliminares con la opción «Mostrar versiones beta».

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
| **1.1.1b2** (versión preliminar) | Corregido (issue #5): la tarjeta **parpadeaba y saltaba arriba al desplazarse**, porque se redibujaba por completo en cada actualización de datos (las imágenes se recargaban, la página se acortaba un instante). Ahora solo se actualizan las partes modificadas: imágenes, filas, acordeones y foco de entrada permanecen, no se dibuja nada si el contenido no cambia, y el redibujado por datos ocurre como máximo cada 2 segundos. Corregido: **escribir en la búsqueda y otros campos en el ordenador** activaba atajos de teclado de Home Assistant (p. ej. «e» abría la búsqueda de entidades); los eventos de teclado de los campos de entrada ya no llegan a Home Assistant. |
| **1.1.1b1** (versión preliminar) | Novedad: **conexión con el Notification Center** (opcional, interfaz esquema 1) con siete tipos de notificación (bridge sin conexión, batería crítica, dispositivo sin conexión, batería baja, actualización de firmware, dispositivo nuevo, dispositivo salió de la red), un interruptor principal y uno por tipo en la tarjeta y en el diálogo Configurar. La comprobación de actualizaciones reconoce las **versiones preliminares** (`1.1.1b1` < `1.1.1rc1` < `1.1.1`): con una beta te enteras de la siguiente beta; con una versión final no ves versiones preliminares. **Francés y español** añadidos (tarjeta, integración, README). Cambiar los interruptores del Notification Center ya no recarga la integración. Corregido: restos de inglés en los textos alemanes (`strings.json`). |
| **1.1.0** | Novedad: **agrupar** las listas por fabricante o clase de dispositivo (acordeón) y **filtrarlas** (estado en línea/sin conexión, alimentación, señal, rol de red, firmware, última actividad, sin grupo Zigbee, fabricante, clase de dispositivo; filtros activos como chips). Los **interruptores** editables en «Funciones (expose)» se pueden conmutar directamente. Nueva sección de la ventana **Entidades (para automatizaciones)** y botones de copiar para los nombres de entidades. Editor: `show_group_by`, `default_group_by`, `show_filters`. Backend: nueva acción `set_expose` (solo administradores, valores validados) y clase de dispositivo por dispositivo. |
| 1.0.5 | Corregido: la ventana y la sección «Funciones (expose)» no respondían (bucle infinito al redibujar, la imagen del dispositivo parpadeaba). Visualización sin conexión protegida frente a mensajes obsoletos. Neerlandés añadido (tarjeta, integración, README), LICENSE y `examples/` añadidos. Gracias a @pr0xyzer (PR #2): asignación de entidades de HA mediante identificadores MQTT con más de dos valores (lista al renombrar). |
| 1.0.4 | Todas las funciones expose en la ventana del dispositivo, varios sticks (varias instancias), corrección en las opciones de dispositivo. |
| 1.0.3 | Primera versión oficial. |

## Integridad de los archivos

Cada archivo `.py`, `.js` y `.yaml` lleva en la primera línea un hash SHA-256 del contenido a partir de la línea 2. Comprobación: `tail -n +2 archivo.py | sha256sum`. Los archivos JSON no pueden llevar comentarios; sus hashes (SHA-256 del archivo completo) están aquí:

| Archivo | SHA-256 |
|---|---|
| `custom_components/zigbee2mqtt_manager/manifest.json` | `030826f739709dc575398ab4142fb7bc81262b419fab3176d6f07e69db352617` |
| `custom_components/zigbee2mqtt_manager/strings.json` | `b95be5163fc86774997d79f2907b0041723ca96962760bdbeae9e3587eda29a3` |
| `custom_components/zigbee2mqtt_manager/icons.json` | `2e739f9952d7c56a3062cef2b0a70f58441fb1bb651ca58713cb77fac72f9762` |
| `custom_components/zigbee2mqtt_manager/translations/de.json` | `b95be5163fc86774997d79f2907b0041723ca96962760bdbeae9e3587eda29a3` |
| `custom_components/zigbee2mqtt_manager/translations/en.json` | `6c434b2e5ed8025cc766c7f3afff3fd775c0caf5defb76195c2db67f3a62ffef` |
| `custom_components/zigbee2mqtt_manager/translations/nl.json` | `e8ef9b7f09651b6bdd096855de98c6a439c36ab48830bc785c351dd2efb5f5d0` |
| `custom_components/zigbee2mqtt_manager/translations/fr.json` | `12ab5093a5780719fd93b05b7bd645e734e91ce49ca5b1e75d03817029f27226` |
| `custom_components/zigbee2mqtt_manager/translations/es.json` | `9f0e55a3edbaf1ac86d48750d5f0705b7bbdf57768b37f38bc682801bf1ca9a2` |
| `hacs.json` | `8939982e245783f7a41fb7f76e3da661b7250b5cec9385085ab68f19cea5cfda` |

## Licencia

MIT
