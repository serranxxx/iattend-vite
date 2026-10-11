import { useEffect, useMemo, useRef, useState } from 'react'
import { Drawer, Grid } from 'antd'
import { PlannerFlashFlow } from './PlannerFlashFlow'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check, ChevronDown, CreditCard, Gift, Mail, PartyPopper, X, Zap } from 'lucide-react'
import { checkUrlDisponible } from '../../modules/Sales/salesApi'
import { PHONE_CODES } from '../../helpers/assets/phoneCodes'
import { formatMXN, planTerms, termCaption, usePlans } from '../../hooks/usePlans'
import {
    Screen, ScreenHeader, StickyFooter, PrimaryButton, Field, TextInput, Hint, Segmented, Steps, Card,
} from '../../modules/Sales/SalesUi'
import { checkoutEvento, crearEventoGratis, fetchBeneficios } from './plannerEventApi'
// Mismos campos que la nueva venta de /sales: se reutilizan sus estilos.
import salesStyles from '../../modules/Sales/VendorNewSale.module.css'
import styles from './PlannerEventDrawer.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PLANES_COMPRA = ['pro', 'lite']

/**
 * Alta de un evento para un cliente del planner, en un drawer que sale de la
 * derecha desde su página de invitaciones (PlannerLayout).
 *   modo 'gratis' → consume uno de sus eventos gratis (siempre PRO).
 *   modo 'compra' → elige Lite o PRO y paga en Stripe con su descuento.
 * En los dos casos el cliente recibe su usuario y contraseña por correo y el
 * planner queda asignado al evento. Backend: controllers/planner.js.
 * `onCreated` corre al cerrar tras crear un evento gratis (para recargar).
 * modo 'flash-gratis' → un Evento Flash gratis (PlannerFlashFlow). En
 * 'compra' el primer paso deja elegir Invitación o Evento Flash.
 */
export const PlannerEventDrawer = ({ open, modo, onClose, onCreated }) => {
    const screens = Grid.useBreakpoint()
    return (
        <Drawer
            open={open}
            onClose={onClose}
            placement='right'
            width={screens.sm ? 520 : '100%'}
            destroyOnHidden
            closable={false}
            title={null}
            // Esquinas izquierdas redondeadas; en celular ocupa toda la pantalla.
            style={{ borderRadius: screens.sm ? '20px 0 0 20px' : 0, overflow: 'hidden' }}
            styles={{ header: { display: 'none' }, body: { padding: 0 } }}
        >
            <AltaEvento modo={modo} onClose={onClose} onCreated={onCreated} />
        </Drawer>
    )
}

// Dentro del drawer (se monta al abrir): elige el flujo según lo que se crea.
// Al comprar, lo primero es elegir Evento regular o Evento Flash; con eso se
// muestra su flujo y "atrás" en su primer paso regresa a esta elección. Los
// botones de gratis ya traen el tipo definido.
const AltaEvento = ({ modo, onClose, onCreated }) => {
    const { t } = useTranslation()
    const [tipo, setTipo] = useState(modo === 'flash-gratis' ? 'flash' : modo === 'gratis' ? 'regular' : null)
    const volverAElegir = modo === 'compra' ? () => setTipo(null) : undefined

    if (!tipo) {
        const opciones = [
            { key: 'regular', icono: <Mail size={22} />, titulo: t('planner_flash.kind_regular'), texto: t('planner_flash.kind_regular_text') },
            { key: 'flash', icono: <Zap size={22} />, titulo: t('planner_flash.kind_flash'), texto: t('planner_flash.kind_flash_text') },
        ]
        return (
            <Screen embedded>
                <ScreenHeader title={t('planner_event.title_buy')} onBack={onClose} backLabel={t('planner_event.cancel')} />
                <p className={styles.eleccionIntro}>{t('planner_flash.kind_label')}</p>
                <div className={styles.eleccion}>
                    {opciones.map(({ key, icono, titulo, texto }) => (
                        <button key={key} type='button' className={styles.opcion} onClick={() => setTipo(key)}>
                            <span className={styles.opcionIcono}>{icono}</span>
                            <span className={styles.opcionTexto}>
                                <strong>{titulo}</strong>
                                <span>{texto}</span>
                            </span>
                            <ArrowRight size={18} className={styles.opcionFlecha} aria-hidden='true' />
                        </button>
                    ))}
                </div>
            </Screen>
        )
    }

    return tipo === 'flash'
        ? <PlannerFlashFlow modo={modo === 'flash-gratis' ? 'gratis' : 'compra'} onBackToStart={volverAElegir} onClose={onClose} onCreated={onCreated} />
        : <PlannerEventFlow modo={modo} onBackToStart={volverAElegir} onClose={onClose} onCreated={onCreated} />
}

const PlannerEventFlow = ({ modo, onBackToStart, onClose, onCreated }) => {
    const { t } = useTranslation()
    const { getPlan } = usePlans()
    const raiz = useRef(null)

    const [paso, setPaso] = useState(0)
    const [beneficios, setBeneficios] = useState(null)

    // "Enviar después": el evento nace sin cliente y se le manda desde su
    // tarjeta en Mis clientes (PlannerSendDrawer).
    const [enviarDespues, setEnviarDespues] = useState(false)
    const [nombreCliente, setNombreCliente] = useState('')
    const [correoCliente, setCorreoCliente] = useState('')

    const [tipoEvento, setTipoEvento] = useState('boda')
    const [owner1, setOwner1] = useState('')
    const [owner2, setOwner2] = useState('')
    const [urlEvento, setUrlEvento] = useState('')
    const [urlStatus, setUrlStatus] = useState(null)
    const [lada, setLada] = useState('+52')
    const [telefonoLocal, setTelefonoLocal] = useState('')
    const [fechaEvento, setFechaEvento] = useState('')

    const [plan, setPlan] = useState('pro')
    const [meses, setMeses] = useState(0)

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [creado, setCreado] = useState(null)

    useEffect(() => {
        fetchBeneficios()
            .then(({ data }) => setBeneficios(data.beneficios))
            .catch(() => setBeneficios({ free_events: 0, discount_pct: 0 }))
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

    // Al cambiar de paso se empieza arriba del drawer.
    useEffect(() => {
        raiz.current?.closest('.ant-drawer-body')?.scrollTo({ top: 0 })
        setError('')
    }, [paso])

    // Al cambiar de plan, sus plazos son otros: se vuelve a contado.
    useEffect(() => { setMeses(0) }, [plan])

    const descuento = beneficios?.discount_pct ?? 0
    const sinEventosGratis = modo === 'gratis' && beneficios && beneficios.free_events < 1

    const plazos = useMemo(() => planTerms(getPlan(plan)), [getPlan, plan])
    const plazo = plazos.find(p => p.months === meses) ?? plazos[0]
    const total = plazo ? Math.round(plazo.amount * (1 - descuento / 100) * 100) / 100 : null

    const clienteCompleto = enviarDespues || (!!nombreCliente.trim() && EMAIL_RE.test(correoCliente.trim()))
    const eventoCompleto = !!urlEvento.trim()
        && urlStatus !== 'ocupada'
        && !!telefonoLocal.trim()
        && !!fechaEvento
        && (tipoEvento !== 'boda' || (!!owner1.trim() && !!owner2.trim()))

    const payload = () => ({
        ...(enviarDespues
            ? { enviar_despues: true }
            : { correo_cliente: correoCliente.trim(), nombre_cliente: nombreCliente.trim() }),
        tipo_evento: tipoEvento,
        url_evento: urlEvento.trim(),
        telefono: `${lada}${telefonoLocal.trim().replace(/\D/g, '')}`,
        owners: tipoEvento === 'boda' ? [owner1.trim(), owner2.trim()] : [],
        fecha_evento: fechaEvento,
    })

    const handleBack = () => (paso === 0 ? (onBackToStart ?? onClose)() : setPaso(paso - 1))

    const handleNext = () => {
        if (paso === 0 && !clienteCompleto) { setError(t('planner_event.err_required')); return }
        if (paso === 1) {
            if (urlStatus === 'ocupada') { setError(t('planner_event.err_url_taken')); return }
            if (!eventoCompleto) { setError(t('planner_event.err_required')); return }
        }
        setPaso(paso + 1)
    }

    // Administración puede crear sin costo (el backend no le gasta eventos
    // gratis). Se crea como PRO, igual que un evento gratis.
    const esAdmin = JSON.parse(localStorage.getItem('session') || 'null')?.user?.role === 'Administration'

    const handleSubmit = async ({ sinCosto = false } = {}) => {
        if (submitting) return
        setError('')
        setSubmitting(true)
        try {
            if (modo === 'gratis' || sinCosto) {
                const { data } = await crearEventoGratis(payload())
                setCreado(data)
            } else {
                const { data } = await checkoutEvento({
                    ...payload(),
                    plan,
                    lookupKey: plazo?.lookup_key ?? undefined,
                    origin: window.location.origin,
                })
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
                    <h1 className={styles.listoTitulo}>{t('planner_event.done_title')}</h1>
                    <p className={styles.listoTexto}>
                        {creado.sin_cliente
                            ? t('planner_event.done_later')
                            : creado.cliente_existente
                                ? t('planner_event.done_existing', { correo: correoCliente.trim() })
                                : t('planner_event.done_new', { correo: correoCliente.trim() })}
                    </p>
                    <a className={styles.listoUrl} href={creado.url_publica} target='_blank' rel='noreferrer'>
                        {creado.url_publica.replace(/^https?:\/\//, '')}
                    </a>
                </div>
            </Screen>
        )
    }

    const pasoCompleto = paso === 0 ? clienteCompleto : paso === 1 ? eventoCompleto : !sinEventosGratis && (modo === 'gratis' || !!plazo)

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
                        ? t('planner_event.submit_free')
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
            {/* Ancla para subir el scroll del drawer al cambiar de paso */}
            <div ref={raiz} style={{ display: 'none' }} />
            <ScreenHeader
                title={modo === 'gratis' ? t('planner_event.title_free') : t('planner_event.title_buy')}
                onBack={handleBack}
                backLabel={paso === 0 ? t('planner_event.cancel') : t('planner_event.back')}
                aside={t('planner_event.step_of', { n: paso + 1, total: 3 })}
            />
            <Steps
                current={paso}
                labels={[t('planner_event.step_client'), t('planner_event.step_event'), modo === 'gratis' ? t('planner_event.step_confirm') : t('planner_event.step_payment')]}
            />

            {paso === 0 && (
                <>
                    <Segmented
                        label={t('planner_event.when_send')}
                        value={enviarDespues}
                        onChange={setEnviarDespues}
                        options={[
                            { value: false, label: t('planner_event.send_now') },
                            { value: true, label: t('planner_event.send_later') },
                        ]}
                    />
                    {enviarDespues ? (
                        <Hint>{t('planner_event.send_later_hint')}</Hint>
                    ) : (
                        <>
                            <Field label={t('planner_event.client_name')} htmlFor='pe-name'>
                                <TextInput id='pe-name' autoComplete='off' value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} />
                            </Field>
                            <Field label={t('planner_event.client_email')} htmlFor='pe-email' hint={<Hint>{t('planner_event.client_email_hint')}</Hint>}>
                                <TextInput
                                    id='pe-email'
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
                    <Field label={t('planner_event.event_type')}>
                        <Segmented
                            label={t('planner_event.event_type')}
                            value={tipoEvento}
                            onChange={setTipoEvento}
                            options={[
                                { value: 'boda', label: t('planner_event.event_type_boda') },
                                { value: 'xv', label: t('planner_event.event_type_xv') },
                            ]}
                        />
                    </Field>

                    {tipoEvento === 'boda' && (
                        <div className={salesStyles.twoCols}>
                            <Field label={t('planner_event.owner_1')} htmlFor='pe-o1'>
                                <TextInput id='pe-o1' value={owner1} onChange={(e) => setOwner1(e.target.value)} />
                            </Field>
                            <Field label={t('planner_event.owner_2')} htmlFor='pe-o2'>
                                <TextInput id='pe-o2' value={owner2} onChange={(e) => setOwner2(e.target.value)} />
                            </Field>
                        </div>
                    )}

                    <Field
                        label={t('planner_event.event_url')}
                        htmlFor='pe-url'
                        hint={urlStatus === 'ocupada'
                            ? <Hint tone='error'>{t('planner_event.url_taken_hint')}</Hint>
                            : <Hint>iattend.events/{tipoEvento === 'boda' ? 'wedding' : 'xv'}/{urlEvento || '…'}</Hint>}
                    >
                        <div className={salesStyles.inputWithBadge}>
                            <TextInput
                                id='pe-url'
                                autoCapitalize='none'
                                autoCorrect='off'
                                placeholder='ale-santiago'
                                value={urlEvento}
                                onChange={(e) => setUrlEvento(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9&-]/g, ''))}
                            />
                            {urlStatus && (
                                <span className={`${salesStyles.badge} ${salesStyles[`badge_${urlStatus}`]}`}>
                                    {urlStatus === 'disponible' && <Check size={12} strokeWidth={3} aria-hidden='true' />}
                                    {urlStatus === 'ocupada' && <X size={12} strokeWidth={3} aria-hidden='true' />}
                                    {t(`planner_event.url_${urlStatus === 'disponible' ? 'available' : urlStatus === 'ocupada' ? 'taken' : 'checking'}`)}
                                </span>
                            )}
                        </div>
                    </Field>

                    <Field label={t('planner_event.phone')} htmlFor='pe-phone'>
                        <div className={salesStyles.phoneRow}>
                            <div className={salesStyles.selectWrap}>
                                <select
                                    className={salesStyles.nativeSelect}
                                    value={lada}
                                    onChange={(e) => setLada(e.target.value)}
                                    aria-label={t('planner_event.country_code')}
                                >
                                    {PHONE_CODES.map(c => <option key={c.iso} value={c.code}>{c.flag} {c.code}</option>)}
                                </select>
                                <ChevronDown size={16} className={salesStyles.selectChevron} aria-hidden='true' />
                            </div>
                            <TextInput
                                id='pe-phone'
                                type='tel'
                                inputMode='numeric'
                                autoComplete='off'
                                placeholder='614 123 4567'
                                value={telefonoLocal}
                                onChange={(e) => setTelefonoLocal(e.target.value.replace(/\D/g, ''))}
                            />
                        </div>
                    </Field>

                    <Field label={t('planner_event.event_date')} htmlFor='pe-date'>
                        <TextInput id='pe-date' type='date' className={salesStyles.dateInput} value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} />
                    </Field>
                </>
            )}

            {paso === 2 && modo === 'gratis' && (
                <Card>
                    <div className={styles.resumen}>
                        <span className={styles.resumenIcono}><Gift size={20} /></span>
                        <div>
                            <strong>{t('planner_event.free_summary_title')}</strong>
                            <p>
                                {sinEventosGratis
                                    ? t('planner_event.free_none_left')
                                    : t('planner_event.free_summary_text', { count: Math.max((beneficios?.free_events ?? 1) - 1, 0) })}
                            </p>
                        </div>
                    </div>
                    <div className={salesStyles.priceTotal}>
                        <span>{t('planner_event.total')}</span>
                        <span className={salesStyles.priceTotalValue}>{formatMXN(0)}</span>
                    </div>
                </Card>
            )}

            {paso === 2 && modo === 'compra' && (
                <>
                    <Field label={t('planner_event.plan')}>
                        <div className={salesStyles.planGrid} role='radiogroup' aria-label={t('planner_event.plan')}>
                            {PLANES_COMPRA.map(p => (
                                <button
                                    key={p}
                                    type='button'
                                    role='radio'
                                    aria-checked={plan === p}
                                    className={`${salesStyles.planCard} ${plan === p ? salesStyles.planCardActive : ''}`}
                                    onClick={() => setPlan(p)}
                                >
                                    {plan === p && <span className={salesStyles.planCheck}><Check size={14} strokeWidth={3} /></span>}
                                    <span className={salesStyles.planName}>{getPlan(p)?.name || p.toUpperCase()}</span>
                                    <span className={salesStyles.planPrice}>{getPlan(p)?.price ? formatMXN(getPlan(p).price.amount) : '—'}</span>
                                </button>
                            ))}
                        </div>
                    </Field>

                    {plazos.length > 1 && (
                        <Field label={t('planner_event.how_to_pay')}>
                            <div className={styles.plazos} role='radiogroup' aria-label={t('planner_event.how_to_pay')}>
                                {plazos.map(p => (
                                    <button
                                        key={p.months}
                                        type='button'
                                        role='radio'
                                        aria-checked={meses === p.months}
                                        className={`${styles.plazo} ${meses === p.months ? styles.plazoActivo : ''}`}
                                        onClick={() => setMeses(p.months)}
                                    >
                                        <strong>{p.months ? t('planner_event.months', { n: p.months }) : t('planner_event.one_payment')}</strong>
                                        <span>{termCaption(p)}</span>
                                    </button>
                                ))}
                            </div>
                        </Field>
                    )}

                    {plazo && (
                        <Card>
                            <div className={salesStyles.priceRow}>
                                <span>{t('planner_event.list_price')}</span>
                                <span>{formatMXN(plazo.amount)}</span>
                            </div>
                            {descuento > 0 && (
                                <div className={salesStyles.priceRow}>
                                    <span>{t('planner_event.discount_line', { pct: descuento })}</span>
                                    <span>−{formatMXN(Math.round((plazo.amount - total) * 100) / 100)}</span>
                                </div>
                            )}
                            <div className={salesStyles.priceTotal}>
                                <span>{t('planner_event.total')}</span>
                                <span className={salesStyles.priceTotalValue}>{formatMXN(total)}</span>
                            </div>
                        </Card>
                    )}
                    <Hint>{t('planner_event.pay_hint')}</Hint>
                </>
            )}
        </Screen>
    )
}

