import { Button, Dropdown, Input, InputNumber, Layout, Modal, Space, Table, Tabs, message } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import './AdminPanel.css'
import { supabase } from '../../lib/supabase'
import { CreateAccount } from '../../components/Auth/CreateUser'
import { NewInvitationDrawer } from '../../components/Create/NewInvitationDrawer'
import { HeaderBuild } from '../../modules/Header/Header'
import { LuArrowUpFromLine, LuArrowUpRight, LuChevronDown, LuCopy, LuLink, LuPlus, LuPower, LuPowerOff, LuUserPlus } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import axios from 'axios'


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
            .rpc('get_upcoming_with_user');

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


    // const updateInvitationActive = async (inv) => {

    //     try {
    //         await axios.patch(
    //             `${import.meta.env.VITE_API_URL}/api/invitation/update-active`,
    //             // 'http://localhost:4000/api/invitation/update-active',
    //             { id: inv.id, active: !inv.active }
    //         );

    //         messageApi.success('Editado con éxito')
    //         refreshData()

    //     } catch (error) {
    //         console.error('Error updating active:', error.response?.data || error.message);
    //         throw error;
    //     }
    // };

    const refreshData = () => {
        getNewInvitations()
        getNewUsers()
        getInvitationsByDate()
    }

    const handleNewInvitation = (user) => {
        setUser(user)
        setOnNewInvitation(true)
    }

    const nextEventsCols = [
        {
            title: 'Nombre',
            dataIndex: 'full_name',
            key: 'name',
            //   render: text => <a>{text}</a>,
        },
        {
            title: 'Usuario',
            dataIndex: 'user_email',
            key: 'email',

        },
        {
            title: 'ID',
            dataIndex: 'invitation_id',
            key: 'address',
            // render: (_, record) => (
            //     <a target='_blank' href={`www.iattend.events/${record?.data?.generals?.event?.label}/${record?.data?.generals?.event?.name}`}>www.iattend.events/{record?.data?.generals?.event?.label}/{record?.data?.generals?.event?.name}</a>
            // )
        },
        {
            title: 'Plan',
            dataIndex: 'plan',
            key: 'address',
            render: text => <img src={`/images/plan_${text}.png`} style={{ height: '30px', borderRadius: '8px' }} alt='' />,
        },
        {
            title: 'Créditos',
            dataIndex: 'credits',
            key: 'address',
            render: (text, record) => (
                <div className='admin-table-content-subt' style={{ maxWidth: '160px' }}>

                    <InputNumber value={text} onChange={(e) => setActualCredits(e)} />
                    <Button style={{ marginLeft: '6px' }} onClick={() => updateInvitationCredits(record.invitation_id)} icon={<LuArrowUpFromLine />} />

                </div>
            )
        },
        {
            title: 'Fecha del evento',
            dataIndex: 'cover_date',
            key: 'address',
            render: text => <span>{text.slice(0, 10)}</span>,
        },
        {
            title: 'Acciones',
            dataIndex: '',
            key: 'address',
            render: (_, record) => (

                // <Link target='_blank' to={`https://www.iattend.site/dashboard?id=${record.invitation_id}`}>
                //     <Button icon={<LuArrowUpRight />} />
                // </Link>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Link target='_blank' to={`https://www.iattend.events/${record?.data?.generals?.event?.label}/${record?.data?.generals?.event?.name}`}>
                        <Button icon={<LuLink />} >Link</Button>
                    </Link>
                    <Link target='_blank' to={`https://www.iattend.site/dashboard?id=${record?.invitation_id}`}>
                        <Button icon={<LuArrowUpRight />} >Abrir</Button>
                    </Link>

                </div>
            )
        },

    ];

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
            title: 'ID',
            dataIndex: 'id',
            key: 'address',
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
            title: 'Fecha',
            dataIndex: 'cover_date',
            key: 'address',
            render: (text, record) => <span>{record?.data?.cover?.date.value?.slice(0, 10)}</span>,
        },
        {
            title: 'Acciones',
            dataIndex: '',
            key: 'address',
            render: (_, record) => (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Link target='_blank' to={`https://www.iattend.events/${record?.data?.generals?.event?.label}/${record?.data?.generals?.event?.name}`}>
                        <Button icon={<LuLink />} >Link</Button>
                    </Link>
                    <Link target='_blank' to={`https://www.iattend.site/dashboard?id=${record?.id}`}>
                        <Button icon={<LuArrowUpRight />} >Abrir</Button>
                    </Link>

                </div>
            )
        },

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
                <Table columns={nextEventsCols} dataSource={
                    nextEvents.filter(i => {
                        if (filterName) {
                            return (
                                i?.full_name?.toLowerCase().includes(filterName?.toLowerCase())
                            )
                        }
                        else return true
                    })} pagination={false} />
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

                // <div className='admin-table-background'>
                //     <div className='admin-table-header-container'>
                //         <div className='admin-table-header-item' style={{ maxWidth: '40px' }}>

                //         </div>
                //         <div className='admin-table-header-item' >
                //             <span >Nombre</span>
                //         </div>
                //         <div className='admin-table-header-item' style={{ flex: 2 }}>
                //             <span >Email</span>
                //         </div>
                //         <div className='admin-table-header-item' style={{ flex: 2 }}>
                //             <span >User ID</span>
                //         </div>
                //         <div className='admin-table-header-item' style={{ maxWidth: '40px' }}>

                //         </div>
                //     </div>
                //     <div className='admin-table-content-container'>
                //         {
                //             newProfiles?.filter(i => {
                //                 if (filterName) {
                //                     return (
                //                         i?.full_name?.toLowerCase().includes(filterName?.toLowerCase())
                //                     )
                //                 }

                //                 else return true

                //             }).map((user, index) => (
                //                 <div key={index} className={`admin-subtable-cont ${currentUser === user.user_email && 'admin-table-active'}`} style={{
                //                 }}>
                //                     <div className={`admin-table-content-row`} style={{
                //                     }}>
                //                         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, maxWidth: '60px' }}>
                //                             <Button
                //                                 className='primarybutton'
                //                                 onClick={() => handleNewInvitation(user)}
                //                                 icon={<LuPlus />}
                //                             >

                //                             </Button>
                //                         </div>

                //                         <div className='admin-table-content'  >
                //                             <span >{user.full_name}</span>

                //                         </div>
                //                         <div className='admin-table-content' style={{ flex: 2 }} >
                //                             <Button

                //                                 style={{
                //                                     marginRight: '6px'
                //                                 }}
                //                                 icon={<LuCopy size={16} />} onClick={() => copyToClipboard(user.user_email)} />
                //                             <span >{user.user_email}</span>


                //                         </div>
                //                         <div className='admin-table-content' style={{ flex: 2 }}>
                //                             <Button

                //                                 style={{
                //                                     marginRight: '6px'
                //                                 }}
                //                                 icon={<LuCopy size={16} />} onClick={() => copyToClipboard(user.user_id)} />
                //                             <span >{user.user_id}</span>
                //                         </div>
                //                         <div className='admin-table-content' style={{ maxWidth: '60px' }}>
                //                             <Button
                //                                 className={currentUser === user.user_email ? 'primarybutton--active' : 'primarybutton'}
                //                                 style={{
                //                                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                //                                     borderRadius: '50%'
                //                                 }}
                //                                 icon={<LuChevronDown size={16} style={{
                //                                     transform: currentUser === user.user_email ? 'rotate(180deg)' : 'rotate(0deg)',
                //                                     transition: 'all 0.3s ease',
                //                                 }} />}
                //                                 onClick={() => setCurrentUser(currentUser === user.user_email ? null : user.user_email)} />
                //                         </div>


                //                     </div>
                //                     {
                //                         currentUser === user.user_email &&
                //                         <>
                //                             <div className='admin-table-header-container' style={{ opacity: 0.7 }}>
                //                                 <div className='admin-table-sub-header-item' style={{ flex: 2 }}>
                //                                     Invitation Id
                //                                 </div>
                //                                 <div className='admin-table-sub-header-item' style={{ flex: 2 }}>
                //                                     URL
                //                                 </div>

                //                                 <div className='admin-table-sub-header-item' style={{ maxWidth: '120px' }}>
                //                                     Plan
                //                                 </div>
                //                                 <div className='admin-table-sub-header-item' style={{ maxWidth: '120px' }}>
                //                                     Estado
                //                                 </div>
                //                                 <div className='admin-table-sub-header-item' style={{ maxWidth: '160px' }}>
                //                                     Creditos
                //                                 </div>
                //                                 <div className='admin-table-sub-header-item' style={{ maxWidth: '60px' }}>

                //                                 </div>
                //                             </div>
                //                             <div className='admin-table-content-current'>


                //                                 {
                //                                     newInvitations
                //                                         .filter(inv => inv.user_id === user.user_id)
                //                                         .sort((a, b) => a.name.localeCompare(b.name)) // <-- ordena por nombre
                //                                         .map((inv, index_) => (
                //                                             <div key={index_} className={`admin-subtable-cont`}>
                //                                                 <div className={`admin-table-content-row`} >
                //                                                     <div className='admin-table-content-subt' style={{ flex: 2 }}>
                //                                                         <Button
                //                                                             style={{ marginRight: '8px' }}
                //                                                             icon={<LuCopy size={16} />} onClick={() => copyToClipboard(inv.id)} />
                //                                                         <span>{inv.id}</span>

                //                                                     </div>
                //                                                     <div className='admin-table-content-subt' style={{ flex: 2 }}>
                //                                                         <Link to={`https://www.iattend.events/${inv.label}/${inv.name}`} target='_blank'>
                //                                                             <Button
                //                                                                 style={{ marginRight: '8px' }}
                //                                                                 icon={<LuArrowUpRight size={16} />} />
                //                                                         </Link>
                //                                                         <span>{`/${inv.label}/${inv.name}`}</span>
                //                                                     </div>
                //                                                     <div className='admin-table-content-subt' style={{ maxWidth: '120px' }}>
                //                                                         <img src={`/images/plan_${inv.plan}.png`} alt='' style={{ height: '30px', boxShadow: '0px 0px 8px rgba(0,0,0,0.2)', borderRadius: '6px' }} />
                //                                                     </div>

                //                                                     <div className='admin-table-content-subt' style={{ maxWidth: '120px' }}>

                //                                                         <Button
                //                                                             onClick={() => updateInvitationActive(inv)}
                //                                                             icon={inv.active ? <LuPower size={14} /> : <LuPowerOff size={14} />} style={{
                //                                                                 backgroundColor: inv.active ? '#ECF7EF' : '#F1F1F1',
                //                                                                 color: inv.active ? '#61AD8C' : '#C1C1C1',
                //                                                                 border: 'none',
                //                                                             }}>{inv.active ? 'Activa' : 'Inactiva'}</Button>

                //                                                     </div>

                //                                                     <div className='admin-table-content-subt' style={{ maxWidth: '160px' }}>


                //                                                         <InputNumber value={inv.credits} onChange={(e) => setActualCredits(e)} />
                //                                                         <Button style={{ marginLeft: '6px' }} onClick={() => updateInvitationCredits(inv.id)} icon={<LuArrowUpFromLine />} />

                //                                                     </div>
                //                                                     <div className='admin-table-content-subt' style={{ maxWidth: '60px' }}>
                //                                                         <Link to={`https://www.iattend.site/dashboard?id=${inv.id}`} target='_blank'>
                //                                                             <Button className='primarybutton' icon={<LuArrowUpRight />}></Button>
                //                                                         </Link>

                //                                                     </div>


                //                                                 </div>
                //                                             </div>
                //                                         ))
                //                                 }

                //                             </div>
                //                         </>
                //                     }
                //                 </div>

                //             ))
                //         }


                //     </div>

                // </div>
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
                            ?.filter(i => i.user_email === 'albserrano8@gmail.com'|| i.user_email === 'pa.perez98@gmail.com' || i.user_email === 'pau@iattend.mx')
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


    ]), [filterName, nextEvents, actualCredits, newInvitations]);






    return (
        <>
            {contextHolder}
            <Layout >
                <HeaderBuild position={'admin'} />



                <div className='user-table-container'>


                    {/* <span className='admin-head-text'>Adminsitración de invtiaciones </span> */}

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

        </>

    )

}
