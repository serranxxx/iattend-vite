/*
  Portada de un side event / Pop: una lista de 1 a MAX_FOTOS_CARRUSEL fotos o
  videos, mezclados (barra Fondo del editor). Con uno es el fondo fijo; con
  varios, un carrusel que cambia solo con un fundido: cada foto dura
  CAMBIO_CARRUSEL_MS y cada video se reproduce completo cuando le toca.
  Cómo se guarda (compatible con lo de antes):
  - `body.images`: la lista completa cuando son 2 o más (fotos y videos).
  - `body.video`: el video cuando es lo único de la portada.
  - `body.image`: la primera FOTO de la lista. La imagen del link, la del
    pase de Wallet, el cuadro de la lista de eventos y el cuadro fijo de un
    video la siguen leyendo de ahí. Con solo videos se queda la que había.
  Un `images` viejo que ya no empieza con `body.image` (se cambió la foto
  en modo imagen) y no trae videos no cuenta: es una foto sola.
  Un video se reconoce por su URL (carpeta `video/` de Subidos o extensión).
  Gemela en iattend-events: src/helpers/fotosPortada.ts.
*/

export const MAX_FOTOS_CARRUSEL = 6
export const CAMBIO_CARRUSEL_MS = 4500

export const esVideo = (url) => typeof url === 'string' && /\/video\/|\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(url)

// Todo lo de la portada, en orden (fotos y videos).
export const mediaDePortada = (body) => {
    const lista = Array.isArray(body?.images) ? body.images.filter((s) => typeof s === 'string' && s.trim()) : []
    if (lista.length > 1 && (lista[0] === body?.image || lista.some(esVideo))) return lista
    if (body?.video) return [body.video]
    return body?.image ? [body.image] : []
}

// Solo las fotos (lo que se puede usar de imagen del link).
export const fotosDePortada = (body) => mediaDePortada(body).filter((s) => !esVideo(s))

export const esCarrusel = (body) => mediaDePortada(body).length > 1

// La portada solo trae videos: la imagen del link (y del pase) la tiene que
// elegir el organizador (LinkPanel), no se arma sola.
export const soloVideos = (body) => {
    const m = mediaDePortada(body)
    return m.length > 0 && m.every(esVideo)
}

// Lo que se guarda para una lista nueva. `imagenAntes`: el cuadro fijo que
// había (se queda si la lista no trae fotos).
export const parcheMedia = (lista, imagenAntes = null) => {
    const media = lista.filter(Boolean).slice(0, MAX_FOTOS_CARRUSEL)
    const primeraFoto = media.find((s) => !esVideo(s))
    return {
        images: media.length > 1 ? media : undefined,
        video: media.length === 1 && esVideo(media[0]) ? media[0] : null,
        image: primeraFoto ?? (media.length ? imagenAntes : null),
    }
}

// Lista de solo fotos (el editor del celular).
export const parcheFotos = (lista) => parcheMedia(lista)

/*
  Ajuste de cada foto o video de la portada: `body.imageFrames` =
  { [url]: { z, x, y } } — `z` es el zoom sobre el "cover" (1 a
  AJUSTE_ZOOM_MAX) y x / y el encuadre en % (como object-position: 0 =
  pegada a la izquierda o arriba, 50 = centrada). Se lee también el
  `imageFrame` de una sola foto ({ src, z, x, y }). Se pinta con
  object-position + scale con el origen en el mismo punto (estiloAjuste), que
  da justo el recuadro de `cubrir`, donde se anclan los dibujos.
*/
export const AJUSTE_ZOOM_MAX = 3
const acotar = (v, a, b, d) => (Number.isFinite(Number(v)) ? Math.min(b, Math.max(a, Number(v))) : d)

export const ajusteDe = (body, src) => {
    if (!src) return null
    const viejo = body?.imageFrame?.src === src ? body.imageFrame : null
    const a = body?.imageFrames?.[src] ?? viejo
    if (!a) return null
    const z = acotar(a.z, 1, AJUSTE_ZOOM_MAX, 1)
    const x = acotar(a.x, 0, 100, 50)
    const y = acotar(a.y, 0, 100, 50)
    return z === 1 && x === 50 && y === 50 ? null : { z, x, y }
}

// Parche del body con el ajuste de una foto (null = sin ajuste).
export const parcheAjuste = (body, src, a) => {
    const resto = { ...(body?.imageFrames ?? {}) }
    delete resto[src]
    // Solo se guardan los de lo que sigue en la portada.
    const media = mediaDePortada(body)
    Object.keys(resto).forEach((k) => { if (!media.includes(k)) delete resto[k] })
    if (a) resto[src] = { z: a.z, x: a.x, y: a.y }
    return { imageFrames: Object.keys(resto).length ? resto : undefined, imageFrame: undefined }
}

export const estiloAjuste = (a) => (a
    ? { objectPosition: `${a.x}% ${a.y}%`, transform: `scale(${a.z})`, transformOrigin: `${a.x}% ${a.y}%` }
    : undefined)

// Recuadro de una foto de w × h que cubre una caja de ancho × alto con el ajuste.
export const cubrir = ({ w, h }, ancho, alto, a) => {
    const e = Math.max(ancho / w, alto / h) * (a?.z ?? 1)
    const width = w * e
    const height = h * e
    return { left: (ancho - width) * ((a?.x ?? 50) / 100), top: (alto - height) * ((a?.y ?? 50) / 100), width, height }
}

/*
  Desenfoque de la portada hacia abajo (barra Fondo → Desenfoque):
  `body.coverBlur` = { amount (px, 0 = sin desenfoque), start (% de la
  pantalla donde empieza) }; sin valor, el de siempre (6 px desde el 40 %).
  El degradado llega a todo el desenfoque 40 puntos más abajo. Con video de
  fondo no hay desenfoque (backdrop-filter sobre video es muy pesado).
*/
export const DESENFOQUE_BASE = { amount: 6, start: 40 }
export const desenfoqueDe = (body) => ({
    amount: acotar(body?.coverBlur?.amount, 0, 20, DESENFOQUE_BASE.amount),
    start: acotar(body?.coverBlur?.start, 0, 90, DESENFOQUE_BASE.start),
})
// Variables CSS de la capa del desenfoque (.blurCover / .blur_cover).
export const variablesDesenfoque = (body) => {
    const d = desenfoqueDe(body)
    return { '--blur-portada': `${d.amount}px`, '--blur-inicio': `${d.start}%`, '--blur-fin': `${Math.min(100, d.start + 40)}%` }
}
