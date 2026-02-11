import React, { useContext, useEffect } from 'react'
import { appContext } from '../../context/AuthContext'
import { Separador } from '../../components/invitation/Logos'
import '../../styles/modules/module-generals.css'
import '../../styles/modules/quote.css'
import AOS from 'aos';
import 'aos/dist/aos.css';
import { textures } from '../../helpers/textures'

export const Quote = ({ invitation, quoteRef, dev }) => {

    const content = invitation.quote
    const generals = invitation.generals

    const { theme, font, colorPalette } = useContext(appContext)
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
                        data-aos={!dev && generals.texture == null  ? 'fade-left' : undefined}
                        ref={quoteRef} className='gm-container' style={{
                            backgroundColor: content.background ? colorPalette.secondary : colorPalette.primary,
                            position: 'relative', overflow: 'hidden',
                            zIndex:0

                        }}>

                        {
                            content.image ?
                                <>

                                    <div
                                        style={{ backgroundColor: colorPalette.primary }}
                                        className={`background-image-quote-container ${!dev ? 'qt-image-cnt' : ''}`}>

                                        <img loading="lazy" decoding="async" alt='' src={dev ? content.image_dev : content.image_prod} />

                                    </div>



                                    {
                                        content.text.shadow &&
                                        <div className={!dev ? 'qt-image-cnt' : ''} style={{
                                            position: 'absolute', width: '100%', height: '400px',
                                            top: '0px', left: '50%', transform: 'translate(-50%)',
                                            background: `linear-gradient(to top, ${colorPalette.accent}, rgba(0,0,0,0))`
                                        }}>

                                        </div>
                                    }


                                    <div className={`quote-text-container ${!dev ? 'qt-image-cnt' : ''}`} style={{
                                        height: '400px', display: 'flex', alignItems: content.text.align,
                                        position: 'absolute', width: '100%',
                                        top: '0px', left: '50%', transform: 'translate(-50%)',
                                        padding: '24px', justifyContent: 'center'
                                    }}>

                                        <span
                                            className={!dev ? "g-mdoule-regular-text" : "g-mdoule-regular-text-dev"}
                                            style={{
                                                whiteSpace: 'pre-line',
                                                color: content.text.color,
                                                fontFamily: content.text.font,
                                                fontSize: `${content.text.size}px`,
                                                opacity: content.text.opacity,
                                                fontWeight: content.text.weight,
                                                textAlign: content.text.justify,
                                                width: `${content.text.width}%`,
                                            }}
                                        >
                                            {content.description}
                                        </span>
                                    </div>
                                </>
                                :
                                <span
                                    className={!dev ? "g-mdoule-regular-text" : "g-mdoule-regular-text-dev"}
                                    style={{
                                        color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent,
                                        fontFamily: font,
                                        fontSize: `16px`,
                                        textAlign: 'center',
                                        width: '60%',
                                        fontStyle: 'italic',
                                        padding: '64px 0px'
                                    }}
                                >
                                    {content.description}
                                </span>
                        }



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


                    </div>




                    {content.separator &&
                        <Separador MainColor={colorPalette.accent} theme={theme} dev={dev} value={generals.separator} />
                    }
                </>
            ) : null}
        </>
    );
}
