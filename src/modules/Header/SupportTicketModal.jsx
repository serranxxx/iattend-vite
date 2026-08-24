import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Check, MessageCircle } from 'lucide-react'
import axios from 'axios'
import { supabase } from '../../lib/supabase'
import styles from './SupportTicketModal.module.css'

const SUPPORT_EMAIL = 'contacto.iattend@gmail.com'
const SUPPORT_WHATSAPP = '+526143681307'

const TOPICS = ['help', 'improvement', 'question']

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

/**
 * Ticket de soporte del header. Manda un correo a soporte con el asunto que
 * eligió el usuario y, en el cuerpo, su mensaje más los datos con los que el
 * equipo puede ubicarlo: correo, nombre e id de la invitación.
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
    const userId = owner?.userId ?? sessionUser.uid ?? sessionUser.id ?? '—'

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

        const subject = t(`support_ticket.topic_${topic}`)
        const html = `
            <h2>${escapeHtml(subject)}</h2>
            <p style="white-space:pre-wrap">${escapeHtml(body.trim())}</p>
            <hr />
            <p>
                <b>Usuario:</b> ${escapeHtml(userName)}<br />
                <b>Correo:</b> ${escapeHtml(userEmail)}<br />
                <b>ID de usuario:</b> ${escapeHtml(userId)}<br />
                <b>Invitación:</b> ${escapeHtml(eventName || '—')}<br />
                <b>ID de invitación:</b> ${escapeHtml(invitationId || '—')}
            </p>
        `

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/mail/send-mail`, {
                to: SUPPORT_EMAIL,
                subject: `[Soporte] ${subject}`,
                html,
            })
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
                                    href={`https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, '')}`}
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
