import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Check, MessageCircle } from 'lucide-react'
import axios from 'axios'
import { supabase } from '../../lib/supabase'
import styles from './SupportTicketModal.module.css'
import { advisorWhatsappUrl } from '../../helpers/contact'


const TOPICS = ['help', 'improvement', 'question']

/**
 * Ticket de soporte del header. Se guarda en `support_tickets` y le llega un
 * correo a soporte con el tema, el mensaje y los datos con los que el equipo
 * puede ubicar al usuario (correo, nombre e id de la invitación).
 */
export const SupportTicketModal = ({ open, onClose, invitationId, session, eventName }) => {
    const { t } = useTranslation()
    const [topic, setTopic] = useState('help')
    const [body, setBody] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState(null)

    // La sesión no siempre llega hasta aquí (varias páginas montan
    // <HeaderDashboard> sin pasar `session`), así que el dueño se resuelve
    // desde la invitación: invitations.user_email / user_id y, con ese id,
    // profiles.full_name. La sesión local queda solo como respaldo.
    const [owner, setOwner] = useState(null)

    useEffect(() => {
        if (!open || !invitationId) return

        let alive = true
        const loadOwner = async () => {
            const { data: inv } = await supabase
                .from('invitations')
                .select('user_id, user_email')
                .eq('id', invitationId)
                .maybeSingle()

            let fullName = null
            if (inv?.user_id) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, user_email')
                    .eq('user_id', inv.user_id)
                    .maybeSingle()
                fullName = profile?.full_name ?? null
                if (alive) {
                    setOwner({
                        userId: inv.user_id,
                        email: inv.user_email ?? profile?.user_email ?? null,
                        name: fullName,
                    })
                    return
                }
            }

            if (alive) setOwner({ userId: inv?.user_id ?? null, email: inv?.user_email ?? null, name: null })
        }

        loadOwner()
        return () => { alive = false }
    }, [open, invitationId])

    const sessionUser = session?.user ?? {}
    const userEmail = owner?.email ?? sessionUser.email ?? '—'
    const userName = owner?.name ?? sessionUser.name ?? '—'

    useEffect(() => {
        if (!open) return undefined
        const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
        document.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
        }
    }, [open, onClose])

    // Cada apertura arranca en limpio
    useEffect(() => {
        if (open) { setTopic('help'); setBody(''); setSent(false); setError(null) }
    }, [open])

    if (!open) return null

    const onSubmit = async () => {
        if (!body.trim() || sending) return
        setSending(true)
        setError(null)

        // El backend guarda el reporte (Admin → Notificaciones) y manda el
        // correo a soporte. Con sesión, el remitente sale de ella; sin sesión,
        // del dueño de la invitación.
        try {
            const { data } = await supabase.auth.getSession()
            const token = data?.session?.access_token
            await axios.post(`${import.meta.env.VITE_API_URL}/api/support/tickets`, {
                topic,
                body: body.trim(),
                invitation_id: invitationId || null,
                event_name: eventName || null,
                user_email: userEmail !== '—' ? userEmail : null,
                user_name: userName !== '—' ? userName : null,
            }, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            setSent(true)
        } catch (e) {
            console.error('Error enviando ticket de soporte:', e)
            setError(t('support_ticket.error'))
        } finally {
            setSending(false)
        }
    }

    return createPortal(
        <div className={styles.overlay} onClick={onClose} role="presentation">
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-label={t('support_ticket.title')}
                onClick={(e) => e.stopPropagation()}
            >
                <span className={styles.accent} aria-hidden="true" />

                {sent ? (
                    <div className={styles.done}>
                        <div className={styles.doneMark}><Check size={26} /></div>
                        <h2 className={styles.doneTitle}>{t('support_ticket.sent_title')}</h2>
                        <p className={styles.doneText}>{t('support_ticket.sent_text')}</p>
                        <button type="button" className={styles.cta} onClick={onClose}>
                            {t('support_ticket.sent_cta')}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className={styles.head}>
                            <h2 className={styles.title}>{t('support_ticket.title')}</h2>
                            <div className={styles.actions}>
                                <a
                                    className={styles.whatsapp}
                                    href={advisorWhatsappUrl()}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <MessageCircle size={15} />
                                    {t('support_ticket.whatsapp')}
                                </a>
                                <button
                                    type="button"
                                    className={styles.cta}
                                    disabled={!body.trim() || sending}
                                    onClick={onSubmit}
                                >
                                    {sending ? t('support_ticket.sending') : t('support_ticket.submit')}
                                </button>
                            </div>
                        </div>

                        <p className={styles.intro}>{t('support_ticket.intro')}</p>

                        <div className={styles.topics} role="radiogroup" aria-label={t('support_ticket.title')}>
                            {TOPICS.map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="radio"
                                    aria-checked={topic === key}
                                    className={styles.topic}
                                    onClick={() => setTopic(key)}
                                >
                                    <span className={styles.radio} />
                                    {t(`support_ticket.topic_${key}`)}
                                </button>
                            ))}
                        </div>

                        <textarea
                            className={styles.textarea}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder={t('support_ticket.placeholder')}
                            rows={7}
                        />

                        {error && <p className={styles.error}>{error}</p>}

                        <p className={styles.foot}>{t('support_ticket.foot')}</p>
                    </>
                )}
            </div>
        </div>,
        document.body,
    )
}
