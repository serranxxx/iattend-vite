import React, { useContext, useEffect } from 'react';
import { appContext } from '../../context/AuthContext';
import { Separador } from '../../components/invitation/Logos';
import '../../styles/modules/module-generals.css';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { textures } from '../../helpers/textures';

export const Greeting = ({ invitation, greetingRef, dev }) => {

    const { theme, font, colorPalette } = useContext(appContext);

    const content = invitation.greeting
    const generals = invitation.generals

    useEffect(() => {
        AOS.init({
            duration: 900,
            once: true,
            easing: 'ease-out',
        });
    }, []);



    return (
        <>
            {content.active && colorPalette ? (
                <>
                    <div
                        // data-aos="fade-up" 
                        style={{ position: 'relative' }}
                        ref={greetingRef} className='gm-container'>
                        <div
                            className={"g-module-info-container"}
                            style={{
                                backgroundColor: content.background ? colorPalette.secondary : 'transparent',
                                padding: content.background ? '32px' : '0px 32px',
                                width: '100%', height: '100%',
                            }}
                        >
                            <span
                                data-aos={!dev && generals.texture == null  ? 'fade-left' : undefined}
                                className={!dev ? "g-module-title" : "g-module-title-dev"}
                                style={{ color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent, fontFamily: font }}
                            >
                                {content.title}
                            </span>
                            <span
                                data-aos={!dev && generals.texture == null ? 'fade-left' : undefined}
                                className={!dev ? "g-mdoule-regular-text" : "g-mdoule-regular-text-dev"}
                                style={{ color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent, fontFamily: font }}
                            >
                                {content.description}
                            </span>
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

                    {
                        content.separator &&
                        <Separador MainColor={colorPalette.accent} theme={theme} dev={dev} value={generals.separator} />
                    }
                </>
            ) : null}
        </>
    );
};