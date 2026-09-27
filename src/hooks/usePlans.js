import { useEffect, useState } from 'react'
import axios from 'axios'

// Catálogo de planes (tabla `plans`, editable en Admin → Planes). Reemplaza los
// arrays plan_pro / plan_lite / plan_paperless y los "3 side events" / "300
// créditos" que vivían hardcodeados. Se pide a GET /api/plans y no a Supabase
// directo porque el backend le junta el precio vigente de Stripe.
//
// Lo que incluye el plan se copia a la invitación al crearla
// (`invitations.credits_included`, `invitations.side_events_included`): para
// el tope real de una invitación existente se lee esa columna, no el catálogo.

// Una sola petición compartida por todos los componentes montados.
let pedido = null

const cargarPlanes = () => {
    if (!pedido) {
        pedido = axios
            .get(`${import.meta.env.VITE_API_URL}/api/plans`)
            .then(res => res.data?.plans ?? [])
            .catch(error => {
                pedido = null
                throw error
            })
    }
    return pedido
}

// El admin llama esto después de guardar para que el resto de la app no siga
// mostrando la versión anterior.
export const invalidarPlanes = () => { pedido = null }

export const usePlans = () => {
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        let vivo = true

        cargarPlanes()
            .then(data => { if (vivo) setPlans(data) })
            .catch(error => {
                console.error('Error al obtener el catálogo de planes:', error)
                if (vivo) setFailed(true)
            })
            .finally(() => { if (vivo) setLoading(false) })

        return () => { vivo = false }
    }, [])

    return {
        plans,
        loading,
        failed,
        getPlan: (id) => plans.find(p => p.id === String(id ?? '').toLowerCase()) ?? null,
        plansFor: (surface) => plansFor(plans, surface),
    }
}

// Pantallas donde se puede mostrar un plan; cada una es un interruptor del
// plan en Admin → Planes (`show_landing`, `show_checkout`, `show_app`).
export const PLAN_SURFACES = [
    { key: 'landing', label: 'Landing' },
    { key: 'checkout', label: 'Checkout' },
    { key: 'app', label: 'Selector en la app' },
]

// Planes que se venden en una pantalla, en el orden del catálogo. Sin price de
// Stripe no hay cómo cobrarlo, así que tampoco se ofrece.
export const plansFor = (plans, surface) =>
    (plans ?? [])
        .filter(p => p[`show_${surface}`] && p.stripe_price_id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

// Grupos del checklist del checkout, en orden.
export const PLAN_FEATURE_GROUPS = [
    { key: 'invitation', label: 'Tu invitación' },
    { key: 'event', label: 'Gestión del evento' },
]

const MARCADORES = {
    '{credits}': plan => plan?.credits_included ?? 0,
    '{side_events}': plan => plan?.side_events_included ?? 0,
}

// Sustituye {credits} / {side_events} con los números del plan. Devuelve null
// si la línea usa un marcador que vale 0: "0 Side event" no se muestra, se
// oculta. Así un plan que deja de incluir algo lo pierde de todas las
// pantallas sin editar el texto.
export const planText = (plan, text) => {
    let resultado = String(text ?? '')
    for (const [marcador, valor] of Object.entries(MARCADORES)) {
        if (!resultado.includes(marcador)) continue
        const n = valor(plan)
        if (!n) return null
        resultado = resultado.replaceAll(marcador, n)
    }
    return resultado.trim() ? resultado : null
}

// Texto de una feature en el idioma activo (null si queda oculta).
export const featureText = (plan, feature, language = 'es') => {
    const base = String(language).startsWith('en') ? (feature?.en || feature?.es) : feature?.es
    return planText(plan, base)
}

// Features visibles del plan, opcionalmente de un solo grupo, ya con texto.
export const planFeatures = (plan, { group, language = 'es' } = {}) =>
    (plan?.features ?? [])
        .filter(f => !group || (f.group ?? 'event') === group)
        .map(f => ({ ...f, text: featureText(plan, f, language) }))
        .filter(f => f.text)

// "Y además incluye" de la landing, ya con texto.
export const planHighlights = (plan) =>
    (plan?.highlights ?? [])
        .map(h => ({ title: planText(plan, h.title), note: planText(plan, h.note) ?? '' }))
        .filter(h => h.title)

// Descripción de la landing partida en trozos: los [texto](/ruta) salen como
// { text, href } para pintarlos como link.
export const descriptionSegments = (text) => {
    const segmentos = []
    const patron = /\[([^\]]+)\]\(([^)\s]+)\)/g
    let ultimo = 0
    let m
    const fuente = String(text ?? '')
    while ((m = patron.exec(fuente))) {
        if (m.index > ultimo) segmentos.push({ text: fuente.slice(ultimo, m.index) })
        segmentos.push({ text: m[1], href: m[2] })
        ultimo = m.index + m[0].length
    }
    if (ultimo < fuente.length) segmentos.push({ text: fuente.slice(ultimo) })
    return segmentos
}
