import { useTranslation } from 'react-i18next'
import { ArrowRight, Mail, MessageCircle } from 'lucide-react'
import { ADVISOR_WHATSAPP, SUPPORT_EMAIL, advisorWhatsappUrl } from '../../helpers/contact'
import { DESTINOS } from './liaDestinos'
import styles from './LiaBlocks.module.css'


// Bloques que manda el backend en `blocks` (models/lia.bloques.js). Los datos
// ya vienen resueltos y validados por el servidor: aquí solo se dibujan.

const iniciales = (nombre = '') => nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('')

const pct = (parte, total) => (total > 0 ? Math.min(100, Math.round((parte / total) * 100)) : 0)

const claseDeEstado = (state) => {
    if (state === 'confirmado' || state === 'asistente') return styles.stateConfirmed
    if (state === 'rechazado') return styles.stateDeclined
    return ''
}

const ListaInvitados = ({ block, t }) => (
    <ul className={styles.list}>
        {block.invitados.map(g => (
            <li key={g.id} className={styles.row}>
                <span className={styles.avatar} aria-hidden="true">{iniciales(g.name)}</span>
                <span className={styles.name}>{g.name}</span>
                <span className={styles.meta}>
                    <em className={`${styles.state} ${claseDeEstado(g.state)}`}>
                        {t(`lia.blocks.state.${g.state}`, { defaultValue: g.state })}
                    </em>
                    {g.table && <span>{t('lia.blocks.table', { number: g.table.number })}</span>}
                </span>
            </li>
        ))}
    </ul>
)

const Barra = ({ block, t }) => {
    const porcentaje = pct(block.ocupados, block.total)
    return (
        <>
            <div
                className={styles.track}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={block.total}
                aria-valuenow={block.ocupados}
                aria-label={t(`lia.blocks.bar_${block.subtipo}`, { used: block.ocupados, total: block.total })}
            >
                <span className={styles.fill} style={{ width: `${porcentaje}%` }} />
            </div>
            <span className={styles.caption}>
                {t(`lia.blocks.bar_${block.subtipo}`, { used: block.ocupados, total: block.total })}
            </span>
        </>
    )
}

const ESTADOS_RESUMEN = [
    { key: 'confirmados', clase: styles.cConfirmed },
    { key: 'esperando', clase: styles.cWaiting },
    { key: 'por_invitar', clase: styles.cPending },
    { key: 'no_asistiran', clase: styles.cDeclined },
]

const ResumenRsvp = ({ block, t }) => (
    <>
        <div className={styles.segments} aria-hidden="true">
            {ESTADOS_RESUMEN.map(({ key, clase }) => (
                <span key={key} className={clase} style={{ width: `${pct(block[key], block.total)}%` }} />
            ))}
        </div>
        <ul className={styles.legend}>
            {ESTADOS_RESUMEN.map(({ key, clase }) => (
                <li key={key} className={styles.legendItem}>
                    <span className={`${styles.dot} ${clase}`} aria-hidden="true" />
                    {t(`lia.blocks.rsvp_${key}`)}
                    <strong>{block[key]}</strong>
                </li>
            ))}
        </ul>
    </>
)

// Un tarjeta por anfitrión, lado a lado: total, barra por estado y conteos.
const ComparacionLados = ({ block, t }) => (
    <>
        <div className={styles.sides}>
            {block.lados.map(lado => (
                <div key={lado.nombre} className={styles.side}>
                    <div className={styles.sideHead}>
                        <span className={styles.avatar} aria-hidden="true">{iniciales(lado.nombre)}</span>
                        <span className={styles.name}>{t('lia.blocks.side_of', { name: lado.nombre })}</span>
                    </div>
                    <strong className={styles.sideTotal}>{t('lia.blocks.guests_count', { count: lado.total })}</strong>
                    <div className={styles.segments} aria-hidden="true">
                        {ESTADOS_RESUMEN.map(({ key, clase }) => (
                            <span key={key} className={clase} style={{ width: `${pct(lado[key], lado.total)}%` }} />
                        ))}
                    </div>
                    <ul className={styles.sideStats}>
                        {ESTADOS_RESUMEN.map(({ key, clase }) => (
                            <li key={key}>
                                <span className={`${styles.dot} ${clase}`} aria-hidden="true" />
                                {t(`lia.blocks.rsvp_${key}`)}
                                <strong>{lado[key]}</strong>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
        {block.sin_lado > 0 && <span className={styles.caption}>{t('lia.blocks.no_side', { count: block.sin_lado })}</span>}
    </>
)

const Mesas = ({ block, t }) => (
    <ul className={styles.list}>
        {block.mesas.map(m => (
            <li key={m.number} className={styles.table}>
                <span className={styles.name}>
                    {t('lia.blocks.table', { number: m.number })}{m.name ? ` — ${m.name}` : ''}
                </span>
                <span className={styles.count}>{t('lia.blocks.seats', { seated: m.seated, size: m.size })}</span>
                <div className={styles.track} aria-hidden="true">
                    <span className={`${styles.fill} ${m.seated >= m.size ? styles.fillFull : ''}`} style={{ width: `${pct(m.seated, m.size)}%` }} />
                </div>
            </li>
        ))}
    </ul>
)

// "2026-10-13 19:00:00" es hora de pared (ver helpers/assets/eventDateTime.js):
// se formatea en UTC para que el día y la hora no se muevan.
const fechaDePared = (valor, lang) => {
    const m = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
    if (!m) return null
    const fecha = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]))
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-MX', {
        timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    }).format(fecha)
}

const SideEvents = ({ block, t, lang }) => (
    <ul className={styles.list}>
        {block.eventos.map(se => (
            <li key={se.id} className={styles.sideEvent}>
                <div className={styles.sideEventHead}>
                    <span className={styles.name}>{se.name}</span>
                    <span className={styles.count}>{t('lia.blocks.se_confirmed', { confirmed: se.confirmados, total: se.total })}</span>
                </div>
                {(se.date || se.place) && (
                    <span className={styles.caption}>
                        {[fechaDePared(se.date, lang), se.place].filter(Boolean).join(' · ')}
                    </span>
                )}
                <div className={styles.segments} aria-hidden="true">
                    {ESTADOS_RESUMEN.map(({ key, clase }) => (
                        <span key={key} className={clase} style={{ width: `${pct(se[key], se.total)}%` }} />
                    ))}
                </div>
            </li>
        ))}
    </ul>
)

const Atajo = ({ block, onAtajo }) => (
    <button type="button" className={styles.shortcut} onClick={() => onAtajo?.(block.destino)}>
        <span>{block.etiqueta}</span>
        <ArrowRight size={16} aria-hidden="true" />
    </button>
)

const Soporte = ({ block, t }) => (
    <div className={styles.support}>
        <p className={styles.supportText}>{block.titulo || t('lia.blocks.support_text')}</p>
        <div className={styles.supportActions}>
            <a
                className={styles.shortcut}
                href={advisorWhatsappUrl(t('lia.blocks.support_draft'))}
                target="_blank"
                rel="noopener noreferrer"
            >
                <MessageCircle size={16} aria-hidden="true" />
                <span>{t('lia.blocks.support_whatsapp', { phone: ADVISOR_WHATSAPP.replace(/^\+52/, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') })}</span>
            </a>
            <a className={styles.shortcutGhost} href={`mailto:${SUPPORT_EMAIL}`}>
                <Mail size={16} aria-hidden="true" />
                <span>{SUPPORT_EMAIL}</span>
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
                        {block.titulo && <p className={styles.title}>{block.titulo}</p>}
                        <Componente block={block} t={t} lang={lang} onAtajo={onAtajo} />
                    </section>
                )
            })}
        </div>
    )
}
