import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover } from 'antd'
import { ArrowDown, ArrowDownUp, ArrowUp, Ban, Contrast, ImageMinus, ImagePlus, LayoutGrid, Maximize, MoveHorizontal, MoveVertical, SquareRoundCorner } from 'lucide-react'
import { useTextures } from '../../../../context/TexturesContext'
import { EffectsControls, LiveSlider } from './barControls'
import { ColorChooser } from './ColorChooser'
import { ItineraryStylePicker } from './ItineraryStylePicker'
import { GiftStylePicker } from './GiftStylePicker'
import { DestinationStylePicker } from './DestinationStylePicker'
import { GalleryStylePicker } from './GalleryStylePicker'
import { NoticeStylePicker } from './NoticeStylePicker'
import { PeopleStylePicker } from './PeopleStylePicker'
import { GreetingStylePicker } from './GreetingStylePicker'
import { invitationPalette } from './colorUtils'
import { darker } from '../../../../helpers/assets/functions'
import styles from './ElementBar.module.css'

// Barra de fondo de un bloque (arriba de la pieza). El botón "Fondo" abre un
// popover con pestañas (handoff "Panel lateral" 5.2):
//   Color   — el selector de color (con "sin color").
//   Textura — el catálogo de papel (texturas) e intensidad.
//   Foto    — elegir (panel Subidos / banco), quitar y opacidad; la Cita trae
//             sus efectos de imagen (sombra / desenfoque).
// El itinerario, la mesa de regalos, las actividades, la galería, los avisos,
// las personas y la bienvenida suman al inicio "Estilo" (su catálogo,
// en `<bloque>.style`; ver STYLE_PICKERS).
// En la barra quedan invertir, bordes, largo, relleno y sombra. La Cita
// conserva "imagen o color, no los dos". Lo pinta ModuleBackdrop en
// iattend-events.

const MODULE_KEY = { family: 'people' }
const STYLE_PICKERS = { itinerary: ItineraryStylePicker, gifts: GiftStylePicker, destinations: DestinationStylePicker, gallery: GalleryStylePicker, notices: NoticeStylePicker, family: PeopleStylePicker, greeting: GreetingStylePicker }
const TABS = ['color', 'texture', 'photo']

// `onPickShadowColor`: color de la sombra de la imagen de la Cita (popover de color).
export const ModuleBar = ({ section, invitation, setInvitation, setSaved, onPickImage, onPickShadowColor }) => {
    const { t } = useTranslation()
    const { textures } = useTextures()
    const [open, setOpen] = useState(null)
    const [tab, setTab] = useState('color')
    const label = MODULE_KEY[section] ?? section
    const StylePicker = STYLE_PICKERS[section]
    const mod = invitation?.[label] ?? {}
    const bg = mod.dynamic_background ?? {}
    const isQuote = section === 'quote'
    const quoteImage = isQuote && Boolean(mod.image?.active)
    const theme = invitation?.generals?.colors?.secondary ?? '#FFFFFF'
    const color = bg.active && !quoteImage ? (bg.custom_color || theme) : null

    const setBg = (patch, opts) => {
        setInvitation((prev) => ({ ...prev, [label]: { ...prev[label], dynamic_background: { ...prev[label].dynamic_background, ...patch } } }), opts)
        setSaved(false)
    }
    const setMod = (patch) => {
        setInvitation((prev) => ({ ...prev, [label]: { ...prev[label], ...patch } }))
        setSaved(false)
    }
    const setQuoteImage = (patch, opts) => {
        setInvitation((prev) => ({ ...prev, quote: { ...prev.quote, image: { ...prev.quote.image, ...patch } } }), opts)
        setSaved(false)
    }
    // Color del bloque; "sin color" lo apaga. Cita: color o imagen, no los dos.
    const setColor = (c, opts) => {
        setInvitation((prev) => {
            const cur = prev[label]
            const none = c === 'transparent'
            return {
                ...prev,
                [label]: {
                    ...cur,
                    dynamic_background: { ...cur.dynamic_background, active: !none, ...(none ? {} : { custom_color: c }) },
                    ...(isQuote && !none ? { image: { ...cur.image, active: false } } : {}),
                },
            }
        }, opts)
        setSaved(false)
    }

    const pickImage = () => {
        setOpen(null)
        onPickImage(isQuote
            ? (url) => url && setInvitation((prev) => ({
                ...prev,
                quote: { ...prev.quote, image: { ...prev.quote.image, dev: url, prod: url, active: true }, dynamic_background: { ...prev.quote.dynamic_background, active: false } },
            }))
            : (url) => url && setBg({ image: url }))
    }

    // `off`: el ajuste no aplica todavía (sin color ni imagen): botón apagado.
    const pop = (id, content, trigger, off = false) => (off ? trigger : (
        <Popover
            open={open === id}
            onOpenChange={(v) => setOpen(v ? id : null)}
            trigger="click"
            placement="bottom"
            arrow={false}
            content={<div className={styles.pop} data-text-bar onMouseDown={(e) => e.stopPropagation()}>{content}</div>}
        >
            {trigger}
        </Popover>
    ))

    const image = isQuote ? (quoteImage ? (mod.image?.dev || mod.image?.prod || null) : null) : bg.image
    const hasImage = isQuote ? quoteImage : Boolean(bg.image)
    const texture = textures.find((x) => x.id === bg.texture) ?? null
    const off = !(color || hasImage)
    const offProps = off ? { 'aria-disabled': true, 'data-off': true } : {}
    const imageWidth = mod.image?.width ?? (bg.active ? bg.width : 100) ?? 100

    // Muestra del fondo actual en el botón: foto, si no color, si no textura.
    const preview = hasImage
        ? { backgroundImage: `url("${image}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : color ? { background: color }
        : texture ? { backgroundImage: `url("${texture.image}")`, backgroundSize: 'cover' }
        : null

    const tabBody = tab === 'color' ? (
        <ColorChooser value={color ?? 'transparent'} allowNone palette={invitationPalette(invitation)} onChange={setColor} />
    ) : tab === 'texture' ? (
        <div className={styles.fondoBody}>
            <div className={styles.texGrid}>
                <button type="button" className={styles.texCell} data-on={bg.texture == null || undefined} title={t('build_editor.texture_none')} onClick={() => setBg({ texture: null })}>
                    <Ban size={18} />
                </button>
                {textures.map((tex, i) => (
                    <button key={tex.id} type="button" className={styles.texCell} data-on={bg.texture === tex.id || undefined} title={tex.name || t('build_editor.texture_n', { n: i + 1 })} onClick={() => setBg({ texture: tex.id })}>
                        <img src={tex.image} alt="" loading="lazy" />
                    </button>
                ))}
            </div>
            {bg.texture != null && (
                <LiveSlider label={t('build_editor.texture_intensity')} value={Math.round((bg.texture_opacity ?? 1) * 100)} min={10} max={100} step={5} format={(v) => `${v}%`} onChange={(v, o) => setBg({ texture_opacity: v / 100 }, o)} />
            )}
        </div>
    ) : (
        <div className={styles.fondoBody}>
            <div className={styles.photoRow}>
                <span className={styles.photoThumb} style={hasImage ? { backgroundImage: `url("${image}")` } : undefined}>{!hasImage && <ImagePlus size={18} />}</span>
                <button type="button" className={styles.textBtn} onClick={pickImage}>
                    <ImagePlus size={17} /> {hasImage ? t('build_editor.change_image') : t('build_editor.fondo_pick_photo')}
                </button>
                {hasImage && (
                    <button type="button" className={styles.iconBtn} title={t('build_editor.remove_image')} onClick={() => (isQuote ? setQuoteImage({ active: false }) : setBg({ image: null }))}>
                        <ImageMinus size={18} />
                    </button>
                )}
            </div>
            {hasImage && (isQuote ? (
                <EffectsControls
                    t={t}
                    image={mod.image}
                    icons={{ up: ArrowUp, down: ArrowDown, both: ArrowDownUp, full: Maximize }}
                    shadowColor={darker(invitation?.generals?.colors?.primary ?? '#FFFFFF', 0.2)}
                    onChange={(patch, o) => setQuoteImage(patch, o)}
                    onPickShadowColor={() => { setOpen(null); onPickShadowColor?.() }}
                />
            ) : (
                <LiveSlider label={t('build_cover.label_opacity')} value={Math.round((bg.image_opacity ?? 1) * 100)} min={10} max={100} step={5} format={(v) => `${v}%`} onChange={(v, o) => setBg({ image_opacity: v / 100 }, o)} />
            ))}
        </div>
    )

    return (
        <div className={styles.bar} data-edit-keep data-text-bar>
            {StylePicker && (
                <>
                    <Popover
                        open={open === 'style'}
                        onOpenChange={(v) => setOpen(v ? 'style' : null)}
                        trigger="click"
                        // Hacia la izquierda del botón: no tapa la pieza.
                        placement="bottomRight"
                        arrow={false}
                        content={<StylePicker invitation={invitation} value={mod.style} onPick={(id) => setMod({ style: ['1a', 'G1', 'R1', 'P1', 'W1'].includes(id) ? null : id })} />}
                    >
                        <button type="button" className={styles.textBtn} data-on={open === 'style' || undefined}>
                            <LayoutGrid size={17} /> {t('build_editor.cd_style')}
                        </button>
                    </Popover>
                    <span className={styles.divider} />
                </>
            )}
            {pop('fondo', (
                <div className={styles.fondo}>
                    <div className={styles.fondoTabs}>
                        {TABS.map((k) => (
                            <button key={k} type="button" className={styles.fondoTab} data-on={tab === k || undefined} onClick={() => setTab(k)}>
                                {t(`build_editor.fondo_${k}`)}
                            </button>
                        ))}
                    </div>
                    {tabBody}
                </div>
            ), (
                <button type="button" className={styles.textBtn} data-on={open === 'fondo' || undefined}>
                    <span className={styles.swatch} data-empty={!preview || undefined} style={preview ?? undefined} />
                    {t('build_editor.fondo')}
                </button>
            ))}

            {!quoteImage && (
                <button type="button" className={styles.iconBtn} data-on={mod.inverted || undefined} title={t('build_menu.invert_color')} onClick={() => setMod({ inverted: !mod.inverted })}>
                    <Contrast size={18} />
                </button>
            )}

            <span className={styles.divider} />

            {pop('radius', (
                <LiveSlider label={t('build_menu.borders')} value={bg.border_radius ?? 0} min={0} max={99} format={(v) => `${v}px`} onChange={(v, o) => setBg({ border_radius: v }, o)} />
            ), (
                <button type="button" className={styles.iconBtn} data-on={open === 'radius' || undefined} title={t('build_menu.borders')} {...offProps}>
                    <SquareRoundCorner size={18} />
                </button>
            ), off)}
            {pop('width', (
                <LiveSlider
                    label={t('build_menu.width')}
                    value={quoteImage ? imageWidth : (bg.width ?? 100)}
                    min={70} max={100} step={5} format={(v) => `${v}%`}
                    onChange={(v, o) => (quoteImage ? setQuoteImage({ width: v }, o) : setBg({ width: v }, o))}
                />
            ), (
                <button type="button" className={styles.iconBtn} data-on={open === 'width' || undefined} title={t('build_menu.width')} {...offProps}>
                    <MoveHorizontal size={18} />
                </button>
            ), off)}
            {!quoteImage && pop('padding', (
                <LiveSlider label={t('build_editor.bg_padding')} value={bg.padding_y ?? 24} min={0} max={160} step={4} format={(v) => `${v}px`} onChange={(v, o) => setBg({ padding_y: v }, o)} />
            ), (
                <button type="button" className={styles.iconBtn} data-on={open === 'padding' || undefined} title={t('build_editor.bg_padding')} {...offProps}>
                    <MoveVertical size={18} />
                </button>
            ), off)}
            {!quoteImage && (
                <button type="button" className={styles.textBtn} data-on={(bg.shadow && !off) || undefined} onClick={() => !off && setBg({ shadow: !bg.shadow })} {...offProps}>
                    {t('build_menu.shadow')}
                </button>
            )}
        </div>
    )
}
