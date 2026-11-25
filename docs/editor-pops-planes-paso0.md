# Editor de Pops por plan (Free / Pops Plus): reporte del Paso 0

> El plan de pago se llamaba "Pops Pro" en el brief; desde el 2026-11-23 se llama **Pops Plus** (código: `pops_plus`, plan `'plus'`).

Fecha: 2026-11-23. Se trazó contra el código de `iattend-vite` y `iattend--backend`. Todavía no se cambió código.
SQL propuesto (sin correr): `iattend--backend/migrations/2026-11-23c_PROPUESTA_pops_pro_plan.sql`.

## Correcciones al brief

- **Sí hay migraciones versionadas**: `iattend--backend/migrations/` tiene 70 archivos. El SQL nuevo va ahí, con el mismo formato.
- **Excel con AI para Pops ya está hecho, pero apagado**: el importador (`modules/GuestManagement/Importar/`) es el mismo para boda, side events y Pop. En un Pop se oculta a propósito con `sinExcel={esPop}` (`SideEvents.jsx:1478`). Para Plus basta con cambiar esa condición por el plan y agregar la validación en el backend (`/api/guests/import/*`).
- **Topes actuales**: 12 imágenes PNG (`MAX_STICKERS`) y 40 elementos (`MAX_ELEMENTOS`); los dibujos no cuentan (`stickersPopData.js`). La portada lleva hasta 6 fotos/videos (`MAX_FOTOS_CARRUSEL`). Los 300 asistentes son solo cuántos muestra la lista pública (`datosAsistentes.js`, `slice(0, 300)`), no un tope de personas. Ningún comentario dice que existan por rendimiento. Quitarlos por completo sí tiene riesgo en dos puntos: la imagen del link se arma con `html2canvas` sobre todos los elementos, y `body.stickers` es un solo campo jsonb que se guarda completo cada 5 s. Propuesta: en Plus subirlos (p. ej. 40 imágenes / 150 elementos), no quitarlos.

## 1. Cómo guarda hoy el editor

**Escribe directo a Supabase desde el navegador**, sin pasar por el backend:

- `saveSideEvent` (`SideEvents.jsx:2202`): primero lee `side_events.body, name`, luego `update({ name, url_image, body })` sobre `side_events`. Lo privado del modo en línea va a `side_event_acceso` (upsert).
- Invitados: insert/update directo a `side_events_guests` (`GuestsCRUD.jsx`, `SideEvents.jsx` ~2066 / 2514 / 2543). Importar va por el backend (RPC `importar_invitados`) y el registro público por `router/sideEventPublic.js`.
- Formularios: tabla `forms`, directo desde `Formularios/useFormularios.js`, con autoguardado propio (~800 ms) independiente del Pop.
- Archivos: Storage `user_images/flash-<id>/…` directo.

**Consecuencia para §6.1:** hoy no hay ninguna ruta de Express donde validar. Hay dos caminos:

- **A (elegido el 2026-11-23, ya hecho: `router/sideEventGuardar.js`, sin validar el plan todavía): mover el guardado del body de un Pop a una ruta del backend** (`PATCH /api/side-events/:id/body`). Ahí se valida con la matriz en JS y se quita a `authenticated` el permiso `update (body, url_image, name)` sobre `side_events` (ya hay grants por columna desde `2026-11-11_side_events_rls.sql`). `mezclarBody` se puede quedar en el front tal cual. La matriz vive en un archivo de vite con su gemela en el backend, el mismo patrón que `tarjetasSide.js` / `.ts`.
- B: un trigger `before update` en `side_events` que revise el body en SQL. No hay que mover el guardado, pero la matriz queda escrita en PL/pgSQL, en un tercer lugar y más difícil de mantener.

Los límites que no pasan por el editor (30 personas, 3 formularios / 2 preguntas) sí conviene ponerlos como **trigger** en `side_events_guests` y `forms`, porque se escribe en esas tablas desde 4 o 5 lugares (front, RPC de importación, registro público, backend).

## 2. Autoguardado y mezcla por campo

- `guardarAhora` (`SideEvents.jsx:3129`) guarda 5 s después del último cambio (1.5 s con alguien más dentro, máximo 30 s), con ⌘S y al salir (`handleBack`). La imagen del link se rehace aparte (`IMAGEN_LINK_MS`, 20 s).
- `mezclarBody` (`mezclarBody.js`) mezcla por campo de primer nivel: lo cambiado en esta pestaña gana y lo cambiado en otro lado se respeta. `traerRemoto` aplica en pantalla lo que otro guardó (aviso `guardado` de presencia y Realtime).
- **Riesgo que pide el §3.1:** si el plan que cuenta es el del **dueño** del Pop, todos los editores tienen el mismo plan y la mezcla no puede colar funciones Plus: una pestaña Free nunca las guarda, y lo que trae de otra ya está validado en la base. Si el plan fuera el de **quien edita**, un planner Plus guardaría funciones Plus en el Pop de un cliente Free, y el editor del cliente las traería y las volvería a guardar sin poder quitarlas. Es otra razón para usar el plan del dueño (§0.2).
- "Probando Plus" encaja aquí: `guardarAhora` revisa la matriz antes de llamar a `saveSideEvent`. Con funciones Plus en uso, no envía el body (o solo los campos sin Plus, según §0.1).

## 3. Quién puede editar un Pop

`public.puede_gestionar_side_event_fila(invitation_id, user_id, planner_id)` (`2026-11-11_side_events_rls.sql`): el dueño (`user_id`), el planner asignado (`planner_id`), quien gestiona la invitación si es de boda, y Administración (`es_admin_activo()`). Las políticas de `side_events` y (desde hoy) `side_events_guests` usan esa regla. **Borrar un Pop solo lo puede Administración** (política `side_events_gestion_delete`), así que "Borrar o archivar" es función nueva y además requiere cambiar RLS.

## 4. Espacio de archivos

- Hoy es **por Pop**: carpeta `user_images/flash-<id>/`, límite `side_events.storage_limit_mb` (10 MB base), uso con la RPC `pop_storage_usage(id)` (suma `storage.objects.metadata.size`, sin `audio/`). Se amplía con créditos del Pop (`comprar_storage_pop`, 5 créditos por MB, solo service_role; `POST /api/storage/pop-upgrade`). El material del modo en línea va al bucket privado `pop-material`, que también cuenta.
- **El tope solo lo revisa el front** (`helpers/services/storageQuota.js` → `ensureQuota`). Las políticas de Storage (`2026-11-11b_storage_carpetas_pop.sql`) revisan que la carpeta sea tuya, no cuánto ocupa. Hoy alguien puede saltarse el tope subiendo directo.
- **Pasarlo a por cuenta** implica: una RPC `cuenta_storage_usage(user_id)` que sume las carpetas `flash-<id>` de todos los Pops donde `user_id` es el dueño (y `pop-material`), un límite que salga del plan (50 / 500 MB) en lugar de `storage_limit_mb`, y que `quotaTargetOfFolder` regrese la cuenta y no el Pop. La compra con créditos deja de tener sentido (§0.8). Falta decidir a quién se le cobra el espacio de un Pop de un planner "para mi cliente".

## 5. RLS de `profiles` y `side_events`

- `side_events`: RLS activo con permisivas + restrictivas (regla de arriba); a `anon` se le quitó todo; `authenticated` solo puede `insert (invitation_id, date, name, url_image, body)` y `update (name, url_image, body, type, rsvp_deadline, legacy_link_enabled)`. Un Pop (`invitation_id` vacío) solo lo puede crear el backend o un admin.
- `profiles`: **ninguna migración del repo define sus políticas ni sus grants**; se hicieron a mano en Supabase. No lo puedo leer desde aquí. El front solo **lee** `profiles` (3 lugares: `SupportTicketModal`, `AuthModal`, `popEvents.js`) y **nunca la escribe**; el backend la escribe con la service key. Sin ver las políticas no se puede descartar que un usuario pueda hacer `update profiles set pops_plan = 'pro'` sobre su fila. La consulta para revisarlo está al inicio del archivo SQL.
- Recomendación: usar una **tabla aparte `pops_suscripciones`** en lugar de columnas en `profiles`. El usuario solo puede leer la suya y nada más la escribe el backend. No depende de cómo estén hoy los grants de `profiles` (proteger columnas ahí obliga a quitar el `update` de toda la tabla y volver a dar permiso columna por columna). El SQL trae las dos opciones; la decisión es tuya.

## 6. Stripe hoy

- Solo hay **pagos únicos**: `mode: 'payment'` en `controllers/payment.js` (6), `controllers/planner.js` (2, compra de Pop con descuento de planner vía cupón) y `router/comprar.js`.
- Webhook: `index.js:68` (`constructEvent`) y solo atiende `checkout.session.completed`.
- **No se guarda en ningún lado el ID de cliente de Stripe** (ni `customer_id` ni `stripe_customer_id` en código o migraciones) y **no existe nada de suscripciones** ni del portal del cliente. Hay que crearlo todo: sesión con `mode: 'subscription'`, eventos `customer.subscription.created / updated / deleted` e `invoice.payment_failed`, y `billingPortal.sessions.create`.

## 7. Herramientas del editor contra la matriz (§4)

Riel de escritorio (`Workspace/herramientas.js`, la misma lista que usa el footer del celular): Diseño, Elementos, Fotos, Dibujar, Subidos, Imagen del link, Pase digital y, sin ícono, Patrocinadores, Acceso/Ubicación, Itinerario, Interacción (asistentes + chat) y Formulario.

| Matriz | En el código | Nota |
|---|---|---|
| Imágenes 3 / Stickers 10 | `MAX_STICKERS` 12 (PNG) / `MAX_ELEMENTOS` 40 (texto, ícono, forma, línea, decoración; los dibujos no cuentan) | Decidir qué cuenta (§0.7) |
| Portada 1 foto / video | Lista de 1–6 fotos y videos, `fotosPortada.js` | Existe |
| Estilos de bloque | `ESTILOS_BLOQUE`: vidrio, hielo, noche, papel, tema, sticker, contorno, recorte (8) | Falta elegir los gratis (§0.6) |
| Efectos | `TIPOS_EFECTO`: sparkles, confetti, bubbles, snow, petals + `imagenes` (Mis PNG); color e intensidad | Falta elegir los gratis |
| Formularios 2 preguntas / 3 creados / 10 tipos | `TIPOS` tiene los 10. Tabla `forms` con autoguardado propio | El formulario se guarda solo en `forms`, aparte del Pop: "probar sin guardar" no aplica igual (ver abajo) |
| Descarga Excel/CSV de respuestas | `Formularios/descargas.js` | Existe |
| Traer de otros eventos | `/api/guests/import/eventos` + `/desde-evento` | Existe |
| Excel con AI | Existe, apagado en Pop (`sinExcel`) | Ver arriba |
| Apple Wallet | `WalletPanelPop` + backend `datosPaseSide` | Existe; se puede bloquear en el backend |
| Chat: mensaje fijado | `body.chat.pinned` | Existe |
| Imagen del link propia | `body.linkImage` | Existe |
| Sello "Hecho con I attend" en la imagen del link | **No existe** (solo en el Excel de invitados) | Nuevo en `componerPortada.jsx` |
| Colaboración en vivo | Presencia Realtime `pop_presencia_<id>` | Hoy no hay "invitar a colaborar": son dueño + planner + admin. Bloquearla en Free = ocultar cursores/presencia, pero los dos pueden seguir abriendo el Pop |
| Duplicar un Pop | **No existe** | Nuevo (backend, porque un Pop solo lo crea el backend) |
| Borrar o archivar | **No existe** para el dueño (RLS: solo admin) | Nuevo + cambio de RLS |
| Plantillas premium | **No existen** plantillas de Pop | Fuera hasta que existan |
| Estilo del editor (Pop / Business / Craft) | Solo `localStorage` `pops_editor_theme`, no se guarda en el Pop | No hay nada que "guardar": el bloqueo de guardar/compartir no aplica. Propuesta: se puede ver, y elegirlo abre el aviso Plus |

**En el código pero no en la matriz** (quedan fuera por §0.10 o hay que decidir): Patrocinadores, Pop en línea / Acceso, WhatsApp y buzón, lector de pases, **Dibujar** (✅ gratis), Itinerario, Notas, Clima, Canción, Asistentes (lista), Chat (sin fijar), Efectos con color propio, Desenfoque y Ajustar foto de portada, Posición del título, Grupos de capas, Público/privado + acompañantes, emoji del Pop. Propuesta: todas gratis salvo que digas otra cosa.

**Formularios:** el editor del formulario guarda solo en `forms` cada ~800 ms; el Pop solo lleva la copia `body.form.snapshot`. Para "probar" en Free hay dos opciones: dejar que `forms` guarde y bloquear solo publicar el snapshot en el Pop (validando el Pop), o bloquear también el guardado de `forms` (trigger con el tope de 3 / 2). Recomiendo la primera: el formulario es tuyo, no del Pop, y el bloqueo se queda en el Pop.

## 8. Lo que falta para "Pop activo" y los 30

- "Borrador" en las listas = Pop sin invitados (`PopsAzul.jsx`). No existe un estado "activo/archivado" en `side_events`; habría que agregarlo (sirve también para archivar, §4).
- Las personas de un Pop se insertan desde: el editor (`GuestsCRUD`, copiar de la boda), la RPC `importar_invitados`, el registro público y la confirmación con acompañantes (`router/sideEventPublic.js`, `sideEventInvitado.js`). La única forma de que el 30 se respete en todos es un **trigger `before insert` en `side_events_guests`**.

## Decisiones que necesito (además de §0 del brief)

1. §0.1 a §0.9 del brief, tal cual.
2. Columnas en `profiles` o tabla `pops_suscripciones` (recomiendo la tabla).
3. Topes de Plus: subirlos (recomendado) o quitarlos.
4. Formularios: bloquear publicarlos en el Pop (recomendado) o también guardarlos en `forms`.

## Decisiones de Alberto (2026-11-23)

- **Guardar con funciones Plus en Free:** no se guarda **nada** del Pop hasta quitarlas. Aviso "No se pudo guardar porque usas funciones Plus". Al salir, lo no guardado se pierde.
- **Plan:** por usuario, en una **tabla aparte** (`pops_suscripciones`, opción A del SQL). Cuenta el del **dueño** del Pop.
- **Pops ya pagados y Pops gratis** (`planner_benefits`, clientes): se quedan como Plus, sin importar el plan del dueño. **Ya no se venden Pops sueltos.**
- **Al cancelar:** se pierden los beneficios. Los Pops viejos siguen funcionando y se pueden crear Pops nuevos, pero sin funciones Plus; no se pueden enviar los viejos que tengan funciones Plus.
- **Pop activo** = tiene al menos un invitado (ya está en uso). El límite de 3 se revisa al agregar el primer invitado a un 4.º Pop, no al crearlo.
- **Estilos de bloque gratis:** los primeros 3 de `ESTILOS_BLOQUE` (vidrio, hielo, noche).
- **Elementos en Free:** hasta 10 imágenes/stickers (fotos subidas y stickers cuentan igual). Textos, íconos y formas, sin tope Free aparte del de siempre.
- **Efectos:** todos gratis menos Mis PNG (`imagenes`).
- **Espacio extra:** fuera del plan por ahora.
- **Plazo para liberar archivos:** pendiente.
- **Topes en Plus:** ilimitados.
- **Formularios en Free:** nunca más de 2 preguntas ni más de 3 formularios, tampoco en Mis formularios (el tope aplica al guardar el formulario, no solo al Pop). Un formulario creado con Plus y con más de 2 preguntas no se puede usar en un Pop Free después de cancelar.

## Hecho (2026-11-23, sin commit)

- Migración `iattend--backend/migrations/2026-11-23c_pops_plus_plan.sql` (sin correr): `pops_suscripciones`, `side_events.pops_plus` (los Pops existentes = Plus), `pops_plan_de`, `pop_es_plus` y triggers de 30 personas, 3 Pops activos y formularios Free (3 / 2 preguntas; una cuenta con algún Pop Plus cuenta como Plus para sus formularios).
- Matriz `planPops.js` (vite + backend): más de 10 imágenes/stickers, portada con varias fotos o video, estilo de bloques fuera de los 3 primeros, efecto Mis PNG, mensaje fijado, imagen del link propia, formulario con más de 2 preguntas.
- Backend: `POST /api/side-events/:id/guardar` responde 402 `POPS_PLUS` y `GET /api/side-events/:id/plan` dice si el Pop es Plus.
- Editor (escritorio y celular): no guarda nada con funciones Plus en uso, aviso con la lista, "Volver a lo guardado", ⌘S avisa y salir advierte que se pierde.

## Falta

- Insignia "Plus" en las herramientas y bloquear al momento las que no se pueden probar (traer de otros eventos, Excel con AI —hoy apagado en Pop—, descargar respuestas, Apple Wallet, colaboración en vivo, duplicar).
- Bloquear compartir / enviar un Pop con funciones Plus guardadas (Pop de una cuenta que canceló).
- Mensajes amables para los errores de los triggers (`POP_LIMITE_PERSONAS`, `POP_LIMITE_ACTIVOS`, `FORM_LIMITE_*`) en el editor, la importación y el registro público.
- Tope de 10 imágenes y portada de 1 foto en los paneles (hoy se ve como función Plus al guardar, pero el panel deja agregar hasta 12 / 6).
- Topes ilimitados en Plus (`MAX_STICKERS`, `MAX_ELEMENTOS`, `MAX_FOTOS_CARRUSEL`).
- Suscripción en Stripe (falta el producto y el precio), webhook y portal.
- Flujo "Nuevo Pop" Free (`pops_plus = false`), duplicar y archivar.
- Espacio por cuenta y plazo de liberación (pendientes).
