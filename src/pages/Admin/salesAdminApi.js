import axios from 'axios'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL

const authHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

export const fetchAdminVentas = async (params) => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/ventas`, { headers, params })
}

export const updateAdminVenta = async (ventaId, payload) => {
    const headers = await authHeaders()
    return axios.patch(`${API_URL}/api/admin/ventas/${ventaId}`, payload, { headers })
}

export const fetchAdminPagosPendientes = async () => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/pagos`, { headers })
}

export const fetchAdminVendedores = async () => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/vendedores`, { headers })
}

export const createAdminVendedor = async (payload) => {
    const headers = await authHeaders()
    return axios.post(`${API_URL}/api/admin/vendedores`, payload, { headers })
}

export const searchAdminInvitations = async (q) => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/invitaciones-disponibles`, { headers, params: { q } })
}

export const createAdminVentaManual = async (payload) => {
    const headers = await authHeaders()
    return axios.post(`${API_URL}/api/admin/ventas`, payload, { headers })
}

export const registrarAdminPago = async (payload) => {
    const headers = await authHeaders()
    return axios.post(`${API_URL}/api/pagos`, payload, { headers })
}

export const subirAdminComprobante = async (pagoId, file) => {
    const headers = await authHeaders()
    const formData = new FormData()
    formData.append('archivo', file)
    return axios.post(`${API_URL}/api/pagos/${pagoId}/comprobante`, formData, { headers })
}
