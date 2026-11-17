// Dónde va cada silla alrededor de una mesa (handoff "Panel de mesa" 3a,
// `seatPos`). La usan la vista previa del panel (TablePanel) y el mapa
// (DynamicTable), así la silla N es la misma en los dos.
//
// Devuelve [dx, dy] desde el centro de la mesa, en el orden de los asientos:
// arriba (izquierda → derecha), derecha (arriba → abajo), abajo (derecha →
// izquierda), izquierda (abajo → arriba). Redonda: uniforme, empezando arriba.
// Rectangular: con 6 sillas o más, una en cada cabecera; el resto en los
// lados largos (arriba lleva el redondeo hacia arriba). Cuadrada: floor(n/4)
// por lado y el sobrante arriba → derecha → abajo → izquierda.
// `w` / `h`: medidas de la mesa; `gap`: del borde de la mesa al centro de la silla.
export const posicionesSillas = (shape, n, { w, h, gap }) => {
    const out = []
    if (n <= 0) return out
    if (shape === 'round') {
        const r = w / 2 + gap
        for (let i = 0; i < n; i++) {
            const a = ((-90 + (i * 360) / n) * Math.PI) / 180
            out.push([r * Math.cos(a), r * Math.sin(a)])
        }
        return out
    }
    let lados
    if (shape === 'rectangle') {
        const e = n >= 6 ? 1 : 0
        const resto = n - 2 * e
        const arriba = Math.ceil(resto / 2)
        lados = [arriba, e, resto - arriba, e]
    } else {
        const b = Math.floor(n / 4)
        const m = n % 4
        lados = [0, 1, 2, 3].map((i) => b + (i < m ? 1 : 0))
    }
    const hw = w / 2
    const hh = h / 2
    for (let j = 0; j < lados[0]; j++) out.push([-hw + (w * (j + 1)) / (lados[0] + 1), -hh - gap])
    for (let j = 0; j < lados[1]; j++) out.push([hw + gap, -hh + (h * (j + 1)) / (lados[1] + 1)])
    for (let j = 0; j < lados[2]; j++) out.push([hw - (w * (j + 1)) / (lados[2] + 1), hh + gap])
    for (let j = 0; j < lados[3]; j++) out.push([-hw - gap, hh - (h * (j + 1)) / (lados[3] + 1)])
    return out
}

// Mesa de la vista previa del panel: medidas y redondeo (handoff 3a, DIMS).
export const MESA_PANEL = {
    round: { w: 100, h: 100, radio: '50%' },
    square: { w: 92, h: 92, radio: '16px' },
    rectangle: { w: 160, h: 66, radio: '14px' },
}
export const GAP_PANEL = 21

// En el mapa (contenedor de 200 × 200, o 400 × 200 la rectangular): la mesa
// de .round-table / .rectangle-table y las sillas de 32 px a su alrededor. La
// cuadrada reparte sus sillas en el recuadro de 152 px (lo que antes).
export const MESA_MAPA = {
    round: { w: 72, h: 72, gap: 38 },
    square: { w: 152, h: 152, gap: 0 },
    rectangle: { w: 264, h: 96, gap: 24 },
}

// Iniciales: primera letra del nombre y del primer apellido ("Ana López" →
// "AL"); con un solo nombre, sus dos primeras letras.
export const inicialesDe = (nombre = '') => {
    const partes = String(nombre).trim().split(/\s+/).filter(Boolean)
    if (!partes.length) return '?'
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
    return (partes[0][0] + partes[1][0]).toUpperCase()
}

// Ángulo para mostrar (0…345) y para guardar (−180…180).
export const anguloVisible = (grados) => ((Math.round(grados) % 360) + 360) % 360
export const anguloGuardado = (grados) => {
    const v = anguloVisible(grados)
    return v > 180 ? v - 360 : v
}
