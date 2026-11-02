/*
  Datos del pase de Apple Wallet de un side event / Pop para el simulador
  del editor (WalletPanelPop → Editor/WalletPanel). Mismas reglas que el
  pase real (iattend--backend/services/wallet/datosPase.js, datosPaseSide):
  · Título: `body.wallet.title` o, sin él, el nombre del evento. Foto:
    `body.wallet.image` o, sin ella, la imagen del link (`url_image`) o la
    foto de la portada.
  · Fecha "NOV 14" y hora "8:00 pm" de `body.hour` (hora de pared, sin huso).
  · Un solo lugar: la dirección del evento (con su nombre, `place_name`).
*/

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

// "20:00" → "8:00 pm"
export const hora12 = (hhmm) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm ?? ''))
    if (!m) return ''
    const h = Number(m[1])
    return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'am' : 'pm'}`
}

const textoDireccion = (a) => {
    if (!a) return ''
    const calle = [a.street, a.number].filter(Boolean).join(' ')
    const resto = [a.neighborhood, a.city, a.state].filter(Boolean).join(', ')
    return [calle, resto].filter(Boolean).join(', ').trim()
}

export const datosPasePop = (current) => {
    const body = current?.body ?? {}
    const wallet = body.wallet ?? {}
    const pared = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/.exec(String(body.hour ?? ''))
    const direccion = textoDireccion(body.address)
    const hora = pared ? hora12(pared[4]) : ''
    return {
        titulo: wallet.title?.trim() || current?.name || 'Tu evento',
        // La foto propia del pase o, sin ella, la imagen del link (la portada
        // con sus elementos, o con video la que eligió el organizador; con
        // video, la elegida aunque no se haya guardado todavía).
        imagen: wallet.image || body.linkImage || (body.video ? body.image : current?.url_image) || body.image || null,
        imagenPropia: Boolean(wallet.image),
        fecha: pared ? `${Number(pared[3])} ${MESES[Number(pared[2]) - 1]}` : '',
        hora,
        lugares: direccion ? [{ indice: 0, nombre: body.place_name || '', hora, direccion, principal: true }] : [],
        itinerario: (body.itinerary ?? []).filter((m) => m.name).map((m) => ({ hora: m.time ? hora12(m.time) || m.time : '', nombre: m.name })),
    }
}
