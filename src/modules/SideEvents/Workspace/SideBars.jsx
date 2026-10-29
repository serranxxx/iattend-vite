import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DatePicker, Input, Popover, Segmented, Switch, Tooltip } from 'antd'
import dayjs from 'dayjs'
import { Blend, Clapperboard, CloudOff, CloudSun, Film, ImageMinus, ImagePlus, Link2, ListOrdered, MapPin, MessageCircle, Pin, Plus, Trash2, Users, X } from 'lucide-react'
import { cuerpoConFechas, dayjsToWallClock, fechasDelEvento, formatEventDateTime } from '../../../helpers/assets/eventDateTime'
import { LiveSlider } from '../../Invitation/Build/PageSections/barControls'
import { AddressAutocomplete } from '../AddressAutocomplete'
import { ImagenLinkFlash } from '../ImagenLinkFlash'
import bar from '../../Invitation/Build/PageSections/ElementBar.module.css'
import own from './SideWorkspace.module.css'
import { MODOS_CLIMA, modoClima, parcheModoClima } from '../tarjetasSide'

// Barras contextuales del editor de side events / Flash (arriba de la
// pieza), con el formato de las barras de la invitación (ElementBar.module.css,
// ver docs/sistema-diseno-editor.md §7). Cada una sale al elegir su zona en
// SideCanvas y escribe en `current.body` con `setBody(patch, opts)`; los
// sliders mandan `{ snapshot }` para que un arrastre sea UNA entrada en
// deshacer. Reemplazan en escritorio a los paneles del riel viejo
// (SideEvents.jsx: panelTitle, panelDate, panelPlace, panelBackground…).

// Sombra por omisión del título y de fecha / lugar (igual que SideEvents).
export const DEFAULT_SOMBRA_TITULO = 25
export const DEFAULT_SOMBRA_DETALLES = 5
const VELO_INICIAL = 35

const ADDRESS_FIELDS = [
    ['street', 'address_street'],
    ['number', 'address_number'],
    ['neighborhood', 'address_neighborhood'],
    ['zipcode', 'address_zipcode'],
    ['city', 'address_city'],
    ['state', 'address_state'],
    ['country', 'address_country'],
]

// El DatePicker solo refleja fechas en hora de pared: los eventos legados
// guardan un instante UTC real (ver helpers/assets/eventDateTime.js).
const wallClockToDayjs = (raw) => {
    if (!raw) return null
    const value = String(raw).trim()
    if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(value)) return null
    const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/)
    return match ? dayjs(`${match[1]} ${match[2]}`) : null
}

// Popover de un botón de la barra: un solo abierto a la vez.
const usePop = () => {
    const [open, setOpen] = useState(null)
    const pop = (id, content, trigger, wide = false) => (
        <Popover
            open={open === id}
            onOpenChange={(v) => setOpen(v ? id : null)}
            trigger="click"
            placement="bottom"
            arrow={false}
            content={<div className={`${bar.pop} ${wide ? own.popWide : ''}`} data-text-bar onMouseDown={(e) => e.stopPropagation()}>{content}</div>}
        >
            {trigger}
        </Popover>
    )
    return { open, setOpen, pop }
}

/* ── Fecha y hora ── */
// Hora de pared, sin conversión de timezone. Un Flash puede tener varias
// fechas (fechasDelEvento / cuerpoConFechas).
export const DateBar = ({ body, setBody, esFlash }) => {
    const { t } = useTranslation()
    const { open, pop } = usePop()
    const lista = esFlash ? (fechasDelEvento(body).length ? fechasDelEvento(body) : [null]) : [body?.hour]
    const cambiar = (i, valor) => {
        if (!esFlash) return setBody({ hour: valor })
        const nuevas = [...lista]
        nuevas[i] = valor
        setBody(cuerpoConFechas(nuevas))
    }
    const legacy = body?.hour && !wallClockToDayjs(body.hour)

    return (
        <div className={bar.bar} data-edit-keep data-text-bar>
            {lista.map((raw, i) => (
                <span key={`${i}-${raw ?? 'vacia'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    <DatePicker
                        className={`${bar.dateInput} ${own.dateTime}`}
                        showTime={{ format: 'HH:mm' }}
                        format="DD/MM/YYYY HH:mm"
                        allowClear={false}
                        value={wallClockToDayjs(raw)}
                        onChange={(d) => d && cambiar(i, dayjsToWallClock(d))}
                    />
                    {esFlash && lista.length > 1 && (
                        <button type="button" className={bar.iconBtn} title={t('side_events.date_remove')} onClick={() => setBody(cuerpoConFechas(lista.filter((_, j) => j !== i)))}>
                            <X size={16} />
                        </button>
                    )}
                </span>
            ))}
            {esFlash && body?.hour && (
                <button
                    type="button"
                    className={bar.iconBtn}
                    title={t('side_events.date_add')}
                    onClick={() => {
                        const ultima = wallClockToDayjs(lista[lista.length - 1])
                        setBody(cuerpoConFechas([...lista, ultima ? dayjsToWallClock(ultima.add(1, 'day')) : null]))
                    }}
                >
                    <Plus size={18} />
                </button>
            )}
            {legacy && (
                <span className={own.barMuted}>
                    {formatEventDateTime(body.hour, { state: body?.address?.state, timezone: body?.timezone })}
                </span>
            )}

            <span className={bar.divider} />

            {pop('shadow', (
                <LiveSlider label={t('side_events.details_shadow')} value={body?.details_shadow ?? DEFAULT_SOMBRA_DETALLES} min={0} max={100} format={(v) => `${v}%`} onChange={(v, o) => setBody({ details_shadow: v }, o)} />
            ), (
                <button type="button" className={bar.textBtn} data-on={open === 'shadow' || undefined}>
                    {t('build_menu.shadow')}
                </button>
            ))}
        </div>
    )
}

/* ── Lugar ── */
// Nombre del lugar, buscador de Google, campos a mano, clima y sombra.
export const PlaceBar = ({ body, setBody, setAddress }) => {
    const { t } = useTranslation()
    const { open, pop } = usePop()
    const address = body?.address ?? {}
    const weatherOn = !body?.hideWeather

    return (
        <div className={bar.bar} data-edit-keep data-text-bar>
            <span className={bar.barIcon}><MapPin size={18} /></span>
            <input
                className={`${bar.addressInput} ${bar.inputHalf}`}
                placeholder={t('side_events.place_name_label')}
                value={body?.place_name ?? ''}
                onChange={(e) => setBody({ place_name: e.target.value }, { coalesce: 'place_name' })}
            />
            <AddressAutocomplete onSelect={(addr) => setAddress(addr)} className={bar.addressInput} placeholder={t('side_events.address_search')} />

            {pop('manual', (
                <div className={bar.addressGrid}>
                    {ADDRESS_FIELDS.map(([key, label]) => (
                        <Input
                            key={key}
                            placeholder={t(`side_events.${label}`)}
                            value={address[key] ?? ''}
                            onChange={(e) => setAddress({ [key]: e.target.value }, { coalesce: `addr.${key}` })}
                        />
                    ))}
                    <Input
                        className={bar.addressWide}
                        placeholder={t('side_events.address_url')}
                        value={address.url ?? ''}
                        onChange={(e) => setAddress({ url: e.target.value }, { coalesce: 'addr.url' })}
                    />
                </div>
            ), (
                <button type="button" className={bar.textBtn} data-on={open === 'manual' || undefined}>
                    {t('build_editor.add_manual')}
                </button>
            ), true)}

            <span className={bar.divider} />

            {/* Clima: cuándo se muestra (también en la capa Clima, WeatherBar). */}
            {pop('weather', <OpcionesClima body={body} setBody={setBody} sinCiudad={!address.city} />, (
                <button type="button" className={bar.iconBtn} data-on={(weatherOn && address.city) || undefined} title={t('side_events.weather_title')}>
                    {weatherOn ? <CloudSun size={18} /> : <CloudOff size={18} />}
                </button>
            ))}

            {pop('shadow', (
                <LiveSlider label={t('side_events.details_shadow')} value={body?.details_shadow ?? DEFAULT_SOMBRA_DETALLES} min={0} max={100} format={(v) => `${v}%`} onChange={(v, o) => setBody({ details_shadow: v }, o)} />
            ), (
                <button type="button" className={bar.textBtn} data-on={open === 'shadow' || undefined}>
                    {t('build_menu.shadow')}
                </button>
            ))}
        </div>
    )
}

/* ── Fondo ── */
// Imagen o video (Flash) de fondo, velo del color del tema e imagen del link.
// `pickMedia(request, handleImage)` abre Subidos en modo "elegir".
export const BackgroundBar = ({ current, setBody, onChange, esFlash, carpeta, pickMedia }) => {
    const { t } = useTranslation()
    const { open, setOpen, pop } = usePop()
    const body = current?.body ?? {}
    const [modoElegido, setModoElegido] = useState(null)
    const modo = esFlash ? (modoElegido ?? (body.video ? 'video' : 'image')) : 'image'
    const veil = body.veil ?? 0

    const pickImage = () => {
        setOpen(null)
        pickMedia({ type: 'side-events' }, (url) => url && setBody({ image: url }))
    }
    const pickVideo = () => {
        setOpen(null)
        pickMedia({ mediaType: 'video' }, (url) => url && setBody({ video: url }))
    }
    // Con video, la imagen es el cuadro fijo mientras carga y la del link.
    const pickPoster = () => {
        setOpen(null)
        pickMedia({ type: 'side-events' }, (url) => url && onChange((prev) => ({ ...prev, url_image: url, body: { ...prev.body, image: url } })))
    }

    return (
        <div className={bar.bar} data-edit-keep data-text-bar>
            {esFlash && (
                <>
                    <Segmented
                        size="small"
                        shape="round"
                        value={modo}
                        onChange={(v) => {
                            setModoElegido(v)
                            // Volver a imagen quita el video; la imagen se queda.
                            if (v === 'image' && body.video) setBody({ video: null })
                        }}
                        options={[
                            { value: 'image', label: t('side_events.media_image'), icon: <ImagePlus size={14} /> },
                            { value: 'video', label: t('savethedate.media_video'), icon: <Film size={14} /> },
                        ]}
                    />
                    <span className={bar.divider} />
                </>
            )}

            {modo === 'video' ? (
                <>
                    {body.video && <video className={own.barVideo} src={body.video} muted playsInline preload="metadata" />}
                    <button type="button" className={bar.textBtn} onClick={pickVideo}>
                        <Clapperboard size={17} /> {body.video ? t('side_events.ws_change_video') : t('side_events.ws_add_video')}
                    </button>
                    {body.video && (
                        <button type="button" className={bar.iconBtn} title={t('savethedate.remove_video')} onClick={() => setBody({ video: null })}>
                            <ImageMinus size={18} />
                        </button>
                    )}
                    <span className={bar.divider} />
                    {body.image && <img className={bar.thumb} src={body.image} alt="" />}
                    <Tooltip title={t('savethedate.poster_hint')}>
                        <button type="button" className={bar.textBtn} onClick={pickPoster}>
                            <ImagePlus size={17} /> {t('savethedate.poster_label')}
                        </button>
                    </Tooltip>
                </>
            ) : (
                <>
                    {body.image && <img className={bar.thumb} src={body.image} alt="" />}
                    <button type="button" className={bar.textBtn} onClick={pickImage}>
                        <ImagePlus size={17} /> {body.image ? t('side_events.canvas_change_image') : t('side_events.canvas_add_image')}
                    </button>
                    {body.image && (
                        <button type="button" className={bar.iconBtn} title={t('side_events.remove_image')} onClick={() => setBody({ image: null })}>
                            <ImageMinus size={18} />
                        </button>
                    )}
                </>
            )}

            <span className={bar.divider} />

            {/* Velo del color del tema sobre la portada y los PNG. */}
            {pop('veil', (
                <>
                    <div className={own.switchRow}>
                        <span>{t('side_events.veil_label')}</span>
                        <button type="button" className={bar.textBtn} data-on={veil > 0 || undefined} onClick={() => setBody({ veil: veil > 0 ? null : VELO_INICIAL })}>
                            {veil > 0 ? t('side_events.ws_on') : t('side_events.ws_off')}
                        </button>
                    </div>
                    {veil > 0 && <LiveSlider label={t('side_events.veil_intensity')} value={veil} min={5} max={90} format={(v) => `${v}%`} onChange={(v, o) => setBody({ veil: v }, o)} />}
                </>
            ), (
                <button type="button" className={bar.textBtn} data-on={open === 'veil' || veil > 0 || undefined}>
                    <Blend size={17} /> {t('side_events.ws_veil')}
                </button>
            ))}

            {/* Imagen del link: la que sale al compartir (url_image). */}
            {esFlash && (
                <>
                    <span className={bar.divider} />
                    {pop('link', (
                        <>
                            <span className={bar.popLabel}>{t('side_events.link_poster_hint')}</span>
                            {(current?.url_image || body.image) && <img className={own.linkThumb} src={current.url_image || body.image} alt="" />}
                            <ImagenLinkFlash body={body} carpeta={carpeta} onLista={(url) => { onChange((prev) => ({ ...prev, url_image: url })); setOpen(null) }} />
                        </>
                    ), (
                        <button type="button" className={bar.textBtn} data-on={open === 'link' || undefined}>
                            <Link2 size={17} /> {t('savethedate.poster_label')}
                        </button>
                    ), true)}
                </>
            )}
        </div>
    )
}

/* ── Itinerario ── */
// Los momentos se editan en el panel Itinerario del riel; la barra solo
// resume y lleva ahí.
// Asistentes de un Flash: prender / apagar el cuadro. Al prenderlo, los
// invitados eligen emoji o color al confirmar (iattend-events, SelectorAvatar).
// Cuándo se muestra el clima (tarjetasSide.js, modoClima): automático (unos
// días antes, cuando ya hay pronóstico), siempre, solo si va a llover u oculto.
const OpcionesClima = ({ body, setBody, sinCiudad }) => {
    const { t } = useTranslation()
    const modo = modoClima(body)
    return (
        <div className={own.climaOpciones}>
            <span className={own.modTitulo}>{t('side_events.weather_title')}</span>
            {MODOS_CLIMA.map((m) => (
                <button key={m} type="button" className={own.climaOpcion} data-on={modo === m || undefined} onClick={() => setBody(parcheModoClima(m))}>
                    <span className={own.climaRadio} aria-hidden />
                    <span>
                        <b>{t(`side_events.weather_mode_${m}`)}</b>
                        <span>{t(`side_events.weather_mode_${m}_hint`)}</span>
                    </span>
                </button>
            ))}
            {sinCiudad && <span className={own.climaNota}>{t('side_events.panel_weather_hint')}</span>}
        </div>
    )
}

// Barra de la capa Clima.
export const WeatherBar = ({ body, setBody }) => {
    const { t } = useTranslation()
    const [abierto, setAbierto] = useState(false)
    const modo = modoClima(body)
    return (
        <div className={bar.bar} data-edit-keep data-text-bar>
            <span className={bar.barIcon}>{modo === 'hidden' ? <CloudOff size={18} /> : <CloudSun size={18} />}</span>
            <span className={own.barText}>{t('side_events.weather_title')}</span>
            <Popover
                open={abierto}
                onOpenChange={setAbierto}
                trigger="click"
                placement="bottom"
                arrow={false}
                content={<div onMouseDown={(e) => e.stopPropagation()}><OpcionesClima body={body} setBody={(p) => { setBody(p); setAbierto(false) }} sinCiudad={!body?.address?.city} /></div>}
            >
                <button type="button" className={bar.textBtn} data-on={abierto || undefined}>
                    {t(`side_events.weather_mode_${modo}`)}
                </button>
            </Popover>
        </div>
    )
}

export const ItineraryBar = ({ count, onEdit }) => {
    const { t } = useTranslation()
    return (
        <div className={bar.bar} data-edit-keep data-text-bar>
            <span className={bar.barIcon}><ListOrdered size={18} /></span>
            <span className={own.barText}>{t('side_events.ws_moments', { n: count })}</span>
            <span className={bar.divider} />
            <button type="button" className={bar.textBtn} onClick={onEdit}>
                {t('side_events.ws_edit_moments')}
            </button>
        </div>
    )
}
