import { useState } from 'react'
import { cover, pintar } from './componerPortada'
import { ajusteDe, estiloAjuste } from './fotosPortada'
import { PIEZA_ALTO, PIEZA_ANCHO } from './stickersPopData'
import styles from './SideCanvas.module.css'

// La misma composición que componerPortada, pero en vivo (DOM, sin
// html2canvas) y al tamaño de la pieza (390 × 700): la vista previa del link
// (VistaLinkWhatsApp) la escala. Solo la primera foto (es lo que se comparte).
// Hasta conocer el tamaño de la foto, los dibujos anclados a ella no salen.
export const PortadaEnVivo = ({ body }) => {
    const [tam, setTam] = useState(null)
    // Sin los de las tarjetas ni los anclados a otra foto del carrusel.
    const stickers = (body?.stickers ?? []).filter((s) => !s.hidden && !s.tarjeta && (!s.fotoSrc || s.fotoSrc === body?.image))
    const url = body?.image
    const ajuste = ajusteDe(body, url)
    const marcoFoto = url && tam ? cover(tam, PIEZA_ANCHO, PIEZA_ALTO, ajuste) : null
    const anclado = (s) => s.kind === 'dibujo' && s.foto && url
    const veil = body?.veil ?? 0
    const font = body?.title?.font ?? 'Poppins'
    return (
        <div style={{ position: 'relative', width: PIEZA_ANCHO, height: PIEZA_ALTO, overflow: 'hidden', background: 'linear-gradient(#EEEEEE, #CCCCCC)' }}>
            {url && (
                <img
                    src={url}
                    alt=""
                    onLoad={(e) => setTam({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                    style={{ position: 'absolute', ...(marcoFoto ?? { inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...estiloAjuste(ajuste) }) }}
                />
            )}
            <div className={styles.lienzo} style={{ position: 'absolute', inset: 0 }}>
                {pintar(stickers.filter((s) => !anclado(s)), font)}
            </div>
            {marcoFoto && (
                <div className={styles.lienzo} style={{ position: 'absolute', ...marcoFoto }}>
                    {pintar(stickers.filter(anclado), font)}
                </div>
            )}
            {veil > 0 && /^#[0-9a-f]{6}$/i.test(body?.color ?? '') && (
                <div style={{ position: 'absolute', inset: 0, background: body.color, opacity: Math.min(100, veil) / 100 }} />
            )}
        </div>
    )
}
