/*
  Piezas de gráfica compartidas por las etapas de la analítica.

  Nacieron en Respuestas y en Mesas por separado, con el mismo chrome escrito
  dos veces: mismo eje, mismo tooltip, mismos radios. Están aquí para que las
  dos pantallas no se separen con el tiempo, no por ahorrar líneas.

  Todas dejan el alto en manos de quien las usa: una gráfica de tres filas y
  una de seis no pueden medir lo mismo, y forzar un alto fijo deja aire muerto
  en la corta y aprieta la larga.
*/

import { Bar, Chart, Doughnut } from 'react-chartjs-2'
import { ejeTexto, opcionesBase, tooltipBase, useTokens } from '../adminCharts'
import styles from './EventosAnalitica.module.css'

const miles = (n) => new Intl.NumberFormat('es-MX').format(n)

// Donut con el número en HTML encima, no dibujado en el canvas: así hereda la
// tipografía del panel y se lee nítido sin depender del devicePixelRatio.
export const Rosca = ({ segmentos, valor, pie, alto = 190 }) => (
    <div className={styles.rosca} style={{ height: alto }}>
        <Doughnut
            data={{
                labels: segmentos.map(s => s.label),
                datasets: [{
                    data: segmentos.map(s => s.valor),
                    backgroundColor: segmentos.map(s => s.color),
                    borderWidth: 0,
                    hoverOffset: 0,
                }],
            }}
            options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
            }}
        />
        <div className={styles.roscaCentro}>
            <span className={styles.roscaValor}>{valor}</span>
            <span className={styles.roscaPie}>{pie}</span>
        </div>
    </div>
)

export const Leyenda = ({ entradas }) => (
    <ul className={styles.leyendaChips}>
        {entradas.map(entrada => (
            <li className={styles.leyendaChip} key={entrada.label}>
                <span className={styles.leyendaPunto} style={{ background: entrada.color }} />
                {entrada.label}
            </li>
        ))}
    </ul>
)

/*
  Barras con un color por fila. El color no es decoración: dice en qué estado
  está cada fila (sentaron gente / la dejaron vacía / sin dato), que es
  información que la longitud de la barra no puede dar.

  `horizontal` por defecto porque casi siempre las etiquetas son nombres de
  evento y en vertical se acaban rotando.
*/
export const BarrasCategoria = ({
    filas, alto, maximo, horizontal = true, formato = miles, sufijo = '', paso,
}) => {
    const tokens = useTokens()

    const ejeValor = {
        beginAtZero: true,
        max: maximo,
        border: { display: false },
        grid: { color: tokens.grid, drawTicks: false },
        ticks: {
            ...ejeTexto(tokens),
            stepSize: paso,
            // Sin tope, un eje de porcentajes saca once marcas y el 0-100 se
            // vuelve una regla graduada que nadie lee.
            maxTicksLimit: 6,
            precision: 0,
            callback: (v) => `${formato(v)}${sufijo}`,
        },
    }

    const ejeCategoria = {
        border: { display: false },
        grid: { display: false },
        ticks: ejeTexto(tokens),
    }

    return (
        <div className={styles.chartFlexible} style={{ height: alto }}>
            <Bar
                data={{
                    labels: filas.map(f => f.nombre),
                    datasets: [{
                        data: filas.map(f => f.valor),
                        backgroundColor: filas.map(f => f.color),
                        hoverBackgroundColor: filas.map(f => f.color),
                        borderRadius: 5,
                        borderSkipped: false,
                        maxBarThickness: horizontal ? 18 : 54,
                    }],
                }}
                options={{
                    ...opcionesBase,
                    indexAxis: horizontal ? 'y' : 'x',
                    layout: { padding: { right: horizontal ? 6 : 0 } },
                    scales: horizontal
                        ? { x: ejeValor, y: ejeCategoria }
                        : { x: ejeCategoria, y: ejeValor },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...tooltipBase(tokens),
                            callbacks: {
                                label: (ctx) => {
                                    const valor = horizontal ? ctx.parsed.x : ctx.parsed.y
                                    return `${formato(valor)}${sufijo}`
                                },
                            },
                        },
                    },
                }}
            />
        </div>
    )
}

/*
  Barras apiladas horizontales con eje. Con eje y no como track de HTML porque
  aquí la magnitud importa: dos barras normalizadas al 100% esconden que una
  categoría tiene cuatro veces el volumen de la otra.
*/
export const BarrasApiladas = ({ labels, series, alto, maximo, sufijo = '', paso }) => {
    const tokens = useTokens()

    return (
        <div className={styles.chartFlexible} style={{ height: alto }}>
            <Bar
                data={{
                    labels,
                    datasets: series.map((serie, i) => ({
                        label: serie.label,
                        data: serie.valores,
                        backgroundColor: serie.color,
                        hoverBackgroundColor: serie.color,
                        borderRadius: i === series.length - 1
                            ? { topLeft: 0, topRight: 5, bottomLeft: 0, bottomRight: 5 }
                            : { topLeft: 5, topRight: 0, bottomLeft: 5, bottomRight: 0 },
                        borderSkipped: false,
                        maxBarThickness: 26,
                    })),
                }}
                options={{
                    ...opcionesBase,
                    indexAxis: 'y',
                    scales: {
                        x: {
                            stacked: true,
                            beginAtZero: true,
                            max: maximo,
                            border: { display: false },
                            grid: { color: tokens.grid, drawTicks: false },
                            ticks: {
                                ...ejeTexto(tokens),
                                stepSize: paso,
                                maxTicksLimit: 6,
                                callback: (v) => `${miles(v)}${sufijo}`,
                            },
                        },
                        y: {
                            stacked: true,
                            border: { display: false },
                            grid: { display: false },
                            ticks: ejeTexto(tokens),
                        },
                    },
                    plugins: {
                        legend: { display: false },
                        // Los tramos en cero no aportan un renglón; el total de
                        // la barra sí, y va en el título para poder leer cada
                        // parte contra él.
                        tooltip: {
                            ...tooltipBase(tokens),
                            filter: (ctx) => ctx.parsed.x > 0,
                            callbacks: {
                                title: (items) => {
                                    const total = items.reduce((acc, i) => acc + i.parsed.x, 0)
                                    return items[0].label
                                        ? `${items[0].label} · ${miles(total)}${sufijo}`
                                        : `${miles(total)}${sufijo}`
                                },
                                label: (ctx) => `${ctx.dataset.label}: ${miles(ctx.parsed.x)}${sufijo}`,
                            },
                        },
                    },
                }}
            />
        </div>
    )
}

/*
  Pareto: barras más la curva de acumulado. La barra contesta "cuántos hay
  aquí" y la línea "cuántos llevo ya" — son dos preguntas distintas y por eso
  van en dos ejes.

  `colores` pinta cada barra por separado cuando el color dice algo (los dos
  eventos que concentran, el cajón de "Otros"). Sin él cae al par
  color/colorSuave, donde el último tramo va destinado: en los histogramas de
  tiempo el último cajón es "más de 7 días" o "más de 3 meses" y no es un
  intervalo comparable con los otros.
*/
export const BarrasConAcumulado = ({
    histograma, acumulado, color, colorSuave, unidad, colores,
    horizontal = false, onSeleccion,
}) => {
    const tokens = useTokens()
    const ultimo = histograma.length - 1
    const deLaBarra = (i) => colores?.[i] ?? (i === ultimo ? colorSuave : color)

    const ejeCategoria = {
        border: { display: false },
        grid: { display: false },
        ticks: ejeTexto(tokens),
    }

    const ejeConteo = {
        beginAtZero: true,
        border: { display: false },
        grid: { color: tokens.grid, drawTicks: false },
        ticks: { ...ejeTexto(tokens), precision: 0, maxTicksLimit: 5 },
    }

    // El acumulado siempre llega a 100: fijar el tope evita que chart.js
    // reescale el eje y la curva parezca más plana de lo que es.
    const ejePorcentaje = (posicion) => ({
        position: posicion,
        beginAtZero: true,
        max: 100,
        border: { display: false },
        grid: { display: false },
        ticks: { ...ejeTexto(tokens), stepSize: 25, callback: (v) => `${v}%` },
    })

    return (
        <div className={styles.chartTiempo}>
            <Chart
                type='bar'
                data={{
                    labels: histograma.map(h => h.label),
                    datasets: [
                        {
                            type: 'line',
                            label: 'Acumulado',
                            data: acumulado,
                            [horizontal ? 'xAxisID' : 'yAxisID']: horizontal ? 'x1' : 'y1',
                            borderColor: tokens.ink,
                            backgroundColor: tokens.ink,
                            borderWidth: 1.8,
                            tension: 0.25,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            pointBackgroundColor: tokens.ink,
                            order: 0,
                        },
                        {
                            type: 'bar',
                            label: unidad,
                            data: histograma.map(h => h.total),
                            [horizontal ? 'xAxisID' : 'yAxisID']: horizontal ? 'x' : 'y',
                            backgroundColor: histograma.map((_, i) => deLaBarra(i)),
                            hoverBackgroundColor: histograma.map((_, i) => deLaBarra(i)),
                            borderColor: histograma.map((_, i) => (
                                !colores && i === ultimo ? color : 'transparent'
                            )),
                            borderWidth: horizontal
                                ? { top: 1.5, right: 1.5, bottom: 1.5, left: 0 }
                                : { top: 1.5, right: 1.5, bottom: 0, left: 1.5 },
                            borderRadius: horizontal
                                ? { topLeft: 0, topRight: 5, bottomLeft: 0, bottomRight: 5 }
                                : { topLeft: 5, topRight: 5, bottomLeft: 0, bottomRight: 0 },
                            borderSkipped: false,
                            maxBarThickness: horizontal ? 18 : 40,
                            order: 1,
                        },
                    ],
                }}
                options={{
                    ...opcionesBase,
                    indexAxis: horizontal ? 'y' : 'x',
                    onClick: onSeleccion
                        ? (_evento, elementos) => {
                            const punto = elementos.find(el => el.datasetIndex === 1) ?? elementos[0]
                            if (punto) onSeleccion(histograma[punto.index].label)
                        }
                        : undefined,
                    scales: horizontal
                        ? { y: ejeCategoria, x: ejeConteo, x1: ejePorcentaje('top') }
                        : { x: ejeCategoria, y: ejeConteo, y1: ejePorcentaje('right') },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...tooltipBase(tokens),
                            callbacks: {
                                label: (ctx) => {
                                    const esLinea = ctx.dataset.type === 'line'
                                    const valor = horizontal ? ctx.parsed.x : ctx.parsed.y
                                    return esLinea
                                        ? `${valor}% acumulado`
                                        : `${miles(valor)} ${unidad}`
                                },
                            },
                        },
                    },
                }}
            />
        </div>
    )
}
