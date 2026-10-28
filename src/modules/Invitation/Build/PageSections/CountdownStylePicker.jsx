import { useTranslation } from 'react-i18next'
import styles from './CountdownStylePicker.module.css'

// Galería de estilos de la cuenta regresiva (handoff "Countdown Catálogo"),
// en el popover "Estilo" de la barra de la fecha. Guarda cover.date.style;
// "1a" es el de siempre. La pieza los pinta (iattend-events
// CountdownStyles.tsx). Las miniaturas usan la foto de la portada y la
// paleta de la invitación: es una muestra, no el render exacto.

// Todos van sobre la foto de la portada, sin fondo propio.
const COUNTDOWN_STYLES = [
    { id: '1a', name: 'Cristal' },
    { id: '1b', name: 'Serif minimal' },
    { id: '1c', name: 'Tarjetas flip' },
    { id: '1d', name: 'Anillos' },
    { id: '1e', name: 'Editorial' },
    { id: '1f', name: 'Tarjeta de papel' },
    { id: '1g', name: 'Lista vertical' },
    { id: '1h', name: 'Cápsulas' },
    { id: '1i', name: 'Calendario' },
    { id: '1j', name: 'Número gigante' },
    { id: '1k', name: 'Boleto' },
    { id: '1l', name: 'Arco' },
]

const Sample = ({ id, c, serif, sans, text }) => {
    const n = { fontFamily: sans, color: text }
    switch (id) {
        case '1a': return <span className={styles.sCristal} style={{ ...n, borderColor: c.secondary }}>391 · 06 · 12 · 45</span>
        case '1b': return <span style={{ fontFamily: serif, color: text, fontSize: 20 }}>391 · 06 · 12</span>
        case '1c': return <span className={styles.row}>{['391', '06', '12'].map((v) => <i key={v} className={styles.tile} style={{ background: c.accent, color: c.primary, fontFamily: sans }}>{v}</i>)}</span>
        case '1d': return <span className={styles.row}>{['391', '06', '12'].map((v) => <i key={v} className={styles.ring} style={{ borderColor: text, color: text, fontFamily: sans }}>{v}</i>)}</span>
        case '1e': return <span style={{ fontFamily: serif, color: text, fontSize: 30, lineHeight: 1 }}>391 <em style={{ fontSize: 13 }}>días</em></span>
        case '1f': return <span className={styles.paper} style={{ background: c.primary, color: c.accent, fontFamily: serif }}>391 · 06 · 12</span>
        case '1g': return <span className={styles.list} style={{ color: text, fontFamily: serif }}><b>391</b><b>06</b></span>
        case '1h': return <span className={styles.row}>{['391', '06', '12'].map((v) => <i key={v} className={styles.pill} style={{ color: text, fontFamily: sans }}>{v}</i>)}</span>
        case '1i': return <span className={styles.cal} style={{ color: text }}>{Array.from({ length: 14 }).map((_, i) => <i key={i} style={i === 9 ? { background: c.secondary } : undefined} />)}</span>
        case '1j': return <span style={{ fontFamily: sans, fontSize: 34, fontWeight: 700, color: 'transparent', WebkitTextStroke: `1px ${text}`, lineHeight: 1 }}>391</span>
        case '1k': return <span className={styles.ticket}><span style={{ fontFamily: sans, color: c.accent }}>391 · 06</span><i style={{ background: c.accent, color: c.primary }}>24</i></span>
        case '1l': return <span className={styles.arch} style={{ borderColor: text, color: text, fontFamily: serif }}>391</span>
        default: return null
    }
}

export const CountdownStylePicker = ({ invitation, value, onPick }) => {
    const { t } = useTranslation()
    const g = invitation?.generals ?? {}
    const c = {
        primary: g.colors?.primary ?? '#FFFFFF',
        secondary: g.colors?.secondary ?? '#B9AEDD',
        accent: g.colors?.accent ?? '#29262D',
        actions: g.colors?.actions ?? '#8A7552',
    }
    const raw = invitation?.cover?.image?.dev
    const photo = (Array.isArray(raw) ? raw.find((u) => !/\.(mp4|webm|mov|m4v)/i.test(u)) : raw) || null
    const text = invitation?.cover?.date?.color || '#FFFFFF'
    const serif = g.fonts?.titles?.typeFace || 'Cormorant Garamond'
    const sans = invitation?.cover?.date?.font || g.fonts?.body?.typeFace || 'Outfit'
    const current = value || '1a'

    return (
        <div className={styles.wrap} data-text-bar onMouseDown={(e) => e.stopPropagation()}>
            <span className={styles.title}>{t('build_editor.cd_title')}</span>
            <div className={`${styles.grid} scroll-invitation`}>
                {COUNTDOWN_STYLES.map((s) => (
                    <button key={s.id} type="button" className={styles.card} data-on={current === s.id || undefined} onClick={() => onPick(s.id)}>
                        <span
                            className={styles.preview}
                            style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.45))${photo ? `, url("${photo}")` : ''}`, backgroundColor: '#5E5345' }}
                        >
                            <Sample id={s.id} c={c} serif={serif} sans={sans} text={text} />
                        </span>
                        <span className={styles.name}>{s.name}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
