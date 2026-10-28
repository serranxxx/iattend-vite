import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tooltip, message } from 'antd'
import {
    CircleHelp, Flower2, Layers2, Lightbulb, Palette, PenLine, Redo2,
    ChevronLeft, Scan, Shapes, Smartphone, Sticker, Undo2, WandSparkles,
} from 'lucide-react'
import ReactHost from '../../../../components/Host/ReactHost'
import { EditCanvas } from './EditCanvas'
import { DevicePreview } from './DevicePreview'
import { IdeasPanel, PalettePanel, TexturesPanel } from './ToolPanels'
import { ElementsPanel, StickersPanel } from './LayerPanels'
import { AiTextPanel } from './AiTextPanel'
import { addLayerItem, countStickers, MAX_STICKERS, stickerItem, uploadStickers } from './layerItems'
import styles from './EditorWorkspace.module.css'

// Área de trabajo del editor en escritorio (handoff "Editor Workspace"):
// tablero de puntos con el riel de herramientas y su panel a la izquierda, la
// invitación editable al centro (EditCanvas) o dentro del teléfono en "Ver en
// vivo", el panel Secciones a la derecha y el dock abajo. En celular sigue el
// editor de antes (BuildMenu + BuildContent). Ver docs/editor-workspace.md.

// Herramientas del riel. Las que traen `Panel` ya funcionan; las demás llegan en las
// siguientes etapas (drag & drop de elementos y stickers, Lia, etc.).
const TOOLS = [
    { id: 'elements', icon: Shapes, Panel: ElementsPanel },
    { id: 'stickers', icon: Sticker, Panel: StickersPanel },
    // Decoración: vacío por ahora (los separadores sueltos están en Elementos).
    { id: 'decor', icon: Flower2, Panel: () => null },
    { id: 'textures', icon: Layers2, Panel: TexturesPanel },
    { id: 'palette', icon: Palette, Panel: PalettePanel },
    { id: 'ai', icon: WandSparkles, divider: true, Panel: AiTextPanel },
    { id: 'ideas', icon: Lightbulb, Panel: IdeasPanel },
]

// Zoom del lienzo: el botón del dock pasa por 80% · 100% · Ajustar.
const ZOOM_MIN = 0.5
const ZOOM_STEPS = [0.8, 1, 'fit']

const useViewport = () => {
    const [v, setV] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
    useEffect(() => {
        const onResize = () => setV({ w: window.innerWidth, h: window.innerHeight })
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])
    return v
}

export const EditorWorkspace = ({
    invitation, invitationID,
    positionY, onSectionChange, activeLang, textureOverride, fontOverride, onHostReady,
    live, setLive, device, setDevice, onUndo, onRedo, canUndo, canRedo, onReplayTour,
    selectedSection, onSelectSection, onFieldChange, selectedField, onClearField, onCanvasBlur, deselectSignal,
    setInvitation, setSaved,
}) => {
    const { t } = useTranslation()

    const [activeTool, setActiveTool] = useState('elements')
    const [toolOpen, setToolOpen] = useState(false)
    // Número o 'fit' (ajustar a la pantalla).
    const [zoomMode, setZoomMode] = useState(0.8)
    const vp = useViewport()

    // El panel de herramienta flota encima del tablero: abrirlo no recorre la
    // invitación.
    // Cerrado: igual a los dos lados para que la pieza quede al centro. Con el
    // panel de herramienta abierto (riel 65 + panel 340), la pieza y el dock
    // se recorren al centro del espacio que queda (también en "Ver en vivo",
    // donde el panel se queda a la vista aunque apagado).
    const panelOpen = toolOpen
    const padL = panelOpen ? 405 : 96
    const padR = panelOpen ? 0 : 96
    // "Ajustar": que la tarjeta (390 × 780) quepa entre los paneles y entre
    // el header y el dock.
    const fitScale = Math.min(1, Math.max(ZOOM_MIN, Math.min((vp.w - padL - padR) / 410, (vp.h - 60 - 150) / 780)))
    const zoom = zoomMode === 'fit' ? fitScale : zoomMode
    const zoomLabel = zoomMode === 'fit' ? t('build_editor.zoom_fit') : `${Math.round(zoom * 100)}%`

    const pickTool = (id) => {
        if (id === activeTool) { setToolOpen((o) => !o); return }
        setActiveTool(id)
        setToolOpen(true)
    }
    const setMode = (mode) => {
        if ((mode === 'live') === live) return
        if (mode === 'live') onCanvasBlur?.()
        setLive(mode === 'live')
    }

    const tool = TOOLS.find((x) => x.id === activeTool)

    // ⌘V con una imagen (en el editor o dentro de la pieza, que manda el
    // archivo): se sube y entra como sticker a la sección que se ve.
    const invitationRef = useRef(invitation)
    useEffect(() => { invitationRef.current = invitation }, [invitation])
    useEffect(() => {
        if (live) return
        const pasteSticker = async (file, section = null) => {
            if (countStickers(invitationRef.current) >= MAX_STICKERS) {
                message.warning(t('build_editor.st_full'))
                return
            }
            const key = 'paste-sticker'
            message.loading({ content: t('build_editor.st_uploading'), key, duration: 0 })
            try {
                const [url] = await uploadStickers([file], invitationID)
                if (url) addLayerItem(stickerItem(url), section)
                message.destroy(key)
            } catch (err) {
                console.error(err)
                message.error({ content: t('build_editor.st_error'), key })
            }
        }
        const onPaste = (e) => {
            const target = e.target
            if (target?.isContentEditable || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return
            const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'))
            if (!file) return
            e.preventDefault()
            pasteSticker(file)
        }
        const onPiecePaste = (e) => pasteSticker(e.detail.file, e.detail.section ?? null)
        document.addEventListener('paste', onPaste)
        window.addEventListener('iattend-layer-paste', onPiecePaste)
        return () => {
            document.removeEventListener('paste', onPaste)
            window.removeEventListener('iattend-layer-paste', onPiecePaste)
        }
    }, [live, invitationID])

    return (
        <div className={styles.workspace}>
            {/* ── Riel y panel de herramienta ── */}
            <div className={styles.left} data-live={live || undefined} data-edit-keep data-editor-left>
                <div className={styles.rail}>
                    {TOOLS.map((item) => (
                        <div key={item.id} className={styles.railItem}>
                            {item.divider && <span className={styles.railDivider} />}
                            <Tooltip title={t(`build_editor.tool_${item.id}`)} placement="right">
                                <button
                                    type="button"
                                    className={styles.railButton}
                                    data-on={(toolOpen && activeTool === item.id) || undefined}
                                    onClick={() => pickTool(item.id)}
                                >
                                    <item.icon size={18} />
                                    <span>{t(`build_editor.tool_${item.id}_short`)}</span>
                                </button>
                            </Tooltip>
                        </div>
                    ))}
                </div>

                {/* Siempre montado: abre y cierra deslizando su ancho (0 ↔ 340). */}
                {tool && (
                    <div className={styles.toolPanel} data-open={toolOpen || undefined} aria-hidden={!toolOpen}>
                        <div className={styles.toolInner}>
                        <div className={styles.toolHead}>
                            <span className={styles.toolIcon}><tool.icon size={16} /></span>
                            <div className={styles.toolTitles}>
                                <span className={styles.toolTitle}>{t(`build_editor.tool_${tool.id}`)}</span>
                                <span className={styles.toolHint}>{t(`build_editor.tool_${tool.id}_hint`)}</span>
                            </div>
                        </div>
                        <div className={`${styles.toolBody} scroll-invitation`}>
                            {tool.Panel ? (
                                <tool.Panel invitation={invitation} invitationID={invitationID} setInvitation={setInvitation} setSaved={setSaved} onSelectSection={onSelectSection} activeLang={activeLang} />
                            ) : (
                                <span className={styles.toolSoon}>{t('build_editor.tool_soon')}</span>
                            )}
                        </div>
                        </div>
                        {/* Asa para plegar el panel, en su orilla derecha (como Canva). */}
                        <button type="button" className={styles.toolHandle} aria-label={t('build_editor.close')} onClick={() => setToolOpen(false)}>
                            <ChevronLeft size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Escenario ── */}
            <div className={styles.stage} style={{ padding: `20px ${padR}px 92px ${padL}px` }}>
                {live ? (
                    <div className={styles.canvasScale} style={{ transform: `scale(${zoom})` }}>
                        <DevicePreview device={device}>
                            <ReactHost config={invitation} scrollToSection={positionY} onSectionChange={onSectionChange} textureOverride={textureOverride} fontOverride={fontOverride} activeLang={activeLang} onReady={onHostReady} />
                        </DevicePreview>
                    </div>
                ) : (
                    // --canvas-zoom: la columna de módulos (dentro del lienzo) la
                    // usa para no achicarse con el zoom y verse igual que la
                    // columna de idioma y zoom de la derecha.
                    <div className={styles.canvasScale} style={{ transform: `scale(${zoom})`, '--canvas-zoom': zoom }}>
                        <EditCanvas
                            invitation={invitation}
                            invitationID={invitationID}
                            selectedSection={selectedSection}
                            onSelectSection={onSelectSection}
                            onFieldChange={onFieldChange}
                            scrollToSection={positionY}
                            onSectionChange={onSectionChange}
                            textureOverride={textureOverride}
                            fontOverride={fontOverride}
                            activeLang={activeLang}
                            onHostReady={onHostReady}
                            deselectSignal={deselectSignal}
                            selectedField={selectedField}
                            onClearField={onClearField}
                            setInvitation={setInvitation}
                            setSaved={setSaved}
                            onOpenTool={(id) => { setActiveTool(id); setToolOpen(true) }}
                        />
                    </div>
                )}
            </div>

            {/* ── Aviso en vivo ── */}
            {live && (
                <div className={styles.liveHint} style={{ left: panelOpen ? padL + 20 : undefined }}>
                    <span className={styles.liveDot} />
                    {t('build_editor.live_hint')}
                </div>
            )}

            {/* El idioma y el slider de zoom de la derecha se ocultaron por ahora
                (el zoom sigue en el dock; el idioma está pendiente de lugar). */}

            {/* ── Dock ── */}
            <div className={styles.dock} data-edit-keep style={{ left: `calc(${padL}px + (100% - ${padL + padR}px) / 2)` }}>
                <Tooltip title={t('build_editor.undo')}>
                    <button type="button" className={styles.dockIcon} disabled={!canUndo} onClick={onUndo} aria-label={t('build_editor.undo')} data-tour="undo">
                        <Undo2 size={17} />
                    </button>
                </Tooltip>
                <Tooltip title={t('build_editor.redo')}>
                    <button type="button" className={styles.dockIcon} disabled={!canRedo} onClick={onRedo} aria-label={t('build_editor.redo')} data-tour="redo">
                        <Redo2 size={17} />
                    </button>
                </Tooltip>
                <span className={styles.dockDivider} />

                <div className={styles.segment} data-tour="live-toggle">
                    <button type="button" className={styles.segBtn} data-on={!live || undefined} onClick={() => setMode('edit')}>
                        <PenLine size={14} /> {t('build_editor.mode_edit')}
                    </button>
                    <button type="button" className={`${styles.segBtn} ${styles.segLive}`} data-on={live || undefined} onClick={() => setMode('live')}>
                        <span className={styles.segDot} /> {t('build_editor.live')}
                    </button>
                </div>

                {live && (
                    <div className={styles.segment} data-tour="devices">
                        {['ios', 'android'].map((d) => (
                            <button key={d} type="button" className={`${styles.segBtn} ${styles.segSmall}`} data-on={device === d || undefined} onClick={() => setDevice(d)}>
                                <Smartphone size={14} /> {d === 'ios' ? 'iOS' : 'Android'}
                            </button>
                        ))}
                    </div>
                )}

                <span className={styles.dockDivider} />
                <button type="button" className={styles.dockText} onClick={() => setZoomMode(ZOOM_STEPS[(ZOOM_STEPS.indexOf(zoomMode) + 1) % ZOOM_STEPS.length])}>
                    <Scan size={14} /> {zoomLabel}
                </button>
                {onReplayTour && (
                    <Tooltip title={t('build_tour.replay')}>
                        <button type="button" className={`${styles.dockIcon} ${styles.dockMuted}`} onClick={onReplayTour} aria-label={t('build_tour.replay')} data-tour="tour-replay">
                            <CircleHelp size={16} />
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    )
}
