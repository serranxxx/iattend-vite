# Sistema de diseño del editor de la invitación

Documento de referencia del editor de escritorio de `/dashboard/build` tal como
está hoy (rama `cambios-invitacion`, octubre de 2026). Describe cada pieza de
la pantalla, qué hace, cómo se ve, de dónde lee y a dónde escribe. Los
documentos `docs/editor-workspace.md` y `docs/entorno-edicion.md` cuentan la
historia por etapas; este es el mapa completo del resultado.

**Un solo editor para todo.** Invitación, side events y Eventos Flash usan
las mismas piezas (`src/modules/Editor/` y los paneles / barras de
`PageSections/`); cada editor solo aporta su pieza y lo que es propio de sus
datos:

| Pieza compartida | Archivo | Lo usan |
|---|---|---|
| Área de trabajo (riel + panel, escenario con zoom, barra, Capas, dock, Ver en vivo y dispositivos, columna de Envío, teclado del iPad) | `modules/Editor/EditorShell.jsx` | invitación (`EditorWorkspace`), side events / Flash (`SideWorkspace`) |
| Selector de color de las barras | `modules/Editor/useColorPopover.js` + `ColorPopover.jsx` | los tres |
| ⌘C / ⌘X / ⌘V de los elementos (se pega en el módulo elegido; sirve entre módulos, eventos y editores) | `modules/Editor/useElementClipboard.js` (desde la pieza: `REMOTE_ELEMENT_KEY`) | los tres |
| Panel Capas (las capas reales, en árbol) | `modules/Editor/LayersPanel.jsx` (adaptadores `ModuleLayers`, `SideLayers`) | los tres |
| Panel Elementos (catálogo) | `PageSections/LayerPanels.jsx` | invitación y Flash |
| Panel Fotos | `PageSections/PhotosPanel.jsx` (`onUse`, `isInUse`, `banner`) | los tres |
| Panel Subidos (Todo · Fotos · PNG · Vectores · Videos) | `PageSections/UploadsPanel.jsx` (`folders`, `inUse`, `onPaste`, `draggable`) | los tres |
| Barra del elemento | `PageSections/ElementBar.jsx` (`group` suma tamaño, giro, ocultar, duplicar, quitar) | invitación y Flash |
| Barra de texto | `PageSections/TextBar.jsx` (adaptador `ts`, `extra`) | los tres |
| Barra de la canción | `PageSections/SongBar.jsx` (`value` / `onChange` / `folder`) | invitación y Flash |

Lo propio de un side event / Flash (sus barras de fecha, lugar, fondo e
itinerario y su panel Diseño: color del tema, velo y efectos) vive en
`modules/SideEvents/Workspace/`. Ver `docs/editor-side-events-workspace.md`.

**Capas = las capas reales.** En la invitación cada módulo es un grupo (se
arrastra para cambiar su posición, el ojo lo oculta) y adentro van sus
capas en el orden en que se apilan: los elementos agregados delante del
contenido, el contenido del módulo (título, texto, fecha, paleta… — tocar
uno abre su barra), los elementos detrás del contenido y su fondo y
separador. Los elementos se reordenan dentro de su plano, se ocultan con el
ojo (`hidden`, que SectionLayer ya no pinta) y tocarlos los elige en la
pieza (`HOST_LAYER_SELECT`, que además la lleva al centro de la vista). Un
elemento se arrastra a otro módulo (a su encabezado o a sus capas): se
mueve al centro de ese módulo y queda elegido; a la otra lista de su módulo,
cambia de delante a detrás del contenido. En un side event / Flash: contenido (canción,
título, fecha, lugar, itinerario, notas), elementos y fondo.

**Vectores.** Un SVG subido en Subidos (filtro Vectores) o de la categoría
Vectores de Elementos entra como `{ kind: 'icon', src, tint: true, vector: true }`
y se pinta **en línea** (no como máscara), así la barra le cambia:

- **Color**: todo trazo o relleno que pinte pasa a `currentColor`.
- **Grosor del trazo** (px): `strokeRel`, fracción del ancho del vector; escala con él.
- **Grosor fijo al escalar** (el "non-scaling stroke"): `strokeFixed` + `strokePx`;
  usa `vector-effect: non-scaling-stroke`, el trazo no cambia al agrandar o achicar.
  Al prender o apagar se convierte el grosor que se ve en ese momento, sin brincos.
  La conversión usa el ancho de la pieza (`pieceWidth` de `ElementBar`: 390 la
  invitación, 357 un Flash).

Como **ícono de un momento del itinerario** de la invitación (tocar el ícono en
la pieza abre Elementos), un vector de la categoría Vectores se pinta igual que
los íconos: en línea, del color del momento y con trazo fijo de ícono (1.6 px a
24 px), en vez de máscara con el trazo del archivo, que a ese tamaño no se veía.
Se reconoce por su ruta (`editor-assets/vectores/`, `esUrlDeVector`); el valor
sigue siendo `"svg:<url>"`. Lo pintan `MomentGlyph.tsx` en events y
`VectorIcono` (Elemento.jsx) en el editor del celular.

Color propio del ícono de un momento: con un ícono que se pinta (`lucide:`,
`svg:`, `shape:`) el aviso "Elige el ícono de…" muestra "Color del ícono" (el
del itinerario, los colores de la invitación, blanco, oscuro u otro). Se guarda
en `itinerary.object[i].icon_color`; en events `conColorDeIcono` (helpers/icons.ts)
lo pega al valor del ícono solo para pintar, así todos los estilos del
itinerario lo respetan. Las ilustraciones (imágenes) no llevan color.
Debajo va "Grosor del trazo" (`icon_stroke`, 0.5–4; sin él, 1.6). En íconos y
formas es el grosor de un ícono de 24 px y escala con el tamaño de cada estilo;
en vectores son px reales (un dibujo grande con el trazo escalado se empastaba).
Los SVG que se pintan como máscara no lo muestran.

En los acomodos de ilustración ("art": Ilustración centrada y el de la
miniatura de 64 px), un ícono / vector elegido en Elementos cuenta como la
ilustración del momento y gana sobre su foto; un vector llena 62% del círculo.

El SVG se descarga una vez, se limpia (sin scripts, metadata, `<style>`, enlaces
externos ni manejadores `on*`) y se cachea: `src/modules/Editor/vector.js` en vite y
`src/helpers/vector.ts` + `components/Vector/Vector.tsx` en iattend-events (mismas
reglas). Mientras carga se ve como máscara. Los íconos SVG que ya existían
(sin `vector`) siguen como máscara: nada de lo publicado cambia. Se sube tal cual
(`subirVector`), sin aligerar a WebP. La categoría del catálogo se crea con la
migración `iattend--backend/migrations/2026-10-29_editor_categoria_vectores.sql`.

Aplica en pantallas **mayores a 750 px**. Debajo de eso el celular sigue con
el editor anterior (barra de módulos `ButtonsMenu` + panel de formularios
`BuildMenu` + `BuildContent`): la pieza es la misma, pero las herramientas son
popovers y formularios, no barras.

---

## 1. Idea general

La invitación **no se edita en un formulario**: se edita **tocando la pieza
real**. La pieza que ve el invitado (iattend-events) entra en modo edición
dentro de un iframe (`/host`) y el editor de vite la rodea con herramientas:

| Zona | Qué es | Para qué |
|---|---|---|
| **Riel + panel** (izquierda) | 4 herramientas: Diseño · Elementos · Fotos · Subidos | **Agregar** cosas o cambiar lo global |
| **La pieza** (centro) | La invitación real, tocable, a 390 × 780 | **Elegir** qué se edita y escribir encima |
| **Barras contextuales** (arriba de la pieza) | Una barra distinta según lo elegido (texto, bloque, separador, fecha…) | **Modificar** lo elegido |
| **Capas** (derecha) | Lista de módulos | Ordenar, ocultar, elegir módulos |
| **Dock** (abajo) | Deshacer · Rehacer · Editar / Ver en vivo · dispositivos · zoom · tour | Controles del espacio de trabajo |
| **Header** (arriba, 60 px) | Breadcrumb, créditos, idioma, candado, Publicar | Lo de siempre del dashboard + estado de guardado |

Regla de reparto: **el panel lateral agrega; las barras modifican**. Un botón
de color en cualquier barra abre el mismo selector (`ColorChooser`) anclado al
botón. Todo cambio pasa por `setInvitation` (= `setActiveField` de BuildPage):
entra al historial de deshacer y marca la invitación como "sin escribir".

```
┌──────────────────────────── Header (60 px, fixed) ─────────────────────────────┐
│ ‹ Nombre del evento · Cambios sin escribir   [créditos]   [ES ▾] [🔒] [Publicar] │
├───┬───────────┬───────────────────────────────────────────────────┬─────────────┤
│ R │  Panel    │        ┌─────────── Barra contextual ──────────┐  │  Capas      │
│ i │  (340 px) │        │ Aa ▾  16  A  B I U S  aA ≡  ⋯ Lia     │  │  🔒 Portada │
│ e │           │        └────────────────────────────────────────┘  │  ≡ Bienven. │
│ l │  Diseño   │              ┌──────────────┐                      │  ≡ Personas │
│   │  Elementos│              │              │                      │  ≡ Cita     │
│ 6 │  Fotos    │              │   La pieza   │                      │  …          │
│ 5 │  Subidos  │              │  390 × 780   │                      │             │
│ p │           │              │  (iframe)    │                      │             │
│ x │        ‹  │              │              │                      │             │
│   │       asa │              └──────────────┘                      │             │
│   │           │   Toca cualquier parte para editarla               │             │
│   │           │  ┌──────────────── Dock ────────────────┐          │      ◯ Lia  │
│   │           │  │ ↶ ↷ │ Editar · ● Ver en vivo │ 80% ? │          │             │
└───┴───────────┴──┴───────────────────────────────────────┴──────────┴─────────────┘
```

Archivos principales (`src/modules/Invitation/Build/PageSections/`):

| Archivo | Rol |
|---|---|
| `BuildPage.jsx` | Estado de la invitación, historial, guardado, publicación, idioma, tour. Decide escritorio (`EditorWorkspace`) o celular |
| `EditorWorkspace.jsx` + `.module.css` | El espacio de trabajo: riel, panel, escenario, barras, dock, selector de color |
| `EditCanvas.jsx` + `.module.css` | La tarjeta con el iframe, los chips, la leyenda, los popovers viejos (celular) y el enlace entre la pieza y las barras |
| `ToolPanels.jsx` | Panel **Diseño** (y los viejos Paleta / Texturas / Ideas, ya sin botón) |
| `LayerPanels.jsx` | Panel **Elementos** (y `StickersPanel`, ya sin botón) |
| `PhotosPanel.jsx` | Panel **Fotos** |
| `UploadsPanel.jsx` | Panel **Subidos** |
| `AiTextPanel.jsx` | Panel oculto **Texto con Lia** |
| `*Bar.jsx` | Barras contextuales (`TextBar`, `ElementBar`, `ModuleBar`, `SeparatorBar`, `DateBar`, `SongBar`, `CoverMediaBar`, `MomentBar`, `PaletteBar`, `ImagesBar`, `LinkBar`, `GiftCardBar`) |
| `*StylePicker.jsx` | Catálogos de estilo por módulo (popover "Estilo") |
| `ColorChooser.jsx` + `colorUtils.js` | Selector de color de las barras |
| `ModuleLayers.jsx` | Panel Capas |
| `DevicePreview.jsx` + `deviceSizes.js` | Marcos de iPhone / iPad / Mac de "Ver en vivo" |
| `barControls.jsx` | `LiveSlider` y `EffectsControls` compartidos por las barras |
| `layerItems.js` | Modelo y arrastre de los elementos sueltos |
| `useEditorCatalog.js` | Catálogo de Elementos y Fotos (Supabase) |
| `textStyle.js` | De dónde lee / a dónde escribe la barra de texto |
| `moduleList.js` | id de `generals.positions` → sección, llave e ícono |
| `components/Host/ReactHost.jsx` | El iframe y el protocolo `postMessage` con events |

En iattend-events: `src/app/host/HostClient.tsx` (host del iframe),
`components/Invitation/Invitation/Invitation.tsx` (zonas, `TOOL_SECTIONS`,
`MODULE_KEY`), `EditableText.tsx` (textos escritos encima), `SectionLayer/`
(elementos sueltos), `useEditableList.ts` (listas: personas, avisos,
momentos), `ModuleBackdrop.tsx` (fondo por bloque), `fontExtras.ts` (estilos
de texto nuevos) y los `*Styles.tsx` de cada módulo (catálogos).

---

## 2. Lenguaje visual del editor

El editor usa el design system de producto (ver la skill
`.claude/skills/iattend-design-system/`), con estas constantes concretas:

| Token | Valor | Dónde |
|---|---|---|
| Tinta principal | `#29262D` | textos, iconos |
| Tinta secundaria | `#787878` | hints, iconos apagados, título "CAPAS" |
| Encendido / activo | `#16323d` (fondo) + blanco | botón del riel activo, "Ver en vivo" activo |
| Superficie hover | `#F1EFEA` / `#F5F3F2` | botones del riel, dock, barras |
| Superficie "on" en barras | `#ECEAE6` | botón de barra con su popover abierto o estado activo |
| Bordes | `#EBEBEB` | riel, divisores, panel |
| Deshabilitado | `#C9C6C0` | deshacer/rehacer sin historial |
| Verde "en vivo" | `#43B75D` | punto del segmento y del aviso |
| Lavanda de selección (pieza) | `#CDBEF7` | borde del módulo elegido en la pieza |
| Sombra flotante | `0 8px 24px rgba(12,23,27,.12)` | dock, barras, Capas, aviso en vivo |
| Sombra del panel | `8px 0 24px rgba(12,23,27,.06)` | panel de herramienta abierto |
| Sombra de la pieza | `0 24px 60px rgba(12,23,27,.28), 0 2px 8px rgba(12,23,27,.12)` | tarjeta |
| Radio de contenedores flotantes | 18 px (dock, barras) · 20 px (panel, Capas) · 16 px (aviso) | |
| Radio de botones | 12 px (32–36 px de lado) · 14 px (riel, 44 px) | |
| Tablero | puntos `rgba(41,38,45,.16)` de 1.2 px cada 22 px sobre degradado radial `#e9e9e9 → #FFFFFF` | `.workspace` |
| Vidrio ("frost") | `rgba(255,255,255,.8)` + `blur(8px)` + borde `rgba(255,255,255,.65)` | popovers sobre la pieza (celular), `FROST` en EditCanvas |
| Chips sobre la pieza | `rgba(12,23,27,.42)` + `blur(18px) saturate(160%)`, texto blanco, 32 px, radio 99 | chip "Canción" |

Convenciones de marcado que se repiten en todos los componentes:

- `data-on` en un botón = encendido (su popover está abierto o el estado que
  controla está activo). Nunca se usa `disabled` para lo que tiene tooltip:
  se usa `aria-disabled` + `data-off` para que el botón siga recibiendo
  eventos y el tooltip con el motivo se vea.
- `data-edit-keep`: tocar ese nodo **no** suelta lo elegido en la pieza.
- `data-text-bar`: ese nodo cuenta como "adentro" para los popovers de la
  pieza (no los cierra) y para `useOutsideClose`.
- `data-editor-left`: el riel y su panel, idem.
- `data-tour="…"`: anclas del tour.
- Iconos: Lucide a 17–18 px en barras, 20 px en el riel, 14–16 px en
  segmentos y menús.

---

## 3. Header en modo edición

`HeaderDashboard` (`modules/Header/Header.jsx`) con `mode="edit"`:

- **Izquierda**: breadcrumb con el nombre del evento (vuelve al dashboard;
  con cambios sin guardar pide confirmación con `Popconfirm`). Junto a él,
  **"Cambios sin escribir"** con un punto `#A88AFF` (`.hd-dirty`) cuando
  `saved === false`; debajo de 1240 px se oculta.
- **Centro**: créditos (`CreditController`).
- **Derecha**: selector de idioma (píldora, `languagePicker`), **candado de
  acceso** (`invitations.type`: `open` = pública, `closed` = privada; se
  guarda al momento vía `PATCH /api/invitations/:id/acceso`, no forma parte
  del diseño ni del historial), botón de **Publicar** (admin: "Escribir") con
  punto cuando hay cambios, y el menú "⋯" (ayuda, scanner, etc.). En iPad
  vertical el candado vive dentro del menú "⋯" como "Invitación pública /
  privada".
- En celular (`isBuildMobile`) el header se colapsa en un botón flotante
  (`.hd-build-floating`) con Publicar.

**Publicar** = RPC `publish_invitation` (crea fila en `invitation_versions`).
**Escribir** (solo admin) = `PATCH /api/invitation/update-data`, sin
versión. Ver §13.

---

## 4. Tablero y escenario

`.workspace` (EditorWorkspace.module.css):

- Empieza debajo del header (`margin-top: 60px`), mide `100dvh - 60px` con
  piso de 480 px, `flex: none` y `overflow: hidden`. Si fuera flexible el
  teléfono de "Ver en vivo" lo estiraba y el dock salía de pantalla.
- `user-select: none` + `-webkit-touch-callout: none` en todos los
  controles (iPad: mantener presionado abría Copiar / Traducir); los `input`,
  `textarea` y `contenteditable` sí se seleccionan.
- `.stage` centra la pieza. Su **padding** cambia con lo que hay alrededor:
  - Izquierda `padL`: 96 px con el panel cerrado, **405 px** (riel 65 + panel
    340) abierto.
  - Derecha `padR`: 96 px cerrado; abierto, 248 px (deja lugar a Capas) o
    150 px si Capas está escondido (deja lugar al círculo de Lia).
  - Arriba: 20 px, o **92 px** cuando hay una barra contextual (la pieza
    baja para no quedar debajo).
  - Abajo: 92 px (el dock).
  - Las transiciones son de 0.25 s (padding y transform).
- Tocar el tablero fuera de la pieza (y de todo lo marcado `data-edit-keep`,
  `[data-tour="preview"]`, popovers de antd) llama `onCanvasBlur`: suelta el
  módulo, el texto y el elemento elegidos (manda `HOST_DESELECT` a la pieza).
- El dock y las barras se centran en el espacio que queda:
  `left = padL + (100% − padL − padR) / 2`.

### Zoom

- `zoomMode` ∈ { 0.8, 1, `'fit'` }; el botón del dock los rota (80 % → 100 %
  → Ajustar). Mínimo 0.5.
- Valor inicial: 0.8, o `'fit'` si a 80 % la tarjeta no cabe entre header y
  dock (`(innerHeight − 60 − 150) / 780 < 0.8`: iPad horizontal, laptops
  chicas).
- `fitScale = clamp(0.5, min((vw − padL − padR) / 410, (vh − 210) / 780), 1)`.
- En "Ver en vivo" con iPad o Mac el zoom nunca pasa de lo que cabe
  (`liveFit`, con 40 px de aire horizontal y 20 vertical); el iPad usa el
  mismo zoom de pie y acostado para que al girar no cambie de tamaño.
- Con Capas escondido (pantalla angosta) el zoom elegido tampoco puede pasar
  de `fitScale`.
- El escalado es `transform: scale(zoom)` sobre `.canvasScale` con origen al
  centro; la variable `--canvas-zoom` queda disponible para elementos que no
  deban escalar (la columna de módulos del celular usa su inverso).

---

## 5. Riel de herramientas y panel lateral

`.left`: columna absoluta a todo lo alto pegada a la orilla izquierda
(`z-index: 20`), con el riel y el panel.

### Riel

- Blanco, borde derecho `#EBEBEB`, 12 px de padding vertical, 6 px horizontal,
  botones de **44 × 44 px**, radio 14, solo ícono (20 px); el nombre va en un
  tooltip a la derecha. Encendido: fondo `#16323d`, ícono blanco.
- Herramientas (`TOOLS`):

| id | Ícono | Nombre | Hint del panel |
|---|---|---|---|
| `design` | Palette | Diseño | Lo que define toda tu invitación |
| `elements` | Shapes | Elementos | Texto, íconos y líneas para arrastrar |
| `photos` | Images | Fotos | Ideas de i attend para cada sección |
| `uploads` | CloudUpload | Subidos | Tus fotos, videos y PNG |
| `ai` | WandSparkles | Texto con Lia | **oculto** (`hidden`); lo abre Elementos → "Escribir con Lia"; enciende el botón Elementos (`parent`) |

- Tocar la herramienta activa alterna el panel (abre / cierra); tocar otra la
  cambia y abre.
- En "Ver en vivo" todo `.left` queda al 35 % de opacidad y sin eventos.

### Panel

- Siempre montado; abre y cierra deslizando su ancho **0 ↔ 340 px**
  (`cubic-bezier(.2,.8,.2,1)`, 0.28 s). El contenido (`.toolInner`) mide
  siempre 340 y se desvanece / desplaza 12 px al abrir.
- Flota **encima** del tablero: abrirlo no recorre la invitación por sí
  mismo (el escenario sí ajusta su padding para que la pieza quede centrada
  en el espacio restante).
- Esquinas derechas de 20 px, borde y sombra solo abierto.
- **Cabecera**: ícono de la herramienta en un cuadro de 32 px (`#F5F3F2`,
  radio 12), título (14 px, 600) y hint (12 px, `#787878`).
- **Cuerpo** (`.toolBody`, `data-tool-body`): scroll vertical, padding
  `4px 18px 18px`, `gap: 16px`, nada se encoge (`flex-shrink: 0`).
- **Asa** para plegar (`.toolHandle`): pestaña de 18 × 64 px en la orilla
  derecha, a media altura, con ‹ (estilo Canva). Solo visible abierto.
- Cada panel recibe `invitation`, `invitationID`, `setInvitation`, `setSaved`,
  `selectedSection`, `onSelectSection`, `onOpenTool(id)`, `activeLang`,
  `mediaRequest` / `clearMedia`, `colorTarget`, `iconRequest` /
  `clearIconRequest`.

### 5.1 Diseño (`DesignPanel`)

Lo que define toda la invitación, en orden de decisión y un solo scroll.
Escribe en `generals`.

1. **Estilos completos** — oculto hasta prenderlo en el admin
   (`app_settings.editor_design_styles`). Carrusel de `IDEAS` (8 combos:
   paleta + tipografía de títulos + de cuerpo); "Ver todos" lo vuelve grid.
   Aplicar = los 4 colores + color de títulos + las dos tipografías.
2. **Paleta** — los 4 roles con `ColorPicker` de antd (Fondo = `primary`,
   Contrastes = `secondary`, Textos = `accent`, Acentos = `actions`), con
   10 tonos de cada uno como atajos (4 más oscuros, el actual, 5 más claros).
   Debajo, 6 paletas sugeridas de `colorCollection` en mini-tiras; "Más
   paletas" despliega todas con buscador por nombre o palabra clave. Elegir
   una paleta cambia los 4 colores **y** el color de los títulos
   (`palettePatch`), como "Colección de colores".
3. **Texturas** ("Papel de fondo") — "Ninguna" + 11 del `TexturesContext`
   (3 filas de 4); la elegida siempre se ve aunque no esté entre las
   primeras. "Ver todos" muestra el resto. Escribe `generals.texture`.

### 5.2 Elementos (`ElementsPanel`)

Catálogo de cosas que se **arrastran** a la invitación como elementos sueltos
(§10). A la invitación todo entra arrastrando; un clic sin arrastre no agrega
nada (salvo en modo "ícono del momento").

- **Buscador** (nombre, tags y nombre de categoría, sin acentos; todas las
  categorías, completas).
- **Chips** con scroll horizontal, **fijos arriba** al hacer scroll: "Todo" +
  una por categoría; punto en las "Nuevas" (`new_until` vigente). Tocar un
  chip sube el cuerpo del panel.
- Vista **Todo**: bloque **Texto** fijo arriba (Título / Subtítulo / Párrafo
  con las tipografías de la invitación, nota "funcionan como stickers, no se
  traducen", y la tarjeta "Escribir con Lia" que abre el panel `ai`); luego
  una fila por categoría con su conteo y "›" para filtrarla, mostrando solo
  los primeros (`PREVIEW`: 10 íconos, 5 formas, 3 imágenes, 4 líneas, 2
  decoraciones).
- Categorías del **catálogo** (`editor_categories` / `editor_assets` con
  `panel = 'elements'`, Admin → Laboratorio → Elementos; respaldo en código si
  falla o está vacío: Íconos Lucide, Formas, Ilustraciones). Tipos (`kind`):
  - `icon`: Lucide por nombre (respaldo) o SVG por URL (`tintable` → se pinta
    con `mask-image` del color del elemento). Los 16 íconos del itinerario
    (`iconsItinerary`, react-icons) van al final de la primera categoría de
    íconos.
  - `shape`: cuadrado, círculo, rectángulo, triángulo, estrella; entran sin
    relleno y borde 2.
  - `image`: PNG → entran como sticker.
- Categorías **en código**, al final: **Líneas** (sólida, guiones, puntos,
  doble) y **Decoraciones** (los 14 separadores de la invitación, pintados
  con el color de textos).
- **Modo "ícono del momento"** (`iconRequest`): se entra tocando el ícono de
  un momento en la pieza. Arriba, fijo, el aviso "Elige el ícono de «X»" con
  X para salir; el panel salta a Íconos; un **clic** en ícono / forma /
  ilustración lo pone como `itinerary.object[N].icon` (`lucide:<Nombre>`,
  `svg:<url>`, `shape:<forma>`, número del itinerario o URL de imagen); el
  actual se marca; textos, líneas y decoraciones se atenúan. Termina con la
  X, al cerrar el panel o cambiar de herramienta.
- Cuadrículas: `iconGrid5` (5 columnas), `artGrid`, `lineGrid`, con
  `minmax(0, 1fr)` para que las imágenes no desborden.

### 5.3 Fotos (`PhotosPanel`)

Ideas de i attend por sección (catálogo `panel = 'photos'`).

- Banner "Estás en **Sección** · te mostramos ideas para esta sección".
- Chips fijos arriba, uno por categoría raíz; al abrir (o al cambiar de
  sección) se preselecciona la que tenga `section_key` = sección elegida; si
  no, la primera.
- Cada categoría se parte en subgrupos (hijos con `parent_id`), completos.
- **Tocar una foto la usa** en la sección de su categoría y elige esa sección:
  portada → reemplaza la primera imagen o video (`cover.image.dev/prod`);
  cita → su imagen (`quote.image`, apaga el color); dresscode → se agrega a
  `dresscode.dev` y prende `images_active`. La foto en uso se marca.

### 5.4 Subidos (`UploadsPanel`)

Los archivos de esta invitación en el bucket `user_images`: fotos
(`{id}/`), videos (`{id}/video/`) y PNG (`inv-{id}/`, los stickers).

- **Zona de carga** compacta (clic o soltar): PNG → stickers (aligerados con
  `subirSticker`), otras imágenes → fotos, videos → `video/` (máx. 5 s).
- Chips fijos: Todo / Fotos / PNG / Videos.
- Cuadrícula: fotos y PNG se **arrastran** a la invitación como sticker; los
  videos no (se usan desde "Cambiar fondo" de la portada). Etiqueta PNG /
  VIDEO, bote en cada celda (se muestra al hover; en táctil siempre).
  Eliminar usa los helpers de siempre (no borran lo que se usa); un PNG puesto
  en `decorations` no se borra.
- **Modo "elegir"** (`mediaRequest`): cualquier picker de imagen de la pieza
  o de una barra (portada, Fondo → Foto, momentos, separador imagen,
  dresscode, galería…) abre este panel en vez de su dropdown, con un aviso
  arriba ("Elige la imagen / el video para aplicarlo", con X), la cuadrícula
  filtrada a lo que pide, y tocar un archivo lo aplica (`handleImage(url)`) y
  suelta el pedido. Con imágenes aparece un switch **Subidos / Ideas** que
  muestra también las fotos del catálogo, primero las de la sección que
  pidió. El pedido se suelta al cerrar el panel o cambiar de herramienta.
  Mecanismo: `MediaSiderContext` (provider en EditorWorkspace); `StorageImages`
  lo detecta y manda su pedido; se dispara `iattend-close-popovers`.
- **Medidor** de espacio: barra con nivel (`high` ≥ 80 %, `full` ≥ 100 %),
  "X MB de Y MB" (`getStorageQuota`), nota "El Photo Wall no cuenta". Si el
  límite es menor al paquete (`GET /api/storage/package`, por omisión 30 MB
  por 100 créditos), botón **"Ampliar a N MB"** con popover en dos pasos
  (oferta → "¿Estás seguro?") que llama `POST /api/storage/upgrade` con los
  headers de Lia, muestra la burbuja de créditos (`setCreditSuccess`) y
  recarga. Si una subida choca con el límite (`iattend-storage-full`) el
  popover se abre solo.

### 5.5 Texto con Lia (`AiTextPanel`, oculto)

Lia redacta 3 opciones para un campo. Destinos: Bienvenida
(`greeting.description`), Título (`greeting.title`), Frase
(`quote.text.font.value`), Aviso (agrega a `notices.notices`). Petición
libre (textarea, ⌘/Ctrl+Enter genera) + tono Romántico / Formal / Divertido.
`POST /api/ai/write` con `Authorization: Bearer` (`liaHeaders`); cobra
créditos de Lia como el chat (402 `NO_CREDITS` → "Alcanzaste tu límite
diario"; `NOT_AVAILABLE` → "Tu plan no incluye a Lia"). Cada opción: "Otra"
(cambia solo esa, mandando las ya vistas en `avoid`) y "Usar" / "Agregar"
(escribe el campo, prende el módulo si estaba apagado y lleva la pieza a esa
sección). Arrastrar una opción la suelta como texto suelto.

---

## 6. La pieza (EditCanvas)

- Tarjeta de **390 × 780 px**, radio 36, fondo degradado gris (`#EEE → #CCC`),
  sin marco de teléfono, con la sombra de la pieza. Debajo, la leyenda
  "Toca cualquier parte para editarla".
- Adentro, `ReactHost` con `editMode`, `textBar = true` (escritorio),
  `selectedSection`, el idioma activo y overrides de textura / fuente. La URL
  es `${VITE_IATTEND_EVENTS_URL || https://www.iattend.events}/host/`.
- **Chip "Canción"** arriba a la izquierda, solo con la portada a la vista:
  muestra la carátula y el nombre; en escritorio abre la barra `SongBar`
  (celular: popover con `CancionFlash`). El chip "Color del tema" solo existe
  en celular (en escritorio el tema está en Diseño).
- Dentro de la pieza, cada módulo es una **zona** (`.editZone`): su contenido
  no recibe clics salvo lo marcado `data-edit-field`; hover = borde punteado
  blanco; elegido = borde sólido `#CDBEF7` con halo, radio 30. Tocar fuera de
  un bloque dentro de la pieza, o el tablero, suelta la selección.
- Lo que se puede tocar en cada módulo (todo lo pinta events):

| Módulo | Textos encima (`EditableText`) | Otras partes tocables | Barra que abre |
|---|---|---|---|
| Portada | Título (bloque arrastrable en retícula 3×3, otro toque escribe) | Fecha (bloque, arrastrable arriba/abajo del título), "Cambiar fondo" al centro, chip Canción | Texto / Fecha / Imagen o video / Canción |
| Bienvenida | `greeting.title`, `greeting.description` | Separador, el bloque | Texto / Separador / Fondo |
| Personas | título y `people.personas.N.title|description` (lista: elegir, arrastrar, Eliminar, "Agregar persona") | Separador, el bloque | Texto / Separador / Fondo (con Estilo) |
| Cita | `quote.text.font.value` (bloque arrastrable con imagen) | "Cambiar fondo" sobre la imagen, separador | Texto (con posición vertical, ancho y sombra) / Fondo (imagen **o** color) |
| Itinerario | nombre, hora, lugar, actividades dentro del drawer de cada momento | Momentos (lista), "+ Momento", ícono del momento, imagen y dirección en el drawer | Momento (imagen / dirección) / Fondo (con Estilo) / Elementos (ícono) |
| Dresscode | título, descripción | Paleta y "+", imágenes, link de inspiración | Paleta / Imágenes / Link / Fondo |
| Mesa de regalos | título, descripción; dentro de la tarjeta abierta: link, titular, cuenta | Tarjetas (abrir / "×" / "+ Tarjeta") | Tarjeta de regalo / Fondo (con Estilo) |
| Actividades | título, descripción; drawer de la tarjeta | Tarjetas, "+ Agregar actividad", imagen | Momento (imagen de destino) / Fondo (con Estilo) |
| Avisos | título y cada aviso (lista) | Separador | Texto / Separador / Fondo (con Estilo) |
| Galería | título | Las imágenes | Imágenes / Fondo (con Estilo) |

- Con un módulo elegido hay un botón de vidrio con ojo tachado (arriba a la
  derecha del bloque) que lo **desactiva** (`<módulo>.active = false`); en
  edición el módulo apagado no desaparece: se ve opaco con "Activar
  <nombre>" al centro.
- **Separadores** (`dynamic_separator`) se pintan **entre** bloques, fuera
  del fondo del módulo; tocar uno (o el recuadro "+ Separador" si no tiene)
  elige su bloque y abre `SeparatorBar`.
- En escritorio (`textBar`) **no** hay brochas en la esquina de los bloques ni
  "T" junto a los textos: todo sale como barra al elegir. En celular siguen
  los botones y popovers (`CoverTitleStyle`, `ModuleBackground`,
  `ModuleSeparator`, `MomentImage`, `MomentAddress`, `DressImages`,
  `CoverMedia`, `CoverDateStyle`, `QuoteBackground`).
- Textos encima: `contentEditable` donde manda el DOM (React pinta una vez;
  no reescribe mientras se teclea); `*negritas*` ↔ `<strong>`; Enter en
  multilínea guarda saltos de línea; teclear seguido en el mismo campo no
  apila un paso de deshacer por letra (ventana de 1.5 s, `inlineEditRef`).

---

## 7. Barras contextuales

Todas comparten el formato (`ElementBar.module.css`):

- Blanca, radio 18, padding `5px 8px`, sombra flotante, `white-space: nowrap`,
  a 12 px del borde superior del escenario, centrada como el dock
  (`z-index: 31`). Con una barra visible la pieza baja (padding superior 92).
- Botones de **36 px** (`iconBtn` ícono, `textBtn` ícono + texto 13.5 px,
  `swatchBtn` muestra de color de 24 px redonda; "sin color" = diagonal roja
  sobre blanco), radio 12, hover `#F1EFEA`, `data-on` `#ECEAE6`. Divisores de
  1 × 22 px. Campos de texto (`addressInput`, `inputHalf`) y selects de antd
  (`fontWide`, `sepSelect`, `brandSelect`) van en línea.
- Los ajustes finos van en **popovers de antd** debajo del botón
  (`placement="bottom"`, sin flecha, contenido `.pop` de 240 px mínimo con
  `data-text-bar`), con `LiveSlider`: aplica el cambio **en vivo** mientras
  se arrastra y solo el primer movimiento abre una entrada en deshacer
  (`{ snapshot: true }`), así un arrastre se deshace de un jalón. Los
  catálogos de estilo abren a la izquierda (`bottomRight`) para no tapar la
  pieza.
- La barra lleva `data-edit-keep` y `data-text-bar`: usarla no suelta lo
  elegido ni cierra la herramienta.
- Un color se elige con `pickColor(campo)` → popover `ColorChooser` (§8).

**Prioridad** cuando hay varias cosas elegidas (una sola barra a la vez):
**elemento suelto > texto > campo (fecha, canción, portada, momento, paleta,
imágenes, link, tarjeta) > separador > fondo del bloque.** Tocar el
separador o su "+ Separador" también elige el bloque. En "Ver en vivo" no hay
barras.

**Cómo se abren / cierran.** La pieza manda `REMOTE_FIELD_TOOL { field,
section, rect }`; EditCanvas lo guarda en `tool` y, si el campo es de barra
(`BAR_FIELDS` / `FIELD_BAR`), avisa a EditorWorkspace por `onTextTool`,
`onModuleTool`, `onSeparatorTool` u `onFieldBar`. Otro toque al mismo botón
la cierra; tocar la pieza en otro lado también (`REMOTE_POINTER_DOWN`,
con `lastClosed` para que el mismo toque no la reabra); cambiar de sección
la cierra salvo que sea de esa sección; `iattend-close-tool` la cierra desde
adentro (p. ej. al guardar una dirección); `iattend-close-popovers` (abrir
Subidos en modo elegir) cierra los popovers viejos pero **no** las barras.
La tarjeta de regalos abierta es la excepción: no se cierra al tocar la
pieza (se toca para escribir) sino con `gift_card_close`.

### 7.1 Barra de texto (`TextBar`)

Sale al elegir un texto: título de la portada (`cover`), texto de la Cita
(`quote`) o cualquier texto editable de un bloque (`field`, que la pieza
avisa con `REMOTE_TEXT_FIELD { path, kind: 'title' | 'body' }`).
`textStyle.js` decide de dónde lee y a dónde escribe:

| Destino | Lee / escribe | Alineación | Tamaño máx. |
|---|---|---|---|
| `cover` | `cover.title.text` | `cover.title.position.align_x` | 96 |
| `quote` | `quote.text.font` | `quote.text.justify` | 44 |
| `field` + candado **cerrado** | `generals.fonts.titles` o `.body` (todos los títulos / cuerpos); tamaño y color solo en títulos; sin alineación | — | 36 |
| `field` + candado **abierto** | `invitation.text_styles[path]` (solo ese texto, con todo) | `text_styles[path].align` | 72 |

Controles, de izquierda a derecha:

1. **Candado** (solo `field`): cerrado = a todos los títulos / textos; abierto
   = solo a este. Se recuerda en `localStorage.iattend_text_lock`. Tooltips
   explican el estado.
2. **Tipografía** (Select con las fuentes activas de `FontsContext`, cada una
   en su propia letra).
3. **Tamaño** −/+ de 2 en 2 (8 … máx.).
4. **Color**: "A" con barra del color actual → selector.
5. **Negrita** (peso ≥ 600 ↔ 700/400), **Cursiva**, **Subrayado**,
   **Tachado**, **Mayúsculas** (aA → AA → aa; `transform`), **Alineación**
   (izquierda → centro → derecha, rota).
6. **Espaciado** (popover): entre letras (−10…60, centésimas de em), entre
   renglones (0.8…2.5), grosor (100…900).
7. **Transparencia** (popover, 0–100 %).
8. Solo Cita: **posición vertical** (arriba / centro / abajo, rota;
   `quote.text.align`), **ancho** (40–100 %), **Sombra** (toggle).
9. **Lia** (popover `LiaRewrite`, §7.13).

Campos nuevos en `Font` que pinta `fontExtras.ts` en events: `italic`,
`underline`, `strike`, `transform`, `letterSpacing`, `lineHeight`, `opacity`.

### 7.2 Barra del elemento suelto (`ElementBar`)

Sale con un elemento de §10 elegido (`REMOTE_LAYER_SELECT { section, id }`);
cambia `invitation.decorations[section][id]` directo (`patchItem`).

- **Color / Relleno** (no en stickers): muestra → selector; en formas
  `transparent` = sin relleno.
- Formas: **color del borde** (anillo), **Borde** (popover: sin · sólido ·
  guiones · puntos + grosor 0–12), **Redondear esquinas** (cuadrado y
  rectángulo, 0–200).
- Textos: **tipografía** ("Del tema" o una fuente).
- **Voltear** (horizontal / vertical, `flipX` / `flipY`) y **Transparencia**.
- Bloquear, duplicar, eliminar y el menú Capas van en la pastilla **sobre** el
  elemento, en la pieza (§10).

### 7.3 Barra de fondo del bloque (`ModuleBar`)

Sale al elegir cualquier bloque (no portada). Escribe en
`<módulo>.dynamic_background` (y `inverted`, `style`).

- **Estilo** (solo módulos con catálogo, §9) — primero, con divisor.
- **Fondo**: botón con muestra del fondo actual (foto > color > textura) que
  abre un popover con pestañas:
  - **Color**: `ColorChooser` con "sin color" (apaga `active`); el color va
    en `custom_color` (vacío = `generals.colors.secondary`). En la Cita, poner
    color apaga su imagen.
  - **Textura**: catálogo de texturas en cuadrícula de 5 (`texture`, id de
    la tabla `textures`, independiente de `generals.texture`) + Intensidad
    10–100 % (`texture_opacity`).
  - **Foto**: miniatura, "Elegir foto / Cambiar imagen" (Subidos en modo
    elegir), quitar, Opacidad 10–100 % (`image_opacity`); en la Cita, en vez
    de opacidad, sus **Efectos** (sombra / desenfoque, `EffectsControls`).
- **Invertir color** (`inverted`; no con imagen en la Cita).
- **Bordes** (radio 0–99), **Largo** (70–100 %; en la Cita con imagen,
  `quote.image.width`), **Relleno** (`padding_y` 0–160, por omisión 24; va
  como `--module-py` en events), **Sombra** (toggle). Estos cuatro quedan
  apagados (`data-off`) mientras no haya color ni imagen.
- La Cita conserva "imagen **o** color, no los dos".

### 7.4 Barra del separador (`SeparatorBar`)

`<módulo>.dynamic_separator`: **ojo** (prender / apagar), **Regular |
Imagen**; regular = Select con los 14 separadores dibujados + muestra de
color (`color`; "sin color" = el de textos del tema); imagen = "Imagen"
(Subidos), **alto** (50–500 px) y **largo** (40–100 %). Apagado, el resto
queda deshabilitado.

### 7.5 Barra de la fecha (`DateBar`)

`cover.date`: **ocultar** (`active: false`), **Estilo** (12 estilos de cuenta
regresiva, `style`, §9), **DatePicker** (`value`), **tipografía** ("Del
cuerpo" = null, o una fuente; `font`), **color** (selector; `color`) y, si ya
es distinto, "Usar el del título".

### 7.6 Barra de la canción (`SongBar`)

`cover.song` `{ id, source, name, artist, albumArt, previewUrl }`. Con
canción: carátula, nombre + artista y **×** para quitar. Sin canción:
buscador de **Spotify** (debounce 400 ms, resultados en popover debajo) y
**Subir** un audio (`uploadSongAudio`).

### 7.7 Barra de imagen o video de la portada (`CoverMediaBar`)

Se abre con "Cambiar fondo" (botón dentro de la portada). `cover.image.dev /
prod` (un string si es una sola, lista si varias, null si ninguna). **+
Imagen**, **+ Video** (Subidos; videos de hasta 5 s), **miniaturas** en fila
ordenables (`SortableThumbs`, dnd-kit horizontal; un toque elige / suelta),
**bote** quita la elegida, **Efectos** (popover `EffectsControls`: Ninguno /
Sombra / Desenfoque, dirección, intensidad, alcance, color de la sombra en el
selector, "Restablecer").

### 7.8 Barra de un momento o destino (`MomentBar`)

- `moment_image:N` / `dest_image:N`: miniatura, "Imagen / Cambiar imagen"
  (Subidos), quitar. Escribe `itinerary.object[N].image` o
  `destinations.cards[N].image`.
- `moment_address:N`: buscador de Google (`AddressAutocomplete`) y "Agregar
  manual" (popover con calle, número, colonia, C.P., ciudad, estado, país,
  link de Maps; `ADDRESS_FIELDS`). Al guardar escribe `address` y cierra la
  barra con `iattend-close-tool`.

### 7.9 Barra de la paleta del dresscode (`PaletteBar`)

`dresscode.colors` (+ `color_names`, mismo orden). **Estilo** (P1–P6),
un botón por color (tocarlo lo elige y abre el selector), **+** agrega uno
(copia del último o `#C9B79C`) y lo deja elegido, **nombre del color** (solo
con estilo ≠ P1; placeholder = `guessColorName`), **bote** quita el elegido
(y su nombre).

### 7.10 Barra de imágenes (`ImagesBar`)

Dresscode (`dresscode.dev`, prende `images_active`) y Galería
(`gallery.dev`): **Estilo** (I1–I5, solo dresscode), **+ Imagen** (Subidos;
se agrega al final; con el panel abierto se pueden elegir varias),
miniaturas ordenables, bote.

### 7.11 Barra del link de inspiración (`LinkBar`)

`dresscode.links[N]` (texto, o `{ URL, url, name }` en invitaciones viejas:
se conserva la forma): **Estilo** del botón (B1–B6), campo de la URL, **texto
del botón** (`dresscode.button_label`, vacío = "¿Necesitas inspiración?"),
bote (quita el link; sin links apaga `links_active`).

### 7.12 Barra de la tarjeta de regalo (`GiftCardBar`)

`gifts.cards[N]`: **Empresa** (Select del catálogo `gift_brands`, agrupado en
Tiendas / Bancos con logo; cambia `kind` y `brand` / `bank`) y los datos
(tienda: link; banco: titular y cuenta). Eliminar sigue siendo la "×" de la
tarjeta en la pieza.

### 7.13 Reescribir con Lia (`LiaRewrite`)

Popover de 300 px en la barra de texto: tono Romántico · Formal · Divertido ·
Breve, instrucción opcional (Enter genera), "Generar opciones / Otras
opciones", 3 opciones; tocar una reemplaza el texto por `onFieldChange(path,
texto)` (mismo camino que escribir encima, respeta el idioma). `POST
/api/ai/write` con `target: rewrite_title | rewrite_body`, el texto actual y
`avoid` con las ya vistas. Mismos errores que §5.5.

---

## 8. Selector de color (`ColorChooser`)

Un solo selector para todas las barras, en un `Popover` de antd anclado al
**último botón presionado** (se guarda en `pointerdown`; las barras llaman
`pickColor(campo)` sin evento). Tocar el mismo botón lo cierra (ventana de
400 ms para que el clic de afuera no lo reabra). Contenido (300 px):

1. (Opcional) segmentado de modos cuando un botón cubre dos colores.
2. **De tu paleta**: los colores de la invitación (`invitationPalette`),
   siempre primero; con `allowNone`, la muestra "sin color" (`transparent`).
3. **Usados recientemente**: últimos 5 (`localStorage.iattend_recent_colors`).
4. Área saturación / brillo + barra de tono (arrastre con `pointermove`;
   solo el primer movimiento guarda deshacer).
5. Campo **HEX** (Enter o blur aplica) y **cuentagotas** (`EyeDropper`,
   donde el navegador lo tenga).
6. **Más colores**: la grilla de sólidos (`SOLIDS`).

`colorTarget` en EditorWorkspace decide a qué se le pone color según
`colorField`: `text` (barra de texto), `module` (fondo del bloque),
`separator`, `date`, `dress` (color elegido de la paleta), `cover_shadow` /
`shadow` (sombra de la imagen de portada / Cita), `color` / `stroke`
(elemento suelto). Cada destino define `value`, `allowNone` y `onPick(c,
{ snapshot })`.

---

## 9. Catálogos de estilo por módulo

Cada módulo con catálogo guarda su elección en `<módulo>.style` (o el campo
indicado); la primera opción es "la de siempre" y se guarda **vacía** (null),
así las invitaciones existentes no cambian. Se elige en el botón **Estilo**
de la barra correspondiente (popover `bottomRight` con miniaturas pintadas
con la paleta y la foto de la invitación). En events los pinta
`<Módulo>/<Módulo>Styles.tsx`.

| Módulo | Campo | Opciones | Picker / barra |
|---|---|---|---|
| Cuenta regresiva | `cover.date.style` | 1a Cristal · 1b Serif minimal · 1c Tarjetas flip · 1d Anillos · 1e Editorial · 1f Tarjeta de papel · 1g Lista vertical · 1h Cápsulas · 1i Calendario · 1j Número gigante · 1k Boleto · 1l Arco | `CountdownStylePicker` / DateBar |
| Bienvenida | `greeting.style` | W1 Clásica · W2 Itálica romántica · W3 Entre reglas · W5 Cita · W6 Enmarcada · W7 Arco · W8 Palabra por palabra | `GreetingStylePicker` / ModuleBar |
| Personas | `people.style` | P1 Apilado · P2 Dos columnas · P3 Serif con ornamento · P4 Lista con reglas · P5 Tarjetas · P6 Iniciales | `PeopleStylePicker` / ModuleBar (sección `family`) |
| Itinerario | `itinerary.style` | 1a zigzag · 1b … 1l (tarjetas, deslizable, cristal, mapa estático…) | `ItineraryStylePicker` / ModuleBar |
| Dresscode · paleta | `dresscode.palette_style` | P1 Círculos superpuestos · P2 Círculos con nombre · P3 Barra · P4 Etiquetas de tela · P5 Muestrario · P6 Tipográfica | `DressStyleButton kind="palette"` / PaletteBar |
| Dresscode · imágenes | `dresscode.images_style` | I1 Carrusel · I2 Collage · I3 Polaroids · I4 Cuadrícula · I5 Pila | `DressStyleButton kind="images"` / ImagesBar |
| Dresscode · botón | `dresscode.button_style` | B1 Pastilla · B2 Color Pinterest · B3 Contorno · B4 Link de texto · B6 Ícono con texto | `DressStyleButton kind="button"` / LinkBar |
| Mesa de regalos | `gifts.style` | 1a Cartera · 1c Sobre · 1e Baraja · 1f Girar tarjeta · 1h Caja de regalo | `GiftStylePicker` / ModuleBar |
| Actividades | `destinations.style` | 1a Revistero · 1e Llaveros de hotel · 1f Postales | `DestinationStylePicker` / ModuleBar |
| Avisos | `notices.style` | R1 Apilado · R2 Numerado editorial · R4 Notas adhesivas · R5 Uno a la vez · R6 Checklist · R7 Guía del invitado · R8 Mensajes de la pareja | `NoticeStylePicker` / ModuleBar |
| Galería | `gallery.style` | G1 Pila → carrusel · G2 Abanico → cuadrícula · G3 Polaroids → lista · G4 Rollo de película · G5 Álbum · G6 Pila → historias | `GalleryStylePicker` / ModuleBar |

`STYLE_PICKERS` en `ModuleBar.jsx` mapea sección → picker. Los ids que se
guardan vacíos: `1a`, `G1`, `R1`, `P1`, `W1` (y P1 / I1 / B1 del dresscode).

---

## 10. Elementos sueltos (stickers, íconos, formas, textos, líneas)

Capa encima de cada sección: `invitation.decorations[sección]` (llaves =
nombres de sección: `cover`, `greeting`, `family`, `quote`, `itinerary`,
`dresscode`, `gifts`, `destinations`, `notices`, `gallery`), lista de:

```
{ id, kind: 'sticker' | 'icon' | 'shape' | 'text' | 'line' | 'separator',
  url | icon | src | text | variant,
  x, y,        // centro, en % de la sección
  w,           // ancho en % de la sección
  ar,          // alto / ancho (formas, SVG)
  rot, opacity, flipX, flipY,
  color,       // null = color de textos del tema; 'transparent' = sin relleno
  stroke, strokeWidth, strokeStyle, radius,   // formas
  font,        // textos; null = la del tema
  tint,        // íconos SVG: pintar con mask-image
  locked,      // no se mueve ni escala
  z            // 'back' = detrás del contenido del bloque; si no, delante
}
```

- El **invitado** ve la capa (solo se monta si la sección tiene algo; no
  recibe toques).
- **Arrastre desde el panel** (`layerItems.js` → `startLayerDrag`): un
  fantasma (clon de la tarjeta, 90 % de opacidad, sombra) sigue al puntero;
  `body[data-layer-drag]` apaga el puntero de los iframes; ReactHost pasa el
  punto a px del iframe (divide entre el zoom) y manda `HOST_LAYER_HOVER`
  (resalta la zona) y `HOST_LAYER_DROP`. HostClient busca la zona con
  `elementFromPoint`, agrega el elemento con guía y pegado al centro, lo
  pinta al momento, lo deja elegido y regresa `REMOTE_FIELD_CHANGE
  decorations.<sección>` (lista completa) + `REMOTE_SELECT_SECTION`.
- Un clic sin arrastre **no agrega**: solo llama `onTap` si existe (modo
  ícono del momento). `addLayerItem` (`HOST_LAYER_ADD`, la sección elegida o
  la que se ve) queda para **⌘V** con una imagen (en el editor o con el foco
  dentro de la pieza, que manda el archivo con `REMOTE_PASTE_IMAGE`): se sube
  como sticker a la sección que se ve.
- Tope de **12 stickers** por invitación (`MAX_STICKERS`). La biblioteca
  "Tus stickers" vive en `localStorage.iattend_stickers_<id>` (hasta 60 URLs)
  más los ya puestos.
- Al soltar algo del catálogo se guarda una **copia** (URL / SVG), nunca el
  id del catálogo; borrar del catálogo algo en uso no se permite.
- **En la pieza** (`SectionLayer.tsx`, events, modo edición): elegir,
  arrastrar (guías rosas al centro de la sección y de los demás elementos,
  pegado a 6 px), escalar por las esquinas (proporcional), estirar por los
  lados (formas), girar con la manija de arriba (se pega a 0/90/180/270),
  doble clic en un texto para escribirlo, teclado (Supr / Backspace elimina,
  Escape suelta, flechas mueven; Shift = paso grande). Los elementos no se
  recortan: pueden quedar entre dos secciones. Pastilla blanca sobre el
  elemento: **Bloquear**, **Duplicar**, **Eliminar**, **"…" Capas** (Al
  frente · Subir · Bajar · Detrás del contenido). La barra y sus menús se
  recorren para no salirse por los lados.
- Textos sueltos funcionan como stickers: **no se traducen**; con un idioma
  activo, lo que se agregue queda solo en ese idioma.

---

## 11. Capas (`ModuleLayers`)

Panel flotante arriba a la derecha del escenario (`.layersDock`: `top: 12px;
right: 16px; bottom: 92px`), pintado por EditCanvas con un portal en
`layersTarget`. No cuenta en el centrado de la pieza salvo cuando el panel de
herramienta está abierto (entonces `padR` le deja espacio).

- 216 px de ancho, radio 20, título "CAPAS" (12 px, 600, mayúsculas,
  `#787878`), lista con scroll.
- **Portada** primero, fija (candado en vez de asa).
- Una fila de 40 px por módulo de `generals.positions` (`MODULES` de
  `moduleList.js`: asa `GripVertical`, ícono, nombre, ojo). Tocarla **elige**
  el módulo (la pieza va a él); arrastrarla (dnd-kit vertical, umbral 5 px)
  reescribe `generals.positions` y la pieza baja al módulo movido
  (`scrollRequest` a los 250 ms); el **ojo** oculta / muestra
  (`[módulo].active`). Fila elegida resaltada; oculta, atenuada.
- Se esconde en "Ver en vivo" y en pantallas angostas (< 1100 px) mientras
  el panel de herramienta está abierto (`hideLayers`).

En celular el orden sigue siendo la columna `ModuleOrder` junto a la pieza.

---

## 12. Dock

Pastilla blanca abajo al centro (`bottom: 20px`, 40 px de alto: botones de
32 + 4 de padding, radio 18, `width: max-content`), `data-edit-keep`:

| Control | Comportamiento |
|---|---|
| **Deshacer** (`Undo2`) / **Rehacer** (`Redo2`) | 32 px; deshabilitados sin historial (gris `#C9C6C0`). Tooltips. También Ctrl/⌘+Z y Ctrl/⌘+Shift+Z |
| Segmento **Editar · ● Ver en vivo** | `.segment` gris `#F5F3F2` con botones de 28 px; el activo blanco con sombra. "Ver en vivo" activo = `#16323d` + punto verde. Entrar a "en vivo" suelta la selección |
| **Dispositivos** (iPhone · iPad · Mac) | Siempre montado; crece de 0 a su ancho (`grid-template-columns: 0fr → 1fr`, 0.35 s) al entrar a "Ver en vivo". Android queda oculto (DevicePreview lo soporta). `data-tour="devices"` |
| **Girar** (`RotateCcwSquare`) | Solo con iPad elegido; alterna vertical / horizontal |
| **Zoom** (`Scan` + texto) | 80 % → 100 % → Ajustar, rota. Mín. 92 px de ancho |
| **?** (`CircleHelp`, `dockMuted`) | Relanza el tour (apaga "Ver en vivo" primero) |

---

## 13. Ver en vivo

Cambia el lienzo por la pieza **publicada** (sin `editMode`) dentro de un
marco (`DevicePreview`), al zoom del dock topado por lo que cabe:

| `device` | Marco | Medida total (`DEVICE_SIZES`) | Diseño que muestra |
|---|---|---|---|
| `ios` | iPhone 17 Pro con Safari a pantalla completa (isla, status, nav flotante, home) — clases `.ios26-*` de `build-invitation.css` | 371 × 777 | celular |
| `ipad` | iPad (radio 44, pantalla 768 × 1024 radio 24, status) | 804 × 1060 · horizontal 1060 × 804 | **pantalla grande** (≥ 768 px, `LARGE_SCREEN_QUERY` en events) |
| `mac` | Ventana de Safari 1280 × 800 (semáforo, ‹ ›, barra "iattend.mx") | 1280 × 840 | pantalla grande |
| `android` | Marco Android viejo (`inv-device-*-android`) | 371 × 777 | celular (oculto en el dock) |

- **Giro del iPad**: las medidas cambian de golpe pero el marco arranca
  girado 90° y rota a su lugar (`ipadToLandscape` / `ipadToPortrait`; se
  reinician cambiando el nombre de la animación, sin remontar el iframe).
- **Aviso** arriba a la izquierda (`.liveHint`, junto al riel o junto al
  panel si está abierto): punto verde + "Estás viendo la pieza real, tal como
  la abre tu invitado. Apaga "Ver en vivo" para seguir editando."
- Riel y panel al 35 % sin eventos; Capas y barras no se muestran; el
  selector de color se cierra.
- "Ver en vivo" arranca apagado y no se recuerda entre visitas.

---

## 14. Historial, guardado y publicación (BuildPage)

- `copy` = la invitación en edición (español); `translations[lang].content`
  = cada traducción. `getActiveInvitation()` devuelve la del idioma activo.
- `setActiveField(updater, { snapshot = true })`: guarda la versión anterior
  en `undoStack` (tope **20**), vacía `redoStack`, aplica y marca
  `saved = false`. `{ snapshot: false }` aplica sin entrada nueva (sliders,
  picker, teclear seguido).
- `setFieldByPath(path, value)` (textos escritos encima y cambios que manda
  la pieza): copia solo el camino hasta el campo (listas como listas) y usa
  `snapshot: !same` con la ventana de 1.5 s.
- Deshacer / rehacer mueven el documento completo entre las pilas. Se
  vacían al cambiar de idioma (es otro documento) y al cambiar de
  invitación. Ctrl/⌘+Z global salvo con el foco en un input / contenteditable
  (se respeta el undo nativo).
- **Publicar** (`onSaveChanges`): en español → `withProdShape(copy)` → RPC
  `publish_invitation` (fila en `invitation_versions`), luego
  `syncTranslationsToNewSource` propaga los campos no-texto a cada
  traducción (`invitation_translations`). Si cambiaron textos y hay
  traducciones, antes sale el modal "Modificaste textos en la versión en
  español…". Con un idioma activo guarda solo esa traducción.
- **Escribir** (`onWriteChanges`, admin): igual pero por `PATCH
  /api/invitation/update-data`, sin versión.
- `selectFromCanvas(type, field)`: la pieza avisó un toque; elige el módulo,
  traba el seguimiento del scroll (`previewSyncLocked`) hasta que el usuario
  vuelva a mover la pieza, y guarda `selectedField` (`title` / `date` de la
  portada, `quote_text` de la Cita). `onCanvasBlur` lo suelta y sube
  `deselectSignal`.
- `onSectionChange` (la pieza hizo scroll): el módulo elegido la sigue salvo
  con el candado puesto.

---

## 15. Protocolo vite ⇄ iattend-events (`ReactHost` ⇄ `HostClient`)

Vite → pieza:

| Mensaje | Payload | Cuándo |
|---|---|---|
| `HOST_PROPS` | `invitationConfig`, `textureOverride`, `fontOverride`, `lang`, `editMode`, `selectedSection`, `textBar`, `sentAt`, `reason` | Al `REMOTE_READY`, al cargar el iframe y en cada cambio (con hash para no repetir) |
| `HOST_SCROLL_TO` | `{ section }` | El módulo elegido cambió desde fuera; `scrollRequest` lo fuerza aunque sea la misma sección |
| `HOST_DESELECT` | — | Se tocó el tablero fuera de la pieza |
| `HOST_LAYER_HOVER` | `{ x, y }` en px del iframe, o `null` | Arrastrando un elemento del panel |
| `HOST_LAYER_DROP` | `{ x, y, item }` | Se soltó un elemento sobre la pieza |
| `HOST_LAYER_ADD` | `{ item, section }` | ⌘V / agregar sin arrastre |

Pieza → vite:

| Mensaje | Payload | Qué hace vite |
|---|---|---|
| `REMOTE_READY` | — | Manda `HOST_PROPS`, llama `onReady` |
| `REMOTE_HEIGHT` | `{ height }` | (otras vistas) |
| `REMOTE_SCROLL_SECTION` | `{ section }` | Sigue el módulo elegido (si no está trabado) |
| `REMOTE_SELECT_SECTION` | `{ section, field? }` | `selectFromCanvas`; `field` = `title` / `date` / `image` (portada), `quote_text` |
| `REMOTE_CLEAR_FIELD` | — | Suelta el campo de la portada / Cita sin elegir otra cosa |
| `REMOTE_FIELD_CHANGE` | `{ path, value }` | `setFieldByPath` (textos, listas, `decorations.<sección>`, `<módulo>.active`…) |
| `REMOTE_FIELD_TOOL` | `{ field, rect, section }` | Abre la barra / popover de esa parte (`onFieldTool` en EditCanvas) |
| `REMOTE_POINTER_DOWN` | — | Cierra popovers y barras (salvo la tarjeta de regalos) |
| `REMOTE_TEXT_FIELD` | `{ path, kind }` o `null` | Barra de texto de un bloque (evento `iattend-text-field`) |
| `REMOTE_LAYER_SELECT` | `{ section, id }` o `null` | Barra del elemento (evento `iattend-layer-selection`) |
| `REMOTE_PASTE_IMAGE` | `{ file, section }` | Sube el archivo como sticker (evento `iattend-layer-paste`) |
| `REMOTE_TEXT_FOCUS` | `{ rect }` o `null` | Sube la pieza sobre el teclado del iPad (evento `iattend-text-focus`) — **pendiente de subir a prod en events** |

Campos de `REMOTE_FIELD_TOOL` que hoy existen: `title`, `date`, `cover_media`,
`song` (lo manda el chip, no la pieza), `quote_text`, `quote_image`,
`background`, `separator`, `moment_image:N`, `moment_address:N`,
`moment_icon:N`, `dest_image:N`, `dress_colors`, `dress_images`,
`dress_link:N`, `gallery_images`, `gift_card:N`, `gift_card_close`.

Eventos de `window` internos de vite (para no cablear props):
`iattend-layer-hover` / `-drop` / `-add` / `-paste` / `-selection`,
`iattend-text-field`, `iattend-text-focus`, `iattend-close-popovers`,
`iattend-close-tool`, `iattend-sticker-library`, `iattend-storage-changed`,
`iattend-storage-full`.

Orígenes permitidos del iframe: `https://www.iattend.events`,
`https://iattend.events`, `http://localhost:3000` y el de
`VITE_IATTEND_EVENTS_URL`. Del lado de events, `ALLOWED_ORIGINS` incluye el
dominio de producción de vite, `beta.iattend.site` y localhost 3000–3001.

---

## 16. iPad y táctil

Ajustes hechos para que el editor sirva en iPad (Safari) sin romper el
escritorio:

- Alto con `100dvh` (el `100vh` de Safari excede el área visible).
- **Tooltips al toque**: en `(hover: none) and (pointer: coarse)` el
  `ConfigProvider` de antd usa `tooltip={{ trigger: 'click' }}` y
  `styles/index.css` los desvanece solos a los ~2.6 s
  (`iattend-tip-fade`).
- Los botones que solo aparecían al hover (bote de Subidos, ojo de Capas,
  borrar en `storage-images`) se muestran siempre en `(hover: none)`.
- Los estilos `:hover` de lo seleccionado van dentro de `@media (hover:
  hover)` para que no se queden "pegados" tras un toque.
- **Teclado de pantalla** (`useKeyboardLift`): con `visualViewport`, si la
  parte tapada ≥ 120 px hay teclado; la pieza avisa dónde está el texto con
  foco (`REMOTE_TEXT_FOCUS`) y el escenario sube
  (`transform: translateY(-lift)`) lo justo para dejarlo visible, sin pasar
  del header + barra (140 px) y con 24 px de aire; al cerrarse el teclado
  vuelve a 0 y hace `scrollTo(0, 0)` (Safari dejaba la página recorrida).
  El panel de Lia (`ChatContainer`) también se acomoda sobre el teclado.
- **Vertical / angosto**: `hideLayers` (< 1100 px con el panel abierto)
  esconde Capas, el zoom se topa a `fitScale` y `padR` deja lugar a Lia.
  El candado de acceso pasa al menú "⋯" del header.
- La columna `.workspace` bloquea `user-select` y el callout de iOS en los
  controles (mantener presionado para arrastrar en Capas abría Copiar).
- Zoom inicial en "Ajustar" cuando 80 % no cabe (iPad horizontal).

Detalle conocido: en vertical la barra contextual puede quedar un poco
debajo del panel Capas en su extremo derecho.

---

## 17. Tour (`BuildTour`)

Se abre solo la **primera vez** (invitación sin filas en
`invitation_versions` y sin `localStorage.iattend_build_tour_v1`), solo en
escritorio, 800 ms después de pintar; se relanza con el "?" del dock. Pasos
con anclas `data-tour`: `preview` (la pieza), `undo`, `redo`, `live-toggle`,
`devices`, `tour-replay`. Varios pasos siguen apuntando a anclas del editor
viejo (`modules-bar`, `mod-*`, `editor-panel`, `images`, `translate`,
`zoom`) y salen centrados cuando no las encuentran: **pendiente** de
reescribir para el editor nuevo. Al cerrar, el módulo regresa a Generales
con el seguimiento del scroll trabado.

---

## 18. Persistencia local (`localStorage`)

| Llave | Qué guarda |
|---|---|
| `iattend_text_lock` | Candado de la barra de texto (`open` / `closed`; por omisión cerrado) |
| `iattend_recent_colors` | Últimos 5 colores del selector |
| `iattend_stickers_<id>` | "Tus stickers" subidos para esa invitación (hasta 60) |
| `iattend_order_side_v2` | Lado de la columna de módulos (solo celular) |
| `iattend_build_tour_v1` (`BUILD_TOUR_STORAGE_KEY`) | Ya vio el tour |

El historial de deshacer **no** se persiste: vive y muere con la pestaña.

---

## 19. Datos nuevos en la invitación (resumen)

Campos que el editor nuevo escribe y que events ya lee; vacíos o ausentes
dejan la invitación como estaba:

| Campo | Qué es |
|---|---|
| `decorations[sección][]` | Elementos sueltos (§10) |
| `text_styles[path]` | Estilo propio de un texto de bloque (candado abierto) |
| `generals.fonts.titles|body.{italic, underline, strike, transform, letterSpacing, lineHeight, opacity}` | Extras globales de texto |
| `cover.title.text.*` / `quote.text.font.*` (mismos extras) | Título de portada y texto de la Cita |
| `cover.date.{style, font, color, active}` | Estilo, tipografía y color de la cuenta regresiva |
| `cover.image.{background, blur, shadow_settings, blur_settings}` | Efectos de la portada |
| `quote.image.{width, background, blur, shadow_settings, blur_settings}` | Largo y efectos de la imagen de la Cita |
| `quote.text.{align, width, shadow, justify}` | Posición, ancho y sombra del texto de la Cita |
| `<módulo>.dynamic_background.{active, custom_color, image, image_opacity, texture, texture_opacity, border_radius, width, padding_y, shadow}` | Fondo por bloque |
| `<módulo>.inverted` | Invertir color del bloque |
| `<módulo>.dynamic_separator.{active, type, single.value, color, image.{value, height, width}}` | Separador del bloque |
| `<módulo>.style`, `dresscode.{palette_style, images_style, button_style}` | Catálogos (§9) |
| `dresscode.color_names[]`, `dresscode.button_label` | Nombres de la paleta y texto del botón |
| `itinerary.object[N].icon` | `lucide:…`, `svg:…`, `shape:…`, número o URL |
| `gifts.cards[N].{kind, brand|bank, url|name|number}` | Tarjetas |

Lo que **no** cambia con el editor: `invitations.type` (candado, se guarda
aparte al momento), `rsvp_deadline` y demás campos top-level.

---

## 20. Lo que sigue en el celular y pendientes conocidos

- En celular (≤ 750 px) sigue el editor anterior: `ButtonsMenu`, `BuildMenu`
  (formularios) y los popovers sobre la pieza. La pieza es la misma, con
  `textBar = false`, así que ahí sí se ven brochas, "T", chips y
  `CoverTitleStyle` / `ModuleBackground` / etc.
- El tour sigue anclado al editor viejo (§17).
- El idioma en el editor de escritorio vive en el header (píldora); el
  slider de zoom y el selector de idioma de la derecha quedaron ocultos
  (CSS `.right`, `.zoomBox`, `.langButton` sin usar).
- "Ver en vivo" no se recuerda entre visitas.
- Elementos sueltos: la "Colección i attend" de stickers no existe (hoy son
  categorías de imágenes del catálogo), no se puede arrastrar un color de la
  Paleta sobre un texto, el layout de pantalla grande del invitado no pinta
  los elementos de la portada, y los textos sueltos no se traducen.
- `REMOTE_TEXT_FOCUS` (teclado del iPad) está en events solo en local; falta
  subirlo a producción para que funcione en beta.
- La intensidad de la textura **general** y "aplicar a todas las secciones"
  del handoff no están (solo hay intensidad por bloque).
- Importar fotos de la galería desde el panel Fotos no aplica (`APPLY` solo
  cubre portada, cita y dresscode).
