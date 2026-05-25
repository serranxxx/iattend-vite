import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { Button, Input } from 'antd'
import { Send, ThumbsUp, ThumbsDown, RotateCcw, Bot, Minus, Plus, Copy, Check, MousePointer2 } from 'lucide-react'
import axios from 'axios'
import { useLia } from '../../context/LiaContext'
import { supabase } from '../../lib/supabase'
import './lia.css'

const API = 'http://localhost:4000'

const CTAS = [
    'Resumen del evento',
    'Mis notificaciones',
    'Mensajes nuevos',
    'Pendientes de respuesta',
    'Espacios disponibles en mesas',
    // 'Side events',
]

const getPageLabel = (pathname) => {
    if (pathname.includes('/build')) return 'Invitación'
    if (pathname.includes('/guests')) return 'Invitados'
    if (pathname.includes('/side')) return 'Eventos'
    return 'Dashboard'
}

const buildPromptMenu = (event) => {
    const owners = event?.owners || []
    const owner1 = owners[0] || null
    const owner2 = owners[1] || null

    return [
        {
            category: '¿Cómo vamos?',
            prompts: [
                'Resumen del evento',
                'Pases disponibles',
                'Porcentaje de confirmados',
                owner1 && owner2 ? `Lado de ${owner1} vs lado de ${owner2}` : null,
                'Prioridad A sin respuesta',
            ].filter(Boolean),
        },
        {
            category: 'Invitados',
            prompts: [
                'Vieron pero no respondieron',
                'Invitaciones no entregadas',
                'Confirmados sin mesa asignada',
                'Cuántos niños vienen',
            ].filter(Boolean),
        },
        {
            category: 'Mensajes',
            prompts: [
                'Mensajes sin leer',
                'Último mensaje recibido',
            ],
        },
        {
            category: 'Side events',
            prompts: [
                'Mis side events',
                'Quién confirmó en mis side events',
                'Quién falta por responder en mis side events',
            ],
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

const TypingIndicator = () => (
    <div className="lia-typing-row">
        {/* <div className="lia-avatar">✦</div> */}
        <div className="lia-typing-bubble">
            <div className="lia-typing-dot" />
            <div className="lia-typing-dot" />
            <div className="lia-typing-dot" />
        </div>
    </div>
)

const MessageBubble = ({ msg, onFeedback, onFeedbackNote, onActionFeedback }) => {
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

    return (
        <div className={`lia-message-row ${isUser ? 'user' : ''}`}>
            
            <div className={`lia-bubble ${isUser ? 'user' : 'assistant'}`}>
                {isUser ? safeContent : renderMarkdown(safeContent)}
                {!isUser && (msg.message_id || msg.action_id) && (
                    <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <Button
                                type="text"
                                size="small"
                                icon={<ThumbsUp size={13} />}
                                onClick={handleThumbUp}
                                title="Respuesta correcta"
                                style={{
                                    color: isPositive ? '#b8b8b8' : '#bfbfbf',
                                    background: isPositive ? '#F5F3F240' : 'transparent',
                                    border: isPositive ? '1px solid #b8b8b860' : '1px solid transparent',
                                    borderRadius: '8px',
                                }}
                            />
                            <Button
                                type="text"
                                size="small"
                                icon={<ThumbsDown size={13} />}
                                onClick={handleThumbDown}
                                title="Respuesta incorrecta"
                                style={{
                                    color: isNegative ? '#b8b8b8' : '#bfbfbf',
                                    background: isNegative ? '#F5F3F240' : 'transparent',
                                    border: isNegative ? '1px solid #b8b8b860' : '1px solid transparent',
                                    borderRadius: '8px',
                                }}
                            />
                            <Button
                                type="text"
                                size="small"
                                icon={copied ? <Check size={13} /> : <Copy size={13} />}
                                onClick={handleCopy}
                                title="Copiar mensaje"
                                style={{
                                    color: copied ? '#52c41a' : '#bfbfbf',
                                    background: copied ? '#f6ffed' : 'transparent',
                                    border: copied ? '1px solid #b7eb8f' : '1px solid transparent',
                                    borderRadius: '8px',
                                }}
                            />
                        </div>
                        {msg.showFeedbackInput && msg.message_id && (
                            <div style={{ marginTop: 8 }}>
                                <Input.TextArea
                                    placeholder="¿Qué estuvo mal? (opcional)"
                                    autoSize={{ minRows: 1, maxRows: 3 }}
                                    onPressEnter={(e) => { e.preventDefault(); onFeedbackNote(msg.message_id, e.target.value) }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

const ActionCard = ({ action, onApprove, onStartReject, onConfirmReject, onCancelReject, isRejecting, rejectNote, onRejectNoteChange }) => (
    <div className="lia-action-card">
        <span className="lia-action-text">{action.preview_text}</span>
        {isRejecting ? (
            <div style={{ marginTop: 8 }}>
                <Input.TextArea
                    placeholder="¿Por qué cancelaste? (opcional)"
                    autoSize={{ minRows: 1, maxRows: 2 }}
                    value={rejectNote}
                    onChange={(e) => onRejectNoteChange(e.target.value)}
                />
                <div className="lia-action-buttons" style={{ marginTop: 8 }}>
                    <Button size="small" className="primarybutton--active" style={{ borderRadius: 99 }} onClick={() => onConfirmReject(action, rejectNote)}>
                        Confirmar
                    </Button>
                    <Button size="small" className="primarybutton" style={{ borderRadius: 99 }} onClick={onCancelReject}>
                        Volver
                    </Button>
                </div>
            </div>
        ) : (
            <div className="lia-action-buttons">
                <Button className="primarybutton--active" style={{ borderRadius: 99 }} onClick={() => onApprove(action)}>
                    Aprobar
                </Button>
                <Button className="primarybutton" style={{ borderRadius: 99 }} onClick={() => onStartReject(action)}>
                    Cancelar
                </Button>
            </div>
        )}
    </div>
)

const CreditCircle = ({ freeRemaining, freeLimit, paidBalance }) => {
    const [hovered, setHovered] = useState(false)
    const pct = freeLimit > 0 ? freeRemaining / freeLimit : 1
    const radius = 9
    const stroke = 2.5
    const circumference = 2 * Math.PI * radius
    const offset = circumference * (1 - pct)
    const color = pct > 0.5 ? 'var(--brand-color-500)'
        : pct > 0.2 ? '#faad14'
            : '#ff4d4f'

    return (
        <div
            style={{ position: 'relative', cursor: 'default', width: 25, height: 25, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <svg width="25" height="25" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                    cx="12.5" cy="12.5" r={radius}
                    fill="none"
                    stroke="var(--color-background-secondary)"
                    strokeWidth={stroke}
                />
                <circle
                    cx="12.5" cy="12.5" r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                />
            </svg>
            {paidBalance > 0 && (
                <div style={{
                    position: 'absolute',
                    top: 0, right: 0,
                    width: '6px', height: '6px',
                    background: 'var(--brand-color-500)',
                    borderRadius: '99px',
                    border: '1px solid white',
                }} />
            )}
            {hovered && (
                <div style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    right: 0,
                    background: 'var(--ft-color)',
                    border: '1px solid var(--sc-color)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    pointerEvents: 'none',
                    zIndex: 20,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: paidBalance > 0 ? 4 : 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '99px', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-color)' }}>
                            <strong>{freeRemaining}</strong>
                            <span style={{ color: 'var(--text-color-50)' }}> de {freeLimit} tokens hoy</span>
                        </span>
                    </div>
                    {paidBalance > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '99px', background: 'var(--brand-color-500)', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: 'var(--text-color)' }}>
                                <strong>+{paidBalance}</strong>
                                <span style={{ color: 'var(--text-color-50)' }}> tokens comprados</span>
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

const CREDIT_PACKAGES = [
    { aiCredits: 50, iattendCost: 50 },
    { aiCredits: 100, iattendCost: 80 },
    { aiCredits: 150, iattendCost: 120 },
]

const NoCreditsScreen = ({ invitationId, onPurchaseSuccess }) => {
    const [iattendBalance, setIattendBalance] = useState(null)
    const [purchasing, setPurchasing] = useState(null)
    const [error, setError] = useState('')

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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invitation_id: invitationId, ai_credits: pkg.aiCredits }),
            })
            const data = await res.json()
            if (data.success) {
                onPurchaseSuccess()
            } else {
                setError(data.message || 'No se pudo completar la compra')
            }
        } catch {
            setError('Error al conectar. Intenta de nuevo.')
        } finally {
            setPurchasing(null)
        }
    }

    return (
        <div className="lia-no-credits">
            <div className="lia-no-credits-top">
                <span className="lia-no-credits-star">✦</span>
                <p className="lia-no-credits-title">Has llegado a tu límite gratis del día</p>
                <p className="lia-no-credits-sub">Regresa mañana para seguir usando a Lia, o adquiere más tokens para continuar hoy.</p>
            </div>

            <div className="lia-no-credits-packages">
                <p className="lia-no-credits-section-label">Adquiere más tokens</p>
                {iattendBalance !== null && (
                    <p className="lia-no-credits-balance">
                        Saldo disponible: <strong>{iattendBalance} créditos</strong> I attend
                    </p>
                )}
                <div className="lia-credit-pkg-list">
                    {CREDIT_PACKAGES.map(pkg => {
                        const canAfford = iattendBalance === null || iattendBalance >= pkg.iattendCost
                        const isLoading = purchasing === pkg.aiCredits
                        return (
                            <div key={pkg.aiCredits} className={`lia-credit-pkg${!canAfford ? ' lia-credit-pkg--disabled' : ''}`}>
                                <div className="lia-credit-pkg-left">
                                    <span className="lia-credit-pkg-ai">{pkg.aiCredits} tokens Lia</span>
                                    <span className="lia-credit-pkg-cost">{pkg.iattendCost} I attend</span>
                                </div>
                                <Button
                                    className={canAfford ? 'primarybutton--active' : 'primarybutton'}
                                    size="small"
                                    style={{ borderRadius: 99, minWidth: 72 }}
                                    disabled={!canAfford || purchasing !== null}
                                    loading={isLoading}
                                    onClick={() => handlePurchase(pkg)}
                                >
                                    {canAfford ? 'Comprar' : 'Sin saldo'}
                                </Button>
                            </div>
                        )
                    })}
                </div>
                {error && <p className="lia-no-credits-error">{error}</p>}
            </div>
        </div>
    )
}

const ErrorState = ({ icon = '⚠️', message }) => (
    <div className="lia-error-state">
        <div className="lia-error-icon">{icon}</div>
        <span>{message}</span>
    </div>
)

// ── Main component ───────────────────────────────────────────

export default function Lia({ id: idProp, onMinimize }) {
    const [searchParams] = useSearchParams()
    const { pathname } = useLocation()
    const id = idProp ?? searchParams.get('id')
    const pageLabel = getPageLabel(pathname)
    const { setUiAction } = useLia()

    const [messages, setMessages] = useState([])
    const [pendingActions, setPendingActions] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [credits, setCredits] = useState(null)
    const [sessionId] = useState(() => crypto.randomUUID())
    const [rejectingActionId, setRejectingActionId] = useState(null)
    const [rejectNote, setRejectNote] = useState('')
    const [conversationStarted, setConversationStarted] = useState(false)
    const [greetingText, setGreetingText] = useState('')
    const [showPromptMenu, setShowPromptMenu] = useState(false)
    const [eventData, setEventData] = useState(null)
    const [availableTags, setAvailableTags] = useState([])

    const bottomRef = useRef(null)
    const textareaRef = useRef(null)
    const promptMenuRef = useRef(null)


    useEffect(() => {
        if (!conversationStarted) return
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, pendingActions, loading, conversationStarted])

    const fetchCredits = async () => {
        const res = await fetch(`${API}/api/ai/credits/${id}`)
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
    }

    useEffect(() => {
        if (!id) return
        callGreeting()
        fetchCredits()
    }, [])

    useEffect(() => {
        if (!id) return
        const fetchTags = async () => {
            const { data } = await supabase
                .from('guests')
                .select('tag')
                .eq('invitation_id', id)
                .not('tag', 'is', null)
            if (data) {
                const uniqueTags = [...new Set(data.map(g => g.tag).filter(Boolean))]
                setAvailableTags(uniqueTags)
            }
        }
        fetchTags()
    }, [id])

    const callGreeting = async () => {
        setLoading(true)
        try {
            const { data } = await axios.post(`${API}/api/ai/greeting`, {
                invitation_id: id,
                session_id: sessionId,
            })
            setGreetingText(String(data.greeting_text || ''))
            setEventData(data.event_summary?.event || null)
        } catch {
            setGreetingText('¡Hola! 👋')
        } finally {
            setLoading(false)
        }
    }

    const handleSendMessage = async (text) => {
        const textToSend = (typeof text === 'string' ? text : input).trim()
        if (!textToSend || loading) return

        if (!conversationStarted) setConversationStarted(true)
        setInput('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'

        setMessages(prev => [...prev, { role: 'user', content: textToSend }])
        setLoading(true)

        try {
            const { data } = await axios.post(`${API}/api/ai/chat`, {
                invitation_id: id,
                message: textToSend,
                session_id: sessionId,
                stream: false,
                conversation_history: messages.slice(-6).map(m => ({
                    role: m.role,
                    content: m.content,
                })),
            })
            setMessages(prev => [...prev, { role: 'assistant', content: String(data.message || ''), message_id: data.message_id }])
            fetchCredits()
            if (data.pending_actions?.length) setPendingActions(prev => [...prev, ...data.pending_actions])
            if (data.ui_actions?.length) data.ui_actions.forEach(action => setUiAction(action))
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Ocurrió un error. Intenta de nuevo.' }])
        } finally {
            setLoading(false)
        }
    }

    const approveAction = async (action) => {
        const response = await fetch(`${API}/api/ai/chat/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action_id: action.id, invitation_id: id }),
        })
        const data = await response.json()
        if (data.success) {
            setPendingActions(prev => prev.filter(a => a.id !== action.id))
            setMessages(prev => [...prev,
            { role: 'user', content: String(`Aprobé: ${action.preview_text ?? ''}`) },
            { role: 'assistant', content: 'Listo ✓', action_id: action.id, feedback: null },
            ])
        }
    }

    const handleStartReject = (action) => {
        setRejectingActionId(action.id)
        setRejectNote('')
    }

    const confirmReject = async (action, note) => {
        await fetch(`${API}/api/ai/chat/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action_id: action.id }),
        })
        if (note?.trim()) {
            await fetch(`${API}/api/ai/chat/action-feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action_id: action.id, feedback: 'incorrect', note }),
            })
        }
        setRejectingActionId(null)
        setRejectNote('')
        setPendingActions(prev => prev.filter(a => a.id !== action.id))
        setMessages(prev => [...prev,
        { role: 'user', content: String(`Cancelé: ${action.preview_text ?? ''}`) },
        { role: 'assistant', content: 'Entendido, acción cancelada.' },
        ])
    }

    const handleActionFeedback = async (actionId, feedback) => {
        setMessages(prev => prev.map(m =>
            m.action_id === actionId ? { ...m, feedback } : m
        ))
        await fetch(`${API}/api/ai/chat/action-feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action_id: actionId, feedback }),
        })
    }

    const handleFeedback = async (messageId, feedback) => {
        if (!messageId) return
        setMessages(prev => prev.map(m =>
            m.message_id === messageId
                ? { ...m, feedback, showFeedbackInput: feedback === 'negative' }
                : m
        ))
        if (feedback === 'positive') {
            await fetch(`${API}/api/ai/chat/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message_id: messageId, feedback }),
            })
        }
    }

    const handleFeedbackNote = async (messageId, note) => {
        await fetch(`${API}/api/ai/chat/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id: messageId, feedback: 'negative', note }),
        })
        setMessages(prev => prev.map(m =>
            m.message_id === messageId ? { ...m, showFeedbackInput: false } : m
        ))
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
    }

    const handleReset = () => {
        setConversationStarted(false)
        setMessages([])
        setPendingActions([])
        setInput('')
        setRejectingActionId(null)
        setRejectNote('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }

    useEffect(() => {
        if (!showPromptMenu) return
        const handleClickOutside = (e) => {
            if (promptMenuRef.current && !promptMenuRef.current.contains(e.target)) {
                setShowPromptMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showPromptMenu])

    if (!id) return <ErrorState icon="🔗" message="ID de invitación requerido" />
    if (credits !== null && credits.total_available === 0) return (
        <div className="lia-page">
            <div className="lia-main">
                <header className="lia-chat-header">
                    <span className="lia-header-title">Lia ✦</span>
                    <span className="lia-beta-badge">Beta</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                        {onMinimize && (
                            <Button
                                size='small'
                                icon={<Minus size={12} />}
                                onClick={onMinimize}
                                title="Minimizar"
                                style={{ color: 'var(--text-color-50)', borderRadius: 8 }}
                            />
                        )}
                    </div>
                </header>
                <NoCreditsScreen invitationId={id} onPurchaseSuccess={fetchCredits} />
            </div>
        </div>
    )

    return (
        <div className="lia-page">
            <div className="lia-main">
                <header className="lia-chat-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap:4 }}>
                            {/* <div className='lia_cont_img'>
                                <img src="/images/lia/heart_3.png" className="lia-avatar" alt="Lia" />
                            </div> */}
                            <span className="lia-header-title">Lia </span>

                        </div>
                        <span className="lia-beta-badge">Beta</span>

                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                        <Button
                            size='small'
                            icon={<RotateCcw size={12} />}
                            onClick={handleReset}
                            title="Reiniciar chat"
                            style={{ color: 'var(--text-color-50)', borderRadius: 8 }}
                        />
                        <Button
                            size='small'
                            icon={<MousePointer2 size={12} />}
                            title="Agente (próximamente)"
                            disabled
                            style={{ color: 'var(--text-color-50)', borderRadius: 8 }}
                        />
                        {onMinimize && (
                            <Button
                                size='small'
                                icon={<Minus size={12} />}
                                onClick={onMinimize}
                                title="Minimizar"
                                style={{ color: 'var(--text-color-50)', borderRadius: 8 }}
                            />
                        )}
                    </div>
                </header>

                {!conversationStarted ? (
                    <div className={`scroll-invitation lia-landing${pendingActions.length > 0 ? ' lia-landing--actions' : ''}`}>
                        {loading ? (
                            <div className="lia-landing-content">
                                <TypingIndicator />
                            </div>
                        ) : (
                            <div className="lia-landing-content">
                                {greetingText && (
                                    <span className="lia-landing-greeting">{greetingText}</span>
                                )}
                                <div className="lia-cta-grid">
                                    {CTAS.map(cta => (
                                        <button
                                            key={cta}
                                            className="lia-cta-btn"
                                            onClick={() => handleSendMessage(cta)}
                                        >
                                            {cta}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                ) : (
                    <div className={`lia-messages-area scroll-invitation${pendingActions.length > 0 ? ' lia-messages-area--actions' : ''}`}>
                        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} onFeedback={handleFeedback} onFeedbackNote={handleFeedbackNote} onActionFeedback={handleActionFeedback} />)}
                        {loading && <TypingIndicator />}
                        <div ref={bottomRef} />
                    </div>
                )}

                {pendingActions.length > 0 && (
                    <div className="lia-actions-area">
                        {pendingActions.map(action => (
                            <ActionCard
                                key={action.id}
                                action={action}
                                onApprove={approveAction}
                                onStartReject={handleStartReject}
                                onConfirmReject={confirmReject}
                                onCancelReject={() => setRejectingActionId(null)}
                                isRejecting={rejectingActionId === action.id}
                                rejectNote={rejectNote}
                                onRejectNoteChange={setRejectNote}
                            />
                        ))}
                    </div>
                )}

                <footer className={`lia-footer${pendingActions.length > 0 ? ' lia-footer--hidden' : ''}`}>
                    <div ref={promptMenuRef} className="prompt-menu-container lia-input-card">
                        {showPromptMenu && (
                            <div className="lia-prompt-popup">
                                <div className="lia-prompt-popup-header">
                                    <p className="lia-prompt-popup-title">Atajos rápidos</p>
                                </div>
                                <div className="lia-prompt-popup-body scroll-invitation">
                                    {buildPromptMenu(eventData, availableTags).map((section) => (
                                        <div key={section.category} style={{ marginBottom: '8px' }}>
                                            <p className="lia-prompt-category">{section.category}</p>
                                            {section.prompts.map((prompt) => (
                                                <button
                                                    key={prompt}
                                                    className="lia-prompt-item"
                                                    onClick={() => { handleSendMessage(prompt); setShowPromptMenu(false) }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--sc-color)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                                >
                                                    {prompt}
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="lia-input-bottom">
                            <div className="lia-context-chip">
                                <span className="lia-context-chip-dot">✦</span>
                                {pageLabel}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', }}>
                                {credits != null && (
                                    <CreditCircle
                                        freeRemaining={credits?.free_remaining ?? 50}
                                        freeLimit={credits?.free_limit ?? 50}
                                        paidBalance={credits?.paid_balance ?? 0}
                                    />
                                )}

                                <Button
                                    style={{ maxHeight: '25px', width: '25px' }}
                                    className='primarybutton'
                                    icon={<Plus size={12} />}
                                    onClick={() => setShowPromptMenu(prev => !prev)}
                                />

                            </div>
                        </div>

                        <textarea
                            ref={textareaRef}
                            className="lia-textarea scroll-invitation"
                            placeholder="Preguntale a Lia..."
                            value={input}
                            rows={3}
                            onChange={(e) => {
                                setInput(e.target.value)
                                e.target.style.height = 'auto'
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`
                            }}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                        />
                    </div>
                    <span className="lia-disclaimer">Lia puede cometer errores. Por favor verifica las respuestas.</span>
                </footer>
            </div>
        </div>
    )
}
