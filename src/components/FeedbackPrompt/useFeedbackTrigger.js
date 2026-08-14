import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const MIN_DAYS_SINCE_CREATED = 15
const RETRY_DAYS = 3
const DAY_MS = 24 * 60 * 60 * 1000

// Cache en memoria por invitation_id — evita repetir la consulta de
// invitation_versions/event_feedback en cada remount del header al navegar
// entre /dashboard/build, /dashboard/guests, /dashboard/side, etc.
const sessionChecks = new Map()

const daysSince = (isoDate) => (Date.now() - new Date(isoDate).getTime()) / DAY_MS

const shouldShowForRow = (row) => {
    if (!row) return true
    if (row.status === 'pending') return true
    if (row.status === 'skipped') return !row.skipped_at || daysSince(row.skipped_at) >= RETRY_DAYS
    return false // submitted
}

export const useFeedbackTrigger = (invitationId, createdAt) => {
    const [visible, setVisible] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)

    const evaluate = useCallback(async () => {
        if (!invitationId || !createdAt) return

        const cached = sessionChecks.get(invitationId)
        if (cached) {
            setVisible(cached.shouldShow)
            return
        }

        if (daysSince(createdAt) < MIN_DAYS_SINCE_CREATED) {
            sessionChecks.set(invitationId, { shouldShow: false })
            setVisible(false)
            return
        }

        const [versionsRes, feedbackRes] = await Promise.all([
            supabase.from('invitation_versions').select('id').eq('invitation_id', invitationId).limit(1),
            supabase.from('event_feedback').select('*').eq('invitation_id', invitationId).maybeSingle(),
        ])

        // Falla cerrado: si cualquiera de las dos consultas falla (ej. la
        // tabla event_feedback aún no existe), no mostramos el botón en vez
        // de arriesgar un falso positivo.
        if (versionsRes.error || feedbackRes.error) {
            sessionChecks.set(invitationId, { shouldShow: false })
            setVisible(false)
            return
        }

        const hasVersion = (versionsRes.data?.length ?? 0) > 0
        const shouldShow = hasVersion && shouldShowForRow(feedbackRes.data ?? null)

        sessionChecks.set(invitationId, { shouldShow })
        setVisible(shouldShow)
    }, [invitationId, createdAt])

    useEffect(() => { evaluate() }, [evaluate])

    const openModal = useCallback(() => setModalOpen(true), [])
    const closeModal = useCallback(() => setModalOpen(false), [])

    const submit = useCallback(async (rating, comment) => {
        if (!invitationId) return
        await supabase
            .from('event_feedback')
            .upsert(
                { invitation_id: invitationId, status: 'submitted', rating, comment: comment || null, submitted_at: new Date().toISOString() },
                { onConflict: 'invitation_id' }
            )

        sessionChecks.set(invitationId, { shouldShow: false })
        setVisible(false)
    }, [invitationId])

    return { visible, modalOpen, openModal, closeModal, submit }
}
