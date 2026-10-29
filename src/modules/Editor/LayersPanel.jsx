import { useEffect, useRef, useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight, Eye, EyeOff, GripVertical, Lock } from 'lucide-react'
import styles from '../Invitation/Build/PageSections/ModuleLayers.module.css'

/*
  Panel "Capas" de todos los editores (EditorShell): las capas reales de la
  pieza, en el orden en que se apilan (la de hasta arriba primero).

  En la invitación cada módulo es un GRUPO (se arrastra para cambiar su
  posición y el ojo lo oculta) y adentro van sus capas: los elementos que se
  agregaron delante del contenido, el contenido del módulo (título, texto,
  fecha…), los elementos detrás del contenido y su fondo. En un Flash hay un
  solo grupo, sin encabezado.

  Un elemento se arrastra dentro de su lista para cambiar su orden, a la otra
  lista de su grupo (delante ↔ detrás del contenido) o a OTRO grupo (soltarlo
  en su encabezado o en sus capas): `onMoveItem` lo cambia de módulo.

  groups: [{
    id,
    header?: { label, icon, selected, hidden, onSelect, onToggleHidden, sortable, defaultOpen },
    segments: [
      { kind: 'items', id, rows, onReorder(activeId, overId) }   // se arrastran
      { kind: 'fixed', rows }                                       // no se mueven
    ],
  }]
  row: { id, label, icon, selected, hidden?, onSelect(event), onToggleHidden? }
  onReorderGroups(activeGroupId, overGroupId)
  onMoveItem({ itemId, fromGroup, toGroup, toSegment })
*/

// Solo en vertical (no hay @dnd-kit/modifiers en el proyecto).
const vertical = ({ transform }) => ({ ...transform, x: 0 })
const gid = (id) => `g:${id}`

const EyeButton = ({ hidden, onToggle, showLabel, hideLabel }) => (
    <button
        type="button"
        className={styles.eye}
        title={hidden ? showLabel : hideLabel}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onToggle() }}
    >
        {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
)

// Capa que se arrastra (un elemento).
const ItemRow = ({ row, groupId, segmentId, ctx }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: row.id,
        data: { type: 'item', groupId, segmentId },
    })
    return (
        <li
            ref={setNodeRef}
            className={`${styles.row} ${styles.child}`}
            data-selected={row.selected || undefined}
            data-hidden={row.hidden || undefined}
            data-dragging={isDragging || undefined}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            onClick={(e) => { e.stopPropagation(); if (!ctx.justDragged()) row.onSelect(e) }}
            {...attributes}
            {...listeners}
        >
            <GripVertical size={13} className={styles.grip} />
            <span className={styles.thumb}>{row.icon}</span>
            <span className={styles.label}>{row.label}</span>
            {row.onToggleHidden && <EyeButton hidden={row.hidden} onToggle={row.onToggleHidden} {...ctx.labels} />}
        </li>
    )
}

// Capa fija (contenido del módulo: título, fecha, fondo…). Con
// `onToggleHidden` lleva ojo (ej. Asistentes de un Flash, que es opcional).
const FixedRow = ({ row, ctx }) => (
    <li className={`${styles.row} ${styles.child} ${styles.part}`} data-selected={row.selected || undefined} data-hidden={row.hidden || undefined} onClick={(e) => { e.stopPropagation(); row.onSelect(e) }}>
        <span className={styles.partDot} />
        <span className={styles.thumb}>{row.icon}</span>
        <span className={styles.label}>{row.label}</span>
        {row.onToggleHidden && <EyeButton hidden={row.hidden} onToggle={row.onToggleHidden} {...ctx.labels} />}
    </li>
)

const Children = ({ group, ctx }) => (
    <ul className={styles.children}>
        {group.segments.map((seg, i) => (seg.kind === 'fixed'
            ? seg.rows.map((row) => <FixedRow key={row.id} row={row} ctx={ctx} />)
            : (
                <SortableContext key={seg.id ?? i} items={seg.rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                    {seg.rows.map((row) => <ItemRow key={row.id} row={row} groupId={group.id} segmentId={seg.id} ctx={ctx} />)}
                </SortableContext>
            )))}
    </ul>
)

// Abrir / cerrar un grupo con transición: el alto va de 0 a su contenido
// (grid-template-rows 0fr ↔ 1fr) con un fundido. Al cerrar, los hijos siguen
// montados hasta que termina y luego se desmontan (cerrados no deben contar
// como destino al arrastrar).
const Collapse = ({ open, children }) => {
    const [render, setRender] = useState(open)
    const [shown, setShown] = useState(open)
    useEffect(() => {
        if (!open) {
            setShown(false)
            // Termina la transición (280 ms) y se desmonta.
            const t = setTimeout(() => setRender(false), 320)
            return () => clearTimeout(t)
        }
        setRender(true)
        // Dos cuadros: primero se monta cerrado y luego se abre, para que anime.
        let id = requestAnimationFrame(() => { id = requestAnimationFrame(() => setShown(true)) })
        return () => cancelAnimationFrame(id)
    }, [open])
    if (!render) return null
    return (
        <div className={styles.collapse} data-open={shown || undefined}>
            <div className={styles.collapseIn}>{children}</div>
        </div>
    )
}

// Encabezado de un grupo (módulo). `dropTarget`: se le está soltando un
// elemento de otro grupo.
const GroupHeader = ({ header, open, onCaret, dragProps, dropTarget, ctx, vacio = false }) => (
    <div
        className={`${styles.row} ${styles.groupHead}`}
        data-selected={header.selected || undefined}
        data-hidden={header.hidden || undefined}
        data-drop={dropTarget || undefined}
        onClick={() => { if (!ctx.justDragged()) header.onSelect() }}
        {...dragProps}
    >
        {/* Sin capas adentro (ej. una tarjeta de un side event) no hay qué abrir. */}
        {vacio ? <span className={styles.caret} aria-hidden /> : (
            <button
                type="button"
                className={styles.caret}
                data-open={open || undefined}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onCaret() }}
            >
                <ChevronRight size={14} />
            </button>
        )}
        {header.sortable ? <GripVertical size={14} className={styles.grip} /> : <Lock size={13} className={styles.grip} />}
        {header.icon}
        <span className={styles.label}>{header.label}</span>
        {header.onToggleHidden && <EyeButton hidden={header.hidden} onToggle={header.onToggleHidden} {...ctx.labels} />}
    </div>
)

const tieneCapas = (group) => group.segments.some((s) => s.rows.length)

// Grupo que se arrastra (módulo que cambia de posición).
const SortableGroup = ({ group, open, onCaret, ctx }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: gid(group.id),
        data: { type: 'group', groupId: group.id, sortable: true },
    })
    return (
        <li ref={setNodeRef} className={styles.group} data-dragging={isDragging || undefined} style={{ transform: CSS.Translate.toString(transform), transition }}>
            <GroupHeader header={group.header} open={open} onCaret={onCaret} dragProps={{ ...attributes, ...listeners }} dropTarget={ctx.dropGroup === group.id} ctx={ctx} vacio={!tieneCapas(group)} />
            <Collapse open={open}><Children group={group} ctx={ctx} /></Collapse>
        </li>
    )
}

// Grupo fijo (la portada): no se mueve, pero recibe elementos.
const FixedGroup = ({ group, open, onCaret, ctx }) => {
    const { setNodeRef } = useDroppable({ id: gid(group.id), data: { type: 'group', groupId: group.id, sortable: false } })
    return (
        <li ref={setNodeRef} className={`${styles.group} ${styles.groupFixed}`}>
            <GroupHeader header={group.header} open={open} onCaret={onCaret} dropTarget={ctx.dropGroup === group.id} ctx={ctx} vacio={!tieneCapas(group)} />
            <Collapse open={open}><Children group={group} ctx={ctx} /></Collapse>
        </li>
    )
}

export const LayersPanel = ({ title, groups, onReorderGroups, onMoveItem, showLabel, hideLabel }) => {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
    // Abierto: el que el usuario abrió con la flecha, o el que tiene algo elegido.
    const [toggled, setToggled] = useState({})
    const hasSelection = (g) => g.header?.selected || g.segments.some((s) => s.rows.some((r) => r.selected))
    // `header.defaultOpen`: abierto de entrada (la portada de un side event).
    const isOpen = (g) => (g.id in toggled ? toggled[g.id] : hasSelection(g) || Boolean(g.header?.defaultOpen))
    const caret = (g) => setToggled((prev) => ({ ...prev, [g.id]: !isOpen(g) }))
    const sortableIds = groups.filter((g) => g.header?.sortable).map((g) => gid(g.id))

    // Grupo al que se va a soltar un elemento que viene de otro.
    const [dropGroup, setDropGroup] = useState(null)
    // Al soltar, el navegador manda un click a la fila: no debe elegirla.
    const draggedAt = useRef(0)
    const ctx = {
        labels: { showLabel, hideLabel },
        dropGroup,
        justDragged: () => Date.now() - draggedAt.current < 200,
    }

    const groupOf = (data) => data?.groupId
    // Un grupo solo choca con grupos (que se mueven); un elemento, con todo.
    const collision = (args) => {
        const type = args.active.data.current?.type
        const droppableContainers = type === 'group'
            ? args.droppableContainers.filter((c) => c.data.current?.type === 'group' && c.data.current?.sortable)
            : args.droppableContainers
        return closestCenter({ ...args, droppableContainers })
    }

    const onDragOver = ({ active, over }) => {
        const a = active.data.current
        if (a?.type !== 'item' || !over) { setDropGroup(null); return }
        const destino = groupOf(over.data.current)
        setDropGroup(destino != null && destino !== a.groupId ? destino : null)
    }
    const onDragEnd = ({ active, over }) => {
        draggedAt.current = Date.now()
        setDropGroup(null)
        if (!over || active.id === over.id) return
        const a = active.data.current
        const o = over.data.current
        if (a?.type === 'group') {
            if (o?.type === 'group' && o.sortable) onReorderGroups?.(a.groupId, o.groupId)
            return
        }
        // Elemento: en su misma lista se reordena; si no, cambia de lista o de grupo.
        if (o?.type === 'item' && o.groupId === a.groupId && o.segmentId === a.segmentId) {
            const group = groups.find((g) => g.id === a.groupId)
            group?.segments.find((s) => s.id === a.segmentId)?.onReorder(active.id, over.id)
            return
        }
        const toGroup = groupOf(o)
        if (toGroup == null) return
        onMoveItem?.({ itemId: active.id, fromGroup: a.groupId, toGroup, toSegment: o?.type === 'item' ? o.segmentId : null })
    }

    return (
        <div className={styles.panel} data-edit-keep onMouseDown={(e) => e.stopPropagation()}>
            <span className={styles.title}>{title}</span>
            <ul className={`${styles.list} scroll-invitation`} aria-label={title}>
                <DndContext
                    sensors={sensors}
                    collisionDetection={collision}
                    modifiers={[vertical]}
                    onDragOver={onDragOver}
                    onDragEnd={onDragEnd}
                    onDragCancel={() => setDropGroup(null)}
                >
                    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                        {groups.map((g) => (!g.header
                            // Sin encabezado (Flash): sus capas directo.
                            ? <li key={g.id} className={styles.group}><Children group={g} ctx={ctx} /></li>
                            : g.header.sortable
                                ? <SortableGroup key={g.id} group={g} open={isOpen(g)} onCaret={() => caret(g)} ctx={ctx} />
                                : <FixedGroup key={g.id} group={g} open={isOpen(g)} onCaret={() => caret(g)} ctx={ctx} />))}
                    </SortableContext>
                </DndContext>
            </ul>
        </div>
    )
}
