
import { Badge, Breadcrumb, Button, Dropdown, Grid, Popconfirm, Row, Tooltip, message } from "antd"
import logoBlue from '/images/logo_blue.png'
import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Link, useSearchParams } from "react-router-dom"
import { useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuBadgeHelp, LuClipboard, LuClipboardCheck, LuFolderHeart, LuFolderOpen, LuLink, LuLogOut, LuMenu, LuSendHorizontal, LuShield, LuShieldCheck, LuUpload, } from "react-icons/lu"
import { IoClose, } from "react-icons/io5"
import { supabase } from "../../lib/supabase";
import { CustomLink } from "../../components/CustomLink/CustomLink";
import { ChevronDown, Menu, MessageCircle, Share } from "lucide-react";
import { appContext } from '../../context';
import { WhatsappMessages } from '../GuestManagement/WhatsappMessages/WhatsappMessages';
import { useTranslation } from 'react-i18next';
import { CreditController } from "../../components/Payment/CreditController/CreditController"
import { useDashboardRealtime } from "../../context/DashboardRealtimeContext";

const baseProd = "https://www.iattend.events"

const { useBreakpoint } = Grid;

//  

export const HeaderBuild = ({ position, isVisible, fixed = true, alwaysSolid = true }) => {
    const { t } = useTranslation()
    const { logout } = useContext(appContext)
    const [openMenu, setOpenMenu] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [totalEvents, setTotalEvents] = useState(null)
    const [totalConfirmed, setTotalConfirmed] = useState(null)
    const session = JSON.parse(localStorage.getItem("session"))

    const navItems = [
        { name: 'Mis eventos', path: '/invitations', position: 'invitations' },
        { name: 'Explora',     path: '/features',    position: 'pricing'     },
        { name: 'Administrador', path: '/admin',     position: 'admin', adminOnly: true },
    ]

    const [pastBanner, setPastBanner] = useState(false)

    useEffect(() => {
        const THRESHOLD = 340  // banner height (400) - header height (60)
        const onScroll = () => setPastBanner(window.scrollY > THRESHOLD)
        window.addEventListener('scroll', onScroll, { passive: true })
        onScroll()
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    const loadUserStats = async () => {
        if (!session?.user?.uid) return
        try {
            const [{ data: events }, { data: confirmed }] = await Promise.all([
                supabase.rpc('get_total_invitations_by_user',       { p_user_id: session.user.uid }),
                supabase.rpc('get_confirmed_guests_count_by_user',  { p_user_id: session.user.uid }),
            ])
            setTotalEvents(events)
            setTotalConfirmed(confirmed)
        } catch (e) { console.error(e) }
    }

    const userDropdown = (
        <div className="hb-user-dropdown" onClick={e => e.stopPropagation()}>
            <div className="hb-user-dropdown-top">
                <img src='/images/user_icon.png' alt='' className="hb-user-avatar" />
                <Button onClick={logout} icon={<LuLogOut size={14} />} size="small" className="hb-logout-btn">
                    Cerrar sesión
                </Button>
            </div>
            <div className="hb-user-info">
                <span className="hb-user-name">{session?.user?.name}</span>
                <span className="hb-user-email">{session?.user?.email}</span>
            </div>
            <div className="hb-user-stats">
                <div className="hb-user-stat">
                    <span className="hb-stat-value">{totalEvents ?? '…'}</span>
                    <span className="hb-stat-label">Eventos creados</span>
                </div>
                <div className="hb-stat-divider" />
                <div className="hb-user-stat">
                    <span className="hb-stat-value">{totalConfirmed ?? '…'}</span>
                    <span className="hb-stat-label">Invitados confirmados</span>
                </div>
            </div>
        </div>
    )

    return (
        <>
            {/* ── Desktop ── */}
            <header className={`header-main-container web-opt${(!alwaysSolid && !pastBanner) ? ' hb-transparent' : ''}${fixed ? '' : ' hb-relative'}`}>
                <div className="hb-inner">
                    <Link to="/invitations" className="hb-brand">
                        <img
                            src={(alwaysSolid || pastBanner) ? logoBlue : '/images/logo_cover.png'}
                            alt="I attend"
                            style={{ height: '42px', objectFit: 'contain' }}
                        />
                    </Link>

                    <nav className="hb-nav-right">
                        {navItems.map(item => {
                            if (item.adminOnly && session?.user?.role !== 'Administration') return null
                            return (
                                <Link to={item.path} key={item.name}>
                                    <span className={`hb-nav-btn${item.position === position ? ' hb-nav-btn--active' : ''}`}>
                                        {item.name}
                                    </span>
                                </Link>
                            )
                        })}

                        {session?.logged && (
                            <Dropdown
                                open={dropdownOpen}
                                onOpenChange={open => { setDropdownOpen(open); if (open) loadUserStats() }}
                                trigger={['click']}
                                dropdownRender={() => userDropdown}
                                placement="bottomRight"
                            >
                                <button className="hb-user-btn">
                                    {session?.user?.name?.split(' ')[0]}
                                    <ChevronDown size={13} />
                                </button>
                            </Dropdown>
                        )}
                    </nav>
                </div>
            </header>

            {/* ── Mobile bar ── */}
            <div style={{ opacity: isVisible ? 1 : 0 }} className="header-main-container mobile-opt">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '90%' }}>
                    <Link to="/invitations">
                        <img src={logoBlue} alt="I attend" style={{ height: '36px', objectFit: 'contain' }} />
                    </Link>
                    <Button onClick={() => setOpenMenu(true)} type="text" icon={<Menu style={{ color: '#0c171b' }} />} />
                </div>
            </div>

            {/* ── Mobile overlay ── */}
            <div
                style={{ right: !openMenu ? '-100vw' : '0px', opacity: openMenu ? 1 : 0 }}
                className="mobile-menu-container"
            >
                <button className="mobile-close-btn" onClick={() => setOpenMenu(false)} aria-label="Cerrar">
                    <IoClose size={28} strokeWidth={3} />
                </button>

                <nav className="mobile-menu-routes">
                    {navItems.map((item, i) => {
                        if (item.adminOnly && session?.user?.role !== 'Administration') return null
                        const isActive = item.position === position
                        return (
                            <Link
                                key={item.name}
                                style={{ textDecoration: 'none', transitionDelay: openMenu ? `${i * 60}ms` : '0ms' }}
                                to={item.path}
                                onClick={() => setOpenMenu(false)}
                            >
                                <span className={`mobile-nav-item ${isActive ? 'mobile-nav-item--active' : 'mobile-nav-item--inactive'}`}>
                                    {item.name}
                                </span>
                            </Link>
                        )
                    })}
                    <Link target='_blank' style={{ textDecoration: 'none' }} to="https://wa.me/6145338500" onClick={() => setOpenMenu(false)}>
                        <span className="mobile-nav-item mobile-nav-item--inactive">{t('header.contact')}</span>
                    </Link>
                </nav>
            </div>
        </>
    )
}
export const HeaderDashboard = ({ saved, mode, onSaveChanges, session, onWriteChanges, sideEventName, onSideEventsBack }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const id = searchParams.get("id");
    const sessionId = searchParams.get("session_id");
    const canceled = searchParams.get("canceled");

    const [messageApi, contextHolder] = message.useMessage();
    const [invitation, setInvitation] = useState(null)

    const [conversations, setConversations] = useState([])
    const [unAnswer, setUnAnswer] = useState(0)
    const [guestsByPhone, setGuestsByPhone] = useState(new Map())

    const [mobileWaOpen, setMobileWaOpen]       = useState(false)
    const [mobileWaVisible, setMobileWaVisible] = useState(false)
    const [mobileWaEntered, setMobileWaEntered] = useState(false)

    useEffect(() => {
        if (mobileWaOpen) {
            setMobileWaVisible(true)
            requestAnimationFrame(() => requestAnimationFrame(() => setMobileWaEntered(true)))
        } else {
            setMobileWaEntered(false)
            const timer = setTimeout(() => setMobileWaVisible(false), 340)
            return () => clearTimeout(timer)
        }
    }, [mobileWaOpen])

    const isEditing = mode === "edit" || mode === "on-edit";
    const hasUnsavedChanges = isEditing && !saved;
    const screens = useBreakpoint();
    const [urlImage, setUrlImage] = useState(null)

    const [name, setName] = useState(null)

    const getInvitation = async () => {

        const { data, error } = await supabase
            .from("invitations")
            .select("data, plan, name, url_image")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            setInvitation(data.data)

            setName(data.name)
            setUrlImage(data.url_image)
        }
    }

    const calculateUnAnswer = (convs) => {
        let count = 0
        convs.forEach(conv => conv.messages.forEach(msg => {
            if (!msg.read && msg.direction === 'inbound') count += 1
        }))
        setUnAnswer(count)
    }

    const getChats = async () => {
        const { data, error } = await supabase.rpc('get_conversations_by_invitation', { p_invitation_id: id })
        if (error) return
        setConversations(data)
        calculateUnAnswer(data)
    }

    const getGuestsMap = async () => {
        const { data } = await supabase.from('guests').select('phone_number, name').eq('invitation_id', id)
        if (data) setGuestsByPhone(new Map(data.map(g => [String(g.phone_number).replace(/\D/g, ''), g.name])))
    }

    /* ========================
       HELPERS
    ======================== */


    const handleBack = useCallback(() => {
        if (onSideEventsBack) {
            onSideEventsBack();
        } else if (mode === 'dashboard') {
            navigate('/invitations');
        } else {
            navigate(-1);
        }
    }, [navigate, onSideEventsBack, mode]);

    const goToDashboard = useCallback(() => {
        navigate(`/dashboard?id=${id}`);
    }, [navigate, id]);

    const goToInvitations = useCallback(() => {
        navigate("/invitations");
    }, [navigate]);

    const updateURLimage = async (e) => {

        const { error } = await supabase
            .from('invitations')
            .update({ url_image: e })
            .eq("id", id)


        if (error) {
            console.error('Error actualizando:', error)
        } else {
            message.success('Imagen actualizada')
            setUrlImage(e)

        }
    };

    /* ========================
       BREADCRUMB ITEMS
    ======================== */

    const breadcrumbItems = useMemo(() => {
        if (!invitation) return [];

        const confirmWrapper = (node, action) =>
            hasUnsavedChanges ? (
                <Popconfirm
                    title={t('dashboard_header.unsaved_title')}
                    description={t('dashboard_header.unsaved_desc')}
                    onConfirm={action}
                    okText={t('dashboard_header.exit')}
                    cancelText={t('dashboard_header.cancel')}
                >
                    {node}
                </Popconfirm>
            ) : (
                node
            );

        const items = [
            // {
            //     title: confirmWrapper(
            //         <span style={{ cursor: "pointer" }} onClick={goToInvitations}>
            //             {t('dashboard_header.my_invitations')}
            //         </span>,
            //         goToInvitations
            //     )
            // },
            {
                title: confirmWrapper(
                    <span style={{ cursor: "pointer" }} onClick={goToDashboard}>
                        {invitation?.cover?.title?.text?.value}
                    </span>,
                    goToDashboard
                )
            }
        ];

        const modeMap = {
            side: "Side events",
            edit: "Paperless",
            guests: "Guest management",
            "on-dashboard-guests": "Mis invitados"
        };

        if (modeMap[mode]) {
            if (mode === 'side' && sideEventName) {
                items.push({
                    title: <span style={{ cursor: 'pointer' }} onClick={onSideEventsBack}>Side events</span>
                });
                items.push({ title: sideEventName });
            } else {
                items.push({ title: modeMap[mode] });
            }
        }

        return items;
    }, [
        invitation,
        mode,
        hasUnsavedChanges,
        goToDashboard,
        goToInvitations,
        sideEventName,
        onSideEventsBack
    ]);


    useEffect(() => {
        if (sessionId) {
            messageApi.success("Tu compra se realizó con éxito 🎉");
            // console.log("Tu compra se realizó con éxito 🎉")

            searchParams.delete("session_id");
            setSearchParams(searchParams, { replace: true });
        }

        if (canceled === "true") {
            messageApi.warning("El pago fue cancelado");
            // console.log("El pago fue cancelado");

            searchParams.delete("canceled");
            setSearchParams(searchParams, { replace: true });
        }
    }, [sessionId, canceled]);

    useEffect(() => {
        if (id) {
            getInvitation(id)
            getChats()
            getGuestsMap()
        }
    }, [id])

    const { subscribe } = useDashboardRealtime()

    useEffect(() => {
        if (!id) return;
        const u1 = subscribe('whatsapp_incoming_messages', () => getChats())
        const u2 = subscribe('whatsapp_freetext_dispatches', () => getChats())
        const u3 = subscribe('guests', (payload) => {
            const row = payload.new || payload.old
            if (row?.invitation_id === id) getGuestsMap()
        })
        return () => { u1(); u2(); u3() }
    }, [id])



    /* ========================
       RENDER
    ======================== */

    return (
        <>
            {contextHolder}
            <div className="header-dashboard-main-container" style={{ borderBottom: '1px solid #e8e8e8' }}>
                <div className="header-dashboard-container">

                    {/* LEFT SIDE */}
                    <div className="header-dashboard-single-row">

                        {hasUnsavedChanges ? (
                            <Popconfirm
                                title={t('dashboard_header.unsaved_title')}
                                description={t('dashboard_header.unsaved_desc_short')}
                                onConfirm={handleBack}
                                okText={t('dashboard_header.exit')}
                                cancelText={t('dashboard_header.cancel')}
                            >
                                <Button
                                    type="text"
                                    className="headerbutton"
                                    icon={<LuArrowLeft size={14} />}
                                />
                            </Popconfirm>
                        ) : (
                            <Button
                                onClick={handleBack}
                                type="text"
                                className="headerbutton"
                                icon={<LuArrowLeft size={14} />}
                            />
                        )}

                        {!screens.xs && <CustomLink backuImage={invitation?.cover?.image?.prod} isHeader={true} urlImage={urlImage} url={`${baseProd}/${invitation?.generals?.event?.label}/${name ?? ""}`} id={id} handleImage={updateURLimage} name={invitation?.cover?.title?.text?.value} />}

                        {screens.xs && (
                            <span style={{ fontFamily: 'Poppins', fontSize: '16px', fontWeight: 500, marginLeft: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                                {sideEventName ?? invitation?.cover?.title?.text?.value}
                            </span>
                        )}

                        {!screens.xs && <Breadcrumb style={{ marginLeft: 8 }} items={breadcrumbItems} />}

                    </div>

                    {!screens.xs && <CreditController id={id} />}

                    {/* RIGHT SIDE */}
                    <div className="header-dashboard-single-row" style={{ gap: 8 }}>

                        {/* {!screens.xs && <img src={`/images/plan_${plan}.png`} alt="" style={{ maxHeight: '30px', borderRadius: '8px', boxShadow: '0px 0px 8px rgba(0,0,0,0.2)' }} />} */}

                        {screens.xs && !isEditing && <CreditController id={id} mobile={true} />}

                        {!screens.xs && (
                            <Dropdown
                                trigger={['click']}
                                placement='bottomLeft'
                                arrow
                                popupRender={() => (
                                    <WhatsappMessages id={id} conversations={conversations} guestsByPhone={guestsByPhone} />
                                )}
                            >
                                <Badge style={{ zIndex: 99 }} count={unAnswer} color='var(--light-purple-600)' size='large'>
                                    <Button style={{ borderRadius: '99px' }} icon={<MessageCircle size={12} />} />
                                </Badge>
                            </Dropdown>
                        )}

                        {screens.xs && !isEditing && (
                            <>
                                <Badge style={{ zIndex: 99 }} count={unAnswer} color='var(--light-purple-600)' size='large'>
                                    <Button
                                        style={{ borderRadius: '99px' }}
                                        icon={<MessageCircle size={12} />}
                                        onClick={() => setMobileWaOpen(true)}
                                    />
                                </Badge>

                                {mobileWaVisible && createPortal(
                                    <>
                                        <div
                                            onClick={() => setMobileWaOpen(false)}
                                            style={{
                                                position: 'fixed', inset: 0,
                                                background: 'rgba(0,0,0,0.4)',
                                                zIndex: 1299,
                                                opacity: mobileWaEntered ? 1 : 0,
                                                transition: 'opacity 0.24s ease',
                                            }}
                                        />
                                        <WhatsappMessages
                                            className="whatsapp_mobile"
                                            style={{
                                                transform: mobileWaEntered ? 'translateY(0)' : 'translateY(-32px)',
                                                opacity: mobileWaEntered ? 1 : 0,
                                                transition: 'transform 0.34s cubic-bezier(0.34,1.15,0.64,1), opacity 0.24s ease',
                                            }}
                                            id={id}
                                            conversations={conversations}
                                            guestsByPhone={guestsByPhone}
                                            onClose={() => setMobileWaOpen(false)}
                                        />
                                    </>,
                                    document.body
                                )}
                            </>
                        )}

                        {screens.xs && !isEditing && <CustomLink backuImage={invitation?.cover?.image?.prod} maxHeight={32} isSmall={true} isHeader={true} urlImage={urlImage} url={`${baseProd}/${invitation?.generals?.event?.label}/${name ?? ""}`} id={id} handleImage={updateURLimage} name={invitation?.cover?.title?.text?.value} icon={<Share size={14} />} />}

                        {isEditing && screens.xs && session?.user?.role !== "Administration" && (
                            <Button
                                icon={<LuUpload size={14} />}
                                type="primary"
                                style={{ position: "relative", height: '32px', borderRadius: '99px' }}
                                onClick={onSaveChanges}
                            >
                                {t('dashboard_header.publish')}
                                {!saved && (
                                    <div style={{ position: "absolute", top: 0, right: 0, height: 10, width: 10, borderRadius: 50, backgroundColor: "#A88AFF" }} />
                                )}
                            </Button>
                        )}

                        {isEditing && screens.xs && session?.user?.role === "Administration" && (
                            <Button
                                icon={<LuSendHorizontal size={14} />}
                                type="primary"
                                style={{ position: "relative", backgroundColor: "#20212B", height: '32px', borderRadius: '99px' }}
                                onClick={onWriteChanges}
                            >
                                {t('dashboard_header.write')}
                                {!saved && (
                                    <div style={{ position: "absolute", top: 0, right: 0, height: 10, width: 10, borderRadius: 50, backgroundColor: "#A88AFF" }} />
                                )}
                            </Button>
                        )}

                        {
                            !screens.xs &&
                            <Link to="https://wa.me/6145338500" target="_blank">
                                <Button style={{ borderRadius: '99px' }} icon={<LuBadgeHelp style={{ marginTop: '4px' }} size={16} />}>
                                    {t('dashboard_header.help')}
                                </Button>
                            </Link>
                        }



                        {isEditing && !screens.xs && (
                            <Tooltip title={t('dashboard_header.publish_tooltip')} placement="bottomLeft">
                                <Button
                                    icon={<LuUpload size={14} />}
                                    type="primary"
                                    style={{ position: "relative", borderRadius: '99px' }}
                                    onClick={session.user.role === "Administration" ? onWriteChanges : onSaveChanges}
                                >
                                    {session.user.role === "Administration" ? t('dashboard_header.write') : t('dashboard_header.publish')}
                                    {!saved && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                right: 0,
                                                height: 10,
                                                width: 10,
                                                borderRadius: 50,
                                                backgroundColor: "#A88AFF"
                                            }}
                                        />
                                    )}
                                </Button>
                            </Tooltip>
                        )}

                    </div>
                </div>
            </div>
        </>
    );
};


