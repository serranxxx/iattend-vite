import { useTranslation } from 'react-i18next'
import { Segmented } from 'antd'
import { LiveSlider } from '../../Invitation/Build/PageSections/barControls'
import { SelectorColor } from '../SelectorColor'
import { ItinerarioFlash } from '../ItinerarioFlash'
import { COLOR_INICIAL, COLORES_EFECTO, TIPOS_EFECTO } from '../efectosData'
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

/* ── Diseño: color del tema, velo y efectos ── */
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
