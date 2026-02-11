import { Button, Col, Drawer, Input, Row, Steps, message } from 'antd'
import React, { useEffect, useState } from 'react'
// import { useInvitation } from '../../hooks/customHook'

import { invitationsTypes } from '../../helpers/invitation/invitation-types'
import { Link } from 'react-router-dom'
// import { supabase } from '../../lib/supabase'
import { TbSquareRoundedArrowLeft, TbSquareRoundedArrowRight } from 'react-icons/tb'
import { FaCheck, FaPencilAlt, FaWhatsapp } from 'react-icons/fa'
import { MdError, MdOutlineContentCopy } from 'react-icons/md'
import { images } from '../../helpers/assets/images'
// import { newInvitation } from '../../services/apiInvitation'
import { design_types, inv_planes, inv_types } from '../../helpers/invitation/newInvitation'

const list_items = [
    'Configuraciones generales',
    'Portada',
    'Mensajes',
    'Itinerario',
    'Dress code',
    'Mesa de regalos',
    'Galería',
    'Administración de invitados'
]

export const NewInvitationDrawer = ({ visible, setVisible,  }) => {

    // const { user } = useContext(appContext)
    // const { response, operation } = useInvitation()

    const [currentTemplate, setCurrentTemplate] = useState(null)
    const [currentType, setCurrentType] = useState(null)
    const [currentPlan, setCurrentPlan] = useState('pro')
    const [load, setLoad] = useState(false)
    const [dominios] = useState(null)
    const [availableNext, setAvailableNext] = useState(false)
    const [setReady] = useState(false)

    // const [userAdmin, setUserAdmin] = useState(false)
    const [current, setCurrent] = useState(0);
    const [dominio, setDominio] = useState(null)
    const [currentDesign, setCurrentDesign] = useState('blank')

    // useEffect(() => {
    //     setDominio(null)
    //     setCurrent(0)
    // }, [visible])


    const steps = [
        {
            title: 'Tipo',
            content: <Plantillas setAvailableNext={setAvailableNext} currentTemplate={currentTemplate} setCurrentTemplate={setCurrentTemplate} />,
        },
        {
            title: 'Ruta',
            content: <Dominio dominio={dominio} setDominio={setDominio} load={load} dominios={dominios} setAvailableNext={setAvailableNext} />,
        },
        {
            title: 'Seguridad',
            content: <Tipos setAvailableNext={setAvailableNext} currentType={currentType} setCurrentType={setCurrentType} />
        },
        {
            title: 'Diseño',
            content: <Design setAvailableNext={setAvailableNext} currentType={currentDesign} setCurrentType={setCurrentDesign} />
        },
        {
            title: 'Plan',
            content: <Plan setAvailableNext={setAvailableNext} currentPlan={currentPlan} setCurrentPlan={setCurrentPlan} currentDesign={currentDesign} />,
        },
        {
            title: 'Pago',
            content: <Pago currentPlan={currentPlan} setCurrentPlan={setCurrentPlan} setReady={setReady} currentDesign={currentDesign} />,
        },
        // {
        //     title: 'Comprobante',
        //     content: <Plan currentPlan={currentPlan} setCurrentPlan={setCurrentPlan} setReady={setReady} />,
        // },
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
        // getAllDominios(operation, currentTemplate)
        setLoad(true)
    };

    const items = steps.map((item) => ({
        key: item.title,
        title: item.title,
    }));

    const handleClose = () => {
        setVisible(false)
    }

    // const onNewInvitation = async () => {
    //     if (currentType && currentPlan && currentTemplate && dominio) {
    //         // const invitation = handleTemplates(user.id, currentType, currentPlan, dominio, currentTemplate, currentDesign)
    //         // newInvitation(operation, invitation)

    //     } else {
    //         message.error('Necesitas seleccionar todos los campos')
    //     }


    // }

    // useEffect(() => {
    //     setCurrentTemplate(null)
    //     setAvailableNext(false)
    //     // setUserAdmin(false)

    // }, [])

    // const newSupaInvitation = async (invitation) => {
    //     try {
    //         const { data, error } = await supabase
    //             .from("invitations")   // 👈 nombre de tu tabla
    //             .insert([invitation])  // 👈 recibe un array de objetos               // opcional: para devolver lo insertado

    //         if (error) {
    //             console.error("Error al insertar:", error.message);
    //             return null;
    //         }
    //         return data;
    //     } catch (err) {
    //         console.error("Error inesperado:", err);
    //         return null;
    //     }

    // }


    // useEffect(() => {
    //     if (response) {
    //         if (response.data.ok) {
    //             switch (response.data.msg) {
    //                 case "Get all event names":
    //                     setDominios(response.data.eventNames)
    //                     setLoad(false)
    //                     break;

    //                 case "New invitation added":
    //                     const guests = {
    //                         userID: user.id,
    //                         invitationID: response.data.invitationID,
    //                         tickets: 300,
    //                         type: currentType,
    //                         guests: [],
    //                         share: [],
    //                         tables: []
    //                     }

    //                     const newi = toNewInvitation(response.data.invitation, user.email, user.id)

    //                     newSupaInvitation(newi)
    //                     createGuests(operation, guests)


    //                     break;

    //                 case "Guest created successfully":
    //                     message.success("Nueva invitación agregada")
    //                     refreshInvitations(operation, user.id)
    //                     setVisible(false)
    //                     break;

    //                 default:
    //                     break;
    //             }
    //         }
    //     }
    // }, [response])



    return (
        <Drawer
            // title="Basic Drawer"
            placement="right"
            className='help-drawer'
            closable={false}
            onClose={handleClose}
            open={visible}
            width={'70%'}


        // key={placement}
        >

            <div className='new-invitation-header'>
                <h2 className='new-invitation--title'>Configura tu invitación desde cero</h2>


                {/* {
                    ready ?
                        <Button
                            onClick={onNewInvitation}
                            id='new-invitation-create-button'
                        >Crear</Button>
                        : <></>
                } */}


            </div>

            <div className='steps-content-container'>
                <Steps current={current} items={items} />
                {steps[current].content}
                <div className={`steps-buttons-container${current === 0 ? '-start' : ''}`}
                >
                    {current > 0 && (
                        <Button
                            id="prev-next-button"

                            type='ghost' onClick={() => prev()}
                        >
                            <TbSquareRoundedArrowLeft size={25} style={{ marginRight: '5px' }} /> Anterior
                        </Button>
                    )}

                    {current < steps.length - 1 && (
                        <Button
                            id="prev-next-button"
                            disabled={availableNext ? false : true}
                            type="ghost" onClick={current === 0 ? () => nextAndGet() : () => next()}>
                            Siguiente <TbSquareRoundedArrowRight size={25} style={{ marginLeft: '5px' }} />
                        </Button>
                    )}


                </div>
            </div>

        </Drawer>
    )
}





const Dominio = ({ load, dominios, setAvailableNext, dominio, setDominio }) => {

    const [isMatch, setIsMatch] = useState(null)
    const [errorMessage, setErrorMessage] = useState(null)


    


    const compareDominios = (value) => {
        // Set the value
        setDominio(value);

        // Convert to lower case
        const lowerCaseValue = value.toLowerCase();
        const lowerCaseDominios = dominios.map(dominio => dominio.toLowerCase());

        // Check for invalid characters
        const invalidChars = /[ !@#$%^*(){}[\]|\\:;"'<>,.?/~+]/;

        if (invalidChars.test(lowerCaseValue)) {
            // If invalid characters are found, set an error message
            setAvailableNext(false);
            setIsMatch(false);
            setErrorMessage('Evita los caracteres especiales')
            return; // Exit the function
        }

        // Check for matches in the domain list
        if (lowerCaseDominios.includes(lowerCaseValue)) {
            setAvailableNext(false);
            setIsMatch(false); // Set the state to false if there's a match
            setErrorMessage('Ocupado')
        } else {
            setAvailableNext(true);
            setIsMatch(true); // Set the state to true if there's no match
        }
    };

    // useEffect(() => {
    //     if (dominio) {
    //         compareDominios(dominio)
    //     } else {
    //         setAvailableNext(false)
    //     }

    // }, [])

    useEffect(() => {
        if (!dominio) {
            setAvailableNext(false)
        }
    }, [dominio])

    return (

        !load ?
            <div className='new-invitation-dominio-container'>
                <span className='new-invitation-label'>Ruta de la invitación</span>
                <div className='dominio-new-invitation-container'>
                    <Input
                        onChange={(e) => compareDominios(e.target.value)}
                        value={dominio}
                        className='gc-input-text'
                        style={{
                            width: '400px', marginRight: '10px',
                            marginTop: '5px'
                        }}
                        placeholder={'Dominio'}
                    />

                    {
                        !dominio ?
                            <div className='dominio-state-inactive'>
                                <FaCheck />
                            </div>
                            : isMatch ?
                                <div className='dominio-state-not-available'>
                                    <div className='dominio-state-available'>
                                        <FaCheck />

                                    </div>
                                    <span className='available-label'>Disponible</span>
                                </div>
                                :
                                <div className='dominio-state-not-available'>
                                    <MdError size={25} />
                                    <span>{errorMessage}</span>
                                </div>
                    }



                </div>

                <div className='dominio-info-container'>

                    <div className='route-image-container'>
                        <img src={images.route} alt='' />
                    </div>

                    <span className='route-info'>La ruta de la invitación es el enlace web donde tus invitados podrán acceder a la invitación. Debe de ser única y especial. Es fundamental evitar el uso de puntos u otros caracteres especiales para garantizar que el enlace sea claro y fácil de compartir.</span>




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
            <span className='new-invitation-label'>Elige un tipo de invitación</span>
            <div className='new-inv-templates-container'>
                {
                    invitationsTypes.map((template) => (
                        <div
                            onClick={() => setCurrentTemplate(template.type)}
                            style={{ width: '30%', height: '150px' }}
                            key={template.id} className={`template-item${template.type === currentTemplate ? '-selected' : ''}`}>
                            <template.icon style={{ fontSize: '50px', color: '#1B1B1B' }} />
                            <span className="template-name-label" style={{
                                marginTop: '30px'
                            }}>{template.name}</span>
                        </div>
                    ))
                }
            </div>


        </div>
    )
}


const Tipos = ({ currentType, setCurrentType, setAvailableNext }) => {
    useEffect(() => {
        if (currentType) {
            setAvailableNext(true)
        }
    }, [currentType])
    return (
        <div className='new-invitation-dominio-container'>
            <span className='new-invitation-label'>Tipo de Invitación</span>
            <div className='new-inv-templates-container'>
                {
                    inv_types.map((type, index) => (
                        <div
                            onClick={() => setCurrentType(type.type)}
                            key={index} className={`type-item${type.type === currentType ? '-selected' : ''}`}>
                            <div className='type-image-container'>
                                <type.icon style={{ fontSize: '45px' }} />
                            </div>
                            <div className='type-info-container'>
                                <span className="type--title">{type.title}</span>
                                <span className="type--description">{type.description}</span>
                            </div>

                        </div>
                    ))
                }
            </div>
        </div>
    )
}

const Plan = ({ currentPlan, setCurrentPlan, currentDesign, setAvailableNext }) => {

    // useEffect(() => {
    //     if (currentPlan) {
    //         setReady(true)
    //     }
    // }, [currentPlan])

    useEffect(() => {
        if (currentPlan) {
            setAvailableNext(true)
        }
    }, [currentPlan])


    return (
        <div className='new-invitation-dominio-container'>
            <span className='new-invitation-label'>Plan de Publicación</span>
            <div className='new-inv-templates-container'>
                {
                    inv_planes.map((plan, index) => (
                        <div
                            onClick={() => setCurrentPlan(plan.type)}
                            key={index} className={`plan-item${plan.type === currentPlan ? '-selected' : ''}`}>

                            <div className='plan-image-container'>
                                {plan.icon}
                            </div>

                            <span className="plan-name-label">{plan.name}</span>
                            <span className="plan-price-label">{currentDesign === 'design' ? `$${(plan.amount + 300).toLocaleString('en-US')}` : plan.price}</span>
                            <span className="plan-time-label">{plan.time}</span>


                            <div className='plan-features-container'>
                                {
                                    list_items.map((benefit, index) => (
                                        <div key={index} className='benefit-row'>
                                            <FaCheck style={{
                                                marginRight: '10px'
                                            }} />
                                            <span className="plan-name-label">{benefit}</span>
                                        </div>
                                    ))
                                }

                                <a href='/features'
                                    className="plan-name-label label-tag"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{

                                        margin: '7px 0px', fontWeight: 500, textDecoration: 'underline',
                                        width: '100%', textAlign: 'center',
                                    }}>
                                    Conoce más
                                </a>

                            </div>



                            {
                                plan.type === currentPlan ? <Button id="new-inv-choose-plan--selected">Seleccionar</Button>
                                    : <Button id="new-inv-choose-plan">Seleccionar</Button>
                            }


                        </div>
                    ))
                }
            </div>
        </div>
    )
}

const Design = ({ currentType, setCurrentType, setAvailableNext }) => {
    useEffect(() => {
        if (currentType) {
            setAvailableNext(true)
        }
    }, [currentType])

    return (
        <div className='new-invitation-dominio-container'>
            <span className='new-invitation-label'>Modo de diseño</span>
            <div className='new-inv-templates-container'>
                {
                    design_types.map((type, index) => (
                        <div
                            onClick={() => setCurrentType(type.type)}
                            key={index} className={`type-item${type.type === currentType ? '-selected' : ''}`}>
                            <div className='type-image-container'>
                                <type.icon style={{ fontSize: '45px' }} />
                            </div>
                            <div className='type-info-container'>
                                <span className="type--title">{type.title}</span>
                                <span className="type--description">{type.description}</span>
                            </div>

                        </div>
                    ))
            }
            </div>
        </div>
    )
}

const Pago = ({ currentPlan, setReady, currentDesign }) => {

    useEffect(() => {
        setReady(true)
    }, [])


    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success('Copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    return (
        <div className='new-invitation-dominio-container'>
            {/* <span className='new-invitation-label'>Comprobante de pago</span> */}
            <div style={{
                width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column'
            }}>
                <span className='new-invitation-fnl-label'>¡Tu invitación está casi lista!</span>
                <span className='new-invitation-fnl-label-scnd'>Antes de oprimir el botón de <b>Crear</b>, por favor transfiere y envíanos el comprobante de pago por un total de <b>
                    ${(
                        currentDesign === 'design'
                            ? inv_planes.find((plan) => plan.type === currentPlan).amount + 300
                            : inv_planes.find((plan) => plan.type === currentPlan).amount
                    ).toLocaleString('en-US')} MXN
                </b></span>
                {/* <span className='new-invitation-fnl-total'>
                    <b>
                        ${(
                            currentDesign === 'design'
                                ? inv_planes.find((plan) => plan.type === currentPlan).amount + 300
                                : inv_planes.find((plan) => plan.type === currentPlan).amount
                        ).toLocaleString('en-US')} MXN
                    </b>
                </span> */}

                <div style={{
                    width: '350px', height: '180px',
                    margin: '20px 0px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #7B1FA2, #9C27B0)',
                    position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start',
                    // padding: '20px'
                }}>
                    <img src={images.Nu} alt='' style={{ position: 'absolute', top: '20px', left: '20px', height: '25px' }} />

                    <Col style={{ position: 'absolute', bottom: '20px', left: '20px', width: '300px' }} >
                        <Row style={{ marginBottom: '-10px', flexDirection: 'space-between' }}>
                            <span className="label-nu" >Luis Alberto Serrano Garcia</span>
                            <Button
                                onClick={() => copyToClipboard('Luis Alberto Serrano Garcia')}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginLeft: '15px'
                                }} type='ghost' icon={<MdOutlineContentCopy size={20} style={{ color: 'var(--ft-color)' }} />} />
                        </Row>
                        <Row style={{ flexDirection: 'space-between' }}>
                            <span className="label-nu" >638180000145155539</span>
                            <Button
                                onClick={() => copyToClipboard('638180000145155539')}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginLeft: '15px'
                                }} type='ghost' icon={<MdOutlineContentCopy size={20} style={{ color: 'var(--ft-color)' }} />} />
                        </Row>
                    </Col>



                </div>
                <Link to="https://wa.me/6145394836" target='_blank' style={{
                    margin: '0px 10px'
                }}>
                    <Button
                        id="whatsapp-button"
                        style={{ width: 'auto', marginBottom: '15px' }}
                        icon={<FaWhatsapp size={18} />}
                    >
                        Enviar comprobante de pago
                    </Button>
                </Link>
                <span className='new-invitation-fnl-label-scnd'>Una vez recibido, activaremos tu invitación y podrás comenzar a diseñar.</span>

                <div style={{
                    width: '100%', height: '1px', backgroundColor: '#d9d9d9', margin: '30px 0px'
                }} />

                {
                    currentDesign === 'design' && (
                        <>
                            <span className='new-invitation-fnl-label-scnd'>Para que nuestro equipo pueda crear tu invitación personalizada, por favor <b>completa el siguiente formulario</b> con los detalles de tu evento:</span>
                            <Link to="https://forms.gle/VpnBxvc6n5sL6rs26" target='_blank' style={{
                                margin: '30px 0px'
                            }}>
                                <Button
                                    id="whatsapp-button"
                                    style={{ width: 'auto', backgroundColor: '#673AB7', color: 'var(--ft-color)' }}
                                    icon={<FaPencilAlt size={14} />}
                                >
                                    Completar formulario de diseño
                                </Button>
                            </Link>
                        </>
                    )
                }



            </div>
        </div>
    )
}



