import { useEffect, useState } from 'react'
import { Badge, FloatButton } from 'antd'
import { CircleQuestionMark, Coins, MessageCircle, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useDashboardRealtime } from '../../context/DashboardRealtimeContext'
import { LIA_CHAT_OPEN_EVENT } from '../../components/ChatContainer/ChatContainer'
import { CreditsMobile } from '../../components/Payment/Credits/CreditsMobile'
import styles from './MobileActionsFab.module.css'

/**
 * Navegación de mobile: botón flotante abajo a la derecha con las acciones que
 * salieron del header (Lia, créditos, mensajes y ayuda). El header en mobile se
 * queda solo con el nombre del evento y el botón de regresar.
 */
export const MobileActionsFab = ({ invitationId, unAnswer = 0, bottomOffset = 24, onOpenMessages, onOpenHelp }) => {
    const { t } = useTranslation()
    const { subscribe } = useDashboardRealtime()
    const [credits, setCredits] = useState(null)
    const [creditsOpen, setCreditsOpen] = useState(false)

    useEffect(() => {
        if (!invitationId) return
        supabase
            .from('invitations')
            .select('credits')
            .eq('id', invitationId)
            .maybeSingle()
            .then(({ data }) => setCredits(data?.credits ?? 0))
    }, [invitationId])

    // Mismo canal compartido del dashboard: el saldo se mueve al enviar
    useEffect(() => subscribe('invitations', (payload) => {
        const row = payload.new
        if (!row || String(row.id) !== String(invitationId)) return
        setCredits(row.credits)
    }), [invitationId, subscribe])

    if (!invitationId) return null

    return (
        <>
            <FloatButton.Group
                className={styles.fab}
                trigger="click"
                type="primary"
                placement="top"
                // bottomOffset deja espacio a la barra de herramientas del editor
                style={{ insetInlineEnd: 20, insetBlockEnd: bottomOffset, zIndex: 1200 }}
                icon={<Plus size={22} />}
            >
                <FloatButton
                    icon={<span className={styles.spark} aria-hidden="true">✦</span>}
                    tooltip={t('mobile_actions.lia')}
                    onClick={() => window.dispatchEvent(new Event(LIA_CHAT_OPEN_EVENT))}
                />
                <FloatButton
                    icon={<Coins size={20} />}
                    tooltip={t('mobile_actions.credits')}
                    onClick={() => setCreditsOpen(true)}
                />
                <FloatButton
                    icon={
                        <Badge dot={unAnswer > 0} color="var(--light-purple-500)" offset={[2, -2]}>
                            <MessageCircle size={20} />
                        </Badge>
                    }
                    tooltip={t('mobile_actions.messages')}
                    onClick={onOpenMessages}
                />
                <FloatButton
                    icon={<CircleQuestionMark size={20} />}
                    tooltip={t('mobile_actions.help')}
                    onClick={onOpenHelp}
                />
            </FloatButton.Group>

            <CreditsMobile
                invitationID={invitationId}
                credits={credits ?? 0}
                open={creditsOpen}
                onClose={() => setCreditsOpen(false)}
            />
        </>
    )
}
