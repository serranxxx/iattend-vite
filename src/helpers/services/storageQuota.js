import { message } from 'antd'
import { supabase } from '../../lib/supabase'

// Límite de storage de "Subidos":
// · Invitación (migración iattend--backend 2026-10-28c_storage_por_invitacion.sql):
//   10 MB base, 30 MB comprando espacio extra (100 créditos, POST
//   /api/storage/upgrade). Cuenta fotos, videos y stickers PNG; NO el Photo
//   Wall ni el audio de la canción.
// · Pop (carpeta `flash-<id>`, migraciones 2026-11-01_storage_pops.sql y
//   2026-11-11c_pops_storage_10mb.sql): 10 MB base, 15 y 30 MB a 5 créditos del Pop por MB (POST
//   /api/storage/pop-upgrade). Cuenta todo lo de su carpeta menos el audio.
// El Save the Date temporal (`temp/…`) no tiene límite.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const MB = 1024 * 1024

// Carpeta → id de invitación (o null si no aplica el límite).
export const invitationOfFolder = (folder) => {
    const f = String(folder ?? '')
    if (UUID.test(f)) return f
    if (f.startsWith('inv-') && UUID.test(f.slice(4))) return f.slice(4)
    return null
}

// Carpeta → { tipo: 'invitacion' | 'pop', id } (o null si no aplica el límite).
export const quotaTargetOfFolder = (folder) => {
    const inv = invitationOfFolder(folder)
    if (inv) return { tipo: 'invitacion', id: inv }
    const m = /^flash-(\d+)(\/|$)/.exec(String(folder ?? ''))
    return m ? { tipo: 'pop', id: m[1] } : null
}

// { used (bytes), limitMb }. Acepta el id de una invitación o un destino
// de quotaTargetOfFolder.
export const getStorageQuota = async (target) => {
    if (target?.tipo === 'pop') {
        const [usage, pop] = await Promise.all([
            supabase.rpc('pop_storage_usage', { p_side_event_id: Number(target.id) }),
            supabase.from('side_events').select('storage_limit_mb').eq('id', target.id).maybeSingle(),
        ])
        return {
            used: usage.error ? null : Number(usage.data) || 0,
            limitMb: pop.error ? null : (pop.data?.storage_limit_mb ?? 10),
        }
    }
    const invitationID = target?.tipo === 'invitacion' ? target.id : target
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
    const target = quotaTargetOfFolder(folder)
    if (!target) return true
    try {
        const { used, limitMb } = await getStorageQuota(target)
        if (limitMb == null || used == null || used + bytes <= limitMb * MB) return true
        message.warning(`Llegaste al límite de ${limitMb} MB de tus archivos. Borra alguno o amplía tu espacio en Subidos.`)
        window.dispatchEvent(new CustomEvent('iattend-storage-full', { detail: { invitationID: target.id, used, limitMb } }))
        return false
    } catch (e) {
        console.error('Límite de storage:', e)
        return true
    }
}

// Avisa que cambió lo subido (el medidor se actualiza).
export const storageChanged = () => window.dispatchEvent(new Event('iattend-storage-changed'))
