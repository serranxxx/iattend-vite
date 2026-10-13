import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import styles from './AvisoTraducciones.module.css'

const MARGEN = 12

// Aviso antes de guardar el español cuando hay traducciones: los textos
// cambiaron y las traducciones quedarán atrasadas. Va anclado al botón que
// disparó el guardado (si no hay, abajo al centro, donde vive la tarjeta de
// Lia). Clic fuera o Escape cancela; Enter confirma.
export const AvisoTraducciones = ({ open, ancla, modo, onConfirmar, onCancelar }) => {
    const { t } = useTranslation()
    const ref = useRef(null)
    const [pos, setPos] = useState(null)
    const [guardando, setGuardando] = useState(false)

    useLayoutEffect(() => {
        if (!open) return
        const colocar = () => {
            const caja = ref.current?.getBoundingClientRect()
            const r = ancla?.isConnected ? ancla.getBoundingClientRect() : null
            if (!caja || !r) return setPos(null)
            const abajo = r.bottom + MARGEN + caja.height <= window.innerHeight
            const top = abajo ? r.bottom + MARGEN : r.top - MARGEN - caja.height
            const left = Math.min(Math.max(MARGEN, r.right - caja.width), window.innerWidth - caja.width - MARGEN)
            setPos({ top, left })
        }
        colocar()
        window.addEventListener('resize', colocar)
        return () => window.removeEventListener('resize', colocar)
    }, [open, ancla])

    const confirmar = async () => {
        if (guardando) return
        setGuardando(true)
        try {
            await onConfirmar()
        } finally {
            setGuardando(false)
        }
    }

    useEffect(() => {
        if (!open) return
        const fuera = (e) => {
            if (ref.current?.contains(e.target) || ancla?.contains(e.target)) return
            onCancelar()
        }
        const teclas = (e) => {
            if (e.key === 'Escape') onCancelar()
            if (e.key === 'Enter') { e.preventDefault(); confirmar() }
        }
        document.addEventListener('mousedown', fuera)
        document.addEventListener('keydown', teclas)
        return () => {
            document.removeEventListener('mousedown', fuera)
            document.removeEventListener('keydown', teclas)
        }
    }, [open, ancla, onCancelar])

    if (!open) return null

    return createPortal(
        <div
            ref={ref}
            role="alertdialog"
            aria-labelledby="aviso-traducciones-titulo"
            className={`${styles.aviso} ${pos ? '' : styles.centrado}`}
            style={pos ?? undefined}
        >
            <span className={styles.icono}><Languages size={18} /></span>
            <div className={styles.cuerpo}>
                <strong id="aviso-traducciones-titulo">{t('buttons_menu.translations_title')}</strong>
                <span>{t('buttons_menu.translations_desc')}</span>
                <div className={styles.acciones}>
                    <Button onClick={onCancelar} disabled={guardando}>{t('buttons_menu.translations_cancel')}</Button>
                    <Button className="primarybutton--active" loading={guardando} onClick={confirmar} autoFocus>
                        {modo === 'write' ? t('buttons_menu.translations_write') : t('buttons_menu.translations_publish')}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    )
}
