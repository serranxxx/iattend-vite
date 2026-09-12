import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Slider } from 'antd'
import { Calendar, Check } from 'lucide-react'
import styles from './MobileFields.module.css'

/* Campos para la hoja inferior de los editores en móvil. Sustituyen a los
   popups de Ant Design, que ahí no funcionan: ver el comentario de cabecera
   del CSS. En escritorio los editores siguen usando antd. */

/* ── Fuentes ─────────────────────────────────────────────────────── */

/**
 * Lista inline de tipografías con vista previa. Vive dentro de la hoja y
 * hace scroll con su propio contenedor, no en un popup.
 */
export const FontPicker = ({ fonts, value, onChange }) => {
    const { t } = useTranslation()
    const listRef = useRef(null)

    // La elegida entra a la vista al montar, sin animación: es el punto de
    // partida, no un cambio.
    useEffect(() => {
        const on = listRef.current?.querySelector('[data-on="true"]')
        on?.scrollIntoView({ block: 'center' })
    }, [])

    return (
        <div ref={listRef} className={styles.fontList} role="listbox" aria-label={t('mobile_fields.font')}>
            {fonts.map((f) => {
                const on = f === value
                return (
                    <button
                        key={f}
                        type="button"
                        role="option"
                        aria-selected={on}
                        data-on={on || undefined}
                        className={`${styles.fontRow} ${on ? styles.fontRowOn : ''}`}
                        style={{ fontFamily: f }}
                        onClick={() => onChange(f)}
                    >
                        <span>{f}</span>
                        {on && <Check size={16} className={styles.fontCheck} />}
                    </button>
                )
            })}
        </div>
    )
}

/* ── Color ───────────────────────────────────────────────────────── */

// #rgb, #rrggbb, rgb() y rgba() → { hex, alpha }. Lo que no se entiende cae
// a negro opaco en vez de romper el input nativo, que solo acepta #rrggbb.
const parseColor = (raw) => {
    const s = String(raw ?? '').trim()
    const m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
    if (m) {
        const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]
        return { hex: `#${h.toLowerCase()}`, alpha: 1 }
    }
    const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i)
    if (rgb) {
        const hex = '#' + [rgb[1], rgb[2], rgb[3]]
            .map((n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0'))
            .join('')
        return { hex, alpha: rgb[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(rgb[4]))) }
    }
    return { hex: '#000000', alpha: 1 }
}

const toRgba = (hex, alpha) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/**
 * Muestra de color que abre el selector nativo del teléfono. Con `alpha`
 * añade un deslizador de opacidad y devuelve `rgba(...)`; sin él devuelve
 * `#rrggbb`.
 */
export const ColorField = ({ value, onChange, alpha = false, hint }) => {
    const { t } = useTranslation()
    const parsed = parseColor(value)
    const emit = (hex, a) => onChange(alpha ? toRgba(hex, a) : hex)

    return (
        <div>
            <div className={styles.colorField}>
                <span className={styles.swatch}>
                    <span className={styles.swatchFill} style={{ background: alpha ? toRgba(parsed.hex, parsed.alpha) : parsed.hex }} />
                    <input
                        type="color"
                        value={parsed.hex}
                        onChange={(e) => emit(e.target.value, parsed.alpha)}
                        aria-label={t('mobile_fields.color')}
                    />
                </span>
                <span className={styles.colorMeta}>
                    <span className={styles.colorHex}>
                        {parsed.hex}{alpha && parsed.alpha < 1 ? ` · ${Math.round(parsed.alpha * 100)}%` : ''}
                    </span>
                    {hint && <span className={styles.colorHint}>{hint}</span>}
                </span>
            </div>

            {alpha && (
                <div className={styles.alphaRow}>
                    <span className={styles.alphaLabel}>{t('mobile_fields.opacity')}</span>
                    <Slider
                        style={{ flex: 1, margin: '0 6px' }}
                        min={0}
                        max={100}
                        value={Math.round(parsed.alpha * 100)}
                        onChange={(v) => emit(parsed.hex, v / 100)}
                    />
                </div>
            )}
        </div>
    )
}

/* ── Fecha ───────────────────────────────────────────────────────── */

/**
 * Fecha (o fecha y hora) con el control nativo. `datetime-local` entrega
 * `YYYY-MM-DDTHH:mm` sin zona horaria: es exactamente la hora de pared que
 * guardan los side events, así que no hay conversión posible que hacer mal.
 *
 * @param {'date'|'datetime-local'} type
 * @param {string|null} value  `YYYY-MM-DD` o `YYYY-MM-DDTHH:mm`
 * @param {(v: string|null) => void} onChange
 */
export const DateField = ({ type = 'date', value, onChange, min }) => (
    <label className={styles.dateField}>
        <Calendar size={16} className={styles.dateIcon} />
        <input
            type={type}
            value={value ?? ''}
            min={min}
            onChange={(e) => onChange(e.target.value || null)}
        />
    </label>
)
