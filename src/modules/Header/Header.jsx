
import { Badge, Breadcrumb, Button, Dropdown, Grid, Popconfirm, Row, Tooltip, message } from "antd"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuBadgeHelp, LuClipboard, LuClipboardCheck, LuFolderHeart, LuFolderOpen, LuLink, LuMenu, LuSendHorizontal, LuShield, LuShieldCheck, LuUpload, } from "react-icons/lu"
import { IoClose, } from "react-icons/io5"
import { supabase } from "../../lib/supabase";
import { CustomLink } from "../../components/CustomLink/CustomLink";
import { Menu, MessageCircle } from "lucide-react";
import { WhatsappMessages } from '../GuestManagement/WhatsappMessages/WhatsappMessages';
import { useTranslation } from 'react-i18next';
import { CreditController } from "../../components/Payment/CreditController/CreditController"
import { useDashboardRealtime } from "../../context/DashboardRealtimeContext";

const baseProd = "https://www.iattend.events"

const { useBreakpoint } = Grid;

//  

export const HeaderBuild = ({ position, isVisible }) => {
    const { t } = useTranslation();

    const [setIsScrollTop] = useState(false);
    const [openMenu, setOpenMenu] = useState(false)
    const session = JSON.parse(localStorage.getItem("session"));

    useEffect(() => {
        if (position === 'land-page') {
            const handleScroll = () => {
                if (window.scrollY >= 0 && window.scrollY <= 100) {
                    setIsScrollTop(false);
                } else {
                    setIsScrollTop(false);
                }
            };

            window.addEventListener('scroll', handleScroll);

            return () => {
                window.removeEventListener('scroll', handleScroll);
            };
        }

    }, []);


    const navItems = [
        {
            name: t('header.board'),
            icon: LuClipboard,
            selected: LuClipboardCheck,
            path: "/invitations",
            position: "invitations"
        },
        {
            name: t('header.explore'),
            icon: LuFolderOpen,
            selected: LuFolderHeart,
            path: "/features",
            position: "pricing"
        },
        {
            name: t('header.admin'),
            icon: LuShield,
            selected: LuShieldCheck,
            path: "/admin",
            position: "admin"
        },
    ]

    return (

        <>
            <div className="header-main-container web-opt" style={{ borderBottom: '1px solid #ebebeb80' }}>
                <Row className="header-container" style={{ position: 'relative' }}>

                    <div style={{
                        height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '4px 4px 12px rgba(0,0,0,0.2)', borderRadius: '99px',


                    }}>
                        <img alt='' src="/images/icon_pp.png" style={{
                            height: '40px', width: '40px', borderRadius: '99px',
                            outline: '2px solid #FfF'
                        }} />

                    </div>
                    <Row
                        className="nav_cont">
                        {
                            navItems.map((item) => {
                                // Condiciones para ocultar el elemento 'Admin'
                                if (item.position === 'admin' && (!session?.logged || session?.user?.role !== "Administration")) {
                                    return null;  // No renderiza nada
                                }

                                return (
                                    <Link to={item.path} key={item.name}>
                                        <div

                                            className={`nav-item-col ${item.position === position ? '--selected' : ''}`}>
                                            {
                                                item.position === position
                                                    ? <item.selected className="nav-item-icon-selec" />
                                                    : <item.icon className="nav-item-icon" />
                                            }
                                            <span className="nav-item-label">{item.name}</span>
                                        </div>
                                    </Link>
                                );
                            })
                        }


                    </Row>

                    <div style={{
                        height: '60px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        position: 'relative', width: '120px', zIndex: 999,
                    }}>
                    </div>
                </Row>

            </div >


            <div style={{
                opacity: isVisible ? 1 : 0
            }} className="header-main-container mobile-opt"
            >
                <div
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexDirection: 'row',
                        width: '90%', position: 'relative',
                    }}>



                    <Button onClick={() => setOpenMenu(true)} type="text" icon={<Menu style={{ color: '#000' }} />} />

                </div>

                <div style={{
                    right: !openMenu ? '-100vw' : '0px'
                }} className="mobile-menu-container">
                    <div className="header-main-container">
                        <div
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexDirection: 'row',
                                width: '90%', position: 'relative',
                            }}>
                            {/* <span className="mobile-menu-label">Menú</span> */}
                            <Button onClick={() => setOpenMenu(false)} type="text" icon={<IoClose size={36} />} />
                        </div>
                    </div>

                    <div className="mobile-menu-routes">
                        {
                            navItems.map((item) => {
                                // Condiciones para ocultar el elemento 'Admin'
                                if (item.position === 'admin' && (!session?.logged || session?.user?.role !== "Administration")) {
                                    return null;  // No renderiza nada
                                }

                                return (
                                    <Link
                                        style={{ textDecoration: 'none' }}
                                        to={item.path} key={item.name}>
                                        <span style={{
                                            color: item.position === position && 'var(--brand-color-500)'
                                        }} className="mobile-nav-item">{item.name}</span>
                                    </Link>
                                );
                            })
                        }

                        <Link target='_blank' style={{ textDecoration: 'none' }} to="https://wa.me/6145338500">
                            <span className="mobile-nav-item">{t('header.contact')}</span>
                        </Link>

                    </div>

                </div>

            </div >
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

                    <CreditController id={id} />

                    {/* RIGHT SIDE */}
                    <div className="header-dashboard-single-row" style={{ gap: 8 }}>

                        {/* {!screens.xs && <img src={`/images/plan_${plan}.png`} alt="" style={{ maxHeight: '30px', borderRadius: '8px', boxShadow: '0px 0px 8px rgba(0,0,0,0.2)' }} />} */}

                        {!screens.xs && (
                            <Dropdown
                                trigger={['click']}
                                placement='bottomLeft'
                                arrow
                                popupRender={() => (
                                    <WhatsappMessages id={id} conversations={conversations} guestsByPhone={guestsByPhone} />
                                )}
                            >
                                <Badge style={{ zIndex: 99 }} count={unAnswer} color='var(--purple-color)' size='large'>
                                    <Button
                                        style={{ borderRadius: '99px' }}
                                        icon={<MessageCircle size={12} />}
                                    >

                                    </Button>
                                </Badge>
                            </Dropdown>
                        )}

                        {screens.xs && <CustomLink backuImage={invitation?.cover?.image?.prod} maxHeight={32} isSmall={isEditing} isHeader={true} urlImage={urlImage} url={`${baseProd}/${invitation?.generals?.event?.label}/${name ?? ""}`} id={id} handleImage={updateURLimage} name={invitation?.cover?.title?.text?.value} buttonText="Compartir" />}

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


