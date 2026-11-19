import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message } from 'antd'
import { CloudUpload, FileText, Images, MousePointerClick, Palette, PenLine, Shapes, Ticket, WandSparkles } from 'lucide-react'
import ReactHost from '../../../../components/Host/ReactHost'
import { EditCanvas } from './EditCanvas'
import { EditorShell } from '../../../Editor/EditorShell'
import { EditorMovilShell } from '../../../Editor/EditorMovilShell'
import { useColorPopover } from '../../../Editor/useColorPopover'
import { ColorPopover } from '../../../Editor/ColorPopover'
import { copiaDeElemento, useElementClipboard } from '../../../Editor/useElementClipboard'
import { DesignPanel } from './ToolPanels'
import { PhotosPanel } from './PhotosPanel'
import { UploadsPanel } from './UploadsPanel'
import { ElementsPanel } from './LayerPanels'
import { AiTextPanel } from './AiTextPanel'
import { WalletPanelInvitacion } from './WalletPanelInvitacion'
import { PdfToolPanel } from '../../Pdf/PdfToolPanel'
import { BotonesPanel } from '../../Pdf/BotonesPanel'
import { PdfBar } from '../../Pdf/PdfBar'
import { esPdf, SECCION_PDF } from '../../Pdf/pdfInvitacion'
import { PaletaDibujo } from '../../../SideEvents/Workspace/PaletaDibujo'
import { DibujoBar } from '../../../SideEvents/Workspace/SideBars'
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
import { addLayerItem, countStickers, MAX_STICKERS, stickerItem, uploadStickers } from './layerItems'

// Área de trabajo del editor en escritorio (handoff "Editor Workspace"):
// tablero de puntos con el riel de herramientas y su panel a la izquierda, la
// invitación editable al centro (EditCanvas) o dentro del teléfono en "Ver en
// vivo", el panel Secciones a la derecha y el dock abajo. En celular sigue el
// editor de antes (BuildMenu + BuildContent). Ver docs/editor-workspace.md.
// Con `movil` (celular, BuildPage): la misma lógica (herramientas, paneles,
// barras, color, Ver en vivo) en el cascarón del celular, EditorMovilShell,
// con el diseño del editor del Pop. Ver docs/editor-movil-invitacion.md.

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
    // Dibujar a mano sobre la pieza, igual que en un Pop (solo escritorio):
    // abre el modo dibujo a pantalla completa; cada trazo es un elemento
    // "Dibujo" de la sección donde empieza (decorations.<sección>).
    { id: 'draw', icon: PenLine, Panel: null },
    { id: 'uploads', icon: CloudUpload, Panel: UploadsPanel },
    // Simulador del pase de Apple Wallet de los invitados (foto, título, lugar principal).
    { id: 'wallet', icon: Ticket, Panel: WalletPanelInvitacion },
    // Invitación en PDF: cambia el editor por EditorPdf (BuildPage). docs/invitacion-pdf.md
    { id: 'pdf', icon: FileText, Panel: PdfToolPanel },
    // Solo con la invitación en PDF: botones con link encima del PDF, como
    // stickers (decorations.pdf, kind 'boton'). Pdf/BotonesPanel.jsx.
    // `destacado`: en el riel siempre se ve como activo, para que se note.
    { id: 'buttons', icon: MousePointerClick, Panel: BotonesPanel, soloPdf: true, destacado: true },
    { id: 'ai', icon: WandSparkles, Panel: AiTextPanel, hidden: true, parent: 'elements' },
]

// Bloques (no portada ni generales): al elegirlos sale su barra de fondo.
const BLOCKS = new Set(['greeting', 'family', 'quote', 'itinerary', 'dresscode', 'gifts', 'destinations', 'notices', 'gallery'])

export const EditorWorkspace = ({
    invitation, invitationID,
    // Plan de la invitación: "Ver en vivo" la enseña como la ve el invitado
    // (dock Pro, barra Lite…), también ya confirmada.
    plan,
    positionY, onSectionChange, activeLang, textureOverride, fontOverride, onHostReady,
    live, setLive, device, setDevice, onUndo, onRedo, canUndo, canRedo, onReplayTour,
    selectedSection, onSelectSection, onFieldChange, selectedField, onClearField, onCanvasBlur, deselectSignal,
    setInvitation, setSaved,
    // Celular: cascarón EditorMovilShell. `onBack` (salir), `headerDerecha`
    // (lo de la derecha del header: Publicar) y `estado` (debajo del header).
    movil = false, onBack, headerDerecha, estado,
}) => {
    const { t } = useTranslation()

    const [activeTool, setActiveTool] = useState('elements')
    // "Ver en vivo" → Sin confirmar / Confirmado (como en side events / Pop).
    const [vistaConfirmada, setVistaConfirmada] = useState(false)
    const [toolOpen, setToolOpen] = useState(false)
    const pickTool = (id) => {
        if (id === activeTool) { setToolOpen((o) => !o); return }
        setActiveTool(id)
        setToolOpen(true)
    }

    // Elemento suelto elegido en la pieza (REMOTE_LAYER_SELECT vía ReactHost):
    // su barra de propiedades va arriba del teléfono y su color se elige en el
    // panel "Color". Se cambia directo en invitation.decorations.
    const [selectedLayer, setSelectedLayer] = useState(null)
    const { colorField, colorPop, pickColor, closeColor } = useColorPopover()
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
    // ⌘C / ⌘X / ⌘V del elemento elegido (useElementClipboard, el de todos los
    // editores): se pega en el módulo elegido ahora (en la pieza o en Capas).
    useElementClipboard({
        enabled: !live,
        copy: () => (selectedItem ? { items: [selectedItem], section: selectedLayer.section } : null),
        cut: () => {
            const { section, id } = selectedLayer
            setInvitation((prev) => ({ ...prev, decorations: { ...(prev.decorations ?? {}), [section]: (prev.decorations?.[section] ?? []).filter((it) => it.id !== id) } }))
            setSaved(false)
            setSelectedLayer(null)
        },
        paste: (clip) => {
            const destino = selectedSection === 'cover' || BLOCKS.has(selectedSection) ? selectedSection : clip.section
            if (!destino) return
            // Un PNG de un Pop no trae `kind`: en la invitación es un sticker.
            const copias = clip.items.map((it, i) => ({ kind: 'sticker', ...copiaDeElemento(it, destino === clip.section, i) }))
            setInvitation((prev) => ({ ...prev, decorations: { ...(prev.decorations ?? {}), [destino]: [...(prev.decorations?.[destino] ?? []), ...copias] } }))
            setSaved(false)
            // Se elige en la pieza cuando ya llegó con la invitación nueva.
            setTimeout(() => window.dispatchEvent(new CustomEvent('iattend-host-layer-select', { detail: { section: destino, id: copias[0].id } })), 250)
        },
    })

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
    // Invitación en PDF: la pieza es el PDF y su única capa es "PDF"; elegirla
    // enseña su barra (PdfBar). El riel sigue igual. Ver docs/invitacion-pdf.md.
    const enPdf = esPdf(invitation)
    const [pdfElegido, setPdfElegido] = useState(false)
    // Al cambiar a PDF (Mi PDF) queda elegido, con su barra a la vista.
    useEffect(() => { setPdfElegido(enPdf) }, [enPdf])
    // Herramientas del riel: Botones solo con la invitación en PDF.
    const herramientas = TOOLS.filter((x) => !x.soloPdf || enPdf)
    useEffect(() => { if (!enPdf && activeTool === 'buttons') setActiveTool('elements') }, [enPdf, activeTool])
    const seccionPieza = enPdf ? (pdfElegido ? SECCION_PDF : null) : selectedSection
    const selectFromPiece = (type, field) => {
        setPdfElegido(type === SECCION_PDF)
        setPieceModule(BLOCKS.has(type) ? type : null)
        onSelectSection?.(type, field)
    }

    /* ── Dibujar (la misma herramienta de un Pop, SideWorkspace) ──
       El pincel se recuerda en la sesión del editor. Siempre a pantalla
       completa (EditorShell `inmersivo`): la pieza a todo su largo, la paleta a
       la derecha (PaletaDibujo) y la barra arriba (DibujoBar). Los trazos los
       ancla la pieza a su sección (EditCanvas `dibujo` → REMOTE_DIBUJO).
       `trazos`: lo dibujado (o borrado) en esta sesión, para "Borrar todo". */
    const [pincel, setPincel] = useState({ brush: 'pluma', color: '#FFFFFF', size: 8, opacity: 100 })
    const [trazos, setTrazos] = useState([])
    const modoDibujo = !movil && !live && toolOpen && activeTool === 'draw'
    const [pincelActivo, setPincelActivo] = useState(true)
    const [seleccionando, setSeleccionando] = useState(false)
    // Elegido en Capas (un trazo): abre Dibujar con la pluma de selección.
    const selAlEntrar = useRef(null)
    // { section, id } del trazo que llega elegido (va con las propiedades de
    // la pieza: al entrar, la pieza se vuelve a cargar en el tablero inmersivo).
    const [selDibujo, setSelDibujo] = useState(null)
    useEffect(() => {
        if (!modoDibujo) {
            // Al salir, ningún trazo queda elegido.
            setSelDibujo(null)
            if (selectedLayer) { setSelectedLayer(null); onCanvasBlur?.() }
            return
        }
        setPincelActivo(true)
        setSeleccionando(Boolean(selAlEntrar.current))
        setSelDibujo(selAlEntrar.current)
        selAlEntrar.current = null
        setPieceModule(null)
        setTextField(null)
        setPdfElegido(false)
    }, [modoDibujo])
    useEffect(() => {
        const abrir = (e) => {
            if (movil || live) return
            selAlEntrar.current = e.detail ?? null
            setActiveTool('draw')
            setToolOpen(true)
        }
        window.addEventListener('iattend-abrir-dibujo', abrir)
        return () => window.removeEventListener('iattend-abrir-dibujo', abrir)
    }, [movil, live])
    const tomarPincel = () => { setPincelActivo(true); setSeleccionando(false) }
    // Un trazo guardado por la pieza: sus secciones cambiadas, un paso de deshacer.
    const onDibujo = ({ cambios, tipo, id, section }) => {
        setInvitation((prev) => ({ ...prev, decorations: { ...(prev.decorations ?? {}), ...cambios } }))
        setSaved(false)
        setTrazos((x) => [...x, { tipo, id, section }])
    }
    const deshacerTrazo = () => { onUndo?.(); setTrazos((x) => x.slice(0, -1)) }
    const borrarTodo = () => {
        const mios = trazos.filter((x) => x.id && x.section)
        if (mios.length) {
            setInvitation((prev) => {
                const decor = { ...(prev.decorations ?? {}) }
                for (const { id, section } of mios) decor[section] = (decor[section] ?? []).filter((it) => it.id !== id)
                return { ...prev, decorations: decor }
            })
            setSaved(false)
        }
        setTrazos([])
    }
    // Atajos del modo dibujo: P pluma, E borrador, V selección, Esc = Listo
    // (con un trazo elegido, lo suelta). ⌘/Ctrl Z ya deshace en todo el editor.
    useEffect(() => {
        if (!modoDibujo) return
        const onKey = (e) => {
            const el = e.target
            if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable) return
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) setTrazos((x) => x.slice(0, -1))
            else if (e.metaKey || e.ctrlKey || e.altKey) return
            else if (e.key.toLowerCase() === 'p') { setPincel((x) => ({ ...x, brush: 'pluma' })); tomarPincel() }
            else if (e.key.toLowerCase() === 'e') { setPincel((x) => ({ ...x, brush: 'borrador' })); tomarPincel() }
            else if (e.key.toLowerCase() === 'v') { setSeleccionando(true); setPincelActivo(true) }
            else if (e.key === 'Escape') {
                if (selectedLayer) onCanvasBlur?.()
                else setToolOpen(false)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [modoDibujo, selectedLayer])
    // Trazo elegido con la pluma de selección: la paleta enseña Eliminar.
    const trazoElegido = modoDibujo && seleccionando && selectedItem?.kind === 'dibujo' ? selectedLayer : null
    const eliminarTrazo = trazoElegido ? () => {
        setInvitation((prev) => ({
            ...prev,
            decorations: { ...(prev.decorations ?? {}), [trazoElegido.section]: (prev.decorations?.[trazoElegido.section] ?? []).filter((it) => it.id !== trazoElegido.id) },
        }))
        setSaved(false)
        setSelectedLayer(null)
    } : undefined
    const dibujoPieza = modoDibujo ? {
        pincel: pincelActivo && !seleccionando ? pincel : null,
        completa: true,
        sel: selDibujo,
        onDibujo,
    } : null
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
    const colorTarget = modoDibujo && colorField === 'draw'
        ? {
            // Color del pincel: selector estilo iOS con opacidad, hacia el
            // centro (la paleta está a la derecha), como en un Pop.
            ios: true,
            value: pincel.color,
            allowNone: false,
            onPick: (c) => setPincel((x) => ({ ...x, color: c })),
            opacity: pincel.opacity,
            onOpacity: (v) => setPincel((x) => ({ ...x, opacity: v })),
            opacidadMin: 10,
            placement: 'left',
            anclarA: '[data-paleta-dibujo]',
        }
        : fieldBar === 'dress_colors' && colorField === 'dress' && dressIndex != null && dressColors[dressIndex]
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
                // Botón (PDF): fondo, texto y borde, cada uno con su color.
                const boton = selectedItem.kind === 'boton'
                const field = colorField === 'stroke' && (selectedItem.kind === 'shape' || boton) ? 'stroke'
                    : colorField === 'bg' && boton ? 'bg' : 'color'
                return {
                    label: t(field === 'stroke' ? (boton ? 'build_editor.btn_border_color' : 'build_editor.eb_stroke_color')
                        : field === 'bg' ? 'build_editor.btn_bg_color'
                        : boton ? 'build_editor.btn_text_color'
                        : selectedItem.kind === 'shape' ? 'build_editor.eb_fill' : 'build_menu.color'),
                    value: selectedItem[field],
                    allowNone: (field === 'color' && selectedItem.kind === 'shape') || (boton && field === 'stroke'),
                    onPick: (c, o) => patchItem(field === 'stroke'
                        ? (boton && (!c || c === 'transparent')
                            ? { stroke: null, strokeWidth: 0 }
                            : { stroke: c, strokeWidth: (selectedItem.strokeWidth ?? 0) > 0 ? selectedItem.strokeWidth : 2 })
                        : { [field]: c }, o),
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

    // Barra contextual de lo elegido (una a la vez). Prioridad: elemento >
    // texto > campo (momento, paleta, fecha…) > separador > fondo del bloque.
    // Un trazo (Dibujar) solo se edita dentro de Dibujar: fuera, sin su barra.
    const elementoConBarra = selectedItem && !(selectedItem.kind === 'dibujo' && !modoDibujo) ? selectedItem : null
    // En PDF: un elemento elegido lleva su barra (ElementBar); si no, la del PDF.
    // (y la canción, que se elige con el chip de la pieza, lleva la suya).
    const barraPdf = enPdf && !elementoConBarra && fieldBar !== 'song'
    const bar = live ? null
        : modoDibujo ? <DibujoBar trazos={trazos.length} onBorrarTodo={borrarTodo} onListo={() => setToolOpen(false)} />
        : barraPdf ? (pdfElegido ? <PdfBar invitation={invitation} invitationID={invitationID} setInvitation={setInvitation} setSaved={setSaved} /> : null)
        : elementoConBarra ? (
        <ElementBar
            item={elementoConBarra}
            accent={invitation?.generals?.colors?.accent ?? '#29262D'}
            onPatch={patchItem}
            onPickColor={pickColor}
            colorOpen={colorPop ? colorField : null}
        />
        ) : ts ? (
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
        ) : fieldBar ? (<>
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
        </>
        ) : separatorTarget ? (
        <SeparatorBar
            section={separatorTarget}
            invitation={invitation}
            setInvitation={setInvitation}
            setSaved={setSaved}
            onPickColor={() => pickColor('separator')}
            colorOpen={Boolean(colorPop) && colorField === 'separator'}
            onPickImage={(handleImage) => mediaSider.open({ invitationID, handleImage })}
        />
        ) : moduleTarget ? (
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
        ) : null

    // Celular: tocar un elemento / PNG lo agrega (sin arrastrar a la pieza,
    // que queda tapada por el panel) y se cierra el panel; la pieza elige la
    // sección (addLayerItem).
    const elegirMovil = movil ? (item) => { addLayerItem(item, null); setToolOpen(false) } : undefined

    const renderTool = (id) => {
        const item = TOOLS.find((x) => x.id === id)
        return item?.Panel
            ? <item.Panel onElegir={elegirMovil} movil={movil || undefined} {...(movil && id === 'uploads' ? { draggable: false } : {})} invitation={invitation} invitationID={invitationID} setInvitation={setInvitation} setSaved={setSaved} onSelectSection={onSelectSection} selectedSection={selectedSection} onOpenTool={(next) => { setActiveTool(next); setToolOpen(true) }} activeLang={activeLang} mediaRequest={mediaRequest} clearMedia={() => setMediaRequest(null)} colorTarget={colorTarget} iconRequest={iconRequest} clearIconRequest={() => setIconRequest(null)}
                // Elegir foto desde un panel: abre Subidos y, al elegir, regresa al panel.
                onPickImage={(handleImage) => mediaSider.open({ invitationID, handleImage: (url, ...rest) => { handleImage(url, ...rest); setActiveTool(id); setToolOpen(true) } })} />
            : null
    }

    if (movil) {
        return (
            <EditorMovilShell
                tools={herramientas.filter((x) => x.id !== 'draw').map((x) => ({ ...x, title: t(`build_editor.tool_${x.id}`) }))}
                // Diseño a media pantalla (la pieza se ve arriba); Elementos,
                // Fotos, Subidos y Lia a pantalla completa; el pase en modal.
                modos={{ design: 0.5, elements: 1, photos: 1, uploads: 1, ai: 1, wallet: 'modal', pdf: 'modal', buttons: 0.5 }}
                activeTool={activeTool}
                toolOpen={toolOpen}
                onPickTool={pickTool}
                onCloseTool={() => setToolOpen(false)}
                renderTool={renderTool}
                card={{ w: 390, h: 780 }}
                canvas={(
                    <EditCanvas
                        movil
                        invitation={invitation}
                        invitationID={invitationID}
                        selectedSection={seccionPieza}
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
                        onDateColor={() => pickColor('date')}
                        onIconTool={openIconPanel}
                        activeText={textField?.path ?? null}
                        selectedLayer={selectedLayer}
                    />
                )}
                liveContent={<ReactHost config={invitation} scrollToSection={positionY} onSectionChange={onSectionChange} textureOverride={textureOverride} fontOverride={fontOverride} activeLang={activeLang} onReady={onHostReady} vistaConfirmada={vistaConfirmada} plan={plan} />}
                vistaConfirmada={vistaConfirmada}
                onVistaConfirmada={setVistaConfirmada}
                bar={bar}
                colorPop={Boolean(colorPop)}
                colorTarget={colorTarget}
                closeColor={closeColor}
                onBack={onBack}
                onUndo={onUndo}
                onRedo={onRedo}
                canUndo={canUndo}
                canRedo={canRedo}
                headerDerecha={headerDerecha}
                estado={estado}
                onBlur={() => { setPieceModule(null); setTextField(null); setPdfElegido(false); onCanvasBlur?.() }}
            />
        )
    }

    return (
        <EditorShell
            tools={herramientas.map((x) => ({ ...x, title: t(`build_editor.tool_${x.id}`), hint: t(`build_editor.tool_${x.id}_hint`) }))}
            activeTool={activeTool}
            toolOpen={toolOpen}
            onPickTool={pickTool}
            onCloseTool={() => setToolOpen(false)}
            renderTool={renderTool}
            card={{ w: 390, h: 780 }}
            live={live}
            setLive={setLive}
            device={device}
            setDevice={setDevice}
            onLeaveEdit={onCanvasBlur}
            // Tocar el tablero fuera de la pieza suelta lo elegido dentro:
            // módulos, textos y elementos sueltos.
            onBlur={() => { setPieceModule(null); setTextField(null); setPdfElegido(false); onCanvasBlur?.() }}
            canvas={(
                <EditCanvas
                    invitation={invitation}
                    invitationID={invitationID}
                    selectedSection={seccionPieza}
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
                    activeText={textField?.path ?? null}
                    selectedLayer={selectedLayer}
                    dibujo={dibujoPieza}
                />
            )}
            liveContent={<ReactHost config={invitation} scrollToSection={positionY} onSectionChange={onSectionChange} textureOverride={textureOverride} fontOverride={fontOverride} activeLang={activeLang} onReady={onHostReady} vistaConfirmada={vistaConfirmada} plan={plan} />}
                vistaConfirmada={vistaConfirmada}
                onVistaConfirmada={setVistaConfirmada}
            bar={bar}
            // Capas: EditCanvas pinta aquí el orden de los módulos (portal).
            layersRef={setLayersEl}
            hasLayers
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onReplayTour={onReplayTour}
            mediaSider={mediaSider}
            inmersivo={modoDibujo}
            inmersivoGestos={{ sinHerramienta: !pincelActivo, onTapFuera: () => setPincelActivo(false) }}
            lateral={modoDibujo ? (
                <PaletaDibujo
                    pincel={pincel}
                    setPincel={setPincel}
                    activo={pincelActivo}
                    onActivar={tomarPincel}
                    seleccionando={pincelActivo && seleccionando}
                    onSeleccionar={() => { setSeleccionando(true); setPincelActivo(true) }}
                    onEliminar={eliminarTrazo}
                    temaColor={invitation?.generals?.colors?.accent}
                    onDeshacer={deshacerTrazo}
                    puedeDeshacer={Boolean(canUndo)}
                    onRehacer={() => { onRedo?.(); setTrazos((x) => [...x, { tipo: 'rehacer' }]) }}
                    puedeRehacer={Boolean(canRedo)}
                    onOtroColor={() => pickColor('draw')}
                />
            ) : null}
        >
            {/* ── Popover de color (lo abren los botones de color de las barras) ── */}
            {!live && <ColorPopover colorPop={colorPop} closeColor={closeColor} target={colorTarget} palette={invitationPalette(invitation)} />}
        </EditorShell>
    )
}
