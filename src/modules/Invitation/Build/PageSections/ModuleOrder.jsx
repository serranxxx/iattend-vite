import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tooltip } from 'antd'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ScanHeart, Undo2 } from 'lucide-react'
import { MODULES } from './moduleList'
import styles from './ModuleOrder.module.css'

// Orden de la invitación en el modo edición: columna junto a la pieza con
// deshacer (solo si llega `onUndo`; en
// el editor de escritorio va en el dock) y la pill de módulos con el
// que se está editando resaltado. Arrastrar un módulo arriba o abajo reescribe
// `generals.positions`. La portada siempre va primero: se muestra fija.
// La columna completa se puede arrastrar al otro lado de la pieza.


const Item = ({ id, label, icon, selected, hidden, onSelect }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
    return (
        <Tooltip title={label} placement="left" open={isDragging ? false : undefined} mouseEnterDelay={0.25}>
            <li
                ref={setNodeRef}
                className={styles.item}
                aria-label={label}
                data-selected={selected || undefined}
                data-hidden={hidden || undefined}
                data-dragging={isDragging || undefined}
                style={{ transform: CSS.Translate.toString(transform), transition }}
                onClick={onSelect}
                {...attributes}
                {...listeners}
            >
                {icon}
            </li>
        </Tooltip>
    )
}

export const ModuleOrder = ({
    invitation, selectedSection, onSelect, onMoved, setInvitation, setSaved, getScale,
    onUndo, canUndo, leaving = false, side = 'left', onSideChange,
}) => {
    const { t } = useTranslation()
    const positions = invitation?.generals?.positions ?? []
    // Distancia mínima: un toque elige el módulo, arrastrar lo mueve.
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

    // El tablero está escalado (zoom): dnd-kit mide en px de pantalla, así
    // que el desplazamiento se divide entre la escala. Solo en vertical.
    const verticalScaled = ({ transform }) => ({ ...transform, x: 0, y: transform.y / (getScale?.() || 1) })

    const onDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return
        setInvitation((prev) => {
            const cur = prev.generals.positions
            const next = arrayMove(cur, cur.indexOf(active.id), cur.indexOf(over.id))
            return { ...prev, generals: { ...prev.generals, positions: next } }
        })
        setSaved(false)
        onMoved?.(MODULES[active.id]?.type)
    }

    // Mover la columna al otro lado de la invitación: se arrastra desde
    // cualquier parte que no sea un módulo (esos se arrastran para ordenar) y
    // al soltarla queda del lado de la tarjeta donde quedó el puntero.
    const [shift, setShift] = useState(null)
    const startShift = (e) => {
        if (e.button !== 0 || e.target.closest('li')) return
        const startX = e.clientX
        const center = (() => {
            const r = e.currentTarget.parentElement?.getBoundingClientRect()
            return r ? r.left + r.width / 2 : startX
        })()
        let moved = false
        const onMove = (ev) => {
            const dx = ev.clientX - startX
            if (!moved && Math.abs(dx) < 6) return
            moved = true
            setShift(dx / (getScale?.() || 1))
        }
        const onUp = (ev) => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
            setShift(null)
            if (!moved) return
            // Fue arrastre, no toque: que el click de la T / deshacer no cuente.
            window.addEventListener('click', (ce) => { ce.stopPropagation(); ce.preventDefault() }, { capture: true, once: true })
            onSideChange?.(ev.clientX > center ? 'right' : 'left')
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
    }

    return (
        // Fuera del tablero: ni lo arrastra (pan) ni cuenta como "tocar fuera".
        // T, deshacer y la pill van juntos en una columna centrada con la
        // tarjeta (el grupo completo, no solo la pill).
        <div
            className={styles.stack}
            data-side={side}
            data-leaving={leaving || undefined}
            data-shifting={shift !== null || undefined}
            style={shift !== null ? { transform: `translate(${shift}px, -50%) scale(var(--inv-zoom))` } : undefined}
            data-edit-keep
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={startShift}
        >
            {/* Deshacer, debajo de la "T". */}
            {onUndo && (
                <button
                    type="button"
                    className={styles.undoButton}
                    aria-label={t('build_editor.undo')}
                    title={t('build_editor.undo')}
                    disabled={!canUndo}
                    onClick={onUndo}
                >
                    <Undo2 size={16} />
                </button>
            )}
            <div className={styles.panel}>
                <ul className={styles.list} aria-label={t('build_editor.order_title')}>
                    <Tooltip title={t('buttons_menu.cover')} placement="left" mouseEnterDelay={0.25}>
                        <li
                            className={`${styles.item} ${styles.fixed}`}
                            aria-label={t('buttons_menu.cover')}
                            data-selected={selectedSection === 'cover' || undefined}
                            onClick={() => onSelect('cover')}
                        >
                            <ScanHeart size={14} strokeWidth={2} />
                        </li>
                    </Tooltip>
                    <span className={styles.divider} />
                    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[verticalScaled]} onDragEnd={onDragEnd}>
                        <SortableContext items={positions} strategy={verticalListSortingStrategy}>
                            {positions.map((id) => {
                                const mod = MODULES[id]
                                if (!mod) return null
                                return (
                                    <Item
                                        key={id}
                                        id={id}
                                        label={t(`buttons_menu.${mod.type}`)}
                                        icon={<mod.Icon size={14} strokeWidth={2} />}
                                        selected={selectedSection === mod.type}
                                        hidden={!invitation?.[mod.key]?.active}
                                        onSelect={() => onSelect(mod.type)}
                                    />
                                )
                            })}
                        </SortableContext>
                    </DndContext>
                </ul>
            </div>
        </div>
    )
}
