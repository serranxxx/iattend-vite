import { useEffect, useMemo, useState } from 'react'
import { Badge, Dropdown, Layout, Menu, message } from 'antd'
import { useSearchParams } from 'react-router-dom'
import { Calendar, FlaskConical, Landmark, MessageCircle, Sparkles, Star, Users, Wrench } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { HeaderBuild } from '../../modules/Header/Header'
import { NewInvitationDrawer } from '../../components/Create/NewInvitationDrawer'
import { WhatsappMessages } from '../../modules/GuestManagement/WhatsappMessages/WhatsappMessages'
import { EventosSection } from './sections/EventosSection'
import { UsuariosSection } from './sections/UsuariosSection'
import { VentasSection } from './sections/VentasSection'
import { HerramientasSection } from './sections/HerramientasSection'
import { FeedbackAdminPage } from './FeedbackAdminPage'

const { Sider, Content } = Layout

const SECTION_KEYS = ['eventos', 'usuarios', 'ventas', 'feedback', 'herramientas']
const VENTAS_ALLOWED_EMAIL = 'albserrano8@gmail.com'

const MENU_ITEMS = [
    { key: 'eventos', icon: <Calendar size={16} />, label: 'Eventos' },
    { key: 'usuarios', icon: <Users size={16} />, label: 'Usuarios' },
    { key: 'ventas', icon: <Landmark size={16} />, label: 'Ventas' },
    { key: 'feedback', icon: <Star size={16} />, label: 'Feedback' },
    { key: 'herramientas', icon: <FlaskConical size={16} />, label: 'Laboratorio' },
]

export const AdminLayout = () => {
    const session = JSON.parse(localStorage.getItem('session'))
    const canSeeVentas = session?.user?.email === VENTAS_ALLOWED_EMAIL

    const menuItems = useMemo(() => (
        canSeeVentas ? MENU_ITEMS : MENU_ITEMS.filter(item => item.key !== 'ventas')
    ), [canSeeVentas])

    const [searchParams, setSearchParams] = useSearchParams()
    const requestedTab = searchParams.get('tab')
    const initialTab = SECTION_KEYS.includes(requestedTab) && (requestedTab !== 'ventas' || canSeeVentas) ? requestedTab : 'eventos'
    const [activeKey, setActiveKey] = useState(initialTab)

    const [user, setUser] = useState(null)
    const [onNewInvitation, setOnNewInvitation] = useState(false)

    const [newInvitations, setNewInvitations] = useState(null)
    const [newProfiles, setNewProfiles] = useState(null)

    const [conversations, setConversations] = useState([])
    const [unAnswer, setUnAnswer] = useState(0)

    const handleSelectSection = (key) => {
        setActiveKey(key)
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

    const renderSection = () => {
        switch (activeKey) {
            case 'usuarios':
                return (
                    <UsuariosSection
                        profiles={newProfiles}
                        refreshUsuarios={getNewUsers}
                        onOpenNewInvitation={onOpenNewInvitation}
                    />
                )
            case 'ventas':
                return canSeeVentas ? <VentasSection /> : null
            case 'feedback':
                return <FeedbackAdminPage />
            case 'herramientas':
                return <HerramientasSection />
            case 'eventos':
            default:
                return (
                    <EventosSection
                        newInvitations={newInvitations}
                        profiles={newProfiles}
                        refreshEventos={refreshEventos}
                        onOpenNewInvitation={onOpenNewInvitation}
                    />
                )
        }
    }

    return (
        <div className='invitations-page-main-container admin-page-root'>
            <Layout style={{
                position: 'relative', width: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'flex-start', justifyContent: 'flex-start',
                backgroundColor: 'var(--ft-color)',
                gap: '24px',
            }}>
                <HeaderBuild position={'admin'} />

                <Layout className='admin-panel-body'>
                    <Sider width={220} className='admin-panel-sider' theme='light'>
                        <Menu
                            mode='inline'
                            selectedKeys={[activeKey]}
                            items={menuItems}
                            onClick={({ key }) => handleSelectSection(key)}
                            className='admin-panel-menu'
                        />

                        <div className='admin-panel-sider-divider' />

                        <Dropdown
                            trigger={['click']}
                            placement='rightTop'
                            arrow
                            popupRender={() => (
                                <WhatsappMessages conversations={conversations} isAdmin={true} invitationsById={invitationsById} />
                            )}
                        >
                            <div className='admin-panel-chat-item'>
                                <MessageCircle size={16} />
                                <span>Mensajes</span>
                                {unAnswer > 0 && <Badge count={unAnswer} color='var(--purple-color)' />}
                            </div>
                        </Dropdown>
                    </Sider>

                    <Content className='admin-panel-content'>
                        {renderSection()}
                    </Content>
                </Layout>
            </Layout>

            <NewInvitationDrawer
                visible={onNewInvitation} setVisible={setOnNewInvitation} refreshInvitations={refreshEventos} user={user}
            />
        </div>
    )
}
