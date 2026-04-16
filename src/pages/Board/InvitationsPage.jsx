import React, { useContext, useEffect, useState, } from 'react'
import { Empty, Input, Layout, Row, message, Modal, Button } from 'antd';
import { Login } from '../../components/Auth/Login';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LuLink2, } from 'react-icons/lu';
import { FooterApp } from '../../modules/Footer/FooterApp'
import { appContext } from '../../context';
import { HeaderBuild } from '../../modules/Header/Header';
import { load } from '../../helpers/assets/images';
import { darker } from '../../helpers/assets/functions';
import { RiArrowRightSLine } from 'react-icons/ri';
import UserPopUp from '../../components/UserPopUp/UserPopUp';

const { Content } = Layout;

const baseProd = "https://www.iattend.events"


export const InvitationsPage = () => {

    const [invitationsCopy, setInvitationsCopy] = useState(null)
    const [loader, setLoader] = useState(false)
    const { pathname } = useLocation();
    const [invitationsNI, setInvitationsNI] = useState(null)
    const { logout, logged } = useContext(appContext)
    const sessions = JSON.parse(localStorage.getItem("session"));

    const navigate = useNavigate();

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
        setInvitationsCopy(invitationsNI)
    }, [invitationsNI])





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
                    marginTop: '80px', maxWidth: '100vw', padding:0, 
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
                                            position: 'relative', padding: '16px', gap: '24px', width: '100%',
                                        }}>
                                            <div className='inv-title-cta-filter'>

                                                <Row className='invs-header-ctas'>

                                                    <span className='guests-title-page'>Mis eventos ({invitationsCopy?.length})</span>
                                                    <Input
                                                        placeholder={'Búscar evento'}
                                                        onChange={(e) => handleFilter(e.target.value)}
                                                        className='invs-searcher' />
                                                    {/* <Button style={{ borderRadius: '99px' }} icon={<LuPlus />} type='primary'>Nuevo evento</Button> */}


                                                </Row>


                                            </div>

                                            <div className={`inv-invitations-container`} >
                                                {
                                                    load ? (
                                                        invitationsCopy?.length > 0 ? (
                                                            invitationsCopy.map((invitation) => (
                                                                <div
                                                                    style={{ boxShadow: !invitation.started && '0px 0px 12px rgba(0,0,0,0.2)' }}
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
                                                                            background: `linear-gradient(to top, ${darker(invitation.data.generals.colors.primary, 0.2)}, rgba(0,0,0,0))`,
                                                                            mixBlendMode: 'multiply'
                                                                        }}></div>

                                                                        <div className='background-cover-invitations-page'
                                                                            style={{
                                                                                flexDirection: invitation.data.cover.title.position.column_reverse,
                                                                                pointerEvents: 'none',
                                                                                zIndex: 0
                                                                            }}>


                                                                            <div style={{
                                                                                alignItems: invitation.data.cover.title.position.align_y,
                                                                                padding: invitation.data.cover.date.active ? 0 : '10px',

                                                                            }}>
                                                                                <span style={{
                                                                                    color: invitation.data.cover.title.text.color ?? "#FFFFFF", width: '100%',
                                                                                    textAlign: invitation.data.cover.title.position.align_x, fontSize: '38px', wordBreak: 'break-word',
                                                                                    opacity: invitation.data.cover.title.text.opacity, fontFamily: invitation.data.cover.title.text.typeFace, fontWeight: invitation.data.cover.title.text.weight,
                                                                                    lineHeight: '1.2'
                                                                                }}>{invitation.data.cover.title.text.value}</span>
                                                                            </div>


                                                                        </div>



                                                                    </div>

                                                                    {

                                                                        <div style={{
                                                                            position: 'absolute', bottom: 0, left: 0, width: '100%',
                                                                            boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                                                                            gap: '12px', padding: '16px', paddingBottom: '24px'
                                                                        }}>

                                                                            <span style={{ color: "#FFFFFF80" }}>
                                                                                {invitation.name}
                                                                            </span>
                                                                            <button
                                                                                onClick={() => handleMoode(invitation.id)}
                                                                                className='liquid-btn'
                                                                            >
                                                                                Comenzar
                                                                                <RiArrowRightSLine size={25} />
                                                                            </button>
                                                                        </div>
                                                                    }

                                                                    <button
                                                                        className='liquid-btn'
                                                                        style={{

                                                                            position: 'absolute', top: '12px', right: '12px',
                                                                            padding: '4px 12px', fontSize: '12px',
                                                                            boxShadow: '0px 0px 8px rgba(0,0,0,0.2)'
                                                                        }}
                                                                        disabled={invitation.active ? false : true}
                                                                        onClick={() => copyToClipboard(`${baseProd}/${invitation?.data?.generals?.event?.label}/${invitation?.data?.generals?.event?.name}`)}
                                                                        // onClick={() => handleQRO(invitation.mongo_id)}
                                                                        
                                                                    ><LuLink2 size={14} /> Copiar link</button>

                                                                    <div
                                                                        className='state-dot--active'
                                                                        style={{
                                                                            position: 'absolute', top: '16px', left: '16px',
                                                                        }}
                                                                    ></div>


                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    width: '95vw',
                                                                    marginTop: '100px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                }}
                                                            >
                                                                <Empty style={{ marginTop: '50px' }} description={false} />
                                                            </div>
                                                        )
                                                    ) : (
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

                                        </div>

                                        

                                        
                                }


                            </Content>
                    }



                </Layout>

            </Layout >
            <FooterApp></FooterApp>

        </div>
    )
}
