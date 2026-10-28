import { useTranslation } from 'react-i18next'
import base from './CountdownStylePicker.module.css'
import styles from './PeopleStylePicker.module.css'

// Galería de estilos de Personas importantes (handoff "Personas Catálogo"),
// en el popover "Estilo" de la barra del bloque. Guarda people.style; "P1" (o
// vacío) es el apilado de siempre. La pieza los pinta (iattend-events
// Family/PeopleStyles.tsx). Miniaturas esquemáticas, todo centrado.

const PEOPLE_STYLES = [
    { id: 'P1', name: 'Apilado' },
    { id: 'P2', name: 'Dos columnas' },
    { id: 'P3', name: 'Serif con ornamento' },
    { id: 'P4', name: 'Lista con reglas' },
    { id: 'P5', name: 'Tarjetas' },
    { id: 'P6', name: 'Iniciales' },
]

const L = ({ w, c, o = 1, h = 3 }) => <i className={styles.ln} style={{ width: w, height: h, background: c, opacity: o }} />

const Person = ({ ink, tone, roleW = 24, nameW = 40 }) => (
    <span className={styles.col}><L w={roleW} c={tone} o={0.8} h={2} /><L w={nameW} c={ink} /></span>
)

// `card`: texto de las tarjetas de P5 (van del color secundario).
const Sample = ({ id, ink, tone, card }) => {
    switch (id) {
        case 'P1': return <span className={styles.col} style={{ gap: 7 }}><Person ink={ink} tone={ink} /><Person ink={ink} tone={ink} /></span>
        case 'P2': return <span className={styles.grid2}>{[0, 1, 2, 3].map((i) => <span key={i} className={styles.cell} style={i % 2 ? undefined : { borderRight: `1px solid ${ink}40` }}><Person ink={ink} tone={tone} roleW={16} nameW={28} /></span>)}</span>
        case 'P3': return <span className={styles.col} style={{ gap: 4 }}><L w={48} c={ink} h={4} /><L w={22} c={ink} o={0.6} h={2} /><b style={{ color: tone }}>✦</b><L w={42} c={ink} h={4} /><L w={22} c={ink} o={0.6} h={2} /></span>
        case 'P4': return <span className={styles.col} style={{ width: 88, gap: 0 }}>{[0, 1].map((i) => <span key={i} className={styles.rule} style={{ borderColor: ink }}><Person ink={ink} tone={ink} /></span>)}</span>
        case 'P5': return <span className={styles.grid2} style={{ gap: 4 }}>{[0, 1, 2, 3].map((i) => <span key={i} className={styles.card} style={{ background: tone }}><Person ink={card} tone={card} roleW={16} nameW={26} /></span>)}</span>
        case 'P6': return <span className={styles.col} style={{ gap: 6 }}>{['LC', 'MP'].map((t) => <span key={t} className={styles.col} style={{ gap: 2 }}><i className={styles.circle} style={{ borderColor: tone, color: ink }}>{t}</i><L w={34} c={ink} /></span>)}</span>
        default: return null
    }
}

export const PeopleStylePicker = ({ invitation, value, onPick }) => {
    const { t } = useTranslation()
    const g = invitation?.generals ?? {}
    const primary = g.colors?.primary ?? '#FFFFFF'
    const secondary = g.colors?.secondary ?? '#B9AEDD'
    const accent = g.colors?.accent ?? '#29262D'
    const pe = invitation?.people ?? {}
    const bgColor = pe.dynamic_background?.active ? (pe.dynamic_background.custom_color || secondary) : primary
    const ink = pe.inverted ? primary : accent
    const current = value || 'P1'

    return (
        <div className={base.wrap} data-text-bar onMouseDown={(e) => e.stopPropagation()}>
            <span className={base.title}>{t('build_editor.people_style_title')}</span>
            <div className={`${base.grid} scroll-invitation`}>
                {PEOPLE_STYLES.map((s) => (
                    <button key={s.id} type="button" className={base.card} data-on={current === s.id || undefined} onClick={() => onPick(s.id)}>
                        <span className={base.preview} style={{ background: bgColor }}>
                            <Sample id={s.id} ink={ink} tone={secondary} card={primary} />
                        </span>
                        <span className={base.name}>{s.name}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
