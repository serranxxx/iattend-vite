import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Datos compartidos por los estilos Business y Craft de la sección Pops.

const CONFIRMADO = ['confirmado', 'asistente']

/** Invitados y confirmados de cada Pop (side_events_guests), por id. */
export const useConfirmados = (ids) => {
    const [porPop, setPorPop] = useState({})
    const clave = ids.join(',')
    useEffect(() => {
        if (!ids.length) return undefined
        let vivo = true
        supabase
            .from('side_events_guests')
            .select('side_events_id, state')
            .in('side_events_id', ids)
            .then(({ data, error }) => {
                if (!vivo || error || !data) return
                const cuenta = {}
                for (const g of data) {
                    const c = (cuenta[g.side_events_id] ??= { total: 0, si: 0 })
                    c.total += 1
                    if (CONFIRMADO.includes(g.state)) c.si += 1
                }
                setPorPop(cuenta)
            })
        return () => { vivo = false }
    }, [clave])
    return porPop
}

/** Hora del Pop ("HH:mm") desde body.hour (wall-clock "YYYY-MM-DD HH:mm:00"). */
export const horaDePop = (pop) => {
    const h = String(pop?.body?.hour ?? '')
    return /\d{2}:\d{2}/.test(h.slice(11, 16)) ? h.slice(11, 16) : null
}
