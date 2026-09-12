# Labs de personalización — Texturas y Fuentes

Documenta la migración de dos catálogos de assets de personalización del builder —
texturas de fondo y tipografías — de archivos estáticos del bundle a catálogos dinámicos en
Supabase, cada uno con su "laboratorio" de administración. Texturas: commit `4eb852a`
(23-jul). Fuentes: commit `068289c` (2-ago).

## Por qué

Antes, agregar una textura o una fuente nueva significaba subir un JPG a
`src/assets/textures/` o agregar un `<link>` en `index.html` y hacer deploy. Ahora se
administran desde el panel de Admin sin tocar código ni redeployar el frontend.

## Texturas

### Antes → después

| Antes | Ahora |
|---|---|
| JPGs estáticos en `src/assets/textures/` (~7 MB en el bundle) | Bucket de Supabase Storage, filas en tabla `textures` |
| `src/helpers/services/textures.js` (catálogo hardcodeado, eliminado) | `TexturesContext` (fetch a Supabase) |

### `TexturesContext.jsx`

Provider simple: al montar, hace `select * from textures where is_active = true order by
sort_order` y expone `{ textures, loading }` vía `useTextures()`. Cada fila se mapea a
`{ id, image, opacity, blend, filter }` (los tres últimos son los parámetros CSS que se
aplican sobre la imagen — no todas las texturas cargadas tienen el mismo blend mode).

### `TextureLabPage.jsx` (`/admin` → sección Herramientas → Laboratorio)

Editor visual: sube una imagen (`uploadTextureImage`, en
`src/helpers/services/uploadImage.jsx`), ajusta opacidad (`Slider`), blend mode (16 opciones
CSS: `multiply`, `screen`, `overlay`, etc.) y un filtro (`grayscale/contrast/brightness`,
default `grayscale(1) contrast(1) brightness(1)`). El preview se renderiza en vivo sobre una
invitación de prueba fija (`LAB_INVITATION_ID`, la misma para todos los labs de este
documento) usando el mismo `BuildContent` del builder real — no hay una vista de preview
separada que se pueda desincronizar del builder.

Soporta modo edición (`?id=<textureId>` en la URL) para modificar una textura ya publicada.

## Fuentes

### Antes → después

| Antes | Ahora |
|---|---|
| 26 fuentes de Google Fonts hardcodeadas como `<link>` en `index.html` | Catálogo dinámico, tabla `fonts` en Supabase |
| Cambiar la lista = editar `index.html` + deploy | Instalar desde `FontLabPage` (`/admin`) |

### Carga en runtime (`loadFonts.js`, llamado desde `main.jsx` vía `initGoogleFonts()`)

Un solo `<link id="google-fonts-dynamic">` inyectado en `<head>` con la query de Google Fonts
API v2 (`family=X:wght@...&family=Y...`). Estrategia stale-while-revalidate:

1. Al arrancar, inyecta inmediato lo que haya en `localStorage` (`iattend_fonts_cache`, TTL
   1h) o, si no hay cache, el **fallback duro**: las mismas 26 fuentes que antes vivían en
   `index.html` — así un fallo de red nunca deja a la plataforma sin tipografías.
2. Si el cache está vencido (o no existe), dispara en segundo plano un fetch a
   `fonts` (`select family, google_axis, source where active = true`), filtra las que son
   `google_fonts` (las `self_hosted`/sistema no se piden a Google Fonts), inyecta el link
   actualizado y refresca el cache.

### `FontsContext.jsx`

Análogo a `TexturesContext`: expone `{ fonts, loading }` con la lista de `family` activas,
usado por los selectores de tipografía dentro del builder (`BuildCover`, `BuildGenerals`,
`BuildQuote`).

### `FontLabPage.jsx` (`/admin` → sección Herramientas)

Más grande que el de texturas: incluye un buscador/paginador contra el catálogo completo de
Google Fonts (`browseGoogleFonts`, backend `/api/admin/fonts/google-search`), filtro por
categoría (`Sans Serif`, `Serif`, `Display`, `Handwriting`, `Monospace`), selección múltiple,
e "instalar" (`installAdminFont` → `POST /api/admin/fonts`) que agrega la fuente elegida a la
tabla `fonts`. El preview usa la misma invitación de prueba y los mismos componentes de
`BuildSections` que el builder real.

## Gotcha compartido

Ambos labs reutilizan `LAB_INVITATION_ID = '3cb0ab8b-41cb-428d-b383-ff9d5bbae17d'` y montan
`BuildContent`/`BuildSections` reales — si se cambia el shape de `invitation.data` en el
builder, hay que revisar que estas dos páginas no se rompan (arman un espejo dev/prod similar
al que arma `BuildPage.jsx` antes de pasarle datos a esos mismos componentes).
