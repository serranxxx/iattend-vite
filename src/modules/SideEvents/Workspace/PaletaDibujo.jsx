import { useLayoutEffect, useRef, useState } from 'react'
import { Popover, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import { Redo2, Trash2, Undo2 } from 'lucide-react'
import { PINCEL, PINCELES } from '../../Editor/dibujoData'
import { AjustesPincel } from './AjustesPincel'
import s from './PaletaDibujo.module.css'

/*
  Paleta del modo dibujo a pantalla completa (SideWorkspace → EditorShell
  `lateral`), al estilo de la de Notas en iPad: deshacer / rehacer, los
  pinceles dibujados como plumas (el elegido sale un poco), los colores (el
  del tema, los de siempre y "otro" con el selector de color). Tocar el
  pincel que ya está elegido abre junto a él el grosor y la opacidad (como en
  Notas: AjustesPincel). Usa el mismo pincel que el panel Dibujar
  (`pincel` / `setPincel`, se recuerda en la sesión del editor).
  `horizontal` (modo dibujo del celular, EditorMovil): una barra abajo con
  las plumas paradas (punta arriba; caben cinco, el resto con scroll) y
  solo el botón de color (abre el selector a pantalla completa); deshacer y
  rehacer van en el header.
  `activo = false`: sin pincel (se soltó tocando fuera de la pieza en el
  tablero de pantalla completa): ninguna pluma sale; tocar una la toma
  (`onActivar`).
  Selección (como el lazo de Freeform): con `onSeleccionar`, una pluma más
  al final. Con ella tomada (`seleccionando`) se eligen y mueven los
  trazos; con un pincel de dibujo, nunca. Con trazos elegidos aparece
  "Eliminar" (`onEliminar`).
*/

// Con pantalla táctil (iPad) sin tooltips en las plumas: con un toque se
// quedaban pegados encima del tablero.
const TACTIL = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches)

const COLORES = ['#FFFFFF', '#29262D', '#FFC93C', '#FF5A5F', '#4C8BF5', '#3DDC97']
// Punta de cada pincel (la pluma apunta a la izquierda; el cuerpo sigue a la
// derecha y lo corta la orilla de la paleta).
const Punta = ({ id, color }) => {
    switch (id) {
        case 'pluma':
            return (
                <>
                    <path className={s.cono} d="M44 13 L14 19 Q12 20 14 21 L44 27 Z" fill="url(#metal)" />
                    <circle cx="13" cy="20" r="1.6" fill="#2A2A2E" />
                </>
            )
        case 'marcador':
            return (
                <>
                    <path className={s.cono} d="M44 12 L30 15 L30 25 L44 28 Z" fill="#F4F4F6" stroke="#E2E2E6" />
                    <path d="M30 16 L18 18 L18 22 L30 24 Z" fill={color} />
                </>
            )
        case 'resaltador':
            return (
                <>
                    <path className={s.cono} d="M44 11 L30 14 L30 26 L44 29 Z" fill="#F4F4F6" stroke="#E2E2E6" />
                    <path d="M30 14 L18 16 L22 26 L30 26 Z" fill={color} opacity="0.85" />
                </>
            )
        case 'lapiz':
            return (
                <>
                    <path className={s.madera} d="M44 12 L20 20 L44 28 Z" fill="#EBCFA6" />
                    <path d="M22 19.3 L14 20 L22 20.7 Z" fill={color} stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
                </>
            )
        case 'neon':
            return (
                <>
                    <path className={s.cono} d="M44 13 L22 18 L22 22 L44 27 Z" fill="#F4F4F6" stroke="#E2E2E6" />
                    <rect x="12" y="18" width="11" height="4" rx="2" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
                </>
            )
        case 'borrador':
            return <rect className={s.goma} x="12" y="11" width="34" height="18" rx="5" fill="#E9A3A0" />
        case 'seleccion':
            return (
                <>
                    <path className={s.cono} d="M44 13 L26 18 L26 22 L44 27 Z" fill="#F4F4F6" stroke="#E2E2E6" />
                    <ellipse cx="17" cy="20" rx="8" ry="6" fill="none" stroke="#29262D" strokeWidth="1.8" strokeDasharray="3 2.4" />
                </>
            )
        default:
            return null
    }
}

// Partes con clase (cono, madera, goma, barril, bandas): el editor de Pops
// las pinta según su estilo (Pop · Business · Craft) desde el CSS; sin estilo
// (I attend) quedan los colores de aquí. `bandaPunta` solo se ve con estilo.
const Pluma = ({ id, color, on }) => (
    <svg viewBox="0 0 150 40" className={s.pluma} data-on={on || undefined} data-brush={id} aria-hidden>
        <defs>
            <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#D9D9DE" />
                <stop offset="0.5" stopColor="#A9A9B0" />
                <stop offset="1" stopColor="#CFCFD4" />
            </linearGradient>
            <linearGradient id="cuerpo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#FFFFFF" />
                <stop offset="1" stopColor="#ECECEF" />
            </linearGradient>
        </defs>
        <Punta id={id} color={color} />
        <rect className={s.barril} x="44" y="9" width="110" height="22" rx="3" fill="url(#cuerpo)" stroke="#E4E4E8" />
        {id !== 'borrador' && id !== 'seleccion' && <rect className={s.banda} x="86" y="9" width="6" height="22" fill={color} stroke="rgba(0,0,0,0.08)" />}
        {id !== 'borrador' && id !== 'seleccion' && <rect className={s.bandaPunta} x="52" y="9" width="6" height="22" fill={color} />}
    </svg>
)

export const PaletaDibujo = ({ pincel, setPincel, temaColor, onDeshacer, onRehacer, puedeDeshacer, puedeRehacer, onOtroColor, horizontal = false, activo = true, onActivar, seleccionando = false, onSeleccionar, onEliminar }) => {
    const { t } = useTranslation()
    const borrador = PINCEL[pincel.brush]?.borra
    // Con la selección tomada ninguna pluma de dibujo sale.
    const tomado = activo && !seleccionando
    const colores = [...new Set([temaColor, ...COLORES].filter(Boolean).map((c) => c.toUpperCase()))].slice(0, 7)
    const actual = String(pincel.color).toUpperCase()
    // En la barra del celular el botón de color siempre enseña el color actual.
    const otro = horizontal || !colores.includes(actual)
    const cambiar = (patch) => setPincel((p) => ({ ...p, ...patch }))
    const tinta = borrador ? '#C9C5CE' : pincel.color

    // Etiqueta con el nombre de la herramienta activa, a la izquierda de la
    // paleta y a la altura de su fila (handoff "Pinceles"). Solo se ve en el
    // editor de Pops con estilo (CSS); se mide con la fila y el scroll.
    const paletaRef = useRef(null)
    const plumasRef = useRef(null)
    const activaId = seleccionando ? 'seleccion' : (tomado ? pincel.brush : null)
    const [etiquetaTop, setEtiquetaTop] = useState(null)
    useLayoutEffect(() => {
        if (horizontal) return undefined
        const medir = () => {
            const fila = plumasRef.current?.querySelector('[role="radio"][aria-checked="true"]')
            const paleta = paletaRef.current
            if (!fila || !paleta) { setEtiquetaTop(null); return }
            const a = fila.getBoundingClientRect()
            const b = paleta.getBoundingClientRect()
            const visible = a.bottom > b.top && a.top < b.bottom
            setEtiquetaTop(visible ? a.top - b.top + a.height / 2 : null)
        }
        medir()
        const lista = plumasRef.current
        lista?.addEventListener('scroll', medir, { passive: true })
        return () => lista?.removeEventListener('scroll', medir)
    }, [activaId, horizontal])

    // Hoja de ajustes del pincel: abierta junto al pincel elegido (al tocarlo
    // otra vez).
    const [abierta, setAbierta] = useState(null)
    const ajustes = (
        <div className={s.ajustes} data-edit-keep data-ajustes-pincel>
            <AjustesPincel pincel={pincel} setPincel={setPincel} />
        </div>
    )
    const hoja = (id, placement, boton) => (
        <Popover
            key={id}
            content={ajustes}
            open={abierta === id}
            onOpenChange={(v) => { if (!v) setAbierta(null) }}
            trigger="click"
            placement={placement}
            arrow={false}
            zIndex={1300}
            rootClassName={s.hojaRoot}
        >
            {boton}
        </Popover>
    )

    return (
        <div ref={paletaRef} className={s.paleta} data-edit-keep data-paleta-dibujo data-horizontal={horizontal || undefined}>
            {!horizontal && activaId && etiquetaTop != null && (
                <span className={s.etiqueta} style={{ top: etiquetaTop }} aria-hidden>
                    {t(activaId === 'seleccion' ? 'side_events.draw_select' : `side_events.draw_brush_${activaId}`)}
                </span>
            )}
            {!horizontal && <div className={s.historial}>
                <Tooltip title={t('side_events.draw_undo')} placement="left">
                    <button type="button" className={s.circulo} disabled={!puedeDeshacer} onClick={onDeshacer} aria-label={t('side_events.draw_undo')}>
                        <Undo2 size={18} strokeWidth={2.4} />
                    </button>
                </Tooltip>
                <Tooltip title={t('build_editor.redo')} placement="left">
                    <button type="button" className={s.circulo} disabled={!puedeRehacer} onClick={onRehacer} aria-label={t('build_editor.redo')}>
                        <Redo2 size={18} strokeWidth={2.4} />
                    </button>
                </Tooltip>
                {onEliminar && (
                    <Tooltip title={t('side_events.draw_delete_selection')} placement="left">
                        <button type="button" className={`${s.circulo} ${s.eliminar}`} onClick={onEliminar} aria-label={t('side_events.draw_delete_selection')}>
                            <Trash2 size={17} strokeWidth={2.2} />
                        </button>
                    </Tooltip>
                )}
            </div>}

            <div ref={plumasRef} className={s.plumas} role="radiogroup" aria-label={t('side_events.draw_brush')}>
                {PINCELES.map((p) => hoja(p.id, horizontal ? 'top' : 'left', (
                    <span className={s.plumaHueco}>
                        <Tooltip title={abierta || horizontal || TACTIL ? null : t(`side_events.draw_brush_${p.id}`)} placement="left">
                            <button
                                type="button"
                                role="radio"
                                aria-checked={tomado && pincel.brush === p.id}
                                aria-label={t(`side_events.draw_brush_${p.id}`)}
                                className={s.plumaBtn}
                                onClick={() => {
                                    // Sin pincel (se soltó tocando fuera de la pieza): tocar uno lo toma.
                                    if (!tomado) { cambiar({ brush: p.id }); onActivar?.(); setAbierta(null); return }
                                    // El elegido abre (o cierra) sus ajustes; otro solo se elige.
                                    if (pincel.brush === p.id) setAbierta((a) => (a === p.id ? null : p.id))
                                    else { cambiar({ brush: p.id }); setAbierta(null) }
                                }}
                            >
                                <Pluma id={p.id} color={tinta === '#C9C5CE' ? '#29262D' : pincel.color} on={tomado && pincel.brush === p.id} />
                            </button>
                        </Tooltip>
                    </span>
                )))}
                {onSeleccionar && (
                    <span className={s.plumaHueco}>
                        <Tooltip title={horizontal || TACTIL ? null : t('side_events.draw_select')} placement="left">
                            <button
                                type="button"
                                role="radio"
                                aria-checked={seleccionando}
                                aria-label={t('side_events.draw_select')}
                                className={s.plumaBtn}
                                onClick={() => { setAbierta(null); onSeleccionar() }}
                            >
                                <Pluma id="seleccion" on={seleccionando} />
                            </button>
                        </Tooltip>
                    </span>
                )}
            </div>

            <div className={s.colores} data-off={borrador || undefined} role="radiogroup" aria-label={t('side_events.draw_color')}>
                {!horizontal && colores.map((c) => (
                    <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={actual === c}
                        className={s.color}
                        data-on={(!borrador && actual === c) || undefined}
                        style={{ '--c': c }}
                        disabled={borrador}
                        title={c === String(temaColor).toUpperCase() ? t('side_events.draw_theme_color') : c}
                        aria-label={c === String(temaColor).toUpperCase() ? t('side_events.draw_theme_color') : c}
                        onClick={() => cambiar({ color: c })}
                    />
                ))}
                <button
                    type="button"
                    className={`${s.color} ${s.otro}`}
                    data-on={(!borrador && otro) || undefined}
                    style={otro ? { '--c': pincel.color } : undefined}
                    disabled={borrador}
                    title={t('side_events.draw_other_color')}
                    aria-label={t('side_events.draw_other_color')}
                    onClick={onOtroColor}
                />
            </div>

        </div>
    )
}
