import { supabase } from '../../lib/supabase'

// Todas las rutas de Lia en el backend piden la sesión de Supabase y validan
// que el usuario pueda gestionar la invitación (dueño, planner o admin).
export const liaHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

// Lee un stream SSE (`data: {...}\n\n`) y llama onEvent con cada evento.
// Un evento puede llegar partido entre dos chunks: se guarda el pedazo
// incompleto hasta que llegue el resto.
export const leerSSE = async (response, onEvent) => {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const partes = buffer.split('\n\n')
        buffer = partes.pop() ?? ''
        for (const parte of partes) {
            const linea = parte.trim()
            if (!linea.startsWith('data: ')) continue
            let evento
            try {
                evento = JSON.parse(linea.slice(6))
            } catch {
                continue
            }
            onEvent(evento)
        }
    }
}
