import { ChevronLeft, Ellipsis, Mic, Search } from 'lucide-react'
import ios_settings from '../../../../assets/images/iphone-settings.svg'
import android_settings from '../../../../assets/images/android-settings.png'

// Marco de teléfono (iPhone 17 Pro con Safari, o Android) con la invitación
// adentro. Lo usan BuildContent (vista previa, laboratorio, onboarding) y el
// modo "Ver en vivo" del editor (EditorWorkspace). Estilos: .ios26-* e
// .inv-device-*-android de build-invitation.css.
export const DevicePreview = ({ device = 'ios', children, hostOverlay, scrollRef }) => {
    if (device === 'ios') {
        // iPhone 17 Pro · Safari a pantalla completa: el contenido ocupa toda
        // la pantalla y la isla, el status y el nav flotan encima.
        return (
            <div className='ios26-device' data-tour="preview">
                <div className='ios26-buttons'>
                    <span />
                    <span />
                    <span />
                </div>
                <div className='ios26-power' />

                <div className='ios26-screen'>
                    <div ref={scrollRef} className='scroll-invitation ios26-content'>
                        {children}
                    </div>

                    {hostOverlay}

                    <div className='ios26-island' />

                    <div className='ios26-status'>
                        <span>9:41</span>
                        <img alt='' src={ios_settings} />
                    </div>

                    <div className='ios26-nav'>
                        <div className='ios26-nav-round'>
                            <ChevronLeft size={20} strokeWidth={2.4} />
                        </div>
                        <div className='ios26-nav-pill'>
                            <Search size={16} strokeWidth={2.4} />
                            <span>iattend.mx</span>
                            <Mic size={16} strokeWidth={2.4} />
                        </div>
                        <div className='ios26-nav-round'>
                            <Ellipsis size={20} strokeWidth={2.4} />
                        </div>
                    </div>

                    <div className='ios26-home' />
                </div>
            </div>
        )
    }

    return (
        <div className={`inv-device-main-container-${device}`} data-tour="preview">
            <div className={`device-buttons-container-${device}`}>
                <div className={`device-button-${device}`} />
                <div className={`device-button-${device}`} />
                <div className={`device-button-${device}`} />
            </div>
            <div className={`device-power-button-${device}`} />
            <div className={`inv-device-container-${device} scroll-invitation`}>

                <div className={`inv-black-space-${device}`}>
                    <span>5:15</span>
                    <div className={`camera-${device}`} />
                    <div>
                        <img alt='' src={android_settings} style={{ height: '100%', objectFit: 'cover' }} />
                    </div>
                </div>

                <div ref={scrollRef} className={`scroll-invitation ${device}-invitation `}>
                    {children}
                </div>
                <div className={`inv-light-space-${device}`} />
            </div>
        </div>
    )
}
