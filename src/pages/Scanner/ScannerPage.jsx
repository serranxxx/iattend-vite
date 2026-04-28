import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../../lib/supabase'
import { Button, Input, Select, Table, Tooltip, message } from 'antd'
import { useSearchParams } from 'react-router-dom'
import { ScanLine, X, CheckCircle2, Clock, UserCheck, XCircle, LogOut, Minus, Check } from 'lucide-react'
import { IoIosCheckmarkCircleOutline, IoIosCloseCircleOutline, IoIosAddCircleOutline } from 'react-icons/io'
import { AiOutlineClockCircle } from 'react-icons/ai'
import './scanner.css'

const BANNED_EMAILS = ['pa.perez98@gmail.com', 'pau@iattend.mx']

export const ScannerPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const savedId = searchParams.get('id')

  // ── screen ─────────────────────────────────────────────
  const [screen, setScreen] = useState(savedId ? 'table' : 'setup')

  // ── setup ──────────────────────────────────────────────
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // ── table ──────────────────────────────────────────────
  const [guests, setGuests] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventName, setEventName] = useState('')
  const [tables, setTables] = useState(null)
  const [searchName, setSearchName] = useState('')
  const [filterTable, setFilterTable] = useState(null)

  // ── scanner ────────────────────────────────────────────
  const [scannerOpen, setScannerOpen] = useState(false)
  const scannerRef = useRef(null)
  const cooldownRef = useRef(false)

  const [messageApi, contextHolder] = message.useMessage()

  // ───────────────────────────────────────────────────────
  // SETUP: fetch events
  // ───────────────────────────────────────────────────────

  const getInvitationsByDate = async () => {
    // 1️⃣ Obtén la sesión actual
    setEventsLoading(true)
    // 2️⃣ Filtra por el user_id del usuario autenticado
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
    setEventsLoading(false)
    if (error) {
      console.error("Error al obtener invitaciones:", error);
    } else {
      setEvents(data.filter(i => !BANNED_EMAILS.includes(i.user_email)))
    }
  };


  // ───────────────────────────────────────────────────────
  // SETUP: validate & login
  // ───────────────────────────────────────────────────────
  const handleLogin = () => {
    if (!selectedEvent) { setLoginError('Selecciona un evento'); return }
    const expected = String(selectedEvent.id).slice(0, 4)
    if (password.trim() !== expected) { setLoginError('Contraseña incorrecta'); return }
    setLoginError('')
    const id = String(selectedEvent.id)
    setEventName(selectedEvent.name ?? '')
    setSearchParams({ id })
    fetchGuests(id)
    getTables()
    setScreen('table')
  }

  // ───────────────────────────────────────────────────────
  // TABLE: fetch guests
  // ───────────────────────────────────────────────────────
  const fetchGuests = async (id) => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('guests')
      .select('id, name, state, table, phone_number, companion_id')
      .eq('invitation_id', id)
      .in('state', ['confirmado', 'asistente'])
      .order('name')
    if (!error) setGuests(data ?? [])
    setIsLoading(false)
  }

  const handleLogout = async () => {
    await stopScanner()
    setSearchParams({})
    setScreen('setup')
    setGuests([])
    setPassword('')
    setSelectedEvent(null)
    setEventName('')
  }

  // ───────────────────────────────────────────────────────
  // SCANNER: continuous mode
  // ───────────────────────────────────────────────────────
  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear() } catch (_) { console.log(_) }
      scannerRef.current = null
    }
  }

  const openScanner = async () => {
    setScannerOpen(true)
    // Wait for DOM to render the viewport
    setTimeout(async () => {
      const qr = new Html5Qrcode('qr-scanner-viewport')
      scannerRef.current = qr
      try {
        await qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          handleScan,
          () => { }
        )
      } catch (err) {
        console.error(err)
        messageApi.error('No se pudo acceder a la cámara')
        setScannerOpen(false)
      }
    }, 100)
  }

  const closeScanner = async () => {
    await stopScanner()
    setScannerOpen(false)
  }

  const handleScan = async (decodedText) => {
    if (cooldownRef.current) return
    cooldownRef.current = true

    const raw = decodedText.trim()
    // Support both numeric ID and UUID in URL
    const uuidMatch = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    const guestId = uuidMatch ? uuidMatch[0] : (isNaN(Number(raw)) ? raw : Number(raw))

    const { data: guest, error: fetchErr } = await supabase
      .from('guests')
      .select('id, name, state')
      .eq('id', guestId)
      .maybeSingle()

    if (fetchErr || !guest) {
      messageApi.error({ content: 'Invitado no encontrado', key: 'scan' })
      setTimeout(() => { cooldownRef.current = false }, 2000)
      return
    }

    const { error: updateErr } = await supabase
      .from('guests')
      .update({ state: 'asistente' })
      .eq('id', guestId)

    if (updateErr) {
      messageApi.error({ content: 'Error al registrar asistencia', key: 'scan' })
    } else {
      messageApi.success({
        content: (
          <span><b>{guest.name}</b> — Asistencia registrada</span>
        ),
        key: 'scan',
        duration: 3,
      })
      setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, state: 'asistente' } : g))
    }

    setTimeout(() => { cooldownRef.current = false }, 2000)
  }

  const getTables = async () => {
    if (savedId) {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('invitation_id', savedId)

      if (error) {
        console.error('Error al obtener mesas:', error)
        return
      }

      // console.log('mesas: ', data)
      console.log('mesas: ', data)
      setTables(data)
    }
  }
  // ───────────────────────────────────────────────────────
  // Filtered guests
  // ───────────────────────────────────────────────────────
  const filteredGuests = useMemo(() => {
    return guests.filter(g => {
      const matchesName = g.name?.toLowerCase().includes(searchName.toLowerCase())
      const matchesTable = filterTable === null || g.table === filterTable
      return matchesName && matchesTable
    })
  }, [guests, searchName, filterTable])

  // ───────────────────────────────────────────────────────
  // Table columns (simplified for mobile)
  // ───────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      flex: 1,
      render: (val) => <span style={{ fontWeight: 500 }}>{val ?? '—'}</span>,
    },
    {
      title: 'Mesa',
      dataIndex: 'table',
      key: 'table',
      width: 60,
      render: (val) =>
        <span style={{ fontWeight: 500 }}>{tables?.find(t => t.id === val)?.number}</span>,
    },
    {
      title: 'Asist',
      dataIndex: 'state',
      key: 'state',
      width: 60,
      render: (val) => (
        val === 'confirmado' ? <Minus size={16} /> : <Check size={16} />
      ),
    },
  ], [guests])

  // ───────────────────────────────────────────────────────
  // On mount: restore session from URL param
  // ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!savedId) {
      getInvitationsByDate()
    }

  }, [])

  useEffect(() => {
    if (savedId) {
      fetchGuests(savedId)
      getTables()
      setScreen('table')
    }
  }, [savedId])


  useEffect(() => () => { stopScanner() }, [])


  // ───────────────────────────────────────────────────────
  // RENDER: SETUP
  // ───────────────────────────────────────────────────────
  if (screen === 'setup') {
    return (
      <div className='scanner_page'>
        {contextHolder}
        <div className='scanner_card'>
          <ScanLine size={36} style={{ color: '#6D3CFA', marginBottom: 4 }} />
          <h1 className='scanner_title'>Control de acceso</h1>
          <p className='scanner_hint' style={{ marginTop: -8 }}>Selecciona tu evento e ingresa la clave</p>

          {/* hidden inputs trick the browser into not autofilling the real fields */}
          <input type='text' style={{ display: 'none' }} autoComplete='username' readOnly />
          <input type='password' style={{ display: 'none' }} autoComplete='current-password' readOnly />

          <div className='scanner_form'>
            <label className='scanner_label'>Evento</label>
            <Select
              placeholder='Selecciona un evento'
              style={{ width: '100%' }}
              loading={eventsLoading}
              value={selectedEvent?.id ?? undefined}
              onChange={(val) => {
                setSelectedEvent(events.find(e => e?.id === val) ?? null)
                setLoginError('')
              }}
              options={events.map(e => ({ value: e?.id, label: e?.name ?? String(e?.name) }))}
              size='large'
            />

            <label className='scanner_label' style={{ marginTop: 8 }}>Clave de acceso</label>
            <Input
              placeholder='4 dígitos'
              size='large'
              maxLength={4}
              value={password}
              autoComplete='new-password'
              onChange={(e) => { setPassword(e.target.value); setLoginError('') }}
              onPressEnter={handleLogin}
              style={{ borderRadius: 12 }}
            />

            {loginError && <p className='scanner_error' style={{ marginTop: 0 }}>{loginError}</p>}

            <Button
              onClick={handleLogin}
              size='large'
              type='primary'
              style={{ borderRadius: 99, marginTop: 4, height: 48, background: '#6D3CFA', border: 'none', fontWeight: 600 }}
              block
            >
              Entrar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ───────────────────────────────────────────────────────
  // RENDER: TABLE
  // ───────────────────────────────────────────────────────
  const confirmed = guests.filter(g => g.state === 'confirmado').length
  const attended = guests.filter(g => g.state === 'asistente').length

  return (
    <div className='scanner_table_page'>
      {contextHolder}

      {/* ── Header ── */}
      <div className='scanner_table_header'>
        <div className='scanner_header'>
          <div>
            <p className='scanner_table_title'>{eventName || 'Evento'}</p>
            <p className='scanner_table_sub'>
              {attended} asistentes · {confirmed} confirmados
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              icon={<ScanLine size={16} />}
              onClick={openScanner}
              style={{ borderRadius: 99, background: '#6D3CFA', color: '#fff', border: 'none', fontWeight: 600 }}
            >
              Escanear
            </Button>
            <Tooltip title='Cerrar sesión'>
              <Button icon={<LogOut size={16} />} onClick={handleLogout} style={{ borderRadius: 99 }} />
            </Tooltip>
          </div>
        </div>

        <div className='scanner_filters'>
          <Input
            placeholder='Buscar por nombre…'
            allowClear
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            style={{ flex: 1, borderRadius: 99,fontSize:'16px' }}
          />
          <Select
            placeholder='Mesa'
            allowClear
            value={filterTable}
            onChange={val => setFilterTable(val ?? null)}
            style={{ width: 150, fontSize:'16px' }}
            options={[...(tables ?? [])].sort((a, b) => a.number - b.number).map(t => ({ value: t.id, label: `Mesa ${t.number}` }))}
          />
        </div>
      </div>

      {/* ── Search & filter ── */}


      {/* ── Guests table ── */}
      <div className='scanner_table_wrap'>
        <Table
          size='small'
          rowKey='id'
          loading={isLoading}
          dataSource={filteredGuests}
          columns={columns}
          pagination={false}
          scroll={{ x: 340 }}
          className='table_container'
        />
      </div>

      {/* ── Scanner overlay ── */}
      {scannerOpen && (
        <div className='scanner_overlay'>
          <div className='scanner_overlay_header'>
            <span className='scanner_overlay_title'>Escaneando pases…</span>
            <Button
              icon={<X size={18} />}
              onClick={closeScanner}
              style={{ borderRadius: 99, background: '#ffffff20', border: '1px solid #ffffff30', color: '#fff' }}
            >
              Cerrar escáner
            </Button>
          </div>

          <div id='qr-scanner-viewport' className='scanner_overlay_viewport' />
        </div>
      )}
    </div>
  )
}
