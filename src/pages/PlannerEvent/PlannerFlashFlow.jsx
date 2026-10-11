import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CreditCard, Gift, PartyPopper, Zap } from 'lucide-react'
import { formatMXN } from '../../hooks/usePlans'
import {
    Screen, ScreenHeader, StickyFooter, PrimaryButton, Field, TextInput, Hint, Segmented, Steps, Card,
} from '../../modules/Sales/SalesUi'
import { checkoutFlash, crearFlashGratis, fetchBeneficios, fetchPrecioFlash } from './plannerEventApi'
import salesStyles from '../../modules/Sales/VendorNewSale.module.css'
import styles from './PlannerEventDrawer.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Alta de un Evento Flash (side event sin invitación) dentro del drawer de
 * PlannerEventDrawer. Pasos: para quién (para mí / a mi cliente ahora /
 * enviar después) → datos (nombre, fecha, hora) → pago o confirmación.
 *   modo 'compra' → Stripe con su descuento (lo crea el webhook).
 *   modo 'gratis' → consume uno de sus Eventos Flash gratis.
 * El diseño y los invitados se arman después en el editor de side events
 * (/dashboard/side?flash=<id>). Backend: helpers/flashEvent.js.
 */
export const PlannerFlashFlow = ({ modo, onBackToStart, onClose, onCreated }) => {
    const { t } = useTranslation()
    const raiz = useRef(null)

    const [paso, setPaso] = useState(0)
    const [destino, setDestino] = useState('mio')
    const [nombreCliente, setNombreCliente] = useState('')
    const [correoCliente, setCorreoCliente] = useState('')
    const [nombre, setNombre] = useState('')
    const [fecha, setFecha] = useState('')
    const [hora, setHora] = useState('')
    const [precio, setPrecio] = useState(null)
    const [precioError, setPrecioError] = useState(null)
    const [gratisDisponibles, setGratisDisponibles] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [creado, setCreado] = useState(null)

    useEffect(() => {
        if (modo === 'gratis') {
            fetchBeneficios()
                .then(({ data }) => setGratisDisponibles(data.beneficios?.free_flash_events ?? 0))
                .catch(() => setGratisDisponibles(0))
        } else {
            fetchPrecioFlash()
                .then(({ data }) => setPrecio(data))
                .catch((err) => {
                    // Sin precio no se puede pagar: se dice por qué en vez de
                    // quedarse en "Cargando precio…".
                    console.error('No se pudo cargar el precio del Evento Flash:', err.response?.status, err.response?.data || err.message)
                    setPrecioError(err.response?.data?.msg || err.message)
                })
        }
    }, [modo])

    useEffect(() => {
        raiz.current?.closest('.ant-drawer-body')?.scrollTo({ top: 0 })
        setError('')
    }, [paso])

    const descuento = precio?.discount_pct ?? 0
    const total = precio ? Math.round(precio.amount * (1 - descuento / 100) * 100) / 100 : null
    const sinGratis = modo === 'gratis' && gratisDisponibles != null && gratisDisponibles < 1

    const destinoCompleto = destino !== 'ahora' || (!!nombreCliente.trim() && EMAIL_RE.test(correoCliente.trim()))
    const datosCompletos = !!nombre.trim() && !!fecha
    const pasoCompleto = paso === 0 ? destinoCompleto : paso === 1 ? datosCompletos : !sinGratis && (modo === 'gratis' || total != null)

    const payload = () => ({
        destino,
        nombre: nombre.trim(),
        fecha,
        hora: hora || null,
        ...(destino === 'ahora' ? { correo_cliente: correoCliente.trim(), nombre_cliente: nombreCliente.trim() } : {}),
    })

    const handleBack = () => (paso === 0 ? (onBackToStart ?? onClose)() : setPaso(paso - 1))
    const handleNext = () => {
        if (!pasoCompleto) { setError(t('planner_event.err_required')); return }
        setPaso(paso + 1)
    }

    // Administración puede crear sin costo (el backend no le gasta Flash gratis).
    const esAdmin = JSON.parse(localStorage.getItem('session') || 'null')?.user?.role === 'Administration'

    const handleSubmit = async ({ sinCosto = false } = {}) => {
        if (submitting) return
        setError('')
        setSubmitting(true)
        try {
            if (modo === 'gratis' || sinCosto) {
                const { data } = await crearFlashGratis(payload())
                setCreado(data)
            } else {
                const { data } = await checkoutFlash({ ...payload(), origin: window.location.origin })
                window.location.href = data.url
                return
            }
        } catch (err) {
            setError(err.response?.data?.msg || t('planner_event.err_generic'))
        }
        setSubmitting(false)
    }

    if (creado) {
        return (
            <Screen embedded footer={(
                <StickyFooter solid>
                    <PrimaryButton onClick={() => { onCreated?.(); onClose() }} iconEnd={<ArrowRight size={18} aria-hidden='true' />}>
                        {t('planner_event.back_to_events')}
                    </PrimaryButton>
                </StickyFooter>
            )}>
                <div className={styles.listo} ref={raiz}>
                    <span className={styles.listoIcono}><PartyPopper size={28} /></span>
                    <h1 className={styles.listoTitulo}>{t('planner_flash.done_title')}</h1>
                    <p className={styles.listoTexto}>
                        {creado.sin_cliente
                            ? t('planner_flash.done_later')
                            : destino === 'ahora'
                                ? (creado.cliente_existente
                                    ? t('planner_event.done_existing', { correo: correoCliente.trim() })
                                    : t('planner_event.done_new', { correo: correoCliente.trim() }))
                                : t('planner_flash.done_mine')}
                    </p>
                </div>
            </Screen>
        )
    }

    const footer = (
        <StickyFooter solid>
            {error && <p className={salesStyles.error} role='alert'>{error}</p>}
            {paso < 2 ? (
                <PrimaryButton disabled={!pasoCompleto} onClick={handleNext} iconEnd={<ArrowRight size={18} aria-hidden='true' />}>
                    {t('planner_event.continue')}
                </PrimaryButton>
            ) : (
                <PrimaryButton
                    icon={modo === 'gratis' ? <Gift size={20} /> : <CreditCard size={20} />}
                    loading={submitting}
                    disabled={!pasoCompleto}
                    onClick={() => handleSubmit()}
                >
                    {modo === 'gratis'
                        ? t('planner_flash.submit_free')
                        : t('planner_event.submit_pay', { amount: total != null ? formatMXN(total) : '' })}
                </PrimaryButton>
            )}
            {paso === 2 && modo === 'compra' && esAdmin && (
                <button type='button' className={styles.sinCosto} onClick={() => handleSubmit({ sinCosto: true })} disabled={submitting}>
                    {t('planner_event.admin_free')}
                </button>
            )}
        </StickyFooter>
    )

    return (
        <Screen embedded footer={footer}>
            <div ref={raiz} style={{ display: 'none' }} />
            <ScreenHeader
                title={modo === 'gratis' ? t('planner_flash.title_free') : t('planner_event.title_buy')}
                onBack={handleBack}
                backLabel={paso === 0 ? t('planner_event.cancel') : t('planner_event.back')}
                aside={t('planner_event.step_of', { n: paso + 1, total: 3 })}
            />
            <Steps
                current={paso}
                labels={[t('planner_flash.step_for'), t('planner_flash.step_data'), modo === 'gratis' ? t('planner_event.step_confirm') : t('planner_event.step_payment')]}
            />

            {paso === 0 && (
                <>
                    <Segmented
                        label={t('planner_flash.for_label')}
                        value={destino}
                        onChange={setDestino}
                        options={[
                            { value: 'mio', label: t('planner_flash.for_me') },
                            { value: 'ahora', label: t('planner_flash.for_client') },
                            { value: 'despues', label: t('planner_event.send_later') },
                        ]}
                    />
                    {destino === 'mio' && <Hint>{t('planner_flash.for_me_hint')}</Hint>}
                    {destino === 'despues' && <Hint>{t('planner_flash.later_hint')}</Hint>}
                    {destino === 'ahora' && (
                        <>
                            <Field label={t('planner_event.client_name')} htmlFor='pf-name'>
                                <TextInput id='pf-name' autoComplete='off' value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} />
                            </Field>
                            <Field label={t('planner_event.client_email')} htmlFor='pf-email' hint={<Hint>{t('planner_event.client_email_hint')}</Hint>}>
                                <TextInput
                                    id='pf-email'
                                    type='email'
                                    inputMode='email'
                                    autoComplete='off'
                                    autoCapitalize='none'
                                    placeholder='cliente@correo.com'
                                    value={correoCliente}
                                    onChange={(e) => setCorreoCliente(e.target.value)}
                                />
                            </Field>
                        </>
                    )}
                </>
            )}

            {paso === 1 && (
                <>
                    <Field label={t('planner_flash.name')} htmlFor='pf-nombre' hint={<Hint>{t('planner_flash.name_hint')}</Hint>}>
                        <TextInput id='pf-nombre' maxLength={120} placeholder={t('planner_flash.name_placeholder')} value={nombre} onChange={(e) => setNombre(e.target.value)} />
                    </Field>
                    <div className={salesStyles.twoCols}>
                        <Field label={t('planner_event.event_date')} htmlFor='pf-fecha'>
                            <TextInput id='pf-fecha' type='date' className={salesStyles.dateInput} value={fecha} onChange={(e) => setFecha(e.target.value)} />
                        </Field>
                        <Field label={t('planner_flash.hour')} htmlFor='pf-hora'>
                            <TextInput id='pf-hora' type='time' className={salesStyles.dateInput} value={hora} onChange={(e) => setHora(e.target.value)} />
                        </Field>
                    </div>
                </>
            )}

            {paso === 2 && (
                <Card>
                    <div className={styles.resumen}>
                        <span className={styles.resumenIcono}><Zap size={20} /></span>
                        <div>
                            <strong>{nombre.trim()}</strong>
                            <p>{t('planner_flash.summary_text')}</p>
                        </div>
                    </div>
                    {modo === 'gratis' ? (
                        <>
                            <p className={styles.notaGratis}>
                                {sinGratis
                                    ? t('planner_flash.free_none_left')
                                    : t('planner_flash.free_left', { count: Math.max((gratisDisponibles ?? 1) - 1, 0) })}
                            </p>
                            <div className={salesStyles.priceTotal}>
                                <span>{t('planner_event.total')}</span>
                                <span className={salesStyles.priceTotalValue}>{formatMXN(0)}</span>
                            </div>
                        </>
                    ) : precio ? (
                        <>
                            <div className={salesStyles.priceRow}>
                                <span>{t('planner_event.list_price')}</span>
                                <span>{formatMXN(precio.amount)}</span>
                            </div>
                            {descuento > 0 && (
                                <div className={salesStyles.priceRow}>
                                    <span>{t('planner_event.discount_line', { pct: descuento })}</span>
                                    <span>−{formatMXN(Math.round((precio.amount - total) * 100) / 100)}</span>
                                </div>
                            )}
                            <div className={salesStyles.priceTotal}>
                                <span>{t('planner_event.total')}</span>
                                <span className={salesStyles.priceTotalValue}>{formatMXN(total)}</span>
                            </div>
                        </>
                    ) : precioError ? (
                        <Hint tone='error'>{t('planner_flash.price_error', { msg: precioError })}</Hint>
                    ) : (
                        <Hint>{t('planner_flash.price_loading')}</Hint>
                    )}
                </Card>
            )}
        </Screen>
    )
}
