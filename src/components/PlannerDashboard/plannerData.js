import dayjs from 'dayjs'
import { supabase } from '../../lib/supabase'

// PostgREST corta en 1000 filas; un planner con varias bodas pasa de eso en
// invitados sin problema, así que se pagina hasta vaciar.
const PAGE = 1000

const fetchAll = async (build) => {
    const rows = []
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await build().range(from, from + PAGE - 1)
        if (error) throw error
        rows.push(...(data ?? []))
        if (!data || data.length < PAGE) return rows
    }
}

export const fetchPlannerData = async (invitationIds) => {
    if (!invitationIds.length) return { guests: [], tables: [], sideEvents: [] }

    const [guests, tables, sideEvents] = await Promise.all([
        fetchAll(() => supabase
            .from('guests')
            .select('invitation_id, state, table, special_needs')
            .in('invitation_id', invitationIds)
            .order('id')),
        fetchAll(() => supabase
            .from('tables')
            .select('invitation_id, size')
            .in('invitation_id', invitationIds)
            .order('id')),
        fetchAll(() => supabase
            .from('side_events')
            .select('id, invitation_id, name, hour:body->>hour')
            .in('invitation_id', invitationIds)
            .order('id')),
    ])

    return { guests, tables, sideEvents }
}

// `event_date` se guarda a medianoche UTC: el día es lo que importa, sin
// convertir a la zona del navegador (si no, en México se recorre un día).
export const eventDay = (invitation) =>
    invitation?.event_date ? String(invitation.event_date).slice(0, 10) : null

export const eventTitle = (invitation) => {
    const owners = (invitation?.owners ?? []).filter(Boolean)
    if (owners.length) return owners.join(' & ')
    return invitation?.data?.cover?.title?.text?.value?.trim() || invitation?.name || 'Evento'
}

// body.hour de side events: "YYYY-MM-DD HH:mm:00" hora de pared (formato
// actual) o un instante UTC legado. Ver helpers/assets/eventDateTime.js.
export const sideEventSlot = (raw) => {
    if (!raw) return null
    const value = String(raw).trim()
    if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(value)) {
        const d = dayjs(value)
        return d.isValid() ? { day: d.format('YYYY-MM-DD'), time: d.format('HH:mm') } : null
    }
    const day = value.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
    return { day, time: value.slice(11, 16) || null }
}

// El itinerario guarda la hora como texto libre ("5:30 pm", "17:00", "9pm").
// Se normaliza a minutos solo para ordenar; se muestra tal cual se escribió.
export const minutesOf = (time) => {
    const match = String(time ?? '').trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?/)
    if (!match) return Number.MAX_SAFE_INTEGER
    let hours = Number(match[1]) % 24
    const minutes = Number(match[2] ?? 0)
    const meridiem = match[3]?.[0]
    if (meridiem === 'p' && hours < 12) hours += 12
    if (meridiem === 'a' && hours === 12) hours = 0
    return hours * 60 + minutes
}

// Lo de la madrugada ("1:00 am" del after) es la misma noche: va al final.
const partyMinutes = (time) => {
    const minutes = minutesOf(time)
    return minutes < 5 * 60 ? minutes + 24 * 60 : minutes
}

export const itineraryOf = (invitation) =>
    (invitation?.data?.itinerary?.object ?? [])
        .filter(item => item?.name?.trim())
        .map(item => ({
            id: item.id,
            name: item.name.trim(),
            time: item.time?.trim() || null,
            place: item.subtext?.trim() || null,
        }))
        .sort((a, b) => partyMinutes(a.time) - partyMinutes(b.time))

const CONFIRMED = new Set(['confirmado', 'asistente'])

// Una fila de `guests` es una persona (los acompañantes son filas propias con
// companion_id), así que contar filas es contar personas.
export const buildStats = (invitation, { guests, tables, sideEvents }, today) => {
    const own = guests.filter(g => g.invitation_id === invitation.id)
    const count = (state) => own.filter(g => g.state === state).length

    const confirmed = own.filter(g => CONFIRMED.has(g.state))
    const declined = count('rechazado')
    const waiting = count('esperando')
    const notSent = count('creado')
    const sent = own.length - notSent

    const ownTables = tables.filter(t => t.invitation_id === invitation.id)
    const capacity = ownTables.reduce((sum, t) => sum + Number(t.size || 0), 0)

    const day = eventDay(invitation)
    const rsvp = invitation.rsvp_deadline ? String(invitation.rsvp_deadline).slice(0, 10) : null

    return {
        invitation,
        title: eventTitle(invitation),
        day,
        daysLeft: day ? dayjs(day).diff(today, 'day') : null,
        rsvp,
        rsvpDaysLeft: rsvp ? dayjs(rsvp).diff(today, 'day') : null,
        total: own.length,
        confirmed: confirmed.length,
        declined,
        waiting,
        notSent,
        responseRate: sent ? Math.round(((confirmed.length + declined) / sent) * 100) : null,
        tables: ownTables.length,
        capacity,
        withoutTable: confirmed.filter(g => g.table == null).length,
        specialNeeds: confirmed.filter(g => String(g.special_needs ?? '').trim()).length,
        // Sin nombre = borrador recién creado ("+ Side event" inserta filas
        // vacías); no es un evento real todavía.
        sideEvents: sideEvents
            .filter(s => s.invitation_id === invitation.id && String(s.name ?? '').trim())
            .map(s => ({ ...s, slot: sideEventSlot(s.hour) })),
        itinerary: itineraryOf(invitation),
    }
}

// Pendientes de un evento, del más grave al menos. Van en la columna
// "Siguiente acción" de la tabla y pintan de rojo su punto en la línea de tiempo.
export const buildPending = (s, t) => {
    const pending = []
    if (s.tables > 0 && s.withoutTable > 0) {
        pending.push({ level: 'critical', text: t('planner.pending_no_table', { count: s.withoutTable }) })
    }
    if (s.tables === 0 && s.confirmed > 0) {
        pending.push({ level: 'critical', text: t('planner.pending_no_tables') })
    }
    if (s.notSent > 0) {
        pending.push({ level: 'warning', text: t('planner.pending_not_sent', { count: s.notSent }) })
    }
    if (s.total === 0) {
        pending.push({ level: 'warning', text: t('planner.pending_no_guests') })
    }
    return pending
}

// Hora de inicio del evento: la primera del itinerario, en HH:mm para ordenar
// la agenda. El itinerario ya viene ordenado por hora.
export const startTimeOf = (s) => {
    const first = s.itinerary.find(item => item.time)
    const minutes = first ? minutesOf(first.time) : Number.MAX_SAFE_INTEGER
    if (minutes === Number.MAX_SAFE_INTEGER) return { time: null, label: null, place: first?.place ?? null }
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0')
    const mm = String(minutes % 60).padStart(2, '0')
    return { time: `${hh}:${mm}`, label: first.time, place: first.place }
}
