import axios from 'axios'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL

const authHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

export const fetchProspectos = async () => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/prospectos`, { headers })
}

export const fetchMisProspectos = async () => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/prospectos/mis-prospectos`, { headers })
}

export const asignarVendedor = async (id, vendedorId, notificar) => {
    const headers = await authHeaders()
    return axios.patch(`${API_URL}/api/prospectos/${id}/asignar`, { vendedor_id: vendedorId, notificar }, { headers })
}

export const actualizarEstadoProspecto = async (id, estado, motivoFinalizado) => {
    const headers = await authHeaders()
    return axios.patch(`${API_URL}/api/prospectos/${id}/estado`, { estado, motivo_finalizado: motivoFinalizado }, { headers })
}

// PATCH genérico — acepta cualquier combinación de { notas, favorito, email, telefono, post_contexto, nivel_interes }
export const actualizarProspecto = async (id, patch) => {
    const headers = await authHeaders()
    return axios.patch(`${API_URL}/api/prospectos/${id}`, patch, { headers })
}

export const solicitarActivacionProspecto = async (id) => {
    const headers = await authHeaders()
    return axios.post(`${API_URL}/api/prospectos/${id}/solicitar-activacion`, {}, { headers })
}
