
import React, { useEffect, useState } from 'react'
import './credits.css'
import { Button, Dropdown, Progress } from 'antd';
import { LuChevronDown, LuCoins, LuInfo, LuRefreshCcw, LuShoppingCart } from 'react-icons/lu';
import { fetchPrices, handleCheckout, PRODUCTS } from '../functions';
import { useTranslation } from 'react-i18next';
import { Info, ShoppingCart } from 'lucide-react';

export const CreditsComponent = ({ invitationID, creditsDisplay }) => {

    const { t } = useTranslation()
    const [prices, setPrices] = useState([])
    const [selectedItem, setSelectedItem] = useState('price_1Sx8RWAAdNlITNVbj7c85GlG')

    useEffect(() => {
        fetchPrices(setPrices)
    }, [])


    return (
        <div className='credits_main'>
            {creditsDisplay !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingBottom: 4, borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontSize: 13, color: '#888' }}>Créditos disponibles</span>
                    <strong style={{ fontSize: 20 }}>{creditsDisplay ?? '—'}</strong>
                </div>
            )}
            <div className='credits_checkout_cont'>
                {prices.map((p, index) => {
                    const product = PRODUCTS[p.priceId];
                    if (product?.type === 'credits') {
                        return (
                            <div key={index} className={`price_card ${selectedItem === p.priceId && 'selected_card'}`} onClick={() => setSelectedItem(p.priceId)}>
                                <div className='image_price'>
                                    <img src={`/images/c_${p.amount}.png`} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div className='card_col'>
                                    <span style={{ minWidth: '120px', fontSize: '14px', fontWeight: 400 }}>{p.productName}</span>
                                    <span style={{ minWidth: '100px', fontSize: '16px', fontWeight: 600 }}>${p.amount} <span style={{ textTransform: 'uppercase' }}>{p.currency}</span></span>
                                </div>
                            </div>
                        )
                    }
                })}
            </div>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                 <Dropdown
                    trigger={['click']}
                    placement='topLeft'
                    arrow
                    popupRender={() => (
                        <div style={{ maxWidth: 410, background: '#fff', borderRadius: 12, boxShadow: '0 6px 20px rgba(0,0,0,0.14)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                            <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: '#999' }}>
                                Compra el paquete que más te convenga y úsalos cuando quieras.
                            </p>
                        </div>
                    )}
                >
                    <Button
                        style={{ minHeight: '44px', minWidth: '44px' }}
                        icon={<Info size={16} />}
                    />
                </Dropdown>
                <Button
                    style={{ flex: 1, fontSize: '16px', minHeight: '44px' }}
                    icon={<ShoppingCart size={16} />}
                    onClick={() => handleCheckout(invitationID, selectedItem)}
                    type='primary'
                >
                    {t('credits.btn_buy')}
                </Button>
               
            </div>
        </div>
        // <div className='credits-dash'>
        //     <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        //         <span style={{ fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('credits.title')}</span>
        //         <div className='credits_row'>
        //             <Button onClick={getType} icon={<LuRefreshCcw />}>{t('credits.btn_refresh')}</Button>
        //             {isClosable && <Button onClick={() => setOnClose(false)} icon={<LuChevronDown />}></Button>}
        //         </div>
        //     </div>

        //     <div className='credits-row-pie'>
        //         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        //             <Progress
        //                 type="dashboard"
        //                 steps={10}
        //                 percent={(credits * 100) / 300}
        //                 strokeWidth={10}
        //                 strokeColor={'#6D3CFA'}
        //                 trailColor='#F5F3F2'
        //                 showInfo={false}
        //             />
        //             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0px', position: 'absolute' }}>
        //                 <span style={{ fontWeight: 600, fontSize: '22px', lineHeight: 1 }}>{credits}</span>
        //                 <span style={{ fontSize: '8px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('credits.available')}</span>
        //             </div>
        //         </div>

        //         <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', fontSize: '13px' }}>
        //             <span><b>{t('credits.what_title')}</b></span>
        //             <span>{t('credits.what_desc')}</span>

        //             <Dropdown
        //                 trigger={['click']}
        //                 placement='topRight'
        //                 arrow
        //                 popupClassName='credits_dropdown'
        //                 popupRender={() => (

        //                 )}
        //             >
        //                 <Button icon={<LuCoins size={16} />} className='primarybutton' style={{ fontSize: '12px', marginTop: '12px' }}>{t('credits.btn_reload')}</Button>
        //             </Dropdown>
        //         </div>

        //     </div>

        // </div>
    )
}
