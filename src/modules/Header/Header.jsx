
import { Button, Popconfirm, Row, Tooltip, message } from "antd"
import { useContext, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { appContext } from "../../context"
import { Footer } from "antd/es/layout/layout"
import { useNavigate } from 'react-router-dom';
import { LuArrowBigUpDash, LuClipboard, LuClipboardCheck, LuFolderHeart, LuFolderOpen, LuLink, LuMenu, LuPhone, LuShield, LuShieldCheck, } from "react-icons/lu"
import { IoClose, IoPricetags, IoPricetagsOutline } from "react-icons/io5"
import { BsClipboard, BsClipboardFill } from "react-icons/bs"
import { FaWhatsapp } from "react-icons/fa"
import { GoArrowLeft } from "react-icons/go"
import { MdKeyboardArrowRight } from "react-icons/md"
import { BiSupport } from "react-icons/bi"


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

export const FooterMobile = ({ position, isVisible }) => {
    const [setIsScrollTop] = useState(false);


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

            // Limpiar el event listener al desmontar el componente
            return () => {
                window.removeEventListener('scroll', handleScroll);
            };
        }

    }, []);


    const navItems = [

        {
            name: 'Tablero',
            icon: BsClipboard,
            selected: BsClipboardFill,
            path: "/invitations",
            position: "invitations"
        },

        {
            name: 'Precios',
            icon: IoPricetagsOutline,
            selected: IoPricetags,
            path: "/features",
            position: "pricing"
        },
        {
            name: 'Contacto',
            icon: FaWhatsapp,
            selected: FaWhatsapp,
            path: 'https://wa.me/6145394836',
            position: 'contact'
        }


    ]


    return (
        <Footer className="footer-main-container" style={{
            opacity: isVisible ? 1 : 0,
            transition: 'all 0.5s ease'
        }}>


            <Row style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'row', width: '100%', gap: '10px'
            }}>
                {
                    navItems.map((item, index) => (
                        <Link key={index} to={item.path} >
                            <div key={index}
                                className={`nav-item-col ${item.position === position ? '--selected' : ''}`}>
                                {
                                    item.position === position ? <item.selected className="nav-item-icon-selec" />
                                        : <item.icon className="nav-item-icon" />
                                }
                                <p className="nav-item-label">{item.name}</p>
                            </div>
                        </Link>

                    ))
                }
            </Row>

        </Footer >
    )
}

export const HeaderDashboard = ({ saved, invitation, setMode, mode, onSaveChanges }) => {

    const navigate = useNavigate();


    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success('Link copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const handleBack = () => {
        switch (mode) {
            case 'on-dashboard':
                navigate('/invitations');
                break;

            case 'on-edit':
                setMode('on-dashboard');
                break;

            case 'side-events':
                setMode('on-dashboard');
                break;

            case 'on-dashboard-guests':
                setMode('on-dashboard');
                break;

            default:
                console.warn(`Modo no reconocido: ${mode}`);
                break;
        }
    };

    return (
        <div className="header-dashboard-main-container" style={{ justifyContent: 'flex-start' }}>
            <div className="header-dashboard-container">
                <div className="header-dashboard-single-row">
                    {
                        !saved && mode === "on-edit" ?
                            <Popconfirm
                                title="Salir sin guardar"
                                description="Tienes cambios sin guardar. Si sales ahora, todos los cambios se perderán. ¿Estás seguro de que deseas continuar?"
                                onConfirm={handleBack}
                                placement="bottomLeft"
                                okText="Salir"
                                cancelText="Cancelar"
                                style={{ width: '400px' }}
                                id="popup-confirm"
                            >
                                <Button type="ghost" className="headerbutton" icon={<GoArrowLeft size={14} style={{ marginTop: '1px' }} />}></Button>
                            </Popconfirm> :
                            <Button
                                onClick={handleBack}
                                type="ghost" className="headerbutton" icon={<GoArrowLeft size={14} style={{ marginTop: '1px' }} />}></Button>
                    }

                    <Button onClick={() => copyToClipboard(`${baseProd}/${invitation.generals.event.label}/${invitation.generals.event.name}`)} type="ghost" className="primarybutton--active" style={{ maxHeight: '25px', padding: '0px 12px', marginLeft: '4px' }} icon={<LuLink size={12} style={{ marginTop: '1px' }} />}>Copiar link</Button>

                    {
                        invitation &&
                        <div className="header-dashboard-single-row" style={{
                            marginLeft: '8px', gap: '8px', borderLeft: '1px solid var(--borders)',
                            paddingLeft: '8px'
                        }}>
                            {
                                // !shared_user?.active &&
                                <div className="header-dashboard-single-row" style={{
                                    gap: '8px'
                                }}>
                                    {
                                        !saved && mode === "on-edit" ?
                                            <Popconfirm
                                                title="Salir sin guardar"
                                                description="Tienes cambios sin guardar. Si sales ahora, todos los cambios se perderán. ¿Estás seguro de que deseas continuar?"
                                                onConfirm={() => navigate('/invitations')}
                                                placement="bottomLeft"
                                                okText="Salir"
                                                cancelText="Cancelar"
                                                style={{ width: '400px' }}
                                                id="popup-confirm"
                                            >
                                                <span className="navbar-item-label">Mis invitaciones</span>
                                            </Popconfirm> :
                                            <span className="navbar-item-label" onClick={() => navigate('/invitations')}>Mis invitaciones</span>
                                    }

                                    <span className="navbar-item-label"><MdKeyboardArrowRight style={{ marginTop: '3px' }} /></span>
                                </div>
                            }

                            {
                                !saved && mode === "on-edit" ?
                                    <Popconfirm
                                        title="Salir sin guardar"
                                        description="Tienes cambios sin guardar. Si sales ahora, todos los cambios se perderán. ¿Estás seguro de que deseas continuar?"
                                        onConfirm={() => setMode('on-dashboard')}
                                        placement="bottomLeft"
                                        okText="Salir"
                                        cancelText="Cancelar"
                                        style={{ width: '400px' }}
                                        id="popup-confirm"
                                    >
                                        <span className="navbar-item-label" >{invitation?.cover?.title?.text?.value}</span>
                                    </Popconfirm> :
                                    <span className="navbar-item-label" onClick={() => setMode('on-dashboard')} >{invitation?.cover?.title?.text?.value}</span>
                            }


                            {
                                mode === 'side-events' ?
                                    <div className="header-dashboard-single-row" style={{
                                        gap: '8px'
                                    }}>
                                        <span className="navbar-item-label"><MdKeyboardArrowRight style={{ marginTop: '3px' }} /></span>
                                        <span className="navbar-item-label" >Side events</span>
                                    </div>
                                    :
                                    mode === 'on-edit' ?
                                        <div className="header-dashboard-single-row" style={{
                                            gap: '8px'
                                        }}>
                                            <span className="navbar-item-label"><MdKeyboardArrowRight style={{ marginTop: '3px' }} /></span>
                                            <span className="navbar-item-label" >Paperless</span>
                                        </div>
                                        : mode === 'dashboard' ?
                                            <div className="header-dashboard-single-row" style={{
                                                gap: '8px'
                                            }}>
                                                <span className="navbar-item-label"><MdKeyboardArrowRight style={{ marginTop: '3px' }} /></span>
                                                <span className="navbar-item-label" >Guest management</span>
                                            </div>
                                            :
                                            mode === 'on-dashboard-guests' &&
                                            <div className="header-dashboard-single-row" style={{
                                                gap: '8px'
                                            }}>
                                                <span className="navbar-item-label"><MdKeyboardArrowRight style={{ marginTop: '3px' }} /></span>
                                                <span onClick={() => setMode('dashboard')} className="navbar-item-label" >Mis Invitados</span>
                                            </div>

                            }
                        </div>
                    }

                </div>

                <div className="header-dashboard-single-row" style={{
                    gap: '8px'
                }}>

                    <Link to="https://wa.me/6145338500" target='_blank' >
                        <Button className="need-help-button" type="ghost" icon={<BiSupport />}>¿Necesitas ayuda?</Button>
                    </Link>

                    {
                        (mode === 'dashboard' || mode === 'responses' || mode === 'table') ?
                            <></>
                            : mode === 'on-edit' ?

                                <Tooltip color="var(--gradient)" text="Publicar cambios" placement="bottomLeft">
                                    <Button id="save-changes-button" icon={<LuArrowBigUpDash size={14} />} style={{
                                        borderRadius: '99px', position: 'relative'
                                    }} onClick={onSaveChanges}>Publicar
                                        {
                                            !saved && (
                                                <div style={{
                                                    position: 'absolute', top: 0, right: 0,
                                                    height: '10px', width: '10px', borderRadius: '50px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    backgroundColor: '#FF0033'
                                                }} >
                                                </div>
                                            )
                                        }
                                    </Button>
                                </Tooltip>
                                : <></>
                    }
                </div>


            </div>
        </div>
    )
}

export const HeaderMainDashboard = ({ invitation, setMode, mode, }) => {

    const navigate = useNavigate();

    const handleBack = () => {
        switch (mode) {
            case 'on-dashboard':
                navigate('/invitations');
                break;

            case 'on-edit':
                setMode('on-dashboard');
                break;

            case 'dashboard':
                setMode('on-dashboard');
                break;

            case 'responses':
                setMode('dashboard');
                break;

            case 'table':
                setMode('dashboard');
                break;

            default:
                console.warn(`Modo no reconocido: ${mode}`);
                break;
        }
    };



    return (

        <div className="header-dashboard-main-container--main">
            <div className="header-dashboard-container">
                <div className="header-dashboard-single-row">

                    <Button onClick={handleBack} type="ghost" className="headerbutton" icon={<GoArrowLeft size={14} style={{ marginTop: '1px' }} />}></Button>

                    <div className="header-title-border" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden',
                        borderLeft: '1px solid var(--borders)',
                        paddingLeft: '16px', gap: '8px',
                        marginLeft: '16px'
                    }}>
                        <span className="navbar-item-label" style={{ display: 'flex', fontWeight: 600 }}>{invitation?.cover?.title?.text?.value}</span>

                    </div>
                </div>

                <Link to="https://wa.me/6145394836" target='_blank' >
                    <Button className="need-help-button" type="ghost" icon={<BiSupport />}>¿Necesitas ayuda?</Button>
                </Link>


            </div>
        </div>
    )
}

