/*
  Invitación en PDF: de un PDF a imágenes listas para la página del invitado.

  El PDF se convierte aquí, en el navegador del organizador, con pdf.js: cada
  página se pinta a ANCHO px y se guarda como WebP (JPG si el navegador no
  sabe codificar WebP, p. ej. Safari). La página del invitado solo enseña
  imágenes: carga rápido, se ve igual en cualquier teléfono y no carga pdf.js.

  Una página muy larga (una invitación "de scroll" hecha en Canva) se corta en
  tramos de hasta TRAMO px de alto: un canvas gigante revienta en iPhone
  (~16 M px) y WebP no pasa de 16 383 px por lado. Cada tramo se pinta con un
  `transform` que recorre la página, así el canvas nunca crece.

  Carpeta: `user_images/<invitationId>/pdf/<huella>/` — la huella es el
  SHA-256 del archivo, así el mismo PDF nunca se sube dos veces: si ya está
  (tiene su `pdf.json`), se usa lo que hay. Adentro: las páginas, el
  `original.pdf` y `pdf.json` (la ficha que lee "Mi PDF"). Todo cuenta para el
  espacio de la invitación: antes de subir se revisa el cupo (ensureQuota).
  Ver docs/invitacion-pdf.md.
*/

import { supabase } from '../../../lib/supabase'
import { ensureQuota, storageChanged } from '../../../helpers/services/storageQuota'
import { FICHA, leerFicha, urlPublica } from './pdfsSubidos'

export const ANCHO = 1440
const TRAMO = 4000
export const MAX_PAGINAS = 20
export const MAX_MB = 25

let pdfjsPromise = null
// pdf.js pesa ~1 MB: solo se baja cuando alguien sube un PDF.
const cargarPdfjs = () => {
    if (!pdfjsPromise) {
        pdfjsPromise = Promise.all([
            import('pdfjs-dist'),
            import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
        ]).then(([pdfjs, worker]) => {
            pdfjs.GlobalWorkerOptions.workerSrc = worker.default
            return pdfjs
        })
    }
    return pdfjsPromise
}

const aBlob = (canvas) => new Promise((resolve) => {
    canvas.toBlob((blob) => {
        if (blob?.type === 'image/webp') return resolve(blob)
        canvas.toBlob((jpg) => resolve(jpg), 'image/jpeg', 0.88)
    }, 'image/webp', 0.86)
})

const extension = (blob) => (blob.type === 'image/webp' ? 'webp' : 'jpg')

const huellaDe = async (buffer) => {
    const hash = await crypto.subtle.digest('SHA-256', buffer)
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24)
}

const subir = async (path, body, contentType) => {
    const { error } = await supabase.storage
        .from('user_images')
        .upload(path, body, { upsert: true, contentType, cacheControl: '31536000' })
    if (error) throw error
    return urlPublica(path)
}

/**
 * Convierte y sube el PDF. `onProgreso({ fase, hecho, total })`.
 * Regresa la ficha que va en `data.pdf` ({ pages, paginas, source, fileName,
 * uploadedAt, carpeta, bytes }) o null si no cupo en el espacio.
 */
export const subirPdf = async ({ file, invitationID, onProgreso }) => {
    if (!file) throw new Error('Sin archivo')
    if (file.type && file.type !== 'application/pdf') throw new Error('El archivo no es un PDF')
    if (file.size > MAX_MB * 1024 * 1024) throw new Error(`El PDF pesa más de ${MAX_MB} MB`)

    onProgreso?.({ fase: 'leyendo', hecho: 0, total: 0 })
    const buffer = await file.arrayBuffer()
    const carpeta = `${invitationID}/pdf/${await huellaDe(buffer)}`

    // ¿Ya se había subido este mismo PDF? Se usa tal cual.
    const existente = await leerFicha(carpeta)
    if (existente?.pages?.length) return { ...existente, fileName: existente.fileName || file.name }

    const pdfjs = await cargarPdfjs()
    // pdf.js se queda con el buffer (lo transfiere al worker): va una copia.
    const tarea = pdfjs.getDocument({ data: new Uint8Array(buffer.slice(0)) })
    const doc = await tarea.promise

    try {
        if (doc.numPages > MAX_PAGINAS) throw new Error(`El PDF tiene ${doc.numPages} páginas; el máximo es ${MAX_PAGINAS}`)

        // 1 · Convertir todo (en memoria) para saber cuánto pesa.
        const total = doc.numPages
        const tramos = []
        for (let n = 1; n <= total; n++) {
            onProgreso?.({ fase: 'convirtiendo', hecho: n - 1, total })
            const page = await doc.getPage(n)
            const base = page.getViewport({ scale: 1 })
            const viewport = page.getViewport({ scale: ANCHO / base.width })
            const ancho = Math.round(viewport.width)
            const alto = Math.round(viewport.height)

            for (let y = 0, t = 1; y < alto; y += TRAMO, t++) {
                const altoTramo = Math.min(TRAMO, alto - y)
                const canvas = document.createElement('canvas')
                canvas.width = ancho
                canvas.height = altoTramo
                const ctx = canvas.getContext('2d')
                // Fondo blanco: un PDF con transparencia se vería negro en JPG.
                ctx.fillStyle = '#FFFFFF'
                ctx.fillRect(0, 0, ancho, altoTramo)
                await page.render({ canvasContext: ctx, canvas, viewport, transform: [1, 0, 0, 1, 0, -y] }).promise
                const blob = await aBlob(canvas)
                canvas.width = 0
                canvas.height = 0
                tramos.push({ blob, w: ancho, h: altoTramo, pagina: n, nombre: `p${String(n).padStart(2, '0')}-${t}.${extension(blob)}` })
            }
            page.cleanup()
        }

        // 2 · ¿Cabe en el espacio de la invitación? (páginas + original)
        const bytes = tramos.reduce((s, x) => s + x.blob.size, 0) + file.size
        if (!(await ensureQuota(invitationID, bytes))) return null

        // 3 · Subir.
        onProgreso?.({ fase: 'guardando', hecho: total, total })
        const pages = []
        for (const x of tramos) {
            const url = await subir(`${carpeta}/${x.nombre}`, x.blob, x.blob.type)
            pages.push({ url, w: x.w, h: x.h, pagina: x.pagina })
        }
        // El original es de respaldo: si el bucket no acepta PDF, sigue sin él.
        let source = null
        try { source = await subir(`${carpeta}/original.pdf`, file, 'application/pdf') }
        catch (e) { console.warn('No se guardó el PDF original:', e.message) }

        const ficha = {
            pages,
            paginas: total,
            source,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            carpeta,
            bytes,
        }
        await subir(`${carpeta}/${FICHA}`, new Blob([JSON.stringify(ficha)], { type: 'application/json' }), 'application/json')
        storageChanged()
        return ficha
    } finally {
        tarea.destroy()
    }
}
