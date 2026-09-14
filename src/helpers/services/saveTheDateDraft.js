import axios from 'axios'
import { supabase } from '../../lib/supabase'

/**
 * Borrador del Save the Date gratis (/save-the-date).
 *
 * Mientras no hay cuenta no hay evento, así que el borrador vive en
 * localStorage y los archivos que suba la persona van a una carpeta temporal
 * del bucket (`temp/<id>/`). Al crear su cuenta se crea la invitación, los
 * archivos se mueven a la carpeta del evento y el borrador se descarta. Si no
 * crea cuenta, el barrido del backend borra esa carpeta al día siguiente.
 */

const BUCKET = 'user_images'
const DRAFT_KEY = 'iattend_std_draft'
const FOLDER_KEY = 'iattend_std_temp_folder'
// Se enciende al pulsar Guardar sin sesión, justo antes de mandar al login con
// redirect. Al volver, es lo que distingue "vengo de loguearme para guardar"
// de "abrí la página ya logueado": sin ella, el borrador —que existe siempre
// por el autoguardado— bastaba para arrancar la adopción al entrar.
const PENDING_SAVE_KEY = 'iattend_std_pending_save'
const PUBLIC_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`

const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`)

/** Carpeta temporal de esta persona; se crea la primera vez que se necesita. */
export const getTempFolder = () => {
    try {
        const saved = localStorage.getItem(FOLDER_KEY)
        if (saved) return saved
        const folder = `temp/${newId()}`
        localStorage.setItem(FOLDER_KEY, folder)
        return folder
    } catch {
        // Modo privado sin localStorage: la carpeta dura lo que la pestaña
        return `temp/${newId()}`
    }
}

export const saveDraft = (draft) => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch { /* sin storage */ }
}

export const readDraft = () => {
    try {
        const raw = localStorage.getItem(DRAFT_KEY)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export const markPendingSave = () => {
    try { localStorage.setItem(PENDING_SAVE_KEY, '1') } catch { /* sin storage */ }
}

// Lee y apaga en el mismo gesto: una vuelta del login solo se reanuda una vez.
export const consumePendingSave = () => {
    try {
        const on = localStorage.getItem(PENDING_SAVE_KEY) === '1'
        localStorage.removeItem(PENDING_SAVE_KEY)
        return on
    } catch { return false }
}

export const clearDraft = () => {
    try {
        localStorage.removeItem(DRAFT_KEY)
        localStorage.removeItem(FOLDER_KEY)
    } catch { /* sin storage */ }
}

/** Dispara el barrido de carpetas temporales viejas (sin esperar respuesta). */
export const sweepTempStorage = () => {
    axios.post(`${import.meta.env.VITE_API_URL}/api/storage/temp-sweep`).catch(() => { })
}

const isTempUrl = (url, folder) => typeof url === 'string' && url.includes(`/${BUCKET}/${folder}/`)

/**
 * Mueve los archivos temporales a la carpeta del evento y devuelve el cover
 * con las URLs nuevas.
 *
 * El movimiento lo hace el backend con la llave de servicio: desde el
 * navegador, ya con sesión, `move` responde "Object not found" porque las
 * políticas del bucket no dejan tocar objetos fuera de la carpeta propia y
 * `temp/` no es de nadie. Si algo falla, la URL temporal se queda como está
 * (sigue sirviendo hasta que el barrido la borre).
 */
export const moveTempFiles = async (cover, folder, invitationID) => {
    let moved = []
    try {
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/storage/adopt-temp`, { folder, invitationID })
        moved = data?.moved ?? []
    } catch (err) {
        console.error('No se pudieron mover los archivos temporales:', err)
        return cover
    }

    if (moved.length === 0) return cover

    const movedFrom = new Set(moved.map((m) => m.from))
    const swap = (url) => {
        if (!isTempUrl(url, folder)) return url
        const path = decodeURIComponent(url.split(`/${BUCKET}/`)[1]?.split('?')[0] ?? '')
        if (!movedFrom.has(path)) return url
        return `${PUBLIC_BASE}${path.replace(`${folder}/`, `${invitationID}/`)}`
    }

    const next = JSON.parse(JSON.stringify(cover))
    if (Array.isArray(next?.image?.prod)) next.image.prod = next.image.prod.map(swap)
    if (next?.song?.previewUrl) next.song.previewUrl = swap(next.song.previewUrl)
    return next
}

/**
 * Eventos a los que se puede colgar el Save the Date.
 *
 * Si la cuenta acaba de nacer hay un solo evento (el que crea el alta) y no
 * hay nada que preguntar. Si la persona ya tenía cuenta, lo más probable es
 * que tenga varios eventos, así que se le pide elegir.
 */
const FRESH_SIGNUP_MS = 5 * 60 * 1000

/**
 * Completa la cuenta (perfil + evento free si no tenía ninguno). Es el mismo
 * endpoint que usa el puente de sesión, así que no se duplican invitaciones.
 */
const ensureAccount = async (user) => {
    try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/ensure-account`, {
            userId: user.id,
            email: user.email ?? '',
            name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        })
    } catch (error) {
        console.error('No se pudo completar la cuenta:', error)
    }
}

export const listAdoptionTargets = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No hay sesión activa')

    await ensureAccount(user)

    const { data: invitations } = await supabase
        .from('invitations')
        .select('id, name, label, event_date, created_at, plan')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    const list = invitations ?? []

    let used = new Set()
    if (list.length > 0) {
        const { data: taken } = await supabase
            .from('save_the_dates')
            .select('invitation_id')
            .in('invitation_id', list.map((i) => i.id))
        used = new Set((taken ?? []).map((r) => String(r.invitation_id)))
    }

    const events = list.map((i) => ({
        id: i.id,
        name: i.name,
        label: i.label,
        eventDate: i.event_date,
        plan: i.plan,
        hasStd: used.has(String(i.id)),
    }))

    // Alta recién hecha: el evento que creó el registro, todavía sin pieza
    const fresh = events.length === 1
        && !events[0].hasStd
        && Date.now() - new Date(list[0].created_at).getTime() < FRESH_SIGNUP_MS

    return { user, events, autoTarget: events.length === 0 ? 'new' : (fresh ? events[0].id : null) }
}

/** Crea una invitación nueva en plan free y devuelve su id. */
export const createFreeInvitation = async (user) => {
    const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/invitation/create-free`, {
        userId: user.id,
        userEmail: user.email ?? '',
        name: user.user_metadata?.full_name || 'Mi evento',
        plan: 'free',
    })
    return data?.id ?? null
}

/**
 * Convierte el borrador en algo real: mueve los archivos temporales a la
 * carpeta del evento y crea la fila de `save_the_dates`. Devuelve el id de la
 * invitación para entrar al dashboard.
 */
export const adoptDraftInto = async (invitationID, { cover, eventDate }) => {
    if (!invitationID) throw new Error('Falta el evento')

    const folder = getTempFolder()
    const finalCover = await moveTempFiles(cover, folder, invitationID)

    const { error } = await supabase
        .from('save_the_dates')
        .upsert(
            { invitation_id: invitationID, cover: finalCover, event_date: eventDate, active: true },
            { onConflict: 'invitation_id' }
        )

    if (error) throw new Error(error.message)

    // La fecha del Save the Date es la del evento mientras no tenga otra
    if (eventDate) {
        await supabase
            .from('invitations')
            .update({ event_date: eventDate })
            .eq('id', invitationID)
            .is('event_date', null)
    }

    clearDraft()
    return invitationID
}
