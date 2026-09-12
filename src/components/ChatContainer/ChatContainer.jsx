import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import Lia from '../../pages/Lia/Lia'
import { useLia } from '../../context/LiaContext'
import AISiri from '../AISiri/AISiri'
// import { DotMatrix } from './DotMatrix'
import './ChatContainer.css'

const PILL_DURATION = 4000
const MOBILE_BP = 480

// Paleta única del orb (500 dominante, 300, 100, 700): --purple-color (#6D3CFA)
// dominante con tonos light green, misma en reposo y hover — en hover solo
// cambian velocidad y flow scale.
const ORB_PALETTE = ['#6D3CFA', '#aac187', '#E0E9D4', '#4526A3']
const ORB_BG = '#241357'
// Velocidad y flow scale del orb: lento en reposo, acelerado y más amplio en hover
const ORB_SPEED = 0.4
const ORB_SPEED_HOVER = 2
const ORB_FLOW_SCALE = 0.36
const ORB_FLOW_SCALE_HOVER = 1

// El chat maneja su propio `open`, así que para abrirlo desde fuera (el botón
// flotante de mobile) se usa un evento de ventana, igual que WhatsNewBanners.
export const LIA_CHAT_OPEN_EVENT = 'lia:open-chat'

export const ChatContainer = () => {
    const [open, setOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [notifVisible, setNotifVisible] = useState(false)
    const [btnHovered, setBtnHovered] = useState(false)
    const [searchParams] = useSearchParams()
    const id = searchParams.get('id')
    const { notifications, dismissAll } = useLia()

    const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth <= MOBILE_BP)

    useEffect(() => {
        const onResize = () => setIsMobileViewport(window.innerWidth <= MOBILE_BP)
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    const openRef = useRef(open)
    const notifTimer = useRef(null)
    const prevCount = useRef(0)
    const containerRef = useRef(null)

    useEffect(() => { openRef.current = open }, [open])

    // Expand to pill when a new notification arrives (only when chat is closed)
    useEffect(() => {
        if (open) {
            prevCount.current = notifications.length
            return
        }
        if (notifications.length > prevCount.current) {
            setNotifVisible(true)
            clearTimeout(notifTimer.current)
            notifTimer.current = setTimeout(() => setNotifVisible(false), PILL_DURATION)
        } else if (notifications.length === 0) {
            setNotifVisible(false)
            clearTimeout(notifTimer.current)
        }
        prevCount.current = notifications.length
    }, [notifications.length, open])

    // Collapse pill immediately when Lia opens
    useEffect(() => {
        if (!open) return
        setNotifVisible(false)
        clearTimeout(notifTimer.current)
    }, [open])

    const handleToggle = useCallback(() => {
        setNotifVisible(false)
        clearTimeout(notifTimer.current)
        const nextOpen = !openRef.current
        if (!mounted && nextOpen) setMounted(true)
        setOpen(nextOpen)
        openRef.current = nextOpen
    }, [mounted])

    // Apertura desde fuera (el botón flotante de mobile)
    useEffect(() => {
        const onOpen = () => { if (!openRef.current) handleToggle() }
        window.addEventListener(LIA_CHAT_OPEN_EVENT, onOpen)
        return () => window.removeEventListener(LIA_CHAT_OPEN_EVENT, onOpen)
    }, [handleToggle])

    useEffect(() => {
        if (!open) return
        const onClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                handleToggle()
            }
        }
        document.addEventListener('mousedown', onClickOutside)
        return () => document.removeEventListener('mousedown', onClickOutside)
    }, [open, handleToggle])

    useEffect(() => {
        const isMob = window.innerWidth <= MOBILE_BP
        if (!isMob) return
        if (open) {
            document.body.style.overflow = 'hidden'
            document.documentElement.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
            document.documentElement.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
            document.documentElement.style.overflow = ''
        }
    }, [open])

    if (!id) return null

    // En mobile la entrada a Lia es el botón flotante del header, así que el
    // círculo propio del chat solo aparece cuando ya está abierto — si no,
    // habría dos botones flotantes peleándose la misma esquina.
    if (!open && isMobileViewport) return null

    const latestNotif = notifications[notifications.length - 1]

    const morphState = open ? 'open' : notifVisible ? 'notif' : 'closed'
    const isMobileOpen = open && window.innerWidth <= MOBILE_BP

    return (
       <div
            ref={containerRef}
            className={`chat-morph-shell chat-morph-shell--${morphState}`}
            style={isMobileOpen ? {
                inset: 0,
                width: '100vw',
                height: '100dvh',
                borderRadius: 0,
            } : undefined}
        >
            <div className={`chat-morph chat-morph--${morphState}`}>

                {/* Circle button — visible when closed */}
                <div
                    className="chat-morph-btn"
                    onClick={handleToggle}
                    onMouseEnter={() => setBtnHovered(true)}
                    onMouseLeave={() => setBtnHovered(false)}
                >
                    {/* <DotMatrix size={84} hovered={btnHovered && morphState === 'closed'} /> */}
                    <AISiri
                        size={60}
                        speed={btnHovered ? ORB_SPEED_HOVER : ORB_SPEED}
                        flowScale={btnHovered ? ORB_FLOW_SCALE_HOVER : ORB_FLOW_SCALE}
                        palette={ORB_PALETTE}
                        background={ORB_BG}
                    />
                </div>

                {/* Dynamic Island pill content — visible during notif state */}
                <div
                    className="chat-morph-pill"
                    onClick={() => { dismissAll(); handleToggle() }}
                >
                    <div style={{
                        height: '64px', width: '64px', minWidth:'64px', overflow: 'hidden', borderRadius: '99px',
                        background: 'var(--mid-blue-500)', boxShadow: 'inset 0px 0px 6px rgba(0,0,0,0.3)',
                        display:'flex',alignItems:'center',justifyContent:'center'
                    }}>
                        {/* <DotMatrix size={84} mode='notification' /> */}
                        <span style={{ fontSize: 24, color: '#fff', lineHeight: 1 }}>✦</span>
                    </div>
                    <div className="chat-morph-pill-text">
                        {/* <strong className="chat-morph-pill-title">Alberto Serrano</strong> */}
                        {/* <span className="chat-morph-pill-body">Ha confirmado su asistencia</span> */}
                        <strong className="chat-morph-pill-title">{latestNotif?.title}</strong>
                        {latestNotif?.body && (
                            <span className="chat-morph-pill-body">{latestNotif.body}</span>
                        )}
                    </div>
                </div>

                {/* Lia panel — visible when open */}
                {mounted && (
                    <div className="chat-morph-panel">
                        <Lia id={id} onMinimize={handleToggle} />
                    </div>
                )}
            </div>
        </div>
    )
}
