import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fotosDePortada } from '../../modules/SideEvents/fotosPortada'

// Datos compartidos por los estilos Business y Craft de la sección Pops.

/**
 * Foto de portada de un Pop para su miniatura en las listas (la primera foto
 * de la portada; un video no sirve de miniatura). Sin foto, null: la fila
 * enseña el emoji (o las iniciales en Business).
 */
export const portadaDePop = (pop) => fotosDePortada(pop?.body)[0] ?? null

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
                // Los Pops sin invitados también llevan su cuenta (0 de 0).
                const cuenta = Object.fromEntries(ids.map(id => [id, { total: 0, si: 0 }]))
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

/**
 * Iniciales del Pop: la primera letra de las dos primeras palabras; con una
 * sola palabra y un número, la letra y los dos últimos dígitos
 * ("Kick-off Comercial 2027" → KC, "Navidad 2026" → N26).
 */
export const inicialesDePop = (nombre = '') => {
    const palabras = nombre.split(/\s+/).filter(Boolean)
    const letras = palabras.filter(p => /\p{L}/u.test(p)).map(p => p.match(/\p{L}/u)[0].toUpperCase())
    const numero = palabras.find(p => /^\d+$/.test(p))
    if (letras.length >= 2) return letras.slice(0, 2).join('')
    if (letras.length === 1) return letras[0] + (numero ? numero.slice(-2) : '')
    return numero ? numero.slice(-3) : '·'
}
