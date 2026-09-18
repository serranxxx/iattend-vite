import axios from 'axios'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL

const authHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

export const fetchGiftBrands = async () => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/gift-brands`, { headers })
}

export const createGiftBrand = async (payload) => {
    const headers = await authHeaders()
    return axios.post(`${API_URL}/api/admin/gift-brands`, payload, { headers })
}

export const updateGiftBrand = async (brandId, payload) => {
    const headers = await authHeaders()
    return axios.patch(`${API_URL}/api/admin/gift-brands/${brandId}`, payload, { headers })
}

export const deleteGiftBrand = async (brandId) => {
    const headers = await authHeaders()
    return axios.delete(`${API_URL}/api/admin/gift-brands/${brandId}`, { headers })
}
