import React, { useEffect, useState } from 'react'
import './dashboard.css'
import { Button } from 'antd'
import { FooterApp } from '../../modules/Footer/FooterApp'
import { Pie } from 'react-chartjs-2'
import { IoChevronForward } from 'react-icons/io5'
import { LuCalendar, LuCalendarCheck2, LuCalendarClock } from "react-icons/lu";
import { supabase } from '../../lib/supabase'
import { Grid } from "antd";
import { HeaderMainDashboard } from '../../modules/Header/Header'
import { load } from '../../helpers/assets/images'

const { useBreakpoint } = Grid;


export const DashboardPage = ({ invitationID, supaInv, mode, setMode, shared_user }) => {


    const [confirmed, setConfirmed] = useState(0)
    const [waiting, setWaiting] = useState(0)
    const [available, setAvailable] = useState(0)
    const [plan, setPlan] = useState(null)
    const screens = useBreakpoint();

    const getGuests = async (invitation_id) => {

        // 1️⃣ Obtener invitación
        const { data: invitation, error } = await supabase
            .from("invitations")
            .select("id, tickets, plan")
            .eq("id", invitation_id)
            .single();

        if (error || !invitation) {
            console.error("Error al obtener invitación:", error);
            return;
        }

        setPlan(invitation?.plan)

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

    useEffect(() => {
        getGuests(invitationID)
    }, [invitationID])


    return (

        supaInv && plan ?
            <div className='dashboard-page-container'>
                <HeaderMainDashboard setMode={setMode} mode={mode} invitation={supaInv}  />
                <img src='/images/loop2.svg' alt='' className='loop_1' />
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
                                <Button onClick={() => setMode('on-edit')} type='primary' style={{ borderRadius: '99px' }} icon={<IoChevronForward />}></Button>
                            </div>

                            <div className="dash_inv_cont">
                                <img src={supaInv.cover.image.prod} alt='' style={{ objectFit: 'cover', width: '100%', height: '100%', opacity: '0.8', backdropFilter: 'blur(10px)' }} />
                            </div>
                        </div>

                        <div className='single_col' style={{
                           gap: '24px', alignSelf: 'auto'
                        }}>

                            <div className='dashboard_guests' style={{
                                maxHeight: screens.xs ? '300px' : undefined,
                                width: screens.xs ? '320px' : undefined,
                            }}>
                                <div className='invitation_header_dash'>
                                    <span style={{ fontWeight: 600 }}>Guest management</span>
                                    <Button onClick={() => setMode('on-dashboard-guests')} type='primary' style={{ borderRadius: '99px' }} icon={<IoChevronForward />}></Button>
                                </div>

                                <div className='guests_dash_cont'>
                                    <div className='guest_dash_row'>

                                        {
                                            !screens.xs &&
                                            <div style={{width:'160px', height:'160px'}}>
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

                            {
                                // user.role === 'Admin' &&
                                <div className='side_events_dash' style={{
                                    // maxHeight: screens.xs ? '180px' : undefined
                                }}>
                                    <div className='invitation_header_dash'>
                                        <span style={{ fontWeight: 600 }}>Side events</span>
                                        <Button onClick={() => setMode('side-events')} type='primary' style={{ borderRadius: '99px' }} icon={<IoChevronForward />}></Button>
                                    </div>
                                    <div className="guests_dash_cont" style={{ minHeight: '80px' }}>
                                        {/* <img alt='/images/loop2.svg' style={{ objectFit: 'cover', width: '100%', height: '100%'}} /> */}
                                    </div>
                                </div>
                            }
                        </div>


                    </div>





                </div>


                {/* <div className='dash-main-cont'>
                    <div className='dashboard-page-content'>
                        <div className='dsh-grid-1'>
                            <div className='dash-item dash-invitation'>
                                <div className='das-header-sect'>
                                    <span >Invitación digital</span>
                                    <Button
                                        style={{ minWidth: '30px' }}
                                        icon={<MdArrowForwardIos size={18} />}
                                        onClick={() => setMode('on-edit')} className='primarybutton--active'>

                                    </Button>
                                </div>
                                <img alt='' src={supaInv.cover.image.prod} />

                            </div>

                        </div>
                        <div className='dsh-grid-2'>

                            <div className='g--dash-item' style={{backgroundColor:'#F5F3F2'}} >
                                <div className='small-row--g'>
                                    <IoPeople size={24} style={{
                                        color: 'var(--brand-color-500)'
                                    }} />
                                    <span className='g--card-label'>Respuesta de invitados</span>
                                </div>

                                <span className='g--subtitle'>Gestiona y administra pases e invitados de manera eficiente</span>

                                <div className='g--item-row'>
                                    <span className='g--subtitle-bold'>Análisis de las respuestas</span>
                                    <span className='g--subtitle-regular'>22 Abril, 2025</span>
                                </div>

                                <div className='g--responses-cont'>
                                    <div className='g--item-col' style={{
                                        gap: '24px'
                                    }}>
                                        <div className='g--item-row' style={{
                                            padding: '0px', border: 'none', justifyContent: 'flex-start', gap: '24px'
                                        }}>
                                            <div className='g--item-col'>
                                                <span className='g--subtitle'>Confirmados</span>
                                                <div className='small-row--g'>
                                                    <span className='g--card-label' style={{
                                                        fontSize: '42px', lineHeight: '1', fontWeight: 600
                                                    }}>{20}</span>
                                                    <LuCalendarCheck2 size={28} style={{
                                                        color: '#BFBFBF'
                                                    }} />
                                                </div>
                                            </div>

                                            <div className='g--item-col'>
                                                <span className='g--subtitle'>Esperando</span>
                                                <div className='small-row--g'>
                                                    <span className='g--card-label' style={{
                                                        fontSize: '42px', lineHeight: '1', fontWeight: 600
                                                    }}>{30}</span>
                                                    <LuCalendarClock size={28} style={{
                                                        color: '#BFBFBF'
                                                    }} />
                                                </div>
                                            </div>

                                        </div>

                                        <div className='g--item-col'>
                                            <span className='g--subtitle'>Rechazados</span>
                                            <div className='small-row--g'>
                                                <span className='g--card-label' style={{
                                                    fontSize: '42px', lineHeight: '1', fontWeight: 600
                                                }}>{10}</span>
                                                <LuCalendarX2 size={28} style={{
                                                    color: '#BFBFBF'
                                                }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className='pie-chart-dash'>
                                        <Pie data={chartData} options={options} />
                                    </div>

                                </div>

                                <Button icon={<FaArrowRight />} className='button-mobile primarybutton--active'>Lista de invitados</Button>

                            </div>

                        </div>
                    </div>
                </div> */}

                <FooterApp shared_user={shared_user}></FooterApp>
            </div>
            :

            <div className='build-loading-container'>
                <img alt='' src={load} style={{
                    width: '200px'
                }} />
            </div>

    )
}
