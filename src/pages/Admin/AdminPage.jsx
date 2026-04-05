import { Button, Divider, Dropdown, Input, InputNumber, Layout, Modal, Select, Space, Table, Tabs, message } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import './AdminPanel.css'
import { supabase } from '../../lib/supabase'
import { CreateAccount } from '../../components/Auth/CreateUser'
import { NewInvitationDrawer } from '../../components/Create/NewInvitationDrawer'
import { HeaderBuild } from '../../modules/Header/Header'
import { LuArrowUpFromLine, LuArrowUpRight, LuChevronDown, LuCopy, LuLink, LuPlus, LuPower, LuPowerOff, LuUserPlus } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import axios from 'axios'
import UserPopUp from '../../components/UserPopUp/UserPopUp'
import { ArrowUpRight, ChevronDown, Copy, Link2, Plus, SquareChevronDown } from 'lucide-react'
import { IoMdAdd } from 'react-icons/io'


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
    const [nextEvents, setNextEvents] = useState([])
    const [ownerInputs, setOwnerInputs] = useState({});

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
            console.log('by date: ', data)
            setNextEvents(data.filter(i => i.user_email !== 'albserrano8@gmail.com' && i.user_email !== 'pa.perez98@gmail.com' && i.user_email !== 'pau@iattend.mx'))
        }

    }

    useEffect(() => {
        getInvitationsByDate()
        getNewInvitations()
        getNewUsers()
    }, [])


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



    const refreshData = () => {
        getNewInvitations()
        getNewUsers()
        getInvitationsByDate()
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


    ]), [ownerInputs]);


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


    const items = useMemo(() => ([
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


    ]), [filterName, nextEvents, actualCredits, newInvitations, ownerInputs]);


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



    return (
        <div className='invitations-page-main-container'>
            {contextHolder}
            <Layout style={{
                position: 'relative', width: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'flex-start', justifyContent: 'flex-start',
                backgroundColor: 'var(--ft-color)',
                maxWidth: '1480px',
                gap: '24px'
            }}>
                <HeaderBuild position={'admin'} />


                <UserPopUp />
                <div className='user-table-container'>
                    <Tabs
                        style={{ width: '100%', }}
                        type="card"
                        activeKey={activeKey}
                        onChange={setActiveKey}
                        items={items}
                        tabBarExtraContent={
                            <div className='title-new-user-container'>

                                <Input placeholder='Búscar...' value={filterName} onChange={(e) => setFilterName(e.target.value)} style={{ flex: 1, borderRadius: '99px', minWidth: '400px' }} />
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
                                    <Button type='primary' style={{ borderRadius: '99px' }} icon={<LuUserPlus size={16} />}>Nuevo usuario</Button>
                                </Dropdown>

                            </div>
                        }
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

            </Layout>


            <NewInvitationDrawer
                visible={onNewInvitation} setVisible={setOnNewInvitation} refreshInvitations={refreshData} user={user}
            />

        </div>

    )

}
