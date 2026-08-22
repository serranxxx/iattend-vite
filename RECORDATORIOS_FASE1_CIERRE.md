# Cierre — Recordatorios manuales de WhatsApp (Fase 1)

*Implementado el 2026-08-19 en `iattend-vite` e `iattend--backend`. Este documento
describe lo que realmente se construyó, para alimentar `supabase-schema.md` y
`00-mapa-general-infraestructura.md` en el Project de Engineering.*

---

## Decisiones tomadas (confirmadas por Alberto en la sesión)

1. **Último envío fallido → botón bloqueado** (tooltip con motivo). El flujo de
   "Reintentar" existente sigue siendo la vía para esos casos.
2. **Tabla nueva:** `invitation_reminder_dispatches`.
3. **RLS:** Patrón A — solo el backend escribe (Service Role Key bypassa RLS);
   el frontend con anon key solo tiene policy de SELECT.
4. **Date picker de `rsvp_deadline`:** empty state dentro del tab de Enviadas
   cuando es `null`, campo editable permanente una vez definida.
5. **Webhook:** tercer UPDATE ciego en `processStatuses`, mismo patrón que las
   dos tablas existentes.
6. **DDL alineado a la convención real:** `meta_message_id` + columna `status`
   (no `wa_message_id`, que era la propuesta del handoff — ver divergencias).
7. **Contrato del endpoint:** espejo de `/api/whats` (payload crudo de Graph
   API + campos de tracking).

---

## Base de datos

### Tabla nueva: `invitation_reminder_dispatches`

DDL entregado (NO aplicado) en:
`iattend--backend/migrations/2026-08-19_create_invitation_reminder_dispatches.sql`
— correr a mano en el SQL editor de Supabase.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `invitation_id` | uuid | FK → `invitations`, ON DELETE CASCADE |
| `guest_id` | int8 | FK → `guests` (el principal), ON DELETE CASCADE |
| `guest_name` | text | espejo de la tabla hermana |
| `guest_phone` | text | sin `+`, igual que `invitation_message_dispatches.guest_phone` |
| `meta_message_id` | text UNIQUE | id de Meta; clave del lookup del webhook |
| `template_name` | text | default `'reminder'` |
| `reminder_number` | int4 | nº de recordatorio de ese invitado (1 = primero) |
| `trigger_source` | text | `'manual'` \| `'lia_auto'` — Fase 1 siempre `'manual'` |
| `credit_charged` | bool | Fase 1 siempre `true` |
| `status` | text | `processing`/`sent`/`delivered`/`read`/`failed` |
| `recipient_id` | text | `wa_id` que reporta Meta en los statuses |
| `sent_at` | timestamptz | default `now()` |
| `delivered_at`, `read_at`, `failed_at` | timestamptz | los llena el webhook |
| `error_code`, `error_title` | text | de `statusItem.errors[0]` cuando `failed` |
| `raw_send_response`, `raw_webhook` | jsonb | payloads crudos de Meta |
| `created_at` | timestamptz | default `now()` |

Índices: `(invitation_id, created_at DESC)` y `(guest_id, created_at DESC)`,
más el unique implícito de `meta_message_id`.

RLS: habilitada, con una sola policy `SELECT` para `anon, authenticated`
(`USING (true)`). Sin policies de escritura — solo el backend (Service Role)
escribe.

La migración también incluye:
- `ALTER TABLE guests ALTER COLUMN reminder_count SET DEFAULT 0;`
- Backfill `UPDATE guests SET reminder_count = 0 WHERE reminder_count IS NULL;`
(El código igual trata `NULL` como 0 al leer, por si la migración se corre después del deploy.)

### Columnas existentes que se estrenan
- `guests.reminder_count` — el backend la incrementa tras cada envío exitoso,
  **solo en el principal**. Es cache para el contador de la UI.
- `guests.last_reminder_at` — ídem, se setea a `now()` en cada envío.
- `invitations.rsvp_deadline` (date) — se escribe desde el frontend con UPDATE
  directo (ver abajo).
- `invitations.event_date` — solo lectura, para validar el tope del date picker.

**No se crearon triggers.** Toda escritura es explícita desde el flujo.

---

## Backend (`iattend--backend`)

### `POST /api/whats/reminders` — endpoint nuevo
- **Router:** `router/whatsapp.js` → `router.post('/reminders', sendWhatsappReminder)`.
  Cuelga del router ya montado en `index.js:97` (`/api/whats`), así que **no se
  tocó `index.js`**. El endpoint del envío inicial (`POST /api/whats`) quedó intacto.
- **Controller:** `controllers/whatsapp.js` → `sendWhatsappReminder` (nueva
  función, espejo estructural de `sendWhatsappTemplate`).

Responsabilidades, en orden:
1. Valida payload (`to`, `template.name`, `template.language.code`) y tracking
   (`invitationId`, `guestId`, `guestPhone`) — mismos 400 que el hermano.
2. POST a `https://graph.facebook.com/v22.0/{WA_PHONE_NUMBER_ID}/messages`.
3. Lee `guests.reminder_count` (NULL → 0) y calcula `reminder_number = count + 1`.
4. INSERT en `invitation_reminder_dispatches` con `status: 'processing'`,
   `trigger_source: 'manual'`, `credit_charged: true` y `raw_send_response`.
5. UPDATE a `guests` (`reminder_count`, `last_reminder_at`) **solo del principal**.
6. Responde `{ ok: true, msg, data, dispatch }` — el frontend descuenta el
   crédito solo si `ok` es true.

Mismas limitaciones conocidas que el endpoint hermano (aceptadas por simetría):
sin idempotencia (si el INSERT falla, el mensaje ya salió y responde 500 con el
`data` de Meta) y sin transacción entre INSERT y contador.

### Webhook de estados — hallazgo y cambio
**Hallazgo:** `processStatuses` (`controllers/whatsappWebhook.js`) no hace
lookup — ejecuta dos UPDATE ciegos en secuencia (uno por tabla de dispatch)
filtrando por `meta_message_id`; si el id no pertenece a la tabla, afecta 0
filas sin error. Además, **nada en el repo escribía `failed_at`, `error_code`
ni `error_title`** (ni `read_at` en `invitation_message_dispatches`): cuando
Meta reporta `failed`, en las tablas viejas solo queda `status: 'failed'` y el
JSON en `raw_webhook`.

**Cambio aplicado:** tercer UPDATE ciego contra
`invitation_reminder_dispatches`, simétrico a los otros dos, que sí persiste
`delivered_at`, `read_at`, `failed_at`, `error_code`, `error_title` (de
`statusItem.errors[0]`), `recipient_id` y `raw_webhook`. Las dos tablas
existentes no se tocaron.

---

## Frontend (`iattend-vite`)

Todo en `src/modules/GuestManagement/GuestsPage.jsx` + i18n
(`src/locales/es.json`, `en.json`). No se tocó el flujo de envío inicial
(`onSedingInvitation`), la lógica de acompañantes ni el versionado.

### `rsvp_deadline`
- `getType()` ahora lee también `rsvp_deadline, event_date`.
- Barra nueva (`renderRsvpDeadlineBar`) arriba de la lista, **solo en el tab de
  Enviadas**: empty state con invitación a definirla cuando es `null`; una vez
  definida, muestra la fecha (con `formatAbsoluteDate`) y el DatePicker queda
  editable permanente.
- Validaciones: `disabledDate` bloquea fechas no futuras y posteriores a
  `event_date`; aviso suave (no bloqueante) si la fecha queda a <5 días; aviso
  al cambiarla si ya se enviaron recordatorios (detectado vía
  `reminder_count > 0` en `rowData`).
- El guardado es `supabase.from('invitations').update({ rsvp_deadline }).eq('id', id)`
  — UPDATE directo a columna top-level, **nunca vía `publish_invitation`**, por
  lo que no genera fila en `invitation_versions`. Se persiste como `YYYY-MM-DD`
  sin manejo de timezone.

### Botón "Enviar recordatorio"
- Vive en la rama `state === "esperando"` de la columna de acciones, junto al
  chip de estado del mensaje. La columna de ese tab se ensanchó a 210px.
- Solo se renderiza en filas de **principales** (`companion_id === null`) — en
  vista agrupada los acompañantes ya mostraban su chip, y en vista
  individual/filtrada el check explícito lo oculta en acompañantes.
- Ícono `BellRing` (Lucide) con `Badge` de antd mostrando `reminder_count`
  (contador visible en la fila).
- **Elegibilidad** (`reminderBlockReason`): deshabilitado con tooltip que
  explica el motivo, nunca oculto —
  1. `rsvp_deadline` null,
  2. sin `invitation_sent_at`,
  3. teléfono sin prefijo `+52` (regex `/^\+52\d+/`, por prefijo, no por
     longitud — acepta `+521...`),
  4. último dispatch de invitación `failed` (bloqueado, decisión #1),
  5. `credits < 1` — este caso NO deshabilita el botón: el click abre un modal
     con `CreditsComponent` (CTA a compra).
- **Sin modal de confirmación** (decisión de Alberto durante la revisión,
  divergencia respecto al DoD del handoff): el envío funciona como copia
  idéntica del botón del tab de creado — sin idiomas extra el click envía
  directo; con idiomas extra se abre el mismo Dropdown de idiomas
  (`renderReminderLanguagePopup`, copia de `renderSendLanguagePopup`) y al
  elegir uno se envía.

### Envío y crédito
- `onSendReminder(guest, lang)` arma el payload del template `reminder`
  (`es_MX`, sin header, body con `guest.name`,
  `invitation.cover.title.text.value`, `formatAbsoluteDate(rsvp_deadline)`) y
  el bloque del botón dinámico **copiado idéntico** de `onSedingInvitation`
  (incluido el manejo de `lang`).
- POST a `${VITE_API_URL}/api/whats/reminders`; solo con `response.data.ok` se
  llama `onUpdateCredits()` (el mismo read-modify-write directo a Supabase del
  envío inicial) — enviar primero, cobrar después. Si falla, no se cobra y se
  avisa.
- Tras el éxito se refresca `guests` para ver el contador; además el realtime
  existente sobre `guests` lo actualiza solo cuando el backend escribe el contador.

### i18n
27 keys nuevas por idioma bajo el namespace `guests.*` (prefijos `reminder_*` y
`rsvp_deadline_*`) en `es.json` y `en.json`.

---

## Divergencias respecto al handoff (y por qué)

1. **`meta_message_id` en vez de `wa_message_id`**, y columna `status`
   agregada: la convención real de las tablas hermanas y del webhook es
   `meta_message_id` + `status`; usar el nombre del handoff habría roto la
   simetría del tercer UPDATE. Confirmado por Alberto.
2. **`guest_name`/`guest_phone` y `recipient_id` agregados a la tabla**: espejo
   fiel de `invitation_message_dispatches` (el webhook usa `guest_phone` en sus
   fallbacks de matching y escribe `recipient_id`).
3. La función real del envío inicial se llama **`onSedingInvitation`** (typo
   preexistente), no `onSendingInvitation`. No se renombró.
4. `formatAbsoluteDate` **no vive en `src/helpers`** — está inline en
   `GuestsPage.jsx` (líneas ~1490). Se reutilizó desde ahí, sin moverlo.
5. El descuento de créditos de SideEvents está en `SideEvents.jsx` ~1001
   (`onUpdateCredits`), no en la línea 812 que citaba el handoff (esa es el
   insert de side events). El patrón replicado es el mismo.
6. Elegibilidad extra no listada: se agregó el aviso `reminder_not_sent`
   (registro sin `invitation_sent_at`) como quinto motivo visible, porque el
   handoff lo incluye como criterio pero no como motivo de tooltip.
7. **El modal de confirmación del DoD se eliminó a petición de Alberto**: el
   botón replica 1:1 el comportamiento del envío inicial del tab de creado
   (click directo, o Dropdown de idiomas y al elegir se envía). El desglose de
   grupo/costo/saldo del modal ya no existe; el costo de 1 crédito por grupo
   sigue comunicado vía tooltips y el contador de saldo del header.

## Qué quedó pendiente / sin resolver

- **Correr la migración** (`2026-08-19_create_invitation_reminder_dispatches.sql`)
  a mano en Supabase — hasta entonces el endpoint nuevo falla en el INSERT
  (el mensaje sí se enviaría: mismo comportamiento no transaccional que el
  endpoint hermano). Correr la migración **antes** de deployar el backend.
- **Prueba end-to-end real** (envío a un número real y callback del webhook):
  no se pudo probar en esta sesión — requiere el dashboard autenticado y el
  `WA_ACCESS_TOKEN` productivo. El build y lint del frontend pasan; los
  archivos del backend pasan check de sintaxis.
- Las tablas hermanas siguen sin `failed_at`/`error_code`/`error_title` (y
  `invitation_message_dispatches` sin `read_at`) — deuda preexistente, fuera
  del alcance de esta fase.
- El `status` inicial del dispatch es `'processing'`; hasta que el webhook
  confirme, la fila del recordatorio no aparece en la UI de estados (el chip
  de la tabla sigue mostrando el estado de la invitación inicial, intencional).

(El endpoint nuevo ya quedó documentado en la tabla de endpoints de
`CLAUDE.md` y `AGENTS.md` del backend.)

## Extensión: side events (agregada el mismo día, decisiones de Alberto)

Los side events ya NO están fuera de alcance — se replicó todo el flujo:

- **Migración** `2026-08-19_side_events_reminders.sql` (correr a mano):
  `side_events.rsvp_deadline` (date, deadline propia por side event),
  `side_events_guests.reminder_count`/`last_reminder_at` (límite de 1/día POR
  side event — una fila por evento), y en `invitation_reminder_dispatches` se
  agregó `side_event_id int8 NULL` (FK a side_events) y se eliminó el FK de
  `guest_id` a guests: cuando `side_event_id` no es null, `guest_id` contiene
  el id de `side_events_guests` (mismo patrón de ids mixto que ya usa
  `invitation_message_dispatches`). El webhook no cambió.
- **Backend:** `sendWhatsappReminder` acepta `sideEventId` opcional; con él,
  los contadores se escriben en `side_events_guests` y el dispatch guarda
  `side_event_id`. Mismo endpoint `/api/whats/reminders`.
- **Frontend (`SideEvents.jsx`):** barra de deadline arriba de los tabs (tope =
  fecha del side event en `body.hour`, wall-clock), botón campanita en Enviadas
  (mismas reglas; sin selector de idioma — los side events no manejan lang),
  celda vacía para acompañantes, modal de compra de créditos, y flujo de
  **retry con `invitation_retry`** (body con solo el nombre del evento, sin
  cobrar crédito — antes los reintentos de side events siempre cobraban).
- `formatAbsoluteDateEs` se movió a `src/helpers/assets/eventDateTime.js`
  (compartido por GuestsPage y SideEvents). Los reintentos de GuestsPage también
  usan `invitation_retry` (cambio del mismo día, ver arriba).
- i18n: se reusan las keys `guests.reminder_*` / `guests.rsvp_deadline_*`.

## Fuera de alcance (sin cambios)

Multiselección/lote, cadencia/cron, interpretación de respuestas,
tools de Lia, templates multi-idioma — todo Fase 2.
