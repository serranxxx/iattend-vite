import { useEffect, useRef } from 'react'
import {
    Bird, Cake, Camera, Church, Flower, Flower2, Gem, Heart, Infinity as InfinityIcon,
    Leaf, Moon, Music, Sparkles, Star, Sun, Wine,
} from 'lucide-react'
import { Separador } from '../../components/Invitation/Logos'
import { iconsItinerary } from '../../helpers/services/menuIcons'
import { estiloVector, trazoDeIcono, useVector } from './vector'
import styles from './Elemento.module.css'

/*
  Elemento suelto que no es imagen, de todos los editores: lo dibujan la
  pieza de un Flash (SideCanvas) y las miniaturas del panel Capas.
  Contenido de un elemento de la portada de un Flash que no es imagen
  (`body.stickers[n].kind`): ícono, forma, texto, línea o decoración. Mismo
  modelo y mismo dibujo que los elementos de la invitación (SectionLayer en
  iattend-events); contraparte en la página del invitado:
  iattend-events/src/components/SideEvent/FlashElemento.tsx. El contenedor
  (el lienzo de 390 × 700) es `container-type: inline-size`, así los textos
  miden en cqw y escalan igual que una imagen.
  Sin color propio va en blanco, el color del texto de la pieza.
*/

const ICONS = {
    Heart, Sparkles, Star, Flower, Flower2, Leaf, Gem, Moon, Sun, Wine, Music, Camera, Church, Infinity: InfinityIcon, Bird, Cake,
}

// Tamaño de letra = ancho del texto × factor (en cqw).
const TEXT_FACTOR = { title: 0.16, subtitle: 0.1, body: 0.06 }

const LINE_BORDER = {
    solid: '1.5px solid',
    dashed: '1.5px dashed',
    dotted: '3px dotted',
    double: '4px double',
}

const BOX_SHAPES = new Set(['square', 'rect'])
const NS = { vectorEffect: 'non-scaling-stroke' }
const SHAPE_PATHS = {
    circle: <ellipse cx="50" cy="50" rx="50" ry="50" {...NS} />,
    triangle: <polygon points="50,0 100,100 0,100" {...NS} />,
    star: <polygon points="50,2 61,37 98,37 68,59 79,96 50,73 21,96 32,59 2,37 39,37" {...NS} />,
}
const dashFor = (style, sw) => (style === 'dashed' ? `${sw * 3} ${sw * 2}` : style === 'dotted' ? `0 ${sw * 2}` : undefined)

const DEFAULT_COLOR = '#FFFFFF'

// Vector del catálogo usado como ícono (momento del itinerario): del color
// del texto y con el trazo de un ícono, no el del archivo.
export const VectorIcono = ({ url, size }) => {
    const info = useVector(url)
    const caja = { display: 'inline-block', width: size, height: size, minWidth: size, lineHeight: 0 }
    if (!info) {
        return <span aria-hidden style={{ ...caja, background: 'currentColor', WebkitMaskImage: `url("${url}")`, maskImage: `url("${url}")`, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }} />
    }
    return <span aria-hidden style={{ ...caja, ...estiloVector({ strokeFixed: true, strokePx: trazoDeIcono(size) }, info) }} dangerouslySetInnerHTML={{ __html: info.markup }} />
}

// Vector (`vector: true`): SVG en línea con color y grosor propios. Mientras
// carga se ve como máscara, igual que un ícono, para no parpadear.
export const Vector = ({ s, color, className = '' }) => {
    const info = useVector(s.src)
    if (!info) {
        return <span className={`${styles.icon} ${styles.maskIcon} ${className}`} style={{ backgroundColor: color, WebkitMaskImage: `url("${s.src}")`, maskImage: `url("${s.src}")`, aspectRatio: `1 / ${s.ar ?? 1}` }} />
    }
    return (
        <span
            className={`${styles.vector} ${className}`}
            style={{ color, aspectRatio: `${info.vbW} / ${info.vbH}`, ...estiloVector(s, info) }}
            dangerouslySetInnerHTML={{ __html: info.markup }}
        />
    )
}

// `color`: fuerza un color (miniaturas de Capas). `editable` + `onTextDone`:
// el texto se escribe encima (doble clic en la pieza).
export const FlashElemento = ({ s, titleFont, bodyFont = 'Poppins', color: forced, editable = false, onTextDone }) => {
    const color = forced ?? (s.color && s.color !== 'transparent' ? s.color : DEFAULT_COLOR)
    const editRef = useRef(null)

    useEffect(() => {
        const el = editRef.current
        if (!editable || !el) return
        el.focus()
        const r = document.createRange()
        r.selectNodeContents(el)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(r)
    }, [editable])

    if (s.kind === 'icon') {
        if (s.src && s.vector) return <Vector s={s} color={color} />
        if (s.src) {
            return s.tint === false
                ? <img src={s.src} alt="" draggable={false} className={styles.icon} />
                : <span className={`${styles.icon} ${styles.maskIcon}`} style={{ backgroundColor: color, WebkitMaskImage: `url("${s.src}")`, maskImage: `url("${s.src}")` }} />
        }
        if (s.icon?.startsWith('it:')) {
            const ItIcon = iconsItinerary.find((x) => x.index === Number(s.icon.slice(3)))?.value
            if (ItIcon) return <ItIcon className={styles.icon} color={color} />
        }
        const Icon = ICONS[s.icon ?? ''] ?? Heart
        return <Icon className={styles.icon} color={color} strokeWidth={1.6} />
    }

    if (s.kind === 'shape') {
        const sw = s.strokeWidth ?? 0
        const fill = forced ? 'transparent' : (s.color === 'transparent' ? 'transparent' : s.color || DEFAULT_COLOR)
        const stroke = forced ?? (s.stroke || DEFAULT_COLOR)
        const strokeW = forced ? Math.max(sw, 2) : sw
        if (BOX_SHAPES.has(s.variant ?? 'square')) {
            const r = s.radius ?? 0
            return (
                <span
                    className={styles.shapeBox}
                    style={{
                        aspectRatio: `1 / ${s.ar ?? 1}`,
                        background: fill,
                        border: strokeW > 0 ? `${strokeW}px ${s.strokeStyle || 'solid'} ${stroke}` : 'none',
                        borderRadius: r >= 999 ? 9999 : `${(r / 390) * 100}cqw`,
                    }}
                />
            )
        }
        return (
            <span className={styles.shape} style={{ aspectRatio: `1 / ${s.ar ?? 1}` }}>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">
                    <g fill={fill === 'transparent' ? 'none' : fill} stroke={strokeW > 0 ? stroke : 'none'} strokeWidth={strokeW} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dashFor(s.strokeStyle, strokeW)}>
                        {SHAPE_PATHS[s.variant ?? 'circle'] ?? SHAPE_PATHS.circle}
                    </g>
                </svg>
            </span>
        )
    }

    if (s.kind === 'separator') {
        return (
            <span className={styles.separator}>
                <Separador MainColor={color} value={Number(s.variant) || 1} />
            </span>
        )
    }

    if (s.kind === 'line') {
        return <span className={styles.line} style={{ borderTop: `${LINE_BORDER[s.variant ?? 'solid'] ?? LINE_BORDER.solid} ${color}` }} />
    }

    // Texto
    const variant = s.variant ?? 'body'
    const textStyle = {
        color,
        fontFamily: s.font || (variant === 'title' ? titleFont : bodyFont),
        fontWeight: variant === 'title' ? 600 : variant === 'subtitle' ? 500 : 400,
        fontSize: `${s.w * (TEXT_FACTOR[variant] ?? 0.06)}cqw`,
    }
    if (editable) {
        return (
            <span
                ref={editRef}
                className={styles.text}
                style={textStyle}
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') e.currentTarget.blur() }}
                onBlur={(e) => onTextDone?.(e.currentTarget.innerText.replace(/\n$/, ''))}
            >
                {s.text}
            </span>
        )
    }
    return <span className={styles.text} style={textStyle}>{s.text}</span>
}

// Miniatura para las listas de capas: la imagen, o el elemento en gris oscuro.
export const MiniaturaElemento = ({ s }) => (
    !s.kind || s.kind === 'sticker'
        ? <img src={s.url} alt="" draggable={false} />
        : s.kind === 'text'
            ? <span className={styles.miniTexto}>Aa</span>
            : <span className={styles.mini}><FlashElemento s={{ ...s, w: 100 }} color="#29262D" /></span>
)
