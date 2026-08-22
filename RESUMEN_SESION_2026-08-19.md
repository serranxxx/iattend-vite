# Resumen de sesión — Claude Code (19–20 de agosto, 2026)

Repos tocados: `iattend-vite` (frontend) e `iattend--backend`.

---

## 1. Recordatorios manuales de WhatsApp (Fase 1)

Feature completa según el handoff, con las 4 decisiones abiertas resueltas
(bloquear fallidos, tabla `invitation_reminder_dispatches`, RLS patrón A,
date picker como empty state + campo permanente).

**Base de datos** (`migrations/2026-08-19_create_invitation_reminder_dispatches.sql` — aplicada):
- Tabla `invitation_reminder_dispatches` — espejo de la hermana con la
  convención real (`meta_message_id` + `status`), más `failed_at`/`error_code`/
  `error_title` que las tablas viejas no llenan. RLS: solo backend escribe.
- `guests.reminder_count` con default 0 + backfill de NULLs.

**Backend:**
- `POST /api/whats/reminders` (`controllers/whatsapp.js` → `sendWhatsappReminder`):
  envía el template, inserta el dispatch con `reminder_number`, incrementa
  `reminder_count`/`last_reminder_at` **solo en el principal**.
- Webhook (`processStatuses`): tercer UPDATE ciego contra la tabla nueva —
  hallazgo: el webhook no hace lookup, son UPDATEs ciegos por `meta_message_id`
  en cada tabla de dispatch.

**Frontend (`GuestsPage.jsx`):**
- Barra de `rsvp_deadline` (columna top-level, UPDATE directo que **no** genera
  `invitation_versions`) en tabs de Lista de espera e Invitación enviada:
  empty state morado (tokens `light-purple-*`) → campo editable. Validaciones:
  futura, ≤ `event_date`, aviso <5 días, aviso al cambiarla con recordatorios ya
  enviados.
- Botón campanita (naranja, estilos de Alberto) por bloque, solo principales:
  elegibilidad = deadline definida + lada `+52` (por prefijo) + máx. **1
  recordatorio/día por invitado** (`last_reminder_at`) + crédito disponible.
  Oculto en envíos fallidos y manuales. Badge con contador. CTA a compra de
  créditos si no hay saldo (modal con `CreditsComponent`).
- Sin modal de confirmación (decisión posterior): click directo o dropdown de
  idiomas, copia del patrón del envío inicial. Animación del header dice
  "Enviando recordatorio". Sin message de éxito (solo de error).
- Cobro: 1 crédito desde el frontend, solo tras `ok: true`.
- `{{3}}` del template con `formatAbsoluteDateEs` ("27 de agosto de 2026") —
  helper compartido nuevo en `helpers/assets/eventDateTime.js`.

**Documentación:** `RECORDATORIOS_FASE1_CIERRE.md` (nombres finales,
divergencias, hallazgo del webhook, pendientes). Tabla de endpoints de
`CLAUDE.md`/`AGENTS.md` del backend actualizada.

---

## 2. Reintentos con template propio

- Los reintentos (botón "Reintentar" en fallidos) usan **`invitation_retry`**
  (utility): mismo header de imagen y botón, body solo con el nombre del
  evento. Aplica en GuestsPage y SideEvents.
- Confirmado: los reintentos **no cobran** crédito (el envío inicial ya lo
  cobró al aceptarlo Meta). SideEvents cobraba los retries — se corrigió.
- Ancho unificado a 120px con los demás badges de estado.

## 3. Template `invitation_deadline`

- Alterna automáticamente con `invitation_v2` en el envío inicial: **si existe
  `rsvp_deadline` → `invitation_deadline`** (mismos {{1}}/{{2}} + {{3}} con la
  fecha límite en formato de reminders); sin fecha → `invitation_v2`.
- Aplica en GuestsPage y SideEvents (cada side event con su propia deadline).
- Sin cambios de backend ni webhook.

## 4. Réplica completa en Side Events

Migración `2026-08-19_side_events_reminders.sql` (aplicada):
`side_events.rsvp_deadline`, `side_events_guests.reminder_count`/
`last_reminder_at`, y en `invitation_reminder_dispatches` se agregó
`side_event_id` (int8) y se quitó el FK de `guest_id` (ids mixtos, mismo patrón
que la tabla hermana). Backend: `sendWhatsappReminder` acepta `sideEventId` y
escribe contadores en `side_events_guests`. **Límite 1/día por side event.**
Webhook sin cambios. Frontend: barra de deadline (tope = fecha del evento en
`body.hour`), campanita con mismas reglas (sin selector de idioma), retry con
`invitation_retry` sin cobro, acompañantes con celda vacía.

Extras en SideEvents: tabs renombrados como GuestsPage con contador (Lista de
espera / Invitación enviada / Asistencia confirmada / **No asistirán** —
separados confirmados de rechazados), columna de acciones oculta en
confirmados/rechazados, botón de enviar bloqueado para números no-`+52`,
`.side_invitation_cont` a 345/370px.

## 5. Liquid glass en el editor de side events

- Toolbar (Guardar/Volver/Preview/Clima/Paleta/Tipografía): receta exacta del
  `LanguageToggle` de iattend-events (vidrio blanco 0.42, blur 28 + saturate
  200, brillos internos, íconos oscuros). Se quitaron los tintes inline.
- `add_image_cont` y `side_info_cont` (contenedor de textos): variante oscura
  del mismo vidrio (conservan texto blanco). Selector de imágenes
  (`full-screen-button`, scoped): receta blanca.

## 6. Debug de realtime (no era el código)

Síntoma: tabla de esperando y avisos de Lia sin actualizarse. Diagnóstico con
scripts anónimos contra Supabase real: el canal de 6 tablas no entregaba
eventos porque **`invitations` estaba fuera de la publication
`supabase_realtime`** — una suscripción inválida silencia el canal completo
aunque diga SUBSCRIBED. Alberto la re-agregó (`ALTER PUBLICATION ... ADD TABLE
invitations`) y quedó verificado de punta a punta.

## 7. Bulk shipment (envío masivo) con cola en backend

**Modo "Crear envío"** en Lista de espera (iterado en varias rondas de UX):
- Estado normal: tabla = ranking puro por tier; flecha → por bloque para marcar
  como invitado manualmente (el marcado masivo se eliminó); tag "Lada
  extranjera" en no-enviables (el de "Sin número" se quitó).
- Modo envío: header teñido de azul con instrucciones, checkboxes circulares
  custom (28px, blanco/#EBEBEB → azul al marcar) **solo en bloques enviables**;
  no-enviables atenuados sin sombra; click en la tarjeta selecciona; highlight
  `--blue-bg-40` con outline y sombra azul (acompañantes `--blue-bg-80`,
  celdas sticky con capa opaca); "Soltar" en el header de la columna.
- Botones "Crear envío" / "Enviar todos (n)" / "Cancelar" en la fila del
  buscador, a la derecha de "+ Nuevo invitado" con separador. Header **fixed**
  (vidrio `#FFFFFF80` + blur, top 61px, max-width 1450px) — el sticky fallaba
  por el `overflow` de `.build-invitation-layout` (override scoped) y por el
  CSS-in-JS de antd (se documentó).

**Arquitectura de cola** (aguanta 200+ sin timeouts):
- Migración `2026-08-20_create_invitation_send_batches.sql` (**pendiente de
  correr**): `invitation_send_batches` + `invitation_send_batch_items`
  (payload jsonb armado por el frontend), RLS patrón A.
- `POST /api/whats/bulk`: crea lote + items, responde **202** inmediato.
- Worker `services/whatsappBulkWorker.js`: procesa a ~2.5 msg/s, inserta cada
  dispatch, marca bloques como `esperando` (principal + acompañantes), backoff
  de 30s ante rate limit de Meta (hasta 3 reintentos), **reembolsa créditos de
  fallidos** al cerrar. Resume de lotes a medias al arrancar (`index.js`).
- Créditos: el frontend **reserva N en un solo UPDATE** al recibir el 202.
- **Isla de progreso** (dynamic island): pill fija abajo al centro (navy) con
  barra azul "Enviando invitaciones · 34/200 · n fallidas"; polling cada 2.5s;
  sobrevive recargas (detecta lote activo al montar); al completar refresca
  créditos y muestra cierre.
- Límites de Meta verificados: tier actual **2,000 conversaciones/24h**
  (compartido por toda la plataforma al ser un solo número); upgrade a 10K
  requiere 1,000 únicos/7 días. Sin throttle global por ahora (sobra margen).

## 8. Banners de novedades ("Lo nuevo")

- Componente `components/WhatsNewBanners/` (CSS Modules): dos banners
  (recordatorios/morado y reintentos/azul) como **overlay fijo** (no mueven el
  layout), vidrio blanco + blur, con CTA "Ir a mis invitados" y X para cerrar
  (persistido en localStorage: `iattend_wn_reminders_v1`, `iattend_wn_retry_v1`).
- Montados en `DashboardLayout` del router → visibles en **todas** las rutas
  `/dashboard/*` hasta cerrarse. El CTA se oculta en la página de guests.
- Botón "Lo nuevo" (✨ Sparkles) en GuestsPage, a la izquierda del botón de
  mensajes fallidos: reabre los banners vía evento global
  (`iattend:whats-new-open`). El botón del sobre ganó `minWidth: 40px`.

## 9. Versión mobile de GuestsPage

- Header fijo (`.title-buttons-container`) con `display: none` bajo 750px —
  en mobile la fila del buscador no se renderiza y la franja de vidrio vacía
  además bloqueaba taps (fixed full-width, z-index 110).
- Extra content de las tabs en mobile: icon buttons `[+]` (nuevo invitado,
  40×40 primary) y `[✈]` (Crear envío, gradiente azul) — solo en Lista de
  espera; en modo envío se vuelven `[✈ n]` (enviar, con conteo de elegibles)
  + `[X]` (cancelar). El botón "Nuevo" con texto se conserva para open-card
  en desktop.
- Banner de deadline colapsable en mobile: solo texto + chevron (GoChevronDown
  rotando); al tocarlo despliega el DatePicker debajo. Desktop sin cambios.
- Columna de nombre en filas: 190px → 140px en mobile.
- Con esto también queda resuelto el pendiente #5 ("Crear envío no aparecía
  en móvil").

---

## Pendientes

1. **Correr `2026-08-20_create_invitation_send_batches.sql`** en Supabase
   (sin ella, `/api/whats/bulk` falla al crear el lote).
2. **Deploy del backend a producción** — el webhook productivo aún no tiene el
   tercer UPDATE: los recordatorios se quedan en `processing` hasta deployar.
   También faltan allá `/api/whats/reminders`, `/api/whats/bulk` y el worker.
3. Aprobación de Meta para `invitation_retry` e `invitation_deadline` (si aún
   están en revisión, los envíos que los usen fallan).
4. Prueba end-to-end del bulk con lote real.
5. ~~En móvil, el botón "Crear envío" no aparece~~ — resuelto en la sección 9
   (icon buttons en las tabs).
6. Throttle global de envíos + aviso de presupuesto diario: retomar cuando el
   volumen diario se acerque a ~60-70% del tier de Meta.

## Archivos clave

- **Backend:** `controllers/whatsapp.js`, `controllers/whatsappWebhook.js`,
  `router/whatsapp.js`, `services/whatsappBulkWorker.js`, `index.js`,
  `migrations/2026-08-19_*.sql` y `2026-08-20_*.sql`.
- **Frontend:** `modules/GuestManagement/GuestsPage.jsx`,
  `modules/SideEvents/SideEvents.jsx` (+ `side-events.css`),
  `components/WhatsNewBanners/*`, `helpers/assets/eventDateTime.js`,
  `styles/invitations/my-guests.css`, `router/AppRouter.jsx`,
  `pages/Dashboard/DashboardPage.jsx`, locales `es/en.json`.
