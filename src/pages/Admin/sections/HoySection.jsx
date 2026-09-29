import { useEffect, useMemo, useState } from 'react'
import { Dropdown } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { fetchAdminVentas } from '../salesAdminApi'
import { fetchGastosFijos, sumarMeta } from '../gastosFijosApi'
import { calcularCargosPorVenta, calcularKpis, formatCurrency, netoDeVenta } from '../ventasCalculos'
import { useContador } from '../useContador'
import { BandejaCard, ReportesCard, SaveTheDateCard } from './HoyActividad'
import styles from './HoySection.module.css'

dayjs.extend(relativeTime)
dayjs.locale('es')

// Pantalla "Hoy": el camino a la meta del mes en grande, las ventas y la
// cobranza a un lado, y abajo lo que entra (mensajes, Save the Dates y
// reportes).

const SALDOS_EN_LEYENDA = 4
// Tonos de la barra de saldos: la venta con más saldo en tinta y el resto en
// grises que se aclaran. Identifican ventas, no las ordenan por importancia:
// la leyenda nombra cada una.
const TONOS_SALDO = ['var(--ac-ink)', '#98a2b8', '#c3cad8', '#dde2eb']

// ---------------------------------------------------- gráfica de la meta ---

const G = { w: 980, h: 250, top: 26, bottom: 4 }

const GraficaMeta = ({ serie, meta, proyeccion, diasDelMes }) => {
    const hoy = serie.length
    const tope = Math.max(meta, proyeccion, serie[hoy - 1] ?? 0, 1) * 1.06
    const x = (dia) => ((dia - 1) / Math.max(diasDelMes - 1, 1)) * G.w
    const y = (valor) => G.top + (1 - valor / tope) * (G.h - G.top - G.bottom)

    const puntos = serie.map((valor, i) => [x(i + 1), y(valor)])
    const linea = puntos.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
    const area = puntos.length ? `${linea} L${puntos[puntos.length - 1][0].toFixed(1)},${G.h} L0,${G.h} Z` : ''
    const [hx, hy] = puntos[puntos.length - 1] ?? [0, G.h]

    // "15" solo si no choca con la etiqueta de hoy.
    const mitad = Math.ceil(diasDelMes / 2)
    const mostrarMitad = Math.abs(hoy - mitad) > 5

    return (
        <div className={styles.grafica}>
            <div className={styles.graficaLienzo}>
            <svg viewBox={`0 0 ${G.w} ${G.h}`} preserveAspectRatio='none' className={styles.graficaSvg} role='img'
                aria-label={`Ingreso neto acumulado: ${formatCurrency(serie[hoy - 1] ?? 0)} de ${formatCurrency(meta)}`}>
                <defs>
                    <linearGradient id='hoy-area' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='0%' stopColor='var(--blue-color, #3b7cf6)' stopOpacity='0.45' />
                        <stop offset='100%' stopColor='var(--blue-color, #3b7cf6)' stopOpacity='0.04' />
                    </linearGradient>
                </defs>

                <line x1='0' x2={G.w} y1={y(meta)} y2={y(meta)} className={styles.graficaMeta} />
                {/* Ritmo parejo: de 0 el día 1 a la meta el último día. */}
                <line x1='0' y1={G.h} x2={G.w} y2={y(meta)} className={styles.graficaRitmo} />
                <line x1='0' x2={G.w} y1={G.h - 0.5} y2={G.h - 0.5} className={styles.graficaBase} />

                {area && <path d={area} fill='url(#hoy-area)' />}
                {linea && <path d={linea} className={styles.graficaLinea} />}
                {hoy < diasDelMes && (
                    <line x1={hx} y1={hy} x2={G.w} y2={y(proyeccion)} className={styles.graficaProyeccion} />
                )}
            </svg>

            {/* El punto y las etiquetas van en HTML: el SVG se estira a lo ancho
                y un círculo o un texto dentro se deformarían. */}
            <span className={styles.graficaMetaLabel} style={{ top: `${(y(meta) / G.h) * 100}%` }}>
                Meta {formatCurrency(meta)}
            </span>
            <span className={styles.graficaPunto} style={{ left: `${(hx / G.w) * 100}%`, top: `${(hy / G.h) * 100}%` }} />
            </div>

            <div className={styles.graficaEje}>
                <span style={{ left: 0 }}>1 {dayjs().format('MMM')}</span>
                {mostrarMitad && <span style={{ left: `${(x(mitad) / G.w) * 100}%` }} className={styles.ejeCentro}>{mitad} {dayjs().format('MMM')}</span>}
                <span style={{ left: `${(hx / G.w) * 100}%` }} className={hoy > diasDelMes - 4 ? styles.ejeFinal : styles.ejeCentro}>
                    hoy · {dayjs().format('D MMM')}
                </span>
            </div>
        </div>
    )
}

// ------------------------------------------------------------- pantalla ---

export const HoySection = ({ onNavigate, canSeeVentas, tickets, conversations, invitations, profiles, esPrueba, onAbrirBuzon }) => {
    const [ventasDelAnio, setVentasDelAnio] = useState([])
    const [gastos, setGastos] = useState(null)
    // Punto de equilibrio sin IVA (lo que de verdad queda) o con IVA (lo cobrado
    // menos comisiones). La meta no cambia: son los gastos del mes.
    const [conIva, setConIva] = useState(false)

    const periodo = useMemo(() => ({ anio: dayjs().year(), mes: dayjs().month() + 1 }), [])

    useEffect(() => {
        if (!canSeeVentas) return

        let cancelado = false

        const cargar = async () => {
            try {
                const [ventasRes, gastosRes] = await Promise.all([
                    // El año completo: el saldo por cobrar es acumulado, no mensual.
                    fetchAdminVentas({ anio: periodo.anio }),
                    fetchGastosFijos(periodo),
                ])
                if (cancelado) return
                setVentasDelAnio(ventasRes.data.ventas || [])
                setGastos(gastosRes.data.gastos)
            } catch (error) {
                console.error('Error al cargar los datos de ventas de Hoy:', error)
            }
        }

        cargar()
        return () => { cancelado = true }
    }, [canSeeVentas, periodo])

    const ventas = useMemo(() => ventasDelAnio.filter(v =>
        new Date(v.fecha_venta).getMonth() + 1 === periodo.mes
    ), [ventasDelAnio, periodo])

    const cargosPorVenta = useMemo(() => calcularCargosPorVenta(ventasDelAnio), [ventasDelAnio])
    const kpis = useMemo(() => calcularKpis(ventas, cargosPorVenta), [ventas, cargosPorVenta])

    // El saldo por cobrar se acumula sobre el año: lo que se debe se sigue
    // debiendo aunque cambie el mes.
    const saldoAnual = useMemo(() => {
        const detalle = ventasDelAnio
            .filter(v => Number(v.saldo_pendiente || 0) > 0)
            .sort((a, b) => Number(b.saldo_pendiente) - Number(a.saldo_pendiente))

        return {
            monto: detalle.reduce((acc, v) => acc + Number(v.saldo_pendiente || 0), 0),
            detalle,
        }
    }, [ventasDelAnio])

    const ingreso = conIva ? kpis.ingresoNeto + kpis.iva : kpis.ingresoNeto
    const meta = gastos ? sumarMeta(gastos, kpis.ventasCount) : 0
    const avance = meta > 0 ? Math.min(1, ingreso / meta) : 0

    // Proyección de cierre del mes: el ritmo diario llevado a los días que faltan.
    const diasDelMes = dayjs().daysInMonth()
    const diaDelMes = dayjs().date()
    const proyeccionMes = (ingreso / diaDelMes) * diasDelMes
    const contraMeta = proyeccionMes - meta

    // Neto acumulado día por día, del 1 a hoy.
    const serie = useMemo(() => {
        const porDia = Array(diaDelMes).fill(0)
        ventas.forEach(v => {
            const dia = new Date(v.fecha_venta).getDate()
            if (dia <= diaDelMes) {
                porDia[dia - 1] += netoDeVenta(v, cargosPorVenta) + (conIva ? cargosPorVenta.get(v.venta_id)?.iva ?? 0 : 0)
            }
        })
        return porDia.reduce((acc, valor, i) => [...acc, (acc[i - 1] ?? 0) + valor], [])
    }, [ventas, cargosPorVenta, diaDelMes, conIva])

    const ventasOrdenadas = useMemo(
        () => [...ventas].sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta)),
        [ventas]
    )

    // Las cifras grandes cuentan hasta su valor en vez de aparecer de golpe
    // cuando responde el backend.
    const ventasContadas = useContador(kpis.ventasCount)
    const avanceContado = useContador(avance * 100)
    const saldoContado = useContador(saldoAnual.monto)

    const actividad = (
        <>
            <BandejaCard
                className={styles.areaBandeja}
                conversations={conversations}
                invitations={invitations}
                profiles={profiles}
                onAbrirBuzon={onAbrirBuzon}
            />
            <SaveTheDateCard
                className={styles.areaStd}
                invitations={invitations}
                profiles={profiles}
                esPrueba={esPrueba}
            />
            <ReportesCard
                className={styles.areaReportes}
                tickets={tickets}
                onNavigate={onNavigate}
            />
        </>
    )

    // Los números de venta son del dueño. Sin permiso no se piden al backend,
    // así que pintarlos daría ceros que se leen como "no vendimos nada".
    if (!canSeeVentas) {
        return (
            <div className={styles.hoy}>
                <div className={styles.sinPermiso}>Los números de venta son privados.</div>
                <div className={`${styles.grid} ${styles.gridSinVentas}`}>{actividad}</div>
            </div>
        )
    }

    return (
        <div className={styles.hoy}>
            <div className={styles.grid}>
                <section className={`${styles.card} ${styles.cardOscura} ${styles.areaEquilibrio}`}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Punto de equilibrio</h2>
                        <div className={styles.cardHeadAcciones}>
                            <div className={`${styles.segmentado} ${styles.segmentadoOscuro}`} role='radiogroup' aria-label='IVA'>
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
                            <button type='button' className={styles.enlace} onClick={() => onNavigate('ventas')}>
                                ajustar gastos fijos
                            </button>
                        </div>
                    </header>

                    <div className={styles.equilibrioCifras}>
                        <div className={styles.equilibrioPrincipal}>
                            <span className={styles.cifraGigante}>
                                {Math.round(avanceContado)}<small>%</small>
                            </span>
                            <span className={styles.equilibrioDe}>
                                {formatCurrency(ingreso)}
                                <br />de {formatCurrency(meta)}
                            </span>
                        </div>

                        <div className={styles.equilibrioDatos}>
                            <div>
                                <strong>{formatCurrency(Math.max(0, meta - ingreso))}</strong>
                                <span>faltan</span>
                            </div>
                            <div>
                                <strong className={contraMeta >= 0 ? styles.valorOk : styles.valorCorto}>{formatCurrency(proyeccionMes)}</strong>
                                <span>proyección · {contraMeta >= 0 ? '+' : '-'}{formatCurrency(Math.abs(contraMeta))}</span>
                            </div>
                        </div>
                    </div>

                    <GraficaMeta serie={serie} meta={meta} proyeccion={proyeccionMes} diasDelMes={diasDelMes} />
                </section>

                <section className={`${styles.card} ${styles.areaVentas}`}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Ventas del mes</h2>
                        <span className={styles.cardMeta}>{kpis.proCount} PRO · {kpis.liteCount} Lite</span>
                    </header>

                    <div className={styles.ventasCuerpo}>
                        <span className={styles.cifraGrande}>{Math.round(ventasContadas)}</span>
                        <div className={styles.ventasLista}>
                            {ventasOrdenadas.length === 0 && <span className={styles.vacio}>Aún no hay ventas este mes.</span>}
                            {ventasOrdenadas.map(venta => (
                                <div key={venta.venta_id} className={styles.fila}>
                                    <span className={styles.filaNombre}>
                                        {venta.evento}
                                        {venta.vendedor && <span className={styles.filaMeta}> · {venta.vendedor}</span>}
                                    </span>
                                    <span className={styles.filaValor}>{dayjs(venta.fecha_venta).format('D MMM')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className={`${styles.card} ${styles.areaSaldo}`}>
                    <header className={styles.cardHead}>
                        <h2 className={styles.label}>Saldo por cobrar</h2>
                        {saldoAnual.detalle.length > 0 && (
                            <Dropdown
                                trigger={['click']}
                                placement='bottomRight'
                                popupRender={() => (
                                    <div className={styles.saldoPopup}>
                                        <div className={styles.saldoPopupHead}>
                                            Saldos por cobrar · {periodo.anio}
                                            <span>{formatCurrency(saldoAnual.monto)}</span>
                                        </div>
                                        {saldoAnual.detalle.map(venta => (
                                            <div key={venta.venta_id} className={styles.saldoRow}>
                                                <span className={styles.saldoEvento}>
                                                    {venta.evento}
                                                    <span className={styles.saldoMeta}>
                                                        {dayjs(venta.fecha_venta).format('D MMM')}
                                                        {venta.vendedor ? ` · ${venta.vendedor}` : ''}
                                                        {venta.abonos_sin_comprobante > 0 ? ' · sin comprobante' : ''}
                                                    </span>
                                                </span>
                                                <span className={styles.saldoMonto}>{formatCurrency(venta.saldo_pendiente)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            >
                                <button type='button' className={styles.enlace}>ver cobranza</button>
                            </Dropdown>
                        )}
                    </header>

                    <div className={styles.saldoCifras}>
                        <span className={styles.cifraGrande}>{formatCurrency(saldoContado)}</span>
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
                                        style={{
                                            flexGrow: Number(venta.saldo_pendiente),
                                            background: TONOS_SALDO[Math.min(i, TONOS_SALDO.length - 1)],
                                        }}
                                    />
                                ))}
                            </div>
                            <div className={styles.saldoLeyenda}>
                                {saldoAnual.detalle.slice(0, SALDOS_EN_LEYENDA).map((venta, i) => (
                                    <span key={venta.venta_id} className={styles.saldoItem}>
                                        <i style={{ background: TONOS_SALDO[Math.min(i, TONOS_SALDO.length - 1)] }} />
                                        {venta.evento}
                                        <b>{formatCurrency(venta.saldo_pendiente)}</b>
                                    </span>
                                ))}
                                {saldoAnual.detalle.length > SALDOS_EN_LEYENDA && (
                                    <span className={styles.saldoItem}>+{saldoAnual.detalle.length - SALDOS_EN_LEYENDA} más</span>
                                )}
                            </div>
                        </>
                    )}
                </section>

                {actividad}
            </div>
        </div>
    )
}
