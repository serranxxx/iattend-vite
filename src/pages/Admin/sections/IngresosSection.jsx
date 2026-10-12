import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, DatePicker, Dropdown, Form, Input, InputNumber,  Select, Tooltip, Upload, message } from 'antd'
import { MoreHorizontal, Plus, Upload as UploadIcon } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import {
    createAdminVentaManual, fetchAdminVendedores, fetchAdminVentas, registrarAdminPago,
    searchAdminInvitations, subirAdminComprobante, updateAdminVenta,
} from '../salesAdminApi'
import { AdminModal } from '../AdminModal'
import { MESES, calcularCargosPorVenta, calcularKpis, formatCurrency, netoPromedioPorVenta } from '../ventasCalculos'
import { AcumuladoChart, BarrasPorMes, ComparativaChart, MESES_CORTOS, ProyeccionChart } from './VentasCharts'
import { MetaDelMes } from './MetaDelMes'
import { COLOR_POR_ANIO } from '../adminCharts'
import styles from './VentasSection.module.css'
import iv from './Ingresos.module.css'


const METODOS_PAGO = [
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'stripe', label: 'Stripe' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'otro', label: 'Otro' },
]

dayjs.locale('es')

const ESTILO_POR_POSICION = ['actual', 'previo', 'viejo']

const claveMes = (fecha) => {
    const d = new Date(fecha)
    return `${d.getFullYear()}-${d.getMonth()}`
}

// `vista` distingue las dos pantallas que comparten estos datos y estos modales:
// 'mes' es el panel completo con KPI, gráficas y equilibrio; 'historico' es solo
// la tabla, con todas las ventas registradas. Se resuelven aquí en vez de en dos
// componentes para no duplicar la máquina de editar ventas y registrar abonos.
export const IngresosSection = ({ year, month, onAniosDisponibles, vista = 'mes' }) => {
    const soloHistorico = vista === 'historico'
    // Se traen TODAS las ventas, no solo las del periodo: el rolling de 12 meses
    // y la comparativa anual necesitan histórico, y el volumen es chico.
    const [todas, setTodas] = useState([])
    const [loading, setLoading] = useState(true)
    const [vendedores, setVendedores] = useState([])

    const [cmpYears, setCmpYears] = useState(null)
    const [barYears, setBarYears] = useState(null)
    const [meta, setMeta] = useState(0)
    const [descontarIva, setDescontarIva] = useState(true)
    // Solo afecta al chart de acumulado; el resto de la pantalla es siempre mensual.
    const [acumuladoModo, setAcumuladoModo] = useState('mes')

    const [editingVenta, setEditingVenta] = useState(null)
    const [form] = Form.useForm()

    const [payingVenta, setPayingVenta] = useState(null)
    const [payForm] = Form.useForm()
    const [payFile, setPayFile] = useState(null)

    const [manualSaleOpen, setManualSaleOpen] = useState(false)
    const [manualForm] = Form.useForm()
    const [invitationOptions, setInvitationOptions] = useState([])
    const [searchingInvitations, setSearchingInvitations] = useState(false)
    const searchDebounceRef = useRef(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await fetchAdminVentas({})
            setTodas(data.ventas || [])
        } catch (error) {
            console.error('Error al cargar ventas:', error)
            message.error('No se pudieron cargar las ventas')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        fetchAdminVendedores()
            .then(({ data }) => setVendedores(data.vendedores || []))
            .catch(error => console.error('Error al cargar vendedores:', error))
    }, [])

    const vendedorOptions = useMemo(
        () => vendedores.map(v => ({ value: v.id, label: v.nombre })),
        [vendedores]
    )

    // ------------------------------------------------------------- series ---

    const cargos = useMemo(() => calcularCargosPorVenta(todas), [todas])

    const netoDe = useCallback((venta) => {
        const c = cargos.get(venta.venta_id)
        return c ? c.bruto - c.iva - c.comision : 0
    }, [cargos])

    // Variante sin descontar IVA, para el switch del acumulado. La comisión sí
    // se sigue restando: es dinero que efectivamente sale.
    const netoDeSinIva = useCallback((venta) => {
        const c = cargos.get(venta.venta_id)
        return c ? c.bruto - c.comision : 0
    }, [cargos])

    const anios = useMemo(() => {
        const set = new Set(todas.map(v => new Date(v.fecha_venta).getFullYear()))
        set.add(new Date().getFullYear())
        return [...set].sort((a, b) => b - a)
    }, [todas])

    useEffect(() => {
        onAniosDisponibles?.(anios)
    }, [anios, onAniosDisponibles])

    // Los tres años más recientes arrancan encendidos en la comparativa.
    const aniosComparativa = cmpYears ?? anios.slice(0, 3)

    // El histórico ignora el selector de periodo: son todas, de la más nueva a
    // la más vieja.
    const historico = useMemo(
        () => [...todas].sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta)),
        [todas],
    )

    const ventasDelPeriodo = useMemo(() => todas.filter(v => {
        const d = new Date(v.fecha_venta)
        if (d.getFullYear() !== year) return false
        return d.getMonth() + 1 === month
    }), [todas, year, month])

    const filasDeLaTabla = soloHistorico ? historico : ventasDelPeriodo

    const kpis = useMemo(() => calcularKpis(ventasDelPeriodo, cargos), [ventasDelPeriodo, cargos])

    // El saldo por cobrar no es del mes: lo que se debe se sigue debiendo aunque
    // cambie el periodo. Se acumula sobre el año completo seleccionado.
    const ventasDelAnio = useMemo(
        () => todas.filter(v => new Date(v.fecha_venta).getFullYear() === year),
        [todas, year]
    )

    // KPIs del año completo: van en chico junto al número del mes.
    const kpisAnuales = useMemo(() => calcularKpis(ventasDelAnio, cargos), [ventasDelAnio, cargos])

    const saldoAnual = useMemo(() => {
        // Del más grande al más chico: la lista es para decidir a quién cobrar.
        const detalle = ventasDelAnio
            .filter(v => Number(v.saldo_pendiente || 0) > 0)
            .sort((a, b) => Number(b.saldo_pendiente) - Number(a.saldo_pendiente))

        return {
            monto: ventasDelAnio.reduce((acc, v) => acc + Number(v.saldo_pendiente || 0), 0),
            ventas: ventasDelAnio.filter(v => v.estado_pago === 'apartado').length,
            detalle,
        }
    }, [ventasDelAnio])

    const netoPorMesSinIva = useMemo(() => {
        const mapa = new Map()
        todas.forEach(v => {
            const k = claveMes(v.fecha_venta)
            mapa.set(k, (mapa.get(k) || 0) + netoDeSinIva(v))
        })
        return mapa
    }, [todas, netoDeSinIva])

    const netoPorMes = useMemo(() => {
        const mapa = new Map()
        todas.forEach(v => {
            const k = claveMes(v.fecha_venta)
            mapa.set(k, (mapa.get(k) || 0) + netoDe(v))
        })
        return mapa
    }, [todas, netoDe])

    // Conteo de ventas por mes, en paralelo al neto: la proyección se reporta en
    // pesos y también en invitaciones.
    const ventasPorMes = useMemo(() => {
        const mapa = new Map()
        todas.forEach(v => {
            const k = claveMes(v.fecha_venta)
            mapa.set(k, (mapa.get(k) || 0) + 1)
        })
        return mapa
    }, [todas])

    // Proyección anual: a qué cierre llega el año si se mantiene el ritmo. Para
    // cada mes cerrado se toma el promedio mensual acumulado hasta ahí y se lleva
    // a 12. La curva arranca ruidosa (un mes bueno dispara la proyección) y se
    // aplana conforme avanza el año, que es justo lo que se quiere leer.
    //
    // Antes esta tarjeta mostraba la suma móvil de 12 meses: como siempre crece,
    // se leía igual que el acumulado de al lado y no aportaba nada distinto.
    const proyeccionDe = useCallback((anio) => {
        const hoy = new Date()
        const ultimoMesCerrado = anio === hoy.getFullYear() ? hoy.getMonth() : 11

        const valores = []
        let netoAcc = 0
        let ventasAcc = 0

        for (let m = 0; m <= ultimoMesCerrado; m++) {
            netoAcc += netoPorMes.get(`${anio}-${m}`) || 0
            ventasAcc += ventasPorMes.get(`${anio}-${m}`) || 0
            valores.push((netoAcc / (m + 1)) * 12)
        }

        return {
            anio,
            valores,
            cierreEstimado: valores[valores.length - 1] ?? 0,
            invitaciones: Math.round((ventasAcc / (ultimoMesCerrado + 1)) * 12),
            mesesCerrados: ultimoMesCerrado + 1,
        }
    }, [netoPorMes, ventasPorMes])

    // Los tres años más recientes arrancan disponibles; solo el actual encendido.
    const [proyYears, setProyYears] = useState(null)
    const aniosProyeccion = proyYears ?? [year]

    const proyeccion = useMemo(() => {
        const series = aniosProyeccion
            .map(a => ({ ...proyeccionDe(a), estilo: ESTILO_POR_POSICION[anios.indexOf(a)] ?? 'viejo' }))
            .sort((a, b) => b.anio - a.anio)

        // El encabezado siempre reporta el año seleccionado en la barra de
        // control, esté o no encendido su chip.
        const principal = proyeccionDe(year)
        const anioPrevio = year - 1
        const totalPrevio = Array.from({ length: 12 }, (_, m) => netoPorMes.get(`${anioPrevio}-${m}`) || 0)
            .reduce((a, b) => a + b, 0)

        return {
            series,
            labels: MESES_CORTOS,
            principal,
            anioPrevio,
            totalPrevio,
            delta: totalPrevio > 0 ? ((principal.cierreEstimado - totalPrevio) / totalPrevio) * 100 : 0,
        }
    }, [aniosProyeccion, anios, proyeccionDe, year, netoPorMes])

    const toggleAnioProyeccion = (anio) => {
        const siguiente = aniosProyeccion.includes(anio)
            ? aniosProyeccion.filter(a => a !== anio)
            : [...aniosProyeccion, anio]
        // Mínimo un año encendido: un chart sin series no dice nada.
        if (siguiente.length === 0) return
        setProyYears(siguiente)
    }

    // El acumulado se puede ver por día dentro del mes o por mes dentro del año,
    // y en ambos casos encimando varios años para comparar.
    const acumuladoDe = useCallback((anio) => {
        const valorDe = descontarIva ? netoDe : netoDeSinIva

        if (acumuladoModo === 'anio') {
            const hoy = new Date()
            const mapaMensual = descontarIva ? netoPorMes : netoPorMesSinIva
            const ultimoMesCerrado = anio === hoy.getFullYear() ? hoy.getMonth() : 11

            let acc = 0
            const valores = Array.from({ length: ultimoMesCerrado + 1 },
                (_, m) => (acc += mapaMensual.get(`${anio}-${m}`) || 0))
            return { anio, valores, total: valores[valores.length - 1] ?? 0 }
        }

        const dias = new Date(anio, month, 0).getDate()
        const porDia = Array(dias).fill(0)

        todas.forEach(v => {
            const d = new Date(v.fecha_venta)
            if (d.getFullYear() !== anio || d.getMonth() + 1 !== month) return
            porDia[d.getDate() - 1] += valorDe(v)
        })

        let acc = 0
        const valores = porDia.map(n => (acc += n))
        return { anio, valores, total: valores[valores.length - 1] ?? 0 }
    }, [acumuladoModo, descontarIva, todas, month, netoDe, netoDeSinIva, netoPorMes, netoPorMesSinIva])

    const [acumYears, setAcumYears] = useState(null)
    const aniosAcumulado = acumYears ?? [year]

    const acumulado = useMemo(() => {
        const series = aniosAcumulado
            .map(a => ({ ...acumuladoDe(a), estilo: ESTILO_POR_POSICION[anios.indexOf(a)] ?? 'viejo' }))
            .sort((a, b) => b.anio - a.anio)

        if (acumuladoModo === 'anio') {
            const hoy = new Date()
            const ultimoMesCerrado = year === hoy.getFullYear() ? hoy.getMonth() : 11
            const labels = MESES_CORTOS.slice(0, ultimoMesCerrado + 1)
            return { series, labels, eje: labels, total: acumuladoDe(year).total }
        }

        const dias = new Date(year, month, 0).getDate()
        return {
            series,
            labels: Array.from({ length: dias }, (_, i) => `Día ${i + 1}`),
            eje: [1, 7, 14, 21, dias].map(String),
            total: acumuladoDe(year).total,
        }
    }, [aniosAcumulado, anios, acumuladoDe, acumuladoModo, year, month])

    // En vista anual la referencia del chart es el equilibrio del año: se asume el mismo
    // gasto fijo los 12 meses, que es lo único proyectable con un periodo capturado.
    const metaDelChart = acumuladoModo === 'anio' ? meta * 12 : meta

    const toggleAnioAcumulado = (anio) => {
        const siguiente = aniosAcumulado.includes(anio)
            ? aniosAcumulado.filter(a => a !== anio)
            : [...aniosAcumulado, anio]
        if (siguiente.length === 0) return
        setAcumYears(siguiente)
    }

    // El ingreso que se compara contra el equilibrio sigue al switch de IVA,
    // para que esa tarjeta y la del acumulado cuenten lo mismo.
    const ingresoContraMeta = useMemo(() => {
        const valorDe = descontarIva ? netoDe : netoDeSinIva
        return ventasDelPeriodo.reduce((acc, v) => acc + valorDe(v), 0)
    }, [ventasDelPeriodo, descontarIva, netoDe, netoDeSinIva])

    const aniosBarras = barYears ?? [year]

    const barras = useMemo(() => {
        const series = aniosBarras
            .map(anio => {
                const conteo = Array(12).fill(0)
                let neto = 0

                todas.forEach(v => {
                    const d = new Date(v.fecha_venta)
                    if (d.getFullYear() !== anio) return
                    conteo[d.getMonth()] += 1
                    neto += netoDe(v)
                })

                return {
                    anio,
                    valores: conteo,
                    total: conteo.reduce((a, b) => a + b, 0),
                    neto,
                    estilo: ESTILO_POR_POSICION[anios.indexOf(anio)] ?? 'viejo',
                }
            })
            .sort((a, b) => b.anio - a.anio)

        return { series }
    }, [aniosBarras, anios, todas, netoDe])

    // Neto por venta real: promedio del mes de la calculadora. Si ese mes todavía
    // no tiene ventas cae al mes anterior, y si tampoco hay, la calculadora usa
    // el `neto_venta` guardado como último recurso.
    const netoPromedio = useMemo(() => {
        const enMes = (anio, mesIndex) => todas.filter(v => {
            const d = new Date(v.fecha_venta)
            return d.getFullYear() === anio && d.getMonth() === mesIndex
        })

        const delMes = enMes(year, month - 1)
        if (delMes.length) {
            return {
                valor: netoPromedioPorVenta(delMes, cargos),
                fuente: `promedio de ${delMes.length} ${delMes.length === 1 ? 'venta' : 'ventas'} de ${MESES[month - 1].toLowerCase()}`,
            }
        }

        const anterior = new Date(year, month - 2, 1)
        const delAnterior = enMes(anterior.getFullYear(), anterior.getMonth())
        if (delAnterior.length) {
            return {
                valor: netoPromedioPorVenta(delAnterior, cargos),
                fuente: `sin ventas este mes · promedio de ${MESES[anterior.getMonth()].toLowerCase()}`,
            }
        }

        return { valor: null, fuente: 'sin ventas para promediar' }
    }, [todas, cargos, year, month])

    const toggleAnioBarras = (anio) => {
        const siguiente = aniosBarras.includes(anio)
            ? aniosBarras.filter(a => a !== anio)
            : [...aniosBarras, anio]
        if (siguiente.length === 0) return
        setBarYears(siguiente)
    }

    const comparativa = useMemo(() => {
        const hoy = new Date()

        return aniosComparativa.map((anio, i) => {
            const valores = Array.from({ length: 12 }, (_, m) => netoPorMes.get(`${anio}-${m}`) || 0)

            // El año en curso se corta en el último mes cerrado: dibujar ceros de
            // meses futuros haría ver una caída que no existe.
            const recortado = anio === hoy.getFullYear()
                ? valores.slice(0, hoy.getMonth() + 1)
                : valores

            return {
                anio,
                valores: recortado,
                estilo: ESTILO_POR_POSICION[anios.indexOf(anio)] ?? 'viejo',
                _pos: i,
            }
        })
    }, [aniosComparativa, anios, netoPorMes])

    const toggleAnioComparativa = (anio) => {
        const base = aniosComparativa
        const siguiente = base.includes(anio) ? base.filter(a => a !== anio) : [...base, anio]
        // Mínimo un año encendido: un chart sin series no dice nada.
        if (siguiente.length === 0) return
        setCmpYears(siguiente)
    }

    const comprobantesPendientes = useMemo(
        () => ventasDelPeriodo.filter(v => v.abonos_sin_comprobante > 0),
        [ventasDelPeriodo]
    )

    // ------------------------------------------------------------ acciones ---

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

    // --------------------------------------------------------------- render ---


    const modales = (
        <>
            <AdminModal
                open={!!editingVenta}
                onClose={() => setEditingVenta(null)}
                onConfirm={handleSaveEdit}
                title='Editar venta'
            >
                <Form form={form} layout='vertical'>
                    <Form.Item name='precio_acordado' label='Precio acordado' rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item name='plan' label='Plan' rules={[{ required: true }]}>
                        <Select options={[{ value: 'PRO', label: 'PRO' }, { value: 'Lite', label: 'Lite' }]} />
                    </Form.Item>
                    <Form.Item name='vendedor_id' label='Vendedor asignado' rules={[{ required: true }]}>
                        <Select options={vendedorOptions} />
                    </Form.Item>
                </Form>
            </AdminModal>

            <AdminModal
                open={!!payingVenta}
                onClose={() => setPayingVenta(null)}
                onConfirm={handleRegistrarPago}
                title='Registrar abono'
            >
                <div className={styles.cardSub} style={{ marginBottom: 12 }}>
                    {payingVenta?.evento} · saldo pendiente {formatCurrency(payingVenta?.saldo_pendiente)}
                </div>
                <Form form={payForm} layout='vertical'>
                    <Form.Item name='monto' label='Monto' rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item name='metodo' label='Método' rules={[{ required: true }]} initialValue='transferencia'>
                        <Select options={METODOS_PAGO} />
                    </Form.Item>
                    <Form.Item label='Comprobante (opcional)'>
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
            </AdminModal>

            <AdminModal
                open={manualSaleOpen}
                onClose={() => setManualSaleOpen(false)}
                onConfirm={handleCreateManualSale}
                confirmLabel='Registrar'
                title='Registrar venta manual'
            >
                <Form form={manualForm} layout='vertical'>
                    <Form.Item name='invitation_id' label='Invitación' rules={[{ required: true }]}>
                        <Select
                            showSearch
                            filterOption={false}
                            onSearch={handleSearchInvitations}
                            onSelect={handleSelectInvitation}
                            notFoundContent={searchingInvitations ? 'Buscando…' : 'Escribe al menos 3 letras'}
                            options={invitationOptions}
                            placeholder='Buscar por evento o correo'
                        />
                    </Form.Item>
                    <Form.Item name='vendedor_id' label='Vendedor' rules={[{ required: true }]}>
                        <Select options={vendedorOptions} />
                    </Form.Item>
                    <Form.Item name='plan' label='Plan' rules={[{ required: true }]}>
                        <Select options={[{ value: 'PRO', label: 'PRO' }, { value: 'Lite', label: 'Lite' }]} />
                    </Form.Item>
                    <Form.Item name='precio_acordado' label='Precio acordado' rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item name='fecha_venta' label='Fecha de venta'>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name='nota' label='Nota'>
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </AdminModal>
        </>
    )

    const chipsDeAnios = (activos, alternar, oscuro = false) => anios.slice(0, 3).map((anio, i) => {
        const activo = activos.includes(anio)
        const color = COLOR_POR_ANIO[ESTILO_POR_POSICION[i]][oscuro ? 'oscuro' : 'color']
        return (
            <button
                key={anio}
                type='button'
                className={oscuro
                    ? `${iv.chipOscuro} ${activo ? iv.chipOscuroActivo : ''}`
                    : `${iv.chip} ${activo ? iv.chipActivo : ''}`}
                style={activo ? { borderColor: color } : undefined}
                onClick={() => alternar(anio)}
            >
                {anio}
            </button>
        )
    })

    const menuVenta = (venta) => (
        <Dropdown
            trigger={['click']}
            placement='bottomRight'
            popupRender={() => (
                <div className={styles.popup}>
                    <button type='button' className={styles.popupItem} onClick={() => openEdit(venta)}>Editar venta</button>
                    <button type='button' className={styles.popupItem} onClick={() => openPay(venta)}>Registrar abono</button>
                </div>
            )}
        >
            <button type='button' aria-label='Acciones' className={iv.mas}>
                <MoreHorizontal size={15} />
            </button>
        </Dropdown>
    )

    const cuerpoTabla = (
        <>
                {loading ? (
                    <div className={styles.empty}>Cargando ventas…</div>
                ) : filasDeLaTabla.length === 0 ? (
                    <div className={styles.empty}>
                        {soloHistorico ? 'Todavía no hay ventas registradas.' : 'No hay ventas en este periodo.'}
                    </div>
                ) : (
                    <div className={styles.scroller}>
                        <div className={`${styles.table} ${soloHistorico ? styles.tablaHistorico : ''}`}>
                            <div className={`${styles.row} ${styles.rowHead}`}>
                                {soloHistorico && <span className={styles.cell}>Fecha</span>}
                                <span className={styles.cell}>Evento</span>
                                <span className={styles.cell}>Vendedor</span>
                                <span className={styles.cell}>Plan</span>
                                <span className={`${styles.cell} ${styles.cellNum}`}>Acordado</span>
                                <span className={`${styles.cell} ${styles.cellNum}`}>Pagado</span>
                                <span className={`${styles.cell} ${styles.cellNum}`}>Saldo</span>
                                <span className={styles.cell}>Pago</span>
                                <span className={styles.cell}>Comprobante</span>
                                <span className={styles.cell} />
                            </div>

                            {filasDeLaTabla.map(venta => {
                                const saldo = Number(venta.saldo_pendiente || 0)
                                const completo = venta.estado_pago === 'completo'
                                const faltaComprobante = venta.abonos_sin_comprobante > 0

                                return (
                                    <div className={styles.row} key={venta.venta_id}>
                                        {soloHistorico && (
                                            <span className={`${styles.cell} ${styles.celdaTenue}`}>
                                                {dayjs(venta.fecha_venta).format('D MMM YY')}
                                            </span>
                                        )}
                                        <span className={`${styles.cell} ${styles.evento}`}>{venta.evento}</span>
                                        <span className={`${styles.cell} ${styles.vendedor}`}>{venta.vendedor || '—'}</span>
                                        <span className={styles.cell}>
                                            <span className={`${styles.plan} ${venta.plan === 'Lite' ? styles.planLite : ''}`}>
                                                {venta.plan}
                                            </span>
                                        </span>
                                        <span className={`${styles.cell} ${styles.cellNum}`}>{formatCurrency(venta.precio_acordado)}</span>
                                        <span className={`${styles.cell} ${styles.cellNum}`}>{formatCurrency(venta.total_pagado)}</span>
                                        <span className={`${styles.cell} ${saldo > 0 ? styles.saldoDebe : styles.saldoOk}`}>
                                            {formatCurrency(saldo)}
                                        </span>
                                        <span className={styles.cell}>
                                            <span className={`${styles.badge} ${completo ? styles.badgeOk : styles.badgeWarn}`}>
                                                {completo ? 'completo' : venta.estado_pago === 'apartado' ? 'apartado' : 'sin pago'}
                                            </span>
                                        </span>
                                        <span className={`${styles.cell} ${faltaComprobante ? styles.comprobanteFalta : styles.comprobanteOk}`}>
                                            {faltaComprobante ? 'falta' : 'ok'}
                                        </span>
                                        <span className={styles.cell}>
                                            <Dropdown
                                                trigger={['click']}
                                                placement='bottomRight'
                                                popupRender={() => (
                                                    <div className={styles.popup}>
                                                        <button type='button' className={styles.popupItem} onClick={() => openEdit(venta)}>
                                                            Editar venta
                                                        </button>
                                                        <button type='button' className={styles.popupItem} onClick={() => openPay(venta)}>
                                                            Registrar abono
                                                        </button>
                                                    </div>
                                                )}
                                            >
                                                <button type='button' aria-label='Acciones' className={styles.iconBtn}>
                                                    <MoreHorizontal size={15} />
                                                </button>
                                            </Dropdown>
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
        </>
    )

    // ------------------------------------------------------------ histórico ---

    if (soloHistorico) {
        return (
            <div className={styles.ventas}>
                <div className={`${iv.tarjeta} ${iv.historico}`}>
                    <div className={iv.historicoHead}>
                        <h2 className={iv.label}>Histórico de ventas · {historico.length}</h2>
                        <span className={iv.empuje} />
                        <button type='button' className={iv.botonNavy} onClick={() => setManualSaleOpen(true)}>
                            <Plus size={13} /> Venta manual
                        </button>
                    </div>
                    <div className={iv.historicoCuerpo}>{cuerpoTabla}</div>
                </div>
                {modales}
            </div>
        )
    }

    // ------------------------------------------------- ingresos y comisiones ---

    const totalesComparativa = [...comparativa]
        .sort((a, b) => b.anio - a.anio)
        .map(serie => ({
            anio: serie.anio,
            total: serie.valores.reduce((a, b) => a + b, 0),
            color: COLOR_POR_ANIO[serie.estilo]?.color ?? COLOR_POR_ANIO.viejo.color,
            enCurso: serie.anio === new Date().getFullYear(),
        }))
    const barrasDelAnio = barras.series.find(s => s.anio === year) ?? barras.series[0]

    return (
        <div className={styles.ventas}>
            <div className={iv.vista}>
                <div className={iv.kpis}>
                    <div className={iv.kpi}>
                        <span className={iv.kpiLabel}>Ventas del mes</span>
                        <div className={iv.kpiLinea}>
                            <span className={iv.kpiValor}>{kpis.ventasCount}</span>
                            <span className={iv.kpiNota}>{kpis.proCount} PRO · {kpis.liteCount} Lite · {kpisAnuales.ventasCount} en {year}</span>
                        </div>
                    </div>
                    <div className={iv.kpi}>
                        <span className={iv.kpiLabel}>Ingreso bruto</span>
                        <div className={iv.kpiLinea}>
                            <span className={iv.kpiValor}>{formatCurrency(kpis.ingresoBruto)}</span>
                            <span className={iv.kpiNota}>{formatCurrency(kpisAnuales.ingresoBruto)} en {year}</span>
                        </div>
                    </div>
                    <div className={iv.kpi}>
                        <span className={iv.kpiLabel}>Ingreso neto</span>
                        <div className={iv.kpiLinea}>
                            <span className={iv.kpiValor}>{formatCurrency(kpis.ingresoNeto)}</span>
                            <span className={iv.kpiNota}>IVA {formatCurrency(kpis.iva)} · comisiones {formatCurrency(kpis.comisiones)}</span>
                        </div>
                    </div>
                    <Dropdown
                        trigger={['click']}
                        placement='bottomRight'
                        disabled={saldoAnual.detalle.length === 0}
                        popupRender={() => (
                            <div className={styles.saldoPopup}>
                                <div className={styles.saldoPopupHead}>
                                    Saldos por cobrar · {year}
                                    <span>{formatCurrency(saldoAnual.monto)}</span>
                                </div>
                                {saldoAnual.detalle.map(venta => (
                                    <button key={venta.venta_id} type='button' className={styles.saldoRow} onClick={() => openPay(venta)}>
                                        <span className={styles.saldoEvento}>
                                            {venta.evento}
                                            <span className={styles.saldoMeta}>
                                                {dayjs(venta.fecha_venta).format('D MMM')}
                                                {venta.vendedor ? ` · ${venta.vendedor}` : ''}
                                                {venta.abonos_sin_comprobante > 0 ? ' · sin comprobante' : ''}
                                            </span>
                                        </span>
                                        <span className={styles.saldoMonto}>{formatCurrency(venta.saldo_pendiente)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    >
                        <button type='button' className={`${iv.kpi} ${iv.kpiAmbar}`}>
                            <span className={iv.kpiLabel}>Saldo pendiente · {year}</span>
                            <div className={iv.kpiLinea}>
                                <span className={iv.kpiValor}>{formatCurrency(saldoAnual.monto)}</span>
                                <span className={iv.kpiNota}>{saldoAnual.ventas} {saldoAnual.ventas === 1 ? 'venta' : 'ventas'} con apartado · ver detalle</span>
                            </div>
                        </button>
                    </Dropdown>
                </div>

                <div className={iv.filaMedia}>
                    <section className={iv.hero}>
                        <header className={iv.heroHead}>
                            <h2 className={iv.heroTitulo}>
                                Ingreso {descontarIva ? 'neto' : 'sin IVA'} acumulado · {acumuladoModo === 'anio' ? year : MESES[month - 1].toLowerCase()}
                            </h2>
                            <div className={iv.chipsOscuros}>{chipsDeAnios(aniosAcumulado, toggleAnioAcumulado, true)}</div>
                            <span className={iv.empuje} />
                            <div className={iv.segOscuro} role='radiogroup' aria-label='Periodo'>
                                {[['mes', 'Mes'], ['anio', 'Año']].map(([key, label]) => (
                                    <button key={key} type='button' role='radio' aria-checked={acumuladoModo === key}
                                        className={acumuladoModo === key ? iv.segActivo : ''} onClick={() => setAcumuladoModo(key)}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className={iv.segOscuro} role='radiogroup' aria-label='IVA'>
                                {[
                                    [true, 'Neto', 'Descontando IVA y comisiones'],
                                    [false, 'Sin IVA', 'Sin descontar IVA — la comisión sí se resta'],
                                ].map(([valor, label, ayuda]) => (
                                    <Tooltip key={label} title={ayuda}>
                                        <button type='button' role='radio' aria-checked={descontarIva === valor}
                                            className={descontarIva === valor ? iv.segActivo : ''} onClick={() => setDescontarIva(valor)}>
                                            {label}
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>
                        </header>

                        <div className={iv.heroCuerpo}>
                            <MetaDelMes
                                anio={year}
                                mes={month}
                                modo={acumuladoModo}
                                total={acumulado.total}
                                ingresoNeto={ingresoContraMeta}
                                ingresoAnio={acumulado.total}
                                // Siempre las del mes de la calculadora, aunque el panel
                                // esté mostrando el año: los costos por venta son mensuales.
                                ventasDelMes={ventasPorMes.get(`${year}-${month - 1}`) || 0}
                                netoPromedio={netoPromedio}
                                onMetaChange={setMeta}
                            />
                            <div className={iv.heroGrafica}>
                                <AcumuladoChart series={acumulado.series} meta={metaDelChart} labels={acumulado.labels} oscuro />
                                <div className={iv.heroEje}>
                                    {acumulado.eje.map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className={iv.tarjeta}>
                        <header className={iv.listaHead}>
                            <h2 className={iv.label}>Ventas del mes · {ventasDelPeriodo.length}</h2>
                            <span className={iv.empuje} />
                            <button type='button' className={iv.botonNavy} onClick={() => setManualSaleOpen(true)}>
                                <Plus size={13} /> Venta manual
                            </button>
                        </header>
                        {comprobantesPendientes.length > 0 && (
                            <div className={iv.aviso}>
                                <span className={iv.pillAmbar}>
                                    <i /> {comprobantesPendientes.length} {comprobantesPendientes.length === 1 ? 'venta' : 'ventas'} con abonos sin comprobante
                                </span>
                            </div>
                        )}
                        <div className={iv.listaScroll}>
                            {loading ? (
                                <div className={iv.vacio}>Cargando ventas…</div>
                            ) : ventasDelPeriodo.length === 0 ? (
                                <div className={iv.vacio}>No hay ventas en este periodo.</div>
                            ) : [...ventasDelPeriodo]
                                .sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta))
                                .map(venta => {
                                    const saldo = Number(venta.saldo_pendiente || 0)
                                    const completo = venta.estado_pago === 'completo'
                                    return (
                                        <div key={venta.venta_id} className={iv.venta}>
                                            <div className={iv.ventaTexto}>
                                                <div className={iv.ventaNombre}>
                                                    <b>{venta.evento}</b>
                                                    <span className={venta.plan === 'Lite' ? iv.planLite : iv.planPro}>{venta.plan}</span>
                                                </div>
                                                <span className={iv.ventaMeta}>
                                                    {venta.vendedor || '—'} · {dayjs(venta.fecha_venta).format('D MMM')}
                                                    {venta.abonos_sin_comprobante > 0 ? ' · sin comprobante' : ''}
                                                </span>
                                            </div>
                                            <div className={iv.ventaMonto}>
                                                <b>{formatCurrency(venta.precio_acordado)}</b>
                                                <span className={completo ? iv.estadoOk : iv.estadoDebe}>
                                                    {completo ? 'completo' : `${venta.estado_pago === 'apartado' ? 'apartado' : 'sin pago'} · debe ${formatCurrency(saldo)}`}
                                                </span>
                                            </div>
                                            {menuVenta(venta)}
                                        </div>
                                    )
                                })}

                            {saldoAnual.detalle.length > 0 && (
                                <>
                                    <div className={iv.porCobrarHead}>
                                        <h3>Por cobrar · {year}</h3>
                                        <b>{formatCurrency(saldoAnual.monto)}</b>
                                    </div>
                                    {saldoAnual.detalle.map(venta => (
                                        <button key={venta.venta_id} type='button' className={iv.saldo} onClick={() => openPay(venta)}>
                                            <span>
                                                <b>{venta.evento}</b>
                                                <small>
                                                    {dayjs(venta.fecha_venta).format('D MMM')} · {venta.vendedor || '—'}
                                                    {venta.abonos_sin_comprobante > 0 ? ' · sin comprobante' : ''}
                                                </small>
                                            </span>
                                            <span className={iv.saldoMonto}>{formatCurrency(venta.saldo_pendiente)}</span>
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    </section>
                </div>

                <div className={iv.filaBaja}>
                    <section className={`${iv.tarjeta} ${iv.grafica}`}>
                        <h2 className={iv.label}>Proyección anual</h2>
                        <div className={iv.graficaCifra}>
                            <span className={iv.cifra}>{formatCurrency(proyeccion.principal.cierreEstimado)}</span>
                            <span className={proyeccion.delta < 0 ? iv.deltaMal : iv.deltaOk}>
                                {proyeccion.totalPrevio > 0
                                    ? `${proyeccion.delta >= 0 ? '+' : ''}${proyeccion.delta.toFixed(0)}% vs ${proyeccion.anioPrevio}`
                                    : `sin cierre de ${proyeccion.anioPrevio}`}
                            </span>
                        </div>
                        <span className={iv.graficaNota}>
                            ≈ {proyeccion.principal.invitaciones} invitaciones · cierre estimado al ritmo de {proyeccion.principal.mesesCerrados} meses
                        </span>
                        <div className={iv.chips}>{chipsDeAnios(aniosProyeccion, toggleAnioProyeccion)}</div>
                        <div className={iv.graficaLienzo}>
                            <ProyeccionChart series={proyeccion.series} labels={proyeccion.labels} />
                        </div>
                        <div className={iv.meses}>{MESES_CORTOS.map(m => <span key={m}>{m}</span>)}</div>
                    </section>

                    <section className={`${iv.tarjeta} ${iv.grafica}`}>
                        <h2 className={iv.label}>Ventas por mes</h2>
                        <div className={iv.graficaCifra}>
                            <span className={iv.cifra}>{barrasDelAnio?.total ?? 0}</span>
                            <span className={iv.graficaNota}>ventas en {year}</span>
                        </div>
                        <span className={iv.graficaNota}>
                            {barras.series.map(s => `${s.total} en ${s.anio}`).join(' · ')}
                            {barras.series.length === 1 ? ` · ${formatCurrency(barras.series[0].neto)} neto` : ''}
                        </span>
                        <div className={iv.chips}>{chipsDeAnios(aniosBarras, toggleAnioBarras)}</div>
                        <div className={iv.graficaLienzo}>
                            <BarrasPorMes series={barras.series} />
                        </div>
                    </section>

                    <section className={`${iv.tarjeta} ${iv.grafica}`}>
                        <h2 className={iv.label}>Comparativa anual</h2>
                        <div className={iv.totales}>
                            {totalesComparativa.map(t => (
                                <div key={t.anio}>
                                    <i style={{ background: t.color }} />
                                    <span>{t.enCurso ? `${t.anio} · a la fecha` : t.anio}</span>
                                    <b>{formatCurrency(t.total)}</b>
                                </div>
                            ))}
                        </div>
                        <div className={iv.chips}>{chipsDeAnios(aniosComparativa, toggleAnioComparativa)}</div>
                        <div className={iv.graficaLienzo}>
                            <ComparativaChart series={comparativa} />
                        </div>
                        <div className={iv.meses}>{MESES_CORTOS.map(m => <span key={m}>{m}</span>)}</div>
                    </section>
                </div>
            </div>
            {modales}
        </div>
    )
}
