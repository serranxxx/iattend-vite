import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message, Popconfirm } from 'antd'
import { Check, Copy, ImagePlus, TriangleAlert } from 'lucide-react'
import { VistaLinkWhatsApp } from '../VistaLinkWhatsApp'
import { PortadaEnVivo } from '../PortadaEnVivo'
import { PIEZA_ANCHO } from '../stickersPopData'
import { soloVideos } from '../fotosPortada'
import { urlSide } from '../../../helpers/invitation/sideEventLink'
import { supabase } from '../../../lib/supabase'
import tp from '../../Invitation/Build/PageSections/ToolPanels.module.css'
import s from '../../Editor/WalletPanel.module.css'
import l from './LinkPanel.module.css'

/*
  "Imagen del link" de un Pop (herramienta del riel, SideWorkspace): cómo se
  ve el link al mandarlo por WhatsApp y qué imagen lleva, con dos opciones:
  · Usar portada (sin `body.linkImage`): la portada con todo lo que tiene
    encima (stickers, dibujos, elementos), que se arma sola al guardar
    (SideEvents.jsx, imagenDelLink). No aplica si la portada es un video.
  · Subir foto (`body.linkImage`): una imagen subida o elegida en Subidos; al
    guardar es `url_image` tal cual.
  Con portada de video y sin foto, el riel marca la herramienta con un punto
  rojo (SideWorkspace, `aviso`). La misma imagen es la foto del pase de Apple
  Wallet si el pase no tiene una propia (WalletPanelPop).
*/

const MINI = 52 // ancho de la miniatura de la portada (px)

export const LinkPanel = ({ current, setBody, onPickImage }) => {
    const { t } = useTranslation()
    const body = current?.body ?? {}
    const propia = body.linkImage || null
    const conVideo = soloVideos(body)
    const url = urlSide(current)

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(url)
            message.success(t('side_events.link_copied'))
        } catch { /* sin permiso de portapapeles */ }
    }

    // Link viejo con el número (solo eventos de antes del código público):
    // sigue abriendo hasta que el organizador lo apaga. Apagarlo no se
    // deshace (si no, cualquier evento podría volver a abrir con su número).
    const [linkViejo, setLinkViejo] = useState(current?.legacy_link_enabled === true)
    const [apagando, setApagando] = useState(false)
    const apagarLinkViejo = async () => {
        setApagando(true)
        const { error } = await supabase.from('side_events').update({ legacy_link_enabled: false }).eq('id', current.id)
        setApagando(false)
        if (error) { message.error(t('side_events.link_legacy_error')); return }
        setLinkViejo(false)
        message.success(t('side_events.link_legacy_done'))
    }

    const subir = () => onPickImage((imagen) => imagen && setBody({ linkImage: imagen }))

    return (
        <div className={s.panel}>
            <p className={tp.hint} style={{ marginTop: 0 }}>{t('side_events.link_panel_intro')}</p>

            {conVideo && !propia && (
                <div className={l.aviso} role="alert">
                    <TriangleAlert size={16} />
                    <span>{t('side_events.link_video_alert')}</span>
                </div>
            )}

            <VistaLinkWhatsApp current={current} />

            <div className={tp.group}>
                <span className={tp.groupLabel}>{t('side_events.link_panel_image')}</span>
                <div className={l.opciones} role="radiogroup">
                    <button
                        type="button"
                        role="radio"
                        aria-checked={!propia}
                        aria-disabled={conVideo || undefined}
                        className={l.opcion}
                        data-on={!propia || undefined}
                        onClick={() => { if (!conVideo) setBody({ linkImage: null }) }}
                    >
                        <span className={l.mini}>
                            {conVideo
                                ? <span className={l.miniVacia} />
                                : (
                                    <span className={l.miniPieza} style={{ transform: `scale(${MINI / PIEZA_ANCHO})` }}>
                                        <PortadaEnVivo body={body} />
                                    </span>
                                )}
                        </span>
                        <span className={l.opcionTextos}>
                            <span className={l.opcionTitulo}>{t('side_events.link_opt_cover')}</span>
                            <span className={l.opcionSub}>{t(conVideo ? 'side_events.link_opt_cover_video' : 'side_events.link_opt_cover_sub')}</span>
                        </span>
                        {!propia && !conVideo && <span className={l.check}><Check size={13} /></span>}
                    </button>

                    <button
                        type="button"
                        role="radio"
                        aria-checked={Boolean(propia)}
                        className={l.opcion}
                        data-on={Boolean(propia) || undefined}
                        data-falta={(conVideo && !propia) || undefined}
                        onClick={subir}
                    >
                        <span className={l.mini}>
                            {propia ? <img src={propia} alt="" /> : <span className={l.miniVacia}><ImagePlus size={18} /></span>}
                        </span>
                        <span className={l.opcionTextos}>
                            <span className={l.opcionTitulo}>{t(propia ? 'side_events.link_opt_upload_change' : 'side_events.link_opt_upload')}</span>
                            <span className={l.opcionSub}>{t('side_events.link_size_hint')}</span>
                        </span>
                        {propia && <span className={l.check}><Check size={13} /></span>}
                    </button>
                </div>
            </div>

            <div className={tp.group}>
                <span className={tp.groupLabel}>{t('side_events.link_panel_url')}</span>
                <div className={l.url}>
                    <span className={l.urlTexto} title={url}>{url.replace('https://www.', '')}</span>
                    <button type="button" className={l.copiar} onClick={copiar} aria-label={t('side_events.story_share')}>
                        <Copy size={14} />
                    </button>
                </div>
                <span className={tp.hint}>{t('side_events.link_wallet_note')}</span>
            </div>

            {linkViejo && current?.public_code && (
                <div className={l.viejo}>
                    <span className={l.viejoTitulo}>{t('side_events.link_legacy_title')}</span>
                    <span className={l.viejoTexto}>
                        {t('side_events.link_legacy_text', { url: `iattend.events/side-event/${current.id}` })}
                    </span>
                    <Popconfirm
                        title={t('side_events.link_legacy_confirm')}
                        description={t('side_events.link_legacy_confirm_sub')}
                        okText={t('side_events.link_legacy_off')}
                        cancelText={t('dashboard_header.cancel')}
                        okButtonProps={{ danger: true, loading: apagando }}
                        onConfirm={apagarLinkViejo}
                        placement="top"
                    >
                        <button type="button" className={l.viejoBoton}>{t('side_events.link_legacy_off')}</button>
                    </Popconfirm>
                </div>
            )}
        </div>
    )
}
