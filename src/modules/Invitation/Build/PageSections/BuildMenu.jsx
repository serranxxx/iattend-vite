
import {
    BuildCover, BuildGreeting, BuildFamily, BuildQuote, BuildItinerary,
    BuildDressCode, BuildGifts, BuildNotices, BuildGallery, BuildGenerals,
} from '../BuildSections';
import { BuildDestinations } from '../BuildSections/BuildDestinations';
import './build-invitation.css'
import { Button } from 'antd';
import { LuChevronsLeft } from 'react-icons/lu';

export const BuildMenu = ({ buttons, invitation, setInvitation, currentSection, setSaved, setSettingsModal, settingsModal,
    onHide, setOnHide, invitationID
}) => {


    const handleEditor = (type) => {
        switch (type) {
            case 'generals': return <BuildGenerals  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'cover': return <BuildCover invitationID={invitationID} settingsModal={settingsModal} setSettingsModal={setSettingsModal} invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'greeting': return <BuildGreeting  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'family': return <BuildFamily  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'quote': return <BuildQuote invitationID={invitationID}  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'itinerary': return <BuildItinerary invitationID={invitationID}  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'dresscode': return <BuildDressCode invitationID={invitationID}  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'gifts': return <BuildGifts  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'destinations': return <BuildDestinations invitationID={invitationID}  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'notices': return <BuildNotices  invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
            case 'gallery': return <BuildGallery invitationID={invitationID} invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />

            default:
                break;
        }
    }


    return (

        <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
            flexDirection: 'column', position: 'relative'
        }}>
            <div
                className='build-content-modules-main-container scroll-invitation'
                style={{
                    width: onHide ? '0px' : '370px',
                    padding: onHide ? '0px' : '22px',
                    overflow: 'auto',
                    zIndex: settingsModal ? 5 : 2,
                    maxHeight: '850px',
                    borderRadius: '24px',
                    position: 'relative',
                    paddingBottom: '50px'
                    // border:'1px solid red'
                }} >



                {!onHide &&
                    handleEditor(buttons[currentSection - 1].type)
                }



            </div>

            {
                !onHide &&
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, zIndex: 99,
                    width: '100%',
                    //  height: '30px',
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
