import React, { useEffect, useRef, useState } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import BottomSheet from '../BottomSheet/BottomSheet'
import styles from './WhenToSend.module.css'

/**
 * "¿Cuándo enviar?" — abre la herramienta de iattend.events dentro de un
 * iframe, sin sacar a la persona del editor.
 *
 * En escritorio es un popover anclado al botón; en móvil el botón es solo el
 * icono y el contenido entra en la hoja inferior (misma que los paneles del
 * editor), porque un popover de 420px no cabe.
 */

const EVENTS_URL = import.meta.env.VITE_IATTEND_EVENTS_URL || 'https://www.iattend.events'
// Variante embebida: mismo cálculo, encabezado del save the date y sin CTA
const TOOL_URL = new URL('/envio-invitacion/save-the-date', EVENTS_URL).toString()

export const WhenToSend = ({ compact = false, className = '' }) => {

    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const wrapRef = useRef(null)

    // Fuera del popover se cierra (en móvil lo maneja la hoja)
    useEffect(() => {
        if (!open || compact) return
        const onPointerDown = (e) => {
            if (wrapRef.current?.contains(e.target)) return
            setOpen(false)
        }
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
        const id = setTimeout(() => document.addEventListener('pointerdown', onPointerDown), 0)
        window.addEventListener('keydown', onKey)
        return () => {
            clearTimeout(id)
            document.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('keydown', onKey)
        }
    }, [open, compact])

    const frame = (
        <iframe
            src={TOOL_URL}
            title={t('savethedate.when_to_send')}
            className={styles.frame}
            loading='lazy'
        />
    )

    if (compact) {
        return (
            <>
                <button
                    className={className || styles.iconBtn}
                    onClick={() => setOpen(true)}
                    aria-label={t('savethedate.when_to_send')}
                >
                    <HelpCircle size={17} />
                </button>

                <BottomSheet
                    open={open}
                    onClose={() => setOpen(false)}
                    title={t('savethedate.when_to_send')}
                    maxHeight='88%'
                    bodyClass={styles.sheetBody}
                >
                    {open && frame}
                </BottomSheet>
            </>
        )
    }

    return (
        <span ref={wrapRef} className={styles.wrap}>
            <button className={styles.trigger} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
                <HelpCircle size={16} />
                {t('savethedate.when_to_send')}
            </button>

            {open &&
                <div className={styles.panel} role='dialog' aria-label={t('savethedate.when_to_send')}>
                    <div className={styles.panelHead}>
                        <span className={styles.panelTitle}>{t('savethedate.when_to_send')}</span>
                        <button className={styles.close} onClick={() => setOpen(false)} aria-label={t('savethedate.close')}>
                            <X size={15} />
                        </button>
                    </div>
                    {frame}
                </div>
            }
        </span>
    )
}

export default WhenToSend
