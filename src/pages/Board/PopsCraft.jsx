import { useState } from 'react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { SmilePlus } from 'lucide-react'
import { emojiDePop } from '../../helpers/invitation/popEvents'
import { horaDePop, useConfirmados } from './popsDatos'
import styles from './PopsCraft.module.css'

/**
 * /invitations › Pops con el estilo Craft (handoff "Cambia tu estilo", 3
 * estilos): hecho a mano. El fondo es un tapete de corte verde; arriba el
 * saludo, "PARA LO QUE / SURJA," con el sticker de estrella "Pops" y la
 * tarjeta de papel "Pop de la semana"; abajo un tablero de corcho con la
 * etiqueta "Pops activos.", el sticky de Pops gratis y la lista en una hoja
 * de papel con cinta. En celular: pestañas de papel (Activos / Pasados) y una
 * tira de papel por Pop. Mismas props que PopsSection.
 */

// Resaltados de cada Pop (cuadro del emoji y chip de "faltan"), turnándose.
const RESALTES = ['var(--craft-azul)', 'var(--craft-lima)', 'var(--craft-rosa)']

// Inclinaciones de las tiras del celular (look hecho a mano).
const GIROS = [-0.6, 0.6, -0.4, 0.5]

/** Cinta adhesiva: ancho, posición (% del ancho) y giro. */
const Cinta = ({ ancho = 90, x = 50, giro = -3, color }) => (
    <span aria-hidden className={styles.cinta} style={{ width: ancho, left: `${x}%`, marginLeft: -ancho / 2, transform: `rotate(${giro}deg)`, ...(color ? { '--cinta': color } : {}) }} />
)

/** Sticker de estrella "Pops" (borde blanco, amarillo encima). */
const Estrella = ({ className }) => (
    <span aria-hidden className={`${styles.estrella} ${className ?? ''}`}>
        <span className={styles.estrellaBlanca} />
        <span className={styles.estrellaAmarilla}><span>Pops</span></span>
    </span>
)

export const PopsCraft = ({ movil = false, greeting, items, gratisPop = 0, puedeCrear, onCrear, onComprarPop, onGratisPop, onConoce, onAbrir, switchTema }) => {
    const { t, i18n } = useTranslation()
    const hoy = dayjs().startOf('day')
    const [pestana, setPestana] = useState('activos')

    const filas = items.map((item) => {
        const pop = item._pop
        const fecha = item.event_date ? dayjs(item.event_date) : null
        const dias = fecha ? fecha.startOf('day').diff(hoy, 'day') : null
        return { item, popId: pop?.id, fecha, dias, hora: horaDePop(pop), emoji: emojiDePop(pop), nombre: item.name || pop?.name || t('pops_section.untitled') }
    })
    const activos = filas
        .filter(f => f.dias === null || f.dias >= 0)
        .sort((a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity))
    const pasados = filas
        .filter(f => f.dias !== null && f.dias < 0)
        .sort((a, b) => b.dias - a.dias)
    const sinPops = items.length === 0
    const confirmados = useConfirmados(activos.map(f => f.popId).filter(Boolean))

    const fechaCorta = (fecha) => fecha
        .toDate()
        .toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })
        .replace('.', '')
    const faltan = (dias, corto) => (dias === 0
        ? t('pops_section.today')
        : dias === 1 ? t('pops_section.tomorrow')
            : t(corto ? 'pops_section.days' : 'pops_section.in_days', { count: dias }))

    const estado = (f, pasado) => {
        if (pasado) return t('pops_section.status_past')
        const c = confirmados[f.popId]
        return c?.total ? t('pops_section.craft_status', { si: c.si, total: c.total }) : t('pops_section.status_active')
    }

    const fila = (f, i, pasado = false) => {
        const color = RESALTES[i % RESALTES.length]
        return (
            <button key={f.item.id} type='button' className={`${styles.fila} ${pasado ? styles.pasada : ''}`} onClick={() => onAbrir(f.item)}>
                <span className={styles.cuadro} style={{ background: color }}>
                    {f.emoji || <SmilePlus size={22} aria-label={t('pops_section.no_emoji')} />}
                </span>
                <span className={styles.filaTexto}>
                    <span className={styles.nombre}>{f.nombre}</span>
                    <span className={styles.estado}>
                        <span className={`${styles.punto} ${pasado ? styles.puntoPasado : ''}`} />
                        {estado(f, pasado)}
                    </span>
                </span>
                <span className={styles.fecha}>{f.fecha ? fechaCorta(f.fecha) : t('pops_section.no_date')}</span>
                <span>
                    {!pasado && f.dias !== null && (
                        <span className={styles.chip} style={{ background: color }}>{faltan(f.dias)}</span>
                    )}
                </span>
                <span className={styles.flecha} aria-hidden>→</span>
            </button>
        )
    }

    // Celular: una tira de papel por Pop, con cinta de color (washi), el
    // emoji en su cuadro girado, fecha · hora · confirmados y el chip.
    const tira = (f, i, pasado = false) => {
        const color = RESALTES[i % RESALTES.length]
        const c = confirmados[f.popId]
        return (
            <button
                key={f.item.id}
                type='button'
                className={`${styles.tira} ${pasado ? styles.pasada : ''}`}
                style={{ transform: `rotate(${GIROS[i % GIROS.length]}deg)` }}
                onClick={() => onAbrir(f.item)}
            >
                <Cinta ancho={56} x={i % 2 ? 72 : 28} giro={i % 2 ? -5 : 4} color={`color-mix(in srgb, ${color} 80%, transparent)`} />
                <span className={styles.tiraCuadro} style={{ background: color }} aria-hidden>
                    {f.emoji || <SmilePlus size={18} />}
                </span>
                <span className={styles.tiraTexto}>
                    <span className={styles.tiraNombre}>{f.nombre}</span>
                    <span className={styles.tiraFecha}>
                        {f.fecha ? fechaCorta(f.fecha) : t('pops_section.no_date')}
                        {f.hora ? ` · ${f.hora}` : ''}
                        {pasado ? ` · ${t('pops_section.status_past')}` : c?.total ? ` · ${c.si}/${c.total}` : ''}
                    </span>
                </span>
                {!pasado && f.dias !== null && (
                    <span className={styles.tiraChip} style={{ background: color }}>{faltan(f.dias, true)}</span>
                )}
            </button>
        )
    }

    const sticky = gratisPop > 0 && (
        <div className={styles.sticky}>
            <Cinta ancho={movil ? 50 : 90} giro={movil ? 5 : 3} />
            <span className={styles.stickyEmoji} aria-hidden>🎁</span>
            <span className={styles.stickyTexto}>
                <span className={styles.stickyTitulo}>{t(sinPops ? 'pops_section.free_have' : 'pops_section.free_title', { count: gratisPop })}</span>
                {!movil && <span className={styles.stickySub}>{t(sinPops ? 'pops_section.free_first' : 'pops_section.free_text')}</span>}
            </span>
            {movil
                ? <button type='button' className={styles.stickyFlecha} onClick={onGratisPop} aria-label={t('pops_section.free_cta')}>→</button>
                : <button type='button' className={styles.botonPapel} onClick={onGratisPop}>{t('pops_section.free_cta')} →</button>}
        </div>
    )

    // Sin Pops: hoja con los tres pasos.
    const primero = (
        <div className={styles.hoja}>
            <Cinta x={22} giro={-4} />
            <Cinta x={78} giro={4} />
            <div className={styles.primero}>
                <span className={styles.primeroTitulo}>{t('pops_section.first_title')}</span>
                <p className={styles.primeroTexto}>{t('pops_section.first_text')}</p>
                <ol className={styles.pasos}>
                    {[1, 2, 3].map(n => (
                        <li key={n}><span className={styles.pasoNumero} style={{ background: RESALTES[n - 1] }}>{n}</span>{t(`pops_section.first_step_${n}`)}</li>
                    ))}
                </ol>
                {puedeCrear && <button type='button' className={styles.botonVerde} onClick={onCrear}>{t('pops_section.send')} ↗</button>}
            </div>
        </div>
    )

    const saludo = `${greeting}\u00a0✌️`

    if (movil) {
        const lista = pestana === 'pasados' ? pasados : activos
        return (
            <div className={`${styles.seccion} ${styles.movil}`}>
                {switchTema}
                <section className={styles.mHero}>
                    <span className={styles.saludo}>{saludo}</span>
                    <span className={styles.paraLoQue}>{t('pops_section.craft_headline_a')}</span>
                    <span className={styles.surjaCaja}>
                        <span className={styles.surja}>{t('pops_section.craft_headline_b')}</span>
                        <Estrella className={styles.mEstrella} />
                    </span>
                    <button type='button' className={styles.mConoce} onClick={onConoce}>▷ {t('pops_section.learn')}</button>
                </section>

                {!sinPops && (
                    <div className={styles.pestanas} role='tablist'>
                        <button type='button' role='tab' aria-selected={pestana === 'activos'} className={styles.pestana} data-on={pestana === 'activos' || undefined} onClick={() => setPestana('activos')}>
                            {t('pops_section.craft_tab_active')} {activos.length}
                        </button>
                        {pasados.length > 0 && (
                            <button type='button' role='tab' aria-selected={pestana === 'pasados'} className={styles.pestana} data-on={pestana === 'pasados' || undefined} onClick={() => setPestana('pasados')}>
                                {t('pops_section.past_title')} {pasados.length}
                            </button>
                        )}
                        {onComprarPop && (
                            <button type='button' className={styles.mComprar} onClick={onComprarPop}>
                                <span className={styles.comprarMas}>+</span>{t('pops_section.buy_short')}
                            </button>
                        )}
                    </div>
                )}

                <section className={styles.mCorcho}>
                    {sticky}
                    {sinPops ? primero : lista.length > 0
                        ? lista.map((f, i) => tira(f, i, pestana === 'pasados'))
                        : <p className={styles.vacioPapel}>{t('pops_section.empty')}</p>}
                </section>
            </div>
        )
    }

    return (
        <div className={styles.seccion}>
            {switchTema}
            <section className={styles.hero}>
                <div className={styles.heroTexto}>
                    <span className={styles.saludo}>{saludo}</span>
                    <span className={styles.paraLoQue}>{t('pops_section.craft_headline_a')}</span>
                    <span className={styles.surjaCaja}>
                        <span className={styles.surja}>{t('pops_section.craft_headline_b')}</span>
                        <Estrella />
                    </span>
                </div>
                <div className={styles.semana}>
                    <Cinta x={30} giro={-4} />
                    <span className={styles.semanaEtiqueta}>{t('pops_section.craft_week')}</span>
                    <span className={styles.semanaTitulo}>{t('pops_section.headline_b')}</span>
                    <span className={styles.semanaSub}>{t('pops_section.craft_week_sub')}</span>
                    <span className={styles.semanaTexto}>{t('pops_section.lede')}</span>
                    <div className={styles.semanaBotones}>
                        {puedeCrear && <button type='button' className={styles.botonVerde} onClick={onCrear}>{t('pops_section.send')} ↗</button>}
                        <button type='button' className={styles.botonContorno} onClick={onConoce}>▷ {t('pops_section.learn')}</button>
                    </div>
                </div>
            </section>

            <section className={styles.corcho}>
                <div className={styles.cabeza}>
                    <div className={styles.etiquetaPapel}>
                        <Cinta ancho={80} x={40} giro={-3} />
                        <span className={styles.titulo}>
                            {(sinPops ? t('pops_section.empty_title') : t('pops_section.active_title')).split(' ')[0]}{' '}
                            <span className={styles.resalte}>{(sinPops ? t('pops_section.empty_title') : t('pops_section.active_title')).split(' ').slice(1).join(' ')}</span>
                        </span>
                        <span className={styles.sub}>{sinPops ? t('pops_section.empty_sub') : t('pops_section.active_count', { count: activos.length })}</span>
                    </div>
                    {onComprarPop && (
                        <button type='button' className={styles.comprar} onClick={onComprarPop}>
                            <span className={styles.comprarMas}>+</span>{t('pops_section.buy')}
                        </button>
                    )}
                </div>

                {sticky}

                {sinPops ? primero : (
                    <div className={styles.hoja}>
                        <Cinta x={22} giro={-4} />
                        <Cinta x={78} giro={4} />
                        <div className={styles.columnas} aria-hidden>
                            <span /><span>{t('pops_section.biz_col_event')}</span><span>{t('pops_section.biz_col_date')}</span><span>{t('pops_section.biz_col_left')}</span><span />
                        </div>
                        {activos.length > 0
                            ? activos.map((f, i) => fila(f, i))
                            : <p className={styles.vacio}>{t('pops_section.empty')}</p>}
                        {pasados.length > 0 && (
                            <>
                                <span className={styles.pasadosTitulo}>{t('pops_section.past_title')}</span>
                                {pasados.map((f, i) => fila(f, i, true))}
                            </>
                        )}
                    </div>
                )}
            </section>
        </div>
    )
}

export default PopsCraft
