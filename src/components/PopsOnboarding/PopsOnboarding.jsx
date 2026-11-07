import { useEffect, useRef, useState } from 'react'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { Play, RotateCcw } from 'lucide-react'
import styles from './PopsOnboarding.module.css'

/**
 * "Conoce los Pops" (handoff "Video Promo Pops → Onboarding", opción A): el
 * video promocional (34 s, 4:3, 1440 × 1080) en un modal, con Saltar arriba
 * y, al terminar, Repetir + Send a Pop. Con reducir movimiento no se
 * reproduce solo: póster y botón de play. Al abrirlo queda marcado como
 * visto (`localStorage` pops_onboarding_seen = "1").
 *
 * Archivos en public/assets/onboarding/: pops-onboarding.webm (VP9),
 * pops-onboarding.mp4 (H.264) y pops-poster.jpg, renderizados cuadro por
 * cuadro del prototipo del handoff.
 */

const VIDEO_WEBM = '/assets/onboarding/pops-onboarding.webm'
const VIDEO_MP4 = '/assets/onboarding/pops-onboarding.mp4'
const POSTER = '/assets/onboarding/pops-poster.jpg'
export const POPS_ONBOARDING_VISTO = 'pops_onboarding_seen'
// Segundos antes del final en que salen Repetir y Send a Pop: el cierre con
// el logo "Pops by iattend" (escena Logo, 3.2 s) ya está en pantalla.
const CIERRE_SEG = 2.6

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Arranque sin tirones: el video (5 MB) no se reproduce en cuanto llegan los
// primeros cuadros, sino cuando el navegador cree que puede seguir sin parar
// (canplaythrough) o ya tiene ~4 s cargados, y nunca antes de que termine la
// animación de entrada del modal. Mientras, póster con un loader. Si la red
// es muy lenta, a los 8 s arranca de todos modos.
const BUFFER_SEG = 4
const ESPERA_MAX_MS = 8000
const ENTRADA_MS = 350

export const PopsOnboarding = ({ open, onClose, onCrear }) => {
    const { t } = useTranslation()
    const video = useRef(null)
    const [terminado, setTerminado] = useState(false)
    const [enPausa, setEnPausa] = useState(false)
    const [cargando, setCargando] = useState(false)
    const arrancado = useRef(false)

    useEffect(() => {
        if (!open) return undefined
        try { localStorage.setItem(POPS_ONBOARDING_VISTO, '1') } catch { /* sin storage */ }
        setTerminado(false)
        arrancado.current = false
        if (sinMovimiento()) {
            setEnPausa(true)
            setCargando(false)
            return undefined
        }
        setEnPausa(false)
        setCargando(true)
        const abierto = Date.now()
        let vigente = true
        // Arranca una sola vez: con buffer suficiente y el modal ya abierto.
        const arrancar = () => {
            if (!vigente || arrancado.current) return
            const v = video.current
            if (!v) return
            arrancado.current = true
            const resta = Math.max(0, ENTRADA_MS - (Date.now() - abierto))
            setTimeout(() => {
                if (!vigente) return
                setCargando(false)
                v.play().catch(() => setEnPausa(true))
            }, resta)
        }
        const revisar = () => {
            const v = video.current
            if (!v) return
            const buffer = v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0
            if (v.readyState >= 4 || buffer >= Math.min(BUFFER_SEG, v.duration || BUFFER_SEG)) arrancar()
        }
        // El video del modal puede montarse un momento después: se espera.
        let v = null
        const escuchar = () => {
            v = video.current
            if (!v) return false
            v.addEventListener('canplaythrough', arrancar)
            v.addEventListener('progress', revisar)
            v.addEventListener('loadeddata', revisar)
            revisar()
            return true
        }
        let intentos = 0
        const montaje = escuchar() ? null : setInterval(() => {
            if (escuchar() || ++intentos > 40) clearInterval(montaje)
        }, 50)
        const limite = setTimeout(arrancar, ESPERA_MAX_MS)
        return () => {
            vigente = false
            clearTimeout(limite)
            if (montaje) clearInterval(montaje)
            v?.removeEventListener('canplaythrough', arrancar)
            v?.removeEventListener('progress', revisar)
            v?.removeEventListener('loadeddata', revisar)
        }
    }, [open])

    const reproducir = () => {
        const v = video.current
        if (!v) return
        setEnPausa(false)
        v.play().catch(() => setEnPausa(true))
    }

    const repetir = () => {
        if (video.current) video.current.currentTime = 0
        setTerminado(false)
        reproducir()
    }

    const crear = () => { onClose(); onCrear?.() }

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            closable={false}
            centered
            destroyOnHidden
            // El video es 4:3: el ancho también se limita por el alto que cabe
            // (cabeza + pie + márgenes ≈ 190 px), para no salirse en pantallas bajas.
            width='min(960px, calc(100vw - 24px), calc((100dvh - 190px) * 4 / 3 + 36px))'
            styles={{ container: { padding: 0, borderRadius: 32, overflow: 'hidden' }, body: { padding: 0 } }}
        >
            <div className={styles.panel}>
                <div className={styles.cabeza}>
                    <span className={styles.titulo}>{t('pops_onboarding.title')}</span>
                    <button type='button' className={styles.saltar} onClick={onClose}>
                        {terminado ? t('pops_onboarding.close') : t('pops_onboarding.skip')}
                    </button>
                </div>

                <div className={styles.marco}>
                    <video
                        ref={video}
                        className={styles.video}
                        muted
                        playsInline
                        preload='auto'
                        poster={POSTER}
                        onEnded={() => setTerminado(true)}
                        onTimeUpdate={(e) => {
                            const v = e.currentTarget
                            if (!terminado && v.duration && v.currentTime >= v.duration - CIERRE_SEG) setTerminado(true)
                        }}
                        onPlay={() => { setEnPausa(false); setCargando(false) }}
                        // Si se queda sin buffer a medio camino, vuelve el loader.
                        onWaiting={() => { if (arrancado.current) setCargando(true) }}
                        onPlaying={() => setCargando(false)}
                    >
                        <source src={VIDEO_WEBM} type='video/webm' />
                        <source src={VIDEO_MP4} type='video/mp4' />
                    </video>
                    {cargando && !enPausa && (
                        <div className={styles.cargando} role='status' aria-live='polite'>
                            <span className={styles.spinner} aria-hidden />
                            <span>{t('pops_onboarding.loading')}</span>
                        </div>
                    )}
                    {enPausa && !terminado && (
                        <button type='button' className={styles.play} onClick={reproducir} aria-label={t('pops_onboarding.play')}>
                            <Play size={30} fill='currentColor' />
                        </button>
                    )}
                    {/* Al terminar: sobre el video, abajo a la izquierda. */}
                    {terminado && (
                        <div className={styles.pie}>
                            <button type='button' className={styles.repetir} onClick={repetir}>
                                <RotateCcw size={16} /> {t('pops_onboarding.replay')}
                            </button>
                            {onCrear && (
                                <button type='button' className={styles.crear} onClick={crear}>
                                    <span className={styles.mas}>+</span>{t('pops_section.send')}
                                </button>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </Modal>
    )
}

export default PopsOnboarding
