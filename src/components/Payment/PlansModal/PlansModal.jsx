import { useState } from 'react'
import { Modal } from 'antd'
import { Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { handleCheckout, markPendingPlan } from '../functions'
import { usePlans } from '../../../hooks/usePlans'
import { AdvisorButton } from '../AdvisorButton/AdvisorButton'
import './PlansModal.css'

// Qué planes se ofrecen, su nombre, price id y monto salen del catálogo
// (Admin → Planes, interruptor "Selector en la app"). Como todo selector de
// la app, muestra solo nombre y precio.
const FEATURED = 'pro'

/**
 * Selector de plan para una invitación que todavía está en free. Cobra sobre
 * la invitación existente (`/api/payment/create-checkout` → `activatePlan`),
 * no crea una nueva como hace el flujo de /checkout.
 */
export const PlansModal = ({ open, onClose, invitationId }) => {
    const { t, i18n } = useTranslation()
    const { plansFor, failed } = usePlans()
    const [buying, setBuying] = useState(null)

    const plans = plansFor('app')

    const lang = i18n.language?.startsWith('en') ? 'en-US' : 'es-MX'
    const fmt = (amount) => new Intl.NumberFormat(lang, {
        style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
    }).format(amount)

    const onChoose = (plan) => {
        setBuying(plan.id)
        markPendingPlan(invitationId, plan.id)
        handleCheckout(invitationId, plan.stripe_price_id)
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
                    {plans.map((plan) => {
                        const amount = plan.price?.amount
                        const featured = plan.id === FEATURED
                        return (
                            <div
                                key={plan.id}
                                className={`plan-card${featured ? ' plan-card--featured' : ''}`}
                            >
                                {featured &&
                                    <span className='plan-card-tag'>{t('plans_modal.recommended')}</span>
                                }
                                <span className='plan-card-name'>{`Plan ${plan.name}`}</span>

                                <div className='plan-card-price'>
                                    {amount != null
                                        ? <strong>{fmt(amount)}</strong>
                                        : <strong className='plan-card-price--pending'>
                                            {failed ? '—' : t('plans_modal.loading_price')}
                                        </strong>
                                    }
                                    {amount != null && <span>{t('plans_modal.one_time')}</span>}
                                </div>


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
