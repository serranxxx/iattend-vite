import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { message } from 'antd'
import { Info, MessageCircle, Pin, Trash2, Users } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { supabaseAuthHeaders } from '../../../lib/authHeaders'
import { emojiAsistente, fondoAsistente } from '../datosAsistentes'
import styles from './InteractionMenu.module.css'

/*
  Herramienta "Interacción" del panel lateral de un Flash (handoff "Editor —
  botón Interacción", opción 1c, llevado al sider para no tapar la pieza; se
  abre desde el riel o al elegir Asistentes en Capas o en la pieza): dos
  tarjetas (Lista de asistentes y Chat de invitados), cada una con su
  interruptor y sus opciones plegadas cuando está apagada.
  Los cambios van al Flash como todo lo demás del editor (se ven en la pieza
  al momento y se guardan con "Guardar"). Los mensajes del chat se piden al
  backend con la sesión del organizador (iattend--backend
  router/sideEventChat.js) y se mantienen al día con el aviso del canal
  side_chat_<id>.
*/

const API = import.meta.env.VITE_API_URL
const visto = (id) => `iattend_chat_mod_visto_${id}`

const Interruptor = ({ on }) => (
    <span className={`${styles.switch} ${on ? styles.switchOn : ''}`} aria-hidden><span /></span>
)

const marcarVisto = (eventoId) => localStorage.setItem(visto(eventoId), new Date().toISOString())

// Mensajes del chat para moderar (con la sesión del organizador) y su aviso en vivo.
const useMensajesChat = (eventoId, activo) => {
    const [mensajes, setMensajes] = useState(null)
    const cargar = useCallback(async () => {
        if (!eventoId) return
        try {
            const { data } = await axios.get(`${API}/api/side-events/${eventoId}/chat-moderacion`, { headers: await supabaseAuthHeaders() })
            setMensajes(data.mensajes ?? [])
        } catch {
            setMensajes((prev) => prev ?? [])
        }
    }, [eventoId])
    useEffect(() => {
        if (!activo || !eventoId) return
        cargar()
        const canal = supabase.channel(`side_chat_${eventoId}`)
            .on('broadcast', { event: 'cambio' }, () => cargar())
            .subscribe()
        return () => { supabase.removeChannel(canal) }
    }, [activo, eventoId, cargar])
    return { mensajes, setMensajes, cargar }
}

const estadoDe = (body) => {
    const asistentes = Boolean(body?.showAttendees)
    const chatVisible = asistentes && Boolean(body?.chat?.enabled)
    return { asistentes, chatVisible }
}

// Contenido de la herramienta "Interacción" del panel lateral.
export const InteractionPanel = ({ body, setBody, eventoId }) => {
    const { t } = useTranslation()
    const { asistentes, chatVisible } = estadoDe(body)
    const chat = Boolean(body?.chat?.enabled)
    const modo = body?.attendeesStyle === 'initials' ? 'initials' : 'emoji'
    const fijado = body?.chat?.pinned?.text ?? null
    const [borrador, setBorrador] = useState(fijado ?? '')
    const { mensajes, setMensajes, cargar } = useMensajesChat(eventoId, chatVisible)
    const [todos, setTodos] = useState(false)
    const [saliendo, setSaliendo] = useState(null)

    const setChat = (patch) => setBody({ chat: { ...(body?.chat ?? {}), ...patch } })

    // Abierto: se marca visto (apaga el punto de "nuevos" del botón).
    useEffect(() => { if (eventoId) marcarVisto(eventoId) }, [eventoId])
    useEffect(() => { if (eventoId && mensajes?.length) marcarVisto(eventoId) }, [mensajes])
    // Lo guardado cambia (deshacer, otro dispositivo): el borrador lo sigue.
    useEffect(() => { setBorrador(fijado ?? '') }, [fijado])
    const borrar = async (m) => {
        setSaliendo(m.id)
        await new Promise((r) => setTimeout(r, 150))
        setMensajes((prev) => (prev ?? []).filter((x) => x.id !== m.id))
        setSaliendo(null)
        try {
            await axios.delete(`${API}/api/side-events/${eventoId}/chat/${m.id}`, { headers: await supabaseAuthHeaders() })
        } catch {
            message.error(t('side_events.chat_mod_error'))
            cargar()
            return
        }
        const clave = `borrado-${m.id}`
        message.open({
            key: clave,
            duration: 5,
            content: (
                <span className={styles.toast}>
                    {t('side_events.int_deleted')}
                    <button
                        type="button"
                        onClick={async () => {
                            message.destroy(clave)
                            try {
                                await axios.post(`${API}/api/side-events/${eventoId}/chat/${m.id}/restaurar`, {}, { headers: await supabaseAuthHeaders() })
                            } finally {
                                cargar()
                            }
                        }}
                    >
                        {t('side_events.int_undo')}
                    </button>
                </span>
            ),
        })
    }

    const recortado = borrador.trim()
    const cambiado = recortado !== (fijado ?? '')
    const etiquetaFijar = fijado && !cambiado ? t('side_events.int_pinned') : fijado ? t('side_events.int_update') : t('side_events.int_pin')
    const estadoFijado = fijado
        ? (cambiado ? t('side_events.int_pin_dirty') : t('side_events.int_pin_visible'))
        : (recortado ? t('side_events.int_pin_dirty') : t('side_events.int_pin_none'))

    const lista = mensajes ?? []
    const visibles = todos ? lista : lista.slice(0, 20)

    return (
        <div className={styles.panel} role="dialog" aria-label={t('side_events.int_title')} onMouseDown={(e) => e.stopPropagation()}>
            {/* A — Lista de asistentes */}
            <section className={styles.card}>
                <button type="button" className={styles.cardHead} role="switch" aria-checked={asistentes} onClick={() => setBody({ showAttendees: asistentes ? undefined : true })}>
                    <span className={styles.cardIcon}><Users size={18} strokeWidth={1.9} /></span>
                    <span className={styles.cardCol}>
                        <span className={styles.cardTitle}>{t('side_events.int_attendees')}</span>
                        <span className={styles.cardSub}>{t('side_events.int_attendees_sub')}</span>
                    </span>
                    <Interruptor on={asistentes} />
                </button>
                <div className={styles.collapse} style={{ gridTemplateRows: asistentes ? '1fr' : '0fr' }}>
                    <div>
                        <div className={styles.row}>
                            <span className={styles.rowLabel}>{t('side_events.int_avatars')}</span>
                            <div className={styles.segmented} role="radiogroup" aria-label={t('side_events.int_avatars')}>
                                <button type="button" role="radio" aria-checked={modo === 'emoji'} className={modo === 'emoji' ? styles.segOn : ''} onClick={() => setBody({ attendeesStyle: undefined })}>
                                    😀 {t('side_events.att_style_emoji')}
                                </button>
                                <button type="button" role="radio" aria-checked={modo === 'initials'} className={modo === 'initials' ? styles.segOn : ''} onClick={() => setBody({ attendeesStyle: 'initials' })}>
                                    AB {t('side_events.att_style_initials')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* B — Chat de invitados (vive en la tarjeta de asistentes: sin ella, no hay chat) */}
            <section className={styles.card}>
                <button
                    type="button"
                    className={styles.cardHead}
                    role="switch"
                    aria-checked={chatVisible}
                    aria-disabled={!asistentes || undefined}
                    data-off={!asistentes || undefined}
                    onClick={() => { if (asistentes) setChat({ enabled: chat ? undefined : true }) }}
                >
                    <span className={styles.cardIcon}><MessageCircle size={18} strokeWidth={1.9} /></span>
                    <span className={styles.cardCol}>
                        <span className={styles.cardTitle}>{t('side_events.int_chat')}</span>
                        <span className={styles.cardSub}>{asistentes ? t('side_events.int_chat_sub') : t('side_events.int_chat_needs')}</span>
                    </span>
                    <Interruptor on={chatVisible} />
                </button>
                <div className={styles.collapse} style={{ gridTemplateRows: chatVisible ? '1fr' : '0fr' }}>
                    <div>
                        <div className={styles.chatBody}>
                            <div className={styles.block}>
                                <span className={styles.rowLabel}><Pin size={14} />{t('side_events.chat_pin_title')}</span>
                                <div className={styles.pinRow}>
                                    <textarea
                                        className={styles.textarea}
                                        value={borrador}
                                        maxLength={200}
                                        placeholder={t('side_events.int_pin_placeholder')}
                                        onChange={(e) => setBorrador(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className={styles.darkBtn}
                                        disabled={!cambiado || !recortado}
                                        onClick={() => setChat({ pinned: { text: recortado, updated_at: new Date().toISOString() } })}
                                    >
                                        {etiquetaFijar}
                                    </button>
                                </div>
                                <div className={styles.pinMeta}>
                                    <span>{estadoFijado}</span>
                                    {fijado && (
                                        <button type="button" className={styles.textBtn} onClick={() => { setChat({ pinned: null }); setBorrador('') }}>
                                            {t('side_events.chat_pin_remove')}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className={styles.blockTight}>
                                <span className={styles.rowLabel}>{t('side_events.int_last', { n: lista.length })}</span>
                                <div className={styles.msgs}>
                                    {mensajes === null && <span className={styles.empty}>…</span>}
                                    {mensajes !== null && lista.length === 0 && <span className={styles.empty}>{t('side_events.int_no_messages')}</span>}
                                    {visibles.map((m) => {
                                        const a = { id: m.autorId ?? m.id, emoji: m.emoji ?? null, perfil: m.perfil ?? null }
                                        const iniciales = String(m.autor ?? '').trim().split(/\s+/).map((p) => p.match(/\p{L}/u)?.[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                                        return (
                                            <div key={m.id} className={styles.msg} data-saliendo={saliendo === m.id || undefined}>
                                                <span className={styles.msgAv} style={{ background: fondoAsistente(a, modo) }}>
                                                    {modo === 'initials' ? iniciales : emojiAsistente(a)}
                                                </span>
                                                <span className={styles.msgText}><b>{String(m.autor ?? '').split(' ')[0]}</b> {m.text}</span>
                                                <button type="button" className={styles.del} aria-label={t('side_events.chat_mod_delete')} onClick={() => borrar(m)}>
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        )
                                    })}
                                    {!todos && lista.length > 20 && (
                                        <button type="button" className={styles.verTodos} onClick={() => setTodos(true)}>{t('side_events.int_see_all')}</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className={styles.foot}><Info size={14} />{t('side_events.int_foot')}</div>
        </div>
    )
}
