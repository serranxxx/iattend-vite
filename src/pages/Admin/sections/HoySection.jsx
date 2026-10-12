import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { ChevronDown } from 'lucide-react'
import { fetchAdminVentas } from '../salesAdminApi'
import { fetchGastosFijos, sumarMeta } from '../gastosFijosApi'
import { fetchStripeComisiones, fetchStripeResumen } from '../stripeAdminApi'
import { calcularCargosPorVenta, calcularKpis, formatCurrency, netoDeVenta } from '../ventasCalculos'
import { useContador } from '../useContador'
import { ReportesCard, SaveTheDateCard } from './HoyActividad'
import styles from './HoySection.module.css'

dayjs.locale('es')

// Pantalla "Hoy", una sola pantalla sin scroll:
//   arriba   Punto de equilibrio del mes (elegible; los cerrados dicen cómo
//            cerraron en vez de proyectar), Sin IVA / Con IVA.
//   abajo    Ventas del mes · Cobranza (saldo por cobrar + saldo en Stripe) ·
//            Save the Date y Reportes.

// Meses que se pueden revisar en el punto de equilibrio.
const MESES_ATRAS = 12
// Tonos de la barra de saldos por venta (navy, lila, verde, crema…).
const TONOS_SALDO = ['#1c3249', '#D1BEDD', '#AAC187', '#eeeadf']

const principal = (lista) => lista?.[0] ?? { monto: 0, moneda: 'mxn' }

// ---------------------------------------------------- gráfica de la meta ---

const G = { w: 980, h: 250, top: 26, bottom: 4 }

const GraficaMeta = ({ serie, meta, proyeccion, diasDelMes, corto, etiquetaFinal }) => {
    const hoy = serie.length
    const tope = Math.max(meta, proyeccion ?? 0, serie[hoy - 1] ?? 0, 1) * 1.06
    const x = (dia) => ((dia - 1) / Math.max(diasDelMes - 1, 1)) * G.w
    const y = (valor) => G.top + (1 - valor / tope) * (G.h - G.top - G.bottom)

    const puntos = serie.map((valor, i) => [x(i + 1), y(valor)])
    const linea = puntos.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
    const area = puntos.length ? `${linea} L${puntos[puntos.length - 1][0].toFixed(1)},${G.h} L0,${G.h} Z` : ''
    const [hx, hy] = puntos[puntos.length - 1] ?? [0, G.h]

    // La mitad del mes solo si no choca con la etiqueta final.
    const mitad = Math.ceil(diasDelMes / 2)

    return (
        <div className={styles.grafica}>
            <div className={styles.graficaLienzo}>
                <svg viewBox={`0 0 ${G.w} ${G.h}`} preserveAspectRatio='none' className={styles.graficaSvg} role='img'
                    aria-label={`Ingreso neto acumulado: ${formatCurrency(serie[hoy - 1] ?? 0)} de ${formatCurrency(meta)}`}>
                    <defs>
                        <linearGradient id='hoy-area' x1='0' y1='0' x2='0' y2='1'>
                            <stop offset='0%' stopColor='#D1BEDD' stopOpacity='0.45' />
                            <stop offset='100%' stopColor='#D1BEDD' stopOpacity='0.04' />
                        </linearGradient>
                    </defs>

                    <line x1='0' x2={G.w} y1={y(meta)} y2={y(meta)} className={styles.graficaMeta} />
                    {/* Ritmo parejo: de 0 el día 1 a la meta el último día. */}
                    <line x1='0' y1={G.h} x2={G.w} y2={y(meta)} className={styles.graficaRitmo} />
                    <line x1='0' x2={G.w} y1={G.h - 0.5} y2={G.h - 0.5} className={styles.graficaBase} />

                    {area && <path d={area} fill='url(#hoy-area)' />}
                    {linea && <path d={linea} className={styles.graficaLinea} />}
                    {proyeccion != null && hoy < diasDelMes && (
                        <line x1={hx} y1={hy} x2={G.w} y2={y(proyeccion)} className={styles.graficaProyeccion} />
                    )}
                </svg>

                {/* El punto y las etiquetas van en HTML: el SVG se estira a lo
                    ancho y un círculo o un texto dentro se deformarían. */}
                <span className={styles.graficaMetaLabel} style={{ top: `${(y(meta) / G.h) * 100}%` }}>
                    Meta {formatCurrency(meta)}
                </span>
                <span className={styles.graficaPunto} style={{ left: `${(hx / G.w) * 100}%`, top: `${(hy / G.h) * 100}%` }} />
            </div>

            <div className={styles.graficaEje}>
                <span style={{ left: 0 }}>1 {corto}</span>
                {Math.abs(hoy - mitad) > 5 && (
                    <span style={{ left: `${(x(mitad) / G.w) * 100}%` }} className={styles.ejeCentro}>{mitad} {corto}</span>
                )}
                <span style={{ left: `${(hx / G.w) * 100}%` }} className={hoy > diasDelMes - 4 ? styles.ejeFinal : styles.ejeCentro}>
                    {etiquetaFinal}
                </span>
            </div>
        </div>
    )
}

// ------------------------------------------------------------- pantalla ---

export const HoySection = ({ onNavigate, canSeeVentas, tickets, invitations, profiles, esPrueba }) => {
    const hoy = useMemo(() => dayjs(), [])
    const [mes, setMes] = useState(() => hoy.format('YYYY-MM'))
    // Sin IVA (lo que de verdad queda) o con IVA (lo cobrado menos comisiones).
    // La meta no cambia: son los gastos del mes.
    const [conIva, setConIva] = useState(false)

    // Ventas por año ({ 2026: [...] }): el mes elegido puede ser del año pasado
    // y el saldo por cobrar siempre es del año en curso.
    const [ventasPorAnio, setVentasPorAnio] = useState({})
    const [gastos, setGastos] = useState(null)
    // Comisión de Stripe del mes por día ({ 'YYYY-MM-DD': monto }).
    const [stripePorDia, setStripePorDia] = useState({})
    const [stripe, setStripe] = useState(null)

    const fecha = dayjs(`${mes}-01`)
    const periodo = useMemo(() => ({ anio: fecha.year(), mes: fecha.month() + 1 }), [mes])
    const enCurso = mes === hoy.format('YYYY-MM')

    const opcionesMes = useMemo(() => Array.from({ length: MESES_ATRAS }, (_, i) => {
        const m = hoy.subtract(i, 'month')
        return { value: m.format('YYYY-MM'), label: m.format('MMMM YYYY') }
    }), [hoy])

    useEffect(() => {
        if (!canSeeVentas) return
        let cancelado = false
        const anios = [...new Set([hoy.year(), periodo.anio])].filter(a => !ventasPorAnio[a])
        anios.forEach(anio => {
            fetchAdminVentas({ anio })
                .then(({ data }) => { if (!cancelado) setVentasPorAnio(prev => ({ ...prev, [anio]: data.ventas || [] })) })
                .catch(error => console.error('Error al cargar las ventas de Hoy:', error))
        })
        setGastos(null)
        fetchGastosFijos(periodo)
            .then(({ data }) => { if (!cancelado) setGastos(data.gastos) })
            .catch(error => console.error('Error al cargar los gastos fijos:', error))
        // Aparte: si Stripe no responde, Hoy se ve igual, solo sin descontarla.
        setStripePorDia({})
        fetchStripeComisiones(periodo)
            .then(({ data }) => { if (!cancelado) setStripePorDia(data.porDia ?? {}) })
            .catch(error => console.error('No se pudo leer la comisión de Stripe:', error.response?.data || error.message))
        return () => { cancelado = true }
    }, [canSeeVentas, periodo])

    useEffect(() => {
        if (!canSeeVentas) return
        fetchStripeResumen()
            .then(({ data }) => setStripe(data))
            .catch(error => console.error('No se pudo leer el saldo de Stripe:', error.response?.data || error.message))
    }, [canSeeVentas])

    const ventasDelAnio = ventasPorAnio[periodo.anio] ?? []
    const ventasAnioEnCurso = ventasPorAnio[hoy.year()] ?? []

    const ventas = useMemo(() => ventasDelAnio.filter(v =>
        new Date(v.fecha_venta).getMonth() + 1 === periodo.mes
    ), [ventasDelAnio, periodo])

    const cargosPorVenta = useMemo(() => calcularCargosPorVenta(ventasDelAnio), [ventasDelAnio])
    const kpis = useMemo(() => calcularKpis(ventas, cargosPorVenta), [ventas, cargosPorVenta])

    // El saldo por cobrar se acumula sobre el año en curso.
    const saldoAnual = useMemo(() => {
        const detalle = ventasAnioEnCurso
            .filter(v => Number(v.saldo_pendiente || 0) > 0)
            .sort((a, b) => Number(b.saldo_pendiente) - Number(a.saldo_pendiente))
        return { monto: detalle.reduce((acc, v) => acc + Number(v.saldo_pendiente || 0), 0), detalle }
    }, [ventasAnioEnCurso])

    const comisionStripe = Object.values(stripePorDia).reduce((acc, v) => acc + v, 0)
    const ingreso = (conIva ? kpis.ingresoNeto + kpis.iva : kpis.ingresoNeto) - comisionStripe
    const meta = gastos ? sumarMeta(gastos, kpis.ventasCount) : 0
    const avance = meta > 0 ? ingreso / meta : 0

    const diasDelMes = fecha.daysInMonth()
    // Mes en curso: hasta hoy; mes cerrado: el mes completo.
    const diasTranscurridos = enCurso ? hoy.date() : diasDelMes
    const proyeccion = enCurso ? (ingreso / diasTranscurridos) * diasDelMes : null

    // Neto acumulado día por día.
    const serie = useMemo(() => {
        const porDia = Array(diasTranscurridos).fill(0)
        Object.entries(stripePorDia).forEach(([dia, monto]) => {
            const d = Number(dia.slice(8, 10))
            if (d <= diasTranscurridos) porDia[d - 1] -= monto
        })
        ventas.forEach(v => {
            const d = new Date(v.fecha_venta).getDate()
            if (d <= diasTranscurridos) {
                porDia[d - 1] += netoDeVenta(v, cargosPorVenta) + (conIva ? cargosPorVenta.get(v.venta_id)?.iva ?? 0 : 0)
            }
        })
        return porDia.reduce((acc, valor, i) => [...acc, (acc[i - 1] ?? 0) + valor], [])
    }, [ventas, cargosPorVenta, diasTranscurridos, conIva, stripePorDia])

    const ventasOrdenadas = useMemo(
        () => [...ventas].sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta)),
        [ventas]
    )

    // Las cifras grandes cuentan hasta su valor en vez de aparecer de golpe.
    const ventasContadas = useContador(kpis.ventasCount)
    const avanceContado = useContador(avance * 100)
    const saldoContado = useContador(saldoAnual.monto)

    const signo = (n) => `${n >= 0 ? '+' : '-'}${formatCurrency(Math.abs(n))}`
    const corto = fecha.format('MMM')

    const columnaActividad = (
        <div className={styles.columna}>
            <SaveTheDateCard invitations={invitations} profiles={profiles} esPrueba={esPrueba} />
            <ReportesCard tickets={tickets} onNavigate={onNavigate} />
        </div>
    )

    // Los números de venta son del dueño. Sin permiso no se piden al backend,
    // así que pintarlos daría ceros que se leen como "no vendimos nada".
    if (!canSeeVentas) {
        return (
            <div className={styles.hoy}>
                <div className={styles.sinPermiso}>Los números de venta son privados.</div>
                <div className={`${styles.grid} ${styles.gridSinVentas}`}>{columnaActividad}</div>
            </div>
        )
    }

    const disponible = principal(stripe?.saldo?.disponible)
    const porLiberar = principal(stripe?.saldo?.pendiente)
    const proximo = stripe?.depositos?.proximos?.[0]

    return (
        <div className={styles.hoy}>
            <div className={styles.grid}>
                <section className={`${styles.card} ${styles.cardOscura} ${styles.areaEquilibrio}`}>
                    <header className={styles.equilibrioHead}>
                        <h2 className={styles.label}>Punto de equilibrio</h2>
                        <label className={styles.selectMes}>
                            <select value={mes} onChange={(e) => setMes(e.target.value)} aria-label='Mes'>
                                {opcionesMes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <ChevronDown size={14} />
                        </label>
                        {!enCurso && <span className={styles.pillOscura}>mes cerrado</span>}
                        <div className={styles.segmentadoOscuro} role='radiogroup' aria-label='IVA'>
                            {[[false, 'Sin IVA'], [true, 'Con IVA']].map(([valor, label]) => (
                                <button
                                    key={label}
                                    type='button'
                                    role='radio'
                                    aria-checked={conIva === valor}
                                    className={conIva === valor ? styles.segmentoActivo : ''}
                                    onClick={() => setConIva(valor)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </header>

                    <div className={styles.equilibrioCuerpo}>
                        <div className={styles.equilibrioIzq}>
                            <div className={styles.equilibrioCifra}>
                                <div className={styles.equilibrioPct}>
                                    <span className={styles.cifra}>{Math.round(avanceContado)}<small>%</small></span>
                                    <span className={styles.equilibrioDe}>
                                        {formatCurrency(ingreso)}
                                        <br />de {formatCurrency(meta)}
                                    </span>
                                </div>
                                <div className={styles.barraOscura}>
                                    <span style={{ width: `${Math.min(100, Math.max(0, avance * 100))}%` }} />
                                </div>
                            </div>

                            <div className={styles.equilibrioDatos}>
                                {enCurso ? (
                                    <>
                                        <div>
                                            <span>faltan</span>
                                            <strong>{formatCurrency(Math.max(0, meta - ingreso))}</strong>
                                        </div>
                                        <div>
                                            <span>proyección · {signo(proyeccion - meta)}</span>
                                            <strong className={proyeccion >= meta ? styles.valorOk : styles.valorCorto}>{formatCurrency(proyeccion)}</strong>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <span>cerró en</span>
                                            <strong>{formatCurrency(ingreso)}</strong>
                                        </div>
                                        <div>
                                            <span>{ingreso >= meta ? 'arriba de la meta' : 'abajo de la meta'}</span>
                                            <strong className={ingreso >= meta ? styles.valorOk : styles.valorCorto}>{signo(ingreso - meta)}</strong>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <GraficaMeta
                            serie={serie}
                            meta={meta}
                            proyeccion={proyeccion}
                            diasDelMes={diasDelMes}
                            corto={corto}
                            etiquetaFinal={enCurso ? `hoy · ${hoy.date()} ${corto}` : `${diasDelMes} ${corto}`}
                        />
                    </div>
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Ventas del mes</h2>
                        <button type='button' className={styles.enlace} onClick={() => onNavigate('ventas', 'ingresos')}>ver ventas</button>
                    </header>

                    <div className={styles.ventasCifra}>
                        <span className={styles.cifra}>{Math.round(ventasContadas)}</span>
                        <span>{kpis.ventasCount === 1 ? 'venta' : 'ventas'}</span>
                    </div>
                    <div className={styles.barraPlanes}>
                        {kpis.proCount > 0 && <span style={{ flexGrow: kpis.proCount, background: '#1c3249' }} />}
                        {kpis.liteCount > 0 && <span style={{ flexGrow: kpis.liteCount, background: '#D1BEDD' }} />}
                        {kpis.ventasCount === 0 && <span style={{ flexGrow: 1, background: '#eeeadf' }} />}
                    </div>
                    <div className={styles.leyenda}>
                        <span><i style={{ background: '#1c3249' }} />{kpis.proCount} PRO</span>
                        <span><i style={{ background: '#D1BEDD' }} />{kpis.liteCount} Lite</span>
                    </div>

                    <div className={styles.ventasLista}>
                        {ventasOrdenadas.length === 0 && <span className={styles.vacio}>Aún no hay ventas este mes.</span>}
                        {ventasOrdenadas.map(venta => (
                            <div key={venta.venta_id} className={styles.fila}>
                                <span className={styles.filaTexto}>
                                    <b>{venta.evento}</b>
                                    <span>{venta.vendedor || 'Ecommerce'}</span>
                                </span>
                                <span className={styles.filaFecha}>{dayjs(venta.fecha_venta).format('D MMM')}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className={`${styles.card} ${styles.cobranza}`}>
                    <div className={styles.cobranzaArriba}>
                        <header className={styles.cardHead}>
                            <h2 className={styles.label}>Saldo por cobrar</h2>
                            <button type='button' className={styles.enlace} onClick={() => onNavigate('ventas', 'ingresos')}>ver cobranza</button>
                        </header>
                        <div className={styles.saldoCifra}>
                            <span className={styles.cifra}>{formatCurrency(saldoContado)}</span>
                            <span className={styles.cardMeta}>
                                {saldoAnual.detalle.length} {saldoAnual.detalle.length === 1 ? 'venta pendiente' : 'ventas pendientes'}
                            </span>
                        </div>
                        {saldoAnual.detalle.length > 0 && (
                            <>
                                <div className={styles.saldoBarra}>
                                    {saldoAnual.detalle.map((venta, i) => (
                                        <span
                                            key={venta.venta_id}
                                            title={`${venta.evento} · ${formatCurrency(venta.saldo_pendiente)}`}
                                            style={{ flexGrow: Number(venta.saldo_pendiente), background: TONOS_SALDO[i % TONOS_SALDO.length] }}
                                        />
                                    ))}
                                </div>
                                <div className={styles.saldoLista}>
                                    {saldoAnual.detalle.map((venta, i) => (
                                        <div key={venta.venta_id} className={styles.saldoItem}>
                                            <i style={{ background: TONOS_SALDO[i % TONOS_SALDO.length] }} />
                                            <span>{venta.evento}</span>
                                            <b>{formatCurrency(venta.saldo_pendiente)}</b>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className={styles.stripe}>
                        <header className={styles.cardHead}>
                            <h2 className={styles.label}>Saldo en Stripe</h2>
                            <button type='button' className={styles.enlace} onClick={() => onNavigate('ventas', 'stripe')}>ver Stripe</button>
                        </header>
                        {stripe ? (
                            <>
                                <div className={styles.saldoCifra}>
                                    <span className={styles.cifra}>{formatCurrency(disponible.monto)}</span>
                                    <span className={styles.cardMeta}>disponible</span>
                                </div>
                                <div className={styles.stripeDatos}>
                                    <div><span>por liberarse</span><b>{formatCurrency(porLiberar.monto)}</b></div>
                                    {proximo && (
                                        <div>
                                            <span>próximo depósito · {dayjs(proximo.llega).format('D MMM')}</span>
                                            <b>{formatCurrency(proximo.monto)}</b>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <span className={styles.vacio}>Leyendo Stripe…</span>
                        )}
                    </div>
                </section>

                {columnaActividad}
            </div>
        </div>
    )
}
