// Elementos sueltos de la invitación (`invitation.decorations[sección]`):
// stickers, íconos, textos y líneas que se arrastran desde los paneles
// Elementos / Stickers del editor (EditorWorkspace) a la pieza de
// iattend-events, que los pinta y los edita (SectionLayer.tsx).
//
// El arrastre vive aquí: un "fantasma" sigue al puntero y, al soltarlo,
// ReactHost pasa el punto a coordenadas del iframe (HOST_LAYER_DROP). Un clic
// no agrega nada (solo `onTap`); addLayerItem (HOST_LAYER_ADD) queda para
// pegar una imagen con ⌘V y para el panel Imágenes. La
// comunicación con ReactHost va por eventos de window para no cablear props.

import { subirSticker } from '../../../../helpers/services/uploadImage'

export const MAX_STICKERS = 12

export const LAYER_ICONS = [
    'Heart', 'Sparkles', 'Star', 'Flower', 'Flower2', 'Leaf', 'Gem', 'Moon',
    'Sun', 'Wine', 'Music', 'Camera', 'Church', 'Infinity', 'Bird', 'Cake',
]

export const LINE_VARIANTS = ['solid', 'dashed', 'dotted', 'double']

// Formas básicas: relleno, borde y se estiran (ar = alto / ancho).
export const SHAPES = [
    { variant: 'square', w: 26, ar: 1 },
    { variant: 'circle', w: 26, ar: 1 },
    { variant: 'rect', w: 40, ar: 0.6 },
    { variant: 'triangle', w: 26, ar: 0.9 },
    { variant: 'star', w: 26, ar: 1 },
]

// Los separadores de la invitación (mismos números que generals.separator).
export const SEPARATORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export const countStickers = (invitation) =>
    Object.values(invitation?.decorations ?? {}).reduce((n, list) => n + (list ?? []).filter((it) => it.kind === 'sticker').length, 0)

export const stickerItem = (url) => ({ kind: 'sticker', url, w: 30, rot: 0, opacity: 1 })

// "Tus stickers": los que se subieron para esta invitación (se recuerdan en
// el navegador) más los que ya están puestos en ella.
const libraryKey = (invitationID) => `iattend_stickers_${invitationID}`
export const readLibrary = (invitationID) => {
    try { return JSON.parse(localStorage.getItem(libraryKey(invitationID)) ?? '[]') } catch { return [] }
}
export const addToLibrary = (invitationID, url) => {
    const next = [url, ...readLibrary(invitationID).filter((u) => u !== url)].slice(0, 60)
    localStorage.setItem(libraryKey(invitationID), JSON.stringify(next))
    window.dispatchEvent(new Event('iattend-sticker-library'))
}
export const stickerLibrary = (invitationID, invitation) => {
    const placed = Object.values(invitation?.decorations ?? {})
        .flatMap((list) => (list ?? []).filter((it) => it.kind === 'sticker').map((it) => it.url))
    return [...new Set([...readLibrary(invitationID), ...placed])].filter(Boolean)
}

// Sube los PNG (aligerados) a la carpeta de la invitación y los guarda en
// "Tus stickers". Regresa sus URLs.
export const uploadStickers = async (files, invitationID) => {
    const urls = []
    for (const file of files) {
        if (!file.type.startsWith('image/')) continue
        const url = await subirSticker(file, `inv-${invitationID}`)
        if (url) { addToLibrary(invitationID, url); urls.push(url) }
    }
    return urls
}

const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }))

// Agrega sin arrastrar (clic en el panel o ⌘V): la pieza elige la sección.
export const addLayerItem = (item, section = null) => emit('iattend-layer-add', { item, section })

// pointerdown sobre una tarjeta del panel. A la invitación solo se agrega
// arrastrando; un clic sin arrastre llama `onTap` (p. ej. ponerlo como ícono
// del momento elegido en el itinerario) y si no hay, no hace nada.
export const startLayerDrag = (e, item, { disabled = false, onTap } = {}) => {
    if (e.button !== 0 || disabled) return
    e.preventDefault()
    const src = e.currentTarget
    const sx = e.clientX
    const sy = e.clientY
    let ghost = null

    const onMove = (ev) => {
        if (!ghost) {
            if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return
            const r = src.getBoundingClientRect()
            ghost = src.cloneNode(true)
            Object.assign(ghost.style, {
                position: 'fixed',
                width: `${r.width}px`,
                height: `${r.height}px`,
                margin: 0,
                zIndex: 3000,
                pointerEvents: 'none',
                opacity: '0.9',
                transform: 'translate(-50%, -50%) scale(0.9)',
                boxShadow: '0 12px 32px rgba(12, 23, 27, 0.22)',
                background: '#FFF',
                borderRadius: '14px',
            })
            document.body.appendChild(ghost)
            // Mientras se arrastra, los iframes no se tragan el puntero.
            document.body.dataset.layerDrag = 'true'
        }
        ghost.style.left = `${ev.clientX}px`
        ghost.style.top = `${ev.clientY}px`
        emit('iattend-layer-hover', { x: ev.clientX, y: ev.clientY })
    }
    const onUp = (ev) => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        if (!ghost) { onTap?.(); return }
        ghost.remove()
        delete document.body.dataset.layerDrag
        emit('iattend-layer-hover', null)
        emit('iattend-layer-drop', { x: ev.clientX, y: ev.clientY, item })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
}
