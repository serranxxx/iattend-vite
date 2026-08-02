-- Patch: la tabla `fonts` ya existe en producción (creada con
-- supabase-fonts-migration.sql) pero quedó vacía — el insert original no
-- se aplicó. Corre esto manualmente en el SQL Editor del dashboard de
-- Supabase (no se puede correr desde este entorno).
--
-- Agrega la columna `source` (no existía en la versión ya corrida de la
-- migración) y siembra las 26 fonts de Google + "Chiro" (self-hosted,
-- confirmado por Alberto — ver @font-face en src/styles/index.css /
-- globals.css en ambos repos).
--
-- Si ya corriste esto una vez, el ALTER falla en seco (columna ya existe)
-- y el INSERT falla en seco por el unique de `family` — no lo corras dos
-- veces sin revisar antes.

alter table public.fonts
  add column source text not null default 'google_fonts'
    check (source in ('google_fonts', 'self_hosted', 'system'));

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
  ('Chiro',                  null,                                                                    null,           'self_hosted',  true);
