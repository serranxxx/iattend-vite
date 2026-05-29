import { Button, Drawer, Dropdown, Input, InputNumber, Row, Switch, TimePicker, Tooltip, } from 'antd'
import { useTranslation } from 'react-i18next'
import React, { useEffect, useState, useRef, } from 'react'
import dayjs from 'dayjs';
import { LuArrowUpRight, LuBadgeHelp, LuImage, LuX, } from 'react-icons/lu';
import { StorageImages } from '../../../../components/ImagesStorage/StorageImages';
import { IconsModal } from '../../../../components/Helpers/IconsModal';
import { HelpDrawer } from '../../../../components/Helpers/HelpDrawer'
import { HowToDrawer } from '../../../../components/Helpers/HowToDrawer'
import { iconsItinerary } from '../../../../helpers/services/menuIcons';
import { IoMdAdd } from 'react-icons/io';
import { FaRegTrashAlt } from 'react-icons/fa';
import { convert12HrTo24Hr, formatTimeTo12Hours } from '../../../../helpers/assets/functions';
import { RiDeleteBack2Line } from 'react-icons/ri';
import { TbEyeClosed } from 'react-icons/tb';
import { BuildMenu } from '../../../../components/BuildMenu/BuildMenu'
import { AddressAutocomplete } from '../../../SideEvents/AddressAutocomplete';

export const BuildItinerary = ({ invitationID, invitation, setInvitation, setSaved, }) => {

    const { t } = useTranslation()

    const instanciasContainer = useRef(null);
    const [currentItem, setCurrentItem] = useState(null)
    const [currentIcon, setCurrentIcon] = useState(1)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [visible, setVisible] = useState(false)
    const [howToVisible, setHowToVisible] = useState(false)
    const [type, setType] = useState(null)

    const [isMobile, setIsMobile] = useState(false)
    const [editDrawerOpen, setEditDrawerOpen] = useState(false)
    const [editItemId, setEditItemId] = useState(null)
    const [instanciasDrawerOpen, setInstanciasDrawerOpen] = useState(false)

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 750)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    const handleNewItem = () => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: [
                    ...prevInvitation.itinerary.object,
                    {
                        name: t('build_itinerary.btn_new_moment'),
                        time: "00:00 am",
                        subtext: " ",
                        address: null,
                        moments: null,
                        music: null,
                        active: false,
                        image: null,
                        icon: null,
                        id: Math.random().toString(36).substr(2, 9)
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
                    if (obj.id === objectId) {
                        return { ...obj, name: newName };
                    }
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
                    if (obj.id === objectId) {
                        return { ...obj, time: time };
                    }
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
                    if (obj.id === objectId) {
                        return { ...obj, subtext: subtext };
                    }
                    return obj;
                })
            }
        }));
        setSaved(false)
    };

    const onCalleChange = (objectId, street) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === objectId) {
                        return { ...obj, address: { ...obj.address, street } };
                    }
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
                    if (obj.id === objectId) {
                        return { ...obj, address: { ...obj.address, number } };
                    }
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
                    if (obj.id === objectId) {
                        return { ...obj, address: { ...obj.address, neighborhood } };
                    }
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
                    if (obj.id === objectId) {
                        return { ...obj, address: { ...obj.address, zip } };
                    }
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
                    if (obj.id === objectId) {
                        return { ...obj, address: { ...obj.address, city } };
                    }
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
                    if (obj.id === objectId) {
                        return { ...obj, address: { ...obj.address, country } };
                    }
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
                    if (obj.id === objectId) {
                        return { ...obj, address: { ...obj.address, state } };
                    }
                    return obj;
                })
            }
        }));
        setSaved(false)
    }

    const onAddressAutoFill = (objectId, addr) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === objectId) {
                        return {
                            ...obj,
                            address: {
                                ...obj.address,
                                street: addr.street,
                                number: addr.number,
                                neighborhood: addr.neighborhood,
                                zip: addr.zipcode,
                                city: addr.city,
                                state: addr.state,
                                country: addr.country,
                                url: addr.url,
                            }
                        }
                    }
                    return obj
                })
            }
        }))
        setSaved(false)
    }

    const onUrlChange = (objectId, new_) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === objectId) {
                        return { ...obj, address: { ...obj.address, url: new_ } };
                    }
                    return obj;
                })
            }
        }));
        setSaved(false)
    }

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
                                if (subIndex === index) return { ...subitem, name: newName };
                                return subitem;
                            })
                        };
                    }
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
                                if (subIndex === index) return { ...subitem, time: newValue };
                                return subitem;
                            })
                        };
                    }
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
                                if (subIndex === index) return { ...subitem, description: newValue };
                                return subitem;
                            })
                        };
                    }
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
                                { name: "", time: "00:00 am", description: "" }
                            ]
                        };
                    }
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
                        if (newMoments.length === 0) shouldHandleSubitems = true;
                        return { ...obj, moments: newMoments };
                    }
                    return obj;
                })
            }
        }));

        if (shouldHandleSubitems) handleSubitems(objectId);
        setSaved(false);
    };

    const handleImage = (objectId, value) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === objectId) return { ...obj, icon: value };
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
                    if (obj.id === objectId) return { ...obj, time: obj.time ? null : "00:00 am" };
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
                    if (obj.id === objectId) return { ...obj, subtext: obj.subtext ? null : t('build_itinerary.default_description') };
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
                        return {
                            ...obj,
                            address: obj.address ? null : {
                                calle: null, numero: null, colonia: null,
                                CP: null, ciudad: null, estado: null, url: null
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
                        return {
                            ...obj,
                            moments: obj.moments ? null : [{ name: null, time: null, description: null }]
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

    const handleURL = (url, index, objectId) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            itinerary: {
                ...prevInvitation.itinerary,
                object: prevInvitation.itinerary.object.map(obj => {
                    if (obj.id === objectId) return { ...obj, image: url };
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

    const editItem = editItemId ? invitation?.itinerary?.object?.find(obj => obj.id === editItemId) ?? null : null


    const drawerStyles = {
        header: { borderBottom: '1px solid #F0F0F0', padding: '12px 16px' },
        body: { padding: '16px', overflow: 'auto' },
    }

    const mobileEditContent = (item) => {
        if (!item) return null
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Button className='primarybutton' onClick={() => { removeObjectById(item.id); setEditDrawerOpen(false) }} icon={<FaRegTrashAlt size={14} />} />
                    <Dropdown
                        arrow
                        placement='bottomRight'
                        popupRender={() => (
                            <Row className='gc-icons-modal-container'>
                                {iconsItinerary.map((icon, idx) => (
                                    <Button
                                        id={`gc-cta-buttons${icon.index === currentIcon ? '--selected' : ''}`}
                                        className='gc-icons-modal-icon'
                                        type='text'
                                        onClick={() => handleIcon(icon.index, item.id)}
                                        key={idx}
                                        icon={<icon.value size={20} />}
                                    />
                                ))}
                            </Row>
                        )}>
                        <Button className='primarybutton' style={{ maxWidth: '32px', backgroundColor: '#FFF', border: '1px solid var(--borders)' }}>
                            {renderIcon(item.icon, 18)}
                        </Button>
                    </Dropdown>
                    <Input
                        className='gc-input-text'
                        style={{ fontSize: '16px', fontWeight: 500, flex: 1 }}
                        onChange={(e) => onNameChange(item.id, e.target.value)}
                        value={item.name}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span><b>{t('build_itinerary.section_info')}</b></span>
                    <span className='gc-content-label'>{t('build_itinerary.label_bg_image')}</span>
                    <div style={{
                        width: '100%', height: '180px', border: '1px solid #CCC',
                        borderRadius: '12px', overflow: 'hidden', position: 'relative',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: '#f2f2f280',
                    }}>
                        {item.image
                            ? <img src={item.image} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <LuImage size={18} style={{ color: '#CCC' }} />
                        }
                        <StorageImages absolute={true} isNull={true} invitationID={invitationID} handleImage={handleURL} id={item.id} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className='gc-content-label'>{t('build_itinerary.label_time')}</span>
                            <Switch onChange={() => handleTime(item.id)} checked={!!item.time} size='small' style={{ backgroundColor: item.time ? '#1777FF' : '#AAA', border: 'none' }} />
                        </div>
                        <TimePicker
                            disabled={!item.time}
                            className='gc-input-text'
                            value={dayjs(convert12HrTo24Hr(item.time), 'HH:mm')}
                            format='HH:mm'
                            onChange={(e) => onTimeChange(item.id, formatTimeTo12Hours(e))}
                        />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className='gc-content-label'>{t('build_itinerary.label_description')}</span>
                            <Switch onChange={() => handleSubname(item.id)} checked={!!item.subtext} size='small' style={{ backgroundColor: item.subtext ? '#1777FF' : '#AAA', border: 'none' }} />
                        </div>
                        <Input
                            disabled={!item.subtext}
                            className='gc-input-text'
                            onChange={(e) => onSubnameChange(item.id, e.target.value)}
                            value={item.subtext}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span><b>{t('build_itinerary.section_address')}</b></span>
                        <Switch size='small' checked={!!item.address} onChange={() => handleAdress(item.id)} />
                    </div>
                    {item.address && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <AddressAutocomplete
                                className='gc-input-text'
                                placeholder={t('build_itinerary.placeholder_search')}
                                onSelect={(addr) => onAddressAutoFill(item.id, addr)}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span className='gc-content-label' style={{ opacity: 0.5 }}>{t('build_itinerary.label_street')}</span>
                                    <Input className='gc-input-text' onChange={(e) => onCalleChange(item.id, e.target.value)} value={item.address?.street || ''} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span className='gc-content-label' style={{ opacity: 0.5 }}>{t('build_itinerary.label_number')}</span>
                                    <InputNumber className='gc-input-text' onChange={(e) => onNumeroChange(item.id, e)} value={item.address?.number || ''} style={{ width: '100%' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span className='gc-content-label' style={{ opacity: 0.5 }}>{t('build_itinerary.label_neighborhood')}</span>
                                    <Input className='gc-input-text' onChange={(e) => onColoniaChange(item.id, e.target.value)} value={item.address?.neighborhood || ''} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span className='gc-content-label' style={{ opacity: 0.5 }}>{t('build_itinerary.label_zip')}</span>
                                    <InputNumber className='gc-input-text' onChange={(e) => onCPChange(item.id, e)} value={item.address?.zip || ''} style={{ width: '100%' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span className='gc-content-label' style={{ opacity: 0.5 }}>{t('build_itinerary.label_state')}</span>
                                    <Input className='gc-input-text' onChange={(e) => onEstadoChange(item.id, e.target.value)} value={item.address?.state || ''} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span className='gc-content-label' style={{ opacity: 0.5 }}>{t('build_itinerary.label_city')}</span>
                                    <Input className='gc-input-text' onChange={(e) => onCiudadChange(item.id, e.target.value)} value={item.address?.city || ''} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span className='gc-content-label' style={{ opacity: 0.5 }}>{t('build_itinerary.label_country')}</span>
                                    <Input className='gc-input-text' onChange={(e) => onPaisChange(item.id, e.target.value)} value={item.address?.country || ''} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span className='gc-content-label' style={{ opacity: 0.5 }}>{t('build_itinerary.label_maps_url')}</span>
                                        <LuBadgeHelp size={15} onClick={() => handleHowTo('maps')} style={{ color: 'var(--brand-color-500)', cursor: 'pointer' }} />
                                    </div>
                                    <Input className='gc-input-text' onChange={(e) => onUrlChange(item.id, e.target.value)} value={item.address?.url || ''} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {(!item.moments || item.moments.length === 0) ? (
                    <Button
                        onClick={() => { handleSubitems(item.id); setInstanciasDrawerOpen(true) }}
                        icon={<IoMdAdd />}
                        className='primarybutton'
                        style={{ width: '100%' }}
                    >
                        {t('build_itinerary.btn_add_instances')}
                    </Button>
                ) : (
                    <Button
                        onClick={() => setInstanciasDrawerOpen(true)}
                        icon={<IoMdAdd />}
                        className='primarybutton--active'
                        style={{ width: '100%' }}
                    >
                        {t('build_itinerary.btn_view_instances', { count: item.moments.length })}
                    </Button>
                )}
            </div>
        )
    }

    const mobileInstanciasContent = (item) => {
        if (!item || !item.moments) return null
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ebebeb', paddingBottom: '12px' }}>
                    <span><b>{t('build_itinerary.section_instances')}</b></span>
                    <Button onClick={() => addNewSubitem(item)} className='primarybutton--active' style={{ maxHeight: '32px', fontSize: '12px' }} icon={<IoMdAdd />}>{t('build_itinerary.btn_new_instance')}</Button>
                </div>
                {item.moments.map((subitem, index) => (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {index > 0 && <div style={{ width: '2px', height: '28px', backgroundColor: '#B5A5CC' }} />}
                        <div className='build-generals-simple-column instancia-container' style={{ width: '100%' }}>
                            <div style={{ display: 'flex', gap: '12px', alignSelf: 'stretch' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span className='gc-content-label'>{t('build_itinerary.label_name')}</span>
                                    <Input
                                        className='gc-input-text'
                                        placeholder={t('build_itinerary.placeholder_instance')}
                                        value={subitem.name}
                                        style={{ fontSize: '12px' }}
                                        onChange={(e) => onSubNameChange(item.id, index, e.target.value)}
                                    />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Switch
                                            onChange={() => onSubTimeChange(item.id, index, subitem.time ? null : "00:00 am")}
                                            checked={!!subitem.time}
                                            size='small'
                                        />
                                        <span className='gc-content-label'>{t('build_itinerary.label_time')}</span>
                                    </div>
                                    <TimePicker
                                        disabled={!subitem.time}
                                        placeholder='0:00'
                                        className='gc-input-text'
                                        style={{ fontSize: '12px' }}
                                        value={dayjs(convert12HrTo24Hr(subitem.time), 'HH:mm')}
                                        format='HH:mm'
                                        onChange={(e) => onSubTimeChange(item.id, index, formatTimeTo12Hours(e))}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                                <span className='gc-content-label'>{t('build_itinerary.label_description')}</span>
                                <Input.TextArea
                                    className='gc-input-text'
                                    placeholder={t('build_itinerary.placeholder_instance_desc')}
                                    autoSize={{ minRows: 3, maxRows: 4 }}
                                    style={{ borderRadius: '12px', fontSize: '12px' }}
                                    value={subitem.description}
                                    onChange={(e) => onSubDescriptionChange(item.id, index, e.target.value)}
                                />
                                <div style={{ marginTop: '5px', display: 'flex', justifyContent: 'center' }}>
                                    <Button style={{ opacity: 0.5 }} className='secondarybutton' onClick={() => removeSubitem(item.id, index)} icon={<RiDeleteBack2Line size={16} />}>
                                        {t('build_itinerary.btn_delete_instance')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }


    return (
        <>
            {
                invitation ?
                    <div className='scroll-item generals-main-container' style={{ gap: '6px' }}>
                        <div className='build-component-elements'>

                            <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>
                                <div className='general-cards-single-row'>
                                    <span className={'module--title'} style={{ width: 'auto' }}>{t('build_itinerary.title')}</span>
                                </div>
                                <BuildMenu invitation={invitation} label={'itinerary'} setInvitation={setInvitation} setSaved={setSaved} invitationID={invitationID} />
                            </div>

                            <div className='build-generals-simple-column'>
                                <span className='gc-content-label'>{t('build_itinerary.label_title')}</span>
                                <Input
                                    onChange={onChangeTitle}
                                    value={invitation.itinerary.title}
                                    style={{ width: '100%', transition: 'all 0.3s ease' }}
                                    className={`gc-input-text`}
                                />
                            </div>

                            {invitation.itinerary.active &&
                                <Button
                                    style={{ margin: '16px 0px', width: isMobile ? '100%' : undefined }}
                                    icon={<IoMdAdd />}
                                    onClick={handleNewItem}
                                    className='primarybutton--active'
                                >
                                    {t('build_itinerary.btn_new_moment')}
                                </Button>
                            }

                        </div>

                        {
                            invitation.itinerary.active ?
                                <div className='build-component-elements'>
                                    {invitation.itinerary.object.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className={`generl-card-color-item ${!currentItem && 'general-hover-card'}`}
                                            style={{ cursor: 'pointer', flexDirection: 'column', gap: '12px', width: '100%', borderRadius: '12px', padding: '12px' }}
                                        >
                                            <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between', borderRadius: '8px' }}>
                                                <div className='general-cards-single-row'>
                                                    {item.icon ? renderIcon(item.icon, 24) : <LuBadgeHelp size={24} />}
                                                    <div className='build-generals-simple-column' style={{ gap: 0 }}>
                                                        <span className='single-card-name'>{item.name}</span>
                                                        <span className='single-card-time'>{item.time}</span>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                    {isMobile ? (
                                                        <Button
                                                            onClick={() => { setEditItemId(item.id); setEditDrawerOpen(true) }}
                                                            className='primarybutton'
                                                            icon={<LuArrowUpRight size={16} style={{ marginTop: '4px' }} />}
                                                        />
                                                    ) : (
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
                                                                        <Tooltip title={t('build_itinerary.tooltip_delete')} color='var(--error-color)'>
                                                                            <Button
                                                                                className='primarybutton'
                                                                                onClick={() => removeObjectById(item.id)}
                                                                                icon={<FaRegTrashAlt size={14} />}
                                                                            />
                                                                        </Tooltip>

                                                                        <Tooltip title={t('build_itinerary.tooltip_edit_icon')}>
                                                                            <Dropdown
                                                                                popupRender={() => (
                                                                                    <Row className='gc-icons-modal-container'>
                                                                                        {iconsItinerary.map((icon, index) => (
                                                                                            <Button
                                                                                                id={`gc-cta-buttons${icon.index === currentIcon ? '--selected' : ''}`}
                                                                                                className='gc-icons-modal-icon'
                                                                                                type='text'
                                                                                                onClick={() => handleIcon(icon.index, item.id)}
                                                                                                key={index}
                                                                                                icon={<icon.value size={20} />}
                                                                                            />
                                                                                        ))}
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
                                                                            value={item.name}
                                                                        />
                                                                    </div>

                                                                    <div style={{ width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'row', gap: '36px' }}>

                                                                        <div className='single_col' style={{ gap: '24px', flex: 1 }}>

                                                                            <div className='single_col' style={{ flex: 1, width: 'auto', gap: '12px' }}>

                                                                                <span><b>{t('build_itinerary.section_info')}</b></span>
                                                                                <div className='single_row' style={{ alignSelf: 'stretch', justifyContent: 'space-between' }}>
                                                                                    <span className='gc-content-label'>{t('build_itinerary.label_bg_image')}</span>
                                                                                </div>

                                                                                <div style={{
                                                                                    width: '100%', height: '180px', border: '1px solid #CCC',
                                                                                    borderRadius: '12px', overflow: 'hidden', position: 'relative',
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                    backgroundColor: '#f2f2f280',
                                                                                }}>
                                                                                    {item.image
                                                                                        ? <img src={item.image} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                                        : <LuImage size={18} style={{ color: '#CCC' }} />
                                                                                    }
                                                                                    <StorageImages absolute={true} isNull={true} invitationID={invitationID} handleImage={handleURL} id={item.id} />
                                                                                </div>

                                                                                <div className='build-component-elements'>
                                                                                    <div className='build-generals-simple-column' style={{ gap: '16px', width: '100%', flexDirection: 'row' }}>
                                                                                        <div className='build-generals-simple-column'>
                                                                                            <div className='general-cards-single-row' style={{ flex: 1, justifyContent: 'space-between', width: '100%' }}>
                                                                                                <span className='gc-content-label'>{t('build_itinerary.label_time')}</span>
                                                                                                <Switch
                                                                                                    onChange={() => handleTime(item.id)}
                                                                                                    checked={item.time ? true : false}
                                                                                                    size='small'
                                                                                                    style={{ backgroundColor: item.time ? '#1777FF' : '#AAA', border: 'none' }}
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
                                                                                            <div className='general-cards-single-row' style={{ flex: 1, justifyContent: 'space-between', width: '100%' }}>
                                                                                                <span className='gc-content-label'>{t('build_itinerary.label_description')}</span>
                                                                                                <Switch
                                                                                                    onChange={() => handleSubname(item.id)}
                                                                                                    checked={item.subtext ? true : false}
                                                                                                    size='small'
                                                                                                    style={{ backgroundColor: item.subtext ? '#1777FF' : '#AAA', border: 'none' }}
                                                                                                />
                                                                                            </div>
                                                                                            <Input
                                                                                                disabled={item.subtext ? false : true}
                                                                                                className='gc-input-text'
                                                                                                onChange={(e) => onSubnameChange(item.id, e.target.value)}
                                                                                                value={item.subtext}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className='build-component-elements' style={{ flex: 1, gap: '8px' }}>
                                                                                <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>
                                                                                    <span><b>{t('build_itinerary.section_address')}</b></span>
                                                                                    <Switch size='small' checked={item.address ? true : false} onChange={() => handleAdress(item.id)} />
                                                                                </div>

                                                                                {item.address && (
                                                                                    <>
                                                                                        <AddressAutocomplete
                                                                                            className='gc-input-text'
                                                                                            placeholder={t('build_itinerary.placeholder_search')}
                                                                                            onSelect={(addr) => onAddressAutoFill(item.id, addr)}
                                                                                        />
                                                                                        <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>
                                                                                            <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                <span className='gc-content-label' style={{ opacity: '0.5' }}>{t('build_itinerary.label_street')}</span>
                                                                                                <Input className='gc-input-text' onChange={(e) => onCalleChange(item.id, e.target.value)} value={item.address ? item.address.street : ''} />
                                                                                            </div>
                                                                                            <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                <span className='gc-content-label' style={{ opacity: '0.5' }}>{t('build_itinerary.label_number')}</span>
                                                                                                <InputNumber className='gc-input-text' onChange={(e) => onNumeroChange(item.id, e)} value={item.address ? item.address.number : ''} />
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>
                                                                                            <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                <span className='gc-content-label' style={{ opacity: '0.5' }}>{t('build_itinerary.label_neighborhood')}</span>
                                                                                                <Input className='gc-input-text' onChange={(e) => onColoniaChange(item.id, e.target.value)} value={item.address ? item.address.neighborhood : ''} />
                                                                                            </div>
                                                                                            <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                <span className='gc-content-label' style={{ opacity: '0.5' }}>{t('build_itinerary.label_zip')}</span>
                                                                                                <InputNumber className='gc-input-text' onChange={(e) => onCPChange(item.id, e)} value={item.address ? item.address.zip : ''} />
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>
                                                                                            <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                <span className='gc-content-label' style={{ opacity: '0.5' }}>{t('build_itinerary.label_state')}</span>
                                                                                                <Input className='gc-input-text' onChange={(e) => onEstadoChange(item.id, e.target.value)} value={item.address ? item.address.state : ''} />
                                                                                            </div>
                                                                                            <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                <span className='gc-content-label' style={{ opacity: '0.5' }}>{t('build_itinerary.label_city')}</span>
                                                                                                <Input className='gc-input-text' onChange={(e) => onCiudadChange(item.id, e.target.value)} value={item.address ? item.address.city : ''} />
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>
                                                                                            <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                <span className='gc-content-label' style={{ opacity: '0.5' }}>{t('build_itinerary.label_country')}</span>
                                                                                                <Input className='gc-input-text' onChange={(e) => onPaisChange(item.id, e.target.value)} value={item.address ? item.address.country : ''} />
                                                                                            </div>
                                                                                            <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                <div className='general-cards-single-row'>
                                                                                                    <span className='gc-content-label' style={{ opacity: '0.5' }}>{t('build_itinerary.label_maps_url_full')}</span>
                                                                                                    <LuBadgeHelp size={15} onClick={() => handleHowTo('maps')} style={{ color: 'var(--brand-color-500)', cursor: 'pointer' }} />
                                                                                                </div>
                                                                                                <Input className='gc-input-text' onChange={(e) => onUrlChange(item.id, e.target.value)} value={item.address ? item.address.url : ''} />
                                                                                            </div>
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                            </div>

                                                                            {(!item.moments || item.moments.length === 0) &&
                                                                                <Button onClick={() => handleSubitems(item.id)} icon={<IoMdAdd />} className='primarybutton'>{t('build_itinerary.btn_add_instances')}</Button>
                                                                            }
                                                                        </div>

                                                                        {item.moments && item.moments.length > 0 &&
                                                                            <div className='build-component-elements' style={{ maxWidth: '250px', height: '610px', gap: '12px', backgroundColor: '#F5F3F2', padding: '16px', borderRadius: '12px' }}>
                                                                                <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>
                                                                                    <div className='general-cards-single-row'>
                                                                                        <span><b>{t('build_itinerary.section_instances')}</b></span>
                                                                                    </div>
                                                                                    {item.moments &&
                                                                                        <Button
                                                                                            type='text'
                                                                                            onClick={() => addNewSubitem(item)}
                                                                                            className='primarybutton--active'
                                                                                            style={{ maxHeight: '32px', fontSize: '12px' }}
                                                                                            icon={<IoMdAdd />}
                                                                                        >
                                                                                            {t('build_itinerary.btn_new_instance')}
                                                                                        </Button>
                                                                                    }
                                                                                </div>

                                                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', maxHeight: '580px', overflow: 'auto' }}>
                                                                                    {item.moments ? item.moments.map((subitem, index) => (
                                                                                        <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                                                                            {index > 0 && <div style={{ width: '2px', height: '28px', backgroundColor: '#B5A5CC' }} />}
                                                                                            <div className='build-generals-simple-column instancia-container'>
                                                                                                <div className='general-cards-single-row' style={{ alignSelf: 'stretch', gap: '12px' }}>
                                                                                                    <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                        <span className='gc-content-label'>{t('build_itinerary.label_name')}</span>
                                                                                                        <Input
                                                                                                            className='gc-input-text'
                                                                                                            placeholder={t('build_itinerary.placeholder_instance')}
                                                                                                            value={subitem.name}
                                                                                                            style={{ fontSize: '12px' }}
                                                                                                            onChange={(e) => onSubNameChange(item.id, index, e.target.value)}
                                                                                                        />
                                                                                                    </div>
                                                                                                    <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                        <div className='general-cards-single-row' style={{ width: '100%' }}>
                                                                                                            <Switch
                                                                                                                onChange={() => onSubTimeChange(item.id, index, subitem.time ? null : "00:00 am")}
                                                                                                                checked={subitem.time ? true : false}
                                                                                                                size='small'
                                                                                                            />
                                                                                                            <span className='gc-content-label'>{t('build_itinerary.label_time')}</span>
                                                                                                        </div>
                                                                                                        <TimePicker
                                                                                                            disabled={subitem.time ? false : true}
                                                                                                            placeholder='0:00'
                                                                                                            className='gc-input-text'
                                                                                                            style={{ fontSize: '12px' }}
                                                                                                            value={dayjs(convert12HrTo24Hr(subitem.time), 'HH:mm')}
                                                                                                            format={'HH:mm'}
                                                                                                            onChange={(e) => onSubTimeChange(item.id, index, formatTimeTo12Hours(e))}
                                                                                                        />
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className='build-generals-simple-column' style={{ gap: '4px' }}>
                                                                                                    <span className='gc-content-label'>{t('build_itinerary.label_description')}</span>
                                                                                                    <Input.TextArea
                                                                                                        className='gc-input-text'
                                                                                                        placeholder={t('build_itinerary.placeholder_instance_desc')}
                                                                                                        autoSize={{ minRows: 4, maxRows: 5 }}
                                                                                                        style={{ borderRadius: '12px', fontSize: '12px' }}
                                                                                                        value={subitem.description}
                                                                                                        onChange={(e) => onSubDescriptionChange(item.id, index, e.target.value)}
                                                                                                    />
                                                                                                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '5px' }}>
                                                                                                        <Button
                                                                                                            style={{ opacity: '0.5' }}
                                                                                                            className='secondarybutton'
                                                                                                            onClick={() => removeSubitem(item.id, index)}
                                                                                                            icon={<RiDeleteBack2Line size={16} />}
                                                                                                        >
                                                                                                            {t('build_itinerary.btn_delete_instance')}
                                                                                                        </Button>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    )) : <></>}
                                                                                </div>
                                                                            </div>
                                                                        }

                                                                        <IconsModal
                                                                            handleImage={handleImage}
                                                                            id={item.id}
                                                                            isModalOpen={isModalOpen}
                                                                            setIsModalOpen={setIsModalOpen}
                                                                            currentIcon={currentIcon}
                                                                            setCurrentIcon={setCurrentIcon}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        >
                                                            <Button
                                                                onClick={() => setCurrentItem(currentItem === item.id ? null : item.id)}
                                                                className='primarybutton'
                                                                icon={<LuArrowUpRight size={16} style={{ marginTop: '4px' }} />}
                                                            />
                                                        </Dropdown>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                : <div style={{ width: '100%', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <TbEyeClosed size={32} style={{ color: '#717171' }} />
                                </div>
                        }

                    </div>
                    : <></>
            }

            <Drawer
                open={editDrawerOpen}
                onClose={() => setEditDrawerOpen(false)}
                placement="bottom"
                height="90%"
                closeIcon={false}
                // title={drawerTitle(editItem?.name || 'Editar momento', () => setEditDrawerOpen(false))}
                styles={drawerStyles}
                style={{ borderRadius: '24px 24px 0 0' }}
            >
                {mobileEditContent(editItem)}
            </Drawer>

            <Drawer
                open={instanciasDrawerOpen}
                onClose={() => setInstanciasDrawerOpen(false)}
                placement="right"
                width="90%"
                style={{ borderRadius: '24px 0px 0px 24px', backgroundColor: '#F5F3F2' }}
                closeIcon={false}
                // title={drawerTitle('Instancias', () => setInstanciasDrawerOpen(false))}
                styles={drawerStyles}
            >
                {mobileInstanciasContent(editItem)}
            </Drawer>

            <HelpDrawer visible={visible} setVisible={setVisible} type={type} setType={setType} />
            <HowToDrawer visible={howToVisible} setVisible={setHowToVisible} type={type} setType={setType} />
        </>
    )
}
