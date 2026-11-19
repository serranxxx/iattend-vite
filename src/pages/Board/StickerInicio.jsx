import { createElement, useId } from 'react'

/*
  Stickers del Inicio de Pops (handoff "Inicio de Pops" › Stickers): seis
  formas (estallido, globo "POP!", ojos, destello, corazón, nota) en SVG con
  el acabado de cada estilo:
    - pop: halftone neón (trama de puntos negros con máscara diagonal)
    - business: gloss (brillo radial blanco + sombra)
    - craft y azul (Collage azul): papel (borde blanco de 16 px + sombra)
  Calcado de la función `sticker()` del prototipo, para que se vean igual.
*/

const FORMAS = {
    burst: () => {
        const p = []
        for (let i = 0; i < 24; i++) {
            const a = -Math.PI / 2 + i * Math.PI / 12
            const r = i % 2 ? 26 + (i * 7 % 9) : 46 + (i * 5 % 7)
            p.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`)
        }
        return [['polygon', { points: p.join(' ') }]]
    },
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

const EXTRA = {
    eyes: (
        <>
            <ellipse cx={36} cy={58} rx={9} ry={12} fill='#111' />
            <ellipse cx={78} cy={60} rx={9} ry={12} fill='#111' />
            <circle cx={39} cy={53} r={3} fill='#FFF' />
            <circle cx={81} cy={55} r={3} fill='#FFF' />
        </>
    ),
    bubble: (
        <text x={52} y={50} textAnchor='middle' fontFamily='Poppins' fontWeight={900} fontSize={30} letterSpacing={-2} fill='#111'>POP!</text>
    ),
}

const COLORES_STICKER = {
    pop: { burst: '#FF2BD6', bubble: '#3FE0F0', eyes: '#F5F51E', spark: '#2BF5B0', heart: '#FF5A1F', note: '#FF2BD6' },
    business: { burst: '#14213D', bubble: '#F2F4FF', eyes: '#2BD67B', spark: '#CDF22B', heart: '#2BD67B', note: '#A9BCFF' },
    azul: { burst: '#CDF22B', bubble: '#FFFFFF', eyes: '#FFB3C9', spark: '#CDF22B', heart: '#FF5FA8', note: '#0B1F3A' },
    craft: { burst: '#F4A6A0', bubble: '#F1D9B5', eyes: '#F5D21E', spark: '#FFFFFF', heart: '#E8513A', note: '#1D1D1B' },
}

const ACABADO = { pop: 'halftone', business: 'gloss', craft: 'paper', azul: 'paper' }

const SOMBRA = {
    halftone: 'none',
    gloss: 'drop-shadow(0 10px 14px rgba(0,0,40,.35))',
    paper: 'drop-shadow(0 6px 8px rgba(0,0,0,.3))',
}

export const StickerInicio = ({ forma, tema = 'pop', tamano }) => {
    const id = useId().replace(/:/g, '')
    const modo = ACABADO[tema] ?? 'halftone'
    const color = COLORES_STICKER[tema]?.[forma] ?? '#111'
    const figura = () => FORMAS[forma]().map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))

    return (
        <svg viewBox='-10 -10 120 120' width={tamano} height={tamano} style={{ display: 'block', overflow: 'visible', filter: SOMBRA[modo] }} aria-hidden>
            <defs>
                <clipPath id={`${id}c`}>{figura()}</clipPath>
                {modo === 'halftone' && (
                    <>
                        <pattern id={`${id}p`} width={5} height={5} patternUnits='userSpaceOnUse' patternTransform='rotate(30)'>
                            <circle cx={2.5} cy={2.5} r={1.8} fill='#111' />
                        </pattern>
                        <linearGradient id={`${id}g`} x1={0} y1={0} x2={1} y2={1}>
                            <stop offset={0.15} stopColor='#FFF' />
                            <stop offset={0.7} stopColor='#000' />
                        </linearGradient>
                        <mask id={`${id}m`}>
                            <rect x={-10} y={-10} width={120} height={120} fill={`url(#${id}g)`} />
                        </mask>
                    </>
                )}
                {modo === 'gloss' && (
                    <radialGradient id={`${id}r`} cx={0.32} cy={0.25} r={0.75}>
                        <stop offset={0} stopColor='#FFF' stopOpacity={0.55} />
                        <stop offset={0.5} stopColor='#FFF' stopOpacity={0} />
                        <stop offset={1} stopColor='#000' stopOpacity={0.22} />
                    </radialGradient>
                )}
            </defs>
            {modo === 'paper' && (
                <g fill='#FFFFFF' stroke='#FFFFFF' strokeWidth={16} strokeLinejoin='round'>{figura()}</g>
            )}
            <g fill={color} stroke={color} strokeWidth={modo === 'paper' ? 2 : 9} strokeLinejoin='round'>{figura()}</g>
            {modo === 'halftone' && (
                <g clipPath={`url(#${id}c)`} mask={`url(#${id}m)`}>
                    <rect x={-10} y={-10} width={120} height={120} fill={`url(#${id}p)`} />
                </g>
            )}
            {modo === 'gloss' && (
                <g clipPath={`url(#${id}c)`}>
                    <rect x={-10} y={-10} width={120} height={120} fill={`url(#${id}r)`} />
                </g>
            )}
            {EXTRA[forma]}
        </svg>
    )
}

export default StickerInicio
