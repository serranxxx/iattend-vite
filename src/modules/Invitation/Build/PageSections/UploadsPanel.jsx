import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, Segmented, message } from 'antd'
import axios from 'axios'
import { CloudUpload, LoaderCircle, Trash2, X } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { deleteImageFromSupabase, deleteVideoFromSupabase, uploadEventVideo, uploadImagesSupabase } from '../../../../helpers/services/uploadImage'
import { startLayerDrag, stickerItem, uploadStickers } from './layerItems'
import { useEditorCatalog } from './useEditorCatalog'
import { MB, getStorageQuota } from '../../../../helpers/services/storageQuota'
import { liaHeaders } from '../../../../pages/Lia/liaApi'
import { useLia } from '../../../../context/LiaContext'
import base from './ToolPanels.module.css'
import styles from './UploadsPanel.module.css'

// Panel Subidos (handoff "Panel lateral" 4.4): las fotos, PNG y videos de
// esta invitación en una sola cuadrícula. Reúne lo que antes eran Stickers e
// Imágenes → Mis imágenes. Viven en el bucket `user_images`:
//   fotos  → {id}/            (las mismas de "Mis imágenes")
//   videos → {id}/video/
//   PNG    → inv-{id}/        (los stickers subidos)
// Subir: PNG va a stickers, otras imágenes a fotos, videos a video/ (máx.
// 5 s). A la invitación se agregan ARRASTRANDO (fotos y PNG como sticker);
// los videos se usan desde "Cambiar fondo" de la portada. Eliminar pasa por
// los helpers de siempre, que no borran lo que la invitación está usando.

// Espacio extra: 10 → 30 MB por 100 créditos (el backend es la fuente:
// GET /api/storage/package; esto es solo el texto mientras carga).
const EXTRA = { extra_mb: 30, cost: 100 }
const esVideo = (name) => /\.(mp4|webm|mov|m4v)$/i.test(name)
const esAudio = (name) => /\.(mp3|wav|m4a|aac|ogg)$/i.test(name)

const listar = async (carpeta) => {
    const { data, error } = await supabase.storage.from('user_images').list(carpeta, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })
    if (error) { console.error(error); return [] }
    return (data ?? []).filter((f) => f.id !== null).map((f) => {
        const path = `${carpeta}/${f.name}`
        return { path, name: f.name, size: f.metadata?.size ?? 0, url: supabase.storage.from('user_images').getPublicUrl(path).data.publicUrl }
    })
}

const mb = (bytes) => (bytes >= 1024 * 1024 * 100 ? Math.round(bytes / 1024 / 1024) : (bytes / 1024 / 1024).toFixed(1))

// `mediaRequest` (lo abre un picker de la pieza o de una barra: portada,
// Fondo → Foto, momentos…): modo "elegir". Arriba el aviso con una X, la
// cuadrícula se filtra a lo que pide (imágenes o videos) y tocar un archivo
// lo aplica (`handleImage(url, 0, id)`) y suelta el pedido. Un switch
// Subidos / Ideas muestra también las fotos de i attend: todas las
// categorías, primero la de la sección que pidió (portada, cita, dresscode).
const REQUEST_SECTION = { cover: 'cover', 'side-events': 'cover', quote: 'quote', dresscode: 'dresscode' }

export const UploadsPanel = ({ invitation, invitationID, mediaRequest, clearMedia }) => {
    const { t } = useTranslation()
    const [filter, setFilter] = useState('all')
    const [source, setSource] = useState('uploads')
    const catalog = useEditorCatalog()
    const isVideoRequest = mediaRequest?.mediaType === 'video'
    const sectionKey = REQUEST_SECTION[mediaRequest?.type]
    // Ideas: todas las categorías de fotos del catálogo, primero las de la
    // sección que pidió la imagen. Los subgrupos llevan el nombre de su padre.
    const ideaGroups = mediaRequest && !isVideoRequest
        ? catalog.photos
            .filter((c) => !c.parent_id)
            // Orden del catálogo: cada categoría seguida de sus subgrupos.
            .flatMap((root) => [root, ...catalog.photos.filter((c) => c.parent_id === root.id)].map((c) => ({
                ...c,
                label: c.parent_id ? `${root.name_es} · ${c.name_es}` : c.name_es,
                match: (c.section_key ?? root.section_key) === sectionKey,
            })))
            .filter((c) => c.assets.length)
            .sort((a, b) => Number(b.match) - Number(a.match))
        : []
    useEffect(() => { setSource('uploads') }, [mediaRequest?.n])
    const apply = (url) => {
        mediaRequest.handleImage?.(url, 0, mediaRequest.id)
        clearMedia?.()
    }
    const [files, setFiles] = useState({ photos: [], pngs: [], videos: [] })
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(0)
    const [over, setOver] = useState(false)
    const inputRef = useRef(null)

    // Límite de "Subidos" (storageQuota.js): usado según Storage y límite de la invitación.
    const [quota, setQuota] = useState(null)
    const [pkg, setPkg] = useState(EXTRA)
    const [buyOpen, setBuyOpen] = useState(false)
    // Dos pasos: la oferta y "¿Estás seguro?" antes de descontar créditos.
    const [confirming, setConfirming] = useState(false)
    useEffect(() => { if (!buyOpen) setConfirming(false) }, [buyOpen])
    // Burbuja "-100 créditos" y recarga del contador del header (CreditController).
    const { setCreditSuccess } = useLia()
    const [buying, setBuying] = useState(false)
    const cargarQuota = () => invitationID && getStorageQuota(invitationID).then(setQuota).catch(() => {})
    useEffect(() => {
        cargarQuota()
        axios.get(`${import.meta.env.VITE_API_URL}/api/storage/package`).then(({ data }) => data?.package && setPkg(data.package)).catch(() => {})
        const onChange = () => cargarQuota()
        // Una subida chocó con el límite: se ofrece ampliar.
        const onFull = (e) => { if (!e.detail?.invitationID || e.detail.invitationID === invitationID) { cargarQuota(); setBuyOpen(true) } }
        window.addEventListener('iattend-storage-changed', onChange)
        window.addEventListener('iattend-storage-full', onFull)
        return () => {
            window.removeEventListener('iattend-storage-changed', onChange)
            window.removeEventListener('iattend-storage-full', onFull)
        }
    }, [invitationID])

    const comprar = async () => {
        setBuying(true)
        try {
            const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/storage/upgrade`, { invitation_id: invitationID }, { headers: await liaHeaders() })
            if (data?.success) {
                message.success(t('build_editor.up_upgraded', { mb: data.storage_limit_mb }))
                setBuyOpen(false)
                cargarQuota()
                setCreditSuccess?.(pkg.cost)
            }
        } catch (err) {
            const code = err?.response?.data?.code
            message.warning(code === 'NOT_ENOUGH_CREDITS' ? t('build_editor.up_no_credits') : err?.response?.data?.message || t('build_editor.up_upgrade_error'))
        } finally {
            setBuying(false)
        }
    }

    const cargar = async () => {
        if (!invitationID) return
        const [raiz, videos, pngs] = await Promise.all([listar(invitationID), listar(`${invitationID}/video`), listar(`inv-${invitationID}`)])
        setFiles({
            photos: raiz.filter((f) => !esVideo(f.name) && !esAudio(f.name)),
            videos: videos.filter((f) => esVideo(f.name)),
            pngs,
        })
        setLoading(false)
        cargarQuota()
    }
    useEffect(() => { cargar() }, [invitationID])

    const subir = async (lista) => {
        const archivos = [...lista].filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
        if (!archivos.length) return
        setUploading(archivos.length)
        for (const file of archivos) {
            try {
                if (file.type.startsWith('video/')) await uploadEventVideo({ file, invitationID, setVideos: () => {} })
                else if (file.type === 'image/png') await uploadStickers([file], invitationID)
                else await uploadImagesSupabase({ file, invitationID, setImages: () => {} })
            } catch (e) {
                console.error(e)
                message.error(t('build_editor.up_error', { name: file.name }))
            } finally {
                setUploading((n) => n - 1)
            }
        }
        cargar()
    }

    // PNG (sticker): no se borra si está puesto en la invitación.
    const borrarPng = async (f) => {
        const enUso = JSON.stringify(invitation?.decorations ?? {}).includes(f.url)
        if (enUso) { message.warning(t('build_editor.up_in_use')); return }
        const { error } = await supabase.storage.from('user_images').remove([f.path])
        if (error) { message.error(t('build_editor.up_delete_error')); return }
        cargar()
    }
    const borrar = (f, kind) => {
        if (kind === 'png') return borrarPng(f)
        if (kind === 'video') return deleteVideoFromSupabase(f.path, invitationID, () => cargar())
        return deleteImageFromSupabase(f.path, invitationID, () => cargar())
    }

    // Pidiendo un archivo: solo lo que sirve (imágenes o videos).
    const show = mediaRequest ? (isVideoRequest ? 'videos' : filter === 'videos' ? 'all' : filter) : filter
    const items = [
        ...(show === 'all' || show === 'photos' ? files.photos.map((f) => ({ ...f, kind: 'photo' })) : []),
        ...(show === 'all' || show === 'png' ? files.pngs.map((f) => ({ ...f, kind: 'png' })) : []),
        ...((!mediaRequest && (show === 'all' || show === 'videos')) || isVideoRequest ? files.videos.map((f) => ({ ...f, kind: 'video' })) : []),
    ]
    const used = quota?.used ?? [...files.photos, ...files.pngs, ...files.videos].reduce((n, f) => n + f.size, 0)
    const limitMb = quota?.limitMb ?? null
    const ratio = limitMb ? used / (limitMb * MB) : 0
    const canUpgrade = limitMb != null && limitMb < pkg.extra_mb

    return (
        <div className={styles.wrap}>
            {mediaRequest && (
                <div className={styles.request}>
                    <span>{t(isVideoRequest ? 'build_editor.media_choosing_video' : 'build_editor.media_choosing')}</span>
                    <button type="button" aria-label={t('build_editor.close')} onClick={clearMedia}><X size={14} /></button>
                </div>
            )}
            {ideaGroups.length > 0 && (
                <Segmented
                    block
                    shape="round"
                    value={source}
                    onChange={setSource}
                    options={[{ label: t('build_editor.tool_uploads'), value: 'uploads' }, { label: t('build_editor.up_ideas'), value: 'ideas' }]}
                />
            )}
            {source === 'ideas' && ideaGroups.length > 0 ? (
                <div className={styles.ideas}>
                    {ideaGroups.map((g) => (
                        <div key={g.id} className={styles.ideaGroup}>
                            <span className={styles.ideaTitle}>{g.label}</span>
                            <div className={styles.grid}>
                                {g.assets.map((a) => (
                                    <button key={a.id} type="button" className={styles.cell} data-pick onClick={() => apply(a.url)}>
                                        <img src={a.url} alt={a.name} loading="lazy" draggable={false} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
            <>
            {/* Zona de carga compacta */}
            <button
                type="button"
                className={styles.drop}
                data-over={over || undefined}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setOver(true) }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); subir(e.dataTransfer.files) }}
            >
                <span className={styles.dropIcon}>{uploading ? <LoaderCircle size={18} className={styles.spin} /> : <CloudUpload size={18} />}</span>
                <span className={styles.dropText}>
                    <strong>{uploading ? t('build_editor.up_uploading', { n: uploading }) : t('build_editor.up_title')}</strong>
                    <span>{t('build_editor.up_hint')}</span>
                </span>
                <input ref={inputRef} type="file" multiple accept="image/*,video/*" hidden onChange={(e) => { subir(e.target.files); e.target.value = '' }} />
            </button>

            {/* Filtros en pills, fijos arriba al hacer scroll (como Elementos). */}
            {!isVideoRequest && (
                <div className={styles.sticky}>
                    <div className={`${styles.chips} scroll-invitation`}>
                        {[
                            ['all', t('build_editor.up_all')],
                            ['photos', t('build_editor.up_photos')],
                            ['png', 'PNG'],
                            ...(mediaRequest ? [] : [['videos', t('build_editor.up_videos')]]),
                        ].map(([key, label]) => (
                            <button key={key} type="button" className={styles.chip} data-on={show === key || undefined} onClick={() => setFilter(key)}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {loading ? (
                <div className={styles.grid}>{Array.from({ length: 6 }).map((_, i) => <span key={i} className={styles.cell} data-loading />)}</div>
            ) : items.length ? (
                <div className={styles.grid}>
                    {items.map((f) => (
                        <div
                            key={f.path}
                            className={styles.cell}
                            data-kind={f.kind}
                            data-pick={mediaRequest ? true : undefined}
                            title={mediaRequest ? t('build_editor.up_pick') : f.kind === 'video' ? t('build_editor.up_video_hint') : f.name}
                            onClick={mediaRequest ? (e) => { if (!e.target.closest('button')) apply(f.url) } : undefined}
                            onPointerDown={mediaRequest || f.kind === 'video' ? undefined : (e) => {
                                if (e.target.closest('button')) return
                                startLayerDrag(e, stickerItem(f.url))
                            }}
                        >
                            {f.kind === 'video'
                                ? <video src={f.url} muted preload="metadata" />
                                : <img src={f.url} alt="" loading="lazy" draggable={false} />}
                            {f.kind !== 'photo' && <span className={styles.tag}>{f.kind === 'png' ? 'PNG' : 'VIDEO'}</span>}
                            <button type="button" className={styles.delete} aria-label={t('build_editor.up_delete')} onClick={() => borrar(f, f.kind)}>
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <span className={base.empty}>{t('build_editor.up_empty')}</span>
            )}

            </>
            )}

            {/* Medidor de "Subidos" (el Photo Wall no cuenta) y espacio extra */}
            <div className={styles.meter} data-level={ratio >= 1 ? 'full' : ratio >= 0.8 ? 'high' : undefined}>
                <div className={styles.meterBar}><span style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div>
                <div className={styles.meterRow}>
                    <span>{limitMb ? t('build_editor.up_storage_of', { used: mb(used), limit: limitMb }) : t('build_editor.up_storage_used', { used: mb(used) })}</span>
                    {canUpgrade && (
                        <Popover
                            open={buyOpen}
                            onOpenChange={setBuyOpen}
                            trigger="click"
                            placement="topRight"
                            arrow={false}
                            content={(
                                <div className={styles.buy} data-text-bar>
                                    {!confirming ? (
                                        <>
                                            <strong>{t('build_editor.up_buy_title', { mb: pkg.extra_mb })}</strong>
                                            <span>{t('build_editor.up_buy_desc', { from: limitMb, to: pkg.extra_mb, cost: pkg.cost })}</span>
                                            <button type="button" className={styles.buyBtn} onClick={() => setConfirming(true)}>
                                                {t('build_editor.up_buy_cta', { cost: pkg.cost })}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <strong>{t('build_editor.up_confirm_title')}</strong>
                                            <span>{t('build_editor.up_confirm_desc', { cost: pkg.cost, from: limitMb, to: pkg.extra_mb })}</span>
                                            <div className={styles.buyRow}>
                                                <button type="button" className={styles.cancelBtn} disabled={buying} onClick={() => setConfirming(false)}>
                                                    {t('build_editor.up_confirm_no')}
                                                </button>
                                                <button type="button" className={styles.buyBtn} disabled={buying} onClick={comprar}>
                                                    {buying ? <LoaderCircle size={15} className={styles.spin} /> : null}
                                                    {t('build_editor.up_confirm_yes')}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        >
                            <button type="button" className={styles.upgrade}>{t('build_editor.up_upgrade', { mb: pkg.extra_mb })}</button>
                        </Popover>
                    )}
                </div>
                <span className={styles.meterNote}>{t('build_editor.up_storage_note')}</span>
            </div>
        </div>
    )
}
