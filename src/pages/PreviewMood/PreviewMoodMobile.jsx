import { useState, useEffect } from 'react'
import { Button, Drawer } from 'antd'
import { ArrowRight, ArrowUp, Bookmark, ChevronLeft, ChevronRight, Eye, Pause, Play, X } from 'lucide-react'
import { ButtonsMenu } from '../../modules/Invitation/Build/PageSections/ButtonsMenu'
import { BuildMenu } from '../../modules/Invitation/Build/PageSections/BuildMenu'
import { BuildContent } from '../../modules/Invitation/Build/PageSections/BuildContent'
import { FEATURE_SLIDES } from './featureSlides'

export const PreviewMoodMobile = ({
    invitation, setInvitation, onSave, onPublish, saving,
    buttons, currentSection, handleClick, menuTimerRef,
    settingsModal, setSettingsModal, saved, setSaved,
    onHide, setOnHide, hideMenu,
    positionY, setPositionY, onSectionChange,
    invitationID, device, setDevice, coverUpdated,
}) => {
    const sessionName = (() => {
        try { return JSON.parse(localStorage.getItem('session'))?.user?.name?.split(' ')[0] ?? null }
        catch { return null }
    })()

    const [showUpsell, setShowUpsell]       = useState(false)
    const [activeFeature, setActiveFeature] = useState(0)
    const [featurePaused, setFeaturePaused] = useState(false)
    const [featureTimerKey, setFeatureTimerKey] = useState(0)

    useEffect(() => {
        if (featurePaused) return
        const timer = setInterval(() => {
            setActiveFeature(i => (i + 1) % FEATURE_SLIDES.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [featurePaused, featureTimerKey])

    const goToFeature = (indexFn) => {
        setActiveFeature(indexFn)
        setFeatureTimerKey(k => k + 1)
    }

    return (
        <div className='pm-mobile-root'>

            {/* Mini header */}
            <div className='pm-mobile-header'>
                <div className='pm-header-chip'>
                    <Eye size={12} strokeWidth={1.8} />
                    <span>{sessionName ?? 'sin cuenta'}</span>
                </div>
                <Button
                    icon={<Bookmark size={14} />}
                    onClick={onSave}
                    loading={saving}
                    className='pm-header-save-btn'
                >
                    Guardar
                </Button>
            </div>

            {/* Build tools + invitation — same structure as BuildPage */}
            <div className='build-componentes-container' style={{ flex: 1, margin: 0, position: 'relative', justifyContent: 'flex-start' }}>
                <div className='buld-interacting-tools-cont' style={{ zIndex: 999 }}>
                    <ButtonsMenu
                        invitation={invitation}
                        setOnHide={setOnHide}
                        menuTimerRef={menuTimerRef}
                        buttons={buttons}
                        currentSection={currentSection}
                        handleClick={handleClick}
                    />
                    <BuildMenu
                        invitationID={invitationID}
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
                        invitation={invitation}
                        setInvitation={setInvitation}
                    />
                </div>

                <BuildContent
                    invitationID={invitationID}
                    onHide={onHide}
                    setOnHide={setOnHide}
                    setDevice={setDevice}
                    currentDevice={device}
                    coverUpdated={coverUpdated}
                    positionY={positionY}
                    setPositionY={setPositionY}
                    invitation={invitation}
                    onSectionChange={onSectionChange}
                />
            </div>

            {/* Fixed CTA */}
            <div className='pm-cta-fixed'>
                <Button
                    block
                    className='primarybutton--active'
                    size='large'
                    icon={<ArrowRight size={16} />}
                    style={{ borderRadius: 16, height: 52, fontSize: 16, fontWeight: 700 }}
                    onClick={onPublish}
                >
                    Quiero mi invitación
                </Button>
            </div>

            {/* Footer strip */}
            <div className='pm-mobile-footer-strip'>
                <Button icon={<ArrowUp size={14} />} type='text' className='pm-footer-strip-label' onClick={() => setShowUpsell(true)}>
                    Descubre todo lo que hay en i attend
                </Button>
            </div>

            {/* Upsell Drawer */}
            <Drawer
                placement='bottom'
                open={showUpsell}
                onClose={() => setShowUpsell(false)}
                height='88%'
                closable={false}
                style={{ borderRadius: '24px 24px 0 0' }}
                styles={{ body: { padding: '0 0 env(safe-area-inset-bottom, 16px)' } }}
            >
                <div className='pm-sheet-handle-row'>
                    <div className='pm-sheet-handle' />
                    <button className='pm-sheet-close' onClick={() => setShowUpsell(false)}>
                        <X size={14} />
                    </button>
                </div>

                <div className='pm-upsell-sheet'>
                    <span className='pm-upsell-sheet-title'>Tu invitación es solo el principio</span>
                    <span className='pm-upsell-label'>Esto también es I attend</span>

                    <div className='pm-feature-carousel' style={{ height: 280, flexShrink: 0 }}>
                        {FEATURE_SLIDES.map((slide, i) => (
                            <div key={slide.id} className={`pm-feature-slide${i === activeFeature ? ' pm-feature-slide--active' : ''}`}>
                                <img src={slide.img} alt='' className='pm-feature-slide-bg' />
                                <div className='pm-feature-slide-overlay' />
                                <div className='pm-feature-content'>
                                    <span className='pm-feature-product'>{slide.product}</span>
                                    <p className='pm-feature-headline'>{slide.headline}</p>
                                    <p className='pm-feature-desc'>{slide.desc}</p>
                                </div>
                            </div>
                        ))}

                        <button className='pm-feature-nav-btn pm-feature-pause-btn' onClick={() => setFeaturePaused(p => !p)}>
                            {featurePaused ? <Play size={14} /> : <Pause size={14} />}
                        </button>

                        <div className='pm-feature-nav'>
                            <button className='pm-feature-nav-btn' onClick={() => goToFeature(i => (i - 1 + FEATURE_SLIDES.length) % FEATURE_SLIDES.length)}>
                                <ChevronLeft size={16} />
                            </button>
                            <button className='pm-feature-nav-btn' onClick={() => goToFeature(i => (i + 1) % FEATURE_SLIDES.length)}>
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        <div className='pm-feature-dots'>
                            {FEATURE_SLIDES.map((_, i) => (
                                <button
                                    key={i}
                                    className={`pm-feature-dot${i === activeFeature ? ' pm-feature-dot--active' : ''}`}
                                    onClick={() => goToFeature(() => i)}
                                />
                            ))}
                        </div>
                    </div>

                    <Button
                        className='primarybutton--active' block size='large'
                        icon={<ArrowRight size={16} />}
                        style={{ borderRadius: 16, height: 52, fontSize: 16, fontWeight: 700, marginTop: 8 }}
                        onClick={onPublish}
                    >
                        Quiero mi invitación
                    </Button>
                </div>
            </Drawer>

        </div>
    )
}
