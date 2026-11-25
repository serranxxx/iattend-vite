# Recordatorios (comunicados a invitados)

Guest management → pestaña **Recordatorios**. El organizador elige un mensaje del
**banco de recordatorios**, escoge a qué titulares mandárselo y sale por WhatsApp
en un lote. Diseño: handoff de Claude Design "Guest Management - Recordatorios".

## Piezas

| Pieza | Dónde |
|---|---|
| Banco de recordatorios (tabla) | `reminder_templates` — migraciones `iattend--backend/migrations/2026-10-27_create_reminder_templates.sql` y `2026-10-27b_reminder_templates_footer.sql` |
| Editor del banco | Admin → Configuración → Recordatorios (`pages/Admin/sections/RecordatoriosSection.jsx`, `/api/admin/reminder-templates`) |
| Pantalla del organizador | `modules/GuestManagement/Reminders/RemindersPanel.jsx` |
| Catálogo de variables, segmentos y reglas | `modules/GuestManagement/Reminders/reminderVariables.js` |
| Envío | `POST /api/whats/reminders/bulk` (`iattend--backend/controllers/reminderTemplates.js`) → cola de `invitation_send_batches` con `kind = 'reminder'` |
| Solicitar un recordatorio nuevo | `POST /api/support/tickets` con `topic = 'reminder_request'` → Admin → Buzón → Reportes |

## Cómo dar de alta un recordatorio

1. Crea y manda a aprobar la plantilla en WhatsApp Manager (Meta). Las variables
   del cuerpo son `{{1}}`, `{{2}}`… y el botón URL tiene su propio `{{1}}`.
2. En Admin → Configuración → Recordatorios, **Nuevo recordatorio**:
   - **Nombre de la plantilla en Meta** e **idioma**: exactamente como en Meta.
   - **Texto**: pega el cuerpo aprobado, con su formato de WhatsApp
     (`*negritas*`). Solo se usa para la vista previa; lo que
     recibe el invitado es la plantilla de Meta.
   - Por cada `{{n}}` aparece un selector: elige qué dato va ahí (tabla de abajo).
   - **Imagen de encabezado** (si la plantilla tiene) y **pie** (el texto gris;
     solo para la vista previa).
   - **Botón**: texto, URL tal como está en Meta y el dato de su `{{1}}`. Todos
     los botones llevan al magic link del invitado:
     `https://www.iattend.events/{{1}}` con «Magic link del invitado».
   - **Sugerencia de Lia** (opcional): segmento + reglas que se aplican solas al
     elegir el recordatorio, con título y razón.
3. Préndelo cuando Meta lo apruebe. Nace apagado.

**Editar una plantilla en Meta la deja inservible mientras se revisa.** Meta no
sigue mandando la versión anterior: mientras está "En revisión" cualquier envío
falla con `132001 Template name does not exist in the translation` (aunque el
idioma sea el correcto). Apágala en Admin → Recordatorios antes de editarla en
Meta y préndela cuando vuelva a estar **Activa**; si no, los organizadores ven
"No se pudo enviar" (y se les devuelven los créditos).

En el banco hoy: `reminder` (Confirma tu asistencia), `event_day_reminder`
(Hoy es el día, con imagen) y `aviso_cambio_cuenta_bancaria` (Cambio de cuenta bancaria).
En Meta, pendiente de aprobar: `event_eve_reminder` (Es mañana; ver abajo).

Ejemplo (cambio de cuenta bancaria):

```
Cuerpo: Hola {{1}}, te informamos un cambio en la invitación de {{2}}. …
  {{1}} → Nombre del titular
  {{2}} → Nombre del evento
Botón: Ver invitación → https://www.iattend.events/{{1}}
  {{1}} → Magic link del invitado
```

## Plantilla `event_eve_reminder` (un día antes del evento)

Creada en WhatsApp Manager el 25 nov 2026. **Estado: creada, falta mandarla a
revisión y que Meta la apruebe.** Es la hermana de `event_day_reminder` (Hoy es
el día): se manda la víspera, recuerda que el evento es mañana y lleva a la
invitación para ver el itinerario y el clima.

| Campo | Valor |
|---|---|
| Nombre en Meta | `event_eve_reminder` |
| Categoría | UTILITY (Utilidad → Predeterminada) |
| Idioma | Spanish (MEX), `es_MX` |
| Variables | Número (`{{1}}`) |
| Encabezado | ninguno (a diferencia de `event_day_reminder`, sin imagen) |

```
Cuerpo:  Hola, te recordamos que el evento {{1}} es mañana.

         En tu invitación puedes consultar el itinerario y el pronóstico del clima.
  {{1}} → Nombre del evento (event_title), p. ej. "Alberto & Anette"
Pie:     I attend · Your event, handled.
Botón:   Ver invitación (URL dinámica, índice 0, seguimiento de clics de Meta)
         https://www.iattend.site/{{1}}
  {{1}} → Magic link del invitado (invitation_path), p. ej. wedding/test-1?password=K7Q2
```

**Por qué el texto quedó así.** La primera versión ("les tenemos preparados un
gran par de días", "estamos entusiasmados de recibirlos") tenía un tono
emocional y promocional que Meta suele reclasificar como MARKETING (otra tarifa
y otras reglas). Se reescribió como un recordatorio neutral de un evento
concreto, con variable, para que la aprueben como UTILITY. Al editarla, cuidar
ese tono.

**El dominio del botón es `iattend.site`, no `iattend.events`.** Las demás
plantillas del banco apuntan a `https://www.iattend.events/{{1}}`. Con
`iattend.site` también llega: `vercel.json` de esta app redirige
`/wedding/:x`, `/xv/:x`, `/bap/:x`, `/kids/:x`, `/event/:x`, `/party/:x` y
`/side-event/:id` a `iattend.events` (con el `?password=`), pero es un salto
más y depende de que la etiqueta del evento esté en esa lista. Si se vuelve a
editar en Meta, conviene igualarla a `iattend.events` (editarla la manda a
revisión otra vez).

Payload que arma el backend (`armarPayload` en
`iattend--backend/controllers/reminderTemplates.js`, igual que las demás):

```json
{
  "messaging_product": "whatsapp",
  "to": "<teléfono del invitado, E.164 sin +>",
  "type": "template",
  "template": {
    "name": "event_eve_reminder",
    "language": { "code": "es_MX" },
    "components": [
      { "type": "body", "parameters": [{ "type": "text", "text": "<nombre del evento>" }] },
      { "type": "button", "sub_type": "url", "index": "0",
        "parameters": [{ "type": "text", "text": "<ruta de la invitación, p. ej. wedding/slug?password=…>" }] }
    ]
  }
}
```

### Darla de alta en el banco

No hace falta código: usa las mismas variables que `event_day_reminder`
(`event_title` en el cuerpo, `invitation_path` en el botón), así que entra al
banco como cualquier otra y sale en el panel de Recordatorios de las bodas y de
los Pops (Pops+). Dos caminos:

- **Admin → Configuración → Recordatorios → Nuevo recordatorio** con los datos
  de la tabla de arriba, o
- este SQL en Supabase (nace **apagado**; se prende en Admin cuando Meta la
  apruebe):

```sql
insert into public.reminder_templates
  (slug, meta_name, language_code, name, description, body, body_variables, footer,
   header_image_variable, button_label, button_url, button_variable, suggestion, sort_order, is_active)
values
  ('es-manana', 'event_eve_reminder', 'es_MX',
   'Es mañana',
   'Un día antes del evento, para que revisen el itinerario y el clima.',
   E'Hola, te recordamos que el evento {{1}} es mañana.\n\nEn tu invitación puedes consultar el itinerario y el pronóstico del clima.',
   array['event_title'],
   'I attend · Your event, handled.',
   null,
   'Ver invitación', 'https://www.iattend.site/{{1}}', 'invitation_path',
   '{"segment":"confirmados","rules":[],"comb":"and","title":"Confirmados","reason":"Son quienes van mañana: así revisan el itinerario y el clima antes de salir."}'::jsonb,
   2, false)
on conflict (slug) do nothing;
-- Que quede antes de "Hoy es el día" y del aviso de cuenta bancaria.
update public.reminder_templates set sort_order = sort_order + 1
where slug in ('dia-del-evento', 'cambio-cuenta-bancaria');
```

`button_url` solo se usa para la vista previa del panel; lo que recibe el
invitado es la URL aprobada en Meta.

### Pendientes

1. Mandarla a revisión en WhatsApp Manager y esperar la aprobación (si la
   rechazan o la pasan a MARKETING, no prenderla en el banco).
2. Darla de alta en el banco (arriba) y prenderla cuando esté **Activa**.
3. **Envío automático la víspera: no existe todavía.** Hoy todo recordatorio
   sale a mano desde el panel (ver "Pendiente" al final: no hay envío
   programado). Para mandarla sola un día antes hace falta un programador en el
   backend (como `walletScheduler.js` / `prospectosScheduler.js`) que:
   - tome la fecha del evento como hora de pared del lugar (`invitations.event_date`
     o la de la portada; en un Pop `body.hour`, sin convertir zona: ver
     `eventDateTime.js`) y decida la hora de envío (p. ej. 10:00 del día anterior
     en la zona del evento — `STATE_TIMEZONES` / `body.zonaOnline`);
   - mande solo a titulares confirmados con `+52`;
   - no repita: el envío queda en `invitation_reminder_dispatches` con su
     `reminder_template_id`, que sirve para saber si ya salió la víspera de ese
     invitado;
   - cobre o no créditos (por definir: hoy cada recordatorio cuesta 1);
   - no mande nada si la plantilla está apagada en el banco.

## Variables disponibles

| Llave | Qué es | Ejemplo |
|---|---|---|
| `guest_name` | Nombre del titular | Ana López |
| `event_title` | Título de la portada de la invitación | Ale & Santiago |
| `event_date` | Fecha del evento (`invitations.event_date` o la de la portada) | 30 de agosto de 2026 |
| `rsvp_deadline` | Fecha límite para confirmar (`invitations.rsvp_deadline`) | 15 de agosto de 2026 |
| `invitation_path` | Magic link del invitado sin dominio, para el botón: `{label}/{name}?password={password}` | boda/ale-y-santiago?password=K7Q2 |
| `link_image` | Solo encabezado de imagen: `invitations.url_image` (imagen del link, se cambia desde el header) o, si no hay, la portada. Tiene que ser `https://` y nunca un video: con portada de video va su **primer cuadro** (ver abajo) | — |

Si a la invitación le falta un dato del evento (p. ej. no tiene fecha límite), el
recordatorio aparece deshabilitado en el banco con el motivo. Si le falta a un
invitado, ese invitado sale como "Falta información".

**Agregar una variable**: en `reminderVariables.js` (`REMINDER_VARIABLES`, con
cómo se resuelve) **y** en `iattend--backend/controllers/reminderTemplates.js`
(`VARIABLES`, para validar). Los valores los resuelve la app por invitado; el
backend arma el payload de Graph API con el nombre y el idioma de la tabla.

## Envío

- Solo **titulares** (`companion_id` vacío) con número `+52`. Los acompañantes
  no lo reciben; el resumen muestra cuántas personas cubre el grupo.
- **1 crédito por titular**, solo plan PRO (igual que el envío masivo de
  invitaciones). El backend responde 202 con cuántos aceptó, la app reserva esos
  créditos y el worker reembolsa los fallidos al cerrar el lote.
- El backend toma teléfono y nombre de la base, valida que los invitados sean de
  esa invitación y descarta a quien ya recibió **ese mismo** recordatorio en las
  últimas 20 h (en la lista sale "Ya lo recibió hoy").
- El worker (`services/whatsappBulkWorker.js`) registra cada envío en
  `invitation_reminder_dispatches` (con `reminder_template_id` y `batch_id`),
  sube `guests.reminder_count` / `last_reminder_at` y **no** cambia
  `guests.state`. Escribir `last_reminder_at` también bloquea ese día el botón
  de recordatorio individual de Esperando respuesta.
- La isla de progreso de abajo es la misma del envío masivo.

## Portada de video → primer cuadro

Meta solo acepta una imagen en el encabezado. Cuando la imagen que toca (la del
link o, sin ella, la portada) es un video, `useImagenEncabezado`
(`Reminders/primerCuadro.js`) saca su primer cuadro en el navegador, lo sube una
vez como JPG a `user_images/<id de la invitación | flash-<id>>/link/primer-cuadro-<huella>.jpg`
(la huella es de la URL del video: un video = un archivo, nunca se sobrescribe)
y usa esa URL. Lo usan el panel de Recordatorios (vista previa y envío) y los
envíos de la invitación de `GuestsPage` (individual y masivo). Mientras se
prepara (un par de segundos la primera vez) la imagen queda vacía.

## Destinatarios

Universo: titulares ya invitados (fuera de "Por invitar"). Lógica:
`segmento AND (reglas combinadas con Y u O)`.

- Segmentos: Todos · Esperando respuesta · Leyeron y no contestaron
  (esperando + último envío `read`) · Confirmados · Confirmados sin mesa.
- Reglas: Estado, Etiqueta (`invitations.tags`), Lado (`invitations.owners`),
  Prioridad, Mesa, Invitación (leyó / no leyó).
- Todos los que coinciden vienen marcados; desmarcar = excluir. Cambiar
  segmento, reglas o combinador reinicia las exclusiones y desmarca la
  sugerencia de Lia.
- **Modo manual**: desde la barra flotante de las listas (checkbox en cada
  tarjeta). Si se marca un acompañante, cuenta su titular. Aquí sí entran
  invitados de "Por invitar".

## Puntos de entrada

1. Botón **Recordatorios** del header (solo en `/dashboard/guests`, escritorio).
2. (No tiene paso propio en la escalera: es una pestaña oculta del `Tabs`, `activeKey = 'recordatorios'`.)
3. Seguimiento: **Enviar comunicado** en "Qué hacer hoy", y el botón
   **Enviar recordatorio** de "Leyeron y no contestaron" (abre
   `confirma-asistencia` con ese segmento).
4. Checkbox en las tarjetas de cada lista → barra flotante → modo manual.

## Pops (Pops+)

Los Pops tienen el mismo panel (`RemindersPanel` con `sideEventId`), desde el
botón de la campana del encabezado de Invitados del editor (`SideEvents.jsx`).
Es función de Pops+: en un Pop Free se puede entrar, elegir recordatorio y
destinatarios, pero no enviar (`bloqueoPlus`: insignia Pops+ en el título y el
botón de enviar lleva a Pasar a Pops+); el backend también responde 402
`POPS_PLUS` (`soloPopPlus` en la ruta). Diferencias:

- Datos: `eventTitle` = nombre del Pop, `event_date` = `body.hour`,
  `rsvp_deadline` = `side_events.rsvp_deadline`, `link_image` = `url_image` del
  Pop y `invitation_path` = `side-event/<código>?password=<código del invitado>`.
- Sin mesas, etiquetas, lado ni prioridad: sin el segmento "Confirmados sin mesa"
  y solo las reglas Estado e Invitación (leyó / no leyó).
- Imagen del encabezado: con portada de video (la primera de `mediaDePortada`)
  va el primer cuadro del video aunque haya `url_image` guardada; si no, la
  imagen del link o la foto de la portada.
- El lote lleva `side_event_id`; el worker registra en
  `invitation_reminder_dispatches.side_event_id` y sube los contadores de
  `side_events_guests`. Créditos del Pop (`side_events.credits`).

## Pendiente

- Al aprobar una solicitud no hay aviso automático al organizador: se le
  contesta desde Buzón → Reportes (botón de correo) y se da de alta la plantilla.
- La solicitud enviada no se recuerda al recargar (el organizador no puede leer
  `support_tickets`).
- Sin envío programado ni historial de comunicados en la app (el registro está
  en `invitation_reminder_dispatches`).
- Solo español: no hay variante por idioma de la invitación.
