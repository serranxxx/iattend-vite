import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import s from './PopsApp.module.css'

/*
  Hoja inferior de la app de Pops en el celular (handoff "App de Pops" §10):
  velo rgba(11,31,58,.45), radio superior de 28 px y asa. Se cierra con el
  velo, el asa o Esc. La usan el menú del avatar / Cuenta, el selector de
  espacio y el aviso de límite (ModalLimite movil).
*/
export const HojaPops = ({ open, onClose, children, etiqueta, className = '' }) => {
    useEffect(() => {
        if (!open) return undefined
        const esc = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', esc)
        // Sin scroll de la página detrás de la hoja.
        const antes = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', esc)
            document.body.style.overflow = antes
        }
    }, [open, onClose])
    if (!open) return null
    return createPortal(
        <div className={s.veloHoja} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className={`${s.hoja} ${className}`} role='dialog' aria-modal='true' aria-label={etiqueta}>
                <button type='button' className={s.asa} onClick={onClose} aria-label={etiqueta} />
                {children}
            </div>
        </div>,
        document.body,
    )
}

export default HojaPops
