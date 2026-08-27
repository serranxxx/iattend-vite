import React, { useEffect, useMemo, useRef, useState } from 'react'
import './organization-table.css'
import { Button, Checkbox, Drawer, Dropdown, Input, InputNumber, Progress, Select, Slider, Tooltip, message } from 'antd'
import { BsArrowsMove, BsSliders } from 'react-icons/bs'
import { IoClose } from 'react-icons/io5'
import { FaAngleDoubleRight, FaList, FaMinus, FaPlus } from 'react-icons/fa'
import { DynamicTable } from './DynamicTable'
import { TablesList } from './TablesList'
import { LayoutElement } from './LayoutElement'
import { GuestPanel } from './GuestPanel'
import { TablePanel } from './TablePanel'
import {
    clampToCanvas,
    findFreeSpot,
    fitsWithoutOverlap,
    getTableFootprint,
    rectOfElement,
    rectOfTable,
} from './seatingGeometry'
import { AutoLayoutModal } from './AutoLayoutModal'
import { AddGuestsPicker } from './AddGuestsPicker'
import { Onboarding } from './Onboarding'
import { buildLayout, suggestLayout } from './autoLayout'
import { useTableHistory } from './useTableHistory'
import { AddMenu, ProgressStrip } from './SeatingChrome'
import chrome from './SeatingChrome.module.css'
import { supabase } from '../../../lib/supabase'
import { PiHandGrabbing } from 'react-icons/pi'
import { TbLocation } from 'react-icons/tb'
import { IoMdAdd, IoMdHelp } from 'react-icons/io'
import { LuShuffle } from 'react-icons/lu'
import { RiDeleteBack2Line } from 'react-icons/ri'
import { AlignEndHorizontal, AlignEndVertical, AlignHorizontalJustifyCenter, AlignStartHorizontal, AlignStartVertical, AlignVerticalJustifyCenter, ChevronDown, Circle, Crosshair, LayoutGrid, List, MoveHorizontal, MoveVertical, PartyPopper, Plus, RectangleHorizontal, Redo2, Square, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const CANVAS_WIDTH = 3500
const CANVAS_HEIGHT = 3500
const WORK_CANVAS_SIZE = 3500
// Zoom al que "Centrar" devuelve la vista: entra el salón completo.
const CENTER_ZOOM = 0.45
// La isla de alineación queda oculta mientras se afina la alineación.
const SHOW_ALIGN_ISLAND = false
// Píxeles de tablero que el paneo siempre deja dentro del visor.
const PAN_KEEP_VISIBLE = 220
// Zoom al que se aterriza sobre un elemento recién creado.
const NEW_ELEMENT_ZOOM = 0.6
const CONFIRMED_STATES = ['confirmado', 'asistente']

// Isla de alineación (aparece con 2+ mesas seleccionadas), como la de Figma.
const ALIGN_ACTIONS = [
    { edge: 'left', title: 'Alinear a la izquierda', Icon: AlignStartVertical },
    { edge: 'centerX', title: 'Centrar en horizontal', Icon: AlignHorizontalJustifyCenter },
    { edge: 'right', title: 'Alinear a la derecha', Icon: AlignEndVertical },
    { edge: 'top', title: 'Alinear arriba', Icon: AlignStartHorizontal },
    { edge: 'centerY', title: 'Centrar en vertical', Icon: AlignVerticalJustifyCenter },
    { edge: 'bottom', title: 'Alinear abajo', Icon: AlignEndHorizontal },
]

// Convención de color de sillas: ocupado = lila relleno, libre = contorno.
const LEGEND_DOT = { width: '8px', height: '8px', borderRadius: '99px', boxSizing: 'border-box', flexShrink: 0 }
const LEGEND_DOT_FREE = { backgroundColor: 'transparent', border: '1px solid var(--borders)' }

// Sillas por defecto al crear desde "+ Agregar", dentro del rango de cada forma.
const DEFAULT_SEATS = { round: 10, square: 12, rectangle: 14 }
const SHAPE_MAX_SEATS = { round: 12, square: 16, rectangle: 18 }
const SHAPE_NAMES = { round: 'redonda', square: 'cuadrada', rectangle: 'rectangular' }

// Footprint por defecto de cada elemento del salón, en coordenadas de canvas.
const ELEMENT_DEFAULTS = {
    entrance: { label: 'Entrada', width: 220, height: 70 },
    restroom: { label: 'Baños', width: 180, height: 160 },
    bar: { label: 'Barra', width: 300, height: 70 },
    dj: { label: 'DJ o grupo', width: 240, height: 120 },
}
const COLUMN_STEP = 140
const ROW_STEP = 220
const ROW_START_X = 100

const getNextPosition = (latestTable, shape) => {
    if (!latestTable) return clampToCanvas(1484, 546, shape)

    const { width } = getTableFootprint(shape)
    let nextX = latestTable.x + COLUMN_STEP
    let nextY = latestTable.y

    if (nextX + width > CANVAS_WIDTH) {
        nextX = ROW_START_X
        nextY = latestTable.y + ROW_STEP
    }

    return clampToCanvas(nextX, nextY, shape)
}

export const TablesPage = ({ invitationID, onClose }) => {
    const { t } = useTranslation()

    const [checkedChairs, setCheckedChairs] = useState({});
    const [currentFilter, setCurrentFilter] = useState('all')
    const [onFilter, setOnFilter] = useState(false)
    const [onAddingGuests, setOnAddingGuests] = useState(false)
    const [onModal, setOnModal] = useState(false)
    const [aboutMyGuest] = useState(null)
    const [, setOnExtendedWhos] = useState(false)
    const [onMoving] = useState(false)
    const [onEditPosition] = useState(false)
    const [zoomLevel, setZoomLevel] = useState(0.7 );
    const [mapPosition, setMapPosition] = useState({ x: -1300, y: -600 });
    const [isDragging, setIsDragging] = useState(false);
    const lastCanvasMouseRef = useRef({ x: 0, y: 0 });
    const [newShape] = useState('round')
    const [newVertical] = useState(false)
    const [totalChairs, setTotalChairs] = useState(10)
    const [ocuppiedChairs, setOcuppiedChairs] = useState([])
    const [tablesName, setTablesName] = useState(null)
    const [onGuestList, setOnGuestList] = useState(true)
    const [onSelectedTable, setOnSelectedTable] = useState(false)
    const [selectedTable, setSelectedTable] = useState(null)
    const [onViewTable, setOnViewTable] = useState(false)
    const [availableSeats, setAvailableSeats] = useState(null)
    const [, setCurrentGuest] = useState(null)
    const [, setOnTransfer] = useState(false)
    const [onGrab, setOnGrab] = useState(false)
    const [mobileList, setMobileList] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 750)
    const [transferSheet, setTransferSheet] = useState(null)
    // 'guests' solo existe en móvil: ahí la lista de confirmados es la tercera
    // pestaña en vez de la columna derecha, que no cabe.
    const [leftView, setLeftView] = useState('map') // 'map' | 'list' | 'guests'
    const [sortBy, setSortBy] = useState('number')  // 'number' | 'emptiest' | 'space'
    const [addMenuOpen, setAddMenuOpen] = useState(false)
    const [layoutElements, setLayoutElements] = useState([])
    const [autoLayoutOpen, setAutoLayoutOpen] = useState(false)
    const [addGuestsFor, setAddGuestsFor] = useState(null)
    // "Empezar en blanco" descarta el onboarding sin crear nada.
    const [onboardingSkipped, setOnboardingSkipped] = useState(false)
    const [pendingCenter, setPendingCenter] = useState(null)
    // Selección múltiple (marquee o Shift/Cmd-clic): habilita alinear y mover
    // en grupo.
    const [selectedIds, setSelectedIds] = useState(() => new Set())
    const [groupOffset, setGroupOffset] = useState(null)
    // Rectángulo de selección en px del visor, como el cuadro azul de Figma.
    const [marquee, setMarquee] = useState(null)
    const workAreaRef = useRef(null)
    const tablesRef = useRef([])

    const [tables_, setTables_] = useState(null)
    const [confirmedGuests_, setconfirmedGuests_] = useState(null)
    const [filterByName, setFilterByName] = useState(null)
    const zoomStep = 0.01;
    const minZoom = 0.2;
    const maxZoom = 1.8;
    const mapContainerRef = useRef(null);
    // Sin ninguna mesa creada, el panel izquierdo muestra el onboarding.
    // Se declara aquí arriba porque varios efectos dependen de él.
    const showOnboarding =
        tables_ !== null &&
        tables_.filter(t => t.shape !== 'dance').length === 0 &&
        !onboardingSkipped

    // Topes del paneo: basta con que siga viéndose un trozo del tablero.
    //
    // Antes se exigía que el tablero CUBRIERA el visor, y cuando el tablero
    // escalado era más chico que el visor (zoom bajo con el panel de invitados
    // colapsado) el rango salía negativo: el mapa quedaba pegado a la derecha
    // y no se podía recorrer a la izquierda.
    const clampPan = (x, y) => {
        const container = mapContainerRef.current
        if (!container) return { x, y }

        const zoom = zoomRef.current
        const half = WORK_CANVAS_SIZE / 2
        const scaledHalf = half * zoom
        const viewW = container.clientWidth
        const viewH = container.clientHeight

        // Trozo de tablero que siempre queda dentro del visor.
        const keepX = Math.min(PAN_KEEP_VISIBLE, scaledHalf * 2)
        const keepY = Math.min(PAN_KEEP_VISIBLE, scaledHalf * 2)

        // borde derecho del tablero >= keep  y  borde izquierdo <= viewW - keep
        const minX = keepX - half - scaledHalf
        const maxX = viewW - keepX - half + scaledHalf
        const minY = keepY - half - scaledHalf
        const maxY = viewH - keepY - half + scaledHalf

        return {
            x: Math.min(Math.max(x, minX), maxX),
            y: Math.min(Math.max(y, minY), maxY),
        }
    }

    const zoomRef = useRef(zoomLevel)
    zoomRef.current = zoomLevel
    const [modalPosition, setModalPosition] = useState({ x: 36, y: 36 })
    const [isModalDragging, setIsModalDragging] = useState(false)
    const lastModalMouseRef = useRef({ x: 0, y: 0 })

    const backgroundColors = [
        "#FFD1DC", // Rosa pastel
        "#FFECB3", // Amarillo pastel
        "#B3E5FC", // Azul pastel
        "#C8E6C9", // Verde pastel
        "#E1BEE7", // Lila pastel
        "#FFCCBC", // Melocotón pastel
        "#D1C4E9", // Lavanda pastel
        "#F8BBD0", // Rosa claro pastel
        "#DCEDC8", // Verde menta pastel
        "#FFF9C4"  // Crema pastel
    ];

    useEffect(() => { tablesRef.current = tables_ ?? [] }, [tables_])

    // Ciclo de vida del marquee: se dibuja en px del visor y selecciona en
    // vivo todo lo que toca, convirtiendo sus esquinas a coordenadas de canvas.
    useEffect(() => {
        if (!marquee) return

        const toCanvas = (clientX, clientY) => {
            const wr = workAreaRef.current?.getBoundingClientRect()
            const zoom = zoomRef.current
            if (!wr) return { x: 0, y: 0 }
            return { x: (clientX - wr.left) / zoom, y: (clientY - wr.top) / zoom }
        }

        const onMove = (event) => {
            const rect = mapContainerRef.current?.getBoundingClientRect()
            if (!rect) return
            const x2 = event.clientX - rect.left
            const y2 = event.clientY - rect.top

            setMarquee(prev => prev && { ...prev, x2, y2 })

            // Selección en vivo: rectángulo del marquee en canvas vs caja
            // visual de cada mesa.
            const a = toCanvas(rect.left + Math.min(marquee.x1, x2), rect.top + Math.min(marquee.y1, y2))
            const b = toCanvas(rect.left + Math.max(marquee.x1, x2), rect.top + Math.max(marquee.y1, y2))
            const hits = new Set(
                tablesRef.current
                    .filter(t => t.shape !== 'dance')
                    .filter(t => {
                        const r = rectOfTable(t)
                        return r.left < b.x && r.right > a.x && r.top < b.y && r.bottom > a.y
                    })
                    .map(t => t.id)
            )
            setSelectedIds(hits)
        }

        const onUp = () => {
            document.body.classList.remove('seating-dragging')
            setMarquee(prev => {
                // Un clic seco (sin arrastre real) limpia la selección.
                if (prev && Math.abs(prev.x2 - prev.x1) < 4 && Math.abs(prev.y2 - prev.y1) < 4) {
                    setSelectedIds(new Set())
                }
                return null
            })
        }

        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
        return () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
        }
    }, [marquee])

    // Escape limpia la selección; Cmd/Ctrl+Z deshace y con Shift rehace.
    // historyRef se llena más abajo, después de declarar el hook: leerlo aquí
    // directamente sería una TDZ.
    const historyRef = useRef(null)
    useEffect(() => {
        const isTyping = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
        const onKey = (e) => {
            if (e.key === 'Escape') { clearSelection(); return }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !isTyping(e.target)) {
                e.preventDefault()
                const h = historyRef.current
                if (e.shiftKey) { if (h.canRedo && !h.busy) h.redo(tablesRef.current) }
                else if (h.canUndo && !h.busy) h.undo(tablesRef.current)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    const startDrag = (event) => {
        if (onMoving) return
        if (event.touches?.length === 2) return // pinch zoom, manejado por su propio listener
        const isTouch = !!event.touches
        if (!isTouch && !onGrab) {
            // Sin la mano activa, arrastrar sobre el fondo dibuja el cuadro de
            // selección, como en Figma. Las mesas frenan el evento con
            // stopPropagation; los controles que flotan sobre el mapa (isla de
            // alineación, zoom, mano, deshacer) hay que excluirlos aquí, o su
            // propio clic dispara un marquee de 0px que borra la selección
            // antes de que el botón reciba el click.
            if (event.button !== 0) return
            if (event.target.closest('.align-island, .tools-map-menu-container, .selected-table-hover-container, button, input, .ant-slider')) return
            const rect = mapContainerRef.current?.getBoundingClientRect()
            if (!rect) return
            const x = event.clientX - rect.left
            const y = event.clientY - rect.top
            setMarquee({ x1: x, y1: y, x2: x, y2: y })
            document.body.classList.add('seating-dragging')
            return
        }
        const pos = isTouch ? event.touches[0] : event
        lastCanvasMouseRef.current = { x: pos.clientX, y: pos.clientY }
        setIsDragging(true)
    }

    useEffect(() => {
        if (!isDragging) return

        const onMove = (event) => {
            if (event.cancelable) event.preventDefault()
            const pos = event.touches ? event.touches[0] : event
            const deltaX = pos.clientX - lastCanvasMouseRef.current.x
            const deltaY = pos.clientY - lastCanvasMouseRef.current.y
            lastCanvasMouseRef.current = { x: pos.clientX, y: pos.clientY }
            setMapPosition((prev) => clampPan(prev.x + deltaX, prev.y + deltaY))
        }

        const onStop = () => setIsDragging(false)

        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onStop)
        document.addEventListener('touchmove', onMove, { passive: false })
        document.addEventListener('touchend', onStop)

        return () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onStop)
            document.removeEventListener('touchmove', onMove)
            document.removeEventListener('touchend', onStop)
        }
    }, [isDragging]);

    // `shape` llega del menú "+ Agregar"; si no viene, se usa el del modal viejo.
    const addNewTable = async (shape) => {

        const tableShape = typeof shape === 'string' ? shape : newShape
        const tableSize = typeof shape === 'string' ? DEFAULT_SEATS[shape] : totalChairs
        const tableName = typeof shape === 'string' ? null : tablesName

        let newTable = {}

        const sortedTables = Array.isArray(tables_)
            ? [...tables_].sort((a, b) => Number(a.number) - Number(b.number))
            : [];

        const lastTable = sortedTables[sortedTables.length - 1];

        if (lastTable) {


            const { data: latestTable, error: tableError } = await supabase
                .from("tables")
                .select("*")
                .eq("invitation_id", invitationID)
                .eq("id", lastTable.id)
                .maybeSingle();


            if (tableError) {
                // console.log(tableError)
                return
            }

            const nextPosition = getNextPosition(latestTable, tableShape)

            newTable = {
                created_at: new Date(),
                last_update_at: new Date(),
                invitation_id: invitationID,
                shape: tableShape,
                vertical: newVertical,
                name: tableName,
                number: latestTable ? Number(latestTable.number) + 1 : 1,
                size: tableSize,
                x: nextPosition.x,
                y: nextPosition.y,
            }

        }

        else {
            const nextPosition = getNextPosition(null, tableShape)

            newTable = {
                created_at: new Date(),
                last_update_at: new Date(),
                invitation_id: invitationID,
                shape: tableShape,
                name: tableName,
                number: 1,
                size: tableSize,
                x: nextPosition.x,
                y: nextPosition.y,
            }
        }

        try {
            const { data, error } = await supabase
                .from("tables")
                .insert([newTable])
                .select()
                .maybeSingle()

            if (error) {
                console.error("Error al insertar:", error.message);
                return null;
            }

            // Aterrizar sobre la mesa recién creada, para no tener que buscarla.
            const created = getTableFootprint(tableShape)
            requestCenter(
                newTable.x + created.width / 2,
                newTable.y + created.height / 2
            )

            if (ocuppiedChairs && ocuppiedChairs.length > 0) {
                // OJO: asumimos que `ocuppiedChairs` es un arreglo de IDs de guests
                const guestIds = ocuppiedChairs.map(c => c.id ?? c);
                // ^ por si te llega [{id:1},{id:2}] o [1,2]

                const { error: guestsError } = await supabase
                    .from("guests")
                    .update({ table: data.id, last_action_by: 'admin' })  // o table_id si así se llama tu columna
                    .in("id", guestIds);

                if (guestsError) {
                    console.error("Error al actualizar guests:", guestsError.message);
                    // aquí decides si regresas null o solo avisas
                } else {
                    // console.log("Guests actualizados con la mesa:", data.id);

                    getTables()
                    getGuests()

                    setOnModal(false)
                    setTablesName(null)
                    setOnAddingGuests(false)
                    setOcuppiedChairs([]);
                }
            }

            else {
                getTables()
                getGuests()

                setOnModal(false)
                setTablesName(null)
                setOnAddingGuests(false)
                setOcuppiedChairs([]);
            }
        } catch (err) {

            console.error("Error inesperado:", err);
            return null;
        }


        // setOnModal(false)
        // setTablesName(null)
        // setOnAddingGuests(false)
        // setOcuppiedChairs(() => {
        //     const updatedChairs = Array.from({ length: totalChairs }, (_, i) => ({
        //         // name: null,
        //         // id: Date.now() + i, // Mantiene ID si existe, sino genera uno nuevo
        //     }));
        //     return updatedChairs;
        // });
    };

    const addDanceFloor = async () => {
        const sortedTables = Array.isArray(tables_)
            ? [...tables_].sort((a, b) => Number(a.number) - Number(b.number))
            : []
        const lastTable = sortedTables[sortedTables.length - 1]

        let x = 1484, y = 546, number = 1

        if (lastTable) {
            const { data: latestTable, error } = await supabase
                .from('tables')
                .select('*')
                .eq('invitation_id', invitationID)
                .eq('id', lastTable.id)
                .maybeSingle()
            if (error) return
            if (latestTable) {
                const nextPosition = getNextPosition(latestTable, 'dance')
                x = nextPosition.x
                y = nextPosition.y
                number = Number(latestTable.number) + 1
            }
        }

        const { error: insertError } = await supabase.from('tables').insert([{
            created_at: new Date(),
            last_update_at: new Date(),
            invitation_id: invitationID,
            shape: 'dance',
            name: 'Pista de Baile',
            number,
            size: 0,
            x,
            y,
        }])

        if (insertError) { console.error('Error al insertar pista:', insertError.message); return }

        const size = getTableFootprint('dance')
        requestCenter(x + size.width / 2, y + size.height / 2)
        getTables()
    }

    const history = useTableHistory({ onApplied: () => getTables() })
    historyRef.current = history

    // Ref para que cada mesa registre el estado previo sin re-suscribir su
    // listener de arrastre en cada render.
    const dragCommitRef = useRef(() => {})
    dragCommitRef.current = () => history.record(tables_ ?? [])

    // Una mesa soltada actualiza el estado local de inmediato; la escritura a
    // la base corre aparte en el propio hijo.
    const handleTableMoved = (tableId, x, y) => {
        setTables_(prev => prev?.map(t => (t.id === tableId ? { ...t, x, y } : t)))
    }

    const getLayoutElements = async () => {
        if (!invitationID) return
        const { data, error } = await supabase
            .from('layout_elements')
            .select('*')
            .eq('invitation_id', invitationID)

        if (error) {
            console.error('Error al obtener elementos del salón:', error.message)
            return
        }
        setLayoutElements(data ?? [])
    }

    const addLayoutElement = async (type) => {
        // La pista sigue viviendo en `tables` como shape='dance'. Migrarla a
        // layout_elements toca datos existentes y quedó pendiente de decisión,
        // así que se mantiene su ruta vieja para no duplicar el concepto.
        if (type === 'dancefloor') return addDanceFloor()

        const preset = ELEMENT_DEFAULTS[type]
        if (!preset) return

        const { error } = await supabase.from('layout_elements').insert([{
            invitation_id: invitationID,
            type,
            label: preset.label,
            x: 140,
            y: 140,
            width: preset.width,
            height: preset.height,
        }])

        if (error) {
            console.error('Error al crear elemento del salón:', error.message)
            message.error('No se pudo crear el elemento')
            return
        }

        requestCenter(140 + preset.width / 2, 140 + preset.height / 2)
        getLayoutElements()
    }

    const updateLayoutElement = async (id, patch) => {
        const { error } = await supabase
            .from('layout_elements')
            .update({ ...patch, last_update_at: new Date() })
            .eq('id', id)
        if (error) console.error('Error moviendo elemento:', error.message)
    }

    const deleteLayoutElement = async (id) => {
        const { error } = await supabase.from('layout_elements').delete().eq('id', id)
        if (error) {
            console.error('Error eliminando elemento:', error.message)
            return
        }
        getLayoutElements()
    }

    const getTables = async () => {

        // console.log('tables id: ', invitationID)
        if (invitationID) {
            const { data, error } = await supabase
                .from('tables')
                .select('*')
                .eq('invitation_id', invitationID)

            if (error) {
                console.error('Error al obtener mesas:', error)
                return
            }

            // console.log('mesas: ', data)
            setTables_(data)
        }
    }

    const getGuests = async () => {


        const { data, error } = await supabase
            .from("guests")
            .select("*")
            .eq("invitation_id", invitationID)

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {

            // console.log('guests: ', data)
            // 'asistente' es equivalente a 'confirmado': si se excluye, esos invitados
            // desaparecen del panel y no hay forma de sentarlos desde el mapa.
            setconfirmedGuests_(data.filter(c => CONFIRMED_STATES.includes(c.state)))
        }
    }

    useEffect(() => {
        getTables()
        getGuests()
        getLayoutElements()
    }, [invitationID])

    useEffect(() => {

        setOnFilter(false)
    }, [currentFilter])

    useEffect(() => {
        setOnExtendedWhos(false)
    }, [aboutMyGuest])

    // New table hooks

    useEffect(() => {
        setOnAddingGuests(false)
        if (!onModal) {
            setOcuppiedChairs([])
        }

        if (!selectedTable) {
            setTablesName(null)
        }
    }, [onModal])

    // Cada vez que se quiere agregar invitados se tiene que mostrar la lista
    useEffect(() => {
        if (onAddingGuests) {
            setAvailableSeats(totalChairs - ocuppiedChairs.length)
            setOnGuestList(true)
        }
    }, [onAddingGuests])

    useEffect(() => {
        if (onSelectedTable) {
            const currentTable = tables_.find((table) => table.id === onSelectedTable)
            setSelectedTable(currentTable)
        }
    }, [onSelectedTable])

    useEffect(() => {
        if (selectedTable) {
            setOcuppiedChairs(confirmedGuests_.filter(g => g.table === selectedTable.id))
        }
    }, [selectedTable])


    useEffect(() => {

        if (selectedTable) {
            // setAvailableSeats(selectedTable.totalChairs - countOccupied(ocuppiedChairs))
            // console.log('A ->')
            setAvailableSeats(tables_.find(tbl => tbl.id === selectedTable.id)?.size - ocuppiedChairs.length)
        } else {
            // console.log('B ->')
            // console.log('total charis', totalChairs)
            // console.log('occupied chairs size', ocuppiedChairs.length)
            setAvailableSeats(totalChairs - ocuppiedChairs.length)
        }


    }, [ocuppiedChairs])


    useEffect(() => {
        if (totalChairs >= ocuppiedChairs.length) {
            // console.log('-')
        }
        else {
            setTotalChairs(totalChairs + 1)
            message.warning(t('tables.warning_occupied_seats'))
        }

    }, [totalChairs]);

    useEffect(() => {
        if (onViewTable) {
            setOnModal(true)
            setModalPosition({ x: 36, y: 36 })
        }
    }, [onViewTable])

    useEffect(() => {
        if (!isModalDragging) return
        const onMove = (e) => {
            const pos = e.touches ? e.touches[0] : e
            const dx = pos.clientX - lastModalMouseRef.current.x
            const dy = pos.clientY - lastModalMouseRef.current.y
            lastModalMouseRef.current = { x: pos.clientX, y: pos.clientY }
            setModalPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }))
        }
        const onStop = () => setIsModalDragging(false)
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onStop)
        document.addEventListener('touchmove', onMove, { passive: false })
        document.addEventListener('touchend', onStop)
        return () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onStop)
            document.removeEventListener('touchmove', onMove)
            document.removeEventListener('touchend', onStop)
        }
    }, [isModalDragging])



    const updateChair = (guest, e) => {


        if (!selectedTable) {
            setCheckedChairs(prev => ({
                ...prev,
                [guest.name]: e.target.checked
            }));
        }

        setOcuppiedChairs((prevChairs) => {
            const guestExists = prevChairs.some(chair => chair.id === guest.id);

            // Si existe, lo quitamos por completo del arreglo
            if (guestExists) {
                return prevChairs.filter(chair => chair.id !== guest.id);
            }

            // Si no existe, lo agregamos al final
            return [...prevChairs, guest];
        });

        setFilterByName("")

    };

    const onClosingModal = () => {
        setAddGuestsFor(null)
        setOnModal(false)
        setOnViewTable(false)
        setSelectedTable(null)
        setOnSelectedTable(null)
        setOnAddingGuests(false)
        setCurrentGuest(null)
        setOnTransfer(false)

    }

    /* ── Selección múltiple y arrastre en grupo ────────────────────────── */

    const toggleSelect = (tableId) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(tableId)) next.delete(tableId)
            else next.add(tableId)
            return next
        })
    }

    const clearSelection = () => {
        setSelectedIds(new Set())
        setGroupOffset(null)
    }

    // Al arrastrar cualquier mesa seleccionada, TODAS siguen el mismo delta.
    // El delta es visual (groupOffset); las posiciones reales se escriben al
    // soltar, de una sola vez.
    const groupDragStart = () => {
        history.record(tables_ ?? [])
    }

    const groupDragMove = (delta) => {
        setGroupOffset({ x: delta.x, y: delta.y })
    }

    const groupDragEnd = async () => {
        const offset = groupOffset
        if (!offset || (offset.x === 0 && offset.y === 0)) {
            setGroupOffset(null)
            return
        }

        const moving = (tables_ ?? []).filter(t => selectedIds.has(t.id))
        const updates = moving.map(t => {
            const p = clampToCanvas(t.x + offset.x, t.y + offset.y, t.shape, t.vertical)
            return { id: t.id, x: Math.round(p.x), y: Math.round(p.y) }
        })

        // El estado optimista y el offset se sueltan en el MISMO tick: si el
        // offset cae primero, las mesas brincan a su posición vieja y luego
        // se deslizan a la nueva — el "movimiento tardío" que desajustaba.
        const write = applyPositions(updates)
        setGroupOffset(null)
        await write
    }

    // Alinea SOLO la selección contra un borde común, como Figma. Los bordes
    // son los de la caja VISUAL (la que se ve), no los del footprint guardado:
    // en una rectangular vertical difieren y generaban huecos sin sentido.
    const alignSelection = async (edge) => {
        const all = tables_ ?? []
        const moving = all.filter(t => selectedIds.has(t.id) && !t.locked)
        if (moving.length < 2) return

        const horizontal = edge === 'left' || edge === 'right' || edge === 'centerX'
        const edgeOf = (t) => {
            const r = rectOfTable(t)
            switch (edge) {
                case 'left': return r.left
                case 'right': return r.right
                case 'top': return r.top
                case 'bottom': return r.bottom
                case 'centerX': return (r.left + r.right) / 2
                default: return (r.top + r.bottom) / 2
            }
        }

        const values = moving.map(edgeOf)
        let target
        if (edge === 'left' || edge === 'top') target = Math.min(...values)
        else if (edge === 'right' || edge === 'bottom') target = Math.max(...values)
        else target = values.reduce((a, v) => a + v, 0) / values.length

        const aligned = moving.map(t => {
            const delta = target - edgeOf(t)
            const p = horizontal
                ? clampToCanvas(t.x + delta, t.y, t.shape, t.vertical)
                : clampToCanvas(t.x, t.y + delta, t.shape, t.vertical)
            return { ...t, x: p.x, y: p.y }
        })

        const updates = aligned
            .map(t => ({ id: t.id, x: Math.round(t.x), y: Math.round(t.y) }))
            .filter(u => {
                const orig = moving.find(m => m.id === u.id)
                return Math.round(orig.x) !== u.x || Math.round(orig.y) !== u.y
            })

        if (!updates.length) return

        history.record(all)
        await applyPositions(updates)
    }

    /* ── Reacomodo del mapa ────────────────────────────────────────────── */

    // Escribe posiciones nuevas conservando el `id` de cada mesa: nunca
    // DELETE + INSERT, o los invitados quedarían apuntando a mesas que ya no
    // existen.
    const applyPositions = async (updates) => {
        if (!updates.length) return true

        // Primero el estado local, después la escritura. El refetch remontaba
        // las mesas (van con key por índice y Supabase no garantiza el orden),
        // y ese remontaje era el parpadeo al alinear.
        setTables_(prev => prev?.map(t => {
            const u = updates.find(u => u.id === t.id)
            return u ? { ...t, x: u.x, y: u.y } : t
        }))

        const results = await Promise.all(updates.map(u =>
            supabase.from('tables')
                .update({ x: u.x, y: u.y, last_update_at: new Date() })
                .eq('id', u.id)
        ))
        const failed = results.find(r => r.error)
        if (failed) {
            console.error('Error reacomodando mesas:', failed.error.message)
            message.error('No se pudieron mover todas las mesas')
            await getTables()
            return false
        }
        return true
    }

    const applyAutoLayout = async (layoutKey) => {
        const all = tables_ ?? []
        const movable = all.filter(t => !t.locked && t.shape !== 'dance')
        const dance = all.find(t => t.shape === 'dance')

        const result = buildLayout(layoutKey, movable, dance)
        const updates = [...result.tables]
        if (result.dance && dance && !dance.locked) {
            updates.push({ id: dance.id, x: result.dance.x, y: result.dance.y })
        }

        setAutoLayoutOpen(false)
        history.record(all)
        const ok = await applyPositions(updates)
        if (!ok) return

        // La pista queda al centro del tablero: llevar la vista ahí.
        requestCenter(WORK_CANVAS_SIZE / 2, WORK_CANVAS_SIZE / 2, CENTER_ZOOM)

        const locked = all.filter(t => t.locked).length
        message.success(
            `Mapa reacomodado.` +
            (locked ? ` ${locked} ${locked === 1 ? 'mesa bloqueada se quedó' : 'mesas bloqueadas se quedaron'} en su lugar.` : '')
        )
        if (result.unplaced > 0) {
            message.warning(`${result.unplaced} mesas no cupieron en este acomodo y no se movieron.`)
        }
    }

    /* ── Acciones del panel de mesa (§5.4) ─────────────────────────────── */

    const patchTable = async (tableId, patch) => {
        const { error } = await supabase
            .from('tables')
            .update({ ...patch, last_update_at: new Date() })
            .eq('id', tableId)

        if (error) {
            console.error('Error al actualizar mesa:', error.message)
            message.error('No se pudo actualizar la mesa')
            return false
        }
        await getTables()
        return true
    }

    const renameTable = (table, name) => patchTable(table.id, { name })

    const toggleTableLock = async (table) => {
        const ok = await patchTable(table.id, { locked: !table.locked })
        if (ok) setSelectedTable(prev => prev && { ...prev, locked: !table.locked })
    }

    const changeTableSize = async (table, size) => {
        const ok = await patchTable(table.id, { size })
        if (ok) setSelectedTable(prev => prev && { ...prev, size })
    }

    // Cambiar de forma puede agrandar el footprint (redonda 200 → rectangular
    // 400) e invadir a la vecina. Si el nuevo tamaño no cabe donde está, se
    // reubica en el primer hueco libre en vez de dejar el layout encimado.
    const changeTableShape = async (table, shape) => {
        if (shape === table.shape) return

        const maxSeats = SHAPE_MAX_SEATS[shape] ?? 12
        const seated = confirmedGuests_?.filter(g => g.table === table.id).length ?? 0
        const size = Math.min(table.size ?? 0, maxSeats)

        if (size < seated) {
            message.warning(
                `Una mesa ${SHAPE_NAMES[shape]} admite ${maxSeats} lugares y aquí hay ${seated} invitados. Saca a ${seated - maxSeats} antes de cambiar la forma.`
            )
            return
        }

        const obstacles = [
            ...(tables_ ?? []).filter(t => t.id !== table.id).map(t => rectOfTable(t)),
            ...layoutElements.map(rectOfElement),
        ]

        const vertical = shape === 'rectangle' ? !!table.vertical : false
        const candidate = { ...table, shape, vertical }
        let { x, y } = table
        let moved = false

        if (!fitsWithoutOverlap(rectOfTable(candidate, { x, y }), obstacles)) {
            const spot = findFreeSpot(candidate, obstacles)
            if (!spot) {
                message.error('No hay espacio en el mapa para esa forma. Mueve o quita alguna mesa primero.')
                return
            }
            x = spot.x
            y = spot.y
            moved = true
        }

        const ok = await patchTable(table.id, { shape, size, x, y, vertical })
        if (!ok) return

        setSelectedTable(prev => prev && { ...prev, shape, size, x, y, vertical })
        if (moved) message.info(`La mesa #${table.number} se movió: en su lugar anterior no cabía.`)
    }

    const toggleTableVertical = async (table) => {
        const vertical = !table.vertical

        const obstacles = [
            ...(tables_ ?? []).filter(t => t.id !== table.id).map(t => rectOfTable(t)),
            ...layoutElements.map(rectOfElement),
        ]

        const candidate = { ...table, vertical }
        let { x, y } = table
        let moved = false

        if (!fitsWithoutOverlap(rectOfTable(candidate, { x, y }), obstacles)) {
            const spot = findFreeSpot(candidate, obstacles)
            if (!spot) {
                message.error('No hay espacio para girar la mesa. Mueve o quita alguna mesa primero.')
                return
            }
            x = spot.x
            y = spot.y
            moved = true
        }

        const ok = await patchTable(table.id, { vertical, x, y })
        if (!ok) return

        setSelectedTable(prev => prev && { ...prev, vertical, x, y })
        if (moved) message.info(`La mesa #${table.number} se movió: girada no cabía donde estaba.`)
    }

    const removeGuestFromTable = async (guest) => {
        const { error } = await supabase
            .from('guests')
            .update({ table: null, last_action_by: 'admin' })
            .eq('id', guest.id)

        if (error) {
            console.error('Error quitando de la mesa:', error.message)
            message.error('No se pudo quitar de la mesa')
            return
        }
        message.success(`${guest.name} quedó sin mesa`)
        getGuests()
    }

    const moveAllGuests = async (table, target) => {
        const ids = (confirmedGuests_ ?? []).filter(g => g.table === table.id).map(g => g.id)
        if (!ids.length) return

        const { error } = await supabase
            .from('guests')
            .update({ table: target.id, last_action_by: 'admin' })
            .in('id', ids)

        if (error) {
            console.error('Error moviendo invitados:', error.message)
            message.error('No se pudo mover a los invitados')
            return
        }
        message.success(`${ids.length} invitados se movieron a la mesa #${target.number}`)
        getGuests()
    }

    const emptyTable = async (table) => {
        const ids = (confirmedGuests_ ?? []).filter(g => g.table === table.id).map(g => g.id)
        if (!ids.length) return

        const { error } = await supabase
            .from('guests')
            .update({ table: null, last_action_by: 'admin' })
            .in('id', ids)

        if (error) {
            console.error('Error vaciando la mesa:', error.message)
            message.error('No se pudo vaciar la mesa')
            return
        }
        message.success(`La mesa #${table.number} quedó vacía`)
        getGuests()
    }

    // Sentar a varios invitados de una vez en la misma mesa.
    const assignGuestsToTable = async (guests, table) => {
        const ids = (guests ?? []).map(g => g.id)
        if (!ids.length) return

        const { error } = await supabase
            .from('guests')
            .update({
                table: table.id,
                last_update_date: new Date().toISOString(),
                last_action_by: 'admin',
            })
            .in('id', ids)

        if (error) {
            console.error('Error asignando mesa:', error.message)
            message.error('No se pudieron asignar los invitados')
            return
        }

        message.success(
            ids.length === 1
                ? `${guests[0].name} quedó en la mesa #${table.number}`
                : `${ids.length} invitados quedaron en la mesa #${table.number}`
        )
        getTables()
        getGuests()
    }

    // Asignación desde el panel de invitados: sirve tanto para sentar a alguien
    // sin mesa como para moverlo de una mesa a otra.
    const assignGuestToTable = async (guest, table) => {
        const { error } = await supabase
            .from('guests')
            .update({
                table: table.id,
                last_update_date: new Date().toISOString(),
                last_action_by: 'admin',
            })
            .eq('id', guest.id)

        if (error) {
            console.error('Error asignando mesa:', error.message)
            message.error('No se pudo asignar la mesa')
            return
        }

        message.success(`${guest.name} quedó en la mesa #${table.number}`)
        getTables()
        getGuests()
    }

    const transferGuest = async (table, guest) => {

        try {
            const {  error } = await supabase
                .from("guests")
                .update({
                    table: table.id,
                    last_update_date: new Date().toISOString(),
                    last_action_by: 'admin',
                })
                .eq("id", guest.id)
                .select()
                .maybeSingle();

            if (error) {
                console.error("Error transfiriendo guest:", error.message);
                return null;
            }

            // console.log("Guest transferido ✅", data);
            getTables()
            getGuests()
            setOcuppiedChairs(prev =>
                prev.filter(g => g.id !== guest.id)
            );

        } catch (err) {
            console.error("Error inesperado:", err);
            return null;
        }

    };

    const deleteTableAndAdjust = async (tableId) => {
        try {
            // 1) Traer guests que están en esa mesa
            const { data: guestsInTable, error: guestsError } = await supabase
                .from("guests")
                .select("id")
                .eq("table", tableId);

            if (guestsError) {
                console.error("Error obteniendo guests de la mesa:", guestsError.message);
                return null;
            }

            const guestIds = guestsInTable.map(g => g.id);

            // 2) Quitarles la mesa (si hay)
            if (guestIds.length) {
                const { error: removeError } = await supabase
                    .from("guests")
                    .update({ table: null, last_action_by: 'admin'  })
                    .in("id", guestIds);

                if (removeError) {
                    console.error("Error quitando mesa a guests:", removeError.message);
                    return null;
                }
            }

            // 3) Eliminar la mesa
            const { error: tableError } = await supabase
                .from("tables")
                .delete()
                .eq("id", tableId);

            if (tableError) {
                console.error("Error eliminando mesa:", tableError.message);
                return null;
            }

            // console.log("Mesa eliminada ✅ y guests liberados ✅");
            getTables()
            getGuests()
            onClosingModal()
            return true;

        } catch (err) {
            console.error("Error inesperado:", err);
            return null;
        }


    };



    useEffect(() => {
        const isTypingTarget = (target) => {
            if (!target) return false;
            const tag = target.tagName;
            return (
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                target.isContentEditable
            );
        };

        const handleKeyDown = (e) => {
            if (e.code !== "Space") return;
            if (isTypingTarget(e.target)) return; // ✅ deja escribir espacios

            e.preventDefault(); // evita scroll
            if (!e.repeat) setOnGrab(true);
        };

        const handleKeyUp = (e) => {
            if (e.code !== "Space") return;
            if (isTypingTarget(e.target)) return;

            e.preventDefault();
            setOnGrab(false);
        };

        if (!onMoving) {
            window.addEventListener("keydown", handleKeyDown);
            window.addEventListener("keyup", handleKeyUp);
        }

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [onMoving, setOnGrab]);

    useEffect(() => {
        const container = mapContainerRef.current
        if (!container) return

        const handleWheel = (e) => {
            e.preventDefault()
            if (e.ctrlKey) {
                // deltaMode 0 = pixels (trackpad), 1 = lines (rueda de ratón)
                const delta = e.deltaY * (e.deltaMode === 1 ? -0.1 : -0.003)
                setZoomLevel(prev => Math.min(Math.max(prev + delta, minZoom), maxZoom))
                return
            }
            // Sin Ctrl, el scroll panea el tablero, como en Figma: sin esto el
            // trackpad no movía nada y el mapa se sentía atorado.
            setMapPosition(prev => clampPan(prev.x - e.deltaX, prev.y - e.deltaY))
        }

        container.addEventListener('wheel', handleWheel, { passive: false })
        return () => container.removeEventListener('wheel', handleWheel)
    }, [minZoom, maxZoom, showOnboarding, leftView])

    useEffect(() => {
        const isTypingTarget = (target) => {
            if (!target) return false
            const tag = target.tagName
            return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
        }

        const handleZoomKeys = (e) => {
            if ((!e.ctrlKey && !e.metaKey) || isTypingTarget(e.target)) return
            if (e.key === '+' || e.key === '=') {
                e.preventDefault()
                setZoomLevel(prev => Math.min(prev + 0.1, maxZoom))
            } else if (e.key === '-') {
                e.preventDefault()
                setZoomLevel(prev => Math.max(prev - 0.1, minZoom))
            }
        }

        window.addEventListener('keydown', handleZoomKeys)
        return () => window.removeEventListener('keydown', handleZoomKeys)
    }, [minZoom, maxZoom])

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 750)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const zoomLevelRef = useRef(zoomLevel)
    useEffect(() => { zoomLevelRef.current = zoomLevel }, [zoomLevel])

    useEffect(() => {
        const container = mapContainerRef.current
        if (!container) return

        let startDist = null
        let startZoom = null

        const onTouchStart = (e) => {
            if (e.touches.length !== 2) return
            startDist = Math.hypot(
                e.touches[1].clientX - e.touches[0].clientX,
                e.touches[1].clientY - e.touches[0].clientY
            )
            startZoom = zoomLevelRef.current
        }

        const onTouchMove = (e) => {
            if (e.touches.length !== 2 || startDist === null) return
            if (e.cancelable) e.preventDefault()
            const dist = Math.hypot(
                e.touches[1].clientX - e.touches[0].clientX,
                e.touches[1].clientY - e.touches[0].clientY
            )
            setZoomLevel(Math.min(Math.max(startZoom * (dist / startDist), minZoom), maxZoom))
        }

        const onTouchEnd = (e) => {
            if (e.touches.length < 2) { startDist = null; startZoom = null }
        }

        container.addEventListener('touchstart', onTouchStart, { passive: true })
        container.addEventListener('touchmove', onTouchMove, { passive: false })
        container.addEventListener('touchend', onTouchEnd, { passive: true })

        return () => {
            container.removeEventListener('touchstart', onTouchStart)
            container.removeEventListener('touchmove', onTouchMove)
            container.removeEventListener('touchend', onTouchEnd)
        }
    }, [minZoom, maxZoom, showOnboarding, leftView])

    const groupColorMap = useMemo(() => {
        const map = new Map();
        let colorIndex = 0;

        confirmedGuests_?.forEach(g => {
            const isLeader = g.has_companion && g.companion_id == null;
            const isCompanion = g.companion_id != null;

            const groupId = isLeader ? String(g.id) : isCompanion ? String(g.companion_id) : null;
            if (!groupId) return;

            if (!map.has(groupId)) {
                map.set(groupId, colorIndex % backgroundColors.length);
                colorIndex++;
            }
        });

        return map;
    }, [confirmedGuests_, backgroundColors.length]);

    const normalizeId = (id) =>
        id == null ? null : String(id);

    const getGroupId = (g) => {
        if (g.has_companion && g.companion_id == null) return normalizeId(g.id);        // líder
        if (g.companion_id != null) return normalizeId(g.companion_id);                 // acompañante
        return null;                                                       // solo
    };

    const getGroupColor = (g) => {
        const groupId = getGroupId(g);
        if (!groupId) return null;
        const idx = groupColorMap.get(groupId);
        return backgroundColors[idx];
    };

    const filteredGuests = useMemo(() => {
        return confirmedGuests_
            ?.filter(c => {
                if (currentFilter === "alone") return !c.has_companion && !c.companion_id;
                if (currentFilter === "compained") return c.companion_id || c.has_companion;
                if (currentFilter === "non-assigned") return !c.table;
                return true;
            })
            ?.filter(c => {
                if (!filterByName) return true;

                const name = c.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
                const search = filterByName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

                return name.includes(search);
            }) ?? [];
    }, [confirmedGuests_, currentFilter, filterByName]);

    const guestsSorted = useMemo(() => {
        if (currentFilter !== "compained") return filteredGuests;

        const leaders = filteredGuests.filter(
            g => g.has_companion && g.companion_id == null
        );

        const companions = filteredGuests.filter(
            g => g.companion_id != null
        );

        const solos = filteredGuests.filter(
            g => !g.has_companion && g.companion_id == null
        );

        const companionsByLeader = companions.reduce((acc, g) => {
            (acc[g.companion_id] ||= []).push(g);
            return acc;
        }, {});

        const result = [];

        leaders.forEach(l => {
            result.push(l);
            if (companionsByLeader[l.id]) {
                result.push(...companionsByLeader[l.id]);
            }
        });

        return [...result, ...solos];
    }, [filteredGuests, currentFilter]);

    useEffect(() => {

        console.log(selectedTable)
    }, [selectedTable])

    // Lleva la vista sobre un punto del tablero. Se difiere al efecto de
    // arriba para cubrir el caso de que el mapa no esté montado todavía.
    const requestCenter = (focusX, focusY, zoom = NEW_ELEMENT_ZOOM) => {
        setLeftView('map')
        setPendingCenter({ focusX, focusY, zoom })
    }

    // Al abrir la pantalla, la vista arranca sobre la pista de baile.
    const didInitialCenter = useRef(false)
    useEffect(() => {
        if (didInitialCenter.current || !tables_?.length) return
        didInitialCenter.current = true
        const focus = centerFocus()
        setPendingCenter({ focusX: focus.x, focusY: focus.y, zoom: CENTER_ZOOM })
    }, [tables_])

    // Aplica el centrado pendiente en cuanto el mapa está montado y visible:
    // al crear algo desde el onboarding o desde la lista, el canvas todavía no
    // existe cuando se pide el centrado.
    useEffect(() => {
        if (!pendingCenter || showOnboarding || leftView !== 'map') return
        const container = mapContainerRef.current
        if (!container) return

        const { focusX, focusY, zoom } = pendingCenter
        const half = WORK_CANVAS_SIZE / 2
        setZoomLevel(zoom)
        setMapPosition({
            x: container.clientWidth / 2 - half - (focusX - half) * zoom,
            y: container.clientHeight / 2 - half - (focusY - half) * zoom,
        })
        setPendingCenter(null)
    }, [pendingCenter, showOnboarding, leftView])

    // Alimenta la franja de avance. La pista de baile no es una mesa: no
    // aporta capacidad y no cuenta para "N mesas".
    const seatingStats = useMemo(() => {
        const realTables = (tables_ ?? []).filter(t => t.shape !== 'dance')
        const totalConfirmed = confirmedGuests_?.length ?? 0
        const seated = confirmedGuests_?.filter(g => g.table).length ?? 0
        const capacity = realTables.reduce((sum, t) => sum + (t.size ?? 0), 0)

        return {
            totalConfirmed,
            seated,
            unseated: totalConfirmed - seated,
            capacity,
            tableCount: realTables.length,
            // Lo que va a sobrar aunque se siente todo el mundo.
            surplus: Math.max(capacity - totalConfirmed, 0),
        }
    }, [tables_, confirmedGuests_])

    // Cuántos grupos de acompañantes siguen sin mesa. Sentarlos no es lo mismo
    // que sentar N personas sueltas: hay que dejarles lugares contiguos, y esa
    // es la advertencia que da la barra de móvil.
    const unseatedGroups = useMemo(() => {
        const groups = new Map()
        ;(confirmedGuests_ ?? [])
            .filter(g => !g.table)
            .forEach(g => {
                const key = String(g.companion_id ?? g.id)
                groups.set(key, (groups.get(key) ?? 0) + 1)
            })
        return [...groups.values()].filter(n => n > 1).length
    }, [confirmedGuests_])

    // "Centrar": vuelve al zoom base con la pista de baile en medio del
    // visor. Se centra sobre el centroide de lo que hay dibujado y no sobre el
    // centro geométrico del canvas — las mesas viven en la mitad superior de
    // los 3500px, así que el centro geométrico deja la vista en zona vacía.
    // Punto que "Centrar" toma como ancla: la pista si existe, y si no el
    // centro de todo lo dibujado.
    const centerFocus = () => {
        const dance = (tables_ ?? []).find(t => t.shape === 'dance')
        if (dance) {
            const size = getTableFootprint('dance')
            return { x: dance.x + size.width / 2, y: dance.y + size.height / 2 }
        }
        const boxes = [
            ...(tables_ ?? []).map(tbl => ({ ...getTableFootprint(tbl.shape), x: tbl.x, y: tbl.y })),
            ...layoutElements.map(el => ({ width: el.width, height: el.height, x: el.x, y: el.y })),
        ]
        if (!boxes.length) return { x: WORK_CANVAS_SIZE / 2, y: WORK_CANVAS_SIZE / 2 }
        return {
            x: (Math.min(...boxes.map(b => b.x)) + Math.max(...boxes.map(b => b.x + b.width))) / 2,
            y: (Math.min(...boxes.map(b => b.y)) + Math.max(...boxes.map(b => b.y + b.height))) / 2,
        }
    }

    const centerMap = () => {
        const focus = centerFocus()
        requestCenter(focus.x, focus.y, CENTER_ZOOM)
    }

    return (
        <div className="table-organization-main-container">
            {/* El título, el CTA y la franja de avance cruzan todo el drawer:
                describen el evento entero, no solo la columna del mapa. */}
            <div className='seating-topbar'>
                <div className='tab-map-header-cont'>
                    {/* En móvil el cierre vive aquí, junto al título corto: el
                        drawer ya no dibuja su propia barra. */}
                    {isMobile && (
                        <Button
                            icon={<IoClose size={17} />}
                            onClick={onClose}
                            className={chrome.closeButton}
                            aria-label='Cerrar' />
                    )}

                    <span className='table-org-section-header'>
                        {isMobile ? 'Mesas' : t('tables.title')}
                    </span>

                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px'
                    }}>

                        <Button
                            icon={<FaAngleDoubleRight size={12} style={{
                                transform: !onGuestList && 'rotate(180deg)',
                                marginTop: '3px'
                            }} />}
                            style={{ borderRadius: '99px' }}
                            onClick={() => setOnGuestList(!onGuestList)} className={`button-web primarybutton--${onGuestList ? 'black' : 'active'}`}>
                        </Button>

                        <Dropdown
                            trigger={['click']}
                            placement='bottomRight'
                            disabled={showOnboarding}
                            open={addMenuOpen}
                            onOpenChange={setAddMenuOpen}
                            popupRender={() => (
                                <AddMenu
                                    onAddTable={(shape) => { setAddMenuOpen(false); addNewTable(shape) }}
                                    onAddElement={(type) => { setAddMenuOpen(false); addLayoutElement(type) }}
                                    onAutoLayout={isMobile ? () => { setAddMenuOpen(false); setAutoLayoutOpen(true) } : undefined}
                                />
                            )}
                        >
                            <Button
                                icon={<Plus size={isMobile ? 20 : 16} style={{ marginTop: '3px' }} />}
                                className={`${chrome.addButton} ${isMobile ? chrome.addButtonRound : ''}`}
                                aria-disabled={showOnboarding}
                                aria-label={isMobile ? 'Agregar' : undefined}
                                style={{ opacity: showOnboarding ? 0.4 : 1 }}>
                                {!isMobile && 'Agregar'}
                            </Button>
                        </Dropdown>

                    </div>
                </div>

                {!showOnboarding && (
                    <ProgressStrip
                        seated={seatingStats.seated}
                        totalConfirmed={seatingStats.totalConfirmed}
                        unseated={seatingStats.unseated}
                        surplus={seatingStats.surplus}
                        tableCount={seatingStats.tableCount}
                        onReview={() => setLeftView('list')}
                    />
                )}
            </div>

            <div className='table-org-general-container'>
                <div className='table-map-container'>
                    {/* El panel derecho no cambia entre vistas; lo que alterna es este lado.
                        El mapa contesta "¿cómo se ve mi salón?", la lista "¿quién está dónde". */}
                    {!showOnboarding && (
                    <div className={chrome.switchRow}>
                        <div className='view-switch'>
                            <button
                                type='button'
                                className={`view-switch-option ${leftView === 'map' ? 'view-switch-active' : ''}`}
                                onClick={() => setLeftView('map')}>
                                Mapa
                            </button>
                            <button
                                type='button'
                                className={`view-switch-option ${leftView === 'list' ? 'view-switch-active' : ''}`}
                                onClick={() => setLeftView('list')}>
                                {isMobile ? 'Mesas' : 'Lista de mesas'}
                            </button>
                            {/* Tercera pestaña solo en móvil: sustituye a la
                                columna derecha de confirmados, que no cabe. */}
                            {isMobile && (
                                <button
                                    type='button'
                                    className={`view-switch-option ${leftView === 'guests' ? 'view-switch-active' : ''}`}
                                    onClick={() => setLeftView('guests')}>
                                    Invitados
                                    {seatingStats.unseated > 0 && (
                                        <span className='view-switch-badge'>{seatingStats.unseated}</span>
                                    )}
                                </button>
                            )}
                        </div>

                        <div className={chrome.switchRight}>
                            {/* En móvil el mapa se maneja con los controles que
                                flotan sobre el propio lienzo; esta fila solo
                                lleva los criterios de orden de la lista. */}
                            {leftView === 'map' ? (!isMobile && (
                                <>

                                    <Tooltip title='Reacomoda todas las mesas con uno de los tres arreglos'>
                                        <Button
                                            icon={<LayoutGrid size={15} style={{ marginTop: '3px' }} />}
                                            style={{ borderRadius: '99px' }}
                                            className='primarybutton'
                                            onClick={() => setAutoLayoutOpen(true)}>
                                            Auto acomodo
                                        </Button>
                                    </Tooltip>

                                    <Tooltip title='Vuelve al centro del mapa con el zoom original'>
                                        <Button
                                            icon={<Crosshair size={15} style={{ marginTop: '3px' }} />}
                                            style={{ borderRadius: '99px' }}
                                            className='primarybutton'
                                            onClick={centerMap}>
                                            Centrar
                                        </Button>
                                    </Tooltip>
                                </>
                            )) : leftView === 'list' ? (
                                <>
                                    <Button
                                        style={{ borderRadius: '99px' }}
                                        className={sortBy === 'number' ? 'primarybutton--active' : 'primarybutton'}
                                        onClick={() => setSortBy('number')}>
                                        Orden: número
                                    </Button>
                                    <Button
                                        style={{ borderRadius: '99px' }}
                                        className={sortBy === 'emptiest' ? 'primarybutton--active' : 'primarybutton'}
                                        onClick={() => setSortBy('emptiest')}>
                                        {isMobile ? 'Más vacías' : 'Más vacías primero'}
                                    </Button>
                                    <Button
                                        style={{ borderRadius: '99px' }}
                                        className={sortBy === 'space' ? 'primarybutton--active' : 'primarybutton'}
                                        onClick={() => setSortBy('space')}>
                                        Con espacio
                                    </Button>
                                </>
                            ) : null}
                        </div>
                    </div>
                    )}

                    {showOnboarding ? (
                        <Onboarding
                            invitationID={invitationID}
                            onSkip={() => setOnboardingSkipped(true)}
                            onCreated={async () => {
                                await getTables()
                                // El mapa todavía no está montado (el onboarding
                                // lo reemplaza): el centrado corre en cuanto
                                // exista, vía el efecto de pendingCenter.
                                requestCenter(WORK_CANVAS_SIZE / 2, WORK_CANVAS_SIZE / 2, CENTER_ZOOM)
                            }}
                        />
                    ) : leftView === 'guests' ? (
                        <div className='mobile-guests-tab'>
                            <GuestPanel
                                guests={confirmedGuests_ ?? []}
                                tables={tables_ ?? []}
                                onAssign={assignGuestToTable}
                            />
                        </div>
                    ) : leftView === 'list' ? (
                        <TablesList
                            tables={tables_ ?? []}
                            guests={confirmedGuests_ ?? []}
                            sortBy={sortBy}
                            onRefresh={() => { getTables(); getGuests(); }}
                            onOpenTable={(table) => {
                                setLeftView('map')
                                setSelectedTable(table)
                                setOnSelectedTable(table.id)
                                setOnViewTable(true)
                            }}
                        />
                    ) : (
                    <div
                        onMouseDown={startDrag}
                        onTouchStart={startDrag}
                        ref={mapContainerRef}
                        style={{ cursor: isDragging ? 'grabbing' : onGrab ? 'grab' : undefined }}
                        className={`org-map-container ${onMoving ? 'org-map-rule' : ''}`}>
                        <div
                            ref={workAreaRef}
                            className='org-map-work-container'
                            style={{
                                top: `${mapPosition.y}px`,
                                left: `${mapPosition.x}px`,
                                transform: `scale(${zoomLevel})`,
                            }}>

                            <div style={{
                                width: '100%',
                                height: '100%', position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {
                                    layoutElements.map((element) => (
                                        <LayoutElement
                                            key={`el-${element.id}`}
                                            element={element}
                                            zoomLevel={zoomLevel}
                                            onMove={updateLayoutElement}
                                            onDelete={deleteLayoutElement}
                                        />
                                    ))
                                }

                                {
                                    tables_?.map((table, index) => (

                                        <DynamicTable
                                            shape={table?.shape}
                                            vertical={table?.vertical}
                                            key={index} table={table} occupiedChairs={confirmedGuests_?.filter(g => g.table === table.id).length}
                                            onEditPosition={onEditPosition} setSelectedTable={setSelectedTable}
                                            setOnSelectedTable={setOnSelectedTable} onSelectedTable={onSelectedTable} setOnViewTable={setOnViewTable}
                                            tables={tables_} onMoving={onMoving} onGrab={onGrab} zoomLevel={zoomLevel} onDelete={deleteTableAndAdjust}
                                            layoutElements={layoutElements}
                                            onDragCommit={dragCommitRef.current}
                                            onMoved={handleTableMoved}
                                            isMultiSelected={selectedIds.has(table.id)}
                                            groupOffset={groupOffset}
                                            onGroupDragStart={groupDragStart}
                                            onGroupDragMove={groupDragMove}
                                            onGroupDragEnd={groupDragEnd}
                                            onToggleSelect={toggleSelect}
                                            isRepeated={tables_.filter(t => Number(t.number) === Number(table.number)).length > 1} />
                                    ))
                                }

                            </div>

                        </div>

                        {SHOW_ALIGN_ISLAND && selectedIds.size >= 2 && (
                            <div className='align-island'>
                                {ALIGN_ACTIONS.map((action, i) => (
                                    <React.Fragment key={action.edge}>
                                        {i === 3 && <span className='align-island-divider' />}
                                        <Tooltip title={action.title} placement='bottom'>
                                            <button
                                                type='button'
                                                className='align-island-btn'
                                                onClick={() => alignSelection(action.edge)}
                                            >
                                                {React.createElement(action.Icon, { size: 17 })}
                                            </button>
                                        </Tooltip>
                                    </React.Fragment>
                                ))}
                            </div>
                        )}

                        {marquee && (
                            <div
                                className='marquee-box'
                                style={{
                                    left: `${Math.min(marquee.x1, marquee.x2)}px`,
                                    top: `${Math.min(marquee.y1, marquee.y2)}px`,
                                    width: `${Math.abs(marquee.x2 - marquee.x1)}px`,
                                    height: `${Math.abs(marquee.y2 - marquee.y1)}px`,
                                }}
                            />
                        )}

                        <div className='tools-map-menu-container'>


                            <div className='slider-container' style={{ width: '0px', padding: '14px' }}>
                                <FaPlus size={12} />
                                <Slider
                                    vertical
                                    min={minZoom}
                                    max={maxZoom}
                                    step={zoomStep}
                                    onChange={(e) => setZoomLevel(e)}
                                    value={zoomLevel}
                                />
                                <FaMinus size={12} />
                            </div>

                            {/* En móvil el slider vertical no se puede arrastrar
                                con el pulgar sin mover el mapa: el zoom pasa a
                                dos botones, como en el diseño. */}
                            {isMobile && (
                                <div className='map-tool-group'>
                                    <Button
                                        className='full-screen-button'
                                        aria-label='Acercar'
                                        onClick={() => setZoomLevel(z => Math.min(maxZoom, +(z + zoomStep).toFixed(2)))}
                                        icon={<FaPlus size={13} />} />
                                    <Button
                                        className='full-screen-button'
                                        aria-label='Alejar'
                                        onClick={() => setZoomLevel(z => Math.max(minZoom, +(z - zoomStep).toFixed(2)))}
                                        icon={<FaMinus size={13} />} />
                                    <Button
                                        className='full-screen-button'
                                        aria-label='Centrar'
                                        onClick={centerMap}
                                        icon={<Crosshair size={16} />} />
                                </div>
                            )}

                            <Tooltip
                                title={t('tables.tooltip_space_move')}
                                placement="left"
                            >
                                <Button
                                    disabled={onMoving}
                                    className={`full-screen-button button-web ${onGrab && 'grab-active-button'}`}
                                    style={{ height: '35px', minWidth: '35px' }}
                                    onClick={() => setOnGrab(!onGrab)}
                                    id="expandedbutton" icon={<PiHandGrabbing size={18} />} />
                            </Tooltip>

                            {/* Deshacer y rehacer viven en el plano, junto al zoom
                                y la mano: son herramientas del lienzo. */}
                            <div className='map-tool-group'>
                                <Tooltip title={history.canUndo ? 'Deshacer' : 'Nada que deshacer'} placement='left'>
                                    <Button
                                        className='full-screen-button'
                                        style={{ height: '35px', minWidth: '35px' }}
                                        aria-disabled={!history.canUndo || history.busy}
                                        onClick={() => { if (history.canUndo && !history.busy) history.undo(tables_) }}
                                        icon={<Undo2 size={16} />} />
                                </Tooltip>
                                <Tooltip title={history.canRedo ? 'Rehacer' : 'Nada que rehacer'} placement='left'>
                                    <Button
                                        className='full-screen-button'
                                        style={{ height: '35px', minWidth: '35px' }}
                                        aria-disabled={!history.canRedo || history.busy}
                                        onClick={() => { if (history.canRedo && !history.busy) history.redo(tables_) }}
                                        icon={<Redo2 size={16} />} />
                                </Tooltip>
                            </div>

                        </div>


                        <div className='selected-table-hover-container'
                            style={{
                                bottom: '20px', padding: '6px', borderRadius: '99px',
                                backgroundColor: '#FFFFFF60',
                                backdropFilter: 'blur(10px)',
                                display: isMobile ? 'none' : undefined,
                            }}
                        >
                            {/* Leyenda de la convención de color, no de conteos:
                                los números viven ahora en la franja de avance. */}
                            <div className='org-single-row'>
                                <div style={{ ...LEGEND_DOT, backgroundColor: 'var(--brand-color-300)' }} />
                                <span className='single-label'>Lugar ocupado</span>
                            </div>

                            <div className='org-single-row'>
                                <div style={{ ...LEGEND_DOT, ...LEGEND_DOT_FREE }} />
                                <span className='single-label'>Lugar disponible</span>
                            </div>

                            <div className='org-single-row'>
                                <div style={{ ...LEGEND_DOT, backgroundColor: 'var(--text-color)' }} />
                                <span className='single-label'>Mesa bloqueada</span>
                            </div>

                        </div>

                        {/* Barra fija de móvil: en una pantalla donde el mapa se
                            ve por pedazos, es lo único que recuerda cuánta gente
                            queda por sentar y da el camino para hacerlo. */}
                        {isMobile && seatingStats.unseated > 0 && !onModal && addGuestsFor == null && (
                            <div className='mobile-unseated-dock'>
                                <div className='mobile-unseated-text'>
                                    <span className='mobile-unseated-title'>
                                        {seatingStats.unseated} confirmado{seatingStats.unseated === 1 ? '' : 's'} sin mesa
                                    </span>
                                    {unseatedGroups > 0 && (
                                        <span className='mobile-unseated-sub'>
                                            Incluye {unseatedGroups} grupo{unseatedGroups === 1 ? '' : 's'} que no se separan
                                        </span>
                                    )}
                                </div>
                                <button
                                    type='button'
                                    className='mobile-unseated-cta'
                                    onClick={() => setLeftView('guests')}>
                                    Sentarlos
                                </button>
                            </div>
                        )}

                    </div>
                    )}

                    <AutoLayoutModal
                        open={autoLayoutOpen}
                        tableCount={(tables_ ?? []).filter(t => t.shape !== 'dance' && !t.locked).length}
                        suggested={suggestLayout((tables_ ?? []).filter(t => t.shape !== 'dance'))}
                        onCancel={() => setAutoLayoutOpen(false)}
                        onApply={applyAutoLayout}
                    />

                    {addGuestsFor != null && (() => {
                        const target = (tables_ ?? []).find(t => t.id === addGuestsFor)
                        if (!target) return null
                        const seated = (confirmedGuests_ ?? []).filter(g => g.table === target.id)
                        const free = (confirmedGuests_ ?? []).filter(g => !g.table)
                        return (
                            <div className='add-guests-anchor'>
                                <AddGuestsPicker
                                    table={target}
                                    occupants={seated}
                                    candidates={free}
                                    onClose={() => setAddGuestsFor(null)}
                                    onAdd={(chosen) => {
                                        setAddGuestsFor(null)
                                        assignGuestsToTable(chosen, target)
                                    }}
                                />
                            </div>
                        )
                    })()}

                    {/* Panel de edición de la mesa seleccionada (§5.4). */}
                    {onModal && selectedTable && (
                        <>
                            <div onClick={onClosingModal} style={{ position: 'absolute', inset: 0, zIndex: 9998 }} />
                            <div
                                className={`table-panel-anchor ${isModalDragging ? 'table-panel-dragging' : ''}`}
                                style={{
                                    left: isMobile ? 0 : `${modalPosition.x}px`,
                                    top: isMobile ? 'auto' : `${modalPosition.y}px`,
                                    bottom: isMobile ? 0 : 'auto',
                                    right: isMobile ? 0 : 'auto',
                                }}
                            >
                                <TablePanel
                                    table={selectedTable}
                                    onDragStart={(e) => {
                                        if (isMobile) return
                                        lastModalMouseRef.current = { x: e.clientX, y: e.clientY }
                                        setIsModalDragging(true)
                                    }}
                                    guests={confirmedGuests_ ?? []}
                                    tables={tables_ ?? []}
                                    onClose={onClosingModal}
                                    onRename={renameTable}
                                    onChangeShape={changeTableShape}
                                    onToggleVertical={toggleTableVertical}
                                    onChangeSize={changeTableSize}
                                    onToggleLock={toggleTableLock}
                                    onAssignGuest={assignGuestToTable}
                                    onRequestAddGuests={(t) => setAddGuestsFor(t.id)}
                                    onRemoveGuest={removeGuestFromTable}
                                    onMoveAll={moveAllGuests}
                                    onEmpty={emptyTable}
                                    onDelete={deleteTableAndAdjust}
                                />
                            </div>
                        </>
                    )}

                    {/* Overlay de transferir invitado (solo mobile) */}
                    {isMobile && transferSheet && (
                        <div
                            onClick={() => setTransferSheet(null)}
                            style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: '#00000030' }}
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className='on-transfer-container'
                                style={{ position: 'fixed', bottom: '5%', left: '5%', width: '90%', borderRadius: '16px', maxHeight: '60vh' }}
                            >
                                <span className='on-transfer-label'>Selecciona mesa</span>
                                <div className='transfer-mesas-cont'>
                                    {tables_.map((table) => (
                                        (transferSheet.table !== table.id) && (confirmedGuests_?.filter(g => g.table === table.id).length !== table.size) && (
                                            <div key={table.id} className='table-transfer-item' onClick={() => { transferGuest(table, transferSheet); setTransferSheet(null); }}>
                                                <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>
                                                    <span>{table.name ? `#${table.number} - ${table.name}` : `Mesa #${table.number}`}</span>
                                                </div>
                                                <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <Progress style={{ flex: 1, minWidth: '70%' }} className='progress-tables' strokeColor={'var(--brand-color-500)'} status="active" showInfo={false} percent={(confirmedGuests_?.filter(g => g.table === table.id).length * 100) / table.size} />
                                                    <span className='occupied-places-tab-mob'>{confirmedGuests_?.filter(g => g.table === table.id).length} / {table.size}</span>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className={`table-list-container ${mobileList ? 'table-mobile-list-active' : ''}`} style={{
                    width: !onGuestList && '10px', paddingBottom: 0
                }}>
                    <Button
                        onClick={() => setMobileList(!mobileList)}
                        icon={<FaList size={16} />}
                        className='button-mobile confirmedlistvutton primarybutton--active'></Button>

                    {onGuestList && (
                        <GuestPanel
                            guests={confirmedGuests_ ?? []}
                            tables={tables_ ?? []}
                            onAssign={assignGuestToTable}
                        />
                    )}
                </div>


            </div>

        {isMobile && (
            <Drawer
                placement="bottom"
                open={mobileList}
                onClose={() => {
                    setMobileList(false)
                    if (onAddingGuests) setOnAddingGuests(false)
                }}
                height="85vh"
                closable={false}
                push={false}
                title={
                    <span style={{ fontSize: 15, fontWeight: 500 }}>
                        {onAddingGuests
                            ? `Agregar invitados (${ocuppiedChairs.length}/${totalChairs})`
                            : `Confirmados (${confirmedGuests_?.length ?? 0})`}
                    </span>
                }
                styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
            >
                <div className='tab-org-filter-cont' style={{ padding: '12px 20px' }}>
                    <Input
                        placeholder={'Buscar invitado'}
                        value={filterByName}
                        onChange={(e) => setFilterByName(e.target.value)}
                        className='tab-org-input' />
                    {!onAddingGuests && (
                        <Button
                            onClick={() => setOnFilter(!onFilter)}
                            icon={<BsSliders size={14} />}
                            className={!onFilter ? 'filtering-button' : 'filtering-button-active'} />
                    )}
                    {onFilter && (
                        <div className='filters-popup'>
                            <div className='filters-popup-row'>
                                <span onClick={() => setCurrentFilter('all')} className={`filter-item ${currentFilter === 'all' && 'filter-item-active'}`}>Todos</span>
                                <span onClick={() => setCurrentFilter('non-assigned')} className={`filter-item full-item-w ${currentFilter === 'non-assigned' && 'filter-item-active'}`}>Sin asignar</span>
                            </div>
                            <div className='filters-popup-row'>
                                <span onClick={() => setCurrentFilter('compained')} className={`filter-item full-item-w ${currentFilter === 'compained' && 'filter-item-active'}`}>Acompañados</span>
                                <span onClick={() => setCurrentFilter('alone')} className={`filter-item ${currentFilter === 'alone' && 'filter-item-active'}`}>Solos</span>
                            </div>
                        </div>
                    )}
                </div>

                {onAddingGuests && (
                    <div style={{ padding: '0px 20px 12px', boxSizing: 'border-box', width: '100%' }}>
                        <div className='tag-disclaimer' style={{ wordBreak: 'break-word', overflow: 'hidden', boxSizing: 'border-box' }}>
                            {availableSeats < 1
                                ? 'Tu mesa se ha llenado. No hay espacios disponibles'
                                : confirmedGuests_?.filter(g => g.table === null).length < 1
                                    ? 'No hay invitados disponibles para asignar'
                                    : 'Solo puedes agregar invitados que no hayan sido previamente asignados en otra mesa'}
                        </div>
                    </div>
                )}

                {onAddingGuests && (
                    <div className='modal-content-sect' style={{ padding: '0px 20px 12px', flexWrap: 'nowrap', overflow: 'hidden' }}>
                        <Progress
                            size={[240, 15]}
                            style={{ flex: '0 0 auto' }}
                            strokeColor={'var(--brand-color-500)'}
                            showInfo={false}
                            status="active"
                            percent={((ocuppiedChairs.length ?? 0) * 100) / totalChairs} />
                        <span className='on-transfer-label'>{ocuppiedChairs.length ?? 0} / {totalChairs}</span>
                    </div>
                )}

                <div className='org-guests-table-container' style={{ flex: 1, overflow: 'auto', maxHeight: 'none' }}>
                    {onAddingGuests
                        ? confirmedGuests_
                            ?.filter(c => !selectedTable ? c.table === null : !ocuppiedChairs.includes(c))
                            ?.filter(c => {
                                if (!filterByName) return true
                                const name = c.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
                                const search = filterByName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
                                return name.includes(search)
                            })
                            .map((guest, index) => (
                                <div key={index} className='org-tab-item'>
                                    <div className="org-single-row">
                                        {!selectedTable && checkedChairs && (
                                            <Checkbox
                                                onChange={(e) => updateChair(guest, e)}
                                                disabled={!availableSeats >= 1 && !checkedChairs[guest.name]} />
                                        )}
                                        <span className='org-tab-name'>{guest.name}</span>
                                    </div>
                                    <div className="org-single-row">
                                        {availableSeats >= 1 && selectedTable && (
                                            <Button
                                                style={{ fontWeight: 600 }}
                                                icon={<IoMdAdd size={16} style={{ marginTop: '2px' }} />}
                                                className='orgtabbutton'
                                                onClick={() => updateChair(guest)}>Agregar</Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        : guestsSorted.map((guest, index) => (
                            <div key={index} className='org-tab-item' style={{
                                backgroundColor: currentFilter === 'compained' && getGroupColor(guest) ? `${getGroupColor(guest)}40` : undefined,
                                borderBottom: currentFilter === 'compained' && getGroupColor(guest) ? '1px solid var(--ft-color)' : undefined,
                            }}>
                                <span className='org-tab-name'>{guest.name}</span>
                                <div className="org-single-row">
                                    <div className={`org-place-tag ${!guest.table && 'non-assigned-tag'}`} style={{
                                        backgroundColor: !guest.table ? 'var(--ft-color)' : currentFilter === 'compained' && getGroupColor(guest) ? getGroupColor(guest) : undefined,
                                        border: guest.table ? '1px solid var(--borders)' : currentFilter === 'compained' && getGroupColor(guest) ? `1px solid ${getGroupColor(guest)}99` : undefined,
                                        fontWeight: guest.table && 500,
                                    }}>
                                        {guest.table ? `Mesa #${tables_?.find(t => t.id === guest.table)?.number ?? '-'}` : 'Sin mesa'}
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </Drawer>
        )}

        </div>

    )
}
