import { Check } from 'lucide-react'
import { hhmm, initials } from './scannerUtils'
import styles from './Scanner.module.css'

const AVATAR = { pending: styles.avPending, partial: styles.avPartial, done: styles.avDone }

export const GuestRow = ({ party, meta, onOpen }) => {
  const { primary, members, status, arrived, total } = party
  const arrivedAt = hhmm(primary.arrived_at) ?? hhmm(members.find(m => m.arrived_at)?.arrived_at)

  return (
    <button type='button' className={styles.row} onClick={() => onOpen(party)}>
      <div className={`${styles.avatar} ${AVATAR[status]}`}>{initials(primary.name)}</div>
      <div className={styles.rowText}>
        <span className={styles.rowName}>{primary.name || '—'}</span>
        <span className={styles.rowMeta}>{meta}</span>
      </div>
      {status === 'done' && (
        <span className={`${styles.pill} ${styles.pillDone}`}>
          <Check size={14} strokeWidth={2.5} />
          {arrivedAt ?? 'Llegó'}
        </span>
      )}
      {status === 'partial' && (
        <span className={`${styles.pill} ${styles.pillPartial}`}>{arrived}/{total} llegaron</span>
      )}
      {status === 'pending' && (
        <span className={`${styles.pill} ${styles.pillPending}`}>Registrar</span>
      )}
    </button>
  )
}
