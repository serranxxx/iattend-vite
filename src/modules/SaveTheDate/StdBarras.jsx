import { useTranslation } from 'react-i18next'
import { DatePicker, Select, Tooltip } from 'antd'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight, Droplets, Film, ImagePlus, Link2, Moon, Plus, Video, X } from 'lucide-react'
import { useFonts } from '../../context/FontsContext'
import { fonts as fallbackFonts } from '../../helpers/assets/fonts'
import { StorageImages } from '../../components/ImagesStorage/StorageImages'
import bar from '../Invitation/Build/PageSections/ElementBar.module.css'
import own from '../SideEvents/Workspace/SideWorkspace.module.css'
import styles from './SaveTheDatePage.module.css'

/*
  Barras del Save the Date en el celular (en lugar del footer, como las del
  Pop: SideEvents/Workspace/SideBars.jsx). Mismas clases que las del Pop
  (ElementBar.module.css + la tira de fotos de SideWorkspace.module.css), pero
  sobre el formato del Save the Date: `cover` y `event_date`. El color de cada
  una abre ColoresIOS en la tarjeta flotante del editor (`onPickColor`).
*/

/* ── Fecha: día del evento, tipografía y color del contador ── */
export const StdFechaBar = ({ eventDate, onDate, typeFace, onTypeFace, color, titleColor, onColor, onPickColor, colorOpen }) => {
    const { t } = useTranslation()
    const { fonts: activeFonts } = useFonts()
    const fontOptions = activeFonts.length ? activeFonts : fallbackFonts

    return (
        <div className={bar.bar} data-edit-keep data-text-bar>
            <DatePicker
                className={bar.dateInput}
                allowClear={false}
                inputReadOnly
                format="D MMM YYYY"
                value={eventDate ? dayjs(eventDate.slice(0, 10)) : null}
                onChange={(d) => d && onDate(`${d.format('YYYY-MM-DD')}T00:00:00Z`)}
            />
            <Select
                className={bar.fontWide}
                value={typeFace}
                popupMatchSelectWidth={220}
                onChange={onTypeFace}
                options={fontOptions.map((f) => ({ value: f, label: <span style={{ fontFamily: `"${f}"` }}>{f}</span> }))}
            />

            <span className={bar.divider} />

            <button type="button" className={bar.swatchBtn} data-on={colorOpen || undefined} title={t('savethedate.color')} onClick={onPickColor}>
                <span className={bar.swatch} style={{ background: color }} />
            </button>
            {titleColor && color !== titleColor && (
                <button type="button" className={bar.textBtn} onClick={() => onColor(titleColor)}>
                    {t('build_editor.use_title_color')}
                </button>
            )}
        </div>
    )
}

/* ── Botón "Save the date": color translúcido (con opacidad) y los de siempre ── */
export const StdBotonBar = ({ color, swatches, onColor, onPickColor, colorOpen }) => {
    const { t } = useTranslation()
    const fondo = (c) => `linear-gradient(${c}, ${c}), #3f4d55`

    return (
        <div className={bar.bar} data-edit-keep data-text-bar>
            <span className={styles.btnPreview} style={{ background: fondo(color), marginLeft: 0 }}>Save the date</span>

            <span className={bar.divider} />

            {swatches.map((c) => (
                <button key={c} type="button" className={bar.swatchBtn} data-on={(c === color && !colorOpen) || undefined} aria-label={c} onClick={() => onColor(c)}>
                    <span className={bar.swatch} style={{ background: fondo(c) }} />
                </button>
            ))}

            <span className={bar.divider} />

            <button type="button" className={bar.textBtn} data-on={colorOpen || undefined} onClick={onPickColor}>
                <span className={bar.swatch} style={{ background: fondo(color), width: 20, height: 20 }} />
                {t('savethedate.color')}
            </button>
        </div>
    )
}

/* ── Fondo: fotos del carrusel o un video (con su imagen del link) ── */
export const StdFondoBar = ({
    carpeta, mediaMode, onMediaMode, images, onAddImage, onRemoveImage, onMoveImage, elegida, onElegir,
    video, onVideo, poster, onPoster, needsPoster, darken, onDarken, blur, onBlur,
}) => {
    const { t } = useTranslation()
    const sel = images.includes(elegida) ? elegida : null
    const idx = sel ? images.indexOf(sel) : -1

    const agregar = (contenido, props) => (
        <StorageImages
            invitationID={carpeta}
            {...props}
            customTrigger={<button type="button" className={own.fondoAgregar}>{contenido}</button>}
        />
    )

    const mini = (src, { on, esVideo, onClick, onQuitar, link }) => (
        <span key={src} className={own.fondoItem} data-on={on || undefined}>
            <button type="button" className={own.fondoMini} aria-pressed={on} onClick={onClick}>
                {esVideo
                    ? <video src={src} muted playsInline preload="metadata" />
                    : <img src={src} alt="" draggable={false} />}
            </button>
            {link && <span className={own.fondoLink}><Link2 size={11} /></span>}
            {on && onQuitar && (
                <button type="button" className={own.fondoQuitar} aria-label={t('savethedate.remove_image')} onClick={onQuitar}>
                    <X size={12} strokeWidth={3} />
                </button>
            )}
        </span>
    )

    return (
        <div className={bar.bar} data-edit-keep data-text-bar>
            {/* Fotos (carrusel) o video: un solo tipo de fondo a la vez. */}
            <button type="button" className={bar.iconBtn} data-on={mediaMode === 'image' || undefined} title={t('savethedate.media_images')} onClick={() => onMediaMode('image')}>
                <ImagePlus size={18} />
            </button>
            <button type="button" className={bar.iconBtn} data-on={mediaMode === 'video' || undefined} title={t('savethedate.media_video')} onClick={() => onMediaMode('video')}>
                <Film size={18} />
            </button>

            <span className={bar.divider} />

            {mediaMode === 'image' ? (
                <div className={own.fondoTira}>
                    {images.map((src) => mini(src, {
                        on: src === sel,
                        onClick: () => onElegir(src === sel ? null : src),
                        onQuitar: () => { onRemoveImage(images.indexOf(src)); onElegir(null) },
                    }))}
                    {agregar(<Plus size={20} />, { type: 'side-events', handleImage: (url) => { if (url) onAddImage(url) } })}
                </div>
            ) : (
                <div className={own.fondoTira}>
                    {video && mini(video, { on: true, esVideo: true, onQuitar: () => onVideo(null) })}
                    {agregar(<Video size={18} />, { mediaType: 'video', handleImage: (url) => { if (url) onVideo(url) } })}
                    {/* Imagen del link (póster): la que se ve al compartir. */}
                    <span className={bar.divider} />
                    {poster && mini(poster, { on: true, link: true, onQuitar: () => onPoster(null) })}
                    <Tooltip placement="top" title={t('savethedate.poster_hint')}>
                        <span className={needsPoster ? styles.posterAlerta : undefined}>
                            {agregar(<Link2 size={18} />, { type: 'side-events', handleImage: (url) => { if (url) onPoster(url) } })}
                        </span>
                    </Tooltip>
                </div>
            )}

            {/* Reordenar la foto elegida dentro del carrusel. */}
            {sel && images.length > 1 && (
                <>
                    <span className={bar.divider} />
                    <button type="button" className={bar.iconBtn} disabled={idx <= 0} aria-label={t('savethedate.move_left')} onClick={() => { onMoveImage(idx, -1) }}>
                        <ChevronLeft size={18} />
                    </button>
                    <button type="button" className={bar.iconBtn} disabled={idx >= images.length - 1} aria-label={t('savethedate.move_right')} onClick={() => { onMoveImage(idx, 1) }}>
                        <ChevronRight size={18} />
                    </button>
                </>
            )}

            <span className={bar.divider} />

            <button type="button" className={bar.textBtn} data-on={darken || undefined} onClick={() => onDarken(!darken)}>
                <Moon size={17} /> {t('savethedate.darken')}
            </button>
            <button type="button" className={bar.textBtn} data-on={blur || undefined} onClick={() => onBlur(!blur)}>
                <Droplets size={17} /> {t('savethedate.blur')}
            </button>
        </div>
    )
}
