import React from 'react'
import './build-menu.css'
import { Button, Dropdown } from 'antd'
import {  ArrowDownRight, CirclePower, CopyPlus, DiamondPlus, EllipsisVertical, Paintbrush, PanelTopOpen, Play, Plus, PowerOff, SeparatorHorizontal, SlidersHorizontal, Sparkles, SquareChevronRight, SquaresExclude } from 'lucide-react'

export const BuildMenu = ({ active, separator, background, inverted, label, setInvitation, setSaved }) => {

    const handleActive = (value) => {
        console.log('handle active')
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            [label]: {
                ...prevInvitation[label],
                active: value,
            },
        }));

        setSaved(false);
    };

    const handleBackgorund = (e) => {

        setInvitation(prevInvitation => ({
            ...prevInvitation,
            [label]:  {
                ...prevInvitation[label],
                background: e,
            },
        }));
        setSaved(false)
    }


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
                separator: e,
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
                    <div onClick={() => handleActive(!active)} className={`menu_item ${active ? 'menu_active' :''}`}>
                       {active ? <CirclePower size={16} /> : <PowerOff size={16} />} 
                        <span>{active ? 'Módulo activo' : 'Módulo inactivo'}</span>
                    </div>

                    <div onClick={() => handleBackgorund(!background)} className={`menu_item ${!active && 'inactive_item'} ${background && 'menu_active'}`}>
                        <Paintbrush size={16} />
                        <span>Color de fondo</span>
                    </div>

                    <div onClick={() => handleInvert(!inverted)} className={`menu_item ${!active && 'inactive_item'} ${inverted && 'menu_active'}`}>
                        <SquaresExclude size={16} />
                        <span>Invertir color</span>
                    </div>

                    <div onClick={() => handleSeparator(!separator)} className={`menu_item ${!active && 'inactive_item'} ${separator && 'menu_active'}`}>
                        <SeparatorHorizontal size={16} />
                        <span>Agrergar separador</span>
                    </div>

                    {/* <div className={`menu_item ${!active && 'inactive_item'}`}>
                        <Sparkles size={16} />
                        <span>Generar texto</span>
                    </div> */}

                </div>
            )}
        >
            <Button  icon={<Plus size={16} style={{marginTop:'2px'}}/>}>

            </Button>
        </Dropdown>
    )
}
