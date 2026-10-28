import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Ajuste general de la app (tabla app_settings, se prende / apaga en
// Admin → Laboratorio → Elementos → Diseño). Se lee una vez por sesión con la
// anon key; mientras carga o si falla, vale `fallback`.
const cache = new Map()

export const useAppSetting = (key, fallback) => {
    const [value, setValue] = useState(() => (cache.has(key) ? cache.get(key) : fallback))
    useEffect(() => {
        let vivo = true
        if (cache.has(key)) return
        supabase.from('app_settings').select('value').eq('key', key).maybeSingle()
            .then(({ data, error }) => {
                if (error || !data) return
                cache.set(key, data.value)
                if (vivo) setValue(data.value)
            })
        return () => { vivo = false }
    }, [key])
    return value
}
