
import { Button, Drawer, Grid, Input } from 'antd'
import React, { useEffect, useState } from 'react'
import { fetchPrices, PRODUCTS } from '../Payment/functions'
import { Check, Send, Star } from 'lucide-react'
import { LuX } from 'react-icons/lu'
import './gift-drawer.css'
import { GiftCardsStack } from './GiftCards/GiftCards'

const PLAN_STYLE = {
    paperless: { contrast: '#F6F6F6', bg: '#FFFFFF', text: '#20212B', accent: '#C5BCD7' },
    lite: { contrast: '#B2A6CA', bg: '#E0DAF4', text: '#726985', accent: '#F5F3F7' },
    pro: { contrast: '#20212B', bg: '#414251', text: '#F1ECF5', accent: '#B5A4CB' },
}

export const GiftDrawer = ({ visible, setVisible }) => {
    const screens = Grid.useBreakpoint()
    const isMobile = !screens.md

    const [email, setEmail] = useState('')
    const [giftMessage, setGiftMessage] = useState('')
    const [selectedPlan, setSelectedPlan] = useState('pro')
    const [prices, setPrices] = useState([])

    useEffect(() => {
        fetchPrices(setPrices)
    }, [])

    const planPrices = prices.filter(p => PRODUCTS[p.priceId]?.type === 'plan')

    const handleClose = () => {
        setVisible(false)
        setEmail('')
        setGiftMessage('')
        setSelectedPlan('pro')
    }

    const stickers = [
        { src: 'heart.png', size: 60, top: '24px', right: '24px', rot: 12 },
        { src: 'star_mini.png', size: 55, top: '50px', right: '84px', rot: 0 },
        { src: 'plane.png', size: 80, top: '100px', right: '33px', rot: -20 },
    ];

    const pro_stickers = [
        // { src: 'heart.png', size: 60, top: '54px', right: '150px', rot: 32 },
        // { src: 'star_mini.png', size: 65, top: '110px', right: '144px', rot: 0 },
        // { src: 'plane.png', size: 60, top: '194px', right: '70px', rot: -20 },
    ];

    const lite_stickers = [
        // { src: 'envelope.png', size: 60, top: '54px', right: '150px', rot: 32 },
        // { src: 'pen.png', size: 60, top: '175px', right: '65', rot: 60 },
        // { src: 'clip.png', size: 60, top: '90px', right: '92px', rot: -20 },
    ];

    const pp_stickers = [
        // { src: 'light.png', size: 60, top: '54px', right: '150px', rot: 32 },
        // { src: 'puzle.png', size: 65, top: '120px', right: '144px', rot: 0 },
        // { src: 'heart.png', size: 50, top: '170px', right: '152px', rot: -10 },
    ];

    return (
        <Drawer
            placement="right"
            closable={false}
            onClose={handleClose}
            open={visible}
            width={isMobile ? '95%' : '50%'}
            style={{ borderRadius: '24px 0px 0px 24px', backgroundColor: '#9D92C0', }}
            styles={{
                body: {
                    padding: 0, paddingLeft: '8px', boxSizing: 'border-box', overflow: 'hidden'
                }
            }}
        >
            <div className='gifts_container' >

                <div className="gifts_col">
                    <span className='gifts_title'>
                        Un regalo que van a recordar siempre
                    </span>

                    <span className='gifts_text'>
                        Envía I attend y deja que diseñen su invitación perfecta. Tú pones la intención, ellos los detalles.
                    </span>
                </div>

                {
                    stickers?.map((s, i) => (
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
                            }}
                        />
                    ))
                }

                <div className="gifts_col" style={{ gap: '12px',  width: '100%' }}>
                    <div className='gift_input_form' style={{ flex: 1 }}>
                        <span className='gift_form_label'>¿A quién le regalas?</span>
                        <Input
                            placeholder='correo@ejemplo.com'
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            type='email'
                            style={{ borderRadius: '10px', height: '44px' }}
                        />
                    </div>

                    <div className='gift_input_form' style={{ flex: 1 }}>
                        <span className='gift_form_label'>Escríbeles algo</span>
                        <Input.TextArea
                            placeholder='Escribe un mensaje personal...'
                            value={giftMessage}
                            onChange={e => setGiftMessage(e.target.value)}
                            rows={4}
                            style={{ borderRadius: '10px', resize: 'none' }}
                        />
                    </div>
                </div>




                <div className='gift_input_form'>
                    <span className='gift_form_label'>Elige tu regalo</span>

                    <div className='gifts_cards_row'>
                        {(() => {
                            const activeIndex = planPrices.findIndex(p => PRODUCTS[p.priceId]?.value === selectedPlan)
                            const center = activeIndex === -1 ? 1 : activeIndex

                            return planPrices.map((p, index) => {
                                const product = PRODUCTS[p.priceId]
                                const isPro = product.value === 'pro'
                                const ps = PLAN_STYLE[product.value] || PLAN_STYLE.lite
                                const isSelected = index === center
                                const plan_stickers = product.value === 'pro' ? pro_stickers : product.value === 'lite' ? lite_stickers : pp_stickers
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
                                            position: isSelected ? 'absolute' : 'static',
                                            transform: isSelected ? 'scale(1.08)' : `rotate(0deg)`,
                                            boxShadow: isSelected ? '0px 0px 24px  rgba(0,0,0,0.5)' : undefined,
                                            zIndex: isSelected ? 3 : 1,
                                            outline: isSelected ? `4px solid ${ps.accent}` : '',
                                            transition: 'all 0.35s ease',
                                        }}
                                    >
                                        {/* {isSelected && (
                                            <div className='gift_card_check'>
                                                <Check size={14} strokeWidth={3} />
                                            </div>
                                        )} */}

                                        {
                                            isPro &&
                                            <div className='banner_pro'>
                                                <img
                                                    src={`/images/stickers/heart.png`}
                                                    alt=''
                                                    style={{ maxWidth: '30px' }}

                                                />
                                                <span>El más regalado</span>
                                            </div>
                                        }

                                        <div className="gifts_col">
                                            <span
                                                style={{ fontSize: product.value === 'paperless' ? '28px' : undefined }}
                                                className='gift_card_title'
                                            >{product.value}</span>

                                            <span className='gift_card_price'
                                            >{price}</span>
                                            <div className='gift_card_tag'>
                                                MXN · pago único
                                            </div>
                                        </div>

                                        {
                                            plan_stickers?.map((s, i) => (
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
                                                        zIndex: 99
                                                    }}
                                                />
                                            ))
                                        }
                                    </div>
                                )
                            })
                        })()}
                    </div>
                </div>

                <div className='gift_cta_btn_cont'>
                    <Button icon={<Send size={16} />} className='gift_cta_btn'>
                        
                        Enviar regalo
                    </Button>
                </div>


            </div>
        </Drawer>
    )
}
