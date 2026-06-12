import { useEffect, useState } from 'react'
import { Button, Drawer, Grid, Input } from 'antd'
import { Send } from 'lucide-react'
import { fetchPrices, PRODUCTS } from '../Payment/functions'
import '../Gift/gift-drawer.css'

const PLAN_STYLE = {
    lite: { contrast: '#B2A6CA', bg: '#E0DAF4', text: '#726985', accent: '#F5F3F7' },
    pro:  { contrast: '#20212B', bg: '#414251', text: '#F1ECF5', accent: '#B5A4CB' },
}

export const RegalaIAttend = ({ visible, onClose }) => {
    const screens = Grid.useBreakpoint()
    const isMobile = !screens.md

    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [selectedPlan, setSelectedPlan] = useState('pro')
    const [prices, setPrices] = useState([])

    useEffect(() => { fetchPrices(setPrices) }, [])

    const planPrices = prices.filter(p => {
        const product = PRODUCTS[p.priceId]
        return product?.type === 'plan' && product?.value !== 'paperless'
    })

    const handleClose = () => {
        onClose()
        setEmail('')
        setMessage('')
        setSelectedPlan('pro')
    }

    return (
        <Drawer
            placement="right"
            closable={false}
            onClose={handleClose}
            open={visible}
            width={isMobile ? '95%' : '50%'}
            style={{ borderRadius: '24px 0px 0px 24px', backgroundColor: '#9D92C0' }}
            styles={{ body: { padding: 0, paddingLeft: '8px', boxSizing: 'border-box', overflow: 'hidden' } }}
        >
            <div className="gifts_container">

                <div className="gifts_col">
                    <span className="gifts_title">Un regalo que van a recordar siempre</span>
                    <span className="gifts_text">
                        Envía I attend y deja que diseñen su invitación perfecta. Tú pones la intención, ellos los detalles.
                    </span>
                </div>

                <div className="gifts_col" style={{ gap: '12px', width: '100%' }}>
                    <div className="gift_input_form">
                        <span className="gift_form_label">¿A quién le regalas?</span>
                        <Input
                            placeholder="correo@ejemplo.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            type="email"
                            style={{ borderRadius: '10px', height: '44px' }}
                        />
                    </div>

                    <div className="gift_input_form">
                        <span className="gift_form_label">Escríbeles algo</span>
                        <Input.TextArea
                            placeholder="Escribe un mensaje personal..."
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={4}
                            style={{ borderRadius: '10px', resize: 'none' }}
                        />
                    </div>
                </div>

                <div className="gift_input_form">
                    <span className="gift_form_label">Elige tu regalo</span>

                    <div className="gifts_cards_row" style={{ gap: '32px' }}>
                        {planPrices.map((p, index) => {
                            const product = PRODUCTS[p.priceId]
                            const isPro = product.value === 'pro'
                            const ps = PLAN_STYLE[product.value] || PLAN_STYLE.lite
                            const isSelected = product.value === selectedPlan
                            const price = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(p.amount)

                            return (
                                <div
                                    key={index}
                                    onClick={() => setSelectedPlan(product.value)}
                                    className={`gift_card${isSelected ? ' gift_card--selected' : ''}${isPro ? ' gift_card--pro' : ''}`}
                                    style={{
                                        '--card-bg': ps.bg,
                                        '--card-accent': ps.accent,
                                        '--card-text': ps.text,
                                        '--card-contrast': ps.contrast,
                                        transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                                        boxShadow: isSelected ? '0px 0px 24px rgba(0,0,0,0.5)' : undefined,
                                        zIndex: isSelected ? 3 : 1,
                                        outline: isSelected ? `4px solid ${ps.accent}` : '',
                                        transition: 'all 0.35s ease',
                                    }}
                                >
                                    {isPro && (
                                        <div className="banner_pro">
                                            <img src="/images/stickers/heart.png" alt="" style={{ maxWidth: '30px' }} />
                                            <span>El más regalado</span>
                                        </div>
                                    )}

                                    <div className="gifts_col">
                                        <span className="gift_card_title">{product.value}</span>
                                        <span className="gift_card_price">{price}</span>
                                        <div className="gift_card_tag">MXN · pago único</div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="gift_cta_btn_cont">
                    <Button
                        icon={<Send size={16} />}
                        className="gift_cta_btn"
                        disabled={!email}
                        onClick={() => { /* TODO: enviar regalo */ }}
                    >
                        Enviar regalo
                    </Button>
                </div>

            </div>
        </Drawer>
    )
}
