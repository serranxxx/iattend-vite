import { useEffect } from 'react'
import { Modal } from 'antd'
import confetti from 'canvas-confetti'
import { Check, Clock, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './PlanActivationModal.css'

const PLAN_LABEL_KEY = {
    paperless: 'plans_modal.plan_paperless',
    lite: 'plans_modal.plan_lite',
    pro: 'plans_modal.plan_pro',
}

/**
 * Se muestra al volver de Stripe con `?success=true`.
 *
 * `status` refleja el sondeo que hace el dashboard mientras espera al webhook:
 * 'pending' (el pago pasó pero `invitations.plan` todavía no cambia), 'done'
 * (ya cambió) o 'timeout' (tardó más de lo razonable). No se declara éxito
 * antes de tiempo: hasta que el plan no cambie de verdad, sigue en 'pending'.
 */
export const PlanActivationModal = ({ status, plan, onClose, onRetry }) => {
    const { t } = useTranslation()

    useEffect(() => {
        if (status !== 'done') return
        confetti({
            particleCount: 140,
            spread: 80,
            origin: { y: 0.55 },
            colors: ['#D1BEDD', '#aac187', '#eeeadf', '#1c3249', '#b9bba6'],
        })
    }, [status])

    if (!status) return null

    const planLabel = PLAN_LABEL_KEY[plan] ? t(PLAN_LABEL_KEY[plan]) : plan

    return (
        <Modal
            open
            onCancel={status === 'pending' ? undefined : onClose}
            footer={null}
            width='min(460px, 92vw)'
            centered
            closable={false}
            // Mientras se activa no se puede cerrar: cerrar no cancelaría nada
            // y dejaría el bento mostrando el plan viejo sin explicación.
            maskClosable={status !== 'pending'}
            keyboard={status !== 'pending'}
            styles={{
                body: { padding: 0 },
                container: { padding: 0, background: 'transparent', boxShadow: 'none', borderRadius: 28 },
            }}
        >
            <div className='plan-activation'>
                {status === 'pending' &&
                    <>
                        <div className='plan-activation-icon plan-activation-icon--wait'>
                            <Clock size={22} strokeWidth={2.2} />
                        </div>
                        <h3 className='plan-activation-title'>{t('plan_activation.activating_title')}</h3>
                        <p className='plan-activation-text'>{t('plan_activation.activating_text')}</p>
                        <div className='plan-activation-bar'><span /></div>
                    </>
                }

                {status === 'done' &&
                    <>
                        <div className='plan-activation-icon plan-activation-icon--ok'>
                            <Check size={24} strokeWidth={3} />
                        </div>
                        <span className='plan-activation-eyebrow'>{t('plan_activation.done_eyebrow')}</span>
                        <h3 className='plan-activation-title'>
                            {t('plan_activation.done_title', { plan: planLabel })}
                        </h3>
                        <p className='plan-activation-text'>{t('plan_activation.done_text')}</p>
                        <button type='button' className='plan-activation-cta' onClick={onClose}>
                            {t('plan_activation.done_cta')}
                        </button>
                    </>
                }

                {status === 'timeout' &&
                    <>
                        <div className='plan-activation-icon plan-activation-icon--wait'>
                            <Clock size={22} strokeWidth={2.2} />
                        </div>
                        <h3 className='plan-activation-title'>{t('plan_activation.timeout_title')}</h3>
                        <p className='plan-activation-text'>{t('plan_activation.timeout_text')}</p>
                        <div className='plan-activation-actions'>
                            <button type='button' className='plan-activation-cta' onClick={onRetry}>
                                <RefreshCw size={15} strokeWidth={2.4} />
                                {t('plan_activation.timeout_cta')}
                            </button>
                            <button type='button' className='plan-activation-ghost' onClick={onClose}>
                                {t('plan_activation.close')}
                            </button>
                        </div>
                    </>
                }
            </div>
        </Modal>
    )
}
