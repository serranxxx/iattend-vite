import axios from 'axios'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL

const authHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

export const fetchOnboardingSlides = async () => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/onboarding-slides`, { headers })
}

export const createOnboardingSlide = async (payload) => {
    const headers = await authHeaders()
    return axios.post(`${API_URL}/api/admin/onboarding-slides`, payload, { headers })
}

export const updateOnboardingSlide = async (id, payload) => {
    const headers = await authHeaders()
    return axios.patch(`${API_URL}/api/admin/onboarding-slides/${id}`, payload, { headers })
}

export const deleteOnboardingSlide = async (id) => {
    const headers = await authHeaders()
    return axios.delete(`${API_URL}/api/admin/onboarding-slides/${id}`, { headers })
}

export const reorderOnboardingSlides = async (ids) => {
    const headers = await authHeaders()
    return axios.post(`${API_URL}/api/admin/onboarding-slides/reorder`, { ids }, { headers })
}
