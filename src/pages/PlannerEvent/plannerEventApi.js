import axios from 'axios'
import { supabaseAuthHeaders } from '../../lib/authHeaders'

// Rutas del planner en el backend (iattend--backend/router/planner.js): piden
// la sesión de Supabase y que la cuenta sea planner.
const API_URL = import.meta.env.VITE_API_URL

export const fetchBeneficios = async () =>
    axios.get(`${API_URL}/api/planner/beneficios`, { headers: await supabaseAuthHeaders() })

// Evento gratis (siempre PRO): se crea al momento.
export const crearEventoGratis = async (payload) =>
    axios.post(`${API_URL}/api/planner/eventos`, payload, { headers: await supabaseAuthHeaders() })

// Compra: devuelve la url de Stripe; el evento lo crea el webhook al pagar.
export const checkoutEvento = async (payload) =>
    axios.post(`${API_URL}/api/planner/eventos/checkout`, payload, { headers: await supabaseAuthHeaders() })

// ── Eventos Flash (side events sin invitación) ──

export const fetchPrecioFlash = async () =>
    axios.get(`${API_URL}/api/planner/flash/precio`, { headers: await supabaseAuthHeaders() })

export const crearFlashGratis = async (payload) =>
    axios.post(`${API_URL}/api/planner/flash`, payload, { headers: await supabaseAuthHeaders() })

export const checkoutFlash = async (payload) =>
    axios.post(`${API_URL}/api/planner/flash/checkout`, payload, { headers: await supabaseAuthHeaders() })

export const asignarClienteFlash = async (sideEventId, payload) =>
    axios.post(`${API_URL}/api/planner/flash/${sideEventId}/cliente`, payload, { headers: await supabaseAuthHeaders() })

// Manda al cliente un evento creado "para enviar después": crea su cuenta y la
// asigna a la invitación que ya existe.
export const asignarCliente = async (invitationId, payload) =>
    axios.post(`${API_URL}/api/planner/eventos/${invitationId}/cliente`, payload, { headers: await supabaseAuthHeaders() })
