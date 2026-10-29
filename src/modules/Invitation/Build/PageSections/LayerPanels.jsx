import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message } from 'antd'
import {
    Bird, Cake, Camera, Church, Flower, Flower2, Gem, Heart, Infinity as InfinityIcon,
    ChevronRight, Leaf, LoaderCircle, Plus, WandSparkles, Moon, Music, Search, Sparkles, Star, Sun, Upload, Wine, X,
} from 'lucide-react'
import {
    countStickers, LINE_VARIANTS, MAX_STICKERS,
    SEPARATORS, startLayerDrag, stickerItem, stickerLibrary, uploadStickers,
} from './layerItems'
import { Separador } from '../../../../components/Invitation/Logos'
import { iconsItinerary } from '../../../../helpers/services/menuIcons'
import { coincide, esNueva, useEditorCatalog } from './useEditorCatalog'
import { LiveSlider } from './barControls'
import { esUrlDeVector, estiloVector, useVector, VECTOR_BASE } from '../../../Editor/vector'
import base from './ToolPanels.module.css'
import styles from './LayerPanels.module.css'

// Paneles Elementos y Stickers del editor de escritorio (etapa 3). Cada
// tarjeta se arrastra a la invitación (o se agrega con un clic a la sección
// que se ve). La pieza los pinta y los edita: SectionLayer en iattend-events.

const ICONS = {
    Heart, Sparkles, Star, Flower, Flower2, Leaf, Gem, Moon, Sun, Wine, Music, Camera, Church, Infinity: InfinityIcon, Bird, Cake,
}

// Muestra de cada forma en el panel (la pieza las dibuja en SectionLayer).
const ShapeSample = ({ variant }) => {
    const box = variant === 'rect' ? { width: 30, height: 18 } : { width: 22, height: 22 }
    return (
        // Contorno, sin relleno (así entran a la invitación).
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" {...box} fill="none" stroke="currentColor" strokeWidth="2" overflow="visible">
            {variant === 'circle' ? <ellipse cx="50" cy="50" rx="50" ry="50" vectorEffect="non-scaling-stroke" />
                : variant === 'triangle' ? <polygon points="50,2 98,98 2,98" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                : variant === 'star' ? <polygon points="50,3 61,37 97,37 68,59 79,94 50,72 21,94 32,59 3,37 39,37" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                : <rect x="0" y="0" width="100" height="100" vectorEffect="non-scaling-stroke" />}
        </svg>
    )
}

const TEXT_CARDS = [
    { variant: 'title', w: 60 },
    { variant: 'subtitle', w: 50 },
    { variant: 'body', w: 70 },
]

// Cuántos se asoman en la vista "Todo" por tipo de categoría.
const PREVIEW = { icon: 10, shape: 5, image: 3, line: 4, separator: 2, vector: 6 }

// Categoría Vectores: celdas grandes (3 por fila) con el SVG en línea y un
// trazo fijo legible; con máscara, a ese tamaño, la línea casi no se veía.
const esVectores = (cat) => cat.slug === 'vectores'
const tipoDe = (cat) => (esVectores(cat) ? 'vector' : cat.kind)
// 1 px: el mismo grosor con que entra a la pieza (TRAZO_INICIAL).
const MINI_TRAZO = { strokeFixed: true, strokePx: 1 }
// Un vector del catálogo entra con trazo de 1 px al ancho con que se suelta
// (en el teléfono de 390 px) y desde ahí escala con él; el original del
// archivo, a ese tamaño, quedaba en menos de 1 px.
const TRAZO_INICIAL = (w) => ({ strokeRel: 1 / ((w / 100) * VECTOR_BASE) })

const VectorThumb = ({ url }) => {
    const info = useVector(url)
    return info
        ? <span className={styles.vectorThumb} style={estiloVector(MINI_TRAZO, info)} dangerouslySetInnerHTML={{ __html: info.markup }} />
        : <span className={`${styles.maskIcon} ${styles.vectorThumb}`} style={{ WebkitMaskImage: `url("${url}")`, maskImage: `url("${url}")` }} />
}

// Categorías que viven en código (no en el catálogo): líneas y separadores.
const CODE_CATEGORIES = [
    { id: 'lineas', slug: 'lineas', kind: 'line', labelKey: 'build_editor.el_lines', assets: LINE_VARIANTS.map((v) => ({ id: v, name: v, variant: v, tags: ['linea', 'line'] })) },
    { id: 'separadores', slug: 'separadores', kind: 'separator', labelKey: 'build_editor.el_separators', assets: SEPARATORS.map((n) => ({ id: String(n), name: String(n), variant: String(n), tags: ['separador', 'separator', 'adorno', 'ornament', 'decoracion'] })) },
]

// Panel Elementos (handoff "Panel lateral" 4.2): buscador que busca en todas
// las categorías, chips con scroll horizontal (Todo + categorías), y en
// "Todo" el bloque Texto fijo arriba y una fila por categoría con su conteo
// y "›" para filtrarla. Las categorías salen del catálogo
// (useEditorCatalog: editor_categories / editor_assets, Admin → Laboratorio
// → Elementos), con badge "Nuevo" hasta `new_until`; líneas y separadores
// viven en código. A la invitación todo entra ARRASTRANDO.
//
// `iconRequest` ({ index }): se entró tocando el ícono de un momento del
// itinerario. Con él, un clic en un ícono / forma / ilustración lo pone como
// ícono de ese momento ("lucide:<Nombre>", "svg:<url>", "shape:<forma>" o la
// ruta de la imagen); textos, líneas y separadores no aplican (se atenúan).
export const ElementsPanel = ({ invitation, setInvitation, setSaved, iconRequest, clearIconRequest, onOpenTool }) => {
    const { t, i18n } = useTranslation()
    const catalog = useEditorCatalog()
    const en = i18n.language?.startsWith('en')
    const momentName = iconRequest ? invitation?.itinerary?.object?.[iconRequest.index]?.name : null
    const setMomentIcon = (value) => {
        if (!iconRequest) return
        const index = iconRequest.index
        setInvitation((prev) => ({
            ...prev,
            itinerary: { ...prev.itinerary, object: prev.itinerary.object.map((obj, i) => (i === index ? { ...obj, icon: value } : obj)) },
        }))
        setSaved(false)
    }
    const momentIcon = iconRequest ? invitation?.itinerary?.object?.[iconRequest.index]?.icon : null
    // Color propio del ícono del momento (`icon_color`): solo los que se
    // pintan (íconos, vectores, formas); una ilustración va con sus colores.
    const momentColor = iconRequest ? invitation?.itinerary?.object?.[iconRequest.index]?.icon_color ?? null : null
    const momentTintable = typeof momentIcon === 'string' && /^(lucide|svg|shape):/.test(momentIcon)
    // Grosor: íconos, formas y vectores; un SVG que se pinta como máscara no tiene trazo propio.
    const momentStrokable = momentTintable && (!momentIcon.startsWith('svg:') || esUrlDeVector(momentIcon.slice(4)))
    const momentStroke = iconRequest ? invitation?.itinerary?.object?.[iconRequest.index]?.icon_stroke ?? null : null
    const setMomentField = (patch) => {
        if (!iconRequest) return
        const index = iconRequest.index
        setInvitation((prev) => ({
            ...prev,
            itinerary: { ...prev.itinerary, object: prev.itinerary.object.map((obj, i) => (i === index ? { ...obj, ...patch } : obj)) },
        }))
        setSaved(false)
    }
    const setMomentColor = (color) => setMomentField({ icon_color: color })
    // Grosor del trazo, en px de un ícono de 24 px (la pieza lo escala al
    // tamaño de cada estilo). 1.6 = el de siempre; se guarda solo si cambia.
    const setMomentStroke = (v) => setMomentField({ icon_stroke: v === 1.6 ? null : v })
    const g = invitation?.generals
    const momentPalette = [...new Set([g?.colors?.primary, g?.colors?.secondary, g?.colors?.accent, g?.colors?.actions, '#FFFFFF', '#29262D']
        .filter(Boolean).map((c) => c.toUpperCase()))]
    const off = iconRequest ? { 'data-off': true } : {}
    const [query, setQuery] = useState('')
    const [view, setView] = useState('all')
    const anchor = useRef(null)
    // Al cambiar de categoría desde abajo, el cuerpo del panel vuelve arriba.
    const scrollTop = () => anchor.current?.closest('[data-tool-body]')?.scrollTo({ top: 0, behavior: 'smooth' })
    const q = query.trim()
    const titleFont = invitation?.generals?.fonts?.titles?.typeFace ?? invitation?.generals?.fonts?.body?.typeFace
    const bodyFont = invitation?.generals?.fonts?.body?.typeFace
    const accent = invitation?.generals?.colors?.accent ?? '#29262D'

    // Los íconos del itinerario (react-icons, en código) van al final de la
    // primera categoría de íconos: { it: n } → elemento "it:<n>" / ícono n
    // del momento.
    const itAssets = iconsItinerary.map((ic) => ({ id: `it-${ic.index}`, name: `it-${ic.index}`, tags: ['itinerario', 'itinerary'], it: ic }))
    const firstIcons = catalog.elements.findIndex((c) => c.kind === 'icon')
    const categories = [
        ...catalog.elements.map((c, i) => (i === firstIcons ? { ...c, assets: [...c.assets, ...itAssets] } : c)),
        ...CODE_CATEGORIES,
    ]
    // Entrando desde el ícono de un momento: directo a Íconos, arriba.
    useEffect(() => {
        if (!iconRequest || firstIcons < 0) return
        setView(catalog.elements[firstIcons].id)
        setQuery('')
        const id = setTimeout(scrollTop, 320)
        return () => clearTimeout(id)
    }, [iconRequest?.n, firstIcons])
    const nameOf = (c) => (c.labelKey ? t(c.labelKey) : (en && c.name_en) || c.name_es)
    useEffect(() => { if (view !== 'all' && !categories.some((c) => c.id === view)) setView('all') }, [catalog])

    const texts = TEXT_CARDS.filter((c) => !q || coincide({ name: t(`build_editor.el_${c.variant}`), tags: ['texto', 'text'] }, { name_es: '' }, q))

    // ── Celda de un recurso según el tipo de su categoría ──
    const cell = (cat, asset) => {
        if (cat.kind === 'line') {
            return (
                <div key={asset.id} className={styles.lineCell} {...off} onPointerDown={(e) => startLayerDrag(e, { kind: 'line', variant: asset.variant, w: 50, rot: 0, opacity: 1 })}>
                    <span className={styles.lineSample} data-variant={asset.variant} />
                </div>
            )
        }
        if (cat.kind === 'separator') {
            return (
                <div key={asset.id} className={`${styles.lineCell} ${styles.sepCell}`} {...off} onPointerDown={(e) => startLayerDrag(e, { kind: 'separator', variant: asset.variant, w: 60, rot: 0, opacity: 1 })}>
                    <Separador MainColor={accent} value={Number(asset.variant)} />
                </div>
            )
        }
        if (cat.kind === 'shape') {
            const value = `shape:${asset.variant}`
            return (
                <div
                    key={asset.id}
                    className={styles.iconCell}
                    title={asset.name}
                    data-on={momentIcon === value || undefined}
                    onPointerDown={(e) => startLayerDrag(e, { kind: 'shape', variant: asset.variant, w: asset.w ?? 26, ar: asset.ar ?? 1, rot: 0, opacity: 1, color: 'transparent', strokeWidth: 2 }, { onTap: () => setMomentIcon(value) })}
                >
                    <ShapeSample variant={asset.variant} />
                </div>
            )
        }
        if (cat.kind === 'icon' && asset.it) {
            const ItIcon = asset.it.value
            return (
                <div
                    key={asset.id}
                    className={styles.iconCell}
                    data-on={momentIcon === asset.it.index || undefined}
                    onPointerDown={(e) => startLayerDrag(e, { kind: 'icon', icon: `it:${asset.it.index}`, w: 14, rot: 0, opacity: 1 }, { onTap: () => setMomentIcon(asset.it.index) })}
                >
                    <ItIcon size={22} />
                </div>
            )
        }
        if (cat.kind === 'icon' && esVectores(cat) && asset.tintable) {
            return (
                <div
                    key={asset.id}
                    className={`${styles.artCell} ${styles.vectorCell}`}
                    title={asset.name}
                    data-on={momentIcon === `svg:${asset.url}` || undefined}
                    onPointerDown={(e) => startLayerDrag(e, { kind: 'icon', src: asset.url, tint: true, vector: true, w: asset.w ?? 30, ar: asset.ar ?? 1, rot: 0, opacity: 1, ...TRAZO_INICIAL(asset.w ?? 30) }, { onTap: () => setMomentIcon(`svg:${asset.url}`) })}
                >
                    <VectorThumb url={asset.url} />
                </div>
            )
        }
        if (cat.kind === 'icon') {
            const Icon = asset.lucide ? ICONS[asset.lucide] : null
            const value = asset.lucide ? `lucide:${asset.lucide}` : `svg:${asset.url}`
            const item = asset.lucide
                ? { kind: 'icon', icon: asset.lucide, w: asset.w ?? 14, rot: 0, opacity: 1 }
                : {
                    kind: 'icon', src: asset.url, tint: Boolean(asset.tintable), w: asset.w ?? 14, ar: asset.ar ?? 1, rot: 0, opacity: 1,
                }
            return (
                <div
                    key={asset.id}
                    className={styles.iconCell}
                    title={asset.name}
                    data-on={momentIcon === value || undefined}
                    onPointerDown={(e) => startLayerDrag(e, item, { onTap: () => setMomentIcon(value) })}
                >
                    {Icon ? <Icon size={22} strokeWidth={1.7} />
                        : asset.tintable ? <span className={styles.maskIcon} style={{ WebkitMaskImage: `url("${asset.url}")`, maskImage: `url("${asset.url}")` }} />
                        : <img className={styles.cellImg} src={asset.url} alt="" draggable={false} />}
                </div>
            )
        }
        // Imagen (PNG): entra como sticker.
        return (
            <div
                key={asset.id}
                className={styles.artCell}
                title={asset.name}
                data-on={momentIcon === asset.url || undefined}
                onPointerDown={(e) => startLayerDrag(e, { ...stickerItem(asset.url), w: asset.w ?? 26 }, { onTap: () => setMomentIcon(asset.url) })}
            >
                <img src={asset.url} alt={asset.name} draggable={false} loading="lazy" />
            </div>
        )
    }
    const grid = (cat, assets) => (
        <div className={cat.kind === 'image' || esVectores(cat) ? styles.artGrid : cat.kind === 'line' || cat.kind === 'separator' ? styles.lineGrid : styles.iconGrid5}>
            {assets.map((a) => cell(cat, a))}
        </div>
    )
    const header = (cat, count, withArrow) => (
        <button type="button" className={styles.rowHead} onClick={withArrow ? () => setView(cat.id) : undefined} data-static={!withArrow || undefined}>
            <span className={styles.rowTitle}>{nameOf(cat)}</span>
            {esNueva(cat) && <span className={styles.badgeNew}>{t('build_editor.el_new')}</span>}
            <span className={styles.rowCount}>{count}{withArrow && <ChevronRight size={15} />}</span>
        </button>
    )

    const textBlock = texts.length > 0 && (
        <div className={base.group}>
            <span className={base.groupLabel}>{t('build_editor.el_text')}</span>
            <span className={base.hint}>{t('build_editor.el_text_note')}</span>
            {texts.map((c) => (
                <div
                    key={c.variant}
                    className={styles.textCard}
                    data-variant={c.variant}
                    {...off}
                    style={{ fontFamily: `"${c.variant === 'title' ? titleFont : bodyFont}"` }}
                    onPointerDown={(e) => startLayerDrag(e, { kind: 'text', variant: c.variant, text: t(`build_editor.el_${c.variant}_text`), w: c.w, rot: 0, opacity: 1 })}
                >
                    {t(`build_editor.el_${c.variant}`)}
                </div>
            ))}
            {/* Lia sin texto elegido: genera un texto y lo agrega (panel oculto "ai"). */}
            {onOpenTool && !iconRequest && (
                <button type="button" className={styles.liaCard} onClick={() => onOpenTool('ai')}>
                    <WandSparkles size={16} />
                    <span>
                        <strong>{t('build_editor.el_lia')}</strong>
                        <span>{t('build_editor.el_lia_hint')}</span>
                    </span>
                </button>
            )}
        </div>
    )

    const selected = categories.find((c) => c.id === view)
    let body
    if (q) {
        // Búsqueda: en todas las categorías, completas.
        const hits = categories.map((c) => ({ c, list: c.assets.filter((a) => coincide(a, c, q)) })).filter((h) => h.list.length)
        body = (
            <>
                {textBlock}
                {hits.map(({ c, list }) => (
                    <div key={c.id} className={base.group}>
                        {header(c, list.length, false)}
                        {grid(c, list)}
                    </div>
                ))}
                {!texts.length && !hits.length && <span className={base.empty}>{t('build_editor.el_none')}</span>}
            </>
        )
    } else if (selected) {
        body = (
            <div className={base.group}>
                {header(selected, selected.assets.length, false)}
                {grid(selected, selected.assets)}
            </div>
        )
    } else {
        body = (
            <>
                {textBlock}
                {categories.filter((c) => c.assets.length).map((c) => (
                    <div key={c.id} className={base.group}>
                        {header(c, c.assets.length, c.assets.length > (PREVIEW[tipoDe(c)] ?? 5))}
                        {grid(c, c.assets.slice(0, PREVIEW[tipoDe(c)] ?? 5))}
                    </div>
                ))}
            </>
        )
    }

    return (
        <>
            <label ref={anchor} className={base.search}>
                <Search size={15} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('build_editor.el_search')} />
            </label>

            {/* Fijos arriba al hacer scroll: el aviso del momento y los chips,
                para navegar aunque se esté abajo. */}
            <div className={styles.sticky}>
                {iconRequest && (
                    <div className={styles.pickBanner}>
                        <span>{t('build_editor.el_pick_moment', { name: momentName || t('build_editor.el_pick_moment_fallback') })}</span>
                        <button type="button" aria-label={t('build_editor.close')} onClick={clearIconRequest}><X size={14} /></button>
                    </div>
                )}
                {iconRequest && momentTintable && (
                    <div className={styles.momentColors}>
                        <span className={styles.momentColorsLabel}>{t('build_editor.el_moment_color')}</span>
                        <button
                            type="button"
                            className={`${styles.momentSwatch} ${styles.momentAuto}`}
                            data-on={!momentColor || undefined}
                            title={t('build_editor.el_moment_color_auto')}
                            onClick={() => setMomentColor(null)}
                        >
                            A
                        </button>
                        {momentPalette.map((c) => (
                            <button
                                key={c}
                                type="button"
                                className={styles.momentSwatch}
                                data-on={momentColor?.toUpperCase() === c || undefined}
                                title={c}
                                style={{ background: c }}
                                onClick={() => setMomentColor(c)}
                            />
                        ))}
                        <label className={`${styles.momentSwatch} ${styles.momentCustom}`} title={t('build_editor.el_moment_color_custom')} data-on={(momentColor && !momentPalette.includes(momentColor.toUpperCase())) || undefined} style={momentColor && !momentPalette.includes(momentColor.toUpperCase()) ? { background: momentColor } : undefined}>
                            <Plus size={13} />
                            <input type="color" value={momentColor ?? '#000000'} onChange={(e) => setMomentColor(e.target.value.toUpperCase())} />
                        </label>
                        {momentStrokable && <div className={styles.momentStroke}>
                            <LiveSlider
                                label={t('build_editor.eb_stroke_width')}
                                value={momentStroke ?? 1.6}
                                min={0.5}
                                max={4}
                                step={0.1}
                                format={(v) => `${Number(v).toFixed(1)} px`}
                                onChange={(v) => setMomentStroke(v)}
                            />
                        </div>}
                    </div>
                )}
                <div className={`${styles.chips} scroll-invitation`}>
                    <button type="button" className={styles.chip} data-on={view === 'all' || undefined} onClick={() => { setView('all'); scrollTop() }}>{t('build_editor.el_all')}</button>
                    {categories.filter((c) => c.assets.length).map((c) => (
                        <button key={c.id} type="button" className={styles.chip} data-on={view === c.id || undefined} onClick={() => { setView(c.id); setQuery(''); scrollTop() }}>
                            {nameOf(c)}
                            {esNueva(c) && <span className={styles.chipDot} />}
                        </button>
                    ))}
                </div>
            </div>
            <span className={base.hint} style={{ marginTop: 0 }}>{t('build_editor.el_hint')}</span>

            {body}
        </>
    )
}

export const StickersPanel = ({ invitation, invitationID }) => {
    const { t } = useTranslation()
    const inputRef = useRef(null)
    const [uploading, setUploading] = useState(false)
    const [over, setOver] = useState(false)
    const [libraryTick, setLibraryTick] = useState(0)
    useEffect(() => {
        const bump = () => setLibraryTick((n) => n + 1)
        window.addEventListener('iattend-sticker-library', bump)
        return () => window.removeEventListener('iattend-sticker-library', bump)
    }, [])

    const library = useMemo(() => stickerLibrary(invitationID, invitation), [invitationID, invitation, libraryTick])
    const placed = countStickers(invitation)
    const full = placed >= MAX_STICKERS

    const upload = async (files) => {
        if (!files?.length) return
        setUploading(true)
        try {
            await uploadStickers(Array.from(files), invitationID)
        } catch (err) {
            console.error(err)
            message.error(t('build_editor.st_error'))
        } finally {
            setUploading(false)
        }
    }

    return (
        <>
            <button
                type="button"
                className={styles.dropzone}
                data-over={over || undefined}
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setOver(true) }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files) }}
            >
                {uploading ? <LoaderCircle size={20} className={styles.spin} /> : <Upload size={20} />}
                <span className={styles.dropTitle}>{uploading ? t('build_editor.st_uploading') : t('build_editor.st_upload')}</span>
                <span className={styles.dropHint}>{t('build_editor.st_upload_hint')}</span>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/webp,image/gif,image/svg+xml,image/jpeg"
                    multiple
                    hidden
                    onChange={(e) => { upload(e.target.files); e.target.value = '' }}
                />
            </button>

            <div className={base.group}>
                <div className={styles.groupHead}>
                    <span className={base.groupLabel}>{t('build_editor.st_yours')}</span>
                    <span className={styles.count} data-full={full || undefined}>{placed} / {MAX_STICKERS}</span>
                </div>
                {full && <span className={base.hint} style={{ marginTop: 0 }}>{t('build_editor.st_full')}</span>}
                {library.length ? (
                    <div className={styles.stickerGrid}>
                        {library.map((url) => (
                            <div
                                key={url}
                                className={styles.stickerCell}
                                data-disabled={full || undefined}
                                onPointerDown={(e) => startLayerDrag(e, stickerItem(url), { disabled: full })}
                            >
                                <img src={url} alt="" draggable={false} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <span className={base.empty}>{t('build_editor.st_empty')}</span>
                )}
            </div>
        </>
    )
}
