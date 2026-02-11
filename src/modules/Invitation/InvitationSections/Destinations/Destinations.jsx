
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useContext, useEffect } from 'react';
import { appContext } from '../../../context';
import { textures } from '../../../helpers/textures';
import { Separador } from '../../../components/invitation/Logos';
import { DestinationCard } from './DestinationCard';


export const Destinations = ({ invitation, destinationRef, dev, land }) => {

    const { theme, font, colorPalette } = useContext(appContext)
    const content = invitation.destinations
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
                        //    data-aos={!dev ? 'fade-left' : undefined} 
                        ref={destinationRef} className='gm-container'

                        style={{
                            backgroundColor: content.background ? colorPalette.secondary : 'transparent',
                            padding: content.background ? '32px' : '0px 32px', position: 'relative'
                        }}
                    >
                        <div className="g-module-info-container">

                            <span
                                data-aos={!dev && generals.texture == null  ? 'fade-right' : undefined}
                                className={!dev ? "g-module-title" : "g-module-title-dev"} style={{ color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent, fontFamily: font }}>
                                {content.title}
                            </span>

                            <span
                                data-aos={!dev && generals.texture == null  ? 'fade-right' : undefined}
                                className={!dev ? "g-mdoule-regular-text" : "g-mdoule-regular-text-dev"} style={{ color: content.background && content.invertedColors ? colorPalette.primary : colorPalette.accent, fontFamily: font }}>
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

                            <div
                                data-aos={!dev && generals.texture == null  ? 'fade-right' : undefined}
                                className="gifts-scroll-invitation"
                                style={{gap:'24px'}}
                                >
                                <DestinationCard content={content} colorPalette={colorPalette}/>
                            </div>
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

