// Respaldo del filtro de pruebas: cubre a los dueños que ya no tienen fila en
// `profiles`. La regla viva es el rol —ver `crearFiltroDePrueba`—, así que esta
// lista no hay que alimentarla salvo por ese caso.
export const TEST_EMAILS = [
    'albserrano8@gmail.com',
    'pa.perez98@gmail.com',
    'pau@iattend.mx',
    'gabrielaperezort@gmail.com',
    'albertoserrano@canplast.com.mx',
    'ajaredojeda@gmail.com',
    'lesly_lujan@hotmail.com',
    'valeriamal08@gmail.com',
    'fernandoarzate97@gmail.com',
]

// Cualquiera con algo en `profiles.role` es gente de casa —administración,
// ventas o cuentas de prueba— y sus invitaciones no son eventos de clientes.
// Hoy son 13 perfiles (2 Administration, 6 test, 5 sales) dueños de 25
// invitaciones, y el rol cubre a todos los correos de `TEST_EMAILS`.
export const tieneRol = (profile) => Boolean(String(profile?.role ?? '').trim())

// El filtro necesita los perfiles, así que se construye una vez y se pasa hecho
// a quien lo ocupe, en vez de que cada pantalla vuelva a cruzar las dos listas.
//
// `TEST_EMAILS` se conserva como respaldo: cubre a las invitaciones cuyo dueño
// ya no tiene fila en `profiles`, que de otro modo volverían a contar como
// reales. Mientras los perfiles cargan, el filtro opera solo con esa lista y se
// completa solo cuando llegan.
export const crearFiltroDePrueba = (profiles) => {
    const correos = new Set(TEST_EMAILS)
    const ids = new Set()

    ;(profiles ?? []).forEach(perfil => {
        if (!tieneRol(perfil)) return
        if (perfil.user_email) correos.add(perfil.user_email)
        if (perfil.user_id) ids.add(perfil.user_id)
    })

    return (invitation) => correos.has(invitation?.user_email) || ids.has(invitation?.user_id)
}

// Un evento está activo si no tiene fecha todavía o si su fecha aún no pasa.
export const esEventoActivo = (invitation, hoy = new Date()) => {
    const corte = new Date(hoy)
    corte.setHours(0, 0, 0, 0)
    return !invitation?.event_date || new Date(invitation.event_date) >= corte
}

// `invitations.event_date` es un timestamptz guardado a medianoche UTC: lo que
// representa es un día de calendario, no un instante. Leerlo con `new Date()` o
// `dayjs()` lo convierte a hora local y en México lo corre al día anterior —por
// eso una boda del 2 de octubre aparecía el 1. Se toma la parte de fecha del
// string tal cual y se deja que dayjs la lea como medianoche local.
export const fechaDeEvento = (invitation) => {
    const valor = invitation?.event_date
    return valor ? String(valor).slice(0, 10) : null
}
