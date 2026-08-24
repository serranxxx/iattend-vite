import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import Lia from '../../pages/Lia/Lia'
import { useLia } from '../../context/LiaContext'
// import { DotMatrix } from './DotMatrix'
import './ChatContainer.css'

const CIRCLE = 50
const PANEL_W = 380
const PANEL_H = 560
const PILL_W = 300
const PILL_DURATION = 4000
const MOBILE_BP = 480
const POS_STORAGE_KEY = 'lia_chat_pos'

// El chat maneja su propio `open`, así que para abrirlo desde fuera (el botón
// flotante de mobile) se usa un evento de ventana, igual que WhatsNewBanners.
export const LIA_CHAT_OPEN_EVENT = 'lia:open-chat'

function loadSavedPos() {
    try {
        const saved = JSON.parse(localStorage.getItem(POS_STORAGE_KEY))
        if (typeof saved?.x === 'number' && typeof saved?.y === 'number') return saved
    } catch {
        // localStorage no disponible o valor corrupto — se usa la posición por defecto
    }
    return null
}

// Cerrado: margen chico y fijo, pegado al borde. Abierto: margen anterior
// (proporcional al viewport) para que el panel no se recorte.
function getPadX(isOpen) {
    if (isOpen) return window.innerWidth * (window.innerWidth <= MOBILE_BP ? 0.02 : 0.03)
    return window.innerWidth <= MOBILE_BP ? 8 : 16
}

function getPadY(isOpen) {
    if (isOpen) return window.innerHeight * (window.innerWidth <= MOBILE_BP ? 0.02 : 0.03)
    return window.innerWidth <= MOBILE_BP ? 8 : 16
}

function getCornerPos(corner, w, h, isOpen = false) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const px = getPadX(isOpen)
    const py = getPadY(isOpen)
    switch (corner) {
        case 'tl': return { x: px, y: py }
        case 'tr': return { x: vw - w - px, y: py }
        case 'br': return { x: vw - w - px, y: vh - h - py }
        default: return { x: px, y: vh - h - py }   // bl
    }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function clampToViewport(x, y, w, h, isOpen = false) {
    const px = getPadX(isOpen)
    const py = getPadY(isOpen)
    return {
        x: clamp(x, px, window.innerWidth - w - px),
        y: clamp(y, py, window.innerHeight - h - py),
    }
}

export const ChatContainer = () => {
    const [open, setOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [snapping, setSnapping] = useState(false)
    const [notifVisible, setNotifVisible] = useState(false)
    // const [btnHovered, setBtnHovered] = useState(false)
    const [searchParams] = useSearchParams()
    const id = searchParams.get('id')
    const { notifications, dismissAll } = useLia()

    const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth <= MOBILE_BP)

    useEffect(() => {
        const onResize = () => setIsMobileViewport(window.innerWidth <= MOBILE_BP)
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    const [pos, setPos] = useState(() => {
        const saved = loadSavedPos()
        return saved ? clampToViewport(saved.x, saved.y, CIRCLE, CIRCLE, false) : getCornerPos('br', CIRCLE, CIRCLE)
    })
    const posRef = useRef(pos)
    const openRef = useRef(open)
    const notifTimer = useRef(null)
    const prevCount = useRef(0)
    const drag = useRef({ active: false, moved: false, ox: 0, oy: 0, sx: 0, sy: 0 })
    const containerRef = useRef(null)

    useEffect(() => { posRef.current = pos }, [pos])
    useEffect(() => { openRef.current = open }, [open])

    // Solo se recuerda la posición cerrada (con la que siempre arranca al refrescar)
    useEffect(() => {
        if (open) return
        try {
            localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(pos))
        } catch {
            // localStorage no disponible — no hay nada que persistir
        }
    }, [pos, open])

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
        if (drag.current.moved) return
        setNotifVisible(false)
        clearTimeout(notifTimer.current)
        const nextOpen = !openRef.current
        if (!mounted && nextOpen) setMounted(true)
        setOpen(nextOpen)
        openRef.current = nextOpen
        const nw = nextOpen ? PANEL_W : CIRCLE
        const nh = nextOpen ? PANEL_H : CIRCLE
        const { x, y } = posRef.current

        let tx = x
        let ty = y
        if (!nextOpen) {
            // Al cerrar: conserva la posición en Y, pero en X va al borde más cercano (izq o der)
            const isRight = x + PANEL_W / 2 > window.innerWidth / 2
            tx = isRight ? window.innerWidth : 0
        }

        const target = clampToViewport(tx, ty, nw, nh, nextOpen)
        setSnapping(true)
        setPos(target)
        posRef.current = target
        setTimeout(() => setSnapping(false), 380)
    }, [mounted])

    const onPointerDown = useCallback((e) => {
        if (e.button !== 0) return
        const isHandle = e.target.closest('.lia-chat-header') && !e.target.closest('.chat-morph-close')
        if (openRef.current && !isHandle) return
        drag.current = {
            active: true,
            moved: false,
            ox: e.clientX,
            oy: e.clientY,
            sx: posRef.current.x,
            sy: posRef.current.y,
        }
        setSnapping(false)
    }, [])

    useEffect(() => {
        const onMove = (e) => {
            if (!drag.current.active) return
            const dx = e.clientX - drag.current.ox
            const dy = e.clientY - drag.current.oy
            const threshold = openRef.current ? 4 : 14
            if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) drag.current.moved = true
            if (!drag.current.moved) return
            const w = openRef.current ? PANEL_W : CIRCLE
            const h = openRef.current ? PANEL_H : CIRCLE
            const newPos = {
                x: clamp(drag.current.sx + dx, 0, window.innerWidth - w - getPadX(openRef.current)),
                y: clamp(drag.current.sy + dy, 0, window.innerHeight - h - getPadY(openRef.current)),
            }
            setPos(newPos)
            posRef.current = newPos
        }

        const onUp = () => {
            if (!drag.current.active) return
            drag.current.active = false
            if (!drag.current.moved) return
            const w = openRef.current ? PANEL_W : CIRCLE
            const h = openRef.current ? PANEL_H : CIRCLE
            const { x, y } = posRef.current
            const px = getPadX(openRef.current)
            const py = getPadY(openRef.current)
            const snapX = (x + w / 2) < window.innerWidth / 2
                ? px
                : window.innerWidth - w - px
            const snapY = clamp(y, py, window.innerHeight - h - py)
            setSnapping(true)
            setPos({ x: snapX, y: snapY })
            posRef.current = { x: snapX, y: snapY }
            setTimeout(() => setSnapping(false), 380)
        }

        const onResize = () => {
            const w = openRef.current ? PANEL_W : CIRCLE
            const h = openRef.current ? PANEL_H : CIRCLE
            const target = clampToViewport(posRef.current.x, posRef.current.y, w, h, openRef.current)
            setPos(target)
            posRef.current = target
        }

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('resize', onResize)
        return () => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
            window.removeEventListener('resize', onResize)
        }
    }, [])

    // Apertura desde fuera (el botón flotante de mobile). Se delega en
    // handleToggle: además de `open`, monta el panel, sincroniza openRef y
    // recalcula la posición para el tamaño abierto.
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

    // If the button is on the right half, expand the pill leftward via transform
    const isRight = pos.x > window.innerWidth / 2
    const pillShift = morphState === 'notif' && isRight ? -(PILL_W - CIRCLE) : 0
    const isMobileOpen = open && window.innerWidth <= MOBILE_BP
    // El shell base tiene padding: 12px, pero el estado "closed" lo pisa a 0 —
    // hay que restar el offset solo cuando ese padding realmente existe, si no
    // el botón cerrado queda corrido hacia arriba/izquierda.
    const shellPad = morphState === 'closed' ? 0 : 12

    return (
       <div
            ref={containerRef}
            className={`chat-morph-shell chat-morph-shell--${morphState}${snapping ? ' chat-morph-shell--snapping' : ''}`}
            style={isMobileOpen ? {
                inset: 0,
                width: '100vw',
                height: '100dvh',
                borderRadius: 0,
                transform: 'none',
            } : {
                left: pos.x - shellPad,
                top: pos.y - shellPad,
                transform: pillShift ? `translateX(${pillShift}px)` : undefined,
            }}
            onPointerDown={onPointerDown}
        >
            <div className={`chat-morph chat-morph--${morphState}`}>
                
                {/* Circle button — visible when closed */}
                <div
                    className="chat-morph-btn"
                    onClick={handleToggle}
                    // onMouseEnter={() => setBtnHovered(true)}
                    // onMouseLeave={() => setBtnHovered(false)}
                >
                    {/* <DotMatrix size={84} hovered={btnHovered && morphState === 'closed'} /> */}
                    <span style={{ fontSize: 22, color: '#fff', lineHeight: 1 }}>✦</span>
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

