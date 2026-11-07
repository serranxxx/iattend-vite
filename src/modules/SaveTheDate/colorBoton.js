// Color del botón del Save the Date: rgba ⇄ hex + opacidad (0–100), para
// abrirlo en ColoresIOS con su deslizador de opacidad (StdBarras / SaveTheDatePage).

const hex2 = (n) => Math.round(n).toString(16).padStart(2, '0')

export const colorAHexOpacidad = (color) => {
    const m = String(color ?? '').match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?/i)
    if (m) return { hex: `#${hex2(m[1])}${hex2(m[2])}${hex2(m[3])}`.toUpperCase(), opacidad: Math.round((m[4] === undefined ? 1 : Number(m[4])) * 100) }
    if (/^#[0-9a-f]{6}$/i.test(color ?? '')) return { hex: color.toUpperCase(), opacidad: 100 }
    return { hex: '#FFFFFF', opacidad: 100 }
}

export const hexOpacidadAColor = (hex, opacidad) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.round(opacidad) / 100})`
}

