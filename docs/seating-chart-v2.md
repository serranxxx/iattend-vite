# Seating chart v2

Upgrade del drawer "Organización por mesas" (`/dashboard/guests?id=<invitation_id>` →
botón *Ver acomodo*). Este documento cubre **lo que ya está implementado** y los
hallazgos que cambian decisiones del spec original.

Wireframes: Figma `PR32NXv4mLckBcSAt3hfV4`, página **Seating chart**.

---

## Estado actual

| Fase | Alcance | Estado |
|---|---|---|
| 0 | Filtro de estado `asistente` | ✅ hecho |
| 0 | Inversión de la convención de color de sillas | ✅ hecho |
| 0 | `tables.locked`, `layout_elements`, trigger, FK | ✅ migración corrida |
| 1 | Vista "Lista de mesas" con tira de asientos | ✅ hecho |
| 1 | Transferencia entre mesas (selector de destino) | ✅ hecho |
| 1 | Rediseño de la lista de invitados (§5.5) | ✅ hecho |
| 2 | Franja de avance y capacidad sobrante (§5.2) | ✅ hecho |
| 2 | Onboarding y generador de layout (§5.1, §4.3) | ✅ hecho |
| 3 | `[+ Agregar ▾]`, elementos del salón, snap | ✅ hecho |
| 3 | Widget de Seguimiento (§5.6) | ✅ hecho |
| 3 | RPC de asignación en lote, motor de sugerencias | ⬜ pendiente |
| 4 | Árbol móvil propio (§5.7) | ⬜ pendiente |

La migración (`supabase-seating-chart-v2-migration.sql`, raíz del repo) **ya se corrió**:
`tables.locked` y `layout_elements` existen y se verificó que la anon key puede leer y
escribir en la tabla nueva (el GRANT quedó bien).

---

## Hallazgos que cambian el plan

### No existe un "módulo de Mensajes" con tabla propia

El spec §3.3 asumía que el aviso de "X canceló, su lugar en la Mesa #3 quedó libre"
se insertaría en la tabla del módulo de Mensajes. **Esa tabla no existe.** Lo que hay
son tres sistemas distintos:

1. **Inbox de WhatsApp** — `whatsapp_incoming_messages` + `whatsapp_freetext_dispatches`,
   unificadas por la RPC `get_conversations_by_invitation`. Solo el backend escribe
   (patrón documentado en `iattend--backend/migrations/2026-08-19_create_invitation_reminder_dispatches.sql`).
2. **Centro de notificaciones del organizador** — `NotificationCard.jsx`. **No lee
   ninguna tabla de mensajes**: lee filas de `guests` ordenadas por `last_update_date`
   y deriva el texto de `state` / `last_action` / `last_action_by`. No hay campo de
   texto libre ni tipo de notificación.
3. **Toasts de Lia** — `LiaContext.notify()`, en memoria, sin persistencia.

**Consecuencia:** el trigger de liberación no tiene dónde insertar un aviso, y tampoco
lo necesita. Como la tarjeta se deriva de la propia fila de `guests`, el aviso se
resuelve en el cliente extendiendo `NotificationCard.jsx` — y eso cubre las dos rutas
(organizador desde este repo, e invitado haciendo RSVP desde `iattend-events`), que
era justo el problema que el trigger buscaba resolver. Por eso el trigger del `.sql`
**solo hace el `UPDATE ... SET "table" = NULL`**.

Queda una decisión abierta: al liberar la mesa se pierde de qué mesa se trataba, así
que la tarjeta no puede decir "Mesa #3" sin guardar ese dato en algún lado. No se
inventó una columna para eso — es decisión de producto.

### Otros pendientes de §8 resueltos contra la base real (26-ago-2026)

- **§8.5** — `--brand-color-300` = `#E0D3E8` (`src/styles/index.css:419`, vía
  `--light-purple-300`). ⚠️ `src/pages/Lia/lia.css:798` lo redefine a `#413950`, pero
  dentro del scope `.lia-page` (tema oscuro), donde el seating chart no se renderiza.
- **§8.7** — **cero duplicados** de `(invitation_id, number)` en producción. La
  constraint entra sin limpieza; se dejó comentada porque el frontend hoy avisa en
  suave (mesa en rojo) y no maneja el error duro de Postgres.
- **§2.7** — `guests.last_action` confirmado; guarda el estado *anterior*.
- Los RPCs `get_guests_without_table` / `get_tables_occupancy` / `assign_guest_table`
  **existen pero son exclusivos de Lia en el backend** (`iattend--backend/router/ai.chat.route.js`).
  Este frontend nunca los llama: todas las escrituras de mesa son `UPDATE` directo.
  `get_guests_without_table` **sí** incluye `asistente` — el sesgo era solo del frontend.
- `--text-color-500` (que usaba `.occupied`) **no existe** en los tokens. El swap de
  color lo eliminó de paso.

---

## §3.1 — El filtro que excluía `asistente`

`TablesPage.jsx` filtraba `state === 'confirmado'` a secas. Como `confirmado` y
`asistente` son equivalentes por definición, un invitado escaneado en la puerta
(`ScannerPage.jsx` lo pasa a `asistente`) **desaparecía de su silla en el mapa** y
liberaba el lugar visualmente, aunque siguiera sentado.

Efecto medido en el evento de prueba: confirmados 79 → **80**, ocupados 71 → **72**.

El fix es la constante `CONFIRMED_STATES` en `TablesPage.jsx`. `confirmedGuests_`
alimenta todo el mapa, así que corrige de un golpe el contador global, las sillas de
cada mesa y las píldoras `N/size`.

## §2.4 — Inversión de la convención de color

**Esto cambió el significado de un color sobre datos que el usuario ya vio.** Antes,
silla lila = vacía. Ahora lila = ocupada.

| | Antes | Ahora |
|---|---|---|
| Ocupado | crema `--sc-color` | lila `--brand-color-300` relleno |
| Libre | lila `--brand-color-300` | transparente + borde `--borders` |

Se cambió en tres lugares, no solo en el CSS:

1. `dynamic-table.css` — `.occupied` / `.available`. Se agregó `box-sizing: border-box`
   a `.chair`: sin eso el borde nuevo hacía crecer la silla libre a 34px y rompía el
   anillo.
2. `DynamicTable.jsx` — el disco central de la mesa seguía la convención vieja
   (llena = crema). Invertido para que mesa llena = lila.
3. `TablesPage.jsx` — la leyenda al pie y el contador móvil, que reforzaban la
   convención vieja. Los puntos usan `LEGEND_DOT` / `LEGEND_DOT_FREE`.

Verificado en la app: `.occupied` computa `rgb(224,211,232)` con texto `#29262D`;
`.available`, fondo transparente con borde `#EBEBEB` y texto `#787878`. Ambas 32×32.

## §5.3 — Vista "Lista de mesas"

Archivos nuevos: `TablesList.jsx` + `TablesList.module.css` (CSS Modules, el patrón
para código nuevo).

El panel derecho de invitados **no cambia ni desaparece**; lo que alterna es el lado
izquierdo, con el toggle `.view-switch` en el header (`organization-table.css`).

- Fila colapsada: `#num` · nombre · forma y lugares · **tira de puntos** ·
  `ocupados/total` y libres · `···` · chevron.
- Es una lista y no una grilla de tarjetas porque así las 24 mesas caben de un jalón
  y la ocupación es comparable de un vistazo entre filas.
- La tira usa la **misma convención invertida** que las sillas del mapa.
- Orden **natural** sobre `number` (que es `text`): `localeCompare(..., {numeric:true})`,
  si no daría 1, 10, 11, 2.
- Fila expandida: una línea por invitado con nombre, badge `grupo de N` y
  `etiqueta · lado` **en la misma línea**.

## §5.4 — Transferencia entre mesas

`TransferPicker.jsx` + su `.module.css`, compartido por la lista y (a futuro) el panel
de mesa del mapa.

Lo que hace segura la transferencia: **las mesas completas y las bloqueadas aparecen
en gris y no son destino válido**. Se usa `aria-disabled` y no `disabled` — el ítem no
es un `<button>`, y así el motivo del bloqueo sigue siendo legible.

Cada destino muestra su **etiqueta dominante** (el `tag` más frecuente entre quienes
ya están sentados) y cuántos lugares le quedan. El orden pone los válidos primero,
luego la afinidad de etiqueta, y al final el número natural.

`seatsNeeded` hace que "Mover todos" bloquee las mesas donde no cabe el grupo completo:
verificado moviendo 6 invitados, 8 de 23 mesas se bloquearon y el contador pasó a
"Con espacio · 15".

### Gotcha: dropdowns de antd con contenido interactivo

El picker vive dentro de un `Dropdown`. Sin cuidado, cada clic en el buscador o en un
filtro se lee como "clic fuera" y antd cierra el popup. Hay dos piezas:

1. `stopPropagation()` en el div raíz de `TransferPicker` y en el menú `···`.
2. Los dropdowns que los contienen son **controlados** (`open` + `onOpenChange`), no
   automáticos — el menú del invitado necesita cambiar de "menú" a "picker" sin cerrarse.

---

## Layout del drawer

El título, el CTA y la franja de avance **cruzan todo el ancho del drawer**, por
encima de las dos columnas — describen el evento completo, no la columna del mapa.
Van en `.seating-topbar`, que es hermano de `.table-org-general-container` y no hijo
de `.table-map-container`:

```
.table-organization-main-container   (columna, height 100vh, overflow hidden)
  .seating-topbar                    (ancho completo: título + Agregar + X, y ProgressStrip)
  .table-org-general-container       (fila, flex: 1)
    .table-map-container             (switchRow + mapa/lista)
    .table-list-container            (GuestPanel)
```

`.table-org-general-container` pasó de `height: 100vh` a `flex: 1; min-height: 0`,
si no el topbar empujaba el contenido fuera de la pantalla.

`.table-list-container` dejó de ser una columna con `border-left` y ahora es una
tarjeta con radio 24px, como en el mockup.

El botón de cerrar vive en el topbar y no en el `Drawer`: en escritorio ese Drawer va
con `closable={false}` y sin header, así que sin este botón la única salida era clicar
la máscara. `TablesPage` recibe `onClose` desde `GuestsPage`. En móvil sigue usándose
la X del header del Drawer, por eso el botón lleva `button-web`.

## §5.2 — Franja de avance y "+ Agregar"

`SeatingChrome.jsx` + su `.module.css` exportan las dos piezas del chrome del drawer,
compartidas por el mapa y la lista:

- **`ProgressStrip`** — "72 de 80 sentados / 8 confirmados sin mesa" + barra, y a la
  derecha la señal ámbar de capacidad sobrante con acción *Revisar* (que salta a la
  lista de mesas). Sustituye a la leyenda de conteos del pie del mapa; la leyenda que
  queda al pie ya solo explica la convención de color (ocupado / disponible / bloqueada).
- **`AddMenu`** — un solo botón `+ Agregar` con dos secciones (*Nueva mesa* con su
  rango de lugares como hint, y *Elementos del salón*). Reemplaza `+ Nueva Mesa` y el
  botón suelto de pista. Va en navy: el primario de antd es lila claro y se perdía.

El toggle Mapa ↔ Lista bajó a su propia fila; a la derecha lleva *Cuadrícula* en el
mapa y los dos botones de orden en la lista, como en el wireframe. El estado `sortBy`
vive en `TablesPage` y baja a `TablesList` por prop.

## §5.4 — Panel de edición de mesa

`TablePanel.jsx` + su `.module.css`. Se abre al hacer clic en una mesa del mapa y
reemplaza el modal viejo, que era arrastrable y mezclaba crear con editar.

Contiene, en el orden del wireframe: número, nombre editable en línea, forma (con
toggle de orientación solo en rectangular), stepper de sillas, switch de bloqueo,
lista de invitados con menú `···`, botón de agregar y el pie con *Mover todos* ·
*Vaciar* · *Eliminar mesa*.

**El piso del stepper es la ocupación actual.** El `−` se deshabilita al llegar a
ella y el tooltip dice cuántos hay que sacar primero. Nunca se liberan invitados en
silencio. El techo es el máximo de la forma (redonda 12, cuadrada 16, rectangular 18).

Al reemplazar el modal se eliminó todo su andamiaje muerto: `updateTable`, `editTable`,
`handleAddingGuests`, `handleSelectTable`, `handleShapes`, `hasDuplicateNumber`, el
estado `tables` (un espejo del canvas que `DynamicTable` mantenía por un `useEffect`)
y el bloque de transferencia que dependía de él.

### Reubicación al cambiar forma u orientación (§4.6)

Cambiar de redonda a rectangular duplica el ancho e invade a la vecina. Si el nuevo
footprint no cabe donde está, la mesa **se reubica en el primer hueco libre**
(`findFreeSpot`) conservando su `id` — y por tanto sus invitados: solo cambian x/y.
Se avisa con un mensaje para que el usuario no la pierda de vista. Si no cabe en
ningún lado, se bloquea el cambio y se dice por qué.

Si la forma nueva admite menos sillas que los invitados sentados, el cambio se
rechaza nombrando cuántos hay que sacar antes.

## Herramientas del mapa

Repartidas en dos sitios, según de qué sean herramientas:

- **En el plano**, en la columna de arriba a la derecha junto al zoom y la mano:
  **deshacer y rehacer**. Son herramientas del lienzo, como el zoom.
- **En la barra de arriba**: *Alinear*, *Auto acomodo* y *Centrar*.

**Deshacer / rehacer** (`useTableHistory.js`) guarda instantáneas completas de la
geometría (x, y, forma, orientación, sillas) en vez de acciones inversas: son
baratas y sobreviven a operaciones que tocan muchas mesas de golpe. Solo versiona
geometría; quién se sienta dónde no entra, porque deshacer eso a ciegas confunde
más de lo que ayuda. Verificado: aplicar un acomodo y deshacer devuelve las 25
mesas a su posición exacta.

**Alinear** (`AlignMenu.jsx`) es un menú con los seis controles de Figma —izquierda,
centro, derecha, arriba, medio, abajo— más *Separar las encimadas*.

La alineación trabaja **por grupos de proximidad** (`alignTables` en
`seatingGeometry.js`). "Alinear a la izquierda" con 24 mesas no puede empujarlas
todas al mismo `x`: quedarían apiladas en una columna. Lo que sirve en un plano de
salón es que las mesas que ya forman una columna se alineen exactamente entre ellas,
y lo mismo por filas. Dos mesas cuentan como la misma fila si sus bordes caen dentro
de 140px; sin esa tolerancia, posiciones como 743.33 y 745.01 se leen como filas
distintas y no se alinea nada.

*Separar las encimadas* es el `relaxOverlaps` de antes: deshace los encimamientos sin
reorganizar el salón, tratando mesas bloqueadas y elementos como obstáculos fijos.

**Auto acomodo** (`autoLayout.js` + `AutoLayoutModal.jsx`) aplica los tres arreglos
del onboarding (§4.4). Solo mueve mesas: conserva cada `id`, así que nadie pierde su
asiento, y las bloqueadas se quedan donde están. Verificado contra las 24 mesas
reales: los tres acomodos las colocan todas con cero solapamientos.

Su diálogo **no usa el `Modal` de antd**: se portaleaba a `<body>`, así que sus
clics —incluido el de cerrar— caían sobre la máscara del Drawer y lo cerraban, y su
padding no era el de esta pantalla. Es un diálogo propio anclado dentro del drawer,
con cierre por Escape, por la máscara y por su botón.

**Centrar** — zoom a 0.6 sobre el centroide de lo dibujado.

### El paneo que se atoraba

Los topes exigían que el tablero **cubriera** el visor. Cuando el tablero escalado
resultaba más chico que el visor (zoom bajo, o el panel de invitados colapsado),
el rango salía **negativo** y el clamp lo colapsaba a su extremo: el tablero
quedaba pegado al borde derecho y no se podía recorrer a la izquierda.

Ahora el modelo es "que siga viéndose un trozo": el clamp solo garantiza que
`PAN_KEEP_VISIBLE` (220px) de tablero queden dentro del visor, así que el rango
nunca puede ser negativo. Comprobado sobre 40 combinaciones de zoom (0.2–1.8) y
ancho de visor (500–1400): antes 5 quedaban atoradas, ahora ninguna. En vivo a
zoom 0.2 el recorrido pasó de 24px a 934px.

### Centrar: el origen del `scale`

`.org-map-work-container` se escala desde su propio centro, así que un punto `fx`
del canvas acaba en `left + mitad + (fx - mitad) * zoom`. Centrar con
`left = ancho/2 - fx * zoom` deja la vista mirando una zona vacía; hay que despejar
`left` de la fórmula completa.

## §5.1 — Onboarding

`Onboarding.jsx` + su `.module.css`. Aparece cuando el evento **no tiene ninguna
mesa creada** (la pista no cuenta como mesa) y se descarta con *Empezar en blanco*
(estado en memoria: si reabres el drawer con cero mesas, vuelve a aparecer). No es
un modal: es el estado vacío del panel izquierdo, sobre el canvas punteado, con la
lista de invitados siempre visible a la derecha. Durante el onboarding se ocultan
la franja de avance y el toggle, y `+ Agregar` queda deshabilitado (§5.0.4).

- **Paso 1**: stepper de mesas (reparte sobre la forma más numerosa, para que
  "cuántas" y "de qué formas" nunca se desincronicen), contadores por forma, y el
  bloque de cálculo en vivo con **`tickets` editable** que se guarda en
  `invitations.tickets` al salir del campo. Sillas por §4.1 con sus topes
  (verificado con 300 pases: redondas de 12, rectangulares de 18 → 174 lugares).
- **Paso 2**: los tres acomodos apilados, selección solo por fondo lila + borde
  morado, línea de datos duros y el botón terminal `Crear mis N mesas →` con la
  nota de confirmación. La preselección favorece bloques si la mayoría son
  rectangulares.
- **Crear**: aquí todo es `INSERT` (no existe nada aún): N mesas numeradas 1..N
  más la pista (`shape='dance'`, `number='0'`), posicionadas con el mismo
  `buildLayout` del auto acomodo. Al terminar, la vista se centra en la pista.

Gotcha del centrado: durante el onboarding el mapa NO está montado, así que
`mapContainerRef.current` es null en el callback de creación. El centrado se
difiere con un flag (`pendingCenter`) y un efecto que corre cuando el mapa ya
existe.

Verificado end-to-end contra una invitación hermana del mismo usuario con cero
mesas: onboarding → paso 2 → crear = 13 mesas + pista en la BD, capacidad 174,
pista centrada exactamente en (1750,1750), cero solapes, `tickets` intacto, y la
vista aterriza centrada a zoom 0.45. El evento de prueba se limpió después.

## Colisiones: solo en los generadores

**El arrastre manual no colisiona: el usuario manda.** Hubo una "zona segura" que
bloqueaba el drag para impedir encimar mesas; generaba zonas muertas y peleaba con
el cursor, así que se eliminó por decisión de producto. `SAFE_ZONE` (24px) sobrevive
solo donde no estorba: el generador de acomodos (`relaxOverlaps` en su pase final) y
la reubicación por cambio de forma (`findFreeSpot`).

La geometría de `seatingGeometry.js` sigue siendo la fuente única de verdad para
cajas visuales (`rectOfTable`), límites del canvas (`clampToCanvas`, consciente de la
orientación) y esos dos generadores.

### Selección múltiple (marquee + Shift-clic)

Arrastrar sobre el fondo del mapa dibuja el cuadro azul de Figma (`.marquee-box`)
y selecciona en vivo lo que toca; Shift/Cmd-clic agrega o quita mesas una a una.

Con 2+ seleccionadas aparece la **isla de alineación** (`.align-island`): flotante,
centrada en X con 24px desde arriba, en navy, con los seis controles de Figma
(izquierda, centro, derecha · arriba, medio, abajo) separados por un divisor. Alinea
SOLO la selección contra un borde común usando las cajas visuales. El arrastre de
cualquier mesa seleccionada mueve todo el grupo con el mismo delta. Escape o un clic
seco en el fondo limpian la selección.

Dos gotchas que costaron encontrar:

- **Shift-clic no debe iniciar un arrastre.** Si lo hace, queda un listener
  fantasma que después mueve esa mesa con el desplazamiento de OTRO cursor.
- **La mesa debe frenar la burbuja del mousedown siempre**, incluso en shift-clic:
  si sube al fondo, el mapa arranca un marquee de 0px que limpia la selección al
  soltar.

### Deshacer con teclado

`Cmd/Ctrl+Z` deshace y `Shift+Cmd/Ctrl+Z` rehace, además de los botones del plano.
El listener lee el hook por ref (`historyRef`) para no re-suscribirse en cada
render — y ojo con el orden: asignar `historyRef.current = history` antes de que
`useTableHistory` se declare es una TDZ que revienta el componente entero.

### El hitbox de las rectangulares verticales

`x`/`y` guardados son la esquina del footprint SIN rotar (contrato histórico con la
BD), pero el contenedor del DOM medía ese mismo footprint: una vertical arrastraba
una caja de 400×200 mientras su dibujo ocupaba 200×400 — huecos "sin sentido" al
alinear. Ahora el contenedor mide la caja girada (lados intercambiados, desplazada
para conservar el centro) y `clampToCanvas` acepta `vertical`. La BD no cambió.

## Rótulo de la mesa

El nombre y la ocupación viven **fuera de la rotación**: antes estaban dentro del
contenedor rotado y en una rectangular vertical acababan a la izquierda en lugar de
debajo. Ahora `.dynamic-container` lleva el footprint y la posición, un `.table-rotor`
interno aplica `scale(0.7)` y el `rotate(90deg)`, y el rótulo se posiciona con un `top`
calculado a partir de la altura visual — que cambia con la orientación.

## Botón "Centrar"

Sustituye al de cuadrícula (y con él se quitó el snap, que la zona segura vuelve
innecesario). Devuelve el zoom a 1 y centra la vista sobre el **centroide de lo que hay
dibujado**, no sobre el centro geométrico del canvas: las mesas viven en la mitad
superior de los 3500px, así que el centro geométrico deja la vista en zona vacía.

## §5.5 — Panel de invitados

`GuestPanel.jsx` + su `.module.css` reemplazan el bloque que vivía inline en
`TablesPage`. Conserva las dos cosas que ya funcionaban y arregla lo que estorbaba:

- El **tooltip de contexto** se ancla arriba a la izquierda (antes tapaba las dos filas
  siguientes) y pasa a fondo navy: el lila con texto oscuro tenía muy poco contraste.
- El **color por grupo** deja de depender de un filtro y se controla con el chip
  *Colorear grupos*, activo por defecto. Filas a sangre con barra vertical de 4px
  pegada al borde, y los integrantes de un grupo se ordenan juntos — si se separan,
  el tinte se rompe en franjas sueltas y deja de significar nada.
- Filtros como **chips visibles** (*Colorear grupos*, *Sin mesa · N*, etiqueta, lado)
  en vez de un icono que escondía el estado.
- Agrupación en `SIN MESA · N` / `SENTADOS · N`, badge `grupo de N` en el titular y
  `acompaña a X` en los demás.
- Sin mesa → botón **Asignar** (acción). Con mesa → pastilla **Mesa #N** (dato). Las
  dos abren el mismo `TransferPicker`.

## §3.5 — Elementos del salón

`LayoutElement.jsx` renderiza las filas de `layout_elements` como bloques punteados
sobre el canvas, con drag, snap y borrado. Se verificó el ciclo completo contra la
base real (crear → aparece en el mapa → fila en Supabase → borrar → limpio).

**La pista de baile no migró.** Sigue viviendo en `tables` como `shape='dance'`, y el
ítem "Pista de baile" del menú llama a la ruta vieja (`addDanceFloor`). Migrarla toca
datos existentes y `get_tables_occupancy` (que la excluye vía `size = 0`), así que
queda como decisión pendiente. Mientras tanto no hay duplicidad: solo una de las dos
rutas crea pistas.

Nota: `.dance-container` se cambió a 1000×1000 en el CSS; `getTableFootprint('dance')`
se actualizó en los dos archivos que lo duplican para que el clamp no deje que la
pista se salga del canvas.

## §5.6 — Widget de Seguimiento

`GuestsOverview/MesasWidget.jsx` — un componente con tres estados (todo en orden /
sin mesas / requiere acción). Reutiliza la tira de asientos de la lista de mesas y
aporta la **barra apilada de capacidad**: ocupados + los que van a ocupar los
pendientes + los que van a sobrar. Ese último número no existía en ninguna parte.

Las cifras concuerdan con la franja del drawer porque ambas derivan la ocupación solo
sobre confirmados (263 − 72 − 8 = 183).

El titular "X canceló, su lugar en la Mesa #3 quedó libre" del wireframe **no se
implementó**: hoy nada persiste qué mesa liberó una cancelación. El widget usa el
titular derivable ("8 confirmados siguen sin mesa"). Es el mismo cabo suelto que
bloquea el aviso del trigger.

## §5.7 — Móvil (pantallas 01 M a 05 M del Figma)

El breakpoint es `max-width: 750px`, el mismo que ya usaba el módulo, y en JS
`isMobile = window.innerWidth <= 750`.

**Un solo header.** El `Drawer` de `GuestsPage` dibujaba su propia barra con X y
"Mapa de mesas" y `TablesPage` dibujaba la suya debajo: dos títulos apilados. El
drawer ya no pinta header (`title={null}`, `header: { display: 'none' }`) y le
pasa `onClose` a `TablesPage`, que en móvil lo pone como disco a la izquierda
junto al título corto "Mesas", con el "+" en disco a la derecha.

**Tres pestañas, no dos.** La columna derecha de confirmados no cabe en 430px, así
que `leftView` acepta un tercer valor `'guests'` que solo se ofrece en móvil y
renderiza el mismo `GuestPanel` dentro de `.mobile-guests-tab`. La pestaña lleva
el contador de quiénes siguen sin mesa.

**La franja de avance va en una línea.** Apilada en columna se comía un tercio de
la pantalla antes de que se viera una mesa. En móvil el subtítulo se oculta (lo
cubre la barra fija), la barra pasa a `flex: 0 0 6px` — con `flex: 1` dentro de
un contenedor en columna resolvía a base 0 y desaparecía — y el bloque ámbar se
reduce a la cifra (`.surplusCompact`), sin la frase ni el enlace "Revisar".

**Barra fija de invitados sin mesa.** Es el equivalente al dock de la pantalla 03:
`.mobile-unseated-dock`, absoluta al pie del mapa, con el conteo, cuántos grupos
de acompañantes hay entre ellos y un CTA que salta a la pestaña Invitados. Se
esconde cuando hay panel de mesa o selector de invitados abierto, que la taparían.

**Herramientas del mapa.** El slider vertical de zoom no se puede arrastrar con el
pulgar sin mover el lienzo: en móvil se cambia por botones `+` / `−` más
"Centrar". El override que ponía `.tools-map-menu-container` en `left: 30px` la
dejaba fuera de pantalla (`x = -160`); se eliminó y queda arriba a la derecha,
como en escritorio. "Auto acomodo" se muda al menú del botón "+".

**Hojas inferiores.** `TablePanel` ya era hoja en móvil; se le puso tope de altura
(`85vh`) porque una mesa de 18 lugares desbordaba por arriba de la pantalla.
`TransferPicker` pasa de popover de 320px a hoja a todo el ancho. El detalle
espinoso: antd lo mete en un popup con `transform` propio, y un `position: fixed`
dentro de un ancestro transformado se resuelve contra ese ancestro — la hoja
salía en `x: -54, y: -23`. Por eso el picker lleva la clase global
`transfer-sheet` y `organization-table.css` anula el popup que la contiene
(`transform: none`, `inset: 0`, `pointer-events: none` para que antd siga
detectando el clic fuera y cierre).

**FAB del header.** Vive fuera de este árbol y es fijo al viewport, así que se
encimaba al CTA de la barra fija. `GuestsPage` marca `body.seating-drawer-open`
mientras el drawer está abierto y el CSS del módulo lo esconde.

**Lista de mesas.** Tercer criterio de orden, "Con espacio" (`sortBy === 'space'`),
que sube las mesas que todavía admiten gente sin esconder las llenas. Los puntos
de asientos estaban ocultos en móvil; vuelven en su propio renglón con
`order: 10; flex: 0 0 100%` sobre un `.rowHeader` que ahora envuelve.

**Onboarding.** No tenía ninguna media query. En móvil pierde el lienzo punteado
(fondo limpio), el texto se alinea a la izquierda, las tres tarjetas de forma
pasan a renglones con su contador a la derecha, las miniaturas del paso 2 se
vuelven cabecera a todo el ancho, y las acciones se anclan abajo con
`position: sticky` — con la principal arriba (`.secondary { order: 1 }`).

## Fuera de alcance (decidido)

- Relaciones negativas entre invitados.
- Acomodo en side events (`side_events_guests` no tiene campo de mesa).
- Asignación por silla: el modelo es **invitado → mesa**. Hoy `DynamicTable` recibe
  `occupiedChairs` como un **número** y marca sillas por índice, así que no hay
  identidad silla↔invitado — y no se va a agregar.
- Backfill de eventos existentes para el trigger.
