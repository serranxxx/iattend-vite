import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, Select } from 'antd'
import { Eye, EyeOff, ImagePlus, MoveHorizontal, MoveVertical } from 'lucide-react'
import { Separador } from '../../../../components/Invitation/Logos'
import { LiveSlider } from './barControls'
import styles from './ElementBar.module.css'

// Barra del separador de un bloque (dynamic_separator), arriba de la pieza:
// ojito (prender / apagar), Regular o Imagen; regular = select con los
// separadores y su color (panel "Color"); imagen = botón al panel "Imágenes",
// alto y largo. Reemplaza al popover ModuleSeparator en el editor de escritorio.

const MODULE_KEY = { family: 'people' }
const SEPARATORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export const SeparatorBar = ({ section, invitation, setInvitation, setSaved, onPickColor, colorOpen, onPickImage }) => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(null)
    const label = MODULE_KEY[section] ?? section
    const sep = invitation?.[label]?.dynamic_separator ?? {}
    const isImage = sep.type === 'image'
    const on = Boolean(sep.active)
    const color = sep.color || invitation?.generals?.colors?.accent || '#29262D'

    const set = (patch, opts) => {
        setInvitation((prev) => ({ ...prev, [label]: { ...prev[label], dynamic_separator: { ...prev[label].dynamic_separator, ...patch } } }), opts)
        setSaved(false)
    }
    const setImage = (patch, opts) => {
        setInvitation((prev) => {
            const cur = prev[label].dynamic_separator
            return { ...prev, [label]: { ...prev[label], dynamic_separator: { ...cur, image: { ...cur.image, ...patch } } } }
        }, opts)
        setSaved(false)
    }
    const setSingle = (value) => {
        setInvitation((prev) => {
            const cur = prev[label].dynamic_separator
            return { ...prev, [label]: { ...prev[label], dynamic_separator: { ...cur, active: true, single: { ...cur.single, value } } } }
        })
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
    const offProps = on ? {} : { 'aria-disabled': true, 'data-off': true }

    return (
        <div className={styles.bar} data-edit-keep data-text-bar>
            <button type="button" className={styles.iconBtn} data-on={on || undefined} title={on ? t('build_editor.sep_hide') : t('build_editor.sep_show')} onClick={() => set({ active: !on })}>
                {on ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>

            <span className={styles.divider} />

            <button type="button" className={styles.textBtn} data-on={(on && !isImage) || undefined} onClick={() => set({ type: 'single', active: true })}>
                {t('build_menu.separator_regular')}
            </button>
            <button type="button" className={styles.textBtn} data-on={(on && isImage) || undefined} onClick={() => set({ type: 'image', active: true })}>
                {t('build_menu.separator_image')}
            </button>

            <span className={styles.divider} />

            {!isImage ? (
                <>
                    <Select
                        className={styles.sepSelect}
                        disabled={!on}
                        value={sep.single?.value ?? 1}
                        popupMatchSelectWidth={230}
                        onChange={setSingle}
                        options={SEPARATORS.map((n) => ({
                            value: n,
                            label: <span className={styles.sepOpt}><Separador MainColor={color} value={n} /></span>,
                        }))}
                    />
                    <button type="button" className={styles.swatchBtn} data-on={colorOpen || undefined} title={t('build_menu.color')} onClick={() => on && onPickColor()} {...offProps}>
                        <span className={styles.swatch} style={{ background: color }} />
                    </button>
                </>
            ) : (
                <>
                    <button type="button" className={styles.textBtn} onClick={() => on && onPickImage((url) => url && setImage({ value: url }))} {...offProps}>
                        <ImagePlus size={17} /> {t('build_editor.bg_image')}
                    </button>
                    {on ? pop('height', (
                        <LiveSlider label={t('build_menu.height')} value={sep.image?.height ?? 100} min={50} max={500} step={10} format={(v) => `${v}px`} onChange={(v, o) => setImage({ height: v }, o)} />
                    ), (
                        <button type="button" className={styles.iconBtn} data-on={open === 'height' || undefined} title={t('build_menu.height')}>
                            <MoveVertical size={18} />
                        </button>
                    )) : <button type="button" className={styles.iconBtn} {...offProps}><MoveVertical size={18} /></button>}
                    {on ? pop('width', (
                        <LiveSlider label={t('build_menu.width')} value={sep.image?.width ?? 100} min={40} max={100} step={5} format={(v) => `${v}%`} onChange={(v, o) => setImage({ width: v }, o)} />
                    ), (
                        <button type="button" className={styles.iconBtn} data-on={open === 'width' || undefined} title={t('build_menu.width')}>
                            <MoveHorizontal size={18} />
                        </button>
                    )) : <button type="button" className={styles.iconBtn} {...offProps}><MoveHorizontal size={18} /></button>}
                </>
            )}
        </div>
    )
}
