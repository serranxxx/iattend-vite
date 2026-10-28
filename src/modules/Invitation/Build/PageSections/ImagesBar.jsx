import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Trash2 } from 'lucide-react'
import { SortableThumbs } from './SortableThumbs'
import { DressStyleButton } from './DressStylePicker'
import styles from './ElementBar.module.css'

// Barra de las imágenes del dresscode o de la galería (`module`: "dresscode" |
// "gallery", las dos en `.dev`), arriba de la pieza. Reemplaza en escritorio
// al panel DressImages que flotaba sobre las imágenes: "+ Imagen" (panel
// "Imágenes" del riel), miniaturas en fila que se arrastran para ordenar
// y el bote quita la elegida.
export const ImagesBar = ({ module, invitation, setInvitation, setSaved, onPickImage }) => {
    const { t } = useTranslation()
    const images = invitation?.[module]?.dev ?? []
    const [selected, setSelected] = useState(null)
    const hasSelected = selected != null && selected < images.length

    const write = (fn) => {
        setInvitation((prev) => ({
            ...prev,
            [module]: { ...prev[module], dev: fn(prev[module]?.dev ?? []), ...(module === 'dresscode' ? { images_active: true } : {}) },
        }))
        setSaved(false)
    }
    const offProps = hasSelected ? {} : { 'aria-disabled': true, 'data-off': true }

    return (
        <div className={styles.bar} data-edit-keep data-text-bar>
            {/* Dresscode: cómo se ven (catálogo I1–I5). */}
            {module === 'dresscode' && (
                <>
                    <DressStyleButton kind="images" invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
                    <span className={styles.divider} />
                </>
            )}
            {/* Puede elegirse más de una con el panel abierto: se agrega a lo último. */}
            <button type="button" className={styles.textBtn} onClick={() => onPickImage(module === 'dresscode' ? 'dresscode' : undefined, (url) => url && write((list) => [...list, url]))}>
                <ImagePlus size={17} /> {t('build_editor.bg_image')}
            </button>

            {images.length > 0 && <span className={styles.divider} />}
            {images.length > 0 && (
                <SortableThumbs images={images} onReorder={(next) => write(() => next)} selected={selected} onSelectedChange={setSelected} />
            )}

            <span className={styles.divider} />
            <button
                type="button"
                className={styles.iconBtn}
                title={t('build_editor.remove_image')}
                onClick={() => {
                    if (!hasSelected) return
                    write((list) => list.filter((_, j) => j !== selected))
                    setSelected(null)
                }}
                {...offProps}
            >
                <Trash2 size={18} />
            </button>
        </div>
    )
}
