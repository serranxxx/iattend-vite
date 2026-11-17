import React, { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { Dropdown, Modal, Tooltip } from 'antd'
import { ArrowRightLeft, Lock, RotateCcw, RotateCw, X } from 'lucide-react'
import { TransferPicker } from './TransferPicker'
import { asientosDeMesa } from './asientos'
import { anguloDe } from './seatingGeometry'
import { GAP_PANEL, MESA_PANEL, anguloVisible, inicialesDe, posicionesSillas } from './sillas'
import styles from './TablePanel.module.css'

const SHAPES = [
    { key: 'round', label: 'Redonda' },
    { key: 'square', label: 'Cuadrada' },
    { key: 'rectangle', label: 'Rectangular' },
]

// Lo que el mapa sabe dibujar sin encimar sillas.
const MAX_SEATS = { round: 12, square: 16, rectangle: 18 }

const VISTA_KEY = 'iattend_panel_mesa_vista'

/**
 * Panel de mesa (handoff "Panel de mesa", opción 3a). Se abre al tocar una
 * mesa del mapa o desde la lista. Encabezado con el nombre (se edita ahí
 * mismo), la vista vertical / horizontal y Bloquear; una vista previa de la
 * mesa con sus sillas (forma, sillas ± y giro flotando encima) y la lista
 * de sillas, con los lugares vacíos siempre visibles. Se arrastra a un
 * invitado de una silla a otra, en la lista o en la vista previa (si la
 * silla está ocupada, intercambian). El pie: Agregar invitado, Mover todos,
 * Vaciar y Eliminar.
 */
export const TablePanel = ({
    table,
    onDragStart,
    guests = [],
    tables = [],
    isMobile = false,
    onClose,
    onRename,
    onChangeShape,
    // (table, gradosTotales, { commit }): el giro que se ve (0…345).
    onRotate,
    onChangeSize,
    // "−": quita la última silla vacía (TablesPage.removeEmptySeat).
    onRemoveSeat,
    onToggleLock,
    onAssignGuest,
    // Cambiar de asiento dentro de la mesa (si está ocupado, intercambian).
    onMoveSeat,
    // (table, asiento?): abre el selector de invitados.
    onRequestAddGuests,
    onRemoveGuest,
    onMoveAll,
    onEmpty,
    onDelete,
}) => {
    const [nameDraft, setNameDraft] = useState(table.name ?? '')
    const [vista, setVista] = useState(() => (localStorage.getItem(VISTA_KEY) === 'v' ? 'v' : 'h'))
    const [moveAllOpen, setMoveAllOpen] = useState(false)
    const [moverId, setMoverId] = useState(null)
    // Arrastre compartido por la lista y la vista previa: índice de silla.
    const [arrastre, setArrastre] = useState(null)
    const [sobre, setSobre] = useState(null)
    const [resaltada, setResaltada] = useState(null)

    useEffect(() => { setNameDraft(table.name ?? '') }, [table.id, table.name])

    const realTables = useMemo(() => tables.filter(t => t.shape !== 'dance'), [tables])
    const { lugares, sobran } = useMemo(() => asientosDeMesa(table, guests), [table, guests])
    const unseated = useMemo(() => guests.filter(g => !g.table), [guests])

    const size = table.size ?? 0
    const ocupados = lugares.filter(Boolean).length + sobran.length
    const libres = Math.max(size - ocupados, 0)
    const maxSeats = MAX_SEATS[table.shape] ?? 12
    const puedeQuitar = size > 1 && lugares.includes(null)
    const puedeAgregar = size < maxSeats
    const angulo = anguloVisible(anguloDe(table))
    const forma = SHAPES.find(s => s.key === table.shape) ?? SHAPES[0]
    const mesa = MESA_PANEL[table.shape] ?? MESA_PANEL.round
    const posiciones = useMemo(
        () => posicionesSillas(table.shape, size, { w: mesa.w, h: mesa.h, gap: GAP_PANEL }),
        [table.shape, size, mesa.w, mesa.h]
    )
    const vertical = isMobile || vista === 'v'

    const numeroRepetido = realTables.filter(t => String(t.number) === String(table.number)).length > 1

    const metaDe = (guest) => {
        const titular = guest.companion_id != null
            ? guests.find(g => String(g.id) === String(guest.companion_id))?.name
            : null
        return [guest.tag, guest.side, titular ? `acompaña a ${titular}` : null].filter(Boolean).join(' · ') || '—'
    }

    const commitName = () => {
        const next = nameDraft.trim()
        if (next !== (table.name ?? '')) onRename?.(table, next || null)
    }

    // Vertical ↔ horizontal con View Transitions (si el navegador puede y no
    // se pidió reducir movimiento). Se recuerda en este navegador.
    const cambiarVista = (v) => {
        if (v === vista) return
        localStorage.setItem(VISTA_KEY, v)
        const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        if (!document.startViewTransition || reducir) { setVista(v); return }
        const raiz = document.documentElement
        raiz.setAttribute('data-panel-mesa-transicion', '')
        const t = document.startViewTransition(() => { flushSync(() => setVista(v)) })
        t.finished.finally(() => raiz.removeAttribute('data-panel-mesa-transicion'))
    }

    // ── Arrastrar y soltar (lista y vista previa comparten el índice) ──
    const terminar = () => { setArrastre(null); setSobre(null) }
    const dnd = (i) => ({
        draggable: Boolean(lugares[i]) && Boolean(onMoveSeat),
        onDragStart: (e) => {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', String(i))
            setTimeout(() => { setArrastre(i); setResaltada(null) }, 0)
        },
        onDragOver: (e) => {
            if (arrastre == null) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            if (sobre !== i) setSobre(i)
        },
        onDrop: (e) => {
            e.preventDefault()
            const desde = arrastre
            terminar()
            if (desde == null || desde === i || !lugares[desde]) return
            onMoveSeat?.(lugares[desde], table, i + 1)
            setResaltada(i)
        },
        onDragEnd: terminar,
        onMouseEnter: () => { if (arrastre == null) setResaltada(i) },
        onMouseLeave: () => setResaltada((v) => (v === i ? null : v)),
    })

    const vaciar = () => {
        if (!ocupados) return
        Modal.confirm({
            title: `¿Vaciar la mesa #${table.number}?`,
            content: `${ocupados} ${ocupados === 1 ? 'invitado queda' : 'invitados quedan'} sin mesa.`,
            okText: 'Vaciar',
            cancelText: 'Cancelar',
            okButtonProps: { danger: true },
            zIndex: 10050,
            onOk: () => onEmpty?.(table),
        })
    }

    const moverAOtraMesa = (guest) => (
        <TransferPicker
            tables={realTables}
            guests={guests}
            originTableId={table.id}
            affinityTag={guest.tag}
            title={`Mover a ${guest.name}`}
            subtitle={[`Sale de la Mesa #${table.number}`, guest.tag, guest.side].filter(Boolean).join(' · ')}
            onClose={() => setMoverId(null)}
            onPick={(target) => { setMoverId(null); onAssignGuest?.(guest, target) }}
        />
    )

    const filaInvitado = (guest, i) => {
        const props = i == null ? {} : dnd(i)
        const encima = i != null && sobre === i && arrastre !== i
        return (
            <div
                key={guest.id}
                {...props}
                className={styles.fila}
                data-ocupada
                data-sobre={encima || undefined}
                data-resaltada={(i != null && resaltada === i && arrastre == null) || undefined}
                data-origen={(i != null && arrastre === i) || undefined}
            >
                <Agarre visible={i != null} />
                <span className={styles.numero} data-ocupada title={i == null ? 'Sin silla: la mesa está llena' : undefined}>
                    {i == null ? '—' : i + 1}
                </span>
                <div className={styles.persona}>
                    <span className={styles.nombre}>{guest.name}</span>
                    <span className={styles.meta}>{metaDe(guest)}</span>
                </div>
                <Dropdown
                    trigger={['click']}
                    placement='bottomRight'
                    open={moverId === guest.id}
                    onOpenChange={(abierto) => setMoverId(abierto ? guest.id : null)}
                    popupRender={() => moverAOtraMesa(guest)}
                >
                    <Tooltip title='Mover a otra mesa'>
                        <button type='button' className={styles.iconoFila} draggable={false}>
                            <ArrowRightLeft size={14} />
                        </button>
                    </Tooltip>
                </Dropdown>
                <Tooltip title='Quitar de la mesa'>
                    <button type='button' className={styles.iconoFila} draggable={false} onClick={() => onRemoveGuest?.(guest)}>
                        <X size={15} />
                    </button>
                </Tooltip>
            </div>
        )
    }

    return (
        <div
            className={styles.panel}
            data-vista={vertical ? 'v' : 'h'}
            data-movil={isMobile || undefined}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Encabezado: la zona de arrastre del panel en escritorio. */}
            <div className={styles.header} onMouseDown={onDragStart}>
                <div className={styles.titulo}>
                    <span className={styles.subtitulo} data-error={numeroRepetido || undefined}>
                        Mesa #{table.number} · {forma.label} · {ocupados}/{size}
                        {numeroRepetido ? ' · número repetido' : ''}
                    </span>
                    <input
                        className={styles.nombreMesa}
                        value={nameDraft}
                        placeholder='Sin nombre'
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onBlur={commitName}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    />
                </div>

                {!isMobile && (
                    <div className={styles.segmentado} onMouseDown={(e) => e.stopPropagation()}>
                        {[
                            { key: 'v', label: 'Vista vertical', path: 'M3 12h18' },
                            { key: 'h', label: 'Vista horizontal', path: 'M12 3v18' },
                        ].map(v => (
                            <Tooltip key={v.key} title={v.label}>
                                <button
                                    type='button'
                                    className={styles.segmento}
                                    data-activo={vista === v.key || undefined}
                                    aria-pressed={vista === v.key}
                                    aria-label={v.label}
                                    onClick={() => cambiarVista(v.key)}
                                >
                                    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                        <rect x='3' y='3' width='18' height='18' rx='2' />
                                        <path d={v.path} />
                                    </svg>
                                </button>
                            </Tooltip>
                        ))}
                    </div>
                )}

                <button
                    type='button'
                    className={styles.bloquear}
                    data-bloqueada={table.locked || undefined}
                    title={table.locked ? 'Desbloquear mesa' : 'Bloquear mesa'}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => onToggleLock?.(table)}
                >
                    <Lock size={14} />
                    {table.locked ? 'Bloqueada' : 'Bloquear'}
                </button>

                <button
                    type='button'
                    className={styles.cerrar}
                    aria-label='Cerrar'
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={onClose}
                >
                    <X size={16} />
                </button>
            </div>

            <div className={styles.cuerpo}>
                {/* Vista previa: la mesa con sus sillas, girada; los textos
                    llevan el giro inverso para leerse derechos. */}
                <div className={styles.diagrama}>
                    <div className={styles.grupoMesa} style={{ transform: `rotate(${angulo}deg)` }}>
                        <div
                            className={styles.mesa}
                            style={{ left: -mesa.w / 2, top: -mesa.h / 2, width: mesa.w, height: mesa.h, borderRadius: mesa.radio }}
                        >
                            <span style={{ transform: `rotate(${-angulo}deg)` }}>{table.number}</span>
                        </div>
                        {posiciones.map(([x, y], i) => {
                            const g = lugares[i]
                            const encima = sobre === i && arrastre !== i
                            return (
                                <div
                                    key={i}
                                    {...dnd(i)}
                                    className={styles.silla}
                                    style={{ left: x - 14, top: y - 14 }}
                                    title={g ? `Silla ${i + 1} · ${g.name}` : `Silla ${i + 1} · libre`}
                                    data-ocupada={g ? true : undefined}
                                    data-sobre={encima || undefined}
                                    data-resaltada={(resaltada === i) || undefined}
                                    data-origen={arrastre === i || undefined}
                                >
                                    <span style={{ transform: `rotate(${-angulo}deg)` }}>{g ? inicialesDe(g.name) : i + 1}</span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Sillas − / + */}
                    <div className={`${styles.flotante} ${styles.flotanteSillas}`}>
                        <Tooltip title={puedeQuitar ? 'Quitar la última silla vacía' : 'No hay sillas vacías que quitar'}>
                            <button
                                type='button'
                                className={styles.botonRedondo}
                                aria-disabled={!puedeQuitar}
                                onClick={() => { if (puedeQuitar) onRemoveSeat?.(table) }}
                            >
                                −
                            </button>
                        </Tooltip>
                        <span className={styles.flotanteTexto}>{size} {size === 1 ? 'silla' : 'sillas'}</span>
                        <Tooltip title={puedeAgregar ? '' : `El máximo para esta forma es ${maxSeats}`}>
                            <button
                                type='button'
                                className={styles.botonRedondo}
                                aria-disabled={!puedeAgregar}
                                onClick={() => { if (puedeAgregar) onChangeSize?.(table, size + 1) }}
                            >
                                +
                            </button>
                        </Tooltip>
                    </div>

                    {/* Forma */}
                    <div className={`${styles.flotante} ${styles.flotanteForma}`}>
                        {SHAPES.map(s => (
                            <Tooltip key={s.key} title={s.label}>
                                <button
                                    type='button'
                                    className={styles.botonForma}
                                    data-activo={table.shape === s.key || undefined}
                                    aria-pressed={table.shape === s.key}
                                    aria-label={s.label}
                                    onClick={() => onChangeShape?.(table, s.key)}
                                >
                                    <span className={styles.miniatura} data-forma={s.key} />
                                </button>
                            </Tooltip>
                        ))}
                    </div>

                    {/* Giro */}
                    <div className={`${styles.flotante} ${styles.flotanteGiro}`}>
                        <Tooltip title='Girar 15° a la izquierda'>
                            <button type='button' className={styles.botonRedondo} onClick={() => onRotate?.(table, angulo - 15, { commit: true })}>
                                <RotateCcw size={14} />
                            </button>
                        </Tooltip>
                        <span className={styles.flotanteGrados}>{angulo}°</span>
                        <Tooltip title='Girar 15° a la derecha'>
                            <button type='button' className={styles.botonRedondo} onClick={() => onRotate?.(table, angulo + 15, { commit: true })}>
                                <RotateCw size={14} />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Una fila por silla, en orden; las vacías siempre se ven. */}
                <div className={`${styles.lista} scroll-invitation`}>
                    {lugares.map((guest, i) => {
                        if (guest) return filaInvitado(guest, i)
                        const encima = sobre === i && arrastre !== i
                        return (
                            <div
                                key={`libre-${i}`}
                                {...dnd(i)}
                                className={styles.fila}
                                data-sobre={encima || undefined}
                                data-resaltada={(resaltada === i && arrastre == null) || undefined}
                            >
                                <Agarre visible={false} />
                                <span className={styles.numero}>{i + 1}</span>
                                <span className={styles.libre}>{encima ? 'Soltar aquí' : 'Libre'}</span>
                                <button
                                    type='button'
                                    className={styles.asignar}
                                    aria-disabled={unseated.length === 0}
                                    title={unseated.length === 0 ? 'No quedan invitados sin mesa' : undefined}
                                    onClick={() => { if (unseated.length) onRequestAddGuests?.(table, i + 1) }}
                                >
                                    Asignar
                                </button>
                            </div>
                        )
                    })}
                    {sobran.map((guest) => filaInvitado(guest, null))}
                    {size === 0 && <span className={styles.vacia}>Esta mesa no tiene sillas.</span>}
                </div>
            </div>

            <div className={styles.pie}>
                {libres > 0 && (
                    <button
                        type='button'
                        className={styles.agregar}
                        aria-disabled={unseated.length === 0}
                        title={unseated.length === 0 ? 'No quedan invitados sin mesa' : undefined}
                        onClick={() => { if (unseated.length) onRequestAddGuests?.(table) }}
                    >
                        <span className={styles.agregarMas}>+</span>Agregar invitado
                    </button>
                )}
                <Dropdown
                    trigger={['click']}
                    placement='topLeft'
                    open={moveAllOpen}
                    onOpenChange={(abierto) => setMoveAllOpen(abierto && ocupados > 0)}
                    popupRender={() => (
                        <TransferPicker
                            tables={realTables}
                            guests={guests}
                            originTableId={table.id}
                            seatsNeeded={ocupados}
                            onPick={(target) => { setMoveAllOpen(false); onMoveAll?.(table, target) }}
                        />
                    )}
                >
                    <button type='button' className={styles.botonTexto} aria-disabled={!ocupados}>Mover todos</button>
                </Dropdown>
                <button type='button' className={styles.botonTexto} aria-disabled={!ocupados} onClick={vaciar}>Vaciar</button>
                <button type='button' className={`${styles.botonTexto} ${styles.eliminar}`} onClick={() => onDelete?.(table.id)}>Eliminar</button>
            </div>
        </div>
    )
}

// Agarre de 6 puntos (10 × 16); invisible en las filas libres.
const Agarre = ({ visible }) => (
    <svg width='10' height='16' viewBox='0 0 10 16' className={styles.agarre} data-visible={visible || undefined} aria-hidden>
        <circle cx='2.5' cy='3' r='1.4' /><circle cx='7.5' cy='3' r='1.4' />
        <circle cx='2.5' cy='8' r='1.4' /><circle cx='7.5' cy='8' r='1.4' />
        <circle cx='2.5' cy='13' r='1.4' /><circle cx='7.5' cy='13' r='1.4' />
    </svg>
)
