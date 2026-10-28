import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { imagesItinerary } from '../../../../helpers/services/menuImages'
import { LAYER_ICONS, SHAPES } from './layerItems'

// Catálogo del panel lateral (tablas editor_categories / editor_assets, se
// editan en Admin → Laboratorio → Elementos). Se lee una vez por sesión con
// la anon key (solo lo visible). Si la base no responde o está vacía, el
// panel usa RESPALDO: lo mismo que había en código antes del catálogo.
//
// Cada recurso queda normalizado: { id, name, tags, url, variant, lucide,
// tintable, w, ar }. `lucide` solo existe en el respaldo (íconos por nombre).

const normaliza = (txt) => (txt ?? '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const RESPALDO = {
    elements: [
        {
            id: 'fb-iconos', slug: 'iconos', name_es: 'Íconos', name_en: 'Icons', kind: 'icon',
            assets: LAYER_ICONS.map((name) => ({ id: `fb-${name}`, name, tags: [], lucide: name, w: 14, ar: 1 })),
        },
        {
            id: 'fb-formas', slug: 'formas', name_es: 'Formas', name_en: 'Shapes', kind: 'shape',
            assets: SHAPES.map((s) => ({ id: `fb-${s.variant}`, name: s.variant, tags: [], variant: s.variant, w: s.w, ar: s.ar })),
        },
        {
            id: 'fb-ilustraciones', slug: 'ilustraciones', name_es: 'Ilustraciones', name_en: 'Illustrations', kind: 'image',
            assets: imagesItinerary.map((im) => ({ id: `fb-${im.name}`, name: im.name, tags: [], url: im.path, w: 26, ar: 1 })),
        },
    ],
    photos: [],
}

let cargado = null

const cargar = async () => {
    const [cats, assets] = await Promise.all([
        supabase.from('editor_categories').select('id, panel, parent_id, slug, name_es, name_en, kind, section_key, new_until, sort_order'),
        supabase.from('editor_assets').select('id, category_id, name, tags, url, variant, tintable, default_w, aspect, sort_order'),
    ])
    if (cats.error || assets.error) throw cats.error ?? assets.error
    const porCat = new Map()
    ;[...(assets.data ?? [])].sort((a, b) => a.sort_order - b.sort_order).forEach((a) => {
        const list = porCat.get(a.category_id) ?? []
        list.push({ id: a.id, name: a.name, tags: a.tags ?? [], url: a.url, variant: a.variant, tintable: a.tintable, w: a.default_w, ar: a.aspect })
        porCat.set(a.category_id, list)
    })
    const arma = (panel) => (cats.data ?? [])
        .filter((c) => c.panel === panel)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((c) => ({ ...c, assets: porCat.get(c.id) ?? [] }))
    const elements = arma('elements').filter((c) => !c.parent_id)
    return {
        elements: elements.length ? elements : RESPALDO.elements,
        photos: arma('photos'),
    }
}

export const useEditorCatalog = () => {
    const [catalog, setCatalog] = useState(null)
    useEffect(() => {
        let vivo = true
        if (!cargado) cargado = cargar().catch((e) => { console.error('Catálogo del editor:', e); cargado = null; return RESPALDO })
        cargado.then((c) => { if (vivo) setCatalog(c) })
        return () => { vivo = false }
    }, [])
    return catalog ?? { ...RESPALDO, loading: true }
}

// ¿El recurso coincide con la búsqueda? (nombre, tags y nombre de su categoría)
export const coincide = (asset, category, q) => {
    if (!q) return true
    const texto = normaliza([asset.name, ...(asset.tags ?? []), category.name_es, category.name_en].join(' '))
    return normaliza(q).split(/\s+/).every((w) => texto.includes(w))
}

export const esNueva = (category) => Boolean(category.new_until && new Date(category.new_until) > new Date())
