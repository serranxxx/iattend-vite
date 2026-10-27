import { supabase } from '../../../lib/supabase'

// Por qué no salió un recordatorio, en palabras del organizador. Lee el
// error_detail que el worker guarda por item (respuesta de Meta) y lo agrupa:
//  - 'config':    la plantilla o sus parámetros (problema nuestro, no de sus
//                 invitados): no existe en ese idioma, parámetros que no
//                 cuadran, plantilla pausada…
//  - 'recipient': el número no tiene WhatsApp o Meta no le deja mandar más
//                 mensajes por ahora.
//  - 'other':     cualquier otra cosa (caída de Meta, límite de envío…).
// Códigos: https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes

const CONFIG_CODES = new Set([100, 132000, 132001, 132005, 132007, 132012, 132015, 132016, 132068, 132069])
const RECIPIENT_CODES = new Set([131026, 131049, 131050, 131021, 131045])

const kindOf = (detail) => {
    try {
        const code = Number(JSON.parse(detail)?.code)
        if (CONFIG_CODES.has(code)) return 'config'
        if (RECIPIENT_CODES.has(code)) return 'recipient'
    } catch { /* error_detail sin JSON */ }
    return 'other'
}

// { config: n, recipient: n, other: n } de los items fallidos del lote.
export const fetchFailureKinds = async (batchId) => {
    const counts = { config: 0, recipient: 0, other: 0 }
    const { data, error } = await supabase
        .from('invitation_send_batch_items')
        .select('error_detail')
        .eq('batch_id', batchId)
        .eq('status', 'failed')
    if (error) {
        console.error('Error al leer los fallidos del lote:', error)
        return counts
    }
    ;(data ?? []).forEach((item) => { counts[kindOf(item.error_detail)] += 1 })
    return counts
}

// El motivo principal (el que más se repite) para el texto de la pantalla.
export const mainFailureKind = (counts) => (
    ['config', 'recipient', 'other'].reduce((best, k) => (counts[k] > (counts[best] ?? 0) ? k : best), 'other')
)
