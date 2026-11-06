// Guardado del editor de side events / Pop sin pisar cambios de otro lado
// (otra pestaña con el mismo editor, otro dispositivo, un script). El editor
// guarda el body completo; antes de cada guardado se lee el que hay en la base
// y, si cambió desde la última vez que esta pestaña lo vio (`base`), se mezcla
// por campo de primer nivel:
//   · lo que cambió esta pestaña           → gana lo de esta pestaña
//   · lo que cambió en otro lado (y aquí no) → se respeta lo de la base
// Así un editor abierto desde antes ya no borra lo que se agregó después.

// JSON estable (llaves ordenadas): la base (jsonb) reordena las llaves, así
// que comparar con JSON.stringify daría cambios que no existen.
export const estable = (v) => {
    if (Array.isArray(v)) return `[${v.map(estable).join(',')}]`
    if (v && typeof v === 'object') {
        return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${estable(v[k])}`).join(',')}}`
    }
    return JSON.stringify(v ?? null)
}

const igual = (a, b) => estable(a) === estable(b)

/**
 * base: body como estaba en la base la última vez que esta pestaña lo leyó.
 * nuestro: body de esta pestaña. suyo: body que hay ahora en la base.
 * → { body, traidos } (traidos = llaves que se tomaron de la base porque
 *   cambiaron en otro lado; el editor las aplica también en pantalla).
 */
export const mezclarBody = (base, nuestro, suyo) => {
    const b = base ?? {}
    const n = nuestro ?? {}
    const s = suyo ?? {}
    if (igual(b, s)) return { body: n, traidos: [] }
    const body = {}
    const traidos = []
    for (const k of new Set([...Object.keys(b), ...Object.keys(n), ...Object.keys(s)])) {
        const cambioNuestro = !igual(n[k], b[k])
        const cambioSuyo = !igual(s[k], b[k])
        const valor = !cambioNuestro && cambioSuyo ? s[k] : n[k]
        if (!cambioNuestro && cambioSuyo) traidos.push(k)
        if (valor !== undefined) body[k] = valor
    }
    return { body, traidos }
}

// Copia profunda simple (los bodies son JSON).
export const copia = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))
