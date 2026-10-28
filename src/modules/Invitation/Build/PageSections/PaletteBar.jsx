import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { DressStyleButton } from './DressStylePicker'
import { guessColorName } from './colorUtils'
import styles from './ElementBar.module.css'

// Barra de la paleta del dresscode (dresscode.colors), arriba de la pieza.
// Reemplaza en escritorio al selector de antd de "Agregar paleta de colores":
// cada color es un botón (al tocarlo se edita en el panel "Color" del riel),
// "+" agrega uno y lo deja elegido, y el bote quita el elegido. "Estilo" elige
// cómo se ve la paleta (catálogo P1–P6) y, salvo en P1, el color elegido lleva
// su nombre (dresscode.color_names, mismo orden que colors).
export const PaletteBar = ({ colors, selected, onSelect, onAdd, onRemove, invitation, setInvitation, setSaved }) => {
    const { t } = useTranslation()
    const hasSelected = selected != null && selected < colors.length
    const offProps = hasSelected ? {} : { 'aria-disabled': true, 'data-off': true }

    const names = invitation?.dresscode?.color_names ?? []
    const showNames = Boolean(invitation?.dresscode?.palette_style) && invitation.dresscode.palette_style !== 'P1'
    const setName = (value) => {
        setInvitation((prev) => {
            const next = [...(prev.dresscode?.color_names ?? [])]
            while (next.length < (prev.dresscode?.colors ?? []).length) next.push(null)
            next[selected] = value
            return { ...prev, dresscode: { ...prev.dresscode, color_names: next } }
        })
        setSaved(false)
    }

    return (
        <div className={styles.bar} data-edit-keep data-text-bar>
            <DressStyleButton kind="palette" invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            <span className={styles.divider} />
            {colors.map((c, i) => (
                <button
                    key={i}
                    type="button"
                    className={styles.swatchBtn}
                    data-on={selected === i || undefined}
                    title={c}
                    onClick={() => onSelect(i)}
                >
                    <span className={styles.swatch} style={{ background: c }} />
                </button>
            ))}
            {colors.length ? (
                <button type="button" className={styles.iconBtn} title={t('build_editor.dress_add_color')} onClick={onAdd}>
                    <Plus size={18} />
                </button>
            ) : (
                <button type="button" className={styles.textBtn} onClick={onAdd}>
                    <Plus size={17} /> {t('build_editor.dress_add_color')}
                </button>
            )}

            {showNames && hasSelected && (
                <>
                    <span className={styles.divider} />
                    <input
                        className={`${styles.addressInput} ${styles.inputHalf}`}
                        // Sugerencia: el nombre que se pondrá si no escriben uno.
                        placeholder={guessColorName(colors[selected]) || t('build_editor.dress_color_name')}
                        value={names[selected] ?? ''}
                        onChange={(e) => setName(e.target.value)}
                    />
                </>
            )}

            <span className={styles.divider} />

            <button
                type="button"
                className={styles.iconBtn}
                title={t('build_editor.dress_remove_color')}
                onClick={() => hasSelected && onRemove(selected)}
                {...offProps}
            >
                <Trash2 size={18} />
            </button>
        </div>
    )
}
