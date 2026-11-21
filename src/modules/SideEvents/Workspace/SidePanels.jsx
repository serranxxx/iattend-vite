import { useTranslation } from 'react-i18next'
import { Popover, Segmented, Tooltip } from 'antd'
import { ImagePlus, Plus, X } from 'lucide-react'
import { LiveSlider } from '../../Invitation/Build/PageSections/barControls'
import { SelectorColor } from '../SelectorColor'
import { ColoresIOS } from '../../Editor/ColoresIOS'
import { ItinerarioPop } from '../ItinerarioPop'
import { COLOR_INICIAL, COLORES_EFECTO, esColorPropio, MAX_IMAGENES_EFECTO, MOVIMIENTOS_IMAGEN, TAMANO_IMAGEN_INICIAL, TAMANO_IMAGEN_MAX, TIPOS_EFECTO } from '../efectosData'
import { esImagen } from '../stickersPopData'
import { COLORES_STICKER, ESTILOS_BLOQUE, MINI_ESTILO, STICKER_AMARILLO, acentoSticker, estiloDe } from '../estilosBloque'
import { PINCEL, PINCELES } from '../../Editor/dibujoData'
import { AjustesPincel } from './AjustesPincel'
import base from '../../Invitation/Build/PageSections/ToolPanels.module.css'
import ed from '../SideEventEditor.module.css'
import own from './SideWorkspace.module.css'

// Contenido propio de los paneles Diseño e Itinerario de un side event / Pop
// (lo que solo existe ahí: color del tema, velo, efectos, mini itinerario).
// Elementos, Fotos y Subidos son los mismos paneles de la invitación. Todo
// va dentro de EditorShell.

// Tintes sugeridos para el tema (los de siempre).
const THEME_SWATCHES = ['#16323d', '#000000', '#E7E0CC', '#B9BBA6', '#D1BEDD', '#C67C6C']
const VELO_INICIAL = 35
const EMOJI_EFECTO = { none: '⊘', sparkles: '✨', confetti: '🎉', bubbles: '🫧', snow: '❄️', petals: '🌸', imagenes: '🖼️' }

// Muestra de cada color fijo de los efectos (el del tema se pinta aparte).
const MUESTRA_COLOR = {
    white: '#FFFFFF',
    gold: 'linear-gradient(135deg, #FFF1B8, #F7D774 45%, #E9B949)',
    multi: 'conic-gradient(#FF6FA5, #FFC94D, #5BD1C7, #8C7CFF, #FF8A5C, #FF6FA5)',
}

// Color de las partículas: tema, blanco, dorado, multicolor o uno propio
// (ColoresIOS, se guarda en #RRGGBB en `effect.color`).
const ColorEfecto = ({ efecto, colorTema, onChange }) => {
    const { t } = useTranslation()
    const valor = efecto.color ?? COLOR_INICIAL[efecto.type] ?? 'theme'
    const propio = esColorPropio(valor)
    return (
        <div className={own.stickerColores} style={{ marginTop: 8 }}>
            <span className={base.groupLabel}>{t('side_events.effect_color')}</span>
            <div className={own.swatchRow}>
                {COLORES_EFECTO.map((c) => (
                    <Tooltip key={c} title={t(`side_events.effect_color_${c}`)}>
                        <button
                            type="button"
                            className={own.swatch}
                            data-on={valor === c || undefined}
                            style={{ background: c === 'theme' ? colorTema : MUESTRA_COLOR[c] }}
                            aria-label={t(`side_events.effect_color_${c}`)}
                            aria-pressed={valor === c}
                            onClick={() => onChange({ color: c })}
                        />
                    </Tooltip>
                ))}
                <Popover
                    trigger="click"
                    placement="right"
                    arrow={false}
                    content={(
                        <div data-text-bar style={{ width: 280 }}>
                            <ColoresIOS value={propio ? valor : '#FFFFFF'} onChange={(hex, o) => onChange({ color: hex }, o)} conGuardados={false} />
                        </div>
                    )}
                >
                    <Tooltip title={t('side_events.effect_color_custom')}>
                        <button
                            type="button"
                            className={`${own.swatch} ${own.swatchPropio}`}
                            data-on={propio || undefined}
                            style={propio ? { background: valor } : undefined}
                            aria-label={t('side_events.effect_color_custom')}
                        >
                            <Plus size={14} />
                        </button>
                    </Tooltip>
                </Popover>
            </div>
        </div>
    )
}

// Mis PNG: las imágenes del efecto (hasta MAX_IMAGENES_EFECTO), sacadas de
// los PNG / stickers que ya están en la pieza o de Subidos (`onPickImage`,
// solo escritorio), cómo se mueven y su tamaño.
const ImagenesEfecto = ({ efecto, enPieza, onChange, onPickImage }) => {
    const { t } = useTranslation()
    const imagenes = Array.isArray(efecto.images) ? efecto.images : []
    const lleno = imagenes.length >= MAX_IMAGENES_EFECTO
    const agregar = (url) => {
        if (!url || imagenes.includes(url) || lleno) return
        onChange({ images: [...imagenes, url] })
    }
    const sugeridas = enPieza.filter((u) => !imagenes.includes(u))
    return (
        <div className={own.stickerColores} style={{ marginTop: 8 }}>
            <span className={base.groupLabel}>{t('side_events.effect_images_label')}</span>
            <span className={base.hint} style={{ marginTop: 0 }}>{t(imagenes.length ? 'side_events.effect_images_hint' : 'side_events.effect_images_empty', { max: MAX_IMAGENES_EFECTO })}</span>
            <div className={own.efectoImgs}>
                {imagenes.map((url) => (
                    <span key={url} className={own.efectoImg}>
                        <img src={url} alt="" draggable={false} />
                        <button type="button" className={own.efectoImgQuitar} aria-label={t('side_events.effect_images_remove')} onClick={() => onChange({ images: imagenes.filter((u) => u !== url) })}>
                            <X size={11} strokeWidth={2.6} />
                        </button>
                    </span>
                ))}
                {onPickImage && !lleno && (
                    <Tooltip title={t('side_events.effect_images_pick')}>
                        <button type="button" className={`${own.efectoImg} ${own.efectoImgMas}`} aria-label={t('side_events.effect_images_pick')} onClick={() => onPickImage(agregar)}>
                            <ImagePlus size={18} />
                        </button>
                    </Tooltip>
                )}
            </div>
            {sugeridas.length > 0 && !lleno && (
                <>
                    <span className={base.hint} style={{ marginTop: 4 }}>{t('side_events.effect_images_from_piece')}</span>
                    <div className={own.efectoImgs}>
                        {sugeridas.map((url) => (
                            <button key={url} type="button" className={`${own.efectoImg} ${own.efectoImgSugerida}`} aria-label={t('side_events.effect_images_add')} onClick={() => agregar(url)}>
                                <img src={url} alt="" draggable={false} />
                                <span className={own.efectoImgAgregar}><Plus size={12} strokeWidth={2.6} /></span>
                            </button>
                        ))}
                    </div>
                </>
            )}
            <Segmented
                block
                size="small"
                style={{ marginTop: 6 }}
                value={efecto.motion ?? 'caer'}
                onChange={(v) => onChange({ motion: v })}
                options={MOVIMIENTOS_IMAGEN.map((m) => ({ value: m, label: t(`side_events.effect_motion_${m}`) }))}
            />
            <LiveSlider label={t('side_events.effect_size')} value={efecto.size ?? TAMANO_IMAGEN_INICIAL} min={20} max={TAMANO_IMAGEN_MAX} format={(v) => `${v}%`} onChange={(v, o) => onChange({ size: v }, o)} />
        </div>
    )
}


// Miniatura de un estilo de bloques: la foto del Pop (o el degradado del
// tema) con una tarjetita de ese estilo encima.
const MiniEstilo = ({ estilo, color, imagen }) => (
    <span className={own.estiloMini} style={imagen ? undefined : { background: `linear-gradient(160deg, ${color}, color-mix(in srgb, ${color} 60%, #000))` }} aria-hidden>
        {imagen && <img src={imagen} alt='' />}
        <span style={{ ...MINI_ESTILO[estilo], ...(estilo === 'tema' ? { background: color } : {}) }} />
    </span>
)

/* ── Diseño: color del tema, estilo de bloques (Pop), velo y efectos ── */
// `movil`: el drawer del editor del celular (EditorMovil): el color del tema
// se elige con la cuadrícula estilo iOS (ColoresIOS) en lugar del selector.
export const DesignPanel = ({ current, setBody, esPop, movil = false, onPickImage = null }) => {
    const { t } = useTranslation()
    const body = current?.body ?? {}
    const color = body.color ?? '#000000'
    const veil = body.veil ?? 0
    const efecto = body.effect ?? null
    const cambiarEfecto = (patch, o) => setBody({ effect: { ...efecto, ...patch } }, o)
    // PNG / stickers que ya están en la pieza (para Mis PNG), sin repetir.
    const pngsEnPieza = [...new Set((Array.isArray(body.stickers) ? body.stickers : []).filter((x) => esImagen(x) && x.url).map((x) => x.url))]
    const elegirEfecto = (tipo) => {
        if (!tipo) return setBody({ effect: null })
        if (tipo === 'imagenes') {
            return setBody({ effect: {
                type: 'imagenes',
                intensity: efecto?.intensity ?? 30,
                images: efecto?.images?.length ? efecto.images : pngsEnPieza.slice(0, 3),
                motion: efecto?.motion ?? 'caer',
                size: efecto?.size ?? TAMANO_IMAGEN_INICIAL,
            } })
        }
        // Al cambiar de efecto se conserva el color propio que ya se eligió.
        setBody({ effect: { type: tipo, intensity: efecto?.intensity ?? 50, color: esColorPropio(efecto?.color) ? efecto.color : COLOR_INICIAL[tipo] } })
    }

    return (
        <>
            <div className={base.group}>
                <span className={base.groupLabel}>{t('side_events.theme_color')}</span>
                <span className={base.hint} style={{ marginTop: 0 }}>{t('side_events.panel_color_hint')}</span>
                {movil ? (
                    <ColoresIOS value={color} onChange={(hex, o) => setBody({ color: hex }, o)} className={own.coloresMovil} cabeza={false} conGuardados={false} />
                ) : esPop ? (
                    // Pop en escritorio: el mismo selector estilo iOS del
                    // dibujo (cuentagotas, Cuadrícula · Espectro · Deslizadores
                    // y colores guardados), a lo ancho del panel.
                    <ColoresIOS value={color} onChange={(hex, o) => setBody({ color: hex }, o)} className={own.coloresMovil} />
                ) : (
                    <>
                        <SelectorColor value={color} onChange={(hex) => setBody({ color: hex })} imagenFondo={body.image} />
                        <div className={own.swatchRow}>
                            {THEME_SWATCHES.map((c) => (
                                <button key={c} type="button" className={own.swatch} data-on={color.toLowerCase() === c.toLowerCase() || undefined} style={{ background: c }} aria-label={c} onClick={() => setBody({ color: c })} />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Estilo de bloques (handoff "Estilo de bloques del Pop"):
                la piel de todas las tarjetas de la página. body.blockStyle;
                vidrio = sin valor (lo de siempre). */}
            {esPop && (
                <div className={base.group}>
                    <span className={base.groupLabel}>{t('side_events.block_style')}</span>
                    <span className={base.hint} style={{ marginTop: 0 }}>{t('side_events.block_style_hint')}</span>
                    <div className={ed.efectoGrid}>
                        {ESTILOS_BLOQUE.map((id) => (
                            <button
                                key={id}
                                type='button'
                                className={`${ed.efectoTile} ${estiloDe(body) === id ? ed.efectoTileActivo : ''}`}
                                aria-pressed={estiloDe(body) === id}
                                onClick={() => setBody({ blockStyle: id === 'vidrio' ? null : id })}
                            >
                                <MiniEstilo estilo={id} color={color} imagen={body.image} />
                                {t(`side_events.block_style_${id}`)}
                            </button>
                        ))}
                    </div>
                    {/* Sticker: el color con el que combina (body.stickerColor):
                        uno de la paleta, el del tema o uno propio. */}
                    {estiloDe(body) === 'sticker' && (
                        <div className={own.stickerColores}>
                            <span className={base.groupLabel}>{t('side_events.sticker_color')}</span>
                            <span className={base.hint} style={{ marginTop: 0 }}>{t('side_events.sticker_color_hint')}</span>
                            <div className={own.swatchRow}>
                                {COLORES_STICKER.map((c) => {
                                    const on = !body.stickerColor ? c === STICKER_AMARILLO : body.stickerColor.toLowerCase() === c.toLowerCase()
                                    return (
                                        <button key={c} type="button" className={own.swatch} data-on={on || undefined} style={{ background: c }} aria-label={c} onClick={() => setBody({ stickerColor: c === STICKER_AMARILLO ? null : c })} />
                                    )
                                })}
                                <button
                                    type="button"
                                    className={`${own.swatch} ${own.swatchTema}`}
                                    data-on={body.stickerColor === 'tema' || undefined}
                                    style={{ background: color }}
                                    title={t('side_events.sticker_color_theme')}
                                    aria-label={t('side_events.sticker_color_theme')}
                                    onClick={() => setBody({ stickerColor: 'tema' })}
                                >
                                    <span>{t('side_events.sticker_color_theme_short')}</span>
                                </button>
                                <Popover
                                    trigger="click"
                                    placement="right"
                                    arrow={false}
                                    content={(
                                        <div data-text-bar style={{ width: 280 }}>
                                            <ColoresIOS value={acentoSticker(body)} onChange={(hex, o) => setBody({ stickerColor: hex }, o)} conGuardados={false} />
                                        </div>
                                    )}
                                >
                                    <button
                                        type="button"
                                        className={`${own.swatch} ${own.swatchPropio}`}
                                        data-on={(body.stickerColor && body.stickerColor !== 'tema' && !COLORES_STICKER.some((c) => c.toLowerCase() === body.stickerColor.toLowerCase())) || undefined}
                                        style={body.stickerColor && body.stickerColor !== 'tema' && !COLORES_STICKER.some((c) => c.toLowerCase() === body.stickerColor.toLowerCase()) ? { background: body.stickerColor } : undefined}
                                        title={t('side_events.sticker_color_custom')}
                                        aria-label={t('side_events.sticker_color_custom')}
                                    >
                                        <Plus size={14} />
                                    </button>
                                </Popover>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className={base.group}>
                <div className={own.switchRow}>
                    <span className={base.groupLabel}>{t('side_events.veil_label')}</span>
                    <button type="button" className={own.pasteBtn} data-on={veil > 0 || undefined} onClick={() => setBody({ veil: veil > 0 ? null : VELO_INICIAL })}>
                        {veil > 0 ? t('side_events.ws_on') : t('side_events.ws_off')}
                    </button>
                </div>
                {veil > 0 && <LiveSlider label={t('side_events.veil_intensity')} value={veil} min={5} max={90} format={(v) => `${v}%`} onChange={(v, o) => setBody({ veil: v }, o)} />}
            </div>

            {esPop && (
                <div className={base.group}>
                    <span className={base.groupLabel}>{t('side_events.panel_effects')}</span>
                    <span className={base.hint} style={{ marginTop: 0 }}>{t('side_events.panel_effects_hint')}</span>
                    <div className={ed.efectoGrid}>
                        {[null, ...TIPOS_EFECTO].map((tipo) => (
                            <button
                                key={tipo ?? 'none'}
                                type="button"
                                className={`${ed.efectoTile} ${(efecto?.type ?? null) === tipo ? ed.efectoTileActivo : ''}`}
                                aria-pressed={(efecto?.type ?? null) === tipo}
                                onClick={() => elegirEfecto(tipo)}
                            >
                                <span className={ed.efectoEmoji} aria-hidden>{EMOJI_EFECTO[tipo ?? 'none']}</span>
                                {t(`side_events.effect_${tipo ?? 'none'}`)}
                            </button>
                        ))}
                    </div>
                    {efecto?.type && (
                        <>
                            <LiveSlider label={t('side_events.effect_intensity')} value={efecto.intensity ?? 50} min={1} max={100} format={(v) => `${v}%`} onChange={(v, o) => cambiarEfecto({ intensity: v }, o)} />
                            {efecto.type === 'imagenes'
                                ? <ImagenesEfecto efecto={efecto} enPieza={pngsEnPieza} onChange={cambiarEfecto} onPickImage={onPickImage} />
                                : <ColorEfecto efecto={efecto} colorTema={color} onChange={cambiarEfecto} />}
                        </>
                    )}
                </div>
            )}
        </>
    )
}

/* ── Itinerario (solo Pop) ── */
export const ItineraryPanel = ({ current, setBody, dias }) => {
    const { t } = useTranslation()
    const itinerario = Array.isArray(current?.body?.itinerary) ? current.body.itinerary : []
    return (
        <div className={base.group}>
            <span className={base.hint} style={{ marginTop: 0 }}>{t('side_events.panel_itinerary_hint')}</span>
            <ItinerarioPop itinerario={itinerario} dias={dias} onChange={(lista) => setBody({ itinerary: lista.length ? lista : null })} />
        </div>
    )
}

/* ── Dibujar: pincel, color, grosor y opacidad ── */
// Muestra del pincel en su tile (como en el handoff).
const MuestraPincel = ({ id }) => {
    const p = PINCEL[id]
    const ancho = p.borra ? 7 : Math.max(1.5, 3 * p.k)
    return (
        <svg width="64" height="28" viewBox="0 0 64 28" aria-hidden className={own.pincelMuestra}>
            <path
                d="M5 20C15 6 24 24 34 13S53 8 59 11"
                fill="none"
                stroke={p.borra ? '#C9C5CE' : p.brillo ? '#6E5BD0' : '#29262D'}
                strokeWidth={ancho}
                strokeLinecap={p.cap}
                strokeLinejoin="round"
                opacity={p.maxA ? 0.4 : p.grano ? 0.7 : 1}
                strokeDasharray={p.borra ? '1 7' : p.grano ? '6 1.5' : undefined}
                style={p.brillo ? { filter: 'drop-shadow(0 0 4px #6E5BD0)' } : undefined}
            />
        </svg>
    )
}

const COLORES_DIBUJO = ['#FFFFFF', '#29262D', '#FF5A5F', '#FFC93C', '#3DDC97', '#4CC9F0']

// `pincel` vive en el editor (SideWorkspace), no en el body: se recuerda en la
// sesión. "Otro color" abre el selector de color del editor (pickColor).
export const DrawPanel = ({ current, pincel, setPincel, onOtroColor }) => {
    const { t } = useTranslation()
    const tema = current?.body?.color
    const borrador = PINCEL[pincel.brush]?.borra
    const colores = [...new Set([tema, ...COLORES_DIBUJO].filter(Boolean).map((c) => c.toUpperCase()))]
    const otro = !colores.includes(String(pincel.color).toUpperCase())
    const cambiar = (patch) => setPincel((p) => ({ ...p, ...patch }))
    return (
        <div className={own.dibujoPanel}>
            <div className={base.group}>
                <span className={base.groupLabel}>{t('side_events.draw_brush')}</span>
                <div className={ed.efectoGrid}>
                    {PINCELES.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            className={`${ed.efectoTile} ${pincel.brush === p.id ? ed.efectoTileActivo : ''}`}
                            aria-pressed={pincel.brush === p.id}
                            onClick={() => cambiar({ brush: p.id })}
                        >
                            <MuestraPincel id={p.id} />
                            {t(`side_events.draw_brush_${p.id}`)}
                        </button>
                    ))}
                </div>
            </div>

            {!borrador && (
                <div className={base.group}>
                    <span className={base.groupLabel}>{t('side_events.draw_color')}</span>
                    <div className={own.dibujoColores}>
                        {colores.map((c) => (
                            <button
                                key={c}
                                type="button"
                                className={own.dibujoColor}
                                data-on={String(pincel.color).toUpperCase() === c || undefined}
                                style={{ background: c }}
                                aria-label={c === String(tema).toUpperCase() ? t('side_events.draw_theme_color') : c}
                                title={c === String(tema).toUpperCase() ? t('side_events.draw_theme_color') : c}
                                onClick={() => cambiar({ color: c })}
                            />
                        ))}
                        <button
                            type="button"
                            className={`${own.dibujoColor} ${own.dibujoOtro}`}
                            data-on={otro || undefined}
                            style={otro ? { background: pincel.color } : undefined}
                            aria-label={t('side_events.draw_other_color')}
                            title={t('side_events.draw_other_color')}
                            onClick={onOtroColor}
                        >
                            {!otro && '+'}
                        </button>
                    </div>
                </div>
            )}

            {/* Grosor y opacidad: los mismos de la hoja de la paleta (AjustesPincel). */}
            <AjustesPincel pincel={pincel} setPincel={setPincel} claseTitulo={base.groupLabel} />

            <div className={own.dibujoNota}>
                <span>{t('side_events.draw_note')}</span>
                <span className={own.dibujoAtajos}>{t('side_events.draw_shortcuts')}</span>
            </div>
        </div>
    )
}
