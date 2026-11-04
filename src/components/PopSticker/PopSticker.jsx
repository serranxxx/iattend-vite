import { createElement, useId } from 'react'

/**
 * Stickers de trama de Pops (handoff "Sección Pops", objeto `SH` del
 * prototipo): forma de color neón + borde "recortado" del mismo color y una
 * trama de puntos negros recortada a la forma, desvanecida en diagonal.
 *
 * kind: burst · heart · note · eyes · spark · bubble
 * color: cualquier color CSS (se recomienda una var(--pops-*)).
 */

const burst = () => {
    const p = []
    for (let i = 0; i < 24; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 12
        const r = i % 2 ? 26 + ((i * 7) % 9) : 46 + ((i * 5) % 7)
        p.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`)
    }
    return [['polygon', { points: p.join(' ') }]]
}

const FORMAS = {
    burst,
    heart: () => [['path', { d: 'M50 90 C20 68 4 52 4 32 C4 17 16 6 30 6 C39 6 46 11 50 19 C54 11 61 6 70 6 C84 6 96 17 96 32 C96 52 80 68 50 90Z' }]],
    note: () => [
        ['polygon', { points: '30,22 88,8 88,26 42,38 42,74 30,74' }],
        ['polygon', { points: '76,12 88,8 88,64 76,64' }],
        ['ellipse', { cx: 26, cy: 76, rx: 16, ry: 12, transform: 'rotate(-20 26 76)' }],
        ['ellipse', { cx: 72, cy: 66, rx: 16, ry: 12, transform: 'rotate(-20 72 66)' }],
    ],
    eyes: () => [
        ['ellipse', { cx: 30, cy: 50, rx: 22, ry: 32, transform: 'rotate(-12 30 50)' }],
        ['ellipse', { cx: 72, cy: 52, rx: 22, ry: 32, transform: 'rotate(-12 72 52)' }],
    ],
    spark: () => [['path', { d: 'M50 2 C55 36 64 45 98 50 C64 55 55 64 50 98 C45 64 36 55 2 50 C36 45 45 36 50 2Z' }]],
    bubble: () => [['path', { d: 'M12 16 Q12 6 22 6 L82 4 Q94 4 94 16 L92 60 Q92 70 82 70 L44 72 L26 92 L30 72 L20 72 Q10 72 10 62Z' }]],
}

const TINTA = 'var(--pops-tinta, #111)'

const EXTRA = {
    eyes: (
        <>
            <ellipse cx={36} cy={58} rx={9} ry={12} style={{ fill: TINTA }} />
            <ellipse cx={78} cy={60} rx={9} ry={12} style={{ fill: TINTA }} />
            <circle cx={39} cy={53} r={3} fill='#FFF' />
            <circle cx={81} cy={55} r={3} fill='#FFF' />
        </>
    ),
    bubble: (
        <text x={52} y={50} textAnchor='middle' fontFamily='Poppins, sans-serif' fontWeight={900} fontSize={30} letterSpacing={-2} style={{ fill: TINTA }}>POP!</text>
    ),
}

const Forma = ({ kind }) => FORMAS[kind]().map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))

export function PopSticker({ kind, color, size = 80, className, style }) {
    const k = 'pk' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
    return (
        <svg
            viewBox='-10 -10 120 120'
            width={size}
            height={size}
            className={className}
            style={{ display: 'block', overflow: 'visible', ...style }}
            aria-hidden
        >
            <defs>
                <pattern id={`${k}p`} width={5} height={5} patternUnits='userSpaceOnUse' patternTransform='rotate(30)'>
                    <circle cx={2.5} cy={2.5} r={1.8} style={{ fill: TINTA }} />
                </pattern>
                <linearGradient id={`${k}g`} x1={0} y1={0} x2={1} y2={1}>
                    <stop offset={0.15} stopColor='#FFF' />
                    <stop offset={0.7} stopColor='#000' />
                </linearGradient>
                <mask id={`${k}m`}>
                    <rect x={-10} y={-10} width={120} height={120} fill={`url(#${k}g)`} />
                </mask>
                <clipPath id={`${k}c`}><Forma kind={kind} /></clipPath>
            </defs>
            <g style={{ fill: color, stroke: color }} strokeWidth={9} strokeLinejoin='round'><Forma kind={kind} /></g>
            <g clipPath={`url(#${k}c)`} mask={`url(#${k}m)`}>
                <rect x={-10} y={-10} width={120} height={120} fill={`url(#${k}p)`} />
            </g>
            {EXTRA[kind]}
        </svg>
    )
}

export default PopSticker
