import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Input, Select, Switch, Tooltip, message } from 'antd'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ExternalLink, Eye, EyeOff, ImagePlus, Info, Play, Plus, RotateCcw, Smartphone, Trash2, X } from 'lucide-react'
import {
    createOnboardingSlide, deleteOnboardingSlide, fetchOnboardingSlides,
    reorderOnboardingSlides, updateOnboardingSlide,
} from '../onboardingAdminApi'
import { DEFAULT_STD_URL, DEFAULT_WALL_PHOTOS, SLIDE_KINDS, invalidarSlides, kindInfo } from '../../PreviewMood/onboardingSlides'
import { FULL_BLEED, OnboardingSlide, OnboardingWizard } from '../../PreviewMood/OnboardingWizard'
import { ONBOARDING_DEMO_ID, useDemoInvitation, useOnboardingDemoData } from '../../PreviewMood/useOnboardingDemoData'
import { uploadOnboardingPhoto } from '../../../helpers/services/uploadImage'
import { ONBOARDING_PREVIEW_MESSAGE } from '../../PreviewMood/OnboardingPreviewPage'
import { usePlans } from '../../../hooks/usePlans'
import '../../PreviewMood/preview-mood.css'
import styles from './OnboardingSection.module.css'

// Slides del onboarding wizard (tabla `onboarding_slides`). Se edita el texto,
// el orden, si se muestra y el badge de plan; la demo interactiva de cada slide
// la decide su `kind`. Los cambios se ven en el wizard de /checkout,
// /invitations y /preview.

const CAMPOS = [
    'kind', 'eyebrow', 'title', 'subtitle', 'description', 'description_mobile',
    'cta_label', 'exclusive_plan', 'image_url', 'is_active', 'config',
]

const vacioDe = (campo) => (campo === 'is_active' ? true : campo === 'config' ? {} : null)
const valorDe = (slide, campo) => slide[campo] ?? vacioDe(campo)
const borradorDe = (slide) => Object.fromEntries(CAMPOS.map(c => [c, valorDe(slide, c)]))

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const STD_BASE = 'https://www.iattend.events/save-the-date/'

// ------------------------------------------------ datos de cada demo ---

// Acepta el ID o cualquier link que lo contenga (dashboard, invitación…).
const InvitationConfig = ({ config, onChange }) => {
    const [texto, setTexto] = useState(config.invitation_id ?? '')
    const id = texto.match(UUID)?.[0] ?? null
    const { invitation, error } = useDemoInvitation(id && id !== ONBOARDING_DEMO_ID ? id : null)
    const titulo = invitation?.cover?.title?.text?.value

    const cambiar = (valor) => {
        setTexto(valor)
        const encontrado = valor.match(UUID)?.[0]
        onChange({ ...config, invitation_id: encontrado ?? (valor.trim() ? valor.trim() : undefined) })
    }

    let estado = null
    if (texto.trim() && !id) estado = { tono: 'error', texto: 'No parece un ID de invitación' }
    else if (id === ONBOARDING_DEMO_ID) estado = { tono: 'ok', texto: 'Invitación demo de siempre' }
    else if (id && error) estado = { tono: 'error', texto: 'No se encontró esa invitación' }
    else if (id && invitation) estado = { tono: 'ok', texto: `Encontrada: ${titulo || 'invitación sin título'}` }
    else if (id) estado = { tono: 'neutro', texto: 'Buscando…' }

    return (
        <Campo label="Invitación que se muestra" ayuda="El ID de la invitación (o un link que lo contenga). Se ve en el teléfono y se puede editar en la demo.">
            <Input
                value={texto}
                placeholder={ONBOARDING_DEMO_ID}
                onChange={e => cambiar(e.target.value)}
                className={styles.mono}
                allowClear
            />
            {estado && <small className={styles[`estado_${estado.tono}`]}>{estado.texto}</small>}
        </Campo>
    )
}

// URL completa o solo el ID del Save the Date.
const SaveTheDateConfig = ({ config, onChange }) => {
    const valor = config.url ?? ''
    const cambiar = (texto) => {
        const limpio = texto.trim()
        const url = !limpio ? undefined : /^https?:\/\//i.test(limpio) ? limpio : UUID.test(limpio) ? `${STD_BASE}${limpio.match(UUID)[0]}` : limpio
        onChange({ ...config, url })
    }
    const valida = !valor || /^https?:\/\/\S+$/i.test(valor)

    return (
        <Campo label="Save the Date que se muestra" ayuda="La URL del Save the Date en iattend.events, o solo su ID.">
            <Input
                value={valor}
                placeholder={DEFAULT_STD_URL}
                onChange={e => cambiar(e.target.value)}
                className={styles.mono}
                status={valida ? undefined : 'error'}
                allowClear
            />
            {valor && valida && (
                <a className={styles.abrir} href={valor} target="_blank" rel="noreferrer">
                    Abrir <ExternalLink size={11} />
                </a>
            )}
            {!valida && <small className={styles.estado_error}>Pega la URL completa (https://…) o el ID</small>}
        </Campo>
    )
}

const PhotoWallConfig = ({ config, onChange }) => {
    const [messageApi, contextHolder] = message.useMessage()
    const [subiendo, setSubiendo] = useState(0)
    const [arrastrando, setArrastrando] = useState(false)
    const inputRef = useRef(null)
    const fotos = config.photos ?? DEFAULT_WALL_PHOTOS
    const setFotos = (lista) => onChange({ ...config, photos: lista })

    const subir = async (archivos) => {
        const imagenes = [...archivos].filter(f => f.type.startsWith('image/'))
        if (!imagenes.length) return messageApi.warning('Solo se pueden subir imágenes')

        setSubiendo(n => n + imagenes.length)
        const nuevas = []
        for (const archivo of imagenes) {
            try {
                nuevas.push(await uploadOnboardingPhoto(archivo))
            } catch (error) {
                messageApi.error(`No se pudo subir ${archivo.name}: ${error?.message || 'error'}`)
            } finally {
                setSubiendo(n => n - 1)
            }
        }
        if (nuevas.length) setFotos([...fotos, ...nuevas])
    }

    const mover = (index, delta) => {
        const destino = index + delta
        if (destino < 0 || destino >= fotos.length) return
        const lista = [...fotos]
        ;[lista[index], lista[destino]] = [lista[destino], lista[index]]
        setFotos(lista)
    }

    return (
        <div className={styles.campo}>
            {contextHolder}
            <span>
                Fotos del muro
                <Tooltip title="Se muestran todas en 3 columnas con parallax (una sube, la siguiente baja), repartidas en este orden.">
                    <Info size={12} className={styles.info} />
                </Tooltip>
            </span>

            <div
                className={`${styles.subida} ${arrastrando ? styles.subidaActiva : ''}`}
                onDragOver={e => { e.preventDefault(); setArrastrando(true) }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={e => { e.preventDefault(); setArrastrando(false); subir(e.dataTransfer.files) }}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
            >
                <ImagePlus size={18} />
                <span>{subiendo ? `Subiendo ${subiendo}…` : 'Arrastra fotos aquí o da clic para elegirlas'}</span>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={e => { subir(e.target.files); e.target.value = '' }}
                />
            </div>

            <div className={styles.fotos}>
                {fotos.map((src, index) => (
                    <figure key={`${src}-${index}`} className={styles.foto}>
                        <img src={src} alt='' loading='lazy' />
                        <span className={styles.fotoNumero}>{index + 1}</span>
                        <div className={styles.fotoAcciones}>
                            <button type="button" aria-label="Antes" onClick={() => mover(index, -1)}><ArrowLeft size={12} /></button>
                            <button type="button" aria-label="Después" onClick={() => mover(index, 1)}><ArrowRight size={12} /></button>
                            <button type="button" aria-label="Quitar" onClick={() => setFotos(fotos.filter((_, i) => i !== index))}><Trash2 size={12} /></button>
                        </div>
                    </figure>
                ))}
            </div>
            {!fotos.length && <small className={styles.estado_neutro}>Sin fotos, el muro usa las de ejemplo.</small>}
        </div>
    )
}

const DemoConfig = ({ kind, config, onChange }) => {
    if (kind === 'invitation') return <InvitationConfig config={config} onChange={onChange} />
    if (kind === 'save_the_date') return <SaveTheDateConfig config={config} onChange={onChange} />
    if (kind === 'photo_wall') return <PhotoWallConfig config={config} onChange={onChange} />
    return null
}

// Tamaño del wizard real (modal de 1250 × 90vh); la vista previa lo escala.
const WIZARD_W = 1250
const WIZARD_H = 760

const VistaPrevia = ({ slide, demo }) => {
    const cajaRef = useRef(null)
    const [escala, setEscala] = useState(0.4)

    useLayoutEffect(() => {
        const caja = cajaRef.current
        if (!caja) return
        const medir = () => setEscala(caja.clientWidth / WIZARD_W)
        medir()
        const ro = new ResizeObserver(medir)
        ro.observe(caja)
        return () => ro.disconnect()
    }, [])

    return (
        <div ref={cajaRef} className={styles.previewCaja} style={{ height: WIZARD_H * escala }}>
            <div
                className={`ob-wizard ${styles.previewWizard}`}
                style={{ width: WIZARD_W, height: WIZARD_H, transform: `scale(${escala})` }}
            >
                <div className={`ob-wizard-slide${FULL_BLEED.has(slide.kind) ? ' ob-wizard-slide--full-bleed' : ''}`} style={{ width: '100%', height: '100%' }}>
                    <div className='ob-wizard-slide-body'>
                        {/* key: al cambiar de tipo la demo arranca de cero */}
                        <OnboardingSlide
                            key={slide.kind}
                            slide={slide}
                            invitation={demo.invitation}
                            buttons={demo.buttons}
                            invitationID={demo.invitationID}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

const Campo = ({ label, ayuda, children }) => (
    <div className={styles.campo}>
        <span>
            {label}
            {ayuda && (
                <Tooltip title={ayuda}>
                    <Info size={12} className={styles.info} />
                </Tooltip>
            )}
        </span>
        {children}
    </div>
)

const Editor = ({ slide, planOptions, demo, onGuardado, onEliminado }) => {
    const [messageApi, contextHolder] = message.useMessage()
    const [borrador, setBorrador] = useState(() => borradorDe(slide))
    const [guardando, setGuardando] = useState(false)
    const [confirmarBorrar, setConfirmarBorrar] = useState(false)

    useEffect(() => { setBorrador(borradorDe(slide)); setConfirmarBorrar(false) }, [slide])

    const cambios = useMemo(() => Object.fromEntries(
        CAMPOS
            .filter(c => JSON.stringify(borrador[c] ?? vacioDe(c)) !== JSON.stringify(valorDe(slide, c)))
            .map(c => [c, borrador[c]])
    ), [borrador, slide])
    const sucio = Object.keys(cambios).length > 0
    const set = (campo, valor) => setBorrador(prev => ({ ...prev, [campo]: valor }))
    const info = kindInfo(borrador.kind)

    const guardar = async () => {
        if (!borrador.title?.trim()) return messageApi.warning('El título es requerido')
        if (borrador.kind === 'image' && !borrador.image_url?.trim()) return messageApi.warning('Un slide de imagen necesita la URL de la imagen')

        setGuardando(true)
        try {
            const { data } = await updateOnboardingSlide(slide.id, cambios)
            invalidarSlides()
            onGuardado(data.slide)
            messageApi.success('Slide guardado')
        } catch (error) {
            messageApi.error(error?.response?.data?.msg || 'No se pudo guardar el slide')
        } finally {
            setGuardando(false)
        }
    }

    const borrar = async () => {
        try {
            await deleteOnboardingSlide(slide.id)
            invalidarSlides()
            onEliminado(slide.id)
        } catch (error) {
            messageApi.error(error?.response?.data?.msg || 'No se pudo borrar el slide')
        }
    }

    return (
        <div className={styles.editorShell}>
            {contextHolder}

            <div className={styles.editor}>
                <section className={styles.bloque}>
                    <div className={styles.bloqueHead}>
                        <span className={styles.bloqueTitulo}>Slide</span>
                        <label className={styles.switchInline}>
                            <span>{borrador.is_active ? 'Visible en el wizard' : 'Oculto'}</span>
                            <Switch checked={!!borrador.is_active} onChange={v => set('is_active', v)} />
                        </label>
                    </div>

                    <div className={styles.dosColumnas}>
                        <Campo label="Demo" ayuda="La animación interactiva que se muestra a la izquierda del slide.">
                            <Select
                                value={borrador.kind}
                                onChange={v => set('kind', v)}
                                options={SLIDE_KINDS.map(k => ({ value: k.key, label: k.label }))}
                            />
                        </Campo>
                        <Campo label="Badge de plan" ayuda='Muestra "Exclusivo en PRO" (o el plan que elijas) arriba del título.'>
                            <Select
                                value={borrador.exclusive_plan ?? ''}
                                onChange={v => set('exclusive_plan', v || null)}
                                options={[{ value: '', label: 'Sin badge' }, ...planOptions]}
                            />
                        </Campo>
                    </div>

                    <DemoConfig
                        key={`${slide.id}-${borrador.kind}`}
                        kind={borrador.kind}
                        config={borrador.config ?? {}}
                        onChange={config => set('config', config)}
                    />

                    {borrador.kind === 'image' && (
                        <Campo label="URL de la imagen">
                            <Input value={borrador.image_url ?? ''} placeholder="https://…" onChange={e => set('image_url', e.target.value)} />
                        </Campo>
                    )}
                </section>

                <section className={styles.bloque}>
                    <span className={styles.bloqueTitulo}>Textos</span>

                    <Campo label="Eyebrow" ayuda="La frase en letra manuscrita arriba del título.">
                        <Input value={borrador.eyebrow ?? ''} onChange={e => set('eyebrow', e.target.value)} />
                    </Campo>
                    <Campo label="Título">
                        <Input value={borrador.title ?? ''} onChange={e => set('title', e.target.value)} />
                    </Campo>
                    <Campo label="Subtítulo">
                        <Input value={borrador.subtitle ?? ''} onChange={e => set('subtitle', e.target.value)} />
                    </Campo>
                    <Campo label="Descripción">
                        <Input.TextArea value={borrador.description ?? ''} autoSize={{ minRows: 3, maxRows: 7 }} onChange={e => set('description', e.target.value)} />
                    </Campo>
                    <Campo label="Descripción en celular" ayuda="Versión corta para pantallas chicas. Vacía = se usa la descripción normal.">
                        <Input.TextArea value={borrador.description_mobile ?? ''} autoSize={{ minRows: 2, maxRows: 5 }} onChange={e => set('description_mobile', e.target.value)} />
                    </Campo>
                    {info.hasCta && (
                        <Campo label="Botón de la demo" ayuda="Vacío = sin botón.">
                            <Input value={borrador.cta_label ?? ''} onChange={e => set('cta_label', e.target.value)} />
                        </Campo>
                    )}
                </section>

                <footer className={styles.pie} data-dirty={sucio || undefined}>
                    {confirmarBorrar ? (
                        <span className={styles.confirmar}>
                            ¿Borrar este slide?
                            <button type="button" className={styles.peligro} onClick={borrar}>Sí, borrar</button>
                            <button type="button" className={styles.descartar} onClick={() => setConfirmarBorrar(false)}>No</button>
                        </span>
                    ) : (
                        <button type="button" className={styles.borrar} onClick={() => setConfirmarBorrar(true)}>
                            <Trash2 size={14} /> Borrar
                        </button>
                    )}
                    <span className={styles.pieEstado}>{sucio ? 'Cambios sin guardar' : 'Todo guardado'}</span>
                    <button type="button" className={styles.descartar} disabled={!sucio || guardando} onClick={() => setBorrador(borradorDe(slide))}>
                        Descartar
                    </button>
                    <button type="button" className={styles.guardar} disabled={!sucio || guardando} onClick={guardar}>
                        {guardando ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                </footer>
            </div>

            <aside className={styles.previewCol}>
                <span className={styles.previewTitulo}>Vista previa</span>
                <VistaPrevia slide={{ ...slide, ...borrador }} demo={demo} />
            </aside>
        </div>
    )
}

// Tamaño del celular de la vista previa (iPhone 14/15): el wizard adentro usa
// su CSS de móvil porque el iframe mide eso de ancho.
const CELULAR_W = 390
const CELULAR_H = 844

// El wizard en un celular, con la página /onboarding-preview en un iframe. Los
// slides se le mandan por postMessage para que muestre los que se ven aquí.
const VistaCelular = ({ slides, onClose }) => {
    const iframeRef = useRef(null)
    const [vuelta, setVuelta] = useState(0)
    const [escala, setEscala] = useState(1)

    useLayoutEffect(() => {
        const medir = () => setEscala(Math.min(1, (window.innerHeight - 140) / CELULAR_H, (window.innerWidth - 48) / CELULAR_W))
        medir()
        window.addEventListener('resize', medir)
        return () => window.removeEventListener('resize', medir)
    }, [])

    const enviar = () => iframeRef.current?.contentWindow?.postMessage(
        { type: ONBOARDING_PREVIEW_MESSAGE, slides },
        window.location.origin
    )

    // La página avisa cuando ya escucha; también se reenvía si cambian.
    useEffect(() => {
        const alListo = (e) => {
            if (e.origin === window.location.origin && e.data?.type === `${ONBOARDING_PREVIEW_MESSAGE}_READY`) enviar()
        }
        window.addEventListener('message', alListo)
        return () => window.removeEventListener('message', alListo)
    }, [slides])

    useEffect(() => { enviar() }, [slides])

    useEffect(() => {
        const alTeclear = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', alTeclear)
        return () => window.removeEventListener('keydown', alTeclear)
    }, [onClose])

    return (
        <div className={styles.celularFondo} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className={styles.celularBarra}>
                <span><Smartphone size={14} /> {CELULAR_W} × {CELULAR_H} · así lo ve alguien en su celular</span>
                <button type="button" onClick={() => setVuelta(v => v + 1)}><RotateCcw size={14} /> Reiniciar</button>
                <button type="button" onClick={onClose}><X size={14} /> Cerrar</button>
            </div>
            <div className={styles.celularMarco} style={{ width: CELULAR_W * escala + 24, height: CELULAR_H * escala + 24 }}>
                <iframe
                    key={vuelta}
                    ref={iframeRef}
                    src="/onboarding-preview"
                    title="Wizard en celular"
                    className={styles.celularIframe}
                    style={{ width: CELULAR_W, height: CELULAR_H, transform: `scale(${escala})` }}
                    onLoad={enviar}
                />
            </div>
        </div>
    )
}

export const OnboardingSection = () => {
    const [messageApi, contextHolder] = message.useMessage()
    const [slides, setSlides] = useState(null)
    const [error, setError] = useState(null)
    const [activoId, setActivoId] = useState(null)
    const [creando, setCreando] = useState(false)
    const [wizardAbierto, setWizardAbierto] = useState(false)
    const [celularAbierto, setCelularAbierto] = useState(false)
    const demo = useOnboardingDemoData()
    const { plans } = usePlans()

    const planOptions = plans
        .filter(p => p.id !== 'free')
        .map(p => ({ value: p.id, label: `Exclusivo en ${p.name.toUpperCase()}` }))

    useEffect(() => {
        fetchOnboardingSlides()
            .then(({ data }) => {
                setSlides(data.slides ?? [])
                setActivoId(data.slides?.[0]?.id ?? null)
            })
            .catch(err => setError(err?.response?.data?.msg || 'No se pudieron cargar los slides'))
    }, [])

    if (error) return <div className={styles.vacio}>{error}</div>
    if (!slides) return <div className={styles.vacio}>Cargando slides…</div>

    const activo = slides.find(s => s.id === activoId) ?? slides[0]

    const reemplazar = (actualizado) => setSlides(prev => prev.map(s => (s.id === actualizado.id ? actualizado : s)))

    const eliminar = (id) => {
        const resto = slides.filter(s => s.id !== id)
        setSlides(resto)
        setActivoId(resto[0]?.id ?? null)
    }

    // El orden se guarda al momento: es una sola acción, no un borrador.
    const mover = async (index, delta) => {
        const destino = index + delta
        if (destino < 0 || destino >= slides.length) return
        const lista = [...slides]
        ;[lista[index], lista[destino]] = [lista[destino], lista[index]]
        setSlides(lista)
        try {
            await reorderOnboardingSlides(lista.map(s => s.id))
            invalidarSlides()
        } catch (err) {
            messageApi.error(err?.response?.data?.msg || 'No se pudo guardar el orden')
        }
    }

    const alternarVisible = async (slide) => {
        try {
            const { data } = await updateOnboardingSlide(slide.id, { is_active: !slide.is_active })
            invalidarSlides()
            reemplazar(data.slide)
        } catch (err) {
            messageApi.error(err?.response?.data?.msg || 'No se pudo cambiar la visibilidad')
        }
    }

    const crear = async (kind) => {
        setCreando(false)
        try {
            const info = kindInfo(kind)
            const { data } = await createOnboardingSlide({
                kind,
                title: info.label,
                is_active: false,
                ...(kind === 'image' ? { image_url: 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing/wall-1.jpg' } : {}),
            })
            invalidarSlides()
            setSlides(prev => [...prev, data.slide])
            setActivoId(data.slide.id)
            messageApi.success('Slide creado oculto: edítalo y actívalo cuando esté listo')
        } catch (err) {
            messageApi.error(err?.response?.data?.msg || 'No se pudo crear el slide')
        }
    }

    const visibles = slides.filter(s => s.is_active)

    return (
        <div className={styles.onboarding}>
            {contextHolder}

            <div className={styles.barra}>
                <p>
                    {visibles.length} de {slides.length} slides visibles en el wizard de <b>/checkout</b>,
                    <b> /invitations</b> y <b>/preview</b>.
                </p>
                <div className={styles.barraAcciones}>
                    <button type="button" className={styles.botonSecundario} onClick={() => setCelularAbierto(true)} disabled={!visibles.length}>
                        <Smartphone size={14} /> Ver en celular
                    </button>
                    <button type="button" className={styles.botonSecundario} onClick={() => setWizardAbierto(true)} disabled={!visibles.length}>
                        <Play size={14} /> Ver el wizard completo
                    </button>
                </div>
            </div>

            <div className={styles.layout}>
                <nav className={styles.lista}>
                    {slides.map((slide, index) => (
                        <div
                            key={slide.id}
                            className={`${styles.item} ${slide.id === activo?.id ? styles.itemActivo : ''} ${slide.is_active ? '' : styles.itemOculto}`}
                        >
                            <button type="button" className={styles.itemCuerpo} onClick={() => setActivoId(slide.id)}>
                                <span className={styles.itemNumero}>{index + 1}</span>
                                <span className={styles.itemTexto}>
                                    <b>{slide.title}</b>
                                    <small>
                                        {kindInfo(slide.kind).label}
                                        {slide.exclusive_plan && ` · ${slide.exclusive_plan.toUpperCase()}`}
                                    </small>
                                </span>
                            </button>
                            <span className={styles.itemAcciones}>
                                <Tooltip title={slide.is_active ? 'Ocultar' : 'Mostrar'}>
                                    <button type="button" aria-label={slide.is_active ? 'Ocultar' : 'Mostrar'} onClick={() => alternarVisible(slide)}>
                                        {slide.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                                    </button>
                                </Tooltip>
                                <button type="button" aria-label="Subir" onClick={() => mover(index, -1)}><ArrowUp size={14} /></button>
                                <button type="button" aria-label="Bajar" onClick={() => mover(index, 1)}><ArrowDown size={14} /></button>
                            </span>
                        </div>
                    ))}

                    {creando ? (
                        <div className={styles.nuevo}>
                            <span>¿Qué demo lleva?</span>
                            {SLIDE_KINDS.map(k => (
                                <button key={k.key} type="button" onClick={() => crear(k.key)}>{k.label}</button>
                            ))}
                            <button type="button" className={styles.cancelarNuevo} onClick={() => setCreando(false)}>Cancelar</button>
                        </div>
                    ) : (
                        <button type="button" className={styles.agregar} onClick={() => setCreando(true)}>
                            <Plus size={14} /> Nuevo slide
                        </button>
                    )}
                </nav>

                {activo
                    ? <Editor key={activo.id} slide={activo} planOptions={planOptions} demo={demo} onGuardado={reemplazar} onEliminado={eliminar} />
                    : <div className={styles.vacio}>No hay slides. Crea uno para empezar.</div>}
            </div>

            {celularAbierto && <VistaCelular slides={visibles} onClose={() => setCelularAbierto(false)} />}

            <OnboardingWizard
                open={wizardAbierto}
                onClose={() => setWizardAbierto(false)}
                invitation={demo.invitation}
                buttons={demo.buttons}
                invitationID={demo.invitationID}
                slides={visibles}
            />
        </div>
    )
}
