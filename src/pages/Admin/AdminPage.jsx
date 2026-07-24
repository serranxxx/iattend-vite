import { Badge, Button, Divider, Dropdown, Input, InputNumber, Layout, Modal, Select, Space, Table, Tabs, message } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import './AdminPanel.css'
import { supabase } from '../../lib/supabase'
import { CreateAccount } from '../../components/Auth/CreateUser'
import { NewInvitationDrawer } from '../../components/Create/NewInvitationDrawer'
import { HeaderBuild } from '../../modules/Header/Header'
import { LuArrowUpFromLine, LuArrowUpRight, LuChevronDown, LuCopy, LuLink, LuPlus, LuUserPlus } from 'react-icons/lu'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowUpRight, ChevronDown, Copy, FlaskConical, Link2, MessageCircle, MoreVertical, Plus, SquareChevronDown } from 'lucide-react'
import { IoMdAdd } from 'react-icons/io'
import { WhatsappMessages } from '../../modules/GuestManagement/WhatsappMessages/WhatsappMessages'
import { SalesAdminPage } from './SalesAdminPage'

const BLEND_OPTIONS = [
    'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
    'color-dodge', 'color-burn', 'hard-light', 'soft-light',
    'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
].map(value => ({ value, label: value }))

export const AdminPage = () => {


    const [visible, setVisible] = useState(false)
    const [onNewInvitation, setOnNewInvitation] = useState(false)
    const [user, setUser] = useState(null)
    const [newInvitations, setNewInvitations] = useState(null)
    const [newProfiles, setNewProfiles] = useState(null)
    const [userData, setUserData] = useState(null)
    const [messageApi, contextHolder] = message.useMessage();
    const [filterName, setFilterName] = useState(null)
    const [actualCredits, setActualCredits] = useState(null)
    const [activeKey, setActiveKey] = useState('esperando');
    const [searchParams] = useSearchParams();
    const [outerActiveKey, setOuterActiveKey] = useState(searchParams.get('tab') || 'clientes');
    const [nextEvents, setNextEvents] = useState([])
    const [ownerInputs, setOwnerInputs] = useState({});
    const [conversations, setConversations] = useState([])
    const [unAnswer, setUnAnswer] = useState(0)
    const [colaboradores, setColaboradores] = useState(null)
    const [textures, setTextures] = useState([])
    const [editingTexture, setEditingTexture] = useState(null)
    const [editName, setEditName] = useState('')
    const [editOpacity, setEditOpacity] = useState(0.5)
    const [editBlend, setEditBlend] = useState('multiply')
    const [savingEdit, setSavingEdit] = useState(false)

    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            messageApi.success('Copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const getNewUsers = async () => {
        // 1️⃣ Obtén la sesión actual
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
        // 2️⃣ Filtra por el user_id del usuario autenticado
        const { data, error } = await supabase
            .from("profiles")
            .select("*")

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            setNewProfiles(data)
        }
    };

    const getNewInvitations = async () => {
        // 1️⃣ Obtén la sesión actual
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
        // 2️⃣ Filtra por el user_id del usuario autenticado
        const { data, error } = await supabase
            .from("invitations")
            .select("*")

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            setNewInvitations(data)
        }
    };

    const getInvitationsByDate = async () => {
        const { data, error } = await supabase
            .rpc('get_upcoming_with_userv2');

        if (error) console.error(error);
        else {
            // console.log('by date: ', data)
            setNextEvents(data.filter(i => i.user_email !== 'albserrano8@gmail.com' && i.user_email !== 'pa.perez98@gmail.com' && i.user_email !== 'pau@iattend.mx'))
        }

    }



    const updateInvitationCredits = async (id) => {

        try {
            await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/invitation/update-credits`,
                // 'http://localhost:4000/api/invitation/update-credits',
                { id: id, credits: actualCredits }
            );

            messageApi.success('Editado con éxito')
            refreshData()

        } catch (error) {
            console.error('Error updating credits:', error.response?.data || error.message);
            throw error;
        }
    };



    const getColaboradores = async () => {
        const { data, error } = await supabase
            .from('colaboradores_interesados')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) console.error('Error al obtener colaboradores:', error);
        else setColaboradores(data);
    };

    const toggleColaboradorField = async (id, field, currentValue) => {
        const update = { [field]: !currentValue };
        if (field === 'contactado' && !currentValue) update.fecha_contacto = new Date().toISOString();
        const { error } = await supabase
            .from('colaboradores_interesados')
            .update(update)
            .eq('id', id);
        if (error) { messageApi.error('Error al actualizar'); return; }
        setColaboradores(prev => prev.map(c => c.id === id ? { ...c, ...update } : c));
    };

    const getTexturesAdmin = async () => {
        const { data, error } = await supabase
            .from('textures')
            .select('*')
            .order('sort_order');
        if (error) console.error('Error al obtener texturas:', error);
        else setTextures(data);
    };

    const openEditTexture = (t) => {
        setEditingTexture(t);
        setEditName(t.name);
        setEditOpacity(t.opacity);
        setEditBlend(t.blend);
    };

    const handleSaveEdit = async () => {
        if (!editingTexture) return;
        setSavingEdit(true);
        try {
            const { error } = await supabase
                .from('textures')
                .update({ name: editName.trim(), opacity: editOpacity, blend: editBlend })
                .eq('id', editingTexture.id);
            if (error) { messageApi.error('Error al guardar los cambios'); return; }
            setTextures(prev => prev.map(t => t.id === editingTexture.id ? { ...t, name: editName.trim(), opacity: editOpacity, blend: editBlend } : t));
            messageApi.success('Textura actualizada');
            setEditingTexture(null);
        } finally {
            setSavingEdit(false);
        }
    };

    const refreshData = () => {
        getNewInvitations()
        getNewUsers()
        getInvitationsByDate()
        getColaboradores()
        getTexturesAdmin()
    }

    const handleNewInvitation = (user) => {
        setUser(user)
        setOnNewInvitation(true)
    }

    const nextEventsCols = useMemo(() => ([

        {
            title: 'Nombre',
            dataIndex: 'full_name',
            key: 'name',
            // with: 180,
            // minWidth: 180,
            fixed: "left",
            //   render: text => <a>{text}</a>,
        },
        {
            title: 'Usuario',
            dataIndex: 'user_email',
            key: 'email',
            with: 240,
            // minWidth: 180

        },
        {
            title: 'Plan',
            dataIndex: 'plan',
            key: 'address',
            // with: 100,
            // minWidth: 100,
            render: text => <img src={`/images/plan_${text}.png`} style={{ height: '30px', borderRadius: '8px' }} alt='' />,
        },
        {
            title: 'Créditos',
            dataIndex: 'credits',
            key: 'address',
            // with: 200,
            render: (text, record) => (
                <div className='admin-table-content-subt' style={{ maxWidth: '160px' }}>

                    <InputNumber value={text} onChange={(e) => setActualCredits(e)} />
                    <Button style={{ marginLeft: '6px' }} onClick={() => updateInvitationCredits(record.invitation_id)} icon={<LuArrowUpFromLine />} />

                </div>
            )
        },
        {
            title: 'Dueños',
            dataIndex: 'owners',
            key: 'owners',
            // with: 200,
            render: (text, record) => (

                <Dropdown
                    arrow
                    trigger={['click']}
                    popupRender={() => (
                        <div className='buttons_admin_cont' style={{
                            padding: "12px"
                        }}>
                            {
                                text.length > 0 &&
                                <>
                                    {
                                        text.map((t, index) => (
                                            <div className='owner_item' key={t}>
                                                <span>{t}</span>
                                                <Button onClick={() => removeOwner(record.invitation_id, index)} className='primarybutton' style={{ maxWidth: '32px' }} >-</Button>
                                            </div>
                                        ))
                                    }

                                    <Divider style={{ margin: '8px 0', }} />
                                </>
                            }

                            <Space style={{ boxSizing: 'border-box' }}>
                                <Input
                                    style={{ minWidth: '100px', borderRadius: '99px' }}
                                    placeholder="Nuevo participante"
                                    value={ownerInputs[record.invitation_id] || ''}
                                    onChange={(e) =>
                                        setOwnerInputs((prev) => ({
                                            ...prev,
                                            [record.invitation_id]: e.target.value,
                                        }))
                                    }
                                />
                                <Button onClick={() => AddNewOwner(record.invitation_id, ownerInputs[record.invitation_id] || '')} className='primarybutton' icon={<IoMdAdd />} >

                                </Button>
                            </Space>

                        </div>
                    )}
                >
                    <Button style={{
                        width: '100%', textTransform: 'capitalize'
                    }}>{text[0] ? text[0] + " " + `(${text.length})` : 'Sin asignar'}</Button>
                </Dropdown>


            )
        },
        {
            title: 'Fecha',
            dataIndex: 'cover_date',
            key: 'address',
            // with: 80,
            // minWidth: 80,
            render: text => <span>{text.slice(0, 10)}</span>,
        },
        {
            title: 'Acciones',
            dataIndex: '',
            key: 'address',
            // with: 500,
            // fixed: "right",
            render: (_, record) => (

                <Dropdown
                    arrow
                    trigger={['click']}
                    popupRender={() => (
                        <div className='buttons_admin_cont'>
                            <Link style={{ width: '100%' }} target='_blank' to={`https://www.iattend.events/${record?.data?.generals?.event?.label}/${record?.data?.generals?.event?.name}`}>
                                <Button icon={<Link2 size={14} />} className='primarybutton' style={{ width: '100%' }} >Ver invitación</Button>
                            </Link>
                            <Link style={{ width: '100%' }} target='_blank' to={`https://www.iattend.site/dashboard?id=${record?.invitation_id}`}>
                                <Button icon={<ArrowUpRight size={14} />} className='primarybutton' style={{ width: '100%' }}  >Acceder evento</Button>
                            </Link>
                            <Button icon={<Copy size={14} />} className='primarybutton' style={{ width: '100%' }} onClick={() => copyToClipboard(record.invitation_id)} >Copiar ID</Button>
                            <Button onClick={() => insertSideEvent(record?.invitation_id)} icon={<Plus size={14} />} className='primarybutton' style={{ width: '100%' }} >Side event</Button>

                        </div>
                    )}
                >
                    <Button icon={<ChevronDown size={14} />}>Opciones</Button>
                </Dropdown>
            )
        },


    ]), [ownerInputs, actualCredits]);


    const allUsersCols = [

        {
            title: 'Nombre',
            dataIndex: 'name',
            key: 'name',
            //   render: text => <a>{text}</a>,
        },
        {
            title: 'Usuario',
            dataIndex: 'user_email',
            key: 'email',

        },

        {
            title: 'Plan',
            dataIndex: 'plan',
            key: 'address',
            render: text => <img src={`/images/plan_${text}.png`} style={{ height: '30px', borderRadius: '8px' }} alt='' />,
        },
        {
            title: 'Creditos',
            dataIndex: 'credits',
            key: 'address',
            render: (text, record) => (
                <div className='admin-table-content-subt' style={{ maxWidth: '160px' }}>

                    <InputNumber value={text} onChange={(e) => setActualCredits(e)} />
                    <Button style={{ marginLeft: '6px' }} onClick={() => updateInvitationCredits(record.id)} icon={<LuArrowUpFromLine />} />

                </div>
            )
        },
        {
            title: 'Dueños',
            dataIndex: 'owners',
            key: 'owners',
            // with: 200,
            render: (text, record) => (

                <Dropdown
                    arrow
                    trigger={['click']}
                    popupRender={() => (
                        <div className='buttons_admin_cont' style={{
                            padding: "12px"
                        }}>
                            {
                                text.length > 0 &&
                                <>
                                    {
                                        text.map((t, index) => (
                                            <div className='owner_item' key={t}>
                                                <span>{t}</span>
                                                <Button onClick={() => removeOwner(record.id, index)} className='primarybutton' style={{ maxWidth: '32px' }} >-</Button>
                                            </div>
                                        ))
                                    }

                                    <Divider style={{ margin: '8px 0', }} />
                                </>
                            }

                            <Space style={{ boxSizing: 'border-box' }}>
                                <Input
                                    style={{ minWidth: '100px', borderRadius: '99px' }}
                                    placeholder="Nuevo participante"
                                    value={ownerInputs[record.id] || ''}
                                    onChange={(e) =>
                                        setOwnerInputs((prev) => ({
                                            ...prev,
                                            [record.id]: e.target.value,
                                        }))
                                    }
                                />
                                <Button onClick={() => AddNewOwner(record.id, ownerInputs[record.id] || '')} className='primarybutton' icon={<IoMdAdd />} >

                                </Button>
                            </Space>

                        </div>
                    )}
                >
                    <Button style={{
                        width: '100%', textTransform: 'capitalize'
                    }}>{text[0] ? text[0] + " " + `(${text.length})` : 'Sin asignar'}</Button>
                </Dropdown>


            )
        },
        {
            title: 'Fecha',
            dataIndex: 'cover_date',
            key: 'address',
            render: (text, record) => <span>{record?.data?.cover?.date.value?.slice(0, 10)}</span>,
        },
        {
            title: 'Acciones',
            dataIndex: '',
            key: 'address',
            // with: 500,
            // fixed: "right",
            render: (_, record) => (

                <Dropdown
                    arrow
                    trigger={['click']}
                    popupRender={() => (
                        <div className='buttons_admin_cont'>
                            <Link style={{ width: '100%' }} target='_blank' to={`https://www.iattend.events/${record?.data?.generals?.event?.label}/${record?.data?.generals?.event?.name}`}>
                                <Button icon={<Link2 size={14} />} className='primarybutton' style={{ width: '100%' }} >Ver invitación</Button>
                            </Link>
                            <Link style={{ width: '100%' }} target='_blank' to={`https://www.iattend.site/dashboard?id=${record?.id}`}>
                                <Button icon={<ArrowUpRight size={14} />} className='primarybutton' style={{ width: '100%' }}  >Acceder evento</Button>
                            </Link>
                            <Button icon={<Copy size={14} />} className='primarybutton' style={{ width: '100%' }} onClick={() => copyToClipboard(record.id)} >Copiar ID</Button>
                            <Button onClick={() => insertSideEvent(record?.id)} icon={<Plus size={14} />} className='primarybutton' style={{ width: '100%' }} >Side event</Button>

                        </div>
                    )}
                >
                    <Button icon={<ChevronDown size={14} />}>Opciones</Button>
                </Dropdown>
            )
        },
        // {
        //     title: 'Acciones',
        //     dataIndex: '',
        //     key: 'address',
        //     render: (_, record) => (
        //         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        //             <Link target='_blank' to={`https://www.iattend.events/${record?.data?.generals?.event?.label}/${record?.data?.generals?.event?.name}`}>
        //                 <Button icon={<LuLink />} >Link</Button>
        //             </Link>
        //             <Link target='_blank' to={`https://iattend.site/dashboard?id=${record?.id}`}>
        //                 <Button icon={<LuArrowUpRight />} >Abrir</Button>
        //             </Link>

        //         </div>
        //     )
        // },

    ];

    const userCols = [

        {
            title: 'Nombre',
            dataIndex: 'full_name',
            key: 'name',
            //   render: text => <a>{text}</a>,
        },
        {
            title: 'Email',
            dataIndex: 'user_email',
            key: 'email',

        },
        {
            title: 'Id',
            dataIndex: 'user_id',
            key: 'email',

        },

        {
            title: 'Acciones',
            dataIndex: '',
            key: 'address',
            render: (_, record) => (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>

                    <Button onClick={() => handleNewInvitation(record)} icon={<LuPlus />} >Agregar evento</Button>

                </div>
            )
        },


    ];


    const colaboradoresCols = useMemo(() => [
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            fixed: 'left',
        },
        {
            title: 'WhatsApp',
            dataIndex: 'telefono',
            key: 'telefono',
            render: (text) => {
                const digits = text.replace(/\D/g, '');
                const wa = digits.startsWith('52') ? digits : `52${digits}`;
                return (
                    <a href={`https://wa.me/${wa}`} target='_blank' rel='noopener noreferrer'>
                        <Button icon={<MessageCircle size={13} />} size='small'>{text}</Button>
                    </a>
                );
            },
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Ubicación',
            key: 'ubicacion',
            render: (_, r) => <span>{r.estado}, {r.pais}</span>,
        },
        {
            title: 'Cómo nos conoció',
            dataIndex: 'como_nos_conocio',
            key: 'como_nos_conocio',
            render: text => text || '—',
        },
        {
            title: 'Fecha',
            dataIndex: 'created_at',
            key: 'created_at',
            render: text => text?.slice(0, 10),
        },
        {
            title: 'Contactado',
            dataIndex: 'contactado',
            key: 'contactado',
            render: (val, record) => (
                <Button
                    size='small'
                    type={val ? 'primary' : 'default'}
                    onClick={() => toggleColaboradorField(record.id, 'contactado', val)}
                    style={val ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : {}}
                >
                    {val ? '✓ Sí' : 'No'}
                </Button>
            ),
        },
        {
            title: 'Aceptó',
            dataIndex: 'acepto',
            key: 'acepto',
            render: (val, record) => (
                <Button
                    size='small'
                    type={val ? 'primary' : 'default'}
                    onClick={() => toggleColaboradorField(record.id, 'acepto', val)}
                    style={val ? { backgroundColor: '#722ed1', borderColor: '#722ed1' } : {}}
                >
                    {val ? '✓ Sí' : 'No'}
                </Button>
            ),
        },
    ], [colaboradores]);

    const texturesGrid = useMemo(() => (
        [...(textures ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(t => (
            <div key={t.id} style={{
                display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden',
                backgroundColor: '#FFF', boxShadow: '0px 0px 12px rgba(0,0,0,0.08)',
            }}>
                <div style={{ position: 'relative', width: '100%', height: '140px' }}>
                    <img src={t.image_url} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <Button
                        shape='circle'
                        
                        icon={<MoreVertical size={14} />}
                        onClick={() => openEditTexture(t)}
                        style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor:'#FFFFFF40', backdropFilter:'blur(10px)' }}
                    />
                </div>
                <div style={{ padding: '12px' }}>
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                </div>
            </div>
        ))
    ), [textures]);

    const clientesItems = useMemo(() => ([
        {
            label: `Eventos activos (${nextEvents.length})`,
            key: "esperando",
            children: (
                <Table
                    columns={nextEventsCols}
                    dataSource={
                        nextEvents.filter(i => {
                            if (filterName) {
                                return (
                                    i?.full_name?.toLowerCase().includes(filterName?.toLowerCase())
                                )
                            }
                            else return true
                        })}
                    pagination={false} />
            ),
        },
        {
            label: `Todos (${newInvitations?.filter(i => i.user_email !== 'albserrano8@gmail.com' && i.user_email !== 'pa.perez98@gmail.com' && i.user_email !== 'pau@iattend.mx')?.length})`,
            key: "todos",
            children: (
                <Table
                    rowKey="id"
                    columns={allUsersCols}
                    dataSource={
                        [...(newInvitations ?? [])]
                            ?.filter((i) => {
                                if (filterName) {
                                    return i.user_email
                                        ?.toLowerCase()
                                        .includes(filterName.toLowerCase());
                                }
                                return true;
                            })
                            ?.filter(i => i.user_email !== 'albserrano8@gmail.com' && i.user_email !== 'pa.perez98@gmail.com' && i.user_email !== 'pau@iattend.mx')
                            ?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    }

                    pagination={false}
                />

            ),
        },
        {
            label: `Pruebas (${newInvitations?.filter(i => i.user_email === 'albserrano8@gmail.com' || i.user_email === 'pa.perez98@gmail.com' || i.user_email === 'pau@iattend.mx')?.length})`,
            key: "pruebas",
            children: (
                <Table
                    rowKey="id"
                    columns={allUsersCols}
                    dataSource={
                        [...(newInvitations ?? [])]
                            ?.filter((i) => {
                                if (filterName) {
                                    return i.user_email
                                        ?.toLowerCase()
                                        .includes(filterName.toLowerCase());
                                }
                                return true;
                            })
                            ?.filter(i => i.user_email === 'albserrano8@gmail.com' || i.user_email === 'pa.perez98@gmail.com' || i.user_email === 'pau@iattend.mx')
                            ?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    }

                    pagination={false}
                />

            ),
        },
        {
            label: `Usuarios (${newProfiles?.length})`,
            key: "users",
            children: (
                <Table
                    rowKey="id"
                    columns={userCols}
                    dataSource={newProfiles}

                    pagination={false}
                />

            ),
        },
        {
            label: `Colaboradores (${colaboradores?.length ?? 0})`,
            key: "colaboradores",
            children: (
                <Table
                    rowKey="id"
                    columns={colaboradoresCols}
                    dataSource={colaboradores}
                    pagination={false}
                    scroll={{ x: true }}
                />
            ),
        },
    ]), [filterName, nextEvents, actualCredits, newInvitations, ownerInputs, colaboradores, colaboradoresCols]);

    const clientesTabBarExtraContent = (
        <div className='title-new-user-container'>
            <Input placeholder='Búscar...' value={filterName} onChange={(e) => setFilterName(e.target.value)} style={{ flex: 1, borderRadius: '99px', minWidth: '400px' }} />
            <Dropdown
                trigger={['click']}
                placement='bottomLeft'
                arrow
                popupRender={() => (
                    <WhatsappMessages conversations={conversations} isAdmin={true} invitationsById={invitationsById} />
                )}
            >
                <Badge count={unAnswer} color='var(--purple-color)' size='large'>
                    <Button style={{ minWidth: '32px', }} className='primarybutton' icon={<MessageCircle size={12} />} />
                </Badge>
            </Dropdown>
            <Dropdown
                arrow
                trigger={['click']}
                popupRender={() => (
                    <div style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0px 0px 12px rgba(0,0,0,0.2)',
                        boxSizing: 'border-box', padding: '12px'
                    }}>
                        <CreateAccount refreshData={refreshData} setVisible={setVisible} setUserData={setUserData} />
                    </div>
                )}
            >
                <Button className='primarybutton--active' style={{ borderRadius: '99px' }} icon={<LuUserPlus size={16} />}>Nuevo usuario</Button>
            </Dropdown>
        </div>
    )

    const outerItems = useMemo(() => ([
        {
            label: 'Clientes',
            key: 'clientes',
            children: (
                <Tabs
                    style={{ width: '100%' }}
                    type="card"
                    activeKey={activeKey}
                    onChange={setActiveKey}
                    items={clientesItems}
                    tabBarExtraContent={clientesTabBarExtraContent}
                />
            ),
        },
        {
            label: 'Ventas',
            key: 'ventas',
            children: <SalesAdminPage />,
        },
        {
            label: `Texturas (${textures?.length ?? 0})`,
            key: 'texturas',
            children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Link to='/admin/texture-lab'>
                            <Button className='primarybutton--active' icon={<FlaskConical size={14} />}>Laboratorio de texturas</Button>
                        </Link>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                        {texturesGrid}
                    </div>
                </div>
            ),
        },
    ]), [clientesItems, activeKey, clientesTabBarExtraContent, textures, texturesGrid]);


    const insertSideEvent = async (id) => {
        const { error } = await supabase
            .from('side_events')
            .insert({
                invitation_id: id, // uuid
                date: new Date().toISOString(), // timestamp
                name: null,
                url_image: null,
                body: {
                    address: {
                        street: null,
                        number: null,
                        neighborhood: null,
                        zipcode: null,
                        country: null,
                        state: null,
                        city: null,
                        url: null,
                    },
                    hour: null,
                    image: null,
                    title: {
                        font: 'Poppins',
                        size: 36,
                        weight: 600,
                        opacity: 1,
                        line_height: 1.4
                    },
                    font: 'Poppins',
                    color: "#000000",
                    extras: null
                }
            })

        if (error) {
            console.error(error)
            return
        }

        messageApi.success('Side event agregado con éxito')


    }

    const AddNewOwner = async (id, name) => {
        try {
            await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/invitation/add-owner`,
                // 'http://localhost:4000/api/invitation/add-owner',
                { id: id, name: name }
            );

            messageApi.success('Editado con éxito')
            refreshData()
            setOwnerInputs((prev) => ({
                ...prev,
                [id]: null,
            }))

        } catch (error) {
            console.error('Error updating credits:', error.response?.data || error.message);
            throw error;
        }
    };

    const removeOwner = async (id, index) => {
        try {
            await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/invitation/remove-owner`,
                // 'http://localhost:4000/api/invitation/remove-owner',
                { id: id, index: index }
            );

            messageApi.success('Editado con éxito')
            refreshData()

        } catch (error) {
            console.error('Error updating credits:', error.response?.data || error.message);
            throw error;
        }
    };

    const invitationsById = useMemo(() =>
        new Map((newInvitations ?? []).map(i => [i.id, i]))
        , [newInvitations]);

    const getChats = async () => {
        // const { data, error } = await supabase.rpc('get_conversations_v2');
        const { data, error } = await supabase.rpc('get_conversations_v2');
        if (error) return
        setConversations(data)
        calculateUnAnswer(data)
        console.log(data)
    }

    useEffect(() => {
        console.log(invitationsById ?? "")
    }, [invitationsById])


    const calculateUnAnswer = (conversations) => {

        let count = 0
        let read = 0

        conversations.forEach(conv => (
            conv.messages.forEach(message => (
                !message.read && message.direction === 'inbound' ? count += 1 : read += 1
                // !message.read ? console.log(message) : null
            ))
        ))
        setUnAnswer(count)
    }

    useEffect(() => {
        if (!supabase) return;

        const channel = supabase
            .channel(`upload_dynamic_admin`)

            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'whatsapp_freetext_dispatches'
                },
                (payload) => {
                    const row = payload.new || payload.old;
                    if (!row) return;
                    getChats()


                }
            )

            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'whatsapp_incoming_messages'
                },
                (payload) => {
                    const row = payload.new || payload.old;
                    if (!row) return;
                    getChats();
                    message.info('Nuevo mensaje')
                }
            )

            .subscribe((status) => {
                console.log('sub status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        getInvitationsByDate()
        getNewInvitations()
        getNewUsers()
        getChats()
        getColaboradores()
        getTexturesAdmin()
    }, [])



    return (
        <div className='invitations-page-main-container'>
            {contextHolder}
            <Layout style={{
                position: 'relative', width: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'flex-start', justifyContent: 'flex-start',
                backgroundColor: 'var(--ft-color)',
                // maxWidth: '1480px',
                gap: '24px',
            }}>
                <HeaderBuild position={'admin'} />
                <div className='user-table-container' >
                    <Tabs
                        style={{ width: '100%', }}
                        type="card"
                        activeKey={outerActiveKey}
                        onChange={setOuterActiveKey}
                        items={outerItems}
                    />




                </div>

                <Modal
                    // centered // Esta propiedad centra el modal verticalmente
                    footer={null} // Elimina el footer si no necesitas botones adicionales
                    open={visible && userData}
                    onOk={() => setVisible(false)}
                    onCancel={() => setVisible(false)}
                    title="Nuevo usuario agregado exitosamente"
                    width={400}
                    styles={{
                        container: {
                            borderRadius: '24px',
                            padding: '32px',
                        },
                        header: {
                            borderBottom: 'none',
                            padding: 0,
                        },
                        body: {
                            padding: 0,
                        }
                    }}

                >
                    <div className='new_user_col' style={{ alignSelf: 'stretch', }}>
                        <span>{userData?.email ?? "----"}</span>
                        <div className='new_user_col' style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', justifyContent: 'space-between' }}>
                            <span>{userData?.pass ?? "*******"}</span>
                            <Button onClick={() => copyToClipboard(userData.password ?? "")} icon={<LuCopy />}>Copiar contraseña</Button>
                        </div>
                    </div>

                </Modal>

                <Modal
                    open={!!editingTexture}
                    onCancel={() => setEditingTexture(null)}
                    onOk={handleSaveEdit}
                    okText='Guardar cambios'
                    confirmLoading={savingEdit}
                    // title='Editar textura'
                    style={{padding:'24px'}}
                    styles={{
                        container: {
                            borderRadius: '24px',
                            padding: '0px',
                        },
                        header: {
                            borderBottom: 'none',
                            padding: 0,
                        },
                        body: {
                            padding: 12,
                        }
                    }}
                
                width={400}
                >
                    {editingTexture && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', }}>
                            <img src={editingTexture.image_url} alt='' style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '12px' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span className='gc-content-label'>Nombre</span>
                                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span className='gc-content-label'>Opacidad</span>
                                <InputNumber min={0} max={1} step={0.1} value={editOpacity} onChange={(v) => setEditOpacity(v ?? 0)} style={{ width: '100%' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span className='gc-content-label'>Blend</span>
                                <Select value={editBlend} options={BLEND_OPTIONS} onChange={setEditBlend} style={{ width: '100%' }} />
                            </div>
                        </div>
                    )}
                </Modal>

            </Layout>


            <NewInvitationDrawer
                visible={onNewInvitation} setVisible={setOnNewInvitation} refreshInvitations={refreshData} user={user}
            />

        </div>

    )

}
