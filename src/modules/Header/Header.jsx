
import { Badge, Breadcrumb, Button, Divider, Dropdown, Grid, Input, Popconfirm, Select, Space, Tooltip, message } from "antd"
import axios from "axios"
import logoBlue from '/images/logo_blue.png'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Link, useSearchParams } from "react-router-dom"
import { useNavigate } from 'react-router-dom';
import { ArrowLeft as LuArrowLeft, BadgeHelp as LuBadgeHelp, Check as LuCheck, Clipboard as LuClipboard, ClipboardCheck as LuClipboardCheck, FolderHeart as LuFolderHeart, FolderOpen as LuFolderOpen, Link as LuLink, LogOut as LuLogOut, Menu as LuMenu, Plus as LuPlus, SendHorizontal as LuSendHorizontal, Shield as LuShield, ShieldCheck as LuShieldCheck, TriangleAlert as LuTriangleAlert, Upload as LuUpload, X as LuX } from 'lucide-react';
import { X as IoClose } from 'lucide-react';
import { supabase } from "../../lib/supabase";
import { CustomLink } from "../../components/CustomLink/CustomLink";
import { Bell, ChevronDown, CircleQuestionMark, Forward, Menu, MessageCircle, MoreHorizontal, QrCode, Share, Sparkles } from "lucide-react";
import { appContext } from '../../context';
import { WhatsappMessages } from '../GuestManagement/WhatsappMessages/WhatsappMessages';
import { useTranslation } from 'react-i18next';
import { CreditController } from "../../components/Payment/CreditController/CreditController"
import { useDashboardRealtime } from "../../context/DashboardRealtimeContext";
import { PHONE_CODE_OPTIONS } from "../../helpers/assets/phoneCodes";
import { PassesPill } from "./PassesPill";
import { SupportTicketModal } from "./SupportTicketModal";
import { advisorWhatsappUrl } from "../../helpers/contact";
import { MobileActionsFab } from "./MobileActionsFab";

const baseProd = "https://www.iattend.events"

// Nombre de cada página del dashboard (breadcrumb y título del header).
const PAGE_NAMES = {
    side: "Side events",
    edit: "Paperless",
    guests: "Guest management",
    "on-dashboard-guests": "Mis invitados",
    photowall: "Photo Wall",
    savethedate: "Save the Date",
}

const { useBreakpoint } = Grid;

//  

export const HeaderBuild = ({ position, isVisible, fixed = true, alwaysSolid = true, onTourClick }) => {
    const { t } = useTranslation()
    const { logout } = useContext(appContext)
    const navigate = useNavigate()
    const [openMenu, setOpenMenu] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [totalEvents, setTotalEvents] = useState(null)
    const [totalConfirmed, setTotalConfirmed] = useState(null)
    const session = JSON.parse(localStorage.getItem("session"))

    const navItems = [
        { name: 'Mis eventos', path: '/invitations', position: 'invitations' },
        // { name: 'Explora',     path: '/features',    position: 'pricing'     },
        { name: 'Administrador', path: '/admin', position: 'admin', adminOnly: true },
        { name: 'Tablero', path: '/tablero', position: 'tablero', allowedRoles: ['Administration', 'sales'] },
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
                supabase.rpc('get_total_invitations_by_user', { p_user_id: session.user.uid }),
                supabase.rpc('get_confirmed_guests_count_by_user', { p_user_id: session.user.uid }),
            ])
            setTotalEvents(events)
            setTotalConfirmed(confirmed)
        } catch (e) { console.error(e) }
    }

    const userDropdown = (
        <div className="hb-user-dropdown" onClick={e => e.stopPropagation()}>
            <div className="hb-user-dropdown-top">
                <img src='/images/user_icon.png' alt='' className="hb-user-avatar" />
                <Button onClick={() => { logout(); navigate('/login') }} icon={<LuLogOut size={14} />} size="small" className="hb-logout-btn">
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
                            if (item.allowedRoles && !item.allowedRoles.includes(session?.user?.role)) return null
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

                        {
                            onTourClick &&
                            <button type="button" className="hb-tour-btn" onClick={() => (onTourClick ? onTourClick() : navigate('/preview'))}>
                                <Sparkles size={15} strokeWidth={2} />
                                {/* Conoce I attend */}
                            </button>
                        }

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
                        if (item.allowedRoles && !item.allowedRoles.includes(session?.user?.role)) return null
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
                    <Link target='_blank' style={{ textDecoration: 'none' }} to={advisorWhatsappUrl()} onClick={() => setOpenMenu(false)}>
                        <span className="mobile-nav-item mobile-nav-item--inactive">{t('header.contact')}</span>
                    </Link>

                    {session?.logged && (
                        <span className="mobile-nav-item mobile-nav-item--inactive" onClick={() => { logout(); setOpenMenu(false); navigate('/login') }}>
                            Cerrar sesión
                        </span>
                    )}
                </nav>
            </div>
        </>
    )
}
export const HeaderDashboard = ({ saved, mode, onSaveChanges, session, onWriteChanges, sideEventName, onSideEventsBack, onOpenReminders, languagePicker }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const id = searchParams.get("id");
    const sessionId = searchParams.get("session_id");
    const canceled = searchParams.get("canceled");

    const [messageApi, contextHolder] = message.useMessage();
    const [invitation, setInvitation] = useState(null)
    const [supportOpen, setSupportOpen] = useState(false)

    const [conversations, setConversations] = useState([])
    const [unAnswer, setUnAnswer] = useState(0)
    const [guestsByPhone, setGuestsByPhone] = useState(new Map())

    const [mobileWaOpen, setMobileWaOpen] = useState(false)
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

    // Ancho de la ventana para los niveles del header (ver `tier` abajo).
    const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
    useEffect(() => {
        const onResize = () => setViewportWidth(window.innerWidth)
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef(null)

    const isEditing = mode === "edit" || mode === "on-edit";
    const hasUnsavedChanges = isEditing && !saved;
    const screens = useBreakpoint();
    const [urlImage, setUrlImage] = useState(null)
    const [name, setName] = useState(null)

    // Pending info — DB values (for badge count)
    const [invOwners, setInvOwners] = useState([])
    const [invLabel, setInvLabel] = useState(null)
    const [invPhone, setInvPhone] = useState(null)
    const [pendingOpen, setPendingOpen] = useState(false)
    const [pendingSaving, setPendingSaving] = useState(false)
    // Draft form state (only for missing fields)
    const [phoneCode, setPhoneCode] = useState('+52')
    const [phoneDigits, setPhoneDigits] = useState('')
    const [nameSlug, setNameSlug] = useState('')
    const [allNames, setAllNames] = useState([])
    const [nameIsMatch, setNameIsMatch] = useState(null)
    const [nameError, setNameError] = useState(null)
    const [ownerInput, setOwnerInput] = useState('')
    const [draftOwners, setDraftOwners] = useState([])
    // Snapshot of which sections to show (captured on open, so form doesn't hide while typing)
    const [showSections, setShowSections] = useState({ name: false, label: false, phone: false, owners: false })

    const pendingCount = invitation ? [
        !invOwners?.length,
        !invLabel && !invitation?.generals?.event?.label,
        !name && !invitation?.generals?.event?.name,
        !invPhone,
    ].filter(Boolean).length : 0

    const getInvitation = async () => {
        const { data, error } = await supabase
            .from("invitations")
            .select("data, plan, name, url_image, owners, label, phone_number")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            setInvitation(data.data)
            setName(data.name)
            setUrlImage(data.url_image)
            setInvOwners(data.owners ?? [])
            setInvLabel(data.label ?? null)
            setInvPhone(data.phone_number ?? null)
        }
    }

    /* ========================
       PENDING INFO HELPERS
    ======================== */

    const openPendingInfo = async () => {
        const { data } = await supabase.from('invitations').select('name').not('name', 'is', null)
        setAllNames(data?.map(r => r.name).filter(Boolean) ?? [])
        setShowSections({ name: !name && !invitation?.generals?.event?.name, label: !invLabel && !invitation?.generals?.event?.label, phone: !invPhone, owners: !invOwners?.length })
        setDraftOwners([])
        setNameSlug('')
        setNameIsMatch(null)
        setNameError(null)
        setPhoneDigits('')
        setPendingOpen(true)
    }

    const validateNameSlug = (value) => {
        setNameSlug(value)
        const lower = value.toLowerCase()
        const invalidChars = /[ !@#$%^*(){}[\]|\\:;"'<>,.?/~+]/
        if (invalidChars.test(lower)) {
            setNameIsMatch(false)
            setNameError('Caracteres no permitidos')
            return
        }
        const taken = allNames.filter(n => n !== name)
        if (taken.map(n => n.toLowerCase()).includes(lower)) {
            setNameIsMatch(false)
            setNameError('URL ya en uso')
        } else {
            setNameIsMatch(value.length > 0 ? true : null)
            setNameError(null)
        }
    }

    const addOwner = () => {
        const trimmed = ownerInput.trim()
        if (!trimmed || draftOwners.includes(trimmed)) return
        setDraftOwners([...draftOwners, trimmed])
        setOwnerInput('')
    }

    const removeOwner = (index) => setDraftOwners(draftOwners.filter((_, i) => i !== index))

    const savePendingInfo = async () => {
        const updates = {}
        if (showSections.name && nameSlug && nameIsMatch) updates.name = nameSlug
        if (showSections.label && invLabel) updates.label = invLabel
        if (showSections.phone && phoneDigits.length === 10) updates.phone_number = `${phoneCode}${phoneDigits}`
        if (showSections.owners) updates.owners = draftOwners

        setPendingSaving(true)
        try {
            await axios.patch(`${import.meta.env.VITE_API_URL}/api/invitation/update-fields`, { id, ...updates })

            if (updates.name) setName(updates.name)
            if (updates.phone_number) setInvPhone(updates.phone_number)
            if (updates.label) setInvLabel(updates.label)
            if (updates.owners !== undefined) setInvOwners(updates.owners)
            messageApi.success('Información guardada')
            setPendingOpen(false)
        } catch (error) {
            console.error('Error al guardar información pendiente:', error.response?.data || error.message)
            messageApi.error('Error al guardar')
        } finally {
            setPendingSaving(false)
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
        } else if (mode === 'photowall') {
            navigate(`/dashboard?id=${id}`);
        } else {
            navigate(-1);
        }
    }, [navigate, onSideEventsBack, mode, id]);

    const goToDashboard = useCallback(() => {
        navigate(`/dashboard?id=${id}`);
    }, [navigate, id]);

    const goToInvitations = useCallback(() => {
        navigate("/invitations");
    }, [navigate]);

    const updateURLimage = async (e) => {
        try {
            await axios.patch(`${import.meta.env.VITE_API_URL}/api/invitation/update-fields`, { id, url_image: e })
            message.success('Imagen actualizada')
            setUrlImage(e)
        } catch (error) {
            console.error('Error actualizando:', error.response?.data || error.message)
            message.error('Error al actualizar imagen')
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

        const modeMap = PAGE_NAMES;

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

    const isBuildMobile = screens.xs && isEditing

    const backButton = (
        <Button
            onClick={handleBack}
            type="text"
            className="hd-glass-btn"
            icon={<LuArrowLeft size={16} />}
        />
    )

    if (isBuildMobile) {
        const isAdmin = session?.user?.role === 'Administration'
        return (
            <>
                {contextHolder}

                <div className="hd-build-floating">
                    {hasUnsavedChanges ? (
                        <Popconfirm
                            title={t('dashboard_header.unsaved_title')}
                            description={t('dashboard_header.unsaved_desc_short')}
                            onConfirm={handleBack}
                            okText={t('dashboard_header.exit')}
                            cancelText={t('dashboard_header.cancel')}
                        >
                            <Button type="text" className="hd-glass-btn" icon={<LuArrowLeft size={16} />} />
                        </Popconfirm>
                    ) : backButton}

                    <Button
                        className="hd-glass-btn hd-glass-btn--cta"
                        icon={isAdmin ? <LuSendHorizontal size={14} /> : <LuUpload size={14} />}
                        onClick={isAdmin ? onWriteChanges : onSaveChanges}
                    >
                        {isAdmin ? t('dashboard_header.write') : t('dashboard_header.publish')}
                        {!saved && <span className="hd-glass-dot" />}
                    </Button>
                </div>

                <MobileActionsFab
                    invitationId={id}
                    unAnswer={unAnswer}
                    // Justo encima de la barra de herramientas del editor
                    bottomOffset={72}
                    onOpenMessages={() => setMobileWaOpen(true)}
                    onOpenHelp={() => setSupportOpen(true)}
                />

                <SupportTicketModal
                    open={supportOpen}
                    onClose={() => setSupportOpen(false)}
                    invitationId={id}
                    session={session}
                    eventName={invitation?.cover?.title?.text?.value}
                />

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
        )
    }

    // ── Header responsive (diseño "Header · responsive") ────────────────
    // Niveles por ancho de ventana:
    //   full ≥1360 · todo completo
    //   lg   1140–1359 · pases sin barra, Ayuda solo ícono
    //   md   900–1139 · solo el nombre de la página, Recordatorios solo ícono
    //   sm   720–899 · URL solo ícono, pases sin etiqueta; mensajes, QR y
    //        ayuda en el menú ⋯
    //   xs   <720 · una fila: título en dos líneas, créditos, campanita y ⋯
    //        (URL y pases también en el menú)
    const tier = viewportWidth >= 1360 ? 'full'
        : viewportWidth >= 1140 ? 'lg'
            : viewportWidth >= 900 ? 'md'
                : viewportWidth >= 720 ? 'sm'
                    : 'xs'
    const inMenu = tier === 'sm' || tier === 'xs'

    const eventTitle = invitation?.cover?.title?.text?.value
    const pageName = sideEventName ?? PAGE_NAMES[mode] ?? null
    const invitationUrl = `${baseProd}/${invitation?.generals?.event?.label}/${name ?? ""}`

    const backNode = hasUnsavedChanges ? (
        <Popconfirm
            title={t('dashboard_header.unsaved_title')}
            description={t('dashboard_header.unsaved_desc_short')}
            onConfirm={handleBack}
            okText={t('dashboard_header.exit')}
            cancelText={t('dashboard_header.cancel')}
        >
            <button type="button" className="hd-circle" aria-label={t('dashboard_header.back')}>
                <LuArrowLeft size={16} />
            </button>
        </Popconfirm>
    ) : (
        <button type="button" className="hd-circle" aria-label={t('dashboard_header.back')} onClick={handleBack}>
            <LuArrowLeft size={16} />
        </button>
    )

    // En el menú: compartir el link de la invitación (hoja de compartir en el
    // celular, copiar en escritorio). Si falta información, abre el formulario.
    const shareInvitationLink = async () => {
        setMenuOpen(false)
        if (pendingCount > 0) return openPendingInfo()
        const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
        if (isMobileDevice && navigator.share) {
            try {
                await navigator.share({ title: eventTitle, url: invitationUrl })
                return
            } catch (err) {
                if (err.name === 'AbortError') return
            }
        }
        try {
            await navigator.clipboard.writeText(invitationUrl)
            messageApi.success(t('custom_link.copied'))
        } catch (err) {
            console.error('Error al copiar el link:', err)
        }
    }

    const menuItem = (icon, label, onClick, extra = null) => (
        <button type="button" className="hd-menu-item" onClick={() => { setMenuOpen(false); onClick() }}>
            <span className="hd-menu-icon">{icon}</span>
            <span className="hd-menu-label">{label}</span>
            {extra}
        </button>
    )

    const menuPanel = (
        <div className="hd-menu" ref={menuRef}>
            {tier === 'xs' && !isEditing && (
                <div className="hd-menu-passes">
                    <PassesPill invitationId={id} getPopupContainer={() => menuRef.current ?? document.body} />
                </div>
            )}
            {tier === 'xs' && menuItem(<Forward size={16} />, t('dashboard_header.menu_share_link'), shareInvitationLink)}
            {menuItem(
                <MessageCircle size={16} />,
                t('dashboard_header.menu_messages'),
                () => setMobileWaOpen(true),
                unAnswer > 0 ? <span className="hd-menu-count">{unAnswer}</span> : null
            )}
            {!isEditing && menuItem(<QrCode size={16} />, t('dashboard_header.scanner_tooltip'), () => navigate(`/scanner?id=${id}`))}
            {menuItem(<CircleQuestionMark size={16} />, t('dashboard_header.help'), () => setSupportOpen(true))}
        </div>
    )

    const isAdminSession = session?.user?.role === "Administration"
    const publishButton = isEditing && (
        <Tooltip title={tier === 'xs' ? '' : t('dashboard_header.publish_tooltip')} placement="bottomLeft">
            <Button
                icon={isAdminSession ? <LuSendHorizontal size={14} /> : <LuUpload size={14} />}
                type="primary"
                className="hd-publish"
                style={isAdminSession ? { backgroundColor: "#20212B" } : undefined}
                onClick={isAdminSession ? onWriteChanges : onSaveChanges}
            >
                {isAdminSession ? t('dashboard_header.write') : t('dashboard_header.publish')}
                {!saved && <span className="hd-publish-dot" />}
            </Button>
        </Tooltip>
    )

    return (
        <>
            {contextHolder}
            <div className="header-dashboard-main-container hd-bar" data-tier={tier} style={{ borderBottom: '1px solid #e8e8e8' }}>
                <div className="header-dashboard-container">

                    {/* ── Izquierda: regresar, URL y título ── */}
                    <div className="hd-left">
                        {backNode}

                        {tier !== 'xs' && (
                            <div className="hd-url" data-icon={tier === 'sm' || undefined}>
                                <CustomLink
                                    isSmall={tier === 'sm'}
                                    backuImage={invitation?.cover?.image?.prod}
                                    isHeader={true}
                                    maxHeight={34}
                                    urlImage={urlImage}
                                    url={invitationUrl}
                                    id={id}
                                    handleImage={updateURLimage}
                                    name={eventTitle}
                                    setupRequired={pendingCount > 0}
                                    onSetupNeeded={openPendingInfo}
                                    // Debajo de 750px CustomLink usa su botón de compartir: mismo ícono.
                                    icon={<Forward size={14} />}
                                />
                            </div>
                        )}

                        {(tier === 'full' || tier === 'lg') && (
                            <Breadcrumb className="hd-breadcrumb" items={breadcrumbItems} />
                        )}

                        {/* Editor de escritorio: aviso de cambios sin escribir. */}
                        {languagePicker && hasUnsavedChanges && (
                            <span className="hd-dirty">
                                <span className="hd-dirty-dot" />
                                {t('dashboard_header.unsaved_label')}
                            </span>
                        )}

                        {(tier === 'md' || tier === 'sm') && (
                            <span className="hd-page">{pageName ?? eventTitle}</span>
                        )}

                        {tier === 'xs' && (
                            <span className="hd-title">
                                {pageName && <span className="hd-title-event">{eventTitle}</span>}
                                <span className="hd-title-page">{pageName ?? eventTitle}</span>
                            </span>
                        )}
                    </div>

                    {/* ── Centro: créditos ── */}
                    <div className="hd-credits" data-compact={tier === 'xs' || undefined}>
                        <CreditController id={id} />
                    </div>

                    {/* ── Derecha ── */}
                    <div className="hd-right">

                        {/* Contador de pases: en el dashboard, no dentro del editor */}
                        {!isEditing && tier !== 'xs' && (
                            <PassesPill invitationId={id} showRail={tier === 'full'} showLabel={tier !== 'sm'} />
                        )}

                        {/* Solo en Gestión de invitados: abre la sección Recordatorios. */}
                        {onOpenReminders && (
                            tier === 'full' || tier === 'lg' ? (
                                <button type="button" className="hd-reminders-pill" onClick={onOpenReminders}>
                                    <Bell size={15} color="#CDBEF7" />
                                    {t('reminders.header_button')}
                                </button>
                            ) : (
                                <Tooltip title={tier === 'xs' ? '' : t('reminders.header_button')}>
                                    <button
                                        type="button"
                                        className="hd-reminders-pill hd-reminders-pill--icon"
                                        aria-label={t('reminders.header_button')}
                                        onClick={onOpenReminders}
                                    >
                                        <Bell size={16} color="#CDBEF7" />
                                    </button>
                                </Tooltip>
                            )
                        )}

                        {/* Idioma que se edita (editor de escritorio). */}
                        {languagePicker}

                        {!inMenu && (
                            <Dropdown
                                trigger={['click']}
                                placement='bottomRight'
                                popupRender={() => (
                                    <WhatsappMessages id={id} conversations={conversations} guestsByPhone={guestsByPhone} />
                                )}
                            >
                                <Badge style={{ zIndex: 99 }} count={unAnswer} color='var(--light-purple-500)' size='small'>
                                    <button type="button" className="hd-circle hd-circle--outline" aria-label={t('dashboard_header.menu_messages')}>
                                        <MessageCircle size={15} />
                                    </button>
                                </Badge>
                            </Dropdown>
                        )}

                        {!inMenu && !isEditing && (
                            <Tooltip title={t('dashboard_header.scanner_tooltip')}>
                                <button
                                    type="button"
                                    className="hd-circle hd-circle--outline"
                                    aria-label={t('dashboard_header.scanner_tooltip')}
                                    onClick={() => navigate(`/scanner?id=${id}`)}
                                >
                                    <QrCode size={15} />
                                </button>
                            </Tooltip>
                        )}

                        {pendingCount > 0 && tier !== 'xs' && (
                            <Dropdown
                                open={pendingOpen}
                                onOpenChange={async (open) => {
                                    if (open) {
                                        const { data } = await supabase.from('invitations').select('name').not('name', 'is', null)
                                        setAllNames(data?.map(r => r.name).filter(Boolean) ?? [])
                                        setShowSections({ name: !name && !invitation?.generals?.event?.name, label: !invLabel && !invitation?.generals?.event?.label, phone: !invPhone, owners: !invOwners?.length })
                                        setDraftOwners([])
                                        setNameSlug('')
                                        setNameIsMatch(null)
                                        setNameError(null)
                                        setPhoneDigits('')
                                    }
                                    setPendingOpen(open)
                                }}
                                trigger={['click']}
                                placement='bottomRight'
                                popupRender={() => (
                                    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', padding: 20, width: 340, display: 'flex', flexDirection: 'column', gap: 20 }}>

                                        {/* URL / name — solo si falta */}
                                        {showSections.name && (
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Link personalizado</div>
                                                <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Para enviar tus invitaciones necesitas definir tu link único.</div>
                                                <div style={{ border: '1px solid #d9d9d9', borderRadius: 10, padding: '8px 12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ color: '#aaa', whiteSpace: 'nowrap', fontSize: 12 }}>iattend.events/</span>
                                                        <input
                                                            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13 }}
                                                            placeholder='paulina-y-luis'
                                                            value={nameSlug}
                                                            onChange={e => validateNameSlug(e.target.value)}
                                                        />
                                                        {nameSlug && (
                                                            <span style={{ color: nameIsMatch ? '#52c41a' : '#ff4d4f' }}>
                                                                {nameIsMatch ? <LuCheck size={14} /> : <LuX size={14} />}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {nameError && <div style={{ color: '#ff4d4f', fontSize: 11, marginTop: 3 }}>{nameError}</div>}
                                                    {nameIsMatch && nameSlug && <div style={{ color: '#52c41a', fontSize: 11, marginTop: 3 }}>Disponible</div>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Label — solo si falta */}
                                        {showSections.label && (
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Tipo de evento</div>
                                                <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Selecciona si tu evento es una boda o XV años.</div>
                                                <Select
                                                    style={{ width: '100%' }}
                                                    value={invLabel || undefined}
                                                    onChange={setInvLabel}
                                                    placeholder="Selecciona el tipo"
                                                    options={[
                                                        { label: 'Boda', value: 'wedding' },
                                                        { label: 'XV años', value: 'xv' },
                                                    ]}
                                                />
                                            </div>
                                        )}

                                        {/* Phone — solo si falta */}
                                        {showSections.phone && (
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Número de WhatsApp</div>
                                                <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Asocia un número celular para que tus invitados puedan contactarte.</div>
                                                <Space.Compact style={{ width: '100%' }}>
                                                    <Select
                                                        value={phoneCode}
                                                        onChange={setPhoneCode}
                                                        options={PHONE_CODE_OPTIONS}
                                                        style={{ width: 110 }}
                                                    />
                                                    <Input
                                                        placeholder='1234567890'
                                                        maxLength={10}
                                                        value={phoneDigits}
                                                        onChange={e => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                        suffix={phoneDigits.length === 10 ? <LuCheck size={14} style={{ color: '#25D366' }} /> : null}
                                                    />
                                                </Space.Compact>
                                            </div>
                                        )}

                                        {/* Owners — solo si falta */}
                                        {showSections.owners && (
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Nombres de la pareja</div>
                                                <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Agrega los nombres. Ej: Paulina y Luis</div>
                                                {draftOwners.length > 0 && (
                                                    <>
                                                        {draftOwners.map((o, i) => (
                                                            <div key={o} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, padding: '4px 8px', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                                                                <span style={{ fontSize: 13 }}>{o}</span>
                                                                <Button size='small' onClick={() => removeOwner(i)} style={{ borderRadius: 99, width: 24, height: 24, minWidth: 24 }}>−</Button>
                                                            </div>
                                                        ))}
                                                        <Divider style={{ margin: '6px 0' }} />
                                                    </>
                                                )}
                                                <Space style={{ width: '100%' }}>
                                                    <Input
                                                        size='small'
                                                        style={{ borderRadius: 99 }}
                                                        placeholder='Ej: Paulina'
                                                        value={ownerInput}
                                                        onChange={e => setOwnerInput(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && addOwner()}
                                                    />
                                                    <Button size='small' onClick={addOwner} className='primarybutton' icon={<LuPlus size={13} />} />
                                                </Space>
                                            </div>
                                        )}

                                        <Button onClick={savePendingInfo} loading={pendingSaving} className='primarybutton--active' style={{ width: '100%', borderRadius: 99 }}>
                                            Guardar
                                        </Button>
                                    </div>
                                )}
                            >
                                <Badge count={pendingCount} color='#FF8C00' size='small'>
                                    {isEditing || tier !== 'full'
                                        ? <Button style={{ borderRadius: '99px', width: 32, height: 32, minWidth: 32, padding: 0, background: '#FFF4E5', border: '1px solid #FFCC80', color: '#FF8C00', display: 'flex', alignItems: 'center', justifyContent: 'center' }} icon={<LuTriangleAlert size={14} />} />
                                        : <Button style={{ borderRadius: '99px', background: '#FFF4E5', color: '#FF8C00', border: '1px solid #FFCC80', fontWeight: 500 }}>Información pendiente</Button>
                                    }
                                </Badge>
                            </Dropdown>
                        )}

                        {!inMenu && (
                            tier === 'full' ? (
                                <button type="button" className="hd-help" onClick={() => setSupportOpen(true)}>
                                    <CircleQuestionMark size={15} />
                                    {t('dashboard_header.help')}
                                </button>
                            ) : (
                                <Tooltip title={t('dashboard_header.help')}>
                                    <button type="button" className="hd-circle hd-circle--outline" aria-label={t('dashboard_header.help')} onClick={() => setSupportOpen(true)}>
                                        <CircleQuestionMark size={15} />
                                    </button>
                                </Tooltip>
                            )
                        )}

                        {inMenu && (
                            <Dropdown
                                trigger={['click']}
                                placement='bottomRight'
                                open={menuOpen}
                                onOpenChange={setMenuOpen}
                                popupRender={() => menuPanel}
                            >
                                <Badge dot={unAnswer > 0} color='var(--light-purple-500)' offset={[-4, 4]}>
                                    <button type="button" className="hd-circle hd-circle--outline" aria-label={t('dashboard_header.menu_more')}>
                                        <MoreHorizontal size={16} />
                                    </button>
                                </Badge>
                            </Dropdown>
                        )}

                        {publishButton}
                    </div>
                </div>
            </div>

            {/* Mensajes en hoja (menú ⋯ y celular). */}
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

            {screens.xs && (
                <MobileActionsFab
                    invitationId={id}
                    unAnswer={unAnswer}
                    onOpenMessages={() => setMobileWaOpen(true)}
                    onOpenHelp={() => setSupportOpen(true)}
                />
            )}

            <SupportTicketModal
                open={supportOpen}
                onClose={() => setSupportOpen(false)}
                invitationId={id}
                session={session}
                eventName={eventTitle}
            />

        </>
    );
};


