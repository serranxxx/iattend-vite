import { LogOut, Moon, ScanLine, Search, Share2, Sun, X } from 'lucide-react'
import { GuestRow } from './GuestRow'
import { tableTitle } from './scannerUtils'
import styles from './Scanner.module.css'

const FILTERS = [['pending', 'Faltan'], ['arrived', 'Llegaron'], ['all', 'Todos']]

const HeaderActions = ({ small, theme, onShare, onToggleTheme, onLogout }) => {
  const cls = `${styles.iconBtn} ${small ? styles.iconBtnSm : ''}`
  return (
    <div className={styles.iconRow}>
      <button type='button' className={cls} onClick={onShare} title='Compartir lector' aria-label='Compartir lector'>
        <Share2 size={16} strokeWidth={2} />
      </button>
      <button type='button' className={cls} onClick={onToggleTheme} title='Cambiar tema' aria-label='Cambiar tema'>
        {theme === 'dark' ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
      </button>
      <button type='button' className={cls} onClick={onLogout} title='Cerrar sesión' aria-label='Cerrar sesión'>
        <LogOut size={16} strokeWidth={2} />
      </button>
    </div>
  )
}

const SearchBox = ({ query, onQuery }) => (
  <div className={styles.search}>
    <Search size={18} />
    <input
      className={styles.searchInput}
      placeholder='Buscar invitado o acompañante'
      value={query}
      onChange={e => onQuery(e.target.value)}
      autoComplete='off'
      autoCorrect='off'
      spellCheck={false}
      enterKeyHint='search'
    />
    {query && (
      <button type='button' className={styles.clearBtn} onClick={() => onQuery('')} aria-label='Limpiar búsqueda'>
        <X size={14} />
      </button>
    )}
  </div>
)

const Segmented = ({ filter, onFilter, counts }) => (
  <div className={styles.segmented}>
    {FILTERS.map(([key, label]) => (
      <button
        key={key}
        type='button'
        className={`${styles.segBtn} ${filter === key ? styles.segBtnActive : ''}`}
        onClick={() => onFilter(key)}
      >
        {label}
        <span className={styles.segCount}>{counts[key]}</span>
      </button>
    ))}
  </div>
)

const Rows = ({ rows, query, loading, grid, onOpenParty }) => {
  if (loading && !rows.length) return <div className={styles.loading}>Cargando invitados…</div>
  if (!rows.length) {
    return (
      <p className={styles.empty}>
        {query ? `Nadie coincide con “${query}”.` : 'No hay invitados en esta vista.'}
      </p>
    )
  }
  return (
    <div className={grid ? styles.listGrid : styles.list}>
      {rows.map(r => <GuestRow key={r.party.id} party={r.party} meta={r.meta} onOpen={onOpenParty} />)}
    </div>
  )
}

export const ScannerList = (props) => {
  const {
    isTablet, theme, eventName, eventMeta, total, arrived, rows, counts, tableStats, tableFilter, onTableFilter,
    query, onQuery, filter, onFilter, loading, tableLabel, onOpenParty, onScan, onShare, onToggleTheme, onLogout,
  } = props
  const pct = total ? (arrived / total) * 100 : 0
  const actions = { theme, onShare, onToggleTheme, onLogout }

  if (isTablet) {
    return (
      <div className={styles.tablet}>
        <aside className={styles.sidebar}>
          <div className={styles.sideTop}>
            <img src='/images/logo_blue.png' alt='I attend' className={styles.sideLogo} />
            <HeaderActions small {...actions} />
          </div>

          <div>
            <p className={`${styles.kicker} ${styles.sideKicker}`}>Control de acceso</p>
            <h1 className={`${styles.display} ${styles.sideEvent}`}>{eventName || 'Evento'}</h1>
            {eventMeta && <p className={styles.sideMeta}>{eventMeta}</p>}
          </div>

          <div className={styles.sideProgress}>
            <div>
              <span className={styles.bigCount}>{arrived}</span>
              <span className={styles.bigOf}>/ {total} llegaron</span>
            </div>
            <div className={`${styles.bar} ${styles.barLg}`}>
              <div className={styles.barFill} style={{ width: `${pct}%` }} />
            </div>
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={styles.dot} style={{ background: 'var(--green)' }} />{arrived} adentro
              </span>
              <span className={styles.legendItem}>
                <span className={styles.dot} style={{ background: 'var(--line2)' }} />{total - arrived} por llegar
              </span>
            </div>
          </div>

          {tableStats.length > 0 && (
            <div className={styles.sideTables}>
              <p className={styles.sideTablesTitle}>Por mesa</p>
              <SideTable label='Todas las mesas' a={arrived} n={total} active={!tableFilter} onClick={() => onTableFilter(null)} />
              {tableStats.map(x => (
                <SideTable
                  key={x.table.id}
                  label={tableTitle(x.table)}
                  a={x.a}
                  n={x.n}
                  active={tableFilter === x.table.id}
                  onClick={() => onTableFilter(tableFilter === x.table.id ? null : x.table.id)}
                />
              ))}
            </div>
          )}

          <button type='button' className={`${styles.primaryBtn} ${styles.scanBtnLg}`} onClick={onScan}>
            <ScanLine size={22} />
            Escanear pase
          </button>
        </aside>

        <main className={styles.main}>
          <div className={styles.mainHead}>
            <h2 className={`${styles.display} ${styles.mainTitle}`}>Invitados</h2>
            <span className={styles.mainSub}>{tableLabel}</span>
          </div>
          <div className={styles.mainControls}>
            <SearchBox query={query} onQuery={onQuery} />
            <Segmented filter={filter} onFilter={onFilter} counts={counts} />
          </div>
          <Rows rows={rows} query={query} loading={loading} grid onOpenParty={onOpenParty} />
        </main>
      </div>
    )
  }

  return (
    <div className={styles.phone}>
      <header className={styles.phoneHeader}>
        <div style={{ minWidth: 0 }}>
          <p className={styles.kicker}>Control de acceso</p>
          <h1 className={`${styles.display} ${styles.eventName}`}>{eventName || 'Evento'}</h1>
        </div>
        <HeaderActions {...actions} />
      </header>

      <div className={styles.phoneBody}>
        <div className={styles.progressCard}>
          <div className={styles.progressTop}>
            <div>
              <span className={styles.progressCount}>{arrived}</span>
              <span className={styles.progressOf}>/ {total} llegaron</span>
            </div>
            <span className={styles.progressPending}>{total - arrived} por llegar</span>
          </div>
          <div className={styles.bar}>
            <div className={styles.barFill} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <SearchBox query={query} onQuery={onQuery} />
        <Segmented filter={filter} onFilter={onFilter} counts={counts} />

        {tableStats.length > 0 && (
          <div className={styles.chips}>
            <button
              type='button'
              className={`${styles.chip} ${!tableFilter ? styles.chipActive : ''}`}
              onClick={() => onTableFilter(null)}
            >
              Todas las mesas
            </button>
            {tableStats.map(x => (
              <button
                key={x.table.id}
                type='button'
                className={`${styles.chip} ${tableFilter === x.table.id ? styles.chipActive : ''}`}
                onClick={() => onTableFilter(tableFilter === x.table.id ? null : x.table.id)}
              >
                Mesa {x.table.number}
                <span className={styles.chipCount}>{x.a}/{x.n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Rows rows={rows} query={query} loading={loading} onOpenParty={onOpenParty} />

      <div className={styles.phoneCta}>
        <button type='button' className={`${styles.primaryBtn} ${styles.scanBtn}`} onClick={onScan}>
          <ScanLine size={22} />
          Escanear pase
        </button>
      </div>
    </div>
  )
}

const SideTable = ({ label, a, n, active, onClick }) => (
  <button type='button' className={`${styles.sideTable} ${active ? styles.sideTableActive : ''}`} onClick={onClick}>
    <span className={styles.sideTableTop}>
      <span className={styles.sideTableLabel}>{label}</span>
      <span className={styles.sideTableCount}>{a}/{n}</span>
    </span>
    <span className={`${styles.bar} ${styles.barSm}`}>
      <span className={styles.barFill} style={{ display: 'block', width: `${n ? (a / n) * 100 : 0}%` }} />
    </span>
  </button>
)
