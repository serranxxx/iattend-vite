// Mapa del modo agente de Lia en el editor de la invitación.
//
// El backend (iattend--backend/models/lia.invitacion.js) valida y manda
// { seccion, cambios: [{ op, campo, indice?, valor? }] } con los valores ya
// normalizados (fecha ISO, hora "5:30 pm", id de textura, orden en índices);
// aquí cada cambio se convierte en los pasos que Lia actúa en pantalla. Los
// tipos de campo deben coincidir con SECCIONES del backend.
//
// Las anclas siguen una convención fija (data-lia en el componente de la
// sección):
//   {seccion}-menu                   botón ⋮ del módulo (components/BuildMenu)
//   {seccion}-{campo}                input de un texto, o el control de un dato
//   {seccion}-{campo}-agregar        botón para agregar a una lista
//   {seccion}-{campo}-{i}            elemento i de una lista (con su input)
//   {seccion}-{campo}-{i}-{sub}      input de un subcampo del elemento i
//   {seccion}-{campo}-{i}-quitar     botón para quitar el elemento i
//
// Tipos:
//   texto          Lia escribe en el input real (pasa por su onChange)
//   activo         prende/apaga la sección (dato, cursor en el ⋮)
//   lista_texto    avisos: agregar con el botón, escribir, quitar con el botón
//   lista_objetos  personas: igual, con un input por subcampo
//   momentos       itinerario: nombre y hora de un momento existente (dato:
//                  se editan en un popup, así que el cursor va a su tarjeta)
//   tarjetas       regalos: botón agregar (tienda/banco) y luego la marca;
//                  cambiar marca/titular de una existente (dato)
//   dato           cualquier otro valor que se pone directo en el borrador
//                  (fecha, paleta del catálogo, textura, orden), con el cursor en su control

const conjunto = (campo, valor) => (prev) => campo(prev, valor)

// Los datos se escriben con la misma forma que usan los Build*.jsx
const DATOS = {
    fecha: (prev, v) => ({ ...prev, cover: { ...prev.cover, date: { ...prev.cover.date, value: v } } }),
    // Igual que "aplicar paleta" de la colección en BuildGenerals: también
    // pinta los títulos con el color de texto.
    paleta: (prev, v) => ({
        ...prev,
        generals: {
            ...prev.generals,
            colors: { ...prev.generals.colors, ...v },
            fonts: { ...prev.generals.fonts, titles: { ...prev.generals.fonts?.titles, color: v.accent } },
        },
    }),
    textura: (prev, v) => ({ ...prev, generals: { ...prev.generals, texture: v } }),
    orden: (prev, v) => ({ ...prev, generals: { ...prev.generals, positions: v } }),
}

// modulo: el botón de la barra del editor cuando no se llama igual que la
// sección en invitation.data (Personas vive en data.people, botón "family").
// clave: dónde vive la lista en data cuando no se llama igual que el campo.
export const LIA_SECCIONES = {
    cover: { campos: { title: 'texto', fecha: { tipo: 'dato', aplicar: DATOS.fecha } } },
    greeting: { campos: { active: 'activo', title: 'texto', description: 'texto' } },
    people: { modulo: 'family', campos: { active: 'activo', title: 'texto', personas: { tipo: 'lista_objetos' } } },
    quote: { campos: { active: 'activo', texto: 'texto' } },
    itinerary: { campos: { active: 'activo', title: 'texto', momentos: { tipo: 'momentos', clave: 'object' } } },
    dresscode: { campos: { active: 'activo', title: 'texto', description: 'texto' } },
    gifts: { campos: { active: 'activo', title: 'texto', description: 'texto', cards: { tipo: 'tarjetas' } } },
    destinations: { campos: { active: 'activo', title: 'texto', description: 'texto' } },
    notices: { campos: { active: 'activo', title: 'texto', notices: 'lista_texto' } },
    gallery: { campos: { active: 'activo', title: 'texto' } },
    generals: {
        campos: {
            paleta: { tipo: 'dato', aplicar: DATOS.paleta },
            textura: { tipo: 'dato', aplicar: DATOS.textura },
            orden: { tipo: 'dato', aplicar: DATOS.orden },
        },
    },
}

export const moduloDe = (seccion) => LIA_SECCIONES[seccion]?.modulo ?? seccion

const configDe = (def, campo) => {
    const c = def.campos[campo]
    return typeof c === 'string' ? { tipo: c } : c
}

// Orden en que se actúan los cambios: prender la sección antes que nada (si
// está apagada sus campos no se pintan), luego lo que no mueve índices, los
// quitar de mayor a menor (para que los índices del modelo sigan valiendo),
// los agregar y, al final, apagarla.
const prioridad = (tipo, c) => {
    if (tipo === 'activo') return c.valor ? 0 : 5
    if (c.op === 'cambiar') return 1
    if (c.op === 'quitar') return 2
    return 3
}

// Devuelve { pasos, omitidos }. `copy` es el borrador actual del editor: los
// índices se revisan contra él, no contra lo publicado.
export const armarPasos = (seccion, cambios, copy) => {
    const def = LIA_SECCIONES[seccion]
    if (!def || !copy?.[seccion]) return { pasos: [], omitidos: cambios?.length ?? 0 }

    const conTipo = (cambios ?? [])
        .map(c => ({ ...c, cfg: configDe(def, c.campo) }))
        .filter(c => c.cfg)
    const ordenados = [...conTipo].sort((a, b) =>
        prioridad(a.cfg.tipo, a) - prioridad(b.cfg.tipo, b) || (a.op === 'quitar' ? b.indice - a.indice : 0))

    const largos = {}
    const largo = (c) => largos[c.campo] ?? (largos[c.campo] = copy[seccion][c.cfg.clave ?? c.campo]?.length ?? 0)

    const pasos = [{ tipo: 'abrir', seccion: moduloDe(seccion) }]
    let omitidos = (cambios?.length ?? 0) - conTipo.length

    for (const c of ordenados) {
        const base = `${seccion}-${c.campo}`
        const { tipo } = c.cfg

        if (tipo === 'activo') {
            if (!!copy[seccion].active === c.valor) continue
            pasos.push({
                tipo: 'aplicar',
                ancla: `${seccion}-menu`,
                etiqueta: c.valor ? 'activar' : 'desactivar',
                aplicar: (prev) => ({ ...prev, [seccion]: { ...prev[seccion], active: c.valor } }),
            })
            continue
        }

        if (tipo === 'texto') {
            pasos.push({ tipo: 'escribir', ancla: base, texto: c.valor, etiqueta: 'escribir' })
            continue
        }

        if (tipo === 'dato') {
            pasos.push({ tipo: 'aplicar', ancla: base, etiqueta: 'cambiar', aplicar: conjunto(c.cfg.aplicar, c.valor) })
            continue
        }

        if (tipo === 'tarjetas' && c.op === 'cambiar') {
            // Cambiar banco/tienda o titular de una tarjeta existente
            if (!(c.indice < largo(c))) {
                omitidos++
                continue
            }
            pasos.push({
                tipo: 'aplicar',
                ancla: `${base}-${c.indice}`,
                etiqueta: 'cambiar',
                aplicar: (prev) => ({
                    ...prev,
                    gifts: { ...prev.gifts, cards: prev.gifts.cards.map((card, i) => (i === c.indice ? { ...card, ...c.valor } : card)) },
                }),
            })
            continue
        }

        if (tipo === 'tarjetas') {
            // Agregar con el botón real (crea la tarjeta con la marca por
            // default) y luego poner la marca y el titular que pidió.
            const nuevo = largo(c)
            largos[c.campo] = nuevo + 1
            pasos.push({ tipo: 'clic', ancla: `${base}-agregar-${c.valor.kind === 'bank' ? 'banco' : 'tienda'}`, etiqueta: 'agregar' })
            pasos.push({
                tipo: 'aplicar',
                ancla: `${base}-${nuevo}`,
                etiqueta: 'cambiar',
                aplicar: (prev) => ({
                    ...prev,
                    gifts: { ...prev.gifts, cards: prev.gifts.cards.map((card, i) => (i === nuevo ? { ...card, ...c.valor } : card)) },
                }),
            })
            continue
        }

        // Listas: agregar al final, cambiar o quitar por índice
        if (c.op === 'agregar') {
            const nuevo = largo(c)
            largos[c.campo] = nuevo + 1
            pasos.push({ tipo: 'clic', ancla: `${base}-agregar`, etiqueta: 'agregar' })
            if (tipo === 'lista_objetos') {
                for (const [sub, texto] of Object.entries(c.valor)) {
                    pasos.push({ tipo: 'escribir', ancla: `${base}-${nuevo}-${sub}`, texto, etiqueta: 'escribir' })
                }
            } else {
                pasos.push({ tipo: 'escribir', ancla: `${base}-${nuevo}`, texto: c.valor, etiqueta: 'escribir' })
            }
            continue
        }
        if (!(c.indice < largo(c))) {
            omitidos++
            continue
        }
        if (c.op === 'quitar') {
            largos[c.campo] = largo(c) - 1
            pasos.push({ tipo: 'clic', ancla: `${base}-${c.indice}-quitar`, etiqueta: 'quitar' })
            continue
        }

        // cambiar
        if (tipo === 'lista_objetos') {
            for (const [sub, texto] of Object.entries(c.valor)) {
                pasos.push({ tipo: 'escribir', ancla: `${base}-${c.indice}-${sub}`, texto, etiqueta: 'escribir' })
            }
        } else if (tipo === 'momentos') {
            const i = c.indice
            const conMomento = (prev, cambio) => ({
                ...prev,
                itinerary: { ...prev.itinerary, object: prev.itinerary.object.map((m, j) => (j === i ? { ...m, ...cambio } : m)) },
            })
            if (c.valor.name != null) {
                pasos.push({ tipo: 'teclear_dato', ancla: `${base}-${i}`, texto: c.valor.name, etiqueta: 'escribir', aplicar: (prev, parcial) => conMomento(prev, { name: parcial }) })
            }
            if (c.valor.time != null) {
                pasos.push({ tipo: 'aplicar', ancla: `${base}-${i}`, etiqueta: 'cambiar', aplicar: (prev) => conMomento(prev, { time: c.valor.time }) })
            }
        } else {
            pasos.push({ tipo: 'escribir', ancla: `${base}-${c.indice}`, texto: c.valor, etiqueta: 'escribir' })
        }
    }

    return { pasos, omitidos }
}
