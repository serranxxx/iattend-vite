import { useMemo, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import './regala-i-attend.css'

const genCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return 'IATT-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export const RegalaIAttend = ({ visible, onClose }) => {
    const giftCode = useMemo(() => genCode(), [])
    const [to, setTo] = useState('')
    const [sent, setSent] = useState(false)

    const handleSend = () => {
        if (!to) return
        setSent(true)
        setTimeout(() => { setSent(false); onClose() }, 2200)
    }

    return (
        <div className={`ria-container${visible ? ' ria-container--visible' : ''}`}>

            <button className="ria-close" onClick={onClose} aria-label="Cerrar">
                <X size={16} strokeWidth={2.5} />
            </button>

            {/* ── Carta blanca (emerges from envelope) ── */}
            <div className="ria-letter-card">
                <p className="ria-eyebrow">Alguien pensó en ti</p>
                <h2 className="ria-main-title">para este momento.</h2>
                <p className="ria-italic-sub">
                    Tu invitación de boda perfecta ya está lista.<br />
                    Solo falta que tú la hagas tuya.
                </p>
            </div>

            {/* ── Sobre (envelope) ── */}
            <div className="ria-envelope">
                {/* <img src="/images/letter.png" alt="" className="ria-envelope-img" /> */}

                <div className="ria-envelope-content">
                    <p className="ria-code-label">Tu código de regalo:</p>
                    <div className="ria-code-box">{giftCode}</div>

                    <input
                        className="ria-to-input"
                        type="email"
                        placeholder="Email del destinatario"
                        value={to}
                        onChange={e => setTo(e.target.value)}
                    />

                    <button
                        className={`ria-cta-btn${sent ? ' ria-cta-btn--sent' : ''}`}
                        onClick={handleSend}
                        disabled={!to}
                    >
                        {sent ? '¡ENVIADO! 🎁' : (
                            <>REGALAR I ATTEND <ArrowRight size={16} strokeWidth={2.5} /></>
                        )}
                    </button>
                </div>
            </div>

        </div>
    )
}
