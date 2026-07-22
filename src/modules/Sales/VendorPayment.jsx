import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, InputNumber, Select, Upload } from 'antd'
import { ArrowLeft, FileText, Paperclip } from 'lucide-react'
import dayjs from 'dayjs'
import { registrarPago, subirComprobante, fetchHistorialPagos } from './salesApi'
import styles from './VendorPayment.module.css'

const formatCurrency = (value) =>
    `$${Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

const METODOS = ['transferencia', 'stripe', 'efectivo', 'otro']

export const VendorPayment = ({ venta, onDone }) => {
    const { t } = useTranslation()
    const [monto, setMonto] = useState(null)
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

    const handleSubmit = async () => {
        setError('')

        if (!monto || monto <= 0) {
            setError(t('sales.payment.err_monto'))
            return
        }

        setSubmitting(true)
        try {
            const { data } = await registrarPago({
                venta_id: venta.venta_id,
                monto: Number(monto),
                metodo,
            })

            if (archivo) {
                try { await subirComprobante(data.pago_id, archivo) } catch (e) { void e }
            }

            setSaldo({ total_pagado: data.total_pagado, saldo_pendiente: data.saldo_pendiente })
            setSuccess(true)
            setMonto(null)
            setArchivo(null)
            cargarHistorial()
        } catch (err) {
            setError(err.response?.data?.msg || t('sales.payment.err_generic'))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.headerRow}>
                <Button type='text' className={styles.backBtn} icon={<ArrowLeft size={18} />} onClick={onDone} />
                <div className={styles.title}>{t('sales.payment.title')}</div>
            </div>

            <div className={styles.summaryCard}>
                <div className={styles.summaryEvento}>{venta?.evento}</div>
                <div className={styles.summaryRow}>
                    <span>{t('sales.payment.total_pagado')}</span>
                    <span>{formatCurrency(saldo.total_pagado)}</span>
                </div>
                <div className={styles.summaryRow}>
                    <span>{t('sales.payment.saldo_pendiente')}</span>
                    <span className={styles.saldoPendiente}>{formatCurrency(saldo.saldo_pendiente)}</span>
                </div>
            </div>

            <div className={styles.historyCard}>
                <div className={styles.historyTitle}>{t('sales.payment.history_title')}</div>

                {loadingHistorial && <div className={styles.historyEmpty}>{t('sales.payment.history_loading')}</div>}
                {!loadingHistorial && historial.length === 0 && (
                    <div className={styles.historyEmpty}>{t('sales.payment.history_empty')}</div>
                )}

                {historial.map((pago) => (
                    <div className={styles.historyRow} key={pago.id}>
                        <div className={styles.historyRowText}>
                            <span className={styles.historyAmount}>{formatCurrency(pago.monto)}</span>
                            <span className={styles.historyMeta}>
                                {t(`sales.payment.method_${pago.metodo}`)} · {dayjs(pago.created_at).format('DD MMM YYYY')}
                            </span>
                        </div>
                        {pago.comprobante_signed_url ? (
                            <a
                                href={pago.comprobante_signed_url}
                                target='_blank'
                                rel='noreferrer'
                                className={styles.historyProofLink}
                            >
                                <FileText size={12} />
                                {t('sales.payment.view_proof')}
                            </a>
                        ) : (
                            <span className={styles.historyNoProof}>{t('sales.payment.no_proof')}</span>
                        )}
                    </div>
                ))}
            </div>

            <div className={styles.formLabel}>{t('sales.payment.add_payment')}</div>

            <div className={styles.form}>
                <div className={styles.row}>
                    <InputNumber
                        className={styles.inputNumber}
                        style={{ flex: 1, borderRadius:'99px' }}
                        placeholder={t('sales.payment.amount')}
                        min={1}
                        value={monto}
                        onChange={setMonto}
                        prefix='$'
                        controls={false}
                    />
                    <Select
                        suffixIcon={null}
                        className={styles.selectAntd}
                        style={{ flex: 1 }}
                        value={metodo}
                        onChange={setMetodo}
                        options={METODOS.map((m) => ({ value: m, label: t(`sales.payment.method_${m}`) }))}
                    />
                </div>

                <Upload
                    accept='image/*,application/pdf'
                    maxCount={1}
                    beforeUpload={(file) => { setArchivo(file); return false }}
                    onRemove={() => setArchivo(null)}
                    showUploadList={archivo ? { showRemoveIcon: true } : false}
                    fileList={archivo ? [{ uid: '1', name: archivo.name, status: 'done' }] : []}
                    className={styles.upload}
                >
                    <div className={styles.uploadBox}>
                        <div className={styles.uploadLabel}>{t('sales.payment.proof')}</div>
                        <Button size='small' icon={<Paperclip size={12} />} className={styles.uploadBtn}>
                            {archivo ? archivo.name : t('sales.payment.upload_proof')}
                        </Button>
                        <div className={styles.uploadHint}>{t('sales.payment.proof_hint')}</div>
                    </div>
                </Upload>

                {error && <div className={styles.hintError}>{error}</div>}
                {success && <div className={styles.hintSuccess}>{t('sales.payment.success')}</div>}

                <Button
                    block
                    className={styles.submitBtn}
                    loading={submitting}
                    onClick={handleSubmit}
                >
                    {submitting ? t('sales.payment.submitting') : t('sales.payment.submit')}
                </Button>
            </div>
        </div>
    )
}
