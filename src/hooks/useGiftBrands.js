import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Catálogo de marcas de la mesa de regalos (tabla gift_brands). Reemplaza los
// arrays `banks` y `stores` que vivían hardcodeados en BuildGifts.
//
// Se lee directo con la anon key, igual que `textures`: la policy solo expone
// las marcas activas. El alta y la edición van por /api/admin/gift-brands.
export const useGiftBrands = () => {
    const [brands, setBrands] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let vivo = true

        supabase
            .from('gift_brands')
            .select('id, kind, name, slug, logo_url, background, text_color, sort_order')
            .order('kind', { ascending: true })
            .order('sort_order', { ascending: true })
            .then(({ data, error }) => {
                if (!vivo) return
                if (error) console.error('Error al obtener gift_brands:', error)
                else setBrands(data ?? [])
                setLoading(false)
            })

        return () => { vivo = false }
    }, [])

    return {
        brands,
        loading,
        stores: brands.filter(b => b.kind === 'store'),
        banks: brands.filter(b => b.kind === 'bank'),
    }
}
