import { Check, TriangleAlert, Volume2, VolumeX, X } from 'lucide-react'
import { hhmm, isArrived, tableName } from './scannerUtils'
import styles from './Scanner.module.css'

const DOT = { ok: '#37C25C', dup: '#E6961F', bad: '#EC6A5B' }

export const ScanOverlay = ({ arrived, total, sound, onToggleSound, onClose, recent, result }) => (
  <div className={styles.scanner}>
    <div id='qr-scanner-viewport' className={styles.viewport} />

    <div className={styles.scanTop}>
      <button type='button' className={styles.closePill} onClick={onClose}>
        <X size={18} />
        Cerrar
      </button>
      <span className={styles.counterPill}>
        <span className={styles.dot} style={{ background: '#37C25C' }} />
        {arrived} / {total}
      </span>
      <button
        type='button'
        className={styles.soundBtn}
        onClick={onToggleSound}
        style={{ opacity: sound ? 1 : 0.45 }}
        aria-label={sound ? 'Silenciar' : 'Activar sonido'}
      >
        {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
    </div>

    <div className={styles.scanCenter}>
      <div className={styles.frame}>
        <span className={`${styles.corner} ${styles.cTL}`} />
        <span className={`${styles.corner} ${styles.cTR}`} />
        <span className={`${styles.corner} ${styles.cBL}`} />
        <span className={`${styles.corner} ${styles.cBR}`} />
        <span className={styles.scanLine} />
      </div>
      <div className={styles.scanCopy}>
        <p className={styles.scanTitle}>Apunta al QR del pase</p>
        <p className={styles.scanHint}>Pide al invitado subir el brillo de su pantalla y abrir el pase en Apple Wallet.</p>
      </div>
    </div>

    <div className={styles.scanBottom}>
      {recent.length > 0 && (
        <>
          <p className={styles.recentTitle}>Últimos escaneos</p>
          <div className={styles.recentChips}>
            {recent.map(r => (
              <span key={r.key} className={styles.recentChip}>
                <span className={styles.dot} style={{ background: DOT[r.kind] }} />
                {r.name}
                <span className={styles.recentTime}>{r.at}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>

    {result && <ScanResult {...result} />}
  </div>
)

const KIND = {
  ok: { cls: styles.resOk, icon: <Check size={44} strokeWidth={2.5} />, kicker: 'Bienvenido' },
  dup: { cls: styles.resDup, icon: <TriangleAlert size={40} strokeWidth={2.2} />, kicker: 'Este pase ya se usó' },
  bad: { cls: styles.resBad, icon: <X size={44} strokeWidth={2.5} />, kicker: 'Pase no válido' },
}

const ScanResult = ({ kind, guest, members, at, sub, table, selected, onToggle, onPrimary, onSecondary }) => {
  const k = KIND[kind]
  const time = hhmm(at)
  const subText = sub ?? (
    kind === 'ok' ? `Registrado a las ${time}`
      : kind === 'dup' ? `${time ? `Entró a las ${time}. ` : 'Ya estaba registrado. '}Verifica su identidad antes de dejarlo pasar.`
        : 'Este código no pertenece a este evento.'
  )

  const party = kind === 'ok' ? members.map(m => {
    const locked = m.id === guest.id
    const already = !locked && isArrived(m)
    const mAt = hhmm(m.arrived_at)
    return {
      m,
      locked: locked || already,
      checked: locked || already || !!selected[m.id],
      sub: locked ? 'Titular del pase' : already ? `Ya había llegado${mAt ? ` · ${mAt}` : ''}` : 'Acompañante',
    }
  }) : []
  const entering = party.filter(p => p.checked).length

  return (
    <div className={`${styles.result} ${k.cls}`}>
      <div className={styles.resInner}>
        <div className={styles.resIcon}>{k.icon}</div>

        <div>
          <p className={styles.resKicker}>{k.kicker}</p>
          <h2 className={`${styles.display} ${styles.resName}`}>{guest?.name ?? 'QR no reconocido'}</h2>
          <p className={styles.resSub}>{subText}</p>
        </div>

        {table && kind !== 'bad' && (
          <div className={styles.resTable}>
            <span className={styles.resTableLabel}>MESA</span>
            <span className={`${styles.display} ${styles.resTableNum}`}>{table.number}</span>
            {tableName(table) && <span className={styles.resTableName}>{tableName(table)}</span>}
          </div>
        )}

        {party.length > 1 && (
          <div className={styles.resParty}>
            <span className={styles.resPartyHead}>En este pase · entran {entering} de {party.length}</span>
            {party.map(p => (
              <button
                key={p.m.id}
                type='button'
                className={styles.resMember}
                aria-disabled={p.locked}
                onClick={() => { if (!p.locked) onToggle(p.m.id) }}
              >
                <span className={`${styles.resCheck} ${p.checked ? styles.resCheckOn : ''}`}>
                  {p.checked && <Check size={18} strokeWidth={3} />}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span className={styles.resMemberName}>{p.m.name}</span>
                  <span className={styles.resMemberSub}>{p.sub}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <div className={styles.resActions}>
          <button type='button' className={styles.resPrimary} onClick={onPrimary}>
            {kind === 'ok' ? 'Siguiente pase' : kind === 'dup' ? 'Permitir entrada' : 'Escanear de nuevo'}
          </button>
          <button type='button' className={styles.resSecondary} onClick={onSecondary}>
            {kind === 'dup' ? 'No permitir' : 'Ver lista'}
          </button>
        </div>
      </div>
    </div>
  )
}
