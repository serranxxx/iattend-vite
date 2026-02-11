import { Button, Col, ColorPicker, Input, Row, Select, Slider, Switch, Tooltip, } from 'antd'
import { useEffect, useState } from 'react';
import { MdInvertColors } from 'react-icons/md';
import { StorageImages } from '../../../../components/ImagesStorage/StorageImages';
import { colorFactoryToHex, darker, lighter } from '../../../../helpers/assets/functions';
import { LuSeparatorHorizontal } from 'react-icons/lu';
import { BiSolidColorFill } from 'react-icons/bi';
import { BsStars } from 'react-icons/bs';
import { fonts } from '../../../../helpers/assets/fonts';
import { TbEyeClosed } from 'react-icons/tb';
import { quotesAI } from '../../../../helpers/services/messages'
import '../../../../styles/modules/quote.css'

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
const { Option } = Select;


export const BuildQuote = ({ invitation, setInvitation, setSaved, invitationID }) => {

    const [onButton, setOnButton] = useState(false)
    const [onGeneration, setOnGeneration] = useState(false)
    const [quoteValue, setQuoteValue] = useState(null)
    // const [textAppear, setTextAppear] = useState(false)
    const [position] = useState(coordenadas)
    const [onImageActive, setOnImageActive] = useState(false)
    const [presets, setPresets] = useState(null)

    const handlePosition = (justify, align) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            quote: {
                ...prevInvitation.quote,
                text: {
                    ...prevInvitation.quote.text,
                    justify: justify,
                    align: align
                }
            },
        }));
        setSaved(false)
    }

    const handleGenerating = () => {

        let local_quote = quotesAI.wedding[Math.floor(Math.random() * 9)]

        setQuoteValue('Generando ...');

        setTimeout(() => {
            setQuoteValue(local_quote)
        }, 4500);

        setOnGeneration(true);

        setTimeout(() => {
            setInvitation(prevInvitation => ({
                ...prevInvitation,
                quote: {
                    ...prevInvitation.quote,
                    // description: local_quote,
                    text: {
                        ...prevInvitation.quote.text,
                        font: {
                            ...prevInvitation.quote.text.font,
                            value: local_quote,
                        }
                    }
                },
            }));
            setSaved(false);
            setOnGeneration(false);
        }, 5000);
    };

    const onChangeQuote = (e) => {

        setQuoteValue(e.target.value)
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            quote: {
                ...prevInvitation.quote,
                text: {
                    ...prevInvitation.quote.text,
                    font: {
                        ...prevInvitation.quote.text.font,
                        value: e.target.value,
                    }
                }
            },
        }));
        setSaved(false)
    }

    const handleActive = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            quote: {
                ...prevInvitation.quote,
                active: e,
            },
        }));
        setSaved(false)
    }

    const onChangeBackground = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            quote: {
                ...prevInvitation.quote,
                background: e,
            },
        }));
        setSaved(false)
    }

    const onChangeSeparator = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            quote: {
                ...prevInvitation.quote,
                separator: e,
            },
        }));
        setSaved(false)
    }

    const handleURL = (url, index) => {
        // setUrl(url)
        // message.success('Image uploaded')
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            quote: {
                ...prevInvitation.quote,
                image: {
                    ...prevInvitation.quote.image,
                    dev: url,
                    active: true
                }
                // image_dev: url,
            },
        }));
        setSaved(false)
        setOnImageActive(true)
    }

    const handleFont = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            quote: {
                ...prevInvitation.quote,
                text: {
                    ...prevInvitation.quote.text,
                    font: {
                        ...prevInvitation.quote.text.font,
                        typeFace: e
                    }
                }
            },
        }));
        setSaved(false)
    }

    const onChnageTitleColor = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            quote: {
                ...prevInvitation.quote,
                text: {
                    ...prevInvitation.quote.text,
                    font: {
                        ...prevInvitation.quote.text.font,
                        color: colorFactoryToHex(e)
                    }
                }
            },
        }));
        setSaved(false)
    };

    const onInvertedColor = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            quote: {
                ...prevInvitation.quote,
                inverted: e,
            },
        }));
        setSaved(false)
    }

    useEffect(() => {
        setQuoteValue(invitation.quote.text.font.value)
        if (invitation.quote.image.active) {
            setOnImageActive(true)
        }

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


    useEffect(() => {
        if (!invitation.quote.image) {
            setOnImageActive(false)
        }
    }, [invitation.quote.image])





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
                                    >Cita</span>
                                    <Switch
                                        size='small'
                                        value={invitation.quote.active}
                                        onChange={handleActive} />
                                </div>


                                <div className='general-cards-single-row' style={{ gap: '5px' }}>
                                    {
                                        invitation.quote.active && (

                                            <>

                                                <Tooltip color="var(--text-color)" title="Activar separador">
                                                    <Button
                                                        type='ghost'
                                                        onClick={() => onChangeSeparator(!invitation.quote.separator)}
                                                        id={`build-cover-date-buttons${invitation.quote.separator ? '--active' : ''}`}
                                                        icon={<LuSeparatorHorizontal size={18} />} />
                                                </Tooltip>


                                                <Tooltip color="var(--text-color)" title="Activar color de fondo">
                                                    <Button
                                                        type='ghost'
                                                        onClick={() => onChangeBackground(!invitation.quote.background)}
                                                        id={`build-cover-date-buttons${invitation.quote.background ? '--active' : ''}`}
                                                        icon={<BiSolidColorFill size={18} />} />
                                                </Tooltip>

                                                {
                                                    invitation.quote.background &&
                                                    <Tooltip color="var(--text-color)" title="Invertir color de texto">
                                                        <Button
                                                            type='ghost'
                                                            onClick={() => onInvertedColor(!invitation.quote.invertedColors)}
                                                            id={`build-cover-date-buttons${invitation.quote.invertedColors ? '--active' : ''}`}
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
                                invitation.quote.active ?

                                    <div className='quote-settings-container'>
                                        <Input.TextArea
                                            // value={invitation.quote.description}
                                            value={quoteValue}
                                            autoSize={{ minRows: invitation.quote.image ? 3 : 10, maxRows: invitation.quote.image ? 5 : 15 }}
                                            onChange={onChangeQuote}
                                            className={`gc-input-text ${onGeneration ? 'magic-effect' : ''}`}
                                            style={{
                                                width: '100%', borderRadius: '12px',
                                                padding: '10px 15px', transition: 'all 0.3s ease'
                                            }} />

                                        <div className='quote-row-btween'>
                                            <span className={'module--title'}
                                            >Imagen de fondo</span>
                                            <Switch
                                                size='small'
                                                value={invitation.quote.image.active}
                                                onChange={(e) => setInvitation(prevInvitation => ({
                                                    ...prevInvitation,
                                                    quote: {
                                                        ...prevInvitation.quote,
                                                        image: {
                                                            ...prevInvitation.quote.image,
                                                            active: e
                                                        },
                                                    },
                                                }))} />
                                        </div>

                                        {
                                            onImageActive &&

                                            <>
                                                <div className='quote-image-container'>
                                                    <img src={invitation.quote.image.dev} alt='' />
                                                    <StorageImages absolute={true} invitationID={invitationID} handleImage={handleURL} />

                                                </div>

                                                <Button
                                                    className={`quote-shadow-btn`}
                                                    onClick={(e) => setInvitation(prevInvitation => ({
                                                        ...prevInvitation,
                                                        quote: {
                                                            ...prevInvitation.quote,
                                                            text: {
                                                                ...prevInvitation.quote.text,
                                                                shadow: !invitation.quote.text.shadow
                                                            },
                                                        },
                                                    }))}>
                                                    {invitation.quote.text.shadow ? 'Quitar sombra' : 'Agregar sombra'}
                                                </Button>
                                                <span className='gc-content-label'>Posición del texto</span>
                                                <div className='gc-position-container'>

                                                    {
                                                        position.map((item, index) => (
                                                            <div
                                                                key={index}
                                                                onClick={() => handlePosition(item.justify, item.align)}
                                                                className='gc-position-item'>


                                                                {
                                                                    item.justify === invitation.quote.text.justify && item.align === invitation.quote.text.align ?
                                                                        <div
                                                                            className='gc-position-selected-container '
                                                                            style={{
                                                                                alignItems: invitation.quote.text.justify === 'left' ? 'flex-start' : invitation.quote.text.justify === 'right' ? 'flex-end' : 'center',
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
                                                <div className='quote-font-settings'>

                                                    <span className='gc-content-label'>Tipo de letra</span>

                                                    <Select

                                                        value={invitation.quote.text.font.typeFace}
                                                        onChange={(e) => handleFont(e)}
                                                        style={{ width: '100%', fontFamily: invitation.quote.text.font.typeFace }}>
                                                        {fonts.map((font, index) => (
                                                            <Option style={{ fontFamily: font }} key={index} value={font}>{font}</Option>
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
                                                            max={44}
                                                            step={2}
                                                            onChange={(e) => setInvitation(prevInvitation => ({
                                                                ...prevInvitation,
                                                                quote: {
                                                                    ...prevInvitation.quote,
                                                                    text: {
                                                                        ...prevInvitation.quote.text,
                                                                        font: {
                                                                            ...prevInvitation.quote.text.font,
                                                                            size: e
                                                                        }
                                                                    },
                                                                },
                                                            }))}
                                                            value={invitation.quote.text.font.size || 16}
                                                        />

                                                        <span className='gc-content-label'>Ancho del texto</span>

                                                        <Slider
                                                            style={{ width: '95%', }}
                                                            min={40}
                                                            max={100}
                                                            step={5}
                                                            onChange={(e) => setInvitation(prevInvitation => ({
                                                                ...prevInvitation,
                                                                quote: {
                                                                    ...prevInvitation.quote,
                                                                    text: {
                                                                        ...prevInvitation.quote.text,
                                                                        width: e
                                                                    },
                                                                },
                                                            }))}
                                                            value={invitation.quote.text.width || 100}
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
                                                                        quote: {
                                                                            ...prevInvitation.quote,
                                                                            text: {
                                                                                ...prevInvitation.quote.text,
                                                                                font: {
                                                                                    ...prevInvitation.quote.text.font,
                                                                                    opacity: e
                                                                                }
                                                                            }
                                                                        },
                                                                    }))}
                                                                    value={invitation.quote.text.font.opacity || 1}
                                                                />

                                                            </Col>

                                                            <Col style={{
                                                                width: '48%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column'
                                                            }}>
                                                                <span className='gc-content-label'>Grosor</span>

                                                                <Slider
                                                                    style={{ width: '95%' }}
                                                                    min={400}
                                                                    max={800}
                                                                    step={100}

                                                                    onChange={(e) => setInvitation(prevInvitation => ({
                                                                        ...prevInvitation,
                                                                        quote: {
                                                                            ...prevInvitation.quote,
                                                                            text: {
                                                                                ...prevInvitation.quote.text,
                                                                                font: {
                                                                                    ...prevInvitation.quote.text.font,
                                                                                    weight: e
                                                                                }
                                                                            }
                                                                        },
                                                                    }))}

                                                                    value={invitation.quote.text.font.weight || 500}
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
                                                        <span>{invitation.quote.text.font.color || invitation.generals.colors.actions}</span>
                                                        <div className='general-cards-single-row'>
                                                            {
                                                                presets &&
                                                                <ColorPicker
                                                                    presets={presets}
                                                                    disabledAlpha={false}
                                                                    value={invitation.quote.text.color || invitation.generals.colors.actions}
                                                                    style={{ width: '80px' }}
                                                                    onChangeComplete={(e) => onChnageTitleColor(e)}
                                                                >
                                                                </ColorPicker>
                                                            }

                                                        </div>

                                                    </div>

                                                </div>
                                            </>
                                        }


                                    </div>
                                    : <div />

                            }
                        </div>


                        {
                            !invitation.quote.active && (
                                <div style={{
                                    width: '100%', height: '300px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}><TbEyeClosed size={32} style={{ color: '#717171' }} /></div>
                            )
                        }

                    </div>
                    : <></>
            }
        </>
    )
}


