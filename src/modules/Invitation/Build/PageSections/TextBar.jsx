import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, Select } from 'antd'
import { AlignCenter, AlignLeft, AlignRight, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, AlignVerticalJustifyStart, Blend, Bold, Italic, LetterText, Lock, LockOpen, Minus, MoveHorizontal, Plus, Sparkles, Strikethrough, Underline } from 'lucide-react'
import { useFonts } from '../../../../context/FontsContext'
import { fonts as fallbackFonts } from '../../../../helpers/assets/fonts'
import { LiveSlider } from './barControls'
import { LiaRewrite } from './LiaRewrite'
import styles from './ElementBar.module.css'

// Barra de texto (arriba de la pieza, como en Canva) para el título de la
// portada, el texto de la Cita y los textos de los bloques (de dónde lee y a
// dónde escribe: textStyle.js, que arma EditorWorkspace en `ts`):
// tipografía, tamaño, color (panel lateral), negrita, cursiva, subrayado,
// tachado, mayúsculas, alineación, espaciado y transparencia; en la Cita,
// además, su ancho y la sombra. Reemplaza al popover CoverTitleStyle en el
// editor de escritorio. Los estilos nuevos los pinta fontExtras.ts en events.

const ALIGNS = ['left', 'center', 'right']
const ALIGN_ICON = { left: AlignLeft, center: AlignCenter, right: AlignRight }
// Cita: posición vertical del texto sobre su fondo (quote.text.align).
const V_ALIGNS = ['flex-start', 'center', 'flex-end']
const V_ICON = { 'flex-start': AlignVerticalJustifyStart, center: AlignVerticalJustifyCenter, 'flex-end': AlignVerticalJustifyEnd }
// Mayúsculas: normal → MAYÚSCULAS → minúsculas.
const TRANSFORMS = ['none', 'uppercase', 'lowercase']


// `lock` (textos de bloque): { locked, kind, onToggle } — cerrado = a todos los
// títulos / cuerpos; abierto = solo a este texto.
// `lia` ({ current, kind, onApply, invitationID, lang }): botón "Lia" que
// reescribe el texto elegido (LiaRewrite). Null = sin Lia.
export const TextBar = ({ target, ts, lock, invitation, setInvitation, setSaved, onPickColor, colorOpen, lia }) => {
    const { t } = useTranslation()
    const { fonts: activeFonts } = useFonts()
    const fontOptions = activeFonts.length ? activeFonts : fallbackFonts
    const [open, setOpen] = useState(null)
    const isQuote = target === 'quote'
    const { font, setFont, align, setAlign, maxSize, showSize, showColor } = ts
    const size = font.size || 16

    const setQuoteText = (patch, opts) => {
        setInvitation((prev) => ({ ...prev, quote: { ...prev.quote, text: { ...prev.quote.text, ...patch } } }), opts)
        setSaved(false)
    }

    const pop = (id, content, trigger) => (
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
    )

    const bold = (font.weight ?? 400) >= 600
    const AlignIcon = ALIGN_ICON[align] ?? AlignCenter
    const transform = font.transform ?? 'none'

    return (
        <div className={styles.bar} data-edit-keep data-text-bar>
            {lock && (
                <button
                    type="button"
                    className={styles.iconBtn}
                    data-on={lock.locked || undefined}
                    title={lock.locked
                        ? t(lock.kind === 'title' ? 'build_editor.tb_lock_titles' : 'build_editor.tb_lock_body')
                        : t('build_editor.tb_unlock')}
                    onClick={lock.onToggle}
                >
                    {lock.locked ? <Lock size={18} /> : <LockOpen size={18} />}
                </button>
            )}
            <Select
                className={styles.fontWide}
                variant="outlined"
                value={font.typeFace}
                popupMatchSelectWidth={220}
                onChange={(typeFace) => setFont({ typeFace })}
                options={fontOptions.map((f) => ({ value: f, label: <span style={{ fontFamily: `"${f}"` }}>{f}</span> }))}
            />

            {showSize && <div className={styles.stepper}>
                <button type="button" className={styles.stepBtn} disabled={size <= 8} onClick={() => setFont({ size: Math.max(8, size - 2) })} aria-label="-">
                    <Minus size={16} />
                </button>
                <span className={styles.stepValue}>{size}</span>
                <button type="button" className={styles.stepBtn} disabled={size >= maxSize} onClick={() => setFont({ size: Math.min(maxSize, size + 2) })} aria-label="+">
                    <Plus size={16} />
                </button>
            </div>}

            {/* "A" con el color actual debajo: abre el panel Color. */}
            {showColor && <button type="button" className={styles.iconBtn} data-on={colorOpen || undefined} title={t('build_menu.color')} onClick={onPickColor}>
                <span className={styles.colorA}>
                    A
                    <span className={styles.colorBar} style={{ background: font.color || '#29262D' }} />
                </span>
            </button>}

            <button type="button" className={styles.iconBtn} data-on={bold || undefined} title={t('build_editor.tb_bold')} onClick={() => setFont({ weight: bold ? 400 : 700 })}>
                <Bold size={18} />
            </button>
            <button type="button" className={styles.iconBtn} data-on={font.italic || undefined} title={t('build_editor.tb_italic')} onClick={() => setFont({ italic: !font.italic })}>
                <Italic size={18} />
            </button>
            <button type="button" className={styles.iconBtn} data-on={font.underline || undefined} title={t('build_editor.tb_underline')} onClick={() => setFont({ underline: !font.underline })}>
                <Underline size={18} />
            </button>
            <button type="button" className={styles.iconBtn} data-on={font.strike || undefined} title={t('build_editor.tb_strike')} onClick={() => setFont({ strike: !font.strike })}>
                <Strikethrough size={18} />
            </button>
            <button
                type="button"
                className={`${styles.iconBtn} ${styles.caseBtn}`}
                data-on={transform !== 'none' || undefined}
                title={t('build_editor.tb_case')}
                onClick={() => setFont({ transform: TRANSFORMS[(TRANSFORMS.indexOf(transform) + 1) % TRANSFORMS.length] })}
            >
                {transform === 'uppercase' ? 'AA' : transform === 'lowercase' ? 'aa' : 'aA'}
            </button>
            {setAlign && (
                <button type="button" className={styles.iconBtn} title={t('build_editor.tb_align')} onClick={() => setAlign(ALIGNS[(ALIGNS.indexOf(align) + 1) % ALIGNS.length])}>
                    <AlignIcon size={18} />
                </button>
            )}

            <span className={styles.divider} />

            {pop('spacing', (
                <>
                    <LiveSlider label={t('build_editor.tb_letter')} value={font.letterSpacing ?? 0} min={-10} max={60} onChange={(v, o) => setFont({ letterSpacing: v }, o)} />
                    <LiveSlider label={t('build_editor.tb_line')} value={font.lineHeight ?? 1.2} min={0.8} max={2.5} step={0.05} format={(v) => Number(v).toFixed(2)} onChange={(v, o) => setFont({ lineHeight: v }, o)} />
                    <LiveSlider label={t('build_cover.label_weight')} value={font.weight ?? 400} min={100} max={900} step={100} onChange={(v, o) => setFont({ weight: v }, o)} />
                </>
            ), (
                <button type="button" className={styles.iconBtn} data-on={open === 'spacing' || undefined} title={t('build_editor.tb_spacing')}>
                    <LetterText size={18} />
                </button>
            ))}

            {pop('opacity', (
                <LiveSlider label={t('build_editor.eb_opacity')} value={Math.round((font.opacity ?? 1) * 100)} min={0} max={100} onChange={(v, o) => setFont({ opacity: v / 100 }, o)} />
            ), (
                <button type="button" className={styles.iconBtn} data-on={open === 'opacity' || undefined} title={t('build_editor.eb_opacity')}>
                    <Blend size={18} />
                </button>
            ))}

            {/* Cita: arriba / centro / abajo, ancho del texto y sombra. */}
            {isQuote && (() => {
                const vAlign = invitation?.quote?.text?.align ?? 'center'
                const VIcon = V_ICON[vAlign] ?? AlignVerticalJustifyCenter
                return (
                    <button type="button" className={styles.iconBtn} title={t('build_editor.tb_valign')} onClick={() => setQuoteText({ align: V_ALIGNS[(V_ALIGNS.indexOf(vAlign) + 1) % V_ALIGNS.length] })}>
                        <VIcon size={18} />
                    </button>
                )
            })()}
            {isQuote && pop('width', (
                <LiveSlider label={t('build_menu.width')} value={invitation?.quote?.text?.width || 100} min={40} max={100} step={5} format={(v) => `${v}%`} onChange={(width, o) => setQuoteText({ width }, o)} />
            ), (
                <button type="button" className={styles.iconBtn} data-on={open === 'width' || undefined} title={t('build_menu.width')}>
                    <MoveHorizontal size={18} />
                </button>
            ))}
            {isQuote && (
                <button type="button" className={styles.textBtn} data-on={invitation?.quote?.text?.shadow || undefined} onClick={() => setQuoteText({ shadow: !invitation?.quote?.text?.shadow })}>
                    {t('build_menu.shadow')}
                </button>
            )}

            {/* Reescribir con Lia (handoff 5.3). */}
            {lia && (
                <>
                    <span className={styles.divider} />
                    <Popover
                        open={open === 'lia'}
                        onOpenChange={(v) => setOpen(v ? 'lia' : null)}
                        trigger="click"
                        placement="bottom"
                        arrow={false}
                        content={<LiaRewrite {...lia} onApply={(text) => { lia.onApply(text); setOpen(null) }} />}
                    >
                        <button type="button" className={`${styles.textBtn} ${styles.liaBtn}`} data-on={open === 'lia' || undefined}>
                            <Sparkles size={16} /> Lia
                        </button>
                    </Popover>
                </>
            )}
        </div>
    )
}
