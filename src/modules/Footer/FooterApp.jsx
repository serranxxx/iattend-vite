import React from 'react'
import './footer-app.css'
import { FaInstagram, FaRegEnvelope, FaRegPaperPlane, FaWhatsapp } from 'react-icons/fa6'
import { TfiWorld } from "react-icons/tfi";
import { FaHeadset } from 'react-icons/fa'
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

const toggleLanguage = () => {
    const next = i18n.language === 'es' ? 'en' : 'es';
    localStorage.setItem('lang', next);
    window.location.reload();
};

export const FooterApp = ({ shared_user }) => {
    const { t } = useTranslation();

    return (
        <div style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                                </div>
                            </div>
                            :
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                <img src="images/morado.png" alt='' style={{ width: '100px' }} />
                            </div>
                    }

                    {
                        shared_user?.active ?
                            <div className='footer-links-cont'>
                                <a href='https://wa.me/6145338500' rel="noreferrer" target='_blank' className='footer-link'><FaHeadset /> {t('footer.help')}</a>
                                {shared_user?.whatsapp && <a href={`https://wa.me/${shared_user.whatsapp}`} rel="noreferrer" target='_blank' className='footer-link'><FaWhatsapp /> {t('footer.contact')}</a>}
                                {shared_user?.instagram && <a href={`https://www.instagram.com/${shared_user.instagram}`} rel="noreferrer" target='_blank' className='footer-link'><FaInstagram />@{shared_user.instagram}</a>}
                                {shared_user?.email && <a href={`mailto:${shared_user.email}`} rel="noreferrer" target='_blank' className='footer-link'><FaRegEnvelope /> {shared_user.email}</a>}
                                {shared_user?.webpage && <a href='/legal' className='footer-link'><TfiWorld /> {shared_user.webpage}</a>}
                                <a href='/legal' className='footer-link'><FaRegPaperPlane /> {t('footer.legal')}</a>
                                <button className='footer-lang-toggle' onClick={toggleLanguage}>{t('footer.lang_toggle')}</button>
                            </div>
                            :
                            <div className='footer-links-cont'>
                                <a href='https://wa.me/6145394836' rel="noreferrer" target='_blank' className='footer-link'><FaHeadset /> {t('footer.help')}</a>
                                <a href='https://wa.me/6145338500' rel="noreferrer" target='_blank' className='footer-link'><FaWhatsapp /> {t('footer.contact')}</a>
                                <a href='https://www.instagram.com/iattend.mx' rel="noreferrer" target='_blank' className='footer-link'><FaInstagram />@iattend.mx</a>
                                <a href='mailto:contacto.iattend@gmail.com' rel="noreferrer" target='_blank' className='footer-link'><FaRegEnvelope /> {t('footer.mail')}</a>
                                <a href='/legal' className='footer-link'><FaRegPaperPlane /> {t('footer.legal')}</a>
                                <button className='footer-lang-toggle' onClick={toggleLanguage}>{t('footer.lang_toggle')}</button>
                            </div>
                    }
                </div>

            </div>
        </div>

    )
}
