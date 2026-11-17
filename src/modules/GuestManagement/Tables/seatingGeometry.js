// El tablero (.org-map-work-container) es un cuadrado de 3500px y TODO él es
// usable. Antes el alto se limitaba a 1800, así que media pantalla quedaba
// vetada aunque estuviera vacía.
export const CANVAS_WIDTH = 3500
export const CANVAS_HEIGHT = 3500

// Las mesas y los elementos se dibujan con scale(0.7) sobre su centro, así que
// su caja visual es más chica que su caja de layout. La colisión usa la visual:
// si no, las mesas "chocarían" con aire.
export const RENDER_SCALE = 0.7

// Margen que usan el generador de acomodos y la reubicación por cambio de
// forma. El arrastre manual NO colisiona: el usuario manda.
export const SAFE_ZONE = 24

export const getTableFootprint = (shape) => {
    // Debe seguir a .dance-container en dynamic-table.css.
    if (shape === 'dance') return { width: 800, height: 600 }
    if (shape === 'rectangle') return { width: 400, height: 200 }
    return { width: 200, height: 200 }
}

// Giro total de una mesa en grados: `vertical` (90° de la rectangular) más
// `rotation` (giro libre, tables.rotation).
export const anguloDe = ({ vertical = false, rotation = 0 } = {}) => (vertical ? 90 : 0) + (Number(rotation) || 0)

// Caja (sin escalar) que ocupa un footprint de width × height girado `angulo`
// grados alrededor de su centro. Una mesa redonda girada ocupa lo mismo.
export const cajaGirada = (width, height, angulo = 0, { redonda = false } = {}) => {
    if (redonda) return { width, height }
    const r = (angulo * Math.PI) / 180
    const c = Math.abs(Math.cos(r))
    const s = Math.abs(Math.sin(r))
    return { width: width * c + height * s, height: width * s + height * c }
}

// `x`/`y` guardados son la esquina del footprint SIN rotar (contrato histórico
// con la BD). Para una mesa girada (vertical o con `rotation`), la caja que de
// verdad ocupa está girada alrededor del centro, así que los límites del
// canvas se corren.
export const clampToCanvas = (x, y, shape, vertical = false, rotation = 0) => {
    const { width, height } = getTableFootprint(shape)
    const { width: bw, height: bh } = cajaGirada(width, height, anguloDe({ vertical, rotation }), { redonda: shape === 'round' })
    const ox = (width - bw) / 2
    const oy = (height - bh) / 2
    return {
        x: Math.min(Math.max(x, -ox), CANVAS_WIDTH - bw - ox),
        y: Math.min(Math.max(y, -oy), CANVAS_HEIGHT - bh - oy),
    }
}

/**
 * Caja que la mesa ocupa en pantalla: el footprint reducido por RENDER_SCALE
 * alrededor de su centro. Una mesa girada (vertical = 90°, más `rotation`)
 * ocupa la caja de su footprint girado.
 */
export const getVisualRect = ({ x, y, width, height, vertical = false, rotation = 0, shape = null }) => {
    const caja = cajaGirada(width, height, anguloDe({ vertical, rotation }), { redonda: shape === 'round' })
    const w = caja.width * RENDER_SCALE
    const h = caja.height * RENDER_SCALE
    const cx = x + width / 2
    const cy = y + height / 2
    return { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2 }
}

export const rectOfTable = (table, overrides = {}) => {
    const { width, height } = getTableFootprint(overrides.shape ?? table.shape)
    return getVisualRect({
        x: overrides.x ?? table.x,
        y: overrides.y ?? table.y,
        width,
        height,
        vertical: overrides.vertical ?? table.vertical,
        rotation: overrides.rotation ?? table.rotation,
        shape: overrides.shape ?? table.shape,
    })
}

export const rectOfElement = (element) => getVisualRect({
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
})

const overlaps = (a, b, margin) =>
    a.left < b.right + margin &&
    a.right > b.left - margin &&
    a.top < b.bottom + margin &&
    a.bottom > b.top - margin

/**
 * ¿Cabe `rect` sin invadir la zona segura de ningún obstáculo?
 */
export const fitsWithoutOverlap = (rect, obstacles, margin = SAFE_ZONE) =>
    !obstacles.some(o => overlaps(rect, o, margin))

/**
 * Primer hueco de la cuadrícula donde cabe la mesa con su forma nueva (§4.6).
 *
 * Se usa cuando cambiar de forma agranda el footprint e invade a la vecina:
 * la mesa se reubica conservando su `id` — y por tanto sus invitados —, solo
 * cambian x/y. Devuelve null si no cabe en ningún lado, que es la rama que hay
 * que avisar en vez de dejar el layout roto.
 */
export const findFreeSpot = (table, obstacles, margin = SAFE_ZONE) => {
    const { width, height } = getTableFootprint(table.shape)
    const STEP = 40

    for (let y = 0; y <= CANVAS_HEIGHT - height; y += STEP) {
        for (let x = 0; x <= CANVAS_WIDTH - width; x += STEP) {
            const rect = getVisualRect({ x, y, width, height, vertical: table.vertical, rotation: table.rotation, shape: table.shape })
            if (fitsWithoutOverlap(rect, obstacles, margin)) return { x, y }
        }
    }
    return null
}

/**
 * Separa las mesas que quedaron encimadas, empujándolas poco a poco.
 *
 * Relajación iterativa: en cada pasada, todo par que se invade se aparta a lo
 * largo del eje donde menos hay que moverse. No busca el óptimo, busca que
 * nadie quede encima de nadie sin reorganizar el salón que el usuario ya armó.
 *
 * Las mesas bloqueadas y los elementos del salón no se mueven: son obstáculos.
 */
export const relaxOverlaps = (items, fixedRects = [], { margin = SAFE_ZONE, passes = 160 } = {}) => {
    const movable = items.map(item => ({
        item,
        x: item.x,
        y: item.y,
        size: getTableFootprint(item.shape),
    }))

    const rectOf = (m) => getVisualRect({
        x: m.x, y: m.y, width: m.size.width, height: m.size.height, vertical: m.vertical ?? m.item.vertical, rotation: m.item.rotation, shape: m.item.shape,
    })

    for (let pass = 0; pass < passes; pass++) {
        let moved = false

        for (let i = 0; i < movable.length; i++) {
            const a = movable[i]
            const ra = rectOf(a)

            const obstacles = [
                ...fixedRects,
                ...movable.filter((_, j) => j !== i).map(rectOf),
            ]

            for (const rb of obstacles) {
                if (!overlaps(ra, rb, margin)) continue

                // Cuánto hay que separar en cada eje para dejar de invadir.
                const pushX = ra.left + ra.right < rb.left + rb.right
                    ? (rb.left - margin) - ra.right
                    : (rb.right + margin) - ra.left
                const pushY = ra.top + ra.bottom < rb.top + rb.bottom
                    ? (rb.top - margin) - ra.bottom
                    : (rb.bottom + margin) - ra.top

                // El eje más barato: mover lo mínimo posible.
                if (Math.abs(pushX) <= Math.abs(pushY)) a.x += pushX
                else a.y += pushY

                const clamped = clampToCanvas(a.x, a.y, a.item.shape, a.item.vertical, a.item.rotation)
                a.x = clamped.x
                a.y = clamped.y
                moved = true
                break
            }
        }

        if (!moved) break
    }

    return movable
        .filter(m => Math.abs(m.x - m.item.x) > 0.5 || Math.abs(m.y - m.item.y) > 0.5)
        .map(m => ({ id: m.item.id, x: Math.round(m.x), y: Math.round(m.y) }))
}
