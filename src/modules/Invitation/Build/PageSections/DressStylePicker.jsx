import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover } from 'antd'
import { ArrowUpRight, LayoutGrid, Pin } from 'lucide-react'
import base from './CountdownStylePicker.module.css'
import bar from './ElementBar.module.css'
import styles from './DressStylePicker.module.css'

// Estilos del Dress code (handoff "Dresscode Catálogo"): un catálogo por
// elemento, en el botón "Estilo" de su barra (paleta, imágenes o link).
// Guarda dresscode.palette_style / images_style / button_style; la primera
// opción de cada uno (P1 / I1 / B1) es la de siempre y se guarda vacía. La
// pieza los pinta (iattend-events Dresscode/DresscodeStyles.tsx).

const CATALOG = {
    palette: {
        field: 'palette_style',
        title: 'build_editor.dress_palette_style',
        items: [['P1', 'Círculos superpuestos'], ['P2', 'Círculos con nombre'], ['P3', 'Barra'], ['P4', 'Etiquetas de tela'], ['P5', 'Muestrario'], ['P6', 'Tipográfica']],
    },
    images: {
        field: 'images_style',
        title: 'build_editor.dress_images_style',
        items: [['I1', 'Carrusel'], ['I2', 'Collage'], ['I3', 'Polaroids'], ['I4', 'Cuadrícula'], ['I5', 'Pila']],
    },
    button: {
        field: 'button_style',
        title: 'build_editor.dress_button_style',
        items: [['B1', 'Pastilla'], ['B2', 'Color Pinterest'], ['B3', 'Contorno'], ['B4', 'Link de texto'], ['B6', 'Ícono con texto']],
    },
}

const Sample = ({ id, colors, fg, photo }) => {
    const cs = colors.length ? colors.slice(0, 4) : ['#262626', '#BCD0E0', '#F4F4F2']
    const ph = { backgroundImage: photo ? `url("${photo}")` : undefined, backgroundColor: '#C9B79C' }
    switch (id) {
        case 'P1': return <span className={styles.row}>{cs.map((c, i) => <i key={i} className={styles.dot} style={{ background: c, marginLeft: i ? -8 : 0 }} />)}</span>
        case 'P2': return <span className={styles.row} style={{ gap: 8 }}>{cs.map((c, i) => <span key={i} className={styles.col}><i className={styles.dot} style={{ background: c, border: 'none' }} /><b style={{ background: fg }} /></span>)}</span>
        case 'P3': return <span className={styles.barP} >{cs.map((c, i) => <i key={i} style={{ background: c }} />)}</span>
        case 'P4': return <span className={styles.row} style={{ gap: 6 }}>{cs.slice(0, 3).map((c, i) => <i key={i} className={styles.tag} style={{ transform: `rotate(${[-6, 2, 7][i]}deg)` }}><b style={{ background: c }} /></i>)}</span>
        case 'P5': return <span className={styles.swatches}>{cs.slice(0, 3).map((c, i) => <i key={i} style={{ background: c }} />)}</span>
        case 'P6': return <span className={styles.col} style={{ color: fg }}><em>Viste en</em><span className={styles.row} style={{ gap: 6 }}>{cs.slice(0, 3).map((c, i) => <i key={i} className={styles.mini} style={{ background: c }} />)}</span></span>
        case 'I1': return <span className={styles.row} style={{ gap: 4 }}>{[0, 1, 2].map((i) => <i key={i} className={styles.card} style={ph} />)}</span>
        case 'I2': return <span className={styles.collage}><i style={ph} /><i style={ph} /><i style={ph} /></span>
        case 'I3': return <span className={styles.row} style={{ gap: 2 }}>{[-7, 2, 8].map((r) => <i key={r} className={styles.pola} style={{ transform: `rotate(${r}deg)` }}><b style={ph} /></i>)}</span>
        case 'I4': return <span className={styles.grid4}>{[0, 1, 2, 3].map((i) => <i key={i} style={ph} />)}</span>
        case 'I5': return <span className={styles.stack}>{[2, 1, 0].map((k) => <i key={k} style={{ ...ph, transform: `translate(${k * 4}px, ${k * 3}px) rotate(${[0, 4, -4][k]}deg)` }} />)}</span>
        case 'B1': return <span className={styles.pill} style={{ background: '#FFFFFF', color: '#1B1B1B' }}><Pin size={11} />Inspiración</span>
        case 'B2': return <span className={styles.pill} style={{ background: '#E60023', color: '#FFFFFF' }}><Pin size={11} />Inspiración</span>
        case 'B3': return <span className={styles.pill} style={{ border: `1.5px solid ${fg}`, color: fg }}><Pin size={11} />Inspiración</span>
        case 'B4': return <span className={styles.link} style={{ color: fg, borderColor: fg }}>Inspiración<ArrowUpRight size={12} /></span>
        case 'B6': return <span className={styles.col} style={{ color: fg, gap: 4 }}><i className={styles.pinCircle}><Pin size={13} /></i><small>INSPIRACIÓN</small></span>
        default: return null
    }
}

// Botón "Estilo" + popover con el catálogo de `kind` ("palette" | "images" | "button").
export const DressStyleButton = ({ kind, invitation, setInvitation, setSaved }) => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const cat = CATALOG[kind]
    const dc = invitation?.dresscode ?? {}
    const g = invitation?.generals ?? {}
    const primary = g.colors?.primary ?? '#FFFFFF'
    const accent = g.colors?.accent ?? '#29262D'
    // Fondo del bloque y color de sus textos, como en la pieza.
    const bg = dc.dynamic_background?.active ? (dc.dynamic_background.custom_color || g.colors?.secondary || '#B9AEDD') : primary
    const fg = dc.inverted ? primary : accent
    const current = dc[cat.field] || cat.items[0][0]
    const pick = (id) => {
        setInvitation((prev) => ({ ...prev, dresscode: { ...prev.dresscode, [cat.field]: id === cat.items[0][0] ? null : id } }))
        setSaved(false)
    }

    return (
        <Popover
            open={open}
            onOpenChange={setOpen}
            trigger="click"
            placement="bottomRight"
            arrow={false}
            content={(
                <div className={base.wrap} data-text-bar onMouseDown={(e) => e.stopPropagation()}>
                    <span className={base.title}>{t(cat.title)}</span>
                    <div className={`${base.grid} scroll-invitation`}>
                        {cat.items.map(([id, name]) => (
                            <button key={id} type="button" className={base.card} data-on={current === id || undefined} onClick={() => pick(id)}>
                                <span className={base.preview} style={{ background: bg }}>
                                    <Sample id={id} colors={dc.colors ?? []} fg={fg} photo={(dc.dev ?? [])[0]} />
                                </span>
                                <span className={base.name}>{name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        >
            <button type="button" className={bar.textBtn} data-on={open || undefined}>
                <LayoutGrid size={17} /> {t('build_editor.cd_style')}
            </button>
        </Popover>
    )
}
