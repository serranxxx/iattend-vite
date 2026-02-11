import { Button, Row, message, Input, Switch, Slider, Tooltip } from 'antd'
import { useRef, useState } from 'react';
// import { supabase } from '../../lib/supabase';
import { IoClose } from 'react-icons/io5';
import { MdEdit } from 'react-icons/md';
import { PiShareFatFill } from 'react-icons/pi';
import { darker, formatDate } from '../../helpers/assets/functions';
import { load } from '../../helpers/assets/images';



const baseProd = "https://www.iattend.site"


export const QRHandler = ({ visible, setVisible, }) => {

    const sectionRef = useRef(null);
    const [onEditCard, setOnEditCard] = useState(false)
    const [onShareCard, setOnShareCard] = useState(false)
    const [greetingText, setGreetingText] = useState(true)
    const [QRHeight, setQRHeight] = useState(120)
    const [invitationType] = useState(true)
    const [supaInv] = useState(null)

    // const getNewInvitations = async (invitation_id) => {

    //     const { data, error } = await supabase
    //         .from("invitations")
    //         .select("data")
    //         .eq("mongo_id", invitation_id)
    //         .maybeSingle();

    //     if (error) {
    //         console.error("Error al obtener invitaciones:", error);
    //     } else {
    //         // console.log("invitation from dashboard: ", data.data)
    //         setSupaInv(data.data)
    //     }

    // };

    // useEffect(() => {
    //     getNewInvitations(mongoID)
    // }, [mongoID])


    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success('Link copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    // const takeScreenshot = async () => {
    //     if (sectionRef.current) {
    //         try {
    //             const canvas = await html2canvas(sectionRef.current, {
    //                 useCORS: true, // Habilita CORS
    //                 allowTaint: false, // Evita problemas con imágenes externas
    //                 logging: true, // Para depuración
    //                 scale: 2, // Aumenta la resolución del canvas
    //             });
    //             const dataUrl = canvas.toDataURL("image/png");

    //             // Descargar la imagen como archivo PNG
    //             const link = document.createElement("a");
    //             link.href = dataUrl;
    //             link.download = `${supaInv?.generals?.event?.name}.png`;
    //             link.click();
    //         } catch (error) {
    //             console.error("Error capturando el screenshot:", error);
    //         }
    //     }
    // };

    // // Función para copiar la imagen al portapapeles
    // const copyImageToClipboard = async () => {
    //     if (sectionRef.current) {
    //         message.info('Procesando ...')
    //         try {
    //             const canvas = await html2canvas(sectionRef.current, {
    //                 useCORS: true, // Habilita CORS
    //                 allowTaint: false, // Evita problemas con imágenes externas
    //                 logging: true, // Para depuración
    //                 scale: 2, // Aumenta la resolución del canvas
    //             });
    //             const blob = await new Promise((resolve) => canvas.toBlob(resolve));
    //             await navigator.clipboard.write([
    //                 new ClipboardItem({ "image/png": blob }),
    //             ]);
    //             message.success('Imagen copiada')
    //         } catch (error) {
    //             console.error("Error copiando al portapapeles:", error);
    //         }
    //     }
    // };

    // const convertToBase64 = async (imageUrl) => {
    //     return new Promise((resolve, reject) => {
    //         const img = new Image();
    //         img.crossOrigin = "anonymous";
    //         img.src = imageUrl;

    //         img.onload = () => {
    //             const canvas = document.createElement("canvas");
    //             canvas.width = img.width;
    //             canvas.height = img.height;
    //             const ctx = canvas.getContext("2d");
    //             ctx.drawImage(img, 0, 0);
    //             resolve(canvas.toDataURL("image/png"));
    //         };

    //         img.onerror = (error) => reject(error);
    //     });
    // };

    // useEffect(() => {
    //     const loadImage = async (imageUrl) => {

    //         try {
    //             setLoader(true)
    //             const base64 = await convertToBase64(imageUrl);
    //             setBackgroundImage(base64);
    //             setLoader(false)
    //         } catch (error) {
    //             console.error("Error convirtiendo la imagen a Base64:", error);
    //         }
    //     };

    //     if (supaInv) {
    //         if (supaInv?.cover?.image?.prod) {
    //             loadImage(supaInv.cover.image.prod);
    //         }

    //     }
    //     setOnEditCard(false)
    //     setInvitationType(true)
    // }, [visible, supaInv])


    const onShare = () => {
        setOnShareCard(!onShareCard)
        setOnEditCard(false)
    }

    const onEdit = () => {
        setOnEditCard(!onEditCard)
        setOnShareCard(false)

    }

    // useEffect(() => {
    //     // setOnEditCard(false)
    //     setOnShareCard(false)
    // }, [])






    return (
        <div onClick={() => setVisible(false)} style={{
            display: visible ? 'flex' : 'none', alignItems: 'flex-start', justifyContent: 'flex-start',
            width: '100vw', height: '100vh', background: '#00000070', position: 'fixed', top: 0,
            left: 0, padding:'24px', boxSizing:'border-box',
            zIndex: 999
        }}>
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    top: '10px',
                    transition: 'all 0.5s ease-in-out',
                    minWidth: '370px', maxHeight: '750px',
                    padding: '6px',
                    transform: 'scale(0.9)',
                    backgroundColor: 'transparent',
                    zIndex: '1000',
                    
                    // height:''
                }}

            >

                {
                    supaInv ?
                        <div  style={{
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', gap: '24px'
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column',
                                boxSizing: 'border-box', backgroundColor: 'var(--ft-color)', borderRadius: '24px 24px 44px 44px',
                                boxShadow: '0px 0px 24px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
                                // gap: '12px',
                            }}>
                                <div className='qr-switch-card'
                                style={{justifyContent:'flex-end',}}
                                >

                                    <div className='qr-buttons-header-cont'>
                                        <Tooltip color='var(--text-color)' placement='topRight' title="Cerrar">
                                            <Button
                                                className='primarybutton'
                                                style={{ borderRadius: '99px' }}
                                                icon={<IoClose size={16} style={{
                                                    marginTop: '3px'
                                                }} />}
                                                onClick={() => setVisible(false)} />
                                        </Tooltip>

                                        <Tooltip color='var(--text-color)' placement='topRight' title="Editar tarjeta">
                                            <Button onClick={onEdit}
                                                style={{ borderRadius: '99px' }}
                                                className={`primarybutton`}
                                                icon={<MdEdit size={16} />} />
                                        </Tooltip>

                                        <Tooltip color='var(--text-color)' placement='bottomRight' title="Compartir">
                                            <Button onClick={onShare}
                                                style={{ borderRadius: '99px' }}
                                                className={`primarybutton`}
                                                icon={<PiShareFatFill size={16} />}>
                                                {/* Compartir Tarjeta */}
                                            </Button>
                                        </Tooltip>


                                        {
                                            onEditCard && (
                                                <div className='qr-edit-card' style={{ left: !invitationType && '191px' }}>

                                                    <Row style={{

                                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        marginBottom: '10px',
                                                    }}>
                                                        <span className='qr-label' style={{
                                                            textAlign: 'left'
                                                        }}>Mensaje de Bienvenida</span>
                                                        <Switch
                                                            style={{
                                                                marginLeft: '10px'
                                                            }}
                                                            size='small'
                                                            checked={greetingText}
                                                            onChange={(e) => setGreetingText(e)}
                                                        />
                                                    </Row>

                                                    <Row style={{

                                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                                    }}>
                                                        <span className='qr-label' style={{
                                                            textAlign: 'left'
                                                        }}>Tamaño del QR</span>
                                                        <Slider
                                                            style={{ width: '50%' }}
                                                            min={50}
                                                            max={200}
                                                            step={10}
                                                            onChange={(e) => setQRHeight(e)}
                                                            value={QRHeight}
                                                        />
                                                    </Row>


                                                </div>
                                            )
                                        }

                                        {
                                            onShareCard && (
                                                <div className='qr-edit-card' style={{ left: !invitationType && '191px' }}>
                                                    {/* <Row style={{
                                                        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                                                        width: '100%', padding: '5px',
                                                    }}>
                                                        <span className='qr-label'>Tarjeta de Invitación</span>
                                                        <Row style={{
                                                            width: '100%', marginTop: '5px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column'
                                                        }}>
                                                            <Button
                                                                icon={<FiCopy />}
                                                                style={{ width: '100%', marginBottom: '5px', }}
                                                                id="qr-action-button" onClick={copyImageToClipboard}>Copiar Imagen</Button>
                                                            <Button
                                                                icon={<IoArrowDownOutline />}
                                                                style={{ width: '100%' }}
                                                                id="qr-action-button" onClick={takeScreenshot}>Descargar Imagen</Button>
                                                        </Row>

                                                    </Row> */}

                                                    <Row style={{
                                                        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column',
                                                        width: '100%', padding: '5px'
                                                    }}>
                                                        <span className='qr-label'>Link de la invitación</span>
                                                        <Row
                                                            style={{
                                                                width: '100%', marginTop: '5px'
                                                            }}
                                                        >
                                                            <Input
                                                                id="qr-action-button"
                                                                style={{
                                                                    flex: 3, marginRight: '5px', backgroundColor: 'var(--ft-color-50)',
                                                                }} value={!invitationType ? `${baseProd}/${supaInv?.generals?.event?.label}/${supaInv?.generals?.event?.name}/easy` : `${baseProd}/${supaInv?.generals?.event?.label}/${supaInv?.generals?.event?.name}`}></Input>
                                                            <Button
                                                                onClick={() => copyToClipboard(!invitationType ? `${baseProd}/${supaInv?.generals?.event?.label}/${supaInv?.generals?.event?.name}/easy` : `${baseProd}/${supaInv?.generals?.event?.label}/${supaInv?.generals?.event?.name}`)}
                                                                id="qr-action-button-primary">Copiar Link</Button>
                                                        </Row>


                                                    </Row>
                                                </div>
                                            )
                                        }

                                    </div>

                                    {/* <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px',
                                        fontSize: '16px'
                                    }}>
                                        <span>{invitationType ? 'Regular' : 'Sin interacción'}</span>
                                        <Switch value={invitationType} onChange={setInvitationType} />
                                    </div> */}


                                </div>
                                <div className='qr-drawer-container' style={{ position: 'relative' }}>
                                    <div style={{
                                        // boxShadow: '0px 0px 12px rgba(0,0,0,0.15)',
                                        position: 'relative', overflow: 'hidden',
                                        borderRadius: '44px',
                                    }}

                                    >

                                        <div className="qr-card-container" style={{
                                            height: '750px', transition: 'all 0.3s ease',
                                            borderRadius: '32px', overflow: 'hidden'
                                        }}>

                                            <div className='module-cover-container' style={{
                                                position: 'relative', height: '100%',
                                                overflow: 'hidden', borderRadius: '32px'

                                            }}>


                                                <div ref={sectionRef}
                                                    className={'cover-container'}
                                                    style={{
                                                        height: '100%', margin: '0px',
                                                        position: 'relative', borderRadius: '32px'
                                                    }}>
                                                    <div className='qr-bright-shadow'>
                                                    </div>
                                                    {
                                                        // bgImage &&
                                                        <div
                                                            className="image-card-qr"
                                                            style={{
                                                                backgroundImage: `url(${supaInv?.cover?.image?.prod})`,
                                                                backgroundSize: "cover",
                                                                backgroundPosition: "center",
                                                                borderRadius: '0px'
                                                            }}
                                                        ></div>
                                                    }

                                                    <div className='qr-background-cover'
                                                        style={{
                                                            background: `linear-gradient(to top, ${darker(supaInv?.generals?.colors?.primary, 0.2)}, rgba(0,0,0,0))`,
                                                            borderRadius: '0px'

                                                        }}>



                                                        <div className='cover--title-container' style={{
                                                            alignItems: supaInv?.cover?.title?.position?.align_y,
                                                            marginTop: '20px',
                                                            flex: 1,
                                                            width: '90%',



                                                        }}>
                                                            <span style={{
                                                                color: supaInv?.cover?.title?.text?.color, width: '100%',
                                                                textAlign: supaInv?.cover?.title?.position?.align_x, fontSize: `${supaInv?.cover?.title?.text?.size}px`, wordBreak: 'break-word',
                                                                opacity: supaInv?.cover?.title?.text?.opacity,
                                                                fontFamily: supaInv?.cover?.title?.text?.typeFace,
                                                                fontWeight: supaInv?.cover?.title?.text?.weight,
                                                                lineHeight: '0.9',

                                                            }}>{supaInv?.cover?.title?.text?.value}</span>
                                                        </div>

                                                        {
                                                            greetingText && (
                                                                <span style={{
                                                                    color: supaInv?.cover?.date?.color,
                                                                    width: '90%',
                                                                    textAlign: 'center', fontSize: `22px`, wordBreak: 'break-word',
                                                                    fontFamily: 'Poppins',
                                                                    lineHeight: '1.1',
                                                                    fontWeight: 400,
                                                                    marginTop: '20px',
                                                                    opacity: '0.8',


                                                                }}>
                                                                    {supaInv.greeting.title}
                                                                </span>
                                                            )
                                                        }



                                                        <span style={{
                                                            color: supaInv?.cover?.date?.color, width: '100%',
                                                            textAlign: 'center', fontSize: `14px`, wordBreak: 'break-word', fontFamily: 'Poppins',
                                                            lineHeight: '0.8',
                                                            margin: '20px 0px',
                                                            opacity: 0.8,
                                                            marginTop: greetingText ? '10px' : '20px',

                                                        }}>
                                                            {formatDate(supaInv?.cover?.date?.value)}
                                                        </span>



                                                        <div style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column',
                                                            overflow: 'hidden',
                                                            // height: '210px', minHeight: '210px',
                                                            opacity: '0.8',

                                                            marginBottom: '30px'
                                                        }}>


                                                            {/* <QRCodeCanvas
                                                                bgColor={'transparent'} fgColor={supaInv?.cover?.date?.color}
                                                                value={!invitationType ? `${baseProd}/${supaInv?.generals?.event?.label}/${supaInv?.generals?.event?.name}/easy` : `${baseProd}/${supaInv?.generals?.event?.label}/${supaInv?.generals?.event?.name}`}
                                                                size={QRHeight} /> */}
                                                        </div>



                                                    </div>

                                                </div>
                                            </div>

                                        </div>

                                    </div>

                                </div>
                            </div>
                            {
                                !invitationType &&
                                <div
                                    className='non-interaction-label-mobile'
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column',
                                        gap: '16px', backgroundColor: 'var(--ft-color)', width: '400px', borderRadius: '44px',
                                        boxShadow: '0px 0px 24px rgba(0, 0, 0, 0.25)', padding: '24px', boxSizing: 'border-box',
                                        borderBottomLeftRadius: '0px', marginTop: '56px'
                                    }}>
                                    <span>
                                        Una <b>invitación sin interacción</b> está diseñada para invitados que pueden tener dificultades para ingresar códigos de acceso o confirmar su asistencia por su cuenta.
                                    </span>

                                    <span>Este tipo de invitación <b>no requiere ninguna acción por parte del invitado</b>: no incluye botones de confirmación ni solicita códigos.</span>

                                    <span>
                                        En su lugar, <b>tú puedes confirmar por ellos</b> directamente desde el panel de administración, facilitando la gestión de invitados con acceso limitado a dispositivos.
                                    </span>

                                </div>
                            }
                        </div>

                        : <div style={{
                            height: '100vh', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', flexDirection: 'column',
                            position: 'relative'
                            // backgroundColor: lighter(MainColor, 0.9)
                        }}>
                            <img alt="" src={load} style={{
                                width: '200px'
                                // width: '10%'
                            }} />
                            <span style={{

                            }} className='qr-label' >Por favor espera</span>
                        </div>
                }

            </div>
        </div>
    )
}




