import { useTranslation } from 'react-i18next'
import base from './CountdownStylePicker.module.css'
import styles from './DestinationStylePicker.module.css'

// Galería de estilos de Actividades y hospedaje (handoff "Actividades
// Catálogo"), en el popover "Estilo" de la barra del bloque. Guarda
// destinations.style; "1a" (o vacío) es el revistero. La pieza los pinta
// (iattend-events DestinationStyles.tsx). Miniaturas esquemáticas; los
// colores de tipo son fijos, como en la pieza.

const DEST_STYLES = [
    { id: '1a', name: 'Revistero' },
    { id: '1e', name: 'Llaveros de hotel' },
    { id: '1f', name: 'Postales' },
]

const TYPE_COLORS = ['#3FA66B', '#2E8BD8', '#C2793A']

const Sample = ({ id }) => {
    switch (id) {
        case '1a': return (
            <span className={styles.stage}>
                {[12, 5, -7].map((r, i) => <i key={r} className={styles.mag} style={{ background: TYPE_COLORS[2 - i], transform: `translate(${[22, 8, -6][i]}px, ${[-6, 0, 6][i]}px) rotate(${r}deg)` }} />)}
            </span>
        )
        case '1e': return (
            <span className={styles.board}>
                {TYPE_COLORS.map((c, i) => <i key={c} className={styles.key} style={{ background: c, transform: i === 1 ? 'rotate(5deg) translateY(2px)' : undefined }} />)}
            </span>
        )
        case '1f': return (
            <span className={styles.stage}>
                {[-3, 3, 0].map((r, i) => <i key={r} className={styles.post} style={{ transform: `translate(${(2 - i) * 3}px, ${(2 - i) * 4}px) rotate(${r}deg)` }}><b style={{ background: TYPE_COLORS[i] }} /></i>)}
            </span>
        )
        default: return null
    }
}

export const DestinationStylePicker = ({ invitation, value, onPick }) => {
    const { t } = useTranslation()
    const g = invitation?.generals ?? {}
    const dest = invitation?.destinations ?? {}
    const bgColor = dest.dynamic_background?.active ? (dest.dynamic_background.custom_color || g.colors?.secondary || '#B9AEDD') : (g.colors?.primary ?? '#FFFFFF')
    const current = value || '1a'

    return (
        <div className={base.wrap} data-text-bar onMouseDown={(e) => e.stopPropagation()}>
            <span className={base.title}>{t('build_editor.dest_style_title')}</span>
            <div className={`${base.grid} scroll-invitation`}>
                {DEST_STYLES.map((s) => (
                    <button key={s.id} type="button" className={base.card} data-on={current === s.id || undefined} onClick={() => onPick(s.id)}>
                        <span className={base.preview} style={{ background: bgColor }}>
                            <Sample id={s.id} />
                        </span>
                        <span className={base.name}>{s.name}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
