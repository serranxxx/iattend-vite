# Fix del mapa de mesas — mesas fuera del canvas

Documenta el bug de producción corregido el 26-jul-2026 (commit `febbe9c`) en
`src/modules/GuestManagement/Tables/` (`TablesPage.jsx` + `DynamicTable.jsx`).

## El bug

El canvas del mapa de mesas (`.org-map-work-container`, 3500×1800px, `overflow: hidden`) no
tenía límites de posición. Dos caminos llevaban a una mesa fuera del canvas:

1. **Arrastrar una mesa** — el delta de movimiento se divide entre `zoomLevel`, así que con
   más zoom-out un mismo gesto mueve la mesa mucho más lejos; sin clamp, un drag agresivo
   podía sacarla del área visible.
2. **Agregar mesa** (botón "+") — siempre colocaba la siguiente mesa en línea recta
   (`previous.x + 140`), sin envolver a una fila nueva al llegar al borde derecho.

Una vez que una mesa se salía, quedaba renderizada en un punto invisible (clippeado por
`overflow: hidden`) — pero los contadores de lugares disponibles/ocupados seguían sumando
`table.size` sobre **todas** las filas de la DB, sin importar su posición. Resultado
observado por un cliente real: el contador de lugares seguía subiendo, pero la mesa nueva
"no salía en el mapita" — y tampoco podía agregar más de cierto número de mesas redondas.

Una vez que la primera mesa escapaba (probablemente por un drag agresivo con zoom-out), cada
"agregar mesa" siguiente se colocaba en línea recta a partir de esa posición corrupta,
empujándose cada vez más lejos del canvas — el problema se auto-agravaba con cada mesa nueva.

## El fix

Helpers duplicados localmente en ambos archivos (`DynamicTable.jsx` y `TablesPage.jsx` —
no se extrajo un helper compartido):

```js
const CANVAS_WIDTH = 3500
const CANVAS_HEIGHT = 1800

const getTableFootprint = (shape) => {
  if (shape === 'dance') return { width: 800, height: 600 }
  if (shape === 'rectangle') return { width: 400, height: 200 }
  return { width: 200, height: 200 } // round / square
}

const clampToCanvas = (x, y, shape) => {
  const { width, height } = getTableFootprint(shape)
  return {
    x: Math.min(Math.max(x, 0), CANVAS_WIDTH - width),
    y: Math.min(Math.max(y, 0), CANVAS_HEIGHT - height),
  }
}
```

- **Drag** (`DynamicTable.jsx`): cada movimiento pasa por `clampToCanvas` antes de aplicarse
  a `mapPosition` — ya no es posible arrastrar una mesa fuera de los límites.
- **Auto-colocación** (`TablesPage.jsx`, `getNextPosition`): en vez de sumar `+140` en línea
  recta indefinidamente, cuando la siguiente `x` se saldría del canvas (`nextX + width >
  CANVAS_WIDTH`) envuelve a una fila nueva (`x = ROW_START_X`, `y += ROW_STEP`). El resultado
  siempre pasa también por `clampToCanvas` como red de seguridad final.

## Si vuelve a pasar

Si llega un reporte similar para otra invitación ("no me deja agregar mesas pero el contador
sube"), el diagnóstico es: buscar filas de `tables` con `x`/`y` fuera de `[0, CANVAS_WIDTH]` /
`[0, CANVAS_HEIGHT]` para ese `invitation_id`. Antes de borrar una mesa corrupta, revisar si
tiene invitados asignados — si los tiene, reposicionarla dentro del canvas en vez de
eliminarla; si no tiene invitados (como en el caso original, mesas 13-37 todas vacías), se
puede eliminar directo. La consulta/limpieza se hace con un script desechable de Node usando
`iattend--backend/config/supabase.js` — **no** vía el MCP de Supabase de este entorno de
desarrollo, que apunta a un proyecto distinto al real.
