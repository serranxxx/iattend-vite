import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { ArrowRight, SmilePlus } from 'lucide-react'
import { PopsLogo } from '../../components/PopsLogo/PopsLogo'
import { PopSticker } from '../../components/PopSticker/PopSticker'
import { colorDePop, emojiDePop } from '../../helpers/invitation/popEvents'
import { PopsBusiness } from './PopsBusiness'
import { PopsCraft } from './PopsCraft'
import { PopsTemaSwitch } from './PopsTemaSwitch'
import styles from './PopsSection.module.css'

/**
 * /invitations › Pops en escritorio (handoff "Sección Pops"): banda negra con
 * el wordmark animado, el titular y el collage de stickers, y abajo la lista
 * "Pops activos" (aviso de Pops gratis, una fila por Pop y, si hay, los que
 * ya pasaron). `movil`: la versión del celular (handoff "Pops mobile"):
 * todo hace scroll junto y crear va en el "+" de la barra inferior.
 *
 * items: los Pops en forma de invitación (popComoInvitacion, `_pop` = fila).
 * tema / onCambiarTema: estilo de la sección ('pop' | 'business' | 'craft',
 * handoff "Cambia tu estilo"); 'business' la pinta PopsBusiness y 'craft'
 * PopsCraft. El selector de estilo va arriba a la derecha en los tres.
 */

// Collage 300 × 320 (ST11 del prototipo).
const STICKERS = [
    { kind: 'burst', color: 'var(--pops-magenta)', pos: { left: 70, top: 70 }, size: 170, rot: -8, delay: 0 },
    { kind: 'bubble', color: 'var(--pops-cian)', pos: { left: 120, top: 104 }, size: 120, rot: 6, delay: 0.4 },
    { kind: 'eyes', color: 'var(--pops-amarillo-neon)', pos: { left: 6, top: 0 }, size: 96, rot: -10, delay: 1.2 },
    { kind: 'spark', color: 'var(--pops-menta)', pos: { right: 6, top: 18 }, size: 52, rot: 0, delay: 0.9 },
    { kind: 'heart', color: 'var(--pops-naranja)', pos: { left: 0, bottom: 10 }, size: 86, rot: -14, delay: 0.6 },
    { kind: 'note', color: 'var(--pops-magenta)', pos: { right: 0, bottom: 0 }, size: 80, rot: 12, delay: 1.5 },
]

// Collage del celular (150 × 150, handoff "Pops mobile"): libre del wordmark.
// Más abierto hacia la izquierda (caja de 190 × 150), igual que PopsHero.
const STICKERS_MOVIL = [
    { kind: 'burst', color: 'var(--pops-magenta)', pos: { left: 34, top: 24 }, size: 92, rot: -8, delay: 0 },
    { kind: 'bubble', color: 'var(--pops-cian)', pos: { left: 74, top: 46 }, size: 68, rot: 6, delay: 0.4 },
    { kind: 'eyes', color: 'var(--pops-amarillo-neon)', pos: { right: 0, top: -6 }, size: 50, rot: -10, delay: 1.2 },
    { kind: 'spark', color: 'var(--pops-menta)', pos: { left: 2, top: 104 }, size: 28, rot: 0, delay: 0.9 },
]

// Estado inicial (sin Pops): stickers de la tarjeta "Tu primer Pop".
const STICKERS_PRIMERO = [
    { kind: 'eyes', color: 'var(--pops-amarillo-neon)', pos: { left: 0, top: 10 }, size: 104, rot: -8, delay: 0 },
    { kind: 'spark', color: 'var(--pops-menta)', pos: { right: 10, top: 0 }, size: 56, rot: 0, delay: 0.9 },
    { kind: 'bubble', color: 'var(--pops-cian)', pos: { left: 120, top: 70 }, size: 130, rot: 8, delay: 0.4 },
    { kind: 'heart', color: 'var(--pops-naranja)', pos: { left: 20, top: 190 }, size: 76, rot: -14, delay: 0.6 },
]
const STICKERS_PRIMERO_MOVIL = [
    { kind: 'eyes', color: 'var(--pops-amarillo-neon)', pos: { left: 4, top: 14 }, size: 70, rot: -8, delay: 0 },
    { kind: 'bubble', color: 'var(--pops-cian)', pos: { left: 96, top: 8 }, size: 82, rot: 6, delay: 0.4 },
    { kind: 'spark', color: 'var(--pops-menta)', pos: { left: 190, top: 0 }, size: 36, rot: 0, delay: 0.9 },
    { kind: 'heart', color: 'var(--pops-naranja)', pos: { left: 228, top: 40 }, size: 50, rot: -14, delay: 0.6 },
]
const PASOS_PRIMERO = [
    { n: 1, color: 'var(--pops-lima)' },
    { n: 2, color: 'var(--pops-cian)' },
    { n: 3, color: 'var(--pops-rosa)' },
]

// Sin color de tema, los Pops se turnan estos (con su tinta legible).
const PALETA = [
    { fondo: 'var(--pops-azul)', tinta: '#FFF' },
    { fondo: 'var(--pops-verde)', tinta: 'var(--pops-tinta)' },
    { fondo: 'var(--pops-rojo)', tinta: '#FFF' },
]

// Luminancia relativa de un color hex (#rgb / #rrggbb); otro formato → null.
const luminancia = (color) => {
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color ?? '')?.[1]
    if (!hex) return null
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex
    const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255)
        .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Color del tema del Pop con su tinta legible; uno casi blanco se perdería
// sobre la página, así que ese (o uno sin color) toma la paleta.
const colorDeFila = (propio, i) => {
    const lum = luminancia(propio)
    if (propio && (lum === null || lum < 0.8)) {
        return { fondo: propio, tinta: lum !== null && lum > 0.35 ? 'var(--pops-tinta)' : '#FFF' }
    }
    return PALETA[i % PALETA.length]
}

/** Sticker que entra con popIn y luego flota (también lo usa la barra lateral). */
export const StickerFlotante = ({ kind, color, size, rot = 0, delay = 0, entrada = 0, indice = 0, style, className }) => (
    <span
        aria-hidden
        className={`${styles.sticker} ${className ?? ''}`}
        style={{ ...style, animationDelay: `${entrada + indice * 0.08}s` }}
    >
        <span
            className={styles.stickerFlota}
            style={{ '--r': `${rot}deg`, animationDuration: `${4 + indice * 0.7}s`, animationDelay: `${delay}s` }}
        >
            <PopSticker kind={kind} color={color} size={size} />
        </span>
    </span>
)

export const PopsSection = (props) => {
    const { movil = false, tema = 'pop', onCambiarTema } = props
    const switchTema = onCambiarTema && (
        <PopsTemaSwitch tema={tema} movil={movil} onCambiar={(nuevo, el) => onCambiarTema(nuevo, el, { movil })} />
    )
    if (tema === 'business') return <PopsBusiness {...props} switchTema={switchTema} />
    if (tema === 'craft') return <PopsCraft {...props} switchTema={switchTema} />
    return <PopsPop {...props} switchTema={switchTema} />
}

const PopsPop = ({ movil = false, greeting, items, gratisPop = 0, puedeCrear, onCrear, onComprarPop, onGratisPop, onConoce, onAbrir, switchTema }) => {
    const { t, i18n } = useTranslation()
    const hoy = dayjs().startOf('day')

    const filas = items.map((item, i) => {
        const pop = item._pop
        const fecha = item.event_date ? dayjs(item.event_date) : null
        const dias = fecha ? fecha.startOf('day').diff(hoy, 'day') : null
        const color = colorDeFila(colorDePop(pop), i)
        return { item, fecha, dias, color, emoji: emojiDePop(pop), nombre: item.name || pop?.name || t('pops_section.untitled') }
    })
    const activos = filas
        .filter(f => f.dias === null || f.dias >= 0)
        .sort((a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity))
    const pasados = filas
        .filter(f => f.dias !== null && f.dias < 0)
        .sort((a, b) => b.dias - a.dias)

    const fechaCorta = (fecha) => fecha
        .toDate()
        .toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })
        .replace('.', '')

    const chip = (dias) => (dias === 0 ? t('pops_section.today') : dias === 1 ? t('pops_section.tomorrow') : t('pops_section.in_days', { count: dias }))

    const fila = ({ item, fecha, dias, color, emoji, nombre }, pasado = false) => (
        <button key={item.id} type='button' className={`${styles.fila} ${pasado ? styles.filaPasada : ''}`} onClick={() => onAbrir(item)}>
            <span className={styles.mini} style={{ background: color.fondo, color: color.tinta }}>
                {emoji
                    ? <span className={styles.miniEmoji}>{emoji}</span>
                    // Lugar del emoji: todavía no se elige (ver emojiDePop).
                    : <SmilePlus size={22} className={styles.miniVacio} aria-label={t('pops_section.no_emoji')} />}
            </span>
            <span className={styles.filaTexto}>
                <span className={styles.filaNombre}>{nombre}{emoji ? ` ${emoji}` : ''}</span>
                <span className={styles.estado}>
                    <span className={`${styles.punto} ${pasado ? styles.puntoPasado : ''}`} />
                    {pasado ? t('pops_section.status_past') : t('pops_section.status_active')}
                </span>
            </span>
            <span className={styles.fecha}>{fecha ? fechaCorta(fecha) : t('pops_section.no_date')}</span>
            <span>
                {!pasado && dias !== null && (
                    <span className={styles.chip} style={{ background: color.fondo, color: color.tinta }}>{chip(dias)}</span>
                )}
            </span>
            <ArrowRight size={18} className={styles.flecha} />
        </button>
    )

    // Sin ningún Pop: "Tus Pops." + la tarjeta "Tu primer Pop te está esperando".
    const sinPops = items.length === 0
    const primerPop = (
        <div className={`${styles.primero} ${movil ? styles.primeroMovil : ''}`}>
            <div className={styles.primeroStickers} aria-hidden>
                {(movil ? STICKERS_PRIMERO_MOVIL : STICKERS_PRIMERO).map((s, i) => (
                    <StickerFlotante key={s.kind + i} {...s} indice={i} entrada={0.2} style={s.pos} />
                ))}
            </div>
            <div className={styles.primeroTexto}>
                <h3 className={styles.primeroTitulo}>{t('pops_section.first_title')}</h3>
                <p className={styles.primeroLede}>{t('pops_section.first_text')}</p>
                <ol className={styles.primeroPasos}>
                    {PASOS_PRIMERO.map(p => (
                        <li key={p.n}>
                            <span className={styles.primeroNumero} style={{ background: p.color }}>{p.n}</span>
                            {t(`pops_section.first_step_${p.n}`)}
                        </li>
                    ))}
                </ol>
                <div className={styles.primeroBotones}>
                    {puedeCrear && (
                        <button type='button' className={styles.primeroCrear} onClick={onCrear}>
                            <span className={styles.mas}>+</span>{t('pops_section.send')}
                        </button>
                    )}
                    {!movil && (
                        <button type='button' className={styles.primeroConoce} onClick={onConoce}>{t('pops_section.learn')}</button>
                    )}
                </div>
            </div>
        </div>
    )

    if (movil) {
        const filaMovil = ({ item, fecha, dias, color, emoji, nombre }, pasado = false) => (
            <button key={item.id} type='button' className={`${styles.mFila} ${pasado ? styles.filaPasada : ''}`} onClick={() => onAbrir(item)}>
                <span className={`${styles.mini} ${styles.mMini}`} style={{ background: color.fondo, color: color.tinta }}>
                    {emoji
                        ? <span className={styles.miniEmoji}>{emoji}</span>
                        : <SmilePlus size={20} className={styles.miniVacio} aria-label={t('pops_section.no_emoji')} />}
                </span>
                <span className={styles.filaTexto}>
                    <span className={styles.mNombre}>{nombre}</span>
                    <span className={styles.mEstado}>
                        <span className={`${styles.punto} ${styles.mPunto} ${pasado ? styles.puntoPasado : ''}`} />
                        {pasado ? t('pops_section.status_past') : t('pops_section.status_active')}
                        {` · ${fecha ? fechaCorta(fecha) : t('pops_section.no_date')}`}
                    </span>
                </span>
                {!pasado && dias !== null && (
                    <span className={`${styles.chip} ${styles.mChip}`} style={{ background: color.fondo, color: color.tinta }}>
                        {dias === 0 ? t('pops_section.today') : dias === 1 ? t('pops_section.tomorrow') : t('pops_section.days', { count: dias })}
                    </span>
                )}
            </button>
        )

        return (
            <div className={`${styles.seccion} ${styles.mSeccion}`}>
                {switchTema}
                <section className={styles.mHero}>
                    <div className={styles.mCollage}>
                        {STICKERS_MOVIL.map((s, i) => (
                            <StickerFlotante key={s.kind + i} {...s} indice={i} entrada={0.35} style={s.pos} />
                        ))}
                    </div>
                    <div className={styles.mHeroTexto}>
                        <span className={styles.mSaludo}>{greeting} 👋</span>
                        <div className={styles.mLogo}>
                            <PopsLogo size={90} color='#FFF' autoplay={6} alMontar={0.45} />
                        </div>
                        <span className={styles.mTitular}>
                            {t('pops_section.headline_a')}<br />
                            <span className={styles.resaltaRosa}>{t('pops_section.headline_b')}</span>
                        </span>
                        <span className={styles.mLede}>{t('pops_section.lede')}</span>
                        <button type='button' className={styles.mConoce} onClick={onConoce}>
                            {t('pops_section.learn')} <span>· {t('pops_section.how_it_works')}</span>
                        </button>
                    </div>
                    <svg className={styles.mZigzag} viewBox='0 0 390 40' preserveAspectRatio='none' aria-hidden>
                        <polygon points='0,26 60,12 130,30 210,8 280,24 340,10 390,20 390,40 0,40' />
                        <polyline points='0,26 60,12 130,30 210,8 280,24 340,10 390,20' />
                    </svg>
                </section>

                <section className={styles.mLista}>
                    <div className={styles.mCabeza}>
                        <div className={styles.listaTitulos} style={{ gap: 2 }}>
                            <span className={styles.mTitulo}><span className={styles.resaltaLima}>{t(sinPops ? 'pops_section.empty_title' : 'pops_section.active_title')}</span></span>
                            <span className={styles.mSub}>{sinPops ? t('pops_section.empty_sub') : t('pops_section.active_count', { count: activos.length })}</span>
                        </div>
                        {onComprarPop && !sinPops && (
                            <button type='button' className={styles.mComprar} onClick={onComprarPop}>
                                <span className={styles.mMas}>+</span>{t('pops_section.buy_short')}
                            </button>
                        )}
                    </div>

                    {gratisPop > 0 && (
                        <button type='button' className={styles.mAviso} onClick={onGratisPop}>
                            <span className={styles.mAvisoEmoji} aria-hidden>🎁</span>
                            <span className={styles.mAvisoTexto}>
                                <strong>{t(sinPops ? 'pops_section.free_have' : 'pops_section.free_title', { count: gratisPop })}</strong>
                                <span>{t(sinPops ? 'pops_section.free_first' : 'pops_section.free_text_short')}</span>
                            </span>
                            <span className={styles.mAvisoFlecha} aria-hidden>→</span>
                        </button>
                    )}

                    {sinPops ? primerPop : (
                        <div className={styles.mFilas}>
                            {activos.length > 0
                                ? activos.map(f => filaMovil(f))
                                : <p className={styles.vacio}>{t('pops_section.empty')}</p>}
                        </div>
                    )}

                    {pasados.length > 0 && (
                        <div className={styles.mFilas}>
                            <span className={styles.pasadosTitulo}>{t('pops_section.past_title')}</span>
                            {pasados.map(f => filaMovil(f, true))}
                        </div>
                    )}
                </section>
            </div>
        )
    }

    return (
        <div className={styles.seccion}>
            {switchTema}
            <section className={styles.hero}>
                <div className={styles.heroFila}>
                    <div className={styles.heroTexto}>
                        <span className={styles.saludo}>{greeting} 👋</span>
                        <div className={styles.logo}>
                            <PopsLogo size={176} color='#FFF' autoplay={6} alMontar={0.45} />
                        </div>
                        <span className={styles.titular}>
                            {t('pops_section.headline_a')} <span className={styles.resaltaRosa}>{t('pops_section.headline_b')}</span>
                        </span>
                        <span className={styles.lede}>{t('pops_section.lede')}</span>
                        <div className={styles.heroBotones}>
                            {puedeCrear && (
                                <button type='button' className={styles.botonLima} onClick={onCrear}>{t('pops_section.send')} ↗</button>
                            )}
                            <button type='button' className={styles.botonContorno} onClick={onConoce}>{t('pops_section.learn')}</button>
                        </div>
                    </div>
                    <div className={styles.collage}>
                        {STICKERS.map((s, i) => (
                            <StickerFlotante key={s.kind + i} {...s} indice={i} entrada={0.35} style={s.pos} />
                        ))}
                    </div>
                </div>
                <svg className={styles.zigzag} viewBox='0 0 1200 80' preserveAspectRatio='none' aria-hidden>
                    <polygon points='0,52 140,30 260,58 420,18 560,44 700,10 830,48 980,22 1100,50 1200,32 1200,0 0,0' />
                    <polyline points='0,52 140,30 260,58 420,18 560,44 700,10 830,48 980,22 1100,50 1200,32' />
                </svg>
            </section>

            <section className={styles.lista}>
                <div className={styles.listaCabeza}>
                    <div className={styles.listaTitulos}>
                        <h2 className={styles.listaTitulo}><span className={styles.resaltaLima}>{t(sinPops ? 'pops_section.empty_title' : 'pops_section.active_title')}</span></h2>
                        <span className={styles.listaSub}>{sinPops ? t('pops_section.empty_sub') : t('pops_section.active_count', { count: activos.length })}</span>
                    </div>
                    {onComprarPop && (
                        <button type='button' className={styles.comprarPop} onClick={onComprarPop}>
                            <span className={styles.mas}>+</span>{t('pops_section.buy')}
                        </button>
                    )}
                </div>

                <div className={styles.listaCuerpo}>
                    {gratisPop > 0 && (
                        <div className={styles.aviso}>
                            <div className={styles.avisoTexto}>
                                <span className={styles.avisoEmoji} aria-hidden>🎁</span>
                                <div>
                                    <strong>{t('pops_section.free_title', { count: gratisPop })}</strong>
                                    <span>{t('pops_section.free_text')}</span>
                                </div>
                            </div>
                            <button type='button' className={styles.avisoBoton} onClick={onGratisPop}>{t('pops_section.free_cta')} →</button>
                        </div>
                    )}

                    {sinPops ? primerPop : (
                        <div className={styles.filas}>
                            {activos.length > 0
                                ? activos.map(f => fila(f))
                                : <p className={styles.vacio}>{t('pops_section.empty')}</p>}
                        </div>
                    )}

                    {pasados.length > 0 && (
                        <div className={styles.filas}>
                            <span className={styles.pasadosTitulo}>{t('pops_section.past_title')}</span>
                            {pasados.map(f => fila(f, true))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}

export default PopsSection
