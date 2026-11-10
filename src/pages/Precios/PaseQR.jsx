import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { QRCode } from 'antd'
import { ArrowUpRight, Copy, X } from 'lucide-react'
import { copiarLink, useFormatoPrecio } from './formatoPrecio'
import styles from './PaseQR.module.css'

const SALIDA_MS = 260

// QR del link de pago al centro de la pantalla, con forma de pase de Wallet
// (como el simulador de modules/Editor/PaseWallet.jsx): la imagen del producto
// grande con el QR encima, el logo y el precio arriba, y en el pie el nombre
// y el plazo. Se cierra con ✕, Esc o tocando fuera.
export const PaseQR = ({ producto, onCerrar }) => {
    const { t } = useTranslation()
    const { precio, plazo, mensualidad, porPop } = useFormatoPrecio(producto)
    const [saliendo, setSaliendo] = useState(false)
    const cerrarRef = useRef(null)

    const cerrar = () => {
        if (saliendo) return
        const sinAnimacion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (sinAnimacion) return onCerrar()
        setSaliendo(true)
        setTimeout(onCerrar, SALIDA_MS)
    }

    useEffect(() => {
        cerrarRef.current?.focus()
        const overflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const onKey = (e) => { if (e.key === 'Escape') cerrar() }
        window.addEventListener('keydown', onKey)
        return () => {
            document.body.style.overflow = overflow
            window.removeEventListener('keydown', onKey)
        }
    }, [])

    return createPortal(
        <div
            className={styles.velo}
            data-saliendo={saliendo || undefined}
            onClick={cerrar}
            role="dialog"
            aria-modal="true"
            aria-label={`${producto.nombre} · QR`}
        >
            <button ref={cerrarRef} type="button" className={styles.cerrar} onClick={cerrar} aria-label={t('precios.close')}>
                <X size={20} />
            </button>

            <div className={styles.contenido} onClick={(e) => e.stopPropagation()}>
                <div className={styles.pase}>
                    <img className={styles.foto} src={producto.imagen} alt="" />
                    <div className={styles.pieFondo} aria-hidden>
                        <img src={producto.imagen} alt="" />
                    </div>

                    <div className={styles.encabezado}>
                        <img className={styles.logo} src="/images/logo_cover.png" alt="I attend" />
                        <div className={styles.precioCaja}>
                            <span className={styles.precioEtiqueta}>{producto.meses ? `HASTA ${producto.meses} PAGOS` : 'TOTAL'}</span>
                            <span className={styles.precio}>{precio}</span>
                        </div>
                    </div>

                    <div className={styles.qr}>
                        <span className={styles.destello} aria-hidden />
                        <QRCode type="svg" value={producto.link} size={240} bordered={false} color="#000000" bgColor="#FFFFFF" errorLevel="M" />
                    </div>

                    <div className={styles.pie}>
                        <span className={styles.nombre}>{producto.nombre}</span>
                        <span className={styles.plazo}>{[plazo, mensualidad].filter(Boolean).join(' · ')}</span>
                        {porPop && <span className={styles.plazo}>{porPop}</span>}
                    </div>
                </div>

                <span className={styles.escanea}>{t('precios.scan')}</span>

                <div className={styles.acciones}>
                    <button type="button" className={styles.boton} onClick={() => copiarLink(producto.link, t)}>
                        <Copy size={18} />
                        {t('precios.copy_link')}
                    </button>
                    <a className={styles.boton} href={producto.link} target="_blank" rel="noopener noreferrer">
                        <ArrowUpRight size={18} />
                        {t('precios.open_link')}
                    </a>
                </div>
            </div>
        </div>,
        document.body
    )
}
