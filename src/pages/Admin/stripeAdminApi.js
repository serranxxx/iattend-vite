import axios from 'axios'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL

const authHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// Solo lectura y solo el dueño (validarDuenio en el backend).
export const fetchStripeResumen = async () => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/stripe/resumen`, { headers })
}

export const fetchStripeComisiones = async ({ anio, mes }) => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/stripe/comisiones`, { headers, params: { anio, mes } })
}
