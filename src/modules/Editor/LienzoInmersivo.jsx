import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tooltip } from 'antd'
import { Crosshair, Hand, Minus, Plus } from 'lucide-react'
import ws from '../Invitation/Build/PageSections/EditorWorkspace.module.css'
import { INMERSIVO_EASE, INMERSIVO_MS, reducirMovimiento } from './inmersivo'

/*
  Tablero del modo inmersivo de EditorShell (dibujo a pantalla completa): la
  pieza se acerca, se aleja y se mueve por la pantalla como el acomodo de
  mesas (TablesPage):
  · ⌘/Ctrl + rueda (o pellizco del trackpad) → zoom hacia el cursor.
  · Rueda sobre la pieza → el scroll de la pieza (la invitación se recorre);
    fuera de la pieza → mueve el tablero.
  · Arrastrar el fondo, o con la mano (botón o barra espaciadora sostenida)
    arrastrar en cualquier lado, también sobre la pieza → mueve el tablero.
    Con la mano no se dibuja: una capa encima toma el puntero.
  · Abajo: −, %, +, mano y centrar.
  `area`: márgenes que no tapa la pieza al centrarla (barra arriba, paleta a
  la derecha).
  Transición: al montarse la pieza viaja desde `desde` (ref con su recuadro
  en el tablero normal) a su lugar; al desmontarse deja el suyo en
  `rectSalida` para que EditorShell la regrese.
*/

const MIN = 0.3
const MAX = 3
const PASO = 0.15
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const escribiendo = (el) => el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable

export const LienzoInmersivo = ({ canvas, card, zoomInicial, area, desde, rectSalida }) => {
    const { t } = useTranslation()
    const stageRef = useRef(null)
    const piezaRef = useRef(null)
    const refPieza = useCallback((el) => {
        piezaRef.current = el
        if (!el) return undefined
        return () => { if (rectSalida) rectSalida.current = el.getBoundingClientRect() }
    }, [rectSalida])
    const [vista, setVista] = useState(null) // { z, x, y }
    // La vista al día para los listeners (rueda) sin volver a registrarlos.
    const vistaRef = useRef(null)
    useEffect(() => { vistaRef.current = vista }, [vista])
    const [manoFija, setManoFija] = useState(false)
    const [manoEspacio, setManoEspacio] = useState(false)
    const mano = manoFija || manoEspacio
    const [paneando, setPaneando] = useState(false)
    const arrastre = useRef(null)
    // Centrar y los botones − / + llegan con transición; rueda y arrastre no.
    const [suave, setSuave] = useState(false)
    const timerSuave = useRef(null)
    const conSuavidad = (fn) => {
        if (!reducirMovimiento()) {
            setSuave(true)
            clearTimeout(timerSuave.current)
            timerSuave.current = setTimeout(() => setSuave(false), INMERSIVO_MS)
        }
        fn()
    }
    useEffect(() => () => clearTimeout(timerSuave.current), [])

    // Centrada en el área libre, con el zoom pedido.
    const centrar = useCallback((z = zoomInicial) => {
        const el = stageRef.current
        if (!el) return
        const w = el.clientWidth - area.left - area.right
        const h = el.clientHeight - area.top - area.bottom
        const v = { z, x: area.left + (w - card.w * z) / 2, y: area.top + Math.max(0, (h - card.h * z) / 2) }
        setVista(v)
        return v
    }, [zoomInicial, area.left, area.right, area.top, area.bottom, card.w, card.h])

    // Entrada: de su lugar en el tablero normal al centro, 50 % más grande.
    useLayoutEffect(() => {
        const v = centrar()
        const d = desde?.current
        const el = piezaRef.current
        const st = stageRef.current
        if (!v || !d?.rect?.width || !d.w || !el || !st || reducirMovimiento()) return
        const r = st.getBoundingClientRect()
        const z0 = d.rect.width / d.w
        const x0 = d.rect.left + d.rect.width / 2 - r.left - (card.w * z0) / 2
        const y0 = d.rect.top - r.top
        el.animate(
            [{ transform: `translate(${x0}px, ${y0}px) scale(${z0})` }, { transform: `translate(${v.x}px, ${v.y}px) scale(${v.z})` }],
            { duration: INMERSIVO_MS, easing: INMERSIVO_EASE },
        )
    }, [])

    // Zoom alrededor de un punto del tablero (por omisión, el centro).
    const zoomEn = useCallback((nuevo, px, py) => {
        const v = vistaRef.current
        const el = stageRef.current
        if (!v || !el) return
        const z = clamp(nuevo, MIN, MAX)
        const cx = px ?? el.clientWidth / 2
        const cy = py ?? el.clientHeight / 2
        setVista({ z, x: cx - (cx - v.x) * (z / v.z), y: cy - (cy - v.y) * (z / v.z) })
    }, [])

    // Rueda: ⌘/Ctrl = zoom; sobre la pieza, su scroll; fuera, mover el tablero.
    useEffect(() => {
        const el = stageRef.current
        if (!el) return undefined
        const onWheel = (e) => {
            const v = vistaRef.current
            if (!v) return
            setSuave(false)
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                const r = el.getBoundingClientRect()
                const delta = e.deltaY * (e.deltaMode === 1 ? -0.05 : -0.0025)
                zoomEn(v.z * (1 + delta), e.clientX - r.left, e.clientY - r.top)
                return
            }
            if (e.target.closest?.('[data-side-card]') && !mano) return
            e.preventDefault()
            setVista({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY })
        }
        el.addEventListener('wheel', onWheel, { passive: false })
        return () => el.removeEventListener('wheel', onWheel)
    }, [zoomEn, mano])

    // Barra espaciadora sostenida = mano.
    useEffect(() => {
        const down = (e) => {
            if (e.code !== 'Space' || escribiendo(e.target)) return
            e.preventDefault()
            if (!e.repeat) setManoEspacio(true)
        }
        const up = (e) => {
            if (e.code !== 'Space') return
            setManoEspacio(false)
        }
        window.addEventListener('keydown', down)
        window.addEventListener('keyup', up)
        return () => {
            window.removeEventListener('keydown', down)
            window.removeEventListener('keyup', up)
        }
    }, [])

    // Arrastre del tablero: fondo siempre; sobre la pieza solo con la mano.
    const empezar = (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return
        if (!mano && e.target.closest('[data-side-card]')) return
        if (e.target.closest('button, input, [data-edit-keep]')) return
        setSuave(false)
        arrastre.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
        e.currentTarget.setPointerCapture?.(e.pointerId)
        setPaneando(true)
    }
    const mover = (e) => {
        const a = arrastre.current
        if (!a || a.id !== e.pointerId) return
        const dx = e.clientX - a.x
        const dy = e.clientY - a.y
        a.x = e.clientX
        a.y = e.clientY
        setVista((v) => (v ? { ...v, x: v.x + dx, y: v.y + dy } : v))
    }
    const soltar = (e) => {
        if (arrastre.current?.id !== e.pointerId) return
        arrastre.current = null
        setPaneando(false)
    }

    const z = vista?.z ?? zoomInicial
    return (
        <>
            <div
                ref={stageRef}
                className={ws.lienzoInmersivo}
                style={{ cursor: paneando ? 'grabbing' : mano ? 'grab' : undefined }}
                onPointerDown={empezar}
                onPointerMove={mover}
                onPointerUp={soltar}
                onPointerCancel={soltar}
            >
                <div
                    ref={refPieza}
                    className={ws.lienzoInmersivoPieza}
                    style={{
                        width: card.w,
                        transform: vista ? `translate(${vista.x}px, ${vista.y}px) scale(${vista.z})` : 'none',
                        visibility: vista ? undefined : 'hidden',
                        transition: suave ? `transform ${INMERSIVO_MS}ms ${INMERSIVO_EASE}` : undefined,
                        '--canvas-zoom': z,
                    }}
                >
                    {canvas}
                </div>
                {/* Con la mano, nada debajo recibe el puntero (no se dibuja). */}
                {mano && <div className={ws.lienzoInmersivoMano} aria-hidden />}
            </div>

            <div className={ws.dock} data-edit-keep data-entrada style={{ left: `calc(${area.left}px + (100% - ${area.left + area.right}px) / 2)` }}>
                <Tooltip title={t('build_editor.zoom_out')}>
                    <button type="button" className={ws.dockIcon} onClick={() => conSuavidad(() => zoomEn(z - PASO))} disabled={z <= MIN} aria-label={t('build_editor.zoom_out')}>
                        <Minus size={17} />
                    </button>
                </Tooltip>
                <span className={ws.lienzoInmersivoZoom}>{Math.round(z * 100)}%</span>
                <Tooltip title={t('build_editor.zoom_in')}>
                    <button type="button" className={ws.dockIcon} onClick={() => conSuavidad(() => zoomEn(z + PASO))} disabled={z >= MAX} aria-label={t('build_editor.zoom_in')}>
                        <Plus size={17} />
                    </button>
                </Tooltip>
                <span className={ws.dockDivider} />
                <Tooltip title={t('build_editor.pan_hand')}>
                    <button type="button" className={ws.dockIcon} data-on={mano || undefined} onClick={() => setManoFija((v) => !v)} aria-label={t('build_editor.pan_hand')} aria-pressed={mano}>
                        <Hand size={17} />
                    </button>
                </Tooltip>
                <Tooltip title={t('build_editor.recenter')}>
                    <button type="button" className={ws.dockIcon} onClick={() => conSuavidad(() => centrar())} aria-label={t('build_editor.recenter')}>
                        <Crosshair size={17} />
                    </button>
                </Tooltip>
            </div>
        </>
    )
}
