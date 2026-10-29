import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import styles from './RegistroMuestra.module.css'

/*
  Tarjeta "Registro" de un Flash en la pieza del editor (SideCanvas): su
  pantalla de inicio con el formulario que se está armando. La de verdad, paso
  a paso, vive en iattend-events (components/SideEvent/Registro/RegistroCard.tsx).
*/

const iniciales = (n) => String(n ?? '').trim().split(/\s+/).map((p) => p.match(/\p{L}/u)?.[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

export const RegistroMuestra = ({ form }) => {
    const { t } = useTranslation()
    const secciones = (form?.sections ?? []).filter((s) => s.fields.some((f) => f.enabled !== false))
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <span className={styles.hostAv}>{form?.hostInitials || iniciales(form?.hostLabel) || '✓'}</span>
                <span className={styles.headerCol}>
                    <span className={styles.title}>{form?.title}</span>
                    {form?.hostLabel && <span className={styles.sub}>{form.hostLabel}</span>}
                </span>
            </div>
            <p className={styles.intro}>{form?.intro}</p>
            <div className={styles.chips}>{secciones.map((s) => <span key={s.title}>{s.title}</span>)}</div>
            <span className={styles.boton}>{t('side_events.reg_start')}</span>
            <div className={styles.privacy}><Lock size={13} /><span>{t('side_events.reg_privacy_line')}</span></div>
        </div>
    )
}
