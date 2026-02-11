import React, { useEffect, useState } from 'react';
import { AmazonLogo, SearsLogo } from './Logos';

export const GiftCards = ({ dev, cards, theme, font, colorPalette, content, generals }) => {

    const [card, setCard] = useState(cards)

    const handleLogos = (type) => {
        switch (type.toUpperCase()) {
            case 'AMAZON':
                return <AmazonLogo background={content.background} invertedColors={content.invertedColors} width={'50%'} height={'50%'} MainColor={colorPalette} theme={theme} />
            case 'SEARS':
                return <SearsLogo background={content.background} invertedColors={content.invertedColors} width={'50%'} height={'50%'} MainColor={colorPalette} theme={theme} />

            default: return <span style={{
                color: content.background ? colorPalette.accent : content.invertedColors ? colorPalette.primary : colorPalette.accent,
                fontFamily: font
            }}>{type}</span>;

        }
    }

    useEffect(() => {
        setCard(cards)
    }, [cards])


    return (

        <>
            {card ?
                card.map((item, index) => (
                    <div
                        key={index}
                        className="gift-card-container"
                        style={{
                            background: content.background ? colorPalette.primary : colorPalette.secondary,
                            position: 'relative',
                        }}
                    >

                        {/* {
                            generals.texture !== null &&
                            <Link to={item.url} target='_blank'>
                                <div className="image-texture-container" style={{ borderRadius: '20px' }}>
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
                            </Link>

                        } */}

                        <a
                            href={item.url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className={item.link ? "gift-card-page" : "gift-card-bank"}
                            style={{
                                color: content.background ? colorPalette.accent : content.invertedColors ? colorPalette.primary : colorPalette.accent,
                                cursor: item.link ? 'pointer' : 'default',
                            }}
                        >
                            {item.link ? (
                                handleLogos(item.type)
                            ) : (
                                <>
                                    <span
                                        className={!dev ? "g-mdoule-regular-text" : "g-mdoule-regular-text-dev"}
                                        style={{
                                            fontFamily: font,
                                            color: content.background ? colorPalette.accent : content.invertedColors ? colorPalette.primary : colorPalette.accent,
                                            fontSize: '18px'

                                        }}
                                    >
                                        <b>{item.bank}</b>
                                    </span>
                                    <div className='gifts-single-col'>
                                        <span
                                            className={!dev ? "g-mdoule-regular-text" : "g-mdoule-regular-text-dev"}
                                            style={{
                                                fontFamily: font,
                                                color: content.background ? colorPalette.accent : content.invertedColors ? colorPalette.primary : colorPalette.accent,
                                            }}
                                        >
                                            {item.name}
                                        </span>
                                        <span
                                            className={!dev ? "g-mdoule-regular-text" : "g-mdoule-regular-text-dev"}
                                            style={{
                                                fontFamily: font,
                                                color: content.background ? colorPalette.accent : content.invertedColors ? colorPalette.primary : colorPalette.accent,
                                            }}
                                        >
                                            <b>{item.number}</b>
                                        </span>
                                    </div>

                                </>
                            )}
                        </a>
                    </div>
                ))
                : <></>
            }
        </>

    );
};
