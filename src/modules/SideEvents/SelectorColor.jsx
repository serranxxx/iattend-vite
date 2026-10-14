import { useEffect, useRef, useState } from 'react'
import styles from './SelectorColor.module.css'

/*
  Selector de color en línea (panel "Color del tema" de los side events): cuadro
  de saturación/brillo, barra de tono y campo hex, siempre visibles. Sustituye
  al cuadrito que abría el popup de antd, que casi no se veía. Funciona con
  mouse y con el dedo (pointer events), así que sirve igual en la hoja móvil.
*/

const limitar = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v))

const hexAHsv = (hex) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? '').trim())
    if (!m) return { h: 0, s: 0, v: 0 }
    const n = parseInt(m[1], 16)
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
    let h = 0
    if (d) {
        if (max === r) h = ((g - b) / d) % 6
        else if (max === g) h = (b - r) / d + 2
        else h = (r - g) / d + 4
        h *= 60
        if (h < 0) h += 360
    }
    return { h, s: max ? d / max : 0, v: max }
}

const hsvAHex = ({ h, s, v }) => {
    const f = (n) => {
        const k = (n + h / 60) % 6
        return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
    }
    return `#${[f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`
}

// Arrastrar dentro de un elemento: llama `alMover(x, y)` en 0..1.
const usarArrastre = (alMover) => (e) => {
    const el = e.currentTarget
    const mover = (ev) => {
        const r = el.getBoundingClientRect()
        alMover(limitar((ev.clientX - r.left) / r.width), limitar((ev.clientY - r.top) / r.height))
    }
    el.setPointerCapture?.(e.pointerId)
    mover(e)
    const soltar = () => {
        el.removeEventListener('pointermove', mover)
        el.removeEventListener('pointerup', soltar)
        el.removeEventListener('pointercancel', soltar)
    }
    el.addEventListener('pointermove', mover)
    el.addEventListener('pointerup', soltar)
    el.addEventListener('pointercancel', soltar)
}

export const SelectorColor = ({ value, onChange }) => {
    // El tono se guarda aparte: en grises (s = 0) el hex no lo conserva y la
    // barra brincaría a rojo.
    const [hsv, setHsv] = useState(() => hexAHsv(value))
    const [texto, setTexto] = useState(value ?? '#000000')
    const ultimo = useRef(value)

    // Si el color cambia desde fuera (una muestra, deshacer), se sincroniza.
    useEffect(() => {
        if (value && value.toLowerCase() !== String(ultimo.current ?? '').toLowerCase()) {
            const nuevo = hexAHsv(value)
            setHsv(prev => (nuevo.s === 0 ? { ...nuevo, h: prev.h } : nuevo))
            setTexto(value)
            ultimo.current = value
        }
    }, [value])

    const emitir = (siguiente) => {
        setHsv(siguiente)
        const hex = hsvAHex(siguiente)
        ultimo.current = hex
        setTexto(hex)
        onChange(hex)
    }

    const hexTono = hsvAHex({ h: hsv.h, s: 1, v: 1 })

    return (
        <div className={styles.selector}>
            <div
                className={styles.area}
                style={{ background: hexTono }}
                onPointerDown={(e) => usarArrastre((x, y) => emitir({ ...hsv, s: x, v: 1 - y }))(e)}
            >
                <div className={styles.areaBlanco} />
                <div className={styles.areaNegro} />
                <span
                    className={styles.cursor}
                    style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hsvAHex(hsv) }}
                />
            </div>

            <div
                className={styles.tono}
                onPointerDown={(e) => usarArrastre((x) => emitir({ ...hsv, h: Math.round(x * 360) % 360 }))(e)}
            >
                <span className={styles.tonoCursor} style={{ left: `${(hsv.h / 360) * 100}%`, background: hexTono }} />
            </div>

            <div className={styles.fila}>
                <span className={styles.muestra} style={{ background: hsvAHex(hsv) }} />
                <input
                    className={styles.hex}
                    value={texto}
                    spellCheck={false}
                    maxLength={7}
                    onChange={(e) => {
                        const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
                        setTexto(v)
                        if (/^#[0-9a-f]{6}$/i.test(v)) {
                            ultimo.current = v
                            setHsv(prev => {
                                const nuevo = hexAHsv(v)
                                return nuevo.s === 0 ? { ...nuevo, h: prev.h } : nuevo
                            })
                            onChange(v.toLowerCase())
                        }
                    }}
                    aria-label='Hex'
                />
            </div>
        </div>
    )
}
