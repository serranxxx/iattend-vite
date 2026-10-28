import { useTranslation } from 'react-i18next'
import { Pin, Trash2 } from 'lucide-react'
import { DressStyleButton } from './DressStylePicker'
import styles from './ElementBar.module.css'

// Barra del link de inspiración del dresscode (dresscode.links[index]),
// arriba de la pieza. Reemplaza en escritorio al popover LinkEditor de
// iattend-events. Los links son texto, o en invitaciones viejas
// { URL, url, name }: se lee la URL y, si era objeto, se conserva su forma.
// "Estilo" elige cómo se ve el botón (catálogo B1–B6) y el texto del botón va
// en dresscode.button_label (vacío = "¿Necesitas inspiración?").
const linkUrl = (link) => (typeof link === 'string' ? link : link?.URL || link?.url || '')

export const LinkBar = ({ index, invitation, setInvitation, setSaved }) => {
    const { t } = useTranslation()
    const link = invitation?.dresscode?.links?.[index]

    const setLink = (value) => {
        setInvitation((prev) => {
            const links = [...(prev.dresscode?.links ?? [])]
            const cur = links[index]
            links[index] = cur && typeof cur === 'object' ? { ...cur, URL: value, url: value } : value
            return { ...prev, dresscode: { ...prev.dresscode, links } }
        })
        setSaved(false)
    }
    const remove = () => {
        setInvitation((prev) => {
            const links = (prev.dresscode?.links ?? []).filter((_, i) => i !== index)
            return { ...prev, dresscode: { ...prev.dresscode, links, links_active: links.length > 0 } }
        })
        setSaved(false)
        window.dispatchEvent(new Event('iattend-close-tool'))
    }

    return (
        <div className={styles.bar} data-edit-keep data-text-bar>
            <DressStyleButton kind="button" invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            <span className={styles.divider} />
            <span className={styles.barIcon}><Pin size={18} /></span>
            <input
                autoFocus
                className={styles.addressInput}
                placeholder={t('build_editor.dress_link_placeholder')}
                value={linkUrl(link)}
                onChange={(e) => setLink(e.target.value)}
            />
            <input
                className={`${styles.addressInput} ${styles.inputHalf}`}
                placeholder={t('build_editor.dress_button_label')}
                value={invitation?.dresscode?.button_label ?? ''}
                onChange={(e) => {
                    const value = e.target.value
                    setInvitation((prev) => ({ ...prev, dresscode: { ...prev.dresscode, button_label: value || null } }))
                    setSaved(false)
                }}
            />
            <span className={styles.divider} />
            <button type="button" className={styles.iconBtn} title={t('build_editor.dress_link_remove')} onClick={remove}>
                <Trash2 size={18} />
            </button>
        </div>
    )
}
