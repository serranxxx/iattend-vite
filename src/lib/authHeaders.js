import { supabase } from './supabase'

// Header con la sesión de Supabase para el backend. Lo mandan los checkouts
// para que el backend reconozca a un planner y aplique su descuento
// (iattend--backend/helpers/plannerBenefits.js); sin sesión va vacío.
export const supabaseAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
}
