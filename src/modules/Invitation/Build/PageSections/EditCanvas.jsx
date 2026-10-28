import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover } from 'antd'
import { Music } from 'lucide-react'
import ReactHost from '../../../../components/Host/ReactHost'
import { CoverTitleStyle } from '../BuildSections/CoverTitleStyle'
import { CoverMedia } from '../BuildSections/CoverMedia'
import { CoverDateStyle } from '../BuildSections/CoverDateStyle'
import { DressImages, ModuleBackground, ModuleSeparator, MomentAddress, MomentImage, QuoteBackground } from '../BuildSections/ModuleStyle'
import { ModuleOrder } from './ModuleOrder'
import { CancionFlash } from '../../../SideEvents/CancionFlash'
import styles from './EditCanvas.module.css'

// Los popovers sobre la pieza se cierran al tocar fuera, pero no al usar lo
// que ellos mismos abren (selectores, color, el selector de imágenes): esos
// viven en portales fuera del popover y antd los tomaría como "fuera".
const INSIDE = '.ant-popover, .ant-dropdown, .ant-select-dropdown, .ant-color-picker, .ant-picker-dropdown, .pac-container, .ant-slider, .ant-tooltip, .ant-tabs-dropdown, [data-canvas-popover-trigger]'
const useOutsideClose = (open, onClose) => {
    useEffect(() => {
        if (!open) return
        const onDown = (e) => { if (!e.target.closest(INSIDE)) onClose() }
        document.addEventListener('pointerdown', onDown, true)
        return () => document.removeEventListener('pointerdown', onDown, true)
    }, [open, onClose])
}

// Vidrio esmerilado de los popovers (#FFF al 80 %, blur 8px). Va inline en el
// contenedor del Popover: el CSS-in-JS de antd se inyecta después que el CSS
// de la app y le ganaba al fondo blanco.
const CARD_WIDTH = 390
// Anchos reales de los popovers (contenido + padding + borde).
const TITLE_POPOVER_WIDTH = 302
const MEDIA_POPOVER_WIDTH = 342
const SONG_POPOVER_WIDTH = 322
const MODULE_POPOVER_WIDTH = 302
const EDGE_GAP = 24
// Cuánto sobresale de cada lado el panel que flota sobre las imágenes.
const OVER_BLEED = 24
// Duración de la salida de la columna de módulos (igual que en su CSS).
const ORDER_OUT_MS = 160
// …y cuánto más ancho que eso (centrado sobre las imágenes).
const OVER_SCALE = 1.5

// Sección del editor → llave del módulo en la invitación (casi siempre la
// misma; Personas se edita como "family" pero vive en `people`).
const MODULE_KEY = { family: 'people' }
const moduleKey = (section) => MODULE_KEY[section] ?? section

// Los popovers se portalean al body, pero en React sus eventos siguen
// subiendo por el árbol hasta el tablero de BuildContent, que con un
// mousedown empieza a arrastrarse (pan). Arrastrar algo dentro de un popover
// (una imagen, un slider) movía la invitación entera.
const stopBoardPan = (e) => e.stopPropagation()

const FROST = {
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.65)',
    borderRadius: 16,
    boxShadow: '0 12px 32px rgba(12, 23, 27, 0.18)',
    padding: 0,
}

export const EditCanvas = ({
    invitation,
    invitationID,
    selectedSection,
    onSelectSection,
    onFieldChange,
    scrollToSection,
    onSectionChange,
    textureOverride,
    fontOverride,
    activeLang,
    onHostReady,
    deselectSignal,
    // Parte de la portada elegida en la pieza (title / date / null). Con el
    // título elegido aparece el botón de su tipografía.
    selectedField,
    onClearField,
    setInvitation,
    setSaved,
    onUndo,
    canUndo,
    // Abre una herramienta del riel del editor (EditorWorkspace), p. ej. la
    // Paleta desde el chip "Color del tema".
    onOpenTool,
}) => {
    const { t } = useTranslation()
    // El chip "Color del tema" muestra el color secundario de la paleta.
    const themeColor = invitation?.generals?.colors?.secondary ?? '#FFFFFF'
    const cardRef = useRef(null)
    const songChipRef = useRef(null)

    // Los popovers abren a la izquierda de su ancla. Si la pantalla está
    // apretada y no cabría, el ancla se corre a la derecha lo justo para que
    // el popover no se recorte (en vez de voltearlo). Todo en px de la
    // tarjeta, que está escalada por el zoom del escenario.
    const fitLeft = (leftCardPx, width) => {
        const r = cardRef.current?.getBoundingClientRect()
        if (!r) return leftCardPx
        const scale = r.width / CARD_WIDTH
        const deficit = width + EDGE_GAP - (r.left + leftCardPx * scale)
        return deficit > 0 ? leftCardPx + deficit / scale : leftCardPx
    }

    // Popover de la herramienta del título. El botón vive dentro de la pieza
    // (pegado al bloque del título); la pieza manda su posición y aquí se
    // pone un ancla invisible encima para que el popover se abra ahí.
    // tool = { field, section, rect, side }: "title" (portada) o "background" /
    // "separator" de un módulo. Se cierra si se suelta lo que lo abrió.
    const [tool, setTool] = useState(null)
    useEffect(() => {
        setTool((prev) => {
            if (!prev) return prev
            // Las de la portada (título, fecha) viven mientras su parte siga elegida.
            if (prev.field === 'title' || prev.field === 'date') return selectedField === prev.field ? prev : null
            if (prev.field === 'quote_text' || prev.field === 'quote_image') return selectedSection === 'quote' ? prev : null
            return selectedSection === prev.section ? prev : null
        })
    }, [selectedField, selectedSection])
    // Pegado a la "T": a su izquierda si cabe; si la pantalla está apretada,
    // arriba de ella (antd lo baja si tampoco cabe arriba). Nunca se desliza
    // y se despega del botón.
    const fitsLeft = (leftCardPx, width) => {
        const r = cardRef.current?.getBoundingClientRect()
        if (!r) return true
        const scale = r.width / CARD_WIDTH
        return r.left + leftCardPx * scale - width - EDGE_GAP >= 0
    }
    const onFieldTool = (field, rect, section = 'cover') => {
        // Título y fecha: pegados a su bloque (izquierda si cabe, si no arriba).
        const isTitle = field === 'title' || field === 'date' || field === 'quote_text'
        const width = field === 'title' || field === 'quote_text' ? TITLE_POPOVER_WIDTH
            : field === 'cover_media' ? MEDIA_POPOVER_WIDTH : MODULE_POPOVER_WIDTH
        // La "T" va arriba si no cabe a la izquierda. Los paneles de un módulo
        // (fondo, separador) siempre a la izquierda: si la pantalla está
        // apretada se recorren a la derecha lo justo para no cortarse.
        // Las imágenes del dresscode: el panel se pone justo encima de ellas
        // (mismo lugar y tamaño), no al lado.
        const side = field === 'dress_images' || field === 'gallery_images' ? 'over'
            : isTitle && !fitsLeft(rect.x - 8, width) ? 'top' : 'left'
        const left = side === 'left' ? fitLeft(rect.x - 8, width) : rect.x
        const closed = lastClosed.current
        lastClosed.current = null
        if (closed && closed.field === field && closed.section === section && Date.now() - closed.t < 600) return
        // Fondo de un bloque: siempre a la izquierda de la pieza, pegado a su
        // orilla (y pasando la columna de módulos si está de ese lado), para
        // no taparla. Es una columna con scroll (ScrollPanel).
        let bgPlace = null
        if (field === 'background' || field === 'quote_image') {
            const r = cardRef.current?.getBoundingClientRect()
            const scale = r ? r.width / CARD_WIDTH : 1
            const orderW = orderMounted && orderSide === 'left' ? 64 : 0
            bgPlace = { side: 'left', left: -8 - orderW / scale }
        }
        setTool((prev) => (prev && prev.field === field && prev.section === section
            ? null // otro toque al mismo botón lo cierra
            : { field, section, rect, side, left, ...(bgPlace ?? {}) }))
    }
    useOutsideClose(Boolean(tool), () => setTool(null))

    // Tocar dentro de la pieza también cierra los popovers (la pieza vive en
    // un iframe: useOutsideClose no ve esos toques). Si el toque era el mismo
    // botón que abrió el popover, el REMOTE_FIELD_TOOL que llega justo
    // después no debe volver a abrirlo: ese toque lo cierra (como antes).
    const lastClosed = useRef(null)
    const onPiecePointerDown = () => {
        setTool((prev) => {
            if (prev) lastClosed.current = { field: prev.field, section: prev.section, t: Date.now() }
            return null
        })
        setChipPop(null)
    }

    // Popover del chip "Canción" de arriba. `chipPop` = { kind, ...ancla en
    // px de la tarjeta } calculada al abrir. ("Cambiar fondo" ya no es chip:
    // es un botón dentro de la portada que manda REMOTE_FIELD_TOOL
    // "cover_media".)
    const [chipPop, setChipPop] = useState(null)
    useOutsideClose(Boolean(chipPop), () => setChipPop(null))
    // Los chips solo están en la portada: al irse de ella se cierra su popover.
    useEffect(() => { if (selectedSection !== 'cover') setChipPop(null) }, [selectedSection])
    // El ancla se calcula al abrir: si la ventana cambia de tamaño con un
    // popover abierto, se cierra en vez de quedar mal colocado.
    useEffect(() => {
        const onResize = () => { setTool(null); setChipPop(null) }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    // Columna de módulos (T, deshacer y la pill): aparece al elegir algo en la
    // pieza y se va al tocar fuera (deselectSignal). Entra y sale con
    // animación: al ocultarse se queda montada lo que dura la salida.
    const [orderOpen, setOrderOpen] = useState(false)
    const showOrder = orderOpen && selectedSection !== 'cover'
    const [orderMounted, setOrderMounted] = useState(false)
    const [orderLeaving, setOrderLeaving] = useState(false)
    // Lado de la columna (izquierda / derecha de la pieza); se recuerda. Por
    // omisión a la derecha (la izquierda es del riel de herramientas).
    const [orderSide, setOrderSide] = useState(() => localStorage.getItem('iattend_order_side_v2') === 'left' ? 'left' : 'right')
    const changeOrderSide = (side) => {
        setOrderSide(side)
        localStorage.setItem('iattend_order_side_v2', side)
    }
    useEffect(() => {
        if (showOrder) { setOrderMounted(true); setOrderLeaving(false); return }
        if (!orderMounted) return
        setOrderLeaving(true)
        const timer = setTimeout(() => { setOrderMounted(false); setOrderLeaving(false) }, ORDER_OUT_MS)
        return () => clearTimeout(timer)
    }, [showOrder])
    useEffect(() => { if (deselectSignal) setOrderOpen(false) }, [deselectSignal])
    const selectFromPiece = (type, field) => {
        setOrderOpen(true)
        onSelectSection(type, field)
    }
    // Al mover un módulo en la columna, la pieza lo sigue: se elige y se baja
    // hasta él (cuando ya se redibujó con el orden nuevo).
    const [scrollRequest, setScrollRequest] = useState(null)
    const moveTimer = useRef(null)
    useEffect(() => () => clearTimeout(moveTimer.current), [])
    const onModuleMoved = (type) => {
        onSelectSection(type)
        clearTimeout(moveTimer.current)
        moveTimer.current = setTimeout(() => setScrollRequest((prev) => ({ section: type, n: (prev?.n ?? 0) + 1 })), 250)
    }
    const getScale = () => {
        const r = cardRef.current?.getBoundingClientRect()
        return r ? r.width / CARD_WIDTH : 1
    }

    const toggleChip = (kind, chip, width) => {
        if (chipPop?.kind === kind) { setChipPop(null); return }
        const r = cardRef.current?.getBoundingClientRect()
        const c = chip.current?.getBoundingClientRect()
        if (!r || !c) return
        const scale = r.width / CARD_WIDTH
        const left = (c.left - r.left) / scale
        setChipPop({ kind, left: fitLeft(left - 8, width), top: (c.top - r.top) / scale, width: c.width / scale, height: c.height / scale })
    }
    const song = invitation?.cover?.song ?? null
    const setSong = (value) => {
        setInvitation((prev) => ({ ...prev, cover: { ...prev.cover, song: value } }))
        setSaved(false)
    }

    return (
        <div className={styles.wrap}>
            {/* En la portada no hay orden que tocar: la columna no aparece. */}
            {orderMounted && (
                <ModuleOrder
                    invitation={invitation}
                    selectedSection={selectedSection}
                    onSelect={(type) => onSelectSection(type)}
                    onMoved={onModuleMoved}
                    setInvitation={setInvitation}
                    setSaved={setSaved}
                    getScale={getScale}
                    onUndo={onUndo}
                    canUndo={canUndo}
                    leaving={orderLeaving}
                    side={orderSide}
                    onSideChange={changeOrderSide}
                />
            )}
            {/* Fuera de la tarjeta (que recorta): flota sobre el teléfono. */}
            {tool?.side === 'over' && (
                <div
                    className={styles.overPanel}
                    data-canvas-popover-trigger
                    style={{ ...FROST, borderRadius: 24, left: tool.rect.x + tool.rect.w / 2, top: tool.rect.y + tool.rect.h / 2, width: (tool.rect.w + OVER_BLEED * 2) * OVER_SCALE }}
                    onMouseDown={stopBoardPan}
                >
                    <DressImages large module={tool.field === 'gallery_images' ? 'gallery' : 'dresscode'} invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} invitationID={invitationID} />
                </div>
            )}
            <div ref={cardRef} className={styles.card} data-tour="preview">
                {/* Canción y color del tema son de la portada: solo con ella a la vista. */}
                {selectedSection === 'cover' && (
                <div className={styles.chips}>
                    <button
                        ref={songChipRef}
                        type="button"
                        className={styles.chip}
                        data-canvas-popover-trigger
                        onClick={() => { onSelectSection('cover'); toggleChip('song', songChipRef, SONG_POPOVER_WIDTH) }}
                    >
                        {song?.albumArt
                            ? <img className={styles.chipArt} src={song.albumArt} alt="" />
                            : <span className={styles.chipIcon}><Music size={13} /></span>}
                        <span className={styles.chipLabel}>{song?.name || t('build_editor.chip_song')}</span>
                    </button>
                    <button type="button" className={`${styles.chip} ${styles.chipRight}`} onClick={() => (onOpenTool ? onOpenTool('palette') : onSelectSection('generals'))}>
                        <span className={styles.chipSwatch} style={{ background: themeColor }} />
                        <span className={styles.chipLabel}>{t('build_editor.chip_theme')}</span>
                    </button>
                </div>
                )}

                {/* Popovers a la izquierda de su ancla (sin voltear; solo se ajustan
                    en vertical). La "T" y el chip mandan dónde está el ancla. */}
                {chipPop && (
                    <Popover
                        open
                        trigger={[]}
                        placement="leftTop"
                        autoAdjustOverflow={{ adjustX: 0, adjustY: 1 }}
                        arrow={false}
                        rootClassName={styles.frostRoot}
                        styles={{ container: FROST }}
                        content={(
                            <div onMouseDown={stopBoardPan}>{
                            // Misma canción que en General (cover.song) y el mismo
                            // buscador que Flash y Save the Date.
                            <div className={styles.songPanel}>
                                <span className={styles.panelTitle}>{t('build_generals.label_song')}</span>
                                <CancionFlash song={song} onChange={setSong} carpeta={invitationID} />
                            </div>
                            }</div>
                        )}
                    >
                        <span className={styles.toolAnchor} style={{ left: chipPop.left, top: chipPop.top, width: chipPop.width, height: chipPop.height }} />
                    </Popover>
                )}

                {tool && tool.side !== 'over' && (
                    <Popover
                        open
                        trigger={[]}
                        placement={tool.side === 'left' ? 'leftTop' : tool.side === 'right' ? 'rightTop' : 'topLeft'}
                        autoAdjustOverflow={{ adjustX: 0, adjustY: 1 }}
                        arrow={false}
                        rootClassName={styles.frostRoot}
                        styles={{ container: FROST }}
                        content={<div onMouseDown={stopBoardPan}>{
                            tool.field.startsWith('dest_image:')
                                ? <MomentImage list={['destinations', 'cards']} invitation={invitation} index={Number(tool.field.split(':')[1])} setInvitation={setInvitation} setSaved={setSaved} invitationID={invitationID} />
                                : tool.field.startsWith('moment_address:')
                                ? <MomentAddress index={Number(tool.field.split(':')[1])} setInvitation={setInvitation} setSaved={setSaved} onDone={() => setTool(null)} />
                                : tool.field.startsWith('moment_image:')
                                ? <MomentImage invitation={invitation} index={Number(tool.field.split(':')[1])} setInvitation={setInvitation} setSaved={setSaved} invitationID={invitationID} />
                                : tool.field === 'cover_media'
                                ? <CoverMedia className={styles.mediaPanel} invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} invitationID={invitationID} />
                                : tool.field === 'title'
                                ? <CoverTitleStyle invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
                                : tool.field === 'quote_text'
                                ? <CoverTitleStyle target="quote" invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
                                : tool.field === 'date'
                                ? <CoverDateStyle invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} />
                                : (tool.field === 'background' && tool.section === 'quote') || tool.field === 'quote_image'
                                ? <QuoteBackground invitation={invitation} setInvitation={setInvitation} setSaved={setSaved} invitationID={invitationID} />
                                : tool.field === 'background'
                                    ? <ModuleBackground invitation={invitation} label={moduleKey(tool.section)} setInvitation={setInvitation} setSaved={setSaved} invitationID={invitationID} />
                                    : <ModuleSeparator invitation={invitation} label={moduleKey(tool.section)} setInvitation={setInvitation} setSaved={setSaved} invitationID={invitationID} />
                        }</div>}
                    >
                        <span
                            className={styles.toolAnchor}
                            style={tool.side === 'left' || tool.side === 'right'
                                ? { left: tool.left, top: tool.rect.y, width: tool.side === 'right' ? 1 : tool.rect.w, height: tool.rect.h }
                                : { left: tool.rect.x, top: tool.rect.y - 8, width: tool.rect.w, height: tool.rect.h }}
                        />
                    </Popover>
                )}

                <div className={`${styles.screen} scroll-invitation`}>
                    <ReactHost
                        config={invitation}
                        invitationID={invitationID}
                        editMode
                        selectedSection={selectedSection}
                        onSelectSection={selectFromPiece}
                        onFieldChange={onFieldChange}
                        scrollToSection={scrollToSection}
                        onSectionChange={onSectionChange}
                        textureOverride={textureOverride}
                        fontOverride={fontOverride}
                        activeLang={activeLang}
                        onReady={onHostReady}
                        deselectSignal={deselectSignal}
                        onFieldTool={onFieldTool}
                        onClearField={() => {
                            // Soltar el texto de la cita también cierra su "T".
                            setTool((prev) => (prev?.field === 'quote_text' ? null : prev))
                            onClearField?.()
                        }}
                        onPiecePointerDown={onPiecePointerDown}
                        scrollRequest={scrollRequest}
                    />
                </div>
            </div>

            <span className={styles.caption}>{t('build_editor.canvas_caption')}</span>
        </div>
    )
}

// "Ver en vivo": cambia el lienzo por la pieza publicada dentro del teléfono.
export const LivePill = ({ on, onToggle }) => {
    const { t } = useTranslation()
    return (
        <button
            type="button"
            className={`${styles.livePill} ${on ? styles.livePillOn : ''}`}
            aria-pressed={on}
            data-tour="live-toggle"
            onClick={onToggle}
        >
            <span className={styles.liveDot} />
            {t('build_editor.live')}
        </button>
    )
}
