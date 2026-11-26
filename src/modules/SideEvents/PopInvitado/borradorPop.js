/*
  Pop sin cuenta (`/crear-pop`, SideEvents `invitado`): lo que se arma vive
  solo en este navegador (localStorage) hasta que la persona crea su cuenta.
  Al volver del login, PopsApp crea el Pop (POST /api/planner/pop "para mí") y
  abre su editor con `?borrador=1`, donde SideEvents aplica este borrador como
  cambios sin guardar (el autoguardado lo guarda) y lo borra.
*/

const CLAVE = 'iattend_pop_borrador'

/** { name, body, type, guardado } o null. */
export const leerBorrador = () => {
    try {
        const v = JSON.parse(localStorage.getItem(CLAVE))
        return v && typeof v === 'object' && v.body ? v : null
    } catch {
        return null
    }
}

export const guardarBorrador = (pop) => {
    if (!pop?.body) return
    try {
        localStorage.setItem(CLAVE, JSON.stringify({ name: pop.name ?? null, body: pop.body, type: pop.type ?? null, guardado: Date.now() }))
    } catch { /* sin espacio o sin storage */ }
}

export const borrarBorrador = () => {
    try { localStorage.removeItem(CLAVE) } catch { /* sin storage */ }
}

/** Ruta para crear la cuenta y luego crear el Pop con el borrador. */
export const rutaCrearCuentaPop = (luego = 'guardar', { conSesion = false } = {}) => {
    const params = new URLSearchParams({ espacio: 'pops', accion: 'guardar-pop', luego })
    return conSesion ? `/invitations?${params.toString()}` : `/login?mode=register&${params.toString()}`
}
