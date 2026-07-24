import React, { useEffect, useRef, useState, } from 'react'
import { Button, Dropdown, Grid, Slider } from 'antd';
import 'react-resizable/css/styles.css';

const { useBreakpoint } = Grid;
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
    positionY, setPositionY, invitation, coverUpdated, currentDevice, setDevice, invitationID, onHide, setOnHide, onSectionChange, textureOverride
}) => {

    const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });
    const [zoomLevel, setZoomLevel] = useState(0.8);
    const mapContainerRef = useRef(null);
    const scrollableContentRef = useRef(null);
    const screens = useBreakpoint();

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

                <div onClick={screens.xs ? () => !onHide ? setOnHide(true) : () => {} : () => {}} className='web-devices device-container'
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column',
                        width: `auto`,
                        padding: '10px 30px',
                        position: 'relative',
                        zIndex: 0,
                        flex: 1,
                        // minHeight: screens.xs ? 'calc(100vh - 120px)' : undefined,
                    }}
                >

                    {
                        !screens.xs &&
                    
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

                    }


                    <div
                        onMouseDown={startDrag}
                        onMouseMove={drag}
                        onMouseUp={stopDrag}
                        onMouseLeave={stopDrag}
                        ref={mapContainerRef}
                        style={screens.xs ? {
                            position: 'absolute',
                            top: '55%',
                            left: '52%',
                            transform: `translate(-50%, -50%) scale(.85)`,
                            zIndex: '0'
                        } : {
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexDirection: 'column',
                            width: 'auto',
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
                                    <ReactHost config={invitation} onHide={onHide} scrollToSection={positionY} onSectionChange={onSectionChange} textureOverride={textureOverride} />

                                </div>
                                <div className={`inv-light-space-${currentDevice}`} />
                            </div>
                        </div>
                    </div>

                </div >

                <div className='mobile-devices' onClick={() => setOnHide(true)} style={{ width: '100%', height: '100vh', overflowY: 'auto', paddingBottom: '0px', boxSizing: 'border-box' }}>
                    <ReactHost config={invitation} onHide={onHide} screens={screens.xs} scrollToSection={positionY} onSectionChange={onSectionChange} textureOverride={textureOverride}/>
                </div>
            </>
            : <></>


    )
}

