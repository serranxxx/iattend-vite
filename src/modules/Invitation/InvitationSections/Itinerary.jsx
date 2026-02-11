import React, { useContext, useEffect, } from 'react'
import { Card } from '../../components/invitation/Card'
import { appContext } from '../../context/AuthContext'
import { Separador } from '../../components/invitation/Logos';
import '../../styles/modules/itinerary.css'
import '../../styles/modules/module-generals.css'
import AOS from 'aos';
import 'aos/dist/aos.css';
import { textures } from '../../helpers/textures';


export const Itinerary = ({ invitation, itineraryRef, dev }) => {
    const { font, colorPalette } = useContext(appContext);

    const content = invitation.itinerary
    const generals = invitation.generals

    useEffect(() => {
        AOS.init({
            duration: 900,       // duración de las animaciones (en ms)
            once: true,          // si se anima solo la primera vez
            easing: 'ease-out',  // tipo de easing
        });
    }, []);


    return (
        <>
            {
                content.active && colorPalette ?
                    <>
                        <div ref={itineraryRef} className='gm-container'
                            // {...(dev ? { 'data-aos': 'fade-left' } : {})}
                            style={{

                                backgroundColor: content.background ? colorPalette.secondary : 'transparent',
                                padding: content.background ? '32px' : '0px 32px',
                                position: 'relative'
                            }}
                        >
                            <div className="g-module-info-container" >

                                <span
                                    data-aos={!dev && generals.texture == null ? 'fade-right' : undefined}
                                    className={!dev ? "g-module-title" : "g-module-title-dev"}
                                    style={{
                                        color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent,
                                        fontFamily: font,
                                    }}
                                >
                                    {content.title}
                                </span>
                                <div
                                    data-aos={!dev && generals.texture == null  ? 'fade-right' : undefined}
                                    className='itinerary-cards-container'>
                                    <Card generals={generals} invertedColors={content.invertedColors} background={content.background} dev={dev} steps={content.object} MainColor={'#000000'} font={font} colorPalette={colorPalette} />
                                </div>

                            </div>

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
                            <Separador MainColor={colorPalette.accent} value={generals.separator} dev={dev} />
                        }
                    </>

                    : <></>
            }
        </>
    );
};

