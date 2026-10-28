import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, Tooltip, message } from 'antd'
import {
    CircleHelp, CloudUpload, Images, Palette, PenLine, Redo2,
    ChevronLeft, Laptop, RotateCcwSquare, Scan, Shapes, Smartphone, Tablet, Undo2, WandSparkles,
} from 'lucide-react'
import ReactHost from '../../../../components/Host/ReactHost'
import { EditCanvas } from './EditCanvas'
import { DevicePreview } from './DevicePreview'
import { DEVICE_SIZES } from './deviceSizes'
import { DesignPanel } from './ToolPanels'
import { PhotosPanel } from './PhotosPanel'
import { UploadsPanel } from './UploadsPanel'
import { ElementsPanel } from './LayerPanels'
import { AiTextPanel } from './AiTextPanel'
import { ColorChooser } from './ColorChooser'
import { invitationPalette } from './colorUtils'
import { ElementBar } from './ElementBar'
import { TextBar } from './TextBar'
import { ModuleBar } from './ModuleBar'
import { SeparatorBar } from './SeparatorBar'
import { MomentBar } from './MomentBar'
import { PaletteBar } from './PaletteBar'
import { ImagesBar } from './ImagesBar'
import { LinkBar } from './LinkBar'
import { GiftCardBar } from './GiftCardBar'
import { DateBar } from './DateBar'
import { CoverMediaBar } from './CoverMediaBar'
import { SongBar } from './SongBar'
import { textStyleFor } from './textStyle'
import { MediaSiderContext } from '../../../../components/ImagesStorage/MediaSiderContext'
import { addLayerItem, countStickers, MAX_STICKERS, stickerItem, uploadStickers } from './layerItems'
import styles from './EditorWorkspace.module.css'

// Área de trabajo del editor en escritorio (handoff "Editor Workspace"):
// tablero de puntos con el riel de herramientas y su panel a la izquierda, la
// invitación editable al centro (EditCanvas) o dentro del teléfono en "Ver en
// vivo", el panel Secciones a la derecha y el dock abajo. En celular sigue el
// editor de antes (BuildMenu + BuildContent). Ver docs/editor-workspace.md.

// Herramientas del riel. Las que traen `Panel` ya funcionan; las demás llegan en las
// siguientes etapas (drag & drop de elementos y stickers, Lia, etc.).
// Riel de 4 (handoff "Panel lateral"): el panel lateral es para AGREGAR; lo
// que modifica lo elegido va en las barras de arriba de la pieza.
// `hidden`: paneles sin botón en el riel que abren las barras (Color, el
// o Elementos → Texto (Lia); los pickers de imagen abren Subidos en modo
// "elegir" (mediaRequest); `parent` es el
// botón del riel que se ve encendido mientras están abiertos.
const TOOLS = [
    { id: 'design', icon: Palette, Panel: DesignPanel },
    { id: 'elements', icon: Shapes, Panel: ElementsPanel },
    { id: 'photos', icon: Images, Panel: PhotosPanel },
    { id: 'uploads', icon: CloudUpload, Panel: UploadsPanel },
    { id: 'ai', icon: WandSparkles, Panel: AiTextPanel, hidden: true, parent: 'elements' },
]

// Bloques (no portada ni generales): al elegirlos sale su barra de fondo.
const BLOCKS = new Set(['greeting', 'family', 'quote', 'itinerary', 'dresscode', 'gifts', 'destinations', 'notices', 'gallery'])

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

// Teclado de pantalla (iPad): tapa la mitad de abajo y el editor no hace
// scroll, así que el texto que se está escribiendo en la pieza quedaba
// debajo. La pieza avisa dónde quedó ese texto (REMOTE_TEXT_FOCUS) y el
// escenario sube lo justo para dejarlo arriba del teclado, sin pasarse del
// header y la barra de texto. Sin teclado (o en computadora) vale 0.
const KEYBOARD_MIN = 120   // menos que esto no es un teclado (barra de atajos)
const LIFT_TOP = 140       // header (60) + barra de texto
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
            // Al abrir el teclado Safari recorre la página hacia arriba y al
            // cerrarlo la deja así: el editor (alto fijo) quedaba cortado bajo
            // el header. Se regresa arriba.
            if (covered >= KEYBOARD_MIN) hadKeyboard = true
            else if (hadKeyboard) { hadKeyboard = false; if (window.scrollY) window.scrollTo(0, 0) }
            if (!focus?.rect || covered < KEYBOARD_MIN || !focus.frame?.isConnected) { if (liftRef.current) apply(0); return }
            const box = focus.frame.getBoundingClientRect()
            const scale = focus.frame.offsetHeight ? box.height / focus.frame.offsetHeight : 1
            // Posición sin el desplazamiento que ya se aplicó.
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
    // Número o 'fit' (ajustar a la pantalla). Si al 80% la tarjeta no cabe
    // entre el header y el dock (iPad horizontal, laptops chicas), arranca en
    // Ajustar.
    const [zoomMode, setZoomMode] = useState(() => ((window.innerHeight - 60 - 150) / 780 < 0.8 ? 'fit' : 0.8))
    const vp = useViewport()
    const keyboardLift = useKeyboardLift()

    // El panel de herramienta flota encima del tablero: abrirlo no recorre la
    // invitación.
    // Cerrado: igual a los dos lados para que la pieza quede al centro. Con el
    // panel de herramienta abierto (riel 65 + panel 340), la pieza y el dock
    // se recorren al centro del espacio que queda (también en "Ver en vivo",
    // donde el panel se queda a la vista aunque apagado).
    const panelOpen = toolOpen
    const padL = panelOpen ? 405 : 96
    // El panel Capas flota a la derecha y no cuenta en el centrado de la pieza;
    // con el panel de herramienta abierto la pieza ya se recorre, así que ahí
    // sí se le deja su espacio para que Capas no la tape.
    const padR = panelOpen ? 248 : 96
    // "Ajustar": que la tarjeta (390 × 780) quepa entre los paneles y entre
    // el header y el dock.
    const fitScale = Math.min(1, Math.max(ZOOM_MIN, Math.min((vp.w - padL - padR) / 410, (vp.h - 60 - 150) / 780)))
    // En vivo, iPad y Mac son más grandes que la tarjeta: nunca pasan de lo que cabe.
    // iPad: vertical u horizontal (botón de girar en el dock).
    const [landscape, setLandscape] = useState(false)
    const [rotated, setRotated] = useState(false)
    const fitFor = (d) => Math.min(1, Math.max(0.2, Math.min((vp.w - padL - padR) / (d.w + 40), (vp.h - 60 - 150) / (d.h + 20))))
    // El iPad usa el mismo zoom de pie y acostado: al girar no cambia de tamaño.
    const liveFit = device === 'ipad'
        ? Math.min(fitFor(DEVICE_SIZES.ipad), fitFor(DEVICE_SIZES.ipadLandscape))
        : fitFor(DEVICE_SIZES[device] ?? DEVICE_SIZES.ios)
    const bigDevice = live && (device === 'ipad' || device === 'mac')
    const zoom = bigDevice ? Math.min(zoomMode === 'fit' ? liveFit : zoomMode, liveFit) : zoomMode === 'fit' ? fitScale : zoomMode
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

    // Elemento suelto elegido en la pieza (REMOTE_LAYER_SELECT vía ReactHost):
    // su barra de propiedades va arriba del teléfono y su color se elige en el
    // panel "Color". Se cambia directo en invitation.decorations.
    const [selectedLayer, setSelectedLayer] = useState(null)
    const [colorField, setColorField] = useState(null)
    useEffect(() => {
        const onSel = (e) => setSelectedLayer(e.detail ?? null)
        window.addEventListener('iattend-layer-selection', onSel)
        return () => window.removeEventListener('iattend-layer-selection', onSel)
    }, [])
    const selectedItem = selectedLayer && !live
        ? (invitation?.decorations?.[selectedLayer.section] ?? []).find((it) => it.id === selectedLayer.id) ?? null
        : null
    // `opts` ({ snapshot }) llega de los sliders: cambios en vivo sin llenar el deshacer.
    const patchItem = (patch, opts) => {
        if (!selectedLayer) return
        const { section, id } = selectedLayer
        setInvitation((prev) => ({
            ...prev,
            decorations: {
                ...(prev.decorations ?? {}),
                [section]: (prev.decorations?.[section] ?? []).map((it) => (it.id === id ? { ...it, ...patch } : it)),
            },
        }), opts)
        setSaved(false)
    }
    // Ícono de un momento (tocar su ícono en la pieza): { index }.
    // Abre Elementos en la categoría Íconos (ahí están también los del itinerario).
    const [iconRequest, setIconRequest] = useState(null)
    const openIconPanel = (index) => {
        setIconRequest({ index, n: Date.now() })
        setActiveTool('elements')
        setToolOpen(true)
    }
    // Al cerrar el panel o cambiar de herramienta, se suelta.
    useEffect(() => {
        if (!toolOpen || activeTool !== 'elements') setIconRequest(null)
    }, [toolOpen, activeTool])

    // Lia en la barra de texto: lee el texto elegido y lo reemplaza con
    // onFieldChange (el mismo camino que escribir encima, con su idioma).
    const liaFor = () => {
        const path = activeText === 'cover' ? 'cover.title.text.value'
            : activeText === 'quote' ? 'quote.text.font.value'
            : activeText === 'field' ? textField?.path : null
        if (!path || !onFieldChange) return null
        const current = path.split('.').reduce((o, k) => o?.[k], invitation)
        return {
            invitationID,
            lang: activeLang,
            current: typeof current === 'string' ? current : '',
            kind: activeText === 'cover' || textField?.kind === 'title' ? 'title' : 'body',
            onApply: (text) => onFieldChange(path, text),
        }
    }

    // Color (handoff 5.1): popover anclado al botón de la barra que lo pidió.
    // Las barras llaman pickColor(campo) sin evento, así que el ancla es el
    // último botón que se presionó (se guarda en pointerdown).
    const [colorPop, setColorPop] = useState(null)
    const lastPress = useRef(null)
    useEffect(() => {
        const onDown = (e) => {
            const btn = e.target.closest?.('button')
            if (btn) lastPress.current = btn.getBoundingClientRect()
        }
        window.addEventListener('pointerdown', onDown, true)
        return () => window.removeEventListener('pointerdown', onDown, true)
    }, [])
    // Tocar otra vez el mismo botón lo cierra (el clic de afuera ya lo cerró
    // en el pointerdown; no se vuelve a abrir).
    const colorClosed = useRef(null)
    const closeColor = () => { colorClosed.current = { field: colorField, t: Date.now() }; setColorPop(null) }
    const pickColor = (field) => {
        const r = lastPress.current
        const c = colorClosed.current
        if (c && c.field === field && Date.now() - c.t < 400) return
        if (colorPop && colorField === field) { closeColor(); return }
        setColorField(field)
        setColorPop(r ? { x: r.left, y: r.top, w: r.width, h: r.height } : { x: window.innerWidth / 2, y: 80, w: 0, h: 0 })
    }

    // Texto elegido (título de la portada / texto de la Cita): barra de texto
    // arriba de la pieza en vez del popover (EditCanvas → onTextTool).
    const [textTarget, setTextTarget] = useState(null)
    // Texto de un bloque elegido en la pieza ({ path, kind } por REMOTE_TEXT_FIELD).
    const [textField, setTextField] = useState(null)
    useEffect(() => {
        const onField = (e) => setTextField(e.detail ?? null)
        window.addEventListener('iattend-text-field', onField)
        return () => window.removeEventListener('iattend-text-field', onField)
    }, [])
    // Candado: cerrado = los cambios van a todos los títulos / cuerpos.
    const [textLocked, setTextLocked] = useState(() => localStorage.getItem('iattend_text_lock') !== 'open')
    const toggleTextLock = () => setTextLocked((v) => {
        localStorage.setItem('iattend_text_lock', v ? 'open' : 'closed')
        return !v
    })
    const activeText = textTarget ?? (textField && !live ? 'field' : null)
    const ts = textStyleFor({ target: activeText, field: textField, locked: textLocked, invitation, setInvitation, setSaved })

    // Fondo de un bloque: la barra de fondo sale al elegir el bloque en la
    // pieza (o con su brocha / "Cambiar fondo"); se va al tocar el tablero.
    const [toolModule, setToolModule] = useState(null)
    const [pieceModule, setPieceModule] = useState(null)
    const moduleTarget = toolModule ?? pieceModule
    const selectFromPiece = (type, field) => {
        setPieceModule(BLOCKS.has(type) ? type : null)
        onSelectSection?.(type, field)
    }
    const moduleLabel = moduleTarget === 'family' ? 'people' : moduleTarget
    const moduleBg = moduleTarget ? invitation?.[moduleLabel]?.dynamic_background : null
    const quoteImageOn = moduleTarget === 'quote' && Boolean(invitation?.quote?.image?.active)
    const setModuleColor = (c, o) => {
        setInvitation((prev) => {
            const cur = prev[moduleLabel]
            const none = c === 'transparent'
            return {
                ...prev,
                [moduleLabel]: {
                    ...cur,
                    dynamic_background: { ...cur.dynamic_background, active: !none, ...(none ? {} : { custom_color: c }) },
                    // Cita: color o imagen, no los dos.
                    ...(moduleLabel === 'quote' && !none ? { image: { ...cur.image, active: false } } : {}),
                },
            }
        }, o)
        setSaved(false)
    }

    // Separador de un bloque: barra del separador.
    const [separatorTarget, setSeparatorTarget] = useState(null)
    // Barra de un campo: imagen / dirección de un momento, imagen de un
    // destino ("moment_address:2") o la paleta del dresscode ("dress_colors").
    const [fieldBar, setFieldBar] = useState(null)
    // Donde EditCanvas pinta el panel Capas (a la derecha del área de trabajo).
    const [layersEl, setLayersEl] = useState(null)
    // Paleta del dresscode: el color elegido en su barra (se pinta en "Color").
    const [dressIndex, setDressIndex] = useState(null)
    const dressColors = invitation?.dresscode?.colors ?? []
    const setDressColors = (next, o) => {
        setInvitation((prev) => ({ ...prev, dresscode: { ...prev.dresscode, colors: next } }), o)
        setSaved(false)
    }
    useEffect(() => { if (fieldBar !== 'dress_colors') setDressIndex(null) }, [fieldBar])
    const sepLabel = separatorTarget === 'family' ? 'people' : separatorTarget
    const setSeparatorColor = (c, o) => {
        setInvitation((prev) => ({
            ...prev,
            [sepLabel]: { ...prev[sepLabel], dynamic_separator: { ...prev[sepLabel].dynamic_separator, color: c === 'transparent' ? null : c } },
        }), o)
        setSaved(false)
    }

    // A qué se le pone color en el panel "Color": el texto (si su barra está
    // abierta y se pidió ahí), el fondo del bloque o el elemento elegido.
    const colorTarget = fieldBar === 'dress_colors' && colorField === 'dress' && dressIndex != null && dressColors[dressIndex]
        ? {
            label: t('build_editor.dress_color'),
            value: dressColors[dressIndex],
            allowNone: false,
            onPick: (c, o) => setDressColors(dressColors.map((x, i) => (i === dressIndex ? c : x)), o),
        }
        : fieldBar === 'cover_media' && colorField === 'cover_shadow'
        ? {
            label: t('build_cover.fx_color'),
            value: invitation?.cover?.image?.shadow_settings?.color,
            allowNone: false,
            onPick: (c, o) => {
                setInvitation((prev) => ({
                    ...prev,
                    cover: { ...prev.cover, image: { ...prev.cover.image, shadow_settings: { ...(prev.cover.image?.shadow_settings ?? {}), color: c } } },
                }), o)
                setSaved(false)
            },
        }
        : colorField === 'date'
        ? {
            label: t('build_cover.section_date'),
            value: invitation?.cover?.date?.color ?? invitation?.cover?.title?.text?.color,
            allowNone: false,
            onPick: (c, o) => {
                setInvitation((prev) => ({ ...prev, cover: { ...prev.cover, date: { ...prev.cover.date, color: c } } }), o)
                setSaved(false)
            },
        }
        : moduleTarget === 'quote' && colorField === 'shadow'
        ? {
            label: t('build_cover.fx_color'),
            value: invitation?.quote?.image?.shadow_settings?.color,
            allowNone: false,
            onPick: (c, o) => {
                setInvitation((prev) => ({
                    ...prev,
                    quote: { ...prev.quote, image: { ...prev.quote.image, shadow_settings: { ...(prev.quote.image?.shadow_settings ?? {}), color: c } } },
                }), o)
                setSaved(false)
            },
        }
        : separatorTarget && colorField === 'separator'
        ? {
            label: t('build_editor.sep_color'),
            value: invitation?.[sepLabel]?.dynamic_separator?.color || invitation?.generals?.colors?.accent,
            // "Sin color" = el de textos del tema.
            allowNone: true,
            onPick: setSeparatorColor,
        }
        : moduleTarget && colorField === 'module'
        ? {
            label: t('build_editor.bg_color_label'),
            value: moduleBg?.active && !quoteImageOn ? (moduleBg.custom_color || invitation?.generals?.colors?.secondary) : 'transparent',
            allowNone: true,
            onPick: setModuleColor,
        }
        : ts && colorField === 'text'
        ? { label: t('build_editor.tb_text_color'), value: ts.font?.color, allowNone: false, onPick: (c, o) => ts.setFont({ color: c }, o) }
        : selectedItem
            ? (() => {
                const field = colorField === 'stroke' && selectedItem.kind === 'shape' ? 'stroke' : 'color'
                return {
                    label: t(field === 'stroke' ? 'build_editor.eb_stroke_color' : selectedItem.kind === 'shape' ? 'build_editor.eb_fill' : 'build_menu.color'),
                    value: selectedItem[field],
                    allowNone: field === 'color' && selectedItem.kind === 'shape',
                    onPick: (c, o) => patchItem(field === 'stroke'
                        ? { stroke: c, strokeWidth: (selectedItem.strokeWidth ?? 0) > 0 ? selectedItem.strokeWidth : 2 }
                        : { color: c }, o),
                }
            })()
            : null

    // Banco de imágenes y videos: los pickers de la pieza (StorageImages)
    // abren el panel "Imágenes" con su pedido en vez de su dropdown. El pedido
    // se suelta al cerrar el panel o cambiar de herramienta.
    const [mediaRequest, setMediaRequest] = useState(null)
    const mediaSider = useMemo(() => ({
        open: (request) => {
            setMediaRequest({ ...request, n: Date.now() })
            window.dispatchEvent(new Event('iattend-close-popovers'))
            setActiveTool('uploads')
            setToolOpen(true)
        },
    }), [])
    useEffect(() => {
        if (!toolOpen || activeTool !== 'uploads') setMediaRequest(null)
    }, [toolOpen, activeTool])

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
        <MediaSiderContext.Provider value={mediaSider}>
        <div className={styles.workspace}>
            {/* ── Riel y panel de herramienta ── */}
            <div className={styles.left} data-live={live || undefined} data-edit-keep data-editor-left>
                <div className={styles.rail}>
                    {TOOLS.filter((item) => !item.hidden).map((item) => (
                        <div key={item.id} className={styles.railItem}>
                            {item.divider && <span className={styles.railDivider} />}
                            <Tooltip title={t(`build_editor.tool_${item.id}`)} placement="right">
                                <button
                                    type="button"
                                    className={styles.railButton}
                                    data-on={(toolOpen && (activeTool === item.id || TOOLS.find((x) => x.id === activeTool)?.parent === item.id)) || undefined}
                                    onClick={() => pickTool(item.id)}
                                >
                                    {/* Solo el ícono; el nombre va en el tooltip. */}
                                    <item.icon size={20} />
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
                        <div className={`${styles.toolBody} scroll-invitation`} data-tool-body>
                            {tool.Panel ? (
                                <tool.Panel invitation={invitation} invitationID={invitationID} setInvitation={setInvitation} setSaved={setSaved} onSelectSection={onSelectSection} selectedSection={selectedSection} onOpenTool={(id) => { setActiveTool(id); setToolOpen(true) }} activeLang={activeLang} mediaRequest={mediaRequest} clearMedia={() => setMediaRequest(null)} colorTarget={colorTarget} iconRequest={iconRequest} clearIconRequest={() => setIconRequest(null)} />
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
            {/* Tocar el tablero fuera de la pieza (y de sus columnas y popovers)
                suelta lo elegido dentro: módulos, textos y elementos sueltos. */}
            <div
                className={styles.stage}
                // Con la barra del elemento arriba, la pieza baja para no quedar debajo.
                style={{
                    padding: `${selectedItem || ts || moduleTarget || separatorTarget || fieldBar ? 92 : 20}px ${padR}px 92px ${padL}px`,
                    // Teclado de pantalla: la pieza sube para no tapar el texto.
                    transform: keyboardLift ? `translateY(-${keyboardLift}px)` : undefined,
                    transition: 'padding 0.25s ease, transform 0.25s ease',
                }}
                onPointerDown={!live ? (e) => {
                    if (!e.target.closest('[data-tour="preview"], [data-edit-keep], .ant-dropdown, .ant-popover, .ant-select-dropdown, .ant-color-picker')) {
                        setPieceModule(null)
                        onCanvasBlur?.()
                    }
                } : undefined}
            >
                {live ? (
                    <div className={styles.canvasScale} style={{ transform: `scale(${zoom})` }}>
                        <DevicePreview device={device} landscape={landscape} rotated={rotated}>
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
                            onSelectSection={selectFromPiece}
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
                            onTextTool={setTextTarget}
                            onModuleTool={setToolModule}
                            onSeparatorTool={setSeparatorTarget}
                            onFieldBar={setFieldBar}
                            layersTarget={layersEl}
                            onDateColor={() => pickColor('date')}
                            onIconTool={openIconPanel}
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
            {/* ── Popover de color (lo abren los botones de color de las barras) ── */}
            {colorPop && colorTarget && !live && (
                <Popover
                    open
                    trigger="click"
                    placement="bottom"
                    arrow={false}
                    onOpenChange={(v) => { if (!v) closeColor() }}
                    content={(
                        <div data-text-bar>
                            <ColorChooser
                                value={colorTarget.value}
                                allowNone={colorTarget.allowNone}
                                palette={invitationPalette(invitation)}
                                onChange={(c, o) => colorTarget.onPick(c, o)}
                            />
                        </div>
                    )}
                >
                    <span style={{ position: 'fixed', left: colorPop.x, top: colorPop.y, width: colorPop.w, height: colorPop.h, pointerEvents: 'none' }} />
                </Popover>
            )}

            {/* ── Capas: EditCanvas pinta aquí el orden de los módulos (portal) ── */}
            {!live && <div ref={setLayersEl} className={styles.layersDock} />}

            {/* ── Barra de un campo (momento, destino, paleta del dresscode) ── */}
            {fieldBar && !selectedItem && !ts && !live && (
                <div className={styles.elementBar} style={{ left: `calc(${padL}px + (100% - ${padL + padR}px) / 2)` }}>
                    {fieldBar === 'cover_media' ? (
                        <CoverMediaBar
                            invitation={invitation}
                            setInvitation={setInvitation}
                            setSaved={setSaved}
                            onPickMedia={(req, handleImage) => mediaSider.open({ ...req, invitationID, handleImage })}
                            onPickShadowColor={() => pickColor('cover_shadow')}
                        />
                    ) : fieldBar === 'date' ? (
                        <DateBar
                            invitation={invitation}
                            setInvitation={setInvitation}
                            setSaved={setSaved}
                            onPickColor={() => pickColor('date')}
                            colorOpen={Boolean(colorPop) && colorField === 'date'}
                        />
                    ) : fieldBar === 'song' ? (
                        <SongBar invitation={invitation} invitationID={invitationID} setInvitation={setInvitation} setSaved={setSaved} />
                    ) : fieldBar.startsWith('gift_card:') ? (
                        <GiftCardBar
                            key={fieldBar}
                            index={Number(fieldBar.split(':')[1])}
                            invitation={invitation}
                            setInvitation={setInvitation}
                            setSaved={setSaved}
                        />
                    ) : fieldBar.startsWith('dress_link:') ? (
                        <LinkBar
                            key={fieldBar}
                            index={Number(fieldBar.split(':')[1])}
                            invitation={invitation}
                            setInvitation={setInvitation}
                            setSaved={setSaved}
                        />
                    ) : fieldBar === 'dress_images' || fieldBar === 'gallery_images' ? (
                        <ImagesBar
                            module={fieldBar === 'gallery_images' ? 'gallery' : 'dresscode'}
                            invitation={invitation}
                            setInvitation={setInvitation}
                            setSaved={setSaved}
                            onPickImage={(type, handleImage) => mediaSider.open({ type, invitationID, handleImage })}
                        />
                    ) : fieldBar === 'dress_colors' ? (
                        <PaletteBar
                            colors={dressColors}
                            selected={dressIndex}
                            onSelect={(i) => { setDressIndex(i); pickColor('dress') }}
                            onAdd={() => {
                                setDressColors([...dressColors, dressColors[dressColors.length - 1] ?? '#C9B79C'])
                                setDressIndex(dressColors.length)
                                pickColor('dress')
                            }}
                            onRemove={(i) => {
                                // El nombre se va con su color (color_names va en el mismo orden).
                                setInvitation((prev) => ({
                                    ...prev,
                                    dresscode: {
                                        ...prev.dresscode,
                                        colors: (prev.dresscode?.colors ?? []).filter((_, j) => j !== i),
                                        ...(prev.dresscode?.color_names ? { color_names: prev.dresscode.color_names.filter((_, j) => j !== i) } : {}),
                                    },
                                }))
                                setSaved(false)
                                setDressIndex(null)
                            }}
                            invitation={invitation}
                            setInvitation={setInvitation}
                            setSaved={setSaved}
                        />
                    ) : (
                        <MomentBar
                            key={fieldBar}
                            field={fieldBar}
                            invitation={invitation}
                            setInvitation={setInvitation}
                            setSaved={setSaved}
                            onPickImage={(handleImage) => mediaSider.open({ invitationID, handleImage })}
                        />
                    )}
                </div>
            )}

            {/* ── Barra del separador de un bloque ── */}
            {/* Tocar el separador también elige su bloque: esta barra le gana a
                la de fondo. */}
            {separatorTarget && !fieldBar && !selectedItem && !ts && !live && (
                <div className={styles.elementBar} style={{ left: `calc(${padL}px + (100% - ${padL + padR}px) / 2)` }}>
                    <SeparatorBar
                        section={separatorTarget}
                        invitation={invitation}
                        setInvitation={setInvitation}
                        setSaved={setSaved}
                        onPickColor={() => pickColor('separator')}
                        colorOpen={Boolean(colorPop) && colorField === 'separator'}
                        onPickImage={(handleImage) => mediaSider.open({ invitationID, handleImage })}
                    />
                </div>
            )}

            {/* ── Barra de fondo de un bloque ── */}
            {moduleTarget && !separatorTarget && !fieldBar && !selectedItem && !ts && !live && (
                <div className={styles.elementBar} style={{ left: `calc(${padL}px + (100% - ${padL + padR}px) / 2)` }}>
                    <ModuleBar
                        section={moduleTarget}
                        invitation={invitation}
                        setInvitation={setInvitation}
                        setSaved={setSaved}
                        onPickColor={() => pickColor('module')}
                        colorOpen={Boolean(colorPop) && colorField === 'module'}
                        onPickImage={(handleImage) => mediaSider.open({ type: moduleTarget === 'quote' ? 'quote' : undefined, invitationID, handleImage })}
                        onPickShadowColor={() => pickColor('shadow')}
                    />
                </div>
            )}

            {/* ── Barra de texto (título / Cita) ── */}
            {ts && !selectedItem && !live && (
                <div className={styles.elementBar} style={{ left: `calc(${padL}px + (100% - ${padL + padR}px) / 2)` }}>
                    <TextBar
                        target={activeText}
                        ts={ts}
                        lock={activeText === 'field' ? { locked: textLocked, kind: textField?.kind, onToggle: toggleTextLock } : null}
                        lia={liaFor()}
                        invitation={invitation}
                        setInvitation={setInvitation}
                        setSaved={setSaved}
                        onPickColor={() => pickColor('text')}
                        colorOpen={Boolean(colorPop) && colorField === 'text'}
                    />
                </div>
            )}

            {/* ── Barra del elemento elegido (arriba de la pieza) ── */}
            {selectedItem && (
                <div className={styles.elementBar} style={{ left: `calc(${padL}px + (100% - ${padL + padR}px) / 2)` }}>
                    <ElementBar
                        item={selectedItem}
                        accent={invitation?.generals?.colors?.accent ?? '#29262D'}
                        onPatch={patchItem}
                        onPickColor={pickColor}
                        colorOpen={colorPop ? colorField : null}
                    />
                </div>
            )}

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

                {/* iOS / Android: siempre montado para que el dock crezca y se
                    encoja suave al entrar y salir de "Ver en vivo". */}
                <div className={styles.devicesWrap} data-open={live || undefined} aria-hidden={!live || undefined}>
                    <div className={styles.devicesInner}>
                        <div className={styles.segment} data-tour="devices">
                            {/* Android quedó oculto (DevicePreview lo sigue soportando). */}
                            {[['ios', <Smartphone key="i" size={14} />, 'iPhone'], ['ipad', <Tablet key="t" size={14} />, 'iPad'], ['mac', <Laptop key="l" size={14} />, 'Mac']].map(([d, icon, label]) => (
                                <button key={d} type="button" tabIndex={live ? undefined : -1} className={`${styles.segBtn} ${styles.segSmall}`} data-on={device === d || undefined} onClick={() => setDevice(d)}>
                                    {icon} {label}
                                </button>
                            ))}
                        </div>
                        {/* Girar el iPad: solo con él elegido. */}
                        <div className={styles.rotateWrap} data-open={(live && device === 'ipad') || undefined}>
                            <div className={styles.devicesInner}>
                                <Tooltip title={t('build_editor.rotate_device')}>
                                    <button
                                        type="button"
                                        tabIndex={live && device === 'ipad' ? undefined : -1}
                                        className={styles.dockIcon}
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
        </MediaSiderContext.Provider>
    )
}
