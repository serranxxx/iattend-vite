import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, Tooltip } from 'antd'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    BookUser, Camera, Feather, Gift, HeartHandshake,
    MapPinned, MessageSquareHeart, ScanHeart, ScrollText, Shirt, Type, Undo2,
} from 'lucide-react'
import { TypographyPanel } from '../BuildSections/TypographyPanel'
import styles from './ModuleOrder.module.css'

// Orden de la invitación en el modo edición: columna junto a la pieza con la
// "T" (tipografía de toda la invitación), deshacer (solo si llega `onUndo`; en
// el editor de escritorio va en el dock) y la pill de módulos con el
// que se está editando resaltado. Arrastrar un módulo arriba o abajo reescribe
// `generals.positions`. La portada siempre va primero: se muestra fija.
// La columna completa se puede arrastrar al otro lado de la pieza.

// Vidrio de los popovers del editor (mismo que EditCanvas).
const FROST = {
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.65)',
    borderRadius: 16,
    boxShadow: '0 12px 32px rgba(12, 23, 27, 0.18)',
    padding: 0,
}

// id de `generals.positions` → sección del editor, llave del módulo en la
// invitación (para saber si está activo) e icono (los del menú de módulos).
// Solo se ven los iconos; el nombre va en un tooltip.
const MODULES = {
    1: { type: 'greeting', key: 'greeting', Icon: HeartHandshake },
    2: { type: 'family', key: 'people', Icon: BookUser },
    3: { type: 'quote', key: 'quote', Icon: Feather },
    4: { type: 'itinerary', key: 'itinerary', Icon: ScrollText },
    5: { type: 'dresscode', key: 'dresscode', Icon: Shirt },
    6: { type: 'gifts', key: 'gifts', Icon: Gift },
    7: { type: 'destinations', key: 'destinations', Icon: MapPinned },
    8: { type: 'notices', key: 'notices', Icon: MessageSquareHeart },
    9: { type: 'gallery', key: 'gallery', Icon: Camera },
}

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
            {/* Tipografía de toda la invitación (títulos y cuerpo). */}
            <Popover
                trigger="click"
                placement={side === 'right' ? 'rightTop' : 'leftTop'}
                arrow={false}
                rootClassName={styles.frostRoot}
                styles={{ container: FROST }}
                content={<div onMouseDown={(e) => e.stopPropagation()}><TypographyPanel invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} /></div>}
            >
                <Tooltip title={t('build_editor.typography')} placement="left" mouseEnterDelay={0.25}>
                    <button type="button" className={styles.typeButton} aria-label={t('build_editor.typography')}>
                        <Type size={14} strokeWidth={2.2} />
                    </button>
                </Tooltip>
            </Popover>
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
