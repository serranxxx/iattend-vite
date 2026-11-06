import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import './popsTema.css'

/**
 * Estilo de la sección Pops (handoff "Cambia tu estilo"): 'pop' (negro +
 * rosa, el de siempre), 'business' (azul eléctrico + lima) o 'craft' (hecho a
 * mano: tapete de corte, corcho, papel y cinta). Se recuerda por
 * navegador en `localStorage` `pops_theme`.
 *
 * cambiar(tema, origenEl, { movil }): el tema nuevo se revela con un círculo
 * que crece desde el centro del switch (`origenEl`) hasta cubrir la pantalla,
 * con un anillo del color del tema destino. Se hace con View Transitions: la
 * pantalla vieja queda abajo como foto y la nueva (en vivo) se recorta con
 * clip-path; el anillo es su propio grupo (`pops-anillo`) encima. Sin View
 * Transitions o con reducir movimiento, el cambio es instantáneo. Mientras
 * corre, otro clic no hace nada.
 */

export const TEMAS_POPS = ['pop', 'business', 'craft']
// Solo administradores, y solo en el editor de Pops: 'iattend' = el editor
// original de I attend (sin data-pops-editor, ningún tema encima). En la
// sección Pops no existe: ahí se lee como 'pop'.
export const TEMA_IATTEND = 'iattend'
const CLAVE = 'pops_theme'
const EVENTO = 'pops-tema-cambio'

// Estilo guardado (también lo usa el editor de Pops: data-pops-editor).
// `temas`: los que valen en esa pantalla (el editor de un admin suma 'iattend').
export const leerTemaPops = (temas = TEMAS_POPS) => {
    try {
        const v = localStorage.getItem(CLAVE)
        return temas.includes(v) ? v : 'pop'
    } catch {
        return 'pop'
    }
}

const COLOR_ANILLO = { business: '#CDF22B', pop: '#FF5FA8', craft: '#F2D21B', iattend: '#16323D' }

export const usePopsTema = ({ temas = TEMAS_POPS } = {}) => {
    const [tema, setTema] = useState(() => leerTemaPops(temas))
    const ocupado = useRef(false)

    // Siempre el mismo estilo en todas las pantallas abiertas (sección Pops y
    // editor, en esta pestaña o en otra): al cambiarlo en una, las demás lo
    // toman (evento storage entre pestañas y EVENTO dentro de la misma).
    const clave = temas.join(',')
    useEffect(() => {
        const validos = clave.split(',')
        const sincronizar = () => {
            // La que lo cambió con su transición circular ya lo pone ella.
            if (ocupado.current) return
            setTema((actual) => {
                const v = leerTemaPops(validos)
                return v === actual ? actual : v
            })
        }
        const enStorage = (e) => { if (e.key === CLAVE) sincronizar() }
        window.addEventListener('storage', enStorage)
        window.addEventListener(EVENTO, sincronizar)
        // Por si cambió mientras esta pantalla no estaba montada.
        sincronizar()
        return () => {
            window.removeEventListener('storage', enStorage)
            window.removeEventListener(EVENTO, sincronizar)
        }
    }, [clave])

    const cambiar = (nuevo, origenEl, { movil = false } = {}) => {
        if (nuevo === tema || ocupado.current || !temas.includes(nuevo)) return
        try { localStorage.setItem(CLAVE, nuevo) } catch { /* sin almacenamiento */ }
        // Avisa a otras instancias de esta misma pestaña (no reciben `storage`).
        queueMicrotask(() => window.dispatchEvent(new Event(EVENTO)))

        const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reducir || typeof document.startViewTransition !== 'function' || !origenEl) {
            setTema(nuevo)
            return
        }

        const b = origenEl.getBoundingClientRect()
        const W = window.innerWidth
        const H = window.innerHeight
        const x = b.left + b.width / 2
        const y = b.top + b.height / 2
        const R = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 20
        const duracion = movil ? 800 : 900
        const tam = movil ? 260 : 420

        const anillo = document.createElement('span')
        anillo.className = 'pops-anillo'
        Object.assign(anillo.style, {
            left: `${x - tam / 2}px`,
            top: `${y - tam / 2}px`,
            width: `${tam}px`,
            height: `${tam}px`,
            borderWidth: `${movil ? 4 : 5}px`,
            borderColor: COLOR_ANILLO[nuevo],
        })

        ocupado.current = true
        const raiz = document.documentElement
        raiz.setAttribute('data-pops-tema-cambio', '')
        const transicion = document.startViewTransition(() => {
            flushSync(() => setTema(nuevo))
            document.body.appendChild(anillo)
        })
        transicion.ready.then(() => {
            // En porcentajes de la pantalla, no en px: en algunos Chrome
            // (pantallas retina, el navegador de la app) la imagen de
            // ::view-transition-new(root) no mide en px CSS y el círculo salía
            // de la mitad de la distancia (cerca del centro) en lugar del switch.
            // El % del radio es sobre √(W² + H²) / √2.
            const px = (x / W) * 100
            const py = (y / H) * 100
            const pr = (R / (Math.hypot(W, H) / Math.SQRT2)) * 100
            raiz.animate(
                { clipPath: [`circle(0% at ${px}% ${py}%)`, `circle(${pr}% at ${px}% ${py}%)`] },
                { duration: duracion, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
            )
            raiz.animate(
                { transform: ['scale(0.1)', 'scale(1)'], opacity: [0.8, 0] },
                { duration: duracion, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards', pseudoElement: '::view-transition-new(pops-anillo)' },
            )
        }).catch(() => { /* la transición se saltó: el tema ya cambió */ })
        transicion.finished.finally(() => {
            anillo.remove()
            raiz.removeAttribute('data-pops-tema-cambio')
            ocupado.current = false
        })
    }

    return { tema, cambiar }
}
