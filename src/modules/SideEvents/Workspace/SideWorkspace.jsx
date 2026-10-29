import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message } from 'antd'
import { CloudUpload, Images, ListOrdered, Palette, Shapes, Users, ClipboardList } from 'lucide-react'
import SideCanvas from '../SideCanvas'
import SideEventHost from '../../../components/Host/SideEventHost'
import { SongBar } from '../../Invitation/Build/PageSections/SongBar'
import { EditorShell } from '../../Editor/EditorShell'
import { fechasDelEvento, itinerarioPorDia } from '../../../helpers/assets/eventDateTime'
import { stickerLigeroDesdeUrl } from '../../../helpers/services/uploadImage'
import { cabeElemento, contarImagenes, duplicarStickers, esImagen, lienzoCover, MAX_ELEMENTOS, MAX_STICKERS, nuevoElemento, quitarStickers } from '../stickersFlashData'
import { ElementsPanel } from '../../Invitation/Build/PageSections/LayerPanels'
import { DesignPanel, ItineraryPanel } from './SidePanels'
import { PhotosPanel } from '../../Invitation/Build/PageSections/PhotosPanel'
import { UploadsPanel } from '../../Invitation/Build/PageSections/UploadsPanel'
import { BackgroundBar, DateBar, DEFAULT_SOMBRA_TITULO, ItineraryBar, PlaceBar, WeatherBar } from './SideBars'
import { TextBar } from '../../Invitation/Build/PageSections/TextBar'
import { LiveSlider } from '../../Invitation/Build/PageSections/barControls'
import barStyles from '../../Invitation/Build/PageSections/ElementBar.module.css'
import { ElementBar } from '../../Invitation/Build/PageSections/ElementBar'
import { useColorPopover } from '../../Editor/useColorPopover'
import { ColorPopover } from '../../Editor/ColorPopover'
import { copiaDeElemento, useElementClipboard } from '../../Editor/useElementClipboard'
import { SideLayers } from './SideLayers'
import own from './SideWorkspace.module.css'
import { NOTAS_DEFAULT } from '../tarjetasSide'
import { InteractionPanel } from './InteractionMenu'
import { RegistroPanel } from './RegistroPanel'

// Área de trabajo del editor de side events / Eventos Flash en escritorio,
// con la misma experiencia que el editor de la invitación (ver
// docs/sistema-diseno-editor.md): riel de herramientas y su panel a la
// izquierda (agregar / global), la pieza editable al centro (SideCanvas,
// que ya se calca de la página del invitado), las barras contextuales
// arriba de la pieza (lo elegido), Capas a la derecha (los PNG) y el dock
// abajo (deshacer · rehacer · Editar | Ver en vivo · dispositivos · zoom ·
// tour). En Envío la pieza va en el teléfono y la lista de invitados ocupa
// la derecha. El celular sigue con su editor (SideEvents.jsx, modo story).

const TOOLS = [
    { id: 'design', icon: Palette },
    { id: 'elements', icon: Shapes, flash: true },
    { id: 'photos', icon: Images },
    { id: 'itinerary', icon: ListOrdered, flash: true },
    { id: 'uploads', icon: CloudUpload },
    // Lista de asistentes y chat de invitados (InteractionMenu): sin ícono en
    // el riel; se abre solo al elegir Asistentes en Capas o en la pieza.
    { id: 'interaction', icon: Users, flash: true, hidden: true },
    // Registro de asistentes (RegistroPanel): también sin ícono; se abre al
    // elegir Registro en Capas o en la pieza.
    { id: 'registration', icon: ClipboardList, flash: true, hidden: true },
]

// Pieza de edición: la pantalla del iPhone de "Ver en vivo" (SideCanvas
// .cardIphone = .ios26-content de DevicePreview), para que se vean idénticas.
const CARD = { w: 357, h: 631 }

export const SideWorkspace = ({
    current, esFlash, carpeta, onChange,
    // Confirmados reales ({ total, asistentes }): "Ver en vivo" los enseña en
    // el cuadro Asistentes en vez del ejemplo (iattend-events, SideEvent.tsx).
    asistentesReales = null,
    section, setSection, stickerSel, setStickerSel,
    live, setLive, device, setDevice,
    sendOpen, sendContent, sendIn, tourOpen,
    onUndo, onRedo, canUndo, canRedo, onReplayTour,
    onPaste, toolRequest, stageMorphState,
}) => {
    const { t } = useTranslation()

    /* ── Riel y panel ── */
    const [activeTool, setActiveTool] = useState('design')
    const [toolOpen, setToolOpen] = useState(false)
    const tools = TOOLS.filter((x) => !x.flash || esFlash)
        .map((x) => ({ ...x, title: t(`side_events.ws_tool_${x.id}`), hint: t(`side_events.ws_tool_${x.id}_hint`) }))
    const openTool = (id) => { setActiveTool(id); setToolOpen(true) }
    const pickTool = (id) => {
        if (id === activeTool) { setToolOpen((o) => !o); return }
        openTool(id)
    }
    // El tour (SideEvents) abre o cierra un panel del riel.
    useEffect(() => {
        if (!toolRequest) return
        if (toolRequest.id) openTool(toolRequest.id)
        else setToolOpen(false)
    }, [toolRequest?.n])

    /* ── Escritura sobre el evento ── */
    const body = current?.body ?? {}
    const setBody = (patch, opts) => onChange((prev) => ({ ...prev, body: { ...prev.body, ...patch } }), opts)
    const setTitle = (patch, opts) => onChange((prev) => ({ ...prev, body: { ...prev.body, title: { ...prev.body?.title, ...patch } } }), opts)
    const setAddress = (patch, opts) => onChange((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body?.address, ...patch } } }), opts)
    const stickers = useMemo(() => (Array.isArray(body.stickers) ? body.stickers : []), [body.stickers])
    const setStickers = (lista, opts) => setBody({ stickers: lista.length ? lista : null }, opts)

    // Agregar un elemento soltado en la pieza desde Elementos o Subidos
    // (startLayerDrag de la invitación emite `iattend-layer-drop` con el punto
    // de la pantalla y el elemento). El punto se pasa a % del lienzo de los
    // PNG (390 × 700 que cubre la pieza, como la página del invitado). Queda
    // elegido para ajustarlo.
    const enLienzo = (px, py) => {
        const card = document.querySelector('[data-side-card]')?.getBoundingClientRect()
        if (!card || px < card.left || px > card.right || py < card.top || py > card.bottom) return null
        const lc = lienzoCover(card.width, card.height)
        return {
            x: Math.round(((px - card.left - lc.left) / lc.width) * 1000) / 10,
            y: Math.round(((py - card.top - lc.top) / lc.height) * 1000) / 10,
        }
    }
    const addElement = async (item, punto) => {
        const imagen = esImagen(item)
        if (!cabeElemento(stickers, imagen)) {
            message.warning(t('side_events.stickers_paste_max', { max: imagen ? MAX_STICKERS : MAX_ELEMENTOS }))
            return
        }
        // Un PNG se guarda aligerado (WebP) en la carpeta del evento.
        const extra = imagen ? { kind: undefined, url: await stickerLigeroDesdeUrl(item.url, carpeta) } : {}
        const nuevo = nuevoElemento({ ...item, ...extra, ...(punto ?? {}) })
        onChange((prev) => ({
            ...prev,
            body: { ...prev.body, stickers: [...(Array.isArray(prev.body?.stickers) ? prev.body.stickers : []), nuevo] },
        }))
        setSection('stickers')
        setStickerSel([nuevo.id])
    }
    const addRef = useRef(addElement)
    useEffect(() => { addRef.current = addElement })
    useEffect(() => {
        if (live || sendOpen) return
        const onDrop = (e) => {
            const { x, y, item } = e.detail ?? {}
            const punto = item ? enLienzo(x, y) : null
            if (punto) addRef.current(item, punto)
        }
        window.addEventListener('iattend-layer-drop', onDrop)
        return () => window.removeEventListener('iattend-layer-drop', onDrop)
    }, [live, sendOpen])

    /* ── Selección en la pieza ── */
    // El color del tema vive en Diseño (como en la invitación): tocar el chip
    // abre ese panel. Elegir otra zona suelta los PNG.
    const selectZone = (s) => {
        if (s === 'color') { openTool('design'); setSection(null); return }
        // Asistentes no tiene barra: abre directo "Interacción" en el panel lateral.
        if (s === 'attendees' && esFlash) openTool('interaction')
        if (s === 'registration' && esFlash) openTool('registration')
        if (s !== 'stickers') setStickerSel([])
        setSection(s)
    }
    const deselect = () => { setSection(null); setStickerSel([]) }

    // Supr / Backspace quita los PNG elegidos; Escape suelta lo elegido.
    useEffect(() => {
        if (live) return
        const onKey = (e) => {
            const el = e.target
            if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable) return
            if ((e.key === 'Delete' || e.key === 'Backspace') && stickerSel.length) {
                e.preventDefault()
                setStickers(quitarStickers(stickers, stickerSel))
                setStickerSel([])
            } else if (e.key === 'Escape') {
                deselect()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [live, stickerSel, stickers])

    // ⌘C / ⌘X / ⌘V de los elementos elegidos (el mismo de la invitación). Lo
    // copiado en otro evento o en una invitación también se pega aquí.
    useElementClipboard({
        enabled: !live && !sendOpen,
        copy: () => {
            const elegidos = stickers.filter((x) => stickerSel.includes(x.id))
            return elegidos.length ? { items: elegidos, section: carpeta } : null
        },
        cut: () => { setStickers(quitarStickers(stickers, stickerSel)); setStickerSel([]) },
        paste: (clip) => {
            const lista = Array.isArray(body.stickers) ? body.stickers : []
            const imagenes = clip.items.filter(esImagen).length
            if (lista.length + clip.items.length > MAX_ELEMENTOS || contarImagenes(lista) + imagenes > MAX_STICKERS) {
                message.warning(t('side_events.stickers_paste_max', { max: imagenes ? MAX_STICKERS : MAX_ELEMENTOS }))
                return
            }
            // Un sticker de la invitación es una imagen: aquí va sin `kind`.
            const copias = clip.items.map((it, i) => {
                const c = copiaDeElemento(it, clip.section === carpeta, i)
                return c.kind === 'sticker' ? { ...c, kind: undefined } : c
            })
            setStickers([...lista, ...copias])
            setSection('stickers')
            setStickerSel(copias.map((c) => c.id))
        },
    })

    /* ── Subidos en modo "elegir" (fondo, video, imagen del link…) ── */
    const [mediaRequest, setMediaRequest] = useState(null)
    const mediaSider = useMemo(() => ({
        open: (request) => {
            setMediaRequest({ ...request, n: Date.now() })
            setActiveTool('uploads')
            setToolOpen(true)
        },
    }), [])
    const pickMedia = (request, handleImage) => mediaSider.open({ ...request, invitationID: carpeta, handleImage })
    useEffect(() => {
        if (!toolOpen || activeTool !== 'uploads') setMediaRequest(null)
    }, [toolOpen, activeTool])

    /* ── Barra contextual ── */
    const momentos = itinerarioPorDia(body).reduce((n, d) => n + (d.momentos?.length ?? d.items?.length ?? 0), 0)
    const dias = [...new Set(fechasDelEvento(body).map((f) => String(f).slice(0, 10)))]
    // Atajos del selector de color de los elementos.
    const palette = [...new Set([body.color, '#FFFFFF', '#000000'].filter(Boolean).map((c) => c.toUpperCase()))]

    // Elemento(s) elegido(s): la barra de elementos de la invitación con lo de
    // un Flash (tamaño, giro, ocultar, duplicar, quitar; varios a la vez).
    const { colorField, colorPop, pickColor, closeColor } = useColorPopover()
    const grupo = stickers.filter((x) => stickerSel.includes(x.id))
    const actual = stickers.find((x) => x.id === stickerSel.find((id) => grupo.some((g) => g.id === id))) ?? null
    const cambiarGrupo = (fn, o) => setStickers(stickers.map((x) => (stickerSel.includes(x.id) ? { ...x, ...fn(x) } : x)), o)
    const redondear = (v) => Math.round(v * 100) / 100
    const noCabe = stickers.length + grupo.length > MAX_ELEMENTOS || contarImagenes(stickers) + contarImagenes(grupo) > MAX_STICKERS
    const elementGroup = actual && {
        count: grupo.length,
        onScale: (v, o) => {
            const factor = v / (actual.w || 1)
            cambiarGrupo((x) => ({ w: x.id === actual.id ? v : Math.min(200, Math.max(5, redondear(x.w * factor))) }), o)
        },
        onRotate: (v, o) => {
            const delta = v - (actual.rot ?? 0)
            cambiarGrupo((x) => ({ rot: x.id === actual.id ? v : Math.min(180, Math.max(-180, (x.rot ?? 0) + delta)) }), o)
        },
        hidden: grupo.every((x) => x.hidden),
        onToggleHidden: () => { const oculto = grupo.every((x) => x.hidden); cambiarGrupo(() => ({ hidden: !oculto || undefined })) },
        canDuplicate: !noCabe,
        onDuplicate: () => { const { lista, nuevos } = duplicarStickers(stickers, stickerSel); setStickers(lista); setStickerSel(nuevos) },
        onRemove: () => { setStickers(quitarStickers(stickers, stickerSel)); setStickerSel([]) },
    }
    // Título: la barra de texto de la invitación con un adaptador a body.title
    // (font, size, weight, line_height, opacity, color y los extras).
    const title = body.title ?? {}
    const titleTs = {
        font: {
            ...title,
            typeFace: title.font ?? 'Poppins',
            size: title.size ?? 36,
            weight: title.weight ?? 500,
            lineHeight: title.line_height ?? 1.4,
            opacity: title.opacity ?? 1,
            color: title.color || '#FFFFFF',
        },
        setFont: (patch, o) => {
            const { typeFace, lineHeight, ...rest } = patch
            setTitle({ ...rest, ...(typeFace !== undefined ? { font: typeFace } : {}), ...(lineHeight !== undefined ? { line_height: lineHeight } : {}) }, o)
        },
        align: null,
        setAlign: null,
        minSize: esFlash ? 14 : 36,
        maxSize: 64,
        showSize: true,
        showColor: true,
    }
    // Notas: la misma barra de texto, sobre body.notes_style (tarjetasSide.js).
    const notas = { ...NOTAS_DEFAULT, ...(body.notes_style ?? {}) }
    const setNotas = (patch, o) => setBody({ notes_style: { ...(body.notes_style ?? {}), ...patch } }, o)
    const notesTs = {
        font: {
            ...notas,
            typeFace: notas.font,
            lineHeight: notas.line_height,
            color: notas.color || '#FFFFFF',
        },
        setFont: (patch, o) => {
            const { typeFace, lineHeight, ...rest } = patch
            setNotas({ ...rest, ...(typeFace !== undefined ? { font: typeFace } : {}), ...(lineHeight !== undefined ? { line_height: lineHeight } : {}) }, o)
        },
        align: notas.align,
        setAlign: (v) => setNotas({ align: v }),
        minSize: 10,
        maxSize: 32,
        showSize: true,
        showColor: true,
    }

    const titleShadow = (pop, open) => pop('shadow', (
        <LiveSlider label={t('side_events.text_shadow')} value={title.shadow ?? DEFAULT_SOMBRA_TITULO} min={0} max={100} format={(v) => `${v}%`} onChange={(v, o) => setTitle({ shadow: v }, o)} />
    ), (
        <button type="button" className={barStyles.textBtn} data-on={open === 'shadow' || (title.shadow ?? DEFAULT_SOMBRA_TITULO) > 0 || undefined}>
            {t('build_menu.shadow')}
        </button>
    ))

    // Color del elemento (relleno / color, o borde de una forma) o del título.
    const colorTarget = section === 'title' && colorField === 'text'
        ? { value: title.color || '#FFFFFF', allowNone: false, onPick: (c, o) => setTitle({ color: c }, o) }
        : section === 'extras' && colorField === 'text'
        ? { value: notas.color || '#FFFFFF', allowNone: false, onPick: (c, o) => setNotas({ color: c }, o) }
        : actual && !esImagen(actual) && grupo.length === 1 ? (() => {
        const field = colorField === 'stroke' && actual.kind === 'shape' ? 'stroke' : 'color'
        return {
            value: field === 'stroke' ? (actual.stroke || '#FFFFFF') : (actual.color || '#FFFFFF'),
            allowNone: field === 'color' && actual.kind === 'shape',
            onPick: (c, o) => cambiarGrupo(() => (field === 'stroke'
                ? { stroke: c, strokeWidth: (actual.strokeWidth ?? 0) > 0 ? actual.strokeWidth : 2 }
                : { color: c }), o),
        }
    })() : null

    const bar = live ? null
        : section === 'stickers' && actual
            ? <ElementBar item={actual} accent="#FFFFFF" onPatch={(patch, o) => cambiarGrupo(() => patch, o)} onPickColor={pickColor} colorOpen={colorPop ? colorField : null} group={elementGroup} pieceWidth={CARD.w} />
        : section === 'title' ? <TextBar target="flash_title" ts={titleTs} onPickColor={() => pickColor('text')} colorOpen={Boolean(colorPop) && colorField === 'text'} extra={titleShadow} />
        : section === 'extras' ? <TextBar target="flash_notes" ts={notesTs} onPickColor={() => pickColor('text')} colorOpen={Boolean(colorPop) && colorField === 'text'} />
        : section === 'date' ? <DateBar body={body} setBody={setBody} esFlash={esFlash} />
        // Cómo llegar sale de la dirección: abre la misma barra que Lugar.
        : section === 'place' || section === 'map' ? <PlaceBar body={body} setBody={setBody} setAddress={setAddress} />
        // Clima: cuándo se muestra (automático, siempre, si va a llover, oculto).
        : section === 'weather' ? <WeatherBar body={body} setBody={setBody} />
        : section === 'background' ? <BackgroundBar current={current} setBody={setBody} onChange={onChange} esFlash={esFlash} carpeta={carpeta} pickMedia={pickMedia} />
        : section === 'song' ? <SongBar value={body.song ?? null} onChange={(song) => setBody({ song })} folder={carpeta} />
        : section === 'itinerary' ? <ItineraryBar count={momentos} onEdit={() => openTool('itinerary')} />
        : null

    const panelProps = { current, setBody, esFlash, carpeta }
    // Lo que el panel Elementos lee de la invitación: las tipografías de las
    // muestras de texto y el color de las muestras (oscuro: el panel es blanco).
    const elementsInvitation = {
        generals: { fonts: { titles: { typeFace: body.title?.font ?? 'Poppins' }, body: { typeFace: 'Poppins' } }, colors: { accent: '#29262D' } },
    }

    const renderTool = (id) => (
        id === 'design' ? <DesignPanel {...panelProps} />
            // El mismo panel Elementos de la invitación (catálogo de íconos,
            // formas, ilustraciones, textos, líneas y decoraciones); lo que se
            // suelta en la pieza llega por `iattend-layer-drop`.
            : id === 'elements' ? <ElementsPanel invitation={elementsInvitation} />
            // Los paneles Fotos y Subidos de la invitación: aquí una foto va al
            // fondo y los PNG de un Flash viven en su carpeta (flash-<id>).
            : id === 'photos' ? <PhotosPanel selectedSection="cover" onUse={(url) => setBody({ image: url })} isInUse={(url) => body.image === url} banner={t('side_events.ws_photos_banner')} />
            : id === 'itinerary' ? <ItineraryPanel {...panelProps} dias={dias} />
            : id === 'interaction' ? <InteractionPanel body={body} setBody={setBody} eventoId={current?.id} />
            : id === 'registration' ? <RegistroPanel body={body} setBody={setBody} eventoId={current?.id} />
            : id === 'uploads' ? (
                <UploadsPanel
                    invitationID={carpeta}
                    folders={esFlash ? { root: carpeta, videos: `${carpeta}/video`, pngs: null } : undefined}
                    inUse={(url) => stickers.some((s) => s.url === url) || body.image === url}
                    draggable={esFlash}
                    mediaRequest={mediaRequest}
                    clearMedia={() => setMediaRequest(null)}
                    onPaste={onPaste}
                />
            )
            : null
    )

    return (
        <EditorShell
            className={own.workspace}
            topOffset={66}
            tools={tools}
            activeTool={activeTool}
            toolOpen={toolOpen}
            onPickTool={pickTool}
            onCloseTool={() => setToolOpen(false)}
            renderTool={renderTool}
            card={CARD}
            canvas={(
                <div className={own.canvasWrap} data-morph="stage" data-morphing={stageMorphState} data-tour="canvas">
                    <SideCanvas
                        key={current?.id}
                        current={current}
                        onChange={onChange}
                        selected={section}
                        onSelect={selectZone}
                        stickerSel={stickerSel}
                        onStickerSel={setStickerSel}
                        conCancion={esFlash}
                        conAsistentes={esFlash}
                        asistentes={asistentesReales}
                        barMode
                    />
                    <span className={own.caption}>{t('side_events.canvas_caption')}</span>
                </div>
            )}
            liveContent={<SideEventHost config={asistentesReales?.total ? { ...current, _asistentes: asistentesReales } : current} />}
            live={live}
            setLive={setLive}
            device={device}
            setDevice={setDevice}
            onLeaveEdit={deselect}
            onBlur={deselect}
            bar={bar}
            // Capas: las capas reales de la pieza (contenido, elementos, fondo).
            hasLayers
            layers={(
                <SideLayers
                    stickers={stickers}
                    selected={stickerSel}
                    onSelect={(ids) => { setStickerSel(ids); setSection('stickers') }}
                    onChange={setStickers}
                    section={section}
                    onZone={selectZone}
                    conCancion={esFlash}
                    esFlash={esFlash}
                    body={body}
                    setBody={setBody}
                />
            )}
            column={sendOpen ? { node: sendContent, in: sendIn || tourOpen, noAnim: tourOpen } : null}
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onReplayTour={onReplayTour}
            mediaSider={mediaSider}
        >
            {!live && <ColorPopover colorPop={colorPop} closeColor={closeColor} target={colorTarget} palette={palette} />}
        </EditorShell>
    )
}
