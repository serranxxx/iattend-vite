# Módulo de prospectos / tablero de ventas

Documenta `src/modules/Prospectos/` (commit `b283898`, 3-ago), un board tipo Kanban nuevo
para dar seguimiento a leads (prospectos de Instagram, por ahora) desde captura hasta cierre.

## Por qué

Es distinto de `modules/Sales/` (`VendorSessionContext`, ventas ya cerradas/facturadas — ver
`docs/ventas.md`). Prospectos es la etapa **anterior**: leads que todavía no compraron,
necesitan seguimiento y (opcionalmente) asignación a un vendedor.

## Ruta y acceso

`/tablero` → `ProspectosPage`, protegida por `RequireSalesOrAdmin`
(`src/router/RequireSalesOrAdmin.jsx`) — guard nuevo, distinto de `AdminHOC`: permite roles
`Administration` **y** `sales` (lee `session.user.role` de `localStorage`, mismo patrón de
sesión que `AdminHOC`, pero con una lista de roles permitidos en vez de uno solo).

## Dos modos de vista

`ProspectosPage` calcula `modo` a partir del rol de la sesión:

- **`admin`** (`role === 'Administration'`) — ve **todos** los prospectos
  (`fetchProspectos`), todas las columnas de `ESTADOS` incluida `sin_asignar`, y puede
  asignar vendedor.
- **`vendedor`** (cualquier otro rol permitido, en la práctica `sales`) — ve solo
  `fetchMisProspectos` (los que le fueron asignados), y la columna `sin_asignar` no se
  muestra (`ESTADOS.filter(e => e.key !== 'sin_asignar')`).

## Estados (`estados.js`)

```
sin_asignar → asignado → en_conversacion → finalizado
                                        ↘ volver_a_contactar
```

Cada estado tiene `key`, `label` y `color` — son las columnas del board.

## Nivel de interés (`nivelInteres.js`)

Escala 1–5 independiente del estado (`Sin interés` → `Muy interesado`), capturable desde el
drawer de detalle. Es dato informativo para priorizar, no gatea transiciones de estado.

## El board (`ProspectosBoard.jsx`) — único uso real de `@dnd-kit`

Implementado con `@dnd-kit/core` + `@dnd-kit/sortable` — **el único lugar del repo, junto con
`BuildDestinations.jsx`, que usa esta librería** (el canvas de mesas de
`GuestManagement/Tables/` sigue usando drag manual con listeners `mousemove`/`touchmove`; no
confundir los dos patrones al tocar drag & drop en este repo).

- `DndContext` con `PointerSensor` (`activationConstraint: { distance: 5 }` — evita que un
  click simple se interprete como drag).
- Cada columna es un `useDroppable` (`col-{estado.key}`); cada card es `useSortable`.
- `handleDragEnd` decide el `estado` destino a partir de dónde se soltó (columna vacía o
  encima de otra card), y aplica el cambio **de forma optimista** en el estado local
  (`aplicarEstadoLocal`) antes de confirmar con el backend — si el PATCH falla, revierte.

### Dos transiciones con interrupción (modal antes de aplicar)

- **Mover fuera de `sin_asignar`** → abre `AsignarVendedorModal` (solo `modo === 'admin'`,
  porque solo el admin asigna vendedor). El drop no se aplica hasta confirmar.
- **Mover a `finalizado`** → abre `ProspectoDetailDrawer` en modo `pendingFinalize` (probablemente
  para capturar motivo/resultado del cierre antes de finalizar).

Si el drop cae directo en `sin_asignar` → `finalizado` en un solo movimiento, primero se pide
asignar vendedor, y si esa asignación confirma, **entonces** se dispara el flujo de
finalización — están encadenados, no son mutuamente excluyentes.

## Backend

Todas las llamadas van a `${VITE_API_URL}/api/prospectos/...` (`prospectosApi.js`), con
`Authorization: Bearer <supabase access_token>` — a diferencia de la mayoría de este repo, que
usa la sesión JWT propia + Mongo, este módulo sí depende de una sesión activa de **Supabase
Auth** para el token (revisar antes de asumir que el patrón de auth es igual en todo el repo).

| Función | Endpoint |
|---|---|
| `fetchProspectos` | `GET /api/prospectos` (admin) |
| `fetchMisProspectos` | `GET /api/prospectos/mis-prospectos` (vendedor) |
| `asignarVendedor` | `PATCH /api/prospectos/:id/asignar` |
| `actualizarEstadoProspecto` | `PATCH /api/prospectos/:id/estado` |
| `actualizarProspecto` | `PATCH /api/prospectos/:id` (patch genérico: notas, favorito, email, teléfono, post_contexto, nivel_interes) |
| `solicitarActivacionProspecto` | `POST /api/prospectos/:id/solicitar-activacion` |

La lógica de negocio (de dónde salen los leads de Instagram, reglas de asignación
automática si las hay) vive en `iattend--backend`, no en este repo.
