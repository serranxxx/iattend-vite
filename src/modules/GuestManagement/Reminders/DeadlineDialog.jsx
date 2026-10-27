import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DatePicker } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { CalendarDays, X } from 'lucide-react'
import { formatAbsoluteDateEs } from '../../../helpers/assets/eventDateTime'
import styles from './DeadlineDialog.module.css'

/**
 * Ventana para definir la fecha límite de confirmación (rsvp_deadline) cuando
 * el organizador elige un recordatorio que la usa y su evento no la tiene.
 * Es propia (no el Modal de antd). Cierra con Escape o clic fuera.
 *
 * `onSave(dayjs)` guarda y devuelve true si salió bien (onSaveRsvpDeadline de
 * GuestsPage); `disabledDate` son las mismas reglas de siempre: fecha futura
 * y no después del evento.
 */
export const DeadlineDialog = ({ open, templateName, disabledDate, onSave, onClose }) => {
    const { t } = useTranslation()
    const [value, setValue] = useState(null)
    const [saving, setSaving] = useState(false)
    const cardRef = useRef(null)

    useEffect(() => {
        if (!open) return
        setValue(null)
        const onKey = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open])

    if (!open) return null

    const save = async () => {
        if (!value || saving) return
        setSaving(true)
        try {
            if (await onSave(value)) onClose(true)
        } finally {
            setSaving(false)
        }
    }

    return createPortal(
        <div className={styles.backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div ref={cardRef} className={styles.card} role="dialog" aria-modal="true" aria-labelledby="deadline-dialog-title">
                <button type="button" className={styles.close} aria-label={t('reminders.cancel')} onClick={() => onClose()}>
                    <X size={16} />
                </button>

                <span className={styles.icon}><CalendarDays size={22} /></span>
                <h3 id="deadline-dialog-title" className={styles.title}>{t('reminders.deadline_title')}</h3>
                <p className={styles.text}>{t('reminders.deadline_text', { name: templateName })}</p>

                <DatePicker
                    value={value}
                    onChange={setValue}
                    disabledDate={disabledDate}
                    allowClear={false}
                    // Igual que llega en el {{n}} del mensaje.
                    format={(d) => formatAbsoluteDateEs(d.format('YYYY-MM-DD'))}
                    placeholder={t('reminders.deadline_placeholder')}
                    className={styles.picker}
                    getPopupContainer={() => cardRef.current ?? document.body}
                    defaultPickerValue={dayjs().add(1, 'month')}
                />
                <span className={styles.hint}>{t('reminders.deadline_hint')}</span>

                <div className={styles.actions}>
                    <button type="button" className={styles.btnOutline} onClick={() => onClose()}>
                        {t('reminders.cancel')}
                    </button>
                    <button type="button" className={styles.btnPrimary} aria-disabled={!value || saving || undefined} onClick={save}>
                        {saving ? t('reminders.deadline_saving') : t('reminders.deadline_save')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
