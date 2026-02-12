import { Button, Checkbox, Col, ColorPicker, DatePicker, Dropdown, Input, Layout, message, Modal, Progress, Row, Select, Slider, Spin, Table, Tabs, Tooltip, Upload } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import './side-events.css'
import { LuCalendarClock, LuCheck, LuClock, LuCoins, LuCopy, LuCornerUpLeft, LuImage, LuImageOff, LuLock, LuMapPin, LuPalette, LuPlay, LuPlus, LuSend, LuType, LuUpload, LuUserMinus, LuX } from 'react-icons/lu'
import { supabase } from '../../lib/supabase'
import dayjs from 'dayjs'
import { FaCheck, FaCoins, FaPaperPlane } from 'react-icons/fa'
import { CreateGuest } from '../../components/Create/CreateGuest'
import axios from 'axios'
import { GoChevronDown } from 'react-icons/go'
import { HeaderDashboard } from '../Header/Header'
import SideEventHost from '../../components/Host/SideEventHost'
import { colorFactoryToHex } from '../../helpers/assets/functions'
import { fonts } from '../../helpers/assets/fonts'


const { Option } = Select;




export const SideEvents = ({ setMode, mode, setOnQR, invitation, invitationID }) => {
    const [sideEvent, setsideEvent] = useState(null)
    const [open, setOpen] = useState(false)
    const [current, setCurrent] = useState(null)
    const [images, setImages] = useState([])
    const [handlePreview, setHandlePreview] = useState(false)
    const [rawData, setRawData] = useState([])
    const [mainGuests, setMainGuests] = useState(null)
    const [readyToAdd, setReadyToAdd] = useState([])
    const [searchMain, setSearchMain] = useState("")
    const [onCreate, setOnCreate] = useState(false)
    const [onSending, setOnSending] = useState(false)
    const [onTickets, setOnTickets] = useState(false)
    const [activeTickets, setActiveTickets] = useState(false)
    const [onBubble, setOnBubble] = useState(false)
    const [credits, setCredits] = useState(0)
    const [plan, setPlan] = useState(null)
    const { TextArea } = Input;

    const columns = useMemo(() => ([
        {
            title: "Nombre",
            dataIndex: "name",
            key: "name",
            fixed: "left",
            minWidth: 180,
            // render: (value, record) => {
            //     return (
            //         <div
            //             className="tag-container"
            //             style={{ gap: 8, justifyContent: "flex-start", width: "100%" }}
            //         >



            //             <span style={{ textAlign: "left" }}>{value}</span>
            //         </div>
            //     );
            // },

        },

        {
            title: "Contacto",
            dataIndex: "phone_number",
            key: "phone_number",
            width: 100,
            //   render: (value) => phoneFormatter(value),
        },

        {
            title: "Estado",
            dataIndex: "state",
            key: "state",
            width: 120,
            render: (value) => (
                <div className="tag-container">
                    <span className={`new-table-tag state-${value}`} style={{ maxHeight: '24px', padding: '0px 12px' }}>
                        {value}
                        {/* {handleIcon(value)} {value} */}
                    </span>
                </div>
            ),
        },

        {
            title: "Accesos",
            dataIndex: "password",
            key: "password",
            width: 120,
            render: (value,) => (
                <div className="tag-container">
                    <Dropdown popupRender={() => (
                        <div className='passwords_container_se'>
                            <Button style={{ width: '100%' }} icon={<LuCopy size={14} />} onClick={() => copyToClipboard(value)} >{value}</Button>
                            <Button
                                style={{ width: '100%' }}
                                onClick={() => copyToClipboard(`www.iattend.events/side-event/${current?.id}?password=${value}`)}
                                icon={<LuCopy size={14} />}
                            >Link mágico</Button>
                        </div>
                    )}>
                        <Button style={{ borderRadius: '99px', maxHeight: '24px' }} icon={<LuLock />}>••••••••</Button>
                    </Dropdown>
                </div>
                // <div
                //     style={{
                //         display: "flex",
                //         alignItems: "center",
                //         justifyContent: "center",
                //         width: "100%",
                //         gap: '2px'
                //     }}
                // >
                //     <span>{value}</span>
                //     <Tooltip title="Copiar contraseña">
                //         <Button
                //             onClick={() => copyToClipboard(value)}
                //             type='text'
                //             // className="primarybutton"
                //             // style={{ maxHeight: 26 }}
                //             icon={<FaRegCopy size={14} />}
                //         />
                //     </Tooltip>
                // </div>
            ),
        },

        // {
        //     title: "Link mágico",
        //     key: "link",
        //     width: 160,
        //     render: (_, record) => {
        //         const url = `www.iattend.site/side-event/${current?.id}?password=${record.password}`;
        //         return (
        //             <div
        //                 style={{
        //                     display: "flex",
        //                     alignItems: "center",
        //                     justifyContent: "center", gap: '2px',
        //                     width: "100%",
        //                 }}
        //             >
        //                 <span >
        //                     www.iatten...
        //                 </span>
        //                 <Tooltip title="Copiar link mágico">
        //                     <Button
        //                         onClick={() => copyToClipboard(url)}
        //                         type='text'
        //                         // className="primarybutton"
        //                         // style={{ maxHeight: 26 }}
        //                         icon={<FaRegCopy size={14} />}
        //                     />
        //                 </Tooltip>

        //             </div>
        //         );
        //     },
        // },
        {
            title: "Etiqueta",
            dataIndex: "tag",
            key: "tag",
            width: 140,
            render: (value) => (
                <div className="tag-container">
                    <span className={`new-table-tag state-${value}`} style={{ maxHeight: '24px', padding: '0px 12px' }}>
                        {renderTag(value)}
                    </span>
                </div>
            ),
        },

        {
            title: "Acciones",
            key: "send",
            width: 200,
            fixed: "right",
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
                            <Tooltip placement='topRight' title={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><FaPaperPlane size={12} /><span>Enviar invitación</span></div>} color="var(--brand-color-500)">
                                <Button
                                    disabled={!phone_number || !credits > 0}
                                    // disabled={t!phone_number}
                                    // onMouseEnter={() => setActiveIcon(true)} onMouseLeave={() => setActiveIcon(false)}
                                    onClick={() => onSedingInvitation(current, record)}
                                    className="primarybutton--active"
                                    icon={<LuSend size={12} />}
                                    style={{ flex: 1, maxHeight: 30 }}
                                >
                                    Invitar
                                </Button>
                            </Tooltip>

                            <Tooltip placement='bottomLeft' title={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><FaCheck size={12} /><span>Marcar como invitado</span></div>} color="var(--brand-color-500)">
                                <Button
                                    onClick={() => onSendInvitation(record)}
                                    className="primarybutton--active"
                                    icon={<LuCheck size={12} />}
                                    style={{ minWidth: 30, maxWidth: 30, maxHeight: 30 }}
                                />
                            </Tooltip>

                            <Tooltip title="Eliminar"> <Button style={{ minWidth: '32px' }} className='primarybutton' icon={<LuUserMinus style={{ marginLeft: '2px' }} />} onClick={() => removeGuest(record.id)}></Button></Tooltip>
                        </div>
                    );
                }

                if (state === "esperando") {
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
                            <Button
                                className="primarybutton"
                                disabled
                                icon={<LuClock size={14} style={{ marginTop: 2 }} />}
                                style={{ width: "100%", maxHeight: 30, borderRadius: 99 }}
                            >
                                Esperando
                            </Button>

                            <Tooltip title="Eliminar"> <Button style={{ minWidth: '32px' }} className='primarybutton' icon={<LuUserMinus style={{ marginLeft: '2px' }} />} onClick={() => removeGuest(record.id)}></Button></Tooltip>
                        </div>

                    );
                }

                if (state === "confirmado" || state === 'rechazado') {
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


                            <Button style={{ minWidth: '32px' }} className='primarybutton' icon={<LuUserMinus style={{ marginLeft: '2px' }} />} onClick={() => removeGuest(record.id)}>Eliminar</Button>
                        </div>

                    );
                }

                // if (state === "rechazado") {
                //     return (
                //         <Button
                //             className="primarybutton"
                //             icon={<MdDelete style={{ marginTop: 2 }} />}
                //             style={{ width: "100%", maxHeight: 30, borderRadius: 99 }}
                //         >
                //             Eliminar
                //         </Button>
                //     );
                // }

                return null;
            },
        },
    ]), [current]);

    const tableProps = useMemo(() => ({
        rowKey: "id",
        columns: columns,
        pagination: false,
        scroll: { y: '80vh' },

    }), [columns]);

    const items = useMemo(() => ([
        {
            label: `Lista de espera`,
            key: "creado",
            children: (
                <Table
                    size='small'
                    {...tableProps}
                    dataSource={rawData.filter((i) => i.state === 'creado')}
                />
            ),
        },
        {
            label: `Invitación enviada`,
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
            label: `Respuesta recibida`,
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
    ]);

    const onSendInvitation = async (guest) => {

        const guestPatch = {

            state: 'esperando',
            last_action: guest.state,
            last_action_by: true,
            last_update_date: new Date()
        };

        const { data: guestRow, error: guestError } = await supabase
            .from('side_events_guests')
            .update(guestPatch)
            .eq('id', guest.id)
            .select('*')
            .maybeSingle();

        if (guestError) throw guestError;
        console.log('Guest actualizado:', guestRow);
        // setOnBubble(true)
        getGuests()

    }

    const onSedingInvitation = async (data, guest) => {


        if (data) {
            setOnSending(true)
            try {
                const payload = {
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
                                            link: data?.body?.image,
                                        },
                                    },
                                ],
                            },
                            {
                                type: "body",
                                parameters: [
                                    {
                                        type: "text",
                                        text: `${data?.name}`,
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


                console.log(payload)

                const response = await axios.post(
                    `${import.meta.env.VITE_API_URL}/api/whats`,
                    payload
                );
                if (response.data.ok) {
                    onUpdateCredits()
                    setOnSending(false)
                    setOnBubble(true)
                    onSendInvitation(guest)

                }

            } catch (error) {
                console.log(error.response?.data || error.message);
                throw error;
            }
        } else {
            message.warning('Termina de hacer tu invitación antes de enviarla')
            console.log(data?.body?.image)
            console.log(data?.name)
        }

    };

    const getSideEvents = async () => {
        const { data, error } = await supabase
            .from('side_events')
            .select('*')
            .eq('invitation_id', invitationID)

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
            .eq('id', invitationID)
            .maybeSingle()

        if (error) {
            console.error('Error al obtener invitados:', error)
            return
        }



        console.log(data.plan)
        setPlan(data.plan)
        setCredits(data.credits)
    }

    const renderTag = (value) => {
        if (value == null) return "-";
        if (typeof value === "object") return "-"; // o JSON.stringify(value)
        return String(value);
    };

    const uploadInvitationImage = async ({
        file,
        invitationID,
    }) => {
        const filePath = `${invitationID}/${Date.now()}-${file.name}`;

        const { error } = await supabase.storage
            .from('user_images')
            .upload(filePath, file, {
                upsert: true,
                contentType: file.type,
            });

        if (error) throw error;

        const { data } = supabase.storage
            .from('side_events')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const customUpload = async ({ file, onSuccess, onError }) => {
        try {
            // 1. Comprimir
            // const compressedFile = await compressImage(file);

            // 2. Subir
            const imageUrl = await uploadInvitationImage({
                file: file,
                invitationID,
            });

            // 3. Guardar en estado
            setCurrent((prev) => ({
                ...prev,
                body: {
                    ...prev.body,
                    image: imageUrl,
                },
            }));

            onSuccess();
            getInvitationImages(invitationID)
            console.log('Imagen subida correctamente');
        } catch (err) {
            console.error(err);
            console.log('Error al subir imagen');
            onError(err);
        }
    };

    const getInvitationImages = async (invitationID) => {
        const { data, error } = await supabase.storage
            .from('user_images')
            .list(invitationID, {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' },
            });

        if (error) {
            console.error(error);
            return;
        }

        if (!data) {
            console.log([]);
            return;
        }

        const images = data.map((file) => {
            const path = `${invitationID}/${file.name}`;

            const { data: urlData } = supabase.storage
                .from('user_images')
                .getPublicUrl(path);

            return {
                path,
                url: urlData.publicUrl,
            };
        });

        console.log(images);
        setImages(images)
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
                invitation_id: invitationID, // uuid
                date: new Date().toISOString(), // timestamp
                name: null,
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

        console.log('side event: ', data)

        setsideEvent((prev) => [...prev, data])
    }

    const saveSideEvent = async () => {
        if (!current?.id) return;

        const { error } = await supabase
            .from('side_events')
            .update({
                name: current.name,
                body: current.body,
            })
            .eq('id', current.id);

        if (error) {
            console.error('Error al guardar cambios:', error);
            return;
        }

        console.log('Cambios guardados correctamente');
        message.success('Guardado')
    };



    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success('Copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const getGuests = async () => {

        try {
            if (current) {
                const { data, error } = await supabase
                    .from("side_events_guests")
                    .select("*")
                    .eq("side_events_id", current?.id)

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
                .eq("invitation_id", invitationID)

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

        console.log(list)

        const {  error: guestError } = await supabase
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
            .eq('id', invitationID)
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
            .eq('id', invitationID)
            .select()

        if (updateError) {
            console.error('Error al actualizar créditos:', updateError)
            return
        }

        console.log('update credits: ', updateCredits)

        setCredits(updateCredits[0].credits ?? credits)

        console.log('Créditos actualizados correctamente:', newCredits)
    }

    const removeGuest = async (guestId) => {
        try {
            const { error: guestErr } = await supabase
                .from('side_events_guests')
                .delete()
                .eq('id', guestId);

            if (guestErr) throw guestErr;

            getGuests()
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        getInvitationImages(invitationID);
        getCredits()
        getSideEvents()
    }, [invitationID])


    useEffect(() => {
        if (open)
            getGuests()
    }, [open])

    useEffect(() => {
        if (current) {
            setOpen(true)
        }
    }, [current])

    useEffect(() => {
        if (!open) {
            setCurrent(null)
        }
    }, [open])

    useEffect(() => {
        if (onBubble) {
            setTimeout(() => {
                setOnBubble(false)
            }, 1800);
        }
    }, [onBubble])

    useEffect(() => {
        if (supabase) {
            const channel = supabase
                .channel('upload_dynamic_table')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'side_events_guests'
                    },
                    (payload) => {

                        if (payload.new.side_events_id === current.id) {
                            getGuests()
                        }


                    }
                )
                .subscribe((status) => {
                    console.log('sub status: ', status)
                })

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [])

    const truncate = (text, max = 50) =>
        text.length > max ? text.slice(0, max) + '...' : text;



    return (
        <>
            <Layout
                style={{
                    position: 'relative',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--ft-color)',
                    width: '100%',
                }}>
                <HeaderDashboard setMode={setMode} mode={mode} setOnQR={setOnQR} invitation={invitation} />
                <Layout className='build-invitation-layout' style={{
                    padding: '24px', paddingTop: '0px',
                    marginTop: '65px', paddingBottom: '24px', position: 'relative',
                }} >

                    <div className='guests-info-container' >

                        <span className='guests-title-page'>Mis eventos</span>

                        {
                            sideEvent ?
                                <div className='side_events_container'>
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
                                                }}>{item?.name ?? "[Sin nombre]"}</span>
                                            </div>
                                        ))
                                    }

                                    {
                                        ((plan === 'pro' && sideEvent.length <= 2) || (plan === "lite" && sideEvent.length === 0)) &&
                                        <Button icon={<LuPlus size={44} />} onClick={insertSideEvent} className='side_event_item side_event_btn' style={{ width: '100%', height: '100%' }}>
                                        </Button>
                                    }
                                </div>
                                : <div className='side_events_spin'>
                                    <Spin />
                                </div>
                        }

                    </div>

                    <Modal
                        footer={false}
                        onCancel={() => setOpen(false)}
                        onOk={() => setOpen(false)}
                        style={{ top: 20 }}
                        width="90%"
                        closeIcon={false}
                        styles={{
                            content: {
                                borderRadius: '24px',
                                padding: '0px',
                                height: '90vh',
                                overflow: 'hidden',
                                position: 'relative'
                            },
                            body: {
                                display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
                                width: '100%',
                                position: 'relative'

                            }
                        }}
                        open={open}
                    >

                        <div onClick={() => setOnSending(false)} className={`edit-tickets-container`} style={{
                            width: onSending ? '190px' : '0px',
                            borderRadius: '99px',
                            height: '40px',
                        }}>

                            {
                                onSending &&
                                <div
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                        boxSizing: 'border-box', padding: '0px 12px', height: '100%', borderRadius: '99px',
                                        cursor: 'pointer',
                                        width: '100%'
                                    }}>
                                    <FaPaperPlane className='paper_flight' />
                                    <span style={{ fontSize: '14px' }}>Enviado invitación </span>
                                </div>
                            }

                        </div>

                        <div className={onBubble ? 'ticket_bubble' : 'hide_bubble'}>-1 crédito</div>

                        <div className='side_invitation_cont' style={{ background: handlePreview ? '#FFFFFF' : undefined, }}>
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



                                        <div className='single_col' style={{ alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                            {
                                                !current?.body?.image &&
                                                <div className='add_image_cont' style={{ backgroundColor: `${current?.body?.color ?? "#000000"}40` }}>
                                                    <LuImage style={{ color: '#FFF' }} />
                                                </div>
                                            }



                                            <Dropdown
                                                trigger={['click']}
                                                placement='topRight'
                                                popupRender={() => (
                                                    <div className="side_images_cont scroll-invitation">
                                                        <div onClick={() => setCurrent((prev) => ({ ...prev, body: { ...prev.body, image: null } }))} className='clear_image_sidee'>
                                                            <LuImageOff size={24} />
                                                        </div>
                                                        {
                                                            images?.map((im, index) => (
                                                                <div onClick={() => setCurrent((prev) => ({ ...prev, body: { ...prev.body, image: im.url } }))} key={index} className='img_cont_sidevents'>
                                                                    <img src={im.url} alt={im.path} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                </div>
                                                            ))
                                                        }

                                                        <Upload
                                                            accept="image/*"
                                                            showUploadList={false}
                                                            customRequest={customUpload}
                                                        >
                                                            <Button icon={<LuPlus size={24} />} className='primarybutton'
                                                                style={{
                                                                    width: '120px', height: '120px',
                                                                    borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'
                                                                }}>Subir imagen</Button>
                                                        </Upload>
                                                    </div>


                                                )}>

                                                <Button style={{
                                                    backdropFilter: 'blur(10px)', backgroundColor: `${current?.body?.color ?? "#000000"}40`,
                                                    border: 'none',
                                                    color: '#FFFFFF', borderRadius: '99px'
                                                }} >{current?.body?.image ? "Cambiar fondo" : "Agregar fondo"}</Button>
                                            </Dropdown>
                                        </div>

                                        <div className='side_info_cont' style={{ backgroundColor: `${current?.body?.color ?? "#000000"}40`, transform: 'scale(0.9)' }}>
                                            <TextArea
                                                key={`
                                            ${current?.body?.title?.size}-
                                            ${current?.body?.title?.line_height}-
                                            ${current?.body?.title?.font}-
                                            ${current?.body?.title?.weight}
                                        `}
                                                className="side_title_input"
                                                placeholder="Título del evento"
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


                                            <Dropdown
                                                trigger={['click']}
                                                placement='right'

                                                popupRender={() => (
                                                    <DatePicker onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, hour: e } }))} className='date_pciker_sidee' showTime />
                                                )}
                                            >
                                                <div className='side_date_time'>
                                                    <LuCalendarClock size={20} style={{ color: '#FFF' }} />
                                                    {
                                                        current?.body?.hour ? <span>{formatInvitationDate(current.body.hour)}</span>
                                                            : <span>Fecha y hora</span>
                                                    }

                                                </div>
                                            </Dropdown>

                                            <Dropdown
                                                placement='right'
                                                trigger={['click']}
                                                popupRender={() => (
                                                    <div className='address_form_sidee'>
                                                        <div className='single_col'>
                                                            <span>Calle</span>
                                                            <Input
                                                                value={current?.body?.address?.street}
                                                                onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, street: e.target.value } } }))}

                                                                className='sidee_input' />
                                                        </div>
                                                        <div className='single_col'>
                                                            <span>Colonia</span>
                                                            <Input
                                                                value={current?.body?.address?.neighborhood}
                                                                onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, neighborhood: e.target.value } } }))}
                                                                className='sidee_input' />
                                                        </div>
                                                        <div className='single_col'>
                                                            <span>Número</span>
                                                            <Input value={current?.body?.address?.number}
                                                                onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, number: e.target.value } } }))}
                                                                className='sidee_input' style={{ width: '100%', color: '#FFFFFF' }} />
                                                        </div>
                                                        <div className='single_col'>
                                                            <span>Ciudad</span>
                                                            <Input
                                                                value={current?.body?.address?.city}
                                                                onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, city: e.target.value } } }))}
                                                                className='sidee_input' />
                                                        </div>
                                                        <div className='single_col'>
                                                            <span>Estado</span>
                                                            <Input
                                                                value={current?.body?.address?.state}
                                                                onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, state: e.target.value } } }))}
                                                                className='sidee_input' />
                                                        </div>
                                                        <div className='single_col'>
                                                            <span>País</span>
                                                            <Input value={current?.body?.address?.country}
                                                                onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, country: e.target.value } } }))}
                                                                className='sidee_input' />
                                                        </div>

                                                        <div className='single_col'>
                                                            <span>Código postal</span>
                                                            <Input
                                                                value={current?.body?.address?.zipcode}
                                                                onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, zipcode: e.target.value } } }))}
                                                                className='sidee_input' />
                                                        </div>

                                                        <div className='single_col'>
                                                            <span>URL Google Maps</span>
                                                            <Input
                                                                value={current?.body?.address?.url}
                                                                onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, url: e.target.value } } }))}
                                                                className='sidee_input' />
                                                        </div>
                                                    </div>
                                                )}
                                            >
                                                <div className='side_date_time'>

                                                    <LuMapPin size={20} style={{ color: '#FFF' }} />
                                                    {
                                                        current?.body?.address.zipcode ? <span style={{ textAlign: 'center' }}>{current.body.address.street} {current.body.address.number} {current.body.address.neighborhood}, {current.body.address.zipcode}, {current.body.address.city}, {current.body.address.state}, {current.body.address.country}</span>
                                                            : <span>Ubicación</span>
                                                    }
                                                </div>
                                            </Dropdown>

                                            <TextArea
                                                key={`
                                                     ${current?.body?.title?.line_height}-
                                                    ${current?.body?.title?.weight}-
                                                    ${current?.body?.title?.size}-
                                                     ${current?.body?.title?.font}`}
                                                className="side_title_input"
                                                placeholder="Extras"
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

                            <div className='single_row' style={{ justifyContent: 'space-between', width: 'calc(100% - 32px)', position: 'absolute', top: '16px', right: '16px', gap: '12px' }}>
                                {
                                    !handlePreview ? <Button onClick={saveSideEvent} icon={<LuUpload />} className='save_button_sidee'>Guardar</Button>
                                        : <Button icon={handlePreview ? <LuCornerUpLeft /> : <LuPlay />} onClick={() => setHandlePreview(!handlePreview)} style={{ backgroundColor: handlePreview ? "#00000080" : `${current?.body?.color ?? "#000000"}40` }} className='preview_button_sidee'>{!handlePreview ? "" : 'Regresar'}</Button>
                                }




                                {
                                    !handlePreview &&
                                    <div className='single_row' style={{ width: 'auto', gap: '12px' }}>
                                        <Tooltip title="Previsualizar">
                                            <Button icon={handlePreview ? <LuCornerUpLeft /> : <LuPlay />} onClick={() => setHandlePreview(!handlePreview)} style={{ backgroundColor: handlePreview ? "#00000080" : `${current?.body?.color ?? "#000000"}40` }} className='preview_button_sidee'>{!handlePreview ? "" : 'Regresar'}</Button>
                                        </Tooltip>

                                        <Dropdown
                                            placement='bottomLeft'
                                            trigger={['click']}
                                            popupRender={() => (
                                                <div className='generals-settings-popup' style={{ width: 'auto', background: '#00000040', backdropFilter: 'blur(10px)' }}>
                                                    <ColorPicker value={current?.body?.color ?? "#000000"} onChange={(e) => setCurrent((prev) =>
                                                    ({
                                                        ...prev, body: { ...prev?.body, color: colorFactoryToHex(e) }
                                                    })
                                                    )} />
                                                </div>
                                            )}
                                        >
                                            <Button style={{ backgroundColor: `${current?.body?.color ?? "#000000"}40` }} className='preview_button_sidee' icon={<LuPalette />}></Button>
                                        </Dropdown>


                                        <Dropdown
                                            trigger={['click']}
                                            placement='bottomLeft'
                                            popupRender={() => (
                                                <div className='generals-settings-popup' style={{ backgroundColor: `${current?.body?.color ?? "#000000"}40`, backdropFilter: 'blur(10px)' }}>

                                                    <span style={{ color: '#FFF' }} className='gc-content-label'>Tipo de letra</span>

                                                    <Select

                                                        value={current?.body?.title?.font ?? invitation?.generals?.fonts?.body?.typeFace}
                                                        onChange={(e) => setCurrent((prev) => ({
                                                            ...prev, body: {
                                                                ...prev.body, title: {
                                                                    ...prev.body.title, font: e
                                                                }
                                                            }
                                                        }))}
                                                        style={{ width: '100%' }}>
                                                        {fonts.map((font, index) => (
                                                            <Option key={`${index}-${font}`} value={font}><span style={{ fontFamily: font }} >{font}</span></Option>
                                                        ))}

                                                    </Select>

                                                    <Col style={{
                                                        width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column',
                                                        marginTop: '10px'
                                                    }}>
                                                        <span style={{ color: '#FFF' }} className='gc-content-label'>Tamaño</span>

                                                        <Slider
                                                            style={{ width: '95%', }}
                                                            min={36}
                                                            max={64}
                                                            step={2}
                                                            onChange={(e) => setCurrent(prev => ({
                                                                ...prev,
                                                                body: {
                                                                    ...prev.body,
                                                                    title: {
                                                                        ...prev.body.title,
                                                                        size: e

                                                                    }
                                                                },
                                                            }))}
                                                            // onChange={onChange}
                                                            value={current.body.title?.size ?? 36}
                                                        />

                                                        <span style={{ color: '#FFF' }} className='gc-content-label'>Interlineado</span>

                                                        <Slider
                                                            style={{ width: '95%', }}
                                                            min={0.8}
                                                            max={2}
                                                            step={0.1}
                                                            onChange={(e) => setCurrent(prev => ({
                                                                ...prev,
                                                                body: {
                                                                    ...prev.body,
                                                                    title: {
                                                                        ...prev.body.title,
                                                                        line_height: e

                                                                    }
                                                                },
                                                            }))}
                                                            // onChange={onChange}
                                                            value={current.body.title?.line_height ?? 1.4}
                                                        />

                                                        <Row style={{
                                                            width: '100%', display: 'flex', alignItems: 'center',
                                                            justifyContent: 'space-between', flexDirection: 'row'
                                                        }}>
                                                            <Col style={{
                                                                width: '48%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column'
                                                            }}>

                                                                <span style={{ color: '#FFF' }} className='gc-content-label'>Opacidad</span>


                                                                <Slider
                                                                    style={{ width: '95%' }}
                                                                    min={0.1}
                                                                    max={1}
                                                                    step={0.01}
                                                                    onChange={(e) => setCurrent(prev => ({
                                                                        ...prev,
                                                                        body: {
                                                                            ...prev.body,
                                                                            title: {
                                                                                ...prev.body.title,
                                                                                opacity: e
                                                                            }
                                                                        },
                                                                    }))}
                                                                    // onChange={onChange}
                                                                    value={current.body.title?.opacity ?? 1}
                                                                />

                                                            </Col>

                                                            <Col style={{
                                                                width: '48%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column'
                                                            }}>
                                                                <span style={{ color: '#FFF' }} className='gc-content-label'>Grosor</span>



                                                                <Slider
                                                                    style={{ width: '95%' }}
                                                                    min={100}
                                                                    max={1000}
                                                                    step={100}

                                                                    onChange={(e) => setCurrent(prev => ({
                                                                        ...prev,
                                                                        body: {
                                                                            ...prev.body,
                                                                            title: {
                                                                                ...prev.body.title,
                                                                                weight: e

                                                                            }
                                                                        },
                                                                    }))}

                                                                    value={current.body.title?.weight ?? 500}
                                                                />

                                                            </Col>
                                                        </Row>
                                                    </Col>

                                                </div>
                                            )}
                                        >
                                            <Button style={{ backgroundColor: `${current?.body?.color ?? "#000000"}40` }} className='preview_button_sidee' icon={<LuType />}></Button>
                                        </Dropdown>

                                    </div>
                                }

                            </div>

                        </div>

                        <div className='side_table_cont'>

                            <div className='side-evennts_table_container'>
                                <Tabs
                                    style={{ width: '100%', }}
                                    type="card"
                                    items={items}
                                    tabBarExtraContent={
                                        <div className='single_row' style={{ marginRight: '16px', marginBottom: '16px', gap: '4px' }}>
                                            <Dropdown
                                                key={0}
                                                trigger={['click']}
                                                placement='bottomRight'
                                                popupRender={() => (
                                                    <div key={2} className='single_col' style={{
                                                        boxSizing: 'border-box', backgroundColor: '#FFF', padding: '12px',
                                                        boxShadow: '0px 0px 12px rgba(0,0,0,0.2)', borderRadius: '16px', gap: '12px',
                                                        marginTop: '8px'
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
                                                                        <span><b>Lista principal</b></span>
                                                                        <Button onClick={handleSideGuests} className='primarybutton--active' icon={<LuPlus />}>Agregar</Button>
                                                                    </div>
                                                                    <Input value={searchMain} onChange={(e) => setSearchMain(e.target.value)} placeholder='Búscar invitado' style={{ borderRadius: '99px' }} />
                                                                    <div className='single_col scroll-invitation' style={{
                                                                        alignSelf: 'stretch', gap: '2px',
                                                                        maxHeight: '100%', overflowY: 'auto'
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

                                                                                        <span style={{ minWidth: '130px', }}>{truncate(i.name, 16)}</span>

                                                                                        <div className='new-table-tag' style={{display:'flex',alignItems:'center',justifyContent:'center', minWidth:'60px'}}>
                                                                                            <span style={{fontSize:'12px'}}>{i.tag ?? "-"}</span>
                                                                                        </div>

                                                                                        <div className={`new-table-tag state-${i.state}`} style={{display:'flex',alignItems:'center',justifyContent:'center', minWidth:'80px', opacity:'0.7'}}>
                                                                                            <span style={{fontSize:'12px'}}>{i.state ?? "-"}</span>
                                                                                        </div>

                                                                                    </div>
                                                                                ))

                                                                                : <Spin />
                                                                        }

                                                                    </div>
                                                                </div>
                                                            )}
                                                        >
                                                            <Button onClick={getMainGuests} style={{ width: '100%' }} icon={<LuCopy />}>Copiar de otra lista</Button>

                                                        </Dropdown>
                                                        <Button onClick={() => setOnCreate(true)} style={{ width: '100%' }} icon={<LuPlus />}>Crear invitado</Button>
                                                    </div>
                                                )}
                                            >
                                                <Button className='primarybutton' icon={<LuPlus />} >Agregar invitados</Button>
                                            </Dropdown>
                                            <Button onClick={() => setOpen(false)} className='primarybutton' icon={<LuX />}></Button>
                                        </div>
                                    }

                                />
                            </div>
                        </div>

                        <Tooltip color="#6D3CFA">
                            <div
                                onClick={() => setActiveTickets(true)}
                                // onClick={() => setOnBubble(true)}
                                onMouseEnter={() => setOnTickets(true)} onMouseLeave={() => setOnTickets(false)}
                                style={{ bottom: '2%', right: '1.4%', maxHeight: '220px', borderRadius: activeTickets && '16px',  }}
                                className={`tickets_button ${activeTickets ? 'tickets_button_active' : ''}`}>
                                {!activeTickets && (
                                    <>
                                        <Progress
                                            showInfo={false}
                                            status="active"
                                            type="circle"
                                            percent={(credits * 100) / 300}
                                            size={80}
                                            strokeWidth={12}
                                            strokeColor={"#6D3CFA"}
                                        />

                                        {!onTickets ? (
                                            <LuCoins size={28} style={{ position: "absolute", color: "#6D3CFA" }} />
                                        ) : (
                                            <LuPlus size={28} style={{ position: "absolute", color: "#6D3CFA" }} />
                                        )}
                                    </>
                                )}

                                {
                                    activeTickets && (
                                        <div onClick={(e) => e.stopPropagation()} className='active_tickets_cont'>
                                            <div className='active_t_row' style={{ justifyContent: 'space-between', }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                    <LuCoins size={18} />
                                                    <span style={{ fontSize: '16px' }} className='active_t_title'>Créditos</span>
                                                </div>
                                                <Button icon={<GoChevronDown style={{ marginTop: '6px' }} size={18} />} type='text' onClick={() => setActiveTickets(false)}></Button>
                                            </div>

                                            <div className='edit-tickets-buttons-container'>

                                                <div className='edit-tickets-dash'>

                                                    <div className='dash-row-pie'>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                                            <Progress
                                                                type="dashboard"
                                                                steps={10}
                                                                percent={(credits * 100) / 300}
                                                                strokeWidth={10}
                                                                strokeColor={'#6D3CFA'}
                                                                trailColor='#F5F3F2'
                                                                showInfo={false}
                                                            />
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0px', position: 'absolute' }}>
                                                                <span style={{ fontWeight: 600, fontSize: '22px', lineHeight: 1 }}>{credits}</span>
                                                                <span style={{ fontSize: '8px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>Disponibles</span>
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', fontSize: '13px' }}>
                                                            <span><b>¿Qué son los créditos?</b></span>
                                                            <span>Cada invitación enviada usa 1 crédito y puedes recargar cuando lo necesites.</span>

                                                            <Button icon={<FaCoins />} type='primary' style={{ fontSize: '12px', marginTop: '12px' }}>Recargar credtios</Button>
                                                        </div>

                                                    </div>

                                                </div>

                                            </div>
                                        </div>
                                    )
                                }
                            </div>
                        </Tooltip>

                    </Modal>


                </Layout >

                <CreateGuest sideID={current?.id} setOnCreate={setOnCreate} onCreate={onCreate} invitationID={invitationID} getGuests={getGuests} />
            </Layout >
        </>
    )
}
