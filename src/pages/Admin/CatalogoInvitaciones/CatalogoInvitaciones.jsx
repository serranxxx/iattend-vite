import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Checkbox, Dropdown, Modal, Spin, Tag, message } from 'antd'
import { ArrowLeft, ArrowRight, ChevronDown, Copy, Eye, ImageOff, Palette, X } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { BuildContent } from '../../../modules/Invitation/Build/PageSections/BuildContent'
import { fetchAdminInvitaciones, fetchAdminInvitacionData } from '../catalogoAdminApi'
import styles from './CatalogoInvitaciones.module.css'

const PAGE_SIZE = 100

// `cover.image.prod` puede ser string, array (carrusel de portada) o null
const firstCoverUrl = (coverImage) => {
    if (typeof coverImage === 'string' && coverImage.trim()) return coverImage
    if (Array.isArray(coverImage)) {
        return coverImage.find((s) => typeof s === 'string' && s.trim()) ?? null
    }
    return null
}

// Mismo espejo dev/prod que arman BuildPage/TextureLabPage antes de alimentar
// el preview — /host renderiza con dev=true y lee cover.image.dev/quote.image.dev,
// que en la data guardada siempre vienen en null.
const mirrorDevData = (raw) => ({
    ...raw,
    cover: {
        ...raw.cover,
        image: { ...raw.cover?.image, dev: raw.cover?.image?.prod },
    },
    quote: {
        ...raw.quote,
        image: { ...raw.quote?.image, dev: raw.quote?.image?.prod },
    },
    dresscode: { ...raw.dresscode, dev: raw.dresscode?.prod },
    gallery: { ...raw.gallery, dev: raw.gallery?.prod },
})

// Misma forma de liga pública que usa EventosSection
const publicUrlOf = (inv) => (
    inv.label && inv.name ? `https://www.iattend.events/${inv.label}/${inv.name}` : null
)

// Qué se puede llevar en una copia: módulos de contenido (la información tal
// cual está en invitations.data, módulo por módulo) y aspectos de estilo
const CONTENT_MODULES = [
    { key: 'cover', label: 'Portada' },
    { key: 'greeting', label: 'Bienvenida' },
    { key: 'quote', label: 'Frase' },
    { key: 'people', label: 'Personas' },
    { key: 'itinerary', label: 'Itinerario' },
    { key: 'dresscode', label: 'Dress code' },
    { key: 'gifts', label: 'Mesa de regalos' },
    { key: 'notices', label: 'Avisos' },
    { key: 'gallery', label: 'Galería' },
    { key: 'destinations', label: 'Destinos' },
]

const STYLE_OPTIONS = [
    { key: 'colors', label: 'Colores' },
    { key: 'fonts', label: 'Tipografías' },
    { key: 'texture', label: 'Texturas' },
    { key: 'separator', label: 'Separadores' },
    { key: 'positions', label: 'Orden' },
    { key: 'song', label: 'Canción' },
]

const ALL_CONTENT_KEYS = CONTENT_MODULES.map((m) => m.key)
const ALL_STYLE_KEYS = STYLE_OPTIONS.map((s) => s.key)

const initialsOf = (inv) => {
    const source = inv.owner_name || inv.user_email || ''
    const words = source.trim().split(/\s+/).filter(Boolean)
    if (!words.length) return '—'
    return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

// `tipo` viene del Segmented Clientes/Tests que vive en el extra content
// de las tabs de Laboratorio (HerramientasSection); clientes y tests nunca
// se mezclan — el backend filtra por role del owner
export const CatalogoInvitaciones = ({ tipo }) => {
    const [invitations, setInvitations] = useState([])
    const [loading, setLoading] = useState(false)

    // Invitación abierta en el modal: { inv, data } | null
    const [selected, setSelected] = useState(null)
    const [loadingDataId, setLoadingDataId] = useState(null)
    const dataCache = useRef(new Map())

    // Estado que pide BuildContent (mockup de teléfono del builder)
    const [positionY, setPositionY] = useState('cover')
    const [device, setDevice] = useState('ios')
    const [onHide, setOnHide] = useState(false)

    // Destinos de "Copiar estilos": siempre las invitaciones de tests
    const [testTargets, setTestTargets] = useState(null)
    const [loadingTests, setLoadingTests] = useState(false)

    // Picker de qué llevar en la copia (todo seleccionado por default)
    const [copyOpen, setCopyOpen] = useState(false)
    const [pickerTarget, setPickerTarget] = useState(null)
    const [contentSel, setContentSel] = useState(new Set(ALL_CONTENT_KEYS))
    const [stylesSel, setStylesSel] = useState(new Set(ALL_STYLE_KEYS))
    const [groupsOpen, setGroupsOpen] = useState({ contenido: false, estilos: false })

    const openPicker = (target) => {
        setPickerTarget(target)
        setContentSel(new Set(ALL_CONTENT_KEYS))
        setStylesSel(new Set(ALL_STYLE_KEYS))
        setGroupsOpen({ contenido: false, estilos: false })
    }

    const toggleGroup = (group) => setGroupsOpen((prev) => ({ ...prev, [group]: !prev[group] }))

    const toggleIn = (setter) => (key) => setter((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
    })
    const toggleContent = toggleIn(setContentSel)
    const toggleStyle = toggleIn(setStylesSel)

    const confirmCopy = (sourceInv) => {
        if (!pickerTarget) return
        const params = new URLSearchParams({ id: pickerTarget.id, copyFrom: sourceInv.id })
        const content = CONTENT_MODULES.filter((m) => contentSel.has(m.key)).map((m) => m.key)
        const stylesSelected = STYLE_OPTIONS.filter((s) => stylesSel.has(s.key)).map((s) => s.key)
        if (content.length) params.set('copyContent', content.join(','))
        if (stylesSelected.length) params.set('copyStyles', stylesSelected.join(','))
        window.open(`${window.location.origin}/dashboard/build?${params.toString()}`, '_blank', 'noopener')
        setPickerTarget(null)
    }

    const loadTestTargets = async () => {
        if (testTargets || loadingTests) return
        setLoadingTests(true)
        try {
            let all = []
            let total = 0
            do {
                const { data } = await fetchAdminInvitaciones({ limit: PAGE_SIZE, offset: all.length, tipo: 'pruebas' })
                total = data.total ?? 0
                if (!data.invitations?.length) break
                all = [...all, ...data.invitations]
            } while (all.length < total)
            setTestTargets(all)
        } catch (error) {
            console.error('Error al cargar invitaciones de tests:', error)
            message.error('No se pudieron cargar las invitaciones de tests')
        } finally {
            setLoadingTests(false)
        }
    }

    const loadAll = useCallback(async (tipoActual) => {
        setLoading(true)
        try {
            let all = []
            let total = 0
            do {
                const { data } = await fetchAdminInvitaciones({ limit: PAGE_SIZE, offset: all.length, tipo: tipoActual })
                total = data.total ?? 0
                if (!data.invitations?.length) break
                all = [...all, ...data.invitations]
            } while (all.length < total)
            setInvitations(all)
        } catch (error) {
            console.error('Error al cargar el catálogo:', error)
            message.error(error?.response?.data?.msg || 'No se pudo cargar el catálogo')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        setSelected(null)
        loadAll(tipo)
    }, [loadAll, tipo])

    const openInvitation = async (inv) => {
        if (loadingDataId) return
        const cached = dataCache.current.get(inv.id)
        if (cached) { setSelected({ inv, data: cached }); return }

        setLoadingDataId(inv.id)
        try {
            const { data } = await fetchAdminInvitacionData(inv.id)
            if (!data?.data) {
                message.warning('Esta invitación no tiene contenido para mostrar')
                return
            }
            const mirrored = mirrorDevData(data.data)
            dataCache.current.set(inv.id, mirrored)
            setSelected({ inv, data: mirrored })
        } catch (error) {
            console.error('Error al cargar la invitación:', error)
            message.error(error?.response?.data?.msg || 'No se pudo cargar la invitación')
        } finally {
            setLoadingDataId(null)
        }
    }

    const copyToClipboard = (text, okMsg) => {
        navigator.clipboard.writeText(text)
            .then(() => message.success(okMsg))
            .catch(() => message.error('No se pudo copiar'))
    }

    // Banner de vigencia: `event_date` viene como medianoche UTC — solo la
    // parte de fecha, convertirla a hora local mostraría un día antes
    const renderEventBanner = (eventDate) => {
        const date = eventDate ? dayjs(String(eventDate).slice(0, 10)) : null
        const expired = date ? date.isBefore(dayjs(), 'day') : false
        const variant = !date ? styles.bannerNeutral : expired ? styles.bannerExpired : styles.bannerActive
        return (
            <div className={`${styles.eventBanner} ${variant}`}>
                <span className={styles.bannerLabel}>
                    <span className={styles.bannerDot} />
                    {!date ? 'Sin fecha de evento' : expired ? 'Evento vencido' : 'Evento vigente'}
                </span>
                {date && <span className={styles.bannerDate}>{date.locale('es').format('DD MMM YYYY')}</span>}
            </div>
        )
    }

    const renderTile = (inv) => {
        const coverUrl = firstCoverUrl(inv.cover_image)
        const zoom = typeof inv.cover_zoom === 'number' ? inv.cover_zoom : 1
        const publicPath = inv.label && inv.name ? `${inv.label}/${inv.name}` : null

        return (
            <div
                key={inv.id}
                className={styles.tile}
                onClick={() => openInvitation(inv)}
                role="button"
                tabIndex={0}
            >
                {coverUrl ? (
                    <div
                        className={styles.cover}
                        style={{
                            backgroundImage: `url("${coverUrl}")`,
                            // Misma fórmula que Cover.tsx en iattend-events:
                            // solo zoom (scale) sobre imagen full-bleed centrada
                            transform: `scale(${zoom})`,
                        }}
                    />
                ) : (
                    <div className={styles.coverPlaceholder}>
                        <ImageOff size={28} />
                        <span>Sin portada</span>
                    </div>
                )}

                <div className={styles.metaOverlay}>
                    <span className={styles.metaName}>{publicPath ?? 'Sin publicar'}</span>
                    <div className={styles.metaRow}>
                        {inv.plan && <Tag className={styles.planTag}>{String(inv.plan).toUpperCase()}</Tag>}
                        <span className={styles.metaDate}>{dayjs(inv.created_at).locale('es').format('DD MMM YYYY')}</span>
                    </div>
                </div>

                <div className={styles.tileHover}>
                    <Eye size={18} />
                    <span>Ver invitación</span>
                </div>

                {loadingDataId === inv.id && (
                    <div className={styles.tileLoading}><Spin /></div>
                )}
            </div>
        )
    }

    const renderModalContent = () => {
        const { inv } = selected
        const publicUrl = publicUrlOf(inv)
        const ownersTitle = Array.isArray(inv.owners) && inv.owners.length
            ? inv.owners.join(' & ')
            : (inv.name ?? 'Sin publicar')

        return (
            <div className={styles.modalLayout}>
                <aside className={styles.leftPanel}>
                    <div className={styles.ownerRow}>
                        <div className={styles.ownerId}>
                            <div className={styles.avatar}>{initialsOf(inv)}</div>
                            <div className={styles.ownerText}>
                                <span className={styles.headerName}>{inv.owner_name ?? 'Sin perfil'}</span>
                                <span className={styles.headerEmail}>{inv.user_email ?? 'sin correo'}</span>
                            </div>
                        </div>
                    </div>

                    {renderEventBanner(inv.event_date)}

                    <div className={styles.titleBlock}>
                        <h2 className={styles.ownersTitle}>{ownersTitle}</h2>
                        <span className={styles.subTitle}>
                            {inv.label ? `Plantilla ${inv.label.charAt(0).toUpperCase()}${inv.label.slice(1)}` : 'Sin plantilla'}
                            {inv.plan ? ` · Plan ${String(inv.plan).toUpperCase()}` : ''}
                        </span>
                    </div>

                    <div className={styles.linkRow}>
                        <span className={styles.linkLabel}>Enlace</span>
                        <span className={styles.linkValue}>
                            {publicUrl ? publicUrl.replace('https://www.', '') : 'Sin publicar'}
                        </span>
                        <Button
                            size="small"
                            className={styles.copyBtn}
                            disabled={!publicUrl}
                            onClick={() => copyToClipboard(publicUrl, 'Liga pública copiada')}
                        >
                            Copiar
                        </Button>
                    </div>

                    <div className={styles.actions}>
                            <Dropdown
                                trigger={['click']}
                                placement="topLeft"
                                onOpenChange={(open) => {
                                    setCopyOpen(open)
                                    if (open) loadTestTargets()
                                    else setPickerTarget(null)
                                }}
                                popupRender={() => (
                                    <div className={styles.styleTargets}>
                                        {pickerTarget ? (
                                            <>
                                                <div className={styles.pickerHeader}>
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<ArrowLeft size={14} />}
                                                        onClick={() => setPickerTarget(null)}
                                                        aria-label="Volver"
                                                    />
                                                    <span className={styles.styleTargetsTitle}>
                                                        Copiar {inv.name ?? 'invitación'}
                                                    </span>
                                                </div>

                                                <div className={styles.pickerGroups}>
                                                    <div className={styles.pickerGroupRow}>
                                                        <Checkbox
                                                            checked={contentSel.size === ALL_CONTENT_KEYS.length}
                                                            indeterminate={contentSel.size > 0 && contentSel.size < ALL_CONTENT_KEYS.length}
                                                            onChange={(e) => setContentSel(new Set(e.target.checked ? ALL_CONTENT_KEYS : []))}
                                                        >
                                                            <span className={styles.pickerGroupLabel}>Contenido ({CONTENT_MODULES.length})</span>
                                                        </Checkbox>
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            aria-label="Mostrar u ocultar módulos de contenido"
                                                            icon={<ChevronDown size={14} className={`${styles.chevron} ${groupsOpen.contenido ? '' : styles.chevronClosed}`} />}
                                                            onClick={() => toggleGroup('contenido')}
                                                        />
                                                    </div>
                                                    <div className={`${styles.collapse} ${groupsOpen.contenido ? styles.collapseOpen : ''}`}>
                                                        <div className={styles.collapseInner}>
                                                            <div className={styles.pickerChildren}>
                                                                {CONTENT_MODULES.map((m) => (
                                                                    <Checkbox
                                                                        key={m.key}
                                                                        checked={contentSel.has(m.key)}
                                                                        onChange={() => toggleContent(m.key)}
                                                                    >
                                                                        {m.label}
                                                                    </Checkbox>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={styles.pickerGroupRow}>
                                                        <Checkbox
                                                            checked={stylesSel.size === ALL_STYLE_KEYS.length}
                                                            indeterminate={stylesSel.size > 0 && stylesSel.size < ALL_STYLE_KEYS.length}
                                                            onChange={(e) => setStylesSel(new Set(e.target.checked ? ALL_STYLE_KEYS : []))}
                                                        >
                                                            <span className={styles.pickerGroupLabel}>Estilos ({STYLE_OPTIONS.length})</span>
                                                        </Checkbox>
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            aria-label="Mostrar u ocultar aspectos de estilo"
                                                            icon={<ChevronDown size={14} className={`${styles.chevron} ${groupsOpen.estilos ? '' : styles.chevronClosed}`} />}
                                                            onClick={() => toggleGroup('estilos')}
                                                        />
                                                    </div>
                                                    <div className={`${styles.collapse} ${groupsOpen.estilos ? styles.collapseOpen : ''}`}>
                                                        <div className={styles.collapseInner}>
                                                            <div className={styles.pickerChildren}>
                                                                {STYLE_OPTIONS.map((s) => (
                                                                    <Checkbox
                                                                        key={s.key}
                                                                        checked={stylesSel.has(s.key)}
                                                                        onChange={() => toggleStyle(s.key)}
                                                                    >
                                                                        {s.label}
                                                                    </Checkbox>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button
                                                    block
                                                    className={styles.pickerConfirm}
                                                    icon={<Palette size={14} />}
                                                    disabled={!contentSel.size && !stylesSel.size}
                                                    onClick={() => confirmCopy(inv)}
                                                >
                                                    Copiar estilos
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <span className={styles.styleTargetsTitle}>
                                                    Copiar esta invitación a una de tests
                                                </span>
                                                {loadingTests || !testTargets ? (
                                                    <div className={styles.styleTargetsLoading}><Spin size="small" /></div>
                                                ) : (
                                                    <div className={styles.styleTargetsList}>
                                                        {testTargets.filter((t) => t.id !== inv.id).map((t) => (
                                                            <div key={t.id} className={styles.styleTargetRow}>
                                                                <span className={styles.styleTargetUser}>{t.owner_name ?? 'Sin perfil'}</span>
                                                                <span className={styles.styleTargetName}>{t.name ?? 'Sin publicar'}</span>
                                                                <Button
                                                                    size="small"
                                                                    shape="circle"
                                                                    className={styles.styleTargetGo}
                                                                    icon={<ArrowRight size={14} />}
                                                                    aria-label="Elegir qué llevar a esta invitación"
                                                                    onClick={() => openPicker(t)}
                                                                />
                                                            </div>
                                                        ))}
                                                        {!testTargets.filter((t) => t.id !== inv.id).length && (
                                                            <span className={styles.styleTargetsEmpty}>No hay invitaciones de tests</span>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            >
                                <Button block className={styles.openBtn} icon={<Copy size={16} />} disabled={copyOpen}>
                                    Crear copia
                                </Button>
                            </Dropdown>
                    </div>
                </aside>

                <section className={styles.previewPanel}>
                    <span className={styles.previewPill}>Vista previa · iPhone</span>
                    <button
                        type="button"
                        className={styles.modalClose}
                        onClick={() => setSelected(null)}
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                    <div className={styles.previewStage}>
                        <BuildContent
                            invitation={selected.data}
                            positionY={positionY}
                            setPositionY={setPositionY}
                            currentDevice={device}
                            setDevice={setDevice}
                            onHide={onHide}
                            setOnHide={setOnHide}
                            minimalControls
                        />
                    </div>
                </section>
            </div>
        )
    }

    return (
        <div className={styles.root}>
            <div className={styles.toolbar}>
                <span className={styles.counter}>
                    {loading ? 'Cargando…' : `${invitations.length} invitaciones`}
                </span>
            </div>

            {loading && !invitations.length ? (
                <div className={styles.loadingState}><Spin /></div>
            ) : (
                <div className={styles.grid}>
                    {invitations.map(renderTile)}
                </div>
            )}

            <Modal
                open={!!selected}
                onCancel={() => setSelected(null)}
                footer={null}
                destroyOnHidden
                closable={false}
                width="min(1100px, 94vw)"
                className={styles.previewModal}
                styles={{
                    content: { padding: 0, overflow: 'hidden', borderRadius: 28 },
                    body: { padding: 0 },
                }}
            >
                {selected && renderModalContent()}
            </Modal>
        </div>
    )
}
