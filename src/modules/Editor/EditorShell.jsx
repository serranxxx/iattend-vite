import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tooltip } from 'antd'
import { ChevronLeft, CircleHelp, Laptop, PenLine, Redo2, RotateCcwSquare, Scan, Smartphone, Tablet, Undo2 } from 'lucide-react'
import { DevicePreview } from '../Invitation/Build/PageSections/DevicePreview'
import { DEVICE_SIZES } from '../Invitation/Build/PageSections/deviceSizes'
import { MediaSiderContext } from '../../components/ImagesStorage/MediaSiderContext'
import ws from '../Invitation/Build/PageSections/EditorWorkspace.module.css'

/*
  Área de trabajo única de los editores de I attend (invitación, side events
  y Eventos Flash). Ver docs/sistema-diseno-editor.md. Pone el marco y la
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

export const EditorShell = ({
    className,
    topOffset = 60,
    // Herramientas
    tools, activeTool, toolOpen, onPickTool, onCloseTool, renderTool,
    // Pieza
    card = { w: 390, h: 780 }, canvas, liveContent,
    live, setLive, device, setDevice, onBlur, onLeaveEdit,
    // `hasLayers`: hay panel Capas (con `layersRef` el contenido llega por portal).
    bar, layers, layersRef, hasLayers = false,
    // Dock
    onUndo, onRedo, canUndo, canRedo, onReplayTour,
    // Envío (side events)
    column = null,
    mediaSider = null,
    children,
}) => {
    const { t } = useTranslation()
    const wsRef = useRef(null)
    const vp = useSize(wsRef, topOffset)
    const keyboardLift = useKeyboardLift()

    // Número o 'fit'. Si al 80 % la pieza no cabe entre arriba y el dock
    // (iPad horizontal, laptops chicas), arranca en Ajustar.
    const [zoomMode, setZoomMode] = useState(() => ((window.innerHeight - topOffset - 150) / card.h < 0.8 ? 'fit' : 0.8))
    const [landscape, setLandscape] = useState(false)
    const [rotated, setRotated] = useState(false)

    const withColumn = Boolean(column)
    const liveDevice = withColumn ? 'ios' : device
    // Envío: el iPhone (con su leyenda, ~34 px) a la izquierda y la columna
    // con todo el ancho que sobra.
    const columnScale = clamp(Math.min((vp.h - 40) / (DEVICE_SIZES.ios.h + 34), (vp.w - 40 - COLUMN_MIN - 64) / DEVICE_SIZES.ios.w), ZOOM_MIN, 1)
    const columnWidth = Math.max(COLUMN_MIN, vp.w - 40 - DEVICE_SIZES.ios.w * columnScale - 48)

    // El panel de herramienta flota encima del tablero; la pieza y el dock se
    // recorren al centro del espacio que queda. En pantallas angostas (iPad
    // vertical) no caben los dos paneles y la pieza: se esconde Capas, y el
    // lado derecho deja lugar al círculo de Lia.
    const panelOpen = toolOpen && !withColumn
    const showLayers = hasLayers && !live && !withColumn
    const hideLayers = panelOpen && vp.w < 1100
    const padL = withColumn ? 40 : panelOpen ? 405 : 96
    const padR = withColumn ? columnWidth + 40 : panelOpen && showLayers ? (hideLayers ? 150 : 248) : 96
    const fitScale = clamp(Math.min((vp.w - padL - padR) / (card.w + 20), (vp.h - 150) / card.h), ZOOM_MIN, 1)
    const fitFor = (d) => clamp(Math.min((vp.w - padL - padR) / (d.w + 40), (vp.h - 150) / (d.h + 20)), 0.2, 1)
    // El iPad usa el mismo zoom de pie y acostado: al girar no cambia de tamaño.
    const liveFit = liveDevice === 'ipad'
        ? Math.min(fitFor(DEVICE_SIZES.ipad), fitFor(DEVICE_SIZES.ipadLandscape))
        : fitFor(DEVICE_SIZES[liveDevice] ?? DEVICE_SIZES.ios)
    const zoom = withColumn ? columnScale
        : live ? Math.min(zoomMode === 'fit' ? liveFit : zoomMode, liveFit)
        : zoomMode === 'fit' ? fitScale : hideLayers ? Math.min(zoomMode, fitScale) : zoomMode
    const zoomLabel = zoomMode === 'fit' ? t('build_editor.zoom_fit') : `${Math.round(zoom * 100)}%`
    const center = `calc(${padL}px + (100% - ${padL + padR}px) / 2)`

    const setMode = (mode) => {
        if ((mode === 'live') === live) return
        if (mode === 'live') onLeaveEdit?.()
        setLive(mode === 'live')
    }

    const tool = tools.find((x) => x.id === activeTool)
    const railOn = (item) => toolOpen && (activeTool === item.id || tool?.parent === item.id)

    return (
        <MediaSiderContext.Provider value={mediaSider}>
        <div ref={wsRef} className={`${ws.workspace} ${className ?? ''}`}>
            {/* ── Riel y panel de herramienta ── */}
            {!withColumn && (
                <div className={ws.left} data-live={live || undefined} data-edit-keep data-editor-left>
                    <div className={ws.rail}>
                        {tools.filter((item) => !item.hidden).map((item) => (
                            <div key={item.id} className={ws.railItem}>
                                <Tooltip title={item.title} placement="right">
                                    <button
                                        type="button"
                                        className={ws.railButton}
                                        data-on={railOn(item) || undefined}
                                        data-tour={`tool-${item.id}`}
                                        onClick={() => onPickTool(item.id)}
                                    >
                                        <item.icon size={20} />
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
                className={ws.stage}
                style={{
                    padding: `${bar ? 92 : 20}px ${padR}px ${withColumn ? 20 : 92}px ${padL}px`,
                    transform: keyboardLift ? `translateY(-${keyboardLift}px)` : undefined,
                    transition: 'padding 0.25s ease, transform 0.25s ease',
                }}
                onPointerDown={!live && onBlur ? (e) => {
                    if (!e.target.closest('[data-tour="preview"], [data-side-card], [data-edit-keep], .ant-dropdown, .ant-popover, .ant-select-dropdown, .ant-picker-dropdown, .ant-color-picker, .pac-container')) onBlur()
                } : undefined}
            >
                {/* --canvas-zoom: lo que no deba achicarse con el zoom (manijas,
                    columnas) usa su inverso. */}
                <div className={ws.canvasScale} style={{ transform: `scale(${zoom})`, '--canvas-zoom': zoom }}>
                    {live || withColumn
                        ? <DevicePreview device={liveDevice} landscape={landscape} rotated={rotated}>{liveContent}</DevicePreview>
                        : canvas}
                </div>
            </div>

            {/* ── Aviso en vivo ── */}
            {live && !withColumn && (
                <div className={ws.liveHint} style={{ left: panelOpen ? padL + 20 : undefined }}>
                    <span className={ws.liveDot} />
                    {t('build_editor.live_hint')}
                </div>
            )}

            {/* ── Capas ── */}
            {showLayers && (
                <div ref={layersRef} className={ws.layersDock} style={hideLayers ? { display: 'none' } : undefined} data-tour="layers">
                    {layers}
                </div>
            )}

            {/* ── Barra contextual (arriba de la pieza) ── */}
            {bar && !live && !withColumn && (
                <div className={ws.elementBar} style={{ left: center }} data-tour="bar">
                    {bar}
                </div>
            )}

            {/* ── Columna (Envío) ── */}
            {withColumn && (
                <div className={`${ws.column} ${column.in ? ws.columnIn : ''}`} style={{ width: columnWidth, transition: column.noAnim ? 'none' : undefined }} data-tour="guests">
                    {column.node}
                </div>
            )}

            {/* ── Dock ── */}
            {!withColumn && (
                <div className={ws.dock} data-edit-keep data-tour="dock" style={{ left: center }}>
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
                    <button type="button" className={ws.dockText} data-tour="zoom" onClick={() => setZoomMode(ZOOM_STEPS[(ZOOM_STEPS.indexOf(zoomMode) + 1) % ZOOM_STEPS.length])}>
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
