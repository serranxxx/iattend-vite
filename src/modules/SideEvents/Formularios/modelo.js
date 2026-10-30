import {
    AlignLeft, Calendar, CircleDot, Hash, Mail, Phone, ShieldCheck, SquareCheck, Text, ToggleRight,
} from 'lucide-react'

/*
  Formularios propios de un Flash (handoff "Formularios propios en Eventos
  Flash"). El organizador los arma desde cero en la vista completa
  (FormularioVista.jsx) y quedan en "Mis formularios" (tabla forms, por
  dueño). Cada Flash guarda en body.form { formId, snapshot, reglas }:

    items (forms.items)  lista plana para editar y reordenar:
      { id, kind: 'section', title }
      { id, type, label, required, help?, options?, max? }
    snapshot (body.form.snapshot)  lo que pinta iattend-events
      (components/SideEvent/Registro/) y valida el backend
      (router/sideEventForm.js): { title, intro, sections[{ title, fields[] }], version }

  Los id de pregunta no cambian nunca: las respuestas se guardan por id.
*/

// Tipos de pregunta, en el orden del menú (con separador antes de Número y de Autorización).
export const TIPOS = [
    { type: 'short', Icon: Text },
    { type: 'long', Icon: AlignLeft },
    { type: 'single', Icon: CircleDot, opciones: true },
    { type: 'multi', Icon: SquareCheck, opciones: true },
    { type: 'yesno', Icon: ToggleRight },
    { type: 'number', Icon: Hash, separador: true },
    { type: 'phone', Icon: Phone },
    { type: 'email', Icon: Mail },
    { type: 'date', Icon: Calendar },
    { type: 'check', Icon: ShieldCheck, separador: true },
]
export const TIPO = Object.fromEntries(TIPOS.map((x) => [x.type, x]))
export const usaOpciones = (type) => Boolean(TIPO[type]?.opciones)
export const MAX_OPCIONES = 20

export const uid = (pre = 'q') => `${pre}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`

export const preguntaNueva = (type = 'short') => ({
    id: uid('q'),
    type,
    label: '',
    required: false,
    ...(usaOpciones(type) ? { options: ['Opción 1'] } : {}),
})
export const seccionNueva = () => ({ id: uid('s'), kind: 'section', title: '' })

export const esSeccion = (it) => it?.kind === 'section'

// Lo que le falta a una pregunta para publicarse (sin texto o sin opciones).
export const incompleta = (it) => !esSeccion(it) && (
    !String(it.label ?? '').trim()
    || (usaOpciones(it.type) && !(it.options ?? []).some((o) => String(o).trim()))
)

// Una pregunta del formulario → el campo que entiende la página del invitado.
export const campoPublicado = (it) => {
    const base = {
        id: it.id,
        kind: it.type,
        label: String(it.label).trim(),
        required: Boolean(it.required),
        ...(it.help?.trim() ? { help: it.help.trim() } : {}),
    }
    switch (it.type) {
        case 'long': return { ...base, type: 'long', maxLength: 500 }
        case 'single': return { ...base, type: 'single', options: limpiarOpciones(it.options) }
        case 'multi': return { ...base, type: 'multi', options: limpiarOpciones(it.options), ...(it.max ? { max: it.max } : {}) }
        case 'yesno': return { ...base, type: 'yesno' }
        case 'number': return { ...base, type: 'text', inputMode: 'numeric', maxLength: 12, validate: 'number' }
        case 'phone': return { ...base, type: 'text', inputMode: 'tel', prefix: '+52', maxLength: 12, placeholder: '614 000 0000', validate: 'phone10', prefillFrom: 'phone_number' }
        case 'email': return { ...base, type: 'text', inputMode: 'email', placeholder: 'nombre@correo.com', validate: 'email' }
        case 'date': return { ...base, type: 'date' }
        case 'check': return { ...base, type: 'check', link: 'Leer aviso de privacidad' }
        default: return { ...base, type: 'text', maxLength: 200 }
    }
}
const limpiarOpciones = (ops) => [...new Set((ops ?? []).map((o) => String(o).trim()).filter(Boolean))].slice(0, MAX_OPCIONES)

// items → secciones. Si la lista empieza sin sección, el primer grupo va sin título.
export const seccionesDe = (items) => {
    const secciones = []
    let actual = null
    for (const it of items ?? []) {
        if (esSeccion(it)) { actual = { id: it.id, title: String(it.title ?? '').trim(), fields: [] }; secciones.push(actual); continue }
        if (incompleta(it)) continue
        if (!actual) { actual = { id: 'inicio', title: '', fields: [] }; secciones.push(actual) }
        actual.fields.push(campoPublicado(it))
    }
    return secciones.filter((s) => s.fields.length)
}

export const snapshotDe = (form) => ({
    title: String(form?.title ?? '').trim() || 'Formulario sin título',
    intro: String(form?.description ?? '').trim(),
    sections: seccionesDe(form?.items),
    version: new Date().toISOString(),
})

// Un snapshot (o un formulario viejo de plantilla) → items, para guardarlo en Mis formularios.
const tipoDeCampo = (f) => f.kind
    ?? (f.type === 'text'
        ? (f.validate === 'phone10' ? 'phone' : f.validate === 'email' ? 'email' : f.inputMode === 'numeric' ? 'number' : 'short')
        : f.type)
export const itemsDeSnapshot = (snapshot) => (snapshot?.sections ?? []).flatMap((s, i) => [
    ...(s.title || i > 0 ? [{ id: s.id && s.id !== 'inicio' ? s.id : uid('s'), kind: 'section', title: s.title ?? '' }] : []),
    ...(s.fields ?? []).filter((f) => f.enabled !== false).map((f) => ({
        id: f.id,
        type: tipoDeCampo(f),
        label: f.label ?? '',
        required: Boolean(f.required),
        ...(f.help ? { help: f.help } : {}),
        ...(f.options ? { options: f.options } : {}),
        ...(f.max ? { max: f.max } : {}),
    })),
])

// body.form tal como lo usa la página: el snapshot, o un formulario viejo de plantilla.
export const formPublicado = (form) => {
    if (!form) return null
    if (form.snapshot) return { ...form, ...form.snapshot }
    return form.sections ? { ...form, intro: form.intro ?? '' } : { ...form, sections: [] }
}

export const reglasDefault = () => ({
    enabled: true,
    scope: 'persona',
    allowLater: true,
    accepting: true,
    privacyUrl: '',
    folioPrefix: 'REG',
})

export const contarPreguntas = (items) => (items ?? []).filter((it) => !esSeccion(it)).length

// Celdas de la tabla y del Excel: arrays → "a, b"; sí/no; autorización.
export const valorCelda = (v, kind, t) => {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return ''
    if (Array.isArray(v)) return v.join(', ')
    if (kind === 'check') return v === true ? t('side_events.frm_accepted') : t('side_events.frm_not_accepted')
    if (v === true) return t('side_events.frm_yes')
    if (v === false) return t('side_events.frm_no')
    if (kind === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) {
        const [y, m, d] = String(v).split('-').map(Number)
        return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    }
    return String(v)
}

// "hace 2 días" sin dependencias.
export const haceCuanto = (iso, lang = 'es') => {
    if (!iso) return ''
    const seg = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
    const pasos = [[60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year']]
    let v = seg
    for (const [tam, unidad] of pasos) {
        if (Math.abs(v) < tam) return unidad === 'second' ? rtf.format(0, 'second') : rtf.format(Math.round(v), unidad)
        v /= tam
    }
    return ''
}

export const fechaCorta = (iso, lang = 'es') => (iso
    ? new Date(iso).toLocaleString(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', '')
    : '')

export const inicialesDe = (n) => String(n ?? '').trim().split(/\s+/).map((p) => p.match(/\p{L}/u)?.[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
