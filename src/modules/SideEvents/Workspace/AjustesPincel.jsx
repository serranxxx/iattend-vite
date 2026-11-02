import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { PINCEL } from '../../Editor/dibujoData'
import s from './AjustesPincel.module.css'

/*
  Grosor y opacidad del pincel, como en Notas: cinco grosores (una "h" a
  mano de cada ancho) y una barra donde el color se difumina de transparente
  a sólido. Los usan la hoja de la paleta a pantalla completa (PaletaDibujo,
  al tocar el pincel elegido o "…") y el panel Dibujar del riel (DrawPanel,
  con `claseTitulo` para sus títulos). Con el borrador solo hay grosor.
*/

// Grosores de la hoja de ajustes (px, dentro del rango 2–40 del panel Dibujar).
const GROSORES = [2, 5, 9, 15, 24]
const OPACIDAD_MIN = 10
const cercano = (lista, v) => lista.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a))

// Trazo de muestra de cada grosor (una "h" a mano, como en Notas).
export const Garabato = ({ ancho }) => (
    <svg viewBox="0 0 44 36" aria-hidden>
        <path d="M6 30 C10 18 12 8 15 6 C17 5 15 24 14 30 C17 20 21 15 25 16 C29 17 26 27 30 29 C33 30 36 27 38 25" fill="none" stroke="currentColor" strokeWidth={ancho} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

// Barra de opacidad: del color transparente al color sólido, con su perilla.
export const BarraOpacidad = ({ color, value, onChange, label }) => {
    const ref = useRef(null)
    const desde = (e) => {
        const r = ref.current.getBoundingClientRect()
        const k = Math.min(1, Math.max(0, (e.clientX - r.left - 20) / (r.width - 40)))
        onChange(Math.round(OPACIDAD_MIN + k * (100 - OPACIDAD_MIN)))
    }
    const k = (value - OPACIDAD_MIN) / (100 - OPACIDAD_MIN)
    const tecla = (e) => {
        const paso = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 5 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -5 : 0
        if (!paso) return
        e.preventDefault()
        onChange(Math.min(100, Math.max(OPACIDAD_MIN, value + paso)))
    }
    return (
        <div
            ref={ref}
            className={s.opacidad}
            style={{ '--c': color }}
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={OPACIDAD_MIN}
            aria-valuemax={100}
            aria-valuenow={value}
            onKeyDown={tecla}
            onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* puntero ya suelto */ } desde(e) }}
            onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) desde(e) }}
        >
            <span className={s.opacidadPerilla} style={{ left: `calc(20px + ${k} * (100% - 40px))`, opacity: 1 }}>
                <span style={{ opacity: value / 100 }} />
            </span>
        </div>
    )
}


export const AjustesPincel = ({ pincel, setPincel, claseTitulo = null }) => {
    const { t } = useTranslation()
    const borrador = PINCEL[pincel.brush]?.borra
    const cambiar = (patch) => setPincel((p) => ({ ...p, ...patch }))
    const actual = cercano(GROSORES, pincel.size)
    return (
        <div className={s.ajustes}>
            {claseTitulo && <span className={claseTitulo}>{t('side_events.draw_size')}</span>}
            <div className={s.grosores} role="radiogroup" aria-label={t('side_events.draw_size')}>
                {GROSORES.map((g) => (
                    <button
                        key={g}
                        type="button"
                        role="radio"
                        aria-checked={actual === g}
                        aria-label={`${t('side_events.draw_size')} ${g} px`}
                        className={s.grosor}
                        data-on={actual === g || undefined}
                        onClick={() => cambiar({ size: g })}
                    >
                        <Garabato ancho={Math.max(1.6, g * 0.36)} />
                    </button>
                ))}
            </div>
            {!borrador && (
                <>
                    {claseTitulo && <span className={claseTitulo}>{t('side_events.draw_opacity')}</span>}
                    <BarraOpacidad
                        color={pincel.color}
                        value={pincel.opacity}
                        label={t('side_events.draw_opacity')}
                        onChange={(v) => cambiar({ opacity: v })}
                    />
                </>
            )}
        </div>
    )
}
