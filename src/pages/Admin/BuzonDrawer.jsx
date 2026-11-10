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
  · Cada fila dice de qué evento viene. Los mensajes de un Pop (o de un side
    event) llegan sin `invitation_id`: el envío que los originó
    (`invitation_message_dispatches`, por el `dispatch_id` del mensaje) trae su
    `side_event_id`, y con eso se busca el nombre (`useSidesDeConversaciones`).
  · Cada fila lleva la hora del último mensaje. En una bandeja de varios eventos
    saber si algo es de hace diez minutos o de hace tres semanas es la mitad de
    la decisión.
*/

import { useEffect, useMemo, useState } from 'react'
import { FileText, Image, MapPin, Mic, SmilePlus, Video } from 'lucide-react'
import { OpenChat } from '../../modules/GuestManagement/WhatsappMessages/OpenChat/OpenChat'
import { phoneFormatter } from '../../modules/GuestManagement/WhatsappMessages/phone'
import { supabase } from '../../lib/supabase'
import { enMilisegundos, idDe, sinLeer, ultimoEntrante, ultimoMensaje } from './buzonConversaciones'
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

export const Vistazo = ({ mensaje }) => {
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

// `inicial`: id de conversación (ver `idDe`) para abrir el buzón directo en
// ella, como hace la bandeja de Hoy al hacer clic en una fila.
// Conversaciones sin invitación (Pop o side event): idDe → { nombre, pop,
// invitacion } de su side event, sacado del envío de sus mensajes. Se pide con
// la sesión del admin (anon no lee esas tablas).
const useSidesDeConversaciones = (conversations) => {
    const [sides, setSides] = useState(new Map())

    const dispatches = useMemo(() => {
        const porConversacion = new Map()
        ;(conversations ?? []).forEach(c => {
            if (c.invitation_id) return
            const ids = [...new Set((c.messages ?? []).map(m => m.dispatch_id).filter(Boolean))]
            if (ids.length) porConversacion.set(idDe(c), ids)
        })
        return porConversacion
    }, [conversations])

    useEffect(() => {
        const todos = [...new Set([...dispatches.values()].flat())]
        if (!todos.length) return
        let vivo = true
        ;(async () => {
            const { data: envios, error } = await supabase
                .from('invitation_message_dispatches')
                .select('id, side_event_id')
                .in('id', todos)
            if (error || !vivo) return
            const sidePorEnvio = new Map((envios ?? []).filter(e => e.side_event_id).map(e => [e.id, e.side_event_id]))
            const ids = [...new Set(sidePorEnvio.values())]
            if (!ids.length) return
            const { data: eventos } = await supabase
                .from('side_events')
                .select('id, name, invitation_id')
                .in('id', ids)
            if (!vivo) return
            const porId = new Map((eventos ?? []).map(e => [e.id, e]))
            const resultado = new Map()
            dispatches.forEach((envioIds, idConv) => {
                const side = envioIds.map(id => porId.get(sidePorEnvio.get(id))).find(Boolean)
                if (side) resultado.set(idConv, side)
            })
            setSides(resultado)
        })()
        return () => { vivo = false }
    }, [dispatches])

    return sides
}

// Chips de arriba de la lista. Un tipo sin conversaciones no sale.
const FILTROS = [
    { clave: 'todos', label: 'Todos' },
    { clave: 'Wedding', label: 'Wedding' },
    { clave: 'Side event', label: 'Side events' },
    { clave: 'Pop', label: 'Pops' },
]

export const BuzonDrawer = ({ conversations, invitationsById = new Map(), inicial = null }) => {
    const [abierta, setAbierta] = useState(inicial)
    // Chip elegido: 'todos' o un tipo de evento (Wedding · Side event · Pop).
    const [filtro, setFiltro] = useState('todos')
    const sidesPorConversacion = useSidesDeConversaciones(conversations)

    // De qué evento viene, con su tipo: Wedding (la invitación principal),
    // Side event (de una boda, lleva también el nombre de su invitación) o Pop.
    const eventoDe = (conversacion) => {
        const invitacion = invitationsById.get(conversacion.invitation_id)?.name
        if (invitacion) return { nombre: invitacion, tipo: 'Wedding' }
        const side = sidesPorConversacion.get(idDe(conversacion))
        if (!side) return null
        if (!side.invitation_id) return { nombre: side.name || 'Pop sin nombre', tipo: 'Pop' }
        const deBoda = invitationsById.get(side.invitation_id)?.name
        return { nombre: deBoda ? `${side.name} · ${deBoda}` : side.name, tipo: 'Side event' }
    }

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

    // Cuántas hay de cada tipo y cuántas de esas tienen algo sin leer.
    const conteo = (tipo) => {
        const lista = tipo === 'todos' ? ordenadas : ordenadas.filter(c => eventoDe(c)?.tipo === tipo)
        return { total: lista.length, pendientes: lista.filter(c => sinLeer(c) > 0).length }
    }
    const visibles = filtro === 'todos' ? ordenadas : ordenadas.filter(c => eventoDe(c)?.tipo === filtro)

    return (
        <div className={styles.buzon}>
            <div className={styles.chips} role='tablist' aria-label='Tipo de evento'>
                {FILTROS.map(({ clave, label }) => {
                    const { total, pendientes } = conteo(clave)
                    if (clave !== 'todos' && total === 0) return null
                    return (
                        <button
                            key={clave}
                            type='button'
                            role='tab'
                            aria-selected={filtro === clave}
                            data-tipo={clave}
                            className={`${styles.chip} ${filtro === clave ? styles.chipActivo : ''}`}
                            onClick={() => setFiltro(clave)}
                        >
                            {label}
                            <span className={styles.chipCuenta}>{pendientes || total}</span>
                        </button>
                    )
                })}
            </div>
            {visibles.length === 0 && <div className={styles.vacio}>No hay mensajes de este tipo.</div>}
            <ul className={styles.lista}>
                {visibles.map(conversacion => {
                    const id = idDe(conversacion)
                    const ultimo = ultimoMensaje(conversacion)
                    const pendientes = sinLeer(conversacion)
                    const nombre = ultimo?.contact_name ?? conversacion.messages?.[0]?.contact_name
                    const evento = eventoDe(conversacion)

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
                                    {evento && (
                                        <span className={styles.evento}>
                                            {evento.tipo && <span className={styles.tipoEvento} data-tipo={evento.tipo}>{evento.tipo}</span>}
                                            {evento.nombre}
                                        </span>
                                    )}
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
