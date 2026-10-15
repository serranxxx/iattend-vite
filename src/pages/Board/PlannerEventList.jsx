import { useState } from 'react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Zap } from 'lucide-react'
import { toFirstString } from '../../helpers/invitation/newInvitation'
import { fmtLong } from '../../components/PlannerDashboard/plannerFormat'
import styles from './PlannerEventList.module.css'

/**
 * Mis clientes / Mis eventos del planner (PlannerLayout).
 *   Próximos: las tarjetas de siempre con sus números (días, confirmados,
 *   esperando), ordenadas por fecha; las que no tienen fecha al final.
 *   Historial: los que ya pasaron, plegado, en tarjetas horizontales con
 *   cuántos llegaron (lector de pases) o, si no se usó, cuántos confirmaron.
 * statsPorId: buildStats de cada invitación (los Eventos Flash no tienen).
 */
export const PlannerEventList = ({ items, statsPorId, renderInvitationCard, onAbrir }) => {
    const { t, i18n } = useTranslation()
    const locale = i18n.language?.startsWith('en') ? 'en' : 'es'
    // null = lo que toca por defecto: abierto si no hay próximos pero sí historial.
    const [historialElegido, setVerHistorial] = useState(null)

    const hoy = dayjs().startOf('day')
    const fechaDe = (inv) => (inv.event_date ? String(inv.event_date).slice(0, 10) : null)
    const diasDe = (inv) => {
        const fecha = fechaDe(inv)
        return fecha ? dayjs(fecha).diff(hoy, 'day') : null
    }

    const proximos = items
        .filter(inv => { const d = diasDe(inv); return d == null || d >= 0 })
        .sort((a, b) => {
            const da = diasDe(a); const db = diasDe(b)
            if (da == null) return db == null ? 0 : 1
            if (db == null) return -1
            return da - db
        })
    const historial = items
        .filter(inv => { const d = diasDe(inv); return d != null && d < 0 })
        .sort((a, b) => diasDe(b) - diasDe(a))

    const verHistorial = historialElegido ?? (proximos.length === 0 && historial.length > 0)

    const tituloDe = (inv) => statsPorId[inv.id]?.title
        || inv.data?.cover?.title?.text?.value
        || inv.name
        || t('side_events.no_name')

    // Siempre confirmaciones (confirmados + los que ya llegaron), también en
    // el historial: las asistencias del lector de pases son pocas o ninguna y
    // daban porcentajes como "1 de 133 asistieron".
    const asistencia = (inv) => {
        const s = statsPorId[inv.id]
        if (inv._flash || !s) return null
        if (s.total > 0) return { parte: s.confirmed, total: s.total, texto: t('planner_list.confirmed', { count: s.total }) }
        return null
    }

    return (
        <div className={styles.lista}>
            <section>
                <header className={styles.cabeza}>
                    <h2 className={styles.titulo}>{t('planner_list.upcoming')}</h2>
                    <span className={styles.nota}>{t('planner_list.upcoming_hint')}</span>
                </header>
                {proximos.length > 0 ? (
                    <div className={styles.tarjetas}>
                        {proximos.map(inv => renderInvitationCard(inv, statsPorId[inv.id] ? { stats: statsPorId[inv.id] } : undefined))}
                    </div>
                ) : (
                    <p className={styles.sinProximos}>{t('planner_list.no_upcoming')}</p>
                )}
            </section>

            {historial.length > 0 && (
                <section className={styles.historial}>
                    <header className={styles.cabeza}>
                        <h2 className={`${styles.titulo} ${styles.tituloHistorial}`}>{t('planner_list.history')}</h2>
                        <span className={styles.nota}>{t('planner_list.history_count', { count: historial.length })}</span>
                        <button
                            type='button'
                            className={styles.toggle}
                            aria-expanded={verHistorial}
                            onClick={() => setVerHistorial(!verHistorial)}
                        >
                            {verHistorial ? t('planner_list.hide_history') : t('planner_list.show_history')}
                            <ChevronDown size={16} className={verHistorial ? styles.girado : ''} />
                        </button>
                    </header>

                    {verHistorial && (
                        <div className={styles.pasados}>
                            {historial.map(inv => {
                                const foto = toFirstString(inv.data?.cover?.image?.prod)
                                const a = asistencia(inv)
                                const pct = a && a.total ? Math.round((a.parte / a.total) * 100) : null
                                return (
                                    <button key={inv.id} type='button' className={styles.pasado} onClick={() => onAbrir(inv)}>
                                        <span className={styles.pasadoCabeza}>
                                            <span className={styles.miniatura}>
                                                {foto ? <img src={foto} alt='' loading='lazy' /> : inv._flash ? <Zap size={20} /> : null}
                                            </span>
                                            <span className={styles.pasadoTexto}>
                                                <strong>{tituloDe(inv)}</strong>
                                                <small>{t('planner_list.ended', { date: fmtLong(fechaDe(inv), locale) })}</small>
                                            </span>
                                            <span className={styles.badge}>
                                                {inv._flash ? t('invitations.flash_badge') : t('planner_list.finished')}
                                            </span>
                                        </span>
                                        {a ? (
                                            <>
                                                <span className={styles.asistencia}>
                                                    <span><b>{a.parte}</b> {a.texto}</span>
                                                    <b className={styles.pct}>{pct}%</b>
                                                </span>
                                                <span className={styles.barra}><span style={{ width: `${pct}%` }} /></span>
                                            </>
                                        ) : (
                                            <span className={styles.asistencia}>
                                                <span className={styles.sinDatos}>{t('planner_list.no_data')}</span>
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </section>
            )}
        </div>
    )
}
