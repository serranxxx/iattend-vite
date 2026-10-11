import axios from 'axios'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL

const authHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// Solo nombre y rol: el correo no se edita desde el admin.
export const updateUsuario = async (userId, payload) => {
    const headers = await authHeaders()
    return axios.patch(`${API_URL}/api/admin/usuarios/${userId}`, payload, { headers })
}

// Cómo entra cada cuenta: { [user_id]: ['google' | 'apple' | 'email', …] }.
export const fetchProveedores = async () => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/usuarios/proveedores`, { headers })
}

// Beneficios de planners: { beneficios: { [user_id]: { free_events, discount_pct } },
// usados: { [user_id]: { gratis, compra } } }. Ver iattend--backend/controllers/planner.js.
export const fetchBeneficiosPlanners = async () => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/planners/beneficios`, { headers })
}

export const updateBeneficiosPlanner = async (userId, payload) => {
    const headers = await authHeaders()
    return axios.put(`${API_URL}/api/admin/planners/${userId}/beneficios`, payload, { headers })
}

// Alta de un planner: cuenta, 1 evento regular y 1 Flash gratis, su invitación
// de ejemplo y (opcional) el correo de bienvenida. Ver adminUsuarios.js → crearPlanner.
export const crearPlanner = async (payload) => {
    const headers = await authHeaders()
    return axios.post(`${API_URL}/api/admin/planners`, payload, { headers })
}
