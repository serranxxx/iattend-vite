import { Button, Layout, Modal, message } from 'antd'
import React, { useEffect, useState } from 'react'
import './AdminPanel.css'
import { IoIosArrowDown } from 'react-icons/io'
import { supabase } from '../../lib/supabase'
import { CreateAccount } from '../../components/Auth/CreateUser'
import { QRHandler } from '../../components/QRHandler/QRHandler'
import { NewInvitationDrawer } from '../../components/Create/NewInvitationDrawer'
import { useInvitation } from '../../hooks/customHook'
import { getUSers } from '../../services/apiLogin'
import { getAllInvitations } from '../../services/apiInvitation'
import { MdEdit, MdOutlineContentCopy } from 'react-icons/md'
import { GrMoney } from 'react-icons/gr'
import { ImSwitch } from 'react-icons/im'
import { ShareGuests } from '../Extras/ShareGuests'
import { HeaderBuild } from '../../modules/Header/Header'
import { LuPlus } from 'react-icons/lu'


export const AdminPage = () => {


    // const userstest = [
    //     {
    //         name: 'Usuario 1',
    //         username: 'usuario1@test.com',
    //         items: [1, 2, 3, 1, 1],
    //         id: 1
    //     },
    //     {
    //         name: 'Usuario 2',
    //         username: 'usuario2@test.com',
    //         items: [1, 2, 3, 1, 1],
    //         id: 2
    //     },
    //     {
    //         name: 'Usuario 3',
    //         username: 'usuario3@test.com',
    //         items: [1, 2, 3, 1, 1],
    //         id: 3
    //     },
    //     {
    //         name: 'Usuario 4',
    //         username: 'usuario4@test.com',
    //         items: [1, 2, 3, 1, 1],
    //         id: 4
    //     },
    //     {
    //         name: 'Usuario 5',
    //         username: 'usuario5@test.com',
    //         items: [1, 2, 3, 1, 1],
    //         id: 5
    //     },
    //     {
    //         name: 'Usuario 6',
    //         username: 'usuario6@test.com',
    //         items: [1, 2, 3, 1, 1],
    //         id: 6
    //     },
    //     {
    //         name: 'Usuario 7',
    //         username: 'usuario7@test.com',
    //         items: [1, 2, 3, 1, 1],
    //         id: 7
    //     },
    //     {
    //         name: 'Usuario 8',
    //         username: 'usuario8@test.com',
    //         items: [1, 2, 3, 1, 1],
    //         id: 8
    //     },
    //     {
    //         name: 'Usuario 9',
    //         username: 'usuario9@test.com',
    //         items: [1, 2, 3, 1, 1],
    //         id: 9
    //     },
    //     {
    //         name: 'Usuario 10',
    //         username: 'usuario10@test.com',
    //         items: [1, 2, 3, 1, 1],
    //         id: 10
    //     },
    //     {
    //         name: 'Usuario 11',
    //         username: 'usuario11@test.com',
    //         items: [1, 2, 3, 1, 1],
    //         id: 11
    //     },
    //     {
    //         name: 'Usuario 12',
    //         username: 'usuario12@test.com',
    //         items: [1, 2, 3, 1, 1],
    //         id: 12
    //     },
    //     {
    //         name: 'Usuario 13',
    //         username: 'usuario13@test.com',
    //         items: [1, 2, 3, 1, 1],
    //         id: 13
    //     },
    //     {
    //         name: 'Usuario 14',
    //         username: 'usuario14@test.com',
    //         items: [1, 2, 3, 1, 1],
    //         id: 14
    //     },
    //     {
    //         name: 'Usuario 15',
    //         username: 'usuario15@test.com',
    //         items: [1, 2, 3, 1, 1],
    //         id: 15
    //     }

    // ]

    const { response, operation } = useInvitation()

    const [currentUser, setCurrentUser] = useState(null)
    const [users, setUsers] = useState([])
    const [invitations, setInvitations] = useState([])
    const [mode, setMode] = useState('my-invitations')
    const [currentInvitation] = useState(null)
    // const [saved, setSaved] = useState(true)
    const [visible, setVisible] = useState(false)
    // const [content, setContent] = useState(null)
    // const [generals, setGenerals] = useState(null)
    // const [label, setLabel] = useState(null)
    // const [onQR, setOnQR] = useState(false)
    const [visibleShare, setVisibleShare] = useState(false)
    // const [invitation, setinvitation] = useState(null)
    const [onNewInvitation, setOnNewInvitation] = useState(false)
    const [user, setUser] = useState(null)
    const [newInvitations, setNewInvitations] = useState(null)
    const [newProfiles, setNewProfiles] = useState(null)

    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success('Copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const onEditInvitation = (id) => {
        // setCurrentInvitation(id)
        setMode('on-edit')
    }

    useEffect(() => {
        getUSers(operation)
        getAllInvitations(operation)
        getNewInvitations()
        getNewUsers()
    }, [])



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

        if (response) {

            if (response.data.ok) {
                switch (response.data.msg) {
                    case "Get all Users":
                        setUsers(response.data.data.Userlist)

                        break;

                    case "Get all invitations":
                        setInvitations(response.data.data)
                        break;

                    case "Invitation updated":
                        message.success("Invitación actualizada")
                        refreshData()
                        break;

                    // case "Get invitation By Id":
                    //     const inv = response.data.data
                    //     setContent(inv.cover)
                    //     setGenerals(inv.generals)
                    //     setLabel(inv.label)
                    //     setinvitation(inv)
                    //     setVisibleShare(true)
                    //     setOnQR(false)

                    //     break;

                    default:
                        break;
                }



            }
        }

    }, [response])

    const editState = async (inv) => {

        const { error } = await supabase
            .from('invitations')
            .update({ active: !inv.active })
            .eq("mongo_id", inv.mongo_id)

        if (error) {
            console.error('Error actualizando:', error)
        } else {
            message.success('Estado actualizado')
            refreshData()
        }
    }

    const paymentLock = async (id) => {

        const { error } = await supabase
            .from('invitations')
            .update({ payment_type: 'false' })
            .eq("mongo_id", id)

        if (error) {
            console.error('Error actualizando:', error)
        } else {
            message.success('Metodo de pago actualizado')
            refreshData()
        }

    }

    const paymentUnlock = async (id) => {

        const { error } = await supabase
            .from('invitations')
            .update({ payment_type: null })
            .eq("mongo_id", id)

        if (error) {
            console.error('Error actualizando:', error)
        } else {
            message.success('Metodo de pago actualizado')
            refreshData()
        }
    }


    const refreshData = () => {
        getUSers(operation)
        getAllInvitations(operation)
        getNewInvitations()
        getNewUsers()
    }

    const handleNewInvitation = (user_id, user_email) => {
        setUser({
            id: user_id,
            email: user_email
        })
        setOnNewInvitation(true)
    }


    return (
        <>
            {
                mode === 'my-invitations' ?
                    <Layout >
                        <HeaderBuild position={'admin'} />

                        <Layout className='admin-panel-layout' style={{
                            // paddingBottom: '30px',
                            // marginTop: '80px'
                        }} >
                            <div className='user-table-container'>
                                <div className='title-new-user-container'>
                                    <span className='admin-head-text'>Lista de usuarios ({users?.length})</span>
                                    <Button icon={<LuPlus />} onClick={() => setVisible(true)}></Button>
                                </div>

                                <div className='admin-table-background'>
                                    <div className='admin-table-header-container'>
                                        <div className='admin-table-header-item' style={{
                                            flex: 2
                                        }}>
                                            <span style={{
                                                width: '80%', textAlign: 'left'
                                            }}>Nombre</span>
                                        </div>
                                        <div className='admin-table-header-item' style={{
                                            flex: 2
                                        }}>
                                            <span style={{
                                                width: '80%', textAlign: 'left'
                                            }}>Email</span>
                                        </div>
                                        <div className='admin-table-header-item' >
                                            <span style={{
                                                width: '80%', textAlign: 'left'
                                            }}>Invitaciones ({newInvitations?.length})</span>
                                        </div>
                                        <div className='admin-table-header-item'>

                                        </div>
                                    </div>
                                    <div className='admin-table-content-container'>
                                        {
                                            newProfiles?.map((user, index) => (
                                                <div key={index} className={`admin-subtable-cont ${currentUser === user.user_email && 'admin-table-active'}`} style={{
                                                }}>
                                                    <div className={`admin-table-content-row`} style={{
                                                        // backgroundColor: currentUser === user.Name && '#E7E7E6'
                                                    }}>
                                                        <Button
                                                        onClick={() => handleNewInvitation(user.user_id, user.user_email)}
                                                        icon={<LuPlus />}
                                                        >

                                                        </Button>
                                                        
                                                        <div className='admin-table-content' style={{
                                                            flex: 2
                                                        }} >
                                                            <span style={{
                                                                width: '80%', textAlign: 'left'
                                                            }}>{user.full_name}</span>

                                                        </div>
                                                        <div className='admin-table-content' style={{
                                                            flex: 2
                                                        }}>
                                                            <span style={{
                                                                width: '80%', textAlign: 'left'
                                                            }}>{user.user_email.slice(0, 22)}</span>

                                                            <Button
                                                                type='ghost'
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                }}
                                                                icon={<MdOutlineContentCopy size={15} />} onClick={() => copyToClipboard(user.user_email)} />
                                                        </div>
                                                        <div className='admin-table-content'>
                                                            {/* <span style={{
                                                                width: '80%', textAlign: 'center'
                                                            }}>{user.Invitations.length}</span> */}
                                                        </div>
                                                        <div className='admin-table-content'>
                                                            <Button
                                                                type='ghost'
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    borderRadius: '50%'
                                                                }}
                                                                icon={<IoIosArrowDown size={18} style={{
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
                                                                    Mongo Id
                                                                </div>
                                                                <div className='admin-table-sub-header-item'>
                                                                    Ruta
                                                                </div>
                                                                <div className='admin-table-sub-header-item'>
                                                                    Etiqueta
                                                                </div>
                                                                <div className='admin-table-sub-header-item'>
                                                                    Vigencia
                                                                </div>
                                                                {/* <div className='admin-table-sub-header-item'>
                                                        Vigencia
                                                    </div> */}
                                                                <div className='admin-table-sub-header-item'>
                                                                    Pago
                                                                </div>
                                                                <div className='admin-table-sub-header-item'>
                                                                    Estado
                                                                </div>
                                                                <div className='admin-table-sub-header-item'>
                                                                    Acciones
                                                                </div>
                                                            </div>
                                                            <div className='admin-table-content-current'>


                                                                {
                                                                    newInvitations
                                                                        .filter(inv => inv.user_id === user.user_id)
                                                                        .sort((a, b) => a.name.localeCompare(b.name)) // <-- ordena por nombre
                                                                        .map(inv => (
                                                                            <div className={`admin-subtable-cont`}>
                                                                                <div className={`admin-table-content-row`} >
                                                                                    <div className='admin-table-content-subt' style={{ flex: 2 }}>
                                                                                        {inv.mongo_id}
                                                                                        <Button
                                                                                            type='ghost'
                                                                                            style={{
                                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                                            }}
                                                                                            icon={<MdOutlineContentCopy size={15} />} onClick={() => copyToClipboard(inv._id)} />
                                                                                    </div>
                                                                                    <div className='admin-table-content-subt' >
                                                                                        {inv.name}
                                                                                    </div>
                                                                                    <div className='admin-table-content-subt' >
                                                                                        {inv.label}
                                                                                    </div>
                                                                                    <div className='admin-table-content-subt' >
                                                                                        {/* {formatDateShorter(inv.due_date)} */}
                                                                                    </div>
                                                                                    <div className='admin-table-content-subt' >
                                                                                        <Button
                                                                                            style={{
                                                                                                backgroundColor: inv.payment_type !== 'false' ? '#ECF7EF' : '#F1F1F1',
                                                                                                color: inv.payment_type !== 'false' ? '#61AD8C' : '#C1C1C1',
                                                                                                border: 'none'
                                                                                            }}
                                                                                            onClick={inv.payment_type === 'false' ? () => paymentUnlock(inv.mongo_id) : () => paymentLock(inv.mongo_id)}
                                                                                            icon={<GrMoney />} />
                                                                                        {/* {inv.payment} */}
                                                                                    </div>
                                                                                    <div className='admin-table-content-subt' >

                                                                                        <Button
                                                                                            onClick={() => editState(inv)}
                                                                                            icon={<ImSwitch />} style={{
                                                                                                backgroundColor: inv.active ? '#ECF7EF' : '#F1F1F1',
                                                                                                color: inv.active ? '#61AD8C' : '#C1C1C1',
                                                                                                border: 'none',
                                                                                            }} />

                                                                                    </div>
                                                                                    <div className='admin-table-content-subt' >
                                                                                        <Button onClick={() => onEditInvitation(inv.mongo_id)} icon={<MdEdit />} />

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

                            {/* <div className='admin-invitations-container'>
                                <div className='title-new-user-container' style={{ width: '90%' }}>
                                    <span className='admin-head-text'>Novedades</span>
                                    <Button
                                        type='ghost'
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }} icon={<IoClose size={20} />} />
                                </div>

                                <div className='title-new-user-container' style={{ width: '90%' }}>
                                    <span className='admin-head-text' style={{ fontWeight: 500 }}>Invitaciones nuevas ({invitations.filter((inv) => inv.active === false).length})</span>
                                </div>
                                <div className='new-invitations-container'>
                                    {
                                        invitations.filter((inv) => inv.active === false).map((inv) => (
                                            <div className='admin-card-invitation'>
                                                <span><b>Usuario: </b>{getUserName(inv)}</span>
                                                <span><b>Creación: </b>{formatDateShorter(inv.creation_date)}</span>
                                                <span><b>Ruta: </b>{inv.generals.eventName}</span>
                                                <span><b>Comprobante: </b>null</span>

                                                <Button
                                                    onClick={() => editState(inv._id)}
                                                    id='save-tickets-button'
                                                    style={{
                                                        position: 'absolute', right: '15px', bottom: '15px'
                                                    }}>Acitvar</Button>

                                            </div>
                                        ))
                                    }

                                </div>

                                <div className='title-new-user-container' style={{ width: '90%', marginTop: '20px' }}>
                                    <span className='admin-head-text' style={{ fontWeight: 500 }}>Invitaciones por vencer</span>
                                </div>
                                <div className='new-invitations-container'>
                                    {
                                        invitations.filter((inv) => inv.active === true).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).map((inv) => (
                                            <div className='admin-card-invitation'>
                                                <span><b>Usuario: </b>{getUserName(inv)}</span>
                                                <span><b>Vigencia: </b>{formatDateShorter(inv.due_date)}</span>
                                                <span><b>Ruta: </b>{inv.generals.eventName}</span>


                                                <Button
                                                    onClick={() => editState(inv._id)}
                                                    id='save-tickets-button'
                                                    style={{
                                                        position: 'absolute', right: '15px', bottom: '15px'
                                                    }}>Desactivar</Button>

                                            </div>
                                        ))
                                    }
                                </div>

                            </div> */}
                        </Layout>

                        <Modal
                            // centered // Esta propiedad centra el modal verticalmente
                            footer={null} // Elimina el footer si no necesitas botones adicionales
                            open={visible}
                            onOk={() => setVisible(false)}
                            onCancel={() => setVisible(false)}
                            title="Crear usuario"

                        >
                            <div style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                paddingBottom: '40px'
                            }}>
                                <CreateAccount refreshData={refreshData} setVisible={setVisible} />
                            </div>

                        </Modal>

                    </Layout>
                    : mode === 'on-edit' ?
                        <ShareGuests invitation_id={currentInvitation} admin={true} />
                        : <></>

            }


            {
                currentInvitation && (
                    <QRHandler visible={visibleShare} setVisible={setVisibleShare} mongoID={currentInvitation} />
                )
            }

            <NewInvitationDrawer
                visible={onNewInvitation} setVisible={setOnNewInvitation} refreshInvitations={refreshInvitations} user={user}
            />

        </>

    )

}
