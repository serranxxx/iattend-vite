import { Badge, Button, Checkbox, ColorPicker, DatePicker, Dropdown, Grid, Input, Layout, message, Modal, Progress, Segmented, Select, Slider, Spin, Switch, Tooltip } from 'antd'
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './side-events.css'
import '../GuestManagement/guests-redesign.css'
import { LuImage, LuPlus, LuShoppingCart } from 'react-icons/lu'
import { supabase } from '../../lib/supabase'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { FaCheck, FaCoins, FaPaperPlane } from 'react-icons/fa'
import { BsArrowReturnRight } from 'react-icons/bs'
import axios from 'axios'
import { HeaderDashboard } from '../Header/Header'
import SideEventHost from '../../components/Host/SideEventHost'
import { colorFactoryToHex } from '../../helpers/assets/functions'
import { dayjsToWallClock, formatAbsoluteDateEs, formatEventDateTime, getTimezoneForState } from '../../helpers/assets/eventDateTime'
import { fonts as fallbackFonts } from '../../helpers/assets/fonts'
import { useFonts } from '../../context/FontsContext'
import { handleCheckout, PRICE_IDS } from '../../components/Payment/functions'
import { UpgradeBanner } from '../../components/Payment/UpgradeBanner/UpgradeBanner'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useDashboardRealtime } from '../../context/DashboardRealtimeContext'
import { useLia } from '../../context/LiaContext'
import { StorageImages } from '../../components/ImagesStorage/StorageImages'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, BellRing, CalendarDays, Check, ChevronRight, CircleHelp, Copy, Eye, ImagePlus, Info, Landmark, Link2, Palette, Plus, Search, Send, Share2, StickyNote, Trash2, Type, X } from 'lucide-react'
import { GuestsCRUD } from '../../components/Create/GuestsCRUD'
import { AddressAutocomplete } from './AddressAutocomplete'
import { FiArrowUpRight } from 'react-icons/fi'
import { CustomLink } from '../../components/CustomLink/CustomLink'
import { FooterApp } from '../Footer/FooterApp'
import { useTranslation } from 'react-i18next'
import { GuestAddTiles } from '../GuestManagement/GuestAddTiles'
import { CreditsComponent } from '../../components/Payment/Credits/Credits'
import BottomSheet from '../../components/BottomSheet/BottomSheet'
import SideCanvas from './SideCanvas'
import { ColorField, DateField, FontPicker } from '../../components/MobileFields/MobileFields'
import { SideEventsTour, SIDE_TOUR_STORAGE_KEY } from './SideEventsTour'
import ed from './SideEventEditor.module.css'
import sl from './SideEventsList.module.css'


const { Option } = Select;



dayjs.extend(relativeTime)

// ── Envío masivo oculto, igual que en GuestsPage ──────────────────────────
// Poner en true para restaurar "Crear envío", el modo de selección por bloques
// y su checkbox. Apagado, cada invitado se marca como enviado a mano.
const SHOW_BULK_SEND = false;

// Morph de la portada: el listado y el editor son ramas distintas del mismo
// componente, así que la continuidad se hace con un fantasma en `position:
// fixed` que vuela del rect de origen al de destino (FLIP).
const MORPH_MS = 760
const MORPH_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'
// El cross-fade del final va SOLAPADO con el último tramo del vuelo, no
// después: encadenarlos hacía que la pieza pareciera detenerse antes de
// aparecer.
const MORPH_FADE_MS = 260

// Medidas del device de `build-invitation.css` (pantalla 357×668 + marcos):
// el marco de "ver en vivo" mide lo mismo que la pieza en un teléfono.
const DEVICE_W = 387
const DEVICE_H = 793

// Lienzo de edición (SideCanvas.module.css)
const CARD_W = 390
const CARD_H = 700

// Tintes sugeridos para el tema: el color pinta el degradado de la columna de
// info y todas las tarjetas de la pieza (`--blur-color` del remoto).
const THEME_SWATCHES = [
    '#16323d',
    '#000000',
    '#E7E0CC',
    '#B9BBA6',
    '#D1BEDD',
    '#C67C6C',
]

// Campos de la dirección, en el orden en que se muestran en el panel
const ADDRESS_FIELDS = [
    ['street', 'address_street'],
    ['number', 'address_number'],
    ['neighborhood', 'address_neighborhood'],
    ['zipcode', 'address_zipcode'],
    ['city', 'address_city'],
    ['state', 'address_state'],
    ['country', 'address_country'],
]

// El DatePicker solo refleja las fechas que ya están en hora de pared: los
// eventos legados guardan un instante UTC real y habría que reconvertirlos
// con STATE_TIMEZONES (ver helpers/assets/eventDateTime.js).
const wallClockToDayjs = (raw) => {
    if (!raw) return null
    const value = String(raw).trim()
    if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(value)) return null
    const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/)
    return match ? dayjs(`${match[1]} ${match[2]}`) : null
}

export const SideEvents = () => {
    const { t, i18n } = useTranslation()
    const { setCreditSending, setCreditSuccess, clearCreditState } = useLia()

    const [sideEvent, setsideEvent] = useState(null)
    // Listado: cuál está seleccionado en el riel y el resumen de invitados de
    // TODOS los side events (el de `rawData` es solo del que está abierto).
    const [selectedId, setSelectedId] = useState(null)
    const [morph, setMorph] = useState(null)           // { image, from, dir, phase }
    const [morphedIn, setMorphedIn] = useState(false)  // entró al editor con morph
    const morphRef = useRef(null)
    const [guestCounts, setGuestCounts] = useState({})
    const [current, setCurrent] = useState(null)
    const [live, setLive] = useState(false)          // switch "ver en vivo"
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
    // Qué picker de fecha límite está abierto (id de slot, o null). NO es un
    // booleano a propósito: la línea se renderiza en varios tabs y antd los
    // mantiene montados, así que un flag compartido abría los dos popups a la
    // vez y el del tab oculto disparaba onOpenChange(false) al instante,
    // dejando el calendario muerto.
    const [rsvpPickerSlot, setRsvpPickerSlot] = useState(null)
    const [searchUser, setSearchUser] = useState(null)
    const [filterTag, setFilterTag] = useState(null)
    const [filterTier, setFilterTier] = useState(null)
    const [filterDelivery, setFilterDelivery] = useState(null)
    const [bulkSelected, setBulkSelected] = useState(() => new Set())
    const [bulkSending, setBulkSending] = useState(false)
    const [activeBatch, setActiveBatch] = useState(null)
    const [activeKey, setActiveKey] = useState('creado')

    // ── Editor: mismo modelo que el Save the Date ──
    const [activeTab, setActiveTab] = useState('diseno')     // diseno | envio
    const [section, setSection] = useState(null)             // elemento en edición
    const [dirty, setDirty] = useState(false)
    const [saving, setSaving] = useState(false)
    const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 720px)').matches)
    const [available, setAvailable] = useState({ h: 760, w: 1200 })

    // Catálogo del laboratorio de fuentes (tabla `fonts`, /admin → Herramientas).
    // La lista estática es solo el respaldo mientras carga o si la query falla:
    // mismo patrón que el builder (BuildCover / BuildGenerals / BuildQuote).
    const { fonts: activeFonts } = useFonts()
    const fonts = activeFonts.length ? activeFonts : fallbackFonts

    const [sheetSection, setSheetSection] = useState(null)
    const [sheetHeight, setSheetHeight] = useState(0)
    const [stageGap, setStageGap] = useState(0)
    const [sendMounted, setSendMounted] = useState(false)
    const [sendIn, setSendIn] = useState(false)
    // Tour del editor: se abre solo la primera vez que se entra a un side
    // event y se puede relanzar desde el "?" de la barra o de la escalera.
    const [tourOpen, setTourOpen] = useState(false)
    const [leaveMounted, setLeaveMounted] = useState(false)
    const [leaveIn, setLeaveIn] = useState(false)
    const [leaving, setLeaving] = useState(false)
    const stageRef = useRef(null)
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
    // Ids del listado, para refrescar sus números desde la subscripción de
    // realtime sin meter la lista en las dependencias del efecto.
    const sideEventIdsRef = useRef([]);
    const detailRef = useRef(null);
    // Destacado del listado móvil: el equivalente de `detailRef` en una columna.
    const featuredRef = useRef(null);

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


    // Las columnas de la tabla se eliminaron con el rediseño: cada tarjeta
    // arma su propia fila y su propia acción — ver renderGuestCard.


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

    // La lista tipo tabla se reemplazó por las tarjetas fluidas del rediseño
    // — ver renderGuestCard más abajo.

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

        // Mismo formato que /dashboard/guests: píldora blanca "Recordar", con
        // aria-disabled (no `disabled`) para que el Tooltip del motivo se vea.
        const button = (
            <button
                type="button"
                className="gx-btn gx-btn--ghost gx-btn--sm"
                aria-disabled={disabled}
                onClick={() => {
                    if (disabled) return
                    if (reason?.key === 'credits') {
                        setBuyCreditsOpen(true)
                    } else if (!reason) {
                        onSendReminder(record)
                    }
                }}
            >
                {t('guests.hero_sent_remind')}
            </button>
        )

        return (
            <Tooltip
                placement='topRight'
                color="var(--orange-bg)"
                title={<span style={{ color: 'var(--orange-color)', fontWeight: 600, textAlign: 'center' }}>{reason ? reason.label : count > 0 ? `${t('guests.reminder_count_tooltip')}: ${count}` : t('guests.reminder_btn_tooltip')}</span>}
            >
                {disabled ? button : (
                    <Badge count={count} size="small" color="var(--brand-color-500)" title="" offset={[-6, 2]}>
                        {button}
                    </Badge>
                )}
            </Tooltip>
        )
    }

    // Fecha límite, mismo formato que /dashboard/guests: alerta morada mientras
    // no está definida (sin ella no se pueden mandar recordatorios) y línea de
    // texto discreta una vez definida. El DatePicker vive oculto y lo abre el
    // enlace/botón de al lado.
    const renderRsvpPicker = (slot) => (
        <DatePicker
            open={rsvpPickerSlot === slot}
            onOpenChange={(next) => setRsvpPickerSlot(next ? slot : null)}
            value={current?.rsvp_deadline ? dayjs(current.rsvp_deadline) : null}
            onChange={onSaveRsvpDeadline}
            disabledDate={rsvpDisabledDate}
            allowClear={false}
            placeholder={t('guests.rsvp_deadline_placeholder')}
            getPopupContainer={() => document.body}
            className="gx-deadline-picker"
        />
    )

    const renderRsvpDeadlineAlert = (slot) => {
        if (current?.rsvp_deadline) return null
        return (
            <div className="gx-alert gx-alert--accent gx-deadline-alert" data-tour="se-deadline">
                <div className="gx-alert-badge"><BellRing size={16} /></div>
                <div className="gx-alert-texts">
                    <div className="gx-alert-title">{t('guests.rsvp_deadline_alert_title')}</div>
                    <div className="gx-alert-text">{t('guests.rsvp_deadline_alert_text')}</div>
                </div>
                <span className="gx-deadline-anchor">
                    <button type="button" className="gx-btn gx-btn--accent gx-btn--sm" onClick={() => setRsvpPickerSlot(slot)}>
                        {t('guests.rsvp_deadline_define')}
                    </button>
                    {renderRsvpPicker(slot)}
                </span>
            </div>
        )
    }

    const renderRsvpDeadlineLine = (slot) => {
        if (!current?.rsvp_deadline) return null
        return (
            <div className="gx-deadline" data-tour="se-deadline">
                <span className="gx-deadline-label">{t('guests.rsvp_deadline_label')}</span>
                <span className="gx-deadline-value">{formatAbsoluteDateEs(current.rsvp_deadline)}</span>
                <span className="gx-deadline-anchor">
                    <button type="button" className="gx-deadline-link" onClick={() => setRsvpPickerSlot(slot)}>
                        {t('guests.rsvp_deadline_change')}
                    </button>
                    {renderRsvpPicker(slot)}
                </span>
            </div>
        )
    }

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

    // Conteo de personas (líder + acompañantes) para el label de cada tab,
    // igual que en GuestsPage.
    const countGuestRows = (groupedData = []) =>
        groupedData
            .flatMap((g) => [g, ...(g.children || [])])
            .filter((g) => matchesFilters(g))
            .length;

    // ─────────────────────────────────────────────────────────────────────
    // Rediseño de la lista de invitados (mismo formato que /dashboard/guests).
    //
    // Comparte los estilos globales de guests-redesign.css: escalera de pasos,
    // tarjetas fluidas y fila de orden. Aquí no hay tab de Seguimiento ni
    // mesas — los side events solo manejan los cuatro estados.
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

    const sideLinkFor = (record) =>
        `https://www.iattend.events/side-event/${current?.id}?password=${record.password}`

    // Estado de entrega del tab "Esperando respuesta": etiqueta ya traducida y
    // tono que hereda el borde de la tarjeta.
    const sendStatusInfo = (record) => {
        const status = dispatchMap[record.id]?.status ?? 'undefined'
        const when = relativeWhen(record.invitation_sent_at || record.last_update_date)

        switch (status) {
            case 'failed':
                return { label: t('guests.msg_failed'), badge: 'red', tone: 'failed', when }
            case 'read':
                return { label: t('guests.msg_read_full'), badge: 'yellow', tone: 'read', when }
            case 'delivered':
                return { label: t('side_events.msg_delivered'), badge: 'blue', tone: null, when }
            case 'sent':
                return { label: t('side_events.msg_sent'), badge: 'blue', tone: null, when }
            case 'processing':
                return { label: t('side_events.msg_processing'), badge: 'gray', tone: null, when }
            default:
                return { label: t('side_events.msg_waiting'), badge: 'gray', tone: 'muted', when }
        }
    }

    const openGuestDrawer = (record) => setDrawerState({
        currentGuest: record,
        onEditGuest: true,
        companions: handleCompanions(record.id),
        visible: true,
    })

    const renderCopyLink = (record, small = false) => (
        <Tooltip title={t('side_events.magic_link')}>
            <button
                type="button"
                className={`gx-pill ${small ? 'gx-pill--sm' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleShare(sideLinkFor(record)) }}
            >
                <Link2 size={small ? 13 : 14} />
                <span>{t('guests.card_copy_link')}</span>
            </button>
        </Tooltip>
    )

    const renderCardChips = (record, muted = false, status = null) => (
        <div className="gx-chips-col">
            <div className="gx-chips">
                {status && (
                    <span className="gx-status-badge" data-tone={status.badge}>{status.label}</span>
                )}
                {record.tag && (
                    <Tooltip title={renderTag(record.tag)}>
                        <span className={`gx-chip ${muted ? 'gx-chip--muted' : ''}`}>{renderTag(record.tag)}</span>
                    </Tooltip>
                )}
                {record.tier && !muted && (
                    <span className={`gx-chip gx-chip--tier-${record.tier}`}>{record.tier}</span>
                )}
            </div>
            {status?.when && <span className="gx-status-when">{status.when}</span>}
        </div>
    )

    // Acción del tab "Por invitar": marcar como invitado a mano. El envío por
    // WhatsApp de un side event es siempre por lote (renderBulkActionsBar).
    const renderCreatedAction = (record) => {
        if (record.companion_id !== null && record.companion_id !== undefined) return null
        if (SHOW_BULK_SEND && sendMode) return isSendableGuest(record) ? renderBulkCheck(record) : null

        return (
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
        )
    }

    // Acción del tab "Esperando respuesta": el badge de estado vive al inicio de
    // la tarjeta, así que aquí solo queda el botón.
    const renderSentAction = (record) => {
        if (record.companion_id !== null && record.companion_id !== undefined) return null

        const status = dispatchMap[record.id]?.status ?? 'undefined'
        if (status === 'undefined') return null

        if (status === 'failed') {
            const blocked = !/^\+52\d+/.test(record.phone_number) || credits <= 0
            return (
                <Tooltip placement="topRight" color="var(--brand-color-500)" title={t('side_events.msg_retry_hint')}>
                    <button
                        type="button"
                        className="gx-btn gx-btn--accent gx-btn--sm"
                        aria-disabled={blocked}
                        onClick={() => { if (!blocked) onSedingInvitation(current, record, true) }}
                    >
                        {t('side_events.msg_retry')}
                    </button>
                </Tooltip>
            )
        }

        return renderReminderButton(record)
    }

    const renderGuestCard = (record, tabKey, children = []) => {
        const status = tabKey === 'esperando' ? sendStatusInfo(record) : null
        const isRejected = tabKey === 'rechazado'
        const isConfirmed = tabKey === 'confirmado'

        const actionNode = tabKey === 'creado'
            ? renderCreatedAction(record)
            : tabKey === 'esperando'
                ? renderSentAction(record)
                : null

        const selectable = SHOW_BULK_SEND && sendMode && record.state === 'creado' && isSendableGuest(record)
        const dimmed = SHOW_BULK_SEND && sendMode && record.state === 'creado' && !isSendableGuest(record)
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
            return <div className="gx-empty" data-tour="se-cards">{t('guests.no_guests')}</div>
        }
        return (
            <div className="gx-list" data-tour="se-cards">
                {data.map((group) => renderGuestCard(group, tabKey, group.children ?? []))}
            </div>
        )
    }

    // Orden: el rediseño quita el encabezado de columnas, así que el sort pasa
    // a esta fila de chips. Sin mesas, solo prioridad y estado de envío.
    const SORT_OPTIONS = {
        creado: [{ column: 'tier', label: 'side_events.col_priority' }],
        esperando: [
            { column: 'tier', label: 'side_events.col_priority' },
            { column: 'estado', label: 'side_events.col_state' },
        ],
        confirmado: [{ column: 'tier', label: 'side_events.col_priority' }],
        rechazado: [{ column: 'tier', label: 'side_events.col_priority' }],
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
            </div>
        )
    }

    // Escalera de pasos (sin Resumen: los side events no tienen ese tab)
    const STEP_DEFS = [
        { key: 'creado', step: 'step_one', label: 'step_label_creado' },
        { key: 'esperando', step: 'step_two', label: 'step_label_esperando' },
        { key: 'confirmado', step: 'step_three', label: 'step_label_confirmado' },
        { key: 'rechazado', step: 'step_aside', label: 'step_label_rechazado' },
    ]

    const renderStepBar = () => {
        const counts = {
            creado: countGuestRows(createdData),
            esperando: countGuestRows(waitingData),
            confirmado: countGuestRows(confirmedData),
            rechazado: countGuestRows(rejectedData),
        }

        return (
            <div className="gx gx-steps" role="tablist" data-tour="se-steps">
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
                            <span className="gx-step-count">{counts[d.key]}</span>
                        </span>
                    </button>
                ))}
                {tourAvailable &&
                    <Tooltip title={t('guests_tour.replay')}>
                        <button
                            type="button"
                            className="gx-tour-btn"
                            data-tour="tour-replay"
                            aria-label={t('guests_tour.replay')}
                            onClick={openTour}
                        >
                            <CircleHelp size={16} />
                        </button>
                    </Tooltip>
                }
            </div>
        )
    }

    // ── Búsqueda y filtros ───────────────────────────────────────────────
    // Mismo toolbar que /dashboard/guests. Side events no tiene mesas ni
    // categoría/lado, así que el panel solo ofrece etiqueta y prioridad; las
    // etiquetas salen de los propios invitados del side event.

    const sideTags = useMemo(() => {
        const set = new Set()
        rawData.forEach((g) => {
            const tag = (g.tag && String(g.tag).trim()) || null
            if (tag) set.add(tag)
        })
        return [...set]
    }, [rawData])

    const hasActiveFilters = Boolean(searchUser || filterTag || filterTier || filterDelivery)
    const activeFilterCount = [filterTag, filterTier].filter(Boolean).length

    const clearAllFilters = () => {
        setFilterTag(null)
        setFilterTier(null)
        setFilterDelivery(null)
    }

    const matchesFilters = (guest) => {
        const name = guest.name?.toLowerCase() || ''
        const phone = guest.phone_number?.toString() || ''
        const search = searchUser?.toLowerCase() || ''

        const matchesSearch = !search || name.includes(search) || phone.includes(searchUser)
        const matchesTag = !filterTag || guest.tag === filterTag
        const matchesTier = !filterTier || guest.tier === filterTier
        const matchesDelivery = !filterDelivery
            || (dispatchMap[guest.id]?.status ?? 'undefined') === filterDelivery

        return matchesSearch && matchesTag && matchesTier && matchesDelivery
    }

    // Con filtro activo la lista se aplana: cada coincidencia es su propia
    // tarjeta, para que un acompañante que coincida no quede escondido.
    const flattenGroups = (grouped = []) => grouped.flatMap((g) => [g, ...(g.children || [])])

    const visibleFor = (grouped = []) => (hasActiveFilters
        ? flattenGroups(grouped).filter(matchesFilters).map((g) => ({ ...g, __isGroupChild: false, children: [] }))
        : grouped)

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

    const renderFiltersPanel = () => (
        <div className="gx-filters-panel">
            {renderFilterGroup(
                t('guests.filter_tag'),
                sideTags.map((i) => ({ value: i, label: i })),
                filterTag,
                setFilterTag,
            )}
            {renderFilterGroup(
                t('guests.filter_priority'),
                ['A', 'B', 'C', 'D'].map((i) => ({ value: i, label: i })),
                filterTier,
                setFilterTier,
            )}
            {activeFilterCount > 0 && (
                <button type="button" className="gx-filters-clear" onClick={clearAllFilters}>
                    {t('guests.filters_clear')}
                </button>
            )}
        </div>
    )

    // Agregar invitado: vive en el toolbar del Paso 1. Su menú conserva el
    // alta individual, la importación por archivo y el copiado de la lista
    // principal del evento.
    const renderAddGuestButton = () => (
            <Dropdown
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
                                placement={isMobile ? 'bottom' : 'bottomLeft'}
                                getPopupContainer={() => document.body}
                                rootClassName='side_guest_list_pop'
                                // `shiftY`: sin esto antd solo voltea el popup, y
                                // desde un disparador a media pantalla no cabe ni
                                // arriba ni abajo — lo recortaba contra el borde.
                                // Deslizándolo se queda dentro siempre.
                                align={{ overflow: { adjustX: true, adjustY: true, shiftX: true, shiftY: true } }}
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
                                            flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column'
                                        }}>
                                            {
                                                mainGuestGroups
                                                    ? mainGuestGroups.map((group) => {
                                                        const { leader, companions } = group

                                                        if (!companions.length) return renderImportRow(leader)

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
                <button type="button" className="gx-tool gx-tool--primary" data-tour="se-add">
                    <Plus size={15} />
                    <span>{t('side_events.btn_add')}</span>
                </button>
            </Dropdown>
    )

    const renderTabToolbar = (tabKey) => (
        <div className="gx-toolbar">
            <div className="gx-search" data-tour="se-search">
                <Search size={16} />
                <input
                    value={searchUser ?? ''}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder={t('guests.search_placeholder')}
                />
                {searchUser && (
                    <button type="button" className="gx-search-clear" onClick={() => setSearchUser(null)}>
                        <X size={14} />
                    </button>
                )}
            </div>

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

            <Dropdown trigger={['click']} placement="bottomRight" popupRender={renderFiltersPanel}>
                <button type="button" className="gx-tool" data-active={activeFilterCount > 0 || undefined} data-tour="se-filters">
                    {t('guests.filters')}
                    {activeFilterCount > 0 && <span className="gx-tool-count">{activeFilterCount}</span>}
                </button>
            </Dropdown>

            {/* El envío masivo sigue tras SHOW_BULK_SEND: hoy solo hay envío manual */}
            {tabKey === 'creado' && renderBulkActionsBar()}
            {tabKey === 'creado' && !sendMode && renderAddGuestButton()}
        </div>
    )

    // ── Banner de cabecera ───────────────────────────────────────────────
    // Solo en los dos tabs donde el mensaje aplica a un side event: Confirmados
    // y No asistirán hablan de mesas y pases en /guests, y aquí no hay ninguno.
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
                </div>
            )
        }

        if (tabKey === 'esperando') {
            const waitingFlat = rawData.filter((g) => g.state === 'esperando')
            const failed = waitingFlat.filter((g) => dispatchMap[g.id]?.status === 'failed')
            const read = waitingFlat.filter((g) => dispatchMap[g.id]?.status === 'read')
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

        return null
    }

    // La lista por estado se dibuja igual que en el Save the Date: un solo
    // bloque que se recalcula en cada render. Nada de `Tabs` de antd con un
    // `useMemo` de dependencias a mano — eso es lo que congelaba el buscador,
    // los filtros y el DatePicker de fecha límite (ver docs/rediseno-side-events.md).
    const tabDataFor = (tabKey) => (
        tabKey === 'creado' ? createdData
            : tabKey === 'esperando' ? waitingData
                : tabKey === 'confirmado' ? confirmedData
                    : rejectedData
    )

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
            return
        }

        setsideEvent(data)
        getGuestCounts(data?.map((se) => se.id))
    }

    // Un solo query para el resumen de los tres números de cada side event.
    // Se agrupa en el cliente: son pocas filas y evita un RPC nuevo.
    const getGuestCounts = async (ids) => {
        if (!ids?.length) {
            setGuestCounts({})
            return
        }

        const { data, error } = await supabase
            .from('side_events_guests')
            .select('side_events_id, state')
            .in('side_events_id', ids)

        if (error) {
            console.error('Error al obtener el resumen de invitados:', error)
            return
        }

        const map = {}
        data?.forEach((g) => {
            const counts = map[g.side_events_id] ?? (map[g.side_events_id] = { total: 0, confirmado: 0, pendiente: 0, rechazado: 0 })
            counts.total += 1
            if (g.state === 'confirmado') counts.confirmado += 1
            else if (g.state === 'rechazado') counts.rechazado += 1
            else counts.pendiente += 1
        })
        setGuestCounts(map)
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
        // el nuevo pasa a ser el seleccionado del riel
        setSelectedId(data.id)
    }

    const saveSideEvent = async () => {
        if (!current?.id) return false;

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
            message.error(t('side_events.save_error'))
            return false;
        }

        // La tarjeta del listado también refleja el cambio sin recargar
        setsideEvent((prev) => prev?.map((se) => se.id === current.id ? { ...se, name: current.name, body } : se))
        message.success(t('side_events.saved'))
        return true;
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

    // Id del "líder" de familia de un invitado de la lista principal:
    // null si el propio invitado es el líder (sin companion_id).
    const parentIdOf = (guest) => (
        guest?.companion_id === null || guest?.companion_id === undefined
            ? null
            : Number(guest.companion_id)
    )

    // La lista principal se muestra agrupada por familia (líder + acompañantes)
    // para poder importar el grupo completo con un solo check o cada integrante
    // por separado. El filtro de búsqueda conserva el grupo entero cuando
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

    // Check del grupo: solo mueve a los integrantes que aún no están en el
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

    // Fila de invitado de la lista principal dentro del popup de importación.
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

                <span style={{ minWidth: isMobile ? '90px' : '130px', flex: 1 }}>{truncate(guest.name, isMobile ? 14 : 20)}</span>

                <div className='new-table-tag' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: isMobile ? '48px' : '60px', maxWidth: isMobile ? '48px' : '60px' }}>
                    <span style={{ fontSize: '12px' }}>{guest.tag ?? "-"}</span>
                </div>

                <div className={`new-table-tag state-${guest.state}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: isMobile ? '70px' : '80px', maxWidth: isMobile ? '70px' : '80px' }}>
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
        // Líderes que ya viven en el side event (importados antes), para poder
        // colgarles un acompañante nuevo en vez de meterlo como individual.
        const existingIdByPassword = new Map((rawData ?? []).map(r => [r.password, r.id]))

        const leaders = []
        const companionsByLeaderId = new Map()   // líder seleccionado en este lote
        const companionsByExistingId = new Map() // líder ya presente en el side event

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

        // El id del side event es nuevo, así que la relación líder-acompañante
        // se reconstruye emparejando por password (único por invitado).
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
        updateCurrent((prev) => ({ ...prev, body: { ...prev.body, image: e } }))
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
        sideEventIdsRef.current = sideEvent?.map((se) => se.id) ?? []
    }, [sideEvent])

    // El detalle arranca con el primero, y si el seleccionado desaparece
    // (o acaba de crearse uno) se reacomoda. En móvil arranca con el próximo,
    // que es lo que la pantalla promete con su antetítulo.
    useEffect(() => {
        if (!sideEvent?.length) return setSelectedId(null)
        if (sideEvent.some((se) => se.id === selectedId)) return
        setSelectedId((isMobile ? nextUpEvent?.id : null) ?? sideEvent[0].id)
    }, [sideEvent])

    useEffect(() => {
        if (!id) return;

        const u1 = subscribe('side_events_guests', (payload) => {
            const sideEventId = payload.new?.side_events_id ?? payload.old?.side_events_id;
            if (sideEventId && String(sideEventId) === String(currentRef.current?.id)) {
                getGuests(currentRef.current.id)
            }
            // El riel del listado muestra los confirmados de cada evento
            if (sideEventIdsRef.current.length) getGuestCounts(sideEventIdsRef.current)
        });

        const u2 = subscribe('invitation_message_dispatches', (payload) => {
            const row = payload.new || payload.old;
            if (!row || String(row.invitation_id) !== String(id)) return;
            getMessagesUpdates()
            getGuests(currentRef.current?.id)
        });

        return () => { u1(); u2(); };
    }, [id])

    // ═════════════════════════════════════════════════════════════════════
    // Editor — mismo shell que el Save the Date: tablero con la pieza al
    // centro, riel de elementos a la izquierda y, en Envío, la lista de
    // invitados entrando por la derecha.
    // ═════════════════════════════════════════════════════════════════════

    // Todo cambio del diseño pasa por aquí: así el punto rojo del botón
    // Guardar y el aviso de salida siempre saben si hay trabajo sin guardar.
    const updateCurrent = (updater) => {
        setCurrent((prev) => updater(prev))
        setDirty(true)
    }

    // Tocar un side event lo selecciona; abrirlo es el botón. En escritorio el
    // seleccionado llena el detalle de al lado; en móvil sube al destacado.
    const selectSideEvent = (item) => {
        setSelectedId(item.id)
        if (!isMobile) return
        // `block: 'nearest'` para no moverse si el destacado ya se ve: el
        // scroll de cortesía es para cuando la lista es larga y quedó arriba.
        setTimeout(() => featuredRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50)
    }

    const openSideEvent = (item) => {
        setCurrent(item)
        setSection(null)
        setActiveTab('diseno')
        setLive(false)
        setDirty(false)
    }

    // ── Morph de la portada entre el listado y el editor ──
    // 'fly' esconde el destino, 'land' lo enciende bajo el fantasma que se
    // desvanece, y 'done' se queda para que no revivan las animaciones de
    // entrada del lienzo (ver nota en SideEventsList.module.css).
    const stageMorphState = morph ? morph.phase : (morphedIn ? 'done' : undefined)

    const rectOf = (selector) => {
        const el = document.querySelector(selector)
        if (!el) return null
        const b = el.getBoundingClientRect()
        if (!b.width || !b.height) return null
        return {
            x: b.x,
            y: b.y,
            w: b.width,
            h: b.height,
            r: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 24,
        }
    }

    const startMorph = (dir, item, fromSelector) => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const from = rectOf(dir === 'in' ? (fromSelector ?? '[data-morph="cover"]') : '[data-morph="stage"]')
        if (!from) return
        setMorph({ image: item?.body?.image ?? null, from, dir, phase: 'fly' })
    }

    // El destino se monta en el mismo commit en el que se prende el morph, así
    // que aquí ya se puede medir. El fantasma sale de `from` y aterriza justo
    // encima del destino, que mientras tanto va en opacity 0 (data-morphing).
    useLayoutEffect(() => {
        if (!morph || morph.phase !== 'fly') return
        let cancelled = false
        let landTimer

        // Red de seguridad: con la pestaña en segundo plano el navegador no
        // corre requestAnimationFrame, así que el vuelo no arranca nunca y el
        // fantasma se quedaría montado. Si para entonces no pasó nada, se
        // quita. La limpieza del efecto —que corre al pasar a 'land'— lo
        // cancela cuando el camino normal sí tomó el control.
        const safetyTimer = setTimeout(() => {
            if (!cancelled) setMorph(null)
        }, MORPH_MS + 1500)

        const frame = requestAnimationFrame(() => {
            const to = rectOf(morph.dir === 'in' ? '[data-morph="stage"]' : '[data-morph="cover"]')
            const el = morphRef.current
            if (!to || !el) return setMorph(null)

            el.animate(
                [
                    { left: `${morph.from.x}px`, top: `${morph.from.y}px`, width: `${morph.from.w}px`, height: `${morph.from.h}px`, borderRadius: `${morph.from.r}px` },
                    { left: `${to.x}px`, top: `${to.y}px`, width: `${to.w}px`, height: `${to.h}px`, borderRadius: `${to.r}px` },
                ],
                { duration: MORPH_MS, easing: MORPH_EASE, fill: 'forwards' },
            )

            // El fundido va en su propia animación para no partir en dos la
            // interpolación del rect (con keyframes intermedios, WAAPI aplica
            // la curva a cada tramo y el movimiento se deforma).
            const overlap = MORPH_MS - MORPH_FADE_MS
            el.animate(
                [{ opacity: 1 }, { opacity: 0 }],
                { duration: MORPH_FADE_MS, delay: overlap, easing: 'ease-in', fill: 'forwards' },
            )

            // El destino se enciende cuando arranca el fundido: el fantasma
            // todavía lo cubre, así que nunca hay un frame sin ninguno.
            landTimer = setTimeout(() => {
                if (!cancelled) setMorph((m) => (m ? { ...m, phase: 'land' } : m))
            }, overlap)
        })

        return () => {
            cancelled = true
            cancelAnimationFrame(frame)
            clearTimeout(landTimer)
            clearTimeout(safetyTimer)
        }
    }, [morph])

    // Quitar el fantasma tiene su propio efecto: si el temporizador viviera en
    // el de arriba, su limpieza —que corre justo al pasar a 'land'— lo mataría
    // y el fantasma se quedaría montado para siempre.
    useEffect(() => {
        if (morph?.phase !== 'land') return
        const timer = setTimeout(() => setMorph(null), MORPH_FADE_MS + 40)
        return () => clearTimeout(timer)
    }, [morph])

    const openFromList = (item) => {
        // El ancla se mide en este mismo tick, así que el selector va explícito:
        // `setSelectedId` todavía no se refleja en el DOM.
        startMorph('in', item, `[data-morph-id="${item.id}"]`)
        // Deja marcada la tarjeta a la que tiene que volver el fantasma.
        setSelectedId(item.id)
        setMorphedIn(true)
        openSideEvent(item)
    }

    const closeToList = () => {
        startMorph('out', current)
        setMorphedIn(false)
        closeEditor()
    }

    // El tour es solo de escritorio: en móvil el shell es otro árbol, la hoja
    // inferior tapa los anclajes del dock y la máscara de antd queda desfasada
    // contra un lienzo a pantalla completa. Más vale no ofrecerlo que
    // ofrecerlo roto.
    const tourAvailable = !isMobile

    // El tour explica el lienzo editable, así que apaga "ver en vivo": con el
    // device montado no habría zonas que señalar.
    const openTour = () => {
        if (!tourAvailable) return
        setLive(false)
        setSection(null)
        setTourOpen(true)
    }

    const closeTour = () => {
        localStorage.setItem(SIDE_TOUR_STORAGE_KEY, '1')
        setTourOpen(false)
        // El tour termina en Envío; se regresa a Diseño, que es la vista de
        // entrada del editor.
        changeTab('diseno')
    }

    // En Envío la pieza no se edita, así que se muestra ya publicada; al
    // volver a Diseño regresa el lienzo editable.
    const changeTab = (value) => {
        setActiveTab(value)
        setSection(null)
        setLive(value === 'envio')
    }

    const closeEditor = () => {
        setCurrent(null)
        setSection(null)
        setLive(false)
        setDirty(false)
    }

    const handleSave = async () => {
        setSaving(true)
        const ok = await saveSideEvent()
        setSaving(false)
        if (ok) setDirty(false)
        return ok
    }

    // ── Salir con cambios sin guardar ──
    // Diálogo propio: se queda montado mientras sale para que se vea la
    // transición (nada de Modal de antd).
    const closeLeave = () => {
        setLeaveIn(false)
        setTimeout(() => setLeaveMounted(false), 220)
    }

    const handleBack = () => {
        if (!dirty) return closeToList()
        setLeaveMounted(true)
        setTimeout(() => setLeaveIn(true), 20)
    }

    const saveAndLeave = async () => {
        setLeaving(true)
        const ok = await handleSave()
        setLeaving(false)
        if (!ok) return
        closeLeave()
        closeToList()
    }

    // La pieza se escala para entrar completa en pantalla sin scroll, como en
    // una herramienta de diseño. Se mide alto y ancho: con la columna de
    // Envío abierta queda menos ancho disponible.
    useEffect(() => {
        const fit = () => setAvailable({ h: window.innerHeight - 190, w: window.innerWidth })
        fit()
        window.addEventListener('resize', fit)
        return () => window.removeEventListener('resize', fit)
    }, [])

    // Primera vez en el editor nuevo: el tour se abre solo. La espera deja
    // que la pieza y la barra estén pintadas cuando el primer paso resuelva
    // su anclaje.
    useEffect(() => {
        if (!current?.id || !tourAvailable) return
        if (localStorage.getItem(SIDE_TOUR_STORAGE_KEY)) return
        const timer = setTimeout(() => openTour(), 800)
        return () => clearTimeout(timer)
    }, [current?.id, tourAvailable])

    // Móvil: el editor cambia a pantalla completa con dock y hoja inferior
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 720px)')
        const onChange = (e) => setIsMobile(e.matches)
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    }, [])

    // La hoja se queda montada mientras baja, para que la salida se vea
    useEffect(() => {
        if (section) return setSheetSection(section)
        const timer = setTimeout(() => setSheetSection(null), 300)
        return () => clearTimeout(timer)
    }, [section])

    // La columna de invitados se queda montada mientras sale, para que la
    // transición de salida se alcance a ver
    useEffect(() => {
        if (activeTab === 'envio') {
            setSendMounted(true)
            // timeout y no requestAnimationFrame: en una pestaña de fondo rAF
            // no corre y la columna se quedaría invisible hasta volver a ella
            const enter = setTimeout(() => setSendIn(true), 20)
            return () => clearTimeout(enter)
        }
        setSendIn(false)
        const timer = setTimeout(() => setSendMounted(false), 320)
        return () => clearTimeout(timer)
    }, [activeTab])

    // Escape cierra el diálogo de cambios sin guardar
    useEffect(() => {
        if (!leaveMounted) return
        const onKey = (e) => { if (e.key === 'Escape') closeLeave() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [leaveMounted])

    // Recargar o cerrar la pestaña también avisa (el diálogo lo pone el navegador)
    useEffect(() => {
        if (!dirty) return
        const warn = (e) => { e.preventDefault(); e.returnValue = '' }
        window.addEventListener('beforeunload', warn)
        return () => window.removeEventListener('beforeunload', warn)
    }, [dirty])

    // La hoja tapaba el título justo cuando se está escribiendo: reporta su
    // alto y el contenido de la pieza sube ese tanto mientras está abierta.
    // Se descuenta lo que hay entre el marco y el borde de la pantalla (el
    // dock), que la hoja ya cubre — si no, el hueco quedaba enorme.
    useEffect(() => {
        const measure = () => {
            const rect = stageRef.current?.getBoundingClientRect()
            setStageGap(rect ? Math.max(0, Math.round(window.innerHeight - rect.bottom)) : 0)
        }
        measure()
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
        // current?.id entra en las dependencias porque el marco se monta
        // cuando ya hay side event: sin eso la medida se quedaba en 0
    }, [isMobile, activeTab, live, current?.id])

    const sheetOpen = isMobile && !!section && !live && activeTab === 'diseno'
    const contentLift = sheetOpen ? Math.max(0, sheetHeight - stageGap + 10) : 0

    const sendOpen = activeTab === 'envio'

    // En Envío la pieza ya solo se mira, así que la manda el alto y todo el
    // ancho que sobra se lo lleva la lista de invitados — las tarjetas `gx`
    // traen contacto, estado y acciones, y agradecen cada pixel.
    const fitH = (h) => Math.max(0.55, Math.min(1, available.h / h))
    const fitBoth = (w, h) => Math.max(0.55, Math.min(1, Math.min(available.h / h, Math.max(320, available.w - 160) / w)))
    const cardScale = fitBoth(CARD_W, CARD_H)
    const deviceScale = sendOpen ? fitH(DEVICE_H) : fitBoth(DEVICE_W, DEVICE_H)

    // Ancho del hueco: lo que queda después de la pieza (más el padding del
    // lienzo) y un respiro parejo a los lados.
    const STAGE_EDGE = 20
    const sendWidth = Math.max(420, available.w - (DEVICE_W * deviceScale + 48) - STAGE_EDGE * 2)

    const publicUrl = `https://www.iattend.events/side-event/${current?.id}`

    /* ── Cabecera común de cada bloque ── */
    const blockHead = (icon, title, hint, action = null) => (
        <div className={ed.blockHead}>
            <span className={ed.blockIcon}>{icon}</span>
            <div className={ed.blockHeadText}>
                <span className={ed.blockTitle}>{title}</span>
                {hint && <span className={ed.blockHint}>{hint}</span>}
            </div>
            {action && <div className={ed.blockAction}>{action}</div>}
        </div>
    )

    /* ── Atajos de escritura sobre `current` ── */
    const setBody = (patch) => updateCurrent((prev) => ({ ...prev, body: { ...prev.body, ...patch } }))
    const setTitleProp = (patch) => updateCurrent((prev) => ({ ...prev, body: { ...prev.body, title: { ...prev.body?.title, ...patch } } }))
    const setAddress = (patch) => updateCurrent((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body?.address, ...patch } } }))

    /* ── Paneles del inspector: uno por elemento del lienzo ── */

    const panelBackground = (
        <>
            {blockHead(<ImagePlus size={16} />, t('side_events.panel_background'), t('side_events.panel_background_hint'))}

            <div className={ed.thumbRow}>
                {current?.body?.image &&
                    <div className={ed.thumb}>
                        <img src={current.body.image} alt='' />
                        <div className={ed.thumbActions}>
                            <Button
                                size='small'
                                type='text'
                                aria-label={t('side_events.remove_image')}
                                style={{ color: '#FFF' }}
                                icon={<Trash2 size={16} />}
                                onClick={() => setBody({ image: null })}
                            />
                        </div>
                    </div>
                }
                <div className={ed.uploadTile}>
                    <StorageImages invitationID={id} handleImage={handleImages} type={'side-events'} />
                </div>
            </div>

            <span className={ed.hint}>{t('side_events.panel_background_note')}</span>
        </>
    )

    const panelColor = (
        <>
            {blockHead(<Palette size={16} />, t('side_events.theme_color'), t('side_events.panel_color_hint'))}

            <div className={ed.fieldRow}>
                <span className={ed.fieldLabel}>{t('side_events.panel_color_pick')}</span>
                {/* En móvil, controles nativos en vez de popups de antd: dentro
                    de la hoja los popups se abren donde pueden y su scroll pelea
                    con el de la pieza (ver components/MobileFields). */}
                {isMobile
                    ? <ColorField
                        value={current?.body?.color ?? '#000000'}
                        onChange={(hex) => setBody({ color: hex })}
                    />
                    : <ColorPicker
                        value={current?.body?.color ?? '#000000'}
                        onChange={(e) => setBody({ color: colorFactoryToHex(e) })}
                    />
                }
            </div>

            <div className={ed.swatchRow}>
                {THEME_SWATCHES.map((c) => (
                    <button
                        key={c}
                        type='button'
                        className={`${ed.swatch} ${(current?.body?.color ?? '#000000').toLowerCase() === c.toLowerCase() ? ed.swatchActive : ''}`}
                        style={{ background: c }}
                        aria-label={c}
                        onClick={() => setBody({ color: c })}
                    />
                ))}
            </div>
        </>
    )

    const panelTitle = (
        <>
            {blockHead(<Type size={16} />, t('side_events.panel_title'), t('side_events.panel_title_hint'))}

            <div className={ed.fieldStack}>
                <span className={ed.fieldLabel}>{t('side_events.font_type')}</span>
                {isMobile
                    ? <FontPicker
                        fonts={fonts}
                        value={current?.body?.title?.font ?? 'Poppins'}
                        onChange={(v) => setTitleProp({ font: v })}
                    />
                    : <Select
                        style={{ width: '100%' }}
                        showSearch
                        value={current?.body?.title?.font ?? 'Poppins'}
                        options={fonts.map((f) => ({ value: f, label: <span style={{ fontFamily: f }}>{f}</span> }))}
                        onChange={(v) => setTitleProp({ font: v })}
                    />
                }
            </div>

            <div className={ed.fieldStack}>
                <span className={ed.fieldLabel}>{t('side_events.font_size')}</span>
                <Slider min={36} max={64} step={2} value={current?.body?.title?.size ?? 36} onChange={(v) => setTitleProp({ size: v })} />
            </div>

            <div className={ed.fieldStack}>
                <span className={ed.fieldLabel}>{t('side_events.font_line_height')}</span>
                <Slider min={0.8} max={2} step={0.1} value={current?.body?.title?.line_height ?? 1.4} onChange={(v) => setTitleProp({ line_height: v })} />
            </div>

            <div className={ed.fieldStack}>
                <span className={ed.fieldLabel}>{t('side_events.font_weight')}</span>
                <Slider min={100} max={1000} step={100} value={current?.body?.title?.weight ?? 500} onChange={(v) => setTitleProp({ weight: v })} />
            </div>

            <div className={ed.fieldStack}>
                <span className={ed.fieldLabel}>{t('side_events.font_opacity')}</span>
                <Slider min={0} max={1} step={0.01} value={current?.body?.title?.opacity ?? 1} onChange={(v) => setTitleProp({ opacity: v })} />
            </div>
        </>
    )

    const panelDate = (
        <>
            {blockHead(<CalendarDays size={16} />, t('side_events.panel_date'), t('side_events.panel_date_hint'))}

            {/* Hora de pared: lo que se ve en el picker es lo que se guarda,
                sin conversión de timezone (helpers/assets/eventDateTime.js) */}
            {isMobile
                ? <DateField
                    type="datetime-local"
                    /* `datetime-local` entrega YYYY-MM-DDTHH:mm sin zona: es la
                       misma hora de pared que se guarda, solo cambia el separador */
                    value={wallClockToDayjs(current?.body?.hour)?.format('YYYY-MM-DDTHH:mm') ?? ''}
                    onChange={(v) => setBody({ hour: v ? `${v.replace('T', ' ')}:00` : null })}
                />
                : <DatePicker
                    style={{ width: '100%' }}
                    showTime={{ format: 'HH:mm' }}
                    format='DD/MM/YYYY HH:mm'
                    value={wallClockToDayjs(current?.body?.hour)}
                    onChange={(e) => setBody({ hour: dayjsToWallClock(e) })}
                />
            }

            {current?.body?.hour && !wallClockToDayjs(current.body.hour) &&
                <span className={ed.hint}>
                    {formatEventDateTime(current.body.hour, { state: current.body?.address?.state, timezone: current.body?.timezone })}
                </span>
            }
        </>
    )

    const panelPlace = (
        <>
            {blockHead(<Landmark size={16} />, t('side_events.panel_place'), t('side_events.panel_place_hint'))}

            <div className={ed.fieldStack}>
                <span className={ed.fieldLabel}>{t('side_events.place_name_label')}</span>
                <Input
                    value={current?.body?.place_name ?? ''}
                    onChange={(e) => setBody({ place_name: e.target.value })}
                    placeholder={t('side_events.place_name_label')}
                />
            </div>

            <div className={ed.fieldStack}>
                <span className={ed.fieldLabel}>{t('side_events.address_label')}</span>
                <AddressAutocomplete
                    className={ed.autocomplete}
                    placeholder={t('side_events.address_search')}
                    onSelect={(addr) => setAddress(addr)}
                />
            </div>

            <div className={ed.addressGrid}>
                {ADDRESS_FIELDS.map(([key, label]) => (
                    <div key={key} className={ed.fieldStack}>
                        <span className={ed.fieldLabel}>{t(`side_events.${label}`)}</span>
                        <Input
                            value={current?.body?.address?.[key] ?? ''}
                            onChange={(e) => setAddress({ [key]: e.target.value })}
                        />
                    </div>
                ))}
                <div className={`${ed.fieldStack} ${ed.addressWide}`}>
                    <span className={ed.fieldLabel}>{t('side_events.address_url')}</span>
                    <Input
                        value={current?.body?.address?.url ?? ''}
                        onChange={(e) => setAddress({ url: e.target.value })}
                    />
                </div>
            </div>

            {/* El clima vive aquí porque es lo que lo condiciona: el remoto
                solo lo pinta cuando hay ciudad */}
            <label className={ed.toggle}>
                <span className={ed.toggleLabel}>{t('side_events.panel_weather')}</span>
                <Switch
                    size='small'
                    checked={!current?.body?.hideWeather}
                    onChange={(v) => setBody({ hideWeather: !v })}
                />
            </label>

            {!current?.body?.address?.city &&
                <span className={ed.hint}>{t('side_events.panel_weather_hint')}</span>
            }
        </>
    )

    const panelNotes = (
        <>
            {blockHead(<StickyNote size={16} />, t('side_events.panel_notes'), t('side_events.panel_notes_hint'))}

            <TextArea
                autoSize={{ minRows: 3, maxRows: 10 }}
                placeholder={t('side_events.extras_placeholder')}
                value={current?.body?.extras ?? ''}
                onChange={(e) => setBody({ extras: e.target.value })}
            />
        </>
    )

    const PANELS = {
        background: panelBackground,
        color: panelColor,
        title: panelTitle,
        date: panelDate,
        place: panelPlace,
        extras: panelNotes,
    }

    const SECTIONS = [
        { key: 'background', icon: <ImagePlus size={18} />, label: t('side_events.panel_background'), short: t('side_events.dock_background') },
        { key: 'color', icon: <Palette size={18} />, label: t('side_events.theme_color'), short: t('side_events.dock_color') },
        { key: 'title', icon: <Type size={18} />, label: t('side_events.panel_title'), short: t('side_events.dock_title') },
        { key: 'date', icon: <CalendarDays size={18} />, label: t('side_events.panel_date'), short: t('side_events.dock_date') },
        { key: 'place', icon: <Landmark size={18} />, label: t('side_events.panel_place'), short: t('side_events.dock_place') },
        { key: 'extras', icon: <StickyNote size={18} />, label: t('side_events.panel_notes'), short: t('side_events.dock_notes') },
    ]

    /* ── Lienzo flotante: se comparte entre Diseño y Envío ── */
    const canvasBlock = (
        <div className={ed.canvasWrap} data-tour="canvas">
            {live ? (
                <div
                    key='live'
                    className={ed.scaler}
                    data-morph="stage"
                    data-morphing={stageMorphState}
                    style={{ width: DEVICE_W * deviceScale, height: DEVICE_H * deviceScale }}
                >
                    <div
                        className='inv-device-main-container-ios'
                        style={{ transform: `scale(${deviceScale})`, transformOrigin: 'top left', marginLeft: 0, cursor: 'default' }}
                    >
                        <div className='device-buttons-container-ios'>
                            <div className='device-button-ios' />
                            <div className='device-button-ios' />
                            <div className='device-button-ios' />
                        </div>
                        <div className='device-power-button-ios' />
                        <div className='inv-device-container-ios'>
                            <div className='inv-black-space-ios'>
                                <span>5:15</span>
                                <div className='camera-ios' />
                                <div />
                            </div>
                            <div className='ios-invitation' style={{ overflow: 'hidden' }}>
                                <SideEventHost config={current} />
                            </div>
                            <div className='inv-light-space-ios' />
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    key='card'
                    className={ed.scaler}
                    data-morph="stage"
                    data-morphing={stageMorphState}
                    style={{ width: CARD_W * cardScale, height: CARD_H * cardScale }}
                >
                    <div style={{ transform: `scale(${cardScale})`, transformOrigin: 'top left' }}>
                        <SideCanvas
                            key={current?.id}
                            current={current}
                            onChange={updateCurrent}
                            selected={section}
                            onSelect={setSection}
                            readOnly={activeTab !== 'diseno'}
                        />
                    </div>
                </div>
            )}

            <span className={ed.canvasCaption}>
                {live ? t('side_events.live_caption') : t('side_events.canvas_caption')}
            </span>
        </div>
    )

    /* ── Diseño: riel + panel del elemento seleccionado ── */
    const editorTools = (
        <>
            {/* Riel de elementos */}
            <div className={ed.rail}>
                {SECTIONS.map((s) => (
                    <Tooltip key={s.key} title={s.label} placement='right'>
                        <button
                            className={`${ed.railBtn} ${section === s.key ? ed.railBtnActive : ''}`}
                            data-tour={`tool-${s.key}`}
                            onClick={() => setSection(section === s.key ? null : s.key)}
                            aria-label={s.label}
                            aria-pressed={section === s.key}
                            disabled={live}
                        >
                            {s.icon}
                        </button>
                    </Tooltip>
                ))}
            </div>

            {/* Panel del elemento seleccionado, pegado al riel */}
            {section && !live &&
                <aside className={ed.toolPanel}>
                    <button className={ed.toolClose} onClick={() => setSection(null)} aria-label={t('side_events.close')}>
                        <X size={16} />
                    </button>
                    {PANELS[section]}
                </aside>
            }
        </>
    )

    /* ── Envío: la lista de invitados que ya existe, en su columna ── */
    const guestsList = (
        <div className='gx'>
            {renderStepBar()}
            {renderTabHero(activeKey)}
            {renderTabToolbar(activeKey)}
            {renderRsvpDeadlineAlert(activeKey)}
            {(activeKey === 'creado' || activeKey === 'esperando') && renderRsvpDeadlineLine(activeKey)}
            {renderSortBar(activeKey)}
            {renderCardList(sortForTab(activeKey, visibleFor(tabDataFor(activeKey))), activeKey)}
        </div>
    )

    const sendContent = (
        <div
            className={`${ed.block} ${ed.sendCol} ${sendIn || tourOpen ? ed.sendColIn : ''} ${tourOpen ? ed.noAnim : ''}`}
            data-tour="guests"
            style={{ width: Math.max(320, sendWidth - 24), height: DEVICE_H * deviceScale }}
        >
            {blockHead(
                <Send size={16} />,
                t('side_events.guests_title'),
                t('side_events.guests_hint'),
                <span className={ed.countPill}>{rawData.length}</span>
            )}

            <div className={`${ed.sendBody} scroll-invitation`}>
                {guestsList}
            </div>
        </div>
    )

    /* ── Diálogo de cambios sin guardar (compartido móvil/escritorio) ── */
    const leaveDialog = leaveMounted && (
        <div
            className={`${ed.modalBackdrop} ${leaveIn ? ed.modalBackdropIn : ''}`}
            onClick={closeLeave}
        >
            <div
                className={`${ed.modalCard} ${leaveIn ? ed.modalCardIn : ''}`}
                onClick={(e) => e.stopPropagation()}
                role='dialog'
                aria-modal='true'
                aria-label={t('side_events.unsaved_title')}
            >
                <button className={ed.modalClose} onClick={closeLeave} aria-label={t('side_events.close')}>
                    <X size={16} />
                </button>

                <span className={ed.modalTitle}>{t('side_events.unsaved_title')}</span>
                <span className={ed.modalText}>{t('side_events.unsaved_text')}</span>

                <div className={ed.modalActions}>
                    {/* El editor y el listado viven en el mismo componente, así
                        que al descartar hay que cerrar también el diálogo */}
                    <Button type='text' danger onClick={() => { closeLeave(); closeToList() }}>
                        {t('side_events.unsaved_discard')}
                    </Button>
                    <Button style={{ borderRadius: '99px' }} onClick={closeLeave}>
                        {t('side_events.unsaved_stay')}
                    </Button>
                    <Button
                        className='primarybutton--active'
                        style={{ borderRadius: '99px' }}
                        loading={leaving}
                        onClick={saveAndLeave}
                    >
                        {t('side_events.unsaved_save')}
                    </Button>
                </div>
            </div>
        </div>
    )

    /* ═════════════════════════════════════════════════════════════════════
       Listado: riel con la lista a la izquierda y, a la derecha, la portada
       y los números del seleccionado.
       ═════════════════════════════════════════════════════════════════════ */

    // Tope del plan: misma regla que ya decidía si se podía crear (pro 3,
    // lite 1). Se deriva de un solo lugar para que el texto del riel nunca
    // contradiga al botón.
    const planCap = plan === 'pro' ? 3 : plan === 'lite' ? 1 : 0
    const usedCount = sideEvent?.length ?? 0
    const canCreate = usedCount < planCap

    const countsFor = (sideEventId) =>
        guestCounts[sideEventId] ?? { total: 0, confirmado: 0, pendiente: 0, rechazado: 0 }

    const selected = sideEvent?.find((se) => se.id === selectedId) ?? null
    const selectedCounts = countsFor(selected?.id)

    // Fecha corta para el riel: la línea completa ("mar. 13 de octubre,
    // 19:00 · 4 de 11 confirmados") no cabe en 300px y se cortaba justo en el
    // conteo. `wallClockToDayjs` ya devuelve null para los eventos legados
    // (instantes UTC), que caen al formateador largo de siempre.
    const shortDate = (raw) => {
        const d = wallClockToDayjs(raw)
        if (!d) return null
        return d.locale(i18n.language?.startsWith('en') ? 'en' : 'es').format('ddd D MMM')
    }

    // Línea de apoyo de cada elemento del riel: fecha y confirmados.
    const itemMeta = (item) => {
        const counts = countsFor(item.id)
        const when = item.body?.hour
            ? (shortDate(item.body.hour)
                ?? formatEventDateTime(item.body.hour, { state: item.body?.address?.state, timezone: item.body?.timezone }))
            : t('side_events.list_draft')
        const guests = counts.total === 0
            ? t('side_events.list_no_guests')
            : t('side_events.list_confirmed_of', { confirmed: counts.confirmado, total: counts.total })
        return `${when} · ${guests}`
    }

    // Fecha + lugar de la portada
    const selectedMeta = () => {
        if (!selected) return ''
        const parts = []
        if (selected.body?.hour) {
            parts.push(formatEventDateTime(selected.body.hour, { state: selected.body?.address?.state, timezone: selected.body?.timezone }))
        }
        if (selected.body?.place_name) parts.push(selected.body.place_name)
        return parts.join(' · ') || t('side_events.list_draft')
    }

    /* ── Piezas del listado móvil ──
       El móvil no es el mismo layout comprimido: es un destacado con la
       portada del próximo evento y, debajo, filas compactas. */

    // Borrador = le falta lo mínimo para poder mandarse (fecha o nombre). No
    // hay columna de estado en `side_events`, así que se deriva.
    const isDraft = (item) => !item.body?.hour || !item.name

    // Instante comparable. `wallClockToDayjs` devuelve null para los eventos
    // legados (instantes UTC reales); esos se leen con dayjs a secas, que es
    // suficiente para ordenar y para contar días.
    const eventAt = (item) => {
        const raw = item?.body?.hour
        if (!raw) return null
        const d = wallClockToDayjs(raw) ?? dayjs(raw)
        return d.isValid() ? d : null
    }

    const upperFirst = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text)

    // "Vie 14 nov · 21:00". Los legados caen al formateador largo de siempre,
    // que es el único que sabe reconvertir el instante con el huso del venue.
    const listWhen = (item) => {
        const raw = item.body?.hour
        if (!raw) return t('side_events.list_no_date')
        const d = wallClockToDayjs(raw)
        if (!d) return formatEventDateTime(raw, { state: item.body?.address?.state, timezone: item.body?.timezone })
        const loc = d.locale(i18n.language?.startsWith('en') ? 'en' : 'es')
        return `${upperFirst(loc.format('ddd D MMM'))} · ${loc.format('HH:mm')}`
    }

    // El próximo con fecha; si ya pasaron todos, el más reciente; y si solo hay
    // borradores, el primero de la lista.
    const nextUpEvent = (() => {
        const list = sideEvent ?? []
        if (!list.length) return null
        const dated = list
            .filter((se) => !isDraft(se))
            .map((se) => ({ se, at: eventAt(se) }))
            .filter((x) => x.at)
        const today = dayjs().startOf('day')
        const next = dated
            .filter((x) => !x.at.isBefore(today))
            .sort((a, b) => a.at.valueOf() - b.at.valueOf())[0]
        if (next) return next.se
        const last = [...dated].sort((a, b) => b.at.valueOf() - a.at.valueOf())[0]
        return last?.se ?? list[0]
    })()

    // Lo que se ve en el destacado es el **seleccionado**: tocar una fila lo
    // sube aquí en vez de abrir el editor, igual que el riel de escritorio.
    const featured = sideEvent?.find((se) => se.id === selectedId) ?? nextUpEvent

    // "PRÓXIMO · EN 5 DÍAS". Null cuando la fecha ya pasó o no hay: en ese
    // caso el destacado no lleva antetítulo en vez de mentir. Y "PRÓXIMO" solo
    // si el destacado es de verdad el siguiente: como ahora se puede elegir
    // cualquiera, el resto se queda con los días que faltan.
    const featuredKicker = () => {
        const at = eventAt(featured)
        if (!at) return null
        const days = at.startOf('day').diff(dayjs().startOf('day'), 'day')
        if (days < 0) return null
        const when = days === 0
            ? t('side_events.list_when_today')
            : days === 1
                ? t('side_events.list_when_tomorrow')
                : t('side_events.list_when_days', { count: days })
        return featured?.id === nextUpEvent?.id
            ? `${t('side_events.list_next')} · ${when}`
            : when
    }

    // Fecha + lugar del destacado, en una línea
    const featuredMeta = (item) => {
        const parts = [listWhen(item)]
        if (item.body?.place_name) parts.push(item.body.place_name)
        return parts.join(' · ')
    }

    // Barra segmentada de confirmados / pendientes / declinados. Sin
    // invitados se deja la pista vacía: es información, no un cero falso.
    const progressBar = (counts) => (
        <div className={sl.mBar} aria-hidden>
            {counts.confirmado > 0 && <i data-kind="ok" style={{ flexGrow: counts.confirmado }} />}
            {counts.pendiente > 0 && <i data-kind="wait" style={{ flexGrow: counts.pendiente }} />}
            {counts.rechazado > 0 && <i data-kind="no" style={{ flexGrow: counts.rechazado }} />}
        </div>
    )

    const newEventButton = (
        <button
            type="button"
            className={sl.newBtn}
            aria-disabled={!canCreate}
            onClick={() => { if (canCreate) insertSideEvent() }}
        >
            <Plus size={16} />
            <span>{t('side_events.list_new')}</span>
        </button>
    )

    // Portada del destacado y miniatura de cada fila: el ancla del morph es el
    // elemento del evento seleccionado, para que el regreso aterrice en la
    // tarjeta correcta y no siempre en el destacado.
    const morphProps = (item) => ({
        'data-morph-id': item.id,
        'data-morph': item.id === selectedId ? 'cover' : undefined,
        'data-morphing': item.id === selectedId ? morph?.phase : undefined,
    })

    const mobileNewButton = (
        <button
            type="button"
            className={sl.mNewBtn}
            aria-disabled={!canCreate}
            onClick={() => { if (canCreate) insertSideEvent() }}
        >
            <Plus size={17} />
            <span>{t('side_events.list_new')}</span>
        </button>
    )

    const sideEventsListMobile = (
        <div className={sl.mPage}>
            <div className={sl.mHead}>
                <h1 className={sl.mTitle}>{t('side_events.page_title')}</h1>
                <span className={sl.mMeta}>
                    {planCap > 0
                        ? t('side_events.list_used', { used: usedCount, cap: planCap })
                        : t('side_events.list_no_plan')}
                </span>
            </div>

            {featured && (() => {
                const counts = countsFor(featured.id)
                const kicker = featuredKicker()
                return (
                    <article className={sl.mFeature} ref={featuredRef}>
                        <div className={sl.mFeatureCover} {...morphProps(featured)}>
                            {featured.body?.image
                                ? <img src={featured.body.image} alt="" />
                                : <span className={sl.mFeatureCoverEmpty}><LuImage size={22} /></span>
                            }
                            <div aria-hidden className={sl.mFeatureScrim} />
                            <div className={sl.mFeatureHead}>
                                {kicker && <span className={sl.mKicker}>{kicker}</span>}
                                <h2 className={sl.mFeatureTitle}>{featured.name ?? t('side_events.no_name')}</h2>
                            </div>
                        </div>

                        <div className={sl.mFeatureBody}>
                            <span className={sl.mFeatureMeta}>{featuredMeta(featured)}</span>
                            {progressBar(counts)}
                            <div className={sl.mFeatureFoot}>
                                <span className={sl.mFeatureCount}>
                                    {counts.total > 0
                                        ? <><b>{counts.confirmado}</b> {t('side_events.list_confirmed_rest', { total: counts.total })}</>
                                        : t('side_events.list_no_guests')
                                    }
                                </span>
                                <button
                                    type="button"
                                    className={sl.mOpenBtn}
                                    onClick={() => openFromList(featured)}
                                >
                                    {t('side_events.list_open_short')}
                                    <ArrowRight size={15} />
                                </button>
                            </div>
                        </div>
                    </article>
                )
            })()}

            {(sideEvent?.length ?? 0) > 0 && (
                <div className={sl.mRows}>
                    {sideEvent
                        .filter((item) => item.id !== featured?.id)
                        .map((item) => {
                            const counts = countsFor(item.id)
                            const draft = isDraft(item)
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={sl.mRow}
                                    onClick={() => selectSideEvent(item)}
                                >
                                    <span className={sl.mThumb} {...morphProps(item)}>
                                        {item.body?.image
                                            ? <img loading="lazy" src={item.body.image} alt="" />
                                            : <LuImage size={16} />
                                        }
                                    </span>

                                    <span className={sl.mRowText}>
                                        <span className={sl.mRowTop}>
                                            <span className={sl.mRowName}>{item.name ?? t('side_events.no_name')}</span>
                                            {draft && <span className={sl.mBadge}>{t('side_events.list_draft')}</span>}
                                        </span>
                                        <span className={sl.mRowMeta}>{listWhen(item)}</span>
                                        {draft
                                            ? <span className={sl.mRowLink}>
                                                {t('side_events.list_finish')}
                                                <ArrowRight size={13} />
                                            </span>
                                            : <span className={sl.mRowCount}>
                                                {counts.total > 0
                                                    ? t('side_events.list_confirmed_of', { confirmed: counts.confirmado, total: counts.total })
                                                    : t('side_events.list_no_guests')}
                                            </span>
                                        }
                                    </span>

                                    <ChevronRight size={17} className={sl.mChev} />
                                </button>
                            )
                        })}
                </div>
            )}

            {(sideEvent?.length ?? 0) === 0 && (
                <div className={sl.empty}>
                    <span className={sl.emptyTitle}>{t('side_events.list_empty_title')}</span>
                    <span className={sl.emptyText}>{t('side_events.list_empty_text')}</span>
                </div>
            )}

            {planCap > 0 && (
                <div className={sl.mUpsell}>
                    <span className={sl.mUpsellText}>
                        <b>{t('side_events.list_used', { used: usedCount, cap: planCap })}.</b>{' '}
                        {t('side_events.list_buy_more')}
                    </span>
                    <button
                        type="button"
                        className={sl.mUpsellBtn}
                        onClick={() => handleCheckout(id, PRICE_IDS.SIDE_EVENT)}
                    >
                        {t('side_events.cta_buy')}
                        <ArrowRight size={14} />
                    </button>
                </div>
            )}

            {canCreate
                ? mobileNewButton
                : <Tooltip title={t('side_events.list_cap_reached', { cap: planCap })}>{mobileNewButton}</Tooltip>
            }
        </div>
    )

    const sideEventsList = (
        <div className={sl.page}>

            <aside className={sl.rail}>
                <span className={sl.railTitle}>{t('side_events.page_title')}</span>
                <span className={sl.railMeta}>
                    {planCap > 0
                        ? t('side_events.list_used', { used: usedCount, cap: planCap })
                        : t('side_events.list_no_plan')}
                </span>

                <div className={sl.list}>
                    {sideEvent?.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={sl.item}
                            data-active={item.id === selectedId || undefined}
                            onClick={() => selectSideEvent(item)}
                        >
                            <span className={sl.thumb}>
                                {item.body?.image
                                    ? <img loading="lazy" src={item.body.image} alt="" />
                                    : <LuImage size={18} />
                                }
                            </span>
                            <span className={sl.itemText}>
                                <span className={sl.itemName}>{item.name ?? t('side_events.no_name')}</span>
                                <span className={sl.itemMeta}>{itemMeta(item)}</span>
                            </span>
                        </button>
                    ))}
                </div>

                {/* El tope del plan se avisa con Tooltip: un <button disabled>
                    no emite eventos de mouse y el motivo no se vería. */}
                {canCreate
                    ? newEventButton
                    : <Tooltip title={t('side_events.list_cap_reached', { cap: planCap })}>{newEventButton}</Tooltip>
                }

                {planCap > 0 &&
                    <div className={sl.upsell}>
                        <span className={sl.upsellIcon}><LuShoppingCart size={26} /></span>
                        <span className={sl.upsellTitle}>{t('side_events.cta_more_title')}</span>
                        <span className={sl.upsellText}>
                            {t('side_events.list_upsell_text', { used: usedCount, cap: planCap })}
                        </span>
                        {/* Botón propio y no antd: sus estilos se inyectan en
                            runtime después de esta hoja y ganarían al lila */}
                        <button
                            type="button"
                            className={sl.upsellBtn}
                            onClick={() => handleCheckout(id, PRICE_IDS.SIDE_EVENT)}
                        >
                            {t('side_events.cta_buy')}
                        </button>
                    </div>
                }
            </aside>

            <section className={sl.detail} ref={detailRef}>
                {selected ? (
                    <>
                        {/* `data-morph-id` además de `data-morph`: `openFromList` mide el
                            origen por id, porque en el listado móvil hay varias portadas
                            candidatas. Sin el id aquí, el morph de escritorio no encontraba
                            de dónde salir y se abría sin animación. */}
                        <div className={sl.cover} data-morph="cover" data-morph-id={selected.id} data-morphing={morph?.phase}>
                            {selected.body?.image
                                ? <>
                                    <img src={selected.body.image} alt="" />
                                    <div aria-hidden className={sl.coverScrim} />
                                </>
                                : <div className={sl.coverEmpty}>
                                    <LuImage size={22} />
                                    <span>{t('side_events.list_cover_empty')}</span>
                                </div>
                            }
                            {/* El CTA va sobre la portada y no junto a los
                                números: la esquina inferior derecha de la
                                pantalla la ocupa el orbe de Lia (fixed). */}
                            <div className={sl.coverBar}>
                                <div className={sl.coverText}>
                                    <span className={sl.coverTitle}>{selected.name ?? t('side_events.no_name')}</span>
                                    <span className={sl.coverMeta}>{selectedMeta()}</span>
                                </div>

                                <button
                                    type="button"
                                    className={sl.openBtn}
                                    onClick={() => openFromList(selected)}
                                >
                                    {t('side_events.list_open')}
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>

                        <div className={sl.stats}>
                                <div className={sl.stat}>
                                    <span className={sl.statKicker}>{t('side_events.stat_confirmed')}</span>
                                    <span className={sl.statValue}>{selectedCounts.confirmado}</span>
                                    <span className={sl.statHint}>
                                        {t('side_events.stat_confirmed_hint', { total: selectedCounts.total })}
                                    </span>
                                </div>
                                <div className={sl.stat}>
                                    <span className={sl.statKicker}>{t('side_events.stat_pending')}</span>
                                    <span className={sl.statValue}>{selectedCounts.pendiente}</span>
                                    <span className={sl.statHint}>{t('side_events.stat_pending_hint')}</span>
                                </div>
                                <div className={sl.stat}>
                                    <span className={sl.statKicker}>{t('side_events.stat_declined')}</span>
                                    <span className={sl.statValue}>{selectedCounts.rechazado}</span>
                                    <span className={sl.statHint}>{t('side_events.stat_declined_hint')}</span>
                                </div>
                        </div>
                    </>
                ) : (
                    <div className={sl.empty}>
                        <span className={sl.emptyTitle}>{t('side_events.list_empty_title')}</span>
                        <span className={sl.emptyText}>{t('side_events.list_empty_text')}</span>
                    </div>
                )}
            </section>
        </div>
    )

    /* ── Piezas que viven fuera del layout y se usan en las dos vistas ── */
    const globals = (
        <>
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
            {leaveDialog}

            {/* Fantasma del morph: vuela de la portada del listado al lienzo
                del editor (y de regreso). Va en `globals` porque tiene que
                sobrevivir al cambio de rama. */}
            {morph &&
                <div
                    ref={morphRef}
                    aria-hidden
                    className={sl.morph}
                    style={{
                        left: morph.from.x,
                        top: morph.from.y,
                        width: morph.from.w,
                        height: morph.from.h,
                        borderRadius: morph.from.r,
                    }}
                >
                    {morph.image && <img src={morph.image} alt="" />}
                </div>
            }

            <SideEventsTour
                open={tourOpen && tourAvailable}
                onClose={closeTour}
                isMobile={isMobile}
                setActiveTab={setActiveTab}
                setSection={setSection}
                setActiveKey={setActiveKey}
            />
        </>
    )

    /* ═══════════════════════════════════════════════════════════════
       Móvil: la pieza ocupa la pantalla, con dock de herramientas y
       hoja inferior. Los paneles son los mismos que en escritorio.
       ═══════════════════════════════════════════════════════════════ */
    if (current && isMobile) {
        const sheetTitle = SECTIONS.find((x) => x.key === sheetSection)?.label ?? ''

        return (
            <div className={ed.mobileRoot}>

                {/* Header: su propia superficie, igual que el dock de abajo,
                    para que no se sienta parte de la pieza */}
                <div className={ed.mobileHeader}>
                    <button className={ed.hBtn} onClick={handleBack} aria-label={t('side_events.back')}>
                        <X size={17} />
                    </button>

                    <div className={ed.hTabs} data-tour="tabs">
                        <button
                            className={`${ed.hTab} ${activeTab === 'diseno' ? ed.hTabOn : ''}`}
                            onClick={() => changeTab('diseno')}
                        >
                            {t('side_events.tab_design_short')}
                        </button>
                        <button
                            className={`${ed.hTab} ${activeTab === 'envio' ? ed.hTabOn : ''}`}
                            onClick={() => changeTab('envio')}
                        >
                            {t('side_events.tab_send_short')}
                        </button>
                    </div>

                    <div className={ed.hRight}>
                        {activeTab === 'diseno' &&
                            <button
                                className={`${ed.hBtn} ${live ? ed.hBtnOn : ''}`}
                                data-tour="live"
                                onClick={() => { setLive((v) => !v); setSection(null) }}
                                aria-label={t('side_events.live')}
                                aria-pressed={live}
                            >
                                <Eye size={17} />
                            </button>
                        }

                        <button className={ed.hBtn} data-tour="share" onClick={() => handleShare(publicUrl)} aria-label={t('custom_link.link_btn')}>
                            <Share2 size={16} />
                        </button>

                        <span className={ed.saveWrap} data-tour="save">
                            <button
                                className={ed.hSave}
                                onClick={() => { if (dirty) handleSave() }}
                                aria-disabled={!dirty}
                                style={{ opacity: dirty ? 1 : 0.6 }}
                            >
                                {saving ? '…' : t('side_events.btn_save')}
                            </button>
                            {dirty && !saving && <span className={ed.saveDot} aria-hidden />}
                        </span>
                    </div>
                </div>

                {activeTab === 'diseno'
                    ? (
                        <div
                            ref={stageRef}
                            className={ed.mobileStage}
                            data-tour="canvas"
                            data-morph="stage"
                            data-morphing={stageMorphState}
                        >
                            {live
                                ? <SideEventHost config={current} />
                                : (
                                    <SideCanvas
                                        key={current?.id}
                                        current={current}
                                        onChange={updateCurrent}
                                        selected={section}
                                        onSelect={setSection}
                                        fullBleed
                                        liftBottom={contentLift}
                                    />
                                )
                            }
                        </div>
                    )
                    : (
                        /* Las tarjetas de invitados son anchas: en móvil la
                           lista se queda con toda la pantalla */
                        <div className={`${ed.mobileSend} scroll-invitation`} data-tour="guests">
                            {guestsList}
                        </div>
                    )
                }

                {/* Dock de herramientas */}
                {activeTab === 'diseno' && !live &&
                    <div className={ed.dock}>
                        {SECTIONS.map((sec) => (
                            <button
                                key={sec.key}
                                className={`${ed.dockBtn} ${section === sec.key ? ed.dockBtnOn : ''}`}
                                data-tour={`tool-${sec.key}`}
                                onClick={() => setSection(section === sec.key ? null : sec.key)}
                                aria-pressed={section === sec.key}
                            >
                                {sec.icon}
                                <span>{sec.short}</span>
                            </button>
                        ))}
                    </div>
                }

                {/* Hoja inferior propia: sin capa que oscurezca el fondo, se
                    cierra arrastrando, tocando fuera o con la X */}
                <BottomSheet
                    open={sheetOpen}
                    onClose={() => setSection(null)}
                    title={sheetTitle}
                    bodyClass={ed.editorSheet}
                    onHeightChange={setSheetHeight}
                >
                    {sheetSection && PANELS[sheetSection]}
                </BottomSheet>

                {globals}
            </div>
        )
    }

    /* ═══════════════════════════════════════════════════════════════
       Escritorio: tablero con la pieza al centro
       ═══════════════════════════════════════════════════════════════ */
    if (current) {
        return (
            <div className={ed.pageContainer}>

                {/* Barra mínima: volver, evento, pestañas y acciones */}
                <div className={ed.topBar}>
                    <div className={ed.topLeft}>
                        <button className={ed.backBtn} onClick={handleBack} aria-label={t('side_events.back')}>
                            <ArrowLeft size={17} />
                        </button>
                        <span className={ed.crumb}>
                            Side event · <strong>{current?.name || t('side_events.no_name')}</strong>
                        </span>
                        <Tooltip title={t('guests_tour.replay')}>
                            <button
                                className={ed.helpBtn}
                                data-tour="tour-replay"
                                aria-label={t('guests_tour.replay')}
                                onClick={openTour}
                            >
                                <CircleHelp size={16} />
                            </button>
                        </Tooltip>
                    </div>

                    <Segmented
                        className={ed.tabs}
                        data-tour="tabs"
                        value={activeTab}
                        onChange={changeTab}
                        options={[
                            { value: 'diseno', label: t('side_events.tab_design') },
                            { value: 'envio', label: t('side_events.tab_send') },
                        ]}
                    />

                    <div className={ed.actionsBar}>
                        {activeTab === 'diseno' &&
                            <button
                                className={`${ed.livePill} ${live ? ed.livePillOn : ''}`}
                                data-tour="live"
                                onClick={() => { setLive((v) => !v); setSection(null) }}
                                aria-pressed={live}
                            >
                                <span className={ed.liveDot} />
                                {t('side_events.live')}
                            </button>
                        }

                        <span data-tour="share">
                            <CustomLink
                            backuImage={current?.body?.image}
                            urlImage={current?.url_image}
                            url={publicUrl}
                            id={id}
                            handleImage={updateURLimage}
                            name={current?.name}
                            setupRequired={hasPendingInfo}
                            onSetupNeeded={() => navigate(`/dashboard?id=${id}`)}
                            />
                        </span>

                        <span className={ed.saveWrap} data-tour="save">
                            <Button
                                className='primarybutton--active'
                                loading={saving}
                                aria-disabled={!dirty}
                                onClick={() => { if (dirty) handleSave() }}
                                style={{ borderRadius: '99px', opacity: dirty ? 1 : 0.6 }}
                            >
                                {t('side_events.btn_save')}
                            </Button>
                            {/* Punto rojo mientras haya cambios sin guardar */}
                            {dirty && !saving && <span className={ed.saveDot} aria-hidden />}
                        </span>
                    </div>
                </div>

                {activeTab === 'diseno' && editorTools}

                <div className={ed.stageRow}>
                    {canvasBlock}
                    {/* El hueco anima su ancho: la pieza se recentra sola */}
                    <div
                        className={`${ed.sendSlot} ${tourOpen ? ed.noAnim : ''}`}
                        style={{ width: sendOpen ? sendWidth : 0 }}
                    >
                        {(sendMounted || tourOpen) && sendContent}
                    </div>
                </div>

                {globals}
            </div>
        )
    }

    /* ═══════════════════════════════════════════════════════════════
       Listado de side events
       ═══════════════════════════════════════════════════════════════ */
    return (
        <>
            <Layout
                style={{
                    position: 'relative',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--ft-color)',
                    width: '100%',
                }}>
                <HeaderDashboard mode={'side'} />
                <Layout className='build-invitation-layout' style={{
                    paddingTop: '0px',
                    position: 'relative',
                    marginTop: screens.xs ? '0px' : '20px'
                }} >

                    <div className='guests-info-container' style={{ padding: isMobile ? '12px' : '24px', marginTop: '65px', paddingBottom: '24px', }}>
                        {sideEvent
                            ? (isMobile ? sideEventsListMobile : sideEventsList)
                            : <div className={sl.spin}><Spin /></div>}
                    </div>
                </Layout >

                <UpgradeBanner plan={plan} invitationId={id} hideOnMobile />
                <FooterApp></FooterApp>
                {globals}
            </Layout >
        </>
    )
}
