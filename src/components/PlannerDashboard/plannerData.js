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

export const itineraryOf = (invitation) =>
    (invitation?.data?.itinerary?.object ?? [])
        .filter(item => item?.name?.trim())
        .map(item => ({
            id: item.id,
            name: item.name.trim(),
            time: item.time?.trim() || null,
            place: item.subtext?.trim() || null,
        }))
        .sort((a, b) => minutesOf(a.time) - minutesOf(b.time))

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

// Lo que el planner tendría que atender ya, del más urgente al menos.
export const buildAlerts = (statsList, t) => {
    const alerts = []

    statsList.forEach(s => {
        if (s.daysLeft == null || s.daysLeft < 0) return

        if (s.rsvpDaysLeft != null && s.rsvpDaysLeft >= 0 && s.rsvpDaysLeft <= 7 && s.waiting > 0) {
            alerts.push({ id: `${s.invitation.id}-rsvp`, level: 'high', urgency: s.rsvpDaysLeft, event: s,
                text: s.rsvpDaysLeft === 0
                    ? t('planner.alert_rsvp_today', { guests: s.waiting })
                    : t('planner.alert_rsvp', { count: s.rsvpDaysLeft, guests: s.waiting }) })
        }
        if (s.withoutTable > 0 && s.daysLeft <= 30) {
            alerts.push({ id: `${s.invitation.id}-tables`, level: 'high', urgency: s.daysLeft, event: s,
                text: t('planner.alert_no_table', { count: s.withoutTable }) })
        }
        if (s.notSent > 0 && s.daysLeft <= 60) {
            alerts.push({ id: `${s.invitation.id}-send`, level: 'medium', urgency: s.daysLeft, event: s,
                text: t('planner.alert_not_sent', { count: s.notSent }) })
        }
        if (s.total === 0) {
            alerts.push({ id: `${s.invitation.id}-guests`, level: 'medium', urgency: s.daysLeft, event: s,
                text: t('planner.alert_no_guests') })
        }
        if (s.tables === 0 && s.confirmed > 0) {
            alerts.push({ id: `${s.invitation.id}-map`, level: 'low', urgency: s.daysLeft, event: s,
                text: t('planner.alert_no_tables') })
        }
    })

    const weight = { high: 0, medium: 1, low: 2 }
    return alerts.sort((a, b) => weight[a.level] - weight[b.level] || a.urgency - b.urgency)
}
