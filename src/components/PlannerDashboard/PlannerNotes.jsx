import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { fmtShort } from './plannerFormat'
import styles from './PlannerDashboard.module.css'

// Notas del planner ligadas a un evento. Enter agrega; clic marca hecha.
// Las hechas se van al final, tachadas.
export const PlannerNotes = ({ notes, onAdd, onToggle, active, titleOf, locale }) => {
    const { t } = useTranslation()
    const [draft, setDraft] = useState('')

    const sorted = [...notes].sort((a, b) => (a.done - b.done) || b.createdAt.localeCompare(a.createdAt))
    const openCount = notes.filter(n => !n.done).length

    const onKeyDown = (e) => {
        if (e.key !== 'Enter' || !draft.trim()) return
        onAdd(draft.trim())
        setDraft('')
    }

    return (
        <section className={`${styles.card} ${styles.notes}`}>
            <header className={styles.cardHead}>
                <h2 className={styles.notesTitle}>{t('planner.notes_title')}</h2>
                <span className={styles.notesCount}>{t('planner.notes_open', { count: openCount })}</span>
            </header>
            <input
                className={styles.input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={active ? t('planner.notes_ph_event', { title: active.title }) : t('planner.notes_ph')}
            />
            <ul className={styles.notesList}>
                {sorted.length === 0 && <li className={styles.muted}>{t('planner.notes_empty')}</li>}
                {sorted.map(n => (
                    <li key={n.id}>
                        <button
                            type='button'
                            className={`${styles.note} ${n.done ? styles.noteDone : ''}`}
                            onClick={() => onToggle(n.id)}
                            aria-pressed={n.done}
                        >
                            <span className={styles.checkbox}>{n.done && <Check size={11} strokeWidth={3} />}</span>
                            <span className={styles.noteText}>
                                <span>{n.text}</span>
                                <small>{[titleOf(n.eventId), fmtShort(n.createdAt.slice(0, 10), locale)].filter(Boolean).join(' · ')}</small>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    )
}
