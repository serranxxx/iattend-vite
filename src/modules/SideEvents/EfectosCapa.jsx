import { useMemo } from 'react'
import styles from './EfectosCapa.module.css'
import { cantidadDeEfecto, COLOR_INICIAL, TIPOS_EFECTO } from './efectosData'

/*
  Efectos animados de un Flash (panel Efectos): partículas encima de la
  portada y los PNG, debajo del texto y los botones. Solo CSS (transform y
  opacity): ligero en el teléfono, y nada se mueve con "reducir movimiento".
  `body.effect`: { type: 'sparkles'|'confetti'|'bubbles'|'snow'|'petals',
  intensity: 1–100, color: 'theme'|'white'|'gold'|'multi' }.
  Contraparte en iattend-events (components/SideEvent/Efectos.tsx): mismas
  partículas con la misma semilla, para que se vean igual.
*/

const MULTI = ['#FF6FA5', '#FFC94D', '#5BD1C7', '#8C7CFF', '#FF8A5C', '#FFFFFF']
const DORADOS = ['#F7D774', '#E9B949', '#FFF1B8']

// Pseudoaleatorio con semilla (mulberry32): las partículas no cambian de
// lugar en cada render ni entre el editor y la página del invitado.
const azar = (semilla) => () => {
    semilla = (semilla + 0x6D2B79F5) | 0
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const colorDe = (modo, tema, r) => {
    if (modo === 'white') return '#FFFFFF'
    if (modo === 'gold') return DORADOS[Math.floor(r() * DORADOS.length)]
    if (modo === 'multi') return MULTI[Math.floor(r() * MULTI.length)]
    return tema || '#FFFFFF'
}

// Cuántas, de qué tamaño (px) y cuánto dura cada vuelta (s), por efecto.
const PARAMS = {
    sparkles: { tam: [10, 22], dur: [1.6, 3.6] },
    confetti: { tam: [6, 11], dur: [5, 9] },
    bubbles: { tam: [10, 26], dur: [7, 13] },
    snow: { tam: [3, 8], dur: [8, 15] },
    petals: { tam: [10, 18], dur: [8, 14] },
}


export const EfectosCapa = ({ effect, colorTema }) => {
    const tipo = effect?.type
    const intensidad = effect?.intensity ?? 50
    const modo = effect?.color ?? COLOR_INICIAL[tipo] ?? 'theme'

    const particulas = useMemo(() => {
        if (!PARAMS[tipo]) return []
        const r = azar(TIPOS_EFECTO.indexOf(tipo) * 7919 + 13)
        const { tam, dur } = PARAMS[tipo]
        return Array.from({ length: cantidadDeEfecto(intensidad) }, () => {
            const d = dur[0] + r() * (dur[1] - dur[0])
            return {
                x: r() * 100,
                y: r() * 100,
                tam: tam[0] + r() * (tam[1] - tam[0]),
                dur: d,
                // Retraso negativo: arrancan ya repartidas, no todas desde arriba.
                delay: -r() * d,
                vaiven: (r() - 0.5) * 60,
                giro: (r() - 0.5) * 720,
                color: colorDe(modo, colorTema, r),
            }
        })
    }, [tipo, intensidad, modo, colorTema])

    if (!particulas.length) return null

    return (
        <div aria-hidden className={`${styles.capa} ${styles[tipo]}`}>
            {particulas.map((p, i) => (
                <span
                    key={i}
                    className={styles.particula}
                    style={{
                        left: `${p.x}%`,
                        top: tipo === 'sparkles' ? `${p.y}%` : undefined,
                        width: p.tam,
                        height: tipo === 'confetti' ? p.tam * 0.45 : tipo === 'petals' ? p.tam * 0.7 : p.tam,
                        '--color': p.color,
                        '--dur': `${p.dur}s`,
                        '--delay': `${p.delay}s`,
                        '--vaiven': `${p.vaiven}px`,
                        '--giro': `${p.giro}deg`,
                    }}
                />
            ))}
        </div>
    )
}
