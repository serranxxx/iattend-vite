import React, { useContext, useEffect, } from 'react'
import { Button, } from 'antd'
import { buttonsColorText, } from '../../helpers/functions'
import { appContext } from '../../context/AuthContext'
import { Separador } from '../../components/invitation/Logos'
import '../../styles/modules/module-generals.css'
import AOS from 'aos';
import 'aos/dist/aos.css';
import { Link } from 'react-router-dom'
import { textures } from '../../helpers/textures'


export const Family = ({ invitation, familyRef, dev }) => {
    const { theme, font, colorPalette } = useContext(appContext)

    const content = invitation.family
    const generals = invitation.generals
    const iID = invitation._id
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
                        ref={familyRef} className='gm-container' style={{
                            backgroundColor: content.background ? colorPalette.secondary : 'transparent',
                            padding: content.background ? '32px' : '0px 32px', position: 'relative'
                        }}>
                        <div
                            className="g-module-info-container"
                        >
                            <span
                                data-aos={!dev && generals.texture == null  ? 'fade-right' : undefined}
                                className={!dev ? "g-module-title" : "g-module-title-dev"}
                                style={{ color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent, fontFamily: font }}
                            >
                                {content.title}
                            </span>

                            {content.personas ? (
                                content.personas.map((persona, index) => (
                                    <div 
                                    key={index}
                                    tyle={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column',
                                        gap: '12px', alignSelf: 'stretch'
                                    }}>
                                        <div
                                            data-aos={!dev && generals.texture == null  ? 'fade-right' : undefined}
                                            key={index}
                                            className="g-module-items-single-col"
                                        >
                                            <span
                                                className={!dev ? "g-mdoule-light-text" : "g-mdoule-light-text-dev"}
                                                style={{
                                                    fontFamily: font,
                                                    color: content.background && content.invertedColors ? `${colorPalette.primary}99` : `${colorPalette.accent}99`,
                                                }}
                                            >
                                                {persona.title}
                                            </span>

                                            <span
                                                className={!dev ? "g-mdoule-regular-text" : "g-mdoule-regular-text-dev"}
                                                style={{
                                                    fontFamily: font,
                                                    color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent,
                                                }}
                                            >
                                                {persona.name}
                                            </span>
                                        </div>

                                        {
                                            iID === '68197efe0c26ac9a844b9fcd' &&
                                            <Link target='_blank' to={`https://wa.me/8120751010?text=${encodeURIComponent(`Confirmo mi asistencia a ${persona.name}`)}`} style={{ textDecoration: 'none' }}>
                                                <Button className="dresscode-link-button" style={{ fontFamily: font, background: colorPalette.buttons, color: buttonsColorText(colorPalette.buttons), minWidth: '300px' }}>
                                                    Confirmar {persona.name}
                                                </Button>
                                            </Link>
                                        }




                                    </div>

                                ))
                            ) : null}

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
                        <Separador MainColor={colorPalette.accent} theme={theme} dev={dev} value={generals.separator} />
                    }
                </>

            ) : null
            }
        </>
    )
}

