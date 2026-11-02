import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tooltip } from 'antd'
import { ChevronLeft, CircleCheck, CircleDashed, CircleHelp, Laptop, Layers, PanelRightClose, PenLine, Redo2, RotateCcwSquare, Scan, Smartphone, Tablet, Undo2 } from 'lucide-react'
import { DevicePreview } from '../Invitation/Build/PageSections/DevicePreview'
import { DEVICE_SIZES } from '../Invitation/Build/PageSections/deviceSizes'
import { MediaSiderContext } from '../../components/ImagesStorage/MediaSiderContext'
import { LienzoInmersivo } from './LienzoInmersivo'
import { INMERSIVO_EASE, INMERSIVO_MS, reducirMovimiento } from './inmersivo'
import ws from '../Invitation/Build/PageSections/EditorWorkspace.module.css'
import eb from '../Invitation/Build/PageSections/ElementBar.module.css'

/*
  Área de trabajo única de los editores de I attend (invitación, side events
  y Pops). Ver docs/sistema-diseno-editor.md. Pone el marco y la
  experiencia; cada editor le da su contenido:

  - Riel de herramientas + panel deslizable (340 px) a la izquierda. El panel
    lateral es para AGREGAR o para lo global. `tools`: [{ id, icon, title,
    hint, hidden?, parent? }]; `renderTool(id)` dibuja el panel abierto. El
    estado (`activeTool`, `toolOpen`) es del editor, que lo abre desde otras
    piezas (barras, pickers de imagen, tour).
  - Escenario con zoom (80 % · 100 % · Ajustar) y la pieza al centro
    (`canvas`); en "Ver en vivo", `liveContent` dentro de DevicePreview
    (iPhone · iPad · Mac, el iPad gira).
  - `bar`: la barra contextual de lo elegido, arriba de la pieza (la pieza
    baja para dejarle lugar). Lo que MODIFICA va ahí.
  - `layers` (nodo) o `layersRef` (portal): panel Capas a la derecha. Con el
    panel de herramienta abierto en pantallas < 1100 px se esconde.
  - Dock: deshacer · rehacer · Editar | Ver en vivo · dispositivos · zoom · tour.
  - `column`: columna a la derecha que reemplaza riel y dock (Envío de los
    side events): la pieza se va al iPhone, a la izquierda.
  - Teclado de pantalla (iPad): el escenario sube lo justo para que el texto
    que se escribe quede arriba del teclado (REMOTE_TEXT_FOCUS).
*/

const ZOOM_MIN = 0.5
// Hasta dónde acerca el pellizco / ⌘ + rueda en el tablero.
const ZOOM_GESTO_MAX = 2.5
const ZOOM_STEPS = [0.8, 1, 'fit']
const COLUMN_MIN = 420
const DEVICES = [{ id: 'ios', Icon: Smartphone, label: 'iPhone' }, { id: 'ipad', Icon: Tablet, label: 'iPad' }, { id: 'mac', Icon: Laptop, label: 'Mac' }]
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Tamaño del área de trabajo (no de la ventana: arriba va el header).
const useSize = (ref, topOffset) => {
    const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight - topOffset })
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect
            if (width && height) setSize({ w: width, h: height })
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    return size
}

// Pantalla táctil (iPad): los gestos del tablero (pellizcar, arrastrar con
// un dedo) solo van ahí; en computadora el tablero funciona como siempre.
const TACTIL = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches)

// Alto visible real (--alto-visible en <html>): en Safari de iPad 100dvh
// puede medir más que lo que se ve y el dock quedaba debajo de la orilla.
// window.innerHeight sí es lo visible (sin contar el teclado).
const useAltoVisible = () => {
    useEffect(() => {
        const raiz = document.documentElement
        const medir = () => raiz.style.setProperty('--alto-visible', `${window.innerHeight}px`)
        medir()
        window.addEventListener('resize', medir)
        window.addEventListener('orientationchange', medir)
        return () => {
            window.removeEventListener('resize', medir)
            window.removeEventListener('orientationchange', medir)
            raiz.style.removeProperty('--alto-visible')
        }
    }, [])
}

// Teclado de pantalla (iPad): tapa la mitad de abajo y el editor no hace
// scroll, así que el texto que se está escribiendo quedaba debajo. La pieza
// avisa dónde quedó ese texto (`iattend-text-focus`) y el escenario sube lo
// justo para dejarlo arriba del teclado, sin pasarse del header y la barra.
const KEYBOARD_MIN = 120   // menos que esto no es un teclado (barra de atajos)
const LIFT_TOP = 140       // header (60) + barra
const LIFT_GAP = 24
const useKeyboardLift = () => {
    const [lift, setLift] = useState(0)
    const liftRef = useRef(0)
    useEffect(() => {
        const vv = window.visualViewport
        if (!vv) return
        let focus = null
        const apply = (v) => { liftRef.current = v; setLift(v) }
        let hadKeyboard = false
        const update = () => {
            const covered = window.innerHeight - (vv.height + vv.offsetTop)
            // Al cerrar el teclado Safari deja la página recorrida: se regresa.
            if (covered >= KEYBOARD_MIN) hadKeyboard = true
            else if (hadKeyboard) { hadKeyboard = false; if (window.scrollY) window.scrollTo(0, 0) }
            if (!focus?.rect || covered < KEYBOARD_MIN || !focus.frame?.isConnected) { if (liftRef.current) apply(0); return }
            const box = focus.frame.getBoundingClientRect()
            const scale = focus.frame.offsetHeight ? box.height / focus.frame.offsetHeight : 1
            const top = box.top + liftRef.current + focus.rect.y * scale
            const bottom = top + focus.rect.h * scale
            const visibleBottom = vv.offsetTop + vv.height - LIFT_GAP
            const next = Math.round(Math.max(0, Math.min(bottom - visibleBottom, top - LIFT_TOP)))
            if (Math.abs(next - liftRef.current) > 2) apply(next)
        }
        const onFocus = (e) => {
            const { rect, source } = e.detail ?? {}
            const frame = rect && source ? [...document.querySelectorAll('iframe')].find((f) => f.contentWindow === source) : null
            focus = rect && frame ? { rect, frame } : null
            update()
        }
        window.addEventListener('iattend-text-focus', onFocus)
        vv.addEventListener('resize', update)
        vv.addEventListener('scroll', update)
        return () => {
            window.removeEventListener('iattend-text-focus', onFocus)
            vv.removeEventListener('resize', update)
            vv.removeEventListener('scroll', update)
        }
    }, [])
    return lift
}

// Ancho de `lateral` en el modo inmersivo (la paleta de dibujo).
const LATERAL_W = 112

export const EditorShell = ({
    className,
    topOffset = 60,
    // Herramientas
    tools, activeTool, toolOpen, onPickTool, onCloseTool, renderTool,
    // Pieza
    card = { w: 390, h: 780 }, canvas, liveContent,
    live, setLive, device, setDevice, onBlur, onLeaveEdit,
    // "Ver en vivo" como un invitado que ya confirmó (opcional: solo si el
    // editor lo pasa; hoy side events / Pop, SideWorkspace).
    vistaConfirmada, onVistaConfirmada,
    // `hasLayers`: hay panel Capas (con `layersRef` el contenido llega por portal).
    bar, layers, layersRef, hasLayers = false,
    // Dock
    onUndo, onRedo, canUndo, canRedo, onReplayTour,
    // Envío (side events)
    column = null,
    mediaSider = null,
    // Modo inmersivo (dibujo a pantalla completa): sin riel, panel, Capas ni
    // dock; la pieza centrada y 50 % más grande en un tablero con zoom y
    // arrastre (LienzoInmersivo) y `lateral` a la derecha (la paleta de dibujo).
    inmersivo = false, lateral = null,
    // Gestos del tablero inmersivo (LienzoInmersivo): `sinHerramienta` (sin
    // pincel, un dedo mueve el tablero) y `onTapFuera` (tocar fuera de la pieza).
    inmersivoGestos = null,
    children,
}) => {
    const { t } = useTranslation()
    const wsRef = useRef(null)
    const vp = useSize(wsRef, topOffset)
    const keyboardLift = useKeyboardLift()
    useAltoVisible()

    // Número o 'fit'. Si al 80 % la pieza no cabe entre arriba y el dock
    // (iPad horizontal, laptops chicas), arranca en Ajustar.
    const [zoomMode, setZoomMode] = useState(() => ((window.innerHeight - topOffset - 150) / card.h < 0.8 ? 'fit' : 0.8))
    const [landscape, setLandscape] = useState(false)
    const [rotated, setRotated] = useState(false)

    // `column.saliendo`: la columna se va (se desvanece) mientras el resto ya
    // vuelve a editar.
    const withColumn = Boolean(column) && !column.saliendo
    const liveDevice = withColumn ? 'ios' : device
    // Envío: el iPhone (con su leyenda, ~34 px) a la izquierda y la columna
    // con todo el ancho que sobra.
    const columnScale = clamp(Math.min((vp.h - 40) / (DEVICE_SIZES.ios.h + 34), (vp.w - 40 - COLUMN_MIN - 64) / DEVICE_SIZES.ios.w), ZOOM_MIN, 1)
    const columnWidth = Math.max(COLUMN_MIN, vp.w - 40 - DEVICE_SIZES.ios.w * columnScale - 48)

    // El panel de herramienta flota encima del tablero; la pieza y el dock se
    // recorren al centro del espacio que queda. En pantallas angostas (iPad
    // vertical) no caben los dos paneles y la pieza: se esconde Capas, y el
    // lado derecho deja lugar al círculo de Lia.
    const panelOpen = toolOpen && !withColumn && !inmersivo
    const showLayers = hasLayers && !live && !withColumn && !inmersivo
    // Capas se puede ocultar (y se recuerda): queda una píldora para abrirla.
    const [capasOcultas, setCapasOcultas] = useState(() => {
        try { return localStorage.getItem('iattend_capas_ocultas') === '1' } catch { return false }
    })
    const ocultarCapas = (v) => {
        setCapasOcultas(v)
        try { localStorage.setItem('iattend_capas_ocultas', v ? '1' : '0') } catch { /* sin almacenamiento */ }
    }
    const hideLayers = panelOpen && vp.w < 1100
    const padL = withColumn ? 40 : panelOpen ? 405 : 96
    const padR = withColumn ? columnWidth + 40 : inmersivo ? 96 + LATERAL_W : panelOpen && showLayers && !capasOcultas ? (hideLayers ? 150 : 248) : 96
    const fitScale = clamp(Math.min((vp.w - padL - padR) / (card.w + 20), (vp.h - 150) / card.h), ZOOM_MIN, 1)
    // En "Ver en vivo" con la barra Sin confirmar / Confirmado arriba, el
    // dispositivo deja su lugar (como la pieza con la barra de edición).
    const barraVivo = live && !withColumn && Boolean(onVistaConfirmada)
    const fitFor = (d) => clamp(Math.min((vp.w - padL - padR) / (d.w + 40), (vp.h - (barraVivo ? 184 : 150)) / (d.h + 20)), 0.2, 1)
    // El iPad usa el mismo zoom de pie y acostado: al girar no cambia de tamaño.
    const liveFit = liveDevice === 'ipad'
        ? Math.min(fitFor(DEVICE_SIZES.ipad), fitFor(DEVICE_SIZES.ipadLandscape))
        : fitFor(DEVICE_SIZES[liveDevice] ?? DEVICE_SIZES.ios)
    const zoomBase = withColumn ? columnScale
        : live ? Math.min(zoomMode === 'fit' ? liveFit : zoomMode, liveFit)
        : zoomMode === 'fit' ? fitScale : hideLayers && ZOOM_STEPS.includes(zoomMode) ? Math.min(zoomMode, fitScale) : zoomMode
    const zoom = inmersivo ? zoomBase * 1.5 : zoomBase
    const zoomLabel = zoomMode === 'fit' ? t('build_editor.zoom_fit') : `${Math.round(zoom * 100)}%`
    const center = `calc(${padL}px + (100% - ${padL + padR}px) / 2)`

    const canvasScaleRef = useRef(null)
    const rectNormal = useRef(null)
    const rectInmersivo = useRef(null)
    const refCanvasScale = useCallback((el) => {
        canvasScaleRef.current = el
        if (!el) return undefined
        return () => { rectNormal.current = { rect: el.getBoundingClientRect(), w: el.offsetWidth } }
    }, [])

    // Solo en pantalla táctil (iPad). Navegar el tablero como el acomodo de mesas (TablesPage): pellizcar
    // con dos dedos (o ⌘/Ctrl + rueda, el pellizco del trackpad) acerca o
    // aleja alrededor de los dedos; arrastrar el fondo con un dedo (o la
    // rueda fuera de la pieza) lo mueve. Encima de la pieza, un dedo sigue
    // siendo de la pieza (scroll, elegir, arrastrar). El botón del zoom del
    // dock vuelve a centrar.
    const gestos = TACTIL && !live && !withColumn && !inmersivo
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [gestoVivo, setGestoVivo] = useState(false)
    const panRef = useRef(pan)
    const zoomRef = useRef(zoom)
    useLayoutEffect(() => {
        panRef.current = pan
        zoomRef.current = zoom
    })
    const dedos = useRef(new Map())
    const gesto = useRef(null)
    const arrastre = useRef(null)
    useEffect(() => { setPan({ x: 0, y: 0 }) }, [live, withColumn, inmersivo])
    const fijarZoom = (z) => setZoomMode(clamp(Math.round(z * 1000) / 1000, ZOOM_MIN, ZOOM_GESTO_MAX))
    // Centro de la pieza sin el arrastre (el escalado va desde su centro).
    const centroPieza = () => {
        const r = canvasScaleRef.current?.getBoundingClientRect()
        if (!r) return null
        return { x: r.left + r.width / 2 - panRef.current.x, y: r.top + r.height / 2 - panRef.current.y }
    }
    const dedosDown = (e) => {
        if (!gestos || e.pointerType !== 'touch') return
        dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (dedos.current.size < 2) return
        e.stopPropagation()
        if (gesto.current) return
        const [a, b] = [...dedos.current.values()]
        const c = centroPieza()
        if (!c) return
        // El trazo o el arrastre que empezó el primer dedo no cuenta.
        window.dispatchEvent(new Event('iattend-dibujo-cancelar'))
        arrastre.current = null
        gesto.current = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, z0: zoomRef.current, p0: panRef.current, c }
        setGestoVivo(true)
    }
    const dedosMove = (e) => {
        if (!dedos.current.has(e.pointerId)) return
        dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const g = gesto.current
        if (!g || dedos.current.size < 2) return
        e.stopPropagation()
        const [a, b] = [...dedos.current.values()]
        const z = clamp(g.z0 * (Math.hypot(a.x - b.x, a.y - b.y) / g.d0), ZOOM_MIN, ZOOM_GESTO_MAX)
        const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        // El punto de la pieza que estaba bajo los dedos sigue bajo los dedos.
        const qx = (g.m0.x - g.c.x - g.p0.x) / g.z0
        const qy = (g.m0.y - g.c.y - g.p0.y) / g.z0
        fijarZoom(z)
        setPan({ x: m.x - g.c.x - z * qx, y: m.y - g.c.y - z * qy })
    }
    const dedosUp = (e) => {
        dedos.current.delete(e.pointerId)
        if (dedos.current.size === 0 && gesto.current) {
            gesto.current = null
            setGestoVivo(false)
        }
    }
    const fueraDePieza = (el) => !el.closest('[data-tour="preview"], [data-side-card], [data-edit-keep], button, input, textarea, .ant-dropdown, .ant-popover')
    const arrastreDown = (e) => {
        if (!gestos || gesto.current || e.pointerType !== 'touch' || !fueraDePieza(e.target)) return
        arrastre.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
        setGestoVivo(true)
    }
    const arrastreMove = (e) => {
        const a = arrastre.current
        if (!a || a.id !== e.pointerId || gesto.current) return
        const dx = e.clientX - a.x
        const dy = e.clientY - a.y
        a.x = e.clientX
        a.y = e.clientY
        setPan((p) => ({ x: p.x + dx, y: p.y + dy }))
    }
    const arrastreUp = (e) => {
        if (arrastre.current?.id !== e.pointerId) return
        arrastre.current = null
        if (!gesto.current) setGestoVivo(false)
    }
    // Rueda: ⌘/Ctrl = zoom al cursor; fuera de la pieza, mover el tablero.
    const stageRef = useRef(null)
    useEffect(() => {
        const el = stageRef.current
        if (!el || !gestos) return undefined
        const onWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                const c = centroPieza()
                if (!c) return
                const z0 = zoomRef.current
                const z = clamp(z0 * (1 + e.deltaY * (e.deltaMode === 1 ? -0.05 : -0.0025)), ZOOM_MIN, ZOOM_GESTO_MAX)
                const p0 = panRef.current
                const qx = (e.clientX - c.x - p0.x) / z0
                const qy = (e.clientY - c.y - p0.y) / z0
                fijarZoom(z)
                setPan({ x: e.clientX - c.x - z * qx, y: e.clientY - c.y - z * qy })
                return
            }
            if (!fueraDePieza(e.target)) return
            e.preventDefault()
            setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }))
        }
        el.addEventListener('wheel', onWheel, { passive: false })
        return () => el.removeEventListener('wheel', onWheel)
    }, [gestos])

    const setMode = (mode) => {
        if ((mode === 'live') === live) return
        if (mode === 'live') onLeaveEdit?.()
        setLive(mode === 'live')
    }

    // Transición del modo inmersivo: la pieza viaja (FLIP) de su lugar en el
    // tablero normal al del inmersivo (LienzoInmersivo, `desde`) y de regreso
    // (abajo). Cada tablero deja su recuadro al desmontarse; riel, Capas y
    // dock vuelven deslizándose (`volviendo` → data-entrada).
    const [volviendo, setVolviendo] = useState(false)
    const inmersivoAntes = useRef(inmersivo)
    useLayoutEffect(() => {
        if (inmersivoAntes.current === inmersivo) return undefined
        inmersivoAntes.current = inmersivo
        if (inmersivo) return undefined
        setVolviendo(true)
        const timer = setTimeout(() => setVolviendo(false), INMERSIVO_MS + 200)
        const el = canvasScaleRef.current
        const prev = rectInmersivo.current
        if (el && prev?.width && el.offsetWidth && !reducirMovimiento()) {
            // De donde estaba en el inmersivo a su lugar (origen al centro).
            const fin = el.getBoundingClientRect()
            const z1 = prev.width / el.offsetWidth
            const ox = el.offsetWidth / 2
            const oy = el.offsetHeight / 2
            const dx = prev.left - fin.left + ox * (z1 - zoom)
            const dy = prev.top - fin.top + oy * (z1 - zoom)
            el.animate(
                [{ transform: `translate(${dx}px, ${dy}px) scale(${z1})` }, { transform: `scale(${zoom})` }],
                { duration: INMERSIVO_MS, easing: INMERSIVO_EASE },
            )
        }
        return () => clearTimeout(timer)
    }, [inmersivo])

    // Cambio de modo (editar ↔ columna de Envío ↔ en vivo): la pieza viaja
    // (FLIP) de su lugar anterior al nuevo con un fundido, y al volver a editar
    // riel, Capas y dock entran deslizándose. En ese cuadro el escenario no
    // anima su padding (si no, el lugar final se mediría a medio camino).
    const modo = withColumn ? 'columna' : live ? 'vivo' : 'editar'
    const [modoPintado, setModoPintado] = useState(modo)
    const cambiandoModo = modoPintado !== modo && !inmersivo
    const rectAntes = useRef(null)
    useLayoutEffect(() => {
        const el = canvasScaleRef.current
        if (!el || inmersivo) return undefined
        if (!cambiandoModo) {
            rectAntes.current = el.getBoundingClientRect()
            return undefined
        }
        const prev = rectAntes.current
        const venia = modoPintado
        setModoPintado(modo)
        let timer = null
        if (modo === 'editar' && venia === 'columna') {
            setVolviendo(true)
            timer = setTimeout(() => setVolviendo(false), INMERSIVO_MS + 200)
        }
        if (prev?.width && el.offsetWidth && !reducirMovimiento()) {
            const fin = el.getBoundingClientRect()
            const z1 = prev.width / el.offsetWidth
            const ox = el.offsetWidth / 2
            const oy = el.offsetHeight / 2
            const dx = prev.left - fin.left + ox * (z1 - zoom)
            const dy = prev.top - fin.top + oy * (z1 - zoom)
            el.animate(
                [{ transform: `translate(${dx}px, ${dy}px) scale(${z1})`, opacity: 0.35 }, { transform: `scale(${zoom})`, opacity: 1 }],
                { duration: INMERSIVO_MS + 60, easing: INMERSIVO_EASE },
            )
        }
        rectAntes.current = el.getBoundingClientRect()
        return () => { if (timer) clearTimeout(timer) }
    })

    const tool = tools.find((x) => x.id === activeTool)
    const railOn = (item) => toolOpen && (activeTool === item.id || tool?.parent === item.id)

    return (
        <MediaSiderContext.Provider value={mediaSider}>
        <div ref={wsRef} className={`${ws.workspace} ${className ?? ''}`}>
            {/* ── Riel y panel de herramienta ── */}
            {!withColumn && !inmersivo && (
                <div className={ws.left} data-live={live || undefined} data-entrada={volviendo || undefined} data-edit-keep data-editor-left>
                    <div className={ws.rail}>
                        {tools.filter((item) => !item.hidden).map((item) => (
                            <div key={item.id} className={ws.railItem}>
                                {/* `item.aviso` (texto): punto rojo en el ícono y el motivo en el tooltip. */}
                                <Tooltip title={item.aviso ? `${item.title} · ${item.aviso}` : item.title} placement="right">
                                    <button
                                        type="button"
                                        className={ws.railButton}
                                        data-on={railOn(item) || undefined}
                                        data-tour={`tool-${item.id}`}
                                        aria-label={item.aviso ? `${item.title}. ${item.aviso}` : item.title}
                                        onClick={() => onPickTool(item.id)}
                                    >
                                        <item.icon size={20} />
                                        {item.aviso && <span className={ws.railAviso} aria-hidden />}
                                    </button>
                                </Tooltip>
                            </div>
                        ))}
                    </div>

                    {/* Siempre montado: abre y cierra deslizando su ancho (0 ↔ 340). */}
                    {tool && (
                        <div className={ws.toolPanel} data-open={toolOpen || undefined} aria-hidden={!toolOpen}>
                            <div className={ws.toolInner}>
                                <div className={ws.toolHead}>
                                    <span className={ws.toolIcon}><tool.icon size={16} /></span>
                                    <div className={ws.toolTitles}>
                                        <span className={ws.toolTitle}>{tool.title}</span>
                                        <span className={ws.toolHint}>{tool.hint}</span>
                                    </div>
                                </div>
                                <div className={`${ws.toolBody} scroll-invitation`} data-tool-body>
                                    {renderTool(tool.id)}
                                </div>
                            </div>
                            {/* Asa para plegar el panel, en su orilla derecha (como Canva). */}
                            <button type="button" className={ws.toolHandle} aria-label={t('build_editor.close')} onClick={onCloseTool}>
                                <ChevronLeft size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Escenario ── */}
            {/* Tocar el tablero fuera de la pieza (y de lo marcado data-edit-keep
                y los popovers) suelta lo elegido. */}
            <div
                ref={stageRef}
                className={ws.stage}
                data-gestos={gestos || undefined}
                onPointerDownCapture={dedosDown}
                onPointerMoveCapture={dedosMove}
                onPointerUpCapture={dedosUp}
                onPointerCancelCapture={dedosUp}
                onPointerMove={arrastreMove}
                onPointerUp={arrastreUp}
                onPointerCancel={arrastreUp}
                style={{
                    padding: `${bar || barraVivo ? 92 : 20}px ${padR}px ${withColumn ? 20 : 92}px ${padL}px`,
                    transform: keyboardLift ? `translateY(-${keyboardLift}px)` : undefined,
                    transition: cambiandoModo ? 'none' : 'padding 0.25s ease, transform 0.25s ease',
                    // Inmersivo: el tablero de LienzoInmersivo ocupa su lugar.
                    ...(inmersivo ? { display: 'none' } : {}),
                }}
                onPointerDown={(e) => {
                    arrastreDown(e)
                    if (!live && onBlur && !e.target.closest('[data-tour="preview"], [data-side-card], [data-edit-keep], .ant-dropdown, .ant-popover, .ant-select-dropdown, .ant-picker-dropdown, .ant-color-picker, .pac-container')) onBlur()
                }}
            >
                {/* --canvas-zoom: lo que no deba achicarse con el zoom (manijas,
                    columnas) usa su inverso. */}
                {!inmersivo && (
                    <div ref={refCanvasScale} className={ws.canvasScale} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, '--canvas-zoom': zoom, ...(gestoVivo ? { transition: 'none' } : {}) }}>
                        {live || withColumn
                            ? <DevicePreview device={liveDevice} landscape={landscape} rotated={rotated}>{liveContent}</DevicePreview>
                            : canvas}
                    </div>
                )}
            </div>

            {/* ── Modo inmersivo: tablero con zoom y arrastre (LienzoInmersivo) ── */}
            {inmersivo && (
                <LienzoInmersivo
                    canvas={canvas}
                    card={card}
                    zoomInicial={zoom}
                    desde={rectNormal}
                    rectSalida={rectInmersivo}
                    area={{ left: 40, right: LATERAL_W + 64, top: bar ? 92 : 24, bottom: 96 }}
                    sinHerramienta={Boolean(inmersivoGestos?.sinHerramienta)}
                    onTapFuera={inmersivoGestos?.onTapFuera}
                />
            )}

            {/* ── Aviso en vivo ── */}
            {live && !withColumn && (
                <div className={ws.liveHint} style={{ left: panelOpen ? padL + 20 : undefined }}>
                    <span className={ws.liveDot} />
                    {t('build_editor.live_hint')}
                </div>
            )}

            {/* ── Capas ── */}
            {showLayers && (
                <div ref={layersRef} className={ws.layersDock} style={hideLayers ? { display: 'none' } : undefined} data-tour="layers" data-ocultas={capasOcultas || undefined} data-entrada={volviendo || undefined} aria-hidden={capasOcultas || undefined}>
                    {layers}
                    <Tooltip title={t('build_editor.layers_panel_hide')} placement="left">
                        <button type="button" className={ws.layersHide} onClick={() => ocultarCapas(true)} aria-label={t('build_editor.layers_panel_hide')}>
                            <PanelRightClose size={16} />
                        </button>
                    </Tooltip>
                </div>
            )}
            {showLayers && !hideLayers && capasOcultas && (
                <button type="button" className={ws.layersShow} onClick={() => ocultarCapas(false)}>
                    <Layers size={16} /> {t('build_editor.layers_title')}
                </button>
            )}

            {/* ── Barra contextual (arriba de la pieza) ── */}
            {bar && !live && !withColumn && (
                <div className={ws.elementBar} style={{ left: center }} data-tour="bar">
                    {bar}
                </div>
            )}

            {/* ── "Ver en vivo": la página sin confirmar o como la ve un invitado
                que ya confirmó (misma barra que las de edición). ── */}
            {barraVivo && (
                <div className={ws.elementBar} style={{ left: center }}>
                    <div className={eb.bar} role="radiogroup" aria-label={t('build_editor.live_confirmed_hint')}>
                        <div className={ws.segment}>
                            <button type="button" role="radio" aria-checked={!vistaConfirmada} className={`${ws.segBtn} ${ws.segSmall}`} data-on={!vistaConfirmada || undefined} onClick={() => onVistaConfirmada(false)}>
                                <CircleDashed size={14} /> {t('build_editor.live_unconfirmed')}
                            </button>
                            <button type="button" role="radio" aria-checked={Boolean(vistaConfirmada)} className={`${ws.segBtn} ${ws.segSmall}`} data-on={vistaConfirmada || undefined} onClick={() => onVistaConfirmada(true)}>
                                <CircleCheck size={14} /> {t('build_editor.live_confirmed')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Columna (Envío) ── */}
            {column && (
                <div className={`${ws.column} ${column.in && !column.saliendo ? ws.columnIn : ''}`} style={{ width: columnWidth, transition: column.noAnim ? 'none' : undefined, ...(column.saliendo ? { pointerEvents: 'none' } : {}) }} data-tour="guests" aria-hidden={column.saliendo || undefined}>
                    {column.node}
                </div>
            )}

            {/* ── Lateral del modo inmersivo (paleta de dibujo) ── */}
            {inmersivo && lateral && (
                <div className={ws.lateral} style={{ width: LATERAL_W }} data-edit-keep>
                    {lateral}
                </div>
            )}

            {/* ── Dock ── */}
            {!withColumn && !inmersivo && (
                <div className={ws.dock} data-edit-keep data-tour="dock" data-entrada={volviendo || undefined} style={{ left: center }}>
                    <Tooltip title={t('build_editor.undo')}>
                        <button type="button" className={ws.dockIcon} disabled={!canUndo} onClick={onUndo} aria-label={t('build_editor.undo')} data-tour="undo">
                            <Undo2 size={17} />
                        </button>
                    </Tooltip>
                    <Tooltip title={t('build_editor.redo')}>
                        <button type="button" className={ws.dockIcon} disabled={!canRedo} onClick={onRedo} aria-label={t('build_editor.redo')} data-tour="redo">
                            <Redo2 size={17} />
                        </button>
                    </Tooltip>
                    <span className={ws.dockDivider} />

                    <div className={ws.segment} data-tour="live-toggle">
                        <button type="button" className={ws.segBtn} data-on={!live || undefined} onClick={() => setMode('edit')}>
                            <PenLine size={14} /> {t('build_editor.mode_edit')}
                        </button>
                        <button type="button" className={`${ws.segBtn} ${ws.segLive}`} data-on={live || undefined} data-tour="live" onClick={() => setMode('live')}>
                            <span className={ws.segDot} /> {t('build_editor.live')}
                        </button>
                    </div>

                    {/* Dispositivos: siempre montado para que el dock crezca y se
                        encoja suave al entrar y salir de "Ver en vivo". */}
                    <div className={ws.devicesWrap} data-open={live || undefined} aria-hidden={!live || undefined}>
                        <div className={ws.devicesInner}>
                            <div className={ws.segment} data-tour="devices">
                                {DEVICES.map((d) => (
                                    <button key={d.id} type="button" tabIndex={live ? undefined : -1} className={`${ws.segBtn} ${ws.segSmall}`} data-on={device === d.id || undefined} onClick={() => setDevice(d.id)}>
                                        <d.Icon size={14} /> {d.label}
                                    </button>
                                ))}
                            </div>
                            {/* Girar el iPad: solo con él elegido. */}
                            <div className={ws.rotateWrap} data-open={(live && device === 'ipad') || undefined}>
                                <div className={ws.devicesInner}>
                                    <Tooltip title={t('build_editor.rotate_device')}>
                                        <button
                                            type="button"
                                            tabIndex={live && device === 'ipad' ? undefined : -1}
                                            className={ws.dockIcon}
                                            data-on={landscape || undefined}
                                            aria-label={t('build_editor.rotate_device')}
                                            onClick={() => { setRotated(true); setLandscape((v) => !v) }}
                                        >
                                            <RotateCcwSquare size={17} />
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>

                        </div>
                    </div>

                    <span className={ws.dockDivider} />
                    <button type="button" className={ws.dockText} data-tour="zoom" onClick={() => {
                        setPan({ x: 0, y: 0 })
                        // Tras un pellizco (zoom libre) vuelve a Ajustar.
                        setZoomMode(ZOOM_STEPS.includes(zoomMode) ? ZOOM_STEPS[(ZOOM_STEPS.indexOf(zoomMode) + 1) % ZOOM_STEPS.length] : 'fit')
                    }}>
                        <Scan size={14} /> {zoomLabel}
                    </button>
                    {onReplayTour && (
                        <Tooltip title={t('build_tour.replay')}>
                            <button type="button" className={`${ws.dockIcon} ${ws.dockMuted}`} onClick={onReplayTour} aria-label={t('build_tour.replay')} data-tour="tour-replay">
                                <CircleHelp size={16} />
                            </button>
                        </Tooltip>
                    )}
                </div>
            )}

            {children}
        </div>
        </MediaSiderContext.Provider>
    )
}
