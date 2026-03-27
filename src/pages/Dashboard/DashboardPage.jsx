import React, { useEffect, useState } from 'react'
import './dashboard.css'
import { Button } from 'antd'
import { FooterApp } from '../../modules/Footer/FooterApp'
import { Pie } from 'react-chartjs-2'
import { IoChevronForward } from 'react-icons/io5'
import { LuCalendar, LuCalendarCheck2, LuCalendarClock } from "react-icons/lu";
import { supabase } from '../../lib/supabase'
import { Grid } from "antd";
import { HeaderDashboard } from '../../modules/Header/Header'
import { load } from '../../helpers/assets/images'
import { useNavigate, useSearchParams } from 'react-router-dom'

const { useBreakpoint } = Grid;


export const DashboardPage = () => {


    const [confirmed, setConfirmed] = useState(0)
    const [waiting, setWaiting] = useState(0)
    const [available, setAvailable] = useState(0)
    const [invitation, setInvitation] = useState(null)
    const [plan, setPlan] = useState(null)
    const screens = useBreakpoint();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const id = searchParams.get("id");

    const chartData = {
        labels: ['Confirmados', 'En espera', 'Disponibles'],
        datasets: [
            {
                // label: '# of Votes',
                // data: [55, 121, 8],
                data: [confirmed, waiting, available],
                backgroundColor: [
                    '#B4A5CC',
                    '#978BAB',
                    '#CCC2DC',
                ],
                borderColor: 'transparent',
                borderWidth: 2,
            },
        ],
    };

    const options = {
        plugins: {
            legend: {
                display: false, // Ocultar la leyenda
            },
        },
    };

    const getData = async (invitation_id) => {

        // 1️⃣ Obtener invitación
        const { data: invitation, error } = await supabase
            .from("invitations")
            .select("tickets, plan, data")
            .eq("id", invitation_id)
            .single();

        if (error || !invitation) {
            console.error("Error al obtener invitación:", error);
            return;
        }

        setPlan(invitation?.plan)
        setInvitation(invitation?.data);

        // 2️⃣ Obtener invitados
        const { data: guests, error: guestsError } = await supabase
            .from("guests")
            .select("*")
            .eq("invitation_id", invitation_id);

        if (guestsError) {
            console.error("Error al obtener invitados:", guestsError);
            return;
        }
        // 3️⃣ Filtrar estados
        const conf = guests.filter(g => g.state === "confirmado").length;
        const wait = guests.filter(g => g.state === "esperando").length;

        setAvailable(invitation.tickets - (conf + wait))
        setConfirmed(conf);
        setWaiting(wait);
    };

    useEffect(() => {
        if (id) {
            getData(id)
        } else {
            navigate("/invitations");
        }
    }, [id]);

    const handleMoode = (path) => {
        const params = new URLSearchParams({ id });
        navigate(`/dashboard/${path}/?${params.toString()}`);
    };


    return (

        invitation && plan ?
            <div className='dashboard-page-container' style={{ overflow: 'hidden' }}>

                <HeaderDashboard mode={'dashboard'} invitation={invitation} />

                <img src='/images/loop2.svg' alt='' className='loop_1' />
                <img src='/images/loop2.svg' alt='' className='loop_1_1' />
                <div className='dashboard_body'>


                    <div className='single_row' style={{
                        flexDirection: screens.xs ? 'column' : 'row',
                        justifyContent: 'center', gap: '24px',
                        // maxWidth: '50%', alignItems:'flex-start'
                    }}>


                        <div className='dashboard_invitation' style={{
                            maxHeight: screens.xs ? '180px' : undefined
                        }}>
                            <div className='invitation_header_dash'>
                                <span style={{ fontWeight: 600 }}>Paperless</span>
                                <Button onClick={() => handleMoode('build')} type='primary' style={{ borderRadius: '99px' }} icon={<IoChevronForward />}></Button>
                            </div>

                            <div className="dash_inv_cont">
                                <img src={invitation.cover.image.prod} alt='' style={{ objectFit: 'cover', width: '100%', height: '100%', opacity: '0.8', backdropFilter: 'blur(10px)' }} />
                            </div>
                        </div>

                        {
                            plan !== 'paperless' &&
                            <div className='single_col' style={{
                                gap: '24px', alignSelf: 'auto'
                            }}>

                                <div className='dashboard_guests' style={{
                                    maxHeight: screens.xs ? '300px' : undefined,
                                    width: screens.xs ? '320px' : undefined,
                                }}>
                                    <div className='invitation_header_dash'>
                                        <span style={{ fontWeight: 600 }}>Guest management</span>
                                        <Button onClick={() => handleMoode('guests')} type='primary' style={{ borderRadius: '99px' }} icon={<IoChevronForward />}></Button>
                                    </div>

                                    <div className='guests_dash_cont'>
                                        <div className='guest_dash_row'>

                                            {
                                                !screens.xs &&
                                                <div style={{ width: '160px', height: '160px' }}>
                                                    <Pie data={chartData} options={options} />
                                                </div>
                                            }

                                            <div className='two_col_grid'>
                                                <div className='dash_col'>
                                                    <span style={{ opacity: '0.4' }}>Confirmados</span>
                                                    <div className='dash_row'>
                                                        <span style={{ fontSize: '42px', lineHeight: '1', fontWeight: 600 }}>{confirmed}</span>
                                                        <LuCalendarCheck2 size={28} style={{ color: '#BFBFBF' }} />
                                                    </div>
                                                </div>

                                                <div className='dash_col'>
                                                    <span style={{ opacity: '0.4' }}>Esperando</span>
                                                    <div className='dash_row'>
                                                        <span style={{ fontSize: '42px', lineHeight: '1', fontWeight: 600 }}>{waiting}</span>
                                                        <LuCalendarClock size={28} style={{ color: '#BFBFBF' }} />
                                                    </div>
                                                </div>

                                                <div className='dash_col'>
                                                    <span style={{ opacity: '0.4' }}>Disponible</span>
                                                    <div className='dash_row'>
                                                        <span style={{ fontSize: '42px', lineHeight: '1', fontWeight: 600 }}>{available}</span>
                                                        <LuCalendar size={28} style={{ color: '#BFBFBF' }} />
                                                    </div>
                                                </div>
                                            </div>




                                        </div>
                                    </div>
                                </div>


                                <div className='side_events_dash' style={{
                                    maxWidth: '460px',
                                    // maxHeight: screens.xs ? '180px' : undefined
                                }}>
                                    <div className='invitation_header_dash'>
                                        <span style={{ fontWeight: 600 }}>Side events</span>
                                        <Button onClick={() => handleMoode('side')} type='primary' style={{ borderRadius: '99px' }} icon={<IoChevronForward />}></Button>
                                    </div>
                                    <div className="guests_dash_cont" style={{ minHeight: '80px', display:'flex',alignItems:'center',justifyContent:'center', padding:'0'}}>
                                        <img src='/images/icons_side_events.png' style={{ width: '90%', }} />
                                    </div>
                                </div>

                            </div>
                        }




                    </div>





                </div>

                <FooterApp ></FooterApp>
            </div>
            :

            <div className='build-loading-container'>
                <img alt='' src={load} style={{
                    width: '200px'
                }} />
            </div>

    )
}
