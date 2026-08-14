import { supabase } from '../../lib/supabase'

export const fetchSubmittedFeedback = async () => {
    const { data, error } = await supabase
        .from('event_feedback')
        .select('id, rating, comment, submitted_at, invitations(label, name)')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })

    if (error) throw error
    return data ?? []
}
