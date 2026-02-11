// import React, { useContext, useEffect, useRef, useState, } from 'react'
// import { Button } from 'antd';
// import {
//     PiMonitorPlayBold, MdOutlineTimeline, MdDevices, MdBubbleChart,
//     images,
//     decoration,
//     cover_samples,
//     IoIosArrowDown,
//     IoIosArrowUp,
//     lighter,
//     darker,
//     formatDate
// } from '../helpers'
// import { appContext } from '../context';
// import { HeaderBuild } from '../layouts/Build';
// import { Link, useLocation } from 'react-router-dom';
// import { MdPersonAdd, MdShare, MdVisibility } from 'react-icons/md';
// import ios_settings from '../assets/iphone-settings.svg'
// import { InvitationTest } from './InvitationTest';
// import { getInvitationbyID } from '../services';
// import { useInvitation } from '../hooks';
// import { QRCodeCanvas } from 'qrcode.react';
// import { FooterApp } from '../layouts/FooterApp/FooterApp';

// const baseProd = "https://www.iattend.site"
// const desginCards = [
//     {
//         icon: <MdBubbleChart />,
//         title: "Personalización Total",
//         text: "Elige entre una amplia variedad de paletas de colores y tipografías, y ajusta cada elemento de la invitación para reflejar perfectamente el tema de tu evento.",
//         // image: images.itinerary,
//     },
//     {
//         icon: <MdDevices />,
//         title: "Flexibilidad en el Diseño",
//         text: "Reorganiza los elementos a tu gusto, cambia imágenes, colores, y más. La libertad creativa está en tus manos para hacer que cada invitación sea única.",
//         // image: images.gallery,
//     },
//     {
//         icon: <MdOutlineTimeline />,
//         title: "Previsualización en Tiempo Real",
//         text: "	Diseña y visualiza tu invitación en tiempo real. Haz ajustes al instante y asegúrate de que todo luzca perfecto antes de enviarla.",
//         // image: images.settings,
//     }
// ]

// const guestManagementCards = [
//     {
//         icon: <MdShare />,
//         title: "Comparte tu Invitación",
//         text: "Facilita la distribución de tu invitación digital con solo un clic, asegurándote de que todos tus invitados reciban la información a tiempo.",
//         image: images.share_guests,
//     },
//     {
//         icon: <MdPersonAdd />,
//         title: "Gestión de Invitados",
//         text: "Agrega, edita o elimina invitados fácilmente. Mantén tu lista actualizada y organizada para una gestión eficiente de tu evento.",
//         image: images.new_guests,
//     },
//     {
//         icon: <MdVisibility />,
//         title: "Control de Visibilidad",
//         text: "Decide quién puede ver tu invitación, asegurando la privacidad y el acceso solo a quienes tú decidas.",
//         image: images.privacy_guests,
//     }
// ]


// export const DiscoverPage = ({ }) => {

//     const { setOnDate,} = useContext(appContext)
//     const { response, operation } = useInvitation()
//     const [isVisible, setIsVisible] = useState(true);
//     const [prevScrollPos, setPrevScrollPos] = useState(0)
//     const [openLogin, setOpenLogin] = useState(false)
//     const [centerIndex, setCenterIndex] = useState(0);
//     const [invitation, setInvitation] = useState(null)
//     const [currentCarrousell, setCurrentCarrousell] = useState(0)
//     const { pathname } = useLocation();
//     const size = { width: 'calc(100vh / 2.5)', height: '668px' }
//     const scrollRef = useRef(null);
//     const speed = 2.5
//     const scrollableContentRef = useRef(null);

//     const realInvitation = useRef(null)
//     const blockedInvitation = useRef(null)
//     const cardInvitation = useRef(null)
//     const exaplesContainer = useRef(null)


//     const scrollDown = () => {
//         const container = scrollableContentRef.current;
//         if (container) {
//             container.scrollBy({ top: 400, behavior: "smooth" });
//         }
//     };

//     const scrollUp = () => {
//         const container = scrollableContentRef.current;
//         if (container) {
//             container.scrollBy({ top: -400, behavior: "smooth" });
//         }
//     };

//     const handleScroll = () => {
//         const container = scrollRef.current;
//         if (!container) return;

//         if (container.scrollLeft >= container.scrollWidth / 2) {
//             container.scrollLeft = container.scrollLeft - container.scrollWidth / 2;
//         }
//         if (container.scrollLeft <= 0) {
//             container.scrollLeft = container.scrollLeft + container.scrollWidth / 2;
//         }

//         const containerCenter = container.scrollLeft + container.offsetWidth / 2;
//         const items = Array.from(container.children);

//         let minDiff = Infinity;
//         let closestIndex = 0;

//         items.forEach((item, idx) => {
//             const itemCenter = item.offsetLeft + item.offsetWidth / 2;
//             const diff = Math.abs(containerCenter - itemCenter);
//             if (diff < minDiff) {
//                 minDiff = diff;
//                 closestIndex = idx;
//             }
//         });

//         setCenterIndex(closestIndex);
//     };

//     const handleCarrousell = (offsetLeft) => {
//         const container = exaplesContainer.current;
//         setCurrentCarrousell(offsetLeft)
//         container.scrollTo({ left: offsetLeft, behavior: "smooth" });
//     }

//     useEffect(() => {
//         getInvitationbyID(operation, "680ddfb5d6985973ff0d36dd")
//         handleScroll();
//         setOnDate(new Date())
//         setIsVisible(true)
//     }, [])

//     useEffect(() => {
//         const container = scrollRef.current;
//         let animationFrame;

//         const autoScroll = () => {
//             if (container) {
//                 container.scrollLeft += speed;
//                 handleScroll();
//             }
//             animationFrame = requestAnimationFrame(autoScroll);
//         };

//         animationFrame = requestAnimationFrame(autoScroll);

//         return () => cancelAnimationFrame(animationFrame);
//     }, []);

//     useEffect(() => {
//         const handleScroll = () => {
//             const currentScrollPos = window.pageYOffset;
//             const margin = 0; // Ajusta este valor según tu preferencia


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

//     useEffect(() => {

//         if (response) {
//             if (response.data.ok) {
//                 switch (response.data.msg) {
//                     case "Get invitation By Id":
//                         const inv = response.data.data
//                         setInvitation(inv)
//                         break;

//                     default:
//                         break;
//                 }

//             }
//         }



//     }, [response])


//     useEffect(() => {
//         window.scrollTo(0, 0);
//     }, [pathname]);


//     return (


//         <div
//             className='discover-page-general-container'>
//             <HeaderBuild position={'discover'} setOpenLogin={setOpenLogin} isVisible={isVisible} />

//             <div className='disc-page-content-container'>
//                 <div className='dp-title-container'>
//                     <span className='dp-primary-text'>
//                         Diseña, Comparte, <span className='accent-text'>Celebra.</span>
//                     </span>
//                 </div>

//                 <div
//                     ref={scrollRef}
//                     onScroll={handleScroll}
//                     className='cover-samples-container scroll-invitation'>
//                     {
//                         [...cover_samples, ...cover_samples].map((cover, idx) => (
//                             <div
//                                 key={idx}
//                                 style={{
//                                     transition: 'all 0.45s ease',
//                                     zIndex: centerIndex === idx && 2,
//                                 }}
//                                 className={`inv-device-main-container-ios ${centerIndex === idx ? 'central' : 'regular'}-card-cover`}>
//                                 <div className={`device-buttons-container-ios`}>
//                                     <div className={`device-button-ios`} />
//                                     <div className={`device-button-ios`} />
//                                     <div className={`device-button-ios`} />
//                                 </div>
//                                 <div className={`device-power-button-ios`} />
//                                 <div className={`inv-device-container-ios`}>

//                                     <div style={{
//                                         width: '100%'
//                                     }} className={`inv-black-space-ios`}>
//                                         <span>5:15</span>
//                                         <div className={`camera-ios`} />
//                                         <div >
//                                             <img alt='' src={ios_settings} style={{
//                                                 height: '100%', objectFit: 'cover',
//                                                 marginRight: '50px'
//                                             }} />
//                                         </div>
//                                     </div>

//                                     <div
//                                         className={`ios-invitation inv-set-position grid-guides cover-sample-img scroll-invitation`}
//                                     >
//                                         <img alt='' src={cover} />


//                                     </div>
//                                     <div className={`inv-light-space-ios`} />
//                                 </div>
//                             </div>
//                         ))
//                     }
//                 </div>

//                 <div className='dph-box-cont'>
//                     <div className='dp-head-block'>
//                         <div className='dph-texts-cont'>
//                             <span className='dp-primary-text-secondary'>
//                                 Construye invitaciones perfectas
//                             </span>
//                             <span className='dp-primary-single-text'> Ajusta cada detalle a tu gusto, desde los colores hasta la tipografía, asegurarte que tu invitación sea tan única como tu celebración.</span>
//                         </div>

//                         <div className='dph-cards-cont' >
//                             <img alt='' src={decoration.decoration_1} className='decoration-image-admin' />
//                         </div>
//                     </div>
//                     <div className='test-build-invitation-container first-box'>

//                         <div className='try-inv-icon-cont disable-icon'>
//                             <PiMonitorPlayBold />
//                         </div>

//                         <span className='try-inv-head'>Descubre lo fácil que es diseñar invitaciones personalizadas que capturan la esencia de tu evento</span>
//                         <span className='try-inv-single discover-description'> Con nuestras herramientas intuitivas, puedes ajustar cada detalle a tu gusto, desde los colores hasta la tipografía, asegurando que tu invitación sea tan única como tu celebración.</span>

//                         <div className='test-build-invitation-second-container' >
//                             <img alt='' src={images.build_invitations} className='module-image-example' />
//                         </div>

//                     </div>
//                     <div className='try-inv-second-section scroll-invitation' >
//                         {
//                             desginCards.map((card, index) => (
//                                 <div key={index} className='test-build-invitation-container test-build-small-card'>
//                                     <div className='card-dph-single-col'>
//                                         <div className='try-inv-icon-cont'>
//                                             {card.icon}
//                                         </div>

//                                         <span className='try-inv-head-second' style={{
//                                         }}>{card.title}</span>
//                                         <span style={{
//                                         }} className='try-inv-single-second'>{card.text}</span>
//                                     </div>

//                                 </div>
//                             ))
//                         }

//                     </div>
//                 </div>

//                 <div ref={exaplesContainer} className='dph-examples-carrusell scroll-invitation'>
//                     {
//                         invitation &&
//                         <div ref={realInvitation} className='invitation-container-box'>
//                             <div className='dph-scroll-buttons-cont'>
//                                 <button onClick={scrollUp}><IoIosArrowUp size={18} /></button>
//                                 <button onClick={scrollDown}><IoIosArrowDown size={18} /></button>
//                             </div>


//                             <div style={{ transform: 'scale(0.8)', margin: '0px' }} className={`inv-device-main-container-ios inv-dyn-margins`}>
//                                 <div className={`device-buttons-container-ios`}>
//                                     <div className={`device-button-ios`} />
//                                     <div className={`device-button-ios`} />
//                                     <div className={`device-button-ios`} />
//                                 </div>
//                                 <div className={`device-power-button-ios`} />
//                                 <div className={`inv-device-container-ios`}>

//                                     <div style={{
//                                         width: '100%'
//                                     }} className={`inv-black-space-ios`}>
//                                         <span>5:15</span>
//                                         <div className={`camera-ios`} />
//                                         <div >
//                                             <img alt='' src={ios_settings} style={{
//                                                 height: '100%', objectFit: 'cover',
//                                                 marginRight: '50px'
//                                             }} />
//                                         </div>
//                                     </div>

//                                     <div ref={scrollableContentRef} className={`scroll-invitation ios-invitation`} >
                                        
//                                     </div>
//                                     <div className={`inv-light-space-ios`} />
//                                 </div>
//                             </div>


//                             <span className='dp-primary-text-secondary invitation-interactive-text' style={{
//                                 fontSize: '74px', textAlign: 'left',
//                                 fontWeight: 700, maxWidth: '650px'
//                             }}>
//                                 Conoce una invitación en <span className='accent-text--w' >acción.</span>
//                             </span>
//                         </div>
//                     }

//                     <div ref={cardInvitation} className='invitation-container-box'>

//                         <div style={{ transform: 'scale(0.8)', margin: '0px' }} className={`inv-device-main-container-ios inv-dyn-margins`}>
//                             <div className={`device-buttons-container-ios`}>
//                                 <div className={`device-button-ios`} />
//                                 <div className={`device-button-ios`} />
//                                 <div className={`device-button-ios`} />
//                             </div>
//                             <div className={`device-power-button-ios`} />
//                             <div className={`inv-device-container-ios`}>

//                                 <div style={{
//                                     width: '100%'
//                                 }} className={`inv-black-space-ios`}>
//                                     <span>5:15</span>
//                                     <div className={`camera-ios`} />
//                                     <div >
//                                         <img alt='' src={ios_settings} style={{
//                                             height: '100%', objectFit: 'cover',
//                                             marginRight: '50px'
//                                         }} />
//                                     </div>
//                                 </div>

//                                 <div className={`scroll-invitation ios-invitation`} style={{ overflowY: 'hidden' }} >
//                                     <img alt='' style={{
//                                         width: '100%', height: '100%', objectFit: 'cover'
//                                     }} src="https://firebasestorage.googleapis.com/v0/b/iattend-df79a.appspot.com/o/covers_samples%2FSimulator%20Screenshot%20-%20iPhone%2015%20Pro%20-%202025-03-29%20at%2015.14.55.png?alt=media&token=5ff2d983-8b5b-47bb-b370-1fe0683990b2" />
//                                 </div>
//                                 <div className={`inv-light-space-ios`} />
//                             </div>
//                         </div>


//                         <span className='dp-primary-text-secondary invitation-interactive-text' style={{
//                             fontSize: '74px', textAlign: 'left',
//                             fontWeight: 700, maxWidth: '650px'
//                         }}>
//                             Tu invitación, solo para quienes <span className='accent-text--w' >tú elijas.</span>
//                         </span>
//                     </div>

//                     {
//                         invitation &&
//                         <div ref={blockedInvitation} className='invitation-container-box share-inv-cont-box' style={{ gap: '24px' }}>

//                             <div className="qr-card-container qr-adapted" style={{
//                                 height: '800px', transition: 'all 0.3s ease',
//                                 width: '410px', transform: 'scale(0.8)', boxShadow: '0px 0px 8px rgba(0,0,0,0.2)',
//                                 padding: '0px'
//                             }}>
//                                 <div className='module-cover-container' style={{ height: '100%', position: 'relative' }}>

//                                     <div className={'cover-container'}
//                                         style={{
//                                             height: '100%', margin: '0px',
//                                             position: 'relative', borderRadius: '32px'

//                                         }}>


//                                         <div
//                                             className="image-card-qr"
//                                             style={{
//                                                 backgroundImage: `url(${invitation.cover.featured_prod})`,
//                                                 backgroundSize: "cover",
//                                                 backgroundPosition: "center",
//                                                 borderRadius: '0px', borderRight: '32px'
//                                             }}
//                                         ></div>


//                                         <div className='qr-background-cover'
//                                             style={{
//                                                 background: `linear-gradient(to top, ${invitation.generals.theme ? darker(invitation.generals.palette.primary, 0.2) : darker(invitation.generals.palette.primary, 0.2)}, rgba(0,0,0,0))`,
//                                                 borderRadius: '0px'

//                                             }}>



//                                             <div className='cover--title-container' style={{
//                                                 alignItems: invitation.cover.align,
//                                                 marginTop: '20px',
//                                                 flex: 1,
//                                                 width: '100%',
//                                                 padding: '0px 20px', boxSizing: 'border-box'

//                                             }}>
//                                                 <span style={{
//                                                     color: !invitation.cover.color ? invitation.generals.theme ? lighter(invitation.generals.palette.primary, 0.6) : lighter(invitation.generals.palette.accent, 0.6) : invitation.cover.color, width: '100%',
//                                                     textAlign: invitation.cover.justify, fontSize: `${invitation.cover.fontSize}em`, wordBreak: 'break-word',
//                                                     opacity: invitation.cover.opacity,
//                                                     fontFamily: invitation.cover.image,
//                                                     fontWeight: invitation.cover.fontWeight,
//                                                     lineHeight: '0.9',

//                                                 }}>{invitation.cover.title}</span>
//                                             </div>


//                                             <span style={{
//                                                 color: invitation.cover.timerColor,
//                                                 width: '100%',
//                                                 padding: '0px 60px', boxSizing: 'border-box',
//                                                 textAlign: 'center', fontSize: `26px`, wordBreak: 'break-word',
//                                                 opacity: invitation.cover.opacity, fontFamily: invitation.cover.image,
//                                                 lineHeight: '1.1',
//                                                 fontWeight: 600,
//                                                 marginTop: '20px',
//                                                 opacity: '0.8',


//                                             }}>
//                                                 {invitation.greeting.title}
//                                             </span>


//                                             <span style={{
//                                                 color: invitation.cover.timerColor, width: '100%',
//                                                 textAlign: 'center', fontSize: `18px`, wordBreak: 'break-word',
//                                                 opacity: invitation.cover.opacity, fontFamily: invitation.cover.image,
//                                                 lineHeight: '0.8',
//                                                 margin: '20px 0px',
//                                                 opacity: '0.8',
//                                                 marginTop: '10px',

//                                             }}>
//                                                 {formatDate(invitation.cover.date)}
//                                             </span>



//                                             <div style={{
//                                                 display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column',
//                                                 overflow: 'hidden',
//                                                 // height: '210px', minHeight: '210px',
//                                                 opacity: '0.8',

//                                                 marginBottom: '30px'
//                                             }}>


//                                                 <QRCodeCanvas

//                                                     bgColor={'transparent'} fgColor={invitation.cover.timerColor}
//                                                     value={`${baseProd}/${invitation.label}/${invitation.generals.eventName}`}
//                                                     size={'80'} />


//                                             </div>



//                                         </div>

//                                     </div>

//                                     <div className='qr-bright-shadow' style={{ borderRadius: '32px' }}></div>
//                                 </div>

//                             </div>


//                             <span className='dp-primary-text-secondary invitation-interactive-text' style={{
//                                 fontSize: '74px', textAlign: 'left',
//                                 fontWeight: 700, maxWidth: '650px'
//                             }}>
//                                 Haz tu tarjeta digital con QR y <span className='accent-text--w'>compartela.</span>
//                             </span>
//                         </div>
//                     }

//                 </div>

//                 <div className='carrusell-butons-container'>
//                     <button className={`carrousell-button${currentCarrousell >= 0 && currentCarrousell < 1250 ? '--selected' : ''}`} onClick={() => handleCarrousell(realInvitation.current.offsetLeft)}></button>
//                     <button className={`carrousell-button${currentCarrousell >= 1250 && currentCarrousell < 2500 ? '--selected' : ''}`} onClick={() => handleCarrousell(cardInvitation.current.offsetLeft)}></button>
//                     <button className={`carrousell-button${currentCarrousell >= 2500 ? '--selected' : ''}`} onClick={() => handleCarrousell(blockedInvitation.current.offsetLeft)}></button>
//                 </div>



//                 <div className='dph-box-cont'>
//                     <div className='dp-head-block'>
//                         <div className='dph-texts-cont'>
//                             <span className='dp-primary-text-secondary'>
//                                 Organiza a tus invitados
//                             </span>
//                             <span className='dp-primary-single-text'>Administra fácilmente tu lista de invitados, controla quién puede ver tu invitación.</span>
//                         </div>

//                         <div className='dph-cards-cont'>
//                             <img alt='' src={decoration.decoration_2} className='decoration-image-admin' />
//                         </div>
//                     </div>

//                     <div className='test-build-invitation-container first-box'>
//                         <div className='try-inv-icon-cont disable-icon'>
//                             <PiMonitorPlayBold />
//                         </div>

//                         <span className='try-inv-head'>Gestiona tus invitados de manera eficiente</span>
//                         <span className='try-inv-single discover-description'>Administra fácilmente tu lista de invitados, controla quién puede ver tu invitación, y recibe confirmaciones de asistencia en tiempo real. Nuestra plataforma te ofrece todas las herramientas necesarias para que la gestión de tus invitados sea sencilla y efectiva.</span>

//                         <div className='test-build-invitation-second-container' >
//                             <img alt='' src={images.guest_page} className='module-image-example' />
//                         </div>

//                         {/* <div className='test-build-invitation-second-container' style={{

//                         }}>
//                             <img src={images.admin_guests} />
//                         </div> */}


//                     </div>

//                     <div className='try-inv-second-section croll-invitation' >
//                         {
//                             guestManagementCards.map((card, index) => (
//                                 <div key={index} className='test-build-invitation-container test-build-small-card'>
//                                     <div className='card-dph-single-col'>
//                                         <div className='try-inv-icon-cont'>
//                                             {card.icon}
//                                         </div>

//                                         <span className='try-inv-head-second' style={{
//                                         }}>{card.title}</span>
//                                         <span style={{
//                                         }} className='try-inv-single-second'>{card.text}</span>
//                                     </div>


//                                 </div>
//                             ))
//                         }

//                     </div>

//                 </div>

//                 <div className='start-building-today'>
//                     <img alt='' src={decoration.decoration_3}
//                         style={{
//                             transform: 'scaleX(-1)'
//                         }}
//                         className='decoration-image-create' />
//                     <span className='dp-primary-text final-text-design' style={{
//                         maxWidth: '30%', lineHeight: 1.2
//                     }}>Comienza <span className='accent-text'>a crear</span> hoy.</span>
//                 </div>


//                 <Link target='_blank' className='start-working-web' to={`https://wa.me/6145338500?text=${encodeURIComponent("Hola, estoy interesado en las invitaciones digitales")}`} style={{ textDecoration: 'none' }}>
//                     <Button
//                         id="access-button"
//                         style={{ borderRadius: '99px' }}
//                     >
//                         COMENZAR A CREAR
//                     </Button>
//                 </Link>

//             </div>

//             <Link target='_blank' to={`https://wa.me/6145338500?text=${encodeURIComponent("Hola, estoy interesado en las invitaciones digitales")}`} style={{ textDecoration: 'none' }}>
//                 <Button style={{ opacity: isVisible ? 1 : 0, transition: 'all 0.3s ease' }} className='start-working-btn'
//                 >
//                     MÁS INFORMACIÓN
//                 </Button>
//             </Link>

//             <FooterApp></FooterApp>


//         </div >


//     )
// }
