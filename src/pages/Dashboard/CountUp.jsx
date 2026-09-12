import { useEffect, useRef, useState } from 'react'

/* Los números de las tarjetas del tablero salen de queries que resuelven
   después del primer render: sin esto pasaban de 0 a su valor de golpe, en
   un frame. Aquí cuentan hasta él. */

const DURATION = 900

// Sale rápido y frena al final, para que el número aterrice en su valor en
// vez de detenerse en seco.
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

/**
 * Cuenta desde lo que haya en pantalla hasta `value`. Si el valor cambia a
 * media cuenta —realtime, por ejemplo— arranca desde donde iba, no desde 0.
 *
 * @param {number} value    destino
 * @param {number} duration ms de la cuenta
 */
export const CountUp = ({ value, duration = DURATION, className }) => {
    const [shown, setShown] = useState(0)
    // Espejo de `shown` para leerlo dentro del rAF sin volver a suscribirse.
    const shownRef = useRef(0)
    const frameRef = useRef(0)

    useEffect(() => {
        const target = Number(value) || 0
        const from = shownRef.current
        if (from === target) return

        const land = () => {
            shownRef.current = target
            setShown(target)
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            land()
            return
        }

        const start = performance.now()

        const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1)
            if (progress === 1) return land()

            const next = Math.round(from + (target - from) * easeOut(progress))
            shownRef.current = next
            setShown(next)
            frameRef.current = requestAnimationFrame(tick)
        }

        frameRef.current = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frameRef.current)
    }, [value, duration])

    return <div className={className}>{shown}</div>
}
