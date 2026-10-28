import { useEffect, useRef, useState } from 'react'
import { Slider } from 'antd'
import styles from './ElementBar.module.css'

// Slider de las barras del editor (elemento, texto, fondo). Aplica el cambio
// en vivo mientras se arrastra; solo el primer movimiento de cada arrastre
// abre una entrada en deshacer (`{ snapshot }`, para setActiveField), así un
// arrastre se deshace de un jalón.
export const LiveSlider = ({ label, value, min, max, step = 1, format = (v) => v, onChange }) => {
    const [local, setLocal] = useState(value)
    const dragging = useRef(false)
    useEffect(() => { if (!dragging.current) setLocal(value) }, [value])
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
