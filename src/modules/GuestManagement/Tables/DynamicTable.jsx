import React, { useEffect, useRef, useState } from 'react'
import './dynamic-table.css'
import { Tooltip } from 'antd';
import { supabase } from '../../../lib/supabase';

export const DynamicTable = ({
    onSelectedTable, setOnSelectedTable, table, setTables, onMoving,
    setSelectedTable, onEditPosition, setOnViewTable, occupiedChairs,
    onGrab
}) => {
    const [chairs, setChairs] = useState([]);
    const [mapPosition, setMapPosition] = useState({
        x: table.x,
        y: table.y
    }); // Se mantiene fija la posición inicial
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePosition, setLastMousePosition] = useState({
        x: table.x,
        y: table.y
    });


    const mapContainerRef = useRef(null);

    useEffect(() => {

        // console.log('occuppied: ', occupiedChairs)
        const containerSize = 200;
        const tableSize = 50;
        const radius = (containerSize / 2) - (tableSize / 2) - 8;
        const centerX = containerSize / 2;
        const centerY = containerSize / 2;

        const newChairs = Array.from({ length: table.size }, (_, i) => {
            const angle = (i * (360 / table.size)) * (Math.PI / 180);
            return {
                id: i + 1,
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
                occupied: i < occupiedChairs,
            };
        });

        setChairs(newChairs);
    }, [table, occupiedChairs]);

    const startDrag = (event) => {
        if (onMoving) {
            setIsDragging(true);
            setLastMousePosition({ x: event.clientX, y: event.clientY });
        }
    };

    const drag = (event) => {
        if (isDragging) {
            const deltaX = event.clientX - lastMousePosition.x;
            const deltaY = event.clientY - lastMousePosition.y;

            setMapPosition((prevPosition) => ({
                x: prevPosition.x + deltaX,
                y: prevPosition.y + deltaY,
            }));

            setLastMousePosition({ x: event.clientX, y: event.clientY });
        }
    };

   

    const selectTable = () => {
        setSelectedTable(table)
        setOnViewTable(true)
        setOnSelectedTable(onSelectedTable === table.id ? null : table.id)
    }

    const stopDrag = () => {
        if (isDragging) updateChanges()
        setIsDragging(false);
        
    };

    const updateChanges = async () => {
        const { error: removeError } = await supabase
            .from("tables")
            .update({ x: mapPosition.x, y:mapPosition.y })
            .eq("id", table.id);

        if (removeError) {
            console.error("Error moviendo mesa de lugar:", removeError.message);
        }
    }

    useEffect(() => {
        setTables((prevTables) =>
            prevTables?.map((tab) =>
                tab.id === table.id ? { ...tab, position: mapPosition } : tab
            )
        );
    }, [mapPosition, table, setTables]);

    useEffect(() => {
        setMapPosition({
            x: table.x,
            y: table.y
        });
    }, [table]);

    return (
        <Tooltip color={'var(--brand-color-500)'} placement="topRight" title={(!onMoving && !onGrab) && (table.name ? table.name : 'Sin nombre asignado')}>
            <div
                onClick={!onGrab ? (onEditPosition ? () => setOnSelectedTable(!onMoving ? onSelectedTable === table.id ? null : table.id : null) : selectTable) : () => {}}
                onMouseDown={startDrag}
                onMouseMove={drag}
                onMouseUp={stopDrag}
                onMouseLeave={stopDrag}  
                ref={mapContainerRef}
                style={{
                    top: `${mapPosition.y}px`,
                    left: `${mapPosition.x}px`,
                    cursor: onMoving ? 'grab' : 'pointer',
                    transform: 'scale(0.7)'
                }}
                className="dynamic-container">
                <div className={`container ${onMoving && 'moving-container'}`}  >
                    <div
                        className={`table ${onMoving && 'moving-table'}`}
                        style={{
                            backgroundColor: onSelectedTable === table.id ? 'var(--brand-color-100)' : table.size === occupiedChairs ? 'var(--sc-color)' : 'var(--brand-color-300)',
                            border: onSelectedTable === table.id && '2px solid var(--brand-color-500)',

                        }}
                    >
                        #{table.number}
                    </div>
                    {chairs.map((chair) => (
                        <div
                            key={chair.id}
                            className={`chair ${chair.occupied ? "occupied" : "available"} ${onMoving && 'moving-table'}`}
                            style={{
                                left: `${chair.x}px`,
                                top: `${chair.y}px`,
                                backgroundColor: onSelectedTable === table.id && 'var(--brand-color-100)',
                                border: onSelectedTable === table.id && '2px solid var(--brand-color-500)',
                            }}
                        >
                            {chair.id}
                        </div>
                    ))}
                </div>
            </div>
        </Tooltip>

    );
};