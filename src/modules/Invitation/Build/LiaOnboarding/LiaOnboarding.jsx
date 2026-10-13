import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Ellipsis, Heart, ImageIcon, Mic, Search, Send, X } from 'lucide-react'
import AISiri from '../../../../components/AISiri/AISiri'
import ReactHost from '../../../../components/Host/ReactHost'
import ios_settings from '../../../../assets/images/iphone-settings.svg'
import { liaHeaders } from '../../../../pages/Lia/liaApi'
import { useTextures } from '../../../../context/TexturesContext'
import {
    AJUSTES, IDEAS, IDX, TONOS, TONO_API,
    aplicarColores, aplicarDatos, aplicarFuentes, aplicarOrden, aplicarTextos, aplicarTextura, planDe, textosDe,
} from './liaOnboardingDatos'
import styles from './LiaOnboarding.module.css'

// Onboarding "Crea tu invitación con IA" (diseño: design_handoff_lia_onboarding).
// Se abre encima de BuildPage en invitaciones nuevas, antes del tour. El
// organizador describe su boda y Lia arma un primer borrador (textos,
// colores, tipografías y orden; nunca imágenes). La vista previa es el
// teléfono real (ReactHost) con la invitación en memoria; "Hacerla mía"
// la pasa al editor como borrador sin guardar.

const ORB_PALETTE = ['#6D3CFA', '#aac187', '#E0E9D4', '#4526A3']
const ORB_BG = '#241357'
const API = import.meta.env.VITE_API_URL
const MIN_PROMPT = 8

const espera = (ms) => new Promise(r => setTimeout(r, ms))
// En el host, Personas es "family" (el botón de la barra del editor)
const tipoDeHost = (seccion) => (seccion === 'people' ? 'family' : seccion)

const Orbe = ({ size, rapido }) => (
    <AISiri
        size={size}
        speed={rapido ? 2 : 0.6}
        flowScale={rapido ? 1 : 0.5}
        palette={ORB_PALETTE}
        background={ORB_BG}
    />
)

// Las fotos del preview son de la invitación de ejemplo, no del organizador
const NotaFotos = ({ t }) => (
    <p className={styles.notaFotos}>
        <ImageIcon size={16} aria-hidden="true" />
        <span>{t('lia_onboarding.photos_note')}</span>
    </p>
)

// Mientras el host carga se ve un instante su pantalla de "Invitación
// privada"; se tapa hasta que avisa que está listo (+ un margen para que
// pinte la invitación).
const Telefono = ({ invitacion, seccion, generando }) => {
    const [listo, setListo] = useState(false)
    return (
    <div className={styles.telefonoCaja}>
        <div className={styles.telefono}>
            <div className='ios26-device'>
                <div className='ios26-buttons'><span /><span /><span /></div>
                <div className='ios26-power' />
                <div className='ios26-screen'>
                    <div className='scroll-invitation ios26-content'>
                        <ReactHost config={invitacion} onHide={false} scrollToSection={tipoDeHost(seccion)} onReady={() => setTimeout(() => setListo(true), 1200)} />
                    </div>
                    {!listo && (
                        <div className={styles.cargando} aria-hidden="true">
                            <AISiri size={44} speed={0.6} flowScale={0.5} palette={ORB_PALETTE} background={ORB_BG} />
                        </div>
                    )}
                    {generando && <div className={styles.brillo} aria-hidden="true" />}
                    <div className='ios26-island' />
                    <div className='ios26-status'>
                        <span>9:41</span>
                        <img alt='' src={ios_settings} />
                    </div>
                    <div className='ios26-nav'>
                        <div className='ios26-nav-round'><ChevronLeft size={20} strokeWidth={2.4} /></div>
                        <div className='ios26-nav-pill'>
                            <Search size={16} strokeWidth={2.4} />
                            <span>iattend.mx</span>
                            <Mic size={16} strokeWidth={2.4} />
                        </div>
                        <div className='ios26-nav-round'><Ellipsis size={20} strokeWidth={2.4} /></div>
                    </div>
                    <div className='ios26-home' />
                </div>
            </div>
        </div>
    </div>
    )
}

const Contenido = ({ invitation, invitationId, onAplicar, onCerrar }) => {
    const { t } = useTranslation()
    const { textures } = useTextures()
    const base = useRef(invitation).current
    const run = useRef(0)

    const [fase, setFase] = useState('describir') // describir | generando | resultado
    const [prompt, setPrompt] = useState('')
    const [nombres, setNombres] = useState(base?.cover?.title?.text?.value ?? '')
    const [fecha, setFecha] = useState(String(base?.cover?.date?.value ?? '').slice(0, 10))
    const [tono, setTono] = useState('romantico')
    const [vista, setVista] = useState(base)
    const [plan, setPlan] = useState(null)
    const [log, setLog] = useState([])
    const [progreso, setProgreso] = useState(0)
    const [ajuste, setAjuste] = useState('')
    const [seccion, setSeccion] = useState('cover')
    const [error, setError] = useState(null)

    // Una generación nueva (o volver atrás) deja sin efecto la anterior
    useEffect(() => () => { run.current++ }, [])

    const agregarLog = (texto) => setLog(prev => [
        ...prev.map(m => ({ ...m, activo: false, hecho: m.quien === 'lia' })),
        { quien: 'lia', texto, activo: true },
    ])

    const generar = async (instruccion) => {
        const id = ++run.current
        const vivo = () => id === run.current
        const desde = instruccion ? vista : base
        setFase('generando')
        setError(null)
        setAjuste('')
        setLog([{ quien: 'user', texto: instruccion || prompt }])
        setProgreso(4)
        setSeccion('cover')

        const peticion = (async () => axios.post(`${API}/api/ai/onboarding/borrador`, {
            invitation_id: invitationId,
            prompt,
            nombres,
            fecha,
            tono: TONO_API[tono],
            textos: textosDe(base),
            instruccion: instruccion || undefined,
            actual: instruccion ? planDe(vista, plan) : undefined,
        }, { headers: await liaHeaders() }))()

        await espera(500)
        if (!vivo()) return
        agregarLog(t(instruccion ? 'lia_onboarding.log_adjusting' : 'lia_onboarding.log_reading'))

        let nuevo
        try {
            const [{ data }] = await Promise.all([peticion, espera(1300)])
            nuevo = data?.plan
            if (!nuevo) throw new Error('sin plan')
        } catch (err) {
            if (!vivo()) return
            console.error('No se pudo armar el borrador de Lia:', err)
            setError(t('lia_onboarding.error'))
            setFase(plan ? 'resultado' : 'describir')
            return
        }
        if (!vivo()) return

        let v = aplicarDatos(desde, { nombres, fecha })
        v = aplicarTextura(aplicarColores(v, nuevo), nuevo)
        setVista(v)
        agregarLog(nuevo.texture?.id != null
            ? t('lia_onboarding.log_palette_texture', { nombre: (nuevo.palette_name || '').toLowerCase(), textura: nuevo.texture.name.toLowerCase() })
            : t('lia_onboarding.log_palette', { nombre: (nuevo.palette_name || '').toLowerCase() }))
        setProgreso(22)
        await espera(1000)
        if (!vivo()) return

        v = aplicarFuentes(v, nuevo)
        setVista(v)
        agregarLog(t('lia_onboarding.log_fonts', {
            portada: v.cover?.title?.text?.typeFace ?? '',
            cuerpo: v.generals?.fonts?.body?.typeFace ?? '',
        }))
        setProgreso(38)
        await espera(1100)
        if (!vivo()) return

        v = aplicarOrden(v, nuevo)
        setVista(v)
        agregarLog(t('lia_onboarding.log_order'))
        setProgreso(50)
        await espera(700)
        if (!vivo()) return

        v = aplicarTextos(v, nuevo)
        setVista(v)
        agregarLog(t('lia_onboarding.log_texts', { tono: t(`lia_onboarding.tones.${tono}`).toLowerCase() }))
        // Recorre las secciones en el orden nuevo, como si las fuera escribiendo
        const orden = (v.generals?.positions ?? []).map(i => IDX[i]).filter(s => v[s] && v[s].active !== false)
        for (let i = 0; i < orden.length; i++) {
            setSeccion(orden[i])
            await espera(i < 3 ? 650 : 380)
            if (!vivo()) return
            setProgreso(50 + Math.round(((i + 1) / orden.length) * 46))
        }

        await espera(500)
        if (!vivo()) return
        setPlan(nuevo)
        setProgreso(100)
        setLog(prev => prev.map(m => ({ ...m, activo: false, hecho: m.quien === 'lia' })))
        await espera(700)
        if (!vivo()) return
        setFase('resultado')
        setSeccion('cover')
    }

    const puedeGenerar = prompt.trim().length >= MIN_PROMPT
    const pedirAjuste = (texto) => { if (texto.trim()) generar(texto.trim()) }

    const paso = fase === 'describir' ? 1 : fase === 'generando' ? 2 : 3
    const colores = vista?.generals?.colors ?? {}
    const fuentes = {
        cover: vista?.cover?.title?.text?.typeFace,
        titles: vista?.generals?.fonts?.titles?.typeFace,
        body: vista?.generals?.fonts?.body?.typeFace,
    }
    const ordenSecciones = (vista?.generals?.positions ?? []).map(i => IDX[i]).filter(Boolean)
    const textura = textures.find(x => x.id === vista?.generals?.texture)

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="lia-onboarding-titulo">
            <div className={styles.modal}>
                <header className={styles.header}>
                    <AISiri size={28} speed={0.4} flowScale={0.36} palette={ORB_PALETTE} background={ORB_BG} />
                    <div className={styles.headerTexto}>
                        <strong>Lia</strong>
                        <span>{t('lia_onboarding.header_sub', { n: paso })}</span>
                    </div>
                    {/* La acción principal vive junto a la X, en cuanto hay borrador */}
                    {fase === 'resultado' && (
                        <button type="button" className={styles.cta} onClick={() => onAplicar(vista)}>
                            {t('lia_onboarding.cta')}
                        </button>
                    )}
                    <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label={t('lia_onboarding.close')}>
                        <X size={18} />
                    </button>
                </header>

                <div className={styles.cuerpo}>
                    <div className={styles.columna}>
                        <div className={styles.contenido}>
                            {fase === 'describir' && (
                                <>
                                    <Orbe size={64} />
                                    <h1 id="lia-onboarding-titulo" className={styles.h1}>{t('lia_onboarding.d_title')}</h1>
                                    <p className={styles.sub}>{t('lia_onboarding.d_sub')}</p>

                                    <div className={styles.caja}>
                                        <textarea
                                            className={styles.textarea}
                                            rows={3}
                                            value={prompt}
                                            placeholder={t('lia_onboarding.placeholder')}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault()
                                                    if (puedeGenerar) generar()
                                                }
                                            }}
                                        />
                                        <div className={styles.cajaFila}>
                                            <label className={styles.pill}>
                                                <Heart size={15} aria-hidden="true" />
                                                <input value={nombres} onChange={(e) => setNombres(e.target.value)} placeholder={t('lia_onboarding.names')} aria-label={t('lia_onboarding.names')} />
                                            </label>
                                            <label className={styles.pill}>
                                                <span className={styles.pillEtiqueta}>{t('lia_onboarding.date')}</span>
                                                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} aria-label={t('lia_onboarding.date')} />
                                            </label>
                                            <button
                                                type="button"
                                                className={`${styles.enviar} ${puedeGenerar ? styles.enviarActivo : ''}`}
                                                disabled={!puedeGenerar}
                                                onClick={() => generar()}
                                                aria-label={t('lia_onboarding.send')}
                                            >
                                                <Send size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    {error && <p className={styles.error}>{error}</p>}

                                    <div className={styles.grupo}>
                                        <span className={styles.etiqueta}>{t('lia_onboarding.ideas_label')}</span>
                                        <div className={styles.chips}>
                                            {IDEAS.map(idea => (
                                                <button
                                                    key={idea}
                                                    type="button"
                                                    className={styles.chip}
                                                    onClick={() => {
                                                        const texto = t(`lia_onboarding.ideas.${idea}.text`)
                                                        setPrompt(p => (p.trim() ? `${p.trim()} ${texto}` : texto))
                                                    }}
                                                >
                                                    {t(`lia_onboarding.ideas.${idea}.label`)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={styles.grupo}>
                                        <span className={styles.etiqueta}>{t('lia_onboarding.tone_label')}</span>
                                        <div className={styles.chips} role="radiogroup" aria-label={t('lia_onboarding.tone_label')}>
                                            {TONOS.map(clave => (
                                                <button
                                                    key={clave}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={tono === clave}
                                                    className={`${styles.chip} ${tono === clave ? styles.chipActivo : ''}`}
                                                    onClick={() => setTono(clave)}
                                                >
                                                    {t(`lia_onboarding.tones.${clave}`)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <NotaFotos t={t} />

                                    <ul className={styles.promesas}>
                                        <li><span className={styles.si}>✓</span>{t('lia_onboarding.promise_1')}</li>
                                        <li><span className={styles.si}>✓</span>{t('lia_onboarding.promise_2')}</li>
                                        <li className={styles.promesaNo}><span className={styles.no}>✕</span>{t('lia_onboarding.promise_3')}</li>
                                    </ul>
                                </>
                            )}

                            {fase === 'generando' && (
                                <>
                                    <Orbe size={88} rapido />
                                    <h1 id="lia-onboarding-titulo" className={`${styles.h1} ${styles.h1Medio}`}>{t('lia_onboarding.g_title')}</h1>
                                    <p className={styles.sub}>{t('lia_onboarding.g_sub')}</p>
                                    <div className={styles.barra} role="progressbar" aria-valuenow={progreso} aria-valuemin={0} aria-valuemax={100}>
                                        <div className={styles.barraRelleno} style={{ width: `${progreso}%` }} />
                                    </div>
                                    <div className={styles.conversacion} aria-live="polite">
                                        {log.map((m, i) => (m.quien === 'user' ? (
                                            <div key={i} className={styles.burbujaUsuario}>{m.texto}</div>
                                        ) : (
                                            <div key={i} className={styles.turnoLia}>
                                                <span className={styles.marca}>✦</span>
                                                <span className={m.activo ? styles.turnoActivo : styles.turnoHecho}>
                                                    {m.texto}
                                                    {m.activo && <span className={styles.puntos}><i /><i /><i /></span>}
                                                    {m.hecho && <span className={styles.check}> ✓</span>}
                                                </span>
                                            </div>
                                        )))}
                                    </div>
                                </>
                            )}

                            {fase === 'resultado' && (
                                <>
                                    <div className={styles.eyebrowFila}>
                                        <Orbe size={44} />
                                        <span className={styles.eyebrow}>{t('lia_onboarding.r_eyebrow')}</span>
                                    </div>
                                    <h1 id="lia-onboarding-titulo" className={`${styles.h1} ${styles.h1Chico}`}>{t('lia_onboarding.r_title')}</h1>
                                    {plan?.summary && <p className={styles.sub}>{plan.summary}</p>}
                                    {error && <p className={styles.error}>{error}</p>}

                                    <div className={styles.cambio}>
                                        <div className={styles.cambioCaja}>
                                            <span className={styles.kicker}>{t('lia_onboarding.before')}</span>
                                            <strong>{t('lia_onboarding.before_value')}</strong>
                                        </div>
                                        <span className={styles.flecha} aria-hidden="true">→</span>
                                        <div className={styles.cambioCaja}>
                                            <span className={styles.kicker}>{t('lia_onboarding.after')}</span>
                                            <strong className={styles.lila}>{t('lia_onboarding.after_value')}</strong>
                                        </div>
                                    </div>

                                    <div className={styles.rejilla}>
                                        <div className={styles.tarjeta}>
                                            <span className={styles.etiquetaTarjeta}>{t('lia_onboarding.palette_label', { nombre: plan?.palette_name ?? '' })}</span>
                                            <div className={styles.muestras}>
                                                {/* Mismo orden y nombres que la colección de Generales,
                                                    para que la paleta se reconozca */}
                                                {[['primary', 'label_bg'], ['secondary', 'label_contrast'], ['accent', 'label_texts'], ['actions', 'label_accents']].map(([k, etiqueta]) => (
                                                    <div key={k} className={styles.muestra}>
                                                        <span style={{ background: colores[k] }} />
                                                        <small>{t(`build_generals.${etiqueta}`)}</small>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className={styles.textura}>
                                                {textura?.image ? <img alt="" src={textura.image} /> : <span className={styles.texturaVacia} />}
                                                <small>{t('lia_onboarding.texture_label', { nombre: plan?.texture?.name && plan.texture.id != null ? plan.texture.name : t('lia_onboarding.texture_none') })}</small>
                                            </div>
                                        </div>
                                        <div className={styles.tarjeta}>
                                            <span className={styles.etiquetaTarjeta}>{t('lia_onboarding.fonts_label')}</span>
                                            <div className={styles.fuentes}>
                                                {[['cover', 28], ['titles', 21], ['body', 15]].map(([k, tam]) => (
                                                    <div key={k} className={styles.fuente}>
                                                        <span style={{ fontFamily: `'${fuentes[k]}'`, fontSize: tam }}>Aa</span>
                                                        <small>{fuentes[k]}</small>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className={`${styles.tarjeta} ${styles.tarjetaAncha}`}>
                                            <span className={styles.etiquetaTarjeta}>{t('lia_onboarding.order_label')}</span>
                                            <div className={styles.chips}>
                                                {ordenSecciones.map((s, i) => (
                                                    <button key={s} type="button" className={styles.chipOrden} onClick={() => setSeccion(s)}>
                                                        <span>{i + 1}</span>{t(`buttons_menu.${tipoDeHost(s)}`)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.ajusteCaja}>
                                        <input
                                            value={ajuste}
                                            onChange={(e) => setAjuste(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') pedirAjuste(ajuste) }}
                                            placeholder={t('lia_onboarding.refine_placeholder')}
                                            aria-label={t('lia_onboarding.refine_placeholder')}
                                        />
                                        <button
                                            type="button"
                                            className={`${styles.enviarChico} ${ajuste.trim() ? styles.enviarActivo : ''}`}
                                            disabled={!ajuste.trim()}
                                            onClick={() => pedirAjuste(ajuste)}
                                            aria-label={t('lia_onboarding.send')}
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                    <div className={styles.chips}>
                                        {AJUSTES.map(a => (
                                            <button key={a} type="button" className={styles.chip} onClick={() => pedirAjuste(t(`lia_onboarding.refine.${a}`))}>
                                                {t(`lia_onboarding.refine.${a}`)}
                                            </button>
                                        ))}
                                    </div>

                                    <NotaFotos t={t} />
                                </>
                            )}
                        </div>
                        <p className={styles.pie}>{t('lia_onboarding.disclaimer')}</p>
                    </div>

                    <div className={styles.preview}>
                        <div className={`${styles.glow} ${fase === 'generando' ? styles.glowRapido : ''}`} aria-hidden="true" />
                        <Telefono invitacion={vista} seccion={seccion} generando={fase === 'generando'} />
                        <span className={styles.caption}>
                            <b>✦</b> {t(`lia_onboarding.caption_${fase === 'describir' ? 'describe' : fase === 'generando' ? 'generating' : 'result'}`)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// `key` en el padre (cada apertura) reinicia el estado del onboarding
export const LiaOnboarding = ({ open, ...props }) => (open ? <Contenido {...props} /> : null)
