/*
  Lugar principal del itinerario: cuando la invitación tiene varias
  direcciones (ej. misa y recepción), el organizador marca cuál es la
  principal (`itinerary.object[n].principal = true`). Es el "lugar del
  evento" del pase de Apple Wallet de los invitados (las demás direcciones
  también van en el pase, en su reverso). Sin ninguna marcada, la principal
  es la última con dirección, donde normalmente se escanea el pase.
  Misma regla en iattend--backend/services/wallet/datosPase.js.
*/

export const tieneDireccion = (item) => Boolean(item?.address && (item.address.street || item.address.calle || item.address.url))

// Cuántos momentos tienen dirección (el selector solo sale con dos o más).
export const conDireccion = (items = []) => items.filter(tieneDireccion).length

// Índice del lugar principal, o -1 sin direcciones.
export const indicePrincipal = (items = []) => {
    const marcado = items.findIndex((it) => it?.principal === true && tieneDireccion(it))
    if (marcado >= 0) return marcado
    for (let i = items.length - 1; i >= 0; i--) if (tieneDireccion(items[i])) return i
    return -1
}

// Marca el momento `indice` como principal (solo uno; por posición: en
// invitaciones viejas el id de los momentos puede venir vacío). Con `indice`
// null vuelve a la regla automática.
export const marcarPrincipal = (items = [], indice) => items.map((it, i) => {
    // eslint-disable-next-line no-unused-vars
    const { principal, ...resto } = it
    return indice != null && i === indice ? { ...resto, principal: true } : resto
})
