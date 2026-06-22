import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, ColorPicker, DatePicker, Dropdown, Input, Select, Slider, Tooltip } from 'antd'
import { LuSettings2 } from 'react-icons/lu'
import { SiSpotify } from 'react-icons/si'
import { RxValueNone } from 'react-icons/rx'
import { Image, Music, X, Layers, Palette, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { StorageImages } from '../../components/ImagesStorage/StorageImages'
import { colorCollection } from '../../helpers/services/colorPalette'
import { colorFactoryToHex, formatDateToISO } from '../../helpers/assets/functions'
import { fonts } from '../../helpers/assets/fonts'
import { textures } from '../../helpers/services/textures'
import { FEATURE_SLIDES } from './featureSlides'

dayjs.extend(utc)
dayjs.extend(timezone)

const { Option } = Select

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

const SIDE_EVENTS = [
    { title: 'Pedida de mano', img: 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Covers/cover_8.jpg' },
    { title: 'Despedida',      img: 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Covers/cover_12.jpg' },
    { title: 'Tornaboda',      img: 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Covers/cover_9.jpg' },
]

/* ── Spotify helpers ─────────────────────────────────────── */
const _tokenCache = { token: null, expiry: 0 }
async function getSpotifyToken() {
    if (_tokenCache.token && Date.now() < _tokenCache.expiry) return _tokenCache.token
    const clientId     = import.meta.env.VITE_SPOTIFY_CLIENT_ID
    const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`) },
        body: 'grant_type=client_credentials',
    })
    const data = await res.json()
    _tokenCache.token  = data.access_token
    _tokenCache.expiry = Date.now() + (data.expires_in - 60) * 1000
    return _tokenCache.token
}
async function searchSpotifyTracks(query) {
    const token = await getSpotifyToken()
    const res = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    return (await res.json()).tracks?.items ?? []
}

/* ── Component ───────────────────────────────────────────── */
export const PreviewMoodPanel = ({ invitation, setInvitation, savedId, onRequestSaveForImage }) => {
    const { t, i18n } = useTranslation()
    const [presets, setPresets]         = useState(null)
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

    const itemAlign   = invitation.cover.title.position?.align_y
    const itemJustify = invitation.cover.title.position?.align_x

    /* build ColorPicker presets */
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

    /* Spotify debounce */
    useEffect(() => {
        if (!songQuery.trim()) { setSongResults([]); return }
        setSongLoading(true)
        const t = setTimeout(async () => {
            try { setSongResults(await searchSpotifyTracks(songQuery)) }
            catch { setSongResults([]) }
            finally { setSongLoading(false) }
        }, 400)
        return () => clearTimeout(t)
    }, [songQuery])

    /* ── Helpers ── */
    const patch = (updater) => setInvitation(prev => updater(prev))

    const onChangeTitle = (e) => patch(prev => ({
        ...prev, cover: { ...prev.cover, title: { ...prev.cover.title,
            text: { ...prev.cover.title.text, value: e.target.value } } }
    }))

    const onChangeDate = (e) => patch(prev => ({
        ...prev, cover: { ...prev.cover, date: { ...prev.cover.date, value: formatDateToISO(e) } }
    }))

    const onChangeTitleColor = (e) => patch(prev => ({
        ...prev, cover: { ...prev.cover, title: { ...prev.cover.title,
            text: { ...prev.cover.title.text, color: colorFactoryToHex(e) } } }
    }))

    const onChangeCover = (url) => patch(prev => ({
        ...prev, cover: { ...prev.cover, image: { ...prev.cover.image, dev: url } }
    }))

    const handlePosition = (x, y) => patch(prev => ({
        ...prev, cover: { ...prev.cover, title: { ...prev.cover.title,
            position: { ...prev.cover.title.position, align_x: x, align_y: y } } }
    }))

    const changeByCollection = (palette) => patch(prev => ({
        ...prev,
        generals: {
            ...prev.generals,
            colors: { ...prev.generals.colors, primary: palette.primary, secondary: palette.secondary, accent: palette.accent, actions: palette.actions },
            fonts:  { ...prev.generals.fonts, titles: { ...prev.generals.fonts.titles, color: palette.accent } },
        }
    }))

    const handleTexture = (index) => patch(prev => ({
        ...prev, generals: { ...prev.generals, texture: index }
    }))

    const isActivePalette = (p) =>
        invitation.generals.colors.primary   === p.primary &&
        invitation.generals.colors.secondary === p.secondary

    const handleSelectSong = (track) => {
        patch(prev => ({ ...prev, cover: { ...prev.cover, song: {
            id: track.id, name: track.name, artist: track.artists[0].name,
            albumArt: track.album.images.at(-1)?.url, previewUrl: track.preview_url
        }}}))
        setSongQuery(''); setSongResults([])
    }

    const handleRemoveSong = () => patch(prev => ({ ...prev, cover: { ...prev.cover, song: null } }))

    /* ── Title settings dropdown ── */
    const titleSettingsContent = (
        <div className='pm-dropdown-popup pm-dropdown-popup--row'>

            {/* Bloque 1: Posición */}
            <div className='pm-dropdown-block pm-dropdown-block--position'>
                <span className='pm-dropdown-block-title'>Posición</span>
                <div className='gc-position-container pm-position-fill'>
                    {POSITION_GRID.map((item, i) => (
                        <div key={i} onClick={() => handlePosition(item.justify, item.align)} className='gc-position-item'>
                            {item.justify === itemJustify && item.align === itemAlign ? (
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

            <div className='pm-dropdown-divider' />

            {/* Bloque 2: Tipografía */}
            <div className='pm-dropdown-block'>
                <span className='pm-dropdown-block-title'>Tipografía</span>

                <span className='pm-dropdown-label'>Fuente</span>
                <Select
                    value={invitation.cover.title.text?.typeFace}
                    onChange={(v) => patch(prev => ({ ...prev, cover: { ...prev.cover, title: { ...prev.cover.title,
                        text: { ...prev.cover.title.text, typeFace: v } } } }))}
                    style={{ width: '100%', fontFamily: invitation.cover.title.text?.typeFace }}
                >
                    {fonts.map((f, i) => <Option key={i} value={f}><span style={{ fontFamily: f }}>{f}</span></Option>)}
                </Select>

                <div className='pm-dropdown-sliders-row'>
                    <div className='pm-dropdown-slider-col'>
                        <span className='pm-dropdown-label' style={{ marginTop: 8 }}>Tamaño</span>
                        <Slider min={8} max={96} step={2}
                            value={invitation.cover.title.text?.size}
                            onChange={(v) => patch(prev => ({ ...prev, cover: { ...prev.cover, title: { ...prev.cover.title,
                                text: { ...prev.cover.title.text, size: v } } } }))} />
                    </div>
                    <div className='pm-dropdown-slider-col'>
                        <span className='pm-dropdown-label' style={{ marginTop: 8 }}>Opacidad</span>
                        <Slider min={0.1} max={1} step={0.01}
                            value={invitation.cover.title.text?.opacity}
                            onChange={(v) => patch(prev => ({ ...prev, cover: { ...prev.cover, title: { ...prev.cover.title,
                                text: { ...prev.cover.title.text, opacity: v } } } }))} />
                    </div>
                </div>

                <span className='pm-dropdown-label'>Peso</span>
                <Slider min={100} max={1000} step={100}
                    value={invitation.cover.title.text?.weight}
                    onChange={(v) => patch(prev => ({ ...prev, cover: { ...prev.cover, title: { ...prev.cover.title,
                        text: { ...prev.cover.title.text, weight: v } } } }))} />

                <span className='pm-dropdown-label'>Color</span>
                <ColorPicker presets={presets} disabledAlpha={false}
                    value={invitation.cover.title.text?.color}
                    onChangeComplete={onChangeTitleColor} />
            </div>

        </div>
    )

    /* ── Render ── */
    return (
        <div className='pm-panel'>

            {/* Header */}
            <div className='pm-panel-head'>
                <span className='pm-panel-title'>Portada</span>
            </div>

            {/* Nombres + Fecha */}
            <div className='pm-section'>
                
                <div className='pm-texts-row'>
                    <div className='pm-field'>
                        <span className='pm-section-label'>{t('preview_mood.label_names')}</span>
                        <div className='pm-field-input-row'>
                            <Input
                                className='pm-input'
                                placeholder='Título'
                                value={invitation.cover.title.text?.value}
                                onChange={onChangeTitle}
                            />
                            <Tooltip title='Ajustes del título' color='var(--text-color)'>
                                <Dropdown trigger={['click']} placement='bottomLeft' popupRender={() => titleSettingsContent}>
                                    <Button type='text' className='primarybutton pm-title-settings-btn' icon={<LuSettings2 size={15} />} />
                                </Dropdown>
                            </Tooltip>
                        </div>
                    </div>
                    <div className='pm-field'>
                        <span className='pm-section-label'>{t('preview_mood.label_date')}</span>
                        <DatePicker
                            className='gc-date-picker'
                            style={{ width: '100%' }}
                            onChange={onChangeDate}
                            value={invitation.cover.date?.value ? dayjs(invitation.cover.date.value.split('T')[0]) : null}
                            format={(d) => new Intl.DateTimeFormat(
                                i18n.language === 'es' ? 'es-MX' : 'en-US',
                                { day: 'numeric', month: 'long', year: 'numeric' }
                            ).format(d.toDate())}
                        />
                    </div>
                </div>
            </div>

            {/* Portada + Canción */}
            <div className='pm-media-row'>
                <div className='pm-media-btn-wrap'>
                    <StorageImages
                        type='cover'
                        invitationID={savedId}
                        handleImage={onChangeCover}
                        hideMyImages={!savedId}
                        onRequestSaveForImage={onRequestSaveForImage}
                        customTrigger={
                            <Button icon={<Image size={14} />} className='pm-media-btn'>{t('preview_mood.btn_photo')}</Button>
                        }
                    />
                </div>
                <div className='pm-cancion-wrap'>
                    <Dropdown
                        trigger={['click']}
                        placement='bottomLeft'
                        popupRender={() => (
                            <div className='pm-song-popup'>
                                {invitation.cover?.song ? (
                                    <div className='pm-song-selected'>
                                        {invitation.cover.song.albumArt && (
                                            <img src={invitation.cover.song.albumArt} alt=''
                                                style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                                        )}
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <div className='pm-song-name'>{invitation.cover.song.name}</div>
                                            <div className='pm-song-artist'>{invitation.cover.song.artist}</div>
                                        </div>
                                        <Button type='text' size='small' icon={<X size={14} />} onClick={handleRemoveSong} />
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <Input
                                            value={songQuery}
                                            onChange={e => setSongQuery(e.target.value)}
                                            placeholder='Buscar canción...'
                                            style={{ borderRadius: 99 }}
                                            prefix={<SiSpotify style={{ color: '#1DB954' }} />}
                                        />
                                        {songLoading && <span style={{ fontSize: 12, color: '#888' }}>Buscando...</span>}
                                        {songResults.length > 0 && (
                                            <div style={{ border: '1px solid var(--borders)', borderRadius: 12, overflow: 'hidden' }}>
                                                {songResults.map(track => (
                                                    <div key={track.id} onClick={() => handleSelectSong(track)} className='song-result-item'
                                                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--borders)' }}>
                                                        {track.album.images.at(-1)?.url && (
                                                            <img src={track.album.images.at(-1).url} alt=''
                                                                style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />
                                                        )}
                                                        <div>
                                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{track.name}</div>
                                                            <div style={{ fontSize: 11, color: '#888' }}>{track.artists[0].name}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    >
                        <Button icon={<Music size={14} />} className='pm-media-btn'>{t('preview_mood.btn_song')}</Button>
                    </Dropdown>
                </div>
            </div>

            {/* Diseño: Colores + Textura */}
            <div className='pm-section'>

                <div className='pm-media-row' style={{ marginTop: 0 }}>
                    {/* Colores — dropdown con todas las paletas */}
                    <Dropdown
                        trigger={['click']}
                        placement='bottomLeft'
                        popupRender={() => (
                            <div className='pm-palettes-popup'>
                                {colorCollection.map((p, i) => (
                                    <div key={i}
                                        className={`pm-palette-option${isActivePalette(p) ? ' pm-palette-option--active' : ''}`}
                                        onClick={() => changeByCollection(p)}
                                    >
                                        <div className='pm-palette-swatches'>
                                            <div className='pm-swatch' style={{ background: p.primary }} />
                                            <div className='pm-swatch' style={{ background: p.secondary }} />
                                            <div className='pm-swatch' style={{ background: p.accent }} />
                                        </div>
                                        <span className='pm-palette-name'>{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    >
                        <Button icon={<Palette size={14} />} className='pm-media-btn' style={{ flex: 1 }}>
                            {t('preview_mood.label_colors')}
                        </Button>
                    </Dropdown>

                    {/* Textura — dropdown */}
                    <Dropdown
                        trigger={['click']}
                        placement='bottomLeft'
                        popupRender={() => (
                            <div className='pm-textures-popup'>
                                <div className='pm-textures-grid'>
                                    <div
                                        className={`pm-texture-item${invitation.generals.texture == null ? ' pm-texture-item--active' : ''}`}
                                        onClick={() => handleTexture(null)}
                                    >
                                        <RxValueNone size={26} style={{ color: '#00000040' }} />
                                    </div>
                                    {textures.map((texture, i) => (
                                        <div key={i}
                                            className={`pm-texture-item${invitation.generals.texture === i ? ' pm-texture-item--active' : ''}`}
                                            onClick={() => handleTexture(i)}
                                        >
                                            <img alt='' src={texture?.image} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    >
                        <Button icon={<Layers size={14} />} className='pm-media-btn' style={{ flex: 1 }}>
                            {t('preview_mood.label_texture')}
                        </Button>
                    </Dropdown>
                </div>
            </div>

            {/* Upsell */}
            <div className='pm-upsell'>
                <span className='pm-upsell-label'>Esto también es I attend</span>

                <div className='pm-feature-carousel'>
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
                        title={featurePaused ? 'Continuar' : 'Pausar'}
                    >
                        {featurePaused ? <Play size={14} /> : <Pause size={14} />}
                    </button>

                    <div className='pm-feature-nav'>
                        <button
                            className='pm-feature-nav-btn'
                            onClick={() => goToFeature(i => (i - 1 + FEATURE_SLIDES.length) % FEATURE_SLIDES.length)}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            className='pm-feature-nav-btn'
                            onClick={() => goToFeature(i => (i + 1) % FEATURE_SLIDES.length)}
                        >
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
            </div>

        </div>
    )
}
