import axios from 'axios'
import { supabase } from '../../lib/supabase'
import { supabaseAuthHeaders } from '../../lib/authHeaders'

// Guarda name / url_image / body de un side event o Pop por el backend
// (iattend--backend/router/sideEventGuardar.js), que valida lo que se guarda
// (planes de Pops, docs/editor-pops-planes-paso0.md). Ya no se escribe directo
// a side_events con la anon key.
//
// Respaldo temporal: si el backend todavía no tiene la ruta (404 de Express,
// sin JSON), se guarda directo como antes. Quitarlo cuando corra
// iattend--backend/migrations/2026-11-23d_side_events_guardar_backend.sql.
//
// → { error } (null si se guardó).
export const guardarCamposSideEvent = async (id, cambios) => {
    try {
        await axios.post(
            `${import.meta.env.VITE_API_URL}/api/side-events/${id}/guardar`,
            { cambios },
            { headers: await supabaseAuthHeaders() },
        )
        return { error: null }
    } catch (e) {
        const res = e?.response
        const sinRuta = res?.status === 404 && typeof res.data?.ok !== 'boolean'
        if (!sinRuta) return { error: res?.data ?? e }
        const { error } = await supabase.from('side_events').update(cambios).eq('id', id)
        return { error }
    }
}
