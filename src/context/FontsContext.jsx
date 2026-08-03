/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const FontsContext = createContext(null)

export const FontsProvider = ({ children }) => {
    const [fonts, setFonts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let active = true

        const fetchFonts = async () => {
            const { data, error } = await supabase
                .from('fonts')
                .select('family')
                .eq('active', true)
                .order('family')

            if (!active) return
            if (error) {
                console.error('Error fetching fonts:', error)
                setFonts([])
            } else {
                setFonts((data ?? []).map(row => row.family))
            }
            setLoading(false)
        }

        fetchFonts()
        return () => { active = false }
    }, [])

    return (
        <FontsContext.Provider value={{ fonts, loading }}>
            {children}
        </FontsContext.Provider>
    )
}

export const useFonts = () => {
    const ctx = useContext(FontsContext)
    if (!ctx) throw new Error('useFonts must be used inside FontsProvider')
    return ctx
}
