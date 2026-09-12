# Sistema de reviews / feedback por evento

Documenta el feature de reviews implementado el 2026-08-14 (commit `883028d`): 1–5 estrellas
+ comentario opcional, **una review por invitación**, capturada desde un botón en el header
del dashboard y revisada desde una sección nueva en el panel de Admin.

## Por qué

No había forma de saber qué tan satisfecho estaba el organizador con la plataforma. Se buscó
capturar la opinión en el momento en que ya tiene contexto real de uso (no al registrarse),
sin bloquear ni interrumpir el flujo de trabajo — de ahí que sea un botón discreto en el
header y no un modal automático.

## Piezas

| Archivo | Qué hace |
|---|---|
| `src/components/FeedbackPrompt/useFeedbackTrigger.js` | Toda la lógica: decide si mostrar el botón, cachea el resultado, hace el upsert al enviar |
| `src/components/FeedbackPrompt/FeedbackButton.jsx` | Botón "Ayúdanos a mejorar" (variante `compact`: solo la estrella, para móvil) |
| `src/components/FeedbackPrompt/FeedbackModal.jsx` | Modal de 5 estrellas + textarea (máx. 500 chars) + pantalla de agradecimiento (autocierra a los 1.8 s) |
| `src/components/FeedbackPrompt/FeedbackPrompt.module.css` | Estilos (CSS Modules, tokens `light-purple-*`) |
| `src/modules/Header/Header.jsx` | Monta el hook + botón + modal. Ver líneas ~506 (hook), 585-586 (botón), 973 (modal) |
| `src/pages/Admin/FeedbackAdminPage.jsx` + `.module.css` | Sección "Feedback" del panel de Admin |
| `src/pages/Admin/feedbackAdminApi.js` | `fetchSubmittedFeedback()` — única consulta del panel |
| `supabase-event-feedback-migration.sql` | DDL de `event_feedback` + policies + el `GRANT` de `invitation_versions` |

Keys de i18n bajo el namespace `feedback_prompt.*` en `src/locales/{es,en}.json`.

## Cuándo aparece el botón

La condición se evalúa **en el frontend** (`useFeedbackTrigger`), no en la DB:

1. Han pasado **≥15 días** desde `invitations.created_at` (el `created_at` lo trae el propio
   `Header.jsx` en su fetch de la invitación), **y**
2. existe **≥1 fila en `invitation_versions`** para ese `invitation_id` — es decir, el
   organizador ya publicó cambios al menos una vez. Ver [historial-versiones.md](./historial-versiones.md).

Si ya hay una review con `status = 'submitted'`, no se vuelve a mostrar nunca.

### El hook falla cerrado

Si cualquiera de las dos consultas devuelve error, **no** se muestra el botón. Se prefiere
no pedir la review a arriesgar un falso positivo (ej. que la tabla no exista todavía).

### Cache en memoria

`sessionChecks` es un `Map` module-level por `invitation_id`. El header se remonta al navegar
entre `/dashboard/build`, `/dashboard/guests`, `/dashboard/side`, etc.; sin el cache se
repetirían las dos consultas en cada navegación. Vive y muere con la pestaña.

## Base de datos

Tabla `event_feedback` (DDL en `supabase-event-feedback-migration.sql`, corrido a mano en el
SQL Editor de Supabase):

| Columna | Notas |
|---|---|
| `invitation_id` | FK → `invitations`, ON DELETE CASCADE, **UNIQUE** (una review por invitación) |
| `status` | `pending` \| `skipped` \| `submitted` |
| `rating` | smallint 1–5 |
| `comment` | text, opcional |
| `shown_at` / `skipped_at` / `submitted_at` | timestamps del ciclo |
| `skip_count` | informativo, **no** gatea el reintento |

RLS permisiva (select/insert/update para `anon`), consistente con el patrón ya aceptado en
`GuestsPage.jsx` / `SideEvents.jsx`: el login de iattend-vite es JWT propio + Mongo, no
Supabase Auth, así que no hay `auth.uid()` disponible para escribir policies reales.

## Gotcha: `permission denied for table invitation_versions` (42501)

`invitation_versions` **nunca** se había consultado desde el frontend con la anon key — solo
desde el backend con la service-role key. Al agregar la lectura en `useFeedbackTrigger`, la
consulta fallaba con 42501 y (por el fail-closed) el botón nunca aparecía.

`permission denied for table` es un error de **GRANT** a nivel tabla, no de RLS. Postgres lo
revisa **antes** de evaluar cualquier policy. Por eso el primer intento —habilitar RLS +
agregar una policy de SELECT— no resolvió nada. Lo que hizo falta:

```sql
grant select on public.invitation_versions to anon, authenticated;
```

Está como addendum al final de la migración. Si en el futuro se lee otra tabla nueva desde el
frontend, revisar el GRANT antes que la policy.

## Panel de Admin

Sección "Feedback" en el sidebar (`AdminLayout.jsx`, entre "Ventas" y "Herramientas"). Lee
solo las reviews con `status = 'submitted'`, ordenadas por `submitted_at` desc, con:

- KPIs: total de reviews, promedio de estrellas, % con comentario
- Gráfica de barras de distribución 1–5 (`react-chartjs-2`)
- Filtros: por rating (multi-select) y "solo con comentario"

## Hueco conocido: el flujo de "Ahora no" no está implementado

El esquema, la cadencia de reintento (3 días tras el último skip, sin límite de intentos) y
la rama `status === 'skipped'` de `shouldShowForRow` están escritos, pero **nada en el
frontend escribe `skipped`, `pending` ni `skip_count`**. El modal no tiene botón "Ahora no";
cerrarlo (clic en la máscara o ESC) simplemente lo cierra sin registrar nada.

Consecuencia práctica hoy: la fila en `event_feedback` solo se crea al enviar, así que
`shouldShowForRow` siempre recibe `null` y devuelve `true`. El botón sigue apareciendo en
cada visita hasta que el organizador manda la review. Las ramas `pending`/`skipped` son
código muerto por ahora — están listas para cuando se agregue el botón de descarte.
