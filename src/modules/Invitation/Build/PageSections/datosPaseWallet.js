import { indicePrincipal, tieneDireccion } from '../BuildSections/lugarPrincipal'

/*
  Datos del pase de Apple Wallet de una invitación para el simulador del
  editor (panel "Pase digital", WalletPanel). Mismas reglas que el pase real,
  que arma el backend (iattend--backend/services/wallet/datosPase.js):
  · Título y foto: los del pase (`invitation.wallet.title` / `.image`) o, sin
    ellos, los de la portada.
  · Fecha "24 NOV" (como la pone Wallet en el diseño nuevo) y la hora del
    primer momento del itinerario.
  · Lugares: cada dirección del itinerario (sin repetir); el principal es el
    marcado (lugarPrincipal.js) o el último.
*/

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

export const portadaDe = (invitation) => {
    const src = invitation?.cover?.image?.prod
    if (typeof src === 'string') return src.trim() || null
    if (Array.isArray(src)) return src.find((s) => typeof s === 'string' && s.trim()) ?? null
    return null
}

export const tituloPortada = (invitation) => invitation?.cover?.title?.text?.value || ''

const textoDireccion = (a) => {
    if (!a) return ''
    const calle = [a.street ?? a.calle, a.number ?? a.numero].filter(Boolean).join(' ')
    const resto = [a.neighborhood ?? a.colonia, a.city ?? a.ciudad, a.state ?? a.estado].filter(Boolean).join(', ')
    return [calle, resto].filter(Boolean).join(', ').trim()
}

export const datosPaseVista = (invitation) => {
    const wallet = invitation?.wallet ?? {}
    const momentos = invitation?.itinerary?.active === false ? [] : (invitation?.itinerary?.object ?? [])
    const fecha = String(invitation?.cover?.date?.value ?? '')
    const [, mes, dia] = fecha.split('T')[0].split('-')
    const principal = indicePrincipal(momentos)

    const vistos = new Set()
    const lugares = []
    momentos.forEach((m, i) => {
        if (!tieneDireccion(m)) return
        const direccion = textoDireccion(m.address)
        if (!direccion || vistos.has(direccion)) return
        vistos.add(direccion)
        lugares.push({ indice: i, nombre: m.name || '', hora: m.time || '', direccion, principal: i === principal })
    })

    return {
        titulo: wallet.title?.trim() || tituloPortada(invitation) || 'Tu evento',
        imagen: wallet.image || portadaDe(invitation),
        tituloPropio: Boolean(wallet.title?.trim()),
        imagenPropia: Boolean(wallet.image),
        fecha: mes && dia ? `${Number(dia)} ${MESES[Number(mes) - 1]}` : '',
        hora: momentos[0]?.time || '',
        lugares,
        itinerario: momentos.filter((m) => m.name).map((m) => ({ hora: m.time || '', nombre: m.name })),
    }
}
