import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DatePicker, Input, Popover, Segmented, Slider, Switch, Tooltip } from 'antd'
import dayjs from 'dayjs'
import { Blend, Clapperboard, CloudOff, CloudSun, Film, GalleryHorizontal, ImageMinus, ImagePlus, Link2, MapPin, MessageCircle, Pin, Plus, Trash2, Undo2, Users, X, Maximize2, Minimize2, Move, Play, Droplets, Layers, RotateCcw, ZoomIn, ZoomOut, Video } from 'lucide-react'
import { cuerpoConFechas, dayjsToWallClock, fechasDelEvento, formatEventDateTime } from '../../../helpers/assets/eventDateTime'
import { LiveSlider } from '../../Invitation/Build/PageSections/barControls'
import { AddressAutocomplete } from '../AddressAutocomplete'
import { CAMPOS_DIRECCION as ADDRESS_FIELDS } from '../acceso'
import bar from '../../Invitation/Build/PageSections/ElementBar.module.css'
import own from './SideWorkspace.module.css'
import { MODOS_CLIMA, modoClima, parcheModoClima } from '../tarjetasSide'
import { VistaLinkWhatsApp } from '../VistaLinkWhatsApp'
import { ajusteDe, AJUSTE_ZOOM_MAX, DESENFOQUE_BASE, desenfoqueDe, esVideo, MAX_FOTOS_CARRUSEL, mediaDePortada, parcheAjuste, parcheMedia } from '../fotosPortada'

// Barras contextuales del editor de side events / Pop (arriba de la
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
// Hora de pared, sin conversión de timezone. Un Pop puede tener varias
// fechas (fechasDelEvento / cuerpoConFechas).
export const DateBar = ({ body, setBody, esPop }) => {
    const { t } = useTranslation()
    const { open, pop } = usePop()
    const lista = esPop ? (fechasDelEvento(body).length ? fechasDelEvento(body) : [null]) : [body?.hour]
    const cambiar = (i, valor) => {
        if (!esPop) return setBody({ hour: valor })
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
                    {esPop && lista.length > 1 && (
                        <button type="button" className={bar.iconBtn} title={t('side_events.date_remove')} onClick={() => setBody(cuerpoConFechas(lista.filter((_, j) => j !== i)))}>
                            <X size={16} />
                        </button>
                    )}
                </span>
            ))}
            {esPop && body?.hour && (
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

/* ── Paso entre la barra Fondo y la de Ajustar ──
// Son dos barras distintas: la que entra crece (o se encoge) desde el ancho
// de la que se fue, y sus botones aparecen con un fundido. Solo si la otra
// se acaba de ir (no al elegir el fondo otra vez más tarde). */
let barraQueSalio = null
const useAnchoDesdeLaAnterior = () => {
    const ref = useRef(null)
    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return undefined
        const antes = barraQueSalio && performance.now() - barraQueSalio.t < 200 ? barraQueSalio.ancho : null
        barraQueSalio = null
        const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        let cuadro = null
        if (antes && !quieto) {
            // Arranca con el ancho de la anterior; el suyo se mide dos cuadros
            // después, cuando sus controles (el slider de antd) ya se acomodaron.
            el.style.overflow = 'hidden'
            el.style.width = `${antes}px`
            ;[...el.children].forEach((c) => c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 90, easing: 'ease-out', fill: 'backwards' }))
            cuadro = requestAnimationFrame(() => { cuadro = requestAnimationFrame(() => {
                el.style.width = ''
                const ancho = el.offsetWidth
                el.style.width = `${antes}px`
                const listo = () => { el.style.width = ''; el.style.overflow = '' }
                // Se queda en su ancho final hasta quitar el ancho en línea (sin parpadeo).
                const a = el.animate([{ width: `${antes}px` }, { width: `${ancho}px` }], { duration: 320, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' })
                a.onfinish = () => {
                    // Si al final su ancho real ya es otro, termina de llegar
                    // a él en un tramo corto (sin salto).
                    el.style.width = ''
                    const real = el.offsetWidth
                    a.oncancel = null
                    a.cancel()
                    if (Math.abs(real - ancho) < 1) { listo(); return }
                    const b = el.animate([{ width: `${ancho}px` }, { width: `${real}px` }], { duration: 160, easing: 'ease-out' })
                    b.onfinish = listo
                    b.oncancel = listo
                }
                a.oncancel = listo
            }) })
        }
        return () => {
            if (cuadro) cancelAnimationFrame(cuadro)
            barraQueSalio = { ancho: el.offsetWidth, t: performance.now() }
        }
    }, [])
    return ref
}

/* ── Fondo ── */
// La portada como una tira de miniaturas (fotos y videos, fotosPortada.js):
// con una es el fondo fijo y con varias un carrusel (solo Pop; un side event
// de boda lleva una foto). La elegida (`fotoSel`) se ve quieta en la pieza,
// lleva la X para quitarla y es la que se ajusta; tocarla otra vez la cambia
// por otra. "+" agrega foto o video. Después: Ajustar y Velo.
// `pickMedia(request, handleImage)` abre Subidos en modo "elegir".
const duracionTexto = (seg) => (Number.isFinite(seg) ? `${Math.floor(seg / 60)}:${String(Math.floor(seg % 60)).padStart(2, '0')}` : '')

export const BackgroundBar = ({ current, setBody, onChange, esPop, pickMedia, fotoSel, onFotoSel, onAjustar }) => {
    const { t } = useTranslation()
    const { open, setOpen, pop } = usePop()
    const body = current?.body ?? {}
    const media = mediaDePortada(body)
    const max = esPop ? MAX_FOTOS_CARRUSEL : 1
    const elegida = media.includes(fotoSel) ? fotoSel : media[0] ?? null
    const veil = body.veil ?? 0
    const blur = desenfoqueDe(body)
    const [duraciones, setDuraciones] = useState({})
    // La foto del link: la primera foto, si no se subió una propia (LinkPanel).
    const fotoDelLink = esPop && !body.linkImage ? body.image : null
    const anchoRef = useAnchoDesdeLaAnterior()

    // Abre Subidos para elegir (en un Pop, foto o video). `reemplaza`: url
    // que se cambia por la nueva, en su mismo lugar.
    const elegir = (reemplaza = null) => {
        setOpen(null)
        pickMedia(esPop ? { type: 'side-events', mediaType: 'mixto' } : { type: 'side-events' }, (url) => {
            if (!url) return
            onChange((prev) => {
                const actual = mediaDePortada(prev.body)
                const lista = reemplaza ? actual.map((x) => (x === reemplaza ? url : x)) : [...actual, url]
                return { ...prev, body: { ...prev.body, ...parcheMedia(lista, prev.body.image) } }
            })
            onFotoSel?.(url)
        })
    }
    // Reordenar arrastrando (la primera foto es la del link y el pase).
    const [arrastrada, setArrastrada] = useState(null)
    const [sobre, setSobre] = useState(null)
    const mover = (desde, hasta) => {
        if (desde === hasta || desde == null || hasta == null) return
        onChange((prev) => {
            const lista = [...mediaDePortada(prev.body)]
            const [x] = lista.splice(desde, 1)
            lista.splice(hasta, 0, x)
            return { ...prev, body: { ...prev.body, ...parcheMedia(lista, prev.body.image) } }
        })
    }
    const quitar = (src) => {
        const lista = media.filter((x) => x !== src)
        onChange((prev) => ({
            ...prev,
            body: { ...prev.body, ...parcheMedia(mediaDePortada(prev.body).filter((x) => x !== src), prev.body.image === src ? null : prev.body.image) },
        }))
        onFotoSel?.(lista[Math.max(0, media.indexOf(src) - 1)] ?? null)
    }

    return (
        <div ref={anchoRef} className={bar.bar} data-edit-keep data-text-bar>
            <div className={own.fondoTira}>
                {media.map((src, i) => {
                    const video = esVideo(src)
                    const on = src === elegida
                    return (
                        <span
                            key={src + i}
                            className={own.fondoItem}
                            data-on={on || undefined}
                            data-arrastrando={arrastrada === i || undefined}
                            data-sobre={(sobre === i && arrastrada !== i) || undefined}
                            draggable={media.length > 1}
                            onDragStart={(e) => { setArrastrada(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }}
                            onDragOver={(e) => { if (arrastrada == null) return; e.preventDefault(); if (sobre !== i) setSobre(i) }}
                            onDragLeave={() => setSobre((x) => (x === i ? null : x))}
                            onDrop={(e) => { e.preventDefault(); mover(arrastrada, i); setArrastrada(null); setSobre(null) }}
                            onDragEnd={() => { setArrastrada(null); setSobre(null) }}
                        >
                            <Tooltip placement="bottom" title={on ? t(video ? 'side_events.cover_replace_video' : 'side_events.cover_replace') : null}>
                                <button
                                    type="button"
                                    className={own.fondoMini}
                                    aria-pressed={on}
                                    aria-label={video ? t('savethedate.media_video') : t('side_events.media_image')}
                                    onClick={() => (on ? elegir(src) : onFotoSel?.(src))}
                                >
                                    {video
                                        ? <video src={src} muted playsInline preload="metadata" draggable={false} onLoadedMetadata={(e) => { const d = e.currentTarget.duration; setDuraciones((x) => (x[src] === d ? x : { ...x, [src]: d })) }} />
                                        : <img src={src} alt="" draggable={false} />}
                                    {video && duraciones[src] > 0 && (
                                        <span className={own.fondoDuracion}><Play size={8} fill="currentColor" /> {duracionTexto(duraciones[src])}</span>
                                    )}
                                </button>
                            </Tooltip>
                            {src === fotoDelLink && (
                                <Tooltip placement="bottom" title={t('side_events.cover_link_badge')}>
                                    <span className={own.fondoLink}><Link2 size={11} /></span>
                                </Tooltip>
                            )}
                            {on && (
                                <button type="button" className={own.fondoQuitar} aria-label={t('side_events.carousel_remove')} onClick={() => quitar(src)}>
                                    <X size={12} strokeWidth={3} />
                                </button>
                            )}
                        </span>
                    )
                })}
                {media.length < max && (
                    <Tooltip placement="bottom" title={t(esPop ? 'side_events.cover_add' : 'side_events.canvas_add_image')}>
                        <button type="button" className={own.fondoAgregar} aria-label={t(esPop ? 'side_events.cover_add' : 'side_events.canvas_add_image')} onClick={() => elegir()}>
                            <Plus size={20} />
                        </button>
                    </Tooltip>
                )}
            </div>

            {media.length > 0 && (
                <>
                    <span className={bar.divider} />
                    {/* Ajustar la elegida: zoom y encuadre (AjusteFotoBar). */}
                    {onAjustar && (
                        <Tooltip placement="bottom" title={t('side_events.photo_adjust_tip')}>
                            <button type="button" className={bar.textBtn} onClick={() => { setOpen(null); onAjustar(elegida) }}>
                                <Move size={17} /> {t('side_events.photo_adjust')}
                            </button>
                        </Tooltip>
                    )}
                </>
            )}

            {/* Velo del color del tema sobre la portada y los PNG. */}
            {pop('veil', (
                <>
                    <div className={own.switchRow}>
                        <span>{t('side_events.veil_label')}</span>
                        <Switch size="small" checked={veil > 0} onChange={(v) => setBody({ veil: v ? VELO_INICIAL : null })} />
                    </div>
                    {veil > 0 && <LiveSlider label={t('side_events.veil_intensity')} value={veil} min={5} max={90} format={(v) => `${v}%`} onChange={(v, o) => setBody({ veil: v }, o)} />}
                </>
            ), (
                <button type="button" className={bar.textBtn} data-on={open === 'veil' || veil > 0 || undefined}>
                    <Blend size={17} /> {t('side_events.ws_veil')}
                </button>
            ))}

            {/* Desenfoque de la portada hacia abajo (fotosPortada.js →
                desenfoqueDe). Con un video de fondo no hay. */}
            {!body.video && pop('blur', (
                <>
                    <div className={own.switchRow}>
                        <span>{t('side_events.blur_label')}</span>
                        <Switch size="small" checked={blur.amount > 0} onChange={(v) => setBody({ coverBlur: { ...blur, amount: v ? DESENFOQUE_BASE.amount : 0 } })} />
                    </div>
                    {blur.amount > 0 && (
                        <>
                            <LiveSlider label={t('side_events.blur_amount')} value={blur.amount} min={1} max={20} format={(v) => `${v} px`} onChange={(v, o) => setBody({ coverBlur: { ...blur, amount: v } }, o)} />
                            <LiveSlider label={t('side_events.blur_start')} value={blur.start} min={0} max={90} format={(v) => `${v}%`} onChange={(v, o) => setBody({ coverBlur: { ...blur, start: v } }, o)} />
                        </>
                    )}
                </>
            ), (
                <button type="button" className={bar.textBtn} data-on={open === 'blur' || undefined}>
                    <Droplets size={17} /> {t('side_events.blur_button')}
                </button>
            ))}
        </div>
    )
}

/* ── Itinerario ── */
// Los momentos se editan en el panel Itinerario del riel; la barra solo
// resume y lleva ahí.
// Asistentes de un Pop: prender / apagar el cuadro. Al prenderlo, los
// invitados eligen emoji o color al confirmar (iattend-events, SelectorAvatar).
// Cuándo se muestra el clima (tarjetasSide.js, modoClima): automático (unos
// días antes, cuando ya hay pronóstico), siempre, solo si va a llover u oculto.
export const OpcionesClima = ({ body, setBody, sinCiudad }) => {
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
                content={<div data-text-bar onMouseDown={(e) => e.stopPropagation()}><OpcionesClima body={body} setBody={(p) => { setBody(p); setAbierto(false) }} sinCiudad={!body?.address?.city} /></div>}
            >
                <button type="button" className={bar.textBtn} data-on={abierto || undefined}>
                    {t(`side_events.weather_mode_${modo}`)}
                </button>
            </Popover>
        </div>
    )
}

// Barra del modo dibujo (herramienta Dibujar): el pincel elegido, deshacer el
// último trazo, borrar los de esta sesión y "Listo" (sale del modo dibujo).
// `pantallaCompleta` / `onPantallaCompleta`: dibujo a pantalla completa
// (SideWorkspace): el botón entra y, adentro, se vuelve "Salir".
/* ── Ajustar la foto de fondo ── */
// Mientras está abierta, la pieza toma el arrastre (mover) y la rueda (zoom)
// sobre la foto (SideCanvas `ajustarFoto`). Aquí: zoom, restablecer y Listo.
export const AjusteFotoBar = ({ body, setBody, src, onListo }) => {
    const { t } = useTranslation()
    const a = ajusteDe(body, src) ?? { z: 1, x: 50, y: 50 }
    const zoom = (z) => setBody(parcheAjuste(body, src, { ...a, z: Math.min(AJUSTE_ZOOM_MAX, Math.max(1, z)) }), { coalesce: 'ajuste-foto' })
    const tocado = Boolean(ajusteDe(body, src))
    const anchoRef = useAnchoDesdeLaAnterior()
    return (
        <div ref={anchoRef} className={bar.bar} data-edit-keep>
            <span className={own.barText}><Move size={15} /> {t('side_events.photo_adjust_drag')}</span>
            <span className={bar.divider} />
            <button type="button" className={bar.iconBtn} aria-label={t('build_editor.zoom_out')} onClick={() => zoom(Math.round((a.z - 0.1) * 100) / 100)} disabled={a.z <= 1}>
                <ZoomOut size={16} />
            </button>
            <Slider
                className={own.ajusteSlider}
                min={100}
                max={AJUSTE_ZOOM_MAX * 100}
                value={Math.round(a.z * 100)}
                tooltip={{ formatter: (v) => `${v}%` }}
                onChange={(v) => zoom(v / 100)}
            />
            <button type="button" className={bar.iconBtn} aria-label={t('build_editor.zoom_in')} onClick={() => zoom(Math.round((a.z + 0.1) * 100) / 100)} disabled={a.z >= AJUSTE_ZOOM_MAX}>
                <ZoomIn size={16} />
            </button>
            <span className={own.ajusteValor}>{Math.round(a.z * 100)}%</span>
            <span className={bar.divider} />
            <button type="button" className={bar.textBtn} data-off={!tocado || undefined} disabled={!tocado} onClick={() => setBody(parcheAjuste(body, src, null))}>
                <RotateCcw size={16} /> {t('side_events.photo_adjust_reset')}
            </button>
            <button type="button" className={own.dibujoListo} onClick={onListo}>{t('side_events.draw_done')}</button>
        </div>
    )
}

// Con varias fotos / videos en la portada, "Dibujar en": toda la portada o
// una de ellas (`dibujoEn` = 'todo' | url; SideCanvas la deja fija).
// "Dibujar en": toda la portada o una de sus fotos / videos (segmentado con
// miniaturas). Lo usan la barra de dibujo de escritorio (DibujoBar) y el
// header del modo dibujo del celular (EditorMovil, `className`).
export const DibujarEn = ({ media = [], dibujoEn = 'todo', onDibujoEn, className = '' }) => {
    const { t } = useTranslation()
    return (
        <div className={`${own.dibujoEnSeg} ${className}`} role="radiogroup" aria-label={t('side_events.draw_on')}>
            <Tooltip placement="bottom" title={t('side_events.draw_on_all')}>
                <button type="button" role="radio" aria-checked={dibujoEn === 'todo'} className={own.dibujoEnTodo} data-on={dibujoEn === 'todo' || undefined} onClick={() => onDibujoEn('todo')}>
                    <Layers size={16} /> {t('side_events.draw_on_cover')}
                </button>
            </Tooltip>
            {media.map((src, i) => (
                <Tooltip key={src + i} placement="bottom" title={t(esVideo(src) ? 'side_events.draw_on_video' : 'side_events.draw_on_photo', { n: i + 1 })}>
                    <button type="button" role="radio" aria-checked={dibujoEn === src} className={own.dibujoEnMini} data-on={dibujoEn === src || undefined} onClick={() => onDibujoEn(src)}>
                        {esVideo(src) ? <video src={src} muted playsInline preload="metadata" /> : <img src={src} alt="" />}
                    </button>
                </Tooltip>
            ))}
        </div>
    )
}

export const DibujoBar = ({ trazos, onBorrarTodo, onListo, pantallaCompleta = false, onPantallaCompleta, media = [], dibujoEn = 'todo', onDibujoEn }) => {
    const { t } = useTranslation()
    const sin = trazos === 0
    return (
        <div className={bar.bar} data-edit-keep>
            {media.length > 1 && onDibujoEn && (
                <>
                    <span className={own.dibujoEnLabel}>{t('side_events.draw_on')}</span>
                    <DibujarEn media={media} dibujoEn={dibujoEn} onDibujoEn={onDibujoEn} />
                    <span className={bar.divider} />
                </>
            )}
            <Tooltip placement="bottom" title={t('side_events.draw_clear')}>
                <button type="button" className={bar.iconBtn} data-off={sin || undefined} disabled={sin} onClick={onBorrarTodo} aria-label={t('side_events.draw_clear')}>
                    <Trash2 size={18} />
                </button>
            </Tooltip>
            {onPantallaCompleta && (
                <Tooltip placement="bottom" title={t(pantallaCompleta ? 'side_events.draw_fullscreen_exit' : 'side_events.draw_fullscreen')}>
                    <button
                        type="button"
                        className={bar.iconBtn}
                        data-on={pantallaCompleta || undefined}
                        onClick={() => onPantallaCompleta(!pantallaCompleta)}
                        aria-label={t(pantallaCompleta ? 'side_events.draw_fullscreen_exit' : 'side_events.draw_fullscreen')}
                    >
                        {pantallaCompleta ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </Tooltip>
            )}
            <button type="button" className={own.dibujoListo} onClick={onListo}>{t('side_events.draw_done')}</button>
        </div>
    )
}
