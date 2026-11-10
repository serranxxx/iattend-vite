import { Shield, ShoppingCart } from 'lucide-react'
import { formatMonthly, formatMXN } from '../../../hooks/usePlans'
import styles from './PlanPricing.module.css'

// Bloque de precio del checkout: plan, forma de pago (contado / a meses),
// precio grande y botón de pago. `terms` sale de planTerms(plan); con un solo
// plazo (sin MSI) no se pinta el selector. "A meses" es un solo precio: el
// plazo (`term.plazos`, hasta `term.months`) lo elige el cliente en Stripe. `standalone={false}` quita el
// encabezado con el nombre del plan y la nota de Stripe cuando la pantalla ya
// los muestra (checkout en web).
export const PlanPricing = ({ plan, terms, term, onTermChange, onBuy, loading, disabled, standalone = true }) => {
    const contado = terms[0]
    const msi = Boolean(term?.months)
    // Lo que cuesta de más pagar a meses (el price de MSI cubre la comisión).
    const extra = msi && contado ? term.amount - contado.amount : 0

    const buyLabel = !term
        ? 'Pagar'
        : msi
            ? `Pagar a meses · ${formatMXN(term.amount)}`
            : `Pagar ${formatMXN(term.amount)}`

    return (
        <div className={styles.card}>
            {standalone && (
                <div className={styles.header}>
                    <div>
                        <span className={styles.eyebrow}>Plan</span>
                        <h2 className={styles.planName}>{plan?.name ?? '…'}</h2>
                    </div>
                    <span className={styles.badge}>Acceso de por vida</span>
                </div>
            )}

            {terms.length > 1 && (
                <>
                    <span className={styles.label}>Elige cómo pagar</span>
                    <div className={styles.picker} role='radiogroup' aria-label='Forma de pago'>
                        {terms.map(t => {
                            const selected = t.months === term?.months
                            return (
                                <button
                                    key={t.months}
                                    type='button'
                                    role='radio'
                                    aria-checked={selected}
                                    className={`${styles.option} ${selected ? styles.selected : ''}`}
                                    onClick={() => onTermChange(t.months)}
                                >
                                    <span className={styles.optionLabel}>
                                        {t.months ? 'A meses' : 'Contado'}
                                    </span>
                                    <span className={styles.optionDetail}>
                                        {t.months ? `desde ${formatMonthly(t.monthly)}/mes` : 'Mejor precio'}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </>
            )}

            <div className={styles.priceBox}>
                <div className={styles.priceRow}>
                    {msi && <span className={styles.perMonth}>desde</span>}
                    <span className={styles.price}>
                        {term ? (msi ? formatMonthly(term.monthly) : formatMXN(term.amount)) : '…'}
                    </span>
                    {msi && <span className={styles.perMonth}>/mes</span>}
                </div>
                <div className={styles.priceFooter}>
                    <span className={styles.priceNote}>
                        {msi
                            ? `Hasta ${term.months} pagos con tarjeta · eliges el plazo al pagar${extra > 0 ? ` · +${formatMXN(extra)} vs. contado` : ''}`
                            : 'Pago único con tarjeta'}
                    </span>
                    {term && <span className={styles.total}>Total {formatMXN(term.amount)}</span>}
                </div>
            </div>

            <button
                type='button'
                className={styles.buy}
                disabled={disabled || loading}
                onClick={onBuy}
            >
                <ShoppingCart size={20} />
                {loading ? 'Procesando...' : buyLabel}
            </button>

            {standalone && (
                <div className={styles.secure}>
                    <Shield size={14} />
                    <span>Pago seguro con Stripe</span>
                </div>
            )}
        </div>
    )
}
