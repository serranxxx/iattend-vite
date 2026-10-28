import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, Select } from 'antd'
import { AlignJustify, Ban, Blend, FlipHorizontal2, FlipVertical2, SquareRoundCorner } from 'lucide-react'
import { useFonts } from '../../../../context/FontsContext'
import { fonts as fallbackFonts } from '../../../../helpers/assets/fonts'
import { LiveSlider } from './barControls'
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

// Slider que solo guarda al soltar (una sola entrada en deshacer).

export const ElementBar = ({ item, accent, onPatch, onPickColor, colorOpen }) => {
    const { t } = useTranslation()
    const { fonts: activeFonts } = useFonts()
    const fontOptions = activeFonts.length ? activeFonts : fallbackFonts
    const [open, setOpen] = useState(null)
    useEffect(() => { setOpen(null) }, [item.id])

    const isShape = item.kind === 'shape'
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
        <div className={styles.bar} data-edit-keep>
            {item.kind !== 'sticker' && (
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

            {isShape && BOX_SHAPES.has(item.variant ?? 'square') && pop('radius', (
                <LiveSlider label={t('build_editor.eb_radius')} value={Math.min(item.radius ?? 0, 200)} min={0} max={200} onChange={(v, o) => onPatch({ radius: v }, o)} />
            ), (
                <button type="button" className={styles.iconBtn} data-on={open === 'radius' || undefined} title={t('build_editor.eb_radius')}>
                    <SquareRoundCorner size={18} />
                </button>
            ))}

            {item.kind === 'text' && (
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

            <span className={styles.divider} />

            {pop('flip', (
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
        </div>
    )
}
