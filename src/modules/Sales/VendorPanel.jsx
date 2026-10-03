import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message } from 'antd'
import { ChevronDown, Copy, LogOut, Plus } from 'lucide-react'
import dayjs from 'dayjs'
import { useVendorSession } from './VendorSessionContext'
import { fetchMiResumen, fetchMisVentas, fetchConfiguracionPagos } from './salesApi'
import { installmentLinks } from './paymentUtils'
import { formatMXN, usePlans } from '../../hooks/usePlans'
import {
    Screen, StickyFooter, PrimaryButton, SectionLabel, ChipGroup, ProgressBar, StatusPill,
} from './SalesUi'
import { estadoBar, formatCurrency, initials } from './salesFormat'
import styles from './VendorPanel.module.css'

const PLANS = ['PRO', 'Lite']

const resolveBaseLink = (stripeLinks, plan) => stripeLinks?.[`${plan}_0`] || stripeLinks?.[plan]

// Periodo de la tarjeta: 'm:2026-10' (un mes) o 'y:2026' (todo el año).
// Los últimos 12 meses y el año completo de los últimos 3 años.
const buildPeriods = (lang) => {
    const now = dayjs()
    // "Octubre 2026" (sin el "de" que agrega es-MX)
    const fmt = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-MX', { month: 'long' })
    const meses = Array.from({ length: 12 }, (_, i) => {
        const d = now.subtract(i, 'month')
        const mes = fmt.format(d.toDate())
        return { value: `m:${d.format('YYYY-MM')}`, label: `${mes[0].toUpperCase()}${mes.slice(1)} ${d.year()}` }
    })
    const anios = [0, 1, 2].map(i => now.year() - i)
    return { meses, anios }
}

const enPeriodo = (venta, periodo) => {
    if (!venta.fecha_venta) return true
    const d = dayjs(venta.fecha_venta)
    const [tipo, valor] = periodo.split(':')
    return tipo === 'y' ? d.year() === Number(valor) : d.format('YYYY-MM') === valor
}

const FILTROS = {
    todas: () => true,
    por_cobrar: v => v.estado_pago !== 'completo',
    completas: v => v.estado_pago === 'completo',
}

export const VendorPanel = ({ onNewSale, onOpenCobro }) => {
    const { t, i18n } = useTranslation()
    const { vendedor, logout } = useVendorSession()
    const [resumen, setResumen] = useState(null)
    const [ventas, setVentas] = useState([])
    const [loading, setLoading] = useState(true)
    const [configPagos, setConfigPagos] = useState(null)
    const [periodo, setPeriodo] = useState(() => `m:${dayjs().format('YYYY-MM')}`)
    const [filtro, setFiltro] = useState('todas')
    // Montos de los links a meses: del catálogo (Stripe), no de la tabla de links.
    const { getPlan } = usePlans()

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

    const { meses, anios } = useMemo(() => buildPeriods(i18n.language), [i18n.language])
    const periodoLabel = periodo.startsWith('y:')
        ? t('sales.panel.whole_year', { year: periodo.slice(2) })
        : meses.find(m => m.value === periodo)?.label

    const ventasPeriodo = useMemo(
        () => [...ventas]
            .filter(v => enPeriodo(v, periodo))
            .sort((a, b) => (b.fecha_venta > a.fecha_venta ? 1 : -1)),
        [ventas, periodo]
    )
    const ventasVisibles = ventasPeriodo.filter(FILTROS[filtro])

    // La comisión sale de cada venta (comision_monto). Si el backend todavía
    // no la manda, el mes en curso usa el resumen y los demás quedan en "—".
    const traeComision = ventas.some(v => v.comision_monto != null)
    const comision = traeComision
        ? ventasPeriodo.reduce((acc, v) => acc + Number(v.comision_monto || 0), 0)
        : periodo === `m:${dayjs().format('YYYY-MM')}` ? resumen?.comision_generada_mes : null
    const porCobrar = ventasPeriodo.reduce((acc, v) => acc + Math.max(0, Number(v.saldo_pendiente || 0)), 0)

    const handleCopy = (texto) => {
        navigator.clipboard.writeText(texto)
        message.success(t('sales.panel.copied'))
    }

    // CLABE, link de cada plan y, después, sus links a meses
    const datosPago = configPagos ? [
        configPagos.transferencia?.clabe && { key: 'clabe', label: 'CLABE', value: configPagos.transferencia.clabe },
        ...PLANS.flatMap(plan => {
            const base = resolveBaseLink(configPagos.stripe_links, plan)
            const filas = base ? [{ key: plan, label: t('sales.panel.link_plan', { plan }), value: base }] : []
            installmentLinks(configPagos.stripe_links, plan).forEach(({ months, url }) => {
                const amount = getPlan(plan)?.installments?.find(term => term.months === months)?.amount
                filas.push({
                    key: `${plan}_msi_${months}`,
                    label: t('sales.panel.link_msi', { plan, months }),
                    title: amount ? `${t('sales.panel.installments_link', { plan, months })} · ${formatMXN(amount)}` : undefined,
                    value: url,
                    secondary: true,
                })
            })
            return filas
        }),
    ].filter(Boolean) : []

    const nombre = vendedor?.nombre?.split(' ')[0] || ''

    return (
        <Screen
            footer={
                <StickyFooter>
                    <PrimaryButton icon={<Plus size={20} />} onClick={onNewSale}>
                        {t('sales.panel.btn_new_sale')}
                    </PrimaryButton>
                </StickyFooter>
            }
        >
            <header className={styles.header}>
                <div className={styles.identity}>
                    <span className={styles.avatar} aria-hidden="true">{initials(vendedor?.nombre)}</span>
                    <div className={styles.hello}>
                        <span className={styles.helloSmall}>{t('sales.panel.hello')}</span>
                        <span className={styles.helloName}>{nombre}</span>
                    </div>
                </div>
                <button type="button" className={styles.circleBtn} onClick={logout} aria-label={t('sales.panel.logout')} title={t('sales.panel.logout')}>
                    <LogOut size={18} />
                </button>
            </header>

            <section className={styles.summary} aria-label={t('sales.panel.commission_label')}>
                <div className={styles.summaryTop}>
                    <span className={styles.summaryLabel}>
                        {periodo.startsWith('y:') ? t('sales.panel.commission_year') : t('sales.panel.commission_month')}
                    </span>
                    <label className={styles.periodPill}>
                        <span>{periodoLabel}</span>
                        <ChevronDown size={14} aria-hidden="true" />
                        <select
                            className={styles.periodSelect}
                            value={periodo}
                            onChange={(e) => setPeriodo(e.target.value)}
                            aria-label={t('sales.panel.period')}
                        >
                            <optgroup label={t('sales.panel.by_month')}>
                                {meses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </optgroup>
                            <optgroup label={t('sales.panel.by_year')}>
                                {anios.map(y => <option key={y} value={`y:${y}`}>{t('sales.panel.whole_year', { year: y })}</option>)}
                            </optgroup>
                        </select>
                    </label>
                </div>
                <span className={styles.commission}>{loading || comision == null ? '—' : formatCurrency(comision)}</span>
                <div className={styles.summaryStats}>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>{loading ? '—' : ventasPeriodo.length}</span>
                        <span className={styles.statLabel}>{t('sales.panel.stat_sales', { count: ventasPeriodo.length })}</span>
                    </div>
                    <span className={styles.statDivider} aria-hidden="true" />
                    <div className={styles.stat}>
                        <span className={`${styles.statValue} ${styles.statAccent}`}>{loading ? '—' : formatCurrency(porCobrar)}</span>
                        <span className={styles.statLabel}>{t('sales.panel.stat_to_collect')}</span>
                    </div>
                </div>
            </section>

            {datosPago.length > 0 && (
                <section className={styles.share}>
                    <SectionLabel>{t('sales.panel.share_title')}</SectionLabel>
                    {[datosPago.filter(d => !d.secondary), datosPago.filter(d => d.secondary)]
                        .filter(grupo => grupo.length)
                        .map((grupo, i) => (
                            <div key={i} className={`${styles.shareChips} ${i ? styles.shareChipsSecondary : ''}`}>
                                {grupo.map(d => (
                                    <button
                                        key={d.key}
                                        type="button"
                                        className={`${styles.shareChip} ${d.secondary ? styles.shareChipSecondary : ''}`}
                                        onClick={() => handleCopy(d.value)}
                                        title={d.title || d.value}
                                        aria-label={t('sales.panel.copy_item', { item: d.title || d.label })}
                                    >
                                        <Copy size={14} aria-hidden="true" />
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        ))}
                </section>
            )}

            <section className={styles.sales}>
                <h2 className={styles.salesTitle}>{t('sales.panel.my_sales')}</h2>
                <ChipGroup
                    size="sm"
                    label={t('sales.panel.my_sales')}
                    value={filtro}
                    onChange={setFiltro}
                    options={Object.keys(FILTROS).map(key => ({
                        value: key,
                        label: t(`sales.panel.filter_${key}`),
                        count: ventasPeriodo.filter(FILTROS[key]).length,
                    }))}
                />

                {loading && <div className={styles.empty}>{t('sales.panel.loading')}</div>}
                {!loading && ventasVisibles.length === 0 && (
                    <div className={styles.empty}>{t('sales.panel.empty_sales')}</div>
                )}

                {ventasVisibles.map((venta) => {
                    const precio = Number(venta.precio_acordado || 0)
                    const pagado = Number(venta.total_pagado || 0)
                    const saldo = Number(venta.saldo_pendiente || 0)
                    return (
                        <button key={venta.venta_id} type="button" className={styles.ventaCard} onClick={() => onOpenCobro(venta)}>
                            <div className={styles.ventaTop}>
                                <div className={styles.ventaText}>
                                    <span className={styles.ventaEvento}>{venta.evento || '—'}</span>
                                    <span className={styles.ventaMeta}>
                                        {[venta.plan, venta.fecha_venta && dayjs(venta.fecha_venta).format('D MMM')].filter(Boolean).join(' · ')}
                                    </span>
                                </div>
                                <StatusPill estado={venta.estado_pago} label={t(`sales.panel.status_${venta.estado_pago}`, venta.estado_pago)} />
                            </div>
                            <div className={styles.ventaProgress}>
                                <ProgressBar pct={precio > 0 ? (pagado / precio) * 100 : 0} color={estadoBar(venta.estado_pago)} />
                                <div className={styles.ventaAmounts}>
                                    <span>{t('sales.panel.paid_of', { paid: formatCurrency(pagado), total: formatCurrency(precio) })}</span>
                                    <strong className={saldo > 0 ? '' : styles.paid}>
                                        {saldo > 0 ? t('sales.panel.balance', { amount: formatCurrency(saldo) }) : t('sales.panel.fully_paid')}
                                    </strong>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </section>
        </Screen>
    )
}
