import React from 'react'
import { Instagram, Mail, MessageCircle } from 'lucide-react'
import './footer-app.css'
import { enlacesFooter } from './enlacesFooter'
import logoNegro from '/images/logo_negro.png'

const ICONOS = { whatsapp: MessageCircle, mail: Mail, instagram: Instagram }

const externo = (href) => (href.startsWith('/') ? {} : { target: '_blank', rel: 'noreferrer' })

// Pie de la app, el mismo en todas las pantallas: a la izquierda © y Legal; a la
// derecha Cómo funciona, Ayuda y los botones redondos de contacto. En el
// celular (< 768 px) cambia de acomodo: arriba el logo de I attend y los
// botones de contacto, en medio Cómo funciona · Ayuda · Legal y abajo el ©
// (las dos versiones están en el DOM y el CSS enseña una). `className`
// deja ajustar el espacio desde la página que lo usa (PlannerLayout lo empuja
// al fondo de su columna).
export const FooterApp = ({ shared_user, className = '' }) => {
    const { legal, textos, contacto } = enlacesFooter(shared_user)
    const anio = new Date().getFullYear()

    const iconos = (
        <div className="fa-iconos">
            {contacto.map(c => {
                const Icono = ICONOS[c.key]
                return (
                    <a key={c.key} href={c.href} className="fa-icono" aria-label={c.label} title={c.label} {...externo(c.href)}>
                        <Icono size={18} strokeWidth={1.75} />
                    </a>
                )
            })}
        </div>
    )

    return (
        <footer className={`fa-main-cont ${className}`}>
            <div className="fa-footer-cont">
                <div className="fa-lado">
                    <span className="fa-copy">© {anio} I attend</span>
                    <a href={legal.href} className="fa-link fa-link-suave">{legal.label}</a>
                </div>

                <div className="fa-lado">
                    {textos.map(l => (
                        <a key={l.label} href={l.href} className="fa-link" {...externo(l.href)}>{l.label}</a>
                    ))}
                    {contacto.length > 0 && <span className="fa-divisor" aria-hidden />}
                    {iconos}
                </div>
            </div>

            {/* Celular: logo + contacto · enlaces · © */}
            <div className="fa-movil">
                <div className="fa-movil-arriba">
                    <img src={logoNegro} alt='I attend' className="fa-logo" />
                    {iconos}
                </div>
                <div className="fa-movil-enlaces">
                    {textos.map(l => (
                        <a key={l.label} href={l.href} className="fa-link" {...externo(l.href)}>{l.label}</a>
                    ))}
                    <a href={legal.href} className="fa-link fa-link-suave">{legal.label}</a>
                </div>
                <span className="fa-copy">© {anio} I attend</span>
            </div>
        </footer>
    )
}
