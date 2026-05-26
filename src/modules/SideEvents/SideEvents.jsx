import { Button, Checkbox, Col, ColorPicker, DatePicker, Drawer, Dropdown, Grid, Input, Layout, message, Popconfirm, Progress, Row, Select, Slider, Spin, Table, Tabs, Tooltip, Upload } from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import './side-events.css'
import { LuCalendarClock, LuCheck, LuClock, LuCoins, LuCopy, LuCornerUpLeft, LuFolderOpen, LuImage, LuImageOff, LuLock, LuMapPin, LuPalette, LuPlay, LuPlus, LuSend, LuShoppingCart, LuType, LuUpload, LuUserMinus, LuX } from 'react-icons/lu'
import { supabase } from '../../lib/supabase'
import dayjs from 'dayjs'
import { FaCheck, FaCoins, FaPaperPlane } from 'react-icons/fa'
import axios from 'axios'
import { HeaderDashboard } from '../Header/Header'
import SideEventHost from '../../components/Host/SideEventHost'
import { colorFactoryToHex } from '../../helpers/assets/functions'
import { fonts } from '../../helpers/assets/fonts'
import { handleCheckout } from '../../components/Payment/functions'
import { useSearchParams } from 'react-router-dom'
import { useDashboardRealtime } from '../../context/DashboardRealtimeContext'
import { useLia } from '../../context/LiaContext'
import { StorageImages } from '../../components/ImagesStorage/StorageImages'
import { Check, CheckCheck, ChevronLeft, ChevronRight, Copy, Link2, LockKeyhole, LockKeyholeOpen, MailWarning, Plus, Send, SquareArrowUpRight } from 'lucide-react'
import { GuestsCRUD } from '../../components/Create/GuestsCRUD'
import { AddressAutocomplete } from './AddressAutocomplete'
import { FiArrowUpRight } from 'react-icons/fi'
import { CustomLink } from '../../components/CustomLink/CustomLink'
import { FooterApp } from '../Footer/FooterApp'
import { useTranslation } from 'react-i18next'


const { Option } = Select;



export const SideEvents = () => {
    const { t } = useTranslation()
    const { setCreditSending, setCreditSuccess, clearCreditState } = useLia()

    const translateState = (value) => {
        const map = {
            creado: t('guests.state_creado'),
            esperando: t('guests.state_esperando'),
            confirmado: t('guests.state_confirmado'),
            rechazado: t('guests.state_rechazado'),
        }
        return map[value] ?? value
    }
    const [sideEvent, setsideEvent] = useState(null)
    const [current, setCurrent] = useState(null)
    const [handlePreview, setHandlePreview] = useState(false)
    const [rawData, setRawData] = useState([])
    const [mainGuests, setMainGuests] = useState(null)
    const [readyToAdd, setReadyToAdd] = useState([])
    const [searchMain, setSearchMain] = useState("")
    const [messagesDispatch, setMessagesDispatch] = useState([])
    const [credits, setCredits] = useState(0)
    const [plan, setPlan] = useState(null)
    const [addressOpen, setAddressOpen] = useState(false)
    const [datePickerOpen, setDatePickerOpen] = useState(false)
    const [colorDrawerOpen, setColorDrawerOpen] = useState(false)
    const [fontDrawerOpen, setFontDrawerOpen] = useState(false)
    const [mobilePanel, setMobilePanel] = useState(0)
    const [searchParams] = useSearchParams();
    const id = searchParams.get("id");
    const { subscribe } = useDashboardRealtime()
    const [drawerState, setDrawerState] = useState({
        currentGuest: null,
        onEditGuest: false,
        companions: [],
        visible: false
    });
    const { TextArea } = Input;
    const screens = Grid.useBreakpoint();
    const currentRef = useRef(null);

    const columns = useMemo(() => ([
        {
            title: t('side_events.col_name'),
            dataIndex: "name",
            key: "name",
            fixed: "left",
            width: 160,
            render: (value, record) => {
                return (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px'
                    }}>
                        <Tooltip title={t('side_events.tooltip_open')}>
                            <Button
                                onClick={() =>
                                    setDrawerState({
                                        currentGuest: record,
                                        onEditGuest: true,
                                        companions: handleCompanions(record.id),
                                        visible: true,
                                    })
                                }
                                className="primarybutton"
                                icon={<FiArrowUpRight size={14} style={{ marginTop: 2 }} />}
                                style={{ maxWidth: 24, maxHeight: 24, borderRadius: 99 }}
                            />
                        </Tooltip>
                        <span>{value}</span>
                    </div>
                )
            }
        },

        {
            title: t('side_events.col_contact'),
            dataIndex: "phone_number",
            key: "phone_number",
            width: 140,


            //   render: (value) => phoneFormatter(value),
        },

        {
            title: t('side_events.col_state'),
            dataIndex: "state",
            key: "state",
            width: 140,
            render: (value) => (
                <div className="tag-container">
                    <span className={`new-table-tag state-${value}`} style={{ maxHeight: '24px', padding: '0px 12px' }}>
                        {translateState(value)}
                    </span>
                </div>
            ),
        },

        {
            title: t('side_events.col_access'),
            dataIndex: "password",
            key: "password",
            width: 140,
            render: (value,) => (
                <div className="tag-container">
                    <Dropdown popupRender={() => (
                        <div className='passwords_container_se'>
                            <Button style={{ width: '100%' }} icon={<LuCopy size={14} />} onClick={() => copyToClipboard(value)} >{value}</Button>
                            <Button
                                style={{ width: '100%' }}
                                onClick={() => handleShare(`https://www.iattend.events/side-event/${current?.id}?password=${value}`)}
                                icon={<LuCopy size={14} />}
                            >{t('side_events.magic_link')}</Button>
                        </div>
                    )}>
                        <Button style={{ borderRadius: '99px', maxHeight: '24px' }} icon={<LuLock />}>••••••••</Button>
                    </Dropdown>
                </div>
            ),
        },

        {
            title: t('side_events.col_tag'),
            dataIndex: "tag",
            key: "tag",
            width: 120,

            render: (value) => {
                const label = renderTag(value)
                return (
                    <div className="tag-container">
                        <Tooltip title={label} placement="top">
                            <span className={`new-table-tag state-${value}`} style={{
                                maxHeight: '24px', padding: '0px 12px',
                                maxWidth: '140px', overflow: 'hidden',
                                whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                display: 'inline-block', textAlign: 'center'
                            }}>
                                {label}
                            </span>
                        </Tooltip>
                    </div>
                )
            },
        },

        {
            title: t('side_events.col_actions'),
            key: "send",
            width: 120,
            fixed: screens.xs ? undefined : "right",
            render: (_, record) => {
                const { state, phone_number } = record;

                if (state === "creado") {
                    return (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                gap: 6,
                                width: "100%",
                                paddingRight: '12px', boxSizing: 'border-box'
                            }}
                        >
                            <Tooltip placement='topRight' title={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><FaPaperPlane size={12} /><span>{t('side_events.tooltip_send')}</span></div>} color="var(--brand-color-500)">
                                <Button
                                    disabled={!phone_number || !credits > 0}
                                    // disabled={t!phone_number}
                                    // onMouseEnter={() => setActiveIcon(true)} onMouseLeave={() => setActiveIcon(false)}
                                    onClick={() => onSedingInvitation(current, record)}
                                    className="primarybutton--active"
                                    icon={<LuSend size={12} />}
                                    style={{ flex: 1, maxHeight: 30 }}
                                >
                                    {t('side_events.btn_invite')}
                                </Button>
                            </Tooltip>

                            <Tooltip placement='bottomLeft' title={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><FaCheck size={12} /><span>{t('side_events.tooltip_mark')}</span></div>} color="var(--brand-color-500)">
                                <Button
                                    onClick={() => onSendInvitation(record)}
                                    className="primarybutton--active"
                                    icon={<LuCheck size={12} />}
                                    style={{ minWidth: 30, maxWidth: 30, maxHeight: 30 }}
                                />
                            </Tooltip>

                            {/* <Tooltip title="Eliminar"> <Button style={{ minWidth: '32px' }} className='primarybutton' icon={<LuUserMinus style={{ marginLeft: '2px' }} />} onClick={() => removeGuest(record.id)}></Button></Tooltip> */}
                        </div>
                    );
                }

                if (state === "esperando") {
                    return (
                        handleMessageStatus(record, dispatchMap[record.id]?.status ?? 'undefined')
                    );
                }

                if (state === "confirmado" || state === 'rechazado') {
                    return (
                        <></>

                    );
                }

                return null;
            },
        },
    ]), [current, rawData, screens.xs, messagesDispatch]);

    const tableProps = useMemo(() => ({
        rowKey: "id",
        columns,
        pagination: false,
        scroll: {
            x: 'max-content',
            y: screens.xs ? undefined : '84vh',
        },
    }), [columns, screens.xs]);

    const items = useMemo(() => ([
        {
            label: screens.xs ? <Plus size={14} /> : t('side_events.tab_created'),
            key: "creado",
            children: (
                <Table
                    style={{
                        maxWidth: '100%'
                    }}
                    size='small'
                    {...tableProps}
                    dataSource={rawData.filter((i) => i.state === 'creado')}
                />
            ),
        },
        {
            label: screens.xs ? <Send size={14} /> : t('side_events.tab_sent'),
            key: "esperando",
            children: (
                <Table
                    size='small'
                    {...tableProps}
                    dataSource={rawData.filter((i) => i.state === 'esperando')}
                />
            ),
        },
        {
            label: screens.xs ? <CheckCheck size={14} /> : t('side_events.tab_confirmed'),
            key: "confirmado",
            children: (
                <Table
                    size='small'
                    {...tableProps}
                    dataSource={rawData.filter((i) => i.state === 'confirmado' || i.state === 'rechazado')}
                />
            ),
        },

    ]), [
        tableProps,
        rawData,
        screens.xs,
    ]);

    const handleCompanions = (id) => {
        const comps = rawData?.filter((row) => row.companion_id === id.toString())
        return comps
    }

    const dispatchMap = useMemo(() => {
        const map = {};

        messagesDispatch.forEach(m => {
            map[m.guest_id] = m;
        });

        return map;
    }, [messagesDispatch]);

    const getMessagesUpdates = async () => {

        try {
            const { data, error } = await supabase
                .rpc('get_latest_invitation_dispatches', {
                    p_invitation_id: id
                });

            if (error) return

            // console.log('messages updates: ', data)
            setMessagesDispatch(data)
        } catch (error) {
            console.log(error)
        }
    }

    const handleMessageStatus = (record, status) => {
        switch (status) {
            case 'processing':

                return (
                    <div className='dispatch_message_tag' style={{ maxHeight: '24px', padding: '0px 12px' }}>
                        {t('side_events.msg_processing')}
                    </div>
                )

            case 'sent':

                return (
                    <div className={`new-table-tag state-confirmado dispatch_message_tag`} style={{ maxHeight: '24px', padding: '0px 12px' }}>
                        <Send size={16} />
                        {t('side_events.msg_sent')}
                    </div>
                )

            case 'delivered':

                return (
                    <div className={`new-table-tag state-creado dispatch_message_tag`} style={{ maxHeight: '24px', padding: '0px 12px' }}>
                        <Check size={16} />
                        {t('side_events.msg_delivered')}
                    </div>
                )


            case 'read':

                return (
                    <div className={`new-table-tag state-esperando dispatch_message_tag`} style={{ maxHeight: '24px', padding: '0px 12px' }}>
                        <CheckCheck size={16} />
                        {t('side_events.msg_read')}
                    </div>
                )

            case 'failed':

                return (

                    <Tooltip placement='topRight'

                        title={t('side_events.msg_retry_hint')} color="var(--brand-color-500)">
                        <Button
                            disabled={
                                !/^\+52\d+/.test(record.phone_number) || credits <= 0
                            }
                            onClick={() => onSedingInvitation(current, record)}
                            className="primarybutton--active"
                            icon={<MailWarning size={16} />}
                            style={{ flex: 1, maxHeight: 30, width: '136px' }}
                        >
                            {t('side_events.msg_retry')}
                        </Button>
                    </Tooltip>
                    // <div className='dispatch_message_tag'>

                    //     <MailWarning size={16}/>
                    //     Reintentar
                    // </div>
                )

            default:
                return (
                    <div className={`new-table-tag state-rechazado dispatch_message_tag`} style={{ maxHeight: '24px', padding: '0px 12px' }}>
                        {t('side_events.msg_waiting')}
                    </div>
                )
        }
    }

    const onSendInvitation = async (guest) => {

        const guestPatch = {

            state: 'esperando',
            last_action: guest.state,
            last_action_by: true,
            last_update_date: new Date()
        };

        const { error: guestError } = await supabase
            .from('side_events_guests')
            .update(guestPatch)
            .eq('id', guest.id)
            .select('*')
            .maybeSingle();

        if (guestError) throw guestError;
        // console.log('Guest actualizado:', guestRow);
        // setOnBubble(true)
        getGuests()

    }

    const onSedingInvitation = async (data, guest) => {


        if (data) {
            setCreditSending()
            try {
                const payload = {

                    invitationId: id,
                    guestId: guest.id,
                    guestName: guest.name,
                    guestPhone: guest.phone_number.replace(/^\+/, ""),

                    messaging_product: "whatsapp",
                    to: guest?.phone_number?.replace(/^\+/, ""),
                    type: "template",
                    template: {
                        name: "invitation_v2",
                        language: {
                            code: "es_MX",
                        },
                        components: [
                            {
                                type: "header",
                                parameters: [
                                    {
                                        type: "image",
                                        image: {
                                            link: current?.url_image ?? data?.body.image,
                                        },
                                    },
                                ],
                            },
                            {
                                type: "body",
                                parameters: [
                                    {
                                        type: "text",
                                        text: `${data?.name}`.replace(/[\n\r]/g, " "),
                                    },
                                    {
                                        type: "text",
                                        text: guest?.name,
                                    },
                                ],
                            },
                            {
                                type: "button",
                                sub_type: "url",
                                index: "0",
                                parameters: [
                                    {
                                        type: "text",
                                        text: `side-event/${data?.id}?password=${guest.password}`,
                                    },
                                ],
                            },
                        ],
                    },
                };


                // console.log(payload)

                const response = await axios.post(
                    `${import.meta.env.VITE_API_URL}/api/whats`,
                    // "http://localhost:4000/api/whats",
                    payload
                );
                if (response.data.ok) {
                    onUpdateCredits()
                    setCreditSuccess()
                    onSendInvitation(guest)

                }

            } catch (error) {
                clearCreditState()
                console.log(error.response?.data || error.message);
                throw error;
            }
        } else {
            message.warning(t('side_events.warning_complete'))
            // console.log(data?.body?.image)
            // console.log(data?.name)
        }

    };

    const getSideEvents = async () => {
        const { data, error } = await supabase
            .from('side_events')
            .select('*')
            .eq('invitation_id', id)

        if (error) {
            console.error(error)
            setsideEvent([])
        }

        setsideEvent(data)
    }

    const getCredits = async () => {
        const { data, error } = await supabase
            .from('invitations')
            .select('credits, plan')
            .eq('id', id)
            .maybeSingle()

        if (error) {
            console.error('Error al obtener invitados:', error)
            return
        }
        setPlan(data.plan)
        setCredits(data.credits)
    }

    const renderTag = (value) => {
        if (value == null) return "-";
        if (typeof value === "object") return "-"; // o JSON.stringify(value)
        return String(value);
    };


    dayjs.locale('es');

    const formatInvitationDate = (date) => {
        if (!date) return '';

        return dayjs(date).format('ddd, D [de] MMMM, HH:mm');
    }

    const insertSideEvent = async () => {
        const { data, error } = await supabase
            .from('side_events')
            .insert({
                invitation_id: id, // uuid
                date: new Date().toISOString(), // timestamp
                name: null,
                url_image: null,
                body: {
                    address: {
                        street: null,
                        number: null,
                        neighborhood: null,
                        zipcode: null,
                        country: null,
                        state: null,
                        city: null,
                        url: null,
                    },
                    hour: null,
                    image: null,
                    title: {
                        font: 'Poppins',
                        size: 36,
                        weight: 600,
                        opacity: 1,
                        line_height: 1.4
                    },
                    font: 'Poppins',
                    color: "#000000",
                    extras: null
                }
            })
            .select()
            .single()

        if (error) {
            console.error(error)
            return
        }

        // console.log('side event: ', data)

        setsideEvent((prev) => [...prev, data])
    }

    const saveSideEvent = async () => {
        if (!current?.id) return;

        const { error } = await supabase
            .from('side_events')
            .update({
                name: current.name,
                url_image: current.url_image === null ? current.body.image : current.url_image,
                body: current.body,
            })
            .eq('id', current.id);

        if (error) {
            console.error('Error al guardar cambios:', error);
            return;
        }

        // console.log('Cambios guardados correctamente');
        message.success(t('side_events.saved'))
    };



    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success(t('side_events.copied'))
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const handleShare = async (url) => {
        const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
        if (isMobileDevice && navigator.share) {
            try {
                await navigator.share({
                    title: current?.name ?? 'Evento',
                    text: '¡Te invitamos a un evento especial!',
                    url,
                });
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }
        await copyToClipboard(url);
    };

    const getGuests = async (sideEventId = current?.id) => {

        try {
            if (sideEventId) {
                const { data, error } = await supabase
                    .from("side_events_guests")
                    .select("*")
                    .eq("side_events_id", sideEventId)

                if (error) {
                    console.error("Error al obtener invitaciones:", error);
                } else {
                    setRawData(data)
                }
            }
        } catch (error) {
            console.log(error)
        }
    }

    const getMainGuests = async () => {

        try {
            const { data, error } = await supabase
                .from("guests")
                .select("*")
                .eq("invitation_id", id)

            if (error) {
                console.error("Error al obtener invitaciones:", error);
            } else {

                setMainGuests(data)
            }
        } catch (error) {
            console.log(error)
        }
    }

    const handleImport = (state, item) => {
        if (state) {
            setReadyToAdd((prev) => [...prev, item])
        }

        if (!state) {
            setReadyToAdd((prev) => prev.filter(i => i.id !== item.id))
        }
    }

    const handleSideGuests = async () => {
        const list = readyToAdd.map(i => ({
            side_events_id: current?.id,
            password: i.password,
            phone_number: i.phone_number,
            name: i.name,
            tier: i.tier,
            tag: i.tag,
            table: i.table,
            state: 'creado',
            last_action: 'creado',
            notes: i.notes,
            meal: null,
            companion_id: null,
            ticket: true,
            has_companion: i.has_companion,
            last_action_by: true,
        }))

        // console.log(list)

        const { error: guestError } = await supabase
            .from('side_events_guests')
            .insert(list)
            .select('*');

        if (guestError) {
            console.error('Error al insertar guest:', guestError);
            return;
        }

        setReadyToAdd([])
        getGuests()
    }

    const onUpdateCredits = async () => {
        // 1. Obtener créditos actuales
        const { data, error } = await supabase
            .from('invitations')
            .select('credits')
            .eq('id', id)
            .maybeSingle()

        if (error) {
            console.error('Error al obtener créditos:', error)
            return
        }

        if (!data) {
            console.error('No se encontró la invitación')
            return
        }

        const currentCredits = data.credits ?? 0

        // 2. Validar créditos disponibles
        if (currentCredits <= 0) {
            console.warn('No hay créditos disponibles')
            return
        }

        // 3. Restar un crédito
        const newCredits = currentCredits - 1

        // 4. Guardar créditos actualizados
        const { data: updateCredits, error: updateError } = await supabase
            .from('invitations')
            .update({ credits: newCredits })
            .eq('id', id)
            .select()

        if (updateError) {
            console.error('Error al actualizar créditos:', updateError)
            return
        }

        // console.log('update credits: ', updateCredits)

        setCredits(updateCredits[0].credits ?? credits)

        // console.log('Créditos actualizados correctamente:', newCredits)
    }

    const truncate = (text, max = 50) =>
        text.length > max ? text.slice(0, max) + '...' : text;

    const handleImages = (e) => {
        setCurrent((prev) => ({ ...prev, body: { ...prev.body, image: e } }))
    }

    const updateURLimage = async (e) => {

        const { error } = await supabase
            .from('side_events')
            .update({ url_image: e })
            .eq("id", current.id)


        if (error) {
            console.error('Error actualizando:', error)
        } else {
            setCurrent((prev) => ({ ...prev, url_image: e }))
            message.success(t('side_events.image_updated'))

        }
    };


    // const onSaveNewTickets = async (newType) => {

    //     const { error } = await supabase
    //         .from('side_events')
    //         .update({ type: newType })
    //         .eq("id", current.id)


    //     if (error) {
    //         console.error('Error actualizando:', error)
    //     } else {
    //         setCurrent((prev) => ({ ...prev, type: newType }))
    //         message.success('Privacidad actualizada')

    //     }
    // };

    // const removeGuest = async (guestId) => {
    //     try {
    //         const { error: guestErr } = await supabase
    //             .from('side_events_guests')
    //             .delete()
    //             .eq('id', guestId);

    //         if (guestErr) throw guestErr;

    //         getGuests()
    //     } catch (error) {
    //         console.log(error)
    //     }
    // }


    useEffect(() => {
        // getInvitationImages(id);
        getCredits()
        getSideEvents()
        getMessagesUpdates()
    }, [id])


    useEffect(() => {
        if (current)
            getGuests()
    }, [current])

    useEffect(() => {
        currentRef.current = current;
    }, [current])

    useEffect(() => {
        if (!id) return;

        const u1 = subscribe('side_events_guests', (payload) => {
            const sideEventId = payload.new?.side_events_id ?? payload.old?.side_events_id;
            if (sideEventId && String(sideEventId) === String(currentRef.current?.id)) {
                getGuests(currentRef.current.id)
            }
        });

        const u2 = subscribe('invitation_message_dispatches', (payload) => {
            const row = payload.new || payload.old;
            if (!row || String(row.invitation_id) !== String(id)) return;
            getMessagesUpdates()
            getGuests(currentRef.current?.id)
        });

        return () => { u1(); u2(); };
    }, [id])




    return (
        <>
            <Layout
                style={{
                    position: 'relative',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--ft-color)',
                    width: '100%',
                    
                }}>
                <HeaderDashboard
                    mode={'side'}
                    sideEventName={current?.name}
                    onSideEventsBack={current ? () => { setCurrent(null); setMobilePanel(0); } : undefined}
                />
                <Layout className='build-invitation-layout' style={{
                    paddingTop: '0px',
                    position: 'relative',
                    marginTop: screens.xs ? '0px' : '20px'
                }} >

                    {!current && <div className='guests-info-container' style={{ padding: '24px', marginTop: '65px', paddingBottom: '24px', }}>

                        <span className='guests-title-page'>{t('side_events.page_title')}</span>

                        {
                            sideEvent ?
                                <div className='side_events_container'>

                                    {(() => {
                                        const canCreate = (plan === 'pro' && sideEvent.length < 3) || (plan === 'lite' && sideEvent.length < 1);
                                        return (
                                            <div
                                                onClick={canCreate ? insertSideEvent : () => handleCheckout(id, 'price_1T1VeXAAdNlITNVbXeWLTh3Y')}
                                                className='side_event_item'
                                                style={{ backgroundColor: '#F5F3F2' }}
                                            >
                                                <div className='new_inv_cont' style={{ minHeight: 'unset', flex: 1, width: '100%' }}>
                                                    <div className='add_button_circle'>
                                                        {canCreate
                                                            ? <Plus size={32} color='var(--brand-color-500)' />
                                                            : <LuShoppingCart size={32} color='var(--brand-color-500)' />
                                                        }
                                                    </div>
                                                    <span className='cta_title'>
                                                        {canCreate ? t('side_events.cta_new_title') : t('side_events.cta_more_title')}
                                                    </span>
                                                    <span className='cta_text'>
                                                        {canCreate ? t('side_events.cta_new_text') : t('side_events.cta_more_text')}
                                                    </span>
                                                    {!canCreate && <Button className='cta_plans'>{t('side_events.cta_buy')}</Button>}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {
                                        sideEvent?.map((item, index) => (
                                            <div key={index} onClick={() => { setCurrent(item) }} className='side_event_item'>
                                                {
                                                    item.body?.image ? <img lazyload src={item.body?.image} alt='none' style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                                                        : <LuImage size={44} style={{ color: '#CCC' }} />
                                                }
                                                <div className='blur-cover'></div>
                                                <span style={{
                                                    position: 'absolute', bottom: '10%', left: '50%', transform: 'translate(-50%)', fontWeight: 600,
                                                    color: '#FFF', fontSize: '24px', textAlign: 'center', lineHeight: 1.2, width: '80%',
                                                    zIndex: 2, textShadow: '0px 0px 8px rgba(0,0,0,0.4)'
                                                }}>{item?.name ?? t('side_events.no_name')}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                                : <div className='side_events_spin'>
                                    <Spin />
                                </div>
                        }

                    </div>}

                    {current && (
                    <div className='side-event-detail-cont' style={{ minHeight:'calc(100vh - 60px)'}}>

                        {/* Slider wrapper: relative container on mobile, transparent on desktop */}
                        <div style={screens.xs ? { position: 'relative', width: '100%', flex: 1, overflow: 'hidden' } : { display: 'flex', flex: 1, overflow: 'hidden', gap:'12px', }}>

                            {/* Slide track: 200% wide flex row on mobile, transparent on desktop */}
                            <div style={screens.xs ? {
                                display: 'flex', flexDirection: 'row',
                                width: '200%', height: '100%',
                                transform: `translateX(${mobilePanel === 0 ? '0%' : '-50%'})`,
                                transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                willChange: 'transform',
                                
                            } : { display: 'contents' }}>

                                {/* Panel 0 — design */}
                                <div style={screens.xs ? { width: '50%', flexShrink: 0, height: '100%', overflow: 'hidden',  } : { display: 'contents',  }}>
                                    <div className='side_invitation_cont' style={{ background: handlePreview ? '#FFFFFF' : undefined, ...(screens.xs ? { width: '100%', maxWidth: '100%', minWidth: 'unset', height: '100%' } : {}) }}>
                                        {
                                            handlePreview ?

                                                <>
                                                    <div className={`inv-device-main-container-ios`} style={{ transform: 'scale(0.8)', marginLeft: '0px' }}>
                                                        <div className={`device-buttons-container-ios`}>
                                                            <div className={`device-button-ios`} />
                                                            <div className={`device-button-ios`} />
                                                            <div className={`device-button-ios`} />
                                                        </div>
                                                        <div className={`device-power-button-ios`} />
                                                        <div className={`inv-device-container-ios scroll-invitation`}>

                                                            <div className={`inv-black-space-ios`}>
                                                                <span>5:15</span>
                                                                <div className={`camera-ios`} />
                                                                <div>
                                                                    {/* <img alt='' src={ios_settings} style={{
                                                        height: '100%', objectFit: 'cover'
                                                    }} /> */}
                                                                </div>
                                                            </div>

                                                            <div className={`scroll-invitation ios-invitation `}>
                                                                <SideEventHost config={current} />
                                                                {/* <InvitationTest setCurrentOffsetTop={setCurrentOffsetTop} positionY={positionY} invitation={invitation} size={size} /> */}
                                                            </div>
                                                            <div className={`inv-light-space-ios`} />
                                                        </div>
                                                    </div>
                                                </>

                                                :
                                                <>
                                                    {
                                                        current?.body?.image &&
                                                        <img src={current?.body.image} alt=''
                                                            style={{
                                                                position: 'absolute', width: '100%', height: '100%', objectFit: 'cover',
                                                                top: 0, zIndex: 0
                                                            }} />
                                                    }



                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', width: '100%' }}>
                                                        {
                                                            !current?.body?.image &&
                                                            <div className='add_image_cont' style={{ backgroundColor: `${current?.body?.color ?? "#000000"}40` }}>
                                                                <LuImage style={{ color: '#FFF' }} />
                                                            </div>
                                                        }

                                                        <StorageImages invitationID={id} handleImage={handleImages} type={'side-events'} />
                                                    </div>

                                                    <div className='side_info_cont' style={{ backgroundColor: `${current?.body?.color ?? "#000000"}40`, overflow: addressOpen ? 'visible' : 'hidden' }}>
                                                        <TextArea
                                                            key={`
                                            ${current?.body?.title?.size}-
                                            ${current?.body?.title?.line_height}-
                                            ${current?.body?.title?.font}-
                                            ${current?.body?.title?.weight}
                                        `}
                                                            className="side_title_input"
                                                            placeholder={t('side_events.event_title_placeholder')}
                                                            autoSize={{ minRows: 2, maxRows: 6 }}
                                                            value={current?.name}
                                                            onChange={(e) =>
                                                                setCurrent(prev => ({ ...prev, name: e.target.value }))
                                                            }
                                                            style={{
                                                                fontSize: current?.body?.title?.size ?? 24,
                                                                lineHeight: current?.body?.title?.line_height ?? 1.4,
                                                                fontFamily: current?.body?.title?.font ?? 'Poppins',
                                                                fontWeight: current?.body?.title?.weight ?? 500,
                                                                opacity: current?.body?.title?.opacity ?? 1,
                                                                padding: '24px',
                                                                color: '#FFFFFF',
                                                            }}
                                                        />


                                                        {screens.xs ? (
                                                            datePickerOpen ? (
                                                                <div className='date_inline_cont'>
                                                                    <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                        <span style={{ color: '#FFFFFF80', fontSize: '12px' }}>{t('side_events.datetime_label')}</span>
                                                                        <Button
                                                                            type='text'
                                                                            icon={<LuX size={14} style={{ color: '#FFF' }} />}
                                                                            style={{ minWidth: 24, maxWidth: 24, maxHeight: 24 }}
                                                                            onClick={() => setDatePickerOpen(false)}
                                                                        />
                                                                    </div>
                                                                    <DatePicker
                                                                        onChange={(e) => { setCurrent((prev) => ({ ...prev, body: { ...prev.body, hour: e } })); setDatePickerOpen(false); }}
                                                                        className='date_pciker_sidee'
                                                                        showTime
                                                                        style={{ width: '100%' }}
                                                                        getPopupContainer={() => document.body}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className='side_date_time' onClick={() => setDatePickerOpen(true)}>
                                                                    <LuCalendarClock size={20} style={{ color: '#FFF' }} />
                                                                    {current?.body?.hour ? <span>{formatInvitationDate(current.body.hour)}</span> : <span>{t('side_events.datetime_label')}</span>}
                                                                </div>
                                                            )
                                                        ) : (
                                                            <Dropdown
                                                                trigger={['click']}
                                                                placement='right'
                                                                popupRender={() => (
                                                                    <DatePicker onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, hour: e } }))} className='date_pciker_sidee' showTime getPopupContainer={() => document.body} />
                                                                )}
                                                            >
                                                                <div className='side_date_time'>
                                                                    <LuCalendarClock size={20} style={{ color: '#FFF' }} />
                                                                    {current?.body?.hour ? <span>{formatInvitationDate(current.body.hour)}</span> : <span>{t('side_events.datetime_label')}</span>}
                                                                </div>
                                                            </Dropdown>
                                                        )}

                                                        {addressOpen ? (
                                                            <div className='address_inline_form'>
                                                                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <span style={{ color: '#FFFFFF80', fontSize: '12px' }}>{t('side_events.address_label')}</span>
                                                                    <Button
                                                                        type='text'
                                                                        icon={<LuX size={14} style={{ color: '#FFF' }} />}
                                                                        style={{ minWidth: 24, maxWidth: 24, maxHeight: 24 }}
                                                                        onClick={() => setAddressOpen(false)}
                                                                    />
                                                                </div>

                                                                <AddressAutocomplete
                                                                    onSelect={(addr) => setCurrent((prev) => ({
                                                                        ...prev,
                                                                        body: { ...prev.body, address: { ...prev.body.address, ...addr } }
                                                                    }))}
                                                                />

                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span>{t('side_events.address_zipcode')}</span>
                                                                    <Input value={current?.body?.address?.zipcode} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, zipcode: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span>{t('side_events.address_street')}</span>
                                                                    <Input value={current?.body?.address?.street} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, street: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span>{t('side_events.address_number')}</span>
                                                                    <Input value={current?.body?.address?.number} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, number: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span>{t('side_events.address_neighborhood')}</span>
                                                                    <Input value={current?.body?.address?.neighborhood} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, neighborhood: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span>{t('side_events.address_city')}</span>
                                                                    <Input value={current?.body?.address?.city} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, city: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span>{t('side_events.address_state')}</span>
                                                                    <Input value={current?.body?.address?.state} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, state: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span>{t('side_events.address_country')}</span>
                                                                    <Input value={current?.body?.address?.country} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, country: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                                                                    <span>{t('side_events.address_url')}</span>
                                                                    <Input value={current?.body?.address?.url} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, url: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className='side_date_time' onClick={() => setAddressOpen(true)}>
                                                                <LuMapPin size={20} style={{ color: '#FFF' }} />
                                                                {current?.body?.address?.zipcode
                                                                    ? <span style={{ textAlign: 'center' }}>{current.body.address.street} {current.body.address.number} {current.body.address.neighborhood}, {current.body.address.zipcode}, {current.body.address.city}, {current.body.address.state}, {current.body.address.country}</span>
                                                                    : <span>{t('side_events.address_label')}</span>
                                                                }
                                                            </div>
                                                        )}

                                                        <TextArea
                                                            key={`
                                                     ${current?.body?.title?.line_height}-
                                                    ${current?.body?.title?.weight}-
                                                    ${current?.body?.title?.size}-
                                                     ${current?.body?.title?.font}`}
                                                            className="side_title_input scroll-invitation"
                                                            placeholder={t('side_events.extras_placeholder')}
                                                            autoSize={{ minRows: 0, maxRows: 4 }}
                                                            value={current?.body?.extras}
                                                            onChange={(e) =>
                                                                setCurrent(prev => ({ ...prev, body: { ...prev.body, extras: e.target.value } }))
                                                            }
                                                            style={{
                                                                fontSize: '16px',
                                                                padding: '12px',
                                                                color: '#FFFFFF',
                                                            }}
                                                        />


                                                    </div>

                                                </>

                                        }

                                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'absolute', top: '16px', left: '16px', right: '16px', gap: '12px' }}>

                                            {!handlePreview
                                                ? <Button onClick={saveSideEvent} icon={<LuUpload />} className={'save_button_sidee'}>{t('side_events.btn_save')}</Button>
                                                : <Button icon={<LuCornerUpLeft />} onClick={() => setHandlePreview(false)}>{t('side_events.btn_back')}</Button>
                                            }

                                            {!handlePreview && (
                                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                                                    <Tooltip title={t('side_events.tooltip_preview')}>
                                                        <Button icon={<LuPlay />} onClick={() => setHandlePreview(true)} style={{ backgroundColor: `${current?.body?.color ?? "#000000"}40` }} className='preview_button_sidee' />
                                                    </Tooltip>

                                                    {screens.xs ? (
                                                        <Button style={{ backgroundColor: `${current?.body?.color ?? "#000000"}40` }} className='preview_button_sidee' icon={<LuPalette />} onClick={() => setColorDrawerOpen(true)} />
                                                    ) : (
                                                        <Dropdown
                                                            placement='bottomLeft'
                                                            trigger={['click']}
                                                            popupRender={() => (
                                                                <div className='generals-settings-popup' style={{ width: 'auto', background: '#00000040', backdropFilter: 'blur(10px)' }}>
                                                                    <ColorPicker value={current?.body?.color ?? "#000000"} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev?.body, color: colorFactoryToHex(e) } }))} />
                                                                </div>
                                                            )}
                                                        >
                                                            <Button style={{ backgroundColor: `${current?.body?.color ?? "#000000"}40` }} className='preview_button_sidee' icon={<LuPalette />} />
                                                        </Dropdown>
                                                    )}

                                                    {screens.xs ? (
                                                        <Button style={{ backgroundColor: `${current?.body?.color ?? "#000000"}40` }} className='preview_button_sidee' icon={<LuType />} onClick={() => setFontDrawerOpen(true)} />
                                                    ) : (
                                                        <Dropdown
                                                            trigger={['click']}
                                                            placement='bottomRight'
                                                            popupRender={() => (
                                                                <div className='generals-settings-popup' style={{ backgroundColor: `${current?.body?.color ?? "#000000"}40`, backdropFilter: 'blur(10px)' }}>
                                                                    <span style={{ color: '#FFF' }} className='gc-content-label'>{t('side_events.font_type')}</span>
                                                                    <Select value={current?.body?.title?.font} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, font: e } } }))} style={{ width: '100%' }}>
                                                                        {fonts.map((font, index) => (
                                                                            <Option key={`${index}-${font}`} value={font}><span style={{ fontFamily: font }}>{font}</span></Option>
                                                                        ))}
                                                                    </Select>
                                                                    <Col style={{ width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column', marginTop: '10px' }}>
                                                                        <span style={{ color: '#FFF' }} className='gc-content-label'>{t('side_events.font_size')}</span>
                                                                        <Slider style={{ width: '95%' }} min={36} max={64} step={2} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, size: e } } }))} value={current.body.title?.size ?? 36} />
                                                                        <span style={{ color: '#FFF' }} className='gc-content-label'>{t('side_events.font_line_height')}</span>
                                                                        <Slider style={{ width: '95%' }} min={0.8} max={2} step={0.1} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, line_height: e } } }))} value={current.body.title?.line_height ?? 1.4} />
                                                                        <Row style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' }}>
                                                                            <Col style={{ width: '48%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column' }}>
                                                                                <span style={{ color: '#FFF' }} className='gc-content-label'>{t('side_events.font_opacity')}</span>
                                                                                <Slider style={{ width: '95%' }} min={0.1} max={1} step={0.01} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, opacity: e } } }))} value={current.body.title?.opacity ?? 1} />
                                                                            </Col>
                                                                            <Col style={{ width: '48%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column' }}>
                                                                                <span style={{ color: '#FFF' }} className='gc-content-label'>{t('side_events.font_weight')}</span>
                                                                                <Slider style={{ width: '95%' }} min={100} max={1000} step={100} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, weight: e } } }))} value={current.body.title?.weight ?? 500} />
                                                                            </Col>
                                                                        </Row>
                                                                    </Col>
                                                                </div>
                                                            )}
                                                        >
                                                            <Button style={{ backgroundColor: `${current?.body?.color ?? "#000000"}40` }} className='preview_button_sidee' icon={<LuType />} />
                                                        </Dropdown>
                                                    )}
                                                </div>
                                            )}

                                        </div>

                                    </div>
                                </div>

                                {/* Panel 1 — table */}
                                <div style={screens.xs ? { width: '50%', flexShrink: 0, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '16px', paddingBottom: '88px' } : { display: 'contents' }}>
                                    <div className='side_table_cont' style={screens.xs ? { width: '100%', minWidth: '100%', padding: '0px' } : {}}>

                                        {screens.xs && (
                                            <span style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 600, display: 'block', marginBottom: '12px' }}>{t('side_events.mobile_guests')}</span>
                                        )}

                                        <Tabs
                                            className="side-tabs"
                                            style={screens.xs ? { overflow: 'visible' } : undefined}
                                            type="card"
                                            items={items}
                                            tabBarExtraContent={
                                                <div className='single_row' style={{ marginBottom: '12px', }}>

                                                    {
                                                        !screens.xs &&

                                                        <CustomLink backuImage={current?.body?.image} urlImage={current?.url_image} url={`https://www.iattend.events/side-event/${current?.id}`} id={id} handleImage={updateURLimage} name={current?.name} />
                                                    }
                                                    <Dropdown
                                                        key={0}
                                                        trigger={['click']}
                                                        placement='bottomRight'
                                                        popupRender={() => (
                                                            <div key={2} className='single_col' style={{
                                                                boxSizing: 'border-box', backgroundColor: '#FFF', padding: '12px',
                                                                boxShadow: '0px 0px 12px rgba(0,0,0,0.2)', borderRadius: '16px', gap: '12px',
                                                                marginTop: '8px', maxWidth:'260px'
                                                            }}>
                                                                <Dropdown
                                                                    key={1}
                                                                    trigger={['click']}
                                                                    placement='bottomLeft'
                                                                    popupRender={() => (
                                                                        <div key={3} className='side_guest_list'>
                                                                            <div className='single_row' style={{
                                                                                alignSelf: 'stretch', justifyContent: 'space-between',
                                                                                alignItems: 'flex-end'
                                                                            }}>
                                                                                <span><b>{t('side_events.import_title')}</b></span>
                                                                                <Button onClick={handleSideGuests} className='primarybutton--active' icon={<LuPlus />}>{t('side_events.import_add')}</Button>
                                                                            </div>
                                                                            <Input value={searchMain} onChange={(e) => setSearchMain(e.target.value)} placeholder={t('side_events.import_search')} style={{ borderRadius: '99px' }} />
                                                                            <div className='single_col scroll-invitation' style={{
                                                                                alignSelf: 'stretch', gap: '2px',
                                                                                maxHeight: '480px', overflowY: 'auto', display:'flex',alignItems:'flex-start', justifyContent:'flex-start', flexDirection:'column'
                                                                            }}>
                                                                                {
                                                                                    mainGuests ? mainGuests?.filter(i =>
                                                                                        i.name?.toLowerCase().includes(searchMain?.toLowerCase() || '')).map((i, index) => (
                                                                                            <div key={`${i.id}-${index}`} className={`single_row import_list_row ${rawData.find(n => n.password === i.password) ? 'row_active' : ''}`} style={{
                                                                                                alignSelf: 'stretch',
                                                                                                padding: '8px'
                                                                                            }}>
                                                                                                {
                                                                                                    rawData.find(n => n.password === i.password)
                                                                                                        ? <Checkbox disabled checked />
                                                                                                        : <Checkbox onChange={(e) => handleImport(e.target.checked, i)} />
                                                                                                }

                                                                                                <span style={{ minWidth: '130px', flex:1, }}>{truncate(i.name, 20)}</span>

                                                                                                <div className='new-table-tag' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '60px', maxWidth:'60px' }}>
                                                                                                    <span style={{ fontSize: '12px' }}>{i.tag ?? "-"}</span>
                                                                                                </div>

                                                                                                <div className={`new-table-tag state-${i.state}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '80px', maxWidth:'80px' }}>
                                                                                                    <span style={{ fontSize: '12px' }}>{i.state ?? "-"}</span>
                                                                                                </div>

                                                                                            </div>
                                                                                        ))

                                                                                        : <Spin />
                                                                                }

                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                >
                                                                    <Button onClick={getMainGuests} style={{ width: '100%' }} icon={<Copy size={14} />}>{t('side_events.btn_copy_list')}</Button>

                                                                </Dropdown>
                                                                <Button

                                                                    onClick={() => setDrawerState({
                                                                        currentGuest: null,
                                                                        onEditGuest: false,
                                                                        companions: [],
                                                                        visible: true
                                                                    })} style={{ width: '100%' }} icon={<Plus size={14} />}>{t('side_events.btn_new_guest')}</Button>
                                                            </div>
                                                        )}
                                                    >
                                                        <Button className='primarybutton--active' icon={<Plus size={14} />} >{t('side_events.btn_add')}</Button>
                                                    </Dropdown>


                                                    {/* <Button onClick={() => setOpen(false)} className='primarybutton' icon={<LuX />}></Button> */}
                                                </div>
                                            }

                                        />
                                    </div>
                                </div>

                            </div>

                            {screens.xs && (
                                <div style={{
                                    position: 'absolute', bottom: '16px', left: 0, right: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: '8px', zIndex: 20, padding: '0 16px', boxSizing: 'border-box',
                                }}>
                                    <Button
                                        icon={<ChevronLeft size={16} />}
                                        onClick={() => setMobilePanel(0)}
                                        style={{ minWidth: '44px', minHeight: '44px', borderRadius: '99px', background: '#00000080', backdropFilter: 'blur(10px)', border: 'none', color: '#FFF', opacity: mobilePanel === 0 ? 0.3 : 1, transition: 'opacity 0.3s ease', pointerEvents: mobilePanel === 0 ? 'none' : 'auto' }}
                                    />
                                    <Button
                                        onClick={() => { setCurrent(null); setMobilePanel(0); }}
                                        style={{ flex: 1, borderRadius: '99px', minHeight: '44px', background: '#00000080', backdropFilter: 'blur(10px)', border: 'none', color: '#FFF', boxShadow: '0px 0px 8px rgba(0,0,0,0.2)' }}
                                    >{t('side_events.btn_close')}</Button>
                                    <CustomLink
                                        backuImage={current?.body?.image}
                                        urlImage={current?.url_image}
                                        url={`https://www.iattend.events/side-event/${current?.id}`}
                                        id={id}
                                        handleImage={updateURLimage}
                                        name={current?.name}
                                        label="Compartir"
                                    />
                                    <Button
                                        icon={<ChevronRight size={16} />}
                                        onClick={() => setMobilePanel(1)}
                                        style={{ minWidth: '44px', minHeight: '44px', borderRadius: '99px', background: '#00000080', backdropFilter: 'blur(10px)', border: 'none', color: '#FFF', opacity: mobilePanel === 1 ? 0.3 : 1, transition: 'opacity 0.3s ease', pointerEvents: mobilePanel === 1 ? 'none' : 'auto' }}
                                    />
                                </div>
                            )}
                        </div>

                    </div>)}

                    <Drawer
                        open={colorDrawerOpen}
                        onClose={() => setColorDrawerOpen(false)}
                        placement="top"
                        height="40%"
                        style={{borderRadius:'0px 0px 24px 24px'}}
                        closeIcon={false}
                        title={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontFamily: 'Poppins', fontWeight: 500 }}>{t('side_events.color_drawer_title')}</span>
                            <Button type="text" icon={<LuX size={16} />} onClick={() => setColorDrawerOpen(false)} />
                        </div>}
                        styles={{ body: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' } }}
                    >
                        <ColorPicker
                            value={current?.body?.color ?? "#000000"}
                            onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev?.body, color: colorFactoryToHex(e) } }))}
                        />
                    </Drawer>

                    <Drawer
                        open={fontDrawerOpen}
                        onClose={() => setFontDrawerOpen(false)}
                        placement="top"
                        height="40%"
                        closeIcon={false}
                        title={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontFamily: 'Poppins', fontWeight: 500, color: '#FFF' }}>{t('side_events.font_drawer_title')}</span>
                            <Button type="text" icon={<LuX size={16} style={{ color: '#FFF' }} />} onClick={() => setFontDrawerOpen(false)} />
                        </div>}
                        style={{ borderRadius: '0px 0px 24px 24px', backgroundColor: `${current?.body?.color ?? "#000000"}80`, backdropFilter: 'blur(10px)' }}
                        styles={{ header: { backgroundColor: 'transparent', borderBottom: '1px solid #FFFFFF20' }, body: { padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'transparent' } }}
                    >
                        <span style={{color:'#FFF'}} className='gc-content-label'>{t('side_events.font_type')}</span>
                        <Select value={current?.body?.title?.font} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, font: e } } }))} style={{ width: '100%' }}>
                            {fonts.map((font, index) => (
                                <Option key={`${index}-${font}`} value={font}><span style={{ fontFamily: font }}>{font}</span></Option>
                            ))}
                        </Select>
                        <span style={{color:'#FFF'}}  className='gc-content-label'>{t('side_events.font_size')}</span>
                        <Slider min={36} max={64} step={2} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, size: e } } }))} value={current?.body?.title?.size ?? 36} />
                        <span style={{color:'#FFF'}}  className='gc-content-label'>{t('side_events.font_line_height')}</span>
                        <Slider min={0.8} max={2} step={0.1} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, line_height: e } } }))} value={current?.body?.title?.line_height ?? 1.4} />
                        <Row style={{ width: '100%', gap: '16px' }}>
                            <Col flex={1}>
                                <span style={{color:'#FFF'}}  className='gc-content-label'>{t('side_events.font_opacity')}</span>
                                <Slider min={0.1} max={1} step={0.01} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, opacity: e } } }))} value={current?.body?.title?.opacity ?? 1} />
                            </Col>
                            <Col flex={1}>
                                <span style={{color:'#FFF'}}  className='gc-content-label'>{t('side_events.font_weight')}</span>
                                <Slider min={100} max={1000} step={100} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, weight: e } } }))} value={current?.body?.title?.weight ?? 500} />
                            </Col>
                        </Row>
                    </Drawer>


                </Layout >

                <GuestsCRUD rowData={rawData} invitationID={id} setDrawerState={setDrawerState} refreshPage={getGuests} drawerState={drawerState} isSideEvent={true} sideID={current?.id} />
                <FooterApp></FooterApp>
            </Layout >
        </>
    )
}
