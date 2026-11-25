import { useEffect, useState, useCallback } from 'react'
import { traerTodo, traerTodoEnParalelo } from '../analiticaDatos'

/*
  Side events y Pops para Admin → Eventos (la tabla de Side events /
  Pop y el calendario). Se piden una vez, cuando alguna vista los ocupa
  (`activo`), y se quedan en memoria.

  La fecha sale de `body.hour`, string "wall-clock" (YYYY-MM-DD HH:mm:00): se
  toma el día tal cual, sin zona horaria (ver helpers/assets/eventDateTime.js).
*/

const diaDe = (hora) => (typeof hora === 'string' && /^\d{4}-\d{2}-\d{2}/.test(hora) ? hora.slice(0, 10) : null)

export const fechaDeSide = (side) => diaDe(side?.body?.hour)

// Un Pop puede tener varias fechas (`body.dates`, ver fechasDelEvento en
// helpers/assets/eventDateTime.js): los días, ordenados y sin repetir.
export const fechasDeSide = (side) => {
    const lista = Array.isArray(side?.body?.dates) && side.body.dates.length ? side.body.dates : [side?.body?.hour]
    return [...new Set(lista.map(diaDe).filter(Boolean))].sort()
}

// Lo que comparten la tabla, el calendario y el resumen de la topbar: si es
// Pop, su invitación, si es de prueba y su fecha. Un side event es de prueba
// si su invitación lo es; un Pop, por su dueño (o su planner si es "por
// enviar"). Activo = fecha de hoy en adelante o sin fecha, como las invitaciones.
export const clasificarSide = (side, invitacionPorId, esPrueba, hoy = new Date()) => {
    const pop = !side.invitation_id
    const invitacion = pop ? null : invitacionPorId.get(side.invitation_id) ?? null
    const fechas = fechasDeSide(side)
    const fecha = fechas[0] ?? null
    const ultima = fechas[fechas.length - 1] ?? null
    const corte = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
    return {
        pop,
        invitacion,
        fecha,
        prueba: pop
            ? esPrueba({ user_id: side.user_id ?? side.planner_id, user_email: side.user_email })
            : Boolean(invitacion && esPrueba(invitacion)),
        fechas,
        // Con varias fechas sigue activo hasta la última.
        activo: !ultima || ultima >= corte,
    }
}

// Solo lo que usan la tabla, el calendario y la topbar. NUNCA `body` completo:
// en un Pop trae dibujos (puntos de cada trazo), elementos, formularios,
// patrocinadores…, y con '*' la carga pesaba megas. De `body` solo hacen falta
// la hora y las fechas (`body->hour` / `body->dates`, que PostgREST resuelve en
// la base); se vuelven a armar como `body` para que clasificarSide no cambie.
const COLUMNAS = 'id,name,user_id,user_email,planner_id,invitation_id,credits,created_at'
const DE_BODY = 'hour:body->hour,dates:body->dates'

const traerSidesLigeros = async () => {
    let filas
    try {
        filas = await traerTodo('side_events', `${COLUMNAS},public_code,${DE_BODY}`)
    } catch (e) {
        // Sin la migración de public_code (42703): el link usa el número.
        if (!/public_code/.test(e.message)) throw e
        filas = await traerTodo('side_events', `${COLUMNAS},${DE_BODY}`)
    }
    return filas.map(({ hour, dates, ...resto }) => ({ ...resto, body: { hour, dates } }))
}

export const useSideEventsAdmin = (activo) => {
    const [estado, setEstado] = useState({ sides: null, invitadosPorSide: new Map(), error: null })

    useEffect(() => {
        if (!activo || estado.sides || estado.error) return
        let cancelado = false
        Promise.all([
            traerSidesLigeros(),
            traerTodoEnParalelo('side_events_guests', 'id,side_events_id'),
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

    // Cambia una fila ya cargada (p. ej. los créditos de un Pop) sin volver a
    // traer todos los side events.
    const parchar = useCallback((id, cambios) => setEstado(previo => ({
        ...previo,
        sides: previo.sides?.map(s => (s.id === id ? { ...s, ...cambios } : s)) ?? previo.sides,
    })), [])

    return { ...estado, parchar }
}
