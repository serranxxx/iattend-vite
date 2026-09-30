import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { toFirstString } from '../../helpers/invitation/newInvitation'
import { fmtLong, fmtShort, initialsOf } from './plannerFormat'
import styles from './PlannerDashboard.module.css'

const pct = (n, total) => `${total ? (n / total) * 100 : 0}%`

const SEVERITY = { critical: styles.sevCritical, warning: styles.sevWarning }

const Avatar = ({ s }) => {
    const photo = toFirstString(s.invitation?.data?.cover?.image?.prod) || s.invitation?.url_image
    return (
        <span className={styles.avatar}>
            {photo ? <img src={photo} alt='' loading='lazy' /> : initialsOf(s)}
        </span>
    )
}

export const PlannerEventsTable = ({ rows, counts, filter, onFilter, activeId, onSelect, onOpen, locale }) => {
    const { t } = useTranslation()

    const daysLabel = (s) => {
        if (s.daysLeft == null) return t('planner.none')
        if (s.daysLeft === 0) return t('planner.today')
        if (s.daysLeft < 0) return t('planner.days_ago', { count: -s.daysLeft })
        return t('planner.days', { count: s.daysLeft })
    }

    const tableCell = (s) => {
        if (s.total === 0) return { text: t('planner.none'), tone: '' }
        if (s.tables === 0) return { text: t('planner.no_tables'), tone: styles.toneCritical }
        const tone = s.withoutTable >= 10 ? styles.toneCritical : s.withoutTable > 0 ? styles.toneWarning : ''
        return { text: t('planner.unseated', { count: s.withoutTable }), tone }
    }

    const FILTERS = [
        { key: 'all', label: t('planner.filter_table_all') },
        { key: 'pending', label: t('planner.filter_table_pending') },
        { key: 'month', label: t('planner.filter_table_month') },
    ]

    return (
        <section className={`${styles.card} ${styles.eventsCard}`}>
            <header className={styles.cardHead}>
                <h2 className={styles.cardTitle}>{t('planner.events_title')}</h2>
                <div className={styles.chips}>
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            type='button'
                            className={`${styles.chip} ${filter === f.key ? styles.chipActive : ''}`}
                            onClick={() => onFilter(f.key)}
                            aria-pressed={filter === f.key}
                        >
                            {f.label} · {counts[f.key]}
                        </button>
                    ))}
                </div>
            </header>

            <div className={`${styles.row} ${styles.rowHead}`} role='row'>
                <span>{t('planner.col_event')}</span>
                <span className={styles.colDays}>{t('planner.col_days')}</span>
                <span className={styles.colResponses}>{t('planner.col_responses')}</span>
                <span className={styles.colTables}>{t('planner.col_tables')}</span>
                <span className={styles.colRsvp}>{t('planner.col_rsvp')}</span>
                <span className={styles.colAction}>{t('planner.col_action')}</span>
                <span />
            </div>

            <div className={styles.rows}>
                {rows.length === 0 && <span className={styles.rowsEmpty}>{t('planner.table_empty')}</span>}
                {rows.map(s => {
                    const active = s.invitation.id === activeId
                    const table = tableCell(s)
                    const rsvpClosed = s.rsvpDaysLeft != null && s.rsvpDaysLeft < 0
                    const first = s.pending[0]
                    return (
                        <div
                            key={s.invitation.id}
                            role='row'
                            tabIndex={0}
                            className={`${styles.row} ${active ? styles.rowActive : ''}`}
                            onClick={() => onSelect(s.invitation.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter') onOpen(s.invitation.id) }}
                        >
                            <div className={styles.eventCell}>
                                <Avatar s={s} />
                                <div className={styles.eventText}>
                                    <b>{s.title}</b>
                                    <small>
                                        {s.day ? fmtLong(s.day, locale) : t('planner.no_date')}
                                        {' · '}
                                        {s.total ? t('planner.guests_count', { count: s.total }) : t('planner.no_list')}
                                    </small>
                                </div>
                            </div>

                            <span className={`${styles.days} ${styles.colDays}`}>{daysLabel(s)}</span>

                            <div className={`${styles.responses} ${styles.colResponses}`}>
                                <div className={styles.bar}>
                                    <span className={styles.barConfirmed} style={{ width: pct(s.confirmed, s.total) }} />
                                    <span className={styles.barWaiting} style={{ width: pct(s.waiting, s.total) }} />
                                    <span className={styles.barDeclined} style={{ width: pct(s.declined, s.total) }} />
                                </div>
                                <small>
                                    {s.total
                                        ? t('planner.responses_label', { pct: s.responseRate ?? 0, waiting: s.waiting })
                                        : t('planner.no_guests_yet')}
                                </small>
                            </div>

                            <span className={`${styles.tablesCell} ${styles.colTables} ${table.tone}`}>{table.text}</span>

                            <span className={`${styles.rsvpCell} ${styles.colRsvp} ${rsvpClosed ? styles.toneCritical : ''}`}>
                                {s.rsvp
                                    ? rsvpClosed ? t('planner.rsvp_closed', { date: fmtShort(s.rsvp, locale) }) : fmtShort(s.rsvp, locale)
                                    : t('planner.none')}
                            </span>

                            <div className={`${styles.action} ${styles.colAction}`}>
                                <span className={`${styles.sevDot} ${first ? SEVERITY[first.level] : styles.sevOk}`} />
                                <span className={styles.actionText}>{first ? first.text : t('planner.up_to_date')}</span>
                                {s.pending.length > 1 && <span className={styles.actionMore}>+{s.pending.length - 1}</span>}
                            </div>

                            <button
                                type='button'
                                className={styles.openBtn}
                                onClick={(e) => { e.stopPropagation(); onOpen(s.invitation.id) }}
                                aria-label={t('planner.open_event_named', { title: s.title })}
                                title={t('planner.open_event')}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
