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
  `HOST_LAYER_HOVER` (resalta la zona) y `HOST_LAYER_DROP`. A la invitación
  solo se agrega **arrastrando**: un clic sin arrastre no agrega nada, solo
  llama `onTap` si el panel lo da (ícono del momento, abajo).
  `HOST_LAYER_ADD` (la sección elegida o la que se ve) queda para pegar una
  imagen con ⌘V y para el panel Imágenes. HostClient busca la zona con `elementFromPoint`, lo agrega, lo pinta al
  momento y lo deja elegido.
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

**Banco de imágenes y videos en el riel.** Herramienta "Imágenes"
(`MediaPanel.jsx`). Dentro del editor de escritorio, `StorageImages` no abre su
dropdown: con `MediaSiderContext` (provider en EditorWorkspace) le manda su
pedido al riel (`{ type, mediaType, isNull, handleImage, … }`), se cierran los
popovers de la pieza (`iattend-close-popovers`) y lo que se elija se aplica
donde se pidió. El pedido se suelta al cerrar el panel o cambiar de
herramienta. Abierto directo desde el riel, tocar una imagen la pone como
sticker. En celular y fuera del editor el picker sigue igual (dropdown /
hoja). `StorageImages inline` dibuja solo su contenido.

**Portada y elementos sueltos.** La capa de la portada mide 100dvh (el área
del título y la fecha). Publicada, la portada mide 110vmax y medir contra
toda la caja desfasaba los elementos respecto al título.

**Fecha.** El popover de la fecha elige la tipografía de la fecha y el
contador (`cover.date.font`; "Del cuerpo" = la de los textos).

**Barras del elemento (como Canva).** Sobre el elemento (SectionLayer, en
events): pastilla blanca con Bloquear (`locked`: se elige pero no se mueve ni
escala), Duplicar, Eliminar y "…" (Capas). Arriba de la pieza (`ElementBar.jsx`
en vite, mientras haya uno elegido): Color / Relleno, color del borde, Borde
(sin · sólido · guiones · puntos + grosor 0–12), Redondear esquinas (0–200),
tipografía en los textos, Voltear (`flipX` / `flipY`) y Transparencia. La pieza
avisa el elegido con `REMOTE_LAYER_SELECT { section, id }` y el editor cambia
`invitation.decorations` directo. El color se elige en el panel "Color" del
riel (`ColorPanel.jsx`, oculto en el riel): colores de la invitación primero,
uno propio y la paleta de sólidos. Con un elemento elegido, la pieza baja para
dejar lugar a la barra.

**Barra de texto (título de la portada y texto de la Cita).** En el editor de
escritorio la barra se abre al ELEGIR el texto (no con la "T", que ahí ni se
muestra: `HOST_PROPS.textBar`). La Cita avisa su texto elegido con
`REMOTE_SELECT_SECTION { section: 'quote', field: 'quote_text' }` y BuildPage
lo guarda como `selectedField`; EditCanvas avisa
`onTextTool('cover' | 'quote' | null)` según `selectedField` y el área de trabajo muestra
`TextBar.jsx` arriba de la pieza: tipografía, tamaño −/+, color ("A" con la
barra del color; se elige en el panel "Color"), negrita, cursiva, subrayado,
tachado, mayúsculas (aA → AA → aa), alineación (portada: `position.align_x`;
Cita: `text.justify`), espaciado (letras, renglones y grosor) y transparencia;
en la Cita, Efectos (ancho y sombra). Campos nuevos en `Font`: `italic`,
`underline`, `strike`, `transform`, `letterSpacing` (centésimas de em),
`lineHeight`; los pinta `fontExtras.ts` en events. El panel "Color" está en el
riel y recibe un `colorTarget` (texto o elemento suelto); no se cierra al
soltar la selección. La barra de texto y el riel cuentan como "adentro" para
no cerrar la herramienta abierta.

**Barra de fondo del bloque.** En el editor de escritorio la brocha de cada
bloque (y "Cambiar fondo" de la Cita) ya no abre el popover: EditCanvas avisa
`onModuleTool(sección | null)` y el área de trabajo muestra `ModuleBar.jsx`
arriba de la pieza, con el formato de la barra de textos: color (panel
"Color", con "sin color"), invertir, Imagen (abre el panel "Imágenes"; con
imagen, un ajuste con opacidad —o los efectos en la Cita— y "Quitar imagen"),
textura (select) e intensidad, bordes, largo, relleno y sombra. La Cita sigue
siendo "imagen o color". Abrir el panel de Imágenes cierra los popovers de la
pieza pero no las barras (`BAR_FIELDS`). En celular (BuildContent) siguen los
popovers.

**Textos de los bloques y candado.** Se quitó la "T" de la columna de módulos
(TypographyPanel). Al elegir un texto editable de un bloque (EditableText avisa
con `REMOTE_TEXT_FIELD { path, kind }`; títulos = `<bloque>.title`, lo demás es
cuerpo) se abre la misma barra de texto (`textStyle.js` decide a dónde
escribe). Candado al inicio de la barra (se recuerda en
`localStorage.iattend_text_lock`): cerrado = el cambio va a todos los títulos
o a todos los cuerpos (`generals.fonts.titles | body`; tamaño y color solo
para títulos, sin alineación global); abierto = solo a ese texto
(`invitation.text_styles[path]`, con todo: tamaño, color, alineación, extras).
En events, EditableText aplica los extras globales (cursiva, subrayado,
espaciado…) de su tipo y, encima, su estilo propio (`TextStylesContext`).

**Barra del separador.** Tocar el separador de un bloque ya no abre el popover
`ModuleSeparator` en escritorio: EditCanvas avisa `onSeparatorTool(sección)` y
el área de trabajo muestra `SeparatorBar.jsx`: ojito (prender / apagar),
Regular | Imagen; regular = select con los 14 separadores dibujados y su color
(panel "Color"; "sin color" = el de textos del tema); imagen = botón al panel
"Imágenes", alto y largo (en vivo). Apagado, lo demás queda deshabilitado.

**Barra de fondo al elegir un bloque.** La barra de fondo (ModuleBar) sale al
elegir cualquier bloque en la pieza y se va al tocar el tablero; un texto,
elemento o separador elegido tiene prioridad (tocar el separador, o su
"+ Separador", también elige su bloque: su barra le gana a la de fondo). En escritorio (`textBar`) ya no
hay brocha en la esquina del bloque (Invitation.tsx) ni "Cambiar fondo" sobre
la imagen de la Cita; en el celular siguen. La
barra de texto de la Cita suma posición vertical (`quote.text.align`), ancho
y sombra directo en la barra.

**Ícono de los momentos.** En la pieza, el ícono / imagen de cada momento del
itinerario se puede tocar (`moment_icon:N`, botón `.edit_icon_btn` en
Itinerary/Card). En escritorio abre el panel Elementos y baja hasta su final,
donde está "Ícono del momento" (`MomentIconSection` en `MomentIconPanel.jsx`),
en columna: Íconos del itinerario (`iconsItinerary`) e Ilustraciones
(`imagesItinerary`), siempre visibles. Los dos también se arrastran a la
invitación como elemento suelto: la ilustración como sticker y el ícono como
`kind: 'icon'` con `icon: "it:<n>"` (SectionLayer lo busca en
`iconsItinerary` de events y lo pinta del color del elemento). Lo elegido va a
`itinerary.object[N].icon` (número = ícono de react-icons; ruta / URL =
imagen; `lucide:<Nombre>` / `shape:<forma>` = glifo, `MomentGlyph` en events).

Mientras se elige (`iconRequest`), arriba de Elementos queda fijo el aviso
"Elige el ícono de «momento»" con una X para salir, y un clic en cualquier
ícono, forma o ilustración del panel lo pone como ícono del momento (el
actual se marca); textos, líneas y decoraciones se atenúan porque no aplican.
Sin `iconRequest` el clic no hace nada: todo se agrega arrastrando. El modo
termina con la X, al cerrar el panel o al cambiar de herramienta.

**Barra de un momento.** La imagen y la dirección de un momento del
itinerario (`moment_image:N`, `moment_address:N`) y la imagen de un destino
(`dest_image:N`) ya no abren popover en escritorio: EditCanvas avisa
`onFieldBar(campo | null)` y el área de trabajo muestra `MomentBar.jsx`
arriba de la pieza. Imagen: miniatura, "Cambiar imagen" (panel "Imágenes" del
riel) y quitar. Dirección: buscador de Google en la barra y "Agregar manual"
(los campos en un popover debajo, `ADDRESS_FIELDS` de
`BuildSections/addressFields.js`); al guardar, la barra se cierra con el
evento `iattend-close-tool`. En el celular siguen `MomentImage` /
`MomentAddress`. Prioridad de barras: elemento > texto > campo (momento /
paleta) > separador > fondo.

**Paleta del dresscode.** Con `textBar`, "Agregar paleta de colores" y el "+"
de la paleta en DressCode (events) ya no abren el ColorPicker de antd: mandan
`dress_colors` por el mismo canal (`onFieldBar`) y sale `PaletteBar.jsx`:
cada color de `dresscode.colors` es un botón (al tocarlo se edita en el panel
"Color", `colorField = 'dress'`), "+" agrega uno (copia del último) y lo deja
elegido, y el bote quita el elegido. En el celular sigue el ColorPicker.

**Imágenes del dresscode y de la galería.** `dress_images` / `gallery_images`
también van por `onFieldBar`: en escritorio ya no flota el panel
`DressImages` sobre las imágenes, sale `ImagesBar.jsx` arriba de la pieza:
"+ Imagen" (panel "Imágenes" del riel; se agrega al final), miniaturas de 40px
en fila (scroll horizontal pasando 360px) que se arrastran para ordenar
(dnd-kit) y el bote quita la elegida. En el celular sigue `DressImages`.

**Link de inspiración del dresscode.** Con `textBar`, "¿Necesitas
inspiración?" y "Agregar inspiración" mandan `dress_link:N` por `onFieldBar`
(el popover `LinkEditor` de events queda para el celular) y sale
`LinkBar.jsx`: campo de la URL y el bote para eliminarlo. Ojo: en
invitaciones viejas `dresscode.links` trae objetos `{ URL, url, name }` (de
`transformInvitation.js`), no texto; events los lee con `dressLinkUrl`
(`types/new_invitation.ts`, también en la invitación en vivo, que antes
ponía `href="[object Object]"`) y LinkBar los edita conservando su forma.

**Tarjetas de la mesa de regalos.** Con `textBar`, la cartera (Wallet en
events) avisa qué tarjeta abrió (`gift_card:N`) y cuándo la cerró
(`gift_card_close`), y su logo deja de ser selector (BrandPicker queda para el
celular). Sale `GiftCardBar.jsx`: empresa (Select con el catálogo
`gift_brands` vía `useGiftBrands`, agrupado en Tiendas / Bancos con su logo) y
los datos (tienda: link; banco: titular y cuenta). EditCanvas no alterna esta
barra con el mismo campo y no la cierra al tocar la pieza (se toca la tarjeta
para escribir encima); se va al cerrar la tarjeta o cambiar de bloque.
Eliminar la tarjeta sigue siendo su "×".

**Capas.** En escritorio el orden de los módulos ya no es la columna de
iconos junto a la pieza (`ModuleOrder`, queda para el celular): EditCanvas
pinta `ModuleLayers.jsx` por portal en `layersTarget`, un panel "Capas"
flotante arriba a la derecha del área de trabajo (no cuenta en el centrado de
la pieza). Cada módulo es una fila (asa, icono, nombre, ojo para ocultar /
mostrar `[módulo].active`); tocarla lo elige y arrastrarla reescribe
`generals.positions`. La portada va primero, fija. `MODULES` vive en
`moduleList.js`.

**Portada: fecha, canción e imagen o video.** También van por `onFieldBar`:
`date` → `DateBar.jsx` (ocultar, día, tipografía, color en el panel "Color" y
"Usar el del título"), `song` (chip "Canción") → `SongBar.jsx` (con canción:
portada, nombre y quitar; sin canción: buscador de Spotify con resultados en
un popover debajo y "Subir") y `cover_media` ("Cambiar fondo") →
`CoverMediaBar.jsx` (+ Imagen, + Video, miniaturas ordenables con
`SortableThumbs.jsx`, quitar la elegida y Efectos en popover; el color de la
sombra va al panel "Color", `colorField = 'cover_shadow'`). El chip "Color
del tema" ya no sale en escritorio (el tema está en Paleta). En el celular
siguen `CoverDateStyle`, `CancionFlash` y `CoverMedia`.

**Dock y dispositivos de "Ver en vivo".** El segmento de dispositivos del dock
está siempre montado y crece / se encoge suave (grid `0fr → 1fr`) al entrar y
salir de "Ver en vivo"; el dock lleva `width: max-content` porque, centrado
con `left`, el ancho disponible lo topaba. Dispositivos: iPhone, iPad
(768 × 1024) y Mac (ventana de Safari de 1280 × 800); Android quedó oculto
(DevicePreview lo sigue soportando para otras vistas). A partir de 768 px la
invitación usa su diseño de pantalla grande (`LARGE_SCREEN_QUERY` en
iattend-events), así que iPad y Mac muestran ese diseño. Sus medidas viven en
`deviceSizes.js` y el zoom nunca pasa de lo que cabe en pantalla.
Con el iPad elegido aparece en el dock el botón de girar: horizontal
(1024 × 768, `landscape` de DevicePreview). El giro es físico: las medidas
cambian de golpe pero el marco arranca girado 90° y rota a su lugar
(`ipadToLandscape` / `ipadToPortrait`, se reinician cambiando el nombre de la
animación, sin volver a montar el iframe), y el zoom es el mismo de pie y
acostado para que no cambie de tamaño.

**Panel Elementos con catálogo (handoff "Panel lateral" 4.2).** Las
categorías y recursos salen de `editor_categories` / `editor_assets`
(migración `iattend--backend/migrations/2026-10-28_create_editor_catalog.sql`,
semilla `2026-10-28_sembrar_editor_catalog.js`; se editan en Admin →
Laboratorio → Elementos, `EditorCatalogLab.jsx`, rutas
`/api/admin/editor-catalog/*`). `useEditorCatalog.js` lo lee una vez por
sesión con la anon key; si falla o está vacío usa el respaldo en código
(LAYER_ICONS, SHAPES, imagesItinerary). El panel: buscador (nombre, tags y
categoría, en todas), chips con scroll (Todo + categorías), y en "Todo" el
bloque Texto arriba y una fila por categoría con su conteo y "›" para
filtrarla; badge "Nuevo" hasta `new_until`. Líneas y Decoraciones
(separadores) siguen en código, al final. Las ilustraciones ya son categoría
del catálogo y los íconos del itinerario (react-icons, `iconsItinerary`) van
al final de la primera categoría de íconos (`MomentIconPanel` se quitó):
arrastrados son `icon: "it:<n>"`, como ícono de un momento el número. Entrar
desde el ícono de un momento abre Elementos en Íconos, arriba. Las
cuadrículas usan `minmax(0, 1fr)` para que las imágenes no las desborden.

Al soltar, la invitación guarda una copia, nunca el id del catálogo: un ícono
SVG entra como `{ kind: 'icon', src, tint }` (SectionLayer lo pinta con
`mask-image` del color del elemento) y una imagen como sticker con su URL. Como
ícono de un momento, un SVG del catálogo se guarda como `svg:<url>`
(MomentGlyph en events, renderIcon de BuildItinerary). Borrar del catálogo
algo en uso no se permite (`editor_asset_usage`); solo se oculta.

**Riel de 4 (handoff "Panel lateral").** El panel lateral es para AGREGAR; lo
que modifica lo elegido va en las barras de arriba de la pieza. El riel queda
en Diseño · Elementos · Fotos · Subidos (`TOOLS` en EditorWorkspace). Los
paneles sin botón (`hidden`) los abren otras piezas y encienden a su `parent`
en el riel: Color (barras), Imágenes y videos de un picker (`media`, encienden
Subidos) y Texto con Lia (`ai`, desde Elementos → Texto "Escribir con Lia").
Los paneles reciben `selectedSection` y `onOpenTool(id)`.
- **Diseño** (`DesignPanel` en ToolPanels.jsx): Estilos completos (carrusel,
  "Ver todos" = grid; aplicar cambia paleta + tipografías), Paleta (4 roles
  con ColorPicker + 4 sugeridas en 2 columnas; "Más paletas" despliega todas
  con buscador) y Papel de fondo (Ninguno + 3, "Ver todos"). Reemplaza Ideas,
  Paleta y Texturas.
- **Fotos** (`PhotosPanel.jsx`): categorías `panel = 'photos'` del catálogo;
  banner con la sección que se ve, chips (se preselecciona la de
  `section_key` = sección elegida) y subgrupos, todas las fotos sin límite.
  Los chips son sticky (Fotos y Elementos; en Elementos junto con el aviso
  del ícono del momento) y al tocar uno el panel vuelve arriba. Tocar una foto la
  usa en la sección de su categoría (portada: reemplaza la primera imagen o
  video; cita: su imagen; dresscode: se agrega) y elige esa sección.
- **Subidos** (`UploadsPanel.jsx`): fotos (`user_images/{id}/`), videos
  (`{id}/video/`) y PNG (`inv-{id}/`, los stickers) en una cuadrícula con
  Todo / Fotos / PNG / Videos, zona de carga (PNG → stickers, otras imágenes →
  fotos, videos → video/) y medidor (referencia de 1 GB). Fotos y PNG se
  arrastran a la invitación como sticker; los videos se usan desde "Cambiar
  fondo". Eliminar usa los helpers de siempre (no borran lo que se usa) y un
  PNG puesto en la invitación no se borra. Reemplaza Stickers e Imágenes.

**Barra contextual (handoff "Panel lateral" 5).**
- **Color** (`ColorChooser.jsx`, utilidades en `colorUtils.js`): ya no es el
  panel Color del riel (se quitó de `TOOLS`). Cada botón de color de una barra
  llama `pickColor(campo)` y EditorWorkspace abre un popover anclado al último
  botón presionado (se guarda en `pointerdown`); tocar el mismo botón lo
  cierra. Contenido: "De tu paleta", "Usados recientemente" (últimos 5 en
  `localStorage.iattend_recent_colors`), área saturación / brillo + tono, HEX,
  cuentagotas (`EyeDropper`, donde exista) y "Más colores" (sólidos). El
  `onPick(color, { snapshot })` de cada `colorTarget` pasa la opción a su
  setter: arrastrar el picker es UNA entrada en deshacer.
- **Fondo** (ModuleBar): un botón "Fondo" con la muestra del fondo actual abre
  pestañas Color / Textura (catálogo de texturas + intensidad) / Foto (elegir
  en el banco, quitar, opacidad; la Cita trae sus efectos). Invertir, bordes,
  largo, relleno y sombra siguen en la barra.
- **Lia** (`LiaRewrite.jsx`): botón "Lia" en la barra de texto (portada,
  Cita o texto de un bloque). Tono Romántico · Formal · Divertido · Breve,
  instrucción opcional y 3 opciones; tocar una reemplaza el texto con
  `onFieldChange` (mismo camino que escribir encima, respeta el idioma).
  Backend: `/api/ai/write` acepta `rewrite_title` / `rewrite_body` (el largo
  sigue al texto actual) y el tono `short`. Sin texto elegido, Lia sigue en
  Elementos → Texto → "Escribir con Lia".

**Estilos de la cuenta regresiva (handoff "Countdown Catálogo").** La fecha de
la portada tiene un catálogo de 12 estilos guardado en `cover.date.style`
("1a" … "1l"); vacío o "1a" es el de siempre, sin ningún cambio. En el editor
se elige con "Estilo" en la barra de la fecha (`CountdownStylePicker.jsx`,
miniaturas con la foto de la portada y la paleta). En iattend-events,
`countDown/CountdownStyles.tsx` pinta 1b … 1l con la misma cuenta de
Countdown (días sin ceros, el resto a 2 dígitos; el día del evento, el
confeti de siempre): colores de la paleta (primary / secondary / accent /
actions), números con la tipografía de la fecha y serif con la de títulos;
los "sobre foto" toman el color de la fecha. Con un estilo distinto de "1a"
la portada deja que la fecha tome su alto (el título se queda con el resto).

**Estilos del itinerario (handoff "Itinerario Catálogo").** Mismo patrón:
`itinerary.style` ("1a" … "1l"; vacío o "1a" = el zigzag de siempre, intacto).
Se elige con "Estilo" al inicio de la barra del bloque (`ModuleBar` →
`ItineraryStylePicker.jsx`, miniaturas esquemáticas con la paleta). En
iattend-events, `Itinerary/ItineraryStyles.tsx` pinta 1b … 1l y `Card.tsx` le
pasa lo del editor (renglones de `useEditableList` —el deslizable 1e se
reordena en `axis: "x"`—, Eliminar, el botón del ícono `moment_icon:i`,
"+ Momento" y "Detalles", que abre el mismo drawer). Sin fondo propio; las
piezas de diseño (tarjetas 1d/1e/1l, cristal 1k, chips de hora y botones) van
del color del botón "Detalles" del zigzag (`surface` en `Card.tsx`: secondary,
o primary con fondo e invertido). Texto: sobre secondary, primary; sobre
primary, accent (`onSurface`). Los botones dentro de una tarjeta van en primary
con texto accent, y una ilustración se ve directo sobre la tarjeta (sin relleno).
Visual de cada momento: 1b/1h ilustración → foto → ícono; 1e/1j foto →
ilustración → ícono; 1l mapa estático de Google (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
con la dirección) → foto → …; el resto solo ícono. Aplica a la pieza de
celular; el layout dividido de escritorio (`ItineraryWeb`) no cambia.

**Estilos de la mesa de regalos (handoff "Mesa de Regalos Catálogo").**
`gifts.style`: "1a" Cartera (vacío = la `Wallet` de siempre, intacta), "1c"
Sobre, "1e" Baraja, "1f" Girar tarjeta, "1h" Caja de regalo. Se elige con
"Estilo" en la barra del bloque (`ModuleBar` → `GiftStylePicker.jsx`; la barra
arma el popover con `STYLE_PICKERS`). En iattend-events,
`Gifts/GiftStyles.tsx` pinta los cuatro nuevos con los mismos datos
(`gifts.cards`, marcas de `gift_brands`): lienzo de 375 px escalado al ancho
con `transform` (no `zoom`, por Safari); 1f es de alto automático con scroll
horizontal. El sobre / la caja son del color de la cartera, con su texto según
la paleta; el sello lleva el monograma de los nombres de la portada. Modo
edición: tocar una tarjeta la elige y manda `gift_card:N` (la misma
`GiftCardBar`), la "×" la elimina y "+ Tarjeta" agrega (hasta 5). Textos nuevos
de la pieza en `ui.labels` (`registry`, `transfer`, `copyAccount`, `copied`,
`tapToSee`, `swipe`; opcionales, con texto por defecto).

**Estilos de Actividades y hospedaje (handoff "Actividades Catálogo").**
`destinations.style`: "1a" Revistero (también vacío), "1e" Llaveros de hotel,
"1f" Postales. El revistero viejo se reemplazó por el del handoff (todas las
invitaciones lo ven así). Se elige con "Estilo" en la barra del bloque
(`DestinationStylePicker.jsx` en `STYLE_PICKERS`). En iattend-events,
`Destinations/DestinationStyles.tsx` pinta los tres y `Card.tsx` solo pone su
drawer de edición (`onEdit` = `setEditing`, "+ Lugar" = `addCard`): tocar la
revista / la ficha / la postal del frente en modo edición abre el drawer. En
Llaveros va una llave por tipo; si hay varios lugares del mismo tipo, sus
fichas van en fila con scroll de lado. Color
por tipo fijo (Actividades #3FA66B, Hospedaje #2E8BD8, Comida #C2793A). El
matasellos de la postal usa la ciudad del primer momento del itinerario con
dirección y la fecha de la portada. El bloque va encima de la textura (como
la mesa de regalos). El layout dividido de escritorio (`DestinationsCatalog`)
no cambia.

**Estilos del Dress code (handoff "Dresscode Catálogo").** Título y
descripción no cambian; cada elemento tiene su catálogo, con "Estilo" en su
propia barra (`DressStylePicker.jsx` → `DressStyleButton`):
paleta `dresscode.palette_style` P1–P6 (barra de paleta, que suma el nombre del
color elegido en `color_names`, mismo orden que `colors`), imágenes
`images_style` I1–I5 (barra de imágenes) y botón `button_style` B1/B2/B3/B4/B6
(barra del link, que suma el texto del botón en `button_label`). P1 / I1 / B1
son los de siempre y se guardan vacíos. En iattend-events,
`Dresscode/DresscodeStyles.tsx` pinta los demás (visor a pantalla completa en
I2–I4; las polaroids I3 van sin texto). Nunca se muestra el código de un color:
sin nombre escrito se pone uno aproximado (`guessColorName`, espejo en
`colorUtils.js` de vite, que también lo sugiere en el campo). En el editor de
celular (sin `textBar`) la edición sigue como antes.

**Estilos de la Galería (handoff "Galería Catálogo").** `gallery.style`: "G1"
Pila → carrusel (también vacío; reemplazó al `FanStack` viejo, así que todas
las invitaciones la ven como el handoff), "G2" Abanico →
cuadrícula, "G3" Polaroids → lista, "G4" Rollo de película, "G5" Álbum, "G6"
Pila → historias. Se elige con "Estilo" en la barra del bloque
(`GalleryStylePicker.jsx` en `STYLE_PICKERS`). En iattend-events,
`Gallery/GalleryStyles.tsx`: cerrado → tocar → abierto (las fotos se mueven de
una posición a otra, el alto se anima); sin textos por foto (G5 solo numera
las páginas); el título lo pone el bloque. En el editor tocar la galería abre
su barra de imágenes, así que abrir / cerrar se prueba en "Ver en vivo". Con
G1, G4 y G5 (scroll de lado) salen del margen del bloque y se cortan contra la
orilla de la pantalla. El bloque va encima de la textura.

**Estilos de Recordatorios / avisos (handoff "Recordatorios Catálogo").**
`notices.style`: "R1" Apilado (vacío = el de siempre, intacto), "R2" Numerado
editorial, "R4" Notas adhesivas, "R5" Uno a la vez, "R6" Checklist, "R7" Guía
del invitado, "R8" Mensajes de la pareja. Se elige con "Estilo" en la barra del
bloque (`NoticeStylePicker.jsx` en `STYLE_PICKERS`). En iattend-events,
`Notices/NoticeStyles.tsx`: solo texto (números, separadores y rotaciones salen
de la posición); los avisos se editan igual que en R1 (texto encima, arrastrar,
Eliminar, "+ Agregar aviso"). R4 usa la tipografía del cuerpo y tintes de la paleta con texto
legible (≥ 4.5:1); R6 guarda las marcas solo en el dispositivo del invitado
(`localStorage`, por la dirección de la invitación). Con estilo del catálogo el
bloque va encima de la textura.

**Estilos de Personas importantes (handoff "Personas Catálogo").**
`people.style`: "P1" Apilado (vacío = el de siempre, intacto), "P2" Dos
columnas, "P3" Serif con ornamento, "P4" Lista con reglas, "P5" Tarjetas, "P6"
Iniciales. Se elige con "Estilo" en la barra del bloque
(`PeopleStylePicker.jsx`; la sección del editor es `family` y guarda en
`people`). En iattend-events, `Family/PeopleStyles.tsx`: solo rol y nombre,
todo centrado; se editan igual que en P1 (texto encima, arrastrar, Eliminar,
"+ Agregar persona") y entran con la misma animación de la base. En P2 y P5 la
última persona de una cantidad impar ocupa las dos columnas; las iniciales de
P6 salen solas del nombre. El color Contraste se usa si se lee sobre el fondo
(≥ 3:1); si no, el de los textos atenuado.

**Estilos de la Bienvenida (handoff "Bienvenida Catálogo").** `greeting.style`:
"W1" Clásica (vacío = la de siempre, intacta), "W2" Itálica romántica, "W3"
Entre reglas, "W5" Cita (el título va abajo como firma), "W6" Enmarcada, "W7"
Arco, "W8" Palabra por palabra. Se elige con "Estilo" en la barra del bloque
(`GreetingStylePicker.jsx`). En iattend-events, `Greeting/GreetingStyles.tsx`:
solo título + texto, centrados, con los tamaños de la base (título con el de
la invitación, texto 16px); cada opción cambia estilo, ritmo y adornos. W8
anima palabra por palabra una vez al entrar en pantalla (IntersectionObserver
0.4); en el editor no anima, para poder escribir.
