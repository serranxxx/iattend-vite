import { mediaDePortada, esVideo } from '../fotosPortada'
import { estiloDe } from '../estilosBloque'

// Textos de las funciones Plus que usa un Pop Free (planPops.js), para el
// editor (PruebaPlus.jsx): `corto` en los chips de la barra y las notas a
// mano, `largo` en el modal de Compartir.
/** [{ clave, corto, largo }] de las funciones Plus en uso. */
export const etiquetasPlus = (t, claves = [], body = {}) => claves.map((clave) => {
    const media = mediaDePortada(body)
    const conVideo = media.some(esVideo) || Boolean(body?.video)
    const vars = {
        count: media.length,
        estilo: t(`side_events.block_style_${estiloDe(body)}`),
    }
    const k = clave === 'portada' && conVideo && media.length <= 1 ? 'portadaVideo' : clave
    return {
        clave,
        corto: t(`pops_plus_app.editor.chip.${k}`, vars),
        largo: t(`pops_plus_app.editor.item.${k}`, vars),
        miniatura: clave === 'portada' ? media.find((m) => !esVideo(m)) ?? null : null,
        color: body?.color,
    }
})

