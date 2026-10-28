import { useRef } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import styles from './ElementBar.module.css'

// Fila de miniaturas de una barra (ImagesBar, CoverMediaBar): se arrastran
// para ordenar (dnd-kit) y un toque elige / suelta una. Los videos se ven
// como <video> sin sonido. `selected` es el índice elegido (o null).

const isVideo = (src) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src ?? '')

const Thumb = ({ id, url, selected, onSelect }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
    return (
        <button
            ref={setNodeRef}
            type="button"
            className={styles.sortThumb}
            data-on={selected || undefined}
            data-dragging={isDragging || undefined}
            onClick={onSelect}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            {...attributes}
            {...listeners}
        >
            {isVideo(url) ? <video src={url} muted /> : <img src={url} alt="" draggable={false} />}
        </button>
    )
}

export const SortableThumbs = ({ images, onReorder, selected, onSelectedChange }) => {
    // ids estables para dnd-kit aunque se repita una imagen.
    const ids = images.map((url, i) => `${i}-${url}`)
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
    // Al soltar un arrastre el navegador manda un click: no cambia la elegida.
    const justDragged = useRef(false)

    return (
        <div className={`${styles.thumbRow} scroll-invitation`}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={({ active }) => { justDragged.current = true; onSelectedChange(ids.indexOf(active.id)) }}
                onDragEnd={({ active, over }) => {
                    if (over && active.id !== over.id) {
                        const to = ids.indexOf(over.id)
                        onReorder(arrayMove(images, ids.indexOf(active.id), to))
                        // La elegida sigue siendo la que se movió.
                        onSelectedChange(to)
                    }
                    setTimeout(() => { justDragged.current = false }, 80)
                }}
            >
                <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
                    {images.map((url, i) => (
                        <Thumb
                            key={ids[i]}
                            id={ids[i]}
                            url={url}
                            selected={selected === i}
                            onSelect={() => { if (!justDragged.current) onSelectedChange(selected === i ? null : i) }}
                        />
                    ))}
                </SortableContext>
            </DndContext>
        </div>
    )
}
