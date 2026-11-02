import { supabase } from '../../lib/supabase'
import { urlSide } from './sideEventLink'

// Pops: side events sin invitación (invitation_id vacío) de un
// planner o asignados a un cliente. Ver iattend--backend/helpers/popEvent.js
// y la migración 2026-10-10d_eventos_flash.sql.

// Recibe la fila del Pop (usa su código público; ver sideEventLink.js).
export const POP_PUBLIC_URL = (pop) => urlSide(pop)

/**
 * Pops de la cuenta: los que organiza (planner_id) o los que son
 * suyos (user_id). Si la migración todavía no corrió, regresa [] sin romper.
 */
export const fetchPopEvents = async (uid, { esPlanner = false } = {}) => {
    let query = supabase.from('side_events').select('*').is('invitation_id', null)
    query = esPlanner ? query.or(`user_id.eq.${uid},planner_id.eq.${uid}`) : query.eq('user_id', uid)
    const { data, error } = await query
    if (error) {
        console.warn('No se pudieron cargar los Pops:', error.message)
        return []
    }
    return data ?? []
}

/**
 * Lo adapta a la forma de una invitación para reutilizar la tarjeta de
 * /invitations (`_pop` guarda la fila original). El id lleva prefijo para no
 * chocar con los uuid de las invitaciones.
 */
export const popComoInvitacion = (se) => ({
    id: `flash-${se.id}`,
    _pop: se,
    user_id: se.user_id,
    user_email: se.user_email,
    planner_id: se.planner_id,
    is_test: se.is_test,
    active: true,
    plan: 'flash',
    name: se.name,
    event_date: se.body?.hour ? String(se.body.hour).slice(0, 10) : null,
    data: {
        cover: {
            // La imagen del link (la de WhatsApp, puede venir de "Crear desde
            // mi diseño" con los stickers) manda; la portada es el respaldo.
            image: { prod: se.url_image || se.body?.image || null },
            title: { text: { value: se.name || '' } },
        },
    },
})
