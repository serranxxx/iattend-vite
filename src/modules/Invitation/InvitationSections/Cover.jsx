import React, { useContext, useEffect, useState } from 'react'
import Countdown from '../../components/invitation/CountDown'
import { darker, lighter } from '../../helpers/functions'
import { appContext } from '../../context/AuthContext'
import '../../styles/modules/cover.css'
import ConfettiComponent from '../../components/build/Conffeti'



export const CoverApp = ({ inv, coverRef, dev, height, land }) => {

    const { theme, font, colorPalette } = useContext(appContext)

    const content = inv.cover

    const [timerColor, setTimerColor] = useState(null)


    useEffect(() => {
        if (content) {
            setTimerColor(content.timerColor)
        }
    }, [content])


    const cleanDate = (dateString) => {
        if (dateString) {
            if (dateString.endsWith("000Z")) {
                return dateString.slice(0, -5);
            }
            return dateString;
        }

    };

    const checkIfToday = (targetDate) => {
        const today = new Date();
        const target = new Date(targetDate);

        // Comparar solo el año, mes y día
        return (
            today.getFullYear() === target.getFullYear() &&
            today.getMonth() === target.getMonth() &&
            today.getDate() === target.getDate()
        );
    };


    return (


        content && colorPalette ?
            <div ref={coverRef} className='module-cover-container' style={{ position: 'relative', zIndex: 3 }}>
                {
                    checkIfToday(cleanDate(content.date)) && <ConfettiComponent palette={colorPalette} />
                }

                <div
                    className='cover-container'
                    style={{
                        height: height, padding: '0', minHeight: '630px', maxHeight: !dev ? '' : '730px',
                        background: colorPalette.primary,
                    }}>

                    {
                        content.featured_dev || content.featured_prod ?
                            <div className='cover-image-container--'
                                style={{
                                    top: `${content.mapPosition?.y ?? 0}px`,
                                    left: `${content.mapPosition?.x ?? 0}px`,
                                    transform: `scale(${content.zoomLevel ?? 1})`,
                                }}>
                                <img loading="lazy" decoding="async" alt='' src={dev && !land ? content.featured_dev : content.featured_prod} />
                                {
                                    content.background ?
                                        <div style={{
                                            position: 'absolute', width: '100%', height: '100%', top: '0px', left: '0px',
                                            background: `linear-gradient(to top, ${darker(colorPalette.primary, 0.2)}, rgba(0,0,0,0))`
                                        }}></div>
                                        :
                                        content.blur &&
                                        <div className='blur-cover'></div>
                                }

                            </div>
                            : <></>
                    }



                    <div className='background-cover'
                        style={{
                            flexDirection: content.flexDirection,
                        }}>



                        <div className='cover--title-container' style={{
                            alignItems: content.align, height: content.isDate ? '75%' : '100%',
                            padding: content.isDate ? 0 : '10px',

                        }}>
                            <span style={{
                                color: !content.color ? theme ? lighter(colorPalette.primary, 0.6) : lighter(colorPalette.accent, 0.6) : content.color, width: '100%',
                                textAlign: content.justify, fontSize: `${content.fontSize}em`, wordBreak: 'break-word',
                                opacity: content.opacity, fontFamily: content.image, fontWeight: content.fontWeight,
                                lineHeight: '1'
                            }}>{content.title}</span>
                        </div>

                        {
                            content.isDate && (
                                <div style={{
                                    width: '100%',
                                    backgroundColor: `transparent`,

                                    height: '25%', marginTop: '10px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>

                                    <Countdown mainColor={content.color} color={content.timerColor} colorPalette={colorPalette} dev={dev} targetDate={content.date} theme={theme} font={font} fontWeight={content.fontWeight} />

                                </div>
                            )
                        }



                    </div>

                </div>

                {/* {
                    generals.texture !== null &&
                    <div className="image-texture-container">
                        <div className="image-texture-container">
                            {Array.from({ length: 100 }).map((_, index) => (
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
            : <></>

    )
}



