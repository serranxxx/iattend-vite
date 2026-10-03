import { useTranslation } from 'react-i18next'
import { ArrowRight, Mail, MessageCircle } from 'lucide-react'
import { ADVISOR_WHATSAPP, SUPPORT_EMAIL, advisorWhatsappUrl } from '../../helpers/contact'
import { DESTINOS } from './liaDestinos'
import styles from './LiaBlocks.module.css'


// Bloques que manda el backend en `blocks` (models/lia.bloques.js). Los datos
// ya vienen resueltos y validados por el servidor: aquí solo se dibujan.
// Cada bloque es una tarjeta con la cifra principal arriba y el detalle abajo.

const iniciales = (nombre = '') => nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('')

const pct = (parte, total) => (total > 0 ? Math.min(100, Math.round((parte / total) * 100)) : 0)

const claseDeEstado = (state) => {
    if (state === 'confirmado' || state === 'asistente') return styles.pillConfirmed
    if (state === 'rechazado') return styles.pillDeclined
    if (state === 'creado') return styles.pillPending
    return styles.pillWaiting
}

const ESTADOS_RESUMEN = [
    { key: 'confirmados', clase: styles.cConfirmed },
    { key: 'esperando', clase: styles.cWaiting },
    { key: 'por_invitar', clase: styles.cPending },
    { key: 'no_asistiran', clase: styles.cDeclined },
]

// Colores de cada lado: el primero en lila y el segundo en verde, como la
// barra de proporción.
const COLORES_LADO = ['#D2BFDD', '#AAC187', '#E0D3E8', '#8FB7D9']

// Barra por estado con separación entre segmentos. Los estados en cero no se
// dibujan: si no, quedarían huecos dobles entre segmentos.
const Segmentos = ({ conteos, total, fina }) => (
    <div className={`${styles.segments} ${fina ? styles.segmentsThin : ''}`} aria-hidden="true">
        {ESTADOS_RESUMEN.filter(({ key }) => conteos[key] > 0).map(({ key, clase }) => (
            <span key={key} className={clase} style={{ width: `${pct(conteos[key], total)}%` }} />
        ))}
    </div>
)

const Track = ({ porcentaje, lleno, delgado }) => (
    <div className={`${styles.track} ${delgado ? styles.trackThin : ''}`} aria-hidden="true">
        <span className={`${styles.fill} ${lleno ? styles.fillFull : ''}`} style={{ width: `${porcentaje}%` }} />
    </div>
)

const ListaInvitados = ({ block, t }) => (
    <div className={`${styles.card} ${styles.cardList}`}>
        <div className={styles.listHead}>
            <span className={styles.label}>{block.titulo || t('lia.blocks.guests_title')}</span>
            <span className={styles.label}>{block.invitados.length}</span>
        </div>
        <ul className={styles.list}>
            {block.invitados.map(g => (
                <li key={g.id} className={styles.row}>
                    <span className={styles.avatar} aria-hidden="true">{iniciales(g.name)}</span>
                    <span className={styles.rowText}>
                        <span className={styles.name}>{g.name}</span>
                        <span className={styles.sub}>
                            {g.table ? t('lia.blocks.table', { number: g.table.number }) : t('lia.blocks.no_table')}
                        </span>
                    </span>
                    <span className={`${styles.pill} ${claseDeEstado(g.state)}`}>
                        {t(`lia.blocks.state.${g.state}`, { defaultValue: g.state })}
                    </span>
                </li>
            ))}
        </ul>
    </div>
)

const Barra = ({ block, t }) => {
    const porcentaje = pct(block.ocupados, block.total)
    return (
        <div
            className={styles.card}
            role="group"
            aria-label={t(`lia.blocks.bar_${block.subtipo}`, { used: block.ocupados, total: block.total })}
        >
            {block.titulo && <span className={styles.label}>{block.titulo}</span>}
            <div className={styles.headline}>
                <div className={styles.figure}>
                    <span className={styles.numberMd}>{block.ocupados}</span>
                    <span className={styles.figureOf}>{t(`lia.blocks.bar_${block.subtipo}_of`, { total: block.total })}</span>
                </div>
                <span className={styles.pctText}>{porcentaje}%</span>
            </div>
            <Track porcentaje={porcentaje} />
        </div>
    )
}

const ResumenRsvp = ({ block, t }) => (
    <div className={styles.card}>
        <div className={styles.headline}>
            <div className={styles.figureStack}>
                <span className={styles.label}>{block.titulo || t('lia.blocks.rsvp_title')}</span>
                <div className={styles.figure}>
                    <span className={styles.numberLg}>{block.confirmados}</span>
                    <span className={styles.figureOf}>{t('lia.blocks.of_guests', { total: block.total })}</span>
                </div>
            </div>
            <span className={styles.pctPill}>{pct(block.confirmados, block.total)}%</span>
        </div>
        <Segmentos conteos={block} total={block.total} />
        <ul className={styles.legend}>
            {ESTADOS_RESUMEN.map(({ key, clase }) => (
                <li key={key} className={styles.legendItem}>
                    <span className={`${styles.dot} ${clase}`} aria-hidden="true" />
                    {t(`lia.blocks.rsvp_${key}`)}
                    <strong>{block[key]}</strong>
                </li>
            ))}
        </ul>
    </div>
)

// Barra de proporción entre lados y una columna por anfitrión, con divisor.
const ComparacionLados = ({ block, t }) => {
    const suma = block.lados.reduce((acc, l) => acc + l.total, 0)
    return (
        <div className={`${styles.card} ${styles.cardRoomy}`}>
            <span className={styles.label}>{block.titulo || t('lia.blocks.sides_title')}</span>
            <div className={styles.share}>
                <div className={styles.segments} aria-hidden="true">
                    {block.lados.filter(l => l.total > 0).map((lado, i) => (
                        <span key={lado.nombre} style={{ width: `${pct(lado.total, suma)}%`, background: COLORES_LADO[i % COLORES_LADO.length] }} />
                    ))}
                </div>
                <div className={styles.shareLegend}>
                    {block.lados.map(lado => (
                        <span key={lado.nombre}>{lado.nombre} · <strong>{lado.total}</strong></span>
                    ))}
                </div>
            </div>
            <div className={styles.sides} style={{ gridTemplateColumns: `repeat(${block.lados.length}, minmax(0, 1fr))` }}>
                {block.lados.map((lado, i) => (
                    <div key={lado.nombre} className={styles.side}>
                        <div className={styles.sideHead}>
                            <span className={styles.avatarSm} style={{ background: COLORES_LADO[i % COLORES_LADO.length] }} aria-hidden="true">
                                {iniciales(lado.nombre)}
                            </span>
                            <span className={styles.name}>{t('lia.blocks.side_of', { name: lado.nombre })}</span>
                        </div>
                        <Segmentos conteos={lado} total={lado.total} fina />
                        <ul className={styles.sideStats}>
                            {ESTADOS_RESUMEN.map(({ key, clase }) => (
                                <li key={key}>
                                    <span className={`${styles.dotSm} ${clase}`} aria-hidden="true" />
                                    {t(`lia.blocks.rsvp_${key}`)}
                                    <strong>{lado[key]}</strong>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            {block.sin_lado > 0 && <span className={styles.caption}>{t('lia.blocks.no_side', { count: block.sin_lado })}</span>}
        </div>
    )
}

// Responde "¿dónde hay lugar?": cifra de lugares libres arriba y las mesas
// ordenadas por lugares libres, con las llenas atenuadas.
const Mesas = ({ block, t }) => {
    const mesas = block.mesas
        .map(m => ({ ...m, libres: Math.max(0, m.size - m.seated) }))
        .sort((a, b) => b.libres - a.libres)
    const lugares = mesas.reduce((acc, m) => acc + Number(m.size || 0), 0)
    const ocupados = mesas.reduce((acc, m) => acc + Math.min(m.seated, m.size), 0)

    return (
        <div className={styles.card}>
            {block.titulo && <span className={styles.label}>{block.titulo}</span>}
            <div className={styles.figure}>
                <span className={styles.numberMd}>{lugares - ocupados}</span>
                <span className={styles.figureOf}>{t('lia.blocks.tables_free', { total: lugares })}</span>
            </div>
            <Track porcentaje={pct(ocupados, lugares)} />
            <ul className={styles.tables}>
                {mesas.map(m => {
                    const llena = m.libres <= 0
                    return (
                        <li key={m.number} className={`${styles.tableTile} ${llena ? styles.tableFull : ''}`}>
                            <div className={styles.tableHead}>
                                <span className={styles.tableName}>{t('lia.blocks.table', { number: m.number })}</span>
                                <span className={llena ? styles.tagFull : styles.tagFree}>
                                    {llena ? t('lia.blocks.table_full') : t('lia.blocks.table_free', { count: m.libres })}
                                </span>
                            </div>
                            <span className={styles.sub}>
                                {[m.name, t('lia.blocks.seats', { seated: m.seated, size: m.size })].filter(Boolean).join(' · ')}
                            </span>
                            <Track porcentaje={pct(m.seated, m.size)} lleno={llena} delgado />
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

// "2026-10-13 19:00:00" es hora de pared (ver helpers/assets/eventDateTime.js):
// se formatea en UTC para que el día y la hora no se muevan.
const fechaDePared = (valor, lang) => {
    const m = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
    if (!m) return null
    const fecha = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]))
    const fmt = (opciones) => new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-MX', { timeZone: 'UTC', ...opciones }).format(fecha)
    return {
        dia: fmt({ day: 'numeric' }),
        mes: fmt({ month: 'short' }).replace('.', ''),
        hora: fmt({ hour: 'numeric', minute: '2-digit' }),
    }
}

const SideEvents = ({ block, t, lang }) => (
    <div className={`${styles.card} ${styles.cardList}`}>
        {block.titulo && <span className={`${styles.label} ${styles.listHead}`}>{block.titulo}</span>}
        <ul className={styles.list}>
            {block.eventos.map(se => {
                const fecha = fechaDePared(se.date, lang)
                return (
                    <li key={se.id} className={styles.sideEvent}>
                        <div className={styles.dateBlock} aria-hidden={!fecha}>
                            <span className={styles.dateDay}>{fecha?.dia ?? '—'}</span>
                            {fecha && <span className={styles.dateMonth}>{fecha.mes}</span>}
                        </div>
                        <div className={styles.sideEventBody}>
                            <div className={styles.sideEventHead}>
                                <span className={styles.sideEventName}>{se.name}</span>
                                <span className={styles.sideEventCount} title={t('lia.blocks.se_confirmed', { confirmed: se.confirmados, total: se.total })}>
                                    <strong>{se.confirmados}</strong>/{se.total}
                                </span>
                            </div>
                            {(fecha || se.place) && (
                                <span className={styles.sub}>{[fecha?.hora, se.place].filter(Boolean).join(' · ')}</span>
                            )}
                            <Segmentos conteos={se} total={se.total} fina />
                        </div>
                    </li>
                )
            })}
        </ul>
    </div>
)

const Atajo = ({ block, onAtajo }) => (
    <button type="button" className={styles.action} onClick={() => onAtajo?.(block.destino)}>
        <span>{block.etiqueta}</span>
        <ArrowRight size={14} aria-hidden="true" />
    </button>
)

const Soporte = ({ block, t }) => (
    <div className={styles.support}>
        {block.titulo && <p className={styles.supportText}>{block.titulo}</p>}
        <div className={styles.supportActions}>
            <a
                className={styles.action}
                href={advisorWhatsappUrl(t('lia.blocks.support_draft'))}
                target="_blank"
                rel="noopener noreferrer"
            >
                <MessageCircle size={14} aria-hidden="true" />
                <span>{t('lia.blocks.support_whatsapp', { phone: ADVISOR_WHATSAPP.replace(/^\+52/, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') })}</span>
            </a>
            <a className={styles.actionGhost} href={`mailto:${SUPPORT_EMAIL}`} title={SUPPORT_EMAIL}>
                <Mail size={14} aria-hidden="true" />
                <span>{t('lia.blocks.support_email')}</span>
            </a>
        </div>
    </div>
)

const COMPONENTES = {
    lista_invitados: ListaInvitados,
    barra: Barra,
    resumen_rsvp: ResumenRsvp,
    mesas: Mesas,
    comparacion_lados: ComparacionLados,
    side_events: SideEvents,
    atajo: Atajo,
    soporte: Soporte,
}

export const LiaBlocks = ({ blocks, onAtajo }) => {
    const { t, i18n } = useTranslation()
    const lang = i18n.language?.startsWith('en') ? 'en' : 'es'
    const validos = (blocks ?? []).filter(b => COMPONENTES[b?.tipo] && (b.tipo !== 'atajo' || DESTINOS[b.destino]))
    if (!validos.length) return null

    return (
        <div className={styles.blocks}>
            {validos.map((block, i) => {
                const Componente = COMPONENTES[block.tipo]
                return (
                    <section key={i} className={styles.block} aria-label={block.titulo || undefined}>
                        <Componente block={block} t={t} lang={lang} onAtajo={onAtajo} />
                    </section>
                )
            })}
        </div>
    )
}
