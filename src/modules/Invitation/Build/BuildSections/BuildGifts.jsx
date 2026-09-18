import { Button, Input, Select,} from 'antd'
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoMdAdd } from 'react-icons/io';
import { RiDeleteBack2Line } from 'react-icons/ri';
import { TbEyeClosed } from 'react-icons/tb';
import { BuildMenu } from '../../../../components/BuildMenu/BuildMenu';
import { useGiftBrands } from '../../../../hooks/useGiftBrands';

const { Option } = Select;

// Una tarjeta vieja puede traer una marca que ya no está activa en el catálogo
// (o que nunca estuvo, como los valores sucios que dejó el frontend anterior).
// Si no la agregamos como opción, antd la muestra pero el organizador la pierde
// en cuanto toca el Select.
const opcionesConValorActual = (nombres, valorActual) =>
    valorActual && !nombres.includes(valorActual)
        ? [...nombres, valorActual]
        : nombres;

export const BuildGifts = ({ invitation, setInvitation, setSaved, invitationID }) => {

    const { t } = useTranslation()
    const { stores, banks, loading: brandsLoading } = useGiftBrands()
    const [onGeneration] = useState(false)
    const [descriptionValue, setDescriptionValue] = useState(null)

    // const handleGenerating = () => {

    //     let local_description = giftsAI[Math.floor(Math.random() * 9)]

    //     setDescriptionValue('Generando ...');

    //     setTimeout(() => {
    //         setDescriptionValue(local_description)
    //     }, 4500);

    //     setOnGeneration(true);

    //     setTimeout(() => {
    //         setInvitation(prevInvitation => ({
    //             ...prevInvitation,
    //             gifts: {
    //                 ...prevInvitation.gifts,
    //                 description: local_description,
    //             },
    //         }));
    //         setSaved(false);
    //         setOnGeneration(false);
    //     }, 5000);
    // };

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

    // `esTienda` decide el tipo de tarjeta. La marca por default es la primera
    // del catálogo para ese tipo (sort_order), no una constante hardcodeada.
    const addNewCard = (esTienda) => {
        const nuevaTarjeta = esTienda
            ? {
                kind: 'store',
                brand: stores[0]?.name ?? null,
                url: null,
                bank: null,
                name: null,
                number: null
            }
            : {
                kind: 'bank',
                brand: null,
                url: null,
                bank: banks[0]?.name ?? null,
                name: null,
                number: null
            };

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            gifts: {
                ...prevInvitation.gifts,
                cards: [...prevInvitation.gifts.cards, nuevaTarjeta]
            }
        }));

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
                                    >{t('build_gifts.title')}</span>
                                </div>

                                <BuildMenu invitation={invitation} label={'gifts'} setInvitation={setInvitation} setSaved={setSaved} invitationID={invitationID} />

                            </div>
                            {
                                invitation.gifts.active ?

                                    <>
                                        <span className='gc-content-label'>{t('build_gifts.label_title')}</span>
                                        <Input className='gc-input-text'
                                            onChange={onChangeTitle}
                                            value={invitation.gifts.title} />

                                        <span className='gc-content-label'>{t('build_gifts.label_description')}</span>
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
                                        >{t('build_gifts.section_cards')}</span>

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
                                                    disabled={brandsLoading || banks.length === 0}
                                                    icon={<IoMdAdd />}
                                                >
                                                    {t('build_gifts.btn_bank')}
                                                </Button>

                                                <Button
                                                    className='primarybutton'
                                                    style={{
                                                        width: '180px', borderRadius: '99px'
                                                    }}
                                                    onClick={() => addNewCard(true)}
                                                    disabled={brandsLoading || stores.length === 0}
                                                    icon={<IoMdAdd />}
                                                >
                                                    {t('build_gifts.btn_store')}
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
                                                            borderRadius: '16px'
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
                                                                            <span className='gc-content-label'>{t('build_gifts.label_store')}</span>
                                                                            <Button
                                                                                type='text'
                                                                                style={{
                                                                                    backgroundColor: '#F5F5F5',
                                                                                    borderRadius: '99px'
                                                                                }}
                                                                                className='primarybutton'
                                                                                onClick={() => deleteCardByIndex(index)}
                                                                                icon={<RiDeleteBack2Line size={16} />}
                                                                            >{t('build_gifts.btn_delete')}</Button>
                                                                        </div>

                                                                        <Select

                                                                            value={card.brand}
                                                                            onChange={(e) => changeCardTypeByIndex(index, e)}
                                                                            loading={brandsLoading}
                                                                            style={{ width: '100%' }}>
                                                                            {opcionesConValorActual(stores.map(s => s.name), card.brand).map((nombre) => (
                                                                                <Option key={nombre} value={nombre}>{nombre}</Option>
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
                                                                            <span className='gc-content-label'>{t('build_gifts.label_bank')}</span>
                                                                            <Button
                                                                                style={{
                                                                                    backgroundColor: '#ECECEC',
                                                                                    borderRadius: '99px'
                                                                                }}
                                                                                className='primarybutton'
                                                                                onClick={() => deleteCardByIndex(index)}
                                                                                icon={<RiDeleteBack2Line size={16} />}
                                                                            >{t('build_gifts.btn_delete')}</Button>
                                                                        </div>

                                                                        <div className='general-cards-single-row' style={{
                                                                            width: '100%'
                                                                        }}>
                                                                            <Select

                                                                                value={card.bank}
                                                                                onChange={(e) => changeCardBankByIndex(index, e)}
                                                                                loading={brandsLoading}
                                                                                style={{ flex: 1 }}>
                                                                                {opcionesConValorActual(banks.map(b => b.name), card.bank).map((nombre) => (
                                                                                    <Option key={nombre} value={nombre}>{nombre}</Option>
                                                                                ))}

                                                                            </Select>

                                                                            <Input
                                                                                className='gc-input-text'
                                                                                style={{
                                                                                    flex: 1,
                                                                                    opacity: '0.6'

                                                                                    //  marginBottom: '10px'
                                                                                }}
                                                                                placeholder={t('build_gifts.placeholder_name')}
                                                                                onChange={(e) => changeCardNameByIndex(index, e.target.value)}
                                                                                value={card.name} />

                                                                        </div>
                                                                        <Input
                                                                            className='gc-input-text'
                                                                            style={{
                                                                                opacity: '0.6'
                                                                            }}
                                                                            placeholder={t('build_gifts.placeholder_number')}
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
