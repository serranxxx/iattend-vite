-- Corrige las URLs de textures.image_url: el seed original se corrió con el
-- placeholder <BUCKET_URL> literal en vez de la URL pública real del bucket.
-- Corre esto en el SQL Editor del dashboard de Supabase.

update public.textures set image_url = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Textures/paper.jpg'    where id = 0;
update public.textures set image_url = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Textures/pared.jpg'    where id = 1;
update public.textures set image_url = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Textures/paper-2.jpg'  where id = 2;
update public.textures set image_url = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Textures/textile.jpg'  where id = 3;
update public.textures set image_url = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Textures/grunge.jpg'   where id = 4;
update public.textures set image_url = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Textures/crumpled.jpg' where id = 5;
update public.textures set image_url = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Textures/cotton.jpg'   where id = 6;
update public.textures set image_url = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Textures/leather.jpg'  where id = 7;
update public.textures set image_url = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Textures/magazine.jpg' where id = 8;
update public.textures set image_url = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Textures/flowers.jpeg' where id = 9;
update public.textures set image_url = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Textures/trees.jpg'    where id = 10;
