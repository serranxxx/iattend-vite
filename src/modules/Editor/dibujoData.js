// Pinceles, suavizado y simplificación del dibujo a mano de un Pop (ver
// Dibujo.jsx). Gemela en iattend-events: components/SideEvent/Dibujo.tsx.

// Pinceles: ancho = grosor × k, punta y estilo.
export const PINCELES = [
    { id: 'pluma', k: 1, cap: 'round' },
    { id: 'marcador', k: 1.8, cap: 'square' },
    { id: 'resaltador', k: 3, cap: 'butt', maxA: 0.45 },
    { id: 'lapiz', k: 0.55, cap: 'round', grano: true },
    { id: 'neon', k: 1.3, cap: 'round', brillo: true },
    { id: 'borrador', k: 2, cap: 'round', borra: true },
]
export const PINCEL = Object.fromEntries(PINCELES.map((p) => [p.id, p]))

// Un color hacia el blanco (`t` 0–1): el tubo del neón.
export const aclarar = (hex, t) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? ''))
    if (!m) return '#FFFFFF'
    const n = parseInt(m[1], 16)
    const c = (v) => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')
    return `#${c(n >> 16)}${c((n >> 8) & 255)}${c(n & 255)}`
}

// Curvas cuadráticas por los puntos medios (el suavizado del pincel).
export const pathDe = (pts) => {
    if (!pts?.length) return ''
    const f = (n) => Math.round(n * 10) / 10
    if (pts.length === 1) return `M${f(pts[0][0])} ${f(pts[0][1])}l0.1 0`
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
    for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2
        const my = (pts[i][1] + pts[i + 1][1]) / 2
        d += `Q${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)}`
    }
    const l = pts[pts.length - 1]
    return `${d}L${f(l[0])} ${f(l[1])}`
}

// Ramer-Douglas-Peucker: menos puntos, misma forma (tolerancia en px).
export const simplificar = (pts, tol = 0.6) => {
    if (pts.length < 3) return pts
    const dist = (p, a, b) => {
        const dx = b[0] - a[0]
        const dy = b[1] - a[1]
        const l2 = dx * dx + dy * dy
        if (!l2) return Math.hypot(p[0] - a[0], p[1] - a[1])
        const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
        return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
    }
    const rdp = (ini, fin) => {
        let max = 0
        let idx = -1
        for (let i = ini + 1; i < fin; i++) {
            const d = dist(pts[i], pts[ini], pts[fin])
            if (d > max) { max = d; idx = i }
        }
        if (max <= tol || idx < 0) return [pts[ini], pts[fin]]
        return [...rdp(ini, idx).slice(0, -1), ...rdp(idx, fin)]
    }
    return rdp(0, pts.length - 1)
}

// Lápiz: 4 pasadas con un temblor fijo (±0.9 px) para dar grano.
export const temblor = (pts, k) => pts.map(([x, y], i) => [x + Math.sin(i * 1.7 + k * 2.1) * 0.9, y + Math.cos(i * 1.3 + k) * 0.9])
