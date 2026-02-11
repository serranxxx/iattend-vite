import { Button, Image, Row } from 'antd'
import { buttonsColorText, darker, } from '../../helpers/functions'
import {  simpleaddress } from '../../helpers/addressurl'
import { Link } from 'react-router-dom'
import { ForecastWeather } from './Weather'
import SpotifyWidget from './SpotifyWidget'
import { FaArrowUp } from 'react-icons/fa'
import { RiMapPin2Fill } from 'react-icons/ri'
import { textures } from '../../helpers/textures'


export const CustomCard = ({ dev, onClose, item, MainColor, theme, font, colorPalette, invertedColors, generals }) => {


    return (
        <div className="custom-card-container" style={{
            position: 'relative'
        }}>

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


            <Button
                className="custom-card-button"
                icon={<FaArrowUp />}
                onClick={() => onClose(item.id)}
                style={{
                    fontFamily: font,
                    background: invertedColors ? colorPalette.primary : darker(colorPalette.secondary, 0.9),
                    color: invertedColors ? colorPalette.accent : buttonsColorText(colorPalette.primary),
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

            <span className="custom-card-title" style={{ fontFamily: font, color: invertedColors ? colorPalette.primary : colorPalette.accent }}>
                <b>{item.name}</b>
            </span>

            <span className="custom-card-time" style={{ fontFamily: font, color: invertedColors ? colorPalette.primary : colorPalette.accent }}>
                {item.time}
            </span>

            <span className="custom-card-subname" style={{ fontFamily: font, color: invertedColors ? colorPalette.primary : colorPalette.accent }}>
                {item.subname}
            </span>

            {item.address && (
                <span className="custom-card-address" style={{ fontFamily: font, color: invertedColors ? `${colorPalette.primary}80` : `${colorPalette.accent}80` }}>
                    {`${item.address.calle}, ${item.address.numero}, ${item.address.colonia}, ${item.address.CP}, ${item.address.ciudad}, ${item.address.estado}`}
                </span>
            )}

            {item.subitems && (
                <div className="custom-card-subitems" style={{
                    borderColor: invertedColors ? colorPalette.primary : colorPalette.accent
                }}>
                    {item.subitems.map((subitem) => (
                        <div key={subitem.name} className="custom-card-subitem">
                            <div className="custom-card-subitem-bullet" style={{ backgroundColor: invertedColors ? colorPalette.primary : colorPalette.accent }} />

                            <span className="custom-card-subitem-title" style={{ fontFamily: font, color: invertedColors ? colorPalette.primary : colorPalette.accent }}>
                                {subitem.name}
                            </span>
                            <span className="custom-card-subitem-time" style={{ fontFamily: font, color: invertedColors ? colorPalette.primary : colorPalette.accent }}>
                                {subitem.time}
                            </span>
                            <span className="custom-card-subitem-description" style={{ fontFamily: font, color: invertedColors ? `${colorPalette.primary}80` : `${colorPalette.accent}80` }}>
                                {subitem.description}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {item.address && (
                <>
                    <Row className={`custom-card-row ${item.subitems ? 'custom-card-row-column' : ''}`}>

                        {
                            item.address.calle && item.address.numero && item.address.colonia && item.address.CP && item.address.ciudad && item.address.estado && (

                                <>
                                    <div className="custom-card-weather" style={{ height: item.subitems ? '80px' : '97px' }}>
                                        {item.address.CP && (
                                            <ForecastWeather invertedColors={invertedColors} cp={item.address.CP} MainColor={MainColor} theme={theme} font={font} colorPalette={colorPalette} />
                                        )}
                                    </div>

                                    <div className="custom-card-map"style={{ backgroundColor: colorPalette.secondary }}>
                                        {item.address.calle && item.address.numero && item.address.colonia && item.address.CP && item.address.ciudad && item.address.estado && (
                                            <Image
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                src={simpleaddress(item.address.calle, item.address.numero, item.address.colonia, item.address.CP, item.address.ciudad, item.address.estado)}
                                            />
                                        )}
                                    </div>

                                </>


                            )}


                    </Row>
                    {item.address.url && (
                        <Link to={item.address.url} target='_blank' className="custom-card-link" style={{ margin: '16px 0px' }}>
                            <Button
                                icon={<RiMapPin2Fill size={16} />}
                                className="custom-card-link-button" style={{ fontFamily: font, background: invertedColors ? colorPalette.primary : colorPalette.buttons, color: invertedColors ? colorPalette.accent : buttonsColorText(colorPalette.buttons) }}>
                                ¿Cómo llegar?
                            </Button>
                        </Link>
                    )}
                </>
            )}

            {item.playlist && <SpotifyWidget url={item.playlist} />}


        </div>
    )
}

