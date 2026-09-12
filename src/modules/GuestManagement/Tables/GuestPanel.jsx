import React, { useMemo, useState } from 'react'
import { Dropdown, Input } from 'antd'
import { SlidersHorizontal } from 'lucide-react'
import { formatDate } from '../../../helpers/assets/functions'
import { TransferPicker } from './TransferPicker'
import styles from './GuestPanel.module.css'

// Tonos pastel para distinguir grupos de acompañantes de un vistazo.
const GROUP_COLORS = [
    '#FFECB3', '#B3E5FC', '#C8E6C9', '#F8BBD0', '#E1BEE7',
    '#FFCCBC', '#D1C4E9', '#DCEDC8', '#FFD1DC', '#FFF9C4',
]

const normalize = (value) =>
    (value ?? '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Panel de invitados confirmados (§5.5).
 *
 * Conserva las dos cosas que ya funcionaban — el botón de contexto y el color
 * por grupo de acompañantes — y arregla lo que estorbaba: el tooltip tapaba
 * las filas de abajo y tenía muy poco contraste, y los filtros vivían
 * escondidos detrás de un icono.
 */
export const GuestPanel = ({ guests = [], tables = [], onAssign }) => {
    const [search, setSearch] = useState('')
    const [colorGroups, setColorGroups] = useState(true)
    const [onlyUnseated, setOnlyUnseated] = useState(false)
    const [tagFilter, setTagFilter] = useState(null)
    const [sideFilter, setSideFilter] = useState(null)
    const [openPickerFor, setOpenPickerFor] = useState(null)

    const realTables = useMemo(() => tables.filter(t => t.shape !== 'dance'), [tables])

    const groupIdOf = (guest) => {
        if (guest.companion_id != null) return String(guest.companion_id)
        if (guest.has_companion) return String(guest.id)
        return null
    }

    // Un color por grupo, asignado en orden de aparición.
    const groupColors = useMemo(() => {
        const map = new Map()
        let i = 0
        guests.forEach(g => {
            const id = groupIdOf(g)
            if (id && !map.has(id)) {
                map.set(id, GROUP_COLORS[i % GROUP_COLORS.length])
                i++
            }
        })
        return map
    }, [guests])

    const groupSizes = useMemo(() => {
        const counts = new Map()
        guests.forEach(g => {
            const id = groupIdOf(g)
            if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
        })
        return counts
    }, [guests])

    const tagOptions = useMemo(
        () => [...new Set(guests.map(g => g.tag).filter(Boolean))],
        [guests]
    )
    const sideOptions = useMemo(
        () => [...new Set(guests.map(g => g.side).filter(Boolean))],
        [guests]
    )

    const unseatedCount = guests.filter(g => !g.table).length
    const seatedCount = guests.length - unseatedCount
    const groupCount = groupSizes.size

    const filtered = useMemo(() => {
        return guests.filter(g => {
            if (onlyUnseated && g.table) return false
            if (tagFilter && g.tag !== tagFilter) return false
            if (sideFilter && g.side !== sideFilter) return false
            if (search && !normalize(g.name).includes(normalize(search))) return false
            return true
        })
    }, [guests, onlyUnseated, tagFilter, sideFilter, search])

    // Los integrantes de un grupo van juntos: si no, el tinte de color se
    // rompe en franjas sueltas y deja de significar nada.
    const ordered = useMemo(() => {
        const seen = new Set()
        const result = []

        filtered.forEach(guest => {
            if (seen.has(guest.id)) return
            const id = groupIdOf(guest)
            if (!id) {
                seen.add(guest.id)
                result.push(guest)
                return
            }
            filtered
                .filter(g => groupIdOf(g) === id && !seen.has(g.id))
                .sort((a, b) => (a.companion_id == null ? -1 : 1) - (b.companion_id == null ? -1 : 1))
                .forEach(g => { seen.add(g.id); result.push(g) })
        })

        return result
    }, [filtered])

    const unseated = ordered.filter(g => !g.table)
    const seated = ordered.filter(g => g.table)

    const leaderNameOf = (guest) => {
        if (guest.companion_id == null) return null
        return guests.find(g => String(g.id) === String(guest.companion_id))?.name ?? null
    }

    const renderTooltip = (guest) => {
        const companions = guests.filter(c => String(c.companion_id) === String(guest.id))
        const leaderName = leaderNameOf(guest)

        return (
            <div className={styles.tooltip}>
                {leaderName ? (
                    <span className={styles.tooltipText}>
                        <b>{guest.name}</b> acompaña a <b>{leaderName}</b>.
                    </span>
                ) : (
                    <span className={styles.tooltipText}>
                        Agregaste a <b>{guest.name}</b> el <b>{formatDate(guest.created_at)}</b>
                        {guest.last_update_date
                            ? <> y confirmó el <b>{formatDate(guest.last_update_date)}</b>.</>
                            : '.'}
                    </span>
                )}

                {companions.length > 0 ? (
                    <>
                        <span className={styles.tooltipMuted}>Lleva de acompañantes a:</span>
                        <ul className={styles.tooltipList}>
                            {companions.map(c => <li key={c.id}>{c.name}</li>)}
                        </ul>
                    </>
                ) : (
                    !leaderName && <span className={styles.tooltipMuted}>No lleva acompañantes</span>
                )}
            </div>
        )
    }

    const renderRow = (guest) => {
        const groupId = groupIdOf(guest)
        const color = colorGroups && groupId ? groupColors.get(groupId) : null
        const size = groupId ? groupSizes.get(groupId) ?? 0 : 0
        const isLeader = guest.companion_id == null && guest.has_companion
        const leaderName = leaderNameOf(guest)
        const table = realTables.find(t => t.id === guest.table)

        const meta = [
            guest.tag,
            guest.side,
            leaderName ? `acompaña a ${leaderName}` : (isLeader ? null : 'sin acompañantes'),
        ].filter(Boolean).join(' · ')

        return (
            <div
                key={guest.id}
                className={styles.row}
                style={color ? { backgroundColor: `${color}40` } : undefined}
            >
                {color && <span className={styles.groupBar} style={{ backgroundColor: color }} />}

                <div className={styles.rowInfo}>
                    <div className={styles.nameLine}>
                        <span className={styles.name}>{guest.name}</span>
                        {isLeader && size > 1 && (
                            <span
                                className={styles.groupBadge}
                                style={{
                                    backgroundColor: color ?? 'var(--brand-color-100)',
                                    color: 'var(--text-color)',
                                }}
                            >
                                grupo de {size}
                            </span>
                        )}
                    </div>
                    <span className={styles.meta}>{meta || '—'}</span>
                </div>

                <div className={styles.rowActions}>
                    {guest.table ? (
                        <Dropdown
                            trigger={['click']}
                            placement='bottomRight'
                            open={openPickerFor === guest.id}
                            onOpenChange={(open) => setOpenPickerFor(open ? guest.id : null)}
                            popupRender={() => (
                                <TransferPicker
                                    tables={realTables}
                                    guests={guests}
                                    originTableId={guest.table}
                                    affinityTag={guest.tag}
                                    onPick={(target) => {
                                        setOpenPickerFor(null)
                                        onAssign?.(guest, target)
                                    }}
                                />
                            )}
                        >
                            <button type='button' className={styles.tablePill}>
                                Mesa #{table?.number ?? '-'}
                            </button>
                        </Dropdown>
                    ) : (
                        <Dropdown
                            trigger={['click']}
                            placement='bottomRight'
                            open={openPickerFor === guest.id}
                            onOpenChange={(open) => setOpenPickerFor(open ? guest.id : null)}
                            popupRender={() => (
                                <TransferPicker
                                    tables={realTables}
                                    guests={guests}
                                    originTableId={null}
                                    affinityTag={guest.tag}
                                    onPick={(target) => {
                                        setOpenPickerFor(null)
                                        onAssign?.(guest, target)
                                    }}
                                />
                            )}
                        >
                            <button type='button' className={styles.assignBtn}>Asignar</button>
                        </Dropdown>
                    )}

                    <Dropdown
                        trigger={['click']}
                        placement='topLeft'
                        popupRender={() => renderTooltip(guest)}
                    >
                        <button type='button' className={styles.helpBtn}>?</button>
                    </Dropdown>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <div className={styles.headerText}>
                    <span className={styles.title}>Invitados confirmados</span>
                    <span className={styles.subtitle}>
                        {unseatedCount} sin mesa · {seatedCount} sentados · {groupCount} grupos
                    </span>
                </div>
                <span className={styles.count}>{guests.length}</span>
            </div>

            <div className={styles.searchRow}>
                <Input
                    placeholder='Buscar invitado'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className='tab-org-input'
                />
                <Dropdown
                    trigger={['click']}
                    placement='bottomRight'
                    menu={{
                        items: [
                            { key: 'clear', label: 'Quitar todos los filtros' },
                            { type: 'divider' },
                            ...tagOptions.map(tag => ({ key: `tag:${tag}`, label: `Etiqueta: ${tag}` })),
                            ...sideOptions.map(side => ({ key: `side:${side}`, label: `Lado: ${side}` })),
                        ],
                        onClick: ({ key }) => {
                            if (key === 'clear') {
                                setTagFilter(null); setSideFilter(null); setOnlyUnseated(false)
                            } else if (key.startsWith('tag:')) {
                                setTagFilter(key.slice(4))
                            } else if (key.startsWith('side:')) {
                                setSideFilter(key.slice(5))
                            }
                        },
                    }}
                >
                    <button type='button' className={styles.helpBtn} style={{ width: 32, height: 32 }}>
                        <SlidersHorizontal size={14} />
                    </button>
                </Dropdown>
            </div>

            <div className={styles.chips}>
                <button
                    type='button'
                    className={`${styles.chip} ${colorGroups ? styles.chipActive : ''}`}
                    onClick={() => setColorGroups(!colorGroups)}
                >
                    Colorear grupos
                </button>
                <button
                    type='button'
                    className={`${styles.chip} ${onlyUnseated ? styles.chipActive : ''}`}
                    onClick={() => setOnlyUnseated(!onlyUnseated)}
                >
                    Sin mesa · {unseatedCount}
                </button>
                {tagFilter && (
                    <button
                        type='button'
                        className={`${styles.chip} ${styles.chipActive}`}
                        onClick={() => setTagFilter(null)}
                    >
                        {tagFilter} ✕
                    </button>
                )}
                {sideFilter && (
                    <button
                        type='button'
                        className={`${styles.chip} ${styles.chipActive}`}
                        onClick={() => setSideFilter(null)}
                    >
                        {sideFilter} ✕
                    </button>
                )}
            </div>

            <div className={`${styles.list} scroll-invitation`}>
                {ordered.length === 0 && (
                    <span className={styles.empty}>Ningún invitado coincide con estos filtros.</span>
                )}

                {unseated.length > 0 && (
                    <>
                        <span className={styles.groupLabel}>Sin mesa · {unseated.length}</span>
                        {unseated.map(renderRow)}
                    </>
                )}

                {seated.length > 0 && (
                    <>
                        <span className={styles.groupLabel}>Sentados · {seated.length}</span>
                        {seated.map(renderRow)}
                    </>
                )}
            </div>
        </div>
    )
}
