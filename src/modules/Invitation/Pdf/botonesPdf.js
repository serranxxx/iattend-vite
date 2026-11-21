/*
  Botones con link sobre una invitación en PDF (herramienta "Botones" del
  riel, solo en modo PDF). Son elementos sueltos más de `decorations.pdf`
  (como los stickers), con `kind: 'boton'`:
    { kind: 'boton', text, url, bg, color, stroke, strokeWidth, variant, w, rot, opacity }
  `bg` fondo · `color` texto · `stroke` / `strokeWidth` borde · `variant` el
  estilo. Cada botón lleva lo suyo. El estilo `transparente` es una zona
  invisible con link, sin texto (para tocar algo que ya viene dibujado en el
  PDF): su alto es libre (`ar` = alto / ancho, como las formas), en el editor
  se ve punteada y el invitado no la ve. Los links que ya trae el PDF llegan
  así al subirlo (`zonasDeLinks`). La pieza y la página del invitado los
  pinta iattend-events (SectionLayer.tsx); el invitado los toca y abre su link.
  Gemela: iattend-events/src/helpers/botonesPdf.ts.
*/

export const ESTILOS_BOTON = ['pildora', 'redondeado', 'recto', 'relieve', 'vidrio', 'transparente']

export const esTransparente = (it) => it?.kind === 'boton' && it?.variant === 'transparente'

// Alto / ancho de una zona transparente nueva (o sin `ar`).
export const AR_TRANSPARENTE = 0.35

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
    if (estilo === 'transparente') {
        return { kind: 'boton', text: '', url: '', variant: 'transparente', bg, color: tintaPara(bg), stroke: null, strokeWidth: 0, w: 40, ar: AR_TRANSPARENTE, rot: 0, opacity: 1 }
    }
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
    if (estilo === 'transparente') {
        return { background: 'rgba(139, 120, 230, 0.12)', color: '#8B78E6', border: '1.5px dashed rgba(139, 120, 230, 0.9)', borderRadius: 4 }
    }
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

// Zonas transparentes para los links que ya trae el PDF (`ficha.links`, en
// fracciones de su página) en coordenadas de `decorations.pdf`: % de la caja
// de todas las páginas apiladas, cada una a todo el ancho (alto ∝ h / w de
// sus tramos). Llevan `origen: 'pdf'` para quitarlas al cambiar de PDF.
// Se salta los links que ya tienen un botón (`existentes`) con el mismo link
// o con su centro dentro de la zona: así no se duplican los que se pusieron a mano.
export const zonasDeLinks = (ficha, invitation, existentes = []) => {
    const links = ficha?.links ?? []
    const tramos = ficha?.pages ?? []
    if (!links.length || !tramos.length) return []
    const altoPagina = {}
    for (const p of tramos) altoPagina[p.pagina] = (altoPagina[p.pagina] ?? 0) + p.h / p.w
    const paginas = Object.keys(altoPagina).map(Number).sort((a, b) => a - b)
    const total = paginas.reduce((s, n) => s + altoPagina[n], 0)
    const inicio = {}
    let acum = 0
    for (const n of paginas) { inicio[n] = acum; acum += altoPagina[n] }
    const base = botonNuevo(invitation, { estilo: 'transparente' })
    const sello = Date.now().toString(36)
    const botones = existentes.filter(esBoton)
    const linksPuestos = new Set(botones.map((it) => linkDeBoton(it.url)).filter(Boolean))
    return links
        .filter((z) => altoPagina[z.pagina] && linkDeBoton(z.url))
        .map((z, i) => {
            const ph = altoPagina[z.pagina]
            return {
                ...base,
                id: `l${sello}pdf${i}`,
                url: z.url,
                origen: 'pdf',
                x: (z.x + z.w / 2) * 100,
                y: ((inicio[z.pagina] + (z.y + z.h / 2) * ph) / total) * 100,
                w: z.w * 100,
                ar: (z.h * ph) / z.w,
                // Alto en % de la caja (solo para revisar si ya hay un botón ahí).
                _alto: ((z.h * ph) / total) * 100,
            }
        })
        .filter((zona) => !linksPuestos.has(linkDeBoton(zona.url)) && !botones.some((it) => (
            Math.abs(it.x - zona.x) <= zona.w / 2 + 0.5 && Math.abs(it.y - zona.y) <= zona._alto / 2 + 0.5
        )))
        .map(({ _alto, ...zona }) => zona) // eslint-disable-line no-unused-vars
}
