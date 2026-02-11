// import React, { useContext, useEffect, useRef, useState } from 'react'
// import { Button, Input, Layout, message } from 'antd';
// import { CoverApp } from '../../modules/invitation/Cover';
// import { Greeting } from '../modules/invitation/Greeting';
// import { Family } from '../modules/invitation/Family';
// import { Quote } from '../modules/invitation/Quote';
// import { Itinerary } from '../modules/invitation/Itinerary';
// import { DressCode } from '../modules/invitation/DressCode';
// import { TableGifts } from '../modules/invitation/TableGifts';
// import { Notices } from '../modules/invitation/Notices';
// import { Gallery } from '../modules/invitation/Gallery';
// import { HeaderInvitation } from '../layouts/HeaderInvitation';
// import { FooterInvitation } from '../layouts/FooterInvitation';
// import { buttonsColorText, darker, lighter } from '../helpers/functions';
// import { appContext } from '../../context/AuthContext';
// import { useInvitation } from '../../hooks/customHook';
// import { getInvitationbyID } from '../../services/apiInvitation';
// import { load, FaLock } from '../helpers';
// import { getGuestsByInvitationID, guestLogin } from '../../services/apiGuests';
// import { ConfirmDrawerMobile } from '../components/ConfirmDrawer';
// import { Helmet } from 'react-helmet';
// import { FaArrowUp } from 'react-icons/fa';
// import { textures } from '../helpers/textures';
// import { Destinations } from '../modules/invitation/Destinations/Destinations';

// export const InvitationPage = ({ invitationID }) => {


//     const [isVisible, setIsVisible] = useState(false);
//     const { response, operation } = useInvitation()
//     const [prevScrollPos, setPrevScrollPos] = useState(0);
//     const { theme, font,  colorPalette } = useContext(appContext)
//     const [loader, setLoader] = useState(false)
//     const [validated, setValidated] = useState(true)
//     const [accessCode, setAccessCode] = useState(null)
//     const [invitation, setInvitation] = useState(null)
//     const [visible, setVisible] = useState(false)
//     const [currentGuest, setCurrentGuest] = useState(null)
//     const [drawerReady, setdrawerReady] = useState(false)
//     const [type, setType] = useState(null)
//     const [guests, setGuests] = useState(null)

//     const scrollableContentRef = useRef(null)

//     const handleGuestLogin = () => {
//         guestLogin(operation, invitationID, accessCode)
//     }

//     useEffect(() => {
//         const handleScroll = () => {
//             const currentScrollPos = window.pageYOffset;
//             const margin = 680; // Ajusta este valor según tu preferencia


//             if (currentScrollPos < margin) {
//                 setIsVisible(false);
//             } else {
//                 setIsVisible(prevScrollPos > currentScrollPos);

//                 setPrevScrollPos(currentScrollPos);
//             }
//         };

//         window.addEventListener('scroll', handleScroll);

//         return () => {
//             window.removeEventListener('scroll', handleScroll);
//         };
//     }, [prevScrollPos]);

//     const getData = () => {
//         setLoader(true)
//         getGuestsByInvitationID(operation, invitationID)
//     }

//     useEffect(() => {
//         if (response) {
//             if (response.data.ok) {
//                 switch (response.data.msg) {
//                     case "Get invitation By Id":
//                         const inv = response.data.data
//                         setInvitation(inv)
//                         setValidated(true)
//                         setLoader(false)
//                         if (type === 'open') {
//                             message.success(`¡Hola!`)
//                         }
//                         break;

//                     //Primero hacemos un get guest by id, de ahi obtenemos el type
//                     //Si el type es closed mostramos la seccion de login
//                     //si el type es open hacemos un getInvitationbyID


//                     case "Valid guest":
//                         if (visible) {
//                             setdrawerReady(true)
//                         }
//                         else {
//                             setLoader(true)
//                             getInvitationbyID(operation, invitationID)
//                         }
//                         setCurrentGuest(response.data.data)
//                         message.success(`¡Hola ${response.data.data.username}!`)
//                         localStorage.setItem("guest-id", response.data.data.guestID)
//                         localStorage.setItem("guest-token", response.data.data.token)



//                         break;

//                     case "Guests by ID":
//                         // console.log('here: ', response.data.guest.type)
//                         setLoader(false)
//                         setType(response.data.guest.type)
//                         setGuests(response.data.guest) // no los uso para nada (es el arreglo de guestes del doc guests)
//                         console.log('guests by id: ', response.data)
//                         break;

//                     default:
//                         break;
//                 }
//             }

//         }
//     }, [response])


//     const handlePosition = (id, index) => {
//         switch (id) {
//             case 1: return <Greeting key={index} id="greeting" dev={false} invitation={invitation} />
//             case 2: return <Family key={index} id="family" dev={false} invitation={invitation} />
//             case 3: return <Quote key={index} id="quote" dev={false} invitation={invitation} />
//             case 4: return <Itinerary key={index} id="itinerary" dev={false} invitation={invitation} />
//             case 5: return <DressCode key={index} id="dresscode" dev={false} invitation={invitation} />
//             case 6: return <TableGifts key={index} id="gifts" dev={false} invitation={invitation} />
//             case 7: return <Destinations key={index} invitation={invitation} dev={false} />
//             case 8: return <Notices key={index} id="notices" dev={false} invitation={invitation} />
//             case 9: return <Gallery key={index} id="gallery" dev={false} invitation={invitation} />

//             default:
//                 break;
//         }
//     }

//     useEffect(() => {
//         if (visible) {
//             if (type === 'closed' || type == 'close') {
//                 guestLogin(operation, invitationID, localStorage.getItem("guest-id"))
//             } else {
//                 setdrawerReady(true)
//             }

//         } else {
//             setdrawerReady(false)
//         }
//     }, [visible])

//     useEffect(() => {
//         getData()
//     }, [])

//     useEffect(() => {
//         if (type) {
//             if (type === 'open') {
//                 setLoader(true)
//                 getInvitationbyID(operation, invitationID)
//                 setValidated(true)
//             } else if (type === 'closed' || type == 'close') {
//                 setValidated(false)
//             }
//         }
//     }, [type])

//     useEffect(() => {
//         if (invitation) {
//             document.title = invitation.cover.title;
//         } else {
//             document.title = 'I attend';
//         }

//     }, [invitation]);

//     const cleanDate = (dateString) => {
//         if (dateString) {
//             // Verifica si la cadena de fecha termina con '000Z'
//             if (dateString.endsWith("000Z")) {
//                 // Elimina los últimos 4 caracteres (los 3 ceros y la 'Z')
//                 return dateString.slice(0, -5);
//             }

//             // Si no incluye '000Z', la devuelve sin cambios
//             return dateString;
//         }
//     };

//     const checkIfToday = (targetDate) => {
//         const today = new Date();
//         const target = new Date(targetDate);

//         // Comparar solo el año, mes y día
//         return (
//             today.getFullYear() === target.getFullYear() &&
//             today.getMonth() === target.getMonth() &&
//             today.getDate() === target.getDate()
//         );
//     };

//     const renderMetaTags = () => {

//         let title = "I attend"
//         let description = "Diseña, Comparte, Celebra"
//         let image = ""

//         if (invitation) {
//             title = invitation.cover.title
//             description = ""
//             image = invitation.cover.featured_prod
//         }
//         return (
//             <Helmet>
//                 <title>{title}</title>
//                 <meta property="og:title" content={title} />
//                 <meta property="og:description" content={description} />
//                 <meta property="og:image" content={image} />
//                 <meta property="og:url" content={window.location.href} />
//             </Helmet>
//         );
//     };

//     const scrollToTop = () => {
//         const container = scrollableContentRef.current;
//         if (container) {
//             container.scrollIntoView({ behavior: 'smooth', block: 'start' });
//         }
//     };



//     return (

//         <>
//             {renderMetaTags()}
//             {

//                 !validated ?
//                     <Layout style={{
//                         width: '100%', height: '100vh'
//                     }}>
//                         <div className='locked-invitation-background'>
//                             <div className='locked-invitation-container'>
//                                 <div className='locked-icon-container'>
//                                     <FaLock />
//                                 </div>
//                                 <span className='locked-page-title'>Invitación Privada</span>
//                                 <span className='locked-page-text'>Esta invitación es <b>exclusiva para ti</b>. Ingresa tu código de invitado para continuar y disfrutar de esta experiencia única.</span>
//                                 <Input
//                                     value={accessCode}
//                                     onChange={(e) => setAccessCode(e.target.value)}
//                                     placeholder='Código de invitado' className='locked-input' />
//                                 <Button onClick={handleGuestLogin} id="locked-access-button" >Continuar</Button>
//                             </div>


//                         </div>
//                     </Layout>
//                     :
//                     !loader && invitation ?
//                         <Layout style={{
//                             display: 'flex',
//                             width: '100%'
//                         }}>
//                             <HeaderInvitation visible={isVisible} content={invitation.cover} invitation={invitation} />
//                             <div ref={scrollableContentRef}
//                                 style={{
//                                     margin: '0px', overflowY: 'auto',
//                                     display: 'flex',
//                                     alignItems: 'center', justifyContent: 'flex-start',
//                                     flexDirection: 'column',
//                                     backgroundColor: colorPalette.primary,
//                                     position: 'relative', width: '100%',
//                                     gap: '52px',
//                                     paddingBottom: '36px'
//                                 }}
//                             >



//                                 {
//                                     invitation.cover.date &&
//                                     !checkIfToday(cleanDate(invitation.cover.date)) &&
//                                     <div className='action-buttons-container'>
//                                         <Button
//                                             className="action-button"
//                                             onClick={() => setVisible(true)}
//                                             style={{
//                                                 color: buttonsColorText(darker(colorPalette.buttons, 0.8)),
//                                                 fontFamily: font, backdropFilter: 'blur(10px)',
//                                                 background: `linear-gradient(to right, ${lighter(colorPalette.buttons, 0.1)} 0%, ${darker(colorPalette.buttons, 0.8)} 51%, ${darker(colorPalette.buttons, 0.9)} 100%)`
//                                             }}
//                                         >
//                                             CONFIRMAR
//                                         </Button>
//                                         {/* <Button
//                                             icon={<FaArrowUp />}
//                                             className="action-button"
//                                             onClick={scrollToTop}
//                                             style={{
//                                                 width: '40px',
//                                                 color: buttonsColorText(darker(colorPalette.buttons, 0.8)),
//                                                 fontFamily: font, backdropFilter: 'blur(10px)',
//                                                 background: `linear-gradient(to right, ${lighter(colorPalette.buttons, 0.1)} 0%, ${darker(colorPalette.buttons, 0.8)} 51%, ${darker(colorPalette.buttons, 0.9)} 100%)`
//                                             }}
//                                         >
//                                         </Button> */}
//                                     </div>
//                                 }



//                                 <CoverApp inv={invitation} dev={false} height={'100vh'} />

//                                 {
//                                     invitation.generals.positions.map((position, index) => (
//                                         handlePosition(position, index)
//                                     ))
//                                 }

//                                 {
//                                     invitation.generals.texture !== null &&
//                                     <div className="image-texture-container">
//                                         <div className="image-texture-container">
//                                             {Array.from({ length: 100 }).map((_, index) => (
//                                                 <img loading="lazy"
//                                                     decoding="async" alt='' key={index} src={textures[invitation.generals.texture].image} className="texture-img"
//                                                     style={{
//                                                         opacity: textures[invitation.generals.texture].opacity,
//                                                         filter: textures[invitation.generals.texture].filter,
//                                                         mixBlendMode: textures[invitation.generals.texture].blend
//                                                     }}
//                                                 />
//                                             ))}
//                                         </div>
//                                     </div>
//                                 }

//                             </div>
//                             <FooterInvitation invitation={invitation} />
//                         </Layout>

//                         : <div style={{
//                             height: '100vh', display: 'flex', alignItems: 'center',
//                             justifyContent: 'center',
//                             width: '100%'
//                             // backgroundColor: lighter(MainColor, 0.9)
//                         }}>
//                             <img alt='' src={load} style={{
//                                 width: '200px'
//                             }} />
//                         </div>
//             }

//             <ConfirmDrawerMobile guests={guests} type={type} visible={drawerReady} setVisible={setVisible} theme={theme} currentGuest={currentGuest} invitation={invitation} />
//             {/* <ConfirmDrawerWeb visible={visible2} setVisible={setVisible2} MainColor={MainColor} theme={theme} /> */}

//         </>

//     )
// }
