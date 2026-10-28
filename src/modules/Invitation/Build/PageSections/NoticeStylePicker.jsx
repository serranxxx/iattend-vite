import { useTranslation } from 'react-i18next'
import base from './CountdownStylePicker.module.css'
import styles from './NoticeStylePicker.module.css'

// Galería de estilos de Recordatorios / avisos (handoff "Recordatorios
// Catálogo"), en el popover "Estilo" de la barra del bloque. Guarda
// notices.style; "R1" (o vacío) es el apilado de siempre. La pieza los pinta
// (iattend-events Notices/NoticeStyles.tsx). Miniaturas esquemáticas.

const NOTICE_STYLES = [
    { id: 'R1', name: 'Apilado' },
    { id: 'R2', name: 'Numerado editorial' },
    { id: 'R4', name: 'Notas adhesivas' },
    { id: 'R5', name: 'Uno a la vez' },
    { id: 'R6', name: 'Checklist' },
    { id: 'R7', name: 'Guía del invitado' },
    { id: 'R8', name: 'Mensajes de la pareja' },
]

const L = ({ w, c, o = 1 }) => <i className={styles.ln} style={{ width: w, background: c, opacity: o }} />

const Sample = ({ id, c, ink }) => {
    switch (id) {
        case 'R1': return <span className={styles.col}><L w={56} c={ink} /><b style={{ color: ink }}>…</b><L w={46} c={ink} /><b style={{ color: ink }}>…</b><L w={52} c={ink} /></span>
        case 'R2': return <span className={styles.col} style={{ alignItems: 'stretch', width: 92 }}>{['01', '02'].map((n) => <span key={n} className={styles.num} style={{ borderColor: ink, color: ink }}><em>{n}</em><L w={48} c={ink} /></span>)}</span>
        case 'R4': return <span className={styles.col} style={{ gap: 5, width: 92 }}>{[[c.secondary, -2, 'flex-start'], [c.actions, 1.5, 'flex-end']].map(([bg, r, a], i) => <i key={i} className={styles.note} style={{ background: `color-mix(in srgb, ${bg} ${i ? 60 : 38}%, ${c.primary})`, transform: `rotate(${r}deg)`, alignSelf: a }}><L w={36} c={ink} o={0.7} /></i>)}</span>
        case 'R5': return <span className={styles.col} style={{ gap: 5 }}><span className={styles.card} style={{ borderColor: ink }}><L w={52} c={ink} /><L w={36} c={ink} o={0.6} /></span><span className={styles.dots}>{[14, 4, 4].map((w, i) => <i key={i} style={{ width: w, background: ink, opacity: i ? 0.3 : 1 }} />)}</span></span>
        case 'R6': return <span className={styles.col} style={{ alignItems: 'flex-start', gap: 6 }}>{[1, 0, 0].map((on, i) => <span key={i} className={styles.row}><i className={styles.box} style={{ borderColor: c.secondary, background: on ? c.secondary : 'transparent' }} /><L w={on ? 40 : 52} c={ink} o={on ? 0.45 : 1} /></span>)}</span>
        case 'R7': return <span className={styles.guide} style={{ borderColor: c.secondary, outlineColor: c.secondary }}><L w={30} c={ink} o={0.5} /><L w={50} c={ink} /><b style={{ color: ink }}>✦ ✦ ✦</b><L w={44} c={ink} /></span>
        case 'R8': return <span className={styles.col} style={{ alignItems: 'flex-start', gap: 4, width: 92 }}><span className={styles.row}><i className={styles.avatar} style={{ background: c.secondary }} /><L w={34} c={ink} /></span><i className={styles.bubble}><L w={50} c="#29262D" o={0.6} /></i><i className={styles.bubble}><L w={36} c="#29262D" o={0.6} /></i></span>
        default: return null
    }
}

export const NoticeStylePicker = ({ invitation, value, onPick }) => {
    const { t } = useTranslation()
    const g = invitation?.generals ?? {}
    const c = {
        primary: g.colors?.primary ?? '#FFFFFF',
        secondary: g.colors?.secondary ?? '#B9AEDD',
        accent: g.colors?.accent ?? '#29262D',
        actions: g.colors?.actions ?? '#8A7552',
    }
    const no = invitation?.notices ?? {}
    const bgColor = no.dynamic_background?.active ? (no.dynamic_background.custom_color || c.secondary) : c.primary
    const ink = no.inverted ? c.primary : c.accent
    const current = value || 'R1'

    return (
        <div className={base.wrap} data-text-bar onMouseDown={(e) => e.stopPropagation()}>
            <span className={base.title}>{t('build_editor.notice_style_title')}</span>
            <div className={`${base.grid} scroll-invitation`}>
                {NOTICE_STYLES.map((s) => (
                    <button key={s.id} type="button" className={base.card} data-on={current === s.id || undefined} onClick={() => onPick(s.id)}>
                        <span className={base.preview} style={{ background: bgColor }}>
                            <Sample id={s.id} c={c} ink={ink} />
                        </span>
                        <span className={base.name}>{s.name}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
