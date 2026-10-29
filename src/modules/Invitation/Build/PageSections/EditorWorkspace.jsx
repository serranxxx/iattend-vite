import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message } from 'antd'
import { CloudUpload, Images, Palette, Shapes, WandSparkles } from 'lucide-react'
import ReactHost from '../../../../components/Host/ReactHost'
import { EditCanvas } from './EditCanvas'
import { EditorShell } from '../../../Editor/EditorShell'
import { useColorPopover } from '../../../Editor/useColorPopover'
import { ColorPopover } from '../../../Editor/ColorPopover'
import { copiaDeElemento, useElementClipboard } from '../../../Editor/useElementClipboard'
import { DesignPanel } from './ToolPanels'
import { PhotosPanel } from './PhotosPanel'
import { UploadsPanel } from './UploadsPanel'
import { ElementsPanel } from './LayerPanels'
import { AiTextPanel } from './AiTextPanel'
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
            // Un PNG de un Flash no trae `kind`: en la invitación es un sticker.
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

    // Barra contextual de lo elegido (una a la vez). Prioridad: elemento >
    // texto > campo (momento, paleta, fecha…) > separador > fondo del bloque.
    const bar = live ? null
        : selectedItem ? (
        <ElementBar
            item={selectedItem}
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

    const renderTool = (id) => {
        const item = TOOLS.find((x) => x.id === id)
        return item?.Panel
            ? <item.Panel invitation={invitation} invitationID={invitationID} setInvitation={setInvitation} setSaved={setSaved} onSelectSection={onSelectSection} selectedSection={selectedSection} onOpenTool={(next) => { setActiveTool(next); setToolOpen(true) }} activeLang={activeLang} mediaRequest={mediaRequest} clearMedia={() => setMediaRequest(null)} colorTarget={colorTarget} iconRequest={iconRequest} clearIconRequest={() => setIconRequest(null)} />
            : null
    }

    return (
        <EditorShell
            tools={TOOLS.map((x) => ({ ...x, title: t(`build_editor.tool_${x.id}`), hint: t(`build_editor.tool_${x.id}_hint`) }))}
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
            onBlur={() => { setPieceModule(null); setTextField(null); onCanvasBlur?.() }}
            canvas={(
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
                    activeText={textField?.path ?? null}
                    selectedLayer={selectedLayer}
                />
            )}
            liveContent={<ReactHost config={invitation} scrollToSection={positionY} onSectionChange={onSectionChange} textureOverride={textureOverride} fontOverride={fontOverride} activeLang={activeLang} onReady={onHostReady} />}
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
        >
            {/* ── Popover de color (lo abren los botones de color de las barras) ── */}
            {!live && <ColorPopover colorPop={colorPop} closeColor={closeColor} target={colorTarget} palette={invitationPalette(invitation)} />}
        </EditorShell>
    )
}
