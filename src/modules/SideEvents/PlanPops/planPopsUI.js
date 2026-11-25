import { useSyncExternalStore } from 'react'

// ¿El Pop abierto en el editor es Free? Lo escribe SideEvents.jsx (según
// GET /api/side-events/:id/plan, o ?free=1 en desarrollo) y lo leen los
// paneles y barras para marcar con InsigniaPlus lo que es de Pops Plus.
// Un store y no un contexto: el editor tiene varias ramas de render
// (escritorio, celular, story) y así no hay que envolver cada una.
let free = false
const oyentes = new Set()

export const marcarPopFree = (valor) => {
    const v = Boolean(valor)
    if (v === free) return
    free = v
    oyentes.forEach((fn) => fn())
}

const suscribir = (fn) => {
    oyentes.add(fn)
    return () => oyentes.delete(fn)
}

export const usePopFree = () => useSyncExternalStore(suscribir, () => free, () => false)

// Prueba gratis de Pops+ del dueño (Admin → Usuarios › Clientes): el Pop es
// Plus y nada se bloquea, pero lo que es Plus sigue con su insignia y el
// editor dice cuándo vence. `{ dias, vence }` o null. Lo escribe SideEvents.jsx
// con lo que devuelve GET /api/side-events/:id/plan (`prueba`).
let prueba = null
export const marcarPopPrueba = (valor) => {
    const v = valor?.vence ? valor : null
    if ((v?.vence ?? null) === (prueba?.vence ?? null)) return
    prueba = v
    oyentes.forEach((fn) => fn())
}
export const usePopPrueba = () => useSyncExternalStore(suscribir, () => prueba, () => null)

/** ¿Se enseñan las insignias de Pops+? En Free (bloquean) y en la prueba (solo avisan). */
export const useInsigniasPlus = () => {
    const esFree = usePopFree()
    const enPrueba = usePopPrueba()
    return esFree || Boolean(enPrueba)
}
