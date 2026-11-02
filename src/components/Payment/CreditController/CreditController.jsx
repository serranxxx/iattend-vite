import React, { useEffect, useState } from 'react'
import { CreditsComponent } from '../Credits/Credits'
import { CreditsMobile } from '../Credits/CreditsMobile'
import './credit-controller.css'
import { supabase } from '../../../lib/supabase'
import { Button, Dropdown } from 'antd'
import { Coins, Plus, Send } from 'lucide-react'
import { FaPaperPlane } from 'react-icons/fa'
import { useLia } from '../../../context/LiaContext'
import { useTranslation } from 'react-i18next'
import { useDashboardRealtime } from '../../../context/DashboardRealtimeContext'
import { EVENTO_CREDITOS_POP } from './creditosPop'

// `pop`: créditos de un Pop (side_events.credits, id del side
// event) en vez de los de una invitación; el "+" compra para ese evento.
// `variante="envios"`: píldora en línea "✈ N envíos +" (encabezado de la vista
// compacta de invitados), sin la posición absoluta del header.
// `placement`: hacia dónde abre la compra (por omisión según dónde vive).
export const CreditController = ({ id, mobile, pop = false, variante = null, placement = null }) => {
    const [credits, setCredits] = useState(null)
    const [mobileOpen, setMobileOpen] = useState(false)
    const { creditState, creditAmount, creditSendingLabel } = useLia()
    const { t } = useTranslation()
    const { subscribe } = useDashboardRealtime()

    const getCredits = async () => {
        const { data, error } = await supabase
            .from(pop ? "side_events" : "invitations")
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
        return subscribe(pop ? 'side_events' : 'invitations', (payload) => {
            const row = payload.new
            if (!row || String(row.id) !== String(id)) return
            setCredits(row.credits)
        })
    }, [id, subscribe])

    // Pop: SideEvents avisa el saldo al descontar (ver creditosPop.js).
    useEffect(() => {
        if (!pop) return
        const alCambiar = (e) => { if (e.detail?.id === String(id)) setCredits(e.detail.credits) }
        window.addEventListener(EVENTO_CREDITOS_POP, alCambiar)
        return () => window.removeEventListener(EVENTO_CREDITOS_POP, alCambiar)
    }, [pop, id])

    const isSending = creditState === 'sending'
    const isBubble  = creditState === 'bubble'

    const comprar = (boton) => (
        <Dropdown
            trigger={['click']}
            // En el editor del Pop va a la izquierda de la barra: abre hacia la derecha.
            placement={placement ?? (pop && variante !== 'envios' ? 'bottomLeft' : 'bottomRight')}
            arrow
            // antd v6: `popupClassName` ya no llega al menú; la clase va en rootClassName.
            rootClassName='credits-popup'
            popupRender={() => (
                <CreditsComponent invitationID={pop ? undefined : id} popId={pop ? id : undefined} isSingle={true} credits={credits} getType={getCredits} />
            )}>
            {boton}
        </Dropdown>
    )

    if (variante === 'envios') {
        return (
            <div className={`envios_pill${isSending ? ' envios_pill--sending' : ''}`}>
                {isBubble && <div className="credit_minus_bubble">-{creditAmount} {creditAmount === 1 ? 'crédito' : 'créditos'}</div>}
                <Send size={14} className="envios_icon" />
                {isSending
                    ? <span className="envios_label">{creditSendingLabel ?? t('guests.invitation_sent')}</span>
                    : (
                        <>
                            <span className="envios_num">{credits ?? '—'}</span>
                            <span className="envios_label">{t('guests.credits_sends', { count: credits ?? 0 })}</span>
                        </>
                    )}
                {!isSending && comprar(
                    <button type="button" className="envios_mas" aria-label={t('guests.credits_buy')}>
                        <Plus size={14} />
                    </button>
                )}
            </div>
        )
    }

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
                        // En el editor del Pop va a la izquierda de la barra: abre hacia la derecha.
                        placement={pop ? 'bottomLeft' : 'bottomRight'}
                        arrow
                        rootClassName='credits-popup'
                        popupRender={() => (
                            <CreditsComponent invitationID={pop ? undefined : id} popId={pop ? id : undefined} isSingle={true} credits={credits} getType={getCredits} />
                        )}>
                        <Button className="coins_btn" icon={<Plus size={14} style={{ marginTop: '2px' }} />}></Button>
                    </Dropdown>
                )}
            </div>
        </div>
    )
}
