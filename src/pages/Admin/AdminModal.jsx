/*
  Modal del panel de administración.

  Reemplaza al `Modal` de Ant Design en estas pantallas: los suyos traen su
  propio sistema de tokens, tipografías y radios, y quedaban como un injerto
  dentro del panel. Este usa los `--ac-*` de la marca y el mismo lenguaje de
  botones que el resto.

  Lo que sí hay que resolver a mano cuando uno se construye su propio modal:

  · Escape cierra, y el foco se manda al panel al abrir para que el lector de
    pantalla no se quede leyendo la página de atrás.
  · El scroll del fondo se bloquea mientras está abierto; si no, la rueda mueve
    la página en vez del modal.
  · El clic en el telón cierra, pero solo si empezó ahí: arrastrar una selección
    de texto desde adentro y soltar afuera no debe cerrar nada.
*/

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import styles from './AdminModal.module.css'

export const AdminModal = ({
    open,
    onClose,
    title,
    children,
    footer,
    width = 420,
    // Acciones estándar. Con `onConfirm` se dibuja el pie de Cancelar/Aceptar;
    // sin él, el modal se queda solo con su contenido.
    onConfirm,
    confirmLabel = 'Guardar',
    cancelLabel = 'Cancelar',
    confirmDisabled = false,
    loading = false,
}) => {
    const panelRef = useRef(null)
    const telonRef = useRef(null)

    useEffect(() => {
        if (!open) return

        const alTeclear = (evento) => {
            if (evento.key === 'Escape') onClose?.()
        }

        const overflowPrevio = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        document.addEventListener('keydown', alTeclear)
        panelRef.current?.focus()

        return () => {
            document.body.style.overflow = overflowPrevio
            document.removeEventListener('keydown', alTeclear)
        }
    }, [open, onClose])

    if (!open) return null

    // Solo cierra si el gesto empezó y terminó en el telón.
    const alSoltarEnElTelon = (evento) => {
        if (evento.target === telonRef.current && telonRef.current?.dataset.desdeAqui === 'si') onClose?.()
        if (telonRef.current) telonRef.current.dataset.desdeAqui = 'no'
    }

    return createPortal(
        <div
            className={styles.telon}
            ref={telonRef}
            onMouseDown={(evento) => {
                if (evento.target === telonRef.current) telonRef.current.dataset.desdeAqui = 'si'
            }}
            onMouseUp={alSoltarEnElTelon}
        >
            <div
                className={styles.panel}
                style={{ width }}
                role='dialog'
                aria-modal='true'
                aria-label={typeof title === 'string' ? title : 'Ventana'}
                tabIndex={-1}
                ref={panelRef}
            >
                {title && (
                    <header className={styles.cabecera}>
                        <h2 className={styles.titulo}>{title}</h2>
                        <button type='button' aria-label='Cerrar' className={styles.cerrar} onClick={onClose}>
                            <X size={16} />
                        </button>
                    </header>
                )}

                {!title && (
                    <button
                        type='button'
                        aria-label='Cerrar'
                        className={`${styles.cerrar} ${styles.cerrarSuelto}`}
                        onClick={onClose}
                    >
                        <X size={16} />
                    </button>
                )}

                <div className={`${styles.cuerpo} ${title ? '' : styles.cuerpoSinCabecera}`}>
                    {children}
                </div>

                {footer !== undefined ? footer : onConfirm && (
                    <footer className={styles.pie}>
                        <button type='button' className={styles.btnSecundario} onClick={onClose}>
                            {cancelLabel}
                        </button>
                        <button
                            type='button'
                            className={styles.btnPrimario}
                            onClick={onConfirm}
                            disabled={confirmDisabled || loading}
                        >
                            {loading ? 'Guardando…' : confirmLabel}
                        </button>
                    </footer>
                )}
            </div>
        </div>,
        document.body,
    )
}
