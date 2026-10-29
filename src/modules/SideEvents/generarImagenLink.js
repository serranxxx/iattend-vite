import { PIEZA_ALTO, PIEZA_ANCHO } from './stickersFlashData'

/*
  Imagen para el link de un Flash, armada desde la pieza: el fondo elegido
  (cover), el velo si está prendido y los PNG en el mismo lugar, tamaño, giro,
  opacidad y orden que en la pieza (lienzo de 390×700). Sin textos: WhatsApp ya
  muestra el título del link debajo. Sale a 2× para que se vea nítida.
*/

const ESCALA = 2

// Supabase Storage sirve las públicas con CORS abierto; sin `crossOrigin` el
// canvas quedaría "manchado" y no se podría exportar.
const cargarImagen = (url) => new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`No cargó ${url}`))
    img.src = url
})

// Un cuadro del video (al segundo 1, o antes si es más corto).
const cargarCuadroDeVideo = (url) => new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onloadedmetadata = () => { video.currentTime = Math.min(1, (video.duration || 1) / 2) }
    video.onseeked = () => resolve(video)
    video.onerror = () => reject(new Error(`No cargó ${url}`))
    video.src = url
})

const dibujarCover = (ctx, fuente, ancho, alto) => {
    const fw = fuente.videoWidth || fuente.naturalWidth
    const fh = fuente.videoHeight || fuente.naturalHeight
    const escala = Math.max(ancho / fw, alto / fh)
    const w = fw * escala
    const h = fh * escala
    ctx.drawImage(fuente, (ancho - w) / 2, (alto - h) / 2, w, h)
}

/**
 * @param {{ fondo: { tipo: 'imagen'|'video', url: string } | null, stickers: object[], color?: string, veil?: number }} opciones
 * @returns {Promise<File>} JPG listo para subir
 */
export const generarImagenLink = async ({ fondo, stickers: todos, color, veil }) => {
    // Solo imágenes (PNG); los elementos de texto, íconos y formas no.
    const stickers = (todos ?? []).filter(s => !s.kind || s.kind === 'sticker')
    const ancho = PIEZA_ANCHO * ESCALA
    const alto = PIEZA_ALTO * ESCALA
    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto
    const ctx = canvas.getContext('2d')

    // Mismo lienzo de arranque que la pieza cuando no hay fondo.
    const base = ctx.createLinearGradient(0, 0, 0, alto)
    base.addColorStop(0, '#EEEEEE')
    base.addColorStop(1, '#CCCCCC')
    ctx.fillStyle = base
    ctx.fillRect(0, 0, ancho, alto)

    if (fondo?.url) {
        const fuente = fondo.tipo === 'video' ? await cargarCuadroDeVideo(fondo.url) : await cargarImagen(fondo.url)
        dibujarCover(ctx, fuente, ancho, alto)
    }

    const imagenes = await Promise.all(stickers.map(s => cargarImagen(s.url)))

    stickers.forEach((s, i) => {
        const img = imagenes[i]
        const w = (s.w / 100) * ancho
        const h = w * (img.naturalHeight / img.naturalWidth)
        ctx.save()
        ctx.globalAlpha = s.opacity ?? 1
        ctx.translate((s.x / 100) * ancho, (s.y / 100) * alto)
        ctx.rotate(((s.rot ?? 0) * Math.PI) / 180)
        ctx.drawImage(img, -w / 2, -h / 2, w, h)
        ctx.restore()
    })

    // Velo del panel Fondo: en la pieza va encima de la portada y los PNG.
    if (veil > 0 && /^#[0-9a-f]{6}$/i.test(color ?? '')) {
        ctx.globalAlpha = Math.min(100, veil) / 100
        ctx.fillStyle = color
        ctx.fillRect(0, 0, ancho, alto)
        ctx.globalAlpha = 1
    }

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo exportar'))), 'image/jpeg', 0.9)
    })
    return new File([blob], 'link.jpg', { type: 'image/jpeg' })
}
