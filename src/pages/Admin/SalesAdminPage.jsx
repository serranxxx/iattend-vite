import { useEffect, useMemo, useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Filler,
    Legend,
    Tooltip as ChartTooltip,
} from 'chart.js'
import { Segmented, Select, Table, Tag, Dropdown, Button, Modal, Form, Input, InputNumber, DatePicker, Upload, Tooltip, message } from 'antd'
import { ChevronDown, SlidersHorizontal, UserPlus, ReceiptText, Wallet, Upload as UploadIcon } from 'lucide-react'
import { HeaderBuild } from '../../modules/Header/Header'
import {
    fetchAdminVentas,
    updateAdminVenta,
    fetchAdminVendedores,
    createAdminVendedor,
    searchAdminInvitations,
    createAdminVentaManual,
    registrarAdminPago,
    subirAdminComprobante,
} from './salesAdminApi'
import styles from './SalesAdminPage.module.css'

const MODAL_PADDING_STYLES = {
    header: { padding: 24, paddingBottom: 0 },
    body: { padding: 24 },
    footer: { padding: 24, paddingTop: 0 },
}

const METODOS_PAGO = [
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'stripe', label: 'Stripe' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'otro', label: 'Otro' },
]

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Legend, ChartTooltip)

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const ESTADO_LABEL = {
    completo: 'completo',
    apartado: 'apartado',
    sin_pago: 'sin pago',
}

const formatCurrency = (value) =>
    `$${Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

const IVA_RATE = 0.16
const COMISION_POR_VENTA_PRO = 1000
const COMISION_POR_VENTA_LITE = 750
const COMISION_MONTO_MINIMO = 1000
const PUNTO_EQUILIBRIO_NETO = 15318

// Ventas antes de esta fecha son legacy: no pagan IVA ni comisión, para mantener
// el margen ya acordado con esos clientes.
const CUTOFF_IVA_COMISION = new Date('2026-07-01T00:00:00')

// Paulina Pérez tiene un esquema de comisión distinto al resto de los vendedores:
// sus primeras 3 ventas elegibles del mes no comisionan, y a partir de la 4ta
// comisiona normal. Además recibe bonos fijos al llegar a ciertos hitos de ventas —
// pero esos hitos se cuentan sobre el total GENERAL de invitaciones del mes
// (todos los vendedores juntos), no solo las que ella vendió.
const VENDEDOR_ESPECIAL_ID = '5eb35f6b-38c9-4ffd-a063-447b02a94e24'
const VENTAS_SIN_COMISION_ESPECIAL = 3
const BONO_ESPECIAL_MONTO = 1000
const BONO_ESPECIAL_HITOS = [8, 12, 16]

const comisionBaseVenta = (venta) =>
    venta.plan === 'Lite' ? COMISION_POR_VENTA_LITE : COMISION_POR_VENTA_PRO

// Devuelve un Map<venta_id, { bruto, iva, comision }>. Las ventas elegibles
// (posteriores al corte y con precio_acordado >= $1,000) se agrupan de dos formas:
// por vendedor + mes calendario (para el conteo de "primeras 3" de Paulina), y por
// mes calendario general (para los hitos de bono, que dependen del total de la
// compañía). Ambos agrupamientos son mensuales, sin importar si el panel está
// mostrando un mes o el año completo.
const calcularCargosPorVenta = (ventas) => {
    const cargosPorVentaId = new Map()
    const gruposPorVendedor = new Map()
    const gruposGenerales = new Map()

    ventas.forEach(v => {
        const fecha = new Date(v.fecha_venta)
        const bruto = Number(v.precio_acordado || 0)

        if (fecha < CUTOFF_IVA_COMISION) {
            cargosPorVentaId.set(v.venta_id, { bruto, iva: 0, comision: 0 })
            return
        }

        const iva = bruto - bruto / (1 + IVA_RATE)
        cargosPorVentaId.set(v.venta_id, { bruto, iva, comision: 0 })

        if (bruto < COMISION_MONTO_MINIMO) return

        const mesKey = `${fecha.getFullYear()}-${fecha.getMonth()}`

        const vendedorKey = `${v.vendedor_id}-${mesKey}`
        if (!gruposPorVendedor.has(vendedorKey)) gruposPorVendedor.set(vendedorKey, [])
        gruposPorVendedor.get(vendedorKey).push(v)

        if (!gruposGenerales.has(mesKey)) gruposGenerales.set(mesKey, [])
        gruposGenerales.get(mesKey).push(v)
    })

    gruposPorVendedor.forEach(grupoVentas => {
        const ordenadas = [...grupoVentas].sort((a, b) => new Date(a.fecha_venta) - new Date(b.fecha_venta))
        const esEspecial = ordenadas[0]?.vendedor_id === VENDEDOR_ESPECIAL_ID

        ordenadas.forEach((v, i) => {
            const ordinal = i + 1
            const cargos = cargosPorVentaId.get(v.venta_id)
            cargos.comision = (esEspecial && ordinal <= VENTAS_SIN_COMISION_ESPECIAL)
                ? 0
                : comisionBaseVenta(v)
        })
    })

    gruposGenerales.forEach(grupoVentas => {
        const ordenadas = [...grupoVentas].sort((a, b) => new Date(a.fecha_venta) - new Date(b.fecha_venta))

        ordenadas.forEach((v, i) => {
            const ordinal = i + 1
            if (BONO_ESPECIAL_HITOS.includes(ordinal)) {
                cargosPorVentaId.get(v.venta_id).comision += BONO_ESPECIAL_MONTO
            }
        })
    })

    return cargosPorVentaId
}

const now = new Date()

export const SalesAdminPage = () => {
    const [activeView, setActiveView] = useState('ventas')
    const [mode, setMode] = useState('mes')
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)

    const [ventas, setVentas] = useState([])
    const [loading, setLoading] = useState(true)

    const [filterVendedorId, setFilterVendedorId] = useState(null)
    const [filterPlan, setFilterPlan] = useState(null)
    const [filterEstado, setFilterEstado] = useState('all')
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [rankingOpen, setRankingOpen] = useState(false)

    const [editingVenta, setEditingVenta] = useState(null)
    const [form] = Form.useForm()

    const [vendedores, setVendedores] = useState([])
    const [newVendedorOpen, setNewVendedorOpen] = useState(false)
    const [createdVendedor, setCreatedVendedor] = useState(null)
    const [vendedorForm] = Form.useForm()

    const [manualSaleOpen, setManualSaleOpen] = useState(false)
    const [manualForm] = Form.useForm()
    const [invitationOptions, setInvitationOptions] = useState([])
    const [searchingInvitations, setSearchingInvitations] = useState(false)
    const searchDebounceRef = useRef(null)

    const [payingVenta, setPayingVenta] = useState(null)
    const [payForm] = Form.useForm()
    const [payFile, setPayFile] = useState(null)

    const load = async () => {
        setLoading(true)
        try {
            const { data } = await fetchAdminVentas({
                anio: year,
                mes: mode === 'mes' ? month : undefined,
            })
            setVentas(data?.ventas || [])
        } catch (err) {
            message.error(err.response?.data?.msg || 'No se pudieron cargar las ventas')
        } finally {
            setLoading(false)
        }
    }

    const loadVendedores = async () => {
        try {
            const { data } = await fetchAdminVendedores()
            setVendedores(data?.vendedores || [])
        } catch (err) {
            message.error(err.response?.data?.msg || 'No se pudieron cargar los vendedores')
        }
    }

    useEffect(() => {
        load()
    }, [mode, year, month])

    useEffect(() => {
        loadVendedores()
    }, [])

    const vendedorOptions = useMemo(
        () => vendedores.map(v => ({ value: v.id, label: v.nombre })),
        [vendedores]
    )

    const handleCreateVendedor = async () => {
        const values = await vendedorForm.validateFields()
        try {
            const { data } = await createAdminVendedor(values)
            message.success('Vendedor creado')
            setNewVendedorOpen(false)
            vendedorForm.resetFields()
            setVendedores(prev => [...prev, data.vendedor])
            setCreatedVendedor(data.vendedor)
        } catch (err) {
            message.error(err.response?.data?.msg || 'No se pudo crear el vendedor')
        }
    }

    const handleSearchInvitations = (q) => {
        clearTimeout(searchDebounceRef.current)

        if (!q || q.trim().length < 3) {
            setInvitationOptions([])
            return
        }

        searchDebounceRef.current = setTimeout(async () => {
            setSearchingInvitations(true)
            try {
                const { data } = await searchAdminInvitations(q.trim())
                setInvitationOptions((data?.invitations || []).map(inv => {
                    const evento = Array.isArray(inv.owners) && inv.owners.length
                        ? inv.owners.join(' & ')
                        : inv.name
                    return {
                        value: inv.id,
                        label: `${evento} — ${inv.user_email || 'sin correo'} (${inv.name})`,
                        plan: inv.plan,
                    }
                }))
            } catch (err) {
                message.error(err.response?.data?.msg || 'No se pudo buscar invitaciones')
            } finally {
                setSearchingInvitations(false)
            }
        }, 400)
    }

    const handleSelectInvitation = (invitationId) => {
        const selected = invitationOptions.find(o => o.value === invitationId)
        if (selected?.plan) {
            manualForm.setFieldValue('plan', selected.plan.toUpperCase() === 'PRO' ? 'PRO' : 'Lite')
        }
    }

    const handleCreateManualSale = async () => {
        const values = await manualForm.validateFields()
        try {
            await createAdminVentaManual({
                ...values,
                fecha_venta: values.fecha_venta ? values.fecha_venta.toISOString() : undefined,
            })
            message.success('Venta registrada')
            setManualSaleOpen(false)
            manualForm.resetFields()
            setInvitationOptions([])
            load()
        } catch (err) {
            message.error(err.response?.data?.msg || 'No se pudo registrar la venta')
        }
    }

    const openPay = (venta) => {
        setPayingVenta(venta)
        setPayFile(null)
        payForm.resetFields()
    }

    const handleRegistrarPago = async () => {
        const values = await payForm.validateFields()
        try {
            const { data } = await registrarAdminPago({
                venta_id: payingVenta.venta_id,
                monto: values.monto,
                metodo: values.metodo,
            })

            if (payFile) {
                try {
                    await subirAdminComprobante(data.pago_id, payFile)
                } catch {
                    message.warning('El abono se guardó pero no se pudo subir el comprobante')
                }
            }

            message.success('Abono registrado')
            setPayingVenta(null)
            setPayFile(null)
            load()
        } catch (err) {
            message.error(err.response?.data?.msg || 'No se pudo registrar el abono')
        }
    }

    const filteredVentas = useMemo(() => ventas.filter(v => {
        if (filterVendedorId && v.vendedor_id !== filterVendedorId) return false
        if (filterPlan && v.plan !== filterPlan) return false
        if (filterEstado === 'pending' && v.estado_pago === 'completo') return false
        if (filterEstado === 'completo' && v.estado_pago !== 'completo') return false
        return true
    }), [ventas, filterVendedorId, filterPlan, filterEstado])

    const cargosPorVenta = useMemo(() => calcularCargosPorVenta(ventas), [ventas])

    const kpis = useMemo(() => {
        const ventasCount = ventas.length
        const proCount = ventas.filter(v => v.plan === 'PRO').length
        const liteCount = ventas.filter(v => v.plan === 'Lite').length

        let ingresoBruto = 0
        let iva = 0
        let comisiones = 0
        ventas.forEach(v => {
            const cargos = cargosPorVenta.get(v.venta_id)
            ingresoBruto += cargos.bruto
            iva += cargos.iva
            comisiones += cargos.comision
        })
        const ingresoNeto = ingresoBruto - iva - comisiones

        const saldoPendiente = ventas.reduce((sum, v) => sum + Number(v.saldo_pendiente || 0), 0)
        const ventasConApartado = ventas.filter(v => v.estado_pago === 'apartado').length

        return { ventasCount, proCount, liteCount, ingresoBruto, iva, comisiones, ingresoNeto, saldoPendiente, ventasConApartado }
    }, [ventas, cargosPorVenta])

    const comprobantesPendientes = useMemo(
        () => ventas.filter(v => v.abonos_sin_comprobante > 0),
        [ventas]
    )

    const ranking = useMemo(() => {
        const byVendedor = new Map()
        ventas.forEach(v => {
            if (!v.vendedor_id) return
            const entry = byVendedor.get(v.vendedor_id) || { nombre: v.vendedor, ventas: 0, ingreso: 0 }
            entry.ventas += 1
            entry.ingreso += Number(v.precio_acordado || 0)
            byVendedor.set(v.vendedor_id, entry)
        })
        return Array.from(byVendedor.values()).sort((a, b) => b.ventas - a.ventas)
    }, [ventas])

    const chartData = useMemo(() => {
        if (mode === 'mes') {
            const daysInMonth = new Date(year, month, 0).getDate()
            const netoPorDia = Array(daysInMonth).fill(0)
            ventas.forEach(v => {
                const day = new Date(v.fecha_venta).getDate()
                if (day >= 1 && day <= daysInMonth) {
                    const cargos = cargosPorVenta.get(v.venta_id)
                    netoPorDia[day - 1] += cargos.bruto - cargos.iva - cargos.comision
                }
            })
            let acc = 0
            const acumulado = netoPorDia.map(neto => (acc += neto))
            return { labels: Array.from({ length: daysInMonth }, (_, i) => i + 1), data: acumulado }
        }

        const netoPorMes = Array(12).fill(0)
        ventas.forEach(v => {
            const m = new Date(v.fecha_venta).getMonth()
            const cargos = cargosPorVenta.get(v.venta_id)
            netoPorMes[m] += cargos.bruto - cargos.iva - cargos.comision
        })
        let acc = 0
        const acumulado = netoPorMes.map(neto => (acc += neto))
        return { labels: MESES.map(m => m.slice(0, 3)), data: acumulado }
    }, [ventas, cargosPorVenta, mode, year, month])

    const openEdit = (venta) => {
        setEditingVenta(venta)
        form.setFieldsValue({
            precio_acordado: venta.precio_acordado,
            plan: venta.plan,
            vendedor_id: venta.vendedor_id,
        })
    }

    const handleSaveEdit = async () => {
        const values = await form.validateFields()
        try {
            await updateAdminVenta(editingVenta.venta_id, values)
            message.success('Venta actualizada')
            setEditingVenta(null)
            load()
        } catch (err) {
            message.error(err.response?.data?.msg || 'No se pudo actualizar la venta')
        }
    }

    const columns = [
        { title: 'Evento', dataIndex: 'evento', key: 'evento' },
        { title: 'Vendedor', dataIndex: 'vendedor', key: 'vendedor' },
        { title: 'Plan', dataIndex: 'plan', key: 'plan' },
        { title: 'Acordado', dataIndex: 'precio_acordado', key: 'precio_acordado', align: 'right', render: formatCurrency },
        { title: 'Pagado', dataIndex: 'total_pagado', key: 'total_pagado', align: 'right', render: formatCurrency },
        {
            title: 'Saldo', dataIndex: 'saldo_pendiente', key: 'saldo_pendiente', align: 'right',
            render: (value) => <span className={value > 0 ? styles.saldoDebt : ''}>{formatCurrency(value)}</span>,
        },
        {
            title: 'Pago', dataIndex: 'estado_pago', key: 'estado_pago', align: 'center',
            render: (estado) => (
                <Tag color={estado === 'completo' ? 'success' : estado === 'apartado' ? 'warning' : 'default'}>
                    {ESTADO_LABEL[estado] || estado}
                </Tag>
            ),
        },
        {
            title: 'Comprobante', dataIndex: 'abonos_sin_comprobante', key: 'abonos_sin_comprobante', align: 'center',
            render: (count, record) => {
                if (!record.total_pagado) return <Tag>sin abonos</Tag>
                return count > 0
                    ? <Tag color="error">falta {count}</Tag>
                    : <Tag color="success">ok</Tag>
            },
        },
        {
            title: '', key: 'actions', align: 'center',
            render: (_, record) => (
                <span className={styles.rowActions}>
                    <Button size="small" type="text" onClick={() => openEdit(record)}>✎</Button>
                    <Button size="small" type="text" icon={<Wallet size={14} />} onClick={() => openPay(record)} />
                </span>
            ),
        },
    ]

    const vendedorColumns = [
        { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
        {
            title: 'Tipo', dataIndex: 'tipo', key: 'tipo',
            render: (tipo) => <Tag color={tipo === 'interno' ? 'blue' : 'default'}>{tipo}</Tag>,
        },
        { title: 'Teléfono', dataIndex: 'telefono', key: 'telefono', render: (v) => v || '—' },
        { title: 'Correo', dataIndex: 'email', key: 'email', render: (v) => v || '—' },
        { title: 'Descuento máx.', dataIndex: 'descuento_max_pct', key: 'descuento_max_pct', align: 'right', render: (v) => `${v}%` },
        {
            title: 'Código de acceso', dataIndex: 'codigo_acceso', key: 'codigo_acceso',
            render: (codigo) => (
                <span className={styles.codigoAccesoInline}>
                    {codigo}
                    <Button
                        size="small"
                        type="text"
                        onClick={() => { navigator.clipboard.writeText(codigo); message.success('Copiado') }}
                    >
                        copiar
                    </Button>
                </span>
            ),
        },
        {
            title: 'Estado', dataIndex: 'activo', key: 'activo', align: 'center',
            render: (activo) => <Tag color={activo ? 'success' : 'default'}>{activo ? 'activo' : 'inactivo'}</Tag>,
        },
    ]

    return (
        <div className={styles.page}>
            <HeaderBuild position="admin-sales" />

            <div className={styles.container}>
                <div className={styles.headerRow}>
                    <div>
                        <div className={styles.title}>Ingresos y comisiones</div>
                        <div className={styles.subtitle}>Panel interno — solo admin</div>
                    </div>
                    <div className={styles.headerControls}>
                        <Segmented
                            value={activeView}
                            onChange={setActiveView}
                            options={[{ label: 'Ventas', value: 'ventas' }, { label: 'Vendedores', value: 'vendedores' }]}
                        />
                        {activeView === 'ventas' && (
                            <>
                                <Segmented
                                    value={mode}
                                    onChange={setMode}
                                    options={[{ label: 'Mes', value: 'mes' }, { label: 'Año completo', value: 'ano' }]}
                                />
                                {mode === 'mes' && (
                                    <Select
                                        value={month}
                                        onChange={setMonth}
                                        options={MESES.map((m, i) => ({ value: i + 1, label: m }))}
                                        style={{ width: 140 }}
                                    />
                                )}
                                <Select
                                    value={year}
                                    onChange={setYear}
                                    options={[year - 1, year, year + 1].map(y => ({ value: y, label: String(y) }))}
                                    style={{ width: 100 }}
                                />
                            </>
                        )}
                    </div>
                </div>

                {activeView === 'vendedores' ? (
                    <>
                        <div className={styles.vendedoresHeader}>
                            <div className={styles.tableLabel}>Vendedores</div>
                            <Button
                                icon={<UserPlus size={14} />}
                                onClick={() => setNewVendedorOpen(true)}
                                className={styles.addVendedorBtn}
                            >
                                Agregar vendedor
                            </Button>
                        </div>
                        <Table
                            rowKey="id"
                            columns={vendedorColumns}
                            dataSource={vendedores}
                            pagination={false}
                        />
                    </>
                ) : (
                <>
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Ventas del {mode === 'mes' ? 'mes' : 'año'}</div>
                        <div className={styles.statValue}>{kpis.ventasCount}</div>
                        <div className={styles.statSub}>{kpis.proCount} PRO · {kpis.liteCount} Lite</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Ingreso bruto</div>
                        <div className={styles.statValue}>{formatCurrency(kpis.ingresoBruto)}</div>
                        <div className={styles.statSub}>todos los ingresos</div>
                    </div>
                    <Tooltip
                        title={
                            <div>
                                <div>IVA: {formatCurrency(kpis.iva)}</div>
                                <div>Comisiones: {formatCurrency(kpis.comisiones)}</div>
                            </div>
                        }
                    >
                        <div className={`${styles.statCard} ${styles.statCardHover}`}>
                            <div className={styles.statLabel}>Ingreso neto</div>
                            <div className={styles.statValue}>{formatCurrency(kpis.ingresoNeto)}</div>
                            <div className={styles.statSub}>bruto − IVA − comisiones</div>
                        </div>
                    </Tooltip>
                    <div className={`${styles.statCard} ${styles.statCardWarn}`}>
                        <div className={styles.statLabelWarn}>Saldo pendiente por cobrar</div>
                        <div className={styles.statValueWarn}>{formatCurrency(kpis.saldoPendiente)}</div>
                        <div className={styles.statSubWarn2}>{kpis.ventasConApartado} ventas con apartado</div>
                    </div>
                </div>

                <div className={styles.chartHeader}>
                    <div className={styles.chartTitle}>Ingreso neto acumulado {mode === 'mes' ? 'en el mes' : 'en el año'}</div>
                </div>
                <div className={styles.chartWrapper}>
                    <Line
                        data={{
                            labels: chartData.labels,
                            datasets: [
                                {
                                    label: 'Ingreso neto acumulado',
                                    data: chartData.data,
                                    borderColor: '#16323d',
                                    backgroundColor: 'rgba(22,50,61,0.08)',
                                    fill: true,
                                    tension: 0.25,
                                    pointRadius: 0,
                                    borderWidth: 2,
                                },
                                ...(mode === 'mes' ? [{
                                    label: `Punto de equilibrio (${formatCurrency(PUNTO_EQUILIBRIO_NETO)})`,
                                    data: Array(chartData.labels.length).fill(PUNTO_EQUILIBRIO_NETO),
                                    borderColor: '#D32F2F',
                                    borderDash: [6, 4],
                                    borderWidth: 1.5,
                                    pointRadius: 0,
                                    fill: false,
                                }] : []),
                            ],
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: mode === 'mes',
                                    position: 'bottom',
                                    labels: { boxWidth: 12, font: { size: 11 } },
                                },
                                tooltip: {
                                    callbacks: {
                                        label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
                                    },
                                },
                            },
                            scales: {
                                y: { beginAtZero: true, ticks: { callback: (value) => formatCurrency(value) } },
                                x: { ticks: { maxRotation: 0, autoSkip: true } },
                            },
                        }}
                    />
                </div>

                <div className={styles.filtersRow}>
                    <Dropdown
                        trigger={['click']}
                        open={filtersOpen}
                        onOpenChange={setFiltersOpen}
                        popupRender={() => (
                            <div className={styles.filtersPanel}>
                                <div className={styles.filterLabel}>Vendedor</div>
                                <Select
                                    allowClear
                                    placeholder="Todos"
                                    value={filterVendedorId}
                                    onChange={setFilterVendedorId}
                                    options={vendedorOptions}
                                    style={{ width: '100%', marginBottom: 10 }}
                                />
                                <div className={styles.filterLabel}>Plan</div>
                                <Select
                                    allowClear
                                    placeholder="Todos"
                                    value={filterPlan}
                                    onChange={setFilterPlan}
                                    options={[{ value: 'PRO', label: 'PRO' }, { value: 'Lite', label: 'Lite' }]}
                                    style={{ width: '100%', marginBottom: 10 }}
                                />
                                <div className={styles.filterLabel}>Estado de pago</div>
                                <Select
                                    value={filterEstado}
                                    onChange={setFilterEstado}
                                    options={[
                                        { value: 'all', label: 'Todos' },
                                        { value: 'pending', label: 'Con saldo pendiente' },
                                        { value: 'completo', label: 'Pagado completo' },
                                    ]}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        )}
                    >
                        <Button icon={<SlidersHorizontal size={14} />}>Filtros <ChevronDown size={14} /></Button>
                    </Dropdown>

                    <div className={styles.filtersRowActions}>
                        <Button
                            icon={<ReceiptText size={14} />}
                            onClick={() => setManualSaleOpen(true)}
                            className={styles.addVendedorBtn}
                        >
                            Registrar venta manual
                        </Button>
                    </div>
                </div>

                {comprobantesPendientes.length > 0 && (
                    <div className={styles.banner}>
                        {comprobantesPendientes.length} ventas tienen al menos un abono sin comprobante subido
                    </div>
                )}

                <div className={styles.tableLabel}>Ventas {mode === 'mes' ? 'del mes' : 'del año'}</div>
                <Table
                    rowKey="venta_id"
                    columns={columns}
                    dataSource={filteredVentas}
                    loading={loading}
                    pagination={false}
                />

                <div className={styles.rankingToggle} onClick={() => setRankingOpen(o => !o)}>
                    <span>Ranking de vendedores (secundario)</span>
                    <ChevronDown size={14} style={{ transform: rankingOpen ? 'rotate(180deg)' : 'none' }} />
                </div>
                {rankingOpen && (
                    <Table
                        rowKey="nombre"
                        size="small"
                        pagination={false}
                        columns={[
                            { title: 'Vendedor', dataIndex: 'nombre', key: 'nombre' },
                            { title: `Ventas ${mode === 'mes' ? 'mes' : 'año'}`, dataIndex: 'ventas', key: 'ventas', align: 'right' },
                            { title: 'Ingreso acordado', dataIndex: 'ingreso', key: 'ingreso', align: 'right', render: formatCurrency },
                        ]}
                        dataSource={ranking}
                    />
                )}
                </>
                )}
            </div>

            <Modal
                open={!!editingVenta}
                onCancel={() => setEditingVenta(null)}
                onOk={handleSaveEdit}
                title="Editar venta"
                okText="Guardar"
                styles={MODAL_PADDING_STYLES}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="precio_acordado" label="Precio acordado" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item name="plan" label="Plan" rules={[{ required: true }]}>
                        <Select options={[{ value: 'PRO', label: 'PRO' }, { value: 'Lite', label: 'Lite' }]} />
                    </Form.Item>
                    <Form.Item name="vendedor_id" label="Vendedor asignado" rules={[{ required: true }]}>
                        <Select options={vendedorOptions} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                open={newVendedorOpen}
                onCancel={() => setNewVendedorOpen(false)}
                onOk={handleCreateVendedor}
                title="Agregar vendedor"
                okText="Crear"
                styles={MODAL_PADDING_STYLES}
            >
                <Form form={vendedorForm} layout="vertical">
                    <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]} initialValue="externo">
                        <Select options={[{ value: 'interno', label: 'Interno' }, { value: 'externo', label: 'Externo' }]} />
                    </Form.Item>
                    <Form.Item name="telefono" label="Teléfono">
                        <Input />
                    </Form.Item>
                    <Form.Item name="email" label="Correo">
                        <Input />
                    </Form.Item>
                    <Form.Item name="descuento_max_pct" label="Descuento máximo (%)" initialValue={0}>
                        <InputNumber style={{ width: '100%' }} min={0} max={100} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                open={!!createdVendedor}
                onCancel={() => setCreatedVendedor(null)}
                onOk={() => setCreatedVendedor(null)}
                footer={null}
                title="Vendedor creado"
                styles={{ header: MODAL_PADDING_STYLES.header, body: { padding: '0 24px 24px' } }}
            >
                <div className={styles.newVendedorResult}>
                    <div className={styles.newVendedorNombre}>{createdVendedor?.nombre}</div>
                    <div className={styles.filterLabel}>Código de acceso</div>
                    <div className={styles.codigoAcceso}>{createdVendedor?.codigo_acceso}</div>
                    <Button
                        onClick={() => {
                            navigator.clipboard.writeText(createdVendedor?.codigo_acceso || '')
                            message.success('Copiado')
                        }}
                    >
                        Copiar código
                    </Button>
                </div>
            </Modal>

            <Modal
                open={manualSaleOpen}
                onCancel={() => { setManualSaleOpen(false); setInvitationOptions([]) }}
                onOk={handleCreateManualSale}
                title="Registrar venta manual"
                okText="Registrar"
                styles={MODAL_PADDING_STYLES}
            >
                <Form form={manualForm} layout="vertical">
                    <Form.Item name="invitation_id" label="Invitación" rules={[{ required: true }]}>
                        <Select
                            showSearch
                            filterOption={false}
                            onSearch={handleSearchInvitations}
                            onChange={handleSelectInvitation}
                            options={invitationOptions}
                            placeholder="Busca por correo o URL del evento (mín. 3 letras)"
                            notFoundContent={searchingInvitations ? 'Buscando…' : 'Sin resultados'}
                        />
                    </Form.Item>
                    <Form.Item name="vendedor_id" label="Vendedor" rules={[{ required: true }]}>
                        <Select options={vendedorOptions} />
                    </Form.Item>
                    <Form.Item name="plan" label="Plan" rules={[{ required: true }]}>
                        <Select options={[{ value: 'PRO', label: 'PRO' }, { value: 'Lite', label: 'Lite' }]} />
                    </Form.Item>
                    <Form.Item name="precio_acordado" label="Precio acordado" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item name="descuento_pct" label="Descuento (%)" initialValue={0}>
                        <InputNumber style={{ width: '100%' }} min={0} max={100} />
                    </Form.Item>
                    <Form.Item name="fecha_venta" label="Fecha de la venta (opcional, para ventas atrasadas)">
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                open={!!payingVenta}
                onCancel={() => setPayingVenta(null)}
                onOk={handleRegistrarPago}
                title="Registrar abono"
                okText="Guardar"
                styles={MODAL_PADDING_STYLES}
            >
                <div className={styles.payVentaSummary}>
                    <div>{payingVenta?.evento}</div>
                    <div className={styles.payVentaSaldo}>Saldo pendiente: {formatCurrency(payingVenta?.saldo_pendiente)}</div>
                </div>
                <Form form={payForm} layout="vertical">
                    <Form.Item name="monto" label="Monto" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item name="metodo" label="Método" rules={[{ required: true }]} initialValue="transferencia">
                        <Select options={METODOS_PAGO} />
                    </Form.Item>
                    <Form.Item label="Comprobante (opcional)">
                        <Upload
                            beforeUpload={(file) => { setPayFile(file); return false }}
                            onRemove={() => setPayFile(null)}
                            maxCount={1}
                            fileList={payFile ? [{ uid: '-1', name: payFile.name }] : []}
                        >
                            <Button icon={<UploadIcon size={14} />}>Subir foto o PDF</Button>
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
