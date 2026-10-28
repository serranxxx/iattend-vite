import { useState } from 'react'
import { ColorPicker, Segmented, Select, Slider } from 'antd'
import { useTranslation } from 'react-i18next'
import { useFonts } from '../../../../context/FontsContext'
import { fonts } from '../../../../helpers/assets/fonts'
import { colorFactoryToHex } from '../../../../helpers/assets/functions'
import styles from './ModuleStyle.module.css'

const { Option } = Select

// Tipografía de toda la invitación (generals.fonts): títulos y cuerpo en un
// solo panel con un selector arriba. Son los mismos datos que los botones
// "Títulos" y "Cuerpo" de Ajustes generales (BuildGenerals); este es el que
// abre la "T" sobre la lista de módulos en el modo edición.

const Row = ({ label, children }) => (
    <div className={styles.row}>
        <span className={styles.label}>{label}</span>
        <div className={styles.control}>{children}</div>
    </div>
)

const ValueSlider = ({ value, min, max, step, unit = '', format = (v) => v, onChange }) => (
    <div className={styles.sliderWrap}>
        <Slider className={styles.slider} min={min} max={max} step={step} value={value} onChange={onChange} tooltip={{ open: false }} />
        <span className={styles.value}>{format(value)}{unit}</span>
    </div>
)

// `embedded`: dentro del panel de herramienta del editor (sin su propio ancho
// ni padding).
export const TypographyPanel = ({ invitation, setInvitation, setSaved, newFonts = [], embedded = false }) => {
    const { t } = useTranslation()
    const { fonts: activeFonts } = useFonts()
    const options = activeFonts.length ? activeFonts : fonts
    const [part, setPart] = useState('titles')
    const isTitles = part === 'titles'

    const titles = invitation?.generals?.fonts?.titles ?? {}
    const body = invitation?.generals?.fonts?.body ?? {}
    const accent = invitation?.generals?.colors?.accent ?? '#000000'
    const cur = isTitles ? titles : body

    const set = (patch) => {
        setInvitation((prev) => ({
            ...prev,
            generals: {
                ...prev.generals,
                fonts: { ...prev.generals.fonts, [part]: { ...prev.generals.fonts[part], ...patch } },
            },
        }))
        setSaved(false)
    }

    // Mismos valores por omisión que BuildGenerals (0 = "sin definir").
    const typeFace = isTitles ? (titles.typeFace ?? body.typeFace) : body.typeFace
    const size = titles.size === 0 ? 18 : (titles.size ?? 18)
    const weight = isTitles ? (titles.weight === 0 ? 600 : (titles.weight ?? 600)) : (body.weight ?? 500)
    const color = titles.color === '#000000' ? accent : (titles.color ?? accent)

    return (
        <div className={embedded ? styles.panelEmbedded : styles.panel}>
            <Segmented
                block
                className={styles.segmented}
                value={part}
                onChange={setPart}
                options={[
                    { value: 'titles', label: t('build_editor.font_titles') },
                    { value: 'body', label: t('build_editor.font_body') },
                ]}
            />

            <Select
                value={typeFace}
                onChange={(value) => set({ typeFace: value })}
                style={{ width: '100%', fontFamily: `"${typeFace}"` }}
            >
                {options.map((font) => (
                    <Option key={font} value={font}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ fontFamily: `"${font}"` }}>{font}</span>
                            {newFonts.includes(font) && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ff4d4f', flexShrink: 0 }} />}
                        </span>
                    </Option>
                ))}
            </Select>

            <div className={styles.body}>
                {isTitles && (
                    <Row label={t('build_cover.label_size')}>
                        <ValueSlider min={8} max={36} step={2} value={size} unit="px" onChange={(v) => set({ size: v })} />
                    </Row>
                )}
                <Row label={t('build_cover.label_opacity')}>
                    <ValueSlider min={0.1} max={1} step={0.01} value={cur.opacity ?? 1} format={(v) => Math.round(v * 100)} unit="%" onChange={(v) => set({ opacity: v })} />
                </Row>
                <Row label={t('build_cover.label_weight')}>
                    <ValueSlider min={100} max={1000} step={100} value={weight} onChange={(v) => set({ weight: v })} />
                </Row>
                {/* El cuerpo toma el color de texto del tema (como en Ajustes generales). */}
                {isTitles && (
                    <Row label={t('build_cover.label_color')}>
                        <ColorPicker size="small" disabledAlpha value={color} onChangeComplete={(c) => set({ color: colorFactoryToHex(c) })} />
                    </Row>
                )}
            </div>
        </div>
    )
}
