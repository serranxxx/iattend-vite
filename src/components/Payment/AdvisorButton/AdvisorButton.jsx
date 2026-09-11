import { FaWhatsapp } from 'react-icons/fa6'
import { useTranslation } from 'react-i18next'
import { advisorWhatsappUrl } from '../../../helpers/contact'
import './AdvisorButton.css'

/**
 * Salida a WhatsApp con el asesor de I attend desde los modales de venta.
 *
 * `context` elige el mensaje que queda precargado en el chat ('plans' para
 * contratar desde free, 'pro' para el upgrade de lite). Es un borrador: abre la
 * conversación y el usuario decide si lo manda.
 */
export const AdvisorButton = ({ context = 'plans' }) => {
    const { t } = useTranslation()

    return (
        <a
            className='advisor-button'
            href={advisorWhatsappUrl(t(`advisor.text_${context}`))}
            target='_blank'
            rel='noopener noreferrer'
        >
            <FaWhatsapp size={17} />
            <span>{t('advisor.cta')}</span>
        </a>
    )
}
