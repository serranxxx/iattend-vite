import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import dayjs from 'dayjs'
import { ChevronRight, X } from 'lucide-react'
import { crearPopGratis, fetchCorreoPreviewPop } from '../../PlannerEvent/plannerEventApi'
import { lanzarAnimacionNuevoPop, mostrarToastNuevoPop } from '../../PlannerEvent/lanzarAnimacionNuevoPop'
import { enModoPruebaPop } from '../../PlannerEvent/modoPruebaPop'
import { InsigniaPlus } from '../../../modules/SideEvents/PlanPops/InsigniaPlus'
import { HojaPops } from './HojaPops'
import s from './MakeAPop.module.css'

/*
  Make a Pop (handoff "Nuevo Pop"). El botón abre un menú con dos caminos:
  · Para mí → se crea el Pop ("Mi Pop", con la fecha de hoy) → animación
    celular + pop + confeti → editor. Los datos se llenan en el editor.
  · Enviar (Pops+) → ventana tipo correo: Nombre, Correo, asunto fijo y la
    vista previa del correo — el correo real de acceso (diseño azul), que
    renderiza el backend (GET /api/planner/pop/correo-preview) —, con
      - Enviar ahora → se crea para el cliente (le llegan sus accesos) y la
        ventana se encoge y sale volando → aviso "¡Enviado!".
      - Editar y enviar después → se crea sin cliente y la ventana se vuelve
        el celular → pop + confeti → editor.
  Sin paso de pago (los Pops son ilimitados). Todo crea con
  POST /api/planner/pop; en modo prueba (modoPruebaPop.js) no se guarda nada
  y no se abre el editor.
  `anclaRef`: el botón Make a Pop (el menú sale debajo); sin él, arriba a la
  derecha. En el celular el menú es una hoja y la ventana ocupa la pantalla.
*/

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NOMBRE_POP = 'Mi Pop'
const FLY_MS = 900
const MORPH_MS = 480
const ANCHO_CORREO = 1100 // ancho al que se pinta la vista previa del correo (versión horizontal)

const fechaHoy = () => dayjs().format('YYYY-MM-DD')

export const MakeAPop = ({ abierto, pasoInicial = 'menu', onCerrar, anclaRef, movil = false, plus, onSoloPlus }) => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [paso, setPaso] = useState('menu') // menu · mail
    const [fase, setFase] = useState(null) // null · fly · morph
    const [nombre, setNombre] = useState('')
    const [correo, setCorreo] = useState('')
    const [creando, setCreando] = useState(false)
    const ventanaRef = useRef(null)
    const menuRef = useRef(null)
    const [pos, setPos] = useState(null)

    const primerNombre = nombre.trim().split(/\s+/)[0] || ''
    const correoValido = EMAIL_RE.test(correo.trim())

    // Vista previa = el correo real que se manda (backend, diseño azul de
    // acceso): se pide al abrir la ventana y al escribir el correo (400 ms).
    const [correoHtml, setCorreoHtml] = useState(null)
    const [altoCorreo, setAltoCorreo] = useState(900)
    const correoPreview = correoValido ? correo.trim() : 'cliente@correo.com'
    useEffect(() => {
        if (!abierto || paso !== 'mail') return undefined
        let vivo = true
        const timer = setTimeout(() => {
            fetchCorreoPreviewPop(correoPreview)
                .then(({ data }) => { if (vivo) setCorreoHtml(data?.html ?? null) })
                .catch(() => { if (vivo) setCorreoHtml(null) })
        }, correoHtml ? 400 : 0)
        return () => { vivo = false; clearTimeout(timer) }
    }, [abierto, paso, correoPreview])
    // El iframe mide todo el correo (sin scroll propio): se vuelve a medir
    // cuando cargan las fuentes y las imágenes (ResizeObserver).
    const observadorRef = useRef(null)
    const medirCorreo = (e) => {
        const doc = e.currentTarget.contentDocument
        if (!doc?.body) return
        doc.documentElement.style.overflow = 'hidden'
        doc.body.style.overflow = 'hidden'
        // El alto del contenido (body), no el del documento: ese nunca baja del
        // alto que ya tiene el iframe y dejaba un hueco blanco abajo.
        const medir = () => setAltoCorreo(Math.ceil(doc.body.getBoundingClientRect().height))
        medir()
        observadorRef.current?.disconnect()
        observadorRef.current = new ResizeObserver(medir)
        observadorRef.current.observe(doc.body)
        doc.fonts?.ready.then(medir)
    }
    useEffect(() => () => observadorRef.current?.disconnect(), [])
    // En escritorio el correo se pinta a 1100 px (su versión horizontal, la
    // del handoff: bajo 900 px se apila) y se escala al ancho de la ventana.
    const [anchoCaja, setAnchoCaja] = useState(0)
    const cajaObsRef = useRef(null)
    const medirCaja = (nodo) => {
        cajaObsRef.current?.disconnect()
        if (!nodo) return
        cajaObsRef.current = new ResizeObserver(([en]) => setAnchoCaja(en.contentRect.width))
        cajaObsRef.current.observe(nodo)
    }
    const escalaCorreo = movil || !anchoCaja ? 1 : Math.min(1, anchoCaja / ANCHO_CORREO)

    // Al abrir arranca en `pasoInicial` (Clientes › Enviar un Pop abre directo
    // la ventana de correo); al cerrar se reinicia todo.
    useEffect(() => {
        if (abierto) { setPaso(pasoInicial); return }
        setPaso('menu'); setFase(null); setNombre(''); setCorreo(''); setCreando(false)
    }, [abierto, pasoInicial])

    // Menú de escritorio: debajo del botón, alineado a su derecha.
    useLayoutEffect(() => {
        if (!abierto || movil || paso !== 'menu') return
        const r = anclaRef?.current?.getBoundingClientRect()
        setPos(r ? { top: r.bottom + 12, right: window.innerWidth - r.right } : { top: 96, right: 40 })
    }, [abierto, movil, paso, anclaRef])

    // Clic fuera / Esc cierran el menú (la ventana: su velo y ✕).
    useEffect(() => {
        if (!abierto || movil || paso !== 'menu') return undefined
        const fuera = (e) => {
            if (menuRef.current?.contains(e.target) || anclaRef?.current?.contains(e.target)) return
            onCerrar()
        }
        const esc = (e) => { if (e.key === 'Escape') onCerrar() }
        window.addEventListener('pointerdown', fuera)
        window.addEventListener('keydown', esc)
        return () => { window.removeEventListener('pointerdown', fuera); window.removeEventListener('keydown', esc) }
    }, [abierto, movil, paso, anclaRef, onCerrar])
    useEffect(() => {
        if (!abierto || paso !== 'mail' || fase) return undefined
        const esc = (e) => { if (e.key === 'Escape') onCerrar() }
        window.addEventListener('keydown', esc)
        return () => window.removeEventListener('keydown', esc)
    }, [abierto, paso, fase, onCerrar])

    const crear = (datos) => crearPopGratis({
        nombre: NOMBRE_POP,
        fecha: fechaHoy(),
        hora: null,
        ...datos,
        ...(enModoPruebaPop() ? { prueba: true } : {}),
    }).then(({ data }) => data)

    const errorDe = (err) => (err?.response?.data?.code === 'POPS_PLUS' ? t('pop_flow.plus_only') : (err?.response?.data?.msg || t('planner_event.err_generic')))

    // Abre el editor del Pop creado. En modo prueba no se creó ninguno: abre
    // un Pop en blanco que solo vive en el navegador (?pop=prueba, no se guarda).
    // `porEnviar`: en el Pop de prueba, que el editor enseñe "Enviar".
    const irAlEditor = (data, { porEnviar = false } = {}) => {
        const id = data?.side_event_id ?? (data?.prueba ? 'prueba' : null)
        if (id) navigate(`/dashboard/side?pop=${id}${data?.prueba && porEnviar ? '&porEnviar=1' : ''}`)
    }

    const toastListo = (textoKey, vars) => ({ icono: '🎉', fondoIcono: '#2457A4', titulo: t('nuevo_pop.ready_title'), texto: t(textoKey, vars) })
    const toastPrueba = (conCorreo) => ({ icono: '🧪', fondoIcono: '#FFF4CC', titulo: t('nuevo_pop.test_title'), texto: t(conCorreo ? 'pop_flow.test_done_mail' : 'nuevo_pop.test_opened') })

    // ── Para mí ──
    const paraMi = async () => {
        if (creando) return
        setCreando(true)
        const peticion = crear({ destino: 'mio' })
        peticion.catch((err) => message.error(errorDe(err)))
        onCerrar()
        lanzarAnimacionNuevoPop({
            esperar: peticion,
            alAbrir: irAlEditor,
            toast: (data) => (data?.prueba ? toastPrueba(false) : toastListo('nuevo_pop.ready_mine')),
        })
    }

    // ── Enviar ahora: la ventana sale volando ──
    const enviarAhora = () => {
        if (fase || !correoValido || !nombre.trim()) return
        setFase('fly')
        const peticion = crear({ destino: 'ahora', correo_cliente: correo.trim(), nombre_cliente: nombre.trim() })
        setTimeout(async () => {
            const destinatario = correo.trim() || nombre.trim() || t('nuevo_pop.your_client')
            onCerrar()
            try {
                const data = await peticion
                mostrarToastNuevoPop(data?.prueba
                    ? toastPrueba(true)
                    : { icono: '✓', fondoIcono: '#CDF22B', titulo: t('nuevo_pop.sent_title'), texto: t('nuevo_pop.sent_text', { to: destinatario }) })
            } catch (err) {
                message.error(errorDe(err))
            }
        }, FLY_MS)
    }

    // ── Editar y enviar después: la ventana se vuelve el celular ──
    const enviarDespues = () => {
        if (fase) return
        const ventana = ventanaRef.current
        const peticion = crear({ destino: 'despues' })
        setFase('morph')
        // Se vuelve un punto magenta de 60 px en el centro (el punto del pop).
        const r = ventana.getBoundingClientRect()
        // Sale del acomodo del velo para poder moverse a cualquier lugar.
        Object.assign(ventana.style, { position: 'fixed', margin: '0', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` })
        ventana.animate([
            { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: getComputedStyle(ventana).borderRadius, backgroundColor: '#FFFFFF' },
            { left: `${window.innerWidth / 2 - 30}px`, top: `${window.innerHeight / 2 - 30}px`, width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#FF2BD6' },
        ], { duration: 500, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' })
        setTimeout(() => {
            onCerrar()
            const quien2 = primerNombre || t('nuevo_pop.your_client')
            peticion.catch((err) => message.error(errorDe(err)))
            // Si la respuesta tarda más que la animación, el pop espera.
            lanzarAnimacionNuevoPop({
                esperar: peticion,
                alAbrir: (data) => irAlEditor(data, { porEnviar: true }),
                toast: (data) => (data?.prueba ? toastPrueba(false) : toastListo('nuevo_pop.ready_later', { name: quien2 })),
            })
        }, MORPH_MS)
    }

    if (!abierto) return null

    const opciones = (
        <>
            <button type='button' className={s.opcion} onClick={paraMi} disabled={creando}>
                <span className={s.opcionIcono} style={{ background: '#DCE8FF' }} aria-hidden>🙋</span>
                <span className={s.opcionTextos}>
                    <b>{t('nuevo_pop.for_me')}</b>
                    <small>{creando ? t('pop_flow.working') : t('nuevo_pop.for_me_sub')}</small>
                </span>
            </button>
            <button
                type='button'
                className={s.opcion}
                aria-disabled={!plus || undefined}
                onClick={() => (plus ? setPaso('mail') : onSoloPlus?.())}
            >
                <span className={s.opcionIcono} style={{ background: '#2457A4' }} aria-hidden>💌</span>
                <span className={s.opcionTextos}>
                    <b>{t('nuevo_pop.send')}<InsigniaPlus /></b>
                    <small>{t('nuevo_pop.send_sub')}</small>
                </span>
                <ChevronRight size={16} className={s.chevron} />
            </button>
        </>
    )

    if (paso === 'menu') {
        if (movil) {
            return (
                <HojaPops open onClose={onCerrar} etiqueta={t('pops_app.make_a_pop')}>
                    <div className={s.menuHoja}>{opciones}</div>
                </HojaPops>
            )
        }
        return createPortal(
            <div ref={menuRef} className={s.menu} role='menu' style={pos ? { top: pos.top, right: pos.right } : undefined}>
                {opciones}
            </div>,
            document.body,
        )
    }

    // ── Ventana de correo ──
    return createPortal(
        <div className={s.velo} data-movil={movil || undefined} data-fase={fase || undefined} onPointerDown={(e) => { if (e.target === e.currentTarget && !fase) onCerrar() }}>
            <div ref={ventanaRef} className={s.ventana} data-fase={fase || undefined} role='dialog' aria-modal='true' aria-label={t('nuevo_pop.new_message')}>
                <div className={s.ventanaContenido}>
                    <div className={s.barra}>
                        <b>{t('nuevo_pop.new_message')}</b>
                        <button type='button' className={s.cerrar} onClick={onCerrar} aria-label={t('pops_app.close')}><X size={18} /></button>
                    </div>
                    <label className={s.fila}>
                        <span>{t('nuevo_pop.name')}</span>
                        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={t('nuevo_pop.name_ph')} autoFocus autoComplete='off' />
                    </label>
                    <label className={s.fila}>
                        <span>{t('nuevo_pop.email')}</span>
                        <input type='email' inputMode='email' autoCapitalize='none' value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder='cliente@correo.com' autoComplete='off' />
                    </label>
                    <div className={s.fila}>
                        <span>{t('nuevo_pop.subject')}</span>
                        <b>{t('nuevo_pop.subject_value')}</b>
                    </div>

                    {/* Vista previa: el correo real que recibe el cliente. */}
                    <div className={s.cuerpo}>
                        {correoHtml ? (
                            <div ref={medirCaja} className={s.correoCaja} style={{ height: altoCorreo * escalaCorreo }}>
                                <iframe
                                    title={t('nuevo_pop.subject_value')}
                                    className={s.correoIframe}
                                    srcDoc={correoHtml}
                                    style={{
                                        height: altoCorreo,
                                        width: movil ? '100%' : ANCHO_CORREO,
                                        transform: escalaCorreo < 1 ? `scale(${escalaCorreo})` : undefined,
                                    }}
                                    onLoad={medirCorreo}
                                    scrolling='no'
                                    sandbox='allow-same-origin'
                                />
                            </div>
                        ) : (
                            <div className={s.correoCargando} aria-busy='true' />
                        )}
                    </div>

                    <div className={s.acciones}>
                        <button type='button' className={s.secundario} onClick={enviarDespues}>{t('nuevo_pop.edit_later')}</button>
                        <button type='button' className={s.primario} onClick={enviarAhora} aria-disabled={!correoValido || !nombre.trim() || undefined}>
                            {t('nuevo_pop.send_now')} ➤
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    )
}

export default MakeAPop
