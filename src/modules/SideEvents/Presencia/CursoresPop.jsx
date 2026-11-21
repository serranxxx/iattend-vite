import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { medirPieza, piezaDelEditor } from './usePresenciaPop'
import s from './Presencia.module.css'

// Cursores de los demás sobre la pieza (escritorio). Una capa fija encima de
// todo (sin puntero) que cada cuadro convierte las coordenadas de la pieza
// (px sin escalar, `y` del contenido) a la pantalla de este editor: sigue el
// zoom, el arrastre del tablero, el scroll de la pieza y Dibujar a pantalla
// completa sin que nadie mande nada. El movimiento se suaviza (interpolación
// exponencial hacia el último punto recibido cada ~50 ms).
// Si lo que señala el otro no se ve aquí (scroll distinto), el cursor se
// queda en la orilla de la pieza, más tenue. Fuera de la pieza no se ve.
// Lo que tiene elegido cada quien lleva un recuadro de su color. Sin
// nombres: cada quien es su emoji (en la etiqueta del cursor y del recuadro).

const SUAVE = 0.3 // fracción del camino por cuadro a 60 fps
const ZONAS_SIN_RECUADRO = new Set(['background'])

export const CursoresPop = ({ otros, cursores }) => {
    const capaRef = useRef(null)
    const otrosRef = useRef(otros)
    useLayoutEffect(() => { otrosRef.current = otros })

    useEffect(() => {
        let raf = 0
        let antes = performance.now()
        const cajas = new Map() // clave → [div]

        const recuadros = (clave, color, emoji, rects, capa) => {
            let lista = cajas.get(clave) ?? []
            while (lista.length < rects.length) {
                const d = document.createElement('div')
                d.className = s.seleccion
                capa.appendChild(d)
                lista.push(d)
            }
            while (lista.length > rects.length) lista.pop().remove()
            cajas.set(clave, lista)
            rects.forEach((r, i) => {
                const d = lista[i]
                d.style.cssText = `--color:${color};transform:translate3d(${r.left}px,${r.top}px,0);width:${r.width}px;height:${r.height}px`
                d.dataset.emoji = i === 0 ? emoji : ''
            })
        }

        const cuadro = (ahora) => {
            raf = requestAnimationFrame(cuadro)
            const dt = Math.min(64, ahora - antes)
            antes = ahora
            const k = 1 - Math.pow(1 - SUAVE, dt / 16.7)
            const capa = capaRef.current
            if (!capa) return
            const el = piezaDelEditor()
            const m = el ? medirPieza(el) : null
            const area = document.querySelector('[data-editor-area]')?.getBoundingClientRect()
            const dentro = (x, y) => !area || (x >= area.left && x <= area.right && y >= area.top && y <= area.bottom)
            const vivos = new Set()

            for (const o of otrosRef.current) {
                vivos.add(o.clave)
                // ── Cursor ──
                const nodo = capa.querySelector(`[data-cursor="${o.clave}"]`)
                const c = cursores.current.get(o.clave)
                if (nodo) {
                    if (!c || !m || !c.tv) {
                        nodo.dataset.visible = ''
                    } else {
                        if (c.x === undefined || !nodo.dataset.visible) { c.x = c.tx; c.y = c.ty }
                        c.x += (c.tx - c.x) * k
                        c.y += (c.ty - c.y) * k
                        const yv = c.y - m.scroll
                        const orilla = yv < 0 || yv > m.alto
                        const sx = m.r.left + c.x * m.escala
                        const sy = m.r.top + Math.min(m.alto, Math.max(0, yv)) * m.escala
                        if (dentro(sx, sy)) {
                            nodo.dataset.visible = '1'
                            nodo.dataset.orilla = orilla ? (yv < 0 ? 'arriba' : 'abajo') : ''
                            nodo.style.transform = `translate3d(${sx}px, ${sy}px, 0)`
                        } else {
                            nodo.dataset.visible = ''
                        }
                    }
                }

                // ── Lo que tiene elegido ──
                const rects = []
                if (el && o.sel) {
                    const piezaR = m.r
                    const elementos = [
                        ...(o.sel.stickers ?? []).map((id) => el.querySelector(`[data-elemento="${CSS.escape(String(id))}"]`)),
                        ...(o.sel.zona && !ZONAS_SIN_RECUADRO.has(o.sel.zona) && !(o.sel.stickers ?? []).length
                            ? [el.querySelector(`[data-zone="${CSS.escape(String(o.sel.zona))}"]`)]
                            : []),
                    ].filter(Boolean)
                    for (const e of elementos) {
                        const r = e.getBoundingClientRect()
                        // Recortado a la pieza (y al área del editor).
                        const left = Math.max(r.left, piezaR.left, area?.left ?? -Infinity)
                        const top = Math.max(r.top, piezaR.top, area?.top ?? -Infinity)
                        const right = Math.min(r.right, piezaR.right, area?.right ?? Infinity)
                        const bottom = Math.min(r.bottom, piezaR.bottom, area?.bottom ?? Infinity)
                        if (right - left > 2 && bottom - top > 2) rects.push({ left: left - 2, top: top - 2, width: right - left + 4, height: bottom - top + 4 })
                    }
                }
                recuadros(o.clave, o.color, o.emoji ?? '🙂', rects, capa)
            }
            for (const [clave, lista] of cajas) {
                if (!vivos.has(clave)) { lista.forEach((d) => d.remove()); cajas.delete(clave) }
            }
        }
        raf = requestAnimationFrame(cuadro)
        return () => {
            cancelAnimationFrame(raf)
            for (const lista of cajas.values()) lista.forEach((d) => d.remove())
        }
    }, [cursores])

    return createPortal(
        <div ref={capaRef} className={s.capa} aria-hidden>
            {otros.map((o) => (
                <div key={o.clave} className={s.cursor} data-cursor={o.clave} style={{ '--color': o.color }}>
                    <svg width="18" height="20" viewBox="0 0 18 20" className={s.flecha}>
                        <path d="M1.5 1.5 L16 9.2 L9.4 10.9 L6.4 17.6 Z" fill="var(--color)" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
                    </svg>
                    <span className={s.etiqueta}>{o.emoji ?? '🙂'}</span>
                </div>
            ))}
        </div>,
        document.body,
    )
}
