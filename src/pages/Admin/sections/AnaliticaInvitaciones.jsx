/*
  Analítica de producto — Etapa 1: Invitaciones.

  Responde tres preguntas con lo único que la invitación guarda de sí misma:
  cuándo se vendió (`created_at`), cuándo se celebra (`event_date`) y dónde
  (`data.itinerary.object[].address`).

  Las invitaciones de prueba quedan fuera en todos los números: son cuentas
  internas y meterlas movería la estacionalidad sin representar a nadie.
*/

import { useEffect, useMemo, useState } from 'react'
import { Bar, Doughnut, Line, Scatter } from 'react-chartjs-2'
import { Dropdown } from 'antd'
import { ChevronDown, MapPin } from 'lucide-react'
import {
    CREDITOS_INCLUIDOS_PRO, RANGOS_ANTICIPACION, anticipacionEnDias, contarCiudades,
    contarPaises, creditosDeEvento, esPro, mediana, ubicacionesDe,
} from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import { MESES } from '../ventasCalculos'
import { ejeYOculto, opcionesBase, tooltipBase, useTokens } from '../adminCharts'
import styles from './EventosAnalitica.module.css'

const MESES_CORTOS = MESES.map(m => m.slice(0, 3))

// Cuántas ciudades se listan antes de agrupar el resto en "otras".
const CIUDADES_VISIBLES = 6

// Eventos PRO visibles en la lista de consumo; el resto vive en el dropdown.
const CONSUMOS_VISIBLES = 10

const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`


const useDatos = (reales, totales) => useMemo(() => {

    // --- fechas ---
    const ventasPorMes = Array(12).fill(0)
    const eventosPorMes = Array(12).fill(0)

    reales.forEach(i => {
        const venta = new Date(i.created_at)
        if (!Number.isNaN(venta.getTime())) ventasPorMes[venta.getMonth()] += 1
    })

    const conFecha = reales.filter(i => i.event_date)

    conFecha.forEach(i => {
        // El mes se lee del string ISO y no de `new Date`: `event_date` es una
        // fecha sin hora y construir un Date la interpreta en UTC, lo que en
        // México corre el día 1 de un mes al último del anterior.
        const mes = Number(String(i.event_date).slice(5, 7))
        if (mes >= 1 && mes <= 12) eventosPorMes[mes - 1] += 1
    })

    const anticipaciones = conFecha
        .map(anticipacionEnDias)
        .filter(d => d !== null)

    const anticipadas = anticipaciones.filter(d => d >= 0)
    const retroactivas = anticipaciones.filter(d => d < 0)

    const histograma = RANGOS_ANTICIPACION.map(({ label, hasta }, i) => {
        const desde = i === 0 ? 0 : RANGOS_ANTICIPACION[i - 1].hasta
        return { label, total: anticipadas.filter(d => d >= desde && d < hasta).length }
    })

    // --- ubicación ---
    const conUbicacion = reales.filter(i => ubicacionesDe(i).length > 0)
    const ubicaciones = reales.flatMap(ubicacionesDe)

    const ciudades = contarCiudades(ubicaciones.map(u => u.ciudad))
    const paises = contarPaises(ubicaciones.map(u => u.pais))

    // Se cuenta por invitación, no por punto del itinerario: al admin le sirve
    // saber a cuántos eventos les falta el dato, no a cuántas direcciones.
    const sinPais = conUbicacion.filter(i => !ubicacionesDe(i).some(u => u.pais)).length

    const topCiudades = ciudades.slice(0, CIUDADES_VISIBLES)
    const otrasCiudades = ciudades.slice(CIUDADES_VISIBLES)

    return {
        totales: {
            reales: reales.length,
            pruebas: totales - reales.length,
            conFecha: conFecha.length,
            sinFecha: reales.length - conFecha.length,
            conUbicacion: conUbicacion.length,
        },
        ventasPorMes,
        eventosPorMes,
        anticipacion: {
            medianaDias: mediana(anticipadas),
            muestra: anticipadas.length,
            retroactivas: retroactivas.length,
            histograma,
        },
        ciudades: {
            lista: ciudades,
            distintas: ciudades.length,
            top: topCiudades,
            maximo: ciudades[0]?.total ?? 0,
            otras: otrasCiudades.reduce((acc, c) => acc + c.total, 0),
            otrasDistintas: otrasCiudades.length,
        },
        paises: { lista: paises, sinPais, total: ubicaciones.length },
    }
}, [reales, totales])

// -------------------------------------------------------------- créditos ---

// Solo PRO: Lite y Paperless no usan créditos, meterlos hundiría el promedio
// con ceros que no significan nada.
const useCreditos = (reales) => {
    const [cobros, setCobros] = useState(null)

    useEffect(() => {
        let cancelado = false

        Promise.all([
            traerTodo('invitation_message_dispatches', 'invitation_id,status'),
            traerTodo('invitation_reminder_dispatches', 'invitation_id,credit_charged'),
        ])
            .then(([envios, recordatorios]) => {
                if (!cancelado) setCobros({ envios, recordatorios })
            })
            .catch(error => {
                console.error('Error al cargar el consumo de créditos:', error)
                if (!cancelado) setCobros({ envios: [], recordatorios: [], error: true })
            })

        return () => { cancelado = true }
    }, [])

    return useMemo(() => {
        if (!cobros) return { cargando: true }

        const pro = reales.filter(esPro)

        if (pro.length === 0) return { vacio: true }

        const porEnvios = {}
        cobros.envios.forEach(e => {
            if (e.status === 'failed') return
            porEnvios[e.invitation_id] = (porEnvios[e.invitation_id] ?? 0) + 1
        })

        const porRecordatorio = {}
        cobros.recordatorios.forEach(r => {
            if (!r.credit_charged) return
            porRecordatorio[r.invitation_id] = (porRecordatorio[r.invitation_id] ?? 0) + 1
        })

        const eventos = pro.map(i => creditosDeEvento(i, porEnvios[i.id], porRecordatorio[i.id]))
        const activos = eventos.filter(e => e.consumo > 0)
        const consumos = activos.map(e => e.consumo)

        return {
            error: cobros.error ?? false,
            totalPro: pro.length,
            activos: activos.length,
            // El promedio se calcula sobre los que sí mandaron algo: 28 eventos
            // PRO todavía no envían nada y arrastrarían la media a la mitad.
            promedio: activos.length ? Math.round(consumos.reduce((a, b) => a + b, 0) / activos.length) : 0,
            maximo: Math.max(0, ...consumos),
            porConsumo: [...activos].sort((a, b) => b.consumo - a.consumo),
        }
    }, [cobros, reales])
}

// Dispersión de consumo contra saldo: cada punto es un evento PRO.
//
// Se eligió dispersión y no otra barra porque la pregunta no es "quién gastó
// más" —eso ya lo dice la lista de al lado— sino dónde está cada evento en dos
// ejes a la vez: los de abajo a la derecha se están quedando sin créditos, los
// de arriba a la izquierda compraron de más y no los usaron.
const ConsumoContraSaldo = ({ eventos, incluidos }) => {
    const tokens = useTokens()

    // Los 300 incluidos del plan: por debajo de esta diagonal el evento nunca
    // compró créditos extra; por encima, sí.
    const maximo = Math.max(incluidos, ...eventos.map(e => Math.max(e.consumo, e.saldo)))

    return (
        // Sin alto propio: es un item de rejilla estirado, así que mide lo que
        // mida la lista de al lado.
        <div className={styles.creditosGrafica}>
            <Scatter
                data={{
                    datasets: [
                        {
                            label: 'Incluidos en el plan',
                            data: [{ x: 0, y: incluidos }, { x: incluidos, y: 0 }],
                            borderColor: tokens.grid,
                            borderWidth: 1.5,
                            borderDash: [6, 5],
                            showLine: true,
                            pointRadius: 0,
                            order: 1,
                        },
                        {
                            label: 'Eventos',
                            data: eventos.map(e => ({ x: e.consumo, y: e.saldo, nombre: e.nombre })),
                            backgroundColor: tokens.verde,
                            borderColor: tokens.surface,
                            borderWidth: 1.5,
                            pointRadius: 6,
                            pointHoverRadius: 8,
                            order: 0,
                        },
                    ],
                }}
                options={{
                    ...opcionesBase,
                    interaction: { mode: 'nearest', intersect: true },
                    scales: {
                        x: {
                            type: 'linear',
                            min: 0,
                            suggestedMax: maximo,
                            title: { display: true, text: 'créditos consumidos', color: tokens.muted, font: { family: 'Poppins', size: 10.5 } },
                            border: { display: false },
                            grid: { color: tokens.grid, drawTicks: false },
                            ticks: { color: tokens.muted, font: { family: 'Poppins', size: 10 }, maxTicksLimit: 6 },
                        },
                        y: {
                            type: 'linear',
                            min: 0,
                            suggestedMax: maximo,
                            title: { display: true, text: 'saldo restante', color: tokens.muted, font: { family: 'Poppins', size: 10.5 } },
                            border: { display: false },
                            grid: { color: tokens.grid, drawTicks: false },
                            ticks: { color: tokens.muted, font: { family: 'Poppins', size: 10 }, maxTicksLimit: 6 },
                        },
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...tooltipBase(tokens),
                            callbacks: {
                                title: (items) => items[0].raw.nombre ?? '',
                                label: (ctx) => (ctx.datasetIndex === 0
                                    ? null
                                    : `gastó ${ctx.parsed.x} · le quedan ${ctx.parsed.y}`),
                            },
                        },
                    },
                }}
            />
        </div>
    )
}

// --------------------------------------------------------------- gráficas ---

const Estacionalidad = ({ ventas, eventos }) => {
    const tokens = useTokens()

    return (
        <div className={styles.chart}>
            <Line
                data={{
                    labels: MESES_CORTOS,
                    datasets: [
                        {
                            label: 'Vendidas',
                            data: ventas,
                            borderColor: tokens.azul,
                            backgroundColor: tokens.azulBg,
                            borderWidth: 2,
                            fill: true,
                            tension: 0.35,
                            pointRadius: 0,
                            pointHoverRadius: 4,
                            pointHoverBorderColor: tokens.surface,
                            pointHoverBorderWidth: 2,
                            // `order` alto = se dibuja primero, o sea al fondo:
                            // si no, el área rellena tapa la otra línea.
                            order: 1,
                        },
                        {
                            label: 'Celebrados',
                            data: eventos,
                            borderColor: tokens.morado,
                            backgroundColor: tokens.morado,
                            borderWidth: 2,
                            fill: false,
                            tension: 0.35,
                            pointRadius: 0,
                            pointHoverRadius: 4,
                            pointHoverBorderColor: tokens.surface,
                            pointHoverBorderWidth: 2,
                            order: 0,
                        },
                    ],
                }}
                options={{
                    ...opcionesBase,
                    scales: {
                        x: {
                            border: { display: false },
                            grid: { display: false },
                            ticks: { color: tokens.muted, font: { family: 'Poppins', size: 10.5 } },
                        },
                        y: ejeYOculto(tokens),
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...tooltipBase(tokens),
                            callbacks: {
                                // Las dos series cuentan cosas distintas: una
                                // invitación vendida no es un evento celebrado.
                                label: (ctx) => (ctx.datasetIndex === 0
                                    ? plural(ctx.parsed.y, 'invitación vendida', 'invitaciones vendidas')
                                    : plural(ctx.parsed.y, 'evento celebrado', 'eventos celebrados')),
                            },
                        },
                    },
                }}
            />
        </div>
    )
}

// Barras horizontales: los rangos ("6 a 12 meses") no caben como etiqueta de un
// eje X sin girarlos, y girados no se leen.
const Anticipacion = ({ histograma }) => {
    const tokens = useTokens()

    return (
        <div className={styles.chartCorto}>
            <Bar
                data={{
                    labels: histograma.map(h => h.label),
                    datasets: [{
                        label: 'Invitaciones',
                        data: histograma.map(h => h.total),
                        backgroundColor: tokens.naranja,
                        hoverBackgroundColor: tokens.naranja,
                        borderRadius: { topLeft: 0, topRight: 4, bottomLeft: 0, bottomRight: 4 },
                        borderSkipped: false,
                        maxBarThickness: 16,
                    }],
                }}
                options={{
                    ...opcionesBase,
                    indexAxis: 'y',
                    // `intersect: false` para que el tooltip salga en cualquier
                    // punto de la fila, no solo encima de la barra pintada: las
                    // barras cortas serían un blanco diminuto.
                    interaction: { mode: 'index', intersect: false },
                    scales: {
                        x: { display: false, beginAtZero: true },
                        y: {
                            border: { display: false },
                            grid: { display: false },
                            ticks: { color: tokens.muted, font: { family: 'Poppins', size: 11 } },
                        },
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...tooltipBase(tokens, (v) => plural(v, 'invitación', 'invitaciones')),
                            callbacks: {
                                label: (ctx) => plural(ctx.parsed.x, 'invitación', 'invitaciones'),
                            },
                        },
                    },
                }}
            />
        </div>
    )
}

const Paises = ({ lista, total }) => {
    const tokens = useTokens()
    const colores = [tokens.azul, tokens.morado, tokens.verde, tokens.naranja, tokens.rojo]

    return (
        <div className={styles.paises}>
            <div className={styles.donut}>
                <Doughnut
                    data={{
                        labels: lista.map(p => p.label),
                        datasets: [{
                            data: lista.map(p => p.total),
                            backgroundColor: lista.map((_, i) => colores[i % colores.length]),
                            borderWidth: 0,
                        }],
                    }}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '68%',
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                ...tooltipBase(tokens),
                                callbacks: {
                                    label: (ctx) => plural(ctx.parsed, 'evento', 'eventos'),
                                },
                            },
                        },
                    }}
                />
            </div>

            <ul className={styles.leyenda}>
                {lista.map((pais, i) => (
                    <li className={styles.leyendaItem} key={pais.clave}>
                        <span
                            className={styles.punto}
                            style={{ background: colores[i % colores.length] }}
                        />
                        <span className={styles.leyendaNombre} title={pais.label}>{pais.label}</span>
                        <span className={styles.leyendaValor}>
                            {Math.round((pais.total / total) * 100)}%
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

// ----------------------------------------------------------------- panel ---

export const AnaliticaInvitaciones = ({ invitacionesReales, totalInvitaciones }) => {
    const datos = useDatos(invitacionesReales, totalInvitaciones)
    const creditos = useCreditos(invitacionesReales)
    const [listaAbierta, setListaAbierta] = useState(false)
    const [consumoAbierto, setConsumoAbierto] = useState(false)

    if (datos.totales.reales === 0) {
        return <div className={styles.empty}>Todavía no hay invitaciones que analizar.</div>
    }

    const { totales, anticipacion, ciudades, paises } = datos

    return (
        <div className={styles.analitica}>
            <div className={styles.kpis}>
                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Invitaciones</span>
                    <span className={styles.kpiValue}>{totales.reales}</span>
                    <span className={styles.kpiFoot}>
                        {totales.pruebas > 0 ? `${totales.pruebas} de prueba fuera del cálculo` : 'sin invitaciones de prueba'}
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Anticipación mediana</span>
                    <span className={styles.kpiValue}>
                        {anticipacion.medianaDias ?? '—'}
                        {anticipacion.medianaDias !== null && <small> días</small>}
                    </span>
                    <span className={styles.kpiFoot}>
                        {anticipacion.medianaDias !== null
                            ? `≈ ${Math.round(anticipacion.medianaDias / 30)} meses entre la venta y el evento`
                            : 'sin fechas suficientes'}
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Ciudades</span>
                    <span className={styles.kpiValue}>{ciudades.distintas}</span>
                    <span className={styles.kpiFoot}>
                        {plural(totales.conUbicacion, 'evento ubicado', 'eventos ubicados')} de {totales.reales}
                    </span>
                </div>

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Países</span>
                    <span className={styles.kpiValue}>{paises.lista.length}</span>
                    <span className={styles.kpiFoot}>
                        {paises.sinPais > 0
                            ? `${plural(paises.sinPais, 'evento', 'eventos')} sin país capturado`
                            : 'todos los eventos ubicados traen país'}
                    </span>
                </div>
            </div>

            <div className={styles.bento}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Cuándo se vende y cuándo se celebra</h2>
                            <p className={styles.cardSub}>
                                Por mes del calendario, todos los años juntos
                            </p>
                        </div>
                        <div className={styles.leyendaInline}>
                            <span className={styles.leyendaChip}>
                                <span className={`${styles.punto} ${styles.puntoAzul}`} /> Vendidas
                            </span>
                            <span className={styles.leyendaChip}>
                                <span className={`${styles.punto} ${styles.puntoMorado}`} /> Celebrados
                            </span>
                        </div>
                    </header>

                    <Estacionalidad ventas={datos.ventasPorMes} eventos={datos.eventosPorMes} />

                    <footer className={styles.cardFoot}>
                        {totales.sinFecha > 0
                            ? `${plural(totales.sinFecha, 'invitación', 'invitaciones')} sin fecha de evento`
                            : 'Todas las invitaciones tienen fecha de evento'}
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Anticipación de compra</h2>
                            <p className={styles.cardSub}>
                                Cuánto falta para el evento cuando compran
                            </p>
                        </div>
                    </header>

                    <Anticipacion histograma={anticipacion.histograma} />

                    <footer className={styles.cardFoot}>
                        {anticipacion.retroactivas > 0
                            ? `${plural(anticipacion.retroactivas, 'invitación creada', 'invitaciones creadas')} después del evento, fuera del cálculo`
                            : `Sobre ${plural(anticipacion.muestra, 'invitación', 'invitaciones')}`}
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Ciudades</h2>
                            <p className={styles.cardSub}>
                                Sede del evento, una vez por invitación
                            </p>
                        </div>
                    </header>

                    {ciudades.top.length === 0 ? (
                        <div className={styles.vacio}>
                            <MapPin size={16} /> Ninguna invitación tiene ubicación capturada.
                        </div>
                    ) : (
                        <ul className={styles.ranking}>
                            {ciudades.top.map(ciudad => (
                                <li className={styles.rankingItem} key={ciudad.clave}>
                                    {/* El nombre se trunca con ellipsis; el
                                        title deja leerlo completo al pasar el
                                        mouse ("Antigua Guatemala" no cabe). */}
                                    <span className={styles.rankingNombre} title={ciudad.label}>
                                        {ciudad.label}
                                    </span>
                                    <span className={styles.rankingBarra}>
                                        <span
                                            className={styles.rankingFill}
                                            style={{ width: `${(ciudad.total / ciudades.maximo) * 100}%` }}
                                        />
                                    </span>
                                    <span className={styles.rankingValor}>{ciudad.total}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <footer className={styles.cardFoot}>
                        {/* La tarjeta solo muestra el top: el resto vive en un
                            popup para no estirar la altura de la fila del bento. */}
                        <Dropdown
                            trigger={['click']}
                            open={listaAbierta}
                            onOpenChange={setListaAbierta}
                            placement='bottomLeft'
                            disabled={ciudades.distintas === 0}
                            popupRender={() => (
                                <div className={styles.listaPopup}>
                                    <div className={styles.listaHead}>
                                        {plural(ciudades.distintas, 'ciudad', 'ciudades')} · {plural(totales.conUbicacion, 'evento', 'eventos')}
                                    </div>
                                    <ul className={styles.lista}>
                                        {ciudades.lista.map((ciudad, i) => (
                                            <li className={styles.listaItem} key={ciudad.clave}>
                                                <span className={styles.listaPos}>{i + 1}</span>
                                                <span className={styles.listaNombre}>{ciudad.label}</span>
                                                <span className={styles.listaValor}>{ciudad.total}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        >
                            <button type='button' className={styles.verTodas} aria-expanded={listaAbierta}>
                                {ciudades.otrasDistintas > 0
                                    ? `Ver las ${ciudades.distintas} ciudades`
                                    : 'Ver la lista completa'}
                                <ChevronDown
                                    size={12}
                                    className={`${styles.chevron} ${listaAbierta ? styles.chevronOpen : ''}`}
                                />
                            </button>
                        </Dropdown>
                    </footer>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Países</h2>
                            <p className={styles.cardSub}>Dónde se celebran los eventos</p>
                        </div>
                    </header>

                    {paises.lista.length === 0 ? (
                        <div className={styles.vacio}>
                            <MapPin size={16} /> Ninguna invitación tiene país capturado.
                        </div>
                    ) : (
                        <Paises
                            lista={paises.lista}
                            total={paises.lista.reduce((acc, p) => acc + p.total, 0)}
                        />
                    )}

                    <footer className={styles.cardFoot}>
                        El país solo se captura cuando la dirección viene del buscador de mapas
                    </footer>
                </section>

                <section className={`${styles.card} ${styles.cardAncha}`}>
                    <header className={styles.cardHead}>
                        <div>
                            <h2 className={styles.cardTitle}>Créditos</h2>
                            <p className={styles.cardSub}>
                                Solo eventos PRO · Lite y Paperless no usan créditos
                            </p>
                        </div>
                    </header>

                    {creditos.cargando ? (
                        <div className={styles.vacio}>Cargando consumo de créditos…</div>
                    ) : creditos.vacio ? (
                        <div className={styles.vacio}>Todavía no hay eventos PRO.</div>
                    ) : (
                        <>
                            <div className={styles.creditoPromedio}>
                                <span className={styles.creditoPromedioValor}>{creditos.promedio}</span>
                                <span className={styles.creditoPromedioTexto}>
                                    créditos de consumo promedio, sobre los {creditos.activos} de{' '}
                                    {creditos.totalPro} eventos PRO que ya enviaron
                                </span>
                            </div>

                            <div className={styles.creditosSplit}>
                                <ConsumoContraSaldo
                                    eventos={creditos.porConsumo}
                                    incluidos={CREDITOS_INCLUIDOS_PRO}
                                />

                                {/* La lista sin barras: la proporción ya la cuenta
                                    la dispersión y repetirla sería lo mismo dos
                                    veces. Aquí solo interesan los números. */}
                                <ul className={styles.consumos}>
                                    {creditos.porConsumo.slice(0, CONSUMOS_VISIBLES).map(evento => (
                                        <li className={styles.consumoFila} key={evento.id}>
                                            <span className={styles.consumoNombre} title={evento.email ?? evento.nombre}>
                                                {evento.nombre}
                                            </span>
                                            <span className={styles.consumoSaldo}>saldo {evento.saldo}</span>
                                            <span className={styles.consumoValor}>{evento.consumo}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <footer className={styles.cardFoot}>
                                {creditos.porConsumo.length > CONSUMOS_VISIBLES ? (
                                    <Dropdown
                                        trigger={['click']}
                                        open={consumoAbierto}
                                        onOpenChange={setConsumoAbierto}
                                        placement='topLeft'
                                        popupRender={() => (
                                            <div className={styles.listaPopup}>
                                                <div className={styles.listaHead}>
                                                    Consumo de los {creditos.porConsumo.length} eventos PRO activos
                                                </div>
                                                <ul className={styles.lista}>
                                                    {creditos.porConsumo.map((evento, i) => (
                                                        <li className={styles.listaItem} key={evento.id}>
                                                            <span className={styles.listaPos}>{i + 1}</span>
                                                            <span className={styles.listaNombre} title={evento.email ?? evento.nombre}>
                                                                {evento.nombre}
                                                            </span>
                                                            <span className={styles.listaValor}>{evento.consumo}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    >
                                        <button type='button' className={styles.verTodas} aria-expanded={consumoAbierto}>
                                            Ver los {creditos.porConsumo.length} eventos
                                            <ChevronDown
                                                size={12}
                                                className={`${styles.chevron} ${consumoAbierto ? styles.chevronOpen : ''}`}
                                            />
                                        </button>
                                    </Dropdown>
                                ) : (
                                    'Consumo = envíos que no fallaron más recordatorios cobrados.'
                                )}
                            </footer>
                        </>
                    )}
                </section>
            </div>
        </div>
    )
}
