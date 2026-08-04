import { useMemo, useState } from 'react'
import { message } from 'antd'
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ProspectoCard } from './ProspectoCard'
import { ProspectoDetailDrawer } from './ProspectoDetailDrawer'
import { AsignarVendedorModal } from './AsignarVendedorModal'
import { ESTADOS } from './estados'
import { asignarVendedor, actualizarEstadoProspecto, actualizarProspecto } from './prospectosApi'
import styles from './ProspectosBoard.module.css'

function SortableCard({ prospecto, onOpen, onToggleFavorito }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: prospecto.id })
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <ProspectoCard prospecto={prospecto} onClick={() => onOpen(prospecto)} onToggleFavorito={onToggleFavorito} />
        </div>
    )
}

function Column({ estado, prospectos, onOpen, onToggleFavorito }) {
    const { setNodeRef, isOver } = useDroppable({ id: `col-${estado.key}` })
    return (
        <div className={styles.column}>
            <div className={styles.columnHeader}>
                <span className={styles.columnDot} style={{ background: estado.color }} />
                <span className={styles.columnLabel}>{estado.label}</span>
                <span className={styles.columnCount}>{prospectos.length}</span>
            </div>
            <div ref={setNodeRef} className={`${styles.columnBody}${isOver ? ' ' + styles.columnBodyOver : ''}`}>
                <SortableContext items={prospectos.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    {prospectos.map(p => <SortableCard key={p.id} prospecto={p} onOpen={onOpen} onToggleFavorito={onToggleFavorito} />)}
                    {prospectos.length === 0 && <div className={styles.columnEmpty}>Sin prospectos</div>}
                </SortableContext>
            </div>
        </div>
    )
}

export const ProspectosBoard = ({ modo, prospectos, setProspectos, vendedores }) => {
    const [detalle, setDetalle] = useState(null)
    const [asignarPendiente, setAsignarPendiente] = useState(null)
    const [pendingFinalize, setPendingFinalize] = useState(null)

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

    const columnas = useMemo(
        () => modo === 'admin' ? ESTADOS : ESTADOS.filter(e => e.key !== 'sin_asignar'),
        [modo]
    )

    const porEstado = useMemo(() => {
        const map = Object.fromEntries(columnas.map(e => [e.key, []]))
        prospectos.forEach(p => { if (map[p.estado]) map[p.estado].push(p) })
        return map
    }, [prospectos, columnas])

    const aplicarEstadoLocal = (id, estado, extra = {}) => {
        setProspectos(prev => prev.map(p => p.id === id ? { ...p, estado, ...extra } : p))
    }

    const reemplazarProspecto = (actualizado) => {
        setProspectos(prev => prev.map(p => p.id === actualizado.id ? actualizado : p))
    }

    const toggleFavorito = async (prospecto) => {
        const nuevoFavorito = !prospecto.favorito
        aplicarEstadoLocal(prospecto.id, prospecto.estado, { favorito: nuevoFavorito })
        try {
            await actualizarProspecto(prospecto.id, { favorito: nuevoFavorito })
        } catch (error) {
            console.error('Error actualizando favorito:', error.response?.data || error.message)
            message.error('No se pudo actualizar favorito')
            aplicarEstadoLocal(prospecto.id, prospecto.estado, { favorito: prospecto.favorito })
        }
    }

    const moverEstado = async (prospecto, targetEstado) => {
        const prevEstado = prospecto.estado
        aplicarEstadoLocal(prospecto.id, targetEstado)
        try {
            await actualizarEstadoProspecto(prospecto.id, targetEstado)
        } catch (error) {
            console.error('Error actualizando estado:', error.response?.data || error.message)
            message.error('No se pudo mover el prospecto')
            aplicarEstadoLocal(prospecto.id, prevEstado)
        }
    }

    const handleDragEnd = (event) => {
        const { active, over } = event
        if (!over) return

        const targetKey = String(over.id).startsWith('col-')
            ? String(over.id).slice(4)
            : prospectos.find(p => p.id === over.id)?.estado

        if (!targetKey) return

        const prospecto = prospectos.find(p => p.id === active.id)
        if (!prospecto || prospecto.estado === targetKey) return

        if (prospecto.estado === 'sin_asignar') {
            setAsignarPendiente({ prospecto, targetEstado: targetKey })
            return
        }

        if (targetKey === 'finalizado') {
            setPendingFinalize({ prospecto })
            return
        }

        moverEstado(prospecto, targetKey)
    }

    const confirmarAsignacion = async (vendedorId, notificar) => {
        if (!asignarPendiente) return
        const { targetEstado } = asignarPendiente
        const prospecto = asignarPendiente.prospecto
        try {
            const { data } = await asignarVendedor(prospecto.id, vendedorId, notificar)
            const actualizado = data.prospecto
            reemplazarProspecto(actualizado)
            if (targetEstado === 'finalizado') {
                setPendingFinalize({ prospecto: actualizado })
            } else if (targetEstado !== 'asignado') {
                await moverEstado(actualizado, targetEstado)
            }
        } catch (error) {
            console.error('Error asignando vendedor:', error.response?.data || error.message)
            message.error('No se pudo asignar el vendedor')
        } finally {
            setAsignarPendiente(null)
        }
    }

    return (
        <div className={`scroll-invitation ${styles.board}`}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {columnas.map(estado => (
                    <Column key={estado.key} estado={estado} prospectos={porEstado[estado.key] || []} onOpen={setDetalle} onToggleFavorito={toggleFavorito} />
                ))}
            </DndContext>

            <ProspectoDetailDrawer
                prospecto={pendingFinalize?.prospecto || detalle}
                pendingFinalize={!!pendingFinalize}
                modo={modo}
                vendedores={vendedores}
                onClose={() => setDetalle(null)}
                onCancelPending={() => setPendingFinalize(null)}
                onUpdated={(actualizado) => {
                    reemplazarProspecto(actualizado)
                    if (pendingFinalize) {
                        setPendingFinalize(null)
                    } else {
                        setDetalle(actualizado)
                    }
                }}
            />

            <AsignarVendedorModal
                open={!!asignarPendiente}
                vendedores={vendedores}
                onCancel={() => setAsignarPendiente(null)}
                onConfirm={confirmarAsignacion}
            />
        </div>
    )
}
