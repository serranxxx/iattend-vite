import { Button, Dropdown, Input, InputNumber, Layout, Modal, message } from 'antd'
import React, { useEffect, useState } from 'react'
import './AdminPanel.css'
import { supabase } from '../../lib/supabase'
import { CreateAccount } from '../../components/Auth/CreateUser'
import { NewInvitationDrawer } from '../../components/Create/NewInvitationDrawer'
import { useInvitation } from '../../hooks/customHook'
import { getUSers } from '../../services/apiLogin'
import { getAllInvitations } from '../../services/apiInvitation'
import { HeaderBuild } from '../../modules/Header/Header'
import { LuArrowUpFromLine, LuArrowUpRight, LuChevronDown, LuCopy, LuPlus, LuPower, LuPowerOff, LuUserPlus } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import axios from 'axios'


export const AdminPage = () => {


    const { operation } = useInvitation()

    const [currentUser, setCurrentUser] = useState(null)
    const [visible, setVisible] = useState(false)
    const [onNewInvitation, setOnNewInvitation] = useState(false)
    const [user, setUser] = useState(null)
    const [newInvitations, setNewInvitations] = useState(null)
    const [newProfiles, setNewProfiles] = useState(null)
    const [userData, setUserData] = useState(null)
    const [messageApi, contextHolder] = message.useMessage();
    const [filterName, setFilterName] = useState(null)
    const [actualCredits, setActualCredits] = useState(null)

    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            messageApi.success('Copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const refreshInvitations = () => {
        getUSers(operation)
        getAllInvitations(operation)
    }

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

    useEffect(() => {
        getUSers(operation)
        getAllInvitations(operation)
        getNewInvitations()
        getNewUsers()
    }, [])


    const updateInvitationCredits = async (inv) => {
        try {
             await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/invitation/update-credits`,
                // 'http://localhost:4000/api/invitation/update-credits',
                { id: inv.id, credits: actualCredits }
            );

            messageApi.success('Editado con éxito')
            refreshData()

        } catch (error) {
            console.error('Error updating credits:', error.response?.data || error.message);
            throw error;
        }
    };


    const updateInvitationActive = async (inv) => {

        try {
            await axios.patch(
                 `${import.meta.env.VITE_API_URL}/api/invitation/update-active`,
                // 'http://localhost:4000/api/invitation/update-active',
                { id: inv.id, active: !inv.active }
            );

            messageApi.success('Editado con éxito')
            refreshData()

        } catch (error) {
            console.error('Error updating active:', error.response?.data || error.message);
            throw error;
        }
    };

    const refreshData = () => {
        getUSers(operation)
        getAllInvitations(operation)
        getNewInvitations()
        getNewUsers()
    }

    const handleNewInvitation = (user) => {
        setUser(user)
        setOnNewInvitation(true)
    }




    return (
        <>
            {contextHolder}
            <Layout >
                <HeaderBuild position={'admin'} />

                <Layout className='admin-panel-layout' style={{
                }} >
                    <div className='user-table-container'>
                        <div className='title-new-user-container'>
                            <span className='admin-head-text'>{newProfiles?.length} usuarios / {newInvitations?.length} eventos</span>

                            <Input placeholder='Búscar...' value={filterName} onChange={(e) => setFilterName(e.target.value)} style={{ flex: 1, borderRadius: '99px' }} />
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
                                <Button style={{ borderRadius: '99px' }} icon={<LuUserPlus size={16} />}>Nuevo usuario</Button>
                            </Dropdown>

                        </div>

                        <div className='admin-table-background'>
                            <div className='admin-table-header-container'>
                                <div className='admin-table-header-item' style={{ maxWidth: '40px' }}>

                                </div>
                                <div className='admin-table-header-item' >
                                    <span >Nombre</span>
                                </div>
                                <div className='admin-table-header-item' style={{ flex: 2 }}>
                                    <span >Email</span>
                                </div>
                                <div className='admin-table-header-item' style={{ flex: 2 }}>
                                    <span >User ID</span>
                                </div>
                                <div className='admin-table-header-item' style={{ maxWidth: '40px' }}>

                                </div>
                            </div>
                            <div className='admin-table-content-container'>
                                {
                                    newProfiles?.filter(i => {
                                        if (filterName) {
                                            return (
                                                i?.full_name?.toLowerCase().includes(filterName?.toLowerCase())
                                            )
                                        }

                                        else return true

                                    }).map((user, index) => (
                                        <div key={index} className={`admin-subtable-cont ${currentUser === user.user_email && 'admin-table-active'}`} style={{
                                        }}>
                                            <div className={`admin-table-content-row`} style={{
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, maxWidth: '60px' }}>
                                                    <Button
                                                        className='primarybutton'
                                                        onClick={() => handleNewInvitation(user)}
                                                        icon={<LuPlus />}
                                                    >

                                                    </Button>
                                                </div>

                                                <div className='admin-table-content'  >
                                                    <span >{user.full_name}</span>

                                                </div>
                                                <div className='admin-table-content' style={{ flex: 2 }} >
                                                    <Button

                                                        style={{
                                                            marginRight: '6px'
                                                        }}
                                                        icon={<LuCopy size={16} />} onClick={() => copyToClipboard(user.user_email)} />
                                                    <span >{user.user_email}</span>


                                                </div>
                                                <div className='admin-table-content' style={{ flex: 2 }}>
                                                    <Button

                                                        style={{
                                                            marginRight: '6px'
                                                        }}
                                                        icon={<LuCopy size={16} />} onClick={() => copyToClipboard(user.user_id)} />
                                                    <span >{user.user_id}</span>
                                                </div>
                                                <div className='admin-table-content' style={{ maxWidth: '60px' }}>
                                                    <Button
                                                        className={currentUser === user.user_email ? 'primarybutton--active' : 'primarybutton'}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            borderRadius: '50%'
                                                        }}
                                                        icon={<LuChevronDown size={16} style={{
                                                            transform: currentUser === user.user_email ? 'rotate(180deg)' : 'rotate(0deg)',
                                                            transition: 'all 0.3s ease',
                                                        }} />}
                                                        onClick={() => setCurrentUser(currentUser === user.user_email ? null : user.user_email)} />
                                                </div>


                                            </div>
                                            {
                                                currentUser === user.user_email &&
                                                <>
                                                    <div className='admin-table-header-container' style={{ opacity: 0.7 }}>
                                                        <div className='admin-table-sub-header-item' style={{ flex: 2 }}>
                                                            Invitation Id
                                                        </div>
                                                        <div className='admin-table-sub-header-item' style={{ flex: 2 }}>
                                                            URL
                                                        </div>

                                                        <div className='admin-table-sub-header-item' style={{ maxWidth: '120px' }}>
                                                            Plan
                                                        </div>
                                                        <div className='admin-table-sub-header-item' style={{ maxWidth: '120px' }}>
                                                            Estado
                                                        </div>
                                                        <div className='admin-table-sub-header-item' style={{ maxWidth: '160px' }}>
                                                            Creditos
                                                        </div>
                                                        <div className='admin-table-sub-header-item' style={{ maxWidth: '60px' }}>

                                                        </div>
                                                    </div>
                                                    <div className='admin-table-content-current'>


                                                        {
                                                            newInvitations
                                                                .filter(inv => inv.user_id === user.user_id)
                                                                .sort((a, b) => a.name.localeCompare(b.name)) // <-- ordena por nombre
                                                                .map((inv, index_) => (
                                                                    <div key={index_} className={`admin-subtable-cont`}>
                                                                        <div className={`admin-table-content-row`} >
                                                                            <div className='admin-table-content-subt' style={{ flex: 2 }}>
                                                                                <Button
                                                                                    style={{ marginRight: '8px' }}
                                                                                    icon={<LuCopy size={16} />} onClick={() => copyToClipboard(inv.id)} />
                                                                                <span>{inv.id}</span>

                                                                            </div>
                                                                            <div className='admin-table-content-subt' style={{ flex: 2 }}>
                                                                                <Link to={`https://www.iattend.events/${inv.label}/${inv.name}`} target='_blank'>
                                                                                    <Button
                                                                                        style={{ marginRight: '8px' }}
                                                                                        icon={<LuArrowUpRight size={16} />} />
                                                                                </Link>
                                                                                <span>{`/${inv.label}/${inv.name}`}</span>
                                                                            </div>
                                                                            <div className='admin-table-content-subt' style={{ maxWidth: '120px' }}>
                                                                                <img src={`/images/plan_${inv.plan}.png`} alt='' style={{ height: '30px', boxShadow: '0px 0px 8px rgba(0,0,0,0.2)', borderRadius: '6px' }} />
                                                                            </div>

                                                                            <div className='admin-table-content-subt' style={{ maxWidth: '120px' }}>

                                                                                <Button
                                                                                    onClick={() => updateInvitationActive(inv)}
                                                                                    icon={inv.active ? <LuPower size={14} /> : <LuPowerOff size={14} />} style={{
                                                                                        backgroundColor: inv.active ? '#ECF7EF' : '#F1F1F1',
                                                                                        color: inv.active ? '#61AD8C' : '#C1C1C1',
                                                                                        border: 'none',
                                                                                    }}>{inv.active ? 'Activa' : 'Inactiva'}</Button>

                                                                            </div>

                                                                            <div className='admin-table-content-subt' style={{ maxWidth: '160px' }}>


                                                                                <InputNumber value={inv.credits} onChange={(e) => setActualCredits(e)} />
                                                                                <Button style={{ marginLeft: '6px' }} onClick={() => updateInvitationCredits(inv)} icon={<LuArrowUpFromLine />} />

                                                                            </div>
                                                                            <div className='admin-table-content-subt' style={{ maxWidth: '60px' }}>
                                                                                <Link to={`https://www.iattend.site/dashboard?id=${inv.id}`} target='_blank'>
                                                                                    <Button className='primarybutton' icon={<LuArrowUpRight />}></Button>
                                                                                </Link>

                                                                            </div>


                                                                        </div>
                                                                    </div>
                                                                ))
                                                        }

                                                    </div>
                                                </>
                                            }
                                        </div>

                                    ))
                                }


                            </div>

                        </div>

                    </div>
                </Layout>

                <Modal
                    // centered // Esta propiedad centra el modal verticalmente
                    footer={null} // Elimina el footer si no necesitas botones adicionales
                    open={visible && userData}
                    onOk={() => setVisible(false)}
                    onCancel={() => setVisible(false)}
                    title="Nuevo usuario agregado exitosamente"
                    width={400}
                    styles={{
                        content: {
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
                visible={onNewInvitation} setVisible={setOnNewInvitation} refreshInvitations={refreshInvitations} user={user}
            />

        </>

    )

}
