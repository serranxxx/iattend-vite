import { useEffect, useState } from 'react'
import { message } from 'antd'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

// Notas y eventos personales del planner: tablas planner_notes y
// planner_agenda_events (iattend--backend/migrations/2026-09-30_create_planner_notes.sql).
// Van directo a Supabase con la sesión; RLS deja a cada planner solo lo suyo.
// Los cambios se pintan antes de que responda la base y se revierten si falla.

const toNote = (row) => ({
    id: row.id,
    text: row.text,
    eventId: row.invitation_id,
    createdAt: row.created_at,
    done: row.done,
})

// `time` llega como "17:30:00"; la agenda trabaja con "17:30".
const toEvent = (row) => ({
    id: row.id,
    title: row.title,
    date: row.date,
    time: row.time ? row.time.slice(0, 5) : '',
    place: row.place ?? '',
})

const tempId = () => `tmp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const usePlannerNotes = (userId) => {
    const { t } = useTranslation()
    const [notes, setNotes] = useState([])
    const [customEvents, setCustomEvents] = useState([])

    useEffect(() => {
        if (!userId) return
        let cancelled = false
        Promise.all([
            supabase.from('planner_notes').select('*').eq('planner_id', userId).order('created_at', { ascending: false }),
            supabase.from('planner_agenda_events').select('*').eq('planner_id', userId).order('date'),
        ]).then(([notesRes, eventsRes]) => {
            if (cancelled) return
            if (notesRes.error || eventsRes.error) {
                console.error('Error al cargar notas/agenda del planner:', notesRes.error || eventsRes.error)
                return
            }
            setNotes(notesRes.data.map(toNote))
            setCustomEvents(eventsRes.data.map(toEvent))
        })
        return () => { cancelled = true }
    }, [userId])

    const fail = (error) => {
        console.error('Error al guardar en el dashboard del planner:', error)
        message.error(t('planner.save_error'))
    }

    const addNote = async (text, eventId) => {
        const temp = { id: tempId(), text, eventId, createdAt: new Date().toISOString(), done: false }
        setNotes(list => [temp, ...list])
        const { data, error } = await supabase.from('planner_notes')
            .insert({ planner_id: userId, invitation_id: eventId, text })
            .select().single()
        if (error) {
            setNotes(list => list.filter(n => n.id !== temp.id))
            return fail(error)
        }
        setNotes(list => list.map(n => (n.id === temp.id ? toNote(data) : n)))
    }

    const toggleNote = async (id) => {
        const note = notes.find(n => n.id === id)
        if (!note || String(id).startsWith('tmp-')) return
        const flip = (list) => list.map(n => (n.id === id ? { ...n, done: !n.done } : n))
        setNotes(flip)
        const { error } = await supabase.from('planner_notes').update({ done: !note.done }).eq('id', id)
        if (error) {
            setNotes(flip)
            fail(error)
        }
    }

    const addCustomEvent = async (event) => {
        const temp = { id: tempId(), ...event }
        setCustomEvents(list => [...list, temp])
        const { data, error } = await supabase.from('planner_agenda_events')
            .insert({ planner_id: userId, title: event.title, date: event.date, time: event.time || null, place: event.place || null })
            .select().single()
        if (error) {
            setCustomEvents(list => list.filter(e => e.id !== temp.id))
            return fail(error)
        }
        setCustomEvents(list => list.map(e => (e.id === temp.id ? toEvent(data) : e)))
    }

    return { notes, customEvents, addNote, toggleNote, addCustomEvent }
}
