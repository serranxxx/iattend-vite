/*
  Texto suelto de un Pop / side event (`body.stickers[n]`, `kind: 'text'`).
  Antes la letra salía del ancho de la caja (`w` × factor): estirarla la
  agrandaba. Ahora puede llevar su propio tamaño (`size`, px de la pieza de
  390 de ancho), así la caja se estira a lo ancho sin cambiar la letra
  (agarraderas de los lados) y la barra de texto del título le cambia todo:
    size, font, weight, line_height, color, italic, underline, strike,
    transform, letterSpacing (centésimas de em), align.
  Sin `size` (los de antes) se sigue calculando con el ancho, igual que
  siempre. Gemela: iattend-events/src/helpers/textoElemento.ts.
*/

export const ANCHO_PIEZA = 390

// Tamaño de letra = ancho del texto × factor (en % del ancho de la pieza).
export const TEXT_FACTOR = { title: 0.16, subtitle: 0.1, body: 0.06 }
const PESO = { title: 600, subtitle: 500, body: 400 }

// Tamaño de letra en px de la pieza (el propio, o el que daba su ancho).
export const tamTexto = (s) => {
    if (typeof s?.size === 'number' && s.size > 0) return s.size
    const variant = s?.variant ?? 'body'
    return Math.round(((s?.w ?? 40) * (TEXT_FACTOR[variant] ?? 0.06) * ANCHO_PIEZA) / 100 * 10) / 10
}

export const pesoTexto = (s) => s?.weight ?? PESO[s?.variant ?? 'body'] ?? 400

// Estilo del texto (lo pintan la pieza y la página del invitado).
export const estiloTexto = (s, { titleFont, bodyFont = 'Poppins', color } = {}) => {
    const variant = s?.variant ?? 'body'
    const deco = [s?.underline && 'underline', s?.strike && 'line-through'].filter(Boolean).join(' ')
    return {
        color,
        fontFamily: s?.font || (variant === 'title' ? titleFont : bodyFont),
        fontWeight: pesoTexto(s),
        fontSize: `${(tamTexto(s) / ANCHO_PIEZA) * 100}cqw`,
        ...(s?.line_height ? { lineHeight: s.line_height } : {}),
        ...(s?.align ? { textAlign: s.align } : {}),
        ...(s?.italic ? { fontStyle: 'italic' } : {}),
        ...(deco ? { textDecoration: deco } : {}),
        ...(s?.transform && s.transform !== 'none' ? { textTransform: s.transform } : {}),
        ...(typeof s?.letterSpacing === 'number' ? { letterSpacing: `${s.letterSpacing / 100}em` } : {}),
    }
}

// Al escalar la caja (esquinas o slider de tamaño), la letra crece con ella.
export const escalarTexto = (s, factor) => (typeof s?.size === 'number' ? { size: Math.round(s.size * factor * 10) / 10 } : {})

// Antes de estirar la caja: si la letra salía del ancho, se fija la actual.
export const fijarTamTexto = (s) => (typeof s?.size === 'number' ? {} : { size: tamTexto(s) })
