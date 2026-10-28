import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input, Popover } from 'antd'
import { ImageMinus, ImagePlus, MapPin } from 'lucide-react'
import { AddressAutocomplete } from '../../../SideEvents/AddressAutocomplete'
import { ADDRESS_FIELDS } from '../BuildSections/addressFields'
import styles from './ElementBar.module.css'

// Barra de un momento del itinerario (o de un destino), arriba de la pieza,
// con el formato de las demás barras. Reemplaza en escritorio a los popovers
// MomentAddress y MomentImage:
// - "moment_address:N": buscador de Google y "Agregar manual" (campos en un
//   popover debajo). Al guardar, la barra se cierra (iattend-close-tool).
// - "moment_image:N" / "dest_image:N": miniatura, "Cambiar imagen" (panel
//   "Imágenes" del riel) y quitar.

const LISTS = {
    moment_address: ['itinerary', 'object'],
    moment_image: ['itinerary', 'object'],
    dest_image: ['destinations', 'cards'],
}

const closeTool = () => window.dispatchEvent(new Event('iattend-close-tool'))

export const MomentBar = ({ field, invitation, setInvitation, setSaved, onPickImage }) => {
    const { t } = useTranslation()
    const [kind, n] = field.split(':')
    const index = Number(n)
    const [mod, key] = LISTS[kind]
    const item = invitation?.[mod]?.[key]?.[index] ?? {}

    const patchItem = (patch) => {
        setInvitation((prev) => ({
            ...prev,
            [mod]: { ...prev[mod], [key]: prev[mod][key].map((obj, i) => (i === index ? { ...obj, ...patch(obj) } : obj)) },
        }))
        setSaved(false)
    }

    if (kind === 'moment_address') return <AddressBar t={t} patchItem={patchItem} />

    const image = item.image ?? null
    return (
        <div className={styles.bar} data-edit-keep data-text-bar>
            {image && <img className={styles.thumb} src={image} alt="" />}
            <button type="button" className={styles.textBtn} onClick={() => onPickImage((url) => url && patchItem(() => ({ image: url })))}>
                <ImagePlus size={17} /> {image ? t('build_editor.change_image') : t('build_editor.bg_image')}
            </button>
            {image && (
                <button type="button" className={styles.iconBtn} title={t('build_editor.remove_image')} onClick={() => patchItem(() => ({ image: null }))}>
                    <ImageMinus size={18} />
                </button>
            )}
        </div>
    )
}

const AddressBar = ({ t, patchItem }) => {
    const [manual, setManual] = useState(false)
    const [draft, setDraft] = useState({})

    const save = (address) => {
        patchItem((obj) => ({ address: { ...(obj.address ?? {}), ...address } }))
        setManual(false)
        closeTool()
    }
    const onSelect = (place) => save({
        street: place.street || null,
        number: place.number || null,
        neighborhood: place.neighborhood || null,
        zip: place.zipcode || null,
        city: place.city || null,
        state: place.state || null,
        country: place.country || null,
        url: place.url || null,
    })
    const hasDraft = ADDRESS_FIELDS.some(([k]) => draft[k]?.trim())

    return (
        <div className={styles.bar} data-edit-keep data-text-bar>
            <span className={styles.barIcon}><MapPin size={18} /></span>
            <AddressAutocomplete onSelect={onSelect} className={styles.addressInput} placeholder={t('build_editor.search_address')} />
            <span className={styles.divider} />
            <Popover
                open={manual}
                onOpenChange={setManual}
                trigger="click"
                placement="bottom"
                arrow={false}
                content={(
                    <div className={styles.pop} data-text-bar onMouseDown={(e) => e.stopPropagation()}>
                        <div className={styles.addressGrid}>
                            {ADDRESS_FIELDS.map(([k, label]) => (
                                <Input
                                    key={k}
                                    className={k === 'url' ? styles.addressWide : undefined}
                                    placeholder={t(label)}
                                    value={draft[k] ?? ''}
                                    onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                                />
                            ))}
                        </div>
                        <Button
                            type="primary"
                            disabled={!hasDraft}
                            style={{ borderRadius: 99 }}
                            onClick={() => save(Object.fromEntries(ADDRESS_FIELDS.map(([k]) => [k, draft[k]?.trim() || null])))}
                        >
                            {t('build_editor.save_address')}
                        </Button>
                    </div>
                )}
            >
                <button type="button" className={styles.textBtn} data-on={manual || undefined}>
                    {t('build_editor.add_manual')}
                </button>
            </Popover>
        </div>
    )
}
