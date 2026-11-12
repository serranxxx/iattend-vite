import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { supabaseAuthHeaders } from '../../lib/authHeaders'
import { useDashboardRealtime } from '../../context/DashboardRealtimeContext'

/*
  Buzón de WhatsApp de un Pop: las respuestas de los invitados a su invitación
  (y lo que el organizador les contesta). Lo arma el backend
  (POST /api/whats/conversaciones, controllers/conversacionesPop.js) porque un
  Pop no tiene invitación y la RPC de la boda agrupa por invitación. Se
  vuelve a pedir con cada mensaje que llega (Realtime, si la sesión lo ve) y
  cada 20 s abierto / 60 s cerrado.
*/

const API = `${import.meta.env.VITE_API_URL}/api/whats/conversaciones`
const sinLeer = (convs) => convs.reduce((n, c) => n + c.messages.filter(m => m.direction === 'inbound' && !m.read).length, 0)

export const useBuzonPop = (popId) => {
    const [conversaciones, setConversaciones] = useState([])
    const [abierto, setAbierto] = useState(false)
    // Si el backend no responde, el buzón lo dice (no "Aún no tienes mensajes").
    const [error, setError] = useState(false)
    const pidiendo = useRef(false)
    const { subscribe } = useDashboardRealtime()

    const cargar = useCallback(async () => {
        if (!popId || pidiendo.current) return
        pidiendo.current = true
        try {
            const { data } = await axios.post(API, { sideEventId: popId }, { headers: await supabaseAuthHeaders() })
            if (data?.ok) setConversaciones(data.conversaciones ?? [])
            setError(!data?.ok)
        } catch (err) {
            setError(true)
            console.error('Buzón del Pop:', err?.response?.data || err.message)
        } finally {
            pidiendo.current = false
        }
    }, [popId])

    useEffect(() => { cargar() }, [cargar])

    useEffect(() => {
        if (!popId) return
        const id = setInterval(cargar, abierto ? 20000 : 60000)
        return () => clearInterval(id)
    }, [popId, abierto, cargar])

    useEffect(() => {
        if (!popId) return
        const u1 = subscribe('whatsapp_incoming_messages', () => cargar())
        const u2 = subscribe('whatsapp_freetext_dispatches', () => cargar())
        return () => { u1(); u2() }
    }, [popId, cargar])

    const marcarLeido = useCallback(async (phone) => {
        setConversaciones(prev => prev.map(c => (c.phone === phone
            ? { ...c, messages: c.messages.map(m => ({ ...m, read: true })) }
            : c)))
        try {
            await axios.post(`${API}/leidos`, { sideEventId: popId, phone }, { headers: await supabaseAuthHeaders() })
        } catch (err) {
            console.error('Buzón del Pop (leídos):', err?.response?.data || err.message)
        }
    }, [popId])

    const nombres = useMemo(() => new Map(conversaciones
        .filter(c => c.guest_name)
        .map(c => [String(c.phone).replace(/\D/g, ''), c.guest_name])), [conversaciones])

    return { conversaciones, error, sinLeer: sinLeer(conversaciones), nombres, marcarLeido, abierto, setAbierto, recargar: cargar }
}
