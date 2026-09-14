# Save the Date — estado real

> Quinto producto de I attend. Construido el 2026-09-03 a partir del handoff
> "Save the Date v3". Este doc registra **lo que existe de verdad**, las
> divergencias vs. el handoff y los defaults que se tomaron sin confirmación
> explícita de Alberto.

## Qué es

Página pública muy simple que anuncia la fecha de un evento: carrusel de
imágenes de fondo, título, countdown y un botón "Save the date" que descarga
un `.ics` (más deep links a Google/Outlook). Producto de regalo: gratis, sin
RSVP, sin invitados, sin WhatsApp, sin créditos.

## Decisiones que quedaron resueltas (antes 🔴/🟡 en el handoff)

- **§0.3** — El botón descarga un **`.ics`** (confirmado por Alberto).
- **§0.7** — **Un evento free por cuenta** (confirmado por Alberto).
- **§5.3** — El preview **no** pasa por `/host`: se creó la ruta hermana
  `save-the-date-host`, clon del patrón de side events.
- **`invitations.plan`** — es **texto libre** (confirmado por Alberto y
  verificado empíricamente: el INSERT con `plan='free'` pasó sin tocar
  ningún constraint). Valores en prod: `pro`, `lite`, `paperless`, `free`,
  y una fila legacy con `NULL`. Ni `plan` ni `type` son enums de Postgres.

## Modelo de datos

Tabla `save_the_dates` (migración:
`iattend--backend/migrations/2026-09-03_create_save_the_dates.sql`, ya
corrida en prod):

- `id` uuid PK — es el identificador de la URL pública (§0.1, provisional).
- `invitation_id` uuid FK → `invitations.id`, **UNIQUE** (uno por evento),
  `ON DELETE CASCADE`.
- `cover` jsonb — misma forma que `invitations.data.cover`.
- `event_date` timestamptz — **fuente de verdad del countdown** (§0.4): al
  renderizar, pisa `cover.date.value`.
- `active` bool — si es false, la página pública responde 404.
- `created_at` / `updated_at` (trigger `trg_save_the_dates_updated_at`).

RLS habilitado con policies abiertas (SELECT/INSERT/UPDATE para anon, sin
DELETE), mismo modelo que `guests`/`side_events`. El GRANT va **antes** de
las policies (gotcha 42501 de `invitation_versions`).

Storage: se reusa el bucket `user_images` con el helper existente
`uploadImagesSupabase` (`{invitation_id}/{timestamp}-{filename}`, compresión
a 1 MB, tope 5 MB por archivo). **No hay límite de cantidad de imágenes por
carrusel** — quedó pendiente decidir si hace falta.

## iattend-events

- **`src/app/save-the-date/[save_the_date_id]/page.tsx`** — ruta pública.
  Clon del patrón de side-event: `force-dynamic`, `getPublicServerClient()`
  (anon, tanto en la página como en `generateMetadata` — a diferencia de
  side-event, que usa el cliente con cookies en metadata), `notFound()` si
  no existe o `active=false`, OG/Twitter con título y primera imagen.
- **`src/components/SaveTheDate/SaveTheDate.tsx`** — reusa `Cover.tsx` **sin
  modificarlo** pasándole `{ cover, generals }` con generals default
  (navy `#16323d` / crema `#F5F3F2`). El carrusel, zoom, blur, overlay y
  countdown salen gratis del Cover existente. Normaliza covers parciales
  (una fila insertada a mano con `cover` incompleto no revienta). Botón
  fijo abajo al centro.
- **`src/components/AddToCalendar/AddToCalendar.tsx`** — **era código
  muerto** (nadie lo importaba; Confirm y EnvioInvitacion usan la librería
  `add-to-calendar-button-react`). Se extendió: sin `startTime` ahora genera
  evento de **día completo** (`DTSTART;VALUE=DATE`, `DTEND` exclusivo al día
  siguiente, RFC 5545) y siempre agrega `UID` + `DTSTAMP` + `PRODID`. Los
  deep links de Google/Outlook también manejan all-day. El camino con hora
  quedó intacto. Consistente con la regla de fechas absolutas: un evento de
  día completo no tiene zona horaria.
- **`src/app/save-the-date-host/page.tsx`** — remoto del preview. Clon de
  `side-event-host` con payload `saveTheDateConfig` (se corrigió el patrón
  del typo `sideEventCondif`, que sigue vivo en side events). Mismos
  orígenes permitidos: localhost:3000/3001, iattend.mx, iattend.site.

## iattend-vite

- **`src/components/Host/SaveTheDateHost.jsx`** — clon de `SideEventHost`
  con una divergencia deliberada: la URL del iframe sale de
  **`VITE_IATTEND_EVENTS_URL`** (fallback `https://www.iattend.events`) en
  vez de estar hardcodeada. Eso permite apuntar el preview a un
  iattend-events local en dev. Los hosts viejos siguen hardcodeados.
- **`src/modules/SaveTheDate/SaveTheDatePage.jsx`** (+ CSS Module) — editor
  en `/dashboard/savethedate/?id=<invitation_id>`. Controles mínimos (§5.2):
  imágenes del carrusel (subir/ordenar/quitar), zoom, oscurecer, difuminar,
  título (texto/tipografía/color/tamaño/posición vertical), fecha, guardar y
  copiar link. Preview en vivo en el marco de iPhone existente.
  **La fila se crea idempotente al entrar al editor** (upsert por
  `invitation_id`) con el cover de la invitación como semilla y
  `invitations.event_date` como fecha inicial — así la tarjeta del dashboard
  solo navega y hay un único code path de creación.
- **`src/pages/Dashboard/DashboardPage.jsx`** — 5ª tarjeta
  (`.save_the_date_dash`) con dos estados: sin fila → sticker + botón
  "Agregar Save the Date"; con fila → preview de la primera imagen del
  cover. Gating free (§5.4): `plan === 'free'` oculta la tarjeta de
  invitación y toda `.single_col`; solo queda Save the Date. Sin candados ni
  CTAs de compra.
- Ruta en `AppRouter.jsx` (dentro de `DashboardLayout`) y breadcrumb
  `savethedate: "Save the Date"` en el `modeMap` de `Header.jsx`.
- i18n: namespace `savethedate.*` + `dashboard.card_save_the_date` /
  `card_std_add` en `es.json` y `en.json`.

## iattend--backend

- **`controllers/auth.js` → `createUser`** — tras crear usuario y profile,
  crea el evento free llamando a **`createInvitationWithPlan(userId,
  'free', { userEmail })`** (la función existente de
  `controllers/supabase.js`, con plantilla default). Guard de "uno por
  cuenta": si el usuario ya tiene alguna invitación, no crea nada.
  Best-effort: si falla, el alta no se bloquea.

## Verificado en vivo (2026-09-03)

- Página pública con fila real: carrusel (4 imágenes), título con tipografía
  de la invitación, countdown vivo, dropdown del botón con Apple/Google/
  Outlook. `tsc --noEmit` limpio en events; `npm run build` limpio en vite.
- Handshake `REMOTE_READY` → `HOST_PROPS` → render contra un events local.
- Editor: carga, edición de título, `Guardar` persiste (trigger de
  `updated_at` funciona), copiar link.
- Alta de cuenta de prueba → invitación `plan='free'`, `credits=0` → su
  dashboard muestra solo la tarjeta de Save the Date. (Cuenta e invitación
  de prueba borradas después.)

## Defaults 🟡 tomados sin confirmación de Alberto

- Botón público: colores navy `#16323d` / crema `#F5F3F2`, label
  "Save the date", posición fija abajo al centro.
- La tarjeta nueva del dashboard es una **tercera columna** de
  `.single_row_dashboard` (260px, como la de invitación); en móvil se apila.
  También se muestra para plan `paperless`.
- El editor crea la fila al entrar (no la tarjeta al hacer clic) — mismo
  resultado para el usuario, un solo code path.
- El seed del cover copia `data.cover` de la invitación del evento (imagen
  incluida, normalizada a array); si no hay, defaults genéricos.
- `event_date` se guarda como `YYYY-MM-DDT00:00:00Z` (medianoche UTC, la
  convención existente). **No** se sincroniza hacia `invitations.event_date`
  (§0.5 quedó en no hacer nada por ahora).
- Sin `song` (§0.6, fuera de v1 como recomendaba el handoff — la copia de
  cover lo lleva en `null`).

## Tour guiado

`SaveTheDateTour.jsx` — mismo patrón que `GuestsTour` / `BuildTour` / `SideEventsTour` /
`TablesTour`: anclajes `data-tour` resueltos al momento, bloques con "Saltar a…", contador en vez
de puntitos y `disabledInteraction`.

13 pasos en dos bloques: **Crear** (la pieza, las cinco herramientas del riel, ver en vivo,
¿cuándo enviar?, copiar link y Guardar) y **Respuestas** (la columna de reacciones y mensajes).

- Se abre solo la primera vez que se entra al editor (`iattend_std_tour_v1`) y se relanza desde el
  `?` de la barra.
- **En la versión gratis (`/save-the-date`, `demo`) no se abre solo**: ahí ya hay un modal de
  bienvenida y dos capas encimadas no ayudan. El `?` sigue funcionando, y como esa versión no
  tiene pestaña de Respuestas, el bloque se colapsa a uno solo con el paso de cierre al final.
- `applyStep` cambia pestaña y panel **en el mismo commit** que el paso, así el anclaje ya está
  montado cuando el Tour lo resuelve.
- **El tour apaga "ver en vivo"** (`openTour`): con el remoto montado el riel se deshabilita y no
  habría zonas que señalar.
- **En móvil no abre los paneles** —la hoja inferior taparía el dock, que es lo que el paso
  señala— y el `?` vive como **sexto botón del dock**, no en la barra: esa ya lleva seis piezas
  (X, pestañas, ojo, ¿cuándo enviar?, link, Guardar) y un séptimo la parte en dos renglones.
- Reusa `rootClassName="se-tour"` (panel de 360px): la pieza va centrada y el panel por defecto de
  ~508px no cabe a los costados.
- **La columna de Respuestas entra sin animación mientras el tour está abierto** (`.noAnim`): antd
  mide el objetivo en el mismo commit, y con el ancho del hueco y el `translateX` todavía animando
  la máscara quedaba desfasada —y no se vuelve a calcular.
- **Solo escritorio.** Bajo 750px el tour no se abre ni se ofrece: la máscara de antd mide
  anclajes que viven en carruseles, drawers y hojas inferiores y no los recalcula. Ver
  [rediseno-editor-side-events.md](./rediseno-editor-side-events.md#los-tours-son-solo-de-escritorio).
- **`isMobile` se declara antes del efecto que lo apaga.** Es la guarda de arriba, y `isMobile`
  entra en su lista de dependencias — que se evalúa **en render**, no al correr el efecto. Con el
  `useState` declarado después, la página entera tronaba con `Cannot access 'isMobile' before
  initialization` y quedaba en blanco. El cuerpo del efecto sí puede referirse a lo que venga
  después; el array de dependencias no.

## Campos móviles sin popups

Los paneles de la hoja inferior no usan `Select`, `ColorPicker` ni `DatePicker` de antd en móvil: sus
popups flotan anclados al trigger y dentro de una hoja que se mueve, en 400px y con el dedo, son
inoperables. Bajo `isMobile` montan `FontPicker`, `ColorField` y `DateField` de
[`components/MobileFields`](../src/components/MobileFields/MobileFields.jsx) — carrusel horizontal
de fuentes y controles nativos del teléfono. El color del botón es translúcido, así que su `ColorField`
va con `alpha` (deslizador de opacidad → `rgba`). El porqué completo está en
[rediseno-editor-side-events.md](./rediseno-editor-side-events.md#en-móvil-los-paneles-no-usan-popups-de-antd).

## El picker de videos en el teléfono

- **Los tiles salían negros en iOS y parecía que no había videos.** Safari iOS no pinta el primer
  fotograma de un `<video>` en pausa hasta que hay interacción, aunque tenga `preload="metadata"` y
  el listado sí traiga los archivos. Los tiles van con `autoPlay muted loop playsInline` — en
  silencio y en línea iOS sí lo deja correr — y se ven como lo que son.
- El listado filtra el marcador de carpeta vacía (`id: null`) y lo que no sea `.mp4/.webm/.mov/.m4v`,
  igual que el de imágenes.
- `handleOpen` lista con el **mismo id con el que se sube** (`resolvedId`), no con la prop
  `invitationID`: si el picker nació sin id y lo resolvió `onRequestSaveForImage`, la prop sigue
  vacía pero los archivos ya están bajo el id resuelto. Va en estado y no leyendo el ref: la regla
  `react-hooks/refs` no deja leer un ref dentro de una función que se le pasa a `cloneElement`,
  porque es una llamada normal durante el render y no puede probar que no la ejecute ahí.
- Header compacto: sin icono, "Almacenamiento" y "Subir". El anterior partía en dos líneas y
  recortaba el botón en 400px.

## El guardado en `/save-the-date` solo arranca al pulsar Guardar

Con sesión iniciada, abrir la ruta pública disparaba de entrada "creando tu Save the Date" y luego el
selector de evento. La causa: el efecto que reanuda el guardado tras un login con redirect solo
comprobaba **sesión + borrador**, y el borrador existe siempre porque el autoguardado lo escribe con
cada cambio. Ahora hace falta además la bandera `iattend_std_pending_save`, que `handleSave`
enciende justo antes de mandar al login y que el efecto **consume** (lee y borra) al volver. Cerrar el
modal de cuenta sin loguearse la apaga; el login sin redirect (email) la consume y sigue directo con
`adoptAndGo`, como ya hacía.

## Gotchas nuevos

- **El preview del editor apunta a prod por default**: hasta que
  iattend-events se despliegue con `save-the-date-host`, el iframe del
  editor muestra el 404 de Next. En dev se puede apuntar a un events local
  con `VITE_IATTEND_EVENTS_URL=http://localhost:3000` — y el vite tiene que
  correr en **3000 o 3001** (únicos parent origins que acepta el remoto).
- El countdown (`CountDown.tsx`) parsea con `dayjs.tz(...,
  "America/Mexico_City")` hardcodeado — heredado del componente existente,
  no se tocó.
- Los dots del carrusel quedan parcialmente detrás del botón fijo en
  pantallas chicas — cosmético, pendiente de pulir.
- Un PNG con transparencia como primera imagen del carrusel se ve "negro"
  sobre el fondo navy — es el comportamiento del Cover, no un bug.
- **El registro por OAuth (Google/Apple) no pasa por `create-user`**: va
  directo a `supabase.auth.signInWithOAuth` desde el frontend, así que esos
  usuarios **no reciben el evento free**. Cubrirlo requiere un trigger en DB
  o un check al entrar al dashboard — pendiente.
- Los endpoints `POST /api/invitation/create-free` y
  `POST /api/payment/create-free` (duplicados byte a byte) siguen **sin
  autenticación** — con el plan free existiendo, cualquiera con un `userId`
  puede crear invitaciones ilimitadas. Vale la pena cerrarlos.
- En el dashboard free, el header (créditos, pases, "Información
  pendiente") y el chat de Lia siguen visibles — el gating solo oculta los
  módulos, como pedía el alcance.

## Pendientes

- Desplegar iattend-events (ruta pública + host) y probar el preview del
  editor contra prod.
- Ruta bonita en vez del uuid (§0.1) — al cambiarla, mantener viva la ruta
  por `id` o poner redirect (links ya compartidos).
- Decidir límite de imágenes por carrusel.
- Cubrir signups por OAuth (evento free).
- Autenticar los endpoints `create-free`.
- Deuda heredada documentada de paso: la plantilla default está duplicada
  (`ventas.js:21-118` y `supabase.js:209-306`) y `createInvitationWithPlan`
  es fire-and-forget (no devuelve el id ni propaga errores).
