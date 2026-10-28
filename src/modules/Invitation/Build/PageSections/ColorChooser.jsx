import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Pipette } from 'lucide-react'
import { SOLIDS, hexToHsv, hsvToHex, normalizeHex, pushRecent, readRecent } from './colorUtils'
import styles from './ColorChooser.module.css'

// Selector de color de las barras (handoff "Panel lateral" 5.1), 300px:
//   1. Segmented (p. ej. Texto / Fondo) cuando el botón cubre dos colores.
//   2. "De tu paleta": los colores de la invitación, siempre primero.
//   3. "Usados recientemente": los últimos 5 (localStorage).
//   4. Picker: área saturación / brillo + tono, campo HEX y cuentagotas
//      (EyeDropper, donde el navegador lo tiene).
//   5. "Más colores": la grilla de sólidos de siempre.
// `onChange(hex, { snapshot })`: mientras se arrastra el picker solo el
// primer movimiento guarda deshacer (como LiveSlider). `allowNone` agrega
// "sin color" (`transparent`).

const PickerArea = ({ value, onChange }) => {
    const [hsv, setHsv] = useState(() => hexToHsv(value))
    const area = useRef(null)
    const hue = useRef(null)
    // Si cambia por fuera (paleta, HEX), el picker lo sigue.
    useEffect(() => {
        if (normalizeHex(value) && normalizeHex(value) !== hsvToHex(hsv)) setHsv(hexToHsv(value))
    }, [value])

    const drag = (e, ref, compute) => {
        const el = ref.current
        if (!el) return
        e.preventDefault()
        let first = true
        const move = (ev) => {
            const r = el.getBoundingClientRect()
            const next = compute(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)))
            setHsv(next)
            onChange(hsvToHex(next), { snapshot: first })
            first = false
        }
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        move(e)
    }

    return (
        <>
            <div
                ref={area}
                className={styles.area}
                style={{ background: `hsl(${hsv.h} 100% 50%)` }}
                onPointerDown={(e) => drag(e, area, (x, y) => ({ ...hsv, s: x, v: 1 - y }))}
            >
                <span className={styles.areaThumb} style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hsvToHex(hsv) }} />
            </div>
            <div ref={hue} className={styles.hue} onPointerDown={(e) => drag(e, hue, (x) => ({ ...hsv, h: x * 359 }))}>
                <span className={styles.hueThumb} style={{ left: `${(hsv.h / 359) * 100}%`, background: `hsl(${hsv.h} 100% 50%)` }} />
            </div>
        </>
    )
}

export const ColorChooser = ({ value, onChange, palette = [], allowNone = false, modes, mode, onMode }) => {
    const { t } = useTranslation()
    const [recent, setRecent] = useState(readRecent)
    const [more, setMore] = useState(false)
    const [hex, setHex] = useState(value && value !== 'transparent' ? value.toUpperCase() : '')
    useEffect(() => { setHex(value && value !== 'transparent' ? value.toUpperCase() : '') }, [value])

    const current = (value ?? '').toUpperCase()
    // Elegir un color "terminado" (paleta, recientes, sólidos, HEX): entra a
    // recientes y guarda deshacer.
    const pick = (c) => {
        onChange(c, { snapshot: true })
        if (c !== 'transparent') { pushRecent(c); setRecent(readRecent()) }
    }
    const swatch = (c) => (
        <button key={c} type="button" className={styles.swatch} data-on={current === c.toUpperCase() || undefined} style={{ background: c }} title={c} onClick={() => pick(c)} />
    )
    const eyedropper = typeof window !== 'undefined' && 'EyeDropper' in window

    return (
        <div className={styles.wrap} onMouseDown={(e) => e.stopPropagation()}>
            {modes?.length > 1 && (
                <div className={styles.modes}>
                    {modes.map((m) => (
                        <button key={m.key} type="button" className={styles.mode} data-on={mode === m.key || undefined} onClick={() => onMode(m.key)}>{m.label}</button>
                    ))}
                </div>
            )}

            <div className={styles.group}>
                <span className={styles.label}>{t('build_editor.cc_palette')}</span>
                <div className={styles.row}>
                    {allowNone && <button type="button" className={`${styles.swatch} ${styles.none}`} data-on={value === 'transparent' || undefined} title={t('build_editor.color_none')} onClick={() => pick('transparent')} />}
                    {palette.map(swatch)}
                </div>
            </div>

            {recent.length > 0 && (
                <div className={styles.group}>
                    <span className={styles.label}>{t('build_editor.cc_recent')}</span>
                    <div className={styles.row}>{recent.map(swatch)}</div>
                </div>
            )}

            <PickerArea value={value && value !== 'transparent' ? value : '#6D3CFA'} onChange={(c, o) => onChange(c, o)} />

            <div className={styles.hexRow}>
                <span className={styles.hexPreview} style={{ background: normalizeHex(hex) ?? 'transparent' }} />
                <input
                    className={styles.hexInput}
                    value={hex}
                    maxLength={7}
                    placeholder="#000000"
                    onChange={(e) => setHex(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter' && normalizeHex(hex)) pick(normalizeHex(hex)) }}
                    onBlur={() => { const n = normalizeHex(hex); if (n && n !== current) pick(n) }}
                />
                {eyedropper && (
                    <button
                        type="button"
                        className={styles.iconBtn}
                        title={t('build_editor.cc_eyedropper')}
                        onClick={async () => {
                            try { const r = await new window.EyeDropper().open(); if (r?.sRGBHex) pick(normalizeHex(r.sRGBHex)) } catch { /* cancelado */ }
                        }}
                    >
                        <Pipette size={16} />
                    </button>
                )}
            </div>

            <button type="button" className={styles.more} onClick={() => setMore((v) => !v)}>
                {t('build_editor.cc_more')} <ChevronRight size={14} data-open={more || undefined} />
            </button>
            {more && <div className={styles.solids}>{SOLIDS.map(swatch)}</div>}
        </div>
    )
}
