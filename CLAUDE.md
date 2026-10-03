# CLAUDE.md — iattend-vite

## Qué es este repo
App del organizador de I attend (los novios, o quien haya comprado la plataforma). Desde aquí se crea y edita la invitación digital, se administran invitados y mesas (con drag & drop), se crean side events, se monitorea el Photo Wall en vivo, se gestionan créditos/pagos (Stripe) y se interactúa con "Lia", el asistente del dashboard.

## Stack técnico
- **Framework:** React 19 + Vite 7
- **Lenguaje:** JavaScript — componentes en `.jsx`, sin TypeScript (solo `@types/react` para autocompletado del editor)
- **Estilos:** mixto — CSS Modules (`ComponentName.module.css`) para componentes nuevos, y hojas de estilo globales en `src/styles/**` importadas desde `src/styles/index.js` para páginas más antiguas (invitations, land-page, header, footer, create). El rediseño de invitados agrega `src/modules/GuestManagement/guests-redesign.css`, global pero importado desde el propio módulo. Tipografías cargadas en `index.html`: Plus Jakarta Sans, Work Sans y JetBrains Mono
- **Librería de UI base:** Ant Design v6 (`antd`) + Lucide React para iconos (20px estándar); `react-icons` aparece en código más antiguo (ej. `Payment/functions.js`)
- **Otras dependencias clave:**
  - `@supabase/supabase-js` — cliente Supabase, usado directo desde el frontend
  - `axios` — llamadas al backend
  - `@dnd-kit/*` — está en `package.json` pero el canvas de mesas (`modules/GuestManagement/Tables/`) **no** lo usa (drag manual con listeners `mousemove`/`touchmove`); el único uso real hoy es en `modules/Invitation/Build/BuildSections/BuildDestinations.jsx`
  - `chart.js` + `react-chartjs-2` — gráficas del dashboard
  - `i18next` / `react-i18next` — i18n (es/en)
  - `dayjs` — fechas
  - `html5-qrcode` — scanner de códigos QR de invitados
  - `xlsx` — import/export de listas de invitados
  - `leaflet` — mapas (ubicación del evento)
  - `aos`, `canvas-confetti` — animaciones y microinteracciones
  - `browser-image-compression` — compresión de imágenes al subir assets desde esta app (no del Photo Wall del invitado)
  - `add-to-calendar-button` / `add-to-calendar-button-react` — botón "agregar al calendario"

## Cómo se conecta con el resto de I attend
- **`iattend--backend`**: se llama con `axios` directo a `${import.meta.env.VITE_API_URL}/api/...` desde cada componente (pagos/Stripe, WhatsApp, invitaciones, auth, créditos). No hay un cliente axios centralizado para las rutas nuevas. Auth legacy vía `src/services/apiLogin.js` / `apiInvitation.js` usa un patrón con callback `operation` y header `token` leído de `localStorage` — código antiguo, no es el patrón que siguen los componentes nuevos.
- **Supabase**: conexión **directa** desde el frontend (`src/lib/supabase.js`, con `VITE_SUPABASE_URL` + anon key), no todo pasa por el backend. Se usa para:
  - Queries directas a tablas (`guests`, `event_photos`, `side_events`, `side_events_guests`, `invitation_message_dispatches`, `whatsapp_incoming_messages`, `whatsapp_freetext_dispatches`, etc.)
  - Realtime: `DashboardRealtimeContext.jsx` centraliza casi todas las subscripciones del dashboard en un solo canal (`dashboard_rt_{id}`); `PhotoWall.jsx` mantiene su propio canal (`event_photos_{eventId}`) de forma independiente.
  - Storage: bucket `event-photos` para las fotos del Photo Wall.
- **`iattend-events`** (Next.js, invitación del invitado): consume los datos creados aquí (invitación, invitados, side events). `vercel.json` redirige rutas legacy de este dominio (`/wedding/:x`, `/xv/:x`, `/bap/:x`, `/kids/:x`, `/event/:x`, `/party/:x`, `/side-event/:id`) directo a `iattend.events`, sin pasar por el router de React de este repo.
- **OpenAI**: usado por el backend para el asistente "Lia" — este frontend **no** llama a OpenAI directamente (solo se menciona como proveedor de terceros en `LegalPage.jsx`).
- **Stripe**: el frontend nunca llama a Stripe directo; solo llama al backend (`/api/payment/...`) que devuelve una `url` de Checkout a la que se redirige con `window.location.href`. Los `PRICE_IDS` de Stripe están hardcodeados como constantes en `src/components/Payment/functions.js` (single source of truth ahí).

## Estructura de carpetas clave
```
/src
  main.jsx                      ← entry point, monta <IAttend /> dentro de BrowserRouter
  IAttend.jsx                   ← composición de providers (Lia, Auth, Antd) + AppRouter
  i18n.js                       ← configuración de react-i18next

  /router
    AppRouter.jsx                ← todas las rutas de la app
    AdminHOC.jsx                 ← guard de /admin (revisa session.user.role en localStorage)

  /context
    AuthProvider.jsx / authReducer.js / AuthContext.jsx  ← sesión (localStorage: session/user/logged)
    LiaContext.jsx                ← estado del asistente Lia (notificaciones, acciones UI, créditos)
    TexturesContext.jsx           ← texturas disponibles, consumido por el Texture Lab (pages/Admin/TextureLabPage.jsx) y el builder
    DashboardRealtimeContext.jsx  ← hub de subscripciones Supabase Realtime para /dashboard/*
    AntdProvider.jsx              ← configuración/tema de Ant Design

  /modules/Sales
    VendorSessionContext.jsx      ← sesión de vendedores (login propio, separado de AuthContext/AuthProvider)

  /pages
    Board/InvitationsPage.jsx     ← home ("/", "/invitations"): listado de invitaciones del usuario
    Dashboard/DashboardPage.jsx   ← dashboard principal del organizador
    Dashboard/PhotoWallPage.jsx   ← Photo Wall dentro del dashboard (con privilegios de organizador)
    Checkout/CheckoutPage.jsx     ← checkout de compra
    Admin/AdminPage.jsx + AdminLayout.jsx  ← shell del panel de administración (rol Administration); contenido real vive en Admin/sections/ (EventosSection, UsuariosSection, VentasSection, HerramientasSection, ColaboradoresLeads)
    Admin/TextureLabPage.jsx      ← laboratorio de texturas (sube/gestiona texturas en Supabase Storage, reemplazó los JPG estáticos de src/assets/textures)
    Admin/SalesAdminPage.jsx      ← panel de ventas/vendedores dentro de Admin
    Scanner/ScannerPage.jsx       ← scanner QR de pases de invitados
    Lia/                          ← chat de Lia (Lia.jsx, liaApi.js con headers y lector SSE); lo monta ChatContainer en /dashboard/*
    PreviewMood/                  ← preview de estilo/mood antes de comprar
    Extras/                       ← Legal, LinkTree, PageNotFound

  /modules
    Header/, Footer/              ← layout compartido
    Invitation/Build/              ← constructor de la invitación (secciones, edición en vivo)
    GuestManagement/               ← listado de invitados, tablas (mesas/asientos), mensajes de WhatsApp
    SideEvents/                    ← creación y gestión de side events

  /components
    PhotoWall/PhotoWall.jsx       ← masonry grid en tiempo real (Supabase directo + Storage)
    Payment/                       ← Stripe checkout, créditos, banners de upgrade
    Create/                        ← flujo de creación de invitación nueva (drawer, CRUD de invitados, cálculo de tier)
    Auth/                          ← login / creación de usuario
    ChatContainer/                  ← UI de chat de Lia
    Invitation/, BuildMenu/         ← piezas del builder de invitación
    QRHandler/, Gift/, Plans/, RegalaIAttend/, AdsCarousel/, UserPopUp/, NotificationCard/, Helpers/, ImagesStorage/, CustomButton/, CustomLink/, Host/

  /helpers
    invitation/                    ← transformación y tipos de la invitación
    assets/                        ← fuentes, imágenes, features de la app
    assets/eventDateTime.js        ← horas de side events/pop events como string "wall-clock" (YYYY-MM-DD HH:mm:00), sin conversión de timezone; ver convención abajo
    services/                      ← paletas de color, texturas, mensajes, subida de imágenes, íconos de menú

  /services                        ← llamadas API legacy con patrón "operation" callback (apiLogin, apiInvitation, apiWeather)
  /lib/supabase.js                 ← cliente único de Supabase
  /hooks/customHook.js              ← hook legacy de fetch (weather API)
  /locales/{es,json}.json           ← traducciones i18n
  /styles/**                        ← CSS global legacy (no CSS Modules) para páginas antiguas
```

## Convenciones y patrones que hay que respetar
- Componentes en PascalCase, un archivo `.jsx` por componente.
- CSS Modules: clases en camelCase, archivo `ComponentName.module.css` — este es el patrón a seguir en código **nuevo**. Las páginas antiguas que aún usan CSS global en `src/styles/**` no se están migrando activamente, pero tampoco hay que romper esa convención al tocarlas puntualmente.
- Sin TypeScript — JS puro; usar PropTypes solo si aporta validación real.
- Ant Design para tablas, modales, botones de acción y formularios; Lucide React para iconos decorativos/navegación (20px).
- Nada de llamadas centralizadas a un cliente axios propio — los componentes nuevos hacen `axios.post/get` inline contra `${import.meta.env.VITE_API_URL}/api/...`. No reintroducir el patrón `operation` callback de `src/services/` en código nuevo.
- Contextos disponibles y su propósito: `LiaProvider` (asistente + notificaciones + créditos), `AppProvider`/`AuthProvider` (sesión), `AntdProvider` (tema Ant Design), `DashboardRealtimeProvider` (Realtime, solo dentro de las rutas `/dashboard/*`), `TexturesContext` (texturas del Texture Lab), `VendorSessionContext` (sesión de vendedores, solo dentro de `modules/Sales/`, no confundir con `AuthContext`).
- Horas de side events/pop events (`data.body.hour`, `data.information.date` en Supabase): se guardan y leen como string "wall-clock" plano (`YYYY-MM-DD HH:mm:00`), **nunca** se convierten con timezone — ver `src/helpers/assets/eventDateTime.js`, cuya contraparte de lectura vive en `iattend-events/src/helpers/functions.ts`. Datos legados (antes de este cambio) sí son instantes UTC reales y necesitan reconvertirse con el mapa `STATE_TIMEZONES` (BC, BCS, Sonora, Sinaloa, Quintana Roo tienen huso distinto al de CDMX). No reintroducir conversión de timezone en código nuevo que toque estas fechas.
- Dentro de `/dashboard/*`, suscribirse a cambios de tablas vía `useDashboardRealtime().subscribe(table, cb)` en vez de abrir un canal Supabase propio — evita canales duplicados. La excepción documentada es `PhotoWall`, que gestiona su propio canal para `event_photos`.
- i18n con `react-i18next`; textos con keys namespaced (ej. `guests.notification_title`) en `src/locales/{es,en}.json`.
- ESLint: `no-unused-vars` permite constantes en MAYÚSCULAS sin usar; las reglas `exhaustive-deps`, `set-state-in-effect` y `preserve-manual-memoization` de `react-hooks` están desactivadas — no asumir que el linter las va a atrapar.

## Design system
Existe una skill de proyecto (`.claude/skills/iattend-design-system/`) con los colores, tipografías, radios, sombras y patrones de componentes reales de I attend (marca vs. producto). Se activa automáticamente al construir mockups, pantallas o componentes nuevos — no dupliques esos valores aquí, consulta la skill.

## Rutas / páginas principales
| Ruta | Qué hace | Componente principal |
|---|---|---|
| `/`, `/invitations` | Listado de invitaciones del usuario logueado | `InvitationsPage` |
| `/dashboard` | Dashboard principal del organizador | `DashboardPage` |
| `/dashboard/build` | Constructor/editor de la invitación | `BuildPage` |
| `/dashboard/guests` | Gestión de invitados y mesas | `GuestsPage` |
| `/dashboard/side` | Side events | `SideEvents` |
| `/dashboard/photowall` | Photo Wall en vivo (privilegios de organizador) | `PhotoWallPage` |
| `/dashboard/success` | Pantalla de éxito post-acción dentro del dashboard | `Success` |
| `/checkout` | Checkout de compra (planes, créditos, side events) | `CheckoutPage` |
| `/login` | Login / registro | `Login` |
| `/scanner` | Scanner QR de pases de invitados | `ScannerPage` |
| `/luma` | Lia a pantalla completa (nombre histórico de la ruta; Luma ya no existe) | `Lia` |
| `/preview` | Preview de estilo antes de comprar | `PreviewMoodPage` |
| `/features` | Landing de features | `FeaturesPage` |
| `/linktree` | Link tree público | `LinkTree` |
| `/legal` | Aviso legal / proveedores de terceros | `LegalPage` |
| `/admin` | Panel de administración (rol `Administration`) | `AdminPage` (protegido por `AdminHOC`) |
| `/*` | 404 | `PageNotFound` |

Nota: las rutas de tipo invitación pública (`/wedding/:x`, `/xv/:x`, `/bap/:x`, `/kids/:x`, `/event/:x`, `/party/:x`, `/side-event/:id`) se redirigen a `iattend.events` a nivel de `vercel.json`, antes de llegar a este router.

## Comandos frecuentes
```bash
# instalar
npm install

# correr en dev (puerto fijo 3000, strictPort: falla si está ocupado en vez de cambiar de puerto)
npm run dev

# build
npm run build

# preview del build
npm run preview

# lint
npm run lint

# tests: no hay suite de tests configurada en este repo
```

## Variables de entorno que necesita
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SPOTIFY_CLIENT_ID`
- `VITE_SPOTIFY_CLIENT_SECRET`

## Cosas que hay que saber antes de tocar este repo (gotchas)
- El Photo Wall en este proyecto tiene privilegios de **organizador**: descarga de fotos individuales y eliminación. La descarga usa la `public_url` de Supabase Storage directo; la eliminación llama a `DELETE /api/photos/:photo_id` en el backend. Mostrar siempre nombre del invitado y hora de captura, y mantener contador/timestamp en tiempo real. No duplicar lógica de compresión aquí — el organizador no sube fotos desde esta app.
- Supabase se llama directo desde ~20 componentes del frontend con la anon key (no solo desde el backend) — cualquier cambio de RLS/políticas en Supabase impacta directo a estos componentes, no solo al backend.
- Conviven dos convenciones de estilos (CSS Modules vs. CSS global en `src/styles/**`) sin plan de migración activo — no es un error, es el estado real del repo.
- `src/services/apiInvitation.js` y `apiLogin.js` son código legacy con un patrón `operation` callback; la mayoría de las llamadas nuevas al backend se hacen con `axios` inline en cada componente, no vía estos services.
- `PRICE_IDS` de Stripe están hardcodeados en `src/components/Payment/functions.js` — hay que actualizarlos ahí manualmente si cambian en Stripe.
- Lo que incluye cada plan (créditos, side events, si puede comprar side events sueltos, features ES/EN, price de Stripe) vive en la tabla `plans` y se edita en **Admin → Configuración → Planes** (`pages/Admin/sections/PlanesSection.jsx`, vía `/api/admin/plans`). La app lo lee con `usePlans()` (`src/hooks/usePlans.js`, que pide `GET /api/plans`); la landing de `iattend-next` lee el mismo endpoint. **No** volver a hardcodear "300 créditos" / "3 side events". Qué planes ofrece cada pantalla también sale de ahí (`show_landing` / `show_checkout` / `show_app`, vía `plansFor(surface)`): no volver a filtrar planes por id ni por `PRODUCTS` en el checkout, el alta de invitación o el `PlansModal`. Lo incluido se copia a cada invitación al crearla (`invitations.credits_included`, `invitations.side_events_included`): el tope real de side events de una invitación es esa columna, no el plan. Ver `iattend--backend/migrations/2026-09-25_create_plans_catalog.sql`.
- Meses sin intereses: cada plazo es un price propio en Stripe (`lite_msi_3`, `pro_msi_12`, …) y llega en `plan.installments` de `GET /api/plans`; qué plazos tiene cada plan vive en `iattend--backend/config/stripe.installments.js`. El front manda `lookupKey`, nunca el price de MSI. Checkout Session no puede fijar el plazo: el webhook avisa si no coincide. Ver `docs/meses-sin-intereses.md`.
- El puerto de dev está fijo en 3000 con `strictPort: true` (`vite.config.js`) — si el puerto está ocupado, Vite falla en vez de tomar otro.
- `src/services/apiWeather.js` tiene una API key de OpenWeatherMap hardcodeada en el código fuente del frontend (queda expuesta en el bundle).
- `dist/` está en `.gitignore` (no se commitea), pero puede existir localmente con un build viejo — no confundir con el código fuente.
- Publicar la invitación va por el RPC `publish_invitation` (`BuildPage.jsx`), **no** por un UPDATE directo a `invitations.data` — eso es lo que genera la fila en `invitation_versions`. Los campos top-level que no son contenido (ej. `rsvp_deadline` en `GuestsPage.jsx`) se actualizan directo, a propósito, para no ensuciar el historial. Ver `docs/historial-versiones.md`.
- Leer una tabla nueva desde el frontend con la anon key puede fallar con `permission denied for table` (42501) aunque tenga RLS y policy: es un error de **GRANT**, que Postgres revisa antes que las policies. Pasó con `invitation_versions`; el fix está al final de `supabase-event-feedback-migration.sql`. Ver `docs/reviews-feedback.md`.
- `/dashboard/guests` ya **no** usa una tabla con columnas: `GuestsPage.jsx` dibuja tarjetas fluidas y cada tab arma su propia acción (`renderCreatedAction` / `renderSentAction` / `renderTableAction`). El sistema de `columns`/`getTabColumns`/`tableProps` se eliminó — no reintroducirlo. Ver `docs/rediseno-gestion-invitados.md`.
- Los tokens `--gx-*` del rediseño de invitados viven en `:root` (`guests-redesign.css`), **no** en `.gx`: los popups de Ant Design se portalean a `<body>` y ahí las variables locales no resuelven.
- Los botones deshabilitados del rediseño usan `aria-disabled`, no `disabled`: un `<button disabled>` no emite eventos de mouse y el Tooltip con el motivo del bloqueo nunca se vería.
- `FloatButton` de Ant Design v6 no expone `size`, y posiciona su menú asumiendo un trigger de 40px más un `translateY(40px)` en reposo. `MobileActionsFab.module.css` compensa eso a mano — revisar esa regla al actualizar antd.
- El onboarding wizard ("Conoce I attend", `pages/PreviewMood/OnboardingWizard.jsx`, usado en `/checkout`, `/invitations` y `/preview`) lee sus slides de la tabla `onboarding_slides` (Admin → Configuración → Onboarding, `/api/admin/onboarding-slides`) vía `useOnboardingSlides()` en `onboardingSlides.js`, con `DEFAULT_SLIDES` como respaldo. Cada slide trae textos, orden, visibilidad y `exclusive_plan` (badge "Exclusivo en PRO"); su `kind` elige la demo interactiva. No volver a escribir textos de slides en el componente. El primer slide carga la invitación en un iframe de `iattend.events`: por eso hay portada de carga (`HostPoster`), `prewarm` en el checkout y los slides se montan solo al acercarse.
- Los reportes del botón de soporte (`modules/Header/SupportTicketModal.jsx`) van a `POST /api/support/tickets`, que los guarda en `support_tickets` **y** manda el correo a soporte. No volver a mandarlos directo a `/api/mail/send-mail`: se perderían de Admin → Buzón → Reportes (`sections/NotificacionesSection.jsx`). La tabla solo la lee el backend (sin policies para anon). Ver `iattend--backend/migrations/2026-09-28_create_support_tickets.sql`.
- Lia en el dashboard: el chat consume `POST /api/ai/chat` con `stream: true` (SSE: `text`, `tool_start`, `replace`, `done`, `error`), manda `lang` y corta con `AbortController` al cerrar o a los 60 s. Si el plan incluye Lia lo decide el backend (`lia_included` del saludo, feature `lia` en `plans.features`), no una comparación con `'pro'`. Textos en `lia.*` de los locales; los atajos (`lia.prompts`) también los usa la analítica (`esAtajoDeLia`) para separar clics de preguntas escritas.
- Las rutas de Lia del organizador (`/api/ai/greeting`, `/chat`, `/chat/*`, `/credits/:id`) piden `Authorization: Bearer` con la sesión de Supabase (`src/pages/Lia/liaApi.js`) y el backend valida dueño/planner/admin de la invitación. Las tablas `ai_conversations`, `ai_agent_logs`, `ai_daily_usage` y `ai_pending_actions` **no** se leen con la anon key: la analítica va por `GET /api/admin/lia/datos` (`fetchDatosLiaAdmin` en `catalogoAdminApi.js`). Ver `iattend--backend/migrations/2026-09-29_cerrar_tablas_lia.sql`.
- Dashboard del planner (`components/PlannerDashboard/`, pestaña "Dashboard" de `/invitations` para `role === 'planner'`): las **notas** y los **eventos personales** de la agenda van directo a Supabase (`planner_notes`, `planner_agenda_events`, RLS `planner_id = auth.uid()`) vía `usePlannerNotes.js`; solo la preferencia de la línea de tiempo queda en `localStorage`. Ver `iattend--backend/migrations/2026-09-30_create_planner_notes.sql`. Los pendientes salen de `buildPending` en `plannerData.js`.
- El sistema de traducciones de la invitación (DeepL + tablas Supabase `copy_bundles`/`copy_translations`/`invitation_translations`) **no vive en este repo** — vive enteramente en `iattend-events` (`src/lib/translation/`). Este repo no llama a DeepL ni lee esas tablas.

## Pendientes / deuda técnica conocida
- `src/components/RegalaIAttend/RegalaIAttend.jsx:129` tiene un TODO sin resolver ("enviar regalo").
- API key de OpenWeatherMap expuesta en el frontend (`src/services/apiWeather.js`) — candidato a mover al backend.
- Patrón legacy `operation` callback en `src/services/` (apiLogin.js, apiInvitation.js) sin usar de forma consistente — candidato a limpieza o eliminación si ya no se usa en ningún flujo activo.
- Sin suite de tests (no hay `test` script ni framework de testing configurado, pese a tener `@testing-library/user-event` como dependencia).
- `invitation_versions` acumula historial que no se puede ver ni restaurar desde la app — no hay UI. Ver `docs/historial-versiones.md`.
- El flujo de "Ahora no" de las reviews está en el esquema (`status='skipped'`, `skip_count`, reintento a 3 días) pero no implementado en el frontend: el modal no tiene botón de descarte y nada escribe esos campos. Ver `docs/reviews-feedback.md`.
