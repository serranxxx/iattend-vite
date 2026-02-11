import { Button, Col, ColorPicker, DatePicker, Dropdown, Input, Row, Select, Slider, Tooltip } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import ios_settings from '../../../../assets/images/iphone-settings.svg'
import Countdown from '../../../../components/Invitation/CountDown';
import { FaMinus, FaPlus } from 'react-icons/fa';
import { StorageImages } from '../../../../components/ImagesStorage/StorageImages';
import { colorFactoryToHex, darker, formatDateToISO, lighter } from '../../../../helpers/assets/functions';
import { fonts } from '../../../../helpers/assets/fonts';
import { LuRuler, LuSettings2 } from 'react-icons/lu';
import { BiHide, BiShow } from 'react-icons/bi';
import { TbArrowsMove } from 'react-icons/tb';
import { PiAlignCenterHorizontal, PiAlignCenterVertical, PiAlignCenterVerticalSimple } from 'react-icons/pi';
import { IoClose } from 'react-icons/io5';



dayjs.extend(utc);
dayjs.extend(timezone);

const { Option } = Select;





export const BuildCover = ({ invitation, setInvitation, setSaved, invitationID, setSettingsModal, settingsModal }) => {


    const coordenadas = [
        {
            justify: 'left',
            align: 'flex-start',
            active: null,
            text: 'Superior izquierda'
        },
        {
            justify: 'center',
            align: 'flex-start',
            active: null,
            text: 'Superior centro'
        },
        {
            justify: 'right',
            align: 'flex-start',
            active: null,
            text: 'Superior derecha'
        },
        {
            justify: 'left',
            align: 'center',
            active: null,
            text: 'Centro izquierda'
        },
        {
            justify: 'center',
            align: 'center',
            active: null,
            text: 'Centro'
        },
        {
            justify: 'right',
            align: 'center',
            active: null,
            text: 'Centro derecha'
        },
        {
            justify: 'left',
            align: 'flex-end',
            active: null,
            text: 'Inferior izquierda'
        },
        {
            justify: 'center',
            align: 'flex-end',
            active: null,
            text: 'Inferior centro'
        },
        {
            justify: 'right',
            align: 'flex-end',
            active: null,
            text: 'Inferior derecha'
        },
    ]

    const [position] = useState(coordenadas)
    const [datePosition, setDatePosition] = useState(true)
    const [itemAlign, setitemAlign] = useState('')
    const [itemJustify, setitemJustify] = useState('')
    const [zoom] = useState(1);
    const [onSettings, setOnSettings] = useState(false)
    const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });
    const [zoomLevel, setZoomLevel] = useState(1);
    const [ruleLines, setRuleLines] = useState(true)
    const [presets, setPresets] = useState(null)

    const mapContainerRef = useRef(null);
    const zoomStep = 0.01;
    const minZoom = 0.1;
    const maxZoom = 3;

    useEffect(() => {
        if (invitation) {
            setitemAlign(invitation.cover.title.position?.align_y)
            setitemJustify(invitation.cover.title.position?.align_x)
            if (invitation.cover.title.position?.column_reverse === 'column') {
                setDatePosition(true)
            } else setDatePosition(false)
        }
    }, [invitation])


    const onIsDate = (e) => {

        setSaved(false)
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            cover: {
                ...prevInvitation.cover,
                date: {
                    ...prevInvitation.cover.date,
                    active: e
                }
            },
        }));
    }

    const onChangeDate = (e) => {

        setSaved(false)
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            cover: {
                ...prevInvitation.cover,
                date: {
                    ...prevInvitation.cover.date,
                    value: formatDateToISO(e)
                }
            },
        }));
    }


    const handlePosition = (x, y) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            cover: {
                ...prevInvitation.cover,
                title: {
                    ...prevInvitation.cover.title,
                    position: {
                        ...prevInvitation.cover.title.position,
                        align_x: x,
                        align_y: y
                    }
                }
            },
        }));
        setSaved(false)
    }

    const handleFlexDirection = (value) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            cover: {
                ...prevInvitation.cover,
                title: {
                    ...prevInvitation.cover.title,
                    position: {
                        ...prevInvitation.cover.title.position,
                        column_reverse: value ? 'column' : 'column-reverse'
                    }
                }
            },
        }));
        setSaved(false)
    }

    const onChangeTitle = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            cover: {
                ...prevInvitation.cover,
                title: {
                    ...prevInvitation.cover.title,
                    text: {
                        ...prevInvitation.cover.title.text,
                        value: e.target.value
                    }
                }
            },
        }));
        setSaved(false)
    }

    const handleFont = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            cover: {
                ...prevInvitation.cover,
                title: {
                    ...prevInvitation.cover.title,
                    text: {
                        ...prevInvitation.cover.title.text,
                        typeFace: e
                    }
                }
            },
        }));
        setSaved(false)
        // setFont(e)
    }

    const onChnageTitleColor = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            cover: {
                ...prevInvitation.cover,
                title: {
                    ...prevInvitation.cover.title,
                    text: {
                        ...prevInvitation.cover.title.text,
                        color: colorFactoryToHex(e)
                    }
                }
            },
        }));
        setSaved(false)
    };

    const onChnageTimerColor = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            cover: {
                ...prevInvitation.cover,
                date: {
                    ...prevInvitation.cover.date,
                    color: colorFactoryToHex(e)
                }
            },
        }));
        setSaved(false)
    };

    const onChangeCover = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            cover: {
                ...prevInvitation.cover,
                image: {
                    ...prevInvitation.cover.image,
                    dev: e
                }
            },
        }));
        setSaved(false)
    };

    const startDrag = (event) => {
        setIsDragging(true);
        setLastMousePosition({ x: event.clientX, y: event.clientY });
    };

    const drag = (event) => {
        if (isDragging) {
            const deltaX = event.clientX - lastMousePosition.x;
            const deltaY = event.clientY - lastMousePosition.y;

            setMapPosition((prevPosition) => {
                // Definir límites
                const minX = -550;
                const maxX = 550; // Ancho máximo del contenedor
                const minY = -500;
                const maxY = 150; // Altura máxima del contenedor

                // Calcular nueva posición con límites
                const newX = Math.min(Math.max(prevPosition.x + deltaX, minX), maxX);
                const newY = Math.min(Math.max(prevPosition.y + deltaY, minY), maxY);

                return { x: newX, y: newY };
            });

            setLastMousePosition({ x: event.clientX, y: event.clientY });
        }
    };

    const stopDrag = () => {
        setIsDragging(false);
    };

    const resetPositions = () => {
        setMapPosition({ x: 0, y: 0 })
        setZoomLevel(1)
    }

    useEffect(() => {
        setSaved(false)
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            cover: {
                ...prevInvitation.cover,
                image: {
                    ...prevInvitation.cover.image,
                    position: mapPosition,
                }
            },
        }));
    }, [mapPosition])

    useEffect(() => {
        setSaved(false)
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            cover: {
                ...prevInvitation.cover,
                image: {
                    ...prevInvitation.cover.image,
                    zoom: zoomLevel,
                }
            },
        }));
    }, [zoomLevel])


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


    return (


        invitation ?
            <>
                {
                    <div className='scroll-item generals-main-container' >
                        <div className='build-component-elements'>
                            <span className={'module--title'}
                                style={{
                                    width: '100%',
                                }}
                            >Portada</span>
                            <span className='gc-content-label'>Título</span>

                            <div className='general-cards-single-row' style={{ width: '100%', gap: '4px' }}>
                                <Input
                                    placeholder={'Título'}
                                    value={invitation.cover.title.text?.value}
                                    onChange={onChangeTitle}
                                    className='gc-input-text' />
                                <Tooltip color='var(--text-color)' title="Ajustes de título">
                                    <Dropdown
                                        trigger={['click']}
                                        placement='bottomLeft'
                                        popupRender={() => (
                                            <div className='generals-settings-popup'>

                                                <span className='gc-content-label'>Tipo de letra</span>

                                                <Select

                                                    value={invitation.cover.title.text?.typeFace}
                                                    onChange={(e) => handleFont(e)}
                                                    style={{ width: '100%', fontFamily: invitation.cover.title.text?.typeFace }}>
                                                    {fonts.map((font, index) => (
                                                        <Option style={{ fontFamily: `${font}` }} key={index} value={font}>{font}</Option>
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
                                                        max={96}
                                                        step={2}
                                                        onChange={(e) => setInvitation(prevInvitation => ({
                                                            ...prevInvitation,
                                                            cover: {
                                                                ...prevInvitation.cover,
                                                                title: {
                                                                    ...prevInvitation.cover.title,
                                                                    text: {
                                                                        ...prevInvitation.cover.title.text,
                                                                        size: e
                                                                    }

                                                                }
                                                            },
                                                        }))}
                                                        // onChange={onChange}
                                                        value={invitation.cover.title.text?.size}
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
                                                                    cover: {
                                                                        ...prevInvitation.cover,
                                                                        title: {
                                                                            ...prevInvitation.cover.title,
                                                                            text: {
                                                                                ...prevInvitation.cover.title.text,
                                                                                opacity: e
                                                                            }

                                                                        }
                                                                    },
                                                                }))}
                                                                // onChange={onChange}
                                                                value={invitation.cover.title.text?.opacity}
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
                                                                    cover: {
                                                                        ...prevInvitation.cover,
                                                                        title: {
                                                                            ...prevInvitation.cover.title,
                                                                            text: {
                                                                                ...prevInvitation.cover.title.text,
                                                                                weight: e
                                                                            }

                                                                        }
                                                                    },
                                                                }))}

                                                                value={invitation.cover.title.text?.weight}
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
                                                    <span>{invitation.cover.title.text?.color}</span>
                                                    <div className='general-cards-single-row'>
                                                        <ColorPicker
                                                            presets={presets}
                                                            disabledAlpha={false}
                                                            value={invitation.cover.title.text?.color}
                                                            style={{ width: '80px' }}
                                                            onChangeComplete={(e) => onChnageTitleColor(e)}>
                                                        </ColorPicker>
                                                    </div>

                                                </div>

                                            </div>
                                        )}
                                    >
                                        <Button
                                            type='ghost'
                                            style={{ minWidth: '32px', maxWidth: '32px' }}
                                            onClick={() => setOnSettings(!onSettings)}
                                            className={`primarybutton${onSettings ? '--active' : ''}`}
                                            icon={<LuSettings2 size={16} />} />
                                    </Dropdown>

                                </Tooltip>
                            </div>



                            <span className='gc-content-label'>Posición</span>

                            <div className='gc-position-container'>

                                {
                                    position.map((item, index) => (
                                        <div
                                            key={index}
                                            onClick={() => handlePosition(item.justify, item.align)}
                                            className='gc-position-item'>


                                            {
                                                item.justify === itemJustify && item.align === itemAlign ?
                                                    <div
                                                        className='gc-position-selected-container '
                                                        style={{
                                                            alignItems: itemJustify === 'left' ? 'flex-start' : itemJustify === 'right' ? 'flex-end' : 'center',
                                                        }}>

                                                        <div
                                                            className='gc-position-selected-item'
                                                            style={{
                                                                width: '70%'
                                                            }} />
                                                        <div
                                                            className='gc-position-selected-item'
                                                            style={{
                                                                width: '100%',
                                                                margin: '3px 0',
                                                            }} />
                                                        <div
                                                            className='gc-position-selected-item'
                                                            style={{
                                                                width: '30%',
                                                            }} />



                                                    </div>

                                                    : <div style={{
                                                        height: '5px', aspectRatio: '1', borderRadius: '50%',
                                                        backgroundColor: '#d9d9d9'
                                                    }} />


                                            }

                                        </div>
                                    ))
                                }

                            </div>






                        </div>

                        <div className='build-component-elements'>
                            <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>

                                <span className={'module--title'}
                                >Fecha</span>

                                <div className='general-cards-single-row' style={{ gap: '6px' }}>

                                    {
                                        invitation.cover.date.active &&
                                        <Button
                                            onClick={() => handleFlexDirection(!datePosition)}
                                            id={datePosition ? "build-cover-date-buttons" : "build-cover-date-buttons--active"}>Invertir</Button>
                                    }


                                    <Tooltip color='var(--brand-color-900)' title={invitation.cover.date.active ? 'Ocultar fecha' : 'Mostrar fecha'}>
                                        <Button
                                            onClick={() => onIsDate(!invitation.cover.date.active)}
                                            icon={!invitation.cover.date.active ? <BiHide /> : <BiShow />}
                                            id={invitation.cover.date.active ? "build-cover-date-buttons" : "build-cover-date-buttons--active"} />
                                    </Tooltip>

                                </div>


                            </div>





                            <span className='gc-content-label'>Fecha del evento</span>

                            <DatePicker
                                className='gc-date-picker'
                                style={{
                                    marginBottom: datePosition ? '0px' : '5px',
                                }}
                                onChange={onChangeDate}
                                value={invitation.cover.date.value ? dayjs(invitation.cover.date.value.split('T')[0]) : null}
                            />

                            {
                                invitation.cover.date.active &&
                                <>
                                    <Row style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        flexDirection: 'row', width: '100%'
                                    }}>
                                        <span className='gc-content-label'>Color</span>
                                    </Row>

                                    <div className='generl-card-color-item'>
                                        <span>{invitation.cover.date.color ?? invitation.cover.title.text.color}</span>
                                        <div className='general-cards-single-row'>
                                            <ColorPicker
                                                presets={presets}
                                                disabledAlpha={false}
                                                value={invitation.cover.date.color ?? invitation.cover.title.text.color}
                                                style={{ width: '80px' }}
                                                onChangeComplete={(e) => onChnageTimerColor(e)}>
                                            </ColorPicker>
                                        </div>

                                    </div>
                                </>
                            }






                        </div>

                        <div className='build-component-elements'>

                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch'
                            }}>
                                <span className={'module--title'}
                                >Imagen</span>

                                {
                                    invitation.cover.image.dev &&
                                    <Button
                                        onClick={() => setSettingsModal(true)}
                                        icon={<TbArrowsMove />} className='primarybutton'>Editar posición</Button>
                                }


                            </div>

                            <div className='gc-edit-featured-container' style={{ position: 'relative' }}>

                                <img alt='' src={invitation.cover.image.dev}
                                    style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})` }}
                                />

                                <StorageImages absolute={true} invitationID={invitationID} handleImage={onChangeCover}/>

                               

                            </div>

                            <Button
                                style={{
                                    border: invitation.cover.image.background && '2px solid var(--brand-color-500)',
                                    backgroundColor: invitation.cover.image.background && 'var(--brand-color-100)',
                                    alignSelf: 'stretch'
                                }}
                                className={`primarybutton`}
                                onClick={() => setInvitation(prevInvitation => ({
                                    ...prevInvitation,
                                    cover: {
                                        ...prevInvitation.cover,
                                        image: {
                                            ...prevInvitation.cover.image,
                                            background: true,
                                            blur: false,
                                        }
                                    },
                                }))}>
                                Activar sombra
                            </Button>

                            <Button
                                style={{
                                    border: invitation.cover.image.blur && '2px solid var(--brand-color-500)',
                                    backgroundColor: invitation.cover.image.blur && 'var(--brand-color-100)',
                                    alignSelf: 'stretch'
                                }}
                                className={`primarybutton`}
                                onClick={() => setInvitation(prevInvitation => ({
                                    ...prevInvitation,
                                    cover: {
                                        ...prevInvitation.cover,
                                        image: {
                                            ...prevInvitation.cover.image,
                                            background: false,
                                            blur: true,
                                        }
                                    },
                                }))}>
                                Aplicar desenfoque
                            </Button>

                            <Button
                                style={{
                                    border: !invitation.cover.image.background && !invitation.cover.image.blur && '2px solid var(--brand-color-500)',
                                    backgroundColor: !invitation.cover.image.backgroun && !invitation.cover.image.blur && 'var(--brand-color-100)',
                                    alignSelf: 'stretch'
                                }}
                                className={`primarybutton`}
                                onClick={() => setInvitation(prevInvitation => ({
                                    ...prevInvitation,
                                    cover: {
                                        ...prevInvitation.cover,
                                        image: {
                                            ...prevInvitation.cover.image,
                                            background: false,
                                            blur: false,
                                        }
                                    },
                                }))}>
                                Quitar efectos
                            </Button>



                        </div>



                    </div >
                }

                {
                    settingsModal &&
                    <div style={{
                    }} className='adjust-image-modal-main-cont'>

                        <div className='adj-cover-cont'>


                            <div
                                style={{ transform: `scale(0.8)` }}
                                className={`inv-device-main-container-ios`}>
                                <div className={`device-buttons-container-ios`}>
                                    <div className={`device-button-ios`} />
                                    <div className={`device-button-ios`} />
                                    <div className={`device-button-ios`} />
                                </div>
                                <div className={`device-power-button-ios`} />
                                <div className={`inv-device-container-ios`}>

                                    <div className={`inv-black-space-ios`}>
                                        <span>5:15</span>
                                        <div className={`camera-ios`} />
                                        <div>
                                            <img alt='' src={ios_settings} style={{
                                                height: '100%', objectFit: 'cover'
                                            }} />
                                        </div>
                                    </div>

                                    <div
                                        className={`ios-invitation inv-set-position grid-guides`}
                                        style={{
                                            background: invitation.generals.colors.primary,
                                        }}
                                    >

                                        <div
                                            onMouseDown={startDrag}
                                            onMouseMove={drag}
                                            onMouseUp={stopDrag}
                                            onMouseLeave={stopDrag}
                                            ref={mapContainerRef}
                                            style={{
                                                top: `${invitation.cover.image.position.y}px`,
                                                left: `${invitation.cover.image.position.x}px`,
                                                transform: `scale(${invitation.cover.image.zoom})`,
                                                zIndex: 3
                                            }}
                                            className='adj-image-container'>
                                            <img alt=''
                                                src={invitation.cover.image.dev}
                                            />
                                            <div style={{
                                                position: 'absolute', width: '100%', height: '100%', top: '0px', left: '0px',
                                                background: `linear-gradient(to top, ${darker(invitation.generals.colors?.primary, 0.2)}, rgba(0,0,0,0))`
                                            }}></div>


                                        </div>
                                        <div className='background-cover'
                                            style={{
                                                flexDirection: invitation.cover.title.position?.column_reverse,
                                                pointerEvents: 'none',
                                                zIndex: 3
                                            }}>



                                            <div className='cover--title-container' style={{
                                                alignItems: invitation.cover.title.position?.align_y, height: invitation.cover.date?.active ? '75%' : '100%',
                                                padding: invitation.cover.date ? 0 : '10px',

                                            }}>
                                                <span style={{
                                                    color: invitation.cover.title.text.color, width: '100%',
                                                    textAlign: invitation.cover.title.position.align_x, fontSize: `${invitation.cover.title.text.size}px`, wordBreak: 'break-word',
                                                    opacity: invitation.cover.title.text.opacity, fontFamily: invitation.cover.title.text.typeFace, fontWeight: invitation.cover.title.text.weight,
                                                    lineHeight: '1'
                                                }}>{invitation.cover.title.text.value}</span>
                                            </div>

                                            {
                                                invitation.cover.date.active && (
                                                    <div style={{
                                                        width: '100%',
                                                        backgroundColor: `transparent`,

                                                        height: '25%', marginTop: '10px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>

                                                        <Countdown mainColor={invitation.cover.title.text.color} color={invitation.cover.date.color} colorcolors={invitation.generals.colors} targetDate={invitation.cover.date.value} theme={true} font={invitation.generals.fonts.body.typeFace} fontWeight={invitation.cover.title.text.weight} dev={true} />

                                                    </div>
                                                )
                                            }



                                        </div>

                                        {
                                            ruleLines &&
                                            <div className="guides-container">
                                                <div style={{ background: `${invitation.generals.colors.actions}80` }} className="line vertical center"></div>
                                                <div style={{ background: `${invitation.generals.colors.actions}80` }} className="line horizontal center"></div>
                                                <div style={{ background: `${invitation.generals.colors.actions}80` }} className="line vertical left-quarter"></div>
                                                <div style={{ background: `${invitation.generals.colors.actions}80` }} className="line vertical right-quarter"></div>
                                                <div style={{ background: `${invitation.generals.colors.actions}80` }} className="line horizontal top-quarter"></div>
                                                <div style={{ background: `${invitation.generals.colors.actions}80` }} className="line horizontal bottom-quarter"></div>
                                            </div>
                                        }

                                    </div>
                                    <div className={`inv-light-space-ios`} />
                                </div>
                            </div>

                            <div className='adj-image-tools-container'>

                                <Button
                                    id="expandedbutton"
                                    className={`full-screen-button${ruleLines ? '--active' : ''}`}
                                    onClick={() => setRuleLines(!ruleLines)}
                                    icon={<LuRuler size={20} />}
                                    style={{ backgroundColor: 'var(--ft-color)' }}
                                />


                                <div className='slider-container-adj-image' >
                                    <FaPlus size={12} />
                                    <Slider
                                        vertical
                                        min={minZoom}
                                        max={maxZoom}
                                        step={zoomStep}
                                        onChange={(e) => setZoomLevel(e)}
                                        value={zoomLevel}
                                        style={{ flex: 1 }}
                                    />
                                    <FaMinus size={12} />
                                </div>

                                <Button
                                    id="expandedbutton"
                                    className={`full-screen-button`}
                                    onClick={resetPositions}
                                    icon={<PiAlignCenterVerticalSimple size={20} />}
                                    style={{ backgroundColor: 'var(--ft-color)' }}
                                />

                                <Button
                                    id="expandedbutton"
                                    className={`full-screen-button`}
                                    onClick={() => setMapPosition({ x: 0, y: mapPosition.y })}
                                    icon={<PiAlignCenterHorizontal size={20} />}
                                    style={{ backgroundColor: 'var(--ft-color)' }}
                                />

                                <Button
                                    id="expandedbutton"
                                    className={`full-screen-button`}
                                    onClick={() => setMapPosition({ x: mapPosition.x, y: 0 })}
                                    icon={<PiAlignCenterVertical size={20} />}
                                    style={{ backgroundColor: 'var(--ft-color)' }}
                                />



                            </div>

                            <Button
                                type='ghost'
                                // id="expandedbutton"
                                // className='full-screen-button'
                                onClick={() => setSettingsModal(false)}
                                icon={<IoClose size={20} />}
                                style={{ position: 'absolute', top: '15px', right: '15px' }}
                            />
                        </div>

                    </div>
                }


            </>


            : <></>



    )
}






