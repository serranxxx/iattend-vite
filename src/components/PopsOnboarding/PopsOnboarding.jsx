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

export const PopsOnboarding = ({ open, onClose, onCrear }) => {
    const { t } = useTranslation()
    const video = useRef(null)
    const [terminado, setTerminado] = useState(false)
    const [enPausa, setEnPausa] = useState(false)

    useEffect(() => {
        if (!open) return
        try { localStorage.setItem(POPS_ONBOARDING_VISTO, '1') } catch { /* sin storage */ }
        setTerminado(false)
        setEnPausa(sinMovimiento())
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
                        autoPlay={!sinMovimiento()}
                        muted
                        playsInline
                        preload='auto'
                        poster={POSTER}
                        onEnded={() => setTerminado(true)}
                        onTimeUpdate={(e) => {
                            const v = e.currentTarget
                            if (!terminado && v.duration && v.currentTime >= v.duration - CIERRE_SEG) setTerminado(true)
                        }}
                        // Safari a veces bloquea el autoplay: queda el botón de play.
                        onCanPlay={(e) => { if (e.currentTarget.paused && !terminado) setEnPausa(true) }}
                        onPlay={() => setEnPausa(false)}
                    >
                        <source src={VIDEO_WEBM} type='video/webm' />
                        <source src={VIDEO_MP4} type='video/mp4' />
                    </video>
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
