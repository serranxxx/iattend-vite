import { useTranslation } from 'react-i18next'
import base from './CountdownStylePicker.module.css'
import styles from './GreetingStylePicker.module.css'

// Galería de estilos de la Bienvenida (handoff "Bienvenida Catálogo"), en el
// popover "Estilo" de la barra del bloque. Guarda greeting.style; "W1" (o
// vacío) es la clásica de siempre. La pieza los pinta (iattend-events
// Greeting/GreetingStyles.tsx). Miniaturas con la tipografía de la invitación.

const GREETING_STYLES = [
    { id: 'W1', name: 'Clásica' },
    { id: 'W2', name: 'Itálica romántica' },
    { id: 'W3', name: 'Entre reglas' },
    { id: 'W5', name: 'Cita' },
    { id: 'W6', name: 'Enmarcada' },
    { id: 'W7', name: 'Arco' },
    { id: 'W8', name: 'Palabra por palabra' },
]

const L = ({ w, c, o = 0.55 }) => <i className={styles.ln} style={{ width: w, background: c, opacity: o }} />
const Body = ({ ink }) => <span className={styles.col}><L w={64} c={ink} /><L w={52} c={ink} /></span>

const Sample = ({ id, ink, tone, serif, sans }) => {
    const t = { color: ink, fontFamily: serif }
    switch (id) {
        case 'W1': return <span className={styles.col} style={{ gap: 5 }}><b style={{ ...t, textTransform: 'uppercase' }}>Bienvenidos</b><Body ink={ink} /></span>
        case 'W2': return <span className={styles.col} style={{ gap: 4 }}><em style={t}>Bienvenidos</em><span className={styles.orn} style={{ color: tone }}><i style={{ background: tone }} />✦<i style={{ background: tone }} /></span><Body ink={ink} /></span>
        case 'W3': return <span className={styles.col} style={{ gap: 5 }}><span className={styles.rules} style={{ borderColor: ink, color: ink, fontFamily: sans }}>BIENVENIDOS</span><Body ink={ink} /></span>
        case 'W5': return <span className={styles.col} style={{ gap: 3 }}><span className={styles.quote} style={t}>“</span><Body ink={ink} /><small style={{ color: ink, fontFamily: sans }}>BIENVENIDOS</small></span>
        case 'W6': return <span className={styles.frame} style={{ borderColor: tone, outlineColor: tone }}><b style={{ ...t, textTransform: 'uppercase', fontSize: 9 }}>Bienvenidos</b><Body ink={ink} /></span>
        case 'W7': return <span className={styles.arch} style={{ borderColor: ink }}><b style={{ ...t, fontSize: 9 }}>Bienvenidos</b><Body ink={ink} /></span>
        case 'W8': return <span className={styles.col} style={{ gap: 5 }}><b style={t}>Bien<span style={{ opacity: 0.35, filter: 'blur(1px)' }}>venidos</span></b><span className={styles.col}><L w={64} c={ink} /><L w={30} c={ink} o={0.2} /></span></span>
        default: return null
    }
}

export const GreetingStylePicker = ({ invitation, value, onPick }) => {
    const { t } = useTranslation()
    const g = invitation?.generals ?? {}
    const primary = g.colors?.primary ?? '#FFFFFF'
    const secondary = g.colors?.secondary ?? '#B9AEDD'
    const accent = g.colors?.accent ?? '#29262D'
    const gr = invitation?.greeting ?? {}
    const bgColor = gr.dynamic_background?.active ? (gr.dynamic_background.custom_color || secondary) : primary
    const ink = gr.inverted ? primary : accent
    const serif = g.fonts?.titles?.typeFace || 'Cormorant Garamond'
    const sans = g.fonts?.body?.typeFace || 'Outfit'
    const current = value || 'W1'

    return (
        <div className={base.wrap} data-text-bar onMouseDown={(e) => e.stopPropagation()}>
            <span className={base.title}>{t('build_editor.greeting_style_title')}</span>
            <div className={`${base.grid} scroll-invitation`}>
                {GREETING_STYLES.map((s) => (
                    <button key={s.id} type="button" className={base.card} data-on={current === s.id || undefined} onClick={() => onPick(s.id)}>
                        <span className={base.preview} style={{ background: bgColor }}>
                            <Sample id={s.id} ink={ink} tone={secondary} serif={serif} sans={sans} />
                        </span>
                        <span className={base.name}>{s.name}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
