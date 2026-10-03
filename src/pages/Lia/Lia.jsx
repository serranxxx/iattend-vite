import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Input } from 'antd'
import { SendHorizontal, ThumbsUp, ThumbsDown, RotateCcw, Minus, Plus, Copy, Check, Maximize2, Minimize2, Lock } from 'lucide-react'
import axios from 'axios'
import { useLia } from '../../context/LiaContext'
import { supabase } from '../../lib/supabase'
import { liaHeaders, leerSSE } from './liaApi'
import { LiaBlocks } from './LiaBlocks'
import { DESTINOS } from './liaDestinos'
import './lia.css'

const API = import.meta.env.VITE_API_URL

// Si Lia no termina en este tiempo se corta la petición: sin esto un stream
// colgado dejaba el chat bloqueado para siempre.
const TIMEOUT_MS = 60 * 1000

// Los textos de los atajos viven en `lia.prompts` de los locales. La analítica
// del admin (analiticaCalculos.js, esAtajoDeLia) los lee de ahí para separar
// clics de preguntas escritas: no escribirlos a mano en otro lado.
const CTAS = ['summary', 'notifications', 'new_messages', 'pending', 'table_space']

const getPageLabel = (pathname, t) => {
    if (pathname.includes('/build')) return t('lia.page_build')
    if (pathname.includes('/guests')) return t('lia.page_guests')
    if (pathname.includes('/side')) return t('lia.page_side')
    return t('lia.page_dashboard')
}

const buildPromptMenu = (event, t) => {
    const [owner1, owner2] = (event?.owners || []).filter(Boolean)
    const p = (key, vars) => t(`lia.prompts.${key}`, vars)

    return [
        {
            category: t('lia.menu_how'),
            prompts: [
                p('summary'),
                p('passes'),
                p('pct_confirmed'),
                owner1 && owner2 ? p('sides', { a: owner1, b: owner2 }) : null,
                p('priority_a'),
            ].filter(Boolean),
        },
        {
            category: t('lia.menu_guests'),
            prompts: [p('seen'), p('undelivered'), p('no_table'), p('kids')],
        },
        {
            category: t('lia.menu_messages'),
            prompts: [p('unread'), p('last_message')],
        },
        {
            category: t('lia.menu_side'),
            prompts: [p('my_side_events'), p('side_confirmed'), p('side_pending')],
        },
    ]
}

// ── Helpers ──────────────────────────────────────────────────

const renderMarkdown = (text) => {
    const parseInline = (str) =>
        str.split(/(\*\*[^*]+\*\*|\*[^*]+\*|https?:\/\/[^\s]+)/g).map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**'))
                return <strong key={i}>{part.slice(2, -2)}</strong>
            if (part.startsWith('*') && part.endsWith('*'))
                return <em key={i}>{part.slice(1, -1)}</em>
            if (/^https?:\/\//.test(part))
                return <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
            return part
        })

    const lines = text.split('\n')
    const out = []
    let buf = []

    const flush = () => {
        if (!buf.length) return
        out.push(<ul key={`ul-${out.length}`}>{buf.map((item, i) => <li key={i}>{parseInline(item)}</li>)}</ul>)
        buf = []
    }

    lines.forEach((line, i) => {
        if (/^[-*] /.test(line)) { buf.push(line.slice(2)); return }
        flush()
        if (line.trim() === '') { if (out.length) out.push(<br key={`br-${i}`} />); return }
        out.push(<p key={`p-${i}`}>{parseInline(line)}</p>)
    })
    flush()
    return out
}

// ── Sub-components ───────────────────────────────────────────

const LiaMark = () => <span className="lia-mark" aria-hidden="true">✦</span>

const TypingIndicator = ({ label }) => (
    <div className="lia-turn lia-turn--typing" role="status" aria-label={label || undefined}>
        <LiaMark />
        <div className="lia-typing">
            <div className="lia-typing-dots">
                <span className="lia-typing-dot" />
                <span className="lia-typing-dot" />
                <span className="lia-typing-dot" />
            </div>
            {label && <span className="lia-typing-label">{label}</span>}
        </div>
    </div>
)

const IconButton = ({ icon, label, pressed, className = '', ...props }) => (
    <button
        type="button"
        className={`lia-icon-btn${pressed ? ' is-pressed' : ''} ${className}`}
        title={label}
        aria-label={label}
        aria-pressed={pressed}
        {...props}
    >
        {icon}
    </button>
)

// Las respuestas de Lia no van en burbuja: texto y bloques usan todo el ancho
// junto a su marca. Solo los mensajes del organizador llevan burbuja.
const MessageBubble = ({ msg, onFeedback, onFeedbackNote, onActionFeedback, onAtajo, t }) => {
    const isUser = msg.role === 'user'
    const safeContent = typeof msg.content === 'string'
        ? msg.content
        : JSON.stringify(msg.content)

    const isPositive = msg.feedback === 'positive' || msg.feedback === 'correct'
    const isNegative = msg.feedback === 'negative' || msg.feedback === 'incorrect'

    const [copied, setCopied] = useState(false)
    const handleCopy = () => {
        navigator.clipboard.writeText(safeContent)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
    }

    const handleThumbUp = () => msg.action_id
        ? onActionFeedback(msg.action_id, 'correct')
        : onFeedback(msg.message_id, 'positive')

    const handleThumbDown = () => msg.action_id
        ? onActionFeedback(msg.action_id, 'incorrect')
        : onFeedback(msg.message_id, 'negative')

    // Mientras llega el primer pedazo del stream no hay nada que mostrar:
    // el indicador de "escribiendo" ocupa su lugar.
    if (msg.streaming && !safeContent && !msg.blocks?.length) return null

    if (isUser) return (
        <div className="lia-turn lia-turn--user">
            <div className="lia-bubble">{safeContent}</div>
        </div>
    )

    return (
        <div className="lia-turn">
            <LiaMark />
            <div className="lia-answer">
                {safeContent && <div className="lia-answer-text">{renderMarkdown(safeContent)}</div>}
                <LiaBlocks blocks={msg.blocks} onAtajo={onAtajo} />
                {!msg.streaming && (msg.message_id || msg.action_id) && (
                    <>
                        <div className="lia-answer-tools">
                            <IconButton icon={<ThumbsUp size={14} />} label={t('lia.feedback_good')} pressed={isPositive} onClick={handleThumbUp} />
                            <IconButton icon={<ThumbsDown size={14} />} label={t('lia.feedback_bad')} pressed={isNegative} onClick={handleThumbDown} />
                            <IconButton
                                icon={copied ? <Check size={14} /> : <Copy size={14} />}
                                label={t('lia.copy')}
                                className={copied ? 'is-done' : ''}
                                onClick={handleCopy}
                            />
                        </div>
                        {msg.showFeedbackInput && msg.message_id && (
                            <Input.TextArea
                                className="lia-feedback-note"
                                placeholder={t('lia.feedback_placeholder')}
                                aria-label={t('lia.feedback_placeholder')}
                                autoSize={{ minRows: 1, maxRows: 3 }}
                                onPressEnter={(e) => {
                                    if (e.shiftKey) return
                                    e.preventDefault()
                                    onFeedbackNote(msg.message_id, e.target.value)
                                }}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

const ActionCard = ({ action, onApprove, onStartReject, onConfirmReject, onCancelReject, isRejecting, rejectNote, onRejectNoteChange, busy, t }) => (
    <div className="lia-action-card" role="group" aria-label={t('lia.approval_title')}>
        <span className="lia-action-eyebrow">✦ {t('lia.approval_title')}</span>
        <span className="lia-action-text">{action.preview_text}</span>
        {isRejecting && (
            <Input.TextArea
                className="lia-feedback-note"
                placeholder={t('lia.reject_placeholder')}
                aria-label={t('lia.reject_placeholder')}
                autoSize={{ minRows: 1, maxRows: 2 }}
                value={rejectNote}
                onChange={(e) => onRejectNoteChange(e.target.value)}
            />
        )}
        <div className="lia-action-buttons">
            {isRejecting ? (
                <>
                    <button type="button" className="lia-pill-btn lia-pill-btn--ghost" disabled={busy} onClick={onCancelReject}>
                        {t('lia.back')}
                    </button>
                    <button type="button" className="lia-pill-btn lia-pill-btn--primary" disabled={busy} onClick={() => onConfirmReject(action, rejectNote)}>
                        {t('lia.confirm')}
                    </button>
                </>
            ) : (
                <>
                    <button type="button" className="lia-pill-btn lia-pill-btn--ghost" disabled={busy} onClick={() => onStartReject(action)}>
                        {t('lia.cancel')}
                    </button>
                    <button type="button" className="lia-pill-btn lia-pill-btn--primary" disabled={busy} aria-busy={busy} onClick={() => onApprove(action)}>
                        {t('lia.approve')}
                    </button>
                </>
            )}
        </div>
    </div>
)

// Tokens del día con etiqueta: anillo + "36 de 50 hoy". El anillo es lo que
// queda disponible (gratis del día + comprados); si solo contara los gratis,
// con la cuota agotada y saldo comprado se vería vacío aunque Lia responda.
const TokenPill = ({ freeRemaining, freeLimit, paidBalance, t }) => {
    const [hovered, setHovered] = useState(false)
    const disponible = freeRemaining + paidBalance
    const capacidad = freeLimit + paidBalance
    const pct = capacidad > 0 ? Math.max(0, Math.min(1, disponible / capacidad)) : 1
    const size = 16
    const stroke = 2.5
    const radius = (size - stroke) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference * (1 - pct)
    // Lila de Lia; en rojo suave cuando queda poco
    const color = pct > 0.2 ? 'var(--brand-color-800, #E0D3E8)' : '#E57373'

    const resumen = `${freeRemaining} ${t('lia.tokens_today', { limit: freeLimit })}${paidBalance > 0 ? ` · +${paidBalance} ${t('lia.tokens_bought')}` : ''}`

    return (
        <div
            className="lia-token-pill"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            tabIndex={0}
            role="img"
            aria-label={resumen}
        >
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--text-color-20)" strokeWidth={stroke} />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.4s ease' }}
                />
            </svg>
            <span aria-hidden="true">
                {t('lia.tokens_pill', { n: freeRemaining, limit: freeLimit })}
                {paidBalance > 0 && <span className="lia-token-extra"> +{paidBalance}</span>}
            </span>
            {hovered && (
                <div className="lia-token-tooltip">
                    <div className="lia-token-tooltip-row">
                        <span className="lia-token-tooltip-dot" style={{ background: color }} />
                        <span><strong>{freeRemaining}</strong> <span className="lia-token-tooltip-muted">{t('lia.tokens_today', { limit: freeLimit })}</span></span>
                    </div>
                    {paidBalance > 0 && (
                        <div className="lia-token-tooltip-row">
                            <span className="lia-token-tooltip-dot" />
                            <span><strong>+{paidBalance}</strong> <span className="lia-token-tooltip-muted">{t('lia.tokens_bought')}</span></span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// Los paquetes salen del backend (GET /api/ai/credits/packages/list), que es
// también el único que acepta el canje: no se repiten aquí.
const NoCreditsScreen = ({ invitationId, onPurchaseSuccess }) => {
    const { t } = useTranslation()
    const [iattendBalance, setIattendBalance] = useState(null)
    const [packages, setPackages] = useState(null)
    const [purchasing, setPurchasing] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        fetch(`${API}/api/ai/credits/packages/list`)
            .then(res => res.json())
            .then(data => setPackages((data.packages ?? []).map(p => ({ aiCredits: p.ai_credits, iattendCost: p.iattend_cost }))))
            .catch(() => setPackages([]))
    }, [])

    useEffect(() => {
        const fetchBalance = async () => {
            const { data } = await supabase
                .from('invitations')
                .select('credits')
                .eq('id', invitationId)
                .single()
            if (data) setIattendBalance(data.credits ?? 0)
        }
        fetchBalance()
    }, [invitationId])

    const handlePurchase = async (pkg) => {
        setPurchasing(pkg.aiCredits)
        setError('')
        try {
            const res = await fetch(`${API}/api/ai/credits/purchase`, {
                method: 'POST',
                headers: await liaHeaders(),
                body: JSON.stringify({ invitation_id: invitationId, ai_credits: pkg.aiCredits }),
            })
            const data = await res.json().catch(() => ({}))
            if (res.ok && data.success) {
                setIattendBalance(data.iattend_credits)
                onPurchaseSuccess()
            } else {
                setError(data.message || t('lia.nc_error'))
            }
        } catch {
            setError(t('lia.nc_connect_error'))
        } finally {
            setPurchasing(null)
        }
    }

    return (
        <div className="lia-no-credits">
            <div className="lia-no-credits-top">
                <span className="lia-no-credits-star" aria-hidden="true">✦</span>
                <p className="lia-no-credits-title">{t('lia.nc_title')}</p>
                <p className="lia-no-credits-sub">{t('lia.nc_sub')}</p>
            </div>

            <div className="lia-no-credits-packages">
                <p className="lia-no-credits-section-label">{t('lia.nc_section')}</p>
                {iattendBalance !== null && (
                    <p className="lia-no-credits-balance">{t('lia.nc_balance', { n: iattendBalance })}</p>
                )}
                <div className="lia-credit-pkg-list">
                    {packages === null && <p className="lia-no-credits-balance">{t('lia.nc_loading')}</p>}
                    {packages?.length === 0 && <p className="lia-no-credits-error">{t('lia.nc_failed')}</p>}
                    {(packages ?? []).map(pkg => {
                        const canAfford = iattendBalance === null || iattendBalance >= pkg.iattendCost
                        const isLoading = purchasing === pkg.aiCredits
                        return (
                            <div key={pkg.aiCredits} className={`lia-credit-pkg${!canAfford ? ' lia-credit-pkg--disabled' : ''}`}>
                                <div className="lia-credit-pkg-left">
                                    <span className="lia-credit-pkg-ai">{t('lia.nc_pkg', { n: pkg.aiCredits })}</span>
                                    <span className="lia-credit-pkg-cost">{t('lia.nc_cost', { n: pkg.iattendCost })}</span>
                                </div>
                                <Button
                                    className={canAfford ? 'primarybutton--active' : 'primarybutton'}
                                    size="small"
                                    style={{ borderRadius: 99, minWidth: 72 }}
                                    disabled={!canAfford || purchasing !== null}
                                    loading={isLoading}
                                    onClick={() => handlePurchase(pkg)}
                                >
                                    {canAfford ? t('lia.nc_buy') : t('lia.nc_no_balance')}
                                </Button>
                            </div>
                        )
                    })}
                </div>
                {error && <p className="lia-no-credits-error" role="alert">{error}</p>}
            </div>
        </div>
    )
}

const ErrorState = ({ icon = '⚠️', message }) => (
    <div className="lia-error-state" role="alert">
        <div className="lia-error-icon" aria-hidden="true">{icon}</div>
        <span>{message}</span>
    </div>
)

// ── Main component ───────────────────────────────────────────

export default function Lia({ id: idProp, onMinimize, expanded = false, onToggleExpand }) {
    const { t, i18n } = useTranslation()
    const [searchParams] = useSearchParams()
    const { pathname } = useLocation()
    const id = idProp ?? searchParams.get('id')
    const navigate = useNavigate()
    const pageLabel = getPageLabel(pathname, t)
    const { setUiAction } = useLia()

    const [messages, setMessages] = useState([])
    const [pendingActions, setPendingActions] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    // Mientras Lia consulta datos (tool_start) se muestra un texto junto al
    // indicador: sin streaming de tokens, varios segundos de puntitos solos.
    const [working, setWorking] = useState(false)
    const [credits, setCredits] = useState(null)
    // null = todavía no se sabe. Lo decide el backend (plans.features 'lia'),
    // no una comparación con 'pro' en el cliente.
    const [liaIncluded, setLiaIncluded] = useState(null)
    const [sessionId, setSessionId] = useState(() => crypto.randomUUID())
    const [rejectingActionId, setRejectingActionId] = useState(null)
    const [busyActionId, setBusyActionId] = useState(null)
    const [rejectNote, setRejectNote] = useState('')
    const [conversationStarted, setConversationStarted] = useState(false)
    const [greetingText, setGreetingText] = useState('')
    const [showPromptMenu, setShowPromptMenu] = useState(false)
    const [eventData, setEventData] = useState(null)

    const bottomRef = useRef(null)
    const messagesRef = useRef(null)
    const textareaRef = useRef(null)
    const promptMenuRef = useRef(null)
    const abortRef = useRef(null)
    const sendingRef = useRef(false)

    const locked = liaIncluded === false

    // Cada mensaje del organizador y cada pedazo de la respuesta de Lia llevan
    // la conversación al final. Se mueve el contenedor directamente: con
    // scrollIntoView suave, cada chunk del stream interrumpía la animación
    // anterior y nunca llegaba abajo. Mientras Lia escribe el salto es
    // instantáneo; con un mensaje completo, suave. El rAF espera a que se
    // pinte el contenido nuevo (texto o bloques) para medir su altura real.
    useEffect(() => {
        if (!conversationStarted) return
        const el = messagesRef.current
        if (!el) return
        const frame = requestAnimationFrame(() => {
            el.scrollTo({ top: el.scrollHeight, behavior: loading ? 'auto' : 'smooth' })
        })
        return () => cancelAnimationFrame(frame)
    }, [messages, pendingActions, loading, working, conversationStarted])

    // Al desmontar (cerrar el panel) se corta la respuesta en curso.
    useEffect(() => () => abortRef.current?.abort('unmount'), [])

    // El textarea se deshabilita mientras Lia responde y pierde el foco; en
    // escritorio se le regresa para seguir escribiendo (en móvil abriría el
    // teclado sin que lo pidan).
    useEffect(() => {
        if (loading || !conversationStarted) return
        if (window.matchMedia?.('(pointer: fine)').matches) textareaRef.current?.focus()
    }, [loading])

    const fetchCredits = async () => {
        try {
            const res = await fetch(`${API}/api/ai/credits/${id}`, { headers: await liaHeaders() })
            const data = await res.json()
            if (data.success) {
                setCredits({
                    total_available: data.credits_remaining,
                    free_remaining: data.free_remaining,
                    free_limit: data.free_limit,
                    paid_balance: data.paid_balance,
                    pct_free_used: data.pct_free_used,
                })
            }
        } catch (err) {
            console.error('No se pudieron leer los créditos de Lia:', err)
        }
    }

    // Las ui_actions las ejecuta GuestsPage: si el organizador está en otra
    // pantalla, se le lleva a Invitados para que la acción se vea.
    const dispatchUiActions = (actions) => {
        if (!actions?.length) return
        actions.forEach(action => setUiAction(action))
        if (!pathname.startsWith('/dashboard/guests')) navigate(`/dashboard/guests?id=${id}`)
    }

    // Botón de atajo de un bloque: lleva a la pantalla y, si hace falta, deja
    // una ui_action para que GuestsPage abra la pestaña, el formulario o las
    // mesas. En mobile el chat tapa toda la pantalla, así que se minimiza.
    const handleAtajo = (destino) => {
        const d = DESTINOS[destino]
        if (!d) return
        if (d.uiAction) setUiAction(d.uiAction)
        navigate(d.sinId ? d.path : `${d.path}?id=${id}`)
        if (window.innerWidth <= 480) onMinimize?.()
    }

    useEffect(() => {
        if (!id) return
        callGreeting()
        fetchCredits()
    }, [])

    const callGreeting = async () => {
        setLoading(true)
        try {
            const { data } = await axios.post(`${API}/api/ai/greeting`, {
                invitation_id: id,
                session_id: sessionId,
                lang: i18n.language,
            }, { headers: await liaHeaders() })
            setGreetingText(String(data.greeting_text || ''))
            setEventData(data.event_summary?.event || null)
            if (typeof data.lia_included === 'boolean') setLiaIncluded(data.lia_included)
        } catch {
            setGreetingText(t('lia.greeting_fallback'))
        } finally {
            setLoading(false)
        }
    }

    // Reemplaza (o quita, con null) el mensaje que se está transmitiendo.
    const setStreamingMessage = (message) => setMessages(prev => {
        const idx = prev.findIndex(m => m.streaming)
        if (idx === -1) return message ? [...prev, message] : prev
        const next = [...prev]
        if (message) next[idx] = message
        else next.splice(idx, 1)
        return next
    })

    const handleSendMessage = async (text) => {
        const textToSend = (typeof text === 'string' ? text : input).trim()
        // El ref evita el doble envío de dos clics en el mismo tick, antes de
        // que `loading` llegue a renderizarse.
        if (!textToSend || loading || locked || sendingRef.current) return
        sendingRef.current = true

        if (!conversationStarted) setConversationStarted(true)
        setInput('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'

        // Los errores locales no son del modelo: reenviarlos le haría creer
        // que él los escribió.
        // historyContent = texto + resumen de los bloques: sin eso, Lia no
        // sabría a quién acaba de mostrar en una lista.
        const history = messages
            .filter(m => !m.local && !m.streaming)
            .slice(-6)
            .map(({ role, content, historyContent }) => ({ role, content: historyContent ?? content }))

        setMessages(prev => [...prev,
        { role: 'user', content: textToSend },
        { role: 'assistant', content: '', streaming: true },
        ])
        setLoading(true)
        setWorking(false)

        const ctrl = new AbortController()
        abortRef.current = ctrl
        const timer = setTimeout(() => ctrl.abort('timeout'), TIMEOUT_MS)

        let texto = ''
        let blocks = []
        let final = null
        let failed = false

        try {
            const res = await fetch(`${API}/api/ai/chat`, {
                method: 'POST',
                headers: await liaHeaders(),
                body: JSON.stringify({
                    invitation_id: id,
                    message: textToSend,
                    session_id: sessionId,
                    lang: i18n.language,
                    stream: true,
                    conversation_history: history,
                }),
                signal: ctrl.signal,
            })

            // Los rechazos (sin saldo, plan sin Lia, error) llegan como JSON
            // antes de abrir el stream.
            if (!res.ok || !res.headers.get('content-type')?.includes('text/event-stream')) {
                const data = await res.json().catch(() => ({}))
                if (res.status === 402 && data.code === 'NO_CREDITS') {
                    setStreamingMessage(null)
                    setCredits(prev => ({ ...prev, total_available: 0 }))
                    fetchCredits()
                    return
                }
                if (res.status === 403 && data.code === 'NOT_AVAILABLE') {
                    setStreamingMessage(null)
                    setLiaIncluded(false)
                    return
                }
                throw new Error(data.error || `HTTP ${res.status}`)
            }

            await leerSSE(res, (event) => {
                if (event.type === 'text') {
                    texto += event.text ?? ''
                    setWorking(false)
                    setStreamingMessage({ role: 'assistant', content: texto, blocks, streaming: true })
                } else if (event.type === 'block' && event.block) {
                    blocks = [...blocks, event.block]
                    setWorking(false)
                    setStreamingMessage({ role: 'assistant', content: texto, blocks, streaming: true })
                } else if (event.type === 'replace') {
                    texto = ''
                    blocks = []
                    setStreamingMessage({ role: 'assistant', content: '', streaming: true })
                } else if (event.type === 'tool_start') {
                    setWorking(true)
                } else if (event.type === 'done') {
                    final = event
                } else if (event.type === 'error') {
                    failed = true
                }
            })
        } catch (err) {
            // Cerrar el panel o reiniciar el chat no es un error que mostrar.
            if (ctrl.signal.aborted && ctrl.signal.reason !== 'timeout') return
            console.error('Error en el chat de Lia:', err)
            failed = true
        } finally {
            clearTimeout(timer)
            if (abortRef.current === ctrl) abortRef.current = null
            sendingRef.current = false
            setLoading(false)
            setWorking(false)
        }

        if (!final || failed) {
            // Si alcanzó a llegar texto, se conserva; si no, se avisa.
            setStreamingMessage((texto.trim() || blocks.length) && !failed
                ? { role: 'assistant', content: texto, blocks }
                : {
                    role: 'assistant',
                    content: ctrl.signal.reason === 'timeout' ? t('lia.error_timeout') : t('lia.error_generic'),
                    local: true,
                })
            return
        }

        setStreamingMessage({
            role: 'assistant',
            content: texto,
            blocks: final.blocks ?? blocks,
            historyContent: final.history_content,
            message_id: final.message_id,
        })
        if (final.credits_remaining != null) {
            setCredits(prev => ({
                ...prev,
                total_available: final.credits_remaining,
                paid_balance: final.paid_balance,
                pct_free_used: final.pct_free_used,
            }))
        }
        fetchCredits()
        if (final.pending_actions?.length) setPendingActions(prev => [...prev, ...final.pending_actions])
        dispatchUiActions(final.ui_actions)
    }

    const approveAction = async (action) => {
        if (busyActionId) return
        setBusyActionId(action.id)
        let ok = false
        try {
            const response = await fetch(`${API}/api/ai/chat/approve`, {
                method: 'POST',
                headers: await liaHeaders(),
                body: JSON.stringify({ action_id: action.id, invitation_id: id }),
            })
            const data = await response.json().catch(() => ({}))
            ok = response.ok && data.success
        } catch (err) {
            console.error('No se pudo aprobar la acción:', err)
        } finally {
            setBusyActionId(null)
        }

        // Pase lo que pase, la tarjeta se quita: mientras hay tarjetas el
        // footer se oculta y, si falló, el organizador quedaría atorado.
        setPendingActions(prev => prev.filter(a => a.id !== action.id))
        setMessages(prev => [...prev,
        { role: 'user', content: t('lia.approved', { text: action.preview_text ?? '' }) },
        ok
            ? { role: 'assistant', content: t('lia.done'), action_id: action.id, feedback: null }
            : { role: 'assistant', content: t('lia.action_failed'), local: true },
        ])
    }

    const handleStartReject = (action) => {
        setRejectingActionId(action.id)
        setRejectNote('')
    }

    const confirmReject = async (action, note) => {
        if (busyActionId) return
        setBusyActionId(action.id)
        try {
            await fetch(`${API}/api/ai/chat/reject`, {
                method: 'POST',
                headers: await liaHeaders(),
                body: JSON.stringify({ action_id: action.id, invitation_id: id }),
            })
            if (note?.trim()) {
                await fetch(`${API}/api/ai/chat/action-feedback`, {
                    method: 'POST',
                    headers: await liaHeaders(),
                    body: JSON.stringify({ action_id: action.id, invitation_id: id, feedback: 'incorrect', note }),
                })
            }
        } catch (err) {
            // Si no se registró, la acción se queda pending en la base y nunca
            // se ejecuta sin aprobar: se sigue adelante en la UI.
            console.error('No se pudo registrar el rechazo:', err)
        } finally {
            setBusyActionId(null)
        }
        setRejectingActionId(null)
        setRejectNote('')
        setPendingActions(prev => prev.filter(a => a.id !== action.id))
        setMessages(prev => [...prev,
        { role: 'user', content: t('lia.cancelled', { text: action.preview_text ?? '' }) },
        { role: 'assistant', content: t('lia.action_cancelled') },
        ])
    }

    const handleActionFeedback = async (actionId, feedback) => {
        setMessages(prev => prev.map(m =>
            m.action_id === actionId ? { ...m, feedback } : m
        ))
        await fetch(`${API}/api/ai/chat/action-feedback`, {
            method: 'POST',
            headers: await liaHeaders(),
            body: JSON.stringify({ action_id: actionId, invitation_id: id, feedback }),
        }).catch(err => console.error('No se pudo guardar el feedback:', err))
    }

    // El 👎 se registra al hacer clic; la nota, si la escriben, va aparte.
    // Antes solo se mandaba al escribir la nota, así que casi nunca llegaba.
    const handleFeedback = async (messageId, feedback) => {
        if (!messageId) return
        setMessages(prev => prev.map(m =>
            m.message_id === messageId
                ? { ...m, feedback, showFeedbackInput: feedback === 'negative' }
                : m
        ))
        await fetch(`${API}/api/ai/chat/feedback`, {
            method: 'POST',
            headers: await liaHeaders(),
            body: JSON.stringify({ message_id: messageId, invitation_id: id, feedback }),
        }).catch(err => console.error('No se pudo guardar el feedback:', err))
    }

    const handleFeedbackNote = async (messageId, note) => {
        if (note?.trim()) {
            await fetch(`${API}/api/ai/chat/feedback`, {
                method: 'POST',
                headers: await liaHeaders(),
                body: JSON.stringify({ message_id: messageId, invitation_id: id, feedback: 'negative', note }),
            }).catch(err => console.error('No se pudo guardar el feedback:', err))
        }
        setMessages(prev => prev.map(m =>
            m.message_id === messageId ? { ...m, showFeedbackInput: false } : m
        ))
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
    }

    const handleReset = () => {
        abortRef.current?.abort('reset')
        setConversationStarted(false)
        setMessages([])
        setPendingActions([])
        setInput('')
        setRejectingActionId(null)
        setRejectNote('')
        // Conversación nueva = sesión nueva: si no, la analítica mezcla las dos.
        setSessionId(crypto.randomUUID())
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }

    useEffect(() => {
        if (!showPromptMenu) return
        const handleClickOutside = (e) => {
            if (promptMenuRef.current && !promptMenuRef.current.contains(e.target)) {
                setShowPromptMenu(false)
            }
        }
        const handleEscape = (e) => { if (e.key === 'Escape') setShowPromptMenu(false) }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscape)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [showPromptMenu])

    const minimizeButton = onMinimize && (
        <IconButton icon={<Minus size={14} />} label={t('lia.minimize')} onClick={onMinimize} />
    )

    // El contexto (qué pantalla ve el organizador) vive en el header, debajo
    // del nombre: la caja de texto queda solo para escribir.
    const header = (actions) => (
        <header className="lia-chat-header">
            <LiaMark />
            <div className="lia-header-text">
                <span className="lia-header-title">Lia</span>
                <span className="lia-header-sub">{t('lia.viewing', { page: pageLabel })}</span>
            </div>
            <div className="lia-header-actions">{actions}</div>
        </header>
    )

    if (!id) return <ErrorState icon="🔗" message={t('lia.missing_id')} />
    if (credits != null && credits.total_available <= 0) return (
        <div className="lia-page">
            <div className="lia-main">
                {header(minimizeButton)}
                <NoCreditsScreen invitationId={id} onPurchaseSuccess={fetchCredits} />
            </div>
        </div>
    )

    const streamingVisible = messages.some(m => m.streaming && (m.content || m.blocks?.length))
    const canSend = Boolean(input.trim()) && !loading && !locked
    const hasActions = pendingActions.length > 0

    return (
        <div className="lia-page">
            <div className="lia-main">
                {header(
                    <>
                        <IconButton icon={<RotateCcw size={14} />} label={t('lia.reset')} onClick={handleReset} />
                        {onToggleExpand && (
                            <IconButton
                                icon={expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                label={expanded ? t('lia.collapse') : t('lia.expand')}
                                pressed={expanded}
                                onClick={onToggleExpand}
                            />
                        )}
                        {minimizeButton}
                    </>
                )}

                {!conversationStarted ? (
                    <div className={`scroll-invitation lia-landing${hasActions ? ' lia-landing--actions' : ''}`}>
                        <div className="lia-landing-content">
                            {loading ? (
                                <TypingIndicator />
                            ) : (
                                <>
                                    {greetingText && (
                                        <span className="lia-landing-greeting">{greetingText}</span>
                                    )}
                                    <div className="lia-cta-group">
                                        <span className="lia-eyebrow">{t('lia.shortcuts_label')}</span>
                                        <div className="lia-cta-grid">
                                            {CTAS.map(key => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    className="lia-cta-btn"
                                                    disabled={locked}
                                                    onClick={() => handleSendMessage(t(`lia.prompts.${key}`))}
                                                >
                                                    {t(`lia.prompts.${key}`)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div ref={bottomRef} />
                    </div>
                ) : (
                    <div
                        ref={messagesRef}
                        className={`lia-messages-area scroll-invitation${hasActions ? ' lia-messages-area--actions' : ''}`}
                        role="log"
                        aria-live="polite"
                        aria-label={t('lia.messages_label')}
                    >
                        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} t={t} onAtajo={handleAtajo} onFeedback={handleFeedback} onFeedbackNote={handleFeedbackNote} onActionFeedback={handleActionFeedback} />)}
                        {loading && !streamingVisible && <TypingIndicator label={working ? t('lia.working') : undefined} />}
                        <div ref={bottomRef} />
                    </div>
                )}

                {hasActions && (
                    <div className="lia-actions-area">
                        {pendingActions.map(action => (
                            <ActionCard
                                key={action.id}
                                action={action}
                                t={t}
                                onApprove={approveAction}
                                onStartReject={handleStartReject}
                                onConfirmReject={confirmReject}
                                onCancelReject={() => setRejectingActionId(null)}
                                isRejecting={rejectingActionId === action.id}
                                rejectNote={rejectNote}
                                onRejectNoteChange={setRejectNote}
                                busy={busyActionId === action.id}
                            />
                        ))}
                    </div>
                )}

                <footer className={`lia-footer${hasActions ? ' lia-footer--hidden' : ''}`}>
                    <div ref={promptMenuRef} className="prompt-menu-container lia-input-card">
                        {showPromptMenu && (
                            <div className="lia-prompt-popup" role="menu" aria-label={t('lia.menu_title')}>
                                <div className="lia-prompt-popup-header">
                                    <p className="lia-prompt-popup-title">{t('lia.menu_title')}</p>
                                </div>
                                <div className="lia-prompt-popup-body scroll-invitation">
                                    {buildPromptMenu(eventData, t).map((section) => (
                                        <div key={section.category} className="lia-prompt-section">
                                            <p className="lia-prompt-category">{section.category}</p>
                                            {section.prompts.map((prompt) => (
                                                <button
                                                    key={prompt}
                                                    type="button"
                                                    role="menuitem"
                                                    className="lia-prompt-item"
                                                    disabled={loading}
                                                    onClick={() => { handleSendMessage(prompt); setShowPromptMenu(false) }}
                                                >
                                                    {prompt}
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Se escribe arriba; los controles quedan abajo */}
                        <div className="lia-textarea-wrap">
                            <textarea
                                ref={textareaRef}
                                className="lia-textarea scroll-invitation"
                                placeholder={locked ? t('lia.placeholder_locked') : t('lia.placeholder')}
                                aria-label={t('lia.input_label')}
                                value={input}
                                rows={2}
                                enterKeyHint="send"
                                onChange={(e) => {
                                    setInput(e.target.value)
                                    e.target.style.height = 'auto'
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`
                                }}
                                onKeyDown={handleKeyDown}
                                disabled={loading || locked}
                            />
                            {locked && <Lock size={14} aria-hidden="true" className="lia-textarea-lock" />}
                        </div>

                        <div className="lia-input-bottom">
                            <div className="lia-input-tools">
                                <button
                                    type="button"
                                    className={`lia-plus-btn${showPromptMenu ? ' is-active' : ''}`}
                                    onClick={() => setShowPromptMenu(prev => !prev)}
                                    disabled={locked}
                                    title={t('lia.shortcuts')}
                                    aria-label={t('lia.shortcuts')}
                                    aria-expanded={showPromptMenu}
                                    aria-haspopup="menu"
                                >
                                    <Plus size={14} />
                                </button>
                                {credits != null && (
                                    <TokenPill
                                        t={t}
                                        freeRemaining={credits?.free_remaining ?? 50}
                                        freeLimit={credits?.free_limit ?? 50}
                                        paidBalance={credits?.paid_balance ?? 0}
                                    />
                                )}
                            </div>

                            <button
                                type="button"
                                className="lia-send-btn"
                                onClick={() => handleSendMessage()}
                                disabled={!canSend}
                                title={t('lia.send')}
                                aria-label={t('lia.send')}
                            >
                                <SendHorizontal size={14} />
                            </button>
                        </div>
                    </div>
                    <span className="lia-disclaimer">{t('lia.disclaimer')}</span>
                </footer>
            </div>
        </div>
    )
}
