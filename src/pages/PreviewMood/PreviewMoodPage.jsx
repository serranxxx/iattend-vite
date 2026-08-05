import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Grid, Layout, message } from 'antd'
import axios from 'axios'
import { supabase } from '../../lib/supabase'
import { BookUser, Camera, Feather, Gift, HeartHandshake, MapPinned, MessageSquareHeart, ScanHeart, ScrollText, Settings, Shirt } from 'lucide-react'
import { BuildContent } from '../../modules/Invitation/Build/PageSections/BuildContent'
import { ButtonsMenu } from '../../modules/Invitation/Build/PageSections/ButtonsMenu'
import { BuildMenu } from '../../modules/Invitation/Build/PageSections/BuildMenu'
import { PreviewMoodHeader } from './PreviewMoodHeader'
import { PreviewMoodPanel } from './PreviewMoodPanel'
import { PreviewMoodMobile } from './PreviewMoodMobile'
import { LiaPreview } from './LiaPreview'
import { PublishModal } from './PublishModal'
import { AuthModal } from './AuthModal'
import { OnboardingWizard } from './OnboardingWizard'
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
    const { t } = useTranslation()
    const screens = useBreakpoint()
    const isMobile = screens.xs
    const [searchParams, setSearchParams] = useSearchParams()

    const pendingImageResolveRef = useRef(null)
    const menuTimerRef = useRef(null)

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

    const [publishOpen, setPublishOpen] = useState(false)
    const [authOpen, setAuthOpen] = useState(false)
    const [authCtx, setAuthCtx] = useState('save')
    const [saving, setSaving] = useState(false)
    const [onboarding, setOnboarding] = useState(false)
    const [onHide, setOnHide] = useState(() => window.innerWidth <= 750)
    const [device, setDevice] = useState('ios')
    const [coverUpdated] = useState(false)
    const [positionY, setPositionY] = useState('cover')
    const [currentSection, setCurrentSection] = useState(1)
    const [settingsModal, setSettingsModal] = useState(false)
    const [saved, setSaved] = useState(true)

    const hideMenu = useCallback(() => {
        if (menuTimerRef.current) {
            clearTimeout(menuTimerRef.current)
            menuTimerRef.current = null
        }
        setOnHide(true)
    }, [])

    const handleClick = (item) => {
        setCurrentSection(item.value)
        setPositionY(item.type)
    }

    const handleSectionChange = (type) => {
        const item = buttons.find((b) => b.type === type)
        if (!item) return
        setCurrentSection(item.value)
        setPositionY(item.type)
    }

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
                    onSave={openSave}
                    onPublish={openPublish}
                    saving={saving}
                    buttons={buttons}
                    currentSection={currentSection}
                    handleClick={handleClick}
                    menuTimerRef={menuTimerRef}
                    settingsModal={settingsModal}
                    setSettingsModal={setSettingsModal}
                    saved={saved}
                    setSaved={setSaved}
                    onHide={onHide}
                    setOnHide={setOnHide}
                    hideMenu={hideMenu}
                    positionY={positionY}
                    setPositionY={setPositionY}
                    onSectionChange={handleSectionChange}
                    invitationID={searchParams.get('id') || PREVIEW_ID}
                    device={device}
                    setDevice={setDevice}
                    coverUpdated={coverUpdated}
                />

                <OnboardingWizard
                    open={onboarding}
                    onClose={() => setOnboarding(false)}
                    invitation={copy}
                    buttons={buttons}
                    invitationID={searchParams.get('id') || PREVIEW_ID}
                />

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
                    onOpenOnboarding={() => setOnboarding(true)}
                />

                <div className='pm-body'>
                    <div className='pm-phone-col'>
                        <LiaPreview />

                        <div className='buld-interacting-tools-cont' style={{ zIndex: 999, marginLeft:'24px' }}>
                            <ButtonsMenu
                                invitation={copy}
                                setOnHide={setOnHide}
                                menuTimerRef={menuTimerRef}
                                buttons={buttons}
                                currentSection={currentSection}
                                handleClick={handleClick}
                            />
                            <BuildMenu
                                invitationID={searchParams.get('id') || PREVIEW_ID}
                                setSettingsModal={setSettingsModal}
                                settingsModal={settingsModal}
                                setSaved={setSaved}
                                saved={saved}
                                onHide={onHide}
                                setOnHide={setOnHide}
                                hideMenu={hideMenu}
                                buttons={buttons}
                                currentSection={currentSection}
                                setPositionY={setPositionY}
                                positionY={positionY}
                                invitation={copy}
                                setInvitation={updateCopy}
                            />
                        </div>

                        <BuildContent
                            invitationID={PREVIEW_ID}
                            onHide={onHide}
                            setOnHide={setOnHide}
                            setDevice={setDevice}
                            currentDevice={device}
                            coverUpdated={coverUpdated}
                            positionY={positionY}
                            setPositionY={setPositionY}
                            invitation={copy}
                            onSectionChange={handleSectionChange}
                        />

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

            <OnboardingWizard
                open={onboarding}
                onClose={() => setOnboarding(false)}
                invitation={copy}
                buttons={buttons}
                invitationID={searchParams.get('id') || PREVIEW_ID}
            />

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