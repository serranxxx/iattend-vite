import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message } from 'antd'
import { DndContext, closestCenter, MouseSensor, pointerWithin, TouchSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CloudUpload, Ellipsis, GripVertical, LoaderCircle, Plus, Trash2, X } from 'lucide-react'
import { subirLogoPatrocinador } from '../../../helpers/services/uploadImage'
import { ACOMODOS, enOrden, normalizarPatrocinadores, nuevoIdCategoria, porCategoria, TAMANOS_CAT } from '../patrocinadores'
import styles from './PatrocinadoresPanel.module.css'

/*
  Herramienta "Patrocinadores" del panel lateral de un Pop (handoff
  "Patrocinadores en un Pop" v2, opción 2a "Categorías como secciones"):
  · Sube los logos (clic, arrastrar varios o ⌘V): caen en la categoría por
    omisión (`defaultCat`).
  · Categorías (con Tarjeta o Banda): "Nueva categoría" la crea arriba con el
    nombre por escribir; cada una tiene su nombre, su menú ⋯ (tamaño, color,
    borrar) y sus marcas. Las marcas se arrastran dentro de su categoría o a
    otra; las categorías, por su agarradera.
  · Con Portada: una sola lista "Tus marcas" (las categorías se guardan).
  · Cómo se ven: los tres acomodos.
  Escribe en body.sponsors con `actualizar(fn, opts)` (fn recibe el
  body.sponsors previo, con el body más reciente), siempre ya normalizado
  (patrocinadores.js). La usan el editor de escritorio (SideWorkspace) y el
  del celular (EditorMovil, drawer). `abierto`: el panel se ve (⌘V solo entonces).
*/

const ACEPTA = 'image/png,image/svg+xml,image/webp,image/jpeg'
const esImagen = (f) => /^image\/(png|svg\+xml|webp|jpeg)$/.test(f.type) || /\.svg$/i.test(f.name)
const nuevoId = () => `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
const CAT = 'cat:'
const ZONA = 'zona:'

// Fila de una marca: agarradera, miniatura (con el color de su categoría),
// nombre y quitar. Toda la fila se arrastra.
const FilaMarca = ({ it, adaptar, retraso, onQuitar }) => {
    const { t } = useTranslation()
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: it.id })
    return (
        <li
            ref={setNodeRef}
            className={styles.fila}
            data-dragging={isDragging || undefined}
            style={{ transform: CSS.Translate.toString(transform), transition, animationDelay: `${retraso}ms` }}
            {...attributes}
            {...listeners}
            title={t('side_events.sponsors_drag')}
        >
            <span className={styles.agarre} aria-hidden><GripVertical size={15} /></span>
            <span className={styles.miniatura}><img src={it.url} alt="" draggable={false} data-adaptar={adaptar || undefined} /></span>
            <span className={styles.nombre}>{it.name || t('side_events.sponsors_logo')}</span>
            <button
                type="button"
                className={styles.quitar}
                title={t('side_events.sponsors_remove')}
                aria-label={t('side_events.sponsors_remove')}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onQuitar}
            >
                <X size={15} />
            </button>
        </li>
    )
}

// Segmentado del menú ⋯ (tamaño, color).
const Segmentado = ({ opciones, valor, onCambiar, label }) => (
    <div className={styles.segmentado} role="radiogroup" aria-label={label} data-tema-propio>
        {opciones.map((o) => (
            <button key={String(o.v)} type="button" role="radio" aria-checked={valor === o.v} className={styles.segmento} data-on={valor === o.v || undefined} title={o.title} onClick={() => onCambiar(o.v)}>
                {o.label}
            </button>
        ))}
    </div>
)

// Una categoría: encabezado (agarradera, nombre, conteo, ⋯) y sus marcas.
const Categoria = ({ cat, items, indice, encima, borrable, enfocar, menuAbierto, onMenu, onCambiar, onQuitar, onBorrar }) => {
    const { t } = useTranslation()
    const { attributes, listeners, setNodeRef: setSortRef, transform, transition, isDragging } = useSortable({ id: `${CAT}${cat.id}` })
    const { setNodeRef: setDropRef } = useDroppable({ id: `${ZONA}${cat.id}` })
    const cabezaRef = useRef(null)
    // El menú se cierra al tocar fuera.
    useEffect(() => {
        if (!menuAbierto) return undefined
        const fuera = (e) => { if (!cabezaRef.current?.contains(e.target)) onMenu(false) }
        document.addEventListener('pointerdown', fuera, true)
        return () => document.removeEventListener('pointerdown', fuera, true)
    }, [menuAbierto])
    return (
        <section
            ref={(el) => { setSortRef(el); setDropRef(el) }}
            className={styles.categoria}
            data-encima={encima || undefined}
            data-dragging={isDragging || undefined}
            data-menu={menuAbierto || undefined}
            style={{ transform: CSS.Translate.toString(transform), transition, animationDelay: `${indice * 50}ms` }}
        >
            <div className={styles.catCabeza} ref={cabezaRef}>
                <span className={styles.catAgarre} title={t('side_events.sponsors_cat_drag')} {...attributes} {...listeners}>
                    <GripVertical size={15} />
                </span>
                <input
                    className={styles.catNombre}
                    value={cat.name}
                    placeholder={t('side_events.sponsors_cat_placeholder')}
                    maxLength={40}
                    autoFocus={enfocar}
                    onChange={(e) => onCambiar({ name: e.target.value }, { coalesce: `patrocinadores-cat-${cat.id}` })}
                    onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur() }}
                />
                <span className={styles.catCuenta}>{items.length}</span>
                <button type="button" className={styles.catMas} data-on={menuAbierto || undefined} title={t('side_events.sponsors_cat_options')} aria-label={t('side_events.sponsors_cat_options')} aria-expanded={menuAbierto} onClick={() => onMenu(!menuAbierto)}>
                    <Ellipsis size={17} />
                </button>
                {menuAbierto && (
                    <div className={styles.menu} role="dialog" aria-label={t('side_events.sponsors_cat_options')}>
                        <div className={styles.menuGrupo}>
                            <span className={styles.menuTitulo}>{t('side_events.sponsors_size')}</span>
                            <Segmentado
                                label={t('side_events.sponsors_size')}
                                valor={cat.size}
                                onCambiar={(size) => onCambiar({ size })}
                                opciones={TAMANOS_CAT.map((v) => ({ v, label: t(`side_events.sponsors_size_${v}`) }))}
                            />
                        </div>
                        <div className={styles.menuGrupo}>
                            <span className={styles.menuTitulo}>{t('side_events.sponsors_color')}</span>
                            <Segmentado
                                label={t('side_events.sponsors_color')}
                                valor={cat.color}
                                onCambiar={(color) => onCambiar({ color })}
                                opciones={[
                                    { v: false, label: t('side_events.sponsors_color_adapt'), title: t('side_events.sponsors_color_adapt_title') },
                                    { v: true, label: t('side_events.sponsors_color_color'), title: t('side_events.sponsors_color_color_title') },
                                ]}
                            />
                        </div>
                        {borrable && (
                            <button type="button" className={styles.borrar} onClick={() => { onMenu(false); onBorrar() }}>
                                <Trash2 size={15} /> {t('side_events.sponsors_cat_delete')}
                            </button>
                        )}
                    </div>
                )}
            </div>
            <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                <ul className={styles.lista}>
                    {items.map((it, i) => (
                        <FilaMarca key={it.id} it={it} adaptar={!cat.color} retraso={indice * 50 + 60 + i * 30} onQuitar={() => onQuitar(it.id)} />
                    ))}
                </ul>
            </SortableContext>
            {!items.length && <span className={styles.vacio}>{t('side_events.sponsors_cat_empty')}</span>}
        </section>
    )
}

// Miniatura de cada acomodo (34 × 56, el esquema en blanco).
const MiniAcomodo = ({ acomodo }) => (
    <span className={styles.mini} data-acomodo={acomodo} aria-hidden>
        <span /><span /><span />
    </span>
)

export const PatrocinadoresPanel = ({ body, actualizar, carpeta, abierto = true }) => {
    const { t } = useTranslation()
    const s = normalizarPatrocinadores(body?.sponsors)
    const [subiendo, setSubiendo] = useState(0)
    const [encimaSubir, setEncimaSubir] = useState(false)
    const [menu, setMenu] = useState(null)
    const [enfocar, setEnfocar] = useState(null)
    const [arrastre, setArrastre] = useState(null)   // id que se arrastra
    const [encima, setEncima] = useState(null)       // categoría destino de una marca
    const inputRef = useRef(null)
    // Toque: pulsación larga para arrastrar (sin ella el dedo hace scroll).
    const sensores = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    )

    // Todo cambio parte de lo guardado ya normalizado (así quedan escritas la
    // categoría inicial y lo que venía de la v1).
    const cambiar = (fn, opts) => actualizar((prev) => fn(normalizarPatrocinadores(prev)), opts)
    const quitarMarca = (id) => cambiar((p) => ({ ...p, items: p.items.filter((x) => x.id !== id) }))

    /* ── Subir ── */
    const subir = async (archivos) => {
        const lista = [...archivos].filter(esImagen)
        if (!lista.length) { if (archivos.length) message.warning(t('side_events.sponsors_only_images')); return }
        if (!carpeta) return
        setSubiendo((x) => x + lista.length)
        const nuevos = []
        for (const f of lista) {
            try {
                const r = await subirLogoPatrocinador(f, carpeta)
                if (r) nuevos.push({ id: nuevoId(), url: r.url, w: r.w, h: r.h, name: f.name.replace(/\.[^.]+$/, '').slice(0, 60) })
            } catch (err) {
                console.error(err)
                message.error(t('side_events.sponsors_upload_error'))
            } finally {
                setSubiendo((x) => x - 1)
            }
        }
        if (!nuevos.length) return
        // Caen en la categoría por omisión; los primeros prenden la capa.
        cambiar((p) => ({ ...p, ...(p.items.length ? {} : { enabled: true }), items: [...p.items, ...nuevos.map((it) => ({ ...it, cat: p.defaultCat }))] }))
    }
    const subirRef = useRef(subir)
    useEffect(() => { subirRef.current = subir })

    // ⌘V con imágenes mientras el panel está abierto: van como logos (y no
    // como elementos de la pieza: se detiene el evento).
    useEffect(() => {
        if (!abierto) return undefined
        const onPaste = (e) => {
            if (e.target?.closest?.('input, textarea, [contenteditable="true"]')) return
            const archivos = [...(e.clipboardData?.files ?? [])].filter(esImagen)
            if (!archivos.length) return
            e.preventDefault()
            e.stopImmediatePropagation()
            subirRef.current(archivos)
        }
        window.addEventListener('paste', onPaste, true)
        return () => window.removeEventListener('paste', onPaste, true)
    }, [abierto])

    /* ── Categorías ── */
    const nuevaCategoria = () => {
        const id = nuevoIdCategoria()
        setEnfocar(id)
        cambiar((p) => ({ ...p, cats: [{ id, name: '', size: 'l', color: false }, ...p.cats] }))
    }
    const cambiarCategoria = (catId) => (patch, opts) => cambiar((p) => ({ ...p, cats: p.cats.map((c) => (c.id === catId ? { ...c, ...patch } : c)) }), opts)
    // Borrar: sus marcas pasan a la última que quede (y, si era la de
    // omisión, esa última toma su lugar). Con una sola no se puede.
    const borrarCategoria = (catId) => cambiar((p) => {
        if (p.cats.length < 2) return p
        const cats = p.cats.filter((c) => c.id !== catId)
        const ultima = cats[cats.length - 1].id
        return {
            ...p,
            cats,
            defaultCat: p.defaultCat === catId ? ultima : p.defaultCat,
            items: p.items.map((x) => (x.cat === catId ? { ...x, cat: ultima } : x)),
        }
    })

    /* ── Arrastrar ── */
    const catDeId = (id) => {
        const k = String(id ?? '')
        if (k.startsWith(ZONA)) return k.slice(ZONA.length)
        if (k.startsWith(CAT)) return k.slice(CAT.length)
        return s.items.find((x) => x.id === k)?.cat ?? null
    }
    // Una categoría solo choca con categorías; una marca, primero con marcas
    // bajo el puntero y si no, con la categoría que tiene debajo.
    const colision = (args) => {
        if (String(args.active.id).startsWith(CAT)) {
            return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => String(c.id).startsWith(CAT)) })
        }
        const sinCats = args.droppableContainers.filter((c) => !String(c.id).startsWith(CAT))
        const bajo = pointerWithin({ ...args, droppableContainers: sinCats })
        const marcas = bajo.filter((c) => !String(c.id).startsWith(ZONA))
        if (marcas.length) return marcas
        return bajo.length ? bajo : closestCenter({ ...args, droppableContainers: sinCats })
    }
    const soltar = ({ active, over }) => {
        setArrastre(null)
        setEncima(null)
        if (!over || active.id === over.id) return
        const a = String(active.id)
        const o = String(over.id)
        // Orden de las categorías.
        if (a.startsWith(CAT)) {
            const de = s.cats.findIndex((c) => `${CAT}${c.id}` === a)
            const hacia = s.cats.findIndex((c) => `${CAT}${c.id}` === o)
            if (de < 0 || hacia < 0) return
            cambiar((p) => ({ ...p, cats: arrayMove(p.cats, de, hacia) }))
            return
        }
        // Una marca: a la categoría de abajo, en el lugar de la marca sobre la
        // que cayó (o al final de la categoría).
        const destino = catDeId(o)
        const activo = s.items.find((x) => x.id === a)
        if (!activo || !destino) return
        cambiar((p) => {
            if (activo.cat === destino && p.items.some((x) => x.id === o)) {
                const de = p.items.findIndex((x) => x.id === a)
                const hacia = p.items.findIndex((x) => x.id === o)
                return { ...p, items: arrayMove(p.items, de, hacia) }
            }
            const sin = p.items.filter((x) => x.id !== a)
            const movido = { ...activo, cat: destino }
            const sobre = sin.findIndex((x) => x.id === o)
            if (sobre >= 0) sin.splice(sobre, 0, movido)
            else sin.splice(sin.map((x) => x.cat).lastIndexOf(destino) + 1, 0, movido)
            return { ...p, items: sin }
        })
    }

    // Con Portada, la lista completa: reordenar es reordenar dentro de su
    // categoría (la marca toma la categoría de sus vecinas).
    const soltarEnLista = ({ active, over }) => {
        if (!over || active.id === over.id) return
        const orden = enOrden(s)
        const de = orden.findIndex((x) => x.id === active.id)
        const hacia = orden.findIndex((x) => x.id === over.id)
        if (de < 0 || hacia < 0) return
        const nuevo = arrayMove(orden, de, hacia)
        const destino = orden[hacia].cat
        cambiar((p) => ({ ...p, items: nuevo.map((x) => (x.id === active.id ? { ...x, cat: destino } : x)) }))
    }

    const enPortada = s.layout === 'portada'
    const grupos = porCategoria(s, { todas: true })
    const hint = enPortada
        ? (s.cats.length > 1 ? t('side_events.sponsors_hint_portada_cats', { count: s.cats.length }) : t('side_events.sponsors_hint_portada'))
        : s.cats.length < 2 ? t('side_events.sponsors_hint_one') : t(`side_events.sponsors_hint_${s.layout}`)
    const adaptarDe = (it) => !s.cats.find((c) => c.id === it.cat)?.color
    const lista = enOrden(s)

    return (
        <div className={styles.panel}>
            {/* Subir */}
            <button
                type="button"
                className={styles.subir}
                data-over={encimaSubir || undefined}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setEncimaSubir(true) }}
                onDragLeave={() => setEncimaSubir(false)}
                onDrop={(e) => { e.preventDefault(); setEncimaSubir(false); subir(e.dataTransfer.files) }}
            >
                <span className={styles.subirIcono}>{subiendo ? <LoaderCircle size={22} className={styles.girando} /> : <CloudUpload size={22} />}</span>
                <span className={styles.subirTextos}>
                    <span className={styles.subirTitulo}>{subiendo ? t('side_events.sponsors_uploading', { count: subiendo }) : t('side_events.sponsors_upload')}</span>
                    <span className={styles.subirHint}>{t('side_events.sponsors_upload_hint')}</span>
                </span>
            </button>
            <input ref={inputRef} type="file" accept={ACEPTA} multiple hidden onChange={(e) => { subir(e.target.files ?? []); e.target.value = '' }} />

            {/* Categorías (Tarjeta y Banda) o "Tus marcas" (Portada) */}
            {enPortada ? (
                lista.length > 0 && (
                    <section className={styles.seccion}>
                        <span className={styles.etiqueta}>{t('side_events.sponsors_all')}</span>
                        <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={soltarEnLista}>
                            <SortableContext items={lista.map((x) => x.id)} strategy={verticalListSortingStrategy}>
                                <ul className={styles.lista}>
                                    {lista.map((it, i) => (
                                        <FilaMarca key={it.id} it={it} adaptar={adaptarDe(it)} retraso={i * 30} onQuitar={() => quitarMarca(it.id)} />
                                    ))}
                                </ul>
                            </SortableContext>
                        </DndContext>
                    </section>
                )
            ) : (
                <div className={styles.categorias}>
                    <button type="button" className={styles.nuevaCat} onClick={nuevaCategoria}>
                        <Plus size={16} /> {t('side_events.sponsors_new_cat')}
                    </button>
                    <DndContext
                        sensors={sensores}
                        collisionDetection={colision}
                        onDragStart={({ active }) => { setMenu(null); setArrastre(String(active.id)) }}
                        onDragOver={({ active, over }) => setEncima(String(active.id).startsWith(CAT) ? null : catDeId(over?.id))}
                        onDragEnd={soltar}
                        onDragCancel={() => { setArrastre(null); setEncima(null) }}
                    >
                        <SortableContext items={s.cats.map((c) => `${CAT}${c.id}`)} strategy={verticalListSortingStrategy}>
                            {grupos.map(({ cat, items }, i) => (
                                <Categoria
                                    key={cat.id}
                                    cat={cat}
                                    items={items}
                                    indice={i}
                                    encima={Boolean(arrastre) && encima === cat.id && catDeId(arrastre) !== cat.id}
                                    borrable={s.cats.length > 1}
                                    enfocar={enfocar === cat.id}
                                    menuAbierto={menu === cat.id}
                                    onMenu={(v) => setMenu(v ? cat.id : null)}
                                    onCambiar={cambiarCategoria(cat.id)}
                                    onQuitar={quitarMarca}
                                    onBorrar={() => borrarCategoria(cat.id)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>
            )}

            {/* Cómo se ven */}
            <section className={styles.seccion}>
                <span className={styles.etiqueta}>{t('side_events.sponsors_how')}</span>
                <div className={styles.acomodos}>
                    {ACOMODOS.map((a) => (
                        <button key={a} type="button" className={styles.acomodo} data-on={s.layout === a || undefined} aria-pressed={s.layout === a} onClick={() => cambiar((p) => ({ ...p, layout: a }))}>
                            <MiniAcomodo acomodo={a} />
                            <span className={styles.acomodoNombre}>{t(`side_events.sponsors_layout_${a}`)}</span>
                        </button>
                    ))}
                </div>
                <span className={styles.hint}>{hint}</span>
            </section>
        </div>
    )
}
