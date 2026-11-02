# Editor de side events / Pop en el celular

Cómo funciona el editor de un side event o Pop en el celular (`/dashboard/side?pop=<id>` o `/dashboard/side?id=<invitación>`, pantallas de 720 px o menos), qué se reutilizó de escritorio y cada decisión que se tomó al pasarlo de web a mobile.

> Relacionados: `docs/editor-movil-invitacion.md` (el mismo diseño en el editor de la invitación), `docs/editor-side-events-workspace.md` (editor de escritorio, `SideWorkspace`), `docs/sistema-diseno-editor.md` (riel, paneles y barras compartidos) y `CLAUDE.md` (resumen en "Editor del celular nuevo").

---

## 1. Principio: un solo editor

El celular **no** tiene paneles, barras ni reglas propias. Usa los mismos componentes que escritorio y solo cambia **dónde** se muestran:

| En escritorio | En el celular |
|---|---|
| Riel de herramientas a la izquierda | Footer flotante (píldora) abajo |
| Panel lateral de la herramienta | Drawer desde abajo (media pantalla o pantalla completa) o modal |
| Barra contextual arriba de la pieza | La misma barra en lugar del footer |
| Popover de Compartir | Modal Compartir |
| "Ver en vivo" dentro de un dispositivo | Página real a pantalla completa |
| Selector de color (`ColorPopover`) | Tarjeta flotante con `ColoresIOS` |

Cuando algo necesita comportarse distinto en el celular, el componente compartido recibe una prop (`movil`, `horizontal`, `onElegir`, `enFila`…) en lugar de copiarse. Nunca crear una versión aparte de un panel o barra.

---

## 2. Cuándo se usa y archivos

- `SideEvents.jsx`: `isMobile = matchMedia('(max-width: 720px)')`. Con `current && isMobile && EDITOR_MOVIL_NUEVO` se pinta `EditorMovil`. `EDITOR_MOVIL_NUEVO = true` es el interruptor: en `false` regresa el editor "story" viejo (`PANELS` + `BottomSheet`), que sigue en el archivo mientras se termina la migración.
- `Movil/EditorMovil.jsx` + `.module.css`: todo el editor del celular.
- `Movil/InvitadosMovil.jsx` + `.module.css`: la pestaña Invitados.
- `EstadoGuardado.jsx`: el indicador del autoguardado (compartido con escritorio).
- `Editor/useEditorMovil.js`: marca `body[data-editor-movil]` y mide el teclado (ver 8b). Lo usan los dos editores del celular.
- `Editor/useZoomTexto.js`: zoom al escribir (`useZoomTexto`, `transformDeZoom`, `useZoomAnimando`; ver 8b).
- `Editor/EditorMovilShell.jsx`: el mismo diseño para el editor de la invitación (usa estas mismas clases CSS).
- Compartidos con escritorio, creados en esta migración:
  - `Workspace/herramientas.js`: la lista de herramientas (riel de escritorio y footer).
  - `Workspace/barraContextual.jsx` (`useBarraContextual`): qué barra sale según lo elegido y el destino del color.
  - `Workspace/barraElemento.js`: acciones de la barra del elemento (tamaño, giro, ocultar, duplicar, quitar, agrupar).
  - `Workspace/agregarElemento.js`: agregar un elemento / PNG a la pieza.
  - `CompartirPop.jsx` → `CompartirContenido`: portada + QR + botones.
- Props nuevas en componentes compartidos:
  - `SideCanvas movil`: disco de canción y aviso del formulario de 44 px.
  - `DesignPanel movil`: color del tema con `ColoresIOS` en vez de `SelectorColor`.
  - `ColoresIOS cabeza={false}` y `conGuardados={false}`, más `className`.
  - `PaletaDibujo horizontal`: la paleta acostada.
  - `ElementsPanel onElegir`, `UploadsPanel onElegir` y `movil`: tocar en vez de arrastrar.
  - `layerItems.js` → `tocarParaAgregar(e, onTap)`: toque sin arrastre que deja hacer scroll.
  - `CompartirContenido alto`, `enFila`, `conHoja` y `qr`.

---

## 3. Pantalla y pieza

- **Fondo:** página blanca con el tablero de puntos de escritorio, sin el degradado gris. Es `.raiz`, `position: fixed; inset: 0`.
- **Barras de Safari:** se pintan blancas. `SideEvents.jsx` pone `#FFFFFF` en el fondo de `html` y `body` y en `meta[name="theme-color"]`, y lo restaura al salir. También fija `maximum-scale=1` en el viewport para que iOS no haga zoom al escribir en el título o las notas (son `contentEditable` de 14 px).
- **Pieza:** la misma `SideCanvas` de escritorio (`barMode`, 357 × 631), escalada para caber (`escala` hasta 1; en modo dibujo hasta 1.6).
- **Posición de la pieza:** se coloca con `transform: translate(x, y) scale(escala)` y no cambiando su caja. Así, al abrir un drawer o entrar a dibujar, solo cambia el transform y la animación va fluida en Safari (`.escenario[data-animar] .pieza` con transición de 0.52 s y la curva de iOS).
- **Medidas:** `tam` (ancho, alto y dónde termina el header) se mide con `resize` y `visualViewport.resize`, para cuando gira la pantalla o cambia la barra de Safari.
- **Leyenda:** "Toca cualquier parte para editarla" va debajo de la pieza y se oculta con un drawer abierto o en modo dibujo.
- **Tocar fuera:** tocar el tablero blanco (fuera de la pieza) suelta lo elegido (sección y elementos), sale de Ajustar y regresa el footer. En modo dibujo no hace nada, para no salir sin querer.

---

## 4. Header

**Normal:** salir · deshacer · rehacer · (espacio) · Diseño / Invitados · público / privado (solo Pop) · compartir.
- Botones circulares blancos de 36 px con sombra suave.
- `padding: 0 18px` y `top: safe-area + 6px`, para que no queden pegados a las orillas redondas del iPhone.
- **Salir** (`handleBack`): primero termina de guardar si hay cambios pendientes (o la imagen del link está vieja) y sale. El aviso de cambios sin guardar solo aparece si el guardado falla.
- **Diseño / Invitados:** segmentado con íconos (paleta / personas). Cambiar a Invitados cierra drawer, modal y dibujo.
- **Público / privado:** candado; en verde cuando es público.
- **Compartir:** abre el modal Compartir (ver 9). Con información pendiente del evento llama a `onCompartirBloqueado`, que muestra el aviso de siempre.

**En modo dibujo:** deshacer · rehacer · (espacio) · ["Dibujar en" + Borrar todo] · ✓. Ver 7.

**Estado del guardado:** debajo del header, centrado (`EstadoGuardado`, ver 12).

---

## 5. Footer de herramientas

- Píldora blanca flotante abajo (`bottom: max(14px, safe-area)`).
- **Herramientas:** las del riel de escritorio, sin las ocultas y, si no es Pop, sin las de solo Pop (`HERRAMIENTAS` en `Workspace/herramientas.js`): Diseño · Elementos · Fotos · Dibujar · Subidos · Imagen del link · Pase digital.
- **Scroll:** las herramientas se recorren de lado (`.footerHerr`, con fundido en la orilla derecha).
- **Ver en vivo:** el ojo, un círculo oscuro de 48 px, va **fijo a la derecha** después de un separador (ver 10).
- **Aviso:** Imagen del link lleva un punto rojo si la portada es solo video y no hay imagen propia.
- **Qué hace cada herramienta:**

| Herramienta | Qué abre |
|---|---|
| Diseño | Drawer a media pantalla |
| Elementos, Fotos, Subidos | Drawer a pantalla completa |
| Dibujar | Modo dibujo |
| Imagen del link, Pase digital | Modal |

- **Cuándo se esconde:** cuando sale un drawer, el modo dibujo o una barra contextual (`data-oculto`), baja 12 px, se encoge al 96 % y se desvanece. Al regresar, entra con la misma transición.

---

## 6. Drawers (Diseño, Elementos, Fotos, Subidos)

`PANELES = { design: 0.5, elements: 1, photos: 1, uploads: 1 }`: qué parte del alto ocupa cada uno.

- **Animación:** sube como hoja de iOS (`translateY(100%) → 0`, 520 ms, `cubic-bezier(0.32, 0.72, 0, 1)`) y baja en 420 ms al cerrar con ✓. Solo transform; se probó `clip-path` (la píldora "creciendo") y se descartó porque recortaba la sombra y Safari no lo animaba fluido.
- **Cabecera:** asa, título centrado y ✓ (44 px). Cuerpo con scroll propio (`overscroll-behavior: contain`).
- **Sombra:** leve (`0 -2px 14px rgba(23,22,27,.06)`), para separar el drawer del espacio de trabajo.
- **Media pantalla (Diseño):** la pieza se achica y se acomoda entre el estado del guardado y el drawer, con la misma curva.
- **Pantalla completa:** sin redondeo ni sombra, con el aire de la barra de estado arriba. La pieza no se mueve (queda tapada).

### Diseño
`DesignPanel movil`: el color del tema con `ColoresIOS` a lo ancho (Cuadrícula · Espectro · Deslizadores), **sin** título ni colores guardados. Después vienen el estilo de bloques (Pop), el velo y los efectos, igual que en escritorio. Tocar el chip del color del tema en la pieza también abre Diseño.

### Elementos
`ElementsPanel onElegir`: **tocar** un elemento lo agrega (en escritorio se arrastra). Se usa `tocarParaAgregar`, que no hace `preventDefault` y descarta el toque si el dedo se movió más de 8 px o el navegador canceló el gesto. Así el panel sigue haciendo scroll aunque el dedo empiece sobre una tarjeta. Las tarjetas traen `touch-action: none` (para arrastrar en escritorio); en el drawer se fuerza `pan-y`.

### Fotos (Ideas de I attend)
`PhotosPanel onUse`: en un Pop, tocar una foto la agrega como **elemento** (PNG, 60 % de ancho), no como portada; lo mismo pasa ahora en escritorio. La portada se elige con el "+" de la barra Fondo. En un side event de boda (sin elementos) la foto sí se vuelve el fondo.

### Subidos
`UploadsPanel onElegir`: tocar una foto, PNG o vector lo agrega (la foto al 60 %). Los videos no se agregan como elemento. El texto de "Subir archivos" dice "Fotos, PNG o videos de tu teléfono" (`up_hint_mobile`), no "arrastra / ⌘V".

### Agregar a la pieza
`agregarElemento` (compartido con el soltar de escritorio):
- Revisa el tope de elementos e imágenes; si no cabe, aparece el mismo aviso que en escritorio.
- Un PNG se aligera a WebP en la carpeta del evento (`flash-<id>` en un Pop).
- Entra al centro (`x 50, y 40`).
- Cierra el drawer y queda **elegido** (`onSelect('stickers')` + `onStickerSel([id])`) para moverlo o escalarlo.

---

## 7. Modo dibujo

Al tocar Dibujar se entra **directo a pantalla completa**, sin el paso "pantalla completa" de escritorio.
- **Pieza:** tan grande como cabe entre el header y la paleta (hasta 1.6×), con `SideCanvas pincel` + `soloDibujo`, así que solo se dibuja.
- **Pincel:** `{ brush, color, size, opacity }` vive en la sesión del editor, no en el body (como en escritorio).
- **Header de dibujo:**
  - Deshacer y rehacer.
  - "Dibujar en" (Portada o una de sus fotos / videos) con el mismo `DibujarEn` de la barra de escritorio. Solo aparece con 2 o más fotos o videos; la elegida queda fija mientras se dibuja (`fotoFija`).
  - Borrar todo: quita los trazos hechos desde que se entró (ids de `onTrazo`).
  - ✓: sale.
- **Paleta abajo** (`PaletaDibujo horizontal`):
  - Barra blanca de 96 px de alto.
  - Plumas paradas con la punta arriba, cortadas por la orilla inferior: caben 5 y el borrador queda con scroll de lado. La elegida sobresale. Las puntas toman el color actual.
  - Tocar la pluma elegida abre grosor y opacidad (`AjustesPincel`) hacia arriba.
  - Sin deshacer / rehacer (van en el header) y sin los colores fijos.
  - El botón de color (anillo arcoíris con el color actual al centro) abre la **tarjeta flotante de color** (ver 11) con opacidad.
- **Transiciones:**
  - Al entrar, el header de dibujo aparece con un fundido, la paleta sube (`entraAbajo`), la pieza crece y el footer se esconde.
  - Al salir, la paleta baja y el header de dibujo se desvanece (`saliendoDibujo`, unos 260 ms montados) mientras la pieza regresa. Luego el header normal entra con fundido (`volvioDeDibujo`) y vuelve el footer.

---

## 8. Barras contextuales (lo que se toca en la pieza)

Lo elegido en la pieza cambia el footer por **la misma barra de escritorio**. Las arma `useBarraContextual` (`Workspace/barraContextual.jsx`), que también usa `SideWorkspace`:

| Se toca | Barra |
|---|---|
| Elemento / sticker | `ElementBar`: color o borde, voltear, opacidad, tamaño, giro, ocultar, duplicar, borrar, agrupar / desagrupar (lógica en `barraElemento.js`) |
| Título | `TextBar`: fuente, tamaño, color, negrita, cursiva, subrayado, tachado, mayúsculas, interlineado, opacidad y Sombra |
| Extras (notas) | `TextBar` con alineación |
| Fecha | `DateBar` |
| Lugar / Cómo llegar | `PlaceBar` |
| Clima | `WeatherBar` |
| Fondo | `BackgroundBar`, y `AjusteFotoBar` al ajustar |
| Canción | `SongBar` (buscar en Spotify o subir) |

Reglas:
- **Transición:** la barra sube con un fundido (`barraEntra`) mientras el footer baja. Al soltar, la barra baja (`barraSale`, unos 240 ms montada con la sección que se iba, `barraSalida`) y el footer regresa al mismo tiempo.
- **Si no cabe:** la barra misma se recorre de lado y conserva su redondeo (26 px) y su sombra. Sus hijos no se encogen.
- **Teclado:** con el teclado abierto (título, buscar canción) la barra sube encima de él. Se mide con `visualViewport` (`teclado`), porque en iOS lo fijo se queda detrás del teclado.
- **Color:** el color del texto o del elemento abre la tarjeta flotante con `ColoresIOS` (`pickColor(campo)` → `colorCampo`; `barra.colorTarget` dice qué se pinta).
- **Asistentes, Itinerario y Formulario** no tienen barra: abren su panel en un modal (ver 9).

### Fondo
- **Tira:** miniaturas de la portada (con ✕ para quitar y el badge de la foto del link), "+", Ajustar, Velo y Desenfoque.
- **"+":** abre el modal en Subidos (`pickMedia` → modal `elegir`, `mediaType: 'mixto'` en un Pop: foto o video) y al elegir se cierra.
- **Ajustar:** cambia la barra por la de ajuste (− zoom + · Restablecer · Listo) y la pieza toma `ajustarFoto`. Fondo ↔ Ajustar cambia de ancho desde la anterior (`useAnchoDesdeLaAnterior`).
- **Foto fija:** la foto elegida en la tira queda quieta en la pieza (`fotoFija`).
- **Pendiente:** reordenar las miniaturas arrastrando no funciona con el dedo (es arrastre HTML5 de escritorio). La pista "rueda para acercar" de Ajustar no aplica en el celular, y el texto "Arrastra la foto para moverla" deja Restablecer y Listo fuera de la vista.

### Botones de la pieza más grandes
Con `SideCanvas movil`, el disco de la canción mide 44 × 44 (arte de 36 px) y el aviso del formulario 44 px de alto con texto de 14 px, a la medida del dedo.

---

## 8b. Comportamientos comunes del celular (Pop e invitación)

Lo de esta sección aplica a los **dos** editores del celular: el del Pop (`EditorMovil`) y el de la invitación (`EditorMovilShell`, ver `docs/editor-movil-invitacion.md`). Casi todo cuelga de `Editor/useEditorMovil.js`, que los dos llaman al montarse:
- pone `body[data-editor-movil]`, la marca que usan las reglas globales de `EditorMovil.module.css`;
- mide el teclado y regresa `{ teclado, vvTop }`, y deja el alto en la variable CSS `--teclado-movil`.

### Teclado
- **Medida:** el alto del teclado se calcula contra `document.documentElement.clientHeight` (la vista donde viven las capas fijas), **no** `innerHeight`. En iOS, `innerHeight` cambia con el teclado y con el desplazamiento de la página, y la barra quedaba a media pantalla o tapada.
- **Lo que iOS pone encima del teclado:** la barra ^ v ✓ y la píldora "localhost". `visualViewport` ya las descuenta, así que la barra del editor queda justo arriba de ellas (medido en el iPhone 17 Pro con iOS 26).
- **`vvTop`:** cuánto subió iOS la página al abrir el teclado (`visualViewport.offsetTop`). Lo usa el zoom al escribir para saber dónde empieza lo visible.
- **Barra contextual:** con el teclado abierto sube encima de él (`bottom: teclado + 10`) con transición (`bottom` 0.32 s, curva de iOS).
- **Doble toque:** `.raiz` lleva `touch-action: manipulation`, así tocar dos veces un botón no acerca la página.

### Zoom al escribir (`Editor/useZoomTexto.js`)
Al tocar un texto para escribir:
- **Zoom in:** la pieza se acerca hasta tocar las orillas de la pantalla (`ancho / anchoPieza`). Si así el texto todavía se ve de menos de 16 px (`MIN_PX`), acerca más, hasta 3× (`ZOOM_MAX`).
- **Centrado:** el texto queda al centro de lo que se ve, entre el header (o `vvTop` + 12 si iOS subió la página) y la barra encima del teclado (`tam.h - teclado - 90`). De lado nunca deja huecos: la pieza siempre cubre el ancho.
- **Zoom out:** al soltar el texto (✓ del teclado, tocar fuera) la pieza regresa a su lugar.
- **Transición:** propia, rápida y fluida: `transform` 0.42 s con la curva de iOS. `useZoomAnimando` la mantiene puesta (`data-zoom-anim`) mientras hay zoom y `ZOOM_MS` (450 ms) después de quitarlo, así el zoom out también es suave.
- **Solo la invitación:** lo de alrededor no se acerca. La leyenda "Toca cualquier parte…" (dentro de la pieza en la invitación, `data-leyenda`) se oculta durante el zoom (`.pieza[data-zoom]`).
- **De dónde sale el texto:**
  - Pop: el texto es un `contentEditable` del mismo documento → `focusin` / `focusout`.
  - Invitación: el texto vive en el iframe de iattend-events → `HostClient.tsx` manda `REMOTE_TEXT_FOCUS` con `{ rect, fontSize }` (el mismo aviso que usa el iPad para no tapar el texto; null al soltar) → `ReactHost` lo pasa como evento `iattend-text-focus` (con `source`, para ignorar otros iframes).
- **Pieza:** `transform: translate(x, y) scale(e)`; `foco` = `{ cx, cy, font }` en px de la pieza sin escalar (`transformDeZoom` arma la escala y la posición).
- No aplica en modo dibujo.

### Tarjetas flotantes (popovers de las barras)
- **Qué cubre:** Estilo de la cuenta regresiva, Sombra, Velo, Desenfoque, transparencia, fuentes, Fondo (Color · Textura · Foto), grosor del trazo… En escritorio se anclan al botón; en el celular se salían de la pantalla.
- **Cómo se ven:** todo popover cuyo contenido lleva `data-text-bar` sale a lo ancho (12 px de margen), arriba de la barra y del teclado (`--teclado-movil`), con 32 px de redondeo, vidrio claro (blur 24 px), scroll propio (máximo 62 % del alto) y la misma entrada que los modales (`popEntra`).
- **Un solo borde:** `.ant-popover-inner` va sin fondo, borde, sombra ni redondeo propios (antes se veía un segundo recuadro adentro).
- **Hoja del pincel:** la de grosor / opacidad (`data-ajustes-pincel`) también sale flotante, arriba de la paleta de dibujo.
- **Un popover nuevo de una barra** solo necesita `data-text-bar` en su contenido (en escritorio eso además le da los 32 px de redondeo).

### Listas desplegables
Los `Select` de antd (estilo del separador, tipografía, "Del cuerpo"…) salen igual que las tarjetas flotantes: a lo ancho, arriba de la barra y del teclado, 32 px, vidrio claro, **sin velo**. Las opciones miden 52 px, van centradas y la lista tiene scroll propio (`body[data-editor-movil] .ant-select-dropdown`).

### Sin sliders
`LiveSlider` (`Invitation/Build/PageSections/barControls.jsx`) en ≤ 750 px pinta **cinco opciones ya hechas** del mínimo al máximo (riel gris, la elegida en blanco, 44 px), como los grosores del pincel. Ejemplo: Transparencia = 0 · 25 · 50 · 75 · 100. Aplica a todas las barras (transparencia, tamaño, giro, sombra, velo, radio…). En escritorio siguen los sliders.

### Barra del elemento (`ElementBar`, también en escritorio)
- **Voltear:** los dos espejos (horizontal / vertical) van directo en la barra, sin menú; se marcan cuando están activos.
- **Trazo + transparencia en una hoja** (vectores y formas): `TrazoYOpacidad`, cinco grosores con su garabato y la barra de opacidad del color (`Garabato` / `BarraOpacidad` de `Workspace/AjustesPincel.jsx`). Ya no hay botón de transparencia aparte; los demás elementos (PNG, íconos, textos) siguen con el suyo.
- Sus popovers llevan `data-text-bar`.

### Campos de texto en las barras
Los `input` de las barras (buscar canción, dirección…) miden en escritorio 300 px; en el celular `max-width: calc(100vw - 150px)` para que quepan con el ícono y el botón de al lado (`.barraFondo input`).

### Texturas (Fondo de un módulo)
- Las celdas guardan su 3:4 con padding (`height: 0; padding-bottom: 133.33%`) y no con `aspect-ratio`: en Safari, dentro de la cuadrícula con alto máximo y scroll, las filas se encogían y las texturas se encimaban. El arreglo aplica también en escritorio.
- En el celular, el panel Fondo va a lo ancho de la tarjeta y la cuadrícula muestra hasta el 40 % del alto.

---

## 9. Modales

Tarjeta blanca centrada de 32 px de redondeo sobre un velo oscuro.
- **Animación:** entra subiendo y creciendo un poco (`modalEntra`, 0.34 s) y sale con un fundido (`modalSale`, 0.2 s, `modalSaliendo`).
- **Cerrar:** con ✓ o tocando el velo.
- **Cuerpo:** con scroll propio y `overflow-anchor: none` (si no, se recorría solo al cargar las imágenes y cortaba el texto de arriba).

| Modal | Se abre con | Contenido |
|---|---|---|
| Imagen del link | Footer | `LinkPanel` |
| Pase digital | Footer | `WalletPanelPop` |
| Compartir | Header | `CompartirContenido` |
| Interacción | Tocar Asistentes | `InteractionPanel`: lista, avatares, chat, mensaje fijado, mensajes |
| Itinerario | Tocar Itinerario | `ItineraryPanel` |
| Formulario | Tocar el aviso del formulario | `FormularioPanel` |
| Elegir (Subidos) | El "+" de Fondo | `UploadsPanel` en modo elegir |

- **Asistentes, Itinerario y Formulario:** se abren desde la pieza (`ZONA_MODAL`).
- **Elegir foto dentro de un modal** ("Subir foto" del link, foto del pase): el mismo modal cambia su contenido por Subidos en modo elegir (`eligiendo`). Al elegir regresa al panel y ✓ regresa sin cambiar nada. Si se abrió desde una barra (`cierra: true`), al elegir se cierra.
- **Imagen del link:** el chat de WhatsApp va a lo ancho (en escritorio mide 272 px) con la burbuja a la derecha de máximo 250 px, como un mensaje propio.
- **Compartir:**
  - Mismo ancho que los demás modales.
  - La portada llena el ancho y se recorta a lo alto, centrada, para que todo quepa sin scroll (`alto`).
  - QR a la mitad del ancho (`qr`), con destello y halo que late (también en escritorio).
  - "Copiar link" y "Compartir" van lado a lado, de 48 px (`enFila`). "Compartir" abre la hoja del teléfono (`navigator.share`, `conHoja`).
- **Vista completa del formulario** (Editar / crear / Ver todas en tabla, `FormularioVista`): en 720 px o menos, su CSS la convierte en modal (inset con márgenes, 32 px, velo con sombra extendida).
  - Agregar pregunta y agregar sección flotan abajo en una píldora horizontal.
  - El pie de la pregunta pone "+ Texto de ayuda" en su renglón; abajo, duplicar · borrar | Obligatoria.
  - **Respuestas** es una tabla comprimida: columna Invitado de 128 px fija a la izquierda, filas y letra más chicas, scroll de lado.

---

## 10. Ver en vivo

- **Abrir:** el ojo del footer abre la página real del invitado a pantalla completa (`SideEventHost`, iframe de iattend-events) con los confirmados (`_asistentes`), el chat (`_chat`) y `_vistaConfirmada`.
- **Arriba:** ✕ (vidrio blanco) y el segmentado Sin confirmar / Confirmado, igual que en escritorio.
- **Animación:** entra subiendo (`vivoEntra`, 0.36 s) y sale bajando (`vivoSale`, 0.26 s).
- **Toque fantasma:** el iframe ignora el puntero los primeros 0.6 s (`vivoSinToque`). iOS mandaba el toque del ojo a la página y abría "¿Quién no podrá venir?" de "No asistiré".
- **Barras de Safari:** al abrir, `html`, `body`, `theme-color` y la raíz toman el color del tema (`colorVivo`) para teñirlas, y al cerrar regresan a blanco. **No funciona en el simulador de iOS 26**: Safari parece leer ese color solo al cargar la página. Pendiente de revisar en un iPhone real.

---

## 11. Selector de color (tarjeta flotante)

- Es la misma tarjeta para el pincel y para la barra (texto o elemento), y nunca un drawer.
- Va sobre la paleta o la barra, con 36 px de redondeo, vidrio claro (blur 24 px) y crece desde el botón de color (abajo a la derecha). Tocar fuera la cierra (`colorPop`: abierto / cerrando).
- **Contenido:** `ColoresIOS` sin colores guardados, con título y cuentagotas. El cuentagotas no aparece en el iPhone porque Safari no tiene `EyeDropper`; en Chrome de escritorio sí.
- **Pincel:** lleva la barra de opacidad (mínimo 10 %).

---

## 12. Autoguardado

Aplica también en escritorio: ya no hay botón Guardar en ningún lado.
- **Cuándo guarda:** `guardarAhora` guarda en silencio `AUTOGUARDADO_MS` (5 s) después del último cambio (debounce). Si se edita sin parar, guarda a lo más `AUTOGUARDADO_MAX_MS` (30 s) después del primer cambio sin guardar.
- **Cambios durante el guardado:** `versionRef` evita marcar como guardado algo que cambió mientras se guardaba.
- **⌘S / Ctrl+S:** guarda ya, con la imagen del link, y evita el "Guardar página" del navegador.
- **Imagen del link:** el autoguardado no la rehace (`conImagen: false`) ni muestra "Actualizando la imagen del link…". Se rehace cuando la portada lleva `IMAGEN_LINK_MS` (20 s) quieta con la firma vieja, al salir o con ⌘S.
- **Indicador** (`EstadoGuardado`):
  - "Guardando…" solo mientras de verdad guarda, no mientras espera.
  - "Guardado" se queda 2.5 s y se desvanece.
  - "No se guardó · Reintentar" se queda.
  - En el celular va debajo del header; en web, como aviso flotante arriba al centro (`flotante`), sin lugar reservado en el header.

---

## 13. Pestaña Invitados

`InvitadosMovil` es una hoja blanca pegada al header (el estado del guardado, cuando sale, va encima):
- **Encabezado:** "Invitados N", los envíos del Pop (`CreditController variante="envios"`) y "•••" (descargar Excel con `descargarTablaCompacta`, recargar con `refrescarTabla`).
- **Buscador:** por nombre o teléfono.
- **Chips por estado con su cuenta:** Todos · Confirmados · Esperando · Por invitar · No asistirán.
- **Lista:**
  - Titular con su inicial en lila, "+N acompañante(s) · código" y su estado en color.
  - Sus acompañantes debajo, sangrados, con "con <primer nombre>".
  - Si un acompañante pasa el filtro, trae a su titular.
- **Tocar a alguien:** abre el cajón de edición de escritorio (`GuestsCRUD`, ya sin modo oscuro en el editor nuevo).
- **"+ Agregar":** botón flotante que abre el alta de un invitado.
- **Pendiente:** el cajón de edición enseña "null" en el teléfono de invitados registrados por el link público (es de `GuestsCRUD`).

---

## 14. Link público del evento

Desde esta etapa, el link es `iattend.events/side-event/<código>` (`side_events.public_code`, al azar), no el número. Todo link se arma con `helpers/invitation/sideEventLink.js`. Ver la nota en `CLAUDE.md` y la migración `iattend--backend/migrations/2026-11-01b_side_events_public_code.sql`.

---

## 15. Constantes y curvas

| Constante | Valor | Para qué |
|---|---|---|
| `CARD` | 357 × 631 | Tamaño de la pieza |
| `ALTO_HEADER` / `ALTO_ESTADO` / `ALTO_FOOTER` | 56 / 24 / 64 | Aire alrededor de la pieza |
| `PANELES` | design 0.5, elements / photos / uploads 1 | Alto de cada drawer |
| `DRAWER_MS` / `CERRAR_MS` | 520 / 420 | Abrir / cerrar drawer |
| `CURVA_HOJA` | `cubic-bezier(0.32, 0.72, 0, 1)` | Curva de las hojas de iOS (drawers, pieza, footer, paleta) |
| `MODAL_SALE_MS` | 200 | Salida de modales |
| `BARRA_SALE_MS` | 240 | Salida de la barra contextual |
| `ALTO_PALETA` | 96 | Paleta de dibujo |
| `AIRE_COMPARTIR` | lados 64, alto 250 | Tamaño de la portada en Compartir |
| `AUTOGUARDADO_MS` / `AUTOGUARDADO_MAX_MS` / `IMAGEN_LINK_MS` | 5 s / 30 s / 20 s | Autoguardado |
| `MIN_PX` / `ZOOM_MAX` | 16 px / 3× | Zoom al escribir (`useZoomTexto.js`) |
| Transición del zoom / `ZOOM_MS` | 0.42 s / 450 ms | Zoom in / out al escribir |
| Transición de la barra con el teclado | 0.32 s | `bottom` de `.barraFondo` |

Con "reducir movimiento" (`reducirMovimiento()` de `Editor/inmersivo.js` y `prefers-reduced-motion` en CSS) ninguna de estas transiciones se anima.

---

## 16. Lo que falta

- **Herramientas del footer sin panel en el celular:** no hay. Diseño, Elementos, Fotos y Subidos van en drawer, Dibujar en su modo propio, e Imagen del link y Pase digital en modal.
- **Capas:** no existen en el celular (reordenar, ocultar, agrupar).
- **Reordenar con el dedo:** no funciona para las miniaturas del fondo ni para las tarjetas de la página.
- **Ajustar foto:** falta zoom con dos dedos y una barra más corta.
- **Barras de Safari en Ver en vivo:** pendiente en un iPhone real.
- **Editor viejo:** quitar el editor "story" de `SideEvents.jsx` cuando el nuevo esté completo.
