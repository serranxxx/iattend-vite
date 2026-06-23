import { Button, Drawer, Input, message, Select, Dropdown, } from 'antd'
import { useTranslation } from 'react-i18next'

import { useEffect, useState } from 'react';
import { LuArrowUpRight, LuCheck, LuGripVertical } from 'react-icons/lu';
import { StorageImages } from '../../../../components/ImagesStorage/StorageImages';
import { IoMdAdd } from 'react-icons/io';
import { TbEyeClosed } from 'react-icons/tb';
import { BuildMenu } from '../../../../components/BuildMenu/BuildMenu';
import { LuX } from 'react-icons/lu';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Option } = Select;

const drawerStyles = {
    header: { borderBottom: '1px solid #F0F0F0', padding: '12px 16px' },
    body: { padding: '18px', overflow: 'auto' },
}

let _idCounter = 0;
const generateId = () => `dest_${Date.now()}_${++_idCounter}`;

const ensureId = (card) => card._id ? card : { ...card, _id: generateId() };

function SortableDestCard({ card, isMobile, handleTypes, t, onOpen, setEditDrawerId, setEditDrawerOpen }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div className='dest-build-card' style={{ position: 'relative' }}>
                <div
                    {...attributes}
                    {...listeners}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '-22px',
                        transform: 'translateY(-50%)',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        color: '#BDBDBD',
                        display: 'flex',
                        alignItems: 'center',
                        touchAction: 'none',
                    }}
                >
                    <LuGripVertical size={16} />
                </div>

                <div style={{
                    backgroundImage: `url(${card?.image})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    width: '100%', height: '120px', borderRadius: '8px', maxWidth: '180px'
                }} />

                <div style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    flexDirection: 'column', gap: '4px', lineHeight: 1, alignSelf: 'stretch', flex: 1
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <div style={{ height: '8px', width: '8px', borderRadius: '99px', backgroundColor: handleTypes(card.type)?.color }} />
                            <span style={{ fontSize: '12px' }}>{handleTypes(card.type)?.label}</span>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '16px' }} className='gc-content-label'>{card?.name}</span>
                    </div>

                    {isMobile ? (
                        <Button
                            icon={<LuArrowUpRight />}
                            className='primarybutton'
                            style={{ alignSelf: 'stretch', minWidth: '100%', borderRadius: '8px' }}
                            onClick={() => { setEditDrawerId(card._id); setEditDrawerOpen(true) }}>
                            {t('build_destinations.btn_open')}
                        </Button>
                    ) : (
                        <Dropdown
                            placement='right'
                            arrow={{ pointAtCenter: true }}
                            trigger={['click']}
                            popupRender={() => onOpen(card._id)}
                        >
                            <Button icon={<LuArrowUpRight />}
                                className='primarybutton' style={{ alignSelf: 'stretch', minWidth: '100%', borderRadius: '8px' }}>
                                {t('build_destinations.btn_open')}
                            </Button>
                        </Dropdown>
                    )}
                </div>
            </div>
        </div>
    );
}


export const BuildDestinations = ({ invitationID, invitation, setInvitation, setSaved }) => {

    const { t } = useTranslation()

    const types = [
        { label: t('build_destinations.type_lodging'), value: 'hotel' },
        { label: t('build_destinations.type_food'), value: 'food' },
        { label: t('build_destinations.type_activity'), value: 'activitie' }
    ]

    const [descriptionValue, setDescriptionValue] = useState(null)
    const [addingDest, setAddingDest] = useState(false)
    const [destImage, setDestImage] = useState(null)
    const [destName, setDestName] = useState(null)
    const [destUrl, setDestUrl] = useState(null)
    const [destType, setDestType] = useState(null)
    const [destDesc, setDestDesc] = useState(null)
    const [isMobile, setIsMobile] = useState(false)
    const [addDrawerOpen, setAddDrawerOpen] = useState(false)
    const [editDrawerOpen, setEditDrawerOpen] = useState(false)
    const [editDrawerId, setEditDrawerId] = useState(null)

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 750)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    // Ensure all existing cards have a _id
    useEffect(() => {
        setInvitation(prev => {
            const cards = prev.destinations.cards;
            if (cards.every(c => c._id)) return prev;
            return {
                ...prev,
                destinations: {
                    ...prev.destinations,
                    cards: cards.map(ensureId)
                }
            };
        });
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
                        { _id: generateId(), image: destImage, name: destName, url: destUrl, type: destType, description: destDesc }
                    ]
                }
            }));
            handelClose()
            setSaved(false)
            setAddDrawerOpen(false)
        } else {
            message.error(t('build_destinations.error_form'))
        }
    }

    const deleteCardById = (cardId) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            destinations: {
                ...prevInvitation.destinations,
                cards: prevInvitation.destinations.cards.filter(card => card._id !== cardId)
            }
        }));
        setSaved(false)
    }

    const handleDelete = (cardId) => {
        deleteCardById(cardId)
        setEditDrawerOpen(false)
    }

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setInvitation(prev => {
            const cards = prev.destinations.cards;
            const oldIndex = cards.findIndex(c => c._id === active.id);
            const newIndex = cards.findIndex(c => c._id === over.id);
            return {
                ...prev,
                destinations: {
                    ...prev.destinations,
                    cards: arrayMove(cards, oldIndex, newIndex)
                }
            };
        });
        setSaved(false);
    };

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
            case 'food': return { label: t('build_destinations.type_food'), color: '#FDD00E' }
            case 'hotel': return { label: t('build_destinations.type_hotel'), color: '#06AEFF' }
            case 'activitie': return { label: t('build_destinations.type_activity'), color: '#35AE40' }
            default: break;
        }
    }

    const editDestinationName = (cardId, value) => {
        setInvitation(prev => ({
            ...prev,
            destinations: {
                ...prev.destinations,
                cards: prev.destinations.cards.map(card => card._id === cardId ? { ...card, name: value } : card)
            }
        }));
        setSaved(false);
    };

    const editDestinationType = (cardId, value) => {
        setInvitation(prev => ({
            ...prev,
            destinations: {
                ...prev.destinations,
                cards: prev.destinations.cards.map(card => card._id === cardId ? { ...card, type: value } : card)
            }
        }));
        setSaved(false);
    };

    const editDestinationImage = (value, _unused, cardId) => {
        setInvitation(prev => ({
            ...prev,
            destinations: {
                ...prev.destinations,
                cards: prev.destinations.cards.map(card => card._id === cardId ? { ...card, image: value } : card)
            }
        }));
        setSaved(false);
    };

    const editDestinationDescription = (cardId, value) => {
        setInvitation(prev => ({
            ...prev,
            destinations: {
                ...prev.destinations,
                cards: prev.destinations.cards.map(card => card._id === cardId ? { ...card, description: value } : card)
            }
        }));
        setSaved(false);
    };

    const editDestinationUrl = (cardId, value) => {
        setInvitation(prev => ({
            ...prev,
            destinations: {
                ...prev.destinations,
                cards: prev.destinations.cards.map(card => card._id === cardId ? { ...card, url: value } : card)
            }
        }));
        setSaved(false);
    };

    const handleURL = (url) => setDestImage(url)

    const addFormContent = (
        <div className='dest-input-form' style={{ padding: isMobile ? 0 : '18px' }}>
            <div className='cta-container-des'>
                <span style={{ fontWeight: 600, fontSize: '16px' }}>{t('build_destinations.drawer_new')}</span>
                <Button icon={<LuCheck />} onClick={addDestination} className='primarybutton--active'>{t('build_destinations.btn_save')}</Button>
            </div>

            <div className='des-image-container' style={{ position: 'relative' }}>
                {destImage ? <img src={destImage} alt='' /> : <StorageImages invitationID={invitationID} handleImage={handleURL} />}
                {destImage && <StorageImages absolute={true} invitationID={invitationID} handleImage={handleURL} />}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', flex: 1, gap: '4px' }}>
                    <span className='gc-content-label'>{t('build_destinations.label_name')}</span>
                    <Input placeholder={t('build_destinations.placeholder_activity')} className='gc-input-text' onChange={(e) => setDestName(e.target.value)} value={destName} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', flex: 1, gap: '4px' }}>
                    <span className='gc-content-label'>{t('build_destinations.label_type')}</span>
                    <Select value={types.find((type) => type.value === destType)} onChange={(e) => setDestType(e)} style={{ width: '100%' }}>
                        {types.map((type, index) => <Option key={index} value={type.value}>{type.label}</Option>)}
                    </Select>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', width: '100%', gap: '4px' }}>
                <span className='gc-content-label'>{t('build_destinations.label_description')}</span>
                <Input.TextArea className='gc-input-text' style={{ borderRadius: '8px' }} value={destDesc}
                    onChange={(e) => setDestDesc(e.target.value)} autoSize={{ minRows: 2, maxRows: 5 }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', width: '100%', gap: '4px' }}>
                <span className='gc-content-label'>{t('build_destinations.label_url')}</span>
                <Input placeholder={t('build_destinations.placeholder_url')} className='gc-input-text'
                    onChange={(e) => setDestUrl(e.target.value)} value={destUrl} />
            </div>
        </div>
    )

    const editFormContent = (cardId) => {
        if (!cardId) return null;
        const card = invitation.destinations.cards.find(c => c._id === cardId);
        if (!card) return null;
        return (
            <div className='dest-input-form' style={{ padding: isMobile ? 0 : '18px', width: isMobile ? '100%' : undefined }}>
                {
                    !isMobile &&
                    <div className='cta-container-des'>
                        <span style={{ fontWeight: 600, fontSize: '16px' }}>{t('build_destinations.drawer_edit')}</span>
                    </div>
                }

                <div className='des-image-container' style={{ position: 'relative', height: '120px' }}>
                    <img src={card.image} alt='' />
                    <StorageImages absolute={true} invitationID={invitationID} handleImage={editDestinationImage} id={cardId} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', flex: 1, gap: '4px' }}>
                        <span className='gc-content-label'>{t('build_destinations.label_name')}</span>
                        <Input placeholder={t('build_destinations.placeholder_activity')} className='gc-input-text'
                            onChange={(e) => editDestinationName(cardId, e.target.value)} value={card.name} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', flex: 1, gap: '4px' }}>
                        <span className='gc-content-label'>{t('build_destinations.label_type')}</span>
                        <Select value={card.type} onChange={(e) => editDestinationType(cardId, e)} style={{ width: '100%' }}>
                            {types.map((type, i) => <Option key={i} value={type.value}>{type.label}</Option>)}
                        </Select>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', width: '100%', gap: '4px' }}>
                    <span className='gc-content-label'>{t('build_destinations.label_description')}</span>
                    <Input.TextArea className='gc-input-text' style={{ borderRadius: '8px' }}
                        value={card.description} onChange={(e) => editDestinationDescription(cardId, e.target.value)}
                        autoSize={{ minRows: 2, maxRows: 5 }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', width: '100%', gap: '4px' }}>
                    <span className='gc-content-label'>{t('build_destinations.label_url')}</span>
                    <Input placeholder={t('build_destinations.placeholder_url')} className='gc-input-text'
                        onChange={(e) => editDestinationUrl(cardId, e.target.value)} value={card.url} />
                </div>

                <Button onClick={() => handleDelete(cardId)} className='primarybutton' style={{ width: '100%' }}>{t('build_destinations.btn_delete')}</Button>
            </div>
        )
    }

    const drawerTitle = (title, onClose) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontWeight: 600, fontSize: '16px' }}>{title}</span>
            <Button type='text' icon={<LuX size={18} />} onClick={onClose} style={{ borderRadius: '99px' }} />
        </div>
    )

    const VisibilityDivider = () => (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '4px 0', width: '100%'
        }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E0E0E0' }} />
            <span style={{
                fontSize: '11px', color: '#AAAAAA', whiteSpace: 'nowrap',
                fontWeight: 500, letterSpacing: '0.2px'
            }}>
                {t('build_destinations.visibility_limit', 'Solo las primeras 6 son visibles')}
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E0E0E0' }} />
        </div>
    );

    return (
        <>
            {invitation ?
                <div className='scroll-item generals-main-container'>
                    <div className='build-component-elements'>
                        <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>
                            <div className='general-cards-single-row'>
                                <span className='module--title' style={{ width: 'auto', lineHeight: 1 }}>{t('build_destinations.title')}</span>
                            </div>
                            <BuildMenu invitation={invitation} label={'destinations'} setInvitation={setInvitation} setSaved={setSaved} invitationID={invitationID} />
                        </div>

                        {invitation.destinations.active ?
                            <>
                                <span className='gc-content-label'>{t('build_destinations.label_title')}</span>
                                <Input className='gc-input-text' onChange={onChangeTitle} value={invitation.destinations.title} />
                                <span className='gc-content-label'>{t('build_destinations.label_description')}</span>
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
                                            {t('build_destinations.btn_add')}
                                        </Button>
                                        <Drawer
                                            open={addDrawerOpen}
                                            onClose={() => setAddDrawerOpen(false)}
                                            placement="bottom"
                                            height="60%"
                                            closeIcon={false}
                                            title={drawerTitle(t('build_destinations.drawer_new'), () => setAddDrawerOpen(false))}
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
                                        <Button className='primarybutton--active' icon={<IoMdAdd size={18} />}>{t('build_destinations.btn_add')}</Button>
                                    </Dropdown>
                                )}

                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext
                                        items={invitation.destinations.cards.map(c => c._id).filter(Boolean)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div style={{
                                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
                                            flexDirection: 'column', gap: '16px', alignSelf: 'stretch',
                                            marginTop: '12px', paddingLeft: '24px'
                                        }}>
                                            {invitation.destinations.cards.map((dest, index) => (
                                                <div key={dest._id || index} style={{ width: '100%' }}>
                                                    <SortableDestCard
                                                        card={dest}
                                                        index={index}
                                                        isMobile={isMobile}
                                                        handleTypes={handleTypes}
                                                        t={t}
                                                        onOpen={editFormContent}
                                                        setEditDrawerId={setEditDrawerId}
                                                        setEditDrawerOpen={setEditDrawerOpen}
                                                    />
                                                    {index === 5 && invitation.destinations.cards.length > 6 && (
                                                        <div style={{ marginTop: '16px' }}>
                                                            <VisibilityDivider />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>

                                {isMobile && (
                                    <Drawer
                                        open={editDrawerOpen}
                                        onClose={() => setEditDrawerOpen(false)}
                                        placement="bottom"
                                        height="60%"
                                        closeIcon={false}
                                        title={drawerTitle(t('build_destinations.drawer_edit'), () => setEditDrawerOpen(false))}
                                        styles={drawerStyles}
                                        style={{ borderRadius: '24px 24px 0 0' }}
                                    >
                                        {editFormContent(editDrawerId)}
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
