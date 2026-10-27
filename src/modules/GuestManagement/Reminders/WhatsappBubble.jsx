import { useMemo } from 'react'
import dayjs from 'dayjs'
import { Image as ImageIcon, SquareArrowOutUpRight } from 'lucide-react'
import styles from './WhatsappBubble.module.css'

/**
 * Vista previa de una plantilla tal como la pinta WhatsApp (y la vista previa
 * de Meta): fondo con dibujos, burbuja con colita, imagen de encabezado,
 * cuerpo con *negritas*, pie gris, hora y botón URL. La URL del botón no se
 * muestra, como en WhatsApp.
 *
 * `parts` viene de bodyParts() (reminderVariables.js). Si no hay imagen real
 * pero la plantilla lleva encabezado, `imageLabel` pinta un hueco con el texto.
 */
export const WhatsappBubble = ({ parts = [], imageUrl = null, imageLabel = null, footer = null, buttonLabel = null, emptyText = null }) => {
    const time = useMemo(() => dayjs().format('h:mm a'), [])
    const hasText = parts.length > 0

    return (
        <div className={styles.wall}>
            <div className={styles.bubble}>
                {imageUrl ? (
                    <img className={styles.image} src={imageUrl} alt="" />
                ) : imageLabel ? (
                    <span className={styles.imagePlaceholder}>
                        <ImageIcon size={20} />
                        {imageLabel}
                    </span>
                ) : null}

                <div className={styles.content}>
                    <span className={styles.text}>
                        {hasText
                            ? parts.map((p, i) => (p.bold ? <b key={i}>{p.text}</b> : <span key={i}>{p.text}</span>))
                            : <span className={styles.empty}>{emptyText}</span>}
                        {/* Reserva lugar para la hora al final de la última línea. */}
                        {!footer && <span className={styles.timeSpacer} />}
                    </span>
                    {footer && (
                        <span className={styles.footer}>
                            {footer}
                            <span className={styles.timeSpacer} />
                        </span>
                    )}
                    <span className={styles.time}>{time}</span>
                </div>

                {buttonLabel && (
                    <div className={styles.button}>
                        <SquareArrowOutUpRight size={17} strokeWidth={2.2} />
                        {buttonLabel}
                    </div>
                )}
            </div>
        </div>
    )
}
