import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { startTimeOf } from './plannerData'
import { fmtTime } from './plannerFormat'
import styles from './PlannerDashboard.module.css'

const KIND = { event: styles.agendaEvent, side: styles.agendaSide, custom: styles.agendaCustom }

const emptyForm = (today) => ({ title: '', date: today.format('YYYY-MM-DD'), time: '', place: '' })

// Agenda estilo Apple: hoy a la izquierda y lo siguiente (eventos, side
// events y eventos personales del planner) a la derecha.
export const PlannerAgenda = ({ scope, customEvents, onAddCustom, today, locale }) => {
    const { t } = useTranslation()
    const [formOpen, setFormOpen] = useState(false)
    const [form, setForm] = useState(() => emptyForm(today))

    const todayKey = today.format('YYYY-MM-DD')

    const items = useMemo(() => {
        const list = []
        scope.forEach(s => {
            if (s.day) {
                const start = startTimeOf(s)
                list.push({
                    key: `e-${s.invitation.id}`, day: s.day, time: start.time, kind: 'event',
                    title: s.invitation.label === 'wedding' ? t('planner.agenda_wedding', { title: s.title }) : s.title,
                    sub: [start.label, start.place].filter(Boolean).join(' · ') || t('planner.agenda_event'),
                })
            }
            s.sideEvents.forEach(se => {
                if (!se.slot?.day) return
                list.push({
                    key: `s-${se.id}`, day: se.slot.day, time: se.slot.time, kind: 'side',
                    title: se.name, sub: t('planner.agenda_side', { title: s.title }),
                })
            })
        })
        customEvents.forEach(c => list.push({
            key: `c-${c.id}`, day: c.date, time: c.time || null, kind: 'custom', title: c.title,
            sub: [fmtTime(c.time), c.place || t('planner.agenda_personal')].filter(Boolean).join(' · '),
        }))
        return list
            .filter(item => item.day >= todayKey)
            .sort((a, b) => `${a.day}${a.time ?? '99'}`.localeCompare(`${b.day}${b.time ?? '99'}`))
    }, [scope, customEvents, todayKey, t])

    const todayCount = items.filter(item => item.day === todayKey).length
    const nextEvent = scope.find(s => s.daysLeft != null && s.daysLeft > 0)
    const summary = [
        todayCount ? t('planner.agenda_today_count', { count: todayCount }) : t('planner.agenda_nothing_today'),
        nextEvent && t(nextEvent.invitation.label === 'wedding' ? 'planner.agenda_next_wedding' : 'planner.agenda_next_event', { count: nextEvent.daysLeft }),
    ].filter(Boolean).join(' ')

    const valid = form.title.trim() && form.date
    const setField = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

    const close = () => { setFormOpen(false); setForm(emptyForm(today)) }
    const save = (e) => {
        e.preventDefault()
        if (!valid) return
        onAddCustom({ ...form, title: form.title.trim(), place: form.place.trim() })
        close()
    }

    const dayLabel = (day) => dayjs(day).locale(locale).format(locale === 'en' ? 'dddd MMM D' : 'dddd D MMM').replace(/\./g, '')

    return (
        <section className={`${styles.card} ${styles.agenda}`}>
            <div className={styles.agendaToday}>
                <span className={styles.agendaWeekday}>{today.locale(locale).format('dddd')}</span>
                <span className={styles.agendaNumber}>{today.format('D')}</span>
                <span className={styles.agendaSummary}>{summary}</span>
                <button type='button' className={styles.darkBtn} onClick={() => setFormOpen(true)}>
                    <Plus size={14} /> {t('planner.agenda_add')}
                </button>
            </div>

            <div className={styles.agendaList}>
                {items.length === 0 && <span className={styles.muted}>{t('planner.agenda_empty')}</span>}
                {items.slice(0, 3).map(item => (
                    <div key={item.key} className={styles.agendaItem}>
                        <span className={styles.agendaDay}>{dayLabel(item.day)}</span>
                        <div className={`${styles.agendaCard} ${KIND[item.kind]}`}>
                            <b>{item.title}</b>
                            <small>{item.sub}</small>
                        </div>
                    </div>
                ))}
            </div>

            {formOpen && (
                <form className={styles.agendaForm} onSubmit={save}>
                    <div className={styles.agendaFormHead}>
                        <h3>{t('planner.agenda_new')}</h3>
                        <button type='button' className={styles.linkBtn} onClick={close}>{t('planner.cancel')}</button>
                    </div>
                    <input
                        autoFocus
                        className={styles.input}
                        value={form.title}
                        onChange={setField('title')}
                        placeholder={t('planner.agenda_title_ph')}
                    />
                    <div className={styles.inputPair}>
                        <input type='date' className={styles.input} value={form.date} onChange={setField('date')} />
                        <input type='time' className={styles.input} value={form.time} onChange={setField('time')} />
                    </div>
                    <input
                        className={styles.input}
                        value={form.place}
                        onChange={setField('place')}
                        placeholder={t('planner.agenda_place_ph')}
                    />
                    <button type='submit' className={`${styles.darkBtn} ${styles.saveBtn}`} aria-disabled={!valid}>
                        {t('planner.agenda_save')}
                    </button>
                </form>
            )}
        </section>
    )
}
