import React, { useMemo, useState } from 'react'
import { Checkbox, Input } from 'antd'
import { X } from 'lucide-react'
import styles from './AddGuestsPicker.module.css'

const normalize = (value) =>
    (value ?? '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Selector para sentar invitados en una mesa.
 *
 * Sugiere en función de quién ya está sentado ahí — misma etiqueta, mismo lado,
 * o alguien de su grupo de acompañantes —, permite elegir varios de una vez y
 * muestra cómo se va llenando la mesa mientras seleccionas. La mesa se puede
 * sobrepasar: se avisa, pero no se bloquea.
 */
export const AddGuestsPicker = ({ table, occupants = [], candidates = [], onAdd, onClose }) => {
    const [search, setSearch] = useState('')
    const [tagFilter, setTagFilter] = useState(null)
    const [picked, setPicked] = useState(() => new Set())

    const size = table.size ?? 0
    const taken = occupants.length

    // Perfil de la mesa: etiquetas y lados de quienes ya están sentados.
    const profile = useMemo(() => {
        const tags = new Map()
        const sides = new Map()
        occupants.forEach(g => {
            if (g.tag) tags.set(g.tag, (tags.get(g.tag) ?? 0) + 1)
            if (g.side) sides.set(g.side, (sides.get(g.side) ?? 0) + 1)
        })
        return {
            tags: [...tags.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t),
            sides: new Set(sides.keys()),
            groupIds: new Set(
                occupants.map(g => String(g.companion_id ?? g.id))
            ),
        }
    }, [occupants])

    // Por qué se sugiere cada candidato. El grupo pesa más que la etiqueta:
    // separar acompañantes es el error caro.
    const reasonFor = (guest) => {
        const groupId = String(guest.companion_id ?? guest.id)
        if (profile.groupIds.has(groupId)) return 'su grupo'
        if (guest.tag && profile.tags.includes(guest.tag)) return guest.tag
        if (guest.side && profile.sides.has(guest.side)) return guest.side
        return null
    }

    const rows = useMemo(() => {
        const withReason = candidates.map(g => ({ guest: g, reason: reasonFor(g) }))

        return withReason
            .filter(({ guest }) => !search || normalize(guest.name).includes(normalize(search)))
            .filter(({ guest }) => !tagFilter || guest.tag === tagFilter)
            .sort((a, b) => {
                // Sugeridos primero; dentro de cada bloque, alfabético.
                const rank = (r) => (r === 'su grupo' ? 0 : r ? 1 : 2)
                const diff = rank(a.reason) - rank(b.reason)
                if (diff !== 0) return diff
                return (a.guest.name ?? '').localeCompare(b.guest.name ?? '')
            })
    }, [candidates, search, tagFilter, profile])

    const suggested = rows.filter(r => r.reason)
    const others = rows.filter(r => !r.reason)

    const toggle = (id) => {
        setPicked(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const incoming = picked.size
    const total = taken + incoming
    const over = Math.max(total - size, 0)

    // La tira muestra: ocupados, los que entran con esta selección, libres, y
    // los que se pasan del cupo.
    const seats = []
    for (let i = 0; i < Math.max(size, total); i++) {
        if (i < taken) seats.push('taken')
        else if (i < total) seats.push(i < size ? 'incoming' : 'over')
        else seats.push('free')
    }

    const renderRow = ({ guest, reason }) => (
        <label
            key={guest.id}
            className={`${styles.row} ${picked.has(guest.id) ? styles.rowActive : ''}`}
        >
            <Checkbox
                checked={picked.has(guest.id)}
                onChange={() => toggle(guest.id)}
            />
            <span className={styles.rowInfo}>
                <span className={styles.name}>{guest.name}</span>
                <span className={styles.meta}>
                    {[guest.tag, guest.side].filter(Boolean).join(' · ') || 'sin etiqueta'}
                </span>
            </span>
            {reason && <span className={styles.why}>{reason}</span>}
        </label>
    )

    return (
        <div className={styles.picker} onClick={(e) => e.stopPropagation()}>
            <div className={styles.fillHead}>
                <span className={styles.fillTitle}>Mesa #{table.number}</span>
                <span className={styles.fillRight}>
                    <span className={`${styles.fillCount} ${over > 0 ? styles.fillCountOver : ''}`}>
                        {total} de {size}{incoming > 0 ? ` · +${incoming}` : ''}
                    </span>
                    {onClose && (
                        <button type='button' className={styles.close} onClick={onClose} aria-label='Cerrar'>
                            <X size={13} />
                        </button>
                    )}
                </span>
            </div>

            <div className={styles.strip}>
                {seats.map((kind, i) => (
                    <span
                        key={i}
                        className={`${styles.seat} ${
                            kind === 'taken' ? styles.seatTaken
                            : kind === 'incoming' ? styles.seatIncoming
                            : kind === 'over' ? styles.seatOver
                            : styles.seatFree
                        }`}
                    />
                ))}
            </div>

            {over > 0 && (
                <span className={styles.overWarn}>
                    Se pasan {over} de la capacidad. Puedes agregarlos igual y subir las
                    sillas después.
                </span>
            )}

            <Input
                size='small'
                placeholder='Buscar invitado'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.search}
            />

            {profile.tags.length > 0 && (
                <div className={styles.chips}>
                    <button
                        type='button'
                        className={`${styles.chip} ${!tagFilter ? styles.chipActive : ''}`}
                        onClick={() => setTagFilter(null)}
                    >
                        Todos
                    </button>
                    {profile.tags.map(tag => (
                        <button
                            key={tag}
                            type='button'
                            className={`${styles.chip} ${tagFilter === tag ? styles.chipActive : ''}`}
                            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            )}

            <div className={`${styles.list} scroll-invitation`}>
                {rows.length === 0 && (
                    <span className={styles.empty}>
                        {candidates.length === 0
                            ? 'No quedan invitados sin mesa.'
                            : 'Nadie coincide con este filtro.'}
                    </span>
                )}

                {suggested.length > 0 && (
                    <>
                        <span className={styles.sectionLabel}>Van bien en esta mesa</span>
                        {suggested.map(renderRow)}
                    </>
                )}

                {others.length > 0 && (
                    <>
                        {suggested.length > 0 && (
                            <span className={styles.sectionLabel}>Los demás</span>
                        )}
                        {others.map(renderRow)}
                    </>
                )}
            </div>

            <div className={styles.footer}>
                <button
                    type='button'
                    className={styles.addBtn}
                    aria-disabled={incoming === 0}
                    onClick={() => {
                        if (incoming === 0) return
                        const chosen = candidates.filter(g => picked.has(g.id))
                        setPicked(new Set())
                        onAdd?.(chosen)
                    }}
                >
                    {incoming === 0 ? 'Selecciona invitados' : `Añadir ${incoming}`}
                </button>
                {incoming > 0 && (
                    <button
                        type='button'
                        className={styles.clearBtn}
                        onClick={() => setPicked(new Set())}
                    >
                        Limpiar
                    </button>
                )}
            </div>
        </div>
    )
}
