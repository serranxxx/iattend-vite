import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Grid, Layout, message } from 'antd'
import axios from 'axios'
import { supabase } from '../../lib/supabase'
import { BuildContent } from '../../modules/Invitation/Build/PageSections/BuildContent'
import { PreviewMoodHeader } from './PreviewMoodHeader'
import { PreviewMoodPanel } from './PreviewMoodPanel'
import { PreviewMoodMobile } from './PreviewMoodMobile'
import { LiaPreview } from './LiaPreview'
import { PublishModal } from './PublishModal'
import { AuthModal } from './AuthModal'
import { load } from '../../helpers/assets/images'
import './preview-mood.css'

const { useBreakpoint } = Grid

const PREVIEW_ID = '3cb0ab8b-41cb-428d-b383-ff9d5bbae17d'
const LS_KEY = 'invitation-preview'
const API = import.meta.env.VITE_API_URL

const processInvitation = (raw) => ({
    ...raw,
    cover: {
        ...raw.cover,
        image: { ...raw.cover.image, dev: raw.cover.image.prod }
    },
    quote: {
        ...raw.quote,
        image: { ...raw.quote.image, dev: raw.quote.image?.prod }
    },
    dresscode: { ...raw.dresscode, dev: raw.dresscode?.prod },
    gallery:   { ...raw.gallery,   dev: raw.gallery?.prod },
})

const getSession = () => {
    try { return JSON.parse(localStorage.getItem('session')) } catch { return null }
}

export const PreviewMoodPage = () => {
    const screens = useBreakpoint()
    const isMobile = screens.xs
    const [searchParams, setSearchParams] = useSearchParams()
    const [publishOpen, setPublishOpen] = useState(false)
    const [authOpen, setAuthOpen]       = useState(false)
    const [authCtx, setAuthCtx]         = useState('save')
    const [saving, setSaving]           = useState(false)
    const [copy, setCopy] = useState(() => {
        try {
            const stored = localStorage.getItem(LS_KEY)
            return stored ? JSON.parse(stored) : null
        } catch { return null }
    })
    const [onHide, setOnHide] = useState(false)

    useEffect(() => {
        const fetch = async () => {
            const { data, error } = await supabase
                .from('invitations')
                .select('data')
                .eq('id', PREVIEW_ID)
                .maybeSingle()

            if (error || !data) return
            const processed = processInvitation(data.data)
            localStorage.setItem(LS_KEY, JSON.stringify(processed))
            setCopy(processed)
        }

        fetch()
    }, [])

    const updateCopy = (updater) => {
        setCopy(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater
            localStorage.setItem(LS_KEY, JSON.stringify(next))
            return next
        })
    }

    if (!copy) return (
        <div className='pm-loading'>
            <img alt='' src={load} style={{ width: 200 }} />
        </div>
    )

    const isLoggedIn = () => getSession()?.logged === true

    const saveInvitation = async (invitationData = copy) => {
        const existingId = searchParams.get('id')
        setSaving(true)
        try {
            if (existingId) {
                await axios.patch(`${API}/api/invitation/save-preview/${existingId}`, { data: invitationData })
            } else {
                const session = getSession()
                const { data: res } = await axios.post(`${API}/api/invitation/save-preview`, {
                    userId: session?.user?.uid,
                    userEmail: session?.user?.email,
                    data: invitationData,
                })
                setSearchParams({ id: res.id }, { replace: true })
            }
            message.success('Invitación guardada')
        } catch {
            message.error('No se pudo guardar. Intenta de nuevo.')
        } finally {
            setSaving(false)
        }
    }

    const openSave = () => {
        if (!isLoggedIn()) { setAuthCtx('save'); setAuthOpen(true) }
        else saveInvitation()
    }

    const openPublish = () => {
        if (!isLoggedIn()) { setAuthCtx('publish'); setAuthOpen(true) }
        else setPublishOpen(true)
    }

    const handleAuthSuccess = () => {
        setAuthOpen(false)
        if (authCtx === 'publish') setPublishOpen(true)
        else saveInvitation()
    }

    if (isMobile) return (
        <>
            <PreviewMoodMobile
                invitation={copy}
                setInvitation={updateCopy}
                invitationID={PREVIEW_ID}
                onSave={openSave}
                onPublish={openPublish}
                saving={saving}
            />
            <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} invitation={copy} />
            <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={handleAuthSuccess} context={authCtx} />
        </>
    )

    return (
        <>
            <Layout className='pm-layout'>
                <PreviewMoodHeader onSave={openSave} onPublish={openPublish} saving={saving} />
                <div className='pm-body'>
                    <div className='pm-phone-col'>
                        <LiaPreview />
                        <BuildContent
                            invitationID={PREVIEW_ID}
                            onHide={onHide}
                            setOnHide={setOnHide}
                            setDevice={() => {}}
                            currentDevice='ios'
                            coverUpdated={false}
                            positionY='cover'
                            setPositionY={() => {}}
                            invitation={copy}
                        />
                    </div>
                    <div className='pm-panel-col'>
                        <PreviewMoodPanel
                            invitation={copy}
                            setInvitation={updateCopy}
                            invitationID={PREVIEW_ID}
                        />
                    </div>
                </div>
            </Layout>
            <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} invitation={copy} />
            <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={handleAuthSuccess} context={authCtx} />
        </>
    )
}
