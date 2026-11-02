import { useEffect, useRef, useState } from 'react'
import { Slider } from 'antd'
import styles from './ElementBar.module.css'

// Slider de las barras del editor (elemento, texto, fondo). Aplica el cambio
// en vivo mientras se arrastra; solo el primer movimiento de cada arrastre
// abre una entrada en deshacer (`{ snapshot }`, para setActiveField), así un
// arrastre se deshace de un jalón.
// En el celular (≤ 750 px) no hay slider: cinco opciones ya hechas, del
// mínimo al máximo, en un riel gris con la elegida en blanco (como los
// grosores del pincel, AjustesPincel). Arrastrar con el dedo un slider de
// 200 px era impreciso.
const MOVIL = '(max-width: 750px)'
const useEsMovil = () => {
    const [movil, setMovil] = useState(() => typeof window !== 'undefined' && window.matchMedia(MOVIL).matches)
    useEffect(() => {
        const mq = window.matchMedia(MOVIL)
        const cambio = () => setMovil(mq.matches)
        mq.addEventListener('change', cambio)
        return () => mq.removeEventListener('change', cambio)
    }, [])
    return movil
}
const OPCIONES = 5
const opcionesDe = (min, max, step) => {
    const lista = Array.from({ length: OPCIONES }, (_, i) => {
        const v = min + ((max - min) * i) / (OPCIONES - 1)
        return Math.round(Math.round(v / step) * step * 1000) / 1000
    })
    return [...new Set(lista)]
}
const cercana = (lista, v) => lista.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a), lista[0])

export const LiveSlider = ({ label, value, min, max, step = 1, format = (v) => v, onChange }) => {
    const [local, setLocal] = useState(value)
    const dragging = useRef(false)
    const movil = useEsMovil()
    useEffect(() => { if (!dragging.current) setLocal(value) }, [value])
    if (movil) {
        const opciones = opcionesDe(min, max, step)
        const elegida = cercana(opciones, Number(value) || 0)
        return (
            <div className={styles.sliderRow}>
                <span className={styles.popLabel}>{label}</span>
                <div className={styles.opciones} role="radiogroup" aria-label={label}>
                    {opciones.map((v) => (
                        <button
                            key={v}
                            type="button"
                            role="radio"
                            aria-checked={v === elegida}
                            className={styles.opcion}
                            data-on={v === elegida || undefined}
                            onClick={() => onChange(v, { snapshot: true })}
                        >
                            {format(v)}
                        </button>
                    ))}
                </div>
            </div>
        )
    }
    return (
        <div className={styles.sliderRow}>
            <span className={styles.popLabel}>{label}</span>
            <div className={styles.sliderLine}>
                <Slider
                    className={styles.slider}
                    min={min}
                    max={max}
                    step={step}
                    value={local}
                    onChange={(v) => {
                        setLocal(v)
                        onChange(v, { snapshot: !dragging.current })
                        dragging.current = true
                    }}
                    onChangeComplete={() => { dragging.current = false }}
                    tooltip={{ open: false }}
                />
                <span className={styles.sliderValue}>{format(local)}</span>
            </div>
        </div>
    )
}

// Efectos de una imagen (sombra o desenfoque; mismos campos que CoverEffects:
// background / blur, shadow_settings / blur_settings) en formato plano para
// los popovers de las barras. El color de la sombra se elige en el panel
// "Color" (onPickShadowColor).
const SHADOW_DEFAULTS = { strength: 100, direction: 'up', reach: 100 }
const BLUR_DEFAULTS = { amount: 6, direction: 'down', reach: 40 }

export const EffectsControls = ({ image, onChange, onPickShadowColor, shadowColor, t, icons }) => {
    const effect = image?.background ? 'shadow' : image?.blur ? 'blur' : 'none'
    const shadow = { ...SHADOW_DEFAULTS, ...(image?.shadow_settings ?? {}) }
    const blur = { ...BLUR_DEFAULTS, ...(image?.blur_settings ?? {}) }
    const setShadow = (patch, o) => onChange({ shadow_settings: { ...(image?.shadow_settings ?? {}), ...patch } }, o)
    const setBlur = (patch, o) => onChange({ blur_settings: { ...(image?.blur_settings ?? {}), ...patch } }, o)
    const customized = effect === 'shadow' ? Boolean(image?.shadow_settings) : effect === 'blur' ? Boolean(image?.blur_settings) : false
    const dirs = effect === 'shadow'
        ? [['up', icons.up, 'build_cover.dir_from_bottom'], ['down', icons.down, 'build_cover.dir_from_top'], ['both', icons.both, 'build_cover.dir_both']]
        : [['down', icons.down, 'build_cover.dir_bottom'], ['up', icons.up, 'build_cover.dir_top'], ['full', icons.full, 'build_cover.dir_full']]
    const dir = effect === 'shadow' ? shadow.direction : blur.direction

    return (
        <>
            <div className={styles.chipRow}>
                {[['none', 'build_cover.effect_none'], ['shadow', 'build_cover.effect_shadow'], ['blur', 'build_cover.effect_blur']].map(([key, label]) => (
                    <button key={key} type="button" className={styles.chip} data-on={effect === key || undefined} onClick={() => onChange({ background: key === 'shadow', blur: key === 'blur' })}>
                        {t(label)}
                    </button>
                ))}
            </div>
            {effect !== 'none' && (
                <>
                    <div className={styles.switchRow}>
                        <span className={styles.popLabel}>{t('build_cover.fx_direction')}</span>
                        <div className={styles.chipRow}>
                            {dirs.map(([key, , label]) => {
                                const DirIcon = dirs.find((d) => d[0] === key)[1]
                                return (
                                    <button key={key} type="button" className={styles.chip} data-on={dir === key || undefined} title={t(label)} onClick={() => (effect === 'shadow' ? setShadow({ direction: key }) : setBlur({ direction: key }))}>
                                        <DirIcon size={14} />
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    {effect === 'shadow' ? (
                        <>
                            <LiveSlider label={t('build_cover.fx_strength')} value={shadow.strength} min={0} max={100} format={(v) => `${v}%`} onChange={(v, o) => setShadow({ strength: v }, o)} />
                            <LiveSlider label={t('build_cover.fx_reach')} value={shadow.reach} min={10} max={100} format={(v) => `${v}%`} onChange={(v, o) => setShadow({ reach: v }, o)} />
                            <div className={styles.switchRow}>
                                <span className={styles.popLabel}>{t('build_cover.fx_color')}</span>
                                <button type="button" className={styles.swatchBtn} onClick={onPickShadowColor} title={t('build_cover.fx_color')}>
                                    <span className={styles.swatch} style={{ background: shadow.color || shadowColor }} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <LiveSlider label={t('build_cover.fx_amount')} value={blur.amount} min={1} max={24} format={(v) => `${v}px`} onChange={(v, o) => setBlur({ amount: v }, o)} />
                            {blur.direction !== 'full' && (
                                <LiveSlider label={t('build_cover.fx_reach')} value={blur.reach} min={10} max={100} format={(v) => `${v}%`} onChange={(v, o) => setBlur({ reach: v }, o)} />
                            )}
                        </>
                    )}
                    {customized && (
                        <button type="button" className={styles.linkBtn} onClick={() => onChange(effect === 'shadow' ? { shadow_settings: null } : { blur_settings: null })}>
                            {t('build_cover.fx_reset')}
                        </button>
                    )}
                </>
            )}
        </>
    )
}
