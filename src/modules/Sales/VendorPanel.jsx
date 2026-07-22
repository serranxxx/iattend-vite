import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Select, Switch, message } from 'antd'
import { ChevronDown, Copy, LogOut, Plus } from 'lucide-react'
import dayjs from 'dayjs'
import { useVendorSession } from './VendorSessionContext'
import { fetchMiResumen, fetchMisVentas, fetchConfiguracionPagos } from './salesApi'
// import { buildBankMessage } from './paymentUtils'
import styles from './VendorPanel.module.css'

const PLANS = ['PRO', 'Lite']

const resolveBaseLink = (stripeLinks, plan) => stripeLinks?.[`${plan}_0`] || stripeLinks?.[plan]

const formatCurrency = (value) =>
    `$${Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

const initials = (nombre = '') =>
    nombre.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()

const MESES = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
]

export const VendorPanel = ({ onNewSale, onOpenCobro }) => {
    const { t } = useTranslation()
    const { vendedor, logout } = useVendorSession()
    const [resumen, setResumen] = useState(null)
    const [ventas, setVentas] = useState([])
    const [loading, setLoading] = useState(true)
    const [configPagos, setConfigPagos] = useState(null)
    const [openPagos, setOpenPagos] = useState(false)
    const [filterYear, setFilterYear] = useState(dayjs().year())
    const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1)
    const [todoElAnio, setTodoElAnio] = useState(false)

    useEffect(() => {
        let active = true

        Promise.all([fetchMiResumen(), fetchMisVentas()])
            .then(([resumenRes, ventasRes]) => {
                if (!active) return
                setResumen(resumenRes.data)
                setVentas(ventasRes.data?.ventas || [])
            })
            .catch(() => {})
            .finally(() => active && setLoading(false))

        fetchConfiguracionPagos().then(({ data }) => active && setConfigPagos(data)).catch(() => {})

        return () => { active = false }
    }, [])

    const handleCopy = (texto) => {
        navigator.clipboard.writeText(texto)
        message.success(t('sales.panel.copied'))
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <div className={styles.identity}>
                    <span className={styles.avatar}>{initials(vendedor?.nombre)}</span>
                    <span className={styles.greeting}>{t('sales.panel.greeting', { nombre: vendedor?.nombre?.split(' ')[0] || '' })}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Button className={styles.newSaleBtn} onClick={onNewSale} icon={<Plus size={14} />}>
                        {t('sales.panel.btn_new_sale')}
                    </Button>
                    <Button type='text' className={styles.logoutBtn} onClick={logout} aria-label={t('sales.panel.logout')} icon={<LogOut size={18} />} />
                </div>
            </div>

            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>{t('sales.panel.stat_sales_month')}</div>
                    <div className={styles.statValue}>{resumen?.ventas_mes ?? '—'}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>{t('sales.panel.stat_commission')}</div>
                    <div className={styles.statValue}>{formatCurrency(resumen?.comision_generada_mes)}</div>
                </div>
            </div>

            {configPagos?.transferencia && (
                <div className={styles.paymentBox}>
                    <div
                        className={styles.paymentTitle}
                        onClick={() => setOpenPagos(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    >
                        <span>{t('sales.panel.payment_info_title')}</span>
                        <ChevronDown
                            size={13}
                            color='var(--gray-color)'
                            style={{ transition: 'transform 0.2s', transform: openPagos ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                        />
                    </div>

                    <div className={`${styles.paymentBody} ${!openPagos ? styles.paymentBodyClosed : ''}`}>
                        <div className={styles.paymentRow}>
                            <span className={styles.paymentRowText}>
                                <span className={styles.paymentRowLabel}>CLABE</span>
                                <span className={styles.paymentValue}>{configPagos.transferencia.clabe}</span>
                            </span>
                            <Button type='text' className={styles.copyBtn} icon={<Copy size={12} />} onClick={() => handleCopy(configPagos.transferencia.clabe)} />
                        </div>

                        {PLANS.map((plan) => {
                            const link = resolveBaseLink(configPagos.stripe_links, plan)
                            if (!link) return null
                            return (
                                <div className={styles.paymentRow} key={plan}>
                                    <span className={styles.paymentRowText}>
                                        <span className={styles.paymentRowLabel}>{plan}</span>
                                        <a className={styles.paymentLink} href={link} target="_blank" rel="noreferrer">{link}</a>
                                    </span>
                                    <Button type='text' className={styles.copyBtn} icon={<Copy size={12} />} onClick={() => handleCopy(link)} />
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            <div className={styles.listHeader}>
                <span className={styles.listLabel}>{t('sales.panel.my_sales')}</span>
                <div className={styles.listFilters}>
                    <div className={styles.switchFilter}>
                        <Switch size='small' checked={todoElAnio} onChange={setTodoElAnio} />
                        <span className={styles.switchLabel}>Todo el año</span>
                    </div>
                    {!todoElAnio && (
                        <Select
                            suffixIcon={null}
                            className={styles.filterSelect}
                            value={filterMonth}
                            onChange={setFilterMonth}
                            options={MESES}
                        />
                    )}
                    <Select
                        suffixIcon={null}
                        className={styles.filterSelect}
                        value={filterYear}
                        onChange={setFilterYear}
                        options={[
                            { value: 2026, label: '2026' },
                            { value: 2025, label: '2025' },
                            { value: 2024, label: '2024' },
                        ]}
                    />
                </div>
            </div>

            {loading && <div className={styles.empty}>{t('sales.panel.loading')}</div>}

            <div className={styles.ventaList}>
                {[...ventas]
                    .sort((a, b) => (b.fecha_venta > a.fecha_venta ? 1 : -1))
                    .filter(v => {
                        if (!v.fecha_venta) return true
                        const d = dayjs(v.fecha_venta)
                        if (d.year() !== filterYear) return false
                        if (!todoElAnio && d.month() + 1 !== filterMonth) return false
                        return true
                    })
                    .map((venta) => (
                        <button
                            key={venta.venta_id}
                            className={styles.ventaCard}
                            onClick={() => onOpenCobro(venta)}
                        >
                            <div className={styles.ventaCardTop}>
                                <span className={styles.ventaEvento}>{venta.evento}</span>
                                <span className={`${styles.statusBadge} ${styles[`status_${venta.estado_pago}`] || ''}`}>
                                    {t(`sales.panel.status_${venta.estado_pago}`, venta.estado_pago)}
                                </span>
                            </div>
                            <div className={styles.ventaCardBottom}>
                                <span className={styles.ventaMeta}>{venta.plan}</span>
                                <span className={styles.ventaSaldo}>
                                    {t('sales.panel.saldo')} {formatCurrency(venta.saldo_pendiente)}
                                </span>
                            </div>
                            {venta.fecha_venta && (
                                <span className={styles.ventaDate}>
                                    {dayjs(venta.fecha_venta).format('D MMM YYYY')}
                                </span>
                            )}
                        </button>
                    ))
                }
                {!loading && ventas.filter(v => {
                    if (!v.fecha_venta) return true
                    const d = dayjs(v.fecha_venta)
                    if (d.year() !== filterYear) return false
                    if (filterMonth !== null && d.month() + 1 !== filterMonth) return false
                    return true
                }).length === 0 && (
                    <div className={styles.empty}>{t('sales.panel.empty_sales')}</div>
                )}
            </div>
        </div>
    )
}
