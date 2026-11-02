import { useEffect, useState } from 'react'

/*
  Zoom al escribir (editores del celular): al tocar un texto para escribir,
  la pieza se acerca hasta tocar las orillas de la pantalla (más si así el
  texto aún se ve de menos de MIN_PX) y lo centra en lo que queda visible (entre el header y la
  barra, arriba del teclado). Al soltar el texto regresa (zoom out), con la
  misma transición de la pieza.
  · Pop: el texto (contentEditable) está en el mismo documento → focusin.
  · Invitación: está en el iframe de la pieza → iattend-events manda
    REMOTE_TEXT_FOCUS ({ rect, fontSize }, el mismo aviso que usa el iPad;
    ReactHost → evento `iattend-text-focus`).
  `foco` = { cx, cy, font }: centro del texto y su tamaño de letra en px de
  la pieza (sin escalar). `transformDeZoom` arma la escala y la posición.
*/
export const MIN_PX = 16
const ZOOM_MAX = 3
// Sin el ancho de la pieza: un 30 % más cerca.
export const ZOOM_TEXTO = 1.3

export const useZoomTexto = (piezaRef) => {
    const [foco, setFoco] = useState(null)
    useEffect(() => {
        // Recuadro en pantalla → centro en px de la pieza.
        const aPieza = (r, font) => {
            const pieza = piezaRef.current
            if (!pieza || !pieza.offsetWidth) return null
            const p = pieza.getBoundingClientRect()
            const k = p.width / pieza.offsetWidth
            return { cx: (r.left + r.width / 2 - p.left) / k, cy: (r.top + r.height / 2 - p.top) / k, font }
        }
        const onIn = (e) => {
            const el = e.target
            if (!el?.isContentEditable || !piezaRef.current?.contains(el)) return
            setFoco(aPieza(el.getBoundingClientRect(), parseFloat(getComputedStyle(el).fontSize) || MIN_PX))
        }
        const onOut = (e) => {
            if (e.target?.isContentEditable && piezaRef.current?.contains(e.target)) setFoco(null)
        }
        // { rect: { x, y, w, h } en px del iframe, fontSize } o rect null.
        const onRemoto = (e) => {
            const d = e.detail?.rect
            if (!d) { setFoco(null); return }
            const iframe = piezaRef.current?.querySelector('iframe')
            if (!iframe?.offsetWidth) return
            // Solo el foco de esta pieza (no el de otro iframe).
            if (e.detail.source && e.detail.source !== iframe.contentWindow) return
            const fr = iframe.getBoundingClientRect()
            const k = fr.width / iframe.offsetWidth
            setFoco(aPieza({ left: fr.left + d.x * k, top: fr.top + d.y * k, width: d.w * k, height: d.h * k }, e.detail.fontSize || MIN_PX))
        }
        document.addEventListener('focusin', onIn)
        document.addEventListener('focusout', onOut)
        window.addEventListener('iattend-text-focus', onRemoto)
        return () => {
            document.removeEventListener('focusin', onIn)
            document.removeEventListener('focusout', onOut)
            window.removeEventListener('iattend-text-focus', onRemoto)
        }
    }, [piezaRef])
    return foco
}

// Escala y posición de la pieza con el texto que se edita: la pieza crece
// hasta tocar las orillas de la pantalla (`anchoPieza` = su ancho sin
// escalar), más si así el texto aún se ve de menos de MIN_PX, y el texto
// queda centrado en lo que queda visible (`arriba` / `abajo`: entre el
// header —o lo que iOS dejó a la vista al subir la página— y la barra
// encima del teclado). De lado nunca deja huecos. null si no se edita nada.
export const transformDeZoom = (foco, escala, ancho, arriba, abajo, anchoPieza) => {
    if (!foco) return null
    const llena = anchoPieza ? ancho / anchoPieza : escala * ZOOM_TEXTO
    const e2 = Math.max(llena, Math.min(escala * ZOOM_MAX, MIN_PX / foco.font))
    const yc = (arriba + abajo) / 2
    const ancho2 = (anchoPieza ?? 0) * e2
    const x = anchoPieza ? Math.min(0, Math.max(ancho - ancho2, ancho / 2 - foco.cx * e2)) : ancho / 2 - foco.cx * e2
    return { escala: e2, x, y: yc - foco.cy * e2 }
}

// Mientras hay zoom y un momento después de quitarlo (ZOOM_MS), la pieza usa
// la transición del zoom (más larga y suave) en lugar de la de siempre:
// `data-zoom-anim` en la pieza (EditorMovil.module.css).
export const ZOOM_MS = 450
export const useZoomAnimando = (activo) => {
    const [animando, setAnimando] = useState(false)
    useEffect(() => {
        if (activo) { setAnimando(true); return undefined }
        const id = setTimeout(() => setAnimando(false), ZOOM_MS)
        return () => clearTimeout(id)
    }, [activo])
    return animando
}
