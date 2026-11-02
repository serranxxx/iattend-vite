import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ScannerSetup } from './ScannerSetup'
import { ScannerList } from './ScannerList'
import { CheckInSheet } from './CheckInSheet'
import { ScanOverlay } from './ScanOverlay'
import { beep, buildParties, clavePop, findParty, firstName, formatEventDate, hhmm, isArrived, leerQr, norm, normGuest, tableTitle, unlockAudio } from './scannerUtils'
import styles from './Scanner.module.css'

const BANNED_EMAILS = ['pa.perez98@gmail.com', 'pau@iattend.mx']
const LIST_STATES = ['confirmado', 'asistente']
const THEME_KEY = 'iattend_scanner_theme'
const SOUND_KEY = 'iattend_scanner_sound'
const TABLET_MIN = 820
const BASE_COLS = 'id, name, state, table, companion_id'
// Pops: la lista y las llegadas pasan por el backend (iattend--backend
// router/lectorPop.js) con la clave del lector; la anon key ya no toca
// side_events_guests. La clave se recuerda por Pop en este dispositivo.
const API_LECTOR_POP = `${import.meta.env.VITE_API_URL}/api/lector/pop`
const claveGuardadaPop = (id) => `iattend_lector_pop_${id}`
const SONDEO_POP_MS = 5000

const useIsTablet = () => {
  const [isTablet, setIsTablet] = useState(() => window.innerWidth >= TABLET_MIN)
  useEffect(() => {
    const onResize = () => setIsTablet(window.innerWidth >= TABLET_MIN)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isTablet
}

export const ScannerPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const invitationId = searchParams.get('id')
  // Pops (side event sin invitación): ?pop=<side_events.id>. Sus invitados viven en
  // side_events_guests y no tienen mesas; el QR de su pase trae "side:<id>" (ver leerQr).
  const popId = invitationId ? null : searchParams.get('pop') ?? searchParams.get('flash')
  const eventId = invitationId ?? popId
  const esPop = !!popId
  const guestTable = esPop ? 'side_events_guests' : 'guests'
  const parentCol = esPop ? 'side_events_id' : 'invitation_id'
  const isTablet = useIsTablet()
  // Clave del lector de este Pop (localStorage); `versionClave` repinta al guardarla o borrarla.
  const [, setVersionClave] = useState(0)
  const popClave = popId ? localStorage.getItem(claveGuardadaPop(popId)) : null
  const guardarClavePop = (id, clave) => {
    if (clave) localStorage.setItem(claveGuardadaPop(id), clave)
    else localStorage.removeItem(claveGuardadaPop(id))
    setVersionClave(v => v + 1)
  }

  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark')
  const [sound, setSound] = useState(() => localStorage.getItem(SOUND_KEY) !== 'off')

  // ── acceso ─────────────────────────────────────────────
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')

  // ── lista ──────────────────────────────────────────────
  const [guests, setGuests] = useState([])
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(false)
  const [eventName, setEventName] = useState('')
  const [eventMeta, setEventMeta] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [tableFilter, setTableFilter] = useState(null)
  const [sheet, setSheet] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // ── escáner ────────────────────────────────────────────
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [recent, setRecent] = useState([])
  const scannerRef = useRef(null)
  const cooldownRef = useRef(false)
  const toastTimer = useRef(null)
  // `arrived_at` llega con la migración 2026-10-09_guests_arrived_at.sql; mientras no exista, el lector funciona sin horas
  const hasArrivedAtRef = useRef(true)

  // el callback de Html5Qrcode se registra una sola vez: lee el estado vigente por refs
  const guestsRef = useRef(guests)
  const tablesRef = useRef(tables)
  const soundRef = useRef(sound)
  const eventRef = useRef(null)
  guestsRef.current = guests
  tablesRef.current = tables
  soundRef.current = sound
  eventRef.current = { id: eventId, pop: esPop, table: guestTable, parent: parentCol }

  const cols = () => hasArrivedAtRef.current ? `${BASE_COLS}, arrived_at` : BASE_COLS

  const showToast = useCallback((text, undo = null) => {
    clearTimeout(toastTimer.current)
    setToast({ text, undo })
    toastTimer.current = setTimeout(() => setToast(null), 4500)
  }, [])

  // ───────────────────────────────────────────────────────
  // Datos
  // ───────────────────────────────────────────────────────
  const fetchEvents = async () => {
    setEventsLoading(true)
    const [inv, pop] = await Promise.all([
      supabase.from('invitations').select('id, name, user_email'),
      supabase.from('side_events').select('id, name, user_email').is('invitation_id', null),
    ])
    setEventsLoading(false)
    if (inv.error) { console.error('Error al obtener invitaciones:', inv.error); return }
    if (pop.error) console.error('Error al obtener Pops:', pop.error)
    setEvents([
      ...(inv.data ?? []).map(i => ({ ...i, kind: 'invitation', key: `inv-${i.id}` })),
      ...(pop.data ?? []).map(f => ({ ...f, kind: 'flash', key: `flash-${f.id}` })),
    ].filter(e => !BANNED_EMAILS.includes(e.user_email)))
  }

  // Pop: lista, nombre y fecha en una sola llamada al backend. `silencioso` = el sondeo.
  const fetchPop = async (id, clave, silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      const { data } = await axios.get(`${API_LECTOR_POP}/${id}`, { headers: { 'x-clave-lector': clave } })
      setGuests((data.invitados ?? []).map(normGuest))
      if (data.nombre) setEventName(data.nombre)
      setEventMeta(formatEventDate(data.hora))
    } catch (e) {
      if (e?.response?.status === 403) {
        guardarClavePop(id, null)
        setPinError('Clave incorrecta. Son los 4 caracteres que te compartimos.')
      } else if (!silencioso) console.error('Error al obtener invitados:', e)
    }
    if (!silencioso) setLoading(false)
  }

  const guardarLlegadasPop = async (cambios) => {
    try {
      await axios.post(`${API_LECTOR_POP}/${popId}/llegadas`, { cambios }, { headers: { 'x-clave-lector': popClave } })
      return true
    } catch (e) {
      console.error('Error al registrar llegada:', e)
      return false
    }
  }

  const fetchGuests = async (id) => {
    setLoading(true)
    const run = () => supabase
      .from(guestTable)
      .select(cols())
      .eq(parentCol, id)
      .in('state', LIST_STATES)
      .order('name')
    let { data, error } = await run()
    if (error?.code === '42703' && hasArrivedAtRef.current) {
      hasArrivedAtRef.current = false
      ;({ data, error } = await run())
    }
    if (error) console.error('Error al obtener invitados:', error)
    else setGuests((data ?? []).map(normGuest))
    setLoading(false)
  }

  const fetchTables = async (id) => {
    if (esPop) { setTables([]); return }
    const { data, error } = await supabase.from('tables').select('id, number, name').eq('invitation_id', id)
    if (error) { console.error('Error al obtener mesas:', error); return }
    setTables([...(data ?? [])].sort((a, b) => (a.number ?? 0) - (b.number ?? 0)))
  }

  const fetchEventInfo = async (id) => {
    if (esPop) {
      // Solo para la pantalla de la clave (con clave, el nombre llega en fetchPop).
      // RPC side_event_lector: el lector corre sin sesión y la anon key ya no
      // lee la tabla side_events. Sin la RPC todavía (PGRST202), la tabla.
      let { data, error } = await supabase.rpc('side_event_lector', { p_id: Number(id) }).maybeSingle()
      if (error?.code === 'PGRST202') ({ data } = await supabase.from('side_events').select('name, hour:body->>hour').eq('id', id).maybeSingle())
      if (data?.name) setEventName(data.name)
      setEventMeta(formatEventDate(data?.hour))
      return
    }
    const { data } = await supabase
      .from('invitations')
      .select('name, cover_date:data->cover->date->>value')
      .eq('id', id)
      .maybeSingle()
    if (data?.name) setEventName(data.name)
    setEventMeta(formatEventDate(data?.cover_date))
  }

  // Bienvenida en el pase de Apple Wallet de quien llega, si lo agregó a su
  // iPhone (iattend--backend, POST /api/wallet/bienvenida: una sola vez por
  // pase y solo si ya quedó como asistente). Sin esperar ni avisar si falla.
  const avisarLlegada = (ids) => {
    if (!ids.length || !eventId) return
    axios.post(`${import.meta.env.VITE_API_URL}/api/wallet/bienvenida`, {
      kind: esPop ? 'side' : 'invitacion',
      eventoId: eventId,
      guestIds: ids,
    }).catch(() => {})
  }

  // Escribe la llegada (o la quita) en Supabase con actualización optimista
  const writeArrival = async (ids, arrived, at = new Date().toISOString()) => {
    if (!ids.length) return true
    const patch = { state: arrived ? 'asistente' : 'confirmado' }
    if (hasArrivedAtRef.current) patch.arrived_at = arrived ? at : null
    const prev = guestsRef.current
    setGuests(gs => gs.map(g => ids.includes(g.id) ? { ...g, ...patch } : g))
    const ok = esPop
      ? await guardarLlegadasPop(ids.map(id => ({ id, state: patch.state, arrived_at: patch.arrived_at ?? null })))
      : !(await supabase.from(guestTable).update(patch).in('id', ids)).error
    if (!ok) {
      setGuests(prev)
      showToast('No se pudo guardar. Revisa tu conexión.')
      return false
    }
    if (arrived) avisarLlegada(ids)
    return true
  }

  const restoreSnapshot = async (snapshot) => {
    setGuests(gs => gs.map(g => snapshot.find(s => s.id === g.id) ?? g))
    if (esPop) {
      await guardarLlegadasPop(snapshot.map(s => ({ id: s.id, state: s.state, arrived_at: s.arrived_at ?? null })))
      setToast(null)
      return
    }
    await Promise.all(snapshot.map(s => {
      const patch = { state: s.state }
      if (hasArrivedAtRef.current) patch.arrived_at = s.arrived_at ?? null
      return supabase.from(guestTable).update(patch).eq('id', s.id)
    }))
    setToast(null)
  }

  useEffect(() => {
    if (!eventId) {
      if (!events.length) fetchEvents()
      return
    }
    if (esPop) {
      // Sin clave: la pantalla de la clave (con el nombre del Pop).
      if (!popClave) { fetchEventInfo(eventId); return }
      fetchPop(eventId, popClave)
      setTables([])
      // Sin tiempo real (la anon key ya no lee la tabla): se vuelve a pedir
      // cada 5 s y al regresar a la pestaña, por si otro lector registró a alguien.
      const sondeo = setInterval(() => { if (!document.hidden) fetchPop(eventId, popClave, true) }, SONDEO_POP_MS)
      const alVolver = () => { if (!document.hidden) fetchPop(eventId, popClave, true) }
      document.addEventListener('visibilitychange', alVolver)
      return () => { clearInterval(sondeo); document.removeEventListener('visibilitychange', alVolver) }
    }
    fetchGuests(eventId)
    fetchTables(eventId)
    fetchEventInfo(eventId)

    // Varios lectores pueden estar registrando a la vez: mantenemos la lista sincronizada
    const channel = supabase
      .channel(esPop ? `scanner_pop_${eventId}` : `scanner_guests_${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: guestTable, filter: `${parentCol}=eq.${eventId}` }, (payload) => {
        const row = payload.new
        if (payload.eventType === 'DELETE') {
          setGuests(gs => gs.filter(g => g.id !== payload.old?.id))
          return
        }
        if (!row?.id) return
        setGuests(gs => {
          const inList = LIST_STATES.includes(row.state)
          const exists = gs.some(g => g.id === row.id)
          if (!inList) return exists ? gs.filter(g => g.id !== row.id) : gs
          const next = normGuest({ id: row.id, name: row.name, state: row.state, table: row.table, companion_id: row.companion_id, arrived_at: row.arrived_at ?? null })
          return exists ? gs.map(g => g.id === row.id ? { ...g, ...next } : g) : [...gs, next]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [invitationId, popId, popClave])

  useEffect(() => () => {
    stopScanner()
    clearTimeout(toastTimer.current)
  }, [])

  // ───────────────────────────────────────────────────────
  // Acceso
  // ───────────────────────────────────────────────────────
  const handleLogin = () => {
    if (!selectedEvent) { setPinError('Selecciona tu evento.'); return }
    const pop = selectedEvent.kind === 'flash'
    const expected = pop ? clavePop(selectedEvent.id) : String(selectedEvent.id).slice(0, 4).toLowerCase()
    if (pin.trim().toLowerCase() !== expected) {
      setPinError('Clave incorrecta. Son los 4 caracteres que te compartimos.')
      return
    }
    setPinError('')
    setPin('')
    setEventName(selectedEvent.name ?? '')
    if (pop) guardarClavePop(selectedEvent.id, pin.trim().toLowerCase())
    setSearchParams(pop ? { pop: String(selectedEvent.id) } : { id: String(selectedEvent.id) })
  }

  // Link directo /scanner?pop=<id> sin clave guardada: se pide aquí.
  const handlePopLogin = () => {
    if (pin.trim().toLowerCase() !== clavePop(popId)) {
      setPinError('Clave incorrecta. Son los 4 caracteres que te compartimos.')
      return
    }
    setPinError('')
    setPin('')
    guardarClavePop(popId, pin.trim().toLowerCase())
  }

  const handleLogout = async () => {
    await stopScanner()
    if (popId) guardarClavePop(popId, null)
    setScannerOpen(false)
    setScanResult(null)
    setSheet(null)
    setSearchParams({})
    setGuests([])
    setTables([])
    setSelectedEvent(null)
    setEventName('')
    setEventMeta('')
    setQuery('')
    setTableFilter(null)
    setRecent([])
  }

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  const toggleSound = () => setSound(s => !s)

  useEffect(() => { localStorage.setItem(THEME_KEY, theme) }, [theme])
  useEffect(() => { localStorage.setItem(SOUND_KEY, sound ? 'on' : 'off') }, [sound])

  const handleShare = async () => {
    const id = String(eventId)
    const name = eventName || 'Evento'
    const url = `https://www.iattend.site/scanner?${esPop ? 'pop' : 'id'}=${id}`
    const text = `Lector de pases · ${name}. Clave de acceso: ${esPop ? clavePop(id) : id.slice(0, 4)}`
    try {
      if (navigator.share) {
        await navigator.share({ title: `Lector de pases · ${name}`, text, url })
        return
      }
    } catch (e) {
      if (e?.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      showToast('Link del lector copiado')
    } catch {
      showToast('No se pudo copiar el link')
    }
  }

  // ───────────────────────────────────────────────────────
  // Escáner
  // ───────────────────────────────────────────────────────
  async function stopScanner() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear() } catch (e) { console.log(e) }
      scannerRef.current = null
    }
  }

  const openScanner = () => {
    unlockAudio()
    cooldownRef.current = false
    setScanResult(null)
    setScannerOpen(true)
    // esperamos a que el overlay monte #qr-scanner-viewport
    setTimeout(async () => {
      const qr = new Html5Qrcode('qr-scanner-viewport')
      scannerRef.current = qr
      try {
        await qr.start({ facingMode: { exact: 'environment' } }, { fps: 15 }, handleScan, () => { })
      } catch {
        // algunos dispositivos no aceptan el constraint exacto
        try {
          await qr.start({ facingMode: 'environment' }, { fps: 15 }, handleScan, () => { })
        } catch (err) {
          console.error(err)
          scannerRef.current = null
          setScannerOpen(false)
          showToast('No se pudo acceder a la cámara')
        }
      }
    }, 300)
  }

  const closeScanner = async () => {
    await stopScanner()
    setScannerOpen(false)
    setScanResult(null)
    cooldownRef.current = false
  }

  const pushRecent = (name, kind) => {
    setRecent(r => [{ key: Date.now() + Math.random(), name, kind, at: hhmm(new Date().toISOString()) }, ...r].slice(0, 5))
    if (soundRef.current) beep(kind)
  }

  const handleScan = async (decodedText) => {
    if (cooldownRef.current) return
    cooldownRef.current = true

    const ev = eventRef.current
    const qr = leerQr(decodedText)
    // Un Pop solo acepta su propio QR ("side:<id>") o el código del invitado; un número suelto es el
    // id de un invitado de boda y podría coincidir con otro de side_events_guests.
    // Una invitación rechaza los pases de side events por la misma razón.
    const lookup = ev.pop
      ? (qr.kind === 'side' ? ['id', qr.id] : typeof qr.id === 'string' && qr.id ? ['password', qr.id] : null)
      : (qr.kind === 'guest' ? ['id', qr.id] : null)

    const { data: found, error } = lookup
      ? await supabase
        .from(ev.table)
        .select(`${cols()}, ${ev.parent}`)
        .eq(lookup[0], lookup[1])
        .eq(ev.parent, ev.id)
        .maybeSingle()
      : { data: null, error: null }
    const guest = found && normGuest(found)

    if (error || !guest || String(guest[ev.parent]) !== String(ev.id)) {
      setScanResult({ kind: 'bad', ...(qr.kind === 'side' && !ev.pop ? { sub: 'Este pase es de otro evento.' } : {}) })
      pushRecent('QR desconocido', 'bad')
      return
    }

    // los acompañantes a veces no tienen mesa propia: usamos la del titular
    const tableOf = (list) => {
      const id = guest.table ?? findParty(list, guest.id).find(m => m.table != null)?.table
      return tablesRef.current.find(t => t.id === id) ?? null
    }
    const table = tableOf(guestsRef.current)

    if (isArrived(guest)) {
      setScanResult({ kind: 'dup', guestId: guest.id, guestSnapshot: guest, at: guest.arrived_at ?? null, table })
      pushRecent(guest.name, 'dup')
      return
    }

    const at = new Date().toISOString()
    const patch = { state: 'asistente' }
    if (hasArrivedAtRef.current) patch.arrived_at = at
    const { error: updateErr } = await supabase.from(ev.table).update(patch).eq('id', guest.id)
    if (updateErr) {
      console.error(updateErr)
      setScanResult({ kind: 'bad', sub: 'No se pudo registrar la llegada. Intenta de nuevo.' })
      pushRecent(guest.name, 'bad')
      return
    }

    avisarLlegada([guest.id])

    const updated = { ...guest, ...patch }
    delete updated[ev.parent]
    const nextGuests = guestsRef.current.some(g => g.id === guest.id)
      ? guestsRef.current.map(g => g.id === guest.id ? { ...g, ...patch } : g)
      : [...guestsRef.current, updated]
    setGuests(nextGuests)

    // acompañantes que aún no llegan: marcados por defecto, se confirman al cerrar el resultado
    const selected = {}
    findParty(nextGuests, guest.id).forEach(m => { if (m.id !== guest.id && !isArrived(m)) selected[m.id] = true })

    setScanResult({ kind: 'ok', guestId: guest.id, guestSnapshot: updated, at, table: tableOf(nextGuests), selected })
    pushRecent(guest.name, 'ok')
  }

  const finishResult = async (thenClose) => {
    const r = scanResult
    if (r?.kind === 'ok') {
      writeArrival(guests.filter(g => r.selected[g.id] && !isArrived(g)).map(g => g.id), true)
    }
    if (thenClose) {
      await closeScanner()
    } else {
      setScanResult(null)
      cooldownRef.current = false
    }
  }

  // ───────────────────────────────────────────────────────
  // Registro manual
  // ───────────────────────────────────────────────────────
  const openSheet = (party) => {
    const selected = {}
    party.members.forEach(m => { selected[m.id] = true })
    setSheet({ partyId: party.id, selected })
  }

  const saveSheet = async () => {
    const members = findParty(guests, sheet.partyId)
    const add = members.filter(m => sheet.selected[m.id] && !isArrived(m))
    const rem = members.filter(m => !sheet.selected[m.id] && isArrived(m))
    if (!add.length && !rem.length) return

    const snapshot = [...add, ...rem].map(m => ({ ...m }))
    setSaving(true)
    const okAdd = await writeArrival(add.map(m => m.id), true)
    const okRem = await writeArrival(rem.map(m => m.id), false)
    setSaving(false)
    if (!okAdd || !okRem) return

    setSheet(null)
    const text = add.length
      ? (add.length > 1 ? `${firstName(members[0].name)} +${add.length - 1} registrados` : `${firstName(add[0].name)} registrado`)
      : `Registro quitado (${rem.length})`
    showToast(text, () => restoreSnapshot(snapshot))
  }

  // ───────────────────────────────────────────────────────
  // Derivados
  // ───────────────────────────────────────────────────────
  const tableById = useMemo(() => new Map(tables.map(t => [t.id, t])), [tables])
  const personasText = (n) => `${n} ${n === 1 ? 'persona' : 'personas'}`
  const tableText = (id, withName = false) => {
    const t = tableById.get(id)
    if (!t) return 'Sin mesa'
    return withName ? tableTitle(t) : `Mesa ${t.number}`
  }

  const parties = useMemo(() => buildParties(guests), [guests])
  const total = guests.length
  const arrived = guests.filter(isArrived).length

  const { rows, counts } = useMemo(() => {
    const q = norm(query.trim())
    const base = parties.filter(p =>
      (!q || p.members.some(m => norm(m.name).includes(q))) &&
      (!tableFilter || p.table === tableFilter)
    )
    const matches = (p, k) => k === 'all' || (k === 'pending' ? p.status !== 'done' : p.status === 'done')
    const counts = { pending: 0, arrived: 0, all: base.length }
    base.forEach(p => { if (p.status === 'done') counts.arrived++; else counts.pending++ })
    const rows = base.filter(p => matches(p, filter)).map(p => {
      const viaCompanion = q && !norm(p.primary.name).includes(q) ? p.members.find(m => norm(m.name).includes(q)) : null
      // un Pop no tiene mesas: solo cuántas personas entran con el pase
      const meta = esPop
        ? (viaCompanion ? `Incluye a ${viaCompanion.name} · ` : '') + personasText(p.total)
        : viaCompanion
          ? `Incluye a ${viaCompanion.name} · ${tableText(p.table)}`
          : `${tableText(p.table)}${p.total > 1 ? ` · ${p.total} personas` : ''}`
      return { party: p, meta }
    })
    return { rows, counts }
  }, [parties, query, tableFilter, filter, tableById, esPop])

  const tableStats = useMemo(() => {
    const stats = new Map(tables.map(t => [t.id, { table: t, a: 0, n: 0 }]))
    parties.forEach(p => {
      const s = stats.get(p.table)
      if (!s) return
      s.n += p.total
      s.a += p.arrived
    })
    return [...stats.values()].filter(s => s.n > 0)
  }, [tables, parties])

  const currentTable = tableFilter && tableById.get(tableFilter)
  const tableLabel = currentTable
    ? tableTitle(currentTable)
    : `${rows.length} ${rows.length === 1 ? 'pase' : 'pases'}`

  const sheetMembers = sheet ? findParty(guests, sheet.partyId) : []

  const resultProps = scanResult && (() => {
    const guest = guests.find(g => g.id === scanResult.guestId) ?? scanResult.guestSnapshot ?? null
    const members = scanResult.kind === 'ok' && guest ? findParty(guests, guest.id) : []
    return {
      kind: scanResult.kind,
      guest,
      members,
      at: scanResult.at,
      sub: scanResult.sub,
      table: scanResult.table,
      selected: scanResult.selected ?? {},
      onToggle: (id) => setScanResult(r => ({ ...r, selected: { ...r.selected, [id]: !r.selected[id] } })),
      onPrimary: () => finishResult(false),
      onSecondary: () => scanResult.kind === 'dup' ? finishResult(false) : finishResult(true),
    }
  })()

  // ───────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────
  return (
    <div className={styles.root} data-theme={theme}>
      {!eventId || (esPop && !popClave) ? (
        <ScannerSetup
          fixedEvent={esPop ? { name: eventName || 'Pop' } : null}
          events={events}
          eventsLoading={eventsLoading}
          selectedEvent={selectedEvent}
          onSelectEvent={(e) => { setSelectedEvent(e); setPinError('') }}
          pin={pin}
          onPin={(v) => { setPin(v); setPinError('') }}
          pinError={pinError}
          onLogin={esPop ? handlePopLogin : handleLogin}
        />
      ) : (
        <ScannerList
          isTablet={isTablet}
          theme={theme}
          eventName={eventName}
          eventMeta={eventMeta}
          total={total}
          arrived={arrived}
          rows={rows}
          counts={counts}
          tableStats={tableStats}
          tableFilter={tableFilter}
          onTableFilter={setTableFilter}
          query={query}
          onQuery={setQuery}
          filter={filter}
          onFilter={setFilter}
          loading={loading}
          tableLabel={tableLabel}
          onOpenParty={openSheet}
          onScan={openScanner}
          onShare={handleShare}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
        />
      )}

      {sheet && sheetMembers.length > 0 && (
        <CheckInSheet
          isTablet={isTablet}
          members={sheetMembers}
          tableLabel={esPop ? personasText(sheetMembers.length) : tableText(sheetMembers[0].table ?? sheetMembers.find(m => m.table != null)?.table, true)}
          selected={sheet.selected}
          onToggle={(id) => setSheet(s => ({ ...s, selected: { ...s.selected, [id]: !s.selected[id] } }))}
          onSave={saveSheet}
          onClose={() => setSheet(null)}
          saving={saving}
        />
      )}

      {scannerOpen && (
        <ScanOverlay
          arrived={arrived}
          total={total}
          sound={sound}
          onToggleSound={toggleSound}
          onClose={closeScanner}
          recent={recent}
          result={resultProps}
        />
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.undo ? '' : styles.toastNoAction}`} role='status'>
          <Check size={18} strokeWidth={2.5} />
          <span className={styles.toastText}>{toast.text}</span>
          {toast.undo && (
            <button type='button' className={styles.toastUndo} onClick={toast.undo}>Deshacer</button>
          )}
        </div>
      )}
    </div>
  )
}
