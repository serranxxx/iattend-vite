/*
  Invitación en PDF: de un PDF a imágenes listas para la página del invitado.

  El PDF se convierte aquí, en el navegador del organizador, con pdf.js, en
  DOS tamaños: alta resolución (ANCHO_HD px de ancho, para tableta y
  escritorio, donde el PDF va a todo el ancho de la pantalla) y la del
  celular (ANCHO px), que sale de reducir la misma imagen HD. WebP (JPG si el
  navegador no sabe codificar WebP, p. ej. Safari). La página del invitado
  solo enseña imágenes (`srcset`: cada pantalla baja la que necesita): carga
  rápido, se ve igual en cualquier teléfono y no carga pdf.js.
  Antes (conversión 1) solo había 1440 px a 0.86: en escritorio el navegador
  la estiraba 2–3× y se veía borrosa. Una ficha sin `version` ≥ CONVERSION se
  vuelve a convertir desde su original ("Mejorar la calidad", Mi PDF).

  Una página muy larga (una invitación "de scroll" hecha en Canva) se corta en
  tramos de hasta TRAMO_HD px de alto (≈ 11 M px por canvas: uno gigante
  revienta en iPhone, ~16 M px, y WebP no pasa de 16 383 px por lado). Los
  dos tamaños se cortan en los mismos puntos (la página N, tramo T es la
  misma franja en los dos). Cada tramo se pinta con un `transform` que
  recorre la página, así el canvas nunca crece.

  Carpeta: `user_images/<invitationId>/pdf/<huella>/` — la huella es el
  SHA-256 del archivo, así el mismo PDF nunca se sube dos veces: si ya está
  (tiene su `pdf.json`), se usa lo que hay. Adentro: las páginas, el
  `original.pdf` y `pdf.json` (la ficha que lee "Mi PDF"). Todo cuenta para el
  espacio de la invitación: antes de subir se revisa el cupo (ensureQuota).

  Links: los que ya trae el PDF (anotaciones "Link" con URL) se guardan en la
  ficha como `links: [{ pagina, url, x, y, w, h }]` (fracciones de su página)
  y, al usar el PDF, se vuelven zonas transparentes con link sobre él
  (`zonasDeLinks` en botonesPdf.js). Los links a otra página del mismo PDF no.
  Ver docs/invitacion-pdf.md.
*/

import { supabase } from '../../../lib/supabase'
import { ensureQuota, storageChanged } from '../../../helpers/services/storageQuota'
import { carpetaDePdf, fichaDeVersion, leerFicha, urlPublica } from './pdfsSubidos'

export const ANCHO = 1440
export const ANCHO_HD = 3072
const TRAMO_HD = Math.floor(11_000_000 / ANCHO_HD)
const CALIDAD = 0.88
const CALIDAD_HD = 0.9
// Versión de la conversión guardada en la ficha (`version`). 2 = HD + celular.
export const CONVERSION = 2
export const esConversionVieja = (ficha) => Boolean(ficha?.pages?.length) && (ficha.version ?? 1) < CONVERSION
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

const aBlob = (canvas, calidad) => new Promise((resolve) => {
    canvas.toBlob((blob) => {
        if (blob?.type === 'image/webp') return resolve(blob)
        canvas.toBlob((jpg) => resolve(jpg), 'image/jpeg', calidad)
    }, 'image/webp', calidad)
})

const vaciar = (canvas) => { canvas.width = 0; canvas.height = 0 }

// Links con URL de una página, en fracciones de la página (0–1).
const linksDePagina = async (page, viewport, pagina) => {
    try {
        const anotaciones = await page.getAnnotations({ intent: 'display' })
        const W = viewport.width
        const H = viewport.height
        return anotaciones
            .filter((a) => a.subtype === 'Link' && (a.url || a.unsafeUrl) && a.rect)
            .map((a) => {
                const [x1, y1] = viewport.convertToViewportPoint(a.rect[0], a.rect[1])
                const [x2, y2] = viewport.convertToViewportPoint(a.rect[2], a.rect[3])
                const l = Math.max(0, Math.min(x1, x2))
                const r = Math.min(W, Math.max(x1, x2))
                const t = Math.max(0, Math.min(y1, y2))
                const b = Math.min(H, Math.max(y1, y2))
                return { pagina, url: String(a.url || a.unsafeUrl), x: l / W, y: t / H, w: (r - l) / W, h: (b - t) / H }
            })
            .filter((z) => z.w > 0.005 && z.h > 0.002)
    } catch (e) {
        console.warn('No se leyeron los links de la página', pagina, e)
        return []
    }
}

// Todos los links del PDF, sin repetidos (un link partido en varios renglones
// trae un rect por renglón: esos sí se quedan, son zonas distintas).
const linksDelDoc = async (doc) => {
    const todos = []
    for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n)
        const base = page.getViewport({ scale: 1 })
        todos.push(...await linksDePagina(page, page.getViewport({ scale: ANCHO / base.width }), n))
    }
    const vistos = new Set()
    return todos.filter((z) => {
        const k = [z.pagina, z.url, z.x.toFixed(4), z.y.toFixed(4)].join('|')
        if (vistos.has(k)) return false
        vistos.add(k)
        return true
    })
}

/**
 * Ficha de un PDF subido antes de leer links (sin `links`): los lee de su
 * `original.pdf` y la guarda completa. Si no se puede, `links: []`.
 */
export const completarLinks = async (ficha) => {
    if (!ficha || Array.isArray(ficha.links)) return ficha
    let links = []
    const carpeta = carpetaDePdf(ficha)
    // ¿Su ficha guardada ya los trae (otra invitación / pestaña los leyó)?
    const guardada = carpeta ? await leerFicha(carpeta).catch(() => null) : null
    if (Array.isArray(guardada?.links)) return { ...ficha, links: guardada.links }
    const source = ficha.source || (carpeta ? urlPublica(`${carpeta}/original.pdf`) : null)
    try {
        if (source) {
            const res = await fetch(source)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const buffer = await res.arrayBuffer()
            const pdfjs = await cargarPdfjs()
            const tarea = pdfjs.getDocument({ data: new Uint8Array(buffer) })
            try { links = await linksDelDoc(await tarea.promise) } finally { tarea.destroy() }
        }
    } catch (e) {
        console.warn('No se leyeron los links del PDF:', e)
        return { ...ficha, links: [] }
    }
    // No se guarda en Storage: sería sobrescribir la ficha (no se puede, ver
    // pdfsSubidos). Al volver a convertirlo (conversión 2) ya trae sus links.
    return { ...ficha, links }
}

const extension = (blob) => (blob.type === 'image/webp' ? 'webp' : 'jpg')

const huellaDe = async (buffer) => {
    const hash = await crypto.subtle.digest('SHA-256', buffer)
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24)
}

// Sin `upsert`: cada archivo es nuevo (nombres con la marca del intento).
// Reemplazar uno existente choca con la RLS de Storage si lo subió otra cuenta.
const subir = async (path, body, contentType) => {
    const { error } = await supabase.storage
        .from('user_images')
        .upload(path, body, { upsert: false, contentType, cacheControl: '31536000' })
    if (error) throw error
    return urlPublica(path)
}

const quitar = (paths) => (paths.length
    ? supabase.storage.from('user_images').remove(paths).catch(() => {})
    : Promise.resolve())

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

    // ¿Ya se había subido este mismo PDF? Se usa tal cual, salvo que sea de
    // una conversión vieja: entonces se vuelve a convertir en la misma carpeta
    // (con nombres nuevos `v2-<marca>-…`: los de antes pueden estar en la
    // invitación publicada, no se borran; el original ya está, no se vuelve a
    // subir). La marca del intento evita chocar con lo que dejó uno fallido.
    const existente = await leerFicha(carpeta)
    if (existente?.pages?.length && !esConversionVieja(existente)) {
        return completarLinks({ ...existente, fileName: existente.fileName || file.name })
    }
    const conOriginal = Boolean(existente?.source)

    const pdfjs = await cargarPdfjs()
    // pdf.js se queda con el buffer (lo transfiere al worker): va una copia.
    const tarea = pdfjs.getDocument({ data: new Uint8Array(buffer.slice(0)) })
    const doc = await tarea.promise

    try {
        if (doc.numPages > MAX_PAGINAS) throw new Error(`El PDF tiene ${doc.numPages} páginas; el máximo es ${MAX_PAGINAS}`)

        // 1 · Convertir todo (en memoria) para saber cuánto pesa.
        const total = doc.numPages
        const marca = Date.now().toString(36)
        const tramos = []
        for (let n = 1; n <= total; n++) {
            onProgreso?.({ fase: 'convirtiendo', hecho: n - 1, total })
            const page = await doc.getPage(n)
            const base = page.getViewport({ scale: 1 })
            const viewport = page.getViewport({ scale: ANCHO_HD / base.width })
            const anchoHd = Math.round(viewport.width)
            const altoHd = Math.round(viewport.height)
            // La del celular mide ANCHO; sus cortes son los mismos que en HD
            // (acumulados y redondeados, así la suma da el alto exacto).
            const escala = ANCHO / anchoHd
            let yMovil = 0

            for (let y = 0, t = 1; y < altoHd; y += TRAMO_HD, t++) {
                const altoTramo = Math.min(TRAMO_HD, altoHd - y)
                const finMovil = Math.round((y + altoTramo) * escala)
                const altoMovil = Math.max(1, finMovil - yMovil)
                yMovil = finMovil

                const hd = document.createElement('canvas')
                hd.width = anchoHd
                hd.height = altoTramo
                const ctx = hd.getContext('2d')
                // Fondo blanco: un PDF con transparencia se vería negro en JPG.
                ctx.fillStyle = '#FFFFFF'
                ctx.fillRect(0, 0, anchoHd, altoTramo)
                await page.render({ canvasContext: ctx, canvas: hd, viewport, transform: [1, 0, 0, 1, 0, -y] }).promise
                const blobHd = await aBlob(hd, CALIDAD_HD)

                const movil = document.createElement('canvas')
                movil.width = ANCHO
                movil.height = altoMovil
                const cm = movil.getContext('2d')
                cm.imageSmoothingEnabled = true
                cm.imageSmoothingQuality = 'high'
                cm.drawImage(hd, 0, 0, anchoHd, altoTramo, 0, 0, ANCHO, altoMovil)
                const blob = await aBlob(movil, CALIDAD)
                vaciar(hd)
                vaciar(movil)

                const nombre = `v${CONVERSION}-${marca}-p${String(n).padStart(2, '0')}-${t}`
                tramos.push({
                    pagina: n,
                    movil: { blob, w: ANCHO, h: altoMovil, nombre: `${nombre}.${extension(blob)}` },
                    hd: { blob: blobHd, w: anchoHd, h: altoTramo, nombre: `${nombre}-hd.${extension(blobHd)}` },
                })
            }
            page.cleanup()
        }

        const links = await linksDelDoc(doc)

        // 2 · ¿Cabe en el espacio de la invitación? (páginas en los dos
        // tamaños + el original, si no estaba ya)
        const imagenes = tramos.reduce((s, x) => s + x.movil.blob.size + x.hd.blob.size, 0)
        if (!(await ensureQuota(invitationID, imagenes + (conOriginal ? 0 : file.size)))) return null

        // 3 · Subir.
        onProgreso?.({ fase: 'guardando', hecho: total, total })
        const pages = []
        // Si algo falla a medio camino, se quita lo que subió este intento.
        const subidos = []
        const subirAqui = async (nombre, body, tipo) => {
            const url = await subir(`${carpeta}/${nombre}`, body, tipo)
            subidos.push(`${carpeta}/${nombre}`)
            return url
        }
        try {
            for (const x of tramos) {
                const url = await subirAqui(x.movil.nombre, x.movil.blob, x.movil.blob.type)
                const urlHd = await subirAqui(x.hd.nombre, x.hd.blob, x.hd.blob.type)
                pages.push({ url, w: x.movil.w, h: x.movil.h, pagina: x.pagina, hd: { url: urlHd, w: x.hd.w, h: x.hd.h } })
            }
        } catch (e) {
            await quitar(subidos)
            throw e
        }
        // El original es de respaldo: si el bucket no acepta PDF, sigue sin él.
        // Si ya estaba (otro intento lo subió), se usa el que hay.
        let source = conOriginal ? existente.source : null
        if (!source) {
            try { source = await subir(`${carpeta}/original.pdf`, file, 'application/pdf') }
            catch (e) {
                const { data: hay } = await supabase.storage.from('user_images').list(carpeta, { search: 'original.pdf' })
                if (hay?.some((f) => f.name === 'original.pdf')) source = urlPublica(`${carpeta}/original.pdf`)
                else console.warn('No se guardó el PDF original:', e.message)
            }
        }
        const bytes = imagenes + file.size

        const ficha = {
            pages,
            paginas: total,
            source,
            fileName: file.name,
            links,
            version: CONVERSION,
            uploadedAt: new Date().toISOString(),
            carpeta,
            bytes,
        }
        try {
            await subir(`${carpeta}/${fichaDeVersion(CONVERSION)}`, new Blob([JSON.stringify(ficha)], { type: 'application/json' }), 'application/json')
        } catch (e) {
            // ¿Otro intento ya dejó la ficha de esta versión? Se usa esa.
            const otra = await leerFicha(carpeta, [fichaDeVersion(CONVERSION)])
            if (!otra?.pages?.length) { await quitar(subidos); throw e }
            await quitar(subidos)
            storageChanged()
            return completarLinks({ ...otra, fileName: otra.fileName || file.name })
        }
        storageChanged()
        return ficha
    } finally {
        tarea.destroy()
    }
}

/**
 * Vuelve a convertir un PDF ya subido (conversión vieja, solo 1440 px) desde
 * su `original.pdf`, en alta resolución. Regresa la ficha nueva (misma
 * carpeta) o null si no cupo; error si no hay original.
 */
export const mejorarPdf = async ({ ficha, invitationID, onProgreso }) => {
    const carpeta = carpetaDePdf(ficha)
    const source = ficha?.source || (carpeta ? urlPublica(`${carpeta}/original.pdf`) : null)
    if (!source) throw new Error('No encontramos el PDF original. Vuelve a subirlo.')
    onProgreso?.({ fase: 'leyendo', hecho: 0, total: 0 })
    const res = await fetch(source)
    if (!res.ok) throw new Error('No encontramos el PDF original. Vuelve a subirlo.')
    const file = new File([await res.blob()], ficha.fileName || 'invitacion.pdf', { type: 'application/pdf' })
    return subirPdf({ file, invitationID, onProgreso })
}
