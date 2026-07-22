import { useEffect, useRef, useState } from 'react'
import { Modal, Button, Table, QRCode, Slider } from 'antd'
import confetti from 'canvas-confetti'
import { Send, Check, Wallet, ArrowRight, Plus, Minus, Sparkles, X, Lock } from 'lucide-react'
import { FiArrowUpRight } from 'react-icons/fi'
import { FaPaperPlane, FaWhatsapp } from 'react-icons/fa'
import { LuCalendar, LuCalendarCheck2, LuCalendarClock, LuCalendarX } from 'react-icons/lu'
import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Legend } from 'chart.js'
import { BuildContent } from '../../modules/Invitation/Build/PageSections/BuildContent'
import ios_settings from '../../assets/images/iphone-settings.svg'

ChartJS.register(ArcElement, Legend)

const STEPS = [
    {
        key: 'intro',
        title: 'Conoce I attend',
        subtitle: 'Crea tu invitación perfecta',
    },
    { key: 'step-2', title: 'Crea tu lista de invitados', subtitle: 'y envía tu invitación en automático' },
    { key: 'step-3', title: 'Recibe confirmaciones', subtitle: 'todos tus invitados bajo control' },
    { key: 'step-4', title: 'Pases digitales', subtitle: 'para que nada falle el día del evento' },
    { key: 'step-5', title: 'Seating chart', subtitle: 'acomoda mesas y sillas como quieras' },
    { key: 'step-6', title: 'Side events', subtitle: 'cada evento con su propio pase' },
    { key: 'step-7', title: 'Conoce a Lia', subtitle: 'tu asistente con el contexto completo de tu evento' },
]

const Step1Demo = ({ invitation, buttons, invitationID }) => {
    const [demoPositionY, setDemoPositionY] = useState('cover')
    const [demoDevice, setDemoDevice] = useState('ios')
    const [demoOnHide, setDemoOnHide] = useState(false)

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
                        />
                    </div>
                </div>
            </div>

            <div className='ob-wizard-visual-content'>
                <span className='ob-wizard-eyebrow'>Empecemos juntas</span>
                <h2 className='ob-step1-title'>Conoce I attend</h2>
                <p className='ob-wizard-visual-description'>
                    Dale vida a tu invitación en segundos. Cambia fotos, colores y textos, y observa la magia suceder aquí mismo —sin saber de diseño.
                </p>

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
            </div>
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

const Step2Demo = () => {
    const [guests, setGuests] = useState(() => generateMockGuests(45))
    const [sendingId, setSendingId] = useState(null)
    const [pillPhase, setPillPhase] = useState(null)

    const handleSend = (guestId) => {
        if (sendingId) return
        setSendingId(guestId)
        setPillPhase('sending')
        setTimeout(() => {
            setPillPhase('sent')
            setGuests((prev) => prev.map((g) => (g.id === guestId ? { ...g, state: 'esperando' } : g)))
            setTimeout(() => {
                setPillPhase('hiding')
                setTimeout(() => {
                    setPillPhase(null)
                    setSendingId(null)
                }, 400)
            }, 1200)
        }, 2000)
    }

    const columns = [
        {
            title: 'Nombre',
            dataIndex: 'name',
            width: 180,
            render: (value) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiArrowUpRight size={14} style={{ color: '#999', flexShrink: 0 }} />
                    <span>{value}</span>
                </div>
            ),
        },
        {
            title: 'Contacto',
            dataIndex: 'phone_number',
            width: 150,
        },
        {
            title: 'Estado',
            dataIndex: 'state',
            width: 110,
            render: (value) => (
                <span className={`new-table-tag ob-step2-tag state-${value}`}>
                    {value === 'creado' ? 'Por Invitar' : 'Enviada'}
                </span>
            ),
        },
        {
            title: 'Acciones',
            key: 'send',
            width: 110,
            fixed: 'right',
            render: (_, record) => (
                <Button
                    className='primarybutton--active'
                    icon={<Send size={14} />}
                    style={{ borderRadius: 99 }}
                    disabled={!!sendingId || record.state !== 'creado'}
                    onClick={() => handleSend(record.id)}
                >
                    Enviar
                </Button>
            ),
        },
    ]

    return (
        <div className='ob-step2-demo'>
            <div className='ob-wizard-visual'>
                <div className='ob-wizard-blob ob-wizard-blob--top' />
                <div className='ob-wizard-blob ob-wizard-blob--bottom' />

                <div
                    className={`ob-step2-sending-pill${pillPhase ? ' ob-step2-sending-pill--active' : ''}${pillPhase === 'hiding' ? ' ob-step2-sending-pill--hiding' : ''}`}
                >
                    {pillPhase === 'sent' || pillPhase === 'hiding'
                        ? <Check size={16} />
                        : <FaPaperPlane className='paper_flight' />}
                    <span className='ob-step2-sending-pill-text'>
                        {pillPhase === 'sent' || pillPhase === 'hiding' ? 'Enviada' : 'Enviando invitación'}
                    </span>
                </div>

                <div className='ob-step2-visual-stack'>
                    <div className='ob-step2-table-card'>
                        <Table
                            className='table_container'
                            size='small'
                            rowKey='id'
                            pagination={false}
                            scroll={{ x: 480, y: 420 }}
                            columns={columns}
                            dataSource={guests}
                        />
                    </div>

                    <div className='ob-step2-whatsapp-badge'>Envío automático por WhatsApp</div>
                </div>

                <div className='ob-step2-mobile-list'>
                    <div className='ob-step2-mobile-card'>
                        <div className='ob-step2-mobile-header'>
                            <span className='ob-step2-mobile-count'>{guests.length} invitados</span>
                            <button type='button' className='ob-step2-mobile-add'>+ Agregar</button>
                        </div>

                        {guests.slice(0, 4).map((g) => (
                            <div key={g.id} className='ob-step2-mobile-row'>
                                <div className='ob-step2-mobile-info'>
                                    <span className='ob-step2-mobile-name'>{g.name}</span>
                                    <span className='ob-step2-mobile-phone'>{g.phone_number}</span>
                                </div>
                                <button
                                    style={{minWidth:'89px', backgroundColor:g.state !== 'creado' ? 'var(--mid-blue-500)' : undefined, color: g.state !== 'creado' ? '#FFFFFF80' : undefined }}
                                    type='button'
                                    className='ob-step2-mobile-send'
                                    disabled={!!sendingId || g.state !== 'creado'}
                                    onClick={() => handleSend(g.id)}
                                >
                                    {
                                        g.state === 'creado' && 
                                        <Send size={13} />
                                    }
                                    
                                    {g.state !== 'creado' ? 'Invitado' : 'Enviar'}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className='ob-step2-whatsapp-badge'>
                        <FaWhatsapp size={16}/>
                        <span>Envío por WhatsApp</span>
                    </div>
                </div>
            </div>

            <div className='ob-wizard-visual-content'>
                <span className='ob-wizard-eyebrow'>Sin hojas de calculo</span>
                <h2 className='ob-wizard-title-serif'>Crea tu lista de invitados</h2>
                <p className='ob-wizard-subtitle-serif'>y envía la invitación en automático.</p>
                <p className='ob-wizard-visual-description'>
                    Olvídate de las hojas de Excel y de escribir mensajes uno por uno. Organiza a tus invitados aquí y envía su invitación con un solo clic —por WhatsApp, sin arriesgar tu número personal.
                </p>
            </div>
        </div>
    )
}

const chartOptions = {
    responsive: false,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
        },
    },
}

const Step3Demo = () => {
    const [confirmed, setConfirmed] = useState(76)
    const [waiting, setWaiting] = useState(35)
    const [available] = useState(39)
    const [rejected] = useState(3)
    const [toasts, setToasts] = useState([])

    const handleConfirm = () => {
        const name = `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`
        setConfirmed((c) => c + 1)
        setWaiting((w) => Math.max(0, w - 1))
        const id = Date.now() + Math.random()
        setToasts((prev) => [...prev, { id, name, leaving: false }])
        setTimeout(() => {
            setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id))
            }, 300)
        }, 3500)
    }

    const chartData = {
        labels: ['Confirmados', 'Esperando', 'Disponible', 'Rechazos'],
        datasets: [
            {
                data: [confirmed, waiting, available, rejected],
                backgroundColor: ['#C5D5AD', '#aac187', '#8FA271', 'var(--light-green-700)'],
                borderColor: 'transparent',
                borderWidth: 2,
            },
        ],
    }

    return (
        <div className='ob-step3-demo'>
            <div className='ob-wizard-visual'>
                <div className='ob-wizard-blob ob-wizard-blob--top' />
                <div className='ob-wizard-blob ob-wizard-blob--bottom' />

                <div className='ob-step3-toast-stack'>
                    {toasts.map((t) => (
                        <div className={`ob-step3-toast${t.leaving ? ' ob-step3-toast--leaving' : ''}`} key={t.id}>
                            <div className='ob-step3-toast-icon'>
                                <LuCalendarCheck2 size={18} />
                            </div>
                            <div className='ob-step3-toast-text'>
                                <strong>¡Nueva confirmación!</strong>
                                <span>{t.name} confirmó su asistencia</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className='ob-step3-card'>
                    <div className='ob-step3-row'>
                        <div className='ob-step3-pie'>
                            <Pie data={chartData} options={chartOptions} width={200} height={200} />
                        </div>

                        <div className='ob-step3-grid'>
                            <div className='ob-step3-col'>
                                <span className='ob-step3-stat-label'>Confirmados</span>
                                <div className='ob-step3-stat-row'>
                                    <span className='ob-step3-stat-value'>{confirmed}</span>
                                    <LuCalendarCheck2 className='ob-step3-stat-icon' size={32} style={{ color: '#BFBFBF' }} />
                                </div>
                            </div>

                            <div className='ob-step3-col'>
                                <span className='ob-step3-stat-label'>Esperando</span>
                                <div className='ob-step3-stat-row'>
                                    <span className='ob-step3-stat-value'>{waiting}</span>
                                    <LuCalendarClock className='ob-step3-stat-icon' size={32} style={{ color: '#BFBFBF' }} />
                                </div>
                            </div>

                            <div className='ob-step3-col'>
                                <span className='ob-step3-stat-label'>Disponible</span>
                                <div className='ob-step3-stat-row'>
                                    <span className='ob-step3-stat-value'>{available}</span>
                                    <LuCalendar className='ob-step3-stat-icon' size={32} style={{ color: '#BFBFBF' }} />
                                </div>
                            </div>

                            <div className='ob-step3-col'>
                                <span className='ob-step3-stat-label'>Rechazos</span>
                                <div className='ob-step3-stat-row'>
                                    <span className='ob-step3-stat-value'>{rejected}</span>
                                    <LuCalendarX className='ob-step3-stat-icon' size={32} style={{ color: '#BFBFBF' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className='ob-wizard-visual-content'>
                <span className='ob-wizard-eyebrow'>En tiempo real</span>
                <h2 className='ob-wizard-title-serif'>Mira las confirmaciones llegar</h2>
                <p className='ob-wizard-subtitle-serif'>sin preguntarle a nadie.</p>
                <p className='ob-wizard-visual-description'>
                    Cada invitado confirma desde su invitación —tú solo ves los números moverse. Confirmados, pendientes y cancelados, siempre al día, sin revisar la plataforma a cada rato.
                </p>
                <p className='ob-wizard-visual-description ob-wizard-visual-description--mobile'>
                    Cada invitado confirma desde su invitación —tú solo ves los números moverse, sin revisar la plataforma a cada rato.
                </p>

                <Button style={{width:'220px'}} icon={<ArrowRight size={16} />} className='ob-wizard-nav-btn ob-wizard-nav-btn--primary ob-step3-cta-desktop' onClick={handleConfirm}>
                    Confirmar un invitado
                </Button>

                <button type='button' className='ob-wizard-link-cta ob-step3-cta-mobile' onClick={handleConfirm}>
                    Confirmar un invitado <ArrowRight size={16} />
                </button>
            </div>
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

const Step4Demo = () => {
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

            <div className='ob-wizard-visual-content'>
                <span className='ob-wizard-eyebrow'>Sin boletos fisicos</span>
                <h2 className='ob-wizard-title-serif'>Un pase digital para cada invitado</h2>
                <p className='ob-wizard-subtitle-serif'>para que nada falle el día del evento.</p>
                <p className='ob-wizard-visual-description'>
                    Olvídate de las listas impresas en la entrada. Cada invitado lleva su pase con código QR directo desde su celular —compatible con Apple Wallet, y siempre actualizado si algo cambia.
                </p>
            </div>
        </div>
    )
}

const SEATING_CANVAS_WIDTH = 620
const SEATING_CANVAS_HEIGHT = 400
const SEATING_TABLE_SIZE = 56
const SEATING_DANCE_FLOOR = { x: 200, y: 100, width: 220, height: 140 }

const SEATING_CANVAS_WIDTH_MOBILE = 280
const SEATING_CANVAS_HEIGHT_MOBILE = 560
const SEATING_DANCE_FLOOR_MOBILE = { x: 92, y: 140, width: 96, height: 280 }

const buildSeatingTables = (mobile) => {
    if (mobile) {
        const col = (x, startNumber) => Array.from({ length: 5 }, (_, i) => ({
            id: `seating-table-${startNumber + i}`,
            number: startNumber + i,
            x,
            y: 20 + i * 108,
        }))
        return [...col(20, 1), ...col(SEATING_CANVAS_WIDTH_MOBILE - SEATING_TABLE_SIZE - 20, 6)]
    }

    const row = (y, startNumber) => Array.from({ length: 5 }, (_, i) => ({
        id: `seating-table-${startNumber + i}`,
        number: startNumber + i,
        x: 24 + i * 122,
        y,
    }))
    return [...row(24, 1), ...row(260, 6)]
}

const clampValue = (value, min, max) => Math.min(Math.max(value, min), max)
const getEventPoint = (event) => (event.touches && event.touches.length ? event.touches[0] : event)
const isMobileViewport = () => typeof window !== 'undefined' && window.innerWidth <= 750

const Step5Demo = () => {
    const mobile = isMobileViewport()
    const canvasWidth = mobile ? SEATING_CANVAS_WIDTH_MOBILE : SEATING_CANVAS_WIDTH
    const canvasHeight = mobile ? SEATING_CANVAS_HEIGHT_MOBILE : SEATING_CANVAS_HEIGHT
    const danceFloor = mobile ? SEATING_DANCE_FLOOR_MOBILE : SEATING_DANCE_FLOOR

    const [tables, setTables] = useState(() => buildSeatingTables(mobile))
    const [zoomLevel, setZoomLevel] = useState(() => (mobile ? 0.68 : 1))
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

        const handleDragEnd = () => setDraggingId(null)

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

    const handleAddTable = () => {
        setTables((prev) => {
            const lastTable = prev.reduce((acc, t) => (t.x > acc.x ? t : acc), prev[0])
            const nextX = clampValue(lastTable.x + 90, 0, canvasWidth - SEATING_TABLE_SIZE)
            return [...prev, { id: `seating-table-${Date.now()}`, number: prev.length + 1, x: nextX, y: lastTable.y }]
        })
    }

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
                                    className={`ob-step5-table${draggingId === table.id ? ' ob-step5-table--dragging' : ''}`}
                                    style={{ left: table.x, top: table.y }}
                                    onMouseDown={(event) => handleTableDragStart(event, table)}
                                    onTouchStart={(event) => handleTableDragStart(event, table)}
                                >
                                    #{table.number}
                                </div>
                            ))}
                        </div>

                        <div className='ob-step5-zoom'>
                            <Plus size={12} />
                            <Slider
                                vertical
                                min={isMobileViewport() ? 0.4 : 0.6}
                                max={1.6}
                                step={0.01}
                                value={zoomLevel}
                                onChange={setZoomLevel}
                                style={{ height: 70 }}
                            />
                            <Minus size={12} />
                        </div>
                    </div>

                    <div className='ob-step5-legend'>
                        <span className='ob-step5-legend-item'>
                            <span className='ob-step5-legend-dot ob-step5-legend-dot--occupied' />
                            <span className='ob-step5-legend-text-desktop'>Lugares ocupados: 42</span>
                            <span className='ob-step5-legend-text-mobile'>Ocupados: 42</span>
                        </span>
                        <span className='ob-step5-legend-item'>
                            <span className='ob-step5-legend-dot ob-step5-legend-dot--available' />
                            <span className='ob-step5-legend-text-desktop'>Lugares disponibles: 38</span>
                            <span className='ob-step5-legend-text-mobile'>Disponibles: 38</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className='ob-wizard-visual-content'>
                <span className='ob-wizard-eyebrow'>Arrastra y acomoda</span>
                <h2 className='ob-wizard-title-serif'>Que el seating chart no te quite el sueño</h2>
                <p className='ob-wizard-subtitle-serif'>acomoda mesas y sillas como quieras.</p>
                <p className='ob-wizard-visual-description'>
                    Diseña el plano de tu salón, agrega mesas de cualquier forma y asigna a cada invitado con solo arrastrarlo. Ve en tiempo real cuántos lugares tienes ocupados y cuántos te faltan por llenar.
                </p>
                <p className='ob-wizard-visual-description ob-wizard-visual-description--mobile'>
                    Diseña el plano de tu salón y asigna a cada invitado con solo arrastrarlo.
                </p>

                <Button style={{width:'200px'}} icon={<ArrowRight size={16} />} className='ob-wizard-nav-btn ob-wizard-nav-btn--primary ob-step5-cta-desktop' onClick={handleAddTable}>
                    Agregar una mesa
                </Button>

                {/* <button type='button' className='ob-wizard-link-cta ob-step5-cta-mobile' onClick={handleAddTable}>
                    Agregar una mesa <ArrowRight size={16} />
                </button> */}
            </div>
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

const Step6Demo = () => (
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

        <div className='ob-wizard-visual-content'>
            <span className='ob-wizard-eyebrow'>Mas que un solo dia</span>
            <h2 className='ob-wizard-title-serif'>Conoce los side events</h2>
            <p className='ob-wizard-subtitle-serif'>despedida, torna boda, brunch —cada uno con su propia invitación.</p>
            <p className='ob-wizard-visual-description'>
                Crea una invitación distinta para cada evento alrededor de tu boda, con su propio dress code, ubicación y confirmación. Tus invitados solo ven los eventos a los que fueron invitados.
            </p>
            <p className='ob-wizard-visual-description ob-wizard-visual-description--mobile'>
                Crea una invitación distinta para cada evento alrededor de tu boda, con su propio dress code y confirmación.
            </p>
        </div>
    </div>
)

const LIA_DEMO_MESSAGES = [
    'Soy tu asistente de boda. Conozco cada detalle de tu evento. ✨',
    '75 invitados confirmados, 35 esperando. Te aviso si alguien cambia su respuesta.',
    'Sé quién va en cada mesa, qué menú eligió cada invitado y quién todavía no confirma.',
]

const Step7Demo = () => (
    <div className='ob-step7-demo'>
        <div className='ob-wizard-visual'>
            <div className='ob-wizard-blob ob-wizard-blob--top' />
            <div className='ob-wizard-blob ob-wizard-blob--bottom' />

            <div className='ob-step7-card'>
                <div className='ob-step7-header'>
                    <div className='ob-step7-header-title'>
                        <Sparkles size={15} strokeWidth={1.8} />
                        <span>Lia · tu asistente</span>
                    </div>
                    <div className='ob-step7-close'>
                        <X size={14} strokeWidth={2.5} />
                    </div>
                </div>

                <div className='ob-step7-messages'>
                    {LIA_DEMO_MESSAGES.map((text, i) => (
                        <div key={i} className='ob-step7-bubble'>{text}</div>
                    ))}
                </div>

                <div className='ob-step7-input-row'>
                    <input className='ob-step7-input' disabled placeholder='Desbloquea Lia con Pro...' />
                    <div className='ob-step7-lock'><Lock size={13} /></div>
                </div>
            </div>
        </div>

        <div className='ob-wizard-visual-content'>
            <span className='ob-wizard-eyebrow'>Tu copiloto de boda</span>
            <h2 className='ob-wizard-title-serif'>Conoce a Lia</h2>
            <p className='ob-wizard-subtitle-serif'>tu asistente con el contexto completo de tu evento.</p>
            <p className='ob-wizard-visual-description'>
                Pregúntale lo que quieras —dress code, horarios, confirmaciones, logística— y responde al instante con la información real de tu invitación. Siempre disponible, sin buscar entre pestañas.
            </p>
            <p className='ob-wizard-visual-description ob-wizard-visual-description--mobile'>
                Pregúntale lo que quieras —dress code, horarios, logística— y responde al instante con la información real de tu invitación.
            </p>
        </div>
    </div>
)

export const OnboardingWizard = ({ open, onClose, invitation, buttons, invitationID }) => {
    const [stepIndex, setStepIndex] = useState(0)

    const isLast = stepIndex === STEPS.length - 1

    const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0))
    const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))

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
            styles={{
                content: { borderRadius: 24, overflow: 'hidden', padding: 0 },
                body: { height: '90vh', overflow: 'hidden', padding: 0, borderRadius: 24, },
            }}
        >
            <div className='ob-wizard' style={{ position: 'relative' }}>
                <div className='ob-wizard-header'>
                    <span className='ob-wizard-step-count'>Paso {stepIndex + 1} de {STEPS.length}</span>
                    <button type='button' className='ob-wizard-skip' onClick={handleClose}>Saltar intro</button>
                </div>

                <div className='ob-wizard-viewport'>
                    <div
                        className='ob-wizard-track'
                        style={{
                            width: `${STEPS.length * 100}%`,
                            transform: `translateX(-${(100 / STEPS.length) * stepIndex}%)`,
                        }}
                    >
                        {STEPS.map((step, i) => (
                            <div className={`ob-wizard-slide${i === 0 ? ' ob-wizard-slide--full-bleed' : ''}`} key={step.key} style={{ width: `${100 / STEPS.length}%` }}>
                                {/* <div className='ob-wizard-slide-heading'>
                                    <h2 className='ob-wizard-slide-title'>{step.title}</h2>
                                    <p className='ob-wizard-slide-subtitle'>{step.subtitle}</p>
                                </div> */}

                                <div className='ob-wizard-slide-body'>
                                    {i === 0 && <Step1Demo invitation={invitation} buttons={buttons} invitationID={invitationID} />}
                                    {i === 1 && <Step2Demo />}
                                    {i === 2 && <Step3Demo />}
                                    {i === 3 && <Step4Demo />}
                                    {i === 4 && <Step5Demo />}
                                    {i === 5 && <Step6Demo />}
                                    {i === 6 && <Step7Demo />}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className='ob-wizard-nav'>
                    <button type='button' className='ob-wizard-nav-btn' disabled={stepIndex === 0} onClick={goPrev}>
                        Atrás
                    </button>

                    <div className='ob-wizard-dots'>
                        {STEPS.map((_, i) => (
                            <button
                                key={i}
                                type='button'
                                className={`ob-wizard-dot${i === stepIndex ? ' ob-wizard-dot--active' : ''}`}
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
