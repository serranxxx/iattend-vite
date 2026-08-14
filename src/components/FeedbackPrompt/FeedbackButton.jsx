import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from './FeedbackPrompt.module.css'

export const FeedbackButton = ({ onClick, compact = false }) => {
    const { t } = useTranslation()

    if (compact) {
        return (
            <button
                type="button"
                className={styles.buttonCompact}
                onClick={onClick}
                aria-label={t('feedback_prompt.button_cta')}
            >
                <Star size={14} />
            </button>
        )
    }

    return (
        <button type="button" className={styles.button} onClick={onClick}>
            <Star size={14} />
            {t('feedback_prompt.button_cta')}
        </button>
    )
}
