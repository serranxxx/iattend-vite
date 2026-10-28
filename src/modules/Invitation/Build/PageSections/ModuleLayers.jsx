import { useTranslation } from 'react-i18next'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Eye, EyeOff, GripVertical, Lock, ScanHeart } from 'lucide-react'
import { MODULES } from './moduleList'
import styles from './ModuleLayers.module.css'

// Panel "Capas" del editor de escritorio, fijo a la derecha del área de
// trabajo (EditCanvas lo pinta con portal en `layersTarget`). Reemplaza a la
// columna de iconos (ModuleOrder) junto a la pieza: cada módulo es una fila
// con su icono y nombre; tocarla lo elige, arrastrarla reescribe
// `generals.positions` y el ojo lo oculta / muestra (`[módulo].active`). La
// portada va primero, fija.

// Solo en vertical (no hay @dnd-kit/modifiers en el proyecto).
const vertical = ({ transform }) => ({ ...transform, x: 0 })

const Row = ({ id, label, icon, selected, hidden, onSelect, onToggle, showLabel, hideLabel }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
    return (
        <li
            ref={setNodeRef}
            className={styles.row}
            data-selected={selected || undefined}
            data-hidden={hidden || undefined}
            data-dragging={isDragging || undefined}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            onClick={onSelect}
            {...attributes}
            {...listeners}
        >
            <GripVertical size={14} className={styles.grip} />
            {icon}
            <span className={styles.label}>{label}</span>
            <button
                type="button"
                className={styles.eye}
                title={hidden ? showLabel : hideLabel}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onToggle() }}
            >
                {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
        </li>
    )
}

export const ModuleLayers = ({ invitation, selectedSection, onSelect, onMoved, setInvitation, setSaved }) => {
    const { t } = useTranslation()
    const positions = invitation?.generals?.positions ?? []
    // Distancia mínima: un toque elige el módulo, arrastrar lo mueve.
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

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
    const toggle = (key) => {
        setInvitation((prev) => ({ ...prev, [key]: { ...prev[key], active: !prev[key]?.active } }))
        setSaved(false)
    }

    return (
        <div className={styles.panel} data-edit-keep onMouseDown={(e) => e.stopPropagation()}>
            <span className={styles.title}>{t('build_editor.layers_title')}</span>
            <ul className={`${styles.list} scroll-invitation`} aria-label={t('build_editor.layers_title')}>
                <li
                    className={`${styles.row} ${styles.fixed}`}
                    data-selected={selectedSection === 'cover' || undefined}
                    onClick={() => onSelect('cover')}
                >
                    <Lock size={13} className={styles.grip} />
                    <ScanHeart size={16} strokeWidth={2} />
                    <span className={styles.label}>{t('buttons_menu.cover')}</span>
                </li>
                <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[vertical]} onDragEnd={onDragEnd}>
                    <SortableContext items={positions} strategy={verticalListSortingStrategy}>
                        {positions.map((id) => {
                            const mod = MODULES[id]
                            if (!mod) return null
                            return (
                                <Row
                                    key={id}
                                    id={id}
                                    label={t(`buttons_menu.${mod.type}`)}
                                    icon={<mod.Icon size={16} strokeWidth={2} />}
                                    selected={selectedSection === mod.type}
                                    hidden={!invitation?.[mod.key]?.active}
                                    onSelect={() => onSelect(mod.type)}
                                    onToggle={() => toggle(mod.key)}
                                    showLabel={t('build_editor.layers_show')}
                                    hideLabel={t('build_editor.layers_hide')}
                                />
                            )
                        })}
                    </SortableContext>
                </DndContext>
            </ul>
        </div>
    )
}
