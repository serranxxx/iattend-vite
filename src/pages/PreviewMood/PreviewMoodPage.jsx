import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DatePicker, Grid, Input, Layout, message } from 'antd'
import confetti from 'canvas-confetti'
import axios from 'axios'
import { supabase } from '../../lib/supabase'
import { ChevronDown } from 'lucide-react'
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
        image: { ...raw.cover.image, dev: raw.cover.image.prod },
    },
    quote: {
        ...raw.quote,
        image: { ...raw.quote.image, dev: raw.quote.image?.prod },
    },
    dresscode: { ...raw.dresscode, dev: raw.dresscode?.prod },
    gallery: { ...raw.gallery, dev: raw.gallery?.prod },
})

const getSession = () => {
    try {
        return JSON.parse(localStorage.getItem('session'))
    } catch {
        return null
    }
}

export const PreviewMoodPage = () => {
    const screens = useBreakpoint()
    const isMobile = screens.xs
    const [searchParams, setSearchParams] = useSearchParams()

    const pendingImageResolveRef = useRef(null)

    const [publishOpen, setPublishOpen] = useState(false)
    const [authOpen, setAuthOpen] = useState(false)
    const [authCtx, setAuthCtx] = useState('save')
    const [saving, setSaving] = useState(false)
    const [onboarding, setOnboarding] = useState(() => !searchParams.get('id'))
    const [obName, setObName] = useState('')
    const [obDate, setObDate] = useState('')
    const [onHide, setOnHide] = useState(false)

    const [copy, setCopy] = useState(() => {
        try {
            const stored = localStorage.getItem(LS_KEY)
            return stored ? JSON.parse(stored) : null
        } catch {
            return null
        }
    })

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
        setCopy((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater
            localStorage.setItem(LS_KEY, JSON.stringify(next))
            return next
        })
    }

    const isLoggedIn = () => getSession()?.logged === true

    const saveInvitation = async (invitationData = copy) => {
        const existingId = searchParams.get('id')

        setSaving(true)

        try {
            if (existingId) {
                await axios.patch(`${API}/api/invitation/save-preview/${existingId}`, {
                    data: invitationData,
                })

                message.success('Invitación guardada')
                return existingId
            }

            const session = getSession()

            const invData = {
                ...invitationData,
                generals: {
                    ...invitationData?.generals,
                    event: { label: null, name: null },
                },
            }

            const { data: res } = await axios.post(`${API}/api/invitation/create-from-preview`, {
                user_id: session?.user?.uid,
                user_email: session?.user?.email,
                plan: null,
                data: invData,
            })

            setSearchParams({ id: res.id }, { replace: true })
            message.success('Invitación guardada')

            return res.id
        } catch {
            message.error('No se pudo guardar. Intenta de nuevo.')
            return null
        } finally {
            setSaving(false)
        }
    }

    const openSave = () => {
        if (!isLoggedIn()) {
            setAuthCtx('save')
            setAuthOpen(true)
            return
        }

        saveInvitation()
    }

    const openPublish = async () => {
        if (!isLoggedIn()) {
            setAuthCtx('publish')
            setAuthOpen(true)
            return
        }

        if (!searchParams.get('id')) {
            const newId = await saveInvitation()
            if (!newId) return
        }

        setPublishOpen(true)
    }

    const requestSaveForImage = async () => {
        const existingId = searchParams.get('id')
        if (existingId) return existingId

        if (!isLoggedIn()) {
            return new Promise((resolve) => {
                pendingImageResolveRef.current = resolve
                setAuthCtx('image')
                setAuthOpen(true)
            })
        }

        return saveInvitation()
    }

    const handleAuthSuccess = async () => {
        setAuthOpen(false)

        if (authCtx === 'image') {
            const id = searchParams.get('id') || await saveInvitation()
            if (pendingImageResolveRef.current) {
                pendingImageResolveRef.current(id)
                pendingImageResolveRef.current = null
            }
            return
        }

        if (authCtx === 'publish') {
            if (!searchParams.get('id')) {
                const newId = await saveInvitation()
                if (!newId) return
            }

            setPublishOpen(true)
            return
        }

        saveInvitation()
    }

    const handleOnboardingSubmit = () => {
        if (!obName.trim()) return

        updateCopy((prev) => ({
            ...prev,
            cover: {
                ...prev.cover,
                title: {
                    ...prev.cover.title,
                    text: {
                        ...prev.cover.title.text,
                        value: obName.trim(),
                    },
                },
                date: {
                    ...prev.cover.date,
                    value: obDate
                        ? new Date(obDate).toISOString()
                        : prev.cover.date?.value,
                    active: true,
                },
            },
        }))

        setOnboarding(false)

        confetti({
            particleCount: 140,
            spread: 80,
            origin: { y: 0.55 },
            colors: ['#FF6B6B', '#FFE66D', '#A8E6CF', '#C3B1E1', '#FDCAE1', '#FFB347'],
        })
    }

    const OnboardingOverlay = () => (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 16px',
                background: 'rgba(0,0,0,0.8)',
                backdropFilter:'blur(6px)'
            }}
        >
            <div className='am-modal' style={{ maxWidth: 480, width: '100%' }}>
                <div className='am-header'>
                    <h2
                        style={{
                            margin: 0,
                            fontSize: 28,
                            fontWeight: 800,
                            color: '#EFEADF',
                            fontFamily: 'Denver-Serial',
                            lineHeight: 1.15,
                            textAlign: 'center',
                        }}
                    >
                        Empecemos por ustedes
                    </h2>

                    <p className='am-sub'>
                        Diseña tu portada y descubre todo lo que I attend tiene para tu evento.
                    </p>
                </div>

                <div className='am-body'>
                    <div>
                        <label
                            style={{
                                display: 'block',
                                color: '#EFEADF',
                                fontSize: 14,
                                fontFamily: 'Luxora Grotesk',
                                marginBottom: 6,
                            }}
                        >
                            ¿Cómo se llaman?
                        </label>

                        <Input
                            className='am-input'
                            placeholder='Ale & Santiago'
                            value={obName}
                            onChange={(e) => setObName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleOnboardingSubmit()
                            }}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label
                            style={{
                                display: 'block',
                                color: '#EFEADF',
                                fontSize: 14,
                                fontFamily: 'Luxora Grotesk',
                                marginBottom: 6,
                            }}
                        >
                            ¿Qué día es la boda?{' '}
                            <span
                                style={{
                                    color: 'rgba(239,234,223,0.45)',
                                    fontSize: 12,
                                }}
                            >
                                · opcional
                            </span>
                        </label>

                        <DatePicker
                            className='am-input'
                            value={obDate}
                            onChange={(e) => setObDate(e)}
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>

                    <button
                        className='am-submit-btn'
                        onClick={handleOnboardingSubmit}
                        style={{ marginTop: 8 }}
                    >
                        Ver mi invitación →
                    </button>

                    <p
                        style={{
                            textAlign: 'center',
                            fontSize: 12,
                            color: 'rgba(239,234,223,0.4)',
                            fontFamily: 'Luxora Grotesk',
                            margin: '2px 0 4px',
                        }}
                    >
                        Sin cuenta · sin tarjeta
                    </p>

                    <button
                        onClick={() => setOnboarding(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'rgba(239,234,223,0.35)',
                            fontSize: 12,
                            fontFamily: 'Luxora Grotesk',
                            textDecoration: 'underline',
                            display: 'block',
                            margin: '0 auto',
                            padding: 0,
                        }}
                    >
                        Saltar por ahora
                    </button>
                </div>
            </div>
        </div>
    )

    if (!copy) {
        return (
            <div className='pm-loading'>
                <img alt='' src={load} style={{ width: 200 }} />
            </div>
        )
    }

    if (isMobile) {
        return (
            <>
                <PreviewMoodMobile
                    invitation={copy}
                    setInvitation={updateCopy}
                    savedId={searchParams.get('id')}
                    onRequestSaveForImage={requestSaveForImage}
                    onSave={openSave}
                    onPublish={openPublish}
                    saving={saving}
                />

                {onboarding && <OnboardingOverlay />}

                <PublishModal
                    open={publishOpen}
                    onClose={() => setPublishOpen(false)}
                    invitation={copy}
                    invitationId={searchParams.get('id')}
                />

                <AuthModal
                    open={authOpen}
                    onClose={() => setAuthOpen(false)}
                    onSuccess={handleAuthSuccess}
                    context={authCtx}
                />
            </>
        )
    }

    return (
        <>
            <Layout className='pm-layout'>
                <PreviewMoodHeader
                    onSave={openSave}
                    onPublish={openPublish}
                    saving={saving}
                />

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

                        <div className='pm-scroll-hint'>
                            <span className='pm-scroll-hint-label'>Scroll</span>
                            <ChevronDown size={18} className='pm-scroll-hint-icon' />
                            <ChevronDown size={18} className='pm-scroll-hint-icon pm-scroll-hint-icon--delayed' />
                        </div>
                    </div>

                    <div className='pm-panel-col'>
                        <PreviewMoodPanel
                            invitation={copy}
                            setInvitation={updateCopy}
                            savedId={searchParams.get('id')}
                            onRequestSaveForImage={requestSaveForImage}
                        />
                    </div>
                </div>
            </Layout>

            {onboarding && <OnboardingOverlay />}

            <PublishModal
                open={publishOpen}
                onClose={() => setPublishOpen(false)}
                invitation={copy}
                invitationId={searchParams.get('id')}
            />

            <AuthModal
                open={authOpen}
                onClose={() => setAuthOpen(false)}
                onSuccess={handleAuthSuccess}
                context={authCtx}
            />
        </>
    )
}