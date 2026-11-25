import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { PopsLogo } from '../../components/PopsLogo/PopsLogo'
import { TableroAzul } from '../../components/TableroAzul/TableroAzul'
import tab from '../../components/TableroAzul/TableroAzul.module.css'
import { colorDePop, emojiDePop } from '../../helpers/invitation/popEvents'
import { StickerInicio } from './StickerInicio'
import { portadaDePop } from './popsDatos'
import { TEMPORADA, enTemporada } from './popsTemporada'
import ojos from '../../assets/pops-stickers/craft/ojos.svg'
import corazon from '../../assets/pops-stickers/craft/corazon.svg'
import explosion from '../../assets/pops-stickers/craft/explosion.svg'
import globo from '../../assets/pops-stickers/craft/globo.svg'
import destello from '../../assets/pops-stickers/craft/destello.svg'
import objeto1 from '../../assets/pops-azul/col-obj-1.webp'
import objeto3 from '../../assets/pops-azul/col-obj-3.webp'
import polaroid1 from '../../assets/pops-azul/col-polaroid-1.webp'
import polaroid3 from '../../assets/pops-azul/col-polaroid-3.webp'
import temporada1 from '../../assets/pops-azul/inicio-season-1.webp'
import temporada2 from '../../assets/pops-azul/inicio-season-2.webp'
import temporada3 from '../../assets/pops-azul/inicio-season-3.webp'
import tijeras from '../../assets/pops-azul/tijeras-recorte.png'
import styles from './PopsInicioAzul.module.css'
import { MiniaturaPop } from './MiniaturaPop'

/**
 * Inicio del espacio Pops con el estilo "Collage azul · lima" (handoff "App
 * Pops — Inicio, Clientes y Mis Pops", 4a web y 4b mobile). La base es
 * Business (página #F3F4F8, tarjetas blancas, botones pill); el tablero azul
 * con papel, cintas y stickers solo va dentro del banner:
 *   1. barra: saludo y, a la derecha, los Pops que vienen (o los gratis);
 *   2. banner (carrusel cada 7 s): marca con el collage y, en temporada
 *      (popsTemporada.js), tres polaroids con las plantillas;
 *   3. "Empieza hoy. Mándala hoy.": cuatro pasos y "Míralo en 1 minuto", que
 *      abre el video ahí mismo;
 *   4. "Lo que te preocupa, un Pop lo resuelve.": tres casos.
 * `movil` (4b): saludo en dos niveles, banner de 600 px con swipe y puntos,
 * pasos en 2 × 2 y casos en lista (el header y la barra los pone PlannerLayout).
 * onVerPrecios: "Ver precios →" (el panel de compra); sin él, "Conoce los Pops".
 */

const CADA_MS = 7000
const VIDEO_WEBM = '/assets/onboarding/pops-onboarding.webm'
const VIDEO_MP4 = '/assets/onboarding/pops-onboarding.mp4'
const POSTER = '/assets/onboarding/pops-poster.jpg'

const PASOS = [1, 2, 3, 4]
const CASOS = [{ n: 1, emoji: '✏️' }, { n: 2, emoji: '💬' }, { n: 3, emoji: '🎟️' }]

// Fotos de las polaroids de temporada, por plantilla.
const FOTO_PLANTILLA = {
    'pops_inicio.template_posada': temporada1,
    'pops_inicio.template_cena': temporada2,
    'pops_inicio.template_intercambio': temporada3,
}
// Acomodo de las polaroids (escritorio: caja 460 × 380; celular: 326 × 214).
const POLAROIDS = {
    'pops_inicio.template_posada': { top: 60, left: 0, rot: -8, cinta: -5, movil: { top: 26, left: 6, rot: -9, cinta: -5, z: 1 } },
    'pops_inicio.template_cena': { top: 20, left: 140, rot: 2, cinta: 3, movil: { top: 4, left: 106, rot: 1, cinta: 2, z: 2 } },
    'pops_inicio.template_intercambio': { top: 70, left: 276, rot: 8, cinta: -3, movil: { top: 30, left: 210, rot: 9, cinta: 4, z: 1 } },
}

const STICKERS_TEMPORADA = [
    { forma: 'eyes', pos: { left: -10, top: -6 }, tam: 74, rot: -10 },
    { forma: 'spark', pos: { right: 0, top: 0 }, tam: 44, rot: 0 },
    { forma: 'heart', pos: { left: 10, bottom: -6 }, tam: 62, rot: -14 },
    { forma: 'bubble', pos: { right: -6, bottom: 0 }, tam: 80, rot: 8 },
]
const STICKERS_TEMPORADA_MOVIL = [
    { forma: 'eyes', pos: { left: 0, top: 6 }, tam: 50, rot: -10 },
    { forma: 'spark', pos: { right: 8, top: 2 }, tam: 32, rot: 0 },
    { forma: 'heart', pos: { left: 6, bottom: 4 }, tam: 44, rot: -14 },
    { forma: 'bubble', pos: { right: -10, top: 70 }, tam: 50, rot: 10 },
]

const sinMovimiento = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const Stickers = ({ lista }) => lista.map((s, i) => (
    <span
        key={i}
        aria-hidden
        className={styles.flotante}
        style={{ ...s.pos, '--r': `${s.rot}deg`, '--dur': `${4 + i * 0.7}s`, '--delay': `${i * 0.4}s` }}
    >
        <StickerInicio forma={s.forma} tema='azul' tamano={s.tam} />
    </span>
))

// Polaroid de papel con cinta (la foto con brillo y sombra interna).
const Polaroid = ({ foto, pie, className, style }) => (
    <div className={`${styles.polaroid} ${className ?? ''}`} style={style}>
        <span aria-hidden className={styles.cintaRasgada} />
        <div className={styles.polaroidFoto}>
            <img src={foto} alt='' loading='lazy' />
            <span aria-hidden className={styles.polaroidBrillo} />
        </div>
        <span className={styles.polaroidPie}>{pie}</span>
    </div>
)

// Collage denso de la lámina de marca (opción 5b del handoff).
const CollageMarca = ({ t }) => (
    <div className={styles.collageMarca} aria-hidden>
        <img src={objeto1} alt='' className={`${tab.sticker} ${styles.objeto1}`} />
        <div className={`${tab.papel} ${styles.foto} ${styles.foto1}`}>
            <span className={styles.cinta} style={{ '--giro': '4deg' }} />
            <img src={polaroid1} alt='' className={styles.fotoImg} />
            <span className={styles.fotoPie}>{t('pops_azul.caption_1')}</span>
        </div>
        <div className={`${tab.papel} ${styles.foto} ${styles.foto3}`}>
            <span className={styles.cinta} style={{ '--giro': '-5deg' }} />
            <img src={polaroid3} alt='' className={styles.fotoImg} />
            <span className={styles.fotoPie}>{t('pops_azul.caption_2')}</span>
        </div>
        <img src={objeto3} alt='' className={`${tab.sticker} ${styles.objeto3}`} />
        <img src={explosion} alt='' className={`${tab.sticker} ${styles.sExplosion}`} />
        <img src={globo} alt='' className={`${tab.sticker} ${styles.sGlobo}`} />
        <img src={destello} alt='' className={`${tab.sticker} ${styles.sDestello}`} />
        <img src={ojos} alt='' className={`${tab.sticker} ${styles.sOjos}`} />
        <img src={corazon} alt='' className={`${tab.sticker} ${styles.sCorazon}`} />
        <img src={tijeras} alt='' className={styles.tijeras} />
        <span className={`${tab.papel} ${styles.hechoPorTi}`}>{t('pops_azul.caption_3')}</span>
        <span className={`${tab.estrella} ${styles.estrellaA}`} />
        <span className={`${tab.estrellaRayas} ${styles.estrellaB}`} />
    </div>
)

const CollageMarcaMovil = ({ t }) => (
    <div className={styles.collageMovil} aria-hidden>
        <img src={objeto1} alt='' className={`${tab.sticker} ${styles.mObjeto}`} />
        <div className={`${tab.papel} ${styles.foto} ${styles.mFoto}`}>
            <span className={styles.cinta} style={{ '--giro': '-4deg' }} />
            <img src={polaroid1} alt='' className={styles.fotoImg} />
            <span className={styles.fotoPie}>{t('pops_azul.caption_1')}</span>
        </div>
        <img src={ojos} alt='' className={`${tab.sticker} ${styles.mOjos}`} />
        <img src={corazon} alt='' className={`${tab.sticker} ${styles.mCorazon}`} />
        <span className={`${tab.estrella} ${styles.mEstrellaA}`} />
        <span className={`${tab.estrellaRayas} ${styles.mEstrellaB}`} />
    </div>
)

export const PopsInicioAzul = ({ movil = false, greeting, pops = [], gratisPop = 0, puedeCrear, onCrear, onConoce, onVerPrecios, onAbrir, onVerTodos, pie }) => {
    const { t } = useTranslation()

    // Los Pops que vienen (sin fecha al final): hasta tres chips y "Ver todos".
    const hoy = dayjs().startOf('day')
    const proximos = pops
        .map(item => {
            const fecha = item.event_date ? dayjs(item.event_date).startOf('day') : null
            return { item, dias: fecha ? fecha.diff(hoy, 'day') : null }
        })
        .filter(p => p.dias === null || p.dias >= 0)
        .sort((a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity))
    const cuando = (dias) => (dias === 0 ? t('pops_section.today') : dias === 1 ? t('pops_section.tomorrow') : t('pops_section.in_days', { count: dias }))

    // Carrusel: marca y, en temporada, las polaroids.
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
    const ir = (i) => {
        setLamina((i + laminas) % laminas)
        programar()
    }
    const estado = (i) => (i === lamina ? 'activa' : i < lamina ? 'antes' : 'despues')

    // Celular: deslizar 40 px cambia de lámina.
    const toqueX = useRef(null)
    const alTocar = (e) => { toqueX.current = e.touches[0].clientX }
    const alSoltar = (e) => {
        if (toqueX.current === null || laminas < 2) return
        const dx = e.changedTouches[0].clientX - toqueX.current
        toqueX.current = null
        if (Math.abs(dx) > 40) ir(lamina + (dx < 0 ? 1 : -1))
    }

    const [video, setVideo] = useState(false)

    const verTodos = proximos.length > 0 && !movil && (
        <button type='button' className={styles.verTodos} onClick={onVerTodos}>
            {pops.length > 3 ? t('pops_inicio.see_n', { count: pops.length }) : t('pops_inicio.see_all')}
        </button>
    )
    const chips = proximos.length > 0 ? (
        <>
            {proximos.slice(0, 3).map(({ item, dias }) => {
                const pop = item._pop
                const portada = portadaDePop(pop)
                return (
                    <button key={item.id} type='button' className={styles.chip} onClick={() => onAbrir(item)}>
                        <span className={styles.chipPunto} style={{ background: colorDePop(pop) || '#CDF22B' }}>
                            {portada ? <MiniaturaPop src={portada} /> : emojiDePop(pop) || '✨'}
                        </span>
                        <span className={styles.chipNombre}>{(item.name || pop?.name || '').trim() || t('pops_section.untitled')}</span>
                        {dias !== null && <span className={styles.chipCuando}>{cuando(dias)}</span>}
                    </button>
                )
            })}
        </>
    ) : gratisPop > 0 && (
        <span className={styles.gratis}>🎁 {t('pops_inicio.free', { count: gratisPop })}</span>
    )

    const tab0 = lamina === 0 ? 0 : -1
    const tab1 = lamina === 1 ? 0 : -1
    const segundo = onVerPrecios
        ? <button type='button' className={tab.botonPapel} onClick={onVerPrecios} tabIndex={tab0}>{t('pops_azul.see_prices')}</button>
        : <button type='button' className={tab.botonPapel} onClick={onConoce} tabIndex={tab0}>{t('pops_section.learn')}</button>

    const laminaMarca = (
        <div className={styles.lamina} data-estado={estado(0)} aria-hidden={lamina !== 0}>
            {movil ? <CollageMarcaMovil t={t} /> : <CollageMarca t={t} />}
            <div className={styles.texto}>
                <div className={styles.logo}>
                    <PopsLogo size={movil ? 92 : 130} color='#F7F6F2' autoplay={6} alMontar={0.45} />
                </div>
                <h2 className={styles.titulo}>
                    {t('pops_section.headline_a')}{movil ? <br /> : ' '}
                    <span className={styles.resalte}>{t('pops_section.headline_b')}</span>
                </h2>
                <p className={styles.lede}>{t('pops_azul.lede')}</p>
                <div className={styles.botones}>
                    {puedeCrear && (
                        <button type='button' className={tab.botonLima} onClick={onCrear} tabIndex={tab0}>+ {t('pops_section.send')}</button>
                    )}
                    {segundo}
                </div>
            </div>
        </div>
    )

    const laminaTemporada = conTemporada && (
        <div className={`${styles.lamina} ${styles.laminaTemporada}`} data-estado={estado(1)} aria-hidden={lamina !== 1}>
            <div className={styles.texto}>
                <span className={styles.etiqueta}>{t(TEMPORADA.etiqueta)}</span>
                <h2 className={styles.tituloTemporada}>
                    <span className={styles.sinCorte}>{t(TEMPORADA.titulo)}</span><br />
                    <span className={`${tab.papel} ${styles.resalteBlanco}`}>{t('pops_section.headline_b')}</span>
                </h2>
                <p className={`${styles.lede} ${styles.ledeTemporada}`}>{t(TEMPORADA.texto)}</p>
                <div className={styles.botones}>
                    {/* Todavía no hay plantillas: crear el Pop en blanco. */}
                    {puedeCrear && (
                        <button type='button' className={tab.botonLima} onClick={onCrear} tabIndex={tab1}>+ {t('pops_section.send')}</button>
                    )}
                </div>
            </div>
            <div className={styles.polaroids}>
                {TEMPORADA.plantillas.map(p => {
                    const a = POLAROIDS[p.nombre] ?? { top: 0, left: 0, rot: 0, cinta: 0, movil: { top: 0, left: 0, rot: 0, cinta: 0, z: 1 } }
                    const pos = movil ? a.movil : a
                    return (
                        <Polaroid
                            key={p.nombre}
                            foto={p.imagen || FOTO_PLANTILLA[p.nombre]}
                            pie={t(p.nombre)}
                            style={{ top: pos.top, left: pos.left, zIndex: pos.z, '--rot': `${pos.rot}deg`, '--cinta': `${pos.cinta}deg` }}
                        />
                    )
                })}
                <div className={styles.polaroidsStickers}>
                    <Stickers lista={movil ? STICKERS_TEMPORADA_MOVIL : STICKERS_TEMPORADA} />
                </div>
            </div>
        </div>
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

    return (
        <div className={`${styles.inicio} ${movil ? styles.movil : ''}`}>
            {movil ? (
                <div className={styles.saludoMovil}>
                    <span className={styles.hola}>{greeting} 👋</span>
                    <span className={styles.pregunta}>{t('pops_azul.question')}</span>
                </div>
            ) : null}

            {movil ? (
                chips && <div className={styles.accesos}>{chips}</div>
            ) : (
                <div className={styles.barra}>
                    <span className={styles.saludo}>{greeting} 👋</span>
                    {/* Solo chips completos: los que no caben bajan a una fila oculta. */}
                    <div className={styles.accesos}>{chips}</div>
                    {verTodos}
                </div>
            )}

            <TableroAzul
                lineas={movil ? 'movil' : 'hero'}
                movil={movil}
                className={styles.banner}
                aria-roledescription='carousel'
                onTouchStart={movil ? alTocar : undefined}
                onTouchEnd={movil ? alSoltar : undefined}
            >
                {laminaMarca}
                {laminaTemporada}
                {laminas > 1 && (
                    <div className={styles.controles}>
                        {puntos}
                        {!movil && (
                            <div className={styles.flechas}>
                                <button type='button' className={styles.flecha} aria-label={t('pops_inicio.prev')} onClick={() => ir(lamina - 1)}><ArrowLeft size={18} /></button>
                                <button type='button' className={styles.flecha} aria-label={t('pops_inicio.next')} onClick={() => ir(lamina + 1)}><ArrowRight size={18} /></button>
                            </div>
                        )}
                    </div>
                )}
            </TableroAzul>

            <section className={styles.bloque}>
                <div className={styles.bloqueCabeza}>
                    <h3 className={styles.bloqueTitulo}>
                        {t('pops_azul.steps_title_a')}{movil ? <br /> : ' '}{t('pops_azul.steps_title_b')}
                    </h3>
                    <button type='button' className={styles.videoBoton} aria-expanded={video} onClick={() => setVideo(v => !v)}>
                        <span className={styles.play} aria-hidden>▶</span>
                        {movil
                            ? t(video ? 'pops_azul.video_close_short' : 'pops_azul.video_short')
                            : t(video ? 'pops_inicio.video_close' : 'pops_inicio.video_title')}
                    </button>
                </div>
                <div className={styles.pasos}>
                    {PASOS.map(n => (
                        <div key={n} className={styles.paso}>
                            <span className={styles.pasoNumero}>{String(n).padStart(2, '0')}</span>
                            <span className={styles.pasoTitulo}>{t(`pops_azul.step_${n}_t`)}</span>
                            <span className={styles.pasoTexto}>{t(`pops_azul.step_${n}_d${movil ? '_short' : ''}`)}</span>
                        </div>
                    ))}
                </div>
                {video && (
                    <div className={styles.video}>
                        <video controls autoPlay muted playsInline poster={POSTER}>
                            <source src={VIDEO_WEBM} type='video/webm' />
                            <source src={VIDEO_MP4} type='video/mp4' />
                        </video>
                    </div>
                )}
            </section>

            <section className={styles.bloque}>
                <h3 className={styles.bloqueTitulo}>
                    {t('pops_azul.cases_title_a')}{movil ? <br /> : ' '}{t('pops_azul.cases_title_b')}
                </h3>
                <div className={styles.casos}>
                    {CASOS.map(({ n, emoji }) => (
                        <div key={n} className={styles.caso}>
                            <span className={styles.casoIcono} aria-hidden>{emoji}</span>
                            <span className={styles.casoTextos}>
                                <span className={styles.casoTitulo}>{t(`pops_azul.case_${n}_t`)}</span>
                                <span className={styles.casoTexto}>{t(`pops_azul.case_${n}_d`)}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {pie}
        </div>
    )
}

export default PopsInicioAzul
