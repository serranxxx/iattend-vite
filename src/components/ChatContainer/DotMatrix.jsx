import { useState, useEffect } from 'react'
import { happyface, notification, FACE_SURPRISED } from './dotAnimations'

const ROWS = 12
const COLS = 12
const DOT  = 6
const GAP  = 2
const CELL = DOT + GAP

const ANIMATIONS = { happyface, notification }

export const DotMatrix = ({ size = 84, mode = 'happyface', hovered = false }) => {
    const [exprIdx, setExprIdx] = useState(0)
    const [sparkle, setSparkle] = useState(-1)

    const expressions = ANIMATIONS[mode] ?? ANIMATIONS.happyface

    useEffect(() => { setExprIdx(0) }, [mode])

    useEffect(() => {
        if (hovered) return               // pausa el ciclo mientras hay hover
        const { duration } = expressions[exprIdx]
        const timer = setTimeout(() => setExprIdx(i => (i + 1) % expressions.length), duration)
        return () => clearTimeout(timer)
    }, [exprIdx, expressions, hovered])

    useEffect(() => {
        const fire = () => {
            const idx = Math.floor(Math.random() * ROWS * COLS)
            setSparkle(idx)
            setTimeout(() => setSparkle(-1), 260)
        }
        const id = setInterval(fire, 2200)
        return () => clearInterval(id)
    }, [])

    const pattern = hovered ? FACE_SURPRISED : expressions[exprIdx].pattern
    const gridW = COLS * CELL - GAP
    const gridH = ROWS * CELL - GAP
    const ox    = (size - gridW) / 2
    const oy    = (size - gridH) / 2

    return (
        <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
            {pattern.map((row, r) =>
                row.map((cell, c) => {
                    const idx     = r * COLS + c
                    const on      = cell === 1
                    const isSpark = sparkle === idx && !on
                    const active  = on || isSpark

                    return (
                        <div
                            key={`${r}-${c}`}
                            className={`dot-cell ${active ? 'dot-cell--on' : 'dot-cell--off'}`}
                            style={{
                                left:   ox + c * CELL,
                                top:    oy + r * CELL,
                                width:  DOT,
                                height: DOT,
                            }}
                        />
                    )
                })
            )}
        </div>
    )
}
