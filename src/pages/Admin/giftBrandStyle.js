// Helpers de color y gradiente del laboratorio de marcas de regalo.
// Viven aparte de la página para poder razonarlos (y probarlos) solos: el
// parseo del gradiente es la parte delicada, porque el catálogo ya tiene
// valores que NO son un degradado lineal de dos paradas (Amazon es un color
// sólido, Banorte es radial, BBVA tiene tres paradas).

export const GRADIENTE_DEFAULT = 'linear-gradient(270deg, #6E4C87 0%, #4A3457 100%)'

// Presets pensados para marcas reales de tiendas y bancos mexicanos.
export const PRESETS = [
    { nombre: 'Uva', css: 'linear-gradient(270deg, #6E4C87 0%, #4A3457 100%)', texto: '#FFFFFF' },
    { nombre: 'Azul', css: 'linear-gradient(270deg, #1D528E 0%, #02326D 100%)', texto: '#FFFFFF' },
    { nombre: 'Verde', css: 'linear-gradient(270deg, #2F7D53 0%, #1B5637 100%)', texto: '#FFFFFF' },
    { nombre: 'Rojo', css: 'linear-gradient(270deg, #C21B1D 0%, #991010 100%)', texto: '#FFFFFF' },
    { nombre: 'Tinta', css: 'linear-gradient(270deg, #24405B 0%, #0C171B 100%)', texto: '#FFFFFF' },
    { nombre: 'Oro', css: 'linear-gradient(100deg, #E5A730 0%, #D8AA35 100%)', texto: '#252525' },
]

// ------------------------------------------------------------------ color ---

export const normalizarHex = (hex) => {
    const limpio = String(hex || '').trim()
    if (/^#[0-9a-f]{3}$/i.test(limpio)) {
        return '#' + limpio.slice(1).split('').map(c => c + c).join('').toUpperCase()
    }
    if (/^#[0-9a-f]{6}$/i.test(limpio)) return limpio.toUpperCase()
    return null
}

const aRgb = (hex) => {
    const n = normalizarHex(hex)
    if (!n) return null
    return {
        r: parseInt(n.slice(1, 3), 16),
        g: parseInt(n.slice(3, 5), 16),
        b: parseInt(n.slice(5, 7), 16),
    }
}

// Luminancia relativa WCAG 2.1
const luminancia = ({ r, g, b }) => {
    const canal = (v) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

export const razonDeContraste = (hexA, hexB) => {
    const a = aRgb(hexA)
    const b = aRgb(hexB)
    if (!a || !b) return null

    const la = luminancia(a)
    const lb = luminancia(b)
    const claro = Math.max(la, lb)
    const oscuro = Math.min(la, lb)

    return (claro + 0.05) / (oscuro + 0.05)
}

export const coloresDeCss = (css) => (String(css || '').match(/#[0-9a-fA-F]{3,8}/g) || [])

/**
 * Contraste del texto contra el fondo. Si el fondo es un degradado, evalúa
 * TODAS sus paradas y devuelve la peor: un texto puede ser legible sobre el
 * inicio del degradado e ilegible sobre el final.
 */
export const contrasteContraFondo = (colorTexto, cssFondo) => {
    const paradas = coloresDeCss(cssFondo)
    if (!paradas.length) return null

    const razones = paradas.map(p => razonDeContraste(colorTexto, p)).filter(r => r != null)
    if (!razones.length) return null

    return Math.min(...razones)
}

// AA de WCAG: 4.5 para texto normal, 3 para texto grande. La tarjeta mezcla
// ambos, así que 4.5 es "legible" y por debajo de 3 es directamente malo.
export const veredictoContraste = (razon) => {
    if (razon == null) return null
    if (razon >= 4.5) return { nivel: 'ok', etiqueta: 'legible' }
    if (razon >= 3) return { nivel: 'justo', etiqueta: 'justo para texto chico' }
    return { nivel: 'malo', etiqueta: 'ilegible' }
}

// -------------------------------------------------------------- gradiente ---

/**
 * Intenta leer un `linear-gradient` de DOS paradas hexadecimales, que es lo
 * único que los controles de ángulo/inicio/fin pueden editar sin perder
 * información.
 *
 * Devuelve null para todo lo demás (radial, tres paradas, colores no hex). En
 * ese caso la página cae a edición de CSS a mano: mover un slider sobre un
 * valor que no se puede representar lo destruiría en silencio.
 */
export const leerGradiente = (css) => {
    const valor = String(css || '').trim()

    // Color sólido
    const solido = normalizarHex(valor)
    if (solido) return { tipo: 'solido', inicio: solido, fin: solido, angulo: 270 }

    const match = valor.match(/^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,(.+)\)$/i)
    if (!match) return null

    const angulo = Math.round(parseFloat(match[1]))
    const paradas = match[2].split(',').map(p => p.trim())
    if (paradas.length !== 2) return null

    const inicio = normalizarHex(paradas[0].split(/\s+/)[0])
    const fin = normalizarHex(paradas[1].split(/\s+/)[0])
    if (!inicio || !fin) return null

    return { tipo: 'lineal', inicio, fin, angulo }
}

export const construirGradiente = ({ inicio, fin, angulo }) =>
    normalizarHex(inicio) === normalizarHex(fin)
        ? normalizarHex(inicio)
        : `linear-gradient(${angulo}deg, ${inicio} 0%, ${fin} 100%)`
