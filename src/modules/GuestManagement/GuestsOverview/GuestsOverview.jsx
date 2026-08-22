import { useMemo } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { useTranslation } from 'react-i18next'
import styles from './GuestsOverview.module.css'

dayjs.extend(relativeTime)

const isMexican = (phone) => /^\+52\d+/.test(phone || '')

// ── Lia oculta para la primera versión en producción ──────────────────────
// Poner en true para restaurar: la tarjeta grande de Lia en el hero y los
// botones "✦ Lia" de las tarjetas de seguimiento. Nada más depende de esto.
const SHOW_LIA = false

// Tonos de los casos, tal cual el diseño
const CASE_TONES = {
  failed: { cls: styles.caseDanger, icon: '!' },
  read: { cls: styles.caseWarn, icon: '◷' },
}

/**
 * Dashboard de invitados (tab Seguimiento).
 *
 * Implementa el rediseño de Claude Design ("Dashboard Invitados.dc.html"):
 * hero de confirmados + tarjeta de Lia arriba, y abajo dos columnas con
 * seguimiento/avance a la izquierda y las cuatro métricas a la derecha.
 * Mantiene la escalera de estados (sin invitados → sin enviar → con datos).
 */
export const GuestsOverview = ({
  rowData = [],
  dispatchMap = {},
  tickets = 0,
  rsvpDeadline = null,
  onGoToTab,
  onAddGuests,
  onCreateSend,
  onLiaCta,
}) => {
  const { t } = useTranslation()

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
    const confirmDates = confirmed.map((g) => g.last_update_date).filter(Boolean).map((d) => dayjs(d))
    // La ventana arranca en la primera confirmación (mínimo 14 días) para que
    // la curva muestre el crecimiento real y no una línea plana
    const today = dayjs().startOf('day')
    const firstConfirm = confirmDates.length
      ? confirmDates.reduce((min, d) => (d.isBefore(min) ? d : min), confirmDates[0]).startOf('day')
      : today.subtract(13, 'day')
    const defaultStart = today.subtract(13, 'day')
    const startDay = firstConfirm.isBefore(defaultStart) ? firstConfirm : defaultStart
    const spanDays = Math.max(today.diff(startDay, 'day'), 13)
    const POINTS = 14
    const days = Array.from({ length: POINTS }, (_, i) => startDay.add(Math.round((i / (POINTS - 1)) * spanDays), 'day'))
    const cumulative = days.map((day) => confirmDates.filter((d) => d.isBefore(day.add(1, 'day'))).length)

    const lastWeek = confirmDates.filter((d) => d.isAfter(today.subtract(7, 'day'))).length
    const prevWeek = confirmDates.filter((d) => d.isAfter(today.subtract(14, 'day')) && d.isBefore(today.subtract(7, 'day'))).length
    const ratePerDay = Math.round((lastWeek / 7) * 10) / 10
    const rateDelta = Math.round(((lastWeek - prevWeek) / 7) * 10) / 10

    const daysToDeadline = rsvpDeadline ? dayjs(rsvpDeadline).startOf('day').diff(today, 'day') : null
    const projected = daysToDeadline != null && daysToDeadline > 0
      ? Math.min(Math.round(confirmed.length + (lastWeek / 7) * daysToDeadline), invited.length || rowData.length)
      : null

    // Confirmación por etiqueta
    const byTag = {}
    rowData.forEach((g) => {
      const tag = (g.tag && String(g.tag).trim()) || null
      if (!tag) return
      if (!byTag[tag]) byTag[tag] = { total: 0, confirmed: 0 }
      byTag[tag].total += 1
      if (g.state === 'confirmado' || g.state === 'asistente') byTag[tag].confirmed += 1
    })
    const segments = Object.entries(byTag)
      .filter(([, v]) => v.total >= 2)
      .map(([tag, v]) => ({ tag, rate: Math.round((v.confirmed / v.total) * 100) }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5)

    const remindedGuests = rowData.filter((g) => (g.reminder_count ?? 0) > 0)
    const remindedConfirmed = remindedGuests.filter((g) => g.state === 'confirmado' || g.state === 'asistente')

    return {
      total: rowData.length,
      waiting: waiting.length,
      confirmed: confirmed.length,
      rejected: rejected.length,
      invited: invited.length,
      delivered: delivered.length,
      read: read.length,
      failed: failed.length,
      noDispatch: Math.max(invited.length - dispatches.length, 0),
      failedGuests,
      readNotReplied,
      invalidPhone,
      readyToInvite: readyToInvite.length,
      cumulative,
      days,
      ratePerDay,
      rateDelta,
      projected,
      daysToDeadline,
      segments,
      reminded: remindedGuests.length,
      remindedConfirmed: remindedConfirmed.length,
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

  // ── Casos ─────────────────────────────────────────────────────────────
  const cases = [
    stats.failedGuests.length > 0 && {
      key: 'failed',
      title: t('guests_overview.card_failed_title', { count: stats.failedGuests.length }),
      people: stats.failedGuests.slice(0, 3).map((g) => g.name).join(', ') + (stats.failedGuests.length > 3 ? `, +${stats.failedGuests.length - 3}` : ''),
    },
    stats.readNotReplied.length > 0 && {
      key: 'read',
      title: t('guests_overview.card_read_title', { count: stats.readNotReplied.length }),
      people: stats.readNotReplied.slice(0, 3).map((g) => g.name).join(', ') + (stats.readNotReplied.length > 3 ? `, +${stats.readNotReplied.length - 3}` : ''),
    },
  ].filter(Boolean)
  const liaSolvable = stats.failedGuests.length + stats.readNotReplied.length

  // ── Gráfica de avance: se dibuja con los datos reales ─────────────────
  const chart = (() => {
    const pts = stats.cumulative
    const maxVal = Math.max(...pts, stats.projected ?? 0, 1)
    const TODAY_X = 460
    const END_X = 690
    const toY = (v) => 180 - (v / maxVal) * 150
    const coords = pts.map((v, i) => [Math.round((i / (pts.length - 1)) * TODAY_X), Math.round(toY(v))])
    const line = coords.reduce((acc, p, i, arr) => {
      if (i === 0) return `M ${p[0]} ${p[1]}`
      const prev = arr[i - 1]
      const cx = (prev[0] + p[0]) / 2
      return `${acc} C ${cx} ${prev[1]}, ${cx} ${p[1]}, ${p[0]} ${p[1]}`
    }, '')
    const last = coords[coords.length - 1]
    const projY = stats.projected != null ? Math.round(toY(stats.projected)) : null
    return {
      line,
      area: `${line} L ${last[0]} 180 L 0 180 Z`,
      last,
      projPath: projY != null ? `M ${last[0]} ${last[1]} C ${last[0] + 80} ${projY + 12}, ${END_X - 90} ${projY + 6}, ${END_X} ${projY}` : null,
      projY,
      endX: END_X,
    }
  })()

  // ── Embudo y salud ────────────────────────────────────────────────────
  const funnelMax = Math.max(stats.total, 1)
  const funnel = [
    { label: t('guests_overview.funnel_created'), value: stats.total, color: '#C8C4BA' },
    { label: t('guests_overview.funnel_invited'), value: stats.invited, color: '#2C7BE5' },
    { label: t('guests_overview.funnel_delivered'), value: stats.delivered, color: '#6FB0F5' },
    { label: t('guests_overview.funnel_read'), value: stats.read, color: '#E08A16' },
    { label: t('guests_overview.funnel_confirmed'), value: stats.confirmed, color: '#5B2EE5' },
  ]

  const healthTotal = Math.max(stats.read + Math.max(stats.delivered - stats.read, 0) + stats.failed + stats.noDispatch, 1)
  const hRead = (stats.read / healthTotal) * 100
  const hDelivered = hRead + (Math.max(stats.delivered - stats.read, 0) / healthTotal) * 100
  const hFailed = hDelivered + (stats.failed / healthTotal) * 100
  const deliveryRate = stats.invited > 0 ? Math.round((stats.delivered / stats.invited) * 100) : 0
  const readPct = stats.invited > 0 ? Math.round((stats.read / stats.invited) * 100) : 0

  const statCells = [
    { label: t('guests_overview.rd_stat_waiting'), value: stats.waiting, delta: t('guests_overview.rd_needs_action'), tone: styles.toneWarn },
    { label: t('guests_overview.rd_stat_read'), value: stats.read, delta: t('guests_overview.rd_of_sends', { pct: readPct }), tone: styles.toneMuted },
    { label: t('guests_overview.rd_stat_rejected'), value: stats.rejected, delta: '—', tone: styles.toneMuted },
    {
      label: t('guests_overview.rd_stat_rate'),
      value: stats.ratePerDay,
      delta: stats.rateDelta > 0 ? `+${stats.rateDelta}` : String(stats.rateDelta),
      tone: stats.rateDelta > 0 ? styles.toneGood : styles.toneMuted,
    },
  ]

  const seatsLeft = Math.max(tickets - stats.confirmed, 0)
  const confirmedPct = tickets > 0 ? Math.min((stats.confirmed / tickets) * 100, 100) : 0
  const projSliver = tickets > 0 && stats.projected != null
    ? Math.max(Math.min(((stats.projected - stats.confirmed) / tickets) * 100, 100 - confirmedPct), 0)
    : 0

  return (
    <div className={styles.wrapper}>

      {/* ── Hero + Lia ── */}
      <section className={`${styles.topGrid} ${SHOW_LIA ? '' : styles.topGridSolo}`}>

        <div className={styles.heroCard}>
          <div className={styles.heroTop}>
            <div className={styles.heroFigure}>
              <span className={styles.kicker}>{t('guests_overview.rd_confirmed')}</span>
              <div className={styles.bigRow}>
                <span className={styles.big}>{stats.confirmed}</span>
                {tickets > 0 && <span className={styles.bigOf}>{t('guests_overview.rd_of_seats', { tickets })}</span>}
              </div>
            </div>

            <div className={styles.heroAside}>
              {stats.daysToDeadline != null && (
                <span className={styles.deadlineChip}>
                  <i />{t('guests_overview.rd_closes_in', { days: Math.max(stats.daysToDeadline, 0) })}
                </span>
              )}
              {stats.projected != null && (
                <span className={styles.asideNote}>
                  {t('guests_overview.rd_projection')} <b>{stats.projected}</b>
                </span>
              )}
            </div>
          </div>

          {tickets > 0 && (
            <div className={styles.progressBlock}>
              <div className={styles.rail}>
                <div className={styles.railFill} style={{ width: `${confirmedPct}%` }} />
                <div className={styles.railProj} style={{ width: `${projSliver}%` }} />
              </div>
              <div className={styles.progressLegend}>
                <span><b>{t('guests_overview.rd_waiting_people', { count: stats.waiting })}</b></span>
                <span>{t('guests_overview.rd_seats_left_pre')} <b>{seatsLeft}</b> {t('guests_overview.rd_seats_left_post')}</span>
              </div>
            </div>
          )}

          <div className={styles.statGrid}>
            {statCells.map((c) => (
              <div key={c.label} className={styles.statCell}>
                <span className={styles.statLabel}>{c.label}</span>
                <div className={styles.statValueRow}>
                  <span className={styles.statValue}>{c.value}</span>
                  <span className={`${styles.statDelta} ${c.tone}`}>{c.delta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {SHOW_LIA && (
        <div className={styles.liaCard}>
          <div className={styles.liaHead}>
            <div className={styles.liaBrand}>
              <span className={styles.liaSpark}>✦</span>
              <span className={styles.liaKicker}>Lia</span>
            </div>
            <div className={styles.liaTitle}>
              {liaSolvable > 0
                ? t('guests_overview.rd_lia_title', { count: liaSolvable })
                : t('guests_overview.rd_lia_title_clear')}
            </div>
            <div className={styles.liaText}>
              {liaSolvable > 0 ? t('guests_overview.rd_lia_text') : t('guests_overview.rd_lia_text_clear')}
            </div>
          </div>
          <div className={styles.liaActions}>
            <button type="button" className={styles.liaCta} onClick={onLiaCta}>
              {t('guests_overview.lia_cta')}
            </button>
            <span className={styles.liaLink} onClick={onLiaCta}>{t('guests_overview.rd_lia_plan')}</span>
          </div>
        </div>
        )}
      </section>

      {/* ── Seguimiento + analítica ── */}
      <section className={styles.bottomGrid}>

        <div className={styles.col}>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>{t('guests_overview.rd_follow_up')}</span>
              <span className={styles.mono}>{t('guests_overview.rd_cases', { count: liaSolvable })}</span>
            </div>

            {cases.length > 0 && (
              <div className={styles.caseList}>
                {cases.map((c) => (
                  <div key={c.key} className={`${styles.caseRow} ${CASE_TONES[c.key].cls}`}>
                    <div className={styles.caseIcon}>{CASE_TONES[c.key].icon}</div>
                    <div className={styles.caseTexts}>
                      <span className={styles.caseTitle}>{c.title}</span>
                      <span className={styles.casePeople}>{c.people}</span>
                    </div>
                    <div className={styles.caseActions}>
                      <button type="button" className={styles.btnGhost} onClick={() => onGoToTab?.('esperando')}>
                        {t('guests_overview.solve')}
                      </button>
                      {SHOW_LIA && (
                        <button type="button" className={styles.btnLia} onClick={onLiaCta}>✦ Lia</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {stats.invalidPhone.length > 0 && (
              <>
                <div className={styles.sectionRule}>
                  <span className={styles.ruleLine} />
                  <span className={styles.ruleLabel}>{t('guests_overview.rd_only_you')}</span>
                  <span className={styles.ruleLine} />
                </div>

                <div className={styles.caseRowDashed}>
                  <div className={styles.caseIconMuted}>△</div>
                  <div className={styles.caseTexts}>
                    <span className={styles.caseTitle}>{t('guests_overview.card_phone_title', { count: stats.invalidPhone.length })}</span>
                    <span className={styles.casePeople}>{stats.invalidPhone.slice(0, 3).map((g) => g.name).join(', ')}</span>
                  </div>
                  <button type="button" className={styles.btnGhost} onClick={() => onGoToTab?.('creado')}>
                    {t('guests_overview.rd_fix')}
                  </button>
                </div>
              </>
            )}

            {cases.length === 0 && stats.invalidPhone.length === 0 && (
              <div className={styles.allClear}>
                {SHOW_LIA ? t('guests_overview.all_clear_text') : t('guests_overview.rd_all_clear_plain')}
              </div>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>{t('guests_overview.chart_progress')}</span>
              {rsvpDeadline && (
                <span className={styles.cardMeta}>
                  {t('guests_overview.rd_limit')} {dayjs(rsvpDeadline).locale('es').format('D MMM')}
                </span>
              )}
            </div>

            <div className={styles.plotWrap}>
              <svg viewBox="0 0 720 200" width="100%" height="190" preserveAspectRatio="none" className={styles.plot}>
                <defs>
                  <linearGradient id="gxAreaOverview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5B2EE5" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#5B2EE5" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {[40, 100, 160].map((y) => (
                  <line key={y} x1="0" y1={y} x2="720" y2={y} stroke="#EFEDE7" strokeWidth="1" />
                ))}
                <path d={chart.area} fill="url(#gxAreaOverview)" />
                <path d={chart.line} fill="none" stroke="#5B2EE5" strokeWidth="2.5" strokeLinecap="round" />
                {chart.projPath && (
                  <path d={chart.projPath} fill="none" stroke="#A78BFA" strokeWidth="2.5" strokeDasharray="5 6" strokeLinecap="round" />
                )}
                {chart.projY != null && (
                  <line x1={chart.endX} y1="10" x2={chart.endX} y2="180" stroke="#D8D4CB" strokeWidth="1" strokeDasharray="4 5" />
                )}
                <circle cx={chart.last[0]} cy={chart.last[1]} r="5" fill="#5B2EE5" stroke="#fff" strokeWidth="2.5" />
                {chart.projY != null && (
                  <circle cx={chart.endX} cy={chart.projY} r="5" fill="#fff" stroke="#A78BFA" strokeWidth="2.5" />
                )}
              </svg>
              <span className={styles.badgeToday}>{t('guests_overview.rd_today')} · {stats.confirmed}</span>
              {stats.projected != null && (
                <span className={styles.badgeProj}>{t('guests_overview.rd_projected', { count: stats.projected })}</span>
              )}
            </div>

            <div className={styles.axis}>
              {[0, 5, 10, 13].map((i) => (
                <span key={i}>{stats.days[i].locale('es').format('D MMM')}</span>
              ))}
              {rsvpDeadline && <span>{dayjs(rsvpDeadline).locale('es').format('D MMM')}</span>}
            </div>
          </div>
        </div>

        <div className={styles.col}>

          <div className={styles.card}>
            <span className={styles.cardTitle}>{t('guests_overview.chart_funnel')}</span>
            <div className={styles.funnel}>
              {funnel.map((f) => (
                <div key={f.label} className={styles.funnelRow}>
                  <div className={styles.funnelHead}>
                    <span className={styles.funnelLabel}>{f.label}</span>
                    <span className={styles.mono}>{f.value}</span>
                  </div>
                  <div className={styles.funnelRail}>
                    <div
                      className={styles.funnelFill}
                      style={{ width: `${Math.round((f.value / funnelMax) * 100)}%`, background: f.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.cardFoot}>{t('guests_overview.funnel_hint')}</div>
          </div>

          <div className={styles.card}>
            <span className={styles.cardTitle}>{t('guests_overview.chart_delivery')}</span>
            <div className={styles.healthRow}>
              <div
                className={styles.donut}
                style={{ background: `conic-gradient(#E08A16 0 ${hRead}%, #2C7BE5 ${hRead}% ${hDelivered}%, #D1443E ${hDelivered}% ${hFailed}%, #EFEDE7 ${hFailed}% 100%)` }}
              >
                <div className={styles.donutHole}>
                  <span className={styles.donutPct}>{deliveryRate}%</span>
                  <span className={styles.donutLabel}>{t('guests_overview.donut_center')}</span>
                </div>
              </div>
              <div className={styles.healthLegend}>
                {[
                  { label: t('guests_overview.donut_read'), value: stats.read, color: '#E08A16' },
                  { label: t('guests_overview.donut_delivered'), value: Math.max(stats.delivered - stats.read, 0), color: '#2C7BE5' },
                  { label: t('guests_overview.donut_failed'), value: stats.failed, color: '#D1443E' },
                ].map((h) => (
                  <div key={h.label} className={styles.healthItem}>
                    <span className={styles.dot} style={{ background: h.color }} />
                    <span className={styles.healthLabel}>{h.label}</span>
                    <span className={styles.monoBold}>{h.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {stats.segments.length > 0 && (
            <div className={styles.card}>
              <span className={styles.cardTitle}>{t('guests_overview.chart_segments')}</span>
              <div className={styles.tagList}>
                {stats.segments.map((s) => (
                  <div key={s.tag} className={styles.tagRow}>
                    <span className={styles.tagLabel}>{s.tag}</span>
                    <div className={styles.tagRail}>
                      <div className={styles.tagFill} style={{ width: `${s.rate}%` }} />
                    </div>
                    <span className={styles.tagPct}>{s.rate}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.cardBeige}>
            <span className={styles.cardTitle}>{t('guests_overview.chart_reminders')}</span>
            {stats.reminded === 0 ? (
              <>
                <div className={styles.remindEmpty}>{t('guests_overview.reminders_empty')}</div>
                <button type="button" className={styles.btnGhost} onClick={() => onGoToTab?.('esperando')}>
                  {t('guests_overview.reminders_cta')}
                </button>
              </>
            ) : (
              <>
                <div className={styles.remindRow}>
                  <span className={styles.remindBig}>{stats.remindedConfirmed}</span>
                  <span className={styles.remindOf}>{t('guests_overview.reminders_of', { total: stats.reminded })}</span>
                </div>
                <div className={styles.cardFootPlain}>
                  {stats.remindedConfirmed > 0 ? t('guests_overview.reminders_hint') : t('guests_overview.reminders_pending')}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
