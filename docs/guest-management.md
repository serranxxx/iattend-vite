# Gestión de invitados — tabla y panel de resumen

Documenta la reescritura de `GuestsPage.jsx` (commits `4a8a167` 07-ago y `caab08e` 07-ago) y
la incorporación del panel `GuestsOverview` (commit `27b7c1b`, 22-ago) como nuevo tab por
defecto de `/dashboard/guests`.

> **Parcialmente superado.** La tabla de columnas que se describe aquí y la primera versión de
> `GuestsOverview` fueron reemplazadas por el rediseño de la rama `site-guests-design`.
> Ver [`rediseno-gestion-invitados.md`](./rediseno-gestion-invitados.md). Lo que sigue vigente
> de este documento es la máquina de estados del invitado y la relación entre `state` y el
> `status` del dispatch.

## Por qué

`GuestsPage.jsx` es el componente más grande y con más historia del repo. Durante el mes se
reescribió la tabla de invitados dos veces seguidas (`4a8a167` → `caab08e`) para resolver
problemas de rendimiento/estructura con la tabla anterior, y se agregó `GuestsOverview` como
un tab de "aterrizaje" — cuando el organizador entra a Invitados, ve primero un resumen
accionable en vez de la tabla completa.

## Máquina de estados de un invitado

Un invitado (`guests.state`) vive en uno de estos estados:

| Estado | Significado |
|---|---|
| `creado` | Capturado pero sin invitación enviada |
| `esperando` | Invitación enviada, sin RSVP todavía |
| `confirmado` / `asistente` | Confirmó asistencia (dos valores legados, se tratan igual en casi todo el código) |
| `rechazado` | Declinó |

`GuestsPage.jsx` agrupa `rowData` por familia y por estado en 4 datasets derivados
(`createdData`, `waitingData`, `confirmedData`, `callededData` — este último es
`rechazado`, el nombre quedó así de una iteración anterior) que alimentan los tabs
`creado` / `esperando` / `confirmado` / `rechazado` de `Tabs` (`activeKey`, línea ~101/3669).

Cada dispatch de WhatsApp (tabla `invitation_message_dispatches`, vía `dispatchMap`) tiene su
propio `status` (`processing` / `sent` / `delivered` / `read` / `failed`), independiente del
`state` del invitado — un invitado puede estar `esperando` con dispatch `read` (le llegó y
la vio, pero no ha contestado el RSVP).

## `GuestsOverview` — panel de resumen (tab "Seguimiento")

`src/modules/GuestManagement/GuestsOverview/GuestsOverview.jsx` (~530 líneas + CSS Module).
Implementa el mockup "Gestión de invitados" de Claude Design. Recibe `rowData`, `dispatchMap`,
`tickets` y `rsvpDeadline` desde `GuestsPage` — no hace fetch propio.

### Escalera de estados (`phase`)

El panel cambia de forma según cuánto ha avanzado el organizador:

1. **`empty`** — sin invitados capturados: CTA para agregar
2. **`ready`** — hay invitados capturados pero ninguno invitado: CTA para crear el envío
3. **`sent`** — ya se invitó pero nadie ha confirmado ni rechazado todavía
4. **`active`** — hay actividad real: se muestra el dashboard completo (dos columnas)

### Columna izquierda — "Qué hacer hoy"

Tarjetas de casos accionables, en este orden de prioridad:

1. **Fallidos** (`dispatchMap[id].status === 'failed'`) — tono peligro, CTA "Reintentar"
2. **Leídos sin responder** (`state === 'esperando'` + dispatch `read`) — tono advertencia, CTA "Recordar"
3. **Teléfono inválido** (`state === 'creado'` sin lada `+52`) — caso agregado fuera del mockup original porque **solo el organizador puede resolverlo** (número sin lada nunca podrá recibir WhatsApp)

Debajo, una gráfica de barras de confirmaciones por día (últimos 12 días, no acumulado) —
deja ver de un vistazo si el ritmo de confirmaciones subió o se apagó.

### Columna derecha

- **Tarjeta de Lia**: resume cuántos de los casos de "Qué hacer hoy" son resolubles por el
  asistente (fallidos + leídos-sin-responder) y da un CTA hacia Lia. Controlada por la
  constante `SHOW_LIA` en el archivo — se puede apagar sin tocar el resto del componente.
- **Contador de confirmados** contra el aforo (`tickets`, o el total de invitados si no hay
  límite de boletos configurado).
- **Embudo "Dónde se queda la gente"**: creados → invitados → entregados → leídos →
  confirmados, con una nota contextual en cada escalón (ej. cuántos fallaron en "entregados").

## Barra de `rsvp_deadline`

Agregada como parte de la Fase 1 de recordatorios de WhatsApp (ver
`RECORDATORIOS_FASE1_CIERRE.md`). Es un UPDATE directo a una columna top-level de
`invitations` — **no** pasa por `publish_invitation`, para no generar una fila en
`invitation_versions` por un cambio que no es de contenido. Ver
[historial-versiones.md](./historial-versiones.md).

## Estado pendiente

Al momento de este corte hay cambios sin commitear en `GuestsOverview.jsx` — verificar
`git status` antes de asumir que lo descrito aquí es exactamente lo que está en `main`.
