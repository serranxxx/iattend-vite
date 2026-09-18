/*
  Analítica de producto — Últimos 30 días.

  Un parte de resultados, no un tablero: números y una frase que los ata, sin
  una sola gráfica. Las otras pestañas sirven para entender POR QUÉ pasa algo;
  esta contesta QUÉ pasó, de un vistazo.

  La ventana son días corridos hacia atrás desde hoy —30 por defecto—, no el
  mes de calendario. La diferencia importa: un día 3 de mes, "este mes" son tres
  días de datos y el resumen no dice nada. El slider mueve el tamaño de esa
  ventana sin cambiar dónde termina: hoy siempre es el borde derecho.

  Cada bloque se recorta por la fecha que le corresponde, y no todas son la
  misma:

  · Eventos se corta por la venta (`created_at`) y por la celebración
    (`event_date`), que son dos preguntas distintas sobre la misma tabla.
  · Envíos y recordatorios, por la fecha del mensaje.
  · Respuestas, por la fecha del envío que las provocó.
  · Mesas, por la fecha de la PRIMERA mesa del evento: la ventana es "quién se
    puso a acomodar en estos 30 días", no "quién compró".
  · Side events, por su creación.

  Todas las cifras de esta pantalla van en PROMEDIO, no en mediana. Es la
  excepción del panel —las demás pestañas usan mediana— y tiene su razón: la
  ventana es corta y con cuatro o cinco valores la mediana ignora los extremos
  y acaba siendo el valor de uno solo. Cada etiqueta lo dice.
*/

import { useEffect, useMemo, useState } from 'react'
import { Bar, Chart, Line } from 'react-chartjs-2'
import {
    ESTADOS_PENDIENTE, claveDeInvitado, esMesaReal, esPro, promedio,
} from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import { ejeTexto, opcionesBase, tooltipBase, useTokens } from '../adminCharts'
import { Leyenda } from './AnaliticaPiezas'
import { useTipoDeCambio } from '../tipoDeCambio'
import styles from './EventosAnalitica.module.css'

const DIAS_POR_DEFECTO = 30

// Los topes del slider. Por debajo de una semana casi ningún bloque junta
// muestra suficiente para decir nada; por encima del año el "resumen de lo
// reciente" deja de serlo y para eso están las otras pestañas.
const DIAS_MINIMOS = 7
const DIAS_MAXIMOS = 365

const MS_POR_DIA = 86_400_000
const MS_POR_HORA = 3_600_000

// Mismo criterio que la pestaña de Mesas: un acomodo cuenta como real a partir
// de 30 invitados sentados, y por debajo del 20% de ocupación se considera
// abandonado.
const SENTADOS_PARA_ACOMODO_REAL = 30
const OCUPACION_ABANDONO = 0.2

// Las mismas tarifas de Meta que usa la pestaña de Envíos.
const TARIFA_USD = { marketing: 0.025, utility: 0.004 }

const LLEGO = new Set(['delivered', 'read'])

// Planes que son una venta. `free` y las invitaciones sin plan se crean desde
// el panel sin cobrar, así que contarlas como vendidas hacía que el resumen
// dijera 5 donde Ventas decía 4.
const PLANES_DE_PAGO = new Set(['pro', 'lite', 'paperless'])

const esVenta = (invitacion) =>
    PLANES_DE_PAGO.has(String(invitacion?.plan ?? '').toLowerCase())

// Doce tramos siempre, sea la ventana de una semana o de un año: la forma de la
// curva se lee igual y el eje se etiqueta según lo ancho que salga el tramo.
const TRAMOS = 12

const ETIQUETA_PLAN = { pro: 'PRO', lite: 'Lite', paperless: 'Paperless' }

// Los títulos que manda Meta son frases largas en inglés ("This message was not
// delivered to maintain healthy ecosystem engagement.") que en una leyenda de
// cuatro renglones no caben ni se leen. Esto es un alias de presentación: el
// texto crudo y el código siguen enteros en la pestaña de Envíos, que es donde
// se va a depurar un fallo concreto.
const TITULOS_CORTOS = [
    { patron: /healthy ecosystem/i, texto: 'Bloqueado por el ecosistema' },
    { patron: /part of an experiment/i, texto: 'Número en experimento' },
    { patron: /undeliverable/i, texto: 'Mensaje no entregable' },
    { patron: /re-?engagement|24 hour/i, texto: 'Fuera de la ventana de 24 h' },
    { patron: /template/i, texto: 'Problema con la plantilla' },
]

const tituloCorto = (titulo) =>
    TITULOS_CORTOS.find(({ patron }) => patron.test(titulo ?? ''))?.texto ?? titulo

const COLUMNAS_ENVIO = [
    'invitation_id',
    'guest_id',
    'status',
    'created_at',
    'codigo:raw_webhook->errors->0->>code',
    'titulo:raw_webhook->errors->0->>title',
    'categoria:raw_webhook->pricing->>category',
    'facturable:raw_webhook->pricing->>billable',
].join(',')

const COLUMNAS_RECORDATORIO = [
    'invitation_id',
    'created_at',
    // `status` hace falta desde que los recordatorios entran al desglose por
    // tipo: sin él, `LLEGO.has(undefined)` es falso y la tabla mostraba 0% de
    // entrega en las dos filas de recordatorio.
    'status',
    'credit_charged',
    // Esta tabla SÍ dice a qué va dirigido el mensaje: nulo es recordatorio de
    // la invitación, con valor es de un side event. En
    // `invitation_message_dispatches` no existe la columna y hay que deducirlo.
    'side_event_id',
    'categoria:raw_webhook->pricing->>category',
    'facturable:raw_webhook->pricing->>billable',
].join(',')

const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`
const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const miles = (n) => new Intl.NumberFormat('es-MX').format(n)

// Porcentaje para mostrar. Sin base no hay porcentaje: un "100%" sobre cero
// casos es una división que no ocurrió, no un resultado perfecto.
const porcentaje = (parte, total) => (total > 0 ? `${pct(parte, total)}%` : '—')

const usd = (n) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
}).format(n)

const mxn = (n) => new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
}).format(n)

const enHoras = (horas) => {
    if (horas === null) return '—'
    if (horas < 1) return `${Math.round(horas * 60)} min`
    if (horas < 48) return `${Math.round(horas)} h`
    return `${Math.round(horas / 24)} días`
}

// `event_date` es timestamptz a medianoche UTC: representa un día de
// calendario, no un instante. Leerlo como fecha local le resta un día en México.
const diaDelEvento = (invitacion) => (invitacion?.event_date
    ? new Date(String(invitacion.event_date).slice(0, 10))
    : null)

// ------------------------------------------------------------------ datos ---

const useResumen = (invitacionesReales, dias) => {
    const [crudo, setCrudo] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelado = false

        Promise.all([
            traerTodo('guests', 'id,invitation_id,state,table,last_update_date,reminder_count'),
            traerTodo('invitation_message_dispatches', COLUMNAS_ENVIO),
            traerTodo('invitation_reminder_dispatches', COLUMNAS_RECORDATORIO),
            traerTodo('tables', 'id,invitation_id,size,created_at'),
            traerTodo('side_events', 'id,invitation_id,created_at'),
            traerTodo('side_events_guests', 'id,side_events_id'),
        ])
            .then(([invitados, envios, recordatorios, mesas, sides, sideGuests]) => {
                if (!cancelado) setCrudo({ invitados, envios, recordatorios, mesas, sides, sideGuests })
            })
            .catch(fallo => {
                console.error('Error al cargar el resumen:', fallo)
                if (!cancelado) setError(fallo.message)
            })

        return () => { cancelado = true }
    }, [])

    return useMemo(() => {
        if (error) return { error }
        if (!crudo) return { cargando: true }

        const hasta = new Date()
        const desde = new Date(hasta.getTime() - dias * MS_POR_DIA)
        const enVentana = (fecha) => fecha !== null && fecha >= desde && fecha <= hasta

        // Ventana inmediatamente anterior, del mismo largo: es contra lo que se
        // comparan las variaciones de las tarjetas de arriba.
        const desdePrevio = new Date(desde.getTime() - dias * MS_POR_DIA)
        const enPrevia = (fecha) => fecha !== null && fecha >= desdePrevio && fecha < desde

        const anchoTramo = (dias * MS_POR_DIA) / TRAMOS
        const tramoDe = (fecha) => Math.min(
            TRAMOS - 1,
            Math.max(0, Math.floor((fecha - desde) / anchoTramo)),
        )

        const serieVacia = () => Array.from({ length: TRAMOS }, () => 0)

        // La etiqueta del tramo depende de lo ancho que salga: con la ventana en
        // un año cada tramo es un mes y basta el nombre; con 30 días son dos
        // días y hace falta el número.
        const etiquetas = Array.from({ length: TRAMOS }, (_, i) => {
            const inicio = new Date(desde.getTime() + i * anchoTramo)
            return anchoTramo >= 25 * MS_POR_DIA
                ? inicio.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')
                : inicio.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '')
        })

        const idsReales = new Set(invitacionesReales.map(i => i.id))
        const porId = new Map(invitacionesReales.map(i => [i.id, i]))

        // ----------------------------------------------------------- eventos ---
        const creados = invitacionesReales.filter(i => enVentana(new Date(i.created_at)))
        const vendidos = creados.filter(esVenta)
        const gratis = creados.length - vendidos.length
        const celebrados = invitacionesReales.filter(i => enVentana(diaDelEvento(i)))

        const vendidosPrevios = invitacionesReales
            .filter(i => enPrevia(new Date(i.created_at)) && esVenta(i)).length

        const serieVendidos = serieVacia()
        const serieCelebrados = serieVacia()

        vendidos.forEach(i => { serieVendidos[tramoDe(new Date(i.created_at))] += 1 })
        celebrados.forEach(i => { serieCelebrados[tramoDe(diaDelEvento(i))] += 1 })

        const anticipaciones = vendidos
            .map(i => {
                const evento = diaDelEvento(i)
                return evento ? Math.round((evento - new Date(i.created_at)) / MS_POR_DIA) : null
            })
            .filter(d => d !== null && d >= 0)

        // ------------------------------------------------------------ envíos ---
        /*
          De qué es cada envío. El template lleva el link —el de side event dice
          literalmente `/side-event/`— pero ese link NO se guarda: ni
          `raw_send_response` ni `raw_webhook` traen una sola URL.
          `invitation_message_dispatches` tampoco tiene columna para el tipo.

          Lo que sí se puede es mirar a quién iba dirigido. El `guest_id` apunta
          a `guests` cuando es la invitación y a `side_events_guests` cuando es
          un side event. Hay que cruzar por el PAR invitación+invitado: los ids
          de las dos tablas vienen de secuencias distintas y sueltos se pisan.
          Comprobado sobre los 3,160 envíos históricos: cero ambigüedades.

          Los que no calzan en ninguna son invitados borrados después del envío.
          No son un error del cruce: son gente que ya no existe en la lista.
        */
        const esInvitado = new Set(crudo.invitados.map(g => claveDeInvitado(g.invitation_id, g.id)))

        const eventoDelSide = new Map(crudo.sides.map(se => [se.id, se.invitation_id]))
        const esInvitadoDeSide = new Set(crudo.sideGuests
            .map(g => claveDeInvitado(eventoDelSide.get(g.side_events_id), g.id))
            .filter(clave => !clave.startsWith('undefined')))

        const tipoDeEnvio = (e) => {
            const clave = claveDeInvitado(e.invitation_id, e.guest_id)
            if (esInvitado.has(clave)) return 'invitacion'
            if (esInvitadoDeSide.has(clave)) return 'side'
            return 'borrado'
        }

        const enviosVentana = crudo.envios
            .filter(e => idsReales.has(e.invitation_id) && enVentana(new Date(e.created_at)))

        const recordatoriosVentana = crudo.recordatorios
            .filter(r => idsReales.has(r.invitation_id) && enVentana(new Date(r.created_at)))

        const fallidos = enviosVentana.filter(e => e.status === 'failed')

        const causas = new Map()
        fallidos.forEach(fallo => {
            const codigo = fallo.codigo ?? 'sin código'
            const causa = causas.get(codigo)
                ?? { codigo, titulo: tituloCorto(fallo.titulo) ?? 'sin causa registrada', total: 0 }
            causa.total += 1
            causas.set(codigo, causa)
        })

        // Todo lo que salió por WhatsApp en la ventana, por tipo. Incluye los
        // recordatorios porque es el desglose de lo que Meta cobra, y ahí no
        // distingue entre una invitación y un recordatorio: los cuenta igual.
        const contarPorTipo = () => ({ total: 0, llegaron: 0, fallaron: 0 })

        const porTipo = {
            invitacion: contarPorTipo(),
            side: contarPorTipo(),
            borrado: contarPorTipo(),
            recordatorio: contarPorTipo(),
            recordatorioSide: contarPorTipo(),
        }

        const anotarTipo = (clave, fila) => {
            const cubo = porTipo[clave]
            cubo.total += 1
            if (LLEGO.has(fila.status)) cubo.llegaron += 1
            if (fila.status === 'failed') cubo.fallaron += 1
        }

        enviosVentana.forEach(e => anotarTipo(tipoDeEnvio(e), e))
        recordatoriosVentana.forEach(r =>
            anotarTipo(r.side_event_id ? 'recordatorioSide' : 'recordatorio', r))

        const mensajesDeLaVentana = enviosVentana.length + recordatoriosVentana.length

        // Totales del desglose. La tarjeta habla de MENSAJES —cada intento y
        // cada recordatorio cuenta— para que sus cifras y la tabla sumen lo
        // mismo; la calidad del primer intento vive en el pie.
        const totales = Object.values(porTipo).reduce((acc, cubo) => ({
            llegaron: acc.llegaron + cubo.llegaron,
            fallaron: acc.fallaron + cubo.fallaron,
        }), { llegaron: 0, fallaron: 0 })

        const causasPrincipales = [...causas.values()].sort((a, b) => b.total - a.total)

        // Top tres causas y el resto en un cajón: la cola son códigos de un solo
        // caso que no cambian ninguna decisión.
        const cola = causasPrincipales.slice(3)
        const causasResumidas = [
            ...causasPrincipales.slice(0, 3),
            ...(cola.length > 0
                ? [{ codigo: 'otras', titulo: 'Otras causas', total: cola.reduce((a, c) => a + c.total, 0) }]
                : []),
        ]

        // La serie cuenta MENSAJES —envíos y recordatorios— igual que la
        // tarjeta: con el KPI contando solo envíos, uno decía 279 y la otra 479
        // sin que nada explicara la diferencia.
        const serieEnvios = serieVacia()
        enviosVentana.forEach(e => { serieEnvios[tramoDe(new Date(e.created_at))] += 1 })
        recordatoriosVentana.forEach(r => { serieEnvios[tramoDe(new Date(r.created_at))] += 1 })

        // --- intentos por invitado ---
        // Una invitación es un invitado, no una fila: si falló y se reintentó
        // tres veces siguen siendo UNA invitación con cuatro intentos. Las dos
        // cifras son distintas y las dos hacen falta — una dice a cuánta gente
        // se le quiso mandar, la otra cuántos mensajes salieron de verdad.
        const intentosPorInvitado = new Map()

        enviosVentana.forEach(e => {
            const clave = claveDeInvitado(e.invitation_id, e.guest_id)
            const intentos = intentosPorInvitado.get(clave) ?? []
            intentos.push(e)
            intentosPorInvitado.set(clave, intentos)
        })

        let reintentos = 0
        let conReintento = 0
        let reintentoQueLlego = 0
        let mandadasQueLlegaron = 0
        let fallosReintentados = 0

        // Tres poblaciones, no dos. El primer intento de cada invitado, y
        // dentro de lo que vino después:
        //
        //  · REINTENTO: el intento anterior FALLÓ. Es insistir.
        //  · REENVÍO: el intento anterior YA HABÍA LLEGADO. Es mandarla otra
        //    vez a quien ya la tenía, y no arregla nada — cuesta igual.
        //
        // Mezclarlos daba "28 reintentos" contra "15 fallos", que no se
        // sostiene: no puedes reintentar más veces de las que algo falló. Con
        // el corte se ve que 19 siguen a un fallo y 9 a una entrega.
        const contador = () => ({ total: 0, llegaron: 0, fallaron: 0, usd: 0 })

        const envio = contador()
        const reintento = contador()
        const reenvio = contador()
        const causasDelEnvio = new Map()


        // Causas de los fallos que YA eran un reintento. Son las que importan
        // para decidir si vale la pena insistir: si el segundo intento muere
        // por lo mismo que el primero, insistir no arregla nada.
        const causasDelReintento = new Map()

        intentosPorInvitado.forEach(intentos => {
            // El orden importa: "hubo reintento" es si existe un intento
            // POSTERIOR a este, no si el invitado tiene varios sueltos.
            intentos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

            reintentos += intentos.length - 1

            const llego = intentos.some(i => LLEGO.has(i.status))
            if (llego) mandadasQueLlegaron += 1

            // Un reintento es un intento posterior a uno que FALLÓ. Un reenvío
            // sobre un mensaje que nunca falló no lo es, y contarlo hacía que
            // "0 de 3 fallos se reintentó" conviviera con "1 de 1 reintento
            // funcionó".
            const seReintentoTrasFallar = intentos.some((intento, indice) =>
                intento.status === 'failed' && indice < intentos.length - 1)

            intentos.forEach((intento, indice) => {
                const previo = intentos[indice - 1]
                const esReintento = indice > 0 && previo.status === 'failed'
                const cubo = indice === 0 ? envio : (esReintento ? reintento : reenvio)

                cubo.total += 1
                if (LLEGO.has(intento.status)) cubo.llegaron += 1
                if (intento.status === 'failed') cubo.fallaron += 1

                // Solo se cobra lo que Meta facturó, y la tarifa depende de la
                // plantilla: marketing cuesta seis veces más que utility. El
                // intento que falla no entra a facturación, así que reintentar
                // sale gratis mientras siga fallando y se paga al funcionar.
                const plantilla = intento.categoria
                const cobrable = plantilla === 'marketing' || plantilla === 'utility'
                if (cobrable) cubo.usd += TARIFA_USD[plantilla]

                if (intento.status !== 'failed') return

                if (indice < intentos.length - 1) fallosReintentados += 1

                const codigo = intento.codigo ?? 'sin código'
                const registro = indice === 0 ? causasDelEnvio : causasDelReintento
                const causa = registro.get(codigo)
                    ?? { codigo, titulo: tituloCorto(intento.titulo) ?? 'sin causa registrada', total: 0 }
                causa.total += 1
                registro.set(codigo, causa)
            })

            if (seReintentoTrasFallar) {
                conReintento += 1
                // El reintento funcionó si la invitación terminó llegando: el
                // intento anterior había fallado, así que el que llegó es uno
                // de los posteriores.
                if (llego) reintentoQueLlego += 1
            }
        })

        // Top tres y el resto en un cajón, igual que las causas generales.
        const resumirCausas = (mapa) => {
            const ordenadas = [...mapa.values()].sort((a, b) => b.total - a.total)
            const cola = ordenadas.slice(3)

            return [
                ...ordenadas.slice(0, 3),
                ...(cola.length > 0
                    ? [{ codigo: 'otras', titulo: 'Otras causas', total: cola.reduce((a, c) => a + c.total, 0) }]
                    : []),
            ]
        }

        const causasDelReintentoOrdenadas = resumirCausas(causasDelReintento)
        const causasDelEnvioOrdenadas = resumirCausas(causasDelEnvio)

        // El costo se cuenta sobre lo que Meta aceptó facturar: los fallidos no
        // traen `pricing` y quedan fuera solos, sin una regla aparte.
        const facturables = [...enviosVentana, ...recordatoriosVentana]
            .filter(m => m.categoria && m.facturable !== 'false')

        const gastoUsd = facturables.reduce((acc, m) => acc + (TARIFA_USD[m.categoria] ?? 0), 0)
        const sinTarifa = facturables.filter(m => TARIFA_USD[m.categoria] === undefined).length

        // --------------------------------------------------------- créditos ---
        // El consumo se cuenta por lo que se cobró DENTRO de la ventana, no por
        // los eventos vendidos en ella: quien compra hoy manda sus invitaciones
        // semanas después, así que medir el consumo de los recién vendidos da
        // cero y no dice nada.
        //
        // Un crédito es un envío de invitación que no falló (los fallidos se
        // reembolsan) más cada recordatorio que sí se cobró.
        const creditos = { total: 0, porEvento: new Map() }

        const cobrarCredito = (invitationId) => {
            creditos.total += 1
            creditos.porEvento.set(invitationId, (creditos.porEvento.get(invitationId) ?? 0) + 1)
        }

        enviosVentana
            .filter(e => e.status !== 'failed' && esPro(porId.get(e.invitation_id)))
            .forEach(e => cobrarCredito(e.invitation_id))

        recordatoriosVentana
            .filter(r => r.credit_charged && esPro(porId.get(r.invitation_id)))
            .forEach(r => cobrarCredito(r.invitation_id))

        // -------------------------------------------------------- respuestas ---
        // Primer envío que no falló de cada invitado: desde ahí se mide todo.
        const primerEnvio = new Map()

        crudo.envios
            .filter(e => idsReales.has(e.invitation_id) && e.status !== 'failed')
            .forEach(e => {
                const clave = claveDeInvitado(e.invitation_id, e.guest_id)
                const momento = new Date(e.created_at)
                const previo = primerEnvio.get(clave)
                if (!previo || momento < previo) primerEnvio.set(clave, momento)
            })

        const invitadosDeLaVentana = crudo.invitados.filter(g => {
            const envio = primerEnvio.get(claveDeInvitado(g.invitation_id, g.id))
            return envio !== undefined && enVentana(envio)
        })

        const tiempos = invitadosDeLaVentana
            .filter(g => !ESTADOS_PENDIENTE.has(g.state) && g.last_update_date)
            .map(g => (new Date(g.last_update_date)
                - primerEnvio.get(claveDeInvitado(g.invitation_id, g.id))) / MS_POR_HORA)
            .filter(h => h >= 0)

        const serieRecibidos = serieVacia()
        const serieRespondieron = serieVacia()

        invitadosDeLaVentana.forEach(g => {
            const tramo = tramoDe(primerEnvio.get(claveDeInvitado(g.invitation_id, g.id)))
            serieRecibidos[tramo] += 1
            if (!ESTADOS_PENDIENTE.has(g.state)) serieRespondieron[tramo] += 1
        })

        const serieTasa = serieRecibidos.map((total, i) => pct(serieRespondieron[i], total))

        // Tasa de respuesta de la ventana anterior, para la variación en puntos.
        const invitadosPrevios = crudo.invitados.filter(g => {
            const envio = primerEnvio.get(claveDeInvitado(g.invitation_id, g.id))
            return envio !== undefined && enPrevia(envio)
        })

        const tasaPrevia = pct(
            invitadosPrevios.filter(g => !ESTADOS_PENDIENTE.has(g.state)).length,
            invitadosPrevios.length,
        )

        const conRecordatorio = invitadosDeLaVentana.filter(g => Number(g.reminder_count) > 0)
        const recordatorioQueMovio = conRecordatorio.filter(g => !ESTADOS_PENDIENTE.has(g.state)).length

        // ------------------------------------------------------------- mesas ---
        const mesasPorEvento = new Map()

        crudo.mesas.filter(esMesaReal).forEach(m => {
            if (!idsReales.has(m.invitation_id)) return

            const cubo = mesasPorEvento.get(m.invitation_id) ?? { mesas: 0, primera: null }
            cubo.mesas += 1

            const creada = new Date(m.created_at)
            if (!cubo.primera || creada < cubo.primera) cubo.primera = creada

            mesasPorEvento.set(m.invitation_id, cubo)
        })

        const sentadosPorEvento = new Map()
        const listaPorEvento = new Map()

        crudo.invitados.forEach(g => {
            if (!idsReales.has(g.invitation_id)) return
            listaPorEvento.set(g.invitation_id, (listaPorEvento.get(g.invitation_id) ?? 0) + 1)
            if (g.table !== null && g.table !== undefined) {
                sentadosPorEvento.set(g.invitation_id, (sentadosPorEvento.get(g.invitation_id) ?? 0) + 1)
            }
        })

        // Los que EMPEZARON a acomodar dentro de la ventana.
        const arrancaronMesas = [...mesasPorEvento.entries()]
            .filter(([, cubo]) => enVentana(cubo.primera))
            .map(([id, cubo]) => {
                const lista = listaPorEvento.get(id) ?? 0
                const sentados = sentadosPorEvento.get(id) ?? 0

                return {
                    id,
                    primera: cubo.primera,
                    mesas: cubo.mesas,
                    sentados,
                    ocupacion: lista > 0 ? sentados / lista : 0,
                    diasHastaLaPrimera: Math.max(0, Math.round(
                        (cubo.primera - new Date(porId.get(id).created_at)) / MS_POR_DIA,
                    )),
                }
            })

        // Los tres destinos son excluyentes a propósito: un evento con 400
        // invitados y 35 sentados llega a los 30 y aun así está casi vacío, así
        // que sin la condición de ocupación los dos cubos se solaparían y la
        // barra apilada sumaría más eventos de los que hay.
        const abandonaron = arrancaronMesas.filter(e => e.ocupacion < OCUPACION_ABANDONO)
        const acomodoReal = arrancaronMesas.filter(e =>
            e.ocupacion >= OCUPACION_ABANDONO && e.sentados >= SENTADOS_PARA_ACOMODO_REAL)
        const acomodoParcial = arrancaronMesas.filter(e =>
            e.ocupacion >= OCUPACION_ABANDONO && e.sentados < SENTADOS_PARA_ACOMODO_REAL)

        // La serie cuenta EVENTOS que empezaron a acomodar en cada tramo, no
        // mesas: un evento que arma 40 de una sentada no es cuarenta veces la
        // señal de adopción que uno que arma una.
        const serieMesas = serieVacia()
        arrancaronMesas.forEach(e => { serieMesas[tramoDe(e.primera)] += 1 })

        // ------------------------------------------------------- side events ---
        const sidesVentana = crudo.sides
            .filter(s => idsReales.has(s.invitation_id) && enVentana(new Date(s.created_at)))

        const sidesPorEvento = new Map()
        sidesVentana.forEach(s => {
            sidesPorEvento.set(s.invitation_id, (sidesPorEvento.get(s.invitation_id) ?? 0) + 1)
        })

        const cubosDePlan = new Map()
        sidesPorEvento.forEach((total, id) => {
            const plan = String(porId.get(id)?.plan ?? '').toLowerCase() || 'sin plan'
            const cubo = cubosDePlan.get(plan) ?? { plan, eventos: 0, sides: 0 }
            cubo.eventos += 1
            cubo.sides += total
            cubosDePlan.set(plan, cubo)
        })

        // PRO y Lite se listan siempre, aunque uno de los dos no haya creado
        // ninguno: un cero es una respuesta —"ese plan no los usa"— y quitar la
        // fila hace que parezca que no se midió.
        const PLANES_FIJOS = ['pro', 'lite']

        PLANES_FIJOS.forEach(plan => {
            if (!cubosDePlan.has(plan)) cubosDePlan.set(plan, { plan, eventos: 0, sides: 0 })
        })

        const sidesPorPlan = [...cubosDePlan.values()]
            .map(cubo => ({
                ...cubo,
                porEvento: cubo.eventos > 0 ? cubo.sides / cubo.eventos : 0,
            }))
            .sort((a, b) => b.sides - a.sides)

        return {
            desde,
            hasta,
            etiquetas,
            eventos: {
                serie: serieVendidos,
                serieCelebrados,
                previos: vendidosPrevios,
                gratis,
                vendidos: vendidos.length,
                celebrados: celebrados.length,
                anticipacion: promedio(anticipaciones),
                anticipacionMuestra: anticipaciones.length,
                creditos: promedio([...creditos.porEvento.values()]),
                creditosMuestra: creditos.porEvento.size,
            },
            envios: {
                serie: serieEnvios,
                causasResumidas,
                total: enviosVentana.length,
                mensajes: mensajesDeLaVentana,
                totales,
                porTipo,
                mandadas: intentosPorInvitado.size,
                mandadasQueLlegaron,
                reintentos,
                conReintento,
                reintentoQueLlego,
                fallosReintentados,
                envio,
                reintento,
                reenvio,
                causasDelEnvio: causasDelEnvioOrdenadas,
                causasDelReintento: causasDelReintentoOrdenadas,
                fallidos: fallidos.length,
                causas: causasPrincipales,
                recordatorios: recordatoriosVentana.length,
                gastoUsd,
                mensajesCobrados: facturables.length - sinTarifa,
                sinTarifa,
            },
            respuestas: {
                serie: serieTasa,
                tasaPrevia,
                invitados: invitadosDeLaVentana.length,
                respondieron: invitadosDeLaVentana.filter(g => !ESTADOS_PENDIENTE.has(g.state)).length,
                tiempo: promedio(tiempos),
                tiempoMuestra: tiempos.length,
                recordatoriosEnviados: conRecordatorio.length,
                recordatoriosQueMovieron: recordatorioQueMovio,
            },
            mesas: {
                serie: serieMesas,
                arrancaron: arrancaronMesas.length,
                acomodoReal: acomodoReal.length,
                acomodoParcial: acomodoParcial.length,
                abandonaron: abandonaron.length,
                // Crear mesas y usarlas son dos cosas distintas: un evento que
                // armó veinte y no sentó a nadie creó, no usó. "Usaron" es el
                // que dejó sentada al menos una quinta parte de su lista.
                usaron: arrancaronMesas.length - abandonaron.length,
                eficiencia: pct(arrancaronMesas.length - abandonaron.length, arrancaronMesas.length),
                mesasCreadas: arrancaronMesas.reduce((acc, e) => acc + e.mesas, 0),
                diasHastaLaPrimera: promedio(arrancaronMesas.map(e => e.diasHastaLaPrimera)),
            },
            side: {
                creados: sidesVentana.length,
                eventos: sidesPorEvento.size,
                porPlan: sidesPorPlan,
            },
        }
    }, [crudo, error, invitacionesReales, dias])
}

// --------------------------------------------------------------- piezas ---

// Curva de la tarjeta de arriba. Sin ejes ni rejilla a propósito: no se lee un
// valor, se lee una forma — pero el valor de cada tramo sí está a un hover de
// distancia, que es lo que convierte la forma en un dato.
const Chispa = ({ serie, etiquetas, formato, color, relleno }) => {
    const tokens = useTokens()

    return (
        <div className={styles.chispa}>
            <Line
                data={{
                    labels: etiquetas,
                    datasets: [{
                        label: '',
                        data: serie,
                        borderColor: color,
                        backgroundColor: relleno,
                        borderWidth: 1.8,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 0,
                        pointHoverRadius: 3.5,
                        pointHoverBackgroundColor: color,
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 1.5,
                    }],
                }}
                options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 600 },
                    // `intersect: false` es lo que hace usable un sparkline de
                    // 42px de alto: sin él hay que acertarle a la línea.
                    interaction: { mode: 'index', intersect: false },
                    scales: { x: { display: false }, y: { display: false, beginAtZero: true } },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...tooltipBase(tokens, formato),
                            displayColors: false,
                            callbacks: { label: (ctx) => formato(ctx.parsed.y) },
                        },
                    },
                }}
            />
        </div>
    )
}

const MiniBarras = ({ etiquetas, series, alto = 118 }) => {
    const tokens = useTokens()

    return (
        <div className={styles.miniChart} style={{ height: alto }}>
            <Bar
                data={{
                    labels: etiquetas,
                    datasets: series.map(serie => ({
                        label: serie.label,
                        data: serie.valores,
                        backgroundColor: serie.color,
                        hoverBackgroundColor: serie.color,
                        borderRadius: { topLeft: 3, topRight: 3, bottomLeft: 0, bottomRight: 0 },
                        borderSkipped: false,
                        maxBarThickness: 26,
                    })),
                }}
                options={{
                    ...opcionesBase,
                    scales: {
                        x: {
                            border: { display: false },
                            grid: { display: false },
                            ticks: { ...ejeTexto(tokens), maxRotation: 0, autoSkipPadding: 12 },
                        },
                        // Sin eje de valores: el número exacto está en las
                        // cifras de arriba, aquí solo interesa el perfil.
                        y: { display: false, beginAtZero: true },
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...tooltipBase(tokens),
                            callbacks: { label: (ctx) => `${ctx.dataset.label}: ${miles(ctx.parsed.y)}` },
                        },
                    },
                }}
            />
        </div>
    )
}

/*
  Los tipos de mensaje, en tabla. Cinco filas con tres cifras cada una no caben
  en una barra apilada sin perder la mitad: la cuota visual de "Recordatorio de
  side event" no dice nada, y el 0 de fallos —que es el dato— desaparece.
*/
const TablaDeTipos = ({ filas }) => (
    <div className={styles.tablaCaja}>
        <table className={styles.tablaTipos}>
            <thead>
                <tr>
                    <th scope='col' />
                    <th scope='col'>Mensajes</th>
                    <th scope='col'>Llegaron</th>
                    <th scope='col'>Fallaron</th>
                </tr>
            </thead>
            <tbody>
                {filas.map(fila => (
                    <tr key={fila.label}>
                        <th scope='row'>{fila.label}</th>
                        <td>{miles(fila.total)}</td>
                        <td>{porcentaje(fila.llegaron, fila.total)}</td>
                        {/* El cero se marca: que un tipo NO falle nunca es tan
                            informativo como que falle mucho. */}
                        <td className={fila.fallaron === 0 ? styles.tablaCero : ''}>
                            {miles(fila.fallaron)}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
)

// Barra apilada de cuotas más su leyenda. Es HTML y no un canvas porque son
// tres o cuatro tramos con su cifra al lado: una gráfica aquí solo agregaría
// ejes que nadie necesita.
const Reparto = ({ titulo, partes }) => {
    const total = partes.reduce((acc, p) => acc + p.total, 0)

    if (total === 0) return null

    return (
        <div className={styles.repartoBloque}>
            <span className={styles.miniTitulo}>{titulo}</span>

            <div className={styles.reparto}>
                {partes.filter(p => p.total > 0).map(parte => (
                    <span
                        key={parte.label}
                        className={styles.repartoSeg}
                        style={{ width: `${(parte.total / total) * 100}%`, background: parte.color }}
                        title={`${parte.label}: ${miles(parte.total)}`}
                    />
                ))}
            </div>

            <ul className={styles.repartoLista}>
                {/* Un renglón en cero no explica nada y empuja a los que sí. */}
                {partes.filter(parte => parte.total > 0).map(parte => (
                    <li className={styles.repartoFila} key={parte.label}>
                        <span className={styles.leyendaPunto} style={{ background: parte.color }} />
                        <span className={styles.repartoNombre}>{parte.label}</span>
                        <span className={styles.repartoValor}>{miles(parte.total)}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

// ----------------------------------------------------------------- panel ---

const Dato = ({ valor, label, tono }) => (
    <div className={styles.trioItem}>
        <span className={`${styles.trioValor} ${tono ? styles[tono] : ''}`}>{valor}</span>
        <span className={styles.trioLabel}>{label}</span>
    </div>
)

// Variación contra la ventana anterior del mismo largo. Sin dato previo no se
// inventa un 100%: no se muestra nada.
const Variacion = ({ actual, previo, unidad = '%' }) => {
    if (previo === 0 || previo === null || previo === undefined) return null

    const delta = unidad === 'pts'
        ? actual - previo
        : Math.round(((actual - previo) / previo) * 100)

    if (delta === 0) return null

    return (
        <span className={`${styles.variacion} ${delta > 0 ? styles.sube : styles.baja}`}>
            {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}{unidad === 'pts' ? ' pts' : '%'}
        </span>
    )
}

const Kpi = ({ label, valor, nota, notaTono, pie, serie, etiquetas, formato, color, relleno, oscuro }) => (
    <section className={`${styles.kpiResumen} ${oscuro ? styles.kpiOscuro : ''}`}>
        <span className={styles.kpiResumenLabel}>{label}</span>

        <div className={styles.kpiResumenFila}>
            <span className={styles.kpiResumenValor}>{valor}</span>
            {nota && <span className={`${styles.kpiResumenNota} ${notaTono ? styles[notaTono] : ''}`}>{nota}</span>}
        </div>

        <Chispa
            serie={serie}
            etiquetas={etiquetas}
            formato={formato}
            color={color}
            relleno={relleno}
        />

        <span className={styles.kpiResumenPie}>{pie}</span>
    </section>
)

export const AnaliticaResumen = ({ invitacionesReales, dias = DIAS_POR_DEFECTO }) => {
    const datos = useResumen(invitacionesReales, dias)
    const cambio = useTipoDeCambio()
    const tokens = useTokens()

    if (datos.cargando) return <div className={styles.empty}>Armando el resumen…</div>
    if (datos.error) return <div className={styles.empty}>No se pudo armar: {datos.error}</div>

    const { eventos, envios, respuestas, mesas, side, etiquetas } = datos

    const tasa = pct(respuestas.respondieron, respuestas.invitados)

    return (
        <div className={styles.analitica}>
            <div className={styles.kpisResumen}>
                <Kpi
                    oscuro
                    label='Eventos vendidos'
                    valor={miles(eventos.vendidos)}
                    nota={<Variacion actual={eventos.vendidos} previo={eventos.previos} />}
                    serie={eventos.serie}
                    etiquetas={etiquetas}
                    formato={(v) => `${miles(v)} ${v === 1 ? 'vendido' : 'vendidos'}`}
                    color={tokens.verde}
                    relleno='rgba(55, 194, 92, 0.22)'
                    pie={`${eventos.celebrados} ya celebrados${eventos.gratis > 0 ? ` · ${eventos.gratis} gratis fuera de la cuenta` : ''}`}
                />
                <Kpi
                    label='Mensajes enviados'
                    valor={miles(envios.mensajes)}
                    nota={envios.totales.fallaron > 0 ? `${miles(envios.totales.fallaron)} fallaron` : null}
                    notaTono='notaRoja'
                    serie={envios.serie}
                    etiquetas={etiquetas}
                    formato={(v) => `${miles(v)} ${v === 1 ? 'mensaje' : 'mensajes'}`}
                    color={tokens.azul}
                    relleno={tokens.azulBg}
                    pie={`invitaciones, side events y recordatorios · ${porcentaje(envios.totales.llegaron, envios.mensajes)} llegó`}
                />
                <Kpi
                    label='Tasa de respuesta'
                    valor={`${tasa}%`}
                    nota={<Variacion actual={tasa} previo={respuestas.tasaPrevia} unidad='pts' />}
                    serie={respuestas.serie}
                    etiquetas={etiquetas}
                    formato={(v) => `${v}% respondió`}
                    color={tokens.verde}
                    relleno='rgba(55, 194, 92, 0.18)'
                    pie={`${miles(respuestas.respondieron)} de ${miles(respuestas.invitados)} invitados · ${enHoras(respuestas.tiempo)} en promedio`}
                />
                <Kpi
                    label='Eventos con mesas'
                    valor={miles(mesas.arrancaron)}
                    nota={`${miles(mesas.usaron)} las usaron de verdad`}
                    notaTono='notaVerde'
                    serie={mesas.serie}
                    etiquetas={etiquetas}
                    formato={(v) => `${miles(v)} ${v === 1 ? 'evento' : 'eventos'}`}
                    color={tokens.naranja}
                    relleno={tokens.naranjaBg}
                    pie={`${mesas.abandonaron} abandonaron · ${miles(mesas.mesasCreadas)} mesas armadas`}
                />
            </div>

            <div className={`${styles.bento} ${styles.bentoPar}`}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div><h2 className={styles.cardTitle}>Eventos</h2></div>
                    </header>

                    <div className={styles.datos}>
                        <Dato valor={miles(eventos.vendidos)} label='eventos vendidos' />
                        <Dato valor={eventos.celebrados} label='celebrados' />
                        <Dato
                            valor={eventos.anticipacion !== null ? `${eventos.anticipacion} d` : '—'}
                            label={`anticipación promedio · ${eventos.anticipacionMuestra} con fecha`}
                        />
                    </div>

                    <span className={styles.miniTitulo}>Ventas en el periodo</span>

                    <MiniBarras
                        etiquetas={etiquetas}
                        series={[
                            { label: 'Vendidos', color: tokens.azul, valores: eventos.serie },
                            { label: 'Celebrados', color: tokens.grid, valores: eventos.serieCelebrados },
                        ]}
                    />

                    <Leyenda entradas={[
                        { label: 'vendidos', color: tokens.azul },
                        { label: 'celebrados', color: tokens.grid },
                    ]} />
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div><h2 className={styles.cardTitle}>Side events</h2></div>
                        <span className={styles.insignia}>
                            {side.creados} en {plural(side.eventos, 'evento', 'eventos')}
                        </span>
                    </header>

                    <div className={styles.datos}>
                        <Dato valor={side.creados} label='side events creados' />
                        <Dato valor={side.eventos} label='eventos que crearon alguno' />
                    </div>

                    <span className={styles.miniTitulo}>Promedio por evento</span>

                    <ul className={styles.planes}>
                        {side.porPlan.map(cubo => (
                            <li className={styles.planFila} key={cubo.plan}>
                                <span className={styles.planNombre}>
                                    {ETIQUETA_PLAN[cubo.plan] ?? cubo.plan}
                                    <small> · {plural(cubo.eventos, 'evento', 'eventos')}</small>
                                </span>
                                <span className={styles.planPista}>
                                    <span
                                        className={styles.planFill}
                                        style={{
                                            width: `${pct(cubo.porEvento, Math.max(...side.porPlan.map(c => c.porEvento)))}%`,
                                        }}
                                    />
                                </span>
                                <span className={styles.planValor}>{cubo.porEvento.toFixed(1)}</span>
                            </li>
                        ))}
                    </ul>

                    {side.porPlan[0]?.sides > 0 && (
                        <footer className={styles.cardFoot}>
                            {side.porPlan[0].sides} de los {side.creados} salieron de eventos{' '}
                            {ETIQUETA_PLAN[side.porPlan[0].plan] ?? side.porPlan[0].plan}.
                        </footer>
                    )}
                </section>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div><h2 className={styles.cardTitle}>Envíos</h2></div>
                        <div className={styles.insignias}>
                            <span className={`${styles.insignia} ${styles.insigniaVerde}`}>
                                {porcentaje(envios.totales.llegaron, envios.mensajes)} de eficiencia
                            </span>
                            <span className={styles.insignia}>
                                {usd(envios.gastoUsd)} · {miles(envios.mensajesCobrados)} mensajes cobrados
                            </span>
                        </div>
                    </header>

                    <div className={styles.datos}>
                        <Dato valor={miles(envios.mensajes)} label='mensajes enviados' />
                        <Dato
                            valor={miles(envios.totales.fallaron)}
                            label={`fallaron · ${porcentaje(envios.totales.fallaron, envios.mensajes)}`}
                            tono='valorRojo'
                        />
                        <Dato
                            valor={porcentaje(envios.totales.llegaron, envios.mensajes)}
                            label='llegaron a su destino'
                            tono='valorVerde'
                        />
                        <Dato
                            valor={usd(envios.gastoUsd)}
                            label={`gasto de la ventana · ≈ ${mxn(envios.gastoUsd * cambio.valor)}`}
                        />
                    </div>

                    <span className={styles.miniTitulo}>
                        De qué son los {miles(envios.mensajes)} mensajes
                    </span>

                    <TablaDeTipos
                        filas={[
                            { label: 'Invitación', ...envios.porTipo.invitacion },
                            { label: 'Side event', ...envios.porTipo.side },
                            { label: 'Recordatorio de invitación', ...envios.porTipo.recordatorio },
                            { label: 'Recordatorio de side event', ...envios.porTipo.recordatorioSide },
                            { label: 'Invitado ya borrado', ...envios.porTipo.borrado },
                        ]}
                    />

                    <Reparto
                        titulo={`Por qué fallaron · ${miles(envios.envio.fallaron)} del primer intento`}
                        partes={envios.causasDelEnvio.map((c, i) => ({
                            label: c.titulo,
                            total: c.total,
                            color: [tokens.rojo, tokens.naranja, tokens.meta, tokens.grid][i] ?? tokens.grid,
                        }))}
                    />

                    <footer className={styles.cardFoot}>
                        Los {miles(envios.mensajes)} mensajes son{' '}
                        {miles(envios.envio.total)} primeros intentos, más{' '}
                        {miles(envios.reintento.total + envios.reenvio.total)} reintentos y reenvíos, más{' '}
                        {miles(envios.recordatorios)} recordatorios: cada intento cuenta porque cada uno
                        se cobra. Al primer intento llega el{' '}
                        {porcentaje(envios.envio.llegaron, envios.envio.total)}, y ahí fallan{' '}
                        {miles(envios.envio.fallaron)} — el resto de los fallos son reintentos que
                        volvieron a caer. Los recordatorios traen columna propia
                        (<code>side_event_id</code>) que dice a qué van dirigidos; en los envíos no
                        existe y el destino se deduce de a quién iba el mensaje. Los "ya borrados" son
                        invitados eliminados de la lista después de recibirlo.
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div><h2 className={styles.cardTitle}>Reintentos</h2></div>
                        <div className={styles.insignias}>
                            <span className={`${styles.insignia} ${styles.insigniaVerde}`}>
                                {porcentaje(envios.reintento.llegaron, envios.reintento.total)} de eficiencia
                            </span>
                            <span className={styles.insignia}>
                                {usd(envios.reintento.usd + envios.reenvio.usd)} en volver a mandar
                            </span>
                        </div>
                    </header>

                    <div className={styles.datos}>
                        <Dato valor={miles(envios.reintento.total)} label='reintentos · tras un fallo' />
                        <Dato
                            valor={miles(envios.reintento.fallaron)}
                            label={`volvieron a fallar · ${porcentaje(envios.reintento.fallaron, envios.reintento.total)}`}
                            tono='valorRojo'
                        />
                        <Dato
                            valor={miles(envios.reintento.llegaron)}
                            label={`llegaron tras reintentar · ${porcentaje(envios.reintento.llegaron, envios.reintento.total)}`}
                            tono='valorVerde'
                        />
                    </div>

                    <Reparto
                        titulo={`Por qué volvieron a fallar · ${miles(envios.reintento.fallaron)}`}
                        partes={envios.causasDelReintento.map((c, i) => ({
                            label: c.titulo,
                            total: c.total,
                            color: [tokens.rojo, tokens.naranja, tokens.meta, tokens.grid][i] ?? tokens.grid,
                        }))}
                    />

                    <footer className={styles.cardFoot}>
                        Un <b>reintento</b> sigue a un intento que falló; un <b>reenvío</b> sigue a uno
                        que YA había llegado y no arregla nada, pero cuesta igual. Por eso hay más
                        reintentos ({miles(envios.reintento.total)}) que fallos de primer intento
                        ({miles(envios.envio.fallaron)}): a un mismo invitado se le puede insistir
                        varias veces.
                    </footer>
                </section>

            </div>
        </div>
    )
}
