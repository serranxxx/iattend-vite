import { Button, ColorPicker, Empty, Input, Switch, Tooltip, message } from 'antd'
import { useEffect, useState } from 'react';
import { HelpDrawer } from '../../../../components/Helpers/HelpDrawer';
import { MdInvertColors } from 'react-icons/md';
import {  LuImage, LuImageOff, LuLink, LuLink2Off, LuSeparatorHorizontal } from 'react-icons/lu';
import { StorageImages } from '../../../../components/ImagesStorage/StorageImages';
import { dresscodeAI } from '../../../../helpers/services/messages';
import { colorFactoryToHex, darker, lighter } from '../../../../helpers/assets/functions';
import { BiSolidColorFill } from 'react-icons/bi';
import { BsStars } from 'react-icons/bs';
import { IoMdAdd } from 'react-icons/io';
import { TbEyeClosed } from 'react-icons/tb';
import { RiDeleteBack2Line } from 'react-icons/ri';


export const BuildDressCode = ({ invitation, setInvitation, invitationID, setSaved, }) => {

    const [visible, setVisible] = useState(false)
    const [type, setType] = useState(null)

    const [onButton, setOnButton] = useState(false)
    const [onGeneration, setOnGeneration] = useState(false)
    const [descriptionValue, setDescriptionValue] = useState(null)
    const [presets, setPresets] = useState(null)
    const [hideLink, setHideLink] = useState(false)
    const [hideImages, setHideImages] = useState(false)
    const [handleLinks, setHandleLinks] = useState(null)

    const handleGenerating = () => {

        let local_description = dresscodeAI[Math.floor(Math.random() * 9)]

        setDescriptionValue('Generando ...');

        setTimeout(() => {
            setDescriptionValue(local_description)
        }, 4500);

        setOnGeneration(true);

        setTimeout(() => {
            setInvitation(prevInvitation => ({
                ...prevInvitation,
                dresscode: {
                    ...prevInvitation.dresscode,
                    description: local_description,
                },
            }));
            setSaved(false);
            setOnGeneration(false);
        }, 5000);
    };

    const handleActive = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            dresscode: {
                ...prevInvitation.dresscode,
                active: e,
            },
        }));
        setSaved(false)
    }

    const handleOnImages = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            dresscode: {
                ...prevInvitation.dresscode,
                images_active: e,
            },
        }));
        setSaved(false)
    }

    const handleOnLinks = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            dresscode: {
                ...prevInvitation.dresscode,
                links_active: e,
            },
        }));
        setSaved(false)
    }

    const onChangeTitle = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            dresscode: {
                ...prevInvitation.dresscode,
                title: e ? e.target.value : prevInvitation.dresscode.title,
            },
        }));
        setSaved(false)
    }

    const onChangeDescription = (e) => {
        setDescriptionValue(e.target.value)
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            dresscode: {
                ...prevInvitation.dresscode,
                description: e ? e.target.value : prevInvitation.dresscode.description,
            },
        }));
        setSaved(false)
    }

    const changeLinkbyIndex = (newName) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            dresscode: {
                ...prevInvitation.dresscode,
                links: [
                    newName, // reemplaza el primer elemento del array
                    ...(prevInvitation.dresscode.links?.slice(1) || [])
                ]
            }
        }));
        setSaved(false);
    };

    useEffect(() => {
        if (handleLinks) {
            changeLinkbyIndex(handleLinks)
        }
    }, [handleLinks])

    const onChangeBackground = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            dresscode: {
                ...prevInvitation.dresscode,
                background: e,
            },
        }));
        setSaved(false)
    }

    const onChangeSeparator = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            dresscode: {
                ...prevInvitation.dresscode,
                separator: e,
            },
        }));
        setSaved(false)
    }

    const handleURL = (url, index) => {
        setInvitation(prevInvitation => {
            const newDev = [...prevInvitation.dresscode.dev];

            if (url === null) {
                // elimina el elemento en ese index
                newDev.splice(index, 1);
            } else {
                // reemplaza el valor en ese index
                newDev[index] = url;
            }

            return {
                ...prevInvitation,
                dresscode: {
                    ...prevInvitation.dresscode,
                    dev: newDev,
                },
            };
        });

        setSaved(false);
    };

    const addNewColor = () => {
        if (invitation.dresscode.colors.length < 5) {
            setInvitation(prevInvitation => ({
                ...prevInvitation,
                dresscode: {
                    ...prevInvitation.dresscode,
                    colors: [
                        ...prevInvitation.dresscode.colors,
                        invitation.generals.colors.secondary
                    ]
                }
            }))
            setSaved(false)
        } else {
            message.warning('No puedes agregar más de 5 colores')
        }

    }

    const onChangeColorByIndex = (e, index) => {
        const color = colorFactoryToHex(e);

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            dresscode: {
                ...prevInvitation.dresscode,
                colors: prevInvitation.dresscode.colors.map((card, i) => {
                    if (i === index) {
                        return color; // Reemplazar el color existente en el índice dado
                    }
                    return card;
                })
            },
        }));
        setSaved(false)
    }

    const onDeleteColorByIndex = (index) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            dresscode: {
                ...prevInvitation.dresscode,
                colors: prevInvitation.dresscode.colors.filter((_, i) => i !== index)
            }
        }));
        setSaved(false)
    }


    const onInvertedColor = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            dresscode: {
                ...prevInvitation.dresscode,
                inverted: e,
            },
        }));
        setSaved(false)
    }


    useEffect(() => {
        setDescriptionValue(invitation.dresscode.description)
        const presetColors = [
            {
                label: 'Fondo',
                colors: [
                    darker(invitation.generals.colors.primary, 0.3),
                    darker(invitation.generals.colors.primary, 0.5),
                    darker(invitation.generals.colors.primary, 0.7),
                    darker(invitation.generals.colors.primary, 0.9),
                    invitation.generals.colors.primary,
                    lighter(invitation.generals.colors.primary, 0.9),
                    lighter(invitation.generals.colors.primary, 0.7),
                    lighter(invitation.generals.colors.primary, 0.5),
                    lighter(invitation.generals.colors.primary, 0.3),
                    lighter(invitation.generals.colors.primary, 0.1),
                ]
            },
            {
                label: 'Contrastes',
                colors: [
                    darker(invitation.generals.colors.secondary, 0.3),
                    darker(invitation.generals.colors.secondary, 0.5),
                    darker(invitation.generals.colors.secondary, 0.7),
                    darker(invitation.generals.colors.secondary, 0.9),
                    invitation.generals.colors.secondary,
                    lighter(invitation.generals.colors.secondary, 0.9),
                    lighter(invitation.generals.colors.secondary, 0.7),
                    lighter(invitation.generals.colors.secondary, 0.5),
                    lighter(invitation.generals.colors.secondary, 0.3),
                    lighter(invitation.generals.colors.secondary, 0.1),
                ]
            },
            {
                label: 'Textos',
                colors: [
                    darker(invitation.generals.colors.accent, 0.3),
                    darker(invitation.generals.colors.accent, 0.5),
                    darker(invitation.generals.colors.accent, 0.7),
                    darker(invitation.generals.colors.accent, 0.9),
                    invitation.generals.colors.accent,
                    lighter(invitation.generals.colors.accent, 0.9),
                    lighter(invitation.generals.colors.accent, 0.7),
                    lighter(invitation.generals.colors.accent, 0.5),
                    lighter(invitation.generals.colors.accent, 0.3),
                    lighter(invitation.generals.colors.accent, 0.1),
                ]
            },
            {
                label: 'Botones',
                colors: [
                    darker(invitation.generals.colors.actions, 0.3),
                    darker(invitation.generals.colors.actions, 0.5),
                    darker(invitation.generals.colors.actions, 0.7),
                    darker(invitation.generals.colors.actions, 0.9),
                    invitation.generals.colors.actions,
                    lighter(invitation.generals.colors.actions, 0.9),
                    lighter(invitation.generals.colors.actions, 0.7),
                    lighter(invitation.generals.colors.actions, 0.5),
                    lighter(invitation.generals.colors.actions, 0.3),
                    lighter(invitation.generals.colors.actions, 0.1),
                ]
            }
        ];

        setHideLink(invitation.dresscode.links_active)
        setHideImages(invitation.dresscode.images_active)
        setHandleLinks(invitation.dresscode.links[0])
        setPresets(presetColors)
    }, [])


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
                                    >Dresscode</span>
                                    <Switch
                                        size='small'
                                        value={invitation.dresscode.active}
                                        onChange={handleActive} />
                                </div>


                                <div className='general-cards-single-row' style={{ gap: '5px' }}>
                                    {
                                        invitation.dresscode.active && (

                                            <>


                                                <Tooltip color="var(--text-color)" title="Activar separador">
                                                    <Button
                                                        type='ghost'
                                                        onClick={() => onChangeSeparator(!invitation.dresscode.separator)}
                                                        id={`build-cover-date-buttons${invitation.dresscode.separator ? '--active' : ''}`}
                                                        icon={<LuSeparatorHorizontal size={18} />} />
                                                </Tooltip>


                                                <Tooltip color="var(--text-color)" title="Activar color de fondo">
                                                    <Button
                                                        type='ghost'
                                                        onClick={() => onChangeBackground(!invitation.dresscode.background)}
                                                        id={`build-cover-date-buttons${invitation.dresscode.background ? '--active' : ''}`}
                                                        icon={<BiSolidColorFill size={18} />} />
                                                </Tooltip>

                                                {
                                                    invitation.dresscode.background &&
                                                    <Tooltip color="var(--text-color)" title="Invertir color de texto">
                                                        <Button
                                                            type='ghost'
                                                            onClick={() => onInvertedColor(!invitation.dresscode.inverted)}
                                                            id={`build-cover-date-buttons${invitation.dresscode.inverted ? '--active' : ''}`}
                                                            icon={<MdInvertColors size={18} />} />
                                                    </Tooltip>
                                                }

                                                <Tooltip color="var(--gradient)" title="Generar texto">
                                                    <Button
                                                        onMouseEnter={() => setOnButton(true)}
                                                        onMouseLeave={() => setOnButton(false)}
                                                        type='ghost'
                                                        onClick={handleGenerating}
                                                        style={{ background: 'var(--gradient)', color: 'var(--ft-color)' }}
                                                        id={`build-cover-date-buttons${!onButton ? '--active' : ''}`}
                                                        icon={<BsStars size={16} />}>

                                                    </Button>
                                                </Tooltip>

                                            </>
                                        )
                                    }
                                </div>

                            </div>

                            {
                                invitation.dresscode.active &&
                                <>
                                    <span className='gc-content-label'>Título</span>

                                    <Input
                                        placeholder='Título'
                                        className='gc-input-text'
                                        onChange={onChangeTitle}
                                        value={invitation.dresscode.title} />

                                    <span className='gc-content-label'>Descripción</span>
                                    <Input.TextArea
                                        placeholder={'Descripción'}
                                        value={descriptionValue}
                                        onChange={onChangeDescription}
                                        autoSize={{ minRows: 3, maxRows: 5 }}
                                        className={`gc-input-text ${onGeneration ? 'magic-effect' : ''}`}
                                        style={{
                                            borderRadius: '8px'
                                        }} />

                                </>
                            }

                        </div>

                        {
                            invitation.dresscode.active ?

                                <>
                                    <div className='build-component-elements'>
                                        <div className='general-cards-single-row' style={{
                                            width: '100%', justifyContent: 'space-between'
                                        }}>
                                            <span className={'module--title'} style={{ textAlign: 'left' }}
                                            >Paleta de colores</span>

                                            <Button
                                                id='build-cover-date-buttons'
                                                onClick={addNewColor}
                                                icon={<IoMdAdd size={20} />} />
                                        </div>

                                        {
                                            invitation.dresscode.colors ?
                                                invitation.dresscode.colors.map((item, index) => (

                                                    <div className='generl-card-color-item'>
                                                        <div className='general-cards-single-row'>
                                                            <ColorPicker
                                                                presets={presets}
                                                                disabledAlpha={false}
                                                                value={item}
                                                                style={{ width: '184px' }}
                                                                onChangeComplete={(e) => onChangeColorByIndex(e, index)}>
                                                            </ColorPicker>
                                                            <Button
                                                                id='build-cover-date-buttons'
                                                                onClick={() => onDeleteColorByIndex(index)}
                                                                icon={<RiDeleteBack2Line size={20} />}
                                                            >Eliminar</Button>

                                                        </div>

                                                    </div>

                                                ))
                                                : <></>

                                        }

                                    </div>

                                    <div className='build-component-elements'>
                                        <div className='general-cards-single-row' style={{
                                            width: '100%', justifyContent: 'space-between'
                                        }}>
                                            <div className='general-cards-single-row'>

                                                <span className={'module--title'} style={{ width: 'auto' }}
                                                >URL Pinterest</span>

                                            </div>

                                            {
                                                <Tooltip title="Ocultar">
                                                    <Button onClick={() => {
                                                        setHideLink(!hideLink);
                                                        handleOnLinks(!hideLink);
                                                    }} id='build-cover-date-buttons' icon={!hideLink ? <LuLink tyle={{
                                                        marginTop: '2px',
                                                    }} /> : <LuLink2Off style={{
                                                        marginTop: '2px',
                                                    }} />}>
                                                        {!hideLink ? 'Mostrar' : 'Ocultar'}
                                                    </Button>
                                                </Tooltip>

                                            }



                                        </div>


                                        {
                                            hideLink &&
                                            <Input
                                                disabled={!hideLink}
                                                placeholder='Link'
                                                className='gc-input-text'
                                                onChange={(e) => setHandleLinks(e.target.value)}
                                                value={handleLinks} />
                                        }



                                    </div>

                                    <div className='build-component-elements'>
                                        <div className='general-cards-single-row' style={{
                                            width: '100%', justifyContent: 'space-between'
                                        }}>
                                            <div className='general-cards-single-row'>

                                                <span className={'module--title'} style={{ width: 'auto', }}
                                                >Imagenes</span>


                                            </div>

                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px'
                                            }}>
                                                <Tooltip title="Ocultar">
                                                    <Button onClick={() => {
                                                        setHideImages(!hideImages);
                                                        handleOnImages(!hideImages);
                                                    }} id='build-cover-date-buttons' icon={!hideImages ? <LuImage tyle={{
                                                        marginTop: '2px',
                                                    }} /> : <LuImageOff style={{
                                                        marginTop: '2px',
                                                    }} />}>
                                                        {!hideImages ? 'Mostrar' : 'Ocultar'}
                                                    </Button>
                                                </Tooltip>


                                                {
                                                    invitation.dresscode.images_active &&
                                                    <Button
                                                        onClick={() => setInvitation(prevInvitation => ({
                                                            ...prevInvitation,
                                                            dresscode: {
                                                                ...prevInvitation.dresscode,  // Asegúrate de copiar correctamente dresscode
                                                                dev: [...prevInvitation.dresscode.dev, ''],  // Agregar la nueva URL al array de imágenes
                                                            },
                                                        }))}
                                                        className='primarybutton--active'
                                                        // onClick={addNewLink}
                                                        icon={<IoMdAdd size={14} />}>
                                                        Nueva
                                                    </Button>
                                                }
                                            </div>





                                        </div>

                                        {
                                            invitation.dresscode.images_active &&
                                                invitation.dresscode.dev.length > 0 ?
                                                invitation.dresscode.dev.map((item, index) => (
                                                    <div style={{
                                                        width: '100%', borderRadius: '8px', border: '1px solid #D9D9D9',
                                                        backgroundColor: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                                                        position: 'relative', height: '70px', overflow: 'hidden', padding: '8px'
                                                    }}>


                                                        <img alt='' src={item} style={{
                                                            width: '400px', height: '40vh', objectFit: 'cover', position: 'absolute',
                                                            right: 0
                                                        }} />

                                                        <StorageImages placement={'right'} absolute={true} isNull={true} invitationID={invitationID} handleImage={handleURL} />

                                                </div>
                                                ))
                                                : <Empty description={false} style={{
                                                    marginTop: '30px', marginLeft: '20%'
                                                }} />

                                        }

                                    </div>
                                </>
                                : <div style={{
                                    width: '100%', height: '300px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}><TbEyeClosed size={32} style={{ color: '#717171' }} /></div>


                        }













                    </div >

                    : <></>
            }

            <HelpDrawer visible={visible} setVisible={setVisible} type={type} setType={setType} />
        </>
    )
}
