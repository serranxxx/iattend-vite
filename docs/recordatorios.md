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

Ejemplo (cambio de cuenta bancaria):

```
Cuerpo: Hola {{1}}, te informamos un cambio en la invitación de {{2}}. …
  {{1}} → Nombre del titular
  {{2}} → Nombre del evento
Botón: Ver invitación → https://www.iattend.events/{{1}}
  {{1}} → Magic link del invitado
```

## Variables disponibles

| Llave | Qué es | Ejemplo |
|---|---|---|
| `guest_name` | Nombre del titular | Ana López |
| `event_title` | Título de la portada de la invitación | Ale & Santiago |
| `event_date` | Fecha del evento (`invitations.event_date` o la de la portada) | 30 de agosto de 2026 |
| `rsvp_deadline` | Fecha límite para confirmar (`invitations.rsvp_deadline`) | 15 de agosto de 2026 |
| `invitation_path` | Magic link del invitado sin dominio, para el botón: `{label}/{name}?password={password}` | boda/ale-y-santiago?password=K7Q2 |
| `link_image` | Solo encabezado de imagen: `invitations.url_image` (imagen del link, se cambia desde el header) o, si no hay, la portada. Tiene que ser `https://` | — |

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

## Pendiente

- Al aprobar una solicitud no hay aviso automático al organizador: se le
  contesta desde Buzón → Reportes (botón de correo) y se da de alta la plantilla.
- La solicitud enviada no se recuerda al recargar (el organizador no puede leer
  `support_tickets`).
- Sin envío programado ni historial de comunicados en la app (el registro está
  en `invitation_reminder_dispatches`).
- Solo español: no hay variante por idioma de la invitación.
