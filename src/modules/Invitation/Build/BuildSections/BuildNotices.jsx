import { Button, Col, Input, Switch, Tooltip } from 'antd'
import { BiSolidColorFill } from 'react-icons/bi';
import { IoMdAdd } from 'react-icons/io';
import { LuSeparatorHorizontal } from 'react-icons/lu';
import { MdInvertColors } from 'react-icons/md';
import { TbEyeClosed } from 'react-icons/tb';


export const BuildNotices = ({ invitation, setInvitation, setSaved }) => {

    const handleActive = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            notices: {
                ...prevInvitation.notices,
                active: e,
            },
        }));
        setSaved(false)
    }

    const onInvertedColor = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            notices: {
                ...prevInvitation.notices,
                inverted: e,
            },
        }));
        setSaved(false)
    }



    const addNewNotice = () => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            notices: {
                ...prevInvitation.notices,
                notices: [
                    ...prevInvitation.notices.notices,
                    null
                ]
            }
        }));
        setSaved(false)
    }

    const deleteNoticeByIndex = (index) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            notices: {
                ...prevInvitation.notices,
                notices: prevInvitation.notices.notices.filter((notice, i) => i !== index)
            }
        }));
        setSaved(false)
    }

    const editNoticeByIndex = (index, updatedNotice) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            notices: {
                ...prevInvitation.notices,
                notices: prevInvitation.notices.notices.map((notice, i) => {
                    if (i === index) {
                        return updatedNotice;
                    }
                    return notice;
                })
            }
        }));
        setSaved(false)
    }

    const onChangeBackground = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            notices: {
                ...prevInvitation.notices,
                background: e,
            },
        }));
        setSaved(false)
    }

    const onChangeSeparator = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            notices: {
                ...prevInvitation.notices,
                separator: e,
            },
        }));
        setSaved(false)
    }

    const onChangeTitle = (e) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            notices: {
                ...prevInvitation.notices,
                title: e ? e.target.value : prevInvitation.notices.title,
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
                                    <spanx className={'module--title'}
                                        style={{
                                            width: 'auto',
                                        }}
                                    >Avisos</spanx>
                                    <Switch
                                        size='small'
                                        value={invitation.notices.active}
                                        onChange={handleActive} />
                                </div>

                                <div className='general-cards-single-row' style={{ gap: '5px' }}>
                                    {
                                        invitation.notices.active && (

                                            <>
                                                <Button
                                                    type='ghost'
                                                    onClick={() => onChangeSeparator(!invitation.notices.separator)}
                                                    id={`build-cover-date-buttons${invitation.notices.separator ? '--active' : ''}`}
                                                    icon={<LuSeparatorHorizontal size={18} />} />

                                                <Button
                                                    type='ghost'
                                                    onClick={() => onChangeBackground(!invitation.notices.background)}
                                                    id={`build-cover-date-buttons${invitation.notices.background ? '--active' : ''}`}
                                                    icon={<BiSolidColorFill size={18} />} />

                                                {
                                                    invitation.notices.background && !invitation.notices.image &&
                                                    <Tooltip color="var(--text-color)" title="Invertir color de texto">
                                                        <Button
                                                            type='ghost'
                                                            onClick={() => onInvertedColor(!invitation.notices.inverted)}
                                                            id={`build-cover-date-buttons${invitation.notices.inverted ? '--active' : ''}`}
                                                            icon={<MdInvertColors size={18} />} />
                                                    </Tooltip>
                                                }
                                            </>
                                        )
                                    }
                                </div>

                            </div>

                            {
                                invitation.notices.active ?
                                    <>
                                        <div className='build-generals-simple-column'>
                                            <span className='gc-content-label'>Título</span>

                                            <Input
                                                onChange={onChangeTitle}
                                                value={invitation.notices.title}
                                                style={{ width: '100%', transition: 'all 0.3s ease' }}
                                                className={`gc-input-text`} />
                                        </div>

                                        <Button
                                            style={{ margin: '16px 0px' }}
                                            className='primarybutton--active' icon={<IoMdAdd />} onClick={addNewNotice}>
                                            Nuevo aviso
                                        </Button>

                                        <Col style={{
                                            width: '100%', display: 'flex', alignItems: 'center',
                                            justifyContent: 'flex-start', flexDirection: 'column',
                                            gap: '16px', alignSelf:'stretch'
                                        }}>
                                            {
                                                invitation.notices.notices ?
                                                    invitation.notices.notices.map((notice, index) => (

                                                        <div style={{
                                                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
                                                            flexDirection: 'column', alignSelf:'stretch'
                                                        }}>
                                                            <div
                                                                key={index}
                                                                style={{
                                                                    width: '100%', position: 'relative',
                                                                    // paddingLeft: '7px'
                                                                    // borderRadius: '15px'
                                                                }}>

                                                                <Input.TextArea
                                                                    className='gc-input-text'
                                                                    style={{ borderRadius: '16px 16px 0px 0px', minWidth: '290px', padding: '12px' }}
                                                                    autoSize={{ minRows: 4, maxRows: 10 }}
                                                                    onChange={(e) => editNoticeByIndex(index, e.target.value)}
                                                                    placeholder='Nuevo aviso'
                                                                    value={notice} />




                                                            </div>
                                                            <div style={{
                                                                width:'100%',display:'flex',alignItems:'center',justifyContent:'center',
                                                                alignSelf:'stretch'
                                                            }}>
                                                                <Button
                                                                    className='primarybutton'
                                                                    onClick={() => deleteNoticeByIndex(index)}
                                                                    style={{width:'100%', borderRadius:'0px 0px 16px 16px', maxHeight:'24px', color:'#CCC'}}
                                                                    // icon={<IoClose size={18} />}
                                                                // style={{ position: 'absolute', top: '5px', right: '5px' }}
                                                                >Borrar</Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                    : <></>
                                            }
                                        </Col>
                                    </>
                                    : <div style={{
                                        width: '100%', height: '300px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}><TbEyeClosed size={32} style={{ color: '#717171' }} /></div>
                            }
                        </div>

                    </div>

                    : <></>
            }
        </>
    )
}


