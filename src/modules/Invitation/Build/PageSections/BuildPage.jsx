import { Layout, message } from 'antd'
import React, { useEffect, useState } from 'react'
import './build-invitation.css'
import { supabase } from '../../../../lib/supabase'
import { FooterApp } from '../../../Footer/FooterApp'
import { HeaderDashboard } from '../../../Header/Header'
import { ButtonsMenu } from './ButtonsMenu'
import { BuildMenu } from './BuildMenu'
import { BuildContent } from './BuildContent'
import { load } from '../../../../helpers/assets/images'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { BookUser, Camera, Feather, Gift, HeartHandshake, MapPinned, MessageSquareHeart, ScanHeart, ScrollText, Settings, Shirt } from 'lucide-react'

export const BuildPage = () => {


    const size = 16
    const buttons = [
        {
            icon: <Settings size={size}  />,
            action: null,
            name: 'Generales',
            type: 'generals',
            value: 1,
            position: 0,
            index: 0,
        },
        {
            icon: <ScanHeart size={size} />,
            action: null,
            name: 'Portada',
            type: 'cover',
            value: 2,
            position: 0,
            index: 0,
        },
        {
            icon: <HeartHandshake size={size} />,
            action: null,
            name: 'Bienvenida',
            type: 'greeting',
            value: 3,
            position: 950,
            index: 1,
        },
        {
            icon: <BookUser size={size} />,
            action: null,
            name: 'Personas',
            type: 'family',
            value: 4,
            position: 1375,
            index: 2,
        },
        {
            icon: <Feather size={size} />,
            action: null,
            name: 'Cita',
            type: 'quote',
            value: 5,
            position: 1750,
            index: 3,
        },
        {
            icon: <ScrollText size={size} />,
            action: null,
            name: 'Itinerario',
            type: 'itinerary',
            value: 6,
            position: 2100,
            index: 4,
        },
        {
            icon: <Shirt size={size} />,
            action: null,
            name: 'Dresscode',
            type: 'dresscode',
            value: 7,
            position: 2750,
            index: 5,
        },
        {
            icon: <Gift size={size} />,
            action: null,
            name: 'Regalos',
            type: 'gifts',
            value: 8,
            position: 3050,
            index: 6,
        },
        {
            icon: <MapPinned size={size} />,
            action: null,
            name: 'Destinos',
            type: 'destinations',
            value: 9,
            position: 2750,
            index: 7,
        },
        {
            icon: <MessageSquareHeart size={size} />,
            action: null,
            name: 'Avisos',
            type: 'notices',
            value: 10,
            position: 3550,
            index: 8,
        },
        {
            icon: <Camera size={size} />,
            action: null,
            name: 'Galería',
            type: 'gallery',
            value: 11,
            position: 4500,
            index: 9,
        },
    ]

    const [positionY, setPositionY] = useState('generals')
    const [coverUpdated, setCoverUpdated] = useState(false)
    const [copy, setCopy] = useState(null)
    const [currentSection, setCurrentSection] = useState(1)
    const [messageApi, contextHolder] = message.useMessage();
    const [onHide, setOnHide] = useState(false)
    const [device, setDevice] = useState('ios')
    const [settingsModal, setSettingsModal] = useState(false)
    const [invitation, setInvitation] = useState(null)
    const [saved, setSaved] = useState(true);
    const [searchParams] = useSearchParams();
    const id = searchParams.get("id");

    const session = JSON.parse(localStorage.getItem("session"));

    // const [saved, setSaved] = useState(true)


    const handleClick = (item) => {
        setCurrentSection(item.value)
        setPositionY(item.type)
    }

    const onWriteChanges = async () => {

        const savedInvitation = {
            ...copy,
            cover: {
                ...copy.cover,
                image: {
                    ...copy.cover.image,
                    prod: copy.cover.image.dev,
                    dev: null
                }
            },
            quote: {
                ...copy.quote,
                image: {
                    ...copy.quote.image,
                    prod: copy.quote.image.dev,
                    dev: null
                }
            },
            dresscode: {
                ...copy.dresscode,
                prod: copy.dresscode.dev,
                dev: null
            },
            gallery: {
                ...copy.gallery,
                prod: copy.gallery.dev,
                dev: null
            }

        }

        try {
            await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/invitation/update-data`,
                { id, data: savedInvitation }
            );

            messageApi.info('Cambios escritos')
            setSaved(true)

        } catch (error) {
            console.error('Error updating invitation data:', error.response?.data || error.message);
            throw error;
        }

    }


    const onSaveChanges = async () => {

        const savedInvitation = {
            ...copy,
            cover: {
                ...copy.cover,
                image: {
                    ...copy.cover.image,
                    prod: copy.cover.image.dev,
                    dev: null
                }
            },
            quote: {
                ...copy.quote,
                image: {
                    ...copy.quote.image,
                    prod: copy.quote.image.dev,
                    dev: null
                }
            },
            dresscode: {
                ...copy.dresscode,
                prod: copy.dresscode.dev,
                dev: null
            },
            gallery: {
                ...copy.gallery,
                prod: copy.gallery.dev,
                dev: null
            }

        }

        const { error } = await supabase
            .from('invitations')
            .update({ data: savedInvitation })
            .eq("id", id)

        if (error) {
            console.error('Error actualizando:', error)
        } else {
            messageApi.success('Cambios guardados')
            setSaved(true)

        }
    }

    const getNewInvitations = async () => {

        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
            console.error("Error al obtener la sesión");
            return;
        }

        const { data, error } = await supabase
            .from("invitations")
            .select("data, id")
            // .eq("user_id", session.user.id)
            .eq("id", id)
            .maybeSingle();


        console.log(data)

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            setInvitation(data?.data)
            // setInvitationID(data?.id)
        }

    };


    useEffect(() => {
        getNewInvitations()
        setSaved(true)
    }, [id])


    useEffect(() => {
        if (invitation) {

            const newCopy = {
                ...invitation,
                cover: {
                    ...invitation?.cover,
                    image: {
                        ...invitation.cover?.image,
                        dev: invitation.cover?.image.prod
                    }
                    // featured_dev: invitation.cover.featured_prod
                },
                quote: {
                    ...invitation?.quote,
                    image: {
                        ...invitation.quote?.image,
                        dev: invitation.quote.image?.prod
                    }
                },

                dresscode: {
                    ...invitation?.dresscode,
                    dev: invitation.dresscode?.prod
                },
                gallery: {
                    ...invitation?.gallery,
                    dev: invitation.gallery?.prod
                }

            }


            setCopy(newCopy)
        }
    }, [invitation])


    useEffect(() => {
        if (coverUpdated) {

            handleClick(buttons[0])

            setTimeout(() => {
                // setLoader(true)
                // getInvitationbyID(operation, invitationID)
                setCoverUpdated(false)
                handleClick(buttons[1])

            }, 500);
        }
    }, [coverUpdated])

    useEffect(() => {
        const handleTexture = () => {
            setCopy(prevInvitation => ({
                ...prevInvitation,
                generals: {
                    ...prevInvitation.generals,
                    texture: prevInvitation.generals.texture
                }
            }));
        }

        if (copy) {
            handleTexture()
        }

    }, [saved])


    return (

        <>
            {contextHolder}

            {
                copy ?
                    <Layout className='main-build-layout' style={{ minHeight: '100vh', overflow: 'hidden' }}>

                        <HeaderDashboard saved={saved} mode={'edit'} onSaveChanges={onSaveChanges} session={session} onWriteChanges={onWriteChanges} />


                        <div className='build-componentes-container' style={{ margin: '0px', position: 'relative', justifyContent: 'flex-start' }}>


                            <div className='buld-interacting-tools-cont'>

                                <ButtonsMenu invitation={copy} setOnHide={setOnHide} buttons={buttons} currentSection={currentSection} handleClick={handleClick} />

                                <BuildMenu
                                    invitationID={id}
                                    setSettingsModal={setSettingsModal} settingsModal={settingsModal} setSaved={setSaved} saved={saved} onHide={onHide} setOnHide={setOnHide}
                                    buttons={buttons} currentSection={currentSection} setPositionY={setPositionY} positionY={positionY} invitation={copy} setInvitation={setCopy} />

                            </div>

                            <BuildContent invitationID={id}
                                setDevice={setDevice} currentDevice={device} coverUpdated={coverUpdated} positionY={positionY} setPositionY={setPositionY} invitation={copy} />

                        </div>

                        <FooterApp ></FooterApp>

                    </Layout >
                    : <div className='build-loading-container'>
                        <img alt='' src={load} style={{
                            width: '200px'
                        }} />
                    </div>
            }



        </>

    )
}
