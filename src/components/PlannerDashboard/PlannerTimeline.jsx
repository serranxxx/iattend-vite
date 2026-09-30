import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { fmtShort } from './plannerFormat'
import styles from './PlannerDashboard.module.css'

const WINDOW_DAYS = 150

const leftOf = (days) => `${(days / WINDOW_DAYS) * 100}%`

// Próximos 5 meses: eventos (rojos si tienen un pendiente crítico), side
// events y el inicio de cada mes, en escala de días desde hoy.
export const PlannerTimeline = ({ scope, activeId, onSelect, today, locale, visible, onToggle }) => {
    const { t } = useTranslation()

    const months = []
    for (let m = today.add(1, 'month').startOf('month'); m.diff(today, 'day') <= WINDOW_DAYS; m = m.add(1, 'month')) {
        const label = m.locale(locale).format('MMM').replace('.', '')
        months.push({ key: m.format('YYYY-MM'), left: leftOf(m.diff(today, 'day')), label: label[0].toUpperCase() + label.slice(1) })
    }

    const inWindow = (days) => days != null && days >= 0 && days <= WINDOW_DAYS
    const events = scope.filter(s => inWindow(s.daysLeft))
    const sideDots = scope.flatMap(s => s.sideEvents
        .map(se => se.slot?.day ? dayjs(se.slot.day).diff(today, 'day') : null)
        .filter(inWindow)
        .map((days, i) => ({ key: `${s.invitation.id}-${i}`, left: leftOf(days) })))

    return (
        <div className={styles.timeline}>
            <div className={styles.timelineHead}>
                <span className={styles.timelineLegend}>
                    <b>{t('planner.timeline_title')}</b>
                    <span><i className={styles.dotEvent} />{t('planner.legend_event')}</span>
                    <span><i className={styles.dotUrgent} />{t('planner.legend_urgent')}</span>
                    <span><i className={styles.dotSide} />{t('planner.legend_side')}</span>
                </span>
                <span className={styles.timelineToday}>
                    {t('planner.today_label', { date: fmtShort(today, locale) })}
                    <button
                        type='button'
                        className={styles.timelineToggle}
                        onClick={onToggle}
                        aria-expanded={visible}
                        title={t(visible ? 'planner.timeline_hide' : 'planner.timeline_show')}
                    >
                        <ChevronDown size={12} strokeWidth={1.6} className={visible ? styles.chevronUp : undefined} />
                    </button>
                </span>
            </div>

            {/* Siempre montada: se colapsa con transición (ver .trackWrap) */}
            <div className={`${styles.trackWrap} ${visible ? '' : styles.trackWrapHidden}`} aria-hidden={!visible} inert={!visible}>
                <div className={styles.trackInner}>
                    <div className={styles.track}>
                        <span className={styles.trackLine} />
                        <span className={styles.trackToday} />
                        {months.map(m => (
                            <span key={m.key} className={styles.trackMonth} style={{ left: m.left }}>{m.label}</span>
                        ))}
                        {sideDots.map(d => (
                            <span key={d.key} className={styles.trackSide} style={{ left: d.left }} />
                        ))}
                        {events.map(s => {
                            const active = s.invitation.id === activeId
                            const urgent = s.pending.some(p => p.level === 'critical')
                            return (
                                <button
                                    key={s.invitation.id}
                                    type='button'
                                    className={`${styles.trackEvent} ${active ? styles.trackEventActive : ''}`}
                                    style={{ left: leftOf(s.daysLeft) }}
                                    onClick={() => onSelect(s.invitation.id)}
                                    title={s.title}
                                >
                                    <span className={styles.trackDate}>{fmtShort(s.day, locale)}</span>
                                    <span className={`${styles.trackDot} ${urgent ? styles.trackDotUrgent : ''}`} />
                                    <span className={styles.trackName}>{s.title}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
