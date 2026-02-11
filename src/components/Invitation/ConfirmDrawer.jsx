// import { Button, Drawer, Input, message, } from 'antd'
// import React, { useContext, useEffect, useState } from 'react'
// import { useInvitation } from '../../hooks'
// import { appContext } from '../../context'

// import '../styles/invitations/confirm-drawer.css'
// import { FaRegCalendar, FaMinus, IoMdAdd, FaRegCalendarXmark, FaRegCalendarCheck, FaArrowRight, generateSimpleId, buttonsColorText } from '../../helpers'

// import { AddToCalendarButton } from 'add-to-calendar-button-react';
// import { confirmGuests, editGuestsGuest, } from '../../services/apiGuests'
// import dayjs from 'dayjs';
// import utc from 'dayjs/plugin/utc';
// import timezone from 'dayjs/plugin/timezone';
// import { textures } from '../../helpers/textures'

// dayjs.extend(utc);
// dayjs.extend(timezone);

// export const ConfirmDrawerMobile = ({ guests, type, visible, setVisible, MainColor, theme, currentGuest, invitation }) => {

//     const { colorPalette } = useContext(appContext)
//     const { response, operation } = useInvitation()
//     const [tickets, setTickets] = useState([])
//     const [freeTickets, setFreeTickets] = useState(null)
//     const [confirmed, setConfirmed] = useState('esperando');
//     const [localStatus, setLocalStatus] = useState(null)
//     const [currentGuestName, setCurrentGuestName] = useState(null)

//     const handleClose = () => {
//         setVisible(false)
//     }

//     const addTicket = () => {
//         setTickets([...tickets, ""]);
//     };

//     const handleInputChange = (index, value) => {
//         const newTickets = [...tickets];
//         newTickets[index] = value;
//         setTickets(newTickets);
//     };

//     const removeLastTicket = () => {
//         if (tickets.length > 0) {
//             setTickets(tickets.slice(0, -1));
//         }
//     };

//     const acceptInvitation = () => {
//         if (tickets.some(ticket => ticket.trim() === "")) {
//             message.warning("Escribe los nombres de tus acompañantes");
//             return;
//         }

//         if (!currentGuestName) {
//             message.warning("Por favor escribe tu nombre");
//             return;
//         }

//         setLocalStatus('confirmado')

//         if (type === 'open') {
//             const newGuest = {
//                 name: currentGuestName,
//                 username: '000-000',
//                 id: generateSimpleId(),
//                 available_cards: [currentGuestName, ...tickets].length,
//                 companions: [currentGuestName, ...tickets],
//                 state: 'confirmado',
//                 last_action: 'accepted',
//                 last_update_date: new Date(),
//                 creation_date: new Date()
//             }
//             confirmGuests(operation, guests, newGuest)
//         }

//         else if (type === 'closed' || type == 'close') {
//             editGuestsGuest(operation, invitation._id, currentGuest, 'confirmado', tickets, currentGuestName)
//         }

//     };

//     const rejectInvitation = () => {

//         if (!currentGuestName) {
//             message.warning("Por favor escribe tu nombre");
//             return;
//         }

//         const tickets = []
//         setLocalStatus('rechazado')


//         if (type === 'open') {
//             const newGuest = {
//                 name: currentGuestName,
//                 username: '000-000',
//                 id: generateSimpleId(),
//                 available_cards: 1,
//                 companions: tickets,
//                 state: 'rechazado',
//                 last_action: 'rejected',
//                 last_update_date: new Date(),
//                 creation_date: new Date()
//             }
//             confirmGuests(operation, guests, newGuest)
//         }

//         else if (type === 'closed') {
//             editGuestsGuest(operation, invitation._id, currentGuest, 'rechazado', tickets)
//         }
//     }

//     const handleDescription = (guests) => {
//         switch (guests) {
//             case 0:
//                 return `¡Tu asistencia ha sido confirmada!`
//             case 1:
//                 return `¡Tu asistencia y la de tu acompañante ha sido confirmada!`
//             default:
//                 return `¡Tu asistencia y la de tus ${guests} acompañantes ha sido confirmada!`

//         }
//     }

//     useEffect(() => {
//         if (visible) {
//             if (currentGuest) {
//                 setConfirmed(currentGuest.status)
//                 setTickets(currentGuest.companions.slice(1))
//                 setFreeTickets(currentGuest.tickets)
//                 setCurrentGuestName(currentGuest.username)

//             } else {
//                 setConfirmed('esperando')
//                 setTickets([])
//                 setFreeTickets(null)
//                 setCurrentGuestName(null)
//             }

//         }
//     }, [visible])

//     useEffect(() => {
//         if (response) {
//             if (response.data.ok) {
//                 switch (response.data.msg) {
//                     case "Guest updated successfully":
//                         setConfirmed(localStatus)
//                         break;

//                     default:
//                         break;
//                 }
//             }
//         }
//     }, [response])


//     return (

//         MainColor && (
//             <Drawer
//                 className='confirm-drawer'
//                 placement="right"
//                 open={visible}
//                 width={'100%'}
//                 closable={false} // Oculta el botón de cierre (la "X")
//                 style={{
//                     background: colorPalette.primary,
//                     display: 'flex', alignItems: 'center', justifyContent: 'center'
//                 }}
//             >

//                 {
//                     invitation.generals.texture !== null &&
//                     <div className="image-texture-container">
//                         <div className="image-texture-container">
//                             {Array.from({ length: 100 }).map((_, index) => (
//                                 <img alt='' key={index} src={textures[invitation.generals.texture].image} className="texture-img"
//                                     style={{
//                                         opacity: textures[invitation.generals.texture].opacity,
//                                         filter: textures[invitation.generals.texture].filter,
//                                         mixBlendMode: textures[invitation.generals.texture].blend
//                                     }}
//                                 />
//                             ))}
//                         </div>
//                     </div>
//                 }

//                 <div className='confirm-componentes-container'>
//                     {
//                         // currentGuest && (

//                         confirmed === 'esperando' ?
//                             <div className='confirm-main-container'>

//                                 <div className='icon-container' style={{
//                                     border: `3px solid ${colorPalette.secondary}`,
//                                 }}>
//                                     <FaRegCalendar size={42} style={{ color: colorPalette.accent }} />
//                                 </div>

//                                 <span className='drawer-confirm-label' style={{
//                                     color: colorPalette.accent
//                                 }}>
//                                     {
//                                         freeTickets ? <span>¡Hola <b>{currentGuestName}</b>! Tienes <b>{currentGuest.cards} pases</b> disponibles para ti y tus acompañantes</span>
//                                             : !freeTickets && currentGuestName ? <span>¡Hola <b>{currentGuestName}</b>! Estamos felices de que nos puedas acompañar</span>
//                                                 : <span>¡Hola! Estamos felices de que nos puedas acompañar</span>

//                                     }

//                                 </span>

//                                 <div className='how-much-tickets-container' style={{
//                                     border: `3px solid ${colorPalette.secondary}`
//                                 }}>

//                                     <span className='drawer-confirm-label' style={{
//                                         color: colorPalette.accent,
//                                         fontSize: '22px', fontWeight: 600
//                                     }}>
//                                         ¿Cuántos pases vas a utilizar?

//                                     </span>

//                                     <div className='input-number-tickets-row'>
//                                         <Button
//                                             disabled={tickets.length === 0 ? true : false}
//                                             onClick={removeLastTicket}
//                                             icon={<FaMinus size={20} />}
//                                             id='ticket-button' style={{
//                                                 color: buttonsColorText(colorPalette.buttons),
//                                                 backgroundColor: tickets.length === 0 ? 'rgba(0,0,0,0.20)' : colorPalette.buttons
//                                             }} />
//                                         <div className='simulated-input' style={{
//                                             backgroundColor: 'var(--ft-color)'
//                                         }}>
//                                             <span className='drawer-confirm-label'
//                                                 style={{
//                                                     color: colorPalette.accent,
//                                                     margin: 0
//                                                 }}>{tickets.length + 1}</span>
//                                         </div>
//                                         {
//                                             freeTickets ?
//                                                 <Button
//                                                     onClick={addTicket}
//                                                     disabled={tickets.length === parseInt(currentGuest.cards) - 1 ? true : false}
//                                                     icon={<IoMdAdd size={25} />}
//                                                     id='ticket-button' style={{
//                                                         color: buttonsColorText(colorPalette.buttons),
//                                                         backgroundColor: tickets.length === parseInt(currentGuest.cards) - 1 ? 'rgba(0,0,0,0.20)' : colorPalette.buttons
//                                                     }} />
//                                                 :
//                                                 <Button
//                                                     onClick={addTicket}

//                                                     icon={<IoMdAdd size={25} />}
//                                                     id='ticket-button' style={{
//                                                         color: buttonsColorText(colorPalette.buttons),
//                                                         backgroundColor: colorPalette.buttons
//                                                     }} />
//                                         }
//                                     </div>


//                                     <span className='drawer-confirm-label'
//                                         style={{
//                                             color: colorPalette.accent,
//                                             fontWeight: 600

//                                         }}>
//                                         {freeTickets === 1 ? 'Agrega tu nombre' : "Agrega tu nombre y el de tus acompañantes"}
//                                     </span>

//                                     <div className='confirm-inputs-container'>
//                                         <Input
//                                             value={currentGuestName}
//                                             onChange={(e) => setCurrentGuestName(e.target.value)}
//                                             className='confirm-input'
//                                             placeholder='Tu nombre'
//                                             style={{
//                                                 background: `var(--ft-color)`,
//                                                 border: `0px solid ${colorPalette.secondary}`,
//                                                 color: colorPalette.accent
//                                             }}
//                                         />
//                                         {
//                                             tickets.map((tck, index) => (
//                                                 <Input
//                                                     onChange={(e) => handleInputChange(index, e.target.value)}
//                                                     key={index}
//                                                     placeholder='Acompañante'
//                                                     className='confirm-input'
//                                                     value={tck}
//                                                     style={{
//                                                         background: 'var(--ft-color)',
//                                                         border: `0px solid ${colorPalette.secondary}`,
//                                                         color: colorPalette.accent
//                                                     }}
//                                                 />
//                                             ))
//                                         }
//                                     </div>
//                                 </div>



//                             </div>

//                             : confirmed === 'rechazado' ?
//                                 <div className='confirm-main-container'>

//                                     <div className='icon-container' style={{
//                                         backgroundColor: colorPalette.secondary
//                                     }}>
//                                         <FaRegCalendarXmark size={50} style={{ color: colorPalette.accent }} />
//                                     </div>

//                                     <span className='drawer-confirm-label' style={{
//                                         color: colorPalette.accent
//                                     }}>
//                                         Lamentamos no poder contar con tu asistencia esperamos pronto poder celebrar juntos
//                                     </span>





//                                 </div>

//                                 : <div className='confirm-main-container'>

//                                     <div className='icon-container' style={{
//                                         backgroundColor: colorPalette.secondary
//                                         // border: `1px solid ${theme ? darker(MainColor, 0.8) : lighter(MainColor, 0.8)}20`
//                                     }}>
//                                         <FaRegCalendarCheck size={50} style={{ color: colorPalette.accent }} />
//                                     </div>

//                                     <span className='drawer-confirm-label' style={{
//                                         color: colorPalette.accent
//                                     }}>
//                                         {handleDescription(tickets.length)} <b>Esperamos verte y celebrar juntos muy pronto.</b>
//                                     </span>

//                                     <div style={{
//                                         width: '50%', height: '2px', borderRadius: '5px',
//                                         backgroundColor: colorPalette.secondary
//                                     }} />

//                                     <span className='drawer-confirm-label' style={{
//                                         color: colorPalette.accent
//                                     }}>
//                                         Agrega el evento a tu calendario
//                                     </span>

//                                     <AddToCalendarButton
//                                         name={invitation.cover.title}
//                                         options={['Google']}
//                                         // startDate={formatISODate(invitation.cover.date)}
//                                         startDate={invitation.cover.date.split('T')[0]}
//                                         timeZone="America/Los_Angeles"
//                                     ></AddToCalendarButton>

//                                 </div>
//                         // )
//                     }

//                     <div className='confirm-buttons-container'>
//                         {
//                             confirmed !== 'esperando' ?

//                                 type === 'closed' | type === 'close' && (
//                                     <Button
//                                         onClick={() => setConfirmed('esperando')}
//                                         id="confirm-confirm-button" style={{
//                                             background: 'transparent', marginTop: '50px',
//                                             border: `2px solid  ${colorPalette.buttons}`,
//                                             color: colorPalette.buttons,
//                                         }}>

//                                         Cambiar respuesta
//                                     </Button>
//                                 )

//                                 :
//                                 <>

//                                     <Button
//                                         onClick={acceptInvitation}
//                                         id='confirm-confirm-button' style={{
//                                             color: buttonsColorText(colorPalette.buttons),
//                                             backgroundColor: colorPalette.buttons,
//                                             letterSpacing: '2px'
//                                         }}>
//                                         CONFIRMAR
//                                     </Button>

//                                     <Button
//                                         onClick={rejectInvitation}
//                                         id="confirm-confirm-button" style={{
//                                             background: 'var(--ft-color)',
//                                             border: `2px solid  ${colorPalette.secondary}`,
//                                             color: colorPalette.accent,
//                                             backgroundColor: colorPalette.primary
//                                         }}>

//                                         No podré asistir
//                                     </Button>


//                                 </>
//                         }
//                     </div>



//                     <Button
//                         icon={<FaArrowRight size={30} />}
//                         type='ghost'
//                         onClick={handleClose}
//                         style={{
//                             position: 'absolute', top: '12px',
//                             right: '12px',
//                             color: colorPalette.accent
//                         }}></Button>

//                 </div>








//             </Drawer>
//         )


//     )
// }


// // export const ConfirmDrawerWeb = ({ visible, setVisible, MainColor, theme }) => {

// //     const { user } = useContext(appContext)
// //     const { response, operation } = useInvitation()
// //     const [tickets, setTickets] = useState(["", "", "", "", "", "", "", ""])


// //     const handleClose = () => {
// //         setVisible(false)
// //     }



// //     return (
// //         <Drawer
// //             // title="Basic Drawer"
// //             placement="right"
// //             closable={true}
// //             onClose={handleClose}
// //             open={visible}
// //             width={'35%'}
// //             style={{ background: theme ? lighter(MainColor, 0.9) : darker(MainColor, 0.6) }}
// //             extra={
// //                 <Row>

// //                     <Button id="confirm-confirm-button" style={{
// //                         background: 'transparent',
// //                         border: `2px solid  ${!theme ? lighter(MainColor, 0.4) : darker(MainColor, 0.6)}`,
// //                         color: !theme ? lighter(MainColor, 0.4) : darker(MainColor, 0.6),
// //                     }}>

// //                         No podre asistir
// //                     </Button>

// //                     <Button id='confirm-confirm-button' style={{
// //                         color: theme ? lighter(MainColor, 0.6) : darker(MainColor, 0.4),
// //                         backgroundColor: theme ? darker(MainColor, 0.6) : lighter(MainColor, 0.4)
// //                     }}>
// //                         Confirmar
// //                     </Button>


// //                 </Row>
// //             }


// //         // key={placement}
// //         >

// //             <div className='confirm-main-container'>

// //                 <div className='icon-container' style={{
// //                     backgroundColor: theme ? lighter(MainColor, 0.7) : darker(MainColor, 0.3),
// //                     border: `2px solid ${theme ? darker(MainColor, 0.8) : lighter(MainColor, 0.8)}`
// //                 }}>
// //                     <FaRegCalendar size={50} style={{ color: theme ? darker(MainColor, 0.8) : lighter(MainColor, 0.8) }} />
// //                 </div>

// //                 <span className='drawer-confirm-label' style={{
// //                     color: colorPalette.accent
// //                 }}>
// //                     ¡Hola <b>Usuario</b>! Tienes <b>8 pases</b> disponibles para ti y tus acompañantes
// //                 </span>

// //                 <div className='how-much-tickets-container' style={{
// //                     border: `2px solid ${theme ? darker(MainColor, 0.8) : lighter(MainColor, 0.8)}`,
// //                     backgroundColor: theme ? lighter(MainColor, 0.7) : darker(MainColor, 0.3)
// //                 }}>

// //                     <span className='drawer-confirm-label' style={{
// //                         color: colorPalette.accent,
// //                         fontSize: '22px'
// //                     }}>
// //                         <b>¿Cuántos pases vas a utilizar?</b>
// //                     </span>

// //                     <div className='input-number-tickets-row'>
// //                         <Button
// //                             disabled={tickets.length === 0 ? true : false}
// //                             onClick={() => setTickets(tickets.slice(0, -1))}
// //                             icon={<FaMinus size={20} />}
// //                             id='ticket-button' style={{
// //                                 backgroundColor: tickets.length === 0 ? 'rgba(0,0,0,0.20)' : lighter(MainColor, 0.4)
// //                             }} />
// //                         <div className='simulated-input' style={{
// //                             backgroundColor: colorPalette.accent
// //                         }}>
// //                             <span className='drawer-confirm-label'
// //                                 style={{
// //                                     color: theme ? lighter(MainColor, 0.6) : darker(MainColor, 0.3),
// //                                     margin: 0
// //                                 }}>{tickets.length + 1}</span>
// //                         </div>
// //                         <Button
// //                             onClick={() => setTickets([...tickets, ""])}
// //                             disabled={tickets.length === 8 - 1 ? true : false}
// //                             icon={<IoMdAdd size={25} />}
// //                             id='ticket-button' style={{
// //                                 backgroundColor: tickets.length === 8 - 1 ? 'rgba(0,0,0,0.20)' : lighter(MainColor, 0.4)
// //                             }} />
// //                     </div>

// //                     <span className='drawer-confirm-label'
// //                         style={{
// //                             color: colorPalette.accent,

// //                         }}><b>Tus acompañantes</b></span>

// //                     <div className='confirm-inputs-container'>
// //                         <div
// //                             className='confirm-input'
// //                             style={{
// //                                 background: `${theme ? darker(MainColor, 0.6) : lighter(MainColor, 0.8)}80`,
// //                                 color: lighter(MainColor, 0.6),
// //                                 marginBottom: '15px', fontSize: '16px', fontWeight: 700,
// //                                 display: 'flex', alignItems: 'center', justifyContent: 'center'
// //                             }}
// //                         >
// //                             Usuario
// //                         </div>
// //                         {
// //                             tickets.map((tck) => (
// //                                 <Input
// //                                     placeholder='Nombre'
// //                                     className='confirm-input'
// //                                     style={{
// //                                         background: theme ? lighter(MainColor, 0.9) : lighter(MainColor, 0.8),
// //                                         border: `1px solid ${theme ? darker(MainColor, 0.8) : lighter(MainColor, 0.8)}50`,
// //                                         color: darker(MainColor, 0.3)
// //                                     }}
// //                                 />
// //                             ))
// //                         }
// //                     </div>
// //                 </div>



// //             </div>



// //         </Drawer>
// //     )
// // }




