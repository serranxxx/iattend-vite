import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, ColorPicker, DatePicker, Dropdown, Input, Segmented, Select, Slider, Switch, Tooltip, message } from 'antd'
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, BellRing, CalendarDays, Check, ChevronLeft, ChevronRight, Eye, Film, Heart, ImagePlus, Link2, MessageCircle, MousePointerClick, Music, Plus, Search, Send, Trash2, Type, Upload, Video, X } from 'lucide-react'
import { SiSpotify } from 'react-icons/si'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useDashboardRealtime } from '../../context/DashboardRealtimeContext'
import { formatAbsoluteDateEs } from '../../helpers/assets/eventDateTime'
import { searchSpotifyTracks } from '../../helpers/services/spotify'
import { adoptDraftInto, createFreeInvitation, getTempFolder, listAdoptionTargets, readDraft, saveDraft, sweepTempStorage } from '../../helpers/services/saveTheDateDraft'
import { uploadSongAudio } from '../../helpers/services/uploadAudio'
import { fonts } from '../../helpers/assets/fonts'
import SaveTheDateHost from '../../components/Host/SaveTheDateHost'
import BottomSheet from '../../components/BottomSheet/BottomSheet'
import WhenToSend from '../../components/WhenToSend/WhenToSend'
import StdCanvas from './StdCanvas'
import { StorageImages } from '../../components/ImagesStorage/StorageImages'
import { AuthModal } from '../../pages/PreviewMood/AuthModal'
// El AuthModal es el de /preview: sus clases viven en esa hoja de estilos
import '../../pages/PreviewMood/preview-mood.css'
import { GuestAddTiles } from '../GuestManagement/GuestAddTiles'
import { GuestsCRUD } from '../../components/Create/GuestsCRUD'
import { handleCheckout, PRICE_IDS } from '../../components/Payment/functions'
import { load } from '../../helpers/assets/images'
import styles from './SaveTheDatePage.module.css'
import '../GuestManagement/guests-redesign.css'

dayjs.extend(relativeTime)

const PUBLIC_BASE = 'https://iattend.events/save-the-date'

// Medidas del device de `build-invitation.css` (pantalla 357×668 + marcos):
// el lienzo mide lo mismo que la pieza real en un teléfono.
const DEVICE_W = 387
const DEVICE_H = 793

// Tarjeta de edición (StdCanvas.module.css)
const CARD_W = 390
const CARD_H = 700

// Tintes sugeridos para el CTA glass — translúcidos, como en la pieza.
const BUTTON_SWATCHES = [
    'rgba(74, 113, 145, 0.5)',
    'rgba(12, 23, 27, 0.45)',
    'rgba(255, 255, 255, 0.28)',
    'rgba(209, 190, 221, 0.5)',
    'rgba(185, 187, 166, 0.5)',
    'rgba(198, 124, 108, 0.5)',
]

const DEFAULT_COVER = {
    title: {
        text: { value: 'Save the date', size: 42, weight: 600, opacity: 1, typeFace: 'Poppins', color: '#FFFFFF' },
        position: { column_reverse: 'column', align_x: 'center', align_y: 'center' },
    },
    date: { value: '', active: true, color: '#FFFFFF', type: null },
    button: { color: 'rgba(74, 113, 145, 0.5)' },
    song: null,
    image: { prod: [], dev: null, background: true, blur: false, position: { x: 0, y: 0 }, zoom: 1 },
}

const toArray = (src) => {
    if (!src) return []
    if (typeof src === 'string') return src.trim() ? [src] : []
    if (Array.isArray(src)) return src.filter((s) => typeof s === 'string' && s.trim())
    return []
}

// Copia el cover de la invitación como semilla del Save the Date (§3.1: misma forma)
const buildSeedCover = (invitationCover) => {
    const base = invitationCover ? JSON.parse(JSON.stringify(invitationCover)) : null
    if (!base) return JSON.parse(JSON.stringify(DEFAULT_COVER))
    return {
        title: {
            text: { ...DEFAULT_COVER.title.text, ...(base.title?.text ?? {}) },
            position: { ...DEFAULT_COVER.title.position, ...(base.title?.position ?? {}) },
        },
        date: { ...DEFAULT_COVER.date, ...(base.date ?? {}), active: true },
        button: { ...DEFAULT_COVER.button, ...(base.button ?? {}) },
        song: base.song ?? null,
        image: { ...DEFAULT_COVER.image, ...(base.image ?? {}), prod: toArray(base.image?.prod), dev: null },
    }
}

export const SaveTheDatePage = ({ demo = false }) => {

    const { t, i18n } = useTranslation()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const id = searchParams.get('id')

    const [activeTab, setActiveTab] = useState('edicion')
    const [live, setLive] = useState(false)          // switch "ver en vivo"
    const [section, setSection] = useState(null)     // elemento en edición
    const [std, setStd] = useState(null)          // fila de save_the_dates
    const [plan, setPlan] = useState(null)
    const [cover, setCover] = useState(null)
    const [eventDate, setEventDate] = useState(null)
    const [dirty, setDirty] = useState(false)
    const [saving, setSaving] = useState(false)
    const [reactions, setReactions] = useState([])

    // ── Envío: réplica de la lista de invitados de side events ──
    const [rawData, setRawData] = useState([])
    const [messagesDispatch, setMessagesDispatch] = useState([])
    const [activeKey, setActiveKey] = useState('creado')
    const [searchUser, setSearchUser] = useState(null)
    const [filterTag, setFilterTag] = useState(null)
    const [filterTier, setFilterTier] = useState(null)
    const [filterDelivery, setFilterDelivery] = useState(null)
    const [activeSort, setActiveSort] = useState({})
    const [rsvpDeadline, setRsvpDeadline] = useState(null)
    const [rsvpPickerSlot, setRsvpPickerSlot] = useState(null)
    const [songQuery, setSongQuery] = useState('')
    const [songResults, setSongResults] = useState([])
    const [songLoading, setSongLoading] = useState(false)
    const [songMode, setSongMode] = useState('search')
    const [mediaModeOverride, setMediaModeOverride] = useState(null)
    const [audioUploading, setAudioUploading] = useState(false)
    const audioInputRef = useRef(null)
    const [drawerState, setDrawerState] = useState({ visible: false, currentGuest: null, onEditGuest: false, companions: [] })

    // Demo: bienvenida al entrar y modal de cuenta al querer guardar/compartir
    const [welcomeOpen, setWelcomeOpen] = useState(demo)
    const [adopting, setAdopting] = useState(false)
    // Si la cuenta ya existía y tiene varios eventos, se le pide elegir
    const [targets, setTargets] = useState(null)
    const [pendingDraft, setPendingDraft] = useState(null)
    // Carpeta temporal del bucket: los archivos viven ahí hasta que haya evento
    const [tempFolder] = useState(() => (demo ? getTempFolder() : null))
    const [authOpen, setAuthOpen] = useState(false)
    const [authContext, setAuthContext] = useState('savethedate')

    const [welcomeIn, setWelcomeIn] = useState(false)

    const closeWelcome = () => {
        setWelcomeIn(false)
        setTimeout(() => setWelcomeOpen(false), 220)
    }

    // Con la cuenta lista: se resuelve a qué evento va la pieza. Cuenta nueva
    // → al evento que creó el alta. Cuenta con historia → lo elige la persona.
    const adoptInto = async (invitationID, draft) => {
        setAdopting(true)
        setTargets(null)
        try {
            const target = invitationID === 'new'
                ? await createFreeInvitation((await supabase.auth.getUser()).data.user)
                : invitationID
            const finalId = await adoptDraftInto(target, draft)
            message.success(t('savethedate.draft_saved'))
            navigate(`/dashboard/savethedate?id=${finalId}`)
        } catch (err) {
            console.error('No se pudo guardar el Save the Date:', err)
            message.error(t('savethedate.draft_error'))
            setAdopting(false)
        }
    }

    const adoptAndGo = async (draft) => {
        setAdopting(true)
        try {
            const { events, autoTarget } = await listAdoptionTargets()
            if (autoTarget) return adoptInto(autoTarget, draft)
            // Hay eventos previos: que elija a cuál se lo colgamos
            setAdopting(false)
            setPendingDraft(draft)
            setTargets(events)
        } catch (err) {
            console.error('No se pudo resolver el evento:', err)
            message.error(t('savethedate.draft_error'))
            setAdopting(false)
        }
    }

    const askForAccount = (context = 'savethedate') => {
        setAuthContext(context)
        setAuthOpen(true)
    }

    // En la ruta pública no hay provider de realtime al que suscribirse
    const { subscribe } = useDashboardRealtime({ optional: demo })

    const isPro = plan === 'pro'

    const loadReactions = async (stdId) => {
        const { data, error } = await supabase
            .from('save_the_date_reactions')
            .select('id, emoji, message, created_at')
            .eq('save_the_date_id', stdId)
            .order('created_at', { ascending: false })
            .limit(200)
        if (error) {
            console.error('Error al cargar reacciones:', error)
            return
        }
        setReactions(data ?? [])
    }

    const getGuests = async (invitationId) => {
        const { data, error } = await supabase
            .from('guests')
            .select('*')
            .eq('invitation_id', invitationId)
        if (error) {
            console.error('Error al cargar invitados:', error)
            return
        }
        setRawData(data ?? [])
    }

    const getDispatches = async (invitationId) => {
        const { data, error } = await supabase
            .rpc('get_latest_invitation_dispatches', { p_invitation_id: invitationId })
        if (error) {
            console.error('Error al cargar dispatches:', error)
            return
        }
        setMessagesDispatch(data ?? [])
    }

    // Reacciones nuevas en vivo, vía el hub de realtime del dashboard
    useEffect(() => {
        if (!std?.id) return
        return subscribe('save_the_date_reactions', (payload) => {
            const row = payload.new
            if (!row || String(row.save_the_date_id) !== String(std.id)) return
            setReactions((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev]))
        })
    }, [std?.id, subscribe])

    // Invitados y estados de mensajes en vivo — mismo patrón que side events
    useEffect(() => {
        if (!id) return
        const u1 = subscribe('guests', (payload) => {
            const row = payload.new || payload.old
            if (!row || String(row.invitation_id) !== String(id)) return
            getGuests(id)
        })
        const u2 = subscribe('invitation_message_dispatches', () => {
            getDispatches(id)
        })
        return () => { u1(); u2() }
    }, [id, subscribe])

    const loadData = async (invitationId) => {
        const { data: invitation, error } = await supabase
            .from('invitations')
            .select('data, event_date, plan, rsvp_deadline')
            .eq('id', invitationId)
            .single()

        if (error) {
            console.error('Error al obtener invitación:', error)
            return
        }

        setPlan(invitation?.plan ?? null)
        setRsvpDeadline(invitation?.rsvp_deadline ?? null)

        let { data: row, error: stdError } = await supabase
            .from('save_the_dates')
            .select('*')
            .eq('invitation_id', invitationId)
            .maybeSingle()

        if (stdError) {
            console.error('Error al obtener save the date:', stdError)
            return
        }

        // Si aún no existe, se crea aquí (uno por evento — UNIQUE invitation_id)
        if (!row) {
            const seed = buildSeedCover(invitation?.data?.cover)
            const { data: created, error: createError } = await supabase
                .from('save_the_dates')
                .upsert(
                    { invitation_id: invitationId, cover: seed, event_date: invitation?.event_date ?? null, active: true },
                    { onConflict: 'invitation_id' }
                )
                .select('*')
                .single()

            if (createError) {
                console.error('Error al crear save the date:', createError)
                message.error(t('savethedate.create_error'))
                return
            }
            row = created
        }

        setStd(row)
        setCover(buildSeedCover(row.cover))
        setEventDate(row.event_date ?? null)
        setDirty(false)
        loadReactions(row.id)
        getGuests(invitationId)
        getDispatches(invitationId)
    }

    useEffect(() => {
        if (demo) {
            // El borrador vive en localStorage: así sobrevive el ida y vuelta
            // del login con Google/Apple.
            const draft = readDraft()
            setStd({ id: 'demo' })
            setPlan('free')
            setCover(draft?.cover ?? { ...JSON.parse(JSON.stringify(DEFAULT_COVER)), title: { ...DEFAULT_COVER.title, text: { ...DEFAULT_COVER.title.text, value: '' } } })
            setEventDate(draft?.eventDate ?? `${dayjs().add(6, 'month').format('YYYY-MM-DD')}T00:00:00Z`)
            setWelcomeOpen(!draft)
            sweepTempStorage()
            return
        }
        if (id) {
            loadData(id)
        } else {
            navigate('/invitations')
        }
    }, [id, demo])

    // Canción: mismo flujo que el builder de la invitación (Spotify o archivo)
    useEffect(() => {
        if (!songQuery.trim()) {
            setSongResults([])
            return
        }
        setSongLoading(true)
        const timer = setTimeout(async () => {
            try {
                const tracks = await searchSpotifyTracks(songQuery)
                setSongResults(tracks)
            } catch {
                setSongResults([])
            } finally {
                setSongLoading(false)
            }
        }, 400)
        return () => clearTimeout(timer)
    }, [songQuery])

    const updateCover = (updater) => {
        setCover((prev) => updater(JSON.parse(JSON.stringify(prev))))
        setDirty(true)
    }

    // El fondo es o carrusel de imágenes o un video: `cover.image.prod` es la
    // única fuente, así que el modo se deriva de lo que hay guardado.
    const isVideoUrl = (url) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)
    const media = toArray(cover?.image?.prod)
    const savedMode = media.some(isVideoUrl) ? 'video' : 'image'
    const mediaMode = mediaModeOverride ?? savedMode
    const images = mediaMode === 'image' ? media.filter((u) => !isVideoUrl(u)) : []
    const video = mediaMode === 'video' ? media.find(isVideoUrl) ?? null : null

    // Cambiar de modo reemplaza el medio (los archivos siguen en Storage)
    const changeMediaMode = (mode) => {
        setMediaModeOverride(mode)
        if (mode !== savedMode) updateCover((c) => { c.image.prod = []; return c })
    }

    const btnColor = cover?.button?.color ?? 'rgba(74, 113, 145, 0.5)'

    const setVideo = (url) => updateCover((c) => { c.image.prod = url ? [url] : []; return c })

    // Con fondo de video hace falta una imagen fija: es la que se ve al
    // compartir el link (WhatsApp, meta tags) y en la tarjeta del dashboard.
    const poster = cover?.image?.poster ?? null
    const setPoster = (url) => updateCover((c) => { c.image.poster = url || null; return c })
    const needsPoster = mediaMode === 'video' && !!video && !poster

    const addImage = (url) => updateCover((c) => { c.image.prod = [...toArray(c.image.prod), url]; return c })

    const removeImage = (index) => updateCover((c) => {
        c.image.prod = toArray(c.image.prod).filter((_, i) => i !== index)
        return c
    })

    const moveImage = (index, dir) => updateCover((c) => {
        const arr = toArray(c.image.prod)
        const j = index + dir
        if (j < 0 || j >= arr.length) return c
        ;[arr[index], arr[j]] = [arr[j], arr[index]]
        c.image.prod = arr
        return c
    })

    const handleSelectSong = (track) => {
        updateCover((c) => {
            c.song = {
                id: track.id,
                source: 'spotify',
                name: track.name,
                artist: track.artists[0].name,
                albumArt: track.album.images[track.album.images.length - 1]?.url,
                previewUrl: track.preview_url,
            }
            return c
        })
        setSongQuery('')
        setSongResults([])
    }

    const handleRemoveSong = () => updateCover((c) => { c.song = null; return c })

    const handleAudioFileChange = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file || !id) return

        setAudioUploading(true)
        try {
            const url = await uploadSongAudio({ file, invitationID: id })
            if (!url) return
            updateCover((c) => {
                c.song = {
                    id: `upload-${Date.now()}`,
                    source: 'upload',
                    name: file.name.replace(/\.[^/.]+$/, ''),
                    artist: '',
                    albumArt: null,
                    previewUrl: url,
                }
                return c
            })
        } catch (err) {
            console.error(err)
            message.error(t('build_generals.song_upload_error'))
        } finally {
            setAudioUploading(false)
        }
    }

    const [posterAsk, setPosterAsk] = useState(false)

    const handleSave = async () => {
        // Fondo de video sin imagen de link: el link se compartiría sin
        // vista previa, así que se pide antes de guardar.
        if (needsPoster && !posterAsk) {
            setPosterAsk(true)
            return false
        }
        setPosterAsk(false)
        if (demo) {
            askForAccount('savethedate')
            return false
        }
        if (!std) return
        setSaving(true)
        const { error } = await supabase
            .from('save_the_dates')
            .update({ cover, event_date: eventDate })
            .eq('id', std.id)
        setSaving(false)

        if (error) {
            console.error('Error al guardar:', error)
            message.error(t('savethedate.save_error'))
            return false
        }
        setDirty(false)
        message.success(t('savethedate.saved'))
        return true
    }

    // La tarjeta (o el device de "ver en vivo") se escala para entrar completa
    // en pantalla sin scroll, como en una herramienta de diseño.
    const [availableH, setAvailableH] = useState(760)

    useEffect(() => {
        const fit = () => setAvailableH(window.innerHeight - 190)
        fit()
        window.addEventListener('resize', fit)
        return () => window.removeEventListener('resize', fit)
    }, [])

    // La columna de respuestas se queda montada mientras sale, para que la
    // transición de salida se alcance a ver.
    const [answersMounted, setAnswersMounted] = useState(false)
    const [answersIn, setAnswersIn] = useState(false)

    useEffect(() => {
        if (activeTab === 'reacciones') {
            setAnswersMounted(true)
            // timeout y no requestAnimationFrame: en una pestaña de fondo rAF
            // no corre y la columna se quedaría invisible hasta volver a ella
            const enter = setTimeout(() => setAnswersIn(true), 20)
            return () => clearTimeout(enter)
        }
        setAnswersIn(false)
        const timer = setTimeout(() => setAnswersMounted(false), 320)
        return () => clearTimeout(timer)
    }, [activeTab])

    // Móvil: el editor cambia a pantalla completa con dock y hoja inferior
    const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 720px)').matches)

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 720px)')
        const onChange = (e) => setIsMobile(e.matches)
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    }, [])

    // La hoja se queda montada mientras baja, para que la salida se vea
    const [sheetSection, setSheetSection] = useState(null)

    useEffect(() => {
        if (section) return setSheetSection(section)
        const timer = setTimeout(() => setSheetSection(null), 300)
        return () => clearTimeout(timer)
    }, [section])

    useEffect(() => {
        if (!welcomeOpen) return
        const enter = setTimeout(() => setWelcomeIn(true), 20)
        return () => clearTimeout(enter)
    }, [welcomeOpen])

    // Vuelta del login con Google/Apple: la sesión ya existe y el borrador
    // sigue en localStorage, así que se termina el trabajo sin pedir nada más.
    useEffect(() => {
        if (!demo) return
        let cancelled = false
        supabase.auth.getSession().then(({ data }) => {
            const draft = readDraft()
            if (cancelled || !data?.session || !draft?.cover) return
            adoptAndGo(draft)
        })
        return () => { cancelled = true }
    }, [demo])

    // Cada cambio se persiste en el borrador (barato: es un objeto chico)
    useEffect(() => {
        if (!demo || !cover) return
        saveDraft({ cover, eventDate })
    }, [demo, cover, eventDate])

    // La hoja tapaba el título justo cuando se está escribiendo: reporta su
    // alto y el contenido de la pieza sube ese tanto mientras está abierta.
    // Se descuenta lo que hay entre el marco y el borde de la pantalla (el
    // dock), que la hoja ya cubre — si no, el hueco quedaba enorme.
    const stageRef = useRef(null)
    const [sheetHeight, setSheetHeight] = useState(0)
    const [stageGap, setStageGap] = useState(0)
    const sheetOpen = !!section && !live && activeTab === 'edicion'

    useEffect(() => {
        const measure = () => {
            const rect = stageRef.current?.getBoundingClientRect()
            setStageGap(rect ? Math.max(0, Math.round(window.innerHeight - rect.bottom)) : 0)
        }
        measure()
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
        // std entra en las dependencias porque el marco se monta cuando ya
        // hay datos: sin eso la medida se quedaba en 0
    }, [isMobile, activeTab, live, std?.id])

    const contentLift = sheetOpen ? Math.max(0, sheetHeight - stageGap + 10) : 0

    const fitScale = (h) => Math.max(0.6, Math.min(1, availableH / h))
    const cardScale = fitScale(CARD_H)
    const deviceScale = fitScale(DEVICE_H)

    const setTitleValue = (value) => updateCover((c) => { c.title.text.value = value; return c })

    // ── Salir con cambios sin guardar ──
    // Diálogo propio: se queda montado mientras sale para que se vea la
    // transición (nada de Modal de antd).
    const [leaveMounted, setLeaveMounted] = useState(false)
    const [leaveIn, setLeaveIn] = useState(false)
    const [leaving, setLeaving] = useState(false)

    const goToDashboard = () => navigate(demo ? '/' : `/dashboard?id=${id}`)

    const closeLeave = () => {
        setLeaveIn(false)
        setTimeout(() => setLeaveMounted(false), 220)
    }

    const handleBack = () => {
        if (!dirty) return goToDashboard()
        setLeaveMounted(true)
        setTimeout(() => setLeaveIn(true), 20)
    }

    const saveAndLeave = async () => {
        setLeaving(true)
        const ok = await handleSave()
        setLeaving(false)
        if (!ok) return
        closeLeave()
        goToDashboard()
    }

    // Escape cierra el diálogo
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

    const publicUrl = std ? `${PUBLIC_BASE}/${std.id}` : ''

    const handleCopyLink = async () => {
        if (demo) return askForAccount('savethedate')
        try {
            await navigator.clipboard.writeText(publicUrl)
            message.success(t('savethedate.link_copied'))
        } catch {
            message.error(publicUrl)
        }
    }

    // Lo que viaja al iframe: la fecha de la columna manda sobre cover.date.value.
    // El id hace que el preview cargue y persista reacciones reales.
    const previewConfig = useMemo(
        () => (cover ? { id: std?.id ?? null, cover, event_date: eventDate } : null),
        [cover, eventDate, std?.id]
    )

    const emojiCounts = reactions.filter((r) => r.emoji).reduce((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] || 0) + 1
        return acc
    }, {})
    const reactionMessages = reactions.filter((r) => r.message)
    const reactionDate = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

    // ═════════════════════════════════════════════════════════════════════
    // Envío — réplica de la lista de invitados de SideEvents.jsx
    // (mismos renders, clases y comportamiento; cambia la tabla: `guests`)
    // ═════════════════════════════════════════════════════════════════════

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

    const dispatchMap = useMemo(() => {
        const map = {};
        messagesDispatch.forEach(m => {
            map[m.guest_id] = m;
        });
        return map;
    }, [messagesDispatch]);

    const compareByTier = (a, b) => (TIER_SORT_ORDER[a.tier] ?? 99) - (TIER_SORT_ORDER[b.tier] ?? 99);

    const compareByStatus = (a, b) =>
        (MESSAGE_STATUS_SORT_ORDER[dispatchMap[a.id]?.status ?? 'undefined'] ?? 1) - (MESSAGE_STATUS_SORT_ORDER[dispatchMap[b.id]?.status ?? 'undefined'] ?? 1);

    const applySortDir = (data, dir, comparator) => {
        if (!dir) return data;
        const sorted = [...data].sort(comparator);
        return dir === 'desc' ? sorted.reverse() : sorted;
    };

    const SORT_COMPARATORS = { tier: compareByTier, estado: compareByStatus };

    const sortForTab = (tabKey, data) => {
        const sort = activeSort[tabKey];
        const comparator = sort?.column && SORT_COMPARATORS[sort.column];
        if (!comparator) return data;
        return applySortDir(data, sort.dir, comparator);
    };

    const renderTag = (value) => {
        if (value == null) return "-";
        if (typeof value === "object") return "-";
        return String(value);
    };

    // Agrupa por familia (companion_id) solo entre quienes comparten alguno de
    // los `states` pedidos — misma convención que GuestsPage/SideEvents.
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

    const handleCompanions = (guestId) => {
        const comps = rawData?.filter((row) => row.companion_id === guestId.toString())
        return comps
    }

    const createdData = useMemo(() => groupByFamilyForStates(rawData, ['creado']), [rawData])
    const waitingData = useMemo(() => groupByFamilyForStates(rawData, ['esperando']), [rawData])
    const confirmedData = useMemo(() => groupByFamilyForStates(rawData, ['confirmado']), [rawData])
    const rejectedData = useMemo(() => groupByFamilyForStates(rawData, ['rechazado']), [rawData])

    // ── Búsqueda y filtros (mismo toolbar que side events) ──
    const guestTags = useMemo(() => {
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

    const flattenGroups = (grouped = []) => grouped.flatMap((g) => [g, ...(g.children || [])])

    const visibleFor = (grouped = []) => (hasActiveFilters
        ? flattenGroups(grouped).filter(matchesFilters).map((g) => ({ ...g, __isGroupChild: false, children: [] }))
        : grouped)

    const countGuestRows = (groupedData = []) =>
        groupedData
            .flatMap((g) => [g, ...(g.children || [])])
            .filter((g) => matchesFilters(g))
            .length;

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
                guestTags.map((i) => ({ value: i, label: i })),
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

    // ── Tarjetas ──
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

    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success(t('side_events.copied'))
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const handleShare = async (url) => {
        const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
        if (isMobileDevice && navigator.share) {
            try {
                await navigator.share({
                    title: cover?.title?.text?.value ?? 'Save the date',
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

    const renderCopyLink = (record, small = false) => (
        <Tooltip title={t('savethedate.copy_link')}>
            <button
                type="button"
                className={`gx-pill ${small ? 'gx-pill--sm' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleShare(publicUrl) }}
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

    // Acción del tab "Por invitar": marcar como invitado a mano.
    const onSendInvitation = async (guest) => {
        const guestPatch = {
            state: 'esperando',
            last_action: guest.state,
            last_action_by: true,
            last_update_date: new Date()
        };

        const { error: guestError } = await supabase
            .from('guests')
            .update(guestPatch)
            .eq('id', guest.id)
            .select('*')
            .maybeSingle();

        if (guestError) throw guestError;
        getGuests(id)
    }

    const renderCreatedAction = (record) => {
        if (record.companion_id !== null && record.companion_id !== undefined) return null

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

    const renderGuestCard = (record, tabKey, children = []) => {
        const status = tabKey === 'esperando' ? sendStatusInfo(record) : null
        const isRejected = tabKey === 'rechazado'
        const isConfirmed = tabKey === 'confirmado'

        const actionNode = tabKey === 'creado'
            ? renderCreatedAction(record)
            : null

        const tone = isRejected ? 'muted' : status?.tone ?? null

        return (
            <div
                key={record.id}
                className="gx-card"
                data-tone={tone || undefined}
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

    // Escalera de pasos (sin Resumen, como side events)
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

    // ── Fecha límite (invitations.rsvp_deadline, top-level como GuestsPage) ──
    const onSaveRsvpDeadline = async (dateValue) => {
        if (!dateValue || !id) return
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

        if (dateValue.diff(dayjs().startOf('day'), 'day') < 5) {
            message.warning(t('guests.rsvp_deadline_soon_warning'))
        } else {
            message.success(t('guests.rsvp_deadline_saved'))
        }

        setRsvpDeadline(newDeadline)
    }

    const rsvpDisabledDate = (d) => {
        if (!d) return false
        if (!d.isAfter(dayjs().startOf('day'), 'day')) return true // debe ser futura
        if (eventDate && d.isAfter(dayjs(eventDate.slice(0, 10)), 'day')) return true
        return false
    }

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
                    <button type="button" className="gx-btn gx-btn--accent gx-btn--sm" onClick={() => setRsvpPickerSlot(slot)}>
                        {t('guests.rsvp_deadline_define')}
                    </button>
                    {renderRsvpPicker(slot)}
                </span>
            </div>
        )
    }

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

    // ── Agregar invitado (mismo menú de side events, contra la lista principal) ──
    const renderAddGuestButton = () => (
        <Dropdown
            trigger={['click']}
            placement="bottomRight"
            dropdownRender={() => (
                <GuestAddTiles
                    plan={plan}
                    onIndividual={() => setDrawerState({ currentGuest: null, onEditGuest: false, companions: [], visible: true })}
                    onFile={(file) => navigate(`/dashboard/guests/import?id=${id}`, { state: { file } })}
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

            {tabKey === 'creado' && renderAddGuestButton()}
        </div>
    )

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

    const tabDataFor = (tabKey) => (
        tabKey === 'creado' ? createdData
            : tabKey === 'esperando' ? waitingData
                : tabKey === 'confirmado' ? confirmedData
                    : rejectedData
    )

    if (!std || !cover) {
        return (
            <div className='build-loading-container'>
                <img alt='' src={load} style={{ width: '200px' }} />
            </div>
        )
    }

    /* ── Cabecera común de cada bloque ── */
    const blockHead = (icon, title, hint, action = null) => (
        <div className={styles.blockHead}>
            <span className={styles.blockIcon}>{icon}</span>
            <div className={styles.blockHeadText}>
                <span className={styles.blockTitle}>{title}</span>
                {hint && <span className={styles.blockHint}>{hint}</span>}
            </div>
            {action && <div className={styles.blockAction}>{action}</div>}
        </div>
    )

    /* ── Paneles del inspector: uno por elemento del lienzo ── */

    const panelBackground = (
        <>
            {blockHead(
                <ImagePlus size={16} />,
                t('savethedate.background'),
                t('savethedate.background_hint'),
            )}

            <Segmented
                block
                className={styles.segmentedPill}
                value={mediaMode}
                onChange={changeMediaMode}
                options={[
                    { value: 'image', label: t('savethedate.media_images'), icon: <ImagePlus size={14} /> },
                    { value: 'video', label: t('savethedate.media_video'), icon: <Film size={14} /> },
                ]}
            />

            {mediaMode === 'image' ? (
                <div className={styles.thumbRow}>
                    {images.map((url, i) => (
                        <div key={url + i} className={styles.thumb}>
                            <img src={url} alt='' />
                            <div className={styles.thumbActions}>
                                <Button size='small' type='text' aria-label={t('savethedate.move_left')} style={{ color: '#FFF' }} icon={<ChevronLeft size={16} />} onClick={() => moveImage(i, -1)} />
                                <Button size='small' type='text' aria-label={t('savethedate.remove_image')} style={{ color: '#FFF' }} icon={<Trash2 size={16} />} onClick={() => removeImage(i)} />
                                <Button size='small' type='text' aria-label={t('savethedate.move_right')} style={{ color: '#FFF' }} icon={<ChevronRight size={16} />} onClick={() => moveImage(i, 1)} />
                            </div>
                        </div>
                    ))}
                    <StorageImages
                        invitationID={demo ? tempFolder : id}
                        type={'side-events'}
                        handleImage={(url) => { if (url) addImage(url) }}
                        customTrigger={
                            <div className={styles.addTile} role='button' tabIndex={0} aria-label={t('savethedate.images')}>
                                <Plus size={20} />
                            </div>
                        }
                    />
                </div>
            ) : (
                <div className={styles.thumbRow}>
                    {video && (
                        <div className={styles.thumb}>
                            <video src={video} muted playsInline preload='metadata' />
                            <div className={styles.thumbActions}>
                                <Button size='small' type='text' aria-label={t('savethedate.remove_video')} style={{ color: '#FFF' }} icon={<Trash2 size={16} />} onClick={() => setVideo(null)} />
                            </div>
                        </div>
                    )}
                    <StorageImages
                        invitationID={demo ? tempFolder : id}
                        mediaType='video'
                        handleImage={(url) => { if (url) setVideo(url) }}
                        customTrigger={
                            <div className={styles.addTile} role='button' tabIndex={0} aria-label={t('savethedate.media_video')}>
                                <Video size={20} />
                            </div>
                        }
                    />
                    {!video && <span className={styles.hint}>{t('savethedate.video_hint')}</span>}
                </div>
            )}

            {mediaMode === 'video' &&
                <div className={styles.fieldStack}>
                    <span className={styles.fieldLabel}>{t('savethedate.poster_label')}</span>
                    <span className={styles.hint}>{t('savethedate.poster_hint')}</span>

                    <div className={styles.thumbRow}>
                        {poster &&
                            <div className={styles.thumb}>
                                <img src={poster} alt='' />
                                <div className={styles.thumbActions}>
                                    <Button size='small' type='text' aria-label={t('savethedate.remove_image')} style={{ color: '#FFF' }} icon={<Trash2 size={16} />} onClick={() => setPoster(null)} />
                                </div>
                            </div>
                        }
                        <StorageImages
                            invitationID={demo ? tempFolder : id}
                            type={'side-events'}
                            handleImage={(url) => { if (url) setPoster(url) }}
                            customTrigger={
                                <div className={`${styles.addTile} ${needsPoster ? styles.addTileAlert : ''}`} role='button' tabIndex={0} aria-label={t('savethedate.poster_label')}>
                                    <ImagePlus size={20} />
                                </div>
                            }
                        />
                    </div>
                </div>
            }

            <label className={styles.toggle}>
                <span className={styles.toggleLabel}>{t('savethedate.darken')}</span>
                <Switch
                    size='small'
                    checked={!!cover.image.background}
                    onChange={(v) => updateCover((c) => { c.image.background = v; return c })}
                />
            </label>

            <label className={styles.toggle}>
                <span className={styles.toggleLabel}>{t('savethedate.blur')}</span>
                <Switch
                    size='small'
                    checked={!!cover.image.blur}
                    onChange={(v) => updateCover((c) => { c.image.blur = v; return c })}
                />
            </label>
        </>
    )

    const panelTitle = (
        <>
            {blockHead(<Type size={16} />, t('savethedate.event_title'), t('savethedate.title_inline_hint'))}

            <div className={styles.fieldStack}>
                <span className={styles.fieldLabel}>{t('savethedate.font')}</span>
                <div className={styles.fieldRow}>
                    <Select
                        style={{ flex: 1, minWidth: 0 }}
                        showSearch
                        value={cover.title.text.typeFace}
                        options={fonts.map((f) => ({ value: f, label: <span style={{ fontFamily: f }}>{f}</span> }))}
                        onChange={(v) => updateCover((c) => { c.title.text.typeFace = v; return c })}
                    />
                    <ColorPicker
                        value={cover.title.text.color}
                        onChange={(color) => updateCover((c) => { c.title.text.color = color.toHexString(); return c })}
                    />
                </div>
            </div>

            <div className={styles.fieldStack}>
                <span className={styles.fieldLabel}>{t('savethedate.size')}</span>
                <Slider
                    min={24} max={80} step={1}
                    value={cover.title.text.size ?? 42}
                    onChange={(v) => updateCover((c) => { c.title.text.size = v; return c })}
                />
            </div>

            <div className={styles.fieldStack}>
                <span className={styles.fieldLabel}>{t('savethedate.position')}</span>
                <Segmented
                    block
                    size='small'
                    value={cover.title.position.align_y}
                    options={[
                        { value: 'flex-start', label: t('savethedate.position_top') },
                        { value: 'center', label: t('savethedate.position_center') },
                        { value: 'flex-end', label: t('savethedate.position_bottom') },
                    ]}
                    onChange={(v) => updateCover((c) => { c.title.position.align_y = v; return c })}
                />
            </div>

            <div className={styles.fieldStack}>
                <span className={styles.fieldLabel}>{t('savethedate.align')}</span>
                <Segmented
                    block
                    size='small'
                    value={cover.title.position.align_x ?? 'center'}
                    options={[
                        { value: 'left', icon: <AlignLeft size={15} />, title: t('savethedate.align_left') },
                        { value: 'center', icon: <AlignCenter size={15} />, title: t('savethedate.align_center') },
                        { value: 'right', icon: <AlignRight size={15} />, title: t('savethedate.align_right') },
                    ]}
                    onChange={(v) => updateCover((c) => { c.title.position.align_x = v; return c })}
                />
            </div>
        </>
    )

    const panelDate = (
        <>
            {blockHead(<CalendarDays size={16} />, t('savethedate.event_date'), t('savethedate.date_hint'))}

            <DatePicker
                style={{ width: '100%' }}
                format='DD/MM/YYYY'
                value={eventDate ? dayjs(eventDate.slice(0, 10)) : null}
                onChange={(d) => { setEventDate(d ? `${d.format('YYYY-MM-DD')}T00:00:00Z` : null); setDirty(true) }}
            />

            <div className={styles.fieldStack}>
                <span className={styles.fieldLabel}>{t('savethedate.countdown_font')}</span>
                <div className={styles.fieldRow}>
                    <Select
                        style={{ flex: 1, minWidth: 0 }}
                        showSearch
                        value={cover.date.typeFace ?? 'Poppins'}
                        options={fonts.map((f) => ({ value: f, label: <span style={{ fontFamily: f }}>{f}</span> }))}
                        onChange={(v) => updateCover((c) => { c.date.typeFace = v; return c })}
                    />
                    <ColorPicker
                        value={cover.date.color ?? '#FFFFFF'}
                        onChange={(color) => updateCover((c) => { c.date.color = color.toHexString(); return c })}
                    />
                </div>
            </div>
        </>
    )

    const panelButton = (
        <>
            {blockHead(<MousePointerClick size={16} />, t('savethedate.button_section'), t('savethedate.button_hint'))}

            <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>{t('savethedate.button_color')}</span>
                {/* El color casi siempre es translúcido: se compone sobre una
                    base oscura para que se lea igual que sobre la portada. */}
                <span
                    className={styles.btnPreview}
                    style={{ background: `linear-gradient(${btnColor}, ${btnColor}), #3f4d55` }}
                >
                    Save the date
                </span>
                <ColorPicker
                    value={btnColor}
                    onChange={(color) => updateCover((c) => {
                        c.button = { ...(c.button ?? {}), color: color.toRgbString() }
                        return c
                    })}
                />
            </div>

            <div className={styles.swatchRow}>
                {BUTTON_SWATCHES.map((c) => (
                    <button
                        key={c}
                        className={`${styles.swatch} ${btnColor === c ? styles.swatchActive : ''}`}
                        style={{ background: `linear-gradient(${c}, ${c}), #3f4d55` }}
                        aria-label={c}
                        onClick={() => updateCover((cv) => {
                            cv.button = { ...(cv.button ?? {}), color: c }
                            return cv
                        })}
                    />
                ))}
            </div>
        </>
    )

    const panelSong = (
        <>
            {blockHead(<Music size={16} />, t('build_generals.label_song'), t('savethedate.song_hint'))}

            {cover.song ? (
                <div className={styles.songCard}>
                    {cover.song.albumArt && (
                        <img src={cover.song.albumArt} alt='' className={styles.songArt} />
                    )}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div className={styles.songName}>{cover.song.name}</div>
                        {cover.song.artist && <div className={styles.songArtist}>{cover.song.artist}</div>}
                    </div>
                    <Button type='text' onClick={handleRemoveSong} size='small' icon={<X size={14} />} style={{ color: '#888', flexShrink: 0 }} />
                </div>
            ) : (
                <>
                    <Segmented
                        block
                        style={{ borderRadius: '99px', padding: '2px', border: '1px solid #EBEBEB' }}
                        value={songMode}
                        onChange={setSongMode}
                        options={[
                            { label: t('build_generals.song_mode_spotify'), value: 'search' },
                            { label: t('build_generals.song_mode_upload'), value: 'upload' },
                        ]}
                    />

                    {songMode === 'search' ? (
                        <>
                            <Input
                                value={songQuery}
                                onChange={(e) => setSongQuery(e.target.value)}
                                placeholder={t('build_generals.song_placeholder')}
                                style={{ borderRadius: '99px' }}
                                prefix={<SiSpotify style={{ color: '#1DB954' }} />}
                            />
                            {songLoading && (
                                <span className={styles.hint}>{t('build_generals.song_searching')}</span>
                            )}
                            {songResults.length > 0 && (
                                <div className={styles.songResults}>
                                    {songResults.map((track) => (
                                        <div
                                            key={track.id}
                                            onClick={() => handleSelectSong(track)}
                                            className={styles.songResult}
                                        >
                                            {track.album.images[track.album.images.length - 1]?.url && (
                                                <img src={track.album.images[track.album.images.length - 1].url} alt='' className={styles.songResultArt} />
                                            )}
                                            <div style={{ overflow: 'hidden' }}>
                                                <div className={styles.songName}>{track.name}</div>
                                                <div className={styles.songArtist}>{track.artists[0]?.name}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <input
                                ref={audioInputRef}
                                type='file'
                                accept='audio/*'
                                style={{ display: 'none' }}
                                onChange={handleAudioFileChange}
                            />
                            <Button
                                className='primarybutton'
                                loading={audioUploading}
                                icon={<Upload size={14} />}
                                onClick={() => audioInputRef.current?.click()}
                            >
                                {t('build_generals.song_upload_btn')}
                            </Button>
                            <span className={styles.hint}>{t('build_generals.song_upload_hint')}</span>
                        </>
                    )}
                </>
            )}
        </>
    )

    const PANELS = {
        background: panelBackground,
        title: panelTitle,
        date: panelDate,
        button: panelButton,
        song: panelSong,
    }

    const SECTIONS = [
        { key: 'background', icon: <ImagePlus size={18} />, label: t('savethedate.background'), short: t('savethedate.dock_background') },
        { key: 'title', icon: <Type size={18} />, label: t('savethedate.event_title'), short: t('savethedate.dock_title') },
        { key: 'date', icon: <CalendarDays size={18} />, label: t('savethedate.event_date'), short: t('savethedate.dock_date') },
        { key: 'button', icon: <MousePointerClick size={18} />, label: t('savethedate.button_section'), short: t('savethedate.dock_button') },
        { key: 'song', icon: <Music size={18} />, label: t('build_generals.label_song'), short: t('savethedate.dock_song') },
    ]

    /* ── Respuestas: reacciones + mensajes, al lado de la pieza ── */
    const reactionsContent = (
        // la columna iguala el alto de la pieza: el historial crece con ella
        <div
            className={`${styles.answersCol} ${answersIn ? styles.answersColIn : ''}`}
            style={{ height: DEVICE_H * deviceScale }}
        >

            {/* Resumen de emojis */}
            <section className={styles.block}>
                {blockHead(
                    <Heart size={16} />,
                    t('savethedate.reactions'),
                    t('savethedate.reactions_hint'),
                    <span className={styles.reactionsCount}>{reactions.length}</span>
                )}

                <div className={styles.blockBody}>
                    {Object.keys(emojiCounts).length === 0 ? (
                        <span className={styles.hint}>{t('savethedate.reactions_empty')}</span>
                    ) : (
                        <div className={styles.emojiSummary}>
                            {Object.entries(emojiCounts).sort((a, b) => b[1] - a[1]).map(([emoji, count]) => (
                                <span key={emoji} className={styles.emojiCount}>{emoji} {count}</span>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Mensajes */}
            <section className={styles.block}>
                {blockHead(
                    <MessageCircle size={16} />,
                    t('savethedate.messages'),
                    t('savethedate.messages_hint'),
                    <span className={styles.reactionsCount}>{reactionMessages.length}</span>
                )}

                <div className={styles.blockBody}>
                    {reactionMessages.length === 0 ? (
                        <span className={styles.hint}>{t('savethedate.messages_empty')}</span>
                    ) : (
                        <div className={`${styles.reactionsList} scroll-invitation`}>
                            {reactionMessages.map((r) => (
                                <div key={r.id} className={styles.reactionMsg}>
                                    <span>{r.message}</span>
                                    <span className={styles.reactionMeta}>{reactionDate(r.created_at)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

        </div>
    )

    /* ── Lienzo flotante: se comparte entre Crear y Respuestas ── */
    const showLivePiece = live || activeTab === 'reacciones'

    const canvasBlock = (
        <div className={styles.canvasWrap}>
            {showLivePiece ? (
                <div
                    key='live'
                    className={styles.scaler}
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
                                <SaveTheDateHost config={previewConfig} />
                            </div>
                            <div className='inv-light-space-ios' />
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    key='card'
                    className={styles.scaler}
                    style={{ width: CARD_W * cardScale, height: CARD_H * cardScale }}
                >
                    <div style={{ transform: `scale(${cardScale})`, transformOrigin: 'top left' }}>
                        <StdCanvas
                            key={std.id}
                            cover={cover}
                            eventDate={eventDate}
                            selected={section}
                            onSelect={setSection}
                            onTitleInput={setTitleValue}
                            readOnly={activeTab !== 'edicion'}
                        />
                    </div>
                </div>
            )}

            {activeTab === 'edicion' &&
                <span className={styles.canvasCaption}>
                    {live ? t('savethedate.live_caption') : t('savethedate.canvas_caption')}
                </span>
            }
        </div>
    )

    /* ── Crear: riel + panel del elemento seleccionado ── */
    const editorTools = (
        <>
            {/* Riel de elementos */}
            <div className={styles.rail}>
                {SECTIONS.map((s) => (
                    <Tooltip key={s.key} title={s.label} placement='right'>
                        <button
                            className={`${styles.railBtn} ${section === s.key ? styles.railBtnActive : ''}`}
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
                <aside className={styles.toolPanel}>
                    <button className={styles.toolClose} onClick={() => setSection(null)} aria-label={t('savethedate.close')}>
                        <X size={16} />
                    </button>
                    {PANELS[section]}
                </aside>
            }

        </>
    )

    const sendContent = (
        <div className={styles.blocks}>
            <section className={`${styles.block} ${styles.blockWide}`}>
                {blockHead(<Send size={16} />, t('savethedate.tab_send'), t('savethedate.send_hint'))}

                {renderStepBar()}

                <div className={styles.sendArea}>
                    <div className="gx">
                        {renderTabHero(activeKey)}
                        {renderTabToolbar(activeKey)}
                        {(activeKey === 'creado' || activeKey === 'esperando') && renderRsvpDeadlineAlert(activeKey)}
                        {(activeKey === 'creado' || activeKey === 'esperando') && renderRsvpDeadlineLine(activeKey)}
                        {renderSortBar(activeKey)}
                        {renderCardList(sortForTab(activeKey, visibleFor(tabDataFor(activeKey))), activeKey)}
                    </div>

                    {/* Sin PRO: tabla blureada + CTA */}
                    {!isPro &&
                        <>
                            <div className={styles.proBlur} />
                            <div className={styles.proCta}>
                                <span className={styles.proCtaTitle}>{t('savethedate.send_pro_title')}</span>
                                <span className={styles.proCtaText}>{t('savethedate.send_pro_text')}</span>
                                <Button
                                    type='primary'
                                    style={{ borderRadius: '12px', fontWeight: 600 }}
                                    onClick={() => handleCheckout(id, PRICE_IDS.UPGRADE_TO_PRO)}
                                >
                                    {t('savethedate.send_pro_cta')}
                                </Button>
                            </div>
                        </>
                    }
                </div>
            </section>
        </div>
    )

    /* ── Demo: bienvenida y modal de cuenta ── */
    const demoModals = demo && (
        <>
            {welcomeOpen &&
                <div
                    className={`${styles.modalBackdrop} ${welcomeIn ? styles.modalBackdropIn : ''}`}
                    onClick={closeWelcome}
                >
                    <div
                        className={`${styles.modalCard} ${welcomeIn ? styles.modalCardIn : ''}`}
                        onClick={(e) => e.stopPropagation()}
                        role='dialog'
                        aria-modal='true'
                    >
                        <span className={styles.welcomeBadge}>{t('savethedate.welcome_badge')}</span>
                        <span className={styles.welcomeTitle}>{t('savethedate.welcome_title')}</span>
                        <span className={styles.modalText}>{t('savethedate.welcome_text')}</span>

                        <div className={styles.welcomeList}>
                            <span><ImagePlus size={15} /> {t('savethedate.welcome_step_1')}</span>
                            <span><CalendarDays size={15} /> {t('savethedate.welcome_step_2')}</span>
                            <span><Music size={15} /> {t('savethedate.welcome_step_3')}</span>
                        </div>

                        <div className={styles.modalActions}>
                            <Button type='text' onClick={() => { closeWelcome(); askForAccount('savethedate') }}>
                                {t('savethedate.welcome_login')}
                            </Button>
                            <Button
                                className='primarybutton--active'
                                style={{ borderRadius: '99px' }}
                                onClick={closeWelcome}
                            >
                                {t('savethedate.welcome_cta')}
                            </Button>
                        </div>
                    </div>
                </div>
            }

            <AuthModal
                open={authOpen}
                context={authContext}
                redirectTo='/save-the-date'
                onClose={() => setAuthOpen(false)}
                onSuccess={() => { setAuthOpen(false); adoptAndGo({ cover, eventDate }) }}
            />


            {targets && targets.every((ev) => ev.hasStd) &&
                <div className={`${styles.modalBackdrop} ${styles.modalBackdropIn}`}>
                    <div className={`${styles.modalCard} ${styles.modalCardIn}`} role='dialog' aria-modal='true'>
                        <span className={styles.welcomeTitle}>{t('savethedate.all_taken_title')}</span>
                        <span className={styles.modalText}>{t('savethedate.all_taken_text')}</span>
                        <div className={styles.modalActions}>
                            <Button type='text' onClick={() => { setTargets(null); setPendingDraft(null) }}>
                                {t('savethedate.all_taken_stay')}
                            </Button>
                            <Button
                                className='primarybutton--active'
                                style={{ borderRadius: '99px' }}
                                onClick={() => navigate('/invitations')}
                            >
                                {t('savethedate.all_taken_go')}
                            </Button>
                        </div>
                    </div>
                </div>
            }

            {targets && !targets.every((ev) => ev.hasStd) &&
                <div className={`${styles.modalBackdrop} ${styles.modalBackdropIn}`}>
                    <div className={`${styles.modalCard} ${styles.modalCardIn}`} role='dialog' aria-modal='true'>
                        <span className={styles.welcomeTitle}>{t('savethedate.pick_event_title')}</span>
                        <span className={styles.modalText}>{t('savethedate.pick_event_text')}</span>

                        <div className={`${styles.eventList} scroll-invitation`}>
                            {targets.map((ev) => (
                                <button
                                    key={ev.id}
                                    className={styles.eventRow}
                                    disabled={ev.hasStd}
                                    onClick={() => adoptInto(ev.id, pendingDraft)}
                                >
                                    <span className={styles.eventName}>
                                        {ev.name || ev.label || t('savethedate.untitled')}
                                    </span>
                                    <span className={styles.eventMeta}>
                                        {ev.eventDate ? formatAbsoluteDateEs(ev.eventDate) : t('savethedate.no_date')}
                                        {ev.hasStd ? ` · ${t('savethedate.already_has_std')}` : ''}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className={styles.modalActions}>
                            <Button type='text' onClick={() => { setTargets(null); setPendingDraft(null) }}>
                                {t('savethedate.pick_event_cancel')}
                            </Button>
                        </div>
                    </div>
                </div>
            }

            {adopting &&
                <div className={`${styles.modalBackdrop} ${styles.modalBackdropIn}`}>
                    <div className={`${styles.modalCard} ${styles.modalCardIn}`}>
                        <span className={styles.welcomeTitle}>{t('savethedate.draft_saving')}</span>
                        <span className={styles.modalText}>{t('savethedate.draft_saving_text')}</span>
                    </div>
                </div>
            }
        </>
    )

    /* ── Falta la imagen del link (fondo de video) ── */
    const posterDialog = posterAsk && (
        
            <div className={`${styles.modalBackdrop} ${styles.modalBackdropIn}`} onClick={() => setPosterAsk(false)}>
                <div className={`${styles.modalCard} ${styles.modalCardIn}`} onClick={(e) => e.stopPropagation()} role='dialog' aria-modal='true'>
                    <span className={styles.welcomeTitle}>{t('savethedate.poster_ask_title')}</span>
                    <span className={styles.modalText}>{t('savethedate.poster_ask_text')}</span>
                    <div className={styles.modalActions}>
                        <Button type='text' onClick={() => { setPosterAsk(false); handleSave() }}>
                            {t('savethedate.poster_ask_skip')}
                        </Button>
                        <Button
                            className='primarybutton--active'
                            style={{ borderRadius: '99px' }}
                            onClick={() => { setPosterAsk(false); setSection('background') }}
                        >
                            {t('savethedate.poster_ask_cta')}
                        </Button>
                    </div>
                </div>
            </div>
    )

    /* ── Diálogo de cambios sin guardar (compartido móvil/escritorio) ── */
    const leaveDialog = leaveMounted && (
                <div
                    className={`${styles.modalBackdrop} ${leaveIn ? styles.modalBackdropIn : ''}`}
                    onClick={closeLeave}
                >
                    <div
                        className={`${styles.modalCard} ${leaveIn ? styles.modalCardIn : ''}`}
                        onClick={(e) => e.stopPropagation()}
                        role='dialog'
                        aria-modal='true'
                        aria-label={t('savethedate.unsaved_title')}
                    >
                        <button className={styles.modalClose} onClick={closeLeave} aria-label={t('savethedate.close')}>
                            <X size={16} />
                        </button>

                        <span className={styles.modalTitle}>{t('savethedate.unsaved_title')}</span>
                        <span className={styles.modalText}>{t('savethedate.unsaved_text')}</span>

                        <div className={styles.modalActions}>
                            <Button type='text' danger onClick={goToDashboard}>
                                {t('savethedate.unsaved_discard')}
                            </Button>
                            <Button style={{ borderRadius: '99px' }} onClick={closeLeave}>
                                {t('savethedate.unsaved_stay')}
                            </Button>
                            <Button
                                className='primarybutton--active'
                                style={{ borderRadius: '99px' }}
                                loading={leaving}
                                onClick={saveAndLeave}
                            >
                                {t('savethedate.unsaved_save')}
                            </Button>
                        </div>
                    </div>
                </div>
    )

    /* ═══════════════════════════════════════════════════════════════
       Móvil: la pieza ocupa la pantalla, con dock de herramientas y
       hoja inferior. Los paneles son los mismos que en escritorio.
       ═══════════════════════════════════════════════════════════════ */
    if (isMobile) {
        const sheetTitle = SECTIONS.find((x) => x.key === sheetSection)?.label ?? ''

        return (
            <div className={styles.mobileRoot}>

                {/* Header: su propia superficie, igual que el dock de abajo,
                    para que no se sienta parte de la invitación */}
                <div className={styles.mobileHeader}>
                    <button className={styles.hBtn} onClick={handleBack} aria-label={t('savethedate.back')}>
                        <X size={17} />
                    </button>

                    <div className={styles.hTabs}>
                        <button
                            className={`${styles.hTab} ${activeTab === 'edicion' ? styles.hTabOn : ''}`}
                            onClick={() => setActiveTab('edicion')}
                        >
                            {t('savethedate.tab_edit_short')}
                        </button>
                        {!demo &&
                            <button
                                className={`${styles.hTab} ${activeTab === 'reacciones' ? styles.hTabOn : ''}`}
                                onClick={() => setActiveTab('reacciones')}
                            >
                                {t('savethedate.tab_reactions_short')}
                            </button>
                        }
                    </div>

                    <div className={styles.hRight}>
                        {activeTab === 'edicion' &&
                            <button
                                className={`${styles.hBtn} ${live ? styles.hBtnOn : ''}`}
                                onClick={() => { setLive((v) => !v); setSection(null) }}
                                aria-label={t('savethedate.live')}
                                aria-pressed={live}
                            >
                                <Eye size={17} />
                            </button>
                        }

                        <WhenToSend compact className={styles.hBtn} />

                        <button className={styles.hBtn} onClick={handleCopyLink} aria-label={t('savethedate.copy_link')}>
                            <Link2 size={17} />
                        </button>

                        <span className={styles.saveWrap}>
                            <button
                                className={styles.hSave}
                                onClick={() => { if (demo || dirty) handleSave() }}
                                aria-disabled={!demo && !dirty}
                                style={{ opacity: demo || dirty ? 1 : 0.6 }}
                            >
                                {saving ? '…' : t('savethedate.save')}
                            </button>
                            {dirty && !saving && <span className={styles.saveDot} aria-hidden />}
                        </span>
                    </div>
                </div>

                {/* La invitación, enmarcada */}
                <div ref={stageRef} className={styles.mobileStage}>
                    {live || activeTab !== 'edicion'
                        ? <SaveTheDateHost config={previewConfig} />
                        : (
                            <StdCanvas
                                key={std.id}
                                cover={cover}
                                eventDate={eventDate}
                                selected={section}
                                onSelect={setSection}
                                onTitleInput={setTitleValue}
                                fullBleed
                                liftBottom={contentLift}
                            />
                        )
                    }

                    {/* Respuestas: encima de la pieza, difuminándola */}
                    {activeTab === 'reacciones' &&
                        <div className={`${styles.mobileAnswers} scroll-invitation`}>{reactionsContent}</div>
                    }
                </div>

                {/* Dock de herramientas */}
                {activeTab === 'edicion' && !live &&
                    <div className={styles.dock}>
                        {SECTIONS.map((sec) => (
                            <button
                                key={sec.key}
                                className={`${styles.dockBtn} ${section === sec.key ? styles.dockBtnOn : ''}`}
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
                    bodyClass={styles.editorSheet}
                    onHeightChange={setSheetHeight}
                >
                    {sheetSection && PANELS[sheetSection]}
                </BottomSheet>

                {leaveDialog}
                {posterDialog}
                {demoModals}

                {!demo && <GuestsCRUD
                    rowData={rawData}
                    invitationID={id}
                    setDrawerState={setDrawerState}
                    refreshPage={() => getGuests(id)}
                    drawerState={drawerState}
                    isSideEvent={false}
                />}
            </div>
        )
    }

    return (
        <div className={styles.pageContainer}>

            {/* Barra mínima: volver, evento, pestañas y acciones */}
            <div className={styles.topBar}>
                <div className={styles.topLeft}>
                    {/* El dashboard se abre con el id del evento (mismo patrón que el header) */}
                    <button className={styles.backBtn} onClick={handleBack} aria-label={t('savethedate.back')}>
                        <ArrowLeft size={17} />
                    </button>
                    <span className={styles.crumb}>
                        Save the Date · <strong>{cover?.title?.text?.value || t('savethedate.untitled')}</strong>
                    </span>
                </div>

                <Segmented
                    className={styles.tabs}
                    value={activeTab}
                    onChange={setActiveTab}
                    // 'envio' queda oculto de momento: la vista existe pero
                    // todavía no hay flujo de envío que ofrecer
                    options={demo
                        ? [{ value: 'edicion', label: t('savethedate.tab_edit') }]
                        : [
                            { value: 'edicion', label: t('savethedate.tab_edit') },
                            { value: 'reacciones', label: t('savethedate.tab_reactions') },
                        ]
                    }
                />

                <div className={styles.actionsBar}>
                    <WhenToSend />

                    {activeTab === 'edicion' &&
                        <button
                            className={`${styles.livePill} ${live ? styles.livePillOn : ''}`}
                            onClick={() => setLive((v) => !v)}
                            aria-pressed={live}
                        >
                            <span className={styles.liveDot} />
                            {t('savethedate.live')}
                        </button>
                    }
                    <Button icon={<Link2 size={16} style={{ marginTop: 2 }} />} style={{ borderRadius: '99px' }} onClick={handleCopyLink}>
                        {t('savethedate.copy_link')}
                    </Button>
                    <span className={styles.saveWrap}>
                        <Button
                            className='primarybutton--active'
                            loading={saving}
                            aria-disabled={!demo && !dirty}
                            onClick={() => { if (demo || dirty) handleSave() }}
                            style={{ borderRadius: '99px', opacity: demo || dirty ? 1 : 0.6 }}
                        >
                            {t('savethedate.save')}
                        </Button>
                        {/* Punto rojo mientras haya cambios sin guardar */}
                        {dirty && !saving && <span className={styles.saveDot} aria-hidden />}
                    </span>
                </div>
            </div>

            {activeTab !== 'envio' &&
                <>
                    {activeTab === 'edicion' && editorTools}

                    <div className={styles.stageRow}>
                        {canvasBlock}
                        <div className={`${styles.answersSlot} ${answersIn ? styles.answersSlotIn : ''}`}>
                            {answersMounted && reactionsContent}
                        </div>
                    </div>
                </>
            }

            {activeTab === 'envio' &&
                <div className={styles.tabWrap}>{sendContent}</div>
            }

            {leaveDialog}
            {posterDialog}
            {demoModals}

            {!demo && <GuestsCRUD
                rowData={rawData}
                invitationID={id}
                setDrawerState={setDrawerState}
                refreshPage={() => getGuests(id)}
                drawerState={drawerState}
                isSideEvent={false}
            />}
        </div>
    )
}
