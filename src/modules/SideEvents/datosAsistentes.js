/*
  Asistentes de un Flash en el editor (cuadro de muestra en la pieza): la
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

// `modo`: 'emoji' (por omisión) o 'initials' (body.attendeesStyle).
export const fondoAsistente = (a, modo = 'emoji') => {
    const [claro, oscuro] = modo === 'initials' ? FORMALES[hashDe(a.id, 3) % FORMALES.length] : PERFILES[perfilDe(a)]
    return `linear-gradient(to bottom, ${claro}, ${oscuro})`
}

// Solo letras: "Abuela (Lupita)" → "AL", no "A(".
const iniciales = (n) => n.trim().split(/\s+/).map((p) => p.match(/\p{L}/u)?.[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

// Confirmados reales del Flash (filas de side_events_guests que ya tiene el
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
