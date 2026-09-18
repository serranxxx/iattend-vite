/*
  Analítica de producto — Evento promedio.

  No es una etapa del roadmap: es el retrato de cómo es un evento de I attend
  hoy, armado cruzando lo que ya miden las otras pestañas.

  Tres decisiones que lo sostienen:

  · Se usa MEDIANA, no promedio. Un evento con 417 invitados junto a otro con 12
    da un promedio que no describe a ninguno de los dos.

  · La ventana por defecto son los últimos seis meses, porque la pregunta es
    cómo es el cliente HOY. Con un solo mes quedan cuatro eventos y una mediana
    sobre eso no es un retrato, es una anécdota.

  · Cada número lleva su muestra. Con 25 eventos en la ventana, unas cosas se
    miden sobre los 25 y otras sobre 9; presentarlas con la misma seguridad
    sería mentir. Por debajo de `MUESTRA_MINIMA` el dato se marca.
*/

import { useEffect, useMemo, useState } from 'react'
import {
    ETIQUETA_TIPO, MUESTRA_MINIMA, VENTANAS, acumuladoDe, esAtajoDeLia, esMesaReal,
    masComun, mediana, temaDePregunta, ubicacionesDe,
} from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import { Bar } from 'react-chartjs-2'
import { ejeTexto, opcionesBase, tooltipBase, useTokens } from '../adminCharts'
import { BarrasApiladas, BarrasConAcumulado, Leyenda } from './AnaliticaPiezas'
import styles from './EventosAnalitica.module.css'

const MS_POR_DIA = 86_400_000

const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`
const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const miles = (n) => new Intl.NumberFormat('es-MX').format(n)

const enMeses = (dias) => {
    if (dias === null) return '—'
    if (dias < 45) return plural(dias, 'día', 'días')
    return `${Math.round(dias / 30)} meses`
}

// Fecha del evento como día de calendario; ver `fechaDeEvento` en adminConstants.
const diaDelEvento = (invitacion) => (invitacion?.event_date
    ? new Date(String(invitacion.event_date).slice(0, 10))
    : null)

// ------------------------------------------------------------------ datos ---

const useRetrato = (invitacionesReales, ventana) => {
    const [crudo, setCrudo] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelado = false

        Promise.all([
            traerTodo('guests', 'id,invitation_id,state'),
            traerTodo('invitation_message_dispatches', 'invitation_id,guest_id,status,created_at'),
            traerTodo('tables', 'invitation_id,size'),
            traerTodo('side_events', 'invitation_id'),
            traerTodo('ai_conversations', 'invitation_id,role,content'),
        ])
            .then(([invitados, envios, mesas, sides, conversaciones]) => {
                if (!cancelado) setCrudo({ invitados, envios, mesas, sides, conversaciones })
            })
            .catch(fallo => {
                console.error('Error al armar el retrato:', fallo)
                if (!cancelado) setError(fallo.message)
            })

        return () => { cancelado = true }
    }, [])

    return useMemo(() => {
        if (error) return { error }
        if (!crudo) return { cargando: true }

        const meses = VENTANAS.find(v => v.key === ventana)?.meses ?? null
        const corte = meses ? new Date() : null
        if (corte) corte.setMonth(corte.getMonth() - meses)

        const eventos = invitacionesReales.filter(i => !corte || new Date(i.created_at) >= corte)

        if (eventos.length === 0) return { vacio: true }

        const ids = new Set(eventos.map(i => i.id))
        const porId = new Map(eventos.map(i => [i.id, i]))

        // --- quién es ---
        const plan = masComun(eventos.map(i => String(i.plan ?? '').toUpperCase()))
        const tipo = masComun(eventos.map(i => ETIQUETA_TIPO[i.label] ?? i.label))
        const ciudad = masComun(eventos.flatMap(i => ubicacionesDe(i).map(u => u.ciudad)))

        // --- cuándo compra ---
        const anticipacion = eventos
            .map(i => {
                const evento = diaDelEvento(i)
                return evento ? Math.round((evento - new Date(i.created_at)) / MS_POR_DIA) : null
            })
            .filter(d => d !== null && d >= 0)

        // --- cuánta gente invita ---
        const invitadosPorEvento = new Map()
        const confirmadosPorEvento = new Map()

        crudo.invitados.forEach(g => {
            if (!ids.has(g.invitation_id)) return
            invitadosPorEvento.set(g.invitation_id, (invitadosPorEvento.get(g.invitation_id) ?? 0) + 1)
            if (['confirmado', 'asistente'].includes(g.state)) {
                confirmadosPorEvento.set(g.invitation_id, (confirmadosPorEvento.get(g.invitation_id) ?? 0) + 1)
            }
        })

        const listas = [...invitadosPorEvento.values()]

        // La tasa de confirmación solo tiene sentido con una lista de tamaño
        // razonable: 1 de 2 confirmados es 50% y no dice nada.
        const tasas = [...invitadosPorEvento.entries()]
            .filter(([, total]) => total >= 10)
            .map(([id, total]) => Math.round(((confirmadosPorEvento.get(id) ?? 0) / total) * 100))

        // --- cuándo envía ---
        const primerEnvio = new Map()

        crudo.envios.forEach(e => {
            if (!ids.has(e.invitation_id) || e.status === 'failed') return
            const momento = new Date(e.created_at)
            const previo = primerEnvio.get(e.invitation_id)
            if (!previo || momento < previo) primerEnvio.set(e.invitation_id, momento)
        })

        // Los dos tiempos se miden sobre el MISMO grupo —los que enviaron y
        // tienen fecha— para que la línea de tiempo cuadre consigo misma.
        const conEnvio = [...primerEnvio.entries()]
            .map(([id, momento]) => {
                const invitacion = porId.get(id)
                const evento = diaDelEvento(invitacion)
                if (!evento) return null

                return {
                    trasComprar: Math.round((momento - new Date(invitacion.created_at)) / MS_POR_DIA),
                    antesDelEvento: Math.round((evento - momento) / MS_POR_DIA),
                }
            })
            .filter(Boolean)

        // --- qué del producto usa ---
        const mesasPorEvento = new Map()
        crudo.mesas.filter(esMesaReal).forEach(m => {
            if (!ids.has(m.invitation_id)) return
            mesasPorEvento.set(m.invitation_id, (mesasPorEvento.get(m.invitation_id) ?? 0) + 1)
        })

        const sidesPorEvento = new Map()
        crudo.sides.forEach(se => {
            if (!ids.has(se.invitation_id)) return
            sidesPorEvento.set(se.invitation_id, (sidesPorEvento.get(se.invitation_id) ?? 0) + 1)
        })

        // --- qué le pregunta a Lia ---
        // Un clic en un chip de la interfaz no es una duda: si se contara
        // junto con lo escrito a mano, "Mis notificaciones" saldría como la
        // pregunta más frecuente del producto. Abrir Lia y escribirle se
        // miden por separado.
        const abrenLia = new Set()
        const escritasPorEvento = new Map()
        const temas = new Map()

        crudo.conversaciones
            .filter(c => c.role === 'user' && ids.has(c.invitation_id))
            .forEach(c => {
                abrenLia.add(c.invitation_id)
                if (esAtajoDeLia(c.content)) return

                escritasPorEvento.set(c.invitation_id, (escritasPorEvento.get(c.invitation_id) ?? 0) + 1)
                const tema = temaDePregunta(c.content)
                if (tema) temas.set(tema, (temas.get(tema) ?? 0) + 1)
            })

        const temasOrdenados = [...temas.entries()]
            .map(([tema, total]) => ({ tema, total }))
            .sort((a, b) => b.total - a.total)

        return {
            eventos: eventos.length,
            plan,
            tipo,
            ciudad,
            compra: { dias: mediana(anticipacion), muestra: anticipacion.length },
            invitados: { mediana: mediana(listas), muestra: listas.length, maximo: Math.max(0, ...listas) },
            confirmacion: { pct: mediana(tasas), muestra: tasas.length },
            envio: {
                trasComprar: mediana(conEnvio.map(e => e.trasComprar)),
                antesDelEvento: mediana(conEnvio.map(e => e.antesDelEvento)),
                muestra: conEnvio.length,
            },
            mesas: { usan: mesasPorEvento.size, mediana: mediana([...mesasPorEvento.values()]) },
            sides: { usan: sidesPorEvento.size, mediana: mediana([...sidesPorEvento.values()]) },
            lia: {
                usan: abrenLia.size,
                escriben: escritasPorEvento.size,
                mediana: mediana([...escritasPorEvento.values()]),
                temas: temasOrdenados,
            },
        }
    }, [crudo, error, invitacionesReales, ventana])
}

// ------------------------------------------------------------ calendario ---

const DIAS_POR_MES = 30

/*
  La vida de un evento en una sola escala: meses ANTES de la fiesta, contando
  hacia atrás. El eje va invertido para que el tiempo corra de izquierda a
  derecha como se lee, con el evento al final.

  Son barras flotantes (cada una con inicio y fin) y no una barra apilada
  porque los dos tramos no comparten origen: uno empieza en la compra y el otro
  en el envío.
*/
const LineaDeTiempo = ({ compraDias, envioDias }) => {
    const tokens = useTokens()

    const compra = compraDias / DIAS_POR_MES
    const envio = envioDias / DIAS_POR_MES

    return (
        <div className={styles.chartFlexible} style={{ height: 150 }}>
            <Bar
                data={{
                    labels: ['Esperando para enviar', 'Invitación en la calle'],
                    datasets: [{
                        data: [[compra, envio], [envio, 0]],
                        backgroundColor: [tokens.morado, tokens.azul],
                        hoverBackgroundColor: [tokens.morado, tokens.azul],
                        borderRadius: 5,
                        borderSkipped: false,
                        maxBarThickness: 26,
                    }],
                }}
                options={{
                    ...opcionesBase,
                    indexAxis: 'y',
                    scales: {
                        x: {
                            reverse: true,
                            min: 0,
                            max: compra,
                            border: { display: false },
                            grid: { color: tokens.grid, drawTicks: false },
                            ticks: {
                                ...ejeTexto(tokens),
                                maxTicksLimit: 9,
                                callback: (v) => (v === 0 ? 'Evento' : `${Math.round(v)} m`),
                            },
                        },
                        y: {
                            border: { display: false },
                            grid: { display: false },
                            ticks: ejeTexto(tokens),
                        },
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...tooltipBase(tokens),
                            callbacks: {
                                label: (ctx) => {
                                    const [desde, hasta] = ctx.raw
                                    return `de ${desde.toFixed(1)} a ${hasta.toFixed(1)} meses antes`
                                },
                            },
                        },
                    },
                }}
            />
        </div>
    )
}

// ----------------------------------------------------------------- panel ---

// Un dato con muestra corta no se esconde, se marca: sigue siendo lo único que
// hay, pero no se presenta con la misma seguridad que el resto.
const Muestra = ({ n, de }) => (
    <span className={`${styles.muestra} ${n < MUESTRA_MINIMA ? styles.muestraCorta : ''}`}>
        {n < MUESTRA_MINIMA ? '⚠ ' : ''}
        {de ? `${n} de ${de}` : plural(n, 'evento', 'eventos')}
    </span>
)

export const AnaliticaPromedio = ({ invitacionesReales }) => {
    const [ventana, setVentana] = useState('6')
    const datos = useRetrato(invitacionesReales, ventana)
    const tokens = useTokens()

    const chips = (
        <div className={styles.chipGrupo}>
            {VENTANAS.map(({ key, label }) => (
                <button
                    key={key}
                    type='button'
                    className={`${styles.chip} ${ventana === key ? styles.chipActivo : ''}`}
                    onClick={() => setVentana(key)}
                >
                    {label}
                </button>
            ))}
        </div>
    )

    if (datos.cargando) return <div className={styles.empty}>Armando el retrato…</div>
    if (datos.error) return <div className={styles.empty}>No se pudo armar: {datos.error}</div>

    if (datos.vacio) {
        return (
            <div className={styles.analitica}>
                <div className={styles.chips}>{chips}</div>
                <div className={styles.empty}>No hay eventos creados en esta ventana.</div>
            </div>
        )
    }

    const { plan, tipo, ciudad, compra, invitados, confirmacion, envio, mesas, sides, lia } = datos
    const temaPrincipal = lia.temas[0]
    const escritas = lia.temas.reduce((acc, t) => acc + t.total, 0)

    // Cuánto de la muestra comparte cada rasgo del retrato. Un retrato armado
    // con cuatro medianas puede no describir a nadie en concreto; esto dice
    // qué tan de verdad es típico cada trazo.
    const rasgos = [
        { nombre: tipo?.valor ?? 'Tipo', pct: tipo?.porcentaje ?? 0 },
        { nombre: plan ? `Plan ${plan.valor}` : 'Plan', pct: plan?.porcentaje ?? 0 },
        { nombre: ciudad?.valor ?? 'Sede', pct: ciudad?.porcentaje ?? 0 },
        { nombre: 'Tiene lista', pct: pct(invitados.muestra, datos.eventos) },
    ]

    const modulos = [
        { nombre: 'Side events', usan: sides.usan },
        { nombre: 'Lia', usan: lia.usan },
        { nombre: 'Acomodo de mesas', usan: mesas.usan },
    ].sort((a, b) => b.usan - a.usan)

    // Pareto de temas. "Otros" en gris porque no es un tema: es lo que la lista
    // de patrones no supo clasificar.
    const rangoReal = (tema, i) => lia.temas.slice(0, i).filter(t => t.tema !== 'Otros').length
    const colorDeTema = (tema, i) => {
        if (tema.tema === 'Otros') return tokens.grid
        return rangoReal(tema, i) < 2 ? tokens.azul : tokens.azulMedio
    }

    const filasDeTemas = lia.temas.map(t => ({ label: t.tema, total: t.total }))
    const acumuladoTemas = acumuladoDe(filasDeTemas, escritas)

    return (
        <div className={styles.analitica}>
            <div className={styles.chips}>
                <span className={styles.filtroEtiqueta}>
                    Eventos creados en los últimos
                </span>
                {chips}
                <span className={styles.filtroEtiqueta}>
                    · {plural(datos.eventos, 'evento', 'eventos')}
                </span>
            </div>

            {/* El retrato en una frase: los mismos números de abajo, dichos como
                se los contarías a alguien. */}
            <section className={styles.retratoOscuro}>
                <span className={styles.retratoEtiqueta}>
                    El retrato de los {datos.eventos} eventos
                </span>
                <p className={styles.retratoTexto}>
                    Una <b>{tipo?.valor ?? 'celebración'}</b>
                    {plan && <> con plan <b>{plan.valor}</b></>}
                    {ciudad && <> en <b>{ciudad.valor}</b></>}
                    , que se vendió <b>{enMeses(compra.dias)}</b> antes del evento
                    {invitados.mediana !== null && <>, con <b>{miles(invitados.mediana)} invitados</b></>}
                    {envio.antesDelEvento !== null && (
                        <>. Manda sus invitaciones <b>{enMeses(envio.trasComprar)}</b> después de comprar
                        y <b>{enMeses(envio.antesDelEvento)}</b> antes de la fiesta</>
                    )}
                    {confirmacion.pct !== null && (
                        <>, y consigue <b className={styles.retratoVerde}>{confirmacion.pct}% de confirmación</b></>
                    )}
                    .
                </p>
            </section>

            <div className={`${styles.bento} ${styles.bentoPar}`}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Qué tan típico es el típico</h2>
                            <p className={styles.cardSub}>
                                Qué parte de los {datos.eventos} eventos comparte cada rasgo del retrato
                            </p>
                        </div>
                    </header>

                    <BarrasApiladas
                        alto={34 + rasgos.length * 40}
                        maximo={100}
                        paso={25}
                        sufijo='%'
                        labels={rasgos.map(r => r.nombre)}
                        series={[
                            {
                                label: 'Comparte el rasgo',
                                color: tokens.azul,
                                valores: rasgos.map(r => r.pct),
                            },
                            {
                                label: 'Es distinto',
                                color: tokens.grid,
                                valores: rasgos.map(r => 100 - r.pct),
                            },
                        ]}
                    />

                    <Leyenda entradas={[
                        { label: 'Comparte el rasgo', color: tokens.azul },
                        { label: 'Es distinto', color: tokens.grid },
                    ]} />

                    <ul className={styles.rasgos}>
                        <li className={styles.rasgo}>
                            <span className={styles.rasgoLabel}>Celebra</span>
                            <span className={styles.rasgoValor}>{tipo?.valor ?? '—'}</span>
                            <span className={styles.rasgoNota}>
                                {tipo ? `${tipo.total} de ${datos.eventos}` : ''}
                            </span>
                        </li>
                        <li className={styles.rasgo}>
                            <span className={styles.rasgoLabel}>Plan</span>
                            <span className={styles.rasgoValor}>{plan?.valor ?? '—'}</span>
                            <span className={styles.rasgoNota}>
                                {plan ? `${plan.total} de ${datos.eventos}` : ''}
                            </span>
                        </li>
                        <li className={styles.rasgo}>
                            <span className={styles.rasgoLabel}>Sede</span>
                            <span className={styles.rasgoValor}>{ciudad?.valor ?? 'sin ubicación'}</span>
                            <span className={styles.rasgoNota}>
                                {ciudad ? `${ciudad.porcentaje}% de las capturadas` : ''}
                            </span>
                        </li>
                        <li className={styles.rasgo}>
                            <span className={styles.rasgoLabel}>Invita a</span>
                            <span className={styles.rasgoValor}>
                                {invitados.mediana !== null ? `${miles(invitados.mediana)} personas` : '—'}
                            </span>
                            <span className={styles.rasgoNota}>
                                <Muestra n={invitados.muestra} de={datos.eventos} /> con lista
                            </span>
                        </li>
                    </ul>

                    <footer className={styles.cardFoot}>
                        El tipo de evento y el plan describen a casi todos. La sede no: solo una parte de
                        los eventos tiene sede capturada, así que ese {ciudad?.porcentaje ?? 0}% es sobre
                        un subconjunto.
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Su calendario</h2>
                            <p className={styles.cardSub}>
                                De la compra a la fiesta, en meses antes del evento
                            </p>
                        </div>
                    </header>

                    {compra.dias !== null && envio.antesDelEvento !== null ? (
                        <LineaDeTiempo compraDias={compra.dias} envioDias={envio.antesDelEvento} />
                    ) : (
                        <div className={styles.vacio}>Sin fechas suficientes para la línea de tiempo.</div>
                    )}

                    <ul className={styles.desglose}>
                        <li className={styles.desgloseItem}>
                            <span className={`${styles.punto} ${styles.puntoAzul}`} />
                            <span className={styles.desgloseNombre}>Compra antes del evento</span>
                            <span className={styles.desgloseValor}>{enMeses(compra.dias)}</span>
                            <Muestra n={compra.muestra} de={datos.eventos} />
                        </li>
                        <li className={styles.desgloseItem}>
                            <span className={`${styles.punto} ${styles.puntoMorado}`} />
                            <span className={styles.desgloseNombre}>Tarda en mandar invitaciones</span>
                            <span className={styles.desgloseValor}>{enMeses(envio.trasComprar)}</span>
                            <Muestra n={envio.muestra} de={datos.eventos} />
                        </li>
                        <li className={`${styles.desgloseItem} ${styles.desgloseLogro}`}>
                            <span className={`${styles.punto} ${styles.puntoVerde}`} />
                            <span className={styles.desgloseNombre}>Confirmación que consigue</span>
                            <span className={styles.desgloseValor}>
                                {confirmacion.pct !== null ? `${confirmacion.pct}%` : '—'}
                            </span>
                            <Muestra n={confirmacion.muestra} de={datos.eventos} />
                        </li>
                    </ul>

                    <footer className={styles.cardFoot}>
                        La invitación pasa {enMeses(envio.antesDelEvento)} en la calle: hay margen de sobra
                        para insistirle a quien no contesta. Cada renglón se calcula sobre los eventos que
                        tienen ese dato, por eso los denominadores cambian.
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Qué del producto usa</h2>
                            <p className={styles.cardSub}>
                                Cuántos de los {datos.eventos} abren cada módulo · y qué tanto arman los
                                que lo abren
                            </p>
                        </div>
                    </header>

                    <BarrasApiladas
                        alto={34 + modulos.length * 40}
                        maximo={datos.eventos}
                        labels={modulos.map(m => m.nombre)}
                        series={[
                            {
                                label: 'Lo abrieron',
                                color: tokens.azul,
                                valores: modulos.map(m => m.usan),
                            },
                            {
                                label: 'Nunca lo abrieron',
                                color: tokens.grid,
                                valores: modulos.map(m => datos.eventos - m.usan),
                            },
                        ]}
                    />

                    <Leyenda entradas={[
                        { label: 'Lo abrieron', color: tokens.azul },
                        { label: 'Nunca lo abrieron', color: tokens.grid },
                    ]} />

                    <div className={styles.trio}>
                        <div className={styles.trioItem}>
                            <span className={styles.trioValor}>{sides.mediana ?? 0}</span>
                            <span className={styles.trioLabel}>
                                {sides.mediana === 1 ? 'side event arma' : 'side events arma'} quien lo abre
                            </span>
                        </div>
                        <div className={styles.trioItem}>
                            <span className={styles.trioValor}>{mesas.mediana ?? 0}</span>
                            <span className={styles.trioLabel}>mesas arma quien abre el acomodo</span>
                        </div>
                        <div className={styles.trioItem}>
                            <span className={styles.trioValor}>{lia.mediana ?? 0}</span>
                            <span className={styles.trioLabel}>dudas le escribe quien abre Lia</span>
                        </div>
                    </div>

                    <footer className={styles.cardFoot}>
                        {modulos[0].nombre} es lo más abierto y lo menos trabajado: uno solo por evento. El
                        acomodo lo abren menos, pero quien entra sí lo arma completo.
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Sus dudas con Lia</h2>
                            <p className={styles.cardSub}>
                                Barras: preguntas escritas · línea: acumulado sobre las {miles(escritas)}
                            </p>
                        </div>
                    </header>

                    {lia.temas.length === 0 ? (
                        <div className={styles.vacio}>Sin preguntas escritas en la ventana elegida.</div>
                    ) : (
                        <>
                            <div className={styles.titular}>
                                <span className={`${styles.titularValor} ${styles.titularAzul}`}>
                                    {pct(temaPrincipal.total, escritas)}%
                                </span>
                                <span className={styles.titularTexto}>
                                    de lo que escribe es sobre {temaPrincipal.tema.toLowerCase()} ·{' '}
                                    {lia.usan} de {datos.eventos} abrieron Lia y {lia.escriben} le
                                    escribieron
                                </span>
                            </div>

                            <BarrasConAcumulado
                                horizontal
                                histograma={filasDeTemas}
                                acumulado={acumuladoTemas}
                                unidad='preguntas'
                                colores={lia.temas.map(colorDeTema)}
                            />
                        </>
                    )}

                    <footer className={styles.cardFoot}>
                        Los chips de la interfaz no cuentan aquí: un clic no es una duda.
                        {lia.temas.some(t => t.tema === 'Otros') && (
                            <> "Otros" son {lia.temas.find(t => t.tema === 'Otros').total} preguntas que la
                            lista de patrones no supo clasificar.</>
                        )}
                    </footer>
                </section>
            </div>
        </div>
    )
}
