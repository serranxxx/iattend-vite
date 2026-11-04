import { useTranslation } from 'react-i18next'
import { Segmented } from 'antd'
import { LiveSlider } from '../../Invitation/Build/PageSections/barControls'
import { SelectorColor } from '../SelectorColor'
import { ColoresIOS } from '../../Editor/ColoresIOS'
import { ItinerarioPop } from '../ItinerarioPop'
import { COLOR_INICIAL, COLORES_EFECTO, TIPOS_EFECTO } from '../efectosData'
import { ESTILOS_BLOQUE, MINI_ESTILO, estiloDe } from '../estilosBloque'
import { PINCEL, PINCELES } from '../../Editor/dibujoData'
import { AjustesPincel } from './AjustesPincel'
import { EMOJIS_POP } from '../../../helpers/invitation/popEmojis'
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
const EMOJI_EFECTO = { none: '⊘', sparkles: '✨', confetti: '🎉', bubbles: '🫧', snow: '❄️', petals: '🌸' }


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
export const DesignPanel = ({ current, setBody, esPop, movil = false }) => {
    const { t } = useTranslation()
    const body = current?.body ?? {}
    const color = body.color ?? '#000000'
    const veil = body.veil ?? 0
    const efecto = body.effect ?? null

    return (
        <>
            {/* Emoji del Pop: en escritorio se elige en el encabezado, junto al
                nombre (EmojiPop); en el celular, aquí. '' = sin emoji. */}
            {esPop && movil && (
                <div className={base.group}>
                    <span className={base.groupLabel}>{t('side_events.pop_emoji')}</span>
                    <span className={base.hint} style={{ marginTop: 0 }}>{t('side_events.pop_emoji_hint')}</span>
                    <div className={own.emojiActual}>
                        {/* Así se ve en la lista de Pops: su emoji sobre el color del tema. */}
                        <span className={own.emojiMuestra} style={{ background: color }} aria-hidden>{body.emoji || ''}</span>
                        <span className={own.emojiActualTexto}>{body.emoji ? t('side_events.pop_emoji_selected') : t('side_events.pop_emoji_none')}</span>
                        {body.emoji && (
                            <button type='button' className={own.pasteBtn} onClick={() => setBody({ emoji: '' })}>{t('side_events.pop_emoji_remove')}</button>
                        )}
                    </div>
                    <div className={own.emojiGrid} role='radiogroup' aria-label={t('side_events.pop_emoji')}>
                        {EMOJIS_POP.map((e) => (
                            <button
                                key={e}
                                type='button'
                                role='radio'
                                aria-checked={body.emoji === e}
                                className={own.emojiOpcion}
                                data-on={body.emoji === e || undefined}
                                onClick={() => setBody({ emoji: body.emoji === e ? '' : e })}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className={base.group}>
                <span className={base.groupLabel}>{t('side_events.theme_color')}</span>
                <span className={base.hint} style={{ marginTop: 0 }}>{t('side_events.panel_color_hint')}</span>
                {movil ? (
                    <ColoresIOS value={color} onChange={(hex, o) => setBody({ color: hex }, o)} className={own.coloresMovil} cabeza={false} conGuardados={false} />
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
                                onClick={() => setBody({ effect: tipo ? { type: tipo, intensity: efecto?.intensity ?? 50, color: COLOR_INICIAL[tipo] } : null })}
                            >
                                <span className={ed.efectoEmoji} aria-hidden>{EMOJI_EFECTO[tipo ?? 'none']}</span>
                                {t(`side_events.effect_${tipo ?? 'none'}`)}
                            </button>
                        ))}
                    </div>
                    {efecto?.type && (
                        <>
                            <LiveSlider label={t('side_events.effect_intensity')} value={efecto.intensity ?? 50} min={1} max={100} format={(v) => `${v}%`} onChange={(v, o) => setBody({ effect: { ...efecto, intensity: v } }, o)} />
                            <Segmented
                                block
                                size="small"
                                value={efecto.color ?? COLOR_INICIAL[efecto.type]}
                                onChange={(v) => setBody({ effect: { ...efecto, color: v } })}
                                options={COLORES_EFECTO.map((c) => ({ value: c, label: t(`side_events.effect_color_${c}`) }))}
                            />
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
