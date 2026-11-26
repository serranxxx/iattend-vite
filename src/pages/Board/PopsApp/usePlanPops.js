import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { MB } from '../../../helpers/services/storageQuota'
import { pruebaSimulada, useVistaPlanAdmin } from './vistaPlanAdmin'

/*
  Plan de Pops de la cuenta (handoff "App de Pops"): Free ($0) o Pops+.
  · Plan: la fila propia de `pops_suscripciones` (sin fila = Free; la escribe
    el webhook de Stripe). Administración siempre es Plus, como
    `pops_plan_de` en la base. Sin la tabla (migración sin correr), Free.
  · Pops activos (Free: 3): los que tienen al menos un invitado y no están
    archivados, la misma regla del trigger de `side_events_guests`
    (migración 2026-11-23c). Pendiente §0.2 del handoff.
  · Espacio: la suma de `pop_storage_usage` de sus Pops; tope de la cuenta
    50 MB en Free y 500 MB en Pops+ (todavía no se cobra por cuenta).
*/

export const TOPE_POPS_FREE = 3
// Personas por Pop en Free (trigger pops_limite_invitados, migración 2026-11-23c).
export const PERSONAS_FREE = 30
export const MB_FREE = 50
export const MB_PLUS = 500
export const PRECIO_PLUS = 259
const VIGENTE = ['active', 'trialing', 'past_due']

export const usePlanPops = ({ user, pops = [], confirmados = {} }) => {
    const [suscripcion, setSuscripcion] = useState(null)
    const [bytes, setBytes] = useState(null)
    const ids = pops.map(p => p._pop?.id).filter(Boolean)
    const clave = ids.join(',')

    useEffect(() => {
        if (!user?.uid) return undefined
        let vivo = true
        let timer = null
        // Al volver de Stripe (`?plus=ok`) el webhook puede tardar unos
        // segundos: se vuelve a leer cada 2 s (hasta 8 veces) mientras no sea Plus.
        let intentos = new URLSearchParams(window.location.search).get('plus') === 'ok' ? 8 : 0
        const leer = () => supabase.from('pops_suscripciones')
            .select('plan, status, current_period_end, cancel_at_period_end, stripe_subscription_id')
            .eq('user_id', user.uid)
            .maybeSingle()
            .then(({ data, error }) => {
                if (!vivo) return
                setSuscripcion(error ? null : data)
                // (Una prueba gratis de Admin cuenta como "ya llegó": el pago la pisa
                // con status active; aquí basta con dejar de reintentar al ser Plus.)
                if (intentos-- > 0 && !(data?.plan === 'plus' && VIGENTE.includes(data?.status) && data?.stripe_subscription_id)) timer = setTimeout(leer, 2000)
            })
        leer()
        return () => { vivo = false; clearTimeout(timer) }
    }, [user?.uid])

    useEffect(() => {
        if (!ids.length) { setBytes(0); return undefined }
        let vivo = true
        Promise.all(ids.map(id => supabase.rpc('pop_storage_usage', { p_side_event_id: Number(id) })))
            .then(res => { if (vivo) setBytes(res.reduce((s, r) => s + (r.error ? 0 : Number(r.data) || 0), 0)) })
            .catch(() => { if (vivo) setBytes(0) })
        return () => { vivo = false }
    }, [clave])

    // En desarrollo, `?free=1` enseña la cuenta como Free (como en el editor).
    // Administración: "Ver como" Free · Plus · Try (vistaPlanAdmin.js).
    const vista = useVistaPlanAdmin()
    const forzarFree = vista === 'free' || (import.meta.env.DEV && new URLSearchParams(window.location.search).get('free') === '1')
    const vigente = suscripcion?.plan === 'plus' && VIGENTE.includes(suscripcion?.status)
        && (!suscripcion?.current_period_end || Date.parse(suscripcion.current_period_end) > Date.now())
    const plus = !forzarFree && (user?.role === 'Administration' || vigente)
    // Prueba gratis que da Admin (trialing sin suscripción de Stripe).
    const pruebaReal = !forzarFree && vigente && suscripcion.status === 'trialing' && !suscripcion.stripe_subscription_id
        ? { vence: suscripcion.current_period_end, dias: Math.ceil((Date.parse(suscripcion.current_period_end) - Date.now()) / 86400000) }
        : null
    const prueba = vista === 'try' ? pruebaSimulada() : vista === 'plus' ? null : pruebaReal
    const listaActivos = pops.filter(p => !p._pop?.archived_at && (confirmados[p._pop?.id]?.total ?? 0) > 0)
    const activos = listaActivos.length
    const mbUsados = bytes == null ? 0 : Math.round((bytes / MB) * 10) / 10
    const mbTope = plus ? MB_PLUS : MB_FREE

    return {
        plus,
        prueba,
        renovacion: suscripcion?.current_period_end ?? null,
        cancelada: Boolean(suscripcion?.cancel_at_period_end),
        activos,
        // Los Pops activos (para dibujar sus lugares: ChipPlan, LugaresGratis).
        listaActivos,
        tope: TOPE_POPS_FREE,
        enLimite: !plus && activos >= TOPE_POPS_FREE,
        mbUsados,
        mbTope,
        bytes: bytes ?? 0,
        // Ids de los Pops de la cuenta (para el desglose del espacio).
        idsPops: ids,
        espacioCasiLleno: !plus && mbUsados / mbTope >= 0.9,
    }
}
