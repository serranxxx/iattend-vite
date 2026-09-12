# Catálogo de invitaciones en `/admin` — documentación de estado real

> Implementado el 2026-09-03 en una sesión iterativa con Alberto.
> Commit principal en `iattend-vite`: `7dcf3eb` (rama `site-guests-design`).
> **El backend vive en `iattend--backend` y se commitea aparte** — sin esos
> endpoints desplegados, el catálogo no carga en producción.

## Qué es

Herramienta interna del panel de admin para **ver todas las invitaciones
históricas** de I attend (separadas en clientes reales y tests) y **crear
copias selectivas** de cualquiera de ellas hacia una invitación de tests,
eligiendo qué módulos de contenido y qué aspectos de estilo llevarse. La
copia se revisa en el builder y solo se persiste si el usuario da "Guardar
cambios".

**Dónde vive:** `/admin` → sección **Laboratorio** (`?tab=herramientas`) →
subtab **Catálogo** (`&subtab=catalogo`). Hereda el guard `AdminHOC` + rol
`Administration` del panel completo.

## Archivos

| Repo | Archivo | Qué es |
|---|---|---|
| `iattend--backend` | `controllers/adminInvitaciones.js` | Listado + data de una invitación |
| `iattend--backend` | `router/adminInvitaciones.js` | Rutas, montado en `index.js` bajo `/api/admin` |
| `iattend-vite` | `src/pages/Admin/catalogoAdminApi.js` | Cliente axios (patrón `salesAdminApi.js`) |
| `iattend-vite` | `src/pages/Admin/CatalogoInvitaciones/CatalogoInvitaciones.jsx` + `.module.css` | Grid, modal y flujo de copia |
| `iattend-vite` | `src/pages/Admin/sections/HerramientasSection.jsx` | Registro del subtab + Segmented Clientes/Tests |
| `iattend-vite` | `src/modules/Invitation/Build/PageSections/BuildPage.jsx` | Soporte de `?copyFrom=` (copia en memoria) |

## Hallazgos de la Fase 0 (verificados en código, no asumidos)

### `/host` funciona por postMessage (Camino B del handoff)

`iattend-events/src/app/host/HostClient.tsx` **no** resuelve invitaciones
por URL: renderiza `null` hasta recibir `HOST_PROPS` con el `data` completo
por `postMessage`, tras emitir `REMOTE_READY` al padre. El handshake ya
existía completo en `src/components/Host/ReactHost.jsx` (lo usan el builder
y LinkTree) y el catálogo lo reutiliza tal cual vía `BuildContent`.
Consecuencia: el listado del backend **no devuelve `data`**; hay un segundo
endpoint que trae el `data` de una sola invitación al abrirla.

### Fórmula de la portada

El renderizador real (`Cover.tsx` en `iattend-events`) solo aplica
`transform: scale(zoom)` sobre imagen full-bleed con `object-fit: cover`
centrada. **`position.x/y` no se usa en ningún lado del renderizador** (solo
en la UI de recorte del builder). Las tiles replican exactamente eso.
Además `cover.image.prod` puede ser **string o array** (carrusel de
portada) — se usa el primer elemento válido — o `null` (placeholder).

## Backend

Patrón copiado de `adminVentas.js` + middleware `validar-admin` (Bearer
token de sesión Supabase + rol `Administration` en `profiles`). **Read-only:
este módulo no tiene ningún endpoint de escritura.**

| Endpoint | Qué devuelve |
|---|---|
| `GET /api/admin/invitaciones?limit=30&offset=0&tipo=reales` | `{ ok, total, limit, offset, invitations[] }` con `id, label, name, plan, active, started, created_at, user_email, event_date, owners, owner_name, cover_image, cover_zoom, cover_position`. Las llaves de portada se extraen del jsonb en el select — nunca viaja `data` completo. `owner_name` viene de `profiles.full_name` resuelto por `user_id` (que no se expone). Orden `created_at` desc, `limit` max 100. |
| `GET /api/admin/invitaciones/:invitation_id/data` | `{ ok, id, data }` — el `data` completo de una invitación. 404 si no existe. |

**Filtro `tipo=reales|pruebas`** (opcional; sin él trae todas): una
invitación es **de prueba** cuando su owner tiene `profiles.role` en
`sales` / `test` / `Administration`; **real** es todo lo demás (role NULL,
sin perfil, o `user_id` nulo). Se filtra en el servidor para que la
paginación nunca mezcle. Al implementarse: 49 reales + 24 tests = 73.

## Frontend

### Grid de portadas

- Segmented **Clientes / Tests** (radius 99px, iconos lucide
  Users/FlaskConical, margin-bottom 8px) en el `tabBarExtraContent` de las
  tabs de Laboratorio — `HerramientasSection` es dueño del estado y lo baja
  como prop `tipo`; solo visible en el subtab Catálogo. Cambiarlo recarga
  el grid. La tab **Imágenes** de Laboratorio se eliminó (era un
  "Próximamente").
- **Grid de 4 columnas** (3/2/1 en pantallas menores) que carga TODAS las
  portadas del tipo activo (pagina internamente con `limit=100` hasta el
  total). Tiles sin sombra ni borde, `border-radius: 0`, `aspect-ratio:
  390/844`, portada con `scale(zoom)`, overlay inferior con `label/name` +
  plan + fecha de creación, overlay hover "Ver invitación".

### Modal de vista previa (click en una tile)

Modal de dos paneles (`destroyOnHidden`, `closable={false}` con X propia,
`min(1100px, 94vw)`, radius 28px; se apilan en columna bajo 900px). El
`data` se trae de `/:id/data` con caché en memoria por id.

- **Panel izquierdo (crema `#F5F3F2`, 360px)**: avatar con iniciales +
  nombre del dueño + correo; banner de vigencia del `event_date` (rojo
  vencido / verde vigente / gris sin fecha, radius de tags 99px); título
  con los `owners` en Denver-Serial ("Cristina & Eduardo"); subtítulo
  "Plantilla {label} · Plan {plan}"; fila de **Enlace** público
  (`iattend.events/{label}/{name}`) con botón Copiar; y un único CTA:
  **Crear copia** (navy sólido, icono Copy, deshabilitado mientras su
  dropdown esté abierto).
- **Panel derecho (navy `#16323d`)**: pill "Vista previa · iPhone", X
  translúcida, y **`BuildContent`** (el mockup de teléfono del builder,
  mismo uso `minimalControls` que `TextureLabPage`) renderizando la
  invitación real.

### Flujo "Crear copia" (dropdown de dos páginas)

1. **Página 1 — destino**: tabla con TODAS las invitaciones de **tests**
   (carga perezosa, excluye la abierta): filas
   `nombre del usuario — nombre de la invitación — botón →`.
2. **Página 2 — picker** (título "Copiar {name origen}", flecha para
   volver; el popup sale con `placement="topLeft"`, creciendo a la
   derecha): dos grupos colapsables con chevron (**cerrados por default**,
   transición 0.3s ease con el truco `grid-template-rows: 0fr→1fr`, porque
   `height: auto` no anima), conteo en el label y padres como "seleccionar
   todos" con indeterminate. **Todo viene seleccionado por default**:
   - **Contenido (10)** — un check por módulo, se copia la información tal
     cual está en `invitations.data`: Portada (`cover`), Bienvenida
     (`greeting`), Frase (`quote`), Personas (`people`), Itinerario
     (`itinerary`), Dress code (`dresscode`), Mesa de regalos (`gifts`),
     Avisos (`notices`), Galería (`gallery`), Destinos (`destinations`).
   - **Estilos (6)** — Colores (`generals.colors`), Tipografías
     (`generals.fonts`), Texturas (`generals.texture`), Separadores
     (`generals.separator`), Orden (`generals.positions`) y Canción
     (`cover.song`; si no se llevó la Portada completa, se transplanta solo
     la canción).
3. El CTA **Copiar estilos** (icono Palette, `min-height: 32px`) abre en
   pestaña nueva:
   `/dashboard/build?id={test_id}&copyFrom={source_id}&copyContent=a,b,c&copyStyles=x,y`
   (origen relativo — funciona en dev y prod; los params de lista se omiten
   si el grupo quedó vacío).

### `BuildPage` + `?copyFrom=`

Al terminar de cargar la invitación destino, trae el `data` de la origen
(lectura directa a Supabase), copia los módulos seleccionados tal cual (con
el mirror dev←prod de `withDevMirror`), aplica los aspectos de estilo sobre
`generals`, marca `saved=false` y avisa con un toast. **No persiste nada**:
el usuario revisa en el builder y decide con "Guardar cambios". Sin
`copyContent`/`copyStyles` → copia completa (compat).

**`generals.event`** (`name`/`label`) **nunca se copia**: es la
identidad/URL pública del destino; copiarla dejaría el `data` inconsistente
con las columnas `label`/`name` de su fila.

## Gotchas

1. **Espejo dev/prod obligatorio**: `/host` renderiza con `dev=true` y lee
   `cover.image.dev`, `quote.image.dev`, `dresscode.dev`, `gallery.dev`,
   que en la data guardada vienen `null`. El catálogo replica el mismo
   espejo `dev ← prod` de `BuildPage`/`TextureLabPage` (`mirrorDevData`).
   Sin esto el host truena.
2. **Orígenes permitidos por `/host` (prod)**: `localhost:3000`,
   `localhost:3001`, `www.iattend.mx`, `www.iattend.site`. En dev el
   preview solo renderiza con vite en 3000/3001 — en 3050 (el puerto del
   launch.json de Claude) el iframe queda en blanco.
3. `label`/`name` pueden ser `null` (sin publicar) → "Sin publicar" y el
   Enlace/Copiar deshabilitados. `cover_image` `null` → placeholder.
4. **BuildContent monta dos iframes** (web + mobile, uno oculto por CSS
   según viewport) — comportamiento normal del builder, no un bug. Con
   `destroyOnHidden` ambos se desmontan al cerrar el modal.
5. **antd v6**: el contenedor del modal es `.ant-modal-container`
   (`.ant-modal-content` ya no existe) — el radius/padding se fuerzan ahí.
   El slider de zoom de BuildContent se oculta con CSS scoped
   (`.previewStage .tools-settings-menu-container { display: none }`) sin
   tocar BuildContent, que es compartido con el builder.
6. `event_date` viene como **medianoche UTC**: se formatea con solo la
   parte de fecha (`slice(0,10)`) — convertirla a hora local mostraría un
   día antes.
7. Las imágenes copiadas apuntan al **storage del origen**
   (`user_images/{source_id}/...`): la copia comparte assets, no los
   duplica. Aceptado en esta fase.

## Historial de decisiones de Alberto (misma sesión, 2026-09-03)

1. Carrusel horizontal con un solo iframe (según handoff §2) → primero con
   activa al centro, luego activa a la izquierda, tarjetas escaladas con
   `transform: scale` para no deformar el viewport de 390px.
2. Se descartó el carrusel por **grid de 4 columnas + modal** con
   BuildContent (esto es lo vigente).
3. Filtros iniciales (Todas/Activas/Iniciadas/Con portada) → **Reales /
   Pruebas** server-side → renombrado **Clientes / Tests** y movido al tab
   bar.
4. Info del dueño: toolbar → header dentro de la tarjeta → panel izquierdo
   del modal (diseño mockup de Alberto). Sin estadísticas ("eso no sirve").
5. Botón de opciones: kebab por tarjeta → botón `+` en el modal →
   eliminado. Botones "Abrir invitación" y "Crear copia (deshabilitado)"
   también eliminados: queda un único CTA **Crear copia**.
6. "Copiar estilos": primero transplante de solo-estilos (helper
   `applyInvitationStyles`, eliminado) → "llévate todo, copia tal cual" →
   **picker selectivo** por módulo/aspecto (lo vigente).

## Pendientes

- **§0.6 del handoff (`catalog_visible`)**: no implementado; decidir si el
  catálogo algún día sale de `/admin`.
- **Backend sin commitear/desplegar**: `controllers/adminInvitaciones.js`,
  `router/adminInvitaciones.js` y la línea en `index.js` de
  `iattend--backend`.
- **Verificación con sesión real**: el tramo final del copiado (toast +
  copia visible en el builder) requiere sesión Supabase real — el arnés de
  verificación no puede loguearse. La lógica de merge se probó en Node
  contra la base real (copia completa, parcial, solo-estilos y
  canción-sin-portada) y todo el resto de la UI quedó verificado en
  navegador contra datos reales.
- "Guardar cambios" de una copia **no duplica assets** ni traducciones
  (`invitation_translations` del origen no se tocan) — si eso importa, es
  fase siguiente.
