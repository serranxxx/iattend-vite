import { Button, Divider, Drawer, Dropdown, Input, Rate, Select, Space } from 'antd';
import React, { useEffect, useRef, useState } from 'react'
import { IoMdAdd, IoMdRefresh } from 'react-icons/io';
import { supabase } from '../../lib/supabase';
import { IoClose } from 'react-icons/io5';
import { FaCheck, FaStar } from 'react-icons/fa';
import { FiMinus } from 'react-icons/fi';
import { generateSimpleId } from '../../helpers/assets/functions';

const { Option } = Select;
export const CreateGuest = ({ invitationID, onCreate, setOnCreate, sideID, getGuests }) => {

    const [guestData, setGuestData] = useState({
        phone_code: "+52",
        phone_number: "",
        name: null,
        tier: null,
        tag: null,
        notes: null,
        state: null,
    })
    const [newTag, setNewTag] = useState(null)
    const [localTags, setLocalTags] = useState([])
    const [priorityCalc, setPriorityCalc] = useState({
        necesity: 0,
        probability: 0,
        her: 0,
        him: 0,
        score: 0,
        open: false,
        category: null
    })
    const [companionsData, setCompanionsData] = useState([])
    const inputRef = useRef(null);

    const handleGrade = () => {
        const necesity = Number(priorityCalc.necesity) || 0;
        const probability = Number(priorityCalc.probability) || 0;

        const herRaw = priorityCalc.her;
        const himRaw = priorityCalc.him;

        const her = herRaw != null ? Number(herRaw) : null;
        const him = himRaw != null ? Number(himRaw) : null;

        // percepción: promedio si hay 2, si no, el que exista, si no, 0
        let perception = 0;
        if (her != null && him != null) perception = (her + him) / 2;
        else if (her != null) perception = her;
        else if (him != null) perception = him;

        // pesos (ajustables)
        const score =
            necesity * 0.4 +
            probability * 0.3 +
            perception * 0.3;

        let category = "D";
        if (score >= 4) category = "A";
        else if (score >= 3) category = "B";
        else if (score >= 2) category = "C";

        // Guarda en tu state
        setPriorityCalc(prev => ({
            ...prev,
            score: Number(score.toFixed(2)),
            category,
        }));

        setGuestData((prev) => ({
            ...prev,
            tier: category
        }))

        // (opcional) log para debug
        console.log({
            necesity,
            probability,
            her,
            him,
            perception,
            score,
            category,
        });
    };

    const addTagsToInvitation = async () => {
        // Primero, obtenemos los tags actuales
        const { data, error: fetchError } = await supabase
            .from('invitations')
            .select('tags')
            .eq('id', invitationID)
            .single()

        if (fetchError) {
            console.error('Error al obtener tags:', fetchError)
            return
        }

        const currentTags = data?.tags || []

        // Combinar sin duplicados
        const updatedTags = Array.from(new Set([...currentTags, newTag]))

        // Actualizar en la base de datos
        const { data: updatedData, error: updateError } = await supabase
            .from('invitations')
            .update({ tags: updatedTags })
            .eq('id', invitationID)
            .select('tags')

        if (updateError) {
            console.error('Error al actualizar tags:', updateError)
        } else {
            console.log('Tags actualizados correctamente:', updatedData[0].tags)
            setLocalTags(updatedData[0].tags)
            setNewTag(null)
        }
    }

    const handleDescriptions = (category) => {
        switch (category) {
            case 'A': return 'Tiene que estar sí o sí. El evento no se siente completo sin esta persona.'
            case 'B': return 'Quiero que esté; haría el evento mucho mejor, pero si el cupo aprieta podría quedar fuera.'
            case 'C': return 'Me gustaría invitarle si hay espacio y presupuesto; no pasa nada grave si no viene.'
            case 'D': return 'Solo se invita si sobra cupo o por cortesía/compromiso leve.'


            default:
                break;
        }
    }

    const updateTicketCount = (action) => {

        const isAdd = action === 'add';

        if (isAdd) {
            setCompanionsData([
                ...companionsData,
                {
                    phone_code: "+52",
                    phone_number: "",
                    name: "",
                    tier: guestData.tier,
                    tag: guestData.tag,
                    notes: "",
                    state: null,
                }
            ])
        }

        else {
            if (companionsData?.length > 0) setCompanionsData((prev) => prev.slice(0, -1));
        }

        // setavailableTickets((prev) => prev + (isAdd ? -1 : 1));
    };

    const getTags = async () => {
        const { data, error } = await supabase
            .from('invitations')
            .select('tags')     // nuevo valor
            .eq('id', invitationID)
            .maybeSingle()         // o usa .eq('mongo_id', '...') si prefieres


        if (error) {
            console.error(error)
        } else {
            console.log('tags: ', data.tags)
            setLocalTags(data.tags)
        }
    }

    const onAddingGuest = async () => {
        try {
            // 1) Armar guest principal
            const newguest = {
                side_events_id: sideID,
                password: generateSimpleId(),
                phone_number: guestData.phone_number ? (guestData.phone_code + guestData.phone_number) : "",
                name: guestData.name || '',
                tier: guestData.tier || null,
                tag: guestData.tag || null,
                table: null,
                state: 'creado',
                last_action: 'creado',
                notes: guestData.notes ?? null,
                meal: null,
                companion_id: null,
                ticket: true,
                has_companion: companionsData?.length > 0 ? true : false,
                last_action_by: true,
            };

            const { data: guestRows, error: guestError } = await supabase
                .from('side_events_guests')
                .insert([newguest])
                .select('id'); // solo necesitamos el id

            if (guestError) {
                console.error('Error al insertar guest:', guestError);
                return;
            }

            const guestId = guestRows?.[0]?.id;
            const guestName = guestRows?.[0]?.name
            if (!guestId) {
                console.error('No se obtuvo el id del guest recién creado.');
                return;
            }

            if (Array.isArray(companionsData) && companionsData?.length > 0) {
                for (const c of companionsData) {
                    const companionRecord = {
                        side_events_id: sideID,
                        password: generateSimpleId(), // cada companion con su propio password
                        phone_number: c.phone_number ? (c.phone_code + c.phone_number) : "",
                        name: c.name ?? `Acompañante de ${guestName}`,
                        tier: c.tier ?? guestData.tier ?? null,
                        tag: c.tag ?? guestData.tag ?? null,
                        table: null,
                        state: 'creado',
                        last_action: 'creado',
                        notes: c.notes ?? null,
                        meal: null,
                        companion_id: guestId, // 👈 referencia al guest principal
                        ticket: true,
                        has_companion: false,
                        last_action_by: true,
                    };

                    const { error: compErr } = await supabase
                        .from('side_events_guests') // si tus companions van en otra tabla, cámbiala aquí
                        .insert([companionRecord]);

                    if (compErr) {
                        console.error('Error al insertar companion:', compErr, 'payload:', companionRecord);
                    }
                }
            }

            getGuests()
            setGuestData({
                phone_code: "+52",
                phone_number: "",
                name: null,
                tier: null,
                tag: null,
                notes: null,
            })
            setCompanionsData([])
        } catch (err) {
            console.error('Fallo general al guardar cambios:', err);
        }
    };


    useEffect(() => {

        setNewTag(null)
        getTags()
        // setNextStep(false)

        // setGuestData({
        //     phone_code: "+52",
        //     phone_number: "",
        //     name: null,
        //     tier: null,
        //     tag: null,
        //     notes: null,
        //     state: null,
        // })

    }, [])



    return (

        <Drawer
            open={onCreate}
            onClose={() => setOnCreate(false)}
            placement='right'
            closable={true}
            title={"Nuevo invitado"}
            width={550}
            extra={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Button onClick={onAddingGuest} icon={<FaCheck style={{ marginTop: '2px' }} />} className='primarybutton--black--active' style={{ borderRadius: '99px' }}>Guardar</Button>
            </div>}

        >
            <div className='new-guest-container' >


                <div className='new-guest-form-container' style={{ alignItems: 'center' }}>

                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', }}>
                        <span style={{ fontSize: '16px' }} className='gc-content-label'><b>Datos de invitado</b></span>
                    </div>
                    <div style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                        gap: '12px'
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                            flex: 1, gap: '4px'
                        }}>
                            <span className='gc-content-label'>Nombre</span>
                            <Input
                                placeholder={'Nombre'}
                                value={guestData?.name}
                                onChange={(e) => setGuestData((prev) => ({
                                    ...prev,
                                    name: e.target.value
                                }))}
                                className='gc-input-text' />
                        </div>


                        <div style={{
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                            flex: 1, gap: '4px'
                        }}>
                            <span className='gc-content-label'>Contacto</span>
                            <Space.Compact style={{ width: '100%' }}>
                                <Select
                                    value={guestData?.phone_code}
                                    onChange={(e) => setGuestData((prev) => ({
                                        ...prev,
                                        phone_code: e
                                    }))}
                                    style={{ width: '100px' }}
                                >
                                    <Option value="+1">🇺🇸 +1</Option>
                                    <Option value="+44">🇬🇧 +44</Option>
                                    <Option value="+33">🇫🇷 +33</Option>
                                    <Option value="+52">🇲🇽 +52</Option>
                                    <Option value="+34">🇪🇸 +34</Option>
                                </Select>
                                <Input
                                    type="tel"
                                    placeholder="Número de teléfono"
                                    className='gc-input-text'
                                    style={{
                                        borderRadius: '0px 99px 99px 0px',
                                        color: guestData.phone_number?.length > 0 && guestData.phone_number?.length < 10 && 'red',
                                        border: guestData.phone_number?.length > 0 && guestData.phone_number?.length < 10 && '1px solid red'
                                    }}
                                    value={guestData?.phone_number}
                                    onChange={(e) => {
                                        const onlyNumbers = e.target.value.replace(/\D/g, ''); // elimina todo lo que no sea número
                                        setGuestData((prev) => ({
                                            ...prev,
                                            phone_number: onlyNumbers,
                                        }));
                                    }}
                                    maxLength={10}
                                />
                            </Space.Compact>
                        </div>



                    </div>

                    <div style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                        gap: '12px'
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                            flex: 1, gap: '4px'
                        }}>
                            <span className='gc-content-label'>Etiqueta</span>
                            <Select
                                style={{ width: '100%' }}
                                placeholder="Seleccionar etiqueta"
                                value={guestData?.tag}
                                onChange={(e) => setGuestData((prev) => ({
                                    ...prev,
                                    tag: e
                                }))}
                                dropdownRender={(menu) => (
                                    <>
                                        {menu}
                                        <Divider style={{ margin: '8px 0', }} />
                                        <Space style={{ padding: '0 8px 4px' }}>
                                            <Input
                                                placeholder="Nueva etiqueta"
                                                ref={inputRef}
                                                value={newTag}
                                                onChange={(e) => setNewTag(e.target.value)}
                                                onKeyDown={(e) => e.stopPropagation()}
                                            />
                                            <Button icon={<IoMdAdd />} onClick={() => addTagsToInvitation()}>
                                                Agregar
                                            </Button>
                                        </Space>
                                    </>
                                )}
                                options={localTags.map((item) => ({ label: item, value: item }))}
                            />
                        </div>


                        <div style={{
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                            flex: 1, gap: '4px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <span className='gc-content-label'>Prioridad</span>
                                <Dropdown
                                    open={priorityCalc?.open}
                                    onClick={() => setPriorityCalc({
                                        necesity: 0,
                                        probability: 0,
                                        her: 0,
                                        him: 0,
                                        score: 0,
                                        category: null,
                                        open: true,
                                    })}
                                    trigger={["click"]}
                                    popupRender={() => (
                                        <span className='priority_container'>
                                            <div className='priority_container_col' style={{ gap: '0px', width: '100%' }}>
                                                {/* <FaStar size={16}  /> */}
                                                <div className='priority_container_row' style={{ width: '100%', justifyContent: 'space-between' }}>
                                                    <span className='priority_container_title' style={{ fontWeight: 400 }}>Define la prioridad</span>
                                                    <div className='priority_container_row'>
                                                        <Button onClick={priorityCalc.category ? () => setPriorityCalc({
                                                            necesity: 0,
                                                            probability: 0,
                                                            her: 0,
                                                            him: 0,
                                                            score: 0,
                                                            category: null
                                                        }) : handleGrade}
                                                            icon={priorityCalc.category && <IoMdRefresh />}
                                                            style={{ borderRadius: '99px' }} type='primary'>{priorityCalc.category ? 'Recalcular' : 'Calcular'}</Button>
                                                        <Button onClick={() => setPriorityCalc({
                                                            necesity: 0,
                                                            probability: 0,
                                                            her: 0,
                                                            him: 0,
                                                            score: 0,
                                                            category: null,
                                                            open: false,
                                                        })} className='primarybutton' icon={<IoClose />}></Button>
                                                    </div>
                                                </div>
                                                <span className='priority_container_title' style={{ fontSize: '18px', lineHeight: 1 }}>{guestData.name ?? ""}</span>
                                            </div>

                                            {
                                                priorityCalc.category ?

                                                    <div className='priority_container_row' style={{ gap: '8px', width: '100%' }}>
                                                        <div className={`priority_box tier-${priorityCalc.category}`}>
                                                            {priorityCalc.category}
                                                        </div>
                                                        <div className={`priority_dec tier-${priorityCalc.category}`}>
                                                            {handleDescriptions(priorityCalc.category)}
                                                        </div>
                                                    </div>

                                                    : <div className='priority_container_col' style={{ gap: '16px' }}>
                                                        <div className='priority_container_col' style={{ gap: '0' }}>
                                                            <span style={{ fontWeight: 500, fontSize: '16px' }}>1. Necesidad de asistencia</span>
                                                            <span style={{ fontSize: '14px', opacity: '0.4' }}>¿Qué tan importante es para ti que esté?</span>
                                                            <Rate style={{ marginTop: '8px' }} allowHalf value={priorityCalc.necesity} onChange={(e) => setPriorityCalc((prev) => ({
                                                                ...prev,
                                                                necesity: e
                                                            }))} />
                                                        </div>

                                                        <div className='priority_container_col' style={{ gap: '0px' }}>
                                                            <span style={{ fontWeight: 500, fontSize: '16px' }}>2. Probabilidad de asistencia</span>
                                                            <span style={{ fontSize: '14px', opacity: '0.4' }}>¿Qué tan probable es que pueda asistir?</span>
                                                            <Rate style={{ marginTop: '8px' }} allowHalf value={priorityCalc.probability} onChange={(e) => setPriorityCalc((prev) => ({
                                                                ...prev,
                                                                probability: e
                                                            }))} />
                                                        </div>

                                                        <div className='priority_container_col' style={{ alignSelf: 'stretch', gap: '0px' }}>
                                                            <span style={{ fontWeight: 500, fontSize: '16px' }}>3. ¿Cómo lo califican?</span>
                                                            <div className='priority_container_row' style={{ width: '100%', gap: '24px' }} >
                                                                <div className='priority_container_col' style={{ flex: 1, gap: '0px' }}>
                                                                    <span style={{ opacity: '0.4' }}>Ella</span>
                                                                    <Rate allowHalf value={priorityCalc.her} onChange={(e) => setPriorityCalc((prev) => ({
                                                                        ...prev,
                                                                        her: e
                                                                    }))} />
                                                                </div>

                                                                <div className='priority_container_col' style={{ flex: 1, gap: '0px' }}>
                                                                    <span style={{ opacity: '0.4' }}>Él</span>
                                                                    <Rate allowHalf value={priorityCalc.him} onChange={(e) => setPriorityCalc((prev) => ({
                                                                        ...prev,
                                                                        him: e
                                                                    }))} />
                                                                </div>
                                                            </div>
                                                        </div>

                                                    </div>
                                            }








                                        </span>
                                    )}
                                >
                                    <Button icon={<FaStar />} style={{ maxHeight: 24, color: '#6D3CFA', fontSize: '13px', fontWeight: 600, }} type='text'>Calcular prioridad</Button>
                                </Dropdown>
                            </div>

                            <Select
                                value={guestData?.tier}
                                placeholder="Prioridad de invitado"
                                onChange={(e) => setGuestData((prev) => ({
                                    ...prev,
                                    tier: e
                                }))}
                                style={{ width: '100%' }}
                            >
                                <Option value="A">A</Option>
                                <Option value="B">B</Option>
                                <Option value="C">C</Option>
                                <Option value="D">D</Option>
                            </Select>
                        </div>

                    </div>

                    {/* {
        drawerState.onEditGuest &&
        <div style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
            gap: '12px'
        }}>
            <div style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                flex: 1, gap: '4px'
            }}>
                <span className='gc-content-label'>Estado</span>
                <Select
                    placeholder="Estado actual"
                    value={guestData.state}
                    onChange={(e) => setGuestData((prev) => ({
                        ...prev,
                        state: e
                    }))}
                    style={{ width: '100%' }}
                >
                    <Option value="creado">Creado</Option>
                    <Option value="esperando">Esperando</Option>
                    <Option value="confirmado">Confirmado</Option>
                    <Option value="rechazado">Rechazado</Option>
                </Select>
            </div>

        </div>
    } */}

                    <div style={{
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                        flex: 1, gap: '4px', width: '100%'
                    }}>
                        <span className='gc-content-label'>Notas</span>
                        <Input.TextArea
                            placeholder='Información extra sobre el invitado'
                            value={guestData?.notes}
                            onChange={(e) => setGuestData((prev) => ({
                                ...prev,
                                notes: e.target.value
                            }))}
                            autoSize={{ minRows: 3, maxRows: 5 }}
                            style={{
                                borderRadius: '8px'
                            }} />
                    </div>

                    {/* {
        drawerState.onEditGuest &&
        <Tooltip title={`Eliminar ${guestData.name}`}>
            <Popconfirm
                style={{ maxWidth: '200px !important' }}
                title="Eliminar invitado"
                description={companionsData?.length > 0 ? `Al eliminar a ${guestData.name} eliminarás a sus acompañantes. ¿Deseas continuar?` : `Estas seguro de eliminar a ${guestData?.name}`}
                onConfirm={() => deleteGuestWithCompanions(drawerState.currentGuest.id)}
                // onCancel={cancel}
                okText="Eliminar"
                cancelText="Cancelar"
            >
                <Button className='primarybutton'>Eliminar</Button>
            </Popconfirm>

        </Tooltip>
    } */}

                </div>

                {/* {
    (drawerState.onEditGuest && !drawerState.currentGuest.has_companion && drawerState.currentGuest.companion_id) ?

        <span style={{
            fontSize: '16px'
        }}><b>{drawerState.currentGuest.name} </b>es acompañante de <b onClick={() => setDrawerState({
            currentGuest: rowData.find(c => c.id === Number(drawerState.currentGuest.companion_id)),
            onEditGuest: true,
            companions: handleCompanions(rowData.find(c => c.id === Number(drawerState.currentGuest.companion_id))?.id),
            visible: true
        })} style={{ textDecoration: 'underline', cursor: 'pointer', color: '#6D3CFA' }}>{rowData.find(c => c.id === Number(drawerState.currentGuest.companion_id))?.name}</b> </span>
        :
       

} */}

                < div className='new-guest-form-container'>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                        position: 'sticky', top: '-12px', backgroundColor: '#FFF', zIndex: 10,
                        padding: '12px 0px'
                    }}>
                        <span style={{ fontSize: '16px' }} className='gc-content-label'><b>Acomañantes ({companionsData?.length})</b></span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            {
                                companionsData?.length > 0 && <Button onClick={() => updateTicketCount('remove')} icon={<FiMinus style={{ marginTop: '2px' }} />} className='primarybutton'></Button>
                            }
                            <Button onClick={() => updateTicketCount('add')} icon={<IoMdAdd style={{ marginTop: '2px' }} />} className='primarybutton'></Button>
                        </div>

                    </div>

                    <span style={{ marginTop: '-12px', fontStyle: 'italic', opacity: '0.5' }} className='gc-content-label'>*Los datos de los acompañantes son opcionales</span>
                    <div className='companions-name-container'>

                        {
                            companionsData &&
                            companionsData?.map((companion, index) => (
                                <div key={index} className='companions_cont'>
                                    <div style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                                        gap: '12px'
                                    }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                                            flex: 1, gap: '4px'
                                        }}>
                                            <span className='gc-content-label'>Nombre</span>
                                            <Input
                                                placeholder={'Nombre'}
                                                value={companion?.name}
                                                onChange={(e) => setCompanionsData((prevCompanionData) =>
                                                    prevCompanionData.map((obj, i) =>
                                                        index === i
                                                            ? { ...obj, name: e.target.value }
                                                            : obj
                                                    )
                                                )}
                                                className='gc-input-text' />
                                        </div>


                                        <div style={{
                                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                                            flex: 1, gap: '4px'
                                        }}>
                                            <span className='gc-content-label'>Contacto</span>
                                            <Space.Compact style={{ width: '100%' }}>
                                                <Select
                                                    value={companion?.phone_code}
                                                    onChange={(e) => setCompanionsData((prevCompanionData) =>
                                                        prevCompanionData.map((obj, i) =>
                                                            index === i
                                                                ? { ...obj, phone_code: e }
                                                                : obj
                                                        )
                                                    )}
                                                    style={{ width: '100px' }}
                                                >
                                                    <Option value="+1">🇺🇸 +1</Option>
                                                    <Option value="+44">🇬🇧 +44</Option>
                                                    <Option value="+33">🇫🇷 +33</Option>
                                                    <Option value="+52">🇲🇽 +52</Option>
                                                    <Option value="+34">🇪🇸 +34</Option>
                                                </Select>
                                                <Input
                                                    type="tel"
                                                    placeholder="Número de teléfono"
                                                    className='gc-input-text'
                                                    style={{
                                                        borderRadius: '0px 99px 99px 0px',
                                                        color: companion.phone_number?.length > 0 && companion.phone_number?.length < 10 && 'red',
                                                        border: companion.phone_number?.length > 0 && companion.phone_number?.length < 10 && '1px solid red'
                                                    }}
                                                    value={companion.phone_number}
                                                    onChange={(e) => {
                                                        const onlyNumbers = e.target.value.replace(/\D/g, '').slice(0, 10); // 👈 solo dígitos, máx 10
                                                        setCompanionsData((prevCompanionData) =>
                                                            prevCompanionData.map((obj, i) =>
                                                                index === i
                                                                    ? { ...obj, phone_number: onlyNumbers } // 👈 guarda solo números
                                                                    : obj
                                                            )
                                                        );
                                                    }}
                                                    maxLength={10}
                                                />
                                            </Space.Compact>

                                        </div>



                                    </div>

                                    <div style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                                        gap: '12px'
                                    }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                                            flex: 1, gap: '4px'
                                        }}>
                                            <span className='gc-content-label'>Etiqueta</span>
                                            <Select
                                                value={companion?.tag}
                                                onChange={(e) => setCompanionsData((prevCompanionData) =>
                                                    prevCompanionData.map((obj, i) =>
                                                        index === i
                                                            ? { ...obj, tag: e }
                                                            : obj
                                                    )
                                                )}
                                                style={{ width: '100%' }}
                                                placeholder="Seleccionar etiqueta"
                                                dropdownRender={(menu) => (
                                                    <>
                                                        {menu}
                                                        <Divider style={{ margin: '8px 0', }} />
                                                        <Space style={{ padding: '0 8px 4px' }}>
                                                            <Input
                                                                placeholder="Nueva etiqueta"
                                                                ref={inputRef}
                                                                value={newTag}
                                                                onChange={(e) => setNewTag(e.target.value)}
                                                                onKeyDown={(e) => e.stopPropagation()}
                                                            />
                                                            <Button icon={<IoMdAdd />} onClick={() => addTagsToInvitation()}>
                                                                Agregar
                                                            </Button>
                                                        </Space>
                                                    </>
                                                )}
                                                options={localTags.map((item) => ({ label: item, value: item }))}
                                            />
                                        </div>


                                        <div style={{
                                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                                            flex: 1, gap: '4px'
                                        }}>
                                            <span className='gc-content-label'>Prioridad</span>

                                            <Select
                                                value={companion.tier}
                                                placeholder="Prioridad de invitado"
                                                onChange={(e) => setCompanionsData((prevCompanionData) =>
                                                    prevCompanionData.map((obj, i) =>
                                                        index === i
                                                            ? { ...obj, tier: e }
                                                            : obj
                                                    )
                                                )}
                                                style={{ width: '100%' }}
                                            >
                                                <Option value="A">A</Option>
                                                <Option value="B">B</Option>
                                                <Option value="C">C</Option>
                                                <Option value="D">D</Option>
                                            </Select>
                                        </div>

                                    </div>

                                    {/* {
                        drawerState.onEditGuest &&
                        <div style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                            gap: '12px'
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                                flex: 1, gap: '4px'
                            }}>
                                <span className='gc-content-label'>Estado</span>
                                <Select
                                    placeholder="Estado actual"
                                    value={companion.state}
                                    onChange={(e) => setCompanionsData((prevCompanionData) =>
                                        prevCompanionData.map((obj, i) =>
                                            index === i
                                                ? { ...obj, state: e }
                                                : obj
                                        )
                                    )}
                                    style={{ width: '100%' }}
                                >
                                    <Option value="creado">Creado</Option>
                                    <Option value="esperando">Esperando</Option>
                                    <Option value="confirmado">Confirmado</Option>
                                    <Option value="rechazado">Rechazado</Option>
                                </Select>
                            </div>

                        </div>
                    } */}

                                    <div style={{
                                        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                                        flex: 1, gap: '4px', width: '100%'
                                    }}>
                                        <span className='gc-content-label'>Notas</span>
                                        <Input.TextArea
                                            placeholder='Información extra sobre el invitado'
                                            value={companion.notes}
                                            onChange={(e) => setCompanionsData((prevCompanionData) =>
                                                prevCompanionData.map((obj, i) =>
                                                    index === i
                                                        ? { ...obj, notes: e.target.value }
                                                        : obj
                                                )
                                            )}
                                            autoSize={{ minRows: 2, maxRows: 3 }}
                                            style={{
                                                borderRadius: '8px'
                                            }} />
                                    </div>
                                    {/* 
                    {
                        drawerState.onEditGuest &&
                        <Tooltip title={`Eliminar ${companion.name}`}>
                            <Popconfirm
                                style={{ maxWidth: '200px !important' }}
                                title="Eliminar invitado"
                                description={`Estas seguro de eliminar a ${companion.name}`}
                                onConfirm={() => deleteCompanionAtIndex(index)}
                                // onCancel={cancel}
                                okText="Eliminar"
                                cancelText="Cancelar"
                            >
                                <Button className='primarybutton'>Eliminar</Button>
                            </Popconfirm>

                        </Tooltip>
                    } */}

                                </div>
                            ))
                        }
                    </div>
                </div>

            </div>

        </Drawer>

    )
}
