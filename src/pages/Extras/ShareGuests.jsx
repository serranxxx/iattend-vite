import { Button, Input, Layout } from 'antd'
import React, { useEffect, useState } from 'react'
import { FaLock } from 'react-icons/fa'
import { DashboardPage } from '../Dashboard/DashboardPage'
import { supabase } from '../../lib/supabase'
import { QRHandler } from '../../components/QRHandler/QRHandler'
import GuestsPage from '../../modules/GuestManagement/GuestsPage'
import { BuildPage } from '../../modules/Invitation/Build/PageSections/BuildPage'


export const ShareGuests = ({ invitation_id, admin }) => {

    const [mode, setMode] = useState('on-dashboard')
    const [validated, setValidated] = useState(false)
    const [access, setAccess] = useState(null)
    const [usuario, setUsuario] = useState(null)
    const [saved, setSaved] = useState(true)

    const [onQR, setOnQR] = useState(false)
    const [visible, setVisible] = useState(false)
    const [supaInv, setSupaInv] = useState(null)
    const [mongoID, setMongoID] = useState(null)
    const [invitationID, setInvitationID] = useState(null)




    useEffect(() => {
        if (mode === 'on-guests') {
            setSaved(true)
        }
    }, [mode])

    useEffect(() => {
        if (onQR) {
            setVisible(true)
        } else {
            setVisible(false)
        }
    }, [onQR])


    const getNewInvitations = async (invitation_id) => {

        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
            console.error("Error al obtener la sesión");
            // setonSession(false)
            return;
        }

        // setonSession(true)
        const { data, error } = await supabase
            .from("invitations")
            .select("data, id")
            // .eq("user_id", session.user.id)
            .eq("mongo_id", invitation_id)
            .maybeSingle();

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            console.log('data / sharegues invitation: ', data)
            setSupaInv(data?.data)
            setInvitationID(data.id)
        }

    };


    useEffect(() => {
        setMongoID(invitation_id)
        if (invitation_id) {
            getNewInvitations(invitation_id)
        }
        setOnQR(false)
    }, [invitation_id])


    const handleModule = (type) => {

        if (mongoID && supaInv) {
            switch (type) {

                case 'on-dashboard':
                    return <DashboardPage shared_user={usuario} supaInv={supaInv} mode={mode} setMode={setMode} setOnQR={setOnQR} mongoID={mongoID} />

                case 'on-edit':
                    return <BuildPage shared_user={usuario} mongoID={mongoID} setOnQR={setOnQR} mode={mode} setMode={setMode} saved={saved} setSaved={setSaved} />

                // case 'on-dashboard-guests':
                //     return <GuestsDashboard shared_user={usuario} mongoID={mongoID} setOnQR={setOnQR} />

                case 'on-dashboard-guests':
                    return <GuestsPage invitationID={invitationID} mongoID={mongoID} invitation={supaInv} mode={mode} setMode={setMode} setOnQR={setOnQR} />

                default:
                    return <DashboardPage shared_user={usuario} supaInv={supaInv} mode={mode} setMode={setMode} setOnQR={setOnQR} mongoID={mongoID} />
            }
        }

    }

    // const [mode, setMode] = useState()

    return (


        <>
            {
                !validated && !admin ?
                    <Layout style={{
                        width: '100%', height: '100vh'
                    }}>
                        <div className='locked-invitation-background'>
                            <div className='locked-invitation-container'>
                                <div className='locked-icon-container'>
                                    <FaLock />
                                </div>
                                <h1 className='locked-page-title'>Acceso a Panel de Administración de Invitaciones</h1>
                                <h2 className='locked-page-text'>Para acceder al panel de respuestas, ingrese su usuario y contraseña. Esto mantiene la seguridad y privacidad del evento. </h2>
                                <Input
                                    value={access}
                                    onChange={(e) => setAccess(e.target.value)}
                                    placeholder='Código de acceso' className='locked-input' />
                                <Button
                                    id="locked-access-button" >Continuar</Button>
                            </div>


                        </div>
                    </Layout>
                    :

                    handleModule(mode)

            }

            {
                mongoID && (
                    <QRHandler visible={visible} setVisible={setVisible} mongoID={mongoID} />
                )
            }
        </>

    )
}
