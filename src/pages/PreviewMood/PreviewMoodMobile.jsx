import { useState, useEffect } from 'react'
import { Button, ColorPicker, DatePicker, Drawer, Input, Select, Slider } from 'antd'
import { toFirstString } from '../../helpers/invitation/newInvitation';
import { useTranslation } from 'react-i18next'
import { SiSpotify } from 'react-icons/si'
import { RxValueNone } from 'react-icons/rx'
import { LuSettings2 } from 'react-icons/lu'
import dayjs from 'dayjs'
import {
    Calendar, Eye, Image, Music, Palette,
    Type, X, Layers,
    ArrowRight,
    Bookmark,
    ArrowUp,
} from 'lucide-react'
import ReactHost from '../../components/Host/ReactHost'
import { StorageImages } from '../../components/ImagesStorage/StorageImages'
import { colorCollection } from '../../helpers/services/colorPalette'
import { colorFactoryToHex, formatDateToISO } from '../../helpers/assets/functions'
import { fonts } from '../../helpers/assets/fonts'
import { textures } from '../../helpers/services/textures'
import { LiaPreview } from './LiaPreview'
import { FEATURE_SLIDES } from './featureSlides'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

const { Option } = Select

const SIDE_EVENTS = [
    { title: 'Pedida', img: 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Covers/cover_8.jpg' },
    { title: 'Despedida',      img: 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Covers/cover_12.jpg' },
    { title: 'Tornaboda',      img: 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Covers/cover_9.jpg' },
]

/* ── Spotify ──────────────────────────────────────────────── */
const _tok = { token: null, expiry: 0 }
async function getToken() {
    if (_tok.token && Date.now() < _tok.expiry) return _tok.token
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + btoa(`${import.meta.env.VITE_SPOTIFY_CLIENT_ID}:${import.meta.env.VITE_SPOTIFY_CLIENT_SECRET}`) },
        body: 'grant_type=client_credentials',
    })
    const d = await res.json()
    _tok.token = d.access_token; _tok.expiry = Date.now() + (d.expires_in - 60) * 1000
    return _tok.token
}
async function spotifySearch(q) {
    const t = await getToken()
    return (await (await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=5`, { headers: { Authorization: `Bearer ${t}` } })).json()).tracks?.items ?? []
}

/* ── Position grid ────────────────────────────────────────── */
const POSITION_GRID = [
    { justify: 'left',   align: 'flex-start' },
    { justify: 'center', align: 'flex-start' },
    { justify: 'right',  align: 'flex-start' },
    { justify: 'left',   align: 'center'     },
    { justify: 'center', align: 'center'     },
    { justify: 'right',  align: 'center'     },
    { justify: 'left',   align: 'flex-end'   },
    { justify: 'center', align: 'flex-end'   },
    { justify: 'right',  align: 'flex-end'   },
]

/* ── Chip definitions ─────────────────────────────────────── */
const CHIPS = [
    { key: 'nombres', icon: <Type size={15} />,    label: 'Nombres'  },
    { key: 'fecha',   icon: <Calendar size={15} />, label: 'Fecha'    },
    { key: 'colores', icon: <Palette size={15} />,  label: 'Colores'  },
    { key: 'foto',    icon: <Image size={15} />,    label: 'Foto'     },
    { key: 'cancion', icon: <Music size={15} />,    label: 'Canción'  },
    { key: 'textura', icon: <Layers size={15} />,   label: 'Textura'  },
]

/* ─────────────────────────────────────────────────────────── */
export const PreviewMoodMobile = ({ invitation, setInvitation, savedId, onSave, onPublish, saving, onRequestSaveForImage }) => {
    const { i18n } = useTranslation()
    const sessionName = (() => { try { return JSON.parse(localStorage.getItem('session'))?.user?.name?.split(' ')[0] ?? null } catch { return null } })()
    const [activeChip, setActiveChip] = useState(null)
    const [showUpsell, setShowUpsell]   = useState(false)
    const [presets, setPresets]         = useState(null)
    const [onHide, setOnHide]           = useState(true)
    const [songQuery, setSongQuery]     = useState('')
    const [songResults, setSongResults] = useState([])
    const [songLoading, setSongLoading] = useState(false)
    const [activeFeature, setActiveFeature] = useState(0)
    const [featurePaused, setFeaturePaused] = useState(false)
    const [featureTimerKey, setFeatureTimerKey] = useState(0)

    useEffect(() => {
        if (featurePaused) return
        const timer = setInterval(() => {
            setActiveFeature(i => (i + 1) % FEATURE_SLIDES.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [featurePaused, featureTimerKey])

    const goToFeature = (indexFn) => {
        setActiveFeature(indexFn)
        setFeatureTimerKey(k => k + 1)
    }

    const patch = (fn) => setInvitation(prev => fn(prev))

    /* handlers */
    const onChangeTitle  = (e)  => patch(p => ({ ...p, cover: { ...p.cover, title: { ...p.cover.title, text: { ...p.cover.title.text, value: e.target.value } } } }))
    const onChangeDate   = (e)  => patch(p => ({ ...p, cover: { ...p.cover, date: { ...p.cover.date, value: formatDateToISO(e) } } }))
    const onChangeCover  = (url)=> patch(p => ({ ...p, cover: { ...p.cover, image: { ...p.cover.image, dev: url } } }))
    const changeByCollection = (pal) => patch(p => ({ ...p, generals: { ...p.generals, colors: { ...p.generals.colors, primary: pal.primary, secondary: pal.secondary, accent: pal.accent, actions: pal.actions }, fonts: { ...p.generals.fonts, titles: { ...p.generals.fonts.titles, color: pal.accent } } } }))
    const handleTexture  = (i)  => patch(p => ({ ...p, generals: { ...p.generals, texture: i } }))
    const handleSelectSong = (track) => {
        patch(p => ({ ...p, cover: { ...p.cover, song: { id: track.id, name: track.name, artist: track.artists[0].name, albumArt: track.album.images.at(-1)?.url, previewUrl: track.preview_url } } }))
        setSongQuery(''); setSongResults([])
    }
    const handleRemoveSong = () => patch(p => ({ ...p, cover: { ...p.cover, song: null } }))
    const onChangeTitleColor = (e) => patch(p => ({ ...p, cover: { ...p.cover, title: { ...p.cover.title, text: { ...p.cover.title.text, color: colorFactoryToHex(e) } } } }))
    const handlePosition = (x, y) => patch(p => ({ ...p, cover: { ...p.cover, title: { ...p.cover.title, position: { ...p.cover.title.position, align_x: x, align_y: y } } } }))

    useEffect(() => {
        if (!invitation) return
        import('../../helpers/assets/functions').then(({ darker, lighter }) => {
            const build = (key) => [0.3, 0.5, 0.7, 0.9]
                .map(v => darker(invitation.generals.colors[key], v))
                .concat([invitation.generals.colors[key]])
                .concat([0.9, 0.7, 0.5, 0.3, 0.1].map(v => lighter(invitation.generals.colors[key], v)))
            setPresets([
                { label: 'Fondo',     colors: build('primary')  },
                { label: 'Contraste', colors: build('secondary') },
                { label: 'Textos',    colors: build('accent')    },
                { label: 'Botones',   colors: build('actions')   },
            ])
        })
    }, [])

    const isActivePalette = (pal) => invitation.generals.colors.primary === pal.primary && invitation.generals.colors.secondary === pal.secondary

    /* Spotify debounce */
    useEffect(() => {
        if (!songQuery.trim()) { setSongResults([]); return }
        setSongLoading(true)
        const t = setTimeout(async () => {
            try { setSongResults(await spotifySearch(songQuery)) }
            catch { setSongResults([]) }
            finally { setSongLoading(false) }
        }, 400)
        return () => clearTimeout(t)
    }, [songQuery])

    const dateDisplay = invitation.cover.date?.value
        ? new Intl.DateTimeFormat(i18n.language === 'es' ? 'es-MX' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
            .format(new Date(invitation.cover.date.value.split('T')[0] + 'T12:00:00'))
        : null

    /* ── Sheet content per chip ─── */
    const sheetContent = {
        nombres: (
            <div className='pm-sheet-body'>
                <span className='pm-sheet-label'>Nombres</span>
                <Input
                    className='pm-input'
                    autoFocus
                    value={invitation.cover.title.text?.value}
                    onChange={onChangeTitle}
                    placeholder='Ej. Ale & Santiago'
                    size='large'
                    style={{ borderRadius: 12 }}
                />
                <span className='pm-sheet-hint'>Escribe los nombres como quieres que aparezcan en la portada.</span>

                {/* ── Estilo del título ── */}
                <span className='pm-sheet-label' style={{ marginTop: 4 }}>Estilo del título</span>

                <div>
                    <span className='pm-dropdown-label'>Fuente</span>
                    <Select
                        value={invitation.cover.title.text?.typeFace}
                        onChange={(v) => patch(p => ({ ...p, cover: { ...p.cover, title: { ...p.cover.title, text: { ...p.cover.title.text, typeFace: v } } } }))}
                        style={{ width: '100%', marginTop: 4 }}
                    >
                        {fonts.map((f, i) => <Option key={i} value={f}><span style={{ fontFamily: f }}>{f}</span></Option>)}
                    </Select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                        <span className='pm-dropdown-label'>Tamaño</span>
                        <Slider min={8} max={96} step={2}
                            value={invitation.cover.title.text?.size}
                            onChange={(v) => patch(p => ({ ...p, cover: { ...p.cover, title: { ...p.cover.title, text: { ...p.cover.title.text, size: v } } } }))} />
                    </div>
                    <div>
                        <span className='pm-dropdown-label'>Peso</span>
                        <Slider min={100} max={1000} step={100}
                            value={invitation.cover.title.text?.weight}
                            onChange={(v) => patch(p => ({ ...p, cover: { ...p.cover, title: { ...p.cover.title, text: { ...p.cover.title.text, weight: v } } } }))} />
                    </div>
                </div>

                <div>
                    <span className='pm-dropdown-label'>Opacidad</span>
                    <Slider min={0.1} max={1} step={0.01}
                        value={invitation.cover.title.text?.opacity}
                        onChange={(v) => patch(p => ({ ...p, cover: { ...p.cover, title: { ...p.cover.title, text: { ...p.cover.title.text, opacity: v } } } }))} />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
                    <div>
                        <span className='pm-dropdown-label'>Color</span>
                        <div style={{ marginTop: 6 }}>
                            <ColorPicker
                                presets={presets}
                                disabledAlpha={false}
                                value={invitation.cover.title.text?.color}
                                onChangeComplete={onChangeTitleColor}
                            />
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <span className='pm-dropdown-label'>Posición</span>
                        <div className='gc-position-container' style={{ marginTop: 6 }}>
                            {POSITION_GRID.map((item, i) => (
                                <div key={i}
                                    onClick={() => handlePosition(item.justify, item.align)}
                                    className='gc-position-item'
                                >
                                    {item.justify === invitation.cover.title.position?.align_x && item.align === invitation.cover.title.position?.align_y ? (
                                        <div className='gc-position-selected-container'
                                            style={{ alignItems: item.justify === 'left' ? 'flex-start' : item.justify === 'right' ? 'flex-end' : 'center' }}>
                                            <div className='gc-position-selected-item' style={{ width: '70%' }} />
                                            <div className='gc-position-selected-item' style={{ width: '100%', margin: '3px 0' }} />
                                            <div className='gc-position-selected-item' style={{ width: '30%' }} />
                                        </div>
                                    ) : (
                                        <div style={{ height: 5, aspectRatio: '1', borderRadius: '50%', backgroundColor: '#d9d9d9' }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        ),
        fecha: (
            <div className='pm-sheet-body'>
                <span className='pm-sheet-label'>Fecha del evento</span>
                {dateDisplay && <span className='pm-sheet-date-display'>{dateDisplay}</span>}
                <DatePicker
                    className='gc-date-picker'
                    style={{ width: '100%' }}
                    onChange={onChangeDate}
                    value={invitation.cover.date?.value ? dayjs(invitation.cover.date.value.split('T')[0]) : null}
                    size='large'
                />
            </div>
        ),
        colores: (
            <div className='pm-sheet-body'>
                <span className='pm-sheet-label'>Paleta de colores</span>
                <div className='pm-palettes-col'>
                    {colorCollection.map((p, i) => (
                        <div key={i}
                            className={`pm-palette-row${isActivePalette(p) ? ' pm-palette-row--active' : ''}`}
                            onClick={() => changeByCollection(p)}
                        >
                            <div className='pm-palette-swatches'>
                                <div className='pm-swatch pm-swatch--lg' style={{ background: p.primary }} />
                                <div className='pm-swatch pm-swatch--lg' style={{ background: p.secondary }} />
                                <div className='pm-swatch pm-swatch--lg' style={{ background: p.accent }} />
                                <div className='pm-swatch pm-swatch--lg' style={{ background: p.actions }} />
                            </div>
                            <span className='pm-palette-name'>{p.name}</span>
                            {isActivePalette(p) && <div className='pm-palette-check'>✓</div>}
                        </div>
                    ))}
                </div>
            </div>
        ),
        foto: (
            <div className='pm-sheet-body'>
                <span className='pm-sheet-label'>Foto de portada</span>
                {toFirstString(invitation.cover.image.dev) && (
                    <div className='pm-sheet-img-preview'>
                        <img src={toFirstString(invitation.cover.image.dev)} alt='' />
                    </div>
                )}
                <StorageImages
                    type='cover'
                    invitationID={savedId}
                    handleImage={(url) => { onChangeCover(url); setActiveChip(null) }}
                    hideMyImages={!savedId}
                    onRequestSaveForImage={onRequestSaveForImage}
                    customTrigger={
                        <Button icon={<Image size={14} />} block size='large' style={{ borderRadius: 12 }}>
                            Elegir foto
                        </Button>
                    }
                />
            </div>
        ),
        cancion: (
            <div className='pm-sheet-body'>
                <span className='pm-sheet-label'>Canción de portada</span>
                {invitation.cover?.song ? (
                    <div className='pm-song-selected'>
                        {invitation.cover.song.albumArt && (
                            <img src={invitation.cover.song.albumArt} alt='' style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                        )}
                        <div style={{ flex: 1 }}>
                            <div className='pm-song-name'>{invitation.cover.song.name}</div>
                            <div className='pm-song-artist'>{invitation.cover.song.artist}</div>
                        </div>
                        <Button type='text' icon={<X size={16} />} onClick={handleRemoveSong} />
                    </div>
                ) : (
                    <>
                        <Input
                            value={songQuery}
                            onChange={e => setSongQuery(e.target.value)}
                            placeholder='Buscar canción...'
                            size='large'
                            style={{ borderRadius: 99 }}
                            prefix={<SiSpotify style={{ color: '#1DB954' }} />}
                        />
                        {songLoading && <span style={{ fontSize: 12, color: '#888' }}>Buscando...</span>}
                        {songResults.length > 0 && (
                            <div className='pm-song-results'>
                                {songResults.map(track => (
                                    <div key={track.id} onClick={() => { handleSelectSong(track); setActiveChip(null) }} className='pm-song-result-item'>
                                        {track.album.images.at(-1)?.url && (
                                            <img src={track.album.images.at(-1).url} alt='' style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                                        )}
                                        <div>
                                            <div className='pm-song-name'>{track.name}</div>
                                            <div className='pm-song-artist'>{track.artists[0].name}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        ),
        textura: (
            <div className='pm-sheet-body'>
                <span className='pm-sheet-label'>Textura de fondo</span>
                <div className='pm-textures-grid'>
                    <div className={`pm-texture-item${invitation.generals.texture == null ? ' pm-texture-item--active' : ''}`} onClick={() => { handleTexture(null); setActiveChip(null) }}>
                        <RxValueNone size={28} style={{ color: '#aaa' }} />
                    </div>
                    {textures.map((tx, i) => (
                        <div key={i} className={`pm-texture-item${invitation.generals.texture === i ? ' pm-texture-item--active' : ''}`} onClick={() => { handleTexture(i); setActiveChip(null) }}>
                            <img alt='' src={tx?.image} />
                        </div>
                    ))}
                </div>
            </div>
        ),
    }

    /* ── Render ─────────────────────────────────────────────── */
    return (
        <div className='pm-mobile-root'>

            {/* Mini header */}
            <div className='pm-mobile-header'>
                <div className='pm-header-chip'>
                    <Eye size={12} strokeWidth={1.8} />
                    <span>{sessionName ?? 'sin cuenta'}</span>
                </div>
                <Button
                    icon={<Bookmark size={14} />}
                    onClick={onSave}
                    loading={saving}
                    className='pm-header-save-btn'
                >
                    Guardar
                </Button>
            </div>

            {/* Hero — invitation fills remaining height */}
            <div
                className='pm-mobile-hero'
                onClick={() => { setOnHide(true); setActiveChip(null) }}
            >
                <ReactHost config={invitation} onHide={onHide} screens={true} />
            </div>

            {/* Floating tools — vertical, right side */}
            <div className='pm-tools-float'>
                {CHIPS.map(chip => (
                    <button
                        key={chip.key}
                        className={`pm-tool-btn${activeChip === chip.key ? ' pm-tool-btn--active' : ''}`}
                        title={chip.label}
                        onClick={() => setActiveChip(prev => prev === chip.key ? null : chip.key)}
                    >
                        {chip.icon}
                    </button>
                ))}
            </div>

            {/* Fixed CTA */}
            <div className='pm-cta-fixed'>
                <Button
                    block
                    className='primarybutton--active'
                    size='large'
                    icon={<ArrowRight size={16} />}
                    style={{ borderRadius: 16, height: 52, fontSize: 16, fontWeight: 700 }}
                    onClick={onPublish}
                >
                    Quiero mi invitación
                </Button>
            </div>

            {/* Footer strip */}
            <div className='pm-mobile-footer-strip'>
                <Button icon={<ArrowUp size={14}/>} type='text' className='pm-footer-strip-label' onClick={() => setShowUpsell(true)}>
                    Descubre todo lo que hay en i attend
                </Button>
            </div>

            {/* Bottom sheet — editing chips */}
            <Drawer
                placement='bottom'
                open={activeChip !== null}
                onClose={() => setActiveChip(null)}
                height='auto'
                closable={false}
                style={{ borderRadius: '24px 24px 0 0' }}
                styles={{
                    body: { padding: 0, paddingBottom: 'env(safe-area-inset-bottom, 16px)' },
                    wrapper: { boxShadow: '0 -8px 32px rgba(0,0,0,0.12)' },
                }}
            >
                <div className='pm-sheet-handle-row'>
                    <div className='pm-sheet-handle' />
                    <button className='pm-sheet-close' onClick={() => setActiveChip(null)}>
                        <X size={14} />
                    </button>
                </div>
                {activeChip && sheetContent[activeChip]}
            </Drawer>

            {/* Bottom sheet — upsell (slide up) */}
            <Drawer
                placement='bottom'
                open={showUpsell}
                onClose={() => setShowUpsell(false)}
                height='88%'
                closable={false}
                style={{ borderRadius: '24px 24px 0 0' }}
                styles={{ body: { padding: '0 0 env(safe-area-inset-bottom, 16px)' } }}
            >
                <div className='pm-sheet-handle-row'>
                    <div className='pm-sheet-handle' />
                    <button className='pm-sheet-close' onClick={() => setShowUpsell(false)}><X size={14} /></button>
                </div>

                <div className='pm-upsell-sheet'>
                    <span className='pm-upsell-sheet-title'>Tu invitación es solo el principio</span>
                    <span className='pm-upsell-label'>Esto también es I attend</span>

                    <div className='pm-feature-carousel' style={{ height: 280, flexShrink: 0 }}>
                        {FEATURE_SLIDES.map((slide, i) => (
                            <div key={slide.id} className={`pm-feature-slide${i === activeFeature ? ' pm-feature-slide--active' : ''}`}>
                                <img src={slide.img} alt='' className='pm-feature-slide-bg' />
                                <div className='pm-feature-slide-overlay' />
                                <div className='pm-feature-content'>
                                    <span className='pm-feature-product'>{slide.product}</span>
                                    <p className='pm-feature-headline'>{slide.headline}</p>
                                    <p className='pm-feature-desc'>{slide.desc}</p>
                                </div>
                            </div>
                        ))}

                        <button
                            className='pm-feature-nav-btn pm-feature-pause-btn'
                            onClick={() => setFeaturePaused(p => !p)}
                        >
                            {featurePaused ? <Play size={14} /> : <Pause size={14} />}
                        </button>

                        <div className='pm-feature-nav'>
                            <button className='pm-feature-nav-btn' onClick={() => goToFeature(i => (i - 1 + FEATURE_SLIDES.length) % FEATURE_SLIDES.length)}>
                                <ChevronLeft size={16} />
                            </button>
                            <button className='pm-feature-nav-btn' onClick={() => goToFeature(i => (i + 1) % FEATURE_SLIDES.length)}>
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        <div className='pm-feature-dots'>
                            {FEATURE_SLIDES.map((_, i) => (
                                <button
                                    key={i}
                                    className={`pm-feature-dot${i === activeFeature ? ' pm-feature-dot--active' : ''}`}
                                    onClick={() => goToFeature(() => i)}
                                />
                            ))}
                        </div>
                    </div>

                    <Button
                        className='primarybutton--active' block size='large'
                        icon={<ArrowRight size={16} />}
                        style={{ borderRadius: 16, height: 52, fontSize: 16, fontWeight: 700, marginTop: 8 }}
                        onClick={onPublish}
                    >
                        Quiero mi invitación
                    </Button>
                </div>
            </Drawer>

        </div>
    )
}
