export const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const initials = (name) =>
  (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

export const hhmm = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d)) return null
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

export const isArrived = (g) => g?.state === 'asistente'

export const firstName = (name) => (name || '').split(' ')[0]

// Un "pase" = invitado titular + sus acompañantes (guests con companion_id).
// Si el titular no viene en la lista (no confirmado), el acompañante queda como su propio pase.
export const buildParties = (guests) => {
  const byId = new Map(guests.map(g => [g.id, g]))
  const parties = new Map()
  guests.forEach(g => {
    const rootId = g.companion_id != null && byId.has(g.companion_id) ? g.companion_id : g.id
    if (!parties.has(rootId)) parties.set(rootId, [])
    parties.get(rootId).push(g)
  })
  return [...parties.entries()].map(([rootId, members]) => {
    members.sort((a, b) => (a.id === rootId ? -1 : b.id === rootId ? 1 : 0))
    const primary = members[0]
    const table = primary.table ?? members.find(m => m.table != null)?.table ?? null
    const arrived = members.filter(isArrived).length
    const status = arrived === 0 ? 'pending' : arrived === members.length ? 'done' : 'partial'
    return { id: rootId, primary, members, table, arrived, total: members.length, status }
  }).sort((a, b) => (a.primary.name || '').localeCompare(b.primary.name || '', 'es'))
}

export const findParty = (guests, guestId) => {
  const g = guests.find(x => x.id === guestId)
  if (!g) return []
  const rootId = g.companion_id != null && guests.some(x => x.id === g.companion_id) ? g.companion_id : g.id
  const members = guests.filter(x => x.id === rootId || x.companion_id === rootId)
  return members.sort((a, b) => (a.id === rootId ? -1 : b.id === rootId ? 1 : 0))
}

export const formatEventDate = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d)) return ''
  const part = (opts) => d.toLocaleDateString('es-MX', opts).replace(/\./g, '')
  const weekday = part({ weekday: 'short' })
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${d.getDate()} ${part({ month: 'short' })}`
}

let audioCtx = null
const SOUNDS = {
  ok: [[880, 0, 0.11], [1320, 0.11, 0.2]],
  dup: [[620, 0, 0.16], [620, 0.24, 0.16]],
  bad: [[196, 0, 0.4]],
}
export const beep = (kind) => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    audioCtx = audioCtx || new Ctx()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    SOUNDS[kind].forEach(([freq, offset, dur]) => {
      const o = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      const start = audioCtx.currentTime + offset
      o.type = kind === 'bad' ? 'square' : 'sine'
      o.frequency.value = freq
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(kind === 'bad' ? 0.12 : 0.3, start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
      o.connect(g)
      g.connect(audioCtx.destination)
      o.start(start)
      o.stop(start + dur + 0.02)
    })
  } catch { /* sin audio */ }
}

// iOS solo deja sonar WebAudio si el contexto se creó/reanudó dentro de un gesto del usuario
export const unlockAudio = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    audioCtx = audioCtx || new Ctx()
    if (audioCtx.state === 'suspended') audioCtx.resume()
  } catch { /* sin audio */ }
}

// Muchas mesas se llaman igual que su número ("10", "Mesa 10"): en ese caso no repetimos el nombre
export const tableName = (t) => {
  const name = (t?.name || '').trim()
  if (!name || norm(name) === String(t.number) || norm(name) === `mesa ${t.number}`) return ''
  return name
}

export const tableTitle = (t) => {
  const name = tableName(t)
  return `Mesa ${t.number}${name ? ` · ${name}` : ''}`
}
