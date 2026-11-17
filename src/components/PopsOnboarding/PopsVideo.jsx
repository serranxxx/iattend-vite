import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, RotateCcw } from 'lucide-react'
import { POPS_ONBOARDING_VISTO } from './PopsOnboarding'
import modal from './PopsOnboarding.module.css'
import styles from './PopsVideo.module.css'

/**
 * El video de "Conoce los Pops" en la página (espacio Pops › Inicio, debajo
 * del encabezado), no en el modal: los mismos archivos y el mismo cierre que
 * PopsOnboarding. Arranca en mudo cuando la mitad está a la vista y se pausa
 * al salir; al terminar, Repetir + Send a Pop sobre el video. Con reducir
 * movimiento no arranca solo: póster y play. `preload='metadata'`: los 5 MB
 * del video se piden hasta que se va a ver. Si el navegador no puede
 * decodificar el WebM (pasa en algunos Chrome: MEDIA_ERR_DECODE a medio
 * cargar), se cambia al MP4 y sigue. `tema`: estilo de Pops, para el color
 * de la etiqueta sobre su fondo.
 */

const VIDEO_WEBM = '/assets/onboarding/pops-onboarding.webm'
const VIDEO_MP4 = '/assets/onboarding/pops-onboarding.mp4'
const POSTER = '/assets/onboarding/pops-poster.jpg'
// Segundos antes del final en que salen Repetir y Send a Pop (el cierre con
// el logo ya está en pantalla), como en el modal.
const CIERRE_SEG = 2.6

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const PopsVideo = ({ onCrear, movil = false, tema = 'pop' }) => {
    const { t } = useTranslation()
    const caja = useRef(null)
    const video = useRef(null)
    const terminadoRef = useRef(false)
    const [terminado, setTerminado] = useState(false)
    const [enPausa, setEnPausa] = useState(true)

    const terminar = (valor) => {
        terminadoRef.current = valor
        setTerminado(valor)
    }

    // Reproduce mientras se ve (y no ha terminado); fuera de la vista, pausa.
    useEffect(() => {
        if (sinMovimiento() || !caja.current) return undefined
        const observador = new IntersectionObserver(([entrada]) => {
            const v = video.current
            if (!v) return
            if (entrada.isIntersecting && !terminadoRef.current) v.play().catch(() => setEnPausa(true))
            else if (!entrada.isIntersecting) v.pause()
        }, { threshold: 0.5 })
        observador.observe(caja.current)
        return () => observador.disconnect()
    }, [])

    // WebM que no se puede decodificar: al MP4, desde donde iba.
    const alFallar = () => {
        const v = video.current
        if (!v || v.currentSrc.endsWith('.mp4')) return
        const desde = v.currentTime
        const seguia = !v.paused
        v.src = VIDEO_MP4
        v.load()
        v.currentTime = desde
        if (seguia || !sinMovimiento()) v.play().catch(() => setEnPausa(true))
    }

    const reproducir = () => {
        const v = video.current
        if (!v) return
        v.play().catch(() => setEnPausa(true))
    }

    const repetir = () => {
        if (video.current) video.current.currentTime = 0
        terminar(false)
        reproducir()
    }

    return (
        <section ref={caja} className={`${styles.bloque} ${movil ? styles.movil : ''}`} data-tema={tema} aria-label={t('pops_onboarding.title')}>
            <span className={styles.titulo}>{t('pops_onboarding.title')}</span>
            <div className={`${modal.marco} ${styles.marco}`}>
                <video
                    ref={video}
                    className={modal.video}
                    muted
                    playsInline
                    preload='metadata'
                    poster={POSTER}
                    onPlay={() => {
                        setEnPausa(false)
                        try { localStorage.setItem(POPS_ONBOARDING_VISTO, '1') } catch { /* sin storage */ }
                    }}
                    onPause={() => setEnPausa(true)}
                    onEnded={() => terminar(true)}
                    onError={alFallar}
                    onTimeUpdate={(e) => {
                        const v = e.currentTarget
                        if (!terminadoRef.current && v.duration && v.currentTime >= v.duration - CIERRE_SEG) terminar(true)
                    }}
                >
                    <source src={VIDEO_WEBM} type='video/webm' />
                    <source src={VIDEO_MP4} type='video/mp4' />
                </video>
                {enPausa && !terminado && (
                    <button type='button' className={modal.play} onClick={reproducir} aria-label={t('pops_onboarding.play')}>
                        <Play size={30} fill='currentColor' />
                    </button>
                )}
                {terminado && (
                    <div className={modal.pie}>
                        <button type='button' className={modal.repetir} onClick={repetir}>
                            <RotateCcw size={16} /> {t('pops_onboarding.replay')}
                        </button>
                        {onCrear && (
                            <button type='button' className={modal.crear} onClick={onCrear}>
                                <span className={modal.mas}>+</span>{t('pops_section.send')}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </section>
    )
}

export default PopsVideo
