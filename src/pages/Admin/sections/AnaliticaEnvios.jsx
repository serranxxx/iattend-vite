/*
  Analítica de producto — Etapa 2: Envíos.

  Todo sale de `invitation_message_dispatches`, una fila por intento de envío de
  la invitación por WhatsApp. Dos cosas del modelo que definen cómo se lee:

  1. Un REINTENTO es otra fila con el mismo `guest_id`. No hay columna de
     intento. Por eso el conteo bruto de fallos (19.7%) exagera el problema:
     cuenta tres veces al mismo invitado al que se le insistió tres veces. La
     salud real se mide sobre el ÚLTIMO intento de cada invitado — el mismo
     criterio que ya usa la RPC `get_failed_dispatches` del backend.

  2. La CAUSA del fallo sí está guardada, pero no en las columnas `error_code` /
     `error_title` (siempre nulas en esta tabla: el webhook solo las llena para
     los recordatorios). Está dentro de `raw_webhook.errors[0]`, que es el
     status crudo de Meta. Se proyecta en el propio select para no bajar el
     jsonb completo.

  `sent_at`, `read_at` y `failed_at` también quedan siempre nulas aquí, así que
  la latencia se mide de `created_at` a `delivered_at`.
*/

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { Dropdown } from 'antd'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import { claveDeInvitado, nombreDeMes } from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import { MESES } from '../ventasCalculos'
import { ejeTexto, ejeYOculto, opcionesBase, tooltipBase, useTokens } from '../adminCharts'
import { BarrasApiladas, Leyenda } from './AnaliticaPiezas'
import { useTipoDeCambio } from '../tipoDeCambio'
import styles from './EventosAnalitica.module.css'

const COLUMNAS = [
    'invitation_id',
    'guest_id',
    'guest_name',
    'guest_phone',
    'status',
    'created_at',
    'delivered_at',
    'codigo:raw_webhook->errors->0->>code',
    'titulo:raw_webhook->errors->0->>title',
    // Meta solo manda `pricing` cuando el mensaje entró a facturación: los
    // fallidos no lo traen, y ese hueco ES la señal de que no se cobran.
    'categoria:raw_webhook->pricing->>category',
    'facturable:raw_webhook->pricing->>billable',
].join(',')

// Para los recordatorios solo interesa el costo, así que basta la categoría que
// Meta reporta en el mismo `raw_webhook`.
const COLUMNAS_RECORDATORIO = [
    'invitation_id',
    'guest_id',
    'created_at',
    'status',
    'reminder_number',
    // Esta tabla sí dice a qué va dirigido el recordatorio. En
    // `invitation_message_dispatches` no existe la columna equivalente.
    'side_event_id',
    'categoria:raw_webhook->pricing->>category',
    'facturable:raw_webhook->pricing->>billable',
].join(',')

// Códigos de Meta que apuntan a un problema nuestro y no del destinatario ni de
// la política de WhatsApp: 131053 es la imagen del template que Meta no pudo
// descargar. Es el único accionable desde aquí, así que se marca aparte.
const CAUSAS_PROPIAS = new Set(['131053'])

// Tarifa de Meta por mensaje entregado, en USD, para la cuenta de I attend.
// Meta las cambia por región y categoría, así que viven aquí y no regadas.
//
// No se aplica una tarifa "por si acaso" a categorías desconocidas: si mañana
// aparece `authentication`, se cuenta aparte y la UI lo dice, en vez de sumar
// un costo inventado.
const TARIFA_USD = {
    marketing: 0.025,
    utility: 0.004,
}

// El embudo se lee sobre el último intento de cada invitado.
const LLEGO = new Set(['delivered', 'read'])
const SIN_CONFIRMAR = new Set(['sent', 'processing'])

const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`
const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const miles = (n) => new Intl.NumberFormat('es-MX').format(n)

const usd = (n) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(n)

// Los montos en pesos son una conversión aproximada, así que redondear a peso
// entero es más honesto que arrastrar centavos de una cifra estimada.
const mxn = (n) => new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
}).format(n)

// Clave de día en hora local, no en UTC: una tanda mandada a las 19:00 de
// México cae al día siguiente si se corta el ISO, y el pico aparecería en el
// día equivocado.
const claveDeDia = (fecha) => [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, '0'),
    String(fecha.getDate()).padStart(2, '0'),
].join('-')

const desdeClave = (clave) => {
    const [anio, mes, dia] = clave.split('-').map(Number)
    return new Date(anio, mes - 1, dia)
}

// Semana ISO: la semana 1 es la que contiene el primer jueves del año. Se
// calcula a mano porque `Intl` no expone el número de semana.
const semanaISO = (fecha) => {
    const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()))
    const dia = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dia)
    const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))

    return {
        anio: d.getUTCFullYear(),
        semana: Math.ceil(((d - inicio) / 86_400_000 + 1) / 7),
    }
}

const lunesDe = (anio, semana) => {
    const aproximado = new Date(Date.UTC(anio, 0, 1 + (semana - 1) * 7))
    const dia = aproximado.getUTCDay() || 7
    aproximado.setUTCDate(aproximado.getUTCDate() - dia + 1)
    return aproximado
}

const diaCorto = (fecha, opciones) => fecha.toLocaleDateString('es-MX', opciones)

// Las tres granularidades comparten el mismo contrato: de una fecha sale su
// clave, y de una clave salen su etiqueta de eje y su título de tooltip.
const GRANO = {
    dia: {
        clave: (fecha) => claveDeDia(fecha),
        etiqueta: (clave) => diaCorto(desdeClave(clave), { day: 'numeric', month: 'short' }),
        titulo: (clave) => diaCorto(desdeClave(clave), { weekday: 'long', day: 'numeric', month: 'long' }),
    },
    semana: {
        clave: (fecha) => {
            const { anio, semana } = semanaISO(fecha)
            return `${anio}-W${String(semana).padStart(2, '0')}`
        },
        etiqueta: (clave) => `S${Number(clave.split('-W')[1])}`,
        titulo: (clave) => {
            const [anio, semana] = clave.split('-W').map(Number)
            const lunes = lunesDe(anio, semana)
            const domingo = new Date(lunes)
            domingo.setUTCDate(domingo.getUTCDate() + 6)
            const corto = (f) => f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })
            return `${corto(lunes)} – ${corto(domingo)}`
        },
    },
    mes: {
        clave: (fecha) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`,
        etiqueta: (clave) => {
            const [anio, mes] = clave.split('-')
            return `${MESES[Number(mes) - 1].slice(0, 3)} ${anio.slice(2)}`
        },
        titulo: (clave) => nombreDeMes(clave),
    },
}

const GRANULARIDADES = [
    { key: 'dia', label: 'Día' },
    { key: 'semana', label: 'Semana' },
    { key: 'mes', label: 'Mes' },
]

// Años que siempre se ofrecen aunque todavía no tengan envíos. Hoy la base solo
// guarda envíos de 2026 (el primero es del 13 de marzo de 2026), así que 2024 y
// 2025 abren una gráfica vacía a propósito: son el histórico esperado. A esta
// lista se le suman los años que sí aparezcan en los datos, para que 2027
// entre solo sin tocar el código.
const ANIOS_FIJOS = [2026, 2025, 2024]

// Solo la vista diaria se desborda: ~180 días apretados en el ancho de la
// tarjeta dejan la línea ilegible. Semana y mes sí caben y se estiran a flex.
const ANCHO_POR_DIA = 25

// Agrupa la serie cruda en cubos de la granularidad pedida, rellenando los
// huecos: sin los periodos vacíos, dos tandas separadas por tres semanas se
// verían consecutivas.
const agrupar = (serie, granularidad) => {
    if (serie.length === 0) return []

    const grano = GRANO[granularidad]
    const cubos = new Map()
    let primera = serie[0].fecha
    let ultima = serie[0].fecha

    serie.forEach(({ fecha, fallido }) => {
        const clave = grano.clave(fecha)
        const cubo = cubos.get(clave) ?? { clave, total: 0, fallidos: 0 }
        cubo.total += 1
        if (fallido) cubo.fallidos += 1
        cubos.set(clave, cubo)

        if (fecha < primera) primera = fecha
        if (fecha > ultima) ultima = fecha
    })

    // Se recorre día por día y se deduplica por clave: así el relleno funciona
    // igual para las tres granularidades sin aritmética de calendario aparte.
    const resultado = []
    const cursor = new Date(primera.getFullYear(), primera.getMonth(), primera.getDate())
    let anterior = null

    while (cursor <= ultima) {
        const clave = grano.clave(cursor)
        if (clave !== anterior) {
            resultado.push(cubos.get(clave) ?? { clave, total: 0, fallidos: 0 })
            anterior = clave
        }
        cursor.setDate(cursor.getDate() + 1)
    }

    return resultado
}

const percentil = (ordenados, p) => ordenados.length
    ? ordenados[Math.min(ordenados.length - 1, Math.floor(ordenados.length * p))]
    : null

const enSegundos = (segundos) => {
    if (segundos === null) return '—'
    if (segundos < 60) return `${Math.round(segundos)} s`
    if (segundos < 3600) return `${Math.round(segundos / 60)} min`
    return `${Math.round(segundos / 3600)} h`
}

// ------------------------------------------------- cálculos por periodo ---

// Salud y causas se recalculan cuando se elige un mes, así que viven fuera del
// hook: son funciones puras sobre la lista de envíos ya filtrada.
//
// Ojo con el criterio al filtrar por mes: se evalúa el ÚLTIMO intento de cada
// invitado DENTRO del periodo. La pregunta es "de lo que mandé en mayo, cuánto
// llegó", no en qué acabó ese invitado meses después.
const resumenDeSalud = (registros, nombresEvento) => {
    const porInvitado = new Map()
    const porEvento = new Map()
    let fallidos = 0
    let leidosBrutos = 0

    registros.forEach(e => {
        const intentos = porInvitado.get(e.guest_id) ?? []
        intentos.push(e)
        porInvitado.set(e.guest_id, intentos)

        const evento = porEvento.get(e.invitation_id) ?? {
            id: e.invitation_id,
            nombre: nombresEvento.get(e.invitation_id) ?? 'sin nombre',
            total: 0,
            fallidos: 0,
        }
        evento.total += 1
        if (e.status === 'failed') {
            evento.fallidos += 1
            fallidos += 1
        }
        if (e.status === 'read') leidosBrutos += 1
        porEvento.set(e.invitation_id, evento)
    })

    const finales = {}

    porInvitado.forEach(intentos => {
        intentos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        const ultimo = intentos[intentos.length - 1]
        finales[ultimo.status] = (finales[ultimo.status] ?? 0) + 1
    })

    const leidos = finales.read ?? 0
    const llego = (finales.delivered ?? 0) + leidos
    const sinConfirmar = (finales.sent ?? 0) + (finales.processing ?? 0)
    const noLlego = finales.failed ?? 0

    const eventos = [...porEvento.values()]
        .map(e => ({ ...e, tasa: e.total > 0 ? e.fallidos / e.total : 0 }))
        .sort((a, b) => b.tasa - a.tasa || b.total - a.total)

    // El resumen pide un mínimo de envíos: 1 de 2 fallidos es 50% y no significa
    // nada. La lista completa sí los muestra todos, con el volumen al lado.
    const MINIMO_PARA_DESTACAR = 20

    return {
        total: registros.length,
        fallidos,
        leidosBrutos,
        invitados: porInvitado.size,
        llego,
        sinConfirmar,
        noLlego,
        leidos,
        eventos,
        peores: eventos.filter(e => e.fallidos > 0 && e.total >= MINIMO_PARA_DESTACAR).slice(0, 3),
    }
}

const resumenDeCausas = (registros) => {
    const causas = new Map()

    registros.filter(e => e.status === 'failed').forEach(e => {
        const codigo = e.codigo ?? 'sin código'
        const causa = causas.get(codigo) ?? {
            codigo,
            titulo: e.titulo ?? 'Meta no reportó el motivo',
            total: 0,
        }
        causa.total += 1
        causas.set(codigo, causa)
    })

    return [...causas.values()].sort((a, b) => b.total - a.total)
}

// Meses con envíos, del más reciente al más viejo, para los chips de periodo.
const mesesDe = (registros) => [...new Set(registros.map(e => e.created_at.slice(0, 7)))]
    .sort((a, b) => b.localeCompare(a))

// ------------------------------------------------------------------ datos ---

const useEnvios = (invitacionesReales) => {
    const [filas, setFilas] = useState(null)
    const [recordatorios, setRecordatorios] = useState(null)
    const [destinos, setDestinos] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelado = false

        Promise.all([
            traerTodo('invitation_message_dispatches', COLUMNAS),
            // Los recordatorios son otro mensaje, no un reintento: no entran en
            // el embudo de salud, pero sí se facturan y por eso se traen.
            traerTodo('invitation_reminder_dispatches', COLUMNAS_RECORDATORIO),
            // Para saber si un envío fue de la invitación o de un side event:
            // el `guest_id` apunta a una tabla o a la otra.
            traerTodo('guests', 'id,invitation_id'),
            traerTodo('side_events', 'id,invitation_id'),
            traerTodo('side_events_guests', 'id,side_events_id'),
        ])
            .then(([envios, avisos, invitados, sides, sideGuests]) => {
                if (cancelado) return
                setFilas(envios)
                setRecordatorios(avisos)
                setDestinos({ invitados, sides, sideGuests })
            })
            .catch(fallo => {
                console.error('Error al cargar los envíos:', fallo)
                if (!cancelado) setError(fallo.message)
            })

        return () => { cancelado = true }
    }, [])

    return useMemo(() => {
        if (error) return { error }
        if (!filas || !recordatorios || !destinos) return { cargando: true }

        const idsReales = new Set(invitacionesReales.map(i => i.id))
        const envios = filas.filter(f => idsReales.has(f.invitation_id))

        if (envios.length === 0) return { vacio: true }

        // --- volumen ---
        const porEstado = {}
        envios.forEach(e => { porEstado[e.status] = (porEstado[e.status] ?? 0) + 1 })
        const fallidos = porEstado.failed ?? 0

        // --- intentos por invitado ---
        const porInvitado = new Map()
        envios.forEach(e => {
            const previos = porInvitado.get(e.guest_id) ?? []
            previos.push(e)
            porInvitado.set(e.guest_id, previos)
        })

        let reintentos = 0
        let invitadosConReintento = 0
        let llegaronTrasInsistir = 0
        const finalPorInvitado = {}

        porInvitado.forEach(intentos => {
            intentos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

            const ultimo = intentos[intentos.length - 1]
            finalPorInvitado[ultimo.status] = (finalPorInvitado[ultimo.status] ?? 0) + 1

            if (intentos.length === 1) return

            invitadosConReintento += 1
            reintentos += intentos.length - 1

            if (LLEGO.has(ultimo.status)) llegaronTrasInsistir += 1
        })

        const invitados = porInvitado.size
        const leidos = finalPorInvitado.read ?? 0
        const llego = (finalPorInvitado.delivered ?? 0) + leidos
        const sinConfirmar = (finalPorInvitado.sent ?? 0) + (finalPorInvitado.processing ?? 0)
        const noLlego = finalPorInvitado.failed ?? 0

        // --- detalle de cada fallo ---
        // Se resuelve aquí y no en la vista porque necesita los intentos ya
        // ordenados: "hubo reintento" es si existe un intento POSTERIOR a este,
        // y "se logró" es el desenlace del último intento de ese invitado.
        const nombresEvento = new Map(invitacionesReales.map(i => [i.id, i.name]))

        const detalleFallos = []

        porInvitado.forEach(intentos => {
            const final = intentos[intentos.length - 1]

            intentos.forEach((intento, indice) => {
                if (intento.status !== 'failed') return

                detalleFallos.push({
                    clave: `${intento.guest_id}-${intento.created_at}`,
                    mes: intento.created_at.slice(0, 7),
                    fecha: intento.created_at,
                    invitado: intento.guest_name || 'sin nombre',
                    telefono: intento.guest_phone ?? null,
                    evento: nombresEvento.get(intento.invitation_id) ?? 'sin nombre',
                    codigo: intento.codigo ?? 'sin código',
                    motivo: intento.titulo ?? 'Meta no reportó el motivo',
                    reintentos: intentos.length - indice - 1,
                    desenlace: final.status,
                })
            })
        })

        detalleFallos.sort((a, b) => b.fecha.localeCompare(a.fecha))

        // La vista recalcula salud y causas cuando se filtra por mes; el hook
        // solo necesita el mapa de nombres para pasárselo.
        const nombres = new Map(invitacionesReales.map(i => [i.id, i.name]))

        // --- serie cruda para las gráficas ---
        // Se guarda sin agrupar porque la granularidad (día / semana / mes) y el
        // año se eligen en la vista: reagrupar 3 mil objetos en un useMemo es
        // instantáneo y evita precalcular nueve combinaciones aquí.
        const serie = envios.map(e => ({
            fecha: new Date(e.created_at),
            fallido: e.status === 'failed',
        }))

        const aniosDisponibles = [...new Set(serie.map(p => p.fecha.getFullYear()))]
            .sort((a, b) => b - a)

        // --- costo ---
        // Se cobra por mensaje que Meta aceptó facturar, no por intento: los
        // fallidos no traen `pricing` y quedan fuera solos, sin reglas extra.
        const facturables = [
            ...envios.map(e => ({ ...e, clase: 'invitación' })),
            ...recordatorios
                .filter(r => idsReales.has(r.invitation_id))
                .map(r => ({ ...r, clase: 'recordatorio' })),
        ].filter(m => m.categoria && m.facturable !== 'false')

        const costoPorMes = new Map()
        const porCategoria = {}
        let sinTarifa = 0

        facturables.forEach(m => {
            const tarifa = TARIFA_USD[m.categoria]

            if (tarifa === undefined) {
                sinTarifa += 1
                return
            }

            const resumen = porCategoria[m.categoria] ?? { mensajes: 0, usd: 0 }
            resumen.mensajes += 1
            resumen.usd += tarifa
            porCategoria[m.categoria] = resumen

            const clave = m.created_at.slice(0, 7)
            const mes = costoPorMes.get(clave) ?? { clave, mensajes: 0, usd: 0, marketing: 0, utility: 0 }
            mes.mensajes += 1
            mes.usd += tarifa
            mes[m.categoria] = (mes[m.categoria] ?? 0) + 1
            costoPorMes.set(clave, mes)
        })

        const mesesCosto = [...costoPorMes.values()].sort((a, b) => b.clave.localeCompare(a.clave))
        const claveMesActual = new Date().toISOString().slice(0, 7)
        const anioActual = claveMesActual.slice(0, 4)

        const costo = {
            total: mesesCosto.reduce((acc, m) => acc + m.usd, 0),
            mensajes: mesesCosto.reduce((acc, m) => acc + m.mensajes, 0),
            mesActual: mesesCosto.find(m => m.clave === claveMesActual) ?? { clave: claveMesActual, mensajes: 0, usd: 0 },
            anio: mesesCosto
                .filter(m => m.clave.startsWith(anioActual))
                .reduce((acc, m) => acc + m.usd, 0),
            anioClave: anioActual,
            porCategoria,
            sinTarifa,
            meses: mesesCosto,
            recordatorios: facturables.filter(m => m.clase === 'recordatorio').length,
        }

        // --- de qué es cada mensaje ---
        /*
          El template lleva el link —el del side event dice literalmente
          `/side-event/`— pero no se guarda: ni `raw_send_response` ni
          `raw_webhook` traen una sola URL, y la tabla no tiene columna de tipo.

          Lo que sí se puede es mirar a quién iba dirigido: el `guest_id` apunta
          a `guests` cuando es la invitación y a `side_events_guests` cuando es
          un side event. Se cruza por el PAR invitación+invitado porque los ids
          de las dos tablas vienen de secuencias distintas y sueltos se pisan.

          Los recordatorios no necesitan nada de esto: su tabla trae
          `side_event_id`.
        */
        const esInvitado = new Set(destinos.invitados
            .map(g => claveDeInvitado(g.invitation_id, g.id)))

        const eventoDelSide = new Map(destinos.sides.map(se => [se.id, se.invitation_id]))
        const esInvitadoDeSide = new Set(destinos.sideGuests
            .map(g => claveDeInvitado(eventoDelSide.get(g.side_events_id), g.id))
            .filter(clave => !clave.startsWith('undefined')))

        const TIPOS = [
            { clave: 'invitacion', label: 'Invitación' },
            { clave: 'side', label: 'Side event' },
            { clave: 'recordatorio', label: 'Recordatorio de invitación' },
            { clave: 'recordatorioSide', label: 'Recordatorio de side event' },
            { clave: 'borrado', label: 'Invitado ya borrado' },
        ]

        const porTipo = new Map(TIPOS.map(t => [t.clave, {
            ...t, total: 0, llegaron: 0, fallaron: 0, sinConfirmar: 0, meses: new Map(),
        }]))

        const anotarTipo = (clave, fila) => {
            const cubo = porTipo.get(clave)
            cubo.total += 1

            if (LLEGO.has(fila.status)) cubo.llegaron += 1
            else if (fila.status === 'failed') cubo.fallaron += 1
            else cubo.sinConfirmar += 1

            const mes = String(fila.created_at).slice(0, 7)
            cubo.meses.set(mes, (cubo.meses.get(mes) ?? 0) + 1)
        }

        envios.forEach(e => {
            const clave = claveDeInvitado(e.invitation_id, e.guest_id)
            if (esInvitado.has(clave)) anotarTipo('invitacion', e)
            else if (esInvitadoDeSide.has(clave)) anotarTipo('side', e)
            else anotarTipo('borrado', e)
        })

        recordatorios
            .filter(r => idsReales.has(r.invitation_id))
            .forEach(r => anotarTipo(r.side_event_id ? 'recordatorioSide' : 'recordatorio', r))

        // Quién mandó los recordatorios. `trigger_source` dice 'manual' en
        // todos, así que el "quién" útil es el evento: los manda el organizador
        // desde su panel, uno por uno o en tanda.
        const recordatoriosPorEvento = new Map()

        recordatorios
            .filter(r => idsReales.has(r.invitation_id))
            .forEach(r => {
                const cubo = recordatoriosPorEvento.get(r.invitation_id) ?? {
                    id: r.invitation_id,
                    nombre: nombres.get(r.invitation_id) ?? 'sin nombre',
                    total: 0,
                    invitacion: 0,
                    side: 0,
                    maximo: 0,
                    invitados: new Set(),
                }

                cubo.total += 1
                if (r.side_event_id) cubo.side += 1
                else cubo.invitacion += 1
                cubo.invitados.add(r.guest_id)
                // El número de recordatorio dice si insisten una vez o varias.
                cubo.maximo = Math.max(cubo.maximo, Number(r.reminder_number ?? 1))

                recordatoriosPorEvento.set(r.invitation_id, cubo)
            })

        const quienRecuerda = [...recordatoriosPorEvento.values()]
            .map(cubo => ({ ...cubo, invitados: cubo.invitados.size }))
            .sort((a, b) => b.total - a.total)

        const tipos = [...porTipo.values()]
        const mesesDeTipos = [...new Set(tipos.flatMap(t => [...t.meses.keys()]))].sort()

        // --- latencia hasta la entrega ---
        const latencias = envios
            .filter(e => e.delivered_at)
            .map(e => (new Date(e.delivered_at) - new Date(e.created_at)) / 1000)
            .filter(s => s >= 0)
            .sort((a, b) => a - b)

        return {
            total: envios.length,
            eventos: new Set(envios.map(e => e.invitation_id)).size,
            invitados,
            fallidos,
            // Leídos también sale del último intento, no del total de filas: si
            // no, el porcentaje se calcula contra una base distinta a la del
            // resto del embudo y deja de ser comparable.
            salud: { llego, sinConfirmar, noLlego, leidos },
            // De los reintentos interesa si FUNCIONAN, no cuántas veces se
            // apretó el botón: por eso se guarda a cuántos invitados les acabó
            // llegando la invitación y no el desglose de intentos.
            reintentos: {
                total: reintentos,
                invitados: invitadosConReintento,
                llegaron: llegaronTrasInsistir,
            },
            tipos,
            mesesDeTipos,
            quienRecuerda,
            registros: envios,
            nombresEvento: nombres,
            mesesConEnvios: mesesDe(envios),
            detalleFallos,
            costo,
            serie,
            aniosDisponibles,
            latencia: { p50: percentil(latencias, 0.5), p90: percentil(latencias, 0.9), muestra: latencias.length },
        }
    }, [filas, recordatorios, destinos, error, invitacionesReales])
}

// --------------------------------------------------------------- gráficas ---

const GraficasDeEnvio = ({ serie, aniosDisponibles }) => {
    const tokens = useTokens()
    const scrollRef = useRef(null)

    // Semana por defecto: el día es demasiado granular para la primera mirada y
    // el mes esconde en qué tanda se concentró el problema.
    const [granularidad, setGranularidad] = useState('semana')

    const anios = useMemo(
        () => [...new Set([...ANIOS_FIJOS, ...aniosDisponibles])].sort((a, b) => b - a),
        [aniosDisponibles],
    )

    // Siempre hay un año seleccionado: el corriente si está en la lista.
    const [anio, setAnio] = useState(() => {
        const actual = new Date().getFullYear()
        return [...new Set([...ANIOS_FIJOS, ...aniosDisponibles])].includes(actual)
            ? actual
            : Math.max(...ANIOS_FIJOS, ...aniosDisponibles)
    })

    const puntos = useMemo(
        () => agrupar(serie.filter(p => p.fecha.getFullYear() === anio), granularidad),
        [serie, granularidad, anio],
    )

    const porDia = granularidad === 'dia'
    const grano = GRANO[granularidad]
    const etiquetas = puntos.map(p => grano.etiqueta(p.clave))

    // Solo la vista diaria fuerza un lienzo más ancho que la tarjeta; semana y
    // mes se dejan a flex para que ocupen todo el ancho disponible.
    const anchoLienzo = porDia ? { minWidth: `${puntos.length * ANCHO_POR_DIA}px` } : undefined

    // Al entrar (y al cambiar de vista) se arranca en los periodos recientes,
    // que es lo que se quiere mirar; en semana y mes no hay scroll y no aplica.
    useEffect(() => {
        const contenedor = scrollRef.current
        if (contenedor) contenedor.scrollLeft = porDia ? contenedor.scrollWidth : 0
    }, [puntos, porDia])

    const ejeX = {
        border: { display: false },
        grid: { display: false },
        ticks: {
            color: tokens.muted,
            font: { family: 'Poppins', size: porDia ? 10 : 10.5 },
            autoSkip: true,
            maxRotation: 0,
            autoSkipPadding: 14,
        },
    }

    const tituloDelPunto = (items) => grano.titulo(puntos[items[0].dataIndex].clave)

    const pieDelPunto = (items) => {
        const punto = puntos[items[0].dataIndex]
        if (punto.total === 0) return 'sin envíos'
        return `${pct(punto.fallidos, punto.total)}% de fallo · ${miles(punto.total)} envíos`
    }

    return (
        <>
            <div className={styles.chips}>
                <div className={styles.chipGrupo}>
                    {GRANULARIDADES.map(({ key, label }) => (
                        <button
                            key={key}
                            type='button'
                            className={`${styles.chip} ${granularidad === key ? styles.chipActivo : ''}`}
                            onClick={() => setGranularidad(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <select
                    className={styles.selectorMes}
                    value={anio}
                    onChange={(e) => setAnio(Number(e.target.value))}
                    aria-label='Año'
                >
                    {anios.map(disponible => (
                        <option key={disponible} value={disponible}>{disponible}</option>
                    ))}
                </select>
            </div>

            {puntos.length === 0 ? (
                <div className={styles.vacio}>
                    Sin envíos en {anio}.
                </div>
            ) : (
            <div className={styles.chartScrollX} ref={scrollRef}>
                <span className={styles.chartTitulo}>
                            <span />
                            <span className={styles.leyendaInline}>
                                <span className={styles.leyendaChip}>
                                    <span className={`${styles.punto} ${styles.puntoAzul}`} /> Envíos
                                </span>
                                <span className={styles.leyendaChip}>
                                    <span className={`${styles.punto} ${styles.puntoRojo}`} /> Errores
                                </span>
                            </span>
                </span>
                <div className={styles.chartAncho} style={anchoLienzo}>
                            <Line
                                data={{
                                    labels: etiquetas,
                                    datasets: [
                                        {
                                            label: 'Envíos',
                                            data: puntos.map(p => p.total),
                                            borderColor: tokens.azul,
                                            backgroundColor: tokens.azulBg,
                                            borderWidth: 2,
                                            fill: true,
                                            // `order` alto = se dibuja primero, o
                                            // sea al fondo. Sin esto el área azul
                                            // se pinta encima y tapa por completo
                                            // la línea de errores, que siempre va
                                            // por debajo de los envíos.
                                            order: 1,
                                            tension: 0.25,
                                            pointRadius: 0,
                                            pointHoverRadius: 4,
                                            pointHoverBorderColor: tokens.surface,
                                            pointHoverBorderWidth: 2,
                                        },
                                        {
                                            // Misma escala que los envíos a
                                            // propósito: un eje propio haría que
                                            // 14 errores se vieran como 300 y la
                                            // comparación dejaría de serlo.
                                            label: 'Errores',
                                            data: puntos.map(p => p.fallidos),
                                            borderColor: tokens.rojo,
                                            backgroundColor: tokens.rojo,
                                            borderWidth: 2,
                                            fill: false,
                                            order: 0,
                                            tension: 0.25,
                                            pointRadius: 0,
                                            pointHoverRadius: 4,
                                            pointHoverBorderColor: tokens.surface,
                                            pointHoverBorderWidth: 2,
                                        },
                                    ],
                                }}
                                options={{
                                    ...opcionesBase,
                                    scales: { x: ejeX, y: ejeYOculto(tokens) },
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            ...tooltipBase(tokens),
                                            callbacks: {
                                                title: tituloDelPunto,
                                                label: (ctx) => (puntos[ctx.dataIndex].total === 0
                                                    ? null
                                                    : `${ctx.dataset.label}: ${miles(ctx.parsed.y)}`),
                                                footer: pieDelPunto,
                                            },
                                        },
                                    },
                                }}
                            />
                </div>
            </div>
            )}
        </>
    )
}

// Selector de periodo compartido por las tarjetas que se pueden acotar a un
// mes. Va en el encabezado, alineado con el título.
const SelectorDeMes = ({ meses, valor, onCambio, etiqueta }) => (
    <select
        className={styles.selectorMes}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        aria-label={etiqueta}
    >
        <option value='todo'>Todo el histórico</option>
        {meses.map(clave => (
            <option key={clave} value={clave}>{nombreDeMes(clave)}</option>
        ))}
    </select>
)

/*
  Cada tipo de mensaje mes a mes, apilado. Apilado y no una línea por tipo
  porque la pregunta es de qué se compone el volumen —cuánto pesa cada cosa
  dentro del total— y no cómo evoluciona cada serie por su cuenta.
*/
const TiposEnElTiempo = ({ tipos, meses, colores }) => {
    const tokens = useTokens()

    const etiquetas = meses.map(clave => {
        const [anio, mes] = clave.split('-')
        return `${MESES[Number(mes) - 1].slice(0, 3)} ${anio.slice(2)}`
    })

    return (
        <div className={styles.chartTiempo}>
            <Bar
                data={{
                    labels: etiquetas,
                    datasets: tipos.map((tipo, i) => ({
                        label: tipo.label,
                        data: meses.map(clave => tipo.meses.get(clave) ?? 0),
                        backgroundColor: colores[i],
                        hoverBackgroundColor: colores[i],
                        borderRadius: 2,
                        borderSkipped: false,
                        maxBarThickness: 34,
                    })),
                }}
                options={{
                    ...opcionesBase,
                    scales: {
                        x: {
                            stacked: true,
                            border: { display: false },
                            grid: { display: false },
                            ticks: { ...ejeTexto(tokens), maxRotation: 0, autoSkipPadding: 10 },
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            border: { display: false },
                            grid: { color: tokens.grid, drawTicks: false },
                            ticks: { ...ejeTexto(tokens), maxTicksLimit: 5 },
                        },
                    },
                    plugins: {
                        legend: { display: false },
                        // Con cinco series apiladas el tooltip por defecto saca
                        // cinco renglones, tres de ellos en cero. Se filtran los
                        // vacíos y el total del mes va en el título, que es
                        // contra lo que se leen las partes.
                        tooltip: {
                            ...tooltipBase(tokens),
                            filter: (ctx) => ctx.parsed.y > 0,
                            callbacks: {
                                title: (items) => {
                                    const total = items.reduce((acc, i) => acc + i.parsed.y, 0)
                                    return `${items[0].label} · ${miles(total)} mensajes`
                                },
                                label: (ctx) => `${ctx.dataset.label}: ${miles(ctx.parsed.y)}`,
                            },
                        },
                    },
                }}
            />
        </div>
    )
}

// ----------------------------------------------------------------- panel ---

export const AnaliticaEnvios = ({ invitacionesReales }) => {
    const datos = useEnvios(invitacionesReales)
    const cambio = useTipoDeCambio()
    const tokens = useTokens()

    const [mesSalud, setMesSalud] = useState('todo')
    const [mesCausas, setMesCausas] = useState('todo')
    const [eventosAbiertos, setEventosAbiertos] = useState(false)
    const [recuerdanAbierto, setRecuerdanAbierto] = useState(false)
    const [mesesAbiertos, setMesesAbiertos] = useState(false)
    // El mes en curso puede no tener ni un fallo; el selector evita que la tabla
    // quede muerta y permite revisar el mes malo (mayo) sin salir de aquí.
    const [mesFallos, setMesFallos] = useState(() => new Date().toISOString().slice(0, 7))

    if (datos.cargando) return <div className={styles.empty}>Cargando envíos…</div>
    if (datos.error) return <div className={styles.empty}>No se pudieron cargar los envíos: {datos.error}</div>
    if (datos.vacio) return <div className={styles.empty}>Todavía no hay envíos que analizar.</div>

    const { reintentos, latencia, costo, tipos, mesesDeTipos } = datos

    // Un color por tipo, estable entre las dos gráficas de la tarjeta. Cinco
    // hues distintos: `tokens.meta` es el mismo verde que `tokens.verde`, así
    // que los dos recordatorios salían del mismo color y la leyenda no se podía
    // leer. El gris de "borrado" es el medio y no el de rejilla, que sobre
    // blanco desaparecía.
    const COLORES_TIPO = [
        tokens.azul,
        tokens.morado,
        tokens.verde,
        tokens.naranja,
        tokens.muted,
    ]

    const enMes = (mes) => (mes === 'todo'
        ? datos.registros
        : datos.registros.filter(e => e.created_at.slice(0, 7) === mes))

    // Los KPI de arriba se quedan globales; la tarjeta usa el periodo elegido.
    const saludMes = resumenDeSalud(enMes(mesSalud), datos.nombresEvento)
    const causas = resumenDeCausas(enMes(mesCausas))
    const fallidosDelPeriodo = causas.reduce((acc, c) => acc + c.total, 0)
    const maximoCausa = causas[0]?.total ?? 0
    const aPesos = (dolares) => dolares * cambio.valor
    const mesesConFallos = [...new Set(datos.detalleFallos.map(f => f.mes))].sort((a, b) => b.localeCompare(a))
    const fallosDelMes = datos.detalleFallos.filter(f => f.mes === mesFallos)
    const reenviados = fallosDelMes.filter(f => f.reintentos > 0)
    const reenviadosQueLlegaron = reenviados.filter(f => LLEGO.has(f.desenlace)).length
    const eficienciaMes = pct(reenviadosQueLlegaron, reenviados.length)
    const costoPorEvento = datos.eventos > 0 ? costo.total / datos.eventos : 0

    return (
        <div className={styles.analitica}>
            <div className={styles.kpis}>
                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Envíos</span>
                    <span className={styles.kpiValue}>{miles(datos.total)}</span>
                    <span className={styles.kpiFoot}>
                        a {miles(datos.invitados)} invitados en {plural(datos.eventos, 'evento', 'eventos')}
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Envíos con error</span>
                    <span className={styles.kpiValue}>
                        {miles(datos.fallidos)}
                        <small> · {pct(datos.fallidos, datos.total)}%</small>
                    </span>
                    <span className={styles.kpiFoot}>
                        cuenta cada intento, no cada invitado
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Reintentos</span>
                    <span className={styles.kpiValue}>{miles(reintentos.total)}</span>
                    <span className={styles.kpiFoot}>
                        a {miles(reintentos.invitados)} invitados ·{' '}
                        {pct(reintentos.llegaron, reintentos.invitados)}% terminó recibiendo la invitación
                    </span>
                </div>

                <div className={`${styles.kpi} ${datos.salud.noLlego > 0 ? styles.kpiAcento : ''}`}>
                    <span className={styles.kpiLabel}>Salud de los envíos</span>
                    <span className={styles.kpiValue}>{pct(datos.salud.llego, datos.invitados)}%</span>
                    <span className={styles.kpiFoot}>
                        {miles(datos.salud.llego)} de {miles(datos.invitados)} invitados recibieron la invitación
                    </span>
                </div>
            </div>

            <div className={styles.bento}>
                <section className={`${styles.card} ${styles.cardAncha}`}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>De qué son los mensajes</h2>
                            <p className={styles.cardSub}>
                                Invitación, side event o recordatorio · {miles(
                                    tipos.reduce((acc, t) => acc + t.total, 0))} mensajes en total
                            </p>
                        </div>
                    </header>

                    <div className={styles.cuerpoEnFila}>
                        <div className={styles.columna}>
                            <span className={styles.miniTitulo}>Cómo terminó cada tipo</span>

                            <BarrasApiladas
                                alto={34 + tipos.length * 40}
                                labels={tipos.map(t => t.label)}
                                series={[
                                    {
                                        label: 'Llegaron',
                                        color: tokens.verde,
                                        valores: tipos.map(t => t.llegaron),
                                    },
                                    {
                                        label: 'Sin confirmar',
                                        color: tokens.grid,
                                        valores: tipos.map(t => t.sinConfirmar),
                                    },
                                    {
                                        label: 'Fallaron',
                                        color: tokens.rojo,
                                        valores: tipos.map(t => t.fallaron),
                                    },
                                ]}
                            />

                            <Leyenda entradas={[
                                { label: 'llegaron', color: tokens.verde },
                                { label: 'sin confirmar', color: tokens.grid },
                                { label: 'fallaron', color: tokens.rojo },
                            ]} />
                        </div>

                        <div className={styles.columna}>
                            <span className={styles.miniTitulo}>Cada tipo mes a mes</span>

                            <TiposEnElTiempo
                                tipos={tipos}
                                meses={mesesDeTipos}
                                colores={COLORES_TIPO}
                            />

                            <Leyenda entradas={tipos.map((tipo, i) => ({
                                label: tipo.label,
                                color: COLORES_TIPO[i],
                            }))} />
                        </div>
                    </div>

                    {/* La tabla va a lo ancho y no dentro de una columna: con
                        ella metida a la izquierda, la derecha se quedaba con
                        media tarjeta de aire debajo de su gráfica. */}
                    <div className={styles.tablaCaja}>
                        <table className={styles.tablaTipos}>
                            <thead>
                                <tr>
                                    <th scope='col' />
                                    <th scope='col'>Mensajes</th>
                                    <th scope='col'>Llegaron</th>
                                    <th scope='col'>Sin confirmar</th>
                                    <th scope='col'>Fallaron</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tipos.map((tipo, i) => (
                                    <tr key={tipo.clave}>
                                        <th scope='row'>
                                            <span
                                                className={styles.leyendaPunto}
                                                style={{ background: COLORES_TIPO[i] }}
                                            />
                                            {tipo.label}
                                        </th>
                                        <td>{miles(tipo.total)}</td>
                                        <td>{pct(tipo.llegaron, tipo.total)}%</td>
                                        <td>{miles(tipo.sinConfirmar)}</td>
                                        <td className={tipo.fallaron === 0 ? styles.tablaCero : ''}>
                                            {miles(tipo.fallaron)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className={styles.nota}>
                        Los recordatorios traen columna propia (<code>side_event_id</code>) que dice a qué
                        van dirigidos. En los envíos no existe: el link del template no se guarda en
                        ninguna columna, así que el tipo se deduce de a quién iba el mensaje —el{' '}
                        <code>guest_id</code> apunta a <code>guests</code> o a{' '}
                        <code>side_events_guests</code>—. Los "ya borrados" son invitados eliminados de la
                        lista después de recibirlo, y por eso concentran los fallos: son los números que
                        el organizador acabó limpiando.
                    </p>

                    <footer className={styles.cardFoot}>
                        <Dropdown
                            trigger={['click']}
                            open={recuerdanAbierto}
                            onOpenChange={setRecuerdanAbierto}
                            placement='topLeft'
                            disabled={datos.quienRecuerda.length === 0}
                            popupRender={() => (
                                <div className={`${styles.listaPopup} ${styles.listaPopupAncha}`}>
                                    <div className={styles.listaHead}>
                                        Quién mandó recordatorios ·{' '}
                                        {plural(datos.quienRecuerda.length, 'evento', 'eventos')}
                                    </div>
                                    <ul className={styles.lista}>
                                        {datos.quienRecuerda.map(evento => (
                                            <li className={styles.listaItemEvento} key={evento.id}>
                                                <span className={styles.listaNombre} title={evento.nombre}>
                                                    {evento.nombre}
                                                </span>
                                                <span className={styles.listaDetalle}>
                                                    a {plural(evento.invitados, 'invitado', 'invitados')}
                                                    {evento.side > 0 && ` · ${evento.side} de side event`}
                                                    {evento.maximo > 1 && ` · hasta ${evento.maximo} veces`}
                                                </span>
                                                <span className={styles.listaValor}>{evento.total}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        >
                            <button type='button' className={styles.verTodas} aria-expanded={recuerdanAbierto}>
                                Ver quién mandó los{' '}
                                {miles(datos.quienRecuerda.reduce((acc, e) => acc + e.total, 0))}{' '}
                                recordatorios
                                <ChevronDown
                                    size={12}
                                    className={`${styles.chevron} ${recuerdanAbierto ? styles.chevronOpen : ''}`}
                                />
                            </button>
                        </Dropdown>
                    </footer>
                </section>


                <section className={`${styles.card} ${styles.cardAncha}`}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Errores del mes</h2>
                            <p className={styles.cardSub}>
                                Qué falló, a quién, si se reintentó y si al final llegó
                            </p>
                        </div>
                        <select
                            className={styles.selectorMes}
                            value={mesFallos}
                            onChange={(e) => setMesFallos(e.target.value)}
                            aria-label='Mes de los errores'
                        >
                            {/* El mes en curso siempre está en la lista aunque no
                                tenga fallos: es el que se abre por defecto. */}
                            {[...new Set([mesFallos, ...mesesConFallos])]
                                .sort((a, b) => b.localeCompare(a))
                                .map(clave => (
                                    <option key={clave} value={clave}>{nombreDeMes(clave)}</option>
                                ))}
                        </select>
                    </header>

                    <div className={styles.resumenMes}>
                        <div className={styles.resumenNumero}>
                            <span className={styles.resumenValor}>{miles(fallosDelMes.length)}</span>
                            <span className={styles.resumenLabel}>
                                {fallosDelMes.length === 1 ? 'envío falló' : 'envíos fallaron'} en{' '}
                                {nombreDeMes(mesFallos).toLowerCase()}
                            </span>
                        </div>
                        <div className={styles.resumenNumero}>
                            <span className={styles.resumenValor}>{miles(reenviados.length)}</span>
                            <span className={styles.resumenLabel}>
                                se reintentaron ·{' '}
                                {miles(fallosDelMes.length - reenviados.length)} se quedaron sin reintentar
                            </span>
                        </div>
                        <div className={styles.resumenNumero}>
                            {/* La eficiencia se mide sobre los que SÍ se reintentaron:
                                incluir los que nadie volvió a mandar castigaría al
                                reintento por algo que nunca ocurrió. */}
                            <span
                                className={[
                                    styles.resumenValor,
                                    // Sin reintentos no hay nada que juzgar: el guion
                                    // va en neutro, no en rojo como si fuera un 0%.
                                    reenviados.length === 0 ? ''
                                        : eficienciaMes >= 50 ? styles.resumenValorOk : styles.resumenValorMal,
                                ].join(' ')}
                            >
                                {reenviados.length > 0 ? `${eficienciaMes}%` : '—'}
                            </span>
                            <span className={styles.resumenLabel}>
                                {reenviados.length > 0
                                    ? `de eficiencia: ${miles(reenviadosQueLlegaron)} de los ${miles(reenviados.length)} reintentos terminó llegando`
                                    : 'sin reintentos que medir'}
                            </span>
                        </div>
                    </div>

                    {fallosDelMes.length === 0 ? (
                        <div className={styles.vacio}>
                            Sin envíos fallidos en {nombreDeMes(mesFallos)}.
                        </div>
                    ) : (
                        <div className={styles.tablaScroll}>
                            <div className={styles.tabla}>
                                <div className={`${styles.tablaFila} ${styles.tablaHead}`}>
                                    <span>Invitado</span>
                                    <span>Evento</span>
                                    <span>Por qué falló</span>
                                    <span>Fecha</span>
                                    <span>Reintento</span>
                                    <span>Resultado</span>
                                </div>

                                {fallosDelMes.map(fallo => (
                                    <div className={styles.tablaFila} key={fallo.clave}>
                                        <span className={styles.celdaInvitado}>
                                            <span className={styles.celdaNombre}>{fallo.invitado}</span>
                                            {fallo.telefono && (
                                                <span className={styles.celdaTel}>{fallo.telefono}</span>
                                            )}
                                        </span>
                                        <span className={styles.celdaTrunca} title={fallo.evento}>
                                            {fallo.evento}
                                        </span>
                                        <span className={styles.celdaInvitado}>
                                            <span className={styles.celdaTrunca} title={fallo.motivo}>
                                                {fallo.motivo}
                                            </span>
                                            <span className={styles.celdaTel}>{fallo.codigo}</span>
                                        </span>
                                        <span className={styles.celdaTenue}>
                                            {new Date(fallo.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                        </span>
                                        <span className={fallo.reintentos > 0 ? '' : styles.celdaTenue}>
                                            {fallo.reintentos > 0
                                                ? `sí · ${plural(fallo.reintentos, 'intento más', 'intentos más')}`
                                                : 'no'}
                                        </span>
                                        <span>
                                            {LLEGO.has(fallo.desenlace) && (
                                                <span className={`${styles.marca} ${styles.marcaOk}`}>
                                                    {fallo.desenlace === 'read' ? 'Leída' : 'Entregada'}
                                                </span>
                                            )}
                                            {fallo.desenlace === 'failed' && (
                                                <span className={`${styles.marca} ${styles.marcaMal}`}>
                                                    Nunca llegó
                                                </span>
                                            )}
                                            {SIN_CONFIRMAR.has(fallo.desenlace) && (
                                                <span className={`${styles.marca} ${styles.marcaTibia}`}>
                                                    Sin confirmar
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <footer className={styles.cardFoot}>
                        {fallosDelMes.length > 0 && (
                            <>
                                {fallosDelMes.filter(f => f.desenlace === 'failed').length} de estos invitados
                                sigue sin recibir su invitación.{' '}
                            </>
                        )}
                        El resultado es el del último intento del invitado, aunque haya sido en otro mes.
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Salud de los envíos</h2>
                            <p className={styles.cardSub}>
                                Resultado del último intento de cada invitado
                            </p>
                        </div>
                        <SelectorDeMes
                            meses={datos.mesesConEnvios}
                            valor={mesSalud}
                            onCambio={setMesSalud}
                            etiqueta='Periodo de la salud de envíos'
                        />
                    </header>

                    {/* Un solo track apilado en lugar de una dona: son tres
                        categorías ordenadas de mejor a peor y así se compara la
                        proporción de un vistazo. */}
                    <div className={styles.saludTrack}>
                        <span
                            className={`${styles.saludSeg} ${styles.saludLlego}`}
                            style={{ width: `${(saludMes.llego / saludMes.invitados) * 100}%` }}
                        />
                        <span
                            className={`${styles.saludSeg} ${styles.saludPendiente}`}
                            style={{ width: `${(saludMes.sinConfirmar / saludMes.invitados) * 100}%` }}
                        />
                        <span
                            className={`${styles.saludSeg} ${styles.saludFallo}`}
                            style={{ width: `${(saludMes.noLlego / saludMes.invitados) * 100}%` }}
                        />
                    </div>

                    <ul className={styles.saludLista}>
                        <li className={styles.saludItem}>
                            <span className={`${styles.punto} ${styles.puntoVerde}`} />
                            <span className={styles.saludNombre}>Llegó a su destino</span>
                            <span className={styles.saludValor}>
                                {miles(saludMes.llego)} · {pct(saludMes.llego, saludMes.invitados)}%
                            </span>
                        </li>
                        <li className={styles.saludItem}>
                            <span className={`${styles.punto} ${styles.puntoGris}`} />
                            <span className={styles.saludNombre}>Sin confirmación de entrega</span>
                            <span className={styles.saludValor}>
                                {miles(saludMes.sinConfirmar)} · {pct(saludMes.sinConfirmar, saludMes.invitados)}%
                            </span>
                        </li>
                        <li className={styles.saludItem}>
                            <span className={`${styles.punto} ${styles.puntoRojo}`} />
                            <span className={styles.saludNombre}>Nunca llegó</span>
                            <span className={styles.saludValor}>
                                {miles(saludMes.noLlego)} · {pct(saludMes.noLlego, saludMes.invitados)}%
                            </span>
                        </li>
                        <li className={`${styles.saludItem} ${styles.saludItemExtra}`}>
                            <span className={`${styles.punto} ${styles.puntoAzul}`} />
                            <span className={styles.saludNombre}>De los que llegaron, se leyeron</span>
                            <span className={styles.saludValor}>
                                {miles(saludMes.leidos)} · {pct(saludMes.leidos, saludMes.llego)}%
                            </span>
                        </li>
                    </ul>

                    {saludMes.peores.length > 0 && (
                        <div className={styles.peores}>
                            <span className={styles.peoresTitulo}>Eventos con más fallas</span>
                            {saludMes.peores.map(evento => (
                                <div className={styles.peorEvento} key={evento.id}>
                                    <span className={styles.peorNombre} title={evento.nombre}>
                                        {evento.nombre}
                                    </span>
                                    <span className={styles.peorBarra}>
                                        <span
                                            className={styles.peorFill}
                                            style={{ width: `${pct(evento.fallidos, evento.total)}%` }}
                                        />
                                    </span>
                                    <span className={styles.peorValor}>
                                        {pct(evento.fallidos, evento.total)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <p className={styles.nota}>
                        El {pct(saludMes.fallidos, saludMes.total)}% de los intentos falla, pero solo el{' '}
                        {pct(saludMes.noLlego, saludMes.invitados)}% de los invitados se queda sin invitación:
                        la diferencia son los reintentos que sí funcionaron.
                    </p>

                    <footer className={styles.cardFoot}>
                        <Dropdown
                            trigger={['click']}
                            open={eventosAbiertos}
                            onOpenChange={setEventosAbiertos}
                            placement='bottomLeft'
                            popupRender={() => (
                                <div className={styles.listaPopup}>
                                    <div className={styles.listaHead}>
                                        Tasa de falla por evento · {plural(saludMes.eventos.length, 'evento', 'eventos')}
                                    </div>
                                    <ul className={styles.lista}>
                                        {saludMes.eventos.map(evento => (
                                            <li className={styles.listaItemEvento} key={evento.id}>
                                                <span className={styles.listaNombre} title={evento.nombre}>
                                                    {evento.nombre}
                                                </span>
                                                {/* El volumen va al lado del porcentaje: 50% de 2
                                                    envíos y 50% de 400 no son el mismo problema. */}
                                                <span className={styles.listaDetalle}>
                                                    {miles(evento.fallidos)}/{miles(evento.total)}
                                                </span>
                                                <span
                                                    className={`${styles.listaValor} ${evento.tasa >= 0.2 ? styles.listaValorAlto : ''}`}
                                                >
                                                    {pct(evento.fallidos, evento.total)}%
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        >
                            <button type='button' className={styles.verTodas} aria-expanded={eventosAbiertos}>
                                Ver la falla de los {saludMes.eventos.length} eventos
                                <ChevronDown
                                    size={12}
                                    className={`${styles.chevron} ${eventosAbiertos ? styles.chevronOpen : ''}`}
                                />
                            </button>
                        </Dropdown>
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Por qué fallan</h2>
                            <p className={styles.cardSub}>Motivo que reporta Meta, por intento fallido</p>
                        </div>
                        <SelectorDeMes
                            meses={datos.mesesConEnvios}
                            valor={mesCausas}
                            onCambio={setMesCausas}
                            etiqueta='Periodo de las causas de fallo'
                        />
                    </header>

                    {causas.length === 0 ? (
                        <div className={styles.vacio}>
                            Sin envíos fallidos en este periodo.
                        </div>
                    ) : (
                    <ul className={styles.causas}>
                        {causas.map(causa => {
                            const propia = CAUSAS_PROPIAS.has(causa.codigo)
                            return (
                                <li className={styles.causa} key={causa.codigo}>
                                    <div className={styles.causaTop}>
                                        <span className={styles.causaTitulo} title={causa.titulo}>
                                            {causa.titulo}
                                        </span>
                                        <span className={styles.causaValor}>{miles(causa.total)}</span>
                                    </div>
                                    <div className={styles.causaBajo}>
                                        <span className={styles.causaBarra}>
                                            <span
                                                className={`${styles.causaFill} ${propia ? styles.causaFillPropia : ''}`}
                                                style={{ width: `${(causa.total / maximoCausa) * 100}%` }}
                                            />
                                        </span>
                                        <span className={styles.causaCodigo}>
                                            {propia && <AlertTriangle size={11} />}
                                            {causa.codigo}
                                        </span>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                    )}

                    <footer className={styles.cardFoot}>
                        {fallidosDelPeriodo > 0 && `${miles(fallidosDelPeriodo)} fallos en el periodo. `}
                        Solo el código 131053 (imagen del template que Meta no pudo descargar) depende
                        de nosotros; el resto son límites de WhatsApp o el número del invitado.
                    </footer>
                </section>

                <section className={`${styles.card} ${styles.cardAncha}`}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Costo de los envíos</h2>
                            <p className={styles.cardSub}>
                                Tarifa de Meta por mensaje facturado · los fallidos no se cobran
                            </p>
                        </div>
                        <span className={styles.cambio}>
                            1 USD = {cambio.valor.toFixed(2)} MXN
                            <span className={styles.cambioFuente}>
                                {cambio.esRespaldo ? 'tipo de cambio de referencia' : 'cotización del día'}
                            </span>
                        </span>
                    </header>

                    <div className={styles.costos}>
                        <div className={styles.costo}>
                            <span className={styles.costoLabel}>{nombreDeMes(costo.mesActual.clave)}</span>
                            <span className={styles.costoUsd}>{usd(costo.mesActual.usd)}</span>
                            <span className={styles.costoMxn}>
                                ≈ {mxn(aPesos(costo.mesActual.usd))} · {miles(costo.mesActual.mensajes)} mensajes
                            </span>
                        </div>

                        <div className={styles.costo}>
                            <span className={styles.costoLabel}>Acumulado {costo.anioClave}</span>
                            <span className={styles.costoUsd}>{usd(costo.anio)}</span>
                            <span className={styles.costoMxn}>≈ {mxn(aPesos(costo.anio))}</span>
                        </div>

                        <div className={styles.costo}>
                            <span className={styles.costoLabel}>Promedio por evento</span>
                            <span className={styles.costoUsd}>{usd(costoPorEvento)}</span>
                            <span className={styles.costoMxn}>
                                ≈ {mxn(aPesos(costoPorEvento))} en {plural(datos.eventos, 'evento', 'eventos')}
                            </span>
                        </div>

                        <div className={styles.costo}>
                            <span className={styles.costoLabel}>Histórico</span>
                            <span className={styles.costoUsd}>{usd(costo.total)}</span>
                            <span className={styles.costoMxn}>
                                ≈ {mxn(aPesos(costo.total))} · {miles(costo.mensajes)} mensajes
                            </span>
                        </div>
                    </div>

                    <ul className={styles.tarifas}>
                        {Object.entries(costo.porCategoria).map(([categoria, resumen]) => (
                            <li className={styles.tarifa} key={categoria}>
                                <span className={styles.tarifaNombre}>
                                    {categoria === 'marketing' ? 'Marketing' : 'Utility'}
                                    <span className={styles.tarifaPrecio}>
                                        ${TARIFA_USD[categoria]} por mensaje
                                    </span>
                                </span>
                                <span className={styles.tarifaValor}>
                                    {miles(resumen.mensajes)} · {usd(resumen.usd)}
                                </span>
                            </li>
                        ))}
                        {costo.sinTarifa > 0 && (
                            <li className={styles.tarifa}>
                                <span className={styles.tarifaNombre}>
                                    Categoría sin tarifa configurada
                                    <span className={styles.tarifaPrecio}>no entra en el total</span>
                                </span>
                                <span className={styles.tarifaValor}>{miles(costo.sinTarifa)}</span>
                            </li>
                        )}
                    </ul>

                    <footer className={styles.cardFoot}>
                        <Dropdown
                            trigger={['click']}
                            open={mesesAbiertos}
                            onOpenChange={setMesesAbiertos}
                            placement='bottomLeft'
                            popupRender={() => (
                                <div className={`${styles.listaPopup} ${styles.listaPopupAncha}`}>
                                    <div className={styles.listaHead}>
                                        Costo mes por mes · incluye {plural(costo.recordatorios, 'recordatorio', 'recordatorios')}
                                    </div>
                                    <ul className={styles.lista}>
                                        {costo.meses.map(mes => (
                                            <li className={styles.listaItemMes} key={mes.clave}>
                                                <span className={styles.listaNombre}>{nombreDeMes(mes.clave)}</span>
                                                <span className={styles.listaDetalle}>
                                                    {miles(mes.marketing)} mkt · {miles(mes.utility)} util
                                                </span>
                                                <span className={styles.listaValor}>{usd(mes.usd)}</span>
                                                <span className={styles.listaValorMxn}>{mxn(aPesos(mes.usd))}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        >
                            <button type='button' className={styles.verTodas} aria-expanded={mesesAbiertos}>
                                Ver el desglose mes por mes
                                <ChevronDown
                                    size={12}
                                    className={`${styles.chevron} ${mesesAbiertos ? styles.chevronOpen : ''}`}
                                />
                            </button>
                        </Dropdown>
                    </footer>
                </section>

                <section className={`${styles.card} ${styles.cardAncha}`}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Envíos en el tiempo</h2>
                            <p className={styles.cardSub}>
                                Volumen contra errores, en la misma escala
                            </p>
                        </div>
                    </header>

                    <GraficasDeEnvio serie={datos.serie} aniosDisponibles={datos.aniosDisponibles} />

                    <footer className={styles.cardFoot}>
                        Mediana de {enSegundos(latencia.p50)} hasta la entrega y {enSegundos(latencia.p90)} en
                        el 90% de los casos, sobre {miles(latencia.muestra)} envíos con acuse.
                    </footer>
                </section>
            </div>
        </div>
    )
}
