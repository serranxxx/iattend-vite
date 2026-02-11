import React, { useEffect, useState } from 'react'
import { Button, Col } from 'antd'
import { CustomCard, } from './Steps'
import { buttonsColorText, darker, } from '../../helpers/functions'
import { LuBadgeHelp } from 'react-icons/lu';
import { iconsItinerary } from '../../helpers';
import { FaArrowDown, FaArrowRight } from 'react-icons/fa';
import { textures } from '../../helpers/textures';


export const Card = ({
    steps, MainColor, theme, font, dev, colorPalette, background, invertedColors, generals
}) => {

    const [stepsItems, setStepsItems] = useState(steps)

    const handleSelectedCard = (id) => {
        const updatedCards = stepsItems.map((card) => card.id === id ? { ...card, active: !card.active } : card)
        setStepsItems(updatedCards)
    }


    useEffect(() => {
        setStepsItems(steps)
    }, [steps])


    const renderIcon = (index) => {
        const icon = iconsItinerary.find(icon => icon.index === index);
        if (icon) {
            const IconComponent = icon.value;
            return <IconComponent size={35} style={{ color: background ? colorPalette.primary : colorPalette.accent }} />;
        }
        return <LuBadgeHelp size={35} style={{ color: background ? colorPalette.primary : colorPalette.accent }} />;
    };

    // const background = `linear-gradient(to bottom, ${(colorPalette.secondary)}80 0%, ${(colorPalette.secondary)} 100%)`

    return (
        <>
            {
                stepsItems.map((item, index) => (
                    <div
                        key={index}
                        className={`card-container ${item.active ? 'card-container-active' : ''}`}
                        style={{
                            background: background ? colorPalette.primary : colorPalette.secondary,
                            minHeight: item.active ? 'auto' : '90px',
                            justifyContent: item.active ? 'center' : 'flex-start',
                            flexDirection: item.active ? 'column' : 'row',
                            alignItems: 'flex-start',
                            border: 'none',
                            position: 'relative',
                            gap: !item.active && '16px',
                            padding: !item.active && '12px',
                            boxSizing: 'border-box',
                            overflow: 'hidden'
                        }}
                    >
                        {item.active ? (
                            <CustomCard generals={generals} invertedColors={invertedColors} dev={dev} onClose={handleSelectedCard} item={item} MainColor={MainColor} theme={theme} font={font} colorPalette={colorPalette} />
                        ) : (
                            <>
                                <div style={{
                                    height: '94px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                                    className="card-icon-wrapper"

                                >
                                    <div
                                        className="card-icon"
                                        style={{
                                            backgroundColor: background ? colorPalette.secondary : colorPalette.primary,
                                            border: 'none',
                                        }}
                                    >
                                        {item.image ? renderIcon(parseInt(item.image)) : <LuBadgeHelp size={32} style={{ color: background ? colorPalette.primary : colorPalette.accent }} />}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        height: '94px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                                        color: background ? colorPalette.accent : invertedColors ? colorPalette.primary : colorPalette.accent,
                                    }}
                                    className="card-content"
                                    onClick={() => handleSelectedCard(item.id)}
                                >
                                    <span className={!dev ? "g-mdoule-regular-text" : "g-mdoule-regular-text-dev"} style={{ fontFamily: font, lineHeight: 1, fontSize: '16px' }}><b>{item.name}</b></span>
                                    <span className={!dev ? "g-mdoule-light-text" : "g-mdoule-light-text-dev"} style={{ fontFamily: font, opacity: '0.8' }}>{item.time}</span>
                                    <span className={!dev ? "g-mdoule-regular-text" : "g-mdoule-regular-text-dev"} style={{ fontFamily: font, fontSize: '13px' }}>{item.subname}</span>


                                </div>

                                {
                                    generals.texture !== null &&
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

                                {
                                    (item.subitems || item.playlist || item.address) ? (
                                        <Button
                                            icon={<FaArrowRight />}
                                            onClick={() => handleSelectedCard(item.id)}
                                            style={{
                                                fontFamily: font,
                                                background: background ? colorPalette.secondary : invertedColors ? colorPalette.primary : colorPalette.buttons,
                                                color: background ? colorPalette.primary : invertedColors ? colorPalette.secondary : buttonsColorText(colorPalette.buttons),
                                                borderRadius: '99px',
                                                border: 'none',
                                                // height: '90px',
                                                flex: 1,
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                // padding: '8px',
                                                width: '35px',
                                                minWidth: '35px',
                                                height: '35px'
                                                // position: 'absolute', top: '16px', right: '16px'
                                            }}
                                        />
                                    ) : null
                                }


                            </>
                        )}


                    </div>
                ))
            }
        </>
    )
}
