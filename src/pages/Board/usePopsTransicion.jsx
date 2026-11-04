import { useEffect, useRef, useState } from 'react'
import styles from './PopsTransicion.module.css'

/**
 * Transición "entrar a un lugar" entre /invitations y su sección Pops
 * (handoff "Sección Pops"). Un velo negro fijo sobre toda la app, con origen
 * en el centro del botón Pops de la barra (`origenRef`):
 *   entrar: grow (círculo 0 → R + onda rosa) → cambia la sección → fade.
 *   salir:  cover (fundido a negro) → cambia la sección → shrink (R → 0) → tail (onda negra).
 * Las fases se encadenan con animationend (no setTimeout: montar la sección
 * bloquea el hilo). Con reducir movimiento cambia de golpe.
 *
 * ir(haciaPops, accion): `accion` hace el cambio de sección a mitad del camino.
 *
 * Respaldo: si el navegador pausa las animaciones (pestaña o panel oculto) y
 * animationend no llega, cada fase avanza sola un poco después de su duración,
 * para que el velo nunca se quede tapando la app.
 */

// Duración de cada fase en ms (la misma que en PopsTransicion.module.css).
const DURACION = { grow: 950, fade: 700, cover: 350, shrink: 850, tail: 900 }

// El siguiente cuadro (o 60 ms, si rAF está pausado), una sola vez.
const enUnCuadro = (fn) => {
    let hecho = false
    const una = () => { if (!hecho) { hecho = true; fn() } }
    requestAnimationFrame(una)
    setTimeout(una, 60)
}

export const usePopsTransicion = (origenRef) => {
    const [ov, setOv] = useState(null)
    const accionRef = useRef(null)

    const origen = () => {
        const W = window.innerWidth
        const H = window.innerHeight
        const b = origenRef.current?.getBoundingClientRect()
        const x = b ? b.left + b.width / 2 : 140
        const y = b ? b.top + b.height / 2 : H / 2
        const R = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 20
        return { x, y, R }
    }

    const ir = (haciaPops, accion) => {
        if (ov) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            accion()
            return
        }
        accionRef.current = accion
        setOv({ ...origen(), fase: haciaPops ? 'grow' : 'cover' })
    }

    // Fase ya atendida: animationend y el respaldo no avanzan dos veces.
    const atendida = useRef(null)

    const alTerminar = () => {
        const fase = ov?.fase
        if (!fase || atendida.current === ov) return
        atendida.current = ov
        if (fase === 'grow') {
            accionRef.current?.()
            enUnCuadro(() => setOv(o => o && { ...o, fase: 'fade' }))
        } else if (fase === 'cover') {
            accionRef.current?.()
            // Un cuadro después: el botón Pops ya está con el estilo de la sección nueva.
            enUnCuadro(() => setOv({ ...origen(), fase: 'shrink' }))
        } else if (fase === 'shrink') {
            setOv(o => o && { ...o, fase: 'tail' })
        } else {
            accionRef.current = null
            setOv(null)
        }
    }

    useEffect(() => {
        if (!ov) return undefined
        const id = setTimeout(alTerminar, DURACION[ov.fase] + 400)
        return () => clearTimeout(id)
    }, [ov])

    const overlay = ov && (
        <div
            className={styles.capa}
            style={{ '--x': `${ov.x}px`, '--y': `${ov.y}px`, '--R': `${ov.R}px` }}
            aria-hidden
        >
            {ov.fase !== 'tail' && (
                <div
                    key={ov.fase}
                    className={`${styles.velo} ${styles[ov.fase]}`}
                    onAnimationEnd={(e) => { if (e.target === e.currentTarget) alTerminar() }}
                />
            )}
            {(ov.fase === 'grow' || ov.fase === 'tail') && (
                <span
                    key={`onda-${ov.fase}`}
                    className={`${styles.onda} ${ov.fase === 'tail' ? styles.ondaSalida : ''}`}
                    onAnimationEnd={ov.fase === 'tail' ? alTerminar : undefined}
                />
            )}
        </div>
    )

    return { ir, overlay, enTransicion: !!ov }
}
