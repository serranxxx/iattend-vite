import { formatMonthly, formatMXN } from '../../../hooks/usePlans'
import styles from './InstallmentPicker.module.css'

// Selector de plazo (contado / meses sin intereses) de un plan. `terms` sale
// de planTerms(plan); si el plan solo tiene contado no se pinta nada.
// Tono claro, para drawers blancos (el checkout usa PlanPricing).
export const InstallmentPicker = ({ terms, value, onChange }) => {
    if (!terms || terms.length < 2) return null

    return (
        <div className={`${styles.picker} ${styles.light}`} role='radiogroup' aria-label='Forma de pago'>
            {terms.map(term => {
                const selected = term.months === value
                return (
                    <button
                        key={term.months}
                        type='button'
                        role='radio'
                        aria-checked={selected}
                        className={`${styles.option} ${selected ? styles.selected : ''}`}
                        onClick={() => onChange(term.months)}
                    >
                        <span className={styles.label}>
                            {term.months ? `${term.months} meses` : 'Contado'}
                        </span>
                        <span className={styles.detail}>
                            {term.months ? `${formatMonthly(term.monthly)}/mes` : formatMXN(term.amount)}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}
