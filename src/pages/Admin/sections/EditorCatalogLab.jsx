import { useEffect, useMemo, useRef, useState } from 'react'
import { DatePicker, Input, Popover, Segmented, Select, Switch, message } from 'antd'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Eye, EyeOff, GripVertical, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import dayjs from 'dayjs'
import {
    createEditorCategory, deleteEditorCategory, deleteEditorAsset, fetchAppSettings, fetchEditorCatalog, updateAppSetting,
    reorderEditorAssets, reorderEditorCategories, updateEditorAsset, updateEditorCategory, uploadEditorAsset,
} from '../editorCatalogAdminApi'
import styles from './EditorCatalogLab.module.css'

// Admin → Laboratorio → Elementos: catálogo del panel lateral del editor
// (tablas editor_categories / editor_assets). A la izquierda las categorías
// del panel (Elementos o Fotos), arrastrables para ordenarlas; a la derecha
// la categoría elegida: sus datos (nombre, "Nuevo hasta", sección) y sus
// recursos (subir varios a la vez, ordenar arrastrando, ocultar, editar,
// borrar). Borrar algo que alguna invitación usa no se permite: el backend
// responde 409 y aquí se ofrece ocultarlo. Nada de esto cambia invitaciones.

const PANELES = [
    { label: 'Elementos', value: 'elements' },
    { label: 'Fotos', value: 'photos' },
    { label: 'Diseño', value: 'design' },
]

// Panel Diseño del editor: por ahora solo prender / apagar "Estilos
// completos" (app_settings.editor_design_styles). Aquí se subirán los diseños.
const DesignSettings = () => {
    const [enabled, setEnabled] = useState(null)
    useEffect(() => {
        fetchAppSettings()
            .then(({ data }) => setEnabled(Boolean(data.settings?.find((x) => x.key === 'editor_design_styles')?.value?.enabled)))
            .catch((e) => { message.error(errorDe(e, 'No se pudieron leer los ajustes')); setEnabled(false) })
    }, [])
    const toggle = async (v) => {
        setEnabled(v)
        try {
            await updateAppSetting('editor_design_styles', { enabled: v })
            message.success(v ? 'Estilos completos visibles en el editor' : 'Estilos completos ocultos en el editor')
        } catch (e) {
            setEnabled(!v)
            message.error(errorDe(e, 'No se pudo guardar'))
        }
    }
    return (
        <section className={styles.detail}>
            <div className={styles.settingRow}>
                <div className={styles.settingText}>
                    <strong>Estilos completos</strong>
                    <span>Bloque del panel Diseño del editor: aplica paleta y tipografías de un golpe. Próximamente los diseños se subirán desde aquí.</span>
                </div>
                <Switch checked={Boolean(enabled)} loading={enabled === null} onChange={toggle} />
            </div>
        </section>
    )
}
const KIND_LABEL = { icon: 'Íconos SVG', shape: 'Formas', image: 'Imágenes' }
const SECCIONES = [
    { value: 'cover', label: 'Portada' }, { value: 'greeting', label: 'Bienvenida' },
    { value: 'quote', label: 'Cita' }, { value: 'family', label: 'Personas' },
    { value: 'itinerary', label: 'Itinerario' }, { value: 'dresscode', label: 'Dresscode' },
    { value: 'gifts', label: 'Regalos' }, { value: 'destinations', label: 'Destinos' },
    { value: 'notices', label: 'Avisos' }, { value: 'gallery', label: 'Galería' },
]
const ACEPTA = { icon: '.svg,image/svg+xml', image: 'image/png,image/jpeg,image/webp' }

// Contorno de cada forma (las formas viven en código; ver MomentGlyph en events).
const SHAPE_SVG = {
    square: <rect x="14" y="14" width="72" height="72" />,
    rect: <rect x="8" y="30" width="84" height="40" />,
    circle: <circle cx="50" cy="50" r="38" />,
    triangle: <polygon points="50,12 88,86 12,86" />,
    star: <polygon points="50,10 60,38 90,38 66,56 75,86 50,68 25,86 34,56 10,38 40,38" />,
}

const errorDe = (e, fallback) => e?.response?.data?.msg || fallback
const esNueva = (cat) => cat.new_until && dayjs(cat.new_until).isAfter(dayjs())

// Proporción alto / ancho de la imagen (para su tamaño al soltarla).
const aspectoDe = (file) => new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { resolve(img.naturalWidth ? +(img.naturalHeight / img.naturalWidth).toFixed(3) : 1); URL.revokeObjectURL(url) }
    img.onerror = () => { resolve(1); URL.revokeObjectURL(url) }
    img.src = url
})

const sensoresDnd = () => ({ activationConstraint: { distance: 5 } })

// ── Fila de categoría (arrastrable) ──
const CategoryRow = ({ cat, count, selected, child, onSelect }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id })
    return (
        <div
            ref={setNodeRef}
            className={styles.catRow}
            data-selected={selected || undefined}
            data-hidden={!cat.is_active || undefined}
            data-child={child || undefined}
            data-dragging={isDragging || undefined}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            onClick={onSelect}
            {...attributes}
            {...listeners}
        >
            <GripVertical size={13} className={styles.grip} />
            <span className={styles.catName}>{cat.name_es}</span>
            {esNueva(cat) && <span className={styles.badgeNew}>Nuevo</span>}
            {!cat.is_active && <EyeOff size={13} className={styles.muted} />}
            <span className={styles.catCount}>{count}</span>
        </div>
    )
}

// ── Tarjeta de recurso (arrastrable) ──
const AssetCard = ({ asset, kind, onToggle, onEdit, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: asset.id })
    return (
        <div
            ref={setNodeRef}
            className={styles.assetCard}
            data-hidden={!asset.is_active || undefined}
            data-dragging={isDragging || undefined}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            {...attributes}
            {...listeners}
        >
            <div className={styles.assetPreview} data-kind={kind}>
                {asset.url
                    ? asset.tintable
                        ? <span className={styles.tinted} style={{ WebkitMaskImage: `url("${asset.url}")`, maskImage: `url("${asset.url}")` }} />
                        : <img src={asset.url} alt="" draggable={false} />
                    : SHAPE_SVG[asset.variant]
                        ? <svg className={styles.shapeSvg} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round">{SHAPE_SVG[asset.variant]}</svg>
                        : <span className={styles.shapeName}>{asset.variant}</span>}
            </div>
            <div className={styles.assetFoot}>
                <span className={styles.assetName} title={asset.name}>{asset.name}</span>
                <span className={styles.assetActions} onPointerDown={(e) => e.stopPropagation()}>
                    <button type="button" title={asset.is_active ? 'Ocultar' : 'Mostrar'} onClick={onToggle}>
                        {asset.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button type="button" title="Editar" onClick={onEdit}><Pencil size={13} /></button>
                    {asset.url && <button type="button" title="Eliminar" onClick={onDelete}><Trash2 size={13} /></button>}
                </span>
            </div>
            {asset.tags?.length > 0 && <div className={styles.assetTags}>{asset.tags.join(', ')}</div>}
        </div>
    )
}

// ── Formulario de categoría nueva (popover) ──
const NewCategory = ({ panel, parents, onCreate }) => {
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState({})
    const set = (patch) => setForm((f) => ({ ...f, ...patch }))
    const submit = async () => {
        if (!form.name_es?.trim()) return message.warning('Ponle un nombre')
        const ok = await onCreate({ panel, kind: form.kind ?? 'image', ...form })
        if (ok) { setOpen(false); setForm({}) }
    }
    return (
        <Popover
            open={open}
            onOpenChange={setOpen}
            trigger="click"
            placement="bottomLeft"
            content={(
                <div className={styles.form}>
                    <Input placeholder="Nombre (español)" value={form.name_es} onChange={(e) => set({ name_es: e.target.value })} />
                    <Input placeholder="Nombre (inglés)" value={form.name_en} onChange={(e) => set({ name_en: e.target.value })} />
                    {panel === 'elements' ? (
                        <Segmented
                            block
                            value={form.kind ?? 'image'}
                            onChange={(kind) => set({ kind })}
                            options={[{ label: 'Imágenes (PNG)', value: 'image' }, { label: 'Íconos (SVG)', value: 'icon' }]}
                        />
                    ) : (
                        <>
                            <Select allowClear placeholder="Dentro de… (subgrupo)" value={form.parent_id} onChange={(parent_id) => set({ parent_id })} options={parents.map((p) => ({ value: p.id, label: p.name_es }))} />
                            <Select allowClear placeholder="Sección de la invitación" value={form.section_key} onChange={(section_key) => set({ section_key })} options={SECCIONES} />
                        </>
                    )}
                    <DatePicker placeholder='"Nuevo" hasta…' value={form.new_until ? dayjs(form.new_until) : null} onChange={(d) => set({ new_until: d ? d.endOf('day').toISOString() : null })} />
                    <button type="button" className={styles.primary} onClick={submit}>Crear categoría</button>
                </div>
            )}
        >
            <button type="button" className={styles.addCat}><Plus size={14} /> Categoría</button>
        </Popover>
    )
}

// ── Editar un recurso (popover) ──
const EditAsset = ({ asset, onSave, children, open, onOpenChange }) => {
    const [form, setForm] = useState({})
    useEffect(() => {
        if (open) setForm({ name: asset.name, tags: (asset.tags ?? []).join(', '), default_w: asset.default_w, tintable: asset.tintable })
    }, [open])
    return (
        <Popover
            open={open}
            onOpenChange={onOpenChange}
            trigger={[]}
            placement="bottom"
            content={(
                <div className={styles.form}>
                    <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    <Input placeholder="Tags: flores, copa, iglesia…" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
                    <label className={styles.inline}>
                        Ancho al soltar (%)
                        <Input type="number" min={4} max={100} style={{ width: 80 }} value={form.default_w} onChange={(e) => setForm((f) => ({ ...f, default_w: Number(e.target.value) }))} />
                    </label>
                    {asset.url?.endsWith('.svg') && (
                        <label className={styles.inline}>
                            Se pinta del color elegido
                            <Switch size="small" checked={form.tintable} onChange={(tintable) => setForm((f) => ({ ...f, tintable }))} />
                        </label>
                    )}
                    <button type="button" className={styles.primary} onClick={() => onSave(form)}>Guardar</button>
                </div>
            )}
        >
            {children}
        </Popover>
    )
}

export const EditorCatalogLab = () => {
    const [panel, setPanel] = useState('elements')
    const [categories, setCategories] = useState([])
    const [assets, setAssets] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedId, setSelectedId] = useState(null)
    const [editing, setEditing] = useState(null)
    const [uploading, setUploading] = useState(0)
    const fileRef = useRef(null)
    const sensors = useSensors(useSensor(PointerSensor, sensoresDnd()))

    const cargar = async () => {
        try {
            const { data } = await fetchEditorCatalog()
            setCategories(data.categories ?? [])
            setAssets(data.assets ?? [])
        } catch (e) {
            message.error(errorDe(e, 'No se pudo cargar el catálogo'))
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => { cargar() }, [])

    // Categorías del panel: raíces en orden y, debajo de cada una, sus hijas.
    const delPanel = useMemo(() => categories.filter((c) => c.panel === panel), [categories, panel])
    const raices = useMemo(() => delPanel.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order), [delPanel])
    const hijas = (id) => delPanel.filter((c) => c.parent_id === id).sort((a, b) => a.sort_order - b.sort_order)
    const conteo = useMemo(() => assets.reduce((m, a) => m.set(a.category_id, (m.get(a.category_id) ?? 0) + 1), new Map()), [assets])

    useEffect(() => {
        if (!delPanel.some((c) => c.id === selectedId)) setSelectedId(raices[0]?.id ?? null)
    }, [panel, delPanel])

    const cat = categories.find((c) => c.id === selectedId) ?? null
    const delCat = useMemo(() => assets.filter((a) => a.category_id === selectedId).sort((a, b) => a.sort_order - b.sort_order), [assets, selectedId])

    // ── Categorías ──
    const patchCat = async (id, patch) => {
        setCategories((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))
        try {
            await updateEditorCategory(id, patch)
        } catch (e) {
            message.error(errorDe(e, 'No se pudo guardar'))
            cargar()
        }
    }
    const crearCat = async (payload) => {
        try {
            const { data } = await createEditorCategory(payload)
            setCategories((list) => [...list, data.category])
            setSelectedId(data.category.id)
            return true
        } catch (e) {
            message.error(errorDe(e, 'No se pudo crear la categoría'))
            return false
        }
    }
    const borrarCat = async () => {
        try {
            await deleteEditorCategory(cat.id)
            setCategories((list) => list.filter((c) => c.id !== cat.id))
        } catch (e) {
            message.warning(errorDe(e, 'No se pudo borrar'))
        }
    }
    // Ordenar dentro del mismo nivel (raíces, o hijas de una misma raíz).
    const ordenarCats = (grupo) => async ({ active, over }) => {
        if (!over || active.id === over.id) return
        const ids = grupo.map((c) => c.id)
        const next = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id))
        setCategories((list) => list.map((c) => (next.includes(c.id) ? { ...c, sort_order: next.indexOf(c.id) + 1 } : c)))
        try { await reorderEditorCategories(next) } catch (e) { message.error(errorDe(e, 'No se pudo ordenar')); cargar() }
    }

    // ── Recursos ──
    const patchAsset = async (id, patch) => {
        try {
            const { data } = await updateEditorAsset(id, patch)
            setAssets((list) => list.map((a) => (a.id === id ? data.asset : a)))
            return true
        } catch (e) {
            message.error(errorDe(e, 'No se pudo guardar'))
            return false
        }
    }
    const subir = async (files) => {
        const lista = [...files]
        if (!lista.length || !cat) return
        setUploading(lista.length)
        for (const file of lista) {
            try {
                const aspect = await aspectoDe(file)
                const { data } = await uploadEditorAsset({ file, categoryId: cat.id, aspect })
                setAssets((list) => [...list, data.asset])
            } catch (e) {
                message.error(`${file.name}: ${errorDe(e, 'no se pudo subir')}`)
            } finally {
                setUploading((n) => n - 1)
            }
        }
    }
    const borrarAsset = async (asset) => {
        try {
            await deleteEditorAsset(asset.id)
            setAssets((list) => list.filter((a) => a.id !== asset.id))
            message.success('Eliminado')
        } catch (e) {
            // En uso: no se borra; se ofrece ocultarlo.
            if (e?.response?.status === 409 && asset.is_active) {
                message.warning(`${errorDe(e, 'Está en uso')}. Lo oculté del panel.`)
                patchAsset(asset.id, { is_active: false })
            } else {
                message.warning(errorDe(e, 'No se pudo eliminar'))
            }
        }
    }
    const ordenarAssets = async ({ active, over }) => {
        if (!over || active.id === over.id) return
        const ids = delCat.map((a) => a.id)
        const next = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id))
        setAssets((list) => list.map((a) => (next.includes(a.id) ? { ...a, sort_order: next.indexOf(a.id) + 1 } : a)))
        try { await reorderEditorAssets(next) } catch (e) { message.error(errorDe(e, 'No se pudo ordenar')); cargar() }
    }

    if (loading) return <div className={styles.empty}>Cargando catálogo…</div>

    if (panel === 'design') {
        return (
            <div className={styles.lab}>
                <aside className={styles.cats}>
                    <Segmented value={panel} onChange={setPanel} options={PANELES} />
                </aside>
                <DesignSettings />
            </div>
        )
    }

    const vacia = cat && !delCat.length && !hijas(cat.id).length

    return (
        <div className={styles.lab}>
            {/* ── Categorías ── */}
            <aside className={styles.cats}>
                <Segmented value={panel} onChange={setPanel} options={PANELES} />
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={ordenarCats(raices)}>
                    <SortableContext items={raices.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                        <div className={styles.catList}>
                            {raices.map((c) => (
                                <div key={c.id}>
                                    <CategoryRow cat={c} count={conteo.get(c.id) ?? 0} selected={c.id === selectedId} onSelect={() => setSelectedId(c.id)} />
                                    {hijas(c.id).length > 0 && (
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={ordenarCats(hijas(c.id))}>
                                            <SortableContext items={hijas(c.id).map((h) => h.id)} strategy={verticalListSortingStrategy}>
                                                {hijas(c.id).map((h) => (
                                                    <CategoryRow key={h.id} child cat={h} count={conteo.get(h.id) ?? 0} selected={h.id === selectedId} onSelect={() => setSelectedId(h.id)} />
                                                ))}
                                            </SortableContext>
                                        </DndContext>
                                    )}
                                </div>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
                <NewCategory panel={panel} parents={raices} onCreate={crearCat} />
            </aside>

            {/* ── Categoría elegida ── */}
            {cat ? (
                <section className={styles.detail}>
                    <div className={styles.detailHead}>
                        <Input className={styles.nameInput} value={cat.name_es} onChange={(e) => setCategories((l) => l.map((c) => (c.id === cat.id ? { ...c, name_es: e.target.value } : c)))} onBlur={(e) => patchCat(cat.id, { name_es: e.target.value })} />
                        <Input className={styles.nameInputEn} placeholder="English" value={cat.name_en ?? ''} onChange={(e) => setCategories((l) => l.map((c) => (c.id === cat.id ? { ...c, name_en: e.target.value } : c)))} onBlur={(e) => patchCat(cat.id, { name_en: e.target.value || null })} />
                        <span className={styles.kindChip}>{KIND_LABEL[cat.kind]}</span>
                        <span className={styles.spacer} />
                        <label className={styles.inline}>
                            Visible
                            <Switch size="small" checked={cat.is_active} onChange={(is_active) => patchCat(cat.id, { is_active })} />
                        </label>
                        {vacia && <button type="button" className={styles.danger} onClick={borrarCat}><Trash2 size={14} /> Borrar</button>}
                    </div>

                    <div className={styles.detailMeta}>
                        <label className={styles.inline}>
                            «Nuevo» hasta
                            <DatePicker size="small" value={cat.new_until ? dayjs(cat.new_until) : null} onChange={(d) => patchCat(cat.id, { new_until: d ? d.endOf('day').toISOString() : null })} />
                        </label>
                        {cat.panel === 'photos' && (
                            <label className={styles.inline}>
                                Sección
                                <Select size="small" allowClear style={{ width: 150 }} value={cat.section_key} onChange={(v) => patchCat(cat.id, { section_key: v ?? null })} options={SECCIONES} />
                            </label>
                        )}
                    </div>

                    {cat.kind === 'shape' ? (
                        <p className={styles.note}>Las formas viven en el código (se pueden rellenar, bordear y estirar). Aquí solo se ordenan u ocultan.</p>
                    ) : (
                        <div
                            className={styles.drop}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); subir(e.dataTransfer.files) }}
                            onClick={() => fileRef.current?.click()}
                        >
                            <Upload size={16} />
                            {uploading > 0 ? `Subiendo ${uploading}…` : `Arrastra aquí o elige ${cat.kind === 'icon' ? 'SVG' : 'PNG / JPG'} (varios a la vez)`}
                            <input ref={fileRef} type="file" multiple accept={ACEPTA[cat.kind]} hidden onChange={(e) => { subir(e.target.files); e.target.value = '' }} />
                        </div>
                    )}

                    {delCat.length ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={ordenarAssets}>
                            <SortableContext items={delCat.map((a) => a.id)} strategy={rectSortingStrategy}>
                                <div className={styles.assetGrid} data-kind={cat.kind}>
                                    {delCat.map((a) => (
                                        <EditAsset
                                            key={a.id}
                                            asset={a}
                                            open={editing === a.id}
                                            onOpenChange={(v) => setEditing(v ? a.id : null)}
                                            onSave={async (form) => { if (await patchAsset(a.id, form)) setEditing(null) }}
                                        >
                                            <div>
                                                <AssetCard
                                                    asset={a}
                                                    kind={cat.kind}
                                                    onToggle={() => patchAsset(a.id, { is_active: !a.is_active })}
                                                    onEdit={() => setEditing(a.id)}
                                                    onDelete={() => borrarAsset(a)}
                                                />
                                            </div>
                                        </EditAsset>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    ) : (
                        <div className={styles.empty}>{hijas(cat.id).length ? 'Esta categoría agrupa subgrupos: elige uno a la izquierda.' : 'Todavía no hay recursos.'}</div>
                    )}
                </section>
            ) : (
                <section className={styles.detail}><div className={styles.empty}>Crea una categoría para empezar.</div></section>
            )}
        </div>
    )
}
