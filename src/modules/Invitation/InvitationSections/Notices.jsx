import React, { useContext, useEffect, } from 'react'
import { appContext } from '../../../context/AuthContext'
import { Separador, } from '../../components/invitation/Logos'
import '../../styles/modules/module-generals.css'
import AOS from 'aos';
import 'aos/dist/aos.css';
import { textures } from '../../../helpers/services/textures'

export const Notices = ({ invitation, noticesRef, dev }) => {

    const { theme, font, colorPalette } = useContext(appContext)
    const content = invitation.notices
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
            {content.active && colorPalette ? (
                <>
                    <div
                        // data-aos="fade-up"
                        ref={noticesRef} className='gm-container' style={{
                            backgroundColor: content.background ? colorPalette.secondary : 'transparent',
                            padding: content.background ? '32px' : '0px 32px',
                            position: 'relative'
                        }}>
                        <div className="g-module-info-container">

                            <span
                                data-aos={!dev && generals.texture == null  ? 'fade-left' : undefined}
                                className={!dev ? "g-module-title" : "g-module-title-dev"} style={{ fontFamily: font, color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent }}>
                                {content.title}
                            </span>

                            {content.notices && content.notices.map((item, index) => (
                                <div key={index} className="g-module-items-single-col">
                                    <span
                                        data-aos={!dev && generals.texture == null  ? 'fade-left' : undefined}
                                        className={!dev ? "g-mdoule-regular-text" : "g-mdoule-regular-text-dev"}
                                        style={{
                                            color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent,
                                            fontFamily: font,
                                            gap: '24px'
                                        }}
                                    >
                                        {item}
                                    </span>

                                    {index < content.notices.length - 1 && (
                                        <span
                                            data-aos={!dev && generals.texture == null  ? 'fade-left' : undefined}
                                            className={!dev ? "g-mdoule-regular-text" : "g-mdoule-regular-text-dev"} style={{ fontFamily: font, color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent }}>
                                            ...
                                        </span>
                                    )}
                                </div>
                            ))}
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
                        <Separador MainColor={colorPalette.accent} theme={theme} value={generals.separator} dev={dev} />
                    }
                </>

            ) : null}
        </>
    )
}
