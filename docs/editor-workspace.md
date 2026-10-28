# Editor Workspace (rediseño de /dashboard/build en escritorio)

Basado en el handoff "Editor Workspace" (Downloads/design_handoff_editor_workspace).
Se aplica por etapas.

## Etapa 1 · Estructura (hecha)

En escritorio (> 750px) `BuildPage` ya no monta `ButtonsMenu` ni `BuildMenu`
(el panel de formularios se quitó a propósito); en su lugar va
`PageSections/EditorWorkspace.jsx` (+ `.module.css`). En celular sigue el
editor de antes (barra de módulos + BuildMenu + BuildContent).

- **Tablero**: `#EDEAE3` con puntos `rgba(41,38,45,.11)` cada 22px. El área
  empieza debajo del header (fixed, 60px) y tiene alto fijo (`flex: none`):
  si fuera flexible, el teléfono de "Ver en vivo" la estiraba y el dock se
  salía de la pantalla.
- **Riel + panel de herramienta** (izquierda): Elementos, Stickers, Decorar,
  Texturas, Paleta, Texto IA, Ideas. La tipografía no va en el riel: se
  edita con la "T" de la columna de módulos (`ModuleOrder`). Decorar está
  vacío por ahora (los separadores sueltos están en Elementos).
- **Lienzo** (`EditCanvas`): 375px × `min(666px, 100vh - 210px)`, radio 28,
  fondo `#16323d`, contorno `#C9B8F0`, sin marco de teléfono. Escala por el
  zoom del dock (80% · 100% · Ajustar = `clamp(.6, (ancho - padL - padR)/395, 1)`).
  El chip "Color del tema" abre la herramienta Paleta.
- **Secciones** (`SectionsPanel.jsx`, derecha): Generales y Portada fijas,
  módulos ordenables con `@dnd-kit` (`generals.positions`), ojo =
  `<módulo>.active`, punto amarillo = `staleSections`, "Agregar sección" =
  volver a mostrar una oculta. Visible por omisión con ancho ≥ 1280px; el
  botón de capas del dock lo fuerza (con < 1100px cierra el panel de
  herramienta). Reemplaza la pill de módulos que flotaba junto al lienzo
  (`ModuleOrder`, borrada).
- **Dock** (abajo): deshacer / rehacer · Editar | Ver en vivo · (en vivo)
  iOS | Android · zoom · Secciones · tour.
- **Ver en vivo**: `DevicePreview.jsx` (marco iPhone / Android sacado de
  BuildContent, que también lo usa) a 0.9 del zoom (0.82 en Ajustar); riel y
  panel a 35% sin toques; aviso arriba a la izquierda.
- **Header**: `HeaderDashboard languagePicker={…}` monta el idioma como
  píldora (`LanguageSelector variant="pill"`) junto a Ayuda, y muestra
  "Cambios sin escribir" (punto `#A88AFF`) junto al breadcrumb (< 1240px se
  oculta).
- La zona de cada módulo en la pieza va a 22px de radio (tarjeta de 28px).

Pendiente de esta etapa: el `BuildTour` todavía apunta a elementos de la
barra vieja (`mod-*`, `images`, `translate`); los pasos que no encuentran su
ancla salen centrados.

## Etapa 2 · Paneles (hecha)

`PageSections/ToolPanels.jsx` (+ `.module.css`); cada herramienta del riel
trae su `Panel` en `TOOLS` (EditorWorkspace). Todo escribe en `generals` con
`setInvitation` (= `setActiveField`): entra al historial de deshacer y marca
sin guardar.

- **Paleta**: los 4 colores actuales (Fondo, Contrastes, Textos, Acentos =
  `primary`, `secondary`, `accent`, `actions`) con ColorPicker (con los 10
  tonos de cada color como atajos), y las paletas
  de `colorPalette.js` con buscador (nombre o palabra clave). Elegir una
  cambia los 4 colores y el color de títulos, como "Colección de colores".
- **Texturas**: "Sin textura" + las de TexturesContext (`generals.texture`).
  La intensidad y "aplicar a todas las secciones" del handoff no están: no
  hay campo en la invitación (la opacidad viene de la fila de `textures`).
- **Decorar**: vacío por ahora (pedido del usuario); los 14 separadores se
  arrastran desde Elementos como elementos sueltos (`kind: 'separator'`).
- **Ideas**: 8 combinaciones fijas (`IDEAS`: paleta + fuente de títulos +
  fuente de cuerpo). "Probar" las aplica como un cambio más; no tocan
  textura ni separador.

## Etapa 3 · Elementos y Stickers (hecha)

Elementos sueltos encima de cada sección: `invitation.decorations[sección]`
(llave = `cover`, `greeting`, `family`, `quote`, … igual que las zonas),
lista de `{ id, kind: sticker|icon|text|line, url|icon|text, variant, color,
x, y, w, rot, opacity }`. x / y = centro y w = ancho, en % de la sección.
`color: null` = color de textos del tema.

- **iattend-events** `components/Invitation/SectionLayer/`: la capa. El
  invitado la ve (solo se monta si la sección tiene algo; no recibe toques).
  En edición: elegir, arrastrar, escalar (esquinas), girar (manija de arriba,
  se pega a 0/90/180/270), doble clic en un texto para escribirlo, barra
  oscura (color, editar texto, opacidad 100→75→50→25, al frente, duplicar,
  eliminar), Supr / Escape / flechas. Los textos eligen tipografía (`font`,
  null = la del tema; lista = fuentes cargadas, `loadedFontFamilies`) y el
  color ofrece la paleta del tema + blanco/negro + otro color. Al mover hay
  guías rosas (centro de la sección y de los demás elementos) y se pega a
  6px; al traer uno del panel, guía y pegado al centro de la sección
  (HostClient). Los elementos no se recortan: pueden quedar entre dos
  secciones (el elegido sube encima de las vecinas). La barra y sus menús
  se recorren para no salirse por los lados. Cada cambio sale como
  `REMOTE_FIELD_CHANGE decorations.<sección>` (lista completa).
- **Arrastre** (`PageSections/layerItems.js`): un fantasma sigue al puntero;
  los iframes no reciben puntero mientras tanto (`body[data-layer-drag]`).
  ReactHost pasa el punto a px del iframe (divide entre el zoom) y manda
  `HOST_LAYER_HOVER` (resalta la zona) y `HOST_LAYER_DROP`. Un clic sin
  arrastrar manda `HOST_LAYER_ADD`: la sección elegida, o la que se ve, al
  centro de lo visible. HostClient busca la zona con `elementFromPoint`, lo
  agrega, lo pinta al momento y lo deja elegido.
- **Paneles** (`LayerPanels.jsx`): Elementos (buscador, 3 textos con las
  fuentes de la invitación, 16 íconos, 4 líneas) y Stickers (subir con clic o
  soltando archivos, "Tus stickers" = subidos para esta invitación en
  `localStorage.iattend_stickers_<id>` + los ya puestos; tope de 12 stickers
  por invitación). Se suben aligerados con `subirSticker` a
  `user_images/inv-<id>/`.
- **⌘V** con una imagen: en el editor o con el foco dentro de la pieza (la
  pieza manda el archivo con `REMOTE_PASTE_IMAGE`); se sube y entra como
  sticker a la sección que se ve.

Pendiente: la "Colección i attend" de stickers (no hay catálogo), arrastrar
un color de la Paleta sobre un texto, el layout de pantalla grande del
invitado (portada en la columna de la izquierda) no pinta los elementos de
la portada, y las traducciones: los textos sueltos no se traducen y, con un
idioma activo, lo que se agregue queda solo en ese idioma.

## Etapa 4 · Texto con Lia (hecha)

`PageSections/AiTextPanel.jsx` (+ `.module.css`) → `POST /api/ai/write`
(`iattend--backend/router/ai.write.route.js`). Destinos: Bienvenida
(`greeting.description`), Título (`greeting.title`), Frase
(`quote.text.font.value`) y Aviso (agrega a `notices.notices`); la Portada
del handoff se cambió por Título porque el título de la portada son los
nombres. Petición libre + tono (romántico / formal / divertido) → 3
opciones; "Otra" cambia solo una (manda las que ya vio para no repetir).

- Mismas reglas que el chat: `Authorization: Bearer` (`liaHeaders`),
  `validarAccesoInvitacion`, plan con Lia (`planIncluyeLia`), créditos de
  Lia del día (`get_lia_credits_status` → 402 `NO_CREDITS`) y se cobra el
  costo real (`log_ai_interaction` con `tool_called = editor_write:<destino>`
  + `consume_lia_credits`). No usa la burbuja de créditos de WhatsApp
  (`setCreditSending`): son otros créditos.
- Redacta Sonnet con salida forzada por herramienta (`opciones`), con tipo de
  evento, nombre y anfitriones de `get_event_summary`, en el idioma activo.
- "Usar" escribe el campo (y prende el módulo si estaba apagado), lleva la
  pieza a esa sección y entra al historial de deshacer. Arrastrar una opción
  la suelta como texto suelto (capa de la etapa 3).

### Ajustes después de la etapa 1 (pedidos del usuario)

- El lienzo regresó a sus medidas de antes: 390 × 780, radio 36, fondo
  degradado gris, sin contorno (la zona de cada módulo, a 30px de radio).
- El tablero regresó a los puntitos sobre el degradado claro de antes.
- Se quitó el panel **Secciones**: regresó la columna junto a la pieza
  (`ModuleOrder`: T, deshacer y la pill de módulos, con sus animaciones y
  arrastrable de lado).
- A la derecha regresaron el **idioma** (`LanguageSelector` redondo; el header
  ya no lo monta) y el **slider vertical de zoom** (0.5–2). En el dock sigue
  el botón 80% · 100% · Ajustar; los dos mueven el mismo zoom.

Medidas actuales (ajustadas con el usuario): columna de módulos y columna de
idioma + zoom con barras y botones redondos de **36px** de ancho (botones de
32 dentro de la pill), las dos a la altura del centro de la invitación (la de
la derecha se mide en `EditorWorkspace`); la columna de módulos no se escala
con el zoom (escala inversa `--inv-zoom` dentro de su transform). Dock de
**40px** de alto. Riel blanco. El panel de herramienta flota encima: abrirlo
no recorre la invitación.

Más ajustes: se ocultaron el idioma y el slider de zoom de la derecha (el
zoom queda en el dock; el idioma está pendiente de lugar — hoy no hay forma de
cambiar de idioma en el editor de escritorio). El riel y su panel van a todo
lo alto pegados a la orilla izquierda (estilo Canva); el panel (340px) se
pliega con el asa de su orilla derecha y flota sobre el tablero. La columna de
módulos sale por omisión a la derecha de la pieza
(`localStorage.iattend_order_side_v2`).

## Fondo propio de cada bloque (color · imagen · textura)

El botón de fondo (brocha) de cada módulo abre `ModuleBackground`
(`BuildSections/ModuleStyle.jsx`): **Color** (switch, `dynamic_background.active`
+ `custom_color`), **Imagen** (`dynamic_background.image`, con opacidad
`image_opacity`) y **Textura** (`dynamic_background.texture`, id de la tabla
`textures`, aparte de `generals.texture`). Se pueden combinar. Bordes, largo
y sombra aplican con cualquiera de los tres (`hasBg`). La Cita conserva su
"imagen o color" y solo suma la textura.

En iattend-events lo pinta `components/Invitation/ModuleBackdrop.tsx`: la caja
de cada módulo lleva `isolation: isolate` y la imagen y la textura son capas
con `z-index: -1` (encima del color, debajo del contenido, con el radio de la
caja). Las texturas llegan por `ModuleTexturesContext` (Invitation.tsx).
`hasModuleBg` decide el largo / radio / sombra en los 8 módulos.

**Relleno y separadores.** El panel de fondo trae "Relleno" (arriba y abajo
de la caja, `dynamic_background.padding_y`, 24px por omisión; en events va
como variable `--module-py` para no pelear con el `padding` en línea, y la
Cita lo usa en su modo color). "Invertir color" va debajo de Color. Los
separadores (`dynamic_separator`) ya no los pinta cada módulo: los pinta
`Invitation.tsx` (`separatorAfter`) **entre** bloques, fuera de la zona del
módulo; tocar uno abre su panel y elige ese módulo.

**Más ajustes del fondo por bloque.** Con textura propia el bloque sube sobre
la textura general (`z-index: 1` en `moduleBoxExtras`), así se ve la suya y
no la general encima. "Intensidad" (`dynamic_background.texture_opacity`,
10–100 %) multiplica la opacidad de la textura. Las texturas del panel van en
cuadrícula de 5 (con scroll horizontal se recortaban). El separador tiene su
propio color (`dynamic_separator.color`; `single.color` es un valor viejo sin
uso) y ya no se invierte con el bloque, porque va sobre el fondo de la
invitación.

**Formas y decoraciones en Elementos.** Grupo "Formas" (cuadrado, círculo,
rectángulo, triángulo, estrella): `kind: 'shape'`, `color` = relleno
(`"transparent"` = sin relleno), `stroke` / `strokeWidth` = borde, `ar` = alto
/ ancho. Se dibujan en un SVG 100×100 estirado (`preserveAspectRatio="none"`,
borde con `vector-effect: non-scaling-stroke`). Además de las esquinas
(escala proporcional) tienen manijas en los lados para estirarlas a lo ancho
o a lo alto. La barra trae Relleno y Borde (paleta + grosor). Los
separadores sueltos se llaman "Decoraciones".

**Capas, esquinas y estirado.** Cada elemento tiene plano (`z`: delante, el de
siempre, o `"back"` = detrás del contenido del bloque) y orden dentro del
plano (orden de la lista). Menú "Capas" de la barra: Al frente · Subir · Bajar
· Detrás del contenido. La capa de elementos va ANTES del módulo en el DOM y
sin z-index propio: `.clipBack` (z 0) queda bajo el contenido posicionado y
bajo la textura general; `.clip` (z 10) encima. Cuadrado y rectángulo son una
caja con borde en px y esquinas (`radius`, px a 390 de ancho, pintado en cqw;
999 = píldora); círculo, triángulo y estrella, SVG con `vector-effect` en cada
figura (en el grupo no se hereda: por eso el grosor salía de más). Estirar por
un lado deja fijo el lado contrario, también con la forma girada.
