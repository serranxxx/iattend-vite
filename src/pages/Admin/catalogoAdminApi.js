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
