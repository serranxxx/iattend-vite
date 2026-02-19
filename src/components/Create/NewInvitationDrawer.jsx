import { Button, Drawer, Input, message, Space, Steps } from 'antd'
import React, { useEffect, useState } from 'react'
import { invitationsTypes } from '../../helpers/invitation/invitation-types'
import { TbSquareRoundedArrowLeft, TbSquareRoundedArrowRight } from 'react-icons/tb'
import { images } from '../../helpers/assets/images'
import { supabase } from '../../lib/supabase'
import Plans from '../Plans/Plans'
import { LuCheck, LuPlus, LuX } from 'react-icons/lu'
import { CustomButton } from '../CustomButton/CustomButton'
import { FaPlus } from 'react-icons/fa6'



export const NewInvitationDrawer = ({ visible, setVisible, user, refreshInvitations }) => {


    const [currentTemplate, setCurrentTemplate] = useState(null)
    const [currentPlan, setCurrentPlan] = useState(null)
    const [load, setLoad] = useState(false)
    const [dominios, setDominios] = useState(null)
    const [availableNext, setAvailableNext] = useState(false)
    const [setReady] = useState(false)
    const [current, setCurrent] = useState(0);
    const [dominio, setDominio] = useState(null);
    const [currentPhone, setCurrentPhone] = useState(null)
    const [messageApi, contextHolder] = message.useMessage();



    const steps = [
        {
            title: 'Tipo',
            content: <Plantillas setAvailableNext={setAvailableNext} currentTemplate={currentTemplate} setCurrentTemplate={setCurrentTemplate} />,
        },
        {
            title: 'Ruta',
            content: <Dominio dominio={dominio} setDominio={setDominio} load={load} dominios={dominios} setAvailableNext={setAvailableNext} setCurrentPhone={setCurrentPhone} />,
        },

        {
            title: 'Plan',
            content: <Pago currentPlan={currentPlan} setCurrentPlan={setCurrentPlan} setReady={setReady} />,
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
        // getAllDominios(operation, currentTemplate)

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
        const newEvent = {
            user_id: user.user_id,
            credits: currentPlan === 'pro' ? 300 : 0,
            user_email: user.user_email,
            type: "closed",
            plan: currentPlan,
            label: currentTemplate,
            name: dominio,
            tickets: 300,
            active:true,
            phone_number: currentPhone,

            data: {
                cover: {
                    date: {
                        type: null,
                        color: "#FFFFFF",
                        value: "2026-05-20T00:00:00.000Z",
                        active: true,
                    },
                    image: {
                        dev: null,
                        blur: false,
                        prod: "https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/user_images/14376896-4930-4429-b427-96e047695396/1769460961115-couple.jpeg",
                        zoom: 1,
                        position: { x: 0, y: 0 },
                        background: true,
                    },
                    title: {
                        text: {
                            size: 54,
                            color: "#ffffff",
                            value: "Andrés & Julieta",
                            weight: 1000,
                            opacity: 0.95,
                            typeFace: "WindSong",
                        },
                        position: {
                            align_x: "center",
                            align_y: "flex-end",
                            column_reverse: "column",
                        },
                    },
                },

                gifts: {
                    cards: [
                        {
                            url: "https://www.amazon.com.mx/",
                            bank: null,
                            kind: "store",
                            name: null,
                            brand: "Palacio de hierro",
                            number: null,
                        },
                        {
                            url: "https://www.amazon.com.mx/",
                            bank: null,
                            kind: "store",
                            name: null,
                            brand: "Sears",
                            number: null,
                        },
                        {
                            url: null,
                            bank: "BBVA",
                            kind: "bank",
                            name: "Luis Serrano",
                            brand: null,
                            number: "4242424242424242",
                        },
                    ],
                    title: "MESA DE REGALOS",
                    active: true,
                    inverted: true,
                    separator: false,
                    background: false,
                    description:
                        "¡Tu presencia es el mejor regalo, pero tus buenos deseos se hacen aún más especiales con un toque personal!",
                },

                quote: {
                    text: {
                        font: {
                            size: 18,
                            color: "#ffffff",
                            value:
                                "Nuestro amor es el comienzo de un ‘para siempre’ que no tiene final.",
                            weight: 500,
                            opacity: 0.87,
                            typeFace: "Noto Sans",
                        },
                        align: "flex-start",
                        width: 90,
                        shadow: false,
                        justify: "center",
                    },
                    image: {
                        dev: null,
                        prod: "https://firebasestorage.googleapis.com/v0/b/iattend-df79a.appspot.com/o/invitations%2F66a31dc63d724e3f40549b95%2Fquote%2FLyPl6vhxCk?alt=media&token=17b6cda0-8146-4100-8f19-2f86f306883a",
                        active: true,
                    },
                    active: true,
                    inverted: false,
                    separator: false,
                    background: false,
                },

                people: {
                    title: "Nuestros padres",
                    active: true,
                    inverted: true,
                    personas: [
                        { title: "Padre del novio", description: "Manuel Velázquez " },
                        { title: "Madre del novio", description: "María Lourdes " },
                        { title: "Padre de la novia", description: "Edgar González " },
                        { title: "Madre de la novia", description: "Ericka Gutiérrez " },
                    ],
                    separator: false,
                    background: false,
                },

                gallery: {
                    dev: null,
                    prod: [
                        "https://firebasestorage.googleapis.com/v0/b/iattend-df79a.appspot.com/o/invitations%2F66a31dc63d724e3f40549b95%2Fgallery%2FeFLO43QYMc?alt=media&token=b7898198-6597-4d73-9f02-099a3bd29144",
                        "https://firebasestorage.googleapis.com/v0/b/iattend-df79a.appspot.com/o/invitations%2F66a31dc63d724e3f40549b95%2Fgallery%2F1IFd1jvgfo?alt=media&token=71bf153e-7a96-43d3-afa0-f9698f3b7a88",
                        "https://firebasestorage.googleapis.com/v0/b/iattend-df79a.appspot.com/o/invitations%2F66a31dc63d724e3f40549b95%2Fgallery%2FToBhZMReXW?alt=media&token=61079e78-25a0-4cf8-92de-1fb1e84ff945",
                    ],
                    title: "GALERÍA",
                    active: true,
                    inverted: false,
                    separator: false,
                    background: false,
                },

                notices: {
                    title: "AVISOS",
                    active: false,
                    notices: [],
                    inverted: false,
                    separator: false,
                    background: false,
                },

                generals: {
                    event: {
                        name: "test",
                        label: "wedding",
                    },
                    fonts: {
                        body: {
                            size: 0,
                            color: "#000000",
                            value: "Noto Sans",
                            weight: 0,
                            opacity: 1,
                            typeFace: "Noto Sans",
                        },
                        titles: {
                            size: 0,
                            color: "#000000",
                            value: "Noto Sans",
                            weight: 0,
                            opacity: 1,
                            typeFace: "Noto Sans",
                        },
                    },
                    colors: {
                        accent: "#252525",
                        actions: "#87bee9",
                        primary: "#ffffff",
                        secondary: "#939faf",
                    },
                    texture: 9,
                    positions: [1, 2, 3, 4, 5, 6, 7, 8, 9],
                    separator: 5,
                },

                greeting: {
                    title: "¡Nos casamos!",
                    active: true,
                    inverted: false,
                    separator: true,
                    background: false,
                    description:
                        "Con mucha ilusión y amor, les invitamos a compartir con nosotros uno de los días más importantes de nuestras vidas.",
                },

                dresscode: {
                    dev: null,
                    prod: [
                        "https://firebasestorage.googleapis.com/v0/b/iattend-df79a.appspot.com/o/invitations%2F66a31dc63d724e3f40549b95%2Fdresscode%2FeaEBaR4QgL?alt=media&token=eba80adb-0251-45b9-b225-3e96d965d49b",
                        "https://firebasestorage.googleapis.com/v0/b/iattend-df79a.appspot.com/o/invitations%2F66a31dc63d724e3f40549b95%2Fdresscode%2FdSRYh8q9dX?alt=media&token=2ebda00a-25a8-4d35-aa78-59588fe8f5ff",
                    ],
                    links: [],
                    title: "Dress code",
                    active: true,
                    colors: ["#e9e9e9", "#79abd1"],
                    inverted: true,
                    separator: false,
                    background: false,
                    description:
                        "Sigue el código de vestimenta formal con tu propio toque. Encuentra opciones que se ajusten a tu estilo en nuestra galería de Pinterest.",
                    links_active: false,
                    images_active: true,
                },

                itinerary: {
                    type: "cards",
                    title: "ITINERARIO",
                    active: true,
                    inverted: true,
                    separator: false,
                    background: false,
                    object: [
                        {
                            id: null,
                            icon: 55,
                            name: "Ceremonia",
                            time: "5:00 pm",
                            image: null,
                            music: null,
                            subtext: "San Antonio de Padua",
                        },
                        {
                            id: null,
                            icon: 16,
                            name: "Recepción",
                            time: "8:00 pm",
                            image: null,
                            music: null,
                            subtext: "Los Aduanales",
                        },
                    ],
                },

                destinations: {
                    cards: [
                        {
                            url: "sadcdacc",
                            name: "Sheraton",
                            type: "hotel",
                            image:
                                "https://firebasestorage.googleapis.com/v0/b/iattend-df79a.appspot.com/o/invitations%2F66a31dc63d724e3f40549b95%2Fdestinations%2FcRvWs5A1fe?alt=media&token=92798d5a-e561-46c4-9607-3029db188f5f",
                            description: null,
                        },
                        {
                            url: "sodded",
                            name: "Hotel One",
                            type: "hotel",
                            image:
                                "https://firebasestorage.googleapis.com/v0/b/iattend-df79a.appspot.com/o/invitations%2F66a31dc63d724e3f40549b95%2Fdestinations%2FzrYoKKvOVx?alt=media&token=4dc56c12-b329-4c97-ab1a-0bdc4f8ef5b4",
                            description: null,
                        },
                    ],
                    title: "DESTINOS",
                    active: true,
                    inverted: false,
                    separator: false,
                    background: false,
                    description:
                        "Sabemos que este viaje es especial y queremos que lo disfrutes al máximo. Aquí encontrarás una selección de lugares para hospedarte",
                },
            },
        };

        const { error } = await supabase
            .from("invitations")
            .insert([newEvent])

        if (error) {
            console.error("Error al insertar invitacion:", error);
        } else {
            messageApi.success('Invitación creada')
            setCurrentPhone(null)
            setCurrentPlan(null)
            setCurrentTemplate(null)
            setDominio(null)
            setVisible(false)
            refreshInvitations()
        }


    };



    return (
        <>
            {contextHolder}
            <Drawer
                // title="Basic Drawer"
                placement="right"
                className='help-drawer'
                closable={false}
                onClose={handleClose}
                open={visible}
                width={'50%'}
                title={'Configura tu evento'}
                extra={(currentPlan && currentPhone && currentTemplate && dominio) && <CustomButton onClick={handleNew} icon={<LuPlus size={18} style={{ marginTop: '4px' }} />} label="Crear Evento" variant="primary" />}

            >

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
        </>
    )
}





const Dominio = ({ load, dominios, setAvailableNext, dominio, setDominio, setCurrentPhone }) => {

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


    useEffect(() => {
        if (!dominio || !code || !phone || phone?.length !== 10) {
            setAvailableNext(false)
        }
    }, [dominio])

    useEffect(() => {
        if (code && phone?.length === 10)
            setCurrentPhone(`${code}${phone}`)
        else {
            setCurrentPhone(null)
        }
    }, [code, phone])


    return (

        !load ?
            <div className='new-invitation-dominio-container'>
                <span className='new-invitation-label'>Ruta de la invitación</span>
                <span className='route-info'>La ruta de la invitación es el enlace web donde tus invitados podrán acceder a la invitación. Debe de ser única y especial. Es fundamental evitar el uso de puntos u otros caracteres especiales para garantizar que el enlace sea claro y fácil de compartir.</span>

                <div className='dominio-new-invitation-container' style={{ marginTop: '12px', gap: '12px' }}>
                    {/* <Input
                        onChange={(e) => compareDominios(e.target.value)}

                        value={dominio}
                        className='gc-input-text'
                        style={{
                            width: '400px', marginRight: '10px',
                        }}
                        placeholder={'Dominio'}
                    /> */}

                    <Input
                        style={{ borderRadius: '99px', height: '34px', paddingLeft: '16px' }}
                        onChange={(e) => compareDominios(e.target.value)}
                        status={isMatch ? "" : "error"} placeholder={isMatch ? "" : "Dominio ocupado"} />

                    <div className='dominio_status' style={{
                        backgroundColor: isMatch ? 'var(--brand-color-500)' : '#D32F2F'
                    }}>
                        {
                            isMatch ? <LuCheck /> : <LuX />
                        }
                    </div>

                    {
                        !isMatch &&
                        <span style={{
                            fontWeight: 600, color: isMatch ? 'var(--brand-color-500)' : '#D32F2F',
                            marginLeft: '-8px', fontSize: '16px', textAlign: 'left'
                        }}>{errorMessage}</span>
                    }

                    {/* {
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
                    } */}

                </div>

                <img src={images.route} alt='' style={{ width: '100%', boxShadow: '0px 0px 12px rgba(0,0,0,0.2)', borderRadius: '24px', margin: '24px 0px' }} />


                <span className='new-invitation-label'>Whatsapp</span>
                <span className='route-info'>Comparte una cuenta de whatsapp a la cual estará asociada tu evento</span>

                <Space.Compact>
                    <Input status={!code ? "error" : 'success'} style={{ borderRadius: '99px 0px 0px 99px', width: '20%' }} value={code} onChange={(e) => setCode(e.target.value)} />
                    <Input status={phone?.length < 10 ? "error" : 'success'} style={{ borderRadius: '0px 99px 99px 0px', width: '80%' }} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Space.Compact>

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
                            key={template.id} className={`template-item${template.type === currentTemplate ? '-selected' : ''}`}>
                            <template.icon style={{ fontSize: '50px', color: '#1B1B1B' }} />
                            <span className="template-name-label" >{template.name}</span>
                        </div>
                    ))
                }
            </div>


        </div>
    )
}


const Pago = ({ setCurrentPlan, currentPlan }) => {


    return (
        <div className='new-invitation-dominio-container'>
            {/* <span className='new-invitation-label'>Comprobante de pago</span> */}
            <div style={{
                width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '16px'
            }}>
                <span className='new-invitation-fnl-label'>Elige el plan que más te funcione</span>

                <div className='plans_cont' style={{ flexDirection: 'column' }}>


                    <div onClick={() => setCurrentPlan('pro')} className='plan_card' style={{ backgroundColor: "#20212B", outline: currentPlan === 'pro' && '6px solid #A99FC7' }}>
                        <img src="/images/plan_pro.png" alt='' style={{ width: '220px' }} />
                        <CustomButton icon={<FaPlus size={16} style={{ marginTop: '4px' }} />} label="Seleccionar" />

                    </div>

                    <div onClick={() => setCurrentPlan('lite')} className='plan_card' style={{ backgroundImage: "linear-gradient(to right, #A99FC7 10%, #C0B9D6 30%)", outline: currentPlan === 'lite' && '6px solid #A99FC7' }}>
                        <img src="/images/plan_lite.png" alt='' style={{ width: '220px' }} />
                        <CustomButton icon={<FaPlus size={16} style={{ marginTop: '4px' }} />} label="Seleccionar" />

                    </div>

                    <div onClick={() => setCurrentPlan('paperless')} className='plan_card' style={{ backgroundImage: "linear-gradient(to bottom, #FFFFFF, #F8F9F9)", outline: currentPlan === 'paperless' && '6px solid #A99FC7' }}>
                        <img src="/images/plan_paperless.png" alt='' style={{ width: '220px' }} />
                        <CustomButton icon={<FaPlus size={16} style={{ marginTop: '4px' }} />} label="Seleccionar" />

                    </div>

                </div>

                {/* <Plans /> */}

                {/* <div style={{
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
                </Link> */}



            </div>
        </div>
    )
}



