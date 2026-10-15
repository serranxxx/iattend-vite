# Auditoría RLS de Supabase — lectura anónima con la anon key

Fecha: 2026-10-15. Nada de esto está aplicado: es diagnóstico y propuesta.

## 1. Qué se comprobó

Con solo `VITE_SUPABASE_ANON_KEY` (sin sesión), `GET /rest/v1/<tabla>` devuelve la
tabla completa. Conteos reales (se pidió solo el conteo, no se descargaron datos):

| Tabla | Filas legibles sin sesión | Datos sensibles |
|---|---|---|
| guests | 8,546 | phone_number, password (código de pase), name |
| invitation_message_dispatches | 3,413 | guest_phone, guest_name |
| side_events_guests | 1,505 | phone_number, password |
| whatsapp_incoming_messages | 572 | teléfono y texto de lo que escriben los invitados |
| tables | 471 | nombres de mesas |
| invitation_versions | 369 | historial completo de cada invitación |
| invitation_reminder_dispatches | 354 | recordatorios enviados |
| invitations | 95 | user_email, phone_number, créditos, data |
| profiles | 86 | user_email, role |
| side_events | 77 | user_email, planner_id, créditos |
| whatsapp_freetext_dispatches | 61 | mensajes enviados |
| save_the_dates | 23 | — |
| event_photos | 14 | fotos del Photo Wall |

Cerradas (401): `pagos`, `ventas`, `vendedores`, `ai_conversations`.
Sin filas para anon: `planner_benefits`, `planner_events`, `support_tickets`.
También expuestas (eventos Pop): `pop_users` (31), `pop_guests` (40).

**Quién usa qué llave**
- `iattend--backend`: `SUPABASE_SERVICE_ROLE_KEY` → se salta RLS. No le afecta nada de esto.
- `iattend-vite` (organizador / Admin): anon key en el navegador; con sesión corre como
  `authenticated`.
- `iattend-events` (invitado): anon key en navegador **y en servidor**
  (`src/lib/supabase/server.ts`, `public-server.ts`). Service role solo en
  `/api/translation/invitation`.

**Ojo: `authenticated` no es una frontera de confianza.** El registro es abierto:
cualquiera puede crear una cuenta. Una política `to authenticated using (true)`
equivale casi a dejarlo público. Toda lectura de organizador debe ir acotada con
`can_manage_invitation()` (ya existe; dueño, planner asignado o Administration).

## 2. Diagnóstico tabla por tabla

Leyenda: **[anon]** lo usa una pantalla sin sesión · **[auth]** organizador/planner ·
**[admin]** panel /admin.

### guests — CRÍTICO
- [anon] events: el invitado se identifica **solo con `password`**
  (`Invitation.tsx:304, 346`, sin filtrar por invitación); acompañantes por
  `companion_id`; refresco por `id`.
- [anon] events: confirmar / rechazar = `upsert` por `id` desde el navegador
  (`Confirm.tsx:70, 265`, `InvitationDock.tsx:245, 287`); invitaciones abiertas
  **insertan** invitados nuevos (`Confirm.tsx:312, 345`, `InvitationDock.tsx:316, 330`).
- [anon] events `/api/wallet/pass`: lee por `id` + `invitation_id` (sin password).
- [anon] vite `/scanner`: lee por `invitation_id`, **actualiza `state` y
  `arrived_at`** y se suscribe en tiempo real. Su "PIN" son los primeros 4 caracteres
  del id de la invitación, y el propio scanner lista todas las invitaciones con su id
  → el PIN no protege nada.
- [auth] vite: lectura/escritura por `invitation_id` / `id` en Invitados, Mesas,
  Side events, Save the date, Dashboard, planner.
- [admin] analítica lee la tabla entera (`traerTodo`).
- Hoy anon puede además **escribir** cualquier invitado (upsert por id) si conoce o
  adivina el id.

### side_events_guests — CRÍTICO
- [anon] events `/side-event/[id]`: lee por `password` + `side_events_id`; actualiza
  `state`/`name` por password; **acompañantes se actualizan solo por `id`**.
- [auth] vite: CRUD por `side_events_id` / `id`. [admin] analítica entera.

### invitation_message_dispatches — ALTO
- Ningún uso anónimo (ni events ni vite sin sesión).
- [auth] Dashboard (realtime + lookup por id), Side events Flash por `side_event_id`,
  RPC `get_latest_invitation_dispatches`. [admin] analítica entera.

### whatsapp_incoming_messages — ALTO
- Ningún uso anónimo.
- [auth] realtime del dashboard; RPC `get_conversations_by_invitation`;
  `WhatsappMessages.jsx:29` marca leídos **solo por `from_phone`** (cruza eventos).
- [admin] realtime + RPC `get_conversations_v2` (todas).

### whatsapp_freetext_dispatches — ALTO
- Ningún uso anónimo. [auth]/[admin] solo realtime.

### invitation_versions — MEDIO
- Ningún uso anónimo. [auth] por `invitation_id` (Dashboard, BuildPage, feedback).

### profiles — ALTO
- Ningún uso anónimo (el login la lee ya con sesión).
- [auth] la propia fila; `SupportTicketModal` lee la del dueño de la invitación
  (planner actuando). [admin] tabla entera.

### invitations — MEDIO (contenido público, columnas privadas)
- [anon] events: una fila por `label`+`name` o `id` (`data, type, mongo_id, id, plan,
  phone_number, url_image`). Es el contenido público de la invitación.
- [anon] vite: scanner **lista todas** (`id, name, user_email`); demo/preview/checkout/
  linktree leen `data` de ids fijos o de `onboarding_slides`.
- [auth] vite: por `id`; **`credits` se escribe desde el navegador**
  (`GuestsPage.jsx:1021, 1553`, `SideEvents.jsx:687, 2144`); `Header.jsx:286/762` y
  `NewInvitationDrawer.jsx:100` leen **todos los `name`** para validar el slug.
- [admin] tabla entera.

### side_events — MEDIO
- [anon] events: una fila por `id` (página del side event).
- [auth]/[admin] como invitations; también escribe `credits` desde el navegador.

### tables — BAJO
- [anon] events: todas las mesas de una invitación (pase) y una por id (wallet);
  vite scanner por `invitation_id`.

### event_photos — BAJO (público por diseño)
- [anon] events: conteo por `event_id`+`guest_name` y realtime del Photo Wall.

### save_the_dates — BAJO (público por diseño)
- [anon] events: una fila por id.

### Fuera de la lista pero con el mismo problema
- `pop_users`: anon actualiza `profile`/`emoji` **por `id` sin verificar dueño**
  (`ConfirmCard.tsx:169`); realtime de `pop_guests`/`pop_users` sin filtro.
- `invitation_translations` y `copy_translations`: events hace `upsert` anónimo en
  servidor al no tener caché.
- RPCs `get_total_invitations_by_user(p_user_id)` y
  `get_confirmed_guests_count_by_user(p_user_id)`: reciben el user id del cliente;
  verificar que comparen con `auth.uid()`.

## 3. Propuesta por fases

### Fase 1 — sin cambios de código (aplicable ya)

Quitar la lectura/escritura anónima de las tablas que **ninguna pantalla sin sesión
usa**. Va por `REVOKE` de privilegios: no depende de cómo se llamen las políticas
actuales y Postgres revisa el GRANT antes que las políticas, así que corta el acceso
de `anon` aunque exista una política permisiva. `authenticated` y el backend (service
role) quedan igual. Las RPC `SECURITY DEFINER` siguen funcionando.

```sql
-- Fase 1: anon fuera de tablas que solo usa el organizador / admin / backend.
revoke all on table
  public.profiles,
  public.invitation_message_dispatches,
  public.invitation_reminder_dispatches,
  public.whatsapp_incoming_messages,
  public.whatsapp_freetext_dispatches,
  public.invitation_versions
from anon;
```

Reversible con `grant select on … to anon;` (o el privilegio que tuviera).

**Qué cierra:** perfiles con correo, teléfonos de envíos, mensajes de WhatsApp de
invitados e historial de invitaciones (≈4,500 filas). **Qué no cierra todavía:**
`guests`, `side_events_guests`, `invitations` (son las que usa la página del
invitado y el scanner: requieren la Fase 2).

### Fase 1b — acotar `authenticated` en esas mismas tablas

Como cualquiera puede registrarse, también hay que acotar lo que lee un usuario con
sesión. Necesita el resultado de las consultas de diagnóstico (nombres de políticas
actuales y columnas de `whatsapp_*`) para escribirlo sin romper el dashboard. Esbozo:

```sql
-- ¿Es admin? (rol en la base, no en localStorage)
create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles
                 where user_id = auth.uid() and role = 'Administration' and coalesce(active, true));
$$;
grant execute on function public.es_admin() to authenticated;

-- ¿Puede gestionar este side event? (Flash: dueño o planner; de boda: su invitación)
create or replace function public.can_manage_side_event(p_side_event_id bigint)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.side_events s
    where s.id = p_side_event_id
      and (
        (s.invitation_id is not null and public.can_manage_invitation(s.invitation_id))
        or s.user_id = auth.uid() or s.planner_id = auth.uid()
        or public.es_admin()
      )
  );
$$;
grant execute on function public.can_manage_side_event(bigint) to authenticated;

-- Ejemplo (se sustituyen las políticas actuales de la tabla):
-- invitation_versions: select solo de invitaciones que gestiona.
-- create policy invitation_versions_select on public.invitation_versions
--   for select to authenticated using (public.can_manage_invitation(invitation_id));
-- profiles: la propia, admin, o el dueño de una invitación que gestiona (planner).
-- create policy profiles_select on public.profiles for select to authenticated using (
--   user_id = auth.uid() or public.es_admin()
--   or exists (select 1 from public.invitations i
--              where i.user_id = profiles.user_id and public.can_manage_invitation(i.id)));
```

### Fase 2 — invitado y scanner por RPC (requiere cambios de código)

La página del invitado deja de leer/escribir `guests` y `side_events_guests`
directamente y usa funciones `SECURITY DEFINER` que exigen el código del pase. Después
se hace `revoke all … from anon` en esas dos tablas.

```sql
-- Invitado + acompañantes a partir de su código (reemplaza select por password).
create or replace function public.invitado_por_codigo(p_codigo text, p_invitation_id uuid)
returns setof public.guests language sql stable security definer set search_path = public, pg_temp as $$
  with titular as (
    select * from public.guests
    where password = p_codigo and invitation_id = p_invitation_id
    limit 1
  )
  select * from titular
  union all
  select g.* from public.guests g join titular t on g.companion_id = t.id;
$$;
grant execute on function public.invitado_por_codigo(text, uuid) to anon, authenticated;

-- Confirmar / rechazar: solo el titular (por código) y sus acompañantes.
create or replace function public.responder_invitacion(
  p_codigo text, p_invitation_id uuid, p_respuestas jsonb  -- [{id, name, state}]
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_titular uuid;
begin
  select id into v_titular from public.guests
   where password = p_codigo and invitation_id = p_invitation_id limit 1;
  if v_titular is null then raise exception 'codigo invalido'; end if;

  update public.guests g set
    name = coalesce(r.name, g.name),
    state = r.state,
    last_action = case r.state when 'rechazado' then 'rechazado' else 'confirmado' end,
    last_update_date = now(),
    last_action_by = 'guest'
  from jsonb_to_recordset(p_respuestas) as r(id uuid, name text, state text)
  where g.id = r.id
    and (g.id = v_titular or g.companion_id = v_titular)
    and r.state in ('confirmado', 'rechazado');
end;
$$;
grant execute on function public.responder_invitacion(text, uuid, jsonb) to anon, authenticated;
```

Además, por pantalla:
- **Invitación abierta** (alta de invitado anónima): RPC `registrar_invitado_abierto`
  que verifique `invitations.type = 'open'` antes de insertar.
- **Side event**: el mismo par de RPC para `side_events_guests` (incluido el update de
  acompañantes, hoy solo por `id`).
- **`/api/wallet/pass`**: es código de servidor → usar service role (o pedir el código).
- **Scanner** (vite): moverlo a un endpoint del backend con un PIN real por evento
  (o una RPC que valide el PIN), y dejar de listar todas las invitaciones con correo.
- **`invitations` / `side_events` para anon**: limitar columnas con GRANT por columna
  (`revoke select … from anon; grant select (id, label, name, data, type, plan,
  mongo_id, url_image, phone_number) on public.invitations to anon;`) para que
  `user_email`, `credits`, etc. no salgan.

### Fase 3 — organizador acotado

Con el anónimo ya fuera, reemplazar en `guests`, `side_events_guests`, `tables`,
`side_events`, `invitations`, `event_photos`, `save_the_dates`, `layout_elements`,
etc. cualquier `to authenticated using (true)` por
`can_manage_invitation(invitation_id)` / `can_manage_side_event(...)` / `es_admin()`.
El realtime del dashboard (`DashboardRealtimeContext`, sin filtro) depende de esto
para no transmitir filas de otros eventos.

Arreglos de código que van de la mano:
- `credits` de `invitations` y `side_events`: dejar de escribirlo desde el navegador
  (usar RPC como `consume_side_event_credits`).
- Validación de slug (`Header.jsx`, `NewInvitationDrawer.jsx`): RPC
  `nombre_disponible(name)` en vez de leer todos los nombres.
- `WhatsappMessages.jsx:29`: filtrar también por la invitación.
- Analítica del Admin (`traerTodo`) y `AdminLayout` (`select('*')`): funcionan con
  `es_admin()` en las políticas o pasando a endpoints del backend.

## 4. Pantallas a probar

Después de **Fase 1** (solo deberían seguir igual):
- Login y registro (lee `profiles` ya con sesión).
- `/dashboard` del organizador: bento, conversaciones de WhatsApp, realtime.
- `/dashboard/guests`: estatus de envíos (RPC de dispatches).
- `/dashboard/build`: publicar (crea `invitation_versions`), historial.
- `/dashboard/side` y Flash: estatus de envíos.
- `/admin`: Hoy, Buzón (conversaciones), Analítica, Usuarios.
- Página del invitado en iattend.events: abrir, confirmar, rechazar (no usa estas tablas).

Después de **Fase 2/3** (cambian):
- Invitación cerrada: entrar con `?password=`, con código manual y recargando
  (localStorage); confirmar, rechazar, acompañantes.
- Invitación abierta: registrarse, acompañantes, volver a entrar.
- Side event y Flash: entrar con código, confirmar/rechazar, acompañantes.
- Pases: panel "Pases" del dock y Apple Wallet (`/api/wallet/pass`).
- Photo Wall: contador de la cámara y tiempo real.
- Save the date: abrir, reacciones (insert + realtime).
- `/scanner`: entrar, escanear, marcar llegada, tiempo real.
- `/preview`, `/checkout`, `/onboarding-preview`, `/linktree` (leen invitaciones fijas).
- Organizador y **planner** en todo `/dashboard/*` con eventos de un cliente.
- Admin: Eventos, Usuarios, Analítica, Hoy.
- Eventos Pop (`/pop/*`), si siguen activos.
