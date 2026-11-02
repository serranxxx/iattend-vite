import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message } from 'antd'
import { CloudUpload, Images, Link2, ListOrdered, Palette, PenLine, Shapes, Ticket, Users, ClipboardList } from 'lucide-react'
import SideCanvas from '../SideCanvas'
import SideEventHost from '../../../components/Host/SideEventHost'
import { SongBar } from '../../Invitation/Build/PageSections/SongBar'
import { EditorShell } from '../../Editor/EditorShell'
import { fechasDelEvento } from '../../../helpers/assets/eventDateTime'
import { agrupar, contarImagenes, desagrupar, esImagen, lienzoCover, MAX_ELEMENTOS, MAX_STICKERS, quitarStickers } from '../stickersPopData'
import { ElementsPanel } from '../../Invitation/Build/PageSections/LayerPanels'
import { stickerItem } from '../../Invitation/Build/PageSections/layerItems'
import { agregarElemento } from './agregarElemento'
import { useBarraContextual } from './barraContextual'
import { DesignPanel, DrawPanel, ItineraryPanel } from './SidePanels'
import { PhotosPanel } from '../../Invitation/Build/PageSections/PhotosPanel'
import { UploadsPanel } from '../../Invitation/Build/PageSections/UploadsPanel'
import { mediaDePortada, soloVideos } from '../fotosPortada'
import { AjusteFotoBar, BackgroundBar, DateBar, DEFAULT_SOMBRA_TITULO, DibujoBar, PlaceBar, WeatherBar } from './SideBars'
import { TextBar } from '../../Invitation/Build/PageSections/TextBar'
import { LiveSlider } from '../../Invitation/Build/PageSections/barControls'
import { ElementBar } from '../../Invitation/Build/PageSections/ElementBar'
import { useColorPopover } from '../../Editor/useColorPopover'
import { ColorPopover } from '../../Editor/ColorPopover'
import { copiaDeElemento, useElementClipboard } from '../../Editor/useElementClipboard'
import { SideLayers } from './SideLayers'
import own from './SideWorkspace.module.css'
import { NOTAS_DEFAULT } from '../tarjetasSide'
import { InteractionPanel } from './InteractionMenu'
import { useMensajesChat } from './useMensajesChat'
import { HERRAMIENTAS } from './herramientas'
import { FormularioPanel } from '../Formularios/FormularioPanel'
import { WalletPanelPop } from './WalletPanelPop'
import { PaletaDibujo } from './PaletaDibujo'
import { LinkPanel } from './LinkPanel'

// Área de trabajo del editor de side events / Pops en escritorio,
// con la misma experiencia que el editor de la invitación (ver
// docs/sistema-diseno-editor.md): riel de herramientas y su panel a la
// izquierda (agregar / global), la pieza editable al centro (SideCanvas,
// que ya se calca de la página del invitado), las barras contextuales
// arriba de la pieza (lo elegido), Capas a la derecha (los PNG) y el dock
// abajo (deshacer · rehacer · Editar | Ver en vivo · dispositivos · zoom ·
// tour). En Envío la pieza va en el teléfono y la lista de invitados ocupa
// la derecha. El celular sigue con su editor (SideEvents.jsx, modo story).

// Las herramientas del riel (y del footer del celular): herramientas.js.
const TOOLS = HERRAMIENTAS

// Pieza de edición: la pantalla del iPhone de "Ver en vivo" (SideCanvas
// .cardIphone = .ios26-content de DevicePreview), para que se vean idénticas.
const CARD = { w: 357, h: 631 }

export const SideWorkspace = ({
    current, esPop, carpeta, onChange,
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
    // "Ver en vivo" como un invitado que ya confirmó (botón del dock).
    const [vistaConfirmada, setVistaConfirmada] = useState(false)

    /* ── Riel y panel ── */
    const [activeTool, setActiveTool] = useState('design')
    const [toolOpen, setToolOpen] = useState(false)
    const tools = TOOLS.filter((x) => !x.pop || esPop)
        .map((x) => ({
            ...x,
            title: t(`side_events.ws_tool_${x.id}`),
            hint: t(`side_events.ws_tool_${x.id}_hint`),
            // Portada de video: el link necesita una foto subida (LinkPanel).
            ...(x.id === 'link' && soloVideos(current?.body) && !current?.body?.linkImage ? { aviso: t('side_events.link_need_image') } : {}),
        }))
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
    // Mensajes reales del chat (Pop con asistentes y chat prendidos): los
    // modera el panel Interacción y los enseñan la pieza y "Ver en vivo".
    const chatMensajes = useMensajesChat(current?.id, esPop && Boolean(body.showAttendees) && Boolean(body.chat?.enabled))
    const setBody = (patch, opts) => onChange((prev) => ({ ...prev, body: { ...prev.body, ...patch } }), opts)
    const updateForm = (fn, opts) => onChange((prev) => ({ ...prev, body: { ...prev.body, form: fn(prev.body?.form ?? null) } }), opts)
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
        const nuevo = await agregarElemento({
            item, punto, stickers, carpeta, onChange,
            onLleno: (max) => message.warning(t('side_events.stickers_paste_max', { max })),
        })
        if (!nuevo) return
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
        if (s === 'attendees' && esPop) openTool('interaction')
        if (s === 'registration' && esPop) openTool('registration')
        if (s === 'itinerary' && esPop) openTool('itinerary')
        if (s !== 'stickers') setStickerSel([])
        setSection(s)
    }
    const deselect = () => { setSection(null); setStickerSel([]) }

    /* ── Ajustar la foto de fondo ── */
    // Barra Fondo → Ajustar: la pieza toma el arrastre y la rueda sobre la
    // foto. Se cierra con Listo, Esc / Enter o al elegir otra cosa.
    const [ajustandoFoto, setAjustandoFoto] = useState(false)
    // La foto o el video elegido en la tira de la barra Fondo: se ve quieto en
    // la pieza y es el que se ajusta (fotosPortada.js).
    const [fotoSel, setFotoSel] = useState(null)
    const mediaFondo = mediaDePortada(current?.body)
    const fotoElegida = mediaFondo.includes(fotoSel) ? fotoSel : mediaFondo[0] ?? null
    useEffect(() => { if (section !== 'background' || live) setAjustandoFoto(false) }, [section, live])
    useEffect(() => {
        if (!ajustandoFoto) return undefined
        const onKey = (e) => {
            const el = e.target
            if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable) return
            if (e.key === 'Escape' || e.key === 'Enter') { e.stopPropagation(); setAjustandoFoto(false) }
        }
        window.addEventListener('keydown', onKey, true)
        return () => window.removeEventListener('keydown', onKey, true)
    }, [ajustandoFoto])

    /* ── Dibujar ── */
    // El pincel se recuerda en la sesión del editor (no en el body). Con la
    // herramienta abierta, la pieza está en modo dibujo. `trazos`: lo que se
    // dibujó (o borró) en esta sesión, para deshacer y "Borrar todo".
    const [pincel, setPincel] = useState({ brush: 'pluma', color: '#FFFFFF', size: 8, opacity: 100 })
    const [trazos, setTrazos] = useState([])
    // Con varias fotos / videos en la portada: dibujar en toda la portada o
    // anclado a una (que se queda fija mientras se dibuja).
    const [dibujoEn, setDibujoEn] = useState('todo')
    const dibujoEnValido = mediaFondo.includes(dibujoEn) ? dibujoEn : 'todo'
    const modoDibujo = esPop && !live && toolOpen && activeTool === 'draw'
    useEffect(() => { if (modoDibujo) { setSection(null); setStickerSel([]) } }, [modoDibujo])
    // Dibujo a pantalla completa (botón de la barra): sin riel, panel, Capas ni
    // dock, la pieza 50 % más grande y la paleta a la derecha (PaletaDibujo).
    // Solo se dibuja y se hace scroll. Al salir del modo dibujo se apaga.
    const [dibujoFull, setDibujoFull] = useState(false)
    useEffect(() => { if (!modoDibujo) setDibujoFull(false) }, [modoDibujo])
    const inmersivo = modoDibujo && dibujoFull
    const deshacerTrazo = () => { if (!trazos.length) return; onUndo?.(); setTrazos((x) => x.slice(0, -1)) }
    const borrarTodo = () => {
        const ids = trazos.filter((x) => x.id).map((x) => x.id)
        if (ids.length) setStickers(stickers.filter((x) => !ids.includes(x.id)))
        setTrazos([])
    }
    // Atajos del modo dibujo: P pluma, E borrador, Esc = Listo. ⌘/Ctrl Z ya
    // deshace en todo el editor: aquí solo se descuenta el trazo.
    useEffect(() => {
        if (!modoDibujo) return
        const onKey = (e) => {
            const el = e.target
            if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable) return
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) setTrazos((x) => x.slice(0, -1))
            else if (e.metaKey || e.ctrlKey || e.altKey) return
            else if (e.key.toLowerCase() === 'p') setPincel((x) => ({ ...x, brush: 'pluma' }))
            else if (e.key.toLowerCase() === 'e') setPincel((x) => ({ ...x, brush: 'borrador' }))
            // Esc: primero sale de pantalla completa; si no, termina el dibujo.
            else if (e.key === 'Escape') { if (dibujoFull) setDibujoFull(false); else setToolOpen(false) }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [modoDibujo, dibujoFull])

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
            } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g' && stickerSel.length) {
                // ⌘G agrupa lo elegido; ⇧⌘G desagrupa.
                e.preventDefault()
                setStickers(e.shiftKey ? desagrupar(stickers, stickerSel) : agrupar(stickers, stickerSel))
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
    const dias = [...new Set(fechasDelEvento(body).map((f) => String(f).slice(0, 10)))]
    // Atajos del selector de color de los elementos.
    const palette = [...new Set([body.color, '#FFFFFF', '#000000'].filter(Boolean).map((c) => c.toUpperCase()))]

    // Elemento(s) elegido(s): la barra de elementos de la invitación con lo de
    // un Pop (tamaño, giro, ocultar, duplicar, quitar; varios a la vez).
    const { colorField, colorPop, pickColor, closeColor } = useColorPopover()
    // La barra contextual (elemento, título, notas, fecha, lugar, clima,
    // fondo, canción) es la misma del celular: barraContextual.jsx.
    const barra = useBarraContextual({
        section, current, onChange, esPop, carpeta, pieceWidth: CARD.w,
        stickerSel, setStickerSel,
        pickColor, colorPop, colorField,
        pickMedia, fotoElegida, setFotoSel, ajustandoFoto, setAjustandoFoto,
    })
    // Color del elemento (relleno / color, o borde de una forma) o del título.
    const colorTarget = modoDibujo && colorField === 'draw'
        ? {
            // Selector estilo iOS, con la opacidad del pincel; se abre hacia el
            // centro (la paleta está a la derecha y el panel a la izquierda).
            ios: true,
            value: pincel.color,
            allowNone: false,
            onPick: (c) => setPincel((x) => ({ ...x, color: c })),
            opacity: pincel.opacity,
            onOpacity: (v) => setPincel((x) => ({ ...x, opacity: v })),
            opacidadMin: 10,
            placement: inmersivo ? 'left' : 'right',
            anclarA: inmersivo ? '[data-paleta-dibujo]' : '[data-editor-left]',
        }
        : barra.colorTarget

    const bar = live ? null
        : modoDibujo ? <DibujoBar trazos={trazos.length} onBorrarTodo={borrarTodo} onListo={() => setToolOpen(false)} pantallaCompleta={dibujoFull} onPantallaCompleta={setDibujoFull} media={mediaFondo} dibujoEn={dibujoEnValido} onDibujoEn={setDibujoEn} />
        : barra.bar

    const panelProps = { current, setBody, esPop, carpeta }
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
            // fondo y los PNG de un Pop viven en su carpeta (flash-<id>).
            // En un Pop una foto de Ideas entra como elemento (PNG) en la
            // pieza; para la portada se elige desde el "+" de la barra Fondo
            // (Subidos → Ideas). Un side event de boda no tiene elementos:
            // ahí sigue siendo el fondo.
            : id === 'photos' ? (esPop
                ? <PhotosPanel selectedSection="cover" onUse={(url) => addElement({ ...stickerItem(url), w: 60 }, { x: 50, y: 40 })} banner={t('side_events.ws_photos_banner_pop')} />
                : <PhotosPanel selectedSection="cover" onUse={(url) => setBody({ image: url })} isInUse={(url) => body.image === url} banner={t('side_events.ws_photos_banner')} />)
            : id === 'itinerary' ? <ItineraryPanel {...panelProps} dias={dias} />
            : id === 'draw' ? <DrawPanel current={current} pincel={pincel} setPincel={setPincel} onOtroColor={() => pickColor('draw')} />
            : id === 'interaction' ? <InteractionPanel body={body} setBody={setBody} eventoId={current?.id} chatMensajes={chatMensajes} />
            : id === 'registration' ? <FormularioPanel body={body} updateForm={updateForm} eventoId={current?.id} />
            // Elegir foto: abre Subidos y, al elegir, regresa al panel.
            : id === 'link' ? <LinkPanel current={current} setBody={setBody} onPickImage={(handleImage) => pickMedia({}, (url, ...rest) => { handleImage(url, ...rest); setActiveTool('link'); setToolOpen(true) })} />
            : id === 'wallet' ? <WalletPanelPop current={current} setBody={setBody} onPickImage={(handleImage) => pickMedia({}, (url, ...rest) => { handleImage(url, ...rest); setActiveTool('wallet'); setToolOpen(true) })} />
            : id === 'uploads' ? (
                <UploadsPanel
                    invitationID={carpeta}
                    folders={esPop ? { root: carpeta, videos: `${carpeta}/video`, pngs: null } : undefined}
                    inUse={(url) => stickers.some((s) => s.url === url) || body.image === url}
                    draggable={esPop}
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
                        conCancion={esPop}
                        conAsistentes={esPop}
                        asistentes={asistentesReales}
                        chatMensajes={chatMensajes.mensajes}
                        barMode
                        pincel={modoDibujo ? pincel : null}
                        onTrazo={(tipo, id) => setTrazos((x) => [...x, { tipo, id }])}
                        sinTrazos={trazos.length === 0}
                        soloDibujo={inmersivo}
                        fotoFija={modoDibujo && dibujoEnValido !== 'todo' ? dibujoEnValido : section === 'background' ? fotoElegida : null}
                        dibujoEn={dibujoEnValido}
                        ajustarFoto={ajustandoFoto && section === 'background' ? fotoElegida : null}
                    />
                    {!inmersivo && <span className={own.caption}>{t('side_events.canvas_caption')}</span>}
                </div>
            )}
            liveContent={<SideEventHost config={{
                ...current,
                // Lo real (confirmados y mensajes del chat), aunque esté vacío:
                // "Ver en vivo" ya no inventa asistentes ni conversación.
                ...(asistentesReales ? { _asistentes: asistentesReales } : {}),
                ...(chatMensajes.mensajes ? { _chat: chatMensajes.mensajes.slice(0, 40) } : {}),
                // "Confirmado" del dock: la página como la ve un invitado que ya confirmó.
                ...(vistaConfirmada ? { _vistaConfirmada: true } : {}),
            }} />}
            vistaConfirmada={vistaConfirmada}
            onVistaConfirmada={setVistaConfirmada}
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
                    conCancion={esPop}
                    esPop={esPop}
                    body={body}
                    setBody={setBody}
                />
            )}
            // Al volver a Diseño la columna se queda unos 300 ms (`saliendo`)
            // para desvanecerse mientras el editor ya se reacomoda.
            column={sendOpen
                ? { node: sendContent, in: sendIn || tourOpen, noAnim: tourOpen }
                : sendContent ? { node: sendContent, in: false, saliendo: true } : null}
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onReplayTour={onReplayTour}
            mediaSider={mediaSider}
            inmersivo={inmersivo}
            lateral={inmersivo ? (
                <PaletaDibujo
                    pincel={pincel}
                    setPincel={setPincel}
                    temaColor={body.color}
                    onDeshacer={deshacerTrazo}
                    puedeDeshacer={trazos.length > 0}
                    onRehacer={() => { onRedo?.(); setTrazos((x) => [...x, { tipo: 'rehacer' }]) }}
                    puedeRehacer={Boolean(canRedo)}
                    onOtroColor={() => pickColor('draw')}
                />
            ) : null}
        >
            {!live && <ColorPopover colorPop={colorPop} closeColor={closeColor} target={colorTarget} palette={palette} />}
        </EditorShell>
    )
}
