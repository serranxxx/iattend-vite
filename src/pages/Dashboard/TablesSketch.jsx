import { useId } from 'react'

// Ilustración de la tarjeta "Acomodo de mesas": mesa larga en perspectiva,
// dibujada a línea. El filtro de turbulencia le da el trazo de boceto; su id
// sale de useId porque un `#sketch` fijo chocaría si el SVG se monta dos veces.
export const TablesSketch = () => {
    const filterId = `tables-sketch-${useId().replace(/:/g, '')}`

    return (
        <svg
            viewBox='0 0 250 200'
            className='bento_tables_svg'
            fill='none'
            stroke='#1c3249'
            strokeWidth='1.4'
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden='true'
        >
            <defs>
                <filter id={filterId}>
                    <feTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='2' seed='3' />
                    <feDisplacementMap in='SourceGraphic' scale='1.6' />
                </filter>
            </defs>
            <g filter={`url(#${filterId})`}>
                {/* sillas de atrás */}
                <path d='M9 113v-11a5 5 0 0 1 10 0v10' />
                <path d='M35 107v-11a5 5 0 0 1 10 0v10' />
                <path d='M59 104v-11a5 5 0 0 1 10 0v10' />
                <path d='M83 101v-11a5 5 0 0 1 10 0v10' />
                <path d='M130 76v-9a4 4 0 0 1 8 0v8' />
                <path d='M146 56v-8a3.5 3.5 0 0 1 7 0v7' />
                <path d='M174 36v-7a3 3 0 0 1 6 0v6' />
                <path d='M197 29v-6a2.5 2.5 0 0 1 5 0v5' />
                <path d='M219 22v-5a2 2 0 0 1 4 0v4' />
                {/* cubierta */}
                <path d='M-10 120 C 40 100, 80 104, 110 96 C 140 88, 140 50, 170 38 C 195 28, 220 24, 262 12 L 262 30 C 230 40, 210 48, 188 60 C 162 76, 160 126, 130 138 C 100 150, 50 160, -10 176 Z' fill='#fff' fillOpacity='.6' />
                <path d='M-10 182 C 50 166, 100 156, 130 144 C 160 132, 162 82, 188 66 C 210 54, 230 46, 262 36' />
                {/* patas */}
                <path d='M44 177v26M47 176v26M150 118v30M153 112v30M214 50v16M216 49v16' />
                {/* platos */}
                <ellipse cx='20' cy='126' rx='8' ry='3.6' /><ellipse cx='20' cy='126' rx='4' ry='1.6' />
                <ellipse cx='48' cy='118' rx='8' ry='3.6' />
                <ellipse cx='76' cy='113' rx='7.5' ry='3.4' /><ellipse cx='76' cy='113' rx='3.6' ry='1.5' />
                <ellipse cx='102' cy='107' rx='7' ry='3.2' />
                <ellipse cx='28' cy='158' rx='9' ry='4' /><ellipse cx='28' cy='158' rx='4.4' ry='1.8' />
                <ellipse cx='66' cy='149' rx='8.5' ry='3.8' />
                <ellipse cx='102' cy='138' rx='8' ry='3.6' /><ellipse cx='102' cy='138' rx='3.8' ry='1.6' />
                <ellipse cx='138' cy='96' rx='5.5' ry='2.6' />
                <ellipse cx='148' cy='78' rx='5' ry='2.3' />
                <ellipse cx='162' cy='60' rx='4' ry='2' />
                <ellipse cx='182' cy='50' rx='3.4' ry='1.6' />
                <ellipse cx='204' cy='38' rx='2.8' ry='1.3' />
                <ellipse cx='226' cy='30' rx='2.2' ry='1' />
                <ellipse cx='244' cy='24' rx='1.6' ry='0.8' />
                {/* copas */}
                <path d='M34 128c0 3 4 3 4 0l-.5-4h-3z M36 131v4 M34 135h4' />
                <path d='M88 118c0 3 4 3 4 0l-.5-4h-3z M90 121v4 M88 125h4' />
                <path d='M44 142c0 3 4 3 4 0l-.5-4h-3z M46 145v4 M44 149h4' />
                <path d='M118 128c0 2.6 3.4 2.6 3.4 0l-.4-3.4h-2.6z M119.7 130.6v3.4 M118 134h3.4' />
                <path d='M152 88c0 2 2.6 2 2.6 0l-.3-2.8h-2z M153.3 90v2.6' />
                {/* velas */}
                <path d='M58 136v-10 M58 123c-1.4-1.6 0-3.4 0-3.4s1.4 1.8 0 3.4z M55.5 136h5' />
                <path d='M126 112v-9 M126 100c-1.3-1.5 0-3.2 0-3.2s1.3 1.7 0 3.2z M123.8 112h4.4' />
                <path d='M170 64v-7 M170 54.6c-1-1.2 0-2.6 0-2.6s1 1.4 0 2.6z' />
                {/* botella y florero */}
                <path d='M80 133v-7h4v7z M81 126v-3h2v3' />
                <path d='M140 82c-3 0-3.5-5 0-6.5h3c3.5 1.5 3 6.5 0 6.5z M139.5 75.5c-1-2 1-4 2-2.5 1-1.5 3 .5 2 2.5' />
                {/* sillas del frente */}
                <path d='M18 186v-14a7 7 0 0 1 14 0v14' fill='#d9cae3' />
                <path d='M76 174v-15a7 7 0 0 1 14 0v15' fill='#d9cae3' />
                <path d='M124 160v-14a6.5 6.5 0 0 1 13 0v14' fill='#d9cae3' />
                <path d='M170 98v-12a5 5 0 0 1 10 0v12' fill='#d9cae3' />
            </g>
        </svg>
    )
}
