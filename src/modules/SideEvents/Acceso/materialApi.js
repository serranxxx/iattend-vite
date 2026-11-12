import axios from 'axios'
import imageCompression from 'browser-image-compression'
import { supabase } from '../../../lib/supabase'
import { supabaseAuthHeaders } from '../../../lib/authHeaders'
import { storageChanged } from '../../../helpers/services/storageQuota'
import { MATERIAL_MAX_BYTES, MATERIAL_TIPOS } from '../acceso'

// Material de un Pop en línea: bucket PRIVADO pop-material (flash-<id>/material/).
// El backend revisa dueño, tipo, tamaño y espacio y firma la subida
// (POST /api/storage/pop-material/subida); el archivo va directo a Storage con
// ese token. Los invitados lo bajan con links firmados (GET …/acceso).
const API = import.meta.env.VITE_API_URL

export class ErrorMaterial extends Error {
    constructor(code, msg) { super(msg); this.code = code }
}

export const subirMaterial = async (archivo, popId) => {
    if (!MATERIAL_TIPOS[archivo.type]) throw new ErrorMaterial('TIPO', 'tipo')
    let file = archivo
    // Las imágenes se comprimen; PDF y PPTX van tal cual.
    if (archivo.type.startsWith('image/')) {
        file = await imageCompression(archivo, { maxSizeMB: 2, maxWidthOrHeight: 2400, useWebWorker: true, fileType: archivo.type })
    }
    if (file.size > MATERIAL_MAX_BYTES) throw new ErrorMaterial('TAMANO', 'tamano')
    try {
        const { data } = await axios.post(`${API}/api/storage/pop-material/subida`, {
            side_event_id: Number(popId), nombre: archivo.name, mime: archivo.type, size: file.size,
        }, { headers: await supabaseAuthHeaders() })
        const { error } = await supabase.storage.from('pop-material').uploadToSignedUrl(data.path, data.token, file, { contentType: archivo.type })
        if (error) throw error
        storageChanged()
        return { path: data.path, mime: archivo.type, size: file.size }
    } catch (err) {
        const code = err.response?.data?.code
        throw new ErrorMaterial(code || 'ERROR', err.response?.data?.message || err.message)
    }
}

export const borrarMaterial = async (path, popId) => {
    if (!path) return
    try {
        await axios.post(`${API}/api/storage/pop-material/borrar`, { side_event_id: Number(popId), path }, { headers: await supabaseAuthHeaders() })
        storageChanged()
    } catch (err) {
        console.error('No se pudo borrar el material', err)
    }
}
