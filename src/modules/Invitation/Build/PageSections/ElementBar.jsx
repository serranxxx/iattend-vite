import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, Select, Switch } from 'antd'
import { AlignJustify, Ban, Blend, CopyPlus, Eye, EyeOff, FlipHorizontal2, FlipVertical2, Group, Lock, RotateCw, Scaling, SquareRoundCorner, Trash2, Ungroup } from 'lucide-react'
import { useFonts } from '../../../../context/FontsContext'
import { fonts as fallbackFonts } from '../../../../helpers/assets/fonts'
import { LiveSlider } from './barControls'
import { grosorVisible, parcheCandado, parcheGrosor, useVector } from '../../../Editor/vector'
import styles from './ElementBar.module.css'
import pincel from '../../../SideEvents/Workspace/AjustesPincel.module.css'
import { BarraOpacidad, Garabato } from '../../../SideEvents/Workspace/AjustesPincel'

// Barra de propiedades del elemento suelto elegido en la pieza (arriba del
// teléfono, como en Canva): color, borde, esquinas, voltear y transparencia;
// en los textos, además, la tipografía. Bloquear, duplicar, eliminar y capas
// van en la barra sobre el elemento (SectionLayer en iattend-events). El
// color se elige en el panel lateral (ColorPanel).

const BOX_SHAPES = new Set(['square', 'rect'])
const STROKE_STYLES = [
    { id: 'none', sample: null },
    { id: 'solid', sample: 'solid' },
    { id: 'dashed', sample: 'dashed' },
    { id: 'dotted', sample: 'dotted' },
]

// Es la barra del elemento elegido de todos los editores (EditorShell). En
// la invitación bloquear, duplicar, eliminar y capas van sobre el elemento,
// en la pieza; un side event / Pop pasa `group` y suma en la barra tamaño,
// giro, ocultar, duplicar y quitar (con varios elegidos, `group.count`, solo
// van esos y la transparencia):
//   { count, onScale(w, o), onRotate(rot, o), hidden, onToggleHidden,
//     canDuplicate, onDuplicate, onRemove }
// `pieceWidth`: ancho de la pieza en px (vectores: grosor fijo sin brincos).
// Grosor del trazo + transparencia en una sola hoja (como la del pincel,
// AjustesPincel): cinco grosores ya hechos y la barra de opacidad del color.
const VECTOR_GROSORES = [1, 2, 3.5, 6, 10]
const SHAPE_GROSORES = [1, 2, 4, 7, 12]
const cercanoA = (lista, v) => lista.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a), lista[0])
const TrazoYOpacidad = ({ grosores, grosor, onGrosor, color, opacity, onOpacity, t }) => {
    const actual = grosor > 0 ? cercanoA(grosores, grosor) : null
    return (
        <div className={pincel.ajustes}>
            <span className={styles.popLabel}>{t('build_editor.eb_stroke_width')}</span>
            <div className={pincel.grosores} role="radiogroup" aria-label={t('build_editor.eb_stroke_width')}>
                {grosores.map((g) => (
                    <button
                        key={g}
                        type="button"
                        role="radio"
                        aria-checked={actual === g}
                        aria-label={`${g} px`}
                        className={pincel.grosor}
                        data-on={actual === g || undefined}
                        onClick={() => onGrosor(g)}
                    >
                        <Garabato ancho={Math.max(1.4, g * (8 / grosores[grosores.length - 1]))} />
                    </button>
                ))}
            </div>
            <span className={styles.popLabel}>{t('build_editor.eb_opacity')}</span>
            <BarraOpacidad color={color} value={opacity} label={t('build_editor.eb_opacity')} onChange={onOpacity} />
        </div>
    )
}

export const ElementBar = ({ item, accent, onPatch, onPickColor, colorOpen, group = null, pieceWidth = 390 }) => {
    const { t } = useTranslation()
    const { fonts: activeFonts } = useFonts()
    const fontOptions = activeFonts.length ? activeFonts : fallbackFonts
    const [open, setOpen] = useState(null)
    useEffect(() => { setOpen(null) }, [item.id])

    const multi = (group?.count ?? 1) > 1
    const isShape = item.kind === 'shape' && !multi
    const isVector = item.kind === 'icon' && item.vector && !multi
    const vector = useVector(isVector ? item.src : null)
    const sw = item.strokeWidth ?? 0
    const fill = item.color === 'transparent' ? null : item.color || accent

    const pop = (id, content, trigger) => (
        <Popover
            open={open === id}
            onOpenChange={(v) => setOpen(v ? id : null)}
            trigger="click"
            placement="bottom"
            arrow={false}
            // data-text-bar: 32 px de redondeo (escritorio) y tarjeta flotante a lo ancho (celular).
            content={<div className={styles.pop} data-text-bar onMouseDown={(e) => e.stopPropagation()}>{content}</div>}
        >
            {trigger}
        </Popover>
    )

    return (
        <div className={styles.bar} data-edit-keep data-text-bar>
            {multi && <span className={styles.barCount}>{t('side_events.stickers_selected', { n: group.count })}</span>}
            {item.kind && item.kind !== 'sticker' && !multi && (
                <button
                    type="button"
                    className={styles.swatchBtn}
                    data-on={colorOpen === 'color' || undefined}
                    title={isShape ? t('build_editor.eb_fill') : t('build_menu.color')}
                    onClick={() => onPickColor('color')}
                >
                    <span className={styles.swatch} data-empty={!fill || undefined} style={{ background: fill ?? undefined }} />
                </button>
            )}

            {isShape && (
                <button
                    type="button"
                    className={styles.swatchBtn}
                    data-on={colorOpen === 'stroke' || undefined}
                    title={t('build_editor.eb_stroke_color')}
                    onClick={() => onPickColor('stroke')}
                >
                    <span className={styles.ring} style={{ borderColor: sw > 0 ? item.stroke || accent : '#D9D6D0' }} />
                </button>
            )}

            {isShape && pop('stroke', (
                <>
                    <div className={styles.styleRow}>
                        {STROKE_STYLES.map((st) => {
                            const on = st.id === 'none' ? sw === 0 : sw > 0 && (item.strokeStyle || 'solid') === st.id
                            return (
                                <button
                                    key={st.id}
                                    type="button"
                                    className={styles.styleBtn}
                                    data-on={on || undefined}
                                    onClick={() => onPatch(st.id === 'none' ? { strokeWidth: 0 } : { strokeStyle: st.id, strokeWidth: sw || 2 })}
                                >
                                    {st.sample ? <span className={styles.styleSample} style={{ borderTopStyle: st.sample }} /> : <Ban size={18} />}
                                </button>
                            )
                        })}
                    </div>
                    <TrazoYOpacidad
                        grosores={SHAPE_GROSORES}
                        grosor={sw}
                        onGrosor={(v) => onPatch({ strokeWidth: v, strokeStyle: item.strokeStyle || 'solid' })}
                        color={item.stroke || accent}
                        opacity={Math.max(10, Math.round((item.opacity ?? 1) * 100))}
                        onOpacity={(v) => onPatch({ opacity: v / 100 })}
                        t={t}
                    />
                </>
            ), (
                <button type="button" className={styles.iconBtn} data-on={open === 'stroke' || undefined} title={t('build_editor.eb_stroke')}>
                    <AlignJustify size={18} />
                </button>
            ))}

            {isVector && pop('vstroke', (
                <>
                    <TrazoYOpacidad
                        grosores={VECTOR_GROSORES}
                        grosor={grosorVisible(item, vector, pieceWidth)}
                        onGrosor={(v) => onPatch(parcheGrosor(item, v, pieceWidth))}
                        color={fill || '#29262D'}
                        opacity={Math.max(10, Math.round((item.opacity ?? 1) * 100))}
                        onOpacity={(v) => onPatch({ opacity: v / 100 })}
                        t={t}
                    />
                    <label className={styles.switchRow}>
                        <span>
                            <span className={styles.switchLabel}>{t('build_editor.eb_stroke_fixed')}</span>
                            <span className={styles.switchHint}>{t('build_editor.eb_stroke_fixed_hint')}</span>
                        </span>
                        <Switch size="small" checked={Boolean(item.strokeFixed)} onChange={(on) => onPatch(parcheCandado(item, vector, on, pieceWidth))} />
                    </label>
                </>
            ), (
                <button type="button" className={styles.iconBtn} data-on={open === 'vstroke' || undefined} title={t('build_editor.eb_stroke_width')}>
                    <AlignJustify size={18} />
                    {item.strokeFixed && <Lock size={10} className={styles.lockBadge} />}
                </button>
            ))}

            {isShape && BOX_SHAPES.has(item.variant ?? 'square') && pop('radius', (
                <LiveSlider label={t('build_editor.eb_radius')} value={Math.min(item.radius ?? 0, 200)} min={0} max={200} onChange={(v, o) => onPatch({ radius: v }, o)} />
            ), (
                <button type="button" className={styles.iconBtn} data-on={open === 'radius' || undefined} title={t('build_editor.eb_radius')}>
                    <SquareRoundCorner size={18} />
                </button>
            ))}

            {item.kind === 'text' && !multi && (
                <Select
                    className={styles.font}
                    size="small"
                    variant="borderless"
                    value={item.font ?? '__theme'}
                    popupMatchSelectWidth={220}
                    onChange={(v) => onPatch({ font: v === '__theme' ? null : v })}
                    options={[
                        { value: '__theme', label: t('build_editor.eb_font_theme') },
                        ...fontOptions.map((f) => ({ value: f, label: <span style={{ fontFamily: `"${f}"` }}>{f}</span> })),
                    ]}
                />
            )}

            {item.kind && item.kind !== 'sticker' && !multi && <span className={styles.divider} />}

            {/* Voltear: los dos espejos directo en la barra (sin menú). */}
            {!multi && (
                <>
                    <button type="button" className={styles.iconBtn} data-on={item.flipX || undefined} aria-pressed={Boolean(item.flipX)} title={t('build_editor.eb_flip_h')} aria-label={t('build_editor.eb_flip_h')} onClick={() => onPatch({ flipX: !item.flipX })}>
                        <FlipHorizontal2 size={18} />
                    </button>
                    <button type="button" className={styles.iconBtn} data-on={item.flipY || undefined} aria-pressed={Boolean(item.flipY)} title={t('build_editor.eb_flip_v')} aria-label={t('build_editor.eb_flip_v')} onClick={() => onPatch({ flipY: !item.flipY })}>
                        <FlipVertical2 size={18} />
                    </button>
                </>
            )}

            {/* Vectores y formas llevan la transparencia en la hoja del trazo. */}
            {!isVector && !isShape && pop('opacity', (
                <LiveSlider label={t('build_editor.eb_opacity')} value={Math.round((item.opacity ?? 1) * 100)} min={0} max={100} onChange={(v, o) => onPatch({ opacity: v / 100 }, o)} />
            ), (
                <button type="button" className={styles.iconBtn} data-on={open === 'opacity' || undefined} title={t('build_editor.eb_opacity')}>
                    <Blend size={18} />
                </button>
            ))}

            {group && (
                <>
                    {pop('size', (
                        <LiveSlider label={t('side_events.stickers_size')} value={Math.round(item.w)} min={5} max={200} format={(v) => `${v}%`} onChange={group.onScale} />
                    ), (
                        <button type="button" className={styles.iconBtn} data-on={open === 'size' || undefined} title={t('side_events.stickers_size')}>
                            <Scaling size={18} />
                        </button>
                    ))}
                    {pop('rot', (
                        <LiveSlider label={t('side_events.stickers_rotation')} value={Math.round(item.rot ?? 0)} min={-180} max={180} format={(v) => `${v}°`} onChange={group.onRotate} />
                    ), (
                        <button type="button" className={styles.iconBtn} data-on={open === 'rot' || undefined} title={t('side_events.stickers_rotation')}>
                            <RotateCw size={18} />
                        </button>
                    ))}
                    {/* Grupos de capas (Pop): con varios elegidos, Agrupar; con un
                        grupo elegido, Desagrupar. */}
                    {(group.onAgrupar || group.onDesagrupar) && (
                        <>
                            <span className={styles.divider} />
                            <button type="button" className={styles.textBtn} title={group.onDesagrupar ? '⇧⌘G' : '⌘G'} onClick={group.onDesagrupar ?? group.onAgrupar}>
                                {group.onDesagrupar ? <Ungroup size={17} /> : <Group size={17} />}
                                {t(group.onDesagrupar ? 'side_events.layers_ungroup' : 'side_events.layers_group')}
                            </button>
                        </>
                    )}
                    <span className={styles.divider} />
                    <button type="button" className={styles.iconBtn} data-on={group.hidden || undefined} title={t(group.hidden ? 'side_events.stickers_show' : 'side_events.stickers_hide')} onClick={group.onToggleHidden}>
                        {group.hidden ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                        type="button"
                        className={styles.iconBtn}
                        title={t('side_events.stickers_duplicate')}
                        aria-disabled={!group.canDuplicate || undefined}
                        data-off={!group.canDuplicate || undefined}
                        onClick={() => group.canDuplicate && group.onDuplicate()}
                    >
                        <CopyPlus size={18} />
                    </button>
                    <button type="button" className={styles.iconBtn} title={t('side_events.stickers_remove')} onClick={group.onRemove}>
                        <Trash2 size={18} />
                    </button>
                </>
            )}
        </div>
    )
}
