/*
  Carga de tablas grandes para la analítica.

  PostgREST corta en 1000 filas aunque no se pida límite, y lo hace en silencio:
  sin paginar, los totales salen truncados y parecen correctos. Todas las etapas
  que leen tablas de volumen pasan por aquí.
*/

import { supabase } from '../../lib/supabase'

const PAGINA = 1000

// `orden` es configurable porque no todas las tablas tienen `created_at`:
// `event_photos`, por ejemplo, usa `uploaded_at`. Sin una columna de orden
// estable la paginación puede repetir o saltarse filas.
export const traerTodo = async (tabla, columnas, orden = 'created_at') => {
    const acumulado = []

    for (let desde = 0; ; desde += PAGINA) {
        const { data, error } = await supabase
            .from(tabla)
            .select(columnas)
            .order(orden, { ascending: true })
            .range(desde, desde + PAGINA - 1)

        if (error) throw new Error(error.message)

        acumulado.push(...data)
        if (data.length < PAGINA) break
    }

    return acumulado
}
