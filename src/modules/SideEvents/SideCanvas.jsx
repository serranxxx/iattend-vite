import React, { useEffect, useRef, useState } from 'react'
import { CircleCheck, CircleX, CloudSun, ImagePlus, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { darker } from '../../helpers/assets/functions'
import { formatEventDateTime } from '../../helpers/assets/eventDateTime'
import styles from './SideCanvas.module.css'

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
    const tint = `${darker(themeColor, 0.8) ?? '#000000'}80`

    const pick = (section) => (e) => {
        if (readOnly) return
        e.stopPropagation()
        onSelect(section)
    }

    const cls = (section, base) => (readOnly
        ? base
        : `${base} ${styles.pickable} ${selected === section ? styles.picked : ''}`)

    const setName = (value) => onChange((prev) => ({ ...prev, name: value }))
    const setExtras = (value) => onChange((prev) => ({ ...prev, body: { ...prev.body, extras: value } }))

    const dateLabel = formatEventDateTime(body.hour, { state: address.state, timezone: body.timezone })
    const placeLabel = body.place_name
        || (address.street && address.number ? `${address.street} ${address.number}` : null)
    const regionLabel = !body.place_name && (address.state || address.country)
        ? [address.state, address.country].filter(Boolean).join(' ')
        : null

    return (
        <div
            ref={cardRef}
            className={`${styles.card} ${fullBleed ? styles.cardFull : ''} ${readOnly ? styles.cardReadOnly : ''}`}
            style={{ '--blur-color': themeColor, '--blur-color--dark': tint }}
            onClick={() => { if (!readOnly) onSelect(null) }}
        >

            {/* ── Hero ── */}
            <div className={cls('background', styles.hero)} onClick={pick('background')}>
                {body.image
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
            {!readOnly &&
                <div className={styles.topRow}>
                    <button className={cls('background', styles.chip)} onClick={pick('background')} data-tour='chip-background'>
                        <span className={styles.chipIcon}><ImagePlus size={13} /></span>
                        <span className={styles.chipLabel}>
                            {body.image ? t('side_events.canvas_change_image') : t('side_events.canvas_add_image')}
                        </span>
                    </button>

                    <button className={cls('color', styles.chip)} onClick={pick('color')} data-tour='chip-color'>
                        <span className={styles.chipSwatch} style={{ background: themeColor }} />
                        <span className={styles.chipLabel}>{t('side_events.theme_color')}</span>
                    </button>
                </div>
            }

            {/* ── Columna de info, encima del hero ── */}
            <div ref={scrollRef} className={`${styles.scrollArea} scroll-invitation`}>

                {/* Hueco transparente: deja ver el hero, y tocarlo también lo selecciona */}
                <div className={styles.heroGap} onClick={pick('background')} />

                <div
                    className={styles.infoCont}
                    style={padBottom ? { paddingBottom: padBottom + 24 } : undefined}
                >

                    {/* Título */}
                    <div className={cls('title', styles.titleZone)} data-zone='title' onClick={pick('title')}>
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
                            }}
                        >
                            {initialTitle}
                        </div>
                    </div>

                    {/* Fecha */}
                    <div className={cls('date', styles.col)} data-zone='date' onClick={pick('date')}>
                        {dateLabel
                            ? <span>{dateLabel}</span>
                            : <span className={styles.colMuted}>{t('side_events.datetime_label')}</span>
                        }
                    </div>

                    {/* Lugar */}
                    <div className={cls('place', styles.col)} data-zone='place' onClick={pick('place')}>
                        {placeLabel
                            ? <>
                                <span>{placeLabel}</span>
                                {regionLabel && <span>{regionLabel}</span>}
                            </>
                            : <span className={styles.colMuted}>{t('side_events.place_name_label')}</span>
                        }
                    </div>

                    {/* RSVP: maqueta de la píldora de la pieza */}
                    <div aria-hidden className={styles.buttonsCont}>
                        <span className={styles.mockBtn}>
                            <CircleCheck size={17} /> {t('side_events.canvas_rsvp_yes')}
                        </span>
                        <span className={styles.mockBtn}>
                            <CircleX size={17} /> {t('side_events.canvas_rsvp_no')}
                        </span>
                    </div>

                    {/* Notas */}
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
