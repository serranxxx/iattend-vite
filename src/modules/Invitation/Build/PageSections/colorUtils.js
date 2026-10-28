// Utilidades del selector de color de las barras (ColorChooser).

// Colores sólidos: grises y 18 tonos del oscuro al claro (7 por fila).
export const SOLIDS = [
    '#000000', '#545454', '#737373', '#A6A6A6', '#D9D9D9', '#F2F2F2', '#FFFFFF',
    '#000C36', '#04167A', '#0726C4', '#2747F5', '#5973F5', '#9AAAF8', '#C5CEFC',
    '#050B3D', '#250A63', '#4214AE', '#5A1EE3', '#8656F6', '#B9A2F0', '#D7CCF6',
    '#1B0A2E', '#3A1460', '#6022A3', '#8A46D6', '#A87BDF', '#C8A6E8', '#DFCDF2',
    '#290B33', '#4E1863', '#8225A6', '#B14AD8', '#C474DF', '#D9A6EA', '#E9CDF3',
    '#3A0627', '#6E1449', '#BB2675', '#E840A0', '#EE73BE', '#F29FD2', '#F6C4E5',
    '#2E0D0B', '#5C1B17', '#E8433A', '#E8524A', '#EC625C', '#F2B1AF', '#F7D8D6',
    '#3A0402', '#6E1610', '#B5281E', '#E5483D', '#EA6862', '#F09E97', '#F6C6C3',
    '#3A1B05', '#733514', '#BB5726', '#EC7E3B', '#F09A5E', '#F4C29E', '#F8DCC6',
    '#3A2706', '#744C18', '#C07E2C', '#EFAB44', '#F3C26D', '#F6D79C', '#F9E9C8',
    '#3C320B', '#7A641E', '#C4A43A', '#F6D452', '#F8DF72', '#FBEAA0', '#FDF4CC',
    '#283A0B', '#52771F', '#89C33E', '#B5F755', '#CFFA84', '#E1FCA9', '#EEFDD3',
    '#1D2F10', '#3C5E22', '#62A03D', '#91D467', '#ACE08B', '#C9EAB4', '#E1F3D8',
    '#183D22', '#367648', '#56B86B', '#77F799', '#8DFAB3', '#B0FAD1', '#D3FCE7',
    '#163626', '#326B54', '#58B68A', '#72E4B2', '#92F0C9', '#B6F4DE', '#D3F8EC',
    '#163338', '#31656A', '#51A7AF', '#6CD6DF', '#85DEE7', '#B4EAF0', '#D4F3F6',
    '#12313D', '#2C6578', '#4393AE', '#59BADA', '#8AE4FA', '#AEECFA', '#CFF4FC',
    '#0C2238', '#234E78', '#3880C4', '#60B1F8', '#8BC8FA', '#A9D6FA', '#CAE6FB',
    '#081838', '#163672', '#1F4EA4', '#4580F5', '#6FA4F7', '#A2C2F9', '#C9DAFB',
]

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i
export const normalizeHex = (v) => {
    const m = (v ?? '').trim().match(HEX)
    if (!m) return null
    const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]
    return `#${h.toUpperCase()}`
}

export const hexToHsv = (hex) => {
    const n = normalizeHex(hex) ?? '#000000'
    const r = parseInt(n.slice(1, 3), 16) / 255
    const g = parseInt(n.slice(3, 5), 16) / 255
    const b = parseInt(n.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b)
    const d = max - Math.min(r, g, b)
    let h = 0
    if (d) {
        if (max === r) h = ((g - b) / d) % 6
        else if (max === g) h = (b - r) / d + 2
        else h = (r - g) / d + 4
        h *= 60
        if (h < 0) h += 360
    }
    return { h, s: max ? d / max : 0, v: max }
}

export const hsvToHex = ({ h, s, v }) => {
    const f = (n) => {
        const k = (n + h / 60) % 6
        return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255)
    }
    return `#${[f(5), f(3), f(1)].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

// "Usados recientemente": los últimos 5, en el navegador.
const RECENT_KEY = 'iattend_recent_colors'
export const readRecent = () => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}
export const pushRecent = (hex) => {
    const c = normalizeHex(hex)
    if (!c) return
    localStorage.setItem(RECENT_KEY, JSON.stringify([c, ...readRecent().filter((x) => x !== c)].slice(0, 5)))
}

// Paleta de la invitación para "De tu paleta" (los 4 roles y el color de títulos).
export const invitationPalette = (invitation) => {
    const g = invitation?.generals ?? {}
    return [...new Set([g.colors?.primary, g.colors?.secondary, g.colors?.accent, g.colors?.actions, g.fonts?.titles?.color].filter(Boolean).map((c) => c.toUpperCase()))]
}

// Nombre aproximado de un color, para la paleta del Dress code cuando no tiene
// uno escrito (la pieza nunca muestra el código). Espejo de guessColorName en
// iattend-events (Dresscode/DresscodeStyles.tsx): si cambia uno, cambia el otro.
export const guessColorName = (hex) => {
    const m = /^#?([0-9a-f]{6})/i.exec(hex ?? '')
    if (!m) return ''
    const n = parseInt(m[1], 16)
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
    const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
    let h = 0
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h = (h * 60 + 360) % 360
    if (l < 0.19) return 'Negro'
    if (l > 0.975) return 'Blanco'
    if (sat < 0.14) return l > 0.85 ? 'Marfil' : l > 0.6 ? 'Gris perla' : l > 0.35 ? 'Gris' : 'Gris oxford'
    if (h >= 20 && h < 55 && sat < 0.5) return l > 0.82 ? 'Marfil' : l > 0.55 ? 'Arena' : l > 0.35 ? 'Camel' : 'Café'
    if (h < 12 || h >= 345) return l > 0.75 ? 'Rosa' : l < 0.32 ? 'Vino' : 'Rojo'
    if (h < 40) return l < 0.4 ? 'Café' : l > 0.75 ? 'Durazno' : 'Terracota'
    if (h < 65) return l < 0.45 ? 'Mostaza' : l > 0.8 ? 'Crema' : 'Amarillo'
    if (h < 165) return sat < 0.35 ? (l > 0.55 ? 'Salvia' : 'Oliva') : l < 0.3 ? 'Verde bosque' : l > 0.75 ? 'Verde menta' : 'Verde'
    if (h < 200) return l > 0.75 ? 'Aqua' : 'Turquesa'
    if (h < 250) return l < 0.3 ? 'Azul marino' : l > 0.72 ? 'Azul cielo' : 'Azul'
    if (h < 290) return l > 0.72 ? 'Lila' : 'Morado'
    return l < 0.32 ? 'Vino' : l > 0.75 ? 'Rosa palo' : 'Rosa'
}
