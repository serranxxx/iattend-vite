// Efectos animados de un Pop: catálogo compartido por el panel (SideEvents)
// y la capa (EfectosCapa). Ver EfectosCapa.jsx.

// 'imagenes' = los PNG / stickers del organizador como partículas
// (`effect.images`, `effect.motion`, `effect.size`).
export const TIPOS_EFECTO = ['sparkles', 'confetti', 'bubbles', 'snow', 'petals', 'imagenes']
// Colores fijos; además se acepta uno propio en #RRGGBB (`esColorPropio`).
export const COLORES_EFECTO = ['theme', 'white', 'gold', 'multi']
// Color con el que arranca cada efecto al elegirlo.
export const COLOR_INICIAL = { sparkles: 'gold', confetti: 'multi', bubbles: 'white', snow: 'white', petals: 'theme' }
export const esColorPropio = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)

// Mis PNG: cómo se mueven (caen como pétalos, suben como burbujas o laten en
// su lugar como los brillos), cuántas imágenes distintas y su tamaño
// (20–200 %: 50 = 16–32 px, 200 = 64–128 px).
export const MOVIMIENTOS_IMAGEN = ['caer', 'subir', 'latir']
export const MAX_IMAGENES_EFECTO = 6
export const TAMANO_IMAGEN_INICIAL = 50
export const TAMANO_IMAGEN_MAX = 200

// Partículas según la intensidad (1–100): de 6 a 60.
export const cantidadDeEfecto = (intensidad = 50) => Math.round(6 + Math.min(100, Math.max(1, intensidad)) * 0.54)
