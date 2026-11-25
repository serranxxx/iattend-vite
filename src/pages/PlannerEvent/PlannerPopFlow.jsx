import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { DatePicker, TimePicker, message } from 'antd'
import dayjs from 'dayjs'
import { ArrowLeft, Lock } from 'lucide-react'
import { StickerFlotante } from '../Board/PopsSection'
import { crearPopGratis } from './plannerEventApi'
import { lanzarAnimacionNuevoPop } from './lanzarAnimacionNuevoPop'
import { enModoPruebaPop } from './modoPruebaPop'
import { InsigniaPlus } from '../../modules/SideEvents/PlanPops/InsigniaPlus'
import { irAStripePlus, useCuentaPlus } from '../Board/PopsApp/suscripcionPlus'
import { PRECIO_PLUS } from '../Board/PopsApp/usePlanPops'
import styles from './PlannerPopFlow.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Emoji de la vista previa (el Pop lo elige después en Diseño, body.emoji).
const EMOJI_PREVIA = '🎉'

const DESTINOS = [
    { key: 'mio', emoji: '🙋', color: 'var(--pops-amarillo)', titulo: 'for_me', texto: 'for_me_text' },
    { key: 'ahora', emoji: '💼', color: 'var(--pops-rosa)', titulo: 'for_client', texto: 'for_client_text', plus: true },
    { key: 'despues', emoji: '⏳', color: 'var(--pops-cian)', titulo: 'for_later', texto: 'for_later_text', plus: true },
]
// "A mi cliente" y "Enviar después" son de Pops+ (modo planner, handoff
// "App de Pops"): con una cuenta Free se ven bloqueados con la insignia y,
// al tocarlos, un aviso con "Pasar a Pops+".

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
 * enviar después; los dos últimos son de Pops+) → ¿Qué vamos a celebrar?
 * (nombre, fecha, hora) → "Crear Pop" y la pantalla "¡Pop!" que abre el editor.
 * Los Pops son ilimitados: sin pago ni Pops gratis (POST /api/planner/pop). El
 * plan Free limita Pops activos y personas, no cuántos se crean.
 * `soloParaMi`: una cuenta de cliente: sin "Para quién".
 * Backend: helpers/popEvent.js.
 */
export const PlannerPopFlow = ({ soloParaMi = false, destinoInicial, onBackToStart, onClose, onCreated }) => {
    const { t, i18n } = useTranslation()
    const navigate = useNavigate()
    const cuerpo = useRef(null)
    const inicio = soloParaMi ? 2 : 1

    const [paso, setPaso] = useState(inicio)
    const [destino, setDestino] = useState(destinoInicial ?? 'mio')
    const enPrueba = enModoPruebaPop()
    const cuentaPlus = useCuentaPlus()
    // Mientras carga el plan no se bloquea nada (una cuenta Plus no ve el parpadeo).
    const soloPlus = cuentaPlus === false
    // Una cuenta Free no puede quedarse en un destino de Pops+ (p. ej. si llegó
    // con destinoInicial 'ahora').
    useEffect(() => { if (soloPlus && destino !== 'mio') setDestino('mio') }, [soloPlus])
    const [avisoPlus, setAvisoPlus] = useState(false)
    const [yendoPlus, setYendoPlus] = useState(false)
    const pasarPlus = async () => {
        setYendoPlus(true)
        try { await irAStripePlus('checkout') } catch { setYendoPlus(false); setError(t('pops_app.stripe_error')) }
    }
    const [nombreCliente, setNombreCliente] = useState('')
    const [correoCliente, setCorreoCliente] = useState('')
    const [nombre, setNombre] = useState('')
    const [fecha, setFecha] = useState(null)
    const [hora, setHora] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [creado, setCreado] = useState(null)

    useEffect(() => {
        cuerpo.current?.scrollTo({ top: 0 })
        setError('')
    }, [paso])

    const destinoCompleto = destino !== 'ahora' || (!!nombreCliente.trim() && EMAIL_RE.test(correoCliente.trim()))
    const datosCompletos = !!nombre.trim() && !!fecha
    const valido = paso === 1 ? destinoCompleto : paso === 2 ? datosCompletos : true

    const payload = () => ({
        destino,
        nombre: nombre.trim(),
        fecha: fecha.format('YYYY-MM-DD'),
        hora: hora ? hora.format('HH:mm') : null,
        ...(destino === 'ahora' ? { correo_cliente: correoCliente.trim(), nombre_cliente: nombreCliente.trim() } : {}),
    })

    // Los Pops son ilimitados: se crean directo, sin pago ni Pops gratis
    // (POST /api/planner/pop). "A mi cliente" / "Enviar después" son de Pops+.
    const enviar = async () => {
        if (submitting) return
        setError('')
        setSubmitting(true)
        try {
            const { data } = await crearPopGratis({ ...payload(), ...(enPrueba ? { prueba: true } : {}) })
            if (data?.prueba) {
                // Nada se guardó: la animación se queda en esta pantalla.
                onClose()
                lanzarAnimacionNuevoPop({
                    alAbrir: () => {},
                })
                setTimeout(() => message.info(t(data.correo_prueba ? 'pop_flow.test_done_mail' : 'pop_flow.test_done')), 1600)
                return
            }
            // Animación del handoff "Animaciones de Nuevo Pop" (fiesta de
            // stickers) y el editor se abre en un círculo desde el centro. Sin id (raro), la
            // pantalla "¡Pop!" de siempre.
            if (data?.side_event_id) {
                onCreated?.()
                onClose()
                lanzarAnimacionNuevoPop({
                    alAbrir: () => navigate(`/dashboard/side?pop=${data.side_event_id}`),
                })
                return
            }
            setCreado(data)
            setPaso(4)
        } catch (err) {
            setError(err.response?.data?.code === 'POPS_PLUS' ? t('pop_flow.plus_only') : (err.response?.data?.msg || t('planner_event.err_generic')))
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
        if (paso < 2) setPaso(paso + 1)
        else if (paso === 2) enviar()
        else abrirEditor()
    }

    // ── Textos que se arman ──
    const fechaTexto = fecha
        ? `${fecha.toDate().toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }).replace('.', '')}${hora ? ` · ${hora.format('HH:mm')}` : ''}`
        : t('pop_flow.no_date')
    const nombrePrevio = nombre.trim() || t('pop_flow.your_event')
    const etiquetas = [t('pop_flow.step_for'), t('pop_flow.step_data')].slice(inicio - 1)
    const totalPasos = etiquetas.length
    const pasoVisible = paso - inicio + 1

    const cta = paso < 2
        ? t('pop_flow.continue')
        : paso === 2
            ? t('pop_flow.create')
            : t('pop_flow.open_editor')

    return (
        <div className={styles.panel}>
            <header className={styles.cabeza}>
                {enPrueba && <span className={styles.modoPrueba}>{t('pop_flow.test_banner')}</span>}
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
                        {DESTINOS.map(d => {
                            const bloqueado = d.plus && soloPlus
                            return (
                                <button
                                    key={d.key}
                                    type='button'
                                    role='radio'
                                    aria-checked={destino === d.key}
                                    aria-disabled={bloqueado || undefined}
                                    className={styles.opcion}
                                    data-on={destino === d.key || undefined}
                                    data-bloqueado={bloqueado || undefined}
                                    onClick={() => (bloqueado ? setAvisoPlus(true) : setDestino(d.key))}
                                >
                                    <span className={styles.opcionEmoji} style={{ background: d.color }} aria-hidden>{d.emoji}</span>
                                    <span className={styles.opcionTexto}>
                                        <strong>{t(`pop_flow.${d.titulo}`)}{bloqueado && <InsigniaPlus />}</strong>
                                        <span>{t(`pop_flow.${d.texto}`)}</span>
                                    </span>
                                    {bloqueado
                                        ? <span className={styles.candado} aria-hidden><Lock size={16} /></span>
                                        : <span className={styles.radio}><span /></span>}
                                </button>
                            )
                        })}
                        {soloPlus && avisoPlus && (
                            <div className={styles.avisoPlus} role='status'>
                                <span>{t('pop_flow.plus_only')}</span>
                                <button type='button' onClick={pasarPlus} disabled={yendoPlus}>
                                    {t(yendoPlus ? 'pops_app.going_stripe' : 'pops_app.go_plus', { price: PRECIO_PLUS })}
                                </button>
                            </div>
                        )}
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
            </footer>
        </div>
    )
}
