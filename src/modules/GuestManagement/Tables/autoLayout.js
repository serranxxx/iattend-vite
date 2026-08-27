import {
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    SAFE_ZONE,
    getTableFootprint,
} from './seatingGeometry'

/**
 * Los tres acomodos (§4.4). En todos, la pista de baile queda en el CENTRO
 * del tablero; lo que cambia es cómo se agrupan las mesas respecto a ella.
 *
 * El generador calcula POSICIONES, nunca formas: cada mesa conserva su `id`
 * — solo cambian x/y —, así que ningún invitado pierde su lugar.
 */
export const LAYOUTS = [
    {
        key: 'dance-center',
        name: 'Mesas alrededor de la pista',
        description: 'La pista queda en medio y las mesas la rodean por los cuatro lados, en anillos.',
        traits: ['Todos cerca de la pista', 'Anillos concéntricos', 'Circulación por fuera'],
    },
    {
        key: 'stage-front',
        name: 'Mesas en 3 lados',
        description: 'El frente queda libre para el escenario; las mesas rodean la pista por los otros tres lados.',
        traits: ['Frente despejado', 'Pensada para show en vivo', 'Nadie de espaldas'],
    },
    {
        key: 'dance-side',
        name: 'Mesas y pista en bloques',
        description: 'La pista en su bloque y las mesas agrupadas aparte, en un cuadro compacto.',
        traits: ['Separa cena y fiesta', 'Bloque de mesas en cuadro', 'Más superficie de baile'],
    },
]

const DANCE_SIZE = { width: 800, height: 600 }
const GAP = SAFE_ZONE + 36
const ROW = 200

const sizeOf = (table) => getTableFootprint(table.shape)

// Caja que la mesa ocupa (una rectangular vertical gira alrededor del centro)
// y el corrimiento entre esa caja y las coordenadas x/y guardadas, que son la
// esquina del footprint sin rotar.
const boundOf = (table) => {
    const f = sizeOf(table)
    const bw = table.vertical ? f.height : f.width
    const bh = table.vertical ? f.width : f.height
    return { bw, bh, ox: (f.width - bw) / 2, oy: (f.height - bh) / 2 }
}

// Traducir una posición de caja a la posición guardada.
const storedFromBound = (table, bx, by) => {
    const { ox, oy } = boundOf(table)
    return { id: table.id, x: Math.round(bx - ox), y: Math.round(by - oy) }
}

/**
 * Anillos alrededor de la pista centrada.
 *
 * Cada anillo tiene una banda arriba y abajo (que se extienden para cubrir las
 * esquinas) y columnas a los costados de la altura de la pista. `sides` decide
 * qué lados participan: los cuatro para el acomodo circular, tres cuando el
 * frente se reserva al escenario.
 */
const placeRing = (tables, danceBox, sides) => {
    const placed = []
    const remaining = [...tables]

    // El anillo asume casillas de ROW px: una banda solo admite cajas de esa
    // ALTURA (redondas, cuadradas, rectangulares horizontales) y una columna
    // solo cajas de ese ANCHO (redondas, cuadradas, rectangulares verticales).
    // Mezclarlas era la fuente de solapes entre anillos consecutivos.
    const takeFor = (kind) => {
        const idx = remaining.findIndex(t => {
            const { bw, bh } = boundOf(t)
            return kind === 'band' ? bh <= ROW : bw <= ROW
        })
        return idx === -1 ? null : remaining.splice(idx, 1)[0]
    }

    for (let ring = 0; remaining.length && ring < 12; ring++) {
        const off = GAP + ring * (ROW + GAP)
        const ext = off + ROW
        const topY = danceBox.top - off - ROW
        const botY = danceBox.bottom + off
        const spanLeft = danceBox.left - ext
        const spanRight = danceBox.right + ext

        for (const side of sides) {
            if (!remaining.length) break

            if (side === 'top' || side === 'bottom') {
                let cx = spanLeft
                while (remaining.length) {
                    const peekIdx = remaining.findIndex(t => boundOf(t).bh <= ROW)
                    if (peekIdx === -1) break
                    const { bw } = boundOf(remaining[peekIdx])
                    if (cx + bw > spanRight) break
                    const t = takeFor('band')
                    placed.push(storedFromBound(t, cx, side === 'top' ? topY : botY))
                    cx += bw + GAP
                }
            } else {
                let cy = danceBox.top
                while (remaining.length) {
                    const peekIdx = remaining.findIndex(t => boundOf(t).bw <= ROW)
                    if (peekIdx === -1) break
                    const { bh } = boundOf(remaining[peekIdx])
                    if (cy + bh > danceBox.bottom) break
                    const t = takeFor('column')
                    const bx = side === 'left' ? danceBox.left - off - ROW : danceBox.right + off
                    placed.push(storedFromBound(t, bx, cy))
                    cy += bh + GAP
                }
            }
        }
    }

    return { placed, leftover: remaining }
}

/**
 * Bloque cuadrado de mesas, aparte de la pista.
 *
 * Se empaca en filas hasta un ancho objetivo ~cuadrado y el bloque completo se
 * centra verticalmente respecto a la pista, a su derecha.
 */
const placeBlock = (tables, danceBox) => {
    // Ancho objetivo para que el bloque salga aproximadamente cuadrado,
    // limitado al espacio que queda entre la pista y el borde del tablero.
    const PAD = 80
    const bx0 = danceBox.right + GAP * 4
    const maxWidth = CANVAS_WIDTH - PAD - bx0
    const totalWidth = tables.reduce((sum, t) => sum + boundOf(t).bw + GAP, 0)
    const targetWidth = Math.min(
        Math.max(Math.sqrt(totalWidth * (ROW + GAP)), 3 * (ROW + GAP)),
        maxWidth
    )

    // Primero la lista de filas, para conocer el alto del bloque y poder
    // centrarlo; después se materializan las posiciones.
    const rows = []
    let current = { items: [], width: 0, height: 0 }
    for (const t of tables) {
        const { bw, bh } = boundOf(t)
        if (current.width > 0 && current.width + bw > targetWidth) {
            rows.push(current)
            current = { items: [], width: 0, height: 0 }
        }
        current.items.push(t)
        current.width += bw + GAP
        current.height = Math.max(current.height, bh)
    }
    if (current.items.length) rows.push(current)

    const blockHeight = rows.reduce((sum, r) => sum + r.height + GAP, -GAP)
    const danceCenterY = (danceBox.top + danceBox.bottom) / 2

    let by = Math.max(PAD, Math.min(
        danceCenterY - blockHeight / 2,
        CANVAS_HEIGHT - PAD - blockHeight
    ))

    const placed = []
    for (const row of rows) {
        let cx = bx0
        for (const t of row.items) {
            const { bw } = boundOf(t)
            placed.push(storedFromBound(t, cx, by))
            cx += bw + GAP
        }
        by += row.height + GAP
    }

    return { placed, leftover: [] }
}

/**
 * Calcula las posiciones de un acomodo. Devuelve `{ tables, dance, unplaced }`:
 * actualizaciones por id (nunca inserciones ni borrados).
 */
export const buildLayout = (layoutKey, tables, danceTable) => {
    // Las rectangulares primero: en las bandas horizontales ocupan el doble y
    // conviene resolverlas antes de rellenar con redondas.
    const ordered = [...tables].sort((a, b) => {
        const wa = boundOf(a).bw, wb = boundOf(b).bw
        if (wa !== wb) return wb - wa
        return String(a.number ?? '').localeCompare(String(b.number ?? ''), undefined, { numeric: true })
    })

    // La pista SIEMPRE al centro del tablero.
    const dance = {
        x: Math.round(CANVAS_WIDTH / 2 - DANCE_SIZE.width / 2),
        y: Math.round(CANVAS_HEIGHT / 2 - DANCE_SIZE.height / 2),
    }
    const danceBox = {
        left: dance.x,
        top: dance.y,
        right: dance.x + DANCE_SIZE.width,
        bottom: dance.y + DANCE_SIZE.height,
    }

    let result
    if (layoutKey === 'dance-side') {
        result = placeBlock(ordered, danceBox)
    } else if (layoutKey === 'stage-front') {
        // El frente (arriba) queda libre para el escenario.
        result = placeRing(ordered, danceBox, ['left', 'right', 'bottom'])
    } else {
        result = placeRing(ordered, danceBox, ['top', 'bottom', 'left', 'right'])
    }

    return {
        tables: result.placed,
        dance: danceTable ? dance : null,
        unplaced: result.leftover.length,
    }
}

/** Preselección según la mezcla de formas. */
export const suggestLayout = (tables) => {
    const rect = tables.filter(t => t.shape === 'rectangle').length
    if (rect > tables.length / 2) return 'dance-side'
    return 'dance-center'
}
