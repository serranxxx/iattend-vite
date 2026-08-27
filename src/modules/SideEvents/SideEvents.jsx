import { Badge, Button, Checkbox, Col, ColorPicker, DatePicker, Drawer, Dropdown, Grid, Input, Layout, message, Modal, Popconfirm, Progress, Row, Select, Slider, Spin, Tabs, Tooltip, Upload } from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import './side-events.css'
import { LuCalendarClock, LuCheck, LuClock, LuCoins, LuCopy, LuCornerUpLeft, LuFolderOpen, LuImage, LuImageOff, LuLandmark, LuLock, LuMapPin, LuPalette, LuPlay, LuPlus, LuSend, LuShoppingCart, LuType, LuUpload, LuUserMinus, LuX } from 'react-icons/lu'
import { supabase } from '../../lib/supabase'
import dayjs from 'dayjs'
import { FaCheck, FaCoins, FaPaperPlane } from 'react-icons/fa'
import { BsArrowReturnRight } from 'react-icons/bs'
import axios from 'axios'
import { HeaderDashboard } from '../Header/Header'
import SideEventHost from '../../components/Host/SideEventHost'
import { colorFactoryToHex } from '../../helpers/assets/functions'
import { dayjsToWallClock, formatAbsoluteDateEs, formatEventDateTime, getTimezoneForState } from '../../helpers/assets/eventDateTime'
import { fonts } from '../../helpers/assets/fonts'
import { handleCheckout, PRICE_IDS } from '../../components/Payment/functions'
import { UpgradeBanner } from '../../components/Payment/UpgradeBanner/UpgradeBanner'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useDashboardRealtime } from '../../context/DashboardRealtimeContext'
import { useLia } from '../../context/LiaContext'
import { StorageImages } from '../../components/ImagesStorage/StorageImages'
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, BellRing, Check, CheckCheck, ChevronLeft, ChevronRight, Cloud, CloudOff, Copy, Info, Link2, LockKeyhole, LockKeyholeOpen, MailWarning, Plus, Send, SquareArrowUpRight, X } from 'lucide-react'
import { GuestsCRUD } from '../../components/Create/GuestsCRUD'
import { AddressAutocomplete } from './AddressAutocomplete'
import { FiArrowUpRight } from 'react-icons/fi'
import { CustomLink } from '../../components/CustomLink/CustomLink'
import { FooterApp } from '../Footer/FooterApp'
import { useTranslation } from 'react-i18next'
import { GuestAddTiles } from '../GuestManagement/GuestAddTiles'
import { CreditsComponent } from '../../components/Payment/Credits/Credits'


const { Option } = Select;



export const SideEvents = () => {
    const { t } = useTranslation()
    const { setCreditSending, setCreditSuccess, clearCreditState } = useLia()

    const translateState = (value) => {
        const map = {
            creado: t('guests.state_creado'),
            esperando: t('guests.state_esperando'),
            confirmado: t('guests.state_confirmado'),
            rechazado: t('guests.state_rechazado'),
        }
        return map[value] ?? value
    }
    const [sideEvent, setsideEvent] = useState(null)
    const [current, setCurrent] = useState(null)
    const [handlePreview, setHandlePreview] = useState(false)
    const [rawData, setRawData] = useState([])
    const [mainGuests, setMainGuests] = useState(null)
    const [readyToAdd, setReadyToAdd] = useState([])
    const [searchMain, setSearchMain] = useState("")
    const [messagesDispatch, setMessagesDispatch] = useState([])
    const [createdData, setCreatedData] = useState([])
    const [waitingData, setWaitingData] = useState([])
    const [confirmedData, setConfirmedData] = useState([])
    const [rejectedData, setRejectedData] = useState([])
    // Sort de encabezado por tab (no filtra filas, solo cambia el orden): un solo
    // { column, dir } activo por tab — dir cicla inactivo -> 'asc' -> 'desc' -> inactivo.
    const [activeSort, setActiveSort] = useState({
        creado: { column: null, dir: null },
        esperando: { column: null, dir: null },
        confirmado: { column: null, dir: null },
        rechazado: { column: null, dir: null },
    })
    const [credits, setCredits] = useState(0)
    const [plan, setPlan] = useState(null)
    const [invName, setInvName] = useState(null)
    const [invLabel, setInvLabel] = useState(null)
    const [invPhone, setInvPhone] = useState(null)
    const [invOwners, setInvOwners] = useState([])

    const hasPendingInfo = !invName || !invLabel || !invPhone || !invOwners?.length
    const [buyCreditsOpen, setBuyCreditsOpen] = useState(false)
    // Bulk shipment (espejo de GuestsPage): modo "Crear envío" + selección por
    // bloques + lote en backend con isla de progreso
    const [sendMode, setSendMode] = useState(false)
    const [bulkSelected, setBulkSelected] = useState(() => new Set())
    const [bulkSending, setBulkSending] = useState(false)
    const [activeBatch, setActiveBatch] = useState(null)
    const [activeKey, setActiveKey] = useState('creado')
    const [addressOpen, setAddressOpen] = useState(false)
    const [datePickerOpen, setDatePickerOpen] = useState(false)
    const [colorDrawerOpen, setColorDrawerOpen] = useState(false)
    const [fontDrawerOpen, setFontDrawerOpen] = useState(false)
    const [mobilePanel, setMobilePanel] = useState(0)
    const [searchParams] = useSearchParams();
    const id = searchParams.get("id");
    const navigate = useNavigate()
    const { subscribe } = useDashboardRealtime()
    const [drawerState, setDrawerState] = useState({
        currentGuest: null,
        onEditGuest: false,
        companions: [],
        visible: false
    });
    const { TextArea } = Input;
    const screens = Grid.useBreakpoint();
    const currentRef = useRef(null);

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

    // Sorts de columna (no filtran filas): un botón en el header cicla
    // inactivo -> asc -> desc -> inactivo. Solo una columna puede estar activa
    // por tab (activar una desactiva cualquier otra del mismo tab).
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

    const renderSortableHeader = (label, dir, onToggle) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span>{label}</span>
            <Button
                type="text"
                size="small"
                onClick={onToggle}
                icon={
                    dir === 'asc' ? <ArrowUp size={14} /> :
                        dir === 'desc' ? <ArrowDown size={14} /> :
                            <ArrowUpDown size={14} />
                }
                className={`sort-header-btn ${dir ? 'sort-header-btn--active' : ''}`}
                style={{ padding: 0, minWidth: 20, height: 20 }}
            />
        </div>
    );

    const TIER_SORT_ORDER = { A: 1, B: 2, C: 3, D: 4 };
    const MESSAGE_STATUS_SORT_ORDER = { failed: 0, undefined: 1, processing: 2, sent: 3, delivered: 4, read: 5 };

    const compareByTier = (a, b) => (TIER_SORT_ORDER[a.tier] ?? 99) - (TIER_SORT_ORDER[b.tier] ?? 99);

    const compareByStatus = (a, b) =>
        (MESSAGE_STATUS_SORT_ORDER[dispatchMap[a.id]?.status ?? 'undefined'] ?? 1) - (MESSAGE_STATUS_SORT_ORDER[dispatchMap[b.id]?.status ?? 'undefined'] ?? 1);

    const applySortDir = (data, dir, comparator) => {
        if (!dir) return data;
        const sorted = [...data].sort(comparator);
        return dir === 'desc' ? sorted.reverse() : sorted;
    };

    // Sin mesas para side events por ahora — solo hay sort de tier y estado.
    const SORT_COMPARATORS = { tier: compareByTier, estado: compareByStatus };

    const sortForTab = (tabKey, data) => {
        const sort = activeSort[tabKey];
        const comparator = sort?.column && SORT_COMPARATORS[sort.column];
        if (!comparator) return data;
        return applySortDir(data, sort.dir, comparator);
    };

    const renderTag = (value) => {
        if (value == null) return "-";
        if (typeof value === "object") return "-"; // o JSON.stringify(value)
        return String(value);
    };

    // Definido antes de `columns`/`items`: `items` renderiza sus tarjetas de
    // forma inmediata (no perezosa) dentro del useMemo, así que cualquier
    // función usada por columns.render debe existir ya en ese punto del
    // cuerpo del componente para evitar un ReferenceError de TDZ en cada
    // render con invitados en estado "esperando".
    const handleMessageStatus = (record, status) => {
        switch (status) {
            case 'processing':

                return (
                    <div className='dispatch_message_tag' style={{ maxHeight: '24px', padding: '0px 12px' }}>
                        {t('side_events.msg_processing')}
                    </div>
                )

            case 'sent':

                return (
                    <div className={`new-table-tag state-confirmado dispatch_message_tag`} style={{ maxHeight: '24px', padding: '0px 12px' }}>
                        <Send size={16} />
                        {t('side_events.msg_sent')}
                    </div>
                )

            case 'delivered':

                return (
                    <div className={`new-table-tag state-creado dispatch_message_tag`} style={{ maxHeight: '24px', padding: '0px 12px' }}>
                        <Check size={16} />
                        {t('side_events.msg_delivered')}
                    </div>
                )


            case 'read':

                return (
                    <div className={`new-table-tag state-esperando dispatch_message_tag`} style={{ maxHeight: '24px', padding: '0px 12px' }}>
                        <CheckCheck size={16} />
                        {t('side_events.msg_read')}
                    </div>
                )

            case 'failed':

                return (

                    <Tooltip placement='topRight'

                        title={t('side_events.msg_retry_hint')} color="var(--brand-color-500)">
                        <Button
                            disabled={
                                !/^\+52\d+/.test(record.phone_number) || credits <= 0
                            }
                            onClick={() => onSedingInvitation(current, record, true)}
                            className="primarybutton--active"
                            icon={<MailWarning size={16} />}
                            style={{ maxHeight: 30, width: 120 }}
                        >
                            {t('side_events.msg_retry')}
                        </Button>
                    </Tooltip>
                    // <div className='dispatch_message_tag'>

                    //     <MailWarning size={16}/>
                    //     Reintentar
                    // </div>
                )

            default:
                return (
                    <div className={`new-table-tag state-rechazado dispatch_message_tag`} style={{ maxHeight: '24px', padding: '0px 12px' }}>
                        {t('side_events.msg_waiting')}
                    </div>
                )
        }
    }

    const columns = useMemo(() => ([
        {
            title: t('side_events.col_name'),
            dataIndex: "name",
            key: "name",
            fixed: "left",
            width: 160,
            render: (value, record) => {
                const isChild = record.__isGroupChild;

                if (isChild) {
                    return (
                        <div style={{ paddingLeft: '36px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', minWidth: 0 }}>
                            <BsArrowReturnRight style={{ flexShrink: 0 }} /> <span className="guest-name-text">{value}</span>
                        </div>
                    );
                }

                return (
                    <div className="tag-container" style={{ justifyContent: "flex-start", width: "100%", paddingLeft: 32 }}>
                        <span className="guest-name-text" style={{ textAlign: "left" }}>{value}</span>
                    </div>
                );
            }
        },

        {
            title: t('side_events.col_contact'),
            dataIndex: "phone_number",
            key: "phone_number",
            width: 160,


              render: (value) => phoneFormatter(value),
        },

        {
            title: t('side_events.col_state'),
            dataIndex: "state",
            key: "state",
            width: 140,
            render: (value) => (
                <div className="tag-container">
                    <span className={`new-table-tag state-${value}`} style={{ maxHeight: '24px', padding: '0px 12px' }}>
                        {translateState(value)}
                    </span>
                </div>
            ),
        },

        {
            title: t('side_events.col_access'),
            dataIndex: "password",
            key: "password",
            width: 140,
            render: (value,) => (
                <div className="tag-container">
                    <Dropdown popupRender={() => (
                        <div className='passwords_container_se'>
                            <Button style={{ width: '100%' }} icon={<LuCopy size={14} />} onClick={() => copyToClipboard(value)} >{value}</Button>
                            <Button
                                style={{ width: '100%' }}
                                onClick={() => handleShare(`https://www.iattend.events/side-event/${current?.id}?password=${value}`)}
                                icon={<LuCopy size={14} />}
                            >{t('side_events.magic_link')}</Button>
                        </div>
                    )}>
                        <Button style={{ borderRadius: '99px', maxHeight: '24px' }} icon={<LuLock />}>••••••••</Button>
                    </Dropdown>
                </div>
            ),
        },

        {
            title: t('side_events.col_tag'),
            dataIndex: "tag",
            key: "tag",
            width: 120,

            render: (value) => {
                const label = renderTag(value)
                return (
                    <div className="tag-container">
                        <Tooltip title={label} placement="top">
                            <span className={`new-table-tag state-${value}`} style={{
                                maxHeight: '24px', padding: '0px 12px',
                                maxWidth: '140px', overflow: 'hidden',
                                whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                display: 'inline-block', textAlign: 'center'
                            }}>
                                {label}
                            </span>
                        </Tooltip>
                    </div>
                )
            },
        },

        {
            title: t('side_events.col_priority'),
            dataIndex: "tier",
            key: "tier",
            width: 100,
            render: (value) => (
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="tag-container" style={{ width: '80%' }}>
                        <span
                            style={{ width: "100%", justifyContent: "center" }}
                            className={`new-table-tag tier-${value}`}
                        >
                            {value ?? "-"}
                        </span>
                    </div>
                </div>
            ),
        },

        {
            title: t('side_events.col_actions'),
            key: "send",
            width: 140,
            fixed: screens.xs ? undefined : "right",
            render: (_, record) => {
                const { state } = record;
                const isChild = record.__isGroupChild;

                if (isChild) {
                    // Acompañantes en Enviadas: celda vacía — el estado del envío
                    // y el recordatorio viven solo en el principal.
                    return null;
                }

                if (state === "creado") {
                    if (record.companion_id !== null && record.companion_id !== undefined) {
                        return null;
                    }

                    const sendable = isSendableGuest(record);

                    // Modo envío: checkbox solo en enviables (los demás van atenuados)
                    if (sendMode) {
                        return (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
                                {sendable && renderBulkCheck(record)}
                            </div>
                        );
                    }

                    // Estado normal: flecha para marcar como invitado a mano
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
                            <Tooltip placement='topRight' title={t('guests.mark_arrow_tooltip')} color="var(--brand-color-500)">
                                <Button
                                    onClick={() => onSendInvitation(record)}
                                    className='primarybutton'
                                    icon={<ArrowRight size={14} style={{ marginTop: 2 }} />}
                                    style={{ minWidth: 30, maxWidth: 30, maxHeight: 30, borderRadius: 99 }}
                                />
                            </Tooltip>
                        </div>
                    );
                }

                if (state === "esperando") {
                    return (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                width: "100%",
                            }}
                        >
                            {handleMessageStatus(record, dispatchMap[record.id]?.status ?? 'undefined')}
                            {renderReminderButton(record)}
                        </div>
                    );
                }

                return null;
            },
        },
    ]), [current, rawData, screens.xs, messagesDispatch, credits, sendMode, bulkSelected]);

    // Cada tab de estado necesita su propia variante de columnas: "Acciones"
    // gana un header ordenable por estado en Enviadas, y "tier" siempre gana
    // un header ordenable. Sin mesas para side events por ahora, Confirmados
    // no tiene sort propio en Acciones (esa columna no muestra nada ahí).
    const getTabColumns = (baseColumns, state) => {
        const sort = activeSort[state] || { column: null, dir: null };
        const dirFor = (column) => (sort.column === column ? sort.dir : null);
        const withTierSort = (cols) => cols.map((col) => (
            col.key === "tier"
                ? { ...col, title: renderSortableHeader(t('side_events.col_priority'), dirFor('tier'), () => cycleTabSort(state, 'tier')) }
                : col
        ));

        switch (state) {
            case "esperando":
                // width extra: además del chip de estado, la celda lleva el botón de recordatorio
                return withTierSort(baseColumns
                    .map((col) => (col.key === "send" ? { ...col, width: 200, minWidth: 200, title: renderSortableHeader(t('side_events.col_state'), dirFor('estado'), () => cycleTabSort(state, 'estado')) } : col)));
            case "creado":
                // La columna de acciones lleva el checkbox del bulk; el header,
                // el botón "Soltar" cuando el modo envío está activo
                return withTierSort(baseColumns
                    .map((col) => (col.key === "send" ? { ...col, title: renderBulkHeaderCheck(), width: 100, minWidth: 100 } : col)));
            case "confirmado":
            case "rechazado":
                // Sin mesas en side events — la columna de acciones no muestra nada aquí
                return withTierSort(baseColumns.filter((col) => col.key !== "send"));
            default:
                return withTierSort(baseColumns);
        }
    };

    // Agrupa por familia (companion_id) solo entre quienes comparten alguno de
    // los `states` pedidos — igual convención que GuestsPage, para que un
    // acompañante que cambie de estado se re-agrupe con quien sí comparta su
    // nuevo estado en vez de quedar atrapado en el grupo original.
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

    // "name" queda fijo a la izquierda y "send" (Acciones) fijo a la derecha
    // dentro de cada tarjeta con scroll horizontal.
    const stickyClassFor = (colKey) => {
        if (colKey === 'name') return 'guests-card-cell--sticky-left';
        if (colKey === 'send' && !screens.xs) return 'guests-card-cell--sticky-right';
        return '';
    };

    // Renderiza una fila de invitado reutilizando exactamente las mismas
    // columnas/render de la tabla, fuera de un <table> para envolver cada
    // grupo (líder + acompañantes) en su propia tarjeta con bordes.
    const renderGuestCardRow = (record, cols, extraClassName = '') => {
        const isChildRow = extraClassName === 'guests-card-row--child';

        return (
            <div key={record.id} className={`guests-card-row ${extraClassName}`}>
                {cols.map((col) => (
                    <div
                        key={col.key}
                        className={`guests-card-cell ${stickyClassFor(col.key)}`}
                        style={col.width ? { flex: `0 0 ${col.width}px`, width: col.width } : { flex: '1 1 0%', minWidth: 160 }}
                    >
                        {col.render ? col.render(record[col.dataIndex], record) : record[col.dataIndex]}

                        {!isChildRow && stickyClassFor(col.key) === 'guests-card-cell--sticky-left' && (
                            <Tooltip title={t('side_events.tooltip_open')}>
                                <Button
                                    onClick={() =>
                                        setDrawerState({
                                            currentGuest: record,
                                            onEditGuest: true,
                                            companions: handleCompanions(record.id),
                                            visible: true,
                                        })
                                    }
                                    className="primarybutton"
                                    icon={<FiArrowUpRight size={12} style={{ marginTop: 2 }} />}
                                    style={{ position: 'absolute', top: 16, left: 12, maxWidth: 20, maxHeight: 20, borderRadius: 99, zIndex: 99 }}
                                />
                            </Tooltip>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    // Cada grupo (líder + acompañantes) se ve siempre desplegado, envuelto en
    // su propia tarjeta con borde redondeado.
    const renderGroupedCards = (data, cols) => {
        if (!data || data.length === 0) {
            return <div className="table-group-empty">{t('side_events.no_guests')}</div>;
        }

        return (
            <div className="guests-card-list">
                <div className="guests-card-list-header">
                    {cols.map((col) => (
                        <div
                            key={col.key}
                            className={`guests-card-header-cell ${stickyClassFor(col.key)}`}
                            style={col.width ? { flex: `0 0 ${col.width}px`, width: col.width } : { flex: '1 1 0%', minWidth: 160 }}
                        >
                            {col.title}
                        </div>
                    ))}
                </div>
                {data.map((group) => {
                    // Modo envío: solo bloques enviables son clickeables; los
                    // no-enviables se atenúan (mismo patrón que GuestsPage)
                    const groupSelectable = sendMode && group.state === 'creado' && isSendableGuest(group)
                    const groupDimmed = sendMode && group.state === 'creado' && !isSendableGuest(group)
                    return (
                    <div
                        key={group.id}
                        className={`guests-group-card ${bulkSelected.has(group.id) ? 'bulk-row-selected' : ''} ${groupDimmed ? 'bulk-row-disabled' : ''}`}
                        onClick={groupSelectable ? (e) => {
                            if (e.target.closest('button, input, a, .ant-dropdown')) return
                            toggleBulkSelect(group.id, !bulkSelected.has(group.id))
                        } : undefined}
                        style={groupSelectable ? { cursor: 'pointer' } : undefined}
                    >
                        {renderGuestCardRow(group, cols)}
                        {group.children?.map((child) => renderGuestCardRow(child, cols, 'guests-card-row--child'))}
                    </div>
                    )
                })}
            </div>
        );
    };

    const handleCompanions = (id) => {
        const comps = rawData?.filter((row) => row.companion_id === id.toString())
        return comps
    }

    const dispatchMap = useMemo(() => {
        const map = {};

        messagesDispatch.forEach(m => {
            map[m.guest_id] = m;
        });

        return map;
    }, [messagesDispatch]);

    // ── Recordatorios manuales de WhatsApp por side event ────────────────────
    // Espejo del flujo de GuestsPage. Definido ANTES del useMemo de `items`
    // porque items ejecuta columns.render de inmediato (ver nota de TDZ arriba).

    const hasSentSideReminders = rawData.some((g) => (g.reminder_count ?? 0) > 0)

    // Guarda side_events.rsvp_deadline con UPDATE directo. Fecha absoluta
    // 'YYYY-MM-DD', sin timezone.
    const onSaveRsvpDeadline = async (dateValue) => {
        if (!dateValue || !current?.id) return
        const newDeadline = dateValue.format('YYYY-MM-DD')

        const { error } = await supabase
            .from('side_events')
            .update({ rsvp_deadline: newDeadline })
            .eq('id', current.id)

        if (error) {
            console.error('Error al guardar rsvp_deadline:', error)
            message.error(t('guests.rsvp_deadline_error'))
            return
        }

        if (current.rsvp_deadline && newDeadline !== current.rsvp_deadline && hasSentSideReminders) {
            message.warning(t('guests.rsvp_deadline_changed_warning'))
        } else if (dateValue.diff(dayjs().startOf('day'), 'day') < 5) {
            message.warning(t('guests.rsvp_deadline_soon_warning'))
        } else {
            message.success(t('guests.rsvp_deadline_saved'))
        }

        setCurrent((prev) => ({ ...prev, rsvp_deadline: newDeadline }))
        setsideEvent((prev) => prev?.map((se) => se.id === current.id ? { ...se, rsvp_deadline: newDeadline } : se))
    }

    const rsvpDisabledDate = (d) => {
        if (!d) return false
        if (!d.isAfter(dayjs().startOf('day'), 'day')) return true // debe ser futura
        // Tope: la fecha del side event (body.hour es string wall-clock)
        if (current?.body?.hour && d.isAfter(dayjs(current.body.hour), 'day')) return true
        return false
    }

    // Motivo por el que un invitado del side event no puede recibir
    // recordatorio (null = elegible). Límite de 1/día POR side event: los
    // contadores viven en side_events_guests, una fila por evento.
    const reminderBlockReason = (record) => {
        if (!current?.rsvp_deadline) return { key: 'deadline', label: t('guests.reminder_no_deadline') }
        if (!/^\+52\d+/.test(record.phone_number)) return { key: 'phone', label: t('guests.tooltip_national_only') }
        if (record.last_reminder_at && dayjs(record.last_reminder_at).isSame(dayjs(), 'day')) return { key: 'daily', label: t('guests.reminder_daily_limit') }
        if (credits < 1) return { key: 'credits', label: t('guests.reminder_no_credits') }
        return null
    }

    const onSendReminder = async (guest) => {
        if (hasPendingInfo) {
            message.warning('Completa la información pendiente de tu invitación antes de enviar.')
            return
        }

        if (!current?.name?.trim()) {
            message.warning(t('side_events.warning_event_no_name'))
            return
        }

        if (!current?.rsvp_deadline) return

        setCreditSending(t('guests.reminder_sending_label'))
        try {
            const payload = {
                invitationId: id,
                guestId: guest.id,
                guestName: guest.name,
                guestPhone: guest.phone_number.replace(/^\+/, ""),
                sideEventId: current.id,

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
                                    text: `${current.name}`.replace(/[\n\r]/g, " "),
                                },
                                {
                                    type: "text",
                                    text: formatAbsoluteDateEs(current.rsvp_deadline),
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
                                    text: `side-event/${current?.id}?password=${guest.password}`,
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
                // Cobrar solo tras éxito; el backend ya actualizó los contadores
                // en side_events_guests.
                onUpdateCredits()
                setCreditSuccess()
                getGuests()
            }
        } catch (error) {
            clearCreditState()
            message.error(t('guests.reminder_sent_error'))
            console.log(error.response?.data || error.message);
        }
    };

    // Botón de recordatorio: solo principales, oculto en failed (ahí vive
    // Reintentar) y en envío manual. Si el único bloqueo es el saldo, el click
    // abre la compra de créditos (CTA).
    const renderReminderButton = (record) => {
        if (record.companion_id !== null && record.companion_id !== undefined) return null

        const status = dispatchMap[record.id]?.status ?? 'undefined'
        if (status === 'failed' || status === 'undefined') return null

        const reason = reminderBlockReason(record)
        const count = record.reminder_count ?? 0
        const disabled = !!reason && reason.key !== 'credits'

        const button = (
            <Button
                disabled={disabled}
                onClick={() => {
                    if (reason?.key === 'credits') {
                        setBuyCreditsOpen(true)
                    } else if (!reason) {
                        onSendReminder(record)
                    }
                }}
                icon={<BellRing size={14} style={{ marginTop: 4, color: disabled ? '#dbdbdb' : undefined }} />}
                style={{
                    minWidth: 30, maxWidth: 30, maxHeight: 30, borderRadius: 99,
                    background: 'linear-gradient(145deg, var(--orange-color), var(--orange-color))', color: '#FFFF', border: '1px solid var(--orange-color)',
                    // el disabled default de antd deja el botón blanco y el ícono no se ve
                    ...(disabled && { background: '#F1F1F1', border: '1px solid #EBEBEB', color: '#787878' }),
                }}
            />
        )

        return (
            <Tooltip
                placement='topRight'
                color="var(--orange-bg)"
                title={<span style={{ color: 'var(--orange-color)', fontWeight: 600, textAlign: 'center' }}>{reason ? reason.label : count > 0 ? `${t('guests.reminder_count_tooltip')}: ${count}` : t('guests.reminder_btn_tooltip')}</span>}
            >
                {disabled ? button : (
                    <Badge count={count} size="small" color="var(--brand-color-500)" title="" offset={[-2, 2]}>
                        {button}
                    </Badge>
                )}
            </Tooltip>
        )
    }

    // Barra de fecha límite del side event actual: empty state que invita a
    // definirla mientras es null; campo editable permanente una vez definida.
    const renderRsvpDeadlineBar = () => (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
            padding: '10px 16px', marginBottom: 12, borderRadius: 16, boxSizing: 'border-box', width: '100%',
            border: `1px solid ${current?.rsvp_deadline ? '#EBEBEB' : 'var(--light-purple-500-20)'}`,
            background: current?.rsvp_deadline ? '#FFFFFF' : 'var(--light-purple-100-40)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <BellRing size={16} style={{ flexShrink: 0, color: current?.rsvp_deadline ? 'var(--brand-color-500)' : 'var(--light-purple-700)' }} />
                <span style={{ fontSize: 13, color: current?.rsvp_deadline ? undefined : 'var(--light-purple-700)' }}>
                    {current?.rsvp_deadline
                        ? `${t('guests.rsvp_deadline_label')}: ${formatAbsoluteDateEs(current.rsvp_deadline)}`
                        : t('guests.rsvp_deadline_empty')}
                </span>
            </div>
            <DatePicker
                value={current?.rsvp_deadline ? dayjs(current.rsvp_deadline) : null}
                onChange={onSaveRsvpDeadline}
                disabledDate={rsvpDisabledDate}
                allowClear={false}
                placeholder={t('guests.rsvp_deadline_placeholder')}
                getPopupContainer={() => document.body}
                style={{ borderRadius: 99 }}
            />
        </div>
    )

    // ── Bulk shipment por side event (espejo de GuestsPage) ─────────────────
    // Definido antes del useMemo de `items` (TDZ: items ejecuta los renders de
    // las columnas de inmediato).

    const isSendableGuest = (g) => /^\+52\d+/.test(g.phone_number)

    const bulkSelectedGuests = rawData.filter((g) => bulkSelected.has(g.id) && g.state === 'creado')
    const bulkEligibleGuests = bulkSelectedGuests.filter(isSendableGuest)

    const toggleBulkSelect = (guestId, checked) => {
        setBulkSelected((prev) => {
            const next = new Set(prev)
            if (checked) next.add(guestId)
            else next.delete(guestId)
            return next
        })
    }

    const exitSendMode = () => {
        setSendMode(false)
        setBulkSelected(new Set())
    }

    // Payload de Graph API del envío inicial de side events (misma lógica de
    // templates que onSedingInvitation). Duplicado a propósito: el flujo
    // individual no se toca.
    const buildSideInvitationPayload = (guest) => ({
        messaging_product: "whatsapp",
        to: guest?.phone_number?.replace(/^\+/, ""),
        type: "template",
        template: {
            name: current?.rsvp_deadline ? "invitation_deadline" : "invitation_v2",
            language: { code: "es_MX" },
            components: [
                {
                    type: "header",
                    parameters: [
                        { type: "image", image: { link: current?.url_image ?? current?.body?.image } },
                    ],
                },
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: `${current?.name}`.replace(/[\n\r]/g, " ") },
                        { type: "text", text: guest?.name },
                        ...(current?.rsvp_deadline ? [{ type: "text", text: formatAbsoluteDateEs(current.rsvp_deadline) }] : []),
                    ],
                },
                {
                    type: "button",
                    sub_type: "url",
                    index: "0",
                    parameters: [
                        { type: "text", text: `side-event/${current?.id}?password=${guest.password}` },
                    ],
                },
            ],
        },
    })

    // Reserva de créditos del lote en un solo UPDATE; el backend reembolsa los
    // fallidos al cerrar el lote.
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

    const onBulkSend = async () => {
        if (hasPendingInfo) {
            message.warning('Completa la información pendiente de tu invitación antes de enviar.')
            return
        }
        if (!current?.name?.trim()) {
            message.warning(t('side_events.warning_event_no_name'))
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
                payload: buildSideInvitationPayload(g),
            }))

            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/whats/bulk`,
                { invitationId: id, sideEventId: current.id, items }
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

    // Checkbox manual circular (misma clase global que GuestsPage)
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

    const renderBulkHeaderCheck = () => {
        if (!sendMode) return t('side_events.col_actions')
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <Button
                    size='small'
                    disabled={bulkSelected.size === 0}
                    onClick={() => setBulkSelected(new Set())}
                    className='secondarybutton'
                    style={{ borderRadius: 99, height: 32, flex: 1, width: '100%' }}
                >
                    {t('guests.bulk_release')}
                </Button>
            </div>
        )
    }

    const renderBulkActionsBar = () => {
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

    // Conteo de personas (líder + acompañantes) para el label de cada tab,
    // igual que en GuestsPage.
    const countGuestRows = (groupedData = []) =>
        groupedData.reduce((acc, g) => acc + 1 + (g.children?.length ?? 0), 0);

    const items = useMemo(() => ([
        {
            label: screens.xs ? <Plus size={14} /> : `${t('guests.tab_waiting')} (${countGuestRows(createdData)})`,
            key: "creado",
            children: (
                <div className="guests-card-list-scroll">
                    {renderGroupedCards(sortForTab('creado', createdData), getTabColumns(columns, 'creado'))}
                </div>
            ),
        },
        {
            label: screens.xs ? <Send size={14} /> : `${t('guests.tab_sent')} (${countGuestRows(waitingData)})`,
            key: "esperando",
            children: (
                <div className="guests-card-list-scroll guests-card-list-scroll--sent">
                    {renderGroupedCards(sortForTab('esperando', waitingData), getTabColumns(columns, 'esperando'))}
                </div>
            ),
        },
        {
            label: screens.xs ? <CheckCheck size={14} /> : `${t('guests.tab_confirmed')} (${countGuestRows(confirmedData)})`,
            key: "confirmado",
            children: (
                <div className="guests-card-list-scroll">
                    {renderGroupedCards(sortForTab('confirmado', confirmedData), getTabColumns(columns, 'confirmado'))}
                </div>
            ),
        },
        {
            label: screens.xs ? <LuX size={14} /> : `${t('guests.tab_rejected')} (${countGuestRows(rejectedData)})`,
            key: "rechazado",
            children: (
                <div className="guests-card-list-scroll">
                    {renderGroupedCards(sortForTab('rechazado', rejectedData), getTabColumns(columns, 'rechazado'))}
                </div>
            ),
        },

    ]), [
        columns,
        createdData,
        waitingData,
        confirmedData,
        rejectedData,
        screens.xs,
        activeSort,
        dispatchMap,
        sendMode,
        bulkSelected,
        bulkSending,
    ]);

    const getMessagesUpdates = async () => {

        try {
            const { data, error } = await supabase
                .rpc('get_latest_invitation_dispatches', {
                    p_invitation_id: id
                });

            if (error) return

            // console.log('messages updates: ', data)
            setMessagesDispatch(data)
        } catch (error) {
            console.log(error)
        }
    }

    const onSendInvitation = async (guest) => {

        const guestPatch = {

            state: 'esperando',
            last_action: guest.state,
            last_action_by: true,
            last_update_date: new Date()
        };

        const { error: guestError } = await supabase
            .from('side_events_guests')
            .update(guestPatch)
            .eq('id', guest.id)
            .select('*')
            .maybeSingle();

        if (guestError) throw guestError;
        // console.log('Guest actualizado:', guestRow);
        // setOnBubble(true)
        getGuests()

    }

    const onSedingInvitation = async (data, guest, retry = false) => {
        if (hasPendingInfo) {
            message.warning('Completa la información pendiente de tu invitación antes de enviar.')
            return
        }

        if (!guest?.name?.trim()) {
            message.warning(t('side_events.warning_guest_no_name'))
            return
        }

        if (!data?.name?.trim()) {
            message.warning(t('side_events.warning_event_no_name'))
            return
        }

        if (data) {
            setCreditSending()
            try {
                const payload = {

                    invitationId: id,
                    guestId: guest.id,
                    guestName: guest.name,
                    guestPhone: guest.phone_number.replace(/^\+/, ""),

                    messaging_product: "whatsapp",
                    to: guest?.phone_number?.replace(/^\+/, ""),
                    type: "template",
                    // Tres variantes sobre el mismo endpoint/registro (igual que
                    // GuestsPage): retry → invitation_retry; con rsvp_deadline del
                    // side event → invitation_deadline ({{3}} = fecha límite);
                    // sin fecha → invitation_v2.
                    template: {
                        name: retry ? "invitation_retry" : current?.rsvp_deadline ? "invitation_deadline" : "invitation_v2",
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
                                            link: current?.url_image ?? data?.body.image,
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
                                            text: `${data?.name}`.replace(/[\n\r]/g, " "),
                                        },
                                    ]
                                    : [
                                        {
                                            type: "text",
                                            text: `${data?.name}`.replace(/[\n\r]/g, " "),
                                        },
                                        {
                                            type: "text",
                                            text: guest?.name,
                                        },
                                        // invitation_deadline agrega {{3}}: la fecha límite,
                                        // mismo formato que los reminders
                                        ...(current?.rsvp_deadline ? [{
                                            type: "text",
                                            text: formatAbsoluteDateEs(current.rsvp_deadline),
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
                                        text: `side-event/${data?.id}?password=${guest.password}`,
                                    },
                                ],
                            },
                        ],
                    },
                };


                // console.log(payload)

                const response = await axios.post(
                    `${import.meta.env.VITE_API_URL}/api/whats`,
                    // "http://localhost:4000/api/whats",
                    payload
                );
                if (response.data.ok) {
                    // Un reintento no consume créditos (igual que en GuestsPage)
                    if (!retry) {
                        onUpdateCredits()
                    }
                    setCreditSuccess()
                    onSendInvitation(guest)

                }

            } catch (error) {
                clearCreditState()
                console.log(error.response?.data || error.message);
                throw error;
            }
        } else {
            message.warning(t('side_events.warning_complete'))
            // console.log(data?.body?.image)
            // console.log(data?.name)
        }

    };

    const getSideEvents = async () => {
        const { data, error } = await supabase
            .from('side_events')
            .select('*')
            .eq('invitation_id', id)

        if (error) {
            console.error(error)
            setsideEvent([])
        }

        setsideEvent(data)
    }

    const getCredits = async () => {
        const { data, error } = await supabase
            .from('invitations')
            .select('credits, plan, name, label, phone_number, owners')
            .eq('id', id)
            .maybeSingle()

        if (error) {
            console.error('Error al obtener invitados:', error)
            return
        }
        setPlan(data.plan)
        setCredits(data.credits)
        setInvName(data.name ?? null)
        setInvLabel(data.label ?? null)
        setInvPhone(data.phone_number ?? null)
        setInvOwners(data.owners ?? [])
    }

    dayjs.locale('es');

    const insertSideEvent = async () => {
        const { data, error } = await supabase
            .from('side_events')
            .insert({
                invitation_id: id, // uuid
                date: new Date().toISOString(), // timestamp
                name: null,
                url_image: null,
                body: {
                    address: {
                        street: null,
                        number: null,
                        neighborhood: null,
                        zipcode: null,
                        country: null,
                        state: null,
                        city: null,
                        url: null,
                    },
                    hour: null,
                    timezone: null,
                    place_name: null,
                    image: null,
                    title: {
                        font: 'Poppins',
                        size: 36,
                        weight: 600,
                        opacity: 1,
                        line_height: 1.4
                    },
                    font: 'Poppins',
                    color: "#000000",
                    extras: null,
                    hideWeather: false
                }
            })
            .select()
            .single()

        if (error) {
            console.error(error)
            return
        }

        // console.log('side event: ', data)

        setsideEvent((prev) => [...prev, data])
    }

    const saveSideEvent = async () => {
        if (!current?.id) return;

        const body = {
            ...current.body,
            timezone: getTimezoneForState(current.body?.address?.state),
        };

        const { error } = await supabase
            .from('side_events')
            .update({
                name: current.name,
                url_image: current.url_image === null ? current.body.image : current.url_image,
                body,
            })
            .eq('id', current.id);

        if (error) {
            console.error('Error al guardar cambios:', error);
            return;
        }

        // console.log('Cambios guardados correctamente');
        message.success(t('side_events.saved'))
    };



    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success(t('side_events.copied'))
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
                    title: current?.name ?? 'Evento',
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

    const getGuests = async (sideEventId = current?.id) => {

        try {
            if (sideEventId) {
                const { data, error } = await supabase
                    .from("side_events_guests")
                    .select("*")
                    .eq("side_events_id", sideEventId)

                if (error) {
                    console.error("Error al obtener invitaciones:", error);
                } else {
                    setRawData(data)
                }
            }
        } catch (error) {
            console.log(error)
        }
    }

    const getMainGuests = async () => {

        try {
            const { data, error } = await supabase
                .from("guests")
                .select("*")
                .eq("invitation_id", id)

            if (error) {
                console.error("Error al obtener invitaciones:", error);
            } else {

                setMainGuests(data)
            }
        } catch (error) {
            console.log(error)
        }
    }

    // Id del "lider" de familia de un invitado de la lista principal:
    // null si el propio invitado es el lider (sin companion_id).
    const parentIdOf = (guest) => (
        guest?.companion_id === null || guest?.companion_id === undefined
            ? null
            : Number(guest.companion_id)
    )

    // La lista principal se muestra agrupada por familia (lider + acompanantes)
    // para poder importar el grupo completo con un solo check o cada integrante
    // por separado. El filtro de busqueda conserva el grupo entero cuando
    // coincide cualquiera de sus integrantes.
    const mainGuestGroups = useMemo(() => {
        if (!mainGuests) return null

        const clusters = new Map()

        mainGuests.forEach((g) => {
            const familyKey = parentIdOf(g) ?? g.id
            if (!clusters.has(familyKey)) clusters.set(familyKey, [])
            clusters.get(familyKey).push(g)
        })

        const query = (searchMain || '').toLowerCase()

        return Array.from(clusters.values())
            .map((members) => {
                const leader = members.find((m) => parentIdOf(m) === null) ?? members[0]
                return {
                    leader,
                    companions: members.filter((m) => m.id !== leader.id),
                }
            })
            .filter(({ leader, companions }) => (
                !query || [leader, ...companions].some((m) => m.name?.toLowerCase().includes(query))
            ))
    }, [mainGuests, searchMain])

    const isAlreadyInSide = (guest) => rawData?.some((n) => n.password === guest.password)
    const isReadyToAdd = (guest) => readyToAdd.some((i) => i.id === guest.id)

    const handleImport = (state, item) => {
        if (state) {
            setReadyToAdd((prev) => (prev.some(i => i.id === item.id) ? prev : [...prev, item]))
        }

        if (!state) {
            setReadyToAdd((prev) => prev.filter(i => i.id !== item.id))
        }
    }

    // Check del grupo: solo mueve a los integrantes que aun no estan en el
    // side event, para no pelearse con los checks deshabilitados.
    const handleImportGroup = (state, group) => {
        const members = [group.leader, ...group.companions].filter((m) => !isAlreadyInSide(m))

        if (state) {
            setReadyToAdd((prev) => {
                const next = [...prev]
                members.forEach((m) => { if (!next.some(i => i.id === m.id)) next.push(m) })
                return next
            })
            return
        }

        const ids = new Set(members.map((m) => m.id))
        setReadyToAdd((prev) => prev.filter(i => !ids.has(i.id)))
    }

    // Fila de invitado de la lista principal dentro del popup de importacion.
    // `isChild` solo la indenta: el check sigue siendo individual.
    const renderImportRow = (guest, isChild = false) => {
        const alreadyAdded = isAlreadyInSide(guest)

        return (
            <div
                key={guest.id}
                className={`single_row import_list_row ${isChild ? 'import_list_row--child' : ''} ${alreadyAdded ? 'row_active' : ''}`}
                style={{ alignSelf: 'stretch', padding: '8px' }}
            >
                {
                    alreadyAdded
                        ? <Checkbox disabled checked />
                        : <Checkbox checked={isReadyToAdd(guest)} onChange={(e) => handleImport(e.target.checked, guest)} />
                }

                {isChild && <BsArrowReturnRight size={12} style={{ color: '#787878', flexShrink: 0 }} />}

                <span style={{ minWidth: '130px', flex: 1, }}>{truncate(guest.name, 20)}</span>

                <div className='new-table-tag' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '60px', maxWidth: '60px' }}>
                    <span style={{ fontSize: '12px' }}>{guest.tag ?? "-"}</span>
                </div>

                <div className={`new-table-tag state-${guest.state}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '80px', maxWidth: '80px' }}>
                    <span style={{ fontSize: '12px' }}>{guest.state ?? "-"}</span>
                </div>

            </div>
        )
    }

    const groupSelectionState = (group) => {
        const members = [group.leader, ...group.companions].filter((m) => !isAlreadyInSide(m))
        const selected = members.filter(isReadyToAdd).length

        return {
            selectable: members.length,
            checked: members.length > 0 && selected === members.length,
            indeterminate: selected > 0 && selected < members.length,
        }
    }

    const handleSideGuests = async () => {
        if (!readyToAdd.length) return

        const buildRow = (i, companionId, hasCompanion) => ({
            side_events_id: current?.id,
            password: i.password,
            phone_number: i.phone_number,
            name: i.name,
            tier: i.tier,
            tag: i.tag,
            table: i.table,
            state: 'creado',
            last_action: 'creado',
            notes: i.notes,
            meal: null,
            companion_id: companionId,
            ticket: true,
            has_companion: hasCompanion,
            last_action_by: true,
        })

        const selectedIds = new Set(readyToAdd.map(i => i.id))
        const passwordById = new Map((mainGuests ?? []).map(g => [g.id, g.password]))
        // Lideres que ya viven en el side event (importados antes), para poder
        // colgarles un acompanante nuevo en vez de meterlo como individual.
        const existingIdByPassword = new Map((rawData ?? []).map(r => [r.password, r.id]))

        const leaders = []
        const companionsByLeaderId = new Map()   // lider seleccionado en este lote
        const companionsByExistingId = new Map() // lider ya presente en el side event

        readyToAdd.forEach((i) => {
            const parentId = parentIdOf(i)

            if (parentId !== null && selectedIds.has(parentId)) {
                if (!companionsByLeaderId.has(parentId)) companionsByLeaderId.set(parentId, [])
                companionsByLeaderId.get(parentId).push(i)
                return
            }

            const existingLeaderId = parentId !== null
                ? existingIdByPassword.get(passwordById.get(parentId))
                : undefined

            if (existingLeaderId) {
                if (!companionsByExistingId.has(existingLeaderId)) companionsByExistingId.set(existingLeaderId, [])
                companionsByExistingId.get(existingLeaderId).push(i)
                return
            }

            leaders.push(i)
        })

        let insertedLeaders = []

        if (leaders.length) {
            const { data, error: guestError } = await supabase
                .from('side_events_guests')
                .insert(leaders.map(l => buildRow(l, null, (companionsByLeaderId.get(l.id) ?? []).length > 0)))
                .select('*');

            if (guestError) {
                console.error('Error al insertar guest:', guestError);
                return;
            }

            insertedLeaders = data ?? []
        }

        // El id del side event es nuevo, asi que la relacion lider-acompanante
        // se reconstruye emparejando por password (unico por invitado).
        const newIdByPassword = new Map(insertedLeaders.map(r => [r.password, r.id]))
        const companionRows = []

        leaders.forEach((l) => {
            const newLeaderId = newIdByPassword.get(l.password)
            if (!newLeaderId) return
            ;(companionsByLeaderId.get(l.id) ?? []).forEach((c) => companionRows.push(buildRow(c, newLeaderId, false)))
        })

        companionsByExistingId.forEach((companions, existingLeaderId) => {
            companions.forEach((c) => companionRows.push(buildRow(c, existingLeaderId, false)))
        })

        if (companionRows.length) {
            const { error: companionsError } = await supabase
                .from('side_events_guests')
                .insert(companionRows)

            if (companionsError) {
                console.error('Error al insertar companions:', companionsError);
                return;
            }

            const existingLeaderIds = Array.from(companionsByExistingId.keys())

            if (existingLeaderIds.length) {
                const { error: updateError } = await supabase
                    .from('side_events_guests')
                    .update({ has_companion: true })
                    .in('id', existingLeaderIds)

                if (updateError) console.error('Error al actualizar has_companion:', updateError)
            }
        }

        setReadyToAdd([])
        getGuests()
    }

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

        setCredits(updateCredits[0].credits ?? credits)

        // console.log('Créditos actualizados correctamente:', newCredits)
    }

    const truncate = (text, max = 50) =>
        text.length > max ? text.slice(0, max) + '...' : text;

    const handleImages = (e) => {
        setCurrent((prev) => ({ ...prev, body: { ...prev.body, image: e } }))
    }

    const updateURLimage = async (e) => {

        const { error } = await supabase
            .from('side_events')
            .update({ url_image: e })
            .eq("id", current.id)


        if (error) {
            console.error('Error actualizando:', error)
        } else {
            setCurrent((prev) => ({ ...prev, url_image: e }))
            message.success(t('side_events.image_updated'))

        }
    };


    // const onSaveNewTickets = async (newType) => {

    //     const { error } = await supabase
    //         .from('side_events')
    //         .update({ type: newType })
    //         .eq("id", current.id)


    //     if (error) {
    //         console.error('Error actualizando:', error)
    //     } else {
    //         setCurrent((prev) => ({ ...prev, type: newType }))
    //         message.success('Privacidad actualizada')

    //     }
    // };

    // const removeGuest = async (guestId) => {
    //     try {
    //         const { error: guestErr } = await supabase
    //             .from('side_events_guests')
    //             .delete()
    //             .eq('id', guestId);

    //         if (guestErr) throw guestErr;

    //         getGuests()
    //     } catch (error) {
    //         console.log(error)
    //     }
    // }


    useEffect(() => {
        // getInvitationImages(id);
        getCredits()
        getSideEvents()
        getMessagesUpdates()
    }, [id])


    // Si hay un lote de envío masivo en curso para este side event (p. ej. tras
    // recargar o cambiar de evento), revivir la isla de progreso.
    const getActiveBatch = async (sideEventId) => {
        if (!sideEventId) return
        const { data } = await supabase
            .from('invitation_send_batches')
            .select('id, total, sent_count, failed_count, status')
            .eq('side_event_id', sideEventId)
            .eq('status', 'processing')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (data) {
            setActiveBatch({ id: data.id, total: data.total, sent: data.sent_count, failed: data.failed_count, status: data.status })
        }
    }

    // Polling del lote activo cada 2.5s — al completarse refresca créditos
    // (por el reembolso de fallidos).
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
                getCredits()
            }
        }, 2500)

        return () => clearInterval(timer)
    }, [activeBatch?.id, activeBatch?.status])

    useEffect(() => {
        if (current) {
            getGuests()
            // Al cambiar de side event: salir del modo envío y buscar su lote activo
            setSendMode(false)
            setBulkSelected(new Set())
            setActiveBatch(null)
            getActiveBatch(current.id)
        }
    }, [current?.id])

    useEffect(() => {
        setCreatedData(groupByFamilyForStates(rawData, ['creado']))
        setWaitingData(groupByFamilyForStates(rawData, ['esperando']))
        setConfirmedData(groupByFamilyForStates(rawData, ['confirmado']))
        setRejectedData(groupByFamilyForStates(rawData, ['rechazado']))
        // Poda la selección bulk: si un guest ya no está en 'creado', sale solo
        setBulkSelected((prev) => {
            if (prev.size === 0) return prev
            const stillCreated = new Set(rawData.filter((g) => g.state === 'creado').map((g) => g.id))
            const next = new Set([...prev].filter((sid) => stillCreated.has(sid)))
            return next.size === prev.size ? prev : next
        })
    }, [rawData])

    useEffect(() => {
        currentRef.current = current;
    }, [current])

    useEffect(() => {
        if (!id) return;

        const u1 = subscribe('side_events_guests', (payload) => {
            const sideEventId = payload.new?.side_events_id ?? payload.old?.side_events_id;
            if (sideEventId && String(sideEventId) === String(currentRef.current?.id)) {
                getGuests(currentRef.current.id)
            }
        });

        const u2 = subscribe('invitation_message_dispatches', (payload) => {
            const row = payload.new || payload.old;
            if (!row || String(row.invitation_id) !== String(id)) return;
            getMessagesUpdates()
            getGuests(currentRef.current?.id)
        });

        return () => { u1(); u2(); };
    }, [id])




    return (
        <>
            <Layout
                style={{
                    position: 'relative',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--ft-color)',
                    width: '100%',
                }}>
                <HeaderDashboard
                    mode={'side'}
                    sideEventName={current?.name}
                    onSideEventsBack={current ? () => { setCurrent(null); setMobilePanel(0); } : undefined}
                />
                <Layout className='build-invitation-layout' style={{
                    paddingTop: '0px',
                    position: 'relative',
                    marginTop: screens.xs ? '0px' : '20px'
                }} >

                    {!current && <div className='guests-info-container' style={{ padding: '24px', marginTop: '65px', paddingBottom: '24px', }}>

                        <span className='guests-title-page'>{t('side_events.page_title')}</span>

                        {
                            sideEvent ?
                                <div className='side_events_container'>

                                    {(() => {
                                        const canCreate = (plan === 'pro' && sideEvent.length < 3) || (plan === 'lite' && sideEvent.length < 1);
                                        return (
                                            <div
                                                onClick={canCreate ? insertSideEvent : () => handleCheckout(id, PRICE_IDS.SIDE_EVENT)}
                                                className='side_event_item se-new-card'
                                            >
                                                <div className='new_inv_cont' style={{ minHeight: 'unset', flex: 1, width: '100%' }}>
                                                    <div className='add_button_circle'>
                                                        {canCreate
                                                            ? <Plus size={32} color='#0c171b' strokeWidth={2} />
                                                            : <LuShoppingCart size={32} color='#0c171b' strokeWidth={2} />
                                                        }
                                                    </div>
                                                    <span className='cta_title'>
                                                        {canCreate ? t('side_events.cta_new_title') : t('side_events.cta_more_title')}
                                                    </span>
                                                    <span className='cta_text'>
                                                        {canCreate ? t('side_events.cta_new_text') : t('side_events.cta_more_text')}
                                                    </span>
                                                    {!canCreate && <Button type='primary' className='cta_plans'>{t('side_events.cta_buy')}</Button>}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {
                                        sideEvent?.map((item, index) => (
                                            <div key={index} onClick={() => { setCurrent(item) }} className='side_event_item'>
                                                {
                                                    item.body?.image ? <img lazyload src={item.body?.image} alt='none' style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                                                        : <LuImage size={44} style={{ color: '#CCC' }} />
                                                }
                                                <div className='blur-cover'></div>
                                                <span style={{
                                                    position: 'absolute', bottom: '10%', left: '50%', transform: 'translate(-50%)', fontWeight: 600,
                                                    color: '#FFF', fontSize: '24px', textAlign: 'center', lineHeight: 1.2, width: '80%',
                                                    zIndex: 2, textShadow: '0px 0px 8px rgba(0,0,0,0.4)'
                                                }}>{item?.name ?? t('side_events.no_name')}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                                : <div className='side_events_spin'>
                                    <Spin />
                                </div>
                        }

                    </div>}

                    {current && (
                    <div className='side-event-detail-cont' style={{ minHeight:'calc(100vh - 60px)'}}>

                        {/* Slider wrapper: relative container on mobile, transparent on desktop */}
                        <div style={screens.xs ? { position: 'relative', width: '100%', flex: 1, overflow: 'hidden' } : { display: 'flex', flex: 1, overflow: 'hidden', gap:'12px', }}>

                            {/* Slide track: 200% wide flex row on mobile, transparent on desktop */}
                            <div style={screens.xs ? {
                                display: 'flex', flexDirection: 'row',
                                width: '200%', height: '100%',
                                transform: `translateX(${mobilePanel === 0 ? '0%' : '-50%'})`,
                                transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                willChange: 'transform',
                                
                            } : { display: 'contents' }}>

                                {/* Panel 0 — design */}
                                <div style={screens.xs ? { width: '50%', flexShrink: 0, height: '100%', overflow: 'hidden',  } : { display: 'contents',  }}>
                                    <div className='side_invitation_cont' style={{ background: handlePreview ? '#FFFFFF' : undefined, ...(screens.xs ? { width: '100%', maxWidth: '100%', minWidth: 'unset', height: '100%' } : {}) }}>
                                        {
                                            handlePreview ?

                                                <>
                                                    <div className={`inv-device-main-container-ios`} style={{ transform: 'scale(0.8)', marginLeft: '0px' }}>
                                                        <div className={`device-buttons-container-ios`}>
                                                            <div className={`device-button-ios`} />
                                                            <div className={`device-button-ios`} />
                                                            <div className={`device-button-ios`} />
                                                        </div>
                                                        <div className={`device-power-button-ios`} />
                                                        <div className={`inv-device-container-ios scroll-invitation`}>

                                                            <div className={`inv-black-space-ios`}>
                                                                <span>5:15</span>
                                                                <div className={`camera-ios`} />
                                                                <div>
                                                                    {/* <img alt='' src={ios_settings} style={{
                                                        height: '100%', objectFit: 'cover'
                                                    }} /> */}
                                                                </div>
                                                            </div>

                                                            <div className={`scroll-invitation ios-invitation `}>
                                                                <SideEventHost config={current} />
                                                                {/* <InvitationTest setCurrentOffsetTop={setCurrentOffsetTop} positionY={positionY} invitation={invitation} size={size} /> */}
                                                            </div>
                                                            <div className={`inv-light-space-ios`} />
                                                        </div>
                                                    </div>
                                                </>

                                                :
                                                <>
                                                    {
                                                        current?.body?.image &&
                                                        <img src={current?.body.image} alt=''
                                                            style={{
                                                                position: 'absolute', width: '100%', height: '100%', objectFit: 'cover',
                                                                top: 0, zIndex: 0
                                                            }} />
                                                    }



                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', width: '100%' }}>
                                                        {
                                                            !current?.body?.image &&
                                                            <div className='add_image_cont'>
                                                                <LuImage style={{ color: '#FFF' }} />
                                                            </div>
                                                        }

                                                        <StorageImages invitationID={id} handleImage={handleImages} type={'side-events'} />
                                                    </div>

                                                    <div className='side_info_cont' style={{ overflow: addressOpen ? 'visible' : 'hidden' }}>
                                                        <TextArea
                                                            key={`
                                            ${current?.body?.title?.size}-
                                            ${current?.body?.title?.line_height}-
                                            ${current?.body?.title?.font}-
                                            ${current?.body?.title?.weight}
                                        `}
                                                            className="side_title_input"
                                                            placeholder={t('side_events.event_title_placeholder')}
                                                            autoSize={{ minRows: 2, maxRows: 6 }}
                                                            value={current?.name}
                                                            onChange={(e) =>
                                                                setCurrent(prev => ({ ...prev, name: e.target.value }))
                                                            }
                                                            style={{
                                                                fontSize: current?.body?.title?.size ?? 24,
                                                                lineHeight: current?.body?.title?.line_height ?? 1.4,
                                                                fontFamily: current?.body?.title?.font ?? 'Poppins',
                                                                fontWeight: current?.body?.title?.weight ?? 500,
                                                                opacity: current?.body?.title?.opacity ?? 1,
                                                                padding: '24px',
                                                                color: '#FFFFFF',
                                                            }}
                                                        />


                                                        {screens.xs ? (
                                                            datePickerOpen ? (
                                                                <div className='date_inline_cont'>
                                                                    <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                        <span style={{ color: '#FFFFFF80', fontSize: '12px' }}>{t('side_events.datetime_label')}</span>
                                                                        <Button
                                                                            type='text'
                                                                            icon={<LuX size={14} style={{ color: '#FFF' }} />}
                                                                            style={{ minWidth: 24, maxWidth: 24, maxHeight: 24 }}
                                                                            onClick={() => setDatePickerOpen(false)}
                                                                        />
                                                                    </div>
                                                                    <DatePicker
                                                                        onChange={(e) => { setCurrent((prev) => ({ ...prev, body: { ...prev.body, hour: dayjsToWallClock(e) } })); setDatePickerOpen(false); }}
                                                                        className='date_pciker_sidee'
                                                                        showTime
                                                                        style={{ width: '100%' }}
                                                                        getPopupContainer={() => document.body}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className='side_date_time' onClick={() => setDatePickerOpen(true)}>
                                                                    <LuCalendarClock size={20} style={{ color: '#FFF' }} />
                                                                    {current?.body?.hour ? <span>{formatEventDateTime(current.body.hour, { state: current.body?.address?.state, timezone: current.body?.timezone })}</span> : <span>{t('side_events.datetime_label')}</span>}
                                                                </div>
                                                            )
                                                        ) : (
                                                            <Dropdown
                                                                trigger={['click']}
                                                                placement='right'
                                                                popupRender={() => (
                                                                    <DatePicker onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, hour: dayjsToWallClock(e) } }))} className='date_pciker_sidee' showTime getPopupContainer={() => document.body} />
                                                                )}
                                                            >
                                                                <div className='side_date_time'>
                                                                    <LuCalendarClock size={20} style={{ color: '#FFF' }} />
                                                                    {current?.body?.hour ? <span>{formatEventDateTime(current.body.hour, { state: current.body?.address?.state, timezone: current.body?.timezone })}</span> : <span>{t('side_events.datetime_label')}</span>}
                                                                </div>
                                                            </Dropdown>
                                                        )}

                                                        <div className='side_date_time' style={{ cursor: 'default' }}>
                                                            <LuLandmark size={20} style={{ color: '#FFF' }} />
                                                            <Input
                                                                value={current?.body?.place_name ?? ''}
                                                                onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, place_name: e.target.value } }))}
                                                                placeholder={t('side_events.place_name_label')}
                                                                variant='borderless'
                                                                className='side_place_input'
                                                            />
                                                        </div>

                                                        {addressOpen ? (
                                                            <div className='address_inline_form'>
                                                                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <span style={{ color: '#FFFFFF80', fontSize: '12px' }}>{t('side_events.address_label')}</span>
                                                                    <Button
                                                                        type='text'
                                                                        icon={<LuX size={14} style={{ color: '#FFF' }} />}
                                                                        style={{ minWidth: 24, maxWidth: 24, maxHeight: 24 }}
                                                                        onClick={() => setAddressOpen(false)}
                                                                    />
                                                                </div>

                                                                <AddressAutocomplete
                                                                    onSelect={(addr) => setCurrent((prev) => ({
                                                                        ...prev,
                                                                        body: { ...prev.body, address: { ...prev.body.address, ...addr } }
                                                                    }))}
                                                                />

                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span>{t('side_events.address_zipcode')}</span>
                                                                    <Input value={current?.body?.address?.zipcode} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, zipcode: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span>{t('side_events.address_street')}</span>
                                                                    <Input value={current?.body?.address?.street} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, street: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span>{t('side_events.address_number')}</span>
                                                                    <Input value={current?.body?.address?.number} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, number: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span>{t('side_events.address_neighborhood')}</span>
                                                                    <Input value={current?.body?.address?.neighborhood} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, neighborhood: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span>{t('side_events.address_city')}</span>
                                                                    <Input value={current?.body?.address?.city} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, city: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span>{t('side_events.address_state')}</span>
                                                                    <Input value={current?.body?.address?.state} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, state: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <span>{t('side_events.address_country')}</span>
                                                                    <Input value={current?.body?.address?.country} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, country: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                                                                    <span>{t('side_events.address_url')}</span>
                                                                    <Input value={current?.body?.address?.url} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body.address, url: e.target.value } } }))} className='sidee_input' />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className='side_date_time' onClick={() => setAddressOpen(true)}>
                                                                <LuMapPin size={20} style={{ color: '#FFF' }} />
                                                                {current?.body?.address?.zipcode
                                                                    ? <span style={{ textAlign: 'center' }}>{current.body.address.street} {current.body.address.number} {current.body.address.neighborhood}, {current.body.address.zipcode}, {current.body.address.city}, {current.body.address.state}, {current.body.address.country}</span>
                                                                    : <span>{t('side_events.address_label')}</span>
                                                                }
                                                            </div>
                                                        )}

                                                        <TextArea
                                                            key={`
                                                     ${current?.body?.title?.line_height}-
                                                    ${current?.body?.title?.weight}-
                                                    ${current?.body?.title?.size}-
                                                     ${current?.body?.title?.font}`}
                                                            className="side_title_input scroll-invitation"
                                                            placeholder={t('side_events.extras_placeholder')}
                                                            autoSize={{ minRows: 0, maxRows: 4 }}
                                                            value={current?.body?.extras}
                                                            onChange={(e) =>
                                                                setCurrent(prev => ({ ...prev, body: { ...prev.body, extras: e.target.value } }))
                                                            }
                                                            style={{
                                                                fontSize: '16px',
                                                                padding: '12px',
                                                                color: '#FFFFFF',
                                                            }}
                                                        />


                                                    </div>

                                                </>

                                        }

                                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'absolute', top: '16px', left: '16px', right: '16px', gap: '12px' }}>

                                            {!handlePreview
                                                ? <Button onClick={saveSideEvent} icon={<LuUpload />} className={'save_button_sidee'}>{t('side_events.btn_save')}</Button>
                                                : <Button icon={<LuCornerUpLeft />} onClick={() => setHandlePreview(false)} className={'save_button_sidee'}>{t('side_events.btn_back')}</Button>
                                            }

                                            {!handlePreview && (
                                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                                                    <Tooltip title={t('side_events.tooltip_preview')}>
                                                        <Button icon={<LuPlay />} onClick={() => setHandlePreview(true)} className='preview_button_sidee' />
                                                    </Tooltip>

                                                    <Tooltip title={current?.body?.hideWeather ? t('side_events.tooltip_show_weather') : t('side_events.tooltip_hide_weather')}>
                                                        <Button
                                                            icon={current?.body?.hideWeather ? <CloudOff size={16} /> : <Cloud size={16} />}
                                                            onClick={() => setCurrent((prev) => ({ ...prev, body: { ...prev.body, hideWeather: !prev.body?.hideWeather } }))}
                                                            className='preview_button_sidee'
                                                        />
                                                    </Tooltip>

                                                    {screens.xs ? (
                                                        <Button className='preview_button_sidee' icon={<LuPalette />} onClick={() => setColorDrawerOpen(true)} />
                                                    ) : (
                                                        <Dropdown
                                                            placement='bottomLeft'
                                                            trigger={['click']}
                                                            popupRender={() => (
                                                                <div className='generals-settings-popup' style={{ width: 'auto', background: '#00000040', backdropFilter: 'blur(10px)' }}>
                                                                    <ColorPicker value={current?.body?.color ?? "#000000"} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev?.body, color: colorFactoryToHex(e) } }))} />
                                                                </div>
                                                            )}
                                                        >
                                                            <Button className='preview_button_sidee' icon={<LuPalette />} />
                                                        </Dropdown>
                                                    )}

                                                    {screens.xs ? (
                                                        <Button className='preview_button_sidee' icon={<LuType />} onClick={() => setFontDrawerOpen(true)} />
                                                    ) : (
                                                        <Dropdown
                                                            trigger={['click']}
                                                            placement='bottomRight'
                                                            popupRender={() => (
                                                                <div className='generals-settings-popup' style={{ backgroundColor: `${current?.body?.color ?? "#000000"}40`, backdropFilter: 'blur(10px)' }}>
                                                                    <span style={{ color: '#FFF' }} className='gc-content-label'>{t('side_events.font_type')}</span>
                                                                    <Select value={current?.body?.title?.font} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, font: e } } }))} style={{ width: '100%' }}>
                                                                        {fonts.map((font, index) => (
                                                                            <Option key={`${index}-${font}`} value={font}><span style={{ fontFamily: font }}>{font}</span></Option>
                                                                        ))}
                                                                    </Select>
                                                                    <Col style={{ width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column', marginTop: '10px' }}>
                                                                        <span style={{ color: '#FFF' }} className='gc-content-label'>{t('side_events.font_size')}</span>
                                                                        <Slider style={{ width: '95%' }} min={36} max={64} step={2} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, size: e } } }))} value={current.body.title?.size ?? 36} />
                                                                        <span style={{ color: '#FFF' }} className='gc-content-label'>{t('side_events.font_line_height')}</span>
                                                                        <Slider style={{ width: '95%' }} min={0.8} max={2} step={0.1} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, line_height: e } } }))} value={current.body.title?.line_height ?? 1.4} />
                                                                        <Row style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' }}>
                                                                            <Col style={{ width: '48%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column' }}>
                                                                                <span style={{ color: '#FFF' }} className='gc-content-label'>{t('side_events.font_opacity')}</span>
                                                                                <Slider style={{ width: '95%' }} min={0} max={1} step={0.01} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, opacity: e } } }))} value={current.body.title?.opacity ?? 1} />
                                                                            </Col>
                                                                            <Col style={{ width: '48%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexDirection: 'column' }}>
                                                                                <span style={{ color: '#FFF' }} className='gc-content-label'>{t('side_events.font_weight')}</span>
                                                                                <Slider style={{ width: '95%' }} min={100} max={1000} step={100} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, weight: e } } }))} value={current.body.title?.weight ?? 500} />
                                                                            </Col>
                                                                        </Row>
                                                                    </Col>
                                                                </div>
                                                            )}
                                                        >
                                                            <Button className='preview_button_sidee' icon={<LuType />} />
                                                        </Dropdown>
                                                    )}
                                                </div>
                                            )}

                                        </div>

                                    </div>
                                </div>

                                {/* Panel 1 — table */}
                                <div style={screens.xs ? { width: '50%', flexShrink: 0, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '16px', paddingBottom: '88px' } : { display: 'contents' }}>
                                    <div className='side_table_cont' style={screens.xs ? { width: '100%', minWidth: '100%', padding: '0px' } : {}}>

                                        {screens.xs && (
                                            <span style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 600, display: 'block', marginBottom: '12px' }}>{t('side_events.mobile_guests')}</span>
                                        )}

                                        {/* En modo envío el bloque se tiñe de azul con las instrucciones */}
                                        <div style={{
                                            marginBottom: 12, boxSizing: 'border-box', transition: 'background 0.3s ease, border 0.3s ease',
                                            borderRadius: 16,
                                            ...(sendMode && {
                                                background: 'var(--blue-bg-40)',
                                                border: '1px solid var(--blue-color-20)',
                                                padding: 12,
                                            }),
                                        }}>
                                            {renderRsvpDeadlineBar()}
                                            {sendMode && (
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 10 }}>
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
                                        </div>

                                        <Tabs
                                            className="side-tabs"
                                            activeKey={activeKey}
                                            onChange={setActiveKey}
                                            style={screens.xs ? { overflow: 'visible' } : undefined}
                                            type="card"
                                            items={items}
                                            tabBarExtraContent={
                                                <div className='single_row' style={{ marginBottom: '12px', }}>

                                                    {/* Bulk shipment: Crear envío / Enviar todos + Cancelar */}
                                                    {activeKey === 'creado' && renderBulkActionsBar()}
                                                    {/* El botón de agregar se oculta durante el modo envío */}
                                                    {!sendMode && <Dropdown
                                                        key={0}
                                                        trigger={['click']}
                                                        placement='bottomRight'
                                                        popupRender={() => (
                                                            <GuestAddTiles
                                                                plan={plan}
                                                                // locked={plan !== 'pro'}
                                                                onIndividual={() => setDrawerState({
                                                                    currentGuest: null,
                                                                    onEditGuest: false,
                                                                    companions: [],
                                                                    visible: true
                                                                })}
                                                                onFile={(file) => navigate(`/dashboard/guests/import?id=${id}&side_events_id=${current?.id}`, { state: { file } })}
                                                                topExtra={
                                                                    <Dropdown
                                                                        key={1}
                                                                        trigger={['click']}
                                                                        placement='bottomLeft'
                                                                        popupRender={() => (
                                                                            <div key={3} className='side_guest_list'>
                                                                                <div className='single_row' style={{
                                                                                    alignSelf: 'stretch', justifyContent: 'space-between',
                                                                                    alignItems: 'flex-end'
                                                                                }}>
                                                                                    <span><b>{t('side_events.import_title')}</b></span>
                                                                                    <Button onClick={handleSideGuests} disabled={!readyToAdd.length} className='primarybutton--active' icon={<LuPlus />}>{`${t('side_events.import_add')}${readyToAdd.length ? ` (${readyToAdd.length})` : ''}`}</Button>
                                                                                </div>
                                                                                <Input value={searchMain} onChange={(e) => setSearchMain(e.target.value)} placeholder={t('side_events.import_search')} style={{ borderRadius: '99px' }} />
                                                                                <div className='single_col scroll-invitation' style={{
                                                                                    alignSelf: 'stretch', gap: '2px',
                                                                                    maxHeight: '480px', overflowY: 'auto', display:'flex',alignItems:'flex-start', justifyContent:'flex-start', flexDirection:'column'
                                                                                }}>
                                                                                    {
                                                                                        mainGuestGroups
                                                                                            ? mainGuestGroups.map((group) => {
                                                                                                const { leader, companions } = group

                                                                                                if (!companions.length) {
                                                                                                    return renderImportRow(leader)
                                                                                                }

                                                                                                const { selectable, checked, indeterminate } = groupSelectionState(group)

                                                                                                return (
                                                                                                    <div key={`group-${leader.id}`} className='import_group_card'>
                                                                                                        <div className='single_row import_group_header' style={{ alignSelf: 'stretch', padding: '4px 8px' }}>
                                                                                                            <Checkbox
                                                                                                                disabled={selectable === 0}
                                                                                                                checked={selectable === 0 ? true : checked}
                                                                                                                indeterminate={indeterminate}
                                                                                                                onChange={(e) => handleImportGroup(e.target.checked, group)}
                                                                                                            />
                                                                                                            <span style={{ fontSize: '12px', color: '#787878', flex: 1 }}>
                                                                                                                {t('side_events.import_group_label', { total: companions.length + 1 })}
                                                                                                            </span>
                                                                                                        </div>

                                                                                                        {renderImportRow(leader)}
                                                                                                        {companions.map((c) => renderImportRow(c, true))}
                                                                                                    </div>
                                                                                                )
                                                                                            })
                                                                                            : <Spin />
                                                                                    }

                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    >
                                                                        <button type="button" onClick={getMainGuests} className="guest-add-tile guest-add-tile--individual">
                                                                            <span className="guest-add-tile-icon">
                                                                                <Copy size={14} />
                                                                            </span>
                                                                            <span className="guest-add-tile-text">
                                                                                <span className="guest-add-tile-title">{t('side_events.btn_copy_list')}</span>
                                                                            </span>
                                                                        </button>
                                                                    </Dropdown>
                                                                }
                                                            />
                                                        )}
                                                    >
                                                        <Button className='primarybutton--active' icon={<Plus size={14} />} >{t('side_events.btn_add')}</Button>
                                                    </Dropdown>}


                                                    {/* <Button onClick={() => setOpen(false)} className='primarybutton' icon={<LuX />}></Button> */}
                                                </div>
                                            }

                                        />
                                    </div>
                                </div>

                            </div>

                            {screens.xs && (
                                <div style={{
                                    position: 'absolute', bottom: '16px', left: 0, right: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: '8px', zIndex: 20, padding: '0 16px', boxSizing: 'border-box',
                                }}>
                                    <Button
                                        icon={<ChevronLeft size={16} />}
                                        onClick={() => setMobilePanel(0)}
                                        style={{ minWidth: '44px', minHeight: '44px', borderRadius: '99px', background: '#00000080', backdropFilter: 'blur(10px)', border: 'none', color: '#FFF', opacity: mobilePanel === 0 ? 0.3 : 1, transition: 'opacity 0.3s ease', pointerEvents: mobilePanel === 0 ? 'none' : 'auto' }}
                                    />
                                    <Button
                                        onClick={() => { setCurrent(null); setMobilePanel(0); }}
                                        style={{ flex: 1, borderRadius: '99px', minHeight: '44px', background: '#00000080', backdropFilter: 'blur(10px)', border: 'none', color: '#FFF', boxShadow: '0px 0px 8px rgba(0,0,0,0.2)' }}
                                    >{t('side_events.btn_close')}</Button>
                                    <CustomLink
                                        backuImage={current?.body?.image}
                                        urlImage={current?.url_image}
                                        url={`https://www.iattend.events/side-event/${current?.id}`}
                                        id={id}
                                        handleImage={updateURLimage}
                                        name={current?.name}
                                        label="Compartir"
                                    />
                                    <Button
                                        icon={<ChevronRight size={16} />}
                                        onClick={() => setMobilePanel(1)}
                                        style={{ minWidth: '44px', minHeight: '44px', borderRadius: '99px', background: '#00000080', backdropFilter: 'blur(10px)', border: 'none', color: '#FFF', opacity: mobilePanel === 1 ? 0.3 : 1, transition: 'opacity 0.3s ease', pointerEvents: mobilePanel === 1 ? 'none' : 'auto' }}
                                    />
                                </div>
                            )}
                        </div>

                    </div>)}

                    <Drawer
                        open={colorDrawerOpen}
                        onClose={() => setColorDrawerOpen(false)}
                        placement="top"
                        height="40%"
                        style={{borderRadius:'0px 0px 24px 24px'}}
                        closeIcon={false}
                        title={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontFamily: 'Poppins', fontWeight: 500 }}>{t('side_events.color_drawer_title')}</span>
                            <Button type="text" icon={<LuX size={16} />} onClick={() => setColorDrawerOpen(false)} />
                        </div>}
                        styles={{ body: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' } }}
                    >
                        <ColorPicker
                            value={current?.body?.color ?? "#000000"}
                            onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev?.body, color: colorFactoryToHex(e) } }))}
                        />
                    </Drawer>

                    <Drawer
                        open={fontDrawerOpen}
                        onClose={() => setFontDrawerOpen(false)}
                        placement="top"
                        height="40%"
                        closeIcon={false}
                        title={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontFamily: 'Poppins', fontWeight: 500, color: '#FFF' }}>{t('side_events.font_drawer_title')}</span>
                            <Button type="text" icon={<LuX size={16} style={{ color: '#FFF' }} />} onClick={() => setFontDrawerOpen(false)} />
                        </div>}
                        style={{ borderRadius: '0px 0px 24px 24px', backgroundColor: `${current?.body?.color ?? "#000000"}80`, backdropFilter: 'blur(10px)' }}
                        styles={{ header: { backgroundColor: 'transparent', borderBottom: '1px solid #FFFFFF20' }, body: { padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'transparent' } }}
                    >
                        <span style={{color:'#FFF'}} className='gc-content-label'>{t('side_events.font_type')}</span>
                        <Select value={current?.body?.title?.font} onChange={(e) => setCurrent((prev) => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, font: e } } }))} style={{ width: '100%' }}>
                            {fonts.map((font, index) => (
                                <Option key={`${index}-${font}`} value={font}><span style={{ fontFamily: font }}>{font}</span></Option>
                            ))}
                        </Select>
                        <span style={{color:'#FFF'}}  className='gc-content-label'>{t('side_events.font_size')}</span>
                        <Slider min={36} max={64} step={2} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, size: e } } }))} value={current?.body?.title?.size ?? 36} />
                        <span style={{color:'#FFF'}}  className='gc-content-label'>{t('side_events.font_line_height')}</span>
                        <Slider min={0.8} max={2} step={0.1} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, line_height: e } } }))} value={current?.body?.title?.line_height ?? 1.4} />
                        <Row style={{ width: '100%', gap: '16px' }}>
                            <Col flex={1}>
                                <span style={{color:'#FFF'}}  className='gc-content-label'>{t('side_events.font_opacity')}</span>
                                <Slider min={0} max={1} step={0.01} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, opacity: e } } }))} value={current?.body?.title?.opacity ?? 1} />
                            </Col>
                            <Col flex={1}>
                                <span style={{color:'#FFF'}}  className='gc-content-label'>{t('side_events.font_weight')}</span>
                                <Slider min={100} max={1000} step={100} onChange={(e) => setCurrent(prev => ({ ...prev, body: { ...prev.body, title: { ...prev.body.title, weight: e } } }))} value={current?.body?.title?.weight ?? 500} />
                            </Col>
                        </Row>
                    </Drawer>


                </Layout >

                <GuestsCRUD rowData={rawData} invitationID={id} setDrawerState={setDrawerState} refreshPage={getGuests} drawerState={drawerState} isSideEvent={true} sideID={current?.id} />

                {/* Isla de progreso del envío masivo (estilo dynamic island) */}
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

                {/* Saldo insuficiente para recordatorios: CTA directo a la compra de créditos. */}
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
                <UpgradeBanner plan={plan} invitationId={id} hideOnMobile />
                <FooterApp></FooterApp>
            </Layout >
        </>
    )
}
