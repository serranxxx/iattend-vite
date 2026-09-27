import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Button, QRCode } from 'antd'
import confetti from 'canvas-confetti'
import { Send, Check, CheckCheck, ArrowRight, Sparkles, X, Lock, Camera, Crown } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { BuildContent } from '../../modules/Invitation/Build/PageSections/BuildContent'
import ios_settings from '../../assets/images/iphone-settings.svg'
import { usePlans } from '../../hooks/usePlans'
import { DEFAULT_STD_URL, DEFAULT_WALL_PHOTOS, useOnboardingSlides } from './onboardingSlides'
import { useDemoInvitation } from './useOnboardingDemoData'


// Los textos, el orden y qué slides salen vienen de `onboarding_slides`
// (Admin → Onboarding; ver ./onboardingSlides.js). Aquí solo viven las demos
// interactivas de cada `kind`.

// Badge "Exclusivo en PRO" con el nombre del plan del catálogo.
const ExclusiveBadge = ({ planId }) => {
    const { getPlan } = usePlans()
    if (!planId) return null
    const nombre = getPlan(planId)?.name ?? planId
    return (
        <span className='ob-exclusive-badge'>
            <Crown size={13} strokeWidth={2.2} />
            Exclusivo en {nombre.toUpperCase()}
        </span>
    )
}

// Botón de acción de la demo: en escritorio botón, en celular link.
const SlideCta = ({ label, onClick }) => {
    if (!label) return null
    return (
        <>
            <Button icon={<ArrowRight size={16} />} className='ob-wizard-nav-btn ob-wizard-nav-btn--primary ob-slide-cta-desktop' onClick={onClick}>
                {label}
            </Button>
            <button type='button' className='ob-wizard-link-cta ob-slide-cta-mobile' onClick={onClick}>
                {label} <ArrowRight size={16} />
            </button>
        </>
    )
}

// Columna de texto de un slide: badge, eyebrow, título, subtítulo y
// descripción (con su versión corta para celular si existe).
const SlideCopy = ({ slide, titleClassName = 'ob-wizard-title-serif', children }) => (
    <div className='ob-wizard-visual-content'>
        <ExclusiveBadge planId={slide.exclusive_plan} />
        {slide.eyebrow && <span className='ob-wizard-eyebrow'>{slide.eyebrow}</span>}
        <h2 className={titleClassName}>{slide.title}</h2>
        {slide.subtitle && <p className='ob-wizard-subtitle-serif'>{slide.subtitle}</p>}
        {slide.description && (
            <p className={`ob-wizard-visual-description${slide.description_mobile ? ' ob-wizard-visual-description--desktop' : ''}`}>
                {slide.description}
            </p>
        )}
        {slide.description_mobile && (
            <p className='ob-wizard-visual-description ob-wizard-visual-description--mobile'>{slide.description_mobile}</p>
        )}
        {children}
    </div>
)

// Portada que tapa el iframe de la invitación mientras carga: la foto y el
// nombre de la invitación demo con un brillo que pasa. Se desvanece cuando el
// remoto avisa que está listo.
const HostPoster = ({ invitation, visible }) => {
    const imagen = invitation?.cover?.image?.prod
    const titulo = invitation?.cover?.title?.text?.value
    return (
        <div className={`ob-host-poster${visible ? '' : ' ob-host-poster--hidden'}`} aria-hidden='true'>
            {imagen && <img src={imagen} alt='' />}
            <div className='ob-host-poster-shade' />
            {titulo && <span className='ob-host-poster-title'>{titulo}</span>}
            <div className='ob-host-poster-shimmer' />
        </div>
    )
}

const Step1Demo = ({ slide, invitation, buttons, invitationID }) => {
    const [demoPositionY, setDemoPositionY] = useState('cover')
    const [demoDevice, setDemoDevice] = useState('ios')
    const [demoOnHide, setDemoOnHide] = useState(false)
    // El iframe tarda en arrancar (es la app completa de iattend.events): hasta
    // que avisa, se ve la portada. Tras el aviso se espera un poco más para que
    // alcance a pintar, y hay un tope por si el aviso nunca llega.
    const [hostReady, setHostReady] = useState(false)
    const onHostReady = () => setTimeout(() => setHostReady(true), 450)

    useEffect(() => {
        const tope = setTimeout(() => setHostReady(true), 10000)
        return () => clearTimeout(tope)
    }, [])

    return (
        <div className='ob-step1-demo'>
            <div className='ob-wizard-visual' style={{ flex: '0 0 44%' }}>
                <div className='ob-wizard-blob ob-wizard-blob--top' />
                <div className='ob-wizard-blob ob-wizard-blob--bottom' />

                <div className='ob-step1-phone'>
                    <div className='ob-step1-phone-inner'>
                        <BuildContent
                            invitationID={invitationID}
                            invitation={invitation}
                            coverUpdated={false}
                            positionY={demoPositionY}
                            setPositionY={setDemoPositionY}
                            currentDevice={demoDevice}
                            setDevice={setDemoDevice}
                            onHide={demoOnHide}
                            setOnHide={setDemoOnHide}
                            onHostReady={onHostReady}
                            hostOverlay={<HostPoster invitation={invitation} visible={!hostReady} />}
                        />
                    </div>
                </div>
            </div>

            <SlideCopy slide={slide} titleClassName='ob-step1-title'>
                <span className='ob-step1-pills-label'>Todo lo que puedes editar</span>
                <div className='ob-step1-pills'>
                    {buttons.map((item, index) => {
                        if (index === 0) return null
                        return (
                            <button
                                key={item.type}
                                type='button'
                                className={`ob-pill${demoPositionY === item.type ? ' ob-pill--active' : ''}`}
                                onClick={() => setDemoPositionY(item.type)}
                            >
                                {item.icon}
                                <span>{item.name}</span>
                            </button>
                        )
                    })}
                </div>
            </SlideCopy>
        </div>
    )
}

const FIRST_NAMES = ['Andrés', 'Pablo', 'Mariana', 'Isabella', 'Natalia', 'Gael', 'Elena', 'Sofía', 'Andrea', 'Valentina', 'Luna', 'Diego', 'Camila', 'Fernando', 'Regina', 'Santiago', 'Ximena', 'Emiliano', 'Renata', 'Alejandro', 'Fernanda', 'Rodrigo', 'Paulina', 'Daniel', 'Montserrat', 'Emilio', 'Daniela', 'Sebastián', 'Valeria', 'Joaquín']
const LAST_NAMES = ['Ramírez', 'López', 'Mendoza', 'Ruiz', 'Romero', 'González', 'Torres', 'Reyes', 'Navarro', 'Gómez', 'Flores', 'Pérez', 'Díaz', 'Hernández', 'Castro', 'Vargas', 'Morales', 'Jiménez', 'Ortiz', 'Silva']
const PASSWORD_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randomDigits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('')
const randomPassword = () => {
    const part = (n) => Array.from({ length: n }, () => PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)]).join('')
    return `${part(3)}-${part(3)}`
}

const generateMockGuests = (count) => Array.from({ length: count }, (_, i) => ({
    id: `demo-guest-${i}`,
    name: `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)} ${randomFrom(LAST_NAMES)}`,
    phone_number: `+52 (${randomDigits(3)}) ${randomDigits(3)}-${randomDigits(4)}`,
    password: randomPassword(),
    state: 'creado',
}))

// Lista de invitados con el envío masivo por WhatsApp corriendo: cada
// invitado pasa por Por invitar → Enviando → Enviada → Leída, y algunos
// llegan a confirmar. Al terminar, vuelve a empezar.
const GUEST_ESTADOS = {
    creado: { label: 'Por invitar' },
    enviando: { label: 'Enviando' },
    enviada: { label: 'Enviada' },
    leida: { label: 'Leída' },
    confirmado: { label: 'Confirmó' },
}
const GUESTS_TOTAL = 45
const GUESTS_TICK_MS = 1100

const GuestEstado = ({ estado }) => (
    <span className={`ob-guest-state ob-guest-state--${estado}`}>
        {estado === 'enviando' && <span className='ob-guest-spinner' />}
        {estado === 'enviada' && <Check size={12} strokeWidth={3} />}
        {(estado === 'leida' || estado === 'confirmado') && <CheckCheck size={12} strokeWidth={3} />}
        {GUEST_ESTADOS[estado].label}
    </span>
)

const Step2Demo = ({ slide, activo }) => {
    const [guests, setGuests] = useState(() => generateMockGuests(GUESTS_TOTAL))
    const listaRef = useRef(null)

    const enviados = guests.filter(g => g.state !== 'creado').length

    // Envía a uno: "Enviando" y al momento "Enviada".
    const enviar = (id) => {
        setGuests(prev => prev.map(g => (g.id === id && g.state === 'creado' ? { ...g, state: 'enviando' } : g)))
        setTimeout(() => {
            setGuests(prev => prev.map(g => (g.id === id && g.state === 'enviando' ? { ...g, state: 'enviada' } : g)))
        }, 700)
    }

    // Cada tick: el siguiente de la fila se envía, y algunos de los ya
    // enviados avanzan (los leen, algunos confirman).
    useEffect(() => {
        if (!activo) return
        const intervalo = setInterval(() => {
            setGuests(prev => {
                const siguiente = prev.find(g => g.state === 'creado')
                if (!siguiente) return prev
                setTimeout(() => {
                    setGuests(p => p.map(g => (g.id === siguiente.id && g.state === 'enviando' ? { ...g, state: 'enviada' } : g)))
                }, 700)
                return prev.map(g => {
                    if (g.id === siguiente.id) return { ...g, state: 'enviando' }
                    if (g.state === 'enviada' && Math.random() < 0.45) return { ...g, state: 'leida' }
                    if (g.state === 'leida' && Math.random() < 0.3) return { ...g, state: 'confirmado' }
                    return g
                })
            })
        }, GUESTS_TICK_MS)
        return () => clearInterval(intervalo)
    }, [activo])

    // Todos enviados: una pausa y la lista vuelve a empezar.
    const terminado = enviados === GUESTS_TOTAL && !guests.some(g => g.state === 'enviando')
    useEffect(() => {
        if (!terminado) return
        const t = setTimeout(() => setGuests(generateMockGuests(GUESTS_TOTAL)), 3000)
        return () => clearTimeout(t)
    }, [terminado])

    // La lista sigue al que se está enviando.
    const activoId = guests.find(g => g.state === 'enviando')?.id
    useEffect(() => {
        if (!activoId || !listaRef.current) return
        const fila = listaRef.current.querySelector(`[data-guest="${activoId}"]`)
        if (fila) listaRef.current.scrollTo({ top: fila.offsetTop - listaRef.current.clientHeight / 2 + fila.clientHeight / 2, behavior: 'smooth' })
    }, [activoId])

    return (
        <div className='ob-step2-demo'>
            <div className='ob-wizard-visual'>
                <div className='ob-wizard-blob ob-wizard-blob--top' />
                <div className='ob-wizard-blob ob-wizard-blob--bottom' />

                <div className='ob-guests-card'>
                    <div className='ob-guests-head'>
                        <div>
                            <span className='ob-guests-title'>Invitados</span>
                            <span className='ob-guests-count'>{GUESTS_TOTAL} en la lista</span>
                        </div>
                        <span className='ob-guests-whats'><FaWhatsapp size={14} /> Envío automático</span>
                    </div>

                    <div className='ob-guests-progress'>
                        <div className='ob-guests-progress-text'>
                            <span>{terminado ? 'Listo, todos invitados' : 'Enviando por WhatsApp'}</span>
                            <b>{enviados} de {GUESTS_TOTAL}</b>
                        </div>
                        <div className='ob-guests-progress-track'>
                            <span style={{ width: `${(enviados / GUESTS_TOTAL) * 100}%` }} />
                        </div>
                    </div>

                    <div className='ob-guests-list' ref={listaRef}>
                        {guests.map(g => (
                            <div key={g.id} data-guest={g.id} className={`ob-guest-row${g.state === 'enviando' ? ' ob-guest-row--active' : ''}`}>
                                <span className='ob-guest-avatar'>{g.name.split(' ').slice(0, 2).map(p => p[0]).join('')}</span>
                                <span className='ob-guest-info'>
                                    <b>{g.name}</b>
                                    <small>{g.phone_number}</small>
                                </span>
                                {g.state === 'creado'
                                    ? (
                                        <button type='button' className='ob-guest-send' onClick={() => enviar(g.id)}>
                                            <Send size={12} /> Enviar
                                        </button>
                                    )
                                    : <GuestEstado estado={g.state} />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <SlideCopy slide={slide} />
        </div>
    )
}

// Confirmaciones como parte de un todo: número principal + barra apilada de
// los lugares + leyenda con cantidad y %. Paleta validada con la guía de
// dataviz (lightness, croma, CVD y contraste sobre #fcfcfb): verde, lila y
// coral de marca con más croma; "Disponible" no es un color sino la pista
// gris de la barra (capacidad sin ocupar).
const RSVP_ESTADOS = [
    { key: 'confirmed', label: 'Confirmados', color: '#6F9A3E' },
    { key: 'waiting', label: 'Esperando', color: '#9A78C8' },
    { key: 'rejected', label: 'No asistirán', color: '#D2654E' },
    { key: 'available', label: 'Disponibles', color: null },
]

// Número que cuenta hasta su nuevo valor en vez de brincar.
const NumeroAnimado = ({ valor }) => {
    const [mostrado, setMostrado] = useState(valor)
    // El número que se ve en este momento: si llega otro valor a media
    // animación, se sigue desde aquí en vez de brincar.
    const actual = useRef(valor)

    useEffect(() => {
        const inicio = actual.current
        if (inicio === valor) return
        const t0 = performance.now()
        let raf
        const paso = (t) => {
            const avance = Math.min(1, (t - t0) / 450)
            const n = Math.round(inicio + (valor - inicio) * (1 - (1 - avance) ** 3))
            actual.current = n
            setMostrado(n)
            if (avance < 1) raf = requestAnimationFrame(paso)
        }
        raf = requestAnimationFrame(paso)
        return () => cancelAnimationFrame(raf)
    }, [valor])

    return mostrado
}

const RSVP_INICIAL = { confirmed: 76, waiting: 35, rejected: 3, available: 39 }
const RSVP_TICK_MS = 2400
// Cuando casi no queda nadie esperando, la demo vuelve a empezar.
const RSVP_REINICIO = 18

const Step3Demo = ({ slide, activo }) => {
    const [valores, setValores] = useState(RSVP_INICIAL)
    // Últimas respuestas, la más nueva primero (se muestran 3).
    const [actividad, setActividad] = useState(() => ([
        { id: 'a1', name: 'Regina Luna', tipo: 'confirmed', hace: 2 },
        { id: 'a2', name: 'Diego Ramírez', tipo: 'confirmed', hace: 5 },
        { id: 'a3', name: 'Paulina Ortiz', tipo: 'rejected', hace: 9 },
    ]))
    const [ultimo, setUltimo] = useState(null)
    const [hover, setHover] = useState(null)

    // Responde un invitado: casi siempre confirma, a veces no puede ir.
    const responder = (tipo = Math.random() < 0.85 ? 'confirmed' : 'rejected') => {
        const name = `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`
        const id = `${Date.now()}-${Math.random()}`
        setValores(v => (v.waiting <= 0 ? v : { ...v, waiting: v.waiting - 1, [tipo]: v[tipo] + 1 }))
        setActividad(prev => [{ id, name, tipo, hace: 0 }, ...prev.map(a => ({ ...a, hace: a.hace + 1 }))].slice(0, 3))
        setUltimo({ tipo, id })
    }

    const handleConfirm = () => responder('confirmed')

    const responderRef = useRef(responder)
    useEffect(() => { responderRef.current = responder })

    useEffect(() => {
        if (!activo) return
        if (valores.waiting <= RSVP_REINICIO) {
            const t = setTimeout(() => setValores(RSVP_INICIAL), 2000)
            return () => clearTimeout(t)
        }
        const intervalo = setInterval(() => responderRef.current(), RSVP_TICK_MS)
        return () => clearInterval(intervalo)
    }, [valores.waiting <= RSVP_REINICIO, activo])

    const { confirmed } = valores
    const total = Object.values(valores).reduce((a, b) => a + b, 0)
    const pct = (n) => Math.round((n / total) * 100)

    return (
        <div className='ob-step3-demo'>
            <div className='ob-wizard-visual'>
                <div className='ob-wizard-blob ob-wizard-blob--top' />
                <div className='ob-wizard-blob ob-wizard-blob--bottom' />

                <div className='ob-rsvp-card'>
                    <div className='ob-rsvp-head'>
                        <span className='ob-rsvp-title'>Confirmaciones</span>
                        <span className='ob-rsvp-live'><i /> En vivo</span>
                    </div>

                    <div className='ob-rsvp-hero'>
                        <span className='ob-rsvp-hero-value'><NumeroAnimado valor={confirmed} /></span>
                        <span className='ob-rsvp-hero-text'>
                            confirmados<br />de {total} lugares
                        </span>
                        <span key={ultimo?.id ?? 'pct'} className='ob-rsvp-hero-pct ob-rsvp-hero-pct--tick'>{pct(confirmed)}%</span>
                    </div>

                    {/* Barra apilada: la pista gris es la capacidad libre; cada
                        segmento se separa con 2px de superficie. */}
                    <div className='ob-rsvp-bar' onMouseLeave={() => setHover(null)}>
                        {RSVP_ESTADOS.filter(e => e.color).map(e => (
                            <div
                                key={e.key === ultimo?.tipo ? `${e.key}-${ultimo.id}` : e.key}
                                className={`ob-rsvp-seg${hover && hover !== e.key ? ' ob-rsvp-seg--dim' : ''}${e.key === ultimo?.tipo ? ' ob-rsvp-seg--glow' : ''}`}
                                style={{ width: `${(valores[e.key] / total) * 100}%`, background: e.color }}
                                onMouseEnter={() => setHover(e.key)}
                            />
                        ))}
                        {hover && (
                            <span className='ob-rsvp-tooltip'>
                                {RSVP_ESTADOS.find(e => e.key === hover).label}: <b>{valores[hover]}</b> · {pct(valores[hover])}%
                            </span>
                        )}
                    </div>

                    <ul className='ob-rsvp-legend'>
                        {RSVP_ESTADOS.map(e => (
                            <li
                                key={e.key}
                                className={hover && hover !== e.key ? 'ob-rsvp-legend--dim' : ''}
                                onMouseEnter={() => e.color && setHover(e.key)}
                                onMouseLeave={() => setHover(null)}
                            >
                                <span
                                    className={`ob-rsvp-dot${e.color ? '' : ' ob-rsvp-dot--track'}`}
                                    style={e.color ? { background: e.color } : undefined}
                                />
                                <span className='ob-rsvp-legend-label'>{e.label}</span>
                                <span className='ob-rsvp-legend-value'>{valores[e.key]}</span>
                                <span className='ob-rsvp-legend-pct'>{pct(valores[e.key])}%</span>
                            </li>
                        ))}
                    </ul>

                    {/* Lo último que llegó, en vivo. */}
                    <div className='ob-rsvp-feed'>
                        <span className='ob-rsvp-feed-title'>Ahora mismo</span>
                        <ul>
                            {actividad.map(a => (
                                <li key={a.id} className={a.hace === 0 ? 'ob-rsvp-feed--new' : ''}>
                                    <span className='ob-rsvp-feed-avatar'>{a.name.split(' ').map(p => p[0]).join('')}</span>
                                    <span className='ob-rsvp-feed-name'>{a.name}</span>
                                    <span className={`ob-rsvp-feed-status ob-rsvp-feed-status--${a.tipo}`}>
                                        {a.tipo === 'confirmed' ? 'Confirmó' : 'No asistirá'}
                                    </span>
                                    <span className='ob-rsvp-feed-time'>{a.hace === 0 ? 'ahora' : `hace ${a.hace} min`}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <SlideCopy slide={slide}>
                <SlideCta label={slide.cta_label} onClick={handleConfirm} />
            </SlideCopy>
        </div>
    )
}

const TICKET_ACCENT = '#EFEADF'
const TICKET_PRIMARY = '#0B171B'

const PASSES = [
    {
        id: 'demo-ticket-001',
        name: 'Regina Luna',
        table: '1',
        image: 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Covers/cover_4.jpg',
    },
    {
        id: 'demo-ticket-002',
        name: 'Andrés Luna',
        table: '1',
        image: 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Covers/cover_12.jpg',
    },
    {
        id: 'demo-ticket-003',
        name: 'Camila Luna',
        table: '1',
        image: 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/assets/Covers/cover_4.jpg',
    },
]

const Step4Demo = ({ slide }) => {
    const pass = PASSES[0]

    return (
        <div className='ob-step4-demo'>
            <div className='ob-wizard-visual'>
                <div className='ob-wizard-blob ob-wizard-blob--top' />
                <div className='ob-wizard-blob ob-wizard-blob--bottom' />

                <div className='ob-step4-pass-wrap'>
                    <div className='ob-step4-ticket' style={{ backgroundColor: `${TICKET_PRIMARY}E6` }}>
                        <div className='ob-step4-ticket-image'>
                            <img src={pass.image} alt='' />
                            <div className='ob-step4-ticket-shadow' />
                            <div className='ob-step4-ticket-logo'>
                                <img src='/images/logo_cover.png' alt='I attend' style={{
                                    width: '100%', height: '100%', objectFit: 'cover'
                                }} />
                            </div>

                        </div>

                        <div className='ob-step4-ticket-row' style={{ color: TICKET_ACCENT }}>
                            <QRCode
                                size={115}
                                style={{ border: 'none', flexShrink: 0 }}
                                errorLevel='H'
                                color={TICKET_ACCENT}
                                bgColor='transparent'
                                value={pass.id}
                            />

                            <div className='ob-step4-ticket-col'>
                                <span className='ob-step4-ticket-title'>Andrés &amp; Julieta</span>
                                <div className='ob-step4-ticket-date-row'>
                                    <span>MAY 20</span>
                                    <span>/</span>
                                    <span style={{ opacity: 0.7 }}>17:00</span>
                                </div>
                                <div className='ob-step4-ticket-field' style={{flexDirection:'row', alignItems:'center', gap:' 8px'}}>
                                    {/* <span className='label'>Boleto de</span> */}
                                    <span className='value'>{pass.name}</span>
                                </div>
                                <div className='ob-step4-ticket-field'>
                                    <span className='label'>Mesa</span>
                                    <span className='value'>{pass.table}</span>
                                </div>
                            </div>
                        </div>


                        <img className='ob-step4-wallet-add' style={{
                            position: 'absolute', zIndex: '99',
                            left: 16, top: 16, width: 100, boxShadow: '0px 0px 8px rgba(0,0,0,0.2)'
                        }} src="/images/wallet_add.png" />

                    </div>


                </div>
            </div>

            <SlideCopy slide={slide} />
        </div>
    )
}

const SEATING_CANVAS_WIDTH = 620
const SEATING_CANVAS_HEIGHT = 400
const SEATING_TABLE_SIZE = 56
// Posiciones calculadas para que el conjunto (mesas + sus sillas, que salen
// 15px del borde de la mesa) quede centrado en el plano, con el mismo margen
// en los cuatro lados y la pista justo al centro.
const SEAT_OVERHANG = 15
const SEATING_DANCE_FLOOR = { x: 200, y: 130, width: 220, height: 140 }

const SEATING_CANVAS_WIDTH_MOBILE = 280
const SEATING_CANVAS_HEIGHT_MOBILE = 560
const SEATING_DANCE_FLOOR_MOBILE = { x: 92, y: 140, width: 96, height: 280 }

const buildSeatingTables = (mobile) => {
    if (mobile) {
        const col = (x, startNumber) => Array.from({ length: 5 }, (_, i) => ({
            id: `seating-table-${startNumber + i}`,
            number: startNumber + i,
            x,
            // 5 mesas cada 108px: se arranca donde el margen de arriba y el de
            // abajo quedan iguales.
            y: (SEATING_CANVAS_HEIGHT_MOBILE - (4 * 108 + SEATING_TABLE_SIZE)) / 2 + i * 108,
        }))
        return [...col(20, 1), ...col(SEATING_CANVAS_WIDTH_MOBILE - SEATING_TABLE_SIZE - 20, 6)]
    }

    const row = (y, startNumber) => Array.from({ length: 5 }, (_, i) => ({
        id: `seating-table-${startNumber + i}`,
        number: startNumber + i,
        x: (SEATING_CANVAS_WIDTH - (4 * 122 + SEATING_TABLE_SIZE)) / 2 + i * 122,
        y,
    }))
    // Filas simétricas respecto a la pista: arriba y abajo con el mismo
    // margen (contando las sillas) y la pista en medio.
    const arriba = SEAT_OVERHANG + 19
    const abajo = SEATING_CANVAS_HEIGHT - SEATING_TABLE_SIZE - arriba
    return [...row(arriba, 1), ...row(abajo, 6)]
}

// Lugares por mesa y ocupación inicial (42 de 80, como decía la leyenda).
const SEATS_PER_TABLE = 8
const OCUPACION_INICIAL = [6, 4, 5, 3, 5, 4, 6, 3, 4, 2]
const conOcupacion = (tables) => tables.map((t, i) => ({ ...t, seated: OCUPACION_INICIAL[i] ?? 0 }))
const SEATING_TICK_MS = 1500
const SEATING_FLIGHT_MS = 650

// Sillas alrededor de la mesa: posiciones fijas en círculo.
const SEAT_POSITIONS = Array.from({ length: SEATS_PER_TABLE }, (_, i) => {
    const angulo = (i / SEATS_PER_TABLE) * Math.PI * 2 - Math.PI / 2
    return { x: Math.cos(angulo) * 38, y: Math.sin(angulo) * 38 }
})

// Saca una mesa de la pista: si la mesa (contando sus sillas) se enciman con
// la pista, se empuja hacia el borde más cercano, con un poco de aire.
const PISTA_AIRE = 6
const fueraDeLaPista = (mesa, pista, ancho, alto) => {
    const orilla = SEAT_OVERHANG + PISTA_AIRE
    const izq = mesa.x - orilla
    const der = mesa.x + SEATING_TABLE_SIZE + orilla
    const arr = mesa.y - orilla
    const abj = mesa.y + SEATING_TABLE_SIZE + orilla
    const encima = der > pista.x && izq < pista.x + pista.width && abj > pista.y && arr < pista.y + pista.height
    if (!encima) return mesa

    const opciones = [
        { x: pista.x - SEATING_TABLE_SIZE - orilla, y: mesa.y },
        { x: pista.x + pista.width + orilla, y: mesa.y },
        { x: mesa.x, y: pista.y - SEATING_TABLE_SIZE - orilla },
        { x: mesa.x, y: pista.y + pista.height + orilla },
    ]
        .map(o => ({
            x: clampValue(o.x, 0, ancho - SEATING_TABLE_SIZE),
            y: clampValue(o.y, 0, alto - SEATING_TABLE_SIZE),
        }))
        .sort((a, b) => Math.hypot(a.x - mesa.x, a.y - mesa.y) - Math.hypot(b.x - mesa.x, b.y - mesa.y))

    return { ...mesa, ...opciones[0] }
}

const iniciales = (nombre) => nombre.split(' ').slice(0, 2).map(p => p[0]).join('')

const clampValue = (value, min, max) => Math.min(Math.max(value, min), max)
const getEventPoint = (event) => (event.touches && event.touches.length ? event.touches[0] : event)
const isMobileViewport = () => typeof window !== 'undefined' && window.innerWidth <= 750

const Step5Demo = ({ slide, activo }) => {
    const mobile = isMobileViewport()
    const canvasWidth = mobile ? SEATING_CANVAS_WIDTH_MOBILE : SEATING_CANVAS_WIDTH
    const canvasHeight = mobile ? SEATING_CANVAS_HEIGHT_MOBILE : SEATING_CANVAS_HEIGHT
    const danceFloor = mobile ? SEATING_DANCE_FLOOR_MOBILE : SEATING_DANCE_FLOOR

    const [tables, setTables] = useState(() => conOcupacion(buildSeatingTables(mobile)))
    // Ninguna mesa arranca encima de la pista (también corrige posiciones que
    // hayan quedado de otra versión del plano).
    useEffect(() => {
        setTables((prev) => prev.map((t) => fueraDeLaPista(t, danceFloor, canvasWidth, canvasHeight)))
    }, [])

    // Invitado "volando" de la fila al lugar: { key, name, x, y, tableId }.
    const [vuelo, setVuelo] = useState(null)
    const [pulso, setPulso] = useState(null)
    const [fila, setFila] = useState(() => Array.from({ length: 4 }, () => randomFrom(FIRST_NAMES)))
    // Zoom fijo: el control de zoom se quitó de la demo.
    const [zoomLevel] = useState(() => (mobile ? 0.68 : 1))
    const [draggingId, setDraggingId] = useState(null)
    const canvasRef = useRef(null)
    const dragRef = useRef({ id: null, offsetX: 0, offsetY: 0 })

    const handleTableDragStart = (event, table) => {
        event.stopPropagation()
        const point = getEventPoint(event)
        const rect = canvasRef.current.getBoundingClientRect()
        const pointerX = (point.clientX - rect.left) / zoomLevel
        const pointerY = (point.clientY - rect.top) / zoomLevel
        dragRef.current = { id: table.id, offsetX: pointerX - table.x, offsetY: pointerY - table.y }
        setDraggingId(table.id)
    }

    useEffect(() => {
        if (!draggingId) return

        const handleMove = (event) => {
            const point = getEventPoint(event)
            const rect = canvasRef.current.getBoundingClientRect()
            const pointerX = (point.clientX - rect.left) / zoomLevel
            const pointerY = (point.clientY - rect.top) / zoomLevel
            const nextX = clampValue(pointerX - dragRef.current.offsetX, 0, canvasWidth - SEATING_TABLE_SIZE)
            const nextY = clampValue(pointerY - dragRef.current.offsetY, 0, canvasHeight - SEATING_TABLE_SIZE)
            setTables((prev) => prev.map((t) => (t.id === dragRef.current.id ? { ...t, x: nextX, y: nextY } : t)))
        }

        // Al soltar, si quedó encima de la pista, se acomoda a su orilla.
        const handleDragEnd = () => {
            setTables((prev) => prev.map((t) => (t.id === dragRef.current.id ? fueraDeLaPista(t, danceFloor, canvasWidth, canvasHeight) : t)))
            setDraggingId(null)
        }

        document.addEventListener('mousemove', handleMove)
        document.addEventListener('touchmove', handleMove)
        document.addEventListener('mouseup', handleDragEnd)
        document.addEventListener('touchend', handleDragEnd)
        return () => {
            document.removeEventListener('mousemove', handleMove)
            document.removeEventListener('touchmove', handleMove)
            document.removeEventListener('mouseup', handleDragEnd)
            document.removeEventListener('touchend', handleDragEnd)
        }
    }, [draggingId, zoomLevel, canvasWidth, canvasHeight])

    // Origen de los vuelos: el borde de abajo, al centro, justo encima de la
    // fila "Por acomodar" que vive debajo del plano.
    const origen = { x: canvasWidth / 2 - 14, y: canvasHeight - 14 }

    // Acomoda al siguiente de la fila en una mesa con lugar: sale de la fila,
    // vuela a la mesa y al llegar ocupa su silla (la mesa late).
    const acomodar = () => {
        if (vuelo || draggingId) return
        const libres = tables.filter(t => t.seated < SEATS_PER_TABLE)
        if (!libres.length) return
        const mesa = randomFrom(libres)
        const name = fila[0]
        const key = Date.now()
        setFila(prev => [...prev.slice(1), randomFrom(FIRST_NAMES)])
        setVuelo({ key, name, x: origen.x, y: origen.y, tableId: mesa.id, volando: false })
        // Dos frames: primero se pinta en el origen, luego viaja (transición CSS).
        requestAnimationFrame(() => requestAnimationFrame(() => {
            setVuelo(v => (v?.key === key ? { ...v, x: mesa.x + 14, y: mesa.y + 14, volando: true } : v))
        }))
        setTimeout(() => {
            setTables(prev => prev.map(t => (t.id === mesa.id ? { ...t, seated: Math.min(SEATS_PER_TABLE, t.seated + 1) } : t)))
            setPulso({ id: mesa.id, key })
            setVuelo(v => (v?.key === key ? null : v))
        }, SEATING_FLIGHT_MS + 40)
    }

    // Se acomoda solo; con el salón lleno, se vacía y vuelve a empezar.
    // El intervalo llama siempre a la versión más reciente de `acomodar`.
    const acomodarRef = useRef(acomodar)
    useEffect(() => { acomodarRef.current = acomodar })
    const lleno = tables.every(t => t.seated >= SEATS_PER_TABLE)

    useEffect(() => {
        if (!activo) return
        if (lleno) {
            const t = setTimeout(() => setTables(prev => prev.map((m, i) => ({ ...m, seated: OCUPACION_INICIAL[i] ?? 0 }))), 1800)
            return () => clearTimeout(t)
        }
        const intervalo = setInterval(() => acomodarRef.current(), SEATING_TICK_MS)
        return () => clearInterval(intervalo)
    }, [lleno, activo])

    return (
        <div className='ob-step5-demo'>
            <div className='ob-wizard-visual'>
                <div className='ob-wizard-blob ob-wizard-blob--top' />
                <div className='ob-wizard-blob ob-wizard-blob--bottom' />

                <div className='ob-step5-board-wrap'>
                    <div className='ob-step5-board'>
                        <div
                            className='ob-step5-canvas'
                            ref={canvasRef}
                            style={{
                                width: canvasWidth,
                                height: canvasHeight,
                                transform: `scale(${zoomLevel})`,
                            }}
                        >
                            <div
                                className='ob-step5-dance'
                                style={{
                                    left: danceFloor.x,
                                    top: danceFloor.y,
                                    width: danceFloor.width,
                                    height: danceFloor.height,
                                }}
                            >
                                <span className='ob-step5-dance-label ob-step5-dance-label-desktop'>Pista de baile</span>
                                <span className='ob-step5-dance-label ob-step5-dance-label-mobile'>Pista</span>
                            </div>

                            {tables.map((table) => (
                                <div
                                    key={table.id}
                                    className={`ob-step5-table${draggingId === table.id ? ' ob-step5-table--dragging' : ''}${table.seated >= SEATS_PER_TABLE ? ' ob-step5-table--full' : ''}`}
                                    style={{ left: table.x, top: table.y }}
                                    onMouseDown={(event) => handleTableDragStart(event, table)}
                                    onTouchStart={(event) => handleTableDragStart(event, table)}
                                >
                                    {SEAT_POSITIONS.map((pos, i) => (
                                        <span
                                            key={i}
                                            className={`ob-seat${i < table.seated ? ' ob-seat--taken' : ''}${pulso?.id === table.id && i === table.seated - 1 ? ' ob-seat--new' : ''}`}
                                            style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
                                        />
                                    ))}
                                    <span
                                        key={pulso?.id === table.id ? pulso.key : 'quieta'}
                                        className={`ob-step5-table-num${pulso?.id === table.id ? ' ob-step5-table-num--pulse' : ''}`}
                                    >
                                        #{table.number}
                                        <small>{table.seated}/{SEATS_PER_TABLE}</small>
                                    </span>
                                </div>
                            ))}

                            {vuelo && (
                                <span
                                    className={`ob-seat-flyer${vuelo.volando ? ' ob-seat-flyer--flying' : ''}`}
                                    style={{ left: vuelo.x, top: vuelo.y, transitionDuration: `${SEATING_FLIGHT_MS}ms` }}
                                >
                                    {iniciales(vuelo.name)}
                                </span>
                            )}

                        </div>

                    </div>

                    {/* Fila de invitados por acomodar, abajo al centro del plano: de
                        aquí salen los vuelos hacia las mesas. */}
                    <div className='ob-seat-queue'>
                        <span className='ob-seat-queue-label'>Por acomodar</span>
                        <div className='ob-seat-queue-avatars'>
                            {fila.map((nombre, i) => (
                                <span key={`${nombre}-${i}`} className='ob-seat-avatar' title={nombre}>{iniciales(nombre)}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sin botón: la demo se acomoda sola. */}
            <SlideCopy slide={slide} />
        </div>
    )
}

const SIDE_EVENT_IMAGES = [
    'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/land_page/side_1.jpg',
    'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/land_page/side_2.jpg',
    'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/land_page/side_3.jpg',
]

const PhoneMock = ({ image, className }) => (
    <div className={`ob-step6-phone${className ? ` ${className}` : ''}`}>
        <div className='inv-device-main-container-ios'>
            <div className='device-buttons-container-ios'>
                <div className='device-button-ios' />
                <div className='device-button-ios' />
                <div className='device-button-ios' />
            </div>
            <div className='device-power-button-ios' />
            <div className='inv-device-container-ios scroll-invitation'>
                <div className='inv-black-space-ios'>
                    <span>5:15</span>
                    <div className='camera-ios' />
                    <div>
                        <img alt='' src={ios_settings} style={{ height: '100%', objectFit: 'cover' }} />
                    </div>
                </div>

                <div className='scroll-invitation ios-invitation'>
                    <img alt='' src={image} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <div className='inv-light-space-ios' />
            </div>
        </div>
    </div>
)

const Step6Demo = ({ slide }) => (
    <div className='ob-step6-demo'>
        <div className='ob-wizard-visual'>
            <div className='ob-wizard-blob ob-wizard-blob--top' />
            <div className='ob-wizard-blob ob-wizard-blob--bottom' />

            <div className='ob-step6-phones'>
                <PhoneMock image={SIDE_EVENT_IMAGES[0]} className='ob-step6-phone--left' />
                <PhoneMock image={SIDE_EVENT_IMAGES[1]} className='ob-step6-phone--center' />
                <PhoneMock image={SIDE_EVENT_IMAGES[2]} className='ob-step6-phone--right' />
            </div>
        </div>

        <SlideCopy slide={slide} />
    </div>
)

// Conversación de ejemplo que se reproduce sola: Lia saluda, se "escribe"
// una pregunta en el input, Lia "escribe" y responde con una tarjeta de
// datos. Al terminar las tres, se limpia y vuelve a empezar.
const LIA_SALUDO = 'Hola, soy Lia ✨ Conozco cada detalle de tu evento. Pregúntame lo que quieras.'
const LIA_GUION = [
    {
        pregunta: '¿Quién no ha confirmado?',
        respuesta: 'Faltan 35 invitados. Estos son de prioridad A:',
        tarjeta: { tipo: 'lista', items: ['Regina Luna', 'Diego Ramírez', 'Camila Torres'] },
    },
    {
        pregunta: '¿Cuántos lugares quedan en mesas?',
        respuesta: 'Te quedan 38 lugares. La Mesa 7 es la que tiene más espacio.',
        tarjeta: { tipo: 'barra', ocupados: 42, total: 80 },
    },
    {
        pregunta: 'Mándales un recordatorio',
        respuesta: 'Listo. Les mandé el recordatorio por WhatsApp.',
        tarjeta: { tipo: 'enviado', total: 35 },
    },
]

const LiaTarjeta = ({ tarjeta }) => {
    if (tarjeta.tipo === 'lista') {
        return (
            <ul className='ob-lia-list'>
                {tarjeta.items.map(nombre => (
                    <li key={nombre}>
                        <span className='ob-lia-avatar'>{nombre.split(' ').map(p => p[0]).join('')}</span>
                        <span>{nombre}</span>
                        <em>sin respuesta</em>
                    </li>
                ))}
            </ul>
        )
    }
    if (tarjeta.tipo === 'barra') {
        return (
            <div className='ob-lia-meter'>
                <div className='ob-lia-meter-track'>
                    <span style={{ width: `${(tarjeta.ocupados / tarjeta.total) * 100}%` }} />
                </div>
                <span className='ob-lia-meter-text'>{tarjeta.ocupados} de {tarjeta.total} ocupados</span>
            </div>
        )
    }
    return (
        <span className='ob-lia-sent'>
            <Check size={13} strokeWidth={3} /> {tarjeta.total} recordatorios enviados
        </span>
    )
}

const LiaChatDemo = ({ activo }) => {
    const [mensajes, setMensajes] = useState([])
    const [pensando, setPensando] = useState(false)
    const [tecleo, setTecleo] = useState('')
    const listaRef = useRef(null)

    // Cada vez que el slide se vuelve visible, la conversación empieza de cero.
    useEffect(() => {
        if (!activo) return
        let vivo = true
        const timers = []
        const esperar = (ms) => new Promise(r => { timers.push(setTimeout(r, ms)) })
        const agregar = (m) => vivo && setMensajes(prev => [...prev, { ...m, id: `${Date.now()}-${Math.random()}` }])

        const escribirPregunta = async (texto) => {
            for (let i = 1; i <= texto.length && vivo; i++) {
                setTecleo(texto.slice(0, i))
                await esperar(45)
            }
            await esperar(350)
            if (!vivo) return
            setTecleo('')
            agregar({ rol: 'usuario', texto })
        }

        const responder = async (texto, tarjeta) => {
            setPensando(true)
            await esperar(1100)
            if (!vivo) return
            setPensando(false)
            agregar({ rol: 'lia', texto, tarjeta })
        }

        const correr = async () => {
            while (vivo) {
                setMensajes([])
                setPensando(false)
                setTecleo('')
                await esperar(500)
                await responder(LIA_SALUDO)
                for (const paso of LIA_GUION) {
                    if (!vivo) return
                    await esperar(1400)
                    await escribirPregunta(paso.pregunta)
                    await esperar(250)
                    await responder(paso.respuesta, paso.tarjeta)
                }
                await esperar(3500)
            }
        }

        correr()
        return () => { vivo = false; timers.forEach(clearTimeout) }
    }, [activo])

    // Siempre se ve lo último, como en un chat real.
    useEffect(() => {
        const lista = listaRef.current
        if (lista) lista.scrollTo({ top: lista.scrollHeight, behavior: 'smooth' })
    }, [mensajes.length, pensando])

    return (
        <div className='ob-step7-card'>
            <div className='ob-step7-header'>
                <div className='ob-step7-header-title'>
                    <Sparkles size={15} strokeWidth={1.8} className='ob-lia-spark' />
                    <span>Lia · tu asistente</span>
                    <span className='ob-lia-online'><i /> en línea</span>
                </div>
                <div className='ob-step7-close'>
                    <X size={14} strokeWidth={2.5} />
                </div>
            </div>

            <div className='ob-step7-messages ob-lia-messages' ref={listaRef}>
                {mensajes.map(m => (
                    <div key={m.id} className={`ob-step7-bubble ob-lia-bubble${m.rol === 'usuario' ? ' ob-lia-bubble--user' : ''}`}>
                        {m.texto}
                        {m.tarjeta && <LiaTarjeta tarjeta={m.tarjeta} />}
                    </div>
                ))}
                {pensando && (
                    <div className='ob-step7-bubble ob-lia-bubble ob-lia-typing'>
                        <i /><i /><i />
                    </div>
                )}
            </div>

            <div className='ob-step7-input-row'>
                <div className={`ob-step7-input ob-lia-input${tecleo ? ' ob-lia-input--typing' : ''}`}>
                    {tecleo || 'Pregúntale a Lia...'}
                    {tecleo && <span className='ob-lia-caret' />}
                </div>
                <div className='ob-step7-lock'>{tecleo ? <Send size={13} /> : <Lock size={13} />}</div>
            </div>
        </div>
    )
}

const Step7Demo = ({ slide, activo }) => (
    <div className='ob-step7-demo'>
        <div className='ob-wizard-visual'>
            <div className='ob-wizard-blob ob-wizard-blob--top' />
            <div className='ob-wizard-blob ob-wizard-blob--bottom' />
            <LiaChatDemo activo={activo} />
        </div>

        <SlideCopy slide={slide} />
    </div>
)

// ------------------------------------------------------------ Save the Date ---

// El Save the Date real (iattend.events/save-the-date/…) dentro del mismo
// teléfono que el editor de invitación. La URL se elige en Admin → Onboarding.
const SaveTheDateDemo = ({ slide }) => {
    const url = slide.config?.url || DEFAULT_STD_URL
    const [positionY, setPositionY] = useState('cover')
    const [device, setDevice] = useState('ios')
    const [onHide, setOnHide] = useState(false)
    const [cargado, setCargado] = useState(false)

    // Otra URL = otra carga: vuelve la portada hasta que termine.
    useEffect(() => { setCargado(false) }, [url])
    useEffect(() => {
        const tope = setTimeout(() => setCargado(true), 10000)
        return () => clearTimeout(tope)
    }, [url])

    return (
        <div className='ob-step1-demo ob-std-demo'>
            <div className='ob-wizard-visual' style={{ flex: '0 0 44%' }}>
                <div className='ob-wizard-blob ob-wizard-blob--top' />
                <div className='ob-wizard-blob ob-wizard-blob--bottom' />

                <div className='ob-step1-phone'>
                    <div className='ob-step1-phone-inner'>
                        <BuildContent
                            minimalControls
                            positionY={positionY}
                            setPositionY={setPositionY}
                            currentDevice={device}
                            setDevice={setDevice}
                            onHide={onHide}
                            setOnHide={setOnHide}
                            pantalla={(
                                <iframe
                                    key={url}
                                    src={url}
                                    title='Save the Date'
                                    className='ob-std-iframe'
                                    onLoad={() => setTimeout(() => setCargado(true), 300)}
                                />
                            )}
                            hostOverlay={<HostPoster invitation={null} visible={!cargado} />}
                        />
                    </div>
                </div>
            </div>

            <SlideCopy slide={slide} titleClassName='ob-step1-title' />
        </div>
    )
}

// --------------------------------------------------------------- Photo Wall ---

// Muro con las fotos que se suben en Admin → Onboarding, en columnas con
// parallax (una sube, la siguiente baja). Se ven todas desde el inicio; "Subir
// una foto" pone una nueva en el lugar de la más vieja, como si la mandara
// otro invitado.

// Siempre 3 columnas, en escritorio y en celular.
const WALL_COLUMNAS = 3

const fotoDelMuro = (src, i, minutos) => ({
    id: `wall-${i}-${Math.random()}`,
    src,
    name: FIRST_NAMES[(i * 7) % FIRST_NAMES.length],
    time: minutos === 0 ? 'ahora' : `hace ${minutos} min`,
})

const PhotoWallDemo = ({ slide }) => {
    const fuente = slide.config?.photos?.length ? slide.config.photos : DEFAULT_WALL_PHOTOS
    const clave = fuente.join('|')
    const iniciales = () => fuente.map((src, i) => fotoDelMuro(src, i, (i + 1) * 3))

    const [fotos, setFotos] = useState(iniciales)
    const [total, setTotal] = useState(214)
    const siguiente = useRef(0)

    // Si cambian las fotos (en el admin), el muro se vuelve a armar.
    useEffect(() => {
        setFotos(iniciales())
        siguiente.current = 0
    }, [clave])

    const numColumnas = WALL_COLUMNAS
    // Reparto en orden (1 a la col 1, 2 a la col 2…) y cada columna se repite
    // hasta tener al menos 4 fotos, para que su tira siempre cubra el alto.
    const columnas = Array.from({ length: numColumnas }, (_, c) => {
        const propias = fotos.filter((_, i) => i % numColumnas === c)
        if (!propias.length) return []
        const lista = [...propias]
        while (lista.length < 4) lista.push(...propias.map(f => ({ ...f, id: `${f.id}-r${lista.length}`, nueva: false })))
        return lista
    }).filter(col => col.length)

    const subir = () => {
        const i = siguiente.current++
        const foto = { ...fotoDelMuro(fuente[i % fuente.length], fuente.length + i, 0), nueva: true }
        setTotal(t => t + 1)
        // La nueva toma el lugar de la más vieja (en orden de lugares): así
        // ninguna otra foto cambia de columna y el parallax no brinca.
        setFotos(prev => prev.map((f, k) => (k === i % prev.length ? foto : f)))
    }

    return (
        <div className='ob-wall-demo'>
            <div className='ob-wizard-visual'>
                <div className='ob-wizard-blob ob-wizard-blob--top' />
                <div className='ob-wizard-blob ob-wizard-blob--bottom' />

                <div className='ob-wall-board'>
                    <div className='ob-wall-header'>
                        <span className='ob-wall-live'><i /> En vivo</span>
                        <span className='ob-wall-total'><Camera size={14} /> {total} fotos</span>
                    </div>
                    <div className='ob-wall-columns' style={{ gridTemplateColumns: `repeat(${columnas.length}, minmax(0, 1fr))` }}>
                        {columnas.map((columna, c) => (
                            <div key={c} className='ob-wall-col'>
                                {/* La tira va dos veces: al llegar a -50% se ve igual que en 0 y
                                    el ciclo no brinca. Pares suben, nones bajan. */}
                                <div
                                    className={`ob-wall-track ob-wall-track--${c % 2 === 0 ? 'up' : 'down'}`}
                                    style={{ animationDuration: `${columna.length * 12}s` }}
                                >
                                    {[...columna, ...columna].map((f, k) => (
                                        <figure key={`${f.id}-${k}`} className={`ob-wall-photo${f.nueva ? ' ob-wall-photo--new' : ''}`}>
                                            <img src={f.src} alt='' loading='lazy' />
                                            <figcaption>
                                                <b>{f.name}</b>
                                                <span>{f.time}</span>
                                            </figcaption>
                                        </figure>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <SlideCopy slide={slide}>
                <SlideCta label={slide.cta_label} onClick={subir} />
            </SlideCopy>
        </div>
    )
}

// ----------------------------------------------------- Imagen (sin demo) ---

const ImageDemo = ({ slide }) => (
    <div className='ob-image-demo'>
        <div className='ob-wizard-visual'>
            {slide.image_url
                ? <img className='ob-image-demo-img' src={slide.image_url} alt='' />
                : <span className='ob-image-demo-empty'>Sin imagen</span>}
        </div>
        <SlideCopy slide={slide} />
    </div>
)

// Editor de invitación con la invitación demo elegida en Admin → Onboarding
// (`config.invitation_id`). Sin ID, o si no se encuentra, usa la que trae la
// página (ONBOARDING_DEMO_ID).
const InvitationSlide = ({ slide, invitation, buttons, invitationID }) => {
    const id = slide.config?.invitation_id
    const propia = id && id !== invitationID
    const demo = useDemoInvitation(propia ? id : null)
    const usarPropia = propia && !demo.error

    return (
        <Step1Demo
            key={usarPropia ? id : invitationID}
            slide={slide}
            invitation={usarPropia ? demo.invitation : invitation}
            buttons={buttons ?? []}
            invitationID={usarPropia ? id : invitationID}
        />
    )
}

// Un slide por `kind`. Lo usa el wizard y la vista previa de Admin → Onboarding.
// `activo`: el slide es el que se ve. Las demos que se reproducen solas solo
// corren entonces (el wizard monta el siguiente por adelantado).
export const OnboardingSlide = ({ slide, invitation, buttons, invitationID, activo = true }) => {
    switch (slide.kind) {
        case 'invitation': return <InvitationSlide slide={slide} invitation={invitation} buttons={buttons} invitationID={invitationID} />
        case 'save_the_date': return <SaveTheDateDemo slide={slide} />
        case 'guests': return <Step2Demo slide={slide} activo={activo} />
        case 'rsvp': return <Step3Demo slide={slide} activo={activo} />
        case 'passes': return <Step4Demo slide={slide} />
        case 'seating': return <Step5Demo slide={slide} activo={activo} />
        case 'side_events': return <Step6Demo slide={slide} />
        case 'photo_wall': return <PhotoWallDemo slide={slide} />
        case 'lia': return <Step7Demo slide={slide} activo={activo} />
        default: return <ImageDemo slide={slide} />
    }
}

// Slides con el teléfono de BuildContent: sin padding, como el primero.
export const FULL_BLEED = new Set(['invitation', 'save_the_date'])

export const OnboardingWizard = ({ open, onClose, invitation, buttons, invitationID, prewarm = false, slides: slidesProp }) => {
    const slidesCatalogo = useOnboardingSlides()
    const slides = slidesProp ?? slidesCatalogo
    const [stepIndex, setStepIndex] = useState(0)
    // Slides ya vistos: se quedan montados para no perder lo que el usuario
    // movió en la demo. Los demás se montan al acercarse (actual ± 1): abrir el
    // wizard ya no dibuja las 9 demos de golpe.
    const [vistos, setVistos] = useState(() => new Set([0]))

    const total = slides.length
    const indice = Math.min(stepIndex, Math.max(total - 1, 0))
    const isLast = indice === total - 1

    useEffect(() => {
        setVistos(prev => (prev.has(indice) ? prev : new Set(prev).add(indice)))
    }, [indice])

    // La portada de la invitación demo se pide antes de abrir para que la
    // portada de carga del primer slide salga al instante.
    useEffect(() => {
        const src = invitation?.cover?.image?.prod
        if (src) new Image().src = src
    }, [invitation?.cover?.image?.prod])

    const goPrev = () => setStepIndex(Math.max(indice - 1, 0))
    const goNext = () => setStepIndex(Math.min(indice + 1, total - 1))

    const handleClose = () => {
        setStepIndex(0)
        onClose()
    }

    const handleFinish = () => {
        confetti({
            particleCount: 140,
            spread: 80,
            origin: { y: 0.55 },
            colors: ['#FF6B6B', '#FFE66D', '#A8E6CF', '#C3B1E1', '#FDCAE1', '#FFB347'],
        })
        handleClose()
    }

    const montar = useMemo(
        () => (i) => vistos.has(i) || Math.abs(i - indice) <= 1,
        [vistos, indice]
    )

    return (
        <Modal
            open={open}
            onCancel={handleClose}
            footer={null}
            closable={false}
            centered
            width='90vw'
            className='ob-wizard-modal'
            style={{ maxWidth: '1250px' }}
            // `prewarm`: el modal se monta oculto desde que carga la página, así
            // el iframe de la invitación ya está arrancando cuando se abre.
            forceRender={prewarm}
            styles={{
                content: { borderRadius: 24, overflow: 'hidden', padding: 0 },
                body: { height: '90vh', overflow: 'hidden', padding: 0, borderRadius: 24, },
            }}
        >
            <div className='ob-wizard' style={{ position: 'relative' }}>
                <div className='ob-wizard-header'>
                    <span className='ob-wizard-step-count'>Paso {indice + 1} de {total}</span>
                    <button type='button' className='ob-wizard-skip' onClick={handleClose}>Saltar intro</button>
                </div>

                <div className='ob-wizard-viewport'>
                    <div
                        className='ob-wizard-track'
                        style={{
                            width: `${total * 100}%`,
                            transform: `translateX(-${(100 / total) * indice}%)`,
                        }}
                    >
                        {slides.map((slide, i) => (
                            <div className={`ob-wizard-slide${FULL_BLEED.has(slide.kind) ? ' ob-wizard-slide--full-bleed' : ''}`} key={slide.id} style={{ width: `${100 / total}%` }}>
                                <div className='ob-wizard-slide-body'>
                                    {montar(i) && (
                                        <OnboardingSlide
                                            slide={slide}
                                            invitation={invitation}
                                            buttons={buttons}
                                            invitationID={invitationID}
                                            activo={open && i === indice}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className='ob-wizard-nav'>
                    <button type='button' className='ob-wizard-nav-btn' disabled={indice === 0} onClick={goPrev}>
                        Atrás
                    </button>

                    <div className='ob-wizard-dots'>
                        {slides.map((slide, i) => (
                            <button
                                key={slide.id}
                                type='button'
                                aria-label={`Ir a ${slide.title}`}
                                className={`ob-wizard-dot${i === indice ? ' ob-wizard-dot--active' : ''}`}
                                onClick={() => setStepIndex(i)}
                            />
                        ))}
                    </div>

                    <button
                        type='button'
                        className='ob-wizard-nav-btn ob-wizard-nav-btn--primary'
                        onClick={isLast ? handleFinish : goNext}
                    >
                        {isLast ? 'Finalizar' : 'Siguiente'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
