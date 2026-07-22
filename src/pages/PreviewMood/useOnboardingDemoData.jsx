import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookUser, Camera, Feather, Gift, HeartHandshake, MapPinned, MessageSquareHeart, ScanHeart, ScrollText, Settings, Shirt } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export const ONBOARDING_DEMO_ID = '3cb0ab8b-41cb-428d-b383-ff9d5bbae17d'
const LS_KEY = 'invitation-preview'

const processInvitation = (raw) => ({
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
