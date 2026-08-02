-- Migración: catálogo de fonts centralizado en Supabase
--
-- Corre este script manualmente en el SQL Editor del dashboard de Supabase
-- del proyecto real de iattend (no se puede correr desde este entorno).
--
-- Reemplaza el <link> hardcodeado de Google Fonts en index.html (iattend-vite)
-- y en src/app/layout.tsx (iattend-events) por una tabla editable sin deploy.
--
-- Semilla: las 26 fonts que hoy están en el <link> de iattend-vite/index.html
-- (líneas 22-52), con su google_axis exacto tomado de ahí, más "Chiro"
-- (self-hosted, ver columna `source`).
--
-- ⚠️ Pendiente, no incluido aquí: `get_font_usage()` reporta que "Georgia"
-- está en uso en invitaciones reales (6) pero no aparece en ningún <link>
-- de Google Fonts de ningún repo — es la fuente nativa del sistema
-- operativo (source='system' sería lo correcto), no necesita carga alguna.
-- Falta confirmar con Alberto si se agrega como fila con source='system'.
--
-- ⚠️ Discrepancia encontrada y NO incluida aquí: el <link> de
-- iattend-events/src/app/layout.tsx trae una familia extra, "Geom", con axis
-- "ital,wght@0,300..900;1,300..900", que no aparece en el <link> de
-- iattend-vite ni en la lista original de 26 del handoff. No se puede
-- confirmar de forma confiable si "Geom" es una familia real de Google
-- Fonts (o un nombre custom/typo) sin revisar el dashboard de Google Fonts
-- o preguntarle a quien la agregó. Se mantiene en el fallback hardcodeado
-- de src/components/GoogleFontsLoader.tsx (iattend-events) para no perder
-- la fuente si el fetch a Supabase falla, pero falta decidir si se agrega
-- también aquí como fila de la tabla `fonts`. Confirmar con Alberto antes
-- de borrar el <link> estático de iattend-events.
--
-- Escritura: a diferencia de "textures_write_authenticated" (política RLS
-- ligada a auth.role() = 'authenticated'), en este proyecto el admin-gating
-- real de tablas administrativas (vendedores, ventas) NO vive en políticas
-- RLS versionadas — vive en middlewares de Express que corren con la
-- SUPABASE_SERVICE_ROLE_KEY (bypassa RLS) y validan profiles.role =
-- 'Administration' (ver iattend--backend/helpers/adminAuth.js). Para
-- mantener ese mismo patrón (y no inventar uno nuevo), esta tabla solo
-- define una policy de lectura pública; toda escritura debe hacerse vía
-- endpoints nuevos en el backend (con validarAdmin), nunca desde el
-- frontend con la anon key.

create extension if not exists pgcrypto;

create table public.fonts (
  id            uuid primary key default gen_random_uuid(),
  family        text not null unique,
  google_axis   text,
  category      text,
  -- 'google_fonts': se carga vía el <link> dinámico de css2.googleapis.com.
  -- 'self_hosted': @font-face propio (ver src/styles/index.css / globals.css),
  --   ya servido como archivo estático en ambos repos — el loader dinámico
  --   NO debe intentar pedirla a Google (la ignoraría sin romper nada, pero
  --   es información falsa listarla como si viniera de ahí).
  -- 'system': fuente nativa del SO (ej. Georgia) — no requiere carga alguna.
  source        text not null default 'google_fonts'
                  check (source in ('google_fonts', 'self_hosted', 'system')),
  active        boolean not null default true,
  installed_at  timestamptz not null default now(),
  installed_by  uuid references profiles(user_id)
);

alter table public.fonts enable row level security;

-- Lectura pública: iattend-vite y iattend-events leen con la anon key, sin login.
create policy "fonts_select_public" on public.fonts
  for select using (true);

-- Sin policy de insert/update/delete a propósito: la escritura solo debe
-- ocurrir desde el backend (service role key + validarAdmin), igual que
-- vendedores/ventas.

insert into public.fonts (family, google_axis, category, source, active) values
  ('Anton SC',               null,                                                                    'display',      'google_fonts', true),
  ('Kaisei Opti',            null,                                                                    'serif',        'google_fonts', true),
  ('Lilita One',             null,                                                                    'display',      'google_fonts', true),
  ('Outfit',                 'wght@100..900',                                                         'sans-serif',   'google_fonts', true),
  ('Poppins',                'ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900', 'sans-serif', 'google_fonts', true),
  ('Libre Franklin',         'ital,wght@0,100..900;1,100..900',                                       'sans-serif',   'google_fonts', true),
  ('Signika',                'wght@300..700',                                                         'sans-serif',   'google_fonts', true),
  ('Comfortaa',              'wght@300..700',                                                         'display',      'google_fonts', true),
  ('DM Serif Display',       'ital@0;1',                                                              'serif',        'google_fonts', true),
  ('Dancing Script',         'wght@400..700',                                                         'handwriting',  'google_fonts', true),
  ('Libre Baskerville',      'ital,wght@0,400;0,700;1,400',                                           'serif',        'google_fonts', true),
  ('Mulish',                 'ital,wght@0,200..1000;1,200..1000',                                     'sans-serif',   'google_fonts', true),
  ('Noto Sans',              'ital,wght@0,100..900;1,100..900',                                       'sans-serif',   'google_fonts', true),
  ('Open Sans',              'ital,wght@0,300..800;1,300..800',                                       'sans-serif',   'google_fonts', true),
  ('Platypi',                'ital,wght@0,300..800;1,300..800',                                       'serif',        'google_fonts', true),
  ('Playfair Display',       'ital,wght@0,400..900;1,400..900',                                       'serif',        'google_fonts', true),
  ('Quicksand',              'wght@300..700',                                                         'sans-serif',   'google_fonts', true),
  ('Roboto',                 'ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900', 'sans-serif', 'google_fonts', true),
  ('Sedan',                  'ital@0;1',                                                              'serif',        'google_fonts', true),
  ('Work Sans',              'ital,wght@0,100..900;1,100..900',                                       'sans-serif',   'google_fonts', true),
  ('Cedarville Cursive',     null,                                                                    'handwriting',  'google_fonts', true),
  ('Edu NSW ACT Cursive',    'wght@400..700',                                                          'handwriting',  'google_fonts', true),
  ('Fredoka',                'wght@300..700',                                                         'sans-serif',   'google_fonts', true),
  ('Tangerine',              'wght@400;700',                                                          'handwriting',  'google_fonts', true),
  ('WindSong',               'wght@400;500',                                                          'handwriting',  'google_fonts', true),
  ('Monsieur La Doulaise',   null,                                                                    'handwriting',  'google_fonts', true),
  -- Chiro: @font-face self-hosted (ver comentario en la definición de la
  -- columna `source`), no viene de Google Fonts. Confirmado por Alberto.
  ('Chiro',                  null,                                                                    null,           'self_hosted',  true);
