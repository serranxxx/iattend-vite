import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { GuestsPie } from './GuestsPie'
import { MesasWidget } from './MesasWidget'
import { LiaPlanModal } from './LiaPlanModal'
import styles from './GuestsOverview.module.css'

dayjs.extend(relativeTime)

const isMexican = (phone) => /^\+52\d+/.test(phone || '')

// ── Lia visible ───────────────────────────────────────────────────────────
// Controla la tarjeta de Lia de la columna derecha y el pie "o deja que Lia
// se encargue" de la tarjeta de acciones. Poner en false para ocultarla.
const SHOW_LIA = true

// Número de barras de la gráfica de avance (días hacia atrás, hoy incluido)
const BARS = 12

/**
 * Dashboard de invitados (tab Resumen / Seguimiento).
 *
 * Implementa el rediseño de Claude Design ("Gestion de invitados.dc.html"):
 * dos columnas — a la izquierda "Qué hacer hoy" y el avance diario de
 * confirmaciones; a la derecha Lia, el contador de confirmados y el embudo
 * "Dónde se queda la gente". Mantiene la escalera de estados
 * (sin invitados → sin enviar → con datos).
 */
export const GuestsOverview = ({
  rowData = [],
  dispatchMap = {},
  tickets = 0,
  tables = [],
  rsvpDeadline = null,
  invitationID = null,
  onGoToTab,
  onAddGuests,
  onCreateSend,
  onOpenTables,
}) => {
  const { t } = useTranslation()
  // "Que Lia se encargue" y los enlaces al plan abren el mismo modal.
  const [liaOpen, setLiaOpen] = useState(false)

  const stats = useMemo(() => {
    const created = rowData.filter((g) => g.state === 'creado')
    const waiting = rowData.filter((g) => g.state === 'esperando')
    const confirmed = rowData.filter((g) => g.state === 'confirmado' || g.state === 'asistente')
    const rejected = rowData.filter((g) => g.state === 'rechazado')
    const invited = rowData.filter((g) => g.state !== 'creado')

    // Los estados de entrega solo existen para envíos por API
    const dispatches = rowData.map((g) => dispatchMap[g.id]).filter(Boolean)
    const delivered = dispatches.filter((d) => d.status === 'delivered' || d.status === 'read')
    const read = dispatches.filter((d) => d.status === 'read')
    const failed = dispatches.filter((d) => d.status === 'failed')

    const failedGuests = rowData.filter((g) => dispatchMap[g.id]?.status === 'failed')
    const readNotReplied = waiting.filter((g) => dispatchMap[g.id]?.status === 'read')
    const invalidPhone = rowData.filter((g) => g.state === 'creado' && !isMexican(g.phone_number))
    const readyToInvite = created.filter((g) => isMexican(g.phone_number))

    // last_update_date de los confirmados aproxima cuándo confirmaron
    const today = dayjs().startOf('day')
    const confirmDates = confirmed.map((g) => g.last_update_date).filter(Boolean).map((d) => dayjs(d))

    // Barras del avance: confirmaciones POR DÍA (no acumulado) de los últimos
    // BARS días — así se lee de un vistazo si el ritmo subió o se apagó.
    const days = Array.from({ length: BARS }, (_, i) => today.subtract(BARS - 1 - i, 'day'))
    const perDay = days.map((day) => confirmDates.filter((d) => d.isSame(day, 'day')).length)

    const lastWeek = confirmDates.filter((d) => d.isAfter(today.subtract(7, 'day'))).length
    const ratePerDay = Math.round((lastWeek / 7) * 10) / 10

    const daysToDeadline = rsvpDeadline ? dayjs(rsvpDeadline).startOf('day').diff(today, 'day') : null

    return {
      total: rowData.length,
      waiting: waiting.length,
      confirmed: confirmed.length,
      rejected: rejected.length,
      invited: invited.length,
      delivered: delivered.length,
      read: read.length,
      failed: failed.length,
      failedGuests,
      readNotReplied,
      invalidPhone,
      readyToInvite: readyToInvite.length,
      days,
      perDay,
      ratePerDay,
      daysToDeadline,
    }
  }, [rowData, dispatchMap, rsvpDeadline])

  const phase = stats.total === 0
    ? 'empty'
    : stats.invited === 0
      ? 'ready'
      : (stats.confirmed === 0 && stats.rejected === 0)
        ? 'sent'
        : 'active'

  // ── Estados tempranos de la escalera ──────────────────────────────────
  if (phase === 'empty' || phase === 'ready') {
    const isEmpty = phase === 'empty'
    return (
      <div className={styles.wrapper}>
        <div className={styles.blankState}>
          <span className={styles.blankKicker}>{t('guests_overview.rd_kicker')}</span>
          <span className={styles.blankTitle}>
            {isEmpty ? t('guests_overview.empty_title') : t('guests_overview.ready_title', { count: stats.readyToInvite })}
          </span>
          <span className={styles.blankText}>
            {isEmpty
              ? (tickets > 0 ? t('guests_overview.empty_text_capacity', { tickets }) : t('guests_overview.empty_text'))
              : t('guests_overview.ready_text')}
          </span>
          <button
            type="button"
            className={styles.btnDark}
            onClick={isEmpty ? onAddGuests : onCreateSend}
          >
            {isEmpty ? t('guests_overview.empty_cta') : t('guests_overview.ready_cta')}
          </button>
        </div>
      </div>
    )
  }

  // ── Qué hacer hoy: casos accionables ──────────────────────────────────
  const namesOf = (list) => {
    const head = list.slice(0, 3).map((g) => g.name).join(', ')
    return list.length > 3
      ? t('guests_overview.rd_names_more', { names: head, count: list.length - 3 })
      : head
  }

  const cases = [
    stats.failedGuests.length > 0 && {
      key: 'failed',
      tone: styles.caseDanger,
      btn: styles.btnRed,
      badge: '!',
      title: t('guests_overview.card_failed_title', { count: stats.failedGuests.length }),
      people: namesOf(stats.failedGuests),
      cta: t('guests_overview.rd_action_retry'),
      onClick: () => onGoToTab?.('esperando'),
    },
    stats.readNotReplied.length > 0 && {
      key: 'read',
      tone: styles.caseWarn,
      btn: styles.btnYellow,
      badge: String(stats.readNotReplied.length),
      title: t('guests_overview.rd_case_read_title'),
      people: namesOf(stats.readNotReplied),
      cta: t('guests_overview.rd_action_remind'),
      onClick: () => onGoToTab?.('esperando'),
    },
    // No viene del mockup, pero es un caso real que solo el organizador puede
    // resolver: números sin lada +52 nunca van a poder recibir WhatsApp.
    // Su botón es la excepción: se queda en blanco.
    stats.invalidPhone.length > 0 && {
      key: 'phone',
      tone: styles.caseMuted,
      btn: styles.btnGhost,
      badge: String(stats.invalidPhone.length),
      title: t('guests_overview.card_phone_title', { count: stats.invalidPhone.length }),
      people: namesOf(stats.invalidPhone),
      cta: t('guests_overview.rd_fix'),
      onClick: () => onGoToTab?.('creado'),
    },
  ].filter(Boolean)

  const liaSolvable = stats.failedGuests.length + stats.readNotReplied.length
  const stuck = liaSolvable

  // ── Avance diario ─────────────────────────────────────────────────────
  const maxDay = Math.max(...stats.perDay, 1)
  const barTone = (i) => {
    if (i === BARS - 1) return '#5B2EE0'
    if (i >= BARS - 3) return '#C9B6FF'
    if (i >= BARS - 6) return '#DCCFFF'
    return '#EDEAE5'
  }

  // ── Embudo "Dónde se queda la gente" ──────────────────────────────────
  // Un color por etapa, de la paleta de estado de index.css.
  //
  // "Invitados" cuenta a todo el que ya recibió su invitación (esperando +
  // confirmados + rechazados), no solo a los que siguen esperando: si no, el
  // embudo se encogería conforme la gente contesta.
  const funnelMax = Math.max(stats.total, 1)
  const funnel = [
    { label: t('guests_overview.funnel_created'), n: stats.total, color: 'var(--blue-color-80)' },
    { label: t('guests_overview.funnel_invited'), n: stats.invited, color: 'var(--yellow-color-80)' },
    { label: t('guests_overview.funnel_delivered'), n: stats.delivered, color: 'var(--red-color-80)' },
    { label: t('guests_overview.funnel_read'), n: stats.read, color: 'var(--light-green-500)' },
    { label: t('guests_overview.funnel_confirmed'), n: stats.confirmed, color: 'var(--light-purple-500)' },
    { label: t('guests_overview.funnel_rejected'), n: stats.rejected, color: 'var(--gray-color)' },
  ]

  // ── Contador de confirmados ───────────────────────────────────────────
  const capacity = tickets > 0 ? tickets : Math.max(stats.total, 1)
  const confirmedPct = Math.min((stats.confirmed / capacity) * 100, 100)
  const readPct = Math.max(Math.min((stats.read / capacity) * 100, 100 - confirmedPct), 0)
  const seatsLeft = Math.max(capacity - stats.confirmed, 0)

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>

        {/* ── Columna izquierda ────────────────────────────────────────── */}
        <div className={styles.col}>

          <section className={`${styles.card} ${styles.cardToday}`}>
            <span className={styles.kicker}>{t('guests_overview.rd_today_title')}</span>
            <h2 className={styles.headline}>
              {stuck > 0
                ? t('guests_overview.rd_stuck_headline', { count: stuck })
                : t('guests_overview.rd_stuck_headline_clear')}
            </h2>
            <p className={styles.lede}>
              {cases.length === 0
                ? t('guests_overview.rd_stuck_lede_clear')
                : cases.length === 1
                  ? t('guests_overview.rd_stuck_lede_one')
                  : t('guests_overview.rd_stuck_lede')}
            </p>

            {cases.length > 0 && (
              <div className={styles.caseList}>
                {cases.map((c) => (
                  <div key={c.key} className={`${styles.caseRow} ${c.tone}`}>
                    <div className={styles.caseBadge}>{c.badge}</div>
                    <div className={styles.caseTexts}>
                      <span className={styles.caseTitle}>{c.title}</span>
                      <span className={styles.casePeople}>{c.people}</span>
                    </div>
                    <button type="button" className={c.btn} onClick={c.onClick}>
                      {c.cta}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {SHOW_LIA && cases.length > 0 && (
              <div className={styles.caseFoot}>
                <span>{t('guests_overview.rd_or_lia')}</span>
                <button type="button" className={styles.linkBtn} onClick={() => setLiaOpen(true)}>
                  {t('guests_overview.rd_see_plan')}
                </button>
              </div>
            )}
          </section>

          <GuestsPie className={styles.cardPie} rowData={rowData} dispatchMap={dispatchMap} tables={tables} />

          <section className={`${styles.card} ${styles.cardProgress}`}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>{t('guests_overview.chart_progress')}</span>
              <span className={styles.cardMeta}>
                {t('guests_overview.rd_rate_per_day', { rate: stats.ratePerDay })}
              </span>
            </div>
            <div className={styles.bars}>
              {stats.perDay.map((v, i) => (
                <div key={i} className={styles.barCol}>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.bar}
                      style={{
                        height: `${Math.max((v / maxDay) * 100, v > 0 ? 6 : 2)}%`,
                        background: barTone(i),
                      }}
                      title={t('guests_overview.rd_bar_tooltip', { count: v })}
                    />
                  </div>
                  <span className={styles.barLabel}>
                    {i === BARS - 1 ? t('guests_overview.rd_today') : stats.days[i].format('D')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Columna derecha ──────────────────────────────────────────── */}
        <div className={styles.col}>

          {SHOW_LIA && (
            <section className={styles.liaCard}>
              <div className={styles.liaBrand}>
                {/* <Sparkles size={14} /> */}
                <span>✦ Lia</span>
              </div>
              <div className={styles.liaTitle}>
                {liaSolvable > 0
                  ? t('guests_overview.rd_lia_title', { count: liaSolvable })
                  : t('guests_overview.rd_lia_title_clear')}
              </div>
              <div className={styles.liaText}>
                {liaSolvable > 0
                  ? t('guests_overview.rd_lia_text')
                  : t('guests_overview.rd_lia_text_clear')}
              </div>
              <button type="button" className={styles.liaCta} onClick={() => setLiaOpen(true)}>
                {t('guests_overview.lia_cta')}
              </button>
              <div className={styles.liaFoot}>
                <button type="button" className={styles.liaLink} onClick={() => setLiaOpen(true)}>
                  {t('guests_overview.rd_lia_plan')}
                </button>
              </div>
            </section>
          )}

          <section className={`${styles.card} ${styles.cardConfirmed}`}>
            <span className={styles.kicker}>{t('guests_overview.rd_confirmed')}</span>
            <div className={styles.bigRow}>
              <span className={styles.big}>{stats.confirmed}</span>
              <span className={styles.bigOf}>
                {tickets > 0
                  ? t('guests_overview.rd_of_seats_plain', { tickets })
                  : t('guests_overview.rd_of_guests_plain', { total: stats.total })}
              </span>
            </div>
            <div className={styles.rail}>
              <div className={styles.railFill} style={{ width: `${confirmedPct}%` }} />
              <div className={styles.railSoft} style={{ width: `${readPct}%` }} />
            </div>
            <div className={styles.railLegend}>
              <span>
                <i className={styles.legendDot} />
                {t('guests_overview.rd_read_no_reply', { count: stats.read })}
              </span>
              <span>{t('guests_overview.rd_seats_free', { count: seatsLeft })}</span>
            </div>
            {stats.daysToDeadline != null && (
              <div className={styles.deadlineNote}>
                {stats.daysToDeadline > 0
                  ? t('guests_overview.rd_closes_in', { days: stats.daysToDeadline })
                  : t('guests_overview.rd_closed')}
              </div>
            )}
          </section>

          <MesasWidget
            className={styles.cardMesas}
            invitationID={invitationID}
            onOpenTables={onOpenTables}
          />

          <section className={`${styles.card} ${styles.cardFunnel}`}>
            <span className={styles.cardTitle}>{t('guests_overview.rd_funnel_title')}</span>
            <div className={styles.funnel}>
              {funnel.map((f) => (
                <div key={f.label} className={styles.funnelRow}>
                  <div className={styles.funnelHead}>
                    <span className={styles.funnelLabel}>{f.label}</span>
                    <span className={styles.funnelValue}>{f.n}</span>
                  </div>
                  <div className={styles.funnelRail}>
                    <div
                      className={styles.funnelFill}
                      style={{ width: `${Math.round((f.n / funnelMax) * 100)}%`, background: f.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.cardFoot}>{t('guests_overview.funnel_hint')}</div>
          </section>
        </div>
      </div>

      <LiaPlanModal
        open={liaOpen}
        onClose={() => setLiaOpen(false)}
        chasing={stuck}
        decisions={cases.length}
      />
    </div>
  )
}
