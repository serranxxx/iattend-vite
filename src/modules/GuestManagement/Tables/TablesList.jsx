import React, { useMemo, useState } from 'react'
import { Button, Dropdown, Input, Tooltip, message } from 'antd'
import { ChevronDown, ChevronUp, Lock, MoreHorizontal, Plus, Unlock } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { TransferPicker } from './TransferPicker'
import styles from './TablesList.module.css'

const SHAPE_LABELS = {
    round: 'Redonda',
    square: 'Cuadrada',
    rectangle: 'Rectangular',
}

// `tables.number` es text: ordenar lexicográficamente da 1, 10, 11, 2.
const byNaturalNumber = (a, b) =>
    String(a.number ?? '').localeCompare(String(b.number ?? ''), undefined, { numeric: true })

/**
 * Vista "Lista de mesas" (§5.3) — la vista de trabajo del drawer.
 *
 * El mapa contesta "¿cómo se ve mi salón?"; esta lista contesta "¿quién está
 * dónde y dónde cabe?". Es una lista con tira de asientos y no una grilla de
 * tarjetas porque así las 24 mesas caben de un jalón y la ocupación es
 * comparable de un vistazo entre filas.
 */
export const TablesList = ({
    tables = [],
    guests = [],
    // El control de orden vive en la fila del toggle, junto al switch de vista.
    sortBy = 'number', // 'number' | 'emptiest' | 'space'
    onRefresh,
    onOpenTable,
}) => {
    const [expandedId, setExpandedId] = useState(null)
    const [renamingId, setRenamingId] = useState(null)
    const [renameDraft, setRenameDraft] = useState('')
    const [movingGuestId, setMovingGuestId] = useState(null)
    const [guestMenuId, setGuestMenuId] = useState(null)
    const [moveAllTableId, setMoveAllTableId] = useState(null)

    const closeGuestMenu = () => {
        setGuestMenuId(null)
        setMovingGuestId(null)
    }

    const realTables = useMemo(
        () => tables.filter(t => t.shape !== 'dance'),
        [tables]
    )

    const rows = useMemo(() => {
        const withOccupancy = realTables.map(table => {
            const occupants = guests
                .filter(g => g.table === table.id)
                .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
            const size = table.size ?? 0
            return {
                table,
                occupants,
                size,
                taken: occupants.length,
                free: Math.max(size - occupants.length, 0),
                isFull: occupants.length >= size && size > 0,
            }
        })

        if (sortBy === 'emptiest') {
            return withOccupancy.sort((a, b) => b.free - a.free || byNaturalNumber(a.table, b.table))
        }
        // "Con espacio": las que todavía admiten gente primero, en su orden
        // natural. No esconde las llenas — siguen abajo, por si hay que sacar
        // a alguien de ahí.
        if (sortBy === 'space') {
            return withOccupancy.sort(
                (a, b) => (b.free > 0) - (a.free > 0) || byNaturalNumber(a.table, b.table)
            )
        }
        return withOccupancy.sort((a, b) => byNaturalNumber(a.table, b.table))
    }, [realTables, guests, sortBy])

    // Grupos de acompañantes: el líder es quien tiene has_companion sin companion_id.
    const groupSizeOf = (guest) => {
        const leaderId = guest.companion_id ?? (guest.has_companion ? guest.id : null)
        if (leaderId == null) return 0
        const members = guests.filter(
            g => g.id === leaderId || String(g.companion_id) === String(leaderId)
        )
        return members.length
    }

    const leaderNameOf = (guest) => {
        if (guest.companion_id == null) return null
        return guests.find(g => String(g.id) === String(guest.companion_id))?.name ?? null
    }

    /* ── Mutaciones ────────────────────────────────────────────────────── */

    const assignGuests = async (guestIds, tableId) => {
        if (!guestIds.length) return
        const { error } = await supabase
            .from('guests')
            .update({ table: tableId, last_action_by: 'admin' })
            .in('id', guestIds)

        if (error) {
            console.error('Error asignando mesa:', error.message)
            message.error('No se pudo actualizar la mesa')
            return
        }
        onRefresh?.()
    }

    const transferGuest = async (targetTable, guest) => {
        await assignGuests([guest.id], targetTable.id)
        message.success(`${guest.name} se movió a la mesa #${targetTable.number}`)
    }

    const moveAll = async (targetTable, occupants) => {
        await assignGuests(occupants.map(g => g.id), targetTable.id)
        message.success(`${occupants.length} invitados se movieron a la mesa #${targetTable.number}`)
    }

    const removeFromTable = async (guest) => {
        await assignGuests([guest.id], null)
        message.success(`${guest.name} quedó sin mesa`)
    }

    const emptyTable = async (row) => {
        if (!row.occupants.length) return
        await assignGuests(row.occupants.map(g => g.id), null)
        message.success(`La mesa #${row.table.number} quedó vacía`)
    }

    const toggleLock = async (table) => {
        const { error } = await supabase
            .from('tables')
            .update({ locked: !table.locked, last_update_at: new Date() })
            .eq('id', table.id)

        if (error) {
            // La columna llega con supabase-seating-chart-v2-migration.sql; si esa
            // migración no se ha corrido, decirlo en vez de un error genérico.
            const missingColumn = error.message?.includes('locked')
            console.error('Error al bloquear mesa:', error.message)
            message.error(missingColumn
                ? 'Falta correr la migración que agrega tables.locked'
                : 'No se pudo bloquear la mesa')
            return
        }
        onRefresh?.()
    }

    const saveRename = async (table) => {
        const name = renameDraft.trim()
        setRenamingId(null)
        if (name === (table.name ?? '')) return

        const { error } = await supabase
            .from('tables')
            .update({ name: name || null, last_update_at: new Date() })
            .eq('id', table.id)

        if (error) {
            console.error('Error al renombrar mesa:', error.message)
            message.error('No se pudo renombrar la mesa')
            return
        }
        onRefresh?.()
    }

    /* ── Render ────────────────────────────────────────────────────────── */

    if (!realTables.length) {
        return (
            <div className={styles.empty}>
                <span className={styles.emptyTitle}>Todavía no hay mesas</span>
                <span className={styles.emptyText}>
                    Crea tu primera mesa desde el mapa y aparecerá aquí con su tira de lugares.
                </span>
            </div>
        )
    }

    return (
            <div className={`${styles.list} scroll-invitation`}>
                {rows.map((row) => {
                    const { table, occupants, size, taken, free, isFull } = row
                    const isExpanded = expandedId === table.id
                    const isRenaming = renamingId === table.id

                    return (
                        <div
                            key={table.id}
                            className={`${styles.row} ${isExpanded ? styles.rowExpanded : ''}`}
                        >
                            <div
                                className={styles.rowHeader}
                                onClick={() => setExpandedId(isExpanded ? null : table.id)}
                            >
                                <span className={`${styles.numberBadge} ${isFull ? styles.numberBadgeFull : ''}`}>
                                    #{table.number}
                                </span>

                                <div className={styles.identity}>
                                    <div className={styles.nameRow}>
                                        {isRenaming ? (
                                            <Input
                                                size='small'
                                                autoFocus
                                                value={renameDraft}
                                                placeholder='Nombre de la mesa'
                                                style={{ borderRadius: '99px', width: '180px' }}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => setRenameDraft(e.target.value)}
                                                onPressEnter={() => saveRename(table)}
                                                onBlur={() => saveRename(table)}
                                            />
                                        ) : (
                                            <span className={`${styles.name} ${!table.name ? styles.nameEmpty : ''}`}>
                                                {table.name || 'Sin nombre'}
                                            </span>
                                        )}
                                        {table.locked && (
                                            <span className={styles.lockedTag}>
                                                <Lock size={10} /> bloqueada
                                            </span>
                                        )}
                                    </div>
                                    <span className={styles.meta}>
                                        {SHAPE_LABELS[table.shape] ?? SHAPE_LABELS.round} · {size} lugares
                                    </span>
                                </div>

                                <div className={styles.seatStrip}>
                                    {Array.from({ length: size }, (_, i) => (
                                        <span
                                            key={i}
                                            className={`${styles.seat} ${i < taken ? styles.seatTaken : styles.seatFree}`}
                                        />
                                    ))}
                                </div>

                                <div className={styles.counts}>
                                    <span className={`${styles.countMain} ${isFull ? styles.countFull : ''}`}>
                                        {taken}/{size}
                                    </span>
                                    <span className={styles.countSub}>
                                        {isFull ? 'completa' : `${free} libres`}
                                    </span>
                                </div>

                                <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                                    <Dropdown
                                        trigger={['click']}
                                        placement='bottomRight'
                                        menu={{
                                            items: [
                                                { key: 'open', label: 'Ver en el mapa' },
                                                { key: 'rename', label: 'Renombrar' },
                                                { key: 'lock', label: table.locked ? 'Desbloquear' : 'Bloquear' },
                                                { key: 'empty', label: 'Vaciar', danger: true, disabled: !taken },
                                            ],
                                            onClick: ({ key, domEvent }) => {
                                                domEvent.stopPropagation()
                                                if (key === 'open') onOpenTable?.(table)
                                                if (key === 'rename') {
                                                    setRenameDraft(table.name ?? '')
                                                    setRenamingId(table.id)
                                                    setExpandedId(table.id)
                                                }
                                                if (key === 'lock') toggleLock(table)
                                                if (key === 'empty') emptyTable(row)
                                            },
                                        }}
                                    >
                                        <Button
                                            size='small'
                                            style={{ borderRadius: '99px' }}
                                            className='primarybutton'
                                            icon={<MoreHorizontal size={14} />}
                                        />
                                    </Dropdown>

                                    <Button
                                        size='small'
                                        style={{ borderRadius: '99px' }}
                                        className='primarybutton'
                                        icon={isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        onClick={() => setExpandedId(isExpanded ? null : table.id)}
                                    />
                                </div>
                            </div>

                            <div className={`${styles.expandWrap} ${isExpanded ? styles.expandWrapOpen : ''}`}>
                              <div className={styles.expandInner}>
                                <div className={styles.expanded}>
                                    {occupants.length === 0 && (
                                        <span className={styles.emptyGuests}>
                                            Nadie sentado en esta mesa todavía.
                                        </span>
                                    )}

                                    {occupants.map((guest) => {
                                        const groupSize = groupSizeOf(guest)
                                        const leaderName = leaderNameOf(guest)
                                        const isLeader = guest.has_companion && guest.companion_id == null

                                        return (
                                            <div key={guest.id} className={styles.guestRow}>
                                                <div className={styles.guestInfo}>
                                                    <span className={styles.guestName}>{guest.name}</span>

                                                    {isLeader && groupSize > 1 && (
                                                        <span className={styles.groupBadge}>
                                                            grupo de {groupSize}
                                                        </span>
                                                    )}

                                                    <span className={styles.guestMeta}>
                                                        {[
                                                            guest.tag,
                                                            guest.side,
                                                            leaderName ? `acompaña a ${leaderName}` : null,
                                                        ].filter(Boolean).join(' · ') || '—'}
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
                                                                onPick={(target) => {
                                                                    closeGuestMenu()
                                                                    transferGuest(target, guest)
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className={styles.guestMenu} onClick={(e) => e.stopPropagation()}>
                                                                <button
                                                                    type='button'
                                                                    className={styles.guestMenuItem}
                                                                    onClick={() => setMovingGuestId(guest.id)}>
                                                                    Mover a otra mesa…
                                                                </button>
                                                                <button
                                                                    type='button'
                                                                    className={`${styles.guestMenuItem} ${styles.guestMenuDanger}`}
                                                                    onClick={() => {
                                                                        closeGuestMenu()
                                                                        removeFromTable(guest)
                                                                    }}>
                                                                    Quitar de la mesa
                                                                </button>
                                                            </div>
                                                        )
                                                    )}
                                                >
                                                    <Button
                                                        size='small'
                                                        style={{ borderRadius: '99px' }}
                                                        className='primarybutton'
                                                        icon={<MoreHorizontal size={14} />}
                                                    />
                                                </Dropdown>
                                            </div>
                                        )
                                    })}

                                    <div className={styles.actions}>
                                        <Tooltip title={isFull ? 'La mesa está completa' : ''}>
                                            <Button
                                                size='small'
                                                style={{ borderRadius: '99px' }}
                                                className='primarybutton--active'
                                                icon={<Plus size={14} />}
                                                aria-disabled={isFull}
                                                onClick={() => { if (!isFull) onOpenTable?.(table) }}
                                            >
                                                Agregar invitado
                                            </Button>
                                        </Tooltip>

                                        <Dropdown
                                            trigger={['click']}
                                            placement='bottomLeft'
                                            disabled={!taken}
                                            open={moveAllTableId === table.id}
                                            onOpenChange={(open) => setMoveAllTableId(open ? table.id : null)}
                                            popupRender={() => (
                                                <TransferPicker
                                                    tables={realTables}
                                                    guests={guests}
                                                    originTableId={table.id}
                                                    seatsNeeded={taken}
                                                    onPick={(target) => {
                                                        setMoveAllTableId(null)
                                                        moveAll(target, occupants)
                                                    }}
                                                />
                                            )}
                                        >
                                            <Button
                                                size='small'
                                                style={{ borderRadius: '99px' }}
                                                className='primarybutton'
                                                aria-disabled={!taken}
                                            >
                                                Mover todos a otra mesa
                                            </Button>
                                        </Dropdown>

                                        <div className={styles.actionsSpacer} />

                                        <span className={styles.actionsLabel}>Mesa:</span>

                                        <Button
                                            size='small'
                                            style={{ borderRadius: '99px' }}
                                            className='primarybutton'
                                            onClick={() => {
                                                setRenameDraft(table.name ?? '')
                                                setRenamingId(table.id)
                                            }}
                                        >
                                            Renombrar
                                        </Button>

                                        <Button
                                            size='small'
                                            style={{ borderRadius: '99px' }}
                                            className='primarybutton'
                                            onClick={() => onOpenTable?.(table)}
                                        >
                                            Forma y sillas
                                        </Button>

                                        <Button
                                            size='small'
                                            style={{ borderRadius: '99px' }}
                                            className='primarybutton'
                                            icon={table.locked ? <Unlock size={13} /> : <Lock size={13} />}
                                            onClick={() => toggleLock(table)}
                                        >
                                            {table.locked ? 'Desbloquear' : 'Bloquear'}
                                        </Button>

                                        <Tooltip title={!taken ? 'La mesa ya está vacía' : ''}>
                                            <Button
                                                size='small'
                                                danger
                                                style={{ borderRadius: '99px' }}
                                                aria-disabled={!taken}
                                                onClick={() => { if (taken) emptyTable(row) }}
                                            >
                                                Vaciar
                                            </Button>
                                        </Tooltip>
                                    </div>
                                </div>
                              </div>
                            </div>
                        </div>
                    )
                })}
            </div>
    )
}
