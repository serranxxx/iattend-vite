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

// Lo que comparten la tabla, el calendario y el resumen de la topbar: si es
// Flash, su invitación, si es de prueba y su fecha. Un side event es de prueba
// si su invitación lo es; un Flash, por su dueño (o su planner si es "por
// enviar"). Activo = fecha de hoy en adelante o sin fecha, como las invitaciones.
export const clasificarSide = (side, invitacionPorId, esPrueba, hoy = new Date()) => {
    const flash = !side.invitation_id
    const invitacion = flash ? null : invitacionPorId.get(side.invitation_id) ?? null
    const fecha = fechaDeSide(side)
    const corte = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
    return {
        flash,
        invitacion,
        fecha,
        prueba: flash
            ? esPrueba({ user_id: side.user_id ?? side.planner_id, user_email: side.user_email })
            : Boolean(invitacion && esPrueba(invitacion)),
        activo: !fecha || fecha >= corte,
    }
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
