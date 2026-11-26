import { useRef, useState } from 'react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Play, Plus } from 'lucide-react'
import { PopsLogo } from '../../../components/PopsLogo/PopsLogo'
import { TableroAzul } from '../../../components/TableroAzul/TableroAzul'
import { colorDePop, emojiDePop } from '../../../helpers/invitation/popEvents'
import { PERSONAS_FREE } from './usePlanPops'
import { BandaPlusMovil, BotonQuieroPlus, MarcaPlus, MedidorPersonas } from './PopsPlus/PopsPlus'
import { GratisOPlus } from './PopsPlus/TablasPlus'
import ojos from '../../../assets/pops-stickers/craft/ojos.svg'
import corazon from '../../../assets/pops-stickers/craft/corazon.svg'
import explosion from '../../../assets/pops-stickers/craft/explosion.svg'
import globo from '../../../assets/pops-stickers/craft/globo.svg'
import destello from '../../../assets/pops-stickers/craft/destello.svg'
import objeto1 from '../../../assets/pops-azul/col-obj-1.webp'
import objeto3 from '../../../assets/pops-azul/col-obj-3.webp'
import polaroid1 from '../../../assets/pops-azul/col-polaroid-1.webp'
import polaroid3 from '../../../assets/pops-azul/col-polaroid-3.webp'
import temporada1 from '../../../assets/pops-azul/inicio-season-1.webp'
import tijeras from '../../../assets/pops-azul/tijeras-recorte.png'
import s from './PopsAppInicio.module.css'

/*
  Inicio de la App de Pops (handoff "App de Pops — Inicio, Mis Pops, Ideas…",
  §3 y §4; fuente de verdad `Pops Home.dc.html`). Lo pinta PopsApp dentro de
  su <main> (la barra, el menú del avatar y el modal de límite viven allá).
  · Sin Pops (1a2, variante "tira"): tablero azul con "cómo funciona",
    "Empieza hoy." / "Mándala hoy.", el CTA lima "Make a Pop" con el sticker
    "gratis" y, a la derecha, la hoja tipo ticket "TU POP · en 4 pasos" con
    la orilla dentada (clip-path en el hijo, sombra en el wrapper).
  · Con Pops (1c / 2a): carrusel con el collage y el logo animado y, solo en
    Free, la lámina "Conoce Pops+" (las de "archivar" y "Trae tu lista" se
    quitaron; con una sola lámina no hay puntos ni flechas) y
    "Tus próximos Pops" (hasta 3, de hoy en adelante).
  Pops+ (handoff "Pops+ en la App" 1; en Free y en Pops+, que no lleva los
  CTA de compra — "Tienes Pops+" en lugar de "Conoce", sin "Quiero Pops+",
  personas sin tope —): la primera lámina es Pops+
  ("Para quien siempre / termina / organizando todo." con las burbujas de
  frases → solución) y la marca va segunda; "Tus próximos Pops" lleva el
  medidor "Personas N de 30" (rosa desde el 90 %) y abajo va "¿Gratis o
  Pops+?" (PopsPlus/TablasPlus.jsx).
  `aviso`: el banner de límite que arma PopsApp, debajo del saludo.
  `movil`: la versión de 390 px (§10), abajo en este archivo.
*/

const PASOS = [
    { n: 1, color: '#FF5FA8', tinta: '#FFFFFF', rot: -6 },
    { n: 2, color: '#FFB3C9', tinta: '#0B1F3A', rot: 6 },
    { n: 3, color: '#9FD8F5', tinta: '#0B1F3A', rot: -6 },
    { n: 4, color: '#CDF22B', tinta: '#0B1F3A', rot: 6 },
]
// Fondo del cuadro del emoji cuando el Pop no tiene color de tema.
const COLORES_PROXIMOS = ['#2EBE88', '#FF4D3D', '#FFE14D', '#9FD8F5', '#FFB3C9']

// "YYYY-MM-DD HH:mm:00" en hora de pared (sin zona): fecha y hora tal cual.
const fechaDePop = (item, lang) => {
    const crudo = String(item?._pop?.body?.hour ?? item?.event_date ?? '')
    const dia = crudo.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null
    const [y, m, d] = dia.split('-').map(Number)
    const texto = new Date(y, m - 1, d)
        .toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' })
        .replace(/\./g, '')
        .replace(',', '')
    const hora = crudo.slice(11, 16)
    return /^\d{2}:\d{2}$/.test(hora) ? `${texto} · ${Number(hora.slice(0, 2))}:${hora.slice(3)}` : texto
}

const BotonVideo = ({ onClick, children }) => (
    <button type='button' className={s.video} onClick={onClick}>
        <span className={s.videoPlay}><Play size={12} fill='currentColor' strokeWidth={0} /></span>
        {children}
    </button>
)

/* ───────────── Sin Pops: tablero con la tira ───────────── */

const SinPops = ({ t, plan, puedeCrear, onCrear, onConoce }) => (
    <section className={s.vacio}>
        <img src={explosion} alt='' className={s.st} style={{ left: 60, top: 40, width: 96, '--rot': '-12deg' }} />
        <img src={globo} alt='' className={s.st} style={{ left: 90, bottom: 36, width: 80, '--rot': '-8deg' }} />
        <img src={corazon} alt='' className={`${s.st} ${s.stArriba}`} style={{ left: 560, bottom: 70, width: 70, '--rot': '-16deg' }} />
        <img src={destello} alt='' className={`${s.st} ${s.stArriba}`} style={{ right: 60, bottom: 70, width: 62, '--rot': '14deg' }} />

        {onConoce && (
            <div className={s.videoEsquina}>
                <BotonVideo onClick={onConoce}>{t('pops_app_home.watch')}</BotonVideo>
            </div>
        )}

        <div className={s.vacioIzq}>
            <span className={s.tagNavy}>{t('pops_app_home.how_it_works')}</span>
            <span className={`${s.etiqueta} ${s.etiquetaPapel}`}>{t('pops_app_home.start_today')}</span>
            <span className={`${s.etiqueta} ${s.etiquetaLima}`}>{t('pops_app_home.send_today')}</span>
            {puedeCrear && (
                <button type='button' className={s.ctaGrande} onClick={onCrear}>
                    <span className={s.ctaGrandeMas}><Plus size={32} strokeWidth={3} /></span>
                    {t('pops_app_home.make_a_pop')}
                    {!plan?.plus && <span className={s.gratis} aria-hidden>{t('pops_app_home.free')}</span>}
                    {!plan?.plus && <span className={s.notaMano} aria-hidden>{t('pops_app_home.free_note')}</span>}
                </button>
            )}
        </div>

        <div className={s.ticketSombra}>
            <span aria-hidden className={s.ticketCinta} />
            <div className={s.ticket}>
                <span aria-hidden className={s.ticketBordeArriba} />
                <span aria-hidden className={s.ticketBordeAbajo} />
                <div className={s.ticketCabeza}>
                    <span className={s.ticketTitulo}>{t('pops_app_home.ticket_title')}</span>
                    <span className={s.ticketMeta}>{t('pops_app_home.ticket_meta')}</span>
                </div>
                <ol className={s.pasos}>
                    {PASOS.map(p => (
                        <li key={p.n} className={s.paso}>
                            <span className={s.pasoNum} style={{ background: p.color, color: p.tinta, '--rot': `${p.rot}deg` }}>{p.n}</span>
                            <span className={s.pasoTexto}>
                                <b>{t(`pops_app_home.step${p.n}_title`)}</b>
                                <span>{t(`pops_app_home.step${p.n}_text`)}</span>
                            </span>
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    </section>
)

/* ───────────── Con Pops: carrusel ───────────── */

const Polaroid = ({ src, pie, className, style }) => (
    <div className={`${s.polaroid} ${className ?? ''}`} style={style}>
        <span aria-hidden className={s.cinta} />
        <img src={src} alt='' />
        <span className={s.polaroidPie}>{pie}</span>
    </div>
)

const Collage = ({ t }) => (
    <div className={s.collage} aria-hidden>
        <div className={s.collageCaja}>
            <img src={objeto1} alt='' className={s.objeto} style={{ left: 560, top: 180, width: 200, height: 150, '--rot': '-14deg' }} />
            <Polaroid src={polaroid1} pie={t('pops_app_home.cap_posada')} className={s.polaroidCollage} style={{ left: 700, top: 28, '--rot': '-6deg', '--cinta': '4deg', '--foto': '150px' }} />
            <Polaroid src={polaroid3} pie={t('pops_app_home.cap_cumple')} className={s.polaroidCollage} style={{ left: 877, top: 89, '--rot': '9deg', '--cinta': '-5deg', '--foto': '140px' }} />
            <img src={objeto3} alt='' className={s.objeto} style={{ right: 150, bottom: -10, width: 170, height: 170, '--rot': '12deg' }} />
            <img src={explosion} alt='' className={s.stCollage} style={{ left: 640, top: 16, width: 70, '--rot': '10deg' }} />
            <img src={globo} alt='' className={s.stCollage} style={{ right: 30, bottom: 150, width: 70, '--rot': '-8deg' }} />
            <img src={destello} alt='' className={s.stCollage} style={{ left: 600, bottom: 30, width: 56, '--rot': '0deg' }} />
            <img src={ojos} alt='' className={s.stCollage} style={{ left: 860, top: 250, width: 70, '--rot': '8deg' }} />
            <img src={corazon} alt='' className={s.stCollage} style={{ left: 930, top: 363, width: 80, '--rot': '-14deg' }} />
            <img src={tijeras} alt='' className={s.tijeras} style={{ height: 170 }} />
            <span className={s.hechoPorTi}>{t('pops_app_home.made_by_you')}</span>
            <span className={s.estrellaLima} />
            <span className={s.estrellaPapel} />
        </div>
    </div>
)

// Burbujas de la lámina Pops+: lo que dice la gente → lo que resuelve.
const BURBUJAS = [
    { k: 'eighty', left: 0, top: 28, rot: -3, rotFix: 2 },
    { k: 'pass', left: 30, top: 190, rot: 2, rotFix: -2 },
    { k: 'eight', left: 170, top: 312, rot: -1.5, rotFix: 2 },
]

const LaminaPlus = ({ t, onPasarPlus, plus }) => (
    <div className={`${s.lamina} ${s.laminaPlus}`}>
        <div className={s.plusTexto}>
            <span className={s.plusConoce}>{t(plus ? 'pops_plus_app.have' : 'pops_plus_app.meet')} <MarcaPlus /></span>
            <span className={`${s.recortePlus} ${s.recorte1}`}>{t('pops_plus_app.hero_1')}</span>
            <span className={`${s.recortePlus} ${s.recorte2}`}>{t('pops_plus_app.hero_2')}</span>
            <span className={`${s.recortePlus} ${s.recorte3}`}>{t('pops_plus_app.hero_3')}</span>
            <p className={s.plusParrafo}>{t('pops_plus_app.hero_text')}</p>
            {!plus && <BotonQuieroPlus forma='cuadro' className={s.plusCta} onClick={onPasarPlus} />}
        </div>
        <div className={s.plusCollage} aria-hidden>
            <div className={`${s.plusPolaroid} ${s.plusPolaroid1}`}>
                <span className={s.cinta} />
                <img src={temporada1} alt='' />
                <span>{t('pops_plus_app.cap_posada')}</span>
            </div>
            <div className={`${s.plusPolaroid} ${s.plusPolaroid2}`}>
                <img src={polaroid3} alt='' />
                <span>{t('pops_plus_app.cap_same')}</span>
            </div>
            {BURBUJAS.map(b => (
                <div key={b.k} className={s.burbujaGrupo} style={{ left: b.left, top: b.top, '--rot': `${b.rot}deg` }}>
                    <span className={s.burbuja}>“{t(`pops_plus_app.bubble.${b.k}`)}”</span>
                    <span className={s.burbujaFix} style={{ '--rot': `${b.rotFix}deg` }}>{t(`pops_plus_app.bubble.${b.k}_fix`)} ✓</span>
                </div>
            ))}
            <img src={explosion} alt='' className={s.plusSticker} style={{ left: -58, top: -40, width: 56, '--rot': '10deg' }} />
            <img src={corazon} alt='' className={s.plusSticker} style={{ right: -6, top: 6, width: 64, '--rot': '-14deg' }} />
        </div>
    </div>
)

const Carrusel = ({ t, plan, puedeCrear, onCrear, onVerMisPops, onPasarPlus }) => {
    const [lamina, setLamina] = useState(0)

    // Primero Pops+ y luego la marca (en Pops+ la lámina va sin CTA de compra).
    const promos = [{ k: 'plus' }, null]
    const total = promos.length
    const ir = (i) => setLamina(((i % total) + total) % total)
    const promo = promos[Math.min(lamina, total - 1)]
    const etiquetas = promos.map(p => (p ? t('pops_plus_app.slide_plus') : t('pops_app_home.slide_brand')))

    return (
        <TableroAzul lineas='hero' className={s.carrusel} data-free aria-roledescription='carousel' aria-label={t('pops_app_home.carousel_label')}>
            {!promo ? (
                <div key='l0' className={s.lamina}>
                    <Collage t={t} />
                    <div className={s.texto}>
                        <div className={s.logo}>
                            <PopsLogo size={150} color='#F3F2EE' step={0.1} autoplay={6} alMontar={0.45} />
                        </div>
                        <h2 className={s.tituloMarca}>
                            {t('pops_app_home.brand_title_a')}{' '}
                            <span className={s.resaltado}>{t('pops_app_home.brand_title_b')}</span>
                        </h2>
                        <p className={s.parrafo}>{t('pops_app_home.brand_text')}</p>
                        <div className={s.botones}>
                            {puedeCrear && (
                                <button type='button' className={s.botonLima} onClick={onCrear}>{t('pops_app_home.make_a_pop_plus')}</button>
                            )}
                            <button type='button' className={s.botonPapel} onClick={plan?.plus ? onVerMisPops : onPasarPlus}>
                                {t(plan?.plus ? 'pops_app_home.see_my_pops' : 'pops_app_home.see_prices')}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <LaminaPlus key={`l${lamina}`} t={t} onPasarPlus={onPasarPlus} plus={plan?.plus} />
            )}

            {total > 1 && <div className={s.nav}>
                <div className={s.puntos}>
                    {etiquetas.map((e, i) => (
                        <button
                            key={i}
                            type='button'
                            className={s.punto}
                            data-activo={i === lamina || undefined}
                            aria-label={e}
                            aria-current={i === lamina || undefined}
                            title={e}
                            onClick={() => ir(i)}
                        />
                    ))}
                </div>
                <div className={s.flechas}>
                    <button type='button' className={s.flecha} onClick={() => ir(lamina - 1)} aria-label={t('pops_app_home.prev')}><ArrowLeft size={18} /></button>
                    <button type='button' className={s.flecha} onClick={() => ir(lamina + 1)} aria-label={t('pops_app_home.next')}><ArrowRight size={18} /></button>
                </div>
            </div>}
        </TableroAzul>
    )
}

/* ───────────── Tus próximos Pops ───────────── */

// Hasta 3 Pops de hoy en adelante (sin archivados), del más cercano al más lejano.
const proximosDe = (pops) => {
    const hoy = dayjs().format('YYYY-MM-DD')
    return pops
        .map(item => ({ item, dia: String(item?._pop?.body?.hour ?? item?.event_date ?? '').slice(0, 10) }))
        .filter(({ item, dia }) => !item?._pop?.archived_at && /^\d{4}-\d{2}-\d{2}$/.test(dia) && dia >= hoy)
        .sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0))
        .slice(0, 3)
}

const Proximos = ({ t, lang, pops, confirmados, onAbrir, onVerMisPops, free }) => {
    const lista = proximosDe(pops)

    return (
        <section className={s.proximos}>
            <div className={s.proximosCabeza}>
                <h3>{t('pops_app_home.upcoming_title')}</h3>
                <button type='button' className={s.link} onClick={onVerMisPops}>{t('pops_app_home.see_my_pops')}</button>
            </div>
            {lista.length ? (
                <div className={s.proximosFila}>
                    {lista.map(({ item }, i) => {
                        const pop = item._pop ?? {}
                        // Personas (invitados) contra el tope de 30 en Free; en Pops+, sin tope.
                        return (
                            <button key={item.id ?? pop.id} type='button' className={`${s.tarjeta} ${s.tarjetaFree}`} onClick={() => onAbrir?.(item)}>
                                <span className={s.tarjetaFila}>
                                    <span className={s.tarjetaEmoji} style={{ background: colorDePop(pop) || COLORES_PROXIMOS[i % COLORES_PROXIMOS.length] }}>
                                        {emojiDePop(pop) || '✨'}
                                    </span>
                                    <span className={s.tarjetaTexto}>
                                        <b>{pop.name || item.name}</b>
                                        <small>{fechaDePop(item, lang) ?? t('pops_app_home.no_date')}</small>
                                    </span>
                                </span>
                                <MedidorPersonas n={confirmados?.[pop.id]?.total ?? 0} tope={free ? PERSONAS_FREE : null} />
                            </button>
                        )
                    })}
                </div>
            ) : (
                <p className={s.proximosVacio}>{t('pops_app_home.upcoming_empty')}</p>
            )}
        </section>
    )
}

/* ───────────── Celular (390 px, handoff §10) ─────────────
   PopsApp pone la barra, el scroll (con 16 px a los lados y el espacio de la
   barra de abajo) y la navegación; aquí solo va el contenido de Inicio. */

const SinPopsMovil = ({ t, plan, puedeCrear, onCrear, onConoce }) => (
    <TableroAzul lineas='movil' movil className={s.mVacio}>
        <img src={explosion} alt='' className={s.st} style={{ right: 22, top: 66, width: 64, '--rot': '-12deg' }} />
        <img src={globo} alt='' className={s.st} style={{ left: 16, bottom: 16, width: 50, '--rot': '-8deg' }} />
        <img src={destello} alt='' className={`${s.st} ${s.stArriba}`} style={{ right: 18, bottom: 220, width: 40, '--rot': '14deg' }} />

        {onConoce && (
            <button type='button' className={s.mVideo} onClick={onConoce}>
                <span className={s.videoPlay}><Play size={11} fill='currentColor' strokeWidth={0} /></span>
                {t('pops_app_home.watch_short', { defaultValue: 'Míralo en 1 min' })}
            </button>
        )}

        <span className={s.mTagMano}>{t('pops_app_home.how_it_works')}</span>
        <span className={`${s.mEtiqueta} ${s.etiquetaPapel}`}>{t('pops_app_home.start_today')}</span>
        <span className={`${s.mEtiqueta} ${s.etiquetaLima} ${s.mEtiquetaLima}`}>{t('pops_app_home.send_today')}</span>

        <div className={s.mTicketSombra}>
            <span aria-hidden className={s.mTicketCinta} />
            <div className={s.mTicket}>
                <div className={s.mTicketCabeza}>
                    <span className={s.ticketTitulo}>{t('pops_app_home.ticket_title')}</span>
                    <span className={s.mTicketMeta}>{t('pops_app_home.ticket_meta')}</span>
                </div>
                <ol className={s.pasos}>
                    {PASOS.map(p => (
                        <li key={p.n} className={s.mPaso}>
                            <span className={s.mPasoNum} style={{ background: p.color, color: p.tinta, '--rot': `${p.rot}deg` }}>{p.n}</span>
                            <span className={s.mPasoTexto}>
                                <b>{t(`pops_app_home.step${p.n}_title`)}</b>
                                <span>{t(`pops_app_home.step${p.n}_text`)}</span>
                            </span>
                        </li>
                    ))}
                </ol>
            </div>
        </div>

        {puedeCrear && (
            <>
                <div className={s.mCtaCaja}>
                    <button type='button' className={`${s.ctaGrande} ${s.mCta}`} onClick={onCrear}>
                        <span className={s.mCtaMas}><Plus size={24} strokeWidth={3} /></span>
                        {t('pops_app_home.make_a_pop')}
                        {!plan?.plus && <span className={s.mGratis} aria-hidden>{t('pops_app_home.free')}</span>}
                    </button>
                </div>
                {!plan?.plus && <span className={s.mNotaMano} aria-hidden>{t('pops_app_home.free_note')}</span>}
            </>
        )}
    </TableroAzul>
)

const CarruselMovil = ({ t, plan, puedeCrear, onCrear, onVerMisPops, onPasarPlus }) => {
    const [lamina, setLamina] = useState(0)
    const toque = useRef(null)

    // La marca y, solo en Free, "Conoce Pops+".
    const laminas = [
        {
            tag: t('pops_app_home.brand_tag', { defaultValue: 'POPS' }),
            t1: t('pops_app_home.brand_title_a'),
            t2: t('pops_app_home.brand_title_b'),
            d: t('pops_app_home.brand_text_short', { defaultValue: 'La cena, la junta, la posada. Todo en un link.' }),
            ...(puedeCrear
                ? { cta: t('pops_app_home.make_a_pop'), go: onCrear }
                : plan?.plus
                    ? { cta: t('pops_app_home.see_my_pops'), go: onVerMisPops }
                    : { cta: t('pops_app_home.see_prices'), go: onPasarPlus }),
        },
    ]
    // La lámina Pops+ va primero (handoff "Pops+ en la App"); en Pops+ sin CTA.
    laminas.unshift({
        tag: <>{t(plan?.plus ? 'pops_plus_app.have' : 'pops_plus_app.meet')} <MarcaPlus /></>,
        d: t('pops_plus_app.hero_text_short'),
        ...(plan?.plus ? {} : { cta: <>{t('pops_plus_app.want')} <MarcaPlus sobre='lima' /></>, go: onPasarPlus }),
        plus: true,
    })
    const total = laminas.length
    const ir = (i) => setLamina(((i % total) + total) % total)
    const l = laminas[Math.min(lamina, total - 1)]

    // Deslizar de lado (40 px) cambia de lámina; lo vertical se deja al scroll.
    const empezar = (e) => {
        const p = e.touches?.[0]
        toque.current = p ? { x: p.clientX, y: p.clientY } : null
    }
    const soltar = (e) => {
        const p = e.changedTouches?.[0]
        const ini = toque.current
        toque.current = null
        if (!p || !ini) return
        const dx = p.clientX - ini.x
        const dy = p.clientY - ini.y
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) ir(lamina + (dx < 0 ? 1 : -1))
    }

    return (
        <TableroAzul
            lineas='movil'
            movil
            className={s.mCarrusel}
            aria-roledescription='carousel'
            aria-label={t('pops_app_home.carousel_label')}
            onTouchStart={empezar}
            onTouchEnd={soltar}
        >
            <img src={corazon} alt='' className={s.st} style={{ right: 16, top: 18, width: 54, '--rot': '-14deg' }} />
            {l.plus ? (
                // Lámina Pops+ (handoff "Pops+ en la App · Celular" A): "Conoce Pops+"
                // sin fondo y tres recortes de papel escalonados que se enciman.
                <div key={`m${lamina}`} className={s.mLamina}>
                    <span className={s.mConoce}>{l.tag}</span>
                    <span className={`${s.mRecorte} ${s.mRecorte1}`}>{t('pops_plus_app.hero_1')}</span>
                    <span className={`${s.mRecorte} ${s.mRecorte2}`}>{t('pops_plus_app.hero_2')}</span>
                    <span className={`${s.mRecorte} ${s.mRecorte3}`}>{t('pops_plus_app.hero_3')}</span>
                    <span className={`${s.mTexto} ${s.mTextoPlus}`}>{l.d}</span>
                    {/* Sin botón de compra (Pops+) queda aire abajo: dos frases cortas
                        de las burbujas de escritorio, lado a lado (no agrandan el tablero). */}
                    {!l.cta && (
                        <div className={s.mBurbujas} aria-hidden>
                            {['eighty', 'pass'].map((k, i) => (
                                <span key={k} className={s.mBurbujaGrupo} style={{ '--rot': `${i ? 2 : -2}deg` }}>
                                    <span className={s.mBurbuja}>“{t(`pops_plus_app.ribbon.${k}`)}”</span>
                                    <span className={s.mBurbujaFix}>{t(`pops_plus_app.ribbon.${k}_fix`)} ✓</span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div key={`m${lamina}`} className={s.mLamina}>
                    {/* Lámina de la marca: el logo animado de Pops en lugar de la etiqueta "POPS". */}
                    <span className={s.mLogo} aria-label={l.tag}>
                        <PopsLogo size={64} color='#F3F2EE' step={0.1} autoplay={6} alMontar={0.45} />
                    </span>
                    <span className={`${s.mEtiquetaChica} ${s.etiquetaPapel} ${s.mEtiquetaChicaPapel}`}>{l.t1}</span>
                    <span className={`${s.mEtiquetaChica} ${s.etiquetaLima} ${s.mEtiquetaChicaLima}`}>{l.t2}</span>
                    <span className={s.mTexto}>{l.d}</span>
                </div>
            )}
            <div className={s.mPie}>
                {l.cta ? <button type='button' className={s.mCtaLamina} onClick={l.go}>{l.cta}</button> : <span />}
                {total > 1 && <div className={s.mPuntos}>
                    {laminas.map((x, i) => (
                        <button
                            key={i}
                            type='button'
                            className={s.mPunto}
                            data-activo={i === lamina || undefined}
                            aria-label={x.plus ? t('pops_plus_app.slide_plus') : x.tag}
                            aria-current={i === lamina || undefined}
                            onClick={() => ir(i)}
                        >
                            <span />
                        </button>
                    ))}
                </div>}
            </div>
        </TableroAzul>
    )
}

const ProximosMovil = ({ t, lang, pops, confirmados, onAbrir, onVerMisPops, free }) => {
    const lista = proximosDe(pops)
    return (
        <section className={s.mProximos}>
            <div className={s.mProximosCabeza}>
                <h3>{t('pops_app_home.upcoming_title')}</h3>
                <button type='button' className={s.mLink} onClick={onVerMisPops}>
                    {t('pops_app_home.see_all', { defaultValue: 'Ver todos →' })}
                </button>
            </div>
            {lista.length ? (
                <div className={s.mFila}>
                    {lista.map(({ item }) => {
                        const pop = item._pop ?? {}
                        const total = confirmados?.[pop.id]?.total ?? 0
                        const si = confirmados?.[pop.id]?.si ?? 0
                        return (
                            <button key={item.id ?? pop.id} type='button' className={s.mTarjeta} onClick={() => onAbrir?.(item)}>
                                <span className={s.mTarjetaEmoji}>{emojiDePop(pop) || '✨'}</span>
                                <b className={s.mTarjetaNombre}>{pop.name || item.name}</b>
                                <span className={s.mTarjetaFecha}>{fechaDePop(item, lang) ?? t('pops_app_home.no_date')}</span>
                                {/* Free y al 90 % del tope: "28 de 30 · quedan 2"; si no, confirmados. */}
                                {free && total / PERSONAS_FREE >= 0.9 ? (
                                    <span className={s.mTarjetaCuenta}>
                                        <b>{t('pops_app.of', { n: total, total: PERSONAS_FREE })}</b>
                                        {' · '}
                                        <b className={s.mQuedan}>{t('pops_plus_app.left', { count: Math.max(0, PERSONAS_FREE - total) })}</b>
                                    </span>
                                ) : (
                                    <span className={s.mTarjetaCuenta}><b>{si}</b> {t('pops_app_home.confirmed', { count: si })}</span>
                                )}
                            </button>
                        )
                    })}
                </div>
            ) : (
                <p className={s.proximosVacio}>{t('pops_app_home.upcoming_empty')}</p>
            )}
        </section>
    )
}

/* ───────────── Página ───────────── */

export const PopsAppInicio = ({
    greeting, pops = [], cargando = false, confirmados = {}, plan, aviso,
    puedeCrear, onCrear, onConoce, onAbrir, onVerMisPops, onPasarPlus, onTabla, movil = false,
}) => {
    const { t, i18n } = useTranslation()
    const lang = i18n.language?.startsWith('en') ? 'en-US' : 'es-MX'

    // Mientras cargan los Pops: esqueleto del carrusel y de "Tus próximos
    // Pops" (antes salía un momento el tablero de "Tu Pop en 4 pasos").
    if (cargando && pops.length === 0) {
        return movil ? (
            <div className={s.mPagina} aria-busy='true'>
                <h1 className={s.mSaludo}>{greeting} 👋</h1>
                <EsqueletoInicio movil />
            </div>
        ) : (
            <div aria-busy='true'>
                <h1 className={s.saludo}>{greeting} 👋</h1>
                <EsqueletoInicio />
            </div>
        )
    }

    if (movil) {
        return (
            <div className={s.mPagina}>
                {aviso}
                {pops.length === 0 ? (
                    <SinPopsMovil t={t} plan={plan} puedeCrear={puedeCrear} onCrear={onCrear} onConoce={onConoce} />
                ) : (
                    <>
                        <h1 className={s.mSaludo}>{greeting} 👋</h1>
                        <CarruselMovil
                            t={t}
                            plan={plan}
                            puedeCrear={puedeCrear}
                            onCrear={onCrear}
                            onVerMisPops={onVerMisPops}
                            onPasarPlus={onPasarPlus}
                        />
                        <ProximosMovil t={t} lang={lang} pops={pops} confirmados={confirmados} onAbrir={onAbrir} onVerMisPops={onVerMisPops} free={!plan?.plus} />
                        {/* Banda Pops+ (handoff "Pops+ en la App · Celular" A6): Free y prueba
                            gratis; en la prueba su botón abre la tabla, como la cinta. */}
                        {(!plan?.plus || plan?.prueba) && <BandaPlusMovil onTabla={onTabla} onPlus={plan?.prueba ? onTabla : onPasarPlus} prueba={Boolean(plan?.prueba)} />}
                    </>
                )}
            </div>
        )
    }

    return (
        <>
            <h1 className={s.saludo}>{greeting} 👋</h1>
            {aviso}
            {pops.length === 0 ? (
                <SinPops t={t} plan={plan} puedeCrear={puedeCrear} onCrear={onCrear} onConoce={onConoce} />
            ) : (
                <>
                    <Carrusel
                        t={t}
                        plan={plan}
                        puedeCrear={puedeCrear}
                        onCrear={onCrear}
                        onVerMisPops={onVerMisPops}
                        onPasarPlus={onPasarPlus}
                    />
                    <Proximos t={t} lang={lang} pops={pops} confirmados={confirmados} onAbrir={onAbrir} onVerMisPops={onVerMisPops} free={!plan?.plus} />
                    {/* Con Pops+ pagado ya no sale; en Free y en la prueba gratis, sí. */}
                    {(!plan?.plus || plan?.prueba) && <GratisOPlus plus={plan?.plus} onTabla={onTabla} onPlus={onPasarPlus} />}
                </>
            )}
        </>
    )
}

// Esqueleto del Inicio: el carrusel y una fila de próximos Pops.
const EsqueletoInicio = ({ movil = false }) => (
    <div className={`${s.esqueleto} ${movil ? s.esqMovil : ''}`} aria-hidden>
        <span className={`${s.esqBloque} ${s.esqCarrusel}`} />
        <span className={`${s.esqBloque} ${s.esqTitulo}`} />
        <div className={s.esqFila}>
            {[0, 1, 2].map(i => <span key={i} className={`${s.esqBloque} ${s.esqTarjeta}`} />)}
        </div>
    </div>
)

export default PopsAppInicio
