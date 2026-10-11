import { useState } from 'react'
import { Drawer } from 'antd'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, ChevronRight, X } from 'lucide-react'
import { fmtShort } from './plannerFormat'
import { PlannerNotes } from './PlannerNotes'
import styles from './PlannerDashboard.module.css'

const pct = (n, total) => `${total ? (n / total) * 100 : 0}%`

// Hoja inferior de celular (selector de eventos y notas).
const Hoja = ({ open, onClose, title, closeLabel, children }) => (
    <Drawer
        open={open}
        onClose={onClose}
        placement='bottom'
        closable={false}
        height='auto'
        styles={{ wrapper: { height: 'auto', borderRadius: '20px 20px 0 0', overflow: 'hidden', maxHeight: '85vh' }, section: { borderRadius: '20px 20px 0 0' }, body: { padding: 0 } }}
    >
        <div className={`${styles.dashboard} ${styles.mHoja}`}>
            <span className={styles.mHojaAsa} />
            <div className={styles.mHojaCabeza}>
                <h2 className={styles.mHojaTitulo}>{title}</h2>
                <button type='button' className={styles.mHojaCerrar} onClick={onClose} aria-label={closeLabel}>
                    <X size={18} />
                </button>
            </div>
            {children}
        </div>
    </Drawer>
)

/**
 * Tablero del planner en celular (PlannerBoard lo usa < 768 px): los KPIs en
 * un carrusel horizontal, "Tus eventos" con el filtro como chip (abre una hoja
 * con la lista), una tarjeta por evento con su barra de respuestas y el
 * primer pendiente, y las notas en una fila que abre su hoja. Sin línea de
 * tiempo ni agenda: no caben en una pantalla de celular.
 */
export const PlannerBoardMobile = ({
    kpis, scope, statsList, selectedId, onSelectEvent, onOpen, locale,
    notes, onAddNote, onToggleNote, active, titleOf,
}) => {
    const { t } = useTranslation()
    const [hojaFiltro, setHojaFiltro] = useState(false)
    const [hojaNotas, setHojaNotas] = useState(false)

    const elegido = statsList.find(s => s.invitation.id === selectedId)
    const abiertas = notes.filter(n => !n.done).length

    const cuando = (s) => {
        if (!s.day) return t('planner.no_date')
        const fecha = fmtShort(s.day, locale)
        if (s.daysLeft == null) return fecha
        if (s.daysLeft === 0) return `${fecha} · ${t('planner.today')}`
        if (s.daysLeft < 0) return `${fecha} · ${t('planner.days_ago', { count: -s.daysLeft })}`
        return `${fecha} · ${t('planner.mobile_left', { count: s.daysLeft })}`
    }

    const elegir = (id) => { onSelectEvent(id); setHojaFiltro(false) }

    return (
        <div className={`${styles.dashboard} ${styles.movil}`}>
            <div className={styles.mKpis}>
                {kpis.map(k => (
                    <div key={k.key} className={styles.mKpi}>
                        <span className={styles.mKpiValor}>{k.value.toLocaleString(locale === 'en' ? 'en-US' : 'es-MX')}</span>
                        <span className={styles.mKpiLabel}>{k.label}</span>
                        <span className={styles.mKpiSub}>{k.sub}</span>
                    </div>
                ))}
            </div>

            <header className={styles.mCabeza}>
                <h2 className={styles.mTitulo}>{t('planner.events_title')}</h2>
                <button type='button' className={styles.mChip} onClick={() => setHojaFiltro(true)}>
                    <span>{elegido ? elegido.title : t('planner.mobile_filter_all', { count: statsList.length })}</span>
                    <ChevronDown size={14} />
                </button>
            </header>

            <div className={styles.mEventos}>
                {scope.length === 0 && <span className={styles.rowsEmpty}>{t('planner.table_empty')}</span>}
                {scope.map(s => {
                    const pendiente = s.pending[0]
                    return (
                        <button key={s.invitation.id} type='button' className={styles.mEvento} onClick={() => onOpen(s.invitation.id)}>
                            <span className={styles.mEventoCabeza}>
                                <b>{s.title}</b>
                                <ChevronRight size={18} />
                            </span>
                            <small className={styles.mEventoCuando}>{cuando(s)}</small>
                            <span className={styles.bar}>
                                <span className={styles.barConfirmed} style={{ width: pct(s.confirmed, s.total) }} />
                                <span className={styles.barWaiting} style={{ width: pct(s.waiting, s.total) }} />
                                <span className={styles.barDeclined} style={{ width: pct(s.declined, s.total) }} />
                            </span>
                            <span className={styles.mEventoPie}>
                                <span>
                                    {s.total
                                        ? t('planner.mobile_responded', { pct: s.responseRate ?? 0 })
                                        : t('planner.no_guests_yet')}
                                </span>
                                {pendiente
                                    ? <span className={pendiente.level === 'critical' ? styles.mCritico : styles.mAviso}>{pendiente.text}</span>
                                    : <span className={styles.mAlDia}>{t('planner.up_to_date')}</span>}
                            </span>
                        </button>
                    )
                })}
            </div>

            <button type='button' className={styles.mNotas} onClick={() => setHojaNotas(true)}>
                <span className={styles.mNotasTitulo}>{t('planner.notes_title')}</span>
                <span className={styles.mNotasCuenta}>
                    {t('planner.notes_open', { count: abiertas })} <ChevronRight size={14} />
                </span>
            </button>

            <Hoja open={hojaFiltro} onClose={() => setHojaFiltro(false)} title={t('planner.mobile_filter_title')} closeLabel={t('planner_feedback.cancel')}>
                <div className={styles.mOpciones}>
                    {[{ id: null, title: t('planner.filter_all', { count: statsList.length }) }, ...statsList.map(s => ({ id: s.invitation.id, title: s.title, day: s.day }))].map(o => (
                        <button
                            key={o.id ?? 'all'}
                            type='button'
                            className={`${styles.mOpcion} ${(selectedId ?? null) === o.id ? styles.mOpcionActiva : ''}`}
                            onClick={() => elegir(o.id)}
                        >
                            <span>
                                {o.title}
                                {o.day && <small>{fmtShort(o.day, locale)}</small>}
                            </span>
                            {(selectedId ?? null) === o.id && <Check size={16} />}
                        </button>
                    ))}
                </div>
            </Hoja>

            <Hoja open={hojaNotas} onClose={() => setHojaNotas(false)} title={t('planner.notes_title')} closeLabel={t('planner_feedback.cancel')}>
                <div className={styles.mNotasHoja}>
                    <PlannerNotes
                        notes={notes}
                        onAdd={onAddNote}
                        onToggle={onToggleNote}
                        active={active}
                        titleOf={titleOf}
                        locale={locale}
                    />
                </div>
            </Hoja>
        </div>
    )
}
