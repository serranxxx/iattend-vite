import { useEffect, useState } from 'react'
import { traerTodo } from '../analiticaDatos'

/*
  Side events y Eventos Flash para Admin → Eventos (la tabla de Side events /
  Flash y el calendario). Se piden una vez, cuando alguna vista los ocupa
  (`activo`), y se quedan en memoria.

  La fecha sale de `body.hour`, string "wall-clock" (YYYY-MM-DD HH:mm:00): se
  toma el día tal cual, sin zona horaria (ver helpers/assets/eventDateTime.js).
*/

export const fechaDeSide = (side) => {
    const hora = side?.body?.hour
    return typeof hora === 'string' && /^\d{4}-\d{2}-\d{2}/.test(hora) ? hora.slice(0, 10) : null
}

export const useSideEventsAdmin = (activo) => {
    const [estado, setEstado] = useState({ sides: null, invitadosPorSide: new Map(), error: null })

    useEffect(() => {
        if (!activo || estado.sides || estado.error) return
        let cancelado = false
        Promise.all([
            traerTodo('side_events', 'id,name,invitation_id,planner_id,user_id,user_email,credits,body,created_at'),
            traerTodo('side_events_guests', 'id,side_events_id'),
        ])
            .then(([filas, invitados]) => {
                if (cancelado) return
                const conteo = new Map()
                invitados.forEach(g => conteo.set(g.side_events_id, (conteo.get(g.side_events_id) || 0) + 1))
                setEstado({ sides: filas, invitadosPorSide: conteo, error: null })
            })
            .catch(e => {
                console.error('Error al cargar side events:', e)
                if (!cancelado) setEstado(previo => ({ ...previo, error: 'No se pudieron cargar los side events.' }))
            })
        return () => { cancelado = true }
    }, [activo, estado.sides, estado.error])

    return estado
}
