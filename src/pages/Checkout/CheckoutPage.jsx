import { useEffect, useRef, useState } from 'react'
import { Button, Grid, message } from 'antd'

const { useBreakpoint } = Grid
import { Check, Shield, Sparkles } from 'lucide-react'
import axios from 'axios'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { AuthModal } from '../PreviewMood/AuthModal'
import { OnboardingWizard } from '../PreviewMood/OnboardingWizard'
import { useOnboardingDemoData } from '../PreviewMood/useOnboardingDemoData'
import { PLAN_FEATURE_GROUPS, planFeatures, planTerms, usePlans } from '../../hooks/usePlans'
import { PlanPricing } from '../../components/Payment/PlanPricing/PlanPricing'
import { FooterApp } from '../../modules/Footer/FooterApp'
import styles from './CheckoutPage.module.css'

const API = import.meta.env.VITE_API_URL
const PREVIEW_ID = '3cb0ab8b-41cb-428d-b383-ff9d5bbae17d'
const LS_KEY = 'invitation-preview'

const VIDEOS = [
    "https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing/hf_20260526_202936_917dc5b6-9089-4b7f-82b0-2e76d8126e5d.mp4",
    "https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing/hf_20260526_202936_917dc5b6-9089-4b7f-82b0-2e76d8126e5d.mp4"
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
    const screens = useBreakpoint()
    const isMobile = !screens.md

    const [searchParams] = useSearchParams()
    const planParam = searchParams.get('plan')
    const [elegido, setSelected] = useState(planParam || 'pro')

    // Qué planes se ofrecen, su nombre, precio y checklist: del catálogo
    // (Admin → Planes, interruptor "Checkout").
    const { plansFor } = usePlans()
    const checkoutPlans = plansFor('checkout')
    // Si el plan pedido no se vende aquí (o el catálogo aún no carga), cae en
    // Pro o en el primero disponible.
    const selectedPlan = checkoutPlans.find(p => p.id === elegido)
        ?? checkoutPlans.find(p => p.id === 'pro')
        ?? checkoutPlans[0]
        ?? null
    const selected = selectedPlan?.id ?? elegido
    // Solo el nombre del catálogo ("Pro", "Lite"), sin el prefijo "Plan".
    const planLabel = (plan) => plan?.name ?? ''
    // Plazo elegido: 0 = contado, si no, meses sin intereses. Si el plan nuevo
    // no tiene ese plazo (Lite no tiene 12) cae en contado.
    const [meses, setMeses] = useState(0)
    const terms = planTerms(selectedPlan)
    const term = terms.find(t => t.months === meses) ?? terms[0] ?? null
    const [loading, setLoading] = useState(false)
    const [authOpen, setAuthOpen] = useState(false)
    const [onboardingOpen, setOnboardingOpen] = useState(() => searchParams.get('openWizard') === 'true')
    const { invitation: demoInvitation, buttons: demoButtons, invitationID: demoInvitationID } = useOnboardingDemoData()
    const [messageApi, contextHolder] = message.useMessage()

    const [activeIdx, setActiveIdx] = useState(0)
    const videoRefs = useRef([])

    useEffect(() => {
        const el = videoRefs.current[activeIdx]
        if (!el) return
        el.currentTime = 0
        const tryPlay = () => el.play().catch(() => { })
        if (el.readyState >= 3) tryPlay()
        else el.addEventListener('canplay', tryPlay, { once: true })
    }, [activeIdx])

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveIdx(prev => (prev + 1) % VIDEOS.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [])


    const executePurchase = async () => {
        const session = getSession()
        if (!session?.user?.uid) { setAuthOpen(true); return }

        // Contado manda el price del plan; MSI manda el lookup_key del plazo y
        // el backend resuelve el price y prende las cuotas.
        const priceId = selectedPlan?.stripe_price_id
        const lookupKey = term?.lookup_key ?? undefined
        if (!priceId) { messageApi.error('No se pudo obtener el precio del plan'); return }

        setLoading(true)
        try {
            const previewData = await getPreviewData()
            const { data: checkout } = await axios.post(`${API}/api/payment/create-checkout-preview`, {
                userId: session.user.uid,
                userEmail: session.user.email,
                priceId,
                lookupKey,
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

    const planTabs = (
        <div className={styles.planTabs}>
            {checkoutPlans.map(plan => {
                const isSelected = selected === plan.id
                return (
                    <button
                        key={plan.id}
                        type='button'
                        onClick={() => setSelected(plan.id)}
                        className={`${styles.planTab} ${isSelected ? styles.planTabSelected : ''}`}
                    >
                        {planLabel(plan)}
                    </button>
                )
            })}
        </div>
    )

    return (
        <div className={styles.page}>
                {contextHolder}

                {/* ── Video background ── */}
                <div className={styles.videoBg}>
                    {VIDEOS.map((src, i) => (
                        <video
                            key={src}
                            ref={el => { videoRefs.current[i] = el }}
                            src={src}
                            muted
                            playsInline
                            autoPlay
                            preload="auto"
                            className={`login-video${i === activeIdx ? ' login-video--active' : ''}`}
                        />
                    ))}
                    <div className='login-video-overlay' />
                </div>

                {/* Móvil: una sola tarjeta que hace scroll (hero arriba, plan
                    abajo). Web: hero a la izquierda sobre el video y el plan
                    en un panel a la derecha. */}
                <div className={`${styles.layout} ${styles.scrollArea}`}>

                    <section className={styles.hero}>
                        {!isMobile && <img alt='I attend' src='/images/logo_cover.png' className={styles.logo} />}

                        <div className={styles.heroCopy}>
                            <h1 className={styles.titleMain}>TU EVENTO,</h1>
                            <h1 className={styles.titleSub}>BAJO CONTROL</h1>
                            <h2 className={styles.titleScript}>En menos de una tarde</h2>

                            <div className={styles.discover}>
                                <button
                                    type='button'
                                    onClick={() => setOnboardingOpen(true)}
                                    className={styles.discoverButton}
                                >
                                    <Sparkles size={14} />
                                    Conoce I attend
                                </button>
                            </div>
                        </div>

                        {!isMobile && (
                            <div className={styles.heroFooter}>
                                <Shield size={13} />
                                <span>Pago seguro con Stripe · Pago único, activa para siempre</span>
                            </div>
                        )}
                    </section>

                    <aside className={`${styles.panel} ${styles.scrollArea}`}>
                        <div className={styles.panelBody}>
                            {!isMobile && (
                                <>
                                    <span className={styles.eyebrow}>Tu plan</span>
                                    <h2 className={styles.panelTitle}>PLAN {planLabel(selectedPlan).toUpperCase()}</h2>
                                    <SectionLabel>Elige tu plan</SectionLabel>
                                </>
                            )}

                            {planTabs}

                            {/* Checklist del catálogo (Admin → Planes): cada feature trae su
                                grupo, y las que dependen de un número en 0 no salen. */}
                            {PLAN_FEATURE_GROUPS.map(group => {
                                const items = planFeatures(selectedPlan, { group: group.key })
                                if (!items.length) return null
                                return (
                                    <div key={group.key}>
                                        <SectionLabel>{group.label}</SectionLabel>
                                        <div className={styles.checklist}>
                                            {items.map((item, i) => <CheckItem key={i} label={item.text} />)}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className={styles.panelPricing}>
                            <PlanPricing
                                plan={selectedPlan}
                                terms={terms}
                                term={term}
                                onTermChange={setMeses}
                                onBuy={executePurchase}
                                loading={loading}
                                disabled={checkoutPlans.length === 0}
                                standalone={isMobile}
                            />
                        </div>
                    </aside>

                </div>

                <AuthModal
                    open={authOpen}
                    onClose={() => setAuthOpen(false)}
                    onSuccess={() => { setAuthOpen(false); setOnboardingOpen(true) }}
                    context='publish'
                />

                {/* prewarm: en el checkout el wizard es la vitrina principal, así
                    que la invitación demo empieza a cargar desde que se abre la
                    página y no hasta que se da clic en "Conoce I attend". */}
                <OnboardingWizard
                    prewarm
                    open={onboardingOpen && !!demoInvitation}
                    onClose={() => setOnboardingOpen(false)}
                    invitation={demoInvitation}
                    buttons={demoButtons}
                    invitationID={demoInvitationID}
                />

            </div>
    )
}
