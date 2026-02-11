import React, { useContext, useEffect,  useState } from 'react'
import { buttonsColorText, } from '../../helpers/functions'
import { appContext } from '../../context/AuthContext'
import { Separador } from '../../components/invitation/Logos'
import { Button } from 'antd'
import { Link } from 'react-router-dom'
import '../../styles/modules/dresscode.css'
import '../../styles/modules/module-generals.css'
import AOS from 'aos';
import 'aos/dist/aos.css';
import { textures } from '../../helpers/textures'


export const DressCode = ({ invitation, dresscodeRef, dev, land }) => {

    const {  font, colorPalette } = useContext(appContext)
    const [images, setImages] = useState(null)

    const content = invitation.dresscode
    const generals = invitation.generals

    useEffect(() => {
        if (invitation) {
            setImages(dev && !land ? invitation.dresscode.images_dev : invitation.dresscode.images_prod)
        }
    }, [invitation])

    useEffect(() => {
        AOS.init({
            duration: 900,       // duración de las animaciones (en ms)
            once: true,          // si se anima solo la primera vez
            easing: 'ease-out',  // tipo de easing
        });
    }, []);



    return (
        <>
            {content.active && colorPalette ? (
                <>
                    <div
                        //data-aos={!dev ? 'fade-left' : undefined} 
                        ref={dresscodeRef} className='gm-container'
                        style={{
                            backgroundColor: content.background ? colorPalette.secondary : 'transparent',
                            padding: content.background ? '32px' : '0px 32px', position: 'relative'
                        }}>
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
                        <div className="g-module-info-container">

                            <span
                                data-aos={!dev && generals.texture == null  ? 'fade-left' : undefined}
                                className={!dev && !land ? "g-module-title" : "g-module-title-dev"} style={{ color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent, fontFamily: font }}>
                                {content.title}
                            </span>

                            <span
                                data-aos={!dev && generals.texture == null ? 'fade-left' : undefined}
                                className={!dev && !land ? "g-mdoule-regular-text" : "g-mdoule-regular-text-dev"} style={{ color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent, fontFamily: font }}>
                                {content.description}
                            </span>

                            {content.colors && (
                                <div className="dresscode-colors">
                                    {content.colors.map((color, index) => (
                                        <div
                                            data-aos={!dev && generals.texture == null  ? 'fade-left' : undefined}
                                            key={index} className="dresscode-color" style={{ backgroundColor: color, marginRight: index + 1 === content.colors.length ? '0' : '10px' }} />
                                    ))}
                                </div>
                            )}

                            {content.onImages && (
                                <div className="gifts-scroll-invitation"style={{ zIndex: 2 }} >
                                    {images && images.map((image, index) => (
                                        <div
                                            data-aos={!dev && generals.texture == null ? 'fade-left' : undefined}
                                            style={{ position: 'relative' }}
                                            key={index} className="dresscode-image-container">
                                            <img loading="lazy" decoding="async" src={image} className="dresscode-image" alt={`Dresscode ${index}`} />

                                            {/* {
                                                generals.texture !== null &&
                                                <div className="image-texture-container">
                                                    <div className="image-texture-container">
                                                        {Array.from({ length: 10 }).map((_, index) => (
                                                            <img alt='' key={index} src={textures[generals.texture].image} className="texture-img"
                                                                style={{
                                                                    opacity: textures[generals.texture].opacity,
                                                                    filter: textures[generals.texture].filter,
                                                                    mixBlendMode: textures[generals.texture].blend
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            } */}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {content.onLinks && (
                                <div className="dresscode-links">
                                    {content.links && content.links.map((link, index) => (
                                        <Link
                                            data-aos={!dev && generals.texture == null  ? 'fade-left' : undefined}
                                            key={index} to={link.URL} target='_blank' className="dresscode-link">
                                            <Button className="dresscode-link-button" style={{ fontFamily: font, background: content.background && content.invertedColors ? colorPalette.primary : colorPalette.buttons, color: content.background && content.invertedColors ? colorPalette.accent : buttonsColorText(colorPalette.buttons) }}>
                                                {link.name}
                                            </Button>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    {content.separator &&
                        <Separador MainColor={colorPalette.accent} dev={dev} value={generals.separator} />
                    }</>

            ) : null}
        </>

    )
}


