import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { FEATURE_SLIDES } from './featureSlides'

export const PreviewMoodPanel = ({ invitation, setInvitation, savedId, onRequestSaveForImage }) => {
    void invitation; void setInvitation; void savedId; void onRequestSaveForImage

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
        <div className='pm-panel pm-panel--carousel-only'>
            <div className='pm-upsell pm-upsell--full'>
                <div className='pm-feature-carousel'>
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

                    <button
                        className='pm-feature-nav-btn pm-feature-pause-btn'
                        onClick={() => setFeaturePaused(p => !p)}
                        title={featurePaused ? 'Continuar' : 'Pausar'}
                    >
                        {featurePaused ? <Play size={14} /> : <Pause size={14} />}
                    </button>

                    <div className='pm-feature-nav'>
                        <button
                            className='pm-feature-nav-btn'
                            onClick={() => goToFeature(i => (i - 1 + FEATURE_SLIDES.length) % FEATURE_SLIDES.length)}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            className='pm-feature-nav-btn'
                            onClick={() => goToFeature(i => (i + 1) % FEATURE_SLIDES.length)}
                        >
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
            </div>
        </div>
    )
}
