import { formatAbsoluteDateEs } from '../../../helpers/assets/eventDateTime'

// Recordatorios (comunicados) por WhatsApp. Ver docs/recordatorios.md.
//
// Cada plantilla de `reminder_templates` dice qué dato va en cada {{n}}
// (`body_variables`, y `button_variable` para el {{1}} del botón URL). Este
// es el catálogo de esos datos y cómo se resuelven por invitado. El backend
// valida las mismas llaves (iattend--backend/controllers/reminderTemplates.js,
// VARIABLES): si agregas una, agrégala en los dos.

export const REMINDER_VARIABLES = {
    guest_name: {
        label: 'Nombre del titular',
        example: 'Ana López',
        resolve: ({ guest }) => guest?.name?.trim() || '',
    },
    event_title: {
        label: 'Nombre del evento (título de la portada)',
        example: 'Ale & Santiago',
        resolve: ({ invitation }) => invitation?.cover?.title?.text?.value?.trim() || '',
    },
    event_date: {
        label: 'Fecha del evento',
        example: '30 de agosto de 2026',
        resolve: ({ invitation, eventDate }) => {
            const raw = eventDate || invitation?.cover?.date?.value
            return raw ? formatAbsoluteDateEs(raw) : ''
        },
    },
    rsvp_deadline: {
        label: 'Fecha límite para confirmar',
        example: '15 de agosto de 2026',
        missing: 'reminders.missing_deadline',
        resolve: ({ rsvpDeadline }) => (rsvpDeadline ? formatAbsoluteDateEs(rsvpDeadline) : ''),
    },
    // El magic link del invitado sin el dominio: el botón de la plantilla en
    // Meta es https://www.iattend.events/{{1}} (mismo link que "Copiar link").
    invitation_path: {
        label: 'Magic link del invitado (para el botón)',
        example: 'boda/ale-y-santiago?password=K7Q2',
        resolve: ({ guest, invitation, name }) => {
            const label = invitation?.generals?.event?.label
            if (!label || !name || !guest?.password) return ''
            return `${label}/${name}?password=${guest.password}`
        },
    },
    // Encabezado de imagen: la imagen del link de la invitación
    // (invitations.url_image, se cambia desde el header) o, si no hay, la
    // portada — lo mismo que muestra la vista previa del link.
    link_image: {
        label: 'Imagen del link de la invitación',
        example: '',
        image: true,
        missing: 'reminders.missing_link_image',
        resolve: ({ urlImage, invitation }) => {
            const url = urlImage || invitation?.cover?.image?.prod || ''
            return /^https:\/\//i.test(url) ? url : ''
        },
    },
}

// Datos que pueden ir en el texto o en el botón (la imagen solo en el encabezado).
export const TEXT_VARIABLE_KEYS = Object.keys(REMINDER_VARIABLES).filter((key) => !REMINDER_VARIABLES[key].image)
export const IMAGE_VARIABLE_KEYS = Object.keys(REMINDER_VARIABLES).filter((key) => REMINDER_VARIABLES[key].image)

// Solo números de México reciben WhatsApp (mismo criterio que el resto de la página).
export const isValidPhone = (phone) => /^\+52\d+/.test(phone || '')

const resolveOne = (key, ctx) => REMINDER_VARIABLES[key]?.resolve(ctx) ?? ''

// Datos del evento que le faltan a la plantilla (no dependen del invitado).
// Devuelve la llave i18n del motivo, o null si se puede usar.
export const templateBlockReason = (template, ctx) => {
    const keys = [...(template?.body_variables ?? []), template?.button_variable, template?.header_image_variable].filter(Boolean)
    for (const key of keys) {
        if (key === 'guest_name' || key === 'invitation_path') continue
        if (!resolveOne(key, ctx)) return REMINDER_VARIABLES[key]?.missing ?? 'reminders.missing_event_data'
    }
    return null
}

// Parámetros de la plantilla para un invitado. `null` si falta alguno.
export const resolveParams = (template, ctx) => {
    const bodyParams = (template?.body_variables ?? []).map((key) => resolveOne(key, ctx))
    const buttonParam = template?.button_variable ? resolveOne(template.button_variable, ctx) : null
    const headerImage = template?.header_image_variable ? resolveOne(template.header_image_variable, ctx) : null
    if (bodyParams.some((p) => !p) || (template?.button_variable && !buttonParam)) return null
    if (template?.header_image_variable && !headerImage) return null
    return { bodyParams, buttonParam, ...(headerImage ? { headerImage } : {}) }
}

// Botón por defecto de los recordatorios nuevos: todos llevan al magic link.
export const DEFAULT_BUTTON_URL = 'https://www.iattend.events/{{1}}'
export const DEFAULT_BUTTON_VARIABLE = 'invitation_path'

// Vista previa del cuerpo en trozos. El cuerpo se guarda tal como está en
// Meta, con el formato de WhatsApp: *negritas* (p. ej. `Hola *{{1}}*`). Primero
// se sustituyen los {{n}} y luego se separan las negritas. Sin `ctx` usa los
// ejemplos del catálogo.
export const bodyParts = (template, ctx = null) => {
    const keys = template?.body_variables ?? []
    const text = String(template?.body ?? '').replace(/\{\{(\d+)\}\}/g, (match, n) => {
        const key = keys[Number(n) - 1]
        if (!key) return match
        return (ctx && resolveOne(key, ctx)) || REMINDER_VARIABLES[key]?.example || match
    })
    return text.split(/(\*[^*\n]+\*)/).filter(Boolean).map((chunk) => (
        /^\*[^*\n]+\*$/.test(chunk)
            ? { text: chunk.slice(1, -1), bold: true }
            : { text: chunk, bold: false }
    ))
}

export const renderHeaderImage = (template, ctx) => (
    template?.header_image_variable ? resolveOne(template.header_image_variable, ctx) || null : null
)

export const renderButtonUrl = (template, ctx) => {
    if (!template?.button_url) return null
    const value = template.button_variable ? (resolveOne(template.button_variable, ctx) || REMINDER_VARIABLES[template.button_variable]?.example) : ''
    return template.button_url.replace('{{1}}', value ?? '')
}

// ── Segmentos y reglas ──────────────────────────────────────────────────
// El universo son los titulares ya invitados (fuera de "Por invitar").

export const SEGMENTS = ['todos', 'esperando', 'leyeron', 'confirmados', 'sinMesa']

const isConfirmed = (g) => g.state === 'confirmado' || g.state === 'asistente'
const hasRead = (g, dispatchMap) => dispatchMap?.[g.id]?.status === 'read'

export const matchesSegment = (g, segment, dispatchMap) => {
    switch (segment) {
        case 'esperando': return g.state === 'esperando'
        case 'leyeron': return g.state === 'esperando' && hasRead(g, dispatchMap)
        case 'confirmados': return isConfirmed(g)
        case 'sinMesa': return isConfirmed(g) && (g.table === null || g.table === undefined)
        case 'todos':
        default: return true
    }
}

export const RULE_FIELDS = ['state', 'tag', 'side', 'tier', 'table', 'read']

// Valores posibles de cada campo. `tags` y `owners` salen de la invitación.
export const ruleValues = (field, { tags = [], owners = [] } = {}) => {
    switch (field) {
        case 'state': return ['esperando', 'confirmado', 'rechazado']
        case 'tag': return (tags ?? []).filter(Boolean)
        case 'side': return (owners ?? []).filter(Boolean)
        case 'tier': return ['A', 'B', 'C', 'D']
        case 'table': return ['con', 'sin']
        case 'read': return ['leyo', 'no_leyo']
        default: return []
    }
}

const ruleHolds = (g, rule, dispatchMap) => {
    switch (rule.field) {
        case 'state': return rule.value === 'confirmado' ? isConfirmed(g) : g.state === rule.value
        case 'tag': return g.tag === rule.value
        case 'side': return g.side === rule.value
        case 'tier': return g.tier === rule.value
        case 'table': return rule.value === 'con' ? g.table != null : g.table == null
        case 'read': return rule.value === 'leyo' ? hasRead(g, dispatchMap) : !hasRead(g, dispatchMap)
        default: return true
    }
}

export const matchesRules = (g, rules, comb, dispatchMap) => {
    const active = (rules ?? []).filter((r) => r.field && r.value)
    if (active.length === 0) return true
    const results = active.map((r) => (r.op === 'no' ? !ruleHolds(g, r, dispatchMap) : ruleHolds(g, r, dispatchMap)))
    return comb === 'or' ? results.some(Boolean) : results.every(Boolean)
}
