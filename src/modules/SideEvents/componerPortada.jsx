import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'
import { PopElemento } from '../Editor/Elemento'
import { cargarVector, esUrlDeVector } from '../Editor/vector'
import { esImagen, PIEZA_ALTO, PIEZA_ANCHO } from './stickersPopData'
import { ajusteDe, cubrir } from './fotosPortada'
import styles from './SideCanvas.module.css'

/*
  La portada de un side event / Pop armada en una imagen, con TODO lo que
  el organizador le puso encima: el fondo (foto o un cuadro del video, cover),
  los PNG, los elementos (textos, íconos, formas, líneas, decoraciones,
  vectores) y los dibujos (anclados a la foto), en el mismo lugar, tamaño,
  giro, opacidad y orden que en la pieza (lienzo de 390 × 700), y el velo.
  Sin título, fecha ni botones. La usan la imagen del link ("Crear desde mi
  diseño") y la foto del pase de Apple Wallet: SideEvents.jsx la arma sola al
  guardar un Pop con foto (`imagenDelLink`). Sale a 2× (780 × 1400), JPG.

  Cómo: el fondo y el velo se dibujan directo en un canvas; los elementos se
  pintan fuera de pantalla con los mismos componentes del editor
  (PopElemento, Dibujo) y se fotografían con html2canvas. En la copia que
  fotografía, a los SVG se les fijan los colores y grosores ya calculados
  (currentColor y variables CSS no sobreviven al pasarlos a imagen) y lo que
  se pinta con máscara CSS (íconos) se cambia por una imagen ya teñida.
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

const tamDe = (f) => ({ w: f.videoWidth || f.naturalWidth, h: f.videoHeight || f.naturalHeight })

// Recuadro de la foto tal como se ve (cover del lienzo con su ajuste:
// fotosPortada.js → cubrir).
export const cover = (tam, ancho, alto, ajuste) => cubrir(tam, ancho, alto, ajuste)

const estiloSticker = (s) => ({
    left: `${s.x}%`,
    top: `${s.y}%`,
    width: `${s.w}%`,
    transform: `translate(-50%, -50%) rotate(${s.rot ?? 0}deg)${s.flipX || s.flipY ? ` scale(${s.flipX ? -1 : 1}, ${s.flipY ? -1 : 1})` : ''}`,
    opacity: s.opacity ?? 1,
})

export const pintar = (lista, titleFont) => lista.map((s) => (esImagen(s)
    ? <img key={s.id} src={s.url} alt="" crossOrigin="anonymous" className={styles.sticker} style={estiloSticker(s)} />
    : (
        <div key={s.id} className={`${styles.sticker} ${styles.elemento}`} style={estiloSticker(s)}>
            <PopElemento s={s} titleFont={titleFont} />
        </div>
    )))

const PROPS_SVG = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'fill-opacity', 'opacity', 'vector-effect', 'color']

// En la copia: SVG con sus estilos ya calculados y máscaras → imágenes teñidas.
const prepararCopia = async (raiz) => {
    const doc = raiz.ownerDocument ?? raiz
    const win = doc.defaultView
    raiz.querySelectorAll('svg').forEach((svg) => {
        const cs = win.getComputedStyle(svg)
        svg.setAttribute('color', cs.color)
        if (!svg.getAttribute('width')) svg.setAttribute('width', String(svg.getBoundingClientRect().width || 100))
        if (!svg.getAttribute('height')) svg.setAttribute('height', String(svg.getBoundingClientRect().height || 100))
        svg.querySelectorAll('*').forEach((el) => {
            const c = win.getComputedStyle(el)
            PROPS_SVG.forEach((p) => {
                const v = c.getPropertyValue(p)
                if (v && v !== 'none' || p === 'fill') el.style.setProperty(p, v)
            })
        })
    })

    const conMascara = [...raiz.querySelectorAll('*')].filter((el) => {
        const m = win.getComputedStyle(el).webkitMaskImage || win.getComputedStyle(el).maskImage
        return m && m !== 'none' && /url\(/.test(m)
    })
    await Promise.all(conMascara.map(async (el) => {
        const cs = win.getComputedStyle(el)
        const url = /url\(["']?([^"')]+)["']?\)/.exec(cs.webkitMaskImage || cs.maskImage)?.[1]
        const { width, height } = el.getBoundingClientRect()
        if (!url || !width || !height) return
        try {
            const img = await cargarImagen(url)
            const c = doc.createElement('canvas')
            c.width = Math.round(width * ESCALA)
            c.height = Math.round(height * ESCALA)
            const ctx = c.getContext('2d')
            // contain, centrada (como mask-size: contain).
            const e = Math.min(c.width / img.naturalWidth, c.height / img.naturalHeight)
            const w = img.naturalWidth * e
            const h = img.naturalHeight * e
            ctx.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h)
            ctx.globalCompositeOperation = 'source-in'
            ctx.fillStyle = cs.backgroundColor
            ctx.fillRect(0, 0, c.width, c.height)
            const reemplazo = doc.createElement('img')
            reemplazo.src = c.toDataURL('image/png')
            reemplazo.className = el.className
            reemplazo.setAttribute('style', el.getAttribute('style') ?? '')
            Object.assign(reemplazo.style, { width: `${width}px`, height: `${height}px`, background: 'none', webkitMaskImage: 'none', maskImage: 'none' })
            el.replaceWith(reemplazo)
        } catch { /* sin CORS: se queda como venía */ }
    }))
}

// Firma de lo que se ve en la portada (fondo, elementos visibles, velo, color
// y tipografía del título). Al guardar un Pop, la imagen del link se vuelve
// a armar solo si cambió (SideEvents.jsx, `body.linkFirma`). `v` cambia cuando
// cambia la regla: así todas se rehacen una vez (v2 = ya no se elige a mano).
export const firmaPortada = (body) => {
    const texto = JSON.stringify({
        v: 2,
        image: body?.image ?? null,
        // Solo si hay ajuste: así no cambia la firma de los que no lo tienen.
        ...(ajusteDe(body, body?.image) ? { ajuste: ajusteDe(body, body?.image) } : {}),
        video: body?.video ?? null,
        veil: body?.veil ?? 0,
        color: body?.color ?? null,
        font: body?.title?.font ?? null,
        stickers: (body?.stickers ?? []).filter((s) => !s.hidden && !s.tarjeta),
    })
    let h = 5381
    for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0
    return (h >>> 0).toString(36)
}

// ¿Hay algo encima de la foto? (si no, la imagen del link es la foto tal cual)
export const portadaConDiseno = (body) => (body?.stickers ?? []).some((s) => !s.hidden && !s.tarjeta) || (body?.veil ?? 0) > 0

/**
 * @param {{ fondo: { tipo: 'imagen'|'video', url: string, ajuste?: object } | null, stickers: object[], color?: string, veil?: number, titleFont?: string }} opciones
 * @returns {Promise<File>} JPG listo para subir
 */
export const componerPortada = async ({ fondo, stickers: todos, color, veil, titleFont = 'Poppins' }) => {
    // Sin los de las tarjetas ni los anclados a otra foto del carrusel.
    const stickers = (todos ?? []).filter((s) => !s.hidden && !s.tarjeta && (!s.fotoSrc || s.fotoSrc === fondo?.url))
    const ancho = PIEZA_ANCHO
    const alto = PIEZA_ALTO
    const canvas = document.createElement('canvas')
    canvas.width = ancho * ESCALA
    canvas.height = alto * ESCALA
    const ctx = canvas.getContext('2d')
    ctx.scale(ESCALA, ESCALA)

    // Mismo lienzo de arranque que la pieza cuando no hay fondo.
    const base = ctx.createLinearGradient(0, 0, 0, alto)
    base.addColorStop(0, '#EEEEEE')
    base.addColorStop(1, '#CCCCCC')
    ctx.fillStyle = base
    ctx.fillRect(0, 0, ancho, alto)

    let marcoFoto = null
    if (fondo?.url) {
        const fuente = fondo.tipo === 'video' ? await cargarCuadroDeVideo(fondo.url) : await cargarImagen(fondo.url)
        marcoFoto = cover(tamDe(fuente), ancho, alto, fondo.ajuste)
        ctx.drawImage(fuente, marcoFoto.left, marcoFoto.top, marcoFoto.width, marcoFoto.height)
    }

    if (stickers.length) {
        // Los vectores se cargan antes, para que se pinten ya resueltos.
        await Promise.all(stickers.filter((s) => s.vector || esUrlDeVector(s.src)).map((s) => cargarVector(s.src)))
        const enFoto = (s) => s.kind === 'dibujo' && s.foto && marcoFoto

        const contenedor = document.createElement('div')
        // En la ventana pero invisible (html2canvas no fotografía bien lo que
        // queda fuera de la pantalla); en la copia que fotografía se ve.
        contenedor.dataset.componerPortada = '1'
        Object.assign(contenedor.style, { position: 'fixed', left: '0', top: '0', width: `${ancho}px`, height: `${alto}px`, overflow: 'hidden', pointerEvents: 'none', opacity: '0', zIndex: '-1' })
        document.body.appendChild(contenedor)
        const root = createRoot(contenedor)
        try {
            root.render(
                <div style={{ position: 'relative', width: ancho, height: alto }}>
                    <div className={styles.lienzo} style={{ position: 'absolute', inset: 0 }}>
                        {pintar(stickers.filter((s) => !enFoto(s)), titleFont)}
                    </div>
                    {marcoFoto && (
                        <div className={styles.lienzo} style={{ position: 'absolute', ...marcoFoto }}>
                            {pintar(stickers.filter(enFoto), titleFont)}
                        </div>
                    )}
                </div>,
            )
            // Que React pinte, carguen las imágenes y las tipografías.
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
            await Promise.all([...contenedor.querySelectorAll('img')].map((img) => (img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r }))))
            await document.fonts?.ready
            await new Promise((r) => setTimeout(r, 150))

            const capa = await html2canvas(contenedor, {
                backgroundColor: null,
                scale: ESCALA,
                useCORS: true,
                logging: false,
                width: ancho,
                height: alto,
                onclone: (doc) => {
                    const copia = doc.querySelector('[data-componer-portada]')
                    if (copia) { copia.style.opacity = '1'; copia.style.zIndex = '0' }
                    return prepararCopia(copia ?? doc)
                },
            })
            ctx.drawImage(capa, 0, 0, ancho, alto)
        } finally {
            root.unmount()
            contenedor.remove()
        }
    }

    // Velo del panel Fondo: en la pieza va encima de la portada y los elementos.
    if (veil > 0 && /^#[0-9a-f]{6}$/i.test(color ?? '')) {
        ctx.globalAlpha = Math.min(100, veil) / 100
        ctx.fillStyle = color
        ctx.fillRect(0, 0, ancho, alto)
        ctx.globalAlpha = 1
    }

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo exportar'))), 'image/jpeg', 0.9)
    })
    // Nombre propio: así se reconoce en Subidos para borrar las viejas
    // (SideEvents.jsx → limpiarImagenesDelLink) sin tocar fotos del usuario.
    return new File([blob], 'imagen-del-link.jpg', { type: 'image/jpeg' })
}
