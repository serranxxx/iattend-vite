import React, { useEffect, useRef, useState, } from 'react'
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Grid, Slider, Tooltip } from 'antd';
import 'react-resizable/css/styles.css';

const { useBreakpoint } = Grid;
import ReactHost from '../../../../components/Host/ReactHost';
import { ArrowLeft as LuArrowLeft, Minus as LuMinus, MonitorSmartphone as LuMonitorSmartphone, Plus as LuPlus, Redo2 as LuRedo2, Undo2 as LuUndo2 } from 'lucide-react';
import { CircleHelp } from 'lucide-react';
import { StorageImages } from '../../../../components/ImagesStorage/StorageImages';
import { LanguageSelector } from '../../../../components/LanguageSelector/LanguageSelector';
import { EditCanvas, LivePill } from './EditCanvas';
import { DevicePreview } from './DevicePreview';




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
    onUndo, onRedo, canUndo, canRedo, onReplayTour, tourOpen,
    // `pantalla` sustituye a la invitación dentro del marco del teléfono. El
    // laboratorio la usa para meter un iframe y ver cómo se comporta un sitio
    // externo en el mismo contexto en el que se vería dentro de i attend, sin
    // tener que montar una invitación de mentira.
    pantalla,
    // Onboarding: aviso de que el iframe cargó y una capa encima de la pantalla
    // (la portada de carga) mientras tanto.
    onHostReady, hostOverlay,
    // Entorno de edición (escritorio): con `live` apagado la pieza se muestra
    // plana y editable (EditCanvas); prendido, dentro del teléfono como la ve
    // el invitado. Si no llega `onToggleLive` (preview, laboratorio) solo
    // existe el teléfono.
    live = true, onToggleLive, selectedSection, onSelectSection, onFieldChange,
    selectedField, onClearField, onCanvasBlur, deselectSignal = 0, setInvitation, setSaved,
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

        (pantalla || (invitation && positionY)) && !coverUpdated ?
            <>

                <div
                    onClick={screens.xs ? () => !onHide ? setOnHide(true) : () => {} : () => {}}
                    // Modo edición: tocar el tablero fuera de la pieza (y fuera de los
                    // popovers) suelta lo elegido adentro, como en los Eventos Flash.
                    onPointerDown={!live && onToggleLive ? (e) => { if (!e.target.closest('[data-tour="preview"], [data-edit-keep], .ant-dropdown, .ant-popover, .ant-select-dropdown, .ant-color-picker')) onCanvasBlur?.() } : undefined}
                    className='web-devices device-container'
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

                        {onToggleLive && <LivePill on={live} onToggle={onToggleLive} />}

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
                        {!live && !screens.xs && onToggleLive ? (
                            <EditCanvas
                                invitation={invitation}
                                invitationID={invitationID}
                                selectedSection={selectedSection}
                                onSelectSection={onSelectSection}
                                onFieldChange={onFieldChange}
                                scrollToSection={positionY}
                                onSectionChange={onSectionChange}
                                textureOverride={textureOverride}
                                fontOverride={fontOverride}
                                activeLang={activeLang}
                                onHostReady={onHostReady}
                                deselectSignal={deselectSignal}
                                selectedField={selectedField}
                                onClearField={onClearField}
                                setInvitation={setInvitation}
                                setSaved={setSaved}
                                onUndo={onUndo}
                                canUndo={canUndo}
                            />
                        ) : (
                            <DevicePreview device={currentDevice} hostOverlay={hostOverlay} scrollRef={scrollableContentRef}>
                                {pantalla ?? <ReactHost config={invitation} onHide={onHide} scrollToSection={positionY} onSectionChange={onSectionChange} textureOverride={textureOverride} fontOverride={fontOverride} activeLang={activeLang} onReady={onHostReady} />}
                            </DevicePreview>
                        )}
                    </div>

                </div >

                <div className='mobile-devices' onClick={() => setOnHide(true)} style={{ width: '100%', height: '100dvh', overflowY: 'auto', paddingBottom: '0px', boxSizing: 'border-box' }}>
                    {/* Este bloque y el marco de arriba conviven siempre: el CSS esconde
                        uno u otro según el ancho. Para la invitación da igual, pero una
                        `pantalla` prestada se montaría dos veces —y si trae un iframe,
                        el sitio recibe dos visitas por cada prueba—, así que ahí se
                        deja solo el marco. */}
                    {pantalla ? null : <ReactHost config={invitation} onHide={onHide} screens={screens.xs} scrollToSection={positionY} onSectionChange={onSectionChange} textureOverride={textureOverride} fontOverride={fontOverride} activeLang={activeLang}/>}
                </div>
            </>
            : <></>


    )
}

