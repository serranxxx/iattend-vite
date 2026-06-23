import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Dropdown } from 'antd'
import { Info, ShoppingCart, X } from 'lucide-react'
import { fetchPrices, handleCheckout, PRICE_IDS, PRODUCTS } from '../functions'
import { useTranslation } from 'react-i18next'

export const CreditsMobile = ({ invitationID, credits, open, onClose }) => {
    const { t } = useTranslation()
    const [prices, setPrices] = useState([])
    const [selectedItem, setSelectedItem] = useState(PRICE_IDS.CREDITS_200)
    const [visible, setVisible] = useState(false)
    const [entered, setEntered] = useState(false)

    useEffect(() => { fetchPrices(setPrices) }, [])

    useEffect(() => {
        if (open) {
            setVisible(true)
            requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
        } else {
            setEntered(false)
            const timer = setTimeout(() => setVisible(false), 340)
            return () => clearTimeout(timer)
        }
    }, [open])

    if (!visible) return null

    return createPortal(
        <>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    zIndex: 1299,
                    opacity: entered ? 1 : 0,
                    transition: 'opacity 0.24s ease',
                }}
            />

            <div style={{
                position: 'fixed',
                bottom: '1.5%',
                left: '2.5%',
                width: '95%',
                zIndex: 1300,
                background: '#fff',
                borderRadius: 16,
                padding: 16,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
                transform: entered ? 'translateY(0)' : 'translateY(-32px)',
                opacity: entered ? 1 : 0,
                transition: 'transform 0.34s cubic-bezier(0.34, 1.15, 0.64, 1), opacity 0.24s ease',
            }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        <span style={{ fontSize: 12, color: '#888' }}>Créditos disponibles</span>
                        <strong style={{ fontSize: 26, lineHeight: 1.1 }}>{credits ?? '—'}</strong>
                    </div>
                    <Button
                        type="text"
                        style={{ borderRadius: '99px' }}
                        icon={<X size={16} />}
                        onClick={onClose}
                    />
                </div>

                {/* 2-col grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {prices.map((p, index) => {
                        const product = PRODUCTS[p.priceId]
                        if (product?.type !== 'credits') return null
                        const selected = selectedItem === p.priceId
                        return (
                            <div
                                key={index}
                                onClick={() => setSelectedItem(p.priceId)}
                                style={{
                                    display: 'flex', flexDirection: 'column', gap: 8,
                                    background: selected ? 'var(--brand-color-500-80)' : '#F5F3F2',
                                    borderRadius: 12, padding: 12, cursor: 'pointer',
                                    boxShadow: selected ? '0 0 12px rgba(0,0,0,0.2)' : 'none',
                                    transition: 'all 0.2s ease', height:'160px'
                                }}
                            >
                                <div style={{ width: '100%', borderRadius: 8, background: '#ffffff80', overflow: 'hidden', display:'flex',alignItems:'center' }}>
                                    <img src={`/images/c_${product.value}.png`} alt='' style={{ width: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, fontFamily: 'Poppins' }}>
                                    <span style={{ fontSize: 14, fontWeight: 400 }}>{p.productName}</span>
                                    <span style={{ fontSize: 16, fontWeight: 600 }}>
                                        ${p.amount} <span style={{ textTransform: 'uppercase', fontSize: 12 }}>{p.currency}</span>
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <Dropdown
                        trigger={['click']}
                        placement='topLeft'
                        arrow
                        popupRender={() => (
                            <div style={{ maxWidth: 300, background: '#fff', borderRadius: 12, boxShadow: '0 6px 20px rgba(0,0,0,0.14)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>¿Cómo funcionan los créditos?</span>
                                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: '#555' }}>
                                    Los créditos son tu moneda dentro de I attend. Cada acción tiene un costo simple:
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                        <span style={{ fontSize: 16 }}>💬</span>
                                        <span><b>1 envío por WhatsApp</b> = 1 crédito</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                        <span style={{ fontSize: 16 }}>✦</span>
                                        <span><b>1 token de Lia</b> ≈ 1 crédito</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    >
                        <Button style={{ minHeight: 44, minWidth: 44 }} icon={<Info size={16} />} />
                    </Dropdown>

                    <Button
                        style={{ flex: 1, fontSize: 16, minHeight: 44 }}
                        icon={<ShoppingCart size={16} />}
                        onClick={() => handleCheckout(invitationID, selectedItem)}
                        type='primary'
                    >
                        {t('credits.btn_buy')}
                    </Button>
                </div>
            </div>
        </>,
        document.body
    )
}
