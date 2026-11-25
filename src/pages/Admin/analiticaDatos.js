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

// Igual que traerTodo, pero sin encadenar una ida y vuelta por cada 1000
// filas: la primera página sale junto con el conteo (HEAD, sin datos) y las
// demás, todas a la vez. Para tablas que crecen rápido (side_events_guests).
export const traerTodoEnParalelo = async (tabla, columnas, orden = 'created_at') => {
    const pagina = (n) => supabase
        .from(tabla)
        .select(columnas)
        .order(orden, { ascending: true })
        .order('id', { ascending: true })
        .range(n * PAGINA, n * PAGINA + PAGINA - 1)
        .then(({ data, error }) => {
            if (error) throw new Error(error.message)
            return data
        })

    const [conteo, primera] = await Promise.all([
        supabase.from(tabla).select('*', { count: 'exact', head: true }),
        pagina(0),
    ])
    if (conteo.error) throw new Error(conteo.error.message)

    const paginas = Math.ceil((conteo.count ?? 0) / PAGINA)
    const resto = await Promise.all(Array.from({ length: Math.max(0, paginas - 1) }, (_, i) => pagina(i + 1)))
    const resultados = [primera, ...resto]
    // Si llegaron filas entre el conteo y las páginas, la última vino llena:
    // por seguridad se repite con la carga normal.
    if (resultados[resultados.length - 1].length === PAGINA) return traerTodo(tabla, columnas, orden)
    return resultados.flat()
}
