import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { esVideo } from '../../SideEvents/fotosPortada'

/*
  Primer cuadro de un video como imagen (JPG), para lo que no puede llevar
  video: el encabezado de imagen de los recordatorios de WhatsApp cuando la
  portada (o la imagen del link) es un video. Meta solo acepta una imagen.

  Se sube una sola vez a `user_images/<carpeta>/link/primer-cuadro-<huella>.jpg`
  (la huella sale de la URL del video, así un video = un archivo) y las
  siguientes veces se reusa. `carpeta` = el id de la invitación o
  `flash-<id>` en un Pop. Nunca se sobrescribe: user_images no tiene política
  de UPDATE.
*/

const ANCHO_MAX = 1080

const huella = async (texto) => {
    const bytes = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(texto))
    return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

// El primer cuadro (unas centésimas adentro: en el 0 exacto algunos
// navegadores todavía no pintan nada).
const cargarPrimerCuadro = (url) => new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onloadedmetadata = () => { video.currentTime = Math.min(0.05, (video.duration || 1) / 2) }
    video.onseeked = () => resolve(video)
    video.onerror = () => reject(new Error(`No cargó ${url}`))
    video.src = url
})

const aJpg = (video) => new Promise((resolve, reject) => {
    const escala = Math.min(1, ANCHO_MAX / (video.videoWidth || ANCHO_MAX))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round((video.videoWidth || ANCHO_MAX) * escala)
    canvas.height = Math.round((video.videoHeight || ANCHO_MAX) * escala)
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo exportar el cuadro'))), 'image/jpeg', 0.9)
})

const pendientes = new Map()

/** URL pública (https) del primer cuadro del video. Lanza si no se pudo. */
export const primerCuadroDe = (videoUrl, carpeta) => {
    const llave = `${carpeta}|${videoUrl}`
    if (!pendientes.has(llave)) {
        pendientes.set(llave, (async () => {
            const path = `${carpeta}/link/primer-cuadro-${await huella(videoUrl)}.jpg`
            const { data: { publicUrl } } = supabase.storage.from('user_images').getPublicUrl(path)
            const ya = await fetch(publicUrl, { method: 'HEAD' }).then((r) => r.ok).catch(() => false)
            if (ya) return publicUrl
            const blob = await aJpg(await cargarPrimerCuadro(videoUrl))
            const { error } = await supabase.storage.from('user_images').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
            // Si otra pestaña lo subió primero, también sirve.
            if (error && !/exists|duplicate/i.test(error.message ?? '')) throw error
            return publicUrl
        })().catch((e) => { pendientes.delete(llave); throw e }))
    }
    return pendientes.get(llave)
}

/**
 * Imagen para el encabezado de WhatsApp: la del link (`urlImage`) o, sin
 * ella, la primera de la portada (`prod`: URL o lista). Si es un video,
 * devuelve su primer cuadro ya subido (null mientras se prepara o si falló).
 */
export const useImagenEncabezado = (urlImage, prod, carpeta) => {
    const fuente = urlImage || (Array.isArray(prod) ? prod.find(Boolean) : prod) || null
    const conVideo = typeof fuente === 'string' && esVideo(fuente)
    const [cuadro, setCuadro] = useState(null)
    useEffect(() => {
        setCuadro(null)
        if (!conVideo || !carpeta) return undefined
        let alive = true
        primerCuadroDe(fuente, carpeta)
            .then((url) => { if (alive) setCuadro(url) })
            .catch((e) => console.error('No se pudo sacar el primer cuadro del video:', e))
        return () => { alive = false }
    }, [fuente, conVideo, carpeta])
    return conVideo ? cuadro : fuente
}
