/*
  Analítica de producto — Etapa 1: Invitaciones.

  Responde tres preguntas con lo único que la invitación guarda de sí misma:
  cuándo se vendió (`created_at`), cuándo se celebra (`event_date`) y dónde
  (`data.itinerary.object[].address`).

  Las invitaciones de prueba quedan fuera en todos los números: son cuentas
  internas y meterlas movería la estacionalidad sin representar a nadie.

  Tablero de alto fijo (rediseño del admin): franja de KPIs y dos filas de
  tarjetas que caben sin scroll de página; lo que no cabe —la lista de
  ciudades— hace scroll dentro de su tarjeta.
*/

import { useEffect, useMemo, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { Dropdown } from 'antd'
import { ChevronDown, MapPin } from 'lucide-react'
import {
    RANGOS_ANTICIPACION, anticipacionEnDias, contarCiudades,
    contarPaises, creditosDeEvento, esPro, mediana, ubicacionesDe,
} from '../analiticaCalculos'
import { traerTodo } from '../analiticaDatos'
import { MESES } from '../ventasCalculos'
import { MARCA, ejeTexto, ejeYOculto, opcionesBase, tooltipBase, useTokens } from '../adminCharts'
import styles from './AnaliticaInvitaciones.module.css'

const MESES_CORTOS = MESES.map(m => m.slice(0, 3))

// Eventos PRO en la gráfica de consumo; el resto vive en el dropdown.
const CONSUMOS_VISIBLES = 7

// Los nombres de invitación son slugs largos ("cristina&eduardo-2026"): en el
// eje se cortan y el tooltip muestra el completo.
const NOMBRE_EJE_MAX = 18

const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`

const recortar = (texto, max) => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto)


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

    return {
        totales: {
            reales: reales.length,
            pruebas: totales - reales.length,
            conFecha: conFecha.length,
            sinFecha: reales.length - conFecha.length,
            conUbicacion: conUbicacion.length,
            sinUbicacion: reales.length - conUbicacion.length,
        },
        ventasPorMes,
        eventosPorMes,
        anticipacion: {
            medianaDias: mediana(anticipadas),
            muestra: anticipadas.length,
            retroactivas: retroactivas.length,
            histograma,
            maximo: Math.max(0, ...histograma.map(h => h.total)),
        },
        ciudades: {
            lista: ciudades,
            distintas: ciudades.length,
            maximo: ciudades[0]?.total ?? 0,
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
            porConsumo: [...activos].sort((a, b) => b.consumo - a.consumo),
        }
    }, [cobros, reales])
}

// --------------------------------------------------------------- gráficas ---

// Las dos series con área: vendidas en navy al fondo y celebrados en lila
// encima, para que el lila no quede tapado por el relleno navy.
const Estacionalidad = ({ ventas, eventos }) => {
    const tokens = useTokens()

    const serie = (color, relleno) => ({
        borderColor: color,
        backgroundColor: relleno,
        borderWidth: 2.4,
        fill: 'origin',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: tokens.surface,
        pointHoverBorderWidth: 2,
    })

    return (
        <div className={styles.grafica}>
            <Line
                data={{
                    labels: MESES_CORTOS,
                    datasets: [
                        // `order` alto = se dibuja primero, o sea al fondo.
                        { label: 'Vendidas', data: ventas, ...serie(MARCA.navy, MARCA.navyRelleno), order: 1 },
                        { label: 'Celebrados', data: eventos, ...serie(MARCA.lila, 'rgba(209, 190, 221, 0.35)'), order: 0 },
                    ],
                }}
                options={{
                    ...opcionesBase,
                    scales: {
                        x: {
                            border: { display: false },
                            grid: { display: false },
                            ticks: { ...ejeTexto(tokens), maxRotation: 0 },
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

// Consumidos contra saldo, apilados: el largo total es lo que el evento tuvo,
// y el corte navy/lila dice cuánto de eso ya gastó.
const ConsumoTop = ({ eventos }) => {
    const tokens = useTokens()

    const barra = (label, data, color) => ({
        label,
        data,
        backgroundColor: color,
        hoverBackgroundColor: color,
        borderRadius: 4,
        borderSkipped: false,
        barThickness: 14,
        stack: 'creditos',
    })

    return (
        <div className={styles.grafica}>
            <Bar
                data={{
                    labels: eventos.map(e => e.nombre),
                    datasets: [
                        barra('Consumidos', eventos.map(e => e.consumo), MARCA.navy),
                        barra('Saldo', eventos.map(e => e.saldo), MARCA.lila),
                    ],
                }}
                options={{
                    ...opcionesBase,
                    indexAxis: 'y',
                    scales: {
                        x: {
                            stacked: true,
                            beginAtZero: true,
                            border: { display: false },
                            grid: { color: tokens.grid, drawTicks: false },
                            ticks: { ...ejeTexto(tokens), font: { family: 'Poppins', size: 10 }, maxTicksLimit: 6 },
                        },
                        y: {
                            stacked: true,
                            border: { display: false },
                            grid: { display: false },
                            ticks: {
                                color: MARCA.navy,
                                font: { family: 'Poppins', size: 11 },
                                autoSkip: false,
                                callback: (_, i) => recortar(eventos[i]?.nombre ?? '', NOMBRE_EJE_MAX),
                            },
                        },
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...tooltipBase(tokens),
                            callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: ${plural(ctx.parsed.x, 'crédito', 'créditos')}`,
                            },
                        },
                    },
                }}
            />
        </div>
    )
}

// Barras HTML y no chart.js: son cinco rangos fijos con su número al lado, y
// así el alto de cada fila sigue al de la tarjeta sin recalcular el canvas.
const Anticipacion = ({ histograma, maximo }) => (
    <div className={styles.rangos}>
        {histograma.map(rango => (
            <div className={styles.rango} key={rango.label}>
                <span className={styles.rangoLabel}>{rango.label}</span>
                <span className={styles.rangoPista}>
                    <span
                        className={styles.rangoFill}
                        style={{
                            width: maximo ? `${(rango.total / maximo) * 100}%` : 0,
                            // El rango más común en navy: es la respuesta.
                            background: rango.total === maximo && maximo > 0 ? MARCA.navy : MARCA.verde,
                        }}
                    />
                </span>
                <b className={styles.rangoValor}>{rango.total}</b>
            </div>
        ))}
    </div>
)

const Leyenda = ({ items }) => (
    <div className={styles.leyenda}>
        {items.map(({ label, color }) => (
            <span className={styles.leyendaChip} key={label}>
                <i className={styles.leyendaPunto} style={{ background: color }} /> {label}
            </span>
        ))}
    </div>
)

// ----------------------------------------------------------------- panel ---

export const AnaliticaInvitaciones = ({ invitacionesReales, totalInvitaciones }) => {
    const datos = useDatos(invitacionesReales, totalInvitaciones)
    const creditos = useCreditos(invitacionesReales)
    const [consumoAbierto, setConsumoAbierto] = useState(false)

    if (datos.totales.reales === 0) {
        return <div className={styles.empty}>Todavía no hay invitaciones que analizar.</div>
    }

    const { totales, anticipacion, ciudades, paises } = datos

    const kpis = [
        {
            label: 'Invitaciones',
            valor: totales.reales,
            pie: totales.pruebas > 0 ? `${totales.pruebas} de prueba fuera del cálculo` : 'sin invitaciones de prueba',
        },
        {
            label: 'Anticipación mediana',
            valor: anticipacion.medianaDias !== null ? `${anticipacion.medianaDias} días` : '—',
            pie: anticipacion.medianaDias !== null
                ? `≈ ${Math.round(anticipacion.medianaDias / 30)} meses entre venta y evento`
                : 'sin fechas suficientes',
        },
        {
            label: 'Ciudades',
            valor: ciudades.distintas,
            pie: `${plural(totales.conUbicacion, 'evento ubicado', 'eventos ubicados')} de ${totales.reales}`,
        },
        {
            label: 'Países',
            valor: paises.lista.length,
            pie: paises.sinPais > 0
                ? `${plural(paises.sinPais, 'evento', 'eventos')} sin país capturado`
                : 'todos los eventos ubicados traen país',
        },
    ]

    const top = creditos.porConsumo?.slice(0, CONSUMOS_VISIBLES) ?? []

    return (
        <div className={styles.tablero}>
            <div className={styles.kpis}>
                {kpis.map(k => (
                    <div className={styles.kpi} key={k.label}>
                        <span className={styles.label}>{k.label}</span>
                        <div className={styles.kpiFila}>
                            <span className={styles.kpiValor}>{k.valor}</span>
                            <span className={styles.kpiPie} title={k.pie}>{k.pie}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.fila}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Cuándo se vende y cuándo se celebra</h2>
                        <Leyenda items={[
                            { label: 'Vendidas', color: MARCA.navy },
                            { label: 'Celebrados', color: MARCA.lila },
                        ]} />
                    </header>

                    <Estacionalidad ventas={datos.ventasPorMes} eventos={datos.eventosPorMes} />

                    <p className={styles.cardPie}>
                        Por mes del calendario, todos los años juntos
                        {totales.sinFecha > 0 && ` · ${plural(totales.sinFecha, 'invitación', 'invitaciones')} sin fecha de evento`}
                    </p>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Anticipación de compra</h2>
                        {anticipacion.medianaDias !== null && (
                            <span className={styles.cardNota}>mediana {anticipacion.medianaDias} días</span>
                        )}
                    </header>

                    <Anticipacion histograma={anticipacion.histograma} maximo={anticipacion.maximo} />

                    <p className={styles.cardPie}>
                        Cuánto falta para el evento cuando compran ·{' '}
                        {anticipacion.retroactivas > 0
                            ? `${plural(anticipacion.retroactivas, 'creada', 'creadas')} después del evento, fuera del cálculo`
                            : `sobre ${plural(anticipacion.muestra, 'invitación', 'invitaciones')}`}
                    </p>
                </section>
            </div>

            <div className={`${styles.fila} ${styles.filaBaja}`}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Uso de créditos</h2>
                        <span className={styles.cardNota}>solo eventos PRO · Lite y Paperless no usan créditos</span>
                    </header>

                    {creditos.cargando ? (
                        <div className={styles.vacio}>Cargando consumo de créditos…</div>
                    ) : creditos.vacio ? (
                        <div className={styles.vacio}>Todavía no hay eventos PRO.</div>
                    ) : (
                        <>
                            <div className={styles.resumen}>
                                <div className={styles.resumenCifra}>
                                    <span className={styles.resumenValor}>{creditos.promedio}</span>
                                    <span className={styles.resumenTexto}>créditos promedio<br />por evento</span>
                                </div>
                                <div className={styles.resumenAvance}>
                                    <div className={styles.avance}>
                                        <span style={{ flex: creditos.activos, background: MARCA.navy }} />
                                        <span style={{ flex: creditos.totalPro - creditos.activos, background: MARCA.verde }} />
                                    </div>
                                    <div className={styles.avanceTexto}>
                                        <span><b>{creditos.activos}</b> de {creditos.totalPro} eventos PRO ya enviaron</span>
                                        <span><b>{creditos.totalPro - creditos.activos}</b> sin enviar todavía</span>
                                    </div>
                                </div>
                            </div>

                            {creditos.error && (
                                <div className={styles.aviso}>
                                    No se pudieron cargar los envíos: el consumo puede salir en cero.
                                </div>
                            )}

                            <div className={styles.subHead}>
                                {creditos.porConsumo.length > CONSUMOS_VISIBLES ? (
                                    // La gráfica solo muestra el top: el resto vive
                                    // en un popup para no romper el alto fijo.
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
                                                            <span className={styles.listaSaldo}>saldo {evento.saldo}</span>
                                                            <span className={styles.listaValor}>{evento.consumo}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    >
                                        <button type='button' className={styles.verTodas} aria-expanded={consumoAbierto}>
                                            Top {CONSUMOS_VISIBLES} por consumo · ver los {creditos.porConsumo.length}
                                            <ChevronDown
                                                size={12}
                                                className={`${styles.chevron} ${consumoAbierto ? styles.chevronOpen : ''}`}
                                            />
                                        </button>
                                    </Dropdown>
                                ) : (
                                    <span className={styles.cardNota}>Por consumo · lo que gastaron contra lo que les queda</span>
                                )}
                                <Leyenda items={[
                                    { label: 'consumidos', color: MARCA.navy },
                                    { label: 'saldo', color: MARCA.lila },
                                ]} />
                            </div>

                            {top.length === 0 ? (
                                <div className={styles.vacio}>Ningún evento PRO ha enviado todavía.</div>
                            ) : (
                                <ConsumoTop eventos={top} />
                            )}
                        </>
                    )}
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Ciudades</h2>
                        <span className={styles.cardNota}>
                            {plural(ciudades.distintas, 'ciudad', 'ciudades')} · {plural(totales.conUbicacion, 'evento ubicado', 'eventos ubicados')}
                        </span>
                    </header>

                    {ciudades.lista.length === 0 ? (
                        <div className={styles.vacio}>
                            <MapPin size={16} /> Ninguna invitación tiene ubicación capturada.
                        </div>
                    ) : (
                        <ul className={styles.ciudades}>
                            {ciudades.lista.map((ciudad, i) => (
                                <li className={styles.ciudad} key={ciudad.clave}>
                                    {/* El nombre se trunca con ellipsis; el
                                        title deja leerlo completo al pasar el
                                        mouse ("Antigua Guatemala" no cabe). */}
                                    <span className={styles.ciudadNombre} title={ciudad.label}>{ciudad.label}</span>
                                    <span className={styles.ciudadPista}>
                                        <span
                                            className={styles.ciudadFill}
                                            style={{
                                                width: `${(ciudad.total / ciudades.maximo) * 100}%`,
                                                background: i === 0 ? MARCA.navy : MARCA.lila,
                                            }}
                                        />
                                    </span>
                                    <b className={styles.ciudadValor}>{ciudad.total}</b>
                                </li>
                            ))}
                        </ul>
                    )}

                    <p className={styles.cardPie}>
                        Sede del evento, una vez por invitación
                        {totales.sinUbicacion > 0 && ` · ${totales.sinUbicacion} sin ubicación`}
                    </p>
                </section>
            </div>
        </div>
    )
}
