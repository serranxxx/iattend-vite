import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pipette, Plus } from 'lucide-react'
import s from './ColoresIOS.module.css'

/*
  Selector de color al estilo del de iOS ("Colors"): cuentagotas, tres
  vistas (Cuadrícula · Espectro · Deslizadores, se recuerda la última), la
  opacidad (si el que lo abre la maneja: `opacity` / `onOpacity`) y una fila
  de colores guardados con "+" (localStorage, compartidos entre editores).
  Hoy lo usa el color del dibujo (ColorPopover con `target.ios`).
  `value`: hex (#RRGGBB); `onChange(hex, { snapshot })`.
*/

const VISTAS = ['grid', 'spectrum', 'sliders']
const CLAVE_VISTA = 'iattend_colores_vista'
const CLAVE_GUARDADOS = 'iattend_colores_guardados'
const MAX_GUARDADOS = 12

const acotar = (v, a, b) => Math.min(b, Math.max(a, v))
const hex2 = (n) => Math.round(acotar(n, 0, 255)).toString(16).padStart(2, '0').toUpperCase()
const aHex = ({ r, g, b }) => `#${hex2(r)}${hex2(g)}${hex2(b)}`
const deHex = (hex) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? ''))
    if (!m) return { r: 255, g: 255, b: 255 }
    const n = parseInt(m[1], 16)
    return { r: n >> 16, g: (n >> 8) & 255, b: n & 255 }
}
const hsl = (h, sat, l) => {
    const k = (n) => (n + h / 30) % 12
    const a = sat * Math.min(l, 1 - l)
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 }
}
const mezclar = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t })

// Cuadrícula: una fila de grises y 9 de 12 matices, de oscuro a claro.
const MATICES = [195, 220, 250, 275, 330, 2, 18, 32, 44, 56, 68, 100]
const LUCES = [0.16, 0.24, 0.33, 0.42, 0.5, 0.6, 0.7, 0.8, 0.9]
const GRISES = Array.from({ length: 12 }, (_, i) => aHex({ r: 255 - (255 * i) / 11, g: 255 - (255 * i) / 11, b: 255 - (255 * i) / 11 }))
const CUADRICULA = [GRISES, ...LUCES.map((l) => MATICES.map((h) => aHex(hsl(h, l > 0.75 ? 0.75 : 0.85, l))))]

// Espectro: el matiz de arriba abajo; a la izquierda se aclara, a la derecha se oscurece.
const colorDelEspectro = (x, y) => {
    const puro = hsl(y * 360, 1, 0.5)
    return x < 0.5 ? mezclar({ r: 255, g: 255, b: 255 }, puro, x / 0.5) : mezclar(puro, { r: 0, g: 0, b: 0 }, (x - 0.5) / 0.5)
}
// Lugar aproximado de un color en el espectro (para la perilla).
const lugarEnEspectro = (hex) => {
    const { r, g, b } = deHex(hex)
    const max = Math.max(r, g, b) / 255
    const min = Math.min(r, g, b) / 255
    const d = max - min
    let h = 0
    if (d) {
        if (max === r / 255) h = ((g - b) / 255 / d) % 6
        else if (max === g / 255) h = (b - r) / 255 / d + 2
        else h = (r - g) / 255 / d + 4
    }
    h = ((h * 60) + 360) % 360
    // Blancos a la izquierda (min alto), negros a la derecha (max bajo).
    const x = min > 0.02 ? 0.5 * (1 - min) : 0.5 + 0.5 * (1 - max)
    return { x: acotar(x, 0, 1), y: h / 360 }
}

// Arrastre en una caja: `alMover(x, y, primero)` con x / y en 0–1;
// `primero` solo en el primer punto (un arrastre = un paso de deshacer).
const useArrastre = (alMover) => {
    const ref = useRef(null)
    const primero = useRef(false)
    const mover = (e) => {
        const r = ref.current.getBoundingClientRect()
        alMover(acotar((e.clientX - r.left) / r.width, 0, 1), acotar((e.clientY - r.top) / r.height, 0, 1), primero.current)
        primero.current = false
    }
    return {
        ref,
        onPointerDown: (e) => {
            try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* puntero ya suelto */ }
            primero.current = true
            mover(e)
        },
        onPointerMove: (e) => { if (e.currentTarget.hasPointerCapture?.(e.pointerId)) mover(e) },
    }
}

// Barra deslizante con fondo de degradado y perilla del color.
const Barra = ({ fondo, k, colorPerilla, onK, etiqueta }) => {
    const arrastre = useArrastre((x, _y, primero) => onK(x, primero))
    return (
        <div {...arrastre} className={s.barra} style={{ background: fondo }} role="slider" aria-label={etiqueta} aria-valuenow={Math.round(k * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span className={s.perilla} style={{ left: `calc(20px + ${k} * (100% - 40px))` }}>
                <span style={{ background: colorPerilla }} />
            </span>
        </div>
    )
}

const Numero = ({ value, min, max, onChange, sufijo = '' }) => {
    const [texto, setTexto] = useState(null)
    return (
        <span className={s.numero}>
            <input
                value={texto ?? `${value}${sufijo}`}
                onFocus={(e) => { setTexto(String(value)); requestAnimationFrame(() => e.target.select()) }}
                onChange={(e) => setTexto(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                onBlur={() => { if (texto !== null && texto !== '') onChange(acotar(Number(texto), min, max)); setTexto(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                inputMode="numeric"
            />
        </span>
    )
}

// `className`: para cambiarle el ancho (en el drawer del celular va a lo
// ancho); `cabeza = false` quita el título (cuando ya hay uno arriba);
// `conGuardados = false` quita la fila de colores guardados.
export const ColoresIOS = ({ value, onChange, opacity = null, onOpacity = null, opacidadMin = 0, className = '', cabeza = true, conGuardados = true }) => {
    const { t } = useTranslation()
    const color = /^#[0-9a-f]{6}$/i.test(value ?? '') ? value.toUpperCase() : '#FFFFFF'
    const rgb = deHex(color)
    const [vista, setVista] = useState(() => {
        try { return VISTAS.includes(localStorage.getItem(CLAVE_VISTA)) ? localStorage.getItem(CLAVE_VISTA) : 'grid' } catch { return 'grid' }
    })
    const cambiarVista = (v) => { setVista(v); try { localStorage.setItem(CLAVE_VISTA, v) } catch { /* sin almacenamiento */ } }
    const [guardados, setGuardados] = useState(() => {
        try { return JSON.parse(localStorage.getItem(CLAVE_GUARDADOS) || '[]').filter((c) => /^#[0-9A-F]{6}$/i.test(c)) } catch { return [] }
    })
    const guardar = () => {
        const nuevos = [color, ...guardados.filter((c) => c !== color)].slice(0, MAX_GUARDADOS)
        setGuardados(nuevos)
        try { localStorage.setItem(CLAVE_GUARDADOS, JSON.stringify(nuevos)) } catch { /* sin almacenamiento */ }
    }
    // El espectro recuerda dónde se tocó (el color no dice el lugar exacto).
    const [puntoEspectro, setPuntoEspectro] = useState(null)
    useEffect(() => { setPuntoEspectro((p) => (p && aHex(colorDelEspectro(p.x, p.y)) === color ? p : null)) }, [color])
    const punto = puntoEspectro ?? lugarEnEspectro(color)
    const espectro = useArrastre((x, y, primero) => {
        setPuntoEspectro({ x, y })
        onChange(aHex(colorDelEspectro(x, y)), { snapshot: primero })
    })

    const [hex, setHex] = useState(null)
    const gotero = typeof window !== 'undefined' && 'EyeDropper' in window
    const usarGotero = async () => {
        try {
            const { sRGBHex } = await new window.EyeDropper().open()
            if (sRGBHex) onChange(sRGBHex.toUpperCase(), { snapshot: true })
        } catch { /* cancelado */ }
    }

    return (
        <div className={`${s.colores} ${className}`} data-text-bar>
            {cabeza && <div className={s.cabeza}>
                {gotero ? (
                    <button type="button" className={s.gotero} onClick={usarGotero} aria-label={t('build_editor.colors_eyedropper')} title={t('build_editor.colors_eyedropper')}>
                        <Pipette size={20} />
                    </button>
                ) : <span className={s.goteroHueco} />}
                <span className={s.titulo}>{t('build_editor.colors_title')}</span>
                <span className={s.goteroHueco} />
            </div>}

            {/* Sin encabezado (drawer del celular), el cuentagotas va a la
                izquierda de las pestañas. */}
            <div className={!cabeza && gotero ? s.filaSegmento : undefined} style={cabeza || !gotero ? { display: 'contents' } : undefined}>
                {!cabeza && gotero && (
                    <button type="button" className={`${s.gotero} ${s.goteroChico}`} onClick={usarGotero} aria-label={t('build_editor.colors_eyedropper')} title={t('build_editor.colors_eyedropper')}>
                        <Pipette size={18} />
                    </button>
                )}
                <div className={s.segmento} role="tablist" data-tema-propio>
                    {VISTAS.map((v) => (
                        <button key={v} type="button" role="tab" aria-selected={vista === v} className={s.segBtn} data-on={vista === v || undefined} onClick={() => cambiarVista(v)}>
                            {t(`build_editor.colors_${v}`)}
                        </button>
                    ))}
                </div>
            </div>

            {vista === 'grid' && (
                <div className={s.cuadricula} role="radiogroup" aria-label={t('build_editor.colors_grid')}>
                    {CUADRICULA.flat().map((c, i) => (
                        <button
                            key={i}
                            type="button"
                            role="radio"
                            aria-checked={c === color}
                            aria-label={c}
                            className={s.celda}
                            data-on={c === color || undefined}
                            style={{ background: c }}
                            onClick={() => onChange(c, { snapshot: true })}
                        />
                    ))}
                </div>
            )}

            {vista === 'spectrum' && (
                <div {...espectro} className={s.espectro} aria-label={t('build_editor.colors_spectrum')}>
                    <span className={s.espectroPerilla} style={{ left: `${punto.x * 100}%`, top: `${punto.y * 100}%`, background: color }} />
                </div>
            )}

            {vista === 'sliders' && (
                <div className={s.deslizadores}>
                    {[['r', 'red'], ['g', 'green'], ['b', 'blue']].map(([canal, nombre]) => {
                        const sin = aHex({ ...rgb, [canal]: 0 })
                        const con = aHex({ ...rgb, [canal]: 255 })
                        const poner = (n, primero) => onChange(aHex({ ...rgb, [canal]: n }), { snapshot: primero })
                        return (
                            <div key={canal} className={s.canal}>
                                <span className={s.etiqueta}>{t(`build_editor.colors_${nombre}`)}</span>
                                <div className={s.filaBarra}>
                                    <Barra fondo={`linear-gradient(to right, ${sin}, ${con})`} k={rgb[canal] / 255} colorPerilla={color} etiqueta={t(`build_editor.colors_${nombre}`)} onK={(k, primero) => poner(Math.round(k * 255), primero)} />
                                    <Numero value={rgb[canal]} min={0} max={255} onChange={(n) => poner(n, true)} />
                                </div>
                            </div>
                        )
                    })}
                    <div className={s.hexFila}>
                        <span className={s.hexEtiqueta}>{t('build_editor.colors_hex')}</span>
                        <span className={s.numero} data-ancho>
                            <input
                                value={hex ?? color.slice(1)}
                                onFocus={(e) => { setHex(color.slice(1)); requestAnimationFrame(() => e.target.select()) }}
                                onChange={(e) => setHex(e.target.value.replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase())}
                                onBlur={() => { if (hex && hex.length === 6) onChange(`#${hex}`, { snapshot: true }); setHex(null) }}
                                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                                spellCheck={false}
                            />
                        </span>
                    </div>
                </div>
            )}

            {onOpacity && opacity != null && (
                <div className={s.canal}>
                    <span className={s.etiqueta}>{t('build_editor.colors_opacity')}</span>
                    <div className={s.filaBarra}>
                        <Barra
                            fondo={`linear-gradient(to right, ${color}00, ${color})`}
                            k={(opacity - opacidadMin) / (100 - opacidadMin)}
                            colorPerilla={`${color}${hex2((opacity / 100) * 255)}`}
                            etiqueta={t('build_editor.colors_opacity')}
                            onK={(k) => onOpacity(Math.round(opacidadMin + k * (100 - opacidadMin)))}
                        />
                        <Numero value={opacity} min={opacidadMin} max={100} sufijo="%" onChange={onOpacity} />
                    </div>
                </div>
            )}

            {conGuardados && <span className={s.linea} />}

            {conGuardados && <div className={s.guardados}>
                {guardados.map((c) => (
                    <button key={c} type="button" className={s.guardado} data-on={c === color || undefined} style={{ background: c }} aria-label={c} title={c} onClick={() => onChange(c, { snapshot: true })} />
                ))}
                <button type="button" className={s.agregar} onClick={guardar} aria-label={t('build_editor.colors_save')} title={t('build_editor.colors_save')}>
                    <Plus size={20} />
                </button>
            </div>}
        </div>
    )
}
