// Lecturas de una conversación del buzón (`get_conversations_v2`). Las usan el
// buzón del rail y la bandeja de Hoy.

export const idDe = (conversacion) => `${conversacion.phone}-${conversacion.invitation_id}`

export const ultimoMensaje = (conversacion) => {
    const mensajes = conversacion.messages ?? []
    return mensajes[mensajes.length - 1] ?? null
}

export const ultimoEntrante = (conversacion) =>
    [...(conversacion.messages ?? [])].reverse().find(m => m.direction === 'inbound') ?? null

export const sinLeer = (conversacion) =>
    (conversacion.messages ?? []).filter(m => !m.read && m.direction === 'inbound').length

export const enMilisegundos = (mensaje) => (mensaje?.timestamp ? new Date(mensaje.timestamp).getTime() : 0)
