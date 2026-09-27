import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookUser, Camera, Feather, Gift, HeartHandshake, MapPinned, MessageSquareHeart, ScanHeart, ScrollText, Settings, Shirt } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export const ONBOARDING_DEMO_ID = '3cb0ab8b-41cb-428d-b383-ff9d5bbae17d'
const LS_KEY = 'invitation-preview'

export const processInvitation = (raw) => ({
    ...raw,
    cover: {
        ...raw.cover,
        image: { ...raw.cover.image, dev: raw.cover.image.prod },
    },
    quote: {
        ...raw.quote,
        image: { ...raw.quote.image, dev: raw.quote.image?.prod },
    },
    dresscode: { ...raw.dresscode, dev: raw.dresscode?.prod },
    gallery: { ...raw.gallery, dev: raw.gallery?.prod },
})

export const useOnboardingDemoData = () => {
    const { t } = useTranslation()

    const [invitation, setInvitation] = useState(() => {
        try {
            const stored = localStorage.getItem(LS_KEY)
            return stored ? JSON.parse(stored) : null
        } catch {
            return null
        }
    })

    useEffect(() => {
        const fetchDemoInvitation = async () => {
            const { data, error } = await supabase
                .from('invitations')
                .select('data')
                .eq('id', ONBOARDING_DEMO_ID)
                .maybeSingle()

            if (error || !data) return

            const processed = processInvitation(data.data)
            localStorage.setItem(LS_KEY, JSON.stringify(processed))
            setInvitation(processed)
        }

        fetchDemoInvitation()
    }, [])

    const size = 16
    const buttons = [
        { icon: <Settings size={size} />,          action: null, name: t('buttons_menu.generals'),     type: 'generals',     value: 1,  position: 0,    index: 0 },
        { icon: <ScanHeart size={size} />,          action: null, name: t('buttons_menu.cover'),        type: 'cover',        value: 2,  position: 0,    index: 0 },
        { icon: <HeartHandshake size={size} />,     action: null, name: t('buttons_menu.greeting'),     type: 'greeting',     value: 3,  position: 950,  index: 1 },
        { icon: <BookUser size={size} />,           action: null, name: t('buttons_menu.family'),       type: 'family',       value: 4,  position: 1375, index: 2 },
        { icon: <Feather size={size} />,            action: null, name: t('buttons_menu.quote'),        type: 'quote',        value: 5,  position: 1750, index: 3 },
        { icon: <ScrollText size={size} />,         action: null, name: t('buttons_menu.itinerary'),    type: 'itinerary',    value: 6,  position: 2100, index: 4 },
        { icon: <Shirt size={size} />,              action: null, name: t('buttons_menu.dresscode'),    type: 'dresscode',    value: 7,  position: 2750, index: 5 },
        { icon: <Gift size={size} />,               action: null, name: t('buttons_menu.gifts'),        type: 'gifts',        value: 8,  position: 3050, index: 6 },
        { icon: <MapPinned size={size} />,          action: null, name: t('buttons_menu.destinations'), type: 'destinations', value: 9,  position: 2750, index: 7 },
        { icon: <MessageSquareHeart size={size} />, action: null, name: t('buttons_menu.notices'),      type: 'notices',      value: 10, position: 3550, index: 8 },
        { icon: <Camera size={size} />,             action: null, name: t('buttons_menu.gallery'),      type: 'gallery',      value: 11, position: 4500, index: 9 },
    ]

    return { invitation, buttons, invitationID: ONBOARDING_DEMO_ID }
}

// Invitación demo por ID, para el slide "Editor de invitación" cuando en
// Admin → Onboarding se eligió otra que no es ONBOARDING_DEMO_ID. Se guarda en
// localStorage por ID para que el wizard la tenga al instante la próxima vez.
export const useDemoInvitation = (id) => {
    const cacheKey = id ? `${LS_KEY}:${id}` : null

    const leerCache = () => {
        if (!cacheKey) return null
        try {
            const stored = localStorage.getItem(cacheKey)
            return stored ? JSON.parse(stored) : null
        } catch {
            return null
        }
    }

    const [estado, setEstado] = useState(() => ({ id, invitation: leerCache(), error: false }))

    useEffect(() => {
        if (!id) return
        let vivo = true
        setEstado({ id, invitation: leerCache(), error: false })

        supabase
            .from('invitations')
            .select('data')
            .eq('id', id)
            .maybeSingle()
            .then(({ data, error }) => {
                if (!vivo) return
                if (error || !data?.data) {
                    setEstado({ id, invitation: null, error: true })
                    return
                }
                const processed = processInvitation(data.data)
                try { localStorage.setItem(cacheKey, JSON.stringify(processed)) } catch { /* sin espacio: no pasa nada */ }
                setEstado({ id, invitation: processed, error: false })
            })

        return () => { vivo = false }
    }, [id])

    // Mientras llega la del ID nuevo no se devuelve la anterior.
    return estado.id === id ? estado : { id, invitation: null, error: false }
}
