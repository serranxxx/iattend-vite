import React, { useContext, useEffect } from 'react'
import { GalleryItems } from '../../components/invitation/GalleryItems'
import { buttonsColorText } from '../../helpers/functions'
import { appContext } from '../../context/AuthContext'
import { Separador } from '../../components/invitation/Logos'
import '../../styles/modules/gallery.css'
import '../../styles/modules/module-generals.css'
import AOS from 'aos';
import 'aos/dist/aos.css';
import { textures } from '../../helpers/textures'
import { Link } from 'react-router-dom'
import { Button } from 'antd'


export const Gallery = ({ invitation, galleryRef, dev, land }) => {

    const { theme, font, colorPalette } = useContext(appContext)
    const content = invitation.gallery
    const generals = invitation.generals
    const iid = invitation._id
    // const galleryRef = useRef(null)
    useEffect(() => {
        AOS.init({
            duration: 900,       // duración de las animaciones (en ms)
            once: true,          // si se anima solo la primera vez
            easing: 'ease-out',  // tipo de easing
        });
    }, []);

    return (
        <>

            {content.active && colorPalette && (
                <>
                    <div ref={galleryRef} className='gm-container'
                        // data-aos="fade-up"
                        style={{
                            backgroundColor: content.background ? colorPalette.secondary : 'transparent',
                            padding: content.background ? '32px' : '0px 32px',
                            position: 'relative'
                        }}
                    >
                        <div className="g-module-info-container">
                            <span
                                data-aos={!dev && generals.texture == null ? 'fade-right' : undefined}
                                className={!dev ? "g-module-title" : "g-module-title-dev"} style={{ fontFamily: font, color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent }}>
                                {content.title}
                            </span>


                            {
                            content.background && generals.texture !== null &&
                            <div className="image-texture-container">
                                <div className="image-texture-container">
                                    {Array.from({ length: 100 }).map((_, index) => (
                                        <img loading="lazy" decoding="async" alt='' key={index} src={textures[generals.texture]?.image} className="texture-img"
                                            style={{
                                                opacity: textures[generals?.texture]?.opacity,
                                                filter: textures[generals?.texture]?.filter,
                                                mixBlendMode: textures[generals?.texture]?.blend
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        }


                            <div
                                data-aos={!dev && generals.texture == null ? 'fade-right' : undefined}
                                style={{ zIndex: 2 }}
                                className="gifts-scroll-invitation"
                            // style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}
                            >
                                <GalleryItems colorPalette={colorPalette} content={content} dev={dev} land={land} generals={generals} />
                            </div>

                            {
                                iid === "686e7c9159f1ed21d0c351cc" &&
                                <>
                                    <span
                                        data-aos={!dev && generals.texture == null ? 'fade-right' : undefined}
                                        className={!dev ? "g-module-title" : "g-module-title-dev"} style={{ fontFamily: font, color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent }}>
                                        ¡Queremos que formes parte de este evento!
                                    </span>

                                    <span
                                        data-aos={!dev && generals.texture == null ? 'fade-left' : undefined}
                                        className={!dev ? "g-mdoule-regular-text" : "g-mdoule-regular-text-dev"}
                                        style={{
                                            color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent,
                                            fontFamily: font,
                                            gap: '24px'
                                        }}
                                    >
                                        Hemos añadido un botón especial para que puedas compartir tus fotos favoritas y revivir juntos los mejores momentos. 📸✨
                                    </span>

                                    <Link target='_blank' to={`https://drive.google.com/drive/folders/1qZKS0MG9wLXZzMW3LBq9x86A47l2doWK?usp=sharing`} style={{ textDecoration: 'none' }}>
                                        <Button className="dresscode-link-button" style={{ fontFamily: font, background: colorPalette.buttons, color: buttonsColorText(colorPalette.buttons), minWidth: '300px' }}>
                                            ¡Comparte tu foto favorita!
                                        </Button>
                                    </Link>
                                </>
                            }






                        </div>




                    </div>
                    {content.separator &&
                        <Separador MainColor={colorPalette.accent} theme={theme} value={generals.separator} dev={dev} />
                    }
                </>
            )}

        </>
    )
}
