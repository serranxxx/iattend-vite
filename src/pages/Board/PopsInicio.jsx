import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Play } from 'lucide-react'
import { PopsLogo } from '../../components/PopsLogo/PopsLogo'
import { colorDePop, emojiDePop } from '../../helpers/invitation/popEvents'
import { StickerInicio } from './StickerInicio'
import { portadaDePop } from './popsDatos'
import { TEMPORADA, enTemporada } from './popsTemporada'
import styles from './PopsInicio.module.css'

/**
 * Inicio del espacio Pops en escritorio (handoff "Inicio de Pops", opción 1c ·
 * carrusel · 3 estilos): una mini landing con
 *   1. barra superior: saludo, acceso rápido a su próximo Pop (o el aviso
 *      de Pops gratis) y "Tu estilo" (switchTema);
 *   2. carrusel: lámina de marca ("Para lo que surja, Send a Pop.") y, en
 *      temporada (popsTemporada.js), la lámina de plantillas; cada 7 s;
 *   3. "Así de rápido.": tres pasos y la tarjeta de video, que abre el video
 *      en el modal de "Conoce los Pops" (onConoce);
 *   4. "Tips rápidos.".
 * El estilo (pop · business · craft) va en `data-tema` y el CSS pone sus
 * tokens. `movil` (handoff "Inicio de Pops" · mobile, < 768 px): sin barra
 * superior (el header con el selector, Tu estilo y el avatar lo pone
 * PlannerLayout), el carrusel en columna con swipe y solo puntos, los pasos en
 * 2 × 2 y los tips en lista.
 */

const CADA_MS = 7000

// Collage de la lámina de marca (caja 420 × 380) y el de temporada.
const COLLAGE_MARCA = [
    { forma: 'burst', pos: { left: 96, top: 92 }, tam: 210, rot: -8 },
    { forma: 'bubble', pos: { left: 156, top: 132 }, tam: 140, rot: 6 },
    { forma: 'eyes', pos: { left: 6, top: 8 }, tam: 118, rot: -10 },
    { forma: 'spark', pos: { right: 14, top: 18 }, tam: 66, rot: 0 },
    { forma: 'heart', pos: { left: 0, bottom: 14 }, tam: 106, rot: -14 },
    { forma: 'note', pos: { right: 0, bottom: 4 }, tam: 104, rot: 12 },
    { forma: 'spark', pos: { left: 196, top: 6 }, tam: 40, rot: 12 },
    { forma: 'spark', pos: { left: 150, bottom: 0 }, tam: 34, rot: -8 },
]
// Celular: collage de 170 px de alto sobre el logo y el de temporada.
const COLLAGE_MARCA_MOVIL = [
    { forma: 'burst', pos: { left: 104, top: 14 }, tam: 140, rot: -8 },
    { forma: 'bubble', pos: { left: 144, top: 40 }, tam: 94, rot: 6 },
    { forma: 'eyes', pos: { left: 6, top: 2 }, tam: 82, rot: -10 },
    { forma: 'spark', pos: { right: 10, top: 0 }, tam: 48, rot: 0 },
    { forma: 'heart', pos: { left: 24, bottom: -4 }, tam: 70, rot: -14 },
    { forma: 'note', pos: { right: 6, bottom: -4 }, tam: 70, rot: 12 },
    { forma: 'spark', pos: { left: 100, bottom: 0 }, tam: 28, rot: -8 },
]
const COLLAGE_TEMPORADA_MOVIL = [
    { forma: 'eyes', pos: { left: 0, top: 6 }, tam: 50, rot: -10 },
    { forma: 'spark', pos: { right: 8, top: 2 }, tam: 32, rot: 0 },
    { forma: 'heart', pos: { left: 6, bottom: 4 }, tam: 44, rot: -14 },
    { forma: 'bubble', pos: { right: -10, top: 70 }, tam: 50, rot: 10 },
]
const COLLAGE_TEMPORADA = [
    { forma: 'eyes', pos: { left: -10, top: -6 }, tam: 74, rot: -10 },
    { forma: 'spark', pos: { right: 0, top: 0 }, tam: 44, rot: 0 },
    { forma: 'heart', pos: { left: 10, bottom: -6 }, tam: 62, rot: -14 },
    { forma: 'bubble', pos: { right: -6, bottom: 0 }, tam: 80, rot: 8 },
]

const PASOS = [1, 2, 3]
const TIPS = [{ n: 1, emoji: '✏️' }, { n: 2, emoji: '💬' }, { n: 3, emoji: '🎟️' }]
// Craft: cada papel un poco chueco y con su cinta.
const GIRO = ['-0.8deg', '0.6deg', '-0.4deg']
const CINTA_PASO = ['-4deg', '3deg', '-2deg']
const CINTA_TIP = ['3deg', '-3deg', '2deg']

const sinMovimiento = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const Collage = ({ lista, tema }) => lista.map((s, i) => (
    <span
        key={`${tema}${i}`}
        aria-hidden
        className={styles.sticker}
        style={{ ...s.pos, '--r': `${s.rot}deg`, '--dur': `${4 + i * 0.7}s`, '--delay': `${i * 0.4}s` }}
    >
        <StickerInicio forma={s.forma} tema={tema} tamano={s.tam} />
    </span>
))

const Cinta = ({ className, giro }) => <span aria-hidden className={`${styles.cinta} ${className ?? ''}`} style={{ '--giro': giro }} />

export const PopsInicio = ({ movil = false, tema = 'pop', greeting, pops = [], gratisPop = 0, puedeCrear, onCrear, onConoce, onAbrir, onVerTodos, switchTema, pie }) => {
    const { t } = useTranslation()
    const craft = tema === 'craft'

    // Acceso rápido: solo el Pop que viene (sin fecha al final) y "Ver todos";
    // con el saludo largo, un segundo chip ya no cabía y salía cortado.
    const hoy = dayjs().startOf('day')
    const proximos = pops
        .map(item => {
            const fecha = item.event_date ? dayjs(item.event_date).startOf('day') : null
            return { item, dias: fecha ? fecha.diff(hoy, 'day') : null }
        })
        .filter(p => p.dias === null || p.dias >= 0)
        .sort((a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity))
    const cuando = (dias) => (dias === 0 ? t('pops_section.today') : dias === 1 ? t('pops_section.tomorrow') : t('pops_section.in_days', { count: dias }))

    // Carrusel: marca y, en temporada, la lámina de plantillas.
    const conTemporada = enTemporada(TEMPORADA)
    const laminas = conTemporada ? 2 : 1
    const [lamina, setLamina] = useState(0)
    const reloj = useRef(null)
    const programar = () => {
        clearInterval(reloj.current)
        if (laminas < 2 || sinMovimiento()) return
        reloj.current = setInterval(() => setLamina(l => (l + 1) % laminas), CADA_MS)
    }
    useEffect(() => {
        programar()
        return () => clearInterval(reloj.current)
    }, [laminas])
    // Tocar un punto o una flecha reinicia el temporizador.
    const ir = (i) => {
        setLamina((i + laminas) % laminas)
        programar()
    }

    const estadoLamina = (i) => (i === lamina ? 'activa' : i < lamina ? 'antes' : 'despues')

    // Celular: deslizar el carrusel (40 px) pasa de lámina y reinicia el tiempo.
    const toqueX = useRef(null)
    const alTocar = (e) => { toqueX.current = e.touches[0].clientX }
    const alSoltar = (e) => {
        if (toqueX.current === null || laminas < 2) return
        const dx = e.changedTouches[0].clientX - toqueX.current
        toqueX.current = null
        if (Math.abs(dx) > 40) ir(lamina + (dx < 0 ? 1 : -1))
    }

    const chips = proximos.length > 0 ? (
        <>
            {proximos.slice(0, 1).map(({ item, dias }) => {
                const pop = item._pop
                const emoji = emojiDePop(pop)
                const portada = portadaDePop(pop)
                return (
                    <button key={item.id} type='button' className={styles.chip} onClick={() => onAbrir(item)}>
                        <span className={styles.chipPunto} style={{ background: colorDePop(pop) || 'var(--pi-acento)' }}>
                            {portada ? <img src={portada} alt='' loading='lazy' className={styles.chipPortada} /> : emoji || '✨'}
                        </span>
                        <span className={styles.chipNombre}>{item.name || pop?.name || t('pops_section.untitled')}</span>
                        {dias !== null && <span className={styles.chipCuando}>{cuando(dias)}</span>}
                    </button>
                )
            })}
            <button type='button' className={styles.verTodos} onClick={onVerTodos}>
                {pops.length > 1 ? t('pops_inicio.see_n', { count: pops.length }) : t('pops_inicio.see_all')}
            </button>
        </>
    ) : gratisPop > 0 && (
        <span className={styles.gratis}>🎁 {t('pops_inicio.free', { count: gratisPop })}</span>
    )

    const pasosYTips = (
        <>
            <section className={styles.bloque}>
                <h3 className={styles.bloqueTitulo}>{t('pops_inicio.steps_title')}</h3>
                <div className={styles.pasos}>
                    {PASOS.map((n, i) => (
                        <div key={n} className={styles.paso} style={{ '--giro': craft ? GIRO[i] : '0deg' }}>
                            {craft && <Cinta className={styles.cintaArriba} giro={CINTA_PASO[i]} />}
                            <span className={styles.pasoNumero}>{String(n).padStart(2, '0')}</span>
                            <span className={styles.pasoTitulo}>{t(`pops_inicio.step_${n}_t`)}</span>
                            <span className={styles.pasoTexto}>{t(`pops_inicio.step_${n}_d`)}</span>
                        </div>
                    ))}
                    {/* El video se abre en el modal de "Conoce los Pops" (PopsOnboarding). */}
                    <button type='button' className={styles.videoTarjeta} onClick={onConoce}>
                        <span className={styles.play}><Play size={20} fill='currentColor' /></span>
                        <span className={styles.videoTextos}>
                            <span className={styles.videoTitulo}>{t('pops_inicio.video_title')}</span>
                            <span className={styles.videoSub}>{t('pops_inicio.video_sub')}</span>
                        </span>
                    </button>
                </div>
            </section>

            <section className={styles.bloque}>
                <h3 className={styles.bloqueTitulo}>{t('pops_inicio.tips_title')}</h3>
                <div className={styles.tips}>
                    {TIPS.map(({ n, emoji }, i) => (
                        <div key={n} className={styles.tip} style={{ '--giro': craft ? GIRO[(i + 1) % 3] : '0deg' }}>
                            {craft && <Cinta className={styles.cintaArriba} giro={CINTA_TIP[i]} />}
                            <span className={styles.tipIcono} aria-hidden>{emoji}</span>
                            <span className={styles.tipTextos}>
                                <span className={styles.tipTitulo}>{t(`pops_inicio.tip_${n}_t`)}</span>
                                <span className={styles.tipTexto}>{t(`pops_inicio.tip_${n}_d`)}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </>
    )

    const puntos = laminas > 1 && (
        <div className={styles.puntos}>
            {[t('pops_inicio.slide_brand'), t('pops_inicio.slide_season')].map((etiqueta, i) => (
                <button
                    key={etiqueta}
                    type='button'
                    className={styles.punto}
                    data-activo={i === lamina || undefined}
                    aria-label={etiqueta}
                    aria-current={i === lamina || undefined}
                    onClick={() => ir(i)}
                />
            ))}
        </div>
    )

    if (movil) {
        return (
            <div className={`${styles.inicio} ${styles.movil}`} data-tema={tema}>
                <span className={styles.saludo}>{greeting} 👋</span>
                <div className={styles.accesos}>{chips}</div>

                <section className={styles.carrusel} aria-roledescription='carousel' onTouchStart={alTocar} onTouchEnd={alSoltar}>
                    <div className={styles.lamina} data-estado={estadoLamina(0)} aria-hidden={lamina !== 0}>
                        <div className={styles.collage}>
                            <Collage lista={COLLAGE_MARCA_MOVIL} tema={tema} />
                        </div>
                        <div className={styles.logo}>
                            <PopsLogo size={92} color={craft ? '#F3F2EE' : '#F7F6F2'} autoplay={6} alMontar={0.45} />
                        </div>
                        <h2 className={styles.tituloMarca}>
                            {t('pops_section.headline_a')}<br />
                            <span className={styles.resalte}>
                                {t('pops_section.headline_b')}
                                {craft && <Cinta className={styles.cintaResalte} giro='18deg' />}
                            </span>
                        </h2>
                        <p className={styles.lede}>{t('pops_section.lede')}</p>
                        <div className={styles.botones}>
                            {puedeCrear && (
                                <button type='button' className={styles.boton} onClick={onCrear} tabIndex={lamina === 0 ? 0 : -1}>{t('pops_section.send')} ↗</button>
                            )}
                            <button type='button' className={styles.boton2} onClick={onConoce} tabIndex={lamina === 0 ? 0 : -1}>{t('pops_section.learn')}</button>
                        </div>
                    </div>

                    {conTemporada && (
                        <div className={`${styles.lamina} ${styles.laminaTemporada}`} data-estado={estadoLamina(1)} aria-hidden={lamina !== 1}>
                            <div className={styles.abanico}>
                                <div className={styles.abanicoStickers}>
                                    <Collage lista={COLLAGE_TEMPORADA_MOVIL} tema={tema} />
                                </div>
                                {TEMPORADA.plantillas.map(p => (
                                    <div key={p.nombre} className={styles.plantilla} style={{ top: p.movil.top, left: p.movil.left, zIndex: p.movil.z, '--rot': `${p.movil.rot}deg` }}>
                                        <div className={styles.plantillaPantalla} style={{ background: p.color, color: p.tinta }}>
                                            {p.imagen ? <img src={p.imagen} alt='' className={styles.plantillaImagen} /> : (
                                                <>
                                                    <span className={styles.plantillaTag}>Pop</span>
                                                    <span className={styles.plantillaEmoji}>{p.emoji}</span>
                                                    <span className={styles.plantillaNombre}>{t(p.nombre)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <span className={styles.etiqueta}>{t(TEMPORADA.etiqueta)}</span>
                            <h2 className={styles.tituloTemporada}>
                                {t(TEMPORADA.titulo)}<br />
                                <span className={styles.resalte2}>{t('pops_section.headline_b')}</span>
                            </h2>
                            <p className={styles.lede}>{t(TEMPORADA.texto)}</p>
                            <div className={styles.botones}>
                                {/* Todavía no hay plantillas: un solo botón, crear el Pop. */}
                                {puedeCrear && (
                                    <button type='button' className={styles.boton} onClick={onCrear} tabIndex={lamina === 1 ? 0 : -1}>{t('pops_section.send')} ↗</button>
                                )}
                            </div>
                        </div>
                    )}

                    {puntos && <div className={styles.controles}>{puntos}</div>}
                </section>

                {pasosYTips}
                {pie}
            </div>
        )
    }

    return (
        <div className={styles.inicio} data-tema={tema}>
            {/* 1 · Barra superior */}
            <div className={styles.barra}>
                <span className={styles.saludo}>{greeting} 👋</span>
                <span className={styles.divisor} aria-hidden />
                <div className={styles.accesos}>{chips}</div>
                {switchTema}
            </div>

            {/* 2 · Carrusel */}
            <section className={styles.carrusel} aria-roledescription='carousel'>
                <div className={styles.lamina} data-estado={estadoLamina(0)} aria-hidden={lamina !== 0}>
                    <div className={styles.laminaTexto}>
                        <div className={styles.logo}>
                            <PopsLogo size={150} color={craft ? '#F3F2EE' : '#F7F6F2'} autoplay={6} alMontar={0.45} />
                        </div>
                        <h2 className={styles.tituloMarca}>
                            {t('pops_section.headline_a')}{' '}
                            <span className={styles.resalte}>
                                {t('pops_section.headline_b')}
                                {craft && <Cinta className={styles.cintaResalte} giro='18deg' />}
                            </span>
                        </h2>
                        <p className={styles.lede}>{t('pops_section.lede')}</p>
                        <div className={styles.botones}>
                            {puedeCrear && (
                                <button type='button' className={styles.boton} onClick={onCrear} tabIndex={lamina === 0 ? 0 : -1}>{t('pops_section.send')} ↗</button>
                            )}
                            <button type='button' className={styles.boton2} onClick={onConoce} tabIndex={lamina === 0 ? 0 : -1}>{t('pops_section.learn')}</button>
                        </div>
                    </div>
                    <div className={styles.collage}>
                        <Collage lista={COLLAGE_MARCA} tema={tema} />
                    </div>
                </div>

                {conTemporada && (
                    <div className={`${styles.lamina} ${styles.laminaTemporada}`} data-estado={estadoLamina(1)} aria-hidden={lamina !== 1}>
                        <div className={styles.laminaTexto}>
                            <span className={styles.etiqueta}>{t(TEMPORADA.etiqueta)}</span>
                            <h2 className={styles.tituloTemporada}>
                                {t(TEMPORADA.titulo)}<br />
                                <span className={styles.resalte2}>{t('pops_section.headline_b')}</span>
                            </h2>
                            <p className={`${styles.lede} ${styles.ledeTemporada}`}>{t(TEMPORADA.texto)}</p>
                            <div className={styles.botones}>
                                {/* Todavía no hay plantillas: un solo botón, crear el Pop. */}
                                {puedeCrear && (
                                    <button type='button' className={styles.boton} onClick={onCrear} tabIndex={lamina === 1 ? 0 : -1}>{t('pops_section.send')} ↗</button>
                                )}
                            </div>
                        </div>
                        <div className={styles.collage}>
                            <Collage lista={COLLAGE_TEMPORADA} tema={tema} />
                            {TEMPORADA.plantillas.map(p => (
                                <div key={p.nombre} className={styles.plantilla} style={{ top: p.top, left: p.left, '--rot': `${p.rot}deg` }}>
                                    <div className={styles.plantillaPantalla} style={{ background: p.color, color: p.tinta }}>
                                        {p.imagen ? <img src={p.imagen} alt='' className={styles.plantillaImagen} /> : (
                                            <>
                                                <span className={styles.plantillaTag}>Pop</span>
                                                <span className={styles.plantillaEmoji}>{p.emoji}</span>
                                                <span className={styles.plantillaNombre}>{t(p.nombre)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {laminas > 1 && (
                    <div className={styles.controles}>
                        {puntos}
                        <div className={styles.flechas}>
                            <button type='button' className={styles.flecha} aria-label={t('pops_inicio.prev')} onClick={() => ir(lamina - 1)}><ArrowLeft size={18} /></button>
                            <button type='button' className={styles.flecha} aria-label={t('pops_inicio.next')} onClick={() => ir(lamina + 1)}><ArrowRight size={18} /></button>
                        </div>
                    </div>
                )}
            </section>

            {/* 3 · Así de rápido y 4 · Tips rápidos */}
            {pasosYTips}

            {pie}
        </div>
    )
}

export default PopsInicio
