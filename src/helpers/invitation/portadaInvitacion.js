import { esVideo } from '../../modules/SideEvents/fotosPortada'

// Portada de la invitación (cover.image.prod: una URL o una lista de fotos y
// videos) para una miniatura: la primera foto y, si solo hay videos, el primero.
const listaDe = (src) => {
    if (typeof src === 'string') return src.trim() ? [src.trim()] : []
    return Array.isArray(src) ? src.filter((s) => typeof s === 'string' && s.trim()) : []
}

/** { foto, video } de la portada: la foto manda; el video solo si no hay foto. */
export const portadaDeInvitacion = (src) => {
    const lista = listaDe(src)
    const foto = lista.find((s) => !esVideo(s)) ?? null
    const video = foto ? null : lista.find(esVideo) ?? null
    return { foto, video }
}

/**
 * Fuente de la portada (mismo formato que `cover.image.prod`) para lo que la
 * enseña fuera de la invitación: dashboard, lista de invitaciones, pase de
 * Wallet, imagen del link. En una invitación en PDF (`data.formato === 'pdf'`)
 * es su primera página. Gemela: `fuenteDePortada` en
 * iattend-events/src/helpers/pdfInvitacion.ts (y el pase en el backend).
 */
export const fuenteDePortada = (data) => {
    if (data?.formato === 'pdf') {
        const primera = data?.pdf?.pages?.[0]?.url
        if (primera) return primera
    }
    return data?.cover?.image?.prod
}
