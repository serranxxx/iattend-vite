import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

/*
  Desglose del espacio de la cuenta en Fotos · Videos · Stickers (dropdown del
  plan, handoff "Pops+ en la App" 1). La base solo da el total por Pop
  (`pop_storage_usage`); aquí se listan en el navegador los archivos de cada
  carpeta `flash-<id>` de `user_images` (recorriendo sus subcarpetas, sin
  `audio/`, igual que la RPC) y se suman por tipo:
    · Videos: carpeta `video/` o mimetype de video.
    · Stickers: los que sube subirSticker / subirVector / los logos de
      patrocinadores (`…-sticker.*`, `.svg`, PNG, carpeta `sponsors/`).
    · Fotos: lo demás. Lo que la RPC cuenta y no está en `user_images`
      (material privado de un Pop en línea, bucket `pop-material`) va a Fotos
      para que las tres partes sumen el total.
  Solo corre con `activo` (al abrir el dropdown) y una vez por lista de Pops.
*/

const BUCKET = 'user_images'
const LIMITE = 1000

const tipoDe = (ruta, meta = {}) => {
    const mime = String(meta.mimetype ?? '')
    const nombre = ruta.toLowerCase()
    if (/(^|\/)video\//.test(nombre) || mime.startsWith('video/')) return 'videos'
    if (/(^|\/)sponsors\//.test(nombre) || /-sticker\.|\.svg$|\.png$/.test(nombre) || mime === 'image/png' || mime === 'image/svg+xml') return 'stickers'
    return 'fotos'
}

const listarCarpeta = async (ruta, suma, profundidad = 0) => {
    if (profundidad > 3) return
    const { data, error } = await supabase.storage.from(BUCKET).list(ruta, { limit: LIMITE })
    if (error || !data) return
    await Promise.all(data.map(async (o) => {
        const completa = `${ruta}/${o.name}`
        // Las carpetas no traen id ni metadata.
        if (!o.id) {
            if (o.name === 'audio') return
            await listarCarpeta(completa, suma, profundidad + 1)
            return
        }
        suma[tipoDe(completa, o.metadata)] += Number(o.metadata?.size) || 0
    }))
}

const cache = new Map()

/** { fotos, videos, stickers } en bytes (o null mientras calcula). */
export const useDesgloseEspacio = (ids = [], total = 0, activo = false) => {
    const clave = ids.join(',')
    const [desglose, setDesglose] = useState(() => cache.get(clave) ?? null)

    useEffect(() => {
        if (!activo) return undefined
        if (!ids.length) { setDesglose({ fotos: 0, videos: 0, stickers: 0 }); return undefined }
        if (cache.has(clave)) { setDesglose(cache.get(clave)); return undefined }
        let vivo = true
        const suma = { fotos: 0, videos: 0, stickers: 0 }
        Promise.all(ids.map(id => listarCarpeta(`flash-${id}`, suma)))
            .then(() => {
                cache.set(clave, suma)
                if (vivo) setDesglose({ ...suma })
            })
            .catch(() => { if (vivo) setDesglose(null) })
        return () => { vivo = false }
    }, [clave, activo])

    if (!desglose) return null
    // Que las tres partes sumen el total de la RPC (lo que no se ve en el listado, a Fotos).
    const visto = desglose.fotos + desglose.videos + desglose.stickers
    return { ...desglose, fotos: desglose.fotos + Math.max(0, total - visto) }
}
