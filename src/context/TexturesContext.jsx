/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TexturesContext = createContext(null)

export const TexturesProvider = ({ children }) => {
    const [textures, setTextures] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let active = true

        const fetchTextures = async () => {
            const { data, error } = await supabase
                .from('textures')
                .select('*')
                .eq('is_active', true)
                .order('sort_order')

            if (!active) return
            if (error) {
                console.error('Error fetching textures:', error)
                setTextures([])
            } else {
                setTextures((data ?? []).map(row => ({
                    id: row.id,
                    image: row.image_url,
                    opacity: row.opacity,
                    blend: row.blend,
                    filter: row.filter,
                })))
            }
            setLoading(false)
        }

        fetchTextures()
        return () => { active = false }
    }, [])

    return (
        <TexturesContext.Provider value={{ textures, loading }}>
            {children}
        </TexturesContext.Provider>
    )
}

export const useTextures = () => {
    const ctx = useContext(TexturesContext)
    if (!ctx) throw new Error('useTextures must be used inside TexturesProvider')
    return ctx
}
