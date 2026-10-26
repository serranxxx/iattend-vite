import { useMemo, useState } from 'react'
import { message } from 'antd'
import { ChevronLeft, Link, Loader2, Plus, Search, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from './ListaInvitadosFlash.module.css'

/*
  Lista de invitados de un Evento Flash en el editor móvil "story"
  (handoff design_handoff_flash_guest_list). Página completa encima del
  editor: entra deslizando y el editor se queda montado debajo, así que no
  se pierde nada sin guardar.

  Cada fila es una invitación: el titular (sin `companion_id`) con sus
  acompañantes como lugares. El estado es el del titular: confirmado →
  Asistirá, rechazado → No asistirá, lo demás (creado, esperando) →
  Pendiente. Los contadores son el total del evento y además filtran (uno a
  la vez; tocar el activo lo quita). El código solo se muestra si el evento
  es privado: en uno público se entra sin código.

  Envío por WhatsApp (`envio(g)`, lo arma SideEvents con el envío de
  siempre): sin mandar → botón "Enviar" en lugar de la píldora; enviada →
  píldora "Pendiente" y el estado del envío en el subtexto; si falló →
  "Reintentar". Bloqueado (número no nacional o sin créditos) se ve apagado
  y al tocarlo explica por qué.
*/

const estadoDe = (g) => (g.state === 'confirmado' ? 'yes' : g.state === 'rechazado' ? 'no' : 'pending')

const iniciales = (nombre = '') => nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

const CONTADORES = [
    { key: 'yes', label: 'side_events.guestlist_attending' },
    { key: 'pending', label: 'side_events.guestlist_pending' },
    { key: 'no', label: 'side_events.guestlist_declined' },
]

const PILDORA = {
    yes: 'side_events.guestlist_status_yes',
    pending: 'side_events.guestlist_status_pending',
    no: 'side_events.guestlist_status_no',
}

export const ListaInvitadosFlash = ({
    open,
    onClose,
    invitados = [],
    nombreEvento,
    esPublico,
    onCompartir,
    onAgregar,
    onAbrirInvitado,
    envio = () => null,
    onTouchStart,
    onTouchEnd,
}) => {
    const { t } = useTranslation()
    const [filtro, setFiltro] = useState(null)
    const [busqueda, setBusqueda] = useState('')
    const [enviando, setEnviando] = useState(null)

    const enviar = async (e, g, accion) => {
        e.stopPropagation()
        if (accion.motivo) return message.info(accion.motivo)
        if (enviando) return
        setEnviando(g.id)
        try {
            await accion.enviar()
        } catch {
            message.error(t('side_events.flash_send_error'))
        } finally {
            setEnviando(null)
        }
    }

    const invitaciones = useMemo(() => {
        const titulares = invitados.filter((g) => g.companion_id === null || g.companion_id === undefined)
        return titulares.map((g) => ({
            ...g,
            estado: estadoDe(g),
            lugares: 1 + invitados.filter((c) => c.companion_id != null && String(c.companion_id) === String(g.id)).length,
        }))
    }, [invitados])

    const conteo = useMemo(() => invitaciones.reduce(
        (acc, g) => ({ ...acc, [g.estado]: acc[g.estado] + 1 }),
        { yes: 0, pending: 0, no: 0 },
    ), [invitaciones])

    const texto = busqueda.trim().toLowerCase()
    const visibles = invitaciones.filter((g) => (!filtro || g.estado === filtro)
        && (!texto || String(g.name ?? '').toLowerCase().includes(texto)))

    return (
        <div
            className={`${styles.pagina} ${open ? styles.abierta : ''}`}
            aria-hidden={!open}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            <div className={styles.cabecera}>
                <button className={styles.redondo} onClick={onClose} aria-label={t('side_events.back')}>
                    <ChevronLeft size={22} strokeWidth={1.8} />
                </button>
                <div className={styles.titulos}>
                    <span className={styles.titulo}>{t('side_events.guestlist_title')}</span>
                    <span className={styles.subtitulo}>
                        {nombreEvento ? `${nombreEvento} · ` : ''}{t('side_events.guestlist_count', { count: invitaciones.length })}
                    </span>
                </div>
                <button className={styles.redondo} onClick={onCompartir} aria-label={t('side_events.story_share')}>
                    <Link size={18} strokeWidth={1.8} />
                </button>
            </div>

            <div className={styles.contadores}>
                {CONTADORES.map((c) => (
                    <button
                        key={c.key}
                        className={`${styles.contador} ${filtro === c.key ? styles.contadorActivo : ''}`}
                        onClick={() => setFiltro((f) => (f === c.key ? null : c.key))}
                        aria-pressed={filtro === c.key}
                    >
                        <span className={styles.contadorNumero}>{conteo[c.key]}</span>
                        <span className={styles.contadorEtiqueta}>{t(c.label)}</span>
                    </button>
                ))}
            </div>

            <div className={styles.buscadorCont}>
                <label className={styles.buscador}>
                    <Search size={17} />
                    <input
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder={t('side_events.guestlist_search')}
                        type='search'
                        enterKeyHint='search'
                    />
                </label>
            </div>

            <div className={styles.lista}>
                {invitaciones.length === 0
                    ? <p className={styles.vacio}>{t('side_events.guestlist_none')}</p>
                    : visibles.length === 0
                        ? <p className={styles.vacio}>{t('side_events.guestlist_empty')}</p>
                        : visibles.map((g) => {
                            const accion = envio(g)
                            return (
                            <div
                                key={g.id}
                                role='button'
                                tabIndex={0}
                                className={styles.fila}
                                onClick={() => onAbrirInvitado(g)}
                                onKeyDown={(e) => { if (e.key === 'Enter') onAbrirInvitado(g) }}
                            >
                                <span className={styles.avatar}>{iniciales(g.name)}</span>
                                <span className={styles.identidad}>
                                    <span className={styles.nombre}>{g.name}</span>
                                    <span className={styles.sub}>
                                        {t('side_events.guestlist_seat', { count: g.lugares })}
                                        {!esPublico && g.password ? ` · ${t('side_events.guestlist_code', { code: g.password })}` : ''}
                                        {accion?.estado ? ` · ${accion.estado}` : ''}
                                    </span>
                                </span>
                                {accion?.tipo
                                    ? (
                                        <button
                                            type='button'
                                            className={`${styles.enviar} ${accion.tipo === 'reintentar' ? styles.reintentar : ''}`}
                                            aria-disabled={!!accion.motivo || enviando === g.id}
                                            onClick={(e) => enviar(e, g, accion)}
                                        >
                                            {enviando === g.id
                                                ? <Loader2 size={14} className={styles.girando} />
                                                : <Send size={14} />
                                            }
                                            {t(accion.tipo === 'reintentar' ? 'side_events.msg_retry' : 'side_events.guestlist_send')}
                                        </button>
                                    )
                                    : <span className={`${styles.pildora} ${styles[`pildora_${g.estado}`]}`}>{t(PILDORA[g.estado])}</span>
                                }
                            </div>
                            )
                        })
                }
            </div>

            <div className={styles.pie}>
                <button className={styles.agregar} onClick={onAgregar}>
                    <Plus size={18} strokeWidth={2.2} />
                    {t('side_events.guestlist_add')}
                </button>
            </div>
        </div>
    )
}
