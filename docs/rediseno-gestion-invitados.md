# Rediseño de Gestión de invitados, header y navegación mobile

Documenta el trabajo de la rama `site-guests-design`: la implementación del mockup de Claude
Design **"Gestion de invitados.dc.html"** en `/dashboard/guests`, más los cambios que se
derivaron de ahí en el header del dashboard, el panel de Seguimiento, el editor (`/dashboard/build`)
y la navegación de mobile.

Sustituye buena parte de lo descrito en [`guest-management.md`](./guest-management.md): la
tabla de columnas que ese documento describe ya no existe.

## Por qué

El mockup replantea la página de invitados de una tabla con encabezado y scroll horizontal a
un flujo por pasos con tarjetas fluidas. Al implementarlo, la barra superior de la página y el
menú de herramientas dejaron de tener sentido donde estaban, y eso arrastró cambios al header
y a la navegación de mobile.

---

## 1. `/dashboard/guests`

### Escalera de pasos en lugar de la tab bar

La `Tabs` de Ant Design conserva el estado (`activeKey`) y el contenido, pero su barra se
reemplaza con `renderTabBar`: una tarjeta blanca con cinco botones, cada uno con kicker
(`Resumen` / `Paso 1` / `Paso 2` / `Paso 3` / `Aparte`), etiqueta corta y contador. El activo va
en `--dark-blue-500`.

`tabBarExtraContent` desapareció: lo que vivía ahí (nuevo invitado, envío masivo, vista de
confirmados) se movió al toolbar de cada sección o al menú "⋯".

### Toolbar por sección

Cada tab trae su propio toolbar en lugar de la barra fija de la página:

| Sección | Toolbar |
|---|---|
| Paso 1 · Por invitar | buscador · Filtros · ⋯ · **+ Nuevo invitado** |
| Paso 2 · Esperando respuesta | buscador · **Sin entregar** · Filtros · ⋯ |
| Paso 3 · Confirmados | buscador *"por nombre o mesa"* · **Sin mesa** · Filtros · ⋯ |
| Aparte · No asistirán | sin toolbar (así está el mockup) |

- **Filtros** abre un panel con etiqueta, mesa, prioridad, categoría y lado, con contador de
  filtros activos.
- **Sin entregar** es un filtro nuevo (`filterDelivery`), conectado a `filteredGuests` y a
  `hasActiveFilters`.
- **Sin mesa** reusa el `filterTable === 'no-table'` que ya existía.
- **⋯** abre `renderGlobalTools()`: descargables, mapa de mesas, evento público/privado y
  lector de pases — el contenido del antiguo botón "≡" de la barra superior.

En *No asistirán*, como no hay toolbar y los filtros son estado compartido entre tabs, la fila
de orden muestra un chip **"Limpiar filtros"** cuando hay alguno activo. Sin eso, esa lista
podía verse vacía sin explicación.

### Tarjetas de invitado

La lista tipo tabla (encabezado + celdas de ancho fijo + scroll horizontal) se sustituyó por
tarjetas fluidas: avatar con iniciales, nombre + teléfono + código, badges, "Copiar link",
acción y chevron que abre el drawer del invitado. Los acompañantes van en la franja beige
inferior.

La columna de badges es una **columna**: fila de badges arriba (estado de envío, etiqueta,
prioridad) y debajo la fecha del envío / último estado.

```
.gx-chips-col
├── .gx-chips        ← [estado envío] [etiqueta] [prioridad]
└── .gx-status-when  ← "hace 4 meses"
```

Las acciones se reimplementaron por tab en vez de salir de la columna `send`:

| Tab | Función | Acción |
|---|---|---|
| Por invitar | `renderCreatedAction` | *Enviar invitación* (verde) + botón de check para marcar como invitado a mano |
| Esperando | `renderSentAction` | *Reintentar* si el envío falló, *Recordar* en el resto |
| Confirmados | `renderTableAction` | *Asignar mesa* o píldora blanca con *Mesa N* |
| No asistirán | — | sin acción |

Los botones deshabilitados usan **`aria-disabled` en vez de `disabled`**: un `<button disabled>`
no emite eventos de mouse y el Tooltip con el motivo del bloqueo (sin fecha límite, sin
créditos, lada no mexicana) nunca se vería.

### Fecha límite de confirmación

Dos formas según el estado:

- **Sin definir** → alerta morada (`.gx-alert--accent`) **arriba** del buscador, con botón
  *Definir fecha*. Es un bloqueo real: sin fecha límite no se puede enviar ningún recordatorio.
- **Definida** → línea de texto discreta **debajo** del buscador: `Fecha límite para confirmar ·
  27 de agosto de 2026 · Cambiar`.

El `DatePicker` no tiene disparador visible propio: vive oculto y lo abre el enlace/botón
(`rsvpPickerOpen`).

### Orden de la lista

El rediseño quita el encabezado de columnas, así que el sort que vivía ahí se movió a una fila
de chips "Ordenar por" (mismo ciclo asc → desc → sin orden, misma función `cycleTabSort`).

### Código eliminado

Al reimplementar las acciones por tab, el sistema de columnas quedó sin ningún punto de
entrada y se eliminó: `columns`, `openColumns`, `tableProps`, `getTabColumns`,
`renderSortableHeader`, `renderBulkHeaderCheck`, `handleMessageStatus`, `renderReminderButton`,
`translateState`, `linkColor`, `renderGuestCardRow`, `renderGroupedCards`, `renderFlatRows` y
`renderConfirmedByTable`.

`GuestsPage.jsx` pasó de ~3 900 a **~3 000 líneas**.

> `renderConfirmedByTable` (la vista "por mesa") ya era inalcanzable antes de este trabajo:
> ningún control ponía `confirmedView === 'table'`. Se fue junto con el toggle
> *Por grupo / Individual*, que el usuario pidió quitar.

### Banderas

`GuestsPage.jsx` mantiene tres constantes de visibilidad al inicio del archivo:

| Bandera | Estado | Qué esconde |
|---|---|---|
| `SHOW_BULK_SEND` | `false` | Envío masivo (crear envío, selección por bloques) |
| `SHOW_TICKETS_DISTRIBUTION` | `false` | Gráfica de pastel del control de pases |
| `SHOW_TICKETS_CONTROL` | `false` | Editor de pases dentro del menú "⋯" — se movió al header |

---

## 2. Panel de Seguimiento (`GuestsOverview`)

Reescrito completo contra el nuevo mockup. Dos columnas:

- **Izquierda**: *Qué hacer hoy* (titular + filas de caso con su botón) · *Distribución de
  invitados* · *Avance de confirmaciones* (barras diarias)
- **Derecha**: tarjeta de **Lia** · contador de **Confirmados** · embudo *Dónde se queda la gente*

### Orden en mobile

Las seis tarjetas viven en dos `.col` distintas, así que al colapsar a una columna el DOM no
podía dar el orden pedido. En ≤1100px las `.col` pasan a `display: contents` — las seis se
vuelven hijas directas del grid — y cada tarjeta recibe su `order`:

```
1. Confirmados   2. Qué hacer hoy   3. Lia
4. Distribución  5. Avance          6. Dónde se queda la gente
```

`GuestsPie` acepta un `className` porque su raíz vive en otro CSS Module.

### Embudo

Un color por etapa, todos de `index.css`:

| Etapa | Color |
|---|---|
| Creados | `--blue-color-80` |
| Invitados | `--yellow-color-80` |
| Entregados | `--red-color-80` |
| Leídos | `--light-green-500` |
| Confirmados | `--light-purple-500` |
| No asisten | `--gray-color` |

*Invitados* cuenta a todo el que ya recibió su invitación (esperando + confirmados +
rechazados), no solo a los que siguen esperando: si no, el embudo se encogería conforme la
gente contesta.

### `GuestsPie` — distribución interactiva

Dona SVG con dos ejes independientes:

- **Segmentar por**: Estado, Estado de envío, Etiqueta, Prioridad, Categoría, Lado, Mesa.
- **Filtros**: se agregan tocando una rebanada o su fila en la leyenda; se acumulan entre
  dimensiones (una dimensión aporta un solo valor).

Reglas de negocio dentro del componente:

- `asistente` se mapea a `confirmado` antes de contar — son lo mismo.
- Una dimensión solo se ofrece si discrimina (más de un valor distinto).
- `HIDDEN_BY_STATE` oculta dimensiones que dejan de aplicar al filtrar por estado:
  `creado` → sin mesa ni estado de envío; `confirmado` → sin estado de envío; `esperando` →
  sin mesa. Al aplicar un filtro de estado, se sueltan los filtros que ese estado vuelve
  inaplicables (si no, quedarían activos sin chip visible).
- Con uno o más filtros aparece un botón **Ver lista** con la lista de invitados resultante.

> **Bug encontrado y corregido**: los valores de segmento se normalizan a string, pero la
> búsqueda de mesa comparaba contra `tables.id` (numérico). Nunca hacía match y **todas** las
> mesas caían en el fallback *"Sin mesa"*. Se busca por `id`, se muestra el `number` — son
> números distintos.

### `LiaPlanModal`

Se abre desde los tres CTAs de Lia (*Que Lia se encargue*, *Ver el plan*, *Ver el plan caso
por caso*). Explica el trato — qué hace sola y qué no hace sin preguntar — con cifras reales:
personas atoradas → cosas que decidir. El CTA anuncia (*"Muy pronto en I attend"*) en lugar de
accionar, porque Lia todavía no está disponible.

Se renderiza con `createPortal` a `document.body` y cierra con la ×, el fondo o Escape.

---

## 3. Header del dashboard

### `PassesPill` — contador de pases

Píldora de **32px de alto** (como el resto de los botones del header) con los pases usados
sobre la capacidad y barra de avance. El "+" abre el editor de capacidad, que escribe
`invitations.tickets` — así recuperó su punto de entrada la función que se quedó huérfana al
vaciar el menú "⋯".

Un pase se consume cuando el invitado salió de la lista de espera y sigue en pie:
**`esperando` + `confirmado` + `asistente`**. Los que aún no se invitan y los que declinaron no
ocupan lugar. Si los usados superan la capacidad, número y barra se ponen en `--red-color`.

Se suscribe al canal compartido con `useDashboardRealtime()` en vez de abrir uno propio.
No se muestra dentro del editor.

### `SupportTicketModal` — ticket de soporte

El botón **Ayuda** abre este modal en lugar de mandar a WhatsApp. Manda un correo con
`POST /api/mail/send-mail` (endpoint genérico que ya existía en `iattend--backend`, no hubo que
tocarlo) a `contacto.iattend@gmail.com`:

- **Asunto**: `[Soporte] ` + la opción del radio
- **Cuerpo**: el mensaje + nombre, correo, id de usuario, nombre del evento e id de invitación

> El dueño se resuelve **desde la base**, no de la sesión: `invitations.user_id` /
> `user_email` y, con ese id, `profiles.full_name`. Varias páginas montan `<HeaderDashboard>`
> sin pasar el prop `session`, así que los datos llegaban vacíos al correo.

El HTML escapa `&`, `<` y `>` del texto del usuario. A la izquierda del CTA hay un enlace a
WhatsApp (`+52 614 368 1307`). Sin ×, pero cierra con Escape o tocando el fondo.

### Feedback

*Rate us* salió del header. El prompt de feedback ahora es un banner en el **DashboardPage**,
encima de las tarjetas de invitación e invitados
([`FeedbackBanner.jsx`](../src/components/FeedbackPrompt/FeedbackBanner.jsx)).

`useFeedbackTrigger(id, createdAt)` funciona igual que antes: 15+ días, invitación publicada y
sin feedback enviado.

> `.dashboard_body` es un flex **en fila**: el banner habría quedado al lado de las tarjetas.
> Se envolvieron banner + tarjetas en `.dashboard_stack` (columna). En mobile ese stack necesita
> `width: 100%; align-items: stretch`, o las tarjetas se dimensionan por contenido y se
> desbordan.

---

## 4. Navegación en mobile

### `MobileActionsFab`

Botón flotante (`FloatButton.Group` de antd en modo menú) abajo a la derecha, en
`--light-green-500`, con cuatro acciones: **✦ Pregúntale a Lia**, **Mis créditos**,
**Mis mensajes** y **Ayuda**.

El prop `bottomOffset` separa del borde: 24px en el dashboard, **72px** en el editor para
librar la barra de herramientas.

Dos detalles de antd v6:

1. **No expone `size` en `FloatButton`** — el tamaño large (56px trigger / 48px ítems) va por
   CSS.
2. El trigger se renderiza como `<button class="ant-btn ant-btn-primary">`, no con la
   estructura `.ant-float-btn-body` de v5.
3. Antd posiciona la lista contando con un trigger de 40px **y** le aplica un
   `translateY(40px)` en reposo. Con el trigger en 56 hay que reponer los tres tramos:
   `bottom: calc(56px + 16px + 40px)`. **Revisar esa línea al actualizar antd.**

### Apertura de Lia desde fuera

`ChatContainer` maneja su `open` internamente. Se agregó `LIA_CHAT_OPEN_EVENT` (mismo patrón
que `WHATS_NEW_OPEN_EVENT`) y el listener delega en **`handleToggle`**, no en `setOpen(true)`:
abrir el chat también monta el panel (`mounted`), sincroniza `openRef` y recalcula la posición.
Con solo `setOpen` quedaba un cascarón vacío.

En mobile el chat devuelve `null` mientras está cerrado, para no tener dos botones flotantes
peleándose la esquina.

### Header de mobile

- **Dashboard**: solo nombre del evento y botón de regresar. Créditos, mensajes, compartir e
  información pendiente salieron de ahí.
- **Editor (`/build`)**: sin barra de header. Un par flotante arriba a la derecha —
  `[←] [Publicar/Escribir]` — con look de vidrio (`.hd-glass-btn`), que conserva el rol
  (*Escribir* para Administration), el punto de cambios sin guardar y el Popconfirm al salir.

> **Pendiente**: *Compartir invitación* e *Información pendiente* perdieron su punto de entrada
> en el header de mobile. El segundo es un aviso bloqueante — sin esos datos no se puede
> publicar ni compartir. Si se quieren de vuelta, el lugar natural es el FAB.

---

## 5. Editor — barra de herramientas y scroll

El panel de herramientas colapsaba a `CONTROLS_ROW_HEIGHT = 64px`, dejando una franja blanca
sobre la invitación. Ahora colapsa a **`height: 0`**, sin sombra y con `pointer-events: none`.
Reabrir sigue funcionando porque `ButtonsMenu` llama `setOnHide(false)` al seleccionar un
módulo.

Eso también quitaba 64px de zona muerta sobre `.mobile-devices`, que mide `100vh - 56px` — la
causa más probable del scroll que no respondía. Además `.mobile-devices` pasó de `display: flex`
a `block` (es solo un contenedor de scroll) con `overscroll-behavior: contain` y
`touch-action: pan-y`.

> En mobile la invitación **no es un iframe**: son componentes React dentro de
> `.mobile-devices`. El scroll es un contenedor DOM normal.
>
> No se pudo reproducir el bug en la página real (requiere sesión). Lo anterior sale de leer el
> código y medir la geometría — **falta confirmarlo en uso**.

---

## Archivos

### Nuevos

| Archivo | Qué es |
|---|---|
| `src/modules/GuestManagement/guests-redesign.css` | Estilos globales del rediseño: escalera, banners, toolbar, tarjetas |
| `src/modules/GuestManagement/GuestsOverview/GuestsPie.{jsx,module.css}` | Dona interactiva de distribución |
| `src/modules/GuestManagement/GuestsOverview/LiaPlanModal.{jsx,module.css}` | Modal del plan de Lia |
| `src/modules/Header/PassesPill.{jsx,module.css}` | Contador y editor de pases |
| `src/modules/Header/SupportTicketModal.{jsx,module.css}` | Ticket de soporte |
| `src/modules/Header/MobileActionsFab.{jsx,module.css}` | Botón flotante de mobile |
| `src/components/FeedbackPrompt/FeedbackBanner.{jsx,module.css}` | Banner de feedback del dashboard |

### Modificados

`GuestsPage.jsx` · `GuestsOverview.{jsx,module.css}` · `Header.jsx` · `DashboardPage.jsx` ·
`ChatContainer.jsx` · `BuildMenu.jsx` (el del editor, `Build/PageSections/`) ·
`dashboard.css` · `header.css` · `my-guests.css` · `modules-layout.css` · `index.html`
(se agregó **Work Sans** al link de Google Fonts) · `locales/{es,en}.json` (~90 keys nuevas).

## Convenciones que salieron de aquí

- Las tarjetas y toolbars del rediseño usan tokens `--gx-*` definidos en **`:root`**, no en
  `.gx`: los popups de Ant Design se portalean a `<body>`, fuera del árbol, y ahí las variables
  locales no resuelven. (Se detectó porque el chip de filtro activo salía blanco sobre blanco.)
- Los primarios cambian de color según contexto: **verde de marca** dentro de las tarjetas de
  la lista, **lila** en banners y acciones de página. Ambos son pastel, así que el texto va en
  `--dark-blue-500` — en blanco el contraste sería de 2-3:1.
- Los badges de estado de envío usan la paleta de estado de `index.css`
  (`--{color}-color` / `--{color}-bg`).
