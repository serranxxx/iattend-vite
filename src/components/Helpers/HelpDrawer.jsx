import { Drawer, Row } from 'antd'
import React, { useEffect, useState } from 'react'
import { FaLink } from 'react-icons/fa'
import { GrLocation } from 'react-icons/gr'
import { HiOutlinePlus } from 'react-icons/hi2'
import { LuBadgeHelp } from 'react-icons/lu'
import { PiSpotifyLogoBold } from 'react-icons/pi'

export const HelpDrawer = ({ visible, setVisible, type, setType }) => {


    const [title, setTitle] = useState(null)
    const [description, setDescription] = useState(null)
    const [drawerIcon, setIcon] = useState(null)


    const handleClose = () => {
        setVisible(false)
        setType(null)

        // setTitle(null)
        // setDescription(null)
    }


    useEffect(() => {

        if (visible) {
            switch (type) {
                case 'orden':
                    setTitle('Orden de la invitación')
                    setDescription('¡Personaliza el orden de los módulos según tus preferencias y necesidades! Con esta función, puedes reorganizar fácilmente los diferentes elementos de tu invitación para que se adapten perfectamente a lo que quieres transmitir.')
                    setIcon(<LuBadgeHelp className='drawer--icon' />)
                    break;

                case 'instancias':
                    setTitle('¡Crea una instancia!')
                    setDescription(' Las instancias son pequeñas actividades que suceden dentro de un momento. ¿Quieres agregar una? ¡Hazlo aquí!')
                    setIcon(<HiOutlinePlus className='drawer--icon' />)
                    break;

                case 'playlist':
                    setTitle('¡Comparte una playlist!')
                    setDescription('¿Tienes una playlist en Spotify que capture perfectamente tu momento? ¡Comparte su magia con tus invitados aquí mismo!')
                    setIcon(<PiSpotifyLogoBold className='drawer--icon' />)
                    break

                case 'address':
                    setTitle('Agrega una dirección')
                    setDescription('¡Añade y comparte la dirección de tu evento con todos tus invitados de manera fácil y rápida! Solo ingresa la dirección del lugar y todos podrán ver un mapa interactivo que los guiará directamente hasta tu evento. Asegúrate de que nadie se pierda y todos lleguen a tiempo.')
                    setIcon(<GrLocation className='drawer--icon' />)
                    break

                case 'links-dresscode':
                    setTitle('Muestra tus ideas mediante links')
                    setDescription('Compaerte enlaces a páginas con inspiración para los outfits. Ayuda a tus invitados a encontrar el look perfecto compartiendo tus sugerencias y referencias favoritas. Agrega el nombre de la página y un link')
                    setIcon(<FaLink className='drawer--icon' />)
                    break

                default:
                    break;
            }
        }



    }, [visible])


    return (
        <Drawer
            // title="Basic Drawer"
            placement="top"
            className='help-drawer'
            closable={false}
            onClose={handleClose}
            open={visible}
            height={'250px'}
            style={{
                backgroundColor: '#FFA700',
            }}
        // key={placement}
        >
            <div className='drawer-container'>
                <Row style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                    flexDirection: 'row'
                }}>
                    {drawerIcon}
                    <h1 className='drawer--title'>{title}</h1>

                </Row>

                <p className='drawer--description'>{description}</p>

            </div>

        </Drawer>
    )
}
