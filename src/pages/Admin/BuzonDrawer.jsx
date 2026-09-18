/*
  Buzón del Admin, acoplado al sider.

  `WhatsappMessages` está hecho para flotar: trae ancho fijo de 450px, alto de
  60vh, radio de 24 y sombra propia, más su propia cabecera con título y botón
  de cerrar. Metido en el sider de 352px eso daba una tarjeta que se desbordaba
  a lo ancho (con scroll horizontal), se cortaba a media altura y repetía el
  título "Buzón" dos veces. No es un bug de estilos sueltos: es un componente
  con otra premisa.

  Este ocupa el contenedor que le den —el alto y el ancho los manda el sider— y
  no dibuja cabecera propia, porque la del sider ya está ahí.

  Lo que sí gana respecto al flotante, porque aquí hay sitio para ello:
  · Las conversaciones sin responder van primero. En el Admin entran mensajes de
    todos los eventos a la vez; sin ese orden, lo pendiente queda enterrado.
  · Cada fila lleva la hora del último mensaje. En una bandeja de varios eventos
    saber si algo es de hace diez minutos o de hace tres semanas es la mitad de
    la decisión.
*/

import { useMemo, useState } from 'react'
import { FileText, Image, MapPin, Mic, SmilePlus, Video } from 'lucide-react'
import { OpenChat } from '../../modules/GuestManagement/WhatsappMessages/OpenChat/OpenChat'
import { phoneFormatter } from '../../modules/GuestManagement/WhatsappMessages/phone'
import styles from './BuzonDrawer.module.css'

const MS_POR_DIA = 86_400_000

const ADJUNTOS = {
    image: { Icono: Image, label: 'Foto' },
    video: { Icono: Video, label: 'Vídeo' },
    audio: { Icono: Mic, label: 'Audio' },
    document: { Icono: FileText, label: 'Documento' },
    sticker: { Icono: SmilePlus, label: 'Sticker' },
    location: { Icono: MapPin, label: 'Ubicación' },
}

const idDe = (conversacion) => `${conversacion.phone}-${conversacion.invitation_id}`

const ultimoMensaje = (conversacion) => {
    const mensajes = conversacion.messages ?? []
    return mensajes[mensajes.length - 1] ?? null
}

const ultimoEntrante = (conversacion) =>
    [...(conversacion.messages ?? [])].reverse().find(m => m.direction === 'inbound') ?? null

const sinLeer = (conversacion) =>
    (conversacion.messages ?? []).filter(m => !m.read && m.direction === 'inbound').length

const enMilisegundos = (mensaje) => (mensaje?.timestamp ? new Date(mensaje.timestamp).getTime() : 0)

// Reloj de bandeja: hora si es de hoy, "Ayer", día de la semana dentro de la
// semana y fecha corta más atrás. Una fecha completa en cada fila sería ruido.
const horaCorta = (timestamp) => {
    if (!timestamp) return ''

    const fecha = new Date(timestamp)
    const ahora = new Date()
    const dias = Math.floor((ahora.setHours(0, 0, 0, 0) - new Date(timestamp).setHours(0, 0, 0, 0)) / MS_POR_DIA)

    if (dias === 0) return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    if (dias === 1) return 'Ayer'
    if (dias < 7) return fecha.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')

    return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '')
}

const Vistazo = ({ mensaje }) => {
    if (!mensaje) return null

    const adjunto = ADJUNTOS[mensaje.message_type]

    if (adjunto) {
        const { Icono, label } = adjunto
        return (
            <span className={styles.adjunto}>
                <Icono size={12} strokeWidth={1.8} />
                {label}
            </span>
        )
    }

    return <span className={styles.vistazo}>{mensaje.body ?? ''}</span>
}

export const BuzonDrawer = ({ conversations, invitationsById = new Map() }) => {
    const [abierta, setAbierta] = useState(null)

    // Sin responder primero, y dentro de cada bloque lo más reciente arriba.
    const ordenadas = useMemo(() => {
        const puntaje = (conversacion) => enMilisegundos(
            sinLeer(conversacion) > 0 ? ultimoEntrante(conversacion) : ultimoMensaje(conversacion),
        )

        return [...(conversations ?? [])].sort((a, b) => {
            const pendientes = Math.sign(sinLeer(b)) - Math.sign(sinLeer(a))
            return pendientes !== 0 ? pendientes : puntaje(b) - puntaje(a)
        })
    }, [conversations])

    const conversacionAbierta = ordenadas.find(c => idDe(c) === abierta) ?? null

    if (conversacionAbierta) {
        const contacto = ultimoMensaje(conversacionAbierta)?.contact_name
            ?? conversacionAbierta.messages?.[0]?.contact_name

        return (
            <div className={styles.buzon}>
                {/* OpenChat ya trae su cabecera con el nombre y una X que
                    devuelve a la lista: hace de "atrás" sin agregar otra. */}
                <OpenChat
                    name={contacto}
                    conversation={conversacionAbierta}
                    setOpenMessage={() => setAbierta(null)}
                    invitation_id={conversacionAbierta.invitation_id}
                    phoneFormatter={phoneFormatter}
                />
            </div>
        )
    }

    if (ordenadas.length === 0) {
        return <div className={styles.vacio}>No hay mensajes en el buzón.</div>
    }

    return (
        <div className={styles.buzon}>
            <ul className={styles.lista}>
                {ordenadas.map(conversacion => {
                    const id = idDe(conversacion)
                    const ultimo = ultimoMensaje(conversacion)
                    const pendientes = sinLeer(conversacion)
                    const nombre = ultimo?.contact_name ?? conversacion.messages?.[0]?.contact_name
                    const evento = invitationsById.get(conversacion.invitation_id)?.name

                    return (
                        <li key={id}>
                            <button
                                type='button'
                                className={`${styles.fila} ${pendientes > 0 ? styles.filaPendiente : ''}`}
                                onClick={() => setAbierta(id)}
                            >
                                <span className={styles.avatar}>
                                    {(nombre ?? '?').trim().charAt(0).toUpperCase()}
                                </span>

                                <span className={styles.centro}>
                                    <span className={styles.nombre}>{nombre ?? phoneFormatter(conversacion.phone)}</span>
                                    {evento && <span className={styles.evento}>{evento}</span>}
                                    <Vistazo mensaje={ultimo} />
                                </span>

                                <span className={styles.meta}>
                                    <span className={styles.hora}>{horaCorta(ultimo?.timestamp)}</span>
                                    {pendientes > 0 && <span className={styles.pendientes}>{pendientes}</span>}
                                </span>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
