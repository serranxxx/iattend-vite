# Side Events — tabs, sort, clima

Documenta el trabajo sobre `src/modules/SideEvents/SideEvents.jsx`, tocado en 5 commits del
mes (`51974ef`, `b283898`-independiente, `883028d`, `467a78b`, `27b7c1b`) — el componente con
más iteraciones/fixes del periodo.

## Qué es

Gestión de invitados de un side event (evento satélite: despedida, boda religiosa, after,
etc.), como espejo simplificado de `GuestsPage.jsx` pero para un evento hijo de la
invitación principal. Vive en la ruta `/dashboard/side` → tab de un side event específico.

## Tabs por estado (commit `883028d`, 14-ago)

Antes de este commit la tabla de side events era un `Table` de Ant Design plano. Se cambió a
`Tabs` con la misma máquina de estados que `GuestsPage` (`creado` / `esperando` / `confirmado`),
agrupando invitados por familia (`__isGroupChild` marca las filas hijas, indentadas con un
ícono de "vuelta" `BsArrowReturnRight`).

### Sort de columnas (no filtra, solo ordena)

Cada tab tiene su propio estado de sort en `activeSort` (`{ column, dir }`), independiente
por tab. El botón del encabezado cicla `inactivo → asc → desc → inactivo`. Comparadores
definidos:

- `compareByTier` — orden `A > B > C > D` (`TIER_SORT_ORDER`)
- `compareByStatus` — orden por status de dispatch: `failed < undefined < processing < sent < delivered < read`

No hay sort por mesa/asiento — los side events no tienen mapa de mesas propio.

## Bloque de clima (commit `51974ef`, 3-ago)

Se agregó `body.hideWeather` (booleano, default `false`) al `body` del side event, con un
botón toggle (`Cloud`/`CloudOff`) en la barra de herramientas del editor. **Este repo solo
guarda la preferencia** — el bloque de clima en sí (consumo de API meteorológica, render) se
resuelve del lado de `iattend-events`, que es quien renderiza la invitación pública.

## Fix `467a78b` (16-ago)

Refactor de `handleMessageStatus` (el render de la píldora de estado de mensaje por
invitado: `processing` / `sent` / `delivered` / `read` / `failed`, con botón de reintento en
`failed`). Se movió su definición **antes** de `columns`/`items` en el cuerpo del componente:
`items` renderiza sus tarjetas de forma inmediata (no perezosa) dentro de un `useMemo`, así
que cualquier función que usa `columns.render` debe existir ya en ese punto para evitar un
`ReferenceError` de TDZ (temporal dead zone) — se disparaba en cada render con invitados en
`esperando`. Es el tipo de bug a vigilar si se vuelve a mover código entre las `useMemo` y las
funciones auxiliares de este archivo.

## Ladas por país (commit `883028d`)

`src/helpers/assets/phoneCodes.js` — catálogo único (`PHONE_CODES`) de código de país + ISO +
bandera, usado en todos los inputs de teléfono de la app (no solo Side Events). Reemplazó una
lógica de teléfono que asumía siempre `+52`. Utilidades: `splitPhoneNumber` /
`buildPhoneNumberSafe` (separar/juntar lada + número) y `findPhoneCodeByDigits` (para
importaciones de Excel, donde la lada viene pegada al número).

## Gotcha para tocar este archivo

`SideEvents.jsx` es el componente que más bugs generó en el mes (2 commits de fix directo
sobre el mismo archivo). Antes de reordenar funciones o mover definiciones entre bloques
`useMemo`, verificar el orden de declaración — ya hubo un caso real de TDZ por esto.
