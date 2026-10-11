import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { SLIDES } from '../../components/AdsCarousel/adsSlides'
import styles from './PlannerExplore.module.css'

const AVANCE_MS = 6000

/**
 * "Explora I attend" del planner (PlannerLayout): el carrusel de marketing
 * (mismas slides que AdsCarousel; aquí con puntos, flechas y avance cada
 * 6 s) y su invitación de ejemplo (la copia de
 * la plantilla de planners, `is_test`): la tarjeta va sin botones y al lado
 * "Ver invitación" (entra a su dashboard, como "Comenzar") y "Compartir".
 * Los altos van en vh para que toda la sección quepa en pantalla sin scroll.
 */
export const PlannerExplore = ({ ejemplo, renderInvitationCard, onVer, onCompartir }) => {
    const { t } = useTranslation()
    const [activa, setActiva] = useState(0)

    // Cada cambio manual reinicia la cuenta: no salta justo después de un clic.
    useEffect(() => {
        const timer = setTimeout(() => setActiva(i => (i + 1) % SLIDES.length), AVANCE_MS)
        return () => clearTimeout(timer)
    }, [activa])

    const mover = (paso) => setActiva(i => (i + paso + SLIDES.length) % SLIDES.length)

    return (
        <div className={styles.explora}>
            <section className={styles.carrusel} aria-roledescription='carousel' aria-label={t('planner_explore.carousel_label')}>
                {SLIDES.map((slide, i) => (
                    <div
                        key={slide.id}
                        className={`${styles.slide} ${i === activa ? styles.slideActiva : ''}`}
                        aria-hidden={i !== activa}
                    >
                        <img src={slide.img} alt='' className={styles.slideFondo} />
                        <div className={styles.slideTexto}>
                            <span className={styles.slideProducto}>{slide.product}</span>
                            <h2 className={styles.slideTitulo}>{slide.headline}</h2>
                            <p className={styles.slideDesc}>{slide.desc}</p>
                        </div>
                    </div>
                ))}

                <div className={styles.controles}>
                    <div className={styles.puntos}>
                        {SLIDES.map((slide, i) => (
                            <button
                                key={slide.id}
                                type='button'
                                className={`${styles.punto} ${i === activa ? styles.puntoActivo : ''}`}
                                aria-label={slide.product}
                                aria-current={i === activa}
                                onClick={() => setActiva(i)}
                            />
                        ))}
                    </div>
                    <div className={styles.flechas}>
                        <button type='button' className={`${styles.flecha} ${styles.flechaAtras}`} onClick={() => mover(-1)} aria-label={t('planner_explore.prev')}>
                            <ArrowLeft size={18} />
                        </button>
                        <button type='button' className={styles.flecha} onClick={() => mover(1)} aria-label={t('planner_explore.next')}>
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </section>

            {ejemplo && (
                <section className={styles.ejemplo}>
                    <div className={styles.ejemploTarjeta}>{renderInvitationCard(ejemplo, { sinBotones: true })}</div>
                    <div className={styles.ejemploTexto}>
                        <span className={styles.ejemploEtiqueta}>{t('planner_explore.example_label')}</span>
                        <h3 className={styles.ejemploTitulo}>{t('planner_explore.example_title')}</h3>
                        <p className={styles.ejemploDesc}>{t('planner_explore.example_text')}</p>
                        <div className={styles.ejemploBotones}>
                            <button type='button' className={styles.botonPrimario} onClick={onVer}>
                                <ArrowRight size={16} /> {t('planner_explore.view_invitation')}
                            </button>
                            <button type='button' className={styles.botonSecundario} onClick={onCompartir}>
                                {t('planner_explore.share')}
                            </button>
                        </div>
                    </div>
                </section>
            )}
        </div>
    )
}
