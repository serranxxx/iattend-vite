import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { Link } from 'lucide-react'
import { portadaConDiseno } from './componerPortada'
import { PortadaEnVivo } from './PortadaEnVivo'
import { soloVideos } from './fotosPortada'
import { PIEZA_ALTO, PIEZA_ANCHO } from './stickersPopData'
import styles from './VistaLinkWhatsApp.module.css'

/*
  Cómo se ve el link de un Pop al mandarlo por WhatsApp: un mensaje enviado
  con la tarjeta del link (foto = imagen del link, completa y sin recortar:
  la tarjeta toma el alto de la imagen; título = nombre del evento; descripción y dominio = los que
  manda iattend-events en la metadata de side-event/[id]). Con foto de
  portada, la foto es la portada con sus elementos pintada en vivo
  (PortadaEnVivo): se ve igual a la que se arma y se sube al guardar
  (SideEvents.jsx, imagenDelLink). Con video es la imagen que eligió el
  organizador. Sin html2canvas aquí: su iframe le quita el foco a la ventana
  y el popover se cerraba.
*/
const DESCRIPCION = 'I attend - Your event handled'

// Como en WhatsApp, sin el link escrito: solo la tarjeta con el dominio.
export const VistaLinkWhatsApp = ({ current, nota }) => {
    const { t } = useTranslation()
    const body = current?.body ?? {}
    // Imagen propia del link (LinkPanel, `body.linkImage`): esa, tal cual.
    const enVivo = !body.linkImage && !soloVideos(body) && portadaConDiseno(body)
    const imagen = body.linkImage || (soloVideos(body) ? body.image : current?.url_image) || body.image || null

    // La pieza (390 × 700) escalada al ancho de la tarjeta y centrada.
    const fotoRef = useRef(null)
    const [caja, setCaja] = useState(null)
    // Se mide con ResizeObserver: el popover monta su contenido antes de
    // tener tamaño.
    useLayoutEffect(() => {
        const el = fotoRef.current
        if (!el) return undefined
        const medir = () => el.clientWidth && setCaja({ w: el.clientWidth, h: el.clientHeight })
        medir()
        const ro = new ResizeObserver(medir)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    const k = caja ? caja.w / PIEZA_ANCHO : 0

    return (
        <div className={styles.vista} data-vista-link>
            <div className={styles.chat}>
                <div className={styles.burbuja}>
                    <div className={styles.tarjeta}>
                        {/* Sin recorte: la foto se ve completa y la tarjeta toma su
                            alto (la portada en vivo, con la proporción de la pieza). */}
                        <div
                            ref={fotoRef}
                            className={styles.foto}
                            data-natural={(enVivo || imagen) ? true : undefined}
                            style={enVivo ? { aspectRatio: `${PIEZA_ANCHO} / ${PIEZA_ALTO}` } : undefined}
                        >
                            {enVivo
                                ? caja && (
                                    <div className={styles.pieza} style={{ transform: `scale(${k})`, top: 0 }}>
                                        <PortadaEnVivo body={body} />
                                    </div>
                                )
                                : imagen && <img src={imagen} alt="" />}
                        </div>
                        <div className={styles.textos}>
                            <span className={styles.titulo}>{current?.name || t('side_events.link_preview_untitled')}</span>
                            <span className={styles.descripcion}>{DESCRIPCION}</span>
                            <span className={styles.dominio}><Link size={12} /> iattend.events</span>
                        </div>
                    </div>
                    <span className={styles.hora}>
                        {dayjs().format('H:mm')}
                        <svg viewBox="0 0 18 11" aria-hidden><path d="M1 6l3 3 6-7M7 9l1 1 7-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                </div>
            </div>
            {nota && <p className={styles.nota}>{nota}</p>}
        </div>
    )
}
