import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CircleCheck, CircleX, CloudSun, ImagePlus, MapPin, Music2 } from 'lucide-react'
import { ItinerarioWidget } from './ItinerarioWidget'
import { useTranslation } from 'react-i18next'
import { colorDeVelo, darker, sombraDeTexto } from '../../helpers/assets/functions'
import { itinerarioPorDia, lineasDeFechas } from '../../helpers/assets/eventDateTime'
import styles from './SideCanvas.module.css'
import { alternar, conModificador, lienzoCover } from './stickersFlashData'
import { EfectosCapa } from './EfectosCapa'

/**
 * Lienzo editable del side event.
 *
 * Calca la pieza pública (`iattend-events/src/components/SideEvent/`): hero con
 * blur enmascarado y, encima, la columna de tarjetas tintadas con el color del
 * tema. Cada zona se toca para editarla y el título y las notas se escriben
 * directo sobre la pieza.
 *
 * Lo que se maqueta en vez de replicarse: los botones de RSVP (aquí no hay
 * invitado), el mapa (un iframe de Google dentro de un lienzo escalado pesa y
 * se come los clics) y el clima (no se llama a la API desde el editor).
 *
 * El título y las notas son `contentEditable`, no inputs de antd. Dos razones,
 * las dos de móvil: `styles/index.css` fuerza `font-size: 16px !important` a
 * todo input bajo 750px (anti-zoom de iOS) y se comía el tamaño real del
 * título; y el `autoSize` del TextArea mide el alto **antes** de que cargue la
 * tipografía del evento, así que el título quedaba en una línea y se cortaba.
 * Un div crece solo y ninguna de las dos cosas lo toca.
 */

// La hoja inferior se mueve en 0.28s con esta curva (BottomSheet.module.css).
// El lienzo usa exactamente las mismas para que los dos se sientan un solo
// gesto en vez de dos movimientos encimados.
const SHEET_MS = 280
const SHEET_CURVE = [0.32, 0.72, 0, 1]

// cubic-bezier(x1,y1,x2,y2) resuelto por Newton, como lo hace el navegador.
const cubicBezier = ([x1, y1, x2, y2]) => {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
    const atX = (t) => ((ax * t + bx) * t + cx) * t
    const atY = (t) => ((ay * t + by) * t + cy) * t
    const slope = (t) => (3 * ax * t + 2 * bx) * t + cx
    return (x) => {
        let t = x
        for (let i = 0; i < 5; i += 1) {
            const d = slope(t)
            if (!d) break
            t -= (atX(t) - x) / d
        }
        return atY(t)
    }
}

const ease = cubicBezier(SHEET_CURVE)

// El remoto pinta la dirección solo cuando está completa
const ADDRESS_KEYS = ['street', 'number', 'neighborhood', 'zipcode', 'city', 'state', 'country']

const hasFullAddress = (address) => ADDRESS_KEYS.every((k) => !!address?.[k])

export const SideCanvas = ({
    current,
    onChange,                // (updater) => void, marca dirty
    selected,
    onSelect,
    readOnly = false,
    fullBleed = false,       // móvil: la pieza ocupa toda la pantalla
    liftBottom = 0,          // móvil: cuánto sube el contenido para librar la hoja
    conCancion = false,      // Flash: chip de la canción (panel Canción)
    storyMode = false,       // móvil "story": sin chips arriba ni contornos punteados
    stickerSel = [],         // Flash: ids de los PNG seleccionados (StickersFlash)
    onStickerSel,
}) => {

    const { t } = useTranslation()
    const cardRef = useRef(null)
    const scrollRef = useRef(null)
    // Dónde estaba el lienzo antes de abrir la primera hoja, para devolverlo
    // ahí cuando se cierre.
    const restoreScrollRef = useRef(null)
    const scrollAnimRef = useRef(null)

    // El espacio de abajo se sostiene hasta que termina el scroll de vuelta:
    // si se quitara al instante, el navegador recorta el scroll al nuevo tope
    // y la mitad del recorrido se vería como un salto seco.
    const [heldPad, setHeldPad] = useState(0)
    const padBottom = liftBottom || heldPad

    // Scroll con la curva y la duración de la hoja. `scrollTo({behavior})` no
    // sirve: su tiempo lo decide el navegador y se desincroniza de la hoja.
    const glideTo = (el, to, onDone) => {
        cancelAnimationFrame(scrollAnimRef.current)
        const from = el.scrollTop
        const delta = to - from

        if (!delta || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            el.scrollTop = to
            onDone?.()
            return
        }

        const start = performance.now()
        const step = (now) => {
            const p = Math.min(1, (now - start) / SHEET_MS)
            el.scrollTop = from + delta * ease(p)
            if (p < 1) scrollAnimRef.current = requestAnimationFrame(step)
            else onDone?.()
        }
        scrollAnimRef.current = requestAnimationFrame(step)
    }

    useEffect(() => () => cancelAnimationFrame(scrollAnimRef.current), [])

    // Mientras se teclea manda el DOM: si React reescribiera el texto, el
    // caret saltaría al final. Por eso el valor inicial se congela y el lienzo
    // se monta con `key={current.id}`.
    const [initialTitle] = useState(() => current?.name ?? '')
    const [initialExtras] = useState(() => current?.body?.extras ?? '')

    // Con la hoja abierta el contenido ya no se empuja hacia arriba a ciegas
    // —así se salía el título por arriba—: el lienzo gana espacio abajo y la
    // zona elegida se centra en la banda que queda visible.
    //
    // `scrollIntoView({block:'center'})` no sirve: centra en el escenario
    // completo, y la mitad de abajo la tapa la hoja.
    useEffect(() => {
        const scroller = scrollRef.current
        if (!scroller) return

        // Hoja cerrada: el lienzo vuelve a donde estaba antes de abrirla, y
        // solo entonces suelta el espacio de abajo.
        if (!selected || !liftBottom) {
            const back = restoreScrollRef.current
            if (back === null) return
            restoreScrollRef.current = null
            glideTo(scroller, back, () => setHeldPad(0))
            return
        }

        setHeldPad(liftBottom)

        const zone = cardRef.current?.querySelector(`[data-zone="${selected}"]`)
        if (!zone) return

        // Solo la primera vez: cambiar de una zona a otra no debe pisar el
        // punto de partida.
        if (restoreScrollRef.current === null) restoreScrollRef.current = scroller.scrollTop

        const band = scroller.clientHeight - liftBottom   // lo que la hoja deja ver
        const zoneRect = zone.getBoundingClientRect()
        const scrollerRect = scroller.getBoundingClientRect()
        const margin = Math.max(12, (band - zoneRect.height) / 2)
        const delta = (zoneRect.top - scrollerRect.top) - margin

        glideTo(scroller, scroller.scrollTop + delta)
    }, [selected, liftBottom])

    const body = current?.body ?? {}
    const title = body.title ?? {}
    const address = body.address ?? {}

    // Mismo cálculo del tinte que el remoto. `darker` devuelve null si el hex
    // no trae los 6 dígitos, así que el default va completo.
    const themeColor = body.color || '#000000'
    // body.veil (0–100): velo opcional del color del tema sobre la portada y
    // los PNG, detrás del texto (panel Fondo). Igual que el remoto.
    // Con video no hay desenfoque detrás de las tarjetas: más opacas (85%).
    const tint = `${darker(themeColor, 0.8) ?? '#000000'}${body.video ? 'D9' : '80'}`

    const pick = (section) => (e) => {
        if (readOnly) return
        e.stopPropagation()
        onSelect(section)
        // Móvil "story": tocar otra zona suelta el PNG elegido.
        if (storyMode) onStickerSel?.([])
    }

    const cls = (section, base) => (readOnly
        ? base
        : `${base} ${styles.pickable} ${selected === section ? styles.picked : ''}`)

    // PNG de un Flash (body.stickers, ver StickersFlash.jsx): se arrastran en
    // la pieza; x/y en % de la capa (ancho y alto de la pantalla).
    // Los ocultos (`hidden`, panel de capas) siguen guardados pero no se pintan.
    const stickers = (Array.isArray(body.stickers) ? body.stickers : []).filter(s => !s.hidden)
    // Mientras se arrastra: líneas guía del centro. Cerca del centro (±1.5%)
    // el PNG se imanta y la línea se marca.
    const [guias, setGuias] = useState(null)
    const IMAN = 1.5
    // Zona segura: los PNG no pueden bajar a los botones de confirmar. Es la
    // distancia (px de la pieza, sin escalar) del techo de la capa al borde de
    // arriba de la píldora; lo de abajo se recorta.
    const infoRef = useRef(null)
    useEffect(() => {
        const scroller = scrollRef.current
        if (!scroller) return
        const alScroll = () => {
            // Zoom de la portada al subir los botones (0 → 1 en
            // el 60% de la pantalla), como el remoto (--portada-avance).
            const avance = Math.min(1, Math.max(0, scroller.scrollTop / (scroller.clientHeight * 0.6)))
            cardRef.current?.style.setProperty('--portada-avance', avance.toFixed(3))
        }
        alScroll()
        scroller.addEventListener('scroll', alScroll, { passive: true })
        return () => scroller.removeEventListener('scroll', alScroll)
    }, [])
    const botonesRef = useRef(null)
    // La capa de los PNG es la pantalla (x/y/w en % de su ancho y alto). Los
    // botones de confirmar siempre van al fondo de la pantalla, igual que en
    // la página del invitado (iattend-events, SideEvent.tsx), así que los PNG
    // quedan igual respecto al borde de arriba y a los botones en las dos.
    // `zona`: { top, alto } de la capa y `limite` (techo de los botones).
    const [zona, setZona] = useState(null)
    useLayoutEffect(() => {
        const info = infoRef.current
        const botones = botonesRef.current
        const alto = scrollRef.current?.clientHeight
        const ancho = scrollRef.current?.clientWidth
        if (!info || !botones || !alto || !ancho) return
        const top = 0
        const limite = Math.max(0, info.offsetTop + botones.offsetTop)
        if (zona?.limite !== limite || zona?.alto !== alto || zona?.top !== top || zona?.ancho !== ancho) setZona({ limite, alto, top, ancho })
    })
    const marco = zona ? { top: zona.top, height: zona.alto } : undefined
    // Los PNG viven en un lienzo de 390×700 (la pieza) que cubre la pantalla
    // como la foto de fondo (cover): en la pieza es la pantalla tal cual; en
    // una más alargada (móvil a pantalla completa, la página del invitado)
    // se escala por el alto y se recorta un poco a los lados, así los PNG
    // conservan su tamaño respecto a la pantalla.
    const lienzo = zona ? lienzoCover(zona.ancho, zona.alto) : undefined
    const seleccion = Array.isArray(stickerSel) ? stickerSel : (stickerSel ? [stickerSel] : [])
    // ⌘/Ctrl/Shift + clic suma o quita de la selección (y si lo quita, no lo
    // arrastra). Arrastrar uno que ya está en la selección mueve a todo el
    // grupo, con el mismo desplazamiento; el imán al centro lo marca el que
    // se agarró.
    // Al presionar un PNG aparece su agarradera encima, así que el clic que
    // sigue termina en otro elemento y el navegador se lo da al contenedor
    // común (el scroller), que elegía el fondo. Esta marca hace que ese clic
    // se ignore; se apaga en cuanto termina.
    const clicDeSticker = useRef(false)
    // Móvil "story": un PNG sin seleccionar no se arrastra al tocarlo (un PNG
    // grande cubre casi toda la pieza y robaba el scroll y el deslizar a
    // Invitados); se elige con un toque y ya elegido se mueve.
    const elegirSticker = (s) => (e) => {
        e.stopPropagation()
        if (readOnly || !storyMode || seleccion.includes(s.id)) return
        // Sin abrir la hoja: se ajusta con gestos y la píldora de arriba.
        // Si había otra hoja abierta, se cierra.
        if (selected && selected !== 'stickers') onSelect(null)
        onStickerSel?.([s.id])
    }

    // Móvil "story": con un PNG elegido, dos dedos en cualquier parte de la
    // pieza lo escalan (pellizcar) y lo giran. Listeners nativos (no
    // pasivos) para poder frenar el zoom y el scroll del navegador.
    const pellizcoRef = useRef(null)
    const pellizcadoRef = useRef(false)   // el dedo que arrastraba no mueve tras pellizcar
    const ultimoRef = useRef(null)
    useEffect(() => {
        ultimoRef.current = { activo: storyMode && !readOnly && seleccion.length > 0, seleccion, todos: body.stickers ?? [], onChange }
    })
    useEffect(() => {
        const card = cardRef.current
        if (!card || !storyMode) return
        const medir = (t) => {
            const [a, b] = [t[0], t[1]]
            return {
                d: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
                ang: (Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180) / Math.PI,
            }
        }
        const inicio = (e) => {
            const u = ultimoRef.current
            if (!u?.activo || e.touches.length !== 2) return
            e.preventDefault()
            const { d, ang } = medir(e.touches)
            pellizcoRef.current = {
                d0: d || 1,
                a0: ang,
                base: Object.fromEntries(u.todos.filter(o => u.seleccion.includes(o.id)).map(o => [o.id, { w: o.w, rot: o.rot ?? 0 }])),
            }
            pellizcadoRef.current = true
        }
        const mover = (e) => {
            const g = pellizcoRef.current
            if (!g || e.touches.length !== 2) return
            e.preventDefault()
            const { d, ang } = medir(e.touches)
            const escala = d / g.d0
            const giro = ang - g.a0
            const girar = (r) => ((((r + 180) % 360) + 360) % 360) - 180
            ultimoRef.current.onChange((prev) => ({
                ...prev,
                body: {
                    ...prev.body,
                    stickers: (prev.body?.stickers ?? []).map(o => (g.base[o.id]
                        ? {
                            ...o,
                            w: Math.min(200, Math.max(5, Math.round(g.base[o.id].w * escala * 100) / 100)),
                            rot: Math.round(girar(g.base[o.id].rot + giro) * 10) / 10,
                        }
                        : o)),
                },
            }))
        }
        const fin = (e) => { if (e.touches.length < 2) pellizcoRef.current = null }
        // Safari: sin esto el pellizco también hace zoom a la página.
        const sinZoom = (e) => { if (ultimoRef.current?.activo) e.preventDefault() }
        card.addEventListener('touchstart', inicio, { passive: false })
        card.addEventListener('touchmove', mover, { passive: false })
        card.addEventListener('touchend', fin)
        card.addEventListener('touchcancel', fin)
        card.addEventListener('gesturestart', sinZoom)
        return () => {
            card.removeEventListener('touchstart', inicio)
            card.removeEventListener('touchmove', mover)
            card.removeEventListener('touchend', fin)
            card.removeEventListener('touchcancel', fin)
            card.removeEventListener('gesturestart', sinZoom)
        }
    }, [storyMode])

    const arrastrarSticker = (s) => (e) => {
        if (readOnly) return
        if (storyMode && !seleccion.includes(s.id) && !conModificador(e)) return
        e.stopPropagation()
        e.preventDefault()
        clicDeSticker.current = true
        window.addEventListener('pointerup', () => setTimeout(() => { clicDeSticker.current = false }, 0), { once: true })
        if (!storyMode) onSelect('stickers')
        pellizcadoRef.current = false
        let grupo
        if (conModificador(e)) {
            grupo = alternar(seleccion, s.id)
            onStickerSel?.(grupo)
            if (!grupo.includes(s.id)) return
        } else {
            grupo = seleccion.includes(s.id) ? seleccion : [s.id]
            onStickerSel?.(grupo)
        }
        const capa = e.currentTarget.parentElement.getBoundingClientRect()
        const inicio = { px: e.clientX, py: e.clientY, x: s.x, y: s.y }
        const origen = Object.fromEntries(stickers.filter(o => grupo.includes(o.id)).map(o => [o.id, { x: o.x, y: o.y }]))
        const limitar = (v) => Math.min(100, Math.max(0, Math.round(v * 10) / 10))
        const imantar = (v) => (Math.abs(v - 50) <= IMAN ? 50 : v)
        setGuias({ x: s.x === 50, y: s.y === 50 })
        const mover = (ev) => {
            // Con dos dedos manda el pellizco; el dedo que queda no lo mueve.
            if (pellizcadoRef.current) return
            const x = imantar(limitar(inicio.x + ((ev.clientX - inicio.px) / capa.width) * 100))
            const y = imantar(limitar(inicio.y + ((ev.clientY - inicio.py) / capa.height) * 100))
            const dx = x - inicio.x
            const dy = y - inicio.y
            setGuias({ x: x === 50, y: y === 50 })
            onChange((prev) => ({
                ...prev,
                body: {
                    ...prev.body,
                    stickers: (prev.body?.stickers ?? []).map(o => (origen[o.id]
                        ? { ...o, x: limitar(origen[o.id].x + dx), y: limitar(origen[o.id].y + dy) }
                        : o)),
                },
            }))
        }
        const soltar = () => {
            setGuias(null)
            window.removeEventListener('pointermove', mover)
            window.removeEventListener('pointerup', soltar)
        }
        window.addEventListener('pointermove', mover)
        window.addEventListener('pointerup', soltar)
    }

    const estiloSticker = (s) => ({
        left: `${s.x}%`,
        top: `${s.y}%`,
        width: `${s.w}%`,
        transform: `translate(-50%, -50%) rotate(${s.rot ?? 0}deg)`,
        opacity: s.opacity ?? 1,
        pointerEvents: readOnly ? 'none' : 'auto',
    })

    const setName = (value) => onChange((prev) => ({ ...prev, name: value }))
    const setExtras = (value) => onChange((prev) => ({ ...prev, body: { ...prev.body, extras: value } }))

    // Un Flash puede tener varias fechas: las de mismo mes y hora van juntas.
    const dateLabels = lineasDeFechas(body, { state: address.state, timezone: body.timezone })
    const placeLabel = body.place_name
        || (address.street && address.number ? `${address.street} ${address.number}` : null)
    const regionLabel = !body.place_name && (address.state || address.country)
        ? [address.state, address.country].filter(Boolean).join(' ')
        : null

    return (
        <div
            ref={cardRef}
            className={`${styles.card} ${fullBleed ? styles.cardFull : ''} ${storyMode ? styles.cardStory : ''} ${readOnly ? styles.cardReadOnly : ''} ${body.video ? styles.cardVideo : ''}`}
            style={{ '--blur-color': themeColor, '--blur-color--dark': tint }}
            onClick={() => {
                if (readOnly) return
                onSelect(null)
                if (storyMode) onStickerSel?.([])
            }}
        >

            {/* ── Hero ── */}
            <div className={cls('background', styles.hero)} onClick={pick('background')}>
                {/* Flash con video de fondo: la imagen es su cuadro fijo. */}
                {body.video
                    ? <video src={body.video} poster={body.image || undefined} autoPlay muted loop playsInline preload='auto' className={styles.heroBg} />
                    : body.image
                    ? <img src={body.image} alt='' className={styles.heroBg} />
                    : (
                        <div className={styles.heroEmpty}>
                            <ImagePlus size={26} />
                            <span className={styles.heroEmptyLabel}>{t('side_events.canvas_add_image')}</span>
                        </div>
                    )
                }
                <div aria-hidden className={styles.blurCover} />
                <div aria-hidden className={styles.shadow} />
            </div>

            {/* ── Fila superior: accesos que no son parte de la pieza ──
                El fondo y el color del tema no se pueden tocar en el lienzo
                (uno es la imagen de atrás, el otro tiñe todas las tarjetas),
                así que cada uno tiene su chip, como el de canción del Save
                the Date. */}
            {/* En modo story sus funciones pasan a los botones del editor. */}
            {!readOnly && !storyMode &&
                <div className={styles.topRow}>
                    {/* Flash: canción, arriba a la izquierda como su reproductor en
                        la página del invitado (SongPlayer). Solo el disco. */}
                    {conCancion &&
                        <button
                            className={cls('song', `${styles.chip} ${styles.chipDisco}`)}
                            onClick={pick('song')}
                            aria-label={body.song?.name ?? t('side_events.song_add')}
                            title={body.song?.name ?? t('side_events.song_add')}
                        >
                            {body.song?.albumArt
                                ? <img src={body.song.albumArt} alt='' className={styles.chipDiscoArte} />
                                : <Music2 size={14} />
                            }
                        </button>
                    }
                    <button className={cls('background', styles.chip)} onClick={pick('background')} data-tour='chip-background'>
                        <span className={styles.chipIcon}><ImagePlus size={13} /></span>
                        <span className={styles.chipLabel}>
                            {body.image ? t('side_events.canvas_change_image') : t('side_events.canvas_add_image')}
                        </span>
                    </button>

                    <button className={cls('color', `${styles.chip} ${styles.chipDerecha}`)} onClick={pick('color')} data-tour='chip-color'>
                        <span className={styles.chipSwatch} style={{ background: themeColor }} />
                        <span className={styles.chipLabel}>{t('side_events.theme_color')}</span>
                    </button>
                </div>
            }

            {/* ── Columna de info, encima del hero ── */}
            {/* Tocar el hueco de arriba (sin texto ni PNG) elige el fondo. */}
            <div
                ref={scrollRef}
                className={`${styles.scrollArea} scroll-invitation`}
                onClick={(e) => {
                    if (clicDeSticker.current) { e.stopPropagation(); return }
                    if (e.target === e.currentTarget) pick('background')(e)
                }}
            >

                {/* Portada fija (sticky dentro del scroller): no se mueve al hacer
                    scroll. Los PNG, los efectos, el velo, el tinte y el título,
                    la fecha y el lugar; los botones y las tarjetas (.infoCont,
                    z 1) suben encima. Igual que la página del invitado
                    (.portada_fija). */}
                <div className={styles.portadaFija}>
                    {/* Todos van detrás del título, la fecha, el lugar y los
                        botones (z 0, debajo de .infoCont). El seleccionado tiene
                        además una agarradera invisible encima de todo para poder
                        moverlo aunque lo tape el texto. */}
                    {stickers.length > 0 && (
                        <div aria-hidden className={`${styles.stickersCapa} ${styles.stickersAtras}`} style={marco}>
                            <div className={styles.lienzo} style={lienzo}>
                                {stickers.map(s => (
                                    <img
                                        key={s.id}
                                        src={s.url}
                                        alt=''
                                        draggable={false}
                                        className={styles.sticker}
                                        style={estiloSticker(s)}
                                        onPointerDown={arrastrarSticker(s)}
                                        onClick={elegirSticker(s)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Efectos animados (panel Efectos): encima de la portada y los PNG,
                        debajo del texto y los botones. */}
                    {body.effect?.type && (
                        <div aria-hidden className={`${styles.stickersCapa} ${styles.stickersAtras}`} style={marco}>
                            <EfectosCapa effect={body.effect} colorTema={themeColor} />
                        </div>
                    )}
                    {colorDeVelo(themeColor, body.veil) && (
                        <div aria-hidden className={styles.capaFija} style={{ background: colorDeVelo(themeColor, body.veil) }} />
                    )}
                    <div aria-hidden className={`${styles.capaFija} ${styles.tinteFijo}`} />
                    {/* Fundido inferior: el último 30% se funde con el color de
                        fondo de la página, como el remoto (.fundido_inferior): no
                        se ve el borde de abajo de los PNG ni del video. */}
                    <div
                        aria-hidden
                        className={`${styles.capaFija} ${styles.fundidoFijo}`}
                        style={{ '--fondo-pagina': darker(themeColor, 0.8) ?? themeColor }}
                    />
                </div>

                {/* Encima de todo, también fijas: guías, zona de botones y la
                    agarradera de los PNG seleccionados. */}
                <div className={`${styles.portadaFija} ${styles.portadaFijaArriba}`}>
                    {/* Guías del centro mientras se arrastra un PNG */}
                    {guias && (
                        <div aria-hidden className={`${styles.stickersCapa} ${styles.guias}`} style={marco}>
                            <span className={`${styles.guiaV} ${guias.x ? styles.guiaActiva : ''}`} />
                            <span className={`${styles.guiaH} ${guias.y ? styles.guiaActiva : ''}`} />
                        </div>
                    )}
                    {!readOnly && seleccion.length > 0 && (
                        <div aria-hidden className={`${styles.stickersCapa} ${styles.stickersAgarre}`} style={marco}>
                            <div className={styles.lienzo} style={lienzo}>
                                {stickers.filter(s => seleccion.includes(s.id)).map(s => (
                                    // El img (transparente) le da al div el tamaño del PNG;
                                    // el contorno punteado es del div y sí se ve.
                                    <div
                                        key={s.id}
                                        className={`${styles.sticker} ${styles.stickerSel}`}
                                        style={{ ...estiloSticker(s), opacity: 1 }}
                                        data-sticker
                                        onPointerDown={arrastrarSticker(s)}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <img src={s.url} alt='' draggable={false} className={styles.stickerHueco} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div
                    ref={infoRef}
                    className={styles.infoCont}
                    style={padBottom ? { paddingBottom: padBottom + 24 } : undefined}
                >

                    {/* Primera pantalla: título, fecha, lugar y botones, con los
                        botones al fondo (16 px abajo), como la página del invitado
                        (.primera_pantalla). Al hacer scroll todo sube encima de la
                        portada fija. */}
                    <div className={styles.primeraPantalla}>
                        {/* Título. Vacío no ocupa lugar (como en la página del
                            invitado, donde no se pinta): el texto de ejemplo flota
                            encima de la fecha para poder tocarlo y escribir. */}
                        <div className={`${cls('title', styles.titleZone)} ${!current?.name?.trim() ? styles.titleVacio : ''}`} data-zone='title' onClick={pick('title')}>
                            <div
                                className={styles.titleInput}
                                contentEditable={!readOnly}
                                suppressContentEditableWarning
                                spellCheck={false}
                                data-placeholder={t('side_events.event_title_placeholder')}
                                onInput={(e) => setName(e.currentTarget.textContent)}
                                style={{
                                    fontFamily: title.font ?? 'Poppins',
                                    fontWeight: title.weight ?? 500,
                                    fontSize: `${title.size ?? 36}px`,
                                    lineHeight: title.line_height ?? 1.4,
                                    opacity: title.opacity ?? 1,
                                    textShadow: sombraDeTexto(title.shadow),
                                }}
                            >
                                {initialTitle}
                            </div>
                        </div>

                        {/* Fecha y lugar van en un solo bloque, sin separación,
                            igual que la columna .col de la página del invitado. */}
                        <div className={styles.detalles}>
                            {/* Fecha */}
                            <div className={cls('date', styles.col)} data-zone='date' onClick={pick('date')} style={{ textShadow: sombraDeTexto(body.details_shadow) }}>
                                {dateLabels.length
                                    ? dateLabels.map(label => <span key={label}>{label}</span>)
                                    : <span className={styles.colMuted}>{t('side_events.datetime_label')}</span>
                                }
                            </div>

                            {/* Lugar */}
                            <div className={cls('place', styles.col)} data-zone='place' onClick={pick('place')} style={{ textShadow: sombraDeTexto(body.details_shadow) }}>
                                {placeLabel
                                    ? <>
                                        <span>{placeLabel}</span>
                                        {regionLabel && <span>{regionLabel}</span>}
                                    </>
                                    : <span className={styles.colMuted}>{t('side_events.place_name_label')}</span>
                                }
                            </div>
                        </div>
                        {/* RSVP: maqueta de la píldora de la pieza */}
                        <div ref={botonesRef} aria-hidden className={styles.buttonsCont}>
                            <span className={styles.mockBtn}>
                                <CircleCheck size={17} /> {t('side_events.canvas_rsvp_yes')}
                            </span>
                            <span className={styles.mockBtn}>
                                <CircleX size={17} /> {t('side_events.canvas_rsvp_no')}
                            </span>
                        </div>
                    </div>

                    {/* Itinerario de un Flash: el mismo widget que el remoto, arriba de Cómo llegar. */}
                    {itinerarioPorDia(body).length > 0 &&
                        <div className={cls('itinerary', styles.itineraryZona)} data-zone='itinerary' onClick={pick('itinerary')}>
                            <ItinerarioWidget body={body} />
                        </div>
                    }

                    {/* Mapa: aparece igual que en el remoto, solo con dirección completa */}
                    {hasFullAddress(address) &&
                        <div className={cls('place', `${styles.block} ${styles.mapBlock}`)} onClick={pick('place')}>
                            <span className={styles.mapLabel}>{t('side_events.canvas_map')}</span>
                            <div className={styles.mapPreview}>
                                <MapPin size={16} />
                                <span>{[address.street, address.number, address.city].filter(Boolean).join(' ')}</span>
                            </div>
                        </div>
                    }

                    {/* Notas: debajo de Cómo llegar */}
                    <div className={cls('extras', styles.block)} data-zone='extras' onClick={pick('extras')}>
                        <div
                            className={styles.extrasInput}
                            contentEditable={!readOnly}
                            suppressContentEditableWarning
                            spellCheck={false}
                            data-placeholder={t('side_events.extras_placeholder')}
                            onInput={(e) => setExtras(e.currentTarget.innerText)}
                        >
                            {initialExtras}
                        </div>
                    </div>

                    {/* Clima: mismo criterio que el remoto (ciudad y no oculto).
                        Se edita desde Lugar, que es lo que lo condiciona. */}
                    {address.city && !body.hideWeather &&
                        <div className={cls('place', `${styles.block} ${styles.weatherBlock}`)} onClick={pick('place')}>
                            <div className={styles.weatherLeft}>
                                <span className={styles.weatherTitle}>{t('side_events.canvas_weather')}</span>
                                <span className={styles.weatherHint}>{address.city}</span>
                            </div>
                            <CloudSun size={26} />
                        </div>
                    }

                    <div aria-hidden className={styles.footer}>I attend</div>
                </div>
            </div>
        </div>
    )
}

export default SideCanvas
