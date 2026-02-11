import React, { useEffect, useRef, useState, } from 'react'
import { Button, Dropdown, Slider } from 'antd';
import 'react-resizable/css/styles.css';
import ios_settings from '../../../../assets/images/iphone-settings.svg'
import android_settings from '../../../../assets/images/android-settings.png'
import ReactHost from '../../../../components/Host/ReactHost';
import { LuMinus, LuMonitorSmartphone, LuPlus } from 'react-icons/lu';
import { StorageImages } from '../../../../components/ImagesStorage/StorageImages';




const devices = [
    {
        name: 'iOS',
        value: 'ios'
    },
    {
        name: 'Android',
        value: 'android'
    }
]



export const BuildContent = ({
    positionY, setPositionY, invitation, coverUpdated, currentDevice, setDevice, invitationID
}) => {

    const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });
    const [zoomLevel, setZoomLevel] = useState(0.8);
    const mapContainerRef = useRef(null);
    const scrollableContentRef = useRef(null)

    const zoomStep = 0.01;
    const minZoom = 0.5;
    const maxZoom = 2;

    useEffect(() => {
        setPositionY(positionY)
    }, [coverUpdated])


    const startDrag = (event) => {
        setIsDragging(true);
        setLastMousePosition({ x: event.clientX, y: event.clientY });
    };

    const drag = (event) => {
        if (isDragging) {
            const deltaX = event.clientX - lastMousePosition.x;
            const deltaY = event.clientY - lastMousePosition.y;

            setMapPosition((prevPosition) => ({
                x: prevPosition.x + deltaX,
                y: prevPosition.y + deltaY,
            }));

            setLastMousePosition({ x: event.clientX, y: event.clientY });
        }
    };

    const stopDrag = () => {
        setIsDragging(false);
    };


    return (

        invitation && positionY && !coverUpdated ?
            <>

                <div className='web-devices device-container'
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column',
                        width: `auto`,
                        padding: '10px 30px',
                        position: 'relative',
                        // minHeight:'100vh',
                        flex: 1,
                    }}
                >
                    <div className='tools-settings-menu-container'>

                        <Dropdown
                            trigger={['click']}
                            placement='bottomLeft'
                            arrow
                            popupRender={() => (
                                <div className='devices-conatinaer'>
                                    {
                                        devices.map((device) => (
                                            <span className='devices-item' onClick={() => setDevice(device.value)} >{device.name}</span>
                                        ))
                                    }
                                </div>
                            )}
                        >
                            <Button
                                className='full-screen-button'
                                id="expandedbutton" icon={<LuMonitorSmartphone size={16} style={{ marginTop: '2px' }} />} />

                        </Dropdown>

                        <StorageImages invitationID={invitationID}/>

                        {/* <Dropdown
                            trigger={['click']}
                            placement='bottomLeft'
                            arrow
                            popupRender={() => (
                                <div className='images_storage_cont'>
                                    <div className='storage_row'>
                                        <span style={{ fontSize: '16px' }}><b>Almacenamiento de imágenes</b></span>
                                        <Upload
                                            accept="image/*"
                                            showUploadList={false}
                                            customRequest={customUpload}
                                        >
                                            <Button icon={<LuUpload />} className='primarybutton'>Subir imagen</Button>
                                        </Upload>

                                    </div>
                                    {
                                        images.length > 0 ?
                                            <div className='storage_imgs_cont scroll-invitation'>
                                                {
                                                    [...images].reverse()?.map((i, index) => (
                                                        <div className='storage_img' key={index}>
                                                            <img src={i.url} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            <Button onClick={() => deleteImageFromSupabase(i.path, invitationID, setImages)} className='storage_delete'>Eliminar</Button>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                            : <div className='empty_cont'>
                                                <Empty description="No tienes imágenes" />
                                            </div>
                                    }
                                </div>
                            )}
                        >
                            <Button
                                className='full-screen-button'
                                id="expandedbutton" icon={<LuArchive size={16} style={{ marginTop: '2px' }} />} />

                        </Dropdown> */}


                        <div className='slider-container'>
                            <LuPlus />
                            <Slider
                                vertical
                                min={minZoom}
                                max={maxZoom}
                                step={zoomStep}
                                onChange={(e) => setZoomLevel(e)}
                                value={zoomLevel}
                            />
                            <LuMinus />
                        </div>

                    </div>


                    <div
                        onMouseDown={startDrag}
                        onMouseMove={drag}
                        onMouseUp={stopDrag}
                        onMouseLeave={stopDrag}
                        ref={mapContainerRef}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexDirection: 'column',
                            width: `auto`,
                            position: 'relative',
                            transform: `scale(${zoomLevel})`,
                            top: `${mapPosition.y}px`,
                            left: `${mapPosition.x}px`,

                        }}>
                        <div className={`inv-device-main-container-${currentDevice}`} >
                            <div className={`device-buttons-container-${currentDevice}`}>
                                <div className={`device-button-${currentDevice}`} />
                                <div className={`device-button-${currentDevice}`} />
                                <div className={`device-button-${currentDevice}`} />
                            </div>
                            <div className={`device-power-button-${currentDevice}`} />
                            <div className={`inv-device-container-${currentDevice} scroll-invitation`}>

                                <div className={`inv-black-space-${currentDevice}`}>
                                    <span>5:15</span>
                                    <div className={`camera-${currentDevice}`} />
                                    <div>
                                        <img alt='' src={currentDevice === 'ios' ? ios_settings : android_settings} style={{
                                            height: '100%', objectFit: 'cover'
                                        }} />
                                    </div>
                                </div>

                                <div ref={scrollableContentRef} className={`scroll-invitation ${currentDevice}-invitation `}>
                                    <ReactHost config={invitation} />
    
                                </div>
                                <div className={`inv-light-space-${currentDevice}`} />
                            </div>
                        </div>
                    </div>

                </div >

                <div
                    style={{ transform: `scale(${zoomLevel})`, }}
                    className={`mobile-devices inv-device-main-container-${currentDevice}`}>
                    <div className={`device-buttons-container-${currentDevice}`}>
                        <div className={`device-button-${currentDevice}`} />
                        <div className={`device-button-${currentDevice}`} />
                        <div className={`device-button-${currentDevice}`} />
                    </div>
                    <div className={`device-power-button-${currentDevice}`} />
                    <div className={`inv-device-container-${currentDevice}`}>

                        <div className={`inv-black-space-${currentDevice}`}>
                            <span>5:15</span>
                            <div className={`camera-${currentDevice}`} />
                            <div>
                                <img alt='' src={currentDevice === 'ios' ? ios_settings : android_settings} style={{
                                    height: '100%', objectFit: 'cover'
                                }} />
                            </div>
                        </div>

                        <div ref={scrollableContentRef} className={`scroll-invitation ${currentDevice}-invitation`} >
                            <ReactHost config={invitation} />
                        </div>
                        <div className={`inv-light-space-${currentDevice}`} />
                    </div>
                </div>

                <div className='advertasing-container-mobile button-mobile'>
                    Edita desde una tablet o computadora
                </div>
            </>
            : <></>


    )
}

