// Datos de contacto de I attend. Viven aquí porque los usan el modal de soporte
// del header y los modales de venta del dashboard: tener el número repetido en
// cada archivo garantiza que tarde o temprano se actualice solo en uno.
export const ADVISOR_WHATSAPP = '+526143681307';
export const SUPPORT_EMAIL = 'contacto.iattend@gmail.com';

/**
 * Link de WhatsApp al asesor. `text` queda como borrador en el chat: abre la
 * conversación, no envía nada — el usuario decide si manda el mensaje.
 */
export const advisorWhatsappUrl = (text) => {
    const number = ADVISOR_WHATSAPP.replace(/\D/g, '');
    return text
        ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
        : `https://wa.me/${number}`;
};
