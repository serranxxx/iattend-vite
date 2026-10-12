/*
  Analítica de producto — Envíos (salud histórica de los envíos por WhatsApp).

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

  El tablero mide 718 px y no hace scroll de página: lo que no cabe (la lista
  de errores del mes, causas o tipos de más) se desplaza dentro de su tarjeta.
*/

import { useEffect, useMemo, useState } from 'react'
import { Chart, Doughnut } from 'react-chartjs-2'
import { ChevronDown } from 'lucide-react'
import { claveDeInvitado, nombreDeMes } from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import { esEventoActivo } from '../adminConstants'
import { MARCA, ejeTexto, opcionesBase, tooltipBase, tooltipOscuro, useTokens } from '../adminCharts'
import styles from './AnaliticaEnvios.module.css'

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
].join(',')

// De los recordatorios solo interesa cómo terminaron, para la tarjeta de tipos.
const COLUMNAS_RECORDATORIO = [
    'invitation_id',
    'guest_id',
    'created_at',
    'status',
    // Esta tabla sí dice a qué va dirigido el recordatorio. En
    // `invitation_message_dispatches` no existe la columna equivalente.
    'side_event_id',
].join(',')

// Códigos de Meta que apuntan a un problema nuestro y no del destinatario ni de
// la política de WhatsApp: 131053 es la imagen del template que Meta no pudo
// descargar. Es el único accionable desde aquí, así que se marca aparte.
const CAUSAS_PROPIAS = new Set(['131053'])

// Meta reporta el motivo en inglés y con su redacción de API. Se traduce por
// código, no por texto: el título cambia de redacción entre versiones de la API
// y el código no. Un código que no esté aquí se muestra con el título de Meta.
const MOTIVOS_META = {
    131049: 'No entregado para mantener el ecosistema sano',
    130472: 'El número es parte de un experimento de Meta',
    131026: 'Mensaje no entregable',
    131053: 'Error al subir la imagen del template',
    131048: 'Límite de spam alcanzado',
    131050: 'El invitado dejó de recibir marketing',
    131047: 'Pasaron más de 24 h desde su último mensaje',
    131056: 'Demasiados mensajes al mismo número',
    131000: 'Error desconocido de Meta',
    131042: 'Problema con el pago de la cuenta de WhatsApp',
    132001: 'El template no existe o no está aprobado',
}

const motivoDeMeta = (codigo, titulo) =>
    MOTIVOS_META[codigo] ?? titulo ?? 'Meta no reportó el motivo'

// El embudo se lee sobre el último intento de cada invitado.
const LLEGO = new Set(['delivered', 'read'])
const SIN_CONFIRMAR = new Set(['sent', 'processing'])

// El resumen de eventos pide un mínimo de envíos: 1 de 2 fallidos es 50% y no
// significa nada.
const MINIMO_PARA_DESTACAR = 20

// Eje derecho del % de error. El diseño lo fija en 0–60%; si una semana lo
// rebasa se abre al siguiente múltiplo de 20 en vez de cortar la línea.
const TOPE_PCT_ERROR = 60

const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`
const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const miles = (n) => new Intl.NumberFormat('es-MX').format(n)

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

const claveDeSemana = (fecha) => {
    const { anio, semana } = semanaISO(fecha)
    return `${anio}-W${String(semana).padStart(2, '0')}`
}

const etiquetaDeSemana = (clave) => `S${Number(clave.split('-W')[1])}`

const tituloDeSemana = (clave) => {
    const [anio, semana] = clave.split('-W').map(Number)
    const lunes = lunesDe(anio, semana)
    const domingo = new Date(lunes)
    domingo.setUTCDate(domingo.getUTCDate() + 6)
    const corto = (f) => f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    return `${corto(lunes)} – ${corto(domingo)}`
}

// Agrupa los intentos por semana ISO, rellenando las semanas sin envíos: sin
// ellas, dos tandas separadas por un mes se verían consecutivas.
const porSemana = (serie) => {
    if (serie.length === 0) return []

    const cubos = new Map()
    let primera = serie[0].fecha
    let ultima = serie[0].fecha

    serie.forEach(({ fecha, status }) => {
        const clave = claveDeSemana(fecha)
        const cubo = cubos.get(clave) ?? { clave, total: 0, llegaron: 0, fallidos: 0 }
        cubo.total += 1
        if (LLEGO.has(status)) cubo.llegaron += 1
        else if (status === 'failed') cubo.fallidos += 1
        cubos.set(clave, cubo)

        if (fecha < primera) primera = fecha
        if (fecha > ultima) ultima = fecha
    })

    // Se avanza de 7 en 7 desde el lunes de la primera semana: así no hay que
    // resolver a mano los años de 53 semanas.
    const resultado = []
    const cursor = new Date(primera.getFullYear(), primera.getMonth(), primera.getDate())
    cursor.setDate(cursor.getDate() - ((cursor.getDay() || 7) - 1))

    while (cursor <= ultima) {
        const clave = claveDeSemana(cursor)
        resultado.push(cubos.get(clave) ?? { clave, total: 0, llegaron: 0, fallidos: 0 })
        cursor.setDate(cursor.getDate() + 7)
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

// ------------------------------------------------------------- cálculos ---

// Salud sobre el ÚLTIMO intento de cada invitado, más la tasa de falla por
// evento (esa sí por intento: es la que dice dónde se insistió en balde).
const resumenDeSalud = (registros, nombresEvento) => {
    const porInvitado = new Map()
    const porEvento = new Map()
    let fallidos = 0

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
        porEvento.set(e.invitation_id, evento)
    })

    const finales = {}

    porInvitado.forEach(intentos => {
        intentos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        const ultimo = intentos[intentos.length - 1]
        finales[ultimo.status] = (finales[ultimo.status] ?? 0) + 1
    })

    const leidos = finales.read ?? 0

    const eventos = [...porEvento.values()]
        .map(e => ({ ...e, tasa: e.total > 0 ? e.fallidos / e.total : 0 }))
        .sort((a, b) => b.tasa - a.tasa || b.total - a.total)

    return {
        total: registros.length,
        fallidos,
        invitados: porInvitado.size,
        llego: (finales.delivered ?? 0) + leidos,
        sinConfirmar: (finales.sent ?? 0) + (finales.processing ?? 0),
        noLlego: finales.failed ?? 0,
        // Leídos también sale del último intento, no del total de filas: si
        // no, el porcentaje se calcula contra una base distinta a la del
        // resto del embudo y deja de ser comparable.
        leidos,
        eventos,
    }
}

const resumenDeCausas = (registros) => {
    const causas = new Map()

    registros.filter(e => e.status === 'failed').forEach(e => {
        const codigo = e.codigo ?? 'sin código'
        const causa = causas.get(codigo) ?? {
            codigo,
            titulo: motivoDeMeta(e.codigo, e.titulo),
            original: e.titulo ?? null,
            total: 0,
        }
        causa.total += 1
        causas.set(codigo, causa)
    })

    return [...causas.values()].sort((a, b) => b.total - a.total)
}

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
            // el embudo de salud, pero sí en el desglose por tipo.
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

        const nombresEvento = new Map(invitacionesReales.map(i => [i.id, i.name]))
        const invitacionPorId = new Map(invitacionesReales.map(i => [i.id, i]))

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

        porInvitado.forEach(intentos => {
            intentos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            if (intentos.length === 1) return

            invitadosConReintento += 1
            reintentos += intentos.length - 1
            if (LLEGO.has(intentos[intentos.length - 1].status)) llegaronTrasInsistir += 1
        })

        // --- detalle de cada fallo ---
        // Se resuelve aquí y no en la vista porque necesita los intentos ya
        // ordenados: "hubo reintento" es si existe un intento POSTERIOR a este,
        // y "se logró" es el desenlace del último intento de ese invitado.
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
                    motivo: motivoDeMeta(intento.codigo, intento.titulo),
                    reintentos: intentos.length - indice - 1,
                    desenlace: final.status,
                })
            })
        })

        detalleFallos.sort((a, b) => b.fecha.localeCompare(a.fecha))

        // --- de qué es cada mensaje ---
        /*
          El template lleva el link —el del side event dice literalmente
          `/side-event/`— pero no se guarda: ni `raw_send_response` ni
          `raw_webhook` traen una sola URL, y la tabla no tiene columna de tipo.

          Lo que sí se puede es mirar a quién iba dirigido: el `guest_id` apunta
          a `guests` cuando es la invitación y a `side_events_guests` cuando es
          un side event. Se cruza por el PAR invitación+invitado porque los ids
          de las dos tablas vienen de secuencias distintas y sueltos se pisan.
          Los "ya borrados" son invitados eliminados después de recibirlo.

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
            ...t, total: 0, llegaron: 0, fallaron: 0, sinConfirmar: 0,
        }]))

        const anotarTipo = (clave, fila) => {
            const cubo = porTipo.get(clave)
            cubo.total += 1

            if (LLEGO.has(fila.status)) cubo.llegaron += 1
            else if (fila.status === 'failed') cubo.fallaron += 1
            else cubo.sinConfirmar += 1
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

        // --- latencia hasta la entrega ---
        const latencias = envios
            .filter(e => e.delivered_at)
            .map(e => (new Date(e.delivered_at) - new Date(e.created_at)) / 1000)
            .filter(s => s >= 0)
            .sort((a, b) => a - b)

        const salud = resumenDeSalud(envios, nombresEvento)

        // Solo los eventos que todavía no se celebran: en uno pasado ya no hay
        // nada que corregir, y es el que se quiere ver primero.
        const peores = salud.eventos
            .filter(e => e.fallidos > 0 && e.total >= MINIMO_PARA_DESTACAR)
            .filter(e => esEventoActivo(invitacionPorId.get(e.id)))
            .slice(0, 3)

        return {
            total: envios.length,
            eventos: new Set(envios.map(e => e.invitation_id)).size,
            salud,
            peores,
            causas: resumenDeCausas(envios),
            // De los reintentos interesa si FUNCIONAN, no cuántas veces se
            // apretó el botón: por eso se guarda a cuántos invitados les acabó
            // llegando la invitación y no el desglose de intentos.
            reintentos: {
                total: reintentos,
                invitados: invitadosConReintento,
                llegaron: llegaronTrasInsistir,
            },
            tipos: [...porTipo.values()].filter(t => t.total > 0),
            detalleFallos,
            semanas: porSemana(envios.map(e => ({ fecha: new Date(e.created_at), status: e.status }))),
            latencia: { p50: percentil(latencias, 0.5), p90: percentil(latencias, 0.9) },
        }
    }, [filas, recordatorios, destinos, error, invitacionesReales])
}

// --------------------------------------------------------------- gráficas ---

// Dona de salud sobre el hero navy: el número va en HTML encima, no en el
// canvas, para que herede la tipografía del panel.
const DonaSalud = ({ salud }) => {
    const tokens = useTokens()

    return (
        <div className={styles.dona}>
            <Doughnut
                data={{
                    labels: ['Llegó', 'Sin confirmación', 'Nunca llegó'],
                    datasets: [{
                        data: [salud.llego, salud.sinConfirmar, salud.noLlego],
                        backgroundColor: [MARCA.lila, 'rgba(255, 255, 255, 0.22)', MARCA.verde],
                        borderWidth: 0,
                        spacing: 2,
                        hoverOffset: 0,
                    }],
                }}
                options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '74%',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...tooltipOscuro(tokens),
                            callbacks: { label: (ctx) => `${ctx.label}: ${miles(ctx.parsed)}` },
                        },
                    },
                }}
            />
            <div className={styles.donaCentro}>
                <span className={styles.donaValor}>
                    {pct(salud.llego, salud.invitados)}<small>%</small>
                </span>
                <span className={styles.donaPie}>salud</span>
            </div>
        </div>
    )
}

// Barras apiladas por semana (llegaron / con error) con el % de error en una
// línea sobre el eje derecho. Los intentos sin confirmación no se apilan: son
// una franja mínima y meterla como tercer color ensuciaba la lectura; van en el
// pie del tooltip para que el total cuadre.
const SemanasDeFallas = ({ semanas }) => {
    const tokens = useTokens()
    const tasas = semanas.map(s => pct(s.fallidos, s.total))
    const tope = Math.max(TOPE_PCT_ERROR, Math.ceil(Math.max(0, ...tasas) / 20) * 20)

    return (
        <div className={styles.chart}>
            <Chart
                type='bar'
                data={{
                    labels: semanas.map(s => etiquetaDeSemana(s.clave)),
                    datasets: [
                        {
                            type: 'line',
                            label: '% de error',
                            // Una semana sin envíos no tiene tasa: el hueco es
                            // más honesto que un 0% que parece semana perfecta.
                            data: semanas.map((s, i) => (s.total > 0 ? tasas[i] : null)),
                            borderColor: MARCA.verde,
                            backgroundColor: MARCA.verde,
                            borderWidth: 2,
                            tension: 0.35,
                            spanGaps: true,
                            pointRadius: 0,
                            pointHoverRadius: 4,
                            yAxisID: 'y2',
                            order: 0,
                        },
                        {
                            label: 'Llegaron',
                            data: semanas.map(s => s.llegaron),
                            backgroundColor: MARCA.lila,
                            borderRadius: 3,
                            borderSkipped: false,
                            stack: 'intentos',
                            maxBarThickness: 18,
                            order: 1,
                        },
                        {
                            label: 'Con error',
                            data: semanas.map(s => s.fallidos),
                            backgroundColor: MARCA.navy,
                            borderRadius: 3,
                            borderSkipped: false,
                            stack: 'intentos',
                            maxBarThickness: 18,
                            order: 1,
                        },
                    ],
                }}
                options={{
                    ...opcionesBase,
                    scales: {
                        x: {
                            stacked: true,
                            border: { display: false },
                            grid: { display: false },
                            ticks: {
                                ...ejeTexto(tokens),
                                font: { family: 'Poppins', size: 9.5 },
                                maxRotation: 0,
                                autoSkip: true,
                                maxTicksLimit: 12,
                            },
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            border: { display: false },
                            grid: { color: tokens.grid, drawTicks: false },
                            ticks: { display: false },
                        },
                        y2: {
                            position: 'right',
                            beginAtZero: true,
                            max: tope,
                            border: { display: false },
                            grid: { display: false },
                            ticks: {
                                ...ejeTexto(tokens),
                                font: { family: 'Poppins', size: 9.5 },
                                stepSize: 20,
                                callback: (v) => `${v}%`,
                            },
                        },
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...tooltipBase(tokens),
                            callbacks: {
                                title: (items) => tituloDeSemana(semanas[items[0].dataIndex].clave),
                                label: (ctx) => {
                                    if (semanas[ctx.dataIndex].total === 0) return null
                                    return ctx.dataset.type === 'line'
                                        ? `${ctx.dataset.label}: ${ctx.parsed.y}%`
                                        : `${ctx.dataset.label}: ${miles(ctx.parsed.y)}`
                                },
                                footer: (items) => {
                                    const s = semanas[items[0].dataIndex]
                                    if (s.total === 0) return 'sin envíos'
                                    const resto = s.total - s.llegaron - s.fallidos
                                    return `${miles(s.total)} intentos${resto > 0 ? ` · ${miles(resto)} sin confirmación` : ''}`
                                },
                            },
                        },
                    },
                }}
            />
        </div>
    )
}

// -------------------------------------------------------------- piezas UI ---

const ChipLeyenda = ({ color, children }) => (
    <span className={styles.leyendaChip}>
        <i className={styles.leyendaPunto} style={{ background: color }} />
        {children}
    </span>
)

const RESULTADO = {
    read: { texto: 'Leída', clase: 'resultadoOk' },
    delivered: { texto: 'Entregada', clase: 'resultadoOk' },
    failed: { texto: 'Nunca llegó', clase: 'resultadoMal' },
}

const resultadoDe = (desenlace) => RESULTADO[desenlace]
    ?? (SIN_CONFIRMAR.has(desenlace) ? { texto: 'Sin confirmar', clase: 'resultadoTibio' } : { texto: desenlace, clase: 'resultadoTibio' })

const fechaCorta = (iso) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

// ----------------------------------------------------------------- panel ---

export const AnaliticaEnvios = ({ invitacionesReales }) => {
    const datos = useEnvios(invitacionesReales)

    // El mes en curso puede no tener ni un fallo; el selector evita que la tabla
    // quede muerta y permite revisar un mes malo sin salir de aquí.
    const [mesFallos, setMesFallos] = useState(() => new Date().toISOString().slice(0, 7))

    if (datos.cargando) return <div className={styles.estado}>Cargando envíos…</div>
    if (datos.error) return <div className={styles.estado}>No se pudieron cargar los envíos: {datos.error}</div>
    if (datos.vacio) return <div className={styles.estado}>Todavía no hay envíos que analizar.</div>

    const { salud, peores, causas, reintentos, tipos, semanas, latencia } = datos

    const peorTasa = peores[0]?.tasa ?? 0
    const maximoCausa = causas[0]?.total ?? 0
    const fallidosTotales = causas.reduce((acc, c) => acc + c.total, 0)

    const mesesConFallos = [...new Set(datos.detalleFallos.map(f => f.mes))]
    // El mes en curso siempre está en la lista aunque no tenga fallos: es el
    // que se abre por defecto.
    const opcionesMes = [...new Set([mesFallos, ...mesesConFallos])].sort((a, b) => b.localeCompare(a))
    const fallosDelMes = datos.detalleFallos.filter(f => f.mes === mesFallos)
    const reenviados = fallosDelMes.filter(f => f.reintentos > 0)
    const reenviadosQueLlegaron = reenviados.filter(f => LLEGO.has(f.desenlace)).length
    const siguenSinInvitacion = fallosDelMes.filter(f => f.desenlace === 'failed').length

    const eficiencia = pct(reintentos.llegaron, reintentos.invitados)
    const noLaRecibieron = reintentos.invitados - reintentos.llegaron

    const stats = [
        {
            label: 'llegó a su destino',
            valor: miles(salud.llego),
            pie: `${pct(salud.llego, salud.invitados)}% de ${miles(salud.invitados)} invitados`,
            color: MARCA.lila,
        },
        {
            label: 'sin confirmación',
            valor: miles(salud.sinConfirmar),
            pie: `${pct(salud.sinConfirmar, salud.invitados)}%`,
            color: 'rgba(255, 255, 255, 0.3)',
        },
        {
            label: 'nunca llegó',
            valor: miles(salud.noLlego),
            pie: `${pct(salud.noLlego, salud.invitados)}%`,
            color: MARCA.verde,
        },
        {
            label: 'se leyeron',
            valor: `${pct(salud.leidos, salud.llego)}%`,
            pie: `${miles(salud.leidos)} de los que llegaron`,
            color: 'rgba(255, 255, 255, 0.55)',
        },
    ]

    return (
        <div className={styles.tablero}>
            {/* ------------------------------------------------- hero --- */}
            <section className={styles.hero}>
                <DonaSalud salud={salud} />

                <div className={styles.heroCentro}>
                    <h2 className={`${styles.label} ${styles.labelOscuro}`}>
                        Salud de los envíos · último intento de cada invitado
                    </h2>

                    <div className={styles.segmentos}>
                        <span style={{ flex: salud.llego, background: MARCA.lila }} />
                        <span style={{ flex: salud.sinConfirmar, background: 'rgba(255, 255, 255, 0.25)' }} />
                        <span style={{ flex: salud.noLlego, background: MARCA.verde }} />
                    </div>

                    <div className={styles.stats}>
                        {stats.map(s => (
                            <div className={styles.stat} key={s.label}>
                                <span className={styles.statLabel}>
                                    <i style={{ background: s.color }} />{s.label}
                                </span>
                                <span className={styles.statValor}>{s.valor}</span>
                                <span className={styles.statPie}>{s.pie}</span>
                            </div>
                        ))}
                    </div>

                    <span className={styles.frase}>
                        {miles(datos.total)} envíos a {miles(salud.invitados)} invitados en{' '}
                        {plural(datos.eventos, 'evento', 'eventos')} · el{' '}
                        <b>{pct(salud.fallidos, salud.total)}%</b> de los intentos falla, pero solo el{' '}
                        <b>{pct(salud.noLlego, salud.invitados)}%</b> de los invitados se queda sin invitación.
                    </span>
                </div>

                <div className={styles.heroPeores}>
                    <h2 className={`${styles.label} ${styles.labelOscuro}`}>Eventos activos con más fallas</h2>
                    {peores.length === 0 ? (
                        <span className={styles.heroVacio}>
                            Ningún evento activo con {MINIMO_PARA_DESTACAR}+ envíos tiene fallas.
                        </span>
                    ) : (
                        <div className={styles.peores}>
                            {peores.map(evento => (
                                <div className={styles.peor} key={evento.id}>
                                    <span className={styles.peorNombre} title={evento.nombre}>{evento.nombre}</span>
                                    <span className={styles.peorBarra}>
                                        <span style={{ width: `${(evento.tasa / peorTasa) * 100}%` }} />
                                    </span>
                                    <b title={`${miles(evento.fallidos)} de ${miles(evento.total)} intentos`}>
                                        {pct(evento.fallidos, evento.total)}%
                                    </b>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ---------------------------------------- fila del medio --- */}
            <div className={styles.filaMedia}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Cuándo fallan · por semana</h2>
                        <div className={styles.leyenda}>
                            <ChipLeyenda color={MARCA.lila}>llegaron</ChipLeyenda>
                            <ChipLeyenda color={MARCA.navy}>con error</ChipLeyenda>
                            <ChipLeyenda color={MARCA.verde}>% de error</ChipLeyenda>
                        </div>
                    </header>

                    <SemanasDeFallas semanas={semanas} />

                    <span className={styles.nota}>
                        Mediana de {enSegundos(latencia.p50)} hasta la entrega y {enSegundos(latencia.p90)} en
                        el 90% de los casos · cuenta cada intento, no cada invitado
                    </span>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Por qué fallan</h2>
                        <span className={styles.headDato}>{miles(fallidosTotales)} intentos fallidos</span>
                    </header>

                    {causas.length === 0 ? (
                        <div className={styles.vacio}>Ningún envío ha fallado.</div>
                    ) : (
                        <ul className={styles.causas}>
                            {causas.map(causa => {
                                const propia = CAUSAS_PROPIAS.has(causa.codigo)
                                return (
                                    <li className={styles.causa} key={causa.codigo}>
                                        <div className={styles.causaTop}>
                                            <span
                                                className={styles.causaTitulo}
                                                title={causa.original ?? causa.titulo}
                                            >
                                                {causa.titulo}
                                            </span>
                                            {propia && <span className={styles.nuestro}>depende de nosotros</span>}
                                            <span className={styles.codigo}>{causa.codigo}</span>
                                            <b className={styles.causaValor}>{miles(causa.total)}</b>
                                        </div>
                                        <span className={styles.barraCrema}>
                                            <span
                                                style={{
                                                    width: `${(causa.total / maximoCausa) * 100}%`,
                                                    background: propia ? MARCA.navy : MARCA.lila,
                                                }}
                                            />
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </section>
            </div>

            {/* ---------------------------------------- fila de abajo --- */}
            <div className={styles.filaBaja}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Reintentos</h2>
                        {reintentos.invitados > 0 && (
                            <span className={styles.pill}>{eficiencia}% eficiencia</span>
                        )}
                    </header>

                    <div className={styles.reintentoCifra}>
                        <span className={styles.cifra}>{miles(reintentos.total)}</span>
                        <span className={styles.cifraPie}>
                            {reintentos.total === 1 ? 'reintento' : 'reintentos'}
                            <br />a {plural(reintentos.invitados, 'invitado', 'invitados')}
                        </span>
                    </div>

                    {reintentos.invitados > 0 && (
                        <div className={styles.reintentoBarra}>
                            <div className={styles.barraPartida}>
                                {reintentos.llegaron > 0 && (
                                    <span className={styles.parteNavy} style={{ flex: reintentos.llegaron }}>
                                        {miles(reintentos.llegaron)}
                                    </span>
                                )}
                                {noLaRecibieron > 0 && (
                                    <span className={styles.parteLila} style={{ flex: noLaRecibieron }}>
                                        {miles(noLaRecibieron)}
                                    </span>
                                )}
                            </div>
                            <div className={styles.barraPie}>
                                <span><b>{eficiencia}%</b> terminó recibiendo</span>
                                <span><b>{100 - eficiencia}%</b> sin entrega confirmada</span>
                            </div>
                        </div>
                    )}

                    {/* La eficiencia del mes se mide sobre los fallos que SÍ se
                        reintentaron: incluir los que nadie volvió a mandar
                        castigaría al reintento por algo que nunca ocurrió. Sigue
                        al mes elegido en "Errores del mes". */}
                    <div className={styles.reintentoMes}>
                        <span>
                            {nombreDeMes(mesFallos)} ·{' '}
                            {reenviados.length > 0
                                ? `${reenviadosQueLlegaron} de ${reenviados.length} reintentos llegaron`
                                : 'sin reintentos que medir'}
                        </span>
                        <b>{reenviados.length > 0 ? `${pct(reenviadosQueLlegaron, reenviados.length)}%` : '—'}</b>
                    </div>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Errores del mes</h2>
                        <div className={styles.selectCaja}>
                            <select
                                className={styles.select}
                                value={mesFallos}
                                onChange={(e) => setMesFallos(e.target.value)}
                                aria-label='Mes de los errores'
                            >
                                {opcionesMes.map(clave => (
                                    <option key={clave} value={clave}>{nombreDeMes(clave)}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className={styles.selectIcono} />
                        </div>
                    </header>

                    <div className={styles.resumenMes}>
                        <span><b>{miles(fallosDelMes.length)}</b> fallaron</span>
                        <span><b>{miles(reenviados.length)}</b> se reintentaron</span>
                        <span><b>{miles(siguenSinInvitacion)}</b> siguen sin invitación</span>
                    </div>

                    {fallosDelMes.length === 0 ? (
                        <div className={styles.vacio}>Sin envíos fallidos en {nombreDeMes(mesFallos)}.</div>
                    ) : (
                        <>
                            <div className={`${styles.errorFila} ${styles.errorHead}`}>
                                <span>Invitado</span>
                                <span>Evento</span>
                                <span>Por qué falló</span>
                                <span className={styles.derecha}>Resultado</span>
                            </div>
                            <div className={styles.scroll}>
                                {fallosDelMes.map(fallo => {
                                    const resultado = resultadoDe(fallo.desenlace)
                                    return (
                                        <div className={styles.errorFila} key={fallo.clave}>
                                            <span className={styles.celdaDoble}>
                                                <span className={styles.celdaFuerte} title={fallo.invitado}>
                                                    {fallo.invitado}
                                                </span>
                                                <span className={styles.celdaTenue}>
                                                    {fallo.telefono ? `${fallo.telefono} · ` : ''}{fechaCorta(fallo.fecha)}
                                                </span>
                                            </span>
                                            <span className={styles.celdaEvento} title={fallo.evento}>{fallo.evento}</span>
                                            <span className={styles.celdaDoble}>
                                                <span className={styles.celdaMotivo} title={fallo.motivo}>
                                                    {fallo.motivo}
                                                </span>
                                                <span className={styles.celdaTenue}>
                                                    {fallo.codigo} · reintento:{' '}
                                                    {fallo.reintentos > 0 ? `sí · ${fallo.reintentos} más` : 'no'}
                                                </span>
                                            </span>
                                            {/* El resultado es el del último intento del
                                                invitado, aunque haya sido en otro mes. */}
                                            <span className={`${styles.resultado} ${styles[resultado.clase]}`}>
                                                {resultado.texto}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Por tipo de envío</h2>
                        <span className={styles.headDato}>llegaron</span>
                    </header>

                    <ul className={styles.tipos}>
                        {tipos.map(tipo => (
                            <li className={styles.tipo} key={tipo.clave}>
                                <div className={styles.tipoTop}>
                                    <span className={styles.tipoNombre}>{tipo.label}</span>
                                    <span className={styles.codigo}>{miles(tipo.total)}</span>
                                    <b className={styles.tipoPct}>{pct(tipo.llegaron, tipo.total)}%</b>
                                </div>
                                <div
                                    className={styles.tipoBarra}
                                    title={`${miles(tipo.llegaron)} llegaron · ${miles(tipo.sinConfirmar)} sin confirmar · ${miles(tipo.fallaron)} fallaron`}
                                >
                                    <span style={{ flex: tipo.llegaron, background: MARCA.lila }} />
                                    <span style={{ flex: tipo.sinConfirmar, background: MARCA.verde }} />
                                    <span style={{ flex: tipo.fallaron, background: MARCA.navy }} />
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className={styles.leyenda}>
                        <ChipLeyenda color={MARCA.lila}>llegaron</ChipLeyenda>
                        <ChipLeyenda color={MARCA.verde}>sin confirmar</ChipLeyenda>
                        <ChipLeyenda color={MARCA.navy}>fallaron</ChipLeyenda>
                    </div>
                </section>
            </div>
        </div>
    )
}
