import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { DatePicker, TimePicker } from 'antd'
import dayjs from 'dayjs'
import { ArrowLeft } from 'lucide-react'
import { formatMXN } from '../../hooks/usePlans'
import { StickerFlotante } from '../Board/PopsSection'
import { checkoutPop, crearPopGratis, fetchBeneficios, fetchPrecioPop } from './plannerEventApi'
import styles from './PlannerPopFlow.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Créditos de WhatsApp que trae cada Pop: copia de POP_CREDITS en
// iattend--backend/helpers/popEvent.js (el precio todavía no los manda).
const POP_CREDITOS = 30
// Emoji de la vista previa (el Pop lo elige después en Diseño, body.emoji).
const EMOJI_PREVIA = '🎉'

const DESTINOS = [
    { key: 'mio', emoji: '🙋', color: 'var(--pops-amarillo)', titulo: 'for_me', texto: 'for_me_text' },
    { key: 'ahora', emoji: '💼', color: 'var(--pops-rosa)', titulo: 'for_client', texto: 'for_client_text' },
    { key: 'despues', emoji: '⏳', color: 'var(--pops-cian)', titulo: 'for_later', texto: 'for_later_text' },
]

// Collage de la confirmación (220 × 200).
const FIESTA = [
    { kind: 'burst', color: 'var(--pops-magenta)', size: 150, pos: { left: 35, top: 30 }, rot: -8, entrada: 0 },
    { kind: 'bubble', color: 'var(--pops-cian)', size: 110, pos: { left: 70, top: 50 }, rot: 6, entrada: 0.15 },
    { kind: 'heart', color: 'var(--pops-naranja)', size: 60, pos: { left: 0, top: 130 }, rot: -14, entrada: 0.3 },
    { kind: 'spark', color: 'var(--pops-menta)', size: 44, pos: { left: 170, top: 10 }, rot: 0, entrada: 0.4 },
    { kind: 'note', color: 'var(--pops-magenta)', size: 56, pos: { left: 160, top: 130 }, rot: 12, entrada: 0.5 },
]

/**
 * Alta de un Pop (side event sin invitación) dentro de PlannerEventDrawer
 * (handoff "Crear Pop"). Pasos: ¿Para quién es? (para mí / a mi cliente /
 * enviar después) → ¿Qué vamos a celebrar? (nombre, fecha, hora) → Pago y
 * una pantalla "¡Pop!" que abre el editor.
 * Si tiene Pops gratis, en el pago elige usar uno ($0, de entrada) o pagarlo
 * (Stripe con su descuento; lo crea el webhook). `modo` ya no separa los
 * flujos: 'gratis' solo dice que llegó desde un botón de gratis.
 * `soloParaMi`: un cliente con Pops gratis (Admin → Usuarios › Clientes): sin
 * "Para quién" y sin pagar (el precio es solo de planners).
 * Backend: helpers/popEvent.js.
 */
export const PlannerPopFlow = ({ soloParaMi = false, onBackToStart, onClose, onCreated }) => {
    const { t, i18n } = useTranslation()
    const navigate = useNavigate()
    const cuerpo = useRef(null)
    const inicio = soloParaMi ? 2 : 1

    const [paso, setPaso] = useState(inicio)
    const [destino, setDestino] = useState('mio')
    const [nombreCliente, setNombreCliente] = useState('')
    const [correoCliente, setCorreoCliente] = useState('')
    const [nombre, setNombre] = useState('')
    const [fecha, setFecha] = useState(null)
    const [hora, setHora] = useState(null)
    const [precio, setPrecio] = useState(null)
    const [precioError, setPrecioError] = useState(null)
    const [gratis, setGratis] = useState(null)
    const [usarGratis, setUsarGratis] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [creado, setCreado] = useState(null)

    useEffect(() => {
        fetchBeneficios()
            .then(({ data }) => setGratis(data.beneficios?.free_flash_events ?? 0))
            .catch(() => setGratis(0))
        if (soloParaMi) return
        fetchPrecioPop()
            .then(({ data }) => setPrecio(data))
            .catch((err) => {
                console.error('No se pudo cargar el precio del Pop:', err.response?.status, err.response?.data || err.message)
                setPrecioError(err.response?.data?.msg || err.message)
            })
    }, [soloParaMi])

    useEffect(() => {
        cuerpo.current?.scrollTo({ top: 0 })
        setError('')
    }, [paso])

    const hayGratis = (gratis ?? 0) > 0
    const gratisElegido = hayGratis && (usarGratis || soloParaMi)
    const descuento = precio?.discount_pct ?? 0
    const totalPago = precio ? Math.round(precio.amount * (1 - descuento / 100) * 100) / 100 : null
    const total = gratisElegido ? 0 : totalPago
    const creditos = precio?.credits ?? POP_CREDITOS

    const destinoCompleto = destino !== 'ahora' || (!!nombreCliente.trim() && EMAIL_RE.test(correoCliente.trim()))
    const datosCompletos = !!nombre.trim() && !!fecha
    const pagoListo = gratisElegido || (!soloParaMi && totalPago != null)
    const valido = paso === 1 ? destinoCompleto : paso === 2 ? datosCompletos : paso === 3 ? pagoListo : true

    // Administración puede crear sin costo (el backend no le gasta Pop gratis).
    const esAdmin = JSON.parse(localStorage.getItem('session') || 'null')?.user?.role === 'Administration'

    const payload = () => ({
        destino,
        nombre: nombre.trim(),
        fecha: fecha.format('YYYY-MM-DD'),
        hora: hora ? hora.format('HH:mm') : null,
        ...(destino === 'ahora' ? { correo_cliente: correoCliente.trim(), nombre_cliente: nombreCliente.trim() } : {}),
    })

    const enviar = async ({ sinCosto = false } = {}) => {
        if (submitting) return
        setError('')
        setSubmitting(true)
        try {
            if (gratisElegido || sinCosto) {
                // `sin_costo`: el botón de Administración "Crear sin costo" no
                // gasta un Pop gratis; "Usar un Pop gratis" sí (también a un admin).
                const { data } = await crearPopGratis({ ...payload(), ...(sinCosto && !gratisElegido ? { sin_costo: true } : {}) })
                setCreado(data)
                setPaso(4)
            } else {
                const { data } = await checkoutPop({ ...payload(), origin: window.location.origin })
                window.location.href = data.url
                return
            }
        } catch (err) {
            setError(err.response?.data?.msg || t('planner_event.err_generic'))
        }
        setSubmitting(false)
    }

    const abrirEditor = () => {
        onCreated?.()
        onClose()
        if (creado?.side_event_id) navigate(`/dashboard/side?pop=${creado.side_event_id}`)
    }

    const atras = () => {
        if (paso === 4) return abrirEditor()
        if (paso === inicio) return (onBackToStart ?? onClose)()
        setPaso(paso - 1)
    }

    const siguiente = () => {
        if (!valido || submitting) return
        if (paso < 3) setPaso(paso + 1)
        else if (paso === 3) enviar()
        else abrirEditor()
    }

    // ── Textos que se arman ──
    const fechaTexto = fecha
        ? `${fecha.toDate().toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }).replace('.', '')}${hora ? ` · ${hora.format('HH:mm')}` : ''}`
        : t('pop_flow.no_date')
    const nombrePrevio = nombre.trim() || t('pop_flow.your_event')
    const paraTexto = destino === 'mio'
        ? t('pop_flow.for_me')
        : destino === 'ahora'
            ? t('pop_flow.for_named', { name: nombreCliente.trim() || t('pop_flow.your_client') })
            : t('pop_flow.for_later')

    const etiquetas = [t('pop_flow.step_for'), t('pop_flow.step_data'), soloParaMi ? t('pop_flow.step_confirm') : t('pop_flow.step_pay')]
        .slice(inicio - 1)
    const totalPasos = etiquetas.length
    const pasoVisible = paso - inicio + 1

    const cta = paso < 3
        ? t('pop_flow.continue')
        : paso === 3
            ? (gratisElegido ? t('pop_flow.send_free') : totalPago != null ? t('pop_flow.pay', { amount: formatMXN(totalPago) }) : t('pop_flow.continue'))
            : t('pop_flow.open_editor')

    return (
        <div className={styles.panel}>
            <header className={styles.cabeza}>
                <div className={styles.cabezaFila}>
                    <button type='button' className={styles.atras} onClick={atras} aria-label={paso === inicio ? t('planner_event.cancel') : t('planner_event.back')}>
                        <ArrowLeft size={18} />
                    </button>
                    <span className={styles.titulo}>{t('pop_flow.title')}</span>
                    <span className={styles.chip}>{paso === 4 ? t('pop_flow.done_chip') : t('pop_flow.step_of', { n: pasoVisible, total: totalPasos })}</span>
                </div>
                <div className={styles.progreso} style={{ gridTemplateColumns: `repeat(${totalPasos}, minmax(0, 1fr))` }}>
                    {etiquetas.map((etiqueta, i) => {
                        const n = i + 1
                        const estado = paso === 4 || pasoVisible > n ? 'hecho' : pasoVisible === n ? 'actual' : 'pendiente'
                        return (
                            <div key={etiqueta} className={styles.segmento} data-estado={estado}>
                                <span className={styles.barra} />
                                <span className={styles.etiqueta}>{estado === 'hecho' ? `✓ ${etiqueta}` : etiqueta}</span>
                            </div>
                        )
                    })}
                </div>
            </header>

            <div className={styles.cuerpo} ref={cuerpo}>
                {paso === 1 && (
                    <div className={styles.paso} key='p1'>
                        <h2 className={styles.pregunta}>{t('pop_flow.q_for')}</h2>
                        {DESTINOS.map(d => (
                            <button
                                key={d.key}
                                type='button'
                                role='radio'
                                aria-checked={destino === d.key}
                                className={styles.opcion}
                                data-on={destino === d.key || undefined}
                                onClick={() => setDestino(d.key)}
                            >
                                <span className={styles.opcionEmoji} style={{ background: d.color }} aria-hidden>{d.emoji}</span>
                                <span className={styles.opcionTexto}>
                                    <strong>{t(`pop_flow.${d.titulo}`)}</strong>
                                    <span>{t(`pop_flow.${d.texto}`)}</span>
                                </span>
                                <span className={styles.radio}><span /></span>
                            </button>
                        ))}
                        {destino === 'ahora' && (
                            <div className={styles.cliente}>
                                <label className={styles.campo}>
                                    <span className={styles.label}>{t('pop_flow.client_name')}</span>
                                    <input className={styles.input} autoComplete='off' placeholder={t('pop_flow.client_name_ph')} value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} />
                                </label>
                                <label className={styles.campo}>
                                    <span className={styles.label}>{t('pop_flow.client_email')}</span>
                                    <input
                                        className={styles.input}
                                        type='email'
                                        inputMode='email'
                                        autoComplete='off'
                                        autoCapitalize='none'
                                        placeholder='cliente@correo.com'
                                        value={correoCliente}
                                        onChange={(e) => setCorreoCliente(e.target.value)}
                                    />
                                    <span className={styles.ayuda}>{t('pop_flow.client_email_hint')}</span>
                                </label>
                            </div>
                        )}
                    </div>
                )}

                {paso === 2 && (
                    <div className={styles.paso} key='p2' style={{ gap: 20 }}>
                        <h2 className={styles.pregunta}>{t('pop_flow.q_data')}</h2>
                        <label className={styles.campo}>
                            <span className={styles.label}>{t('pop_flow.name')}</span>
                            <input className={styles.input} maxLength={120} placeholder={t('pop_flow.name_ph')} value={nombre} onChange={(e) => setNombre(e.target.value)} />
                            <span className={styles.ayuda}>{t('pop_flow.name_hint')}</span>
                        </label>
                        <div className={styles.fechaHora}>
                            <div className={styles.campo}>
                                <span className={styles.label}>{t('pop_flow.date')}</span>
                                <DatePicker
                                    className={styles.picker}
                                    value={fecha}
                                    onChange={setFecha}
                                    format='D MMM YYYY'
                                    placeholder={t('pop_flow.date_ph')}
                                    disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
                                    inputReadOnly
                                />
                            </div>
                            <div className={styles.campo}>
                                <span className={styles.label}>{t('pop_flow.hour')}</span>
                                <TimePicker
                                    className={styles.picker}
                                    value={hora}
                                    onChange={setHora}
                                    format='HH:mm'
                                    minuteStep={5}
                                    placeholder='--:--'
                                    needConfirm={false}
                                    inputReadOnly
                                />
                            </div>
                        </div>
                        <div className={styles.previa}>
                            <span className={styles.previaLabel}>{t('pop_flow.preview')}</span>
                            <div className={styles.previaFila}>
                                <span className={styles.previaMini} aria-hidden>{EMOJI_PREVIA}</span>
                                <span className={styles.previaTexto}>
                                    <strong>{nombrePrevio}</strong>
                                    <span>{fechaTexto}</span>
                                </span>
                                <span className={styles.previaChip}>Pop</span>
                            </div>
                        </div>
                    </div>
                )}

                {paso === 3 && (
                    <div className={styles.paso} key='p3' style={{ gap: 16 }}>
                        <h2 className={styles.pregunta}>{t('pop_flow.q_pay')}</h2>
                        <div className={styles.ticket}>
                            <div className={styles.ticketArriba}>
                                <span className={styles.ticketMini} aria-hidden>{EMOJI_PREVIA}</span>
                                <span className={styles.ticketTexto}>
                                    <strong>{nombrePrevio}</strong>
                                    <span>{fechaTexto} · {paraTexto}</span>
                                </span>
                            </div>
                            <div className={styles.ticketCorte} />
                            <span className={styles.ticketNota}>{t('pop_flow.includes', { count: creditos })}</span>
                        </div>

                        {hayGratis && !soloParaMi && (
                            <div className={styles.pagos} role='radiogroup'>
                                <button type='button' role='radio' aria-checked={usarGratis} className={styles.pago} data-on={usarGratis || undefined} data-gratis onClick={() => setUsarGratis(true)}>
                                    <span className={styles.pagoEmoji} aria-hidden>🎁</span>
                                    <span className={styles.pagoTexto}>
                                        <strong>{t('pop_flow.use_free')}</strong>
                                        <span>{t('pop_flow.free_left', { count: gratis })}</span>
                                    </span>
                                    <span className={styles.pagoMonto}>{formatMXN(0)}</span>
                                </button>
                                <button type='button' role='radio' aria-checked={!usarGratis} className={styles.pago} data-on={!usarGratis || undefined} onClick={() => setUsarGratis(false)}>
                                    <span className={styles.pagoEmoji} aria-hidden>💳</span>
                                    <span className={styles.pagoTexto}>
                                        <strong>{t('pop_flow.pay_this')}</strong>
                                        <span>{t('pop_flow.keep_free')}</span>
                                    </span>
                                    <span className={styles.pagoMonto}>{totalPago != null ? formatMXN(totalPago) : '—'}</span>
                                </button>
                            </div>
                        )}

                        {soloParaMi && !hayGratis && gratis != null && <p className={styles.aviso}>{t('pop_flow.none_left')}</p>}
                        {!gratisElegido && !soloParaMi && precioError && <p className={styles.aviso}>{t('planner_pop.price_error', { msg: precioError })}</p>}
                        {!gratisElegido && !soloParaMi && !precio && !precioError && <p className={styles.ayuda}>{t('planner_pop.price_loading')}</p>}

                        <div className={styles.total}>
                            <span>{t('pop_flow.total')}</span>
                            <span className={styles.totalMonto}>{total != null ? formatMXN(total) : '—'}</span>
                        </div>
                        {!gratisElegido && descuento > 0 && precio && (
                            <span className={styles.descuento}>{t('pop_flow.discount', { pct: descuento, amount: formatMXN(precio.amount) })}</span>
                        )}
                    </div>
                )}

                {paso === 4 && (
                    <div className={styles.listo}>
                        <div className={styles.fiesta}>
                            {FIESTA.map((s, i) => (
                                <StickerFlotante key={s.kind + i} {...s} indice={i} style={s.pos} />
                            ))}
                        </div>
                        <span className={styles.listoTitulo}>{t('pop_flow.done_title')}</span>
                        <span className={styles.listoTexto}>
                            <b>{nombrePrevio}</b> {creado?.sin_cliente ? t('pop_flow.done_later') : t('pop_flow.done_text')}
                        </span>
                    </div>
                )}
            </div>

            <footer className={styles.pie}>
                {error && <p className={styles.error} role='alert'>{error}</p>}
                <button type='button' className={styles.cta} disabled={!valido || submitting} onClick={siguiente}>
                    {submitting ? t('pop_flow.working') : cta}
                    <span className={styles.ctaPunto} aria-hidden>→</span>
                </button>
                {paso === 3 && esAdmin && !gratisElegido && (
                    <button type='button' className={styles.sinCosto} onClick={() => enviar({ sinCosto: true })} disabled={submitting}>
                        {t('planner_event.admin_free')}
                    </button>
                )}
            </footer>
        </div>
    )
}
