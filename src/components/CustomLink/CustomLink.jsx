import React from 'react'
import './custom_link.css'
import { Button, Dropdown, message } from 'antd'
import { ChevronLeft, Link2, SquareArrowUpRight } from 'lucide-react'
import { StorageImages } from '../ImagesStorage/StorageImages'

export const CustomLink = ({ backuImage, isHeader, urlImage, url, id, handleImage, name, label }) => {

    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success('Copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    return (
        <Dropdown
            arrow
            placement='bottomRight'
            trigger={['click']}
            popupRender={() => (
                <div className='custom_link_cont'>
                    <div className='custom_link'>
                        <div className='custom_title'>
                            <span>Personaliza tu link</span>
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
                                    <span>¡Estamos muy felices de invitarte!</span>
                                    <span><b>{name}</b></span>
                                    <span className='green_text'>Leer más</span>
                                    <small>I attend - Plan with ease</small>
                                    <div className='cta_container'>
                                        <span className='green_text_cta'><SquareArrowUpRight size={10} />Ver invitación</span>
                                    </div>
                                </div>
                            </div>


                        </div>
                    </div>
                    <Button
                        style={{ width: '100%' }}
                        onClick={() => copyToClipboard(`${url}`)}
                        icon={<Link2 size={14} />} className="primarybutton--active">
                        Copiar link
                    </Button>
                </div>
            )}
        >
            <Button
                style={{ maxHeight: isHeader ? 25 : undefined, borderRadius: isHeader ? '12px' : '99px', minHeight: label ? '44px' : undefined, background: label ? '#00000080' : undefined, backdropFilter: label ? 'blur(10px)' : undefined, border: label ? 'none' : undefined, color: label ? '#FFF' : undefined, boxShadow: label ? '0px 0px 8px rgba(0,0,0,0.2)' : undefined }}
                icon={<Link2 size={14} />} className={`primarybutton${isHeader ? '--active' : ''}`}>
                {label ?? (isHeader ? 'Copiar link' : 'Link del evento')}
            </Button>
        </Dropdown>
    )
}
