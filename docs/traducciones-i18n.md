# Traducciones de la invitación — selector de idioma en el builder

Documenta el selector de idiomas del builder (commit `068289c`, 2-ago), que le permite al
organizador traducir su invitación a otros idiomas vía DeepL. **No confundir con `i18next`**
(las traducciones de la interfaz de esta app, en `src/locales/{es,en}.json`) — esto es sobre
el **contenido de la invitación del invitado**, y el motor de traducción real vive en
`iattend-events`.

## Frontera entre repos (importante)

Este repo **no llama a DeepL ni lee las tablas de traducción directamente**. Todo pasa por la
API de `iattend-events`:

```
src/helpers/services/translationApi.js
  fetchDeepLLanguages()   → GET  {EVENTS_URL}/api/translation/languages
  translateInvitation()   → POST {EVENTS_URL}/api/translation/invitation
```

`EVENTS_URL` = `VITE_IATTEND_EVENTS_URL`, default `https://www.iattend.events`. Requiere una
sesión activa de **Supabase Auth** (`authHeaders()` lanza si no hay `access_token` — a
diferencia del resto del repo, que usa la sesión JWT propia + Mongo).

Si `translateInvitation` responde `402`, se lanza un error con `code: 'NO_CREDITS'` — traducir
consume créditos, y el consumo/validación de crédito vive en el backend de `iattend-events`,
no aquí.

## `LanguageSelector.jsx`

Dropdown en la barra de herramientas del builder (`BuildContent.jsx`). Cachea la lista de
idiomas de DeepL en memoria del componente (fetch solo la primera vez que se abre el
dropdown), con búsqueda por nombre o código. Los "idiomas populares"
(`src/helpers/services/languageFlags.js` → `POPULAR_LANGUAGES` + `flagForLanguage`) se
muestran primero con su bandera; el resto sale de la lista completa de DeepL.

Props que recibe desde `BuildPage.jsx` (el selector no tiene estado de traducción propio):
`languages`, `disabledLanguages`, `activeLang`, `onActiveLangChange`, `onAddLanguage`,
`onToggleLanguageEnabled`, `onRetranslate`, `translating`.

## Estado de traducciones en `BuildPage.jsx`

```js
const [translations, setTranslations] = useState({})  // { [lang]: { content, section_hashes } }
```

- **`content`** — el JSON de la invitación traducido a ese idioma (mismo shape que `copy`, el
  contenido en español).
- **`section_hashes`** — un hash SHA-1 (`src/helpers/services/sha1.js`, mismo algoritmo que
  `iattend-events/src/lib/translation/cache.ts` para poder comparar sin llamada de red) por
  sección del contenido en español **al momento de traducir**. Es la base de la detección de
  "traducción desactualizada".

### `staleSections` — detección de secciones desactualizadas

Cuando el organizador edita el español después de haber traducido, `BuildPage.jsx` recalcula
el hash de cada sección del español actual y lo compara contra `section_hashes` guardado en
la traducción activa. Las secciones cuyo hash cambió se marcan en `staleSections` (un `Set`) y
se pasan a `ButtonsMenu` para resaltarlas visualmente — así el organizador sabe qué partes de
la traducción quedaron obsoletas sin tener que adivinar.

### `addLanguage` / `retranslate` / `toggleLanguageEnabled`

- `addLanguage(code)` — llama a `translateInvitation`, guarda `content` + `section_hashes` en
  `translations[code]`.
- `retranslate(code)` — igual, pero para refrescar un idioma ya agregado (típicamente después
  de ver `staleSections`).
- `toggleLanguageEnabled(code)` — activa/desactiva un idioma sin volver a traducir; controla
  si el invitado ve el selector de idioma en la invitación pública
  (`copy.generals.languages`/`disabledLanguages`, persistido de inmediato — no depende de que
  alguien vuelva a la pestaña ES y le dé Guardar).

### `mergeSourceIntoTranslation`

Cuando cambia el español, este helper propaga los campos que **no se traducen** (ej. cantidad
de items en un arreglo, nombres de personas de la familia si no cambiaron) hacia el objeto de
traducción, para no perder la estructura de la traducción existente por un cambio menor en el
español. Compara longitudes de arreglos (`personas`, `itinerary.items`, `gifts.cards`,
`destinations.cards`, `notices.notices`) antes de mapear campo por campo — si el arreglo
cambió de tamaño, no intenta mapear y deja que una nueva traducción lo resuelva.

## Publicar con traducciones

Publicar sigue yendo por `publish_invitation` (ver
[historial-versiones.md](./historial-versiones.md)) — las traducciones no tienen su propio
flujo de publicación separado del contenido en español.
