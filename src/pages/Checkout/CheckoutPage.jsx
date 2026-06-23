import { useEffect, useRef, useState } from 'react'
import { Button, message } from 'antd'
import { Check, Shield, ShoppingCart } from 'lucide-react'
import axios from 'axios'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { AuthModal } from '../PreviewMood/AuthModal'
import { fetchPrices, PRODUCTS } from '../../components/Payment/functions'

const API = import.meta.env.VITE_API_URL
const PREVIEW_ID = '3cb0ab8b-41cb-428d-b383-ff9d5bbae17d'
const LS_KEY = 'invitation-preview'

const VIDEOS = [
    "https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing/hf_20260526_202936_917dc5b6-9089-4b7f-82b0-2e76d8126e5d.mp4",
    "https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing/bucket.mp4",
]

const TEXT = '#EFEADF'
const TEXT_DIM = 'rgba(239,234,223,0.5)'
const TEXT_FAINT = 'rgba(239,234,223,0.25)'

const getSession = () => {
    try { return JSON.parse(localStorage.getItem('session')) } catch { return null }
}

const getPreviewData = async () => {
    const stored = localStorage.getItem(LS_KEY)
    if (stored) {
        try { return JSON.parse(stored) } catch { return null }
    }
    const { data } = await supabase
        .from('invitations')
        .select('data')
        .eq('id', PREVIEW_ID)
        .maybeSingle()
    return data?.data ?? null
}

const CheckItem = ({ label, badge, pill }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
        <div style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
            background: 'rgba(239,234,223,0.12)',
            border: `1px solid ${TEXT_FAINT}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <Check size={12} strokeWidth={3} color={TEXT} />
        </div>
        <span style={{ flex: 1, fontSize: 14, color: TEXT, fontFamily: 'Luxora Grotesk' }}>{label}</span>
        {badge && (
            <span style={{ fontSize: 12, color: TEXT_DIM, fontFamily: 'Luxora Grotesk' }}>{badge}</span>
        )}
        {pill !== undefined && (
            <span style={{
                fontSize: 12, color: TEXT,
                background: 'rgba(239,234,223,0.12)',
                border: `1px solid ${TEXT_FAINT}`,
                borderRadius: 20, padding: '1px 8px', fontWeight: 500,
                fontFamily: 'Luxora Grotesk',
            }}>
                {pill}
            </span>
        )}
    </div>
)

const SectionLabel = ({ children }) => (
    <span style={{
        display: 'block', fontSize: 11, color: TEXT_DIM,
        fontFamily: 'Luxora Grotesk', fontWeight: 500,
        marginTop: 18, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase',
    }}>
        {children}
    </span>
)

export const CheckoutPage = () => {
    const [searchParams] = useSearchParams()
    const planParam = searchParams.get('plan')
    const [selected, setSelected] = useState(planParam === 'lite' ? 'lite' : 'pro')

    const [prices, setPrices] = useState([])
    const [loading, setLoading] = useState(false)
    const [authOpen, setAuthOpen] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()

    const [activeIdx, setActiveIdx] = useState(0)
    const videoRefs = useRef([])

    // Video carousel
    useEffect(() => {
        const el = videoRefs.current[activeIdx]
        if (!el) return
        el.currentTime = 0
        const tryPlay = () => el.play().catch(() => {})
        if (el.readyState >= 3) tryPlay()
        else el.addEventListener('canplay', tryPlay, { once: true })
    }, [activeIdx])

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveIdx(prev => (prev + 1) % VIDEOS.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        fetchPrices(setPrices)
        if (!getSession()?.user?.uid) setAuthOpen(true)
    }, [])

    const planPrices = prices.filter(p => {
        if (p.priceId === 'price_1TlC4RAAdNlITNVbjcRtexSy') return;
        const product = PRODUCTS[p.priceId]
        return product?.type === 'plan' && product?.value !== 'paperless' 
    })

    const selectedEntry = planPrices.find(p => PRODUCTS[p.priceId]?.value === selected)
    const selectedPriceFormatted = selectedEntry
        ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(selectedEntry.amount)
        : '…'

    const executePurchase = async () => {
        const session = getSession()
        if (!session?.user?.uid) { setAuthOpen(true); return }

        const priceId = planPrices.find(p => PRODUCTS[p.priceId]?.value === selected)?.priceId
        if (!priceId) { messageApi.error('No se pudo obtener el precio del plan'); return }

        setLoading(true)
        try {
            const previewData = await getPreviewData()
            const { data: checkout } = await axios.post(`${API}/api/payment/create-checkout-preview`, {
                userId: session.user.uid,
                userEmail: session.user.email,
                priceId,
                previewData,
                successUrl: `${window.location.origin}/invitations?welcome=1`,
                cancelUrl: `${window.location.origin}/checkout`,
            })
            if (checkout?.url) {
                window.location.href = checkout.url
            } else {
                messageApi.error('Error al iniciar el pago')
            }
        } catch {
            messageApi.error('Error al iniciar el pago')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            height: '100vh',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            {contextHolder}

            {/* ── Video background ── */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                {VIDEOS.map((src, i) => (
                    <video
                        key={src}
                        ref={el => { videoRefs.current[i] = el }}
                        src={src}
                        muted
                        playsInline
                        className={`login-video${i === activeIdx ? ' login-video--active' : ''}`}
                    />
                ))}
                <div className='login-video-overlay' />
            </div>

            {/* ── Card ── */}
            <div style={{
                position: 'relative', zIndex: 1,
                width: '100%', maxWidth: 480,
                margin: '0 16px',
                maxHeight: 'calc(100vh - 48px)',
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px) saturate(1.3)',
                WebkitBackdropFilter: 'blur(32px) saturate(1.3)',
                border: `1px solid ${TEXT_FAINT}`,
                borderRadius: 24,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>

                {/* Scrollable content */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '32px 28px 0',
                    scrollbarWidth: 'none', msOverflowStyle: 'none',
                }}>

                    <h1 style={{
                        fontSize: 58, fontWeight: 800, color: TEXT,
                        fontFamily: 'Denver-Serial', textAlign:'center',
                        margin: '0', lineHeight: 1.1,
                    }}>
                        TU EVENTO, 
                    </h1>
                    <h1 style={{
                        fontSize: 44, fontWeight: 800, color: TEXT,
                        fontFamily: 'Denver-Serial',textAlign:'center',
                        margin: '0px 0px', lineHeight: 1.1,
                    }}>
                        BAJO CONTROL
                    </h1>
                    <h1 style={{
                        fontSize: 22, fontWeight: 500, color: TEXT,
                        fontFamily: 'Michigan Signature',textAlign:'center',
                        margin: '0 0 24px', lineHeight: 1,
                        marginTop:'16px'
                    }}>
                        En menos de una tarde
                    </h1>

                    {/* Plan tabs */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                        {planPrices.map(p => {
                            const planValue = PRODUCTS[p.priceId]?.value
                            if (!planValue) return null
                            const isSelected = selected === planValue
                            const planName = planValue === 'pro' ? 'Plan Pro' : 'Plan Lite'
                            return (
                                <button
                                    key={p.priceId}
                                    onClick={() => setSelected(planValue)}
                                    style={{
                                        flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer',
                                        fontWeight: 600, fontSize: 14,
                                        fontFamily: 'Luxora Grotesk',
                                        border: isSelected
                                            ? '2px solid rgba(210,191,221,0.8)'
                                            : `1.5px solid ${TEXT_FAINT}`,
                                        background: isSelected
                                            ? 'rgba(210,191,221,0.18)'
                                            : 'rgba(239,234,223,0.05)',
                                        color: isSelected ? TEXT : TEXT_DIM,
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {planName}
                                </button>
                            )
                        })}
                    </div>

                    {/* Checklist */}
                    <SectionLabel>Tu invitación</SectionLabel>
                    <CheckItem label='Portada de invitación'  />
                    <CheckItem label='Dresscode' />
                    <CheckItem label='Itinerario' />
                    <CheckItem label='Mesa de regalos' />
                    <CheckItem label='Galería de fotos' />

                    <SectionLabel>Gestión del evento</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' }}>
                        <CheckItem label='Lista de invitados' />
                        <CheckItem label='Acomodo de mesas' />
                        <CheckItem label={selected === 'pro' ? '3 Side events' : '1 Side event'} />
                        {selected === 'pro' && (
                            <>
                                <CheckItem label='Photo Wall' />
                                <CheckItem label='Envíos por WhatsApp' />
                                <CheckItem label='Pases en Apple Wallet' />
                                <CheckItem label='Lia · asistente IA' />
                            </>
                        )}
                    </div>

                    <div style={{ height: 24 }} />
                </div>

                {/* Sticky bottom */}
                <div style={{
                    padding: '16px 28px 28px',
                    borderTop: `1px solid ${TEXT_FAINT}`,
                    background: 'rgba(0,0,0,0.15)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 15, fontWeight: 500, color: TEXT_DIM, fontFamily: 'Luxora Grotesk' }}>
                            {selected === 'pro' ? 'Plan Pro' : 'Plan Lite'}
                        </span>
                        <span style={{ fontSize: 28, fontWeight: 800, color: TEXT, fontFamily: 'Windsor', lineHeight: 1 }}>
                            {selectedPriceFormatted}
                        </span>
                    </div>
                    <span style={{ fontSize: 12, color: TEXT_DIM, display: 'block', marginBottom: 14, fontFamily: 'Luxora Grotesk' }}>
                        Pago único · activa para siempre
                    </span>

                    <button
                        disabled={planPrices.length === 0 || loading}
                        onClick={executePurchase}
                        style={{
                            width: '100%', height: 50, borderRadius: 12,
                            background: loading || planPrices.length === 0 ? 'rgba(239,234,223,0.4)' : TEXT,
                            color: '#0c171b',
                            border: 'none', cursor: planPrices.length === 0 ? 'not-allowed' : 'pointer',
                            fontSize: 16, fontWeight: 800, fontFamily: 'Windsor',
                            letterSpacing: 0.5,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            transition: 'opacity 0.2s',
                        }}
                    >
                        <ShoppingCart size={16} />
                        {loading ? 'Procesando...' : `Comprar · ${selectedPriceFormatted}`}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10, color: TEXT_DIM }}>
                        <Shield size={13} />
                        <span style={{ fontSize: 12, fontFamily: 'Luxora Grotesk' }}>Pago seguro con Stripe</span>
                    </div>
                </div>

            </div>

            <AuthModal
                open={authOpen}
                onClose={() => setAuthOpen(false)}
                onSuccess={() => setAuthOpen(false)}
                context='publish'
            />
        </div>
    )
}
