import { advisorWhatsappUrl } from '../../helpers/contact'

// Links del pie de la app (FooterApp): `legal` junto al ©, `textos` a la derecha
// y `contacto` como botones redondos con ícono (WhatsApp, correo, Instagram).
// Con `shared_user` activo, el contacto es el de quien compartió la invitación.
export const enlacesFooter = (shared_user) => {
    const propio = shared_user?.active
    const contacto = propio
        ? [
            { key: 'whatsapp', href: shared_user.whatsapp && `https://wa.me/${shared_user.whatsapp}`, label: 'WhatsApp' },
            { key: 'mail', href: shared_user.email && `mailto:${shared_user.email}`, label: shared_user.email },
            { key: 'instagram', href: shared_user.instagram && `https://www.instagram.com/${shared_user.instagram}`, label: `@${shared_user.instagram}` },
        ]
        : [
            { key: 'whatsapp', href: advisorWhatsappUrl(), label: 'WhatsApp' },
            { key: 'mail', href: 'mailto:contacto.iattend@gmail.com', label: 'contacto.iattend@gmail.com' },
            { key: 'instagram', href: 'https://www.instagram.com/iattend.mx', label: '@iattend.mx' },
        ]
    return {
        legal: { href: '/legal', label: 'Legal' },
        textos: [
            { href: '/funciones', label: 'Cómo funciona' },
            { href: advisorWhatsappUrl(), label: 'Ayuda' },
        ],
        contacto: contacto.filter(c => c.href),
    }
}
