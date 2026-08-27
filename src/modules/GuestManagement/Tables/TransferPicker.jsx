import React, { useMemo, useState } from 'react'
import { Button, Input } from 'antd'
import { X } from 'lucide-react'
import styles from './TransferPicker.module.css'

/**
 * Selector de mesa destino para transferir invitados (§5.4).
 *
 * Lo que hace segura la transferencia es que las mesas completas y las
 * bloqueadas aparecen en gris y no son destino válido — no se puede soltar
 * a nadie donde no cabe.
 *
 * Se usa desde la lista de mesas y desde el panel de mesa del mapa.
 */
export const TransferPicker = ({
    tables = [],
    guests = [],
    // Mesa de la que sale el invitado; se excluye de los destinos.
    originTableId,
    // Cuántos lugares necesita el movimiento (1 invitado, o N si es "mover todos").
    seatsNeeded = 1,
    // Etiqueta de quien se mueve, para el filtro de afinidad.
    affinityTag = null,
    // En móvil el picker se abre como hoja inferior y necesita decir a quién
    // está moviendo: fuera del menú del invitado se pierde el contexto.
    title = null,
    subtitle = null,
    onClose,
    onPick,
}) => {
    const [search, setSearch] = useState('')
    const [sameTagOnly, setSameTagOnly] = useState(false)

    const destinations = useMemo(() => {
        const seated = (tableId) => guests.filter(g => g.table === tableId)

        return tables
            .filter(t => t.shape !== 'dance' && t.id !== originTableId)
            .map(t => {
                const occupants = seated(t.id)
                const free = (t.size ?? 0) - occupants.length

                // Etiqueta dominante: la más frecuente entre quienes ya están sentados.
                const tagCounts = occupants.reduce((acc, g) => {
                    if (g.tag) acc[g.tag] = (acc[g.tag] || 0) + 1
                    return acc
                }, {})
                const dominantTag = Object.entries(tagCounts)
                    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

                return {
                    table: t,
                    free,
                    dominantTag,
                    locked: !!t.locked,
                    disabled: !!t.locked || free < seatsNeeded,
                }
            })
            .filter(d => {
                if (!search) return true
                const haystack = `${d.table.number} ${d.table.name ?? ''}`.toLowerCase()
                return haystack.includes(search.toLowerCase())
            })
            .filter(d => !sameTagOnly || !affinityTag || d.dominantTag === affinityTag)
            .sort((a, b) => {
                // Los destinos válidos primero, luego afinidad de etiqueta,
                // y al final orden natural por número.
                if (a.disabled !== b.disabled) return a.disabled ? 1 : -1
                if (affinityTag) {
                    const aMatch = a.dominantTag === affinityTag ? 0 : 1
                    const bMatch = b.dominantTag === affinityTag ? 0 : 1
                    if (aMatch !== bMatch) return aMatch - bMatch
                }
                return String(a.table.number).localeCompare(String(b.table.number), undefined, { numeric: true })
            })
    }, [tables, guests, originTableId, seatsNeeded, affinityTag, search, sameTagOnly])

    const withRoom = destinations.filter(d => !d.disabled).length

    return (
        // El picker vive dentro de un Dropdown: sin esto, cada clic en el buscador
        // o en un filtro se lee como "clic fuera" y antd cierra el popup.
        // La clase global `transfer-sheet` no estiliza el picker: la usa
        // organization-table.css para anular el posicionamiento del popup de
        // antd que lo contiene, y que en móvil pueda anclarse abajo.
        <div className={`${styles.picker} transfer-sheet`} onClick={(e) => e.stopPropagation()}>
            {title && (
                <div className={styles.sheetHead}>
                    <div className={styles.sheetText}>
                        <span className={styles.sheetTitle}>{title}</span>
                        {subtitle && <span className={styles.sheetSub}>{subtitle}</span>}
                    </div>
                    {onClose && (
                        <button
                            type='button'
                            className={styles.sheetClose}
                            onClick={onClose}
                            aria-label='Cerrar'
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            )}

            <Input
                placeholder='Buscar mesa'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.search}
            />

            <div className={styles.filters}>
                <Button
                    size='small'
                    className={!sameTagOnly ? 'primarybutton--active' : 'primarybutton'}
                    style={{ borderRadius: '99px' }}
                    onClick={() => setSameTagOnly(false)}
                >
                    Con espacio · {withRoom}
                </Button>
                {affinityTag && (
                    <Button
                        size='small'
                        className={sameTagOnly ? 'primarybutton--active' : 'primarybutton'}
                        style={{ borderRadius: '99px' }}
                        onClick={() => setSameTagOnly(true)}
                    >
                        Misma etiqueta
                    </Button>
                )}
            </div>

            <div className={`${styles.results} scroll-invitation`}>
                {destinations.length === 0 && (
                    <span className={styles.noResults}>No hay mesas que coincidan.</span>
                )}

                {destinations.map(({ table, free, dominantTag, locked, disabled }) => (
                    <div
                        key={table.id}
                        className={`${styles.item} ${disabled ? styles.itemDisabled : ''}`}
                        aria-disabled={disabled}
                        onClick={() => { if (!disabled) onPick(table) }}
                    >
                        <span className={styles.itemNumber}>#{table.number}</span>

                        <div className={styles.itemIdentity}>
                            <span className={styles.itemName}>
                                {table.name || 'Sin nombre'}
                            </span>
                            <span className={styles.itemMeta}>{dominantTag || '—'}</span>
                        </div>

                        <span className={`${styles.itemFree} ${disabled ? styles.itemFreeOff : ''}`}>
                            {locked ? 'bloqueada' : free < seatsNeeded ? 'completa' : `${free} libres`}
                        </span>
                    </div>
                ))}
            </div>

            <span className={styles.hint}>
                Las mesas completas y las bloqueadas aparecen en gris: no se puede soltar a nadie ahí.
            </span>
        </div>
    )
}
