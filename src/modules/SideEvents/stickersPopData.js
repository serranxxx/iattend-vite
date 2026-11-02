// Datos de los PNG de un Pop: los usan el panel (StickersPop) y el
// pegado con ⌘V del editor (SideEvents).

// Tope de imágenes (PNG) por evento; los demás elementos (texto, íconos,
// formas, líneas, decoraciones) no pesan y tienen su propio tope.
export const MAX_STICKERS = 12
export const MAX_ELEMENTOS = 40

// `body.stickers` guarda todos los elementos de la portada. Sin `kind` (o
// 'sticker') es una imagen con `url`; si no, uno de los elementos del panel
// Elementos (mismo modelo que `decorations` de la invitación: icon, shape,
// text, line, separator). Ver PopElemento.jsx.
export const esImagen = (s) => !s?.kind || s.kind === 'sticker'
export const contarImagenes = (lista) => (lista ?? []).filter(esImagen).length
// ¿Cabe uno más de este tipo?
export const cabeElemento = (lista, imagen = true) =>
    (lista ?? []).length < MAX_ELEMENTOS && (!imagen || contarImagenes(lista) < MAX_STICKERS)

// Id de un elemento nuevo (prefijo: 's' elementos, 'd' dibujos).
export const nuevoIdElemento = (prefijo = 's') => `${prefijo}${Date.now()}${Math.random().toString(36).slice(2, 5)}`

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

/*
  Grupos de capas (Capas y la barra del elemento → Agrupar / Desagrupar,
  ⌘G / ⇧⌘G): los elementos de un grupo llevan el mismo `grupo` y quedan
  juntos en el arreglo (en el lugar del que estaba más arriba). Tocar uno en
  la pieza elige al grupo entero; en Capas son una fila que se arrastra como
  bloque. Solo es del editor: la página del invitado los pinta igual.
*/
// Los ids de los elementos que van juntos con `s` (su grupo, o solo él).
export const miembrosDe = (stickers, s) => (s?.grupo ? stickers.filter((o) => o.grupo === s.grupo).map((o) => o.id) : [s?.id].filter(Boolean))

// La selección completada con los grupos de lo elegido.
export const conSusGrupos = (stickers, ids) => {
    const grupos = new Set(stickers.filter((o) => ids.includes(o.id) && o.grupo).map((o) => o.grupo))
    return stickers.filter((o) => ids.includes(o.id) || (o.grupo && grupos.has(o.grupo))).map((o) => o.id)
}

// ¿Lo elegido es exactamente un grupo?
export const grupoDeSeleccion = (stickers, ids) => {
    const elegidos = stickers.filter((o) => ids.includes(o.id))
    const g = elegidos[0]?.grupo
    if (!g || elegidos.some((o) => o.grupo !== g)) return null
    return stickers.filter((o) => o.grupo === g).length === elegidos.length ? g : null
}

// Agrupa: un grupo nuevo con lo elegido (y sus grupos), juntos en el lugar
// del que estaba más arriba.
export const agrupar = (stickers, ids) => {
    const todos = conSusGrupos(stickers, ids)
    if (todos.length < 2) return stickers
    const g = nuevoIdElemento('g')
    const miembros = stickers.filter((o) => todos.includes(o.id)).map((o) => ({ ...o, grupo: g }))
    const resto = stickers.filter((o) => !todos.includes(o.id))
    // Lugar: después de los que quedaban debajo del de más arriba.
    const arriba = Math.max(...todos.map((id) => stickers.findIndex((o) => o.id === id)))
    const debajo = stickers.slice(0, arriba + 1).filter((o) => !todos.includes(o.id)).length
    return [...resto.slice(0, debajo), ...miembros, ...resto.slice(debajo)]
}

// Desagrupa los grupos de lo elegido (sus elementos se quedan donde están).
export const desagrupar = (stickers, ids) => {
    const grupos = new Set(stickers.filter((o) => ids.includes(o.id) && o.grupo).map((o) => o.grupo))
    if (!grupos.size) return stickers
    return stickers.map((o) => {
        if (!o.grupo || !grupos.has(o.grupo)) return o
        const { grupo: _grupo, ...sin } = o
        return sin
    })
}

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
