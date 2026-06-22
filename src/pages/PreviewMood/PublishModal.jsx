import { useEffect, useState } from 'react'
import { Button, Drawer, message } from 'antd'
import { Check, Image, Shield, ShoppingCart } from 'lucide-react'
import axios from 'axios'
import { supabase } from '../../lib/supabase'
import { AuthModal } from './AuthModal'
import { fetchPrices, PRODUCTS } from '../../components/Payment/functions'

// const API = import.meta.env.VITE_API_URL
const API = "http://localhost:4000"
const PREVIEW_ID = '3cb0ab8b-41cb-428d-b383-ff9d5bbae17d'
const LS_KEY = 'invitation-preview'

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
            background: 'var(--sc-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <Check size={12} strokeWidth={3} color='var(--mid-blue-500)' />
        </div>
        <span style={{ flex: 1, fontSize: 14, color: '#1a1a1a' }}>{label}</span>
        {badge && (
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{badge}</span>
        )}
        {pill !== undefined && (
            <span style={{
                fontSize: 12, color: '#6b7280', background: '#f3f4f6',
                borderRadius: 20, padding: '1px 8px', fontWeight: 500,
            }}>
                {pill}
            </span>
        )}
    </div>
)

const SectionLabel = ({ children }) => (
    <span style={{
        display: 'block', fontSize: 12, color: '#9ca3af', fontWeight: 500,
        marginTop: 18, marginBottom: 6, letterSpacing: 0.2,
    }}>
        {children}
    </span>
)

export const PublishModal = ({ open, onClose, invitation }) => {
    const [selected, setSelected] = useState('pro')
    const [prices, setPrices] = useState([])
    const [authOpen, setAuthOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [messageApi, contextHolder] = message.useMessage()

    useEffect(() => {
        fetchPrices(setPrices)
    }, [])

    const planPrices = prices.filter(p => {
        const product = PRODUCTS[p.priceId]
        return product?.type === 'plan' && product?.value !== 'paperless'
    })

    const selectedEntry = planPrices.find(p => PRODUCTS[p.priceId]?.value === selected)
    const selectedPriceFormatted = selectedEntry
        ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(selectedEntry.amount)
        : '…'

    const coverImg = invitation?.cover?.image?.dev || invitation?.cover?.image?.prod
    const eventName = invitation?.cover?.title?.text?.value

    const executePurchase = async () => {
        const session = getSession()
        if (!session?.user?.uid) return

        const priceId = planPrices.find(p => PRODUCTS[p.priceId]?.value === selected)?.priceId
        if (!priceId) {
            messageApi.error('No se pudo obtener el precio del plan')
            return
        }

        setLoading(true)
        try {
            const previewData = await getPreviewData()

            const { data: checkout } = await axios.post(`${API}/api/payment/create-checkout-preview`, {
                userId: session.user.uid,
                userEmail: session.user.email,
                priceId,
                previewData,
                successUrl: `${window.location.origin}/invitations?welcome=1`,
                cancelUrl: `${window.location.origin}/preview-mood`,
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

    const handleBuyClick = () => {
        const session = getSession()
        if (!session?.user?.uid) {
            setAuthOpen(true)
            return
        }
        executePurchase()
    }

    const handleAuthSuccess = () => {
        setAuthOpen(false)
        executePurchase()
    }

    return (
        <>
            {contextHolder}
            <Drawer
                open={open}
                onClose={onClose}
                placement='right'
                width={window.innerWidth <= 768 ? '90%' : 420}
                closable={false}
                styles={{
                    wrapper: { borderRadius: '24px 0 0 24px', overflow: 'hidden' },
                    body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
                }}
            >
                {/* ── Scrollable content ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 0' }}>

                    {/* Event card */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: 10, background: '#f3f4f6',
                            overflow: 'hidden', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {coverImg
                                ? <img src={coverImg} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <Image size={22} color='#d1d5db' strokeWidth={1.5} />
                            }
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>
                                Estás por obtener
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 18, color: '#1a1a1a', lineHeight: 1.2 }}>
                                {eventName || 'Tu evento'}
                            </span>
                        </div>
                    </div>

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
                                        border: isSelected ? '2px solid var(--brand-color-500)' : '1.5px solid #e5e7eb',
                                        background: isSelected ? 'var(--brand-color-500-20)' : '#fff',
                                        color: isSelected ? 'var(--brand-color-900)' : '#374151',
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
                    <CheckItem label='Portada de invitación' badge='lista' />
                    <CheckItem label='Dresscode' />
                    <CheckItem label='Itinerario' />
                    <CheckItem label='Mesa de regalos' />
                    <CheckItem label='Galería de fotos' />

                    <SectionLabel>Gestión del evento</SectionLabel>
                    <CheckItem label='Lista de invitados' />
                    <CheckItem label='Acomodo de mesas' />
                    <CheckItem label='Side events' pill={selected === 'pro' ? 3 : 1} />
                    {selected === 'pro' && (
                        <>
                            <CheckItem label='Envíos por WhatsApp' />
                            <CheckItem label='Pases en Apple Wallet' />
                            <CheckItem label='Photo Wall' />
                            <CheckItem label='Lia · Your AI Assistant' />
                            <CheckItem label='Lia responde las dudas de tus invitados' />
                        </>
                    )}

                    {/* Bottom padding so content doesn't hide behind sticky footer */}
                    <div style={{ height: 24 }} />
                </div>

                {/* ── Sticky bottom ── */}
                <div style={{ padding: '16px 24px 24px', borderTop: '1px solid #f3f4f6', background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 15, fontWeight: 500, color: '#374151' }}>
                            {selected === 'pro' ? 'Plan Pro' : 'Plan Lite'}
                        </span>
                        <span style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a', lineHeight: 1 }}>
                            {selectedPriceFormatted}
                        </span>
                    </div>
                    <span style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 14 }}>
                        Pago único · activa para siempre
                    </span>

                    <Button
                        type='primary'
                        block
                        size='large'
                        icon={<ShoppingCart size={15} />}
                        loading={loading}
                        disabled={planPrices.length === 0}
                        onClick={handleBuyClick}
                        style={{ borderRadius: 12, height: 50, fontSize: 15, fontWeight: 700 }}
                    >
                        Comprar · {selectedPriceFormatted}
                    </Button>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10, color: '#9ca3af' }}>
                        <Shield size={13} />
                        <span style={{ fontSize: 12 }}>Pago seguro con Stripe</span>
                    </div>
                </div>
            </Drawer>

            <AuthModal
                open={authOpen}
                onClose={() => setAuthOpen(false)}
                onSuccess={handleAuthSuccess}
                context='publish'
            />
        </>
    )
}
