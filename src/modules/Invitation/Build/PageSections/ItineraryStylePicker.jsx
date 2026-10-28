import { useTranslation } from 'react-i18next'
import base from './CountdownStylePicker.module.css'
import styles from './ItineraryStylePicker.module.css'

// Galería de estilos del itinerario (handoff "Itinerario Catálogo"), en el
// popover "Estilo" de la barra del bloque. Guarda itinerary.style; "1a" es el
// zigzag de siempre. La pieza los pinta (iattend-events ItineraryStyles.tsx).
// Las miniaturas son un esquema con la paleta de la invitación, no el render.

const ITINERARY_STYLES = [
    { id: '1a', name: 'Zigzag' },
    { id: '1b', name: 'Riel izquierdo' },
    { id: '1c', name: 'Hora primero' },
    { id: '1d', name: 'Tarjetas conectadas' },
    { id: '1e', name: 'Deslizable' },
    { id: '1f', name: 'Editorial numerado' },
    { id: '1g', name: 'Nodos con ícono' },
    { id: '1h', name: 'Ilustración centrada' },
    { id: '1i', name: 'Programa clásico' },
    { id: '1j', name: 'Arcos' },
    { id: '1k', name: 'Chips de hora' },
    { id: '1l', name: 'Con mapa' },
]

// Renglón de texto falso (barra) para las miniaturas.
const L = ({ w = 40, c, o = 1, h = 4 }) => <i className={styles.ln} style={{ width: w, height: h, background: c, opacity: o }} />

// `s` / `o`: color del botón "Detalles" del zigzag y su texto (tarjetas, chips, botones).
const Sample = ({ id, c, ink, s, o }) => {
    const box = { background: c.secondary }
    switch (id) {
        case '1a': return (
            <span className={styles.zig}>
                <span className={styles.zigLine} style={{ background: ink }} />
                {[0, 1].map((i) => <span key={i} className={styles.zigItem} data-r={i || undefined}><L w={26} c={ink} /><L w={18} c={ink} o={0.5} /></span>)}
            </span>
        )
        case '1b': return (
            <span className={styles.col}>
                {[0, 1].map((i) => <span key={i} className={styles.row}><i className={styles.dot} style={{ borderColor: ink }} /><i className={styles.thumb} style={box} /><span className={styles.col2}><L w={18} c={c.actions} /><L w={36} c={ink} /></span></span>)}
            </span>
        )
        case '1c': return (
            <span className={styles.col}>
                {[4, 6].map((h) => <span key={h} className={styles.row}><b className={styles.hour} style={{ color: ink }}>{h}:00</b><i className={styles.vline} style={{ background: ink }} /><span className={styles.col2}><L w={34} c={ink} /><i className={styles.pill} style={{ background: s, width: 26 }} /></span></span>)}
            </span>
        )
        case '1d': return (
            <span className={styles.col} style={{ alignItems: 'center', gap: 0 }}>
                <span className={styles.card} style={{ background: s }}><i className={styles.circle} style={{ background: o }} /><L w={40} c={o} /></span>
                <i className={styles.dash} style={{ borderColor: ink }} />
                <span className={styles.card} style={{ background: s }}><i className={styles.circle} style={{ background: o }} /><L w={40} c={o} /></span>
            </span>
        )
        case '1e': return (
            <span className={styles.row} style={{ gap: 6 }}>
                {[0, 1, 2].map((i) => <span key={i} className={styles.slide} style={{ background: s }}><i className={styles.photo} style={box} /><L w={26} c={o} /></span>)}
            </span>
        )
        case '1f': return (
            <span className={styles.col} style={{ width: '78%' }}>
                {['01', '02'].map((n) => <span key={n} className={styles.rule} style={{ borderColor: ink }}><b className={styles.num} style={{ color: ink }}>{n}</b><L w={40} c={ink} /></span>)}
            </span>
        )
        case '1g': return (
            <span className={styles.col}>
                {[0, 1].map((i) => <span key={i} className={styles.row}><i className={styles.node} style={{ borderColor: ink }} /><L w={40} c={ink} /><i className={styles.pill} style={{ background: s }} /></span>)}
            </span>
        )
        case '1h': return (
            <span className={styles.col} style={{ alignItems: 'center', gap: 4 }}>
                <i className={styles.art} style={box} />
                <L w={42} c={ink} h={5} />
                <L w={26} c={c.actions} h={2} />
            </span>
        )
        case '1i': return (
            <span className={styles.frame} style={{ borderColor: ink }}>
                <i style={{ color: ink }}>◆ ◆ ◆</i>
                {[0, 1].map((i) => <span key={i} className={styles.leader}><L w={26} c={ink} /><i className={styles.dots} style={{ borderColor: ink }} /><L w={12} c={ink} /></span>)}
            </span>
        )
        case '1j': return (
            <span className={styles.row} style={{ gap: 6 }}>
                {[0, 1, 2].map((i) => <i key={i} className={styles.arch} style={{ ...box, borderColor: ink }} />)}
            </span>
        )
        case '1k': return (
            <span className={styles.col} style={{ alignItems: 'center', gap: 4 }}>
                <i className={styles.chip} style={{ background: s }} />
                <span className={styles.glass} style={{ background: `${s}8C` }}><L w={34} c={o} /><i className={styles.pill} style={{ background: c.primary }} /></span>
            </span>
        )
        case '1l': return (
            <span className={styles.mapCard} style={{ background: s }}>
                <i className={styles.map} />
                <span className={styles.row} style={{ padding: '5px 7px' }}><i className={styles.tile} style={{ background: c.secondary }} /><L w={30} c={o} /><i className={styles.pill} style={{ background: c.primary }} /></span>
            </span>
        )
        default: return null
    }
}

export const ItineraryStylePicker = ({ invitation, value, onPick }) => {
    const { t } = useTranslation()
    const g = invitation?.generals ?? {}
    const c = {
        primary: g.colors?.primary ?? '#FFFFFF',
        secondary: g.colors?.secondary ?? '#B9AEDD',
        accent: g.colors?.accent ?? '#29262D',
        actions: g.colors?.actions ?? '#8A7552',
    }
    const it = invitation?.itinerary ?? {}
    // Fondo y tinta del bloque, como en la pieza.
    const bgColor = it.dynamic_background?.active ? (it.dynamic_background.custom_color || c.secondary) : c.primary
    const ink = it.dynamic_background?.active && it.inverted ? c.primary : c.accent
    // Mismos colores que el botón "Detalles" del zigzag.
    const surface = it.dynamic_background?.active ? (it.inverted ? c.primary : c.secondary) : c.secondary
    // Sobre secondary el texto va en primary; sobre primary, en accent.
    const onSurface = surface === c.primary ? c.accent : c.primary
    const current = value || '1a'

    return (
        <div className={base.wrap} data-text-bar onMouseDown={(e) => e.stopPropagation()}>
            <span className={base.title}>{t('build_editor.it_title')}</span>
            <div className={`${base.grid} scroll-invitation`}>
                {ITINERARY_STYLES.map((s) => (
                    <button key={s.id} type="button" className={base.card} data-on={current === s.id || undefined} onClick={() => onPick(s.id)}>
                        <span className={base.preview} style={{ background: bgColor }}>
                            <Sample id={s.id} c={c} ink={ink} s={surface} o={onSurface} />
                        </span>
                        <span className={base.name}>{s.name}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
