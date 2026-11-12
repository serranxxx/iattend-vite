/*
  Patrocinadores de un Pop (handoff "Patrocinadores en un Pop", v2 ·
  categorías):
  body.sponsors = {
    enabled,                       // ojo de la capa; false = no se pinta
    layout,                        // 'portada' | 'tarjeta' | 'banda'
    speed,                         // 0.5 · 1 · 1.8 (portada y banda)
    label,                         // etiqueta de la cinta de portada (MAYÚSCULAS)
    defaultCat,                    // a dónde caen los logos nuevos
    cats: [{ id, name, size: 'l' | 'm' | 's', color }],   // en el orden de la página
    items: [{ id, url, name, cat, w, h }],                 // w/h = tamaño natural
  }
  Siempre hay al menos una categoría ("Patrocinadores", mediana). `color:
  false` = adaptar al diseño (blancos sobre la foto, la tinta del estilo en la
  tarjeta); `true` = colores originales. Lo guardado con la v1 (niveles
  `tier` y `mono`) se lee convertido a categorías.
  Reglas gemelas: iattend-events/src/helpers/patrocinadores.ts (si cambia
  una, cambia la otra). Los tamaños son px de la pieza de 390 de ancho.
*/

export const ACOMODOS = ['portada', 'tarjeta', 'banda']
export const TAMANOS_CAT = ['l', 'm', 's']
export const VELOCIDADES = [0.5, 1, 1.8]
export const ETIQUETA_DEFAULT = 'CON EL APOYO DE'
export const NOMBRE_INICIAL = 'Patrocinadores'

// Área visual pareja por tamaño de categoría.
export const TAMANOS = {
    l: { area: 5600, maxH: 56, maxW: 150 },
    m: { area: 2100, maxH: 34, maxW: 110 },
    s: { area: 1000, maxH: 24, maxW: 80 },
}
// La cinta de la portada: todos iguales, sin importar la categoría.
export const MEDIDA_PORTADA = { area: 800, maxH: 20, maxW: 72 }
export const GAP = { tarjeta: 18, bandaFija: 30, cinta: 30, portada: 22 }
export const ANCHO_FILA = { tarjeta: 298, bandaFija: 330 }

// Cinta: velocidad base (px/ms) y cuánto avanza con el scroll.
export const CINTA = {
    portada: { sp: 0.025, k: 0 },
    banda: { sp: 0.03, k: 0.45 },
}

export const nuevoIdCategoria = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

// Categorías de la v1 (niveles fijos), en este orden y solo las que tengan marcas.
const V1 = [
    { tier: 'p', id: 'v1-p', name: 'Presentado por', size: 'l' },
    { tier: 's', id: 'v1-s', name: 'Patrocinadores', size: 'm' },
    { tier: 'a', id: 'v1-a', name: 'Aliados', size: 's' },
]
const CAT_INICIAL = 'patrocinadores'

// body.sponsors completo y normalizado (con sus valores por omisión): es lo
// que se pinta y lo que el panel vuelve a guardar.
// Banda: qué categorías van fijas arriba y cuáles corren en la cinta. Cada
// categoría puede elegirlo (`banda: 'fija' | 'cinta'`); sin elegir, la
// primera va fija si hay varias y las demás corren (con una sola, corre).
export const enBanda = (cat, indice, total) => cat?.banda ?? (total > 1 && indice === 0 ? 'fija' : 'cinta')
export const repartoBanda = (grupos) => ({
    fijas: grupos.filter((g, i) => enBanda(g.cat, i, grupos.length) === 'fija'),
    enCinta: grupos.filter((g, i) => enBanda(g.cat, i, grupos.length) === 'cinta'),
})

export const normalizarPatrocinadores = (raw) => {
    const s = raw ?? {}
    const items = Array.isArray(s.items) ? s.items.filter((it) => it?.url) : []
    let cats = Array.isArray(s.cats)
        ? s.cats.filter((c) => c?.id).map((c) => ({ id: c.id, name: c.name ?? '', size: TAMANOS_CAT.includes(c.size) ? c.size : 'm', color: Boolean(c.color), banda: ['fija', 'cinta'].includes(c.banda) ? c.banda : null }))
        : []
    let defaultCat = s.defaultCat
    if (!cats.length) {
        const color = s.mono === false
        const v1 = V1.filter((v) => items.some((it) => (it.tier ?? 's') === v.tier))
        if (items.some((it) => it.tier) && v1.length) {
            cats = v1.map(({ id, name, size }) => ({ id, name, size, color }))
            defaultCat = v1.some((v) => v.tier === 's') ? 'v1-s' : cats[cats.length - 1].id
        } else {
            cats = [{ id: CAT_INICIAL, name: NOMBRE_INICIAL, size: 'm', color }]
            defaultCat = CAT_INICIAL
        }
    }
    const ids = new Set(cats.map((c) => c.id))
    if (!ids.has(defaultCat)) defaultCat = cats[cats.length - 1].id
    const catDe = (it) => (ids.has(it.cat) ? it.cat : it.tier && ids.has(`v1-${it.tier}`) ? `v1-${it.tier}` : defaultCat)
    return {
        enabled: s.enabled !== false,
        // Estado inicial: la tarjeta.
        layout: ACOMODOS.includes(s.layout) ? s.layout : 'tarjeta',
        speed: VELOCIDADES.includes(s.speed) ? s.speed : 1,
        label: s.label || ETIQUETA_DEFAULT,
        defaultCat,
        cats,
        items: items.map(({ tier, ...it }) => ({ ...it, cat: catDe({ ...it, tier }) })),
    }
}

export const patrocinadoresDe = (body) => normalizarPatrocinadores(body?.sponsors)

// ¿Se pinta algo? Con logos y el ojo prendido.
export const hayPatrocinadores = (body) => {
    const s = patrocinadoresDe(body)
    return s.enabled && s.items.length > 0
}

// La barra de la capa (velocidad, etiqueta): con logos y en Portada o Banda.
export const tieneBarraPatrocinadores = (body) => {
    const s = patrocinadoresDe(body)
    return s.items.length > 0 && s.layout !== 'tarjeta'
}

// Categorías en orden con sus marcas (`todas`: también las vacías).
export const porCategoria = (s, { todas = false } = {}) => {
    const grupos = s.cats.map((cat) => ({ cat, items: s.items.filter((it) => it.cat === cat.id) }))
    return todas ? grupos : grupos.filter((g) => g.items.length)
}

// Todas las marcas en el orden de sus categorías.
export const enOrden = (s) => porCategoria(s, { todas: true }).flatMap((g) => g.items)

// Área visual pareja: todos los logos de una categoría pesan lo mismo, sean
// horizontales o cuadrados (r = w / h), con tope de alto y de ancho.
export const medir = (it, { area, maxH, maxW }) => {
    const r = it?.w > 0 && it?.h > 0 ? it.w / it.h : 2
    let w = Math.sqrt(area * r)
    let h = w / r
    if (h > maxH) { h = maxH; w = h * r }
    if (w > maxW) { w = maxW; h = w / r }
    return { ...it, ancho: Math.round(w), alto: Math.round(h) }
}

// Filas de ancho parejo: n = ceil(total / width) filas con un objetivo de
// total / n; se corta cuando no cabe o cuando el siguiente logo rebasa el
// objetivo a la mitad (y aún faltan filas). Así no queda un huérfano.
// Recibe logos ya medidos.
export const acomodar = (medidos, { width, gap }) => {
    if (!medidos.length) return []
    const total = medidos.reduce((s, x) => s + x.ancho, 0) + gap * (medidos.length - 1)
    const n = Math.max(1, Math.ceil(total / width))
    const objetivo = total / n
    const filas = []
    let fila = []
    let ancho = 0
    medidos.forEach((it) => {
        const suma = (fila.length ? gap : 0) + it.ancho
        if (fila.length && (ancho + suma > width || (ancho + suma / 2 > objetivo && filas.length < n - 1))) {
            filas.push(fila)
            fila = []
            ancho = 0
        }
        ancho += (fila.length ? gap : 0) + it.ancho
        fila.push(it)
    })
    if (fila.length) filas.push(fila)
    return filas
}

// Logos de una categoría medidos con su tamaño (o `medida`) y su color.
export const logosDe = (items, cat, medida = TAMANOS[cat.size]) => items.map((it) => ({ ...medir(it, medida), adaptar: !cat.color }))

// Veces que se repite la lista en la cinta (par, mínimo 4): la mitad tiene
// que cubrir el ancho de la cinta, si no se vería su final.
export const repeticionesCinta = (medidos, gap, puntos, ancho = 800) => {
    const copia = medidos.reduce((s, x) => s + x.ancho + gap + (puntos ? 4 + gap : 0), 0)
    if (!copia) return 4
    return 2 * Math.max(2, Math.ceil(ancho / copia))
}

// Adaptar al diseño: filtro sobre el <img>. Blanco sobre la foto; en la
// tarjeta con un estilo de bloques claro (papel, hielo…), oscuro (su tinta).
export const filtroAdaptado = (oscuro = false) => (oscuro ? 'brightness(0)' : 'brightness(0) invert(1)')

// Nombre de una categoría como etiqueta de la página (MAYÚSCULAS; vacío = sin etiqueta).
export const etiquetaCategoria = (cat) => String(cat?.name ?? '').trim().toUpperCase()
