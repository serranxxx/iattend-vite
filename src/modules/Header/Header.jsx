
import { Breadcrumb, Button, Popconfirm, Row, Tooltip, message } from "antd"
import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { appContext } from "../../context"
import { useNavigate } from 'react-router-dom';
import { LuArrowBigUpDash, LuArrowLeft, LuBadgeHelp, LuClipboard, LuClipboardCheck, LuFolderHeart, LuFolderOpen, LuLink, LuMenu, LuPhone, LuShield, LuShieldCheck, } from "react-icons/lu"
import { IoClose, } from "react-icons/io5"
import { supabase } from "../../lib/supabase";


const baseProd = "https://www.iattend.events"

export const HeaderBuild = ({ position, isVisible }) => {

    const { logged, logout, } = useContext(appContext)
    const [setIsScrollTop] = useState(false);
    const [openMenu, setOpenMenu] = useState(false)
    const session = JSON.parse(localStorage.getItem("session"));



    const getFirstLetterUpperCase = (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase();
    }

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
            name: 'Tablero',
            icon: LuClipboard,
            selected: LuClipboardCheck,
            path: "/invitations",
            position: "invitations"
        },
        {
            name: 'Conoce',
            icon: LuFolderOpen,
            selected: LuFolderHeart,
            path: "/features",
            position: "pricing"
        },

        {
            name: 'Admin',
            icon: LuShield,
            selected: LuShieldCheck,
            path: "/admin",
            position: "admin"
        },

    ]

    return (

        <>
            <div className="header-main-container web-opt">
                <Row className="header-container" >
                    <div style={{
                        width: '120px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden',
                        marginTop: '24px'
                    }}>
                        <img alt='' src="/images/negro-morado.png" style={{
                            width: '100%', objectFit: 'cover'
                        }} />

                    </div>
                    <Row style={{
                        width: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                        flexDirection: 'row', gap: '0px'
                    }}>
                        {
                            navItems.map((item) => {
                                // Condiciones para ocultar el elemento 'Admin'
                                if (item.name === 'Admin' && (!session?.logged || session?.user?.role !== "Administration")) {
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

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Link to={`https://wa.me/6145338500?text=${encodeURIComponent("Hola, estoy interesado en las invitaciones digitales")}`} target='_blank' style={{
                        }}>
                            <Button
                                icon={<LuPhone />}
                                id={'contact-us'}
                            >
                                {logged ? '¿Necesitas ayuda?' : 'CONTÁCTANOS'}
                            </Button>
                        </Link>

                        {
                            session?.logged &&
                            <Button
                                onClick={logout}
                                id={session?.user?.role === 'Administration' ? 'on-logged-admin' : "on-logged-circle"} >
                                {
                                    session?.user ? getFirstLetterUpperCase(session?.user?.name)
                                        : 'B'

                                }
                            </Button>
                        }
                    </div>




                </Row>

            </div >


            <div style={{
                opacity: isVisible ? 1 : 0
            }} className="header-main-container mobile-opt"
            >
                <div
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row',
                        width: '90%', position: 'relative',
                    }}>

                    <div style={{
                        width: '120px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden',
                        marginTop: '24px'
                    }}>
                        <img alt='' src="/images/negro-morado.png" style={{
                            width: '100%', objectFit: 'cover'
                        }} />

                    </div>

                    <Button onClick={() => setOpenMenu(true)} type="ghost" icon={<LuMenu size={36} />} />

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
                            <Button onClick={() => setOpenMenu(false)} type="ghost" icon={<IoClose size={36} />} />
                        </div>
                    </div>

                    <div className="mobile-menu-routes">
                        {
                            navItems.map((item) => {
                                // Condiciones para ocultar el elemento 'Admin'
                                if (item.name === 'Admin' && (!session?.logged || session?.user?.role !== "Administration")) {
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
                            <span className="mobile-nav-item">Contacto</span>
                        </Link>

                    </div>

                </div>

            </div >
        </>
    )
}
export const HeaderDashboard = ({ saved, mode, onSaveChanges }) => {

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const id = searchParams.get("id");
    const sessionId = searchParams.get("session_id");
    const canceled = searchParams.get("canceled");

    const [messageApi, contextHolder] = message.useMessage();
    const [invitation, setInvitation] = useState(null)
    const [plan, setPlan] = useState(null)

    const isEditing = mode === "edit" || mode === "on-edit";
    const hasUnsavedChanges = isEditing && !saved;

    const getInvitation = async () => {

        const { data, error } = await supabase
            .from("invitations")
            .select("data, plan")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            setInvitation(data.data)
            setPlan(data.plan)
        }
    }

    /* ========================
       HELPERS
    ======================== */

    const copyToClipboard = useCallback(async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            message.success("Link copiado");
        } catch (err) {
            console.error("Error al copiar:", err);
        }
    }, []);

    const handleBack = useCallback(() => {
        if (mode === 'dashboard') {
            navigate('/invitations');
        } else {
            navigate(-1);
        }

    }, [navigate]);

    const goToDashboard = useCallback(() => {
        navigate(`/dashboard?id=${id}`);
    }, [navigate, id]);

    const goToInvitations = useCallback(() => {
        navigate("/invitations");
    }, [navigate]);

    /* ========================
       BREADCRUMB ITEMS
    ======================== */

    const breadcrumbItems = useMemo(() => {
        if (!invitation) return [];

        const confirmWrapper = (node, action) =>
            hasUnsavedChanges ? (
                <Popconfirm
                    title="Salir sin guardar"
                    description="Tienes cambios sin guardar. Si sales ahora, se perderán."
                    onConfirm={action}
                    okText="Salir"
                    cancelText="Cancelar"
                >
                    {node}
                </Popconfirm>
            ) : (
                node
            );

        const items = [
            {
                title: confirmWrapper(
                    <span style={{ cursor: "pointer" }} onClick={goToInvitations}>
                        Mis invitaciones
                    </span>,
                    goToInvitations
                )
            },
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
            items.push({ title: modeMap[mode] });
        }

        return items;
    }, [
        invitation,
        mode,
        hasUnsavedChanges,
        goToDashboard,
        goToInvitations
    ]);


    useEffect(() => {
        if (sessionId) {
            messageApi.success("Tu compra se realizó con éxito 🎉");
            console.log("Tu compra se realizó con éxito 🎉")

            searchParams.delete("session_id");
            setSearchParams(searchParams, { replace: true });
        }

        if (canceled === "true") {
            messageApi.warning("El pago fue cancelado");
            console.log("El pago fue cancelado");

            searchParams.delete("canceled");
            setSearchParams(searchParams, { replace: true });
        }
    }, [sessionId, canceled]);

    useEffect(() => {
        if (id) {
            getInvitation(id)
        }
    }, [id])



    /* ========================
       RENDER
    ======================== */

    return (
        <>
            {contextHolder}
            <div className="header-dashboard-main-container" style={{ justifyContent: "flex-start" }}>
                <div className="header-dashboard-container">

                    {/* LEFT SIDE */}
                    <div className="header-dashboard-single-row">

                        {hasUnsavedChanges ? (
                            <Popconfirm
                                title="Salir sin guardar"
                                description="Tienes cambios sin guardar. ¿Deseas salir?"
                                onConfirm={handleBack}
                                okText="Salir"
                                cancelText="Cancelar"
                            >
                                <Button
                                    type="ghost"
                                    className="headerbutton"
                                    icon={<LuArrowLeft size={14} />}
                                />
                            </Popconfirm>
                        ) : (
                            <Button
                                onClick={handleBack}
                                type="ghost"
                                className="headerbutton"
                                icon={<LuArrowLeft size={14} />}
                            />
                        )}

                        <Button
                            onClick={() =>
                                copyToClipboard(
                                    `${baseProd}/${invitation?.generals?.event?.label}/${invitation?.generals?.event?.name}`
                                )
                            }
                            type="ghost"
                            className="primarybutton--active"
                            style={{ maxHeight: 25, padding: "0px 12px", marginLeft: 4 }}
                            icon={<LuLink size={12} />}
                        >
                            Copiar link
                        </Button>

                        <Breadcrumb style={{ marginLeft: 8 }} items={breadcrumbItems} />
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="header-dashboard-single-row" style={{ gap: 8 }}>

                        <img src={`/images/plan_${plan}.png`} alt="" style={{maxHeight:'30px', borderRadius:'8px', boxShadow:'0px 0px 8px rgba(0,0,0,0.2)'}}/>

                        <Link to="https://wa.me/6145338500" target="_blank">
                            <Button  icon={<LuBadgeHelp style={{ marginTop: '4px' }} size={16} />}>
                                ¿Necesitas ayuda?
                            </Button>
                        </Link>

                        {isEditing && (
                            <Tooltip title="Publicar cambios" placement="bottomLeft">
                                <Button
                                    icon={<LuArrowBigUpDash size={14} />}
                                    style={{ borderRadius: 99, position: "relative" }}
                                    onClick={onSaveChanges}
                                >
                                    Publicar
                                    {!saved && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                right: 0,
                                                height: 10,
                                                width: 10,
                                                borderRadius: 50,
                                                backgroundColor: "#FF0033"
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


