import { Input } from 'antd'
import { useEffect, useState } from 'react';
import { TbEyeClosed } from 'react-icons/tb';
import { BuildMenu } from '../../../../components/BuildMenu/BuildMenu';


export const BuildGreeting = ({ invitation, setInvitation, setSaved, invitationID }) => {

    const [onGeneration] = useState(false)
    const [titleValue, setTitleValue] = useState(null)
    const [descriptionValue, setDescriptionValue] = useState(null)

    // const handleGenerating = () => {
    //     const getRandomGreeting = (label) => {
    //         const greetingsMap = {
    //             wedding: greetingsAI.weeding,
    //             xv: greetingsAI.xv,
    //             kids: greetingsAI.kids,
    //             bap: greetingsAI.bap,
    //             event: greetingsAI.event,
    //             party: greetingsAI.party,
    //         };

    //         const selectedGreeting = greetingsMap[label];
    //         if (selectedGreeting) {
    //             const title = selectedGreeting.titles[Math.floor(Math.random() * 9)];
    //             const description = selectedGreeting.texts[Math.floor(Math.random() * 9)];
    //             return { title, description };
    //         }
    //         return { title: '', description: '' };
    //     };

    //     const { title: local_title, description: local_description } = getRandomGreeting(invitation.generals.event.label);


    //     setTitleValue('Generando ...');
    //     setDescriptionValue('Generando ...');

    //     setTimeout(() => {
    //         setTitleValue(local_title)
    //         // typeText(local_title, setTitleValue);
    //         setTimeout(() => {
    //             setDescriptionValue(local_description)
    //             // typeDescription(local_description, setDescriptionValue);
    //         }, 300);

    //     }, 2500);

    //     setOnGeneration(true);

    //     setTimeout(() => {
    //         setInvitation(prevInvitation => ({
    //             ...prevInvitation,
    //             greeting: {
    //                 ...prevInvitation.greeting,
    //                 title: local_title,
    //                 description: local_description,
    //             },
    //         }));
    //         setSaved(false);
    //         setOnGeneration(false);
    //     }, 2500);
    // };

    const onChangeTitle = (e) => {
        setTitleValue(e.target.value)
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            greeting: {
                ...prevInvitation.greeting,
                title: e.target.value
            },
        }));
        setSaved(false)
    }

    const onChangeDescription = (e) => {
        setDescriptionValue(e.target.value)
        setInvitation(prevInvitation => ({
            ...prevInvitation,
            greeting: {
                ...prevInvitation.greeting,
                description: e.target.value
            },
        }));
        setSaved(false)
    }

    useEffect(() => {
        setTitleValue(invitation.greeting.title)
        setDescriptionValue(invitation.greeting.description)
    }, [])
    

    return (
        <>
            {
                invitation ?
                    <div className='scroll-item generals-main-container'>
                        <div className='build-component-elements'>

                            <div className='general-cards-single-row' style={{ width: '100%', justifyContent: 'space-between' }}>
                                <div className='general-cards-single-row'>
                                    <span className={'module--title'}
                                        style={{
                                            width: 'auto',
                                        }}
                                    >Bienvenida</span>
                                </div>

                                <BuildMenu invitation={invitation} label={'greeting'} setInvitation={setInvitation} setSaved={setSaved} invitationID={invitationID} />

                            </div>


                            {
                                invitation.greeting.active ?

                                    <>
                                        <div className='build-generals-simple-column'>
                                            <span className='gc-content-label'>Título</span>

                                            <Input.TextArea
                                                onChange={onChangeTitle}
                                                value={titleValue}
                                                autoSize={{ minRows: 2, maxRows: 10 }}
                                                style={{ width: '100%', transition: 'all 0.3s ease', borderRadius: '12px' }}
                                                className={`gc-input-text ${onGeneration ? 'magic-effect' : ''}`} />
                                        </div>



                                        <div className='build-generals-simple-column'>
                                            <span className='gc-content-label'>Descripción</span>
                                            <Input.TextArea
                                                value={descriptionValue}
                                                onChange={onChangeDescription}
                                                autoSize={{ minRows: 10, maxRows: 20 }}
                                                className={`gc-input-text ${onGeneration ? 'magic-effect' : ''}`}
                                                style={{ borderRadius: '12px', minWidth: '290px', transition: 'all 0.3s ease' }} />
                                        </div>
                                    </>


                                    : <div style={{
                                        width: '100%', height: '300px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}><TbEyeClosed size={32} style={{ color: '#717171' }} /></div>
                            }

                        </div>
                    </div>
                    : <></>
            }
        </>
    )
}




