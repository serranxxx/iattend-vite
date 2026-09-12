import React, { useEffect, useMemo, useState } from 'react'
import { Dropdown, Switch, Tooltip } from 'antd'
import { Minus, MoreHorizontal, MoveHorizontal, MoveVertical, Plus, X } from 'lucide-react'
import { TransferPicker } from './TransferPicker'
import styles from './TablePanel.module.css'

const SHAPES = [
    { key: 'round', label: 'Redonda', glyph: styles.glyphRound },
    { key: 'square', label: 'Cuadrada', glyph: styles.glyphSquare },
    { key: 'rectangle', label: 'Rectangular', glyph: styles.glyphRect },
]

const MAX_SEATS = { round: 12, square: 16, rectangle: 18 }

/**
 * Panel de edición de mesa (§5.4). Se abre al hacer clic en una mesa del mapa
 * o desde la lista, y concentra todo lo que se puede hacer con una mesa:
 * renombrar, cambiar forma y sillas, bloquear, y mover o sacar invitados.
 */
export const TablePanel = ({
    table,
    onDragStart,
    guests = [],
    tables = [],
    onClose,
    onRename,
    onChangeShape,
    onToggleVertical,
    onChangeSize,
    onToggleLock,
    onAssignGuest,
    onRequestAddGuests,
    onRemoveGuest,
    onMoveAll,
    onEmpty,
    onDelete,
}) => {
    const [nameDraft, setNameDraft] = useState(table.name ?? '')
    const [guestMenuId, setGuestMenuId] = useState(null)
    const [movingGuestId, setMovingGuestId] = useState(null)
    const [moveAllOpen, setMoveAllOpen] = useState(false)

    useEffect(() => { setNameDraft(table.name ?? '') }, [table.id, table.name])

    const realTables = useMemo(() => tables.filter(t => t.shape !== 'dance'), [tables])
    const occupants = useMemo(
        () => guests.filter(g => g.table === table.id),
        [guests, table.id]
    )
    const unseated = useMemo(() => guests.filter(g => !g.table), [guests])

    const size = table.size ?? 0
    const taken = occupants.length
    const free = Math.max(size - taken, 0)
    const maxSeats = MAX_SEATS[table.shape] ?? 12

    // El piso del stepper es la ocupación actual: reducir por debajo dejaría
    // gente fuera en silencio, y eso nunca debe pasar sin decirlo.
    const canDecrease = size > taken
    const canIncrease = size < maxSeats

    const numberIsRepeated = realTables
        .filter(t => String(t.number) === String(table.number)).length > 1

    const groupSizeOf = (guest) => {
        const leaderId = guest.companion_id ?? (guest.has_companion ? guest.id : null)
        if (leaderId == null) return 0
        return guests.filter(
            g => g.id === leaderId || String(g.companion_id) === String(leaderId)
        ).length
    }

    const leaderNameOf = (guest) => {
        if (guest.companion_id == null) return null
        return guests.find(g => String(g.id) === String(guest.companion_id))?.name ?? null
    }

    const commitName = () => {
        const next = nameDraft.trim()
        if (next !== (table.name ?? '')) onRename?.(table, next || null)
    }

    return (
        <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.grabber} />

            {/* El encabezado es la zona de arrastre: el resto del panel tiene
                controles y arrastrar desde ahí pelearía con ellos. */}
            <div className={styles.header} onMouseDown={onDragStart}>
                <span className={`${styles.numberBadge} ${styles.dragHandle}`}>{table.number}</span>

                <div className={styles.nameField}>
                    <input
                        className={styles.nameInput}
                        value={nameDraft}
                        placeholder='Sin nombre'
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onBlur={commitName}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    />
                    <span className={styles.nameHint}>editar</span>
                </div>

                <button
                    type='button'
                    className={styles.closeBtn}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={onClose}
                >
                    <X size={15} />
                </button>
            </div>

            <span className={`${styles.subhead} ${numberIsRepeated ? styles.subheadError : ''}`}>
                {numberIsRepeated
                    ? `Mesa #${table.number} · hay otra mesa con este número`
                    : `Mesa #${table.number} · el número no se puede repetir en el evento`}
            </span>

            <div className={styles.controls}>
                <div className={styles.controlGroup}>
                    <span className={styles.controlLabel}>Forma</span>
                    <div className={styles.shapeRow}>
                        {SHAPES.map(({ key, label, glyph }) => (
                            <Tooltip key={key} title={label}>
                                <button
                                    type='button'
                                    className={`${styles.shapeBtn} ${table.shape === key ? styles.shapeBtnActive : ''}`}
                                    onClick={() => onChangeShape?.(table, key)}
                                >
                                    <span className={`${styles.shapeGlyph} ${glyph}`} />
                                </button>
                            </Tooltip>
                        ))}

                        {/* Solo la rectangular tiene orientación: en cuadrada y
                            redonda girar 90° no cambia nada. */}
                        {table.shape === 'rectangle' && (
                            <Tooltip title={table.vertical ? 'Ponerla horizontal' : 'Ponerla vertical'}>
                                <button
                                    type='button'
                                    className={`${styles.shapeBtn} ${table.vertical ? styles.shapeBtnActive : ''}`}
                                    onClick={() => onToggleVertical?.(table)}
                                >
                                    {table.vertical ? <MoveVertical size={14} /> : <MoveHorizontal size={14} />}
                                </button>
                            </Tooltip>
                        )}
                    </div>
                </div>

                <div className={styles.controlGroup}>
                    <span className={styles.controlLabel}>Sillas</span>
                    <div className={styles.stepper}>
                        <Tooltip title={canDecrease ? '' : `Saca invitados de la mesa antes de bajar de ${taken}`}>
                            <button
                                type='button'
                                className={styles.stepperBtn}
                                aria-disabled={!canDecrease}
                                onClick={() => { if (canDecrease) onChangeSize?.(table, size - 1) }}
                            >
                                <Minus size={14} />
                            </button>
                        </Tooltip>
                        <span className={styles.stepperValue}>{size}</span>
                        <Tooltip title={canIncrease ? '' : `El máximo para esta forma es ${maxSeats}`}>
                            <button
                                type='button'
                                className={styles.stepperBtn}
                                aria-disabled={!canIncrease}
                                onClick={() => { if (canIncrease) onChangeSize?.(table, size + 1) }}
                            >
                                <Plus size={14} />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                <div className={styles.controlGroup}>
                    <span className={styles.controlLabel}>Bloquear</span>
                    <Switch
                        size='small'
                        checked={!!table.locked}
                        onChange={() => onToggleLock?.(table)}
                    />
                </div>
            </div>

            <div className={styles.guestsHead}>
                <span className={styles.guestsCount}>Invitados · {taken} de {size}</span>
                <span className={styles.guestsFree}>
                    {free === 0 ? 'mesa completa' : `${free} ${free === 1 ? 'lugar libre' : 'lugares libres'}`}
                </span>
            </div>

            <div className={`${styles.guestList} scroll-invitation`}>
                {occupants.length === 0 && (
                    <span className={styles.emptyGuests}>Nadie sentado en esta mesa todavía.</span>
                )}

                {occupants.map((guest) => {
                    const isLeader = guest.companion_id == null && guest.has_companion
                    const groupSize = groupSizeOf(guest)
                    const leaderName = leaderNameOf(guest)

                    return (
                        <div key={guest.id} className={styles.guestRow}>
                            <div className={styles.guestInfo}>
                                <span className={styles.guestName}>{guest.name}</span>
                                {isLeader && groupSize > 1 && (
                                    <span className={styles.groupBadge}>grupo de {groupSize}</span>
                                )}
                                <span className={styles.guestMeta}>
                                    {[guest.tag, guest.side, leaderName ? `acompaña a ${leaderName}` : null]
                                        .filter(Boolean).join(' · ') || '—'}
                                </span>
                            </div>

                            <Dropdown
                                trigger={['click']}
                                placement='bottomRight'
                                open={guestMenuId === guest.id}
                                onOpenChange={(open) => {
                                    setGuestMenuId(open ? guest.id : null)
                                    if (!open) setMovingGuestId(null)
                                }}
                                popupRender={() => (
                                    movingGuestId === guest.id ? (
                                        <TransferPicker
                                            tables={realTables}
                                            guests={guests}
                                            originTableId={table.id}
                                            affinityTag={guest.tag}
                                            title={`Mover a ${guest.name}`}
                                            subtitle={[
                                                `Sale de la Mesa #${table.number}`,
                                                guest.tag,
                                                guest.side,
                                            ].filter(Boolean).join(' · ')}
                                            onClose={() => { setGuestMenuId(null); setMovingGuestId(null) }}
                                            onPick={(target) => {
                                                setGuestMenuId(null)
                                                setMovingGuestId(null)
                                                onAssignGuest?.(guest, target)
                                            }}
                                        />
                                    ) : (
                                        <div className={styles.guestMenu} onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type='button'
                                                className={styles.guestMenuItem}
                                                onClick={() => setMovingGuestId(guest.id)}
                                            >
                                                Mover a otra mesa…
                                            </button>
                                            <button
                                                type='button'
                                                className={`${styles.guestMenuItem} ${styles.guestMenuDanger}`}
                                                onClick={() => { setGuestMenuId(null); onRemoveGuest?.(guest) }}
                                            >
                                                Quitar de la mesa
                                            </button>
                                        </div>
                                    )
                                )}
                            >
                                <button type='button' className={styles.rowMenuBtn}>
                                    <MoreHorizontal size={15} />
                                </button>
                            </Dropdown>
                        </div>
                    )
                })}
            </div>

            {/* El selector no es un dropdown: se ancla a la esquina inferior
                derecha del mapa, para que siempre aparezca en el mismo sitio
                en vez de voltearse cuando no cabe bajo el botón. */}
            <button
                type='button'
                className={styles.addGuestBtn}
                aria-disabled={unseated.length === 0}
                onClick={() => { if (unseated.length) onRequestAddGuests?.(table) }}
            >
                {unseated.length === 0
                    ? 'No quedan invitados sin mesa'
                    : '+ Agregar invitado a esta mesa'}
            </button>

            <div className={styles.footer}>
                <Dropdown
                    trigger={['click']}
                    placement='topLeft'
                    open={moveAllOpen}
                    onOpenChange={(open) => setMoveAllOpen(open && taken > 0)}
                    popupRender={() => (
                        <TransferPicker
                            tables={realTables}
                            guests={guests}
                            originTableId={table.id}
                            seatsNeeded={taken}
                            onPick={(target) => { setMoveAllOpen(false); onMoveAll?.(table, target) }}
                        />
                    )}
                >
                    <button type='button' className={styles.footerBtn} aria-disabled={taken === 0}>
                        Mover todos
                    </button>
                </Dropdown>

                <button
                    type='button'
                    className={styles.footerBtn}
                    aria-disabled={taken === 0}
                    onClick={() => { if (taken) onEmpty?.(table) }}
                >
                    Vaciar
                </button>

                <button
                    type='button'
                    className={`${styles.footerBtn} ${styles.footerDanger}`}
                    onClick={() => onDelete?.(table.id)}
                >
                    Eliminar mesa
                </button>
            </div>
        </div>
    )
}
