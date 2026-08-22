import { useEffect, useState } from 'react'
import { Button } from 'antd'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { BellRing, MailWarning, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from './WhatsNewBanners.module.css'

// Banners de novedades. Se montan una sola vez en DashboardLayout (AppRouter),
// así aparecen en TODAS las rutas /dashboard/* hasta que el usuario los cierra
// (el cierre se persiste en localStorage). Son un overlay fijo: no mueven el
// layout de las páginas.
//
// El botón "Lo nuevo" de GuestsPage los re-abre disparando el evento
// WHATS_NEW_OPEN_EVENT (solo en memoria; al cerrarlos se vuelve a persistir).
export const WHATS_NEW_OPEN_EVENT = 'iattend:whats-new-open'

const BANNERS = [
    { key: 'reminders', storageKey: 'iattend_wn_reminders_v1', variant: 'purple', icon: BellRing },
    { key: 'retry', storageKey: 'iattend_wn_retry_v1', variant: 'blue', icon: MailWarning },
]

const readDismissed = () =>
    new Set(BANNERS.filter((b) => localStorage.getItem(b.storageKey) === '1').map((b) => b.key))

export const WhatsNewBanners = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const [searchParams] = useSearchParams()
    const invitationId = searchParams.get('id')
    const [dismissed, setDismissed] = useState(readDismissed)

    useEffect(() => {
        const reopen = () => setDismissed(new Set())
        window.addEventListener(WHATS_NEW_OPEN_EVENT, reopen)
        return () => window.removeEventListener(WHATS_NEW_OPEN_EVENT, reopen)
    }, [])

    const onDismiss = (banner) => {
        localStorage.setItem(banner.storageKey, '1')
        setDismissed((prev) => new Set(prev).add(banner.key))
    }

    const visible = BANNERS.filter((b) => !dismissed.has(b.key))
    if (visible.length === 0) return null

    // El CTA no tiene sentido si ya estás en la página de invitados
    const showCta = !pathname.startsWith('/dashboard/guests')

    return (
        <div className={styles.stack}>
            {visible.map((banner) => {
                const Icon = banner.icon
                return (
                    <div key={banner.key} className={`${styles.banner} ${styles[banner.variant]}`}>
                        <Icon size={18} className={styles.icon} />

                        <div className={styles.texts}>
                            <span className={styles.title}>{t(`whats_new.${banner.key}_title`)}</span>
                            <span className={styles.text}>{t(`whats_new.${banner.key}_text`)}</span>
                        </div>

                        {showCta && (
                            <Button
                                className={styles.cta}
                                onClick={() => navigate(`/dashboard/guests/?id=${invitationId}`)}
                                style={{ borderRadius: 99 }}
                            >
                                {t('whats_new.cta')}
                            </Button>
                        )}

                        <Button
                            type='text'
                            size='small'
                            icon={<X size={14} />}
                            onClick={() => onDismiss(banner)}
                            className={styles.close}
                        />
                    </div>
                )
            })}
        </div>
    )
}
