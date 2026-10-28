import axios from 'axios'
import { supabase } from '../../lib/supabase'

// Catálogo del panel lateral del editor (Elementos / Fotos):
// /api/admin/editor-catalog del backend (adminEditorCatalog.js).

const API_URL = import.meta.env.VITE_API_URL
const BASE = `${API_URL}/api/admin/editor-catalog`

const authHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

export const fetchEditorCatalog = async () => axios.get(BASE, { headers: await authHeaders() })

export const createEditorCategory = async (payload) => axios.post(`${BASE}/categories`, payload, { headers: await authHeaders() })
export const updateEditorCategory = async (id, payload) => axios.patch(`${BASE}/categories/${id}`, payload, { headers: await authHeaders() })
export const reorderEditorCategories = async (ids) => axios.post(`${BASE}/categories/reorder`, { ids }, { headers: await authHeaders() })
export const deleteEditorCategory = async (id) => axios.delete(`${BASE}/categories/${id}`, { headers: await authHeaders() })

// `file` + campos del recurso (multipart).
export const uploadEditorAsset = async ({ file, categoryId, name, tags, aspect, defaultW }) => {
    const form = new FormData()
    form.append('file', file)
    form.append('category_id', categoryId)
    if (name) form.append('name', name)
    if (tags) form.append('tags', tags)
    if (aspect) form.append('aspect', String(aspect))
    if (defaultW) form.append('default_w', String(defaultW))
    return axios.post(`${BASE}/assets`, form, { headers: await authHeaders() })
}
export const updateEditorAsset = async (id, payload) => axios.patch(`${BASE}/assets/${id}`, payload, { headers: await authHeaders() })
export const reorderEditorAssets = async (ids) => axios.post(`${BASE}/assets/reorder`, { ids }, { headers: await authHeaders() })
export const fetchEditorAssetUsage = async (id) => axios.get(`${BASE}/assets/${id}/usage`, { headers: await authHeaders() })
export const deleteEditorAsset = async (id) => axios.delete(`${BASE}/assets/${id}`, { headers: await authHeaders() })

// Ajustes generales (app_settings): /api/admin/settings.
export const fetchAppSettings = async () => axios.get(`${API_URL}/api/admin/settings`, { headers: await authHeaders() })
export const updateAppSetting = async (key, value) => axios.patch(`${API_URL}/api/admin/settings/${key}`, { value }, { headers: await authHeaders() })
