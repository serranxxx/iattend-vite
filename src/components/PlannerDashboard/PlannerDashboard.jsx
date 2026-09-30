import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { ConfigProvider, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { CalendarHeart } from 'lucide-react'
import { buildPending, buildStats, fetchPlannerData } from './plannerData'
import { fmtLong } from './plannerFormat'
import { usePlannerStorage } from './usePlannerStorage'
import { usePlannerNotes } from './usePlannerNotes'
import { PlannerTimeline } from './PlannerTimeline'
import { PlannerEventsTable } from './PlannerEventsTable'
import { PlannerAgenda } from './PlannerAgenda'
import { PlannerNotes } from './PlannerNotes'
import styles from './PlannerDashboard.module.css'

// Tokens del selector de eventos (pill con borde suave del handoff).
const FILTER_THEME = {
    token: { colorBorder: '#E4E2DE', colorPrimary: '#A07CC5', borderRadius: 999, controlHeight: 40, fontSize: 14 },
}

const formatInt = (n, locale) => n.toLocaleString(locale === 'en' ? 'en-US' : 'es-MX')

// filterSlot: nodo del encabezado de InvitationsPage donde se dibuja el filtro
// de eventos (junto al Segmented). Sin él, el filtro va arriba del tablero.
export const PlannerDashboard = ({ invitations, filterSlot, userId }) => {
    const { t } = useTranslation()

    const [data, setData] = useState(null)
    const [error, setError] = useState(false)

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

    if (!invitations?.length) {
        return (
            <div className={styles.empty}>
                <CalendarHeart size={32} />
                <span className={styles.emptyTitle}>{t('planner.empty_title')}</span>
                <span className={styles.muted}>{t('planner.empty_text')}</span>
            </div>
        )
    }
    if (error) return <div className={styles.empty}><span className={styles.muted}>{t('planner.load_error')}</span></div>
    if (!data) return <div className={styles.empty}><span className={styles.muted}>{t('planner.loading')}</span></div>

    return <PlannerBoard invitations={invitations} data={data} filterSlot={filterSlot} userId={userId} />
}

export const PlannerBoard = ({ invitations, data, filterSlot, userId }) => {
    const { t, i18n } = useTranslation()
    const locale = i18n.language?.startsWith('en') ? 'en' : 'es'
    const navigate = useNavigate()
    const today = useMemo(() => dayjs().startOf('day'), [])

    // null = todos los eventos
    const [selectedId, setSelectedId] = useState(null)
    // Fila / punto marcado; null = el próximo evento
    const [activeId, setActiveId] = useState(null)
    const [tableFilter, setTableFilter] = useState('all')
    const [timelineVisible, setTimelineVisible] = usePlannerStorage(userId, 'timeline', true)
    const { notes, customEvents, addNote, toggleNote, addCustomEvent } = usePlannerNotes(userId)

    const statsList = useMemo(() => (invitations ?? [])
        .map(inv => {
            const s = buildStats(inv, data, today)
            return { ...s, pending: buildPending(s, t) }
        })
        // Próximas primero por fecha; las ya celebradas y sin fecha al final.
        .sort((a, b) => {
            const rank = (s) => (s.daysLeft == null ? 2 : s.daysLeft < 0 ? 1 : 0)
            return rank(a) - rank(b) || String(a.day).localeCompare(String(b.day))
        }), [data, invitations, today, t])

    // El tablero muestra los eventos próximos, o solo el elegido en el selector.
    const scope = useMemo(
        () => (selectedId
            ? statsList.filter(s => s.invitation.id === selectedId)
            : statsList.filter(s => s.daysLeft != null && s.daysLeft >= 0)),
        [statsList, selectedId]
    )

    // "Este mes" = los próximos 30 días (a fin de mes, el mes calendario queda vacío)
    const thisMonth = (s) => s.daysLeft != null && s.daysLeft >= 0 && s.daysLeft <= 30
    const counts = {
        all: scope.length,
        pending: scope.filter(s => s.pending.length).length,
        month: scope.filter(thisMonth).length,
    }
    const rows = tableFilter === 'pending' ? scope.filter(s => s.pending.length)
        : tableFilter === 'month' ? scope.filter(thisMonth)
            : scope

    const active = scope.find(s => s.invitation.id === activeId) ?? scope[0] ?? null

    const totals = scope.reduce((acc, s) => {
        acc.guests += s.total
        acc.confirmed += s.confirmed
        acc.waiting += s.waiting
        acc.withoutTable += s.withoutTable
        acc.sideEvents += s.sideEvents.length
        return acc
    }, { guests: 0, confirmed: 0, waiting: 0, withoutTable: 0, sideEvents: 0 })

    const upcoming = scope.filter(s => s.daysLeft != null && s.daysLeft >= 0)
    const next = upcoming[0]
    const countdown = (s) => (s.daysLeft === 0 ? t('planner.today') : t('planner.days', { count: s.daysLeft }))

    const kpis = [
        { key: 'events', value: upcoming.length, label: t('planner.kpi_events'),
            sub: next ? t('planner.kpi_next', { title: next.title, when: countdown(next) }) : t('planner.kpi_no_next') },
        { key: 'guests', value: totals.guests, label: t('planner.kpi_guests'),
            sub: t('planner.kpi_confirmed', { count: totals.confirmed, pct: totals.guests ? Math.round((totals.confirmed / totals.guests) * 100) : 0 }) },
        { key: 'waiting', value: totals.waiting, label: t('planner.kpi_waiting'), sub: t('planner.kpi_waiting_hint') },
        { key: 'table', value: totals.withoutTable, label: t('planner.kpi_no_table'), sub: t('planner.kpi_no_table_hint') },
        { key: 'side', value: totals.sideEvents, label: t('planner.kpi_side'),
            sub: t(selectedId ? 'planner.kpi_side_hint_event' : 'planner.kpi_side_hint') },
    ]

    const titles = useMemo(() => new Map(statsList.map(s => [s.invitation.id, s.title])), [statsList])
    const shownNotes = selectedId ? notes.filter(n => n.eventId === selectedId) : notes


    const openEvent = (id) => navigate(`/dashboard?${new URLSearchParams({ id })}`)

    const eventFilter = (
        <ConfigProvider theme={FILTER_THEME}>
            <Select
                showSearch
                value={selectedId ?? 'all'}
                onChange={(value) => { setSelectedId(value === 'all' ? null : value); setActiveId(null) }}
                optionFilterProp='label'
                className={styles.eventFilter}
                options={[
                    { value: 'all', label: t('planner.filter_all', { count: statsList.length }) },
                    ...statsList.map(s => ({
                        value: s.invitation.id,
                        label: s.day ? `${s.title} · ${fmtLong(s.day, locale)}` : s.title,
                    })),
                ]}
            />
        </ConfigProvider>
    )

    return (
        <div className={`${styles.dashboard} ${timelineVisible ? '' : styles.dashboardCompact}`}>
            {filterSlot
                ? createPortal(eventFilter, filterSlot)
                : <div className={styles.toolbar}>{eventFilter}</div>}

            <section className={styles.overview}>
                <div className={styles.kpis}>
                    {kpis.map(k => (
                        <div key={k.key} className={styles.kpi}>
                            <div className={styles.kpiMain}>
                                <span className={styles.kpiValue}>{formatInt(k.value, locale)}</span>
                                <span className={styles.kpiLabel}>{k.label}</span>
                            </div>
                            <span className={styles.kpiSub}>{k.sub}</span>
                        </div>
                    ))}
                </div>
                <PlannerTimeline
                    scope={scope}
                    activeId={active?.invitation.id}
                    onSelect={setActiveId}
                    today={today}
                    locale={locale}
                    visible={timelineVisible}
                    onToggle={() => setTimelineVisible(v => !v)}
                />
            </section>

            <div className={styles.main}>
                <PlannerEventsTable
                    rows={rows}
                    counts={counts}
                    filter={tableFilter}
                    onFilter={setTableFilter}
                    activeId={active?.invitation.id}
                    onSelect={setActiveId}
                    onOpen={openEvent}
                    locale={locale}
                />
                <div className={styles.side}>
                    <PlannerAgenda
                        scope={scope}
                        customEvents={customEvents}
                        onAddCustom={addCustomEvent}
                        today={today}
                        locale={locale}
                    />
                    <PlannerNotes
                        notes={shownNotes}
                        onAdd={(text) => addNote(text, active?.invitation.id ?? null)}
                        onToggle={toggleNote}
                        active={active}
                        titleOf={(id) => titles.get(id)}
                        locale={locale}
                    />
                </div>
            </div>
        </div>
    )
}
