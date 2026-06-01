
import { Button, Tooltip } from 'antd';
import { Check, CheckCheck, ChevronUp, Download, FileText, MapPin, Play, SendHorizontal, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react'
import './open-chat.css'
import TextArea from 'antd/es/input/TextArea';
import axios from 'axios';
import { FaWhatsapp } from 'react-icons/fa6';


const mediaUrl = (msj) =>
    msj.media_url || (msj.media_id ? `${import.meta.env.VITE_API_URL}/api/whats/media/${msj.media_id}` : null);

const MediaActions = ({ url }) => url ? (
    <div className='msg_media_actions'>
        <a href={url} target='_blank' rel='noreferrer' className='msg_media_btn'><Play size={13} /></a>
        <a href={url} download className='msg_media_btn'><Download size={13} /></a>
    </div>
) : null;

const MessageContent = ({ msj, onImageClick }) => {
    switch (msj.message_type) {
        case 'text':
            return <span className='open_message_body'>{msj.body}</span>;
        case 'image': {
            const url = mediaUrl(msj);
            return (
                <div className='msg_media_wrapper'>
                    <img src={url} className='msg_image' onClick={() => url && onImageClick(url)} alt={msj.body || ''} />
                    {/* <MediaActions url={url} /> */}
                </div>
            );
        }
        case 'video': {
            const url = mediaUrl(msj);
            return (
                <div className='msg_video_placeholder' onClick={() => url && window.open(url, '_blank')} style={{ cursor: url ? 'pointer' : 'default' }}>
                    <Play size={16} />
                    <span>Ver video</span>
                </div>
            );
        }
        case 'audio': {
            const url = mediaUrl(msj);
            return <audio controls src={url} className='msg_audio' />;
        }
        case 'document':
            return (
                <div className='msg_document'>
                    <FileText size={18} />
                    <span className='msg_document_name'>{msj.body || 'Documento'}</span>
                    <a href={msj.media_url} target='_blank' rel='noreferrer' className='msg_document_dl'>
                        <Download size={16} />
                    </a>
                </div>
            );
        case 'sticker': {
            const url = mediaUrl(msj);
            return (
                <div className='msg_media_wrapper'>
                    <img src={url} className='msg_sticker' alt='' />
                    {/* <MediaActions url={url} /> */}
                </div>
            );
        }
        case 'reaction':
            return <span className='msg_reaction'>{msj.body}</span>;
        case 'location': {
            const match = msj.body?.match(/lat:([-\d.]+),\s*lng:([-\d.]+)/);
            const url = match ? `https://maps.google.com/?q=${match[1]},${match[2]}` : '#';
            return (
                <a href={url} target='_blank' rel='noreferrer' className='msg_location'>
                    <MapPin size={16} />
                    <span>Ver ubicación</span>
                </a>
            );
        }
        case 'button':
        case 'interactive':
            return <span className='open_message_body msg_pill'>{msj.body}</span>;
        default:
            return <span className='msg_unsupported'>Mensaje no soportado</span>;
    }
};

export const OpenChat = ({ name, conversation, setOpenMessage, invitation_id, phoneFormatter }) => {

    const { messages, phone } = conversation

    const [reply, setReply] = useState("")
    const [optimisticMessages, setOptimisticMessages] = useState([])
    const [lightboxSrc, setLightboxSrc] = useState(null)



    const sendFreeText = async (phone, reply) => {
        const to = String(phone ?? '').replace(/^\+/, '')
        if (!to || !reply?.trim()) return;

        const optimistic = {
            body: reply,
            timestamp: new Date().toISOString(),
            direction: 'outbound',
            _optimistic: true
        };
        setOptimisticMessages(prev => [...prev, optimistic]);
        setReply("");

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/whats/freetext`,
                { to, text: reply, invitation_id: invitation_id }
            );
            if (!response.data.ok) {
                setOptimisticMessages(prev => prev.filter(m => m !== optimistic));
            }
            return response.data;
        } catch (error) {
            setOptimisticMessages(prev => prev.filter(m => m !== optimistic));
            console.error(error?.response?.data || error.message);
            throw error;
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return 'Hoy';
        if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
        return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const bodyRef = useRef(null);

    const sortedMessages = useMemo(() =>
        [...(messages ?? [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        , [messages]);

    // Clear optimistic messages when real data arrives from subscription
    useEffect(() => {
        setOptimisticMessages([]);
    }, [messages]);

    const displayMessages = useMemo(() => {
        if (optimisticMessages.length === 0) return sortedMessages;
        return [...sortedMessages, ...optimisticMessages]
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }, [sortedMessages, optimisticMessages]);

    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [displayMessages]);

    const [now] = useState(() => Date.now());

    const canReply = useMemo(() => {
        const last = sortedMessages[sortedMessages.length - 1];
        if (!last?.timestamp) return false;
        return (now - new Date(last.timestamp).getTime()) < 24 * 60 * 60 * 1000;
    }, [sortedMessages, now]);


    return (
        <div className='open_chat_cont'>
            <div className='open_chat_row'>
                <div className='messages_main_row' style={{ padding: 0 }}>
                    <div className='message_icon'>
                        {name?.[0]}
                    </div>

                    <div className='message_col'>
                        <span style={{ fontWeight: 600 }}>{name ?? ""}</span>
                        <small style={{ lineHeight: 1 }}>{phoneFormatter(phone)}</small>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Tooltip title="Contestar desde Whatsapp">
                        <Button href={`https://wa.me/${phone}`} target='_blank' icon={<FaWhatsapp />} />
                    </Tooltip>

                    <Button
                        onClick={() => setOpenMessage(null)} icon={<X size={14} />} />
                </div>
            </div>

            <div className='body_messages' ref={bodyRef}>
                {
                    displayMessages.map((msj, index) => {
                        const msgDate = new Date(msj.timestamp).toDateString();
                        const prev = index > 0 ? displayMessages[index - 1] : null;
                        const showDateSep = msgDate !== (prev ? new Date(prev.timestamp).toDateString() : null);
                        const sameSender = !showDateSep && prev?.direction === msj.direction;
                        return (
                            <React.Fragment key={index}>
                                {showDateSep && (
                                    <div className='date_separator'>
                                        <span>{formatDate(msj.timestamp)}</span>
                                    </div>
                                )}
                                {(() => {
                                    const graphic = msj.message_type === 'sticker' || msj.message_type === 'image';
                                    return (
                                        <div className={`message_container${sameSender ? ' same_sender' : ''}`} style={{
                                            justifyContent: msj.direction === 'inbound' ? 'flex-start' : 'flex-end'
                                        }}>

                                            <div className={`open_message_cont ${msj.direction !== 'inbound' ? 'outbound_mesage' : ''} ${msj._optimistic ? 'optimistic_message' : ''}`}>
                                                <MessageContent msj={msj} onImageClick={setLightboxSrc} />
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', position: graphic ? 'absolute' : 'static', right: '16px', bottom: '8px', color: graphic ? '#FFF' : undefined }}>
                                                    <small className='open_message_time'>{formatTime(msj?.timestamp)}</small>
                                                    {msj.direction === 'outbound' && (
                                                        <div style={{ minWidth: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {msj.status === 'delivered' ? <Check size={14} style={{ opacity: '0.5' }} /> :
                                                                msj.status === 'read' ? <CheckCheck size={14} /> : <></>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                    );
                                })()}
                            </React.Fragment>
                        );
                    })
                }
            </div>

            <div className='footer_messages'>
                {canReply ? (
                    <>
                        <TextArea
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            autoSize={{ minRows: 1, maxRows: 3 }}
                            placeholder='Escribe un mensaje...'
                            className='footer_textarea'
                        />
                        <Button
                            onClick={() => sendFreeText(phone, reply)}
                            type='primary'
                            shape='circle'
                            icon={<SendHorizontal size={14} style={{ marginTop: '3px' }} />}
                            className='footer_send_btn'
                        />
                    </>
                ) : (
                    <span className='footer_expired_label'>
                        Solo puedes responder dentro de las primeras 24 horas después de recibir el mensaje.
                    </span>
                )}
            </div>

            {lightboxSrc && (
                <div className='lightbox_overlay' onClick={() => setLightboxSrc(null)}>
                    <img
                        src={lightboxSrc}
                        className='lightbox_img'
                        onClick={e => e.stopPropagation()}
                        alt='preview'
                    />
                </div>
            )}
        </div>
    )
}
