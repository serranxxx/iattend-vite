import { Button, Col, Empty, Input, Switch, Tooltip,  } from 'antd'
import { MdInvertColors } from 'react-icons/md';
import { StorageImages } from '../../../../components/ImagesStorage/StorageImages';
import { LuSeparatorHorizontal } from 'react-icons/lu';
import { BiSolidColorFill } from 'react-icons/bi';
import { IoMdAdd } from 'react-icons/io';
import { TbEyeClosed } from 'react-icons/tb';


export const BuildGallery = ({ invitation, setInvitation, invitationID, setSaved }) => {


    const handleActive = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gallery: {
                ...prevInvitation.gallery,
                active: e,
            },
        }));
        setSaved(false)
    }


    const onChangeBackground = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gallery: {
                ...prevInvitation.gallery,
                background: e,
            },
        }));
        setSaved(false)
    }

    const onChangeSeparator = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gallery: {
                ...prevInvitation.gallery,
                separator: e,
            },
        }));
        setSaved(false)
    }

    const handleURL = (url, index, id) => {
        setInvitation(prevInvitation => {
            const newDev = [...prevInvitation.gallery.dev];

            if (url === null) {
                // elimina el elemento en ese index
                newDev.splice(id, 1);
            } else {
                // reemplaza el valor en ese index
                newDev[id] = url;
            }

            return {
                ...prevInvitation,
                gallery: {
                    ...prevInvitation.gallery,
                    dev: newDev,
                },
            };
        });

        setSaved(false);
    };

    const onChangeTitle = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gallery: {
                ...prevInvitation.gallery,
                title: e ? e.target.value : prevInvitation.gallery.title,
            },
        }));
        setSaved(false)
    }

    const onInvertedColor = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gallery: {
                ...prevInvitation.gallery,
                inverted: e,
            },
        }));
        setSaved(false)
    }



    return (
        <>
            {
                invitation ?
                    <div className='scroll-item generals-main-container'>
                        <div className='build-component-elements'>
                            <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>
                                <div className='general-cards-single-row'>
                                    <span className={'module--title'}
                                        style={{
                                            width: 'auto',
                                        }}
                                    >Galería</span>
                                    <Switch
                                        size='small'
                                        value={invitation.gallery.active}
                                        onChange={handleActive} />
                                </div>


                                <div className='general-cards-single-row' style={{ gap: '5px' }}>
                                    {
                                        invitation.gallery.active && (

                                            <>
                                                <Button
                                                    type='ghost'
                                                    onClick={() => onChangeSeparator(!invitation.gallery.separator)}
                                                    id={`build-cover-date-buttons${invitation.gallery.separator ? '--active' : ''}`}
                                                    icon={<LuSeparatorHorizontal size={18} />} />

                                                <Button
                                                    type='ghost'
                                                    onClick={() => onChangeBackground(!invitation.gallery.background)}
                                                    id={`build-cover-date-buttons${invitation.gallery.background ? '--active' : ''}`}
                                                    icon={<BiSolidColorFill size={18} />} />

                                                {
                                                    invitation.gallery.background && !invitation.gallery.image &&
                                                    <Tooltip color="var(--text-color)" title="Invertir color de texto">
                                                        <Button
                                                            type='ghost'
                                                            onClick={() => onInvertedColor(!invitation.gallery.inverted)}
                                                            id={`build-cover-date-buttons${invitation.gallery.inverted ? '--active' : ''}`}
                                                            icon={<MdInvertColors size={18} />} />
                                                    </Tooltip>
                                                }
                                            </>
                                        )
                                    }
                                </div>

                            </div>

                            {
                                invitation.gallery.active &&
                                <>
                                    <div className='build-generals-simple-column'>
                                        <span className='gc-content-label'>Título</span>

                                        <Input
                                            onChange={onChangeTitle}
                                            value={invitation.gallery.title}
                                            style={{ width: '100%', transition: 'all 0.3s ease' }}
                                            className={`gc-input-text`} />
                                    </div>


                                    <Button
                                        onClick={() => setInvitation(prevInvitation => ({
                                            ...prevInvitation,
                                            gallery: {
                                                ...prevInvitation.gallery,  // Asegúrate de copiar correctamente dresscode
                                                dev: [...prevInvitation.gallery.dev, ''],  // Agregar la nueva URL al array de imágenes
                                            },
                                        }))}
                                        className='primarybutton--active'
                                        style={{ margin: '12px 0px' }}
                                        // onClick={addNewLink}
                                        icon={<IoMdAdd size={14} />}>
                                        Nueva fotografía
                                    </Button>


                                    {
                                        invitation.gallery.active ?
                                            <Col style={{
                                                width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
                                                flexDirection: 'column', gap: '12px'
                                            }}>
                                                {
                                                    invitation.gallery.dev && (
                                                        invitation.gallery.dev.length > 0 ?
                                                            invitation.gallery.dev.map((photo, index) => (

                                                                <div style={{
                                                                    width: '100%', borderRadius: '16px',
                                                                    backgroundColor: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                                                                    position: 'relative', height: '70px', overflow: 'hidden',
                                                                    boxShadow: '0px 0px 8px rgba(0,0,0,0.2)'

                                                                }}>


                                                                    <img alt='' src={photo} style={{
                                                                        width: '100%', height: '40vh', objectFit: 'cover', position: 'absolute',
                                                                    }} />

                                                                    <StorageImages absolute={true} isNull={true} invitationID={invitationID} handleImage={handleURL} id={index} />

                                                                </div>

                                                            ))
                                                            : <Empty description={false} style={{
                                                                marginTop: '30px'
                                                            }} />
                                                    )

                                                }


                                            </Col>
                                            : <div style={{
                                                width: '100%', height: '300px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}><TbEyeClosed size={32} style={{ color: '#717171' }} /></div>
                                    }

                                </>
                            }
                        </div>

                    </div >
                    : <></>
            }
        </>
    )
}