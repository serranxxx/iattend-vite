import { Button, Drawer, Grid, Steps } from 'antd'
import React, { useEffect, useState } from 'react'
import { invitationsTypes } from '../../helpers/invitation/invitation-types'
import { supabase } from '../../lib/supabase'
import { LuCheck, LuX } from 'react-icons/lu'
import { FaPlus } from 'react-icons/fa6'
import { fetchPrices, handleCheckoutInvitation, plan_lite, plan_paperless, plan_pro, PRODUCTS } from '../Payment/functions'
import { ChevronsLeft, ChevronsRight, Star } from 'lucide-react'



export const NewInvitationDrawer = ({ visible, setVisible, user }) => {


    const screens = Grid.useBreakpoint()
    const isMobile = !screens.md

    const [currentTemplate, setCurrentTemplate] = useState(null)
    const [currentPlan, setCurrentPlan] = useState(null)
    const [currentPriceId, setCurrentPriceId] = useState(null)
    const [load, setLoad] = useState(false)
    const [dominios, setDominios] = useState(null)
    const [availableNext, setAvailableNext] = useState(false)
    const [setReady] = useState(false)
    const [current, setCurrent] = useState(0);
    const [dominio, setDominio] = useState(null);
    const [currentPhone, setCurrentPhone] = useState(null)

    const steps = [
        {
            title: 'Tipo',
            content: <Plantillas setAvailableNext={setAvailableNext} currentTemplate={currentTemplate} setCurrentTemplate={setCurrentTemplate} />,
        },
        {
            title: 'Ruta',
            content: <Dominio dominio={dominio} setDominio={setDominio} load={load} dominios={dominios} setAvailableNext={setAvailableNext} setCurrentPhone={setCurrentPhone} currentPhone={currentPhone} />,
        },

        {
            title: 'Plan',
            content: <Pago currentPlan={currentPlan} setCurrentPlan={setCurrentPlan} setCurrentPriceId={setCurrentPriceId} setReady={setReady} isMobile={isMobile} />,
        },

    ];

    const next = () => {
        setCurrent(current + 1);
        setAvailableNext(false)
    };
    const prev = () => {
        setCurrent(current - 1);

    };

    const nextAndGet = () => {
        setCurrent(current + 1);
        setAvailableNext(false)
        setLoad(true)
        getDominios()

    };

    const items = steps.map((item) => ({
        key: item.title,
        title: item.title,
    }));

    const handleClose = () => {
        setVisible(false)
    }

    const getDominios = async () => {
        const { data, error } = await supabase
            .from('invitations')
            .select('name');

        if (error) {
            console.error('Error actualizando:', error);
        } else {
            const names = data.map(item => item.name);
            setDominios(names)
            setLoad(false);
        }

    }

    const handleNew = async () => {
        await handleCheckoutInvitation({
            userId: user.user_id,
            userEmail: user.user_email,
            name: dominio,
            phoneNumber: currentPhone,
            label: currentTemplate,
            plan: currentPlan,
        }, currentPriceId);
    };


    return (
        <>
            <Drawer
                // title="Basic Drawer"
                placement="right"
                className='help-drawer'
                closable={false}
                onClose={handleClose}
                open={visible}
                width={isMobile ? '95%' : '50%'}
                title={'Configura tu evento'}
                style={{
                    borderRadius:'24px 0px 0px 24px'
                }}
                extra={<Button disabled={!(currentPlan && currentPhone && currentTemplate && dominio)} icon={<FaPlus />} className='primarybutton--active' style={{ fontWeight: 800 }} onClick={handleNew}>Crear evento</Button>}

            >

                <div className='steps-content-container'>
                    <Steps current={current} items={items} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        {steps[current].content}
                    </div>
                    <div className={`steps-buttons-container${current === 0 ? '-start' : ''}`}
                    >
                        {current > 0 && (
                            <Button
                                id="prev-next-button"

                                type='ghost' onClick={() => prev()}
                            >
                                <ChevronsLeft size={25} style={{ marginRight: '5px' }} /> Anterior
                            </Button>
                        )}

                        {current < steps.length - 1 && (
                            <Button
                                id="prev-next-button"
                                disabled={availableNext ? false : true}
                                type="ghost" onClick={current === 0 ? () => nextAndGet() : () => next()}>
                                Siguiente <ChevronsRight size={25} style={{ marginLeft: '5px' }} />
                            </Button>
                        )}


                    </div>
                </div>

            </Drawer>
        </>
    )
}



const Dominio = ({ load, dominios, setAvailableNext, dominio, setDominio, setCurrentPhone, currentPhone }) => {

    const [isMatch, setIsMatch] = useState(null)
    const [errorMessage, setErrorMessage] = useState(null)
    const [code, setCode] = useState("+52")
    const [phone, setPhone] = useState(null)

    const compareDominios = (value) => {
        // Set the value
        setDominio(value);

        const lowerCaseValue = value.toLowerCase();
        const lowerCaseDominios = dominios.map(dominio => dominio.toLowerCase());

        // Check for invalid characters
        const invalidChars = /[ !@#$%^*(){}[\]|\\:;"'<>,.?/~+]/;

        if (invalidChars.test(lowerCaseValue)) {
            // If invalid characters are found, set an error message
            // setAvailableNext(false);
            setIsMatch(false);
            setErrorMessage('Evita los caracteres especiales')
            return; // Exit the function
        }

        // Check for matches in the domain list
        if (lowerCaseDominios.includes(lowerCaseValue)) {
            // setAvailableNext(false);
            setIsMatch(false); // Set the state to false if there's a match
            setErrorMessage('Ocupado')
        } else {
            // setAvailableNext(true);
            setIsMatch(true); // Set the state to true if there's no match
        }
    };


    useEffect(() => {
        if (dominio && currentPhone) {
            setAvailableNext(true)
        } else {
            setAvailableNext(false)
        }
    }, [dominio, currentPhone])

    useEffect(() => {
        if (code && phone?.length === 10) {
            setCurrentPhone(`${code}${phone}`)
        }
        else setCurrentPhone(null)
    }, [code, phone])


    return (
        !load ?
            <div className='new-invitation-dominio-container'>
                <span className='new-invitation-label'>¿Cómo quieren que los encuentren?</span>
                <span className='route-info'>
                    El link que compartirán con sus invitados y el número al que podrán escribirles.
                </span>

                <div className='dominio-form-card'>
                    <div className='dominio-form-row'>
                        <div className='dominio-prefix'>
                            <span className='dominio-prefix-text'>iattend.events/</span>
                        </div>
                        <input
                            className='dominio-input'
                            placeholder='paulina-y-luis'
                            value={dominio || ''}
                            onChange={(e) => compareDominios(e.target.value)}
                        />
                        {dominio && (
                            <div className='dominio-suffix' style={{ color: isMatch ? 'var(--brand-color-500)' : '#ff4d4f' }}>
                                {isMatch ? <LuCheck size={16} /> : <LuX size={16} />}
                            </div>
                        )}
                    </div>

                    {isMatch === false && errorMessage && (
                        <span className='dominio-field-error'>{errorMessage}</span>
                    )}
                    {isMatch === true && dominio && (
                        <span className='dominio-field-success'>✓ Disponible</span>
                    )}

                    <div className='dominio-divider' />

                    <div className='dominio-form-row'>
                        <div className='dominio-flag-prefix'>
                            <span className='dominio-flag'>🇲🇽</span>
                            <input
                                className='dominio-code-input'
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                            />
                        </div>
                        <input
                            className='dominio-input'
                            placeholder='Número de WhatsApp'
                            value={phone || ''}
                            onChange={(e) => setPhone(e.target.value)}
                            maxLength={10}
                        />
                        <div className='dominio-suffix' style={{ color: currentPhone ? '#25D366' : '#d9d9d9' }}>
                            <LuCheck size={16} />
                        </div>
                    </div>

                    {currentPhone && (
                        <span className='dominio-field-success dominio-whatsapp-success'>
                            <LuCheck size={12} /> {currentPhone}
                        </span>
                    )}
                </div>

                <div className='preview_col'>
                    <div className="preview-label">Así verán su invitación sus invitados:</div>

                    <div className="browser-mockup">
                        <div className="browser-bar">
                            <div className="browser-dots">
                                <div className="dot red" />
                                <div className="dot yellow" />
                                <div className="dot green" />
                            </div>
                            <div className="browser-url">
                                iattend.events/<span className="url-highlight">{dominio}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            : <></>
    )
}


const Plantillas = ({ currentTemplate, setCurrentTemplate, setAvailableNext }) => {
    useEffect(() => {
        if (currentTemplate) {
            setAvailableNext(true)
        }
    }, [currentTemplate])

    return (
        <div className='new-invitation-dominio-container'>
            <span className='new-invitation-label'>¿Qué están celebrando?</span>
            <span className='route-info'>Elige el tipo de evento para personalizar su invitación.</span>
            <div className='new-inv-templates-container'>
                {invitationsTypes.map((template) => {
                    const isSelected = template.type === currentTemplate
                    return (
                        <div
                            onClick={() => setCurrentTemplate(template.type)}
                            key={template.id}
                            className={`template-item${isSelected ? '-selected' : ''} template-item-${template.type}`}
                        >
                            {isSelected && (
                                <div className='template-check'>
                                    <LuCheck size={13} />
                                </div>
                            )}
                            <template.icon className='template-icon' size={68} />
                            <span className='template-name-label'>{template.name}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}


const PLAN_FEATURES = {
    pro: plan_pro,
    lite: plan_lite,
    paperless: plan_paperless,
}

const Pago = ({ setCurrentPlan, currentPlan, setCurrentPriceId, isMobile }) => {

    const [prices, setPrices] = useState([])

    useEffect(() => {
        fetchPrices(setPrices)
        setCurrentPlan('pro')
    }, [])

    useEffect(() => {
      console.log(prices)
    }, [prices])

   
    
    

    const planPrices = prices.filter(p => PRODUCTS[p.priceId]?.type === 'plan')

 useEffect(() => {
      console.log(planPrices)
    }, [planPrices])

    return (
        <div className='new-invitation-dominio-container'>
            <span className='new-invitation-label'>Elige tu plan</span>
            <span className='route-info'>Una sola compra. Tu invitación activa para siempre.</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', flex: 1, maxHeight: '80%', }}>
                {planPrices.map((p, index) => {
                    const product = PRODUCTS[p.priceId]
                    const isPro = product.value === 'pro'
                    const isSelected = currentPlan === product.value
                    const features = PLAN_FEATURES[product.value] || []
                    const price = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(p.amount)

                    return (
                        <div
                            key={index}
                            onClick={() => { setCurrentPlan(product.value); setCurrentPriceId(p.priceId); }}
                            className={isPro ? 'plan-pro-card' : ''}
                            style={{
                                position: 'relative', flex: 1,
                                display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch',
                                borderRadius: '18px', cursor: 'pointer',
                                background: isPro ? undefined : '#fff',
                                border: isSelected ? '2px solid #A99FC7' : '1.5px solid #e8e8e8',
                                boxShadow: isSelected
                                    ? '0 0 0 5px rgba(169,159,199,0.25), 0 8px 32px rgba(169,159,199,0.2)'
                                    : '0 2px 8px rgba(0,0,0,0.06)',
                                transition: 'box-shadow 0.2s ease, border 0.2s ease',
                                marginTop: isPro ? '16px' : '0',
                            }}
                        >
                            {isPro && (
                                <div style={{
                                    position: 'absolute', top: '-15px', left: '24px',
                                    background: 'linear-gradient(135deg, #A99FC7, #7B6FAF)',
                                    color: '#fff', fontSize: '11px', fontWeight: 700,
                                    padding: '4px 16px', borderRadius: '99px', whiteSpace: 'nowrap', letterSpacing: '0.8px',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                }}>
                                    <Star size={12} /> Más popular
                                </div>
                            )}

                            {/* Left: name + price */}
                            <div style={{
                                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                                padding: isMobile ? '16px 20px 12px' : '28px 32px',
                                minWidth: isMobile ? 'auto' : '160px',
                                background: isPro ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                borderRight: isMobile ? 'none' : (isPro ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f0f0f0'),
                                borderBottom: isMobile ? (isPro ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f0f0f0') : 'none',
                                gap: '4px',
                            }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: isPro ? '#A99FC7' : 'var(--brand-color-500)' }}>
                                    Plan
                                </span>
                                <div style={{ fontSize: isMobile ? '32px' : '46px', fontWeight: 900, color: isPro ? '#fff' : '#1C1B26', textTransform: 'capitalize', lineHeight: 1 }}>
                                    {product.value}
                                </div>
                                <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: isPro ? '#A99FC7' : 'var(--brand-color-500)', letterSpacing: '-0.5px', marginTop: '6px' }}>
                                    {price}
                                </div>
                                <div style={{ fontSize: '12px', color: isPro ? 'rgba(255,255,255,0.35)' : '#bbb', letterSpacing: '0.5px' }}>
                                    MXN · pago único
                                </div>
                            </div>

                            {/* Right: features grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', flex: 1, padding: isMobile ? '12px 20px 20px' : '28px', alignContent: 'center' }}>
                                {features.map((feat, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <feat.icon size={15} style={{ color: isPro ? '#A99FC7' : 'var(--brand-color-500)', flexShrink: 0 }} />
                                        <span style={{ fontSize: '14px', color: isPro ? 'rgba(255,255,255,0.85)' : '#444', lineHeight: 1.4 }}>
                                            {feat.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}



