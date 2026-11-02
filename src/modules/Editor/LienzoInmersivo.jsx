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
  · Touch (iPad), como Freeform: dos dedos en cualquier lado = pellizcar
    para acercar / alejar y arrastrar para moverse (el trazo que el primer
    dedo había empezado se descarta: `iattend-dibujo-cancelar`, SideCanvas).
    Un dedo sobre la pieza = dibujar; fuera de la pieza = mover el tablero.
    Tocar (sin arrastrar) fuera de la pieza → `onTapFuera` (suelta el
    pincel). Sin pincel (`sinHerramienta`) un dedo mueve el tablero en
    cualquier lado.
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

export const LienzoInmersivo = ({ canvas, card, zoomInicial, area, desde, rectSalida, sinHerramienta = false, onTapFuera }) => {
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
    const mano = manoFija || manoEspacio || sinHerramienta
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
        // Alto real de la pieza: en el dibujo va completa, a lo largo.
        const alto = piezaRef.current?.offsetHeight || card.h
        const v = { z, x: area.left + (w - card.w * z) / 2, y: area.top + Math.max(0, (h - alto * z) / 2) }
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

    // Rueda: ⌘/Ctrl = zoom; si no, mover el tablero (la pieza va completa,
    // sin scroll propio).
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

    // ── Dos dedos: pellizcar y mover (touch). Se ve en la fase de captura,
    // antes que la pieza, para que el segundo dedo no empiece otro trazo. ──
    const dedos = useRef(new Map()) // pointerId → { x, y }
    const gesto = useRef(null) // { d0, m0, v0 }
    const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
    const medio = (a, b, r) => ({ x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top })
    const capturaDown = (e) => {
        if (e.pointerType !== 'touch') return
        dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (dedos.current.size < 2) return
        e.stopPropagation()
        e.preventDefault()
        if (gesto.current) return
        // Empieza el gesto: se descarta el trazo del primer dedo y el arrastre.
        window.dispatchEvent(new Event('iattend-dibujo-cancelar'))
        arrastre.current = null
        setPaneando(false)
        setSuave(false)
        const [a, b] = [...dedos.current.values()]
        const r = stageRef.current.getBoundingClientRect()
        gesto.current = { d0: distancia(a, b) || 1, m0: medio(a, b, r), v0: vistaRef.current }
    }
    const capturaMove = (e) => {
        if (e.pointerType !== 'touch' || !dedos.current.has(e.pointerId)) return
        dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const g = gesto.current
        if (!g) return
        e.stopPropagation()
        e.preventDefault()
        if (dedos.current.size < 2 || !g.v0) return
        const [a, b] = [...dedos.current.values()]
        const r = stageRef.current.getBoundingClientRect()
        const m = medio(a, b, r)
        const z = clamp(g.v0.z * (distancia(a, b) / g.d0), MIN, MAX)
        const k = z / g.v0.z
        setVista({ z, x: m.x - (g.m0.x - g.v0.x) * k, y: m.y - (g.m0.y - g.v0.y) * k })
    }
    const capturaUp = (e) => {
        if (e.pointerType !== 'touch') return
        dedos.current.delete(e.pointerId)
        if (gesto.current) {
            e.stopPropagation()
            // El gesto termina cuando se levantan todos los dedos (el que queda
            // no dibuja ni mueve).
            if (dedos.current.size === 0) gesto.current = null
        }
    }

    // Arrastre del tablero: fondo siempre; sobre la pieza solo con la mano.
    // Un toque corto sin moverse fuera de la pieza = onTapFuera.
    const empezar = (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return
        if (gesto.current) return
        const sobrePieza = Boolean(e.target.closest('[data-side-card]'))
        if (!mano && sobrePieza) return
        if (e.target.closest('button, input, [data-edit-keep]')) return
        setSuave(false)
        arrastre.current = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: Date.now(), fuera: !sobrePieza }
        e.currentTarget.setPointerCapture?.(e.pointerId)
        setPaneando(true)
    }
    const mover = (e) => {
        const a = arrastre.current
        if (!a || a.id !== e.pointerId || gesto.current) return
        const dx = e.clientX - a.x
        const dy = e.clientY - a.y
        a.x = e.clientX
        a.y = e.clientY
        setVista((v) => (v ? { ...v, x: v.x + dx, y: v.y + dy } : v))
    }
    const soltar = (e) => {
        const a = arrastre.current
        if (a?.id !== e.pointerId) return
        arrastre.current = null
        setPaneando(false)
        const toque = Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < 8 && Date.now() - a.t0 < 350
        if (toque && a.fuera && e.type === 'pointerup') onTapFuera?.()
    }

    const z = vista?.z ?? zoomInicial
    return (
        <>
            <div
                ref={stageRef}
                className={ws.lienzoInmersivo}
                style={{ cursor: paneando ? 'grabbing' : mano ? 'grab' : undefined }}
                onPointerDownCapture={capturaDown}
                onPointerMoveCapture={capturaMove}
                onPointerUpCapture={capturaUp}
                onPointerCancelCapture={capturaUp}
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
