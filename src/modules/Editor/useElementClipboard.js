import { useEffect, useRef } from 'react'

/*
  ⌘C / ⌘X / ⌘V de los elementos sueltos en todos los editores (invitación,
  side events y Eventos Flash). Cada editor dice qué hay elegido y cómo
  quitarlo / pegarlo:

    copy()        → { items, section } | null   (lo elegido ahora)
    cut()         → quita lo elegido (después de copiarlo)
    paste(clip)   → pega clip = { items, section } donde corresponda

  El portapapeles es de la sesión (sirve entre módulos, entre side events y
  entre editores; el modelo de los elementos es el mismo). Las teclas llegan
  del editor o de la pieza (iframe de la invitación: REMOTE_ELEMENT_KEY →
  `iattend-element-key`). No se toca nada si se está escribiendo en un campo.

  ⌘V con una IMAGEN en el portapapeles del sistema la sigue subiendo como
  sticker (lo hace cada editor con el evento `paste`); para no pegar las dos
  cosas, el pegado de elementos espera un instante y se cancela si en ese
  momento llegó una imagen.
*/

let portapapeles = null

const escribiendo = (el) => el?.isContentEditable || el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.tagName === 'SELECT'

export const useElementClipboard = ({ enabled = true, copy, cut, paste }) => {
    const fns = useRef({ copy, cut, paste })
    useEffect(() => { fns.current = { copy, cut, paste } })

    useEffect(() => {
        if (!enabled) return
        let ultimaImagen = 0
        const run = (action) => {
            if (action === 'copy' || action === 'cut') {
                const clip = fns.current.copy?.()
                if (!clip?.items?.length) return false
                portapapeles = { ...clip, items: clip.items.map((it) => ({ ...it })) }
                if (action === 'cut') fns.current.cut?.()
                return true
            }
            if (action === 'paste' && portapapeles) {
                const pedido = Date.now()
                setTimeout(() => {
                    if (ultimaImagen >= pedido - 20) return
                    fns.current.paste?.(portapapeles)
                }, 80)
                return true
            }
            return false
        }
        const onKey = (e) => {
            if (!(e.metaKey || e.ctrlKey) || e.altKey || escribiendo(e.target)) return
            const action = { c: 'copy', x: 'cut', v: 'paste' }[e.key.toLowerCase()]
            if (!action) return
            // ⌘V se deja pasar: el evento `paste` (imagen) tiene que ocurrir.
            if (run(action) && action !== 'paste') e.preventDefault()
        }
        const onPaste = (e) => {
            if ([...(e.clipboardData?.files ?? [])].some((f) => f.type.startsWith('image/'))) ultimaImagen = Date.now()
        }
        const onPieceImage = () => { ultimaImagen = Date.now() }
        const onPieceKey = (e) => run(e.detail?.action)
        window.addEventListener('keydown', onKey)
        window.addEventListener('paste', onPaste, true)
        window.addEventListener('iattend-layer-paste', onPieceImage)
        window.addEventListener('iattend-element-key', onPieceKey)
        return () => {
            window.removeEventListener('keydown', onKey)
            window.removeEventListener('paste', onPaste, true)
            window.removeEventListener('iattend-layer-paste', onPieceImage)
            window.removeEventListener('iattend-element-key', onPieceKey)
        }
    }, [enabled])
}

// Copia de un elemento para pegarlo: id nuevo y, si va a la misma sección
// de donde salió, un poco abajo a la derecha para que se vea.
export const copiaDeElemento = (it, mismaSeccion, i = 0) => ({
    ...it,
    id: `l${Date.now().toString(36)}${i}${Math.random().toString(36).slice(2, 5)}`,
    ...(mismaSeccion ? { x: Math.min(95, (it.x ?? 50) + 4), y: Math.min(95, (it.y ?? 50) + 4) } : {}),
})
