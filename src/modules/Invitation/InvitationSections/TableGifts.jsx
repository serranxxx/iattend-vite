import React, { useContext, useEffect } from 'react'
import { GiftCards } from '../../components/invitation/GiftCards'
import { appContext } from '../../context/AuthContext'
import { Separador } from '../../components/invitation/Logos'
import '../../styles/modules/gifts.css'
import AOS from 'aos';
import 'aos/dist/aos.css';
import { textures } from '../../helpers/textures'


export const TableGifts = ({ invitation, giftsRef, dev, land }) => {

    const {  theme, font, colorPalette } = useContext(appContext)
    const content = invitation.gifts
    const generals = invitation.generals
    const iid = invitation._id
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
                        //    data-aos={!dev ? 'fade-left' : undefined} 
                        ref={giftsRef} className='gm-container'

                        style={{
                            backgroundColor: content.background ? colorPalette.secondary : 'transparent',
                            padding: content.background ? '32px' : '0px 32px', position: 'relative'
                        }}
                    >
                        <div className="g-module-info-container">

                            <span
                                data-aos={!dev && generals.texture == null ? 'fade-right' : undefined}
                                className={!dev ? "g-module-title" : "g-module-title-dev"} style={{ color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent, fontFamily: font }}>
                                {content.title}
                            </span>

                            <span

                                data-aos={!dev && generals.texture == null ? 'fade-right' : undefined}
                                className={!dev ? "g-mdoule-regular-text" : "g-mdoule-regular-text-dev"} style={{ color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent, fontFamily: font, marginBottom: iid === "686e7c9159f1ed21d0c351cc" && '48px' }}>
                                {content.description}
                            </span>

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

                            {
                                iid === "686e7c9159f1ed21d0c351cc" ?

                                    <div class="contact">
                                        <div class="envelope">
                                            <div class="top">
                                                <div class="outer"><div class="inner"></div></div>
                                            </div>
                                            <div class="bottom"></div>
                                            <div class="left"></div>
                                            <div class="right"></div>
                                            <div class="cover"></div>
                                            <div class="paper">
                                                <a class="call" href="tel:5555555555"><div class="i"></div>Lluvia de sobres en recepción</a>
                                                {/* <a class="mail" href="mailto:you@domain.com"><div class="i">@</div>you@doma.in</a> */}
                                            </div>
                                        </div>
                                    </div>

                                    :

                                    <div
                                        data-aos={!dev && generals.texture == null ? 'fade-right' : undefined}
                                        className="gifts-scroll-invitation" >
                                        <GiftCards generals={generals} invertedColors={content.invertedColors} dev={dev} cards={content.cards} MainColor={'#000000'} theme={theme} font={font} colorPalette={colorPalette} content={content} />
                                    </div>
                            }







                        </div>



                    </div>
                    {content.separator &&
                        <Separador MainColor={colorPalette.accent} theme={theme} dev={dev} value={generals.separator} />
                    }
                </>

            ) : null}
        </>
    )
}
