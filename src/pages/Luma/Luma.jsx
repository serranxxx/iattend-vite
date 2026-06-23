import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { Button, Input } from 'antd'
import { Send, ThumbsUp, ThumbsDown, RotateCcw, Bot, Minus, Plus, MousePointer2 } from 'lucide-react'
import axios from 'axios'
import { useLuma } from '../../context/LumaContext'
import { supabase } from '../../lib/supabase'
import './luma.css'

const API = import.meta.env.VITE_API_URL

const CTAS = [
    'Resumen del evento',
    // 'Mensajes nuevos',
    'Cancelaciones recientes',
    '¿Quién no ha respondido?',
    'Espacios disponibles en mesas',
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
                // ...availableTags.slice(0, 2).map(tag => `Estado del grupo ${tag}`),
            ].filter(Boolean),
        },
        {
            category: 'Mensajes',
            prompts: [
                'Mensajes sin leer',
                'Último mensaje recibido',
                // 'Redacta un recordatorio para los que no han respondido',
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
    <div className="luma-typing-row">
        <div className="luma-avatar">✦</div>
        <div className="luma-typing-bubble">
            <div className="luma-typing-dot" />
            <div className="luma-typing-dot" />
            <div className="luma-typing-dot" />
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

    const handleThumbUp = () => msg.action_id
        ? onActionFeedback(msg.action_id, 'correct')
        : onFeedback(msg.message_id, 'positive')

    const handleThumbDown = () => msg.action_id
        ? onActionFeedback(msg.action_id, 'incorrect')
        : onFeedback(msg.message_id, 'negative')

    return (
        <div className={`luma-message-row ${isUser ? 'user' : ''}`}>
            {!isUser && <div className="luma-avatar">✦</div>}
            <div className={`luma-bubble ${isUser ? 'user' : 'assistant'}`}>
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
    <div className="luma-action-card">
        <span className="luma-action-text">{action.preview_text}</span>
        {isRejecting ? (
            <div style={{ marginTop: 8 }}>
                <Input.TextArea
                    placeholder="¿Por qué cancelaste? (opcional)"
                    autoSize={{ minRows: 1, maxRows: 2 }}
                    value={rejectNote}
                    onChange={(e) => onRejectNoteChange(e.target.value)}
                />
                <div className="luma-action-buttons" style={{ marginTop: 8 }}>
                    <Button size="small" className="primarybutton--active" style={{ borderRadius: 99 }} onClick={() => onConfirmReject(action, rejectNote)}>
                        Confirmar
                    </Button>
                    <Button size="small" className="primarybutton" style={{ borderRadius: 99 }} onClick={onCancelReject}>
                        Volver
                    </Button>
                </div>
            </div>
        ) : (
            <div className="luma-action-buttons">
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

const ErrorState = ({ icon = '⚠️', message }) => (
    <div className="luma-error-state">
        <div className="luma-error-icon">{icon}</div>
        <span>{message}</span>
    </div>
)

// ── Main component ───────────────────────────────────────────

export default function Luma({ id: idProp, onMinimize }) {
    const [searchParams] = useSearchParams()
    const { pathname } = useLocation()
    const id = idProp ?? searchParams.get('id')
    const pageLabel = getPageLabel(pathname)
    const { setUiAction } = useLuma()

    const [messages, setMessages] = useState([])
    const [pendingActions, setPendingActions] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [creditsRemaining, setCreditsRemaining] = useState(null)
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

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, pendingActions, loading])

    useEffect(() => {
        if (!id) return
        callGreeting()
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
            if (data.credits_remaining != null) setCreditsRemaining(data.credits_remaining)
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
            if (data.credits_remaining != null) setCreditsRemaining(data.credits_remaining)
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
        const handleClickOutside = (e) => {
            if (showPromptMenu && !e.target.closest('.prompt-menu-container')) {
                setShowPromptMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showPromptMenu])

    if (!id) return <ErrorState icon="🔗" message="ID de invitación requerido" />
    if (creditsRemaining === 0) return <ErrorState icon="✦" message="Sin créditos disponibles" />

    return (
        <div className="luma-page">
            <div className="luma-main">
                <header className="luma-chat-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="luma-header-title">Luma ✦</span>
                        {creditsRemaining != null && (
                            <span className="luma-credits-badge">✦ {creditsRemaining}</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                        <Button
                            // type="text" size="small"
                            size='small'
                            icon={<RotateCcw size={12} />}
                            onClick={handleReset}
                            title="Reiniciar chat"
                            style={{ color: 'var(--text-color-50)', borderRadius: 8 }}
                        />
                        <Button
                            // type="text" size="small"
                            size='small'
                            icon={<MousePointer2 size={12} />}
                            title="Agente (próximamente)"
                            disabled
                            style={{ color: 'var(--text-color-50)', borderRadius: 8 }}
                        />
                        {onMinimize && (
                            <Button
                                // type="text" size="small"
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
                    <div className="luma-landing">

                        {loading ? (
                            <div className="luma-landing-content">
                                <TypingIndicator />
                            </div>
                        ) : (
                            <div className="luma-landing-content">
                                {greetingText && (
                                    <span className="luma-landing-greeting">{greetingText}</span>
                                )}
                                <div className="luma-cta-grid">
                                    {CTAS.map(cta => (
                                        <button
                                            key={cta}
                                            className="luma-cta-btn"
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
                    <div className="luma-messages-area scroll-invitation">
                        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} onFeedback={handleFeedback} onFeedbackNote={handleFeedbackNote} onActionFeedback={handleActionFeedback} />)}
                        {loading && <TypingIndicator />}
                        <div ref={bottomRef} />
                    </div>
                )}

                {pendingActions.length > 0 && (
                    <div className="luma-actions-area">
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

                <footer className="luma-footer">
                    <div className="prompt-menu-container luma-input-card">
                        {showPromptMenu && (
                            <div className="luma-prompt-popup">
                                <div className="luma-prompt-popup-header">
                                    <p className="luma-prompt-popup-title">Atajos rápidos</p>
                                </div>
                                <div className="luma-prompt-popup-body scroll-invitation">
                                    {buildPromptMenu(eventData, availableTags).map((section) => (
                                        <div key={section.category} style={{ marginBottom: '8px' }}>
                                            <p className="luma-prompt-category">{section.category}</p>
                                            {section.prompts.map((prompt) => (
                                                <button
                                                    key={prompt}
                                                    className="luma-prompt-item"
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

                        <div className="luma-input-bottom">


                            <div className="luma-context-chip">
                                <span className="luma-context-chip-dot">✦</span>
                                {pageLabel}
                            </div>

                            <Button
                                style={{maxHeight:'25px', width:'25px'}}
                                className='primarybutton'
                                icon={<Plus size={12} />}
                                // className={`luma-prompt-plus-btn${showPromptMenu ? ' active' : ''}`}
                                onClick={() => setShowPromptMenu(prev => !prev)}

                            >

                            </Button>
                            {/* <Button
                                className="primarybutton--active"
                                style={{ borderRadius: 99, width: 32, height: 32, minWidth: 32, flexShrink: 0 }}
                                icon={<Send size={13} style={{ marginTop: '2px' }} />}
                                onClick={() => handleSendMessage()}
                                disabled={loading || !input.trim()}
                            /> */}
                        </div>

                        <textarea
                            ref={textareaRef}
                            className="luma-textarea scroll-invitation"
                            placeholder="Preguntale a Luma..."
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
                </footer>
            </div>
        </div>
    )
}
