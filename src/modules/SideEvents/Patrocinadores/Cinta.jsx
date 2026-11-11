import { useEffect, useRef } from 'react'
import { repeticionesCinta } from '../patrocinadores'
import { Logo } from './Logo'
import styles from './Patrocinadores.module.css'

/*
  Cinta de logos que corre sola (handoff "Patrocinadores" §3.1), réplica de
  iattend-events components/SideEvent/Patrocinadores/Cinta.tsx. Movimiento en
  requestAnimationFrame (no CSS animation) para sumar el scroll y el arrastre:
  t += dt · sp · speed → raw = t + scrollTop · k + arrastre → translateX(−raw mod mitad).
  Portada: sin puntos, sin arrastre, no sigue el scroll. Banda: puntos entre
  logos, avanza con el scroll (k) y se arrastra. Con reducir movimiento se
  queda quieta (el arrastre sí funciona).
*/
// `logos`: ya medidos, cada uno con su tamaño y su color (logosDe).
export const Cinta = ({ logos, gap, sp, k = 0, speed = 1, puntos = false, arrastrable = false, scroller }) => {
    const pistaRef = useRef(null)
    const estado = useRef({ t: 0, off: 0, drag: false, x: 0 })
    const medidos = logos
    const veces = repeticionesCinta(medidos, gap, puntos)
    const pista = Array.from({ length: veces }, () => medidos).flat()
    // Lo que cambia (velocidad, scroll) se lee de una ref: el ciclo no se reinicia.
    const conf = useRef({ sp, speed, k, scroller })
    useEffect(() => { conf.current = { sp, speed, k, scroller } })

    useEffect(() => {
        const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        let raf = 0
        let antes = 0
        const paso = (ahora) => {
            const dt = antes ? Math.min(ahora - antes, 64) : 16
            antes = ahora
            const el = pistaRef.current
            const e = estado.current
            const mitad = el ? el.scrollWidth / 2 : 0
            const { sp: base, speed: vel, k: ks, scroller: sc } = conf.current
            if (el && mitad) {
                if (!e.drag && !reducir) e.t += dt * base * vel
                const st = ks ? (sc?.()?.scrollTop ?? 0) : 0
                const raw = e.t + st * ks + e.off
                const d = ((raw % mitad) + mitad) % mitad
                el.style.transform = `translateX(${-d}px)`
            }
            raf = requestAnimationFrame(paso)
        }
        raf = requestAnimationFrame(paso)
        return () => cancelAnimationFrame(raf)
    }, [])

    const arrastre = arrastrable ? {
        onPointerDown: (ev) => {
            const e = estado.current
            e.drag = true
            e.x = ev.clientX
            ev.currentTarget.setPointerCapture?.(ev.pointerId)
        },
        onPointerMove: (ev) => {
            const e = estado.current
            if (!e.drag) return
            e.off -= ev.clientX - e.x
            e.x = ev.clientX
        },
        onPointerUp: () => { estado.current.drag = false },
        onPointerCancel: () => { estado.current.drag = false },
    } : {}

    return (
        <div className={styles.cinta} data-arrastrable={arrastrable || undefined} {...arrastre}>
            <div ref={pistaRef} className={styles.pista}>
                {pista.map((it, i) => (
                    <span key={`${it.id ?? it.url}-${i}`} className={styles.pasoCinta} style={{ gap, paddingRight: gap }}>
                        <Logo it={it} />
                        {puntos && <span className={styles.punto} aria-hidden />}
                    </span>
                ))}
            </div>
        </div>
    )
}
