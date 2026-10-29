import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, Select, Switch } from 'antd'
import { AlignJustify, Ban, Blend, CopyPlus, Eye, EyeOff, FlipHorizontal2, FlipVertical2, Lock, RotateCw, Scaling, SquareRoundCorner, Trash2 } from 'lucide-react'
import { useFonts } from '../../../../context/FontsContext'
import { fonts as fallbackFonts } from '../../../../helpers/assets/fonts'
import { LiveSlider } from './barControls'
import { grosorVisible, parcheCandado, parcheGrosor, useVector } from '../../../Editor/vector'
import styles from './ElementBar.module.css'

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
// en la pieza; un side event / Flash pasa `group` y suma en la barra tamaño,
// giro, ocultar, duplicar y quitar (con varios elegidos, `group.count`, solo
// van esos y la transparencia):
//   { count, onScale(w, o), onRotate(rot, o), hidden, onToggleHidden,
//     canDuplicate, onDuplicate, onRemove }
// `pieceWidth`: ancho de la pieza en px (vectores: grosor fijo sin brincos).
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
            content={<div className={styles.pop} onMouseDown={(e) => e.stopPropagation()}>{content}</div>}
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
                    <LiveSlider label={t('build_editor.eb_stroke_width')} value={sw} min={0} max={12} onChange={(v, o) => onPatch({ strokeWidth: v }, o)} />
                </>
            ), (
                <button type="button" className={styles.iconBtn} data-on={open === 'stroke' || undefined} title={t('build_editor.eb_stroke')}>
                    <AlignJustify size={18} />
                </button>
            ))}

            {isVector && pop('vstroke', (
                <>
                    <LiveSlider
                        label={t('build_editor.eb_stroke_width')}
                        value={Math.round(grosorVisible(item, vector, pieceWidth) * 2) / 2}
                        min={0.5}
                        max={16}
                        step={0.5}
                        format={(v) => `${v} px`}
                        onChange={(v, o) => onPatch(parcheGrosor(item, v, pieceWidth), o)}
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

            {!multi && pop('flip', (
                <div className={styles.menu}>
                    <button type="button" className={styles.menuItem} data-on={item.flipX || undefined} onClick={() => onPatch({ flipX: !item.flipX })}>
                        <FlipHorizontal2 size={16} /> {t('build_editor.eb_flip_h')}
                    </button>
                    <button type="button" className={styles.menuItem} data-on={item.flipY || undefined} onClick={() => onPatch({ flipY: !item.flipY })}>
                        <FlipVertical2 size={16} /> {t('build_editor.eb_flip_v')}
                    </button>
                </div>
            ), (
                <button type="button" className={styles.textBtn} data-on={open === 'flip' || undefined}>
                    {t('build_editor.eb_flip')}
                </button>
            ))}

            {pop('opacity', (
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
