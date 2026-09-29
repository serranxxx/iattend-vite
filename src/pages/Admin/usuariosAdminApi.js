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
