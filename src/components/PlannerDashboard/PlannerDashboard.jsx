import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { useNavigate } from 'react-router-dom'
import { Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, CalendarHeart, Info, LayoutGrid, Sparkles, Users } from 'lucide-react'
import { toFirstString } from '../../helpers/invitation/newInvitation'
import { buildAlerts, buildStats, fetchPlannerData } from './plannerData'
import { PlannerCalendar } from './PlannerCalendar'
import styles from './PlannerDashboard.module.css'

const Kpi = ({ icon, label, value, hint }) => (
    <div className={styles.kpi}>
        <span className={styles.kpiIcon}>{icon}</span>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={styles.kpiValue}>{value}</span>
        {hint && <span className={styles.kpiHint}>{hint}</span>}
    </div>
)

// Barra apilada de respuestas: confirmados / esperando / rechazados / sin enviar.
const RsvpBar = ({ s }) => {
    if (!s.total) return <div className={styles.bar}><span className={styles.barEmpty} /></div>
    const pct = (n) => `${(n / s.total) * 100}%`
    return (
        <div className={styles.bar}>
            <span className={styles.barConfirmed} style={{ width: pct(s.confirmed) }} />
            <span className={styles.barWaiting} style={{ width: pct(s.waiting) }} />
            <span className={styles.barDeclined} style={{ width: pct(s.declined) }} />
            <span className={styles.barNotSent} style={{ width: pct(s.notSent) }} />
        </div>
    )
}

export const PlannerDashboard = ({ invitations }) => {
    const { t, i18n } = useTranslation()
    const locale = i18n.language?.startsWith('en') ? 'en' : 'es'
    const navigate = useNavigate()

    const [data, setData] = useState(null)
    const [error, setError] = useState(false)
    // null = todos los eventos
    const [selectedId, setSelectedId] = useState(null)

    const ids = useMemo(() => (invitations ?? []).map(i => i.id), [invitations])
    const idsKey = ids.join(',')

    useEffect(() => {
        let cancelled = false
        setData(null)
        setError(false)
        fetchPlannerData(ids)
            .then(result => { if (!cancelled) setData(result) })
            .catch(err => {
                console.error('Error al cargar los datos del planner:', err)
                if (!cancelled) setError(true)
            })
        return () => { cancelled = true }
    }, [idsKey])

    const statsList = useMemo(() => {
        if (!data) return []
        const today = dayjs().startOf('day')
        return (invitations ?? [])
            .map(inv => buildStats(inv, data, today))
            // Próximas primero por fecha; las ya celebradas y sin fecha al final.
            .sort((a, b) => {
                const rank = (s) => (s.daysLeft == null ? 2 : s.daysLeft < 0 ? 1 : 0)
                return rank(a) - rank(b) || String(a.day).localeCompare(String(b.day))
            })
    }, [data, invitations])

    // Todo el tablero (indicadores, pendientes, calendario y tarjetas) sale de
    // esta lista, así que filtrar aquí filtra todo.
    const shown = useMemo(
        () => (selectedId ? statsList.filter(s => s.invitation.id === selectedId) : statsList),
        [statsList, selectedId]
    )

    const upcoming = shown.filter(s => s.daysLeft != null && s.daysLeft >= 0)
    const alerts = useMemo(() => buildAlerts(shown, t), [shown, t])

    const totals = useMemo(() => shown.reduce((acc, s) => {
        acc.guests += s.total
        acc.confirmed += s.confirmed
        acc.waiting += s.waiting
        acc.withoutTable += s.withoutTable
        acc.sideEvents += s.sideEvents.length
        return acc
    }, { guests: 0, confirmed: 0, waiting: 0, withoutTable: 0, sideEvents: 0 }), [shown])

    const openEvent = (id) => navigate(`/dashboard?${new URLSearchParams({ id })}`)

    const countdown = (s) => {
        if (s.daysLeft == null) return t('planner.no_date')
        if (s.daysLeft === 0) return t('planner.today')
        if (s.daysLeft < 0) return t('planner.days_ago', { count: -s.daysLeft })
        return t('planner.days_left', { count: s.daysLeft })
    }

    if (!invitations?.length) {
        return (
            <div className={styles.empty}>
                <CalendarHeart size={32} />
                <span className={styles.emptyTitle}>{t('planner.empty_title')}</span>
                <span className={styles.muted}>{t('planner.empty_text')}</span>
            </div>
        )
    }

    if (error) {
        return <div className={styles.empty}><span className={styles.muted}>{t('planner.load_error')}</span></div>
    }

    if (!data) {
        return <div className={styles.empty}><span className={styles.muted}>{t('planner.loading')}</span></div>
    }

    const next = upcoming[0]

    return (
        <div className={styles.dashboard}>
            <div className={styles.toolbar}>
                <Select
                    showSearch
                    value={selectedId ?? 'all'}
                    onChange={(value) => setSelectedId(value === 'all' ? null : value)}
                    optionFilterProp='label'
                    className={styles.eventFilter}
                    options={[
                        { value: 'all', label: t('planner.filter_all', { count: statsList.length }) },
                        ...statsList.map(s => ({ value: s.invitation.id, label: s.title })),
                    ]}
                />
            </div>

            <div className={styles.kpis}>
                <Kpi
                    icon={<CalendarHeart size={18} />}
                    label={t('planner.kpi_events')}
                    value={upcoming.length}
                    hint={next ? t('planner.kpi_next', { title: next.title, when: countdown(next) }) : t('planner.kpi_no_next')}
                />
                <Kpi
                    icon={<Users size={18} />}
                    label={t('planner.kpi_guests')}
                    value={totals.guests}
                    hint={t('planner.kpi_confirmed', {
                        count: totals.confirmed,
                        pct: totals.guests ? Math.round((totals.confirmed / totals.guests) * 100) : 0,
                    })}
                />
                <Kpi
                    icon={<Info size={18} />}
                    label={t('planner.kpi_waiting')}
                    value={totals.waiting}
                    hint={t('planner.kpi_waiting_hint')}
                />
                <Kpi
                    icon={<LayoutGrid size={18} />}
                    label={t('planner.kpi_no_table')}
                    value={totals.withoutTable}
                    hint={t('planner.kpi_no_table_hint')}
                />
                <Kpi
                    icon={<Sparkles size={18} />}
                    label={t('planner.kpi_side')}
                    value={totals.sideEvents}
                    hint={t(selectedId ? 'planner.kpi_side_hint_event' : 'planner.kpi_side_hint')}
                />
            </div>

            <div className={styles.columns}>
                <section className={`${styles.panel} ${styles.alertsPanel}`}>
                    <header className={styles.panelHead}>
                        <span className={styles.panelTitle}>{t('planner.alerts_title')}</span>
                        <span className={styles.badge}>{alerts.length}</span>
                    </header>
                    {alerts.length === 0 ? (
                        <span className={styles.muted}>{t('planner.alerts_empty')}</span>
                    ) : (
                        <ul className={styles.alerts}>
                            {alerts.map(a => (
                                <li key={a.id}>
                                    <button type='button' className={styles.alert} onClick={() => openEvent(a.event.invitation.id)}>
                                        <span className={`${styles.alertIcon} ${styles[`alert_${a.level}`]}`}>
                                            <AlertTriangle size={14} />
                                        </span>
                                        <span className={styles.alertText}>
                                            <b>{a.event.title}</b>
                                            <small>{a.text}</small>
                                        </span>
                                        <span className={styles.alertWhen}>{countdown(a.event)}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <PlannerCalendar key={selectedId ?? 'all'} statsList={shown} />
            </div>

            <section className={styles.eventsSection}>
                <span className={styles.panelTitle}>{t('planner.events_title')}</span>
                <div className={styles.events}>
                    {shown.map(s => {
                        const cover = toFirstString(s.invitation?.data?.cover?.image?.prod)
                        const soon = s.daysLeft != null && s.daysLeft >= 0 && s.daysLeft <= 14
                        return (
                            <article key={s.invitation.id} className={styles.event}>
                                <div className={styles.eventHead}>
                                    <div className={styles.eventThumb}>
                                        {cover ? <img src={cover} alt='' loading='lazy' /> : <CalendarHeart size={18} />}
                                    </div>
                                    <div className={styles.eventTitle}>
                                        <b>{s.title}</b>
                                        <small>
                                            {s.day
                                                ? dayjs(s.day).locale(locale).format(locale === 'en' ? 'MMM D, YYYY' : 'D MMM YYYY')
                                                : t('planner.no_date')}
                                        </small>
                                    </div>
                                    <span className={`${styles.countdown} ${soon ? styles.countdownSoon : ''}`}>
                                        {countdown(s)}
                                    </span>
                                </div>

                                <div className={styles.rsvp}>
                                    <div className={styles.rsvpTop}>
                                        <span>{t('planner.guests_count', { count: s.total })}</span>
                                        {s.responseRate != null && (
                                            <span className={styles.muted}>{t('planner.response_rate', { pct: s.responseRate })}</span>
                                        )}
                                    </div>
                                    <RsvpBar s={s} />
                                    <div className={styles.rsvpLegend}>
                                        <span><i className={styles.barConfirmed} />{s.confirmed} {t('planner.st_confirmed')}</span>
                                        <span><i className={styles.barWaiting} />{s.waiting} {t('planner.st_waiting')}</span>
                                        <span><i className={styles.barDeclined} />{s.declined} {t('planner.st_declined')}</span>
                                        <span><i className={styles.barNotSent} />{s.notSent} {t('planner.st_not_sent')}</span>
                                    </div>
                                </div>

                                <dl className={styles.facts}>
                                    <div>
                                        <dt>{t('planner.fact_tables')}</dt>
                                        <dd>
                                            {s.tables
                                                ? t('planner.tables_value', { count: s.tables, capacity: s.capacity })
                                                : t('planner.none')}
                                            {s.withoutTable > 0 && (
                                                <em className={styles.warn}>{t('planner.without_table', { count: s.withoutTable })}</em>
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>{t('planner.fact_side')}</dt>
                                        <dd>
                                            {s.sideEvents.length
                                                ? s.sideEvents.map(se => se.name || '—').join(', ')
                                                : t('planner.none')}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>{t('planner.fact_rsvp')}</dt>
                                        <dd>
                                            {s.rsvp
                                                ? dayjs(s.rsvp).locale(locale).format(locale === 'en' ? 'MMM D' : 'D MMM')
                                                : t('planner.none')}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>{t('planner.fact_special')}</dt>
                                        <dd>{s.specialNeeds || t('planner.none')}</dd>
                                    </div>
                                    <div>
                                        <dt>{t('planner.fact_itinerary')}</dt>
                                        <dd>{s.itinerary.length ? t('planner.moments', { count: s.itinerary.length }) : t('planner.none')}</dd>
                                    </div>
                                </dl>

                                <button type='button' className={styles.open} onClick={() => openEvent(s.invitation.id)}>
                                    {t('planner.open_event')} <ArrowRight size={14} />
                                </button>
                            </article>
                        )
                    })}
                </div>
            </section>
        </div>
    )
}
