import { Button, Drawer, Grid, Steps } from 'antd'
import React, { useEffect, useState } from 'react'
import { invitationsTypes } from '../../helpers/invitation/invitation-types'
import { supabase } from '../../lib/supabase'
import { LuCheck, LuX } from 'react-icons/lu'
import { FaPlus } from 'react-icons/fa6'
import { fetchPrices, handleCheckoutInvitation, plan_lite, plan_paperless, plan_pro, PRODUCTS } from '../Payment/functions'
import { ChevronsLeft, ChevronsRight, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'



export const NewInvitationDrawer = ({ visible, setVisible, user }) => {

    const { t } = useTranslation()
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
    const [owners, setOwners] = useState([null, null])


    const steps = [
        {
            title: t('new_inv.step_type'),
            content: <Plantillas setAvailableNext={setAvailableNext} currentTemplate={currentTemplate} setCurrentTemplate={setCurrentTemplate} />,
        },
        {
            title: t('new_inv.step_route'),
            content: <Dominio dominio={dominio} setDominio={setDominio} load={load} dominios={dominios} setAvailableNext={setAvailableNext} setCurrentPhone={setCurrentPhone} currentPhone={currentPhone} currentTemplate={currentTemplate} owners={owners} setOwners={setOwners} />,
        },
        {
            title: t('new_inv.step_plan'),
            content: <Pago currentPlan={currentPlan} setCurrentPlan={setCurrentPlan} setCurrentPriceId={setCurrentPriceId} setReady={setReady} isMobile={isMobile} />,
        },
    ];

    // const isAdmin = async (userId) => {
    //     const { data, error } = await supabase.rpc('is_admin', {
    //         user_id_input: userId,
    //     });

    //     if (error) {
    //         console.error(error);
    //         return false;
    //     }

    //     return data; // true o false
    // };

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
        title: isMobile ? undefined : item.title,
    }));

    const handleClose = () => {
        setVisible(false)
        setCurrent(0)
        setCurrentTemplate(null)
        setCurrentPlan(null)
        setCurrentPriceId(null)
        setDominio(null)
        setCurrentPhone(null)
        setOwners([null, null])
        setDominios(null)
        setLoad(false)
        setAvailableNext(false)
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
            owners: currentTemplate === 'wedding' ? owners : undefined,
        }, currentPriceId);
    };

    // const [freeLoading, setFreeLoading] = useState(false)

    // const handleFree = async () => {
    //     setFreeLoading(true)
    //     try {
    //         await handleCreateFree({
    //             userId: user.user_id,
    //             userEmail: user.user_email,
    //             name: dominio,
    //             phoneNumber: currentPhone,
    //             label: currentTemplate,
    //             plan: currentPlan || 'pro',
    //             owners: currentTemplate === 'wedding' ? owners : [],
    //         })
    //         message.success('Invitación creada')
    //         handleClose()
           
    //     } catch (err) {
    //         message.error('Error al crear la invitación', err)
    //     } finally {
    //         setFreeLoading(false)
    //     }
    // }





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
                title={t('new_inv.drawer_title')}
                style={{
                    borderRadius: '24px 0px 0px 24px'
                }}
                extra={
                    <div style={{ display: 'flex', gap: '8px' }}>

                        {/* <Button
                            type='primary'
                            disabled={!(currentPlan && currentPhone && currentTemplate && dominio)}
                            loading={freeLoading}
                            onClick={handleFree}
                            style={{ fontWeight: 700, borderRadius: '99px' }}
                        >
                            Crear gratis
                        </Button> */}

                        <Button
                            disabled={!(currentPlan && currentPhone && currentTemplate && dominio)}
                            icon={<FaPlus />}
                            className='primarybutton--active'
                            style={{ fontWeight: 800 }}
                            onClick={handleNew}
                        >
                            {t('new_inv.btn_create')}
                        </Button>
                    </div>
                }

            >

                <div className='steps-content-container'>
                    <Steps current={current} items={items} responsive={false} />
                    <div className='steps-scroll-content' style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                        {steps[current].content}
                    </div>
                    <div className={`steps-buttons-container${current === 0 ? '-start' : ''}`}
                    >
                        {current > 0 && (
                            <Button
                                id="prev-next-button"

                                type='ghost' onClick={() => prev()}
                            >
                                <ChevronsLeft size={25} style={{ marginRight: '5px' }} /> {t('new_inv.btn_prev')}
                            </Button>
                        )}

                        {current < steps.length - 1 && (
                            <Button
                                id="prev-next-button"
                                disabled={availableNext ? false : true}
                                type="ghost" onClick={current === 0 ? () => nextAndGet() : () => next()}>
                                {t('new_inv.btn_next')} <ChevronsRight size={25} style={{ marginLeft: '5px' }} />
                            </Button>
                        )}


                    </div>
                </div>

            </Drawer>
        </>
    )
}



const Dominio = ({ load, dominios, setAvailableNext, dominio, setDominio, setCurrentPhone, currentPhone, currentTemplate, owners, setOwners }) => {

    const { t } = useTranslation()
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
            setErrorMessage(t('new_inv.err_special_chars'))
            return; // Exit the function
        }

        // Check for matches in the domain list
        if (lowerCaseDominios.includes(lowerCaseValue)) {
            // setAvailableNext(false);
            setIsMatch(false); // Set the state to false if there's a match
            setErrorMessage(t('new_inv.err_taken'))
        } else {
            // setAvailableNext(true);
            setIsMatch(true); // Set the state to true if there's no match
        }
    };


    useEffect(() => {
        const ownersReady = currentTemplate !== 'wedding' || (owners[0]?.trim() && owners[1]?.trim())
        if (dominio && currentPhone && ownersReady) {
            setAvailableNext(true)
        } else {
            setAvailableNext(false)
        }
    }, [dominio, currentPhone, owners, currentTemplate])

    useEffect(() => {
        if (code && phone?.length === 10) {
            setCurrentPhone(`${code}${phone}`)
        }
        else setCurrentPhone(null)
    }, [code, phone])


    return (
        !load ?
            <div className='new-invitation-dominio-container'>
                <span className='new-invitation-label'>{t('new_inv.route_title')}</span>
                <span className='route-info'>{t('new_inv.route_desc')}</span>

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
                        <span className='dominio-field-success'>{t('new_inv.available')}</span>
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
                            placeholder={t('new_inv.phone_placeholder')}
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

                {currentTemplate === 'wedding' && (
                    <div className='dominio-owners-section'>
                        <span className='new-invitation-label' style={{ fontSize: '16px' }}>{t('new_inv.owners_title')}</span>
                        <span className='route-info' style={{ marginTop: 0 }}>{t('new_inv.owners_desc')}</span>
                        <div className='dominio-form-card'>
                            <div className='dominio-form-row'>
                                <input
                                    className='dominio-input'
                                    placeholder={t('new_inv.owner_placeholder')}
                                    value={owners[0] || ''}
                                    onChange={(e) => setOwners([e.target.value, owners[1]])}
                                />
                            </div>
                            <div className='dominio-divider' />
                            <div className='dominio-form-row'>
                                <input
                                    className='dominio-input'
                                    placeholder={t('new_inv.owner_placeholder')}
                                    value={owners[1] || ''}
                                    onChange={(e) => setOwners([owners[0], e.target.value])}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* <div className='preview_col'>
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
                </div> */}
            </div>
            : <></>
    )
}


const Plantillas = ({ currentTemplate, setCurrentTemplate, setAvailableNext }) => {
    const { t } = useTranslation()
    useEffect(() => {
        if (currentTemplate) {
            setAvailableNext(true)
        }
    }, [currentTemplate])

    return (
        <div className='new-invitation-dominio-container'>
            <span className='new-invitation-label'>{t('new_inv.template_title')}</span>
            <span className='route-info'>{t('new_inv.template_desc')}</span>
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

    const { t } = useTranslation()
    const [prices, setPrices] = useState([])
    const [expanded, setExpanded] = useState({})

    useEffect(() => {
        fetchPrices(setPrices)
    }, [])

    const planPrices = prices.filter(p => PRODUCTS[p.priceId]?.type === 'plan')

    const toggleExpand = (e, key) => {
        e.stopPropagation()
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const PLAN_STYLE = {
        paperless: { accent: '#bbb', name: '#1C1B26', feat: '#555', subtext: '#bbb', dark: false },
        lite: { accent: '#9B8DC4', name: '#9B8DC4', feat: '#444', subtext: '#bbb', dark: false },
        pro: { accent: '#A99FC7', name: '#fff', feat: 'rgba(255,255,255,0.85)', subtext: 'rgba(255,255,255,0.35)', dark: true },
    }

    return (
        <div className='new-invitation-dominio-container'>
            <span className='new-invitation-label'>{t('new_inv.plan_title')}</span>
            <span className='route-info'>{t('new_inv.plan_desc')}</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', flex: 1, boxSizing: 'border-box' }}>
                {planPrices.map((p, index) => {
                    const product = PRODUCTS[p.priceId]
                    const isPro = product.value === 'pro'
                    const ps = PLAN_STYLE[product.value] || PLAN_STYLE.lite
                    const isSelected = currentPlan === product.value
                    const features = PLAN_FEATURES[product.value] || []
                    const price = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(p.amount)
                    const isExpanded = expanded[product.value]

                    return (
                        <div
                            key={index}
                            onClick={() => { setCurrentPlan(product.value); setCurrentPriceId(p.priceId); }}
                            className={isPro ? 'plan-pro-card' : ''}
                            style={{
                                position: 'relative',
                                maxWidth: '100%',
                                display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch',
                                borderRadius: '18px', cursor: 'pointer',
                                background: isPro ? undefined : (isSelected ? `${ps.accent}08` : '#fff'),
                                border: isSelected ? `2.5px solid ${ps.accent}` : '1.5px solid #e8e8e8',
                                transition: 'border 0.25s ease, background 0.25s ease',
                                marginTop: isPro ? '16px' : '0',
                                flex: 1,
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
                                    <Star size={12} /> {t('new_inv.plan_popular')}
                                </div>
                            )}

                            {/* Name + price */}
                            <div style={{
                                display: 'flex', flexDirection: isMobile ? 'row' : 'column',
                                alignItems: isMobile ? 'flex-start' : undefined,
                                justifyContent: isMobile ? 'space-between' : 'center',
                                padding: isMobile ? '18px 16px' : '28px 32px',
                                minWidth: isMobile ? 'auto' : '160px',
                                maxWidth: isMobile ? 'auto' : '160px',
                                minHeight: isMobile ? 'auto' : '160px',
                                maxHeight: '165px',
                                background: ps.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                borderRight: isMobile ? 'none' : (ps.dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f0f0f0'),
                                borderBottom: isMobile ? (ps.dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f0f0f0') : 'none',
                                gap: isMobile ? '0' : '4px',
                                flex: 2
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                    <span style={{ fontSize: isMobile ? '14px' : '10px', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase', color: ps.accent }}>
                                        Plan
                                    </span>
                                    <div style={{ fontSize: product.value === "paperless" ? '32px' : isMobile ? '26px' : '46px', fontWeight: 900, color: ps.name, textTransform: 'capitalize', lineHeight: 1 }}>
                                        {product.value}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-end' : undefined, gap: '2px' }}>
                                    <div style={{ fontSize: isMobile ? '24px' : '24px', fontWeight: 800, color: ps.accent, letterSpacing: '-0.5px', marginTop: isMobile ? '0' : '6px', lineHeight: 1 }}>
                                        {price}
                                    </div>
                                    <div style={{ fontSize: '10px', color: ps.subtext, letterSpacing: '0.5px', lineHeight: 1 }}>
                                        {t('new_inv.plan_payment')}
                                    </div>
                                </div>
                            </div>

                            {/* Features — always visible on desktop, collapsible on mobile */}
                            {!isMobile && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', flex: 1, padding: '28px', alignContent: 'center' }}>
                                    {features.map((feat, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <feat.icon size={15} style={{ color: ps.accent, flexShrink: 0 }} />
                                            <span style={{ fontSize: '14px', color: ps.feat, lineHeight: 1.4 }}>
                                                {t(feat.key)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {isMobile && (
                                <div style={{
                                    overflow: 'hidden',
                                    maxHeight: isExpanded ? '400px' : '0px',
                                    opacity: isExpanded ? 1 : 0,
                                    transition: 'max-height 0.35s ease, opacity 0.25s ease',
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '4px 16px 12px' }}>
                                        {features.map((feat, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <feat.icon size={14} style={{ color: ps.accent, flexShrink: 0 }} />
                                                <span style={{ fontSize: '13px', color: ps.feat, lineHeight: 1.4 }}>
                                                    {t(feat.key)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isMobile && (
                                <button
                                    onClick={(e) => toggleExpand(e, product.value)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        fontSize: '12x', fontWeight: 600, fontFamily: 'Poppins',
                                        color: ps.subtext,
                                        padding: '8px 16px',
                                        textAlign: 'left',
                                    }}
                                >
                                    {isExpanded ? t('new_inv.collapse') : t('new_inv.expand')}
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}



