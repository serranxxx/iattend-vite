import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import styles from './GuestsPie.module.css'

/**
 * Distribución de invitados: dona interactiva sobre TODA la lista.
 *
 * Dos ejes independientes:
 *   - "Segmentar por" elige la dimensión que parte el pastel.
 *   - Los filtros acotan la población; se agregan tocando una rebanada (o su
 *     entrada en la leyenda) y se quitan desde los chips de arriba.
 *
 * Así se puede llegar a cualquier cruce ("de los de etiqueta Familia, ¿cómo van
 * de confirmación?") sin salir de la tarjeta.
 */

// Paleta de la dona, tomada de index.css. Se recorre en orden y se repite si
// una dimensión tiene más valores que colores (p. ej. muchas etiquetas).
const SLICE_COLORS = [
  'var(--light-purple-500)',
  'var(--blue-color)',
  'var(--light-green-500)',
  'var(--yellow-color)',
  'var(--red-color)',
  'var(--purple-color)',
  'var(--blue-color-40)',
  'var(--green-color)',
  'var(--yellow-color-80)',
  'var(--red-color-80)',
  'var(--gray-color)',
  'var(--blue-color-80)',
]

// Dimensiones que dejan de aplicar al filtrar por un estado: a un invitado que
// todavía no recibe su invitación no se le puede medir la entrega, y a uno que
// no ha confirmado no se le asigna mesa.
const HIDDEN_BY_STATE = {
  creado: ['table', 'dispatch'],
  confirmado: ['dispatch'],
  esperando: ['table'],
}

const CX = 110
const CY = 110
const R_OUT = 100
const R_IN = 62

const polar = (r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}

const arcPath = (start, end) => {
  const large = end - start > 180 ? 1 : 0
  const [x1, y1] = polar(R_OUT, start)
  const [x2, y2] = polar(R_OUT, end)
  const [x3, y3] = polar(R_IN, end)
  const [x4, y4] = polar(R_IN, start)
  return `M ${x1} ${y1} A ${R_OUT} ${R_OUT} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${R_IN} ${R_IN} 0 ${large} 0 ${x4} ${y4} Z`
}

export const GuestsPie = ({ rowData = [], dispatchMap = {}, tables = [], className = '' }) => {
  const { t } = useTranslation()
  const [dimKey, setDimKey] = useState('state')
  // Un filtro por dimensión, acumulables entre sí.
  const [filters, setFilters] = useState([]) // [{ dim, value, label }]
  const [listOpen, setListOpen] = useState(false)
  const listRef = useRef(null)

  // El panel de la lista se cierra al tocar fuera o con Escape.
  useEffect(() => {
    if (!listOpen) return undefined
    const onDown = (e) => { if (!listRef.current?.contains(e.target)) setListOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setListOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [listOpen])

  // Estatus de envío "efectivo": solo existe para envíos hechos por la API.
  const dispatchOf = (g) => dispatchMap[g.id]?.status ?? 'manual'

  const allDimensions = useMemo(() => {
    // Ojo: los valores de segmento se normalizan a string, y `id` de la tabla es
    // numérico — hay que comparar en el mismo tipo. Además `id` y `number` son
    // cosas distintas: se busca por id, se muestra el number.
    const tableName = (id) => {
      const tb = tables.find((x) => String(x.id) === String(id))
      if (!tb) return t('guests_overview.pie_none_table')
      return tb.name ? `${t('guests.table_prefix')} ${tb.number} · ${tb.name}` : `${t('guests.table_prefix')} ${tb.number}`
    }

    const all = [
      {
        key: 'state',
        label: t('guests_overview.pie_dim_state'),
        // "asistente" es un confirmado que ya llegó al evento: misma rebanada.
        valueOf: (g) => (g.state === 'asistente' ? 'confirmado' : (g.state ?? 'creado')),
        labelOf: (v) => t(`guests.state_${v}`, { defaultValue: v }),
      },
      {
        key: 'dispatch',
        label: t('guests_overview.pie_dim_dispatch'),
        valueOf: dispatchOf,
        labelOf: (v) => ({
          delivered: t('guests.msg_delivered'),
          read: t('guests.msg_read_full'),
          sent: t('guests.msg_sent'),
          failed: t('guests.msg_failed'),
          processing: t('guests.msg_processing'),
          manual: t('guests.msg_manual'),
        })[v] ?? v,
      },
      {
        key: 'tag',
        label: t('guests_overview.pie_dim_tag'),
        valueOf: (g) => (g.tag && String(g.tag).trim()) || '__none__',
        labelOf: (v) => (v === '__none__' ? t('guests_overview.pie_none_tag') : v),
      },
      {
        key: 'tier',
        label: t('guests_overview.pie_dim_tier'),
        valueOf: (g) => g.tier || '__none__',
        labelOf: (v) => (v === '__none__' ? t('guests_overview.pie_none_tier') : v),
      },
      {
        key: 'type',
        label: t('guests_overview.pie_dim_type'),
        valueOf: (g) => g.type || 'undefined',
        labelOf: (v) => t(`guests.type_${v}`, { defaultValue: v }),
      },
      {
        key: 'side',
        label: t('guests_overview.pie_dim_side'),
        valueOf: (g) => (g.side && String(g.side).trim()) || '__none__',
        labelOf: (v) => (v === '__none__' ? t('guests_overview.pie_none_side') : v),
      },
      {
        key: 'table',
        label: t('guests_overview.pie_dim_table'),
        valueOf: (g) => g.table ?? '__none__',
        labelOf: (v) => (v === '__none__' ? t('guests_overview.pie_none_table') : tableName(v)),
      },
    ]

    // Una dimensión solo se ofrece si de verdad discrimina: con un único valor
    // el pastel sería un círculo completo y no diría nada.
    return all.filter((d) => new Set(rowData.map(d.valueOf)).size > 1)
  }, [rowData, dispatchMap, tables, t])

  // Las que se pueden elegir hoy. Los filtros siempre se resuelven contra
  // allDimensions, para que ninguno deje de aplicarse en silencio.
  const dimensions = useMemo(() => {
    const stateFilter = filters.find((f) => f.dim === 'state')
    const hidden = new Set(stateFilter ? (HIDDEN_BY_STATE[stateFilter.value] ?? []) : [])
    return allDimensions.filter((d) => !hidden.has(d.key))
  }, [allDimensions, filters])

  const dim = dimensions.find((d) => d.key === dimKey) ?? dimensions[0]

  // Población: todos los invitados menos lo que descarten los filtros activos.
  const population = useMemo(() => {
    if (filters.length === 0) return rowData
    return rowData.filter((g) => filters.every((f) => {
      const d = allDimensions.find((x) => x.key === f.dim)
      return d ? String(d.valueOf(g)) === String(f.value) : true
    }))
  }, [rowData, filters, allDimensions])

  const segments = useMemo(() => {
    if (!dim) return []
    const counts = new Map()
    population.forEach((g) => {
      const v = String(dim.valueOf(g))
      counts.set(v, (counts.get(v) ?? 0) + 1)
    })
    const total = population.length || 1
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, n], i) => ({
        value,
        n,
        pct: Math.round((n / total) * 1000) / 10,
        label: dim.labelOf(value),
        color: SLICE_COLORS[i % SLICE_COLORS.length],
      }))
  }, [population, dim])

  if (!dim || rowData.length === 0) return null

  const total = population.length

  const toggleFilter = (segment) => {
    const already = filters.some((f) => f.dim === dim.key && String(f.value) === String(segment.value))
    // Una dimensión aporta un solo valor: elegir otra rebanada de la misma
    // dimensión reemplaza su filtro, no lo suma.
    const rest = filters.filter((f) => f.dim !== dim.key)

    if (already) {
      setFilters(rest)
      return
    }

    const raw = [...rest, { dim: dim.key, value: segment.value, label: segment.label }]

    // Si el nuevo filtro es de estado, se sueltan los filtros de dimensiones que
    // ese estado vuelve inaplicables (no se quedan colgados sin chip visible).
    const stateFilter = raw.find((f) => f.dim === 'state')
    const hidden = new Set(stateFilter ? (HIDDEN_BY_STATE[stateFilter.value] ?? []) : [])
    const next = raw.filter((f) => !hidden.has(f.dim))
    setFilters(next)

    // Al filtrar por la dimensión que se está viendo, el pastel se quedaría en
    // una sola rebanada del 100%. Se avanza a la siguiente dimensión sin filtrar
    // para que el clic siga abriendo información en vez de cerrarla.
    const used = new Set(next.map((f) => f.dim))
    const following = allDimensions.find((d) => !used.has(d.key) && !hidden.has(d.key))
    if (following) setDimKey(following.key)
  }

  // Ángulos acumulados de cada rebanada
  let cursor = 0
  const arcs = segments.map((s) => {
    const sweep = total > 0 ? (s.n / total) * 360 : 0
    const arc = { start: cursor, end: cursor + sweep }
    cursor += sweep
    return arc
  })

  return (
    <section className={`${styles.card} ${className}`}>
      <div className={styles.head}>
        <span className={styles.title}>{t('guests_overview.pie_title')}</span>
        <span className={styles.meta}>{t('guests_overview.pie_hint')}</span>
      </div>

      {/* Segmentar por: etiqueta arriba, chips en fila debajo */}
      <div className={styles.dims}>
        <span className={styles.dimsLabel}>{t('guests_overview.pie_group_by')}</span>
        <div className={styles.dimsRow}>
          <div className={styles.dimsChips}>
        {dimensions.map((d) => (
          <button
            key={d.key}
            type="button"
            className={styles.dimChip}
            data-active={d.key === dim.key || undefined}
            onClick={() => setDimKey(d.key)}
          >
            {d.label}
          </button>
        ))}
          </div>

        {filters.length > 0 && (
          <div className={styles.listWrap} ref={listRef}>
            <button
              type="button"
              className={styles.listBtn}
              data-open={listOpen || undefined}
              onClick={() => setListOpen((o) => !o)}
            >
              <span>{t('guests_overview.pie_list')}</span>
              <span className={styles.listCount}>{total}</span>
            </button>

            {listOpen && (
              <div className={styles.listPanel}>
                <div className={styles.listHead}>
                  <span>{t('guests_overview.pie_list_title', { count: total })}</span>
                  <button type="button" className={styles.listClose} onClick={() => setListOpen(false)}>
                    <X size={14} />
                  </button>
                </div>
                <div className={styles.listBody}>
                  {population.length === 0 ? (
                    <div className={styles.listEmpty}>{t('guests_overview.pie_empty')}</div>
                  ) : population.map((g) => (
                    <div key={g.id} className={styles.listRow}>
                      <span className={styles.listName} title={g.name}>{g.name}</span>
                      <span className={styles.listPhone}>
                        {g.phone_number || t('guests.card_no_phone')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Filtros activos */}
      {filters.length > 0 && (
        <div className={styles.filters}>
          <span className={styles.filtersLabel}>{t('guests_overview.pie_filters')}</span>
          {filters.map((f) => (
            <button
              key={`${f.dim}-${f.value}`}
              type="button"
              className={styles.filterChip}
              onClick={() => setFilters((prev) => prev.filter((x) => !(x.dim === f.dim && x.value === f.value)))}
            >
              <span>{allDimensions.find((d) => d.key === f.dim)?.label}: {f.label}</span>
              <X size={12} />
            </button>
          ))}
          <button type="button" className={styles.clear} onClick={() => { setFilters([]); setListOpen(false) }}>
            {t('guests_overview.pie_clear')}
          </button>
        </div>
      )}

      {total === 0 ? (
        <div className={styles.empty}>{t('guests_overview.pie_empty')}</div>
      ) : (
        <div className={styles.body}>
          <div className={styles.donutWrap}>
            <svg viewBox="0 0 220 220" className={styles.donut} role="img">
              {segments.length === 1 ? (
                <circle
                  cx={CX}
                  cy={CY}
                  r={(R_OUT + R_IN) / 2}
                  fill="none"
                  stroke={segments[0].color}
                  strokeWidth={R_OUT - R_IN}
                />
              ) : (
                segments.map((s, i) => (
                  <path
                    key={s.value}
                    d={arcPath(arcs[i].start, arcs[i].end)}
                    fill={s.color}
                    className={styles.slice}
                    onClick={() => toggleFilter(s)}
                  />
                ))
              )}
            </svg>

            <div className={styles.center}>
              <span className={styles.centerValue}>{total}</span>
              <span className={styles.centerLabel}>{t('guests_overview.pie_total')}</span>
            </div>
          </div>

          <div className={styles.legend}>
            {segments.map((s) => (
              <button
                key={s.value}
                type="button"
                className={styles.legendRow}
                onClick={() => toggleFilter(s)}
              >
                <span className={styles.legendDot} style={{ background: s.color }} />
                <span className={styles.legendLabel}>{s.label}</span>
                <span className={styles.legendCount}>{s.n}</span>
                <span className={styles.legendPct}>{s.pct}%</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
