import { useTranslation } from 'react-i18next'
import base from './CountdownStylePicker.module.css'
import styles from './GalleryStylePicker.module.css'

// Galería de estilos de la Galería (handoff "Galería Catálogo"), en el popover
// "Estilo" de la barra del bloque. Guarda gallery.style; "G1" (o vacío) es la
// base (pila → carrusel). La pieza los pinta (iattend-events GalleryStyles.tsx).
// Las miniaturas usan las fotos de la galería; muestran el estado cerrado.

const GALLERY_STYLES = [
    { id: 'G1', name: 'Pila → carrusel' },
    { id: 'G2', name: 'Abanico → cuadrícula' },
    { id: 'G3', name: 'Polaroids → lista' },
    { id: 'G4', name: 'Rollo de película' },
    { id: 'G5', name: 'Álbum' },
    { id: 'G6', name: 'Historias' },
]

const Sample = ({ id, photos, cloth, pill, pillText }) => {
    const ph = (i) => ({ backgroundImage: photos[i % (photos.length || 1)] ? `url("${photos[i % photos.length]}")` : undefined })
    switch (id) {
        case 'G1': return <span className={styles.stage}>{[[-6, -14], [6, 14], [0, 0]].map(([r, x], i) => <i key={i} className={styles.photo} style={{ ...ph(i), transform: `translateX(${x}px) rotate(${r}deg)` }} />)}</span>
        case 'G2': return <span className={styles.stage}>{[-2, -1, 0, 1, 2].map((k, i) => <i key={i} className={styles.fan} style={{ ...ph(i), transform: `translateX(${k * 3}px) rotate(${k * 6}deg)` }} />)}</span>
        case 'G3': return <span className={styles.stage}>{[-8, 6, -3].map((r, i) => <i key={i} className={styles.pola} style={{ transform: `translate(${[-6, 6, 0][i]}px, ${[0, 3, -2][i]}px) rotate(${r}deg)` }}><b style={ph(i)} /></i>)}</span>
        case 'G4': return <span className={styles.film}><i /><span>{[0, 1, 2].map((i) => <b key={i} style={ph(i)} />)}</span><i /></span>
        case 'G5': return <span className={styles.album} style={{ background: cloth }}><b style={ph(0)} /></span>
        case 'G6': return <span className={styles.col}><span className={styles.stage} style={{ height: 46 }}>{[[-7, -10], [7, 10], [0, 0]].map(([r, x], i) => <i key={i} className={styles.story} style={{ ...ph(i), transform: `translateX(${x}px) rotate(${r}deg)` }} />)}</span><em style={{ background: pill, color: pillText }}>▶ Ver historia</em></span>
        default: return null
    }
}

export const GalleryStylePicker = ({ invitation, value, onPick }) => {
    const { t } = useTranslation()
    const g = invitation?.generals ?? {}
    const gal = invitation?.gallery ?? {}
    const primary = g.colors?.primary ?? '#FFFFFF'
    const secondary = g.colors?.secondary ?? '#B9AEDD'
    const bgColor = gal.dynamic_background?.active ? (gal.dynamic_background.custom_color || secondary) : primary
    const current = value || 'G1'

    return (
        <div className={base.wrap} data-text-bar onMouseDown={(e) => e.stopPropagation()}>
            <span className={base.title}>{t('build_editor.gallery_style_title')}</span>
            <div className={`${base.grid} scroll-invitation`}>
                {GALLERY_STYLES.map((s) => (
                    <button key={s.id} type="button" className={base.card} data-on={current === s.id || undefined} onClick={() => onPick(s.id)}>
                        <span className={base.preview} style={{ background: bgColor }}>
                            <Sample id={s.id} photos={gal.dev ?? []} cloth={secondary} pill={secondary} pillText={primary} />
                        </span>
                        <span className={base.name}>{s.name}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
