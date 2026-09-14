import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Slider } from 'antd'
import { Calendar } from 'lucide-react'
import styles from './MobileFields.module.css'

/* Campos para la hoja inferior de los editores en móvil. Sustituyen a los
   popups de Ant Design, que ahí no funcionan: ver el comentario de cabecera
   del CSS. En escritorio los editores siguen usando antd. */

/* ── Fuentes ─────────────────────────────────────────────────────── */

/**
 * Tipografías en un carrusel HORIZONTAL de chips, cada uno en su propia
 * fuente. Horizontal a propósito: una lista vertical con scroll dentro de la
 * hoja —que también hace scroll— era un scroll anidado, y el dedo sobre la
 * lista movía la lista en vez de la hoja. El eje horizontal no compite con el
 * vertical, así que la hoja se sigue desplazando aunque el gesto arranque
 * sobre los chips.
 */
export const FontPicker = ({ fonts, value, onChange }) => {
    const { t } = useTranslation()
    const stripRef = useRef(null)
    const mounted = useRef(false)

    // La elegida queda centrada: de golpe al montar, suave al cambiar. A mano
    // y no con `scrollIntoView`, que desplazaría también la hoja entera.
    useEffect(() => {
        const strip = stripRef.current
        const chip = strip?.querySelector('[data-on="true"]')
        if (!strip || !chip) return
        const left = chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        strip.scrollTo({ left, behavior: mounted.current && !reduce ? 'smooth' : 'instant' })
        mounted.current = true
    }, [value])

    return (
        <div ref={stripRef} className={styles.fontStrip} role="listbox" aria-label={t('mobile_fields.font')}>
            {fonts.map((f) => {
                const on = f === value
                return (
                    <button
                        key={f}
                        type="button"
                        role="option"
                        aria-selected={on}
                        data-on={on || undefined}
                        className={`${styles.fontChip} ${on ? styles.fontChipOn : ''}`}
                        style={{ fontFamily: f }}
                        onClick={() => onChange(f)}
                    >
                        {f}
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
