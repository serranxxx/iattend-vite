import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core'
import {
    SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, CirclePlus, Copy, GripHorizontal, Rows2, Trash2, X } from 'lucide-react'
import styles from './FormularioVista.module.css'
import { VistaPrevia } from './VistaPrevia'
import {
    MAX_OPCIONES, TIPO, TIPOS, esSeccion, preguntaNueva, seccionNueva, uid, usaOpciones,
} from './modelo'

/*
  Pestaña Preguntas de la vista completa (handoff 1b): cabecera (título y
  descripción, que llega al invitado como intro), tarjetas de pregunta y de
  sección que se reordenan arrastrando el asa (@dnd-kit), barra flotante
  para agregar (después de la tarjeta activa) y, a la derecha, la vista
  previa de la pregunta activa tal como la ve el invitado.
*/

const Interruptor = ({ on, onClick, label }) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={styles.switchChico} data-on={on || undefined} onClick={onClick}>
        <span />
    </button>
)

// Vista mínima de una pregunta sin elegir.
const Resumen = ({ it, t }) => {
    if (usaOpciones(it.type)) {
        const ops = (it.options ?? []).filter((o) => String(o).trim())
        return (
            <div className={styles.resOpciones}>
                {ops.slice(0, 4).map((o, i) => (
                    <span key={i}><i className={styles.glifo} data-multi={it.type === 'multi' || undefined} />{o}</span>
                ))}
                {ops.length > 4 && <span className={styles.resMas}>{t('side_events.frm_n_more', { count: ops.length - 4 })}</span>}
            </div>
        )
    }
    if (it.type === 'yesno') return <div className={styles.pills}><span>{t('side_events.frm_yes')}</span><span>{t('side_events.frm_no')}</span></div>
    if (it.type === 'check') return <span className={styles.pista}>{t('side_events.frm_hint_check')}</span>
    return <span className={styles.lineaPista} data-largo={it.type === 'long' || undefined}>{t(`side_events.frm_hint_${it.type}`)}</span>
}

const SelectorTipo = ({ type, onChange, t }) => {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)
    useEffect(() => {
        if (!open) return
        const fuera = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
        const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
        document.addEventListener('mousedown', fuera)
        document.addEventListener('keydown', esc)
        return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc) }
    }, [open])
    const Actual = TIPO[type]?.Icon
    return (
        <div className={styles.tipo} ref={ref}>
            <button type="button" className={styles.tipoBoton} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                {Actual && <Actual size={16} strokeWidth={1.9} />}
                <span>{t(`side_events.frm_type_${type}`)}</span>
                <ChevronDown size={16} className={styles.tipoChevron} />
            </button>
            {open && (
                <div className={styles.tipoMenu} role="listbox">
                    {TIPOS.map((tipo) => {
                        const Icono = tipo.Icon
                        return (
                            <div key={tipo.type}>
                                {tipo.separador && <span className={styles.tipoSep} />}
                                <button type="button" role="option" aria-selected={tipo.type === type} data-on={tipo.type === type || undefined} onClick={() => { onChange(tipo.type); setOpen(false) }}>
                                    <Icono size={16} strokeWidth={1.9} /> {t(`side_events.frm_type_${tipo.type}`)}
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

const Opciones = ({ it, cambiar, t }) => {
    const refs = useRef([])
    const [enfocar, setEnfocar] = useState(null)
    const ops = it.options ?? []
    useEffect(() => {
        if (enfocar === null) return
        refs.current[enfocar]?.focus()
        setEnfocar(null)
    }, [enfocar, ops.length])
    const agregar = (despuesDe = ops.length - 1) => {
        if (ops.length >= MAX_OPCIONES) return
        const nuevas = [...ops]
        nuevas.splice(despuesDe + 1, 0, t('side_events.frm_option_n', { n: ops.length + 1 }))
        cambiar({ options: nuevas })
        setEnfocar(despuesDe + 1)
    }
    return (
        <div className={styles.opciones}>
            {ops.map((o, i) => (
                <div key={i} className={styles.opcion}>
                    <i className={styles.glifo} data-multi={it.type === 'multi' || undefined} />
                    <input
                        ref={(el) => { refs.current[i] = el }}
                        className={styles.opcionInput}
                        value={o}
                        maxLength={80}
                        onChange={(e) => cambiar({ options: ops.map((x, j) => (j === i ? e.target.value : x)) })}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(i) } }}
                    />
                    {ops.length > 1 && (
                        <button type="button" className={styles.opcionQuitar} aria-label={t('side_events.frm_remove_option')} onClick={() => cambiar({ options: ops.filter((_, j) => j !== i) })}>
                            <X size={16} />
                        </button>
                    )}
                </div>
            ))}
            {ops.length < MAX_OPCIONES && (
                <button type="button" className={styles.opcionAgregar} onClick={() => agregar()}>
                    <i className={styles.glifo} data-multi={it.type === 'multi' || undefined} data-vacio />
                    {t('side_events.frm_add_option')}
                </button>
            )}
            {it.type === 'multi' && ops.length > 1 && (
                <label className={styles.limite}>
                    {t('side_events.frm_max_label')}
                    <select value={it.max ?? ''} onChange={(e) => cambiar({ max: e.target.value ? Number(e.target.value) : undefined })}>
                        <option value="">{t('side_events.frm_max_none')}</option>
                        {ops.slice(1).map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                    </select>
                </label>
            )}
        </div>
    )
}

const REGLA = { phone: 'frm_rule_phone', email: 'frm_rule_email', number: 'frm_rule_number', date: 'frm_rule_date', long: 'frm_rule_long' }

const Tarjeta = ({ it, n, activa, onActivar, cambiar, duplicar, quitar, t }) => {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: it.id })
    const style = { transform: CSS.Translate.toString(transform), transition }
    const asa = (
        <button type="button" ref={setActivatorNodeRef} className={styles.asa} aria-label={t('side_events.frm_drag')} {...attributes} {...listeners}>
            <GripHorizontal size={18} />
        </button>
    )

    if (esSeccion(it)) {
        return (
            <div ref={setNodeRef} style={style} className={styles.tarjeta} data-seccion data-activa={activa || undefined} data-arrastrando={isDragging || undefined} onMouseDown={onActivar}>
                {asa}
                <span className={styles.seccionN}>{t('side_events.frm_section_n', { n })}</span>
                {activa
                    ? <input className={styles.seccionInput} value={it.title} placeholder={t('side_events.frm_section_ph')} maxLength={60} autoFocus onChange={(e) => cambiar({ title: e.target.value })} />
                    : <span className={styles.seccionTitulo} data-vacio={!it.title || undefined}>{it.title || t('side_events.frm_section_ph')}</span>}
                {activa && (
                    <div className={styles.pie}>
                        <span className={styles.espacio} />
                        <button type="button" className={styles.textoPeligro} onClick={quitar}>{t('side_events.frm_remove_section')}</button>
                    </div>
                )}
            </div>
        )
    }

    const conAyuda = it.help !== undefined
    return (
        <div ref={setNodeRef} style={style} className={styles.tarjeta} data-activa={activa || undefined} data-arrastrando={isDragging || undefined} onMouseDown={onActivar}>
            {asa}
            {!activa ? (
                <>
                    <span className={styles.label} data-vacio={!it.label?.trim() || undefined}>
                        {it.label?.trim() || t('side_events.frm_untitled_q')}
                        {it.required && <span className={styles.req}> *</span>}
                    </span>
                    {it.help && <span className={styles.ayuda}>{it.help}</span>}
                    <Resumen it={it} t={t} />
                </>
            ) : (
                <>
                    <div className={styles.filaPregunta}>
                        <input
                            className={styles.preguntaInput}
                            value={it.label}
                            maxLength={200}
                            autoFocus
                            placeholder={t(it.type === 'check' ? 'side_events.frm_q_ph_check' : 'side_events.frm_q_ph')}
                            onChange={(e) => cambiar({ label: e.target.value })}
                        />
                        <SelectorTipo
                            type={it.type}
                            t={t}
                            onChange={(type) => cambiar({ type, ...(usaOpciones(type) && !(it.options ?? []).length ? { options: [t('side_events.frm_option_n', { n: 1 })] } : {}) })}
                        />
                    </div>
                    {conAyuda && (
                        <input className={styles.ayudaInput} value={it.help} maxLength={200} placeholder={t('side_events.frm_help_ph')} onChange={(e) => cambiar({ help: e.target.value })} />
                    )}
                    {usaOpciones(it.type) ? (
                        <Opciones it={it} cambiar={cambiar} t={t} />
                    ) : it.type === 'yesno' ? (
                        <div className={styles.pills}><span>{t('side_events.frm_yes')}</span><span>{t('side_events.frm_no')}</span></div>
                    ) : it.type === 'check' ? (
                        <span className={styles.pista}>{t('side_events.frm_check_note')}</span>
                    ) : (
                        <div className={styles.cuerpoTexto}>
                            <span className={styles.lineaPista} data-largo={it.type === 'long' || undefined}>{t(`side_events.frm_hint_${it.type}`)}</span>
                            {REGLA[it.type] && <span className={styles.regla}>{t(`side_events.${REGLA[it.type]}`)}</span>}
                        </div>
                    )}
                    <div className={styles.pie}>
                        <button type="button" className={styles.textoBoton} onClick={() => cambiar({ help: conAyuda ? undefined : '' })}>
                            {conAyuda ? t('side_events.frm_remove_help') : `+ ${t('side_events.frm_add_help')}`}
                        </button>
                        <span className={styles.espacio} />
                        <button type="button" className={styles.icono} onClick={duplicar} aria-label={t('side_events.frm_duplicate')} title={t('side_events.frm_duplicate')}><Copy size={18} /></button>
                        <button type="button" className={styles.icono} data-peligro onClick={quitar} aria-label={t('side_events.frm_remove')} title={t('side_events.frm_remove')}><Trash2 size={18} /></button>
                        <span className={styles.sep} />
                        <span className={styles.obligatoria}>{t('side_events.frm_required')}</span>
                        <Interruptor on={Boolean(it.required)} label={t('side_events.frm_required')} onClick={() => cambiar({ required: !it.required })} />
                    </div>
                </>
            )}
        </div>
    )
}

export const PreguntasTab = ({ formulario, editar, avisar, fondo, activaPedida }) => {
    const { t } = useTranslation()
    const items = useMemo(() => formulario.items ?? [], [formulario.items])
    const [activa, setActiva] = useState(() => activaPedida ?? items.find((it) => !esSeccion(it))?.id ?? null)
    const refs = useRef({})

    useEffect(() => {
        if (!activaPedida) return
        setActiva(activaPedida)
        refs.current[activaPedida]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, [activaPedida])

    const setItems = (nuevos) => editar({ items: nuevos })
    const cambiar = (id, patch) => setItems(items.map((it) => {
        if (it.id !== id) return it
        const nuevo = { ...it, ...patch }
        if ('help' in patch && patch.help === undefined) delete nuevo.help
        if ('max' in patch && patch.max === undefined) delete nuevo.max
        return nuevo
    }))

    // Agregar después de la tarjeta activa (o al final) y dejarla activa.
    const insertar = (nuevo) => {
        const i = items.findIndex((it) => it.id === activa)
        const lista = [...items]
        lista.splice(i < 0 ? lista.length : i + 1, 0, nuevo)
        setItems(lista)
        setActiva(nuevo.id)
        requestAnimationFrame(() => refs.current[nuevo.id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
    }
    const duplicar = (it) => insertar({ ...structuredClone(it), id: uid(esSeccion(it) ? 's' : 'q') })
    const quitar = (it) => {
        const antes = items
        const i = items.findIndex((x) => x.id === it.id)
        const lista = items.filter((x) => x.id !== it.id)
        setItems(lista)
        setActiva(lista[Math.max(0, i - 1)]?.id ?? null)
        avisar(t(esSeccion(it) ? 'side_events.frm_section_removed' : 'side_events.frm_q_removed'), () => { setItems(antes); setActiva(it.id) })
    }

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )
    const soltar = ({ active, over }) => {
        if (!over || active.id === over.id) return
        const de = items.findIndex((it) => it.id === active.id)
        const a = items.findIndex((it) => it.id === over.id)
        setItems(arrayMove(items, de, a))
    }

    // Número de cada sección (para "SECCIÓN N").
    const numSeccion = useMemo(() => {
        let n = 0
        return Object.fromEntries(items.filter(esSeccion).map((it) => [it.id, ++n]))
    }, [items])

    return (
        <div className={styles.preguntas}>
            <div className={styles.edicion}>
                <div className={styles.columna}>
                    <div className={styles.tarjetas}>
                        <div className={styles.cabecera} onMouseDown={() => setActiva(null)}>
                            <input
                                className={styles.tituloInput}
                                value={formulario.title}
                                maxLength={80}
                                placeholder={t('side_events.frm_title_ph')}
                                onChange={(e) => editar({ title: e.target.value })}
                            />
                            <textarea
                                className={styles.descInput}
                                value={formulario.description ?? ''}
                                maxLength={400}
                                rows={2}
                                placeholder={t('side_events.frm_desc_ph')}
                                onChange={(e) => editar({ description: e.target.value })}
                            />
                        </div>

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={soltar}>
                            <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                                {items.map((it) => {
                                    return (
                                        <div key={it.id} ref={(el) => { refs.current[it.id] = el }} className={styles.envoltura}>
                                            <Tarjeta
                                                it={it}
                                                n={numSeccion[it.id]}
                                                activa={activa === it.id}
                                                onActivar={() => setActiva(it.id)}
                                                cambiar={(patch) => cambiar(it.id, patch)}
                                                duplicar={() => duplicar(it)}
                                                quitar={() => quitar(it)}
                                                t={t}
                                            />
                                        </div>
                                    )
                                })}
                            </SortableContext>
                        </DndContext>

                        {!items.length && <span className={styles.vacioPreguntas}>{t('side_events.frm_empty_questions')}</span>}
                    </div>

                    <div className={styles.herramientas}>
                        <button type="button" onClick={() => insertar(preguntaNueva('short'))} aria-label={t('side_events.frm_add_question')} title={t('side_events.frm_add_question')}>
                            <CirclePlus size={20} strokeWidth={1.8} />
                        </button>
                        <button type="button" onClick={() => insertar(seccionNueva())} aria-label={t('side_events.frm_add_section')} title={t('side_events.frm_add_section')}>
                            <Rows2 size={20} strokeWidth={1.8} />
                        </button>
                    </div>
                </div>
            </div>

            <VistaPrevia formulario={formulario} activa={activa} fondo={fondo} />
        </div>
    )
}
