import React, { useEffect, useState } from 'react'
import './custom_link.css'
import { Button, Dropdown, message } from 'antd'
import { ArrowUp, ChevronLeft, Copy, Forward, Link2, Share2, SquareArrowUpRight } from 'lucide-react'
import { StorageImages } from '../ImagesStorage/StorageImages'
import { useTranslation } from 'react-i18next'

export const CustomLink = ({ isSmall, backuImage, isHeader, urlImage, url, id, handleImage, name, label, buttonText, maxHeight = 25, icon: iconOverride, setupRequired, onSetupNeeded }) => {

    const { t } = useTranslation()
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 750)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success(t('custom_link.copied'))
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const handleShare = async (textToCopy) => {
        const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
        if (isMobileDevice && navigator.share) {
            try {
                await navigator.share({
                    title: name,
                    text: '¡Te invitamos a un evento especial!',
                    url: window.location.href,
                });
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }
        await copyToClipboard(textToCopy);
    };

    const triggerStyle = { maxHeight: isHeader ? maxHeight : undefined, borderRadius: '99px', minHeight: label ? '44px' : undefined, background: label ? '#00000080' : undefined, backdropFilter: label ? 'blur(10px)' : undefined, border: label ? 'none' : undefined, color: label ? '#FFF' : undefined, boxShadow: label ? '0px 0px 8px rgba(0,0,0,0.2)' : undefined }
    const triggerLabel = isSmall ? '' : label ?? buttonText ?? (isHeader ? t('custom_link.copy_btn') : t('custom_link.link_btn'))

    if (isMobile) {
        return (
            <Button
                onClick={() => setupRequired ? onSetupNeeded?.() : handleShare(url)}
                style={triggerStyle}
                icon={iconOverride ?? <Share2 size={14} />}
            >
                {triggerLabel}
            </Button>
        )
    }

    const setupPopup = (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 6px 24px rgba(0,0,0,0.12)', width: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Información pendiente</span>
            <span style={{ fontSize: 13, color: '#666' }}>Completa la información pendiente de tu invitación para poder compartir el link.</span>
            <Button className='primarybutton--active' style={{ borderRadius: 99, width: '100%' }} onClick={onSetupNeeded} icon={<ArrowUp size={13} />}>
                Completar información
            </Button>
        </div>
    )

    return (
        <Dropdown
            arrow
            placement='bottomRight'
            trigger={['click']}
            popupRender={() => setupRequired ? setupPopup : (
                <div className='custom_link_cont'>
                    <div className='custom_link'>
                        <div className='custom_title'>
                            <span>{t('custom_link.personalize')}</span>
                        </div>
                        <div className='custom_image_cont'>

                            <img src='/images/whats_1.png' alt='' />

                            <div className='custom_header'>
                                <ChevronLeft size={14} />
                                <div className='custom_logo'>
                                    <img src='/images/icon_pp.png' alt='' />
                                </div>
                                <span>I attend</span>
                            </div>


                            <div className='message_cont'>
                                <div className='message_image_cont'>
                                    <img className='message_image' src={urlImage ?? backuImage} alt='' />
                                    <StorageImages invitationID={id} handleImage={handleImage} type={'side-events'} absolute={true} small={true} />
                                </div>

                                <div className='message_info_cont'>
                                    <span>{t('custom_link.invite_message')}</span>
                                    <span><b>{name}</b></span>
                                    <span className='green_text'>{t('custom_link.read_more')}</span>
                                    <small>I attend - Plan with ease</small>
                                    <div className='cta_container'>
                                        <span className='green_text_cta'><SquareArrowUpRight size={10} />{t('custom_link.view_invitation')}</span>
                                    </div>
                                </div>
                            </div>


                        </div>
                    </div>
                    <Button
                        style={{ width: '100%' }}
                        onClick={() => handleShare(url)}
                        icon={<Copy size={14} />} className="primarybutton--active">
                        {t('custom_link.copy_url_btn')}
                    </Button>
                </div>
            )}
        >
            <Button style={triggerStyle} icon={<Forward size={14} />} className={`primarybutton${isHeader ? '--active' : ''}`}>
                {triggerLabel}
            </Button>
        </Dropdown>
    )
}
