import { useState } from 'react'
import { Button, Checkbox, message, Popover, Segmented } from 'antd'
import { Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { StorageImages } from '../../components/ImagesStorage/StorageImages'
import { uploadImagesSupabase } from '../../helpers/services/uploadImage'
import { generarImagenLink } from './generarImagenLink'
import ed from './SideEventEditor.module.css'

/*
  "Crear desde mi diseño" (panel Fondo de un Flash): arma la imagen del link
  con el fondo que se elija y los PNG de la pieza, en el mismo lugar (ver
  generarImagenLink). Popover anclado al botón, no Modal. Solo cambia la
  imagen del link (url_image), nunca el cuadro fijo del video (body.image):
  ese se ve detrás de los PNG mientras carga y saldrían dobles.
*/
export const ImagenLinkFlash = ({ body, carpeta, onLista }) => {
    const { t } = useTranslation()
    const [abierto, setAbierto] = useState(false)
    const [creando, setCreando] = useState(false)
    const visibles = (Array.isArray(body?.stickers) ? body.stickers : []).filter(s => !s.hidden)

    const opcionesFondo = [
        body?.image && { value: 'portada', label: t('side_events.link_bg_cover') },
        body?.video && { value: 'video', label: t('side_events.link_bg_video') },
        { value: 'otra', label: t('side_events.link_bg_other') },
    ].filter(Boolean)
    const [fondoElegido, setFondoElegido] = useState(null)
    const fondo = fondoElegido ?? opcionesFondo[0].value
    const [otraImagen, setOtraImagen] = useState(null)
    // null = todos los visibles; si no, los ids que se dejaron prendidos.
    const [incluidos, setIncluidos] = useState(null)
    const ids = incluidos ?? visibles.map(s => s.id)

    const crear = async () => {
        setCreando(true)
        const aviso = message.loading(t('side_events.link_creating'), 0)
        try {
            const urlFondo = fondo === 'portada' ? body.image : fondo === 'video' ? body.video : otraImagen
            const archivo = await generarImagenLink({
                fondo: urlFondo ? { tipo: fondo === 'video' ? 'video' : 'imagen', url: urlFondo } : null,
                // Mismo orden que las capas de la pieza.
                stickers: visibles.filter(s => ids.includes(s.id)),
                color: body?.color,
                veil: body?.veil,
            })
            const url = await uploadImagesSupabase({ file: archivo, invitationID: carpeta, setImages: () => {} })
            if (!url) return
            onLista(url)
            setAbierto(false)
            message.success(t('side_events.link_created'))
        } catch (err) {
            console.error(err)
            message.error(t('side_events.link_error'))
        } finally {
            aviso()
            setCreando(false)
        }
    }

    const contenido = (
        <div className={ed.linkGenerador}>
            <span className={ed.hint}>{t('side_events.link_generate_hint')}</span>

            <div className={ed.fieldStack}>
                <span className={ed.fieldLabel}>{t('side_events.link_bg_label')}</span>
                <Segmented block size='small' value={fondo} onChange={setFondoElegido} options={opcionesFondo} />
                {fondo === 'otra' && (
                    <div className={ed.thumbRow}>
                        {otraImagen && <div className={ed.thumb}><img src={otraImagen} alt='' /></div>}
                        <div className={ed.uploadTile}>
                            <StorageImages invitationID={carpeta} type={'side-events'} handleImage={(url) => { if (url) setOtraImagen(url) }} />
                        </div>
                    </div>
                )}
            </div>

            {visibles.length > 0 && (
                <div className={ed.fieldStack}>
                    <span className={ed.fieldLabel}>{t('side_events.link_stickers_label')}</span>
                    <div className={ed.linkStickers}>
                        {[...visibles].reverse().map(s => (
                            <Checkbox
                                key={s.id}
                                checked={ids.includes(s.id)}
                                onChange={(e) => setIncluidos(e.target.checked ? [...ids, s.id] : ids.filter(id => id !== s.id))}
                            >
                                <span className={ed.linkStickerThumb}><img src={s.url} alt='' /></span>
                            </Checkbox>
                        ))}
                    </div>
                </div>
            )}

            <Button
                type='primary'
                block
                loading={creando}
                disabled={fondo === 'otra' && !otraImagen}
                onClick={crear}
            >
                {t('side_events.link_create')}
            </Button>
        </div>
    )

    return (
        <Popover
            trigger='click'
            placement='right'
            open={abierto}
            onOpenChange={(v) => { if (!creando) setAbierto(v) }}
            content={contenido}
            title={t('side_events.link_generate')}
        >
            <Button icon={<Wand2 size={14} />}>{t('side_events.link_generate')}</Button>
        </Popover>
    )
}
