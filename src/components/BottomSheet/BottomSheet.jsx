import React, { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import styles from './BottomSheet.module.css'

/**
 * Hoja inferior propia (no el Drawer de Ant Design).
 *
 * Sin máscara: el fondo se sigue viendo y se puede tocar sin que la hoja se
 * cierre —tocar la pieza cambia de panel, no la esconde—. Para cerrarla:
 * arrastrar hacia abajo, el botón de cerrar o Escape.
 */

const CLOSE_DISTANCE = 90   // px arrastrados para que se cierre

export const BottomSheet = ({
    open,
    onClose,
    title,
    extra = null,
    children,
    maxHeight = '52%',
    bodyClass = '',
    onHeightChange = null,
}) => {

    const sheetRef = useRef(null)
    const dragStartRef = useRef(null)
    const [dragY, setDragY] = useState(0)
    const [dragging, setDragging] = useState(false)

    useEffect(() => {
        if (!open) return
        const onKey = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onClose])

    useEffect(() => {
        if (!open) { setDragY(0); setDragging(false); dragStartRef.current = null }
    }, [open])

    // Reporta su alto (quien la use puede subir el contenido de atrás)
    useEffect(() => {
        if (!onHeightChange) return
        const el = sheetRef.current
        if (!el) return onHeightChange(0)
        // Solo cambios reales: cada reporte reinicia la transición del
        // contenido de atrás, y los micro-ajustes se sentían a saltos.
        let last = -1
        const report = () => {
            const next = open ? Math.round(el.offsetHeight) : 0
            if (Math.abs(next - last) < 4) return
            last = next
            onHeightChange(next)
        }
        report()
        const ro = new ResizeObserver(report)
        ro.observe(el)
        return () => ro.disconnect()
    }, [open, onHeightChange])

    const startDrag = (e) => {
        dragStartRef.current = e.clientY
        setDragging(true)
        // el capture mantiene el arrastre aunque el dedo salga de la cabecera
        try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* puntero ya liberado */ }
    }

    const moveDrag = (e) => {
        if (dragStartRef.current == null) return
        setDragY(Math.max(0, e.clientY - dragStartRef.current))
    }

    const endDrag = () => {
        if (dragStartRef.current == null) return
        dragStartRef.current = null
        setDragging(false)
        if (dragY > CLOSE_DISTANCE) onClose()
        setDragY(0)
    }

    return (
        <div
            ref={sheetRef}
            className={`${styles.sheet} ${open ? styles.open : ''}`}
            style={{
                maxHeight,
                transform: open ? `translateY(${dragY}px)` : 'translateY(100%)',
                transition: dragging ? 'none' : undefined,
            }}
            role='dialog'
            aria-modal='false'
            aria-hidden={!open}
        >
            {/* Zona de arrastre: el handle y toda la cabecera */}
            <div
                className={styles.grabber}
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
            >
                <span className={styles.handle} />

                <div className={styles.head}>
                    <span className={styles.title}>{title}</span>
                    <div className={styles.headActions}>
                        {extra}
                        <button className={styles.close} onClick={onClose} aria-label='Cerrar'>
                            <X size={15} />
                        </button>
                    </div>
                </div>
            </div>

            <div className={`${styles.body} ${bodyClass} scroll-invitation`}>
                {children}
            </div>
        </div>
    )
}

export default BottomSheet
