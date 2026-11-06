import { portadaDeInvitacion } from '../../helpers/invitation/portadaInvitacion'

/**
 * Miniatura de la portada de la invitación en el dashboard (tarjeta
 * "Invitación Paperless" y su versión del celular). `cover.image.prod` puede
 * ser una URL o una lista de fotos y videos: se enseña la primera foto y, si
 * la portada solo tiene videos, un cuadro del primero (un <video> en pausa;
 * `#t=0.1` le pide al navegador ese cuadro, Safari incluido). Antes se pintaba
 * la URL del video en un <img> y salía rota.
 */
export const PortadaMiniatura = ({ src, className }) => {
    const { foto, video } = portadaDeInvitacion(src)
    if (foto) return <img src={foto} alt='' className={className} />
    if (video) {
        return (
            <video
                src={`${video}#t=0.1`}
                className={className}
                muted
                playsInline
                preload='metadata'
                disablePictureInPicture
                tabIndex={-1}
                aria-hidden
            />
        )
    }
    return null
}

export default PortadaMiniatura
