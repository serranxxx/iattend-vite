
import {
    BuildCover, BuildGreeting, BuildFamily, BuildQuote, BuildItinerary,
    BuildDressCode, BuildGifts, BuildNotices, BuildGallery, BuildGenerals,
} from '../BuildSections';
import { BuildDestinations } from '../BuildSections/BuildDestinations';
import './build-invitation.css'
import { useState } from 'react';
import { Button, Grid } from 'antd';
import { LuChevronsLeft, LuChevronDown, LuChevronUp } from 'react-icons/lu';

const { useBreakpoint } = Grid;

export const BuildMenu = ({ buttons, invitation, setInvitation, currentSection, setSaved, setSettingsModal, settingsModal,
    onHide, setOnHide, hideMenu, invitationID
}) => {

    const screens = useBreakpoint();
    const [expanded, setExpanded] = useState(false);

    const handleEditor = (type) => {
        switch (type) {
            case 'generals': return <BuildGenerals  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'cover': return <BuildCover invitationID={invitationID} settingsModal={settingsModal} setSettingsModal={setSettingsModal} invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'greeting': return <BuildGreeting  invitationID={invitationID}  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'family': return <BuildFamily   invitationID={invitationID} invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'quote': return <BuildQuote invitationID={invitationID}  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'itinerary': return <BuildItinerary invitationID={invitationID}  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'dresscode': return <BuildDressCode invitationID={invitationID}  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'gifts': return <BuildGifts  invitationID={invitationID} invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'destinations': return <BuildDestinations invitationID={invitationID}  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'notices': return <BuildNotices  invitationID={invitationID} invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'gallery': return <BuildGallery invitationID={invitationID} invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />

            default:
                break;
        }
    }

    const mobileHeight = expanded ? 'calc(100vh - 86px)' : '300px';

    const mobileWrapperStyle = screens.xs ? {
        position: 'fixed',
        bottom: '56px',
        left: 0,
        width: '100%',
        height: mobileHeight,
        zIndex: 9998,
        transform: onHide ? 'translateY(calc(100% + 60px))' : 'translateY(0)',
        transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), height 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        backgroundColor: '#FFFFFF',
        boxShadow: '0px -6px 12px rgba(0,0,0,0.2)',
        borderRadius: '36px 36px 0px 0px',
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
                        paddingTop: '12px', paddingBottom: '8px', paddingLeft: '16px', paddingRight: '8px',
                        flexShrink: 0, boxSizing: 'border-box',
                    }}
                >
                    <div onClick={hideMenu} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <div style={{ width: '80px', height: '4px', borderRadius: '99px', backgroundColor: '#D0D0D0' }} />
                    </div>
                    <Button
                        type='text'
                        icon={expanded ? <LuChevronDown size={18} /> : <LuChevronUp size={18} />}
                        onClick={() => setExpanded(v => !v)}
                        style={{ borderRadius: '99px', flexShrink: 0 }}
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
