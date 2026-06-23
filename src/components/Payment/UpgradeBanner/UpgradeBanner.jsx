import { useState } from 'react'
import { Button, Modal } from 'antd'
import { Sparkles } from 'lucide-react'
import { FEATURE_SLIDES } from '../../../pages/PreviewMood/featureSlides'
import { handleCheckout, PRICE_IDS } from '../functions'
import './UpgradeBanner.css'

const PRO_SLIDES = FEATURE_SLIDES.filter(s => s.id !== 'guests')

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

            <Modal
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                width='80%'
                centered
                closable={false}
                styles={{ body: { padding: 0 }, content: { borderRadius: 16, overflow: 'hidden', padding: 0 } }}
            >
                {/* Header */}
                <div className='upgrade-modal-header'>
                    <div>
                        <span className='upgrade-modal-eyebrow'>Plan Pro</span>
                        <h3 className='upgrade-modal-title'>Que todo fluya el día de tu evento</h3>
                    </div>
                    <Button
                        style={{ borderRadius: 99, height: 40, paddingInline: 24, fontWeight: 600, fontSize: 15, flexShrink: 0, backgroundColor: 'var(--light-purple-400)', color: 'var(--dark-blue-600)', border: 'none' }}
                        onClick={() => handleCheckout(invitationId, PRICE_IDS.UPGRADE_TO_PRO)}
                    >
                        Cámbiate a PRO ✦
                    </Button>
                </div>

                {/* Cards */}
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
            </Modal>
        </>
    )
}
