import { useMemo, useState } from 'react'
import { Tooltip, message } from 'antd'
import { ArrowUpRight, Copy, Mail, StickyNote } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { updateSupportTicket } from '../supportTicketsAdminApi'
import { ESTADOS, TEMAS } from '../supportTickets'
import styles from './NotificacionesSection.module.css'

dayjs.extend(relativeTime)
dayjs.locale('es')

// Reportes que mandan los organizadores con el botón de soporte del header
// (`support_tickets`). Cada uno se puede mover de estado, contestar por correo,
// abrir su evento y llevar una nota interna.

const FILTROS = [
    { key: 'open', label: 'Pendientes' },
    { key: 'in_progress', label: 'En curso' },
    { key: 'resolved', label: 'Resueltos' },
    { key: 'todos', label: 'Todos' },
]

const DASHBOARD_URL = 'https://www.iattend.site/dashboard?id='

const correoDeRespuesta = (ticket) => {
    const asunto = `Re: ${TEMAS[ticket.topic] ?? 'Tu reporte'} — I attend`
    const cita = ticket.body.split('\n').map(l => `> ${l}`).join('\n')
    const cuerpo = `Hola${ticket.user_name ? ` ${ticket.user_name.split(' ')[0]}` : ''},\n\n\n\n—\nTu mensaje del ${dayjs(ticket.created_at).format('D [de] MMMM')}:\n${cita}`
    return `mailto:${ticket.user_email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
}

const Ticket = ({ ticket, onActualizado }) => {
    const [guardando, setGuardando] = useState(false)
    const [editandoNota, setEditandoNota] = useState(false)
    const [nota, setNota] = useState(ticket.admin_note ?? '')

    const guardar = async (cambios, aviso) => {
        setGuardando(true)
        try {
            const { data } = await updateSupportTicket(ticket.id, cambios)
            onActualizado(data.ticket)
            if (aviso) message.success(aviso)
            return true
        } catch (error) {
            message.error(error?.response?.data?.msg || 'No se pudo actualizar el reporte')
            return false
        } finally {
            setGuardando(false)
        }
    }

    const guardarNota = async () => {
        if ((nota.trim() || null) === (ticket.admin_note ?? null)) return setEditandoNota(false)
        if (await guardar({ admin_note: nota }, 'Nota guardada')) setEditandoNota(false)
    }

    const copiar = async (texto) => {
        try {
            await navigator.clipboard.writeText(texto)
            message.success('Copiado')
        } catch { /* sin permiso de portapapeles */ }
    }

    return (
        <article className={styles.ticket} data-status={ticket.status}>
            <header className={styles.ticketHead}>
                <span className={`${styles.tema} ${styles[`tema_${ticket.topic}`] ?? ''}`}>{TEMAS[ticket.topic] ?? ticket.topic}</span>
                <Tooltip title={dayjs(ticket.created_at).format('D [de] MMMM YYYY, HH:mm')}>
                    <span className={styles.cuando}>{dayjs(ticket.created_at).fromNow()}</span>
                </Tooltip>
                {!ticket.email_sent && (
                    <Tooltip title='Se guardó, pero el correo a soporte no salió'>
                        <span className={styles.sinCorreo}>sin correo</span>
                    </Tooltip>
                )}
            </header>

            <p className={styles.cuerpo}>{ticket.body}</p>

            <div className={styles.remitente}>
                <span className={styles.remitenteNombre}>{ticket.user_name || 'Sin nombre'}</span>
                {ticket.user_email && <span>{ticket.user_email}</span>}
                {ticket.event_name && <span>· {ticket.event_name}</span>}
            </div>

            {(ticket.admin_note || editandoNota) && (
                editandoNota ? (
                    <div className={styles.notaEditor}>
                        <textarea
                            value={nota}
                            onChange={e => setNota(e.target.value)}
                            placeholder='Nota interna: qué se hizo, a quién se le pasó…'
                            rows={3}
                            maxLength={2000}
                            autoFocus
                            onKeyDown={e => {
                                if (e.key === 'Escape') { setNota(ticket.admin_note ?? ''); setEditandoNota(false) }
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) guardarNota()
                            }}
                        />
                        <div className={styles.notaAcciones}>
                            <button type='button' className={styles.accion} onClick={() => { setNota(ticket.admin_note ?? ''); setEditandoNota(false) }}>
                                Cancelar
                            </button>
                            <button type='button' className={`${styles.accion} ${styles.accionPrimaria}`} disabled={guardando} onClick={guardarNota}>
                                Guardar nota
                            </button>
                        </div>
                    </div>
                ) : (
                    <button type='button' className={styles.nota} onClick={() => setEditandoNota(true)}>
                        <StickyNote size={12} /> {ticket.admin_note}
                    </button>
                )
            )}

            <footer className={styles.ticketPie}>
                <div className={styles.estados} role='radiogroup' aria-label='Estado del reporte'>
                    {Object.entries(ESTADOS).map(([valor, label]) => (
                        <button
                            key={valor}
                            type='button'
                            role='radio'
                            aria-checked={ticket.status === valor}
                            className={`${styles.estado} ${ticket.status === valor ? styles.estadoActivo : ''}`}
                            disabled={guardando}
                            onClick={() => ticket.status !== valor && guardar({ status: valor })}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className={styles.acciones}>
                    {ticket.user_email && (
                        <a className={styles.accion} href={correoDeRespuesta(ticket)}>
                            <Mail size={13} /> Responder
                        </a>
                    )}
                    {ticket.invitation_id && (
                        <a className={styles.accion} href={`${DASHBOARD_URL}${ticket.invitation_id}`} target='_blank' rel='noreferrer'>
                            <ArrowUpRight size={13} /> Abrir evento
                        </a>
                    )}
                    {!ticket.admin_note && !editandoNota && (
                        <button type='button' className={styles.accion} onClick={() => setEditandoNota(true)}>
                            <StickyNote size={13} /> Nota
                        </button>
                    )}
                    {ticket.invitation_id && (
                        <Tooltip title='Copiar ID de la invitación'>
                            <button type='button' className={`${styles.accion} ${styles.accionIcono}`} aria-label='Copiar ID de la invitación' onClick={() => copiar(ticket.invitation_id)}>
                                <Copy size={13} />
                            </button>
                        </Tooltip>
                    )}
                </div>
            </footer>
        </article>
    )
}

export const NotificacionesSection = ({ tickets, cargando, error, onActualizado, query = '' }) => {
    const [filtro, setFiltro] = useState('open')

    const buscados = useMemo(() => {
        const texto = query.trim().toLowerCase()
        if (!texto) return tickets ?? []
        return (tickets ?? []).filter(t =>
            [t.body, t.user_name, t.user_email, t.event_name]
                .some(campo => String(campo ?? '').toLowerCase().includes(texto))
        )
    }, [tickets, query])

    const conteos = useMemo(() => FILTROS.reduce((acc, { key }) => {
        acc[key] = key === 'todos' ? buscados.length : buscados.filter(t => t.status === key).length
        return acc
    }, {}), [buscados])

    const visibles = filtro === 'todos' ? buscados : buscados.filter(t => t.status === filtro)

    return (
        <div className={styles.notificaciones}>
            <div className={styles.tabs}>
                {FILTROS.map(({ key, label }) => (
                    <button
                        key={key}
                        type='button'
                        className={`${styles.tab} ${filtro === key ? styles.tabActive : ''}`}
                        onClick={() => setFiltro(key)}
                    >
                        {label} {conteos[key]}
                    </button>
                ))}
            </div>

            {error ? (
                <div className={styles.vacio}>{error}</div>
            ) : cargando && !tickets ? (
                <div className={styles.vacio}>Cargando reportes…</div>
            ) : visibles.length === 0 ? (
                <div className={styles.vacio}>
                    {filtro === 'open' ? 'No hay reportes pendientes.' : 'No hay reportes aquí.'}
                </div>
            ) : (
                <div className={styles.lista}>
                    {visibles.map(ticket => (
                        <Ticket key={ticket.id} ticket={ticket} onActualizado={onActualizado} />
                    ))}
                </div>
            )}
        </div>
    )
}
