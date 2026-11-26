import { useSyncExternalStore } from 'react'

/*
  "Ver como" de Administración (menú de la cuenta en la app de Pops): Free ·
  Plus · Try enseñan la UI de una cuenta Free, Pops+ o en prueba gratis, sin
  tocar nada en la base. Se guarda en este navegador (localStorage) y solo
  cuenta si la sesión es de Administración. Lo leen usePlanPops,
  useCuentaPlus y el editor de un Pop (SideEvents.jsx). Tocar la opción ya
  elegida la quita (vuelve el plan real).
*/

const CLAVE = 'iattend_pops_vista_plan'
const EVENTO = 'iattend-vista-plan'
export const VISTAS_PLAN = ['free', 'plus', 'try']
export const DIAS_VISTA_PRUEBA = 30

export const esAdminLocal = () => {
    try {
        return JSON.parse(localStorage.getItem('session'))?.user?.role === 'Administration'
    } catch {
        return false
    }
}

/** 'free' | 'plus' | 'try' | null */
export const vistaPlanAdmin = () => {
    if (!esAdminLocal()) return null
    const v = localStorage.getItem(CLAVE)
    return VISTAS_PLAN.includes(v) ? v : null
}

export const ponerVistaPlan = (vista) => {
    if (VISTAS_PLAN.includes(vista)) localStorage.setItem(CLAVE, vista)
    else localStorage.removeItem(CLAVE)
    window.dispatchEvent(new Event(EVENTO))
}

/** La prueba simulada de "Try": { dias, vence }. */
export const pruebaSimulada = () => ({
    dias: DIAS_VISTA_PRUEBA,
    vence: new Date(Date.now() + DIAS_VISTA_PRUEBA * 86400000).toISOString(),
})

const suscribir = (fn) => {
    window.addEventListener(EVENTO, fn)
    window.addEventListener('storage', fn)
    return () => {
        window.removeEventListener(EVENTO, fn)
        window.removeEventListener('storage', fn)
    }
}

export const useVistaPlanAdmin = () => useSyncExternalStore(suscribir, vistaPlanAdmin, () => null)
