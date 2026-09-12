import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import styles from './LiaPlanModal.module.css'

/**
 * Lo que Lia haría con las confirmaciones. Se abre desde "Que Lia se encargue"
 * y desde los enlaces al plan.
 *
 * Lia todavía no está disponible, así que el CTA anuncia en vez de accionar:
 * el modal existe para explicar el trato — qué hace sola y qué no hace sin
 * preguntar — antes de que exista el botón real.
 */
export const LiaPlanModal = ({ open, onClose, chasing = 0, decisions = 0 }) => {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    // El fondo no debe scrollear detrás del modal
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const promises = [
    t('guests_overview.lia_modal_do_1'),
    t('guests_overview.lia_modal_do_2'),
    t('guests_overview.lia_modal_do_3'),
  ]

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={t('guests_overview.lia_modal_title')}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label={t('guests_overview.lia_modal_close')}>
          <X size={18} />
        </button>

        <div className={styles.mark} aria-hidden="true">✦</div>

        <h2 className={styles.title}>{t('guests_overview.lia_modal_title')}</h2>
        <p className={styles.sub}>{t('guests_overview.lia_modal_sub')}</p>

        <div className={styles.shift}>
          <div className={styles.shiftBox}>
            <span className={styles.shiftKicker}>{t('guests_overview.lia_modal_before')}</span>
            <span className={styles.shiftValue}>
              {t('guests_overview.lia_modal_before_value', { count: chasing })}
            </span>
          </div>
          <span className={styles.shiftArrow} aria-hidden="true">→</span>
          <div className={`${styles.shiftBox} ${styles.shiftBoxAfter}`}>
            <span className={styles.shiftKicker}>{t('guests_overview.lia_modal_after')}</span>
            <span className={styles.shiftValue}>
              {t('guests_overview.lia_modal_after_value', { count: decisions })}
            </span>
          </div>
        </div>

        <ul className={styles.list}>
          {promises.map((p) => (
            <li key={p} className={styles.item}>
              <span className={styles.yes} aria-hidden="true">✓</span>
              <span>{p}</span>
            </li>
          ))}
          <li className={`${styles.item} ${styles.itemNo}`}>
            <span className={styles.no} aria-hidden="true">✕</span>
            <span>{t('guests_overview.lia_modal_dont')}</span>
          </li>
        </ul>

        <button type="button" className={styles.cta} onClick={onClose}>
          {t('guests_overview.lia_modal_cta')}
        </button>
      </div>
    </div>,
    document.body,
  )
}
