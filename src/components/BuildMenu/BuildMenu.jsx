import React, { useState } from 'react'
import './build-menu.css'
import { Button, Dropdown, Segmented, Slider } from 'antd'
import { ChevronDown, CirclePower, EllipsisVertical, Paintbrush, Pencil, PencilRuler, Plus, PowerOff, SeparatorHorizontal, Settings2, SquaresExclude } from 'lucide-react'
import { Separador } from '../Invitation/Logos'
import { StorageImages } from '../ImagesStorage/StorageImages'


const separadores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export const BuildMenu = ({ invitation, label, setInvitation, setSaved, invitationID }) => {


    const [separatorValue, setSeparatorValue] = useState('Regular')

    const active = invitation[label].active
    const inverted = invitation[label].inverted
    // const background = invitation[label].background
    const dynamic_separator = invitation[label].dynamic_separator
    const dynamic_background = invitation[label].dynamic_background

    const handleActive = (value) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            [label]: {
                ...prevInvitation[label],
                active: value,
            },
        }));

        setSaved(false);
    };


    const handleInvert = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            [label]: {
                ...prevInvitation[label],
                inverted: e,
            },
        }));
        setSaved(false)
    }

    const handleSeparator = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            [label]: {
                ...prevInvitation[label],
                dynamic_separator: {
                    ...prevInvitation[label].dynamic_separator,
                    active: e
                },
            },
        }));
        setSaved(false)
    }

    const handleDynamicSeparator = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            [label]: {
                ...prevInvitation[label],
                dynamic_separator: {
                    ...prevInvitation[label].dynamic_separator,
                    single: {
                        ...prevInvitation[label].dynamic_separator.single,
                        value: e
                    }
                }
            },
        }));
        setSaved(false)
    }

    const handleSeparatorType = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            [label]: {
                ...prevInvitation[label],
                dynamic_separator: {
                    ...prevInvitation[label].dynamic_separator,
                    type: e === 'Regular' ? 'single' : 'image'
                },
            },
        }));
        setSaved(false)
    }

    const handleImage = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            [label]: {
                ...prevInvitation[label],
                dynamic_separator: {
                    ...prevInvitation[label].dynamic_separator,
                    image: {
                        ...prevInvitation[label].dynamic_separator.image,
                        value: e
                    }
                },
            },
        }));
        setSaved(false)
    }

    const handleSize = (e, lab) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            [label]: {
                ...prevInvitation[label],
                dynamic_separator: {
                    active: dynamic_separator.active,
                    ...prevInvitation[label].dynamic_separator,
                    image: {
                        ...prevInvitation[label].dynamic_separator.image,
                        [lab]: e
                    }
                },
            },
        }));
        setSaved(false)
    }

    const handleBackProps = (e, lab) => {
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            [label]: {
                ...prevInvitation[label],
                dynamic_background: {
                    ...prevInvitation[label].dynamic_background,
                    [lab]: e,
                },
            },
        }));
        setSaved(false)
    }





    return (
        <Dropdown
            trigger={['click']}
            placement='bottomLeft'
            arrow
            popupRender={() => (
                <div className='menu_cont'>
                    <div onClick={() => handleActive(!active)} className={`menu_item ${active ? 'menu_active' : ''}`}>
                        {active ? <CirclePower size={16} /> : <PowerOff size={16} />}
                        <span>{active ? 'Módulo activo' : 'Módulo inactivo'}</span>
                    </div>

                    <div onClick={() => handleBackProps(!dynamic_background.active, 'active')} className={`menu_item ${!active && 'inactive_item'} ${dynamic_background.active && 'menu_active'} menu_father`}>
                        <div className='single_row'>
                            <Paintbrush size={16} />
                            <span>Color de fondo</span>
                        </div>

                        <Dropdown
                            trigger={['click']}
                            placement='bottomLeft'
                            arrow
                            popupRender={() => (
                                <div onClick={(e) => e.stopPropagation()} className='menu_cont' style={{
                                    padding: '16px', gap: '12px'
                                }}>
                                    <div className='single_row' style={{ fontWeight: 500 }}>
                                        <Settings2 size={16} />
                                        <span>Ajustes</span>
                                    </div>

                                    <div className='image_col'>

                                        <div className='single_row' style={{ justifyContent: 'space-between' }}>

                                            <div className='slider_col'>
                                                <span >Bordes</span>
                                                <Slider onChange={(e) => {handleBackProps(e, 'border_radius'); (e) => e.stopPropagation();}} style={{ width: '80px' }} step={2} min={0} max={99} value={dynamic_background.border_radius} />
                                            </div>


                                            <div className='slider_col'>
                                                <span>Largo</span>
                                                <Slider onChange={(e) => handleBackProps(e, 'width')} style={{ width: '80px' }} max={100} min={70} step={5} value={dynamic_background.width} />
                                            </div>
                                        </div>


                                        <div className='slider_col' style={{ gap: '6px' }}>
                                            <span>Sombra</span>
                                            <Button onClick={() => handleBackProps(!dynamic_background.shadow, 'shadow')} style={{width:'100%'}}>{dynamic_background.shadow ? 'Activa' : 'Inactiva'}</Button>
                                        </div>

                                        {/* <div className='slider_col' style={{ gap: '6px' }}>
                                            <span>Textura</span>
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
                                                                // onClick={() => handleTexture(null)}
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
                                                                        // onClick={() => handleTexture(index)}
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
                                        </div> */}
                                    </div>

                                </div>)}>
                            <Button onClick={(e) => e.stopPropagation()} type='text' icon={<ChevronDown size={16} style={{ marginTop: '4px' }} />}></Button>
                        </Dropdown>
                    </div>

                    <div onClick={() => handleInvert(!inverted)} className={`menu_item ${!active && 'inactive_item'} ${inverted && 'menu_active'}`}>
                        <SquaresExclude size={16} />
                        <span>Invertir color</span>
                    </div>
                    {/* onClick={() => handleSeparator(!separator)}  */}
                    <div onClick={() => handleSeparator(!dynamic_separator.active)} className={`menu_item ${!active && 'inactive_item'} ${dynamic_separator.active && 'menu_active'} menu_father`}>
                        <div className='single_row'>
                            <SeparatorHorizontal size={16} />
                            <span>Separador</span>
                        </div>

                        <Dropdown
                            trigger={['click']}
                            placement='bottomLeft'
                            arrow
                            popupRender={() => (
                                <div onClick={(e) => e.stopPropagation()}  className='menu_cont' style={{
                                    padding: '16px'
                                }}>
                                    <div className='single_row' style={{ fontWeight: 500 }}>
                                        <Settings2 size={16} />
                                        <span>Ajustes</span>
                                    </div>

                                    <Segmented
                                        shape='round'

                                        value={dynamic_separator.type === 'single' ? 'Regular' : 'Imagen'}
                                        onChange={(e) => { setSeparatorValue(e); handleSeparatorType(e) }}
                                        options={['Regular', 'Imagen']}
                                    />

                                    {
                                        separatorValue === 'Regular' ?
                                            <div className="build-separator-container" style={{ width: '100%', position: 'relative', height: '80px', background: '#F5F3F280' }}>
                                                <Separador MainColor={'var(--text-color)'} build={true} dev={true} value={dynamic_separator.single.value}
                                                />

                                                <Dropdown
                                                    trigger={['click']}
                                                    placement='left'
                                                    popupRender={() => (
                                                        <div className="grid-separators-container scroll-invitation" style={{
                                                            gridTemplateColumns: 'repeat(1, 1fr)', maxHeight: '300px',
                                                            backgroundColor: '#FFF', padding: '12px',
                                                            borderRadius: '16px', boxShadow: '0px 0px 12px rgba(0,0,0,0.2)',
                                                            transform: 'scale(0.7)', marginLeft: '-24px'
                                                        }}>

                                                            {
                                                                separadores.map((sep, index) => (
                                                                    <div key={index} onClick={() => handleDynamicSeparator(sep)} className="build-separator-container">
                                                                        <Separador MainColor={'var(--text-color)'} build={true} dev={true} value={sep}
                                                                        />
                                                                    </div>
                                                                ))
                                                            }

                                                        </div>
                                                    )}
                                                >
                                                    <Button
                                                        icon={<Pencil size={14} />}
                                                        style={{
                                                            position: 'absolute', top: '8px', right: '8px', backgroundColor: 'transparent', color: '#000', backdropFilter: 'blur(10px)',
                                                            border: '1px solid #FFFFFF40', borderRadius: '99px'
                                                        }}>


                                                    </Button>
                                                </Dropdown>
                                            </div>

                                            :

                                            <div className='image_col'>
                                                <div className='sep_img_cont'>
                                                    <img src={dynamic_separator.image.value} alt='' style={{
                                                        width: '100%', height: '100%', objectFit: 'cover'
                                                    }} />

                                                    <StorageImages placement={'right'} absolute={true} isNull={true} invitationID={invitationID} handleImage={handleImage} />
                                                </div>

                                                <div className='slider_col'>
                                                    <span >Alto</span>
                                                    <Slider onChange={(e) => handleSize(e, 'height')} style={{ width: '180px' }} step={10} min={50} max={500} value={dynamic_separator.image.height} />
                                                </div>


                                                <div className='slider_col'>
                                                    <span>Largo</span>
                                                    <Slider onChange={(e) => handleSize(e, 'width')} style={{ width: '180px' }} max={100} min={40} step={5} value={dynamic_separator.image.width} />
                                                </div>
                                            </div>

                                    }





                                </div>)}>
                            <Button onClick={(e) => e.stopPropagation()} type='text' icon={<ChevronDown size={16} style={{ marginTop: '4px' }} />}></Button>
                        </Dropdown>
                    </div>

                    {/* <div className={`menu_item ${!active && 'inactive_item'}`}>
                        <Sparkles size={16} />
                        <span>Generar texto</span>
                    </div> */}

                </div >
            )}
        >
            <Button type='text' icon={<EllipsisVertical size={18} />}>

            </Button>
        </Dropdown >
    )
}
