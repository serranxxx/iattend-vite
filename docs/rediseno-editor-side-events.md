# Rediseño del editor de Side Events

Documenta el port del shell del editor del **Save the Date** a `/dashboard/side`
(`src/modules/SideEvents/SideEvents.jsx`), en la rama `site-guests-design`.

Complementa a [`rediseno-side-events.md`](./rediseno-side-events.md), que documenta el port del
rediseño de la **lista de invitados** (las clases `gx-*`). Esa lógica no se tocó: lo que cambió
es la interfaz que la contiene.

Referencia del editor original: [`save-the-date.md`](./save-the-date.md).

## Por qué

Los dos módulos hacen lo mismo —editar una pieza y administrar a quién se le manda— pero el
editor de side events era de una generación anterior: los controles vivían incrustados dentro de
la propia tarjeta de la pieza, el preview **reemplazaba** al editor, el alto era `88vh` fijo con
`scale(0.8)` hardcodeado, no había estado sucio ni aviso al salir, y en móvil había un carrusel
de dos paneles con flechas flotantes. Además el lienzo de edición **no se parecía** a la pieza
pública.

## Los dos modos

| Modo | Qué es |
|---|---|
| **Diseño** | Espejo del modo edición del Save the Date: tablero con retícula, pieza auto-escalada al centro, riel de elementos + panel a la izquierda, toggle "Ver en vivo" en el mismo escenario |
| **Envío** | Espejo del modo Respuestas del STD, pero la columna trae las tarjetas de invitados que ya existían. Entrar a Envío **prende "ver en vivo"** (la pieza ya no se edita, se mira publicada) y volver a Diseño lo apaga. Como la pieza pasa a escalar solo por alto, la lista se queda con **todo el ancho que sobra** (`vw - pieza - 40`), no con un ancho fijo |

## Archivos

| Archivo | Qué es |
|---|---|
| `SideCanvas.jsx` + `.module.css` | Lienzo editable, espejo de `StdCanvas` |
| `SideEventEditor.module.css` | Shell del editor: tablero, barra, riel, paneles, diálogos, editor móvil |
| `SideEventsList.module.css` | Listado master-detail (riel + portada y números) |
| `SideEventsTour.jsx` | Tour guiado de los dos modos |
| `SideEvents.jsx` | El render completo (listado y editor) + el estado de los dos |
| `side-events.css` | Quedó solo con el dropdown de copiar lista y el autocomplete |
| `components/Host/SideEventHost.jsx` | Paridad con `SaveTheDateHost` |

El render se partió en tres: `if (current && isMobile)`, `if (current)` y el listado. Lo que se
necesita en las dos vistas (`GuestsCRUD`, la isla de progreso del envío masivo, el modal de
créditos y el diálogo de cambios sin guardar) vive en un fragmento `globals` que se renderiza en
ambas ramas. El editor **ya no pasa por** `HeaderDashboard` / `FooterApp` / `UpgradeBanner`.

## El lienzo calca la pieza pública

`SideCanvas` replica `iattend-events/src/components/SideEvent/SideEvent.tsx` +
`side-event.module.css`, no la vieja tarjeta de vidrio:

- Hero con `backdrop-filter: blur(6px)` enmascarado (`transparent 0% → transparent 40% → black 80%`)
  y la sombra multiplicada.
- Columna de info con `linear-gradient(to bottom, transparent, var(--blur-color))`, donde
  `--blur-color` es `body.color` y `--blur-color--dark` es `` `${darker(body.color, 0.8)}80` ``,
  igual que el remoto (`darker` sale de `helpers/assets/functions.js`).
- Tarjetas `radius 24`, tinte oscuro, `blur(10px)`, `1px solid #FFFFFF40`, `max-width: 450px`.
- Notas con `white-space: pre-line` y `mix-blend-mode: soft-light`.

Zonas seleccionables: `background`, `color`, `title`, `date`, `place`, `extras`. El título y las
notas se escriben **directo en el lienzo**, en un `contentEditable` (ver los detalles más abajo:
con inputs de antd no funcionaba en móvil).

El fondo y el color del tema no se pueden tocar en la pieza (uno es la imagen de atrás, el otro
tiñe todas las tarjetas), así que cada uno tiene su **chip arriba de la tarjeta** — fondo a la
izquierda, color a la derecha, misma receta que el chip de canción del Save the Date. El chip del
color muestra el tinte actual.

En vez del hero `sticky` + `margin-top: -50vh` del remoto (que depende de `vh` y se rompe dentro
de un lienzo escalado), el hero es una capa absoluta detrás del scroller y la columna arranca con
un hueco transparente de `45%` — mismo efecto, medidas relativas al marco.

**Lo que se maqueta en vez de replicarse:** los botones de RSVP (aquí no hay invitado), el mapa
(un iframe de Google dentro de un lienzo escalado pesa y se come los clics de selección) y el
clima (no se llama a OpenWeather desde el editor).

## Los seis paneles

Fondo (imagen) · Color del tema (picker + tintes sugeridos) · Título (tipografía) · Fecha y hora ·
Lugar (nombre + dirección + **clima**) · Notas. Todos los controles ya existían: solo se movieron
de los `Dropdown` / `Drawer` flotantes al riel.

El clima vive en **Lugar** y no en Fondo porque es lo que lo condiciona: el remoto solo lo pinta
cuando la dirección tiene ciudad. Su tarjeta en el lienzo también selecciona `place`.

En móvil los mismos paneles entran en `BottomSheet`, que reporta su alto (`liftBottom`) para que
el lienzo gane espacio abajo y traiga a la vista la zona que se está editando.

## Tour guiado

`SideEventsTour.jsx` — mismo patrón que [`GuestsTour`](../src/modules/GuestManagement/GuestsTour.jsx)
y `BuildTour`: anclajes `data-tour` resueltos al momento (funciones, no al montar), bloques con
"Saltar a…", contador en vez de puntitos y `disabledInteraction`.

19 pasos en dos bloques: **Diseño** (la pieza, los dos chips, las cinco herramientas del riel, ver
en vivo, el link y Guardar) y **Envío** (la columna, la escalera, la fecha límite, buscador,
filtros, Agregar y las tarjetas).

- Se abre solo la primera vez que se entra a un side event (`iattend_side_tour_v1`) y se relanza
  desde el `?` de la barra superior o el de la escalera de pasos. Los dos llevan el mismo
  `data-tour="tour-replay"`; en escritorio gana el de la barra por orden en el DOM, y en móvil
  —donde la barra no tiene `?` para no romper el header— gana el de la escalera.
- `applyStep` cambia modo, paso de la lista y panel **en el mismo commit** que el paso, así el
  anclaje ya está montado cuando el Tour lo resuelve.
- **El tour apaga "ver en vivo"** (`openTour`): con el device montado no habría zonas que
  señalar, y además el preview remoto hoy no pinta.
- **En móvil no abre los paneles**: la hoja inferior taparía el dock, que es justo lo que el paso
  está señalando. Los pasos de herramientas se anclan al botón del dock y ya.
- **Panel más angosto** (`rootClassName="se-tour"`, 360px en `styles/antd.css`): el default de
  ~508px no cabe a ningún costado de la pieza centrada y antd lo recortaba contra el borde.
- **La columna de Envío entra sin animación mientras el tour está abierto** (`.noAnim`): antd mide
  el objetivo en el mismo commit, y con el ancho y el `translateX` todavía animando el hueco de la
  máscara quedaba desfasado —y no se vuelve a calcular.

## Se fue el `Tabs` de antd

La lista por estado se dibuja como en el STD: un solo bloque que se recalcula en cada render
(`renderStepBar` + `renderTabToolbar` + `renderSortBar` + `renderCardList` sobre `activeKey`).

Eso **elimina de raíz** la clase de bug documentada en
[`rediseno-side-events.md`](./rediseno-side-events.md#dos-bugs-que-salieron-de-aquí): el `useMemo`
de `items` con lista de dependencias a mano, que congelaba el buscador, los filtros y el
`DatePicker` de fecha límite. Ya no hay memo que mantener.

## Guardado

Todo cambio del diseño pasa por `updateCurrent(updater)`, que marca `dirty`. Con eso: punto rojo
sobre *Guardar*, diálogo propio de cambios sin guardar (Descartar / Quedarme / Guardar y salir,
montado durante la salida para que se vea la transición) y `beforeunload`.

`setCurrent` a secas se sigue usando donde el cambio **ya se persistió** —
`onSaveRsvpDeadline` y `updateURLimage`—, para que no marquen sucio.

`saveSideEvent` devuelve booleano y refresca la tarjeta del listado sin recargar. Sigue derivando
`timezone` con `getTimezoneForState` y conservando `url_image ?? body.image`.

## Detalles que cuestan tiempo si se olvidan

- **`box-sizing: border-box` en `.block`.** El ancho de la columna de Envío lo fija el JS; sin
  border-box el padding de 40px se sumaba y el hueco (`overflow: hidden`) recortaba el botón
  *Agregar*.
- **El `DatePicker` solo refleja horas de pared.** `wallClockToDayjs` devuelve `null` para los
  eventos legados (instantes UTC reales); en ese caso el panel muestra la fecha formateada como
  texto debajo. Nunca se convierte con timezone — ver `helpers/assets/eventDateTime.js`.
- **Descartar tiene que cerrar el diálogo.** En el STD *Descartar* navega fuera y desmonta la
  página; aquí el editor y el listado son el mismo componente, así que hay que llamar
  `closeLeave()` además de `closeEditor()`.
- **El título y las notas son `contentEditable`, no inputs de antd.** Dos razones, las dos de
  móvil: `styles/index.css` fuerza `font-size: 16px !important` a todo `input`/`textarea` bajo
  750px (el anti-zoom de iOS) y se comía el tamaño real del título —42px salían como 16—; y el
  `autoSize` del `TextArea` mide el alto **antes** de que cargue la tipografía del evento, así que
  el título quedaba en una línea y se cortaba. Un div crece solo y ninguna de las dos cosas lo
  toca. Los valores iniciales se congelan y el lienzo se monta con `key={current.id}` para que el
  caret no salte, igual que en `StdCanvas`.
- **Con la hoja abierta, la zona elegida se centra en la banda visible**, no se empuja el contenido
  hacia arriba. El empujón a ciegas sacaba el título por arriba de la pantalla. `scrollIntoView`
  tampoco sirve: centra en el escenario completo y la mitad de abajo la tapa la hoja. El lienzo
  gana `padding-bottom` para tener a dónde desplazarse, y **al cerrar la hoja vuelve a donde
  estaba**: el punto de partida se guarda la primera vez y cambiar de una zona a otra no lo pisa.
- **El scroll se anima con la curva y la duración de la hoja** (`0.28s`,
  `cubic-bezier(0.32, 0.72, 0, 1)`, resuelta por Newton en el propio componente) para que los dos
  se sientan un solo gesto. `scrollTo({behavior:'smooth'})` no sirve: su tiempo lo decide el
  navegador y se desincroniza. Con `prefers-reduced-motion` el salto es directo.
- **El espacio de abajo se sostiene hasta que termina el scroll de vuelta.** Si se quitara en el
  mismo commit en que se cierra la hoja, el navegador recorta el scroll al nuevo tope y la mitad
  del recorrido se ve como un salto seco en vez de animarse.
- **En el lienzo a pantalla completa las zonas se marcan siempre** (contorno punteado tenue): sin
  hover que las delate, la pieza se ve idéntica a la publicada y no hay forma de saber que se
  puede tocar.
- **`isMobile` corta en 720px** (`matchMedia`), no en los 576px de `screens.xs` de antd. El
  listado sigue usando `screens`.
- **El typo `sideEventCondif`** del payload del host es el contrato con
  `iattend-events/src/app/side-event-host/page.tsx`. Renombrarlo requiere cambiar los dos repos.
- **Los estilos de panel están duplicados** a propósito entre `SaveTheDatePage.module.css` y
  `SideEventEditor.module.css`, para no tocar el editor del Save the Date en este cambio. Con un
  tercer editor conviene extraerlos.

## Envío en móvil

La columna de Envío en 375px arrastraba cuatro cosas. Los arreglos de los banners y de las
tarjetas viven en el bloque `@media (max-width: 750px)` de
[`guests-redesign.css`](../src/modules/GuestManagement/guests-redesign.css), que es **compartido
con `/dashboard/guests`**: esa página cambió igual.

- **Los banners se comían medio alto útil.** `.gx-hero` y `.gx-alert` bajan a `padding: 12px 14px`,
  radio 14 y títulos de 14.5px. El hero quedó en 97px (venía de ~160) y la alerta de fecha límite
  en 147px (venía de 171). En la alerta, la campana va **en el renglón del título** y el botón se
  lleva un renglón completo (`.gx-deadline-anchor { flex: 1 1 100% }`). El
  `.gx-alert-texts` necesita `flex: 1 1 0%` y no `auto`: con `auto` el ancho base es el del título
  completo, no cabe junto a la insignia y se va solo a su renglón.
- **Las acciones del hero se ocultan en móvil** (`.gx-hero .gx-btn { display: none }`): ya viven en
  el toolbar y en cada tarjeta.
- **La tarjeta de invitado se fue a tres renglones.** El corte se marca en el bloque de etiquetas,
  no en la identidad: si se corta en la identidad, el avatar se queda solo arriba. Con
  `.gx-chips-col` en fila (`flex-direction: row`) las etiquetas suben al renglón del nombre y lo
  que baja son las acciones. Además el texto de *Copiar link* (~75px) empujaba el chevron a un
  tercer renglón él solo, así que en la tarjeta la píldora se queda en icono
  (`.gx-card .gx-pill span { display: none }`). La tarjeta quedó en 122px en side events y 140px en
  invitados (venía de 168).
- **El teléfono se partía en dos líneas** ("+52 (614)" / "211-2087"). No se trunca la sub-línea: se
  le da `flex-wrap: wrap` con `white-space: nowrap` en cada hijo, así el número nunca se rompe y lo
  que baja a su propio renglón es el código de acceso. En side events (identidad de ~259px) los dos
  caben en una línea; en invitados, donde las etiquetas dejan ~160px, el código baja.
- **El popup de *Copiar de otra lista* se salía de la pantalla.** Varias causas encadenadas: el
  ancho fijo (ahora `calc(100vw - 24px)`), el `maxHeight: 480px` **inline** del scroller interno,
  que sobresalía 55px por debajo de la tarjeta blanca (ahora `flex: 1; minHeight: 0`, que es lo que
  corresponde dentro de una columna flex de alto fijo), y los nombres, que aun truncados por JS se
  partían en dos renglones (`white-space: nowrap` + elipsis). También lleva
  `rootClassName='side_guest_list_pop'` con `z-index: 1080`: el menú de *+ Agregar* y este popup
  comparten el 1050 de antd y los dos cuelgan de `<body>`.
- **El alto y la colocación del popup.** Su disparador vive **dentro** del menú de *+ Agregar*, que
  puede quedar a media pantalla: con `70vh` no cabía ni arriba ni abajo, y antd —que por defecto
  solo **voltea**— lo recortaba contra el borde. Se arregla por los dos lados: alto corto
  (`min(52vh, 420px)`, `min(54vh, 420px)` en móvil) y `align={{ overflow: { adjustX, adjustY,
  shiftX, shiftY } }}`, que hace que antd lo **deslice** para dejarlo dentro en vez de voltearlo.

## En móvil, los paneles no usan popups de antd

`Select`, `ColorPicker` y `DatePicker` se portalean a `<body>` y flotan anclados a su trigger. Dentro
de la hoja inferior eso no funciona: el popup se posiciona una vez y la hoja se mueve, se abre donde
puede en 400px (el `DatePicker` con hora mide 401px y quedaba mordido), y el scroll de su lista pelea
con el de la pieza. Primero se intentó subirles el `z-index` por encima de la hoja (1200 → 1300): los
hacía visibles, pero seguían siendo inoperables con el dedo.

La solución es no usarlos ahí. Bajo `isMobile` los paneles montan los campos de
[`components/MobileFields`](../src/components/MobileFields/MobileFields.jsx); en escritorio siguen
con antd, que ahí va bien.

- **`FontPicker`** — las tipografías en un **carrusel horizontal** de chips, cada uno en su propia
  fuente, la elegida centrada (de golpe al montar, suave al cambiar). Horizontal a propósito: la
  primera versión era una lista vertical con scroll dentro de la hoja —que también hace scroll— y el
  dedo sobre la lista movía la lista en vez de la hoja. El eje X no compite con el Y. Mide 58px en
  vez de 238, y el centrado es a mano con `scrollTo`, no con `scrollIntoView`, que desplazaría
  también la hoja entera.
- **`ColorField`** — una muestra que abre el **selector nativo** del teléfono (`<input type=color>`
  invisible encima). El nativo solo entiende `#rrggbb`: con `alpha` agrega un deslizador de opacidad
  y devuelve `rgba(...)` — es el caso del botón del Save the Date, que es translúcido a propósito.
- **`DateField`** — `<input type=date>` o `datetime-local` nativos. `datetime-local` entrega
  `YYYY-MM-DDTHH:mm` **sin zona horaria**: es exactamente la hora de pared que guardan los side
  events, así que la única transformación es cambiar la `T` por un espacio. Cero conversión de
  timezone posible.
- Los inputs nativos van a **16px**: por debajo, iOS hace zoom al enfocar.

## El picker de imágenes es el mismo de toda la app

`StorageImages` lo comparten el builder, los side events, el Save the Date y los links. Por eso su
header se arregló una sola vez y para todos: **sin icono, "Almacenamiento" y "Subir"** —el anterior
("Almacenamiento de archivos" / "Subir imagen") partía en dos líneas y recortaba el botón en 400px.
Las tres claves de título y las dos del CTA se colapsaron en `storage.title` y `storage.btn_upload`;
lo que distingue el tipo es la pestaña ("Mis imágenes" / "Mis videos"). Side events solo usa
imágenes, así que el arreglo de los tiles de video en iOS (ver `save-the-date.md`) no le aplica.

Ojo al borrar claves de i18n por nombre: `drawer_title` existía también en `new_inv` y un borrado
por nombre se la llevó. Hay que acotar por namespace.

## Las fuentes salen del laboratorio

El picker de tipografía lee `useFonts()` (tabla `fonts`, `active = true`), no la lista estática de
`helpers/assets/fonts.js`, que queda solo como respaldo mientras carga. Así lo que se instala o se
quita desde `/admin → Herramientas → Fuentes` se refleja en el editor. Mismo patrón que el builder.

## Los tours son solo de escritorio

Los cinco tours (`SideEventsTour`, `GuestsTour`, `TablesTour`, `SaveTheDateTour` y `BuildTour`) se
apagan bajo 750px. En móvil la máscara de antd mide anclajes que viven dentro de carruseles, drawers y hojas
inferiores —y no los vuelve a calcular—, así que el hueco quedaba desfasado o directamente fuera de
pantalla, y los bloques de texto tapaban lo que estaban señalando.

El patrón es el mismo en los cinco archivos: un `const tourAvailable = !isMobile` que (1) hace
`return` temprano en `openTour`, (2) corta el efecto de auto-apertura —con `tourAvailable` en las
dependencias, para que rotar el teléfono no lo dispare—, (3) oculta el botón `?` de relanzarlo y
(4) entra en el `open` del componente (`open={tourOpen && tourAvailable}`) como red de seguridad si
la ventana se encoge con el tour abierto.

`BuildPage` es el único que no tenía un `isMobile` propio, así que lleva su `matchMedia` con
listener; el `?` del editor de la invitación se apaga pasando `onReplayTour={undefined}`, que es la
condición con la que `BuildContent` ya decidía pintarlo. El filtro `desktopOnly` por paso que traen
`BuildTour` y `TablesTour` se queda: ahora es código muerto en móvil, pero es lo que resuelve el
tramo de 576–750px si algún día se vuelve a habilitar.

## Código eliminado

`SideEvents.jsx`: el `useMemo` de `items`, `mobilePanel` con su track de `width: 200%` y las dos
flechas flotantes, `colorDrawerOpen` / `fontDrawerOpen` con sus `Drawer`, los desplegables inline
`addressOpen` / `datePickerOpen` y la barra de botones flotantes sobre la pieza.

`side-events.css`: `.side_invitation_cont` (que traía `max-width: 345px` y `min-width: 370px`
contradictorios), `.side_table_cont`, `.side-tabs*`, `.side_info_cont`, `.side_date_time`,
`.date_inline_cont`, `.address_inline_form`, `.preview_button_sidee`, `.save_button_sidee`,
`.side_title_input`, `.side_place_input`, `.date_pciker_sidee`, `.add_image_cont`, `.sidee_input`
y compañía — más un `.ant-picker-dropdown { transform: scale(0.8) }` **global** que este archivo
le imponía a toda la app por debajo de 750px.

## El preview en vivo no pinta (pendiente, no es de este repo)

Con "ver en vivo" el iframe del remoto carga pero se queda en el estado **sin datos** (hero vacío
y el pie `iattend.mx`). Lo que quedó comprobado:

- El remoto funciona: posteándole el **mismo objeto** `current` a mano desde la consola
  (`iframe.contentWindow.postMessage({type:'HOST_PROPS', payload:{sideEventCondif: cfg}}, 'https://www.iattend.events')`)
  la pieza se dibuja completa y contesta con `REMOTE_HEIGHT`.
- El host sí postea: mismo `contentWindow`, mismo origen exacto (`ev.origin` del `REMOTE_READY`
  que manda el remoto es `https://www.iattend.events`), payload válido de ~1 KB, ya cross-origin.
  Aun así el remoto no acusa recibo.
- Pasa **igual en el Save the Date** (`SaveTheDateHost`, sin tocar), así que no lo introdujo este
  rediseño.
- No es el clima ni la fecha fuera de la ventana del pronóstico: con esos datos, posteado a mano,
  la pieza se dibuja.

Queda por descartar del lado de `iattend-events` (`src/app/side-event-host/page.tsx`). Mientras
no se resuelva, el modo Envío muestra el teléfono vacío — si molesta, la alternativa de una línea
es dejar el `SideCanvas` en modo lectura en vez del device.

## El listado también se rediseñó

`SideEventsList.module.css` — master-detail, a partir del mockup de Alberto: riel a la izquierda
(título, "N de M usados", la lista, *Nuevo side event* y la tarjeta de compra) y a la derecha la
portada del seleccionado con sus tres números y *Abrir evento*.

- **Tocar un elemento del riel selecciona; abrir es el botón del detalle.** En móvil el layout se
  apila y `selectSideEvent` sube el detalle a la vista (`scrollIntoView`).
- **El riel es una superficie propia** (`#F5F3F2`, radio 24) y el detalle va sobre el blanco de la
  página, como en el mockup.
- **La vista llena lo que hay** (`max-width: 1560px`, `min-height: calc(100vh - 150px)`): con el
  tope de 1180 quedaban ~245px muertos a cada lado en 1440. La portada es `flex: 1`, así que se
  lleva el alto que sobra y queda casi cuadrada en vez de una franja de 240px.
- **El CTA *Abrir evento* va sobre la portada**, no junto a los números: la esquina inferior
  derecha de la pantalla la ocupa el orbe de Lia (`position: fixed`, z-index 1200) y se lo comía.
  Abajo de 560px la barra de la portada se apila y el botón va a lo ancho.
- **El tope del plan sale de un solo lugar** (`planCap`: pro 3, lite 1, resto 0), la misma regla
  que ya decidía si se podía crear. Así el texto del riel no puede contradecir al botón. Al tope,
  *Nuevo side event* queda en `aria-disabled` con Tooltip y la tarjeta de compra sigue ahí.
- **Los tres números vienen de un solo query** (`getGuestCounts`): `side_events_guests` filtrado
  con `.in(...)` por los ids del listado, agrupado en el cliente. `rawData` no servía porque solo
  trae los invitados del side event abierto. Se refresca con la subscripción de realtime que ya
  existía, leyendo los ids de `sideEventIdsRef` para no meter la lista en las dependencias.
- **Fecha corta en el riel** (`shortDate`): la línea completa no cabía en 320px y se cortaba justo
  en el conteo. Reusa `wallClockToDayjs`, que devuelve `null` para los eventos legados (instantes
  UTC) — esos caen al `formatEventDateTime` de siempre. Cero conversión de timezone.
- **La tarjeta de compra conserva el look de la anterior** (`.se-new-card`): azul `--mid-blue-500`
  con dos marcos verdes anidados (`::before` / `::after`), círculo lila con borde punteado y la
  tipografía Windsor. Solo cambian las medidas. El contenido lleva `padding: 28px 30px 26px` a
  propósito: tiene que caber **dentro** del marco interior (18px del borde) o el botón se le
  encima. El *Comprar* es un `<button>` propio y no un `Button` de antd: los estilos de antd se
  inyectan en runtime después de la hoja y le ganaban al lila.

## El listado en móvil es otra pantalla, no la de escritorio comprimida

El maestro-detalle no se traduce a una columna: apilado, la lista quedaba arriba y el detalle del
seleccionado había que irlo a buscar con scroll, y la tarjeta azul de compra —~230px de alto— era
el elemento más grande de la pantalla. Bajo 720px (`isMobile`) se renderiza otro árbol,
`sideEventsListMobile`, con las clases `m*` de `SideEventsList.module.css`:

- **Destacado con el próximo evento**: portada de 178px que funde con el cuerpo azul
  (`--mid-blue-500`), antetítulo *PRÓXIMO · EN N DÍAS*, fecha y lugar, barra segmentada de
  confirmaciones y el pie con el conteo y *Abrir*. La portada no es cuadrada a propósito: con una
  portada alta, la barra y el CTA se caían de la primera pantalla.
- **El destacado es el próximo con fecha**; si ya pasaron todos, el más reciente; y si solo hay
  borradores, el primero de la lista. El antetítulo desaparece si la fecha ya pasó en vez de
  mentir.
- **Filas compactas** para el resto: miniatura, nombre, fecha y conteo. Tocar una fila **la sube al
  destacado**, igual que el riel de escritorio; abrir es siempre el botón. El destacado es el
  seleccionado (`selectedId`), que en móvil arranca en el próximo en vez de en el primero de la
  tabla, y el antetítulo dice *PRÓXIMO* solo cuando el destacado de verdad lo es — el resto se queda
  con los días que faltan.
- **Borrador** = le falta fecha o nombre, lo único que de verdad impide mandar la pieza.
  `side_events` no tiene columna de estado ni de publicado, así que se deriva (`isDraft`). Esas
  filas cambian el conteo por *Terminar invitación →* y llevan la etiqueta.
- **La compra es una franja, no la tarjeta azul.** Es la única cosa del mockup que contradice el
  "no lo hagas tan plano" del riel de escritorio: ahí la tarjeta con sus dos marcos verdes se
  queda tal cual; en móvil, apretada entre la lista y el botón de crear, se comía la pantalla.
- **El botón de crear es sólido y lila** (`--light-purple-500`) y no la zona punteada del riel: en
  esta pantalla es la acción principal. El tope del plan sigue avisándose con `aria-disabled` +
  Tooltip, no con `disabled`.
- **Los eventos legados** (instantes UTC reales) caen al `formatEventDateTime` de siempre, que es
  el único que sabe reconvertirlos con el huso del venue. Para ordenar y contar días se usa
  `eventAt`, que acepta los dos formatos. Cero conversión de timezone en las fechas de pared.
- **La barra segmentada deja la pista vacía sin invitados**, en vez de pintar un cero.
- El contador de pases se queda en el header (`HeaderDashboard`), no se duplica en el subtítulo:
  el mockup lo movía, pero el header es código compartido con todo el dashboard.

## Morph de la portada entre el listado y el editor

El listado y el editor son dos ramas del mismo componente, así que la continuidad se hace con un
**FLIP**: un fantasma en `position: fixed` que vuela del rect de origen al de destino.

- `startMorph('in' | 'out')` mide el rect de origen **antes** de cambiar de rama
  (`[data-morph="cover"]` en el listado, `[data-morph="stage"]` en el editor: el `.scaler` en
  escritorio —lienzo o device— y el `.mobileStage` en móvil).
- En el listado móvil hay varias portadas candidatas, así que `startMorph` acepta un selector de
  origen y `openFromList` le pasa `[data-morph-id="<id>"]`: el ancla se mide en el mismo tick, y
  `setSelectedId` todavía no se refleja en el DOM. Ese `setSelectedId` sí decide cuál lleva
  `data-morph="cover"` para el **regreso**, que se mide un frame después — sin eso el fantasma
  aterrizaba siempre en el destacado, aunque se hubiera abierto una fila.
- **`data-morph-id` tiene que estar también en la portada de escritorio.** `openFromList` mide por
  id siempre, y `startMorph` hace `return` si no encuentra el origen: sin el atributo ahí, el
  listado de escritorio abría el editor de golpe, sin animación.
- El fantasma se renderiza dentro de `globals`, que vive en las dos ramas, y arranca con los
  estilos del origen. Un `useLayoutEffect` mide el destino en el siguiente frame —ya está montado,
  porque el `setMorph` y el cambio de rama van en el mismo commit— y lo anima con la Web
  Animations API (`left/top/width/height/border-radius`, 520ms).
- Mientras vuela, el destino se queda en `opacity: 0` con `data-morphing`. **Ese atributo también
  apaga la animación** (`animation: none`): el `.scaler` trae su propio `stageIn` (opacity 0→1) y
  las animaciones le ganan a una regla normal, así que el lienzo se transparentaba a medias y se
  veía duplicado.
- Con `prefers-reduced-motion: reduce` no se arma el fantasma y el cambio es instantáneo.
- Las tres salidas del editor (volver sin cambios, *Descartar* y *Guardar y salir*) pasan por
  `closeToList`, así que todas regresan con la animación.

De `side-events.css` se fue todo el listado viejo (`.side_events_container`, `.side_event_item`,
`.se-new-card`, `.side_events_spin` y el duplicado de `.blur-cover`, que ya vivía en
`styles/modules/cover.css` para `Cover.jsx`). El archivo quedó solo con el dropdown de copiar
lista y el estilo por defecto del autocomplete.

## Fuera de alcance

Sin cambios en Supabase: ni esquema, ni campos nuevos, ni migraciones.
