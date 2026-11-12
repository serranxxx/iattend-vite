/*
  Pop en línea (handoff "Pop · Evento en línea"). Reglas compartidas por el
  editor y la página del invitado; gemela de iattend-events/src/helpers/acceso.ts.
  Si cambias una, cambia la otra.

  Dónde vive cada cosa:
  · body.modo = 'presencial' | 'online' (sin valor = presencial).
  · body.online = { platform, onlyConfirmed, material } — lo PÚBLICO: lo que
    la página puede saber antes de confirmar (plataforma para la portada y la
    cabecera, si hay material). Cambiar de modo no borra nada.
  · side_events.acceso (columna aparte, no la devuelve la página pública) =
    { url, meetingId, passcode, onlyConfirmed, material: [{ id, kind: 'link',
    title, url } | { id, kind: 'file', title, path, mime, size }] }. La página
    lo pide a GET /api/side-events/:clave/acceso (solo confirmados si
    onlyConfirmed).
*/

export const PLATAFORMAS = ['zoom', 'meet', 'youtube', 'link']

// Campos de la dirección de un lugar presencial (body.address) y su etiqueta
// en side_events.* — la barra del lugar (side event de boda) y el panel
// Ubicación del Pop.
export const CAMPOS_DIRECCION = [
    ['street', 'address_street'],
    ['number', 'address_number'],
    ['neighborhood', 'address_neighborhood'],
    ['zipcode', 'address_zipcode'],
    ['city', 'address_city'],
    ['state', 'address_state'],
    ['country', 'address_country'],
]

export const esOnline = (body) => body?.modo === 'online'

const hostDe = (u) => {
    try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' }
}

// { valido, https, platform, host, corto, videoId, meetCode, zoomConPwd }
export const detectarPlataforma = (raw) => {
    const url = String(raw ?? '').trim()
    if (!url) return { valido: false, https: false, platform: null, host: '', corto: '' }
    let u
    try { u = new URL(url) } catch { return { valido: false, https: false, platform: null, host: '', corto: '' } }
    const host = u.hostname.replace(/^www\./, '').toLowerCase()
    const corto = `${host}${u.pathname === '/' ? '' : u.pathname}`
    const base = { valido: true, https: u.protocol === 'https:', host, corto }
    if (host === 'zoom.us' || host.endsWith('.zoom.us')) {
        return { ...base, platform: 'zoom', zoomConPwd: u.searchParams.has('pwd') }
    }
    if (host === 'meet.google.com') {
        const meetCode = u.pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || null
        return { ...base, platform: 'meet', meetCode }
    }
    if (host === 'youtu.be') return { ...base, platform: 'youtube', videoId: u.pathname.slice(1).split('/')[0] || null }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host.endsWith('.youtube.com')) {
        const vivo = /^\/live\/([^/?#]+)/.exec(u.pathname)
        const videoId = vivo?.[1] ?? u.searchParams.get('v') ?? null
        return { ...base, platform: 'youtube', videoId }
    }
    return { ...base, platform: 'link' }
}

// "842 1390 7711": el ID de Zoom en grupos, como lo muestra Zoom.
export const formatoIdZoom = (id) => {
    const d = String(id ?? '').replace(/\D/g, '')
    if (d.length === 11) return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`
    if (d.length === 10) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
    if (d.length === 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
    return String(id ?? '').trim()
}

// El ID de Zoom sale del URL (/j/84213907711) si no lo escribieron.
export const idDeZoom = (url) => {
    const m = /\/j\/(\d{9,11})/.exec(String(url ?? ''))
    return m ? m[1] : null
}

// Textos por plataforma (portada y cabecera del widget).
export const textosPlataforma = (platform, { host = '' } = {}) => ({
    zoom: { titulo: 'Reunión de Zoom', portada: 'En línea · Zoom', boton: 'Unirme' },
    meet: { titulo: 'Google Meet', portada: 'En línea · Google Meet', boton: 'Unirme' },
    youtube: { titulo: 'Transmisión', portada: 'Transmisión en línea', boton: 'Ver transmisión' },
    link: { titulo: host || 'Enlace', portada: 'En línea', boton: 'Abrir' },
}[platform] ?? { titulo: host || 'Enlace', portada: 'En línea', boton: 'Abrir' })

// Lo público que se guarda en body.online a partir del acceso privado.
export const publicoDeAcceso = (acceso) => {
    const d = detectarPlataforma(acceso?.url)
    return {
        platform: d.valido ? d.platform : null,
        onlyConfirmed: acceso?.onlyConfirmed !== false,
        material: Array.isArray(acceso?.material) ? acceso.material.length : 0,
    }
}

// Cuerpo de acceso con los valores por omisión.
export const normalizarAcceso = (raw) => ({
    url: raw?.url ?? '',
    meetingId: raw?.meetingId ?? '',
    passcode: raw?.passcode ?? '',
    onlyConfirmed: raw?.onlyConfirmed !== false,
    material: Array.isArray(raw?.material) ? raw.material : [],
})

// ── Archivos ──────────────────────────────────────────────────────────
export const MATERIAL_MAX_BYTES = 20 * 1024 * 1024
export const MATERIAL_TIPOS = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'application/vnd.ms-powerpoint': 'PPT',
    'image/png': 'PNG',
    'image/jpeg': 'JPG',
    'image/webp': 'WEBP',
}
export const MATERIAL_ACCEPT = '.pdf,.pptx,.ppt,.png,.jpg,.jpeg,.webp'

export const tipoDeArchivo = (mime, nombre = '') =>
    MATERIAL_TIPOS[mime] ?? (String(nombre).split('.').pop() || 'Archivo').toUpperCase().slice(0, 4)

export const pesoLegible = (bytes) => {
    const n = Number(bytes) || 0
    if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
    if (n >= 1024) return `${Math.round(n / 1024)} KB`
    return `${n} B`
}

export const sinExtension = (nombre) => String(nombre ?? '').replace(/\.[^./\\]+$/, '')

export const hostDeMaterial = hostDe

// ── Tiempo ────────────────────────────────────────────────────────────
// Todo con la hora de pared del evento ("YYYY-MM-DD HH:mm" en body.timezone):
// se compara con "ahora" en esa misma zona, sin pasar a UTC.

export const ahoraEn = (timeZone, fecha = new Date()) => {
    const p = new Intl.DateTimeFormat('en-CA', {
        timeZone: timeZone || 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(fecha)
    const g = (t) => p.find((x) => x.type === t)?.value ?? ''
    return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}`
}

// Minutos desde una referencia fija para restar dos horas de pared.
const aMinutos = (pared) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(pared ?? ''))
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60000 : null
}
const deMinutos = (min) => {
    const d = new Date(min * 60000)
    const z = (n) => String(n).padStart(2, '0')
    return `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())} ${z(d.getUTCHours())}:${z(d.getUTCMinutes())}`
}

// Inicio y fin del Pop: primer y último momento del itinerario o, sin él,
// la hora del Pop y 3 h después (como el calendario).
export const inicioYFin = (body) => {
    const hora = String(body?.hour ?? '').slice(0, 16)
    const dia = hora.slice(0, 10)
    const momentos = (Array.isArray(body?.itinerary) ? body.itinerary : [])
        .filter((m) => /^\d{1,2}:\d{2}/.test(String(m?.time ?? '')))
        .map((m) => `${String(m.date || dia).slice(0, 10)} ${String(m.time).padStart(5, '0').slice(0, 5)}`)
        .filter((p) => aMinutos(p) != null)
        .sort()
    const inicio = momentos[0] ?? (aMinutos(hora) != null ? hora : null)
    if (!inicio) return { inicio: null, fin: null }
    let fin = momentos.length > 1 ? momentos[momentos.length - 1] : null
    if (!fin || aMinutos(fin) <= aMinutos(inicio)) fin = deMinutos(aMinutos(inicio) + 180)
    return { inicio, fin }
}

// 134 → "2 h 14 min"; 45 → "45 min"; 1500 → "1 día".
export const faltaLegible = (min) => {
    if (min >= 48 * 60) return `${Math.round(min / (24 * 60))} días`
    if (min >= 24 * 60) return '1 día'
    const h = Math.floor(min / 60)
    const m = min % 60
    return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`
}

// Estado por la hora (nivel 1 del handoff): antes (> 15 min) · pronto (15 min
// antes → inicio) · envivo (inicio → fin) · termino.
export const estadoPorHora = (body, ahora = new Date()) => {
    const { inicio, fin } = inicioYFin(body)
    if (!inicio) return { estado: null, falta: null }
    const ya = aMinutos(ahoraEn(body?.timezone, ahora))
    const ini = aMinutos(inicio)
    const fi = aMinutos(fin)
    if (ya < ini - 15) return { estado: 'antes', falta: ini - ya }
    if (ya < ini) return { estado: 'pronto', falta: ini - ya }
    if (ya < fi) return { estado: 'envivo', falta: 0 }
    return { estado: 'termino', falta: 0 }
}

// Desfase (min) de una zona en un instante: hora de pared − UTC.
const desfase = (timeZone, fecha) => {
    const pared = aMinutos(ahoraEn(timeZone, fecha))
    return pared - Math.round(fecha.getTime() / 60000)
}

// Ciudad de una zona IANA: "America/Monterrey" → "Monterrey".
export const ciudadDeZona = (tz) => ({
    'America/Mexico_City': 'Ciudad de México',
}[tz] ?? String(tz ?? '').split('/').pop().replace(/_/g, ' '))

const horaCorta = (pared) => {
    const m = /(\d{2}):(\d{2})$/.exec(String(pared ?? ''))
    if (!m) return ''
    const h = +m[1]
    return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'am' : 'pm'}`
}

// "9:00 am hora de Monterrey · 10:00 am en tu zona" si la zona del invitado
// es otra; si es la misma, null.
export const lineaZona = (body, zonaInvitado) => {
    const tzEvento = body?.timezone || 'America/Mexico_City'
    const tzTuya = zonaInvitado || Intl.DateTimeFormat().resolvedOptions().timeZone
    const { inicio } = inicioYFin(body)
    if (!inicio || !tzTuya || tzTuya === tzEvento) return null
    const ahora = new Date()
    const delta = desfase(tzTuya, ahora) - desfase(tzEvento, ahora)
    if (!delta) return null
    const tuya = deMinutos(aMinutos(inicio) + delta)
    return `${horaCorta(inicio)} hora de ${ciudadDeZona(tzEvento)} · ${horaCorta(tuya)} en tu zona`
}

// Zonas para el selector del editor (un Pop en línea no tiene dirección de
// la cual sacarla).
export const ZONAS = [
    'America/Mexico_City', 'America/Monterrey', 'America/Cancun', 'America/Chihuahua', 'America/Hermosillo',
    'America/Mazatlan', 'America/Tijuana', 'America/Bogota', 'America/Lima', 'America/Santiago',
    'America/Argentina/Buenos_Aires', 'America/New_York', 'America/Chicago', 'America/Denver',
    'America/Los_Angeles', 'Europe/Madrid', 'Europe/London',
]
