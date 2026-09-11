import { useEffect, useState } from 'react'
import { Modal } from 'antd'
import { Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchPrices, handleCheckout, markPendingPlan, plan_lite, plan_pro, PRICE_IDS } from '../functions'
import { AdvisorButton } from '../AdvisorButton/AdvisorButton'
import './PlansModal.css'

// Paperless queda fuera a propósito: la página /checkout tampoco lo ofrece en
// su selector, y desde una invitación free el salto natural es Lite o Pro.
const PLANS = [
    { id: 'lite', priceId: PRICE_IDS.PLAN_LITE, features: plan_lite },
    { id: 'pro', priceId: PRICE_IDS.PLAN_PRO, features: plan_pro, featured: true },
]

/**
 * Selector de plan para una invitación que todavía está en free. Cobra sobre
 * la invitación existente (`/api/payment/create-checkout` → `activatePlan`),
 * no crea una nueva como hace el flujo de /checkout.
 */
export const PlansModal = ({ open, onClose, invitationId }) => {
    const { t, i18n } = useTranslation()
    const [prices, setPrices] = useState([])
    const [failed, setFailed] = useState(false)
    const [buying, setBuying] = useState(null)

    // Los precios viven en Stripe: se piden al abrir, no en cada render del
    // dashboard.
    useEffect(() => {
        if (!open || prices.length > 0) return
        setFailed(false)
        fetchPrices(setPrices).catch((error) => {
            console.error('Error obteniendo precios:', error)
            setFailed(true)
        })
    }, [open, prices.length])

    const lang = i18n.language?.startsWith('en') ? 'en-US' : 'es-MX'
    const amountOf = (priceId) => prices.find((p) => p.priceId === priceId)?.amount
    const fmt = (amount) => new Intl.NumberFormat(lang, {
        style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
    }).format(amount)

    const onChoose = (plan) => {
        setBuying(plan.id)
        markPendingPlan(invitationId, plan.id)
        handleCheckout(invitationId, plan.priceId)
    }

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width='min(880px, 92vw)'
            centered
            closable={false}
            // antd v6 renombró `.ant-modal-content` a `.ant-modal-container`.
            styles={{
                body: { padding: 0 },
                container: { padding: 0, background: 'transparent', boxShadow: 'none', borderRadius: 28 },
            }}
        >
            <div className='plans-modal'>
                <div className='plans-modal-header'>
                    <div>
                        <span className='plans-modal-eyebrow'>{t('plans_modal.eyebrow')}</span>
                        <h3 className='plans-modal-title'>{t('plans_modal.title')}</h3>
                        <p className='plans-modal-subtitle'>{t('plans_modal.subtitle')}</p>
                    </div>
                    <button
                        type='button'
                        className='plans-modal-close'
                        onClick={onClose}
                        aria-label={t('plans_modal.close')}
                    >
                        <X size={18} strokeWidth={2.4} />
                    </button>
                </div>

                <div className='plans-modal-grid'>
                    {PLANS.map((plan) => {
                        const amount = amountOf(plan.priceId)
                        return (
                            <div
                                key={plan.id}
                                className={`plan-card${plan.featured ? ' plan-card--featured' : ''}`}
                            >
                                {plan.featured &&
                                    <span className='plan-card-tag'>{t('plans_modal.recommended')}</span>
                                }
                                <span className='plan-card-name'>{t(`plans_modal.plan_${plan.id}`)}</span>

                                <div className='plan-card-price'>
                                    {amount != null
                                        ? <strong>{fmt(amount)}</strong>
                                        : <strong className='plan-card-price--pending'>
                                            {failed ? '—' : t('plans_modal.loading_price')}
                                        </strong>
                                    }
                                    {amount != null && <span>{t('plans_modal.one_time')}</span>}
                                </div>

                                <ul className='plan-card-features'>
                                    {plan.features.map((feature) => (
                                        <li key={feature.key}>
                                            <Check size={13} strokeWidth={3} />
                                            <span>{t(feature.key)}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    type='button'
                                    className='plan-card-cta'
                                    disabled={amount == null || buying !== null}
                                    onClick={() => onChoose(plan)}
                                >
                                    {t('plans_modal.choose')}
                                </button>
                            </div>
                        )
                    })}
                </div>

                {failed && <p className='plans-modal-error'>{t('plans_modal.price_error')}</p>}

                <div className='plans-modal-advisor'>
                    <AdvisorButton context='plans' />
                </div>
            </div>
        </Modal>
    )
}
