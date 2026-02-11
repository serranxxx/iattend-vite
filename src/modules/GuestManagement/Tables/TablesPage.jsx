import React, { useEffect, useMemo, useRef, useState } from 'react'
import './organization-table.css'
import { Button, Checkbox, Dropdown, Input, InputNumber, Progress, Slider, Tooltip, message } from 'antd'
import { BsArrowsMove, BsSliders } from 'react-icons/bs'
import { IoClose } from 'react-icons/io5'
import { FaAngleDoubleRight, FaList, FaMinus, FaPlus } from 'react-icons/fa'
import { DynamicTable } from './DynamicTable'
import { supabase } from '../../../lib/supabase'
import { PiHandGrabbing } from 'react-icons/pi'
import { TbLocation } from 'react-icons/tb'
import { IoMdAdd, IoMdHelp } from 'react-icons/io'
import { LuShuffle } from 'react-icons/lu'
import { RiDeleteBack2Line } from 'react-icons/ri'
import { formatDate } from '../../../helpers/assets/functions'



export const TablesPage = ({ invitationID }) => {

    const [checkedChairs, setCheckedChairs] = useState({});
    const [currentFilter, setCurrentFilter] = useState('all')
    const [onFilter, setOnFilter] = useState(false)
    const [onAddingGuests, setOnAddingGuests] = useState(false)
    const [onModal, setOnModal] = useState(false)
    const [aboutMyGuest, setAboutMyGuest] = useState(null)
    const [onExtendedWhos, setOnExtendedWhos] = useState(false)
    const [onMoving, setOnMoving] = useState(false)
    const [onEditPosition, setOnEditPosition] = useState(false)
    const [zoomLevel, setZoomLevel] = useState(0.9);
    const [mapPosition, setMapPosition] = useState({ x: -1300, y: -600 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });

    const [totalChairs, setTotalChairs] = useState(10)
    const [ocuppiedChairs, setOcuppiedChairs] = useState([])
    const [tablesName, setTablesName] = useState(null)
    const [onGuestList, setOnGuestList] = useState(true)
    const [onSelectedTable, setOnSelectedTable] = useState(false)
    const [selectedTable, setSelectedTable] = useState(null)
    const [onViewTable, setOnViewTable] = useState(false)
    const [onEditingTable, setonEditingTable] = useState(false)
    const [availableSeats, setAvailableSeats] = useState(null)
    const [currentGuest, setCurrentGuest] = useState(null)
    const [onTransfer, setOnTransfer] = useState(false)
    const [tabToMove, setTabToMove] = useState(null)
    const [onGrab, setOnGrab] = useState(false)
    const [available, setAvailable] = useState(null)
    const [taken, setTaken] = useState(null)
    const [tables, setTables] = useState()
    const [mobileList, setMobileList] = useState(false)

    const [tables_, setTables_] = useState(null)
    const [confirmedGuests_, setconfirmedGuests_] = useState(null)
    const [filterByName, setFilterByName] = useState(null)
    const [openNewTable, setOpenNewTable] = useState(false);
    const zoomStep = 0.01;
    const minZoom = 0.7;
    const maxZoom = 1.5;
    const mapContainerRef = useRef(null);

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

    const startDrag = (event) => {
        if (!onMoving && onGrab) {
            setIsDragging(true);
            setLastMousePosition({ x: event.clientX, y: event.clientY });
        }

    };

    const drag = (event) => {
        if (isDragging && !onMoving) {
            const deltaX = event.clientX - lastMousePosition.x;
            const deltaY = event.clientY - lastMousePosition.y;

            setMapPosition((prevPosition) => {
                // Definir límites
                const minX = -1550;
                const maxX = 550; // Ancho máximo del contenedor
                const minY = -1500;
                const maxY = 150; // Altura máxima del contenedor

                // Calcular nueva posición con límites
                const newX = Math.min(Math.max(prevPosition.x + deltaX, minX), maxX);
                const newY = Math.min(Math.max(prevPosition.y + deltaY, minY), maxY);

                return { x: newX, y: newY };
            });

            setLastMousePosition({ x: event.clientX, y: event.clientY });
        }
    };

    const stopDrag = () => {
        if (!onMoving) {
            setIsDragging(false);
        }

    };

    const addNewTable = async () => {

        let newTable = {}

        const sortedTables = [...tables_].sort(
            (a, b) => Number(a.number) - Number(b.number)
        );

        const lastTable = sortedTables[sortedTables.length - 1];

        if (lastTable) {

        
            const { data: latestTable, error: tableError } = await supabase
                .from("tables")
                .select("*")
                .eq("invitation_id", invitationID)
                .eq("id", lastTable.id)
                .maybeSingle();


            if (tableError) {
                console.log(tableError)
                return
            }

            newTable = {
                created_at: new Date(),
                last_update_at: new Date(),
                invitation_id: invitationID,
                name: tablesName,
                number: latestTable ? Number(latestTable.number) + 1 : 1,
                size: totalChairs,
                x: latestTable ? latestTable.x + 140 : 1484,
                y: latestTable ? latestTable.y : 546,
            }

        }

        else {
            newTable = {
                created_at: new Date(),
                last_update_at: new Date(),
                invitation_id: invitationID,
                name: tablesName,
                number: 1,
                size: totalChairs,
                x: 1484,
                y: 546,
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
            console.log(data.id)

            if (ocuppiedChairs && ocuppiedChairs.length > 0) {
                // OJO: asumimos que `ocuppiedChairs` es un arreglo de IDs de guests
                const guestIds = ocuppiedChairs.map(c => c.id ?? c);
                // ^ por si te llega [{id:1},{id:2}] o [1,2]

                const { error: guestsError } = await supabase
                    .from("guests")
                    .update({ table: data.id })  // o table_id si así se llama tu columna
                    .in("id", guestIds);

                if (guestsError) {
                    console.error("Error al actualizar guests:", guestsError.message);
                    // aquí decides si regresas null o solo avisas
                } else {
                    console.log("Guests actualizados con la mesa:", data.id);

                    setOpenNewTable(false)
                    getTables()
                    getGuests()

                    setOnModal(false)
                    setTablesName(null)
                    setOnAddingGuests(false)
                    setOcuppiedChairs([]);
                }
            }

            else {
                setOpenNewTable(false)
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

    const getTables = async () => {
        if (invitationID) {
            const { data, error } = await supabase
                .from('tables')
                .select('*')
                .eq('invitation_id', invitationID)

            if (error) {
                console.error('Error al obtener mesas:', error)
                return
            }

            console.log('mesas: ', data)
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

            console.log('guests: ', data)
            setconfirmedGuests_(data.filter(c => c.state === 'confirmado'))
        }
    }

    useEffect(() => {
        getTables()
        getGuests()
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
        let totales = 0
        let ocupados = confirmedGuests_?.filter(g => g.table).length ?? 0

        tables_?.forEach((t) => {
            totales += t.size
        })

        let disponibles = totales - ocupados

        setTaken(ocupados)
        setAvailable(disponibles)

    }, [tables_, confirmedGuests_])


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
            console.log('A ->')
            setAvailableSeats(tables_.find(t => t.id === selectedTable.id)?.size - ocuppiedChairs.length)
        } else {
            console.log('B ->')
            console.log('total charis', totalChairs)
            console.log('occupied chairs size', ocuppiedChairs.length)
            setAvailableSeats(totalChairs - ocuppiedChairs.length)
        }


        if (onTransfer && currentGuest && tabToMove) {

            setTables(prevTables => {
                const newTables = prevTables.map(t => ({
                    ...t,
                    occupiedChairs: t.occupiedChairs.map(chair => Object.keys(chair).length > 0 ? { ...chair } : {})
                }));

                const updatedGuest = { ...currentGuest, place: tabToMove.id };

                const targetTableIndex = newTables.findIndex(t => t.id === tabToMove.id);
                if (targetTableIndex !== -1) {
                    const emptyChairIndex = newTables[targetTableIndex].occupiedChairs.findIndex(chair => Object.keys(chair).length === 0);
                    if (emptyChairIndex !== -1) {
                        newTables[targetTableIndex].occupiedChairs[emptyChairIndex] = updatedGuest;
                    } else {
                        console.warn('No hay lugar vacío en la mesa destino');
                    }
                } else {
                    console.warn('Mesa destino no encontrada');
                }

                return newTables;
            });

            setOnTransfer(false)
            setCurrentGuest(null)
            setTabToMove(null)
            message.success('Transferido con éxito')
        }

    }, [ocuppiedChairs])


    useEffect(() => {
        if (totalChairs >= ocuppiedChairs.length) {
            console.log('-')
        }
        else {
            setTotalChairs(totalChairs + 1)
            message.warning("No puedes eliminar asientos ocupados")
        }

    }, [totalChairs]);

    useEffect(() => {
        setonEditingTable(false)
        if (onViewTable) {
            setOnModal(true)
        }

    }, [onViewTable])



    const updateTable = async () => {

        const updatedTable = {
            last_update_at: new Date(),
            name: tablesName,
            size: totalChairs,
        };

        try {
            // 1) Editar mesa (solo name y size)
            const { data: tableData, error: tableError } = await supabase
                .from("tables")
                .update(updatedTable)
                .eq("id", selectedTable.id)
                .select()
                .maybeSingle();

            if (tableError) {
                console.error("Error al editar mesa:", tableError.message);
                return null;
            }

            console.log("Mesa editada ✅", tableData.id);

            // 2) Guests actuales en esta mesa
            const { data: currentGuests, error: currentError } = await supabase
                .from("guests")
                .select("id")
                .eq("table", selectedTable.id);

            if (currentError) {
                console.error("Error obteniendo guests actuales:", currentError.message);
                return tableData; // la mesa sí se editó
            }

            const currentIds = currentGuests.map(g => g.id);
            const newIds = (ocuppiedChairs ?? []).map(g => g.id);

            // 3) Comparar para saber a quién quitar y a quién poner
            const toRemove = currentIds.filter(id => !newIds.includes(id));
            const toAdd = newIds.filter(id => !currentIds.includes(id));

            // 4) Quitar mesa a los que ya no van ahí
            if (toRemove.length) {
                const { error: removeError } = await supabase
                    .from("guests")
                    .update({ table: null })
                    .in("id", toRemove);

                if (removeError) {
                    console.error("Error quitando mesa a guests:", removeError.message);
                }
            }

            // 5) Asignar mesa a los nuevos
            if (toAdd.length) {
                const { error: addError } = await supabase
                    .from("guests")
                    .update({ table: selectedTable.id })
                    .in("id", toAdd);

                if (addError) {
                    console.error("Error asignando mesa a guests:", addError.message);
                }
            }

            console.log("Guests sincronizados ✅", { toAdd, toRemove });
            getTables()
            getGuests()
            setOnAddingGuests(false)
            setonEditingTable(false)

            return tableData;

        } catch (err) {
            console.error("Error inesperado:", err);
            return null;
        }

    }

    const editTable = () => {
        setOnAddingGuests(true) //Muestra la lista
        setonEditingTable(true) //Activa la edicion y cambia la UI
        setTablesName(selectedTable.name)
        setTotalChairs(selectedTable.size)
    }

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

    const handleAddingGuests = (state) => {
        setOnAddingGuests(state)
    }

    const handleNewTable = () => {
        setSelectedTable(null)
        setOnSelectedTable(false)
        // setOnModal(true)
        setOcuppiedChairs([])
    }

    const onClosingModal = () => {
        setOnModal(false)
        setOnViewTable(false)
        setSelectedTable(null)
        setOnSelectedTable(null)
        setOnAddingGuests(false)
        setCurrentGuest(null)
        setOnTransfer(false)

    }

    const transferGuest = async (table, guest) => {

        try {
            const { data, error } = await supabase
                .from("guests")
                .update({
                    table: table.id,
                    last_update_date: new Date(), // si tienes este campo en guests
                })
                .eq("id", guest.id)
                .select()
                .maybeSingle();

            if (error) {
                console.error("Error transfiriendo guest:", error.message);
                return null;
            }

            console.log("Guest transferido ✅", data);
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
                    .update({ table: null })
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

            console.log("Mesa eliminada ✅ y guests liberados ✅");
            getTables()
            getGuests()
            onClosingModal()
            return true;

        } catch (err) {
            console.error("Error inesperado:", err);
            return null;
        }


    };

    const handleSelectTable = (table) => {
        setSelectedTable(table)
        setOnSelectedTable(table.id)
    }


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

    const groupColorMap = useMemo(() => {
        const map = new Map();
        let colorIndex = 0;

        confirmedGuests_?.forEach(g => {
            const isLeader = g.has_companion && g.companion_id == null;
            const isCompanion = g.companion_id != null;

            const groupId = isLeader ? g.id : isCompanion ? g.companion_id : null;
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

                const name = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const search = filterByName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

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

    return (
        <div className="table-organization-main-container">
            <div className='table-org-general-container'>
                <div className='table-map-container'>
                    <div className='tab-map-header-cont'>
                        <span className='table-org-section-header' style={{ padding: '0px' }}>Organización por mesas</span>
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

                            <Button
                                icon={<TbLocation style={{
                                    marginTop: '3px'
                                }} />}
                                style={{ borderRadius: '99px' }}
                                onClick={() => { setOnEditPosition(!onEditPosition); setOnMoving(!onMoving) }} className={`button-web primarybutton--black${onEditPosition ? '--active' : ''}`}>
                                {
                                    onEditPosition ? 'Dejar de mover' : 'Mover Mesas'
                                }
                            </Button>

                            <Button
                                icon={<BsArrowsMove style={{
                                    marginTop: '3px'
                                }} />}
                                style={{ borderRadius: '99px' }}
                                onClick={() => setOnEditPosition(!onEditPosition)} className={`button-mobile primarybutton--black${onEditPosition ? '--active' : ''}`}>
                            </Button>

                            <Dropdown
                                trigger={['click']}
                                placement='bottomRight'
                                open={openNewTable}
                                onOpenChange={(nextOpen) => {
                                    if (nextOpen) setOpenNewTable(true);
                                    // si nextOpen es false (click afuera / ESC), NO hacemos nada
                                }}
                                popupRender={() => (
                                    <div className='modal-main-menu-container' onClick={(e) => e.stopPropagation()} >
                                        <div className='modal-main-container'>
                                            <div className='new-table-modal'>
                                                <div className='modal-header-sect'>
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px'
                                                    }}>
                                                        <FaPlus style={{
                                                            color: 'var(--brand-color-500)'
                                                        }} />
                                                        <span className='table-org-section-header'
                                                            style={{ padding: '0px', pointerEvents: 'none' }}>
                                                            Nueva Mesa</span>
                                                    </div>


                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px'
                                                    }}>
                                                        <Button
                                                            style={{ borderRadius: '99px' }}
                                                            className='secondarybutton'
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenNewTable(false);   // ✅ CIERRA dropdown
                                                                setOnAddingGuests(false);        // lo que tú ya hacías
                                                            }}>
                                                            Cancelar
                                                        </Button>
                                                        <Button style={{ borderRadius: '99px' }} className='primarybutton--black--active' onClick={addNewTable}>
                                                            Crear
                                                        </Button>
                                                    </div>


                                                </div>

                                                <div className='modal-content-sect'>
                                                    <div className='org-small-col'>
                                                        <span className='single-label'>Nombre</span>
                                                        <Input
                                                            style={{ minHeight: '30px', borderRadius: '99px', backgroundColor: 'var(--ft-color)' }}
                                                            placeholder={'Nombre de la mesa'}
                                                            value={tablesName}
                                                            onChange={(e) => setTablesName(e.target.value)}
                                                            // onChange={onFilterbyName}
                                                            className='tab-org-input' />
                                                    </div>

                                                    <div className='org-small-col'>
                                                        <span className='single-label'>Número de asientos</span>
                                                        <InputNumber
                                                            style={{
                                                                minHeight: '30px', width: '100%',
                                                                backgroundColor: 'var(--ft-color)', borderRadius: '99px'
                                                            }}
                                                            value={totalChairs}
                                                            onChange={(e) => setTotalChairs(e)}
                                                            className='tab-org-input' />
                                                    </div>
                                                </div>

                                                <div className='org-tab-card-row'>

                                                    {
                                                        onAddingGuests ?
                                                            <div className='org-small-col' style={{ gap: '12px' }}>
                                                                <span className='single-label'>
                                                                    Selecciona en la lista de la derecha los invitados que deseas agregar a tu mesa
                                                                </span>

                                                                <div className='modal-content-sect' style={{
                                                                    padding: '0px'
                                                                }}>
                                                                    <Progress
                                                                        size={[320, 20]}
                                                                        style={{ flex: 1 }}
                                                                        strokeColor={"var(--brand-color-500)"}
                                                                        showInfo={false}
                                                                        status="active"
                                                                        percent={((ocuppiedChairs.length ?? 0) * 100) / totalChairs} />
                                                                    <span className='on-transfer-label'>
                                                                        {(ocuppiedChairs.length ?? 0)} / {totalChairs}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            :
                                                            <Button style={{ borderRadius: '99px', margin: '16px 0px' }} className={`primarybutton--active`} onClick={() => handleAddingGuests(!onAddingGuests)} >
                                                                Agregar Invitados
                                                            </Button>


                                                    }




                                                </div>






                                                <div className='popup-available-spaces-list' style={{
                                                    display: onAddingGuests ? 'flex' : 'none'
                                                }}>
                                                    {
                                                        ocuppiedChairs.map((chair, index) => (
                                                            <div key={index} className='popup-available-spaces-item'>
                                                                <span className='single-label'>{index + 1}.</span>
                                                                <span className='single-label'>{chair.name}</span>
                                                            </div>
                                                        ))
                                                    }
                                                </div>

                                            </div>
                                        </div>
                                    </div>

                                )}
                            >
                                <Button
                                    disabled={onEditPosition}
                                    icon={<IoMdAdd style={{ marginTop: '3px' }} />}
                                    style={{ borderRadius: '99px', }}
                                    onClick={handleNewTable} className={`button-web primarybutton${!onEditPosition ? '--active' : ''}`}>
                                    Nueva Mesa
                                </Button>
                            </Dropdown>




                        </div>


                    </div>
                    <div
                        onMouseDown={startDrag}
                        onMouseMove={drag}
                        onMouseUp={stopDrag}
                        onMouseLeave={stopDrag}
                        ref={mapContainerRef}
                        style={{ cursor: onGrab && 'grab' }}
                        className={`org-map-container ${onMoving ? 'org-map-rule' : ''}`}>
                        <div
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
                                    tables_?.map((table, index) => (

                                        <DynamicTable
                                            key={index} table={table} occupiedChairs={confirmedGuests_?.filter(g => g.table === table.id).length}
                                            onEditPosition={onEditPosition} setSelectedTable={setSelectedTable}
                                            setOnSelectedTable={setOnSelectedTable} onSelectedTable={onSelectedTable} setOnViewTable={setOnViewTable}
                                            setTables={setTables} tables={tables_} onMoving={onMoving} onGrab={onGrab} />
                                    ))
                                }

                            </div>

                        </div>

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

                            <Tooltip
                                title="Mantén presionada la barra espaciadora para mover"
                                placement="top"
                            >
                                <Button
                                    disabled={onMoving}
                                    className={`full-screen-button button-web ${onGrab && 'grab-active-button'}`}
                                    style={{ height: '35px', minWidth: '35px' }}
                                    onClick={() => setOnGrab(!onGrab)}
                                    id="expandedbutton" icon={<PiHandGrabbing size={18} />} />
                            </Tooltip>

                        </div>


                        <div className='selected-table-hover-container'
                            style={{
                                bottom: '20px'
                            }}
                        >
                            <div className='org-single-row'>
                                <div style={{
                                    backgroundColor: 'var(--sc-color)'
                                }} className='tabs-dot-space'></div>
                                <span className='single-label button-web'>Lugares ocupados: <b style={{ marginLeft: '6px' }}>{taken}</b></span>
                                <span className='single-label button-mobile'>Ocupados: <b style={{ marginLeft: '6px' }}>{taken}</b></span>
                            </div>

                            <div className='org-single-row'>
                                <div style={{
                                    backgroundColor: 'var(--brand-color-500)'
                                }} className='tabs-dot-space'></div>
                                <span className='single-label button-web'>Lugares disponibles: <b style={{ marginLeft: '6px' }}>{available}</b></span>
                                <span className='single-label button-mobile'>Disponibles: <b style={{ marginLeft: '6px' }}>{available}</b></span>
                            </div>


                        </div>

                    </div>

                    {
                        onModal &&
                        <div onClick={onClosingModal} style={{
                            width: '100%', height: '100%', position: 'absolute',
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
                            padding: '36px', boxSizing: 'border-box',
                            top: 0, left: 0, backgroundColor: '#FFFFFF40', zIndex: 9999
                        }}>
                            <div onClick={(e) => { setOnTransfer(false); e.stopPropagation(); }} className='modal-main-menu-container'>

                                {
                                    tables && selectedTable &&

                                    <div className='modal-tables-container' style={{
                                        width: onEditingTable && '5px'
                                    }}>
                                        {
                                            !onEditingTable &&
                                            tables_.map((tab, index) => (
                                                <div
                                                    key={index}
                                                    onClick={() => handleSelectTable(tab)}
                                                    className={`modal-sider-tab-item ${selectedTable.id === tab.id ? 'modal-sider-selected-tab' : ''}`}
                                                >
                                                    <span className='single-label' style={{ fontWeight: 400, fontSize: '12px' }}>{tab.number}</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                }

                                <div className='modal-main-container'>
                                    {

                                        onViewTable && selectedTable &&
                                        <div className='new-table-modal'>
                                            <div className='modal-header-sect '>

                                                <span className='table-org-section-header' style={{ padding: '0px', pointerEvents: 'none', lineHeight: '1' }}>Mesa #{selectedTable.number}</span>




                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px'
                                                }}>


                                                    <Button
                                                        style={{ borderRadius: '99px' }}
                                                        className={`button-web primarybutton${!onEditingTable ? '--black' : ''}--active`} onClick={onEditingTable ? updateTable : editTable}>
                                                        {onEditingTable ? 'Terminar' : 'Editar'}
                                                    </Button>
                                                    <Button
                                                        style={{ borderRadius: '99px' }}
                                                        className='secondarybutton'
                                                        onClick={onClosingModal} icon={<IoClose size={18} style={{
                                                            marginTop: '2px', color: 'var(--text-color)',
                                                        }} />} />
                                                </div>

                                            </div>

                                            <div className='modal-content-sect'>

                                                <div className='org-small-col'>
                                                    <span className='single-label'>Nombre de mesa</span>
                                                    {
                                                        onEditingTable ?
                                                            <Input
                                                                style={{ minHeight: '30px', borderRadius: '99px', backgroundColor: 'var(--ft-color)' }}
                                                                placeholder={'Nombre de la mesa'}
                                                                value={tablesName}
                                                                onChange={(e) => setTablesName(e.target.value)}
                                                                // onChange={onFilterbyName}
                                                                className='tab-org-input' />
                                                            :
                                                            <span style={{ fontSize: '14px', color: 'var(--text-color)', fontWeight: 600 }}>{selectedTable.name}</span>
                                                    }
                                                </div>

                                                <div className='org-small-col'>
                                                    <span className='single-label'>Número de asientos</span>
                                                    {
                                                        onEditingTable ?
                                                            <InputNumber
                                                                style={{
                                                                    minHeight: '30px', width: '100%',
                                                                    backgroundColor: 'var(--ft-color)', borderRadius: '99px'
                                                                }}
                                                                value={totalChairs}
                                                                onChange={(e) => setTotalChairs(e)}
                                                                className='tab-org-input' />
                                                            : <span style={{ fontSize: '14px', color: 'var(--text-color)', fontWeight: 600 }}>{selectedTable.size} Lugares</span>
                                                    }
                                                </div>


                                            </div>


                                            <div className='modal-content-sect'>

                                                <div className='org-small-col' style={{ gap: '12px' }}>
                                                    {
                                                        onEditingTable &&
                                                        <span className='single-label'>
                                                            Selecciona en la lista de la derecha los invitados que deseas agregar a tu mesa
                                                        </span>
                                                    }

                                                    <div className='modal-content-sect' style={{
                                                        padding: '0px', paddingTop: !onEditingTable && '0px'
                                                    }}>
                                                        <Progress
                                                            size={[320, 15]}
                                                            style={{ flex: 1 }}
                                                            strokeColor={"var(--brand-color-500)"}
                                                            showInfo={false}
                                                            status="active"
                                                            percent={((ocuppiedChairs?.length ?? 0) * 100) / totalChairs} />
                                                        <span className='on-transfer-label' style={{ color: 'var(--text-color)' }}>
                                                            {(ocuppiedChairs?.length ?? 0)} / {totalChairs}
                                                        </span>
                                                    </div>
                                                </div>



                                            </div>


                                            <div className='popup-available-spaces-list' >
                                                {
                                                    ocuppiedChairs.map((chair, index) => (
                                                        <div key={index} className='popup-available-spaces-item' style={{
                                                            alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: onEditingTable ? 'space-between' : 'flex-start'
                                                        }}>
                                                            <div style={{
                                                                display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px'
                                                            }}>
                                                                <span className='single-label'>{index + 1}.</span>
                                                                <span className='single-label'>{chair.name}</span>
                                                            </div>
                                                            {
                                                                onEditingTable && chair.name &&
                                                                <div className="org-single-row">
                                                                    <Dropdown
                                                                        placement='toRight'
                                                                        trigger={['click']}
                                                                        popupRender={() => (
                                                                            <div className='on-transfer-container'>
                                                                                <span className='on-transfer-label'>Selecciona mesa</span>
                                                                                <div className='transfer-mesas-cont'>

                                                                                    {
                                                                                        tables_.map((table) => (
                                                                                            (chair.table !== table.id) && (confirmedGuests_?.filter(g => g.table === table.id).length !== table.size) &&
                                                                                            <div className='table-transfer-item' onClick={() => transferGuest(table, chair)}>
                                                                                                <div style={{
                                                                                                    alignSelf: 'stretch', display: 'flex', alignItems: 'center',
                                                                                                }}>
                                                                                                    <span>{table.name ? `#${table.number} - ${table.name}` : `Mesa #${table.number}`}</span>
                                                                                                </div>
                                                                                                <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px' }}>
                                                                                                    <Progress
                                                                                                        style={{ flex: 1 }}
                                                                                                        className='progress-tables'
                                                                                                        strokeColor={"var(--brand-color-500)"}
                                                                                                        status="active"
                                                                                                        showInfo={false}
                                                                                                        percent={(confirmedGuests_?.filter(g => g.table === table.id).length * 100) / table.size} />
                                                                                                    <span className='occupied-places-tab-mob'>{confirmedGuests_?.filter(g => g.table === table.id).length} / {table.size}</span>
                                                                                                </div>
                                                                                            </div>

                                                                                        ))
                                                                                    }
                                                                                </div>



                                                                            </div>
                                                                        )}
                                                                    >
                                                                        <Button
                                                                            // onClick={() => hanldeTransfer(chair)}
                                                                            icon={<LuShuffle size={16} style={{ marginTop: '3px' }} />}
                                                                            style={{ borderRadius: '99px' }} className='primarybutton' >Transferir</Button>
                                                                    </Dropdown>
                                                                    <Button
                                                                        style={{ borderRadius: '99px' }}
                                                                        className='primarybutton' icon={<RiDeleteBack2Line size={16} style={{ marginTop: '3px' }} />} onClick={() => updateChair(chair)} ></Button>

                                                                </div>

                                                            }

                                                        </div>

                                                    ))
                                                }


                                                {
                                                    onEditingTable &&
                                                    <Button
                                                        onClick={() => deleteTableAndAdjust(selectedTable.id)}
                                                        className={'primarybutton'} style={{ borderRadius: '99px', margin: '16px 0px' }}>Eliminar mesa</Button>
                                                }

                                            </div>


                                        </div>

                                    }



                                </div>
                            </div>
                        </div>
                    }
                </div>

                <div className={`table-list-container ${mobileList ? 'table-mobile-list-active' : ''}`} style={{
                    width: !onGuestList && '10px', paddingBottom: 0
                }}>
                    <Button
                        onClick={() => setMobileList(!mobileList)}
                        icon={<FaList size={16} />}
                        className='button-mobile confirmedlistvutton primarybutton--active'></Button>
                    {
                         onGuestList &&
                        <>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0px 20px', alignSelf: 'stretch'
                            }}>
                                <span className='table-org-section-header button-web'>Invitados confirmados ({confirmedGuests_?.length ?? 0})</span>
                                <span className='table-org-section-header button-mobile'>Confirmados ({confirmedGuests_?.length ?? 0})</span>
                            </div>

                            <div className='tab-org-filter-cont'>
                                <Input
                                    placeholder={'Buscar invitado'}
                                    value={filterByName}
                                    onChange={(e) => setFilterByName(e.target.value)}
                                    className='tab-org-input' />
                                {
                                    !onAddingGuests &&
                                    <Button
                                        onClick={() => setOnFilter(!onFilter)}
                                        icon={<BsSliders size={14} />}
                                        className={!onFilter ? 'filtering-button' : 'filtering-button-active'} />
                                }
                                {
                                    onFilter &&
                                    <div className='filters-popup'>
                                        <div className='filters-popup-row'>
                                            <span
                                                style={{ cursor: onAddingGuests && 'not-allowed' }}
                                                onClick={() => setCurrentFilter('all')} className={`filter-item ${currentFilter === 'all' && !onAddingGuests && 'filter-item-active'}`}>Todos</span>
                                            <span onClick={() => setCurrentFilter('non-assigned')} className={`filter-item full-item-w ${currentFilter === 'non-assigned' && 'filter-item-active'}`}>Sin asignar</span>
                                        </div>
                                        <div className='filters-popup-row'>
                                            <span onClick={() => setCurrentFilter('compained')} className={`filter-item full-item-w ${currentFilter === 'compained' && 'filter-item-active'}`}>Acompañados</span>
                                            <span onClick={() => setCurrentFilter('alone')} className={`filter-item ${currentFilter === 'alone' && 'filter-item-active'}`}>Solos</span>
                                        </div>
                                    </div>
                                }
                            </div>
                            <div style={{ display: onAddingGuests ? 'flex' : 'none' }} className='padding-container'>
                                <div className='tag-disclaimer'>

                                    {
                                        availableSeats < 1 ? "Tu mesa se ha llenado. No hay espacios disponibles" :
                                            confirmedGuests_?.filter((guest) => guest.table === null).length < 1 ?
                                                "No hay invitados disponibles para asignar"
                                                : "Solo puedes agregar invitados que no hayan sido previamente asignados en otra mesa"
                                    }

                                </div>
                            </div>

                            <div className='org-guests-table-container'
                                style={{
                                    maxHeight: onAddingGuests && 'calc(75vh - 90px)'
                                }}
                            >
                                {
                                    onAddingGuests ?
                                        confirmedGuests_
                                            ?.filter(c => {
                                                if (!selectedTable) return c.table === null;
                                                else return !ocuppiedChairs.includes(c)
                                            })
                                            ?.filter(c => {
                                                if (!filterByName) return true;

                                                const name = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                const search = filterByName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                                                return name.includes(search);
                                            })
                                            .map((guest, index) => (

                                                <div key={index} className='org-tab-item'>
                                                    <div className="org-single-row">
                                                        {
                                                            !selectedTable && checkedChairs &&
                                                            <Checkbox onChange={(e) => updateChair(guest, e)}
                                                                disabled={!availableSeats >= 1 && !checkedChairs[guest.name]} />
                                                        }

                                                        <span className='org-tab-name'>{guest.name}</span>
                                                    </div>



                                                    <div className="org-single-row">
                                                        {
                                                            availableSeats >= 1 && selectedTable &&
                                                            <Button
                                                                style={{ fontWeight: 600 }}
                                                                icon={<IoMdAdd size={16} style={{ marginTop: '2px' }} />}
                                                                className='orgtabbutton' onClick={() => updateChair(guest)}>Agregar</Button>
                                                        }

                                                        <Dropdown
                                                            popupRender={() => (
                                                                <div className='who-is-main-container'>

                                                                    {/** SI TIENE COMPANION */}
                                                                    {guest.companion_id ? (
                                                                        <>
                                                                            <div className='who-is-container'>

                                                                                <span>
                                                                                    <b>{guest?.name}</b> es uno de los acompañantes de{" "}
                                                                                    <b
                                                                                        onClick={() => setOnExtendedWhos(!onExtendedWhos)}
                                                                                        className='parent-label-whois'
                                                                                    >
                                                                                        {confirmedGuests_?.find(g => g.id.toString() === guest.companion_id)?.name}
                                                                                    </b>
                                                                                </span>
                                                                            </div>

                                                                            {onExtendedWhos && (
                                                                                <>
                                                                                    <div className='whos-connector' />

                                                                                    <div className='who-is-container'>
                                                                                        {(() => {
                                                                                            const parent = confirmedGuests_?.find(
                                                                                                g => g.id.toString() === guest.companion_id
                                                                                            );
                                                                                            const companions = confirmedGuests_?.filter(
                                                                                                g => g.companion_id === parent?.id.toString()
                                                                                            );

                                                                                            return (
                                                                                                <>
                                                                                                    <span>
                                                                                                        Agregaste a <b>{parent?.name}</b> el{" "}
                                                                                                        <b>{formatDate(parent?.created_at)}</b> y confirmó el{" "}
                                                                                                        <b>{formatDate(parent?.last_update_date)}</b>
                                                                                                    </span>

                                                                                                    {companions?.length > 0 && (
                                                                                                        <>
                                                                                                            <span>Le acompañan: </span>
                                                                                                            <ul>
                                                                                                                {companions.map((c, i) => (
                                                                                                                    <li key={i}>{c.name}</li>
                                                                                                                ))}
                                                                                                            </ul>
                                                                                                        </>
                                                                                                    )}
                                                                                                </>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        /** SI NO TIENE COMPANION */
                                                                        <div className='who-is-container'>

                                                                            <span>
                                                                                Agregaste a <b>{guest?.name}</b> el{" "}
                                                                                <b>{formatDate(guest?.created_at)}</b> y confirmó el{" "}
                                                                                <b>{formatDate(guest?.last_update_date)}</b>
                                                                            </span>

                                                                            {(() => {
                                                                                const companions = confirmedGuests_?.filter(
                                                                                    c => c.companion_id === guest.id.toString()
                                                                                );

                                                                                return companions?.length > 0 ? (
                                                                                    <>
                                                                                        <span>Le acompañan: </span>
                                                                                        <ul>
                                                                                            {companions.map((c, index) => (
                                                                                                <li key={index}>{c?.name}</li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    </>
                                                                                ) : (
                                                                                    <span className='no-companions-special-label'>
                                                                                        *No lleva acompañantes*
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        >
                                                            <Button
                                                                icon={<IoMdHelp size={16} style={{ marginTop: '2px' }} />}
                                                                onClick={() => setAboutMyGuest(guest)}
                                                                style={{
                                                                    background:
                                                                        currentFilter === "compained" &&
                                                                        backgroundColors[guest.color_id],
                                                                }}
                                                                className="orgtabbutton"
                                                            />
                                                        </Dropdown>


                                                    </div>

                                                </div>
                                            ))
                                        :
                                        guestsSorted.map((guest, index) => (

                                            <div key={index} className='org-tab-item' style={{
                                                backgroundColor: currentFilter === "compained" && getGroupColor(guest)
                                                    ? `${getGroupColor(guest)}40`
                                                    : undefined,
                                                borderBottom: currentFilter === "compained" && getGroupColor(guest)
                                                    ? "1px solid var(--ft-color)"
                                                    : undefined,
                                            }}>
                                                <span className='org-tab-name'>{guest.name}</span>
                                                <div className="org-single-row">

                                                    {/* {
                                                        guest.tag &&
                                                        <div className={`org-place-tag`} style={{
                                                            width: 'auto', minWidth: '20px',
                                                            padding: '0px 12px',
                                                            backgroundColor: currentFilter === "compained" ? getGroupColor(guest) : undefined
                                                        }}>
                                                            {`${guest.tag ?? "-"}`}

                                                        </div>
                                                    } */}


                                                    <div className={`org-place-tag ${!guest.table && 'non-assigned-tag'}`} style={{
                                                        backgroundColor: !guest.table
                                                            ? "var(--ft-color)"
                                                            : currentFilter === "compained" && getGroupColor(guest)
                                                                ? getGroupColor(guest)
                                                                : undefined,
                                                        border: guest.table
                                                            ? "1px solid var(--borders)"
                                                            : currentFilter === "compained" && getGroupColor(guest)
                                                                ? `1px solid ${getGroupColor(guest)}99`
                                                                : undefined,
                                                        color: !guest.table
                                                            && currentFilter === "compained" && '#000',

                                                        fontWeight: guest.table && 500,
                                                    }}>
                                                        {guest.table ? `Mesa #${tables_?.find(t => t.id === guest.table)?.number ?? "-"}` : 'Sin mesa'}
                                                    </div>



                                                    <Dropdown
                                                        trigger={['click']}
                                                        popupRender={() => (
                                                            <div className='who-is-main-container'>

                                                                {/** SI TIENE COMPANION */}
                                                                {guest.companion_id ? (
                                                                    <>
                                                                        <div className='who-is-container'>

                                                                            <span>
                                                                                <b>{guest?.name}</b> es uno de los acompañantes de{" "}
                                                                                <b
                                                                                    onClick={() => setOnExtendedWhos(!onExtendedWhos)}
                                                                                    className='parent-label-whois'
                                                                                >
                                                                                    {confirmedGuests_?.find(g => g.id.toString() === guest.companion_id)?.name}
                                                                                </b>
                                                                            </span>
                                                                        </div>

                                                                        {onExtendedWhos && (
                                                                            <>
                                                                                <div className='whos-connector' />

                                                                                <div className='who-is-container'>
                                                                                    {(() => {
                                                                                        const parent = confirmedGuests_?.find(
                                                                                            g => g.id.toString() === guest.companion_id
                                                                                        );
                                                                                        const companions = confirmedGuests_?.filter(
                                                                                            g => g.companion_id === parent?.id.toString()
                                                                                        );

                                                                                        return (
                                                                                            <>
                                                                                                <span>
                                                                                                    Agregaste a <b>{parent?.name}</b> el{" "}
                                                                                                    <b>{formatDate(parent?.created_at)}</b> y confirmó el{" "}
                                                                                                    <b>{formatDate(parent?.last_update_date)}</b>
                                                                                                </span>

                                                                                                {companions?.length > 0 && (
                                                                                                    <>
                                                                                                        <span>Le acompañan: </span>
                                                                                                        <ul>
                                                                                                            {companions.map((c, i) => (
                                                                                                                <li key={i}>{c.name}</li>
                                                                                                            ))}
                                                                                                        </ul>
                                                                                                    </>
                                                                                                )}
                                                                                            </>
                                                                                        );
                                                                                    })()}
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    /** SI NO TIENE COMPANION */
                                                                    <div className='who-is-container'>

                                                                        <span>
                                                                            Agregaste a <b>{guest?.name}</b> el{" "}
                                                                            <b>{formatDate(guest?.created_at)}</b> y confirmó el{" "}
                                                                            <b>{formatDate(guest?.last_update_date)}</b>
                                                                        </span>

                                                                        {(() => {
                                                                            const companions = confirmedGuests_?.filter(
                                                                                c => c.companion_id === guest.id.toString()
                                                                            );

                                                                            return companions?.length > 0 ? (
                                                                                <>
                                                                                    <span>Le acompañan: </span>
                                                                                    <ul>
                                                                                        {companions.map((c, index) => (
                                                                                            <li key={index}>{c?.name}</li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </>
                                                                            ) : (
                                                                                <span className='no-companions-special-label'>
                                                                                    *No lleva acompañantes*
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    >
                                                        <Button
                                                            icon={<IoMdHelp size={16} style={{ marginTop: '2px' }} />}
                                                            onClick={() => setAboutMyGuest(guest)}
                                                            style={{
                                                                background:
                                                                    currentFilter === "compained" && getGroupColor(guest)
                                                                        ? getGroupColor(guest)
                                                                        : undefined,
                                                            }}
                                                            className="orgtabbutton"
                                                        />
                                                    </Dropdown>


                                                </div>
                                            </div>

                                        ))
                                }
                            </div>

                        </>
                    }



                </div>


            </div>

        </div>


    )
}
