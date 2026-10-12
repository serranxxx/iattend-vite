/*
  Analítica de producto — Últimos 30 días (tablero 2p del rediseño).

  Qué pasó con los mensajes de WhatsApp en la ventana: cuántos salieron, cuántos
  llegaron, de qué eran, por qué fallaron y qué se rescató al reintentar. La
  vista cabe completa en 718 px sin scroll de página; lo que no quepa hace
  scroll dentro de su tarjeta. El histórico completo vive en la pestaña Envíos.

  La ventana son días corridos hacia atrás desde hoy —30 por defecto, la elige
  el contenedor en la topbar—, no el mes de calendario: un día 3 de mes, "este
  mes" son tres días de datos y el tablero no dice nada. Hoy siempre es el
  borde derecho.

  Todo se recorta por la fecha del mensaje (envíos y recordatorios), y cada
  intento cuenta: cada uno se cobra.
*/

import { useEffect, useMemo, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { claveDeInvitado } from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import { MARCA, opcionesBase, tooltipBase, tooltipOscuro, useTokens } from '../adminCharts'
import { useTipoDeCambio } from '../tipoDeCambio'
import styles from './AnaliticaResumen.module.css'

const DIAS_POR_DEFECTO = 30

const MS_POR_DIA = 86_400_000

// Hasta 90 días cada barra es un día; con la ventana de un año serían 365
// barras de un píxel, así que ahí cada barra es una semana.
const DIAS_CON_BARRA_DIARIA = 90

// Las mismas tarifas de Meta que usa la pestaña de Envíos.
const TARIFA_USD = { marketing: 0.025, utility: 0.004 }

const LLEGO = new Set(['delivered', 'read'])

// Neutro sobre navy: lo que salió pero Meta todavía no confirma.
const NEUTRO_OSCURO = 'rgba(255, 255, 255, 0.18)'

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
    // Esta tabla SÍ dice a qué va dirigido el mensaje: nulo es recordatorio de
    // la invitación, con valor es de un side event. En
    // `invitation_message_dispatches` no existe la columna y hay que deducirlo.
    'side_event_id',
    'categoria:raw_webhook->pricing->>category',
    'facturable:raw_webhook->pricing->>billable',
].join(',')

/*
  Cada tipo de envío tiene su color fijo —no el de su posición— para que un
  tipo no cambie de color al reordenarse cuando otro lo rebasa. Sobre blanco:
  navy, lila, verde, crema y contraste, en ese orden de peso habitual.
*/
const TIPOS = [
    { clave: 'invitacion', label: 'Invitación', color: MARCA.navy },
    { clave: 'recordatorio', label: 'Recordatorio de invitación', color: MARCA.lila },
    { clave: 'borrado', label: 'Invitado ya borrado', color: MARCA.verde },
    { clave: 'side', label: 'Side event', color: MARCA.crema },
    { clave: 'recordatorioSide', label: 'Recordatorio de side event', color: MARCA.contraste },
]

// Causas de fallo: las tres primeras en la paleta de marca y "otras" en crema.
const COLOR_CAUSA = [MARCA.navy, MARCA.lila, MARCA.verde, MARCA.crema]

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

const fechaCorta = (fecha, conAnio = false) => fecha
    .toLocaleDateString('es-MX', { day: 'numeric', month: 'short', ...(conAnio ? { year: '2-digit' } : {}) })
    .replace('.', '')

// ------------------------------------------------------------------ datos ---

const useResumen = (invitacionesReales, dias) => {
    const [crudo, setCrudo] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelado = false

        // Solo lo que pide el tablero de envíos: invitados y side events hacen
        // falta para deducir de qué es cada envío (ver `tipoDeEnvio`).
        Promise.all([
            traerTodo('guests', 'id,invitation_id'),
            traerTodo('invitation_message_dispatches', COLUMNAS_ENVIO),
            traerTodo('invitation_reminder_dispatches', COLUMNAS_RECORDATORIO),
            traerTodo('side_events', 'id,invitation_id'),
            traerTodo('side_events_guests', 'id,side_events_id'),
        ])
            .then(([invitados, envios, recordatorios, sides, sideGuests]) => {
                if (!cancelado) setCrudo({ invitados, envios, recordatorios, sides, sideGuests })
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

        const anchoTramo = dias <= DIAS_CON_BARRA_DIARIA ? MS_POR_DIA : 7 * MS_POR_DIA
        const tramos = Math.ceil((dias * MS_POR_DIA) / anchoTramo)
        const tramoDe = (fecha) => Math.min(
            tramos - 1,
            Math.max(0, Math.floor((fecha - desde) / anchoTramo)),
        )

        const serieVacia = () => Array.from({ length: tramos }, () => 0)

        const etiquetas = Array.from({ length: tramos }, (_, i) => {
            const inicio = new Date(desde.getTime() + i * anchoTramo)
            return anchoTramo > MS_POR_DIA ? `semana del ${fechaCorta(inicio)}` : fechaCorta(inicio)
        })

        const idsReales = new Set(invitacionesReales.map(i => i.id))

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

        // Envíos por día, partidos por cómo terminaron. Cuenta MENSAJES —envíos
        // y recordatorios— igual que la dona de al lado, para que las barras
        // sumen lo mismo que el centro de la dona.
        const serieLlegaron = serieVacia()
        const serieSinConfirmar = serieVacia()
        const serieFallaron = serieVacia()

        ;[...enviosVentana, ...recordatoriosVentana].forEach(m => {
            const tramo = tramoDe(new Date(m.created_at))
            if (LLEGO.has(m.status)) serieLlegaron[tramo] += 1
            else if (m.status === 'failed') serieFallaron[tramo] += 1
            else serieSinConfirmar[tramo] += 1
        })

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


        return {
            desde,
            etiquetas,
            serie: { llegaron: serieLlegaron, sinConfirmar: serieSinConfirmar, fallaron: serieFallaron },
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
            recordatorios: recordatoriosVentana.length,
            gastoUsd,
            mensajesCobrados: facturables.length - sinTarifa,
        }
    }, [crudo, error, invitacionesReales, dias])
}

// --------------------------------------------------------------- piezas ---

// Dona sin leyenda propia: la leyenda vive al lado (o en las barras), y el
// centro lo pinta quien la usa encima, como HTML.
const Dona = ({ partes, corte, oscuro, tokens }) => {
    const total = partes.reduce((acc, p) => acc + p.valor, 0)

    // Sin datos chart.js no dibuja nada y queda un hueco: un anillo neutro
    // dice "no hubo" sin inventar una proporción.
    const datos = total > 0
        ? partes
        : [{ label: 'Sin datos', valor: 1, color: oscuro ? NEUTRO_OSCURO : MARCA.crema }]

    const tooltip = oscuro ? tooltipOscuro(tokens) : tooltipBase(tokens)

    return (
        <Doughnut
            data={{
                labels: datos.map(p => p.label),
                datasets: [{
                    data: datos.map(p => p.valor),
                    backgroundColor: datos.map(p => p.color),
                    borderWidth: 0,
                    spacing: total > 0 ? 2 : 0,
                }],
            }}
            options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: corte,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        ...tooltip,
                        enabled: total > 0,
                        callbacks: { label: (ctx) => `${ctx.label}: ${miles(ctx.parsed)}` },
                    },
                },
            }}
        />
    )
}

const Etiqueta = ({ children, oscuro }) => (
    <h2 className={`${styles.etiqueta} ${oscuro ? styles.etiquetaOscura : ''}`}>{children}</h2>
)

// Barras apiladas por día sobre navy. Sin ejes: el número exacto está a un
// hover, aquí se lee el perfil y dónde se concentran los fallos.
const BarrasPorDia = ({ etiquetas, serie, tokens }) => (
    <Bar
        data={{
            labels: etiquetas,
            datasets: [
                { label: 'Llegaron', data: serie.llegaron, backgroundColor: MARCA.lila },
                { label: 'Sin confirmar', data: serie.sinConfirmar, backgroundColor: 'rgba(255, 255, 255, 0.22)' },
                { label: 'Fallaron', data: serie.fallaron, backgroundColor: MARCA.verde },
            ].map(d => ({
                ...d,
                hoverBackgroundColor: d.backgroundColor,
                borderRadius: 3,
                borderSkipped: false,
                maxBarThickness: 16,
                stack: 'mensajes',
            })),
        }}
        options={{
            ...opcionesBase,
            scales: {
                x: { stacked: true, display: false },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    border: { display: false },
                    grid: { color: MARCA.oscuroGrid, drawTicks: false },
                    ticks: { display: false },
                },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...tooltipOscuro(tokens),
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${miles(ctx.parsed.y)}` },
                },
            },
        }}
    />
)

const PuntoLeyenda = ({ color, children, oscuro }) => (
    <span className={oscuro ? styles.leyendaOscura : styles.leyenda}>
        <i className={styles.punto} style={{ background: color }} />
        {children}
    </span>
)

// ----------------------------------------------------------------- panel ---

export const AnaliticaResumen = ({ invitacionesReales, dias = DIAS_POR_DEFECTO }) => {
    const datos = useResumen(invitacionesReales, dias)
    const cambio = useTipoDeCambio()
    const tokens = useTokens()

    if (datos.cargando) return <div className={styles.empty}>Armando el resumen…</div>
    if (datos.error) return <div className={styles.empty}>No se pudo armar: {datos.error}</div>

    const { mensajes, totales, porTipo, envio, reintento, reenvio } = datos

    // Lo que salió y Meta no ha confirmado ni rechazado: enviado, aceptado o
    // sin webhook todavía. Es la resta, no un estado propio.
    const sinConfirmar = Math.max(0, mensajes - totales.llegaron - totales.fallaron)

    // Tipos ordenados por volumen; la barra se escala contra el mayor para que
    // los chicos no se vean llenos. Un tipo en cero se queda, atenuado: el cero
    // también es la respuesta ("no se mandó ninguno").
    const tipos = TIPOS
        .map(tipo => ({ ...tipo, ...porTipo[tipo.clave] }))
        .sort((a, b) => b.total - a.total)
    const mayorTipo = Math.max(1, ...tipos.map(t => t.total))

    const causas = datos.causasDelEnvio.map((c, i) => ({
        label: c.titulo, valor: c.total, color: COLOR_CAUSA[i] ?? MARCA.crema,
    }))

    // Un reintento que ni llegó ni falló sigue en vuelo: va aparte, en crema,
    // para que las dos cifras de abajo sumen lo que dicen.
    const reintentoEnVuelo = Math.max(0, reintento.total - reintento.llegaron - reintento.fallaron)
    const causaDelReintento = datos.causasDelReintento[0]

    const composicion = [
        { label: 'primeros intentos', valor: envio.total, color: MARCA.navy, texto: '#fff' },
        { label: 'recordatorios', valor: datos.recordatorios, color: MARCA.lila, texto: MARCA.navy },
        { label: 'reintentos y reenvíos', valor: reintento.total + reenvio.total, color: MARCA.verde, texto: MARCA.navy },
    ]

    const perdidos = datos.conReintento - datos.reintentoQueLlego

    const pasos = [
        {
            paso: '1 · Primer intento',
            valor: miles(envio.total),
            nota: 'invitaciones mandadas por primera vez',
        },
        {
            paso: '2 · Llegaron',
            valor: porcentaje(envio.llegaron, envio.total),
            nota: `al primer intento · ${miles(envio.llegaron)} mensajes`,
        },
        {
            paso: '3 · Fallaron',
            valor: miles(envio.fallaron),
            nota: `del primer intento · ${miles(datos.conReintento)} se reintentaron`,
        },
        {
            paso: '4 · Rescatados',
            valor: miles(datos.reintentoQueLlego),
            nota: `llegaron al reintentar · ${miles(perdidos)} se ${perdidos === 1 ? 'perdió' : 'perdieron'}`,
        },
    ]

    return (
        <div className={styles.tablero}>
            {/* ------------------------------------------------------ hero --- */}
            <section className={styles.hero}>
                <div className={styles.heroDona}>
                    <Etiqueta oscuro>Llegaron a su destino</Etiqueta>
                    <div className={styles.donaCaja}>
                        <Dona
                            oscuro
                            corte='76%'
                            tokens={tokens}
                            partes={[
                                { label: 'Llegaron', valor: totales.llegaron, color: MARCA.lila },
                                { label: 'Sin confirmar', valor: sinConfirmar, color: NEUTRO_OSCURO },
                                { label: 'Fallaron', valor: totales.fallaron, color: MARCA.verde },
                            ]}
                        />
                        <div className={styles.donaCentro}>
                            <span className={`${styles.cifra} ${styles.cifraHero}`}>
                                {mensajes > 0 ? <>{pct(totales.llegaron, mensajes)}<small>%</small></> : '—'}
                            </span>
                            <span className={styles.donaNotaOscura}>
                                {miles(totales.llegaron)} de {miles(mensajes)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles.heroDatos}>
                    <div className={styles.pills}>
                        <span className={styles.pillOscura}>
                            {porcentaje(totales.llegaron, mensajes)} de eficiencia
                        </span>
                        <span className={`${styles.pillOscura} ${styles.pillOscuraSuave}`}>
                            {miles(datos.mensajesCobrados)} cobrados
                        </span>
                    </div>

                    <div className={styles.stats}>
                        <div className={styles.stat}>
                            <span className={styles.cifra}>{miles(mensajes)}</span>
                            <span className={styles.statLabel}>mensajes enviados</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.cifra} style={{ color: MARCA.verde }}>
                                {miles(totales.fallaron)}
                            </span>
                            <span className={styles.statLabel}>
                                fallaron · {porcentaje(totales.fallaron, mensajes)}
                            </span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.cifra}>{usd(datos.gastoUsd)}</span>
                            <span className={styles.statLabel}>
                                gasto · ≈ {mxn(datos.gastoUsd * cambio.valor)}
                            </span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.cifra} style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                                {miles(sinConfirmar)}
                            </span>
                            <span className={styles.statLabel}>sin confirmar</span>
                        </div>
                    </div>
                </div>

                <div className={styles.heroBarras}>
                    <div className={styles.heroBarrasHead}>
                        <Etiqueta oscuro>
                            {dias > DIAS_CON_BARRA_DIARIA ? 'Envíos por semana' : 'Envíos por día'}
                        </Etiqueta>
                        <div className={styles.leyendas}>
                            <PuntoLeyenda oscuro color={MARCA.lila}>llegaron</PuntoLeyenda>
                            <PuntoLeyenda oscuro color='rgba(255, 255, 255, 0.22)'>sin confirmar</PuntoLeyenda>
                            <PuntoLeyenda oscuro color={MARCA.verde}>fallaron</PuntoLeyenda>
                        </div>
                    </div>
                    <div className={styles.barrasCaja}>
                        <BarrasPorDia etiquetas={datos.etiquetas} serie={datos.serie} tokens={tokens} />
                    </div>
                    <div className={styles.barrasPie}>
                        <span>{fechaCorta(datos.desde, dias > DIAS_CON_BARRA_DIARIA)}</span>
                        <span>hoy · {fechaCorta(new Date())}</span>
                    </div>
                </div>
            </section>

            {/* ------------------------------------------------- tarjetas --- */}
            <div className={styles.fila}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <Etiqueta>De qué son los {miles(mensajes)}</Etiqueta>
                        <span className={styles.cardNota}>llegaron</span>
                    </header>

                    <ul className={styles.tipos}>
                        {tipos.map(tipo => {
                            const pctLlegaron = tipo.total > 0 ? pct(tipo.llegaron, tipo.total) : null
                            return (
                                <li
                                    key={tipo.clave}
                                    className={styles.tipo}
                                    style={{ opacity: tipo.total > 0 ? 1 : 0.45 }}
                                >
                                    <div className={styles.tipoFila}>
                                        <span className={styles.tipoNombre}>{tipo.label}</span>
                                        <span className={styles.tipoTotal}>{miles(tipo.total)}</span>
                                        <span
                                            className={styles.tipoPct}
                                            style={{
                                                color: pctLlegaron === null
                                                    ? 'var(--ac-muted-2)'
                                                    : pctLlegaron >= 95 ? 'var(--ac-green-ink)' : 'var(--ac-ink)',
                                            }}
                                        >
                                            {pctLlegaron === null ? '—' : `${pctLlegaron}%`}
                                        </span>
                                    </div>
                                    {/* Lo que llegó en el color del tipo y lo que
                                        falló en contraste; el hueco es lo que
                                        sigue sin confirmar. */}
                                    <div
                                        className={styles.tipoPista}
                                        title={`${miles(tipo.llegaron)} llegaron · ${miles(tipo.fallaron)} fallaron`}
                                    >
                                        <span style={{ width: `${(tipo.llegaron / mayorTipo) * 100}%`, background: tipo.color }} />
                                        <span style={{ width: `${(tipo.fallaron / mayorTipo) * 100}%`, background: MARCA.contraste }} />
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <Etiqueta>Por qué fallaron</Etiqueta>
                        <span className={styles.cardNota}>primer intento</span>
                    </header>

                    <div className={styles.donaCaja}>
                        <Dona corte='72%' tokens={tokens} partes={causas} />
                        <div className={styles.donaCentro}>
                            <span className={`${styles.cifra} ${styles.cifraFallos}`}>{miles(envio.fallaron)}</span>
                            <span className={styles.donaNota}>{envio.fallaron === 1 ? 'fallo' : 'fallos'}</span>
                        </div>
                    </div>

                    {causas.length > 0 ? (
                        <ul className={styles.lista}>
                            {causas.map(causa => (
                                <li key={causa.label} className={styles.listaFila}>
                                    <i className={styles.puntoGrande} style={{ background: causa.color }} />
                                    <span className={styles.listaNombre}>{causa.label}</span>
                                    <b className={styles.listaValor}>{miles(causa.valor)}</b>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className={styles.vacio}>Ningún primer intento falló en la ventana.</p>
                    )}
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <Etiqueta>Reintentos</Etiqueta>
                        <span className={styles.pillVerde}>
                            {porcentaje(reintento.llegaron, reintento.total)} de eficiencia
                        </span>
                    </header>

                    <div className={styles.reintentoCifra}>
                        <span className={`${styles.cifra} ${styles.cifraReintento}`}>{miles(reintento.total)}</span>
                        <span className={styles.reintentoNota}>
                            {reintento.total === 1 ? 'reintento' : 'reintentos'}<br />tras un fallo
                        </span>
                    </div>

                    {reintento.total > 0 ? (
                        <div className={styles.reintentoBarra}>
                            <div className={styles.barraGruesa}>
                                {[
                                    { valor: reintento.llegaron, color: MARCA.navy, texto: '#fff', label: 'llegaron' },
                                    { valor: reintento.fallaron, color: MARCA.lila, texto: MARCA.navy, label: 'volvieron a fallar' },
                                    { valor: reintentoEnVuelo, color: MARCA.crema, texto: MARCA.navy, label: 'sin confirmar' },
                                ].filter(s => s.valor > 0).map(s => (
                                    <span
                                        key={s.label}
                                        style={{ flex: s.valor, background: s.color, color: s.texto }}
                                        title={`${miles(s.valor)} ${s.label}`}
                                    >
                                        {miles(s.valor)}
                                    </span>
                                ))}
                            </div>
                            <div className={styles.reintentoPie}>
                                <span>
                                    <b style={{ color: 'var(--ac-green-ink)' }}>
                                        {porcentaje(reintento.llegaron, reintento.total)}
                                    </b> llegaron al reintentar
                                </span>
                                <span>
                                    <b style={{ color: '#9A4A3E' }}>
                                        {porcentaje(reintento.fallaron, reintento.total)}
                                    </b> volvieron a fallar
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className={styles.vacio}>No hubo reintentos tras un fallo en la ventana.</p>
                    )}

                    <ul className={`${styles.lista} ${styles.listaPie}`}>
                        {causaDelReintento && (
                            <li className={styles.listaFila} title='Causa principal de los reintentos que volvieron a fallar'>
                                <i className={styles.puntoGrande} style={{ background: MARCA.lila }} />
                                <span className={styles.listaNombre}>{causaDelReintento.titulo}</span>
                                <b className={styles.listaValor}>{miles(causaDelReintento.total)}</b>
                            </li>
                        )}
                        {/* Reintentos y reenvíos: el reenvío (a quien YA lo
                            había recibido) no arregla nada pero se cobra igual. */}
                        <li className={styles.listaFila} title={`${miles(reenvio.total)} reenvíos a quien ya lo tenía`}>
                            <i className={styles.puntoGrande} style={{ background: 'var(--ac-line)' }} />
                            <span className={styles.listaNombre}>Costo de volver a mandar</span>
                            <b className={styles.listaValor}>{usd(reintento.usd + reenvio.usd)}</b>
                        </li>
                    </ul>
                </section>
            </div>

            {/* ------------------------------------------------ recorrido --- */}
            <section className={`${styles.card} ${styles.recorrido}`}>
                <header className={styles.cardHead}>
                    <Etiqueta>Recorrido de los {miles(mensajes)} mensajes</Etiqueta>
                    <div className={styles.leyendas}>
                        {composicion.map(c => (
                            <PuntoLeyenda key={c.label} color={c.color}>{c.label}</PuntoLeyenda>
                        ))}
                    </div>
                </header>

                <div className={styles.composicion}>
                    {composicion.filter(c => c.valor > 0).map(c => (
                        <span
                            key={c.label}
                            style={{ flex: c.valor, background: c.color, color: c.texto }}
                            title={`${miles(c.valor)} ${c.label}`}
                        >
                            {miles(c.valor)}
                        </span>
                    ))}
                </div>

                <div className={styles.pasos}>
                    {pasos.map(p => (
                        <div key={p.paso} className={styles.paso}>
                            <span className={`${styles.cifra} ${styles.cifraPaso}`}>{p.valor}</span>
                            <span className={styles.pasoTexto}>
                                <span className={styles.pasoNombre}>{p.paso}</span>
                                <span className={styles.pasoNota}>{p.nota}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}
