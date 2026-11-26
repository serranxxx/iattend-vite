import { useState } from 'react'
import axios from 'axios'
import { message } from 'antd'
import { useTranslation } from 'react-i18next'
import { supabaseAuthHeaders } from '../../../lib/authHeaders'
import { markPendingPlan } from '../../../components/Payment/functions'
import { upgradeDe } from './planesUpsell'

/*
  "Mejorar a Lite / PRO" del upsell: va directo al checkout de Stripe con el
  precio de upgrade (pagas solo la diferencia). No se usan Payment Links: el
  webhook necesita el id de la invitación en la metadata de la Checkout
  Session para cambiarle el plan (activatePlan). Al volver, DashboardPage
  sondea hasta ver el plan nuevo (markPendingPlan).

  const { ir, yendo } = useMejorarPlan(plan, invitationId)
  ir('lite' | 'pro') · yendo = el destino mientras abre el pago, o null.
*/
export const useMejorarPlan = (plan, invitationId) => {
    const { t } = useTranslation()
    const [yendo, setYendo] = useState(null)

    const ir = async (destino) => {
        const up = upgradeDe(plan, destino)
        if (!up?.priceId || !invitationId || yendo) return
        setYendo(destino)
        try {
            markPendingPlan(invitationId, destino)
            const { data } = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/payment/create-checkout`,
                { invitationId, priceId: up.priceId },
                { headers: await supabaseAuthHeaders() },
            )
            if (!data?.url) throw new Error('sin url')
            window.location.href = data.url
            // La página se va a Stripe: el botón se queda en "Abriendo pago…".
        } catch (error) {
            setYendo(null)
            message.error(error?.response?.data?.error || t('upsell.checkout_error'))
        }
    }

    return { ir, yendo }
}

export default useMejorarPlan
