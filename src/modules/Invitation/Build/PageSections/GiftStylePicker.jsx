import { useTranslation } from 'react-i18next'
import base from './CountdownStylePicker.module.css'
import styles from './GiftStylePicker.module.css'

// Galería de estilos de la mesa de regalos (handoff "Mesa de Regalos
// Catálogo"), en el popover "Estilo" de la barra del bloque. Guarda
// gifts.style; "1a" es la cartera de siempre. La pieza los pinta
// (iattend-events GiftStyles.tsx). Miniaturas esquemáticas con la paleta.

const GIFT_STYLES = [
    { id: '1a', name: 'Cartera' },
    { id: '1c', name: 'Sobre' },
    { id: '1e', name: 'Baraja' },
    { id: '1f', name: 'Girar tarjeta' },
    { id: '1h', name: 'Caja de regalo' },
]

const CARDS = ['#E0047F', '#1464C8', '#232E3B']

const Sample = ({ id, box, ink, accent }) => {
    switch (id) {
        case '1a': return (
            <span className={styles.stage}>
                {CARDS.map((c, i) => <i key={c} className={styles.card} style={{ background: c, top: 6 + i * 9 }} />)}
                <i className={styles.pocket} style={{ background: box }} />
            </span>
        )
        case '1c': return (
            <span className={styles.stage}>
                {CARDS.map((c, i) => <i key={c} className={styles.card} style={{ background: c, top: 2 + i * 9 }} />)}
                <i className={styles.envelope} style={{ background: box }} />
                <i className={styles.seal} style={{ background: accent }} />
            </span>
        )
        case '1e': return (
            <span className={styles.stage}>
                {CARDS.slice().reverse().map((c, i) => <i key={c} className={styles.card} style={{ background: c, top: 18 - i * 5, transform: `scale(${0.88 + i * 0.06})` }} />)}
                <span className={styles.dots}>{[18, 6, 6].map((w, i) => <i key={i} style={{ width: w, background: ink, opacity: i ? 0.25 : 1 }} />)}</span>
            </span>
        )
        case '1f': return (
            <span className={styles.row}>
                <i className={styles.flat} style={{ background: CARDS[0] }} />
                <i className={styles.flat} style={{ background: '#FFFFFF', borderLeft: `4px solid ${CARDS[1]}` }} />
                <i className={styles.flat} style={{ background: CARDS[2] }} />
            </span>
        )
        case '1h': return (
            <span className={styles.stage}>
                {CARDS.map((c, i) => <i key={c} className={styles.cardSm} style={{ background: c, top: 4 + i * 7, transform: `rotate(${-6 + i * 6}deg)` }} />)}
                <i className={styles.box} style={{ background: box }} />
                <i className={styles.lid} style={{ background: box }}><b style={{ background: accent }} /></i>
            </span>
        )
        default: return null
    }
}

export const GiftStylePicker = ({ invitation, value, onPick }) => {
    const { t } = useTranslation()
    const g = invitation?.generals ?? {}
    const primary = g.colors?.primary ?? '#FFFFFF'
    const secondary = g.colors?.secondary ?? '#B9AEDD'
    const accent = g.colors?.accent ?? '#29262D'
    const gifts = invitation?.gifts ?? {}
    const active = Boolean(gifts.dynamic_background?.active)
    // Fondo del bloque y color de la cartera / contenedor, como en la pieza.
    const bgColor = active ? (gifts.dynamic_background.custom_color || secondary) : primary
    const box = active ? (gifts.inverted ? primary : secondary) : (gifts.inverted ? secondary : primary)
    const ink = active && gifts.inverted ? primary : accent
    const current = value || '1a'

    return (
        <div className={base.wrap} data-text-bar onMouseDown={(e) => e.stopPropagation()}>
            <span className={base.title}>{t('build_editor.gift_style_title')}</span>
            <div className={`${base.grid} scroll-invitation`}>
                {GIFT_STYLES.map((s) => (
                    <button key={s.id} type="button" className={base.card} data-on={current === s.id || undefined} onClick={() => onPick(s.id)}>
                        <span className={base.preview} style={{ background: bgColor }}>
                            <Sample id={s.id} box={box === bgColor ? `color-mix(in srgb, ${box} 85%, #000)` : box} ink={ink} accent={accent} />
                        </span>
                        <span className={base.name}>{s.name}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
