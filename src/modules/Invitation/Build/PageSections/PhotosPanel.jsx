import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditorCatalog } from './useEditorCatalog'
import base from './ToolPanels.module.css'
import styles from './PhotosPanel.module.css'

// Panel Fotos (handoff "Panel lateral" 4.3): ideas de i attend para cada
// sección. Sale del catálogo (editor_categories / editor_assets con panel =
// 'photos', Admin → Laboratorio → Elementos → Fotos). Al abrirlo se
// preselecciona la categoría de la sección que se ve (`section_key`); si no
// hay, la primera (Portada). Cada categoría se parte en subgrupos (p. ej.
// Dresscode → Black Tie / Cocktail / Formal); se muestran completas. Los
// chips quedan fijos arriba al hacer scroll.
//
// Tocar una foto la usa en la sección de su categoría (se elige esa
// sección): portada → reemplaza la primera imagen o video; cita → su imagen;
// dresscode → se agrega a sus imágenes. Es un cambio más: se deshace con el
// dock.

const SECTION_LABEL = {
    cover: 'buttons_menu.cover', quote: 'buttons_menu.quote', dresscode: 'buttons_menu.dresscode',
    greeting: 'buttons_menu.greeting', family: 'buttons_menu.family', itinerary: 'buttons_menu.itinerary',
    gifts: 'buttons_menu.gifts', destinations: 'buttons_menu.destinations', notices: 'buttons_menu.notices', gallery: 'buttons_menu.gallery',
}

// Cómo se usa una foto en cada sección. Regresa el cambio a la invitación.
const APPLY = {
    cover: (url) => (prev) => {
        const raw = prev.cover?.image?.dev
        const list = Array.isArray(raw) ? [...raw] : raw ? [raw] : []
        list[0] = url
        const value = list.length === 1 ? list[0] : list
        return { ...prev, cover: { ...prev.cover, image: { ...prev.cover.image, dev: value, prod: value } } }
    },
    quote: (url) => (prev) => ({
        ...prev,
        quote: {
            ...prev.quote,
            image: { ...prev.quote.image, dev: url, prod: url, active: true },
            dynamic_background: { ...prev.quote.dynamic_background, active: false },
        },
    }),
    dresscode: (url) => (prev) => ({
        ...prev,
        dresscode: { ...prev.dresscode, dev: [...(prev.dresscode?.dev ?? []), url], images_active: true },
    }),
}

// Lo que ya usa la sección (para marcar la foto como elegida).
const inUse = (invitation, section, url) => {
    if (section === 'cover') {
        const raw = invitation?.cover?.image?.dev
        return Array.isArray(raw) ? raw.includes(url) : raw === url
    }
    if (section === 'quote') return invitation?.quote?.image?.active && invitation?.quote?.image?.dev === url
    if (section === 'dresscode') return (invitation?.dresscode?.dev ?? []).includes(url)
    return false
}

// Es el panel Fotos de todos los editores (EditorShell). Un side event / Flash
// solo tiene un lugar para una foto (el fondo): pasa `onUse(url)` (todas las
// categorías aplican ahí), `isInUse(url)` y su `banner`.
export const PhotosPanel = ({ invitation, setInvitation, setSaved, onSelectSection, selectedSection, onUse, isInUse, banner }) => {
    const { t, i18n } = useTranslation()
    const catalog = useEditorCatalog()
    const en = i18n.language?.startsWith('en')
    const nameOf = (c) => (en && c.name_en) || c.name_es

    const roots = useMemo(() => catalog.photos.filter((c) => !c.parent_id), [catalog])
    const childrenOf = (id) => catalog.photos.filter((c) => c.parent_id === id)
    const [rootId, setRootId] = useState(null)
    const anchor = useRef(null)
    // Al cambiar de categoría desde abajo, el cuerpo del panel vuelve arriba.
    const scrollTop = () => anchor.current?.closest('[data-tool-body]')?.scrollTo({ top: 0, behavior: 'smooth' })

    // Al abrir (o al cambiar de sección): la categoría de la sección que se ve.
    useEffect(() => {
        if (!roots.length) return
        const match = roots.find((c) => c.section_key === selectedSection)
        setRootId((cur) => (match ? match.id : cur && roots.some((c) => c.id === cur) ? cur : roots[0].id))
    }, [roots, selectedSection])

    const root = roots.find((c) => c.id === rootId) ?? null
    const groups = root ? (childrenOf(root.id).length ? childrenOf(root.id) : [root]) : []
    const sectionKey = root?.section_key
    const sectionName = selectedSection && SECTION_LABEL[selectedSection] ? t(SECTION_LABEL[selectedSection]) : null

    const use = (url) => {
        if (onUse) { onUse(url, sectionKey); return }
        if (!sectionKey || !APPLY[sectionKey]) return
        setInvitation(APPLY[sectionKey](url))
        setSaved(false)
        onSelectSection?.(sectionKey)
    }

    if (!catalog.loading && !roots.length) return <span className={base.empty}>{t('build_editor.photos_empty')}</span>

    return (
        <>
            <span ref={anchor} hidden />
            {banner ? <div className={styles.banner}>{banner}</div> : sectionName && (
                <div className={styles.banner}>
                    {t('build_editor.photos_banner_pre')} <b>{sectionName}</b> · {t('build_editor.photos_banner_post')}
                </div>
            )}

            {/* Chips fijos arriba al hacer scroll: se navega desde abajo. */}
            <div className={styles.sticky}>
                <div className={`${styles.chips} scroll-invitation`}>
                    {roots.map((c) => (
                        <button key={c.id} type="button" className={styles.chip} data-on={c.id === rootId || undefined} onClick={() => { setRootId(c.id); scrollTop() }}>
                            {nameOf(c)}
                        </button>
                    ))}
                </div>
            </div>

            {groups.map((g) => (
                <div key={g.id} className={base.group}>
                    {g !== root && <span className={styles.groupTitle}>{nameOf(g)}</span>}
                    <div className={styles.grid}>
                        {g.assets.map((a) => (
                            <button
                                key={a.id}
                                type="button"
                                className={styles.photo}
                                data-on={(isInUse ? isInUse(a.url) : inUse(invitation, sectionKey, a.url)) || undefined}
                                title={t('build_editor.photos_use')}
                                onClick={() => use(a.url)}
                            >
                                <img src={a.url} alt={a.name} loading="lazy" draggable={false} />
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </>
    )
}
