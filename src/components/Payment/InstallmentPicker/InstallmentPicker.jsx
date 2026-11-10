import { formatMonthly, formatMXN } from '../../../hooks/usePlans'
import styles from './InstallmentPicker.module.css'

// Selector de forma de pago (contado / a meses) de un plan; el plazo de "a
// meses" lo elige el cliente en Stripe. `terms` sale
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
                            {term.months ? 'A meses' : 'Contado'}
                        </span>
                        <span className={styles.detail}>
                            {term.months ? `desde ${formatMonthly(term.monthly)}/mes` : formatMXN(term.amount)}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}
