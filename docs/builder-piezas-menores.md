# Piezas menores del builder y del dashboard

Agrupa cambios más chicos del mes que no ameritan un doc propio pero valen la pena tener
localizados: música en la invitación, banners de novedades, la calculadora de prioridad de
invitados, y los fixes de scroll/preview móvil del builder.

## Subida de música (commit `515de8c`, 4-ago)

`src/helpers/services/uploadAudio.js` — `uploadSongAudio({ file, invitationID })`. Sube el
clip al bucket `user_images` de Supabase Storage (mismo bucket que otros assets del
organizador, no uno dedicado a audio) bajo `{invitationID}/audio/{timestamp}-{filename}`, y
devuelve la URL pública. Límite duro de **8 MB**; si el archivo pesa más, se rechaza con un
`message.warning` y la función devuelve `null` sin llegar a subir nada.

Se usa desde `BuildGenerals.jsx` (sección de generales del builder) para asociar una canción a
la invitación.

## Banners de novedades — `WhatsNewBanners` (commit `27b7c1b`, 22-ago)

`src/components/WhatsNewBanners/WhatsNewBanners.jsx`. Se monta **una sola vez** en
`DashboardLayout` (`AppRouter.jsx`), así que aparece como overlay fijo en cualquier ruta
`/dashboard/*` hasta que el organizador lo cierra — el cierre se persiste por banner en
`localStorage` (`iattend_wn_{key}_v1`), no hay tabla en Supabase para esto.

Catálogo actual (`BANNERS`, hardcodeado en el archivo — agregar un banner nuevo es agregar una
entrada aquí + sus keys de i18n bajo `whats_new.*`):

- `reminders` — anuncia los recordatorios manuales de WhatsApp
- `retry` — anuncia el reintento de envíos fallidos

El botón "Lo nuevo" de `GuestsPage` los reabre disparando `WHATS_NEW_OPEN_EVENT` (un
`CustomEvent` de `window`, solo en memoria — no vuelve a limpiar el `localStorage`, así que al
cerrarlos de nuevo quedan descartados otra vez). El CTA "Ir a invitados" no se muestra si ya
estás en `/dashboard/guests` (no tiene sentido navegar a donde ya estás).

## Calculadora de prioridad de invitados — `CalculateTier` reescrita (commit `068289c`, 2-ago)

`src/components/Create/CalculateTier/CalculateTier.jsx`. Asigna un tier (`A`/`B`/`C`/`D`) a un
invitado según 4 preguntas de opción múltiple (antes era un `Rate` de estrellas con solo 2
preguntas). Flujo por pasos (`STEP_Q1..STEP_Q4 → STEP_RESULT`), cada pregunta usa un
`ChipGrid` (botones tipo chip en vez de estrellas) con niveles 1–4.

Cálculo del resultado (`computeResult`): promedio ponderado de las 4 respuestas → `score`, y
el `score` se mapea a categoría con cortes fijos:

```
score >= 3.25 → A
score >= 2.50 → B
score >= 1.75 → C
default       → D
```

El resultado (`priorityCalc.category`) se guarda en `guest.tier` vía `updateGuestField`. El
mapeo de tier a texto descriptivo (`categoryDescription`) sale de i18n
(`calculate_tier.result_*`), no está hardcodeado en JS.

## Scroll y preview móvil del builder (commit `53cfaec`, 5-ago)

Dos fixes independientes sobre la experiencia del builder en móvil:

### 1. Auto-scroll duplicado al abrir el builder (`ReactHost.jsx`)

El iframe de la invitación pedía auto-scroll a la sección activa cada vez que cambiaba
`scrollToSection` — incluyendo el **primer mount**, cuando el iframe ya abre en "cover" por
defecto. Ese scroll redundante en el primer render trababa el primer swipe del usuario dentro
del iframe. Fix: `isFirstScrollRef` — el primer disparo del efecto solo sincroniza la
referencia (`lastSentSectionRef`), sin enviar el mensaje de scroll al iframe.

### 2. Panel inferior del builder en móvil (`BuildMenu.jsx`)

Rehecho el comportamiento de "ocultar/expandir" del panel de edición en móvil:

- Antes: el panel se movía fuera de pantalla con `transform: translateY(...)`, dejando una
  zona invisible que seguía capturando touches encima del iframe — el usuario no podía hacer
  scroll manual en la invitación con el panel "oculto".
- Ahora: el panel se **encoge** con `height` (de `calc(100vh - 56px)` expandido a solo
  `CONTROLS_ROW_HEIGHT` = 64px oculto — la fila de controles con Guardar/Publicar siempre
  visible), recortado por `overflow: hidden`, no por transform. Sin zona fantasma: lo que no
  se ve, no ocupa espacio de touch.

Junto con esto se agregaron los botones de Guardar (`onSave`/`saving`) y Publicar
(`onPublish`) directamente en la fila de controles del panel móvil — antes vivían en otro
lugar del layout desktop-only.

`PreviewMoodMobile.jsx` se simplificó para reusar `BuildMenu`/`BuildContent` reales del
builder en vez de una implementación paralela — reduce el riesgo de que la preview móvil se
desincronice visualmente del builder real.
