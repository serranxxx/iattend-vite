// Datos de los PNG de un Flash: los usan el panel (StickersFlash) y el
// pegado con ⌘V del editor (SideEvents).

export const MAX_STICKERS = 12

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
