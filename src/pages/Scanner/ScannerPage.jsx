import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { useSearchParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ScannerSetup } from './ScannerSetup'
import { ScannerList } from './ScannerList'
import { CheckInSheet } from './CheckInSheet'
import { ScanOverlay } from './ScanOverlay'
import { beep, buildParties, findParty, firstName, formatEventDate, hhmm, isArrived, norm, tableTitle, unlockAudio } from './scannerUtils'
import styles from './Scanner.module.css'

const BANNED_EMAILS = ['pa.perez98@gmail.com', 'pau@iattend.mx']
const LIST_STATES = ['confirmado', 'asistente']
const THEME_KEY = 'iattend_scanner_theme'
const SOUND_KEY = 'iattend_scanner_sound'
const TABLET_MIN = 820
const BASE_COLS = 'id, name, state, table, companion_id'

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
  const isTablet = useIsTablet()

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
  const invitationRef = useRef(invitationId)
  guestsRef.current = guests
  tablesRef.current = tables
  soundRef.current = sound
  invitationRef.current = invitationId

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
    const { data, error } = await supabase.from('invitations').select('id, name, user_email')
    setEventsLoading(false)
    if (error) { console.error('Error al obtener invitaciones:', error); return }
    setEvents((data ?? []).filter(i => !BANNED_EMAILS.includes(i.user_email)))
  }

  const fetchGuests = async (id) => {
    setLoading(true)
    const run = () => supabase
      .from('guests')
      .select(cols())
      .eq('invitation_id', id)
      .in('state', LIST_STATES)
      .order('name')
    let { data, error } = await run()
    if (error?.code === '42703' && hasArrivedAtRef.current) {
      hasArrivedAtRef.current = false
      ;({ data, error } = await run())
    }
    if (error) console.error('Error al obtener invitados:', error)
    else setGuests(data ?? [])
    setLoading(false)
  }

  const fetchTables = async (id) => {
    const { data, error } = await supabase.from('tables').select('id, number, name').eq('invitation_id', id)
    if (error) { console.error('Error al obtener mesas:', error); return }
    setTables([...(data ?? [])].sort((a, b) => (a.number ?? 0) - (b.number ?? 0)))
  }

  const fetchEventInfo = async (id) => {
    const { data } = await supabase
      .from('invitations')
      .select('name, cover_date:data->cover->date->>value')
      .eq('id', id)
      .maybeSingle()
    if (data?.name) setEventName(data.name)
    setEventMeta(formatEventDate(data?.cover_date))
  }

  // Escribe la llegada (o la quita) en Supabase con actualización optimista
  const writeArrival = async (ids, arrived, at = new Date().toISOString()) => {
    if (!ids.length) return true
    const patch = { state: arrived ? 'asistente' : 'confirmado' }
    if (hasArrivedAtRef.current) patch.arrived_at = arrived ? at : null
    const prev = guestsRef.current
    setGuests(gs => gs.map(g => ids.includes(g.id) ? { ...g, ...patch } : g))
    const { error } = await supabase.from('guests').update(patch).in('id', ids)
    if (error) {
      console.error('Error al registrar llegada:', error)
      setGuests(prev)
      showToast('No se pudo guardar. Revisa tu conexión.')
      return false
    }
    return true
  }

  const restoreSnapshot = async (snapshot) => {
    setGuests(gs => gs.map(g => snapshot.find(s => s.id === g.id) ?? g))
    await Promise.all(snapshot.map(s => {
      const patch = { state: s.state }
      if (hasArrivedAtRef.current) patch.arrived_at = s.arrived_at ?? null
      return supabase.from('guests').update(patch).eq('id', s.id)
    }))
    setToast(null)
  }

  useEffect(() => {
    if (!invitationId) {
      if (!events.length) fetchEvents()
      return
    }
    fetchGuests(invitationId)
    fetchTables(invitationId)
    fetchEventInfo(invitationId)

    // Varios lectores pueden estar registrando a la vez: mantenemos la lista sincronizada
    const channel = supabase
      .channel(`scanner_guests_${invitationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests', filter: `invitation_id=eq.${invitationId}` }, (payload) => {
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
          const next = { id: row.id, name: row.name, state: row.state, table: row.table, companion_id: row.companion_id, arrived_at: row.arrived_at ?? null }
          return exists ? gs.map(g => g.id === row.id ? { ...g, ...next } : g) : [...gs, next]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [invitationId])

  useEffect(() => () => {
    stopScanner()
    clearTimeout(toastTimer.current)
  }, [])

  // ───────────────────────────────────────────────────────
  // Acceso
  // ───────────────────────────────────────────────────────
  const handleLogin = () => {
    if (!selectedEvent) { setPinError('Selecciona tu evento.'); return }
    const expected = String(selectedEvent.id).slice(0, 4).toLowerCase()
    if (pin.trim().toLowerCase() !== expected) {
      setPinError('Clave incorrecta. Son los 4 caracteres que te compartimos.')
      return
    }
    setPinError('')
    setPin('')
    setEventName(selectedEvent.name ?? '')
    setSearchParams({ id: String(selectedEvent.id) })
  }

  const handleLogout = async () => {
    await stopScanner()
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
    const id = String(invitationId)
    const name = eventName || 'Evento'
    const url = `https://www.iattend.site/scanner?id=${id}`
    const text = `Lector de pases · ${name}. Clave de acceso: ${id.slice(0, 4)}`
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

    const raw = decodedText.trim()
    const uuidMatch = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    const guestId = uuidMatch ? uuidMatch[0] : (isNaN(Number(raw)) ? raw : Number(raw))

    const { data: guest, error } = await supabase
      .from('guests')
      .select(`${cols()}, invitation_id`)
      .eq('id', guestId)
      .maybeSingle()

    if (error || !guest || String(guest.invitation_id) !== String(invitationRef.current)) {
      setScanResult({ kind: 'bad' })
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
    const { error: updateErr } = await supabase.from('guests').update(patch).eq('id', guest.id)
    if (updateErr) {
      console.error(updateErr)
      setScanResult({ kind: 'bad', sub: 'No se pudo registrar la llegada. Intenta de nuevo.' })
      pushRecent(guest.name, 'bad')
      return
    }

    const updated = { ...guest, ...patch }
    delete updated.invitation_id
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
      const meta = viaCompanion
        ? `Incluye a ${viaCompanion.name} · ${tableText(p.table)}`
        : `${tableText(p.table)}${p.total > 1 ? ` · ${p.total} personas` : ''}`
      return { party: p, meta }
    })
    return { rows, counts }
  }, [parties, query, tableFilter, filter, tableById])

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
      {!invitationId ? (
        <ScannerSetup
          events={events}
          eventsLoading={eventsLoading}
          selectedEvent={selectedEvent}
          onSelectEvent={(e) => { setSelectedEvent(e); setPinError('') }}
          pin={pin}
          onPin={(v) => { setPin(v); setPinError('') }}
          pinError={pinError}
          onLogin={handleLogin}
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
          tableLabel={tableText(sheetMembers[0].table ?? sheetMembers.find(m => m.table != null)?.table, true)}
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
