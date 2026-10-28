# Entorno de edición de la invitación

El editor (`/dashboard/build`) tiene dos modos, como los side events y el
Save the Date: **edición** (la pieza plana y tocable) y **ver en vivo** (la
pieza dentro del teléfono, como la abre el invitado). Rama `cambios-invitacion`
en los tres repos.

## Cómo está hecho (y por qué no es un lienzo propio)

Side events y Save the Date **calcan** su pieza en vite (`SideCanvas`,
`StdCanvas`). La invitación no: tiene diez módulos con texturas, tipografías
y efectos, y calcarlos sería duplicar cada uno. En vez de eso, **la pieza real
de iattend-events gana un modo edición** y el editor la sigue mostrando en el
mismo iframe de siempre (`/host`, `components/Host/ReactHost.jsx`).

| Pieza | Dónde |
|---|---|
| Lienzo (tarjeta, chips, leyenda) y píldora "Ver en vivo" | `modules/Invitation/Build/PageSections/EditCanvas.jsx` |
| Estado del modo, cambios que llegan de la pieza | `BuildPage.jsx` (`live`, `setFieldByPath`, `selectFromCanvas`) |
| Qué se dibuja en cada modo | `BuildContent.jsx` (`live` → teléfono; si no, `EditCanvas`) |
| Mensajes del iframe | `components/Host/ReactHost.jsx` |
| Zonas, textos editables | `iattend-events/src/components/Invitation/Invitation/Invitation.tsx` (`zone`, `SECTION_BY_MODULE`), `Cover/Cover.tsx` |
| Host del iframe | `iattend-events/src/app/host/HostClient.tsx` |

## Protocolo (postMessage, sobre el que ya existía)

Vite → pieza, en `HOST_PROPS`:
- `editMode: boolean` — prende las zonas y los textos editables.
- `selectedSection: string | null` — módulo elegido en el riel; la pieza lo
  pinta con borde sólido lavanda.

Pieza → vite:
- `REMOTE_SELECT_SECTION { section, field? }` — el organizador tocó un módulo
  (o una parte: `field` = `title` / `date` / `image` en la portada). Vite marca
  ese módulo en el riel (`selectSection`) **sin abrir el panel** (si ya está
  abierto, cambia a ese módulo), **traba el seguimiento del scroll**
  (`previewSyncLocked`) hasta que vuelva a mover la pieza y, con `field`,
  lleva al control marcado con `data-build-field="seccion.campo"` y lo
  resalta. Solo `date` (calendario) e `image` (selector de imágenes) abren el
  panel, porque solo se editan ahí.
- `REMOTE_CLEAR_FIELD` — se soltó el título/fecha de la portada sin elegir
  otra cosa: vite solo esconde sus herramientas. **No** usar
  `REMOTE_SELECT_SECTION` para esto: elegiría la portada y saltaría a ella
  (pasaba al tocar el separador de la bienvenida con el título elegido).
- `REMOTE_FIELD_CHANGE { path, value }` — escribió un texto directo encima.
  `path` es la ruta en la invitación (`cover.title.text.value`);
  `setFieldByPath` la aplica a la invitación activa (español o traducción).

Vite → pieza, además de `HOST_PROPS`: `HOST_DESELECT` cuando se toca el
tablero fuera de la pieza (la pieza suelta los bloques elegidos; dentro de la
pieza, tocar fuera de un bloque hace lo mismo).

Los nombres de sección son los del scrollspy (`cover`, `greeting`, `family`,
`quote`, `itinerary`, `dresscode`, `gifts`, `destinations`, `notices`,
`gallery`) y los de `buttons[].type` en `BuildPage`; `generals` no es una zona.

## Zonas

En modo edición cada módulo va envuelto en `.editZone` (`invitation.module.css`):
- Lo de adentro no recibe clics (`pointer-events: none`): nada de abrir
  tarjetas del itinerario ni deslizar la galería mientras se edita. Solo los
  elementos con `data-edit-field` vuelven a recibirlos.
- Hover: borde punteado blanco. Seleccionada: borde sólido `#CDBEF7` con halo.
- El dock y la barra de control se ven pero son inertes.

## Textos editables sobre la pieza

Todos pasan por `iattend-events/src/components/Invitation/EditableText.tsx`:

| Módulo | Campos (`path`) |
|---|---|
| Portada | Título y fecha son **bloques** con borde punteado siempre visible (como en Flash): un toque elige el bloque, **arrastrarlo** lo acomoda (título: los cuadrantes de la retícula 3×3 del panel → `cover.title.position.align_x/align_y`; fecha: arriba o abajo del título → `column_reverse`, el "Invertir" del panel), y con el título ya elegido otro toque entra a escribir (`cover.title.text.value`, Enter suelta el foco). Sin asas ni botones. |
| Bienvenida | `greeting.title`, `greeting.description` |
| Frase | `quote.text.font.value` (con o sin imagen) |
| Avisos | `notices.title`, `notices.notices.N` (uno por aviso) |

Es un `contentEditable` donde **manda el DOM**: React pinta el HTML inicial una
sola vez (`dangerouslySetInnerHTML` con un valor congelado) y el texto solo se
vuelve a copiar cuando cambia desde el panel y nadie está escribiendo. Si
React lo reescribiera a cada letra, el caret saltaría. Las `*negritas*` se
muestran como `<strong>` al editar y se serializan de vuelta con asteriscos,
así el valor guardado es el mismo que escribe el panel; los Enter (en los
campos `multiline`) se guardan como saltos de línea. En vite, teclear seguido
sobre el mismo campo no apila un paso de deshacer por letra (`inlineEditRef`,
ventana de 1.5 s), y `setFieldByPath` copia listas como listas (los avisos).

Para agregar otro texto: en el módulo de events, cambiar su `<span>` por
`<EditableText path="ruta.del.campo" value=… editMode={editMode}
onFieldChange={onFieldChange} render={renderTextWithStrong} …/>` y pasarle
`editMode`/`onFieldChange` desde `Invitation.tsx`; vite no necesita cambios.

## Botón de la parte elegida

Con el título de la portada elegido, la pieza dibuja un botón morado con una
"T" pegado a la esquina del bloque (`Cover.tsx`, `.fieldTool`). Al tocarlo
manda `REMOTE_FIELD_TOOL { field: "title", rect }` con su posición en px de
la pieza; `EditCanvas.jsx` pone un ancla invisible en ese punto y abre ahí el
popover de tipografía (letra, tamaño, opacidad, grosor y color), que es el
mismo del engrane junto al campo "Título" del panel, extraído a
`BuildSections/CoverTitleStyle.jsx`. Otro toque al botón lo cierra; al
soltarse el título (`field: null`) también.

## Fondo y separador de un módulo

Con un módulo elegido (hoy solo **bienvenida**, `TOOL_SECTIONS` en
`Invitation.tsx`), la pieza dibuja un botón morado de **fondo** en la esquina
superior izquierda. El **separador** se toca directo (bloque con contorno
punteado); si el módulo no tiene, en su lugar va un recuadro "+ Separador" (ícono de más). El separador va **fuera** del fondo de color del módulo (debajo de `main_container`), en todos los módulos. Mandan
`REMOTE_FIELD_TOOL { field: "background" | "separator", section, rect }` y
vite abre el panel a su izquierda (`BuildSections/ModuleStyle.jsx`):

- Fondo (`dynamic_background`): prender/apagar, color, borde (radio), ancho y
  sombra. El color va en `dynamic_background.custom_color` (nuevo; vacío =
  `generals.colors.secondary`). **No** usar `dynamic_background.color`: trae
  un valor viejo (`#939faf`) en casi todas las invitaciones y nunca se pintó.
  Hoy solo `Greeting.tsx` lee `custom_color`; para sumar otro módulo a
  `TOOL_SECTIONS` hay que leerlo también en el suyo.
- Separador (`dynamic_separator`): prender/apagar, regular (uno de los 14) o
  imagen (con alto y ancho).

Son los mismos datos del menú "⋮" de cada módulo (`components/BuildMenu`).

## Chips

"Cambiar fondo" y "Color del tema" viven **fuera** del iframe
(`EditCanvas.jsx`). El fondo y el color no se pueden tocar en la pieza, igual
que en los side events. "Cambiar fondo" abre a la izquierda de la pieza un
popover con el bloque **Imagen o video** completo (fotos/videos, lista y
efectos), extraído del panel a `BuildSections/CoverMedia.jsx`; "Color del
tema" abre el panel de Generales.

Los popovers sobre la pieza (tipografía del título, fondo) son `Popover` de
antd con `placement="leftTop"` (el `Dropdown` solo abre arriba/abajo) y el
look frost de `.frostRoot` (#FFF al 80 %, blur 8px). Son controlados y se
cierran con `useOutsideClose`: un toque fuera, salvo en lo que ellos mismos
abren (selectores, color, selector de imágenes), que vive en portales.

## Lo que falta (etapas)

- Textos editables en los demás módulos (familia, itinerario, dress code, regalos, destinos, galería).
- Móvil: ahí sigue solo la vista en el teléfono; el lienzo es de escritorio.
- "Ver en vivo" arranca apagado; no se recuerda entre visitas.
- El tour del editor (`BuildTour`) sigue anclado al teléfono (`data-tour="preview"`
  también está en el lienzo, pero no explica las zonas).

## Orden de los módulos

> **Reemplazado (Editor Workspace, etapa 1):** la pill de módulos (`ModuleOrder`) ya no existe; el orden, ocultar y la tipografía viven en el panel Secciones y el riel. Ver `docs/editor-workspace.md`. Lo de abajo queda como historia.

Al elegir algo en la pieza aparece, a la izquierda del lienzo y centrada con
él, la lista de módulos (`PageSections/ModuleOrder.jsx`) con el que se edita
resaltado. Arrastrar uno arriba o abajo (`@dnd-kit/sortable`) reescribe
`generals.positions`, lo mismo que las flechas del panel General; tocarlo
elige ese módulo. La portada va fija arriba y los módulos apagados se ven
grises con un ojo tachado. La lista se va al tocar fuera (`deselectSignal`):
lleva `data-edit-keep` para que tocarla no cuente como "fuera" ni arrastre el
tablero. El tablero está escalado (zoom), así que el desplazamiento del
arrastre se divide entre la escala de la tarjeta.

## Deshabilitar módulos

Con un módulo elegido, la pieza dibuja arriba a la derecha un botón de vidrio
(blanco con opacidad, no CTA) con un ojo tachado que manda `REMOTE_FIELD_CHANGE { path:
"<llave>.active", value: false }` (`MODULE_KEY` en `Invitation.tsx`: el de
Personas es `people`). En modo edición el módulo deshabilitado **no**
desaparece: se dibuja opaco (se le pasa `active: true` solo para pintarlo) con
un botón de vidrio "👁 Activar <nombre>" al centro que lo vuelve a encender. En la
invitación publicada se sigue escondiendo como siempre.

## Personas (familia) y Avisos (recordatorios)

Igual que la bienvenida: título y textos encima (`people.title`,
`people.personas.N.title|description`), botón de fondo y separador tocable
(`ModuleSeparator.tsx` en events, compartido con la bienvenida). Ojo: la
sección del editor es `family` pero el módulo vive en `people`
(`MODULE_KEY` en `EditCanvas.jsx` y en `Invitation.tsx`).

Las personas van limpias, como los bloques de la portada: borde punteado al
pasar el mouse; el primer toque la elige (borde fijo y "Eliminar" en rojo
debajo) sin poner el cursor en el texto; desde ahí se arrastra libremente
(umbral de 6 px, pointer capture, sin manijas ni indicador: se deja a la
intuición) o se vuelve a tocar para escribir. Tocar fuera la suelta. Abajo va
"Agregar persona". Reordenar, borrar y agregar mandan la lista completa en
`REMOTE_FIELD_CHANGE { path: "people.personas", value: [...] }`.

## Chips de la portada, canción y fecha

- Arriba: **Canción** (popover con `CancionFlash`, el mismo buscador de
  Spotify / subir audio de Flash y Save the Date, sobre `cover.song`) y
  **Color del tema**. **Cambiar fondo** es un botón **dentro de la pieza**
  (Cover.tsx, `.edit_center_btn--always`) al centro de la portada, así se
  mueve con la imagen al hacer scroll; manda `REMOTE_FIELD_TOOL { field:
  "cover_media" }` y el editor abre `CoverMedia` pegado a él.
- Tocar la fecha en la pieza la elige y manda `REMOTE_FIELD_TOOL { field:
  "date" }`: se abre `CoverDateStyle` (día, color, ocultar) pegado al bloque.
  Ya no abre el panel de la izquierda.
- La lista de orden no aparece con la portada elegida.

La lógica de elegir / arrastrar / borrar / agregar renglones vive en
`useEditableList.ts` (events) y la usan Personas (`people.personas`) y Avisos
(`notices.notices`, con "Agregar aviso"). Estilos `.edit_row*` en
`src/styles/modules.css`. Para otro módulo con lista: usar el hook, no copiar.

## Cita

Fondo, ocultar y separador como los demás (`TOOL_SECTIONS` incluye `quote`).
Con imagen, el texto es un bloque como el título de la portada (`.edit_block`,
`.edit_grid`, `.edit_cell`, `.edit_field_tool` en `src/styles/modules.css`):
primer toque lo elige y muestra los cuadrantes 3×3 y la "T"; arrastrarlo lo
acomoda (`REMOTE_FIELD_CHANGE { path: "quote.text", value: {...justify,
align} }`, un solo cambio); otro toque entra a escribir. La "T" manda
`REMOTE_FIELD_TOOL { field: "quote_text", section: "quote" }` y abre
`CoverTitleStyle target="quote"` (letra, tamaño, ancho, opacidad, grosor,
color y sombra). Soltar el bloque manda `REMOTE_CLEAR_FIELD`, que también
cierra esa "T".

Cambio visible también en la invitación publicada: el bloque de la cita ahora
se mueve a la columna de su cuadrante (`justifyContent` según `text.justify`);
antes siempre iba centrado y con ancho < 100 % solo cambiaba la alineación del
texto.

Fondo de la cita: **o imagen o color**, no los dos. El botón de fondo del
módulo y el chip "Cambiar fondo" que aparece al centro de su imagen (con la
cita elegida; sube arriba si el texto está en la fila del centro) abren
`QuoteBackground` (`ModuleStyle.jsx`): Ninguno / Color / Imagen, que prende
uno y apaga el otro (`quote.image.active` vs `quote.dynamic_background.active`).
En la pieza, con imagen el color de fondo ya no se pinta aunque esté activo
(datos viejos con los dos). Sin imagen el texto no se arrastra: va centrado.

Imagen de la cita: tiene su propio **largo** (`quote.image.width`; sin él usa
el del fondo de color como antes) y los **mismos efectos que la portada**
(`CoverEffects` sobre `quote.image.background|blur|shadow_settings|
blur_settings`, dibujados en Quote.tsx con `coverEffects.ts`). La sombra vieja
(`quote.text.shadow`) sigue funcionando mientras la imagen no tenga efectos
nuevos guardados; al tocar los nuevos se apaga.

## Momentos (itinerario)

Por ahora lo básico: fondo, ocultar y separador (`TOOL_SECTIONS` incluye
`itinerary`). En la línea de tiempo (`Itinerary/Card/Card.tsx`), con el modo
edición va un renglón más al final, del lado contrario al último momento, con
el botón de vidrio "+ Momento": manda `REMOTE_FIELD_CHANGE { path:
"itinerary.object", value: [...] }` con uno nuevo (mismos valores que "Nuevo
momento" del panel). El diseño de una sola tarjeta (invitación especial
`80d0c716…`) no lo lleva.

Tocar un momento (la tarjeta o "Detalles") abre su drawer, que en modo
edición es todo editable (`OpenCard` con `editMode`, clase `.edit_drawer`):
nombre en el encabezado, hora, lugar, dirección (calle, número, colonia, C.P.,
ciudad, estado, país y link de Maps, con placeholders), actividades
(`item.moments`, con `useEditableList`: elegir, arrastrar, eliminar,
"Agregar actividad") e imagen ("Imagen +" / "Cambiar imagen" →
`REMOTE_FIELD_TOOL { field: "moment_image:<índice>" }` → `MomentImage` en el
editor). Al pie, "Eliminar momento". Todas las rutas son
`itinerary.object.<índice>.…`. El drawer ahora es uno solo para toda la línea
(antes cada momento montaba el suyo) y guarda el índice abierto, no una copia
del momento, para mostrar lo que se va escribiendo. Falta: el ícono del
momento.

Los momentos de la línea también son una lista de `useEditableList`
(`itinerary.object`): borde al pasar el mouse y al elegirlos (en la tarjeta,
`data-edit-card`, con `rowProps(..., { outlineChild: true })`), arrastre para
reordenar y "Eliminar" en rojo. Con el momento ya elegido, otro toque abre su
drawer (`onActivate` del hook); "Detalles" lo abre directo.

En el drawer, la **hora** es un `TimePicker` de antd (12 h, se guarda como
"4:00 pm", igual que el panel). Sin dirección (sin `address.url`), el botón del
encabezado dice **"Agregar dirección"** y manda `REMOTE_FIELD_TOOL { field:
"moment_address:<índice>" }`: el editor abre `MomentAddress` con el buscador de
Google (`SideEvents/AddressAutocomplete.jsx`); al elegir un lugar se llenan
calle, número, colonia, C.P., ciudad, estado, país y link, y el botón vuelve a
ser "¿Cómo llegar?". `.pac-container` cuenta como "dentro" del popover para que
elegir una sugerencia no lo cierre.

Ajustes del drawer de momentos: tocar la tarjeta ya lo abre (primer toque;
`activateOnFirstTap` del hook), en modo edición ocupa toda la pantalla de la
pieza, y la dirección ya no son campos sueltos: sin ella hay un solo
"+ Dirección" centrado (`moment_address:<índice>` → buscador de Google); con
ella se ve la dirección y su mapa con una "×" arriba a la derecha que la quita
(`address: null`). El botón del encabezado vuelve a ser solo "¿Cómo llegar?".

`REMOTE_POINTER_DOWN`: con el modo edición, la pieza avisa de cualquier toque
(HostClient) y el editor cierra sus popovers, porque `useOutsideClose` no ve
los toques dentro del iframe. Si ese toque era el mismo botón que abrió el
popover, el `REMOTE_FIELD_TOOL` que llega después no lo reabre (`lastClosed`
en EditCanvas).

## Dresscode

Para empezar, lo básico: ocultar, fondo (con invertir color), separador
tocable y título / descripción escritos encima (`dresscode.title`,
`dresscode.description`). Colores, imágenes y links de Pinterest siguen en el
panel.

Paleta del dresscode en modo edición (todo en events, con el `ColorPicker` de
antd dentro de la pieza): sin colores, un botón secundario (mismo estilo que
"¿Necesitas inspiración?") "Agregar paleta de colores"; con colores, un "+" a
la derecha de los círculos. El color se agrega al **cerrar** el selector
(`AddColor` en DressCode.tsx), no en cada arrastre.

`custom_color` (color propio del fondo de un módulo) solo pinta el fondo
(`moduleBg` en cada módulo); botones y bordes siguen usando el secundario del
tema.

Imágenes del dresscode: tocarlas en la pieza manda `REMOTE_FIELD_TOOL { field:
"dress_images" }` con el rect de la fila, y el editor abre **encima**
(`side: "above"`, placement `top`) el mini popover `DressImages`: primera
tarjeta "+ Imagen" (selector de imágenes) y luego todas en fila, ordenables con
`@dnd-kit` (horizontal) y con "×" para borrar. Escribe `dresscode.dev` como el
panel (y prende `images_active`). Sin imágenes, la pieza muestra un recuadro
"+ Imagen" que abre lo mismo.

## Mesa de regalos

Lo básico: ocultar, fondo (con invertir color), separador tocable fuera del
fondo y título / descripción escritos encima (`gifts.title`,
`gifts.description`). Las tarjetas (Wallet) siguen en el panel.

Tarjetas de regalo (`Gifts/Wallet/Wallet.tsx`): en modo edición, abrir una
tarjeta (el mismo toque que en la invitación) la deja editable: el logo es un
`Select` del catálogo `gift_brands` agrupado en Tiendas / Bancos (elegir una
cambia `kind` y `brand`/`bank`), y los campos se escriben encima (tienda:
`url`; banco: `name` y `number`). Debajo de la cartera, "Eliminar tarjeta".
Rutas `gifts.cards.<índice>.…`. La cartera lleva `data-edit-hit` para que
la zona del módulo no le apague los toques.

Cartera en modo edición, más: con 2 o menos tarjetas va al frente una tarjeta
blanca "+ Agregar tarjeta" (ocupa el primer lugar del montón; las reales se
corren con `slot()`); la nueva se agrega **primera** de la lista, sale blanca
con "Nueva tarjeta" y se abre sola. En **abanico** las tarjetas no se abren:
se arrastran y al soltar sobre otra toman su lugar (`fanDrag` en Wallet.tsx,
gana la tarjeta cuyo centro quede más cerca del puntero).

## Actividades (destinations)

Lo básico: ocultar, fondo (con invertir color), separador tocable fuera del
fondo y título / descripción escritos encima (`destinations.title`,
`destinations.description`). Las tarjetas siguen en el panel.

Tarjetas de Actividades (`Destinations/Card/Card.tsx`), modo edición: al
frente del montón va una tarjeta blanca "+ Agregar actividad" mientras haya
menos de 6 (solo se ven 6); agrega una al principio y la abre. Tocar la
tarjeta de enfrente abre un drawer a pantalla completa con todo editable:
nombre, imagen (`dest_image:<índice>` → `MomentImage` con
`list={['destinations','cards']}`), tipo (Hospedaje / Actividad / Comida),
información, link y "Eliminar actividad". Rutas `destinations.cards.<índice>.…`.

## Galería

Ocultar, fondo (con invertir color), separador fuera del fondo, título encima
(`gallery.title`) e imágenes con la misma lógica que el dresscode: tocar el
abanico (en edición el toque se captura antes de que lo mueva) manda
`REMOTE_FIELD_TOOL { field: "gallery_images" }` y el editor pone encima el
mismo panel (`DressImages module="gallery"`, escribe `gallery.dev`). Sin
imágenes, recuadro con "Agregar imágenes".

Footer de la invitación: ahora es el mismo `FooterCompact` de los Eventos
Flash / side events (antes `FooterLand`), sin fondo propio (queda bajo la
textura) y con el color de texto del tema (`<FooterCompact color={accent} />`;
sin `color` sigue blanco en side/pop events). Cambia también en la invitación
publicada.

En el editor (iframe, `dev`) el contenedor principal usa `min-height: 100dvh`:
el `110vmax` del CSS (para que Safari esconda sus barras) lo hacía más alto que
la pantalla y el final de la invitación no se alcanzaba con el scroll.

Encima de la lista de orden van dos círculos blancos: la **"T"**
(`TypographyPanel.jsx`: tipografía de toda la invitación, Títulos / Cuerpo
en un solo panel — letra, tamaño (títulos), opacidad, grosor y color
(títulos); mismos datos `generals.fonts` que Ajustes generales) y debajo
**Deshacer** (el mismo `onUndo` de la barra de la derecha).

La columna (T, deshacer y lista) entra creciendo y sale haciéndose chica
(`data-leaving`, EditCanvas la desmonta a los `ORDER_OUT_MS`). Se puede
arrastrar a los lados desde cualquier parte que no sea un módulo: al soltarla
queda a la izquierda o a la derecha de la pieza según dónde quedó el puntero
respecto al centro de la tarjeta (`localStorage.iattend_order_side`). Del lado
derecho la "T" abre su panel hacia la derecha.

Momentos: el drawer **solo** se abre con "Detalles"; tocar la tarjeta la elige
(borde, "Eliminar") y arrastrarla la reordena.
