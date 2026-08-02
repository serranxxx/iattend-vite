/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useLia } from './LiaContext'

const DashboardRealtimeContext = createContext(null)

const WATCHED_TABLES = [
    'guests',
    'invitation_message_dispatches',
    'whatsapp_incoming_messages',
    'whatsapp_freetext_dispatches',
    'side_events_guests',
    'invitations',
]

export const DashboardRealtimeProvider = ({ children }) => {
    const [searchParams] = useSearchParams()
    const id = searchParams.get('id')
    const listenersRef = useRef({})
    const sideEventIdsRef = useRef(new Set())
    const { notify } = useLia()
    const { t } = useTranslation()

    const subscribe = useCallback((table, cb) => {
        if (!listenersRef.current[table]) listenersRef.current[table] = new Set()
        listenersRef.current[table].add(cb)
        return () => listenersRef.current[table]?.delete(cb)
    }, [])

    // Load side event IDs for this invitation so we can filter side_events_guests
    useEffect(() => {
        if (!id) return
        sideEventIdsRef.current = new Set()
        supabase
            .from('side_events')
            .select('id')
            .eq('invitation_id', id)
            .then(({ data }) => {
                if (data) sideEventIdsRef.current = new Set(data.map(s => String(s.id)))
            })
    }, [id])

    useEffect(() => {
        if (!id) return
        const u1 = subscribe('guests', (payload) => {
            const row = payload.new || payload.old
            if (!row || String(row.invitation_id) !== String(id)) return
            if (row.last_action_by === 'admin' || row.last_action_by === 'system') return
            if (row.state === 'confirmado') {
                notify({ type: 'success', title: t('guests.notification_title'), body: `${row.name} ${t('guests.notification_confirmed_suffix')}` })
            } else if (row.state === 'rechazado') {
                notify({ type: 'error', title: t('guests.notification_title'), body: `${t('guests.notification_rejected_prefix')} ${row.name} ${t('guests.notification_rejected_suffix')}` })
            }
        })
        const u2 = subscribe('side_events_guests', (payload) => {
            const row = payload.new || payload.old
            if (!row || !sideEventIdsRef.current.has(String(row.side_events_id))) return
            if (row.state === 'confirmado') {
                notify({ type: 'success', title: t('guests.notification_title'), body: `${row.name} ${t('guests.notification_confirmed_suffix')}` })
            } else if (row.state === 'rechazado') {
                notify({ type: 'error', title: t('guests.notification_title'), body: `${t('guests.notification_rejected_prefix')} ${row.name} ${t('guests.notification_rejected_suffix')}` })
            }
        })
        const u3 = subscribe('whatsapp_incoming_messages', async (payload) => {
            const row = payload.new || payload.old
            if (!row || row.read || !row.dispatch_id) return
            const { data } = await supabase
                .from('invitation_message_dispatches')
                .select('invitation_id')
                .eq('id', row.dispatch_id)
                .single()
            if (!data || String(data.invitation_id) !== String(id)) return
            notify({ type: 'info', title: row.contact_name || row.from_phone, body: row.message_body?.slice(0, 80) || 'Nuevo mensaje' })
        })
        return () => { u1(); u2(); u3() }
    }, [id, subscribe, notify, t])

    useEffect(() => {
        if (!id) return

        // Use reduce to chain .on() calls properly, preserving the return value
        const channel = WATCHED_TABLES.reduce(
            (ch, table) =>
                ch.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
                    listenersRef.current[table]?.forEach(cb => {
                        try { cb(payload) } catch (e) {
                            console.error(`[DashboardRealtime] callback error on ${table}:`, e)
                        }
                    })
                }),
            supabase.channel(`dashboard_rt_${id}`)
        )

        channel.subscribe((status) => {
            console.log('[DashboardRealtime] status:', status, '| id:', id)
        })

        return () => { supabase.removeChannel(channel) }
    }, [id])

    return (
        <DashboardRealtimeContext.Provider value={{ subscribe }}>
            {children}
        </DashboardRealtimeContext.Provider>
    )
}

export const useDashboardRealtime = () => {
    const ctx = useContext(DashboardRealtimeContext)
    if (!ctx) throw new Error('useDashboardRealtime must be used inside DashboardRealtimeProvider')
    return ctx
}
