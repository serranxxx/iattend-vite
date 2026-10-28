import { Button, ColorPicker, Input, Segmented, Slider, Switch } from 'antd'
import { Children, Fragment, useLayoutEffect, useRef, useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Ban, ImagePlus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Separador } from '../../../../components/Invitation/Logos'
import { StorageImages } from '../../../../components/ImagesStorage/StorageImages'
import { colorFactoryToHex } from '../../../../helpers/assets/functions'
import { CoverEffects } from './CoverEffects'
import { useTextures } from '../../../../context/TexturesContext'
import { AddressAutocomplete } from '../../../SideEvents/AddressAutocomplete'
import styles from './ModuleStyle.module.css'

// Fondo y separador de un módulo de la invitación (dynamic_background /
// dynamic_separator). Son los mismos datos del menú "⋮" de cada módulo
// (components/BuildMenu); aquí van como paneles para los botones que aparecen
// sobre la pieza al elegir el módulo en el modo edición (EditCanvas).

const SEPARATORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

const Row = ({ label, children }) => (
    <div className={styles.row}>
        <span className={styles.label}>{label}</span>
        <div className={styles.control}>{children}</div>
    </div>
)

const ValueSlider = ({ value, min, max, step = 1, unit = '', onChange }) => (
    <div className={styles.sliderWrap}>
        <Slider className={styles.slider} min={min} max={max} step={step} value={value} onChange={onChange} tooltip={{ open: false }} />
        <span className={styles.value}>{value}{unit}</span>
    </div>
)

// Panel de fondo de un bloque: una sola columna de 300px que, si no cabe a lo
// alto, hace scroll por dentro (alto máximo = lo que queda de pantalla debajo
// de donde abre). Cada hijo es un bloque con su separación.
const ScrollPanel = ({ children }) => {
    const blocks = Children.toArray(children).filter(Boolean)
    const rootRef = useRef(null)
    const [maxH, setMaxH] = useState(() => window.innerHeight - 140)
    // antd coloca el popover después del primer render: se vuelve a medir
    // unos cuadros hasta que queda en su lugar (y al cambiar la ventana).
    useLayoutEffect(() => {
        let frames = 0
        let id
        const measure = () => {
            const top = rootRef.current?.getBoundingClientRect().top ?? 100
            const room = Math.max(280, window.innerHeight - Math.max(top, 70) - 24)
            setMaxH((prev) => (Math.abs(room - prev) > 4 ? room : prev))
            if (++frames < 40) id = requestAnimationFrame(measure)
        }
        measure()
        const onResize = () => { frames = 0; measure() }
        window.addEventListener('resize', onResize)
        return () => { cancelAnimationFrame(id); window.removeEventListener('resize', onResize) }
    }, [])
    return (
        <div ref={rootRef} className={`${styles.panel} ${styles.scrollPanel} scroll-invitation`} style={{ maxHeight: maxH }}>
            {blocks.map((block, i) => (
                <div key={block.key ?? i} className={styles.block}>{block}</div>
            ))}
        </div>
    )
}

const useModule = (label, setInvitation, setSaved) => (key, patch) => {
    setInvitation((prev) => ({
        ...prev,
        [label]: { ...prev[label], [key]: { ...prev[label][key], ...patch } },
    }))
    setSaved(false)
}

// ¿El bloque tiene algún fondo (color, imagen o textura)? Igual que
// hasModuleBg en iattend-events (ModuleBackdrop.tsx).
const hasBg = (bg) => Boolean(bg?.active || bg?.image || (bg?.texture !== null && bg?.texture !== undefined))

// Texturas para el fondo de un bloque (aparte de la textura general).
const TextureStrip = ({ value, onPick }) => {
    const { t } = useTranslation()
    const { textures } = useTextures()
    return (
        <div className={styles.texStrip}>
            <button type="button" className={styles.texOption} data-on={value == null || undefined} title={t('build_editor.texture_none')} onClick={() => onPick(null)}>
                <Ban size={16} />
            </button>
            {textures.map((tex) => (
                <button key={tex.id} type="button" className={styles.texOption} data-on={value === tex.id || undefined} onClick={() => onPick(tex.id)}>
                    <img src={tex.image} alt="" loading="lazy" />
                </button>
            ))}
        </div>
    )
}

// Bordes, largo y sombra: aplican con cualquier fondo.
const ShapeRows = ({ bg, set }) => {
    const { t } = useTranslation()
    return (
        <>
            <Row label={t('build_menu.borders')}>
                <ValueSlider value={bg.border_radius ?? 0} min={0} max={99} step={2} unit="px" onChange={(border_radius) => set('dynamic_background', { border_radius })} />
            </Row>
            <Row label={t('build_menu.width')}>
                <ValueSlider value={bg.width ?? 100} min={70} max={100} step={5} unit="%" onChange={(width) => set('dynamic_background', { width })} />
            </Row>
            {/* Relleno arriba y abajo de la caja (24px = el de siempre). */}
            <Row label={t('build_editor.bg_padding')}>
                <ValueSlider value={bg.padding_y ?? 24} min={0} max={160} step={4} unit="px" onChange={(padding_y) => set('dynamic_background', { padding_y })} />
            </Row>
            <Row label={t('build_menu.shadow')}>
                <Switch size="small" checked={Boolean(bg.shadow)} onChange={(shadow) => set('dynamic_background', { shadow })} />
            </Row>
        </>
    )
}

// Color, bordes, largo y sombra de dynamic_background.
const BackgroundRows = ({ invitation, label, setInvitation, setSaved, colorOnly = false }) => {
    const { t } = useTranslation()
    const set = useModule(label, setInvitation, setSaved)
    const bg = invitation?.[label]?.dynamic_background ?? {}
    const theme = invitation?.generals?.colors?.secondary ?? '#FFFFFF'
    return (
        <>
                <Row label={t('build_menu.color')}>
                    <div className={styles.colorRow}>
                        {bg.custom_color && (
                            <button type="button" className={styles.link} onClick={() => set('dynamic_background', { custom_color: null })}>
                                {t('build_menu.use_theme')}
                            </button>
                        )}
                        <ColorPicker
                            size="small"
                            disabledAlpha
                            value={bg.custom_color || theme}
                            onChangeComplete={(c) => set('dynamic_background', { custom_color: colorFactoryToHex(c) })}
                        />
                    </div>
                </Row>
                {!colorOnly && <ShapeRows bg={bg} set={set} />}
        </>
    )
}

// "Invertir color": textos del módulo con el color principal del tema
// (`<módulo>.inverted`, lo mismo que el menú "⋮" del módulo). No depende de
// que el fondo esté prendido, por eso va fuera de sus ajustes.
const InvertRow = ({ invitation, label, setInvitation, setSaved, plain = false }) => {
    const { t } = useTranslation()
    const inverted = Boolean(invitation?.[label]?.inverted)
    return (
        <div className={plain ? styles.row : `${styles.row} ${styles.divided}`}>
            <span className={styles.labelWide}>{t('build_menu.invert_color')}</span>
            <Switch
                size="small"
                checked={inverted}
                onChange={(value) => {
                    setInvitation((prev) => ({ ...prev, [label]: { ...prev[label], inverted: value } }))
                    setSaved(false)
                }}
            />
        </div>
    )
}

// Fondo de un bloque: color, imagen y/o textura, cada uno por su lado (se
// pueden combinar) y aparte de la textura general. Bordes, largo y sombra
// aplican con cualquiera. Lo pinta ModuleBackdrop en iattend-events.
export const ModuleBackground = ({ invitation, label, setInvitation, setSaved, invitationID }) => {
    const { t } = useTranslation()
    const set = useModule(label, setInvitation, setSaved)
    const bg = invitation?.[label]?.dynamic_background ?? {}

    return (
        <ScrollPanel>
            <span key="title" className={styles.title}>{t('build_editor.background')}</span>

            <Fragment key="color">
            <div className={styles.subHead}>
                <span className={styles.subTitle}>{t('build_menu.color')}</span>
                <Switch size="small" checked={Boolean(bg.active)} onChange={(active) => set('dynamic_background', { active })} />
            </div>
            <div className={styles.body} data-off={!bg.active || undefined}>
                <BackgroundRows invitation={invitation} label={label} setInvitation={setInvitation} setSaved={setSaved} colorOnly />
            </div>
            <InvertRow invitation={invitation} label={label} setInvitation={setInvitation} setSaved={setSaved} plain />
            </Fragment>

            <Fragment key="image">
            <div className={`${styles.subHead} ${styles.divided}`}>
                <span className={styles.subTitle}>{t('build_editor.bg_image')}</span>
                {bg.image && (
                    <button type="button" className={styles.link} onClick={() => set('dynamic_background', { image: null })}>
                        {t('build_editor.remove_image')}
                    </button>
                )}
            </div>
            <div className={styles.sepImage}>
                {bg.image && <img src={bg.image} alt="" />}
                <StorageImages placement="right" absolute isNull invitationID={invitationID} handleImage={(url) => url && set('dynamic_background', { image: url })} />
            </div>
            {bg.image && (
                <Row label={t('build_cover.label_opacity')}>
                    <ValueSlider value={Math.round((bg.image_opacity ?? 1) * 100)} min={10} max={100} step={5} unit="%" onChange={(v) => set('dynamic_background', { image_opacity: v / 100 })} />
                </Row>
            )}
            </Fragment>

            <Fragment key="texture">
            <div className={`${styles.subHead} ${styles.divided}`}>
                <span className={styles.subTitle}>{t('build_editor.bg_texture')}</span>
            </div>
            <TextureStrip value={bg.texture ?? null} onPick={(texture) => set('dynamic_background', { texture })} />
            {bg.texture != null && (
                <Row label={t('build_editor.texture_intensity')}>
                    <ValueSlider value={Math.round((bg.texture_opacity ?? 1) * 100)} min={10} max={100} step={5} unit="%" onChange={(v) => set('dynamic_background', { texture_opacity: v / 100 })} />
                </Row>
            )}
            </Fragment>

            <div key="shape" className={`${styles.body} ${styles.divided}`} data-off={!hasBg(bg) || undefined}>
                <ShapeRows bg={bg} set={set} />
            </div>
        </ScrollPanel>
    )
}

// Fondo de la Cita: o imagen o color, nunca los dos (quote.image.active y
// quote.dynamic_background.active se excluyen). Es el botón de fondo del
// módulo y el "Cambiar fondo" que aparece sobre su imagen.
export const QuoteBackground = ({ invitation, setInvitation, setSaved, invitationID }) => {
    const { t } = useTranslation()
    const quote = invitation?.quote ?? {}
    const mode = quote.image?.active ? 'image' : quote.dynamic_background?.active ? 'color' : 'none'

    const setMode = (next) => {
        setInvitation((prev) => ({
            ...prev,
            quote: {
                ...prev.quote,
                image: { ...prev.quote.image, active: next === 'image' },
                dynamic_background: { ...prev.quote.dynamic_background, active: next === 'color' },
            },
        }))
        setSaved(false)
    }
    const setImage = (url) => {
        if (!url) return
        setInvitation((prev) => ({ ...prev, quote: { ...prev.quote, image: { ...prev.quote.image, dev: url, prod: url, active: true }, dynamic_background: { ...prev.quote.dynamic_background, active: false } } }))
        setSaved(false)
    }
    const setImageProps = (patch) => {
        // Los efectos nuevos reemplazan la sombra vieja (text.shadow).
        const dropLegacy = 'background' in patch || 'blur' in patch
        setInvitation((prev) => ({
            ...prev,
            quote: {
                ...prev.quote,
                image: { ...prev.quote.image, ...patch },
                text: dropLegacy ? { ...prev.quote.text, shadow: false } : prev.quote.text,
            },
        }))
        setSaved(false)
    }
    const imageWidth = quote.image?.width ?? (quote.dynamic_background?.active ? quote.dynamic_background?.width : 100) ?? 100
    // Sin efectos guardados con el sistema nuevo, la sombra vieja cuenta como "Sombra".
    const fxImage = quote.image?.background === undefined && quote.image?.blur === undefined
        ? { ...quote.image, background: Boolean(quote.text?.shadow) }
        : quote.image
    const setRadius = (border_radius) => {
        setInvitation((prev) => ({ ...prev, quote: { ...prev.quote, dynamic_background: { ...prev.quote.dynamic_background, border_radius } } }))
        setSaved(false)
    }

    return (
        <ScrollPanel>
            <Fragment key="mode">
                <div className={styles.head}>
                    <span className={styles.title}>{t('build_editor.background')}</span>
                </div>
                <Segmented
                    block
                    className={styles.segmented}
                    value={mode}
                    onChange={setMode}
                    options={[
                        { value: 'none', label: t('build_editor.bg_none') },
                        { value: 'color', label: t('build_menu.color') },
                        { value: 'image', label: t('build_editor.bg_image') },
                    ]}
                />
            </Fragment>
            {mode === 'color' && (
                <div key="color" className={styles.body}>
                    <BackgroundRows invitation={invitation} label="quote" setInvitation={setInvitation} setSaved={setSaved} />
                </div>
            )}
            {mode === 'image' && (
                <div key="image" className={styles.body}>
                    <div className={styles.sepImage}>
                        {quote.image?.dev && <img src={quote.image.dev} alt="" />}
                        <StorageImages type="quote" placement="right" absolute isNull invitationID={invitationID} handleImage={setImage} />
                    </div>
                    <Row label={t('build_menu.borders')}>
                        <ValueSlider value={quote.dynamic_background?.border_radius ?? 0} min={0} max={99} step={2} unit="px" onChange={setRadius} />
                    </Row>
                    <Row label={t('build_menu.width')}>
                        <ValueSlider value={imageWidth} min={70} max={100} step={5} unit="%" onChange={(width) => setImageProps({ width })} />
                    </Row>
                </div>
            )}
            {mode === 'image' && (
                <div key="effects" className={styles.body}>
                    <CoverEffects image={fxImage} primary={invitation?.generals?.colors?.primary} onChange={setImageProps} />
                </div>
            )}

            {/* Textura propia del bloque (con o sin imagen / color). */}
            <Fragment key="texture">
                <div className={`${styles.subHead} ${styles.divided}`}>
                    <span className={styles.subTitle}>{t('build_editor.bg_texture')}</span>
                </div>
                <TextureStrip
                    value={quote.dynamic_background?.texture ?? null}
                    onPick={(texture) => {
                        setInvitation((prev) => ({ ...prev, quote: { ...prev.quote, dynamic_background: { ...prev.quote.dynamic_background, texture } } }))
                        setSaved(false)
                    }}
                />
                {quote.dynamic_background?.texture != null && (
                    <Row label={t('build_editor.texture_intensity')}>
                        <ValueSlider
                            value={Math.round((quote.dynamic_background?.texture_opacity ?? 1) * 100)}
                            min={10} max={100} step={5} unit="%"
                            onChange={(v) => {
                                setInvitation((prev) => ({ ...prev, quote: { ...prev.quote, dynamic_background: { ...prev.quote.dynamic_background, texture_opacity: v / 100 } } }))
                                setSaved(false)
                            }}
                        />
                    </Row>
                )}
            </Fragment>

            {/* Con imagen el texto lleva su propio color (la "T"). */}
            {mode !== 'image' && (
                <InvertRow key="invert" invitation={invitation} label="quote" setInvitation={setInvitation} setSaved={setSaved} />
            )}
        </ScrollPanel>
    )
}

export const ModuleSeparator = ({ invitation, label, setInvitation, setSaved, invitationID }) => {
    const { t } = useTranslation()
    const set = useModule(label, setInvitation, setSaved)
    const sep = invitation?.[label]?.dynamic_separator ?? {}
    const isImage = sep.type === 'image'

    const setSingle = (value) => {
        setInvitation((prev) => {
            const cur = prev[label].dynamic_separator
            return { ...prev, [label]: { ...prev[label], dynamic_separator: { ...cur, single: { ...cur.single, value } } } }
        })
        setSaved(false)
    }
    const setImage = (patch) => {
        setInvitation((prev) => {
            const cur = prev[label].dynamic_separator
            return { ...prev, [label]: { ...prev[label], dynamic_separator: { ...cur, image: { ...cur.image, ...patch } } } }
        })
        setSaved(false)
    }

    return (
        <div className={styles.panel}>
            <div className={styles.head}>
                <span className={styles.title}>{t('build_menu.separator')}</span>
                <Switch size="small" checked={Boolean(sep.active)} onChange={(active) => set('dynamic_separator', { active })} />
            </div>

            <div className={styles.body} data-off={!sep.active || undefined}>
                <Segmented
                    block
                    className={styles.segmented}
                    value={isImage ? 'image' : 'single'}
                    onChange={(type) => set('dynamic_separator', { type })}
                    options={[
                        { value: 'single', label: t('build_menu.separator_regular') },
                        { value: 'image', label: t('build_menu.separator_image') },
                    ]}
                />

                {isImage ? (
                    <>
                        <div className={styles.sepImage}>
                            {sep.image?.value && <img src={sep.image.value} alt="" />}
                            <StorageImages placement="right" absolute isNull invitationID={invitationID} handleImage={(value) => setImage({ value })} />
                        </div>
                        <Row label={t('build_menu.height')}>
                            <ValueSlider value={sep.image?.height ?? 100} min={50} max={500} step={10} unit="px" onChange={(height) => setImage({ height })} />
                        </Row>
                        <Row label={t('build_menu.width')}>
                            <ValueSlider value={sep.image?.width ?? 100} min={40} max={100} step={5} unit="%" onChange={(width) => setImage({ width })} />
                        </Row>
                    </>
                ) : (
                    <>
                    {/* Color propio del separador (vacío = color de textos del tema). */}
                    <Row label={t('build_menu.color')}>
                        <div className={styles.colorRow}>
                            {sep.color && (
                                <button type="button" className={styles.link} onClick={() => set('dynamic_separator', { color: null })}>
                                    {t('build_menu.use_theme')}
                                </button>
                            )}
                            <ColorPicker
                                size="small"
                                disabledAlpha
                                value={sep.color || invitation?.generals?.colors?.accent || '#29262D'}
                                onChangeComplete={(c) => set('dynamic_separator', { color: colorFactoryToHex(c) })}
                            />
                        </div>
                    </Row>
                    <div className={`${styles.sepGrid} scroll-invitation`}>
                        {SEPARATORS.map((n) => (
                            <button
                                key={n}
                                type="button"
                                className={styles.sepOption}
                                data-on={sep.single?.value === n || undefined}
                                onClick={() => setSingle(n)}
                            >
                                <Separador MainColor={sep.color || 'var(--text-color)'} build dev value={n} />
                            </button>
                        ))}
                    </div>
                    </>
                )}
            </div>
        </div>
    )
}

// Imagen de un momento del itinerario (itinerary.object[index].image). Se
// abre desde "Imagen +" / "Cambiar imagen" del drawer del momento en el modo
// edición.
// `list` = [módulo, lista]: también sirve para las actividades
// (['destinations', 'cards']).
export const MomentImage = ({ invitation, index, setInvitation, setSaved, invitationID, list = ['itinerary', 'object'] }) => {
    const { t } = useTranslation()
    const [mod, key] = list
    const image = invitation?.[mod]?.[key]?.[index]?.image ?? null
    const setImage = (value) => {
        setInvitation((prev) => ({
            ...prev,
            [mod]: {
                ...prev[mod],
                [key]: prev[mod][key].map((obj, i) => (i === index ? { ...obj, image: value } : obj)),
            },
        }))
        setSaved(false)
    }
    return (
        <div className={styles.panel}>
            <div className={styles.head}>
                <span className={styles.title}>{t('build_editor.bg_image')}</span>
                {image && (
                    <button type="button" className={styles.link} onClick={() => setImage(null)}>
                        {t('build_editor.remove_image')}
                    </button>
                )}
            </div>
            <div className={styles.sepImage}>
                {image && <img src={image} alt="" />}
                <StorageImages placement="right" absolute isNull invitationID={invitationID} handleImage={(url) => url && setImage(url)} />
            </div>
        </div>
    )
}

// Dirección de un momento: buscador de Google (el mismo de los side events).
// Al elegir un lugar se llenan todos los campos de la dirección del momento
// (itinerary.object[index].address) y el drawer pasa a "¿Cómo llegar?".
// "Agregar manual" muestra los campos para escribirla a mano.
const ADDRESS_FIELDS = [
    ['street', 'build_editor.addr_street'],
    ['number', 'build_editor.addr_number'],
    ['neighborhood', 'build_editor.addr_neighborhood'],
    ['zip', 'build_editor.addr_zip'],
    ['city', 'build_editor.addr_city'],
    ['state', 'build_editor.addr_state'],
    ['country', 'build_editor.addr_country'],
    ['url', 'build_editor.addr_url'],
]

export const MomentAddress = ({ index, setInvitation, setSaved, onDone }) => {
    const { t } = useTranslation()
    const [manual, setManual] = useState(false)
    const [draft, setDraft] = useState({})

    const save = (address) => {
        setInvitation((prev) => ({
            ...prev,
            itinerary: {
                ...prev.itinerary,
                object: prev.itinerary.object.map((obj, i) => (i !== index ? obj : {
                    ...obj,
                    address: { ...(obj.address ?? {}), ...address },
                })),
            },
        }))
        setSaved(false)
        onDone?.()
    }
    const onSelect = (place) => save({
        street: place.street || null,
        number: place.number || null,
        neighborhood: place.neighborhood || null,
        zip: place.zipcode || null,
        city: place.city || null,
        state: place.state || null,
        country: place.country || null,
        url: place.url || null,
    })
    const saveManual = () => save(Object.fromEntries(ADDRESS_FIELDS.map(([key]) => [key, draft[key]?.trim() || null])))
    const hasDraft = ADDRESS_FIELDS.some(([key]) => draft[key]?.trim())

    return (
        <div className={styles.panel}>
            <span className={styles.title}>{t('build_editor.add_address')}</span>
            <AddressAutocomplete onSelect={onSelect} className={styles.addressInput} placeholder={t('build_editor.search_address')} />

            {!manual ? (
                <button type="button" className={styles.link} style={{ alignSelf: 'center' }} onClick={() => setManual(true)}>
                    {t('build_editor.add_manual')}
                </button>
            ) : (
                <div className={styles.manualFields}>
                    <div className={styles.addressGrid}>
                        {ADDRESS_FIELDS.map(([key, label]) => (
                            <Input
                                key={key}
                                size="small"
                                className={key === 'url' ? styles.addressWide : undefined}
                                placeholder={t(label)}
                                value={draft[key] ?? ''}
                                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                            />
                        ))}
                    </div>
                    <Button type="primary" disabled={!hasDraft} onClick={saveManual} style={{ borderRadius: 99 }}>
                        {t('build_editor.save_address')}
                    </Button>
                </div>
            )}
        </div>
    )
}

// Imágenes del dresscode (dresscode.dev, igual que el panel): mini popover
// sobre las imágenes de la pieza con todas en fila. La primera tarjeta es
// "+ Imagen"; las demás se arrastran para cambiar el orden y se borran con su
// "×".
const DressThumb = ({ id, url, selected, onSelect, onRemove, removeLabel }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
    return (
        <div
            ref={setNodeRef}
            className={styles.thumb}
            data-dragging={isDragging || undefined}
            data-selected={selected || undefined}
            onClick={onSelect}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            {...attributes}
            {...listeners}
        >
            {url && <img src={url} alt="" draggable={false} />}
            {/* La "×" solo con la imagen elegida. */}
            {selected && <button
                type="button"
                className={styles.thumbRemove}
                aria-label={removeLabel}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onRemove}
            >
                <X size={11} strokeWidth={2.6} />
            </button>}
        </div>
    )
}

// `module`: "dresscode" o "gallery" (los dos guardan sus imágenes en `.dev`).
export const DressImages = ({ invitation, setInvitation, setSaved, invitationID, large = false, module = 'dresscode' }) => {
    const { t } = useTranslation()
    const images = invitation?.[module]?.dev ?? []
    // ids estables para dnd-kit aunque se repita una imagen.
    const ids = images.map((url, i) => `${i}-${url}`)
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
    const [selected, setSelected] = useState(null)
    // Al soltar un arrastre el navegador manda un click: no debe soltar la
    // imagen elegida. Solo la suelta tocar otra parte del panel.
    const justDragged = useRef(false)

    const setImages = (next) => {
        setInvitation((prev) => ({
            ...prev,
            [module]: { ...prev[module], dev: next, ...(module === 'dresscode' ? { images_active: true } : {}) },
        }))
        setSaved(false)
    }
    const onDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return
        setImages(arrayMove(images, ids.indexOf(active.id), ids.indexOf(over.id)))
    }

    return (
        <div className={`${styles.imagesPanel} ${large ? styles.imagesPanelLarge : ''}`}>
            <div className={`${styles.thumbRow} scroll-invitation`} onClick={() => setSelected(null)}>
                <StorageImages
                    type={module === 'dresscode' ? 'dresscode' : undefined}
                    invitationID={invitationID}
                    handleImage={(url) => url && setImages([...images, url])}
                    customTrigger={
                        <button type="button" className={styles.thumbAdd}>
                            <ImagePlus size={large ? 24 : 16} />
                            <span>{t('build_editor.bg_image')}</span>
                        </button>
                    }
                />
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={({ active }) => { justDragged.current = true; setSelected(active.id) }} onDragEnd={(ev) => { onDragEnd(ev); setTimeout(() => { justDragged.current = false }, 80) }}>
                    <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
                        {images.map((url, i) => (
                            <DressThumb
                                key={ids[i]}
                                id={ids[i]}
                                url={url}
                                selected={selected === ids[i]}
                                onSelect={(e) => { e.stopPropagation(); if (!justDragged.current) setSelected(ids[i]) }}
                                removeLabel={t('build_editor.remove_image')}
                                onRemove={() => { setSelected(null); setImages(images.filter((_, j) => j !== i)) }}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    )
}
