import React, { useEffect, useRef, useState } from 'react'
import './dynamic-table.css'
import { Button } from 'antd'
import { Lock } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { clampToCanvas, getTableFootprint } from './seatingGeometry'

export const DynamicTable = ({
    onSelectedTable,
    setOnSelectedTable,
    table,
    onMoving,
    setSelectedTable,
    onEditPosition,
    setOnViewTable,
    occupiedChairs,
    onGrab,
    vertical = false,
    shape = 'rectangle', // 'round' | 'square' | 'rectangle' | 'dance'
    zoomLevel = 1,
    onDelete,
    isRepeated = false,
    onDragCommit,
    onMoved,
    // Selección múltiple: si esta mesa forma parte de ella, el arrastre lo
    // coordina el padre para que todas se muevan juntas.
    isMultiSelected = false,
    groupOffset = null,
    onGroupDragStart,
    onGroupDragMove,
    onGroupDragEnd,
    onToggleSelect,
}) => {
    const [chairs, setChairs] = useState([])
    // Posición durante el arrastre propio; null en reposo (se usa table.x/y).
    const [dragPos, setDragPos] = useState(null)
    const [isDragging, setIsDragging] = useState(false)
    const [showDanceMenu, setShowDanceMenu] = useState(false)

    const positionRef = useRef({ x: table.x, y: table.y })
    const lastMouseRef = useRef({ x: 0, y: 0 })
    const startPosRef = useRef({ x: 0, y: 0 })
    const hasDraggedRef = useRef(false)
    const wasDragRef = useRef(false)
    const dragOriginRef = useRef({ x: table.x, y: table.y })
    const mapContainerRef = useRef(null)

    const DRAG_THRESHOLD = 5

    const mapPosition = dragPos ?? { x: table.x, y: table.y }
    useEffect(() => { positionRef.current = mapPosition })

    useEffect(() => {
        const containerWidth =
            shape === 'rectangle' ? 400 : 200

        const containerHeight =
            shape === 'rectangle' ? 200 : 200

        const centerX = containerWidth / 2
        const centerY = containerHeight / 2

        const buildRoundChairs = () => {
            const tableSize = 72
            const radius = (containerWidth / 1.7) - (tableSize / 2) - 8

            return Array.from({ length: table.size }, (_, i) => {
                const angle = (i * (360 / table.size)) * (Math.PI / 180)

                return {
                    id: i + 1,
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle),
                    occupied: i < occupiedChairs,
                }
            })
        }

        const buildSquareChairs = () => {
            const chairs = []
            const total = table.size

            const distribution = new Array(4).fill(Math.floor(total / 4))
            for (let i = 0; i < total % 4; i++) {
                distribution[i]++
            }

            const padding = 24
            let chairIndex = 0

            const [topCount, rightCount, bottomCount, leftCount] = distribution

            for (let i = 0; i < topCount; i++) {
                const step = (containerWidth - padding * 2) / (topCount + 1)
                chairs.push({
                    id: chairIndex + 1,
                    x: padding + step * (i + 1),
                    y: padding,
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            for (let i = 0; i < rightCount; i++) {
                const step = (containerHeight - padding * 2) / (rightCount + 1)
                chairs.push({
                    id: chairIndex + 1,
                    x: containerWidth - padding,
                    y: padding + step * (i + 1),
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            for (let i = 0; i < bottomCount; i++) {
                const step = (containerWidth - padding * 2) / (bottomCount + 1)
                chairs.push({
                    id: chairIndex + 1,
                    x: padding + step * (i + 1),
                    y: containerHeight - padding,
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            for (let i = 0; i < leftCount; i++) {
                const step = (containerHeight - padding * 2) / (leftCount + 1)
                chairs.push({
                    id: chairIndex + 1,
                    x: padding,
                    y: padding + step * (i + 1),
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            return chairs
        }

        const buildRectangleChairs = () => {
            const chairs = []
            const total = table.size

            const horizontalWeight = 2
            const verticalWeight = 1
            const totalWeight = (horizontalWeight * 2) + (verticalWeight * 2)

            let topCount = Math.floor((total * horizontalWeight) / totalWeight)
            let bottomCount = Math.floor((total * horizontalWeight) / totalWeight)
            let leftCount = Math.floor((total * verticalWeight) / totalWeight)
            let rightCount = Math.floor((total * verticalWeight) / totalWeight)

            let assigned = topCount + bottomCount + leftCount + rightCount
            let remaining = total - assigned

            const order = ['top', 'bottom', 'left', 'right']
            let idx = 0

            while (remaining > 0) {
                const side = order[idx % order.length]

                if (side === 'top') topCount++
                if (side === 'bottom') bottomCount++
                if (side === 'left') leftCount++
                if (side === 'right') rightCount++

                remaining--
                idx++
            }

            const rectWidth = 264
            const rectHeight = 96

            const leftX = centerX - rectWidth / 1.7
            const rightX = centerX + rectWidth / 1.7
            const topY = centerY - rectHeight / 1.7
            const bottomY = centerY + rectHeight / 1.7

            const offset = 16
            let chairIndex = 0

            for (let i = 0; i < topCount; i++) {
                const step = rectWidth / (topCount + 1)
                chairs.push({
                    id: chairIndex + 1,
                    x: leftX + step * (i + 1.5),
                    y: topY - offset,
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            for (let i = 0; i < rightCount; i++) {
                const step = rectHeight / (rightCount + 0.5)
                chairs.push({
                    id: chairIndex + 1,
                    x: rightX + offset,
                    y: topY + step * (i + 1),
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            for (let i = 0; i < bottomCount; i++) {
                const step = rectWidth / (bottomCount + 1)
                chairs.push({
                    id: chairIndex + 1,
                    x: leftX + step * (i + 1.5),
                    y: bottomY + offset,
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            for (let i = 0; i < leftCount; i++) {
                const step = rectHeight / (leftCount + 0.5)
                chairs.push({
                    id: chairIndex + 1,
                    x: leftX - offset,
                    y: topY + step * (i + 1),
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            return chairs
        }

        if (shape === 'dance') setChairs([])
        else if (shape === 'square') setChairs(buildSquareChairs())
        else if (shape === 'rectangle') setChairs(buildRectangleChairs())
        else setChairs(buildRoundChairs())
    }, [table, occupiedChairs, shape])

    const startDrag = (event) => {
        if (onGrab) return // cuando onGrab está activo, el evento sube al canvas para hacer pan
        // Frenar SIEMPRE la burbuja: si sube al fondo, el mapa arranca un
        // marquee de 0px que limpia la selección al soltar.
        event.stopPropagation()
        // Shift/Cmd-clic es selección, no arrastre: iniciar un drag aquí deja
        // un listener fantasma que luego mueve esta mesa con el cursor ajeno.
        if (event.shiftKey || event.metaKey || event.ctrlKey) return
        const pos = event.touches ? event.touches[0] : event
        lastMouseRef.current = { x: pos.clientX, y: pos.clientY }
        startPosRef.current = { x: pos.clientX, y: pos.clientY }
        dragOriginRef.current = { x: table.x, y: table.y }
        hasDraggedRef.current = false
        document.body.classList.add('seating-dragging')
        if (isMultiSelected) onGroupDragStart?.()
        setIsDragging(true)
    }

    useEffect(() => {
        if (!isDragging) return

        const onMove = (event) => {
            const pos = event.touches ? event.touches[0] : event
            const dx = pos.clientX - startPosRef.current.x
            const dy = pos.clientY - startPosRef.current.y

            if (!hasDraggedRef.current && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
                hasDraggedRef.current = true
            }

            if (hasDraggedRef.current) {
                if (event.cancelable) event.preventDefault()

                // El destino sale del desplazamiento TOTAL del cursor desde que
                // empezó el arrastre, no de sumar deltas frame a frame: si la
                // mesa topa un momento, así vuelve a alcanzar al cursor en
                // cuanto hay hueco en vez de quedarse rezagada para siempre.
                const totalX = dx / zoomLevel
                const totalY = dy / zoomLevel

                if (isMultiSelected) {
                    onGroupDragMove?.({ x: totalX, y: totalY })
                } else {
                    const origin = dragOriginRef.current
                    setDragPos(clampToCanvas(origin.x + totalX, origin.y + totalY, shape, vertical))
                }
            }

            lastMouseRef.current = { x: pos.clientX, y: pos.clientY }
        }

        const onStop = async () => {
            setIsDragging(false)
            document.body.classList.remove('seating-dragging')
            if (!hasDraggedRef.current) { setDragPos(null); return }

            wasDragRef.current = true

            if (isMultiSelected) {
                onGroupDragEnd?.()
                return
            }

            const { x, y } = positionRef.current

            // El historial guarda el mapa como estaba ANTES de soltar.
            onDragCommit?.()
            // El padre primero y el override después, en el mismo tick: así el
            // render de reposo ya trae la posición nueva y no hay brinco.
            onMoved?.(table.id, x, y)
            setDragPos(null)

            const { error } = await supabase
                .from('tables')
                .update({ x, y })
                .eq('id', table.id)
            if (error) console.error('Error moviendo mesa:', error.message)
        }

        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onStop)
        document.addEventListener('touchmove', onMove, { passive: false })
        document.addEventListener('touchend', onStop)

        return () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onStop)
            document.removeEventListener('touchmove', onMove)
            document.removeEventListener('touchend', onStop)
        }
    }, [isDragging, zoomLevel, table.id, shape, vertical, onDragCommit, isMultiSelected, onGroupDragMove, onGroupDragEnd])

    const selectTable = () => {
        setSelectedTable(table)
        setOnViewTable(true)
        setOnSelectedTable(onSelectedTable === table.id ? null : table.id)
    }

    const handleClick = (event) => {
        if (wasDragRef.current) {
            wasDragRef.current = false
            return
        }
        if (onGrab) return
        // Shift/Cmd-clic agrega o quita de la selección múltiple, como en
        // Figma. La pista no entra: no es una mesa alineable.
        if ((event.shiftKey || event.metaKey || event.ctrlKey) && shape !== 'dance') {
            onToggleSelect?.(table.id)
            return
        }
        if (isMultiSelected) {
            onToggleSelect?.(table.id)
            return
        }
        if (shape === 'dance') {
            setShowDanceMenu(prev => !prev)
            return
        }
        if (onEditPosition) {
            setOnSelectedTable(onSelectedTable === table.id ? null : table.id)
        } else {
            selectTable()
        }
    }

    useEffect(() => {
        if (!showDanceMenu) return
        const handleOutside = (e) => {
            if (mapContainerRef.current && !mapContainerRef.current.contains(e.target)) {
                setShowDanceMenu(false)
            }
        }
        document.addEventListener('mousedown', handleOutside)
        document.addEventListener('touchstart', handleOutside)
        return () => {
            document.removeEventListener('mousedown', handleOutside)
            document.removeEventListener('touchstart', handleOutside)
        }
    }, [showDanceMenu])

    const isSelected = onSelectedTable === table.id
    const isFull = table.size === occupiedChairs
    const footprint = getTableFootprint(shape)

    const tableShapeClass =
        shape === 'square'
            ? 'square-table'
            : shape === 'rectangle'
                ? 'rectangle-table'
                : 'round-table'

    const containerShapeClass =
        shape === 'square'
            ? 'square-container'
            : shape === 'rectangle'
                ? 'rectangle-container'
                : 'round-container'

    if (shape === 'dance') {
        return (
            <div
                onClick={handleClick}
                onMouseDown={startDrag}
                onTouchStart={startDrag}
                ref={mapContainerRef}
                style={{
                    top: `${mapPosition.y}px`,
                    left: `${mapPosition.x}px`,
                    cursor: isDragging ? 'grabbing' : 'pointer',
                    transform: 'scale(0.7)',
                }}
                className="dynamic-container"
            >
                <div className={`dance-container ${onMoving ? 'moving-container' : ''}`}>
                    <span className="dance-label">Pista de Baile</span>
                    {showDanceMenu && (
                        <div className="dance-delete-overlay">
                            <Button
                                danger
                                style={{ borderRadius: '99px' }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDelete(table.id)
                                    setShowDanceMenu(false)
                                }}
                            >
                                Eliminar pista
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // La rotación se aplica solo a la mesa, no al contenedor: si el rótulo
    // vive dentro de lo rotado, en una rectangular vertical acaba a la
    // izquierda en vez de debajo.
    const visualHeight = (vertical ? footprint.width : footprint.height) * 0.7
    const captionTop = (vertical ? footprint.width : footprint.height) / 2 + visualHeight / 2 + 10

    const groupDx = isMultiSelected && groupOffset ? groupOffset.x : 0
    const groupDy = isMultiSelected && groupOffset ? groupOffset.y : 0

    // La caja del DOM debe medir lo que la mesa OCUPA de verdad. Una vertical
    // gira 90° alrededor de su centro, así que su caja es el footprint con los
    // lados intercambiados y desplazada para conservar ese centro; sin esto,
    // una vertical arrastraba una caja horizontal de 400px que generaba huecos
    // sin sentido al alinear y al chocar.
    const boundW = vertical ? footprint.height : footprint.width
    const boundH = vertical ? footprint.width : footprint.height
    const boundOffsetX = (footprint.width - boundW) / 2
    const boundOffsetY = (footprint.height - boundH) / 2

    return (
            <div
                onClick={handleClick}
                onMouseDown={startDrag}
                onTouchStart={startDrag}
                ref={mapContainerRef}
                data-table-id={table.id}
                style={{
                    top: `${mapPosition.y + groupDy + boundOffsetY}px`,
                    left: `${mapPosition.x + groupDx + boundOffsetX}px`,
                    width: `${boundW}px`,
                    height: `${boundH}px`,
                    cursor: isDragging ? 'grabbing' : 'pointer',
                    // Suaviza alinear/acomodar/deshacer; en arrastre va directo
                    // para no rezagarse del cursor.
                    transition: dragPos || (isMultiSelected && groupOffset)
                        ? 'none'
                        : 'top 0.3s ease, left 0.3s ease',
                }}
                className={`dynamic-container ${isMultiSelected ? 'multi-selected' : ''}`}
            >
                <div
                    className='table-rotor'
                    style={{
                        width: `${footprint.width}px`,
                        height: `${footprint.height}px`,
                        marginLeft: `${-footprint.width / 2}px`,
                        marginTop: `${-footprint.height / 2}px`,
                        transform: `scale(0.7) ${vertical ? 'rotate(90deg)' : ''}`,
                    }}
                >
                <div
                    className={`container ${containerShapeClass} ${onMoving ? 'moving-container' : ''}`}
                    /* El tamaño sale del MISMO footprint que usa la detección de
                       colisiones. Dejarlo en manos del CSS permitía que el
                       dibujo y la zona segura divergieran, y ahí es donde se
                       colaban las mesas encimadas. */
                    style={{ width: `${footprint.width}px`, height: `${footprint.height}px` }}
                >
                    <div
                        className={`table ${tableShapeClass} ${onMoving ? 'moving-table' : ''}`}
                        style={{
                            backgroundColor: isRepeated
                                ? '#ff4d4f30'
                                : isSelected
                                    ? 'var(--brand-color-100)'
                                    : isFull
                                        ? 'var(--brand-color-300)'
                                        : 'var(--sc-color)',
                            border: isRepeated
                                ? '2px solid #ff4d4f'
                                : isSelected
                                    ? '2px solid var(--brand-color-500)'
                                    : undefined,
                        }}
                    >
                        <span
                            style={{ transform: `${vertical ? 'rotate(-90deg)' : ''}` }}
                        >#{table.number}</span>
                    </div>

                    {chairs.map((chair) => (
                        <div
                            key={chair.id}
                            className={`chair ${chair.occupied ? 'occupied' : 'available'} ${onMoving ? 'moving-table' : ''}`}
                            style={{
                                left: `${chair.x}px`,
                                top: `${chair.y}px`,
                                backgroundColor: isRepeated ? '#ff4d4f30' : isSelected ? 'var(--brand-color-100)' : undefined,
                                border: isRepeated ? '2px solid #ff4d4f' : isSelected ? '2px solid var(--brand-color-500)' : undefined,
                            }}
                        >
                            <span style={{ transform: `${vertical ? 'rotate(-90deg)' : ''}` }}>{chair.id}</span>
                        </div>
                    ))}

                    {/* El candado va sobre el contenedor, no bajo la mesa, para
                        que se lea igual con la mesa rotada. */}
                    {table.locked && (
                        <div className='table-lock-badge' style={{ transform: vertical ? 'rotate(-90deg)' : undefined }}>
                            <Lock size={13} />
                        </div>
                    )}
                </div>
                </div>

                {/* El nombre existía en la tabla y no se usaba: sin él, el mapa
                    solo dice "#N" y no comunica ni capacidad ni de quién es.
                    Queda fuera del rotor para caer siempre debajo de la mesa. */}
                <div className='table-caption' style={{ top: `${captionTop}px` }}>
                    <span className='table-caption-name'>{table.name || 'Sin nombre'}</span>
                    <span className='table-caption-count'>{occupiedChairs}/{table.size}</span>
                </div>
            </div>
    )
}
