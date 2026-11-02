import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Eye, Redo2, Undo2, X } from 'lucide-react'
import { ColoresIOS } from './ColoresIOS'
import { reducirMovimiento } from './inmersivo'
import { useEditorMovil } from './useEditorMovil'
import { transformDeZoom, useZoomAnimando, useZoomTexto } from './useZoomTexto'
import s from '../SideEvents/Movil/EditorMovil.module.css'

/*
  Cascarón del editor en el celular (≤ 750 px) para la invitación: el mismo
  diseño que el editor del Pop (SideEvents/Movil/EditorMovil.jsx, mismos
  estilos: EditorMovil.module.css) con la API de EditorShell, así
  EditorWorkspace le pasa sus mismas herramientas, paneles, barras y color.
  Ver docs/editor-movil-pop.md (el diseño) y docs/editor-movil-invitacion.md.

  · Tablero blanco con puntos y la pieza (`canvas`, card.w × card.h) escalada
    con translate + scale (solo transform: las animaciones van fluidas).
  · Header: salir · deshacer · rehacer · (espacio) · `headerDerecha`.
  · Footer flotante con las herramientas (scroll de lado) y Ver en vivo fijo
    a la derecha. Cada herramienta abre su panel según `modos[id]`: un número
    = drawer que ocupa esa parte del alto (0.5 → la pieza se achica arriba;
    1 → pantalla completa), 'modal' = tarjeta centrada con velo.
  · `bar` (la barra contextual de lo elegido) reemplaza al footer, con su
    transición; con el teclado abierto sube encima de él.
  · Color: `colorPop` + `colorTarget` abren la tarjeta flotante con ColoresIOS.
  · Ver en vivo: `liveContent` a pantalla completa.
  · Tocar el tablero (fuera de la pieza) → `onBlur`.
*/

const CURVA_HOJA = 'cubic-bezier(0.32, 0.72, 0, 1)'
const DRAWER_MS = 520
const CERRAR_MS = 420
const MODAL_SALE_MS = 200
const BARRA_SALE_MS = 240
const ALTO_HEADER = 56
const ALTO_ESTADO = 24
const ALTO_FOOTER = 64
const MARGEN = { x: 20, arriba: ALTO_HEADER + ALTO_ESTADO + 22, abajo: ALTO_FOOTER + 44 }

export const EditorMovilShell = ({
    card = { w: 390, h: 780 },
    canvas,
    tools = [],
    modos = {},
    activeTool,
    toolOpen,
    onPickTool,
    onCloseTool,
    renderTool,
    bar = null,
    colorPop = false,
    colorTarget = null,
    closeColor,
    liveContent = null,
    // Ver en vivo → Sin confirmar / Confirmado (opcional).
    vistaConfirmada,
    onVistaConfirmada,
    onBack,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    headerDerecha = null,
    estado = null,
    onBlur,
}) => {
    const { t } = useTranslation()
    const raizRef = useRef(null)
    const headerRef = useRef(null)
    const drawerRef = useRef(null)
    const piezaRef = useRef(null)
    const [tam, setTam] = useState({ w: 0, h: 0, header: 0 })

    // Barras de Safari blancas y sin zoom al escribir (los textos de la pieza
    // son contentEditable chicos y iOS acercaba la pantalla).
    useEffect(() => {
        const html = document.documentElement
        const meta = document.querySelector('meta[name="theme-color"]')
        const viewport = document.querySelector('meta[name="viewport"]')
        const antes = { html: html.style.backgroundColor, body: document.body.style.backgroundColor, meta: meta?.getAttribute('content'), viewport: viewport?.getAttribute('content') }
        html.style.backgroundColor = '#FFFFFF'
        document.body.style.backgroundColor = '#FFFFFF'
        meta?.setAttribute('content', '#FFFFFF')
        viewport?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1')
        return () => {
            html.style.backgroundColor = antes.html
            document.body.style.backgroundColor = antes.body
            if (antes.meta) meta?.setAttribute('content', antes.meta)
            if (antes.viewport) viewport?.setAttribute('content', antes.viewport)
        }
    }, [])

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

    // ── Panel de la herramienta: drawer o modal según `modos` ──
    // El panel se queda montado mientras se cierra (su animación).
    const [panel, setPanel] = useState(null) // id abierto
    const [cerrando, setCerrando] = useState(false)
    const modo = panel ? (modos[panel] ?? 1) : null
    const esModal = modo === 'modal'
    useEffect(() => {
        if (toolOpen && activeTool) { setPanel(activeTool); setCerrando(false); return undefined }
        if (!panel) return undefined
        if (reducirMovimiento()) { setPanel(null); return undefined }
        setCerrando(true)
        if (esModal) {
            const id = setTimeout(() => { setPanel(null); setCerrando(false) }, MODAL_SALE_MS)
            return () => clearTimeout(id)
        }
        const anim = drawerRef.current?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], { duration: CERRAR_MS, easing: CURVA_HOJA, fill: 'forwards' })
        if (!anim) { setPanel(null); setCerrando(false); return undefined }
        anim.onfinish = () => { setPanel(null); setCerrando(false) }
        return () => { anim.onfinish = null }
    }, [toolOpen, activeTool])
    useLayoutEffect(() => {
        if (!panel || cerrando || esModal || reducirMovimiento()) return
        drawerRef.current?.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: DRAWER_MS, easing: CURVA_HOJA })
    }, [panel])

    const fraccion = typeof modo === 'number' ? modo : 1
    const completo = fraccion >= 1
    const conDrawer = Boolean(panel) && !esModal && !cerrando && !completo
    const altoDrawer = Math.round(tam.h * fraccion)

    // ── Barra contextual en lugar del footer (se queda mientras sale) ──
    const conBarra = Boolean(bar)
    const [barraUltima, setBarraUltima] = useState(null)
    const [barraSaliendo, setBarraSaliendo] = useState(false)
    useEffect(() => {
        if (bar) { setBarraUltima(bar); setBarraSaliendo(false); return undefined }
        if (!barraUltima) return undefined
        if (reducirMovimiento()) { setBarraUltima(null); return undefined }
        setBarraSaliendo(true)
        const id = setTimeout(() => { setBarraUltima(null); setBarraSaliendo(false) }, BARRA_SALE_MS)
        return () => clearTimeout(id)
    }, [bar])
    // Teclado y popovers de las barras como tarjeta flotante (useEditorMovil).
    const { teclado, vvTop } = useEditorMovil()

    // ── Ver en vivo ──
    const [vivo, setVivo] = useState(null) // null | 'abierto' | 'cerrando'
    const cerrarVivo = () => {
        if (reducirMovimiento()) { setVivo(null); return }
        setVivo('cerrando')
        setTimeout(() => setVivo(null), 260)
    }

    // ── La pieza: translate + scale en el hueco que queda ──
    const margen = conDrawer
        ? { arriba: tam.header + ALTO_ESTADO + 4, abajo: altoDrawer + 14 }
        : { arriba: MARGEN.arriba, abajo: MARGEN.abajo }
    const escala = tam.h
        ? Math.max(0.2, Math.min(1, (tam.w - MARGEN.x * 2) / card.w, (tam.h - margen.arriba - margen.abajo - 30) / card.h))
        : 1
    const altoPieza = card.h * escala
    const piezaX = (tam.w - card.w * escala) / 2
    const piezaY = margen.arriba + Math.max(0, (tam.h - margen.arriba - margen.abajo - altoPieza - 30) / 2)
    // Zoom al escribir: el texto elegido se acerca hasta verse de 16 px.
    const foco = useZoomTexto(piezaRef)
    const zoom = transformDeZoom(foco, escala, tam.w, Math.max(tam.header, vvTop) + 12, tam.h - teclado - 90, card.w)
    const zoomAnim = useZoomAnimando(Boolean(zoom))
    const [animar, setAnimar] = useState(false)
    useEffect(() => {
        if (!tam.h || animar) return undefined
        const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimar(true)))
        return () => cancelAnimationFrame(id)
    }, [tam.h])

    const herramientas = tools.filter((x) => !x.hidden)
    const enHerramienta = (id) => (panel === id || tools.find((x) => x.id === panel)?.parent === id)
    const titulo = panel ? (tools.find((x) => x.id === panel)?.title ?? '') : ''
    const contenido = panel ? renderTool?.(panel) : null

    return (
        <div ref={raizRef} className={s.raiz}>
            <header ref={headerRef} className={s.header} style={{ height: ALTO_HEADER }}>
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
                {headerDerecha}
            </header>
            {estado && (
                <div className={s.estado} style={{ top: `calc(env(safe-area-inset-top) + ${ALTO_HEADER + 6}px)`, height: ALTO_ESTADO }}>
                    {estado}
                </div>
            )}

            <div
                className={s.escenario}
                data-animar={animar || undefined}
                style={!tam.h ? { visibility: 'hidden' } : undefined}
                onClick={(e) => { if (e.target === e.currentTarget) onBlur?.() }}
            >
                <div
                    ref={piezaRef}
                    data-zoom-anim={zoomAnim || undefined}
                    className={s.pieza}
                    data-side-card
                    data-zoom={zoom ? true : undefined}
                    style={{ width: card.w, transform: zoom ? `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.escala})` : `translate(${piezaX}px, ${piezaY}px) scale(${escala})`, '--canvas-zoom': zoom?.escala ?? escala }}
                >
                    {canvas}
                </div>
            </div>

            <nav className={s.footer} data-oculto={(panel && !esModal) || conBarra || undefined} style={{ height: ALTO_FOOTER }} aria-label={t('side_events.mobile_tools')}>
                <div className={s.footerHerr}>
                    {herramientas.map((h) => (
                        <button
                            key={h.id}
                            type="button"
                            className={s.herramienta}
                            data-on={enHerramienta(h.id) || undefined}
                            aria-pressed={enHerramienta(h.id)}
                            aria-label={h.title}
                            onClick={() => onPickTool?.(h.id)}
                        >
                            <h.icon size={21} strokeWidth={1.8} />
                        </button>
                    ))}
                </div>
                {liveContent && (
                    <>
                        <span className={s.footerDivisor} aria-hidden />
                        <button type="button" className={s.vivoBtn} onClick={() => setVivo('abierto')} aria-label={t('build_editor.live')}>
                            <Eye size={22} strokeWidth={2} />
                        </button>
                    </>
                )}
            </nav>

            {barraUltima && (
                <div className={s.barraFondo} data-saliendo={barraSaliendo || undefined} style={teclado > 0 ? { bottom: teclado + 10 } : undefined}>
                    {conBarra ? bar : barraUltima}
                </div>
            )}

            {colorPop && colorTarget && (
                <>
                    <div className={s.colorFondo} onPointerDown={closeColor} aria-hidden />
                    <div className={s.colorModal} role="dialog" aria-label={t('build_editor.colors_title')}>
                        <ColoresIOS
                            value={colorTarget.value}
                            onChange={(hex, o) => colorTarget.onPick(hex, o)}
                            className={s.coloresDibujo}
                            conGuardados={false}
                        />
                    </div>
                </>
            )}

            {panel && esModal && (
                <div className={s.modalCapa} data-saliendo={cerrando || undefined}>
                    <div className={s.modalVelo} onPointerDown={onCloseTool} aria-hidden />
                    <section className={s.modal} data-modal={panel} role="dialog" aria-label={titulo}>
                        <div className={s.drawerCabeza}>
                            <span className={s.drawerTitulo}>{titulo}</span>
                            <button type="button" className={s.drawerListo} onClick={onCloseTool} aria-label={t('side_events.mobile_panel_done')}>
                                <Check size={24} strokeWidth={2} />
                            </button>
                        </div>
                        <div className={s.modalCuerpo} data-tool-body>{contenido}</div>
                    </section>
                </div>
            )}

            {panel && !esModal && (
                <section ref={drawerRef} className={s.drawer} data-completo={completo || undefined} data-panel={panel} style={{ height: altoDrawer }} aria-label={titulo}>
                    <div className={s.drawerAdentro}>
                        <div className={s.drawerCabeza}>
                            <span className={s.drawerAsa} aria-hidden />
                            <span className={s.drawerTitulo}>{titulo}</span>
                            <button type="button" className={s.drawerListo} onClick={onCloseTool} aria-label={t('side_events.mobile_panel_done')}>
                                <Check size={24} strokeWidth={2} />
                            </button>
                        </div>
                        <div className={s.drawerCuerpo} data-tool-body>{contenido}</div>
                    </div>
                </section>
            )}

            {vivo && liveContent && (
                <div className={s.vivo} data-cerrando={vivo === 'cerrando' || undefined}>
                    {liveContent}
                    <div className={s.vivoBarra}>
                        <button type="button" className={s.vivoCerrar} onClick={cerrarVivo} aria-label={t('build_editor.close')}>
                            <X size={20} strokeWidth={2.2} />
                        </button>
                        {onVistaConfirmada && (
                            <div className={s.segmento} role="tablist">
                                {[false, true].map((on) => (
                                    <button
                                        key={String(on)}
                                        type="button"
                                        role="tab"
                                        aria-selected={Boolean(vistaConfirmada) === on}
                                        className={s.vivoSeg}
                                        data-on={Boolean(vistaConfirmada) === on || undefined}
                                        onClick={() => onVistaConfirmada(on)}
                                    >
                                        {t(on ? 'build_editor.live_confirmed' : 'build_editor.live_unconfirmed')}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
