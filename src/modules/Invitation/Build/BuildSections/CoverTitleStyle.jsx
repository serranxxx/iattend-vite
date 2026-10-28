import { ColorPicker, Select, Slider, Switch } from 'antd'
import { useTranslation } from 'react-i18next'
import { useFonts } from '../../../../context/FontsContext'
import { fonts } from '../../../../helpers/assets/fonts'
import { colorFactoryToHex, darker, lighter } from '../../../../helpers/assets/functions'
import ms from './ModuleStyle.module.css'

const { Option } = Select

// Fuera del componente: definidos adentro se volverían a montar en cada
// render y el slider soltaría el arrastre.
const Row = ({ label, children }) => (
    <div className={ms.row}>
        <span className={ms.label}>{label}</span>
        <div className={ms.control}>{children}</div>
    </div>
)
const ValueSlider = ({ value, min, max, step, unit = '', format = (v) => v, onChange }) => (
    <div className={ms.sliderWrap}>
        <Slider className={ms.slider} min={min} max={max} step={step} value={value} onChange={onChange} tooltip={{ open: false }} />
        <span className={ms.value}>{format(value)}{unit}</span>
    </div>
)

// Tipografía del título de la portada: letra, tamaño, opacidad, grosor y
// color. Es el popover del engrane junto al campo "Título" del panel de
// Portada (BuildCover) y también el del botón que aparece sobre la pieza al
// elegir el título en el modo edición (EditCanvas).
//
// Con target="quote" es la "T" del texto de la Cita (quote.text.font), con
// su ancho y la sombra sobre la imagen además de lo de siempre.
export const CoverTitleStyle = ({ invitation, setInvitation, setSaved, fontOptions, newFonts = [], target = 'cover' }) => {
    const isQuote = target === 'quote'
    const { t } = useTranslation()
    const { fonts: activeFonts } = useFonts()
    const options = fontOptions ?? (activeFonts.length ? activeFonts : fonts)
    const text = (isQuote ? invitation?.quote?.text?.font : invitation?.cover?.title?.text) ?? {}
    const { primary, secondary } = invitation?.generals?.colors ?? {}

    const presets = [
        {
            label: t('build_cover.preset_bg'),
            colors: [0.3, 0.5, 0.7, 0.9].map((f) => darker(primary, f)).concat([primary], [0.9, 0.7, 0.5, 0.3, 0.1].map((f) => lighter(primary, f))),
        },
        {
            label: t('build_cover.preset_contrast'),
            colors: [0.3, 0.5, 0.7, 0.9].map((f) => darker(secondary, f)).concat([secondary], [0.9, 0.7, 0.5, 0.3, 0.1].map((f) => lighter(secondary, f))),
        },
    ]

    const setText = (patch) => {
        setInvitation((prev) => (isQuote
            ? { ...prev, quote: { ...prev.quote, text: { ...prev.quote.text, font: { ...prev.quote.text.font, ...patch } } } }
            : { ...prev, cover: { ...prev.cover, title: { ...prev.cover.title, text: { ...prev.cover.title.text, ...patch } } } }))
        setSaved(false)
    }
    // Solo cita: ancho del texto y sombra sobre la imagen (quote.text).
    const setQuoteText = (patch) => {
        setInvitation((prev) => ({ ...prev, quote: { ...prev.quote, text: { ...prev.quote.text, ...patch } } }))
        setSaved(false)
    }

    // Compacto, como los paneles de fondo y separador: etiqueta a la
    // izquierda y control a la derecha.
    return (
        <div className={ms.panel}>
            <Select
                value={text.typeFace}
                onChange={(typeFace) => setText({ typeFace })}
                style={{ width: '100%', fontFamily: `"${text.typeFace}"` }}>
                {options.map((font, index) => (
                    <Option key={index} value={font}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ fontFamily: `"${font}"` }}>{font}</span>
                            {newFonts.includes(font) && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ff4d4f', flexShrink: 0 }} />}
                        </span>
                    </Option>
                ))}
            </Select>

            <div className={ms.body}>
                <Row label={t('build_cover.label_size')}>
                    <ValueSlider min={8} max={isQuote ? 44 : 96} step={2} value={text.size || 16} unit="px" onChange={(size) => setText({ size })} />
                </Row>
                {isQuote && (
                    <Row label={t('build_menu.width')}>
                        <ValueSlider min={40} max={100} step={5} value={invitation?.quote?.text?.width || 100} unit="%" onChange={(width) => setQuoteText({ width })} />
                    </Row>
                )}
                <Row label={t('build_cover.label_opacity')}>
                    <ValueSlider min={0} max={1} step={0.01} value={text.opacity ?? 1} format={(v) => Math.round(v * 100)} unit="%" onChange={(opacity) => setText({ opacity })} />
                </Row>
                <Row label={t('build_cover.label_weight')}>
                    <ValueSlider min={100} max={1000} step={100} value={text.weight ?? 400} onChange={(weight) => setText({ weight })} />
                </Row>
                <Row label={t('build_cover.label_color')}>
                    <ColorPicker
                        size="small"
                        presets={presets}
                        disabledAlpha={false}
                        value={text.color}
                        onChangeComplete={(c) => setText({ color: colorFactoryToHex(c) })} />
                </Row>
                {isQuote && (
                    <Row label={t('build_menu.shadow')}>
                        <Switch size='small' checked={Boolean(invitation?.quote?.text?.shadow)} onChange={(shadow) => setQuoteText({ shadow })} />
                    </Row>
                )}
            </div>
        </div>
    )
}
