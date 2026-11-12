import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AccesoPanel } from '../Acceso/AccesoPanel'
import { normalizarAcceso, publicoDeAcceso } from '../acceso'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Eye, Lock, LockOpen, Palette, Redo2, Share, Trash2, Undo2, Users, X } from 'lucide-react'
import { EstadoGuardado } from '../EstadoGuardado'
import SideEventHost from '../../../components/Host/SideEventHost'
import { HERRAMIENTAS } from '../Workspace/herramientas'
import { mediaDePortada, soloVideos } from '../fotosPortada'
import { SideCanvas } from '../SideCanvas'
import { DesignPanel, ItineraryPanel } from '../Workspace/SidePanels'
import { InteractionPanel } from '../Workspace/InteractionMenu'
import { PatrocinadoresPanel } from '../Workspace/PatrocinadoresPanel'
import { useMensajesChat } from '../Workspace/useMensajesChat'
import { FormularioPanel } from '../Formularios/FormularioPanel'
import { fechasDelEvento } from '../../../helpers/assets/eventDateTime'
import { agregarElemento } from '../Workspace/agregarElemento'
import { ElementsPanel } from '../../Invitation/Build/PageSections/LayerPanels'
import { PhotosPanel } from '../../Invitation/Build/PageSections/PhotosPanel'
import { UploadsPanel } from '../../Invitation/Build/PageSections/UploadsPanel'
import { stickerItem } from '../../Invitation/Build/PageSections/layerItems'
import { message } from 'antd'
import { PaletaDibujo } from '../Workspace/PaletaDibujo'
import { DibujarEn } from '../Workspace/SideBars'
import { useBarraContextual } from '../Workspace/barraContextual'
import { LinkPanel } from '../Workspace/LinkPanel'
import { WalletPanelPop } from '../Workspace/WalletPanelPop'
import { CompartirContenido } from '../CompartirPop'
import { ColoresIOS } from '../../Editor/ColoresIOS'
import { reducirMovimiento } from '../../Editor/inmersivo'
import { useEditorMovil } from '../../Editor/useEditorMovil'
import { transformDeZoom, useZoomAnimando, useZoomTexto } from '../../Editor/useZoomTexto'
import s from './EditorMovil.module.css'

/*
  Editor de un side event / Pop en el celular (≤ 720 px). Usa las mismas
  piezas que escritorio y solo cambia dónde se ven: la pieza (SideCanvas
  `barMode`, 357 × 631) escalada en un tablero blanco con puntos; header
  (salir · deshacer · rehacer · Diseño / Invitados · acceso · compartir) y el
  estado del autoguardado; footer flotante con las herramientas (scroll de
  lado) y Ver en vivo fijo a la derecha; drawers (PANELES), modales
  (MODALES / ZONA_MODAL / Compartir / elegir), modo dibujo a pantalla
  completa, barras contextuales en lugar del footer (useBarraContextual) y
  la tarjeta flotante de color. Todo lo que se mueve va con transform.
  Documentación completa: docs/editor-movil-pop.md.
*/

// Herramientas con panel en el drawer (las demás llegan después) y qué
// parte del alto de la pantalla ocupa: Diseño, la mitad (la pieza se achica
// arriba); Elementos, Fotos y Subidos, todo (tocar uno lo agrega a la pieza
// como elemento, elegido, y el drawer se cierra).
const PANELES = { design: 0.5, elements: 1, photos: 1, uploads: 1, sponsors: 1, acceso: 1 }
// Imagen del link y Pase digital: los mismos paneles de escritorio en un
// modal (tarjeta centrada con velo). "Elegir foto" cambia el contenido del
// modal por Subidos en modo elegir y, al elegir, regresa.
const MODALES = new Set(['link', 'wallet'])
// Zonas de la pieza sin barra: tocarlas abre su panel de escritorio en un
// modal (Asistentes → Interacción, Itinerario, Formulario).
const ZONA_MODAL = { attendees: 'interaction', itinerary: 'itinerary', registration: 'registration' }
// Modal Compartir: el mismo ancho que los demás modales; la portada llena el
// ancho del modal (menos su aire) y se recorta a lo alto para caber con los
// botones.
const AIRE_COMPARTIR = { lados: 24 + 40, alto: 250 }
const MODAL_SALE_MS = 200
// Lo que tarda en irse la barra Fondo cuando regresa el footer.
const BARRA_SALE_MS = 240
// Modo dibujo: la barra de plumas de abajo (PaletaDibujo horizontal).
const ALTO_PALETA = 96
const DRAWER_MS = 520
const CERRAR_MS = 420
// La curva de las hojas de iOS: arranca rápido y se asienta despacio.
const CURVA_HOJA = 'cubic-bezier(0.32, 0.72, 0, 1)'

const CARD = { w: 357, h: 631 }
// Aire alrededor de la pieza: arriba deja lugar al botón de regresar; abajo,
// a la leyenda.
const ALTO_HEADER = 56
// Debajo del header, el estado del autoguardado.
const ALTO_ESTADO = 24
// Abajo, la leyenda y el footer de herramientas.
const ALTO_FOOTER = 64
const MARGEN = { x: 20, arriba: ALTO_HEADER + ALTO_ESTADO + 22, abajo: ALTO_FOOTER + 44 }

export const EditorMovil = ({
    current, onChange, section, onSelect, stickerSel, onStickerSel, esPop, asistentes, stageMorphState,
    // Carpeta del evento en Storage (los PNG que se agregan van ahí).
    carpeta,
    // Header
    onBack, onUndo, onRedo, canUndo, canRedo, tab, onTab, esPublico, onAcceso, envolverAcceso, cambiandoAcceso, estadoGuardado, onReintentar,
    // Compartir: el mismo contenido del popover de escritorio (portada + QR +
    // Copiar link) en un modal; con información pendiente, `onCompartirBloqueado`.
    urlPublica, compartirBloqueado, onCompartirBloqueado,
    // Pestaña Invitados: la lista (la misma de escritorio).
    invitados,
}) => {
    const { t } = useTranslation()
    const raizRef = useRef(null)
    const headerRef = useRef(null)
    const footerRef = useRef(null)
    const drawerRef = useRef(null)
    const piezaRef = useRef(null)
    // Tamaño de la pantalla y dónde termina el header (para el drawer).
    const [tam, setTam] = useState({ w: 0, h: 0, header: 0 })
    // Herramienta elegida en el footer.
    const [herramienta, setHerramienta] = useState(null)
    // Panel abierto en el drawer (sigue montado mientras se cierra).
    const [drawer, setDrawer] = useState(null)
    const [cerrando, setCerrando] = useState(false)
    const herramientas = HERRAMIENTAS.filter((x) => !x.hidden && (!x.pop || esPop))

    // ── Modo dibujo ──
    const [dibujando, setDibujando] = useState(false)
    const [pincel, setPincel] = useState({ brush: 'pluma', color: '#FFFFFF', size: 8, opacity: 100 })
    // Trazos de esta sesión de dibujo (ids), para el aviso y "Borrar todo".
    const [trazos, setTrazos] = useState([])
    const [dibujoEn, setDibujoEn] = useState('todo')
    const mediaFondo = mediaDePortada(current?.body)
    const dibujoEnValido = mediaFondo.includes(dibujoEn) ? dibujoEn : 'todo'
    const entrarADibujar = () => { onSelect?.(null); onStickerSel?.([]); setTrazos([]); setVolvioDeDibujo(false); setDibujando(true) }
    const borrarTodo = () => {
        const ids = new Set(trazos)
        if (!ids.size) return
        onChange((prev) => {
            const lista = (Array.isArray(prev.body?.stickers) ? prev.body.stickers : []).filter((x) => !ids.has(x.id))
            return { ...prev, body: { ...prev.body, stickers: lista.length ? lista : null } }
        })
        setTrazos([])
    }
    // Selector de color: una tarjeta flotante sobre la paleta / la barra
    // (como el de iOS), no un drawer. Tocar fuera la cierra. Sirve al pincel
    // y, fuera del dibujo, al color de la barra (texto o elemento:
    // `colorCampo`, el campo que pidió la barra).
    const [colorPop, setColorPop] = useState(null) // null | 'abierto' | 'cerrando'
    const [colorCampo, setColorCampo] = useState(null)
    const pickColor = (campo) => {
        setColorCampo(campo)
        setColorPop((c) => (c === 'abierto' && campo === colorCampo ? null : 'abierto'))
    }
    const cerrarColor = () => {
        if (reducirMovimiento()) { setColorPop(null); return }
        setColorPop('cerrando')
        setTimeout(() => setColorPop(null), 200)
    }
    // Salir con transición: la paleta baja y el header de dibujo se va
    // mientras la pieza regresa a su tamaño; luego vuelven header y footer.
    const [saliendoDibujo, setSaliendoDibujo] = useState(false)
    const [volvioDeDibujo, setVolvioDeDibujo] = useState(false)
    // ── Ver en vivo: la página real (iframe de iattend-events) a pantalla
    // completa, con Sin confirmar / Confirmado como en escritorio. ──
    const [vivo, setVivo] = useState(null) // null | 'abierto' | 'cerrando'
    const [vistaConfirmada, setVistaConfirmada] = useState(false)
    const cerrarVivo = () => {
        if (reducirMovimiento()) { setVivo(null); return }
        setVivo('cerrando')
        setTimeout(() => setVivo(null), 260)
    }
    // En vivo, las barras de Safari (arriba y abajo) toman el color de la
    // invitación (su color del tema); al salir regresan a blanco. Safari las
    // pinta con el fondo de html / body, el meta theme-color y el de la raíz.
    const colorVivo = /^#[0-9a-f]{6}$/i.test(current?.body?.color ?? '') ? current.body.color : '#000000'
    useEffect(() => {
        if (!vivo) return undefined
        const html = document.documentElement
        const meta = document.querySelector('meta[name="theme-color"]')
        const antes = { html: html.style.backgroundColor, body: document.body.style.backgroundColor, meta: meta?.getAttribute('content') }
        html.style.backgroundColor = colorVivo
        document.body.style.backgroundColor = colorVivo
        meta?.setAttribute('content', colorVivo)
        return () => {
            html.style.backgroundColor = antes.html
            document.body.style.backgroundColor = antes.body
            if (antes.meta) meta?.setAttribute('content', antes.meta)
        }
    }, [Boolean(vivo), colorVivo])
    // ── Modal (link / pase) ──
    const [modal, setModal] = useState(null)
    const [modalSaliendo, setModalSaliendo] = useState(false)
    const [eligiendo, setEligiendo] = useState(null) // { handleImage, n }
    const abrirModal = (id) => { setHerramienta(id); setEligiendo(null); setModalSaliendo(false); setModal(id) }
    const cerrarModal = () => {
        const fin = () => { setModal(null); setModalSaliendo(false); setEligiendo(null); setHerramienta(null) }
        if (reducirMovimiento()) return fin()
        setModalSaliendo(true)
        setTimeout(fin, MODAL_SALE_MS)
    }
    const elegirFoto = (handleImage) => setEligiendo({ handleImage, n: Date.now() })
    // Elegir desde una barra (el "+" de Fondo): el modal se abre ya en
    // Subidos y, al elegir, se cierra.
    const pickMedia = (request, handleImage) => {
        setEligiendo({ handleImage, request, n: Date.now(), cierra: true })
        setModalSaliendo(false)
        setModal('elegir')
    }

    // ── Fondo: tocar el fondo de la pieza cambia el footer por su barra ──
    const [fotoSel, setFotoSel] = useState(null)
    const [ajustandoFoto, setAjustandoFoto] = useState(false)
    const fotoElegida = mediaFondo.includes(fotoSel) ? fotoSel : mediaFondo[0] ?? null
    const conFondo = section === 'background' && tab !== 'envio' && !dibujando
    useEffect(() => { if (!conFondo) setAjustandoFoto(false) }, [conFondo])
    // Lo elegido en la pieza (elemento, título, notas, fecha, lugar, clima,
    // fondo, canción) cambia el footer por su barra: la misma de escritorio
    // (Workspace/barraContextual.jsx). Se queda montada mientras sale (baja
    // con un fundido) y, a la vez, el footer regresa con su transición.
    const barra = useBarraContextual({
        section, current, onChange, esPop, carpeta, pieceWidth: CARD.w,
        stickerSel: stickerSel ?? [], setStickerSel: onStickerSel ?? (() => {}),
        pickColor, colorPop: colorPop === 'abierto' && !dibujando, colorField: colorCampo,
        pickMedia, fotoElegida, setFotoSel, ajustandoFoto, setAjustandoFoto,
    })
    const conBarra = Boolean(barra.bar) && tab !== 'envio' && !dibujando
    const [barraSeccion, setBarraSeccion] = useState(null)
    // La barra de la sección que se va (mientras sale con su fundido).
    const barraSalida = useBarraContextual({
        section: barraSeccion, current, onChange, esPop, carpeta, pieceWidth: CARD.w,
        stickerSel: stickerSel ?? [], setStickerSel: onStickerSel ?? (() => {}),
        pickColor, colorPop: false, colorField: null,
        pickMedia, fotoElegida, setFotoSel, ajustandoFoto, setAjustandoFoto,
    })
    const [barraMontada, setBarraMontada] = useState(false)
    const [barraSaliendo, setBarraSaliendo] = useState(false)
    useEffect(() => {
        if (conBarra) { setBarraSeccion(section); setBarraMontada(true); setBarraSaliendo(false); return undefined }
        if (!barraMontada) return undefined
        if (reducirMovimiento()) { setBarraMontada(false); return undefined }
        setBarraSaliendo(true)
        const id = setTimeout(() => { setBarraMontada(false); setBarraSaliendo(false) }, BARRA_SALE_MS)
        return () => clearTimeout(id)
    }, [conBarra, section])

    // Con el teclado abierto (buscar canción) la barra sube encima de él: en
    // iOS lo fijo se queda detrás del teclado.
    // Teclado y popovers de las barras como tarjeta flotante (useEditorMovil).
    const { teclado, vvTop } = useEditorMovil()

    const salirDeDibujar = () => {
        setColorPop(null)
        const fin = () => { setSaliendoDibujo(false); setDibujando(false); setVolvioDeDibujo(true) }
        if (reducirMovimiento()) return fin()
        setSaliendoDibujo(true)
        setTimeout(fin, 260)
    }
    // Lo que acomoda la pieza y el footer: ya fuera del dibujo desde que
    // empieza a salir.
    const enDibujo = dibujando && !saliendoDibujo
    const setBody = (patch, opts) => onChange((prev) => ({ ...prev, body: { ...prev.body, ...patch } }), opts)
    const updateForm = (fn, opts) => onChange((prev) => ({ ...prev, body: { ...prev.body, form: fn(prev.body?.form ?? null) } }), opts)
    const updateSponsors = (fn, opts) => onChange((prev) => ({ ...prev, body: { ...prev.body, sponsors: fn(prev.body?.sponsors ?? {}) } }), opts)
    // Pop en línea: lo privado en la columna acceso, lo público en body.online.
    const updateAcceso = (fn, opts) => onChange((prev) => {
        const acceso = normalizarAcceso(fn(normalizarAcceso(prev.acceso)))
        return { ...prev, acceso, body: { ...prev.body, online: publicoDeAcceso(acceso) } }
    }, opts)
    const setBodyAcceso = (patch, opts) => onChange((prev) => ({ ...prev, body: { ...prev.body, ...patch } }), opts)
    const chatMensajes = useMensajesChat(current?.id, esPop && Boolean(current?.body?.showAttendees) && Boolean(current?.body?.chat?.enabled))
    const dias = [...new Set(fechasDelEvento(current?.body ?? {}).map((f) => String(f).slice(0, 10)))]

    // La pieza cabe en lo que queda de la pantalla (también al girar o al
    // cambiar la barra de Safari).
    useLayoutEffect(() => {
        const medir = () => {
            const el = raizRef.current
            if (!el) return
            const header = headerRef.current ? headerRef.current.getBoundingClientRect().bottom - el.getBoundingClientRect().top : ALTO_HEADER
            setTam({ w: el.clientWidth, h: el.clientHeight, header })
        }
        medir()
        window.addEventListener('resize', medir)
        window.visualViewport?.addEventListener('resize', medir)
        return () => {
            window.removeEventListener('resize', medir)
            window.visualViewport?.removeEventListener('resize', medir)
        }
    }, [])

    // Con el drawer abierto la pieza va entre el estado del guardado y el
    // drawer; si no, en el hueco de siempre.
    const fraccion = PANELES[drawer] ?? 0.5
    const completo = fraccion >= 1
    // A pantalla completa la pieza no se mueve (queda tapada).
    const conDrawer = Boolean(drawer) && !cerrando && !completo
    const altoDrawer = Math.round(tam.h * fraccion)
    // Dibujando: la pieza tan grande como quepa entre el header y la paleta.
    const margen = enDibujo
        ? { arriba: tam.header + ALTO_ESTADO, abajo: ALTO_PALETA + 24 }
        : conDrawer
            ? { arriba: tam.header + ALTO_ESTADO + 4, abajo: altoDrawer + 14 }
            : { arriba: MARGEN.arriba, abajo: MARGEN.abajo }
    const escala = tam.h
        ? Math.max(0.2, Math.min(enDibujo ? 1.6 : 1, (tam.w - (enDibujo ? 16 : MARGEN.x * 2)) / CARD.w, (tam.h - margen.arriba - margen.abajo - (enDibujo ? 0 : 30)) / CARD.h))
        : 1

    // Dónde va la pieza (translate + scale, con la leyenda debajo): centrada
    // en el hueco entre `margen.arriba` y `margen.abajo`.
    const altoPieza = CARD.h * escala
    const piezaX = (tam.w - CARD.w * escala) / 2
    const piezaY = margen.arriba + Math.max(0, (tam.h - margen.arriba - margen.abajo - altoPieza - 30) / 2)
    // Zoom al escribir (título, notas…): el texto elegido se acerca hasta
    // verse de 16 px (Editor/useZoomTexto.js). No en modo dibujo.
    const foco = useZoomTexto(piezaRef)
    const zoom = enDibujo ? null : transformDeZoom(foco, escala, tam.w, Math.max(tam.header, vvTop) + 12, tam.h - teclado - 90, CARD.w)
    const zoomAnim = useZoomAnimando(Boolean(zoom))
    // Sin transición hasta que la pieza ya está en su lugar (al montar).
    const [animar, setAnimar] = useState(false)
    useEffect(() => {
        if (!tam.h || animar) return undefined
        const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimar(true)))
        return () => cancelAnimationFrame(id)
    }, [tam.h])

    // El drawer sube desde abajo como una hoja de iOS (solo transform) y la
    // píldora se desvanece; al cerrar, baja y la píldora regresa.
    useLayoutEffect(() => {
        if (!drawer || cerrando || reducirMovimiento()) return
        drawerRef.current?.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: DRAWER_MS, easing: CURVA_HOJA })
    }, [drawer])

    const abrirPanel = (id) => { setHerramienta(id); setCerrando(false); setDrawer(id) }
    const cerrarPanel = () => {
        const el = drawerRef.current
        setCerrando(true)
        const fin = () => { setDrawer(null); setCerrando(false); setHerramienta(null) }
        if (!el || reducirMovimiento()) return fin()
        el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], { duration: CERRAR_MS, easing: CURVA_HOJA, fill: 'forwards' }).onfinish = fin
    }
    // En Invitados no hay drawer.
    useEffect(() => { if (tab === 'envio') { setDrawer(null); setCerrando(false); setHerramienta(null); setDibujando(false); setModal(null) } }, [tab])

    // Elementos, Fotos y Subidos: lo tocado entra al centro de la pieza,
    // elegido para moverlo. Un side event de boda no tiene elementos: ahí una
    // foto se vuelve el fondo.
    const elegirElemento = async (item) => {
        if (!esPop) {
            if (item.url && !item.kind?.startsWith?.('icon')) { setBody({ image: item.url }); cerrarPanel() }
            return
        }
        const stickers = Array.isArray(current?.body?.stickers) ? current.body.stickers : []
        const nuevo = await agregarElemento({
            item, punto: { x: 50, y: 40 }, stickers, carpeta, onChange,
            onLleno: (max) => message.warning(t('side_events.stickers_paste_max', { max })),
        })
        if (!nuevo) return
        cerrarPanel()
        onSelect?.('stickers')
        onStickerSel?.([nuevo.id])
    }
    // Lo que el panel Elementos lee de la invitación (como en escritorio):
    // las tipografías de las muestras de texto y su color.
    const fuenteTitulo = current?.body?.title?.font ?? 'Poppins'
    const invitacionElementos = {
        generals: { fonts: { titles: { typeFace: fuenteTitulo }, body: { typeFace: 'Poppins' } }, colors: { accent: '#29262D' } },
    }

    const tituloDrawer = drawer ? t(`side_events.ws_tool_${drawer}`) : ''
    const body = current?.body ?? {}
    const enUso = (url) => (Array.isArray(body.stickers) && body.stickers.some((x) => x.url === url)) || body.image === url
    const panel = drawer === 'design' ? <DesignPanel current={current} setBody={setBody} esPop={esPop} movil />
        : drawer === 'elements' ? <ElementsPanel invitation={invitacionElementos} onElegir={elegirElemento} />
            // Una foto de Ideas entra más grande que un PNG (como en escritorio).
            : drawer === 'photos' ? <PhotosPanel selectedSection="cover" onUse={(url) => elegirElemento({ ...stickerItem(url), w: 60 })} banner={t(esPop ? 'side_events.ws_photos_banner_pop' : 'side_events.ws_photos_banner')} />
                : drawer === 'sponsors' ? <PatrocinadoresPanel body={body} actualizar={updateSponsors} carpeta={carpeta} abierto />
                : drawer === 'acceso' ? <AccesoPanel body={body} setBody={setBodyAcceso} acceso={current?.acceso} actualizarAcceso={updateAcceso} popId={current?.id} />
                : drawer === 'uploads' ? (
                    <UploadsPanel
                        invitationID={carpeta}
                        folders={esPop ? { root: carpeta, videos: `${carpeta}/video`, pngs: null } : undefined}
                        inUse={enUso}
                        draggable={false}
                        onElegir={(item, f) => elegirElemento(f?.kind === 'photo' ? { ...item, w: 60 } : item)}
                    />
                )
                    : null

    return (
        // En vivo, la raíz (fija, toca las orillas) también toma el color: Safari
        // 26 pinta sus barras con el fondo de lo fijo que toca la orilla.
        <div ref={raizRef} className={s.raiz} style={vivo ? { backgroundColor: colorVivo, backgroundImage: 'none' } : undefined}>
            {dibujando ? (
                <header ref={headerRef} className={s.header} data-dibujo data-saliendo={saliendoDibujo || undefined} style={{ height: ALTO_HEADER }}>
                    <button type="button" className={s.icono} onClick={onUndo} disabled={!canUndo} aria-label={t('build_editor.undo')}>
                        <Undo2 size={18} strokeWidth={2} />
                    </button>
                    <button type="button" className={s.icono} onClick={onRedo} disabled={!canRedo} aria-label={t('build_editor.redo')}>
                        <Redo2 size={18} strokeWidth={2} />
                    </button>
                    <span className={s.espacio} />
                    {/* "Dibujar en" (con varias fotos / videos) y Borrar todo (los trazos de esta sesión). */}
                    <div className={s.dibujoHerr}>
                        {mediaFondo.length > 1 && (
                            <>
                                <DibujarEn media={mediaFondo} dibujoEn={dibujoEnValido} onDibujoEn={setDibujoEn} className={s.dibujarEn} />
                                <span className={s.divisor} />
                            </>
                        )}
                        <button type="button" className={s.borrar} onClick={borrarTodo} disabled={!trazos.length} aria-label={t('side_events.draw_clear')}>
                            <Trash2 size={18} strokeWidth={2} />
                        </button>
                    </div>
                    <button type="button" className={`${s.icono} ${s.listo}`} onClick={salirDeDibujar} aria-label={t('side_events.draw_done')}>
                        <Check size={19} strokeWidth={2.2} />
                    </button>
                </header>
            ) : (
            <header ref={headerRef} className={s.header} data-volviendo={volvioDeDibujo || undefined} style={{ height: ALTO_HEADER }}>
                <button type="button" className={s.icono} onClick={onBack} aria-label={t('side_events.back')}>
                    <ArrowLeft size={19} strokeWidth={2} />
                </button>
                <button type="button" className={s.icono} onClick={onUndo} disabled={!canUndo} aria-label={t('build_editor.undo')}>
                    <Undo2 size={18} strokeWidth={2} />
                </button>
                <button type="button" className={s.icono} onClick={onRedo} disabled={!canRedo} aria-label={t('build_editor.redo')}>
                    <Redo2 size={18} strokeWidth={2} />
                </button>
                <span className={s.espacio} />
                <div className={s.segmento} role="tablist">
                    <button type="button" role="tab" aria-selected={tab !== 'envio'} aria-label={t('side_events.tab_design')} className={s.segBtn} data-on={tab !== 'envio' || undefined} onClick={() => onTab('diseno')}>
                        <Palette size={17} strokeWidth={2} />
                    </button>
                    <button type="button" role="tab" aria-selected={tab === 'envio'} aria-label={t('side_events.tab_send')} className={s.segBtn} data-on={tab === 'envio' || undefined} onClick={() => onTab('envio')}>
                        <Users size={17} strokeWidth={2} />
                    </button>
                </div>
                {/* Pop: el candado abre el recuadro de acceso (PopoverAcceso, con
                    "Permitir acompañantes") si viene `envolverAcceso`. */}
                {esPop && (envolverAcceso ?? ((b) => b))(
                    <button
                        type="button"
                        className={s.icono}
                        data-publico={esPublico || undefined}
                        onClick={envolverAcceso ? undefined : onAcceso}
                        disabled={cambiandoAcceso}
                        aria-pressed={esPublico}
                        aria-label={t(esPublico ? 'side_events.access_public' : 'side_events.access_private')}
                    >
                        {esPublico ? <LockOpen size={18} strokeWidth={2} /> : <Lock size={18} strokeWidth={2} />}
                    </button>
                )}
                <button type="button" className={s.icono} onClick={() => (compartirBloqueado ? onCompartirBloqueado?.() : abrirModal('compartir'))} aria-label={t('side_events.share_btn')}>
                    <Share size={18} strokeWidth={2} />
                </button>
            </header>
            )}
            <div className={s.estado} style={{ top: `calc(env(safe-area-inset-top) + ${ALTO_HEADER + 6}px)`, height: ALTO_ESTADO }}>
                <EstadoGuardado estado={estadoGuardado} onReintentar={onReintentar} />
            </div>

            {tab === 'envio' && (
                // Pegada al header (el estado del guardado, cuando sale, va encima).
                <div className={s.invitados} style={{ top: `calc(env(safe-area-inset-top) + ${ALTO_HEADER + 4}px)` }}>{invitados}</div>
            )}

            <div
                className={s.escenario}
                data-animar={animar || undefined}
                style={tab === 'envio' || !tam.h ? { visibility: 'hidden' } : undefined}
                // Tocar el tablero (fuera de la pieza) suelta lo elegido y
                // regresa el footer de herramientas.
                onClick={(e) => {
                    if (e.target !== e.currentTarget || dibujando) return
                    setAjustandoFoto(false)
                    onSelect?.(null)
                    onStickerSel?.([])
                }}
            >
                    <div
                        ref={piezaRef}
                        data-zoom-anim={zoomAnim || undefined}
                        className={s.pieza}
                        data-morph="stage"
                        data-morphing={stageMorphState}
                        style={{ width: CARD.w, transform: zoom ? `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.escala})` : `translate(${piezaX}px, ${piezaY}px) scale(${escala})`, '--canvas-zoom': zoom?.escala ?? escala }}
                    >
                        <SideCanvas
                            key={current?.id}
                            current={current}
                            onChange={onChange}
                            selected={section}
                            onSelect={(zona) => {
                                // Color del tema → Diseño; Asistentes, Itinerario y
                                // Formulario → su panel en un modal.
                                if (zona === 'color') { onSelect?.(null); abrirPanel('design'); return }
                                if (esPop && ZONA_MODAL[zona]) { onStickerSel?.([]); onSelect?.(null); abrirModal(ZONA_MODAL[zona]); return }
                                // Patrocinadores: su panel en el drawer (sin ícono en el footer,
                                // como Itinerario); al cerrarlo queda su barra.
                                if (esPop && zona === 'sponsors') { onStickerSel?.([]); onSelect?.(zona); abrirPanel('sponsors'); return }
                                // En línea, el lugar abre el panel Acceso.
                                if (esPop && (zona === 'map' || zona === 'place' || zona === 'weather')) { onStickerSel?.([]); onSelect?.(zona); abrirPanel('acceso'); return }
                                if (zona !== 'stickers') onStickerSel?.([])
                                onSelect?.(zona)
                            }}
                            stickerSel={stickerSel}
                            onStickerSel={onStickerSel}
                            conCancion={esPop}
                            conAsistentes={esPop}
                            asistentes={asistentes}
                            chatMensajes={chatMensajes.mensajes}
                            barMode
                            movil
                            pincel={dibujando ? pincel : null}
                            onTrazo={(tipo, id) => { if (id) setTrazos((x) => [...x, id]) }}
                            sinTrazos={trazos.length === 0}
                            soloDibujo={dibujando}
                            fotoFija={dibujando && dibujoEnValido !== 'todo' ? dibujoEnValido : conFondo ? fotoElegida : null}
                            ajustarFoto={ajustandoFoto && conFondo ? fotoElegida : null}
                            dibujoEn={dibujoEnValido}
                        />
                    </div>
                <span className={s.leyenda} data-oculta={conDrawer || enDibujo || undefined} style={{ transform: `translateY(${piezaY + altoPieza + 14}px)` }}>{t('side_events.canvas_caption')}</span>
            </div>

            {tab !== 'envio' && (
                <nav ref={footerRef} className={s.footer} data-oculto={drawer || enDibujo || conBarra || undefined} style={{ height: ALTO_FOOTER }} aria-label={t('side_events.mobile_tools')}>
                    {/* Las herramientas se recorren de lado; Ver en vivo queda fijo a la derecha. */}
                    <div className={s.footerHerr}>
                    {herramientas.map((h) => {
                        const { id } = h
                        const aviso = id === 'link' && soloVideos(current?.body) && !current?.body?.linkImage
                        return (
                            <button
                                key={id}
                                type="button"
                                className={s.herramienta}
                                data-on={herramienta === id || undefined}
                                aria-pressed={herramienta === id}
                                aria-label={t(`side_events.ws_tool_${id}`)}
                                onClick={() => (id === 'draw' ? entrarADibujar() : MODALES.has(id) ? abrirModal(id) : PANELES[id] ? abrirPanel(id) : setHerramienta((h) => (h === id ? null : id)))}
                            >
                                <h.icon size={21} strokeWidth={1.8} />
                                {aviso && <span className={s.aviso} aria-hidden />}
                            </button>
                        )
                    })}
                    </div>
                    <span className={s.footerDivisor} aria-hidden />
                    <button type="button" className={s.vivoBtn} onClick={() => setVivo('abierto')} aria-label={t('side_events.live')}>
                        <Eye size={22} strokeWidth={2} />
                    </button>
                </nav>
            )}

            {barraMontada && (
                // La barra Fondo de escritorio en lugar del footer (con scroll
                // de lado si no cabe); Ajustar la cambia por la de ajuste (su
                // ancho crece o se encoge desde el de la anterior, como en
                // escritorio).
                <div
                    className={s.barraFondo}
                    key={barraSeccion}
                    data-saliendo={barraSaliendo || undefined}
                    style={teclado > 0 ? { bottom: teclado + 10 } : undefined}
                >
                    {conBarra ? barra.bar : barraSalida.bar}
                </div>
            )}

            {tab !== 'envio' && dibujando && (
                <div className={s.paletaDibujo} data-saliendo={saliendoDibujo || undefined}>
                    <PaletaDibujo pincel={pincel} setPincel={setPincel} temaColor={current?.body?.color} onOtroColor={() => setColorPop((c) => (c === 'abierto' ? null : 'abierto'))} horizontal />
                </div>
            )}

            {tab !== 'envio' && colorPop && (dibujando || barra.colorTarget) && (
                <>
                    <div className={s.colorFondo} onPointerDown={cerrarColor} aria-hidden />
                    <div className={s.colorModal} data-cerrando={colorPop === 'cerrando' || undefined} role="dialog" aria-label={t('build_editor.colors_title')}>
                        {dibujando ? (
                            <ColoresIOS
                                value={pincel.color}
                                onChange={(hex) => setPincel((p) => ({ ...p, color: hex }))}
                                opacity={pincel.opacity}
                                onOpacity={(v) => setPincel((p) => ({ ...p, opacity: v }))}
                                opacidadMin={10}
                                className={s.coloresDibujo}
                                conGuardados={false}
                            />
                        ) : (
                            <ColoresIOS
                                value={barra.colorTarget.value}
                                onChange={(hex, o) => barra.colorTarget.onPick(hex, o)}
                                className={s.coloresDibujo}
                                conGuardados={false}
                            />
                        )}
                    </div>
                </>
            )}

            {tab !== 'envio' && modal && (
                <div className={s.modalCapa} data-saliendo={modalSaliendo || undefined}>
                    <div className={s.modalVelo} onPointerDown={cerrarModal} aria-hidden />
                    <section className={s.modal} data-modal={modal} role="dialog" aria-label={t(modal === 'compartir' ? 'side_events.share_btn' : modal === 'elegir' ? 'side_events.ws_tool_uploads' : `side_events.ws_tool_${modal}`)}>
                        <div className={s.drawerCabeza}>
                            <span className={s.drawerTitulo}>{t(eligiendo ? 'side_events.ws_tool_uploads' : modal === 'compartir' ? 'side_events.share_btn' : `side_events.ws_tool_${modal}`)}</span>
                            <button type="button" className={s.drawerListo} onClick={eligiendo && !eligiendo.cierra ? () => setEligiendo(null) : cerrarModal} aria-label={t('side_events.mobile_panel_done')}>
                                <Check size={24} strokeWidth={2} />
                            </button>
                        </div>
                        <div className={s.modalCuerpo} data-tool-body>
                            {eligiendo ? (
                                <UploadsPanel
                                    invitationID={carpeta}
                                    folders={esPop ? { root: carpeta, videos: `${carpeta}/video`, pngs: null } : undefined}
                                    inUse={enUso}
                                    draggable={false}
                                    mediaRequest={{
                                        ...(eligiendo.request ?? {}),
                                        n: eligiendo.n,
                                        invitationID: carpeta,
                                        handleImage: (url, ...rest) => { eligiendo.handleImage(url, ...rest); if (eligiendo.cierra) cerrarModal(); else setEligiendo(null) },
                                    }}
                                    clearMedia={eligiendo.cierra ? cerrarModal : () => setEligiendo(null)}
                                    movil
                                />
                            ) : modal === 'compartir' ? (
                                <CompartirContenido
                                    current={current}
                                    url={urlPublica}
                                    ancho={Math.max(200, tam.w - AIRE_COMPARTIR.lados)}
                                    alto={Math.max(220, tam.h - AIRE_COMPARTIR.alto)}
                                    conHoja
                                    enFila
                                    // El QR, la mitad del ancho de la portada.
                                    qr={Math.round(Math.max(200, tam.w - AIRE_COMPARTIR.lados) * 0.5)}
                                />
                            ) : modal === 'interaction' ? (
                                <InteractionPanel body={current?.body ?? {}} setBody={setBody} eventoId={current?.id} chatMensajes={chatMensajes} />
                            ) : modal === 'itinerary' ? (
                                <ItineraryPanel current={current} setBody={setBody} dias={dias} />
                            ) : modal === 'registration' ? (
                                <FormularioPanel body={current?.body ?? {}} updateForm={updateForm} eventoId={current?.id} />
                            ) : modal === 'link' ? (
                                <LinkPanel current={current} setBody={setBody} onPickImage={elegirFoto} />
                            ) : (
                                <WalletPanelPop current={current} setBody={setBody} onPickImage={elegirFoto} />
                            )}
                        </div>
                    </section>
                </div>
            )}

            {tab !== 'envio' && drawer && (
                <section ref={drawerRef} className={s.drawer} data-completo={completo || undefined} data-panel={drawer} style={{ height: altoDrawer }} aria-label={tituloDrawer}>
                    <div className={s.drawerAdentro}>
                        <div className={s.drawerCabeza}>
                            <span className={s.drawerAsa} aria-hidden />
                            <span className={s.drawerTitulo}>{tituloDrawer}</span>
                            <button type="button" className={s.drawerListo} onClick={cerrarPanel} aria-label={t('side_events.mobile_panel_done')}>
                                <Check size={24} strokeWidth={2} />
                            </button>
                        </div>
                        <div className={s.drawerCuerpo} data-tool-body>{panel}</div>
                    </div>
                </section>
            )}
            {vivo && (
                <div className={s.vivo} data-cerrando={vivo === 'cerrando' || undefined} style={{ background: colorVivo }}>
                    <SideEventHost config={{
                        ...current,
                        ...(asistentes ? { _asistentes: asistentes } : {}),
                        ...(chatMensajes.mensajes ? { _chat: chatMensajes.mensajes.slice(0, 40) } : {}),
                        ...(vistaConfirmada ? { _vistaConfirmada: true } : {}),
                    }} />
                    <div className={s.vivoBarra}>
                        <button type="button" className={s.vivoCerrar} onClick={cerrarVivo} aria-label={t('build_editor.close')}>
                            <X size={20} strokeWidth={2.2} />
                        </button>
                        <div className={s.segmento} role="tablist">
                            {[false, true].map((on) => (
                                <button
                                    key={String(on)}
                                    type="button"
                                    role="tab"
                                    aria-selected={vistaConfirmada === on}
                                    className={s.vivoSeg}
                                    data-on={vistaConfirmada === on || undefined}
                                    onClick={() => setVistaConfirmada(on)}
                                >
                                    {t(on ? 'build_editor.live_confirmed' : 'build_editor.live_unconfirmed')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
