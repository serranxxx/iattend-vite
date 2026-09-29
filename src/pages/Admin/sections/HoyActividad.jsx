import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { supabase } from '../../../lib/supabase'
import { Vistazo } from '../BuzonDrawer'
import { enMilisegundos, idDe, sinLeer, ultimoEntrante, ultimoMensaje } from '../buzonConversaciones'
import { phoneFormatter } from '../../../modules/GuestManagement/WhatsappMessages/phone'
import { pendientes } from '../supportTickets'
import { useContador } from '../useContador'
import styles from './HoySection.module.css'

dayjs.extend(relativeTime)
dayjs.locale('es')

// Tarjetas de abajo de Hoy: lo que entra (mensajes, Save the Dates y reportes).

const mapaPor = (lista, llave) => new Map((lista ?? []).map(item => [item[llave], item]))

// ------------------------------------------------------------- Bandeja ---

const FILAS_BANDEJA = 4
// Solo conversaciones de eventos cuyo dueño es gente de casa (ventas, admin y
// pruebas): lo que el admin revisa desde Hoy. El buzón completo sigue en el rail.
const ROLES_DE_BANDEJA = new Set(['sales', 'Administration', 'test'])

export const BandejaCard = ({ className, conversations, invitations, profiles, onAbrirBuzon }) => {
    const invitationsById = useMemo(() => mapaPor(invitations, 'id'), [invitations])
    const perfilesPorId = useMemo(() => mapaPor(profiles, 'user_id'), [profiles])

    // Sin leer primero y, dentro de cada bloque, lo más reciente arriba (igual
    // que el buzón).
    const deCasa = useMemo(() => {
        const puntaje = (c) => enMilisegundos(sinLeer(c) > 0 ? ultimoEntrante(c) : ultimoMensaje(c))
        return (conversations ?? [])
            .filter(c => {
                const invitacion = invitationsById.get(c.invitation_id)
                return ROLES_DE_BANDEJA.has(perfilesPorId.get(invitacion?.user_id)?.role)
            })
            .sort((a, b) => (Math.sign(sinLeer(b)) - Math.sign(sinLeer(a))) || (puntaje(b) - puntaje(a)))
    }, [conversations, invitationsById, perfilesPorId])

    const totalSinLeer = deCasa.reduce((acc, c) => acc + sinLeer(c), 0)

    return (
        <section className={`${styles.card} ${className ?? ''}`}>
            <header className={styles.cardHead}>
                <h2 className={styles.label}>
                    Bandeja
                    {totalSinLeer > 0 && <span className={`${styles.pill} ${styles.pillVioleta}`}>{totalSinLeer} sin leer</span>}
                </h2>
                <button type='button' className={styles.enlace} onClick={() => onAbrirBuzon?.()}>abrir bandeja</button>
            </header>

            {deCasa.length === 0 ? (
                <div className={styles.vacio}>Sin mensajes de cuentas de ventas, admin o pruebas.</div>
            ) : (
                <ul className={styles.bandeja}>
                    {deCasa.slice(0, FILAS_BANDEJA).map(conversacion => {
                        const ultimo = ultimoMensaje(conversacion)
                        const nombre = ultimo?.contact_name ?? conversacion.messages?.[0]?.contact_name
                        const evento = invitationsById.get(conversacion.invitation_id)?.name
                        const noLeidos = sinLeer(conversacion)

                        return (
                            <li key={idDe(conversacion)}>
                                <button
                                    type='button'
                                    className={`${styles.bandejaFila} ${noLeidos > 0 ? styles.bandejaFilaNueva : ''}`}
                                    onClick={() => onAbrirBuzon?.(idDe(conversacion))}
                                >
                                    <span className={styles.avatar}>{(nombre ?? '?').trim().charAt(0).toUpperCase()}</span>
                                    <span className={styles.bandejaQuien}>
                                        <b>{nombre ?? phoneFormatter(conversacion.phone)}</b>
                                        {evento && <span>{evento}</span>}
                                    </span>
                                    <span className={styles.bandejaTexto}><Vistazo mensaje={ultimo} /></span>
                                    <span className={styles.bandejaHora}>
                                        {ultimo?.timestamp ? dayjs(ultimo.timestamp).format('D MMM') : ''}
                                        {noLeidos > 0 && <i>{noLeidos}</i>}
                                    </span>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}

// ------------------------------------------------------- Save the Date ---

// Cada ventana se parte en tramos para la mini gráfica: diarios en 7 días,
// de 3 días en 30 y semanales en 90.
const VENTANAS = [
    { dias: 7, tramo: 1 },
    { dias: 30, tramo: 3 },
    { dias: 90, tramo: 7 },
]

const Sparkline = ({ valores }) => {
    const w = 300
    const h = 64
    const tope = Math.max(...valores, 1)
    const paso = valores.length > 1 ? w / (valores.length - 1) : w
    const puntos = valores.map((v, i) => [i * paso, h - 3 - (v / tope) * (h - 8)])
    const linea = puntos.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio='none' className={styles.sparkline} aria-hidden='true'>
            <path d={`${linea} L${w},${h} L0,${h} Z`} className={styles.sparklineArea} />
            <path d={linea} className={styles.sparklineLinea} />
        </svg>
    )
}

export const SaveTheDateCard = ({ className, invitations, profiles, esPrueba }) => {
    const [filas, setFilas] = useState(null)
    const [dias, setDias] = useState(30)

    useEffect(() => {
        let vivo = true
        supabase
            .from('save_the_dates')
            .select('id, invitation_id, created_at')
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (!vivo) return
                if (error) console.error('Error al cargar Save the Dates:', error)
                setFilas(data ?? [])
            })
        return () => { vivo = false }
    }, [])

    const invitationsById = useMemo(() => mapaPor(invitations, 'id'), [invitations])
    const perfilesPorId = useMemo(() => mapaPor(profiles, 'user_id'), [profiles])

    // Cada Save the Date con quién lo hizo (el dueño de su evento). Las cuentas
    // internas quedan fuera: el producto es nuevo y las pruebas lo inflan.
    const { reales, pruebas } = useMemo(() => {
        const todos = (filas ?? []).map(std => {
            const invitacion = invitationsById.get(std.invitation_id)
            const perfil = perfilesPorId.get(invitacion?.user_id)
            return {
                ...std,
                prueba: invitacion ? esPrueba(invitacion) : false,
                duenioId: invitacion?.user_id ?? null,
                nombre: perfil?.full_name || invitacion?.user_email || perfil?.user_email || 'Sin dueño',
            }
        })
        const lista = todos.filter(s => !s.prueba)
        return { reales: lista, pruebas: todos.length - lista.length }
    }, [filas, invitationsById, perfilesPorId, esPrueba])

    const { tramo } = VENTANAS.find(v => v.dias === dias)
    const desde = dayjs().startOf('day').subtract(dias - 1, 'day')
    const enVentana = reales.filter(s => !dayjs(s.created_at).isBefore(desde))
    const personas = new Set(enVentana.map(s => s.duenioId).filter(Boolean)).size

    const serie = useMemo(() => {
        const tramos = Array(Math.ceil(dias / tramo)).fill(0)
        enVentana.forEach(s => {
            const i = Math.floor(dayjs(s.created_at).diff(desde, 'day') / tramo)
            if (i >= 0 && i < tramos.length) tramos[i] += 1
        })
        return tramos
    }, [enVentana, dias, tramo, desde])

    const contados = useContador(enVentana.length)
    const ultimo = reales[0]

    return (
        <section className={`${styles.card} ${className ?? ''}`}>
            <header className={styles.cardHead}>
                <h2 className={styles.label}>Save the Date</h2>
                <div className={styles.segmentado} role='radiogroup' aria-label='Ventana de días'>
                    {VENTANAS.map(({ dias: valor }) => (
                        <button
                            key={valor}
                            type='button'
                            role='radio'
                            aria-checked={dias === valor}
                            className={dias === valor ? styles.segmentoActivo : ''}
                            onClick={() => setDias(valor)}
                        >
                            {valor} d
                        </button>
                    ))}
                </div>
            </header>

            <div className={styles.stdCuerpo}>
                <span className={styles.cifraGrande}>{Math.round(contados)}</span>
                <span className={styles.stdTexto}>
                    {enVentana.length === 1 ? 'creado' : 'creados'}
                    <br />por {personas} {personas === 1 ? 'persona' : 'personas'}
                </span>
                <Sparkline valores={serie} />
            </div>

            <p className={styles.stdPie}>
                {filas === null ? 'Cargando…' : (
                    <>
                        {reales.length} en total
                        {ultimo && ` · Último: ${ultimo.nombre}, ${dayjs(ultimo.created_at).format('D MMM')}`}
                        {pruebas > 0 && ` · excluye ${pruebas} de prueba`}
                    </>
                )}
            </p>
        </section>
    )
}

// ------------------------------------------------------------ Reportes ---

export const ReportesCard = ({ className, tickets, onNavigate }) => {
    const abiertos = useMemo(
        () => pendientes(tickets).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
        [tickets],
    )
    const contados = useContador(abiertos.length)

    return (
        <section className={`${styles.card} ${styles.cardFila} ${className ?? ''}`}>
            <h2 className={styles.label}>Reportes</h2>
            <span className={styles.cifraMedia}>{Math.round(contados)}</span>
            {tickets === null ? null : abiertos.length === 0 ? (
                <span className={`${styles.pill} ${styles.pillVerde}`}><i /> todo en orden</span>
            ) : (
                <span className={`${styles.pill} ${styles.pillAmbar}`}>
                    <i /> sin resolver · último {dayjs(abiertos[0].created_at).fromNow()}
                </span>
            )}
            <button type='button' className={`${styles.enlace} ${styles.alFinal}`} onClick={() => onNavigate('buzon', 'reportes')}>
                ver reportes
            </button>
        </section>
    )
}
