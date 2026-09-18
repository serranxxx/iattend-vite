import { useEffect, useMemo, useState } from 'react'
import { Dropdown } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { fetchAdminVentas } from '../salesAdminApi'
import { fetchGastosFijos, sumarMeta } from '../gastosFijosApi'
import { calcularCargosPorVenta, calcularKpis, formatCurrency } from '../ventasCalculos'
import { useContador } from '../useContador'
import styles from './HoySection.module.css'

dayjs.extend(relativeTime)
dayjs.locale('es')

const PROXIMOS_EVENTOS_VISIBLES = 4
const SALDOS_VISIBLES = 3
// El buzón arrastra conversaciones sin responder de hace meses. En "Pendientes"
// solo caben las más recientes: para el resto está el buzón completo, y una
// lista de 17 tareas deja de leerse como "lo que necesita tu atención hoy".
const BUZON_EN_PENDIENTES = 3

export const HoySection = ({ onNavigate, canSeeVentas }) => {
    const [ventasDelAnio, setVentasDelAnio] = useState([])
    const [gastos, setGastos] = useState(null)

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

    const meta = gastos ? sumarMeta(gastos, kpis.ventasCount) : 0
    const avance = meta > 0 ? Math.min(1, kpis.ingresoNeto / meta) : 0

    // Proyección de cierre del mes: el ritmo diario llevado a los días que faltan.
    const diasDelMes = dayjs().daysInMonth()
    const diaDelMes = dayjs().date()
    const proyeccionMes = (kpis.ingresoNeto / diaDelMes) * diasDelMes

    const ventasOrdenadas = useMemo(
        () => [...ventas].sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta)),
        [ventas]
    )

    // Las tres cifras grandes cuentan hasta su valor en vez de aparecer de
    // golpe cuando responde el backend. El resto de la pantalla entra con el
    // escalonado que hace la hoja de estilos.
    const ventasContadas = useContador(kpis.ventasCount)
    const avanceContado = useContador(avance * 100)
    const saldoContado = useContador(saldoAnual.monto)

    // Las tres lecturas de Hoy son números de venta. Sin permiso no se piden al
    // backend, así que pintarlas daría tres ceros grandes —que se leen como
    // "no vendimos nada", no como "no puedes ver esto"—.
    if (!canSeeVentas) {
        return (
            <div className={styles.hoy}>
                <div className={styles.sinPermiso}>
                    Los números de venta son privados.
                </div>
            </div>
        )
    }

    return (
        <div className={styles.hoy}>
            <div className={styles.columnas}>
                <section className={styles.columna}>
                    <h2 className={styles.label}>Ventas del mes</h2>
                    <div className={styles.cifra}>{Math.round(ventasContadas)}</div>
                    <div className={styles.cifraNota}>
                        {kpis.ventasCount === 1 ? 'venta cerrada' : 'ventas cerradas'} · {kpis.proCount} PRO, {kpis.liteCount} Lite
                    </div>

                    <div className={styles.lista}>
                        {ventasOrdenadas.map(venta => (
                            <div key={venta.venta_id} className={styles.fila}>
                                <span className={styles.filaNombre}>{venta.evento}</span>
                                <span className={styles.filaValor}>
                                    {venta.vendedor ? `${venta.vendedor} · ` : ''}{dayjs(venta.fecha_venta).format('D MMM')}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className={styles.columna}>
                    <h2 className={styles.label}>Punto de equilibrio</h2>
                    <div className={styles.cifra}>
                        {Math.round(avanceContado)}<small>%</small>
                    </div>
                    <div className={styles.cifraNota}>
                        {formatCurrency(kpis.ingresoNeto)} de {formatCurrency(meta)}
                    </div>

                    <div className={styles.barra}>
                        <div className={styles.barraFill} style={{ width: `${avance * 100}%` }} />
                    </div>

                    <div className={styles.lista}>
                        <div className={styles.fila}>
                            <span className={styles.filaNombre}>Faltan</span>
                            <span className={styles.filaValor}>
                                {formatCurrency(Math.max(0, meta - kpis.ingresoNeto))}
                            </span>
                        </div>
                        <div className={styles.fila}>
                            <span className={styles.filaNombre}>Proyección al cierre</span>
                            <span className={`${styles.filaValor} ${proyeccionMes >= meta ? styles.valorOk : ''}`}>
                                {formatCurrency(proyeccionMes)}
                            </span>
                        </div>
                        <div className={styles.fila}>
                            <span className={styles.filaNombre}>Gastos fijos</span>
                            <button type='button' className={styles.enlace} onClick={() => onNavigate('ventas')}>
                                ajustar
                            </button>
                        </div>
                    </div>
                </section>

                <section className={styles.columna}>
                    <h2 className={styles.label}>Saldo por cobrar</h2>
                    <div className={styles.cifra}>{formatCurrency(saldoContado)}</div>
                    <div className={styles.cifraNota}>
                        {saldoAnual.detalle.length} {saldoAnual.detalle.length === 1 ? 'venta pendiente' : 'ventas pendientes'} de pago
                    </div>

                    <div className={styles.lista}>
                        {saldoAnual.detalle.slice(0, SALDOS_VISIBLES).map(venta => (
                            <div key={venta.venta_id} className={styles.fila}>
                                <span className={styles.filaNombre}>
                                    {venta.evento}
                                    <span className={styles.filaMeta}>
                                        {' · '}{venta.vendedor || 'sin vendedor'}
                                    </span>
                                </span>
                                <span className={styles.filaValor}>{formatCurrency(venta.saldo_pendiente)}</span>
                            </div>
                        ))}

                        {saldoAnual.detalle.length > 0 && (
                            <Dropdown
                                trigger={['click']}
                                placement='bottomLeft'
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
                                <button type='button' className={`${styles.enlace} ${styles.enlaceSolo}`}>
                                    ver cobranza
                                </button>
                            </Dropdown>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
