import { useCallback, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'

// Solo se versiona la geometría: mover mesas es lo reversible. Cambiar quién
// se sienta dónde no entra aquí, porque deshacerlo a ciegas confundiría más
// de lo que ayuda.
const TRACKED = ['x', 'y', 'shape', 'vertical', 'size']

const snapshotOf = (tables = []) =>
    tables.map(t => {
        const snap = { id: t.id }
        TRACKED.forEach(k => { snap[k] = t[k] })
        return snap
    })

const sameSnapshot = (a, b) => {
    if (!a || !b || a.length !== b.length) return false
    const byId = new Map(b.map(t => [t.id, t]))
    return a.every(t => {
        const other = byId.get(t.id)
        return other && TRACKED.every(k => t[k] === other[k])
    })
}

/**
 * Historial de posiciones de las mesas para deshacer y rehacer (§ botones
 * backward / forward).
 *
 * Guarda instantáneas completas en vez de acciones inversas: son baratas
 * (una fila por mesa) y sobreviven a operaciones que tocan muchas mesas de
 * golpe, como el auto acomodo o el alineado.
 */
export const useTableHistory = ({ onApplied }) => {
    const past = useRef([])
    const future = useRef([])
    const [counts, setCounts] = useState({ undo: 0, redo: 0 })
    const [busy, setBusy] = useState(false)

    const sync = () => setCounts({ undo: past.current.length, redo: future.current.length })

    /** Se llama ANTES de una operación, con el estado que hay que poder recuperar. */
    const record = useCallback((tables) => {
        const snap = snapshotOf(tables)
        if (!snap.length) return
        if (sameSnapshot(past.current[past.current.length - 1], snap)) return

        past.current = [...past.current.slice(-29), snap]
        future.current = []
        sync()
    }, [])

    const applySnapshot = async (snap) => {
        // Un UPDATE por mesa: son pocas y no hay RPC de escritura en lote.
        const results = await Promise.all(snap.map(row =>
            supabase.from('tables')
                .update({ x: row.x, y: row.y, shape: row.shape, vertical: row.vertical, size: row.size })
                .eq('id', row.id)
        ))
        const failed = results.find(r => r.error)
        if (failed) {
            console.error('Error restaurando el mapa:', failed.error.message)
            return false
        }
        return true
    }

    const undo = useCallback(async (currentTables) => {
        if (!past.current.length || busy) return false
        setBusy(true)

        const previous = past.current[past.current.length - 1]
        past.current = past.current.slice(0, -1)
        future.current = [...future.current, snapshotOf(currentTables)]

        const ok = await applySnapshot(previous)
        setBusy(false)
        sync()
        if (ok) await onApplied?.()
        return ok
    }, [busy, onApplied])

    const redo = useCallback(async (currentTables) => {
        if (!future.current.length || busy) return false
        setBusy(true)

        const next = future.current[future.current.length - 1]
        future.current = future.current.slice(0, -1)
        past.current = [...past.current, snapshotOf(currentTables)]

        const ok = await applySnapshot(next)
        setBusy(false)
        sync()
        if (ok) await onApplied?.()
        return ok
    }, [busy, onApplied])

    return {
        record,
        undo,
        redo,
        canUndo: counts.undo > 0,
        canRedo: counts.redo > 0,
        busy,
    }
}
