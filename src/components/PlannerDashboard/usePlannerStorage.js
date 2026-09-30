import { useEffect, useState } from 'react'

// Preferencias de interfaz del planner (p. ej. mostrar la línea de tiempo),
// en localStorage por usuario. Las notas y la agenda van en Supabase
// (usePlannerNotes.js).
const read = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key)
        return raw == null ? fallback : JSON.parse(raw)
    } catch {
        return fallback
    }
}

export const usePlannerStorage = (userId, name, fallback) => {
    const key = `planner:${userId ?? 'anon'}:${name}`
    const [value, setValue] = useState(() => read(key, fallback))

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value))
        } catch {
            // Sin espacio o modo privado: se queda solo en memoria.
        }
    }, [key, value])

    return [value, setValue]
}
