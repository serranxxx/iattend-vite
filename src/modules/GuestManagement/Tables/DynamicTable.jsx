import React, { useEffect, useRef, useState } from 'react'
import './dynamic-table.css'
import { Tooltip } from 'antd'
import { supabase } from '../../../lib/supabase'

export const DynamicTable = ({
    onSelectedTable,
    setOnSelectedTable,
    table,
    setTables,
    onMoving,
    setSelectedTable,
    onEditPosition,
    setOnViewTable,
    occupiedChairs,
    onGrab,
    vertical = false,
    shape = 'rectangle', // 'round' | 'square' | 'rectangle'
}) => {
    const [chairs, setChairs] = useState([])
    const [mapPosition, setMapPosition] = useState({
        x: table.x,
        y: table.y
    })
    const [isDragging, setIsDragging] = useState(false)
    const [lastMousePosition, setLastMousePosition] = useState({
        x: table.x,
        y: table.y
    })

    const mapContainerRef = useRef(null)

    useEffect(() => {
        const containerWidth =
            shape === 'rectangle' ? 400 : 200

        const containerHeight =
            shape === 'rectangle' ? 200 : 200

        const centerX = containerWidth / 2
        const centerY = containerHeight / 2

        const buildRoundChairs = () => {
            const tableSize = 72
            const radius = (containerWidth / 1.7) - (tableSize / 2) - 8

            return Array.from({ length: table.size }, (_, i) => {
                const angle = (i * (360 / table.size)) * (Math.PI / 180)

                return {
                    id: i + 1,
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle),
                    occupied: i < occupiedChairs,
                }
            })
        }

        const buildSquareChairs = () => {
            const chairs = []
            const total = table.size

            const distribution = new Array(4).fill(Math.floor(total / 4))
            for (let i = 0; i < total % 4; i++) {
                distribution[i]++
            }

            const padding = 24
            let chairIndex = 0

            const [topCount, rightCount, bottomCount, leftCount] = distribution

            for (let i = 0; i < topCount; i++) {
                const step = (containerWidth - padding * 2) / (topCount + 1)
                chairs.push({
                    id: chairIndex + 1,
                    x: padding + step * (i + 1),
                    y: padding,
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            for (let i = 0; i < rightCount; i++) {
                const step = (containerHeight - padding * 2) / (rightCount + 1)
                chairs.push({
                    id: chairIndex + 1,
                    x: containerWidth - padding,
                    y: padding + step * (i + 1),
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            for (let i = 0; i < bottomCount; i++) {
                const step = (containerWidth - padding * 2) / (bottomCount + 1)
                chairs.push({
                    id: chairIndex + 1,
                    x: padding + step * (i + 1),
                    y: containerHeight - padding,
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            for (let i = 0; i < leftCount; i++) {
                const step = (containerHeight - padding * 2) / (leftCount + 1)
                chairs.push({
                    id: chairIndex + 1,
                    x: padding,
                    y: padding + step * (i + 1),
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            return chairs
        }

        const buildRectangleChairs = () => {
            const chairs = []
            const total = table.size

            const horizontalWeight = 2
            const verticalWeight = 1
            const totalWeight = (horizontalWeight * 2) + (verticalWeight * 2)

            let topCount = Math.floor((total * horizontalWeight) / totalWeight)
            let bottomCount = Math.floor((total * horizontalWeight) / totalWeight)
            let leftCount = Math.floor((total * verticalWeight) / totalWeight)
            let rightCount = Math.floor((total * verticalWeight) / totalWeight)

            let assigned = topCount + bottomCount + leftCount + rightCount
            let remaining = total - assigned

            const order = ['top', 'bottom', 'left', 'right']
            let idx = 0

            while (remaining > 0) {
                const side = order[idx % order.length]

                if (side === 'top') topCount++
                if (side === 'bottom') bottomCount++
                if (side === 'left') leftCount++
                if (side === 'right') rightCount++

                remaining--
                idx++
            }

            const rectWidth = 264
            const rectHeight = 96

            const leftX = centerX - rectWidth / 1.7
            const rightX = centerX + rectWidth / 1.7
            const topY = centerY - rectHeight / 1.7
            const bottomY = centerY + rectHeight / 1.7

            const offset = 16
            let chairIndex = 0

            for (let i = 0; i < topCount; i++) {
                const step = rectWidth / (topCount + 1)
                chairs.push({
                    id: chairIndex + 1,
                    x: leftX + step * (i + 1.5),
                    y: topY - offset,
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            for (let i = 0; i < rightCount; i++) {
                const step = rectHeight / (rightCount + 0.5)
                chairs.push({
                    id: chairIndex + 1,
                    x: rightX + offset,
                    y: topY + step * (i + 1),
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            for (let i = 0; i < bottomCount; i++) {
                const step = rectWidth / (bottomCount + 1)
                chairs.push({
                    id: chairIndex + 1,
                    x: leftX + step * (i + 1.5),
                    y: bottomY + offset,
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            for (let i = 0; i < leftCount; i++) {
                const step = rectHeight / (leftCount + 0.5)
                chairs.push({
                    id: chairIndex + 1,
                    x: leftX - offset,
                    y: topY + step * (i + 1),
                    occupied: chairIndex < occupiedChairs,
                })
                chairIndex++
            }

            return chairs
        }

        let newChairs = []

        if (shape === 'square') {
            newChairs = buildSquareChairs()
        } else if (shape === 'rectangle') {
            newChairs = buildRectangleChairs()
        } else {
            newChairs = buildRoundChairs()
        }

        setChairs(newChairs)
    }, [table, occupiedChairs, shape])

    const startDrag = (event) => {
        if (onMoving) {
            setIsDragging(true)
            setLastMousePosition({ x: event.clientX, y: event.clientY })
        }
    }

    const drag = (event) => {
        if (isDragging) {
            const deltaX = event.clientX - lastMousePosition.x
            const deltaY = event.clientY - lastMousePosition.y

            setMapPosition((prevPosition) => ({
                x: prevPosition.x + deltaX,
                y: prevPosition.y + deltaY,
            }))

            setLastMousePosition({ x: event.clientX, y: event.clientY })
        }
    }

    const selectTable = () => {
        setSelectedTable(table)
        setOnViewTable(true)
        setOnSelectedTable(onSelectedTable === table.id ? null : table.id)
    }

    const stopDrag = () => {
        if (isDragging) updateChanges()
        setIsDragging(false)
    }

    const updateChanges = async () => {
        const { error: removeError } = await supabase
            .from('tables')
            .update({ x: mapPosition.x, y: mapPosition.y })
            .eq('id', table.id)

        if (removeError) {
            console.error('Error moviendo mesa de lugar:', removeError.message)
        }
    }

    useEffect(() => {
        setTables((prevTables) =>
            prevTables?.map((tab) =>
                tab.id === table.id
                    ? { ...tab, position: mapPosition }
                    : tab
            )
        )
    }, [mapPosition, table, setTables])

    useEffect(() => {
        setMapPosition({
            x: table.x,
            y: table.y
        })
    }, [table])

    const isSelected = onSelectedTable === table.id
    const isFull = table.size === occupiedChairs

    const tableShapeClass =
        shape === 'square'
            ? 'square-table'
            : shape === 'rectangle'
                ? 'rectangle-table'
                : 'round-table'

    const containerShapeClass =
        shape === 'square'
            ? 'square-container'
            : shape === 'rectangle'
                ? 'rectangle-container'
                : 'round-container'

    return (
        <Tooltip
            color="var(--brand-color-500)"
            placement="topRight"
            title={
                (!onMoving && !onGrab) &&
                (table.name ? table.name : 'Sin nombre asignado')
            }
        >
            <div
                onClick={
                    !onGrab
                        ? (
                            onEditPosition
                                ? () =>
                                    setOnSelectedTable(
                                        !onMoving
                                            ? onSelectedTable === table.id
                                                ? null
                                                : table.id
                                            : null
                                    )
                                : selectTable
                        )
                        : () => { }
                }
                onMouseDown={startDrag}
                onMouseMove={drag}
                onMouseUp={stopDrag}
                onMouseLeave={stopDrag}
                ref={mapContainerRef}
                style={{
                    top: `${mapPosition.y}px`,
                    left: `${mapPosition.x}px`,
                    cursor: onMoving ? 'grab' : 'pointer',
                    transform: `scale(0.7) ${vertical ? 'rotate(90deg)' : ''}`
                }}
                className="dynamic-container"
            >
                <div className={`container ${containerShapeClass} ${onMoving ? 'moving-container' : ''}`}>
                    <div
                        className={`table ${tableShapeClass} ${onMoving ? 'moving-table' : ''}`}
                        style={{
                            backgroundColor: isSelected
                                ? 'var(--brand-color-100)'
                                : isFull
                                    ? 'var(--sc-color)'
                                    : 'var(--brand-color-300)',
                            border: isSelected ? '2px solid var(--brand-color-500)' : undefined,
                        }}
                    >
                        <span
                            style={{ transform: `${vertical ? 'rotate(-90deg)' : ''}` }}
                        >#{table.number}</span>
                    </div>

                    {chairs.map((chair) => (
                        <div
                            key={chair.id}
                            className={`chair ${chair.occupied ? 'occupied' : 'available'} ${onMoving ? 'moving-table' : ''}`}
                            style={{
                                left: `${chair.x}px`,
                                top: `${chair.y}px`,
                                backgroundColor: isSelected ? 'var(--brand-color-100)' : undefined,
                                border: isSelected ? '2px solid var(--brand-color-500)' : undefined,
                            }}
                        >
                            <span style={{ transform: `${vertical ? 'rotate(-90deg)' : ''}` }}>{chair.id}</span>
                        </div>
                    ))}
                </div>
            </div>
        </Tooltip>
    )
}