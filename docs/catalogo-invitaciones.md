# Catálogo de invitaciones — visor read-only en `/admin` (estado real)

> Implementado 2026-09-03. Fase de solo visualización: no se copia nada,
> no se escribe en `invitations` ni en `invitation_versions`.

## Qué es

Carrusel horizontal en el panel de admin que muestra todas las invitaciones
históricas de I attend. Cada tarjeta tiene proporción de celular; la tarjeta
activa puede montar la invitación real (vía `/host` de `iattend-events`) y
scrollearla verticalmente. Propósito: ver estilos pasados para inspirarse.

**Dónde vive:** `/admin` → sección **Laboratorio** (`?tab=herramientas`) →
subtab **Catálogo** (`&subtab=catalogo`). Hereda el guard `AdminHOC` + rol
`Administration` del panel completo.

## Resolución de las incógnitas del handoff

### §0.1 — Cómo recibe `/host` la invitación: **Camino B** ✅

`/host` (`iattend-events/src/app/host/HostClient.tsx`) **no** resuelve nada
por URL: renderiza `null` hasta recibir un `postMessage` `HOST_PROPS` con
`payload.invitationConfig` completo, después de emitir `REMOTE_READY` al
padre. No lee Supabase por su cuenta.

No hubo que implementar el handshake: `iattend-vite` ya lo tiene completo en
`src/components/Host/ReactHost.jsx` (el mismo que usan el builder y
LinkTree). El catálogo lo reutiliza tal cual: `<ReactHost config={data} />`.

Consecuencia en el backend: el listado **no** devuelve `data`; hay un
segundo endpoint que trae el `data` completo de una sola invitación y se
llama al montar el iframe.

### §3.3 — Fórmula de la portada ✅

El renderizador real (`iattend-events/src/components/Invitation/Cover/Cover.tsx`)
solo aplica **`transform: scale(zoom)`** sobre un contenedor full-bleed con
la imagen en `object-fit: cover` centrada. **`position.x/y` no se usa en
ningún lado de `iattend-events`** — solo lo usa la UI de recorte del builder
(`BuildCover.jsx`). La tarjeta del carrusel replica exactamente eso:
`background-size: cover` + `background-position: center` + `scale(zoom)`.
El endpoint devuelve `cover_position` por si algún día el renderizador lo
usa, pero la UI lo ignora a propósito.

Otro hallazgo: `cover.image.prod` puede ser **string o array** (carrusel de
portada). La tarjeta usa el primer elemento válido.

## Backend (`iattend--backend`)

Patrón copiado de `adminVentas.js` + `validar-admin.js`:

- `controllers/adminInvitaciones.js`
- `router/adminInvitaciones.js`, montado en `index.js` bajo `/api/admin`

| Endpoint | Qué devuelve |
|---|---|
| `GET /api/admin/invitaciones?limit=30&offset=0&tipo=reales` | `{ ok, total, limit, offset, invitations[] }` con `id, label, name, plan, active, started, created_at, user_email, event_date, owner_name, cover_image, cover_zoom, cover_position` (llaves de portada extraídas del jsonb en el select — nunca `data` completo; `owner_name` viene de `profiles.full_name` resuelto por `user_id`, que no se expone en la respuesta). Orden: `created_at` desc. `limit` max 100. `tipo=reales\|pruebas` (opcional; sin él trae todas): **prueba** = el owner tiene `profiles.role` en `sales`/`test`/`Administration`; **real** = todo lo demás (role NULL, sin perfil, o `user_id` nulo). Se filtra en el servidor para que la paginación no mezcle. |
| `GET /api/admin/invitaciones/:invitation_id/data` | `{ ok, id, data }` — el `data` completo de una invitación. 404 si no existe. |

Ambos con `validarAdmin` (Bearer token de sesión Supabase + rol
`Administration` en `profiles`). Read-only: este módulo no tiene ningún
endpoint de escritura.

## Frontend (`iattend-vite`)

- `src/pages/Admin/catalogoAdminApi.js` — mismo patrón que `salesAdminApi.js`.
- `src/pages/Admin/CatalogoInvitaciones/CatalogoInvitaciones.jsx` + `.module.css`.
- Registro: subtab `catalogo` en `sections/HerramientasSection.jsx`
  (el botón "Crear" del header se oculta en ese subtab).

### Modelo de interacción

> Nota histórica: el §2 del handoff pedía un carrusel con montaje al click y
> un solo iframe. Se implementó así primero, pero Alberto lo cambió
> (2026-09-03) por un **grid + modal**, que es lo vigente.

- **Grid de 4 columnas** (3/2/1 en pantallas menores) con TODAS las
  portadas cargadas de una vez (el componente pagina internamente contra el
  endpoint con `limit=100` hasta traer el total). Tiles sin sombra, sin
  borde y con `border-radius: 0`, `aspect-ratio: 390/844`, portada con la
  fórmula `scale(zoom)` + overlay inferior con `label/name`, plan y fecha
  de creación, y overlay de hover "Ver invitación".
- **Click en una tile → Modal de dos paneles** (`destroyOnHidden`,
  `closable={false}` con X propia, `min(1100px, 94vw)`; se apilan en
  columna bajo 900px):
  - **Panel izquierdo (crema `#F5F3F2`, 360px)**: avatar con iniciales +
    nombre del dueño (`profiles.full_name`) + correo. (El botón `+` con
    dropdown que existió aquí se eliminó a petición de Alberto — con él se
    fueron "Acceder al evento" y "Copiar id".) Debajo: banner de vigencia del
    `event_date` (rojo vencido / verde vigente / gris sin fecha; solo la
    parte de fecha — `slice(0,10)` — porque viene como medianoche UTC y
    convertirla a local mostraría un día antes), título con los `owners`
    ("Cristina & Eduardo", Denver-Serial), subtítulo "Plantilla {label} ·
    Plan {plan}", fila de **Enlace** público con botón Copiar, y abajo un
    único CTA: **Crear copia** (navy sólido, icono Copy) que abre el
    dropdown del flujo de copiado y queda deshabilitado mientras el
    dropdown esté abierto; el botón de confirmación dentro del picker es
    **Copiar estilos** (icono Palette, `min-height: 32px`). Los botones "Abrir
    invitación" y el "Crear copia" deshabilitado anteriores se eliminaron.
    Sin estadísticas — decisión de Alberto ("eso no sirve").
  - **Panel derecho (navy `#16323d`)**: pill "Vista previa · iPhone", botón
    X translúcido, y **`BuildContent`** (mockup de teléfono del builder,
    mismo uso `minimalControls` que `TextureLabPage`) con el `data` de la
    invitación (fetch con caché en memoria por id). BuildContent trae su
    propio zoom/pan y monta dos ReactHost (web + mobile, comportamiento
    propio del builder). Su slider de zoom se oculta con CSS scoped
    (`.previewStage .tools-settings-menu-container { display: none }`) —
    no se toca BuildContent, que es compartido con el builder. El radius
    del modal (28px) se fuerza sobre `.ant-modal-container` (la clase de
    antd v6; `.ant-modal-content` ya no existe).
  - El endpoint de listado devuelve también `owners` para el título.
- Filtro (Segmented redondo, radius 99px, iconos lucide Users/FlaskConical,
  margin-bottom 6px): **Clientes / Tests**, default Clientes. Vive en el `tabBarExtraContent` de las tabs de Laboratorio
  (`HerramientasSection` es dueño del estado y lo pasa como prop `tipo`),
  solo visible en el subtab Catálogo. Sigue siendo server-side con los
  valores `reales`/`pruebas` del endpoint; cambiarlo recarga el grid.
  Clientes y tests nunca se mezclan (hoy: 49 clientes + 24 tests = 73).
- La tab **Imágenes** de Laboratorio se eliminó (era un "Próximamente").

### Copiar estilos = copia COMPLETA (2026-09-03)

> Primero se implementó como transplante de solo-estilos, pero Alberto lo
> cambió el mismo día: "Necesito que te lleves todo, fotos, textos,
> itinerario, una copia tal cual". El helper `applyInvitationStyles` se
> eliminó.

- En el modal, **Copiar estilos** abre un dropdown-tabla con TODAS las
  invitaciones de **tests** (`tipo=pruebas`, carga perezosa al abrir, se
  excluye la invitación abierta): filas `nombre del usuario — nombre de la
  invitación — botón →`.
- El botón `→` NO abre el builder directo: cambia el popup a un **picker de
  qué llevar** (título "Copiar {name de la invitación origen}", popup
  alineado a la izquierda del botón — `placement="topLeft"`, crece hacia la
  derecha). Todo seleccionado por default; los padres funcionan como
  "seleccionar todos" con estado indeterminate y cada grupo muestra su
  conteo — "Contenido (10)" / "Estilos (6)" — con un **chevron** para
  colapsar/expandir sus hijos (**cerrados por default**, con transición
  suave 0.3s ease vía el truco `grid-template-rows: 0fr→1fr` — `height`
  con `auto` no anima). El CTA de confirmación dice "Copiar estilos" con
  icono Palette (44px, no small):
  - **Contenido** — un check por módulo, se copia la información tal cual
    está en `invitations.data`: Portada (`cover`), Bienvenida (`greeting`),
    Frase (`quote`), Personas (`people`), Itinerario (`itinerary`),
    Dress code (`dresscode`), Mesa de regalos (`gifts`), Avisos (`notices`),
    Galería (`gallery`), Destinos (`destinations`).
  - **Estilos** — Colores (`generals.colors`), Tipografías
    (`generals.fonts`), Texturas (`generals.texture`), Separadores
    (`generals.separator`), Orden (`generals.positions`) y Canción
    (`cover.song` — vive dentro de cover; si no se llevó la Portada
    completa, se transplanta solo la canción).
- "Abrir en el builder" abre en pestaña nueva:
  `/dashboard/build?id={test_id}&copyFrom={source_id}&copyContent=a,b,c&copyStyles=x,y`
  (origen relativo, funciona en dev y prod; los params de lista se omiten si
  el grupo quedó vacío).
- `BuildPage` lee esos params: al terminar de cargar la invitación destino,
  trae el `data` de la origen (lectura directa Supabase), copia los módulos
  seleccionados tal cual (con mirror dev←prod) y aplica los aspectos de
  estilo seleccionados sobre `generals`, marcando `saved=false` con un
  toast. **No persiste nada**: el usuario revisa y decide con "Guardar
  cambios". Sin `copyContent`/`copyStyles` → copia completa (compat).
- **`generals.event`** (`name`/`label`) nunca se copia: es la identidad/URL
  pública del destino y copiarla dejaría el `data` inconsistente con las
  columnas `label`/`name` de su fila. Merge verificado con dos invitaciones
  reales (parcial, solo-estilos, completa y canción-sin-portada).
- Ojo: las URLs de imágenes copiadas apuntan al storage del origen
  (`user_images/{source_id}/...`) — la copia comparte assets, no los
  duplica. Aceptado en esta fase.
- Verificación pendiente de Alberto: el último tramo (toast + copia visible
  en el builder) requiere sesión real de Supabase — el arnés de verificación
  de Claude no puede loguearse; la transformación se probó en Node con
  datos reales.

### Gotchas que hay que conocer

1. **Espejo dev/prod obligatorio**: `/host` renderiza con `dev=true` y lee
   `cover.image.dev`, `quote.image.dev`, `dresscode.dev`, `gallery.dev`, que
   en la data guardada vienen `null`. El catálogo replica el mismo espejo
   `dev ← prod` que arman `BuildPage.jsx` y `TextureLabPage.jsx`
   (`mirrorDevData` en el componente). Sin esto el host truena.
2. **Orígenes permitidos por `/host` (prod)**: `localhost:3000`,
   `localhost:3001`, `www.iattend.mx`, `www.iattend.site`. En dev, el iframe
   solo renderiza si vite corre en 3000 o 3001 — en 3050 (el puerto del
   launch.json de Claude) el iframe queda en blanco. En prod no hay problema.
3. `label`/`name` pueden ser `null` (invitaciones sin publicar) → la
   metadata muestra "Sin publicar". `cover_image` `null` → placeholder.
4. **BuildContent monta dos iframes** (uno para `web-devices` y otro para
   `mobile-devices`, uno oculto por CSS según viewport) — es su
   comportamiento normal en el builder, no un bug del catálogo. Con el
   modal `destroyOnHidden`, al cerrar se desmontan ambos.

## Decisiones tomadas con el default sugerido (pendientes de confirmar con Alberto)

- **§0.2 (qué entra al catálogo):** ✅ resuelto por Alberto (2026-09-03):
  entran todas, pero separadas en Reales / Pruebas sin mezclarse (prueba =
  owner con role `sales`/`test`/`Administration`). Ya no es un default.
- **§0.3 (volumen):** paginado `limit`/`offset`, default 30. Hoy: 73 filas.
- **§0.4 (proporción):** ratio fijo de celular `390:844` en las tiles del
  grid (ancho fluido, 4 columnas); la invitación abierta renderiza dentro
  del mockup de teléfono de BuildContent.
- **§0.5 (metadata):** ✅ ampliado por Alberto (2026-09-03): en la tarjeta va
  `label/name` (URL pública), plan y fecha de creación; en la toolbar van
  nombre del dueño, correo y vigencia del evento. Sigue sin mostrarse ningún
  dato de invitados.
- **§0.6 (flag `catalog_visible`):** NO implementado, según el handoff.
  Sigue pendiente de decisión para cuando el catálogo salga de `/admin`.

## Verificación realizada

- Controllers probados contra la base real (200 con campos correctos, 404
  con id inexistente); endpoint vivo en el backend local (nodemon) responde
  401 sin token, como debe.
- UI verificada en navegador (vite en 3001 + sesión admin simulada +
  servidor de prueba local sin auth, ya desmontado): tab registrado,
  portadas y metadata correctas, montaje del iframe end-to-end contra
  `/host` de producción (la invitación real renderizó dentro de la tarjeta),
  regla de un solo iframe, botón cerrar, filtros y "Cargar más".
- Pendiente de verificar por Alberto: tacto del carrusel en iOS Safari
  (scroll anidado y gesto diagonal, §2 del handoff) — no se puede probar
  desde este entorno.
