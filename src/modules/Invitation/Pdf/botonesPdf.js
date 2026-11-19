/*
  Botones con link sobre una invitación en PDF (herramienta "Botones" del
  riel, solo en modo PDF). Son elementos sueltos más de `decorations.pdf`
  (como los stickers), con `kind: 'boton'`:
    { kind: 'boton', text, url, bg, color, stroke, strokeWidth, variant, w, rot, opacity }
  `bg` fondo · `color` texto · `stroke` / `strokeWidth` borde · `variant` el
  estilo. Cada botón lleva lo suyo. La pieza y la página del invitado los
  pinta iattend-events (SectionLayer.tsx); el invitado los toca y abre su link.
  Gemela: iattend-events/src/helpers/botonesPdf.ts.
*/

export const ESTILOS_BOTON = ['pildora', 'redondeado', 'recto', 'relieve', 'vidrio']

export const estiloBoton = (it) => (ESTILOS_BOTON.includes(it?.variant) ? it.variant : 'pildora')

// Grosores del borde (px).
export const GROSORES_BORDE = [0, 1, 2, 3, 4]

// Tamaño de letra = ancho del botón × factor (en % del ancho del PDF), igual
// que en events, para que la muestra del panel se vea proporcionada.
export const LETRA_BOTON = 0.085

// Link que se puede abrir: sin esquema se le pone https://. Correo y
// teléfono se reconocen solos. Vacío o raro = sin link.
export const linkDeBoton = (url) => {
    const u = (url ?? '').trim()
    if (!u) return null
    if (/^(https?:|mailto:|tel:|sms:)/i.test(u)) return u
    if (/^[\w.-]+@[\w.-]+\.\w+$/.test(u)) return `mailto:${u}`
    if (/^\+?[\d\s()-]{7,}$/.test(u)) return `tel:${u.replace(/[^\d+]/g, '')}`
    if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(u)) return `https://${u}`
    return null
}

// Texto claro u oscuro según el fondo.
const luminancia = (hex) => {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex ?? '')
    if (!m) return null
    const full = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const tintaPara = (fondo) => ((luminancia(fondo) ?? 0) > 0.45 ? '#1B1B1F' : '#FFFFFF')

// Botón nuevo con los colores de la invitación (el de los botones de
// confirmar, `generals.colors.actions`).
export const botonNuevo = (invitation, { estilo = 'pildora', text = 'Ver más' } = {}) => {
    const c = invitation?.generals?.colors ?? {}
    const bg = c.actions || c.accent || '#1B1B1F'
    return {
        kind: 'boton',
        text,
        url: '',
        variant: estilo,
        bg,
        color: tintaPara(bg),
        stroke: null,
        strokeWidth: 0,
        w: 46,
        rot: 0,
        opacity: 1,
    }
}

// Estilo de la muestra (panel, Capas): las mismas reglas que la pieza.
export const estiloMuestra = (it) => {
    const estilo = estiloBoton(it)
    const bg = it.bg || '#1B1B1F'
    const radio = { pildora: 999, redondeado: '0.7em', recto: 0, relieve: '0.7em', vidrio: 999 }[estilo]
    return {
        background: estilo === 'vidrio' ? `color-mix(in srgb, ${bg} 38%, transparent)` : bg,
        color: it.color || '#FFFFFF',
        border: (it.strokeWidth ?? 0) > 0 ? `${it.strokeWidth}px solid ${it.stroke || 'transparent'}` : 'none',
        borderRadius: radio,
        boxShadow: estilo === 'relieve' ? `0 0.28em 0 color-mix(in srgb, ${bg} 68%, #000)` : undefined,
    }
}

export const esBoton = (it) => it?.kind === 'boton'
