import { Button, Tooltip } from 'antd'
import { Clapperboard, Minus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { StorageImages } from '../../../../components/ImagesStorage/StorageImages'
import { CoverEffects } from './CoverEffects'

// "Imagen o video" de la portada: fotos/videos de fondo (hasta 5 s), su lista
// y los efectos (sombra / desenfoque). Es el bloque del panel de Portada
// (BuildCover) y también lo que abre el chip "Cambiar fondo" sobre la pieza
// en el modo edición (EditCanvas).
export const CoverMedia = ({ invitation, setInvitation, setSaved, invitationID, className, style }) => {
    const { t } = useTranslation()

    // Compatibilidad: la portada vieja guardaba un solo string.
    const raw = invitation?.cover?.image?.dev
    const currentMedia = Array.isArray(raw) ? raw : raw ? [raw] : []

    const setMedia = (next) => {
        const value = next.length === 0 ? null : next.length === 1 ? next[0] : next
        setInvitation((prev) => ({
            ...prev,
            cover: { ...prev.cover, image: { ...prev.cover.image, dev: value, prod: value } },
        }))
        setSaved(false)
    }
    const onAdd = (url) => { if (url) setMedia([...currentMedia, url]) }
    const onRemove = (index) => setMedia(currentMedia.filter((_, i) => i !== index))

    return (
        <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start', ...style }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' }}>
                <span className='module--title' style={{ textAlign: 'left', margin: 0 }}>
                    {t('build_cover.section_image')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} data-build-field='cover.image'>
                    <StorageImages type={'cover'} invitationID={invitationID} handleImage={onAdd} />
                    {/* Videos de portada: mismo selector que Flash y Save the Date
                        (máx. 5 s y 25 MB, en {id}/video/). La invitación los
                        reproduce en bucle y sin sonido (Cover de iattend-events). */}
                    <StorageImages
                        invitationID={invitationID}
                        mediaType='video'
                        handleImage={onAdd}
                        customTrigger={
                            <Tooltip title={t('build_cover.add_video')}>
                                <Button
                                    className='primarybutton'
                                    style={{ borderRadius: '99px' }}
                                    aria-label={t('build_cover.add_video')}
                                    icon={<Clapperboard size={15} style={{ marginTop: '2px' }} />}
                                />
                            </Tooltip>
                        }
                    />
                </div>
            </div>
            <span style={{ fontSize: '12px', color: '#8A8580', alignSelf: 'stretch', marginTop: '-4px' }}>
                {t('build_cover.video_hint')}
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignSelf: 'stretch' }}>
                {currentMedia.map((src, index) => {
                    const isVid = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src)
                    return (
                        <div key={src + index} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            background: 'var(--bg-color, #f5f5f5)', borderRadius: '10px',
                            padding: '6px 10px',
                        }}>
                            {isVid ? (
                                <video src={src} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} muted />
                            ) : (
                                <img alt='' src={src} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                            )}
                            <span style={{ flex: 1, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.5 }}>
                                {src.split('/').pop()}
                            </span>
                            <Button type='text' danger size='small' icon={<Minus size={13} />} onClick={() => onRemove(index)} />
                        </div>
                    )
                })}
            </div>

            <CoverEffects
                image={invitation.cover.image}
                primary={invitation.generals.colors.primary}
                onChange={(patch) => {
                    setInvitation((prev) => ({
                        ...prev,
                        cover: { ...prev.cover, image: { ...prev.cover.image, ...patch } },
                    }))
                    setSaved(false)
                }}
            />
        </div>
    )
}
