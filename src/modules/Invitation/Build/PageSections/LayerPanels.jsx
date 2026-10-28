import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message } from 'antd'
import {
    Bird, Cake, Camera, Church, Flower, Flower2, Gem, Heart, Infinity as InfinityIcon,
    Leaf, LoaderCircle, Moon, Music, Search, Sparkles, Star, Sun, Upload, Wine,
} from 'lucide-react'
import {
    countStickers, LAYER_ICONS, LINE_VARIANTS, MAX_STICKERS,
    SEPARATORS, SHAPES, startLayerDrag, stickerItem, stickerLibrary, uploadStickers,
} from './layerItems'
import { Separador } from '../../../../components/Invitation/Logos'
import base from './ToolPanels.module.css'
import styles from './LayerPanels.module.css'

// Paneles Elementos y Stickers del editor de escritorio (etapa 3). Cada
// tarjeta se arrastra a la invitación (o se agrega con un clic a la sección
// que se ve). La pieza los pinta y los edita: SectionLayer en iattend-events.

// Palabras para el buscador de íconos (es / en).
const ICON_WORDS = {
    Heart: 'corazon amor heart love', Sparkles: 'brillos destellos sparkles', Star: 'estrella star',
    Flower: 'flor flower', Flower2: 'flor margarita flower daisy', Leaf: 'hoja leaf planta',
    Gem: 'diamante anillo gem ring', Moon: 'luna noche moon night', Sun: 'sol sun dia',
    Wine: 'copa vino brindis wine', Music: 'musica music nota', Camera: 'camara foto camera photo',
    Church: 'iglesia church boda', Infinity: 'infinito infinity', Bird: 'pajaro ave bird', Cake: 'pastel cake',
}

const ICONS = {
    Heart, Sparkles, Star, Flower, Flower2, Leaf, Gem, Moon, Sun, Wine, Music, Camera, Church, Infinity: InfinityIcon, Bird, Cake,
}

// Muestra de cada forma en el panel (la pieza las dibuja en SectionLayer).
const ShapeSample = ({ variant }) => {
    const box = variant === 'rect' ? { width: 30, height: 18 } : { width: 22, height: 22 }
    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" {...box} fill="currentColor">
            {variant === 'circle' ? <ellipse cx="50" cy="50" rx="50" ry="50" />
                : variant === 'triangle' ? <polygon points="50,2 98,98 2,98" />
                : variant === 'star' ? <polygon points="50,3 61,37 97,37 68,59 79,94 50,72 21,94 32,59 3,37 39,37" />
                : <rect x="0" y="0" width="100" height="100" />}
        </svg>
    )
}

const TEXT_CARDS = [
    { variant: 'title', w: 60 },
    { variant: 'subtitle', w: 50 },
    { variant: 'body', w: 70 },
]

export const ElementsPanel = ({ invitation }) => {
    const { t } = useTranslation()
    const [query, setQuery] = useState('')
    const q = query.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const titleFont = invitation?.generals?.fonts?.titles?.typeFace ?? invitation?.generals?.fonts?.body?.typeFace
    const bodyFont = invitation?.generals?.fonts?.body?.typeFace

    const icons = LAYER_ICONS.filter((name) => !q || ICON_WORDS[name]?.includes(q) || name.toLowerCase().includes(q))
    const textMatch = (variant) => !q || t(`build_editor.el_${variant}`).toLowerCase().includes(q) || 'texto text'.includes(q)
    const texts = TEXT_CARDS.filter((c) => textMatch(c.variant))
    const lines = !q || 'linea line'.includes(q) ? LINE_VARIANTS : []
    const separators = !q || 'separador separator adorno ornament decoracion decoration'.includes(q) ? SEPARATORS : []
    const shapes = !q || 'forma shape cuadrado circulo rectangulo triangulo estrella square circle rect triangle star'.includes(q) ? SHAPES : []
    const accent = invitation?.generals?.colors?.accent ?? '#29262D'

    return (
        <>
            <label className={base.search}>
                <Search size={15} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('build_editor.el_search')} />
            </label>
            <span className={base.hint} style={{ marginTop: 0 }}>{t('build_editor.el_hint')}</span>

            {texts.length > 0 && (
                <div className={base.group}>
                    <span className={base.groupLabel}>{t('build_editor.el_text')}</span>
                    <span className={base.hint}>{t('build_editor.el_text_note')}</span>
                    {texts.map((c) => (
                        <div
                            key={c.variant}
                            className={styles.textCard}
                            data-variant={c.variant}
                            style={{ fontFamily: `"${c.variant === 'title' ? titleFont : bodyFont}"` }}
                            onPointerDown={(e) => startLayerDrag(e, { kind: 'text', variant: c.variant, text: t(`build_editor.el_${c.variant}_text`), w: c.w, rot: 0, opacity: 1 })}
                        >
                            {t(`build_editor.el_${c.variant}`)}
                        </div>
                    ))}
                </div>
            )}

            {icons.length > 0 && (
                <div className={base.group}>
                    <span className={base.groupLabel}>{t('build_editor.el_icons')}</span>
                    <div className={styles.iconGrid}>
                        {icons.map((name) => {
                            const Icon = ICONS[name]
                            return (
                                <div key={name} className={styles.iconCell} onPointerDown={(e) => startLayerDrag(e, { kind: 'icon', icon: name, w: 14, rot: 0, opacity: 1 })}>
                                    <Icon size={22} strokeWidth={1.7} />
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {lines.length > 0 && (
                <div className={base.group}>
                    <span className={base.groupLabel}>{t('build_editor.el_lines')}</span>
                    <div className={styles.lineGrid}>
                        {lines.map((variant) => (
                            <div key={variant} className={styles.lineCell} onPointerDown={(e) => startLayerDrag(e, { kind: 'line', variant, w: 50, rot: 0, opacity: 1 })}>
                                <span className={styles.lineSample} data-variant={variant} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {shapes.length > 0 && (
                <div className={base.group}>
                    <span className={base.groupLabel}>{t('build_editor.el_shapes')}</span>
                    <div className={styles.shapeGrid}>
                        {shapes.map((sh) => (
                            <div
                                key={sh.variant}
                                className={styles.iconCell}
                                onPointerDown={(e) => startLayerDrag(e, { kind: 'shape', variant: sh.variant, w: sh.w, ar: sh.ar, rot: 0, opacity: 1, strokeWidth: 0 })}
                            >
                                <ShapeSample variant={sh.variant} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {separators.length > 0 && (
                <div className={base.group}>
                    <span className={base.groupLabel}>{t('build_editor.el_separators')}</span>
                    <div className={styles.lineGrid}>
                        {separators.map((n) => (
                            <div key={n} className={`${styles.lineCell} ${styles.sepCell}`} onPointerDown={(e) => startLayerDrag(e, { kind: 'separator', variant: String(n), w: 60, rot: 0, opacity: 1 })}>
                                <Separador MainColor={accent} value={n} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!texts.length && !icons.length && !lines.length && !separators.length && !shapes.length && <span className={base.empty}>{t('build_editor.el_none')}</span>}
        </>
    )
}

export const StickersPanel = ({ invitation, invitationID }) => {
    const { t } = useTranslation()
    const inputRef = useRef(null)
    const [uploading, setUploading] = useState(false)
    const [over, setOver] = useState(false)
    const [libraryTick, setLibraryTick] = useState(0)
    useEffect(() => {
        const bump = () => setLibraryTick((n) => n + 1)
        window.addEventListener('iattend-sticker-library', bump)
        return () => window.removeEventListener('iattend-sticker-library', bump)
    }, [])

    const library = useMemo(() => stickerLibrary(invitationID, invitation), [invitationID, invitation, libraryTick])
    const placed = countStickers(invitation)
    const full = placed >= MAX_STICKERS

    const upload = async (files) => {
        if (!files?.length) return
        setUploading(true)
        try {
            await uploadStickers(Array.from(files), invitationID)
        } catch (err) {
            console.error(err)
            message.error(t('build_editor.st_error'))
        } finally {
            setUploading(false)
        }
    }

    return (
        <>
            <button
                type="button"
                className={styles.dropzone}
                data-over={over || undefined}
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setOver(true) }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files) }}
            >
                {uploading ? <LoaderCircle size={20} className={styles.spin} /> : <Upload size={20} />}
                <span className={styles.dropTitle}>{uploading ? t('build_editor.st_uploading') : t('build_editor.st_upload')}</span>
                <span className={styles.dropHint}>{t('build_editor.st_upload_hint')}</span>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/webp,image/gif,image/svg+xml,image/jpeg"
                    multiple
                    hidden
                    onChange={(e) => { upload(e.target.files); e.target.value = '' }}
                />
            </button>

            <div className={base.group}>
                <div className={styles.groupHead}>
                    <span className={base.groupLabel}>{t('build_editor.st_yours')}</span>
                    <span className={styles.count} data-full={full || undefined}>{placed} / {MAX_STICKERS}</span>
                </div>
                {full && <span className={base.hint} style={{ marginTop: 0 }}>{t('build_editor.st_full')}</span>}
                {library.length ? (
                    <div className={styles.stickerGrid}>
                        {library.map((url) => (
                            <div
                                key={url}
                                className={styles.stickerCell}
                                data-disabled={full || undefined}
                                onPointerDown={(e) => startLayerDrag(e, stickerItem(url), { disabled: full })}
                            >
                                <img src={url} alt="" draggable={false} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <span className={base.empty}>{t('build_editor.st_empty')}</span>
                )}
            </div>
        </>
    )
}
