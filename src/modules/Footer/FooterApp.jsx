import React from 'react'
import './footer-app.css'
import { FaInstagram, FaRegEnvelope, FaRegPaperPlane, FaWhatsapp } from 'react-icons/fa6'
import { TfiWorld } from "react-icons/tfi";
import { FaHeadset } from 'react-icons/fa'
import { Grid } from "antd";

const { useBreakpoint } = Grid;


export const FooterApp = ({ shared_user }) => {

    const screens = useBreakpoint();


    return (
        <div style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            // position:'fixed', bottom: '0px'
            // backgroundColor: 'var(--sc-color)'
        }}>

            <div className='footer-app-container' style={{ justifyContent: 'center' }}>
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1480px'
                }}>

                    {
                        shared_user?.active ?
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                    <img src={shared_user?.logo} alt='' style={{ minWidth: '200px' }} />
                                    {/* <span className='footer-link'>{shared_user?.name}</span> */}
                                </div>

                            </div>
                            :

                            !screens.xs &&
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                <img src="images/morado.png" alt='' style={{ width: '100px' }} />
                                {/* <span style={{fontSize:'12px'}} className='footer-link'>Diseña, comparte, celebra</span> */}
                            </div>

                    }


                    {
                        shared_user?.active ?
                            <div className='footer-links-cont'>
                                <a href='https://wa.me/6145338500' rel="noreferrer" target='_blank' className='footer-link'><FaHeadset /> Ayuda</a>
                                {
                                    shared_user?.whatsapp && <a href={`https://wa.me/${shared_user.whatsapp}`} rel="noreferrer" target='_blank' className='footer-link'><FaWhatsapp /> Contacto</a>
                                }
                                {
                                    shared_user?.instagram && <a href={`https://www.instagram.com/${shared_user.instagram}`} rel="noreferrer" target='_blank' className='footer-link'><FaInstagram />@{shared_user.instagram}</a>
                                }

                                {
                                    shared_user?.email && <a href={`mailto:${shared_user.email}`} rel="noreferrer" target='_blank' className='footer-link'>
                                        <FaRegEnvelope /> {shared_user.email}
                                    </a>
                                }
                                {
                                    shared_user?.webpage && <a href='/legal' className='footer-link'><TfiWorld /> {shared_user.webpage}</a>
                                }
                                <a href='/legal' className='footer-link'><FaRegPaperPlane /> Legal</a>
                            </div>
                            :
                            <div className='footer-links-cont'>
                                <a href='https://wa.me/6145394836' rel="noreferrer" target='_blank' className='footer-link'><FaHeadset /> Ayuda</a>
                                <a href='https://wa.me/6145338500' rel="noreferrer" target='_blank' className='footer-link'><FaWhatsapp /> Contacto</a>
                                <a href='https://www.instagram.com/iattend.mx' rel="noreferrer" target='_blank' className='footer-link'><FaInstagram />@iattend.mx</a>
                                <a href='mailto:contacto.iattend@gmail.com' rel="noreferrer" target='_blank' className='footer-link'>
                                    <FaRegEnvelope /> Mail
                                </a>
                                <a href='/legal' className='footer-link'><FaRegPaperPlane /> Legal</a>
                                {/* <a href='/linktree' className='footer-link'><FaFolderTree /> Link Tree</a> */}
                            </div>
                    }
                </div>

            </div>
        </div>

    )
}
