import { Button, Dropdown, Input, InputNumber, Row, Switch, TimePicker, Tooltip, } from 'antd'
import React, { useState, useRef, } from 'react'
import dayjs from 'dayjs';
import { MdInvertColors } from 'react-icons/md';
import { LuArrowUpRight, LuBadgeHelp, LuImage, LuSeparatorHorizontal, } from 'react-icons/lu';
import { StorageImages } from '../../../../components/ImagesStorage/StorageImages';
import { IconsModal } from '../../../../components/Helpers/IconsModal';
import { HelpDrawer } from '../../../../components/Helpers/HelpDrawer'
import { HowToDrawer } from '../../../../components/Helpers/HowToDrawer'
import { iconsItinerary } from '../../../../helpers/services/menuIcons';
import { BiSolidColorFill } from 'react-icons/bi';
import { IoMdAdd } from 'react-icons/io';
import { FaRegTrashAlt } from 'react-icons/fa';
import { convert12HrTo24Hr, formatTimeTo12Hours } from '../../../../helpers/assets/functions';
import { RiDeleteBack2Line } from 'react-icons/ri';
import { TbEyeClosed } from 'react-icons/tb';

export const BuildItinerary = ({ invitationID, invitation, setInvitation, setSaved, }) => {


    const instanciasContainer = useRef(null);
    const [currentItem, setCurrentItem] = useState(null)
    const [currentIcon, setCurrentIcon] = useState(1)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [visible, setVisible] = useState(false)
    const [howToVisible, setHowToVisible] = useState(false)

    const [type, setType] = useState(null)


    const handleNewItem = () => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: [
                    ...prevInvitation.itinerary.object,
                    {
                        name: "Nuevo momento", // Nombre del nuevo ítem
                        time: "00:00 am", // Horario del nuevo ítem
                        subtext: " ",
                        address: null,
                        moments: null,
                        music: null,
                        active: false,
                        image: null,
                        icon: null,
                        id: Math.random().toString(36).substr(2, 9) // ID único generado aleatoriamente
                    }
                ],
            },
        }));
        setSaved(false)
    }

    const onNameChange = (objectId, newName) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    // Si el ID del objeto coincide con el ID que estamos buscando, lo editamos
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            name: newName // Cambiamos el nombre del objeto
                        };
                    }
                    // Si el ID no coincide, devolvemos el objeto sin cambios
                    return obj;
                })
            }
        }));
        setSaved(false)
    };
    const onTimeChange = (objectId, time) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    // Si el ID del objeto coincide con el ID que estamos buscando, lo editamos
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            time: time // Cambiamos el nombre del objeto
                        };
                    }
                    // Si el ID no coincide, devolvemos el objeto sin cambios
                    return obj;
                })
            }
        }));
        setSaved(false)
    };
    const onSubnameChange = (objectId, subtext) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    // Si el ID del objeto coincide con el ID que estamos buscando, lo editamos
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            subtext: subtext // Cambiamos el nombre del objeto
                        };
                    }
                    // Si el ID no coincide, devolvemos el objeto sin cambios
                    return obj;
                })
            }
        }));
        setSaved(false)
    };

    //Adress
    const onCalleChange = (objectId, street) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    // Si el ID del objeto coincide con el ID que estamos buscando, lo editamos
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            address: {
                                ...obj.address,
                                street: street
                            }
                        };
                    }
                    // Si el ID no coincide, devolvemos el objeto sin cambios
                    return obj;
                })
            }
        }));
        setSaved(false)
    }

    const onNumeroChange = (objectId, number) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    // Si el ID del objeto coincide con el ID que estamos buscando, lo editamos
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            address: {
                                ...obj.address,
                                number: number
                            }
                        };
                    }
                    // Si el ID no coincide, devolvemos el objeto sin cambios
                    return obj;
                })
            }
        }));
        setSaved(false)
    }

    const onColoniaChange = (objectId, neighborhood) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    // Si el ID del objeto coincide con el ID que estamos buscando, lo editamos
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            address: {
                                ...obj.address,
                                neighborhood: neighborhood
                            }
                        };
                    }
                    // Si el ID no coincide, devolvemos el objeto sin cambios
                    return obj;
                })
            }
        }));
        setSaved(false)
    }

    const onCPChange = (objectId, zip) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    // Si el ID del objeto coincide con el ID que estamos buscando, lo editamos
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            address: {
                                ...obj.address,
                                zip: zip
                            }
                        };
                    }
                    // Si el ID no coincide, devolvemos el objeto sin cambios
                    return obj;
                })
            }
        }));
        setSaved(false)
    }

    const onCiudadChange = (objectId, city) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    // Si el ID del objeto coincide con el ID que estamos buscando, lo editamos
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            address: {
                                ...obj.address,
                                city: city
                            }
                        };
                    }
                    // Si el ID no coincide, devolvemos el objeto sin cambios
                    return obj;
                })
            }
        }));
        setSaved(false)
    }

    const onPaisChange = (objectId, country) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    // Si el ID del objeto coincide con el ID que estamos buscando, lo editamos
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            address: {
                                ...obj.address,
                                country: country
                            }
                        };
                    }
                    // Si el ID no coincide, devolvemos el objeto sin cambios
                    return obj;
                })
            }
        }));
        setSaved(false)
    }

    const onEstadoChange = (objectId, state) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    // Si el ID del objeto coincide con el ID que estamos buscando, lo editamos
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            address: {
                                ...obj.address,
                                state: state
                            }
                        };
                    }
                    // Si el ID no coincide, devolvemos el objeto sin cambios
                    return obj;
                })
            }
        }));
        setSaved(false)
    }

    const onUrlChange = (objectId, new_) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    // Si el ID del objeto coincide con el ID que estamos buscando, lo editamos
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            address: {
                                ...obj.address,
                                url: new_
                            }
                        };
                    }
                    // Si el ID no coincide, devolvemos el objeto sin cambios
                    return obj;
                })
            }
        }));
        setSaved(false)
    }


    //subtimes

    const onSubNameChange = (objectId, index, newName) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            moments: obj.moments.map((subitem, subIndex) => {
                                // Si el índice coincide, actualizamos el nombre
                                if (subIndex === index) {
                                    return {
                                        ...subitem,
                                        name: newName
                                    };
                                }
                                // Si no coincide, devolvemos el subitem sin cambios
                                return subitem;
                            })
                        };
                    }
                    // Si el ID no coincide, devolvemos el objeto sin cambios
                    return obj;
                })
            }
        }));
        setSaved(false)
    }

    const onSubTimeChange = (objectId, index, newValue) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            moments: obj.moments.map((subitem, subIndex) => {
                                // Si el índice coincide, actualizamos el nombre
                                if (subIndex === index) {
                                    return {
                                        ...subitem,
                                        time: newValue
                                    };
                                }
                                // Si no coincide, devolvemos el subitem sin cambios
                                return subitem;
                            })
                        };
                    }
                    // Si el ID no coincide, devolvemos el objeto sin cambios
                    return obj;
                })
            }
        }));
        setSaved(false)
    }

    const onSubDescriptionChange = (objectId, index, newValue) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            moments: obj.moments.map((subitem, subIndex) => {
                                // Si el índice coincide, actualizamos el nombre
                                if (subIndex === index) {
                                    return {
                                        ...subitem,
                                        description: newValue
                                    };
                                }
                                // Si no coincide, devolvemos el subitem sin cambios
                                return subitem;
                            })
                        };
                    }
                    // Si el ID no coincide, devolvemos el objeto sin cambios
                    return obj;
                })
            }
        }));
        setSaved(false)
    }

    const addNewSubitem = (item) => {
        instanciasToBottom(item)
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === item.id) {
                        return {
                            ...obj,
                            moments: [
                                ...obj.moments,
                                {
                                    name: "",
                                    time: "00:00 am",
                                    description: ""
                                }
                            ]
                        };
                    }
                    // Si el ID no coincide, devolvemos el objeto sin cambios
                    return obj;
                })
            }
        }));
        setSaved(false)
    }

    const removeSubitem = (objectId, index) => {
        let shouldHandleSubitems = false;

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === objectId) {
                        const newMoments = obj.moments.filter((_, i) => i !== index);

                        if (newMoments.length === 0) {
                            shouldHandleSubitems = true;
                        }

                        return {
                            ...obj,
                            moments: newMoments
                        };
                    }

                    return obj;
                })
            }
        }));

        if (shouldHandleSubitems) {
            handleSubitems(objectId);
        }

        setSaved(false);
    };


    const handleImage = (objectId, value) => {
        // setCurrentIcon(null)
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            icon: value
                        };
                    }
                    return obj;
                })
            }
        }));
        setSaved(false)
    };

    const handleTime = (objectId) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === objectId) {
                        // Si ya hay una music, la eliminamos (ponemos null), si no, agregamos el enlace de la music
                        return {
                            ...obj,
                            time: obj.time ? null : "00:00 am"
                        };
                    }
                    return obj;
                })
            }
        }));
        setSaved(false)
    };

    const handleSubname = (objectId) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === objectId) {
                        // Si ya hay una music, la eliminamos (ponemos null), si no, agregamos el enlace de la music
                        return {
                            ...obj,
                            subtext: obj.subtext ? null : "Descripción"
                        };
                    }
                    return obj;
                })
            }
        }));
        setSaved(false)
    };

    const handleAdress = (objectId) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === objectId) {
                        // Si ya hay una music, la eliminamos (ponemos null), si no, agregamos el enlace de la music
                        return {
                            ...obj,
                            address: obj.address ? null : {
                                calle: null,
                                numero: null,
                                colonia: null,
                                CP: null,
                                ciudad: null,
                                estado: null,
                                url: null
                            }
                        };
                    }
                    return obj;
                })
            }
        }));
        setSaved(false)
    };

    const handleSubitems = (objectId) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === objectId) {
                        // Si ya hay una music, la eliminamos (ponemos null), si no, agregamos el enlace de la music
                        return {
                            ...obj,
                            moments: obj.moments ? null : [
                                {
                                    name: null,
                                    time: null,
                                    description: null
                                }
                            ]
                        };
                    }
                    return obj;
                })
            }
        }));
        setSaved(false)
    };


    const removeObjectById = (objectId) => {
        setCurrentItem(null)
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.filter(obj => obj.id !== objectId)
            }
        }));
        setSaved(false)
    };

    const handleActive = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                active: e,
            },
        }));
        setSaved(false)
    }


    const onChangeBackground = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                background: e,
            },
        }));
        setSaved(false)
    }

    const onChangeSeparator = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                separator: e,
            },
        }));
        setSaved(false)
    }


    const instanciasToBottom = (item) => {
        if (instanciasContainer.current) {
            instanciasContainer.current.scrollTo({
                top: (323 * (item.moments.length + 1)),
                behavior: 'smooth'
            });
        }
    };

    const handleHowTo = (type) => {
        setType(type)
        setHowToVisible(true)
        // console.log(type)
    }

    const renderIcon = (index, size) => {
        const icon = iconsItinerary.find(icon => icon.index === index);
        if (icon) {
            const IconComponent = icon.value;
            return <IconComponent size={size} style={{ minWidth: size }} />;
        }
        return <LuBadgeHelp size={size} style={{ minWidth: size }} />;
    };


    const onChangeTitle = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                title: e ? e.target.value : prevInvitation.itinerary.title,
            },
        }));
        setSaved(false)
    }
    const onInvertedColor = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                inverted: e,
            },
        }));
        setSaved(false)
    }

    const handleURL = (url, index, objectId) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === objectId) {
                        // Si ya hay una music, la eliminamos (ponemos null), si no, agregamos el enlace de la music
                        return {
                            ...obj,
                            image: url
                        };
                    }
                    return obj;
                })
            }
        }));
        setSaved(false)
    };

    const handleIcon = (index, id) => {
        setCurrentIcon(index)
        handleImage(id, index)
        setIsModalOpen(false)
    }


    return (
        <>
            {
                invitation ?
                    <div className='scroll-item generals-main-container' style={{ gap: '6px' }}>
                        <div className='build-component-elements'>

                            <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>
                                <div className='general-cards-single-row'>
                                    <span className={'module--title'}
                                        style={{
                                            width: 'auto',
                                        }}
                                    >Itinerario</span>
                                    <Switch
                                        size='small'
                                        value={invitation.itinerary.active}
                                        onChange={handleActive} />
                                </div>


                                <div className='general-cards-single-row' style={{ gap: '5px' }}>
                                    {
                                        invitation.itinerary.active && (

                                            <>

                                                <Button
                                                    type='ghost'
                                                    onClick={() => onChangeSeparator(!invitation.itinerary.separator)}
                                                    id={`build-cover-date-buttons${invitation.itinerary.separator ? '--active' : ''}`}
                                                    icon={<LuSeparatorHorizontal size={18} />} />

                                                <Button
                                                    type='ghost'
                                                    onClick={() => onChangeBackground(!invitation.itinerary.background)}
                                                    id={`build-cover-date-buttons${invitation.itinerary.background ? '--active' : ''}`}
                                                    icon={<BiSolidColorFill size={18} />} />


                                                <Tooltip color="var(--text-color)" title="Invertir color de texto">
                                                    <Button
                                                        type='ghost'
                                                        onClick={() => onInvertedColor(!invitation.itinerary.inverted)}
                                                        id={`build-cover-date-buttons${invitation.itinerary.inverted ? '--active' : ''}`}
                                                        icon={<MdInvertColors size={18} />} />
                                                </Tooltip>

                                            </>
                                        )
                                    }
                                </div>

                            </div>

                            <div className='build-generals-simple-column'>
                                <span className='gc-content-label'>Título</span>

                                <Input
                                    onChange={onChangeTitle}
                                    value={invitation.itinerary.title}
                                    style={{ width: '100%', transition: 'all 0.3s ease' }}
                                    className={`gc-input-text`} />
                            </div>

                            {

                                invitation.itinerary.active &&

                                <Button style={{ margin: '16px 0px' }} icon={<IoMdAdd />} onClick={handleNewItem} className='primarybutton--active'>
                                    Nuevo momento
                                </Button>

                            }



                        </div>

                        {

                            invitation.itinerary.active ?
                                <div className='build-component-elements' >

                                    {
                                        invitation.itinerary.object.map((item, index) => (

                                            <>



                                                <div

                                                    key={index}
                                                    // onClick={() => setCurrentItem(item.id)}
                                                    className={`generl-card-color-item ${!currentItem && 'general-hover-card'}`} style={{
                                                        cursor: 'pointer', flexDirection: 'column', gap: '12px',
                                                        width: '100%', borderRadius: '12px',
                                                        padding: '12px'
                                                    }}>

                                                    <div className='general-cards-single-row' style={{
                                                        width: '100%', justifyContent: 'space-between',
                                                        borderRadius: '8px',
                                                    }}>


                                                        <div className='general-cards-single-row'>
                                                            {
                                                                item.icon ?
                                                                    renderIcon(item.icon, 24)
                                                                    : <LuBadgeHelp size={24} />
                                                            }

                                                            <div className='build-generals-simple-column' style={{ gap: 0 }}>
                                                                <span className='single-card-name '>{item.name}</span>
                                                                <span className='single-card-time'>{item.time}</span>
                                                            </div>

                                                        </div>

                                                        <div style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                                                        }}>
                                                            {/* <Tooltip title={currentItem ? "Guardar y regresar" : "Abrir"}> */}
                                                            <Dropdown
                                                                trigger={['click']}
                                                                placement='right'
                                                                popupRender={() => (
                                                                    <div className='single_col' style={{
                                                                        gap: '24px', backgroundColor: '#FFF', boxShadow: '0px 0px 12px rgba(0,0,0,0.2)',
                                                                        padding: '24px', borderRadius: '24px', transform: 'scale(0.95)', transition: 'all 0.3s ease',
                                                                        width: item.moments && item.moments.length > 0 ? '700px' : '520px'

                                                                    }}>
                                                                        <div style={{
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                                            alignSelf: 'stretch', paddingRight: '20px'
                                                                        }}>

                                                                            <Tooltip title="Eliminar momento" color='var(--error-color)'>
                                                                                <Button
                                                                                    className='primarybutton'
                                                                                    onClick={() => removeObjectById(item.id)}
                                                                                    icon={<FaRegTrashAlt size={14} />}></Button>
                                                                            </Tooltip>

                                                                            <Tooltip title="Editar icono">
                                                                                <Dropdown
                                                                                    popupRender={() => (
                                                                                        <Row className='gc-icons-modal-container'>
                                                                                            {
                                                                                                iconsItinerary.map((icon, index) => (
                                                                                                    <Button
                                                                                                        id={`gc-cta-buttons${icon.index === currentIcon ? '--selected' : ''}`}
                                                                                                        className='gc-icons-modal-icon'
                                                                                                        type='ghost'
                                                                                                        onClick={() => handleIcon(icon.index, item.id)}
                                                                                                        key={index}
                                                                                                        icon={<icon.value size={20} />}

                                                                                                    />
                                                                                                ))
                                                                                            }
                                                                                        </Row>
                                                                                    )}
                                                                                >
                                                                                    <Button className='primarybutton' style={{ maxWidth: '32px', backgroundColor: '#FFF', border: '1px solid var(--borders)' }}>
                                                                                        {renderIcon(item.icon, 18)}
                                                                                    </Button>
                                                                                </Dropdown>

                                                                            </Tooltip>

                                                                            <Input className='gc-input-text'
                                                                                style={{ fontSize: '16px', fontWeight: 500, maxHeight: '32px', flex: 1 }}
                                                                                onChange={(e) => onNameChange(item.id, e.target.value)}
                                                                                value={item.name} />


                                                                        </div>

                                                                        <div style={{ width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'row', gap: '36px' }}>

                                                                            <div className='single_col' style={{ gap: '24px', flex: 1 }}>

                                                                                <div className='single_col' style={{ flex: 1, width: 'auto', gap: '12px' }}>

                                                                                    <span><b>Información general</b></span>
                                                                                    <div className='single_row' style={{ alignSelf: 'stretch', justifyContent: 'space-between' }}>
                                                                                        <span className='gc-content-label'>Imagen de fondo</span>


                                                                                    </div>


                                                                                    <div style={{
                                                                                        width: '100%', height: '180px', border: '1px solid #CCC',
                                                                                        borderRadius: '12px', overflow: 'hidden', position: 'relative',
                                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                        backgroundColor: '#f2f2f280',
                                                                                    }}>
                                                                                        {
                                                                                            item.image ?
                                                                                                <img src={item.image} alt='' style={{
                                                                                                    width: '100%', height: '100%', objectFit: 'cover'
                                                                                                }} />
                                                                                                : <LuImage size={18} style={{ color: '#CCC' }} />
                                                                                        }

                                                                                        <StorageImages absolute={true} isNull={true} invitationID={invitationID} handleImage={handleURL} id={item.id} />



                                                                                    </div>

                                                                                    <div className='build-component-elements'>



                                                                                        <div className='build-generals-simple-column' style={{ gap: '16px', width: '100%', flexDirection: 'row' }}>
                                                                                            <div className='build-generals-simple-column' >
                                                                                                <div className='general-cards-single-row' style={{
                                                                                                    flex: 1, justifyContent: 'space-between', width: '100%'
                                                                                                }}>

                                                                                                    <span className='gc-content-label' >Hora</span>
                                                                                                    <Switch
                                                                                                        onChange={() => handleTime(item.id)}
                                                                                                        checked={item.time ? true : false}
                                                                                                        size='small' style={{
                                                                                                            backgroundColor: item.time ? '#1777FF' : '#AAA', border: 'none',
                                                                                                        }}
                                                                                                    />



                                                                                                </div>
                                                                                                <TimePicker
                                                                                                    disabled={item.time ? false : true}
                                                                                                    className='gc-input-text'
                                                                                                    value={dayjs(convert12HrTo24Hr(item.time), 'HH:mm')}
                                                                                                    format={'HH:mm'}
                                                                                                    onChange={(e) => onTimeChange(item.id, formatTimeTo12Hours(e))}

                                                                                                />

                                                                                            </div>
                                                                                            <div className='build-generals-simple-column'>
                                                                                                <div className='general-cards-single-row' style={{
                                                                                                    flex: 1, justifyContent: 'space-between', width: '100%'
                                                                                                }}>

                                                                                                    <span className='gc-content-label' >Descripción</span>

                                                                                                    <Switch
                                                                                                        onChange={() => handleSubname(item.id)}

                                                                                                        checked={item.subtext ? true : false}
                                                                                                        size='small' style={{
                                                                                                            backgroundColor: item.subtext ? '#1777FF' : '#AAA', border: 'none',
                                                                                                        }}
                                                                                                    />


                                                                                                </div>
                                                                                                <Input

                                                                                                    disabled={item.subtext ? false : true}
                                                                                                    className='gc-input-text'
                                                                                                    onChange={(e) => onSubnameChange(item.id, e.target.value)}
                                                                                                    value={item.subtext} />
                                                                                            </div>
                                                                                        </div>


                                                                                    </div>

                                                                                </div>

                                                                                <div className='build-component-elements' style={{ flex: 1, gap: '8px' }}>
                                                                                    <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }} >

                                                                                        <span ><b>Dirección</b></span>

                                                                                        <Switch
                                                                                            size='small'
                                                                                            checked={item.address ? true : false}
                                                                                            onChange={() => handleAdress(item.id)} />



                                                                                    </div>

                                                                                    {
                                                                                        item.address &&
                                                                                        <>




                                                                                            <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>


                                                                                                <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                    <span className='gc-content-label' style={{ opacity: '0.5' }}>Calle</span>
                                                                                                    <Input
                                                                                                        disabled={item.address ? false : true}
                                                                                                        className='gc-input-text'
                                                                                                        onChange={(e) => onCalleChange(item.id, e.target.value)}
                                                                                                        value={item.address ? item.address.street : ''} />
                                                                                                </div>


                                                                                                <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                    <span className='gc-content-label' style={{ opacity: '0.5' }}>Número</span>
                                                                                                    <InputNumber
                                                                                                        disabled={item.address ? false : true}
                                                                                                        className='gc-input-text'
                                                                                                        onChange={(e) => onNumeroChange(item.id, e)}
                                                                                                        value={item.address ? item.address.number : ''} />
                                                                                                </div>





                                                                                            </div>

                                                                                            <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>

                                                                                                <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                    <span className='gc-content-label' style={{ opacity: '0.5' }} >Colonia</span>
                                                                                                    <Input
                                                                                                        disabled={item.address ? false : true}
                                                                                                        className='gc-input-text'
                                                                                                        onChange={(e) => onColoniaChange(item.id, e.target.value)}
                                                                                                        value={item.address ? item.address.neighborhood : ''} />
                                                                                                </div>

                                                                                                <div className='build-generals-simple-column' style={{ gap: '4px' }} >
                                                                                                    <span className='gc-content-label' style={{ opacity: '0.5' }}>Código Postal</span>
                                                                                                    <InputNumber
                                                                                                        disabled={item.address ? false : true}
                                                                                                        className='gc-input-text'
                                                                                                        onChange={(e) => onCPChange(item.id, e)}
                                                                                                        value={item.address ? item.address.zip : ''} />
                                                                                                </div>





                                                                                            </div>

                                                                                            <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>

                                                                                                <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                    <span className='gc-content-label' style={{ opacity: '0.5' }}>Estado</span>
                                                                                                    <Input
                                                                                                        disabled={item.address ? false : true}
                                                                                                        className='gc-input-text'
                                                                                                        onChange={(e) => onEstadoChange(item.id, e.target.value)}
                                                                                                        value={item.address ? item.address.state : ''} />
                                                                                                </div>

                                                                                                <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                    <span className='gc-content-label' style={{ opacity: '0.5' }}>Ciudad</span>
                                                                                                    <Input
                                                                                                        disabled={item.address ? false : true}
                                                                                                        className='gc-input-text'
                                                                                                        onChange={(e) => onCiudadChange(item.id, e.target.value)}
                                                                                                        value={item.address ? item.address.city : ''} />
                                                                                                </div>

                                                                                            </div>

                                                                                            <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>
                                                                                                <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                    <span className='gc-content-label' style={{ opacity: '0.5' }}>País</span>
                                                                                                    <Input
                                                                                                        disabled={item.address ? false : true}
                                                                                                        className='gc-input-text'
                                                                                                        onChange={(e) => onPaisChange(item.id, e.target.value)}
                                                                                                        value={item.address ? item.address.country : ''} />
                                                                                                </div>
                                                                                                <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                    <div className='general-cards-single-row'>
                                                                                                        <span className='gc-content-label' style={{ opacity: '0.5' }}>URL Google Maps</span>

                                                                                                        <LuBadgeHelp size={15}
                                                                                                            onClick={() => handleHowTo('maps')}
                                                                                                            style={{
                                                                                                                color: 'var(--brand-color-500)', cursor: 'pointer',
                                                                                                            }} />
                                                                                                    </div>
                                                                                                    <Input
                                                                                                        disabled={item.address ? false : true}
                                                                                                        className='gc-input-text'
                                                                                                        onChange={(e) => onUrlChange(item.id, e.target.value)}
                                                                                                        value={item.address ? item.address.url : ''} />
                                                                                                </div>

                                                                                            </div>




                                                                                        </>
                                                                                    }

                                                                                </div>

                                                                                {
                                                                                    (!item.moments || item.moments.length === 0) &&
                                                                                    <Button onClick={() => handleSubitems(item.id)} icon={<IoMdAdd />} className='primarybutton'>Agregar instancias</Button>
                                                                                }
                                                                            </div>

                                                                            {
                                                                                item.moments && item.moments.length > 0 &&


                                                                                <div className='build-component-elements' style={{ maxWidth: '250px', height: '610px', gap: '12px', backgroundColor: '#F5F3F2', padding: '16px', borderRadius: '12px' }}>
                                                                                    <div className='general-cards-single-row' style={{
                                                                                        width: '100%', justifyContent: 'space-between'
                                                                                    }}>
                                                                                        <div className='general-cards-single-row'>
                                                                                            <span ><b>Instancias</b></span>

                                                                                        </div>

                                                                                        {
                                                                                            item.moments &&
                                                                                            <Button
                                                                                                type='ghost'

                                                                                                onClick={() => addNewSubitem(item)}
                                                                                                className='primarybutton--active'
                                                                                                style={{ maxHeight: '32px', fontSize: '12px' }}
                                                                                                icon={<IoMdAdd />}>
                                                                                                Nueva
                                                                                            </Button>
                                                                                        }


                                                                                    </div>



                                                                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', maxHeight: '580px', overflow: 'auto' }}>
                                                                                        {

                                                                                            item.moments ?
                                                                                                item.moments.map((subitem, index) => (


                                                                                                    <div style={{
                                                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'
                                                                                                    }}>
                                                                                                        {
                                                                                                            index > 0 &&
                                                                                                            <div style={{
                                                                                                                width: '2px', height: '28px',
                                                                                                                backgroundColor: `#B5A5CC`
                                                                                                            }}>

                                                                                                            </div>
                                                                                                        }
                                                                                                        <div className='build-generals-simple-column instancia-container' style={{
                                                                                                            // border: '1px solid var(--borders)', padding: '0px', borderRadius: '16px',
                                                                                                            // backgroundColor: `${darker('#F5F3F2', 0.9)}80`
                                                                                                        }}>

                                                                                                            <div className='general-cards-single-row' style={{
                                                                                                                alignSelf: 'stretch', gap: '12px'
                                                                                                            }}>

                                                                                                                <div className='build-generals-simple-column' style={{ gap: '4px' }} >
                                                                                                                    <span className='gc-content-label' >Nombre</span>
                                                                                                                    <Input
                                                                                                                        className='gc-input-text'
                                                                                                                        placeholder='Instancia'
                                                                                                                        value={subitem.name}
                                                                                                                        style={{ fontSize: '12px' }}
                                                                                                                        onChange={(e) => onSubNameChange(item.id, index, e.target.value)} />
                                                                                                                </div>

                                                                                                                <div className='build-generals-simple-column' style={{ gap: '4px' }} >
                                                                                                                    <div className='general-cards-single-row' style={{ width: '100%', }} >

                                                                                                                        <Switch
                                                                                                                            // onChange={() => handleSubname(item.id)}
                                                                                                                            onChange={() => onSubTimeChange(item.id, index, subitem.time ? null : "00:00 am")}
                                                                                                                            checked={subitem.time ? true : false}
                                                                                                                            size='small'
                                                                                                                        />
                                                                                                                        <span className='gc-content-label' >Hora</span>
                                                                                                                    </div>

                                                                                                                    <TimePicker
                                                                                                                        disabled={subitem.time ? false : true}
                                                                                                                        placeholder='0:00'
                                                                                                                        className='gc-input-text'
                                                                                                                        style={{ fontSize: '12px' }}
                                                                                                                        value={dayjs(convert12HrTo24Hr(subitem.time), 'HH:mm')} format={'HH:mm'}
                                                                                                                        onChange={(e) => onSubTimeChange(item.id, index, formatTimeTo12Hours(e))} />
                                                                                                                </div>

                                                                                                            </div>

                                                                                                            <div className='build-generals-simple-column' style={{ gap: '4px' }} >

                                                                                                                <span className='gc-content-label' >Descripción</span>
                                                                                                                <Input.TextArea
                                                                                                                    className='gc-input-text'
                                                                                                                    placeholder='¿De qué trata tu instancia?'
                                                                                                                    autoSize={{ minRows: 4, maxRows: 5 }}
                                                                                                                    style={{ borderRadius: '12px', fontSize: '12px' }}
                                                                                                                    value={subitem.description}
                                                                                                                    onChange={(e) => onSubDescriptionChange(item.id, index, e.target.value)} />

                                                                                                                <div style={{
                                                                                                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '5px'
                                                                                                                }}>
                                                                                                                    <Button
                                                                                                                        style={{ opacity: '0.5' }}
                                                                                                                        className='secondarybutton'
                                                                                                                        onClick={() => removeSubitem(item.id, index)}
                                                                                                                        icon={<RiDeleteBack2Line size={16} />}
                                                                                                                    >Borrar instancia</Button>
                                                                                                                </div>

                                                                                                            </div>

                                                                                                        </div>
                                                                                                    </div>


                                                                                                ))
                                                                                                : <></>


                                                                                        }
                                                                                    </div>
                                                                                </div>

                                                                            }

                                                                            <IconsModal
                                                                                handleImage={handleImage} id={item.id}
                                                                                isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} currentIcon={currentIcon} setCurrentIcon={setCurrentIcon} />


                                                                        </div>
                                                                    </div>
                                                                )}
                                                            >
                                                                <Button
                                                                    onClick={() => setCurrentItem(currentItem === item.id ? null : item.id)}
                                                                    className={'primarybutton'}
                                                                    icon={<LuArrowUpRight size={16} style={{ marginTop: '4px' }} />}>
                                                                </Button>
                                                            </Dropdown>


                                                        </div>



                                                    </div >


                                                </div>


                                            </>

                                        ))

                                    }
                                </div >

                                : <div style={{
                                    width: '100%', height: '300px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}><TbEyeClosed size={32} style={{ color: '#717171' }} /></div>

                        }




                    </div >
                    : <></>
            }
            <HelpDrawer visible={visible} setVisible={setVisible} type={type} setType={setType} />
            <HowToDrawer visible={howToVisible} setVisible={setHowToVisible} type={type} setType={setType} />

        </>
    )
}
