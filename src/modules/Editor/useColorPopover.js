import { useEffect, useRef, useState } from 'react'

/*
  Selector de color de las barras de todos los editores (handoff "Panel
  lateral" 5.1). Las barras llaman `pickColor(campo)` sin evento; el popover
  se ancla al último botón presionado (se guarda en pointerdown). Tocar otra
  vez el mismo botón lo cierra. El editor decide a qué se le pone color según
  `colorField` y se lo pasa a <ColorPopover target={…} />.
*/
export const useColorPopover = () => {
    const [colorField, setColorField] = useState(null)
    const [colorPop, setColorPop] = useState(null)
    const lastPress = useRef(null)
    useEffect(() => {
        const onDown = (e) => {
            const btn = e.target.closest?.('button')
            if (btn) lastPress.current = btn.getBoundingClientRect()
        }
        window.addEventListener('pointerdown', onDown, true)
        return () => window.removeEventListener('pointerdown', onDown, true)
    }, [])
    // El clic de afuera ya lo cerró en el pointerdown: no se vuelve a abrir.
    const colorClosed = useRef(null)
    const closeColor = () => { colorClosed.current = { field: colorField, t: Date.now() }; setColorPop(null) }
    const pickColor = (field) => {
        const r = lastPress.current
        const c = colorClosed.current
        if (c && c.field === field && Date.now() - c.t < 400) return
        if (colorPop && colorField === field) { closeColor(); return }
        setColorField(field)
        setColorPop(r ? { x: r.left, y: r.top, w: r.width, h: r.height } : { x: window.innerWidth / 2, y: 80, w: 0, h: 0 })
    }
    // ¿Está abierto el de este campo? (para encender su botón)
    const isOpen = (field) => Boolean(colorPop) && colorField === field
    return { colorField, colorPop, pickColor, closeColor, isOpen }
}
