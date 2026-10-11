import { useEffect, useState } from 'react'
import { SLIDES } from './adsSlides'
import './ads-carousel.css'

export const AdsCarousel = ({ onRegalar }) => {
    const [activeIdx, setActiveIdx] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveIdx(i => (i + 1) % SLIDES.length)
        }, 12000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="ads-carousel">
            {SLIDES.map((slide, i) => (
                <div
                    key={slide.id}
                    className={`ads-slide${i === activeIdx ? ' ads-slide--active' : ''}`}
                >
                    <img src={slide.img} alt='' className="ads-slide-bg" />
                    <div className="ads-slide-overlay" />
                    <div className="ads-content">
                        <span className="ads-product" style={{ color: slide.accent }}>{slide.product}</span>
                        <h2 className="ads-headline">{slide.headline}</h2>
                        <p className="ads-desc">{slide.desc}</p>
                        {slide.cta && (
                            <button
                                className="ads-cta"
                                onClick={() => slide.id === 'regalo' && onRegalar?.()}
                            >
                                {slide.cta.label}
                            </button>
                        )}
                    </div>
                </div>
            ))}

            <div className="ads-dots">
                {SLIDES.map((_, i) => (
                    <button
                        key={i}
                        className={`ads-dot${i === activeIdx ? ' ads-dot--active' : ''}`}
                        onClick={() => setActiveIdx(i)}
                    />
                ))}
            </div>
        </div>
    )
}
