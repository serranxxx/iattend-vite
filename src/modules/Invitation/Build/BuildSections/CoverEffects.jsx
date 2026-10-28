import { ColorPicker, Segmented, Slider, Tooltip } from 'antd'
import { ArrowDown, ArrowDownUp, ArrowUp, Maximize } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { darker } from '../../../../helpers/assets/functions'
import styles from './CoverEffects.module.css'

// Efectos de la portada: sombra (cover.image.background) o desenfoque
// (cover.image.blur), excluyentes. Sus ajustes van en
// cover.image.shadow_settings / blur_settings y los dibuja iattend-events
// (src/components/Invitation/Cover/coverEffects.ts). Los defaults son los
// mismos de allá: sin ajustes guardados, la portada se ve como siempre.
const SHADOW_DEFAULTS = { strength: 100, direction: 'up', reach: 100 }
const BLUR_DEFAULTS = { amount: 6, direction: 'down', reach: 40 }

const Row = ({ label, children }) => (
    <div className={styles.row}>
        <span className={styles.label}>{label}</span>
        <div className={styles.control}>{children}</div>
    </div>
)

const ValueSlider = ({ value, min, max, unit = '%', onChange }) => (
    <div className={styles.sliderWrap}>
        <Slider className={styles.slider} min={min} max={max} value={value} onChange={onChange} tooltip={{ open: false }} />
        <span className={styles.value}>{value}{unit}</span>
    </div>
)

// Botones de dirección: íconos con tooltip, en una píldora.
const DirectionPicker = ({ value, options, onChange }) => (
    <div className={styles.dirs} role="radiogroup">
        {options.map(({ key, icon, label }) => (
            <Tooltip key={key} title={label}>
                <button
                    type="button"
                    role="radio"
                    aria-checked={value === key}
                    aria-label={label}
                    className={styles.dir}
                    data-on={value === key || undefined}
                    onClick={() => onChange(key)}
                >
                    {icon}
                </button>
            </Tooltip>
        ))}
    </div>
)

export const CoverEffects = ({ image, primary, presets, onChange }) => {
    const { t } = useTranslation()

    const effect = image?.background ? 'shadow' : image?.blur ? 'blur' : 'none'
    const shadow = { ...SHADOW_DEFAULTS, ...(image?.shadow_settings ?? {}) }
    const blur = { ...BLUR_DEFAULTS, ...(image?.blur_settings ?? {}) }
    const defaultShadowColor = darker(primary ?? '#FFFFFF', 0.2)

    const setEffect = (key) => onChange({ background: key === 'shadow', blur: key === 'blur' })
    const setShadow = (patch) => onChange({ shadow_settings: { ...(image?.shadow_settings ?? {}), ...patch } })
    const setBlur = (patch) => onChange({ blur_settings: { ...(image?.blur_settings ?? {}), ...patch } })

    const customized = effect === 'shadow' ? Boolean(image?.shadow_settings) : effect === 'blur' ? Boolean(image?.blur_settings) : false
    const reset = () => onChange(effect === 'shadow' ? { shadow_settings: null } : { blur_settings: null })

    return (
        <div className={styles.effects}>
            <Segmented
                block
                className={styles.segmented}
                value={effect}
                onChange={setEffect}
                options={[
                    { value: 'none', label: t('build_cover.effect_none') },
                    { value: 'shadow', label: t('build_cover.effect_shadow') },
                    { value: 'blur', label: t('build_cover.effect_blur') },
                ]}
            />

            {effect !== 'none' && (
                <div className={styles.panel}>
                    {effect === 'shadow' ? (
                        <>
                            <Row label={t('build_cover.fx_direction')}>
                                <DirectionPicker
                                    value={shadow.direction}
                                    onChange={(direction) => setShadow({ direction })}
                                    options={[
                                        { key: 'up', icon: <ArrowUp size={14} />, label: t('build_cover.dir_from_bottom') },
                                        { key: 'down', icon: <ArrowDown size={14} />, label: t('build_cover.dir_from_top') },
                                        { key: 'both', icon: <ArrowDownUp size={14} />, label: t('build_cover.dir_both') },
                                    ]}
                                />
                            </Row>
                            <Row label={t('build_cover.fx_strength')}>
                                <ValueSlider value={shadow.strength} min={0} max={100} onChange={(strength) => setShadow({ strength })} />
                            </Row>
                            <Row label={t('build_cover.fx_reach')}>
                                <ValueSlider value={shadow.reach} min={10} max={100} onChange={(reach) => setShadow({ reach })} />
                            </Row>
                            <Row label={t('build_cover.fx_color')}>
                                <ColorPicker
                                    size="small"
                                    presets={presets}
                                    disabledAlpha
                                    value={shadow.color || defaultShadowColor}
                                    onChangeComplete={(c) => setShadow({ color: c.toHexString() })}
                                />
                            </Row>
                        </>
                    ) : (
                        <>
                            <Row label={t('build_cover.fx_direction')}>
                                <DirectionPicker
                                    value={blur.direction}
                                    onChange={(direction) => setBlur({ direction })}
                                    options={[
                                        { key: 'down', icon: <ArrowDown size={14} />, label: t('build_cover.dir_bottom') },
                                        { key: 'up', icon: <ArrowUp size={14} />, label: t('build_cover.dir_top') },
                                        { key: 'full', icon: <Maximize size={13} />, label: t('build_cover.dir_full') },
                                    ]}
                                />
                            </Row>
                            <Row label={t('build_cover.fx_amount')}>
                                <ValueSlider value={blur.amount} min={1} max={24} unit="px" onChange={(amount) => setBlur({ amount })} />
                            </Row>
                            {blur.direction !== 'full' && (
                                <Row label={t('build_cover.fx_reach')}>
                                    <ValueSlider value={blur.reach} min={10} max={100} onChange={(reach) => setBlur({ reach })} />
                                </Row>
                            )}
                        </>
                    )}

                    {customized && (
                        <button type="button" className={styles.reset} onClick={reset}>
                            {t('build_cover.fx_reset')}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
