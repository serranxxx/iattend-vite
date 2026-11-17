import React, { useEffect, useRef, useState } from 'react'
import './dynamic-table.css'
import { Button } from 'antd'
import { Lock } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { anguloDe, cajaGirada, clampToCanvas, getTableFootprint } from './seatingGeometry'
import { MESA_MAPA, inicialesDe, posicionesSillas } from './sillas'

// La silla libre (data-silla-libre) más cercana a un punto de la pantalla.
const sillaMasCercana = (contenedor, x, y) => {
    let mejor = null
    let distancia = Infinity
    contenedor.querySelectorAll('[data-silla-libre]').forEach((el) => {
        const r = el.getBoundingClientRect()
        const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y)
        if (d < distancia) { distancia = d; mejor = Number(el.dataset.sillaLibre) }
    })
    return mejor
}

export const DynamicTable = ({
    onSelectedTable,
    setOnSelectedTable,
    table,
    onMoving,
    setSelectedTable,
    onEditPosition,
    setOnViewTable,
    occupiedChairs,
    // Quién está en cada asiento (índice 0 = asiento 1; asientos.js). Sin él,
    // se pintan ocupadas las primeras `occupiedChairs`.
    asientos = null,
    // Mientras se arrastra un invitado sin mesa desde la lista de la derecha:
    // las sillas libres lo reciben (y la mesa, en la primera libre).
    // `onSoltarInvitado(table, asiento | null)`.
    recibeInvitado = false,
    onSoltarInvitado,
    onGrab,
    vertical = false,
    // Giro libre en grados (tables.rotation), sumado a `vertical`.
    rotation = 0,
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
    // Silla (o 'mesa') bajo el invitado que se arrastra.
    const [destino, setDestino] = useState(null)
    useEffect(() => { if (!recibeInvitado) setDestino(null) }, [recibeInvitado])

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

    // Sillas alrededor de la mesa: la misma geometría que la vista previa del
    // panel (sillas.js), así la silla N es la misma en los dos.
    useEffect(() => {
        if (shape === 'dance') { setChairs([]); return }
        const containerWidth = shape === 'rectangle' ? 400 : 200
        const containerHeight = 200
        const ocupada = (i) => (asientos ? Boolean(asientos[i]) : i < occupiedChairs)
        const medidas = MESA_MAPA[shape] ?? MESA_MAPA.round
        setChairs(posicionesSillas(shape, table.size ?? 0, medidas).map(([dx, dy], i) => ({
            id: i + 1,
            x: containerWidth / 2 + dx,
            y: containerHeight / 2 + dy,
            occupied: ocupada(i),
        })))
    }, [table, occupiedChairs, shape, asientos])

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
            // Un segundo dedo es pellizco (zoom del mapa), no arrastre: se
            // suelta sin guardar y la mesa (o el grupo) vuelve a su lugar.
            if (event.touches?.length > 1) {
                hasDraggedRef.current = false
                document.body.classList.remove('seating-dragging')
                setDragPos(null)
                if (isMultiSelected) onGroupDragMove?.({ x: 0, y: 0 })
                setIsDragging(false)
                return
            }
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
                    setDragPos(clampToCanvas(origin.x + totalX, origin.y + totalY, shape, vertical, rotation))
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
    }, [isDragging, zoomLevel, table.id, shape, vertical, rotation, onDragCommit, isMultiSelected, onGroupDragMove, onGroupDragEnd])

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
    // Giro total (vertical + rotation) y la caja que ocupa la mesa girada.
    const angulo = anguloDe({ vertical, rotation })
    const girada = cajaGirada(footprint.width, footprint.height, angulo, { redonda: shape === 'round' })
    const contraGiro = angulo ? `rotate(${-angulo}deg)` : ''
    const visualHeight = girada.height * 0.7
    const captionTop = girada.height / 2 + visualHeight / 2 + 10

    const groupDx = isMultiSelected && groupOffset ? groupOffset.x : 0
    const groupDy = isMultiSelected && groupOffset ? groupOffset.y : 0

    // La caja del DOM debe medir lo que la mesa OCUPA de verdad. Una vertical
    // gira 90° alrededor de su centro, así que su caja es el footprint con los
    // lados intercambiados y desplazada para conservar ese centro; sin esto,
    // una vertical arrastraba una caja horizontal de 400px que generaba huecos
    // sin sentido al alinear y al chocar.
    const boundW = girada.width
    const boundH = girada.height
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
                className={`dynamic-container ${isMultiSelected ? 'multi-selected' : ''} ${recibeInvitado ? 'recibe-invitado' : ''} ${destino != null ? 'recibe-encima' : ''}`}
                // Arrastrando un invitado sobre la mesa: se marca la silla libre
                // MÁS CERCANA al cursor y ahí cae al soltar. Las sillas en el
                // mapa miden ~14 px con zoom: atinarle exacto no debe hacer falta.
                onDragOver={recibeInvitado ? (e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    const cerca = sillaMasCercana(e.currentTarget, e.clientX, e.clientY)
                    if (cerca !== destino) setDestino(cerca)
                } : undefined}
                onDragLeave={recibeInvitado ? (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDestino(null) } : undefined}
                onDrop={recibeInvitado ? (e) => {
                    e.preventDefault()
                    const silla = sillaMasCercana(e.currentTarget, e.clientX, e.clientY) ?? destino
                    setDestino(null)
                    onSoltarInvitado?.(table, typeof silla === 'number' ? silla : null)
                } : undefined}
            >
                <div
                    className='table-rotor'
                    style={{
                        width: `${footprint.width}px`,
                        height: `${footprint.height}px`,
                        marginLeft: `${-footprint.width / 2}px`,
                        marginTop: `${-footprint.height / 2}px`,
                        transform: `scale(0.7) ${angulo ? `rotate(${angulo}deg)` : ''}`,
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
                            style={{ transform: contraGiro }}
                        >#{table.number}</span>
                    </div>

                    {chairs.map((chair) => (
                        <div
                            key={chair.id}
                            className={`chair ${chair.occupied ? 'occupied' : 'available'} ${onMoving ? 'moving-table' : ''} ${recibeInvitado && !chair.occupied ? 'chair-destino' : ''} ${destino === chair.id ? 'chair-encima' : ''}`}
                            data-silla-libre={recibeInvitado && !chair.occupied ? chair.id : undefined}
                            title={asientos?.[chair.id - 1] ? `Asiento ${chair.id} · ${asientos[chair.id - 1].name}` : `Asiento ${chair.id} · libre`}
                            style={{
                                left: `${chair.x}px`,
                                top: `${chair.y}px`,
                                backgroundColor: isRepeated ? '#ff4d4f30' : isSelected ? 'var(--brand-color-100)' : undefined,
                                border: isRepeated ? '2px solid #ff4d4f' : isSelected ? '2px solid var(--brand-color-500)' : undefined,
                            }}
                        >
                            {/* Ocupada: las iniciales de quien está ahí; libre: su número. */}
                            <span
                                className={asientos?.[chair.id - 1] ? 'chair-iniciales' : undefined}
                                style={{ transform: contraGiro }}
                            >
                                {asientos?.[chair.id - 1] ? inicialesDe(asientos[chair.id - 1].name) : chair.id}
                            </span>
                        </div>
                    ))}

                    {/* El candado va sobre el contenedor, no bajo la mesa, para
                        que se lea igual con la mesa rotada. */}
                    {table.locked && (
                        <div className='table-lock-badge' style={{ transform: contraGiro || undefined }}>
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
