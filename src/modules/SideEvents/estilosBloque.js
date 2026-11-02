/*
    Estilo de bloques de un Pop (handoff "Estilo de bloques del Evento
    Pop"): la "piel" de todas las tarjetas de la página (confirmación,
    itinerario, mensaje, ubicación, asistentes, hojas y aviso). Se elige en el
    panel Diseño del editor y se guarda en body.blockStyle. Sin valor =
    "vidrio", lo de siempre.

    Cada estilo son variables CSS (--bloque-*, --boton-*, --avatar-borde,
    --hoja-fondo). Las hojas de estilo las leen con el valor de vidrio como
    respaldo — var(--bloque-fondo, var(--vidrio-tinte)) —, así que vidrio no
    define ninguna y lo publicado se ve igual que antes.
    Gemela: iattend-events/src/helpers/estilosBloque.ts (mismas reglas; si cambias una, cambia la otra).
*/

export const ESTILOS_BLOQUE = ['vidrio', 'hielo', 'noche', 'papel', 'tema', 'sticker', 'contorno']

export const estiloDe = (body) => (ESTILOS_BLOQUE.includes(body?.blockStyle) ? body.blockStyle : 'vidrio')

const TINTA_OSCURA = '#1F1B2E'

// Luminancia relativa (0 negro – 1 blanco) de un #RRGGBB.
export const luminancia = (hex) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? '').trim())
    if (!m) return 0
    const n = parseInt(m[1], 16)
    const canal = (c) => {
        const v = c / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255)
}

export const contraste = (a, b) => {
    const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p)
    return (x + 0.05) / (y + 0.05)
}

const pielDe = (estilo, tema) => {
    switch (estilo) {
        case 'hielo':
            return {
                fondo: 'rgba(255,255,255,0.64)', blur: 'blur(30px) saturate(160%)', borde: '1px solid rgba(255,255,255,0.85)',
                sombra: 'inset 0 1px 0 #FFFFFF, 0 12px 32px rgba(30,20,70,0.18)', radio: 32,
                tinta: TINTA_OSCURA, suave: 'rgba(31,27,46,0.06)', linea: 'rgba(31,27,46,0.12)', relieve: 'rgba(31,27,46,0.06)',
                botonFondo: TINTA_OSCURA, botonTinta: '#FFFFFF', botonBorde: 'none', avatarBorde: '4px solid #FFFFFF',
                reflejo: true, hoja: 'rgba(255,255,255,0.86)', base: '#F2F1F6',
            }
        case 'noche':
            return {
                fondo: 'rgba(16,14,30,0.62)', blur: 'blur(24px) saturate(140%)', borde: '1px solid rgba(255,255,255,0.10)',
                sombra: '0 16px 36px rgba(0,0,0,0.35)', radio: 32,
                tinta: '#FFFFFF', suave: 'rgba(255,255,255,0.08)', linea: 'rgba(255,255,255,0.14)', relieve: 'rgba(255,255,255,0.10)',
                botonFondo: '#FFFFFF', botonTinta: '#16131F', botonBorde: 'none', avatarBorde: '4px solid rgba(16,14,30,0.9)',
                reflejo: false, hoja: 'rgba(16,14,30,0.88)', base: '#1B1930',
            }
        case 'papel':
            return {
                fondo: '#FBF8F3', blur: 'none', borde: '1px solid rgba(60,40,20,0.06)',
                sombra: '0 10px 28px rgba(40,30,20,0.20)', radio: 24,
                tinta: '#2A2420', suave: '#F1ECE4', linea: '#E4DCD0', relieve: '#F1ECE4',
                botonFondo: '#2A2420', botonTinta: '#FBF8F3', botonBorde: 'none', avatarBorde: '4px solid #FBF8F3',
                reflejo: false, hoja: '#FBF8F3', base: '#FBF8F3',
            }
        case 'tema': {
            // El color del tema es el fondo: tinta clara u oscura según contraste.
            const claro = luminancia(tema) > 0.6 || (contraste(tema, '#FFFFFF') < 4.5 && contraste(tema, TINTA_OSCURA) > contraste(tema, '#FFFFFF'))
            const oscuro = `color-mix(in srgb, ${tema} 80%, #000)`
            return {
                fondo: tema, blur: 'none', borde: 'none',
                sombra: `0 14px 30px color-mix(in srgb, color-mix(in srgb, ${tema} 60%, #000) 35%, transparent)`, radio: 36,
                tinta: claro ? TINTA_OSCURA : '#FFFFFF',
                suave: claro ? 'rgba(31,27,46,0.08)' : 'rgba(255,255,255,0.16)',
                linea: claro ? 'rgba(31,27,46,0.18)' : 'rgba(255,255,255,0.26)',
                relieve: claro ? 'rgba(31,27,46,0.10)' : 'rgba(255,255,255,0.18)',
                botonFondo: claro ? TINTA_OSCURA : '#FFFFFF', botonTinta: claro ? tema : oscuro, botonBorde: 'none',
                avatarBorde: `4px solid ${tema}`,
                reflejo: false, hoja: tema, base: tema,
            }
        }
        case 'sticker':
            return {
                fondo: '#FFFFFF', blur: 'none', borde: '2px solid #1F1B2E',
                sombra: '5px 5px 0 #1F1B2E', radio: 22,
                tinta: TINTA_OSCURA, suave: '#F1EDFA', linea: 'rgba(31,27,46,0.22)', relieve: '#FFD25E',
                botonFondo: '#FFD25E', botonTinta: TINTA_OSCURA, botonBorde: '2px solid #1F1B2E', avatarBorde: '3px solid #1F1B2E',
                reflejo: false, hoja: '#FFFFFF', base: '#FFFFFF',
            }
        case 'contorno':
            return {
                fondo: 'rgba(20,16,44,0.16)', blur: 'blur(6px)', borde: '1.5px solid rgba(255,255,255,0.85)',
                sombra: 'none', radio: 28,
                tinta: '#FFFFFF', suave: 'rgba(255,255,255,0.12)', linea: 'rgba(255,255,255,0.5)', relieve: 'transparent',
                botonFondo: '#FFFFFF', botonTinta: TINTA_OSCURA, botonBorde: 'none', avatarBorde: '2px solid #FFFFFF',
                reflejo: false, hoja: 'rgba(20,16,44,0.72)', base: '#3A3550',
            }
        default:
            return null
    }
}

// Variables CSS del estilo, para el contenedor de las tarjetas y para lo que
// se abre fuera de él (hojas, aviso). Vidrio: ninguna (rige el respaldo).
export const variablesDeEstilo = (estilo, colorTema) => {
    const p = pielDe(estilo, colorTema || '#6E5BD0')
    if (!p) return {}
    return {
        '--bloque-fondo': p.fondo,
        '--bloque-blur': p.blur,
        '--bloque-borde': p.borde,
        '--bloque-sombra': p.sombra,
        '--bloque-radio': `${p.radio}px`,
        '--bloque-tinta': p.tinta,
        '--bloque-suave': p.suave,
        '--bloque-linea': p.linea,
        '--bloque-relieve': p.relieve,
        '--bloque-reflejo': p.reflejo ? 'linear-gradient(160deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 40%)' : 'none',
        '--boton-fondo': p.botonFondo,
        '--boton-tinta': p.botonTinta,
        '--boton-borde': p.botonBorde,
        '--avatar-borde': p.avatarBorde,
        '--hoja-fondo': p.hoja,
        // Sin los brillos internos del vidrio (cantos de luz de chips y orbes).
        '--bloque-brillo': 'none',
        '--bloque-linea-tiempo': p.linea,
        '--bloque-base': p.base,
        '--bloque-suave-fila': 'transparent',
        // Hoja del chat: anillo de los avatares y chips de reacciones del color de la hoja.
        '--chat-anillo': p.hoja,
        '--chat-chip': p.hoja,
        // El chat ocupa casi toda la pantalla: sólido para que la página no se lea detrás.
        '--chat-fondo': p.base,
        '--boton-sombra-texto': 'none',
        // Texto sobre la foto (etiquetas de grupo): sombra para que se lea.
        '--etiqueta-sombra': '0 0 12px rgba(0,0,0,0.35)',
    }
}

// Color del texto de Notas: el que eligió el organizador si se lee sobre el
// estilo; si no (o no eligió), la tinta del estilo. Vidrio: lo de siempre.
export const tintaDeNotas = (estilo, colorTema, elegido) => {
    const p = pielDe(estilo, colorTema || '#6E5BD0')
    if (!p) return null
    if (elegido && /^#[0-9a-f]{6}$/i.test(elegido) && contraste(elegido, p.base) >= 3) return elegido
    return p.tinta
}

// Miniatura del panel Diseño: la "tarjetita" del estilo sobre la foto.
export const MINI_ESTILO = {
    vidrio: { background: 'rgba(150,160,235,0.45)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)', borderRadius: 10 },
    hielo: { background: 'rgba(255,255,255,0.7)', border: '1px solid #FFFFFF', borderRadius: 10 },
    noche: { background: 'rgba(16,14,30,0.7)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 },
    papel: { background: '#FBF8F3', boxShadow: '0 3px 8px rgba(40,30,20,0.25)', borderRadius: 7 },
    tema: { boxShadow: '0 3px 8px rgba(60,40,140,0.35)', borderRadius: 12 },
    sticker: { background: '#FFFFFF', border: '2px solid #1F1B2E', boxShadow: '3px 3px 0 #1F1B2E', borderRadius: 7 },
    contorno: { background: 'rgba(20,16,44,0.16)', border: '1.5px solid #FFFFFF', borderRadius: 9 },
}
