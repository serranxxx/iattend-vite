import React, { useState } from 'react'
import './whatsapp-messages.css'
import { Badge, Button, Dropdown, Empty } from 'antd';
import { ChevronDown, FileText, Inbox, Image, Info, Mic, MapPin, SmilePlus, Video, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OpenChat } from './OpenChat/OpenChat';
import { supabase } from '../../../lib/supabase';

export const WhatsappMessages = ({ id, conversations, guestsByPhone = new Map(), invitationsById = new Map(), isAdmin, onMarkRead, className = '', style, onClose }) => {

    const { t } = useTranslation()
    const [openMessage, setOpenMessage] = useState(null)

    const guestName = (phone, name) =>
        guestsByPhone.get(String(phone).replace(/\D/g, '')) ?? name;

    const invitationName = (invitation_id) => {

        const item = invitationsById.get(invitation_id)
        return item.name
    }


    const phoneFormatter = (params) => {
        const val = typeof params === 'object' && params !== null ? params.value : params;
        if (!val) return "";

        const digits = String(val).replace(/\D/g, "");

        // +52 México con "1" de WhatsApp (13 dígitos: 52 + 1 + 10)
        if (digits.length === 13 && digits.startsWith('52')) {
            const phone = digits.slice(3); // omite 52 + 1
            return `+52 (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
        }

        // +52 México (12 dígitos)
        if (digits.length === 12) {
            const country = digits.slice(0, 2);
            const phone = digits.slice(2);
            return `+${country} (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
        }

        // +1 US/Canadá (11 dígitos)
        if (digits.length === 11) {
            const country = digits.slice(0, 1);
            const phone = digits.slice(1);
            return `+${country} (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
        }

        // Local sin código (10 dígitos)
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }

        return val;
    };

    const markConversationAsRead = async (phone) => {
        if (isAdmin) return
        if (onMarkRead) onMarkRead(phone);
        await supabase
            .from('whatsapp_incoming_messages')
            .update({ read: true })
            .eq('from_phone', phone)
            .eq('read', false);
    };

    const openConversation = (phone, convId) => {
        setOpenMessage((prev) => {
            if (prev === convId) return null;
            markConversationAsRead(phone);
            return convId;
        });
    };

    const MessagePreview = ({ message }) => {
        const previews = {
            image: { icon: <Image size={13} />, label: 'Foto' },
            video: { icon: <Video size={13} />, label: 'Vídeo' },
            audio: { icon: <Mic size={13} />, label: 'Audio' },
            document: { icon: <FileText size={13} />, label: 'Documento' },
            sticker: { icon: <SmilePlus size={13} />, label: 'Sticker' },
            location: { icon: <MapPin size={13} />, label: 'Ubicación' },
        };
        const p = previews[message.message_type];
        if (p) return (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.5 }}>
                {p.icon}{p.label}
            </span>
        );
        const body = message.body ?? '';
        return <span style={{ opacity: 0.5 }}>{body.length > 40 ? `${body.slice(0, 40)}...` : body}</span>;
    };

    const messagesCount = (conv) => {
        let count = 0
        let read = 0
        conv.messages.forEach(msj => {
            !msj.read && msj.direction === 'inbound' ? count += 1 : read += 1;
        });

        return count
    }


    return (
        <div className={`whatsapp_main_cont${className ? ` ${className}` : ''}`} style={{ paddingBottom: !openMessage ? '0px' : undefined, ...style }}>
            <div className='messages_main_row' style={{ gap: '12px', borderBottom: '1px solid #ebebeb', justifyContent: 'space-between' }}>
                <div className='messages_main_row' style={{ gap: '12px', padding: 0 }}>
                    <Inbox size={18} />
                    <span className='messages_title'>{t('guests.whatsapp_inbox_title')}</span>
                </div>
                <div style={{
                    display:'flex',alignItems:'center',justifyContent:'center',gap:'0px'
                }}>
                    <Dropdown
                        trigger={['click']}
                        arrow
                        popupRender={() => (
                            <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', maxWidth: 240, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', lineHeight: 1.6, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <p style={{ margin: 0 }}>{t('guests.whatsapp_inbox_info_1')}</p>
                                <p style={{ margin: 0 }}>{t('guests.whatsapp_inbox_info_2')}</p>
                            </div>
                        )}
                    >
                        <Button type='text' icon={<Info size={16} />} />
                    </Dropdown>
                    {onClose && <Button type='text' icon={<X size={16} />} onClick={onClose} />}
                </div>
            </div>
            <div
                className={`mesages_cont scroll-invitation${openMessage !== null ? ' mesages_cont_open' : ''}`}>
                {conversations.length === 0 && (
                    <Empty description={t('guests.whatsapp_inbox_empty')} style={{ margin: 'auto', alignSelf: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} />
                )}
                {
                    conversations.map((conversation) => {
                        const convId = `${conversation.phone}-${conversation.invitation_id}`;
                        if (openMessage !== null && openMessage !== convId) return null;
                        return (
                            <div
                                key={convId} className={`whatsapp_card`}
                                style={{
                                    height: openMessage === convId ? '100%' : '78px',
                                    alignItems: openMessage === convId ? 'flex-start' : 'center'
                                }}
                            >
                                {
                                    openMessage === convId ?

                                        <OpenChat name={guestName(conversation.phone, conversation.messages[0].contact_name)} phoneFormatter={phoneFormatter} conversation={conversation} setOpenMessage={setOpenMessage} invitation_id={id ?? conversation.invitation_id} />

                                        :
                                        <div onClick={() => openConversation(conversation.phone, convId)} className='messages_main_row' style={{ justifyContent: 'space-between', padding: '16px', width: '100%' }}>
                                            <div className='messages_main_row' style={{ padding: 0 }}>
                                                <Badge color='#d2bfdd' offset={[-2, 2]} size='large'
                                                    count={messagesCount(conversation)}>
                                                    <div className='message_icon'>
                                                        {guestName(conversation.phone, conversation.messages[0].contact_name)?.[0]}
                                                    </div>
                                                </Badge>

                                                <div className='message_col'>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px' }}>
                                                        <span style={{ fontWeight: 600 }}>{guestName(conversation.phone, conversation.messages[0].contact_name)}</span>
                                                        {isAdmin && (
                                                            <small style={{ opacity: 0.5, lineHeight: 1 }}>({invitationName(conversation.invitation_id)})</small>
                                                        )}
                                                    </div>
                                                    <MessagePreview message={[...conversation.messages].reverse().find(m => m.direction === 'inbound') ?? conversation.messages[0]} />
                                                </div>
                                            </div>

                                            {/* <Button
                                                style={{ transform: openMessage === convId ? 'rotate(180deg)' : 'rotate(0deg)', transformStyle: 'all 0.3s ease' }}
                                                onClick={() => openConversation(convId)} type='text' icon={<ChevronDown size={14} />} /> */}
                                        </div>
                                }


                            </div>
                        );
                    })
                }
            </div>
            {/* <div className='messages_main_col'>
                <span>Nuevos mensajes</span>
                <div className="mesages_cont scroll-invitation">
                    {
                        [1, 1, 1, 1, 1, 1, 1, 11, 1, 1, 1].map((i, index) => (
                            <div className='whatsapp_card' key={index}>

                            </div>
                        ))
                    }
                </div>
            </div>

            <div className='messages_main_col'>
                <span>Mis mensajes</span>
                <div className="mesages_cont scroll-invitation">
                    {
                        [1, 1, 1, 1, 1, 1, 1, 11, 1, 1, 1].map((i, index) => (
                            <div className='whatsapp_card' key={index}>

                            </div>
                        ))
                    }
                </div>
            </div> */}
        </div>
    )
}
