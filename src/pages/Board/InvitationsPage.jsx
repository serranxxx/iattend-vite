import React, { useContext, useEffect, useState } from 'react'
import { Input, Layout, Row, message, Button, notification, Segmented } from 'antd';
import { toFirstString } from '../../helpers/invitation/newInvitation';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { appContext } from '../../context';
import { HeaderBuild } from '../../modules/Header/Header';
import { load } from '../../helpers/assets/images';
import { AdsCarousel } from '../../components/AdsCarousel/AdsCarousel'
import { RegalaIAttend } from '../../components/RegalaIAttend/RegalaIAttend';
import { ArrowRight, Calendar1, ClipboardList, Gift, Plus, Share } from 'lucide-react';
import { NewInvitationDrawer } from '../../components/Create/NewInvitationDrawer';
import { GiftDrawer } from '../../components/Gift/GiftDrawer';
import { FooterApp } from '../../modules/Footer/FooterApp';
import { useTranslation } from 'react-i18next';
import { OnboardingWizard } from '../PreviewMood/OnboardingWizard';
import { useOnboardingDemoData } from '../PreviewMood/useOnboardingDemoData';
import { PlannerDashboard } from '../../components/PlannerDashboard/PlannerDashboard';

const { Content } = Layout;

const baseProd = "https://www.iattend.events"

export const InvitationsPage = () => {
    const { t } = useTranslation();

    const getGreeting = (name) => {
        const hour = new Date().getHours();
        const key = hour >= 6 && hour < 13 ? 'greet_morning'
            : hour >= 13 && hour < 20 ? 'greet_afternoon'
                : 'greet_night';
        const pool = t(`invitations.${key}`, { returnObjects: true, name });
        return pool[Math.floor(Math.random() * pool.length)];
    };

    const [invitationsCopy, setInvitationsCopy] = useState(null)
    const [loader, setLoader] = useState(false)
    const { pathname } = useLocation();
    const [invitationsNI, setInvitationsNI] = useState(null)
    const { logout, logged } = useContext(appContext)
    const sessions = JSON.parse(localStorage.getItem("session"));
    const [visible, setVisible] = useState(false)
    const [giftVisible, setGiftVisible] = useState(false)
    const [regalaVisible, setRegalaVisible] = useState(false)
    const [onboardingOpen, setOnboardingOpen] = useState(false)
    const { invitation: demoInvitation, buttons: demoButtons, invitationID: demoInvitationID } = useOnboardingDemoData()

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const isPlanner = sessions?.user?.role === 'planner'
    // Vista del planner: sus invitaciones o la pestaña "Dashboard". Va en la
    // URL (?view=data) para que recargar no lo regrese a las cards.
    const view = isPlanner && searchParams.get('view') === 'data' ? 'data' : 'invitations'
    const setView = (value) => {
        if (value === 'data') searchParams.set('view', 'data')
        else searchParams.delete('view')
        setSearchParams(searchParams, { replace: true })
    }

    // "Mis clientes" = eventos ajenos que organiza; "Mis eventos" = los suyos
    // (incluido el free con el que nace su cuenta). "Dashboard" = todo evento
    // donde está asignado como planner, aunque también sea el dueño.
    const esDeCliente = (inv) => inv.planner_id === sessions?.user?.uid && inv.user_id !== sessions?.user?.uid
    const plannerInvitations = (invitationsNI ?? []).filter(inv => inv.planner_id === sessions?.user?.uid)

    useEffect(() => {
        if (searchParams.get('welcome') === '1') {
            notification.success({
                message: '¡Bienvenido a I attend!',
                description: 'Tu evento ha sido creado. Personalízalo y compártelo cuando estés listo.',
                placement: 'topRight',
                duration: 6,
            })
            searchParams.delete('welcome')
            setSearchParams(searchParams, { replace: true })
        }
    }, [])

    // El evento free es solo el Save the Date: su título de portada es el de la
    // plantilla default, no el de la pareja. La tarjeta y el buscador usan este.
    const cardTitle = (inv) => inv?.plan === 'free'
        ? t('invitations.free_std_title')
        : (inv?.data?.cover?.title?.text?.value ?? '')

    const handleFilter = (value) => {
        setInvitationsCopy(
            invitationsNI.filter((inv) => cardTitle(inv).toLowerCase().includes(value.toLowerCase()))
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

    // Tarjeta de "nuevo evento": la grande invita a comprar el primero, la
    // chica acompaña a los que ya hay.
    const renderNewEventCard = (count) => count > 1 ? (
        <div onClick={() => navigate('/checkout')} className="invitation-container new-event-card">
            <div className='new_inv_cont'>
                <div className='add_button_circle'>
                    <Plus size={32} color='#0c171b' strokeWidth={3} />
                </div>
                <span className='cta_title' style={{ maxWidth: '100%' }}>
                    {t('invitations.new_event_title')}
                </span>
                <span className='cta_text'>{t('invitations.new_event_cta')}</span>
            </div>
        </div>
    ) : (
        <div onClick={() => navigate('/checkout')} className="invitation-container new-event-card">
            <div className='new_inv_cont' style={{minHeight:'400px', maxHeight:'400px'}}>
                <div className='add_button_circle'>
                    <Calendar1 size={32} color='#0c171b' strokeWidth={2} />
                </div>
                <span className='cta_title'>{t('invitations.empty_title')}</span>
                <span className='cta_text'>{t('invitations.empty_text')}</span>
                <Button type="primary" className='cta_plans'>{t('invitations.empty_cta')}</Button>
                {/* <small className='cta_support'>{t('invitations.empty_support')} <a>{t('invitations.empty_support_link')}</a></small> */}
            </div>
        </div>
    )

    const renderInvitationCard = (invitation) => (
        <div
            key={invitation.id}
            className="invitation-container"
        >
            {/* Full-bleed background image */}
            {toFirstString(invitation?.data?.cover?.image?.prod) && (
                <img
                    src={toFirstString(invitation.data.cover.image.prod)}
                    alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
            )}
            {/* Dark overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.5)',
                mixBlendMode: 'multiply',
            }} />

            {/* Text + buttons — pushed to bottom */}
            <div style={{
                position: 'relative', zIndex: 1,
                width: '100%', marginTop: 'auto',
                display: 'flex', flexDirection: 'column', gap: '4px',
            }}>
                <span className='invitation_name'>
                    {cardTitle(invitation)}
                </span>
                <span className='invitation_path'>
                    {invitation?.name}
                </span>
                <div className='invitation_btns_cont'>
                    <Button
                        disabled={!invitation.active}
                        icon={<ArrowRight size={16} />}
                        className='invitation_start_button'
                        onClick={() => handleMoode(invitation.id)}
                    >
                        {t('invitations.btn_start')}
                    </Button>
                    <Button
                        disabled={!invitation.active}
                        icon={<Share size={16} />}
                        className='invitation_url_button'
                        onClick={() => copyToClipboard(`${baseProd}/${invitation?.data?.generals?.event?.label}/${invitation?.data?.generals?.event?.name}`)}
                    />
                </div>
            </div>

            {/* Status badge */}
            <div
                className='invitation_status'
                style={{ position: 'absolute', top: '22px', right: '22px', zIndex: 2 }}
            >
                <div className='status_indicator' style={{ backgroundColor: invitation.active ? '#4ADE80' : '#FBBF24' }} />
                <span>{invitation.active ? t('invitations.status_active') : t('invitations.status_paused')}</span>
            </div>

            {/* Evento de un cliente que este usuario organiza como planner */}
            {esDeCliente(invitation) && (
                <div
                    className='invitation_status'
                    style={{ position: 'absolute', top: '22px', left: '22px', zIndex: 2 }}
                >
                    <ClipboardList size={12} />
                    <span>{t('invitations.planner_badge')}</span>
                </div>
            )}
        </div>
    )

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

        // Un planner ve sus eventos propios más los de sus clientes
        // (invitations.planner_id); en pantalla se separan en dos secciones.
        // Se filtra por rol, igual que can_manage_invitation en la base.
        const uid = session.user.id
        let query = supabase.from("invitations").select("*")
        query = sessions?.user?.role === 'planner'
            ? query.or(`user_id.eq.${uid},planner_id.eq.${uid}`)
            : query.eq("user_id", uid)

        const { data, error } = await query;

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
        <div className='invitations-page-main-container'>

            <Layout
                style={{
                    position: 'relative', width: '100%', display: 'flex', flexDirection: 'column',
                    backgroundColor: 'transparent',
                }}>

                <HeaderBuild position={'invitations'} isVisible={true} alwaysSolid={true} onTourClick={() => setOnboardingOpen(true)} />
                <Layout className='scroll-invitation build-invitation-layout main-dash-layout' style={{
                    maxWidth: '100vw', padding: 0,
                    backgroundColor: 'transparent',
                }} >
                    <div style={{ padding: '0px', width: '100%', overflow: 'hidden' }}>
                        <AdsCarousel onRegalar={() => setRegalaVisible(true)} />
                    </div>
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
                                    <div className='invitations-content-wrapper' style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column',
                                        position: 'relative', padding: '0px', gap: '36px', width: '100%',
                                        paddingTop: '54px', paddingBottom: '84px'
                                    }}>
                                        <div className='inv-title-cta-filter'>

                                            <Row className='invs-header-ctas'>

                                                <span className='invitations_title'>{greeting}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                    {view === 'invitations' && (
                                                        <Input
                                                            placeholder={t('invitations.search_placeholder')}
                                                            onChange={(e) => handleFilter(e.target.value)}
                                                            className='invs-searcher' />
                                                    )}
                                                    {isPlanner && (
                                                        <Segmented
                                                            shape='round'
                                                            value={view}
                                                            onChange={setView}
                                                            options={[
                                                                { value: 'invitations', label: t('planner.segment_invitations') },
                                                                { value: 'data', label: t('planner.segment_data') },
                                                            ]}
                                                        />
                                                    )}
                                                </div>
                                                {/* <Button style={{ borderRadius: '99px' }} icon={<LuPlus />} type='primary'>Nuevo evento</Button> */}


                                            </Row>


                                        </div>

                                        {view === 'data' ? (
                                            <PlannerDashboard invitations={plannerInvitations} />
                                        ) : isPlanner ? (
                                            // Una sola fila: "nuevo evento" siempre primero a la izquierda y
                                            // luego cada grupo con su título encima. Los vacíos no se pintan.
                                            <div className='inv-invitations-container inv-invitations-grouped'>
                                                {renderNewEventCard(invitationsCopy?.length ?? 0)}
                                                {[
                                                    { key: 'clients', title: t('invitations.section_clients'), items: (invitationsCopy ?? []).filter(esDeCliente) },
                                                    { key: 'own', title: t('invitations.section_own'), items: (invitationsCopy ?? []).filter(inv => !esDeCliente(inv)) },
                                                ].filter(group => group.items.length > 0).map(group => (
                                                    <section key={group.key} className='inv-group'>
                                                        <span className='inv-section-title'>
                                                            {group.title} <small>{group.items.length}</small>
                                                        </span>
                                                        <div className='inv-group-cards'>
                                                            {group.items.map(renderInvitationCard)}
                                                        </div>
                                                    </section>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className='inv-invitations-container'>
                                                {renderNewEventCard(invitationsCopy?.length ?? 0)}
                                                {invitationsCopy?.map(renderInvitationCard)}
                                            </div>
                                        )}

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
                                                <button className="gift-cta" onClick={() => setGiftVisible(true)}>Regalar I attend</button>
                                            </div>
                                        </div> */}

                                    </div>




                                }


                            </Content>
                    }



                </Layout>

            </Layout >
            <NewInvitationDrawer visible={visible} setVisible={setVisible} user={{ user_id: sessions?.user?.uid, user_email: sessions?.user?.email }} refreshInvitations={getNewInvitations} />
            <RegalaIAttend visible={regalaVisible} onClose={() => setRegalaVisible(false)} />
            <GiftDrawer visible={giftVisible} setVisible={setGiftVisible} />
            <OnboardingWizard
                open={onboardingOpen && !!demoInvitation}
                onClose={() => setOnboardingOpen(false)}
                invitation={demoInvitation}
                buttons={demoButtons}
                invitationID={demoInvitationID}
            />
            <FooterApp></FooterApp>

        </div>
    )
}
