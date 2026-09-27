import axios from 'axios'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL

const authHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

export const fetchAdminPlans = async () => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/plans`, { headers })
}

export const updatePlan = async (planId, payload) => {
    const headers = await authHeaders()
    return axios.patch(`${API_URL}/api/admin/plans/${planId}`, payload, { headers })
}
