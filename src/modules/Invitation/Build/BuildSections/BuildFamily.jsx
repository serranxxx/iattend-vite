import { Button, Col, Input, Switch, Tooltip } from 'antd'
import { BiSolidColorFill } from 'react-icons/bi';
import { IoMdAdd } from 'react-icons/io';
import { LuSeparatorHorizontal } from 'react-icons/lu';
import { MdInvertColors } from 'react-icons/md';
import { TbEyeClosed } from 'react-icons/tb';


export const BuildFamily = ({ invitation, setInvitation, setSaved }) => {


    const onChangeTitle = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            people: {
                ...prevInvitation.people,
                title: e.target.value
            },
        }));
        setSaved(false)
    }

    const changeTitlePersona = (index, newType) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            people: {
                ...prevInvitation.people,
                personas: prevInvitation.people.personas.map((persona, i) => {
                    if (i === index) {
                        return {
                            ...persona,
                            title: newType
                        };
                    }
                    return persona;
                })
            }
        }));
        setSaved(false)
    }

    const changeNamePersona = (index, newType) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            people: {
                ...prevInvitation.people,
                personas: prevInvitation.people.personas.map((persona, i) => {
                    if (i === index) {
                        return {
                            ...persona,
                            description: newType
                        };
                    }
                    return persona;
                })
            }
        }));
        setSaved(false)
    }

    const addNewPersona = () => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            people: {
                ...prevInvitation.people,
                personas: [
                    ...prevInvitation.people.personas,
                    {
                        title: null,
                        description: null
                    }
                ]
            }
        }));
        setSaved(false)
    }

    const deletePersonaByIndex = (index) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            people: {
                ...prevInvitation.people,
                personas: prevInvitation.people.personas.filter((persona, i) => i !== index)
            }
        }));
        setSaved(false)
    }

    const handleActive = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            people: {
                ...prevInvitation.people,
                active: e,
            },
        }));
        setSaved(false)
    }

    const onChangeBackground = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            people: {
                ...prevInvitation.people,
                background: e,
            },
        }));
        setSaved(false)
    }

    const onChangeSeparator = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            people: {
                ...prevInvitation.people,
                separator: e,
            },
        }));
        setSaved(false)
    }

    const onInvertedColor = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            people: {
                ...prevInvitation.people,
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
                                    >Personas</span>
                                    <Switch
                                        size='small'
                                        value={invitation.people.active}
                                        onChange={handleActive} />
                                </div>


                                <div className='general-cards-single-row' style={{ gap: '5px' }}>
                                    {
                                        invitation.people.active && (

                                            <>

                                                <Button
                                                    type='ghost'
                                                    onClick={() => onChangeSeparator(!invitation.people.separator)}
                                                    id={`build-cover-date-buttons${invitation.people.separator ? '--active' : ''}`}
                                                    icon={<LuSeparatorHorizontal size={18} />} />

                                                <Button
                                                    type='ghost'
                                                    onClick={() => onChangeBackground(!invitation.people.background)}
                                                    id={`build-cover-date-buttons${invitation.people.background ? '--active' : ''}`}
                                                    icon={<BiSolidColorFill size={18} />} />

                                                {
                                                    invitation.people.background &&
                                                    <Tooltip color="var(--text-color)" title="Invertir color de texto">
                                                        <Button
                                                            type='ghost'
                                                            onClick={() => onInvertedColor(!invitation.people.inverted)}
                                                            id={`build-cover-date-buttons${invitation.people.inverted ? '--active' : ''}`}
                                                            icon={<MdInvertColors size={18} />} />
                                                    </Tooltip>
                                                }
                                            </>
                                        )
                                    }
                                </div>

                            </div>

                            {
                                invitation.people.active ?
                                    <>
                                        <span className='simple-content-label'>Título</span>

                                        <Input
                                            onChange={onChangeTitle}
                                            value={invitation.people.title}
                                            className='gc-input-text' />

                                        <Button style={{ margin: '16px 0px' }} icon={<IoMdAdd />} onClick={addNewPersona} className='primarybutton--active'>
                                            Nueva persona
                                        </Button>
                                        <div style={{
                                            display:'flex',alignItems:'flex-start',justifyContent:'flex-start',flexDirection:'column',
                                            gap:'16px',alignSelf:'stretch'
                                        }}>
                                            {
                                                invitation.people.personas.map((persona, index) => (
                                                    <div style={{
                                                        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                                                        alignSelf: 'stretch'
                                                    }}>
                                                        <Col
                                                            key={index}
                                                            className='regular-card'
                                                            style={{
                                                                borderRadius: '16px 16px 0px 0px', padding: '12px',
                                                                paddingBottom: '16px'
                                                            }}>

                                                            <span className='simple-content-label'>Título</span>

                                                            <Input
                                                                onChange={(e) => changeTitlePersona(index, e.target.value)}
                                                                value={persona.title}
                                                                placeholder='Título de la persona'
                                                                style={{ borderRadius: '8px' }}
                                                                className='gc-input-text' />

                                                            <span style={{ marginTop: '8px' }} className='simple-content-label'>Nombre</span>

                                                            <Input
                                                                // onChange={onChangeTitle}
                                                                onChange={(e) => changeNamePersona(index, e.target.value)}
                                                                value={persona.description}
                                                                style={{ borderRadius: '8px' }}
                                                                placeholder='Nombre de la persona'
                                                                className='gc-input-text' />
                                                        </Col>

                                                        <div style={{
                                                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            alignSelf: 'stretch'
                                                        }}>
                                                            <Button
                                                                className='primarybutton'
                                                                onClick={() => deletePersonaByIndex(index)}
                                                                style={{ width: '100%', borderRadius: '0px 0px 16px 16px', maxHeight: '24px', color: '#CCC' }}
                                                            // icon={<IoClose size={18} />}
                                                            // style={{ position: 'absolute', top: '5px', right: '5px' }}
                                                            >Borrar</Button>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </>
                                    : <div style={{
                                        width: '100%', height: '300px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}><TbEyeClosed size={32} style={{ color: '#717171' }} /></div>
                            }



                        </div>


                    </div >
                    : <></>
            }
        </>
    )
}


