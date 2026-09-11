import React, { useEffect, useRef, useState, } from 'react'
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Grid, Slider, Tooltip } from 'antd';
import 'react-resizable/css/styles.css';

const { useBreakpoint } = Grid;
import ios_settings from '../../../../assets/images/iphone-settings.svg'
import android_settings from '../../../../assets/images/android-settings.png'
import ReactHost from '../../../../components/Host/ReactHost';
import { LuArrowLeft, LuMinus, LuMonitorSmartphone, LuPlus, LuRedo2, LuUndo2 } from 'react-icons/lu';
import { ChevronLeft, CircleHelp, Ellipsis, Mic, Search } from 'lucide-react';
import { StorageImages } from '../../../../components/ImagesStorage/StorageImages';
import { LanguageSelector } from '../../../../components/LanguageSelector/LanguageSelector';




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
    positionY, setPositionY, invitation, coverUpdated, currentDevice, setDevice, invitationID, onHide, setOnHide, onSectionChange, textureOverride, fontOverride,
    languages, disabledLanguages, activeLang, onActiveLangChange, onAddLanguage, onToggleLanguageEnabled, onRetranslate, translating, minimalControls = false, onBack,
    onUndo, onRedo, canUndo, canRedo, onReplayTour, tourOpen
}) => {

    const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });
    const [zoomLevel, setZoomLevel] = useState(0.8);
    const mapContainerRef = useRef(null);
    const scrollableContentRef = useRef(null);
    const screens = useBreakpoint();
    const { t } = useTranslation();

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

                        {onUndo && (
                            <Button
                                className='full-screen-button'
                                id="undobutton"
                                data-tour="undo"
                                disabled={!canUndo}
                                onClick={onUndo}
                                icon={<LuUndo2 size={16} style={{ marginTop: '2px' }} />} />
                        )}

                        {onRedo && (canRedo || tourOpen) && (
                            <Button
                                className='full-screen-button'
                                id="redobutton"
                                data-tour="redo"
                                disabled={!canRedo}
                                onClick={onRedo}
                                icon={<LuRedo2 size={16} style={{ marginTop: '2px' }} />} />
                        )}

                        {!minimalControls && <>
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
                                    data-tour="devices"
                                    id="expandedbutton" icon={<LuMonitorSmartphone size={16} style={{ marginTop: '2px' }} />} />

                            </Dropdown>

                            <div data-tour="images" style={{ display: 'flex' }}>
                                <StorageImages invitationID={invitationID}/>
                            </div>

                            <div data-tour="translate" style={{ display: 'flex' }}>
                            <LanguageSelector
                                languages={languages}
                                disabledLanguages={disabledLanguages}
                                activeLang={activeLang}
                                onActiveLangChange={onActiveLangChange}
                                onAddLanguage={onAddLanguage}
                                onToggleLanguageEnabled={onToggleLanguageEnabled}
                                onRetranslate={onRetranslate}
                                translating={translating}
                            />
                            </div>
                        </>}

                        {minimalControls && onBack && (
                            <Button
                                className='full-screen-button'
                                id="expandedbutton"
                                onClick={onBack}
                                icon={<LuArrowLeft size={16} />} />
                        )}

                        <div className='slider-container' data-tour="zoom">
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

                        {/* Relanza el tour del editor (BuildTour). */}
                        {onReplayTour && (
                            <Tooltip placement='left' title={t('build_tour.replay')}>
                                <Button
                                    className='full-screen-button'
                                    data-tour="tour-replay"
                                    aria-label={t('build_tour.replay')}
                                    onClick={onReplayTour}
                                    icon={<CircleHelp size={16} style={{ marginTop: '2px' }} />} />
                            </Tooltip>
                        )}

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
                        {currentDevice === 'ios' ? (
                            /* iPhone 17 Pro · Safari a pantalla completa: el contenido ocupa
                               toda la pantalla y la isla, el status y el nav flotan encima. */
                            <div className='ios26-device' data-tour="preview">
                                <div className='ios26-buttons'>
                                    <span />
                                    <span />
                                    <span />
                                </div>
                                <div className='ios26-power' />

                                <div className='ios26-screen'>
                                    <div ref={scrollableContentRef} className='scroll-invitation ios26-content'>
                                        <ReactHost config={invitation} onHide={onHide} scrollToSection={positionY} onSectionChange={onSectionChange} textureOverride={textureOverride} fontOverride={fontOverride} activeLang={activeLang} />
                                    </div>

                                    <div className='ios26-island' />

                                    <div className='ios26-status'>
                                        <span>9:41</span>
                                        <img alt='' src={ios_settings} />
                                    </div>

                                    <div className='ios26-nav'>
                                        <div className='ios26-nav-round'>
                                            <ChevronLeft size={20} strokeWidth={2.4} />
                                        </div>
                                        <div className='ios26-nav-pill'>
                                            <Search size={16} strokeWidth={2.4} />
                                            <span>iattend.mx</span>
                                            <Mic size={16} strokeWidth={2.4} />
                                        </div>
                                        <div className='ios26-nav-round'>
                                            <Ellipsis size={20} strokeWidth={2.4} />
                                        </div>
                                    </div>

                                    <div className='ios26-home' />
                                </div>
                            </div>
                        ) : (
                            <div className={`inv-device-main-container-${currentDevice}`} data-tour="preview" >
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
                                            <img alt='' src={android_settings} style={{
                                                height: '100%', objectFit: 'cover'
                                            }} />
                                        </div>
                                    </div>

                                    <div ref={scrollableContentRef} className={`scroll-invitation ${currentDevice}-invitation `}>
                                        <ReactHost config={invitation} onHide={onHide} scrollToSection={positionY} onSectionChange={onSectionChange} textureOverride={textureOverride} fontOverride={fontOverride} activeLang={activeLang} />

                                    </div>
                                    <div className={`inv-light-space-${currentDevice}`} />
                                </div>
                            </div>
                        )}
                    </div>

                </div >

                <div className='mobile-devices' onClick={() => setOnHide(true)} style={{ width: '100%', height: '100vh', overflowY: 'auto', paddingBottom: '0px', boxSizing: 'border-box' }}>
                    <ReactHost config={invitation} onHide={onHide} screens={screens.xs} scrollToSection={positionY} onSectionChange={onSectionChange} textureOverride={textureOverride} fontOverride={fontOverride} activeLang={activeLang}/>
                </div>
            </>
            : <></>


    )
}

