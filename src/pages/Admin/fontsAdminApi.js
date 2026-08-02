import axios from 'axios'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL

const authHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

export const fetchAdminFonts = async () => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/fonts`, { headers })
}

export const installAdminFont = async (payload) => {
    const headers = await authHeaders()
    return axios.post(`${API_URL}/api/admin/fonts`, payload, { headers })
}

export const updateAdminFont = async (fontId, payload) => {
    const headers = await authHeaders()
    return axios.patch(`${API_URL}/api/admin/fonts/${fontId}`, payload, { headers })
}

export const searchGoogleFonts = async (q) => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/fonts/google-search`, { headers, params: { q } })
}

export const browseGoogleFonts = async ({ q, page = 1, pageSize = 20, categories = [] } = {}) => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/fonts/google-search`, { headers, params: { q, page, pageSize, category: categories.join(',') } })
}
