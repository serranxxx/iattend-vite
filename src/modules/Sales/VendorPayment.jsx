import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Check, X } from 'lucide-react'
import dayjs from 'dayjs'
import { registrarPago, subirComprobante, fetchHistorialPagos } from './salesApi'
import {
    Screen, ScreenHeader, StickyFooter, PrimaryButton, SectionLabel, ChipGroup, Card, ProgressBar, StatusPill,
} from './SalesUi'
import { estadoDePago, formatCurrency } from './salesFormat'
import styles from './VendorPayment.module.css'

const METODOS = ['transferencia', 'stripe', 'efectivo', 'otro']
const ACCEPT_PROOF = 'image/*,application/pdf'

// "1,500.50" → 1500.5; vacío o inválido → 0
const parseMonto = (texto) => Number(String(texto).replace(/[^0-9.]/g, '')) || 0

// Lo que escribe el vendedor, con separador de miles: "1800" → "1,800"
const formatMontoInput = (texto) => {
    const [entero = '', ...resto] = String(texto).replace(/[^0-9.]/g, '').split('.')
    const miles = entero.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return resto.length ? `${miles}.${resto.join('').slice(0, 2)}` : miles
}

export const VendorPayment = ({ venta, onDone }) => {
    const { t } = useTranslation()
    const [monto, setMonto] = useState('')
    const [metodo, setMetodo] = useState('transferencia')
    const [archivo, setArchivo] = useState(null)
    const [saldo, setSaldo] = useState({
        total_pagado: venta?.total_pagado ?? 0,
        saldo_pendiente: venta?.saldo_pendiente ?? venta?.precio_acordado,
    })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [historial, setHistorial] = useState([])
    const [loadingHistorial, setLoadingHistorial] = useState(true)
    const [subiendoId, setSubiendoId] = useState(null)

    const cargarHistorial = () => {
        if (!venta?.venta_id) return
        setLoadingHistorial(true)
        fetchHistorialPagos(venta.venta_id)
            .then(({ data }) => setHistorial(data?.pagos || []))
            .catch(() => {})
            .finally(() => setLoadingHistorial(false))
    }

    useEffect(() => {
        cargarHistorial()
    }, [venta?.venta_id])

    const precio = Number(venta?.precio_acordado ?? (Number(saldo.total_pagado) + Number(saldo.saldo_pendiente)))
    const pagado = Number(saldo.total_pagado || 0)
    const pendiente = Math.max(0, Number(saldo.saldo_pendiente || 0))
    const pctPagado = precio > 0 ? Math.min(100, Math.round((pagado / precio) * 100)) : 0
    const estado = estadoDePago(pagado, pendiente)
    const montoNum = parseMonto(monto)

    const handleSubmit = async () => {
        if (submitting) return
        setError('')
        setSuccess(false)

        if (montoNum <= 0) {
            setError(t('sales.payment.err_monto'))
            return
        }

        setSubmitting(true)
        try {
            const { data } = await registrarPago({
                venta_id: venta.venta_id,
                monto: montoNum,
                metodo,
            })

            if (archivo) {
                try { await subirComprobante(data.pago_id, archivo) } catch (e) { void e }
            }

            setSaldo({ total_pagado: data.total_pagado, saldo_pendiente: data.saldo_pendiente })
            setSuccess(true)
            setMonto('')
            setArchivo(null)
            cargarHistorial()
        } catch (err) {
            setError(err.response?.data?.msg || t('sales.payment.err_generic'))
        } finally {
            setSubmitting(false)
        }
    }

    // Comprobante de un abono ya registrado (el "Subir después")
    const handleSubirComprobante = async (pagoId, file) => {
        if (!file) return
        setSubiendoId(pagoId)
        try {
            await subirComprobante(pagoId, file)
            cargarHistorial()
        } catch {
            setError(t('sales.payment.err_proof'))
        } finally {
            setSubiendoId(null)
        }
    }

    const meta = [
        venta?.plan,
        Number(venta?.descuento_pct) > 0 && t('sales.payment.discount_short', { pct: venta.descuento_pct }),
        formatCurrency(precio),
    ].filter(Boolean).join(' · ')

    return (
        <Screen
            footer={
                <StickyFooter solid>
                    {error && <p className={styles.error} role="alert">{error}</p>}
                    <PrimaryButton disabled={montoNum <= 0} loading={submitting} onClick={handleSubmit}>
                        {submitting
                            ? t('sales.payment.submitting')
                            : montoNum > 0
                                ? t('sales.payment.submit_amount', { amount: formatCurrency(montoNum) })
                                : t('sales.payment.submit')}
                    </PrimaryButton>
                </StickyFooter>
            }
        >
            <ScreenHeader title={t('sales.payment.title')} onBack={onDone} backLabel={t('sales.new_sale.back')} />

            <Card className={styles.summary}>
                <div className={styles.summaryTop}>
                    <div className={styles.summaryText}>
                        <span className={styles.evento}>{venta?.evento || '—'}</span>
                        <span className={styles.meta}>{meta}</span>
                    </div>
                    <StatusPill estado={estado} label={t(`sales.panel.status_${estado}`)} />
                </div>
                <div className={styles.balance}>
                    <span className={styles.balanceLabel}>{t('sales.payment.saldo_pendiente')}</span>
                    <span className={styles.balanceValue}>{formatCurrency(pendiente)}</span>
                </div>
                <div className={styles.progress}>
                    <ProgressBar thick pct={pctPagado} color={estado === 'completo' ? '#43B75D' : 'var(--light-green-500, #aac187)'} />
                    <div className={styles.progressLegend}>
                        <span>{t('sales.payment.paid_amount', { amount: formatCurrency(pagado) })}</span>
                        <span>{t('sales.payment.pct_paid', { pct: pctPagado })}</span>
                    </div>
                </div>
            </Card>

            <section className={styles.section}>
                <SectionLabel>{t('sales.payment.history_title')}</SectionLabel>
                <Card className={styles.listCard}>
                    {loadingHistorial && <div className={styles.empty}>{t('sales.payment.history_loading')}</div>}
                    {!loadingHistorial && historial.length === 0 && (
                        <div className={styles.empty}>{t('sales.payment.history_empty')}</div>
                    )}
                    {!loadingHistorial && historial.map((pago) => (
                        <div className={styles.historyRow} key={pago.id}>
                            <span className={styles.historyIcon} aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
                            <div className={styles.historyText}>
                                <span className={styles.historyAmount}>{formatCurrency(pago.monto)}</span>
                                <span className={styles.historyMeta}>
                                    {t(`sales.payment.method_${pago.metodo}`)} · {dayjs(pago.created_at).format('D MMM YYYY')}
                                </span>
                            </div>
                            {pago.comprobante_signed_url ? (
                                <a className={styles.historyAction} href={pago.comprobante_signed_url} target="_blank" rel="noreferrer">
                                    {t('sales.payment.view')}
                                </a>
                            ) : (
                                <label className={`${styles.historyAction} ${styles.historyUpload}`}>
                                    {subiendoId === pago.id ? t('sales.payment.uploading') : t('sales.payment.upload')}
                                    <input
                                        type="file"
                                        accept={ACCEPT_PROOF}
                                        className={styles.hiddenFile}
                                        disabled={subiendoId != null}
                                        aria-label={t('sales.payment.upload_proof_for', { amount: formatCurrency(pago.monto) })}
                                        onChange={(e) => { handleSubirComprobante(pago.id, e.target.files?.[0]); e.target.value = '' }}
                                    />
                                </label>
                            )}
                        </div>
                    ))}
                </Card>
            </section>

            <section className={styles.section}>
                <SectionLabel>{t('sales.payment.add_payment')}</SectionLabel>
                <Card className={styles.form}>
                    {success && <p className={styles.success} role="status">{t('sales.payment.success')}</p>}

                    <label className={styles.amount}>
                        <span className={styles.amountCurrency} aria-hidden="true">$</span>
                        <input
                            className={styles.amountInput}
                            inputMode="decimal"
                            placeholder="0"
                            aria-label={t('sales.payment.amount')}
                            value={monto}
                            onChange={(e) => { setMonto(formatMontoInput(e.target.value)); setSuccess(false) }}
                        />
                    </label>

                    {pendiente > 0 && (
                        <div className={styles.quick}>
                            <button type="button" className={styles.quickBtn} onClick={() => setMonto(formatMontoInput(pendiente))}>
                                {t('sales.payment.full_balance', { amount: formatCurrency(pendiente) })}
                            </button>
                            {pendiente > 1 && (
                                <button type="button" className={styles.quickBtn} onClick={() => setMonto(formatMontoInput(Math.ceil(pendiente / 2)))}>
                                    {t('sales.payment.half')}
                                </button>
                            )}
                        </div>
                    )}

                    <ChipGroup
                        fill
                        size="xs"
                        label={t('sales.payment.method')}
                        value={metodo}
                        onChange={setMetodo}
                        options={METODOS.map(m => ({ value: m, label: t(`sales.payment.method_short_${m}`) }))}
                    />

                    {archivo ? (
                        <div className={styles.proof}>
                            <span className={styles.proofIcon} aria-hidden="true"><Check size={18} /></span>
                            <div className={styles.proofText}>
                                <span className={styles.proofTitle}>{archivo.name}</span>
                                <span className={styles.proofHint}>{t('sales.payment.proof_ready')}</span>
                            </div>
                            <button type="button" className={styles.proofRemove} onClick={() => setArchivo(null)} aria-label={t('sales.payment.remove_proof')}>
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <label className={styles.proof}>
                            <span className={styles.proofIcon} aria-hidden="true"><Camera size={18} /></span>
                            <div className={styles.proofText}>
                                <span className={styles.proofTitle}>{t('sales.payment.proof_photo')}</span>
                                <span className={styles.proofHint}>{t('sales.payment.proof_optional')}</span>
                            </div>
                            <input
                                type="file"
                                accept={ACCEPT_PROOF}
                                className={styles.hiddenFile}
                                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                            />
                        </label>
                    )}
                </Card>
            </section>
        </Screen>
    )
}
