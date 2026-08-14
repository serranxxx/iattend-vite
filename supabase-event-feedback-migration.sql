-- Migración: sistema de reviews/feedback por evento
--
-- Corre este script manualmente en el SQL Editor del dashboard de Supabase
-- del proyecto real de iattend (no se puede correr desde este entorno).
--
-- Guarda 1-5 estrellas + comentario opcional por invitación, capturado desde
-- un botón/modal en el header del dashboard (ver
-- src/components/FeedbackPrompt/). Se revisa desde la sección "Feedback"
-- nueva en el panel de Admin (ver src/pages/Admin/FeedbackAdminPage.jsx).
--
-- Trigger para mostrar el botón (evaluado en el frontend, no aquí):
--   días desde invitations.created_at >= 15 AND existe >=1 row en
--   invitation_versions para ese invitation_id.
--
-- Cadencia de reintento tras "Ahora no" (confirmada por Alberto, distinta a
-- la sugerencia original del handoff de 14 días/máx. 2 intentos): se vuelve
-- a mostrar 3 días después del último skip, SIN límite de intentos totales.
-- `skip_count` se conserva solo como dato informativo (cuántas veces ha
-- dicho "ahora no"), no se usa para bloquear el reintento.

create table public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'skipped', 'submitted')),
  rating smallint
    check (rating between 1 and 5),
  comment text,
  shown_at timestamptz not null default now(),   -- primera vez que se mostró el prompt
  skipped_at timestamptz,                         -- último "ahora no"
  skip_count smallint not null default 0,         -- informativo, no gatea el reintento
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invitation_id)
);

create index idx_event_feedback_status on public.event_feedback(status);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_event_feedback_updated_at
before update on public.event_feedback
for each row execute function public.set_updated_at();

-- RLS — permisiva, mismo nivel de riesgo ya aceptado hoy en
-- GuestsPage.jsx/SideEvents.jsx (escritura directa con anon key, sin
-- auth.uid() disponible porque el login de iattend-vite es JWT propio +
-- Mongo, no Supabase Auth). No es una regla nueva de seguridad, es
-- consistencia con el patrón ya aceptado. Confirmado por Alberto.
alter table public.event_feedback enable row level security;

create policy "event_feedback_select_anon"
on public.event_feedback for select
to anon, authenticated
using (true);

create policy "event_feedback_insert_anon"
on public.event_feedback for insert
to anon, authenticated
with check (true);

create policy "event_feedback_update_anon"
on public.event_feedback for update
to anon, authenticated
using (true)
with check (true);

-- ⚠️ Addendum post-pruebas con datos reales: el frontend necesita leer
-- invitation_versions directo con la anon key (useFeedbackTrigger.js hace
-- `select id from invitation_versions where invitation_id = ...` para saber
-- si ya se publicaron cambios). Esa tabla nunca se había consultado desde
-- iattend-vite antes de este feature (solo desde el backend con la
-- service-role key), y hoy la anon key recibe "permission denied for table
-- invitation_versions" (42501) al intentarlo — confirmado probando contra
-- la invitación real f282bb98-6d9c-446d-8ef6-1dacff261732. Sin este grant/
-- policy el botón de feedback nunca se muestra (el hook falla cerrado ante
-- cualquier error de consulta).
--
-- "permission denied for table" es un error de GRANT (privilegio a nivel
-- tabla), no de RLS — Postgres lo revisa ANTES de evaluar cualquier policy.
-- Habilitar RLS y agregar una policy de lectura no alcanza si el rol nunca
-- tuvo el GRANT SELECT; por eso el primer intento (solo RLS + policy, sin
-- este GRANT explícito) no resolvió el problema — lo confirmé volviendo a
-- probar contra la misma invitación después de que corrieras ese bloque.
grant select on public.invitation_versions to anon, authenticated;

-- Si esta tabla ya tenía RLS habilitado con otras policies (insert/update
-- desde el backend con service-role), este bloque solo agrega la de
-- lectura para anon — no toca insert/update/delete. Si ya corriste el
-- `enable row level security` / `create policy` de un intento anterior,
-- correr esas dos líneas de nuevo fallará con "policy already exists" —
-- en ese caso solo necesitas el `grant select` de arriba.
alter table public.invitation_versions enable row level security;

create policy "invitation_versions_select_anon"
on public.invitation_versions for select
to anon, authenticated
using (true);
