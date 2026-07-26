import React from 'react'
import './footer-app.css'
import { FaHeadset, FaInstagram, FaRegEnvelope, FaRegPaperPlane, FaWhatsapp } from 'react-icons/fa'

export const FooterApp = ({ shared_user }) => {

    const links = shared_user?.active
        ? [
            { href: 'https://wa.me/6145338500',                               icon: <FaHeadset />,        label: 'Ayuda' },
            { href: `https://wa.me/${shared_user.whatsapp}`,                   icon: <FaWhatsapp />,       label: 'Contacto', hide: !shared_user.whatsapp },
            { href: `https://www.instagram.com/${shared_user.instagram}`,      icon: <FaInstagram />,      label: `${shared_user.instagram}`, hide: !shared_user.instagram },
            { href: `mailto:${shared_user.email}`,                             icon: <FaRegEnvelope />,    label: shared_user.email, hide: !shared_user.email },
            { href: '/legal',                                                   icon: <FaRegPaperPlane />,  label: 'Legal' },
        ]
        : [
            { href: 'https://wa.me/6145338500',                               icon: <FaHeadset />,        label: 'Ayuda' },
            { href: 'https://wa.me/6145338500',                               icon: <FaWhatsapp />,       label: 'Contacto' },
            { href: 'https://www.instagram.com/iattend.mx',                   icon: <FaInstagram />,      label: 'iattend.mx' },
            { href: 'mailto:contacto.iattend@gmail.com',                      icon: <FaRegEnvelope />,    label: 'Mail' },
            { href: '/legal',                                                   icon: <FaRegPaperPlane />,  label: 'Legal' },
        ]

    return (
        <div className="fa-main-cont">
            <div className="fa-footer-cont">

                <div className="fa-footer-main-col">
                    <a href="/invitations" className="fa-footer-row">
                        <img className="fa-footer-logo" src="/images/logo_blue.png" alt="I attend" />
                    </a>

                    <div className="fa-links-col">
                        {links.filter(l => !l.hide).map((l, i) => (
                            <a key={i} href={l.href} rel="noreferrer" target="_blank" className="fa-footer-link">
                                {l.icon} {l.label}
                            </a>
                        ))}
                    </div>
                </div>

                {/* <div className="fa-links">
                    <div className="fa-link-cont">
                        <span className="fa-link-heading">Servicios</span>
                        <a href="/about/invitacion-digital">Invitación Paperless</a>
                        <a href="/about/guest-management">Gestión de invitados</a>
                        <a href="/about/mapa-de-mesas">Organización por mesas</a>
                        <a href="/about/pases-digitales">Pases digitales</a>
                        <a href="/about/privacidad">Eventos privados</a>
                        <a href="/about/envios-whatsapp">Envíos automáticos</a>
                    </div>

                    <div className="fa-link-cont">
                        <span className="fa-link-heading">Extras</span>
                        <a href="/about/cliente-ideal">I attend para ti</a>
                        <a href="/about/como-funciona">Cómo usar I attend</a>
                        <a href="/about/opiniones">Reviews</a>
                        <a href="/about/faqs">FAQs</a>
                    </div>
                </div> */}

            </div>
        </div>
    )
}
