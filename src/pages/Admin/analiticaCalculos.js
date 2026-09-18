/*
  Reglas de la analítica de producto (Admin → Eventos → Analítica).

  Etapa 1 — Invitaciones: fecha de venta, fecha del evento y ubicación.

  Todo se calcula en el cliente a propósito: `AdminLayout` ya trae las
  invitaciones completas con `select('*')`, incluido el jsonb `data`. Agregar
  una vista en Postgres para releer lo que ya está en memoria solo agregaría una
  ida a la red.
*/

import { MESES } from './ventasCalculos'

// --------------------------------------------------------------- fechas ---

// Clave de mes en hora local: `YYYY-MM`.
export const claveDeMes = (fecha) =>
    `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`

// MESES viene en minúscula; se capitaliza aquí y no con `text-transform` en CSS
// porque `capitalize` se aplica a cada palabra y estropea etiquetas vecinas.
export const nombreDeMes = (clave) => {
    const [anio, mes] = clave.split('-')
    const nombre = MESES[Number(mes) - 1] ?? ''
    return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`
}


const MS_POR_DIA = 86_400_000

// Días entre la venta (created_at) y el evento.
//
// Puede ser negativa: hay invitaciones cargadas después de que el evento pasó
// (eventos históricos, demos rehechas). Se devuelve el número tal cual y quien
// lo consuma decide — el promedio las excluye, pero el conteo de "creadas
// después del evento" es en sí mismo un dato que vale la pena ver.
export const anticipacionEnDias = (invitation) => {
    if (!invitation?.event_date || !invitation?.created_at) return null

    const evento = new Date(invitation.event_date)
    const venta = new Date(invitation.created_at)

    if (Number.isNaN(evento.getTime()) || Number.isNaN(venta.getTime())) return null

    return Math.round((evento - venta) / MS_POR_DIA)
}

// Los cortes son en días, no en meses calendario: un mes "de 30 días" se
// entiende igual y evita aritmética de calendario para un histograma.
export const RANGOS_ANTICIPACION = [
    { label: 'menos de 1 mes', hasta: 30 },
    { label: '1 a 3 meses', hasta: 90 },
    { label: '3 a 6 meses', hasta: 180 },
    { label: '6 a 12 meses', hasta: 365 },
    { label: 'más de 1 año', hasta: Infinity },
]

// Promedio redondeado. Convive con `mediana` a propósito: la mediana describe
// mejor cuando hay muchos datos y algún extremo, y el promedio cuando hay
// pocos —sobre cuatro valores la mediana ignora los dos extremos y acaba
// siendo el valor de uno solo—. Quien la use decide y lo rotula.
export const promedio = (numeros) => (numeros.length > 0
    ? Math.round(numeros.reduce((a, b) => a + b, 0) / numeros.length)
    : null)

export const mediana = (numeros) => {
    if (!numeros.length) return null

    const orden = [...numeros].sort((a, b) => a - b)
    const medio = Math.floor(orden.length / 2)

    return orden.length % 2
        ? orden[medio]
        : Math.round((orden[medio - 1] + orden[medio]) / 2)
}

// ------------------------------------------------------------ ubicación ---

// La ubicación del evento NO vive en `data.generals.event` (ahí solo hay `name`
// y `label`): vive en cada punto del itinerario, en `data.itinerary.object[].address`.
//
// Ese `address` trae los mismos campos duplicados en español e inglés
// (`ciudad`/`city`, `estado`/`state`, `CP`/`zip`…) porque lo llenan dos caminos
// distintos del builder. Medido contra la base: `city` está poblado en 108 de
// 110 puntos y `ciudad` solo en 2 — por eso `city` manda y `ciudad` es el
// respaldo.
//
// Calle y número se ignoran a propósito: solo 2 de 114 puntos los tienen. A
// nivel ciudad/país el dato sí es sólido.
const claveDe = (texto) => String(texto ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\.$/, '')

// Variantes que la base guarda como ciudades distintas y son la misma. Es una
// lista a mano y corta a propósito: unir por prefijo juntaría "Santiago" con
// "Santiago de Querétaro", que no son lo mismo.
const ALIAS_CIUDAD = {
    chih: 'chihuahua',
    obregon: 'ciudad obregon',
    'santa catarina': 'ciudad santa catarina',
}

const claveCiudad = (texto) => {
    const clave = claveDe(texto)
    return ALIAS_CIUDAD[clave] ?? clave
}

// Ciudades y países únicos de una invitación. Un evento con ceremonia y
// recepción en la misma ciudad cuenta una sola vez: la repetición es del
// itinerario, no del evento.
export const ubicacionesDe = (invitation) => {
    const puntos = invitation?.data?.itinerary?.object

    if (!Array.isArray(puntos)) return []

    const unicas = new Map()

    puntos.forEach(punto => {
        const address = punto?.address
        if (!address || typeof address !== 'object') return

        const ciudad = String(address.city ?? address.ciudad ?? '').trim()
        const pais = String(address.country ?? '').trim()

        if (!ciudad && !pais) return

        const clave = `${claveCiudad(ciudad)}|${claveDe(pais)}`
        const previa = unicas.get(clave)

        // Dos puntos del itinerario pueden escribir la misma ciudad distinto
        // ("Obregon" y "Ciudad Obregón"): se conserva la grafía más completa,
        // que es la que viene del buscador de mapas y no de teclearla a mano.
        if (previa && previa.ciudad.length >= ciudad.length) return

        unicas.set(clave, { ciudad, pais: pais || previa?.pais || '' })
    })

    return [...unicas.values()]
}

// Cuenta ocurrencias agrupando por clave normalizada, pero muestra la grafía
// más frecuente. Así "México" (47 veces) le gana a "Mexico" (13) sin tener que
// mantener un diccionario de nombres bonitos.
const contarPorClave = (valores, normalizar) => {
    const grupos = new Map()

    valores.forEach(valor => {
        const texto = String(valor ?? '').trim()
        if (!texto) return

        const clave = normalizar(texto)
        const grupo = grupos.get(clave) ?? { clave, total: 0, grafias: new Map() }

        grupo.total += 1
        grupo.grafias.set(texto, (grupo.grafias.get(texto) ?? 0) + 1)
        grupos.set(clave, grupo)
    })

    return [...grupos.values()]
        .map(({ clave, total, grafias }) => ({
            clave,
            total,
            label: [...grafias.entries()].sort((a, b) => b[1] - a[1])[0][0],
        }))
        .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
}

export const contarCiudades = (valores) => contarPorClave(valores, claveCiudad)
export const contarPaises = (valores) => contarPorClave(valores, claveDe)

// -------------------------------------------------------------- créditos ---

// Una invitación PRO nace con 300 créditos incluidos (ver
// `createInvitationWithPlan` en el backend). Lite y Paperless no usan créditos.
export const CREDITOS_INCLUIDOS_PRO = 300

// Los créditos comprados NO se registran en ninguna tabla: Stripe acredita
// directo sobre `invitations.credits` con un RPC. Lo único deducible es cuántos
// créditos tuvo el evento en total —lo gastado más el saldo— y restarle los
// incluidos en el plan.
//
// Esa resta arrastra el ruido del reembolso de envíos fallidos, así que un
// sobrante de 4 u 8 créditos no es una compra. El paquete más chico que vende
// Stripe es de 3, pero en la práctica se compran de 50 en adelante: por debajo
// de este umbral se trata como error de redondeo y no como compra.
// Hoy no se muestra en la UI (el panel solo lista consumo), pero el dato sigue
// calculándose porque es la única forma de estimar una compra.
export const UMBRAL_COMPRA_CREDITOS = 10

export const esPro = (invitation) => String(invitation?.plan ?? '').toLowerCase() === 'pro'

// Consumo real, contado sobre lo que efectivamente se cobró:
//  · cada envío de invitación que no falló (los fallidos se reembolsan al
//    cerrar el lote), y
//  · cada recordatorio con `credit_charged`.
export const creditosDeEvento = (invitation, enviosCobrados, recordatoriosCobrados) => {
    const consumo = (enviosCobrados ?? 0) + (recordatoriosCobrados ?? 0)
    const saldo = Number(invitation?.credits ?? 0)

    return {
        id: invitation.id,
        nombre: invitation.name ?? 'sin nombre',
        email: invitation.user_email ?? null,
        consumo,
        saldo,
        // Lo que el evento tuvo por encima de los créditos del plan.
        extra: Math.max(0, consumo + saldo - CREDITOS_INCLUIDOS_PRO),
    }
}

// ------------------------------------------------------------ respuestas ---

// Estados de `guests`. `asistente` es un confirmado que además ya llegó al
// evento (lo marca el scanner), así que cuenta como confirmado.
export const ESTADOS_CONFIRMA = new Set(['confirmado', 'asistente'])
export const ESTADOS_RECHAZA = new Set(['rechazado'])
export const ESTADOS_PENDIENTE = new Set(['creado', 'esperando'])

// Un invitado se une con su envío por `guest_id` Y `invitation_id`, nunca solo
// por el id. Medido contra la base: 179 ids existen a la vez en `guests` y en
// `side_events_guests`, y 230 envíos apuntan a un id que en `guests` pertenece a
// otra invitación. Uniendo solo por id, esos 230 se colarían como respuestas de
// invitados que nunca recibieron ese mensaje.
export const claveDeInvitado = (invitationId, guestId) => `${invitationId}|${guestId}`

// Cortes del histograma de tiempo de respuesta, en horas.
export const RANGOS_RESPUESTA = [
    { label: 'menos de 1 h', hasta: 1 },
    { label: '1 a 6 h', hasta: 6 },
    { label: '6 a 24 h', hasta: 24 },
    { label: '1 a 3 días', hasta: 72 },
    { label: '3 a 7 días', hasta: 168 },
    { label: 'más de 7 días', hasta: Infinity },
]

// ----------------------------------------------------------------- mesas ---

// Una mesa con `size = 0` no es una mesa: es la pista de baile, que se dibuja
// en el mismo canvas. El backend ya la ignora en `get_tables_occupancy`, así
// que aquí se aplica el mismo criterio para no inflar el conteo.
export const esMesaReal = (mesa) => Number(mesa?.size ?? 0) > 0

// Un evento "usa" el acomodo cuando además de crear mesas sentó gente en ellas.
// Hay eventos que crean 20 mesas y no acomodan a nadie: crearlas no es usarlas.
export const OCUPACION_MINIMA_USO = 0.2

// ----------------------------------------------------------- side events ---

// Los títulos los escribe el organizador a mano, así que la misma idea llega
// con mil grafías: "tornaboda", "¡torna boda!", "Tornaboda Gemma y Hugo". Para
// saber QUÉ tipo de side events se crean hay que agrupar por tema, y eso es
// necesariamente una lista a mano. El orden importa: gana el primero que
// coincide, así que lo específico va antes que lo genérico.
export const TEMAS_SIDE_EVENT = [
    { tema: 'Tornaboda', patron: /torna\s*-?\s*boda/i },
    { tema: 'Despedida de soltera/o', patron: /despedida/i },
    { tema: 'Bridal shower', patron: /bridal/i },
    { tema: 'Baby shower', patron: /baby/i },
    { tema: 'Civil', patron: /civil/i },
    { tema: 'Cena', patron: /cena/i },
    { tema: 'Save the date', patron: /save\s+(our|the)\s+date/i },
]

export const temaDeSideEvent = (nombre) => {
    const texto = String(nombre ?? '').trim()
    if (!texto) return null

    return TEMAS_SIDE_EVENT.find(({ patron }) => patron.test(texto))?.tema ?? 'Otros'
}

// Los saltos de línea del título son de maquetación, no del nombre.
export const tituloLimpio = (nombre) => String(nombre ?? '').replace(/\s+/g, ' ').trim()

// ------------------------------------------------------------------- Lia ---

// Los chips y el menú de prompts que ofrece la UI de Lia (`pages/Lia/Lia.jsx`).
// Separarlos importa: un clic en un chip no es lo mismo que una pregunta que
// alguien se tomó la molestia de escribir, y mezclarlos haría que "Mis
// notificaciones" pareciera la duda más frecuente del producto.
export const ATAJOS_LIA = new Set([
    'resumen del evento',
    'mis notificaciones',
    'mensajes nuevos',
    'pendientes de respuesta',
    'espacios disponibles en mesas',
    'pases disponibles',
    'porcentaje de confirmados',
    'prioridad a sin respuesta',
    'vieron pero no respondieron',
    'invitaciones no entregadas',
    'confirmados sin mesa asignada',
    'cuántos niños vienen',
    'mensajes sin leer',
    'último mensaje recibido',
    'mis side events',
    'quién confirmó en mis side events',
    'quién falta por responder en mis side events',
])

// Este atajo se arma con los nombres de los novios ("Lado de Gemma vs lado de
// Hugo"), así que no puede estar en la lista fija.
const ATAJO_CON_NOMBRES = /^lado de .+ vs lado de .+$/i

export const esAtajoDeLia = (texto) => {
    const limpio = tituloLimpio(texto).toLowerCase()
    return ATAJOS_LIA.has(limpio) || ATAJO_CON_NOMBRES.test(limpio)
}

// Temas de las preguntas escritas a mano. Igual que con los side events, es una
// lista mantenida a mano y el orden manda: "¿puedo agregar mesa de regalos?" es
// una duda de uso, no una consulta de mesas, así que el soporte va primero.
export const TEMAS_LIA = [
    { tema: 'Cómo se usa', patron: /\bc[óo]mo\b|\bd[óo]nde\b|puedo|error|c[óo]digo|no funciona|no me deja/i },
    { tema: 'Side events', patron: /side\s*event|evento adicional/i },
    { tema: 'Confirmaciones', patron: /confirm/i },
    { tema: 'Mesas', patron: /mesa/i },
    { tema: 'Novio vs novia', patron: /\bvs\b|lado de/i },
    { tema: 'Mensajes y avisos', patron: /mensaje|notificaci/i },
    { tema: 'Listas de invitados', patron: /lista|invitad/i },
]

export const temaDePregunta = (texto) => {
    const limpio = tituloLimpio(texto)
    if (!limpio) return null

    return TEMAS_LIA.find(({ patron }) => patron.test(limpio))?.tema ?? 'Otros'
}

// ------------------------------------------------------- evento promedio ---

// Ventanas del retrato. La pregunta es "cómo es mi cliente HOY", así que el
// corte por defecto son los últimos seis meses: con uno solo quedan cuatro o
// cinco eventos y una mediana sobre eso no describe a nadie.
export const VENTANAS = [
    { key: '3', label: '3 meses', meses: 3 },
    { key: '6', label: '6 meses', meses: 6 },
    { key: '12', label: '12 meses', meses: 12 },
    { key: 'todo', label: 'Todo', meses: null },
]

// Muestra mínima para que un número se presente como representativo. Por debajo
// se sigue mostrando, pero marcado: es la diferencia entre "así es mi cliente" y
// "esto es lo que hay".
export const MUESTRA_MINIMA = 8

export const ETIQUETA_TIPO = {
    wedding: 'boda',
    xv: 'XV años',
    bap: 'bautizo',
    kids: 'fiesta infantil',
    party: 'fiesta',
    event: 'evento',
}

// Valor más frecuente de una lista, con su peso relativo.
// Curva de Pareto: qué porcentaje del total llevas acumulado en cada fila.
// Vive aquí y no en el componente porque el contador es una variable mutable y
// dentro de un render el linter —con razón— no la deja.
export const acumuladoDe = (filas, total) => {
    const curva = []

    filas.reduce((corrido, fila) => {
        const suma = corrido + fila.total
        curva.push(total > 0 ? Math.round((suma / total) * 100) : 0)
        return suma
    }, 0)

    return curva
}

export const masComun = (valores) => {
    const cuenta = new Map()

    valores.filter(Boolean).forEach(valor => {
        cuenta.set(valor, (cuenta.get(valor) ?? 0) + 1)
    })

    if (cuenta.size === 0) return null

    const [valor, total] = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]
    const universo = [...cuenta.values()].reduce((a, b) => a + b, 0)

    return { valor, total, porcentaje: Math.round((total / universo) * 100) }
}
