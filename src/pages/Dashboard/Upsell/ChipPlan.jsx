import { useTranslation } from 'react-i18next'
import s from './Upsell.module.css'

/*
  Chip del plan en el header del dashboard (Lite / Paperless): "PLAN LITE ·
  Mejorar a PRO" (directo al pago) / "PLAN PAPERLESS · Mejorar plan" (abre
  el comparador: no tiene un solo destino).
*/
export const ChipPlan = ({ plan, onClick, yendo = false }) => {
    const { t } = useTranslation()
    return (
        <span className={s.chipPlan}>
            <span className={s.chipPlanLabel}>{t('upsell.chip_label', { plan: t(`upsell.plan_${plan}`).toUpperCase() })}</span>
            <button type='button' className={s.chipPlanBoton} onClick={onClick}>
                {yendo ? t('upsell.cmp_going') : plan === 'lite' ? t('upsell.upgrade_to', { plan: 'PRO' }) : t('upsell.chip_upgrade')}
            </button>
        </span>
    )
}

export default ChipPlan
