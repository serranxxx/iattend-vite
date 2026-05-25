import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import Lia from '../../pages/Lia/Lia'
import './ChatContainer.css'

const MARGIN = 20
const CIRCLE = 52
const PANEL_W = 380
const PANEL_H = 560

function getCornerPos(corner, w, h) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    switch (corner) {
        case 'tl': return { x: MARGIN, y: MARGIN }
        case 'tr': return { x: vw - w - MARGIN, y: MARGIN }
        case 'br': return { x: vw - w - MARGIN, y: vh - h - MARGIN }
        default:   return { x: MARGIN, y: vh - h - MARGIN }    // bl
    }
}

function detectCorner(cx, cy) {
    const isLeft = cx < window.innerWidth  / 2
    const isTop  = cy < window.innerHeight / 2
    return (isTop ? 't' : 'b') + (isLeft ? 'l' : 'r')
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

export const ChatContainer = () => {
    const [open, setOpen]       = useState(false)
    const [mounted, setMounted] = useState(false)
    const [snapping, setSnapping] = useState(false)
    const [searchParams] = useSearchParams()
    const id = searchParams.get('id')

    const [pos, setPos] = useState(() => getCornerPos('bl', CIRCLE, CIRCLE))
    const posRef  = useRef(pos)
    const openRef = useRef(open)
    const drag = useRef({ active: false, moved: false, ox: 0, oy: 0, sx: 0, sy: 0 })
    const containerRef = useRef(null)

    useEffect(() => { posRef.current = pos }, [pos])
    useEffect(() => { openRef.current = open }, [open])

    const snapTo = useCallback((x, y, w, h) => {
        const corner = detectCorner(x + w / 2, y + h / 2)
        const target = getCornerPos(corner, w, h)
        setSnapping(true)
        setPos(target)
        posRef.current = target
        setTimeout(() => setSnapping(false), 380)
    }, [])

    const handleToggle = useCallback(() => {
        if (drag.current.moved) return
        const nextOpen = !openRef.current
        if (!mounted && nextOpen) setMounted(true)
        setOpen(nextOpen)
        openRef.current = nextOpen
        const nw = nextOpen ? PANEL_W : CIRCLE
        const nh = nextOpen ? PANEL_H : CIRCLE
        const { x, y } = posRef.current
        const corner = detectCorner(x + (nextOpen ? CIRCLE : PANEL_W) / 2, y + (nextOpen ? CIRCLE : PANEL_H) / 2)
        const target = getCornerPos(corner, nw, nh)
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
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.current.moved = true
            if (!drag.current.moved) return
            const w = openRef.current ? PANEL_W : CIRCLE
            const h = openRef.current ? PANEL_H : CIRCLE
            const newPos = {
                x: clamp(drag.current.sx + dx, 0, window.innerWidth  - w),
                y: clamp(drag.current.sy + dy, 0, window.innerHeight - h),
            }
            setPos(newPos)
            posRef.current = newPos
        }

        const onUp = () => {
            if (!drag.current.active) return
            drag.current.active = false
            if (drag.current.moved) {
                const w = openRef.current ? PANEL_W : CIRCLE
                const h = openRef.current ? PANEL_H : CIRCLE
                snapTo(posRef.current.x, posRef.current.y, w, h)
            }
        }

        const onResize = () => {
            const w = openRef.current ? PANEL_W : CIRCLE
            const h = openRef.current ? PANEL_H : CIRCLE
            snapTo(posRef.current.x, posRef.current.y, w, h)
        }

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('resize', onResize)
        return () => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
            window.removeEventListener('resize', onResize)
        }
    }, [snapTo])

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

    if (!id) return null

    return (
        <div
            ref={containerRef}
            className={`chat-morph${open ? ' chat-morph--open' : ' chat-morph--closed'}${snapping ? ' chat-morph--snapping' : ''}`}
            style={{ left: pos.x, top: pos.y }}
            onPointerDown={onPointerDown}
        >
            <div className="chat-morph-btn" onClick={handleToggle}>
                <span className="chat-morph-star">✦</span>
            </div>

            {mounted && (
                <div className="chat-morph-panel">
                    <Lia id={id} onMinimize={handleToggle} />
                </div>
            )}
        </div>
    )
}
