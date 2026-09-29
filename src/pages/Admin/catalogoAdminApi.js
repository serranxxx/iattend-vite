import axios from 'axios'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL

const authHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

export const fetchAdminInvitaciones = async (params) => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/invitaciones`, { headers, params })
}

export const fetchAdminInvitacionData = async (invitationId) => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/invitaciones/${invitationId}/data`, { headers })
}

// planner_id null quita el planner del evento.
export const asignarPlannerAdmin = async (invitationId, plannerId) => {
    const headers = await authHeaders()
    return axios.patch(
        `${API_URL}/api/admin/invitaciones/${invitationId}/planner`,
        { planner_id: plannerId },
        { headers }
    )
}

// Recarga manual de créditos I attend; el backend la deja pasar solo a admins.
export const actualizarCreditosAdmin = async (invitationId, credits) => {
    const headers = await authHeaders()
    return axios.patch(
        `${API_URL}/api/invitation/update-credits`,
        { id: invitationId, credits },
        { headers }
    )
}

// Tablas de Lia para la analítica (ai_conversations, ai_agent_logs,
// ai_daily_usage). Ya no se leen con la anon key: pasan por el backend.
// `tablas`: 'conversaciones', 'logs' y/o 'uso'.
export const fetchDatosLiaAdmin = async (tablas) => {
    const headers = await authHeaders()
    const { data } = await axios.get(`${API_URL}/api/admin/lia/datos`, {
        headers,
        params: { tablas: tablas.join(',') },
    })
    return data
}
