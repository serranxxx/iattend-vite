import { useEffect, useState } from 'react'
import { Tooltip } from 'antd'
import { AlertTriangle, ArrowUpRight, Mail, RefreshCw, Receipt } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { fetchStripeResumen } from '../stripeAdminApi'
import styles from './StripeSection.module.css'

dayjs.locale('es')

// Admin → Ventas → Stripe: saldo, depósitos, pagos con su comisión, disputas y
// checkouts abandonados. Solo lectura; para reembolsar o responder una disputa
// se abre el dashboard de Stripe.

const DASHBOARD = 'https://dashboard.stripe.com'

const dinero = (monto, moneda = 'mxn') =>
    `$${Number(monto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${moneda && moneda !== 'mxn' ? ` ${moneda.toUpperCase()}` : ''}`

const ESTADOS_PAGO = {
    succeeded: { label: 'Pagado', clase: 'ok' },
    pending: { label: 'Pendiente', clase: 'pendiente' },
    failed: { label: 'Fallido', clase: 'mal' },
    reembolsado: { label: 'Reembolsado', clase: 'neutro' },
    reembolso_parcial: { label: 'Reembolso parcial', clase: 'pendiente' },
    disputado: { label: 'En disputa', clase: 'mal' },
}

const ESTADOS_DEPOSITO = { pending: 'Programado', in_transit: 'En camino', paid: 'Depositado' }

const MOTIVOS_DISPUTA = {
    fraudulent: 'Fraude',
    duplicate: 'Cargo duplicado',
    product_not_received: 'Producto no recibido',
    product_unacceptable: 'Producto no aceptable',
    subscription_canceled: 'Suscripción cancelada',
    credit_not_processed: 'Reembolso no procesado',
    unrecognized: 'No reconocido',
    general: 'General',
}

const principal = (lista) => lista?.[0] ?? { monto: 0, moneda: 'mxn' }

export const StripeSection = () => {
    const [datos, setDatos] = useState(null)
    const [error, setError] = useState(null)
    const [cargando, setCargando] = useState(false)

    const cargar = async () => {
        setCargando(true)
        try {
            const { data } = await fetchStripeResumen()
            setDatos(data)
            setError(null)
        } catch (err) {
            setError(err.response?.data?.msg || 'No se pudo leer Stripe')
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => { cargar() }, [])

    if (error && !datos) {
        return <div className={styles.vacio}>{error}</div>
    }

    if (!datos) {
        return <div className={styles.vacio}>Leyendo Stripe…</div>
    }

    const disponible = principal(datos.saldo.disponible)
    const pendiente = principal(datos.saldo.pendiente)
    const proximo = datos.depositos.proximos[0]
    const ultimo = datos.depositos.recientes[0]
    const cobrados = datos.pagos.filter(p => p.estado === 'succeeded')
    const comisiones = cobrados.reduce((acc, p) => acc + (p.comision || 0), 0)
    const bruto = cobrados.reduce((acc, p) => acc + p.monto, 0)
    const urgentes = datos.disputas.filter(d => d.piden_respuesta)

    return (
        <div className={styles.stripe}>
            <div className={styles.barra}>
                {datos.modo === 'test' && <span className={styles.modoPrueba}>Modo prueba</span>}
                <button type='button' className={styles.accion} onClick={cargar} disabled={cargando}>
                    <RefreshCw size={13} className={cargando ? styles.girando : ''} /> Actualizar
                </button>
                <a className={styles.accion} href={DASHBOARD} target='_blank' rel='noreferrer'>
                    <ArrowUpRight size={13} /> Abrir Stripe
                </a>
            </div>

            {urgentes.length > 0 && (
                <div className={styles.alerta} role='alert'>
                    <AlertTriangle size={18} />
                    <div>
                        <strong>
                            {urgentes.length === 1 ? 'Una disputa necesita respuesta' : `${urgentes.length} disputas necesitan respuesta`}
                        </strong>
                        <span>
                            Si no se responde antes de la fecha límite, Stripe le da la razón al cliente.
                            {urgentes[0].limite && ` La primera vence el ${dayjs(urgentes[0].limite).format('D [de] MMMM')}.`}
                        </span>
                    </div>
                    <a className={styles.accion} href={`${DASHBOARD}/disputes`} target='_blank' rel='noreferrer'>
                        Responder en Stripe
                    </a>
                </div>
            )}

            <div className={styles.kpis}>
                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Saldo disponible</span>
                    <span className={styles.kpiCifra}>{dinero(disponible.monto, disponible.moneda)}</span>
                    <span className={styles.kpiNota}>listo para depositarse</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Por liberarse</span>
                    <span className={styles.kpiCifra}>{dinero(pendiente.monto, pendiente.moneda)}</span>
                    <span className={styles.kpiNota}>pagos recientes que Stripe aún retiene</span>
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Próximo depósito</span>
                    {proximo ? (
                        <>
                            <span className={styles.kpiCifra}>{dinero(proximo.monto, proximo.moneda)}</span>
                            <span className={styles.kpiNota}>
                                {ESTADOS_DEPOSITO[proximo.estado] ?? proximo.estado} · llega el {dayjs(proximo.llega).format('D [de] MMMM')}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className={`${styles.kpiCifra} ${styles.kpiCifraVacia}`}>—</span>
                            <span className={styles.kpiNota}>
                                {ultimo ? `Último: ${dinero(ultimo.monto, ultimo.moneda)} el ${dayjs(ultimo.llega).format('D MMM')}` : 'Sin depósitos programados'}
                            </span>
                        </>
                    )}
                </div>
                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Comisión de Stripe</span>
                    <span className={styles.kpiCifra}>{dinero(comisiones)}</span>
                    <span className={styles.kpiNota}>
                        {bruto > 0 ? `${((comisiones / bruto) * 100).toFixed(1)}% de ${dinero(bruto)} · últimos ${cobrados.length} pagos` : 'sin pagos recientes'}
                    </span>
                </div>
            </div>

            <section className={styles.card}>
                <header className={styles.cardHead}>
                    <h2>Pagos recientes</h2>
                    <span>últimos {datos.pagos.length}</span>
                </header>
                {datos.pagos.length === 0 ? (
                    <div className={styles.vacio}>Todavía no hay pagos.</div>
                ) : (
                    <div className={styles.scroller}>
                        <table className={styles.tabla}>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Cliente</th>
                                    <th className={styles.num}>Monto</th>
                                    <th className={styles.num}>Comisión</th>
                                    <th className={styles.num}>Neto</th>
                                    <th>Estado</th>
                                    <th>Tarjeta</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {datos.pagos.map(pago => {
                                    const estado = ESTADOS_PAGO[pago.estado] ?? { label: pago.estado, clase: 'neutro' }
                                    return (
                                        <tr key={pago.id}>
                                            <td className={styles.fecha}>{dayjs(pago.creado).format('D MMM · HH:mm')}</td>
                                            <td>
                                                <span className={styles.cliente}>{pago.nombre || pago.correo || '—'}</span>
                                                {pago.nombre && pago.correo && <span className={styles.clienteCorreo}>{pago.correo}</span>}
                                            </td>
                                            <td className={styles.num}>{dinero(pago.monto, pago.moneda)}</td>
                                            <td className={`${styles.num} ${styles.tenue}`}>{pago.comision !== null ? `-${dinero(pago.comision)}` : '—'}</td>
                                            <td className={`${styles.num} ${styles.fuerte}`}>{pago.neto !== null ? dinero(pago.neto) : '—'}</td>
                                            <td><span className={`${styles.estado} ${styles[`estado_${estado.clase}`]}`}>{estado.label}</span></td>
                                            <td className={styles.tenue}>{pago.tarjeta || '—'}</td>
                                            <td className={styles.accionesFila}>
                                                {pago.recibo && (
                                                    <Tooltip title='Recibo'>
                                                        <a href={pago.recibo} target='_blank' rel='noreferrer' aria-label='Recibo'><Receipt size={14} /></a>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title='Ver en Stripe'>
                                                    <a href={`${DASHBOARD}/payments/${pago.id}`} target='_blank' rel='noreferrer' aria-label='Ver en Stripe'><ArrowUpRight size={14} /></a>
                                                </Tooltip>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <div className={styles.dosColumnas}>
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2>Disputas abiertas</h2>
                        <span>{datos.disputas.length}</span>
                    </header>
                    {datos.disputas.length === 0 ? (
                        <div className={styles.vacio}>Ninguna.</div>
                    ) : (
                        <ul className={styles.lista}>
                            {datos.disputas.map(d => (
                                <li key={d.id}>
                                    <span>
                                        <b>{dinero(d.monto, d.moneda)}</b> · {MOTIVOS_DISPUTA[d.motivo] ?? d.motivo}
                                        {d.limite && <em> · responder antes del {dayjs(d.limite).format('D MMM')}</em>}
                                    </span>
                                    <a href={`${DASHBOARD}/disputes/${d.id}`} target='_blank' rel='noreferrer'>abrir</a>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h2>Checkouts sin pagar</h2>
                        <span>últimos 14 días</span>
                    </header>
                    {datos.abandonados.length === 0 ? (
                        <div className={styles.vacio}>Nadie dejó un pago a medias.</div>
                    ) : (
                        <ul className={styles.lista}>
                            {datos.abandonados.map(s => (
                                <li key={s.id}>
                                    <span>
                                        <b>{s.nombre || s.correo || 'Sin correo'}</b>
                                        {' · '}{dinero(s.monto, s.moneda)} · {dayjs(s.creado).format('D MMM')}
                                    </span>
                                    {s.correo && (
                                        <a href={`mailto:${s.correo}?subject=${encodeURIComponent('¿Te ayudamos con tu invitación? — I attend')}`}>
                                            <Mail size={13} /> escribir
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    )
}
