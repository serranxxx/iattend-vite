import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover } from 'antd'
import { ArrowDown, ArrowDownUp, ArrowUp, Clapperboard, ImagePlus, Maximize, Sparkles, Trash2 } from 'lucide-react'
import { darker } from '../../../../helpers/assets/functions'
import { EffectsControls } from './barControls'
import { SortableThumbs } from './SortableThumbs'
import styles from './ElementBar.module.css'

// Barra de "Imagen o video" de la portada (cover.image), arriba de la pieza.
// Se abre con "Cambiar fondo" y reemplaza en escritorio a su popover
// (CoverMedia): "+ Imagen" y "+ Video" (panel "Imágenes" del riel; videos de
// hasta 5 s), las miniaturas en fila (se arrastran para ordenar; el bote
// quita la elegida) y los efectos (sombra / desenfoque) en un popover. La
// portada vieja guardaba un solo string en `dev`: se lee como lista.
export const CoverMediaBar = ({ invitation, setInvitation, setSaved, onPickMedia, onPickShadowColor }) => {
    const { t } = useTranslation()
    const [selected, setSelected] = useState(null)
    const [fxOpen, setFxOpen] = useState(false)
    const image = invitation?.cover?.image ?? {}
    const list = (raw) => (Array.isArray(raw) ? raw : raw ? [raw] : [])
    const media = list(image.dev)
    const hasSelected = selected != null && selected < media.length

    const setImage = (patch, opts) => {
        setInvitation((prev) => ({ ...prev, cover: { ...prev.cover, image: { ...prev.cover.image, ...patch } } }), opts)
        setSaved(false)
    }
    // Una sola = string, varias = lista, ninguna = null (como CoverMedia).
    const writeMedia = (fn) => {
        setInvitation((prev) => {
            const next = fn(list(prev.cover?.image?.dev))
            const value = next.length === 0 ? null : next.length === 1 ? next[0] : next
            return { ...prev, cover: { ...prev.cover, image: { ...prev.cover.image, dev: value, prod: value } } }
        })
        setSaved(false)
    }
    const add = (url) => url && writeMedia((cur) => [...cur, url])
    const offProps = hasSelected ? {} : { 'aria-disabled': true, 'data-off': true }

    return (
        <div className={styles.bar} data-edit-keep data-text-bar>
            <button type="button" className={styles.textBtn} onClick={() => onPickMedia({ type: 'cover' }, add)}>
                <ImagePlus size={17} /> {t('build_editor.bg_image')}
            </button>
            <button type="button" className={styles.iconBtn} title={t('build_cover.add_video')} onClick={() => onPickMedia({ mediaType: 'video' }, add)}>
                <Clapperboard size={18} />
            </button>

            {media.length > 0 && <span className={styles.divider} />}
            {media.length > 0 && (
                <SortableThumbs images={media} onReorder={(next) => writeMedia(() => next)} selected={selected} onSelectedChange={setSelected} />
            )}
            <button
                type="button"
                className={styles.iconBtn}
                title={t('build_editor.remove_image')}
                onClick={() => {
                    if (!hasSelected) return
                    writeMedia((cur) => cur.filter((_, j) => j !== selected))
                    setSelected(null)
                }}
                {...offProps}
            >
                <Trash2 size={18} />
            </button>

            <span className={styles.divider} />
            <Popover
                open={fxOpen}
                onOpenChange={setFxOpen}
                trigger="click"
                placement="bottom"
                arrow={false}
                content={(
                    <div className={styles.pop} data-text-bar onMouseDown={(e) => e.stopPropagation()}>
                        <EffectsControls
                            t={t}
                            image={image}
                            icons={{ up: ArrowUp, down: ArrowDown, both: ArrowDownUp, full: Maximize }}
                            shadowColor={darker(invitation?.generals?.colors?.primary ?? '#FFFFFF', 0.2)}
                            onChange={setImage}
                            onPickShadowColor={() => { setFxOpen(false); onPickShadowColor() }}
                        />
                    </div>
                )}
            >
                <button type="button" className={styles.textBtn} data-on={fxOpen || undefined}>
                    <Sparkles size={17} /> {t('build_editor.tb_effects')}
                </button>
            </Popover>
        </div>
    )
}
