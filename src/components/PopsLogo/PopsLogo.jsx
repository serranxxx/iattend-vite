import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './PopsLogo.module.css'

/**
 * Wordmark "Pops" (handoff "Pops Logo"): Poppins Black y, al pasar el mouse,
 * las letras mutan una por una entre emojis de evento y letras de otras
 * tipografías / colores, y regresan a "Pops". Corre una vez por hover; si ya
 * está corriendo ignora los demás. Sin animación con reducir movimiento.
 *
 * Props: size (px de la fuente, 36), step (segundos por paso, 0.1),
 * className, color (por defecto la tinta de Pops), autoplay (segundos entre
 * corridas solas; 0 = nunca) y `activo` para dispararlo desde fuera (p. ej. el
 * hover de todo el botón que lo contiene): cada vez que cambia a true corre.
 * alMontar: segundos tras montarse para correr una vez sola.
 */

const LETRAS = ['P', 'o', 'p', 's']

const ESTILOS = {
    A: { cls: styles.estiloA },
    B: { cls: styles.estiloB },
    C: { cls: styles.estiloC, upper: true },
    D: { cls: styles.estiloD },
}

// L = la letra original. Solo se anima la letra que cambia respecto a la fila anterior.
const PASOS = [
    ['L', 'L', 'L', 'L'], ['L', 'L', '💌', 'L'], ['L', '🎉', '💌', 'L'], ['L', '🎉', '💌', '🎟️'],
    ['🥂', '🎉', '💌', '🎟️'], ['A', '💌', '🥂', '🎟️'], ['A', '💌', 'B', 'C'], ['🎉', 'D', '🥂', 'C'],
    ['🪩', '🎈', '✨', '🎟️'], ['🪩', 'L', '✨', '🎟️'], ['L', 'L', '✨', '🎟️'], ['L', 'L', 'L', '🎟️'], ['L', 'L', 'L', 'L'],
]

const tok = (i, t) => {
    if (t === 'L') return { ch: LETRAS[i] }
    const e = ESTILOS[t]
    if (e) return { ch: e.upper ? LETRAS[i].toUpperCase() : LETRAS[i], cls: e.cls }
    return { ch: t, emoji: true, rot: i % 2 ? 8 : -8 }
}

const clamp01 = (x) => Math.max(0, Math.min(1, x))
const easeInOutSine = (k) => -(Math.cos(Math.PI * k) - 1) / 2

export function PopsLogo({ size = 36, step = 0.1, className, activo, color, autoplay = 0, alMontar = null }) {
    const [t, setT] = useState(null)
    const raf = useRef(0)
    const corriendo = useRef(false)
    const total = (PASOS.length - 1) * step + 0.15

    useEffect(() => () => cancelAnimationFrame(raf.current), [])

    const correr = useCallback(() => {
        if (corriendo.current) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        corriendo.current = true
        const t0 = performance.now()
        const loop = (now) => {
            const s = (now - t0) / 1000
            if (s >= total) {
                corriendo.current = false
                setT(null)
                return
            }
            setT(s)
            raf.current = requestAnimationFrame(loop)
        }
        raf.current = requestAnimationFrame(loop)
    }, [total])

    useEffect(() => { if (activo) correr() }, [activo])

    // alMontar: segundos después de montarse corre una vez (p. ej. al entrar a la sección).
    useEffect(() => {
        if (alMontar === null) return undefined
        const id = setTimeout(correr, alMontar * 1000)
        return () => clearTimeout(id)
    }, [])

    useEffect(() => {
        if (!autoplay) return undefined
        const id = setInterval(correr, autoplay * 1000)
        return () => clearInterval(id)
    }, [autoplay, correr])

    const capa = (g, k, sale, key) => {
        const blur = (sale ? k : 1 - k) * size * 0.02
        const y = sale ? -22 * k : 22 * (1 - k)
        const sc = sale ? 1 - 0.12 * k : 0.88 + 0.12 * k
        const rot = (g.rot ?? 0) * (sale ? 1 + k : 1 - k)
        // Valores por cuadro: dependen del tiempo, no pueden vivir en el CSS.
        const style = {
            opacity: sale ? 1 - k : k,
            filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
            transform: `translateX(-50%) translateY(${y}%) scale(${sc}) rotate(${rot}deg)`,
        }
        return (
            <span key={key} aria-hidden className={`${styles.capa} ${g.emoji ? styles.emoji : g.cls ?? ''}`} style={style}>
                {g.ch}
            </span>
        )
    }

    const cruce = step * 0.9

    return (
        <span
            className={`${styles.logo} ${className ?? ''}`}
            style={{ '--pops-size': `${size}px`, ...(color ? { '--pops-color': color } : {}) }}
            onMouseEnter={activo === undefined ? correr : undefined}
            aria-label='Pops'
            role='img'
        >
            {LETRAS.map((ch, i) => {
                let prev = null
                let cur = tok(i, 'L')
                let k = 1
                if (t !== null) {
                    const idx = Math.min(PASOS.length - 1, Math.floor(t / step))
                    let last = 0
                    for (let s = 1; s <= idx; s++) if (PASOS[s][i] !== PASOS[s - 1][i]) last = s
                    if (last) {
                        let pl = 0
                        for (let s = 1; s < last; s++) if (PASOS[s][i] !== PASOS[s - 1][i]) pl = s
                        cur = tok(i, PASOS[last][i])
                        prev = tok(i, PASOS[pl][i])
                        k = easeInOutSine(clamp01((t - last * step) / cruce))
                    }
                }
                return (
                    <span key={i} className={styles.slot}>
                        <span className={styles.medida} aria-hidden>{ch}</span>
                        {prev && k < 1 && capa(prev, k, true, 'p')}
                        {capa(cur, k, false, 'c')}
                    </span>
                )
            })}
        </span>
    )
}

export default PopsLogo
