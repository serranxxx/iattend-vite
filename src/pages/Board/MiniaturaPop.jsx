import { esVideo } from '../../modules/SideEvents/fotosPortada'

/*
  Miniatura de la portada de un Pop en las listas (portadaDePop). Si la
  portada es un video, su primer cuadro: <video> sin reproducir, mudo y con
  `#t=0.1` (Safari de iOS no pinta nada en el cuadro 0 sin esa marca) y
  `preload="metadata"`, que solo baja lo necesario para ese cuadro.
*/
export const MiniaturaPop = ({ src, className }) => (esVideo(src)
    ? <video src={`${src.split('#')[0]}#t=0.1`} muted playsInline preload='metadata' aria-hidden className={className} />
    : <img src={src} alt='' loading='lazy' className={className} />)
