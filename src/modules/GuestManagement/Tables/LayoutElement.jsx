import React, { useEffect, useRef, useState } from 'react'
import { Button } from 'antd'
import styles from './LayoutElement.module.css'

const CANVAS_WIDTH = 3500
const CANVAS_HEIGHT = 1800

/**
 * Elemento del salón en el mapa (§3.5): entrada, baños, barra, DJ.
 *
 * Se dibuja como un bloque punteado para que se lea distinto de una mesa —
 * no cuenta lugares y no se numera. El drag replica el de DynamicTable en vez
 * de compartir helper, igual que ya hacen TablesPage y DynamicTable entre sí.
 */
export const LayoutElement = ({ element, zoomLevel = 1, snapToGrid, gridStep = 20, onMove, onDelete }) => {
    const [position, setPosition] = useState({ x: element.x, y: element.y })
    const [isDragging, setIsDragging] = useState(false)
    const [showMenu, setShowMenu] = useState(false)

    const positionRef = useRef(position)
    const lastMouseRef = useRef({ x: 0, y: 0 })
    const startPosRef = useRef({ x: 0, y: 0 })
    const hasDraggedRef = useRef(false)
    const wasDragRef = useRef(false)
    const containerRef = useRef(null)

    const DRAG_THRESHOLD = 5

    useEffect(() => { positionRef.current = position }, [position])
    useEffect(() => { setPosition({ x: element.x, y: element.y }) }, [element])

    const clamp = (x, y) => ({
        x: Math.min(Math.max(x, 0), CANVAS_WIDTH - element.width),
        y: Math.min(Math.max(y, 0), CANVAS_HEIGHT - element.height),
    })

    const startDrag = (event) => {
        if (element.locked) return
        event.stopPropagation()
        const pos = event.touches ? event.touches[0] : event
        lastMouseRef.current = { x: pos.clientX, y: pos.clientY }
        startPosRef.current = { x: pos.clientX, y: pos.clientY }
        hasDraggedRef.current = false
        setIsDragging(true)
    }

    useEffect(() => {
        if (!isDragging) return

        const onMouseMove = (event) => {
            const pos = event.touches ? event.touches[0] : event
            const dx = pos.clientX - startPosRef.current.x
            const dy = pos.clientY - startPosRef.current.y

            if (!hasDraggedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
                hasDraggedRef.current = true
            }

            if (hasDraggedRef.current) {
                if (event.cancelable) event.preventDefault()
                const deltaX = (pos.clientX - lastMouseRef.current.x) / zoomLevel
                const deltaY = (pos.clientY - lastMouseRef.current.y) / zoomLevel
                setPosition(prev => clamp(prev.x + deltaX, prev.y + deltaY))
            }

            lastMouseRef.current = { x: pos.clientX, y: pos.clientY }
        }

        const onStop = () => {
            setIsDragging(false)
            if (!hasDraggedRef.current) return
            wasDragRef.current = true

            let { x, y } = positionRef.current
            if (snapToGrid) {
                const snapped = clamp(
                    Math.round(x / gridStep) * gridStep,
                    Math.round(y / gridStep) * gridStep
                )
                x = snapped.x
                y = snapped.y
                setPosition({ x, y })
            }
            onMove?.(element.id, { x, y })
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onStop)
        document.addEventListener('touchmove', onMouseMove, { passive: false })
        document.addEventListener('touchend', onStop)

        return () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onStop)
            document.removeEventListener('touchmove', onMouseMove)
            document.removeEventListener('touchend', onStop)
        }
    }, [isDragging, zoomLevel, snapToGrid, gridStep, element.id, element.width, element.height])

    useEffect(() => {
        if (!showMenu) return
        const handleOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setShowMenu(false)
        }
        document.addEventListener('mousedown', handleOutside)
        return () => document.removeEventListener('mousedown', handleOutside)
    }, [showMenu])

    const handleClick = () => {
        if (wasDragRef.current) { wasDragRef.current = false; return }
        setShowMenu(prev => !prev)
    }

    return (
        <div
            ref={containerRef}
            onClick={handleClick}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            style={{
                position: 'absolute',
                top: `${position.y}px`,
                left: `${position.x}px`,
                transform: `scale(0.7) ${element.rotation ? `rotate(${element.rotation}deg)` : ''}`,
                cursor: element.locked ? 'default' : isDragging ? 'grabbing' : 'pointer',
            }}
        >
            <div
                className={styles.element}
                style={{ width: `${element.width}px`, height: `${element.height}px` }}
            >
                <span className={styles.label}>{element.label || element.type}</span>

                {showMenu && (
                    <div className={styles.overlay}>
                        <Button
                            danger
                            style={{ borderRadius: '99px' }}
                            onClick={(e) => { e.stopPropagation(); onDelete?.(element.id); setShowMenu(false) }}
                        >
                            Eliminar
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
