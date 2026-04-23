import { Button, Drawer, Input, message, Select, Dropdown, } from 'antd'

import { useEffect, useState } from 'react';
import { LuArrowUpRight, LuCheck, } from 'react-icons/lu';
import { StorageImages } from '../../../../components/ImagesStorage/StorageImages';
import { IoMdAdd } from 'react-icons/io';
import { TbEyeClosed } from 'react-icons/tb';
import { BuildMenu } from '../../../../components/BuildMenu/BuildMenu';
import { LuX } from 'react-icons/lu';

const { Option } = Select;

const types = [
    { label: 'Hospedaje', value: 'hotel' },
    { label: 'Comida', value: 'food' },
    { label: 'Actividades', value: 'activitie' }
]

const drawerStyles = {
    header: { borderBottom: '1px solid #F0F0F0', padding: '12px 16px' },
    body: { padding: '18px', overflow: 'auto' },
}


export const BuildDestinations = ({ invitationID, invitation, setInvitation, setSaved }) => {

    const [descriptionValue, setDescriptionValue] = useState(null)
    const [addingDest, setAddingDest] = useState(false)
    const [destImage, setDestImage] = useState(null)
    const [destName, setDestName] = useState(null)
    const [destUrl, setDestUrl] = useState(null)
    const [destType, setDestType] = useState(null)
    const [destDesc, setDestDesc] = useState(null)
    const [currentDest, setCurrentDest] = useState(null)
    const [isMobile, setIsMobile] = useState(false)
    const [addDrawerOpen, setAddDrawerOpen] = useState(false)
    const [editDrawerOpen, setEditDrawerOpen] = useState(false)
    const [editDrawerIndex, setEditDrawerIndex] = useState(null)

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 750)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    const handelClose = () => {
        setDestName(null)
        setDestUrl(null)
        setAddingDest(false)
    }

    const onChangeTitle = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            destinations: {
                ...prevInvitation.destinations,
                title: e ? e.target.value : prevInvitation.destinations.title,
            },
        }));
        setSaved(false)
    }

    const onChangeDescription = (e) => {
        setDescriptionValue(e.target.value)
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            destinations: {
                ...prevInvitation.destinations,
                description: e ? e.target.value : prevInvitation.destinations.description,
            },
        }));
        setSaved(false)
    }

    const addDestination = () => {
        if (destName && destType && destImage && destDesc) {
            setInvitation(prevInvitation => ({
                ...prevInvitation,
                destinations: {
                    ...prevInvitation.destinations,
                    cards: [
                        ...prevInvitation.destinations.cards,
                        { image: destImage, name: destName, url: destUrl, type: destType, description: destDesc }
                    ]
                }
            }));
            handelClose()
            setSaved(false)
            setAddDrawerOpen(false)
        } else {
            message.error('Completa el formulario de manera correcta')
        }
    }

    const deleteCardByIndex = (index) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            destinations: {
                ...prevInvitation.destinations,
                cards: prevInvitation.destinations.cards.filter((card, i) => i !== index)
            }
        }));
        setSaved(false)
    }

    const handleDelete = (card, index) => {
        deleteCardByIndex(index)
        setEditDrawerOpen(false)
    }

    useEffect(() => {
        setDescriptionValue(invitation.destinations.description)
    }, [])

    useEffect(() => {
        setDestImage(null)
        setDestName(null)
        setDestUrl(null)
        setDestType(null)
        setDestDesc(null)
    }, [addingDest])

    const handleTypes = (type) => {
        switch (type) {
            case 'food': return { label: 'Comida', color: '#FDD00E' }
            case 'hotel': return { label: 'Hotel', color: '#06AEFF' }
            case 'activitie': return { label: 'Actividades', color: '#35AE40' }
            default: break;
        }
    }

    const editDestinationName = (index, value) => {
        setInvitation(prev => ({
            ...prev,
            destinations: {
                ...prev.destinations,
                cards: prev.destinations.cards.map((card, i) => i === index ? { ...card, name: value } : card)
            }
        }));
        setSaved(false);
    };

    const editDestinationType = (index, value) => {
        setInvitation(prev => ({
            ...prev,
            destinations: {
                ...prev.destinations,
                cards: prev.destinations.cards.map((card, i) => i === index ? { ...card, type: value } : card)
            }
        }));
        setSaved(false);
    };

    const editDestinationImage = (value, index, id) => {
        setInvitation(prev => ({
            ...prev,
            destinations: {
                ...prev.destinations,
                cards: prev.destinations.cards.map((card, i) => i === id ? { ...card, image: value } : card)
            }
        }));
        setSaved(false);
    };

    const editDestinationDescription = (index, value) => {
        setInvitation(prev => ({
            ...prev,
            destinations: {
                ...prev.destinations,
                cards: prev.destinations.cards.map((card, i) => i === index ? { ...card, description: value } : card)
            }
        }));
        setSaved(false);
    };

    const editDestinationUrl = (index, value) => {
        setInvitation(prev => ({
            ...prev,
            destinations: {
                ...prev.destinations,
                cards: prev.destinations.cards.map((card, i) => i === index ? { ...card, url: value } : card)
            }
        }));
        setSaved(false);
    };

    const handleURL = (url) => setDestImage(url)

    const addFormContent = (
        <div className='dest-input-form' style={{ padding: isMobile ? 0 : '18px' }}>
            <div className='cta-container-des'>
                <span style={{ fontWeight: 600, fontSize: '16px' }}>Nueva actividad</span>
                <Button icon={<LuCheck />} onClick={addDestination} className='primarybutton--active'>Guardar</Button>
            </div>

            <div className='des-image-container' style={{ position: 'relative' }}>
                {destImage ? <img src={destImage} alt='' /> : <StorageImages invitationID={invitationID} handleImage={handleURL} />}
                {destImage && <StorageImages absolute={true} invitationID={invitationID} handleImage={handleURL} />}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', flex: 1, gap: '4px' }}>
                    <span className='gc-content-label'>Nombre</span>
                    <Input placeholder='Actividad' className='gc-input-text' onChange={(e) => setDestName(e.target.value)} value={destName} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', flex: 1, gap: '4px' }}>
                    <span className='gc-content-label'>Tipo</span>
                    <Select value={types.find((type) => type.value === destType)} onChange={(e) => setDestType(e)} style={{ width: '100%' }}>
                        {types.map((type, index) => <Option key={index} value={type.value}>{type.label}</Option>)}
                    </Select>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', width: '100%', gap: '4px' }}>
                <span className='gc-content-label'>Descripción</span>
                <Input.TextArea className='gc-input-text' style={{ borderRadius: '8px' }} value={destDesc}
                    onChange={(e) => setDestDesc(e.target.value)} autoSize={{ minRows: 2, maxRows: 5 }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', width: '100%', gap: '4px' }}>
                <span className='gc-content-label'>URL</span>
                <Input placeholder='Pagina web / Ubicación' className='gc-input-text'
                    onChange={(e) => setDestUrl(e.target.value)} value={destUrl} />
            </div>
        </div>
    )

    const editFormContent = (index) => {
        if (index === null || !invitation.destinations.cards[index]) return null
        const card = invitation.destinations.cards[index]
        return (
            <div className='dest-input-form' style={{ padding: isMobile ? 0 : '18px', width: isMobile ? '100%' : undefined }}>
                {
                    !isMobile &&
                    <div className='cta-container-des'>
                        <span style={{ fontWeight: 600, fontSize: '16px' }}>Editar actividad</span>
                    </div>
                }

                <div className='des-image-container' style={{ position: 'relative', height: '120px' }}>
                    <img src={card.image} alt='' />
                    <StorageImages absolute={true} invitationID={invitationID} handleImage={editDestinationImage} id={index} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', flex: 1, gap: '4px' }}>
                        <span className='gc-content-label'>Nombre</span>
                        <Input placeholder='Actividad' className='gc-input-text'
                            onChange={(e) => editDestinationName(index, e.target.value)} value={card.name} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', flex: 1, gap: '4px' }}>
                        <span className='gc-content-label'>Tipo</span>
                        <Select value={card.type} onChange={(e) => editDestinationType(index, e)} style={{ width: '100%' }}>
                            {types.map((type, i) => <Option key={i} value={type.value}>{type.label}</Option>)}
                        </Select>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', width: '100%', gap: '4px' }}>
                    <span className='gc-content-label'>Descripción</span>
                    <Input.TextArea className='gc-input-text' style={{ borderRadius: '8px' }}
                        value={card.description} onChange={(e) => editDestinationDescription(index, e.target.value)}
                        autoSize={{ minRows: 2, maxRows: 5 }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', width: '100%', gap: '4px' }}>
                    <span className='gc-content-label'>URL</span>
                    <Input placeholder='Pagina web / Ubicación' className='gc-input-text'
                        onChange={(e) => editDestinationUrl(index, e.target.value)} value={card.url} />
                </div>

                <Button onClick={() => handleDelete(currentDest, index)} className='primarybutton' style={{ width: '100%' }}>Eliminar</Button>
            </div>
        )
    }

    const drawerTitle = (title, onClose) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontWeight: 600, fontSize: '16px' }}>{title}</span>
            <Button type='text' icon={<LuX size={18} />} onClick={onClose} style={{ borderRadius: '99px' }} />
        </div>
    )

    return (
        <>
            {invitation ?
                <div className='scroll-item generals-main-container'>
                    <div className='build-component-elements'>
                        <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>
                            <div className='general-cards-single-row'>
                                <span className='module--title' style={{ width: 'auto', lineHeight: 1 }}>Destinos</span>
                            </div>
                            <BuildMenu invitation={invitation} label={'destinations'} setInvitation={setInvitation} setSaved={setSaved} invitationID={invitationID} />
                        </div>

                        {invitation.destinations.active ?
                            <>
                                <span className='gc-content-label'>Título</span>
                                <Input className='gc-input-text' onChange={onChangeTitle} value={invitation.destinations.title} />
                                <span className='gc-content-label'>Descripción</span>
                                <Input.TextArea className='gc-input-text' style={{ borderRadius: '16px' }}
                                    value={descriptionValue} onChange={onChangeDescription} autoSize={{ minRows: 3, maxRows: 5 }} />
                            </>
                            : <div />
                        }
                    </div>

                    {invitation.destinations.active ?
                        <>
                            <div className='destinations-cards-container'>

                                {isMobile ? (
                                    <>
                                        <Button className='primarybutton--active' icon={<IoMdAdd size={18} />}
                                            onClick={() => setAddDrawerOpen(true)} style={{ width: '100%' }}>
                                            Agregar destino
                                        </Button>
                                        <Drawer
                                            open={addDrawerOpen}
                                            onClose={() => setAddDrawerOpen(false)}
                                            placement="bottom"
                                            height="60%"
                                            closeIcon={false}
                                            title={drawerTitle('Nueva actividad', () => setAddDrawerOpen(false))}
                                            styles={drawerStyles}
                                            style={{ borderRadius: '24px 24px 0 0' }}
                                        >
                                            {addFormContent}
                                        </Drawer>
                                    </>
                                ) : (
                                    <Dropdown
                                        positio="right"
                                        arrow={{ pointAtCenter: true }}
                                        trigger={['click']}
                                        popupRender={() => addFormContent}
                                    >
                                        <Button className='primarybutton--active' icon={<IoMdAdd size={18} />}>Agregar destino</Button>
                                    </Dropdown>
                                )}

                                <div style={{
                                    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
                                    flexDirection: 'column', gap: '16px', alignSelf: 'stretch', marginTop: '12px'
                                }}>
                                    {invitation.destinations.cards.map((dest, index) => (
                                        <div className='dest-build-card' key={index} style={{ position: 'relative' }}>
                                            <div style={{
                                                backgroundImage: `url(${dest?.image})`,
                                                backgroundSize: 'cover', backgroundPosition: 'center',
                                                width: '100%', height: '120px', borderRadius: '8px', maxWidth: '180px'
                                            }} />

                                            <div style={{
                                                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                                                flexDirection: 'column', gap: '4px', lineHeight: 1, alignSelf: 'stretch', flex: 1
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gap: '6px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                        <div style={{ height: '8px', width: '8px', borderRadius: '99px', backgroundColor: handleTypes(dest.type)?.color }} />
                                                        <span style={{ fontSize: '12px' }}>{handleTypes(dest.type)?.label}</span>
                                                    </div>
                                                    <span style={{ fontWeight: 600, fontSize: '16px' }} className='gc-content-label'>{dest?.name}</span>
                                                </div>

                                                {isMobile ? (
                                                    <Button
                                                        icon={<LuArrowUpRight />}
                                                        className='primarybutton'
                                                        style={{ alignSelf: 'stretch', minWidth: '100%', borderRadius: '8px' }}
                                                        onClick={() => { setCurrentDest(dest); setEditDrawerIndex(index); setEditDrawerOpen(true) }}>
                                                        Abrir
                                                    </Button>
                                                ) : (
                                                    <Dropdown
                                                        placement='right'
                                                        arrow={{ pointAtCenter: true }}
                                                        trigger={['click']}
                                                        popupRender={() => editFormContent(index)}
                                                    >
                                                        <Button onClick={() => setCurrentDest(dest)} icon={<LuArrowUpRight />}
                                                            className='primarybutton' style={{ alignSelf: 'stretch', minWidth: '100%', borderRadius: '8px' }}>
                                                            Abrir
                                                        </Button>
                                                    </Dropdown>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {isMobile && (
                                    <Drawer
                                        open={editDrawerOpen}
                                        onClose={() => setEditDrawerOpen(false)}
                                        placement="bottom"
                                        height="60%"
                                        closeIcon={false}
                                        title={drawerTitle('Editar actividad', () => setEditDrawerOpen(false))}
                                        styles={drawerStyles}
                                        style={{ borderRadius: '24px 24px 0 0' }}
                                    >
                                        {editFormContent(editDrawerIndex)}
                                    </Drawer>
                                )}

                            </div>
                        </>
                        : <div style={{ width: '100%', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TbEyeClosed size={32} style={{ color: '#717171' }} />
                        </div>
                    }

                </div>
                : <></>
            }
        </>
    )
}
