import { useRef, useState } from 'react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Play, Plus } from 'lucide-react'
import { PopsLogo } from '../../../components/PopsLogo/PopsLogo'
import { TableroAzul } from '../../../components/TableroAzul/TableroAzul'
import { colorDePop, emojiDePop } from '../../../helpers/invitation/popEvents'
import { PRECIO_PLUS } from './usePlanPops'
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
import temporada3 from '../../../assets/pops-azul/inicio-season-3.webp'
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

const Carrusel = ({ t, plan, puedeCrear, onCrear, onVerMisPops, onPasarPlus }) => {
    const [lamina, setLamina] = useState(0)

    // La marca y, solo en Free, "Conoce Pops+".
    const promos = [
        null,
        ...(plan?.plus ? [] : [{ k: 'plus', fotos: [temporada1, temporada3], ir: onPasarPlus }]),
    ]
    const total = promos.length
    const ir = (i) => setLamina(((i % total) + total) % total)
    const promo = promos[Math.min(lamina, total - 1)]
    const etiquetas = promos.map(p => (p ? t(`pops_app_home.${p.k}_tag`) : t('pops_app_home.slide_brand')))

    return (
        <TableroAzul lineas='hero' className={s.carrusel} aria-roledescription='carousel' aria-label={t('pops_app_home.carousel_label')}>
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
                <div key={`l${lamina}`} className={s.lamina}>
                    <Polaroid src={promo.fotos[0]} pie={t(`pops_app_home.${promo.k}_cap1`)} className={s.polaroidPromo1} />
                    <Polaroid src={promo.fotos[1]} pie={t(`pops_app_home.${promo.k}_cap2`)} className={s.polaroidPromo2} />
                    <img src={destello} alt='' aria-hidden className={s.destelloPromo} />
                    <img src={tijeras} alt='' aria-hidden className={s.tijeras} style={{ height: 150 }} />
                    <div className={`${s.texto} ${s.textoPromo}`}>
                        <span className={s.tagPromo}>{t(`pops_app_home.${promo.k}_tag`)}</span>
                        <h2 className={s.tituloPromo}>
                            {t(`pops_app_home.${promo.k}_title_a`)}{' '}
                            <span className={s.resaltado}>{t(`pops_app_home.${promo.k}_title_b`)}</span>
                        </h2>
                        <span className={s.parrafo}>{t(`pops_app_home.${promo.k}_text`, { price: PRECIO_PLUS })}</span>
                        <button type='button' className={s.ctaPromo} onClick={promo.ir}>
                            <span className={s.ctaPromoIco}><ArrowRight size={18} strokeWidth={2.6} /></span>
                            {t(`pops_app_home.${promo.k}_cta`)}
                        </button>
                    </div>
                </div>
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

const Proximos = ({ t, lang, pops, confirmados, onAbrir, onVerMisPops }) => {
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
                        const si = confirmados?.[pop.id]?.si ?? 0
                        return (
                            <button key={item.id ?? pop.id} type='button' className={s.tarjeta} onClick={() => onAbrir?.(item)}>
                                <span className={s.tarjetaEmoji} style={{ background: colorDePop(pop) || COLORES_PROXIMOS[i % COLORES_PROXIMOS.length] }}>
                                    {emojiDePop(pop) || '✨'}
                                </span>
                                <span className={s.tarjetaTexto}>
                                    <b>{pop.name || item.name}</b>
                                    <small>{fechaDePop(item, lang) ?? t('pops_app_home.no_date')}</small>
                                </span>
                                <span className={s.tarjetaCuenta}>
                                    <b>{si}</b>
                                    <small>{t('pops_app_home.confirmed', { count: si })}</small>
                                </span>
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
        ...(plan?.plus ? [] : ['plus']).map(k => ({
            tag: t(`pops_app_home.${k}_tag`),
            t1: t(`pops_app_home.${k}_title_a`),
            t2: t(`pops_app_home.${k}_title_b`),
            d: t(`pops_app_home.${k}_text`, { price: PRECIO_PLUS }),
            cta: t(`pops_app_home.${k}_cta`),
            go: k === 'plus' ? onPasarPlus : onVerMisPops,
        })),
    ]
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
            <div key={`m${lamina}`} className={s.mLamina}>
                <span className={s.mTag}>{l.tag}</span>
                <span className={`${s.mEtiquetaChica} ${s.etiquetaPapel} ${s.mEtiquetaChicaPapel}`}>{l.t1}</span>
                <span className={`${s.mEtiquetaChica} ${s.etiquetaLima} ${s.mEtiquetaChicaLima}`}>{l.t2}</span>
                <span className={s.mTexto}>{l.d}</span>
            </div>
            <div className={s.mPie}>
                <button type='button' className={s.mCtaLamina} onClick={l.go}>{l.cta}</button>
                {total > 1 && <div className={s.mPuntos}>
                    {laminas.map((x, i) => (
                        <button
                            key={i}
                            type='button'
                            className={s.mPunto}
                            data-activo={i === lamina || undefined}
                            aria-label={x.tag}
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

const ProximosMovil = ({ t, lang, pops, confirmados, onAbrir, onVerMisPops }) => {
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
                        const si = confirmados?.[pop.id]?.si ?? 0
                        return (
                            <button key={item.id ?? pop.id} type='button' className={s.mTarjeta} onClick={() => onAbrir?.(item)}>
                                <span className={s.mTarjetaEmoji}>{emojiDePop(pop) || '✨'}</span>
                                <b className={s.mTarjetaNombre}>{pop.name || item.name}</b>
                                <span className={s.mTarjetaFecha}>{fechaDePop(item, lang) ?? t('pops_app_home.no_date')}</span>
                                <span className={s.mTarjetaCuenta}><b>{si}</b> {t('pops_app_home.confirmed', { count: si })}</span>
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

const PlusMovil = ({ t, onPasarPlus }) => (
    <div className={s.mPlus}>
        <span className={s.mPlusTexto}>
            <span className={s.mPlusLogo}>Pops<span>+</span></span>
            <span className={s.mPlusDesc}>
                {t('pops_app_home.plus_card_text', { defaultValue: 'Pops y personas ilimitados, 500 MB y sin publicidad.' })}
            </span>
        </span>
        <button type='button' className={s.mPlusBoton} onClick={onPasarPlus}>
            {t('pops_app_home.plus_card_price', { price: PRECIO_PLUS, defaultValue: '${{price}}/mes' })}
        </button>
    </div>
)

/* ───────────── Página ───────────── */

export const PopsAppInicio = ({
    greeting, pops = [], cargando = false, confirmados = {}, plan, aviso,
    puedeCrear, onCrear, onConoce, onAbrir, onVerMisPops, onPasarPlus, movil = false,
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
                        <ProximosMovil t={t} lang={lang} pops={pops} confirmados={confirmados} onAbrir={onAbrir} onVerMisPops={onVerMisPops} />
                        {!plan?.plus && <PlusMovil t={t} onPasarPlus={onPasarPlus} />}
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
                    <Proximos t={t} lang={lang} pops={pops} confirmados={confirmados} onAbrir={onAbrir} onVerMisPops={onVerMisPops} />
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
