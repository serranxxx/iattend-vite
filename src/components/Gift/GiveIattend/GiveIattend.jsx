import React, { useEffect, useState } from 'react'
import { Button, Input, message } from 'antd'
import { Send } from 'lucide-react'
import { fetchPrices, handleCheckoutGift, PRODUCTS } from '../../Payment/functions'
import './give-iattend.css'

const PLAN_STYLE = {
    paperless: { contrast: '#F6F6F6', bg: '#FFFFFF', text: '#20212B', accent: '#cfccd4' },
    lite: { contrast: '#F6F6F6', bg: '#FFFFFF', text: '#726985', accent: '#C5BCD7' },
    pro: { contrast: '#B2A6CA', bg: '#E0DAF4', text: '#F1ECF5', accent: '#F5F3F7' },
}

const STICKERS = [
    { src: 'heart.png', size: 'clamp(36px, 6vw, 60px)', top: '3%', right: '3%', rot: 12 },
    { src: 'star_mini.png', size: 'clamp(30px, 5vw, 55px)', top: '6%', right: '10%', rot: 0 },
    { src: 'plane.png', size: 'clamp(44px, 7vw, 80px)', top: '12%', right: '4%', rot: -20 },
]

export const GiveIattend = () => {
    const [prices, setPrices] = useState([])
    const [email, setEmail] = useState('')
    const [senderName, setSenderName] = useState('')
    const [recipientName, setRecipientName] = useState('')
    const [giftMessage, setGiftMessage] = useState('')
    const [selectedPlan, setSelectedPlan] = useState('pro')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchPrices(setPrices)
    }, [])

    const planPrices = prices.filter(p => PRODUCTS[p.priceId]?.type === 'plan')

    const activeIndex = planPrices.findIndex(p => PRODUCTS[p.priceId]?.value === selectedPlan)
    const center = activeIndex === -1 ? 1 : activeIndex

    const handleSendGift = async () => {
        if (!email) return message.warning('Ingresa el correo del destinatario')
        if (!senderName) return message.warning('Ingresa tu nombre (De:)')
        if (!recipientName) return message.warning('Ingresa el nombre del destinatario (Para:)')

        const selectedPrice = planPrices[center]
        if (!selectedPrice) return message.error('Selecciona un plan')

        setLoading(true)
        await handleCheckoutGift(senderName, recipientName, email, giftMessage, selectedPrice.priceId)
        setLoading(false)
    }

    return (
        <div className='give_container scroll-invitation'>

            {STICKERS.map((s, i) => (
                <img
                    key={i}
                    src={`/images/stickers/${s.src}`}
                    alt=''
                    style={{
                        position: 'absolute',
                        width: s.size,
                        top: s.top,
                        right: s.right,
                        transform: `rotate(${s.rot}deg)`,
                        pointerEvents: 'none',
                    }}
                />
            ))}

            <div className='give_col'>
                <span className='give_title'>
                    Un regalo que van a recordar siempre
                </span>
                <span className='give_text'>
                    Envía I attend y deja que diseñen su invitación perfecta. Tú pones la intención, ellos los detalles.
                </span>
            </div>

            <div className='give_col give_forms_row'>
                <div className='give_input_form'>
                    <span className='give_form_label'>De:</span>
                    <Input
                        placeholder='Tu nombre'
                        value={senderName}
                        onChange={e => setSenderName(e.target.value)}
                        style={{ borderRadius: '10px', height: '44px' }}
                    />
                </div>
                <div className='give_input_form'>
                    <span className='give_form_label'>Para:</span>
                    <Input
                        placeholder='Nombre del destinatario'
                        value={recipientName}
                        onChange={e => setRecipientName(e.target.value)}
                        style={{ borderRadius: '10px', height: '44px' }}
                    />
                </div>
                <div className='give_input_form'>
                    <span className='give_form_label'>¿A quién le regalas?</span>
                    <Input
                        placeholder='correo@ejemplo.com'
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        type='email'
                        style={{ borderRadius: '10px', height: '44px' }}
                    />
                </div>
                <div className='give_input_form'>
                    <span className='give_form_label'>Escríbeles algo</span>
                    <Input.TextArea
                        placeholder='Escribe un mensaje personal...'
                        value={giftMessage}
                        onChange={e => setGiftMessage(e.target.value)}
                        rows={4}
                        style={{ borderRadius: '10px', resize: 'none' }}
                    />
                </div>
            </div>

            <div className='give_input_form' style={{ width: '100%' }}>
                <span className='give_form_label'>Elige tu regalo</span>
                <div className='give_cards_row'>
                    {planPrices.map((p, index) => {
                        const product = PRODUCTS[p.priceId]
                        const isPro = product.value === 'pro'
                        const ps = PLAN_STYLE[product.value] || PLAN_STYLE.lite
                        const isSelected = index === center
                        const price = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(p.amount)

                        return (
                            <div
                                key={index}
                                onClick={() => setSelectedPlan(product.value)}
                                className={`give_card${isSelected ? ' give_card--selected' : ''}${isPro ? ' give_card--pro' : ''}`}
                                style={{
                                    '--card-bg': ps.bg,
                                    '--card-accent': ps.accent,
                                    '--card-text': ps.text,
                                    '--card-contrast': ps.contrast,
                                    position: isSelected ? 'absolute' : 'static',
                                    transform: isSelected ? 'scale(1.08)' : 'rotate(0deg)',
                                    boxShadow: isSelected ? '0px 0px 24px rgba(0,0,0,0.5)' : undefined,
                                    zIndex: isSelected ? 3 : 1,
                                    outline: isSelected ? `4px solid ${ps.accent}` : '',
                                    transition: 'all 0.35s ease',
                                }}
                            >
                                {isPro && (
                                    <div className='give_banner_pro'>
                                        <img src='/images/stickers/heart.png' alt='' style={{ maxWidth: '30px' }} />
                                        <span>El más regalado</span>
                                    </div>
                                )}

                                <div className='give_col'>
                                    <span className={`give_card_title${product.value === 'paperless' ? ' give_card_title--sm' : ''}`}>
                                        {product.value}
                                    </span>
                                    <span className='give_card_price'>{price}</span>
                                    <div className='give_card_tag'>MXN · pago único</div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className='give_cta_btn_cont'>
                <Button icon={<Send size={16} />} className='give_cta_btn' onClick={handleSendGift} loading={loading}>
                    Enviar regalo
                </Button>
            </div>

        </div>
    )
}
