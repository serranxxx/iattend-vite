import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL
const STORAGE_KEY = 'vendor_session'

export const getVendorSession = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY))
    } catch {
        return null
    }
}

export const setVendorSession = (session) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export const clearVendorSession = () => {
    localStorage.removeItem(STORAGE_KEY)
}

export const isVendorSessionValid = (session) => {
    if (!session?.token) return false
    try {
        const payload = JSON.parse(atob(session.token.split('.')[1]))
        return payload.exp * 1000 > Date.now()
    } catch {
        return false
    }
}

const vendorHeaders = () => {
    const session = getVendorSession()
    return session?.token ? { 'vendor-token': session.token } : {}
}

export const loginVendedor = (codigo_acceso) =>
    axios.post(`${API_URL}/api/vendedores/login`, { codigo_acceso })

export const fetchMiResumen = () =>
    axios.get(`${API_URL}/api/vendedores/me/resumen`, { headers: vendorHeaders() })

export const fetchMisVentas = () =>
    axios.get(`${API_URL}/api/vendedores/me/ventas`, { headers: vendorHeaders() })

export const checkUrlDisponible = (url) =>
    axios.get(`${API_URL}/api/ventas/check-url`, { params: { url } })

export const checkCliente = (correo) =>
    axios.get(`${API_URL}/api/ventas/check-cliente`, { params: { correo }, headers: vendorHeaders() })

export const buscarClientes = (q) =>
    axios.get(`${API_URL}/api/ventas/clientes`, { params: { q }, headers: vendorHeaders() })

export const crearVenta = (payload) =>
    axios.post(`${API_URL}/api/ventas`, payload, { headers: vendorHeaders() })

export const registrarPago = (payload) =>
    axios.post(`${API_URL}/api/pagos`, payload, { headers: vendorHeaders() })

export const fetchHistorialPagos = (ventaId) =>
    axios.get(`${API_URL}/api/pagos`, { params: { venta_id: ventaId }, headers: vendorHeaders() })

export const subirComprobante = (pagoId, file) => {
    const formData = new FormData()
    formData.append('archivo', file)
    return axios.post(`${API_URL}/api/pagos/${pagoId}/comprobante`, formData, {
        headers: vendorHeaders(),
    })
}

export const fetchConfiguracionPagos = () =>
    axios.get(`${API_URL}/api/configuracion-pagos`, { headers: vendorHeaders() })
