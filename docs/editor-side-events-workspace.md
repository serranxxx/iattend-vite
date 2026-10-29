# Editor de side events y Eventos Flash con la experiencia de la invitación

El editor de escritorio de `/dashboard/side` (> 720 px; Eventos Flash
`?flash=<id>` y side events de una boda `?id=<invitación>`) usa la misma
experiencia que el editor de la invitación. Guía:
[`sistema-diseno-editor.md`](./sistema-diseno-editor.md). El celular sigue con
su editor "story" (`SideEvents.jsx`, `PANELS` + `BottomSheet`), sin cambios.

## Qué se adaptó

| Invitación | Side event / Flash |
|---|---|
| Riel: Diseño · Elementos · Fotos · Subidos | Riel: **Diseño** · **Elementos** (Flash) · **Itinerario** (Flash) · **Subidos** |
| La pieza real en un iframe, con zonas | `SideCanvas` (ya calcaba la página del invitado), con sus zonas |
| Barras contextuales arriba de la pieza | **Título**, **Fecha y hora**, **Lugar**, **Fondo**, **Canción**, **PNG elegido(s)**, **Itinerario** |
| Capas = módulos | Capas = los PNG del Flash (más el fondo, fijo) |
| Dock: deshacer · rehacer · Editar / Ver en vivo · dispositivos · zoom · tour | Igual (iPhone · iPad · Mac, girar el iPad) |
| Publicar en el header | La barra de arriba de siempre: volver, Diseño / Envío, candado (Flash), link, Guardar |

Los side events de boda no tienen Elementos, Itinerario, Canción ni Efectos
(igual que antes): su riel queda en Diseño y Subidos, sin Capas.

## Un solo editor

`SideWorkspace` ya no tiene su propio marco: usa `EditorShell` (el mismo de
la invitación) y los mismos paneles Elementos, Fotos y Subidos, la misma
barra del elemento (`ElementBar` con `group`), la misma barra de texto para
el título (`TextBar` con un adaptador a `body.title`) y el mismo panel Capas
(`LayersPanel`). Ver la tabla en `docs/sistema-diseno-editor.md`.

**Elementos de la portada de un Flash.** `body.stickers` guarda imágenes
(sin `kind`) y, además, los elementos del panel Elementos con el modelo de
la invitación (`icon`, `shape`, `text`, `line`, `separator`; vectores =
`icon` con `src` y `tint`). Los dibuja `FlashElemento` en el editor y en la
página del invitado (`iattend-events/src/components/SideEvent/FlashElemento.tsx`).
Tope: 12 imágenes y 40 elementos (`cabeElemento`). La imagen del link solo
dibuja las imágenes. El título acepta además color, cursiva, subrayado,
tachado, mayúsculas y espacio entre letras (`fontExtras` en events).

## Archivos (`src/modules/SideEvents/Workspace/`)

| Archivo | Qué es |
|---|---|
| `SideWorkspace.jsx` | El área de trabajo: riel + panel, escenario con zoom, barras, Capas, dock, "Ver en vivo" con `DevicePreview`, y Envío |
| `SideBars.jsx` | Barras contextuales (`TitleBar`, `DateBar`, `PlaceBar`, `BackgroundBar`, `StickerBar`, `ItineraryBar`). La canción usa `SongBar` de la invitación (`value` / `onChange` / `folder`) |
| `SidePanels.jsx` | Paneles: `DesignPanel` (color del tema + tintes, velo, efectos), `ElementsPanel` (subir / pegar PNG, arrastrarlos a la pieza), `UploadsPanel` (fotos y videos de la carpeta del evento; modo "elegir"), `ItineraryPanel` |
| `SideLayers.jsx` | Panel Capas de los PNG (orden, ojo, selección múltiple con ⌘ / Shift) |
| `SideWorkspace.module.css` | Lo propio; el resto reutiliza `EditorWorkspace.module.css`, `ElementBar.module.css`, `ToolPanels.module.css`, `UploadsPanel.module.css` y `ModuleLayers.module.css` |

## Cómo funciona

- **La pieza mide lo mismo que la pantalla del iPhone de "Ver en vivo"**
  (357 × 631, `.ios26-content` de `DevicePreview`; `SideCanvas` con
  `barMode` usa `.cardIphone`): el título corta igual, la foto se recorta
  igual y los PNG caen en el mismo lugar en los dos modos. Los botones de RSVP
  del lienzo llevan el ícono arriba del texto, como la página del invitado.
- **Elegir en la pieza**: `SideCanvas` sigue avisando la zona con `onSelect`
  (`background`, `title`, `date`, `place`, `extras`, `itinerary`, `song`,
  `stickers`). Con `barMode` no pinta los chips de fondo y color: el fondo se
  toca en la pieza y el color del tema vive en Diseño (tocar `color` abre ese
  panel). El título y las notas se siguen escribiendo encima.
- **Tocar el tablero** fuera de la tarjeta (`[data-side-card]`) suelta la zona
  y los PNG. Escape también; Supr / Backspace quita los PNG elegidos.
- **Agregar PNG**: desde Elementos o Subidos se **arrastran** a la pieza (un
  fantasma sigue al puntero y se sueltan donde caen, x / y en % de la
  pantalla) o un clic los pone al centro. ⌘V sigue funcionando. Se aligeran a
  WebP (`stickerLigeroDesdeUrl`). Tope de 12.
- **Subidos en modo "elegir"**: la barra de Fondo (imagen, video, cuadro fijo)
  abre Subidos con su pedido (`MediaSiderContext`), igual que la invitación.
  Lista la carpeta del evento (`flash-<id>` o el id de la invitación).
- **Deshacer / rehacer** (nuevo en side events): `updateCurrent(updater,
  { snapshot, coalesce })` en `SideEvents.jsx`, tope de 20, Ctrl/⌘+Z y
  Ctrl/⌘+Shift+Z. Sliders y arrastres solo guardan en su primer movimiento;
  escribir seguido en el mismo texto (`coalesce`, 1.5 s) es una entrada.
  `SideCanvas` vuelve a copiar título y notas al DOM cuando cambian por
  deshacer. Se reinicia al abrir o cerrar un evento.
- **Envío**: la pieza en el iPhone a la izquierda (escala por alto, con la
  leyenda) y la lista de invitados a la derecha con todo el ancho que sobra.
  Sin riel ni dock.
- **Tour** (`SideEventsTour`): los pasos señalan la barra (`data-tour="bar"`)
  eligiendo su zona, los botones del riel (`setTool`), Capas y el dock. Los
  pasos `flash: true` solo salen en Flash.

## Lo que quitó de `SideEvents.jsx`

El `canvasBlock` (marco de iPhone viejo, escala `cardScale` / `deviceScale`),
`editorTools` (riel y panel flotante de 282 px), el `available` / `sendWidth`
y la píldora "Ver en vivo" de la barra de arriba. `PANELS` y `SECTIONS` se
quedan: los usa el editor móvil.

## Pendiente

- El panel Elementos solo muestra lo subido a la carpeta del evento; no hay
  catálogo (como el de la invitación) para Flash.
- iPad y Mac en "Ver en vivo" muestran la página del invitado a ese ancho; la
  página de un side event no tiene diseño de pantalla grande propio.
- En pantallas de menos de 1100 px, con un panel abierto, Capas se esconde
  (igual que en la invitación).
