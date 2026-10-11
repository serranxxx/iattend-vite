import React, { useEffect, useState } from 'react'
import { CreditsComponent } from '../Credits/Credits'
import { CreditsMobile } from '../Credits/CreditsMobile'
import './credit-controller.css'
import { supabase } from '../../../lib/supabase'
import { Button, Dropdown } from 'antd'
import { Coins, Plus } from 'lucide-react'
import { FaPaperPlane } from 'react-icons/fa'
import { useLia } from '../../../context/LiaContext'
import { useTranslation } from 'react-i18next'
import { useDashboardRealtime } from '../../../context/DashboardRealtimeContext'

// `flash`: créditos de un Evento Flash (side_events.credits, id del side
// event) en vez de los de una invitación; el "+" compra para ese evento.
export const CreditController = ({ id, mobile, flash = false }) => {
    const [credits, setCredits] = useState(null)
    const [mobileOpen, setMobileOpen] = useState(false)
    const { creditState, creditAmount, creditSendingLabel } = useLia()
    const { t } = useTranslation()
    const { subscribe } = useDashboardRealtime()

    const getCredits = async () => {
        const { data, error } = await supabase
            .from(flash ? "side_events" : "invitations")
            .select("credits")
            .eq("id", id)
            .maybeSingle();
        if (error) console.error("Error al obtener créditos:", error)
        else setCredits(data?.credits ?? 0)
    }

    useEffect(() => { getCredits() }, [])

    useEffect(() => {
        if (creditState === 'bubble') getCredits()
    }, [creditState])

    // En tiempo real: cualquier descuento hecho fuera de este componente
    // (ej. agregar un idioma extra en iattend-events) actualiza el contador
    // sin esperar a un refresh o a un evento de Lia.
    useEffect(() => {
        return subscribe(flash ? 'side_events' : 'invitations', (payload) => {
            const row = payload.new
            if (!row || String(row.id) !== String(id)) return
            setCredits(row.credits)
        })
    }, [id, subscribe])

    const isSending = creditState === 'sending'
    const isBubble  = creditState === 'bubble'

    if (mobile) {
        return (
            <>
                <Button
                    style={{ borderRadius: '99px' }}
                    icon={<Coins size={14} style={{ marginTop: '2px' }} />}
                    onClick={() => setMobileOpen(true)}
                />
                <CreditsMobile
                    invitationID={id}
                    credits={credits}
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                />
            </>
        )
    }

    return (
        <div className={`coins_cont${isSending ? ' coins_cont--sending' : ''}`}>
            {isBubble && <div className="credit_minus_bubble">-{creditAmount} {creditAmount === 1 ? 'crédito' : 'créditos'}</div>}

            <div className="coins_rel">
                {!isSending && (
                    <img src="/images/c_50.png" alt="" className="coins_img" />
                )}

                {isSending ? (
                    <div className="coins_sending_content">
                        <FaPaperPlane className="paper_flight" />
                        <span>{creditSendingLabel ?? t('guests.invitation_sent')}</span>
                    </div>
                ) : (
                    <span className='credits_label'>{credits}</span>
                )}

                {!isSending && (
                    <Dropdown
                        trigger={['click']}
                        // En el editor del Evento Flash va a la izquierda de la barra: abre hacia la derecha.
                        placement={flash ? 'bottomLeft' : 'bottomRight'}
                        arrow
                        popupClassName='credits-popup'
                        popupRender={() => (
                            <CreditsComponent invitationID={flash ? undefined : id} flashId={flash ? id : undefined} isSingle={true} credits={credits} getType={getCredits} />
                        )}>
                        <Button className="coins_btn" icon={<Plus size={14} style={{ marginTop: '2px' }} />}></Button>
                    </Dropdown>
                )}
            </div>
        </div>
    )
}
