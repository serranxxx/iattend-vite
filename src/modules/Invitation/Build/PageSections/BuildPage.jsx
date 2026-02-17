import { Layout, message } from 'antd'
import React, { useEffect, useState } from 'react'
import './build-invitation.css'
import { supabase } from '../../../../lib/supabase'
import { FooterApp } from '../../../Footer/FooterApp'
import { LuClipboardList, LuFeather, LuFrame, LuGift, LuHeartHandshake, LuImage, LuMapPin, LuNewspaper, LuSettings, LuShirt, LuUsers } from 'react-icons/lu'
import { HeaderDashboard } from '../../../Header/Header'
import { ButtonsMenu } from './ButtonsMenu'
import { BuildMenu } from './BuildMenu'
import { BuildContent } from './BuildContent'
import { load } from '../../../../helpers/assets/images'
import { useSearchParams } from 'react-router-dom'

export const BuildPage = () => {


    const size = 18
    const styleIcon = {
    }
    const buttons = [
        {
            icon: <LuSettings size={size} style={styleIcon} />,
            action: null,
            name: 'Generales',
            type: 'generals',
            value: 1,
            position: 0,
            index: 0,
        },
        {
            icon: <LuFrame size={size} style={styleIcon} />,
            action: null,
            name: 'Portada',
            type: 'cover',
            value: 2,
            position: 0,
            index: 0,
        },
        {
            icon: <LuHeartHandshake size={size} style={styleIcon} />,
            action: null,
            name: 'Bienvenida',
            type: 'greeting',
            value: 3,
            position: 950,
            index: 1,
        },
        {
            icon: <LuUsers size={size} style={styleIcon} />,
            action: null,
            name: 'Personas',
            type: 'family',
            value: 4,
            position: 1375,
            index: 2,
        },
        {
            icon: <LuFeather size={size} style={styleIcon} />,
            action: null,
            name: 'Cita',
            type: 'quote',
            value: 5,
            position: 1750,
            index: 3,
        },
        {
            icon: <LuClipboardList size={size} style={styleIcon} />,
            action: null,
            name: 'Itinerario',
            type: 'itinerary',
            value: 6,
            position: 2100,
            index: 4,
        },
        {
            icon: <LuShirt size={size} style={styleIcon} />,
            action: null,
            name: 'Dresscode',
            type: 'dresscode',
            value: 7,
            position: 2750,
            index: 5,
        },
        {
            icon: <LuGift size={size} style={styleIcon} />,
            action: null,
            name: 'Regalos',
            type: 'gifts',
            value: 8,
            position: 3050,
            index: 6,
        },
        {
            icon: <LuMapPin size={size} style={styleIcon} />,
            action: null,
            name: 'Destinos',
            type: 'destinations',
            value: 9,
            position: 2750,
            index: 7,
        },
        {
            icon: <LuNewspaper size={size} style={styleIcon} />,
            action: null,
            name: 'Avisos',
            type: 'notices',
            value: 10,
            position: 3550,
            index: 8,
        },
        {
            icon: <LuImage size={size} style={styleIcon} />,
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
    const [onHide, setOnHide] = useState(false)
    const [device, setDevice] = useState('ios')
    const [settingsModal, setSettingsModal] = useState(false)
    const [invitation, setInvitation] = useState(null)
    const [saved, setSaved] = useState(true);
    const [searchParams] = useSearchParams();
    const id = searchParams.get("id");

    // const [saved, setSaved] = useState(true)


    const handleClick = (item) => {
        setCurrentSection(item.value)
        setPositionY(item.type)
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

        const { data, error } = await supabase
            .from('invitations')
            .update({ data: savedInvitation })
            .eq("id", id)

        if (error) {
            console.error('Error actualizando:', error)
        } else {
            message.success('Cambios guardados')
            console.log(data)
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

            {
                copy ?
                    <Layout className='main-build-layout' style={{ minHeight: '100vh', overflow: 'hidden' }}>

                        <HeaderDashboard saved={saved} mode={'edit'} onSaveChanges={onSaveChanges} />


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
