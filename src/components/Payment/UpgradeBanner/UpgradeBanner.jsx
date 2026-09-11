import { useState } from 'react'
import { Button, Modal } from 'antd'
import { Sparkles, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FEATURE_SLIDES } from '../../../pages/PreviewMood/featureSlides'
import { handleCheckout, markPendingPlan, PRICE_IDS } from '../functions'
import { AdvisorButton } from '../AdvisorButton/AdvisorButton'
import './UpgradeBanner.css'

const PRO_SLIDES = FEATURE_SLIDES.filter(s => s.id !== 'guests')

/**
 * Modal de venta del plan PRO. Vive aparte del banner porque el dashboard lo
 * abre desde dos lugares distintos (la tarjeta PRO del bento y el Photo Wall
 * bloqueado), sin renderizar el banner.
 *
 * El fondo y el acento verde son los mismos de la tarjeta PRO del bento
 * (`.bento_pro`), para que abrir el modal se lea como una continuación de la
 * tarjeta y no como otra pantalla.
 */
export const ProModal = ({ open, onClose, invitationId }) => {
    const { t } = useTranslation()

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width='min(1040px, 92vw)'
            centered
            closable={false}
            // antd v6 renombró `.ant-modal-content` a `.ant-modal-container`: la key
            // `content` se ignora. El contenedor se transparenta porque el fondo
            // real (navy + glow) lo pinta `.upgrade-modal`.
            styles={{
                body: { padding: 0 },
                container: { padding: 0, background: 'transparent', boxShadow: 'none', borderRadius: 28 },
            }}
        >
            <div className='upgrade-modal'>
                <div className='upgrade-modal-header'>
                    <div>
                        <span className='upgrade-modal-eyebrow'>
                            <Sparkles size={12} strokeWidth={2.6} />
                            {t('pro_modal.eyebrow')}
                        </span>
                        <h3 className='upgrade-modal-title'>{t('pro_modal.title')}</h3>
                    </div>
                    <button
                        type='button'
                        className='upgrade-modal-close'
                        onClick={onClose}
                        aria-label={t('pro_modal.close')}
                    >
                        <X size={18} strokeWidth={2.4} />
                    </button>
                </div>

                <div className='upgrade-modal-cards'>
                    {PRO_SLIDES.map(slide => (
                        <div key={slide.id} className='upgrade-card'>
                            <img src={slide.img} alt='' className='upgrade-card-img' />
                            <div className='upgrade-card-overlay' />
                            <div className='upgrade-card-content'>
                                <span className='upgrade-card-product'>{slide.product}</span>
                                <p className='upgrade-card-headline'>{slide.headline}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className='upgrade-modal-footer'>
                    <AdvisorButton context='pro' />
                    <button
                        type='button'
                        className='upgrade-modal-cta'
                        onClick={() => {
                            markPendingPlan(invitationId, 'pro')
                            handleCheckout(invitationId, PRICE_IDS.UPGRADE_TO_PRO)
                        }}
                    >
                        {t('pro_modal.cta')}
                        <Sparkles size={14} strokeWidth={2.6} />
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export const UpgradeBanner = ({ plan, invitationId, floating = true, hideOnMobile = false }) => {
    const [modalOpen, setModalOpen] = useState(false)

    if (plan !== 'lite') return null

    const classes = [
        floating ? 'upgrade-banner' : 'upgrade-banner--inline',
        hideOnMobile ? 'upgrade-banner--hide-mobile' : ''
    ].filter(Boolean).join(' ')

    return (
        <>
            <div className={classes}>
                <div className='upgrade-banner-left'>
                    <div className='upgrade-banner-icon'>
                        <Sparkles size={22} color='#FFF' strokeWidth={2} />
                    </div>
                    <div>
                        <span className='upgrade-banner-title'>Cámbiate a PRO</span>
                        <span className='upgrade-banner-desc'>Photo Wall, Lia, WhatsApp y más.</span>
                    </div>
                </div>
                <Button
                    style={{ borderRadius: 99, flexShrink: 0, height: 34, backgroundColor: 'var(--light-green-500)', color: '#FFF', fontWeight: 600 }}
                    onClick={() => setModalOpen(true)}
                >
                    Ver PRO
                </Button>
            </div>

            <ProModal open={modalOpen} onClose={() => setModalOpen(false)} invitationId={invitationId} />

        </>
    )
}
