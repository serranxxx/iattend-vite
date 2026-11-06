import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, message, Popover, QRCode } from 'antd'
import { ArrowUpRight, Check, Copy, Share, X } from 'lucide-react'
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
// Editor de Pops con estilo (handoff "Editor de Pops — 3 estilos", §9): el
// desplegable mide 320 (16 de aire a cada lado) y el estilo lo lee de <html>.
const ANCHO_TEMA = 288
const temaEditor = () => (typeof document !== 'undefined' ? document.documentElement.dataset.popsEditor : undefined) || null

// `alto`: recorta la portada a ese alto (centrada; en el modal del celular
// llena el ancho aunque se recorte). `enFila`: botones lado a lado, más altos.
// `qr`: tamaño del QR (px).
// `tema` (solo el desplegable del editor de escritorio): título, etiqueta del
// link, ✕ (Business) y el estado "copiado" en el mismo botón (1.8 s) en lugar
// del aviso. Sin tema queda como siempre (I attend y el celular).
export const CompartirContenido = ({ current, url, visible = true, ancho = ANCHO, alto = null, conHoja = false, enFila = false, qr = 112, tema = null, onCerrar }) => {
    const { t } = useTranslation()
    const escala = ancho / PIEZA_ANCHO
    const altoPieza = PIEZA_ALTO * escala
    const altoCaja = alto ? Math.min(alto, altoPieza) : altoPieza
    const [copiado, setCopiado] = useState(false)
    const reloj = useRef(null)
    useEffect(() => () => clearTimeout(reloj.current), [])
    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(url)
            if (tema) {
                setCopiado(true)
                clearTimeout(reloj.current)
                reloj.current = setTimeout(() => setCopiado(false), 1800)
            } else {
                message.success(t('custom_link.copied'))
            }
        } catch (err) {
            console.error('No se pudo copiar el link:', err)
        }
    }

    const hoja = conHoja && typeof navigator !== 'undefined' && navigator.share
    const compartir = async () => {
        try { await navigator.share({ title: current?.name ?? '', url }) } catch { /* cancelado */ }
    }
    return (
        <div className={styles.panel} style={{ width: ancho }} data-text-bar data-compartir={tema || undefined}>
            {tema && (
                <div className={styles.cabeza}>
                    <span className={styles.titulo}>{t(`side_events.share_title_${tema}`)}</span>
                    {tema === 'business' && onCerrar && (
                        <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label={t('build_editor.close')}><X size={16} /></button>
                    )}
                </div>
            )}
            <div className={styles.portada} style={{ width: ancho, height: altoCaja }}>
                <div className={styles.pieza} style={{ top: (altoCaja - altoPieza) / 2, transform: `scale(${escala})` }}>
                    {visible && <SideCanvas current={current} onChange={() => {}} selected={null} onSelect={() => {}} readOnly soloPortada />}
                </div>
                <div className={styles.qr}>
                    <QRCode type="svg" value={url} size={qr} bordered={false} color="#000000" bgColor="#FFFFFF" errorLevel="M" />
                </div>
            </div>
            {tema === 'business' && <span className={styles.linkEtiqueta}>{t('side_events.share_link_label')}</span>}
            <span className={styles.url} title={url}>{url.replace(/^https?:\/\/(www\.)?/, '')}</span>
            <div className={styles.botones} data-fila={enFila || undefined}>
                <Button
                    className={`primarybutton--active ${styles.copiar}`}
                    data-copiado={copiado || undefined}
                    block
                    icon={copiado ? <Check size={enFila ? 16 : 14} strokeWidth={2.6} /> : <Copy size={enFila ? 16 : 14} />}
                    onClick={copiar}
                    style={tema ? undefined : { borderRadius: 99 }}
                >
                    {copiado
                        ? t(`side_events.share_copied_${tema}`)
                        : t(tema === 'business' ? 'side_events.share_copy_short' : 'side_events.story_share')}
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
    // El estilo del editor de Pops (si tiene): se lee al pintar, cambia con él.
    const tema = temaEditor()
    const contenido = (
        <CompartirContenido
            current={current}
            url={url}
            visible={abierto}
            tema={tema}
            ancho={tema ? ANCHO_TEMA : ANCHO}
            onCerrar={() => setAbierto(false)}
        />
    )

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
