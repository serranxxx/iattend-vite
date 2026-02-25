
import React, { useEffect, useState } from 'react'
import './credits.css'
import { Button, Dropdown, Progress } from 'antd';
import { LuChevronDown, LuCoins, LuRefreshCcw, LuShoppingCart } from 'react-icons/lu';
import { fetchPrices, handleCheckout, PRODUCTS } from '../functions';
import { Plus } from 'lucide-react';

export const CreditsComponent = ({ getType, credits, invitationID, isClosable, setOnClose, isSingle }) => {

    const [prices, setPrices] = useState([])
    const [selectedItem, setSelectedItem] = useState('price_1Sx8RWAAdNlITNVbj7c85GlG')


    useEffect(() => {
        fetchPrices(setPrices)
    }, [])


    return (
        isSingle ?

            <Dropdown
                trigger={['click']}
                placement='topRight'
                arrow
                popupRender={() => (
                    <div className='credits_main'>
                        <div className='credits_checkout_cont'>
                            {
                                prices.map((p, index) => {

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


                                                {/* <Button icon={<LuShoppingCart />} type='primary' onClick={() => handleCheckout(p.priceId)} > Comprar</Button> */}
                                            </div>
                                        )
                                    }
                                }


                                )
                            }

                        </div>
                        <Button style={{ width: '100%', fontSize: '16px', minHeight: '44px' }} icon={<LuShoppingCart />} onClick={() => handleCheckout(invitationID, selectedItem)} type='primary'>Comprar</Button>

                    </div>
                )}
            >

                <Button type="primary" className="coins_btn" icon={<Plus size={16} style={{ marginTop: '2px' }} />}></Button>

            </Dropdown>

            :

            <div className='credits-dash'>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>Creditos</span>
                    <div className='credits_row'>
                        <Button onClick={getType} icon={<LuRefreshCcw />}>Actualizar</Button>
                        {
                            isClosable && <Button onClick={() => setOnClose(false)} icon={<LuChevronDown />}></Button>
                        }
                    </div>

                </div>

                <div className='credits-row-pie'>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <Progress
                            type="dashboard"
                            steps={10}
                            percent={(credits * 100) / 300}
                            strokeWidth={10}
                            strokeColor={'#6D3CFA'}
                            trailColor='#F5F3F2'
                            showInfo={false}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0px', position: 'absolute' }}>
                            <span style={{ fontWeight: 600, fontSize: '22px', lineHeight: 1 }}>{credits}</span>
                            <span style={{ fontSize: '8px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>Disponibles</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', fontSize: '13px' }}>
                        <span><b>¿Qué son los créditos?</b></span>
                        <span>Cada invitación enviada usa 1 crédito y puedes recargar cuando lo necesites.</span>

                        <Dropdown
                            trigger={['click']}
                            placement='topRight'
                            arrow
                            popupRender={() => (
                                <div className='credits_main'>
                                    <div className='credits_checkout_cont'>
                                        {
                                            prices.map((p, index) => {

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


                                                            {/* <Button icon={<LuShoppingCart />} type='primary' onClick={() => handleCheckout(p.priceId)} > Comprar</Button> */}
                                                        </div>
                                                    )
                                                }
                                            }


                                            )
                                        }

                                    </div>
                                    <Button style={{ width: '100%', fontSize: '16px', minHeight: '44px' }} icon={<LuShoppingCart />} onClick={() => handleCheckout(invitationID, selectedItem)} type='primary'>Comprar</Button>

                                </div>
                            )}
                        >
                            <Button icon={<LuCoins size={16} />} className='primarybutton' style={{ fontSize: '12px', marginTop: '12px' }}>Recargar credtios</Button>
                        </Dropdown>
                    </div>

                </div>

            </div>
    )
}
