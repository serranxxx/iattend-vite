-- El bucket "assets" (donde viven las imágenes de texturas, en la carpeta
-- Textures/) hoy solo permite lectura pública -- no tiene policy de INSERT/
-- DELETE para storage.objects, así que cualquier subida desde la app (el
-- botón "Agregar textura" del tab Texturas, y el Laboratorio de texturas)
-- falla con "new row violates row-level security policy".
--
-- Corre esto en el SQL Editor del dashboard de Supabase.

create policy "assets_insert_authenticated" on storage.objects
  for insert
  with check (bucket_id = 'assets' and auth.role() = 'authenticated');

create policy "assets_delete_authenticated" on storage.objects
  for delete
  using (bucket_id = 'assets' and auth.role() = 'authenticated');

-- update no es estrictamente necesario hoy (el upload usa upsert:true, que
-- en Storage internamente hace insert-or-replace vía la policy de insert),
-- pero se incluye por si algo lo requiere más adelante.
create policy "assets_update_authenticated" on storage.objects
  for update
  using (bucket_id = 'assets' and auth.role() = 'authenticated')
  with check (bucket_id = 'assets' and auth.role() = 'authenticated');
