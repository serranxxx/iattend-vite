import { Button, Input, Select, Switch, Tooltip } from 'antd'
import { useEffect, useState } from 'react';
import { MdInvertColors } from 'react-icons/md';
import { giftsAI } from '../../../../helpers/services/messages';
import { LuSeparatorHorizontal } from 'react-icons/lu';
import { BiSolidColorFill } from 'react-icons/bi';
import { BsStars } from 'react-icons/bs';
import { IoMdAdd } from 'react-icons/io';
import { RiDeleteBack2Line } from 'react-icons/ri';
import { TbEyeClosed } from 'react-icons/tb';

const { Option } = Select;

const banks = [
    "Banamex",
    "Banorte",
    "BBVA",
    "HSBC",
    "Nu",
    "Santander",
    "Scotiabank",
    "Crelan"
]

const stores = [
    "Amazon",
    "Liverpool",
    "Palacio de hierro",
    "Sears",
]

export const BuildGifts = ({ invitation, setInvitation, setSaved }) => {

    const [onButton, setOnButton] = useState(false)
    const [onGeneration, setOnGeneration] = useState(false)
    const [descriptionValue, setDescriptionValue] = useState(null)

    const handleGenerating = () => {

        let local_description = giftsAI[Math.floor(Math.random() * 9)]

        setDescriptionValue('Generando ...');

        setTimeout(() => {
            setDescriptionValue(local_description)
        }, 4500);

        setOnGeneration(true);

        setTimeout(() => {
            setInvitation(prevInvitation => ({
                ...prevInvitation,
                gifts: {
                    ...prevInvitation.gifts,
                    description: local_description,
                },
            }));
            setSaved(false);
            setOnGeneration(false);
        }, 5000);
    };

    const onChangeTitle = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gifts: {
                ...prevInvitation.gifts,
                title: e ? e.target.value : prevInvitation.gifts.title,
            },
        }));
        setSaved(false)
    }

    const onChangeDescription = (e) => {
        setDescriptionValue(e.target.value)
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gifts: {
                ...prevInvitation.gifts,
                description: e ? e.target.value : prevInvitation.gifts.description,
            },
        }));
        setSaved(false)
    }

    const handleActive = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gifts: {
                ...prevInvitation.gifts,
                active: e,
            },
        }));
        setSaved(false)
    }

    const deleteCardByIndex = (index) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gifts: {
                ...prevInvitation.gifts,
                cards: prevInvitation.gifts.cards.filter((card, i) => i !== index)
            }
        }));
        setSaved(false)
    }

    const addNewCard = (link) => {
        if (link) {
            setInvitation(prevInvitation => ({
                ...prevInvitation,
                gifts: {
                    ...prevInvitation.gifts,
                    cards: [
                        ...prevInvitation.gifts.cards,
                        {
                            kind: 'store',
                            brand: 'Amazon',
                            url: null,
                            bank: null,
                            name: null,
                            number: null
                        }
                    ]
                }
            }));
        } else {
            setInvitation(prevInvitation => ({
                ...prevInvitation,
                gifts: {
                    ...prevInvitation.gifts,
                    cards: [
                        ...prevInvitation.gifts.cards,
                        {
                            kind: 'bank',
                            brand: null,
                            url: null,
                            bank: "BBVA",
                            name: null,
                            number: null
                        }
                    ]
                }
            }));
        }

        setSaved(false)
    }


    const changeCardTypeByIndex = (index, newType) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gifts: {
                ...prevInvitation.gifts,
                cards: prevInvitation.gifts.cards.map((card, i) => {
                    if (i === index) {
                        return {
                            ...card,
                            brand: newType
                        };
                    }
                    return card;
                })
            }
        }));
        setSaved(false)
    }

    const changeCardUrlByIndex = (index, newUrl) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gifts: {
                ...prevInvitation.gifts,
                cards: prevInvitation.gifts.cards.map((card, i) => {
                    if (i === index) {
                        return {
                            ...card,
                            url: newUrl
                        };
                    }
                    return card;
                })
            }
        }));
        setSaved(false)
    }

    const changeCardBankByIndex = (index, newBank) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gifts: {
                ...prevInvitation.gifts,
                cards: prevInvitation.gifts.cards.map((card, i) => {
                    if (i === index) {
                        return {
                            ...card,
                            bank: newBank
                        };
                    }
                    return card;
                })
            }
        }));
        setSaved(false)
    }

    const changeCardNameByIndex = (index, newName) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gifts: {
                ...prevInvitation.gifts,
                cards: prevInvitation.gifts.cards.map((card, i) => {
                    if (i === index) {
                        return {
                            ...card,
                            name: newName
                        };
                    }
                    return card;
                })
            }
        }));
        setSaved(false)
    }

    const changeCardNumberByIndex = (index, newNumber) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gifts: {
                ...prevInvitation.gifts,
                cards: prevInvitation.gifts.cards.map((card, i) => {
                    if (i === index) {
                        return {
                            ...card,
                            number: newNumber
                        };
                    }
                    return card;
                })
            }
        }));
        setSaved(false)
    }

    const onChangeBackground = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gifts: {
                ...prevInvitation.gifts,
                background: e,
            },
        }));
        setSaved(false)
    }

    const onChangeSeparator = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gifts: {
                ...prevInvitation.gifts,
                separator: e,
            },
        }));
        setSaved(false)
    }

    const onInvertedColor = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gifts: {
                ...prevInvitation.gifts,
                inverted: e,
            },
        }));
        setSaved(false)
    }

    useEffect(() => {
        setDescriptionValue(invitation.gifts.description)
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
                                            width: 'auto', lineHeight: 1
                                        }}
                                    >Regalos</span>
                                    <Switch
                                        size='small'
                                        value={invitation.gifts.active}
                                        onChange={handleActive} />
                                </div>


                                <div className='general-cards-single-row' style={{ gap: '5px' }}>
                                    {
                                        invitation.gifts.active && (

                                            <>

                                                <Tooltip color="var(--text-color)" title="Activar separador">
                                                    <Button
                                                        type='ghost'
                                                        onClick={() => onChangeSeparator(!invitation.gifts.separator)}
                                                        id={`build-cover-date-buttons${invitation.gifts.separator ? '--active' : ''}`}
                                                        icon={<LuSeparatorHorizontal size={18} />} />
                                                </Tooltip>


                                                <Tooltip color="var(--text-color)" title="Activar color de fondo">
                                                    <Button
                                                        type='ghost'
                                                        onClick={() => onChangeBackground(!invitation.gifts.background)}
                                                        id={`build-cover-date-buttons${invitation.gifts.background ? '--active' : ''}`}
                                                        icon={<BiSolidColorFill size={18} />} />
                                                </Tooltip>


                                                <Tooltip color="var(--text-color)" title="Invertir color de texto">
                                                    <Button
                                                        type='ghost'
                                                        onClick={() => onInvertedColor(!invitation.gifts.inverted)}
                                                        id={`build-cover-date-buttons${invitation.gifts.inverted ? '--active' : ''}`}
                                                        icon={<MdInvertColors size={18} />} />
                                                </Tooltip>


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
                                invitation.gifts.active ?

                                    <>
                                        <span className='gc-content-label'>Título</span>
                                        <Input className='gc-input-text'
                                            onChange={onChangeTitle}
                                            value={invitation.gifts.title} />

                                        <span className='gc-content-label'>Descripción</span>
                                        <Input.TextArea className={`gc-input-text ${onGeneration ? 'magic-effect' : ''}`}
                                            style={{ borderRadius: '16px' }}
                                            value={descriptionValue}
                                            onChange={onChangeDescription}
                                            autoSize={{ minRows: 3, maxRows: 5 }} />

                                    </>


                                    : <div />
                            }
                        </div>

                        {
                            invitation.gifts.active ?

                                <div className='build-component-elements' style={{ gap: '24px' }}>
                                    <div style={{
                                        alignSelf: 'stretch', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'
                                    }}>
                                        <span className={'module--title'}
                                            style={{
                                                width: 'auto',
                                            }}
                                        >Mis tarjetas</span>

                                        {
                                            invitation.gifts.cards.length < 3 &&
                                            <div style={{
                                                alignSelf: 'stretch', display: 'flex', alignItems: 'flex-end',
                                                justifyContent: 'flex-start', flexDirection: 'column', gap: '8px',

                                            }}>

                                                <Button
                                                    className='primarybutton'
                                                    style={{
                                                        width: '180px', borderRadius: '99px'
                                                    }}
                                                    onClick={() => addNewCard(false)}
                                                    icon={<IoMdAdd />}
                                                >
                                                    Cuenta bancaria
                                                </Button>

                                                <Button
                                                    className='primarybutton'
                                                    style={{
                                                        width: '180px', borderRadius: '99px'
                                                    }}
                                                    onClick={() => addNewCard(true)}
                                                    icon={<IoMdAdd />}
                                                >
                                                    Tienda digital
                                                </Button>

                                            </div>
                                        }
                                    </div>

                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column', gap: '16px',
                                        alignSelf: 'stretch'
                                    }}>

                                        {
                                            invitation.gifts.cards ?
                                                invitation.gifts.cards.slice(0, 3).map((card, index) => (

                                                    <div
                                                        className='regular-card'
                                                        style={{
                                                            width: '100%', padding: '0px', overflow: 'hidden',
                                                            borderRadius:'16px'
                                                        }}
                                                        key={index}
                                                    >
                                                        <>



                                                            {
                                                                card.kind === 'store' ?

                                                                    <div className='build-generals-simple-column' style={{
                                                                        gap: '12px', backgroundColor: 'var(--borders)', padding: '12px'
                                                                    }}>
                                                                        <div style={{
                                                                            alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                                                        }}>
                                                                            <span className='gc-content-label'>Tienda digital</span>
                                                                            <Button
                                                                                type='ghost'
                                                                                style={{
                                                                                    backgroundColor: '#F5F5F5',
                                                                                    borderRadius: '99px'
                                                                                }}
                                                                                className='primarybutton'
                                                                                onClick={() => deleteCardByIndex(index)}
                                                                                icon={<RiDeleteBack2Line size={16} />}
                                                                            >Eliminar</Button>
                                                                        </div>

                                                                        <Select

                                                                            value={card.brand}
                                                                            onChange={(e) => changeCardTypeByIndex(index, e)}
                                                                            style={{ width: '100%' }}>
                                                                            {stores.map((font, index) => (
                                                                                <Option key={index} value={font}>{font}</Option>
                                                                            ))}

                                                                        </Select>

                                                                        <Input
                                                                            className='gc-input-text'
                                                                            style={{
                                                                                opacity: '0.6'
                                                                            }}
                                                                            placeholder='URL'
                                                                            onChange={(e) => changeCardUrlByIndex(index, e.target.value)}
                                                                            value={card.url} />




                                                                    </div>

                                                                    :
                                                                    <div className='build-generals-simple-column' style={{
                                                                        gap: '12px', backgroundColor: 'var(--sc-color)', padding: '12px'
                                                                    }}>
                                                                        <div style={{
                                                                            alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                                                        }}>
                                                                            <span className='gc-content-label'>Cuenta bancaria</span>
                                                                            <Button
                                                                                style={{
                                                                                    backgroundColor: '#ECECEC',
                                                                                    borderRadius: '99px'
                                                                                }}
                                                                                className='primarybutton'
                                                                                onClick={() => deleteCardByIndex(index)}
                                                                                icon={<RiDeleteBack2Line size={16} />}
                                                                            >Eliminar</Button>
                                                                        </div>

                                                                        <div className='general-cards-single-row' style={{
                                                                            width: '100%'
                                                                        }}>
                                                                            <Select

                                                                                value={card.bank}
                                                                                onChange={(e) => changeCardBankByIndex(index, e)}
                                                                                style={{ flex: 1 }}>
                                                                                {banks.map((font, index) => (
                                                                                    <Option key={index} value={font}>{font}</Option>
                                                                                ))}

                                                                            </Select>

                                                                            <Input
                                                                                className='gc-input-text'
                                                                                style={{
                                                                                    flex: 1,
                                                                                    opacity: '0.6'

                                                                                    //  marginBottom: '10px'
                                                                                }}
                                                                                placeholder='Nombre'
                                                                                onChange={(e) => changeCardNameByIndex(index, e.target.value)}
                                                                                value={card.name} />

                                                                        </div>
                                                                        <Input
                                                                            className='gc-input-text'
                                                                            style={{
                                                                                opacity: '0.6'
                                                                            }}
                                                                            placeholder='Número'
                                                                            onChange={(e) => changeCardNumberByIndex(index, e.target.value)}
                                                                            value={card.number} />


                                                                    </div>

                                                            }
                                                        </>




                                                    </div>
                                                ))
                                                : <></>
                                        }

                                    </div>

                                </div>

                                : <div style={{
                                    width: '100%', height: '300px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}><TbEyeClosed size={32} style={{ color: '#717171' }} /></div>

                        }

                    </div >
                    : <></>
            }
        </>
    )
}
