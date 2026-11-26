import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Lock, X } from 'lucide-react'
import { Trans } from 'react-i18next'
import { LIA_CHAT_STATE_EVENT } from '../../../components/ChatContainer/ChatContainer'
import s from './Upsell.module.css'

/*
  Burbuja de Lia del upsell, a la izquierda del orbe que ya flota en todo
  /dashboard/* (ChatContainer, fijo a 24 px de la esquina, 60 px). No se
  dibuja otro orbe: solo la burbuja y un candado verde sobre el orbe. Tocarla
  abre el comparador en "Lia"; se esconde con el chat abierto y la ✕ la quita
  por la sesión (`iattend_upsell_lia_cerrada`).
*/
const CLAVE = 'iattend_upsell_lia_cerrada'

export const BurbujaLia = ({ plan, onComparar }) => {
    const [chatAbierto, setChatAbierto] = useState(false)
    const [cerrada, setCerrada] = useState(() => {
        try { return sessionStorage.getItem(CLAVE) === '1' } catch { return false }
    })

    useEffect(() => {
        const alCambiar = (e) => setChatAbierto(!!e.detail?.open)
        window.addEventListener(LIA_CHAT_STATE_EVENT, alCambiar)
        return () => window.removeEventListener(LIA_CHAT_STATE_EVENT, alCambiar)
    }, [])

    if (chatAbierto) return null

    const cerrar = (e) => {
        e.stopPropagation()
        setCerrada(true)
        try { sessionStorage.setItem(CLAVE, '1') } catch { /* sin storage */ }
    }

    return createPortal(
        <>
            <span className={s.liaCandado} aria-hidden><Lock size={12} strokeWidth={2.6} /></span>
            {!cerrada && (
                <div className={s.liaBurbuja} role='button' tabIndex={0} onClick={() => onComparar({ funcion: 'lia' })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onComparar({ funcion: 'lia' }) } }}>
                    <span>
                        <Trans i18nKey={plan === 'paperless' ? 'upsell.lia_bubble_paperless' : 'upsell.lia_bubble_lite'} components={{ b: <b /> }} />
                    </span>
                    <button type='button' className={s.liaBurbujaCerrar} onClick={cerrar} aria-label='✕'>
                        <X size={12} />
                    </button>
                </div>
            )}
        </>,
        document.body,
    )
}

export default BurbujaLia
