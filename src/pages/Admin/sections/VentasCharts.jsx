/*
  Gráficas del bento de Ventas, sobre chart.js (react-chartjs-2).

  Antes eran SVG inline dibujados a mano. Se migraron a chart.js para tener
  tooltips al pasar el mouse — el mock no los incluía y quedaban "a criterio del
  implementador", pero sin ellos las series no se pueden leer punto a punto.

  Los ejes de chart.js van ocultos a propósito: las etiquetas de mes/día se
  siguen pintando en HTML desde IngresosSection para conservar la tipografía y
  el espaciado del diseño. Las `labels` sí se cargan en el dataset porque son
  las que alimentan el título del tooltip.
*/

import { Bar, Line } from 'react-chartjs-2'
import { MESES, formatCurrency } from '../ventasCalculos'
import { COLOR_POR_ANIO, MARCA, ejeYOculto, opcionesBase, tooltipBase, tooltipOscuro, useTokens } from '../adminCharts'
import styles from './VentasSection.module.css'

const MESES_CORTOS = MESES.map(m => m.slice(0, 3))

// Años encimados con la paleta de marca: el actual en navy, el previo en lila
// y el más viejo en verde punteado. Sobre el hero oscuro: lila, verde y
// blanco translúcido punteado.
const ESTILO_SERIE = {
    actual: { ...COLOR_POR_ANIO.actual, width: 2.4, dash: undefined },
    previo: { ...COLOR_POR_ANIO.previo, width: 1.8, dash: undefined },
    viejo: { ...COLOR_POR_ANIO.viejo, width: 1.8, dash: [5, 5] },
}


// ------------------------------------------------------- proyección anual ---

// Acepta varias series para poder encimar años. El área solo se rellena cuando
// hay una sola: dos rellenos superpuestos se ensucian y no se lee ninguno.
export const ProyeccionChart = ({ series, labels }) => {
    const tokens = useTokens()
    const unaSola = series.length === 1

    return (
        <div className={styles.sparkline}>
            <Line
                data={{
                    labels,
                    datasets: series.map(serie => {
                        const estilo = ESTILO_SERIE[serie.estilo] ?? ESTILO_SERIE.previo
                        const color = estilo.color

                        return {
                            label: String(serie.anio),
                            data: Array.from({ length: labels.length }, (_, i) =>
                                i < serie.valores.length ? serie.valores[i] : null),
                            borderColor: color,
                            backgroundColor: unaSola ? MARCA.lilaRelleno : color,
                            borderWidth: estilo.width,
                            borderDash: estilo.dash,
                            fill: unaSola,
                            tension: 0.25,
                            spanGaps: false,
                            pointRadius: 0,
                            pointHoverRadius: 4,
                            pointHoverBorderColor: tokens.surface,
                            pointHoverBorderWidth: 2,
                        }
                    }),
                }}
                options={{
                    ...opcionesBase,
                    scales: { x: { display: false }, y: ejeYOculto(tokens) },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...tooltipBase(tokens),
                            callbacks: {
                                label: (ctx) => ctx.parsed.y === null
                                    ? null
                                    : `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
                            },
                        },
                    },
                }}
            />
        </div>
    )
}

// ------------------------------------------------- acumulado del mes + meta ---

// Acepta varias series para encimar años, más la línea de meta. Igual que en la
// proyección, el área solo se rellena cuando hay una sola serie.
// `oscuro`: versión para el hero navy de Ventas (lila / verde / blanco, grid
// y meta en blanco translúcido, tooltip blanco).
export const AcumuladoChart = ({ series, meta, labels, oscuro = false }) => {
    const tokens = useTokens()
    const unaSola = series.length === 1

    const datasets = series.map(serie => {
        const estilo = ESTILO_SERIE[serie.estilo] ?? ESTILO_SERIE.previo
        const color = oscuro ? estilo.oscuro : estilo.color

        return {
            label: String(serie.anio),
            data: Array.from({ length: labels.length }, (_, i) =>
                i < serie.valores.length ? serie.valores[i] : null),
            borderColor: color,
            backgroundColor: unaSola ? (oscuro ? MARCA.lilaRellenoSuave : MARCA.navyRelleno) : color,
            borderWidth: serie.estilo === 'actual' && oscuro ? 2.5 : estilo.width,
            borderDash: estilo.dash,
            fill: unaSola,
            tension: 0.15,
            spanGaps: false,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBorderColor: oscuro ? MARCA.navy : tokens.surface,
            pointHoverBorderWidth: 2,
            order: 1,
        }
    })

    if (meta > 0) {
        datasets.push({
            label: 'Meta',
            data: labels.map(() => meta),
            borderColor: oscuro ? MARCA.oscuroMeta : MARCA.contraste,
            borderWidth: oscuro ? 1.4 : 1.6,
            borderDash: [6, 6],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            order: 0,
        })
    }

    return (
        <div className={styles.chartArea}>
            <Line
                data={{ labels, datasets }}
                options={{
                    ...opcionesBase,
                    scales: {
                        x: { display: false },
                        y: oscuro
                            ? { ...ejeYOculto(tokens), grid: { color: MARCA.oscuroGrid, drawTicks: false } }
                            : ejeYOculto(tokens),
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...(oscuro ? tooltipOscuro(tokens) : tooltipBase(tokens)),
                            callbacks: {
                                label: (ctx) => ctx.parsed.y === null
                                    ? null
                                    : `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
                            },
                        },
                    },
                }}
            />
        </div>
    )
}

// ------------------------------------------------------- comparativa anual ---

export const ComparativaChart = ({ series }) => {
    const tokens = useTokens()

    return (
        <div className={styles.chartCompare}>
            <Line
                data={{
                    labels: MESES_CORTOS,
                    datasets: series.map(serie => {
                        const estilo = ESTILO_SERIE[serie.estilo] ?? ESTILO_SERIE.previo
                        const color = estilo.color
                        // El año en curso va más grueso y con relleno lila.
                        const actual = serie.estilo === 'actual'

                        return {
                            label: String(serie.anio),
                            // Se rellena a 12 con null: el año en curso llega
                            // recortado y `spanGaps: false` corta la línea ahí
                            // en vez de dibujar ceros de meses futuros.
                            data: Array.from({ length: 12 }, (_, i) =>
                                i < serie.valores.length ? serie.valores[i] : null),
                            borderColor: color,
                            backgroundColor: actual ? 'rgba(209, 190, 221, 0.35)' : color,
                            borderWidth: actual ? 2.6 : 2,
                            borderDash: estilo.dash,
                            fill: actual ? 'origin' : false,
                            tension: 0.3,
                            spanGaps: false,
                            pointRadius: 0,
                            pointHoverRadius: 4,
                            pointHoverBorderColor: tokens.surface,
                            pointHoverBorderWidth: 2,
                        }
                    }),
                }}
                options={{
                    ...opcionesBase,
                    scales: { x: { display: false }, y: ejeYOculto(tokens) },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...tooltipBase(tokens),
                            callbacks: {
                                // Un mes sin dato de ese año no debe aparecer en
                                // el tooltip como "$0".
                                label: (ctx) => ctx.parsed.y === null
                                    ? null
                                    : `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
                            },
                        },
                    },
                }}
            />
        </div>
    )
}

// ------------------------------------------------------------ barras/mes ---

// El mock pone el número encima de cada barra; chart.js no lo hace de fábrica.
// Con varios años las barras se agrupan y quedan muy angostas: ahí los números
// se encimarían, así que solo se dibujan cuando hay un año seleccionado.
const etiquetasSobreBarras = {
    id: 'etiquetasSobreBarras',
    afterDatasetsDraw(chart, _args, opciones) {
        if (chart.data.datasets.length !== 1) return

        const { ctx } = chart
        ctx.save()
        ctx.font = '600 11px Poppins'
        ctx.fillStyle = opciones?.color ?? '#1C3249'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'

        chart.getDatasetMeta(0).data.forEach((barra, i) => {
            const valor = chart.data.datasets[0].data[i]
            if (!valor) return
            ctx.fillText(String(valor), barra.x, barra.y - 5)
        })

        ctx.restore()
    },
}

// Un año: barras lila con el mes en curso en navy. Varios años: un color por
// año (navy / lila / verde).
export const BarrasPorMes = ({ series }) => {
    const tokens = useTokens()
    const mesActual = new Date().getMonth()
    const anioActual = new Date().getFullYear()

    return (
        <div className={styles.bars}>
            <Bar
                data={{
                    labels: MESES_CORTOS,
                    datasets: series.map(serie => {
                        const estilo = ESTILO_SERIE[serie.estilo] ?? ESTILO_SERIE.previo
                        const color = series.length === 1
                            ? serie.valores.map((_, i) => (serie.anio === anioActual && i === mesActual ? MARCA.navy : MARCA.lila))
                            : estilo.color

                        return {
                            label: String(serie.anio),
                            data: serie.valores,
                            backgroundColor: color,
                            hoverBackgroundColor: color,
                            borderRadius: { topLeft: 5, topRight: 5, bottomLeft: 0, bottomRight: 0 },
                            borderSkipped: false,
                            maxBarThickness: 34,
                        }
                    }),
                }}
                options={{
                    ...opcionesBase,
                    // Con barras agrupadas conviene el modo índice: el tooltip
                    // compara los años del mismo mes de un solo hover.
                    interaction: series.length > 1
                        ? { mode: 'index', intersect: false }
                        : { mode: 'nearest', intersect: true },
                    layout: { padding: { top: 18 } },
                    scales: {
                        x: {
                            border: { display: false },
                            grid: { display: false },
                            ticks: {
                                color: tokens.muted,
                                font: { family: 'Poppins', size: 10 },
                                maxRotation: 0,
                                minRotation: 0,
                                autoSkip: false,
                            },
                        },
                        y: { display: false, beginAtZero: true },
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...tooltipBase(tokens, (v) => `${v} ${v === 1 ? 'venta' : 'ventas'}`),
                            displayColors: series.length > 1,
                        },
                        etiquetasSobreBarras: { color: tokens.ink },
                    },
                }}
                plugins={[etiquetasSobreBarras]}
            />
        </div>
    )
}

export { MESES_CORTOS }
