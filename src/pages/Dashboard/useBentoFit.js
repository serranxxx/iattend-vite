import { useLayoutEffect, useState } from 'react'

// El bento se diseña a 1160px de ancho y se escala para caber en el viewport.
// Antes era un `zoom: 0.8` fijo, con dos problemas en iPad: no cabía de alto
// (.dashboard_body es 100vh con overflow hidden y lo recortaba) y Safari, con
// `zoom`, escala las cajas pero no la tipografía, así que los títulos se
// desbordaban. Por eso se usa transform: scale() dentro de un contenedor
// (.bento_fit) que ocupa el tamaño ya escalado.
const MAX_SCALE = 0.8
// Más chico que esto ya no se lee; ahí se deja scroll vertical.
const MIN_SCALE = 0.6
// Cuando la escala la decide el viewport (tablet), deja aire alrededor en
// vez de llenarlo de borde a borde. En desktop manda MAX_SCALE.
const FIT_MARGIN = 0.92
// Igual al `width` de .bento_grid / .bento_free y .bento_grid--portrait en
// dashboard.css.
const DESIGN_WIDTH = 1160
const PORTRAIT_WIDTH = 1000

// `portrait`: si el viewport es más alto que ancho (iPad en vertical) el bento
// cambia a una rejilla de 3 columnas más alta; la apaisada quedaba diminuta
// con mucho hueco arriba y abajo. Solo la rejilla completa tiene esa versión.
export function useBentoFit(bodyRef, gridRef, active, allowPortrait) {
    const [fit, setFit] = useState({ scale: MAX_SCALE, height: null, scroll: false, portrait: false, width: DESIGN_WIDTH })

    useLayoutEffect(() => {
        const body = bodyRef.current
        const grid = gridRef.current
        if (!active || !body || !grid) return

        const measure = () => {
            const cs = getComputedStyle(body)
            const availW = body.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
            const availH = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
            const portrait = allowPortrait && availH > availW
            const width = portrait ? PORTRAIT_WIDTH : DESIGN_WIDTH
            // offsetHeight ignora el transform: es el alto de diseño. Si la
            // orientación acaba de cambiar todavía es el de la otra rejilla;
            // el ResizeObserver vuelve a medir en cuanto se re-renderiza.
            const naturalH = grid.offsetHeight
            if (!naturalH) return

            const fits = Math.min(availW / width, availH / naturalH)
            const target = Math.min(MAX_SCALE, FIT_MARGIN * fits)
            const scale = Math.max(MIN_SCALE, Math.floor(target * 1000) / 1000)
            // El margen es estético: solo hay scroll si ni sin él cabe.
            const scroll = fits < MIN_SCALE
            setFit(prev => (prev.scale === scale && prev.height === naturalH
                && prev.scroll === scroll && prev.portrait === portrait)
                ? prev
                : { scale, height: naturalH, scroll, portrait, width })
        }

        measure()
        // El grid cambia de alto cuando llegan datos (invitados, side events…).
        const ro = new ResizeObserver(measure)
        ro.observe(body)
        ro.observe(grid)
        return () => ro.disconnect()
    }, [active, allowPortrait, bodyRef, gridRef])

    return fit
}
