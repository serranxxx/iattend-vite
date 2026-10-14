import { Dropdown, Input, Select } from 'antd'
import { GripVertical, Plus, X } from 'lucide-react'
import { LuBadgeHelp } from 'react-icons/lu'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { iconsItinerary } from '../../helpers/services/menuIcons'
import ed from './SideEventEditor.module.css'

/*
  Mini itinerario de un Evento Flash (panel del editor). Bloques { id, name,
  time "HH:mm", icon (índice de iconsItinerary, el catálogo del itinerario de
  la invitación), date "YYYY-MM-DD" solo si el Flash tiene varias fechas }.

  El orden es el de la lista: se acomoda arrastrando la manija (⋮⋮) y así se
  muestra (itinerarioPorDia en helpers/assets/eventDateTime.js). La manija es
  lo único que arrastra, para que los campos se puedan usar normal.
*/

const MAX_MOMENTOS = 12

const iconoDe = (index, size = 18) => {
    const Icono = iconsItinerary.find(i => i.index === index)?.value
    return Icono ? <Icono size={size} /> : <LuBadgeHelp size={size} />
}

const Momento = ({ momento: m, dias, onCambiar, onQuitar }) => {
    const { t } = useTranslation()
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: m.id })

    return (
        <div
            ref={setNodeRef}
            className={`${ed.momento} ${isDragging ? ed.momentoArrastrando : ''}`}
            style={{ transform: CSS.Transform.toString(transform), transition }}
        >
            <button
                type='button'
                ref={setActivatorNodeRef}
                className={ed.momentoManija}
                aria-label={t('side_events.itinerary_drag')}
                {...attributes}
                {...listeners}
            >
                <GripVertical size={14} />
            </button>

            <Dropdown
                trigger={['click']}
                placement='bottomLeft'
                popupRender={() => (
                    <div className={ed.iconosGrid}>
                        {iconsItinerary.map((icono) => (
                            <button
                                type='button'
                                key={icono.index}
                                className={`${ed.iconoOpcion} ${m.icon === icono.index ? ed.iconoOpcionActivo : ''}`}
                                onClick={() => onCambiar({ icon: icono.index })}
                            >
                                <icono.value size={18} />
                            </button>
                        ))}
                    </div>
                )}
            >
                <button type='button' className={ed.momentoIcono} aria-label={t('side_events.itinerary_icon')}>
                    {iconoDe(m.icon)}
                </button>
            </Dropdown>

            <Input
                className={ed.momentoNombre}
                placeholder={t('side_events.itinerary_name')}
                value={m.name ?? ''}
                maxLength={60}
                onChange={(e) => onCambiar({ name: e.target.value })}
            />
            {/* Segundo renglón a todo lo ancho: el panel es angosto. */}
            <div className={ed.momentoFila}>
                    <input
                        type='time'
                        className={ed.momentoHora}
                        value={m.time ?? ''}
                        onChange={(e) => onCambiar({ time: e.target.value || null })}
                        aria-label={t('side_events.itinerary_time')}
                    />
                    {dias.length > 1 && (
                        <Select
                            size='small'
                            style={{ flex: 1, minWidth: 0 }}
                            value={dias.includes(m.date) ? m.date : dias[0]}
                            onChange={(valor) => onCambiar({ date: valor })}
                            options={dias.map(d => ({ value: d, label: dayjs(d).format('ddd D') }))}
                        />
                    )}
                    <button
                        type='button'
                        className={`${ed.fechaQuitar} ${ed.momentoQuitar}`}
                        aria-label={t('side_events.itinerary_remove')}
                        onClick={onQuitar}
                    >
                        <X size={14} />
                    </button>
            </div>
        </div>
    )
}

export const ItinerarioFlash = ({ itinerario, dias, onChange }) => {
    const { t } = useTranslation()
    // Un poco de recorrido antes de arrastrar: un clic en la manija no mueve nada.
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

    const cambiar = (id, patch) => onChange(itinerario.map(m => (m.id === id ? { ...m, ...patch } : m)))

    const alSoltar = ({ active, over }) => {
        if (!over || active.id === over.id) return
        const desde = itinerario.findIndex(m => m.id === active.id)
        const hasta = itinerario.findIndex(m => m.id === over.id)
        if (desde < 0 || hasta < 0) return
        onChange(arrayMove(itinerario, desde, hasta))
    }

    return (
        <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={alSoltar}>
                <SortableContext items={itinerario.map(m => m.id)} strategy={verticalListSortingStrategy}>
                    {itinerario.map(m => (
                        <Momento
                            key={m.id}
                            momento={m}
                            dias={dias}
                            onCambiar={(patch) => cambiar(m.id, patch)}
                            onQuitar={() => onChange(itinerario.filter(x => x.id !== m.id))}
                        />
                    ))}
                </SortableContext>
            </DndContext>

            {itinerario.length < MAX_MOMENTOS && (
                <button
                    type='button'
                    className={ed.fechaAgregar}
                    onClick={() => {
                        const ultimo = itinerario[itinerario.length - 1]
                        onChange([...itinerario, {
                            id: `m${Date.now()}`,
                            name: '',
                            time: null,
                            icon: null,
                            date: dias.length > 1 ? (ultimo?.date ?? dias[0]) : null,
                        }])
                    }}
                >
                    <Plus size={14} /> {t('side_events.itinerary_add')}
                </button>
            )}
        </>
    )
}
