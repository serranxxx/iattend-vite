import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { supabase } from '../../../lib/supabase'
import { supabaseAuthHeaders } from '../../../lib/authHeaders'

const API = import.meta.env.VITE_API_URL

/*
  Los mensajes reales del chat de un Pop (los últimos 100, el más reciente
  primero), con la sesión del organizador (iattend--backend
  router/sideEventChat.js → chat-moderacion), al día con el aviso del canal
  side_chat_<id>. Los usan el panel Interacción (moderar), la fila del chat
  en la pieza del editor y "Ver en vivo" (`_chat`).
*/
// Mensajes del chat para moderar (con la sesión del organizador) y su aviso en vivo.
export const useMensajesChat = (eventoId, activo) => {
    const [mensajes, setMensajes] = useState(null)
    const cargar = useCallback(async () => {
        if (!eventoId) return
        try {
            const { data } = await axios.get(`${API}/api/side-events/${eventoId}/chat-moderacion`, { headers: await supabaseAuthHeaders() })
            setMensajes(data.mensajes ?? [])
        } catch {
            setMensajes((prev) => prev ?? [])
        }
    }, [eventoId])
    useEffect(() => {
        if (!activo || !eventoId) return
        cargar()
        const canal = supabase.channel(`side_chat_${eventoId}`)
            .on('broadcast', { event: 'cambio' }, () => cargar())
            .subscribe()
        return () => { supabase.removeChannel(canal) }
    }, [activo, eventoId, cargar])
    return { mensajes, setMensajes, cargar }
}

