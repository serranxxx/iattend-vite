import axios from 'axios'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL

const authHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// Un concepto es fijo (monto del mes) o por venta (costo unitario que escala con
// las invitaciones vendidas, ej. MetaAPI a $60 por invitación).
export const esPorVenta = (concepto) => concepto?.tipo === 'por_venta'

export const montoFijo = (gastos) =>
    (gastos?.conceptos ?? [])
        .filter(c => !esPorVenta(c))
        .reduce((acc, c) => acc + Number(c?.monto || 0), 0)

// Costo unitario total: lo que cuesta cada invitación vendida.
export const costoPorVenta = (gastos) =>
    (gastos?.conceptos ?? [])
        .filter(esPorVenta)
        .reduce((acc, c) => acc + Number(c?.monto || 0), 0)

// La meta del mes: los gastos fijos más lo que ya devengaron los costos
// variables con las ventas del mes. Ojo: con costos por venta la meta se mueve
// conforme se vende, no es un número estático.
export const sumarMeta = (gastos, ventasDelMes = 0) =>
    montoFijo(gastos) + costoPorVenta(gastos) * ventasDelMes

// Cuántas ventas MÁS hacen falta para cubrir la meta.
//
// Dos cosas que hay que tener presentes:
//  1. Se mide contra lo que falta, no contra el total. Antes devolvía el
//     equilibrio desde cero e ignoraba lo ya vendido, así que con 4 ventas
//     hechas seguía pidiendo 7 en vez de 3.
//  2. Cada venta nueva sube la meta por su costo variable, así que lo que cierra
//     la brecha es el margen de contribución (neto − costo por venta), no el
//     neto completo. Despejando:
//       ingreso + N·neto ≥ meta + N·variable  →  N ≥ faltante / (neto − variable)
export const ventasQueFaltan = (gastos, netoVenta, faltante) => {
    if (faltante <= 0) return 0
    const contribucion = Number(netoVenta || 0) - costoPorVenta(gastos)
    if (contribucion <= 0) return null
    return Math.ceil(faltante / contribucion)
}

export const fetchGastosFijos = async ({ anio, mes }) => {
    const headers = await authHeaders()
    return axios.get(`${API_URL}/api/admin/gastos-fijos`, { headers, params: { anio, mes } })
}

export const guardarGastosFijos = async (payload) => {
    const headers = await authHeaders()
    return axios.put(`${API_URL}/api/admin/gastos-fijos`, payload, { headers })
}
