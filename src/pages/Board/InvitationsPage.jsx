import React, { useContext, useEffect, useState, } from 'react'
import { Empty, Input, Layout, Row, message, Modal } from 'antd';
import { Login } from '../../components/Auth/Login';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LuLink2, } from 'react-icons/lu';
import { FooterApp } from '../../modules/Footer/FooterApp'
import { appContext } from '../../context';
import { HeaderBuild } from '../../modules/Header/Header';
import { load } from '../../helpers/assets/images';
import { darker } from '../../helpers/assets/functions';
import { RiArrowRightSLine } from 'react-icons/ri';
import { LoginPage } from '../LoginPage';

const { Content } = Layout;

const baseProd = "https://www.iattend.site"


export const InvitationsPage = () => {

    // const [openLogin, setOpenLogin] = useState(false)
    const [invitationsCopy, setInvitationsCopy] = useState(null)
    const [loader, setLoader] = useState(false)
    const { pathname } = useLocation();
    const [invitationsNI, setInvitationsNI] = useState(null)
    const { logout } = useContext(appContext)
    const sessions = JSON.parse(localStorage.getItem("session"));

    const navigate = useNavigate();

    const handleFilter = (value) => {
        setInvitationsCopy(
            invitationsNI.filter((inv) => inv.data?.cover?.title?.text?.value.toLowerCase().includes(value.toLowerCase()))
        );
    };

    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success('Link copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const handleMoode = (id) => {
        const params = new URLSearchParams({ id });
        navigate(`/dashboard?${params.toString()}`);
    };

    const getNewInvitations = async () => {

        if (!sessions) {
            console.log("No hay usuario autenticado");
            logout();
            navigate(`/login`);
            setLoader(false);
            return;
        }

        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
            console.error("Error al obtener la sesión:", sessionError);
            return;
        }

        if (!session) {
            console.log("No hay usuario autenticado");
            return;
        }

        setLoader(true)

        const { data, error } = await supabase
            .from("invitations")
            .select("*")
            .eq("user_id", session.user.id);

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            setLoader(false)
            setInvitationsNI(data)
        }
    };

    useEffect(() => {
        getNewInvitations();
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);


    useEffect(() => {
        setInvitationsCopy(invitationsNI)
    }, [invitationsNI])



    return (
        <div className='invitations-page-main-container'>

            <Layout
                style={{
                    position: 'relative', width: '100%', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--ft-color)',
                    // height: '100vh'
                }}>
                <HeaderBuild position={'invitations'} isVisible={true} />
                <Layout className='scroll-invitation build-invitation-layout main-dash-layout' style={{
                    marginTop: '80px', maxWidth: '100vw'
                }} >
                    {
                        loader ?
                            <div style={{
                                height: '80vh', display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                            }}>
                                <img alt='' src={load} style={{
                                    width: '200px'
                                }} />
                            </div>


                            : <Content className='invitations-main-content'>


                                {
                                    sessions?.logged ?
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column',
                                            position: 'relative', padding: '16px', gap: '24px', width: '100%',
                                        }}>
                                            <div className='inv-title-cta-filter'>

                                                <Row className='invs-header-ctas'>

                                                    <span className='guests-title-page'>Mis eventos ({invitationsCopy?.length})</span>
                                                    <Input
                                                        placeholder={'Búscar evento'}
                                                        onChange={(e) => handleFilter(e.target.value)}
                                                        className='invs-searcher' />


                                                </Row>


                                            </div>

                                            <div className={`inv-invitations-container`} >
                                                {
                                                    load ? (
                                                        invitationsCopy?.length > 0 ? (
                                                            invitationsCopy.map((invitation) => (
                                                                <div
                                                                    style={{ boxShadow: !invitation.started && '0px 0px 12px rgba(0,0,0,0.2)' }}
                                                                    key={invitation.id}
                                                                    className={`invitation-container`}
                                                                >
                                                                    <div className={`invitation-image-container`}>
                                                                        {
                                                                            invitation?.data?.cover?.image?.prod && (
                                                                                <img src={invitation.data.cover.image.prod} alt="Featured product" />
                                                                            )}
                                                                        <div style={{
                                                                            position: 'absolute', width: '100%', height: '100%', top: '0px', left: '0px',
                                                                            background: `linear-gradient(to top, ${darker(invitation.data.generals.colors.primary, 0.2)}, rgba(0,0,0,0))`,
                                                                            mixBlendMode: 'multiply'
                                                                        }}></div>

                                                                        <div className='background-cover-invitations-page'
                                                                            style={{
                                                                                flexDirection: invitation.data.cover.title.position.column_reverse,
                                                                                pointerEvents: 'none',
                                                                                zIndex: 0
                                                                            }}>


                                                                            <div style={{
                                                                                alignItems: invitation.data.cover.title.position.align_y,
                                                                                padding: invitation.data.cover.date.active ? 0 : '10px',

                                                                            }}>
                                                                                <span style={{
                                                                                    color: invitation.data.cover.title.text.color ?? "#FFFFFF", width: '100%',
                                                                                    textAlign: invitation.data.cover.title.position.align_x, fontSize: '38px', wordBreak: 'break-word',
                                                                                    opacity: invitation.data.cover.title.text.opacity, fontFamily: invitation.data.cover.title.text.typeFace, fontWeight: invitation.data.cover.title.text.weight,
                                                                                    lineHeight: '1.2'
                                                                                }}>{invitation.data.cover.title.text.value}</span>
                                                                            </div>


                                                                        </div>



                                                                    </div>

                                                                    {

                                                                        <div style={{
                                                                            position: 'absolute', bottom: 0, left: 0, width: '100%',
                                                                            boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                                                                            gap: '12px', padding: '16px', paddingBottom: '24px'
                                                                        }}>

                                                                            <span style={{ color: "#FFFFFF80" }}>
                                                                                {invitation.name}
                                                                            </span>
                                                                            <button
                                                                                onClick={() => handleMoode(invitation.id)}
                                                                                className='liquid-btn'
                                                                            >
                                                                                Comenzar
                                                                                <RiArrowRightSLine size={25} />
                                                                            </button>
                                                                        </div>
                                                                    }

                                                                    <button
                                                                        className='liquid-btn'
                                                                        style={{

                                                                            position: 'absolute', top: '12px', right: '12px',
                                                                            padding: '4px 12px', fontSize: '12px',
                                                                            boxShadow: '0px 0px 8px rgba(0,0,0,0.2)'
                                                                        }}
                                                                        disabled={!invitation.active}
                                                                        onClick={() => copyToClipboard(`${baseProd}/${invitation.data.generals.event.label}/${invitation.data.generals.event.name}`)}
                                                                        // onClick={() => handleQRO(invitation.mongo_id)}
                                                                        i
                                                                    ><LuLink2 size={14} /> Copiar link</button>

                                                                    <div
                                                                        className='state-dot--active'
                                                                        style={{
                                                                            position: 'absolute', top: '16px', left: '16px',
                                                                        }}
                                                                    ></div>


                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    width: '95vw',
                                                                    marginTop: '100px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                }}
                                                            >
                                                                <Empty style={{ marginTop: '50px' }} description={false} />
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div
                                                            style={{
                                                                width: '100%',
                                                                marginTop: '150px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}
                                                        >
                                                            <img
                                                                src={load}
                                                                style={{
                                                                    width: '200px',
                                                                }}
                                                                alt="Loading"
                                                            />
                                                        </div>
                                                    )
                                                }
                                            </div>

                                        </div>

                                        : <Layout
                                            style={{
                                                position: 'relative', width: '100%', display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center',
                                                backgroundColor: 'var(--ft-color)', minHeight: '60vh', marginTop: '160px'
                                                // height: '100vh'
                                            }}>
                                            <Login />
                                        </Layout>
                                    // <LoginPage />
                                }


                            </Content>
                    }



                </Layout>

                {/* {
                    startInvitation &&
                    <div className='start-invitation-main-container'>

                        <div className='start-invitations-modal' style={{ background: (invitationReady || Loading) && 'linear-gradient(-45deg, var(--brand-color-300), var(--ft-color), var(--brand-color-100))', width: invitationReady && '640px', padding: invitationReady && '36px', height: invitationReady && 'auto' }}>
                            {
                                !Loading && !invitationReady ?
                                    <>

                                        <Button
                                            onClick={handelClose}
                                            className='primarybutton close-start-modal-button'
                                            icon={<IoCloseSharp />} style={{
                                                position: 'absolute', right: '16px', top: '16px'
                                            }} />
                                        <div className='start-inv-col'>
                                            <span className='start-modal-title'>Elige las palabras que mejor describen tu evento ✨</span>
                                            <span className='start-modal-label'>Puedes seleccionar hasta 10 palabras que reflejen su esencia. Agrega nuevas palabras de ser necesario.</span>
                                            <div className='start-inv-row'>
                                                <Input
                                                    placeholder={'Agregar palabra ...'}
                                                    style={{ fontSize: '12px', backgroundColor: 'var(--ft-color-20)', border: 'none', color: 'var(--ft-color)', minHeight: '30px' }}
                                                    value={newWord}
                                                    onChange={(e) => setNewWord(e.target.value)}
                                                    className='gc-input-text text-area-ai' />
                                                <Button icon={<IoMdAdd size={16} style={{ marginTop: '2px', marginRight: '-2px' }} />} className='primarybutton'
                                                    onClick={handleExtraWords}
                                                    style={{
                                                        backgroundColor: 'var(--ft-color-50)', color: 'var(--ft-color)',
                                                        maxHeight: '30px', minWidth: '30px', fontSize: '12px'
                                                    }}>Agregar</Button>
                                            </div>
                                            <div className='start-words-container'>
                                                {
                                                    [...all_key, ...extraWords].map((word, id) => (
                                                        <div
                                                            onClick={() => {
                                                                keyWords.includes(word) ?
                                                                    setKeyWords(keyWords.filter(w => w !== word))
                                                                    : keyWords.length < 10 ? setKeyWords([...keyWords, word])
                                                                        : message.warning('Tienes hasta 10 palabras clave')
                                                            }
                                                            }
                                                            className={`word-tag ${keyWords.includes(word) ? 'key-word-selected' : ''}`}
                                                            key={id}
                                                        >
                                                            {word}
                                                        </div>
                                                    ))
                                                }
                                            </div>


                                        </div>
                                        <div className='start-inv-col'>
                                            <span className='start-modal-title'>Cuéntanos sobre evento</span>
                                            <span className='start-modal-label'>Platicanos sobre tu gran día: habla sobre los lugares, horarios y momentos importantes. Menciónanos a las personas especiales que quieras incluir, alguna frase significativa, los colores que te gustan o cualquier detalle que no pueda faltar. Cada detalle importa</span>
                                            <Button onClick={() => setOnExample(!onExample)} style={{ fontSize: '12px', backgroundColor: 'var(--ft-color-50)', color: 'var(--ft-color)' }} className='primarybutton'>{onExample ? 'Ocultar' : 'Ver ejemplo'}</Button>
                                            {
                                                onExample &&
                                                <span className='start-modal-label' style={{ color: 'var(--ft-color)', fontSize: '14px', textAlign: 'center', lineHeight: 1.8, padding: '0px 10%', boxSizing: 'border-box', margin: '12px 0px' }}>Nos vamos a casar el 15 de marzo en San Miguel de Allende. La ceremonia será a las 4:30 PM en la Parroquia de San Miguel Arcángel, y después habrá una recepción en el Jardín Las Bugambilias a partir de las 6:30 PM. Queremos que la boda sea romántica, con toques clásicos pero con un ambiente relajado. Nos gustan mucho los tonos blanco perla y azúl marino. Para nosotros es muy importante incluir a nuestros papás: Laura González, Enrique Méndez, Carmen Ruiz y Jorge Salazar.</span>
                                            }
                                            <Input.TextArea
                                                placeholder='Cuentanos sobre tu evento...'
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                autoSize={{ minRows: 8, }}
                                                className={`gc-input-text text-area-ai`}
                                                style={{
                                                    borderRadius: '8px', fontSize: '12px',
                                                    flex: 1, height: '100%', backgroundColor: 'var(--ft-color-20)', color: 'var(--ft-color)',
                                                    border: 'none'
                                                }} />
                                        </div>

                                        <div className='start-inv-col'>
                                            <span className='start-modal-title'>Por último, compártenos los datos más importantes</span>
                                            <span className='start-modal-label'>¿Qué título te gustaría que aparezca en la invitación? ¿Cuál es la fecha del evento? Y finalmente, compártenos una fotografía que los represente mejor.</span>
                                            <div className='start-inv-row'>
                                                <div className='start-inv-col' style={{ gap: '6px' }}>
                                                    <span className='gc-content-label' style={{ fontSize: '12px', color: 'var(--ft-color)' }}>Título de tu evento</span>
                                                    <Input
                                                        placeholder={'Andrés & Julieta'}
                                                        style={{ fontSize: '12px', backgroundColor: 'var(--ft-color-20)', border: 'none', color: 'var(--ft-color)' }}
                                                        value={selectedTitle}
                                                        onChange={(e) => setSelectedTitle(e.target.value)}
                                                        className='gc-input-text text-area-ai' />
                                                </div>

                                                <div className='start-inv-col' style={{ gap: '6px' }}>
                                                    <span className='gc-content-label' style={{ fontSize: '12px', color: 'var(--ft-color)' }}>Fecha del evento</span>
                                                    <DatePicker
                                                        className='gc-date-picker text-area-ai'
                                                        style={{ fontSize: '12px', backgroundColor: 'var(--ft-color-20)', border: 'none', color: 'var(--ft-color)' }}
                                                        onChange={setSelectedDate}
                                                        value={selectedDate}
                                                    />
                                                </div>
                                            </div>
                                            <div className='start-inv-col'>
                                                {
                                                    selectedCover ?
                                                        <div className="start-inv-row" style={{ alignSelf: 'stretch', justifyContent: 'flex-start', gap: '12px' }}>
                                                            <div style={{
                                                                backgroundColor: 'var(--ft-color-50)', color: 'var(--ft-color)', fontSize: '12px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', height: '30px', padding: '0px 16px', borderRadius: '99px'
                                                            }}>Imagen cargada <FaCheck style={{ marginLeft: '6px' }} /></div>
                                                            <Button
                                                                style={{ backgroundColor: 'var(--ft-color-50)', color: 'var(--ft-color)', fontSize: '12px' }}
                                                                onClick={deleteImageFB} className='primarybutton'>Eliminar</Button>
                                                        </div>
                                                        :
                                                        <Upload
                                                            onChange={handleCustomRequest}
                                                            showUploadList={false} // Oculta la lista de archivos subidos
                                                            beforeUpload={() => false} // Evita la carga automática de archivos
                                                        >

                                                            <Button
                                                                style={{ backgroundColor: 'var(--ft-color-50)', color: 'var(--ft-color)', fontSize: '12px' }}
                                                                className='primarybutton'
                                                                icon={<IoMdAdd size={20} />}>Subir imagen</Button>

                                                        </Upload>
                                                }
                                            </div>
                                        </div>
                                        <Button
                                            onClick={startCreating}
                                            icon={<BsStars />}
                                            style={{
                                                // fontSize: '16px', fontWeight: '600', height: '40px', width: '50%',
                                                marginTop: '16px', fontWeight: 600, color: 'var(--brand-color-600)',
                                                fontSize: '18px', padding: '12px 16px', minHeight: '35px'
                                            }} className='primarybutton'>Generar Invitación</Button>
                                    </>

                                    : !Loading && invitationReady ?
                                        <div className='invitation-ready-container'>
                                            <Button
                                                onClick={handelClose}
                                                className='primarybutton'
                                                icon={<IoCloseSharp />} style={{
                                                    position: 'absolute', right: '24px', top: '24px'
                                                }} />
                                            <div className='inv-ready-col'>
                                                <span className='start-modal-title' style={{ color: 'var(--brand-color-900)', fontSize: '40px', fontWeight: '700', lineHeight: 1.1 }}>¡Tu invitación ha sido creada!</span>
                                                <span className='start-modal-label' style={{ color: 'var(--brand-color-900)', fontSize: '20px', lineHeight: 1.1 }}>Ahora solo falta lo más importante:</span>
                                                <span className='start-modal-label' style={{ color: 'var(--brand-color-900)', fontSize: '20px', lineHeight: 1.1 }}><b className='accent-word'>tu toque personal.</b></span>
                                                <span className='start-modal-label' style={{ color: 'var(--brand-color-900)', fontSize: '20px', lineHeight: 1.1 }}>Es momento de comenzar a editar y hacerla única.</span>
                                                <Button onClick={() => handleMoode(selectedInvitation._id)} icon={<FaArrowRight size={14} />} className='primarybutton' style={{ fontSize: '16px', minHeight: '35px', }}>Comenzar a crear</Button>
                                            </div>

                                        </div>
                                        : <div
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: '80vh'
                                            }}
                                        >
                                            <img
                                                src={load}
                                                style={{
                                                    width: '200px'
                                                }}
                                                alt="Loading"
                                            />
                                        </div>
                            }

                        </div>

                    </div>
                } */}

            </Layout >
            <FooterApp></FooterApp>

        </div>
    )
}
