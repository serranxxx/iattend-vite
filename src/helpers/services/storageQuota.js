import { message } from 'antd'
import { supabase } from '../../lib/supabase'

// Límite de storage de "Subidos" por invitación (migración
// iattend--backend 2026-10-28c_storage_por_invitacion.sql): 10 MB base,
// 30 MB comprando espacio extra (100 créditos, POST /api/storage/upgrade).
// Cuenta fotos, videos y stickers PNG de la invitación; NO el Photo Wall ni
// el audio de la canción. Solo aplica a carpetas de invitación (uuid): los
// Eventos Flash (`flash-…`) y el Save the Date temporal (`temp/…`) no tienen
// límite aquí.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const MB = 1024 * 1024

// Carpeta → id de invitación (o null si no aplica el límite).
export const invitationOfFolder = (folder) => {
    const f = String(folder ?? '')
    if (UUID.test(f)) return f
    if (f.startsWith('inv-') && UUID.test(f.slice(4))) return f.slice(4)
    return null
}

// { used (bytes), limitMb }
export const getStorageQuota = async (invitationID) => {
    const [usage, inv] = await Promise.all([
        supabase.rpc('invitation_storage_usage', { p_invitation_id: invitationID }),
        supabase.from('invitations').select('storage_limit_mb').eq('id', invitationID).maybeSingle(),
    ])
    return {
        // Sin la función (migración sin correr): null, el panel usa su listado.
        used: usage.error ? null : Number(usage.data) || 0,
        // Sin la columna (migración sin correr) no se bloquea nada.
        limitMb: inv.error ? null : (inv.data?.storage_limit_mb ?? 10),
    }
}

// ¿Cabe un archivo de `bytes`? Si no, avisa y dispara `iattend-storage-full`
// (el panel Subidos ofrece ampliar). Si algo falla al medir, deja subir.
export const ensureQuota = async (folder, bytes) => {
    const id = invitationOfFolder(folder)
    if (!id) return true
    try {
        const { used, limitMb } = await getStorageQuota(id)
        if (limitMb == null || used == null || used + bytes <= limitMb * MB) return true
        message.warning(`Llegaste al límite de ${limitMb} MB de tus archivos. Borra alguno o amplía tu espacio en Subidos.`)
        window.dispatchEvent(new CustomEvent('iattend-storage-full', { detail: { invitationID: id, used, limitMb } }))
        return false
    } catch (e) {
        console.error('Límite de storage:', e)
        return true
    }
}

// Avisa que cambió lo subido (el medidor se actualiza).
export const storageChanged = () => window.dispatchEvent(new Event('iattend-storage-changed'))
