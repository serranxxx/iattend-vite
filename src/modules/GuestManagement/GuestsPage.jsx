import { Badge, Button, DatePicker, Dropdown, Input, Layout, Modal, Popconfirm, message, Tooltip, Tabs, Progress, Drawer, Spin } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import React, { useEffect, useMemo, useState } from 'react'
import { toFirstString } from '../../helpers/invitation/newInvitation';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Legend, } from 'chart.js';
import { IoIosAddCircleOutline, IoIosCheckmarkCircleOutline, IoIosCloseCircleOutline, IoMdAdd, } from 'react-icons/io';
import { FooterApp } from '../Footer/FooterApp';
import { supabase } from '../../lib/supabase';
import { FaCheck, FaPlus, FaRegCopy, } from 'react-icons/fa';
import { AiOutlineClockCircle, } from 'react-icons/ai';
import { FiArrowUpRight, FiMinus } from 'react-icons/fi';
import { NotificationCard } from '../../components/NotificationCard/NotificationCard'
import { UpgradeBanner } from '../../components/Payment/UpgradeBanner/UpgradeBanner';
import { IoTicket, } from 'react-icons/io5';
import { RiArrowRightDoubleLine } from 'react-icons/ri';
import axios from 'axios';
import { TbLocationFilled } from 'react-icons/tb';
import { GoChevronDown } from 'react-icons/go';
import { BsArrowReturnRight } from 'react-icons/bs';
import { LuSettings2 } from 'react-icons/lu';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Grid } from "antd";
import { TablesPage } from './Tables/TablesPage';
import { HeaderDashboard } from '../Header/Header';
import { CreditsComponent } from '../../components/Payment/Credits/Credits';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AArrowUp, ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, ArrowUpRight, BellRing, Check, CheckCheck, ChevronRight, CirclePlus, CircleUserRound, Clock, Copy, Download, Info, Link2, LockKeyhole, LockKeyholeOpen, MailWarning, MessageCircle, MoreHorizontal, Pin, Plus, PlusCircle, QrCode, Search, Send, Sparkles, Tag, TextAlignJustify, Tickets, X } from 'lucide-react';
import { WHATS_NEW_OPEN_EVENT } from '../../components/WhatsNewBanners/WhatsNewBanners';
import { GuestsOverview } from './GuestsOverview/GuestsOverview';
import { GuestsCRUD } from '../../components/Create/GuestsCRUD';
import { GuestAddTiles } from './GuestAddTiles';
import { useTranslation } from 'react-i18next';
import { WhatsappMessages } from './WhatsappMessages/WhatsappMessages'
import { useLia } from '../../context/LiaContext';
import { useDashboardRealtime } from '../../context/DashboardRealtimeContext';
import { POPULAR_LANGUAGES, flagForLanguage } from '../../helpers/services/languageFlags';
import { formatAbsoluteDateEs } from '../../helpers/assets/eventDateTime';
import './guests-redesign.css';

const { useBreakpoint } = Grid;




dayjs.extend(relativeTime)

ChartJS.register(ArcElement, Legend);

// ── Envío masivo oculto para la primera versión en producción ─────────────
// Poner en true para restaurar: botón "Crear envío" (desktop y mobile), el modo
// de selección por bloques y su checkbox. Con el flag apagado, cada bloque
// vuelve a tener su botón de "Enviar" individual.
const SHOW_BULK_SEND = false;

// ── Distribución (gráfica de pastel) del control de pases ─────────────────
// Poner en true para restaurar el bloque "DISTRIBUCIÓN" del dropdown de pases.
const SHOW_TICKETS_DISTRIBUTION = false;

// ── Control de pases ──────────────────────────────────────────────────────
// El menú "⋯" del rediseño solo lleva descargables, mapa de mesas, evento
// privado y lector de pases. Poner en true para volver a mostrar ahí el
// editor de la capacidad total del evento.
const SHOW_TICKETS_CONTROL = false;

export default function GuestsPage() {

    const { t, i18n } = useTranslation()


    const screens = useBreakpoint();
    const [confirmed, setConfirmed] = useState(0)
    const [waiting, setWaiting] = useState(0)
    const [tickets, setTickets] = useState(0)
    const [activeTickets, setActiveTickets] = useState(false)
    const [onNotificationCenter, setOnNotificationCenter] = useState(false)
    const [onEditTickets, setOnEditTickets] = useState(false)
    const [drawerState, setDrawerState] = useState({
        currentGuest: null,
        onEditGuest: false,
        companions: [],
        visible: false
    });


    const [openCard, setOpenCard] = useState(null)
    const [onShare, setOnShare] = useState(false)
    const [copyTickets, setCopyTickets] = useState(null)
    const [handleTables, sethandleTables] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 750)
    const [rowData, setRowData] = useState([]);
    const [waitingData, setWaitingData] = useState([])
    const [confirmedData, setConfirmedData] = useState([])
    const [callededData, setCallededData] = useState([])
    const [createdData, setCreatedData] = useState([])
    const [notifications, setNotifications] = useState([])
    const [tables, setTables] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [credits, setCredits] = useState(0)
    const [activeKey, setActiveKey] = useState('seguimiento');
    const [invitation, setInvitation] = useState(null)
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [name, setName] = useState(null)
    const id = searchParams.get("id");
    const [messagesDispatch, setMessagesDispatch] = useState([])
    // Guests recién enviados por WhatsApp API en esta sesión, mientras su dispatch
    // real todavía no llega (fetch inmediato o realtime) — evita que se les
    // muestre "envío manual" (el fallback de handleMessageStatus) por error.
    const [pendingApiSends, setPendingApiSends] = useState(() => new Set())
    const [searchUser, setSearchUser] = useState(null)
    const [localTags, setLocalTags] = useState([])
    const [filterTag, setFilterTag] = useState(null)
    const [filterTable, setFilterTable] = useState(null)
    const [filterTier, setFilterTier] = useState(null)
    const [filterType, setFilterType] = useState(null)
    const [filterSide, setfilterSide] = useState(null)
    // Filtro rápido "Sin entregar" del tab Esperando respuesta: se apoya en el
    // estado del dispatch, no en una columna de guests.
    const [filterDelivery, setFilterDelivery] = useState(null)
    // Sort de encabezado por tab (no filtra filas, solo cambia el orden): un solo
    // { column, dir } activo por tab — activar una columna desactiva cualquier otra
    // del mismo tab. dir cicla inactivo -> 'asc' -> 'desc' -> inactivo.
    const [activeSort, setActiveSort] = useState({
        creado: { column: 'tier', dir: 'asc' },
        esperando: { column: null, dir: null },
        confirmado: { column: null, dir: null },
        rechazado: { column: null, dir: null },
    })
    const [owners, setOwners] = useState(null)
    const [url_image, setUrl_image] = useState(null)
    const [plan, setPlan] = useState(null)
    const [invLabel, setInvLabel] = useState(null)
    const [invPhone, setInvPhone] = useState(null)
    // Recordatorios manuales de WhatsApp (Fase 1): fecha límite de confirmación
    // (columna top-level invitations.rsvp_deadline, tipo date) y estado del modal.
    const [rsvpDeadline, setRsvpDeadline] = useState(null)
    const [eventDate, setEventDate] = useState(null)
    // Qué picker de fecha límite está abierto (id de slot, o null). NO es un
    // booleano a propósito: la línea/alerta se renderiza en varios tabs y antd
    // los mantiene montados, así que un flag compartido abría los dos popups a
    // la vez y el del tab oculto disparaba onOpenChange(false) al instante,
    // dejando el calendario muerto.
    const [rsvpPickerSlot, setRsvpPickerSlot] = useState(null)
    const [buyCreditsOpen, setBuyCreditsOpen] = useState(false)
    // Bulk shipment (tab Lista de espera): "Crear envío" activa el modo envío —
    // solo entonces aparecen los checkboxes (únicamente en bloques enviables).
    // bulkSelected guarda ids de PRINCIPALES; se seleccionan bloques completos.
    const [sendMode, setSendMode] = useState(false)
    const [bulkSelected, setBulkSelected] = useState(() => new Set())
    const [bulkSending, setBulkSending] = useState(false)
    // Lote activo de envío masivo (isla de progreso): { id, total, sent, failed, status }
    const [activeBatch, setActiveBatch] = useState(null)

    const hasPendingInfo = !name || !owners?.length || !invLabel || !invPhone

    const { uiAction, clearUiAction, setCreditSending, setCreditSuccess, clearCreditState } = useLia()
    const { subscribe } = useDashboardRealtime()

    useEffect(() => {
        if (!uiAction) return
        switch (uiAction.type) {
            case 'filter_guests':
                setSearchUser(uiAction.payload?.query ?? '')
                break
            case 'filter_by_state':
                setActiveKey(uiAction.value)
                break
            case 'open_guest_form':
                setDrawerState({ currentGuest: null, onEditGuest: true, companions: [], visible: true })
                break
            case 'open_guest_detail': {
                const guest = rowData.find(g =>
                    g.phone_number === uiAction.value ||
                    g.name?.toLowerCase().includes((uiAction.value ?? '').toLowerCase())
                )
                if (guest) setDrawerState({ currentGuest: guest, onEditGuest: false, companions: rowData.filter((row) => row.companion_id === guest.id), visible: true })
                break
            }
            default:
                break
        }
        clearUiAction()
    }, [uiAction])

    // Sorts de columna (no filtran filas): un botón en el header cicla
    // inactivo -> asc -> desc -> inactivo. Solo una columna puede estar activa
    // por tab (activar una desactiva cualquier otra del mismo tab), por eso
    // activeSort guarda un único { column, dir } por tab en vez de un booleano
    // por columna. Deben existir antes de las columnas, que las usan al definirse.
    const cycleTabSort = (tabKey, column) => {
        setActiveSort((prev) => {
            const current = prev[tabKey] || { column: null, dir: null };
            const nextDir = current.column !== column
                ? 'asc'
                : current.dir === 'asc' ? 'desc' : current.dir === 'desc' ? null : 'asc';
            return {
                ...prev,
                [tabKey]: { column: nextDir ? column : null, dir: nextDir },
            };
        });
    };

    const TIER_SORT_ORDER = { A: 1, B: 2, C: 3, D: 4 };
    const MESSAGE_STATUS_SORT_ORDER = { failed: 0, undefined: 1, processing: 2, sent: 3, delivered: 4, read: 5 };

    const compareByMesa = (a, b) => {
        const aHas = a.table ? 1 : 0;
        const bHas = b.table ? 1 : 0;
        if (aHas !== bHas) return aHas - bHas; // sin mesa primero
        const aNum = tables.find((tb) => tb.id === a.table)?.number ?? 0;
        const bNum = tables.find((tb) => tb.id === b.table)?.number ?? 0;
        return aNum - bNum;
    };

    const compareByTier = (a, b) => (TIER_SORT_ORDER[a.tier] ?? 99) - (TIER_SORT_ORDER[b.tier] ?? 99);

    // Mismo estatus "efectivo" que muestra handleMessageStatus (considera el envío
    // optimista de pendingApiSends antes de que llegue su dispatch real).
    const effectiveMessageStatus = (guest) => {
        const status = dispatchMap[guest.id]?.status ?? 'undefined';
        return status === 'undefined' && pendingApiSends.has(guest.id) ? 'processing' : status;
    };

    const compareByStatus = (a, b) =>
        (MESSAGE_STATUS_SORT_ORDER[effectiveMessageStatus(a)] ?? 1) - (MESSAGE_STATUS_SORT_ORDER[effectiveMessageStatus(b)] ?? 1);

    const applySortDir = (data, dir, comparator) => {
        if (!dir) return data;
        const sorted = [...data].sort(comparator);
        return dir === 'desc' ? sorted.reverse() : sorted;
    };

    const SORT_COMPARATORS = { tier: compareByTier, mesa: compareByMesa, estado: compareByStatus };

    const sortForTab = (tabKey, data) => {
        const sort = activeSort[tabKey];
        const comparator = sort?.column && SORT_COMPARATORS[sort.column];
        if (!comparator) return data;
        return applySortDir(data, sort.dir, comparator);
    };

    // Las columnas de la antigua tabla (columns / openColumns / tableProps /
    // getTabColumns) se eliminaron con el rediseño: cada tarjeta arma su propia
    // fila y su propia acción — ver renderGuestCard.

    // Panel para asignar mesa a un invitado confirmado. Vive en un solo
    // lugar porque lo usan las columnas viejas y las tarjetas del rediseño.
    const renderTablePickerPopup = (record) => (
        <div style={{ position: "static" }} className="on-transfer-container">
            <span className="on-transfer-label">{t('guests.select_table')}</span>

            <div className="transfer-mesas-cont scroll-invitation" style={{ maxHeight: '360px' }}>
                {tables.map((tb, index) => (
                    <div
                        onClick={() => addGuestToTable(tb, record)}
                        key={index}
                        className="table-transfer-item"

                    >
                        <div style={{ alignSelf: "stretch", display: "flex", alignItems: "center" }}>
                            <span>
                                {tb.name ? `#${tb.number} - ${tb.name}` : `${t('guests.table_prefix')} #${tb.number}`}
                            </span>
                        </div>

                        <div
                            style={{
                                alignSelf: "stretch",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                gap: 12,
                            }}
                        >
                            <Progress
                                style={{ flex: 1 }}
                                size={[undefined, 12]}
                                className="progress-tables"
                                strokeColor={"var(--brand-color-500)"}
                                status="active"
                                showInfo={false}
                                percent={
                                    (confirmedData?.filter((g) => g.table === tb.id).length * 100) /
                                    tb.size
                                }
                            />
                            <span className="occupied-places-tab-mob">
                                {`${confirmedData?.filter((g) => g.table === tb.id).length} / ${tb.size}`}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div
                style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 65,
                }}
            >
                <Button
                    onClick={() => sethandleTables(true)}
                    style={{ borderRadius: 99 }}
                    icon={<TbLocationFilled />}
                >
                    {t('guests.view_map')}
                </Button>
            </div>
        </div>
    )



    // getTabColumns se eliminó con la tabla: cada tarjeta arma su propia acción.

    const filteredGuests = (data = []) => {
        return data.filter((guest) => {
            const name = guest.name?.toLowerCase() || "";
            const phone = guest.phone_number?.toString() || "";
            const search = searchUser?.toLowerCase() || "";

            const matchesSearch =
                !search ||
                name.includes(search) ||
                phone.includes(searchUser);

            const matchesTag =
                !filterTag ||
                guest.tag === filterTag;

            const matchesTable =
                filterTable === null
                    ? true
                    : filterTable === 'no-table'
                        ? guest.table === null
                        : guest.table === filterTable;

            const matchesSide =
                !filterSide ||
                guest.side === filterSide;

            const matchesTier =
                !filterTier ||
                guest.tier === filterTier;

            const matchesType =
                !filterType ||
                guest.type === filterType;


            const matchesDelivery =
                !filterDelivery ||
                effectiveMessageStatus(guest) === filterDelivery;

            return matchesSearch && matchesTag && matchesTable && matchesTier && matchesType && matchesSide && matchesDelivery;
        });
    };

    // Deshace el agrupamiento por familia (líder + children) en una lista plana
    // de filas individuales — para contar/filtrar/mostrar por fila, no por grupo.
    const flattenGroups = (groupedData = []) =>
        groupedData.flatMap((g) => [g, ...(g.children || [])]);

    // Cuenta filas individuales (líder + acompañantes), no grupos familiares —
    // para los chips de los tabs, que agrupan con groupByFamilyForStates.
    const countGuestRows = (groupedData = []) =>
        filteredGuests(flattenGroups(groupedData)).length;

    // Vista individual (sin agrupar por familia): se usa cuando hay una
    // búsqueda/filtro activo, para que coincidencias en acompañantes también
    // aparezcan como su propia fila en vez de quedar ocultas dentro de un grupo.
    const flatFilteredGuests = (groupedData = []) =>
        filteredGuests(flattenGroups(groupedData));

    // Con búsqueda o filtro activo la lista se aplana (cada coincidencia como su
    // propia tarjeta) en vez de agruparse por familia.
    const hasActiveFilters = Boolean(searchUser || filterTag || filterTable || filterTier || filterType || filterSide || filterDelivery);

    // (renderGuestCardRow, renderGroupedCards, confirmedFlatData, renderConfirmedByTable
    // e items viven más abajo, después de todos los helpers que sus columnas invocan —
    // ver comentario junto al return())

    const handleTypes = (type) => {
        switch (type) {
            case 'female': return t('guests.type_female')
            case 'male': return t('guests.type_male')
            case 'child': return t('guests.type_child')
            case 'undefined': return t('guests.type_undefined')
            default: break;
        }
    }





    const handlePriority = (tier) => {
        switch (tier) {
            case 'A': return t('guests.priority_a')
            case 'B': return t('guests.priority_b')
            case 'C': return t('guests.priority_c')
            case 'D': return t('guests.priority_d')
            default: break;
        }
    }

    // const handleIcon = (value) => {
    //     switch (value) {
    //         case 'esperando': return <div className='icon_cont'>AAA</div>
    //         case 'confirmado': return <div className='icon_cont'><IoIosCheckmarkCircleOutline size={16} /></div>
    //         case 'asistente': return <div className='icon_cont'><IoIosCheckmarkCircleOutline size={16} /></div>
    //         case 'rechazado': return <div className='icon_cont'><IoIosCloseCircleOutline size={16} /></div>
    //         case 'creado': return <div className='icon_cont'><IoIosAddCircleOutline size={16} /></div>
    //         default:
    //             break;
    //     }
    // }

    const phoneFormatter = (params) => {
        const val = typeof params === 'object' && params !== null ? params.value : params;
        if (!val) return "";

        const digits = String(val).replace(/\D/g, "");

        // +52 México (12 dígitos)
        if (digits.length === 12) {
            const country = digits.slice(0, 2);
            const phone = digits.slice(2);
            return `+${country} (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
        }

        // +1 US/Canadá (11 dígitos)
        if (digits.length === 11) {
            const country = digits.slice(0, 1);
            const phone = digits.slice(1);
            return `+${country} (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
        }

        // Local sin código (10 dígitos)
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }

        return val;
    };

    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success(t('guests.copied'))
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const handleShare = async (url) => {
        if (hasPendingInfo) {
            message.warning('Completa la información pendiente de tu invitación antes de compartir el link.')
            return
        }
        const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
        if (isMobileDevice && navigator.share) {
            try {
                await navigator.share({
                    title: invitation?.cover?.title?.text?.value ?? 'Evento',
                    text: '¡Te invitamos a un evento especial!',
                    url,
                });
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }
        await copyToClipboard(url);
    };

    const refreshPage = () => {
        getGuests()
        getTickets()
        getTables()
    }

    const onSaveNewTickets = async (newType) => {

        const { error } = await supabase
            .from('invitations')
            .update({ type: newType })
            .eq("id", id)


        if (error) {
            console.error('Error actualizando:', error)
        } else {
            setOpenCard(newType === 'open' ? true : false)
            message.success(t('guests.state_updated'))

        }
    };


    const chartData = {
        labels: ['A', 'B', 'C'],
        datasets: [
            {
                // label: '# of Votes',
                data: [confirmed, waiting, (tickets - (confirmed + waiting))],
                backgroundColor: [
                    '#6D3CFA',
                    '#6D3CFA50',
                    '#6D3CFA20',
                    // '#DCDCDC',
                ],
                borderColor: [
                    '#FFFFFF',
                ],
                borderWidth: 1.5,
            },
        ],
    };

    const options = {
        plugins: {
            legend: {
                display: false, // Ocultar la leyenda
            },
        },
    };

    const onHandleTickets = async (value) => {

        const { data, error } = await supabase
            .from('invitations')
            .update({ tickets: value })           // nuevo valor
            .eq('id', id)            // o usa .eq('mongo_id', '...') si prefieres
            .select('id, tickets')
            .single()

        if (error) {
            console.error(error)
        } else {
            setTickets(data.tickets)
            message.success(t('guests.passes_updated'))
        }
    }

    // Agrupa por familia (companion_id) solo entre quienes comparten alguno de
    // los `states` pedidos — así, si un acompañante avanza de estado distinto
    // al resto de su familia (ej. declinó mientras los demás confirmaron), se
    // separa del grupo original y se re-agrupa con quien sí comparta su nuevo
    // estado, en vez de quedar atrapado dentro del grupo de otra pestaña.
    const groupByFamilyForStates = (data, states) => {
        const relevant = data.filter((g) => states.includes(g.state));
        const clusters = new Map();

        relevant.forEach((g) => {
            const familyKey = g.companion_id === null ? g.id : Number(g.companion_id);
            if (!clusters.has(familyKey)) clusters.set(familyKey, []);
            clusters.get(familyKey).push(g);
        });

        return Array.from(clusters.values()).map((members) => {
            const principal = members.find((m) => m.companion_id === null);
            const leader = principal ?? members[0];
            const children = members.filter((m) => m.id !== leader.id);
            return {
                ...leader,
                __isGroupChild: false,
                children: children.map((c) => ({ ...c, __isGroupChild: true })),
            };
        });
    };

    const getGuests = async () => {

        const { data, error } = await supabase
            .from("guests")
            .select("*")
            .eq("invitation_id", id)

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {

            setRowData(data)
            setWaiting(data.filter((d) => d.state === 'esperando').length)
            setConfirmed(data.filter((d) => d.state === 'confirmado').length)
        }
    }



    const getTickets = async () => {

        const { data, error } = await supabase
            .from("invitations")
            .select("tickets, data")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            setTickets(data.tickets)
            setInvitation(data.data)
        }
    }

    const getNotifications = async () => {
        const { data, error } = await supabase
            .from('guests')
            .select('*')
            .eq('invitation_id', id)
            .order('last_update_date', { ascending: false }) // 👈 ordena descendente

        if (error) {
            console.error('Error al obtener invitados:', error)
            return []
        }
        setNotifications(
            data
                .sort((a, b) => new Date(b.last_update_date) - new Date(a.last_update_date))
        );
    }

    const getType = async () => {
        const { data, error } = await supabase
            .from('invitations')
            .select('type, credits, name, tags, owners, url_image, plan, label, phone_number, rsvp_deadline, event_date')
            .eq('id', id)
            .maybeSingle()

        if (error) {
            console.error('Error al obtener invitados:', error)
            return
        }


        setCredits(data.credits)
        setRsvpDeadline(data.rsvp_deadline ?? null)
        setEventDate(data.event_date ?? null)
        setName(data.name)
        setOpenCard(data.type === 'open' ? true : false)
        getGuests()
        setLocalTags(data.tags)
        setOwners(data.owners)
        setUrl_image(data.url_image)
        setPlan(data.plan)
        setInvLabel(data.label ?? null)
        setInvPhone(data.phone_number ?? null)
    }

    const getTables = async () => {
        if (id) {
            const { data, error } = await supabase
                .from('tables')
                .select('*')
                .eq('invitation_id', id)

            if (error) {
                console.error('Error al obtener mesas:', error)
                return
            }

            // console.log('mesas: ', data)
            // console.log('mesas: ', data)
            setTables(data)
        }
    }

    const exportFlatGuestsToExcel = (rows, fileName = "invitados.xlsx") => {
        // Mapa para resolver nombre de padre rápido
        const guestsMap = new Map(rows.map(g => [g.id, g.name]));

        const excelRows = rows.map(r => ({
            Nombre: r.name ?? "",
            Contacto: r.phone_number ?? "",
            Estado: r.state ?? "",
            Etiqueta: r.tag ?? "",
            Mesa: r.table
                ? (tables?.find(t => t.id === r.table)?.name ?? r.table)
                : "-",
            Prioridad: r.tier ?? "",
            "Es acompañante de": r.companion_id
                ? (guestsMap.get(Number(r.companion_id)) ?? "")
                : "",
        }));

        const ws = XLSX.utils.json_to_sheet(excelRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Invitados");

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], {
            type:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
        });

        saveAs(blob, fileName);
    };


    const handleCompanions = (id) => {
        const comps = rowData?.filter((row) => row.companion_id === id)
        return comps
    }

    const renderTag = (value) => {
        if (value == null) return "-";
        if (typeof value === "object") return "-";

        const str = String(value);

        return str.length > 14
            ? str.slice(0, 14) + "..."
            : str;
    };

    const isTagLong = (value) => {
        if (value == null) return "-";
        if (typeof value === "object") return "-";

        const str = String(value);

        return str.length > 14
            ? true
            : false;
    };

    const renderTagFull = (value) => {
        if (value == null) return "-";
        if (typeof value === "object") return "-";

        const str = String(value);

        return str
    }

    const formatAbsoluteDate = (isoString) => {
        const d = new Date(isoString);

        const day = d.getUTCDate();          // día absoluto (UTC)
        const monthIndex = d.getUTCMonth();  // 0-11 en UTC
        const year = d.getUTCFullYear();     // año en UTC

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        return `${day} ${months[monthIndex]} ${year}`;
    };

    const onSendInvitation = async (guest) => {
        const nowIso = new Date().toISOString();
        const guestPatch = {
            state: 'esperando',
            last_action: guest.state,
            last_action_by: 'admin',
            last_update_date: nowIso,
            invitation_sent_at: nowIso,
        };

        const { error: guestError } = await supabase
            .from('guests')
            .update(guestPatch)
            .eq('id', guest.id)
            .select('*')
            .maybeSingle();

        if (guestError) throw guestError;

        // Al invitar al líder del grupo, sus acompañantes se mueven junto con él
        // en vez de quedarse colgados en Lista de espera hasta moverlos a mano.
        const companionIds = rowData
            .filter((g) => g.companion_id === guest.id)
            .map((g) => g.id);

        if (companionIds.length > 0) {
            const { error: companionsError } = await supabase
                .from('guests')
                .update(guestPatch)
                .in('id', companionIds);

            if (companionsError) throw companionsError;
        }

        refreshPage()

    }

    // Idiomas que el invitado puede ver hoy (instalados y no deshabilitados) —
    // si hay al menos uno, al enviar se le pregunta al organizador en qué
    // idioma quiere que abra el link, en vez de mandar siempre español.
    const enabledExtraLanguages = (invitation?.generals?.languages ?? []).filter(
        (code) => !(invitation?.generals?.disabledLanguages ?? []).includes(code)
    )

    const labelForSendLangCode = (code) => POPULAR_LANGUAGES.find((l) => l.code === code)?.label ?? code

    // Dropdown de envío: un botón real por idioma disponible (no un Menu de
    // antd). Sin idiomas extra no tiene sentido preguntar, ese caso lo maneja
    // el propio botón de envío con un click directo (ver columnas de abajo).
    const renderSendLanguagePopup = (guest, retry) => (
        <div style={{
            background: '#fff', borderRadius: '12px', padding: '6px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '190px',
        }}>
            <Button
                className='primarybutton'
                style={{ justifyContent: 'space-between' }}
                onClick={() => onSedingInvitation(guest, retry, 'es')}
            >
                <span>{flagForLanguage('es')} Enviar en español</span>
                <ArrowRight size={14} />
            </Button>
            {enabledExtraLanguages.map((code) => (
                <Button
                    key={code}
                    className='primarybutton'
                    style={{ justifyContent: 'space-between' }}
                    onClick={() => onSedingInvitation(guest, retry, code)}
                >
                    <span>{flagForLanguage(code)} Enviar en {labelForSendLangCode(code)}</span>
                    <ArrowRight size={14} />
                </Button>
            ))}
        </div>
    )

    const onSedingInvitation = async (guest, retry, lang = 'es') => {
        if (hasPendingInfo) {
            message.warning('Completa la información pendiente de tu invitación antes de enviar.')
            return
        }

        if (!invitation?.cover?.title?.text?.value?.trim()) {
            message.warning(t('guests.warning_no_title'))
            return
        }

        setCreditSending()
        try {
            const payload = {
                invitationId: id,
                guestId: guest.id,
                guestName: guest.name,
                guestPhone: guest.phone_number.replace(/^\+/, ""),

                messaging_product: "whatsapp",
                to: guest.phone_number.replace(/^\+/, ""),
                type: "template",
                // Tres variantes sobre el mismo endpoint/registro:
                //  - retry → invitation_retry (utility, body solo con el título)
                //  - con rsvp_deadline → invitation_deadline (igual que v2 + {{3}}
                //    con la fecha límite, mismo formato que los reminders)
                //  - sin fecha → invitation_v2
                template: {
                    name: retry ? "invitation_retry" : rsvpDeadline ? "invitation_deadline" : "invitation_v2",
                    language: {
                        code: "es_MX",
                    },
                    components: [
                        {
                            type: "header",
                            parameters: [
                                {
                                    type: "image",
                                    image: {
                                        link: url_image ?? toFirstString(invitation.cover.image.prod),
                                    },
                                },
                            ],
                        },
                        {
                            type: "body",
                            parameters: retry
                                ? [
                                    {
                                        type: "text",
                                        text: invitation.cover.title.text.value,
                                    },
                                ]
                                : [
                                    {
                                        type: "text",
                                        text: `${invitation.cover.title.text.value} - ${formatAbsoluteDate(invitation.cover.date.value)}`,
                                    },
                                    {
                                        type: "text",
                                        text: guest.name,
                                    },
                                    // invitation_deadline agrega {{3}}: la fecha límite,
                                    // mismo formato que los reminders
                                    ...(rsvpDeadline ? [{
                                        type: "text",
                                        text: formatAbsoluteDateEs(rsvpDeadline),
                                    }] : []),
                                ],
                        },
                        {
                            type: "button",
                            sub_type: "url",
                            index: "0",
                            parameters: [
                                {
                                    type: "text",
                                    text: `${invitation?.generals?.event?.label}/${name}?password=${guest?.password}${lang && lang !== 'es' ? `&lang=${lang}` : ''}`,
                                },
                            ],
                        },
                    ],
                },
            };

            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/whats`,
                // "http://localhost:4000/api/whats",
                payload
            );
            if (response.data.ok) {
                if (!retry) {
                    onUpdateCredits()
                }
                setCreditSuccess()
                // El backend ya insertó el dispatch (status: 'processing') antes de
                // responder — no hay que esperar al realtime para verlo reflejado.
                setPendingApiSends((prev) => new Set(prev).add(guest.id))
                onSendInvitation(guest)
                getMessagesUpdates()

            }

        } catch (error) {
            clearCreditState()
            console.log(error.response?.data || error.message);
            throw error;
        }
    };

    const onUpdateCredits = async () => {
        // 1. Obtener créditos actuales
        const { data, error } = await supabase
            .from('invitations')
            .select('credits')
            .eq('id', id)
            .maybeSingle()

        if (error) {
            console.error('Error al obtener créditos:', error)
            return
        }

        if (!data) {
            console.error('No se encontró la invitación')
            return
        }

        const currentCredits = data.credits ?? 0

        // 2. Validar créditos disponibles
        if (currentCredits <= 0) {
            console.warn('No hay créditos disponibles')
            return
        }

        // 3. Restar un crédito
        const newCredits = currentCredits - 1

        // 4. Guardar créditos actualizados
        const { data: updateCredits, error: updateError } = await supabase
            .from('invitations')
            .update({ credits: newCredits })
            .eq('id', id)
            .select()

        if (updateError) {
            console.error('Error al actualizar créditos:', updateError)
            return
        }

        // console.log('update credits: ', updateCredits)

        setCredits(updateCredits?.[0]?.credits ?? newCredits)

        // console.log('Créditos actualizados correctamente:', newCredits)
    }

    // ── Recordatorios manuales de WhatsApp (Fase 1) ──────────────────────────

    // formatAbsoluteDateEs (mes en español, para el {{3}} del template y las
    // barras de fecha límite) vive en helpers/assets/eventDateTime — compartido
    // con SideEvents.

    const hasSentReminders = rowData.some((g) => (g.reminder_count ?? 0) > 0)

    // Guarda rsvp_deadline como UPDATE directo a la columna top-level — nunca
    // vía publish_invitation, para no generar una fila en invitation_versions
    // (contaminaría la señal del sistema de reviews). Fecha absoluta sin
    // timezone: se persiste como 'YYYY-MM-DD'.
    const onSaveRsvpDeadline = async (dateValue) => {
        if (!dateValue) return
        const newDeadline = dateValue.format('YYYY-MM-DD')

        const { error } = await supabase
            .from('invitations')
            .update({ rsvp_deadline: newDeadline })
            .eq('id', id)

        if (error) {
            console.error('Error al guardar rsvp_deadline:', error)
            message.error(t('guests.rsvp_deadline_error'))
            return
        }

        if (rsvpDeadline && newDeadline !== rsvpDeadline && hasSentReminders) {
            // No bloquea: los invitados ya recibieron recordatorios con la fecha anterior
            message.warning(t('guests.rsvp_deadline_changed_warning'))
        } else if (dateValue.diff(dayjs().startOf('day'), 'day') < 5) {
            message.warning(t('guests.rsvp_deadline_soon_warning'))
        } else {
            message.success(t('guests.rsvp_deadline_saved'))
        }

        setRsvpDeadline(newDeadline)
    }

    const rsvpDisabledDate = (d) => {
        if (!d) return false
        if (!d.isAfter(dayjs().startOf('day'), 'day')) return true // debe ser futura
        if (eventDate && d.isAfter(dayjs(eventDate), 'day')) return true // <= fecha del evento
        return false
    }

    // Motivo por el que un grupo no puede recibir recordatorio (null = elegible).
    // El botón se muestra deshabilitado con el motivo visible, nunca se oculta.
    const reminderBlockReason = (record) => {
        if (!rsvpDeadline) return { key: 'deadline', label: t('guests.reminder_no_deadline') }
        // Nota: no se valida invitation_sent_at — el botón solo se renderiza
        // cuando hay dispatch por API (processing/sent/delivered/read), lo que
        // ya garantiza que la invitación se envió, incluso en registros viejos
        // con invitation_sent_at en null.
        // Lada por PREFIJO +52 (no por longitud): hay números válidos con el
        // '1' de móvil intercalado (+521...) que una longitud exacta rechazaría.
        if (!/^\+52\d+/.test(record.phone_number)) return { key: 'phone', label: t('guests.tooltip_national_only') }
        // Máximo un recordatorio por día por invitado (last_reminder_at lo
        // escribe el backend tras cada envío exitoso).
        if (record.last_reminder_at && dayjs(record.last_reminder_at).isSame(dayjs(), 'day')) return { key: 'daily', label: t('guests.reminder_daily_limit') }
        if (credits < 1) return { key: 'credits', label: t('guests.reminder_no_credits') }
        return null
    }

    const onSendReminder = async (guest, lang = 'es') => {
        if (hasPendingInfo) {
            message.warning('Completa la información pendiente de tu invitación antes de enviar.')
            return
        }

        if (!invitation?.cover?.title?.text?.value?.trim()) {
            message.warning(t('guests.warning_no_title'))
            return
        }

        if (!rsvpDeadline) return

        setCreditSending(t('guests.reminder_sending_label'))
        try {
            const payload = {
                invitationId: id,
                guestId: guest.id,
                guestName: guest.name,
                guestPhone: guest.phone_number.replace(/^\+/, ""),

                messaging_product: "whatsapp",
                to: guest.phone_number.replace(/^\+/, ""),
                type: "template",
                template: {
                    name: "reminder",
                    language: {
                        code: "es_MX",
                    },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                {
                                    type: "text",
                                    text: guest.name,
                                },
                                {
                                    type: "text",
                                    text: invitation.cover.title.text.value,
                                },
                                {
                                    type: "text",
                                    text: formatAbsoluteDateEs(rsvpDeadline),
                                },
                            ],
                        },
                        {
                            type: "button",
                            sub_type: "url",
                            index: "0",
                            parameters: [
                                {
                                    type: "text",
                                    text: `${invitation?.generals?.event?.label}/${name}?password=${guest?.password}${lang && lang !== 'es' ? `&lang=${lang}` : ''}`,
                                },
                            ],
                        },
                    ],
                },
            };

            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/whats/reminders`,
                payload
            );

            if (response.data.ok) {
                // Cobrar solo tras éxito: si el envío falla, no se descuenta.
                onUpdateCredits()
                setCreditSuccess()
                // El backend ya incrementó reminder_count/last_reminder_at en el
                // principal — refrescar guests para ver el contador actualizado.
                getGuests()
            }
        } catch (error) {
            clearCreditState()
            message.error(t('guests.reminder_sent_error'))
            console.log(error.response?.data || error.message);
        }
    };

    // Copia del patrón de renderSendLanguagePopup (envío inicial), pero
    // disparando el recordatorio: un botón real por idioma disponible.
    const renderReminderLanguagePopup = (guest) => (
        <div style={{
            background: '#fff', borderRadius: '12px', padding: '6px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '190px',
        }}>
            <Button
                className='primarybutton'
                style={{ justifyContent: 'space-between' }}
                onClick={() => onSendReminder(guest, 'es')}
            >
                <span>{flagForLanguage('es')} Enviar en español</span>
                <ArrowRight size={14} />
            </Button>
            {enabledExtraLanguages.map((code) => (
                <Button
                    key={code}
                    className='primarybutton'
                    style={{ justifyContent: 'space-between' }}
                    onClick={() => onSendReminder(guest, code)}
                >
                    <span>{flagForLanguage(code)} Enviar en {labelForSendLangCode(code)}</span>
                    <ArrowRight size={14} />
                </Button>
            ))}
        </div>
    )



    const addGuestToTable = async (table, guest) => {

        try {
            const { error } = await supabase
                .from("guests")
                .update({
                    table: table.id,
                    last_action_by: 'admin',
                    last_update_date: new Date(), // si tienes este campo en guests
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

        } catch (err) {
            console.error("Error inesperado:", err);
            return null;
        }

    };


    const getMessagesUpdates = async () => {

        try {
            const { data, error } = await supabase
                .rpc('get_latest_invitation_dispatches', {
                    p_invitation_id: id
                });

            if (error) {
                console.error('Error al obtener dispatches de mensajes:', error)
                return
            }

            setMessagesDispatch(data)
        } catch (error) {
            console.log(error)
        }
    }

    const dispatchMap = useMemo(() => {
        const map = {};

        messagesDispatch.forEach(m => {
            map[m.guest_id] = m;
        });

        return map;
    }, [messagesDispatch]);

    // Ya llegó el dispatch real (fetch inmediato, realtime o refresh de página) —
    // se puede sacar de "pendiente", su status real toma el control desde dispatchMap.
    useEffect(() => {
        setPendingApiSends((prev) => {
            if (prev.size === 0) return prev;
            const next = new Set(prev);
            messagesDispatch.forEach((m) => next.delete(m.guest_id));
            return next.size === prev.size ? prev : next;
        });
    }, [messagesDispatch]);


    useEffect(() => {
        if (!id) return;

        const u1 = subscribe('guests', (payload) => {
            const row = payload.new || payload.old;
            if (!row || String(row.invitation_id) !== String(id)) return;
            refreshPage();
        });

        const u2 = subscribe('invitation_message_dispatches', (payload) => {
            const row = payload.new || payload.old;
            console.log('[GuestsPage] dispatch event received:', row, '| matches this invitation:', row && String(row.invitation_id) === String(id));
            if (!row || String(row.invitation_id) !== String(id)) return;
            getMessagesUpdates();
            refreshPage();
        });

        return () => { u1(); u2(); };
    }, [id]);


    useEffect(() => {
        setCreatedData(groupByFamilyForStates(rowData, ['creado']))
        setWaitingData(groupByFamilyForStates(rowData, ['esperando']))
        setConfirmedData(groupByFamilyForStates(rowData, ['confirmado', 'asistente']))
        setCallededData(groupByFamilyForStates(rowData, ['rechazado']))
        setIsLoading(false)
        // Poda la selección bulk: si un guest ya no está en 'creado' (se envió
        // o se marcó como invitado), sale de la selección solo.
        setBulkSelected((prev) => {
            if (prev.size === 0) return prev
            const stillCreated = new Set(rowData.filter((g) => g.state === 'creado').map((g) => g.id))
            const next = new Set([...prev].filter((id) => stillCreated.has(id)))
            return next.size === prev.size ? prev : next
        })
    }, [rowData])

    useEffect(() => {
        getNotifications()
    }, [drawerState])

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 750)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Si hay un lote de envío masivo en curso para esta invitación (p. ej. tras
    // recargar la página), revivir la isla de progreso.
    const getActiveBatch = async () => {
        const { data } = await supabase
            .from('invitation_send_batches')
            .select('id, total, sent_count, failed_count, status')
            .eq('invitation_id', id)
            .is('side_event_id', null)
            .eq('status', 'processing')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (data) {
            setActiveBatch({ id: data.id, total: data.total, sent: data.sent_count, failed: data.failed_count, status: data.status })
        }
    }

    // Polling del lote activo cada 2.5s — al completarse se refrescan créditos
    // (por el reembolso de fallidos) y se deja la isla en estado final.
    useEffect(() => {
        if (!activeBatch || activeBatch.status !== 'processing') return

        const timer = setInterval(async () => {
            const { data } = await supabase
                .from('invitation_send_batches')
                .select('total, sent_count, failed_count, status')
                .eq('id', activeBatch.id)
                .maybeSingle()

            if (!data) return
            setActiveBatch((prev) => prev ? { ...prev, total: data.total, sent: data.sent_count, failed: data.failed_count, status: data.status } : prev)
            if (data.status === 'completed') {
                getType()
            }
        }, 2500)

        return () => clearInterval(timer)
    }, [activeBatch?.id, activeBatch?.status])

    useEffect(() => {
        if (id) {
            setIsLoading(false)
            getTickets()
            getNotifications()
            getType()
            getTables()
            getMessagesUpdates()
            getActiveBatch()
        }
    }, [id])

    useEffect(() => {
        setCopyTickets(tickets)
    }, [activeTickets])

    useEffect(() => {
        if (onEditTickets) {
            setOnShare(false)
        }
    }, [onEditTickets])

    useEffect(() => {
        if (onShare) {
            setOnEditTickets(false)
        }
    }, [onShare])


    // A partir de aquí: helpers que invocan columns/openColumns.render(...) de forma
    // síncrona (no vía <Table>, que difiere su propio render a después de que este
    // componente termine de ejecutarse). Por eso deben declararse después de TODOS
    // los helpers que esas columnas puedan llamar (phoneFormatter, handleMessageStatus,
    // onSendInvitation, etc.) — si no, revientan con "Cannot access ... before initialization".

    // Nota: el rediseño reemplazó la lista tipo tabla (encabezado + celdas
    // de ancho fijo) por tarjetas fluidas — ver renderGuestCard más abajo.

    // Fecha límite de confirmación (rsvp_deadline). El rediseño la baja de
    // banner a una línea de texto bajo el toolbar: etiqueta, fecha y un enlace
    // "Cambiar" que abre el DatePicker (que vive oculto, solo como ancla del
    // popup). Sin fecha límite no se puede enviar ningún recordatorio ({{3}}
    // del template es obligatorio), así que el empty state invita a definirla.
    // El DatePicker de la fecha límite no tiene disparador visible propio: vive
    // oculto y lo abre el enlace / botón que lo acompaña.
    const renderRsvpPicker = (slot) => (
        <DatePicker
            open={rsvpPickerSlot === slot}
            onOpenChange={(next) => setRsvpPickerSlot(next ? slot : null)}
            value={rsvpDeadline ? dayjs(rsvpDeadline) : null}
            onChange={onSaveRsvpDeadline}
            disabledDate={rsvpDisabledDate}
            allowClear={false}
            placeholder={t('guests.rsvp_deadline_placeholder')}
            getPopupContainer={() => document.body}
            className="gx-deadline-picker"
        />
    )

    // Sin fecha definida no se puede enviar ningún recordatorio ({{3}} del
    // template es obligatorio). Se anuncia como alerta y va ARRIBA del buscador,
    // para que no se pase por alto.
    const renderRsvpDeadlineAlert = (slot) => {
        if (rsvpDeadline) return null
        return (
            <div className="gx-alert gx-alert--accent gx-deadline-alert">
                <div className="gx-alert-badge"><BellRing size={16} /></div>
                <div className="gx-alert-texts">
                    <div className="gx-alert-title">{t('guests.rsvp_deadline_alert_title')}</div>
                    <div className="gx-alert-text">{t('guests.rsvp_deadline_alert_text')}</div>
                </div>
                <span className="gx-deadline-anchor">
                    <button
                        type="button"
                        className="gx-btn gx-btn--accent gx-btn--sm"
                        onClick={() => setRsvpPickerSlot(slot)}
                    >
                        {t('guests.rsvp_deadline_define')}
                    </button>
                    {renderRsvpPicker(slot)}
                </span>
            </div>
        )
    }

    // Ya definida: línea de texto discreta DEBAJO del buscador.
    const renderRsvpDeadlineLine = (slot) => {
        if (!rsvpDeadline) return null
        return (
            <div className="gx-deadline">
                <span className="gx-deadline-label">{t('guests.rsvp_deadline_label')}</span>
                <span className="gx-deadline-value">{formatAbsoluteDateEs(rsvpDeadline)}</span>
                <span className="gx-deadline-anchor">
                    <button type="button" className="gx-deadline-link" onClick={() => setRsvpPickerSlot(slot)}>
                        {t('guests.rsvp_deadline_change')}
                    </button>
                    {renderRsvpPicker(slot)}
                </span>
            </div>
        )
    }

    // ── Bulk shipment (tab Lista de espera) ─────────────────────────────────

    const toggleBulkSelect = (guestId, checked) => {
        setBulkSelected((prev) => {
            const next = new Set(prev)
            if (checked) next.add(guestId)
            else next.delete(guestId)
            return next
        })
    }

    // Enviable = con número y lada +52. En modo envío solo estos bloques se
    // pueden seleccionar; el resto se atenúa con su motivo visible.
    const isSendableGuest = (g) => /^\+52\d+/.test(g.phone_number)

    const bulkSelectedGuests = rowData.filter((g) => bulkSelected.has(g.id) && g.state === 'creado')
    const bulkEligibleGuests = bulkSelectedGuests.filter(isSendableGuest)

    const exitSendMode = () => {
        setSendMode(false)
        setBulkSelected(new Set())
    }

    // Payload de Graph API para el envío inicial (misma lógica de templates que
    // onSedingInvitation: con rsvp_deadline → invitation_deadline, sin fecha →
    // invitation_v2). Duplicado a propósito: el flujo individual no se toca.
    const buildInvitationTemplatePayload = (guest, lang = 'es') => ({
        messaging_product: "whatsapp",
        to: guest.phone_number.replace(/^\+/, ""),
        type: "template",
        template: {
            name: rsvpDeadline ? "invitation_deadline" : "invitation_v2",
            language: { code: "es_MX" },
            components: [
                {
                    type: "header",
                    parameters: [
                        { type: "image", image: { link: url_image ?? toFirstString(invitation.cover.image.prod) } },
                    ],
                },
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: `${invitation.cover.title.text.value} - ${formatAbsoluteDate(invitation.cover.date.value)}` },
                        { type: "text", text: guest.name },
                        ...(rsvpDeadline ? [{ type: "text", text: formatAbsoluteDateEs(rsvpDeadline) }] : []),
                    ],
                },
                {
                    type: "button",
                    sub_type: "url",
                    index: "0",
                    parameters: [
                        { type: "text", text: `${invitation?.generals?.event?.label}/${name}?password=${guest?.password}${lang && lang !== 'es' ? `&lang=${lang}` : ''}` },
                    ],
                },
            ],
        },
    })

    // Reserva de créditos del lote: un solo UPDATE (leer y restar N), en vez de
    // N descuentos. El backend reembolsa los fallidos al cerrar el lote.
    const onReserveCredits = async (amount) => {
        const { data, error } = await supabase
            .from('invitations')
            .select('credits')
            .eq('id', id)
            .maybeSingle()

        if (error || !data) {
            console.error('Error al reservar créditos:', error)
            return
        }

        const newCredits = Math.max((data.credits ?? 0) - amount, 0)
        const { error: updateError } = await supabase
            .from('invitations')
            .update({ credits: newCredits })
            .eq('id', id)

        if (updateError) {
            console.error('Error al reservar créditos:', updateError)
            return
        }
        setCredits(newCredits)
    }

    // Crea el lote en el backend (202 inmediato — la cola se procesa allá) y
    // reserva los créditos. El progreso llega por polling a la tabla del lote.
    const onBulkSend = async () => {
        if (hasPendingInfo) {
            message.warning('Completa la información pendiente de tu invitación antes de enviar.')
            return
        }
        if (!invitation?.cover?.title?.text?.value?.trim()) {
            message.warning(t('guests.warning_no_title'))
            return
        }
        const targets = bulkEligibleGuests
        if (targets.length === 0) return
        if (credits < targets.length) {
            setBuyCreditsOpen(true)
            return
        }

        setBulkSending(true)
        try {
            const items = targets.map((g) => ({
                guestId: g.id,
                guestName: g.name,
                guestPhone: g.phone_number.replace(/^\+/, ""),
                payload: buildInvitationTemplatePayload(g),
            }))

            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/whats/bulk`,
                { invitationId: id, items }
            )

            if (response.data.ok) {
                await onReserveCredits(items.length)
                setActiveBatch({
                    id: response.data.data.batchId,
                    total: items.length,
                    sent: 0,
                    failed: 0,
                    status: 'processing',
                })
                exitSendMode()
            }
        } catch (error) {
            message.error(t('guests.bulk_error'))
            console.log(error.response?.data || error.message)
        } finally {
            setBulkSending(false)
        }
    }

    // Checkbox manual del bulk: círculo grande con los tokens azules del tab
    // de creado. El check aparece solo cuando el bloque está seleccionado.
    const renderBulkCheck = (record) => {
        const checked = bulkSelected.has(record.id)
        return (
            <button
                type='button'
                role='checkbox'
                aria-checked={checked}
                onClick={() => toggleBulkSelect(record.id, !checked)}
                className={`bulk-check-circle ${checked ? 'bulk-check-circle--checked' : ''}`}
            >
                {checked && <Check size={14} strokeWidth={3} />}
            </button>
        )
    }


    // Vive en el tabBarExtraContent del tab de Lista de espera: fuera del modo,
    // "Crear envío" (entra al modo); dentro, "Enviar todos (n)" + "Cancelar".
    // Tamaño normal de botón de antd.
    const renderBulkActionsBar = () => {
        if (!SHOW_BULK_SEND) return null;
        if (!sendMode) {
            return (
                <Button
                    disabled={plan !== 'pro'}
                    onClick={() => setSendMode(true)}
                    icon={<Send size={14} />}
                    className='bulk-send-btn'
                    style={{ borderRadius: 99 }}
                >
                    {t('guests.bulk_create')}
                </Button>
            )
        }

        const eligibleCount = bulkEligibleGuests.length
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', flexShrink: 0, justifyContent: 'flex-end' }}>
                <Button
                    loading={bulkSending}
                    disabled={eligibleCount === 0}
                    onClick={onBulkSend}
                    icon={<Send size={14} />}
                    className='bulk-send-btn'
                    style={{ borderRadius: 99, flexShrink: 0 }}
                >
                    {`${t('guests.bulk_send_all')} (${eligibleCount})`}
                </Button>

                <Button
                    disabled={bulkSending}
                    onClick={exitSendMode}
                    className='secondarybutton'
                    style={{ borderRadius: 99, flexShrink: 0 }}
                >
                    {t('guests.bulk_cancel')}
                </Button>
            </div>
        )
    }

    // Vista "individual" de Asistencia confirmada: un renglón plano por persona,
    // sin agrupar por familia (líder y acompañantes por igual).
    const confirmedFlatData = useMemo(
        () => rowData.filter((g) => g.state === 'confirmado' || g.state === 'asistente'),
        [rowData]
    );

    // La vista "por mesa" de confirmados se retiró junto con el toggle
    // Por grupo / Individual: ya no había control que la activara.

    // ─────────────────────────────────────────────────────────────────────
    // Rediseño "Gestion de invitados" (Claude Design)
    //
    // La lista deja de ser una tabla con encabezado y columnas de ancho fijo:
    // cada bloque (titular + acompañantes) es una tarjeta fluida. Los botones
    // de acción se siguen tomando de la columna "send" para no duplicar la
    // lógica de envío / recordatorio / asignación de mesa, que vive ahí.
    // ─────────────────────────────────────────────────────────────────────

    const initialsOf = (value = '') => {
        const parts = String(value).trim().split(/\s+/)
        return (((parts[0] || '')[0] || '') + ((parts[1] || '')[0] || '')) || '?'
    }

    const relativeWhen = (iso) => {
        if (!iso) return null
        const d = dayjs(iso)
        if (!d.isValid()) return null
        return d.locale(i18n.language?.startsWith('en') ? 'en' : 'es').fromNow()
    }

    const magicLinkFor = (record) =>
        `https://www.iattend.events/${invitation?.generals?.event?.label}/${name}?password=${record.password}`

    // Estado de entrega del tab "Esperando respuesta": etiqueta ya traducida,
    // color del punto y tono que hereda el borde de la tarjeta.
    // `badge` elige la paleta de estado de index.css (--{color}-color / --{color}-bg);
    // `tone` es lo que tiñe el borde de la tarjeta.
    const sendStatusInfo = (record) => {
        const status = effectiveMessageStatus(record)
        const when = relativeWhen(record.invitation_sent_at || record.last_update_date)

        switch (status) {
            case 'failed':
                return { label: t('guests.msg_failed'), badge: 'red', tone: 'failed', when }
            case 'read':
                return { label: t('guests.msg_read_full'), badge: 'yellow', tone: 'read', when }
            case 'delivered':
                return { label: t('guests.msg_delivered'), badge: 'blue', tone: null, when }
            case 'sent':
                return { label: t('guests.msg_sent'), badge: 'blue', tone: null, when }
            case 'processing':
                return { label: t('guests.msg_processing'), badge: 'gray', tone: null, when }
            // Envío manual: no hay dispatch por API, así que no sabemos nada de
            // la entrega — neutro.
            default:
                return { label: t('guests.msg_manual'), badge: 'gray', tone: 'muted', when }
        }
    }

    // Etiqueta de mesa del tab Confirmados.
    const tableLabelFor = (record) => {
        const assigned = tables?.find((tb) => tb.id === record.table)
        if (!assigned) return t('guests.card_no_table')
        return `${t('guests.table_prefix')} ${assigned.number}`
    }

    // Acción del tab Por invitar: píldora morada "Enviar invitación" (WhatsApp)
    // y, a su derecha, un botón de check para marcarlo como invitado a mano.
    // El envío se deshabilita sin lada nacional, sin créditos o sin plan Pro;
    // el check siempre está disponible.
    const renderCreatedAction = (record) => {
        if (record.companion_id !== null && record.companion_id !== undefined) return null

        // Modo envío masivo: la acción es el checkbox de selección
        if (SHOW_BULK_SEND && sendMode) {
            return isSendableGuest(record) ? renderBulkCheck(record) : null
        }

        const isNational = /^\+52\d+/.test(record.phone_number)
        const blocked = !isNational || credits <= 0 || plan !== 'pro'
        const blockReason = plan !== 'pro'
            ? ''
            : !isNational
                ? t('guests.tooltip_national_only')
                : credits <= 0
                    ? t('guests.reminder_no_credits')
                    : ''

        const sendBtn = (
            <button
                type="button"
                className={`gx-btn gx-btn--accent gx-btn--sm ${plan !== 'pro' ? 'pro_badge' : ''}`}
                aria-disabled={blocked}
                onClick={() => {
                    if (blocked) return
                    if (enabledExtraLanguages.length === 0) onSedingInvitation(record, false)
                }}
            >
                {t('guests.btn_send_invitation')}
            </button>
        )

        return (
            <>
                {!SHOW_BULK_SEND && (
                    <Tooltip placement="topRight" color="var(--brand-color-500)" title={blockReason}>
                        {!blocked && enabledExtraLanguages.length > 0 ? (
                            <Dropdown trigger={['click']} popupRender={() => renderSendLanguagePopup(record, false)}>
                                {sendBtn}
                            </Dropdown>
                        ) : sendBtn}
                    </Tooltip>
                )}

                <Tooltip placement="topRight" color="var(--brand-color-500)" title={t('guests.mark_arrow_tooltip')}>
                    <button
                        type="button"
                        className="gx-icon-btn gx-icon-btn--primary"
                        onClick={() => onSendInvitation(record)}
                        aria-label={t('guests.mark_arrow_tooltip')}
                    >
                        <Check size={15} />
                    </button>
                </Tooltip>
            </>
        )
    }

    // Acción del tab Esperando respuesta. El chip de estado ya no vive aquí —
    // se muestra al inicio de la tarjeta (.gx-status) — así que el slot queda
    // solo con el botón: "Reintentar" en morado cuando el envío falló y
    // "Recordar" en blanco para el resto.
    //
    // Nota: los botones usan aria-disabled en vez de disabled. Un <button>
    // deshabilitado no emite eventos de mouse y el Tooltip con el motivo del
    // bloqueo (sin fecha límite, sin créditos, lada no mexicana...) nunca se
    // vería.
    const renderSentAction = (record) => {
        if (record.companion_id !== null && record.companion_id !== undefined) return null

        const status = effectiveMessageStatus(record)

        // Envío manual (sin dispatch por API): no hay recordatorio que mandar.
        if (status === 'undefined') return null

        if (status === 'failed') {
            const blocked = !/^\+52\d+/.test(record.phone_number) || credits <= 0
            const retryBtn = (
                <button
                    type="button"
                    className="gx-btn gx-btn--accent gx-btn--sm"
                    aria-disabled={blocked}
                    onClick={() => {
                        if (blocked) return
                        if (enabledExtraLanguages.length === 0) onSedingInvitation(record, true)
                    }}
                >
                    {t('guests.msg_retry')}
                </button>
            )
            return (
                <Tooltip placement="topRight" color="var(--brand-color-500)" title={t('guests.msg_retry_tooltip')}>
                    {!blocked && enabledExtraLanguages.length > 0 ? (
                        <Dropdown trigger={['click']} popupRender={() => renderSendLanguagePopup(record, true)}>
                            {retryBtn}
                        </Dropdown>
                    ) : retryBtn}
                </Tooltip>
            )
        }

        const reason = reminderBlockReason(record)
        const count = record.reminder_count ?? 0
        const blocked = !!reason && reason.key !== 'credits'

        const remindBtn = (
            <button
                type="button"
                className="gx-btn gx-btn--ghost gx-btn--sm"
                aria-disabled={blocked}
                onClick={() => {
                    if (blocked) return
                    if (reason?.key === 'credits') setBuyCreditsOpen(true)
                    else if (!reason && enabledExtraLanguages.length === 0) onSendReminder(record, 'es')
                }}
            >
                {t('guests.hero_sent_remind')}
            </button>
        )

        const content = !reason && enabledExtraLanguages.length > 0 ? (
            <Dropdown trigger={['click']} popupRender={() => renderReminderLanguagePopup(record)}>
                {remindBtn}
            </Dropdown>
        ) : remindBtn

        return (
            <Tooltip
                placement="topRight"
                color="var(--orange-bg)"
                title={
                    <span style={{ color: 'var(--orange-color)', fontWeight: 600, textAlign: 'center' }}>
                        {reason
                            ? reason.label
                            : count > 0
                                ? `${t('guests.reminder_count_tooltip')}: ${count}`
                                : t('guests.reminder_btn_tooltip')}
                    </span>
                }
            >
                {blocked ? content : (
                    <Badge count={count} size="small" color="var(--brand-color-500)" title="" offset={[-6, 2]}>
                        {content}
                    </Badge>
                )}
            </Tooltip>
        )
    }

    // Acción de mesa del tab Confirmados: píldora morada para asignar y píldora
    // blanca con la mesa ya asignada. Reemplaza el render de la columna "send"
    // (que sigue vivo para las columnas viejas del modo lista abierta).
    const renderTableAction = (record) => {
        const assigned = tables?.find((tb) => tb.id === record.table)

        if (assigned) {
            return (
                <Tooltip title={assigned.name || ''}>
                    <span className="gx-table-pill">{tableLabelFor(record)}</span>
                </Tooltip>
            )
        }

        return (
            <Dropdown
                trigger={['click']}
                placement="bottomRight"
                popupRender={() => renderTablePickerPopup(record)}
            >
                <button type="button" className="gx-btn gx-btn--accent gx-btn--sm">
                    {t('guests.btn_assign_table')}
                </button>
            </Dropdown>
        )
    }

    const openGuestDrawer = (record) => setDrawerState({
        currentGuest: record,
        onEditGuest: true,
        companions: handleCompanions(record.id),
        visible: true,
    })

    const renderCopyLink = (record, small = false) => (
        <Tooltip title={t('guests.tooltip_copy_magic_link')}>
            <button
                type="button"
                className={`gx-pill ${small ? 'gx-pill--sm' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleShare(magicLinkFor(record)) }}
            >
                <Link2 size={small ? 13 : 14} />
                <span>{t('guests.card_copy_link')}</span>
            </button>
        </Tooltip>
    )

    // Los chips del bloque: etiqueta libre, categoría y prioridad.
    // Columna: una fila con los badges (estado de envío, etiqueta, prioridad) y,
    // debajo, la fecha del envío / último cambio de estado.
    const renderCardChips = (record, muted = false, status = null) => (
        <div className="gx-chips-col">
            <div className="gx-chips">
                {status && (
                    <span className="gx-status-badge" data-tone={status.badge}>{status.label}</span>
                )}
                {record.tag && (
                    <Tooltip title={isTagLong(record.tag) ? renderTagFull(record.tag) : ''}>
                        <span className={`gx-chip ${muted ? 'gx-chip--muted' : ''}`}>{renderTag(record.tag)}</span>
                    </Tooltip>
                )}
                {record.tier && !muted && (
                    <Tooltip title={handlePriority(record.tier)}>
                        <span className={`gx-chip gx-chip--tier-${record.tier}`}>{record.tier}</span>
                    </Tooltip>
                )}
            </div>
            {status?.when && <span className="gx-status-when">{status.when}</span>}
        </div>
    )

    // Una tarjeta = un bloque. `children` son los acompañantes; en vista plana
    // llega vacío y cada invitado se dibuja por separado.
    const renderGuestCard = (record, tabKey, children = []) => {
        const actionNode = tabKey === 'confirmado'
            ? renderTableAction(record)
            : tabKey === 'esperando'
                ? renderSentAction(record)
                : tabKey === 'creado'
                    ? renderCreatedAction(record)
                    : null
        const status = tabKey === 'esperando' ? sendStatusInfo(record) : null
        const isRejected = tabKey === 'rechazado'
        const isConfirmed = tabKey === 'confirmado'

        const selectable = sendMode && record.state === 'creado' && isSendableGuest(record)
        const dimmed = sendMode && record.state === 'creado' && !isSendableGuest(record)
        const tone = isRejected ? 'muted' : status?.tone ?? null

        return (
            <div
                key={record.id}
                className="gx-card"
                data-tone={tone || undefined}
                data-selected={bulkSelected.has(record.id) || undefined}
                data-dimmed={dimmed || undefined}
                onClick={selectable ? (e) => {
                    if (e.target.closest('button, input, a, .ant-dropdown')) return
                    toggleBulkSelect(record.id, !bulkSelected.has(record.id))
                } : undefined}
                style={selectable ? { cursor: 'pointer' } : undefined}
            >
                <div className="gx-row">
                    <div className={`gx-avatar ${isConfirmed ? 'gx-avatar--accent' : ''} ${isRejected ? 'gx-avatar--muted' : ''}`}>
                        {initialsOf(record.name)}
                    </div>

                    <div className="gx-identity">
                        <span className="gx-name" title={record.name}>{record.name}</span>
                        <span className="gx-sub">
                            <span>{record.phone_number ? phoneFormatter(record.phone_number) : t('guests.card_no_phone')}</span>
                            {record.password && (
                                <Tooltip title={t('guests.tooltip_copy_password')}>
                                    <button
                                        type="button"
                                        className="gx-code"
                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(record.password) }}
                                    >
                                        · {record.password}
                                    </button>
                                </Tooltip>
                            )}
                        </span>
                    </div>

                    {renderCardChips(record, isRejected, status)}

                    <div className="gx-spacer" />

                    {!isRejected && renderCopyLink(record)}

                    {isRejected && record.last_update_date && (
                        <span className="gx-when">{relativeWhen(record.last_update_date)}</span>
                    )}

                    {actionNode && <div className="gx-action">{actionNode}</div>}

                    <Tooltip title={t('guests.card_open')}>
                        <button
                            type="button"
                            className="gx-chev"
                            onClick={(e) => { e.stopPropagation(); openGuestDrawer(record) }}
                        >
                            <ChevronRight size={15} />
                        </button>
                    </Tooltip>
                </div>

                {children.length > 0 && (
                    <div className="gx-companions">
                        {children.map((child) => (
                            <div key={child.id} className="gx-companion">
                                <span className="gx-companion-name" title={child.name}>{child.name}</span>
                                <div className="gx-spacer" />
                                {!isRejected && renderCopyLink(child, true)}
                                <span className="gx-companion-note">
                                    {tabKey === 'creado'
                                        ? t('guests.card_same_send')
                                        : isConfirmed
                                            ? ((child.table || record.table)
                                                ? tableLabelFor(child.table ? child : record)
                                                : t('guests.card_seats_with', { name: String(record.name).split(' ')[0] }))
                                            : isRejected
                                                ? ''
                                                : t('guests.card_replies_with', { name: String(record.name).split(' ')[0] })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    const renderCardList = (data, tabKey) => {
        if (!data || data.length === 0) {
            return <div className="gx-empty">{t('guests.no_guests')}</div>
        }
        return (
            <div className="gx-list">
                {data.map((group) => renderGuestCard(group, tabKey, group.children ?? []))}
            </div>
        )
    }

    // Vista sin agrupar (hay búsqueda/filtro activo): cada coincidencia es su
    // propia tarjeta, sin la jerarquía titular → acompañantes.
    const renderFlatCardList = (data, tabKey) => {
        if (!data || data.length === 0) {
            return <div className="gx-empty">{t('guests.no_guests')}</div>
        }
        return (
            <div className="gx-list">
                {data.map((guest) => renderGuestCard({ ...guest, __isGroupChild: false }, tabKey, []))}
            </div>
        )
    }

    // ── Orden de la lista ────────────────────────────────────────────────
    // El rediseño quita el encabezado de columnas, así que el sort que vivía
    // ahí se mueve a esta fila de chips. Mismo ciclo: asc → desc → sin orden.

    const SORT_OPTIONS = {
        creado: [{ column: 'tier', label: 'guests.col_priority' }],
        esperando: [
            { column: 'tier', label: 'guests.col_priority' },
            { column: 'estado', label: 'guests.col_state' },
        ],
        confirmado: [
            { column: 'tier', label: 'guests.col_priority' },
            { column: 'mesa', label: 'guests.col_table' },
        ],
        rechazado: [{ column: 'tier', label: 'guests.col_priority' }],
    }

    const renderSortBar = (tabKey) => {
        const options = SORT_OPTIONS[tabKey] ?? []
        if (options.length === 0) return null
        const sort = activeSort[tabKey] || { column: null, dir: null }

        return (
            <div className="gx-sortbar">
                <span className="gx-sortbar-label">{t('guests.sort_by')}</span>
                {options.map((o) => {
                    const dir = sort.column === o.column ? sort.dir : null
                    return (
                        <button
                            key={o.column}
                            type="button"
                            className="gx-sort-chip"
                            data-active={dir ? true : undefined}
                            onClick={() => cycleTabSort(tabKey, o.column)}
                        >
                            <span>{t(o.label)}</span>
                            {dir === 'asc' ? <ArrowUp size={13} />
                                : dir === 'desc' ? <ArrowDown size={13} />
                                    : <ArrowUpDown size={13} />}
                        </button>
                    )
                })}

                {tabKey === 'rechazado' && hasActiveFilters && (
                    <button
                        type="button"
                        className="gx-sort-chip"
                        onClick={() => { setSearchUser(null); clearAllFilters() }}
                    >
                        {t('guests.filters_clear')}
                    </button>
                )}
            </div>
        )
    }

    // ── Banner de cabecera de cada tab ───────────────────────────────────

    const renderTabHero = (tabKey) => {
        if (tabKey === 'creado') {
            const pending = countGuestRows(createdData)
            if (pending === 0) {
                return (
                    <div className="gx-hero gx-hero--plain">
                        <div className="gx-hero-texts">
                            <div className="gx-hero-title">{t('guests.hero_created_empty_title')}</div>
                            <div className="gx-hero-text">{t('guests.hero_created_empty_text')}</div>
                        </div>
                    </div>
                )
            }
            return (
                <div className="gx-hero gx-hero--dark">
                    <div className="gx-hero-texts">
                        <div className="gx-hero-title">{t('guests.hero_created_title', { count: pending })}</div>
                        <div className="gx-hero-text">{t('guests.hero_created_text')}</div>
                    </div>
                    {/* El CTA del mockup es el envío masivo. Con SHOW_BULK_SEND
                        apagado el banner se queda solo con el mensaje: "Nuevo
                        invitado" ya vive en el toolbar de la sección. */}
                    {SHOW_BULK_SEND && (
                        <button
                            type="button"
                            className="gx-btn gx-btn--lia"
                            disabled={plan !== 'pro'}
                            onClick={() => setSendMode(true)}
                        >
                            {t('guests.hero_created_send', { count: pending })}
                        </button>
                    )}
                </div>
            )
        }

        if (tabKey === 'esperando') {
            const waitingFlat = rowData.filter((g) => g.state === 'esperando')
            const failed = waitingFlat.filter((g) => effectiveMessageStatus(g) === 'failed')
            const read = waitingFlat.filter((g) => effectiveMessageStatus(g) === 'read')
            if (failed.length === 0 && read.length === 0) return null

            return (
                <div className="gx-alerts">
                    {failed.length > 0 && (
                        <div className="gx-alert gx-alert--danger">
                            <div className="gx-alert-badge">!</div>
                            <div className="gx-alert-texts">
                                <div className="gx-alert-title">{t('guests.hero_sent_failed_title', { count: failed.length })}</div>
                                <div className="gx-alert-text">{t('guests.hero_sent_failed_text')}</div>
                            </div>
                        </div>
                    )}
                    {read.length > 0 && (
                        <div className="gx-alert gx-alert--warn">
                            <div className="gx-alert-badge">{read.length}</div>
                            <div className="gx-alert-texts">
                                <div className="gx-alert-title">{t('guests.hero_sent_read_title')}</div>
                                <div className="gx-alert-text">{t('guests.hero_sent_read_text', { count: read.length })}</div>
                            </div>
                        </div>
                    )}
                </div>
            )
        }

        if (tabKey === 'confirmado') {
            const noTable = confirmedFlatData.filter((g) => !g.table).length
            if (noTable === 0) {
                return (
                    <div className="gx-hero gx-hero--plain">
                        <div className="gx-hero-texts">
                            <div className="gx-hero-title">{t('guests.hero_confirmed_done_title')}</div>
                            <div className="gx-hero-text">{t('guests.hero_confirmed_done_text')}</div>
                        </div>
                        <button type="button" className="gx-btn gx-btn--ghost" onClick={() => sethandleTables(true)}>
                            {t('guests.hero_confirmed_map')}
                        </button>
                    </div>
                )
            }
            return (
                <div className="gx-hero gx-hero--dark">
                    <div className="gx-hero-texts">
                        <div className="gx-hero-title">{t('guests.hero_confirmed_title', { count: noTable })}</div>
                        <div className="gx-hero-text">{t('guests.hero_confirmed_text')}</div>
                    </div>
                    <button type="button" className="gx-btn gx-btn--outline" onClick={() => sethandleTables(true)}>
                        {t('guests.hero_confirmed_map')}
                    </button>
                    <button type="button" className="gx-btn gx-btn--lia" onClick={() => sethandleTables(true)}>
                        {t('guests.hero_confirmed_assign')}
                    </button>
                </div>
            )
        }

        if (tabKey === 'rechazado') {
            const declined = countGuestRows(callededData)
            if (declined === 0) return null
            return (
                <div className="gx-hero gx-hero--plain">
                    <div className="gx-hero-texts">
                        <div className="gx-hero-title">{t('guests.hero_rejected_title', { count: declined })}</div>
                        <div className="gx-hero-text">{t('guests.hero_rejected_text', { count: declined })}</div>
                    </div>
                    <button type="button" className="gx-btn gx-btn--ghost" onClick={() => setActiveKey('creado')}>
                        {t('guests.hero_rejected_cta')}
                    </button>
                </div>
            )
        }

        return null
    }

    // ── Escalera de pasos (reemplaza la tab bar de Ant Design) ───────────

    const STEP_DEFS = [
        { key: 'seguimiento', step: 'step_resumen', label: 'step_label_seguimiento' },
        { key: 'creado', step: 'step_one', label: 'step_label_creado' },
        { key: 'esperando', step: 'step_two', label: 'step_label_esperando' },
        { key: 'confirmado', step: 'step_three', label: 'step_label_confirmado' },
        { key: 'rechazado', step: 'step_aside', label: 'step_label_rechazado' },
    ]

    const stepCounts = {
        seguimiento: null,
        creado: countGuestRows(createdData),
        esperando: countGuestRows(waitingData),
        confirmado: confirmedFlatData.length,
        rechazado: countGuestRows(callededData),
    }

    const renderStepBar = () => (
        <div className="gx gx-steps" role="tablist">
            {STEP_DEFS.map((d) => (
                <button
                    key={d.key}
                    type="button"
                    role="tab"
                    aria-selected={activeKey === d.key}
                    className="gx-step"
                    onClick={() => setActiveKey(d.key)}
                >
                    <span className="gx-step-kicker">
                        <span>{t(`guests.${d.step}`)}</span>
                        <i />
                    </span>
                    <span className="gx-step-main">
                        <span className="gx-step-label">{t(`guests.${d.label}`)}</span>
                        {stepCounts[d.key] != null && (
                            <span className="gx-step-count">{stepCounts[d.key]}</span>
                        )}
                    </span>
                </button>
            ))}
        </div>
    )

    // ── Herramientas globales de la página ───────────────────────────────
    // Antes vivían en la barra superior; el rediseño la quita, así que ahora
    // se abren desde el botón "⋯" del toolbar de cada sección.
    // ── Menú "⋯" de cada sección ─────────────────────────────────────────
    // Descargables, mapa de mesas, evento público/privado y lector de pases.
    // Es el contenido que antes colgaba del botón "≡" de la barra superior.
    const renderGlobalTools = () => (
        <div className="items_list_guests" style={{ minWidth: plan !== 'pro' ? '210px' : 0 }}>


            <Dropdown
                trigger={["click"]}
                placement='topRight'
                popupRender={() => (
                    <div style={{ position: "static", width: '250px' }} className="on-transfer-container">
                        <span className="on-transfer-label">{t('guests.download_title')}</span>

                        <div className="transfer-mesas-cont">
                            <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                <span>
                                    {t('guests.tab_waiting')}
                                </span>

                                <Button
                                    onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "creado"), "Por-invitar.xlsx")}
                                    style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                    icon={<Download size={14} />} className="primarybutton">
                                </Button>

                            </div>

                            <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                <span>
                                    {t('guests.download_waiting')}
                                </span>

                                <Button
                                    onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "esperando"), "Pendientes.xlsx")}
                                    style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                    icon={<Download size={14} />} className="primarybutton">
                                </Button>

                            </div>

                            <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                <span>
                                    {t('guests.download_confirmed')}
                                </span>

                                <Button
                                    onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "confirmado" || r.state === "asistente"), "Confirmados.xlsx")}
                                    style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                    icon={<Download size={14} />} className="primarybutton">
                                </Button>

                            </div>

                            <div className="table-transfer-item" style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
                                <span>
                                    {t('guests.tab_rejected')}
                                </span>

                                <Button
                                    onClick={() => exportFlatGuestsToExcel(rowData.filter(r => r.state === "rechazado"), "Cancelados.xlsx")}
                                    style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                                    icon={<Download size={14} />} className="primarybutton">
                                </Button>

                            </div>
                        </div>

                    </div>
                )}
            >
                <Button
                    style={{ borderRadius: '99px', transition: 'all 0.55s ease', justifyContent: 'flex-start' }}
                    icon={<Download size={14} />} className="primarybutton_transparent">
                    {t('guests.btn_downloads')}
                </Button>
            </Dropdown>


            <Button
                onClick={() => sethandleTables(true)}
                style={{ borderRadius: '99px', transition: 'all 0.55s ease', justifyContent: 'flex-start' }}
                icon={<Pin size={14} />} className="primarybutton_transparent">
                {t('guests.table_map')}
            </Button>


            <Popconfirm
                title={openCard ? t('guests.confirm_public_title') : t('guests.confirm_private_title')}
                description={openCard ? t('guests.confirm_public_desc') : t('guests.confirm_private_desc')}
                onConfirm={openCard ? () => onSaveNewTickets('closed') : () => onSaveNewTickets('open')}
                placement="bottomLeft"
                okText={t('guests.btn_continue')}
                cancelText={t('guests.btn_cancel')}
                style={{ width: '400px' }}
                id="popup-confirm"
            >
                {
                    openCard ?
                        <Button
                            style={{ borderRadius: '99px', transition: 'all 0.55s ease', justifyContent: 'flex-start' }}
                            icon={<LockKeyholeOpen size={14} />} className="primarybutton_transparent">
                            {t('guests.btn_public')}
                        </Button>
                        : <Button
                            style={{ borderRadius: '99px', transition: 'all 0.55s ease', justifyContent: 'flex-start' }}
                            icon={<LockKeyhole size={14} />} className="primarybutton_transparent">
                            {t('guests.btn_private')}
                        </Button>
                }

            </Popconfirm>

            <Dropdown
                trigger={['click']}
                popupRender={() => (
                    <div className="items_list_guests" style={{ minWidth: 280, padding: '18px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.1 }} >{t('guests.scanner_title')}</span>
                        <span style={{ fontSize: '12px', fontWeight: 400, lineHeight: 1.1, marginTop: '8px', opacity: '0.6' }} >{t('guests.scanner_subtitle')}</span>

                        <div style={{
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', gap: '8px',

                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'stretch',
                                gap: '24px'

                            }}>
                                <div style={{
                                    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', gap: '2px',

                                }}>
                                    <span style={{ fontSize: '10px', fontWeight: 400, lineHeight: 1.1, opacity: '0.5' }}>{t('guests.scanner_user')}</span>
                                    <Button
                                        onClick={() => copyToClipboard(String(id).slice(0, 4))}
                                        type='text'
                                        icon={<Copy size={14} />}
                                        style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.1, padding: 0 }}
                                    >
                                        {invitation?.generals?.event?.name}
                                    </Button>
                                </div>

                                <div style={{
                                    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', gap: '2px',

                                }}>

                                    <div style={{
                                        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', gap: '2px',

                                    }}>
                                        <span style={{ fontSize: '10px', fontWeight: 400, lineHeight: 1.1, opacity: '0.5' }}>{t('guests.scanner_password')}</span>
                                        <Button
                                            onClick={() => copyToClipboard(String(id).slice(0, 4))}
                                            type='text'
                                            icon={<Copy size={14} />}
                                            style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.1, padding: 0 }}
                                        >
                                            {String(id).slice(0, 4)}
                                        </Button>
                                    </div>

                                </div>
                            </div>

                            <span style={{ fontSize: '11px', fontWeight: 400, lineHeight: 1.1, opacity: '0.5' }}>{t('guests.scanner_link')}</span>
                            <Button
                                onClick={() => copyToClipboard('https://www.iattend.site/scanner')}
                                type='text'
                                icon={<Copy size={16} />}
                                style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.1, padding: 0 }}
                            >
                                https://www.iattend.site/scanner
                            </Button>
                        </div>


                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', borderTop: '1px solid #ebebeb', paddingTop: '12px', boxSizing: 'border-box' }} />

                        <Button
                            icon={<ArrowUpRight size={16} />}
                            onClick={() => window.open(`https://www.iattend.site/scanner?id=${id}`, '_blank')}
                            type='primary'
                        >{t('guests.btn_access_scanner')}</Button>
                    </div>
                )}
            >
                <Button

                    disabled={plan !== 'pro' ? true : false}
                    style={{ borderRadius: '99px', transition: 'all 0.55s ease', justifyContent: 'flex-start' }}
                    icon={<QrCode size={14} />} className={`primarybutton_transparent ${plan !== 'pro' ? 'pro_badge' : ''}`}>
                    {t('guests.btn_scanner')}
                </Button>
            </Dropdown>



            {/* Control de pases (capacidad total del evento). Oculto: el menú
                "⋯" del rediseño solo lleva descargables, mapa, privacidad y
                lector. Poner SHOW_TICKETS_CONTROL en true para restaurarlo. */}
            {SHOW_TICKETS_CONTROL && <Dropdown
                trigger={['click']}
                placement='bottomRight'
                arrow
                open={activeTickets}
                onOpenChange={setActiveTickets}
                popupRender={() => (
                    <div className='active_tickets_cont'>
                        <div className='edit-tickets-buttons-container'>

                            <div className='edit-tickets-dash'>
                                <div className='active_t_row' style={{ justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('guests.control_total')}</span>
                                </div>
                                <div className='dash-row-pie' style={{ gap: '12px' }}>
                                    <Input onChange={(e) => {
                                        const onlyNumbers = e.target.value.replace(/\D/g, '')
                                        setCopyTickets(Number(onlyNumbers))
                                    }} value={copyTickets} style={{
                                        maxWidth: '100%', maxHeight: '100px', borderRadius: '99px', flex: 1, textAlign: 'center', fontSize: '18px', fontWeight: 800,
                                    }} />
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0px' }}>
                                        <Button onClick={() => setCopyTickets(copyTickets - 1)} icon={<FiMinus style={{ marginTop: '2px' }} />} className='primarybutton' style={{ width: '40px', maxHeight: '32px', border: '1px solid #ebebeb', borderRadius: '99px 0px 0px 99px', flex: '1' }}></Button>
                                        <Button onClick={() => setCopyTickets(copyTickets + 1)} icon={<IoMdAdd style={{ marginTop: '2px' }} />} className='primarybutton' style={{ width: '40px', maxHeight: '32px', border: '1px solid #ebebeb', borderRadius: '0px 99px 99px 0px', flex: '1' }}></Button>
                                        <Button onClick={() => onHandleTickets(copyTickets)} className="save_tickets" icon={<FaCheck size={10} style={{ color: '#FFF', marginBottom: '1px' }} />}
                                            style={{ maxHeight: '32px', maxWidth: '32px', borderRadius: '99px', marginLeft: '6px', backgroundColor: '#6D3CFA' }}></Button>
                                    </div>
                                </div>
                            </div>

                            {SHOW_TICKETS_DISTRIBUTION && <div className='edit-tickets-dash'>
                                <span style={{ fontWeight: 400, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('guests.control_distribution')}</span>
                                <div className='dash-row-pie'>
                                    <div className='pie_cont'>
                                        <Pie data={chartData} options={options} />
                                    </div>
                                    <div className='pie_cols'>
                                        <div className='pie_row'>
                                            <div style={{ backgroundColor: '#6D3CFA' }} className='pie_dot'></div>
                                            <span>{t('guests.control_confirmed')} ({confirmed})</span>
                                        </div>
                                        <div className='pie_row'>
                                            <div style={{ backgroundColor: '#6D3CFA50' }} className='pie_dot'></div>
                                            <span>{t('guests.control_waiting')} ({waiting})</span>
                                        </div>
                                    </div>
                                </div>
                            </div>}

                        </div>
                    </div>
                )}
            >
                <Tooltip title={t('guests.control_tickets_tooltip')}>
                    <Button
                        className='primarybutton_transparent'
                        icon={<Tickets size={14} />}
                        style={{ borderRadius: '99px', transition: 'all 0.55s ease' }}
                    >
                        {tickets ?? 0}
                    </Button>
                </Tooltip>
            </Dropdown>}

            {/* Envío masivo: null mientras SHOW_BULK_SEND esté apagado. */}
            {SHOW_BULK_SEND && activeKey === 'creado' && renderBulkActionsBar()}
        </div>
    )

    // ── Toolbar de cada sección ──────────────────────────────────────────
    // El rediseño quita la barra superior de la página: cada tab trae su propio
    // buscador, su filtro rápido, el panel de "Filtros" y el menú "⋯" con las
    // herramientas globales.

    const activeFilterCount = [filterTag, filterTable, filterTier, filterType, filterSide]
        .filter(Boolean).length

    const clearAllFilters = () => {
        setFilterTag(null)
        setFilterTable(null)
        setFilterTier(null)
        setFilterType(null)
        setfilterSide(null)
        setFilterDelivery(null)
    }

    const renderFilterGroup = (label, options, value, onPick) => {
        if (options.length === 0) return null
        return (
            <div className="gx-filter-group">
                <span className="gx-filter-label">{label}</span>
                <div className="gx-filter-options">
                    {options.map((o) => (
                        <button
                            key={String(o.value)}
                            type="button"
                            className="gx-filter-opt"
                            data-active={value === o.value || undefined}
                            onClick={() => onPick(value === o.value ? null : o.value)}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    const renderFiltersPanel = (tabKey) => (
        <div className="gx-filters-panel">
            {renderFilterGroup(
                t('guests.filter_tag'),
                localTags.filter((i) => i !== '' && i !== null).map((i) => ({ value: i, label: i })),
                filterTag,
                setFilterTag,
            )}
            {tabKey === 'confirmado' && renderFilterGroup(
                t('guests.filter_table'),
                [{ value: 'no-table', label: t('guests.no_table') }].concat(
                    tables.map((tb) => ({ value: tb.id, label: tb.name ? `#${tb.number} · ${tb.name}` : `#${tb.number}` })),
                ),
                filterTable,
                setFilterTable,
            )}
            {renderFilterGroup(
                t('guests.filter_priority'),
                ['A', 'B', 'C', 'D'].map((i) => ({ value: i, label: i })),
                filterTier,
                setFilterTier,
            )}
            {renderFilterGroup(
                t('guests.filter_category'),
                ['female', 'male', 'child', 'undefined'].map((i) => ({ value: i, label: handleTypes(i) })),
                filterType,
                setFilterType,
            )}
            {owners?.length > 1 && renderFilterGroup(
                t('guests.filter_side'),
                owners.map((i) => ({ value: i, label: i })),
                filterSide,
                setfilterSide,
            )}
            {activeFilterCount > 0 && (
                <button type="button" className="gx-filters-clear" onClick={clearAllFilters}>
                    {t('guests.filters_clear')}
                </button>
            )}
        </div>
    )

    const renderTabToolbar = (tabKey) => {
        const placeholder = tabKey === 'confirmado'
            ? t('guests.search_placeholder_table')
            : t('guests.search_placeholder')

        return (
            <div className="gx-toolbar">
                <div className="gx-search">
                    <Search size={16} />
                    <input
                        value={searchUser ?? ''}
                        onChange={(e) => setSearchUser(e.target.value)}
                        placeholder={placeholder}
                    />
                    {searchUser && (
                        <button type="button" className="gx-search-clear" onClick={() => setSearchUser(null)}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Filtro rápido propio de cada sección */}
                {tabKey === 'esperando' && (
                    <button
                        type="button"
                        className="gx-tool"
                        data-active={filterDelivery === 'failed' || undefined}
                        onClick={() => setFilterDelivery((prev) => (prev === 'failed' ? null : 'failed'))}
                    >
                        {t('guests.quick_undelivered')}
                    </button>
                )}
                {tabKey === 'confirmado' && (
                    <button
                        type="button"
                        className="gx-tool"
                        data-active={filterTable === 'no-table' || undefined}
                        onClick={() => setFilterTable((prev) => (prev === 'no-table' ? null : 'no-table'))}
                    >
                        {t('guests.card_no_table')}
                    </button>
                )}

                <Dropdown trigger={['click']} placement="bottomRight" popupRender={() => renderFiltersPanel(tabKey)}>
                    <button type="button" className="gx-tool" data-active={activeFilterCount > 0 || undefined}>
                        {t('guests.filters')}
                        {activeFilterCount > 0 && <span className="gx-tool-count">{activeFilterCount}</span>}
                    </button>
                </Dropdown>

                <Tooltip title={t('guests.more_tools')}>
                    <Dropdown trigger={['click']} placement="bottomRight" popupRender={renderGlobalTools}>
                        <button type="button" className="gx-tool gx-tool--icon">
                            <MoreHorizontal size={16} />
                        </button>
                    </Dropdown>
                </Tooltip>

                {tabKey === 'creado' && !sendMode && (
                    <Dropdown
                        popupRender={() => (
                            <GuestAddTiles
                                plan={plan}
                                onIndividual={() => setDrawerState({
                                    currentGuest: null,
                                    onEditGuest: false,
                                    companions: [],
                                    visible: true,
                                })}
                                onFile={(file) => navigate(`/dashboard/guests/import?id=${id}`, { state: { file } })}
                            />
                        )}
                    >
                        <button type="button" className="gx-tool gx-tool--primary">
                            <Plus size={15} />
                            <span>{t('guests.btn_new_guest')}</span>
                        </button>
                    </Dropdown>
                )}
            </div>
        )
    }

    const items = useMemo(() => ([
        {
            label: screens.xs ? <Sparkles size={14} /> : t('guests_overview.tab'),
            key: "seguimiento",
            children: (
                <Spin spinning={isLoading}>
                    <GuestsOverview
                        rowData={rowData}
                        dispatchMap={dispatchMap}
                        tickets={tickets}
                        tables={tables}
                        rsvpDeadline={rsvpDeadline}
                        onGoToTab={setActiveKey}
                        onAddGuests={() => setDrawerState({ currentGuest: null, onEditGuest: false, companions: [], visible: true })}
                        onCreateSend={() => { setActiveKey('creado'); if (SHOW_BULK_SEND) setSendMode(true); }}
                    />
                </Spin>
            ),
        },
        {
            label: screens.xs ? <Clock size={14} /> : `${t('guests.tab_waiting')} (${countGuestRows(createdData)})`,
            key: "creado",
            children: (
                <Spin spinning={isLoading}>
                    <div className="gx">
                        {renderTabHero('creado')}
                        {renderRsvpDeadlineAlert('creado')}
                        {renderTabToolbar('creado')}
                        {renderRsvpDeadlineLine('creado')}
                        {/* Modo envío masivo: instrucciones a ancho completo, para
                            que el cambio de modo se sienta. */}
                        {sendMode && (
                            <div style={{
                                marginBottom: 12, boxSizing: 'border-box', borderRadius: 16,
                                background: 'var(--blue-bg-40)', border: '1px solid var(--blue-color-20)', padding: 12,
                                display: 'flex', alignItems: 'flex-start', gap: 6,
                            }}>
                                <Info size={14} style={{ flexShrink: 0, color: 'var(--blue-color)', marginTop: 2 }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue-color)' }}>
                                        {t('guests.bulk_mode_title')}
                                    </span>
                                    <span style={{ fontSize: 12, color: '#787878' }}>
                                        {t('guests.bulk_mode_instructions')}
                                    </span>
                                </div>
                            </div>
                        )}
                        {renderSortBar('creado')}
                        {hasActiveFilters
                            ? renderFlatCardList(sortForTab('creado', flatFilteredGuests(createdData)), 'creado')
                            : renderCardList(sortForTab('creado', filteredGuests(createdData)), 'creado')}
                    </div>
                </Spin>
            ),
        },
        {
            label: screens.xs ? <Send size={14} /> : `${t('guests.tab_sent')} (${countGuestRows(waitingData)})`,
            key: "esperando",
            children: (
                <Spin spinning={isLoading}>
                    <div className="gx">
                        {renderTabHero('esperando')}
                        {renderRsvpDeadlineAlert('esperando')}
                        {renderTabToolbar('esperando')}
                        {renderRsvpDeadlineLine('esperando')}
                        {renderSortBar('esperando')}
                        {hasActiveFilters
                            ? renderFlatCardList(sortForTab('esperando', flatFilteredGuests(waitingData)), 'esperando')
                            : renderCardList(sortForTab('esperando', filteredGuests(waitingData)), 'esperando')}
                    </div>
                </Spin>
            ),
        },
        {
            label: screens.xs ? <CheckCheck size={14} /> : `${t('guests.tab_confirmed')} (${filteredGuests(confirmedFlatData).length})`,
            key: "confirmado",
            children: (
                <Spin spinning={isLoading}>
                    <div className="gx">
                        {renderTabHero('confirmado')}
                        {renderTabToolbar('confirmado')}
                        {renderSortBar('confirmado')}
                        {hasActiveFilters
                            ? renderFlatCardList(sortForTab('confirmado', flatFilteredGuests(confirmedData)), 'confirmado')
                            : renderCardList(sortForTab('confirmado', filteredGuests(confirmedData)), 'confirmado')}
                    </div>
                </Spin>
            ),
        },
        {
            label: screens.xs ? <X size={14} /> : `${t('guests.tab_rejected')} (${countGuestRows(callededData)})`,
            key: "rechazado",
            children: (
                <Spin spinning={isLoading}>
                    <div className="gx">
                        {renderTabHero('rechazado')}
                        {renderSortBar('rechazado')}
                        {hasActiveFilters
                            ? renderFlatCardList(sortForTab('rechazado', flatFilteredGuests(callededData)), 'rechazado')
                            : renderCardList(sortForTab('rechazado', filteredGuests(callededData)), 'rechazado')}
                    </div>
                </Spin>
            ),
        },
    // OJO: react-hooks/exhaustive-deps está desactivado en este repo, así que
    // nadie avisa si falta una dependencia. Un estado que se lea dentro de los
    // children y no esté aquí queda congelado: el componente re-renderiza pero
    // los tabs siguen mostrando los elementos memoizados anteriores.
    ]), [
        createdData,
        waitingData,
        confirmedData,
        confirmedFlatData,
        tables,
        callededData,
        isLoading,
        screens,
        searchUser,
        filterTag,
        filterTable,
        filterTier,
        filterType,
        filterSide,
        hasActiveFilters,
        activeSort,
        dispatchMap,
        pendingApiSends,
        rsvpDeadline,
        eventDate,
        credits,
        bulkSelected,
        bulkSending,
        sendMode,
        rowData,
        tickets,
        plan,
        rsvpPickerSlot
    ]);




    return (
        <>
            <Layout
                className='guests_main'
                style={{
                    position: 'relative',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--ft-color)',
                }}>
                <HeaderDashboard
                    mode={'guests'}
                />

                <Layout className='build-invitation-layout' style={{
                    paddingTop: screens.xs ? '50px' : '75px', paddingBottom: '24px', position: 'relative',
                    boxSizing: 'border-box'
                }} >
                    <div onClick={() => { setOnNotificationCenter(false); setActiveTickets(false) }} style={{
                        width: '100%', height: '100vh',
                        position: 'absolute', backgroundColor: '#FFFFFF40',
                        zIndex: 98,
                        opacity: onNotificationCenter ? 1 : 0,
                        pointerEvents: onNotificationCenter ? undefined : 'none',
                    }}></div>


                    <div className='guests-info-container' style={{
                        padding: screens.xs ? '8px' : '16px',
                        // Aire extra arriba para que la escalera de pasos no quede
                        // pegada al header
                        paddingTop: screens.xs ? '28px' : '32px',
                    }}>



                        <Tabs
                            className='guests-main-tabs guests-main-tabs--steps'
                            style={{ width: '100%', }}
                            type="card"
                            activeKey={activeKey}
                            onChange={setActiveKey}
                            items={items}
                            /* Escalera de pasos del rediseño en vez de la tab bar
                               de Ant Design. Lo que antes vivía en
                               tabBarExtraContent está ahora en el toolbar de cada
                               sección y en su menú "⋯". */
                            renderTabBar={() => (
                                <div className="gx guests-steps-bar">
                                    {renderStepBar()}
                                </div>
                            )}
                        />

                    </div>

                </Layout >

                <div
                    style={{
                        width: onNotificationCenter ? '450px' : '0px',
                        height: onNotificationCenter ? '100vh' : '0px',
                        borderRadius: onNotificationCenter ? '16px' : '99px',
                        top: onNotificationCenter ? 0 : 85,
                        right: onNotificationCenter ? 20 : 50,
                        zIndex: 999,
                        // border:'1px solid'
                    }}
                    onClick={() => setOnNotificationCenter(!onNotificationCenter)}
                    className={`notifications_center_cont ${onNotificationCenter ? 'not_center_active' : 'not_center_inactive'}`}>
                    {
                        onNotificationCenter &&
                        <div className='notification_container'>

                            <div style={{
                                maxHeight: '100%', overflowY: 'auto', padding: '6px', boxSizing: 'border-box',
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column', width: '100%', gap: '20px'
                            }}>
                                {
                                    notifications.map((not, index) => (
                                        <NotificationCard key={index} noti={not} guests={rowData} refreshPage={refreshPage} />
                                    ))
                                }
                            </div>
                        </div>

                    }
                </div>

                <UpgradeBanner plan={plan} invitationId={id} hideOnMobile />
                <FooterApp></FooterApp>

            </Layout >


            <Drawer
                onClose={() => sethandleTables(false)}
                open={handleTables}
                placement='left'
                width={isMobile ? '100%' : '95%'}
                height="100%"
                title={isMobile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Button
                            icon={<X size={14} />}
                            onClick={() => sethandleTables(false)}
                            style={{ borderRadius: '99px', minWidth: 32, height: 32, padding: 0 }}
                            className='secondarybutton'
                        />
                        <span style={{ fontSize: 15, fontWeight: 500 }}>Mapa de mesas</span>
                    </div>
                ) : null}
                closable={false}
                push={false}
                style={{ borderRadius: isMobile ? '0px' : '0px 24px 24px 0px', maxWidth: isMobile ? 'none' : '1450px' }}
                styles={{
                    header: {
                        display: isMobile ? 'flex' : 'none',
                        padding: '12px 16px',
                    },
                    body: {
                        padding: 0,
                        height: '100%',
                        overflow: 'hidden',
                    }
                }}
            >
                <TablesPage invitationID={id} />
            </Drawer>

            <GuestsCRUD rowData={rowData} invitationID={id} setDrawerState={setDrawerState} refreshPage={refreshPage} drawerState={drawerState} />

            {/* Isla de progreso del envío masivo (estilo dynamic island): fija
                abajo al centro, visible mientras el lote se procesa y hasta que
                el usuario la cierre al completarse. */}
            {activeBatch && (
                <div style={{
                    position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 1200, backgroundColor: '#0c171b', color: '#FFFFFF',
                    borderRadius: 99, padding: '10px 20px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: '0 0 12px rgba(0, 0, 0, 0.35)',
                    minWidth: 320, maxWidth: '90vw', boxSizing: 'border-box',
                }}>
                    {activeBatch.status === 'processing'
                        ? <Send size={16} style={{ flexShrink: 0, color: 'var(--blue-color)' }} />
                        : <Check size={16} style={{ flexShrink: 0, color: '#43B75D' }} />}

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 4, minWidth: 0 }}>
                        <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                            {activeBatch.status === 'processing' ? t('guests.bulk_island_sending') : t('guests.bulk_island_done')}
                            {` · ${activeBatch.sent + activeBatch.failed}/${activeBatch.total}`}
                            {activeBatch.failed > 0 && ` · ${activeBatch.failed} ${t('guests.bulk_island_failed')}`}
                        </span>
                        <Progress
                            percent={Math.round(((activeBatch.sent + activeBatch.failed) / Math.max(activeBatch.total, 1)) * 100)}
                            showInfo={false}
                            size={[undefined, 6]}
                            strokeColor='var(--blue-color)'
                            railColor='#FFFFFF20'
                            style={{ margin: 0, lineHeight: 0 }}
                        />
                    </div>

                    {activeBatch.status !== 'processing' && (
                        <Button
                            type='text'
                            size='small'
                            icon={<X size={14} style={{ color: '#FFFFFF' }} />}
                            onClick={() => setActiveBatch(null)}
                            style={{ flexShrink: 0 }}
                        />
                    )}
                </div>
            )}

            {/* Saldo insuficiente: CTA directo a la compra de créditos. */}
            <Modal
                open={buyCreditsOpen}
                onCancel={() => setBuyCreditsOpen(false)}
                footer={null}
                title={t('guests.reminder_buy_credits_title')}
                style={{ borderRadius: 24 }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
                    <span style={{ fontSize: 13, color: '#787878' }}>
                        {t('guests.reminder_buy_credits_body', { credits })}
                    </span>
                    <CreditsComponent invitationID={id} creditsDisplay={credits} />
                </div>
            </Modal>
        </>
    )
}
