/*
  Contador animado para las cifras grandes del panel.

  El dato de "Hoy" llega de dos peticiones al backend: la pantalla se pinta con
  ceros y un instante después los números saltan a su valor. Ese salto es lo que
  se ve mal, no la espera. Aquí se recorre la distancia en vez de saltarla.

  Dos decisiones que lo sostienen:

  · Interpola desde el valor que se está MOSTRANDO, no desde cero. Si el dato
    cambia a media animación —o el usuario cambia de mes— la cifra sigue desde
    donde iba en lugar de volver a empezar.

  · `prefers-reduced-motion` no recibe una versión lenta de lo mismo: recibe el
    número, y ya. Una cifra que cuenta sola es justo lo que esa preferencia
    pide evitar.
*/

import { useEffect, useRef, useState } from 'react'

const DURACION_MS = 900

// easeOutQuart: arranca rápido y frena al final. Un contador lineal parece un
// cronómetro; este parece que aterriza.
const suave = (t) => 1 - (1 - t) ** 4

export const prefiereMenosMovimiento = () =>
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const useContador = (objetivo, duracion = DURACION_MS) => {
    const [valor, setValor] = useState(0)
    // Lo que hay en pantalla ahora mismo, actualizado en cada cuadro: es el
    // punto de partida de la siguiente animación.
    const actual = useRef(0)

    useEffect(() => {
        const destino = Number(objetivo) || 0

        if (prefiereMenosMovimiento() || destino === actual.current) {
            actual.current = destino
            setValor(destino)
            return undefined
        }

        const desde = actual.current
        const inicio = performance.now()
        let cuadro

        const paso = (ahora) => {
            const avance = Math.min(1, (ahora - inicio) / duracion)
            const siguiente = desde + (destino - desde) * suave(avance)

            actual.current = siguiente
            setValor(siguiente)

            if (avance < 1) cuadro = requestAnimationFrame(paso)
        }

        cuadro = requestAnimationFrame(paso)
        return () => cancelAnimationFrame(cuadro)
    }, [objetivo, duracion])

    return valor
}
