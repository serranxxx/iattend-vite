import { useEffect, useMemo, useState } from 'react'
import { Button, Dropdown, Select, Tooltip, message } from 'antd'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    BadgeDollarSign, BarChart3, Briefcase, Calendar, ChevronDown, FlaskConical, Settings, Home, Inbox, Landmark,
    Megaphone, Menu as MenuIcon, ArrowLeft, Copy, Plus, Search, ShieldCheck, TestTube, Users,
} from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { supabase } from '../../lib/supabase'
import { AdminModal } from './AdminModal'
import { BuzonDrawer } from './BuzonDrawer'
import { NewInvitationDrawer } from '../../components/Create/NewInvitationDrawer'
import { CreateAccount } from '../../components/Auth/CreateUser'
import { EventosAnalitica } from './sections/EventosAnalitica'
import { EventosSection } from './sections/EventosSection'
import { UsuariosSection } from './sections/UsuariosSection'
import { VentasSection } from './sections/VentasSection'
import { LaboratorioSection } from './sections/LaboratorioSection'
import { FeedbackAdminPage } from './FeedbackAdminPage'
import { HoySection } from './sections/HoySection'
import { PlanesSection } from './sections/PlanesSection'
import { OnboardingSection } from './sections/OnboardingSection'
import { NotificacionesSection } from './sections/NotificacionesSection'
import { VendedoresSection } from './sections/VendedoresSection'
import { InteresadosSection } from './sections/InteresadosSection'
import { AdminTopbarProvider, Segmentado } from './AdminTopbar'
import { fetchSupportTickets } from './supportTicketsAdminApi'
import { pendientes } from './supportTickets'
import { crearFiltroDePrueba, esEventoActivo } from './adminConstants'
import './admin-tokens.css'
import styles from './AdminShell.module.css'

dayjs.locale('es')

// Pantallas reservadas al dueño: números de negocio, reviews de clientes y el
// catálogo de planes. Cualquier otro admin ve el resto del panel, pero no estas.
const CORREO_DEL_DUENIO = 'albserrano8@gmail.com'
// Vendedores vivía en Ventas: sigue siendo solo del dueño.
const RUTAS_RESERVADAS = new Set(['ventas', 'analitica', 'vendedores'])
const SUBS_RESERVADAS = new Set(['reviews', 'planes'])

// Usuarios es una ruta por rol (profiles.role; Cliente = sin rol conocido).
const ROLES_USUARIOS = ['clientes', 'planners', 'vendedores', 'admin', 'mkt', 'test']

const ROUTES = ['hoy', 'buzon', 'eventos', ...ROLES_USUARIOS, 'ventas', 'analitica', 'lab', 'configuracion']

// Pestañas de cada ruta: viven en la topbar, con subrayado. La primera que se
// pueda ver es la de entrada. Vendedores es la excepción: su Registrados /
// Solicitudes va en el contenido (SUBTABS_EN_CONTENIDO), pero también queda en
// la URL.
const SUBTABS = {
    buzon: [
        { key: 'mensajes', label: 'Mensajes' },
        { key: 'reportes', label: 'Reportes' },
        { key: 'reviews', label: 'Reviews' },
    ],
    eventos: [
        { key: 'calendario', label: 'Calendario' },
        { key: 'activos', label: 'Activos' },
        { key: 'todos', label: 'Todos' },
        { key: 'pruebas', label: 'Pruebas' },
    ],
    vendedores: [
        { key: 'registrados', label: 'Registrados' },
        { key: 'solicitudes', label: 'Solicitudes' },
    ],
    ventas: [
        { key: 'ingresos', label: 'Ingresos y comisiones' },
        { key: 'historico', label: 'Histórico' },
        { key: 'stripe', label: 'Stripe' },
    ],
    analitica: [
        { key: 'envios', label: 'Últimos 30 días' },
        { key: 'eventos', label: 'Eventos' },
        { key: 'historial', label: 'Envíos' },
        { key: 'respuestas', label: 'Respuestas' },
        { key: 'modulos', label: 'Mesas y side events' },
        { key: 'nuevas', label: 'Funciones nuevas' },
        { key: 'lia', label: 'Lia' },
        { key: 'promedio', label: 'Perfil' },
    ],
    configuracion: [
        { key: 'planes', label: 'Planes' },
        { key: 'onboarding', label: 'Onboarding' },
    ],
}
const SUBTABS_EN_CONTENIDO = new Set(['vendedores'])

// Enlaces que ya circulan (?tab=planes, ?tab=feedback, ?tab=usuarios…)
// siguen funcionando: caen en su pantalla y pestaña nuevas.
const RUTAS_LEGADAS = {
    notificaciones: ['buzon', 'reportes'],
    mensajes: ['buzon', 'mensajes'],
    feedback: ['buzon', 'reviews'],
    planes: ['configuracion', 'planes'],
    onboarding: ['configuracion', 'onboarding'],
    herramientas: ['lab', null],
    usuarios: ['clientes', null],
}
// Pestañas que cambiaron de nombre dentro de su ruta.
const SUBS_LEGADAS = {
    ventas: { ventas: 'ingresos' },
    analitica: { resumen: 'envios', mesas: 'modulos', side: 'modulos' },
}

const NAV_GROUPS = [
    {
        label: 'Operación',
        items: [
            { key: 'hoy', label: 'Hoy', icon: Home },
            { key: 'buzon', label: 'Buzón', icon: Inbox },
            { key: 'eventos', label: 'Eventos', icon: Calendar },
        ],
    },
    {
        label: 'Usuarios',
        items: [
            { key: 'clientes', label: 'Clientes', icon: Users },
            { key: 'planners', label: 'Planners', icon: Briefcase },
            { key: 'vendedores', label: 'Vendedores', icon: BadgeDollarSign },
            { key: 'admin', label: 'Administración', icon: ShieldCheck },
            { key: 'mkt', label: 'Marketing', icon: Megaphone },
            { key: 'test', label: 'Pruebas', icon: TestTube },
        ],
    },
    {
        label: 'Negocio',
        items: [
            { key: 'ventas', label: 'Ventas', icon: Landmark },
            { key: 'analitica', label: 'Analítica', icon: BarChart3 },
        ],
    },
    {
        label: 'Estudio',
        items: [
            { key: 'lab', label: 'Laboratorio', icon: FlaskConical },
        ],
    },
]

// Miga de la topbar: el grupo del rail al que pertenece la ruta.
const GRUPO = Object.fromEntries([
    ...NAV_GROUPS.flatMap(g => g.items.map(i => [i.key, g.label])),
    ['configuracion', 'Configuración'],
])

const TAB_BAR = [
    { key: 'hoy', label: 'Hoy', icon: Home },
    { key: 'buzon', label: 'Buzón', icon: Inbox },
    { key: 'eventos', label: 'Eventos', icon: Calendar },
    { key: 'ventas', label: 'Ventas', icon: Landmark },
]

// Rol de cada ruta de Usuarios (profiles.role). Clientes = ninguno de estos.
const ROL_DE_RUTA = { planners: 'planner', vendedores: 'sales', admin: 'Administration', mkt: 'mkt', test: 'test' }
const rutaDePerfil = (perfil) => Object.keys(ROL_DE_RUTA).find(r => ROL_DE_RUTA[r] === perfil.role) ?? 'clientes'

// Devuelve [ruta, pestaña] a partir de lo que venga en la URL o de un goTo().
const resolverRuta = (tab, sub) => {
    if (RUTAS_LEGADAS[tab]) return RUTAS_LEGADAS[tab]
    // Vendedores e Interesados vivían como pestañas de Ventas.
    if (tab === 'ventas' && sub === 'vendedores') return ['vendedores', 'registrados']
    if (tab === 'ventas' && sub === 'interesados') return ['vendedores', 'solicitudes']
    if (!ROUTES.includes(tab)) return [null, null]
    const pestana = SUBS_LEGADAS[tab]?.[sub] ?? sub
    return [tab, SUBTABS[tab]?.some(s => s.key === pestana) ? pestana : null]
}

export const AdminLayout = () => {
    const navigate = useNavigate()
    const session = JSON.parse(localStorage.getItem('session'))
    const esDuenio = session?.user?.email === CORREO_DEL_DUENIO

    // Las pantallas reservadas se filtran en tres sitios y con la misma regla:
    // el rail, la barra de abajo en móvil y el `switch` que decide qué se
    // renderiza. Ese último es el que importa: sin él, `?tab=ventas` entraba
    // aunque el menú no lo ofreciera.
    const puedeVer = (clave) => !RUTAS_RESERVADAS.has(clave) || esDuenio
    const puedeVerSub = (clave) => !SUBS_RESERVADAS.has(clave) || esDuenio
    const subsDe = (ruta) => (SUBTABS[ruta] ?? []).filter(s => puedeVerSub(s.key))
    // Pestaña válida para la ruta: la pedida si se puede ver, si no la primera.
    const subValida = (ruta, sub) => {
        const visibles = subsDe(ruta)
        if (!visibles.length) return null
        return visibles.some(s => s.key === sub) ? sub : visibles[0].key
    }
    const userName = session?.user?.name || session?.user?.full_name || session?.user?.email || 'Admin'

    const [searchParams, setSearchParams] = useSearchParams()
    const [rutaPedida, subPedida] = resolverRuta(searchParams.get('tab'), searchParams.get('sub'))
    const initialRoute = rutaPedida && puedeVer(rutaPedida) ? rutaPedida : 'hoy'

    const [route, setRoute] = useState(initialRoute)
    const [sub, setSub] = useState(() => subValida(initialRoute, subPedida))
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    // Ranuras de la topbar donde cada sección dibuja sus filtros y su acción
    // (AdminTopbar.jsx).
    const [filtrosSlot, setFiltrosSlot] = useState(null)
    const [accionSlot, setAccionSlot] = useState(null)
    // Solicitud aceptada que se da de alta como vendedor (Solicitudes → Registrados).
    const [altaVendedor, setAltaVendedor] = useState(null)
    const [globalQuery, setGlobalQuery] = useState('')
    const [pickerOpen, setPickerOpen] = useState(false)
    const [nuevoUsuarioOpen, setNuevoUsuarioOpen] = useState(false)
    const [usuarioCreado, setUsuarioCreado] = useState(null)
    const [usuarioCreadoOpen, setUsuarioCreadoOpen] = useState(false)

    const [user, setUser] = useState(null)
    const [onNewInvitation, setOnNewInvitation] = useState(false)

    const [newInvitations, setNewInvitations] = useState(null)
    const [newProfiles, setNewProfiles] = useState(null)

    const [conversations, setConversations] = useState([])
    const [unAnswer, setUnAnswer] = useState(0)

    // Reportes de soporte: los usan Hoy, Notificaciones y el contador del rail.
    const [tickets, setTickets] = useState(null)
    const [ticketsError, setTicketsError] = useState(null)

    function goTo(key, subPedido = null) {
        const [ruta, subDeRuta] = resolverRuta(key, subPedido)
        if (!ruta || !puedeVer(ruta)) return
        const pestana = subValida(ruta, subPedido ?? subDeRuta)
        setRoute(ruta)
        setSub(pestana)
        setMobileNavOpen(false)
        searchParams.set('tab', ruta)
        if (pestana) searchParams.set('sub', pestana)
        else searchParams.delete('sub')
        setSearchParams(searchParams, { replace: true })
    }

    const onOpenNewInvitation = (profile) => {
        setUser(profile)
        setOnNewInvitation(true)
    }

    const getNewUsers = async () => {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) { console.error("Error al obtener la sesión:", sessionError); return; }
        if (!session) { console.log("No hay usuario autenticado"); return; }

        const { data, error } = await supabase.from("profiles").select("*")
        if (error) console.error("Error al obtener invitaciones:", error);
        else setNewProfiles(data)
    };

    const getNewInvitations = async () => {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) { console.error("Error al obtener la sesión:", sessionError); return; }
        if (!session) { console.log("No hay usuario autenticado"); return; }

        const { data, error } = await supabase.from("invitations").select("*")
        if (error) console.error("Error al obtener invitaciones:", error);
        else setNewInvitations(data)
    };

    const refreshEventos = () => {
        getNewInvitations()
    }

    const getTickets = async () => {
        try {
            const { data } = await fetchSupportTickets()
            setTickets(data.tickets ?? [])
            setTicketsError(null)
        } catch (error) {
            console.error('Error al obtener reportes:', error.response?.data || error.message)
            setTicketsError(error.response?.data?.msg || 'No se pudieron cargar los reportes')
            setTickets(prev => prev ?? [])
        }
    }

    const actualizarTicket = (ticket) => setTickets(prev => (prev ?? []).map(t => (t.id === ticket.id ? ticket : t)))

    const getChats = async () => {
        const { data, error } = await supabase.rpc('get_conversations_v2');
        if (error) return
        setConversations(data)
        calculateUnAnswer(data)
    }

    const calculateUnAnswer = (convs) => {
        let count = 0
        convs.forEach(conv => (
            conv.messages.forEach(msg => (
                !msg.read && msg.direction === 'inbound' ? count += 1 : null
            ))
        ))
        setUnAnswer(count)
    }

    // Una sola construcción del filtro por carga de perfiles; se pasa armado a
    // las pantallas que separan eventos reales de pruebas.
    const esPrueba = useMemo(() => crearFiltroDePrueba(newProfiles), [newProfiles])

    const invitationsById = useMemo(() =>
        new Map((newInvitations ?? []).map(i => [i.id, i]))
        , [newInvitations]);

    useEffect(() => {
        if (!supabase) return;

        const channel = supabase
            .channel(`upload_dynamic_admin`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'whatsapp_freetext_dispatches' },
                (payload) => {
                    const row = payload.new || payload.old;
                    if (!row) return;
                    getChats()
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'whatsapp_incoming_messages' },
                (payload) => {
                    const row = payload.new || payload.old;
                    if (!row) return;
                    getChats();
                    message.info('Nuevo mensaje')
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        getNewInvitations()
        getNewUsers()
        getChats()
        getTickets()
    }, [])

    // ------------------------------------------------- contadores del rail ---

    const conteos = useMemo(() => {
        const invitaciones = newInvitations ?? []
        const reales = invitaciones.filter(i => !esPrueba(i))

        const porRol = Object.fromEntries(ROLES_USUARIOS.map(r => [r, 0]))
        ;(newProfiles ?? []).forEach(p => { porRol[rutaDePerfil(p)] += 1 })

        return {
            eventosActivos: reales.filter(i => esEventoActivo(i)).length,
            eventosTotales: reales.length,
            eventosPrueba: invitaciones.length - reales.length,
            usuarios: (newProfiles ?? []).length,
            porRol,
        }
    }, [newInvitations, newProfiles])

    // ---------------------------------------------------- copy de la topbar ---

    const HEAD = {
        hoy: {
            title: 'Hoy',
            subtitle: (() => {
                const quedan = dayjs().daysInMonth() - dayjs().date()
                const resto = quedan === 0 ? 'último día del mes' : `${quedan === 1 ? 'queda 1 día' : `quedan ${quedan} días`} del mes`
                return `${dayjs().format('dddd D [de] MMMM')} · ${resto}`
            })(),
        },
        eventos: {
            title: 'Eventos',
            subtitle: `${conteos.eventosActivos} activos · ${conteos.eventosTotales} en total · ${conteos.eventosPrueba} pruebas`,
            // El picker de usuario necesita envolver al botón, así que esta ruta
            // declara `wrap` en vez de un `onClick` suelto.
            action: { label: 'Agregar evento', wrap: (boton) => pickerAgregarEvento(boton) },
        },
        clientes: {
            title: 'Clientes',
            subtitle: 'Parejas y anfitriones que compran directo · sin rol en profiles',
            action: { label: 'Nuevo usuario', wrap: (boton) => pickerNuevoUsuario(boton) },
        },
        // "Nuevo planner" y "Nuevo vendedor" los pone su sección en la topbar.
        planners: { title: 'Planners', subtitle: 'Clientes B2B · cada alta incluye 1 evento PRO y 1 Flash gratis' },
        vendedores: { title: 'Vendedores', subtitle: 'Equipo comercial · las comisiones del mes viven en Ventas' },
        admin: { title: 'Administración', subtitle: 'Acceso completo al panel · mismas funciones que un planner en /invitations' },
        mkt: { title: 'Marketing', subtitle: 'Cuentas del equipo de marketing' },
        test: {
            title: 'Cuentas de prueba',
            subtitle: 'Sus invitaciones no cuentan en Eventos, Ventas ni Analítica',
            action: { label: 'Nueva cuenta', wrap: (boton) => pickerNuevoUsuario(boton) },
        },
        buzon: {
            title: 'Buzón',
            subtitle: `${unAnswer} mensajes sin leer · ${pendientes(tickets).length} reportes sin resolver`,
        },
        ventas: { title: 'Ventas', subtitle: 'Ingresos, comisiones y cobranza' },
        analitica: {
            title: 'Analítica',
            subtitle: 'Uso del producto evento por evento · las invitaciones de prueba quedan fuera',
        },
        configuracion: {
            title: 'Configuración',
            subtitle: {
                planes: 'Qué incluye cada plan · se refleja en la app, el checkout y la landing',
                onboarding: 'Slides del wizard "Conoce I attend" · checkout, invitaciones y preview',
            }[sub] ?? '',
        },
        lab: {
            title: 'Laboratorio',
            subtitle: 'Fonts, texturas y catálogo de invitaciones',
            action: { label: 'Crear', onClick: () => navigate('/admin/font-lab') },
        },
    }

    const head = HEAD[route] ?? HEAD.hoy

    const navGroups = useMemo(() => (
        NAV_GROUPS
            .map(group => ({
                ...group,
                items: group.items.filter(item => puedeVer(item.key)),
            }))
            .filter(group => group.items.length)
    ), [esDuenio])

    const counterFor = (key) => {
        if (key === 'eventos') return conteos.eventosActivos || null
        if (ROLES_USUARIOS.includes(key)) return newProfiles ? conteos.porRol[key] : null
        return null
    }

    // "Agregar evento" primero pide el usuario dueño de la invitación; el drawer
    // de creación se abre ya con ese perfil cargado.
    const pickerAgregarEvento = (boton) => (
        <Dropdown
            trigger={['click']}
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            placement='bottomRight'
            popupRender={() => (
                <div className={styles.picker}>
                    <Select
                        showSearch
                        autoFocus
                        placeholder='Buscar usuario...'
                        style={{ width: '100%' }}
                        filterOption={(input, option) => option?.label?.toLowerCase().includes(input.toLowerCase())}
                        options={(newProfiles ?? []).map(p => ({
                            value: p.user_id,
                            label: `${p.full_name || 'Sin nombre'} (${p.user_email})`,
                            profile: p,
                        }))}
                        onSelect={(_, option) => {
                            onOpenNewInvitation(option.profile)
                            setPickerOpen(false)
                        }}
                    />
                </div>
            )}
        >
            {boton}
        </Dropdown>
    )

    const pickerNuevoUsuario = (boton) => (
        <Dropdown
            trigger={['click']}
            open={nuevoUsuarioOpen}
            onOpenChange={setNuevoUsuarioOpen}
            placement='bottomRight'
            popupRender={() => (
                <div className={styles.picker}>
                    <CreateAccount
                        refreshData={getNewUsers}
                        setVisible={setUsuarioCreadoOpen}
                        setUserData={setUsuarioCreado}
                    />
                </div>
            )}
        >
            {boton}
        </Dropdown>
    )

    const conteoDeSub = (clave) => {
        if (clave === 'mensajes') return unAnswer || null
        if (clave === 'reportes') return pendientes(tickets).length || null
        return null
    }

    const renderSection = () => {
        switch (route) {
            case 'hoy':
                return (
                    <HoySection
                        onNavigate={goTo}
                        canSeeVentas={esDuenio}
                        tickets={tickets}
                        invitations={newInvitations}
                        profiles={newProfiles}
                        esPrueba={esPrueba}
                    />
                )
            case 'clientes':
            case 'planners':
            case 'admin':
            case 'mkt':
            case 'test':
                return (
                    <UsuariosSection
                        key={route}
                        rol={route}
                        profiles={(newProfiles ?? null) && newProfiles.filter(p => rutaDePerfil(p) === route)}
                        invitations={newInvitations}
                        esPrueba={esPrueba}
                        onOpenNewInvitation={onOpenNewInvitation}
                        onPerfilActualizado={perfil => setNewProfiles(prev => prev.map(p => (p.user_id === perfil.user_id ? perfil : p)))}
                        onUsuarioCreado={getNewUsers}
                        query={globalQuery}
                    />
                )
            case 'vendedores':
                return puedeVer('vendedores') ? (
                    <div className={styles.conSegmentado}>
                        <Segmentado
                            ariaLabel='Vendedores'
                            valor={sub}
                            onCambio={(clave) => goTo('vendedores', clave)}
                            opciones={SUBTABS.vendedores.map(t => ({ value: t.key, label: t.label }))}
                        />
                        {sub === 'solicitudes'
                            ? <InteresadosSection onDarDeAlta={(colaborador) => { setAltaVendedor(colaborador); goTo('vendedores', 'registrados') }} />
                            : <VendedoresSection altaInicial={altaVendedor} onAltaUsada={() => setAltaVendedor(null)} />}
                    </div>
                ) : null
            case 'ventas':
                return puedeVer('ventas') ? <VentasSection tab={sub} /> : null
            case 'analitica':
                return puedeVer('analitica')
                    ? <EventosAnalitica etapa={sub} invitations={newInvitations} esPrueba={esPrueba} />
                    : null
            case 'buzon':
                return (
                    sub === 'reportes' ? (
                        <NotificacionesSection
                            tickets={tickets}
                            cargando={tickets === null}
                            error={ticketsError}
                            onActualizado={actualizarTicket}
                            query={globalQuery}
                        />
                    ) : sub === 'reviews' ? (
                        puedeVerSub('reviews') ? <FeedbackAdminPage eventosActivos={conteos.eventosActivos} /> : null
                    ) : (
                        <div className={styles.buzonPagina}>
                            <BuzonDrawer conversations={conversations} invitationsById={invitationsById} />
                        </div>
                    )
                )
            case 'configuracion':
                return sub === 'planes' ? (puedeVerSub('planes') ? <PlanesSection /> : null) : <OnboardingSection />
            case 'lab':
                return <LaboratorioSection invitations={newInvitations} />
            case 'eventos':
            default:
                return (
                    <EventosSection
                        tab={sub}
                        newInvitations={newInvitations}
                        profiles={newProfiles}
                        refreshEventos={refreshEventos}
                        query={globalQuery}
                        esPrueba={esPrueba}
                    />
                )
        }
    }

    return (
        <div className={styles.shell}>
            {mobileNavOpen && (
                <button
                    type='button'
                    aria-label='Cerrar navegación'
                    className={styles.overlay}
                    onClick={() => setMobileNavOpen(false)}
                />
            )}

            <aside className={`${styles.rail} ${mobileNavOpen ? styles.railOpen : ''}`}>
                <div className={styles.railHeader}>
                    <Tooltip title='Volver a Mis eventos' placement='right'>
                        <button
                            type='button'
                            aria-label='Volver a Mis eventos'
                            className={styles.railBack}
                            onClick={() => navigate('/invitations')}
                        >
                            <ArrowLeft size={15} strokeWidth={1.7} />
                        </button>
                    </Tooltip>
                </div>

                <nav className={styles.railNav}>
                    {navGroups.map(group => (
                        <div key={group.label}>
                            <div className={styles.railGroupLabel}>{group.label}</div>
                            {group.items.map((item) => {
                                const { key, label } = item
                                const Icon = item.icon
                                const counter = counterFor(key)
                                const pendientesBuzon = key === 'buzon' ? unAnswer + pendientes(tickets).length : 0
                                return (
                                    <button
                                        key={key}
                                        type='button'
                                        className={`${styles.railItem} ${route === key ? styles.railItemActive : ''}`}
                                        aria-current={route === key ? 'page' : undefined}
                                        onClick={() => goTo(key)}
                                    >
                                        <Icon size={17} strokeWidth={1.7} />
                                        <span className={styles.railItemLabel}>{label}</span>
                                        {counter !== null && <span className={styles.railCount}>{counter}</span>}
                                        {pendientesBuzon > 0 && (
                                            <span className={`${styles.railBadge} ${styles.railBadgeViolet}`}>{pendientesBuzon}</span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                </nav>

                <div className={styles.railFooter}>
                    <button
                        type='button'
                        className={`${styles.railItem} ${route === 'configuracion' ? styles.railItemActive : ''}`}
                        aria-current={route === 'configuracion' ? 'page' : undefined}
                        onClick={() => goTo('configuracion')}
                    >
                        <Settings size={17} strokeWidth={1.7} />
                        <span className={styles.railItemLabel}>Configuración</span>
                    </button>

                    <div className={styles.userChip}>
                        <span className={styles.avatar}>{userName.charAt(0)}</span>
                        <span className={styles.userName}>{userName}</span>
                        <ChevronDown className={styles.userChevron} size={15} strokeWidth={1.7} />
                    </div>
                </div>
            </aside>

            <div className={styles.main}>
                {(() => {
                    const pestanas = SUBTABS_EN_CONTENIDO.has(route) ? [] : subsDe(route)
                    const ranuraFiltros = <div ref={setFiltrosSlot} className={styles.topbarFiltros} />
                    return (
                        <header className={`${styles.topbar} ${pestanas.length ? styles.topbarConPestanas : ''}`}>
                            <div className={styles.topbarFila}>
                                <button
                                    type='button'
                                    aria-label='Abrir navegación'
                                    className={styles.hamburger}
                                    onClick={() => setMobileNavOpen(true)}
                                >
                                    <MenuIcon size={18} strokeWidth={1.7} />
                                </button>

                                <div className={styles.topbarTitles}>
                                    {GRUPO[route] && <div className={styles.topbarMiga}>{GRUPO[route]}</div>}
                                    <h1 className={styles.topbarTitle}>{head.title}</h1>
                                    <div className={styles.topbarSubtitle}>{head.subtitle}</div>
                                </div>

                                {/* Sin pestañas, los filtros de la sección van en esta fila. */}
                                {!pestanas.length && ranuraFiltros}

                                <div className={styles.search}>
                                    <Search size={15} strokeWidth={1.7} />
                                    <input
                                        className={styles.searchInput}
                                        placeholder='Buscar evento, usuario, venta…'
                                        value={globalQuery}
                                        onChange={(e) => setGlobalQuery(e.target.value)}
                                    />
                                    <span className={styles.searchHint}>⌘K</span>
                                </div>

                                {head.action && (() => {
                                    const boton = (
                                        <button type='button' className={styles.primaryAction} onClick={head.action.onClick}>
                                            <Plus size={15} strokeWidth={2.2} />
                                            {head.action.label}
                                        </button>
                                    )
                                    return head.action.wrap ? head.action.wrap(boton) : boton
                                })()}
                                {/* Acción que pone la propia sección (p. ej. "Nuevo planner"). */}
                                <div ref={setAccionSlot} className={styles.topbarAccion} />
                            </div>

                            {pestanas.length > 0 && (
                                <div className={styles.topbarPestanas}>
                                    <div className={styles.subtabs} role='tablist'>
                                        {pestanas.map(({ key, label }) => {
                                            const conteo = conteoDeSub(key)
                                            return (
                                                <button
                                                    key={key}
                                                    type='button'
                                                    role='tab'
                                                    aria-selected={sub === key}
                                                    className={`${styles.subtab} ${sub === key ? styles.subtabActiva : ''}`}
                                                    onClick={() => goTo(route, key)}
                                                >
                                                    {label}
                                                    {conteo !== null && <span className={styles.pestanaConteo}>{conteo}</span>}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {ranuraFiltros}
                                </div>
                            )}
                        </header>
                    )
                })()}

                <main className={styles.content}>
                    <AdminTopbarProvider value={{ filtrosSlot, accionSlot }}>
                        {renderSection()}
                    </AdminTopbarProvider>
                </main>
            </div>

            <nav className={styles.tabbar}>
                {TAB_BAR
                    .filter(item => puedeVer(item.key))
                    .map((item) => {
                        const Icon = item.icon
                        return (
                            <button
                                key={item.key}
                                type='button'
                                className={`${styles.tabbarItem} ${route === item.key ? styles.tabbarItemActive : ''}`}
                                onClick={() => goTo(item.key)}
                            >
                                <Icon size={19} strokeWidth={1.7} />
                                {item.label}
                            </button>
                        )
                    })}
            </nav>

            <AdminModal
                open={usuarioCreadoOpen && !!usuarioCreado}
                onClose={() => setUsuarioCreadoOpen(false)}
                title='Nuevo usuario agregado exitosamente'
                width={400}
            >
                <div className={styles.nuevoUsuario}>
                    <span>{usuarioCreado?.email ?? '----'}</span>
                    <div className={styles.nuevoUsuarioPass}>
                        {/* El backend devuelve { email, pass, id }: copiar `password`
                            (como hacía la versión anterior) copiaba una cadena vacía. */}
                        <span>{usuarioCreado?.pass ?? '*******'}</span>
                        <Button
                            icon={<Copy size={14} />}
                            onClick={() => navigator.clipboard.writeText(usuarioCreado?.pass ?? '')
                                .then(() => message.success('Contraseña copiada'))
                                .catch(err => console.error('Error al copiar:', err))}
                        >
                            Copiar contraseña
                        </Button>
                    </div>
                </div>
            </AdminModal>

            <NewInvitationDrawer
                visible={onNewInvitation} setVisible={setOnNewInvitation} refreshInvitations={refreshEventos} user={user}
            />
        </div>
    )
}
