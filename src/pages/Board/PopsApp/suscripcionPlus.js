import { useEffect, useState } from 'react'
import axios from 'axios'
import { supabase } from '../../../lib/supabase'
import { supabaseAuthHeaders } from '../../../lib/authHeaders'

/*
  Pops+ de la cuenta, para usar fuera de PopsApp (p. ej. el flujo de crear
  un Pop). Misma regla que usePlanPops / `pops_plan_de`: Administración
  siempre es Plus; si no, la fila propia de `pops_suscripciones` vigente.
  En desarrollo, `?free=1` la enseña Free.
*/

export const VIGENTE = ['active', 'trialing', 'past_due']

const forzarFree = () => import.meta.env.DEV && new URLSearchParams(window.location.search).get('free') === '1'

/** true / false, o null mientras carga. */
export const useCuentaPlus = () => {
    const [plus, setPlus] = useState(null)
    useEffect(() => {
        let vivo = true
        ;(async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { if (vivo) setPlus(false); return }
                const [{ data: perfil }, { data: sub }] = await Promise.all([
                    supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle(),
                    supabase.from('pops_suscripciones').select('plan, status').eq('user_id', user.id).maybeSingle(),
                ])
                const es = perfil?.role === 'Administration' || (sub?.plan === 'plus' && VIGENTE.includes(sub?.status))
                if (vivo) setPlus(!forzarFree() && es)
            } catch {
                if (vivo) setPlus(false)
            }
        })()
        return () => { vivo = false }
    }, [])
    return plus
}

/**
 * Pide al backend la Checkout Session de Pops+ (o el portal) y redirige a
 * Stripe. Lanza el error con su `code` (YA_PLUS, SIN_SUSCRIPCION…) para que
 * quien llama enseñe el mensaje.
 */
export const irAStripePlus = async (ruta = 'checkout') => {
    const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/pops/suscripcion/${ruta}`,
        { origin: window.location.origin },
        { headers: await supabaseAuthHeaders() },
    )
    if (!data?.url) throw new Error('sin url')
    window.location.href = data.url
}
