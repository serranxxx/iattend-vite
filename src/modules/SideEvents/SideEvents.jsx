import { Badge, Button, Checkbox, Col, ColorPicker, DatePicker, Drawer, Dropdown, Grid, Input, Layout, message, Modal, Popconfirm, Progress, Row, Select, Slider, Spin, Tabs, Tooltip, Upload } from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import './side-events.css'
import '../GuestManagement/guests-redesign.css'
import { LuCalendarClock, LuCheck, LuClock, LuCoins, LuCopy, LuCornerUpLeft, LuFolderOpen, LuImage, LuImageOff, LuLock, LuMapPin, LuPalette, LuPlay, LuPlus, LuSend, LuShoppingCart, LuType, LuUpload, LuUserMinus, LuX } from 'react-icons/lu'
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
import { fonts } from '../../helpers/assets/fonts'
import { handleCheckout, PRICE_IDS } from '../../components/Payment/functions'
import { UpgradeBanner } from '../../components/Payment/UpgradeBanner/UpgradeBanner'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useDashboardRealtime } from '../../context/DashboardRealtimeContext'
import { useLia } from '../../context/LiaContext'
import { StorageImages } from '../../components/ImagesStorage/StorageImages'
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, BellRing, Check, CheckCheck, ChevronLeft, ChevronRight, Cloud, CloudOff, Copy, Info, Link2, LockKeyhole, LockKeyholeOpen, MailWarning, Plus, Search, Send, SquareArrowUpRight, X } from 'lucide-react'
import { GuestsCRUD } from '../../components/Create/GuestsCRUD'
import { AddressAutocomplete } from './AddressAutocomplete'
import { FiArrowUpRight } from 'react-icons/fi'
import { CustomLink } from '../../components/CustomLink/CustomLink'
import { FooterApp } from '../Footer/FooterApp'
import { useTranslation } from 'react-i18next'
import { GuestAddTiles } from '../GuestManagement/GuestAddTiles'
import { CreditsComponent } from '../../components/Payment/Credits/Credits'


const { Option } = Select;



dayjs.extend(relativeTime)

// ── Envío masivo oculto, igual que en GuestsPage ──────────────────────────
// Poner en true para restaurar "Crear envío", el modo de selección por bloques
// y su checkbox. Apagado, cada invitado se marca como enviado a mano.
const SHOW_BULK_SEND = false;

export const SideEvents = () => {
    const { t, i18n } = useTranslation()
    const { setCreditSending, setCreditSuccess, clearCreditState } = useLia()

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
            <div className="gx-alert gx-alert--accent gx-deadline-alert">
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
            <div className="gx-deadline">
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
            return <div className="gx-empty">{t('guests.no_guests')}</div>
        }
        return (
            <div className="gx-list">
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
                            <span className="gx-step-count">{counts[d.key]}</span>
                        </span>
                    </button>
                ))}
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
                                placement='bottomLeft'
                                popupRender={() => (
                                    <div key={3} className='side_guest_list'>
                                        <div className='single_row' style={{
                                            alignSelf: 'stretch', justifyContent: 'space-between',
                                            alignItems: 'flex-end'
                                        }}>
                                            <span><b>{t('side_events.import_title')}</b></span>
                                            <Button onClick={handleSideGuests} className='primarybutton--active' icon={<LuPlus />}>{t('side_events.import_add')}</Button>
                                        </div>
                                        <Input value={searchMain} onChange={(e) => setSearchMain(e.target.value)} placeholder={t('side_events.import_search')} style={{ borderRadius: '99px' }} />
                                        <div className='single_col scroll-invitation' style={{
                                            alignSelf: 'stretch', gap: '2px',
                                            maxHeight: '480px', overflowY: 'auto', display:'flex',alignItems:'flex-start', justifyContent:'flex-start', flexDirection:'column'
                                        }}>
                                            {
                                                mainGuests ? mainGuests?.filter(i =>
                                                    i.name?.toLowerCase().includes(searchMain?.toLowerCase() || '')).map((i, index) => (
                                                        <div key={`${i.id}-${index}`} className={`single_row import_list_row ${rawData.find(n => n.password === i.password) ? 'row_active' : ''}`} style={{
                                                            alignSelf: 'stretch',
                                                            padding: '8px'
                                                        }}>
                                                            {
                                                                rawData.find(n => n.password === i.password)
                                                                    ? <Checkbox disabled checked />
                                                                    : <Checkbox onChange={(e) => handleImport(e.target.checked, i)} />
                                                            }

                                                            <span style={{ minWidth: '130px', flex:1, }}>{truncate(i.name, 20)}</span>

                                                            <div className='new-table-tag' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '60px', maxWidth:'60px' }}>
                                                                <span style={{ fontSize: '12px' }}>{i.tag ?? "-"}</span>
                                                            </div>

                                                            <div className={`new-table-tag state-${i.state}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '80px', maxWidth:'80px' }}>
                                                                <span style={{ fontSize: '12px' }}>{i.state ?? "-"}</span>
                                                            </div>

                                                        </div>
                                                    ))

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
                <button type="button" className="gx-tool gx-tool--primary">
                    <Plus size={15} />
                    <span>{t('side_events.btn_add')}</span>
                </button>
            </Dropdown>
    )

    const renderTabToolbar = (tabKey) => (
        <div className="gx-toolbar">
            <div className="gx-search">
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
                <button type="button" className="gx-tool" data-active={activeFilterCount > 0 || undefined}>
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

    const items = useMemo(() => ([
        {
            label: screens.xs ? <Plus size={14} /> : `${t('guests.tab_waiting')} (${countGuestRows(createdData)})`,
            key: "creado",
            children: (
                <div className="gx">
                    {renderTabHero('creado')}
                    {renderTabToolbar('creado')}
                    {renderRsvpDeadlineLine('creado')}
                    {renderSortBar('creado')}
                    {renderCardList(sortForTab('creado', visibleFor(createdData)), 'creado')}
                </div>
            ),
        },
        {
            label: screens.xs ? <Send size={14} /> : `${t('guests.tab_sent')} (${countGuestRows(waitingData)})`,
            key: "esperando",
            children: (
                <div className="gx">
                    {renderTabHero('esperando')}
                    {renderTabToolbar('esperando')}
                    {renderRsvpDeadlineLine('esperando')}
                    {renderSortBar('esperando')}
                    {renderCardList(sortForTab('esperando', visibleFor(waitingData)), 'esperando')}
                </div>
            ),
        },
        {
            label: screens.xs ? <CheckCheck size={14} /> : `${t('guests.tab_confirmed')} (${countGuestRows(confirmedData)})`,
            key: "confirmado",
            children: (
                <div className="gx">
                    {renderTabHero('confirmado')}
                    {renderTabToolbar('confirmado')}
                    {renderSortBar('confirmado')}
                    {renderCardList(sortForTab('confirmado', visibleFor(confirmedData)), 'confirmado')}
                </div>
            ),
        },
        {
            label: screens.xs ? <LuX size={14} /> : `${t('guests.tab_rejected')} (${countGuestRows(rejectedData)})`,
            key: "rechazado",
            children: (
                <div className="gx">
                    {renderTabHero('rechazado')}
                    {renderTabToolbar('rechazado')}
                    {renderSortBar('rechazado')}
                    {renderCardList(sortForTab('rechazado', visibleFor(rejectedData)), 'rechazado')}
                </div>
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
        rejectedData,
        screens.xs,
        activeSort,
        dispatchMap,
        sendMode,
        bulkSelected,
        bulkSending,
        current,
        plan,
        rawData,
        sideTags,
        mainGuests,
        searchMain,
        rsvpPickerSlot,
        searchUser,
        filterTag,
        filterTier,
        filterDelivery,
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

    const handleImport = (state, item) => {
        if (state) {
            setReadyToAdd((prev) => [...prev, item])
        }

        if (!state) {
            setReadyToAdd((prev) => prev.filter(i => i.id !== item.id))
        }
    }

    const handleSideGuests = async () => {
        const list = readyToAdd.map(i => ({
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
            companion_id: null,
            ticket: true,
            has_companion: i.has_companion,
            last_action_by: true,
        }))

        // console.log(list)

        const { error: guestError } = await supabase
            .from('side_events_guests')
            .insert(list)
            .select('*');

        if (guestError) {
            console.error('Error al insertar guest:', guestError);
            return;
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

                                        <div className="gx">
                                            {renderRsvpDeadlineAlert('page')}
                                            {SHOW_BULK_SEND && sendMode && (
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
                                        </div>

                                        <Tabs
                                            className="side-tabs side-tabs--steps"
                                            activeKey={activeKey}
                                            onChange={setActiveKey}
                                            style={screens.xs ? { overflow: 'visible' } : undefined}
                                            type="card"
                                            items={items}
                                            /* Escalera de pasos del rediseño; el contenido
                                               extra (envío masivo, nuevo invitado) se dibuja
                                               debajo. */
                                            renderTabBar={(props) => {
                                                const extra = props.extra?.right ?? (props.extra?.left ? null : props.extra)
                                                return (
                                                    <div className="gx guests-steps-bar">
                                                        {renderStepBar()}
                                                        {extra ? <div className="guests-steps-extra">{extra}</div> : null}
                                                    </div>
                                                )
                                            }}

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
