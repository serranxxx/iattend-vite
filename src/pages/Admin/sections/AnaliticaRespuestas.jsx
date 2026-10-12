/*
  Analítica de producto — Etapa 3: Respuestas.

  Confirmaciones, rechazos, cuánto tardan en responder y quién no responde.

  Dos límites del modelo que condicionan todo lo que se puede afirmar aquí:

  1. NO existe un registro de respuestas. `guests` solo guarda el estado actual
     más `last_update_date` y `last_action_by`, o sea el ÚLTIMO cambio y quién
     lo hizo. Si un invitado confirma y después el organizador le asigna mesa,
     el último cambio pasa a ser del admin y esa respuesta deja de poder
     atribuirse al invitado. Por eso "respondió el invitado" es un piso, no el
     número exacto, y la cola larga del histograma de tiempos mezcla respuestas
     tardías con ediciones posteriores.

  2. El invitado se une con su envío por `guest_id` Y `invitation_id`. Uniendo
     solo por id se cuelan 230 envíos dirigidos a invitados de side events cuyo
     id coincide con el de un invitado principal.

  Tablero de altura fija (rediseño 2w): hero oscuro con el embudo y debajo dos
  filas de tarjetas, sin scroll de página. Por eso aquí solo vive lo que cabe
  en esa rejilla; la tasa por evento y quién registra las confirmaciones
  salieron de esta pestaña.
*/

import { useEffect, useMemo, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
    ESTADOS_CONFIRMA, ESTADOS_PENDIENTE, ESTADOS_RECHAZA, RANGOS_RESPUESTA,
    claveDeInvitado, claveDeMes, mediana, nombreDeMes,
} from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import { MARCA, ejeTexto, opcionesBase, tooltipBase, tooltipOscuro, useTokens } from '../adminCharts'
import styles from './AnaliticaRespuestas.module.css'

const MS_POR_HORA = 3_600_000

const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const miles = (n) => new Intl.NumberFormat('es-MX').format(n)
const entero = (v) => miles(v)

const enHoras = (horas) => {
    if (horas === null) return '—'
    if (horas < 1) return `${Math.round(horas * 60)} min`
    if (horas < 48) return `${Math.round(horas)} h`
    return `${Math.round(horas / 24)} días`
}

// Las etiquetas de RANGOS_RESPUESTA son para leerse en prosa; bajo las barras
// se abrevian para que no se encimen en el ancho de la tarjeta.
const ETIQUETA_CORTA = {
    'menos de 1 h': '< 1 h',
    '1 a 6 h': '1–6 h',
    '6 a 24 h': '6–24 h',
    '1 a 3 días': '1–3 d',
    '3 a 7 días': '3–7 d',
    'más de 7 días': '> 7 d',
}

// Neutro de "sin responder" sobre el hero navy.
const SIN_RESPONDER_OSCURO = 'rgba(255, 255, 255, 0.22)'

// ------------------------------------------------------------------ datos ---

const useRespuestas = (invitacionesReales, mes) => {
    const [crudo, setCrudo] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelado = false

        Promise.all([
            traerTodo('guests', 'id,invitation_id,name,state,last_action_by,created_at,last_update_date,reminder_count'),
            traerTodo('invitation_message_dispatches', 'guest_id,invitation_id,status,created_at'),
        ])
            .then(([invitados, envios]) => {
                if (!cancelado) setCrudo({ invitados, envios })
            })
            .catch(fallo => {
                console.error('Error al cargar las respuestas:', fallo)
                if (!cancelado) setError(fallo.message)
            })

        return () => { cancelado = true }
    }, [])

    return useMemo(() => {
        if (error) return { error }
        if (!crudo) return { cargando: true }

        const idsReales = new Set(invitacionesReales.map(i => i.id))
        const invitados = crudo.invitados.filter(g => idsReales.has(g.invitation_id))

        // Primer envío que no falló de cada invitado: es el momento en que la
        // invitación quedó en sus manos y desde ahí se mide la respuesta.
        const primerEnvio = new Map()

        crudo.envios
            .filter(e => idsReales.has(e.invitation_id) && e.status !== 'failed')
            .forEach(e => {
                const clave = claveDeInvitado(e.invitation_id, e.guest_id)
                const momento = new Date(e.created_at)
                const previo = primerEnvio.get(clave)
                if (!previo || momento < previo) primerEnvio.set(clave, momento)
            })

        // Meses disponibles según la fecha de envío, que es el único momento
        // fechado con precisión en toda la etapa.
        const mesesConEnvio = [...new Set([...primerEnvio.values()].map(claveDeMes))]
            .sort((a, b) => b.localeCompare(a))

        const enElMes = (fecha) => mes === 'todo' || claveDeMes(fecha) === mes

        const conInvitacion = invitados.filter(g => {
            const envio = primerEnvio.get(claveDeInvitado(g.invitation_id, g.id))
            return envio !== undefined && enElMes(envio)
        })

        if (conInvitacion.length === 0) {
            return { vacio: true, mesesConEnvio }
        }

        // --- embudo ---
        const confirmados = conInvitacion.filter(g => ESTADOS_CONFIRMA.has(g.state)).length
        const rechazados = conInvitacion.filter(g => ESTADOS_RECHAZA.has(g.state)).length
        const pendientes = conInvitacion.filter(g => ESTADOS_PENDIENTE.has(g.state))

        // --- tiempo de respuesta ---
        // Solo cuentan los cambios hechos por el invitado: si el último lo hizo
        // el organizador, esa fecha no dice nada de cuándo respondió.
        const horas = conInvitacion
            .filter(g => g.last_action_by === 'guest')
            .map(g => (new Date(g.last_update_date) - primerEnvio.get(claveDeInvitado(g.invitation_id, g.id))) / MS_POR_HORA)
            .filter(h => h >= 0)

        const histograma = RANGOS_RESPUESTA.map(({ label, hasta }, i) => {
            const desde = i === 0 ? 0 : RANGOS_RESPUESTA[i - 1].hasta
            return { label, total: horas.filter(h => h >= desde && h < hasta).length }
        })

        // Acumulado del histograma: la barra dice cuántos cayeron en esa
        // ventana y la línea cuántos habían respondido YA a esas alturas, que
        // es la lectura que importa ("a las 24 h ya respondió la mitad").
        let corridos = 0
        const acumulado = histograma.map(tramo => {
            corridos += tramo.total
            return pct(corridos, horas.length)
        })

        // --- recordatorios ---
        const conRecordatorio = conInvitacion.filter(g => Number(g.reminder_count) > 0)
        const recordatorioQueMovio = conRecordatorio.filter(g => !ESTADOS_PENDIENTE.has(g.state)).length

        return {
            conInvitacion: conInvitacion.length,
            confirmados,
            rechazados,
            pendientes: pendientes.length,
            tiempos: {
                muestra: horas.length,
                medianaHoras: mediana(horas),
                enLaPrimeraHora: horas.filter(h => h < 1).length,
                histograma,
                acumulado,
            },
            recordatorios: {
                enviados: conRecordatorio.length,
                movieron: recordatorioQueMovio,
                pendientesConRecordatorio: pendientes.filter(g => Number(g.reminder_count) > 0).length,
                sinRecordatorio: pendientes.filter(g => !Number(g.reminder_count)).length,
            },
            mesesConEnvio,
        }
    }, [crudo, error, invitacionesReales, mes])
}

// ---------------------------------------------------------------- gráficas ---

// Dona sin leyenda ni hover offset: el número del centro y las filas de al lado
// ya dicen lo que importa; el tooltip queda solo para el valor exacto.
const Dona = ({ segmentos, cutout, tooltip }) => (
    <Doughnut
        data={{
            labels: segmentos.map(s => s.label),
            datasets: [{
                data: segmentos.map(s => s.valor),
                backgroundColor: segmentos.map(s => s.color),
                borderWidth: 0,
                spacing: 2,
                hoverOffset: 0,
            }],
        }}
        options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            cutout,
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...tooltip,
                    callbacks: { label: (ctx) => `${ctx.label}: ${miles(ctx.parsed)}` },
                },
            },
        }}
    />
)

// Barras lila por ventana de tiempo + línea navy del acumulado en el eje
// derecho (0–100%).
const TiempoDeRespuesta = ({ histograma, acumulado, tokens }) => (
    <Bar
        data={{
            labels: histograma.map(t => ETIQUETA_CORTA[t.label] ?? t.label),
            datasets: [
                {
                    type: 'line',
                    label: 'Acumulado',
                    data: acumulado,
                    borderColor: MARCA.navy,
                    borderWidth: 2.2,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: MARCA.navy,
                    yAxisID: 'y2',
                    order: 0,
                },
                {
                    label: 'Respondieron',
                    data: histograma.map(t => t.total),
                    backgroundColor: MARCA.lila,
                    borderRadius: 5,
                    borderSkipped: false,
                    maxBarThickness: 46,
                    order: 1,
                },
            ],
        }}
        options={{
            ...opcionesBase,
            animation: false,
            scales: {
                x: {
                    border: { display: false },
                    grid: { display: false },
                    ticks: { ...ejeTexto(tokens), maxRotation: 0 },
                },
                y: {
                    beginAtZero: true,
                    border: { display: false },
                    grid: { color: tokens.grid, drawTicks: false },
                    ticks: { ...ejeTexto(tokens), font: { family: 'Poppins', size: 9.5 }, maxTicksLimit: 4 },
                },
                y2: {
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    border: { display: false },
                    grid: { display: false },
                    ticks: {
                        ...ejeTexto(tokens),
                        font: { family: 'Poppins', size: 9.5 },
                        stepSize: 50,
                        callback: (v) => `${v}%`,
                    },
                },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...tooltipBase(tokens, entero),
                    callbacks: {
                        label: (ctx) => (ctx.dataset.yAxisID === 'y2'
                            ? `${ctx.dataset.label}: ${ctx.parsed.y}%`
                            : `${ctx.dataset.label}: ${miles(ctx.parsed.y)}`),
                    },
                },
            },
        }}
    />
)

const Punto = ({ color }) => <i className={styles.punto} style={{ background: color }} />

// ----------------------------------------------------------------- panel ---

// El periodo lo controla el contenedor, que dibuja el selector en la topbar.
// Aquí solo se reportan los meses disponibles, que dependen de los datos y no
// se conocen hasta que cargan.
export const AnaliticaRespuestas = ({ invitacionesReales, mes, onMesesDisponibles }) => {
    const datos = useRespuestas(invitacionesReales, mes)
    const tokens = useTokens()

    const meses = datos.mesesConEnvio

    useEffect(() => {
        if (meses) onMesesDisponibles(meses)
    }, [meses, onMesesDisponibles])

    if (datos.cargando) return <div className={styles.empty}>Cargando respuestas…</div>
    if (datos.error) return <div className={styles.empty}>No se pudieron cargar las respuestas: {datos.error}</div>

    if (datos.vacio) {
        return (
            <div className={styles.empty}>
                {mes === 'todo'
                    ? 'Todavía no hay invitaciones enviadas que analizar.'
                    : `Sin invitaciones enviadas en ${nombreDeMes(mes)}.`}
            </div>
        )
    }

    const { tiempos, recordatorios } = datos
    const base = datos.conInvitacion

    const tasaGeneral = pct(datos.confirmados, base)

    const hero = [
        {
            label: 'Confirmaciones',
            valor: datos.confirmados,
            pct: tasaGeneral,
            pie: 'de los que recibieron invitación',
            color: MARCA.verde,
        },
        {
            label: 'Rechazos',
            valor: datos.rechazados,
            pct: pct(datos.rechazados, base),
            pie: `${pct(datos.rechazados, datos.confirmados + datos.rechazados)}% de quienes respondieron`,
            color: MARCA.lila,
        },
        {
            label: 'Sin responder',
            valor: datos.pendientes,
            pct: pct(datos.pendientes, base),
            pie: `solo ${miles(recordatorios.pendientesConRecordatorio)} recibieron recordatorio`,
            color: 'rgba(255, 255, 255, 0.35)',
        },
    ]

    // Las tres filas descomponen a los que no respondían: los primeros ya
    // salieron del grupo y los otros dos suman los pendientes que quedan. La
    // barra se escala contra la mayor de las tres para que se comparen entre sí.
    const filasNoResponden = [
        {
            label: 'Respondieron tras el recordatorio',
            valor: recordatorios.movieron,
            color: MARCA.navy,
        },
        {
            label: 'Con recordatorio y aún sin responder',
            valor: recordatorios.pendientesConRecordatorio,
            color: MARCA.lila,
        },
        {
            // La fila accionable: a estos nunca se les insistió.
            label: 'Nunca recibieron un recordatorio',
            valor: recordatorios.sinRecordatorio,
            color: MARCA.verde,
            destacada: true,
        },
    ]
    const maximoFila = Math.max(...filasNoResponden.map(f => f.valor), 1)

    const siguenSinResponder = recordatorios.enviados - recordatorios.movieron
    const pctMovieron = pct(recordatorios.movieron, recordatorios.enviados)

    return (
        <div className={styles.tablero}>
            {/* ---------------------------------------------------- hero --- */}
            <section className={styles.hero}>
                <div className={styles.donaHero}>
                    <Dona
                        cutout='74%'
                        tooltip={tooltipOscuro(tokens, entero)}
                        segmentos={[
                            { label: 'Confirmaron', valor: datos.confirmados, color: MARCA.verde },
                            { label: 'Rechazaron', valor: datos.rechazados, color: MARCA.lila },
                            { label: 'Sin responder', valor: datos.pendientes, color: SIN_RESPONDER_OSCURO },
                        ]}
                    />
                    <div className={styles.donaCentro}>
                        <span className={`${styles.cifra} ${styles.cifraHero}`}>
                            {tasaGeneral}<small>%</small>
                        </span>
                        <span className={styles.donaPie}>confirmaron</span>
                    </div>
                </div>

                <div className={styles.heroCuerpo}>
                    <h2 className={`${styles.label} ${styles.labelOscuro}`}>
                        Respuestas de {miles(base)} invitados que recibieron su invitación
                    </h2>

                    <div className={styles.segmentada}>
                        <span style={{ flex: datos.confirmados, background: MARCA.verde }} />
                        <span style={{ flex: datos.rechazados, background: MARCA.lila }} />
                        <span style={{ flex: datos.pendientes, background: 'rgba(255, 255, 255, 0.25)' }} />
                    </div>

                    <div className={styles.heroStats}>
                        {hero.map(stat => (
                            <div className={styles.heroStat} key={stat.label}>
                                <span className={styles.heroStatLabel}>
                                    <Punto color={stat.color} />
                                    {stat.label}
                                </span>
                                <div className={styles.heroStatFila}>
                                    <span className={`${styles.cifra} ${styles.cifraStat}`}>{miles(stat.valor)}</span>
                                    <span className={styles.heroStatPct}>{stat.pct}%</span>
                                </div>
                                <span className={styles.heroStatPie}>{stat.pie}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ------------------------------------------------ fila 1 --- */}
            <div className={`${styles.fila} ${styles.filaAnchaIzq}`}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Tiempo de respuesta</h2>
                        <div className={styles.leyenda}>
                            <span><Punto color={MARCA.lila} />respondieron en la ventana</span>
                            <span><Punto color={MARCA.navy} />acumulado</span>
                        </div>
                    </header>

                    <div className={styles.recuadro}>
                        <span className={`${styles.cifra} ${styles.cifraRecuadro}`}>
                            {enHoras(tiempos.medianaHoras)}
                        </span>
                        <span className={styles.recuadroTexto}>
                            de mediana ·{' '}
                            <b>
                                {miles(tiempos.enLaPrimeraHora)} de {miles(tiempos.muestra)}{' '}
                                ({pct(tiempos.enLaPrimeraHora, tiempos.muestra)}%)
                            </b>{' '}
                            responden en la primera hora
                        </span>
                    </div>

                    {/* La cola de "más de 7 días" mezcla respuestas tardías con
                        ediciones posteriores del invitado: la base guarda su
                        último cambio, no el momento exacto en que respondió. */}
                    <div
                        className={styles.grafica}
                        title='La cola de más de 7 días incluye ediciones posteriores: se guarda el último cambio del invitado, no el momento de su respuesta.'
                    >
                        <TiempoDeRespuesta
                            histograma={tiempos.histograma}
                            acumulado={tiempos.acumulado}
                            tokens={tokens}
                        />
                    </div>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Los que no responden</h2>
                        <span className={styles.cardSub}>y si el recordatorio sirve</span>
                    </header>

                    <div className={styles.titular}>
                        <span className={`${styles.cifra} ${styles.cifraTitular}`}>{miles(datos.pendientes)}</span>
                        <span className={styles.titularTexto}>
                            recibieron su invitación y siguen<br />sin confirmar ni rechazar
                        </span>
                    </div>

                    <div className={styles.filas}>
                        {filasNoResponden.map(fila => (
                            <div
                                className={`${styles.filaBarra} ${fila.destacada ? styles.filaBarraDestacada : ''}`}
                                key={fila.label}
                            >
                                <div className={styles.filaBarraHead}>
                                    <Punto color={fila.color} />
                                    <span className={styles.filaBarraNombre}>{fila.label}</span>
                                    <b className={styles.filaBarraValor}>{miles(fila.valor)}</b>
                                </div>
                                <span className={styles.pista}>
                                    <span
                                        className={styles.relleno}
                                        style={{ width: `${(fila.valor / maximoFila) * 100}%`, background: fila.color }}
                                    />
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* ------------------------------------------------ fila 2 --- */}
            <div className={`${styles.fila} ${styles.filaAnchaDer}`}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Cobertura del recordatorio</h2>
                        <span className={styles.cardSub}>
                            {miles(recordatorios.enviados)} de {miles(base)}
                        </span>
                    </header>

                    <div className={styles.cobertura}>
                        <div className={styles.donaCobertura}>
                            <Dona
                                cutout='72%'
                                tooltip={tooltipBase(tokens, entero)}
                                segmentos={[
                                    { label: 'Con recordatorio', valor: recordatorios.enviados, color: MARCA.navy },
                                    { label: 'Sin recordatorio', valor: base - recordatorios.enviados, color: MARCA.crema },
                                ]}
                            />
                            <div className={styles.donaCentro}>
                                <span className={`${styles.cifra} ${styles.cifraCobertura}`}>
                                    {pct(recordatorios.enviados, base)}%
                                </span>
                                <span className={styles.donaPieClaro}>con recordatorio</span>
                            </div>
                        </div>

                        <div className={styles.coberturaLista}>
                            <div className={styles.coberturaFila}>
                                <Punto color={MARCA.navy} />
                                <span>Con recordatorio</span>
                                <b>{miles(recordatorios.enviados)}</b>
                            </div>
                            <div className={styles.coberturaFila}>
                                <Punto color={MARCA.crema} />
                                <span>Sin recordatorio</span>
                                <b>{miles(base - recordatorios.enviados)}</b>
                            </div>
                            <span className={styles.nota}>
                                {miles(recordatorios.sinRecordatorio)} de los que no responden nunca recibieron
                                uno: ahí está el margen.
                            </span>
                        </div>
                    </div>
                </section>

                <section className={`${styles.card} ${styles.cardResultado}`}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>
                            Resultado de {recordatorios.enviados === 1
                                ? 'el recordatorio'
                                : `los ${miles(recordatorios.enviados)} recordatorios`}
                        </h2>
                        {recordatorios.enviados > 0 && (
                            <span className={styles.pastilla}>
                                {Math.round(pctMovieron / 10)} de cada 10 se movieron
                            </span>
                        )}
                    </header>

                    <div className={styles.dupla}>
                        <div className={styles.duplaItem}>
                            <span className={`${styles.cifra} ${styles.cifraDupla}`}>{miles(recordatorios.movieron)}</span>
                            <span className={styles.duplaTexto}>respondieron tras el recordatorio</span>
                        </div>
                        <div className={styles.duplaItem}>
                            <span className={`${styles.cifra} ${styles.cifraDupla}`}>{miles(siguenSinResponder)}</span>
                            <span className={styles.duplaTexto}>con recordatorio y aún sin responder</span>
                        </div>
                    </div>

                    {recordatorios.enviados > 0 && (
                        <div className={styles.resultado}>
                            <div className={styles.resultadoBarra}>
                                {recordatorios.movieron > 0 && (
                                    <span className={styles.resultadoNavy} style={{ flex: recordatorios.movieron }}>
                                        {pctMovieron}%
                                    </span>
                                )}
                                {siguenSinResponder > 0 && (
                                    <span className={styles.resultadoLila} style={{ flex: siguenSinResponder }}>
                                        {100 - pctMovieron}%
                                    </span>
                                )}
                            </div>
                            <div className={styles.leyenda}>
                                <span><Punto color={MARCA.navy} />ya respondieron</span>
                                <span><Punto color={MARCA.lila} />siguen sin responder</span>
                            </div>
                        </div>
                    )}

                    <p className={styles.pie}>
                        No es comparable con el resto: el recordatorio solo se manda a invitados que ya iban
                        tarde.
                    </p>
                </section>
            </div>
        </div>
    )
}
