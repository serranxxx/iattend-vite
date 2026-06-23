import { useState } from 'react'
import { Sparkles, X, Lock } from 'lucide-react'

const LIA_MESSAGES = [
    { text: 'Soy tu asistente de boda. Conozco cada detalle de tu evento. ✨', delay: 0 },
    { text: '75 invitados confirmados, 35 esperando. Te aviso si alguien cambia su respuesta.', delay: 100 },
    { text: 'Sé quién va en cada mesa, qué menú eligió cada invitado y quién todavía no confirma.', delay: 200 },
    { text: '¿Necesitas un texto para el dress code? ¿Una cita perfecta para la portada? Solo pídelo.', delay: 300 },
    { text: 'Desbloquea Lia con Pro y tendrás un asistente que sabe tanto de tu boda como tú. 🔒', delay: 400 },
]

export const LiaPreview = () => {
    const [open, setOpen] = useState(false)

    return (
        <div className='lia-preview-root'>
            <div className={`lia-preview-panel${open ? ' lia-preview-panel--open' : ''}`}>
                <div className='lia-preview-panel-header'>
                    <div className='lia-preview-panel-title'>
                        <Sparkles size={15} strokeWidth={1.8} />
                        <span>Lia · Your assistant</span>
                    </div>
                    <button className='lia-preview-close' onClick={() => setOpen(false)}>
                        <X size={14} strokeWidth={2.5} />
                    </button>
                </div>

                <div className='lia-preview-messages'>
                    {LIA_MESSAGES.map((msg, i) => (
                        <div key={i} className='lia-preview-bubble' style={{ animationDelay: `${msg.delay}ms` }}>
                            {msg.text}
                        </div>
                    ))}
                </div>

                <div className='lia-preview-input-row'>
                    <input className='lia-preview-input' disabled placeholder='Desbloquea Lia con Pro...' />
                    <div className='lia-preview-lock'><Lock size={13} /></div>
                </div>
            </div>

            <button
                className={`lia-preview-fab${open ? ' lia-preview-fab--active' : ''}`}
                onClick={() => setOpen(v => !v)}
            >
                <Sparkles size={20} strokeWidth={1.6} />
                {!open && <span className='lia-preview-fab-label'>Lia</span>}
            </button>
        </div>
    )
}
