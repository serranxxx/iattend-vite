import { ArrowLeft, Check } from 'lucide-react'
import styles from './SalesUi.module.css'

// Piezas compartidas del portal de ventas (/sales). Pensado para el teléfono
// del vendedor: acciones abajo al alcance del pulgar, inputs de 52px y texto
// de 16px para que iOS no haga zoom al enfocar.

export const Screen = ({ children, footer }) => (
    <div className={styles.screen}>
        <div className={`${styles.body} ${footer ? styles.bodyWithFooter : ''}`}>{children}</div>
        {footer}
    </div>
)

export const ScreenHeader = ({ title, onBack, backLabel, aside }) => (
    <div className={styles.header}>
        <button type="button" className={styles.circleBtn} onClick={onBack} aria-label={backLabel}>
            <ArrowLeft size={20} />
        </button>
        <h1 className={styles.title}>{title}</h1>
        {aside && <span className={styles.headerAside}>{aside}</span>}
    </div>
)

// Footer fijo: `solid` va sobre blanco con borde (formularios); sin `solid`
// el fondo se desvanece hacia la lista (panel).
export const StickyFooter = ({ children, solid }) => (
    <div className={`${styles.footer} ${solid ? styles.footerSolid : styles.footerFade}`}>
        <div className={styles.footerInner}>{children}</div>
    </div>
)

export const PrimaryButton = ({ children, icon, iconEnd, loading, disabled, className = '', ...props }) => (
    <button
        type="button"
        className={`${styles.primaryBtn} ${className}`}
        aria-disabled={disabled || loading || undefined}
        aria-busy={loading || undefined}
        {...props}
    >
        {loading ? <span className={styles.spinner} aria-hidden="true" /> : icon}
        <span>{children}</span>
        {!loading && iconEnd}
    </button>
)

export const SectionLabel = ({ children }) => <span className={styles.sectionLabel}>{children}</span>

export const Field = ({ label, htmlFor, children, hint }) => (
    <div className={styles.field}>
        {label && <label className={styles.label} htmlFor={htmlFor}>{label}</label>}
        {children}
        {hint}
    </div>
)

export const TextInput = ({ className = '', ...props }) => (
    <input className={`${styles.input} ${className}`} {...props} />
)

export const Hint = ({ tone = 'neutral', children }) => (
    <span className={`${styles.hint} ${styles[`hint_${tone}`]}`}>{children}</span>
)

// Control segmentado (Boda / XV años, Cliente nuevo / existente)
export const Segmented = ({ options, value, onChange, label }) => (
    <div className={styles.segmented} role="radiogroup" aria-label={label}>
        {options.map(o => (
            <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={value === o.value}
                className={`${styles.segment} ${value === o.value ? styles.segmentActive : ''}`}
                onClick={() => onChange(o.value)}
            >
                {o.label}
            </button>
        ))}
    </div>
)

// Chips de una sola selección (descuento, método de pago, filtros)
export const ChipGroup = ({ options, value, onChange, label, size = 'md', fill }) => (
    <div className={`${styles.chips} ${fill ? styles.chipsFill : ''}`} role="radiogroup" aria-label={label}>
        {options.map(o => (
            <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={value === o.value}
                className={`${styles.chip} ${styles[`chip_${size}`]} ${value === o.value ? styles.chipActive : ''}`}
                onClick={() => onChange(o.value)}
            >
                {o.label}
                {o.count != null && <span className={styles.chipCount}>{o.count}</span>}
            </button>
        ))}
    </div>
)

export const Steps = ({ labels, current }) => (
    <ol className={styles.steps}>
        {labels.map((label, i) => (
            <li
                key={label}
                className={`${styles.step} ${i <= current ? styles.stepDone : ''} ${i === current ? styles.stepCurrent : ''}`}
                aria-current={i === current ? 'step' : undefined}
            >
                <span className={styles.stepBar} />
                <span className={styles.stepLabel}>
                    {i < current && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                    {label}
                </span>
            </li>
        ))}
    </ol>
)

export const Card = ({ children, className = '' }) => (
    <div className={`${styles.card} ${className}`}>{children}</div>
)

// Fila de "dato + Copiar" dentro de una tarjeta-lista
export const CopyRow = ({ title, value, mono, href, onCopy, copyLabel, primary }) => (
    <div className={styles.copyRow}>
        <div className={styles.copyText}>
            <span className={styles.copyTitle}>{title}</span>
            {href ? (
                <a className={`${styles.copyValue} ${mono ? styles.mono : ''}`} href={href} target="_blank" rel="noreferrer">{value}</a>
            ) : (
                <span className={`${styles.copyValue} ${mono ? styles.mono : ''}`}>{value}</span>
            )}
        </div>
        <button type="button" className={`${styles.pillBtn} ${primary ? styles.pillBtnPrimary : ''}`} onClick={onCopy}>
            {copyLabel}
        </button>
    </div>
)

export const ProgressBar = ({ pct, color, thick }) => (
    <div className={`${styles.track} ${thick ? styles.trackThick : ''}`} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
)

const ESTADOS = {
    completo: styles.status_completo,
    apartado: styles.status_apartado,
    sin_pago: styles.status_sin_pago,
}

export const StatusPill = ({ estado, label }) => (
    <span className={`${styles.status} ${ESTADOS[estado] ?? ''}`}>{label}</span>
)
