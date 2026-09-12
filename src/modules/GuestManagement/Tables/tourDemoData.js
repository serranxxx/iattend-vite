// Salón de ejemplo para el tour del mapa de mesas.
//
// El tour se dispara justo cuando NO hay mesas —el panel izquierdo está en el
// onboarding y no habría nada que señalar—, así que mientras dura se pinta este
// salón de mentiras. Nunca se guarda: los ids son strings con prefijo `demo-`,
// las escrituras están bloqueadas mientras el demo está activo y al cerrar el
// tour se recarga lo real desde Supabase.
//
// Las posiciones giran alrededor del centro del lienzo (3500/2 = 1750) para que
// "Centrar" las deje a la vista.
const CENTER = 1750

export const isDemoId = (id) => typeof id === 'string' && id.startsWith('demo-')

export const DEMO_TABLES = [
    { id: 'demo-t1', shape: 'round', name: 'Mesa 1', number: 1, size: 10, x: CENTER - 320, y: CENTER - 220, vertical: false, blocked: false },
    { id: 'demo-t2', shape: 'round', name: 'Mesa 2', number: 2, size: 8, x: CENTER + 60, y: CENTER - 220, vertical: false, blocked: false },
    { id: 'demo-t3', shape: 'rectangle', name: 'Mesa de novios', number: 3, size: 12, x: CENTER - 200, y: CENTER + 90, vertical: false, blocked: false },
]

const NAMES = [
    'Ana Rivera', 'Luis Ortega', 'Mariana Cruz', 'Diego Fuentes',
    'Paola Serrano', 'Andrés Lugo', 'Carmen Ibáñez', 'Tomás Peña',
    'Renata Salas', 'Iván Bravo', 'Lucía Márquez', 'Hugo Ramos',
    'Sofía Cabrera', 'Emilio Duarte',
]

// Unos sentados y otros no: así la franja de avance y la columna de
// confirmados tienen algo real que mostrar.
const SEATS = ['demo-t1', 'demo-t1', 'demo-t1', 'demo-t1', 'demo-t2', 'demo-t2', 'demo-t3', 'demo-t3', 'demo-t3', null, null, null, null, null]

export const DEMO_GUESTS = NAMES.map((name, i) => ({
    id: `demo-g${i + 1}`,
    name,
    state: 'confirmado',
    table: SEATS[i] ?? null,
    tag: i % 3 === 0 ? 'Familia' : 'Amigos',
    companion_id: null,
}))
