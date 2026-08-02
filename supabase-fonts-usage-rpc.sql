-- RPC: uso de fonts en invitaciones existentes
--
-- Corre este script manualmente en el SQL Editor del dashboard de Supabase
-- del proyecto real de iattend, después de supabase-fonts-migration.sql
-- (no se puede correr desde este entorno).
--
-- La selección de font vive en 4 llaves fijas dentro de invitations.data
-- (campo `typeFace`, no `value` — confirmado por Alberto, ver handoff):
--   cover.title.text.typeFace
--   quote.text.font.typeFace
--   generals.fonts.body.typeFace
--   generals.fonts.titles.typeFace
--
-- No es autoextensible: si en el futuro aparece una quinta ubicación de
-- font, hay que agregar esa ruta al array[...] a mano.

create or replace function get_font_usage()
returns table (font_family text, invitation_count bigint, invitation_ids uuid[])
language sql
stable
as $$
  with usage as (
    select
      id,
      unnest(array[
        data->'cover'->'title'->'text'->>'typeFace',
        data->'quote'->'text'->'font'->>'typeFace',
        data->'generals'->'fonts'->'body'->>'typeFace',
        data->'generals'->'fonts'->'titles'->>'typeFace'
      ]) as font_family
    from invitations
  )
  select
    font_family,
    count(distinct id) as invitation_count,
    array_agg(distinct id) as invitation_ids
  from usage
  where font_family is not null
  group by font_family;
$$;

-- Permite llamar la función vía RPC con la anon key (solo lectura, no
-- modifica datos) — mismo patrón que la policy de lectura pública de
-- supabase-fonts-migration.sql.
grant execute on function get_font_usage() to anon, authenticated;
