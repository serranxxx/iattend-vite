import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message } from 'antd'
import { ArrowRight, Check, ChevronDown, Search, X } from 'lucide-react'
import { useVendorSession } from './VendorSessionContext'
import {
    checkUrlDisponible,
    checkCliente,
    buscarClientes,
    crearVenta,
    fetchConfiguracionPagos,
} from './salesApi'
import { installmentLinks } from './paymentUtils'
import { formatMXN, usePlans } from '../../hooks/usePlans'
import { PHONE_CODES } from '../../helpers/assets/phoneCodes'
import {
    Screen, ScreenHeader, StickyFooter, PrimaryButton, Field, TextInput, Hint, Segmented, ChipGroup, Steps, Card, CopyRow,
} from './SalesUi'
import { formatClabe, formatCurrency } from './salesFormat'
import styles from './VendorNewSale.module.css'

const PLANS = ['PRO', 'Lite']
const DEFAULT_PRICE = { PRO: 3999, Lite: 2899 }
const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const VendorNewSale = ({ onCancel, onCreated }) => {
    const { t } = useTranslation()
    const { vendedor } = useVendorSession()

    // Venta en 3 pasos: 0 cliente, 1 evento, 2 pago
    const [paso, setPaso] = useState(0)

    // Paso 1 — datos del cliente
    const [esClienteExistente, setEsClienteExistente] = useState(false)
    const [nombreCliente, setNombreCliente] = useState('')
    const [correoCliente, setCorreoCliente] = useState('')
    const [clienteStatus, setClienteStatus] = useState(null) // null | 'checking' | 'nuevo' | 'existente'
    const [clienteNombreDetectado, setClienteNombreDetectado] = useState(null)
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
    const [busquedaCliente, setBusquedaCliente] = useState('')
    const [clientOptions, setClientOptions] = useState([])
    const [searchingClientes, setSearchingClientes] = useState(false)
    const clientSearchDebounceRef = useRef(null)

    // Paso 2 — evento
    const [tipoEvento, setTipoEvento] = useState('boda')
    const [urlEvento, setUrlEvento] = useState('')
    const [urlStatus, setUrlStatus] = useState(null) // null | 'checking' | 'disponible' | 'ocupada'
    const [lada, setLada] = useState('+52')
    const [telefonoLocal, setTelefonoLocal] = useState('')
    const [owner1, setOwner1] = useState('')
    const [owner2, setOwner2] = useState('')
    const [fechaEvento, setFechaEvento] = useState('')

    // Paso 3 — pago
    const [plan, setPlan] = useState('PRO')
    const [descuentoPct, setDescuentoPct] = useState(0)
    const [configPagos, setConfigPagos] = useState(null)

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
    // Links a meses: cobran un precio fijo (el de Stripe), así que solo
    // aplican sin descuento. El monto sale del catálogo.
    const { getPlan } = usePlans()
    const linksMeses = descuentoPct === 0
        ? installmentLinks(configPagos?.stripe_links, plan).map(link => ({
            ...link,
            amount: getPlan(plan)?.installments?.find(term => term.months === link.months)?.amount,
        }))
        : []

    const clienteCompleto = esClienteExistente
        ? !!clienteSeleccionado
        : !!nombreCliente.trim() && EMAIL_RE.test(correoCliente.trim())

    const eventoCompleto = !!urlEvento.trim()
        && urlStatus !== 'ocupada'
        && !!telefonoLocal.trim()
        && !!fechaEvento
        && (tipoEvento !== 'boda' || (!!owner1.trim() && !!owner2.trim()))

    const nombreClienteFinal = esClienteExistente ? (clienteSeleccionado?.nombre || clienteSeleccionado?.correo) : nombreCliente.trim()

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
        if (!EMAIL_RE.test(correo)) {
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

    // Al cambiar de paso se empieza arriba y se limpia el error del anterior
    useEffect(() => {
        window.scrollTo({ top: 0 })
        setError('')
    }, [paso])

    const handleSearchClientes = (q) => {
        setBusquedaCliente(q)
        clearTimeout(clientSearchDebounceRef.current)
        if (!q || q.trim().length < 2) { setClientOptions([]); setSearchingClientes(false); return }
        setSearchingClientes(true)
        clientSearchDebounceRef.current = setTimeout(async () => {
            try {
                const { data } = await buscarClientes(q.trim())
                setClientOptions(data?.clientes || [])
            } catch { setClientOptions([]) }
            finally { setSearchingClientes(false) }
        }, 400)
    }

    const handleTipoCliente = (existente) => {
        setEsClienteExistente(existente)
        setClienteSeleccionado(null)
        setClientOptions([])
        setBusquedaCliente('')
        setNombreCliente('')
        setCorreoCliente('')
        setClienteStatus(null)
    }

    const handleCopy = (texto) => {
        navigator.clipboard.writeText(texto)
        message.success(t('sales.new_sale.copied'))
    }

    const handleBack = () => (paso === 0 ? onCancel() : setPaso(paso - 1))

    const handleNext = () => {
        if (paso === 0) {
            if (esClienteExistente && !clienteSeleccionado) { setError(t('sales.new_sale.err_select_client')); return }
            if (!esClienteExistente && nombreCliente.trim() && correoCliente.trim() && !EMAIL_RE.test(correoCliente.trim())) {
                setError(t('sales.new_sale.err_email')); return
            }
            if (!clienteCompleto) { setError(t('sales.new_sale.err_required')); return }
        }
        if (paso === 1) {
            if (urlStatus === 'ocupada') { setError(t('sales.new_sale.err_url_taken')); return }
            if (!eventoCompleto) { setError(t('sales.new_sale.err_required')); return }
        }
        setPaso(paso + 1)
    }

    const handleSubmit = async () => {
        if (submitting) return
        setError('')

        if (!clienteCompleto || !eventoCompleto) {
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
                : nombreClienteFinal || urlEvento.trim()

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

    const pasoCompleto = paso === 0 ? clienteCompleto : paso === 1 ? eventoCompleto : true
    const errorMsg = error && <p className={styles.error} role="alert">{error}</p>

    const footer = (
        <StickyFooter solid>
            {errorMsg}
            {paso === 1 && (
                <div className={styles.footerSummary}>
                    <span>{t('sales.new_sale.client')}: <strong>{nombreClienteFinal}</strong></span>
                    <span>{plan} · {formatCurrency(precioAcordado)}</span>
                </div>
            )}
            {paso < 2 ? (
                <PrimaryButton disabled={!pasoCompleto} onClick={handleNext} iconEnd={<ArrowRight size={18} aria-hidden="true" />}>
                    {paso === 0 ? t('sales.new_sale.continue_event') : t('sales.new_sale.continue_payment')}
                </PrimaryButton>
            ) : (
                <PrimaryButton icon={<Check size={20} />} loading={submitting} onClick={handleSubmit}>
                    {submitting ? t('sales.new_sale.submitting') : t('sales.new_sale.submit_amount', { amount: formatCurrency(precioAcordado) })}
                </PrimaryButton>
            )}
        </StickyFooter>
    )

    return (
        <Screen footer={footer}>
            <ScreenHeader
                title={t('sales.new_sale.title')}
                onBack={handleBack}
                backLabel={paso === 0 ? t('sales.new_sale.cancel') : t('sales.new_sale.back')}
                aside={t('sales.new_sale.step_of', { n: paso + 1, total: 3 })}
            />
            <Steps
                current={paso}
                labels={[t('sales.new_sale.step_client'), t('sales.new_sale.step_event'), t('sales.new_sale.step_payment')]}
            />

            {/* ── Paso 1: cliente ── */}
            {paso === 0 && (
                <>
                    <Segmented
                        label={t('sales.new_sale.block_client')}
                        value={esClienteExistente}
                        onChange={handleTipoCliente}
                        options={[
                            { value: false, label: t('sales.new_sale.client_new') },
                            { value: true, label: t('sales.new_sale.client_existing_tab') },
                        ]}
                    />

                    {esClienteExistente ? (
                        clienteSeleccionado ? (
                            <Card className={styles.selectedClient}>
                                <div className={styles.clientText}>
                                    <span className={styles.clientName}>{clienteSeleccionado.nombre || clienteSeleccionado.correo}</span>
                                    <span className={styles.clientMail}>{clienteSeleccionado.correo}</span>
                                </div>
                                <button type="button" className={styles.linkBtn} onClick={() => setClienteSeleccionado(null)}>
                                    {t('sales.new_sale.change')}
                                </button>
                            </Card>
                        ) : (
                            <Field label={t('sales.new_sale.search_client')} htmlFor="ns-search">
                                <div className={styles.searchBox}>
                                    <Search size={18} className={styles.searchIcon} aria-hidden="true" />
                                    <TextInput
                                        id="ns-search"
                                        className={styles.searchInput}
                                        type="search"
                                        autoComplete="off"
                                        placeholder={t('sales.new_sale.search_client_placeholder')}
                                        value={busquedaCliente}
                                        onChange={(e) => handleSearchClientes(e.target.value)}
                                    />
                                </div>
                                {searchingClientes && <Hint>{t('sales.new_sale.client_checking')}</Hint>}
                                {!searchingClientes && busquedaCliente.trim().length >= 2 && clientOptions.length === 0 && (
                                    <Hint>{t('sales.new_sale.no_clients')}</Hint>
                                )}
                                {clientOptions.length > 0 && (
                                    <ul className={styles.results}>
                                        {clientOptions.map(c => (
                                            <li key={c.user_id}>
                                                <button type="button" className={styles.result} onClick={() => setClienteSeleccionado(c)}>
                                                    <span className={styles.clientName}>{c.nombre || c.correo}</span>
                                                    <span className={styles.clientMail}>{c.correo}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Field>
                        )
                    ) : (
                        <>
                            <Field label={t('sales.new_sale.client_name')} htmlFor="ns-name">
                                <TextInput id="ns-name" autoComplete="name" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} />
                            </Field>
                            <Field
                                label={t('sales.new_sale.client_email')}
                                htmlFor="ns-email"
                                hint={
                                    clienteStatus === 'checking' ? <Hint>{t('sales.new_sale.client_checking')}</Hint>
                                        : clienteStatus === 'existente' ? <Hint tone="success">✓ {t('sales.new_sale.client_existing', { nombre: clienteNombreDetectado })}</Hint>
                                            : <Hint>{t('sales.new_sale.client_email_hint')}</Hint>
                                }
                            >
                                <TextInput
                                    id="ns-email"
                                    type="email"
                                    inputMode="email"
                                    autoComplete="email"
                                    autoCapitalize="none"
                                    placeholder="cliente@correo.com"
                                    value={correoCliente}
                                    onChange={(e) => setCorreoCliente(e.target.value)}
                                />
                            </Field>
                        </>
                    )}
                </>
            )}

            {/* ── Paso 2: evento ── */}
            {paso === 1 && (
                <>
                    <Field label={t('sales.new_sale.event_type')}>
                        <Segmented
                            label={t('sales.new_sale.event_type')}
                            value={tipoEvento}
                            onChange={setTipoEvento}
                            options={[
                                { value: 'boda', label: t('sales.new_sale.event_type_boda') },
                                { value: 'xv', label: t('sales.new_sale.event_type_xv') },
                            ]}
                        />
                    </Field>

                    {tipoEvento === 'boda' && (
                        <div className={styles.twoCols}>
                            <Field label={t('sales.new_sale.owner_1')} htmlFor="ns-o1">
                                <TextInput id="ns-o1" value={owner1} onChange={(e) => setOwner1(e.target.value)} />
                            </Field>
                            <Field label={t('sales.new_sale.owner_2')} htmlFor="ns-o2">
                                <TextInput id="ns-o2" value={owner2} onChange={(e) => setOwner2(e.target.value)} />
                            </Field>
                        </div>
                    )}

                    <Field
                        label={t('sales.new_sale.event_url')}
                        htmlFor="ns-url"
                        hint={urlStatus === 'ocupada' && <Hint tone="error">{t('sales.new_sale.url_taken_hint')}</Hint>}
                    >
                        <div className={styles.inputWithBadge}>
                            <TextInput
                                id="ns-url"
                                autoCapitalize="none"
                                autoCorrect="off"
                                placeholder="ale-santiago"
                                value={urlEvento}
                                onChange={(e) => setUrlEvento(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                            />
                            {urlStatus && (
                                <span className={`${styles.badge} ${styles[`badge_${urlStatus}`]}`}>
                                    {urlStatus === 'disponible' && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                                    {urlStatus === 'ocupada' && <X size={12} strokeWidth={3} aria-hidden="true" />}
                                    {t(`sales.new_sale.url_${urlStatus === 'disponible' ? 'available' : urlStatus === 'ocupada' ? 'taken' : 'checking'}`)}
                                </span>
                            )}
                        </div>
                    </Field>

                    <Field label={t('sales.new_sale.phone')} htmlFor="ns-phone">
                        <div className={styles.phoneRow}>
                            <div className={styles.selectWrap}>
                                <select
                                    className={styles.nativeSelect}
                                    value={lada}
                                    onChange={(e) => setLada(e.target.value)}
                                    aria-label={t('sales.new_sale.country_code')}
                                >
                                    {PHONE_CODES.map(c => <option key={c.iso} value={c.code}>{c.flag} {c.code}</option>)}
                                </select>
                                <ChevronDown size={16} className={styles.selectChevron} aria-hidden="true" />
                            </div>
                            <TextInput
                                id="ns-phone"
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel-national"
                                placeholder="614 123 4567"
                                value={telefonoLocal}
                                onChange={(e) => setTelefonoLocal(e.target.value.replace(/\D/g, ''))}
                            />
                        </div>
                    </Field>

                    <Field label={t('sales.new_sale.event_date')} htmlFor="ns-date">
                        <TextInput
                            id="ns-date"
                            type="date"
                            className={styles.dateInput}
                            value={fechaEvento}
                            onChange={(e) => setFechaEvento(e.target.value)}
                        />
                    </Field>
                </>
            )}

            {/* ── Paso 3: pago ── */}
            {paso === 2 && (
                <>
                    <Field label={t('sales.new_sale.plan')}>
                        <div className={styles.planGrid} role="radiogroup" aria-label={t('sales.new_sale.plan')}>
                            {PLANS.map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    role="radio"
                                    aria-checked={plan === p}
                                    className={`${styles.planCard} ${plan === p ? styles.planCardActive : ''}`}
                                    onClick={() => setPlan(p)}
                                >
                                    {plan === p && <span className={styles.planCheck}><Check size={14} strokeWidth={3} /></span>}
                                    <span className={styles.planName}>{p}</span>
                                    <span className={styles.planPrice}>{formatCurrency(DEFAULT_PRICE[p])}</span>
                                </button>
                            ))}
                        </div>
                    </Field>

                    {canDiscount && (
                        <Field label={t('sales.new_sale.discount_label')}>
                            <ChipGroup
                                fill={discountOptions.length <= 4}
                                label={t('sales.new_sale.discount_label')}
                                value={descuentoPct}
                                onChange={setDescuentoPct}
                                options={discountOptions.map(d => ({
                                    value: d,
                                    label: d === 0 ? t('sales.new_sale.no_discount_short') : `${d}%`,
                                }))}
                            />
                        </Field>
                    )}

                    <Card>
                        <div className={styles.priceRow}>
                            <span>{t('sales.new_sale.list_price')}</span>
                            <span>{formatCurrency(DEFAULT_PRICE[plan])}</span>
                        </div>
                        {descuentoPct > 0 && (
                            <div className={styles.priceRow}>
                                <span>{t('sales.new_sale.discount_line', { pct: descuentoPct })}</span>
                                <span>−{formatCurrency(DEFAULT_PRICE[plan] - precioAcordado)}</span>
                            </div>
                        )}
                        <div className={styles.priceTotal}>
                            <span>{t('sales.new_sale.subtotal')}</span>
                            <span className={styles.priceTotalValue}>{formatCurrency(precioAcordado)}</span>
                        </div>
                    </Card>

                    {(linkPago || linksMeses.length > 0 || configPagos?.transferencia) && (
                        <Field label={t('sales.new_sale.how_pays')}>
                            <Card className={styles.listCard}>
                                {linkPago && (
                                    <CopyRow
                                        primary
                                        title={descuentoPct > 0
                                            ? t('sales.new_sale.payment_link_plan_discount', { plan, pct: descuentoPct })
                                            : t('sales.new_sale.payment_link_plan', { plan })}
                                        value={linkPago.replace(/^https?:\/\//, '')}
                                        href={linkPago}
                                        copyLabel={t('sales.new_sale.copy')}
                                        onCopy={() => handleCopy(linkPago)}
                                    />
                                )}
                                {linksMeses.map(({ months, url, amount }) => (
                                    <CopyRow
                                        key={months}
                                        title={`${t('sales.new_sale.installments_link', { plan, months })}${amount ? ` · ${formatMXN(amount)}` : ''}`}
                                        value={url.replace(/^https?:\/\//, '')}
                                        href={url}
                                        copyLabel={t('sales.new_sale.copy')}
                                        onCopy={() => handleCopy(url)}
                                    />
                                ))}
                                {configPagos?.transferencia && (
                                    <CopyRow
                                        mono
                                        title={t('sales.payment.transfer')}
                                        value={formatClabe(configPagos.transferencia.clabe)}
                                        copyLabel={t('sales.new_sale.copy')}
                                        onCopy={() => handleCopy(configPagos.transferencia.clabe)}
                                    />
                                )}
                            </Card>
                        </Field>
                    )}
                </>
            )}
        </Screen>
    )
}
