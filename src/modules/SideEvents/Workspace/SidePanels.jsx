import { useTranslation } from 'react-i18next'
import { Segmented } from 'antd'
import { LiveSlider } from '../../Invitation/Build/PageSections/barControls'
import { SelectorColor } from '../SelectorColor'
import { ItinerarioFlash } from '../ItinerarioFlash'
import { COLOR_INICIAL, COLORES_EFECTO, TIPOS_EFECTO } from '../efectosData'
import { ESTILOS_BLOQUE, MINI_ESTILO, estiloDe } from '../estilosBloque'
import { PINCEL, PINCELES } from '../../Editor/dibujoData'
import base from '../../Invitation/Build/PageSections/ToolPanels.module.css'
import ed from '../SideEventEditor.module.css'
import own from './SideWorkspace.module.css'

// Contenido propio de los paneles Diseño e Itinerario de un side event / Flash
// (lo que solo existe ahí: color del tema, velo, efectos, mini itinerario).
// Elementos, Fotos y Subidos son los mismos paneles de la invitación. Todo
// va dentro de EditorShell.

// Tintes sugeridos para el tema (los de siempre).
const THEME_SWATCHES = ['#16323d', '#000000', '#E7E0CC', '#B9BBA6', '#D1BEDD', '#C67C6C']
const VELO_INICIAL = 35
const EMOJI_EFECTO = { none: '⊘', sparkles: '✨', confetti: '🎉', bubbles: '🫧', snow: '❄️', petals: '🌸' }

// Miniatura de un estilo de bloques: la foto del Flash (o el degradado del
// tema) con una tarjetita de ese estilo encima.
const MiniEstilo = ({ estilo, color, imagen }) => (
    <span className={own.estiloMini} style={imagen ? undefined : { background: `linear-gradient(160deg, ${color}, color-mix(in srgb, ${color} 60%, #000))` }} aria-hidden>
        {imagen && <img src={imagen} alt='' />}
        <span style={{ ...MINI_ESTILO[estilo], ...(estilo === 'tema' ? { background: color } : {}) }} />
    </span>
)

/* ── Diseño: color del tema, estilo de bloques (Flash), velo y efectos ── */
export const DesignPanel = ({ current, setBody, esFlash }) => {
    const { t } = useTranslation()
    const body = current?.body ?? {}
    const color = body.color ?? '#000000'
    const veil = body.veil ?? 0
    const efecto = body.effect ?? null

    return (
        <>
            <div className={base.group}>
                <span className={base.groupLabel}>{t('side_events.theme_color')}</span>
                <span className={base.hint} style={{ marginTop: 0 }}>{t('side_events.panel_color_hint')}</span>
                <SelectorColor value={color} onChange={(hex) => setBody({ color: hex })} imagenFondo={body.image} />
                <div className={own.swatchRow}>
                    {THEME_SWATCHES.map((c) => (
                        <button key={c} type="button" className={own.swatch} data-on={color.toLowerCase() === c.toLowerCase() || undefined} style={{ background: c }} aria-label={c} onClick={() => setBody({ color: c })} />
                    ))}
                </div>
            </div>

            {/* Estilo de bloques (handoff "Estilo de bloques del Evento Flash"):
                la piel de todas las tarjetas de la página. body.blockStyle;
                vidrio = sin valor (lo de siempre). */}
            {esFlash && (
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

            {esFlash && (
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

/* ── Itinerario (solo Flash) ── */
export const ItineraryPanel = ({ current, setBody, dias }) => {
    const { t } = useTranslation()
    const itinerario = Array.isArray(current?.body?.itinerary) ? current.body.itinerary : []
    return (
        <div className={base.group}>
            <span className={base.hint} style={{ marginTop: 0 }}>{t('side_events.panel_itinerary_hint')}</span>
            <ItinerarioFlash itinerario={itinerario} dias={dias} onChange={(lista) => setBody({ itinerary: lista.length ? lista : null })} />
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

            <div className={own.dibujoGrosor}>
                <div className={own.dibujoGrosorSlider}>
                    <LiveSlider label={t('side_events.draw_size')} value={pincel.size} min={2} max={40} format={(v) => `${v} px`} onChange={(v) => cambiar({ size: v })} />
                </div>
                <span className={own.dibujoPunto} aria-hidden>
                    <span
                        style={{
                            width: Math.min(40, pincel.size * (PINCEL[pincel.brush]?.k ?? 1)),
                            height: Math.min(40, pincel.size * (PINCEL[pincel.brush]?.k ?? 1)),
                            background: borrador ? '#C9C5CE' : pincel.color,
                            opacity: borrador ? 1 : Math.min(pincel.opacity / 100, PINCEL[pincel.brush]?.maxA ?? 1),
                            borderRadius: PINCEL[pincel.brush]?.cap === 'square' ? 3 : 99,
                        }}
                    />
                </span>
            </div>

            {!borrador && (
                <LiveSlider label={t('side_events.draw_opacity')} value={pincel.opacity} min={10} max={100} step={5} format={(v) => `${v}%`} onChange={(v) => cambiar({ opacity: v })} />
            )}

            <div className={own.dibujoNota}>
                <span>{t('side_events.draw_note')}</span>
                <span className={own.dibujoAtajos}>{t('side_events.draw_shortcuts')}</span>
            </div>
        </div>
    )
}
