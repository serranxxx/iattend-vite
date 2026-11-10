import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import styles from './ComprarPage.module.css'

// /comprar/:clave — link propio para vender sin Payment Links (se comparte en
// WhatsApp o Instagram). Pide al backend una Checkout Session del producto
// (GET /api/comprar/:clave, iattend--backend/router/comprar.js: cantidad 1 y
// meses según el producto) y manda a Stripe. Stripe regresa aquí con
// `?estado=lista` (gracias: un asesor activa la compra) o `?estado=cancelada`.
export const ComprarPage = () => {
    const { t } = useTranslation()
    const { clave } = useParams()
    const [params] = useSearchParams()
    const estado = params.get('estado')
    // false · 'red' (no se pudo pedir el pago) · 'no_existe' (clave inválida)
    const [error, setError] = useState(false)
    const pedido = useRef(false)

    const irAPagar = useCallback(async () => {
        setError(false)
        try {
            const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/comprar/${encodeURIComponent(clave)}`)
            if (!data?.url) throw new Error('sin url')
            window.location.replace(data.url)
        } catch (e) {
            setError(e?.response?.status === 404 ? 'no_existe' : 'red')
        }
    }, [clave])

    useEffect(() => {
        if (estado || pedido.current) return
        pedido.current = true
        irAPagar()
    }, [estado, irAPagar])

    let icono = <Loader2 className={styles.girando} size={40} />
    let titulo = t('precios.comprar.redirecting')
    let texto = null
    let boton = false
    if (error === 'no_existe') {
        icono = <XCircle size={40} />
        titulo = t('precios.comprar.not_found_title')
        texto = t('precios.comprar.not_found_text')
    } else if (error) {
        icono = <XCircle size={40} />
        titulo = t('precios.comprar.error_title')
        texto = t('precios.comprar.error_text')
        boton = true
    } else if (estado === 'lista') {
        icono = <CheckCircle2 size={40} />
        titulo = t('precios.comprar.thanks_title')
        texto = t('precios.comprar.thanks_text')
    } else if (estado === 'cancelada') {
        icono = <XCircle size={40} />
        titulo = t('precios.comprar.canceled_title')
        texto = t('precios.comprar.canceled_text')
        boton = true
    }

    return (
        <main className={styles.pagina}>
            <div className={styles.tarjeta} data-estado={error ? 'error' : estado || 'cargando'}>
                <img className={styles.logo} src="/images/logo_blue.png" alt="I attend" />
                <span className={styles.icono} aria-hidden>{icono}</span>
                <h1 className={styles.titulo}>{titulo}</h1>
                {texto && <p className={styles.texto}>{texto}</p>}
                {boton && (
                    <button type="button" className={styles.boton} onClick={irAPagar}>
                        {t('precios.comprar.retry')}
                    </button>
                )}
            </div>
        </main>
    )
}
