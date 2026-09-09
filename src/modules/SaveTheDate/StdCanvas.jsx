import React, { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ImagePlus, Music2, Video } from 'lucide-react'
import styles from './StdCanvas.module.css'

/**
 * Lienzo editable del Save the Date.
 *
 * No es la pieza pública calcada (eso es "Ver en vivo", que monta el remoto de
 * iattend-events): es la tarjeta de edición —fondo real + tarjetas
 * translúcidas apiladas— donde cada zona se toca para editarla y el título se
 * escribe directo encima.
 */

const isVideoUrl = (url) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)

const toArray = (src) => {
    if (!src) return []
    if (typeof src === 'string') return src.trim() ? [src] : []
    if (Array.isArray(src)) return src.filter((s) => typeof s === 'string' && s.trim())
    return []
}

const UNITS = [
    ['days', 'días'],
    ['hours', 'horas'],
    ['minutes', 'minutos'],
    ['seconds', 'segundos'],
]

const ZERO = { days: 0, hours: 0, minutes: 0, seconds: 0 }

// Fechas absolutas: solo YYYY-MM-DD anclado a la medianoche de CDMX (UTC-6,
// sin DST), igual que el countdown de events.
const parseDateOnly = (value) => {
    const ymd = String(value ?? '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
    const d = new Date(`${ymd}T00:00:00-06:00`)
    return isNaN(+d) ? null : d
}

const formatDate = (value) => {
    const ymd = String(value ?? '').slice(0, 10)
    const [y, m, d] = ymd.split('-').map(Number)
    if (!y || !m || !d) return ''
    return new Date(Date.UTC(y, m - 1, d))
        .toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

const diffToTimeLeft = (target) => {
    const total = Math.floor(Math.max(0, +target - Date.now()) / 1000)
    return {
        days: Math.floor(total / 86400),
        hours: Math.floor((total % 86400) / 3600),
        minutes: Math.floor((total % 3600) / 60),
        seconds: total % 60,
    }
}

const pad = (n) => String(n).padStart(2, '0')

// Mismo recipe de liquid glass que el CTA de la pieza: efecto (blur + filtro de
// desplazamiento aislado), tinte del color elegido y brillo interior.
const GLASS_EFECTO = {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    borderRadius: 'inherit',
    backdropFilter: 'blur(1.5px)',
    WebkitBackdropFilter: 'blur(1.5px)',
    filter: 'url(#std-liquido)',
    isolation: 'isolate',
    pointerEvents: 'none',
}

const GLASS_BRILLO = {
    position: 'absolute',
    inset: 0,
    zIndex: 2,
    borderRadius: 'inherit',
    overflow: 'hidden',
    boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.75), inset 0 0 5px rgba(255,255,255,0.75)',
    pointerEvents: 'none',
}

const glassTinte = (color) => ({
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    borderRadius: 'inherit',
    background: color,
    pointerEvents: 'none',
})

export const StdCanvas = ({
    cover,
    eventDate,
    selected,
    onSelect,
    onTitleInput,
    readOnly = false,
    fullBleed = false,   // móvil: la pieza ocupa toda la pantalla
    liftBottom = 0,      // móvil: cuánto sube el contenido para librar la hoja
}) => {

    // El título se escribe directo aquí: el DOM manda mientras se teclea (si
    // React reescribiera el texto, el caret saltaría al final). Por eso el
    // valor inicial se congela y la página monta el lienzo con key={std.id}.
    const [initialTitle] = useState(() => cover?.title?.text?.value ?? '')

    const media = toArray(cover?.image?.prod)
    const isCarousel = media.length > 1
    const [activeIdx, setActiveIdx] = useState(0)

    useEffect(() => {
        if (activeIdx >= media.length && media.length > 0) setActiveIdx(0)
    }, [media.length, activeIdx])

    useEffect(() => {
        if (!isCarousel) return
        const id = setInterval(() => setActiveIdx((i) => (i + 1) % media.length), 4500)
        return () => clearInterval(id)
    }, [isCarousel, media.length])

    const rawDate = eventDate ?? cover?.date?.value
    const target = useMemo(() => parseDateOnly(rawDate), [rawDate])
    const [timeLeft, setTimeLeft] = useState(ZERO)

    useEffect(() => {
        if (!target) return setTimeLeft(ZERO)
        const tick = () => setTimeLeft(diffToTimeLeft(target))
        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [target])

    // En Respuestas la tarjeta solo se ve: no se selecciona ni se escribe.
    const pick = (section) => (e) => {
        if (readOnly) return
        e.stopPropagation()
        onSelect(section)
    }

    const cls = (section, base) => (readOnly
        ? base
        : `${base} ${styles.pickable} ${selected === section ? styles.picked : ''}`)

    const titleText = cover?.title?.text ?? {}
    const dateColor = cover?.date?.color ?? '#FFFFFF'
    const countdownFont = cover?.date?.typeFace ?? 'Poppins'
    const btnColor = cover?.button?.color ?? 'rgba(74, 113, 145, 0.5)'
    const song = cover?.song

    return (
        <div
            className={`${styles.card} ${fullBleed ? styles.cardFull : ''} ${readOnly ? styles.cardReadOnly : ''}`}
            onClick={() => { if (!readOnly) onSelect(null) }}
        >

            {/* Filtro de desplazamiento del liquid glass */}
            <svg aria-hidden width='0' height='0' style={{ position: 'absolute' }}>
                <defs>
                    <filter id='std-liquido' x='0%' y='0%' width='100%' height='100%' colorInterpolationFilters='sRGB'>
                        <feTurbulence type='fractalNoise' baseFrequency='0.008 0.008' numOctaves={2} seed={92} result='ruido' />
                        <feGaussianBlur in='ruido' stdDeviation='2' result='ruidoSuave' />
                        <feDisplacementMap in='SourceGraphic' in2='ruidoSuave' scale={70} xChannelSelector='R' yChannelSelector='G' />
                    </filter>
                </defs>
            </svg>

            {/* ── Fondo ── */}
            <div
                className={cls('background', styles.bgLayer)}
                onClick={pick('background')}
                style={{ filter: cover?.image?.blur && !cover?.image?.background ? 'blur(6px)' : undefined }}
            >
                {media.length > 0
                    ? media.map((src, i) => (
                        <div key={src + i} className={styles.slide} style={{ opacity: i === activeIdx ? 1 : 0 }}>
                            {isVideoUrl(src)
                                ? <video src={src} autoPlay muted loop playsInline className={styles.mediaFill} />
                                : <img src={src} alt='' className={styles.mediaFill} />
                            }
                        </div>
                    ))
                    : <div className={styles.bgPlaceholder} />
                }
            </div>

            {/* Degradado inferior: da contraste a las tarjetas y replica "oscurecer fondo" */}
            <div aria-hidden className={`${styles.scrim} ${cover?.image?.background ? styles.scrimStrong : ''}`} />

            {/* ── Fila superior: canción a la izquierda, CTA a la derecha ──
                Con la hoja de ajustes muy alta el contenido sube tanto que
                choca con esta fila, así que se difumina mientras tanto. */}
            <div className={`${styles.topRow} ${liftBottom > 200 ? styles.topRowHidden : ''}`}>
                <button className={cls('song', styles.chip)} onClick={pick('song')}>
                    {song?.albumArt
                        ? <img src={song.albumArt} alt='' className={styles.chipArt} />
                        : <span className={styles.chipIcon}><Music2 size={13} /></span>
                    }
                    <span className={styles.chipLabel}>{song?.name ?? 'Añadir canción'}</span>
                </button>

                <div className={cls('button', styles.ctaDock)} onClick={pick('button')}>
                    <span className={styles.glassWrap}>
                        <span aria-hidden style={GLASS_EFECTO} />
                        <span aria-hidden style={glassTinte(btnColor)} />
                        <span aria-hidden style={GLASS_BRILLO} />
                        <span className={styles.ctaLabel}>Save the date</span>
                    </span>
                </div>
            </div>

            {/* ── Contenido editable ── */}
            <div
                className={styles.content}
                style={liftBottom ? { transform: `translateY(-${liftBottom}px)` } : undefined}
            >

                <button className={cls('background', styles.bgBtn)} onClick={pick('background')}>
                    {media.some(isVideoUrl) ? <Video size={14} /> : <ImagePlus size={14} />}
                    <span>{media.length > 0 ? 'Cambiar fondo' : 'Añadir fondo'}</span>
                </button>

                <div className={cls('date', styles.countdown)} onClick={pick('date')}>
                    {UNITS.map(([key, label]) => (
                        <div key={key} className={styles.cdCol}>
                            <span className={styles.cdValue} style={{ color: dateColor, fontFamily: countdownFont }}>
                                {key === 'days' ? timeLeft[key] : pad(timeLeft[key])}
                            </span>
                            <span className={styles.cdUnit} style={{ color: dateColor }}>{label}</span>
                        </div>
                    ))}
                </div>

                <div className={styles.group}>
                    <div className={cls('title', styles.titleRow)} onClick={pick('title')}>
                        <div
                            className={styles.titleInput}
                            contentEditable={!readOnly}
                            suppressContentEditableWarning
                            spellCheck={false}
                            data-placeholder='Nombre del evento'
                            onInput={(e) => onTitleInput(e.currentTarget.textContent)}
                            style={{
                                color: titleText.color ?? '#FFFFFF',
                                textAlign: cover?.title?.position?.align_x ?? 'center',
                                fontSize: `${titleText.size ?? 42}px`,
                                opacity: titleText.opacity ?? 1,
                                fontFamily: titleText.typeFace,
                                fontWeight: titleText.weight ?? 600,
                            }}
                        >
                            {initialTitle}
                        </div>
                    </div>

                    <div className={cls('date', styles.row)} onClick={pick('date')}>
                        <CalendarDays size={15} />
                        <span className={styles.rowLabel}>{rawDate ? formatDate(rawDate) : 'Añadir fecha'}</span>
                    </div>
                </div>

                {isCarousel && (
                    <div className={styles.dots}>
                        {media.map((_, i) => (
                            <button
                                key={i}
                                className={`${styles.dot} ${i === activeIdx ? styles.dotActive : ''}`}
                                onClick={(e) => { e.stopPropagation(); setActiveIdx(i) }}
                                aria-label={`Imagen ${i + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default StdCanvas
