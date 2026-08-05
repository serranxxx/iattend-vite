
import {
    BuildCover, BuildGreeting, BuildFamily, BuildQuote, BuildItinerary,
    BuildDressCode, BuildGifts, BuildNotices, BuildGallery, BuildGenerals,
} from '../BuildSections';
import { BuildDestinations } from '../BuildSections/BuildDestinations';
import './build-invitation.css'
import { useState } from 'react';
import { Button, Grid } from 'antd';
import { LuChevronsLeft, LuChevronDown, LuChevronUp } from 'react-icons/lu';
import { ArrowRight, Bookmark } from 'lucide-react';

const { useBreakpoint } = Grid;

export const BuildMenu = ({ buttons, invitation, setInvitation, currentSection, setSaved, setSettingsModal, settingsModal,
    onHide, setOnHide, hideMenu, invitationID, activeLang, onPublish, onSave, saving
}) => {

    const screens = useBreakpoint();
    const [expanded, setExpanded] = useState(false);

    // key=activeLang fuerza remount del módulo activo al cambiar de idioma —
    // los Build*.jsx guardan un espejo en useState sincronizado por efectos
    // con dependencias puntuales, no reaccionan solos a que "invitation" pase
    // a ser una referencia distinta (la traducción) sin desmontar/montar.
    const handleEditor = (type) => {
        const langKey = activeLang ?? 'es'
        switch (type) {
            case 'generals': return <BuildGenerals key={langKey} invitationID={invitationID} invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'cover': return <BuildCover key={langKey} invitationID={invitationID} settingsModal={settingsModal} setSettingsModal={setSettingsModal} invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'greeting': return <BuildGreeting key={langKey} invitationID={invitationID}  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'family': return <BuildFamily key={langKey} invitationID={invitationID} invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'quote': return <BuildQuote key={langKey} invitationID={invitationID}  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'itinerary': return <BuildItinerary key={langKey} invitationID={invitationID}  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'dresscode': return <BuildDressCode key={langKey} invitationID={invitationID}  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'gifts': return <BuildGifts key={langKey} invitationID={invitationID} invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'destinations': return <BuildDestinations key={langKey} invitationID={invitationID}  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'notices': return <BuildNotices key={langKey} invitationID={invitationID} invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'gallery': return <BuildGallery key={langKey} invitationID={invitationID} invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />

            default:
                break;
        }
    }

    // bottom:56px + esta altura deben sumar exactamente 100vh para que, expandido,
    // el panel llegue hasta el borde superior real de la pantalla sin dejar hueco.
    const mobileHeight = expanded ? 'calc(100vh - 56px)' : '300px';

    // Oculto = el panel se encoge a solo la fila de controles (chevrons/Guardar/CTA),
    // que sigue siempre visible y tocable. El formulario queda clippeado por overflow:hidden
    // (no por transform), así que no queda ninguna zona "fantasma" capturando touches
    // encima del iframe de la invitación cuando el usuario quiere hacer scroll manual.
    const CONTROLS_ROW_HEIGHT = 64;
    const mobileWrapperStyle = screens.xs ? {
        position: 'fixed',
        bottom: '56px',
        left: 0,
        width: '100%',
        height: onHide ? `${CONTROLS_ROW_HEIGHT}px` : mobileHeight,
        zIndex: 9998,
        transition: 'height 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        backgroundColor: '#FFFFFF',
        boxShadow: '0px -6px 12px rgba(0,0,0,0.2)',
        borderRadius: '24px 24px 0px 0px',
        overflow: 'hidden',
    } : {};

    return (

        <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
            flexDirection: 'column', position: 'relative',
            ...mobileWrapperStyle
        }}>
            {screens.xs && (
                <div
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: '8px', padding: '12px', boxSizing: 'border-box'
                    }}
                >
                    <Button
                        className='primarybutton'
                        icon={<LuChevronDown size={16} />}
                        onClick={hideMenu}
                        style={{ width: '32px', height: '32px', flexShrink: 0 }}
                    />

                    {onSave && (
                        <Button
                            icon={<Bookmark size={14} />}
                            onClick={onSave}
                            loading={saving}
                            className='primarybutton'
                            style={{ width: '40px', height: '40px', flexShrink: 0 }}
                        />
                    )}

                    {onPublish && (
                        <Button
                            block
                            className='primarybutton--active'
                            icon={<ArrowRight size={16} />}
                            style={{ flex: 1, borderRadius: 16, height: 40, fontSize: 14, fontWeight: 700 }}
                            onClick={onPublish}
                        >
                            Quiero mi invitación
                        </Button>
                    )}

                    <Button
                        className={(!onHide && expanded) ? 'primarybutton--active' : 'primarybutton'}
                        icon={<LuChevronUp size={16} />}
                        onClick={() => {
                            if (onHide) {
                                // cerrado -> abre a la mitad (primer estado de la iteración)
                                setOnHide(false)
                                setExpanded(false)
                            } else {
                                // ya abierto -> itera entre mitad y pantalla completa
                                setExpanded(v => !v)
                            }
                        }}
                        style={{ width: '32px', height: '32px', flexShrink: 0 }}
                    />
                </div>
            )}
            <div
                className='build-content-modules-main-container scroll-invitation'
                style={{
                    display: screens.xs ? 'block' : undefined,
                    width: screens.xs ? '100%' : (onHide ? '0px' : '370px'),
                    padding: onHide && !screens.xs ? '0px' : '22px',
                    overflow: 'auto',
                    zIndex: settingsModal ? 5 : 2,
                    maxHeight: screens.xs ? undefined : '850px',
                    flex: screens.xs ? 1 : undefined,
                    minHeight: screens.xs ? 0 : undefined,
                    borderRadius: screens.xs ? '0px' : '24px',
                    position: 'relative',
                    paddingBottom: '50px',
                    boxSizing: 'border-box',
                    background: screens.xs ? 'transparent' : undefined,
                    backdropFilter: screens.xs ? 'none' : undefined,
                    boxShadow: screens.xs ? 'none' : undefined,
                }} >

                {(!onHide || screens.xs) &&
                    handleEditor(buttons[currentSection - 1].type)
                }

            </div>

            {
                !onHide && !screens.xs &&
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, zIndex: 99,
                    width: '100%',
                    backgroundColor: '#FFFFFF40', backdropFilter: 'blur(10px)', borderRadius: '0px 0px 24px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                    boxSizing: 'border-box', padding: '4px 8px'
                }}>
                    <Button onClick={() => setOnHide(!onHide)} type='text' style={{ borderRadius: '99px' }} icon={<LuChevronsLeft size={16} />}>

                    </Button>
                </div>
            }
        </div>

    )
}
