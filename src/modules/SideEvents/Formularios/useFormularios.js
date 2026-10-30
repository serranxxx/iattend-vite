import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { supabase } from '../../../lib/supabase'
import { supabaseAuthHeaders } from '../../../lib/authHeaders'

/*
  Datos de los formularios de un Flash:
  · useMisFormularios — "Mis formularios" del organizador, directo a Supabase
    con su sesión (tabla forms, RLS por dueño; migración
    iattend--backend/migrations/2026-10-30_forms.sql). Cuenta en cuántos
    Flash se usa cada uno (side_events.body.form.formId).
  · useRespuestasFormulario — las respuestas del Flash, por el backend con la
    sesión (datos personales: side_event_form_responses no se lee con la anon
    key) y al día con el aviso sin contenido del canal side_form_<id>.
*/

const API = import.meta.env.VITE_API_URL
const CAMPOS = 'id, title, description, items, updated_at, created_at'

// Lista compartida entre el panel y la vista completa (una sola carga por sesión de editor).
let cache = null
const oyentes = new Set()
const publicar = (lista) => { cache = lista; oyentes.forEach((fn) => fn(lista)) }

export const useMisFormularios = () => {
    const [formularios, setFormularios] = useState(cache)
    const [usos, setUsos] = useState({})
    const [error, setError] = useState(null)

    const cargar = useCallback(async () => {
        const { data, error: e } = await supabase.from('forms').select(CAMPOS).order('updated_at', { ascending: false })
        if (e) { setError(e); publicar(cache ?? []); return }
        publicar(data ?? [])
        const ids = (data ?? []).map((f) => f.id)
        if (!ids.length) { setUsos({}); return }
        const { data: eventos } = await supabase.from('side_events').select('id, formId:body->form->>formId').in('body->form->>formId', ids)
        const cuenta = {}
        for (const ev of eventos ?? []) if (ev.formId) cuenta[ev.formId] = (cuenta[ev.formId] ?? 0) + 1
        setUsos(cuenta)
    }, [])

    useEffect(() => {
        oyentes.add(setFormularios)
        if (cache === null) cargar()
        return () => { oyentes.delete(setFormularios) }
    }, [cargar])

    const crear = useCallback(async (inicial) => {
        const { data, error: e } = await supabase.from('forms').insert(inicial).select(CAMPOS).single()
        if (e) throw e
        publicar([data, ...(cache ?? [])])
        return data
    }, [])

    // Cambio local inmediato (la lista se ve al día) + guardado aparte con `guardar`.
    const cambiarLocal = useCallback((id, patch) => {
        publicar((cache ?? []).map((f) => (f.id === id ? { ...f, ...patch } : f)))
    }, [])

    const guardar = useCallback(async (id, patch) => {
        const updated_at = new Date().toISOString()
        const { error: e } = await supabase.from('forms').update({ ...patch, updated_at }).eq('id', id)
        if (e) throw e
        const resto = (cache ?? []).filter((f) => f.id !== id)
        const actual = (cache ?? []).find((f) => f.id === id)
        if (actual) publicar([{ ...actual, ...patch, updated_at }, ...resto])
    }, [])

    return { formularios, usos, error, cargar, crear, cambiarLocal, guardar }
}

// Respuestas del Flash (lista para el panel, la tabla y la descarga).
export const useRespuestasFormulario = (eventoId, activo) => {
    const [respuestas, setRespuestas] = useState(null)
    const vivo = useRef(true)
    const cargar = useCallback(async () => {
        if (!eventoId) return
        try {
            const { data } = await axios.get(`${API}/api/side-events/${eventoId}/registro-respuestas`, { headers: await supabaseAuthHeaders() })
            if (vivo.current) setRespuestas(data.respuestas ?? [])
        } catch {
            if (vivo.current) setRespuestas((prev) => prev ?? [])
        }
    }, [eventoId])

    useEffect(() => {
        vivo.current = true
        if (!activo || !eventoId) return () => { vivo.current = false }
        cargar()
        const canal = supabase.channel(`side_form_${eventoId}`)
            .on('broadcast', { event: 'cambio' }, () => cargar())
            .subscribe()
        return () => { vivo.current = false; supabase.removeChannel(canal) }
    }, [activo, eventoId, cargar])

    return { respuestas, cargar }
}
