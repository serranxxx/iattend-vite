import { Button, Drawer, Row } from 'antd'
import React, { useEffect, useState } from 'react'
import { PiSpotifyLogoBold } from 'react-icons/pi'
import { gifs } from '../../helpers/assets/images'

export const HowToDrawer = ({ visible, setVisible, type, setType }) => {


    const [title, setTitle] = useState(null)
    const [description, setDescription] = useState(null)
    const [ setIcon] = useState(null)
    const [image, setImage] = useState(null)


    const handleClose = () => {
        setVisible(false)
        setType(null)

        // setTitle(null)
        // setDescription(null)
    }


    useEffect(() => {

        if (visible) {
            switch (type) {

                case 'spotify':
                    setTitle('¿Cómo compartir un album o una playlist?')
                    setDescription('En la página de la playlist, haz clic en el ícono de tres puntos junto al botón de reproducción, selecciona "Share" (Compartir) y luego "Copy link to playlist" (Copiar enlace de la playlist) para copiar el enlace al portapapeles automáticamente.')
                    setIcon(<PiSpotifyLogoBold className='drawer--icon' />)
                    setImage(gifs.howToSpotify)
                    break

                case 'maps':
                    setTitle('¿Cómo compartir una ubicación desde Google Maps')
                    setDescription('Una vez que encuentres la ubicación en Google Maps, haz clic en el marcador rojo y, en la ventana de información que aparece, selecciona "Share" (Compartir). En la ventana emergente, haz clic en "Copy link" (Copiar enlace) para copiar el enlace al portapapeles.')
                    setIcon(<PiSpotifyLogoBold className='drawer--icon' />)
                    setImage(gifs.howToMaps)
                    break

                default: break


            }
        }



    }, [visible])


    return (
        <Drawer
            // title="Basic Drawer"
            placement="left"
            className='help-drawer-how-to'
            closable={false}
            onClose={handleClose}
            open={visible}
            width={'50%'}
            // height={'250px'}
            style={{
                backgroundColor: '#F5F5F7',
            }}
        // key={placement}
        >
            <div className='drawer-container-how-to'>
                <Row style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                    flexDirection: 'row'
                }}>
                    {/* {drawerIcon} */}
                    <h1 className='drawer--title--ht'>{title}</h1>

                </Row>

                <hr style={{
                    width: '100%',
                    height: '2px',
                    backgroundColor: 'var(--text-color)',
                    borderRadius: '30px',
                    margin: '45px 0'
                }} />

                <span className='drawer--description--ht'>{description}</span>


                {
                    image ?
                        <div className='gif--container'>
                            <img src={image} />
                        </div>
                        : <></>
                }

                <Button
                    onClick={handleClose}
                    className='primarybutton--active' style={{
                        width: '20%'
                    }}>Cerrar</Button>




            </div >

        </Drawer >
    )
}
