import React, { useContext, useEffect, useState } from 'react'
import './user-popup.css'
import { LuCircleUser, LuLogOut } from 'react-icons/lu'
import { appContext } from '../../context';
import { Button } from 'antd';
import { supabase } from '../../lib/supabase';
import { NewInvitationDrawer } from '../Create/NewInvitationDrawer';
import { FaPlus } from 'react-icons/fa6';

export default function UserPopUp() {

    const [open, setOpen] = useState(false)
    const session = JSON.parse(localStorage.getItem("session"));

    const [totalEvents, setTotalEvents] = useState(null)
    const [totalConfirmed, setTotalConfirmed] = useState(null)
    const [visible, setVisible] = useState(false)
    const { logout, } = useContext(appContext)

    const getEvents = async () => {

        if (session.user.uid) {

            try {
                const { data, error } = await supabase
                    .rpc('get_total_invitations_by_user', {
                        p_user_id: session.user.uid
                    });

                if (error) {
                    console.log(error)
                    return
                }

                setTotalEvents(data)
            } catch (error) {
                console.log(error)
            }


        }

    }

    const getConfirmed = async () => {

        if (session.user.uid) {

            try {
                const { data, error } = await supabase.rpc(
                    'get_confirmed_guests_count_by_user',
                    { p_user_id: session.user.uid }
                );


                if (error) {
                    console.log(error)
                    return
                }

                setTotalConfirmed(data)
            } catch (error) {
                console.log(error)
            }


        }

    }

    useEffect(() => {
        if (open) {
            getEvents()
            getConfirmed()
        }
    }, [open])


    return (
        <>
            {
                session?.logged ?
                    <div onClick={() => setOpen(!open)} className={`user_modal ${open ? 'user_open' : ''}`}>
                        {
                            open ?
                                <>
                                    <div className='user_row' style={{ alignItems: 'flex-start' }}>
                                        <img src='/images/user_icon.png' alt='' style={{ width: '80px', height: '80px', boxShadow: '0px 0px 8px rgba(0,0,0,0.2)', borderRadius: '99px' }} />
                                        <Button onClick={logout} icon={<LuLogOut />} style={{
                                            borderRadius: '99px', backgroundColor: '#FFFFFF10'
                                        }}>Cerrar sesión</Button>
                                    </div>

                                    <div className='user_col'>
                                        <span className='user_name'>{session?.user?.name}</span>
                                        <span className='user_email'>{session?.user?.email}</span>
                                    </div>

                                    <div className='user_row'>
                                        <div className='user_col'>
                                            <span >Eventos creados</span>
                                            <span className='stat_label'>{totalEvents ?? 'Cargando ...'}</span>
                                        </div>

                                        <div className='border_r' />

                                        <div className='user_col'>
                                            <span >Invitados confirmados</span>
                                            <span className='stat_label'>{totalConfirmed ?? 'Cargando ...'}</span>
                                        </div>


                                    </div>

                                    {/* <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setVisible(true);
                                        }}
                                        className='liquid-btn_user'
                                    >
                                        <FaPlus />
                                        Nuevo evento
                                    </button> */}
                                </>
                                :
                                <>
                                    <div className='user_letter'>A</div>
                                    {session?.user?.name?.split(' ')[0]}
                                </>
                        }
                    </div>
                    : <></>
            }

            <NewInvitationDrawer visible={visible} setVisible={setVisible} user={{ user_id: session?.user?.uid, user_email: session?.user?.email }} refreshInvitations={() => { }} />
        </>
    )
}
