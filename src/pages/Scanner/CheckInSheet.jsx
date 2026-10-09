import { Check, X } from 'lucide-react'
import { hhmm, isArrived } from './scannerUtils'
import styles from './Scanner.module.css'

export const CheckInSheet = ({ isTablet, members, tableLabel, selected, onToggle, onSave, onClose, saving }) => {
  const add = members.filter(m => selected[m.id] && !isArrived(m)).length
  const rem = members.filter(m => !selected[m.id] && isArrived(m)).length
  const cta = add ? `Registrar llegada (${add})` : rem ? `Quitar registro (${rem})` : 'Todos ya llegaron'
  const disabled = (!add && !rem) || saving

  return (
    <div className={`${styles.scrim} ${isTablet ? styles.scrimTablet : styles.scrimPhone}`} onClick={onClose}>
      <div
        className={`${styles.sheet} ${isTablet ? styles.sheetTablet : styles.sheetPhone}`}
        onClick={e => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
      >
        <div className={styles.sheetHead}>
          <div style={{ minWidth: 0 }}>
            <h3 className={`${styles.display} ${styles.sheetName}`}>{members[0]?.name}</h3>
            <p className={styles.sheetMeta}>{tableLabel}</p>
          </div>
          <button type='button' className={styles.iconBtn} style={{ width: 40, height: 40 }} onClick={onClose} aria-label='Cerrar'>
            <X size={18} />
          </button>
        </div>

        <div className={styles.members}>
          {members.map((m, i) => {
            const checked = !!selected[m.id]
            const at = hhmm(m.arrived_at)
            const sub = (i === 0 ? 'Titular' : 'Acompañante') + (isArrived(m) ? ` · llegó${at ? ` ${at}` : ''}` : '')
            return (
              <button key={m.id} type='button' className={styles.member} onClick={() => onToggle(m.id)} aria-pressed={checked}>
                <span className={`${styles.checkbox} ${checked ? styles.checkboxOn : ''}`}>
                  {checked && <Check size={18} strokeWidth={3} />}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span className={styles.memberName}>{m.name}</span>
                  <span className={styles.memberSub}>{sub}</span>
                </span>
              </button>
            )
          })}
        </div>

        <button
          type='button'
          className={styles.primaryBtn}
          aria-disabled={disabled}
          onClick={() => { if (!disabled) onSave() }}
        >
          {cta}
        </button>
      </div>
    </div>
  )
}
