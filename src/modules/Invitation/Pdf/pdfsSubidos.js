/*
  PDFs subidos de una invitación (panel "Mi PDF"): cada uno es una carpeta
  `user_images/<invitationId>/pdf/<huella>/` con sus páginas, el original y
  `pdf.json` (la ficha: lo mismo que va en `data.pdf`). Listarlos, leer su
  ficha y borrarlos. Las carpetas viejas sin ficha (antes de la huella) se
  arman con sus archivos.
*/

import { supabase } from '../../../lib/supabase'
import { storageChanged } from '../../../helpers/services/storageQuota'

// Fichas por versión de la conversión (`pdf-v2.json` = HD + celular; la
// `pdf.json` es la de la conversión 1). Nunca se sobrescribe un archivo:
// Storage no deja reemplazar uno que subió otra cuenta (dueño y planner
// trabajan la misma invitación) → "new row violates row-level security policy".
export const FICHA = 'pdf.json'
export const fichaDeVersion = (version) => (version > 1 ? `pdf-v${version}.json` : FICHA)
const FICHAS = ['pdf-v2.json', FICHA]
const BUCKET = 'user_images'

export const urlPublica = (path) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

// Carpeta de la ficha que está en `data.pdf` (las nuevas la traen; las
// viejas se sacan de la URL de su primera página).
export const carpetaDePdf = (pdf) => {
    if (pdf?.carpeta) return pdf.carpeta
    const url = pdf?.pages?.[0]?.url
    const m = url ? /\/object\/public\/user_images\/(.+)\/[^/]+$/.exec(url) : null
    return m ? decodeURIComponent(m[1]) : null
}

// La ficha más nueva de la carpeta (si hay de varias conversiones).
export const leerFicha = async (carpeta, nombres = FICHAS) => {
    for (const nombre of nombres) {
        // download (API) y no la URL pública: la del CDN podría tener un 404 viejo.
        const { data, error } = await supabase.storage.from(BUCKET).download(`${carpeta}/${nombre}`)
        if (error || !data) continue
        try { return JSON.parse(await data.text()) } catch { /* sigue con la otra */ }
    }
    return null
}

const medidas = (url) => new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 1440, h: 2036 })
    img.src = url
})

const ES_PAGINA = /^p(\d+)-(\d+)\.(webp|jpe?g)$/i

// Ficha de una carpeta vieja (sin pdf.json), con sus archivos.
const fichaDeArchivos = async (carpeta, archivos) => {
    const paginas = archivos
        .map((f) => ({ f, m: ES_PAGINA.exec(f.name) }))
        .filter((x) => x.m)
        .sort((a, b) => Number(a.m[1]) - Number(b.m[1]) || Number(a.m[2]) - Number(b.m[2]))
    if (!paginas.length) return null
    const pages = await Promise.all(paginas.map(async ({ f, m }) => {
        const url = urlPublica(`${carpeta}/${f.name}`)
        return { url, ...(await medidas(url)), pagina: Number(m[1]) }
    }))
    const original = archivos.find((f) => f.name === 'original.pdf')
    return {
        pages,
        paginas: Number(paginas[paginas.length - 1].m[1]),
        source: original ? urlPublica(`${carpeta}/original.pdf`) : null,
        fileName: null,
        uploadedAt: archivos[0]?.created_at ?? null,
        carpeta,
    }
}

/** [{ carpeta, ficha, bytes }] del más nuevo al más viejo. */
export const listarPdfs = async (invitationID) => {
    const raiz = `${invitationID}/pdf`
    const { data, error } = await supabase.storage.from(BUCKET).list(raiz, { limit: 100 })
    if (error || !data) return []
    const carpetas = data.filter((x) => x.id === null).map((x) => `${raiz}/${x.name}`)
    const lista = await Promise.all(carpetas.map(async (carpeta) => {
        const { data: archivos } = await supabase.storage.from(BUCKET).list(carpeta, { limit: 200 })
        if (!archivos?.length) return null
        const bytes = archivos.reduce((s, f) => s + (f.metadata?.size ?? 0), 0)
        const fichas = FICHAS.filter((n) => archivos.some((f) => f.name === n))
        const ficha = (fichas.length && (await leerFicha(carpeta, fichas))) || (await fichaDeArchivos(carpeta, archivos))
        if (!ficha?.pages?.length) return null
        return { carpeta, ficha: { ...ficha, carpeta }, bytes }
    }))
    return lista.filter(Boolean).sort((a, b) => String(b.ficha.uploadedAt ?? '').localeCompare(String(a.ficha.uploadedAt ?? '')))
}

/** ¿Lo usa la invitación publicada? (lo que ven los invitados) */
export const enUsoPublicado = async (invitationID, carpeta) => {
    const { data } = await supabase.from('invitations').select('data').eq('id', invitationID).maybeSingle()
    const pdf = data?.data?.formato === 'pdf' ? data.data.pdf : null
    return Boolean(pdf) && carpetaDePdf(pdf) === carpeta
}

export const borrarPdf = async (carpeta) => {
    const { data: archivos, error } = await supabase.storage.from(BUCKET).list(carpeta, { limit: 200 })
    if (error) throw error
    const paths = (archivos ?? []).map((f) => `${carpeta}/${f.name}`)
    if (paths.length) {
        const { error: errBorrar } = await supabase.storage.from(BUCKET).remove(paths)
        if (errBorrar) throw errBorrar
    }
    storageChanged()
}
