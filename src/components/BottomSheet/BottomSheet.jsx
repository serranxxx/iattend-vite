import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import styles from './BottomSheet.module.css'

/**
 * Hoja inferior propia (no el Drawer de Ant Design).
 *
 * Sin máscara: el fondo se sigue viendo y se puede tocar sin que la hoja se
 * cierre —tocar la pieza cambia de panel, no la esconde—. Para cerrarla:
 * arrastrar hacia abajo, el botón de cerrar o Escape.
 *
 * Va en un portal al `body` a propósito: el editor móvil vive en un
 * contenedor `position: fixed`, que crea su propio contexto de apilamiento y
 * dejaba la hoja por debajo de las notificaciones de Lia (z-index 1150) —se
 * veía, pero las tarjetas se comían los toques del contenido.
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
    const bodyRef = useRef(null)
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

    // Cada panel arranca desde arriba. La hoja se queda montada y solo cambia
    // de contenido, así que el scroll del panel anterior se heredaba.
    useEffect(() => {
        if (open && bodyRef.current) bodyRef.current.scrollTop = 0
    }, [open, title])

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

    return createPortal(
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

            <div ref={bodyRef} className={`${styles.body} ${bodyClass} scroll-invitation`}>
                {children}
            </div>
        </div>,
        document.body
    )
}

export default BottomSheet
