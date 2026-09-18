import { useEffect, useMemo, useState } from 'react'
import { Button, Dropdown, Select, Tooltip, message } from 'antd'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    BarChart3, Calendar, ChevronDown, FlaskConical, Home, Inbox, Landmark,
    Menu as MenuIcon, ArrowLeft, Copy, Plus, Search, Star, Users, X,
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
import { crearFiltroDePrueba, esEventoActivo } from './adminConstants'
import './admin-tokens.css'
import styles from './AdminShell.module.css'

dayjs.locale('es')

// Pantallas reservadas al dueño: números de negocio y feedback de clientes.
// Cualquier otro admin ve el resto del panel, pero no estas tres.
const CORREO_DEL_DUENIO = 'albserrano8@gmail.com'
const RUTAS_RESERVADAS = new Set(['ventas', 'analitica', 'feedback'])


const ROUTES = ['hoy', 'eventos', 'usuarios', 'ventas', 'analitica', 'feedback', 'lab']

// Grupos del rail. `lab` conserva el key legacy 'herramientas' en la URL para no
// romper los enlaces ?tab=herramientas que ya circulan.
const NAV_GROUPS = [
    {
        label: 'Operación',
        items: [
            { key: 'hoy', label: 'Hoy', icon: Home },
            { key: 'eventos', label: 'Eventos', icon: Calendar },
            { key: 'usuarios', label: 'Usuarios', icon: Users },
        ],
    },
    {
        label: 'Negocio',
        items: [
            { key: 'ventas', label: 'Ventas', icon: Landmark },
            { key: 'analitica', label: 'Analítica', icon: BarChart3 },
            { key: 'feedback', label: 'Feedback', icon: Star },
        ],
    },
    {
        label: 'Estudio',
        items: [
            { key: 'lab', label: 'Laboratorio', icon: FlaskConical },
        ],
    },
]

const TAB_BAR = [
    { key: 'hoy', label: 'Hoy', icon: Home },
    { key: 'eventos', label: 'Eventos', icon: Calendar },
    { key: 'ventas', label: 'Ventas', icon: Landmark },
    { key: 'lab', label: 'Lab', icon: FlaskConical },
]

const normalizarRuta = (tab) => {
    if (tab === 'herramientas') return 'lab'
    return ROUTES.includes(tab) ? tab : null
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
    const userName = session?.user?.name || session?.user?.full_name || session?.user?.email || 'Admin'

    const [searchParams, setSearchParams] = useSearchParams()
    const requestedRoute = normalizarRuta(searchParams.get('tab'))
    const initialRoute = requestedRoute && puedeVer(requestedRoute) ? requestedRoute : 'hoy'

    const [route, setRoute] = useState(initialRoute)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
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

    const goTo = (key) => {
        setRoute(key)
        setMobileNavOpen(false)
        searchParams.set('tab', key)
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
    }, [])

    // ------------------------------------------------- contadores del rail ---

    const conteos = useMemo(() => {
        const invitaciones = newInvitations ?? []
        const reales = invitaciones.filter(i => !esPrueba(i))

        return {
            eventosActivos: reales.filter(i => esEventoActivo(i)).length,
            eventosTotales: reales.length,
            eventosPrueba: invitaciones.length - reales.length,
            usuarios: (newProfiles ?? []).length,
            admins: (newProfiles ?? []).filter(p => p.role === 'Administration').length,
            vendedores: (newProfiles ?? []).filter(p => p.role === 'sales').length,
        }
    }, [newInvitations, newProfiles])

    // ---------------------------------------------------- copy de la topbar ---

    const HEAD = {
        hoy: {
            title: 'Hoy',
            subtitle: dayjs().format('dddd D [de] MMMM'),
        },
        eventos: {
            title: 'Eventos',
            subtitle: `${conteos.eventosActivos} activos · ${conteos.eventosTotales} en total · ${conteos.eventosPrueba} pruebas`,
            // El picker de usuario necesita envolver al botón, así que esta ruta
            // declara `wrap` en vez de un `onClick` suelto.
            action: { label: 'Agregar evento', wrap: (boton) => pickerAgregarEvento(boton) },
        },
        usuarios: {
            title: 'Usuarios',
            subtitle: `${conteos.usuarios} cuentas · ${conteos.admins} admin · ${conteos.vendedores} vendedores · ${conteos.usuarios - conteos.admins - conteos.vendedores} clientes`,
            action: { label: 'Nuevo usuario', wrap: (boton) => pickerNuevoUsuario(boton) },
        },
        ventas: { title: 'Ventas', subtitle: 'Ingresos, comisiones y cobranza' },
        analitica: {
            title: 'Analítica',
            subtitle: 'Uso del producto evento por evento · las invitaciones de prueba quedan fuera',
        },
        feedback: { title: 'Feedback', subtitle: 'Reviews dejadas por organizadores' },
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
        if (key === 'usuarios') return conteos.usuarios || null
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

    const renderSection = () => {
        switch (route) {
            case 'hoy':
                return (
                    <HoySection onNavigate={goTo} canSeeVentas={esDuenio} />
                )
            case 'usuarios':
                return (
                    <UsuariosSection
                        profiles={newProfiles}
                        onOpenNewInvitation={onOpenNewInvitation}
                        query={globalQuery}
                    />
                )
            case 'ventas':
                return puedeVer('ventas') ? <VentasSection /> : null
            case 'analitica':
                return puedeVer('analitica')
                    ? <EventosAnalitica invitations={newInvitations} esPrueba={esPrueba} />
                    : null
            case 'feedback':
                return puedeVer('feedback')
                    ? <FeedbackAdminPage eventosActivos={conteos.eventosActivos} />
                    : null
            case 'lab':
                return <LaboratorioSection invitations={newInvitations} />
            case 'eventos':
            default:
                return (
                    <EventosSection
                        newInvitations={newInvitations}
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
                                return (
                                    <Tooltip key={key} title={label} placement='right'>
                                        <button
                                            type='button'
                                            className={`${styles.railItem} ${route === key ? styles.railItemActive : ''}`}
                                            onClick={() => goTo(key)}
                                        >
                                            <Icon size={17} strokeWidth={1.7} />
                                            <span className={styles.railItemLabel}>{label}</span>
                                            {counter !== null && <span className={styles.railCount}>{counter}</span>}
                                        </button>
                                    </Tooltip>
                                )
                            })}
                        </div>
                    ))}
                </nav>

                <div className={styles.railFooter}>
                    <Tooltip title='Mensajes' placement='right'>
                        <button
                            type='button'
                            className={styles.railItem}
                            onClick={() => setDrawerOpen(open => !open)}
                        >
                            <Inbox size={17} strokeWidth={1.7} />
                            <span className={styles.railItemLabel}>Mensajes</span>
                            {unAnswer > 0 && (
                                <span className={`${styles.railBadge} ${styles.railBadgeViolet}`}>{unAnswer}</span>
                            )}
                        </button>
                    </Tooltip>

                    <div className={styles.userChip}>
                        <span className={styles.avatar}>{userName.charAt(0)}</span>
                        <span className={styles.userName}>{userName}</span>
                        <ChevronDown className={styles.userChevron} size={15} strokeWidth={1.7} />
                    </div>
                </div>
            </aside>

            <div className={styles.main}>
                <header className={styles.topbar}>
                    <button
                        type='button'
                        aria-label='Abrir navegación'
                        className={styles.hamburger}
                        onClick={() => setMobileNavOpen(true)}
                    >
                        <MenuIcon size={18} strokeWidth={1.7} />
                    </button>

                    <div className={styles.topbarTitles}>
                        <h1 className={styles.topbarTitle}>{head.title}</h1>
                        <div className={styles.topbarSubtitle}>{head.subtitle}</div>
                    </div>

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
                </header>

                <main className={styles.content}>
                    {renderSection()}
                </main>
            </div>

            {/* Montado siempre: es lo que permite animar el cierre además de la
                apertura. `inert` lo saca del tab order y del lector de pantalla
                mientras está cerrado, que es lo que antes daba gratis el
                desmontaje. */}
            <aside
                className={`${styles.drawer} ${drawerOpen ? '' : styles.drawerCerrado}`}
                inert={!drawerOpen}
            >
                <div className={styles.drawerPanel}>
                    <div className={styles.drawerHeader}>
                        <span className={styles.drawerTitle}>Buzón</span>
                        {unAnswer > 0 && (
                            <span className={styles.drawerCount}>{unAnswer} sin responder</span>
                        )}
                        <button
                            type='button'
                            aria-label='Cerrar buzón'
                            className={styles.drawerClose}
                            onClick={() => setDrawerOpen(false)}
                        >
                            <X size={15} strokeWidth={1.7} />
                        </button>
                    </div>
                    <div className={styles.drawerBody}>
                        <BuzonDrawer
                            conversations={conversations}
                            invitationsById={invitationsById}
                        />
                    </div>
                </div>
            </aside>

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
                <button
                    type='button'
                    className={`${styles.tabbarItem} ${styles.tabbarItemInbox}`}
                    onClick={() => setDrawerOpen(open => !open)}
                >
                    <Inbox size={19} strokeWidth={1.7} />
                    Buzón
                </button>
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
