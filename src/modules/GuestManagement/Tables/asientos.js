// Asientos de una mesa (acomodo de mesas, TablesPage / TablePanel / mapa).
//
// Cada invitado sentado guarda su mesa (`guests.table`) y su asiento
// (`guests.seat`, 1…size; migración iattend--backend/migrations/
// 2026-11-16_guests_seat.sql). Los que se sentaron antes de que existiera el
// asiento (o desde otra pantalla que solo cambia la mesa) no tienen número:
// se acomodan en los asientos libres, en orden, solo para mostrarlos; al
// moverlos se guarda su número.

const ordenar = (a, b) => (a.seat ?? Infinity) - (b.seat ?? Infinity) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true })

// { lugares: [invitado | null] (índice 0 = asiento 1), asientoDe: Map(id → asiento) }.
// Si hay más invitados que asientos, los que no caben van en `sobran`.
export const asientosDeMesa = (mesa, invitados = []) => {
    const size = Math.max(0, mesa?.size ?? 0)
    const lugares = Array(size).fill(null)
    const sentados = invitados.filter((g) => mesa && g.table === mesa.id).sort(ordenar)
    const pendientes = []
    sentados.forEach((g) => {
        const s = Number(g.seat)
        if (Number.isInteger(s) && s >= 1 && s <= size && !lugares[s - 1]) lugares[s - 1] = g
        else pendientes.push(g)
    })
    const sobran = []
    pendientes.forEach((g) => {
        const i = lugares.indexOf(null)
        if (i === -1) sobran.push(g)
        else lugares[i] = g
    })
    const asientoDe = new Map()
    lugares.forEach((g, i) => { if (g) asientoDe.set(g.id, i + 1) })
    return { lugares, asientoDe, sobran }
}

// Los primeros `n` asientos libres de la mesa (sin contar a los de `sin`,
// que se van a mover). Si `preferido` está libre, va primero.
export const asientosLibres = (mesa, invitados, n, { sin = [], preferido = null } = {}) => {
    const fuera = new Set(sin)
    const { lugares } = asientosDeMesa(mesa, invitados.filter((g) => !fuera.has(g.id)))
    const libres = lugares.map((g, i) => (g ? null : i + 1)).filter(Boolean)
    if (preferido && libres.includes(preferido)) return [preferido, ...libres.filter((s) => s !== preferido)].slice(0, n)
    return libres.slice(0, n)
}

const SIN_COLUMNA = ['PGRST204', '42703']

// Guarda mesa y asiento de cada invitado: [{ id, table, seat }]. Sin la
// columna `seat` (migración sin correr) guarda solo la mesa. Devuelve
// { ok, sinAsientos }.
export const guardarAsientos = async (supabase, cambios) => {
    if (!cambios.length) return { ok: true, sinAsientos: false }
    // Sentar cuenta como su última acción (como antes); quitarlo de la mesa no.
    const ahora = new Date().toISOString()
    const base = (table) => (table == null ? { last_action_by: 'admin' } : { last_action_by: 'admin', last_update_date: ahora })
    const resultados = await Promise.all(cambios.map((c) => supabase
        .from('guests')
        .update({ ...base(c.table), table: c.table ?? null, seat: c.table == null ? null : c.seat ?? null })
        .eq('id', c.id)))
    const error = resultados.find((r) => r.error)?.error
    if (!error) return { ok: true, sinAsientos: false }
    if (!SIN_COLUMNA.includes(error.code)) {
        console.error('Error guardando asientos:', error.message)
        return { ok: false, sinAsientos: false }
    }
    // Sin la columna: solo la mesa, agrupando por mesa.
    const porMesa = new Map()
    cambios.forEach((c) => porMesa.set(c.table ?? null, [...(porMesa.get(c.table ?? null) ?? []), c.id]))
    const otra = await Promise.all([...porMesa].map(([table, ids]) => supabase
        .from('guests')
        .update({ ...base(table), table })
        .in('id', ids)))
    const err2 = otra.find((r) => r.error)?.error
    if (err2) console.error('Error guardando mesas:', err2.message)
    return { ok: !err2, sinAsientos: true }
}

// Los que ya están en la mesa y aún no tienen su número guardado (o uno que
// no coincide con el que se ve) lo guardan tal cual se ve; así, al mover,
// sentar o quitar a alguien, los demás no se recorren. Sin los de `sin`.
export const cambiosParaFijar = (mesa, todos, { sin = [] } = {}) => {
    const fuera = new Set(sin)
    const { lugares } = asientosDeMesa(mesa, todos)
    return lugares
        .map((g, i) => (g && !fuera.has(g.id) && Number(g.seat) !== i + 1 ? { id: g.id, table: mesa.id, seat: i + 1 } : null))
        .filter(Boolean)
}

// Junta cambios: si un invitado sale dos veces, gana el último.
export const unirCambios = (...listas) => [...new Map(listas.flat().map((c) => [c.id, c])).values()]

// Sienta a `invitados` en `mesa`: cada uno en un asiento libre (el primero en
// `preferido` si se da y está libre). Devuelve los cambios para guardarAsientos
// (con los de la mesa fijos en su lugar).
export const cambiosParaSentar = (mesa, invitados, todos, { preferido = null } = {}) => {
    const ids = invitados.map((g) => g.id)
    const libres = asientosLibres(mesa, todos, invitados.length, { sin: ids, preferido })
    return unirCambios(
        cambiosParaFijar(mesa, todos, { sin: ids }),
        invitados.map((g, i) => ({ id: g.id, table: mesa.id, seat: libres[i] ?? null })),
    )
}

// Quita a `invitados` de su mesa sin que los demás de esa mesa se recorran.
export const cambiosParaQuitar = (invitados, todos, mesas = []) => {
    const ids = invitados.map((g) => g.id)
    const fijos = [...new Set(invitados.map((g) => g.table).filter((t) => t != null))]
        .map((t) => mesas.find((m) => m.id === t))
        .filter(Boolean)
        .flatMap((m) => cambiosParaFijar(m, todos, { sin: ids }))
    return unirCambios(fijos, ids.map((id) => ({ id, table: null })))
}

// Cambia a `invitado` al asiento `destino` de su misma mesa. Si ahí hay
// alguien, intercambian lugares.
export const cambiosParaMoverAsiento = (mesa, invitado, destino, todos) => {
    const { lugares, asientoDe } = asientosDeMesa(mesa, todos)
    const actual = asientoDe.get(invitado.id) ?? null
    if (actual === destino) return []
    const ocupante = lugares[destino - 1]
    const cambios = [{ id: invitado.id, table: mesa.id, seat: destino }]
    if (ocupante && ocupante.id !== invitado.id) cambios.push({ id: ocupante.id, table: mesa.id, seat: actual })
    return unirCambios(cambiosParaFijar(mesa, todos, { sin: cambios.map((c) => c.id) }), cambios)
}

// Al bajar sillas o cambiar de forma: quien quede en un asiento que ya no
// existe (o sin número) pasa a uno libre. Solo los que cambian.
export const cambiosParaAjustar = (mesa, nuevoSize, todos) => {
    const { lugares } = asientosDeMesa({ ...mesa, size: nuevoSize }, todos)
    return lugares
        .map((g, i) => (g && Number(g.seat) !== i + 1 ? { id: g.id, table: mesa.id, seat: i + 1 } : null))
        .filter(Boolean)
}
