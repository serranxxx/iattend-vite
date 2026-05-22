import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from 'antd'
import { Send } from 'lucide-react'
import axios from 'axios'
import './luma.css'

const API = 'http://localhost:4000'

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

const MessageBubble = ({ msg }) => {
    const isUser = msg.role === 'user'
    const safeContent = typeof msg.content === 'string'
        ? msg.content
        : JSON.stringify(msg.content)
    return (
        <div className={`luma-message-row ${isUser ? 'user' : ''}`}>
            {!isUser && <div className="luma-avatar">✦</div>}
            <div className={`luma-bubble ${isUser ? 'user' : 'assistant'}`}>
                {isUser ? safeContent : renderMarkdown(safeContent)}
            </div>
        </div>
    )
}

const ActionCard = ({ action, onApprove, onReject }) => (
    <div className="luma-action-card">
        <span className="luma-action-text">{action.preview_text}</span>
        <div className="luma-action-buttons">
            <Button size="small" className="primarybutton--active" style={{ borderRadius: 99 }} onClick={() => onApprove(action)}>
                Aprobar
            </Button>
            <Button size="small" className="primarybutton" style={{ borderRadius: 99 }} onClick={() => onReject(action)}>
                Cancelar
            </Button>
        </div>
    </div>
)

const ErrorState = ({ icon = '⚠️', message }) => (
    <div className="luma-error-state">
        <div className="luma-error-icon">{icon}</div>
        <span>{message}</span>
    </div>
)

// ── Main component ───────────────────────────────────────────

export default function Luma() {
    const [searchParams] = useSearchParams()
    const id = searchParams.get('id')

    const [messages, setMessages] = useState([])
    const [pendingActions, setPendingActions] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [creditsRemaining, setCreditsRemaining] = useState(null)
    const [sessionId] = useState(() => crypto.randomUUID())

    const bottomRef = useRef(null)
    const textareaRef = useRef(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, pendingActions, loading])

    useEffect(() => {
        if (!id) return
        callGreeting()
    }, [])

    const callGreeting = async () => {
        setLoading(true)
        try {
            const { data } = await axios.post(`${API}/api/ai/greeting`, {
                invitation_id: id,
                session_id: sessionId,
            })
            setMessages([{ role: 'assistant', content: String(data.message || '') }])
            if (data.credits_remaining != null) setCreditsRemaining(data.credits_remaining)
        } catch {
            setMessages([{ role: 'assistant', content: 'No pude conectarme. Intenta recargar la página.' }])
        } finally {
            setLoading(false)
        }
    }

    const sendMessage = async () => {
        const text = input.trim()
        if (!text || loading) return

        setInput('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'

        setMessages(prev => [...prev, { role: 'user', content: text }])
        setLoading(true)

        try {
            const { data } = await axios.post(`${API}/api/ai/chat`, {
                invitation_id: id,
                message: text,
                session_id: sessionId,
                stream: false,
                conversation_history: messages.slice(-6).map(m => ({
                    role: m.role,
                    content: m.content,
                })),
            })
            setMessages(prev => [...prev, { role: 'assistant', content: String(data.message || '') }])
            if (data.credits_remaining != null) setCreditsRemaining(data.credits_remaining)
            if (data.pending_actions?.length) setPendingActions(prev => [...prev, ...data.pending_actions])
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
                { role: 'assistant', content: 'Listo ✓' },
            ])
        }
    }

    const rejectAction = async (action) => {
        await fetch(`${API}/api/ai/chat/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action_id: action.id }),
        })
        setPendingActions(prev => prev.filter(a => a.id !== action.id))
        setMessages(prev => [...prev,
            { role: 'user', content: String(`Cancelé: ${action.preview_text ?? ''}`) },
            { role: 'assistant', content: 'Entendido, acción cancelada.' },
        ])
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    }

    if (!id) return <ErrorState icon="🔗" message="ID de invitación requerido" />
    if (creditsRemaining === 0) return <ErrorState icon="✦" message="Sin créditos disponibles" />

    return (
        <div className="luma-page">
            <div className="luma-main">
                <header className="luma-chat-header">
                    <span className="luma-header-title">Luma ✦</span>
                    {creditsRemaining != null && (
                        <span className="luma-credits-badge">✦ {creditsRemaining}</span>
                    )}
                </header>

                <div className="luma-messages-area">
                    <div className="gradient-bg">
                        <svg xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }}>
                            <defs>
                                <filter id="goo">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
                                    <feBlend in="SourceGraphic" in2="goo" />
                                </filter>
                            </defs>
                        </svg>
                        <div className="gradients-container">
                            <div className="g1" />
                            <div className="g2" />
                            <div className="g3" />
                            <div className="g4" />
                            <div className="g5" />
                        </div>
                    </div>
                    {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                    {loading && <TypingIndicator />}
                    <div ref={bottomRef} />
                </div>

                {pendingActions.length > 0 && (
                    <div className="luma-actions-area">
                        {pendingActions.map(action => (
                            <ActionCard key={action.id} action={action} onApprove={approveAction} onReject={rejectAction} />
                        ))}
                    </div>
                )}

                <footer className="luma-footer">
                    <textarea
                        ref={textareaRef}
                        className="luma-textarea scroll-invitation"
                        placeholder="Escribe un mensaje..."
                        value={input}
                        rows={1}
                        onChange={(e) => {
                            setInput(e.target.value)
                            e.target.style.height = 'auto'
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                    />
                    <Button
                        className="primarybutton--active"
                        style={{ borderRadius: 99, minWidth: 40, height: 40, flexShrink: 0 }}
                        icon={<Send size={16} style={{ marginTop: '4px' }} />}
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                    />
                </footer>
            </div>
        </div>
    )
}
