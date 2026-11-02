import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, message, Popover, QRCode } from 'antd'
import { ArrowUpRight, Copy, Share } from 'lucide-react'
import { SideCanvas } from './SideCanvas'
import { PIEZA_ALTO, PIEZA_ANCHO } from './stickersPopData'
import styles from './CompartirPop.module.css'

/*
  "Compartir" del encabezado de un Pop (escritorio): un popover anclado al
  botón (no Modal) con la portada tal como se ve —la misma SideCanvas en solo
  lectura y `soloPortada`: foto, carrusel o video, color del tema, velo,
  efectos, elementos y dibujos, sin textos, botones ni tarjetas—, el QR del
  link encima y "Copiar link" debajo. El contenido (CompartirContenido) es
  el mismo del modal Compartir del editor del celular (EditorMovil), que
  además suma "Compartir" con la hoja del teléfono si existe.
*/

const ANCHO = 236

// `alto`: recorta la portada a ese alto (centrada; en el modal del celular
// llena el ancho aunque se recorte). `enFila`: botones lado a lado, más altos.
// `qr`: tamaño del QR (px).
export const CompartirContenido = ({ current, url, visible = true, ancho = ANCHO, alto = null, conHoja = false, enFila = false, qr = 112 }) => {
    const { t } = useTranslation()
    const escala = ancho / PIEZA_ANCHO
    const altoPieza = PIEZA_ALTO * escala
    const altoCaja = alto ? Math.min(alto, altoPieza) : altoPieza
    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(url)
            message.success(t('custom_link.copied'))
        } catch (err) {
            console.error('No se pudo copiar el link:', err)
        }
    }

    const hoja = conHoja && typeof navigator !== 'undefined' && navigator.share
    const compartir = async () => {
        try { await navigator.share({ title: current?.name ?? '', url }) } catch { /* cancelado */ }
    }
    return (
        <div className={styles.panel} style={{ width: ancho }} data-text-bar>
            <div className={styles.portada} style={{ width: ancho, height: altoCaja }}>
                <div className={styles.pieza} style={{ top: (altoCaja - altoPieza) / 2, transform: `scale(${escala})` }}>
                    {visible && <SideCanvas current={current} onChange={() => {}} selected={null} onSelect={() => {}} readOnly soloPortada />}
                </div>
                <div className={styles.qr}>
                    <QRCode type="svg" value={url} size={qr} bordered={false} color="#000000" bgColor="#FFFFFF" errorLevel="M" />
                </div>
            </div>
            <span className={styles.url} title={url}>{url.replace(/^https?:\/\/(www\.)?/, '')}</span>
            <div className={styles.botones} data-fila={enFila || undefined}>
                <Button className="primarybutton--active" block icon={<Copy size={enFila ? 16 : 14} />} onClick={copiar} style={{ borderRadius: 99 }}>
                    {t('side_events.story_share')}
                </Button>
                {hoja && (
                    <Button className="primarybutton" block icon={<Share size={enFila ? 16 : 14} />} onClick={compartir} style={{ borderRadius: 99 }}>
                        {t('side_events.share_btn')}
                    </Button>
                )}
            </div>
        </div>
    )
}

export const CompartirPop = ({ current, url, bloqueado, onBloqueado }) => {
    const { t } = useTranslation()
    const [abierto, setAbierto] = useState(false)
    const contenido = <CompartirContenido current={current} url={url} visible={abierto} />

    return (
        <Popover
            trigger="click"
            placement="bottomRight"
            arrow={false}
            // Encima del encabezado del editor (si no, le tapa la parte de arriba).
            zIndex={2000}
            align={{ offset: [0, 10] }}
            open={abierto}
            onOpenChange={(v) => {
                if (v && bloqueado) { onBloqueado?.(); return }
                setAbierto(v)
            }}
            content={contenido}
        >
            <Button className="primarybutton" icon={<ArrowUpRight size={16} />} style={{ borderRadius: 99 }}>
                {t('side_events.share_btn')}
            </Button>
        </Popover>
    )
}
