import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ColoresIOS } from './ColoresIOS'
import s from './ColorPopover.module.css'

/*
  Selector de color de las barras (ver useColorPopover.js), siempre el
  selector estilo iOS (ColoresIOS):
  · El de las barras (texto, elementos, sombras…) se abre en el panel lateral
    del editor: `usePanelColor` arma lo que se le pasa a EditorShell
    (`panelColor`); así no tapa la pieza ni se repite un panel encima de otro.
  · El del pincel (`target.ios`) va en una tarjeta flotante junto a la paleta
    de dibujo (en pantalla completa no hay panel), que se puede arrastrar
    desde cualquier parte que no sea un control.
  `target`: { value, allowNone, onPick(color, { snapshot }) } o null; con
  `opacity` / `onOpacity` / `opacidadMin` enseña la opacidad (el pincel).
  `palette`: atajos "De tu paleta"; `allowNone` suma "sin color".
  Dónde abre: junto a `target.anclarA` (selector) del lado `placement`; sin
  ancla, a la derecha del panel izquierdo del editor ([data-editor-left]), así
  queda fuera de la pieza. Si se arrastró, vuelve a abrir donde se dejó (en
  esta sesión de la página).
*/

const MARGEN = 12
const SIN_ARRASTRE = 'button, input, textarea, select, [role="slider"], [role="radio"], [role="tab"], a'
let ultimaPosicion = null

const acotar = (x, y, w, h) => ({
    x: Math.min(Math.max(MARGEN, x), Math.max(MARGEN, window.innerWidth - w - MARGEN)),
    y: Math.min(Math.max(MARGEN, y), Math.max(MARGEN, window.innerHeight - h - MARGEN)),
})

const posicionInicial = (colorPop, target, w, h) => {
    if (ultimaPosicion) return acotar(ultimaPosicion.x, ultimaPosicion.y, w, h)
    const ancla = document.querySelector(target.anclarA ?? '[data-editor-left]')?.getBoundingClientRect()
    if (ancla && ancla.width > 0) {
        const lado = target.placement ?? 'right'
        if (lado === 'left') return acotar(ancla.left - w - MARGEN, ancla.top, w, h)
        if (lado === 'right') return acotar(ancla.right + MARGEN, ancla.top, w, h)
    }
    return acotar(colorPop.x, colorPop.y + colorPop.h + MARGEN, w, h)
}

export const ColorPopover = ({ colorPop, closeColor, target }) => {
    const abierto = Boolean(colorPop && target?.ios)
    const ref = useRef(null)
    const [pos, setPos] = useState(null)
    const arrastre = useRef(null)
    const [arrastrando, setArrastrando] = useState(false)
    const cerrar = useRef(closeColor)
    useEffect(() => { cerrar.current = closeColor })

    // Abre una vez medida la tarjeta; se reposiciona al abrir con otro botón.
    useLayoutEffect(() => {
        if (!abierto) { setPos(null); return }
        const r = ref.current?.getBoundingClientRect()
        setPos(posicionInicial(colorPop, target, r?.width ?? 376, r?.height ?? 480))
    }, [abierto, colorPop])

    // Clic fuera (que no sea otro popup de antd) o Esc la cierran.
    useEffect(() => {
        if (!abierto) return undefined
        const fuera = (e) => {
            if (ref.current?.contains(e.target)) return
            if (e.target.closest?.('.ant-popover, .ant-dropdown, .ant-select-dropdown')) return
            cerrar.current()
        }
        const esc = (e) => { if (e.key === 'Escape') cerrar.current() }
        window.addEventListener('pointerdown', fuera)
        window.addEventListener('keydown', esc)
        return () => { window.removeEventListener('pointerdown', fuera); window.removeEventListener('keydown', esc) }
    }, [abierto])

    if (!abierto) return null

    const empezar = (e) => {
        if (e.button > 0 || e.target.closest(SIN_ARRASTRE)) return
        const r = ref.current.getBoundingClientRect()
        arrastre.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height }
        e.currentTarget.setPointerCapture(e.pointerId)
        e.preventDefault()
        setArrastrando(true)
    }
    const mover = (e) => {
        const a = arrastre.current
        if (!a) return
        const nueva = acotar(e.clientX - a.dx, e.clientY - a.dy, a.w, a.h)
        ultimaPosicion = nueva
        setPos(nueva)
    }
    const soltar = () => { arrastre.current = null; setArrastrando(false) }

    return createPortal(
        <div
            ref={ref}
            className={s.tarjeta}
            style={pos ? { left: pos.x, top: pos.y } : { left: -9999, top: 0, visibility: 'hidden' }}
            data-arrastrando={arrastrando || undefined}
            onPointerDown={empezar}
            onPointerMove={mover}
            onPointerUp={soltar}
            onPointerCancel={soltar}
            data-color-popover
            data-edit-keep
        >
            <span className={s.asa} aria-hidden />
            <ColoresIOS
                value={target.value}
                onChange={(c, o) => target.onPick(c, o)}
                opacity={target.opacity}
                onOpacity={target.onOpacity}
                opacidadMin={target.opacidadMin ?? 0}
            />
        </div>,
        document.body,
    )
}
