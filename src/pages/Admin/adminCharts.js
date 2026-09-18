/*
  Primitivas compartidas de chart.js para el panel de administración.

  Vivían dentro de VentasCharts.jsx, pero la analítica de Eventos necesita el
  mismo chrome (mismos tokens, mismo tooltip, mismos ejes ocultos) y duplicarlo
  garantizaba que las dos pantallas se separaran con el tiempo. Aquí también se
  hace el `register` de chart.js: importar este módulo es suficiente para que
  cualquier gráfica del admin funcione.
*/

import { useMemo } from 'react'
import {
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    DoughnutController,
    Filler,
    Legend,
    LineController,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip as ChartTooltip,
} from 'chart.js'
import { formatCurrency } from './ventasCalculos'

// Los controladores van explícitos: react-chartjs-2 registra el del componente
// que se usa (<Bar/> → BarController), pero una gráfica mixta —barras más una
// línea acumulada en el mismo canvas— necesita los dos, y el que no se declara
// revienta en tiempo de ejecución con "line is not a registered controller".
ChartJS.register(
    LineController, LineElement, PointElement, BarController, BarElement,
    DoughnutController, ArcElement, LinearScale, CategoryScale,
    Filler, Legend, ChartTooltip,
)

// Por defecto chart.js pone el tooltip justo sobre el cursor y tapa el punto que
// se está mirando. Este posicionador lo manda al lado contrario: si el cursor
// está en la mitad izquierda del área, el tooltip sale a la derecha y viceversa.
const SEPARACION_CURSOR = 16

ChartTooltip.positioners.alLado = function (items, posicionEvento) {
    if (!items.length) return false

    const area = this.chart.chartArea
    const haciaLaDerecha = posicionEvento.x < area.left + area.width / 2

    return {
        x: posicionEvento.x + (haciaLaDerecha ? SEPARACION_CURSOR : -SEPARACION_CURSOR),
        y: posicionEvento.y,
        xAlign: haciaLaDerecha ? 'left' : 'right',
        yAlign: 'center',
    }
}

// Las series usan la paleta auxiliar del producto (--[color]-color para el trazo
// y --[color]-bg para el área), no los tokens de marca: los colores de marca son
// para el chrome, y una gráfica necesita tonos saturados que se distingan entre
// sí. El chrome alrededor (títulos, ejes, tooltip) sí sigue en --ac-*.
//
// chart.js necesita colores resueltos, no `var(--*)`, así que se leen del :root.
export const useTokens = () => useMemo(() => {
    const raiz = getComputedStyle(document.documentElement)
    const t = (nombre, fallback) => raiz.getPropertyValue(nombre).trim() || fallback

    return {
        // Serie principal (neto acumulado, año en curso, barras del año actual)
        azul: t('--blue-color', '#008DFF'),
        // Escalón intermedio para escalas de un solo color (1 / 2 / 3 side
        // events). Es el mismo azul al 40%: una rampa de tres tonos del mismo
        // hue se lee como una gradación, y tres hues distintos como tres
        // categorías sin relación entre sí.
        azulMedio: t('--blue-color-40', '#008DFF66'),
        azulBg: t('--blue-bg', '#E5F3FE'),
        // Rolling 12 meses y año previo
        morado: t('--purple-color', '#6D3CFA'),
        moradoBg: t('--purple-bg', '#EFEAFF'),
        // Año más viejo de la comparativa
        verde: t('--green-color', '#37C25C'),
        verdeBg: t('--green-bg', '#E1FAE8'),
        // Acentos extra que solo usa la analítica de eventos
        naranja: t('--orange-color', '#E6961F'),
        naranjaBg: t('--orange-bg', '#FCF4DB'),
        rojo: t('--red-color', '#EC6A5B'),
        rojoBg: t('--red-bg', '#FDEFEE'),
        // Línea de referencia (mismo verde que el total del punto de equilibrio)
        meta: t('--green-color', '#37C25C'),

        // Chrome de la gráfica: sigue en tokens de marca.
        ink: t('--ac-ink', '#1C3249'),
        grid: t('--ac-tint', '#EFF2F4'),
        muted: t('--ac-muted', '#5C6F84'),
        surface: t('--ac-surface', '#FFFFFF'),
    }
}, [])

// Con `mode: 'index'` el tooltip agarra el punto más cercano en X aunque el
// cursor no esté justo encima de la línea.
export const tooltipBase = (tokens, formato = formatCurrency) => ({
    enabled: true,
    position: 'alLado',
    backgroundColor: tokens.ink,
    titleColor: '#FFFFFF',
    bodyColor: '#FFFFFF',
    borderWidth: 0,
    padding: 10,
    cornerRadius: 9,
    displayColors: true,
    boxWidth: 9,
    boxHeight: 9,
    boxPadding: 4,
    titleFont: { family: 'Poppins', size: 12, weight: '600' },
    bodyFont: { family: 'Poppins', size: 12 },
    callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${formato(ctx.parsed.y)}`,
    },
})

// Texto de los ejes visibles. Las gráficas de la analítica que sí muestran eje
// comparten tipografía y tamaño; tenerlo suelto en cada una garantizaba que se
// fueran separando.
export const ejeTexto = (tokens) => ({
    color: tokens.muted,
    font: { family: 'Poppins', size: 10.5 },
})

export const ejeYOculto = (tokens) => ({
    beginAtZero: true,
    border: { display: false },
    grid: { color: tokens.grid, drawTicks: false },
    ticks: { display: false },
})

export const opcionesBase = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false } },
}
