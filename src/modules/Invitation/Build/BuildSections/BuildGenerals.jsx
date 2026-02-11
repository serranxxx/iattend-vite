import { Button, Col, ColorPicker, Dropdown, Row, Select, Slider, } from 'antd'
import React, { useEffect, useState } from 'react'
import { Separador } from '../../../../components/Invitation/Logos';
import { HelpDrawer } from '../../../../components/Helpers/HelpDrawer';
import { textures } from '../../../../helpers/services/textures';
import { RxValueNone } from 'react-icons/rx';
import { LuArrowBigDownDash, LuArrowBigUpDash, LuRedo2, LuRotateCcw, LuSettings2 } from 'react-icons/lu';
import { colorFactoryToHex, darker, lighter } from '../../../../helpers/assets/functions';
import { fonts } from '../../../../helpers/assets/fonts';


const { Option } = Select;



export const BuildGenerals = ({ invitation, setInvitation, setSaved }) => {

    const [currentPosition, setCurrentPosition] = useState(null)
    const [currentItem, setCurrentItem] = useState(null)
    const [visible, setVisible] = useState(false)
    const [type, setType] = useState(null)
    const [presets, setPresets] = useState(null)

    useEffect(() => {
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

        setPresets(presetColors)
    }, [])

    const handleClick = (item, index) => {
        setCurrentItem((prev) => prev === item ? null : item)
        setCurrentPosition(index)
    }
    const moveUp = (positions, index) => {
        if (index <= 0 || index >= positions.length) {
            // Si el índice está en el límite del arreglo, no hay nada que mover hacia arriba
            return positions;
        }

        const newPositions = [...positions];
        // Intercambiamos el elemento en el índice con el elemento en el índice anterior
        [newPositions[index], newPositions[index - 1]] = [newPositions[index - 1], newPositions[index]];
        return newPositions;
    }
    // Función para mover un elemento hacia abajo en el arreglo positions
    const moveDown = (positions, index) => {
        if (index < 0 || index >= positions.length - 1) {
            // Si el índice está en el límite del arreglo, no hay nada que mover hacia abajo
            return positions;
        }

        const newPositions = [...positions];
        // Intercambiamos el elemento en el índice con el elemento en el índice siguiente
        [newPositions[index], newPositions[index + 1]] = [newPositions[index + 1], newPositions[index]];
        return newPositions;
    }

    const onChangePrimary = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                colors: {
                    ...prevInvitation.generals.colors,
                    primary: colorFactoryToHex(e)
                }
            },
        }));
        setSaved(false);
    };

    const onChangeSecondary = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                colors: {
                    ...prevInvitation.generals.colors,
                    secondary: colorFactoryToHex(e)
                }
            },
        }));
        setSaved(false);
    };

    const onChangeAccent = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                colors: {
                    ...prevInvitation.generals.colors,
                    accent: colorFactoryToHex(e)
                }
            },
        }));
        setSaved(false);
    };

    const onChangeButtons = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                colors: {
                    ...prevInvitation.generals.colors,
                    actions: colorFactoryToHex(e)
                }
            },
        }));
        setSaved(false);
    };

    const handleFont = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                fonts: {
                    ...prevInvitation.generals.fonts,
                    body: {
                        ...prevInvitation.generals.fonts.body,
                        typeFace: e
                    }
                }
            },
        }));
        setSaved(false)
        // setFont(e)
    }

    const handleTitle = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                fonts: {
                    ...prevInvitation.generals.fonts,
                    titles: {
                        ...prevInvitation.generals.fonts.titles,
                        typeFace: e
                    }
                }
            },
        }));
        setSaved(false)
        // setFont(e)
    }


    const handleNamePosition = (position) => {
        switch (position) {
            case 1: return 'Saludo'
            case 2: return 'Personas'
            case 3: return 'Cita'
            case 4: return 'Itinerario'
            case 5: return 'Dresscode'
            case 6: return 'Regalos'
            case 7: return 'Destinos'
            case 8: return 'Avisos'
            case 9: return 'Galería'
            default:
                break;
        }
    }

    const isEneablePosition = (position) => {
        switch (position) {
            case 1: return invitation.greeting.active
            case 2: return invitation.people.active
            case 3: return invitation.quote.active
            case 4: return invitation.itinerary.active
            case 5: return invitation.dresscode.active
            case 6: return invitation.gifts.active
            case 7: return invitation.destinations.active
            case 8: return invitation.notices.active
            case 9: return invitation.gallery.active
            default:
                break;
        }
    }

    const restartPositions = () => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                positions: [1, 2, 3, 4, 5, 6, 7, 8, 9]
            }
        }));
        setCurrentItem(null)
        setCurrentPosition(null)
        setSaved(false)

    }

    const moveUpPosition = (index) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                positions: moveUp(prevInvitation.generals.positions, index)
            }
        }));
        // setCurrentItem(null)
        setSaved(false)
        setCurrentPosition(currentPosition - 1)

    }

    const moveDownPosition = (index) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                positions: moveDown(prevInvitation.generals.positions, index)
            }
        }));
        // setCurrentItem(null)
        setSaved(false)
        setCurrentPosition(currentPosition + 1)
    }

    const handleSeparator = (new_separator) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                separator: new_separator
            }
        }));
        // setCurrentItem(null)
        setSaved(false)
    }

    const handleTexture = (new_texture) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                texture: new_texture
            }
        }));
        setSaved(false)
    }

    const onChnageTitleColor = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            generals: {
                ...prevInvitation.generals,
                fonts: {
                    ...prevInvitation.generals.fonts,
                    titles: {
                        ...prevInvitation.generals.fonts.titles,
                        color: colorFactoryToHex(e)
                    }
                }
            },
        }));
        setSaved(false)
    };

    return (
        <>
            {
                invitation ?
                    <div
                        className='generals-main-container'>


                        <div className='build-component-elements'>
                            <span className={'module--title'}
                            >Ajustes Generales</span>

                            <div className='single_row'>
                                <div className='single_col' style={{ flex: 1 }}>



                                    <Dropdown
                                        trigger={['click']}
                                        placement='bottomRight'
                                        popupRender={() => (
                                            <div className='generals-settings-popup'>

                                                <span className='gc-content-label'>Tipo de letra</span>

                                                <Select

                                                    value={invitation?.generals?.fonts?.titles?.typeFace ?? invitation?.generals?.fonts?.body?.typeFace}
                                                    onChange={(e) => handleTitle(e)}
                                                    style={{ width: '100%' }}>
                                                    {fonts.map((font, index) => (
                                                        <Option key={index} value={font}><span style={{ fontFamily: font }} >{font}</span></Option>
                                                    ))}

                                                </Select>

                                                <Col style={{
                                                    width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column',
                                                    marginTop: '10px'
                                                }}>
                                                    <span className='gc-content-label'>Tamaño</span>

                                                    <Slider
                                                        style={{ width: '95%', }}
                                                        min={8}
                                                        max={36}
                                                        step={2}
                                                        onChange={(e) => setInvitation(prevInvitation => ({
                                                            ...prevInvitation,
                                                            generals: {
                                                                ...prevInvitation.generals,
                                                                fonts: {
                                                                    ...prevInvitation.generals.fonts,
                                                                    titles: {
                                                                        ...prevInvitation.generals.fonts.titles,
                                                                        size: e
                                                                    }

                                                                }
                                                            },
                                                        }))}
                                                        // onChange={onChange}
                                                        value={invitation.generals.fonts.titles?.size === 0 ? 18 : (invitation.generals.fonts.titles?.size ?? 18)}
                                                    />

                                                    <Row style={{
                                                        width: '100%', display: 'flex', alignItems: 'center',
                                                        justifyContent: 'space-between', flexDirection: 'row'
                                                    }}>
                                                        <Col style={{
                                                            width: '48%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column'
                                                        }}>

                                                            <span className='gc-content-label'>Opacidad</span>


                                                            <Slider
                                                                style={{ width: '95%' }}
                                                                min={0.1}
                                                                max={1}
                                                                step={0.01}
                                                                onChange={(e) => setInvitation(prevInvitation => ({
                                                                    ...prevInvitation,
                                                                    generals: {
                                                                        ...prevInvitation.generals,
                                                                        fonts: {
                                                                            ...prevInvitation.generals.fonts,
                                                                            titles: {
                                                                                ...prevInvitation.generals.fonts.titles,
                                                                                opacity: e
                                                                            }

                                                                        }
                                                                    },
                                                                }))}
                                                                // onChange={onChange}
                                                                value={invitation.generals.fonts.titles?.opacity ?? 1}
                                                            />

                                                        </Col>

                                                        <Col style={{
                                                            width: '48%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column'
                                                        }}>
                                                            <span className='gc-content-label'>Grosor</span>



                                                            <Slider
                                                                style={{ width: '95%' }}
                                                                min={100}
                                                                max={1000}
                                                                step={100}

                                                                onChange={(e) => setInvitation(prevInvitation => ({
                                                                    ...prevInvitation,
                                                                    generals: {
                                                                        ...prevInvitation.generals,
                                                                        fonts: {
                                                                            ...prevInvitation.generals.fonts,
                                                                            titles: {
                                                                                ...prevInvitation.generals.fonts.titles,
                                                                                weight: e
                                                                            }

                                                                        }
                                                                    },
                                                                }))}

                                                                value={invitation.generals.fonts.titles?.weight === 0 ? 600 : (invitation.generals.fonts.titles?.weight ?? 600)}
                                                            />

                                                        </Col>
                                                    </Row>
                                                </Col>

                                                <Row style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    flexDirection: 'row', width: '100%'
                                                }}>
                                                    <span className='gc-content-label'>Color</span>


                                                </Row>

                                                <div className='generl-card-color-item'>
                                                    <span>{invitation.generals.fonts.titles?.color}</span>
                                                    <div className='general-cards-single-row'>
                                                        <ColorPicker
                                                            presets={presets}
                                                            disabledAlpha={false}
                                                            value={invitation.generals.fonts.titles?.color === '#000000' ? invitation.generals.colors.accent : (invitation.generals.fonts.titles?.color ?? invitation.generals.colors.accent)}
                                                            style={{ width: '80px' }}
                                                            onChangeComplete={(e) => onChnageTitleColor(e)}>
                                                        </ColorPicker>
                                                    </div>

                                                </div>

                                            </div>
                                        )}
                                    >
                                        <div className='single_row' style={{ alignSelf: 'stretch', justifyContent: 'space-between', border: '1px solid #EBEBEB', padding: '8px', borderRadius: '99px', paddingLeft: '12px' }}>
                                            <span style={{
                                                fontFamily: invitation?.generals?.fonts.titles?.typeFace ?? invitation?.generals?.fonts.body?.typeFace,
                                                fontWeight: invitation?.generals?.fonts.titles?.weight ?? 600,
                                                opacity: invitation?.generals?.fonts.titles?.opacity ?? 1,
                                                color: invitation?.generals?.fonts.titles?.color ?? invitation?.generals?.colors.accent

                                            }}>Títulos</span>
                                            <Button
                                                type='ghost'
                                                style={{ minWidth: '24px', maxWidth: '24px', maxHeight: '24px' }}
                                                className="primarybutton"
                                                icon={<LuSettings2 size={12} />} />
                                        </div>
                                    </Dropdown>

                                </div>

                                <div className='single_col' style={{ flex: 1 }}>
                                    <Dropdown
                                        trigger={['click']}
                                        placement='bottomRight'
                                        popupRender={() => (
                                            <div className='generals-settings-popup'>

                                                <span className='gc-content-label'>Tipo de letra</span>

                                                <Select

                                                    value={invitation?.generals?.fonts.body?.typeFace}
                                                    onChange={(e) => handleFont(e)}
                                                    style={{ width: '100%' }}>
                                                    {fonts.map((font, index) => (
                                                        <Option key={index} value={font}><span style={{ fontFamily: font }} >{font}</span></Option>
                                                    ))}

                                                </Select>

                                                <Col style={{
                                                    width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column',
                                                    marginTop: '10px'
                                                }}>
                                                    {/* <span className='gc-content-label'>Tamaño</span>

                                                    <Slider
                                                        style={{ width: '95%', }}
                                                        min={8}
                                                        max={18}
                                                        step={2}
                                                        onChange={(e) => setInvitation(prevInvitation => ({
                                                            ...prevInvitation,
                                                            generals: {
                                                                ...prevInvitation.generals,
                                                                fonts: {
                                                                    ...prevInvitation.generals.fonts,
                                                                    body: {
                                                                        ...prevInvitation.generals.fonts.body,
                                                                        size: e
                                                                    }

                                                                }
                                                            },
                                                        }))}
                                                        // onChange={onChange}
                                                        value={invitation.generals.fonts.body?.size}
                                                    /> */}

                                                    <Row style={{
                                                        width: '100%', display: 'flex', alignItems: 'center',
                                                        justifyContent: 'space-between', flexDirection: 'row'
                                                    }}>
                                                        <Col style={{
                                                            width: '48%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column'
                                                        }}>

                                                            <span className='gc-content-label'>Opacidad</span>


                                                            <Slider
                                                                style={{ width: '95%' }}
                                                                min={0.1}
                                                                max={1}
                                                                step={0.01}
                                                                onChange={(e) => setInvitation(prevInvitation => ({
                                                                    ...prevInvitation,
                                                                    generals: {
                                                                        ...prevInvitation.generals,
                                                                        fonts: {
                                                                            ...prevInvitation.generals.fonts,
                                                                            body: {
                                                                                ...prevInvitation.generals.fonts.body,
                                                                                opacity: e
                                                                            }

                                                                        }
                                                                    },
                                                                }))}
                                                                // onChange={onChange}
                                                                value={invitation.generals.fonts.body?.opacity ?? 1}
                                                            />

                                                        </Col>

                                                        <Col style={{
                                                            width: '48%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column'
                                                        }}>
                                                            <span className='gc-content-label'>Grosor</span>



                                                            <Slider
                                                                style={{ width: '95%' }}
                                                                min={100}
                                                                max={1000}
                                                                step={100}

                                                                onChange={(e) => setInvitation(prevInvitation => ({
                                                                    ...prevInvitation,
                                                                    generals: {
                                                                        ...prevInvitation.generals,
                                                                        fonts: {
                                                                            ...prevInvitation.generals.fonts,
                                                                            body: {
                                                                                ...prevInvitation.generals.fonts.body,
                                                                                weight: e
                                                                            }

                                                                        }
                                                                    },
                                                                }))}

                                                                value={invitation.generals.fonts.body?.weight ?? 500}
                                                            />

                                                        </Col>
                                                    </Row>
                                                </Col>

                                            </div>
                                        )}
                                    >
                                        <div className='single_row' style={{ alignSelf: 'stretch', justifyContent: 'space-between', border: '1px solid #EBEBEB', padding: '8px', borderRadius: '99px', paddingLeft: '12px' }}>
                                            <span
                                                style={{
                                                    fontFamily: invitation?.generals?.fonts.body?.typeFace,
                                                    fontWeight: invitation?.generals?.fonts.body?.weight,
                                                    opacity: invitation?.generals?.fonts.body?.opacity,
                                                }}
                                            >Cuerpo</span>
                                            <Button
                                                type='ghost'
                                                style={{ minWidth: '24px', maxWidth: '24px', maxHeight: '24px' }}
                                                className="primarybutton"
                                                icon={<LuSettings2 size={12} />} />
                                        </div>
                                    </Dropdown>

                                </div>
                            </div>






                            {/* <span>{invitation?.generals?.fonts?.body?.typeFace}</span> */}
                            <Row style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row',
                                marginTop: '10px',
                            }}>
                                <span className='gc-content-label'>Paleta de colores</span>

                            </Row>


                            <div className='single_row' style={{ gap: '0px' }}>
                                <div className='generl-card-color-item' style={{ padding: '0', border: 'none' }}>
                                    <span >Fondo</span>
                                    <div className='general-cards-single-row' >
                                        <ColorPicker
                                            value={invitation.generals.colors.primary}
                                            disabledAlpha={false}
                                            style={{ width: '60px', height: '100px', backgroundColor: invitation.generals.colors.primary }}
                                            onChangeComplete={onChangePrimary}>
                                        </ColorPicker>
                                    </div>

                                </div>
                                <div className='generl-card-color-item' style={{ padding: '0', border: 'none' }}>
                                    <span >Contrastes</span>
                                    <div className='general-cards-single-row'>
                                        <ColorPicker
                                            disabledAlpha={false}
                                            value={invitation.generals.colors.secondary}

                                            style={{ width: '60px', height: '100px', backgroundColor: invitation.generals.colors.secondary }}
                                            onChangeComplete={onChangeSecondary}>
                                        </ColorPicker>
                                    </div>

                                </div>
                                <div className='generl-card-color-item' style={{ padding: '0', border: 'none' }}>
                                    <span >Textos</span>
                                    <div className='general-cards-single-row'>
                                        <ColorPicker
                                            disabledAlpha={false}
                                            value={invitation.generals.colors.accent}
                                            style={{ width: '60px', height: '100px', backgroundColor: invitation.generals.colors.accent }}
                                            onChangeComplete={onChangeAccent}>
                                        </ColorPicker>
                                    </div>

                                </div>
                                <div className='generl-card-color-item' style={{ padding: '0', border: 'none' }}>
                                    <span >Acentos</span>
                                    <div className='general-cards-single-row'>
                                        <ColorPicker
                                            disabledAlpha={false}
                                            value={invitation.generals.colors.actions}
                                            style={{ width: '60px', height: '100px', backgroundColor: invitation.generals.colors.actions }}
                                            onChangeComplete={onChangeButtons}>
                                        </ColorPicker>
                                    </div>

                                </div>
                            </div>




                        </div>



                        <div className='build-component-elements'>


                            <Row className='gc-cta-buttons-container edit-position-controller' style={{
                                justifyContent: 'space-between', width: '100%', marginBottom: '8px'
                            }}>

                                <span style={{ width: 'auto' }} className={'gc-content-label'}
                                >Estructura</span>

                                <div className='general-cards-single-row' style={{ width: 'auto' }}>

                                    <Button
                                        className='primarybutton'
                                        onClick={restartPositions}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        icon={<LuRotateCcw />}>

                                    </Button>

                                    <Button
                                        onClick={() => moveUpPosition(currentPosition)}
                                        icon={<LuArrowBigUpDash size={16} />}
                                        className={`primarybutton${currentItem ? "--active" : ''}`}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    // style={{ margin: '0px 5px' }}
                                    ></Button>

                                    <Button
                                        onClick={() => moveDownPosition(currentPosition)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        icon={<LuArrowBigDownDash size={16} />}
                                        className={`primarybutton${currentItem ? "--active" : ''}`} />
                                </div>



                            </Row>

                            <div className='build-generals-simple-column' style={{ gap: '12x' }}>
                                {
                                    invitation.generals.positions.map((item, index) => (
                                        <div
                                            key={index}
                                            onClick={() => handleClick(item, index)}
                                            className={`gc-order-item${item === currentItem ? '--selected' : !isEneablePosition(item) ? '--disabled' : ''}`}>{handleNamePosition(item)}</div>
                                    ))
                                }
                            </div>



                        </div>

                        <div className='build-component-elements'>
                            <span className={'gc-content-label'}
                            >Texturas</span>
                            <div
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                                    height: '80px', borderRadius: '12px', overflow: 'hidden',
                                    border: '1px solid var(--borders)',
                                    cursor: 'pointer', position: 'relative'
                                }}>

                                {
                                    textures[invitation.generals.texture]?.image &&

                                    <img alt='' src={textures[invitation.generals.texture]?.image} style={{
                                        width: '100%', height: '100%', objectFit: 'cover'
                                    }} />
                                }


                                <Dropdown
                                    trigger={['click']}
                                    placement='right'
                                    popupRender={() => (
                                        <div className="grid-separators-container scroll-invitation" style={{
                                            gridTemplateColumns: 'repeat(3, 1fr)',
                                            backgroundColor: '#FFF', padding: '12px',
                                            borderRadius: '16px', boxShadow: '0px 0px 12px rgba(0,0,0,0.2)'
                                        }}>

                                            <div
                                                onClick={() => handleTexture(null)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                                                    height: '120px', borderRadius: '8px', overflow: 'hidden',
                                                    border: invitation.generals.texture == null ? 'px solid var(--brand-color-500)' : '1px solid var(--borders)', cursor: 'pointer'
                                                }}>

                                                <RxValueNone size={64} style={{
                                                    color: '#00000040',
                                                }} />
                                            </div>

                                            {
                                                textures.map((texture, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => handleTexture(index)}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                                                            height: '120px', borderRadius: '8px', overflow: 'hidden',
                                                            border: invitation.generals.texture === index ? '1px solid var(--brand-color-500)' : '1px solid var(--borders)',
                                                            cursor: 'pointer'
                                                        }}>
                                                        <img alt='' src={texture?.image} style={{
                                                            width: '100%', height: '100%', objectFit: 'cover'
                                                        }} />

                                                    </div>
                                                ))
                                            }

                                        </div>
                                    )}
                                >
                                    <Button
                                        icon={<LuRedo2 />}
                                        style={{
                                            position: 'absolute', bottom: '8px', right: '8px', backgroundColor: '#FFFFFF40', color: '#000', backdropFilter: 'blur(10px)',
                                            border: '1px solid #FFF'
                                        }}>
                                        Cambiar textura
                                    </Button>
                                </Dropdown>

                            </div>

                        </div>

                        <div className='build-component-elements'>
                            <span className={'gc-content-label'}
                            >Menú de separadores</span>

                            <div className="build-separator-container" style={{ width: '100%', position: 'relative', height: '140px' }}>
                                <Separador MainColor={'var(--text-color)'} build={true} dev={true} value={invitation.generals.separator}
                                />

                                <Dropdown
                                    trigger={['click']}
                                    placement='bottomRight'
                                    popupRender={() => (
                                        <div className="grid-separators-container scroll-invitation" style={{
                                            gridTemplateColumns: 'repeat(3, 1fr)',
                                            backgroundColor: '#FFF', padding: '12px',
                                            borderRadius: '16px', boxShadow: '0px 0px 12px rgba(0,0,0,0.2)'
                                        }}>

                                            {
                                                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((separator, index) => (
                                                    <div key={index} onClick={() => handleSeparator(separator)} className="build-separator-container" style={{
                                                        border: separator === invitation.generals.separator && '1px solid var(--brand-color-500)',
                                                        backgroundColor: separator === invitation.generals.separator && 'var(--sc-color)'
                                                    }}>
                                                        <Separador MainColor={'var(--text-color)'} build={true} dev={true} value={separator}
                                                        />
                                                    </div>
                                                ))
                                            }

                                        </div>
                                    )}
                                >
                                    <Button
                                        icon={<LuRedo2 />}
                                        style={{
                                            position: 'absolute', bottom: '8px', right: '8px', backgroundColor: '#FFFFFF40', color: '#000', backdropFilter: 'blur(10px)',
                                            border: '1px solid #FFF'
                                        }}>
                                        Cambiar separador
                                    </Button>
                                </Dropdown>
                            </div>


                        </div>






                    </div >
                    : <></>
            }

            <HelpDrawer visible={visible} setVisible={setVisible} type={type} setType={setType} />
        </>
    )
}


