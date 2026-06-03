import { useEffect, useState } from 'react'
import './ads-carousel.css'

const SLIDES = [
    {
        id: 'pases',
        product: 'Pases Digitales',
        headline: 'Tus pases en Apple Wallet. Sin filas, sin listas.',
        desc: 'El día del evento, todo en la palma de la mano. Tus invitados entran con su iPhone, sin imprimir nada, sin buscar nombres en un Excel a las 7pm.',
        img: 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing/situation.jpg',
        accent: '#eeeadf',
    },
    {
        id: 'sideevents',
        product: 'Side Events',
        headline: 'Porque tu boda no es un solo momento.',
        desc: 'La cena de bienvenida, el brunch del día siguiente, el civil — cada evento con sus propios invitados, confirmaciones y pases. Todo conectado.',
        img: 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing/share.jpg',
        accent: '#eeeadf',
    },
    {
        id: 'lia',
        product: 'LIA — AI Assistant',
        headline: 'Conoce a tus invitados. Entiende tu boda.',
        desc: 'LIA tiene el contexto completo de tu evento. Pregúntale lo que quieras — dress code, horarios, confirmaciones, logística — siempre disponible dentro de tu invitación.',
        img: 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing/wedding%20flowers.jpg',
        accent: '#eeeadf',
    },
    {
        id: 'regalo',
        product: '🎁 Regala I attend',
        headline: 'Regala la invitación perfecta.',
        desc: 'Alguien que conoces está planeando su boda. Dales I attend y que ellos diseñen cada detalle.',
        img: 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing/dinner.jpg',
        accent: '#eeeadf',
        cta: { label: 'Regalar ahora', href: '/gift' },
    },
]

export const AdsCarousel = () => {
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
                            <a href={slide.cta.href} className="ads-cta">
                                {slide.cta.label}
                            </a>
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
