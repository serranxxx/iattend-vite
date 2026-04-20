import React, { useContext, useEffect, useState } from 'react'
import { Input, Layout, Row, message, Button } from 'antd';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { appContext } from '../../context';
import { HeaderBuild } from '../../modules/Header/Header';
import { load } from '../../helpers/assets/images';
import { darker } from '../../helpers/assets/functions';
import UserPopUp from '../../components/UserPopUp/UserPopUp';
import { Calendar1, Gift, Link2, Play, Plus } from 'lucide-react';
import { NewInvitationDrawer } from '../../components/Create/NewInvitationDrawer';
import { FooterApp } from '../../modules/Footer/FooterApp';

const { Content } = Layout;

const baseProd = "https://www.iattend.events"

const getGreeting = (name) => {
    const hour = new Date().getHours();
    const morning = [
        `¡Buenos días, ${name}!`,
        `¡Hola, ${name}!`,
        `¿Listo para comenzar, ${name}?`,
    ];
    const afternoon = [
        `¡Buenas tardes, ${name}!`,
        `¡Hola, ${name}!`,
        `¿Cómo va todo, ${name}?`,
    ];
    const night = [
        `¡Buenas noches, ${name}!`,
        `¡Hola, ${name}!`,
        `¿Cómo va todo, ${name}?`,
    ];

    const pool = hour >= 6 && hour < 13 ? morning
        : hour >= 13 && hour < 20 ? afternoon
            : night;

    return pool[Math.floor(Math.random() * pool.length)];
};

export const InvitationsPage = () => {

    const [invitationsCopy, setInvitationsCopy] = useState(null)
    const [loader, setLoader] = useState(false)
    const { pathname } = useLocation();
    const [invitationsNI, setInvitationsNI] = useState(null)
    const { logout, logged } = useContext(appContext)
    const sessions = JSON.parse(localStorage.getItem("session"));
    const [visible, setVisible] = useState(false)

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const handleFilter = (value) => {
        setInvitationsCopy(
            invitationsNI.filter((inv) => inv.data?.cover?.title?.text?.value.toLowerCase().includes(value.toLowerCase()))
        );
    };

    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success('Link copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const handleMoode = (id) => {
        const params = new URLSearchParams({ id });
        navigate(`/dashboard?${params.toString()}`);
    };

    const getNewInvitations = async () => {

        if (!sessions) {
            console.log("No hay usuario autenticado");
            logout();
            navigate(`/login`);
            setLoader(false);
            return;
        }

        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
            console.error("Error al obtener la sesión:", sessionError);
            return;
        }

        if (!session) {
            console.log("No hay usuario autenticado");
            return;
        }

        setLoader(true)

        const { data, error } = await supabase
            .from("invitations")
            .select("*")
            .eq("user_id", session.user.id);

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            setLoader(false)
            setInvitationsNI(data)
        }
    };

    useEffect(() => {
        getNewInvitations();
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    useEffect(() => {
        if (!logged) {
            getNewInvitations()
        }
    }, [logged])

    useEffect(() => {
        if (searchParams.get("success") === "true") {
            getNewInvitations();
            setVisible(false);
            setSearchParams({});
        }
    }, [])



    useEffect(() => {
        setInvitationsCopy(invitationsNI)
    }, [invitationsNI])

    const name = sessions?.user?.name?.split(' ')[0] || 'Usuario';
    const [greeting] = useState(() => getGreeting(name));





    return (
        <div className='invitations-page-main-container' >

            <Layout
                style={{
                    position: 'relative', width: '100%', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--ft-color)',
                    maxWidth: '1480px',
                }}>

                <HeaderBuild position={'invitations'} isVisible={true} />
                <UserPopUp logout={logout} />
                <Layout className='scroll-invitation build-invitation-layout main-dash-layout' style={{
                    marginTop: '80px', maxWidth: '100vw', padding: 0,
                    backgroundColor: 'transparent',
                }} >
                    {
                        loader ?
                            <div style={{
                                height: '80vh', display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                            }}>
                                <img alt='' src={load} style={{
                                    width: '200px'
                                }} />
                            </div>


                            : <Content className='invitations-main-content' >


                                {
                                    sessions?.logged &&
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column',
                                        position: 'relative', padding: '0px', gap: '36px', width: '100%',
                                        paddingTop: '36px'
                                    }}>
                                        <div className='inv-title-cta-filter'>

                                            <Row className='invs-header-ctas'>

                                                <span className='invitations_title'>{greeting}</span>
                                                <Input
                                                    placeholder={'Búscar evento'}
                                                    onChange={(e) => handleFilter(e.target.value)}
                                                    className='invs-searcher' />
                                                {/* <Button style={{ borderRadius: '99px' }} icon={<LuPlus />} type='primary'>Nuevo evento</Button> */}


                                            </Row>


                                        </div>

                                        <div className={`inv-invitations-container`} >

                                            {
                                                invitationsCopy?.length > 1 ?

                                                    <div onClick={() => setVisible(true)} className={`invitation-container`} >


                                                        <div className='new_inv_cont'>
                                                            <div className='add_button_circle'>
                                                                <Plus size={32} color='var(--brand-color-500)' />
                                                            </div>

                                                            <span className='cta_title'>¿Nuevo evento en puerta?</span>
                                                            <span className='cta_text'>Nueva invitación</span>
                                                        </div>


                                                    </div>

                                                    :
                                                    <div  onClick={() => setVisible(true)} className={`invitation-container`} >


                                                        <div className='new_inv_cont'>
                                                            <div className='add_button_circle'>
                                                                <Calendar1 size={32} color='var(--brand-color-500)' />
                                                            </div>

                                                            <span className='cta_title'>Tu invitación te esta esperando</span>
                                                            <span className='cta_text'>Elige un plan y empieza a diseñar la invitación
                                                                de tu boda hoy mismo.</span>

                                                            <Button className='cta_plans'>Crea tu invitación</Button>

                                                            <small className='cta_support'>¿Tienes dudas? <a>Contactanos</a></small>
                                                        </div>


                                                    </div>

                                            }

                                            {
                                                load ? (
                                                    invitationsCopy?.map((invitation) => (
                                                        <div
                                                            key={invitation.id}
                                                            className={`invitation-container`}
                                                        >
                                                            <div className={`invitation-image-container`}>
                                                                {
                                                                    invitation?.data?.cover?.image?.prod && (
                                                                        <img src={invitation.data.cover.image.prod} alt="Featured product" />
                                                                    )}
                                                                <div style={{
                                                                    position: 'absolute', width: '100%', height: '100%', top: '0px', left: '0px',
                                                                    background: `linear-gradient(to top, ${darker(invitation?.data?.generals?.colors?.primary, 0.2)}, rgba(0,0,0,0))`,
                                                                    mixBlendMode: 'multiply', opacity: 0.5,
                                                                }}></div>
                                                            </div>

                                                            {

                                                                <div style={{
                                                                    width: '100%',
                                                                    boxSizing: 'border-box', display: 'flex',
                                                                    alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                                                                    gap: '4px', padding: '12px',
                                                                }}>

                                                                    <span className='invitation_name'>
                                                                        {invitation?.data?.cover?.title?.text?.value}
                                                                    </span>

                                                                    <span className='invitation_path'>
                                                                        {invitation?.name}
                                                                    </span>
                                                                    <div className='invitation_btns_cont'>
                                                                        <Button
                                                                            icon={<Play size={16} />}
                                                                            className='invitation_start_button'
                                                                            onClick={() => handleMoode(invitation.id)}
                                                                        >
                                                                            Comenzar
                                                                        </Button>

                                                                        <Button
                                                                            icon={<Link2 size={16} />}
                                                                            className='invitation_url_button'
                                                                            onClick={() => copyToClipboard(`${baseProd}/${invitation?.data?.generals?.event?.label}/${invitation?.data?.generals?.event?.name}`)}
                                                                        >
                                                                            Copiar link
                                                                        </Button>
                                                                    </div>

                                                                </div>
                                                            }

                                                            <div
                                                                className='invitation_status'
                                                                style={{
                                                                    position: 'absolute', top: '16px', right: '16px',
                                                                }}
                                                            >
                                                                <div className='status_indicator' style={{ backgroundColor: invitation.active ? '#4ADE80' : '#FBBF24' }}></div>
                                                                <span>{invitation.active ? 'Activa' : 'En pausa'}</span>

                                                            </div>


                                                        </div>
                                                    ))
                                                )
                                                    : (
                                                        <div
                                                            style={{
                                                                width: '100%',
                                                                marginTop: '150px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}
                                                        >
                                                            <img
                                                                src={load}
                                                                style={{
                                                                    width: '200px',
                                                                }}
                                                                alt="Loading"
                                                            />
                                                        </div>
                                                    )
                                            }
                                        </div>

                                        {/* <div className='banner_cont'>
                                            <div className="gift-banner">
                                                <div className="gift-left">
                                                    <div className="gift-icon">
                                                        <Gift size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="gift-title">Regala la invitación perfecta</div>
                                                        <div className="gift-sub">Alguien que conoces está planeando su boda. Dales I attend y que ellos diseñen cada detalle.</div>
                                                    </div>
                                                </div>
                                                <button className="gift-cta">Regalar I attend</button>
                                            </div>
                                        </div> */}

                                    </div>




                                }


                            </Content>
                    }



                </Layout>

            </Layout >
            <NewInvitationDrawer visible={visible} setVisible={setVisible} user={{ user_id: sessions?.user?.uid, user_email: sessions?.user?.email }} refreshInvitations={getNewInvitations} />
            <FooterApp></FooterApp>

        </div>
    )
}
