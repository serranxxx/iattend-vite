// Efectos animados de un Flash: catálogo compartido por el panel (SideEvents)
// y la capa (EfectosCapa). Ver EfectosCapa.jsx.

export const TIPOS_EFECTO = ['sparkles', 'confetti', 'bubbles', 'snow', 'petals']
export const COLORES_EFECTO = ['theme', 'white', 'gold', 'multi']
// Color con el que arranca cada efecto al elegirlo.
export const COLOR_INICIAL = { sparkles: 'gold', confetti: 'multi', bubbles: 'white', snow: 'white', petals: 'theme' }

// Partículas según la intensidad (1–100): de 6 a 60.
export const cantidadDeEfecto = (intensidad = 50) => Math.round(6 + Math.min(100, Math.max(1, intensidad)) * 0.54)
