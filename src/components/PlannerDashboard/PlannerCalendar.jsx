import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight, Heart, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from './PlannerDashboard.module.css'

// Se arma lunes → domingo, como el calendario de México.
const WEEK_START = 1

const buildEntries = (statsList) => {
    const byDay = new Map()
    const push = (day, entry) => {
        if (!day) return
        if (!byDay.has(day)) byDay.set(day, [])
        byDay.get(day).push(entry)
    }

    statsList.forEach(s => {
        // El itinerario no trae fecha propia: todos sus momentos son del día
        // de la boda, así que viajan dentro de la entrada del evento.
        push(s.day, { type: 'wedding', id: s.invitation.id, title: s.title, stats: s })
        s.sideEvents.forEach(se => {
            if (!se.slot) return
            push(se.slot.day, {
                type: 'side', id: `side-${se.id}`, title: se.name || '—', time: se.slot.time, stats: s,
            })
        })
    })

    return byDay
}

export const PlannerCalendar = ({ statsList }) => {
    const { t, i18n } = useTranslation()
    const locale = i18n.language?.startsWith('en') ? 'en' : 'es'
    const today = dayjs().format('YYYY-MM-DD')

    const entries = useMemo(() => buildEntries(statsList), [statsList])

    // Arranca en el mes de la próxima boda (o el actual si no hay ninguna).
    const firstUpcoming = useMemo(
        () => statsList.map(s => s.day).filter(d => d && d >= today).sort()[0] ?? today,
        [statsList, today]
    )
    const [month, setMonth] = useState(() => dayjs(firstUpcoming).startOf('month'))
    const [selected, setSelected] = useState(firstUpcoming)

    const cells = useMemo(() => {
        const offset = (month.day() - WEEK_START + 7) % 7
        const start = month.subtract(offset, 'day')
        return Array.from({ length: 42 }, (_, i) => start.add(i, 'day'))
    }, [month])

    const weekdays = useMemo(
        () => Array.from({ length: 7 }, (_, i) =>
            dayjs().day((WEEK_START + i) % 7).locale(locale).format('dd')),
        [locale]
    )

    const agenda = (entries.get(selected) ?? [])
        .slice()
        .sort((a, b) => (a.type === 'wedding' ? -1 : 1) - (b.type === 'wedding' ? -1 : 1)
            || String(a.time ?? '').localeCompare(String(b.time ?? '')))

    return (
        <section className={`${styles.panel} ${styles.calendarPanel}`}>
            <header className={styles.panelHead}>
                <span className={styles.panelTitle}>{t('planner.calendar_title')}</span>
                <div className={styles.monthNav}>
                    <button type='button' aria-label={t('planner.prev_month')} onClick={() => setMonth(m => m.subtract(1, 'month'))}>
                        <ChevronLeft size={16} />
                    </button>
                    <span className={styles.monthLabel}>{month.locale(locale).format('MMMM YYYY')}</span>
                    <button type='button' aria-label={t('planner.next_month')} onClick={() => setMonth(m => m.add(1, 'month'))}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </header>

            <div className={styles.calendarBody}>
                <div className={styles.grid}>
                    {weekdays.map(w => <span key={w} className={styles.weekday}>{w}</span>)}
                    {cells.map(d => {
                        const key = d.format('YYYY-MM-DD')
                        const dayEntries = entries.get(key) ?? []
                        const hasWedding = dayEntries.some(e => e.type === 'wedding')
                        const hasSide = dayEntries.some(e => e.type === 'side')
                        return (
                            <button
                                key={key}
                                type='button'
                                onClick={() => setSelected(key)}
                                className={[
                                    styles.day,
                                    d.month() !== month.month() ? styles.dayOut : '',
                                    key === today ? styles.dayToday : '',
                                    key === selected ? styles.daySelected : '',
                                    hasWedding ? styles.dayWedding : '',
                                ].join(' ')}
                            >
                                <span>{d.date()}</span>
                                {(hasWedding || hasSide) && (
                                    <span className={styles.dots}>
                                        {hasWedding && <i className={styles.dotWedding} />}
                                        {hasSide && <i className={styles.dotSide} />}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                <div className={styles.agenda}>
                    <span className={styles.agendaDate}>
                        {dayjs(selected).locale(locale).format(locale === 'en' ? 'dddd, MMMM D' : 'dddd D [de] MMMM')}
                    </span>

                    {agenda.length === 0 ? (
                        <span className={styles.muted}>{t('planner.calendar_empty')}</span>
                    ) : agenda.map(entry => entry.type === 'wedding' ? (
                        <div key={entry.id} className={styles.agendaWedding}>
                            <div className={styles.agendaEventName}>
                                <Heart size={14} /> {entry.title}
                            </div>
                            {entry.stats.itinerary.length === 0 ? (
                                <span className={styles.muted}>{t('planner.no_itinerary')}</span>
                            ) : (
                                <ol className={styles.timeline}>
                                    {entry.stats.itinerary.map(item => (
                                        <li key={item.id ?? item.name}>
                                            <span className={styles.timelineTime}>{item.time || '—'}</span>
                                            <span className={styles.timelineText}>
                                                <b>{item.name}</b>
                                                {item.place && <small>{item.place}</small>}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    ) : (
                        <div key={entry.id} className={styles.agendaSide}>
                            <Sparkles size={14} />
                            <span>
                                <b>{entry.title}</b>
                                <small>{entry.stats.title}{entry.time ? ` · ${entry.time}` : ''}</small>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <footer className={styles.legend}>
                <span><i className={styles.dotWedding} /> {t('planner.legend_wedding')}</span>
                <span><i className={styles.dotSide} /> {t('planner.legend_side')}</span>
            </footer>
        </section>
    )
}
