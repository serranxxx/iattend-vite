/*
  Asistentes de un Pop en el editor (cuadro de muestra en la pieza): la
  página del invitado (iattend-events, components/SideEvent/Asistentes) pinta
  la lista real; aquí siempre se ve el ejemplo, igual al que enseña "Ver en
  vivo" mientras nadie confirma. Contraparte: Asistentes/datosAsistentes.ts en events.
*/

// Paleta de perfiles (iattend-events, ConfirmCard/profiles.ts): [claro, oscuro].
const PERFILES = [
    ['#BFB3D3', '#A79ABC'], ['#EB5A40', '#C6422A'], ['#F0A23B', '#C88124'], ['#FFD931', '#DFBA18'],
    ['#A1B569', '#7F9347'], ['#69A266', '#477644'], ['#61A39A', '#427A72'], ['#89D8EC', '#67B1C3'],
    ['#4B9DE0', '#3073A9'], ['#2F438C', '#1A285C'], ['#7C8EDE', '#5869B6'], ['#C760A2', '#A94486'],
    ['#92A0A3', '#6C7A7D'], ['#D1B48A', '#927A57'], ['#755027', '#5F3F1C'], ['#2D2D2C', '#232322'],
]
// Modo emoji: colores alegres (sin grises, café ni marino). Igual que events.
const ELEGIBLES = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 13]
// Modo iniciales: colores sobrios.
const FORMALES = [
    ['#2F3B52', '#1F2839'], ['#4A4E57', '#33363D'], ['#5B6B73', '#45525A'], ['#7A6A58', '#5E5143'],
    ['#3F5A4A', '#2D4236'], ['#6B3F48', '#4F2E35'], ['#8C7B5E', '#6E6049'], ['#4B4F6B', '#363950'],
]

// Los mismos de iattend-events (datosAsistentes.ts, EMOJIS_AVATAR).
const EMOJIS = [
    '🎉', '🥂', '💃', '🕺', '🍾', '✨', '🥳', '😎', '🌸', '💐', '🤍', '❤️',
    '🎶', '🪩', '🔥', '🌟', '🦋', '🌻', '🍸', '🎂', '👑', '😍', '🌈', '🎊',
]

const hashDe = (id, semilla) => {
    let h = semilla
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return h
}

const perfilDe = (a) => {
    if (a.perfil != null && PERFILES[a.perfil]) return a.perfil
    return ELEGIBLES[hashDe(a.id, 0) % ELEGIBLES.length]
}

// Sin emoji elegido: uno fijo por invitado (nunca letras). Igual que events.
export const emojiAsistente = (a) => a.emoji || EMOJIS[hashDe(a.id, 7) % EMOJIS.length]

// Modo iniciales con el color del tema: tonos parecidos al color base (mismo
// matiz con variaciones ligeras de tono y luz), oscuros para que las letras
// blancas se lean. Tema gris o negro: grises. Sin tema, los sobrios de
// siempre. Igual que events (datosAsistentes.ts, formalesDe).
const aHsl = (hex) => {
    const n = parseInt(hex.slice(1), 16)
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
    if (max === min) return { h: 0, s: 0, l }
    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    return { h: h * 60, s, l }
}
const aHex = (h, s, l) => {
    const k = (n) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))))
    return `#${[f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}
// [desplazamiento de tono, luz] de cada variante.
const VARIANTES_TEMA = [[0, 0.3], [-14, 0.36], [14, 0.42], [-7, 0.48], [7, 0.34], [-20, 0.4], [20, 0.46], [0, 0.26]]
const formalesCache = new Map()
const formalesDe = (tema) => {
    if (!tema || !/^#[0-9a-f]{6}$/i.test(tema)) return FORMALES
    if (formalesCache.has(tema)) return formalesCache.get(tema)
    const { h, s } = aHsl(tema)
    const sat = s < 0.08 ? s : Math.min(0.55, Math.max(0.18, s * 0.75))
    const lista = VARIANTES_TEMA.map(([dh, l]) => {
        const tono = (h + (sat < 0.08 ? 0 : dh) + 360) % 360
        return [aHex(tono, sat, l), aHex(tono, sat, Math.max(0.12, l - 0.08))]
    })
    formalesCache.set(tema, lista)
    return lista
}

// `modo`: 'emoji' (por omisión) o 'initials' (body.attendeesStyle). `tema`:
// color del tema del Pop (body.color), para el modo iniciales.
export const fondoAsistente = (a, modo = 'emoji', tema) => {
    const formales = formalesDe(tema)
    const [claro, oscuro] = modo === 'initials' ? formales[hashDe(a.id, 3) % formales.length] : PERFILES[perfilDe(a)]
    return `linear-gradient(to bottom, ${claro}, ${oscuro})`
}

// Solo letras: "Abuela (Lupita)" → "AL", no "A(".
const iniciales = (n) => n.trim().split(/\s+/).map((p) => p.match(/\p{L}/u)?.[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

// Confirmados reales del Pop (filas de side_events_guests que ya tiene el
// editor) con la forma que da GET /api/side-events/:id/asistentes: primer
// nombre, iniciales y avatar, el más reciente primero. "Ver en vivo" los usa
// en vez del ejemplo aunque el interruptor aún no esté guardado.
export const asistentesDe = (filas) => {
    const lista = (filas ?? [])
        .filter((g) => g.state === 'confirmado')
        .sort((a, b) => String(b.last_update_date ?? '').localeCompare(String(a.last_update_date ?? '')))
        .map((g) => ({
            id: String(g.id),
            nombre: String(g.name ?? '').trim().split(/\s+/)[0] || '',
            iniciales: iniciales(String(g.name ?? '')) || '?',
            emoji: g.emoji || null,
            perfil: Number.isInteger(g.profile) ? g.profile : null,
            titular: g.companion_id ? String(g.companion_id) : null,
        }))
    return { total: lista.length, asistentes: lista.slice(0, 300) }
}

// [nombre, emoji, perfil, índice del titular si es acompañante]. Igual que events.
export const ASISTENTES_EJEMPLO = [
    ['Sofía Ramírez', '🎉', 1, null], ['Diego Torres', null, null, 0], ['Valeria Cruz', '💃', 11, 0],
    ['Mateo Herrera', '🍾', 5, null], ['Camila Ortiz', null, 13, 3], ['Andrés Molina', '🕺', null, null],
    ['Regina Salas', '🥂', 3, null], ['Emilio Vargas', null, null, 6], ['Lucía Navarro', '🌸', 13, null],
    ['Santiago Ríos', '😎', 7, null], ['Daniela Fuentes', null, null, 9], ['Pablo Medina', '🎶', 10, 9],
    ['Mariana León', '✨', 2, null], ['Rodrigo Peña', null, 6, null],
].map(([nombre, emoji, perfil, titular], i) => ({
    id: `ejemplo-${i}`,
    nombre: nombre.split(' ')[0],
    iniciales: iniciales(nombre),
    emoji,
    perfil,
    titular: titular == null ? null : `ejemplo-${titular}`,
}))

// Solo en la pieza del editor: los confirmados reales primero y, si son
// pocos, asistentes de ejemplo hasta `minimo` para que el cuadro se vea lleno
// (con la marca "Ejemplo"). Igual que rellenarConEjemplo en events.
export const rellenarConEjemplo = (lista, minimo = 9) => {
    const reales = lista?.asistentes ?? []
    const faltan = Math.max(0, minimo - reales.length)
    if (!faltan) return lista ?? { total: 0, asistentes: [] }
    const relleno = ASISTENTES_EJEMPLO.slice(0, faltan)
    return { total: (lista?.total ?? reales.length) + relleno.length, asistentes: [...reales, ...relleno], ejemplo: true }
}

// Pases: titular + acompañantes que confirmaron (si el titular no está, el
// acompañante va solo). Igual que unidadesDe en events.
export const unidadesDe = (lista) => {
    const porId = new Map(lista.map((a) => [a.id, a]))
    const grupos = new Map()
    for (const a of lista) {
        const raiz = a.titular && porId.has(a.titular) ? a.titular : a.id
        if (!grupos.has(raiz)) grupos.set(raiz, [])
        grupos.get(raiz).push(a)
    }
    return [...grupos.entries()].map(([id, ms]) => {
        const titular = porId.get(id)
        const miembros = [titular, ...ms.filter((m) => m.id !== id)]
        return { id, miembros, etiqueta: miembros.length > 1 ? `${titular.nombre} +${miembros.length - 1}` : titular.nombre }
    })
}
