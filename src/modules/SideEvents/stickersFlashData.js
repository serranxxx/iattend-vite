// Datos de los PNG de un Flash: los usan el panel (StickersFlash) y el
// pegado con ⌘V del editor (SideEvents).

// Tope de imágenes (PNG) por evento; los demás elementos (texto, íconos,
// formas, líneas, decoraciones) no pesan y tienen su propio tope.
export const MAX_STICKERS = 12
export const MAX_ELEMENTOS = 40

// `body.stickers` guarda todos los elementos de la portada. Sin `kind` (o
// 'sticker') es una imagen con `url`; si no, uno de los elementos del panel
// Elementos (mismo modelo que `decorations` de la invitación: icon, shape,
// text, line, separator). Ver FlashElemento.jsx.
export const esImagen = (s) => !s?.kind || s.kind === 'sticker'
export const contarImagenes = (lista) => (lista ?? []).filter(esImagen).length
// ¿Cabe uno más de este tipo?
export const cabeElemento = (lista, imagen = true) =>
    (lista ?? []).length < MAX_ELEMENTOS && (!imagen || contarImagenes(lista) < MAX_STICKERS)

// Elemento nuevo desde el panel (layerItems.js de la invitación arma `item`).
export const nuevoElemento = (item) => ({
    x: 50,
    y: 25,
    rot: 0,
    opacity: 1,
    ...item,
    id: `s${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
})

export const nuevoSticker = (url) => ({
    id: `s${Date.now()}`,
    url,
    x: 50,
    y: 25,
    w: 30,
    rot: 0,
    z: 'front',
    opacity: 1,
})

// Duplicar los elegidos (un poco abajo a la derecha, para que se vean) y
// quitarlos: los usan el panel y la píldora del editor móvil.
export const duplicarStickers = (stickers, ids) => {
    const ahora = Date.now()
    const copias = stickers
        .filter(s => ids.includes(s.id))
        .map((g, i) => ({ ...g, id: `s${ahora}${i}`, x: Math.min(95, g.x + 6), y: Math.min(95, g.y + 6) }))
    return { lista: [...stickers, ...copias], nuevos: copias.map(c => c.id) }
}
export const quitarStickers = (stickers, ids) => stickers.filter(s => !ids.includes(s.id))

// Selección de varios PNG (panel y pieza): ⌘/Ctrl/Shift + clic suma o quita;
// un clic normal la reemplaza.
export const conModificador = (e) => e.shiftKey || e.metaKey || e.ctrlKey
export const alternar = (lista, id) => (lista.includes(id) ? lista.filter(x => x !== id) : [...lista, id])

// Lienzo de los PNG: la pieza del editor (390×700) escalada para cubrir una
// pantalla de ancho × alto, centrada (como object-fit: cover). En 390×700 es
// la pantalla tal cual. Contraparte en iattend-events/src/components/SideEvent/SideEvent.tsx.
export const PIEZA_ANCHO = 390
export const PIEZA_ALTO = 700
export const lienzoCover = (ancho, alto) => {
    const escala = Math.max(ancho / PIEZA_ANCHO, alto / PIEZA_ALTO)
    const w = PIEZA_ANCHO * escala
    const h = PIEZA_ALTO * escala
    return { left: (ancho - w) / 2, top: (alto - h) / 2, width: w, height: h }
}
