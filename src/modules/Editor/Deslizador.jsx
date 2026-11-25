import { useRef } from 'react'
import s from './Deslizador.module.css'

/*
  Slider de I attend, con el formato de la opacidad de los pinceles
  (AjustesPincel → BarraOpacidad): una barra alta y redonda donde el color va
  de transparente a sólido, y una perilla blanca con el color de donde está.
  Reemplaza al Slider de antd en todo el editor (web y celular) con los
  mismos props, así se cambia solo el import:
    value, min, max, step, onChange(v), onChangeComplete(v) (o onAfterChange),
    disabled, vertical, className, style, aria-label.
  `color`: el del degradado (sin él, el azul de la marca). `tooltip` y demás
  props de antd se ignoran.
*/

const MARCA = '#1C3249'

const decimales = (step) => {
    const t = String(step)
    return t.includes('.') ? t.split('.')[1].length : 0
}

export const Deslizador = ({
    value,
    defaultValue,
    min = 0,
    max = 100,
    step = 1,
    onChange,
    onChangeComplete,
    onAfterChange,
    disabled = false,
    vertical = false,
    color = MARCA,
    className = '',
    style,
    'aria-label': ariaLabel,
}) => {
    const ref = useRef(null)
    const ultimo = useRef(null)
    const v = Number.isFinite(Number(value)) ? Number(value) : Number(defaultValue ?? min)
    const rango = max - min || 1
    const k = Math.min(1, Math.max(0, (v - min) / rango))

    const ajustar = (n) => {
        const paso = step > 0 ? Math.round((n - min) / step) * step + min : n
        return Number(Math.min(max, Math.max(min, paso)).toFixed(decimales(step)))
    }
    const poner = (n) => {
        const nuevo = ajustar(n)
        ultimo.current = nuevo
        if (nuevo !== v) onChange?.(nuevo)
    }
    const terminar = () => {
        const final = ultimo.current ?? v
        onChangeComplete?.(final)
        onAfterChange?.(final)
        ultimo.current = null
    }
    const desde = (e) => {
        const r = ref.current.getBoundingClientRect()
        // La perilla nunca sale de la barra: se recorre de 20 px a 20 px antes del final.
        const f = vertical
            ? 1 - (e.clientY - r.top - 20) / Math.max(1, r.height - 40)
            : (e.clientX - r.left - 20) / Math.max(1, r.width - 40)
        poner(min + Math.min(1, Math.max(0, f)) * rango)
    }
    const tecla = (e) => {
        if (disabled) return
        const grande = (e.shiftKey ? 10 : 1) * step
        const mapa = { ArrowRight: grande, ArrowUp: grande, ArrowLeft: -grande, ArrowDown: -grande, PageUp: step * 10, PageDown: -step * 10 }
        if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault()
            poner(e.key === 'Home' ? min : max)
            terminar()
            return
        }
        if (!(e.key in mapa)) return
        e.preventDefault()
        poner(v + mapa[e.key])
        terminar()
    }
    const lugar = `calc(20px + ${k} * (100% - 40px))`
    return (
        <div
            ref={ref}
            className={`${s.barra} ${vertical ? s.vertical : ''} ${className}`}
            style={{ ...style, '--c': color, '--k': `${Math.round(k * 100)}%` }}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label={ariaLabel}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={v}
            aria-orientation={vertical ? 'vertical' : 'horizontal'}
            aria-disabled={disabled || undefined}
            data-disabled={disabled || undefined}
            onKeyDown={tecla}
            onPointerDown={(e) => {
                if (disabled || e.button > 0) return
                e.stopPropagation()
                try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* puntero ya suelto */ }
                desde(e)
            }}
            onPointerMove={(e) => { if (!disabled && e.currentTarget.hasPointerCapture?.(e.pointerId)) desde(e) }}
            onPointerUp={(e) => { if (!disabled && e.currentTarget.hasPointerCapture?.(e.pointerId)) terminar() }}
            onPointerCancel={() => { if (ultimo.current !== null) terminar() }}
        >
            <span className={s.perilla} style={vertical ? { top: `calc(100% - ${lugar})` } : { left: lugar }}>
                <span />
            </span>
        </div>
    )
}

export default Deslizador
