import { useEffect, useState } from 'react'
import { Modal, Button, Input } from 'antd'
import { useTranslation } from 'react-i18next'
import styles from './FeedbackPrompt.module.css'

const STAR_VALUES = [1, 2, 3, 4, 5]

const StarIcon = ({ filled, ...props }) => (
    <svg
        className={styles.star}
        viewBox="0 0 24 24"
        width={30}
        height={30}
        fill={filled ? 'var(--light-purple-500)' : 'none'}
        stroke={filled ? 'var(--light-purple-500)' : '#C9C9C9'}
        strokeWidth={1.5}
        {...props}
    >
        <path d="M12 2.5l2.9 6.06 6.6.87-4.85 4.6 1.24 6.57L12 17.6l-5.89 3 1.24-6.57-4.85-4.6 6.6-.87L12 2.5z" strokeLinejoin="round" />
    </svg>
)

export const FeedbackModal = ({ open, onClose, onSubmit }) => {
    const { t } = useTranslation()
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [thankYou, setThankYou] = useState(false)

    useEffect(() => {
        if (!open) return
        setRating(0)
        setHoverRating(0)
        setComment('')
        setThankYou(false)
    }, [open])

    useEffect(() => {
        if (!thankYou) return
        const timer = setTimeout(onClose, 1800)
        return () => clearTimeout(timer)
    }, [thankYou, onClose])

    const handleSubmit = async () => {
        if (!rating || submitting) return
        setSubmitting(true)
        try {
            await onSubmit(rating, comment.trim())
            setThankYou(true)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            closable={false}
            centered
            width={420}
            className={styles.modal}
            styles={{body:{padding: '18px',backgroundColor:'#FFF', borderRadius:'16px'}}}
        >
            {thankYou ? (
                <div className={styles.thankYou}>
                    <div className={styles.thankYouEmoji}>🎉</div>
                    <div className={styles.thankYouTitle}>{t('feedback_prompt.thanks_title')}</div>
                </div>
            ) : (
                <div className={styles.modalBody}>
                    <div className={styles.title}>{t('feedback_prompt.modal_title')}</div>
                    <div className={styles.subtitle}>{t('feedback_prompt.modal_subtitle')}</div>

                    <div className={styles.stars}>
                        {STAR_VALUES.map(value => (
                            <StarIcon
                                key={value}
                                filled={value <= (hoverRating || rating)}
                                onClick={() => setRating(value)}
                                onMouseEnter={() => setHoverRating(value)}
                                onMouseLeave={() => setHoverRating(0)}
                            />
                        ))}
                    </div>

                    <Input.TextArea
                        className={styles.textarea}
                        rows={3}
                        maxLength={500}
                        placeholder={t('feedback_prompt.comment_placeholder')}
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                    />

                    <div className={styles.actions}>
                        <Button
                            className={styles.submitBtn}
                            disabled={!rating}
                            loading={submitting}
                            onClick={handleSubmit}
                        >
                            {t('feedback_prompt.submit')}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    )
}
