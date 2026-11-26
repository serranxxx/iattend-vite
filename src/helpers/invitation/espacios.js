/*
  Espacios de /invitations (handoff "Switch de espacios"): Weddings y Pops.
  El espacio va en la URL (`?espacio=pops`; Weddings = sin parámetro) y el
  último de la pestaña en sessionStorage, que es lo que PlannerLayout lee
  cuando la URL no lo dice. Los correos de acceso de un Pop mandan a
  `/login?espacio=pops`: el login lo guarda aquí antes de entrar (también
  sobrevive al ida y vuelta de Google / Apple) y manda a la ruta del espacio.
*/
export const ESPACIO_GUARDADO = 'iattend_espacio'

export const claveSeccion = (espacio) => `iattend_seccion_${espacio}`

export const espacioValido = (valor) => (valor === 'pops' || valor === 'weddings' ? valor : null)

const leer = (clave) => { try { return sessionStorage.getItem(clave) } catch { return null } }

/**
 * Ruta de /invitations en un espacio. `conSeccion`: con la última sección de
 * ese espacio en la pestaña (al volver del editor de un Pop, a la lista de
 * donde salió); sin ella, `?espacio=pops` solo = Inicio de Pops.
 */
export const rutaInvitaciones = (espacio, { conSeccion = false } = {}) => {
    const params = new URLSearchParams()
    if (espacio === 'pops') params.set('espacio', 'pops')
    const seccion = conSeccion ? leer(claveSeccion(espacio === 'pops' ? 'pops' : 'weddings')) : null
    if (seccion && seccion !== 'test') params.set('seccion', seccion)
    const query = params.toString()
    return `/invitations${query ? `?${query}` : ''}`
}

/**
 * Toma `?espacio=` de un link (p. ej. el del login) y lo deja como el de la
 * pestaña. Sin él, olvida el espacio y las secciones que recordaba la pestaña:
 * al entrar con otra cuenta en la misma pestaña, cada quien abre en su espacio
 * (Pops o Weddings, PlannerLayout) y no en el de la sesión anterior.
 */
export const recordarEspacioDeUrl = (search) => {
    const espacio = espacioValido(new URLSearchParams(search).get('espacio'))
    try {
        if (espacio) sessionStorage.setItem(ESPACIO_GUARDADO, espacio)
        else {
            sessionStorage.removeItem(ESPACIO_GUARDADO)
            sessionStorage.removeItem(claveSeccion('weddings'))
            sessionStorage.removeItem(claveSeccion('pops'))
        }
    } catch { /* sin storage */ }
    return espacio
}

/*
  Acción que trae un link de entrada (landing de Pops y editor sin cuenta,
  `/crear-pop`): `accion=guardar-pop` (crear el Pop con el borrador del
  navegador; `luego` = compartir | enviar | guardar) o `accion=plus` (ir al
  pago de Pops+). El login la pasa tal cual a /invitations, donde PopsApp la
  ejecuta una vez y la quita de la URL.
*/
export const ACCIONES_ENTRADA = ['guardar-pop', 'plus', 'crear']

/** Ruta a la que manda el login: la del espacio + `accion` / `luego` del link. */
export const destinoDeLogin = (espacio, search) => {
    const de = new URLSearchParams(search)
    const accion = de.get('accion')
    const base = rutaInvitaciones(accion ? 'pops' : espacio)
    if (!ACCIONES_ENTRADA.includes(accion)) return base
    const params = new URLSearchParams(base.split('?')[1] ?? '')
    params.set('accion', accion)
    if (de.get('luego')) params.set('luego', de.get('luego'))
    return `/invitations?${params.toString()}`
}

// La acción también se guarda en la pestaña: el regreso de Google / Apple pasa
// por /invitations → /login → /invitations (SessionBridge) y ahí la URL ya no
// la trae. PopsApp la toma de la URL o, si no, de aquí (una sola vez).
const ACCION_PENDIENTE = 'iattend_accion_pendiente'

export const guardarAccionPendiente = (search) => {
    const de = new URLSearchParams(search)
    const accion = de.get('accion')
    if (!ACCIONES_ENTRADA.includes(accion)) return
    try { sessionStorage.setItem(ACCION_PENDIENTE, JSON.stringify({ accion, luego: de.get('luego') })) } catch { /* sin storage */ }
}

/** { accion, luego } o null; la borra al leerla. */
export const tomarAccionPendiente = () => {
    try {
        const v = JSON.parse(sessionStorage.getItem(ACCION_PENDIENTE))
        sessionStorage.removeItem(ACCION_PENDIENTE)
        return v && ACCIONES_ENTRADA.includes(v.accion) ? v : null
    } catch {
        return null
    }
}
