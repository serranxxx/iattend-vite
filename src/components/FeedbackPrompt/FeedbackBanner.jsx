import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from './FeedbackBanner.module.css'

/**
 * Banner de feedback del dashboard. Sustituye al botón discreto que vivía en el
 * header: se muestra arriba de las tarjetas de la invitación y de invitados,
 * donde no compite con nada y sí se ve.
 */
export const FeedbackBanner = ({ onClick }) => {
    const { t } = useTranslation()

    return (
        <div className={styles.banner}>
            <div className={styles.mark} aria-hidden="true">
                <Star size={18} />
            </div>

            <div className={styles.texts}>
                <span className={styles.title}>{t('feedback_prompt.banner_title')}</span>
                <span className={styles.text}>{t('feedback_prompt.banner_text')}</span>
            </div>

            <button type="button" className={styles.cta} onClick={onClick}>
                {t('feedback_prompt.banner_cta')}
            </button>
        </div>
    )
}
