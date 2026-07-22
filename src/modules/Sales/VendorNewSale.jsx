import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, DatePicker, Input, Select, Switch, message } from 'antd'
import { Check, ChevronDown } from 'lucide-react'
import dayjs from 'dayjs'
import { useVendorSession } from './VendorSessionContext'
import {
    checkUrlDisponible,
    checkCliente,
    buscarClientes,
    crearVenta,
    fetchConfiguracionPagos,
} from './salesApi'
// import { buildBankMessage } from './paymentUtils'
import styles from './VendorNewSale.module.css'

const PLANS = ['PRO', 'Lite']
const DEFAULT_PRICE = { PRO: 3999, Lite: 2899 }
const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20]

const LADAS = [
    { value: '+52', label: '🇲🇽 +52' },
    { value: '+1', label: '🇺🇸 +1' },
    { value: '+34', label: '🇪🇸 +34' },
    { value: '+57', label: '🇨🇴 +57' },
    { value: '+51', label: '🇵🇪 +51' },
    { value: '+56', label: '🇨🇱 +56' },
    { value: '+54', label: '🇦🇷 +54' },
    { value: '+503', label: '🇸🇻 +503' },
    { value: '+502', label: '🇬🇹 +502' },
    { value: '+504', label: '🇭🇳 +504' },
]

const formatCurrency = (value) =>
    `$${Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

const BlockHeader = ({ title, open, onToggle, incomplete }) => (
    <div
        onClick={onToggle}
        style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer',
            paddingBottom: open ? 6 : 0,
            marginBottom: open ? 12 : 0,
            borderBottom: open ? '0.5px solid var(--borders)' : 'none',
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
                fontFamily: 'Poppins, sans-serif', fontSize: 11, fontWeight: 600,
                letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--mid-blue-500)',
            }}>
                {title}
            </span>
            {incomplete && (
                <span style={{
                    fontSize: 10, fontWeight: 600, fontFamily: 'Poppins, sans-serif',
                    color: '#c0392b', background: '#fdecea',
                    border: '0.5px solid #f5c6c2',
                    borderRadius: 99, padding: '1px 7px', lineHeight: 1.6,
                    transition: 'opacity 0.2s',
                }}>
                    Incompleto
                </span>
            )}
        </div>
        <ChevronDown
            size={14}
            color='var(--mid-blue-500)'
            style={{ transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
    </div>
)

export const VendorNewSale = ({ onCancel, onCreated }) => {
    const { t } = useTranslation()
    const { vendedor } = useVendorSession()

    // Bloque 1 — datos del cliente
    const [esClienteExistente, setEsClienteExistente] = useState(false)
    const [nombreCliente, setNombreCliente] = useState('')
    const [correoCliente, setCorreoCliente] = useState('')
    const [clienteStatus, setClienteStatus] = useState(null) // null | 'checking' | 'nuevo' | 'existente'
    const [clienteNombreDetectado, setClienteNombreDetectado] = useState(null)
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
    const [clientOptions, setClientOptions] = useState([])
    const [searchingClientes, setSearchingClientes] = useState(false)
    const clientSearchDebounceRef = useRef(null)

    // Bloque 2 — evento
    const [tipoEvento, setTipoEvento] = useState('boda')
    const [urlEvento, setUrlEvento] = useState('')
    const [urlStatus, setUrlStatus] = useState(null) // null | 'checking' | 'disponible' | 'ocupada'
    const [lada, setLada] = useState('+52')
    const [telefonoLocal, setTelefonoLocal] = useState('')
    const [owner1, setOwner1] = useState('')
    const [owner2, setOwner2] = useState('')
    const [fechaEvento, setFechaEvento] = useState('')

    // Bloque 3 — pago
    const [plan, setPlan] = useState('PRO')
    const [descuentoPct, setDescuentoPct] = useState(0)
    const [configPagos, setConfigPagos] = useState(null)

    // Collapse state
    const [openCliente, setOpenCliente] = useState(true)
    const [openEvento, setOpenEvento] = useState(true)
    const [openPago, setOpenPago] = useState(true)

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const canDiscount = Number(vendedor?.descuento_max_pct) > 0
    const discountOptions = useMemo(
        () => DISCOUNT_OPTIONS.filter((d) => d <= Number(vendedor?.descuento_max_pct || 0)),
        [vendedor]
    )
    const precioAcordado = useMemo(
        () => Math.round(DEFAULT_PRICE[plan] * (1 - descuentoPct / 100)),
        [plan, descuentoPct]
    )
    const linkPago = configPagos?.stripe_links?.[`${plan}_${descuentoPct}`]
        || (descuentoPct === 0 ? configPagos?.stripe_links?.[plan] : undefined)

    const clienteCompleto = esClienteExistente
        ? !!clienteSeleccionado
        : !!nombreCliente.trim() && !!correoCliente.trim()

    const eventoCompleto = !!urlEvento.trim()
        && urlStatus !== 'ocupada'
        && !!telefonoLocal.trim()
        && !!fechaEvento
        && (tipoEvento !== 'boda' || (!!owner1.trim() && !!owner2.trim()))

    const formCompleto = clienteCompleto && eventoCompleto

    useEffect(() => {
        fetchConfiguracionPagos().then(({ data }) => setConfigPagos(data)).catch(() => {})
    }, [])

    useEffect(() => {
        if (!urlEvento.trim()) { setUrlStatus(null); return }
        setUrlStatus('checking')
        const timer = setTimeout(async () => {
            try {
                const { data } = await checkUrlDisponible(urlEvento.trim())
                setUrlStatus(data.disponible ? 'disponible' : 'ocupada')
            } catch { setUrlStatus(null) }
        }, 400)
        return () => clearTimeout(timer)
    }, [urlEvento])

    useEffect(() => {
        if (esClienteExistente) { setClienteStatus(null); return }
        const correo = correoCliente.trim()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
            setClienteStatus(null); setClienteNombreDetectado(null); return
        }
        setClienteStatus('checking')
        const timer = setTimeout(async () => {
            try {
                const { data } = await checkCliente(correo)
                setClienteStatus(data.existe ? 'existente' : 'nuevo')
                setClienteNombreDetectado(data.nombre)
            } catch { setClienteStatus(null) }
        }, 400)
        return () => clearTimeout(timer)
    }, [correoCliente, esClienteExistente])

    const handleSearchClientes = (q) => {
        clearTimeout(clientSearchDebounceRef.current)
        if (!q || q.trim().length < 2) { setClientOptions([]); return }
        clientSearchDebounceRef.current = setTimeout(async () => {
            setSearchingClientes(true)
            try {
                const { data } = await buscarClientes(q.trim())
                setClientOptions(data?.clientes || [])
            } catch { setClientOptions([]) }
            finally { setSearchingClientes(false) }
        }, 400)
    }

    const handleSelectCliente = (userId) => {
        setClienteSeleccionado(clientOptions.find((c) => c.user_id === userId) || null)
    }

    const handleToggleClienteExistente = (checked) => {
        setEsClienteExistente(checked)
        setClienteSeleccionado(null)
        setClientOptions([])
        setNombreCliente('')
        setCorreoCliente('')
        setClienteStatus(null)
    }

    const handleCopy = (texto) => {
        navigator.clipboard.writeText(texto)
        message.success(t('sales.new_sale.copied'))
    }

    const handleSubmit = async () => {
        setError('')

        if (esClienteExistente && !clienteSeleccionado) {
            setError(t('sales.new_sale.err_select_client')); return
        }
        if (!esClienteExistente && (!nombreCliente.trim() || !correoCliente.trim())) {
            setError(t('sales.new_sale.err_required')); return
        }
        if (!urlEvento.trim() || !telefonoLocal.trim() || !fechaEvento) {
            setError(t('sales.new_sale.err_required')); return
        }
        if (tipoEvento === 'boda' && (!owner1.trim() || !owner2.trim())) {
            setError(t('sales.new_sale.err_required')); return
        }
        if (urlStatus === 'ocupada') {
            setError(t('sales.new_sale.err_url_taken')); return
        }

        setSubmitting(true)
        try {
            const clientePayload = esClienteExistente
                ? { cliente_id: clienteSeleccionado.user_id }
                : { correo_cliente: correoCliente.trim(), nombre_cliente: nombreCliente.trim() }

            const { data } = await crearVenta({
                tipo_evento: tipoEvento,
                url_evento: urlEvento.trim(),
                telefono: `${lada}${telefonoLocal.trim().replace(/\D/g, '')}`,
                owners: tipoEvento === 'boda' ? [owner1.trim(), owner2.trim()] : [],
                fecha_evento: fechaEvento,
                plan,
                precio_acordado: Number(precioAcordado),
                descuento_pct: canDiscount ? Number(descuentoPct) || 0 : 0,
                ...clientePayload,
            })

            const evento = tipoEvento === 'boda'
                ? `${owner1.trim()} & ${owner2.trim()}`
                : (esClienteExistente ? clienteSeleccionado.nombre : nombreCliente.trim()) || urlEvento.trim()

            onCreated({
                venta_id: data.venta_id,
                evento,
                plan,
                precio_acordado: Number(precioAcordado),
                descuento_pct: canDiscount ? Number(descuentoPct) || 0 : 0,
                total_pagado: 0,
                saldo_pendiente: Number(precioAcordado),
                estado_pago: 'sin_pago',
                url_publica: data.url_publica,
            })
        } catch (err) {
            setError(err.response?.data?.msg || t('sales.new_sale.err_generic'))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.headerRow}>
                <Button type='text' className={styles.backBtn} onClick={onCancel}>←</Button>
                <div className={styles.title}>{t('sales.new_sale.title')}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* ── Bloque 1: Datos del cliente ── */}
                <div className={styles.block}>
                    <BlockHeader title={t('sales.new_sale.block_client')} open={openCliente} onToggle={() => setOpenCliente(v => !v)} incomplete={!clienteCompleto} />

                    <div className={`${styles.blockBody} ${!openCliente ? styles.blockBodyClosed : ''}`}>
                        <div className={styles.switchRow}>
                            <span className={styles.label}>{t('sales.new_sale.existing_client_switch')}</span>
                            <Switch checked={esClienteExistente} onChange={handleToggleClienteExistente} />
                        </div>

                        {esClienteExistente ? (
                            <>
                                <span className={styles.label}>{t('sales.new_sale.search_client')}</span>
                                <Select
                                    showSearch
                                    filterOption={false}
                                    suffixIcon={null}
                                    className={styles.selectAntd}
                                    style={{ width: '100%' }}
                                    value={clienteSeleccionado?.user_id}
                                    onSearch={handleSearchClientes}
                                    onChange={handleSelectCliente}
                                    placeholder={t('sales.new_sale.search_client_placeholder')}
                                    notFoundContent={searchingClientes ? t('sales.new_sale.client_checking') : null}
                                    options={clientOptions.map((c) => ({ value: c.user_id, label: `${c.nombre || c.correo} — ${c.correo}` }))}
                                />
                            </>
                        ) : (
                            <>
                                <span className={styles.label}>{t('sales.new_sale.client_name')}</span>
                                <Input
                                    className={styles.input}
                                    value={nombreCliente}
                                    onChange={(e) => setNombreCliente(e.target.value)}
                                />

                                <span className={styles.label}>{t('sales.new_sale.client_email')}</span>
                                <Input
                                    type='email'
                                    className={styles.input}
                                    placeholder='cliente@correo.com'
                                    value={correoCliente}
                                    onChange={(e) => setCorreoCliente(e.target.value)}
                                />
                                {clienteStatus === 'checking' && <div className={styles.hintNeutral}>{t('sales.new_sale.client_checking')}</div>}
                                {clienteStatus === 'existente' && (
                                    <div className={styles.hintSuccess}>✓ {t('sales.new_sale.client_existing', { nombre: clienteNombreDetectado })}</div>
                                )}
                                {(clienteStatus === 'nuevo' || !clienteStatus) && (
                                    <div className={styles.hintNeutral}>{t('sales.new_sale.client_email_hint')}</div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* ── Bloque 2: Evento ── */}
                <div className={styles.block}>
                    <BlockHeader title={t('sales.new_sale.block_event')} open={openEvento} onToggle={() => setOpenEvento(v => !v)} incomplete={!eventoCompleto} />

                    <div className={`${styles.blockBody} ${!openEvento ? styles.blockBodyClosed : ''}`}>
                        <span className={styles.label}>{t('sales.new_sale.event_type')}</span>
                        <Select
                            suffixIcon={null}
                            className={styles.selectAntd}
                            style={{ width: '100%' }}
                            value={tipoEvento}
                            onChange={setTipoEvento}
                            options={[
                                { value: 'boda', label: t('sales.new_sale.event_type_boda') },
                                { value: 'xv', label: t('sales.new_sale.event_type_xv') },
                            ]}
                        />

                        <span className={styles.label}>{t('sales.new_sale.event_url')}</span>
                        <Input
                            className={styles.input}
                            placeholder='ale-santiago'
                            value={urlEvento}
                            onChange={(e) => setUrlEvento(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                        />
                        {urlStatus === 'checking' && <div className={styles.hintNeutral}>{t('sales.new_sale.url_checking')}</div>}
                        {urlStatus === 'disponible' && <div className={styles.hintSuccess}>✓ {t('sales.new_sale.url_available')}</div>}
                        {urlStatus === 'ocupada' && <div className={styles.hintError}>✕ {t('sales.new_sale.url_taken')}</div>}

                        {tipoEvento === 'boda' && (
                            <div className={styles.ownersRow}>
                                <div className={styles.ownerCol}>
                                    <span className={styles.label}>{t('sales.new_sale.owner_1')}</span>
                                    <Input className={styles.input} value={owner1} onChange={(e) => setOwner1(e.target.value)} />
                                </div>
                                <div className={styles.ownerCol}>
                                    <span className={styles.label}>{t('sales.new_sale.owner_2')}</span>
                                    <Input className={styles.input} value={owner2} onChange={(e) => setOwner2(e.target.value)} />
                                </div>
                            </div>
                        )}

                        <span className={styles.label}>{t('sales.new_sale.phone')}</span>
                        <div className={styles.phoneRow}>
                            <Select
                                suffixIcon={null}
                                className={styles.ladaSelectAntd}
                                style={{ width: 110 }}
                                value={lada}
                                onChange={setLada}
                                options={LADAS}
                            />
                            <Input
                                className={styles.input}
                                placeholder='8119777738'
                                inputMode='numeric'
                                value={telefonoLocal}
                                onChange={(e) => setTelefonoLocal(e.target.value.replace(/\D/g, ''))}
                            />
                        </div>

                        <span className={styles.label}>{t('sales.new_sale.event_date')}</span>
                        <DatePicker
                            className={styles.datePicker}
                            style={{ width: '100%' }}
                            format='DD/MM/YYYY'
                            value={fechaEvento ? dayjs(fechaEvento) : null}
                            onChange={(_, dateString) => setFechaEvento(dateString ? dayjs(dateString, 'DD/MM/YYYY').format('YYYY-MM-DD') : '')}
                        />
                    </div>
                </div>

                {/* ── Bloque 3: Pago ── */}
                <div className={styles.block}>
                    <BlockHeader title={t('sales.new_sale.block_payment')} open={openPago} onToggle={() => setOpenPago(v => !v)} />

                    <div className={`${styles.blockBody} ${!openPago ? styles.blockBodyClosed : ''}`}>
                        <span className={styles.label}>{t('sales.new_sale.plan')}</span>
                        <div className={styles.planToggle}>
                            {PLANS.map((p) => (
                                <Button
                                    key={p}
                                    type='text'
                                    className={`${styles.planOption} ${plan === p ? styles.planOptionActive : ''}`}
                                    onClick={() => setPlan(p)}
                                >
                                    {p}
                                </Button>
                            ))}
                        </div>

                        {canDiscount && (
                            <>
                                <span className={styles.label}>{t('sales.new_sale.discount')}</span>
                                <Select
                                    suffixIcon={null}
                                    className={styles.selectAntd}
                                    style={{ width: '100%' }}
                                    value={descuentoPct}
                                    onChange={setDescuentoPct}
                                    options={discountOptions.map((d) => ({
                                        value: d,
                                        label: d === 0 ? t('sales.new_sale.no_discount') : `${d}%`,
                                    }))}
                                />
                            </>
                        )}

                        <div className={styles.totalRow}>
                            <span className={styles.totalLabel}>{t('sales.new_sale.subtotal')}</span>
                            <span className={styles.totalValue}>{formatCurrency(precioAcordado)}</span>
                        </div>

                        {(linkPago || configPagos?.transferencia) && (
                            <div className={styles.paymentInfoBox}>
                                {linkPago && (
                                    <div className={styles.paymentRow}>
                                        <div className={styles.paymentRowText}>
                                            <div className={styles.paymentRowLabel}>{t('sales.new_sale.payment_link')}</div>
                                            <a className={styles.paymentLink} href={linkPago} target='_blank' rel='noreferrer'>{linkPago}</a>
                                        </div>
                                        <Button size='small' className={styles.copyBtn} onClick={() => handleCopy(linkPago)}>
                                            {t('sales.new_sale.copy')}
                                        </Button>
                                    </div>
                                )}

                                {configPagos?.transferencia && (
                                    <div className={styles.paymentRow}>
                                        <div className={styles.paymentRowText}>
                                            <div className={styles.paymentRowLabel}>CLABE</div>
                                            <div className={styles.paymentValue}>{configPagos.transferencia.clabe}</div>
                                        </div>
                                        <Button size='small' className={styles.copyBtn} onClick={() => handleCopy(configPagos.transferencia.clabe)}>
                                            {t('sales.new_sale.copy')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {error && <div className={styles.hintError}>{error}</div>}

                <Button
                    icon={<Check size={14}/>}
                    block
                    className={styles.submitBtn}
                    loading={submitting}
                    disabled={!formCompleto}
                    onClick={handleSubmit}
                    style={{minHeight:'44px'}}
                >
                    Checkout
                </Button>

            </div>
        </div>
    )
}
